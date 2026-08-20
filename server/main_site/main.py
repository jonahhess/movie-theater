
from fastapi import FastAPI

from admin.main import admin
from main_site.src.error_handlers import register_exception_handlers
from main_site.src.router import router
from tickets.main import tickets

app = FastAPI(title="Main Root Application")

register_exception_handlers(app)

app.include_router(router)

# Mount the sub-apps (their internal routes use their own database.py files)
app.mount("/admin", admin)
app.mount("/tickets", tickets)
