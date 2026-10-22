import axios from 'axios';
import {
  AuthResponse,
  User,
  UserSettings,
  Exercise,
  ExerciseCreateInput,
  ExerciseUpdateInput,
  ExerciseDeleteResponse,
  WorkoutRoutine,
  Workout,
  DashboardStats,
  AnalyticsOverview,
  ExerciseProgressPoint,
  PersonalRecordItem,
  PreviousSetPerformance,
  AdminPlatformStats,
  AdminUserSummary,
} from '../types';

const TOKEN_KEY = 'fittrack_jwt_token';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// Auth API
export const authApi = {
  register: async (payload: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  login: async (payload: { email: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  demoLogin: async (): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/demo');
    return data;
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// Exercise Library API
export const exercisesApi = {
  list: async (params?: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
    tracking_type?: string;
    custom_only?: boolean;
    include_archived?: boolean;
  }): Promise<Exercise[]> => {
    const { data } = await api.get<Exercise[]>('/exercises', { params });
    return data;
  },
  get: async (id: number): Promise<Exercise> => {
    const { data } = await api.get<Exercise>(`/exercises/${id}`);
    return data;
  },
  create: async (payload: ExerciseCreateInput): Promise<Exercise> => {
    const { data } = await api.post<Exercise>('/exercises', payload);
    return data;
  },
  update: async (id: number, payload: ExerciseUpdateInput): Promise<Exercise> => {
    const { data } = await api.patch<Exercise>(`/exercises/${id}`, payload);
    return data;
  },
  remove: async (id: number, removeFromRoutines = true): Promise<ExerciseDeleteResponse> => {
    const { data } = await api.delete<ExerciseDeleteResponse>(`/exercises/${id}`, {
      params: { remove_from_routines: removeFromRoutines },
    });
    return data;
  },
  toggleFavorite: async (id: number): Promise<{ is_favorite: boolean }> => {
    const { data } = await api.post<{ is_favorite: boolean }>(`/exercises/${id}/favorite`);
    return data;
  },
  uploadMedia: async (id: number, file: File): Promise<Exercise> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<Exercise>(`/exercises/${id}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  deleteMedia: async (id: number): Promise<Exercise> => {
    const { data } = await api.delete<Exercise>(`/exercises/${id}/media`);
    return data;
  },
};

// Routines API
export const routinesApi = {
  list: async (): Promise<WorkoutRoutine[]> => {
    const { data } = await api.get<WorkoutRoutine[]>('/routines');
    return data;
  },
  create: async (payload: {
    name: string;
    description?: string;
    is_template?: boolean;
    exercises: Array<{
      exercise_id: number;
      order_index: number;
      target_sets: number;
      target_reps?: number | null;
      target_weight_kg?: number | null;
      rest_seconds?: number;
      notes?: string | null;
    }>;
  }): Promise<WorkoutRoutine> => {
    const { data } = await api.post<WorkoutRoutine>('/routines', payload);
    return data;
  },
  update: async (
    id: number,
    payload: {
      name?: string;
      description?: string;
      exercises?: Array<{
        exercise_id: number;
        order_index: number;
        target_sets: number;
        target_reps?: number | null;
        target_weight_kg?: number | null;
        rest_seconds?: number;
        notes?: string | null;
      }>;
    }
  ): Promise<WorkoutRoutine> => {
    const { data } = await api.patch<WorkoutRoutine>(`/routines/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/routines/${id}`);
  },
  duplicate: async (id: number): Promise<WorkoutRoutine> => {
    const { data } = await api.post<WorkoutRoutine>(`/routines/${id}/duplicate`);
    return data;
  },
};

// Workouts API
export const workoutsApi = {
  getActive: async (): Promise<Workout | null> => {
    const { data } = await api.get<Workout | null>('/workouts/active');
    return data;
  },
  start: async (payload: { name?: string; routine_id?: number | null }): Promise<Workout> => {
    const { data } = await api.post<Workout>('/workouts', payload);
    return data;
  },
  get: async (id: number): Promise<Workout> => {
    const { data } = await api.get<Workout>(`/workouts/${id}`);
    return data;
  },
  syncWorkout: async (
    id: number,
    payload: {
      name?: string;
      notes?: string | null;
      duration_seconds?: number;
      started_at?: string;
      exercises: Array<{
        exercise_id: number;
        order_index: number;
        rest_seconds?: number;
        notes?: string | null;
        sets: Array<{
          set_number: number;
          set_type: string;
          weight_kg?: number | null;
          reps?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          is_completed: boolean;
        }>;
      }>;
    }
  ): Promise<Workout> => {
    const { data } = await api.put<Workout>(`/workouts/${id}`, payload);
    return data;
  },
  finish: async (
    id: number,
    payload: {
      name?: string;
      notes?: string | null;
      duration_seconds?: number;
      exercises: Array<{
        exercise_id: number;
        order_index: number;
        rest_seconds?: number;
        notes?: string | null;
        sets: Array<{
          set_number: number;
          set_type: string;
          weight_kg?: number | null;
          reps?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          is_completed: boolean;
        }>;
      }>;
    }
  ): Promise<Workout> => {
    const { data } = await api.post<Workout>(`/workouts/${id}/finish`, payload);
    return data;
  },
  cancel: async (id: number): Promise<void> => {
    await api.post(`/workouts/${id}/cancel`);
  },
  listHistory: async (params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
    muscle?: string;
    limit?: number;
    offset?: number;
  }): Promise<Workout[]> => {
    const { data } = await api.get<Workout[]>('/workouts', { params });
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/workouts/${id}`);
  },
  getPreviousSets: async (exerciseId: number): Promise<PreviousSetPerformance[]> => {
    const { data } = await api.get<PreviousSetPerformance[]>(`/workouts/previous/${exerciseId}`);
    return data;
  },
};

// Stats & Records API
export const statsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/stats/dashboard');
    return data;
  },
  getAnalytics: async (): Promise<AnalyticsOverview> => {
    const { data } = await api.get<AnalyticsOverview>('/stats/analytics');
    return data;
  },
  getExerciseProgress: async (exerciseId: number): Promise<ExerciseProgressPoint[]> => {
    const { data } = await api.get<ExerciseProgressPoint[]>(`/stats/exercises/${exerciseId}/progress`);
    return data;
  },
  getPersonalRecords: async (exerciseId?: number): Promise<PersonalRecordItem[]> => {
    const { data } = await api.get<PersonalRecordItem[]>('/records', {
      params: exerciseId ? { exercise_id: exerciseId } : undefined,
    });
    return data;
  },
};

// Settings & User Profile API
export const settingsApi = {
  updateSettings: async (payload: Partial<UserSettings>): Promise<UserSettings> => {
    const { data } = await api.patch<UserSettings>('/settings', payload);
    return data;
  },
  updateProfile: async (payload: {
    name?: string;
    email?: string;
    bio?: string | null;
    avatar_url?: string | null;
    current_password?: string;
    new_password?: string;
  }): Promise<User> => {
    const { data } = await api.patch<User>('/users/me', payload);
    return data;
  },
  deleteAccount: async (password?: string): Promise<void> => {
    await api.delete('/users/me', { data: { password } });
  },
};

// Admin Panel API
export const adminApi = {
  getOverview: async (): Promise<AdminPlatformStats> => {
    const { data } = await api.get<AdminPlatformStats>('/admin/overview');
    return data;
  },
  updateUserRole: async (userId: number, is_admin: boolean): Promise<AdminUserSummary> => {
    const { data } = await api.patch<AdminUserSummary>(`/admin/users/${userId}/role`, { is_admin });
    return data;
  },
};
