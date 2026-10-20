from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy.orm import Session

from app.models import (
    User,
    UserSettings,
    Exercise,
    ExerciseFavorite,
    WorkoutRoutine,
    RoutineExercise,
    Workout,
    WorkoutExercise,
    WorkoutSet,
)
from app.core.security import hash_password
from app.services.workout_service import calculate_set_volume_kg, evaluate_and_record_prs_for_workout


INITIAL_SYSTEM_EXERCISES = [
    {
        "name": "Bench Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Shoulders"],
        "equipment": "Barbell",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower under control to mid-chest, and press up explosively.",
    },
    {
        "name": "Incline Dumbbell Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Shoulders", "Triceps"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Set bench to a 30-degree incline. Press dumbbells overhead while keeping shoulder blades retracted.",
    },
    {
        "name": "Chest Fly",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Shoulders"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Keep a slight bend in your elbows and bring handles together in a wide arc in front of your chest.",
    },
    {
        "name": "Lat Pulldown",
        "primary_muscle": "Back",
        "secondary_muscles": ["Biceps", "Forearms"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Grip the bar wider than shoulder width, lean back slightly, and pull the bar down to your upper chest.",
    },
    {
        "name": "Seated Cable Row",
        "primary_muscle": "Back",
        "secondary_muscles": ["Biceps", "Shoulders"],
        "equipment": "Cable",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Sit tall with knees slightly bent, pull the handle toward your lower ribcage, and squeeze shoulder blades together.",
    },
    {
        "name": "Pull-Up",
        "primary_muscle": "Back",
        "secondary_muscles": ["Biceps", "Core"],
        "equipment": "Bodyweight",
        "category": "Bodyweight",
        "tracking_type": "reps_only",
        "instructions": "Hang from a pull-up bar with an overhand grip and pull your body up until your chin clears the bar.",
    },
    {
        "name": "Shoulder Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Triceps", "Core"],
        "equipment": "Dumbbell",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Press dumbbells from shoulder height directly overhead without arching your lower back.",
    },
    {
        "name": "Lateral Raise",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Forearms"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Raise dumbbells out to your sides until arms are parallel to the floor, leading with your elbows.",
    },
    {
        "name": "Barbell Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Forearms"],
        "equipment": "Barbell",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Stand tall and curl the barbell upward while keeping your elbows pinned to your sides.",
    },
    {
        "name": "Triceps Pushdown",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Forearms"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Keep elbows tucked at your sides and extend your forearms downward until arms are fully straight.",
    },
    {
        "name": "Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings", "Core"],
        "equipment": "Barbell",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Brace your core, descend by sitting hips back and bending knees until thighs are at least parallel, then drive up.",
    },
    {
        "name": "Leg Press",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment": "Machine",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Place feet hip-width apart on the sled, lower until knees reach 90 degrees, and press back up without locking knees.",
    },
    {
        "name": "Romanian Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Back"],
        "equipment": "Barbell",
        "category": "Strength",
        "tracking_type": "weight_reps",
        "instructions": "Keep knees slightly bent and hinge at the hips, lowering the barbell along your shins until you feel a deep hamstring stretch.",
    },
    {
        "name": "Leg Curl",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Calves"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Curl the pad toward your glutes while keeping your hips pressed firmly into the bench.",
    },
    {
        "name": "Calf Raise",
        "primary_muscle": "Calves",
        "secondary_muscles": [],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "tracking_type": "weight_reps",
        "instructions": "Lower heels for a full stretch at the bottom, then drive up onto the balls of your feet and pause at the top.",
    },
    {
        "name": "Plank",
        "primary_muscle": "Core",
        "secondary_muscles": ["Shoulders", "Glutes"],
        "equipment": "Bodyweight",
        "category": "Core",
        "tracking_type": "duration",
        "instructions": "Support your body on forearms and toes, keeping a straight line from head to heels with core braced.",
    },
    {
        "name": "Crunches",
        "primary_muscle": "Core",
        "secondary_muscles": [],
        "equipment": "Bodyweight",
        "category": "Core",
        "tracking_type": "reps_only",
        "instructions": "Lie on your back with knees bent and curl your upper spine off the floor by contracting your abs.",
    },
    {
        "name": "Treadmill Run",
        "primary_muscle": "Cardio",
        "secondary_muscles": ["Quadriceps", "Calves"],
        "equipment": "Machine",
        "category": "Cardio",
        "tracking_type": "distance",
        "instructions": "Maintain a steady pace and upright posture while tracking total distance covered and duration.",
    },
]

