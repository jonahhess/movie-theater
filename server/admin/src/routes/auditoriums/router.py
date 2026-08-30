from unittest import result

from fastapi import APIRouter, Depends
from sqlalchemy import select
from ...exceptions import NotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ...database import get_admin_db
from ...models import Auditorium, Seat
from .schemas import *

router = APIRouter(prefix="/auditoriums")

db_dependency = Depends(get_admin_db)

@router.get("", response_model=list[AuditoriumResponse])
async def list_auditoriums(db: AsyncSession = db_dependency):
    auditoriums = (await db.scalars(select(Auditorium))).all()
    return auditoriums



@router.post("", response_model=AuditoriumResponse)
async def create_auditorium(
    auditorium: AuditoriumCreateSchema, db: AsyncSession = db_dependency):
    auditorium = Auditorium(**auditorium.model_dump(exclude_unset=True))
    db.add(auditorium)
    await db.commit()
    await db.refresh(auditorium)
    return auditorium


@router.get("/{auditorium_id}", response_model=AuditoriumResponse)
async def get_auditorium(
    auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    return auditorium


@router.patch("/{auditorium_id}", response_model=AuditoriumResponse)
async def update_auditorium(
    auditorium_id: int, 
    auditorium: AuditoriumUpdateSchema, 
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


@router.delete("/{auditorium_id}", status_code=204)
async def delete_auditorium(auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    await db.delete(auditorium)
    await db.commit()
    return None

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

@router.get("/{auditorium_id}/seats/{seat_id}", response_model=SeatResponse)
async def get_seat(
    auditorium_id: int, seat_id: int, db: AsyncSession = db_dependency):
        seat = await db.scalar(
        select(Seat)
        .where(Seat.id == seat_id, Seat.auditorium_id == auditorium_id))

        if seat is None:
            raise NotFoundError("Seat", seat_id)

        return seat

@router.patch("/{auditorium_id}/seats/{seat_id}", response_model=SeatResponse)
async def update_seat(
    auditorium_id: int, seat_id: int, seat_data: SeatUpdate, db: AsyncSession = db_dependency):
    seat = await db.scalar(
        select(Seat)
        .where(Seat.id == seat_id, Seat.auditorium_id == auditorium_id))

    if seat is None:
        raise NotFoundError("Seat", seat_id)

    for key, value in seat_data.model_dump(exclude_unset=True).items():
        setattr(seat, key, value)
    await db.commit()
    await db.refresh(seat)
    return seat

@router.delete("/{auditorium_id}/seats/{seat_id}", status_code=204)
async def delete_seat(
    auditorium_id: int, seat_id: int, db: AsyncSession = db_dependency):
    seat = await db.scalar(
        select(Seat)
        .where(Seat.id == seat_id, Seat.auditorium_id == auditorium_id))

    if seat is None:
        raise NotFoundError("Seat", seat_id)

    await db.delete(seat)
    await db.commit()
    return None

# TODO: Add bulk seat-map synchronization endpoint.
# The endpoint should atomically synchronize the complete seat layout.
# @router.patch("/{auditorium_id}/seats", response_model=AuditoriumWithSeats)
# async def update_seat_map(
#     auditorium_id: int, seats: SeatMapUpdateSchema, db: AsyncSession = db_dependency):

    # result = await db.execute(
    # select(Auditorium)
    # .options(selectinload(Auditorium.seats))
    # .where(Auditorium.id == auditorium_id)
    # )

    # auditorium = result.scalar_one_or_none()

    # if auditorium is None:
    #     raise NotFoundError("Auditorium", auditorium_id)

    # Create a mapping of seat IDs to their corresponding Seat objects
    # seat_map = {seat.id: seat for seat in auditorium.seats}

    # confirm that all seats with id are actually in the auditorium, return error if not
    # for seat in seats.seats:
    #     if seat.id is not None and seat.id not in seat_map:
    #         raise NotFoundError("Seat", seat.id)

    # for seat in seats.seats:
    #     existing = seat_map.get(seat.id)
    #     if existing is not None:
    #         for key, value in seat.model_dump(exclude_unset=True).items():
    #             setattr(existing, key, value)
    #     else:
    #         new_seat = Seat(auditorium_id=auditorium_id, **seat.model_dump(exclude={"id"}))
    #         db.add(new_seat)


    # existing_seat_ids = {seat.id for seat in auditorium.seats if seat.id is not None}
    # incoming_seat_ids = {seat.id for seat in seats.seats if seat.id is not None}
    # missing_seat_ids = existing_seat_ids - incoming_seat_ids

    # for seat_id in missing_seat_ids:
    #         seat_to_deactivate = seat_map[seat_id]
    #         seat_to_deactivate.is_active = False


    # await db.commit()
    # await db.refresh(auditorium)
    # return auditorium
