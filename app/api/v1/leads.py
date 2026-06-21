from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.schemas.lead import (
    LeadRead, LeadDetail, LeadCreate, LeadUpdate, LeadListItem,
    LeadStageUpdate, LeadConvert, LeadActivityCreate, LeadActivityRead,
)
from app.services import lead_service

router = APIRouter()


@router.get("/", response_model=List[LeadListItem])
def list_leads(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    stage: Optional[str] = Query(None),
    include_converted: bool = Query(False),
):
    return lead_service.list_leads(
        db, current_user=current_user, skip=skip, limit=limit,
        stage=stage, include_converted=include_converted,
    )


@router.get("/{lead_id}", response_model=LeadDetail)
def get_lead(lead_id: int, db: DbSession, current_user: CurrentUser):
    return lead_service.get_lead(db, lead_id)


@router.post("/", response_model=LeadRead, dependencies=[Depends(require_permission(Permissions.CREATE_LEAD))])
def create_lead(payload: LeadCreate, db: DbSession, current_user: CurrentUser):
    return lead_service.create_lead(db, payload, current_user)


@router.patch("/{lead_id}", response_model=LeadRead, dependencies=[Depends(require_permission(Permissions.EDIT_LEAD))])
def update_lead(lead_id: int, payload: LeadUpdate, db: DbSession, current_user: CurrentUser):
    return lead_service.update_lead(db, lead_id, payload, current_user)


@router.patch("/{lead_id}/stage", response_model=LeadRead, dependencies=[Depends(require_permission(Permissions.EDIT_LEAD))])
def update_lead_stage(lead_id: int, payload: LeadStageUpdate, db: DbSession, current_user: CurrentUser):
    return lead_service.update_stage(db, lead_id, payload, current_user)


@router.post("/{lead_id}/convert", response_model=dict, dependencies=[Depends(require_permission(Permissions.CONVERT_LEAD))])
def convert_lead(lead_id: int, payload: LeadConvert, db: DbSession, current_user: CurrentUser):
    client = lead_service.convert_to_client(db, lead_id, payload, current_user)
    return {"message": "Lead converted to client", "client_id": client.id}


@router.post("/{lead_id}/activities", response_model=LeadActivityRead, dependencies=[Depends(require_permission(Permissions.EDIT_LEAD))])
def add_activity(lead_id: int, payload: LeadActivityCreate, db: DbSession, current_user: CurrentUser):
    return lead_service.add_activity(db, lead_id, payload, current_user)


@router.delete("/{lead_id}", dependencies=[Depends(require_permission(Permissions.DELETE_LEAD))])
def delete_lead(lead_id: int, db: DbSession):
    lead_service.delete_lead(db, lead_id)
    return {"message": "Lead deleted"}
