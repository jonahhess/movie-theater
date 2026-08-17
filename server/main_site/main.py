
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from admin.main import admin
from main_site.database import get_read_db
from tickets.main import tickets

app = FastAPI(title="Main Root Application")
db_dependency = Depends(get_read_db)

# An endpoint on the main app using the main database
@app.get("/")
def get_main_data(db: Session = db_dependency):
    # You can safely execute queries against the main database here
    return {"message": "Data retrieved from the Main App database"}


# Mount the sub-apps (their internal routes use their own database.py files)
app.mount("/admin", admin)
app.mount("/tickets", tickets)
