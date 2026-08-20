from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from admin.src.database import get_admin_db

router = APIRouter()
db_dependency = Depends(get_admin_db)


@router.get("/users")
def get_admin_users(db: Session = db_dependency):
    return {"message": "Hello from admin's isolated router endpoint!", "data": []}
