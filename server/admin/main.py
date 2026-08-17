from fastapi import FastAPI

from admin.src.router import router as admin_router

admin = FastAPI(title="Admin")
admin.include_router(admin_router)
