"""initial_schema

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-10-20 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("weight_unit", sa.String(length=10), nullable=False, server_default="kg"),
        sa.Column("theme", sa.String(length=10), nullable=False, server_default="dark"),
        sa.Column("weekly_goal", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("default_rest_seconds", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("weight_unit IN ('kg', 'lbs')", name="ck_user_settings_weight_unit"),
        sa.CheckConstraint("theme IN ('dark', 'light')", name="ck_user_settings_theme"),
        sa.CheckConstraint("weekly_goal >= 1 AND weekly_goal <= 14", name="ck_user_settings_weekly_goal"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_settings_id", "user_settings", ["id"], unique=False)
    op.create_index("ix_user_settings_user_id", "user_settings", ["user_id"], unique=True)

    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("primary_muscle", sa.String(length=60), nullable=False),
        sa.Column("secondary_muscles", sa.JSON(), nullable=False),
        sa.Column("equipment", sa.String(length=60), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False, server_default="Strength"),
        sa.Column("tracking_type", sa.String(length=30), nullable=False, server_default="weight_reps"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "tracking_type IN ('weight_reps', 'reps_only', 'duration', 'distance')",
            name="ck_exercises_tracking_type",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exercises_id", "exercises", ["id"], unique=False)
    op.create_index("ix_exercises_user_id", "exercises", ["user_id"], unique=False)
    op.create_index("ix_exercises_name", "exercises", ["name"], unique=False)
    op.create_index("ix_exercises_primary_muscle", "exercises", ["primary_muscle"], unique=False)
    op.create_index("ix_exercises_equipment", "exercises", ["equipment"], unique=False)
    op.create_index("ix_exercises_muscle_equipment", "exercises", ["primary_muscle", "equipment"], unique=False)
    op.create_index("ix_exercises_user_archived", "exercises", ["user_id", "is_archived"], unique=False)

    op.create_table(
        "exercise_favorites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "exercise_id", name="uq_user_exercise_favorite"),
    )
    op.create_index("ix_exercise_favorites_id", "exercise_favorites", ["id"], unique=False)
    op.create_index("ix_exercise_favorites_user_id", "exercise_favorites", ["user_id"], unique=False)
    op.create_index("ix_exercise_favorites_exercise_id", "exercise_favorites", ["exercise_id"], unique=False)

    op.create_table(
        "workout_routines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_template", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_routines_id", "workout_routines", ["id"], unique=False)
    op.create_index("ix_workout_routines_user_id", "workout_routines", ["user_id"], unique=False)
    op.create_index("ix_workout_routines_is_template", "workout_routines", ["is_template"], unique=False)

    op.create_table(
        "routine_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("routine_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_sets", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("target_reps", sa.Integer(), nullable=True, server_default="10"),
        sa.Column("target_weight_kg", sa.Float(), nullable=True),
        sa.Column("target_duration_seconds", sa.Integer(), nullable=True),
        sa.Column("target_distance_meters", sa.Float(), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["routine_id"], ["workout_routines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_routine_exercises_id", "routine_exercises", ["id"], unique=False)
    op.create_index("ix_routine_exercises_routine_id", "routine_exercises", ["routine_id"], unique=False)
    op.create_index("ix_routine_exercises_exercise_id", "routine_exercises", ["exercise_id"], unique=False)

    op.create_table(
        "workouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("routine_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="in_progress"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("total_volume_kg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('in_progress', 'completed', 'cancelled')",
            name="ck_workouts_status",
        ),
        sa.ForeignKeyConstraint(["routine_id"], ["workout_routines.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workouts_id", "workouts", ["id"], unique=False)
    op.create_index("ix_workouts_user_id", "workouts", ["user_id"], unique=False)
    op.create_index("ix_workouts_status", "workouts", ["status"], unique=False)
    op.create_index("ix_workouts_completed_at", "workouts", ["completed_at"], unique=False)
    op.create_index(
        "ix_workouts_user_status_started",
        "workouts",
        ["user_id", "status", "started_at"],
        unique=False,
    )

    op.create_table(
        "workout_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("exercise_name_snapshot", sa.String(length=150), nullable=False),
        sa.Column("tracking_type_snapshot", sa.String(length=30), nullable=False, server_default="weight_reps"),
        sa.Column("primary_muscle_snapshot", sa.String(length=60), nullable=False, server_default="Full Body"),
        sa.Column("equipment_snapshot", sa.String(length=60), nullable=False, server_default="Other"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rest_seconds", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_exercises_id", "workout_exercises", ["id"], unique=False)
    op.create_index("ix_workout_exercises_workout_id", "workout_exercises", ["workout_id"], unique=False)
    op.create_index("ix_workout_exercises_exercise_id", "workout_exercises", ["exercise_id"], unique=False)

    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_exercise_id", sa.Integer(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("set_type", sa.String(length=20), nullable=False, server_default="working"),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("reps", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_pr", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "set_type IN ('warmup', 'working', 'dropset', 'failure')",
            name="ck_workout_sets_set_type",
        ),
        sa.ForeignKeyConstraint(["workout_exercise_id"], ["workout_exercises.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_sets_id", "workout_sets", ["id"], unique=False)
    op.create_index("ix_workout_sets_workout_exercise_id", "workout_sets", ["workout_exercise_id"], unique=False)

    op.create_table(
        "personal_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("workout_id", sa.Integer(), nullable=False),
        sa.Column("workout_set_id", sa.Integer(), nullable=True),
        sa.Column("record_type", sa.String(length=30), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("reps", sa.Integer(), nullable=True),
        sa.Column("previous_value", sa.Float(), nullable=True),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "record_type IN ('max_weight', 'best_1rm', 'max_reps', 'longest_duration', 'max_distance')",
            name="ck_personal_records_record_type",
        ),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workout_set_id"], ["workout_sets.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_personal_records_id", "personal_records", ["id"], unique=False)
    op.create_index("ix_personal_records_user_id", "personal_records", ["user_id"], unique=False)
    op.create_index("ix_personal_records_exercise_id", "personal_records", ["exercise_id"], unique=False)
    op.create_index("ix_personal_records_workout_id", "personal_records", ["workout_id"], unique=False)
    op.create_index(
        "ix_personal_records_user_exercise_type",
        "personal_records",
        ["user_id", "exercise_id", "record_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("personal_records")
    op.drop_table("workout_sets")
    op.drop_table("workout_exercises")
    op.drop_table("workouts")
    op.drop_table("routine_exercises")
    op.drop_table("workout_routines")
    op.drop_table("exercise_favorites")
    op.drop_table("exercises")
    op.drop_table("user_settings")
    op.drop_table("users")
