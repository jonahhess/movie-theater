import json
from asyncio import CancelledError, sleep
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

# --- PURPOSE 1: HIGH CONTENTION SEAT RESERVATION (SET NX EX) ---

def _seat_map_key(screening_id: str) -> str:
    return f"screening:{screening_id}:seat_map"


def _seat_id_from_key(key: str) -> str:
    return key.rsplit("::", maxsplit=1)[-1]


def _parse_seat_key(key: str) -> tuple[str, str] | None:
    prefix = "screening:"
    separator = "::"

    if not key.startswith(prefix) or separator not in key:
        return None

    screening_id, seat_id = key[len(prefix):].split(separator, maxsplit=1)
    if not screening_id or not seat_id:
        return None

    return screening_id, seat_id


async def warm_screening_seats(
    redis: Redis,
    screening_id: str,
    seat_ids: list[str],
) -> None:
    """Load the known auditorium seats for a screening into Redis."""
    if not seat_ids:
        raise ValueError("seat_ids must contain at least one seat")

    seat_map = {seat_id: "available" for seat_id in seat_ids}
    async with redis.pipeline(transaction=True) as pipe:
        pipe.delete(_seat_map_key(screening_id))
        pipe.hset(_seat_map_key(screening_id), mapping=seat_map)
        await pipe.execute()


async def seat_exists(redis: Redis, screening_id: str, seat_id: str) -> bool:
    """Return whether a seat is part of the screening's warmed seat map."""
    return bool(await redis.hexists(_seat_map_key(screening_id), seat_id))


async def _get_user_seat_keys(
    redis: Redis,
    screening_id: str,
    user_uuid: str,
    temporary_only: bool = False,
) -> list[str]:
    pattern = f"screening:{screening_id}::*"
    keys: list[str] = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return []

    async with redis.pipeline(transaction=False) as pipe:
        for key in keys:
            pipe.get(key)
            if temporary_only:
                pipe.ttl(key)
        pipeline_results = await pipe.execute()

    user_keys = []
    step = 2 if temporary_only else 1
    for index, key in enumerate(keys):
        stored_user = pipeline_results[index * step]
        ttl = pipeline_results[(index * step) + 1] if temporary_only else None
        if stored_user == user_uuid and (ttl is None or ttl > 0):
            user_keys.append(key)

    return user_keys


async def reserve_seat(
    redis: Redis,
    screening_id: str,
    seat_id: str,
    user_uuid: str,
    lock_ttl_seconds: int = 300,
) -> bool:
    """
    Attempts to reserve a specific seat atomically.
    Returns True if the reservation succeeded, False if already reserved.
    """
    key = f"screening:{screening_id}::{seat_id}"
    # nx=True makes it atomic (SET if Not Exists)
    # ex=lock_ttl_seconds ensures the reservation expires if they don't check out

    success = await redis.set(key, user_uuid, nx=True, ex=lock_ttl_seconds)
    if success:
        await publish_seat_update(redis, screening_id, seat_id, "locked")

    return bool(success)

async def release_seat(
    redis: Redis,
    screening_id: str,
    seat_id: str,
    user_uuid: str,
) -> bool:
    """Removes the seat reservation explicitly (e.g., if checkout fails)."""
    # delex executes a conditional delete operation using Redis's CAD.
    # It safely deletes a seat reservation only if it belongs to the specified user.
    deleted = await redis.delex(f"screening:{screening_id}::{seat_id}", ifeq=user_uuid)
    if deleted:
        await publish_seat_update(redis, screening_id, seat_id, "available")

    return bool(deleted)

