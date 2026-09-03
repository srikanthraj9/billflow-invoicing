import io
import logging
import os
import urllib.parse
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

logger = logging.getLogger("billflow.storage")

# Maximum upload size: 2 MB
MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2,097,152 bytes
CHUNK_SIZE = 64 * 1024  # 64 KB

# Allowed MIME types and extensions
ALLOWED_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_PILLOW_FORMATS = {"PNG", "JPEG", "WEBP"}

# Pillow decompression bomb protection (10 megapixels)
Image.MAX_IMAGE_PIXELS = 10_000_000
MAX_DIMENSION = 4096


def extract_safe_storage_path(
    logo_url: Optional[str],
    supabase_url: str,
    bucket_name: str,
    authenticated_user_id: uuid.UUID,
) -> Optional[str]:
    """
    Safely extracts and validates a Supabase Storage object path from a stored logo_url.
    Guarantees:
    1. URL host matches configured SUPABASE_URL.
    2. URL path matches /storage/v1/object/public/{bucket_name}/.
    3. Storage object path is strictly confined to users/{authenticated_user_id}/logo/.
    4. Path traversal sequences ('..') are rejected.
    5. Rejects arbitrary external URLs, wrong buckets, and other user namespaces.
    Returns validated object path (e.g. 'users/.../logo/{uuid}.png') or None if invalid.
    """
    if not logo_url or not isinstance(logo_url, str) or not logo_url.strip():
        return None

    try:
        parsed_url = urllib.parse.urlparse(logo_url.strip())
        parsed_base = urllib.parse.urlparse(supabase_url.strip())

        # 1. Host validation (must match configured Supabase host)
        if not parsed_url.netloc or parsed_url.netloc != parsed_base.netloc:
            return None

        # 2. Path prefix validation
        expected_prefix = f"/storage/v1/object/public/{bucket_name}/"
        if not parsed_url.path.startswith(expected_prefix):
            return None

        # 3. Extract object path
        object_path = parsed_url.path[len(expected_prefix):].lstrip("/")

        # 4. Strict user namespace & traversal check
        expected_user_prefix = f"users/{authenticated_user_id}/logo/"
        if not object_path.startswith(expected_user_prefix) or ".." in object_path:
            return None

        return object_path
    except Exception as e:
        logger.warning("Error parsing storage path from logo_url: %s", e)
        return None


async def validate_and_read_logo_upload(file: UploadFile) -> tuple[bytes, str]:
    """
    Reads an uploaded file with streaming size protection and validates:
    1. Maximum size <= 2 MB.
    2. Content-Type is allowed image MIME.
    3. Extension is allowed image extension.
    4. Magic bytes and Pillow image content verification.
    5. Dimensions <= 4096 x 4096.
    6. Pillow decompression-bomb safety.
    Returns:
        tuple of (file_content: bytes, canonical_extension: str)
    """
    # 1. Check Content-Type header
    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file format. Please upload a valid PNG, JPG, or WEBP image.",
        )

    # 2. Check File Extension
    original_filename = file.filename or ""
    _, ext = os.path.splitext(original_filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file extension. Allowed extensions are .png, .jpg, .jpeg, .webp",
        )

    # 3. Bounded Streaming Read (Max 2 MB)
    buffer = io.BytesIO()
    total_bytes = 0

    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_LOGO_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="Logo file size exceeds the 2 MB limit",
            )
        buffer.write(chunk)

    content = buffer.getvalue()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Uploaded file is empty",
        )

    # 4. Deep Content Inspection using Pillow
    try:
        image = Image.open(io.BytesIO(content))
        detected_format = (image.format or "").upper()

        # Reject formats outside PNG, JPEG, WEBP (e.g. GIF, TIFF, BMP, SVG, HTML)
        if detected_format not in ALLOWED_PILLOW_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported image format detected. Please upload a valid PNG, JPG, or WEBP image.",
            )

        # Dimension guard
        if image.width > MAX_DIMENSION or image.height > MAX_DIMENSION:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Image dimensions ({image.width}x{image.height}) exceed maximum allowed size of {MAX_DIMENSION}x{MAX_DIMENSION} pixels",
            )

        # Basic corruption check
        image.verify()

    except Image.DecompressionBombError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Image exceeds safe decompression limits",
        )
    except (UnidentifiedImageError, OSError, ValueError) as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Invalid or corrupted image file",
        )

    # Canonical extension derived from MIME
    canonical_ext = ALLOWED_MIME_TYPES[content_type]
    return content, canonical_ext


def get_supabase_client():
    """
    Returns an authenticated Supabase client for backend operations.
    """
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def upload_logo_to_storage(
    user_id: uuid.UUID,
    file_bytes: bytes,
    extension: str,
    content_type: str = "image/png",
) -> str:
    """
    Uploads a validated logo image to Supabase Storage.
    Path: users/{user_id}/logo/{uuid4}.{extension}
    Returns:
        Direct public URL to the uploaded asset.
    """
    random_filename = f"{uuid.uuid4()}{extension}"
    object_path = f"users/{user_id}/logo/{random_filename}"
    bucket = settings.SUPABASE_STORAGE_BUCKET

    try:
        supabase = get_supabase_client()
        # Upload using Supabase Storage Python SDK
        supabase.storage.from_(bucket).upload(
            path=object_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        logger.error("Failed to upload logo to Supabase storage: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload logo to storage",
        )

    # Construct stable public URL
    base_url = settings.SUPABASE_URL.rstrip("/")
    public_url = f"{base_url}/storage/v1/object/public/{bucket}/{object_path}"
    return public_url


def delete_storage_object(object_path: str) -> bool:
    """
    Deletes an object from Supabase Storage by its validated relative object path.
    """
    bucket = settings.SUPABASE_STORAGE_BUCKET
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(bucket).remove([object_path])
        return True
    except Exception as e:
        logger.warning("Failed to delete object '%s' from bucket '%s': %s", object_path, bucket, e)
        return False
