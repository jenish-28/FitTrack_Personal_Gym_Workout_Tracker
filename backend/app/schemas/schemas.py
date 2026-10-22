from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


WeightUnitType = Literal["kg", "lbs"]
ThemeType = Literal["dark", "light"]
TrackingTypeLiteral = Literal["weight_reps", "reps_only", "duration", "distance"]
SetTypeLiteral = Literal["warmup", "working", "dropset", "failure"]
WorkoutStatusLiteral = Literal["in_progress", "completed", "cancelled"]
RecordTypeLiteral = Literal["max_weight", "best_1rm", "max_reps", "longest_duration", "max_distance"]


# -----------------------
# User & Auth Schemas
# -----------------------
class UserSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    weight_unit: WeightUnitType
    theme: ThemeType
    weekly_goal: int
    default_rest_seconds: int


class UserSettingsUpdate(BaseModel):
    weight_unit: Optional[WeightUnitType] = None
    theme: Optional[ThemeType] = None
    weekly_goal: Optional[int] = Field(default=None, ge=1, le=14)
    default_rest_seconds: Optional[int] = Field(default=None, ge=15, le=600)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False
    created_at: datetime
    settings: UserSettingsOut


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class DeleteAccountRequest(BaseModel):
    password: Optional[str] = None


# -----------------------
# Exercise Library Schemas
# -----------------------
class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    primary_muscle: str = Field(..., min_length=2, max_length=120)
    secondary_muscles: List[str] = Field(default_factory=list)
    equipment: str = Field(..., min_length=2, max_length=100)
    category: str = Field(default="Strength", min_length=2, max_length=100)
    difficulty_level: Optional[str] = Field(default="Intermediate", max_length=40)
    tracking_type: TrackingTypeLiteral = "weight_reps"
    instructions: Optional[str] = Field(default=None, max_length=4000)
    media_url: Optional[str] = Field(default=None, max_length=500)
    is_system: Optional[bool] = False

    @field_validator("name", "primary_muscle", "equipment", "category")
    @classmethod
    def clean_required_str(cls, v: str) -> str:
        val = v.strip()
        if not val:
            raise ValueError("Field cannot be empty or whitespace.")
        return val

    @field_validator("media_url")
    @classmethod
    def validate_media_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if cleaned.lower().startswith("blob:"):
            raise ValueError("Temporary browser blob URLs cannot be stored as permanent media references.")
        return cleaned


class ExerciseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    primary_muscle: Optional[str] = Field(default=None, min_length=2, max_length=120)
    secondary_muscles: Optional[List[str]] = None
    equipment: Optional[str] = Field(default=None, min_length=2, max_length=100)
    category: Optional[str] = Field(default=None, min_length=2, max_length=100)
    difficulty_level: Optional[str] = Field(default=None, max_length=40)
    tracking_type: Optional[TrackingTypeLiteral] = None
    instructions: Optional[str] = Field(default=None, max_length=4000)
    media_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "primary_muscle", "equipment", "category")
    @classmethod
    def clean_optional_str(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if len(val) < 2:
            raise ValueError("Field must contain at least 2 non-whitespace characters.")
        return val

    @field_validator("media_url")
    @classmethod
    def validate_media_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if cleaned.lower().startswith("blob:"):
            raise ValueError("Temporary browser blob URLs cannot be stored as permanent media references.")
        return cleaned


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    name: str
    primary_muscle: str
    secondary_muscles: List[str]
    equipment: str
    category: str
    difficulty_level: Optional[str] = "Intermediate"
    tracking_type: TrackingTypeLiteral
    instructions: Optional[str] = None
    media_url: Optional[str] = None
    is_system: bool
    is_archived: bool
    is_favorite: bool = False
    usage_count: int = 0
    routine_count: int = 0
    created_at: datetime


class ExerciseDeleteOut(BaseModel):
    action: Literal["deleted", "archived"]
    message: str
    removed_from_routines: int = 0
    exercise_id: int


# -----------------------
# Workout Routine Schemas
# -----------------------
class RoutineExerciseInput(BaseModel):
    exercise_id: int
    order_index: int = Field(default=0, ge=0)
    target_sets: int = Field(default=3, ge=1, le=30)
    target_reps: Optional[int] = Field(default=10, ge=1, le=500)
    target_weight_kg: Optional[float] = Field(default=None, ge=0, le=2000)
    target_duration_seconds: Optional[int] = Field(default=None, ge=1, le=86400)
    target_distance_meters: Optional[float] = Field(default=None, ge=0, le=500000)
    rest_seconds: int = Field(default=90, ge=0, le=900)
    notes: Optional[str] = Field(default=None, max_length=1000)


class RoutineExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    order_index: int
    target_sets: int
    target_reps: Optional[int] = None
    target_weight_kg: Optional[float] = None
    target_duration_seconds: Optional[int] = None
    target_distance_meters: Optional[float] = None
    rest_seconds: int
    notes: Optional[str] = None
    exercise: Optional[ExerciseOut] = None


class RoutineCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_template: Optional[bool] = False
    exercises: List[RoutineExerciseInput] = Field(default_factory=list)


class RoutineUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    description: Optional[str] = Field(default=None, max_length=1000)
    exercises: Optional[List[RoutineExerciseInput]] = None


class RoutineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    is_template: bool
    created_at: datetime
    updated_at: datetime
    exercises: List[RoutineExerciseOut] = Field(default_factory=list)


# -----------------------
# Workout & Set Schemas
# -----------------------
class WorkoutSetInput(BaseModel):
    set_number: int = Field(default=1, ge=1, le=100)
    set_type: SetTypeLiteral = "working"
    weight_kg: Optional[float] = Field(default=None, ge=0, le=2000)
    reps: Optional[int] = Field(default=None, ge=0, le=2000)
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86400)
    distance_meters: Optional[float] = Field(default=None, ge=0, le=500000)
    is_completed: bool = False


