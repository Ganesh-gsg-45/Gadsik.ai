from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class ConversationCreate(BaseModel):
    title: str | None = None

class ConversationOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime