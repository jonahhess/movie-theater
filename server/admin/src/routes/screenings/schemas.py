from datetime import datetime

from pydantic import BaseModel


class ScreeningSchema(BaseModel):
    id: int
    movie_id: int
    auditorium_id: int
    start_time: str
    price: float
    status: str
    created_at: datetime