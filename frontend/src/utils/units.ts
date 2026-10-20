import { WeightUnit, TrackingType } from '../types';

export const KG_TO_LBS = 2.2046226218;

export function toDisplayWeight(weightKg: number | null | undefined, unit: WeightUnit): number {
  if (weightKg === null || weightKg === undefined || Number.isNaN(weightKg)) return 0;
  if (unit === 'lbs') {
    return Math.round(weightKg * KG_TO_LBS * 10) / 10;
  }
  return Math.round(weightKg * 10) / 10;
}

export function fromDisplayWeight(displayVal: number | null | undefined, unit: WeightUnit): number {
  if (displayVal === null || displayVal === undefined || Number.isNaN(displayVal)) return 0;
  if (unit === 'lbs') {
    return Math.round((displayVal / KG_TO_LBS) * 100) / 100;
  }
  return Math.round(displayVal * 100) / 100;
}

export function formatWeight(weightKg: number | null | undefined, unit: WeightUnit): string {
  if (weightKg === null || weightKg === undefined) return `0 ${unit}`;
  const val = toDisplayWeight(weightKg, unit);
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

export function formatVolume(volumeKg: number | null | undefined, unit: WeightUnit): string {
  if (!volumeKg) return `0 ${unit}`;
  const val = unit === 'lbs' ? volumeKg * KG_TO_LBS : volumeKg;
  if (val >= 100000) {
    return `${(val / 1000).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(val).toLocaleString()} ${unit}`;
}

/**
 * Epley Formula for Estimated One-Rep Max (1RM):
 * 1RM = weight * (1 + reps / 30) for reps > 1, or weight for reps === 1
 */
export function calculateEpley1RM(weightKg: number | null | undefined, reps: number | null | undefined): number {
  if (!weightKg || !reps || weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return secs > 0 && mins < 10 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Full Body',
  'Cardio',
] as const;

export const EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'EZ Bar',
  'Band',
  'Smith Machine',
  'Other',
] as const;

export const EXERCISE_CATEGORIES = [
  'Strength',
  'Hypertrophy',
  'Bodyweight',
  'Core',
  'Cardio',
  'Mobility',
] as const;

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Weight & Reps (Weighted)',
  reps_only: 'Reps Only (Bodyweight)',
  duration: 'Duration (Time)',
  distance: 'Distance & Duration',
};
