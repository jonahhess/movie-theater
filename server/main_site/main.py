
from fastapi import Depends, FastAPI

from admin.main import admin
from main_site.src.database import get_read_db
from main_site.src.router import router
from tickets.main import tickets

app = FastAPI(title="Main Root Application")
db_dependency = Depends(get_read_db)

app.include_router(router)

# Mount the sub-apps (their internal routes use their own database.py files)
app.mount("/admin", admin)
app.mount("/tickets", tickets)
