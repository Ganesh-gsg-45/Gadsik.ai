import asyncio
from typing import Optional, Union
from uuid import UUID

async def create_document(
    client,
    user_id: str,
    conversation_id: str,
    filename: str,
    storage_path: str = "pending"
) -> dict:
    data = {
        "user_id": str(user_id),
        "conversation_id": str(conversation_id),
        "filename": filename,
        "storage_path": storage_path,
        "status": "pending"
    }
    res = await asyncio.to_thread(lambda: client.table("documents").insert(data).execute())
    return res.data[0] if res.data else None

async def update_document_status(
    client,
    document_id: Union[str, UUID],
    status: str,
    error_message: Optional[str] = None
) -> dict:
    data = {"status": status}
    if error_message is not None:
        data["error_message"] = error_message
    res = await asyncio.to_thread(
        lambda: client.table("documents").update(data).eq("id", str(document_id)).execute()
    )
    return res.data[0] if res.data else None

async def update_document(
    client,
    document_id: Union[str, UUID],
    data: dict
) -> Optional[dict]:
    res = await asyncio.to_thread(
        lambda: client.table("documents").update(data).eq("id", str(document_id)).execute()
    )
    return res.data[0] if res.data else None

async def get_document(
    client,
    document_id: Union[str, UUID],
    user_id: Union[str, UUID]
) -> Optional[dict]:
    res = await asyncio.to_thread(
        lambda: client.table("documents")
        .select("id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, full_text, created_at")
        .eq("id", str(document_id))
        .eq("user_id", str(user_id))
        .maybe_single()
        .execute()
    )
    return res.data

async def list_documents_by_conversation(
    client,
    conversation_id: Union[str, UUID],
    user_id: Union[str, UUID]
) -> list[dict]:
    res = await asyncio.to_thread(
        lambda: client.table("documents")
        .select("id, user_id, conversation_id, filename, storage_path, chroma_collection_id, status, error_message, created_at")
        .eq("conversation_id", str(conversation_id))
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []
