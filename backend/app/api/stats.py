from datetime import datetime, timedelta, timezone, date
from typing import List, Optional, Dict, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
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
    ExerciseFavorite,
    PersonalRecord,
)
from app.schemas.schemas import (
    DashboardStatsOut,
    WeeklyActivityPointOut,
    FavoriteExerciseSummaryOut,
    PersonalRecordOut,
    RoutineOut,
    AnalyticsOverviewOut,
    FrequencyPointOut,
    MuscleDistributionPointOut,
    ExerciseProgressPointOut,
)
from app.core.security import get_current_user
from app.services.workout_service import calculate_epley_1rm, calculate_set_volume_kg
from app.api.workouts import _serialize_workout
from app.services.seed import seed_initial_data

router = APIRouter(prefix="/api", tags=["Analytics & Personal Records"])


def _compute_streaks(workout_dates: Set[date], today: date) -> tuple[int, int]:
    if not workout_dates:
        return 0, 0

    sorted_dates = sorted(workout_dates)
    longest = 1
    current_run = 1
    for i in range(1, len(sorted_dates)):
        diff = (sorted_dates[i] - sorted_dates[i - 1]).days
        if diff == 1:
            current_run += 1
            longest = max(longest, current_run)
        elif diff > 1:
            current_run = 1

    # Active streak: consecutive days ending today or yesterday
    active_streak = 0
    cursor = today if today in workout_dates else (today - timedelta(days=1))
    if cursor in workout_dates:
        while cursor in workout_dates:
            active_streak += 1
            cursor -= timedelta(days=1)

    return active_streak, max(longest, active_streak)


