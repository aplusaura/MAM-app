from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.schemas.content import (
    ContentRead, ContentCreate, ContentUpdate, ContentListItem,
    PublishingScheduleCreate, PublishingScheduleRead,
)
from app.services import content_service

router = APIRouter()


@router.get("/", response_model=List[ContentListItem])
def list_content(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
):
    return content_service.list_content(db, skip=skip, limit=limit, status=status, client_id=client_id, platform=platform)


@router.get("/{content_id}", response_model=ContentRead)
def get_content(content_id: int, db: DbSession, current_user: CurrentUser):
    return content_service.get_content(db, content_id)


@router.post("/", response_model=ContentRead, dependencies=[Depends(require_permission(Permissions.CREATE_CONTENT))])
def create_content(payload: ContentCreate, db: DbSession, current_user: CurrentUser):
    return content_service.create_content(db, payload, current_user)


@router.patch("/{content_id}", response_model=ContentRead, dependencies=[Depends(require_permission(Permissions.EDIT_CONTENT))])
def update_content(content_id: int, payload: ContentUpdate, db: DbSession, current_user: CurrentUser):
    return content_service.update_content(db, content_id, payload, current_user)


@router.delete("/{content_id}", dependencies=[Depends(require_permission(Permissions.DELETE_CONTENT))])
def delete_content(content_id: int, db: DbSession):
    content_service.delete_content(db, content_id)
    return {"message": "Content item deleted"}


@router.post("/{content_id}/schedule", response_model=PublishingScheduleRead, dependencies=[Depends(require_permission(Permissions.PUBLISH_CONTENT))])
def schedule_content(content_id: int, payload: PublishingScheduleCreate, db: DbSession, current_user: CurrentUser):
    return content_service.schedule_content(db, content_id, payload)


class ContentPlanCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    status: str = "draft"


@router.post("/plans", response_model=dict, dependencies=[Depends(require_permission(Permissions.CREATE_CONTENT))])
def create_content_plan(payload: ContentPlanCreate, db: DbSession, current_user: CurrentUser):
    from datetime import date
    from app.models.content import ContentPlan
    
    plan = ContentPlan(
        title=payload.title,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        created_by=current_user.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return {
        "id": plan.id,
        "title": plan.title,
        "description": getattr(plan, "description", None),
        "start_date": str(getattr(plan, "start_date", None)),
        "end_date": str(getattr(plan, "end_date", None)),
        "status": plan.status,
        "created_at": str(plan.created_at),
    }
