from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


class ScreeningStatus(str, Enum):
    DRAFT = "draft"
    ON_SALE = "on_sale"
    PAST = "past"
    CANCELLED = "cancelled"


class ScreeningCreate(BaseModel):
    movie_id: int
    auditorium_id: int
    start_time: datetime
    price: Decimal
    status: ScreeningStatus


class ScreeningUpdate(BaseModel):
    movie_id: int | None = None
    auditorium_id: int | None = None
    start_time: datetime | None = None
    price: Decimal | None = None
    status: ScreeningStatus | None = None


class ScreeningResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    auditorium_id: int
    start_time: datetime
    price: Decimal
    status: ScreeningStatus
