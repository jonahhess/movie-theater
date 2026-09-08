import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...exceptions import NotFoundError
from ...models import Auditorium, Movie, Screening, ScreeningSeat, Seat, Ticket
from .schemas import ScreeningCreate, ScreeningResponse, ScreeningUpdate

router = APIRouter(prefix="/screenings")
db_dependency = Depends(get_admin_db)
TICKETS_BASE_URL = os.getenv("TICKETS_BASE_URL", "http://127.0.0.1:8000/tickets")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")


async def ensure_screening_editable(
    screening: Screening,
    db: AsyncSession,
) -> None:
    if screening.status == "on_sale":
        raise HTTPException(
            status_code=409,
            detail=(
                "This screening cannot be changed while ticket sales are open. "
                "Close the sale before editing it."
            ),
        )

    has_paid_tickets = await db.scalar(
        select(ScreeningSeat.id)
        .join(Ticket, Ticket.screening_seat_id == ScreeningSeat.id)
        .where(
            ScreeningSeat.screening_id == screening.id,
            Ticket.status.in_(["confirmed", "redeemed"]),
        )
        .limit(1)
    )
    if has_paid_tickets is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This screening cannot be changed because paid tickets exist. "
                "Cancel or refund affected tickets before making this change."
            ),
        )


async def ensure_screening_references_active(
    screening: Screening,
    db: AsyncSession,
) -> None:
    movie_status = await db.scalar(
        select(Movie.status).where(Movie.id == screening.movie_id)
    )
    if movie_status != "now_showing":
        raise HTTPException(
            status_code=409,
            detail="The screening movie must be now showing before sales can open.",
        )

    auditorium_active = await db.scalar(
        select(Auditorium.is_active).where(Auditorium.id == screening.auditorium_id)
    )
    if auditorium_active is not True:
        raise HTTPException(
            status_code=409,
            detail="The screening auditorium must be active before sales can open.",
        )

@router.get("", response_model=list[ScreeningResponse])
async def list_screenings(db: AsyncSession = db_dependency):
    screenings = (await db.scalars(select(Screening))).all()
    return screenings

@router.post("", response_model=ScreeningResponse)
async def create_screening(
    screening: ScreeningCreate, db: AsyncSession = db_dependency):
    if screening.status == "on_sale":
        raise HTTPException(
            status_code=409,
            detail="Create the screening as draft, then open sales explicitly.",
        )
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

    await ensure_screening_editable(existing_screening, db)
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

    if screening.status != "draft":
        raise HTTPException(
            status_code=409,
            detail="Only draft screenings can be opened for sale.",
        )

    await ensure_screening_references_active(screening, db)

    try:
        async with httpx.AsyncClient(base_url=TICKETS_BASE_URL) as client:
            response = await client.post(
                f"/internal/screenings/{screening_id}/sale/open",
                json={},
                headers={"x_internal_service_token": INTERNAL_SERVICE_TOKEN},
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
                headers={"x_internal_service_token": INTERNAL_SERVICE_TOKEN},
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

    await ensure_screening_editable(existing_screening, db)
    await db.delete(existing_screening)
    await db.commit()
    return None
