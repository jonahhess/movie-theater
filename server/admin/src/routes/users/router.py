import uuid

from fastapi import APIRouter, Depends
from server.admin.src.models import User
from sqlalchemy.orm import Session

from ...database import get_admin_db
from .schemas import UserSchema

router = APIRouter()
db_dependency = Depends(get_admin_db)


@router.get("/users", response_model=list[UserSchema])
def get_admin_users(db: Session = db_dependency):
    users = db.query(User).all()
    return users

@router.get("/users/{user_id}", response_model=UserSchema)
def get_admin_user(user_id: uuid.UUID, db: Session = db_dependency):
    user = db.query(User).filter(User.id == user_id).first()
    return user

@router.post("/users", response_model=UserSchema)
def create_admin_user(user: UserSchema, db: Session = db_dependency):
    new_user = User(**user.model_dump(exclude_unset=True))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserSchema)
def update_admin_user(
    user_id: uuid.UUID, user: UserSchema, db: Session = db_dependency):
    existing_user = db.query(User).filter(User.id == user_id).first()
    if not existing_user:
        return None
    for key, value in user.model_dump(exclude_unset=True).items():
        setattr(existing_user, key, value)
    db.commit()
    db.refresh(existing_user)
    return existing_user

@router.delete("/users/{user_id}", response_model=UserSchema)
def delete_admin_user(user_id: uuid.UUID, db: Session = db_dependency):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    db.delete(user)
    db.commit()
    return user
