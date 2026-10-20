from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    User,
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutRoutine,
    RoutineExercise,
    Exercise,
    PersonalRecord,
)
from app.schemas.schemas import (
    WorkoutStartRequest,
    WorkoutSyncRequest,
    WorkoutOut,
    WorkoutExerciseOut,
    WorkoutSetOut,
    WorkoutSetInput,
    WorkoutSetUpdate,
    PreviousSetOut,
    PersonalRecordOut,
)
from app.core.security import get_current_user
from app.services.workout_service import (
    calculate_set_volume_kg,
    evaluate_and_record_prs_for_workout,
)

router = APIRouter(prefix="/api", tags=["Workouts & Sets"])


def _get_previous_sets_map(
    db: Session, user_id: int, exercise_ids: List[int], exclude_workout_id: Optional[int] = None
) -> Dict[int, List[PreviousSetOut]]:
    result: Dict[int, List[PreviousSetOut]] = {}
    if not exercise_ids:
        return result

    for ex_id in set(exercise_ids):
        q = (
            db.query(WorkoutExercise)
            .join(Workout, WorkoutExercise.workout_id == Workout.id)
            .options(joinedload(WorkoutExercise.sets))
            .filter(
                Workout.user_id == user_id,
                Workout.status == "completed",
                WorkoutExercise.exercise_id == ex_id,
            )
        )
        if exclude_workout_id is not None:
            q = q.filter(Workout.id != exclude_workout_id)

        last_we = q.order_by(Workout.completed_at.desc(), Workout.id.desc()).first()
        if last_we:
            completed_sets = [s for s in last_we.sets if s.is_completed]
            result[ex_id] = [
                PreviousSetOut(
                    set_number=s.set_number,
                    weight_kg=s.weight_kg,
                    reps=s.reps,
                    duration_seconds=s.duration_seconds,
                    distance_meters=s.distance_meters,
                    achieved_at=s.completed_at,
                )
                for s in completed_sets
            ]
        else:
            result[ex_id] = []
    return result


def _serialize_workout(
    db: Session, workout: Workout, new_records: Optional[List[PersonalRecord]] = None
) -> WorkoutOut:
    ex_ids = [we.exercise_id for we in workout.exercises]
    prev_map = _get_previous_sets_map(db, workout.user_id, ex_ids, exclude_workout_id=workout.id)

    completed_sets_count = 0
    completed_exercises_count = 0
    pr_count = 0
    we_outs: List[WorkoutExerciseOut] = []

    for we in sorted(workout.exercises, key=lambda x: x.order_index):
        sorted_sets = sorted(we.sets, key=lambda s: s.set_number)
        ex_completed_sets = [s for s in sorted_sets if s.is_completed]
        if ex_completed_sets:
            completed_exercises_count += 1
        completed_sets_count += len(ex_completed_sets)
        pr_count += sum(1 for s in sorted_sets if s.is_pr)

        we_outs.append(
            WorkoutExerciseOut(
                id=we.id,
                workout_id=we.workout_id,
                exercise_id=we.exercise_id,
                exercise_name_snapshot=we.exercise_name_snapshot,
                tracking_type_snapshot=we.tracking_type_snapshot,
                primary_muscle_snapshot=we.primary_muscle_snapshot,
                equipment_snapshot=we.equipment_snapshot,
                order_index=we.order_index,
                rest_seconds=we.rest_seconds,
                notes=we.notes,
                sets=[WorkoutSetOut.model_validate(s) for s in sorted_sets],
                previous_sets=prev_map.get(we.exercise_id, []),
            )
        )

    records_to_serialize = new_records if new_records is not None else workout.personal_records
    ex_lookup: Dict[int, Exercise] = {}
    if records_to_serialize:
        rec_ex_ids = list({r.exercise_id for r in records_to_serialize})
        for e in db.query(Exercise).filter(Exercise.id.in_(rec_ex_ids)).all():
            ex_lookup[e.id] = e

    pr_outs: List[PersonalRecordOut] = []
    for pr in records_to_serialize:
        ex_obj = ex_lookup.get(pr.exercise_id)
        pr_outs.append(
            PersonalRecordOut(
                id=pr.id,
                user_id=pr.user_id,
                exercise_id=pr.exercise_id,
                exercise_name=ex_obj.name if ex_obj else "Exercise",
                primary_muscle=ex_obj.primary_muscle if ex_obj else "Full Body",
                workout_id=pr.workout_id,
                workout_set_id=pr.workout_set_id,
                record_type=pr.record_type,
                value=pr.value,
                weight_kg=pr.weight_kg,
                reps=pr.reps,
                previous_value=pr.previous_value,
                achieved_at=pr.achieved_at,
            )
        )

    return WorkoutOut(
        id=workout.id,
        user_id=workout.user_id,
        routine_id=workout.routine_id,
        name=workout.name,
        status=workout.status,
        started_at=workout.started_at,
        completed_at=workout.completed_at,
        duration_seconds=workout.duration_seconds,
        notes=workout.notes,
        total_volume_kg=round(workout.total_volume_kg or 0.0, 2),
        completed_sets_count=completed_sets_count,
        completed_exercises_count=completed_exercises_count,
        pr_count=max(pr_count, len(pr_outs)),
        exercises=we_outs,
        new_records=pr_outs,
    )


