from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_admin_db
from ...models import Screening
from .schemas import ScreeningSchema

router = APIRouter(prefix="/screenings")
db_dependency = Depends(get_admin_db)




@router.get("", response_model=list[ScreeningSchema])
async def list_screenings(db: Session = db_dependency):
    screenings = db.query(Screening).all()
    return screenings


@router.get("/{screening_id}", response_model=ScreeningSchema)
async def get_screening(screening_id: int, db: Session = db_dependency):
    existing_screening = db.query(Screening).filter(
        Screening.id == screening_id).first()
    return existing_screening


@router.post("", response_model=ScreeningSchema)
async def create_screening(screening: ScreeningSchema, db: Session = db_dependency):
    screening = Screening(**screening.model_dump(exclude_unset=True))
    db.add(screening)
    db.commit()
    db.refresh(screening)
    return screening


@router.patch("/{screening_id}", response_model=ScreeningSchema)
async def update_screening(
    screening_id: int, screening: ScreeningSchema, db: Session = db_dependency):
    existing_screening = db.query(Screening).filter(
        Screening.id == screening_id).first()
    if not existing_screening:
        return None
    for key, value in screening.model_dump(exclude_unset=True).items():
        setattr(existing_screening, key, value)
    db.commit()
    db.refresh(existing_screening)
    return existing_screening


@router.delete("/{screening_id}")
async def delete_screening(screening_id: int, db: Session = db_dependency):
    existing_screening = db.query(Screening).filter(
        Screening.id == screening_id).first()
    if not existing_screening:
        return None
    db.delete(existing_screening)
    db.commit()
    return existing_screening
