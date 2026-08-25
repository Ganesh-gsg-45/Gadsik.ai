from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime
from uuid import UUID

class MessageCreate(BaseModel):
    content: str
    document_id: str | None = None  # optional - if set, retrieval runs against this document

class MessageOut(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    tool_calls: Optional[Any] = None    # JSONB from DB; None when not a tool-call message
    tool_results: Optional[Any] = None  # JSONB from DB; None when not a tool-result message
    created_at: datetime

    class Config:
        from_attributes = True