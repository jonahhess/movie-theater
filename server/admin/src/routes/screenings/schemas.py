from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

class ScreeningSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    auditorium_id: int
    start_time: str
    price: float
    status: Literal["draft", "scheduled", "cancelled"]
    created_at: datetime