from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from admin.src.auth import JWT_EXP_MINUTES, create_admin_access_token, require_admin, verify_admin_login_password
from admin.src.database import get_admin_db
from admin.src.models import Admin


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


public_router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(require_admin)])
db_dependency = Depends(get_admin_db)

# Public home page prompts for login.
@public_router.get("/")
def admin_home():
    return {
        "message": "Admin home. Please log in with your admin credentials to access protected routes.",
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


# Example protected admin endpoint
@protected_router.get("/users")
def get_admin_users(db: Session = db_dependency):
    return {"message": "Hello from admin's isolated router endpoint!", "data": []}
