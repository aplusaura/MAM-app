from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadActivity
from app.models.client import Client
from app.models.user import User
from app.core.exceptions import NotFoundError, BadRequestError
from app.schemas.lead import LeadCreate, LeadUpdate, LeadStageUpdate, LeadConvert, LeadActivityCreate


def list_leads(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    stage: Optional[str] = None,
    include_converted: bool = False,
):
    q = db.query(Lead).filter(Lead.deleted_at.is_(None))
    if not include_converted:
        q = q.filter(Lead.converted_to_client_id.is_(None))
    if stage:
        q = q.filter(Lead.stage == stage)
    return q.offset(skip).limit(limit).all()


def get_lead(db: Session, lead_id: int) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.deleted_at.is_(None)).first()
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


def create_lead(db: Session, payload: LeadCreate, current_user: User) -> Lead:
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, lead_id: int, payload: LeadUpdate, current_user: User) -> Lead:
    lead = get_lead(db, lead_id)
    old_stage = lead.stage

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)

    if "stage" in update_data and update_data["stage"] != old_stage:
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="stage_change",
            description=f"Stage changed from {old_stage} to {update_data['stage']}",
            occurred_at=datetime.now(timezone.utc),
        )
        db.add(activity)

    db.commit()
    db.refresh(lead)
    return lead


def update_stage(db: Session, lead_id: int, payload: LeadStageUpdate, current_user: User) -> Lead:
    lead = get_lead(db, lead_id)
    old_stage = lead.stage
    lead.stage = payload.stage

    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="stage_change",
        description=payload.note or f"Stage changed from {old_stage} to {payload.stage}",
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(activity)
    db.commit()
    db.refresh(lead)
    return lead


def convert_to_client(db: Session, lead_id: int, payload: LeadConvert, current_user: User) -> Client:
    lead = get_lead(db, lead_id)
    if lead.stage != "won":
        raise BadRequestError("Only won leads can be converted to clients")
    if lead.converted_to_client_id:
        raise BadRequestError("Lead already converted to a client")

    client = Client(
        company_name=payload.company_name or lead.company_name or lead.lead_name,
        contact_person=payload.contact_person or lead.contact_person,
        phone=payload.phone or lead.phone,
        email=payload.email or lead.email,
        status="active",
    )
    db.add(client)
    db.flush()

    lead.converted_to_client_id = client.id
    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="note",
        description=f"Converted to client (ID: {client.id})",
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(activity)
    db.commit()
    db.refresh(client)
    return client


def add_activity(db: Session, lead_id: int, payload: LeadActivityCreate, current_user: User) -> LeadActivity:
    get_lead(db, lead_id)
    activity = LeadActivity(
        lead_id=lead_id,
        user_id=current_user.id,
        activity_type=payload.activity_type,
        description=payload.description,
        occurred_at=payload.occurred_at,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def delete_lead(db: Session, lead_id: int) -> None:
    lead = get_lead(db, lead_id)
    lead.deleted_at = datetime.now(timezone.utc)
    db.commit()
