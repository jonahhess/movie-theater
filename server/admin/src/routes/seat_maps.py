from uuid import UUID

from fastapi import APIRouter

router = APIRouter(prefix="/auditoriums/{auditorium_id}/seat-map")


@router.get("")
async def get_seat_map(auditorium_id: UUID):
    ...


@router.put("")
async def replace_seat_map(auditorium_id: UUID):
    ...


@router.patch("")
async def update_seat_map(auditorium_id: UUID):
    ...
