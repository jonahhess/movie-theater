from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...models import Movie
from .schemas import MovieSchema

from ...exceptions import NotFoundError


router = APIRouter(prefix="/movies")

db_dependency = Depends(get_admin_db)

@router.get("", response_model=list[MovieSchema])
async def list_movies(db: AsyncSession = db_dependency):
    movies = (await db.scalars(select(Movie))).all()
    return movies


@router.get("/{movie_id}", response_model=MovieSchema)
async def get_movie(movie_id: int, db: AsyncSession = db_dependency):
    movie = await db.scalar(select(Movie).where(Movie.id == movie_id))

    if movie is None:
        raise NotFoundError("Movie", movie_id)

    return movie


@router.post("", response_model=MovieSchema)
async def create_movie(movie: MovieSchema, db: AsyncSession = db_dependency):
    new_movie = Movie(**movie.model_dump(exclude_unset=True))
    db.add(new_movie)
    await db.commit()
    await db.refresh(new_movie)
    return new_movie

@router.patch("/{movie_id}", response_model=MovieSchema)
async def update_movie(
    movie_id: int, movie: MovieSchema, db: AsyncSession = db_dependency):
    existing_movie = await db.scalar(select(Movie).where(Movie.id == movie_id))

    if existing_movie is None:
        raise NotFoundError("Movie", movie_id)

    for key, value in movie.model_dump(exclude_unset=True).items():
        setattr(existing_movie, key, value)
    await db.commit()
    await db.refresh(existing_movie)
    return existing_movie


@router.delete("/{movie_id}")
async def delete_movie(movie_id: int, db: AsyncSession = db_dependency):
    movie = await db.scalar(select(Movie).where(Movie.id == movie_id))

    if movie is None:
        raise NotFoundError("Movie", movie_id)

    await db.delete(movie)
    await db.commit()
    return movie
