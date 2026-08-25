from fastapi import APIRouter, Depends, HTTPException, Query, Request
from ..auth.dependencies import get_current_user
from ..db.connection import get_pool
from ..db import conversations as conv_repo
from ..db import messages as msg_repo
from ..db.usage import log_usage_event
from ..schemas.conversation import ConversationCreate, ConversationOut
from ..schemas.message import MessageCreate, MessageOut
from ..llm.gemini_client import generate_reply
from ..rag.embeddings import embed_query
from ..rag.chroma_store import query_collection
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut)
async def create_conversation(
    body: ConversationCreate,
    user_id: str = Depends(get_current_user),
):
    pool = get_pool()
    result = await conv_repo.create_conversation(pool, user_id, body.title)
    return result


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    user_id: str = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    pool = get_pool()
    return await conv_repo.list_conversations(pool, user_id, limit=limit, offset=offset)


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
):
    pool = get_pool()
    result = await conv_repo.get_conversation(pool, conversation_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


# ── NEW: list messages in a conversation ──────────────────────────────────────

@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Return paginated message history for a conversation (oldest first)."""
    pool = get_pool()
    convo = await conv_repo.get_conversation(pool, conversation_id, user_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return await msg_repo.get_messages(pool, conversation_id, limit=limit, offset=offset)


# ── NEW: rename a conversation ────────────────────────────────────────────────

class ConversationUpdate(BaseModel):
    title: Optional[str] = None

@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update a conversation's title."""
    pool = get_pool()
    convo = await conv_repo.get_conversation(pool, conversation_id, user_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await conv_repo.update_conversation(pool, conversation_id, user_id, title=body.title)
    return result


# ── NEW: delete a conversation ────────────────────────────────────────────────

@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a conversation and all its messages (cascade)."""
    pool = get_pool()
    convo = await conv_repo.get_conversation(pool, conversation_id, user_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await conv_repo.delete_conversation(pool, conversation_id, user_id)


# ── Existing: send a message ──────────────────────────────────────────────────

@router.post("/{conversation_id}/messages", response_model=MessageOut)
async def send_message(
    request: Request,
    conversation_id: str,
    body: MessageCreate,
    user_id: str = Depends(get_current_user),
):
    pool = get_pool()

    convo = await conv_repo.get_conversation(pool, conversation_id, user_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save the user's message
    await msg_repo.create_message(pool, conversation_id, "user", body.content)

    # Build the prompt - with or without document context
    if body.document_id:
        # Confirm document exists, belongs to this user, and is ready
        doc = await pool.fetchrow(
            "SELECT id, status, chroma_collection_id FROM documents WHERE id = $1 AND user_id = $2",
            body.document_id, user_id
        )
        if doc is None:
            raise HTTPException(404, "Document not found")
        if doc["status"] != "ready":
            raise HTTPException(400, f"Document is not ready yet (status: {doc['status']})")

        # Retrieve relevant chunks for this specific question
        query_vec = embed_query(body.content)
        retrieved_chunks = query_collection(
            doc["chroma_collection_id"] or body.document_id, query_vec, top_k=5
        )

        context = "\n\n".join(
            f"[Page {c['page_number']}]: {c['text']}" for c in retrieved_chunks
        )

        prompt = f"""You are answering a question using ONLY the context provided below, 
which comes from a document the user uploaded. If the context doesn't contain 
enough information to answer, say so honestly.

Context:
{context}

Question: {body.content}

Answer:"""

    else:
        # No document - plain chat, use conversation history as before
        history = await msg_repo.list_messages(pool, conversation_id)
        prompt = "\n".join(f"{m['role']}: {m['content']}" for m in history)

    # Call Gemini — returns (text, real_token_count)
    reply_text, tokens_used = generate_reply(prompt)

    # Save assistant's reply
    assistant_msg = await msg_repo.create_message(pool, conversation_id, "assistant", reply_text)

    # Log real token usage (fire-and-forget; don't let a logging failure break chat)
    try:
        await log_usage_event(pool, user_id, "chat_message", tokens_used)
    except Exception:
        pass

    return assistant_msg