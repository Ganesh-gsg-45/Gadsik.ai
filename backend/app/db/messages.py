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
    row = await pool.fetchrow(
        """
        INSERT INTO messages (conversation_id, role, content, tool_calls, tool_results)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, conversation_id, role, content, tool_calls, tool_results, created_at
        """,
        conversation_id, role, content,
        json.dumps(tool_calls) if tool_calls else None,
        json.dumps(tool_results) if tool_results else None,
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
        conversation_id
    )
    return [dict(row) for row in rows]