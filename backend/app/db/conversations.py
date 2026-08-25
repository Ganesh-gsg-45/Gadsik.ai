import asyncpg
from typing import Optional

async def create_conversation(pool: asyncpg.Pool, user_id: str, title: str | None = None):
    row = await pool.fetchrow(
        """
        INSERT INTO conversations (user_id, title)
        VALUES ($1, $2)
        RETURNING id, user_id, title, created_at, updated_at
        """,
        user_id, title
    )
    return dict(row)

async def list_conversations(
    pool: asyncpg.Pool,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
):
    rows = await pool.fetch(
        """
        SELECT id, user_id, title, created_at, updated_at
        FROM conversations
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
        """,
        user_id, limit, offset
    )
    return [dict(row) for row in rows]

async def get_conversation(pool: asyncpg.Pool, conversation_id: str, user_id: str):
    row = await pool.fetchrow(
        """
        SELECT id, user_id, title, created_at, updated_at
        FROM conversations
        WHERE id = $1 AND user_id = $2
        """,
        conversation_id, user_id
    )
    return dict(row) if row else None

async def update_conversation(
    pool: asyncpg.Pool,
    conversation_id: str,
    user_id: str,
    title: Optional[str] = None,
) -> Optional[dict]:
    """Rename a conversation. Only fields that are not None are updated."""
    row = await pool.fetchrow(
        """
        UPDATE conversations
        SET title = COALESCE($3, title),
            updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, title, created_at, updated_at
        """,
        conversation_id, user_id, title
    )
    return dict(row) if row else None

async def delete_conversation(pool: asyncpg.Pool, conversation_id: str, user_id: str) -> None:
    """Delete a conversation (messages cascade via FK)."""
    await pool.execute(
        "DELETE FROM conversations WHERE id = $1 AND user_id = $2",
        conversation_id, user_id
    )