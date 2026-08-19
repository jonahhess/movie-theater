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


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid7,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("TRUE"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class Movie(Base):
    __tablename__ = "movies"

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
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

class Auditorium(Base):
    __tablename__ = "auditoriums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    seats: Mapped[list[Seats]] = relationship(
        "admin.src.models.Seats",
        back_populates="auditorium",
        cascade="all, delete-orphan",
    )

    # Dynamic properties
    @hybrid_property
    def total_capacity(self):
        return sum(1 for seat in self.seats if seat.is_available)

    @total_capacity.inplace.expression
    @classmethod
    def _total_capacity_expression(cls):
        return (
            select(func.count(Seats.id))
            .where(Seats.auditorium_id == cls.id, Seats.is_available)
            .label("total_capacity")
        )

    # 3. Dynamic property for accessibility (True if >= 1 seat is accessible)
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
    auditorium: Mapped[Auditorium] = relationship("admin.src.models.Auditorium", back_populates="seats")


class Screening(Base):
    __tablename__ = "screenings"

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
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    auditorium: Mapped[Auditorium] = relationship("admin.src.models.Auditorium")
    screening_seats: Mapped[list[ScreeningSeat]] = relationship(
        "admin.src.models.ScreeningSeat",
        back_populates="screening",
        cascade="all, delete-orphan",
    )

class ScreeningSeat(Base):
    __tablename__ = "screening_seats"
    __table_args__ = (
        UniqueConstraint("screening_id", "seat_id", name="unique_seat_per_screening"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    screening_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("screenings.id", ondelete="CASCADE"),
        nullable=False,
    )
    seat_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("seats.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_taken: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Relationships
    screening: Mapped[Screening] = relationship(
        "admin.src.models.Screening",
        back_populates="screening_seats",
    )
    seat: Mapped[Seats] = relationship("admin.src.models.Seats")

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

    # Relationships
    screening_seat: Mapped[ScreeningSeat] = relationship("admin.src.models.ScreeningSeat")
