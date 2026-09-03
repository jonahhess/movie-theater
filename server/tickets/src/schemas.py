from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user_id: str
    email: str
    username: str | None = None
    migrated_seat_count: int


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    screening_seat_id: int
    email: str
    phone: str | None = None
    receipt_number: str
    checkout_id: str | None = None
    purchaser_uuid: UUID | None = None
    status: str
    created_at: datetime