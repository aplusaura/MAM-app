import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP. Returns False silently if SMTP is not configured."""
    if not settings.SMTP_HOST:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to, msg.as_string())

        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_task_overdue_notification(
    task_title: str,
    assigned_to_email: str,
    due_date: date,
) -> bool:
    """Notify an assignee that a task is overdue."""
    subject = f"Overdue task: {task_title}"
    body = (
        f"Hi,\n\n"
        f'The task "{task_title}" was due on {due_date} and has not been completed.\n\n'
        f"Please update the task status or reach out to your manager if you need assistance.\n\n"
        f"This is an automated notification from {settings.APP_NAME}."
    )
    return send_email(assigned_to_email, subject, body)


def send_invoice_due_notification(
    invoice_number: str,
    client_email: str,
    due_date: date,
    amount: float,
) -> bool:
    """Notify a client that an invoice is due."""
    subject = f"Invoice {invoice_number} due on {due_date}"
    body = (
        f"Hi,\n\n"
        f"This is a reminder that invoice {invoice_number} for the amount of "
        f"${amount:,.2f} is due on {due_date}.\n\n"
        f"Please arrange payment at your earliest convenience.\n\n"
        f"This is an automated notification from {settings.APP_NAME}."
    )
    return send_email(client_email, subject, body)
