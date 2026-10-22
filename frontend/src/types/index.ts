export type WeightUnit = 'kg' | 'lbs';
export type ThemeMode = 'dark' | 'light';
export type TrackingType = 'weight_reps' | 'reps_only' | 'duration' | 'distance';
export type SetType = 'warmup' | 'working' | 'dropset' | 'failure';
export type WorkoutStatus = 'in_progress' | 'completed' | 'cancelled';
export type RecordType = 'max_weight' | 'best_1rm' | 'max_reps' | 'longest_duration' | 'max_distance';

export interface UserSettings {
  id: number;
  user_id: number;
  weight_unit: WeightUnit;
  theme: ThemeMode;
  weekly_goal: number;
  default_rest_seconds: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  is_admin?: boolean;
  created_at: string;
  settings: UserSettings;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Exercise {
  id: number;
  user_id?: number | null;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  category: string;
  difficulty_level?: string | null;
  tracking_type: TrackingType;
  instructions?: string | null;
  media_url?: string | null;
  is_system: boolean;
  is_archived: boolean;
  is_favorite?: boolean;
  usage_count?: number;
  routine_count?: number;
  created_at: string;
}

export interface ExerciseCreateInput {
  name: string;
  primary_muscle: string;
  secondary_muscles?: string[];
  equipment: string;
  category?: string;
  difficulty_level?: string;
  tracking_type: TrackingType;
  instructions?: string;
  media_url?: string;
  is_system?: boolean;
}

export interface ExerciseUpdateInput {
  name?: string;
  primary_muscle?: string;
  secondary_muscles?: string[];
  equipment?: string;
  category?: string;
  difficulty_level?: string;
  tracking_type?: TrackingType;
  instructions?: string;
  media_url?: string;
}

export interface ExerciseDeleteResponse {
  action: 'deleted' | 'archived';
  message: string;
  removed_from_routines: number;
  exercise_id: number;
}

export interface RoutineExerciseItem {
  id?: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps?: number | null;
  target_weight_kg?: number | null;
  target_duration_seconds?: number | null;
  target_distance_meters?: number | null;
  rest_seconds: number;
  notes?: string | null;
  exercise?: Exercise;
}

export interface WorkoutRoutine {
  id: number;
  user_id?: number | null;
  name: string;
  description?: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  exercises: RoutineExerciseItem[];
}

export interface WorkoutSetItem {
  id?: number;
  workout_exercise_id?: number;
  set_number: number;
  set_type: SetType;
  weight_kg?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  is_completed: boolean;
  is_pr: boolean;
  completed_at?: string | null;
}

export interface PreviousSetPerformance {
  set_number: number;
  weight_kg?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  achieved_at?: string | null;
}

export interface WorkoutExerciseItem {
  id?: number;
  workout_id?: number;
  exercise_id: number;
  exercise_name_snapshot: string;
  tracking_type_snapshot: TrackingType;
  primary_muscle_snapshot?: string;
  equipment_snapshot?: string;
  order_index: number;
  rest_seconds: number;
  notes?: string | null;
  sets: WorkoutSetItem[];
  previous_sets?: PreviousSetPerformance[];
}

export interface PersonalRecordItem {
  id: number;
  user_id: number;
  exercise_id: number;
  exercise_name: string;
  primary_muscle: string;
  workout_id: number;
  workout_set_id?: number | null;
  record_type: RecordType;
  value: number;
  weight_kg?: number | null;
  reps?: number | null;
  previous_value?: number | null;
  achieved_at: string;
}

export interface Workout {
  id: number;
  user_id: number;
  routine_id?: number | null;
  name: string;
  status: WorkoutStatus;
  started_at: string;
  completed_at?: string | null;
  duration_seconds: number;
  notes?: string | null;
  total_volume_kg: number;
  completed_sets_count: number;
  completed_exercises_count: number;
  pr_count: number;
  exercises: WorkoutExerciseItem[];
  new_records?: PersonalRecordItem[];
}

export interface WeeklyActivityPoint {
  day: string;
  date: string;
  workouts: number;
  volume_kg: number;
  duration_minutes: number;
}

export interface FavoriteExerciseSummary {
  exercise_id: number;
  name: string;
  primary_muscle: string;
  equipment: string;
  tracking_type: TrackingType;
  times_performed: number;
  best_weight_kg?: number | null;
  best_1rm_kg?: number | null;
}

export interface DashboardStats {
  total_workouts: number;
  weekly_workout_count: number;
  weekly_goal: number;
  total_volume_kg: number;
  weekly_volume_kg: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_prs: number;
  weekly_activity: WeeklyActivityPoint[];
  recent_workouts: Workout[];
  personal_records: PersonalRecordItem[];
  favorite_exercises: FavoriteExerciseSummary[];
  saved_routines: WorkoutRoutine[];
  active_workout?: Workout | null;
}

export interface FrequencyPoint {
  period: string;
  label: string;
  workouts: number;
  volume_kg: number;
  sets: number;
}

export interface MuscleDistributionPoint {
  muscle: string;
  sets: number;
  volume_kg: number;
  percentage: number;
}

export interface ExerciseProgressPoint {
  date: string;
  workout_id: number;
  workout_name: string;
  max_weight_kg: number;
  best_reps: number;
  estimated_1rm_kg: number;
  total_volume_kg: number;
  best_duration_seconds: number;
  best_distance_meters: number;
  sets_completed: number;
}

export interface AnalyticsOverview {
  weekly_frequency: FrequencyPoint[];
  monthly_frequency: FrequencyPoint[];
  muscle_distribution: MuscleDistributionPoint[];
  current_streak_days: number;
  longest_streak_days: number;
  consistency_rate_30d: number;
  total_sets_completed: number;
  total_volume_kg: number;
  total_workouts: number;
}

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  workouts_completed: number;
  total_volume_kg: number;
  routines_count: number;
  custom_exercises_count: number;
  prs_count: number;
}

export interface AdminPlatformStats {
  total_users: number;
  total_completed_workouts: number;
  total_sets_logged: number;
  total_volume_kg: number;
  system_exercises_count: number;
  custom_exercises_count: number;
  template_routines_count: number;
  custom_routines_count: number;
  users: AdminUserSummary[];
}
