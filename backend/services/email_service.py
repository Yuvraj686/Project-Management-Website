"""
TeamForge — Email Service (SendGrid)

Sends transactional emails via the SendGrid HTTP API.
"""

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import settings


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send a single transactional email via SendGrid.

    Args:
        to_email:     Recipient email address.
        subject:      Email subject line.
        html_content: HTML body of the email.

    Returns:
        True if the email was accepted (2xx status), False otherwise.
    """
    message = Mail(
        from_email=settings.EMAIL_FROM,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code in (200, 202)
    except Exception as exc:
        print(f"[email_service] Failed to send email to {to_email}: {exc}")
        return False


def send_deadline_warning_email(
    to_email: str,
    project_name: str,
    warning_text: str,
    days_remaining: float,
) -> bool:
    """
    Send a formatted deadline-warning email to a team member.

    Args:
        to_email:      Recipient address.
        project_name:  Project display name.
        warning_text:  AI-generated warning body.
        days_remaining: Number of days until the deadline.

    Returns:
        True on successful delivery.
    """
    subject = f"⏰ TeamForge Deadline Warning — {project_name} ({days_remaining:.0f} days left)"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #e53e3e;">⏰ Deadline Warning</h2>
      <p><strong>Project:</strong> {project_name}</p>
      <p><strong>Days Remaining:</strong> {days_remaining:.1f}</p>
      <hr/>
      <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 16px; border-radius: 4px;">
        <pre style="white-space: pre-wrap; font-family: inherit;">{warning_text}</pre>
      </div>
      <hr/>
      <p style="color: #718096; font-size: 12px;">
        Sent by TeamForge · <a href="{settings.FRONTEND_URL}">Open Dashboard</a>
      </p>
    </div>
    """
    return send_email(to_email, subject, html)
