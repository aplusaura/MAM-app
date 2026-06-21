from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_name: str
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    uploaded_by: Optional[int] = None
    created_at: datetime
