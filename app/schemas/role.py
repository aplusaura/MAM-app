from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    module: str
    description: Optional[str] = None


class RoleBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleRead(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class RoleWithPermissions(RoleRead):
    permissions: List[PermissionRead] = []
