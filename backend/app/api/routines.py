from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, WorkoutRoutine, RoutineExercise, Exercise
from app.schemas.schemas import RoutineCreate, RoutineUpdate, RoutineOut
from app.core.security import get_current_user
from app.services.seed import seed_initial_data

router = APIRouter(prefix="/api/routines", tags=["Routines"])


def _validate_exercise_ownership(db: Session, exercise_id: int, user_id: int) -> Exercise:
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex or (not ex.is_system and ex.user_id != user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise ID {exercise_id} not found or not accessible.",
        )
    return ex


@router.get("", response_model=List[RoutineOut])
def list_routines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seed_initial_data(db)
    routines = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
        .filter(
            or_(
                WorkoutRoutine.user_id == current_user.id,
                WorkoutRoutine.is_template == True,  # noqa: E712
            )
        )
        .order_by(WorkoutRoutine.is_template.asc(), WorkoutRoutine.updated_at.desc())
        .all()
    )
    return [RoutineOut.model_validate(r) for r in routines]


@router.post("", response_model=RoutineOut, status_code=status.HTTP_201_CREATED)
def create_routine(
    payload: RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = WorkoutRoutine(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description,
        is_template=False,
    )
    db.add(routine)
    db.flush()

    for idx, item in enumerate(payload.exercises):
        _validate_exercise_ownership(db, item.exercise_id, current_user.id)
        re_obj = RoutineExercise(
            routine_id=routine.id,
            exercise_id=item.exercise_id,
            order_index=idx,
            target_sets=item.target_sets,
            target_reps=item.target_reps,
            target_weight_kg=item.target_weight_kg,
            target_duration_seconds=item.target_duration_seconds,
            target_distance_meters=item.target_distance_meters,
            rest_seconds=item.rest_seconds,
            notes=item.notes,
        )
        db.add(re_obj)

    db.commit()
    created = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
        .filter(WorkoutRoutine.id == routine.id)
        .first()
    )
    return RoutineOut.model_validate(created)


@router.get("/{routine_id}", response_model=RoutineOut)
def get_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
        .filter(WorkoutRoutine.id == routine_id)
        .first()
    )
    if not routine or (not routine.is_template and routine.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")
    return RoutineOut.model_validate(routine)


@router.patch("/{routine_id}", response_model=RoutineOut)
def update_routine(
    routine_id: int,
    payload: RoutineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = db.query(WorkoutRoutine).filter(WorkoutRoutine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")
    if routine.is_template or routine.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own custom routines. Duplicate a starter template to customize it.",
        )

    if payload.name is not None:
        routine.name = payload.name.strip()
    if payload.description is not None:
        routine.description = payload.description

    if payload.exercises is not None:
        db.query(RoutineExercise).filter(RoutineExercise.routine_id == routine.id).delete(
            synchronize_session=False
        )
        db.flush()
        for idx, item in enumerate(payload.exercises):
            _validate_exercise_ownership(db, item.exercise_id, current_user.id)
            re_obj = RoutineExercise(
                routine_id=routine.id,
                exercise_id=item.exercise_id,
                order_index=idx,
                target_sets=item.target_sets,
                target_reps=item.target_reps,
                target_weight_kg=item.target_weight_kg,
                target_duration_seconds=item.target_duration_seconds,
                target_distance_meters=item.target_distance_meters,
                rest_seconds=item.rest_seconds,
                notes=item.notes,
            )
            db.add(re_obj)

    db.commit()
    updated = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
        .filter(WorkoutRoutine.id == routine.id)
        .first()
    )
    return RoutineOut.model_validate(updated)


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = db.query(WorkoutRoutine).filter(WorkoutRoutine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")
    if routine.is_template or routine.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own custom routines.",
        )
    db.delete(routine)
    db.commit()
    return None


@router.post("/{routine_id}/duplicate", response_model=RoutineOut, status_code=status.HTTP_201_CREATED)
def duplicate_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises))
        .filter(WorkoutRoutine.id == routine_id)
        .first()
    )
    if not source or (not source.is_template and source.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")

    copy_name = f"{source.name} (Custom)" if source.is_template else f"{source.name} (Copy)"
    new_routine = WorkoutRoutine(
        user_id=current_user.id,
        name=copy_name,
        description=source.description,
        is_template=False,
    )
    db.add(new_routine)
    db.flush()

    for item in source.exercises:
        re_obj = RoutineExercise(
            routine_id=new_routine.id,
            exercise_id=item.exercise_id,
            order_index=item.order_index,
            target_sets=item.target_sets,
            target_reps=item.target_reps,
            target_weight_kg=item.target_weight_kg,
            target_duration_seconds=item.target_duration_seconds,
            target_distance_meters=item.target_distance_meters,
            rest_seconds=item.rest_seconds,
            notes=item.notes,
        )
        db.add(re_obj)

    db.commit()
    duplicated = (
        db.query(WorkoutRoutine)
        .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
        .filter(WorkoutRoutine.id == new_routine.id)
        .first()
    )
    return RoutineOut.model_validate(duplicated)
