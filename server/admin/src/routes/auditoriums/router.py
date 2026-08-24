from fastapi import APIRouter, Depends
from sqlalchemy import select
from ...exceptions import NotFoundError
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...models import Auditorium
from .schemas import AuditoriumSchema, AuditoriumWithSeats

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

@router.get("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def get_seat_map(auditorium_id: int, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    return auditorium


@router.put("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def replace_seat_map(
    auditorium_id: int, seat_map: dict, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    auditorium.seat_map = seat_map
    await db.commit()
    await db.refresh(auditorium)
    return auditorium


@router.patch("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def update_seat_map(
    auditorium_id: int, seat_map: dict, db: AsyncSession = db_dependency):
    auditorium = await db.scalar(
        select(Auditorium).where(Auditorium.id == auditorium_id))

    if auditorium is None:
        raise NotFoundError("Auditorium", auditorium_id)

    if not hasattr(auditorium, "seat_map") or auditorium.seat_map is None:
        auditorium.seat_map = seat_map
    else:
        auditorium.seat_map.update(seat_map)
    await db.commit()
    await db.refresh(auditorium)
    return auditorium
