from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,

    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    screening_seat_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("screening_seats.id", ondelete="RESTRICT"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    checkout_id: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("confirmed", "cancelled","redeemed", name="ticket_status_enum"),
        server_default="confirmed",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )