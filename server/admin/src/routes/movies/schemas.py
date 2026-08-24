from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MovieSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    duration_minutes: int
    rating: Literal["G", "PG", "PG-13", "R"]
    release_date: date | None = None
    status: Literal["draft", "now_showing", "archived"]
    created_at: datetime