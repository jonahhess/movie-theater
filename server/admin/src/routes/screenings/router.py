import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...exceptions import NotFoundError
from ...models import Screening, ScreeningSeat, Seat
from .schemas import ScreeningCreate, ScreeningResponse, ScreeningUpdate

router = APIRouter(prefix="/screenings")
db_dependency = Depends(get_admin_db)
TICKETS_BASE_URL = os.getenv("TICKETS_BASE_URL", "http://127.0.0.1:8000/tickets")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")


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
    except Exception as err:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Screening already exists",
        ) from err
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


@router.post("/{screening_id}/sale/open", response_model=ScreeningResponse)
async def open_screening_sale(screening_id: int, db: AsyncSession = db_dependency):

    if not INTERNAL_SERVICE_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Internal service token is not configured",
        )

    screening = await db.scalar(select(Screening).where(Screening.id == screening_id))

    if screening is None:
        raise NotFoundError("Screening", screening_id)

    if screening.status == "on_sale":
        raise HTTPException(
            status_code=409,
            detail="Screening sale is already open",
        )

    screening_seats = (
        await db.scalars(
            select(ScreeningSeat).where(ScreeningSeat.screening_id == screening_id)
        )
    ).all()

    if not screening_seats:
        auditorium_seats = (
            await db.scalars(
                select(Seat).where(
                    Seat.auditorium_id == screening.auditorium_id,
                    Seat.is_available.is_(True),
                )
            )
        ).all()

        if not auditorium_seats:
            raise HTTPException(
                status_code=409,
                detail="Auditorium has no available seats to put on sale",
            )

        screening_seats = [
            ScreeningSeat(
                screening_id=screening_id,
                seat_id=seat.id,
                is_taken=False,
            )
            for seat in auditorium_seats
        ]
        db.add_all(screening_seats)
        await db.flush()

    seat_ids = [str(screening_seat.id) for screening_seat in screening_seats]

    try:
        async with httpx.AsyncClient(base_url=TICKETS_BASE_URL) as client:
            response = await client.post(
                f"/internal/screenings/{screening_id}/sale/open",
                json={"seat_ids": seat_ids},
                headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
                timeout=5.0,
            )
            response.raise_for_status()
    except httpx.HTTPError as err:
        await db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Tickets service failed to open screening sale",
        ) from err

    screening.status = "on_sale"
    await db.commit()
    await db.refresh(screening)
    return screening


@router.post("/{screening_id}/sale/close", response_model=ScreeningResponse)
async def close_screening_sale(screening_id: int, db: AsyncSession = db_dependency):

    if not INTERNAL_SERVICE_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Internal service token is not configured",
        )

    screening = await db.scalar(select(Screening).where(Screening.id == screening_id))

    if screening is None:
        raise NotFoundError("Screening", screening_id)

    if screening.status != "on_sale":
        raise HTTPException(
            status_code=409,
            detail="Screening sale is not open",
        )

    try:
        async with httpx.AsyncClient(base_url=TICKETS_BASE_URL) as client:
            response = await client.post(
                f"/internal/screenings/{screening_id}/sale/close",
                headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
                timeout=5.0,
            )
            response.raise_for_status()
    except httpx.HTTPError as err:
        await db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Tickets service failed to close screening sale",
        ) from err

    screening.status = "past"
    await db.commit()
    await db.refresh(screening)
    return screening


@router.delete("/{screening_id}", status_code=204)
async def delete_screening(screening_id: int, db: AsyncSession = db_dependency):
    existing_screening = await db.scalar(
        select(Screening).where(Screening.id == screening_id))

    if existing_screening is None:
        raise NotFoundError("Screening", screening_id)

    await db.delete(existing_screening)
    await db.commit()
    return None
