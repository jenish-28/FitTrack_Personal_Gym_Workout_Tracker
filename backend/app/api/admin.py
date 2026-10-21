from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutRoutine,
    Exercise,
    PersonalRecord,
)
from app.schemas.schemas import (
    AdminPlatformStatsOut,
    AdminUserSummaryOut,
    AdminRoleUpdateRequest,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])


def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges are required to access this resource.",
        )
    return current_user


@router.get("/overview", response_model=AdminPlatformStatsOut)
def get_admin_platform_overview(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    users = db.query(User).order_by(User.id.asc()).all()

    completed_workouts = (
        db.query(Workout)
        .filter(Workout.status == "completed")
        .all()
    )
    total_completed_workouts = len(completed_workouts)
    total_volume_kg = round(sum(w.total_volume_kg or 0.0 for w in completed_workouts), 2)

    total_sets_logged = (
        db.query(func.count(WorkoutSet.id))
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .filter(Workout.status == "completed", WorkoutSet.is_completed == True)  # noqa: E712
        .scalar()
        or 0
    )

    system_exercises_count = (
        db.query(func.count(Exercise.id))
        .filter(Exercise.is_system == True, Exercise.is_archived == False)  # noqa: E712
        .scalar()
        or 0
    )
    custom_exercises_count = (
        db.query(func.count(Exercise.id))
        .filter(Exercise.is_system == False, Exercise.is_archived == False)  # noqa: E712
        .scalar()
        or 0
    )

    template_routines_count = (
        db.query(func.count(WorkoutRoutine.id))
        .filter(WorkoutRoutine.is_template == True)  # noqa: E712
        .scalar()
        or 0
    )
    custom_routines_count = (
        db.query(func.count(WorkoutRoutine.id))
        .filter(WorkoutRoutine.is_template == False)  # noqa: E712
        .scalar()
        or 0
    )

    # Per-user aggregations
    user_workouts_map = {u.id: {"count": 0, "vol": 0.0} for u in users}
    for w in completed_workouts:
        if w.user_id in user_workouts_map:
            user_workouts_map[w.user_id]["count"] += 1
            user_workouts_map[w.user_id]["vol"] += w.total_volume_kg or 0.0

    routine_counts = dict(
        db.query(WorkoutRoutine.user_id, func.count(WorkoutRoutine.id))
        .filter(WorkoutRoutine.is_template == False)  # noqa: E712
        .group_by(WorkoutRoutine.user_id)
        .all()
    )
    custom_ex_counts = dict(
        db.query(Exercise.user_id, func.count(Exercise.id))
        .filter(Exercise.is_system == False, Exercise.is_archived == False)  # noqa: E712
        .group_by(Exercise.user_id)
        .all()
    )
    pr_counts = dict(
        db.query(PersonalRecord.user_id, func.count(PersonalRecord.id))
        .group_by(PersonalRecord.user_id)
        .all()
    )

    user_summaries: List[AdminUserSummaryOut] = []
    for u in users:
        w_stat = user_workouts_map.get(u.id, {"count": 0, "vol": 0.0})
        user_summaries.append(
            AdminUserSummaryOut(
                id=u.id,
                name=u.name,
                email=u.email,
                is_admin=bool(u.is_admin),
                created_at=u.created_at,
                workouts_completed=int(w_stat["count"]),
                total_volume_kg=round(float(w_stat["vol"]), 2),
                routines_count=int(routine_counts.get(u.id, 0)),
                custom_exercises_count=int(custom_ex_counts.get(u.id, 0)),
                prs_count=int(pr_counts.get(u.id, 0)),
            )
        )

    return AdminPlatformStatsOut(
        total_users=len(users),
        total_completed_workouts=total_completed_workouts,
        total_sets_logged=int(total_sets_logged),
        total_volume_kg=total_volume_kg,
        system_exercises_count=int(system_exercises_count),
        custom_exercises_count=int(custom_exercises_count),
        template_routines_count=int(template_routines_count),
        custom_routines_count=int(custom_routines_count),
        users=user_summaries,
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserSummaryOut)
def update_user_admin_role(
    user_id: int,
    payload: AdminRoleUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_user),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target.id == admin_user.id and not payload.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke your own administrator status.",
        )

    target.is_admin = payload.is_admin
    db.commit()
    db.refresh(target)

    w_list = (
        db.query(Workout)
        .filter(Workout.user_id == target.id, Workout.status == "completed")
        .all()
    )
    return AdminUserSummaryOut(
        id=target.id,
        name=target.name,
        email=target.email,
        is_admin=bool(target.is_admin),
        created_at=target.created_at,
        workouts_completed=len(w_list),
        total_volume_kg=round(sum(w.total_volume_kg or 0.0 for w in w_list), 2),
        routines_count=db.query(WorkoutRoutine).filter(WorkoutRoutine.user_id == target.id).count(),
        custom_exercises_count=db.query(Exercise).filter(Exercise.user_id == target.id).count(),
        prs_count=db.query(PersonalRecord).filter(PersonalRecord.user_id == target.id).count(),
    )
