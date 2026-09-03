import logging
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.settings import (
    LogoUploadResponse,
    SettingsResponse,
    SettingsUpdateRequest,
)
from app.services.settings import (
    clear_logo_url,
    get_or_create_settings,
    update_logo_url,
    update_settings as update_settings_service,
)
from app.services.storage import (
    delete_storage_object,
    extract_safe_storage_path,
    upload_logo_to_storage,
    validate_and_read_logo_upload,
)

logger = logging.getLogger("billflow.api.settings")
router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsResponse, status_code=status.HTTP_200_OK)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the authenticated merchant's business settings.
    If no settings record exists, auto-creates defaults safely and returns 200.
    """
    settings_obj = get_or_create_settings(db, current_user.id)
    return settings_obj


@router.put("", response_model=SettingsResponse, status_code=status.HTTP_200_OK)
def update_settings(
    payload: SettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated merchant's business identity and invoice preferences.
    Returns the complete updated settings.
    """
    updated = update_settings_service(db, current_user.id, payload)
    return updated


@router.post("/logo", response_model=LogoUploadResponse, status_code=status.HTTP_200_OK)
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Uploads or replaces the merchant's business logo.
    1. Validates size (max 2 MB), MIME type, extension, and binary content using Pillow.
    2. Uploads new asset to Supabase Storage bucket under users/{user_id}/logo/{uuid}.{ext}.
    3. Updates database logo_url and commits transaction.
    4. Deletes previous logo from storage after successful commit.
    """
    # 1. Validate and stream read
    file_bytes, extension = await validate_and_read_logo_upload(file)
    content_type = file.content_type or "image/png"

    # 2. Upload new logo to object storage
    new_public_url = upload_logo_to_storage(
        user_id=current_user.id,
        file_bytes=file_bytes,
        extension=extension,
        content_type=content_type,
    )

    # 3. Update database with rollback protection
    try:
        _, old_logo_url = update_logo_url(db, current_user.id, new_public_url)
    except Exception:
        # If DB commit fails, clean up the newly uploaded object from storage
        new_safe_path = extract_safe_storage_path(
            logo_url=new_public_url,
            supabase_url=app_settings.SUPABASE_URL,
            bucket_name=app_settings.SUPABASE_STORAGE_BUCKET,
            authenticated_user_id=current_user.id,
        )
        if new_safe_path:
            delete_storage_object(new_safe_path)
        raise

    # 4. If an old logo exists, safely delete it from storage after successful commit
    if old_logo_url:
        old_safe_path = extract_safe_storage_path(
            logo_url=old_logo_url,
            supabase_url=app_settings.SUPABASE_URL,
            bucket_name=app_settings.SUPABASE_STORAGE_BUCKET,
            authenticated_user_id=current_user.id,
        )
        if old_safe_path:
            delete_storage_object(old_safe_path)

    return LogoUploadResponse(logo_url=new_public_url)


@router.delete("/logo", status_code=status.HTTP_204_NO_CONTENT)
def remove_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Idempotently removes the merchant's business logo.
    - If no logo exists: returns 204.
    - If logo exists: deletes storage object and sets logo_url to NULL in DB.
    """
    old_logo_url = clear_logo_url(db, current_user.id)
    if old_logo_url:
        safe_path = extract_safe_storage_path(
            logo_url=old_logo_url,
            supabase_url=app_settings.SUPABASE_URL,
            bucket_name=app_settings.SUPABASE_STORAGE_BUCKET,
            authenticated_user_id=current_user.id,
        )
        if safe_path:
            delete_storage_object(safe_path)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
