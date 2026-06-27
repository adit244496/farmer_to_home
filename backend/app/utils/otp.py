import random
import logging
import smtplib
import asyncio
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

SMTP_PASSWORD_MASK = "••••••"
API_KEY_MASK = "••••••"


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


async def send_otp_sms(
    phone: str,
    otp: str,
    api_key_override: Optional[str] = None,
) -> bool:
    logger.info(f"[OTP SMS] Sending OTP to {phone}")

    api_key = api_key_override or settings.FAST2SMS_API_KEY

    if not api_key:
        logger.warning("[OTP SMS] FAST2SMS_API_KEY not set — printing OTP to console (dev mode)")
        print(f"[DEV] OTP for {phone}: {otp}")
        return True

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://www.fast2sms.com/dev/bulkV2",
                params={
                    "authorization": api_key,
                    "variables_values": otp,
                    "route": "otp",
                    "numbers": phone,
                },
                headers={"cache-control": "no-cache"},
            )
            data = response.json()
            if data.get("return") is True:
                logger.info(f"[OTP SMS] Sent successfully to {phone}")
                return True
            else:
                logger.error(f"[OTP SMS] Fast2SMS error: {data}")
                return False
    except Exception as e:
        logger.error(f"[OTP SMS] Exception: {e}")
        return False


async def send_otp_whatsapp(
    phone: str,
    otp: str,
    phone_number_id: str,
    access_token: str,
    template_name: str = "otp",
    template_lang: str = "en_US",
) -> bool:
    """Send OTP via Meta WhatsApp Cloud API using a pre-approved template."""
    logger.info(f"[OTP WHATSAPP] Sending OTP to {phone}")

    # Normalize phone: WhatsApp requires E.164 without leading +
    wa_phone = phone.lstrip("+")

    url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": wa_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": template_lang},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": otp}],
                },
                {
                    # Standard copy-code button used by Meta's built-in OTP template
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [{"type": "text", "text": otp}],
                },
            ],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            data = response.json()
            if response.status_code == 200 and data.get("messages"):
                logger.info(f"[OTP WHATSAPP] Sent successfully to {phone}")
                return True
            else:
                logger.error(f"[OTP WHATSAPP] Meta API error: {data}")
                return False
    except Exception as e:
        logger.error(f"[OTP WHATSAPP] Exception: {e}")
        return False


def _send_email_sync(to_email: str, otp: str, smtp: dict) -> None:
    subject = f"Your FarmerToHome OTP: {otp}"
    html = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;">
      <h2 style="color:#2d6a4f;margin-bottom:4px;">FarmerToHome</h2>
      <p style="color:#374151;">Your one-time password is:</p>
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;
                  padding:24px;text-align:center;margin:16px 0;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#166534;">
          {otp}
        </span>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        This OTP expires in {settings.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{smtp['from_name']} <{smtp['user']}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    if smtp["port"] == 465:
        with smtplib.SMTP_SSL(smtp["host"], smtp["port"]) as server:
            server.login(smtp["user"], smtp["password"])
            server.sendmail(smtp["user"], to_email, msg.as_string())
    else:
        with smtplib.SMTP(smtp["host"], smtp["port"]) as server:
            server.starttls()
            server.login(smtp["user"], smtp["password"])
            server.sendmail(smtp["user"], to_email, msg.as_string())


async def send_otp_email(email: str, otp: str, smtp_override: Optional[dict] = None) -> bool:
    """Send OTP email. smtp_override allows DB-stored settings to take priority over env vars."""
    logger.info(f"[OTP EMAIL] Sending OTP to email {email}")

    smtp = smtp_override or {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "user": settings.SMTP_USER,
        "password": settings.SMTP_PASSWORD,
        "from_name": settings.SMTP_FROM_NAME,
    }

    if not smtp.get("user") or not smtp.get("password"):
        logger.warning("[OTP EMAIL] SMTP credentials not set — printing OTP to console (dev mode)")
        print(f"[DEV] Email OTP for {email}: {otp}")
        return True

    try:
        await asyncio.to_thread(_send_email_sync, email, otp, smtp)
        logger.info(f"[OTP EMAIL] Sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"[OTP EMAIL] Exception sending email: {e}")
        return False
