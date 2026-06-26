import random
import logging

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a 6-digit OTP string."""
    return str(random.randint(100000, 999999))


async def send_otp_email(email: str, otp: str) -> bool:
    """
    Send OTP via email.
    Currently a stub - logs to console.
    TODO: Integrate with email provider (e.g., SendGrid, AWS SES)
    """
    logger.info(f"[OTP EMAIL] Sending OTP {otp} to email {email}")
    print(f"[DEV] Email OTP for {email}: {otp}")
    return True


async def send_otp_sms(phone: str, otp: str) -> bool:
    """
    Send OTP via SMS.
    Currently a stub - logs to console.
    TODO: Integrate with SMS provider (e.g., MSG91, Twilio, Fast2SMS)
    """
    logger.info(f"[OTP SMS] Sending OTP {otp} to phone {phone}")
    print(f"[DEV] OTP for {phone}: {otp}")
    # TODO: Replace with actual SMS provider integration
    # Example MSG91 integration:
    # import httpx
    # async with httpx.AsyncClient() as client:
    #     response = await client.get(
    #         "https://api.msg91.com/api/sendotp.php",
    #         params={
    #             "template_id": "...",
    #             "mobile": phone,
    #             "authkey": settings.MSG91_AUTH_KEY,
    #             "otp": otp,
    #         }
    #     )
    #     return response.status_code == 200
    return True
