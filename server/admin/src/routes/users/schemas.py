import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserSchema(BaseModel):
    # UUIDv7 is the single, direct primary key
    id: uuid.UUID
    username: str
    email: EmailStr
    phone: str | None
    created_at: datetime
