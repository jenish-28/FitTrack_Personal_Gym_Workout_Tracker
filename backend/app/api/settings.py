from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    UserSettings,
    PersonalRecord,
    Workout,
    WorkoutRoutine,
    Exercise,
)
from app.schemas.schemas import (
    UserSettingsOut,
    UserSettingsUpdate,
    UserOut,
    UserProfileUpdate,
    DeleteAccountRequest,
)
from app.core.security import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api", tags=["User Profile & Settings"])


@router.get("/settings", response_model=UserSettingsOut)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.settings:
        s = UserSettings(user_id=current_user.id, weight_unit="kg", theme="dark", weekly_goal=4)
        db.add(s)
        db.commit()
        db.refresh(s)
        return UserSettingsOut.model_validate(s)
    return UserSettingsOut.model_validate(current_user.settings)


@router.patch("/settings", response_model=UserSettingsOut)
def update_user_settings(
    payload: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = current_user.settings
    if not s:
        s = UserSettings(user_id=current_user.id, weight_unit="kg", theme="dark", weekly_goal=4)
        db.add(s)
        db.flush()

    if payload.weight_unit is not None:
        s.weight_unit = payload.weight_unit
    if payload.theme is not None:
        s.theme = payload.theme
    if payload.weekly_goal is not None:
        s.weekly_goal = payload.weekly_goal
    if payload.default_rest_seconds is not None:
        s.default_rest_seconds = payload.default_rest_seconds

    db.commit()
    db.refresh(s)
    return UserSettingsOut.model_validate(s)


@router.patch("/users/me", response_model=UserOut)
def update_user_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.email is not None:
        norm_email = payload.email.strip().lower()
        if norm_email != current_user.email.lower():
            exists = (
                db.query(User)
                .filter(func.lower(User.email) == norm_email, User.id != current_user.id)
                .first()
            )
            if exists:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="That email address is already in use.",
                )
            current_user.email = norm_email

    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    if payload.new_password:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required and must be valid to set a new password.",
            )
        current_user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_account(
    payload: Optional[DeleteAccountRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload and payload.password:
        if not verify_password(payload.password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password provided for account deletion.",
            )

    # Delete dependent records in order inside a transaction so RESTRICT on custom exercises never blocks account removal
    db.query(PersonalRecord).filter(PersonalRecord.user_id == current_user.id).delete(
        synchronize_session=False
    )
    user_workouts = db.query(Workout).filter(Workout.user_id == current_user.id).all()
    for w in user_workouts:
        db.delete(w)
    user_routines = db.query(WorkoutRoutine).filter(WorkoutRoutine.user_id == current_user.id).all()
    for r in user_routines:
        db.delete(r)
    db.flush()

    db.query(Exercise).filter(Exercise.user_id == current_user.id).delete(
        synchronize_session=False
    )
    db.delete(current_user)
    db.commit()
    return None
