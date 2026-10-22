import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
import {
  calculateEpley1RM,
  toDisplayWeight,
  fromDisplayWeight,
  formatVolume,
  formatDuration,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_CATEGORIES,
} from '../utils/units';
import { ExerciseLibraryPage } from '../pages/ExerciseLibraryPage';
import { AuthProvider } from '../context/AuthContext';
import * as apiClient from '../api/client';

describe('FitTrack Strength & Unit Calculations', () => {
  it('calculates Epley 1RM accurately', () => {
    expect(calculateEpley1RM(100, 1)).toBe(100);
    // 100 * (1 + 10/30) = 133.3
    expect(calculateEpley1RM(100, 10)).toBe(133.3);
    expect(calculateEpley1RM(0, 10)).toBe(0);
  });

  it('converts between kilograms and pounds accurately', () => {
    expect(toDisplayWeight(100, 'kg')).toBe(100);
    expect(toDisplayWeight(100, 'lbs')).toBe(220.5);
    const backToKg = fromDisplayWeight(220.46, 'lbs');
    expect(Math.round(backToKg)).toBe(100);
  });

  it('formats volume and durations cleanly', () => {
    expect(formatVolume(2450, 'kg')).toContain('2,450 kg');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(90)).toBe('1m 30s');
  });

  it('includes complete anatomical muscle-group taxonomy without duplicates', () => {
    const uniqueSet = new Set(MUSCLE_GROUPS);
    expect(uniqueSet.size).toBe(MUSCLE_GROUPS.length);
    expect(MUSCLE_GROUP_CATEGORIES.length).toBeGreaterThanOrEqual(8);

    // Verify requested subdivisions across all regions exist
    expect(MUSCLE_GROUPS).toContain('Pectoralis major');
    expect(MUSCLE_GROUPS).toContain('Upper chest / clavicular head');
    expect(MUSCLE_GROUPS).toContain('Latissimus dorsi (lats)');
    expect(MUSCLE_GROUPS).toContain('Trapezius: upper, middle, and lower fibers');
    expect(MUSCLE_GROUPS).toContain('Anterior deltoids');
    expect(MUSCLE_GROUPS).toContain('Rotator cuff');
    expect(MUSCLE_GROUPS).toContain('Brachioradialis');
    expect(MUSCLE_GROUPS).toContain('Triceps brachii: long, lateral, and medial heads');
    expect(MUSCLE_GROUPS).toContain('Obliques: internal and external');
    expect(MUSCLE_GROUPS).toContain('Gluteus medius');
    expect(MUSCLE_GROUPS).toContain('Iliopsoas');
    expect(MUSCLE_GROUPS).toContain('Vastus medialis');
    expect(MUSCLE_GROUPS).toContain('Biceps femoris');
    expect(MUSCLE_GROUPS).toContain('Tibialis anterior');
    expect(MUSCLE_GROUPS).toContain('Olympic lifts / full-body power movements');
    expect(MUSCLE_GROUPS).toContain('Mobility and stretching');
    expect(MUSCLE_GROUPS).toContain('Other');
  });
});

describe('ExerciseLibraryPage CRUD, Taxonomy & Detail View UI Behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.authApi, 'me').mockResolvedValue({
      id: 1,
      email: 'athlete@fittrack.app',
      name: 'Test Athlete',
      created_at: new Date().toISOString(),
      settings: {
        id: 1,
        user_id: 1,
        weight_unit: 'kg',
        theme: 'dark',
        weekly_goal: 4,
        default_rest_seconds: 90,
      },
    });
    vi.spyOn(apiClient.exercisesApi, 'list').mockResolvedValue([
      {
        id: 1,
        name: 'Bench Press',
        primary_muscle: 'Chest',
        secondary_muscles: ['Triceps', 'Anterior deltoids'],
        equipment: 'Barbell',
        category: 'Compound',
        difficulty_level: 'Intermediate',
        tracking_type: 'weight_reps',
        instructions: '1. Lie flat on bench.\n2. Press barbell to lockout.',
        media_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
        is_system: true,
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        name: 'Custom Meadows Row',
        primary_muscle: 'Latissimus dorsi (lats)',
        secondary_muscles: ['Biceps brachii', 'Posterior deltoids'],
        equipment: 'Barbell',
        category: 'Hypertrophy',
        difficulty_level: 'Advanced',
        tracking_type: 'weight_reps',
        is_system: false,
        is_archived: false,
        usage_count: 2,
        routine_count: 1,
        created_at: new Date().toISOString(),
      },
    ]);
    vi.spyOn(apiClient.statsApi, 'getExerciseProgress').mockResolvedValue([
      {
        workout_id: 10,
        workout_name: 'Push Day',
        date: new Date().toISOString(),
        max_weight_kg: 100,
        best_reps: 5,
        estimated_1rm_kg: 116.7,
        total_volume_kg: 1500,
        best_duration_seconds: 0,
        best_distance_meters: 0,
        sets_completed: 3,
      },
    ]);
    vi.spyOn(apiClient.statsApi, 'getPersonalRecords').mockResolvedValue([]);
  });

  it('renders system and custom exercises, expanded muscle options, and Exercise Detail view', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ExerciseLibraryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Custom Meadows Row').length).toBeGreaterThan(0);
    });

    // System exercise does not show Edit/Delete buttons, Custom exercise does
    expect(screen.getByLabelText('Edit Custom Meadows Row')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Bench Press')).not.toBeInTheDocument();

    // Open Add Exercise modal and verify expanded muscle taxonomy & image upload control
    fireEvent.click(screen.getByRole('button', { name: /Add Exercise/i }));
    expect(screen.getByText('Add Custom Exercise')).toBeInTheDocument();
    expect(screen.getByText(/Demonstration Image or Animated GIF/i)).toBeInTheDocument();
    expect(screen.getAllByText('Upper chest / clavicular head').length).toBeGreaterThan(0);

    // Close modal and open Hevy-inspired Exercise Detail modal for Bench Press
    fireEvent.click(screen.getByLabelText('Close modal'));
    fireEvent.click(screen.getAllByText('Bench Press')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Secondary Synergist Muscles/i)).toBeInTheDocument();
      expect(screen.getByText(/Summary & Muscles/i)).toBeInTheDocument();
      expect(screen.getByText(/How To & Form/i)).toBeInTheDocument();
    });

    // Open Archive/Delete confirmation modal for custom exercise used in history
    fireEvent.click(screen.getByLabelText('Close detail view'));
    fireEvent.click(screen.getByLabelText('Delete Custom Meadows Row'));
    expect(screen.getByText('Archive Custom Exercise?')).toBeInTheDocument();
  });
});
