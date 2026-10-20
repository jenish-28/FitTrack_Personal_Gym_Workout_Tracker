from datetime import datetime, timezone
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models import Workout, WorkoutExercise, WorkoutSet, PersonalRecord, Exercise


def calculate_epley_1rm(weight_kg: Optional[float], reps: Optional[int]) -> float:
    """
    Documented Epley Formula:
    1RM = weight * (1 + reps / 30) for reps > 1, or weight for reps == 1.
    """
    if not weight_kg or not reps or weight_kg <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(float(weight_kg), 2)
    return round(float(weight_kg) * (1.0 + float(reps) / 30.0), 2)


def calculate_set_volume_kg(
    tracking_type: str,
    set_type: str,
    is_completed: bool,
    weight_kg: Optional[float],
    reps: Optional[int],
) -> float:
    """
    Exercise volume is defined as weight_kg * repetitions for completed weighted sets
    (working, dropset, failure). Warm-up sets, bodyweight-only ('reps_only'), duration,
    and distance sets do not add weighted tonnage volume.
    """
    if not is_completed:
        return 0.0
    if set_type == "warmup":
        return 0.0
    if tracking_type != "weight_reps":
        return 0.0
    if not weight_kg or not reps or weight_kg <= 0 or reps <= 0:
        return 0.0
    return round(float(weight_kg) * int(reps), 2)


def evaluate_and_record_prs_for_workout(db: Session, workout: Workout) -> List[PersonalRecord]:
    """
    Evaluates a completed workout's sets against the user's historical personal records
    prior to this workout (or across all other completed workouts).
    Avoids duplicate records when the same best performance is saved.
    """
    # Remove any existing PR records tied to this specific workout (in case of re-save / historical edit)
    db.query(PersonalRecord).filter(PersonalRecord.workout_id == workout.id).delete(synchronize_session=False)
    for we in workout.exercises:
        for s in we.sets:
            s.is_pr = False
    db.flush()

    if workout.status != "completed":
        return []

    created_prs: List[PersonalRecord] = []
    achieved_time = workout.completed_at or datetime.now(timezone.utc)

    # Group completed non-warmup sets by exercise_id
    sets_by_exercise: Dict[int, List[tuple[WorkoutExercise, WorkoutSet]]] = {}
    for we in workout.exercises:
        for s in we.sets:
            if s.is_completed and s.set_type != "warmup":
                sets_by_exercise.setdefault(we.exercise_id, []).append((we, s))

    for exercise_id, pairs in sets_by_exercise.items():
        if not pairs:
            continue
        tracking_type = pairs[0][0].tracking_type_snapshot

        # Query existing bests from ALL OTHER completed workouts for this user & exercise
        other_sets = (
            db.query(WorkoutSet)
            .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
            .join(Workout, WorkoutExercise.workout_id == Workout.id)
            .filter(
                Workout.user_id == workout.user_id,
                Workout.status == "completed",
                Workout.id != workout.id,
                WorkoutExercise.exercise_id == exercise_id,
                WorkoutSet.is_completed == True,  # noqa: E712
                WorkoutSet.set_type != "warmup",
            )
            .all()
        )

        if tracking_type == "weight_reps":
            prev_max_weight = max((s.weight_kg or 0.0 for s in other_sets if (s.reps or 0) > 0), default=0.0)
            prev_best_1rm = max(
                (calculate_epley_1rm(s.weight_kg, s.reps) for s in other_sets),
                default=0.0,
            )
            prev_max_reps = max((s.reps or 0 for s in other_sets if (s.weight_kg or 0) > 0), default=0)

            # Find best set in current workout for max_weight
            best_weight_pair = max(
                pairs,
                key=lambda p: ((p[1].weight_kg or 0.0) if (p[1].reps or 0) > 0 else 0.0, p[1].reps or 0),
            )
            cand_weight = best_weight_pair[1].weight_kg or 0.0
            if (best_weight_pair[1].reps or 0) > 0 and cand_weight > prev_max_weight and cand_weight > 0:
                best_weight_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_weight_pair[1].id,
                    record_type="max_weight",
                    value=round(cand_weight, 2),
                    weight_kg=round(cand_weight, 2),
                    reps=best_weight_pair[1].reps,
                    previous_value=round(prev_max_weight, 2) if prev_max_weight > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

            # Find best set in current workout for best_1rm
            best_1rm_pair = max(
                pairs,
                key=lambda p: calculate_epley_1rm(p[1].weight_kg, p[1].reps),
            )
            cand_1rm = calculate_epley_1rm(best_1rm_pair[1].weight_kg, best_1rm_pair[1].reps)
            if cand_1rm > prev_best_1rm and cand_1rm > 0:
                best_1rm_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_1rm_pair[1].id,
                    record_type="best_1rm",
                    value=cand_1rm,
                    weight_kg=best_1rm_pair[1].weight_kg,
                    reps=best_1rm_pair[1].reps,
                    previous_value=round(prev_best_1rm, 2) if prev_best_1rm > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

            # Find best set in current workout for max_reps (with weight > 0)
            best_reps_pair = max(
                pairs,
                key=lambda p: ((p[1].reps or 0) if (p[1].weight_kg or 0) > 0 else 0, p[1].weight_kg or 0.0),
            )
            cand_reps = best_reps_pair[1].reps or 0
            if (best_reps_pair[1].weight_kg or 0) > 0 and cand_reps > prev_max_reps and cand_reps > 0:
                best_reps_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_reps_pair[1].id,
                    record_type="max_reps",
                    value=float(cand_reps),
                    weight_kg=best_reps_pair[1].weight_kg,
                    reps=cand_reps,
                    previous_value=float(prev_max_reps) if prev_max_reps > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

        elif tracking_type == "reps_only":
            prev_max_reps = max((s.reps or 0 for s in other_sets), default=0)
            best_reps_pair = max(pairs, key=lambda p: p[1].reps or 0)
            cand_reps = best_reps_pair[1].reps or 0
            if cand_reps > prev_max_reps and cand_reps > 0:
                best_reps_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_reps_pair[1].id,
                    record_type="max_reps",
                    value=float(cand_reps),
                    reps=cand_reps,
                    previous_value=float(prev_max_reps) if prev_max_reps > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

        elif tracking_type == "duration":
            prev_max_dur = max((s.duration_seconds or 0 for s in other_sets), default=0)
            best_dur_pair = max(pairs, key=lambda p: p[1].duration_seconds or 0)
            cand_dur = best_dur_pair[1].duration_seconds or 0
            if cand_dur > prev_max_dur and cand_dur > 0:
                best_dur_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_dur_pair[1].id,
                    record_type="longest_duration",
                    value=float(cand_dur),
                    previous_value=float(prev_max_dur) if prev_max_dur > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

        elif tracking_type == "distance":
            prev_max_dist = max((s.distance_meters or 0.0 for s in other_sets), default=0.0)
            best_dist_pair = max(pairs, key=lambda p: p[1].distance_meters or 0.0)
            cand_dist = best_dist_pair[1].distance_meters or 0.0
            if cand_dist > prev_max_dist and cand_dist > 0:
                best_dist_pair[1].is_pr = True
                pr = PersonalRecord(
                    user_id=workout.user_id,
                    exercise_id=exercise_id,
                    workout_id=workout.id,
                    workout_set_id=best_dist_pair[1].id,
                    record_type="max_distance",
                    value=round(float(cand_dist), 2),
                    previous_value=round(float(prev_max_dist), 2) if prev_max_dist > 0 else None,
                    achieved_at=achieved_time,
                )
                db.add(pr)
                created_prs.append(pr)

    db.flush()
    return created_prs
