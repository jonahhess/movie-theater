from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...exceptions import NotFoundError

from ...database import get_admin_db
from ...models import Screening
from .schemas import ScreeningCreate, ScreeningUpdate, ScreeningResponse

router = APIRouter(prefix="/screenings")
db_dependency = Depends(get_admin_db)


@router.get("", response_model=list[ScreeningResponse])
async def list_screenings(db: AsyncSession = db_dependency):
    screenings = (await db.scalars(select(Screening))).all()
    return screenings

@router.post("", response_model=ScreeningResponse)
async def create_screening(
    screening: ScreeningCreate, db: AsyncSession = db_dependency):
    screening = Screening(**screening.model_dump(exclude_unset=True))
    db.add(screening)
    try:
        await db.commit()
        await db.refresh(screening)
    except:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Screening already exists",
        )
    return screening

@router.get("/{screening_id}", response_model=ScreeningResponse)
async def get_screening(screening_id: int, db: AsyncSession = db_dependency):
    screening = await db.scalar(
        select(Screening).where(Screening.id == screening_id))

    if screening is None:
        raise NotFoundError("Screening", screening_id)  

    return screening

@router.patch("/{screening_id}", response_model=ScreeningResponse)
async def update_screening(
    screening_id: int, screening: ScreeningUpdate, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(
        select(Screening).where(Screening.id == screening_id))

    if existing_screening is None:
        raise NotFoundError("Screening", screening_id)

    for key, value in screening.model_dump(exclude_unset=True).items():
        setattr(existing_screening, key, value)
    await db.commit()
    await db.refresh(existing_screening)
    return existing_screening


@router.delete("/{screening_id}", status_code=204)
async def delete_screening(screening_id: int, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(
        select(Screening).where(Screening.id == screening_id))

    if existing_screening is None:
        raise NotFoundError("Screening", screening_id)

    await db.delete(existing_screening)
    await db.commit()
    return None
