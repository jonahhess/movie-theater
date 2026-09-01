import asyncio
import sys
from fnmatch import fnmatch
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tickets.src import redis_seats


def run(coro):
    return asyncio.run(coro)


class FakePipeline:
    def __init__(self, redis):
        self.redis = redis
        self.commands = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    def ttl(self, key):
        self.commands.append(("ttl", key))

    def get(self, key):
        self.commands.append(("get", key))

    def hset(self, key, mapping):
        self.commands.append(("hset", key, mapping))

    def expire(self, key, ttl_seconds):
        self.commands.append(("expire", key, ttl_seconds))

    async def execute(self):
        results = []
        for command in self.commands:
            match command:
                case ("ttl", key):
                    results.append(await self.redis.ttl(key))
                case ("get", key):
                    results.append(await self.redis.get(key))
                case ("hset", key, mapping):
                    results.append(await self.redis.hset(key, mapping=mapping))
                case ("expire", key, ttl_seconds):
                    results.append(await self.redis.expire(key, ttl_seconds))
        return results


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.ttls = {}
        self.streams = {}

    async def set(self, key, value, nx=False, ex=None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        if ex is not None:
            self.ttls[key] = ex
        return True

    async def get(self, key):
        return self.values.get(key)

    async def delex(self, key, ifeq):
        if self.values.get(key) == ifeq:
            self.values.pop(key, None)
            self.ttls.pop(key, None)
            return 1
        return 0

    async def ttl(self, key):
        if key not in self.values:
            return -2
        return self.ttls.get(key, -1)

    async def expire(self, key, ttl_seconds):
        if key not in self.values:
            return 0
        self.ttls[key] = int(ttl_seconds)
        return 1

    async def hset(self, key, mapping):
        self.values.setdefault(key, {}).update(mapping)
        return len(mapping)

    async def hgetall(self, key):
        return self.values.get(key, {})

    async def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.values:
                deleted += 1
                self.values.pop(key, None)
                self.ttls.pop(key, None)
        return deleted

    async def scan_iter(self, match, count=500):
        for key in list(self.values):
            if fnmatch(key, match):
                yield key

    def pipeline(self, transaction=True):
        return FakePipeline(self)

    async def eval(self, script, number_of_keys, *args):
        keys = args[:number_of_keys]
        argv = args[number_of_keys:]

        if script == redis_seats.EXTEND_SEATS_SCRIPT:
            target_user, ttl_seconds = argv
            extended = 0
            for key in keys:
                if self.values.get(key) == target_user:
                    extended += await self.expire(key, ttl_seconds)
            return extended

        if script == redis_seats.ACQUIRE_SEATS_SCRIPT:
            target_user = argv[0]
            owned = 0
            finalized = 0
            for key in keys:
                if self.values.get(key) == target_user:
                    owned += 1
                    ttl = await self.ttl(key)
                    if ttl > 0:
                        self.ttls.pop(key, None)
                        finalized += 1
                    elif ttl == -1:
                        finalized += 1
            return [owned, finalized]

        if script == redis_seats.RELEASE_ALL_SCRIPT:
            target_user = argv[0]
            deleted = 0
            for key in keys:
                if self.values.get(key) == target_user:
                    deleted += await self.delete(key)
            return deleted

        raise AssertionError("unexpected Lua script")

    async def xadd(self, key, fields, id="*", maxlen=None, approximate=True):
        message_id = "1-0"
        self.streams.setdefault(key, []).append((message_id, fields))
        return message_id

    async def xread(self, streams, count=1, block=5000):
        stream_key = next(iter(streams))
        messages = self.streams.get(stream_key, [])[:count]
        if not messages:
            return []
        return [(stream_key, messages)]


def test_reserve_seat_sets_temporary_lock_and_rejects_duplicate_holder():
    async def scenario():
        redis = FakeRedis()

        first_attempt = await redis_seats.reserve_seat(
            redis, "10", "A1", "user-1", lock_ttl_seconds=60
        )
        second_attempt = await redis_seats.reserve_seat(
            redis, "10", "A1", "user-2", lock_ttl_seconds=60
        )

        assert first_attempt is True
        assert second_attempt is False
        assert await redis.get("screening:10::A1") == "user-1"
        assert await redis.ttl("screening:10::A1") == 60

    run(scenario())


def test_release_seat_only_deletes_matching_user_lock():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1", ex=60)

        await redis_seats.release_seat(redis, "10", "A1", "user-2")
        assert await redis.get("screening:10::A1") == "user-1"

        await redis_seats.release_seat(redis, "10", "A1", "user-1")
        assert await redis.get("screening:10::A1") is None

    run(scenario())


def test_get_user_held_seats_returns_only_current_users_temporary_locks():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1", ex=60)
        await redis.set("screening:10::A2", "user-1")
        await redis.set("screening:10::A3", "user-2", ex=60)
        await redis.set("screening:11::A1", "user-1", ex=60)

        held = await redis_seats.get_user_held_seats(redis, "10", "user-1")

        assert held == ["screening:10::A1"]

    run(scenario())


def test_extend_seat_hold_refreshes_all_matching_user_locks():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1", ex=60)
        await redis.set("screening:10::A2", "user-1", ex=60)
        await redis.set("screening:10::A3", "user-2", ex=60)

        extended = await redis_seats.extend_seat_hold(
            redis, "10", "user-1", ttl_seconds=300
        )

        assert extended is True
        assert await redis.ttl("screening:10::A1") == 300
        assert await redis.ttl("screening:10::A2") == 300
        assert await redis.ttl("screening:10::A3") == 60

    run(scenario())


def test_acquire_seats_persists_owned_locks():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1", ex=60)
        await redis.set("screening:10::A2", "user-1", ex=60)
        await redis.set("screening:10::A3", "user-2", ex=60)

        acquired = await redis_seats.acquire_seats(redis, "10", "user-1")

        assert acquired is True
        assert await redis.ttl("screening:10::A1") == -1
        assert await redis.ttl("screening:10::A2") == -1
        assert await redis.ttl("screening:10::A3") == 60

    run(scenario())


def test_release_all_seats_deletes_only_matching_user_locks():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1", ex=60)
        await redis.set("screening:10::A2", "user-1", ex=60)
        await redis.set("screening:10::A3", "user-2", ex=60)

        released = await redis_seats.release_all_seats(redis, "10", "user-1")

        assert released == 2
        assert await redis.get("screening:10::A1") is None
        assert await redis.get("screening:10::A2") is None
        assert await redis.get("screening:10::A3") == "user-2"

    run(scenario())


def test_release_all_lua_script_reads_first_argument_as_target_user():
    assert "local target_user = ARGV[1]" in redis_seats.RELEASE_ALL_SCRIPT


def test_warm_screening_cache_stores_strings_and_optional_ttl():
    async def scenario():
        redis = FakeRedis()

        await redis_seats.warm_screening_cache(
            redis,
            "screening:10:details",
            {"title": "Alien", "auditorium": 2},
            ttl_seconds=120,
        )

        assert await redis.hgetall("screening:10:details") == {
            "title": "Alien",
            "auditorium": "2",
        }
        assert await redis.ttl("screening:10:details") == 120

    run(scenario())


def test_clear_cache_by_prefix_deletes_matching_keys_in_batches():
    async def scenario():
        redis = FakeRedis()
        await redis.set("screening:10::A1", "user-1")
        await redis.set("screening:10:details", "cached")
        await redis.set("screening:11::A1", "user-1")

        deleted = await redis_seats.clear_cache_by_prefix(redis, "10", batch_size=1)

        assert deleted == 2
        assert await redis.get("screening:10::A1") is None
        assert await redis.get("screening:10:details") is None
        assert await redis.get("screening:11::A1") == "user-1"

    run(scenario())


def test_clear_cache_by_prefix_requires_screening_id():
    async def scenario():
        redis = FakeRedis()

        with pytest.raises(ValueError, match="screening_id"):
            await redis_seats.clear_cache_by_prefix(redis, "")

    run(scenario())


def test_publish_seat_update_adds_stream_message():
    async def scenario():
        redis = FakeRedis()

        await redis_seats.publish_seat_update(redis, "10", "A1", "locked")

        assert redis.streams == {
            "stream:screening:10": [("1-0", {"seat_id": "A1", "status": "locked"})]
        }

    run(scenario())


def test_stream_sse_events_formats_first_stream_message():
    async def scenario():
        redis = FakeRedis()
        await redis.xadd("stream:screening:10", {"seat_id": "A1", "status": "locked"})

        stream = redis_seats.stream_sse_events(redis, "10")
        event = await anext(stream)
        await stream.aclose()

        assert event == (
            'id: 1-0\n'
            'event: seat_update\n'
            'data: {"id": "1-0", "seat_id": "A1", "status": "locked"}\n\n'
        )

    run(scenario())