STARTER_ROUTINE_TEMPLATES = [
    {
        "name": "Push Day",
        "description": "Chest, shoulders, and triceps strength & hypertrophy focus.",
        "items": [
            ("Bench Press", 4, 8, 80.0, 120),
            ("Incline Dumbbell Press", 3, 10, 30.0, 90),
            ("Shoulder Press", 3, 10, 24.0, 90),
            ("Chest Fly", 3, 12, 20.0, 60),
            ("Lateral Raise", 3, 15, 12.0, 60),
            ("Triceps Pushdown", 3, 12, 27.5, 60),
        ],
    },
    {
        "name": "Pull Day",
        "description": "Back width, thickness, and biceps development.",
        "items": [
            ("Pull-Up", 4, 8, None, 120),
            ("Lat Pulldown", 3, 10, 65.0, 90),
            ("Seated Cable Row", 3, 10, 60.0, 90),
            ("Barbell Curl", 3, 12, 35.0, 75),
        ],
    },
    {
        "name": "Leg Day",
        "description": "Complete lower body compound and isolation session.",
        "items": [
            ("Squat", 4, 6, 100.0, 150),
            ("Romanian Deadlift", 3, 8, 90.0, 120),
            ("Leg Press", 3, 12, 160.0, 90),
            ("Leg Curl", 3, 12, 45.0, 75),
            ("Calf Raise", 4, 15, 60.0, 60),
        ],
    },
    {
        "name": "Upper Body",
        "description": "Balanced horizontal/vertical push and pull upper body workout.",
        "items": [
            ("Bench Press", 3, 8, 80.0, 120),
            ("Lat Pulldown", 3, 10, 65.0, 90),
            ("Shoulder Press", 3, 10, 24.0, 90),
            ("Seated Cable Row", 3, 10, 60.0, 90),
            ("Barbell Curl", 2, 12, 32.5, 60),
            ("Triceps Pushdown", 2, 12, 25.0, 60),
        ],
    },
    {
        "name": "Lower Body",
        "description": "Focused quad, hamstring, glute, and core stability training.",
        "items": [
            ("Squat", 4, 8, 95.0, 120),
            ("Romanian Deadlift", 3, 10, 85.0, 120),
            ("Leg Curl", 3, 12, 45.0, 75),
            ("Calf Raise", 3, 15, 55.0, 60),
            ("Plank", 3, 1, None, 60),
        ],
    },
    {
        "name": "Full Body",
        "description": "High-efficiency total body compound workout.",
        "items": [
            ("Squat", 3, 8, 95.0, 120),
            ("Bench Press", 3, 8, 80.0, 120),
            ("Seated Cable Row", 3, 10, 60.0, 90),
            ("Shoulder Press", 3, 10, 22.5, 90),
            ("Romanian Deadlift", 3, 10, 85.0, 90),
            ("Crunches", 3, 20, None, 60),
        ],
    },
]


def seed_initial_data(db: Session) -> None:
    """Idempotently seeds built-in system exercises and starter routine templates."""
    existing_system = (
        db.query(Exercise)
        .filter(Exercise.is_system == True)  # noqa: E712
        .all()
    )
    existing_by_name: Dict[str, Exercise] = {ex.name.lower(): ex for ex in existing_system}

    for item in INITIAL_SYSTEM_EXERCISES:
        key = item["name"].lower()
        if key not in existing_by_name:
            ex = Exercise(
                user_id=None,
                name=item["name"],
                primary_muscle=item["primary_muscle"],
                secondary_muscles=item["secondary_muscles"],
                equipment=item["equipment"],
                category=item["category"],
                tracking_type=item["tracking_type"],
                instructions=item["instructions"],
                is_system=True,
                is_archived=False,
            )
            db.add(ex)
            db.flush()
            existing_by_name[key] = ex

    existing_templates = (
        db.query(WorkoutRoutine)
        .filter(WorkoutRoutine.is_template == True)  # noqa: E712
        .all()
    )
    template_names = {r.name.lower() for r in existing_templates}

    for tmpl in STARTER_ROUTINE_TEMPLATES:
        if tmpl["name"].lower() not in template_names:
            routine = WorkoutRoutine(
                user_id=None,
                name=tmpl["name"],
                description=tmpl["description"],
                is_template=True,
            )
            db.add(routine)
            db.flush()
            for idx, (ex_name, sets_cnt, reps_cnt, weight_val, rest_sec) in enumerate(tmpl["items"]):
                ex_obj = existing_by_name.get(ex_name.lower())
                if ex_obj:
                    re_item = RoutineExercise(
                        routine_id=routine.id,
                        exercise_id=ex_obj.id,
                        order_index=idx,
                        target_sets=sets_cnt,
                        target_reps=reps_cnt,
                        target_weight_kg=weight_val,
                        target_duration_seconds=60 if ex_obj.tracking_type == "duration" else None,
                        rest_seconds=rest_sec,
                    )
                    db.add(re_item)

    db.commit()


