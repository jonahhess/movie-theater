from uuid import UUID

from fastapi import APIRouter

router = APIRouter(prefix="/screenings")


@router.get("")
async def list_screenings():
    ...


@router.get("/{screening_id}")
async def get_screening(screening_id: UUID):
    ...


@router.post("")
async def create_screening():
    ...


@router.patch("/{screening_id}")
async def update_screening(screening_id: UUID):
    ...


@router.delete("/{screening_id}")
async def delete_screening(screening_id: UUID):
    ...
