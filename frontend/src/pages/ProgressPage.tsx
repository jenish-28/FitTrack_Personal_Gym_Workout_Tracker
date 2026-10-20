import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Flame,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { statsApi, exercisesApi, extractErrorMessage } from '../api/client';
import { AnalyticsOverview, Exercise, ExerciseProgressPoint } from '../types';
import { useAuth } from '../context/AuthContext';
import { toDisplayWeight, formatVolume, formatWeight } from '../utils/units';

export const ProgressPage: React.FC = () => {
  const { weightUnit, showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [periodMode, setPeriodMode] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  const loadInitialAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, exList] = await Promise.all([
        statsApi.getAnalytics(),
        exercisesApi.list({ include_archived: true }),
      ]);
      setOverview(analyticsRes);
      setExercises(exList);

      const paramExId = searchParams.get('exerciseId');
      if (paramExId && exList.some((e) => e.id === Number(paramExId))) {
        setSelectedExerciseId(Number(paramExId));
      } else if (exList.length > 0) {
        const bench = exList.find((e) => e.name.toLowerCase() === 'bench press') || exList[0];
        setSelectedExerciseId(bench.id);
      }
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load analytics'), 'error');
    } finally {
      setLoading(false);
    }
  }, [searchParams, showToast]);

  useEffect(() => {
    loadInitialAnalytics();
  }, [loadInitialAnalytics]);

  useEffect(() => {
    if (!selectedExerciseId) return;
    statsApi
      .getExerciseProgress(selectedExerciseId)
      .then((pts) => setProgressData(pts))
      .catch(() => setProgressData([]));
  }, [selectedExerciseId]);

  if (loading || !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-charcoal-900 border border-charcoal-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl bg-charcoal-900" />
          <div className="h-80 rounded-xl bg-charcoal-900" />
        </div>
      </div>
    );
  }

  const frequencySource =
    periodMode === 'weekly' ? overview.weekly_frequency : overview.monthly_frequency;

  const freqChartData = frequencySource.map((pt) => ({
    ...pt,
    displayVolume: Math.round(toDisplayWeight(pt.volume_kg, weightUnit)),
  }));

  const exerciseChartData = progressData.map((pt) => ({
    ...pt,
    displayMaxWeight: toDisplayWeight(pt.max_weight_kg, weightUnit),
    display1RM: toDisplayWeight(pt.estimated_1rm_kg, weightUnit),
    displayVolume: Math.round(toDisplayWeight(pt.total_volume_kg, weightUnit)),
  }));

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Progress &amp; Statistics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Visualize training volume, workout consistency, muscle distribution, and Epley 1RM
          strength progression.
        </p>
      </div>

      {/* Consistency & Volume KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {overview.current_streak_days} days
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Longest streak: {overview.longest_streak_days} days
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>30-Day Consistency</span>
            <Calendar className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {overview.consistency_rate_30d}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {overview.total_workouts} completed sessions
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Working Sets Logged</span>
            <Layers className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {overview.total_sets_completed}
          </p>
          <p className="text-xs text-slate-400 mt-1">Excludes warm-up sets</p>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Cumulative Volume</span>
            <Activity className="w-4 h-4 text-lime-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-lime-500 dark:text-lime-400">
            {formatVolume(overview.total_volume_kg, weightUnit)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Weighted working sets</p>
        </div>
      </div>

      {/* Exercise-Specific Progression Section */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lime-400" /> Exercise Progression &amp; Estimated
              1RM
            </h2>
            <p className="text-xs text-slate-400">
              Estimated One-Rep Max calculated via the documented{' '}
              <strong>Epley Formula</strong>: <code>1RM = Weight × (1 + Reps / 30)</code>
            </p>
          </div>

          <select
            value={selectedExerciseId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedExerciseId(id);
              setSearchParams({ exerciseId: String(id) }, { replace: true });
            }}
            aria-label="Select exercise for progression analysis"
            className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm font-semibold focus:outline-none focus:border-lime-400"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.primary_muscle})
              </option>
            ))}
          </select>
        </div>

        {exerciseChartData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-charcoal-800 rounded-xl">
            No completed working sets recorded yet for{' '}
            <strong>{selectedExercise?.name || 'this exercise'}</strong>. Log a session in the
            Workout Logger to see progression curves.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weight & Estimated 1RM Line Chart */}
            <div className="h-72">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Heaviest Weight vs. Estimated 1RM ({weightUnit.toUpperCase()})
              </p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={exerciseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222936" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E1116',
                      borderColor: '#222936',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="displayMaxWeight"
                    name={`Max Weight (${weightUnit})`}
                    stroke="#A3E635"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#A3E635' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="display1RM"
                    name={`Est. 1RM (Epley, ${weightUnit})`}
                    stroke="#38BDF8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#38BDF8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Best Reps & Session Volume Chart */}
            <div className="h-72">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Session Volume ({weightUnit.toUpperCase()}) &amp; Best Repetitions
              </p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={exerciseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222936" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E1116',
                      borderColor: '#222936',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="displayVolume"
                    name={`Session Volume (${weightUnit})`}
                    fill="#A3E635"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="best_reps"
                    name="Best Reps"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Frequency, Volume Over Time & Muscle Group Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequency & Volume Over Time */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Workout Frequency &amp; Volume Over Time
              </h2>
              <p className="text-xs text-slate-400">
                Compare training consistency by week or month
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-charcoal-950 p-1 border border-slate-200 dark:border-charcoal-800">
              <button
                type="button"
                onClick={() => setPeriodMode('weekly')}
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  periodMode === 'weekly'
                    ? 'bg-lime-400 text-charcoal-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('monthly')}
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  periodMode === 'monthly'
                    ? 'bg-lime-400 text-charcoal-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222936" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1116',
                    borderColor: '#222936',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="workouts"
                  name="Workouts"
                  fill="#A3E635"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="displayVolume"
                  name={`Volume (${weightUnit})`}
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Sets per Muscle Group */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Total Sets per Muscle Group
            </h2>
            <p className="text-xs text-slate-400">
              Working set distribution across targeted muscle groups
            </p>
          </div>

          {overview.muscle_distribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Complete workouts to see muscle group distribution.
            </div>
          ) : (
            <div className="space-y-3">
              {overview.muscle_distribution.map((item) => (
                <div key={item.muscle} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.muscle}
                    </span>
                    <span className="font-mono text-slate-400">
                      {item.sets} sets ({item.percentage}%) •{' '}
                      {formatWeight(item.volume_kg, weightUnit)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-charcoal-800 overflow-hidden">
                    <div
                      className="h-full bg-lime-400 rounded-full"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