# Optimized Lua script that handles multiple specific keys at once
EXTEND_SEATS_SCRIPT = """
local extended_count = 0
local target_user = ARGV[1]
local new_ttl = tonumber(ARGV[2])

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
    redis: Redis,
    screening_id: str, 
    user_uuid: str, 
    ttl_seconds: int = 600
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

async def acquire_seats(redis: Redis, screening_id: str, user_uuid: str) -> bool:
    """
    If payment goes through, call this function to persist ownership of all tickets 
        reserved under user_uuid which have expiration.
    """
    pattern = f"screening:{screening_id}::*"
   
   #  1. Gather keys matching pattern asynchronously
    keys: list[str] = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return False

    purchased_keys = await _get_user_seat_keys(
        redis,
        screening_id,
        user_uuid,
        temporary_only=True,
    )

    try:
        # 2. Execute everything in a single atomic batch trip to Redis
        # Pass all keys as a list, and user_uuid as the single ARGV argument
        owned, finalized = await redis.eval(
            ACQUIRE_SEATS_SCRIPT, 
            len(purchased_keys), 
            *purchased_keys, 
            user_uuid
        )
        
        # Returns True only if owned keys were successfully finalized
        success = owned > 0 and finalized == owned
        if success:
            for key in purchased_keys:
                await publish_seat_update(
                    redis,
                    screening_id,
                    _seat_id_from_key(key),
                    "purchased",
                )

        return success

    except RedisError as e:
        # Log or handle engine execution exceptions
        print(f"Redis script execution failed: {e}")
        return False


# Lua script to atomically delete uuid owned keys with ttl (temporary)
RELEASE_ALL_SCRIPT = """
local deleted_keys = {}
local target_user = ARGV[1]

for i, key in ipairs(KEYS) do
    local current = redis.call('GET', key)
    if current == target_user then
        -- Check if the key has a TTL (returns > 0 for keys with an expiration)
        local ttl = redis.call('TTL', key)
        if ttl > 0 then
            if redis.call('DEL', key) == 1 then
                table.insert(deleted_keys, key)
            end
        end
    end
end

return deleted_keys
"""
async def release_all_seats(
    redis: Redis,
    screening_id: str, 
    user_uuid: str, 
) -> int:
    """
    Removes all temporary seat reservations belonging to a specific user.
    Dynamically tracks deleted keys to publish accurate UI updates.
    """
    pattern = f"screening:{screening_id}::*"
    
    # Grab all matching keys in a single fast pass (optimized for <= 1,000 keys)
    keys = [key async for key in redis.scan_iter(match=pattern, count=1500)]
    if not keys:
        return 0

    try:
        # Run the script. Keys come back as str because decode_responses=True.
        deleted_keys: list[str] = await redis.eval(
            RELEASE_ALL_SCRIPT, 
            len(keys), 
            *keys, 
            user_uuid
        )
        
        # Broadcast real-time updates using the accurate context of each key
        for key_str in deleted_keys:
            parsed = _parse_seat_key(key_str)
            
            if parsed is None:
                continue # Safely skip if a key pattern was malformed
                
            actual_screening_id, seat_id = parsed
            
            # Real-time message goes to the specific screen instead of '*'
            await publish_seat_update(
                redis,
                actual_screening_id, 
                seat_id,
                "available",
            )

        return len(deleted_keys)
        
    except RedisError as e:
        print(f"Failed to execute release_all script: {e}")
        return 0

CHANGE_OWNER_SCRIPT = """
local updated_count = 0
local old_user = ARGV[1]
local new_user = ARGV[2]

for i, key in ipairs(KEYS) do
    local current = redis.call('GET', key)
    if current == old_user then
        redis.call('SET', key, new_user, 'KEEPTTL')
        updated_count = updated_count + 1
    end
end

