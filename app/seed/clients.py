from datetime import date
from sqlalchemy.orm import Session
from app.models.client import Client, ClientContact
from app.services.client_service import _generate_client_code


SEED_CLIENTS = [
    {
        "company_name": "Horizon Real Estate",
        "contact_person": "Faisal Al-Amin",
        "phone": "+971504001001",
        "email": "faisal@horizon-re.com",
        "industry": "Real Estate",
        "service_type": "Social Media Management",
        "package_type": "Premium",
        "contract_type": "Monthly Retainer",
        "start_date": date(2024, 1, 1),
        "renewal_date": date(2025, 1, 1),
        "monthly_value": 8000.00,
        "status": "active",
        "notes": "Long-standing client. Prefers short-form reels on Instagram and TikTok.",
        "contacts": [
            {"name": "Faisal Al-Amin", "role": "CEO", "phone": "+971504001001", "email": "faisal@horizon-re.com", "is_primary": True},
            {"name": "Noura Saleh", "role": "Marketing Manager", "phone": "+971504001002", "email": "noura@horizon-re.com", "is_primary": False},
        ],
    },
    {
        "company_name": "NovaTech Solutions",
        "contact_person": "Rami Jaber",
        "phone": "+971505002002",
        "email": "rami@novatech.ae",
        "industry": "Technology",
        "service_type": "Brand Video Production",
        "package_type": "Standard",
        "contract_type": "Project-based",
        "start_date": date(2024, 6, 1),
        "renewal_date": date(2024, 12, 31),
        "monthly_value": 5000.00,
        "status": "active",
        "notes": "Technology startup. Needs professional corporate videos.",
    },
    {
        "company_name": "Bloom Beauty",
        "contact_person": "Maya Hariri",
        "phone": "+971506003003",
        "email": "maya@bloombeauty.com",
        "industry": "Beauty & Lifestyle",
        "service_type": "Full Social Media Package",
        "package_type": "Elite",
        "contract_type": "Monthly Retainer",
        "start_date": date(2023, 9, 1),
        "renewal_date": date(2025, 9, 1),
        "monthly_value": 12000.00,
        "status": "active",
        "notes": "Beauty brand. Very active on Instagram and TikTok. Needs content calendar monthly.",
    },
]


def seed_clients(db: Session) -> dict:
    client_map = {}
    for data in SEED_CLIENTS:
        existing = db.query(Client).filter(Client.company_name == data["company_name"]).first()
        if existing:
            client_map[data["company_name"]] = existing
            continue

        contacts = data.pop("contacts", [])
        client = Client(**data)
        client.client_code = _generate_client_code(db)
        db.add(client)
        db.flush()

        for c in contacts:
            db.add(ClientContact(client_id=client.id, **c))

        client_map[data["company_name"]] = client

    db.commit()
    print(f"  Clients: {len(client_map)} ready")
    return client_map
