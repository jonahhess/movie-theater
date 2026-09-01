import asyncio
import io
import uuid

import qrcode
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from tickets.src.database import get_admin_db
from tickets.src.models import Ticket
from tickets.src.redis_client import get_redis
from tickets.src.redis_seats import (
    acquire_seats,
    extend_seat_hold,
    get_user_held_seats,
    release_all_seats,
    reserve_seat,
    stream_sse_events,
)

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

@router.get("/screenings/{screening_id}/availability/stream", 
            response_class=StreamingResponse)
async def stream_seat_availability(
    screening_id: int, last_event_id: str = "$", redis: Redis = redis_dependency
) -> StreamingResponse:
    return StreamingResponse(
        stream_sse_events(str(screening_id), redis),
        last_event_id=last_event_id,
        media_type="text/event-stream",
    )


@router.get("/screenings/{screening_id}/seats", response_model=list[str])
async def view_selected_seats(screening_id: int, user_uuid: str = user_uuid_dependency, 
                              redis: Redis = redis_dependency):
    my_held_seats = await get_user_held_seats(str(screening_id), user_uuid, redis)

    return my_held_seats


@router.post("/screenings/{screening_id}/seats/{seat_id}/hold", response_model=bool)
async def hold_seat(
    screening_id: int,
    seat_id: int,
    redis: Redis = redis_dependency,
    user_uuid: str = user_uuid_dependency,):

    success = await reserve_seat(str(screening_id), str(seat_id), user_uuid, redis)
    return success


@router.post("/screenings/{screening_id}/seats/checkout", response_model=bool)
async def checkout_seats(screening_id: int, redis: Redis = redis_dependency, 
                         user_uuid: str = user_uuid_dependency):
    success = await extend_seat_hold(str(screening_id), user_uuid, redis)

    return success

@router.get("/screenings/{screening_id}/checkout/", response_model=list[str])
async def get_checkout(
    screening_id: int,
    user_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency):
    # Retrieve the held seats for the user
    held_seats = await get_user_held_seats(str(screening_id), user_uuid, redis)
    return held_seats


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
    success = await acquire_seats(str(screening_id), user_uuid, redis)

    # update the database with the payment info and finalize the checkout
    if success:
        held_seats = await get_user_held_seats(str(screening_id), user_uuid, redis)
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

    return success


@router.delete("/screenings/{screening_id}/checkout/", response_model=bool)
async def cancel_checkout(
    screening_id: int,
    user_uuid: str = user_uuid_dependency,
    redis: Redis = redis_dependency):

    # Cancel the checkout and release held seats
    success = await release_all_seats(str(screening_id), user_uuid, redis)
    return success

@router.get("/qrcode/{receipt_number}", response_class=StreamingResponse)
def get_qr_code(receipt_number: str):
    # Create QR code image from the string
    img = qrcode.make(receipt_number)
    
    # Save image to a memory buffer
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    # Return stream as an image response
    return StreamingResponse(buf, media_type="image/png")

@router.post("/payments/webhook", response_model=dict, 
    responses={200: {"description": "Payment webhook received successfully"}})
async def payment_webhook():
    return {"status": "success"}