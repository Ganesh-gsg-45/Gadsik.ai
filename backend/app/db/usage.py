import asyncio
from typing import Optional

async def log_usage_event(
    client,
    user_id: str,
    event_type: str,
    tokens_used: Optional[int] = None,
) -> None:
    """
    Insert a row into usage_events in Supabase.
    Called after every LLM API response to log token consumption.
    """
    data = {
        "user_id": str(user_id),
        "event_type": event_type,
        "tokens_used": tokens_used,
    }
    try:
        await asyncio.to_thread(lambda: client.table("usage_events").insert(data).execute())
    except Exception:
        pass
