from uuid import UUID

from fastapi import APIRouter, Depends
from server.admin.src.database import get_admin_db
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models import Auditorium
from .schemas import AuditoriumSchema, AuditoriumWithSeats

router = APIRouter(prefix="/auditoriums")

db_dependency = Depends(get_admin_db)

@router.get("", response_model=list[AuditoriumSchema])
async def list_auditoriums(db: Session = db_dependency):
    auditoriums = db.scalars(select(Auditorium)).all()
    return auditoriums



@router.post("", response_model=AuditoriumSchema)
async def create_auditorium(query: AuditoriumSchema, db: Session = db_dependency):
    auditorium = Auditorium(**query.model_dump())
    db.add(auditorium)
    db.commit()
    db.refresh(auditorium)
    return auditorium


@router.get("/{auditorium_id}")
async def get_auditorium(auditorium_id: UUID, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    return auditorium


@router.patch("/{auditorium_id}")
async def update_auditorium(
    auditorium_id: UUID, query: AuditoriumSchema, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    for key, value in query.model_dump().items():
        setattr(auditorium, key, value)
    db.commit()
    db.refresh(auditorium)
    return auditorium


@router.delete("/{auditorium_id}")
async def delete_auditorium(auditorium_id: UUID, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    db.delete(auditorium)
    db.commit()
    return {"status": "success"}

@router.get("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def get_seat_map(auditorium_id: UUID, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    return auditorium


@router.put("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def replace_seat_map(
    auditorium_id: UUID, seat_map: dict, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    auditorium.seat_map = seat_map
    db.commit()
    db.refresh(auditorium)
    return auditorium


@router.patch("/{auditorium_id}/seat-map", response_model=AuditoriumWithSeats)
async def update_seat_map(
    auditorium_id: UUID, seat_map: dict, db: Session = db_dependency):
    auditorium = db.scalar(select(Auditorium).where(Auditorium.id == auditorium_id))
    if not auditorium:
        return {"error": "Auditorium not found"}
    if not hasattr(auditorium, "seat_map") or auditorium.seat_map is None:
        auditorium.seat_map = seat_map
    else:
        auditorium.seat_map.update(seat_map)
    db.commit()
    db.refresh(auditorium)
    return auditorium
