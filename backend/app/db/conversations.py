import asyncio
from datetime import datetime, timezone
from typing import Optional

async def create_conversation(client, user_id: str, title: str | None = None):
    data = {
        "user_id": str(user_id),
        "title": title or "New Chat"
    }
    res = await asyncio.to_thread(lambda: client.table("conversations").insert(data).execute())
    return res.data[0] if res.data else None

async def list_conversations(
    client,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
):
    res = await asyncio.to_thread(
        lambda: client.table("conversations")
        .select("id, user_id, title, created_at, updated_at")
        .eq("user_id", str(user_id))
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return res.data or []

async def get_conversation(client, conversation_id: str, user_id: str):
    res = await asyncio.to_thread(
        lambda: client.table("conversations")
        .select("id, user_id, title, created_at, updated_at")
        .eq("id", str(conversation_id))
        .eq("user_id", str(user_id))
        .maybe_single()
        .execute()
    )
    return res.data

async def update_conversation(
    client,
    conversation_id: str,
    user_id: str,
    title: Optional[str] = None,
) -> Optional[dict]:
    """Rename a conversation. Only fields that are not None are updated."""
    data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if title is not None:
        data["title"] = title

    res = await asyncio.to_thread(
        lambda: client.table("conversations")
        .update(data)
        .eq("id", str(conversation_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return res.data[0] if res.data else None

async def delete_conversation(client, conversation_id: str, user_id: str) -> None:
    """Delete a conversation (messages and documents cascade or are removed)."""
    await asyncio.to_thread(
        lambda: client.table("conversations")
        .delete()
        .eq("id", str(conversation_id))
        .eq("user_id", str(user_id))
        .execute()
    )