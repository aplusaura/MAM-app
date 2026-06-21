from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadSource, LeadActivity


LEAD_SOURCES = ["Instagram DM", "Referral", "WhatsApp", "Website Form", "Cold Outreach", "Exhibition"]

SEED_LEADS = [
    {
        "lead_name": "Green Gate Restaurants",
        "company_name": "Green Gate Group",
        "contact_person": "Tariq Al-Farsi",
        "phone": "+971507001001",
        "email": "tariq@greengate.ae",
        "source": "Referral",
        "interested_service": "Social Media Management",
        "expected_budget": 6000.00,
        "stage": "proposal_sent",
        "next_followup_date": date(2025, 3, 20),
        "last_contact_date": date(2025, 3, 10),
        "notes": "Interested in full package. Has 3 restaurant branches.",
    },
    {
        "lead_name": "StyleHub Fashion",
        "company_name": "StyleHub LLC",
        "contact_person": "Dania Khalaf",
        "phone": "+971507002002",
        "email": "dania@stylehub.ae",
        "source": "Instagram DM",
        "interested_service": "Reels & Content Production",
        "expected_budget": 4000.00,
        "stage": "meeting_scheduled",
        "next_followup_date": date(2025, 3, 18),
        "last_contact_date": date(2025, 3, 12),
        "notes": "Fashion brand launching a new collection. Needs urgent content.",
    },
    {
        "lead_name": "SwiftMove Logistics",
        "company_name": "SwiftMove",
        "contact_person": "Hassan Bajwa",
        "phone": "+971508003003",
        "email": "hassan@swiftmove.com",
        "source": "Cold Outreach",
        "interested_service": "Brand Video",
        "expected_budget": 15000.00,
        "stage": "qualified",
        "next_followup_date": date(2025, 3, 25),
        "last_contact_date": date(2025, 3, 5),
        "notes": "Logistics company. Needs a corporate brand film.",
    },
    {
        "lead_name": "SunBurst Events",
        "company_name": "SunBurst Events LLC",
        "contact_person": "Rima Saad",
        "phone": "+971509004004",
        "email": "rima@sunburst.ae",
        "source": "Exhibition",
        "interested_service": "Event Coverage + Social Media",
        "expected_budget": 8000.00,
        "stage": "won",
        "notes": "Won. Convert to client.",
    },
    {
        "lead_name": "Digital First Academy",
        "company_name": "Digital First",
        "contact_person": "Yusuf Mansoor",
        "phone": "+971510005005",
        "email": "yusuf@digitalfirst.ae",
        "source": "Website Form",
        "interested_service": "YouTube Channel Management",
        "expected_budget": 3500.00,
        "stage": "new_lead",
        "next_followup_date": date(2025, 3, 19),
        "notes": "Education company. Wants to start a YouTube presence.",
    },
]


def seed_leads(db: Session, user_map: dict) -> None:
    # Seed lead sources
    source_map = {}
    for name in LEAD_SOURCES:
        existing = db.query(LeadSource).filter(LeadSource.name == name).first()
        if not existing:
            src = LeadSource(name=name)
            db.add(src)
            db.flush()
            source_map[name] = src
        else:
            source_map[name] = existing

    # Default assigned user (sales or admin)
    default_user = user_map.get("omar@agency.com") or list(user_map.values())[0]

    count = 0
    for data in SEED_LEADS:
        existing = db.query(Lead).filter(Lead.lead_name == data["lead_name"]).first()
        if existing:
            continue

        source = source_map.get(data.pop("source", None))
        lead = Lead(
            **data,
            source_id=source.id if source else None,
            assigned_to=default_user.id,
        )
        db.add(lead)
        db.flush()

        # Add initial activity
        db.add(LeadActivity(
            lead_id=lead.id,
            user_id=default_user.id,
            activity_type="note",
            description="Lead added to the system",
            occurred_at=datetime.now(timezone.utc),
        ))
        count += 1

    db.commit()
    print(f"  Leads: {count} created")
