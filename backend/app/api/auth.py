from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import User, UserSettings
from app.schemas.schemas import RegisterRequest, LoginRequest, AuthResponse, UserOut
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    check_auth_rate_limit,
)
from app.services.seed import seed_initial_data, ensure_demo_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    check_auth_rate_limit(request)
    seed_initial_data(db)

    normalized_email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    user_settings = UserSettings(
        user_id=user.id,
        weight_unit="kg",
        theme="dark",
        weekly_goal=4,
        default_rest_seconds=90,
    )
    db.add(user_settings)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    check_auth_rate_limit(request)
    seed_initial_data(db)

    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.settings:
        user_settings = UserSettings(user_id=user.id, weight_unit="kg", theme="dark", weekly_goal=4)
        db.add(user_settings)
        db.commit()
        db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/demo", response_model=AuthResponse)
def demo_login(
    request: Request,
    db: Session = Depends(get_db),
):
    check_auth_rate_limit(request)
    if not settings.ENABLE_DEMO_ACCOUNT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo account is disabled in this environment.",
        )
    user = ensure_demo_user(db)
    token = create_access_token(user_id=user.id, email=user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