@router.get("/stats/dashboard", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seed_initial_data(db)

    completed_workouts = (
        db.query(Workout)
        .options(
            joinedload(Workout.exercises).joinedload(WorkoutExercise.sets),
            joinedload(Workout.personal_records),
        )
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "completed",
        )
        .order_by(Workout.completed_at.desc(), Workout.id.desc())
        .all()
    )

    now = datetime.now(timezone.utc)
    today = now.date()
    seven_days_ago_date = today - timedelta(days=6)

    total_workouts = len(completed_workouts)
    total_volume_kg = round(sum(w.total_volume_kg or 0.0 for w in completed_workouts), 2)

    workout_dates: Set[date] = set()
    weekly_workout_count = 0
    weekly_volume_kg = 0.0

    daily_buckets: Dict[date, Dict[str, float]] = {}
    for offset in range(6, -1, -1):
        d = today - timedelta(days=offset)
        daily_buckets[d] = {"workouts": 0, "volume_kg": 0.0, "duration_minutes": 0}

    for w in completed_workouts:
        w_dt = w.completed_at or w.started_at
        if w_dt.tzinfo is None:
            w_dt = w_dt.replace(tzinfo=timezone.utc)
        w_date = w_dt.date()
        workout_dates.add(w_date)

        if w_date >= seven_days_ago_date:
            weekly_workout_count += 1
            weekly_volume_kg += w.total_volume_kg or 0.0

        if w_date in daily_buckets:
            daily_buckets[w_date]["workouts"] += 1
            daily_buckets[w_date]["volume_kg"] += w.total_volume_kg or 0.0
            daily_buckets[w_date]["duration_minutes"] += round((w.duration_seconds or 0) / 60.0)

    current_streak, longest_streak = _compute_streaks(workout_dates, today)

    weekly_activity: List[WeeklyActivityPointOut] = []
    for d, metrics in daily_buckets.items():
        weekly_activity.append(
            WeeklyActivityPointOut(
                day=d.strftime("%a"),
                date=d.isoformat(),
                workouts=int(metrics["workouts"]),
                volume_kg=round(metrics["volume_kg"], 2),
                duration_minutes=int(metrics["duration_minutes"]),
            )
        )

    # Personal records
    prs = (
        db.query(PersonalRecord)
        .options(joinedload(PersonalRecord.exercise))
        .filter(PersonalRecord.user_id == current_user.id)
        .order_by(PersonalRecord.achieved_at.desc(), PersonalRecord.id.desc())
        .all()
    )
    pr_outs: List[PersonalRecordOut] = [
        PersonalRecordOut(
            id=pr.id,
            user_id=pr.user_id,
            exercise_id=pr.exercise_id,
            exercise_name=pr.exercise.name if pr.exercise else "Exercise",
            primary_muscle=pr.exercise.primary_muscle if pr.exercise else "Full Body",
            workout_id=pr.workout_id,
            workout_set_id=pr.workout_set_id,
            record_type=pr.record_type,
            value=pr.value,
            weight_kg=pr.weight_kg,
            reps=pr.reps,
            previous_value=pr.previous_value,
            achieved_at=pr.achieved_at,
        )
        for pr in prs[:10]
    ]

    # Favorite & most performed exercises
    fav_ids = [
        r[0]
        for r in db.query(ExerciseFavorite.exercise_id)
        .filter(ExerciseFavorite.user_id == current_user.id)
        .all()
    ]
    ex_stats: Dict[int, Dict[str, float]] = {}
    for w in completed_workouts:
        seen_in_workout: Set[int] = set()
        for we in w.exercises:
            entry = ex_stats.setdefault(
                we.exercise_id,
                {"times": 0, "best_weight": 0.0, "best_1rm": 0.0},
            )
            if we.exercise_id not in seen_in_workout:
                entry["times"] += 1
                seen_in_workout.add(we.exercise_id)
            for s in we.sets:
                if s.is_completed and s.set_type != "warmup":
                    if (s.weight_kg or 0) > entry["best_weight"]:
                        entry["best_weight"] = s.weight_kg or 0.0
                    e1rm = calculate_epley_1rm(s.weight_kg, s.reps)
                    if e1rm > entry["best_1rm"]:
                        entry["best_1rm"] = e1rm

    candidate_ex_ids = list(set(fav_ids) | set(ex_stats.keys()))
    fav_summaries: List[FavoriteExerciseSummaryOut] = []
    if candidate_ex_ids:
        ex_objs = db.query(Exercise).filter(Exercise.id.in_(candidate_ex_ids)).all()
        ex_by_id = {e.id: e for e in ex_objs}
        sorted_ids = sorted(
            candidate_ex_ids,
            key=lambda eid: (
                1 if eid in fav_ids else 0,
                ex_stats.get(eid, {}).get("times", 0),
            ),
            reverse=True,
        )
        for eid in sorted_ids[:6]:
            e_obj = ex_by_id.get(eid)
            if not e_obj:
                continue
            st = ex_stats.get(eid, {"times": 0, "best_weight": 0.0, "best_1rm": 0.0})
            fav_summaries.append(
                FavoriteExerciseSummaryOut(
                    exercise_id=e_obj.id,
                    name=e_obj.name,
                    primary_muscle=e_obj.primary_muscle,
                    equipment=e_obj.equipment,
                    tracking_type=e_obj.tracking_type,
                    times_performed=int(st["times"]),
                    best_weight_kg=round(st["best_weight"], 2) if st["best_weight"] > 0 else None,
                    best_1rm_kg=round(st["best_1rm"], 2) if st["best_1rm"] > 0 else None,
                )
            )

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
        .limit(8)
        .all()
    )

    active_w = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))
        .filter(Workout.user_id == current_user.id, Workout.status == "in_progress")
        .first()
    )

    return DashboardStatsOut(
        total_workouts=total_workouts,
        weekly_workout_count=weekly_workout_count,
        weekly_goal=current_user.settings.weekly_goal if current_user.settings else 4,
        total_volume_kg=total_volume_kg,
        weekly_volume_kg=round(weekly_volume_kg, 2),
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        total_prs=len(prs),
        weekly_activity=weekly_activity,
        recent_workouts=[_serialize_workout(db, w) for w in completed_workouts[:5]],
        personal_records=pr_outs,
        favorite_exercises=fav_summaries,
        saved_routines=[RoutineOut.model_validate(r) for r in routines],
        active_workout=_serialize_workout(db, active_w) if active_w else None,
    )


