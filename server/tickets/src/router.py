from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from tickets.src.database import get_admin_db  # Import admin's local database helper

router = APIRouter()
db_dependency = Depends(get_admin_db)

# Example endpoint for tickets
@router.get("/")
async def get_tickets_users(db: Session = db_dependency):
    return {"message": "Hello from tickets's isolated router endpoint!", "data": []}
