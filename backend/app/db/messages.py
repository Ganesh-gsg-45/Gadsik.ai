import asyncio
from datetime import datetime, timezone
from typing import Optional

async def create_message(
    client,
    conversation_id: str,
    role: str,
    content: str,
    tool_calls: dict | None = None,
    tool_results: dict | None = None,
):
    msg_data = {
        "conversation_id": str(conversation_id),
        "role": role,
        "content": content,
    }
    if tool_calls is not None:
        msg_data["tool_calls"] = tool_calls
    if tool_results is not None:
        msg_data["tool_results"] = tool_results

    def _sync_create():
        res = client.table("messages").insert(msg_data).execute()
        # Keep conversations.updated_at current so the list stays sorted correctly
        client.table("conversations").update({
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", str(conversation_id)).execute()
        return res.data[0] if res.data else None

    return await asyncio.to_thread(_sync_create)


async def list_messages(
    client,
    conversation_id: str,
    limit: int = 50,
) -> list[dict]:
    """Fetch the most recent `limit` messages for a conversation (oldest first)."""
    res = await asyncio.to_thread(
        lambda: client.table("messages")
        .select("id, conversation_id, role, content, tool_calls, tool_results, created_at")
        .eq("conversation_id", str(conversation_id))
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return res.data or []


async def get_messages(
    client,
    conversation_id: str,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """Paginated fetch of messages for a conversation (oldest first)."""
    res = await asyncio.to_thread(
        lambda: client.table("messages")
        .select("id, conversation_id, role, content, tool_calls, tool_results, created_at")
        .eq("conversation_id", str(conversation_id))
        .order("created_at", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return res.data or []