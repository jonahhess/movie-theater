from database import Base
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    select,
    text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    rating = Column(Enum("G", "PG", "PG-13", "R", 
        name="movie_rating_enum"), nullable=False, server_default="PG-13")
    release_date = Column(Date, nullable=True)
    delete_at = Column(DateTime, nullable=True, default=None)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, nullable=False, 
        server_default=text("CURRENT_TIMESTAMP"))

class Auditorium(Base):
    __tablename__ = "auditoriums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    seats = relationship("Seats", 
        back_populates="auditorium", cascade="all, delete-orphan")
    
    # Dynamic properties
    @hybrid_property
    def total_capacity(self):
        return sum(1 for seat in self.seats if seat.status != "unavailable")

    @total_capacity.inplace.expression
    @classmethod
    def _total_capacity_expression(cls):
        return (
            select(func.count(Seats.id))
            .where(Seats.auditorium_id == cls.id, Seats.status != "unavailable")
            .label("total_capacity")
        )

    # 3. Dynamic property for accessibility (True if >= 1 seat is accessible)
    @hybrid_property
    def is_accessible(self):
        return any(seat.is_accessible for seat in self.seats)

    @is_accessible.inplace.expression
    @classmethod
    def _is_accessible_expression(cls):
        return (
            select(func.coalesce(func.max(1), 0).cast(Boolean))
            .where(Seats.auditorium_id == cls.id, Seats.is_accessible)
            .label("is_accessible")
        ).as_scalar()


class Seats(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    auditorium_id = Column(Integer, 
        ForeignKey("auditoriums.id", ondelete="CASCADE"), nullable=False)
    row = Column(String(5), nullable=False)
    number = Column(Integer, nullable=False)
    is_available = Column(Boolean, nullable=False)
    is_accessible = Column(Boolean, nullable=False, server_default=text("TRUE"))

    x_pos = Column(Integer, nullable=False)
    y_pos = Column(Integer, nullable=False)
    angle = Column(Integer, nullable=False, default=0)

    # Relationships
    auditorium = relationship("Auditorium", back_populates="seats")


class Showtime(Base):
    __tablename__ = "showtimes"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, 
        ForeignKey("movies.id", ondelete="RESTRICT"), nullable=False)
    auditorium_id = Column(Integer, 
        ForeignKey("auditoriums.id", ondelete="RESTRICT"), nullable=False)
    start_time = Column(DateTime, index=True, nullable=False)
    price = Column(Numeric(10, 2), default=12.50, nullable=False)

    # Relationships
    auditorium = relationship("Auditorium")
    showtime_seats = relationship("ShowtimeSeat", 
        back_populates="showtime", cascade="all, delete-orphan")

class ShowtimeSeat(Base):
    __tablename__ = "showtime_seats"
    __table_args__ = (
        UniqueConstraint("showtime_id", "seat_id", name="unique_seat_per_show"),
    )

    id = Column(Integer, primary_key=True, index=True)
    showtime_id = Column(Integer, 
        ForeignKey("showtimes.id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, 
        ForeignKey("seats.id", ondelete="CASCADE"), nullable=False)
    is_taken = Column(Boolean, nullable=False)

    # Relationships
    showtime = relationship("Showtime", back_populates="showtime_seats")
    seat = relationship("Seats")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    showtime_seat_id = Column(Integer, 
        ForeignKey("showtime_seats.id", ondelete="RESTRICT"), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum("pending", "confirmed", "cancelled", 
        name="ticket_status_enum"), server_default="pending", nullable=False)
    created_at = Column(DateTime, nullable=False, 
        server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    showtime_seat = relationship("ShowtimeSeat")
