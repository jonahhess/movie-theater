from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MovieRating(str, Enum):
    G = "G"
    PG = "PG"
    PG_13 = "PG-13"
    R = "R"


class MovieStatus(str, Enum):
    DRAFT = "draft"
    NOW_SHOWING = "now_showing"
    ARCHIVED = "archived"
    

class MovieBaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: str | None = None
    duration_minutes: int
    rating: Literal["G", "PG", "PG-13", "R"]
    release_date: date | None = None
    status: Literal["draft", "now_showing", "archived"]


class MovieCreateSchema(MovieBaseSchema):
    pass

class MovieUpdateSchema(MovieBaseSchema):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    rating: Literal["G", "PG", "PG-13", "R"] | None = None
    release_date: date | None = None
    status: Literal["draft", "now_showing", "archived"] | None = None

class MovieResponseSchema(MovieBaseSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime