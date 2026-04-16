"""
TeamForge — S3 Service

Provides upload, presigned URL generation, and deletion helpers for AWS S3.
All credentials come from settings — never hardcoded.
"""

import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config import settings

# ── Boto3 S3 client ─────────────────────────────────────────────────────────
def _get_s3_client():
    """Create and return an S3 client using credentials from settings."""
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Upload raw bytes to S3 and return the public URL.

    Args:
        file_bytes:   Raw file content.
        filename:     Original filename (used to derive extension).
        content_type: MIME type string (e.g. "image/png").

    Returns:
        Public HTTPS URL of the uploaded object.

    Raises:
        ClientError: If the S3 upload fails.
    """
    s3 = _get_s3_client()

    # Generate a unique key to avoid collisions
    extension = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    key = f"uploads/{uuid.uuid4().hex}.{extension}"

    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        # ACL removed — rely on bucket policy for public access
    )

    url = (
        f"https://{settings.AWS_S3_BUCKET_NAME}.s3."
        f"{settings.AWS_S3_REGION}.amazonaws.com/{key}"
    )
    return url


def generate_presigned_url(key: str, expiry: int = 3600) -> str:
    """
    Generate a time-limited pre-signed download URL for an S3 object.

    Args:
        key:    S3 object key (e.g. "uploads/abc123.pdf").
        expiry: URL validity in seconds (default 1 hour).

    Returns:
        Pre-signed HTTPS URL.
    """
    s3 = _get_s3_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expiry,
    )
    return url


def delete_file(key: str) -> bool:
    """
    Delete an object from S3.

    Args:
        key: S3 object key to delete.

    Returns:
        True on success, False if the object was not found or deletion failed.
    """
    s3 = _get_s3_client()
    try:
        s3.delete_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        return False
