import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from redis.asyncio import Redis

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_DB = int(os.getenv("REDIS_DB", 0))

redis_client = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    db=REDIS_DB,
    decode_responses=True
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis_client
    await app.state.redis.ping()
    yield
    await app.state.redis.aclose()


def get_redis(request: Request) -> Redis:
    return request.app.state.redis