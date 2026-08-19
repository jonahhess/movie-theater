from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from tickets.src.database import get_admin_db  # Import admin's local database helper

router = APIRouter()
db_dependency = Depends(get_admin_db)

async def seat_availability_stream(screening_id: UUID) -> AsyncIterator[str]:
    # TODO: subscribe to seat availability updates
    # and yield SSE-formatted events.
    yield ""


# Example endpoint for tickets
@router.get("/")
async def get_tickets_users(db: Session = db_dependency):
    return {"message": "Hello from tickets's isolated router endpoint!", "data": []}

@router.get("/screenings/{screening_id}/availability/stream")
async def stream_seat_availability(
    screening_id: UUID,
) -> StreamingResponse:
    return StreamingResponse(
        seat_availability_stream(screening_id),
        media_type="text/event-stream",
    )


@router.get("/screenings/{screening_id}/seats")
async def view_selected_seats(screening_id: UUID):
    ...


@router.post("/screenings/{screening_id}/seats/{seat_id}/hold")
async def hold_seat(
    screening_id: UUID,
    seat_id: UUID,
):
    ...


@router.post("/screenings/{screening_id}/seats/checkout")
async def checkout_seats(screening_id: UUID):
    ...


@router.get("/screenings/{screening_id}/checkout/{checkout_id}")
async def get_checkout(
    screening_id: UUID,
    checkout_id: UUID,
):
    ...


@router.post("/screenings/{screening_id}/checkout/{checkout_id}/payment")
async def make_payment(
    screening_id: UUID,
    checkout_id: UUID,
):
    ...


@router.delete("/screenings/{screening_id}/checkout/{checkout_id}")
async def cancel_checkout(
    screening_id: UUID,
    checkout_id: UUID,
):
    ...


@router.get("/reservations/access/{token}/pdf")
async def access_reservation_pdf(token: str):
    ...


@router.post("/payments/webhook")
async def payment_webhook():
    ...