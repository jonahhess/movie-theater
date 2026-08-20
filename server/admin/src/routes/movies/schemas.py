from datetime import datetime

from pydantic import BaseModel


class MovieSchema(BaseModel):
    id: int
    title: str
    description: str | None
    duration_minutes: int
    rating: str
    release_date: str | None
    status: str
    created_at: datetime