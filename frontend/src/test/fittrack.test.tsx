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
import { RoutinesPage } from '../pages/RoutinesPage';
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

  it('supports hierarchical muscle filtering: single-category expansion, parent/child selection, search, secondary-muscle matching, and clearing', async () => {
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

    const filterTrigger = screen.getByLabelText('Filter by muscle group');
    expect(filterTrigger).toHaveTextContent('All Muscle Groups');

    // 1. Open dropdown and verify top-level categories
    fireEvent.click(filterTrigger);
    expect(screen.getByLabelText('Search muscle groups')).toBeInTheDocument();
    for (const cat of [
      'Chest',
      'Back',
      'Shoulders',
      'Arms',
      'Core & Abs',
      'Glutes & Hips',
      'Legs',
      'Neck',
      'Full Body',
      'Cardio',
      'Mobility & Stretching',
      'Other',
    ]) {
      expect(screen.getByRole('button', { name: cat })).toBeInTheDocument();
    }

    // 2. Click Chest -> expands Chest children
    fireEvent.click(screen.getByRole('button', { name: 'Chest' }));
    expect(screen.getByRole('option', { name: 'All Chest Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pectoralis Major' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Upper Chest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Middle Chest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lower Chest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pectoralis Minor' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Serratus Anterior' })).toBeInTheDocument();

    // 3. Click Back -> collapses Chest and expands Back (only one category expanded at a time)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('option', { name: 'All Chest Muscles' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All Back Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Latissimus Dorsi (Lats)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rhomboids' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Trapezius' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Erector Spinae' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Teres Major' })).toBeInTheDocument();

    // 4. Select parent category Back ("All Back Muscles") -> filters exercises by Back & descendants
    fireEvent.click(screen.getByRole('option', { name: 'All Back Muscles' }));
    expect(filterTrigger).toHaveTextContent('Back');
    expect(screen.getAllByText('Custom Meadows Row').length).toBeGreaterThan(0);
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();

    // 5. Reopen dropdown, search for a secondary muscle ("Anterior Deltoids"), auto-reveal Shoulders, and select it
    fireEvent.click(filterTrigger);
    const searchInput = screen.getByLabelText('Search muscle groups');
    fireEvent.change(searchInput, { target: { value: 'Anterior Deltoids' } });
    expect(screen.getByRole('option', { name: 'Anterior Deltoids' })).toBeInTheDocument();

    // Test "No muscles found" message when searching non-existent term
    fireEvent.change(searchInput, { target: { value: 'nonexistentmusclexyz' } });
    expect(screen.getByText('No muscles found')).toBeInTheDocument();

    // Search "Anterior Deltoids" and select child muscle -> matches Bench Press via secondary_muscles!
    fireEvent.change(searchInput, { target: { value: 'Anterior Deltoids' } });
    fireEvent.click(screen.getByRole('option', { name: 'Anterior Deltoids' }));
    expect(filterTrigger).toHaveTextContent('Anterior Deltoids');
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.queryByText('Custom Meadows Row')).not.toBeInTheDocument();

    // 6. Clear filter by selecting "All Muscle Groups" -> restores full list
    fireEvent.click(filterTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'All Muscle Groups' }));
    expect(filterTrigger).toHaveTextContent('All Muscle Groups');
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Custom Meadows Row').length).toBeGreaterThan(0);
  });

  it('uses the same unified hierarchical muscle selector inside the Routines Add Exercise picker', async () => {
    vi.spyOn(apiClient.routinesApi, 'list').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <RoutinesPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Custom Routine/i })).toBeInTheDocument();
    });

    // Open Create Workout Routine modal, then open Add Exercise picker
    fireEvent.click(screen.getByRole('button', { name: /New Custom Routine/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add Exercise/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Custom Meadows Row').length).toBeGreaterThan(0);
    });

    const pickerFilter = screen.getByLabelText('Filter picker by muscle group');
    expect(pickerFilter).toHaveTextContent('All Muscle Groups');

    // Open hierarchical dropdown in Routines picker and expand Back
    fireEvent.click(pickerFilter);
    expect(screen.getByLabelText('Search muscle groups')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('option', { name: 'All Back Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Latissimus Dorsi (Lats)' })).toBeInTheDocument();

    // Select specific child muscle "Latissimus Dorsi (Lats)"
    fireEvent.click(screen.getByRole('option', { name: 'Latissimus Dorsi (Lats)' }));
    expect(pickerFilter).toHaveTextContent('Latissimus Dorsi (Lats)');
    expect(screen.getAllByText('Custom Meadows Row').length).toBeGreaterThan(0);
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();

    // Clear filter in picker and select an exercise to add to the routine
    fireEvent.click(pickerFilter);
    fireEvent.click(screen.getByRole('option', { name: 'All Muscle Groups' }));
    expect(pickerFilter).toHaveTextContent('All Muscle Groups');
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText('Bench Press')[0]);
    expect(screen.getByText(/1\. Bench Press/i)).toBeInTheDocument();
  });
});
