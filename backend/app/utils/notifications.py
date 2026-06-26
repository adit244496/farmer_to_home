import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Send push notification via Firebase Cloud Messaging (FCM).
    Currently a stub - logs to console.
    TODO: Integrate with Firebase Admin SDK
    """
    logger.info(f"[FCM] Sending notification to token {fcm_token[:10]}...")
    logger.info(f"[FCM] Title: {title} | Body: {body}")
    print(f"[DEV NOTIFICATION] Token: {fcm_token[:10]}... | {title}: {body}")

    # TODO: Replace with actual Firebase integration
    # import firebase_admin
    # from firebase_admin import messaging
    # message = messaging.Message(
    #     notification=messaging.Notification(title=title, body=body),
    #     data={str(k): str(v) for k, v in (data or {}).items()},
    #     token=fcm_token,
    # )
    # messaging.send(message)
    return True


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> "Notification":
    """
    Create a notification record in the database and optionally send push notification.
    """
    from app.models.review import Notification
    from app.models.user import User
    from sqlalchemy import select

    notification = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        is_read=False,
        data=data,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    await db.flush()

    # Try to send push notification
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.fcm_token:
            await send_push_notification(user.fcm_token, title, body, data)
    except Exception as e:
        logger.warning(f"Failed to send push notification for user {user_id}: {e}")

    return notification
