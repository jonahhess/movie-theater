from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def home():
    ...


@router.get("/movies")
async def browse_movies():
    ...


@router.get("/movies/{movie_id}")
async def movie_details(movie_id: int):
    ...


@router.get("/screenings")
async def browse_screenings():
    ...


@router.get("/screenings/{screening_id}")
async def screening_details(screening_id: int):
    ...


@router.get("/screenings/{screening_id}/seats")
async def view_seats(screening_id: int):
    ...