class WorkoutSetUpdate(BaseModel):
    set_number: Optional[int] = Field(default=None, ge=1, le=100)
    set_type: Optional[SetTypeLiteral] = None
    weight_kg: Optional[float] = Field(default=None, ge=0, le=2000)
    reps: Optional[int] = Field(default=None, ge=0, le=2000)
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86400)
    distance_meters: Optional[float] = Field(default=None, ge=0, le=500000)
    is_completed: Optional[bool] = None


class WorkoutSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_exercise_id: int
    set_number: int
    set_type: SetTypeLiteral
    weight_kg: Optional[float] = None
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    is_completed: bool
    is_pr: bool
    completed_at: Optional[datetime] = None


class PreviousSetOut(BaseModel):
    set_number: int
    weight_kg: Optional[float] = None
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    achieved_at: Optional[datetime] = None


class WorkoutExerciseInput(BaseModel):
    exercise_id: int
    order_index: int = Field(default=0, ge=0)
    rest_seconds: int = Field(default=90, ge=0, le=900)
    notes: Optional[str] = Field(default=None, max_length=1000)
    sets: List[WorkoutSetInput] = Field(default_factory=list)


class WorkoutExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_id: int
    exercise_id: int
    exercise_name_snapshot: str
    tracking_type_snapshot: TrackingTypeLiteral
    primary_muscle_snapshot: Optional[str] = None
    equipment_snapshot: Optional[str] = None
    order_index: int
    rest_seconds: int
    notes: Optional[str] = None
    sets: List[WorkoutSetOut] = Field(default_factory=list)
    previous_sets: List[PreviousSetOut] = Field(default_factory=list)


class WorkoutStartRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=150)
    routine_id: Optional[int] = None


class WorkoutSyncRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    notes: Optional[str] = Field(default=None, max_length=2000)
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86400)
    started_at: Optional[datetime] = None
    exercises: List[WorkoutExerciseInput] = Field(default_factory=list)


class PersonalRecordOut(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    exercise_name: str
    primary_muscle: str
    workout_id: int
    workout_set_id: Optional[int] = None
    record_type: RecordTypeLiteral
    value: float
    weight_kg: Optional[float] = None
    reps: Optional[int] = None
    previous_value: Optional[float] = None
    achieved_at: datetime


class WorkoutOut(BaseModel):
    id: int
    user_id: int
    routine_id: Optional[int] = None
    name: str
    status: WorkoutStatusLiteral
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: int
    notes: Optional[str] = None
    total_volume_kg: float
    completed_sets_count: int = 0
    completed_exercises_count: int = 0
    pr_count: int = 0
    exercises: List[WorkoutExerciseOut] = Field(default_factory=list)
    new_records: List[PersonalRecordOut] = Field(default_factory=list)


# -----------------------
# Dashboard & Analytics Schemas
# -----------------------
class WeeklyActivityPointOut(BaseModel):
    day: str
    date: str
    workouts: int
    volume_kg: float
    duration_minutes: int


class FavoriteExerciseSummaryOut(BaseModel):
    exercise_id: int
    name: str
    primary_muscle: str
    equipment: str
    tracking_type: TrackingTypeLiteral
    times_performed: int
    best_weight_kg: Optional[float] = None
    best_1rm_kg: Optional[float] = None


class DashboardStatsOut(BaseModel):
    total_workouts: int
    weekly_workout_count: int
    weekly_goal: int
    total_volume_kg: float
    weekly_volume_kg: float
    current_streak_days: int
    longest_streak_days: int
    total_prs: int
    weekly_activity: List[WeeklyActivityPointOut]
    recent_workouts: List[WorkoutOut]
    personal_records: List[PersonalRecordOut]
    favorite_exercises: List[FavoriteExerciseSummaryOut]
    saved_routines: List[RoutineOut]
    active_workout: Optional[WorkoutOut] = None


class FrequencyPointOut(BaseModel):
    period: str
    label: str
    workouts: int
    volume_kg: float
    sets: int


class MuscleDistributionPointOut(BaseModel):
    muscle: str
    sets: int
    volume_kg: float
    percentage: float


class ExerciseProgressPointOut(BaseModel):
    date: str
    workout_id: int
    workout_name: str
    max_weight_kg: float
    best_reps: int
    estimated_1rm_kg: float
    total_volume_kg: float
    best_duration_seconds: int
    best_distance_meters: float
    sets_completed: int


class AnalyticsOverviewOut(BaseModel):
    weekly_frequency: List[FrequencyPointOut]
    monthly_frequency: List[FrequencyPointOut]
    muscle_distribution: List[MuscleDistributionPointOut]
    current_streak_days: int
    longest_streak_days: int
    consistency_rate_30d: float
    total_sets_completed: int
    total_volume_kg: float
    total_workouts: int


# -----------------------
# Admin Panel Schemas
# -----------------------
class AdminUserSummaryOut(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    created_at: datetime
    workouts_completed: int
    total_volume_kg: float
    routines_count: int
    custom_exercises_count: int
    prs_count: int


class AdminPlatformStatsOut(BaseModel):
    total_users: int
    total_completed_workouts: int
    total_sets_logged: int
    total_volume_kg: float
    system_exercises_count: int
    custom_exercises_count: int
    template_routines_count: int
    custom_routines_count: int
    users: List[AdminUserSummaryOut]


class AdminRoleUpdateRequest(BaseModel):
    is_admin: bool