def _apply_workout_sync_payload(
    db: Session, workout: Workout, payload: WorkoutSyncRequest, current_user: User
) -> None:
    if payload.name is not None and payload.name.strip():
        workout.name = payload.name.strip()
    if payload.notes is not None:
        workout.notes = payload.notes
    if payload.duration_seconds is not None:
        workout.duration_seconds = max(0, int(payload.duration_seconds))
    if payload.started_at is not None:
        workout.started_at = payload.started_at

    # Replace exercises & sets inside the current transaction
    db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout.id).delete(
        synchronize_session=False
    )
    db.flush()

    total_vol = 0.0
    now = datetime.now(timezone.utc)

    for idx, ex_in in enumerate(payload.exercises):
        ex_obj = db.query(Exercise).filter(Exercise.id == ex_in.exercise_id).first()
        if not ex_obj or (not ex_obj.is_system and ex_obj.user_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercise ID {ex_in.exercise_id} not found or not owned by user.",
            )

        we = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=ex_obj.id,
            exercise_name_snapshot=ex_obj.name,
            tracking_type_snapshot=ex_obj.tracking_type,
            primary_muscle_snapshot=ex_obj.primary_muscle,
            equipment_snapshot=ex_obj.equipment,
            order_index=idx,
            rest_seconds=ex_in.rest_seconds,
            notes=ex_in.notes,
        )
        db.add(we)
        db.flush()

        for s_idx, s_in in enumerate(ex_in.sets, start=1):
            ws = WorkoutSet(
                workout_exercise_id=we.id,
                set_number=s_idx,
                set_type=s_in.set_type,
                weight_kg=s_in.weight_kg,
                reps=s_in.reps,
                duration_seconds=s_in.duration_seconds,
                distance_meters=s_in.distance_meters,
                is_completed=s_in.is_completed,
                completed_at=now if s_in.is_completed else None,
            )
            db.add(ws)
            total_vol += calculate_set_volume_kg(
                ex_obj.tracking_type,
                s_in.set_type,
                s_in.is_completed,
                s_in.weight_kg,
                s_in.reps,
            )

    workout.total_volume_kg = round(total_vol, 2)
    db.flush()


@router.get("/workouts/active", response_model=Optional[WorkoutOut])
def get_active_workout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "in_progress",
        )
        .order_by(Workout.started_at.desc())
        .first()
    )
    if not workout:
        return None
    return _serialize_workout(db, workout)


