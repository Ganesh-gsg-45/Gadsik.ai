import asyncpg
import json

async def create_message(
    pool: asyncpg.Pool,
    conversation_id: str,
    role: str,
    content: str,
    tool_calls: dict | None = None,
    tool_results: dict | None = None,
):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO messages (conversation_id, role, content, tool_calls, tool_results)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, conversation_id, role, content, tool_calls, tool_results, created_at
            """,
            conversation_id, role, content,
            json.dumps(tool_calls) if tool_calls else None,
            json.dumps(tool_results) if tool_results else None,
        )
        # Keep conversations.updated_at current so the list stays sorted correctly.
        # Doing this in Python avoids the need for a DB-side trigger.
        await conn.execute(
            "UPDATE conversations SET updated_at = now() WHERE id = $1",
            conversation_id,
        )
    return dict(row)


async def list_messages(pool: asyncpg.Pool, conversation_id: str):
    rows = await pool.fetch(
        """
        SELECT id, conversation_id, role, content, tool_calls, tool_results, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        """,
        conversation_id,
    )
    return [dict(row) for row in rows]


async def get_messages(
    pool: asyncpg.Pool,
    conversation_id: str,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """Paginated fetch of messages for a conversation (oldest first)."""
    rows = await pool.fetch(
        """
        SELECT id, conversation_id, role, content, tool_calls, tool_results, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
        """,
        conversation_id, limit, offset,
    )
    return [dict(row) for row in rows]