import random
import logging
import smtplib
import asyncio
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


async def send_otp_sms(phone: str, otp: str) -> bool:
    logger.info(f"[OTP SMS] Sending OTP to phone {phone}")

    if not settings.FAST2SMS_API_KEY:
        logger.warning("[OTP SMS] FAST2SMS_API_KEY not set — printing OTP to console (dev mode)")
        print(f"[DEV] OTP for {phone}: {otp}")
        return True

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://www.fast2sms.com/dev/bulkV2",
                params={
                    "authorization": settings.FAST2SMS_API_KEY,
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
        logger.error(f"[OTP SMS] Exception sending SMS: {e}")
        return False


def _send_email_sync(to_email: str, otp: str) -> None:
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
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def send_otp_email(email: str, otp: str) -> bool:
    logger.info(f"[OTP EMAIL] Sending OTP to email {email}")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[OTP EMAIL] SMTP credentials not set — printing OTP to console (dev mode)")
        print(f"[DEV] Email OTP for {email}: {otp}")
        return True

    try:
        await asyncio.to_thread(_send_email_sync, email, otp)
        logger.info(f"[OTP EMAIL] Sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"[OTP EMAIL] Exception sending email: {e}")
        return False
