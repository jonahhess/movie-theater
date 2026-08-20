from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class SeatBase(BaseModel):
    id: int
    auditorium_id: int
    seat_number: str

    model_config = ConfigDict(from_attributes=True)


class AuditoriumSchema(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# --- Schemas with Relationships ---

class SeatWithAuditorium(SeatBase):
    # Matches the viewonly="auditorium" relationship
    auditorium: Optional[AuditoriumSchema] = None 


class AuditoriumWithSeats(AuditoriumSchema):
    # Matches the back_populates="seats" relationship
    seats: List[SeatBase] = []


