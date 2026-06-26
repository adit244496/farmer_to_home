import uuid
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


async def upload_file_to_s3(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    folder: str = "uploads",
) -> str:
    """
    Upload a file to AWS S3 and return the public URL.

    Args:
        file_bytes: File content as bytes
        filename: Original filename (used for extension)
        content_type: MIME type of the file
        folder: S3 folder/prefix

    Returns:
        Public URL of the uploaded file
    """
    try:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        key = f"{folder}/{uuid.uuid4()}.{ext}"

        s3_client = _get_s3_client()
        s3_client.put_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )

        url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        logger.info(f"Uploaded file to S3: {url}")
        return url

    except ClientError as e:
        logger.error(f"S3 upload error: {e}")
        raise Exception(f"Failed to upload file to S3: {str(e)}")


async def delete_file_from_s3(url: str) -> bool:
    """
    Delete a file from S3 using its public URL.

    Args:
        url: Public URL of the S3 object

    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        base_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/"
        if not url.startswith(base_url):
            logger.warning(f"URL does not belong to configured S3 bucket: {url}")
            return False

        key = url[len(base_url):]

        s3_client = _get_s3_client()
        s3_client.delete_object(Bucket=settings.AWS_BUCKET_NAME, Key=key)
        logger.info(f"Deleted S3 object: {key}")
        return True

    except ClientError as e:
        logger.error(f"S3 delete error: {e}")
        return False


async def generate_presigned_url(key: str, expiry: int = 3600) -> str:
    """Generate a presigned URL for temporary access to a private S3 object."""
    try:
        s3_client = _get_s3_client()
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": key},
            ExpiresIn=expiry,
        )
        return url
    except ClientError as e:
        logger.error(f"S3 presigned URL error: {e}")
        raise Exception(f"Failed to generate presigned URL: {str(e)}")
