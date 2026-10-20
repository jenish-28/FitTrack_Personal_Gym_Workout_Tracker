import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  calculateEpley1RM,
  toDisplayWeight,
  fromDisplayWeight,
  formatVolume,
  formatDuration,
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
});

describe('ExerciseLibraryPage CRUD UI Behavior', () => {
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
        secondary_muscles: ['Triceps'],
        equipment: 'Barbell',
        category: 'Strength',
        tracking_type: 'weight_reps',
        is_system: true,
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        name: 'Custom Meadows Row',
        primary_muscle: 'Back',
        secondary_muscles: ['Biceps'],
        equipment: 'Barbell',
        category: 'Hypertrophy',
        tracking_type: 'weight_reps',
        is_system: false,
        is_archived: false,
        usage_count: 2,
        routine_count: 1,
        created_at: new Date().toISOString(),
      },
    ]);
  });

  it('renders system and custom exercises and opens Add Exercise modal', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ExerciseLibraryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Custom Meadows Row')).toBeInTheDocument();
    });

    // System exercise does not show Edit/Delete buttons, Custom exercise does
    expect(screen.getByLabelText('Edit Custom Meadows Row')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Bench Press')).not.toBeInTheDocument();

    // Open Add Exercise modal
    fireEvent.click(screen.getByRole('button', { name: /Add Exercise/i }));
    expect(screen.getByText('Add Custom Exercise')).toBeInTheDocument();

    // Open Archive/Delete confirmation modal for custom exercise used in history
    fireEvent.click(screen.getByLabelText('Close modal'));
    fireEvent.click(screen.getByLabelText('Delete Custom Meadows Row'));
    expect(screen.getByText('Archive Custom Exercise?')).toBeInTheDocument();
  });
});
