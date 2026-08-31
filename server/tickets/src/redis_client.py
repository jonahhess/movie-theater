import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, List

from fastapi import FastAPI, HTTPException, status
import redis
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown lifecycle events."""
    try:
        await init_redis()
        print("Successfully connected to Redis.")
    except RedisError as e:
        print(f"Failed to connect to Redis on startup: {e}")
        # Optional: raise e here if you want the server to crash if Redis is down
    yield
    await close_redis()
    print("Redis connection closed.")

async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    FastAPI dependency that yields the Redis client instance.
    Handles general Redis errors safely during request processing.
    """
    try:
        yield redis_client
    except RedisError as e:
        # Catch connection or execution issues during a request
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Redis service error: {str(e)}"
        )

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
    # delex executes a conditional delete operation using Redis's CAD.
    # It safely deletes a seat reservation only if it belongs to the specified user.
    await redis_client.delex(f"screening:{screening_id}::{seat_id}", ifeq=user_uuid)

import redis.asyncio as aioredis
from redis.exceptions import RedisError

# Optimized Lua script that handles multiple specific keys at once
EXTEND_SEATS_SCRIPT = """
local extended_count = 0
local target_user = ARGV[1]
local new_ttl = ARGV[2]

for i, key in ipairs(KEYS) do
    local current = redis.call('GET', key)
    if current == target_user then
        -- EXPIRE returns 1 if the timeout was set successfully
        if redis.call('EXPIRE', key, new_ttl) == 1 then
            extended_count = extended_count + 1
        end
    end
end

return extended_count
"""

async def extend_seat_hold(
    screening_id: str, 
    user_uuid: str, 
    redis: aioredis.Redis,  # Use the injected dependency client passed here
    ttl_seconds: int = 300
) -> bool:
    """
    Atomically adds more time to ALL temporary reservations held by a specific user 
    for a given screening. Returns True if any seats were extended.
    """
    pattern = f"screening:{screening_id}::*"
    
    # 1. Expand the wildcard pattern on the Python side first
    keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return False

    try:
        # 2. Pass the list of actual keys to the script in a single network trip
        # ARGV[1] is user_uuid, ARGV[2] is ttl_seconds
        extended_count = await redis.eval(
            EXTEND_SEATS_SCRIPT, 
            len(keys), 
            *keys, 
            user_uuid, 
            str(ttl_seconds)
        )
        
        # Return True if we successfully extended at least one seat
        return extended_count > 0

    except RedisError as e:
        print(f"Failed to execute extend script: {e}")
        return False


# Optimized Lua script accepting multiple keys at once
ACQUIRE_SEATS_SCRIPT = """
local finalized_count = 0
local owned_count = 0
local target_user = ARGV[1]

for i, key in ipairs(KEYS) do
    local current = redis.call('GET', key)
    if current == target_user then
        owned_count = owned_count + 1
        local ttl = redis.call('TTL', key)
        
        if ttl > 0 then
            -- PERSIST returns 1 if timeout was removed, 0 if key has no expiry
            if redis.call('PERSIST', key) == 1 then
                finalized_count = finalized_count + 1
            end
        elseif ttl == -1 then
            finalized_count = finalized_count + 1
        end
    end
end

return {owned_count, finalized_count}
"""

async def acquire_seats(screening_id: str, user_uuid: str, redis: aioredis.Redis) -> bool:
    """
    If payment goes through, call this function to persist ownership of all tickets 
        reserved under user_uuid which have expiration.
    """
    pattern = f"screening:{screening_id}::*"
   
   #  1. Gather keys matching pattern asynchronously
    keys: List[str] = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return False

    try:
        # 2. Execute everything in a single atomic batch trip to Redis
        # Pass all keys as a list, and user_uuid as the single ARGV argument
        owned, finalized = await redis.eval(
            ACQUIRE_SEATS_SCRIPT, 
            len(keys), 
            *keys, 
            user_uuid
        )
        
        # Returns True only if the user owned keys and every owned key was successfully finalized
        return owned > 0 and finalized == owned

    except RedisError as e:
        # Log or handle engine execution exceptions
        print(f"Redis script execution failed: {e}")
        return False


# Lua script to atomically delete multiple keys if they match the user_uuid
RELEASE_ALL_SCRIPT = """
local deleted_count = 0
local target_user = ARGV

for i, key in ipairs(KEYS) do
    local current = redis.call('GET', key)
    if current == target_user then
        -- DEL returns the number of keys removed (1)
        deleted_count = deleted_count + redis.call('DEL', key)
    end
end

return deleted_count
"""

async def release_all_seats(
    screening_id: str, 
    user_uuid: str, 
    redis: aioredis.Redis
) -> int:
    """
    Removes all temporary seat reservations belonging to a specific user.
    Returns the total number of seats released.
    """
    pattern = f"screening:{screening_id}::*"
    
    # 1. Find all potential seat keys on the Python side
    keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return 0

    try:
        # 2. Run the atomic conditional delete loop inside Redis
        deleted_count = await redis.eval(
            RELEASE_ALL_SCRIPT, 
            len(keys), 
            *keys, 
            user_uuid
        )
        return int(deleted_count)
        
    except RedisError as e:
        print(f"Failed to execute release_all script: {e}")
        return 0


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

async def get_user_held_seats(
    screening_id: str, 
    user_uuid: str, 
    redis: aioredis.Redis
) -> List[str]:
    """
    Finds all keys matching the screening ID that are currently held 
    (TTL > 0) by the specific user (value == user_uuid).
    Returns a list of the matching Redis keys.
    """
    pattern = f"screening:{screening_id}::*"
    
    # 1. Scan for matching keys
    keys: List[str] = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return []

    # 2. Pipeline both TTL and GET commands to process all keys at once
    async with redis.pipeline(transaction=False) as pipe:
        for key in keys:
            pipe.ttl(key)
            pipe.get(key)
        pipeline_results = await pipe.execute()

    user_held_keys = []
    
    # pipeline_results format: [ttl_1, val_1, ttl_2, val_2, ...]
    for i, key in enumerate(keys):
        ttl = pipeline_results[i * 2]
        stored_user = pipeline_results[(i * 2) + 1]
        
        # Condition: Key has an active expiration AND belongs to the specific user
        if ttl > 0 and stored_user == user_uuid:
            user_held_keys.append(key)

    return user_held_keys

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
    redis: aioredis.Redis,
    last_id: str = "$",
    block_ms: int = 5000,
):
    """Generates new stream messages as they arrive (Async Generator)."""
    stream_key = f"stream:screening:{screening_id}"

    while True:
        # Finite blocking read so cancellation/shutdown checks can occur regularly.
        try:
            response = await redis.xread(
                {stream_key: last_id},
                count=1,
                block=block_ms,
            )
        except asyncio.CancelledError:
            break
        except RedisError:
            await asyncio.sleep(0.5)
            continue

        if response:
            # Response format: [[stream_key, [(message_id, data_dict)]]]
            _, messages = response[0]
            for msg_id, data in messages:
                last_id = msg_id  # Update tracking pointer
                yield msg_id, data


async def stream_sse_events(screening_id: str, redis: aioredis.Redis, last_event_id: str = "$"):
    """Convert Redis stream messages into SSE-formatted chunks."""
    async for msg_id, data in listen_to_stream(screening_id=screening_id, redis=redis, last_id=last_event_id):
        payload = {"id": msg_id, **data}
        yield f"id: {msg_id}\nevent: seat_update\ndata: {json.dumps(payload)}\n\n"