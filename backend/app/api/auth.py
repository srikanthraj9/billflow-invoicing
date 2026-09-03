from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)
from app.services.auth import register_user, authenticate_user
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(
    request: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Registers a new user account:
    - Normalizes email to lowercase and trims whitespace
    - Enforces password complexity (min 8 chars, at least 1 number or special char)
    - Hashes password with bcrypt
    - Initializes default BusinessSettings
    - Returns sanitized UserResponse (password_hash is never exposed)
    """
    user = register_user(db, request)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and issue JWT access token",
)
def login(
    request: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates user with email and password:
    - Normalizes email
    - Verifies password against stored bcrypt hash
    - Rejects inactive users with HTTP 403
    - Rejects invalid credentials with generic HTTP 401
    - Issues signed HS256 JWT access token valid for 60 minutes
    """
    user = authenticate_user(db, request)
    access_token = create_access_token(user.id)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Protected endpoint:
    - Requires Authorization: Bearer <token>
    - Returns current authenticated user record
    - Guarantees password_hash is never returned
    """
    return UserResponse.model_validate(current_user)
