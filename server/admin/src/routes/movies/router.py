from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_admin_db
from ...models import Movie
from .schemas import MovieSchema

router = APIRouter(prefix="/movies")

db_dependency = Depends(get_admin_db)

@router.get("", response_model=list[MovieSchema])
async def list_movies(db: Session = db_dependency):
    movies = db.query(Movie).all()
    return movies


@router.get("/{movie_id}", response_model=MovieSchema)
async def get_movie(movie_id: UUID, db: Session = db_dependency):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    return movie


@router.post("", response_model=MovieSchema)
async def create_movie(movie: MovieSchema, db: Session = db_dependency):
    new_movie = Movie(**movie.model_dump(exclude_unset=True))
    db.add(new_movie)
    db.commit()
    db.refresh(new_movie)
    return new_movie

@router.patch("/{movie_id}", response_model=MovieSchema)
async def update_movie(movie_id: UUID, movie: MovieSchema, db: Session = db_dependency):
    existing_movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not existing_movie:
        return None
    for key, value in movie.model_dump(exclude_unset=True).items():
        setattr(existing_movie, key, value)
    db.commit()
    db.refresh(existing_movie)
    return existing_movie


@router.delete("/{movie_id}")
async def delete_movie(movie_id: UUID, db: Session = db_dependency):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        return None
    db.delete(movie)
    db.commit()
    return movie
