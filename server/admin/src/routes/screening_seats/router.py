from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...exceptions import NotFoundError
from ...models import ScreeningSeat
from .schemas import ScreeningSeatResponse, ScreeningSeatUpdate

router = APIRouter(prefix="/screening-seats")
db_dependency = Depends(get_admin_db)


@router.get("", response_model=list[ScreeningSeatResponse])
async def list_screening_seats(
    screening_id: int | None = Query(None, description="Filter by screening ID"),
    db: AsyncSession = db_dependency,
):
    query = select(ScreeningSeat).order_by(ScreeningSeat.id.desc())
    if screening_id is not None:
        query = query.where(ScreeningSeat.screening_id == screening_id)
    screening_seats = (await db.scalars(query)).all()
    return screening_seats


@router.get("/{screening_seat_id}", response_model=ScreeningSeatResponse)
async def get_screening_seat(screening_seat_id: int, db: AsyncSession = db_dependency):
    screening_seat = await db.scalar(
        select(ScreeningSeat).where(ScreeningSeat.id == screening_seat_id)
    )
    if screening_seat is None:
        raise NotFoundError("ScreeningSeat", screening_seat_id)
    return screening_seat


@router.patch("/{screening_seat_id}", response_model=ScreeningSeatResponse)
async def update_screening_seat(
    screening_seat_id: int,
    seat_data: ScreeningSeatUpdate,
    db: AsyncSession = db_dependency,
):
    screening_seat = await db.scalar(
        select(ScreeningSeat).where(ScreeningSeat.id == screening_seat_id)
    )
    if screening_seat is None:
        raise NotFoundError("ScreeningSeat", screening_seat_id)

    for key, value in seat_data.model_dump(exclude_unset=True).items():
        setattr(screening_seat, key, value)

    await db.commit()
    await db.refresh(screening_seat)
    return screening_seat


@router.delete("/{screening_seat_id}", status_code=204)
async def delete_screening_seat(screening_seat_id: int, db: AsyncSession = db_dependency):
    screening_seat = await db.scalar(
        select(ScreeningSeat).where(ScreeningSeat.id == screening_seat_id)
    )
    if screening_seat is None:
        raise NotFoundError("ScreeningSeat", screening_seat_id)

    await db.delete(screening_seat)
    await db.commit()
    return None
