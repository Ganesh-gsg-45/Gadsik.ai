from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class DocumentOut(BaseModel):
    id: UUID
    user_id: UUID
    conversation_id: Optional[UUID] = None
    filename: str
    storage_path: str
    chroma_collection_id: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
