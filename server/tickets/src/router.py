import asyncio
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from tickets.src.database import get_admin_db
from tickets.src.models import Auditorium, Screening, Seat, Ticket, User
from tickets.src.receipts import get_qr_code
from tickets.src.redis_client import get_redis
from tickets.src.redis_seats import (
    acquire_seats,
    change_seat_owner,
    close_screening_sale,
    extend_seat_hold,
    get_user_held_seats,
    release_all_seats,
    reserve_seat,
    seat_exists,
    stream_sse_events,
    warm_screening_seats,
)
from tickets.src.schemas import LoginRequest, LoginResponse
from tickets.src.token import require_internal_service

router = APIRouter()
db_dependency = Depends(get_admin_db)
redis_dependency = Depends(get_redis)    

# assign uuid in http cookie
async def get_or_create_user_uuid(request: Request, response: Response) -> str:
    """
    Dependency that retrieves an existing user_uuid from cookies,
    or generates a new one for guests and stores it in a secure cookie.
    """
    # 1. Try to find an existing UUID in the incoming request cookies
    user_uuid = request.cookies.get("user_uuid")
    
    if not user_uuid:
        # 2. If it doesn't exist, they are a guest. Generate a fresh UUID.
        user_uuid = str(uuid.uuid7())
        
        # 3. Set the cookie on the response so the browser remembers it
        response.set_cookie(
            key="user_uuid",
            value=user_uuid,
            max_age=3600 * 24,  # Expires in 24 hours (adjust as needed for seat holds)
            httponly=True,      # Prevents client-side scripts from stealing the cookie
            samesite="lax",     # Protects against CSRF attacks
            secure=False        # Set to True in production over HTTPS
        )
        print(f"Generated new guest UUID: {user_uuid}")
    else:
        print(f"Found existing user UUID: {user_uuid}")
        
    return user_uuid

user_uuid_dependency: str = Depends(get_or_create_user_uuid)  

