import io
import qrcode
import uuid

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from server.admin.src.models import Ticket
from tickets.src.database import get_admin_db  # Import admin's local database helper
from tickets.src.redis_client import *

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
        
        # 3. Set the cookie on the response so the browser remembers it for future requests
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

user_uuid_dependency: str = Depends(get_or_create_user_uuid)  # Use the dependency in your routes

# Example endpoint for tickets
@router.get("/")
async def tickets_welcome():
    return {"message": "Hello from tickets's isolated router endpoint!", "data": []}

@router.get("/screenings/{screening_id}/availability/stream")
async def stream_seat_availability(
    screening_id: int, last_event_id: str = "$", redis: aioredis.Redis = redis_dependency
) -> StreamingResponse:
    return StreamingResponse(
        stream_sse_events(str(screening_id), redis),
        last_event_id=last_event_id,
        media_type="text/event-stream",
    )


@router.get("/screenings/{screening_id}/seats")
async def view_selected_seats(screening_id: int, user_uuid: str = user_uuid_dependency, redis: aioredis.Redis = redis_dependency):
    my_held_seats = await get_user_held_seats(str(screening_id), user_uuid, redis)

    return {"held_seats": my_held_seats}


@router.post("/screenings/{screening_id}/seats/{seat_id}/hold")
async def hold_seat(
    screening_id: int,
    seat_id: int,
    redis: aioredis.Redis = redis_dependency,
    user_uuid: str = user_uuid_dependency,):

    success = await reserve_seat(str(screening_id), str(seat_id), user_uuid, redis)
    return {"success": success}


@router.post("/screenings/{screening_id}/seats/checkout")
async def checkout_seats(screening_id: int, redis: aioredis.Redis = redis_dependency, 
                         user_uuid: str = user_uuid_dependency):
    success = await extend_seat_hold(str(screening_id), user_uuid, redis)

    if success:
        new_checkout_id = str(uuid.uuid7())
        return {"status": success, "checkout_id": new_checkout_id}
    
    return {"status": success, "message": "Failed to extend seat hold. Please try again."}

@router.get("/screenings/{screening_id}/checkout/{checkout_id}")
async def get_checkout(
    screening_id: int,
    checkout_id: str,
    user_uuid: str = user_uuid_dependency,
    redis: aioredis.Redis = redis_dependency):
    # Retrieve the held seats for the user
    held_seats = await get_user_held_seats(str(screening_id), user_uuid, redis)
    return {"held_seats": held_seats}


@router.post("/screenings/{screening_id}/checkout/{checkout_id}/payment")
async def make_payment(
    screening_id: int,
    checkout_id: str,
    user_uuid: str = user_uuid_dependency,
    redis: aioredis.Redis = redis_dependency,
    db: AsyncSession = db_dependency,
    contact_info: dict = None):  # Expecting a dictionary with 'email' and 'phone' keys):

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

    return {"status": success, "message": "Payment successful and checkout finalized." if success else "Payment failed. Please try again."}


@router.delete("/screenings/{screening_id}/checkout/{checkout_id}")
async def cancel_checkout(
    screening_id: int,
    user_uuid: str = user_uuid_dependency,
    redis: aioredis.Redis = redis_dependency):

    # Cancel the checkout and release held seats
    success = await release_all_seats(str(screening_id), user_uuid, redis)
    return {"status": success, "message": "Checkout canceled and held seats released." if success else "Failed to cancel checkout. Please try again."}

@router.get("/qrcode/{receipt_number}")
def get_qr_code(receipt_number: str):
    # Create QR code image from the string
    img = qrcode.make(receipt_number)
    
    # Save image to a memory buffer
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    # Return stream as an image response
    return StreamingResponse(buf, media_type="image/png")

@router.post("/payments/webhook", responses={200: {"description": "Payment webhook received successfully"}})
async def payment_webhook():
    return {"status": "success"}