@router.get("/stats/analytics", response_model=AnalyticsOverviewOut)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    completed_workouts = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "completed",
        )
        .order_by(Workout.completed_at.asc(), Workout.id.asc())
        .all()
    )

    now = datetime.now(timezone.utc)
    today = now.date()

    workout_dates: Set[date] = set()
    total_sets_completed = 0
    total_volume_kg = 0.0
    muscle_sets: Dict[str, Dict[str, float]] = {}

    # Weekly buckets (last 8 weeks)
    start_of_this_week = today - timedelta(days=today.weekday())
    weekly_buckets: Dict[date, Dict[str, float]] = {}
    for w_idx in range(7, -1, -1):
        wk_start = start_of_this_week - timedelta(weeks=w_idx)
        weekly_buckets[wk_start] = {"workouts": 0, "volume_kg": 0.0, "sets": 0}

    # Monthly buckets (last 6 months)
    monthly_buckets: Dict[str, Dict[str, float]] = {}
    for m_idx in range(5, -1, -1):
        year = today.year
        month = today.month - m_idx
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year:04d}-{month:02d}"
        label = date(year, month, 1).strftime("%b %Y")
        monthly_buckets[key] = {"label": label, "workouts": 0, "volume_kg": 0.0, "sets": 0}

    thirty_days_ago = today - timedelta(days=29)
    active_days_30d: Set[date] = set()

    for w in completed_workouts:
        w_dt = w.completed_at or w.started_at
        if w_dt.tzinfo is None:
            w_dt = w_dt.replace(tzinfo=timezone.utc)
        w_date = w_dt.date()
        workout_dates.add(w_date)
        if w_date >= thirty_days_ago:
            active_days_30d.add(w_date)

        wk_start = w_date - timedelta(days=w_date.weekday())
        m_key = f"{w_date.year:04d}-{w_date.month:02d}"

        w_sets_cnt = 0
        for we in w.exercises:
            muscle_name = we.primary_muscle_snapshot or "Full Body"
            m_entry = muscle_sets.setdefault(muscle_name, {"sets": 0, "volume_kg": 0.0})
            for s in we.sets:
                if s.is_completed and s.set_type != "warmup":
                    w_sets_cnt += 1
                    total_sets_completed += 1
                    m_entry["sets"] += 1
                    vol = calculate_set_volume_kg(
                        we.tracking_type_snapshot,
                        s.set_type,
                        s.is_completed,
                        s.weight_kg,
                        s.reps,
                    )
                    m_entry["volume_kg"] += vol

        w_vol = w.total_volume_kg or 0.0
        total_volume_kg += w_vol

        if wk_start in weekly_buckets:
            weekly_buckets[wk_start]["workouts"] += 1
            weekly_buckets[wk_start]["volume_kg"] += w_vol
            weekly_buckets[wk_start]["sets"] += w_sets_cnt

        if m_key in monthly_buckets:
            monthly_buckets[m_key]["workouts"] += 1
            monthly_buckets[m_key]["volume_kg"] += w_vol
            monthly_buckets[m_key]["sets"] += w_sets_cnt

    current_streak, longest_streak = _compute_streaks(workout_dates, today)

    weekly_frequency = [
        FrequencyPointOut(
            period=wk.isoformat(),
            label=wk.strftime("%b %d"),
            workouts=int(vals["workouts"]),
            volume_kg=round(vals["volume_kg"], 2),
            sets=int(vals["sets"]),
        )
        for wk, vals in weekly_buckets.items()
    ]

    monthly_frequency = [
        FrequencyPointOut(
            period=mk,
            label=str(vals["label"]),
            workouts=int(vals["workouts"]),
            volume_kg=round(vals["volume_kg"], 2),
            sets=int(vals["sets"]),
        )
        for mk, vals in monthly_buckets.items()
    ]

    muscle_distribution: List[MuscleDistributionPointOut] = []
    for muscle, mvals in sorted(muscle_sets.items(), key=lambda x: x[1]["sets"], reverse=True):
        s_cnt = int(mvals["sets"])
        if s_cnt <= 0:
            continue
        pct = round((s_cnt / max(1, total_sets_completed)) * 100.0, 1)
        muscle_distribution.append(
            MuscleDistributionPointOut(
                muscle=muscle,
                sets=s_cnt,
                volume_kg=round(mvals["volume_kg"], 2),
                percentage=pct,
            )
        )

    consistency_rate_30d = round((len(active_days_30d) / 30.0) * 100.0, 1)

    return AnalyticsOverviewOut(
        weekly_frequency=weekly_frequency,
        monthly_frequency=monthly_frequency,
        muscle_distribution=muscle_distribution,
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        consistency_rate_30d=consistency_rate_30d,
        total_sets_completed=total_sets_completed,
        total_volume_kg=round(total_volume_kg, 2),
        total_workouts=len(completed_workouts),
    )