@router.post("/workouts", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def start_workout(
    payload: WorkoutStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if there is already an in-progress workout; if no routine_id specified, return it or replace if routine requested
    existing_active = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "in_progress",
        )
        .order_by(Workout.started_at.desc())
        .first()
    )
    if existing_active and payload.routine_id is None and not payload.name:
        return _serialize_workout(db, existing_active)

    if existing_active:
        existing_active.status = "cancelled"
        db.flush()

    routine: Optional[WorkoutRoutine] = None
    if payload.routine_id is not None:
        routine = (
            db.query(WorkoutRoutine)
            .options(joinedload(WorkoutRoutine.exercises).joinedload(RoutineExercise.exercise))
            .filter(WorkoutRoutine.id == payload.routine_id)
            .first()
        )
        if not routine or (not routine.is_template and routine.user_id != current_user.id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found.")

    default_name = (
        payload.name.strip()
        if payload.name and payload.name.strip()
        else (routine.name if routine else "Strength Session")
    )

    workout = Workout(
        user_id=current_user.id,
        routine_id=routine.id if routine else None,
        name=default_name,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
        duration_seconds=0,
        total_volume_kg=0.0,
    )
    db.add(workout)
    db.flush()

    if routine:
        ex_ids = [re.exercise_id for re in routine.exercises]
        prev_map = _get_previous_sets_map(db, current_user.id, ex_ids)

        for idx, re_item in enumerate(sorted(routine.exercises, key=lambda x: x.order_index)):
            ex_obj = re_item.exercise
            if not ex_obj or ex_obj.is_archived:
                continue
            we = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=ex_obj.id,
                exercise_name_snapshot=ex_obj.name,
                tracking_type_snapshot=ex_obj.tracking_type,
                primary_muscle_snapshot=ex_obj.primary_muscle,
                equipment_snapshot=ex_obj.equipment,
                order_index=idx,
                rest_seconds=re_item.rest_seconds or 90,
                notes=re_item.notes,
            )
            db.add(we)
            db.flush()

            prev_sets = prev_map.get(ex_obj.id, [])
            for s_num in range(1, max(1, re_item.target_sets) + 1):
                prev_for_num = next((ps for ps in prev_sets if ps.set_number == s_num), None)
                w_val = (
                    re_item.target_weight_kg
                    if re_item.target_weight_kg is not None
                    else (prev_for_num.weight_kg if prev_for_num else None)
                )
                r_val = (
                    re_item.target_reps
                    if re_item.target_reps is not None
                    else (prev_for_num.reps if prev_for_num else 10)
                )
                ws = WorkoutSet(
                    workout_exercise_id=we.id,
                    set_number=s_num,
                    set_type="working",
                    weight_kg=w_val if ex_obj.tracking_type == "weight_reps" else None,
                    reps=r_val if ex_obj.tracking_type in ("weight_reps", "reps_only") else None,
                    duration_seconds=(
                        re_item.target_duration_seconds or 60
                        if ex_obj.tracking_type == "duration"
                        else None
                    ),
                    distance_meters=(
                        re_item.target_distance_meters or 500.0
                        if ex_obj.tracking_type == "distance"
                        else None
                    ),
                    is_completed=False,
                )
                db.add(ws)

    db.commit()
    db.refresh(workout)
    return _serialize_workout(db, workout)


@router.get("/workouts/previous/{exercise_id}", response_model=List[PreviousSetOut])
def get_previous_sets_for_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prev_map = _get_previous_sets_map(db, current_user.id, [exercise_id])
    return prev_map.get(exercise_id, [])


