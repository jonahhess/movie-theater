import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_admin_db
from ...models import User
from .schemas import UserSchema

router = APIRouter()
db_dependency = Depends(get_admin_db)


@router.get("/users", response_model=list[UserSchema])
async def get_admin_users(db: AsyncSession = db_dependency):
    users = await db.scalars(select(User)).all()
    return users

@router.get("/users/{user_id}", response_model=UserSchema)
async def get_admin_user(user_id: uuid.UUID, db: AsyncSession = db_dependency):
    user = await db.scalar(select(User).where(User.id == user_id))
    return user

@router.post("/users", response_model=UserSchema)
async def create_admin_user(user: UserSchema, db: AsyncSession = db_dependency):
    new_user = User(**user.model_dump(exclude_unset=True))
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserSchema)
async def update_admin_user(
    user_id: uuid.UUID, user: UserSchema, db: AsyncSession = db_dependency):
    existing_user = await db.scalar(select(User).where(User.id == user_id))
    if not existing_user:
        return None
    for key, value in user.model_dump(exclude_unset=True).items():
        setattr(existing_user, key, value)
    await db.commit()
    await db.refresh(existing_user)
    return existing_user

@router.delete("/users/{user_id}", response_model=UserSchema)
async def delete_admin_user(user_id: uuid.UUID, db: AsyncSession = db_dependency):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        return None
    await db.delete(user)
    await db.commit()
    return user