@router.get("/")
async def tickets_welcome():
    return {"message": "Hello from tickets's isolated router endpoint!", "data": []}


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    guest_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency,
    db: AsyncSession = db_dependency,
):
    user = await db.scalar(select(User).where(User.email == payload.email))

    if user is None or not bcrypt.checkpw(
        payload.password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    migrated_seat_count = await change_seat_owner(
        redis, guest_uuid, str(user.id)
    )

    response.set_cookie(
        key="user_uuid",
        value=str(user.id),
        max_age=3600 * 24 * 30,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    return LoginResponse(
        user_id=str(user.id),
        email=user.email,
        username=user.username,
        migrated_seat_count=migrated_seat_count,
    )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("user_uuid")
    return {"message": "Logged out successfully"}

@router.post("/release_seats", response_model=bool)
async def release_seats_endpoint(
    response: Response,
    redis: Redis = redis_dependency,
    user_uuid: str = user_uuid_dependency
    ):
        await release_all_seats(redis, "*", user_uuid)
        await logout(response)
        return True

@router.get("/screenings/{screening_id}/availability/stream", 
            response_class=StreamingResponse)
async def stream_seat_availability(
    screening_id: int, last_event_id: str = "$", redis: Redis = redis_dependency
) -> StreamingResponse:
    return StreamingResponse(
        stream_sse_events(redis, str(screening_id), last_event_id=last_event_id),
        last_event_id=last_event_id,
        media_type="text/event-stream",
    )


@router.get("/screenings/{screening_id}/seats", response_model=list[str])
async def view_selected_seats(screening_id: int, user_uuid: str = user_uuid_dependency, 
                              redis: Redis = redis_dependency):
    my_held_seats = await get_user_held_seats(redis, str(screening_id), user_uuid)

    return my_held_seats


@router.post("/screenings/{screening_id}/seats/{seat_id}/hold", response_model=bool)
async def hold_seat(
    screening_id: int,
    seat_id: str,
    redis: Redis = redis_dependency,
    user_uuid: str = user_uuid_dependency,):

    if not await seat_exists(redis, str(screening_id), seat_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seat does not exist for this screening",
        )

    success = await reserve_seat(redis, str(screening_id), seat_id, user_uuid)
    return success


@router.post("/screenings/{screening_id}/seats/checkout", response_model=bool)
async def checkout_seats(screening_id: int, redis: Redis = redis_dependency, 
                         user_uuid: str = user_uuid_dependency):
    success = await extend_seat_hold(redis, str(screening_id), user_uuid)

    return success

@router.get("/screenings/{screening_id}/checkout/", response_model=list[str])
async def get_checkout(
    screening_id: int,
    user_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency,
    db: AsyncSession = db_dependency,):
    held_seats = await get_user_held_seats(redis, str(screening_id), user_uuid)
    tickets = await db.execute(
        select(Seat).where(Seat.id.in_(held_seats))
        )
    
    return tickets.scalars().all()


@router.post("/screenings/{screening_id}/checkout/{checkout_id}/payment", 
             response_model=bool)
async def make_payment(
    screening_id: int,
    checkout_id: str,
    user_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency,
    db: AsyncSession = db_dependency,
    contact_info: dict = None):  # Expecting dictionary with 'email' and 'phone' keys):

    # For demonstration, we'll assume payment is always successful
    success = await acquire_seats(redis, str(screening_id), user_uuid)

    # update the database with the payment info and finalize the checkout
    if success:
        held_seats = await get_user_held_seats(redis, str(screening_id), user_uuid)
        tickets_to_add = []
        for seat_id in held_seats:
            ticket = Ticket(
                screening_seat_id=seat_id,
                email=contact_info.get('email'),
                phone=contact_info.get('phone'),
                receipt_number=str(uuid.uuid7()),
                status='confirmed',
                checkout_id=checkout_id
            )
            tickets_to_add.append(ticket)
        await asyncio.gather(*[db.add(ticket) for ticket in tickets_to_add])
        await db.commit()

        # TODO: Implement email sending logic here
        # Generate a magic link for the receipt
        # for ticket in tickets_to_add:
        #   ticket.magic_link = generate_magic_link(ticket.receipt_number)
        # send 1 or more emails with the order details and magic links

    return success


@router.delete("/screenings/{screening_id}/checkout/", response_model=bool)
async def cancel_checkout(
    screening_id: int,
    user_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency):

    # Cancel the checkout and release held seats
    success = await release_all_seats(redis, str(screening_id), user_uuid)
    return success

@router.get("/qrcode", response_class=StreamingResponse)
async def get_qr(token: str):
    return await get_qr_code(token)

protected_router = APIRouter(dependencies=[Depends(require_internal_service)])

@protected_router.post(
    "/internal/screenings/{screening_id}/sale/open",
)
async def open_screening_sale(
    screening_id: int,
    db: AsyncSession = db_dependency,
    redis: Redis = redis_dependency,
):
    screening = await db.get(Screening, screening_id)
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening not found",
        )
    if screening.status == "on_sale":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screening is already on sale",
        )

    auditorium_seats = await db.execute(
        select(Auditorium).where(
            Auditorium.id == screening.auditorium_id).options(
            selectinload(Auditorium.seats))
    )
    auditorium = auditorium_seats.scalar_one()
    seat_ids = [seat.id for seat in auditorium.seats]

    await warm_screening_seats(redis, str(screening_id), seat_ids)
    return {
        "status": "ok",
        "screening_id": screening_id,
        "seat_count": len(seat_ids),
    }


@protected_router.post("/internal/screenings/{screening_id}/sale/close")
async def close_screening_sale_endpoint(
    screening_id: int,
    redis: Redis = redis_dependency,
    db: AsyncSession = db_dependency
):

    screening = await db.get(Screening, screening_id)
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening not found",
        )
    
    if screening.status != "on_sale":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screening is not currently on sale",
        )
    
    deleted_count = await close_screening_sale(redis, str(screening_id))
    return {
        "status": "ok",
        "screening_id": screening_id,
        "deleted_count": deleted_count,
    }

@protected_router.post("/internal/{ticket_id}/redeem")
async def invalidate_ticket(ticket_id: str, db: AsyncSession = db_dependency):
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if ticket.status == "redeemed" or ticket.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is no longer valid for redemption",
        )
    
    ticket.status = "redeemed"
    await db.commit()
    return {"status": "ok"}

@protected_router.post("/payments/webhook", response_model=dict, 
    responses={200: {"description": "Payment webhook received successfully"}})
async def payment_webhook():
    return {"status": "success"}

@protected_router.post("/internal/cleanup", response_model=dict)
async def cleanup_internal(
    db: AsyncSession = db_dependency, redis: Redis = redis_dependency):

    # first change all on_sale to past for screenings that are past start_time
    await db.execute(
        Screening.__table__.update().where(
            (Screening.status == "on_sale") & (Screening.start_time < func.now())
        ).values(status="past")
    )

    # find all screenings that are past or cancelled
    result = await db.execute(
        select(Screening.id).where(Screening.status.in_(["past", "cancelled"]))
    )

    # next clear all the seats in redis for these screenings
    screening_ids = set(row[0] for row in result.fetchall())
    for screening_id in screening_ids:
        await close_screening_sale(redis, str(screening_id))

    return {"status": "ok"}