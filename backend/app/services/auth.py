from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.models.business_settings import BusinessSettings
from app.schemas.auth import UserRegisterRequest, UserLoginRequest
from app.core.security import hash_password, verify_password


def register_user(db: Session, request: UserRegisterRequest) -> User:
    """
    Registers a new user account:
    1. Normalizes email and checks uniqueness.
    2. Hashes password using bcrypt.
    3. Persists User record in PostgreSQL.
    4. Automatically provisions default BusinessSettings.
    """
    normalized_email = request.email.strip().lower()

    # Check for existing email (case-insensitive)
    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Hash the password securely
    hashed = hash_password(request.password)

    # Instantiate new User
    user = User(
        full_name=request.full_name,
        email=normalized_email,
        password_hash=hashed,
        is_active=True,
    )

    try:
        db.add(user)
        db.flush()  # Acquire user.id for foreign key relation

        # Provision default BusinessSettings
        business_settings = BusinessSettings(
            user_id=user.id,
            business_name=user.full_name,
            business_email=user.email,
            currency="INR",
            invoice_prefix="INV",
            default_tax_rate=Decimal("18.00"),
            default_payment_terms=14,
        )
        db.add(business_settings)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user account",
        )


def authenticate_user(db: Session, request: UserLoginRequest) -> User:
    """
    Authenticates a user via email and password:
    1. Locates user by normalized email.
    2. Verifies bcrypt password hash.
    3. Rejects inactive accounts.
    4. Returns verified User instance.
    """
    normalized_email = request.email.strip().lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    # Generic error if user not found or password mismatch
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check active status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user
