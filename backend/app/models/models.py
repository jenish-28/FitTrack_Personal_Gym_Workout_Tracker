from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    CheckConstraint,
    JSON,
    LargeBinary,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    settings: Mapped["UserSettings"] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    custom_exercises: Mapped[List["Exercise"]] = relationship(
        "Exercise", back_populates="owner", cascade="all, delete-orphan"
    )
    routines: Mapped[List["WorkoutRoutine"]] = relationship(
        "WorkoutRoutine", back_populates="user", cascade="all, delete-orphan"
    )
    workouts: Mapped[List["Workout"]] = relationship(
        "Workout", back_populates="user", cascade="all, delete-orphan"
    )
    personal_records: Mapped[List["PersonalRecord"]] = relationship(
        "PersonalRecord", back_populates="user", cascade="all, delete-orphan"
    )
    favorite_exercises: Mapped[List["ExerciseFavorite"]] = relationship(
        "ExerciseFavorite", back_populates="user", cascade="all, delete-orphan"
    )


class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = (
        CheckConstraint("weight_unit IN ('kg', 'lbs')", name="ck_user_settings_weight_unit"),
        CheckConstraint("theme IN ('dark', 'light')", name="ck_user_settings_theme"),
        CheckConstraint("weekly_goal >= 1 AND weekly_goal <= 14", name="ck_user_settings_weekly_goal"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    weight_unit: Mapped[str] = mapped_column(String(10), default="kg", nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default="dark", nullable=False)
    weekly_goal: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    default_rest_seconds: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="settings")


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        CheckConstraint(
            "tracking_type IN ('weight_reps', 'reps_only', 'duration', 'distance')",
            name="ck_exercises_tracking_type",
        ),
        Index("ix_exercises_muscle_equipment", "primary_muscle", "equipment"),
        Index("ix_exercises_user_archived", "user_id", "is_archived"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    primary_muscle: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    secondary_muscles: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    equipment: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), default="Strength", nullable=False)
    difficulty_level: Mapped[Optional[str]] = mapped_column(
        String(40), default="Intermediate", server_default="Intermediate", nullable=True
    )
    tracking_type: Mapped[str] = mapped_column(String(30), default="weight_reps", nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="custom_exercises")


class ExerciseMedia(Base):
    __tablename__ = "exercise_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exercise_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(80), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class ExerciseFavorite(Base):
    __tablename__ = "exercise_favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "exercise_id", name="uq_user_exercise_favorite"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="favorite_exercises")
    exercise: Mapped["Exercise"] = relationship("Exercise")


class WorkoutRoutine(Base):
    __tablename__ = "workout_routines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="routines")
    exercises: Mapped[List["RoutineExercise"]] = relationship(
        "RoutineExercise",
        back_populates="routine",
        cascade="all, delete-orphan",
        order_by="RoutineExercise.order_index",
    )


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    routine_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_routines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_sets: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    target_reps: Mapped[Optional[int]] = mapped_column(Integer, default=10, nullable=True)
    target_weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    routine: Mapped["WorkoutRoutine"] = relationship("WorkoutRoutine", back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship("Exercise")


class Workout(Base):
    __tablename__ = "workouts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'completed', 'cancelled')",
            name="ck_workouts_status",
        ),
        Index("ix_workouts_user_status_started", "user_id", "status", "started_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    routine_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workout_routines.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_volume_kg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="workouts")
    exercises: Mapped[List["WorkoutExercise"]] = relationship(
        "WorkoutExercise",
        back_populates="workout",
        cascade="all, delete-orphan",
        order_by="WorkoutExercise.order_index",
    )
    personal_records: Mapped[List["PersonalRecord"]] = relationship(
        "PersonalRecord", back_populates="workout", cascade="all, delete-orphan"
    )


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    exercise_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    tracking_type_snapshot: Mapped[str] = mapped_column(String(30), default="weight_reps", nullable=False)
    primary_muscle_snapshot: Mapped[str] = mapped_column(String(120), default="Full Body", nullable=False)
    equipment_snapshot: Mapped[str] = mapped_column(String(100), default="Other", nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    workout: Mapped["Workout"] = relationship("Workout", back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship("Exercise")
    sets: Mapped[List["WorkoutSet"]] = relationship(
        "WorkoutSet",
        back_populates="workout_exercise",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"
    __table_args__ = (
        CheckConstraint(
            "set_type IN ('warmup', 'working', 'dropset', 'failure')",
            name="ck_workout_sets_set_type",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_exercises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    set_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    set_type: Mapped[str] = mapped_column(String(20), default="working", nullable=False)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_pr: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    workout_exercise: Mapped["WorkoutExercise"] = relationship("WorkoutExercise", back_populates="sets")


class PersonalRecord(Base):
    __tablename__ = "personal_records"
    __table_args__ = (
        CheckConstraint(
            "record_type IN ('max_weight', 'best_1rm', 'max_reps', 'longest_duration', 'max_distance')",
            name="ck_personal_records_record_type",
        ),
        Index("ix_personal_records_user_exercise_type", "user_id", "exercise_id", "record_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    workout_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workout_set_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workout_sets.id", ondelete="SET NULL"), nullable=True
    )
    record_type: Mapped[str] = mapped_column(String(30), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    previous_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    achieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="personal_records")
    exercise: Mapped["Exercise"] = relationship("Exercise")
    workout: Mapped["Workout"] = relationship("Workout", back_populates="personal_records")
