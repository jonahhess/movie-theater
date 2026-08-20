from uuid import UUID

from fastapi import APIRouter

router = APIRouter(prefix="/movies")


@router.get("")
async def list_movies():
    ...


@router.get("/{movie_id}")
async def get_movie(movie_id: UUID):
    ...


@router.post("")
async def create_movie():
    ...


@router.patch("/{movie_id}")
async def update_movie(movie_id: UUID):
    ...


@router.delete("/{movie_id}")
async def delete_movie(movie_id: UUID):
    ...