@router.get("/workouts", response_model=List[WorkoutOut])
def list_workout_history(
    search: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    muscle: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Workout)
        .options(
            joinedload(Workout.exercises).joinedload(WorkoutExercise.sets),
            joinedload(Workout.personal_records),
        )
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "completed",
        )
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        q = q.filter(func.lower(Workout.name).like(term))

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            q = q.filter(Workout.completed_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
            q = q.filter(Workout.completed_at <= dt_to)
        except ValueError:
            pass

    workouts = (
        q.order_by(Workout.completed_at.desc(), Workout.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if muscle and muscle.strip() and muscle.lower() != "all":
        target_m = muscle.strip().lower()
        workouts = [
            w
            for w in workouts
            if any((we.primary_muscle_snapshot or "").lower() == target_m for we in w.exercises)
        ]

    return [_serialize_workout(db, w) for w in workouts]


@router.get("/workouts/{workout_id}", response_model=WorkoutOut)
def get_workout_detail(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = (
        db.query(Workout)
        .options(
            joinedload(Workout.exercises).joinedload(WorkoutExercise.sets),
            joinedload(Workout.personal_records),
        )
        .filter(Workout.id == workout_id)
        .first()
    )
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")
    return _serialize_workout(db, workout)


@router.put("/workouts/{workout_id}", response_model=WorkoutOut)
def sync_or_edit_workout(
    workout_id: int,
    payload: WorkoutSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))
        .filter(Workout.id == workout_id)
        .first()
    )
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")

    _apply_workout_sync_payload(db, workout, payload, current_user)
    db.refresh(workout)

    new_prs: List[PersonalRecord] = []
    if workout.status == "completed":
        new_prs = evaluate_and_record_prs_for_workout(db, workout)

    db.commit()
    db.refresh(workout)
    return _serialize_workout(db, workout, new_records=new_prs)


@router.post("/workouts/{workout_id}/finish", response_model=WorkoutOut)
def finish_workout(
    workout_id: int,
    payload: WorkoutSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = (
        db.query(Workout)
        .options(
            joinedload(Workout.exercises).joinedload(WorkoutExercise.sets),
            joinedload(Workout.personal_records),
        )
        .filter(Workout.id == workout_id)
        .first()
    )
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")

    # Prevent duplicate workout completion submissions
    if workout.status == "completed":
        return _serialize_workout(db, workout)

    _apply_workout_sync_payload(db, workout, payload, current_user)

    now = datetime.now(timezone.utc)
    workout.status = "completed"
    workout.completed_at = now
    if payload.duration_seconds is not None and payload.duration_seconds > 0:
        workout.duration_seconds = int(payload.duration_seconds)
    else:
        started = workout.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        workout.duration_seconds = max(60, int((now - started).total_seconds()))

    db.flush()
    db.refresh(workout)

    new_prs = evaluate_and_record_prs_for_workout(db, workout)
    db.commit()
    db.refresh(workout)
    return _serialize_workout(db, workout, new_records=new_prs)


@router.post("/workouts/{workout_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")
    db.delete(workout)
    db.commit()
    return None


@router.delete("/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")
    db.delete(workout)
    db.commit()
    return None


# Granular Set Endpoints
@router.post(
    "/workouts/{workout_id}/exercises/{workout_exercise_id}/sets",
    response_model=WorkoutSetOut,
    status_code=status.HTTP_201_CREATED,
)
def create_set(
    workout_id: int,
    workout_exercise_id: int,
    payload: WorkoutSetInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found.")

    we = (
        db.query(WorkoutExercise)
        .filter(
            WorkoutExercise.id == workout_exercise_id,
            WorkoutExercise.workout_id == workout.id,
        )
        .first()
    )
    if not we:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout exercise not found.")

    new_set = WorkoutSet(
        workout_exercise_id=we.id,
        set_number=payload.set_number,
        set_type=payload.set_type,
        weight_kg=payload.weight_kg,
        reps=payload.reps,
        duration_seconds=payload.duration_seconds,
        distance_meters=payload.distance_meters,
        is_completed=payload.is_completed,
        completed_at=datetime.now(timezone.utc) if payload.is_completed else None,
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    return WorkoutSetOut.model_validate(new_set)


@router.patch("/sets/{set_id}", response_model=WorkoutSetOut)
def update_set(
    set_id: int,
    payload: WorkoutSetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = (
        db.query(WorkoutSet)
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .filter(WorkoutSet.id == set_id, Workout.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")

    if payload.set_number is not None:
        ws.set_number = payload.set_number
    if payload.set_type is not None:
        ws.set_type = payload.set_type
    if payload.weight_kg is not None:
        ws.weight_kg = payload.weight_kg
    if payload.reps is not None:
        ws.reps = payload.reps
    if payload.duration_seconds is not None:
        ws.duration_seconds = payload.duration_seconds
    if payload.distance_meters is not None:
        ws.distance_meters = payload.distance_meters
    if payload.is_completed is not None:
        ws.is_completed = payload.is_completed
        ws.completed_at = datetime.now(timezone.utc) if payload.is_completed else None

    db.commit()
    db.refresh(ws)
    return WorkoutSetOut.model_validate(ws)


@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = (
        db.query(WorkoutSet)
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .filter(WorkoutSet.id == set_id, Workout.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
    db.delete(ws)
    db.commit()
    return None
