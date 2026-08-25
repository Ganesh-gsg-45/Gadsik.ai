import asyncpg
from typing import Optional


async def log_usage_event(
    pool: asyncpg.Pool,
    user_id: str,
    event_type: str,
    tokens_used: Optional[int] = None,
) -> None:
    """
    Insert a row into usage_events.
    Called after every Gemini API response so we have an audit trail
    of token consumption per user.
    """
    await pool.execute(
        """
        INSERT INTO usage_events (user_id, event_type, tokens_used)
        VALUES ($1, $2, $3)
        """,
        user_id, event_type, tokens_used,
    )
