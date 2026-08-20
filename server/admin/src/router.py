from fastapi import APIRouter, Depends, HTTPException, status
from server.admin.src.schemas import AdminLoginRequest, AdminLoginResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import (
    JWT_EXP_MINUTES,
    create_admin_access_token,
    require_admin,
    verify_admin_login_password,
)
from .database import get_admin_db
from .models import Admin
from .routes.auditoriums.router import router as auditoriums_router
from .routes.movies.router import router as movies_router
from .routes.screenings.router import router as screenings_router
from .routes.users.router import router as users_router

public_router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(require_admin)])
db_dependency = Depends(get_admin_db)

# Public home page prompts for login.
@public_router.get("/")
def admin_home():
    return {
        "message": (
            "Admin home. Please log in with your admin credentials "
            "to access protected routes."
        ),
        "login": {
            "method": "POST",
            "path": "/admin/",
            "body": {"email": "admin@test.com", "password": "Admin123!"},
        },
        "next": "Use returned token in Authorization: Bearer <token>",
    }


@public_router.post("/", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, db: Session = db_dependency):
    admin_user = db.scalar(
        select(Admin).where(Admin.email == payload.email, Admin.is_active.is_(True))
    )
    if (
        admin_user is None
        or not verify_admin_login_password(payload.password, admin_user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    token = create_admin_access_token(admin_user)
    return AdminLoginResponse(
        access_token=token,
        expires_in_seconds=JWT_EXP_MINUTES * 60,
    )


protected_router.include_router(users_router)
protected_router.include_router(movies_router)
protected_router.include_router(screenings_router)
protected_router.include_router(auditoriums_router)
