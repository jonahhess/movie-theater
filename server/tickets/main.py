from fastapi import FastAPI

from tickets.src import redis_client
from tickets.src.error_handlers import register_exception_handlers
from tickets.src.router import router as tickets_router

tickets = FastAPI(title="Tickets", lifespan=redis_client.lifespan)

register_exception_handlers(tickets)

tickets.include_router(tickets_router)
