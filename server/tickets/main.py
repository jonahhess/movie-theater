from fastapi import FastAPI

from tickets.src.router import router as tickets_router

tickets = FastAPI(title="Tickets")
tickets.include_router(tickets_router)
