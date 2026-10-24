import asyncio
import logging
from typing import Optional
from supabase import create_client, Client
from ..config import settings

logger = logging.getLogger(__name__)
_client: Optional[Client] = None

async def connect_db():
    global _client
    _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    try:
        # Ping check with a timeout
        await asyncio.to_thread(lambda: _client.table("conversations").select("id").limit(1).execute())
        print("[DB] Connected to Supabase via HTTPS successfully.")
    except Exception as e:
        print("=" * 60)
        print(f"[DB Warning] Could not reach Supabase during startup: {e}")
        print("[DB Warning] Likely cause: Your Supabase project is PAUSED (Free tier pauses after 7 days).")
        print(f"[DB Warning] To restore it, visit: {settings.SUPABASE_URL.replace('.supabase.co', '')} or https://supabase.com/dashboard")
        print("=" * 60)

async def disconnect_db():
    global _client
    _client = None

def get_pool() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client

def get_client() -> Client:
    return get_pool()