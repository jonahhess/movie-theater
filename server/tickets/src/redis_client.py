import os
from typing import Any

import redis.asyncio as aioredis

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_DB = int(os.getenv("REDIS_DB", 0))

redis_client = aioredis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    db=REDIS_DB,
    decode_responses=True
)

async def init_redis():
    await redis_client.ping()

async def close_redis():
    await redis_client.aclose()


# --- PURPOSE 1: HIGH CONTENTION SEAT RESERVATION (SET NX EX) ---

async def reserve_seat(event_id:str, seat_id: str, user_uuid: str, 
                       lock_ttl_seconds: int = 600) -> bool:
    """
    Attempts to reserve a specific seat atomically.
    Returns True if the reservation succeeded, False if already reserved.
    """
    key = f"event:{event_id}::{seat_id}"
    # nx=True makes it atomic (SET if Not Exists)
    # ex=lock_ttl_seconds ensures the reservation expires if they don't check out
    success = await redis_client.set(key, user_uuid, nx=True, ex=lock_ttl_seconds)
    return bool(success)

async def release_seat(event_id:str, seat_id: str, user_uuid: str) -> None:
    """Removes the seat reservation explicitly (e.g., if checkout fails)."""
    await redis_client.delex(f"event:{event_id}::{seat_id}", ifeq=user_uuid)


# --- PURPOSE 2: CACHE WARMING ---

async def warm_event_cache(hash_key: str, event_data: dict[str, Any], 
                           ttl_seconds: int | None = None):
    """Pre-populates basic event rules/details into a Hash structure."""
    clean_data = {k: str(v) for k, v in event_data.items()}
    async with redis_client.pipeline(transaction=True) as pipe:
        pipe.hset(hash_key, mapping=clean_data)
        if ttl_seconds:
            pipe.expire(hash_key, ttl_seconds)
        await pipe.execute()


async def clear_cache_by_prefix(event_id: str, batch_size: int = 500) -> int:
    """
    Deletes all Redis keys that start with the given prefix.
    Returns the number of deleted keys.
    """
    if not event_id:
        raise ValueError("event_id must be a non-empty string")

    pattern = f"event:{event_id}*"
    deleted_total = 0
    batch: list[str] = []

    async for key in redis_client.scan_iter(match=pattern, count=batch_size):
        batch.append(key)
        if len(batch) >= batch_size:
            deleted_total += await redis_client.delete(*batch)
            batch.clear()

    if batch:
        deleted_total += await redis_client.delete(*batch)

    return int(deleted_total)

# 2. PUSH AN UPDATE TO THE STREAM (The Event Layer)
async def publish_seat_update(event_id: str, seat_id: str, status: str):
    """Pushes a seat status change into the Redis Stream."""
    stream_key = f"stream:event:{event_id}"
    event_data = {
        "seat_id": seat_id,
        "status": status  # "locked", "available", or "purchased"
    }
    # XADD appends the message to the stream. '*' lets Redis generate a unique ID.
    await redis_client.xadd(stream_key, event_data, id="*")

# 3. READ NEW MESSAGES FROM THE STREAM (The Listening Layer)
async def listen_to_stream(event_id: str, last_id: str = "$"):
    """Generates new stream messages as they arrive (Async Generator)."""
    stream_key = f"stream:event:{event_id}"
    
    while True:
        # XREAD blocks until a new message arrives. block=0 means wait indefinitely.
        # last_id '$' means 'only give me messages that arrive AFTER I started listening'
        response = await redis_client.xread({stream_key: last_id}, count=1, block=0)
        
        if response:
            # Response format: [[stream_key, [(message_id, data_dict)]]]
            _, messages = response[0]
            for msg_id, data in messages:
                last_id = msg_id  # Update tracking pointer
                yield msg_id, data