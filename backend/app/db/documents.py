import asyncpg
from typing import Optional
from uuid import UUID

async def create_document(
    pool: asyncpg.Pool,
    user_id: str,
    conversation_id: str,
    filename: str,
    storage_path: str = "pending"
) -> dict:
    conv_id = UUID(conversation_id) if isinstance(conversation_id, str) else conversation_id
    u_id = UUID(user_id) if isinstance(user_id, str) else user_id

    row = await pool.fetchrow(
        """
        INSERT INTO documents (user_id, conversation_id, filename, storage_path, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, created_at
        """,
        u_id, conv_id, filename, storage_path
    )
    return dict(row)

async def update_document_status(
    pool: asyncpg.Pool,
    document_id: str | UUID,
    status: str,
    error_message: Optional[str] = None
) -> dict:
    doc_id = UUID(str(document_id)) if not isinstance(document_id, UUID) else document_id
    row = await pool.fetchrow(
        """
        UPDATE documents
        SET status = $2, error_message = $3
        WHERE id = $1
        RETURNING id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, created_at
        """,
        doc_id, status, error_message
    )
    return dict(row) if row else None

async def get_document(pool: asyncpg.Pool, document_id: str | UUID, user_id: str | UUID) -> Optional[dict]:
    doc_id = UUID(str(document_id)) if not isinstance(document_id, UUID) else document_id
    u_id = UUID(str(user_id)) if not isinstance(user_id, UUID) else user_id
    row = await pool.fetchrow(
        """
        SELECT id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, created_at
        FROM documents
        WHERE id = $1 AND user_id = $2
        """,
        doc_id, u_id
    )
    return dict(row) if row else None

async def list_documents_by_conversation(pool: asyncpg.Pool, conversation_id: str | UUID, user_id: str | UUID) -> list[dict]:
    conv_id = UUID(str(conversation_id)) if not isinstance(conversation_id, UUID) else conversation_id
    u_id = UUID(str(user_id)) if not isinstance(user_id, UUID) else user_id
    rows = await pool.fetch(
        """
        SELECT id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, created_at
        FROM documents
        WHERE conversation_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        """,
        conv_id, u_id
    )
    return [dict(row) for row in rows]
