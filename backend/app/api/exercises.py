from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Exercise,
    ExerciseFavorite,
    WorkoutExercise,
    RoutineExercise,
    WorkoutRoutine,
    PersonalRecord,
)
from app.schemas.schemas import (
    ExerciseCreate,
    ExerciseUpdate,
    ExerciseOut,
    ExerciseDeleteOut,
)
from app.core.security import get_current_user
from app.services.seed import seed_initial_data

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])


def _enrich_exercises(db: Session, exercises: List[Exercise], user_id: int) -> List[ExerciseOut]:
    if not exercises:
        return []
    ex_ids = [e.id for e in exercises]

    fav_ids = {
        row[0]
        for row in db.query(ExerciseFavorite.exercise_id)
        .filter(
            ExerciseFavorite.user_id == user_id,
            ExerciseFavorite.exercise_id.in_(ex_ids),
        )
        .all()
    }

    usage_rows = (
        db.query(WorkoutExercise.exercise_id, func.count(WorkoutExercise.id))
        .filter(WorkoutExercise.exercise_id.in_(ex_ids))
        .group_by(WorkoutExercise.exercise_id)
        .all()
    )
    usage_map = {ex_id: cnt for ex_id, cnt in usage_rows}

    routine_rows = (
        db.query(RoutineExercise.exercise_id, func.count(RoutineExercise.id))
        .join(WorkoutRoutine, RoutineExercise.routine_id == WorkoutRoutine.id)
        .filter(
            RoutineExercise.exercise_id.in_(ex_ids),
            WorkoutRoutine.user_id == user_id,
        )
        .group_by(RoutineExercise.exercise_id)
        .all()
    )
    routine_map = {ex_id: cnt for ex_id, cnt in routine_rows}

    results: List[ExerciseOut] = []
    for e in exercises:
        out = ExerciseOut.model_validate(e)
        out.is_favorite = e.id in fav_ids
        out.usage_count = int(usage_map.get(e.id, 0))
        out.routine_count = int(routine_map.get(e.id, 0))
        results.append(out)
    return results


