from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    select,
    text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from admin.src.database import Base


class User(Base):
    __tablename__ = "users"

    # UUIDv7 is the single, direct primary key
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid7
    )
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )


# View filters based on is_deleted and is_published
class Movie(Base):
    __tablename__ = "movies_public_view"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    rating: Mapped[str] = mapped_column(
        Enum("G", "PG", "PG-13", "R", name="movie_rating_enum"),
        nullable=False,
        server_default="PG-13",
    )
    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)


# view based on is_active
class Auditorium(Base):
    __tablename__ = "auditoriums_public_view"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    seats: Mapped[list[Seats]] = relationship(
        "Seats",
        back_populates="auditorium",
        cascade="all, delete-orphan",
    )

    # Dynamic property for accessibility (True if >= 1 seat is accessible)
    @hybrid_property
    def is_accessible(self):
        return any(seat.is_accessible for seat in self.seats)

    @is_accessible.inplace.expression
    @classmethod
    def _is_accessible_expression(cls):
        return select(func.count(Seats.id) > 0).where(
            Seats.auditorium_id == cls.id,
            Seats.is_accessible,
        ).scalar_subquery()


# only used to decide if there are accessible seats in the auditorium
class Seats(Base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    auditorium_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("auditoriums.id", ondelete="CASCADE"),
        nullable=False,
    )
    row: Mapped[str] = mapped_column(String(5), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_accessible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("TRUE"),
    )

    x_pos: Mapped[int] = mapped_column(Integer, nullable=False)
    y_pos: Mapped[int] = mapped_column(Integer, nullable=False)
    angle: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    auditorium: Mapped[Auditorium] = relationship("Auditorium", back_populates="seats")


# only show viewings based on start_time and is_published
class Screening(Base):
    __tablename__ = "screenings_public_view"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    movie_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("movies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    auditorium_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("auditoriums.id", ondelete="RESTRICT"),
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=12.50,
        nullable=False,
    )

    # Relationships
    auditorium: Mapped[Auditorium] = relationship("Auditorium")
