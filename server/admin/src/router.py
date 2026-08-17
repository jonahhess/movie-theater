from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from admin.src.database import get_admin_db  # Import admin's local database helper

router = APIRouter()
db_dependency = Depends(get_admin_db)

# Example endpoint for admin
@router.get("/")
def get_admin_users(db: Session = db_dependency):
    return {"message": "Hello from admin's isolated router endpoint!", "data": []}
