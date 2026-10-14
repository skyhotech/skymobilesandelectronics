"""Real Redis checks using Django's configured development settings; no flushes."""

import asyncio
import os
from pathlib import Path
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django

django.setup()

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from config.celery import app


async def channel_check():
    layer = get_channel_layer()
    channel = await layer.new_channel()
    group = "sky-check-" + uuid.uuid4().hex
    try:
        await layer.group_add(group, channel)
        await layer.group_send(group, {"type": "redis.check", "value": "ok"})
        message = await asyncio.wait_for(layer.receive(channel), timeout=5)
        if message.get("value") != "ok":
            raise RuntimeError("Channel message did not match")
    finally:
        await layer.group_discard(group, channel)
        await layer.close_pools()


def main():
    key = "redis-verification-" + uuid.uuid4().hex
    try:
        cache.set(key, "verified", timeout=60)
        code = (
            "import os,django; os.environ.setdefault('DJANGO_SETTINGS_MODULE',"
            "'config.settings.development'); django.setup(); "
            "from django.core.cache import cache; import sys; "
            "assert cache.get(sys.argv[1]) == 'verified'"
        )
        subprocess.run([sys.executable, "-c", code, key], cwd=ROOT / "backend", check=True)
        print("PASS: Django cache shared across Python processes")
        async_to_sync(channel_check)()
        print("PASS: Redis Channels group send/receive")
        with app.connection_for_write() as broker:
            broker.ensure_connection(max_retries=0)
        print("PASS: Celery Redis broker connection")
    finally:
        cache.delete(key)


if __name__ == "__main__":
    main()
