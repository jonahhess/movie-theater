from uuid import UUID

from fastapi import APIRouter

router = APIRouter(prefix="/auditoriums")


@router.get("")
async def list_auditoriums():
    ...


@router.post("")
async def create_auditorium():
    ...


@router.get("/{auditorium_id}")
async def get_auditorium(auditorium_id: UUID):
    ...


@router.patch("/{auditorium_id}")
async def update_auditorium(auditorium_id: UUID):
    ...


@router.delete("/{auditorium_id}")
async def delete_auditorium(auditorium_id: UUID):
    ...
