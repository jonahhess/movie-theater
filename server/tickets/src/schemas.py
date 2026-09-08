from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: str | None = None

class LoginResponse(BaseModel):
    user_id: str
    email: str
    username: str | None = None
    migrated_seat_count: int


class SessionResponse(BaseModel):
    authenticated: bool
    user_id: str | None = None
    email: EmailStr | None = None
    username: str | None = None
    owner_tag: str | None = None


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


class ScreeningSeatResponse(BaseModel):
    id: int
    seat_id: int
    row: str
    number: int
    is_available: bool
    is_accessible: bool
    x_pos: int
    y_pos: int
    angle: int
    status: str