def ensure_demo_user(db: Session) -> User:
    """
    Creates or retrieves the development Demo Athlete account with realistic historical workouts,
    sets, routines, favorites, and personal records stored in PostgreSQL.
    """
    seed_initial_data(db)

    demo_email = "demo@fittrack.app"
    user = db.query(User).filter(User.email == demo_email).first()
    if user:
        return user

    user = User(
        email=demo_email,
        password_hash=hash_password("DemoPass123!"),
        name="Alex Rivera",
        bio="Strength & hypertrophy enthusiast chasing a 120kg bench and 160kg squat.",
    )
    db.add(user)
    db.flush()

    settings = UserSettings(
        user_id=user.id,
        weight_unit="kg",
        theme="dark",
        weekly_goal=4,
        default_rest_seconds=90,
    )
    db.add(settings)
    db.flush()

    system_exercises = db.query(Exercise).filter(Exercise.is_system == True).all()  # noqa: E712
    ex_map = {e.name: e for e in system_exercises}

    # Add a custom exercise for the demo user
    paused_bench = Exercise(
        user_id=user.id,
        name="Paused Barbell Bench Press",
        primary_muscle="Chest",
        secondary_muscles=["Triceps", "Shoulders"],
        equipment="Barbell",
        category="Strength",
        tracking_type="weight_reps",
        instructions="Pause the barbell for 2 full seconds on the chest before pressing.",
        is_system=False,
        is_archived=False,
    )
    db.add(paused_bench)
    db.flush()
    ex_map[paused_bench.name] = paused_bench

    # Star favorite exercises
    for fav_name in ["Bench Press", "Squat", "Romanian Deadlift", "Pull-Up"]:
        if fav_name in ex_map:
            db.add(ExerciseFavorite(user_id=user.id, exercise_id=ex_map[fav_name].id))

    # Create a custom user routine
    custom_routine = WorkoutRoutine(
        user_id=user.id,
        name="Heavy Upper Power",
        description="Compound upper body strength progression session.",
        is_template=False,
    )
    db.add(custom_routine)
    db.flush()
    for idx, (ename, tsets, treps, tw) in enumerate(
        [
            ("Bench Press", 4, 5, 90.0),
            ("Pull-Up", 4, 8, None),
            ("Shoulder Press", 3, 8, 26.0),
            ("Seated Cable Row", 3, 10, 65.0),
        ]
    ):
        if ename in ex_map:
            db.add(
                RoutineExercise(
                    routine_id=custom_routine.id,
                    exercise_id=ex_map[ename].id,
                    order_index=idx,
                    target_sets=tsets,
                    target_reps=treps,
                    target_weight_kg=tw,
                    rest_seconds=120,
                )
            )

    # Create 5 historical completed workouts over the last 12 days for progressive overload charts
    now = datetime.now(timezone.utc)
    historical_sessions = [
        (
            10,
            "Push Day — Week 1",
            3420,
            [
                ("Bench Press", [(60.0, 10, "warmup"), (80.0, 8, "working"), (82.5, 8, "working"), (82.5, 7, "working")]),
                ("Incline Dumbbell Press", [(26.0, 10, "working"), (28.0, 10, "working"), (28.0, 9, "working")]),
                ("Lateral Raise", [(12.0, 15, "working"), (12.0, 15, "working"), (12.0, 14, "working")]),
                ("Triceps Pushdown", [(25.0, 12, "working"), (27.5, 12, "working"), (27.5, 12, "working")]),
            ],
        ),
        (
            8,
            "Pull Day — Week 1",
            3180,
            [
                ("Pull-Up", [(None, 8, "working"), (None, 8, "working"), (None, 7, "working")]),
                ("Lat Pulldown", [(60.0, 10, "working"), (65.0, 10, "working"), (65.0, 10, "working")]),
                ("Seated Cable Row", [(55.0, 10, "working"), (60.0, 10, "working"), (60.0, 10, "working")]),
                ("Barbell Curl", [(30.0, 12, "working"), (32.5, 10, "working"), (32.5, 10, "working")]),
            ],
        ),
        (
            5,
            "Leg Day — Strength",
            3900,
            [
                ("Squat", [(60.0, 8, "warmup"), (100.0, 6, "working"), (105.0, 6, "working"), (110.0, 5, "working")]),
                ("Romanian Deadlift", [(80.0, 8, "working"), (85.0, 8, "working"), (90.0, 8, "working")]),
                ("Leg Press", [(160.0, 12, "working"), (180.0, 10, "working"), (180.0, 10, "working")]),
                ("Calf Raise", [(60.0, 15, "working"), (65.0, 15, "working"), (65.0, 15, "working")]),
            ],
        ),
        (
            2,
            "Push Day — PR Session",
            3600,
            [
                ("Bench Press", [(60.0, 8, "warmup"), (85.0, 8, "working"), (87.5, 6, "working"), (90.0, 5, "working")]),
                ("Incline Dumbbell Press", [(28.0, 10, "working"), (30.0, 10, "working"), (30.0, 8, "working")]),
                ("Shoulder Press", [(22.0, 10, "working"), (24.0, 10, "working"), (26.0, 8, "working")]),
                ("Triceps Pushdown", [(27.5, 12, "working"), (30.0, 12, "working"), (30.0, 10, "working")]),
            ],
        ),
        (
            0,
            "Pull & Core Session",
            3100,
            [
                ("Pull-Up", [(None, 10, "working"), (None, 9, "working"), (None, 8, "working")]),
                ("Lat Pulldown", [(65.0, 10, "working"), (70.0, 8, "working"), (70.0, 8, "working")]),
                ("Seated Cable Row", [(60.0, 10, "working"), (65.0, 10, "working"), (65.0, 9, "working")]),
                ("Barbell Curl", [(32.5, 12, "working"), (35.0, 10, "working"), (35.0, 10, "working")]),
            ],
        ),
    ]

    for days_ago, w_name, dur_sec, ex_entries in historical_sessions:
        start_dt = now - timedelta(days=days_ago, seconds=dur_sec)
        end_dt = now - timedelta(days=days_ago)
        workout = Workout(
            user_id=user.id,
            name=w_name,
            status="completed",
            started_at=start_dt,
            completed_at=end_dt,
            duration_seconds=dur_sec,
            notes="Logged consistently with progressive overload.",
            total_volume_kg=0.0,
        )
        db.add(workout)
        db.flush()

        total_vol = 0.0
        for order_idx, (ex_name, set_tuples) in enumerate(ex_entries):
            ex_obj = ex_map[ex_name]
            we = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=ex_obj.id,
                exercise_name_snapshot=ex_obj.name,
                tracking_type_snapshot=ex_obj.tracking_type,
                primary_muscle_snapshot=ex_obj.primary_muscle,
                equipment_snapshot=ex_obj.equipment,
                order_index=order_idx,
                rest_seconds=90,
            )
            db.add(we)
            db.flush()

            for s_idx, (w_kg, reps_val, s_type) in enumerate(set_tuples, start=1):
                ws = WorkoutSet(
                    workout_exercise_id=we.id,
                    set_number=s_idx,
                    set_type=s_type,
                    weight_kg=w_kg,
                    reps=reps_val,
                    is_completed=True,
                    completed_at=end_dt,
                )
                db.add(ws)
                total_vol += calculate_set_volume_kg(
                    ex_obj.tracking_type, s_type, True, w_kg, reps_val
                )

        workout.total_volume_kg = round(total_vol, 2)
        db.flush()
        db.refresh(workout)
        evaluate_and_record_prs_for_workout(db, workout)

    db.commit()
    db.refresh(user)
    return user
