from typing import List
from fastapi import APIRouter, Depends

from app.api.deps import DbSession, get_current_user
from app.schemas.role import PermissionRead
from app.services import role_service

router = APIRouter()


@router.get("/", response_model=List[PermissionRead], dependencies=[Depends(get_current_user)])
def list_permissions(db: DbSession, module: str | None = None):
    return role_service.list_permissions(db, module=module)