@router.get("/stats/exercises/{exercise_id}/progress", response_model=List[ExerciseProgressPointOut])
def get_exercise_progress(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex or (not ex.is_system and ex.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    workout_exercises = (
        db.query(WorkoutExercise)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .options(joinedload(WorkoutExercise.sets), joinedload(WorkoutExercise.workout))
        .filter(
            Workout.user_id == current_user.id,
            Workout.status == "completed",
            WorkoutExercise.exercise_id == exercise_id,
        )
        .order_by(Workout.completed_at.asc(), Workout.id.asc())
        .all()
    )

    points: List[ExerciseProgressPointOut] = []
    for we in workout_exercises:
        working_sets = [s for s in we.sets if s.is_completed and s.set_type != "warmup"]
        if not working_sets:
            continue

        max_w = max((s.weight_kg or 0.0 for s in working_sets), default=0.0)
        best_r = max((s.reps or 0 for s in working_sets), default=0)
        best_1rm = max((calculate_epley_1rm(s.weight_kg, s.reps) for s in working_sets), default=0.0)
        vol = sum(
            calculate_set_volume_kg(
                we.tracking_type_snapshot, s.set_type, s.is_completed, s.weight_kg, s.reps
            )
            for s in working_sets
        )
        best_dur = max((s.duration_seconds or 0 for s in working_sets), default=0)
        best_dist = max((s.distance_meters or 0.0 for s in working_sets), default=0.0)

        w_dt = we.workout.completed_at or we.workout.started_at
        points.append(
            ExerciseProgressPointOut(
                date=w_dt.date().isoformat(),
                workout_id=we.workout_id,
                workout_name=we.workout.name,
                max_weight_kg=round(max_w, 2),
                best_reps=int(best_r),
                estimated_1rm_kg=round(best_1rm, 2),
                total_volume_kg=round(vol, 2),
                best_duration_seconds=int(best_dur),
                best_distance_meters=round(best_dist, 2),
                sets_completed=len(working_sets),
            )
        )

    return points


@router.get("/records", response_model=List[PersonalRecordOut])
def list_personal_records(
    exercise_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(PersonalRecord)
        .options(joinedload(PersonalRecord.exercise))
        .filter(PersonalRecord.user_id == current_user.id)
    )
    if exercise_id is not None:
        q = q.filter(PersonalRecord.exercise_id == exercise_id)

    prs = q.order_by(PersonalRecord.achieved_at.desc(), PersonalRecord.id.desc()).all()
    return [
        PersonalRecordOut(
            id=pr.id,
            user_id=pr.user_id,
            exercise_id=pr.exercise_id,
            exercise_name=pr.exercise.name if pr.exercise else "Exercise",
            primary_muscle=pr.exercise.primary_muscle if pr.exercise else "Full Body",
            workout_id=pr.workout_id,
            workout_set_id=pr.workout_set_id,
            record_type=pr.record_type,
            value=pr.value,
            weight_kg=pr.weight_kg,
            reps=pr.reps,
            previous_value=pr.previous_value,
            achieved_at=pr.achieved_at,
        )
        for pr in prs
    ]
