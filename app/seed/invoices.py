from datetime import date
from sqlalchemy.orm import Session
from app.models.finance import Invoice, InvoiceItem, Payment


SEED_INVOICES = [
    {
        "client": "Horizon Real Estate",
        "invoice_number": "INV-00001",
        "issue_date": date(2025, 1, 1),
        "due_date": date(2025, 1, 31),
        "payment_status": "paid",
        "notes": "January retainer",
        "items": [
            {"description": "Social Media Management — January", "quantity": 1, "unit_price": 8000.00},
        ],
        "payments": [
            {"amount": 8000.00, "payment_date": date(2025, 1, 5), "method": "bank_transfer"},
        ],
    },
    {
        "client": "Bloom Beauty",
        "invoice_number": "INV-00002",
        "issue_date": date(2025, 3, 1),
        "due_date": date(2025, 3, 15),
        "payment_status": "sent",
        "notes": "March retainer",
        "items": [
            {"description": "Social Media Management — March", "quantity": 1, "unit_price": 10000.00},
            {"description": "Extra Reels Production (3 reels)", "quantity": 3, "unit_price": 667.00},
        ],
        "payments": [],
    },
    {
        "client": "NovaTech Solutions",
        "invoice_number": "INV-00003",
        "issue_date": date(2025, 2, 15),
        "due_date": date(2025, 3, 15),
        "payment_status": "partial",
        "notes": "50% deposit for brand video project",
        "items": [
            {"description": "Corporate Brand Video — 50% Deposit", "quantity": 1, "unit_price": 7500.00},
        ],
        "payments": [
            {"amount": 3500.00, "payment_date": date(2025, 2, 20), "method": "bank_transfer", "reference_number": "TRF-2025-001"},
        ],
    },
]


def seed_invoices(db: Session, client_map: dict, user_map: dict) -> None:
    admin_user = user_map.get("admin@agency.com") or list(user_map.values())[0]
    count = 0

    for data in SEED_INVOICES:
        existing = db.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
        if existing:
            continue

        client_name = data.pop("client")
        client = client_map.get(client_name)
        items_data = data.pop("items", [])
        payments_data = data.pop("payments", [])

        subtotal = sum(item["quantity"] * item["unit_price"] for item in items_data)
        invoice = Invoice(
            **data,
            client_id=client.id if client else None,
            subtotal=subtotal,
            discount_amount=0,
            tax_amount=0,
            total_amount=subtotal,
            amount_paid=0,
            created_by=admin_user.id,
        )
        db.add(invoice)
        db.flush()

        for item in items_data:
            db.add(InvoiceItem(
                invoice_id=invoice.id,
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                total=item["quantity"] * item["unit_price"],
            ))

        total_paid = 0
        for pmt in payments_data:
            total_paid += pmt["amount"]
            db.add(Payment(
                invoice_id=invoice.id,
                amount=pmt["amount"],
                payment_date=pmt["payment_date"],
                method=pmt.get("method"),
                reference_number=pmt.get("reference_number"),
                recorded_by=admin_user.id,
            ))

        invoice.amount_paid = total_paid
        count += 1

    db.commit()
    print(f"  Invoices: {count} created")
