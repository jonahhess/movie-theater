import asyncio
import json
import os

import redis.asyncio as aioredis
from redis.exceptions import RedisError

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

async def reserve_seat(screening_id:str, seat_id: str, user_uuid: str, 
                       lock_ttl_seconds: int = 600) -> bool:
    """
    Attempts to reserve a specific seat atomically.
    Returns True if the reservation succeeded, False if already reserved.
    """
    key = f"screening:{screening_id}::{seat_id}"
    # nx=True makes it atomic (SET if Not Exists)
    # ex=lock_ttl_seconds ensures the reservation expires if they don't check out
    success = await redis_client.set(key, user_uuid, nx=True, ex=lock_ttl_seconds)
    return bool(success)

async def release_seat(screening_id:str, seat_id: str, user_uuid: str) -> None:
    """Removes the seat reservation explicitly (e.g., if checkout fails)."""
    # delex executes a conditional delete operation using Redis's built-in Compare-and-Delete capability.
    # It safely deletes a seat reservation only if it belongs to the specified user.
    await redis_client.delex(f"screening:{screening_id}::{seat_id}", ifeq=user_uuid)


# --- PURPOSE 2: CACHE WARMING ---

async def warm_screening_cache(hash_key: str, screening_data: dict[str, Any], 
                           ttl_seconds: int | None = None):
    """Pre-populates basic screening details into a Hash structure."""
    clean_data = {k: str(v) for k, v in screening_data.items()}
    async with redis_client.pipeline(transaction=True) as pipe:
        pipe.hset(hash_key, mapping=clean_data)
        if ttl_seconds:
            pipe.expire(hash_key, ttl_seconds)
        await pipe.execute()


async def clear_cache_by_prefix(screening_id: str, batch_size: int = 500) -> int:
    """
    Deletes all Redis keys that start with the given prefix.
    Returns the number of deleted keys.
    """
    if not screening_id:
        raise ValueError("screening_id must be a non-empty string")

    pattern = f"screening:{screening_id}*"
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
async def publish_seat_update(screening_id: str, seat_id: str, status: str):
    """Pushes a seat status change into the Redis Stream."""
    stream_key = f"stream:screening:{screening_id}"
    screening_data = {
        "seat_id": seat_id,
        "status": status  # "locked", "available", or "purchased"
    }
    # Keep the stream bounded to avoid unbounded growth over time.
    await redis_client.xadd(
        stream_key,
        screening_data,
        id="*",
        maxlen=10_000,
        approximate=True,
    )

# 3. READ NEW MESSAGES FROM THE STREAM (The Listening Layer)
async def listen_to_stream(
    screening_id: str,
    last_id: str = "$",
    block_ms: int = 5000,
):
    """Generates new stream messages as they arrive (Async Generator)."""
    stream_key = f"stream:screening:{screening_id}"

    while True:
        # Finite blocking read so cancellation/shutdown checks can occur regularly.
        try:
            response = await redis_client.xread(
                {stream_key: last_id},
                count=1,
                block=block_ms,
            )
        except asyncio.CancelledError:
            raise
        except RedisError:
            await asyncio.sleep(0.5)
            continue

        if response:
            # Response format: [[stream_key, [(message_id, data_dict)]]]
            _, messages = response[0]
            for msg_id, data in messages:
                last_id = msg_id  # Update tracking pointer
                yield msg_id, data


async def stream_sse_events(screening_id: str):
    """Convert Redis stream messages into SSE-formatted chunks."""
    async for msg_id, data in listen_to_stream(screening_id=screening_id):
        payload = {"id": msg_id, **data}
        yield f"id: {msg_id}\nevent: seat_update\ndata: {json.dumps(payload)}\n\n"