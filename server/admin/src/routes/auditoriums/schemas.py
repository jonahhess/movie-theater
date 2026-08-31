from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SeatBase(BaseModel):
    row: str
    number: int
    is_available: bool = True
    is_accessible: bool = True
    x_pos: int
    y_pos: int
    angle: int = 0

class SeatCreate(SeatBase):
    pass

class SeatUpdate(BaseModel):
    row: str | None = None
    number: int | None = None
    is_available: bool | None = None
    is_accessible: bool | None = None
    x_pos: int | None = None
    y_pos: int | None = None
    angle: int | None = None

class SeatResponse(SeatBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    auditorium_id: int


class AuditoriumBaseSchema(BaseModel):
    name: str
    is_active: bool

class AuditoriumCreateSchema(AuditoriumBaseSchema):
    pass

class AuditoriumUpdateSchema(BaseModel):
    name: str | None = None
    is_active: bool | None = None

class AuditoriumResponse(AuditoriumBaseSchema):
    id: int
    created_at: datetime

    total_capacity: int
    is_accessible: bool

# TODO: Consider adding a schema for updating the seat map all at once. 

# class SeatMapItem(BaseModel):
#     id: int | None = None
#     row: str
#     number: int
#     is_available: bool = True
#     is_accessible: bool = True
#     x_pos: int | None = None
#     y_pos: int | None = None
#     angle: int = 0

# class SeatMapUpdateSchema(BaseModel):
#     seats: list[SeatMapItem]

# --- Schemas with Relationships ---

class AuditoriumWithSeats(AuditoriumResponse):
    # Matches the back_populates="seats" relationship
    seats: list[SeatResponse]


