from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...database import get_admin_db
from ...models import Screening
from .schemas import ScreeningSchema

router = APIRouter(prefix="/screenings")
db_dependency = Depends(get_admin_db)


@router.get("", response_model=list[ScreeningSchema])
async def list_screenings(db: AsyncSession = db_dependency):
    screenings = (await db.scalars(select(Screening))).all()
    return screenings


@router.get("/{screening_id}", response_model=ScreeningSchema)
async def get_screening(screening_id: int, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(select(Screening).where(Screening.id == screening_id))
    return existing_screening


@router.post("", response_model=ScreeningSchema)
async def create_screening(screening: ScreeningSchema, db: AsyncSession = db_dependency):
    screening = Screening(**screening.model_dump(exclude_unset=True))
    db.add(screening)
    await db.commit()
    await db.refresh(screening)
    return screening


@router.patch("/{screening_id}", response_model=ScreeningSchema)
async def update_screening(
    screening_id: int, screening: ScreeningSchema, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(select(Screening).where(Screening.id == screening_id))
    if not existing_screening:
        return None
    for key, value in screening.model_dump(exclude_unset=True).items():
        setattr(existing_screening, key, value)
    await db.commit()
    await db.refresh(existing_screening)
    return existing_screening


@router.delete("/{screening_id}")
async def delete_screening(screening_id: int, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(select(Screening).where(Screening.id == screening_id))
    if not existing_screening:
        return None
    await db.delete(existing_screening)
    await db.commit()
    return existing_screening
