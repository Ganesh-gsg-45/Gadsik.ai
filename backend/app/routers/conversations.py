from fastapi import APIRouter, Depends, HTTPException
from ..auth.dependencies import get_current_user
from ..db.connection import get_pool
from ..db import conversations as conv_repo
from ..schemas.conversation import ConversationCreate, ConversationOut

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
):
    pool = get_pool()
    return await conv_repo.list_conversations(pool, user_id)

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