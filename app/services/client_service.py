from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.client import Client, ClientContact, ClientNote
from app.models.user import User
from app.core.exceptions import NotFoundError
from app.schemas.client import ClientCreate, ClientUpdate, ClientContactCreate, ClientNoteCreate
from app.api.deps import _user_has_permission
from app.core.permissions import Permissions


def _generate_client_code(db: Session) -> str:
    count = db.query(func.count(Client.id)).filter(Client.deleted_at.is_(None)).scalar() or 0
    return f"CLT-{(count + 1):03d}"


def list_clients(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
):
    q = db.query(Client).filter(Client.deleted_at.is_(None))
    if status:
        q = q.filter(Client.status == status)
    return q.offset(skip).limit(limit).all()


def get_client(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(
        Client.id == client_id, Client.deleted_at.is_(None)
    ).first()
    if not client:
        raise NotFoundError("Client not found")
    return client


def create_client(db: Session, payload: ClientCreate) -> Client:
    client = Client(**payload.model_dump())
    client.client_code = _generate_client_code(db)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update_client(db: Session, client_id: int, payload: ClientUpdate) -> Client:
    client = get_client(db, client_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client


def delete_client(db: Session, client_id: int) -> None:
    client = get_client(db, client_id)
    client.deleted_at = datetime.now(timezone.utc)
    db.commit()


def add_contact(db: Session, client_id: int, payload: ClientContactCreate) -> ClientContact:
    get_client(db, client_id)
    contact = ClientContact(client_id=client_id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def add_note(db: Session, client_id: int, user_id: int, payload: ClientNoteCreate) -> ClientNote:
    get_client(db, client_id)
    note = ClientNote(client_id=client_id, user_id=user_id, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