return updated_count
"""

# Scans every screening; track a per-user seat set later if this gets slow.
async def change_seat_owner(
    redis: Redis,
    old_user_uuid: str,
    new_user_uuid: str,
) -> int:
    """
    Changes the ownership of all seats held by old_user_uuid to new_user_uuid.
    Returns the number of seats successfully updated.
    """
    # 1. Gather all keys matching the old user's seats
    pattern = "screening:*::*"
    keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
    if not keys:
        return 0

    try:
        # 2. Execute the ownership change in a single atomic operation
        updated_count = await redis.eval(
            CHANGE_OWNER_SCRIPT, 
            len(keys), 
            *keys, 
            old_user_uuid, 
            new_user_uuid
        )
        return int(updated_count)
        
    except RedisError as e:
        print(f"Failed to execute change_owner script: {e}")
        return 0

# --- PURPOSE 2: CACHE WARMING ---

async def warm_screening_cache(
    redis: Redis,
    hash_key: str,
    screening_data: dict[str, Any],
    ttl_seconds: int | None = None,
) -> None:
    """Pre-populates basic screening details into a Hash structure."""
    clean_data = {k: str(v) for k, v in screening_data.items()}
    async with redis.pipeline(transaction=True) as pipe:
        pipe.hset(hash_key, mapping=clean_data)
        if ttl_seconds:
            pipe.expire(hash_key, ttl_seconds)
        await pipe.execute()


async def clear_cache_by_prefix(
    redis: Redis,
    screening_id: str,
    batch_size: int = 500,
) -> int:
    """
    Deletes all Redis keys that start with the given prefix.
    Returns the number of deleted keys.
    """
    if not screening_id:
        raise ValueError("screening_id must be a non-empty string")

    pattern = f"screening:{screening_id}*"
    deleted_total = 0
    batch: list[str] = []

    async for key in redis.scan_iter(match=pattern, count=batch_size):
        batch.append(key)
        if len(batch) >= batch_size:
            deleted_total += await redis.delete(*batch)
            batch.clear()

    if batch:
        deleted_total += await redis.delete(*batch)

    return int(deleted_total)


async def close_screening_sale(redis: Redis, screening_id: str) -> int:
    """Remove cached seat state for a screening sale."""
    return await clear_cache_by_prefix(redis, screening_id)

async def get_user_held_seats(
    redis: Redis,
    screening_id: str,
    user_uuid: str,
) -> list[str]:
    """
    Finds all keys matching the screening ID that are currently held 
    (TTL > 0) by the specific user (value == user_uuid).
    Returns a list of the matching Redis keys.
    """
    pattern = f"screening:{screening_id}::*"
    
    # 1. Scan for matching keys
    keys: list[str] = [key async for key in redis.scan_iter(match=pattern, count=500)]
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
async def publish_seat_update(
    redis: Redis,
    screening_id: str,
    seat_id: str,
    status: str,
) -> None:
    """Pushes a seat status change into the Redis Stream."""
    stream_key = f"stream:screening:{screening_id}"
    screening_data = {
        "seat_id": seat_id,
        "status": status  # "locked", "available", or "purchased"
    }
    # Keep the stream bounded to avoid unbounded growth over time.
    await redis.xadd(
        stream_key,
        screening_data,
        id="*",
        maxlen=10_000,
        approximate=True,
    )


async def listen_for_expired_seat_holds(redis: Redis) -> None:
    pubsub = redis.pubsub()
    channel = "__keyevent@0__:expired"
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue

            expired_key = message.get("data")
            if not isinstance(expired_key, str):
                continue

            parsed = _parse_seat_key(expired_key)
            if parsed is None:
                continue

            screening_id, seat_id = parsed
            await publish_seat_update(redis, screening_id, seat_id, "available")
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()

# 3. READ NEW MESSAGES FROM THE STREAM (The Listening Layer)
async def listen_to_stream(
    redis: Redis,
    screening_id: str,
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
        except CancelledError:
            break
        except RedisError:
            await sleep(0.5)
            continue

        if response:
            # Response format: [[stream_key, [(message_id, data_dict)]]]
            _, messages = response[0]
            for msg_id, data in messages:
                last_id = msg_id  # Update tracking pointer
                yield msg_id, data


async def stream_sse_events(redis: Redis, screening_id: str, last_event_id: str = "$"):
    """Convert Redis stream messages into SSE-formatted chunks."""
    async for msg_id, data in listen_to_stream(redis, screening_id, last_event_id):
        payload = {"id": msg_id, **data}
        yield f"id: {msg_id}\nevent: seat_update\ndata: {json.dumps(payload)}\n\n"