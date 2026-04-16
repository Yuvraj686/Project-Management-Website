"""
TeamForge — File Upload Router

Endpoints:
    POST /files/upload         — Upload a file to AWS S3
    GET  /files/presign/{key}  — Generate a pre-signed download URL
    DELETE /files/{key}        — Delete a file from S3
"""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from middleware.auth_middleware import get_current_user
from models.user import User
from services import s3_service

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class UploadResponse(BaseModel):
    url: str
    key: str
    filename: str
    content_type: str
    size_bytes: int


class PresignResponse(BaseModel):
    presigned_url: str
    key: str
    expires_in: int


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file to AWS S3 and return its public URL.

    Supports images, PDFs, and code files up to 50 MB.
    Requires authentication.
    """
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "upload"

    try:
        url = s3_service.upload_file(file_bytes, filename, content_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"S3 upload failed: {exc}")

    # Extract the key from the URL
    key = url.split(".amazonaws.com/")[-1] if ".amazonaws.com/" in url else filename

    return UploadResponse(
        url=url,
        key=key,
        filename=filename,
        content_type=content_type,
        size_bytes=len(file_bytes),
    )


@router.get("/presign/{key:path}", response_model=PresignResponse)
async def presign_url(
    key: str,
    expires_in: int = Query(3600, ge=60, le=86400, description="URL validity in seconds"),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a pre-signed download URL for a private S3 object.

    Args:
        key:        S3 object key (path within the bucket).
        expires_in: How long the URL is valid in seconds (60s–24h).
    """
    try:
        url = s3_service.generate_presigned_url(key, expiry=expires_in)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"S3 pre-sign failed: {exc}")

    return PresignResponse(presigned_url=url, key=key, expires_in=expires_in)


@router.delete("/{key:path}", status_code=204)
async def delete_file(
    key: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a file from S3 by its object key."""
    success = s3_service.delete_file(key)
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted")
