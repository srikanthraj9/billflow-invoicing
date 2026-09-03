import logging
import uuid
from decimal import Decimal
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.business_settings import BusinessSettings
from app.models.user import User
from app.schemas.settings import SettingsUpdateRequest

logger = logging.getLogger("billflow.settings")


def get_or_create_settings(db: Session, user_id: uuid.UUID) -> BusinessSettings:
    """
    Retrieves the merchant's BusinessSettings.
    If no record exists, automatically and transactionally creates standard defaults
    using the User's name and email, matching Stage 2 registration behavior.
    """
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == user_id)
        .first()
    )
    if settings:
        return settings

    # Auto-initialize defaults safely
    user = db.query(User).filter(User.id == user_id).first()
    user_name = user.full_name if user and user.full_name else "My Business"
    user_email = user.email if user and user.email else ""

    settings = BusinessSettings(
        user_id=user_id,
        business_name=user_name,
        business_email=user_email,
        currency="INR",
        invoice_prefix="INV",
        default_tax_rate=Decimal("18.00"),
        default_payment_terms=14,
    )
    db.add(settings)
    try:
        db.commit()
        db.refresh(settings)
        return settings
    except IntegrityError:
        db.rollback()
        # In case of concurrent creation, query again
        settings = (
            db.query(BusinessSettings)
            .filter(BusinessSettings.user_id == user_id)
            .first()
        )
        if settings:
            return settings
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve or initialize settings",
        )
    except Exception as e:
        db.rollback()
        logger.error("Error creating business settings for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve or initialize settings",
        )


def update_settings(
    db: Session,
    user_id: uuid.UUID,
    data: SettingsUpdateRequest,
) -> BusinessSettings:
    """
    Updates the merchant's BusinessSettings with validated profile and preferences data.
    Logo updates are not permitted through this endpoint.
    """
    settings = get_or_create_settings(db, user_id)

    settings.business_name = data.business_name
    settings.business_email = data.business_email
    settings.business_phone = data.business_phone
    settings.business_address = data.business_address
    settings.currency = data.currency
    settings.invoice_prefix = data.invoice_prefix
    settings.default_tax_rate = data.default_tax_rate
    settings.default_payment_terms = data.default_payment_terms

    try:
        db.commit()
        db.refresh(settings)
        return settings
    except Exception as e:
        db.rollback()
        logger.error("Failed to update settings for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings",
        )


def update_logo_url(
    db: Session,
    user_id: uuid.UUID,
    new_logo_url: str,
) -> Tuple[BusinessSettings, Optional[str]]:
    """
    Updates the merchant's logo_url in BusinessSettings.
    Returns:
        tuple of (updated_settings: BusinessSettings, old_logo_url: Optional[str])
    """
    settings = get_or_create_settings(db, user_id)
    old_logo_url = settings.logo_url

    settings.logo_url = new_logo_url
    try:
        db.commit()
        db.refresh(settings)
        return settings, old_logo_url
    except Exception as e:
        db.rollback()
        logger.error("Failed to save logo URL for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save logo URL to settings",
        )


def clear_logo_url(
    db: Session,
    user_id: uuid.UUID,
) -> Optional[str]:
    """
    Clears the merchant's logo_url in BusinessSettings (sets to None).
    Returns:
        old_logo_url: Optional[str] (the previous URL to be deleted from storage)
    """
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == user_id)
        .first()
    )
    if not settings or not settings.logo_url:
        return None

    old_logo_url = settings.logo_url
    settings.logo_url = None

    try:
        db.commit()
        db.refresh(settings)
        return old_logo_url
    except Exception as e:
        db.rollback()
        logger.error("Failed to clear logo URL for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove logo from settings",
        )
