from fastapi import FastAPI

from admin.src.router import protected_router, public_router

admin = FastAPI(title="Admin")

admin.include_router(public_router)
admin.include_router(protected_router)
