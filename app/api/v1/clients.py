import os
import uuid
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.core.config import settings
from app.schemas.client import (
    ClientRead, ClientDetail, ClientCreate, ClientUpdate, ClientListItem,
    ClientContactCreate, ClientContactRead, ClientNoteCreate, ClientNoteRead,
)
from app.services import client_service

router = APIRouter()


@router.get("/", response_model=List[ClientListItem])
def list_clients(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: Optional[Literal["active", "inactive", "paused", "churned"]] = Query(None),
):
    return client_service.list_clients(db, current_user=current_user, skip=skip, limit=limit, status=status)


@router.get("/{client_id}", response_model=ClientDetail)
def get_client(client_id: int, db: DbSession, current_user: CurrentUser):
    return client_service.get_client(db, client_id)


@router.post("/", response_model=ClientRead, dependencies=[Depends(require_permission(Permissions.CREATE_CLIENT))])
def create_client(payload: ClientCreate, db: DbSession, current_user: CurrentUser):
    return client_service.create_client(db, payload)


@router.patch("/{client_id}", response_model=ClientRead, dependencies=[Depends(require_permission(Permissions.EDIT_CLIENT))])
def update_client(client_id: int, payload: ClientUpdate, db: DbSession):
    return client_service.update_client(db, client_id, payload)


@router.delete("/{client_id}", dependencies=[Depends(require_permission(Permissions.DELETE_CLIENT))])
def delete_client(client_id: int, db: DbSession):
    client_service.delete_client(db, client_id)
    return {"message": "Client deleted"}


@router.post("/{client_id}/contacts", response_model=ClientContactRead, dependencies=[Depends(require_permission(Permissions.EDIT_CLIENT))])
def add_contact(client_id: int, payload: ClientContactCreate, db: DbSession):
    return client_service.add_contact(db, client_id, payload)


@router.post("/{client_id}/notes", response_model=ClientNoteRead, dependencies=[Depends(require_permission(Permissions.EDIT_CLIENT))])
def add_note(client_id: int, payload: ClientNoteCreate, db: DbSession, current_user: CurrentUser):
    return client_service.add_note(db, client_id, current_user.id, payload)


@router.post("/{client_id}/upload-logo", dependencies=[Depends(require_permission(Permissions.EDIT_CLIENT))])
def upload_client_logo(
    client_id: int,
    db: DbSession,
    file: UploadFile = File(...),
):
    """Upload or replace client logo image."""
    from app.models.client import Client
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    client = client_service.get_client(db, client_id)
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "clients")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    logo_url = f"/uploads/clients/{filename}"
    db_client = db.query(Client).filter(Client.id == client_id).first()
    db_client.logo_url = logo_url
    db.commit()
    return {"logo_url": logo_url}