@router.get("", response_model=List[ExerciseOut])
def list_exercises(
    search: Optional[str] = Query(default=None),
    muscle: Optional[str] = Query(default=None),
    equipment: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    tracking_type: Optional[str] = Query(default=None),
    custom_only: bool = Query(default=False),
    include_archived: bool = Query(default=False),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seed_initial_data(db)

    query = db.query(Exercise).filter(
        or_(Exercise.is_system == True, Exercise.user_id == current_user.id)  # noqa: E712
    )

    if not include_archived:
        query = query.filter(Exercise.is_archived == False)  # noqa: E712

    if custom_only:
        query = query.filter(Exercise.user_id == current_user.id, Exercise.is_system == False)  # noqa: E712

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Exercise.name).like(term),
                func.lower(Exercise.primary_muscle).like(term),
                func.lower(Exercise.equipment).like(term),
            )
        )

    if muscle and muscle.strip() and muscle.lower() != "all":
        query = query.filter(func.lower(Exercise.primary_muscle) == muscle.strip().lower())

    if equipment and equipment.strip() and equipment.lower() != "all":
        query = query.filter(func.lower(Exercise.equipment) == equipment.strip().lower())

    if category and category.strip() and category.lower() != "all":
        query = query.filter(func.lower(Exercise.category) == category.strip().lower())

    if tracking_type and tracking_type.strip() and tracking_type.lower() != "all":
        query = query.filter(Exercise.tracking_type == tracking_type.strip())

    exercises = (
        query.order_by(Exercise.is_system.asc(), Exercise.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return _enrich_exercises(db, exercises, current_user.id)


@router.post("", response_model=ExerciseOut, status_code=status.HTTP_201_CREATED)
def create_custom_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cleaned_name = payload.name.strip()

    # Check duplicate against this user's custom exercises or system exercises
    duplicate = (
        db.query(Exercise)
        .filter(
            func.lower(Exercise.name) == cleaned_name.lower(),
            or_(
                Exercise.is_system == True,  # noqa: E712
                Exercise.user_id == current_user.id,
            ),
            Exercise.is_archived == False,  # noqa: E712
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An exercise named '{cleaned_name}' already exists in your library.",
        )

    # Check if user previously had an archived custom exercise with the exact same name; if so, unarchive & update it
    archived_match = (
        db.query(Exercise)
        .filter(
            func.lower(Exercise.name) == cleaned_name.lower(),
            Exercise.user_id == current_user.id,
            Exercise.is_archived == True,  # noqa: E712
        )
        .first()
    )
    if archived_match:
        archived_match.name = cleaned_name
        archived_match.primary_muscle = payload.primary_muscle.strip()
        archived_match.secondary_muscles = payload.secondary_muscles
        archived_match.equipment = payload.equipment.strip()
        archived_match.category = payload.category.strip()
        archived_match.tracking_type = payload.tracking_type
        archived_match.instructions = payload.instructions
        archived_match.media_url = payload.media_url
        archived_match.is_archived = False
        db.commit()
        db.refresh(archived_match)
        return _enrich_exercises(db, [archived_match], current_user.id)[0]

    make_system = bool(payload.is_system and current_user.is_admin)
    new_ex = Exercise(
        user_id=None if make_system else current_user.id,
        name=cleaned_name,
        primary_muscle=payload.primary_muscle.strip(),
        secondary_muscles=payload.secondary_muscles,
        equipment=payload.equipment.strip(),
        category=payload.category.strip(),
        tracking_type=payload.tracking_type,
        instructions=payload.instructions,
        media_url=payload.media_url,
        is_system=make_system,
        is_archived=False,
    )
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return _enrich_exercises(db, [new_ex], current_user.id)[0]


@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise_detail(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if not ex.is_system and ex.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view another user's private custom exercise.",
        )

    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_custom_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System exercises are protected and cannot be modified.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own custom exercises.",
        )

    if payload.name is not None:
        cleaned_name = payload.name.strip()
        conflict = (
            db.query(Exercise)
            .filter(
                Exercise.id != ex.id,
                func.lower(Exercise.name) == cleaned_name.lower(),
                or_(
                    Exercise.is_system == True,  # noqa: E712
                    Exercise.user_id == current_user.id,
                ),
                Exercise.is_archived == False,  # noqa: E712
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An exercise named '{cleaned_name}' already exists.",
            )
        ex.name = cleaned_name

    if payload.primary_muscle is not None:
        ex.primary_muscle = payload.primary_muscle.strip()
    if payload.secondary_muscles is not None:
        ex.secondary_muscles = payload.secondary_muscles
    if payload.equipment is not None:
        ex.equipment = payload.equipment.strip()
    if payload.category is not None:
        ex.category = payload.category.strip()
    if payload.tracking_type is not None:
        ex.tracking_type = payload.tracking_type
    if payload.instructions is not None:
        ex.instructions = payload.instructions
    if payload.media_url is not None:
        ex.media_url = payload.media_url

    db.commit()
    db.refresh(ex)
    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.delete("/{exercise_id}", response_model=ExerciseDeleteOut)
def delete_or_archive_custom_exercise(
    exercise_id: int,
    remove_from_routines: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Built-in system exercises cannot be deleted.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own custom exercises.",
        )

    # Check if used in routines
    routine_q = db.query(RoutineExercise).join(
        WorkoutRoutine, RoutineExercise.routine_id == WorkoutRoutine.id
    ).filter(RoutineExercise.exercise_id == ex.id)
    if not current_user.is_admin:
        routine_q = routine_q.filter(WorkoutRoutine.user_id == current_user.id)
    routine_links = routine_q.all()
    removed_routines_count = 0
    if routine_links and remove_from_routines:
        for rl in routine_links:
            db.delete(rl)
            removed_routines_count += 1
        db.flush()

    remaining_routine_refs = (
        db.query(RoutineExercise).filter(RoutineExercise.exercise_id == ex.id).count()
    )
    workout_refs = (
        db.query(WorkoutExercise).filter(WorkoutExercise.exercise_id == ex.id).count()
    )
    pr_refs = (
        db.query(PersonalRecord).filter(PersonalRecord.exercise_id == ex.id).count()
    )

    if workout_refs > 0 or pr_refs > 0 or remaining_routine_refs > 0:
        ex.is_archived = True
        db.commit()
        return ExerciseDeleteOut(
            action="archived",
            message=(
                f"'{ex.name}' is referenced by historical workout data and has been safely archived. "
                "Your workout history and statistics remain intact."
            ),
            removed_from_routines=removed_routines_count,
            exercise_id=ex.id,
        )

    ex_id = ex.id
    ex_name = ex.name
    db.delete(ex)
    db.commit()
    return ExerciseDeleteOut(
        action="deleted",
        message=f"Custom exercise '{ex_name}' has been permanently deleted.",
        removed_from_routines=removed_routines_count,
        exercise_id=ex_id,
    )


@router.post("/{exercise_id}/favorite")
def toggle_favorite_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex or (not ex.is_system and ex.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    existing = (
        db.query(ExerciseFavorite)
        .filter(
            ExerciseFavorite.user_id == current_user.id,
            ExerciseFavorite.exercise_id == exercise_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"is_favorite": False}
    else:
        fav = ExerciseFavorite(user_id=current_user.id, exercise_id=exercise_id)
        db.add(fav)
        db.commit()
        return {"is_favorite": True}
