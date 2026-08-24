from fastapi import APIRouter, Depends
from sqlalchemy import select
from ...exceptions import NotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ...database import get_admin_db
from ...models import Auditorium, Seat
from .schemas import AuditoriumSchema, AuditoriumWithSeats, SeatBase, SeatResponse

router = APIRouter(prefix="/auditoriums")

db_dependency = Depends(get_admin_db)

@router.get("", response_model=list[AuditoriumSchema])
async def list_auditoriums(db: AsyncSession = db_dependency):
    auditoriums = (await db.scalars(select(Auditorium))).all()
    return auditoriums



@router.post("", response_model=AuditoriumSchema)
async def create_auditorium(
    auditorium: AuditoriumSchema, db: AsyncSession = db_dependency):
    auditorium = Auditorium(**auditorium.model_dump(exclude_unset=True))
    db.add(auditorium)
    await db.commit()
    await db.refresh(auditorium)
    return auditorium


@router.get("/{auditorium_id}", response_model=AuditoriumSchema)
async def get_auditorium(
    auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    return auditorium


@router.patch("/{auditorium_id}", response_model=AuditoriumSchema)
async def update_auditorium(
    auditorium_id: int, 
    auditorium: AuditoriumSchema, 
    db: AsyncSession = db_dependency):
    existing_auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if existing_auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    for key, value in auditorium.model_dump(exclude_unset=True).items():
        setattr(existing_auditorium, key, value)
    await db.commit()
    await db.refresh(existing_auditorium)
    return existing_auditorium


@router.delete("/{auditorium_id}")
async def delete_auditorium(auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    await db.delete(auditorium)
    await db.commit()
    return {"status": "success"}

@router.get("/{auditorium_id}/seats", response_model=AuditoriumWithSeats)
async def get_seats(auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium)
        .options(selectinload(Auditorium.seats))
        .where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    return auditorium

@router.post(
    "/{auditorium_id}/seats",
    response_model=SeatResponse)
async def create_seat(
    auditorium_id: int,
    seat_data: SeatBase,
    db: AsyncSession = db_dependency,
):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    new_seat = Seat(auditorium_id=auditorium_id, **seat_data.model_dump())
    db.add(new_seat)
    await db.commit()
    await db.refresh(new_seat)
    return new_seat

@router.put("/{auditorium_id}/seats", response_model=AuditoriumWithSeats)
async def replace_seats(
    auditorium_id: int, seats: list[SeatBase], db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    auditorium.seats = [Seat(auditorium_id=auditorium_id, 
                             **seat.model_dump()) for seat in seats]
    await db.commit()
    await db.refresh(auditorium)
    return auditorium


@router.patch("/{auditorium_id}/seats", response_model=AuditoriumWithSeats)
async def update_seats(
    auditorium_id: int, seats: list[SeatBase], db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    if not hasattr(auditorium, "seats") or auditorium.seats is None:
        auditorium.seats = [Seat(auditorium_id=auditorium_id, 
                                 **seat.model_dump()) for seat in seats]
    else:
        for seat in seats:
            for existing_seat in auditorium.seats:
                if existing_seat.id == seat.id:
                    for key, value in seat.model_dump(exclude_unset=True).items():
                        setattr(existing_seat, key, value)
    await db.commit()
    await db.refresh(auditorium)
    return auditorium
