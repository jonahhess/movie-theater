from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScreeningSeatUpdate(BaseModel):
    is_taken: bool | None = None


class ScreeningSeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    screening_id: int
    seat_id: int
    is_taken: bool
    created_at: datetime
