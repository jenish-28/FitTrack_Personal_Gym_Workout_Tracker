import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlayCircle,
  Dumbbell,
  Flame,
  Calendar,
  TrendingUp,
  Trophy,
  Clock,
  ChevronRight,
  Star,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { statsApi, extractErrorMessage } from '../api/client';
import { DashboardStats } from '../types';
import { formatVolume, formatWeight, formatDuration, toDisplayWeight } from '../utils/units';

export const DashboardPage: React.FC = () => {
  const { user, weightUnit, showToast } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await statsApi.getDashboard();
      setStats(data);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to load dashboard statistics');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-charcoal-900 border border-slate-300 dark:border-charcoal-800" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-slate-200 dark:bg-charcoal-900 border border-slate-300 dark:border-charcoal-800"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-xl bg-slate-200 dark:bg-charcoal-900" />
          <div className="h-80 rounded-xl bg-slate-200 dark:bg-charcoal-900" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center space-y-3">
        <p className="text-sm text-red-300">{error || 'Unable to load dashboard'}</p>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const weeklyGoalPct = Math.min(
    100,
    Math.round((stats.weekly_workout_count / Math.max(1, stats.weekly_goal)) * 100)
  );

  const chartData = stats.weekly_activity.map((pt) => ({
    ...pt,
    displayVolume: Math.round(toDisplayWeight(pt.volume_kg, weightUnit)),
  }));

  return (
    <div className="space-y-6">
      {/* Welcome & Prominent Start Workout Header */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime-400/15 border border-lime-400/40 flex items-center justify-center text-lime-600 dark:text-lime-400 font-extrabold text-lg shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || 'FT'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {user?.name || 'Athlete'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.weekly_workout_count} of {stats.weekly_goal} weekly workouts completed •{' '}
              <span className="text-lime-600 dark:text-lime-400 font-semibold">
                {stats.current_streak_days} day streak
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/routines')}
            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-charcoal-700 bg-slate-100 dark:bg-charcoal-800 hover:border-lime-400/50 text-xs sm:text-sm font-semibold transition-colors"
          >
            Browse Routines
          </button>
          <button
            onClick={() => navigate('/workout')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-sm transition-colors shadow-sm"
          >
            <PlayCircle className="w-4 h-4 stroke-[2.5]" />
            {stats.active_workout ? 'Resume Workout' : 'Start Workout'}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Workouts</span>
            <Dumbbell className="w-4 h-4 text-lime-500 dark:text-lime-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            {stats.total_workouts}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lifetime logged sessions
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">This Week</span>
            <Calendar className="w-4 h-4 text-lime-500 dark:text-lime-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {stats.weekly_workout_count}
            </p>
            <span className="text-xs text-slate-400 font-mono">/ {stats.weekly_goal} goal</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-charcoal-800 rounded-full overflow-hidden mt-2.5">
            <div
              className="h-full bg-lime-400 rounded-full transition-all"
              style={{ width: `${weeklyGoalPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Volume</span>
            <TrendingUp className="w-4 h-4 text-lime-500 dark:text-lime-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            {formatVolume(stats.total_volume_kg, weightUnit)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatVolume(stats.weekly_volume_kg, weightUnit)} this week
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Streak</span>
            <Flame className="w-4 h-4 text-lime-500 dark:text-lime-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            {stats.current_streak_days}{' '}
            <span className="text-sm font-sans font-semibold text-slate-400">days</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Best: {stats.longest_streak_days} days • {stats.total_prs} PRs
          </p>
        </div>
      </div>

      {/* Weekly Activity Chart & Quick Access Routines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Weekly Training Volume ({weightUnit.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last 7 days training output calculated from completed working sets
              </p>
            </div>
            <Link
              to="/progress"
              className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222936" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(163, 230, 53, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0E1116',
                    borderColor: '#222936',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'displayVolume') return [`${value} ${weightUnit}`, 'Volume'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="displayVolume" fill="#A3E635" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Saved Routines Quick Start */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Saved Routines</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">One-tap session launch</p>
            </div>
            <Link
              to="/routines"
              className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:underline flex items-center gap-1"
            >
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-64 pr-1">
            {stats.saved_routines.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-400">No routines created yet.</p>
                <button
                  onClick={() => navigate('/routines')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-charcoal-800 text-lime-400 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Routine
                </button>
              </div>
            ) : (
              stats.saved_routines.slice(0, 5).map((routine) => (
                <div
                  key={routine.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-850 flex items-center justify-between gap-3 hover:border-lime-400/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {routine.name}
                      </p>
                      {routine.is_template && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-charcoal-700 text-slate-600 dark:text-slate-300 font-semibold">
                          Template
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {routine.exercises.length} exercises
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/workout?routineId=${routine.id}`)}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-xs transition-colors"
                  >
                    Start
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom 3-Column Grid: Recent Workouts, Personal Records, Favorite Exercises */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workout History */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Workouts</h2>
            <Link
              to="/history"
              className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {stats.recent_workouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">No completed workouts yet. Start your first session!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_workouts.slice(0, 4).map((w) => (
                <div
                  key={w.id}
                  onClick={() => navigate('/history')}
                  className="p-3 rounded-lg border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-850 hover:border-lime-400/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.name}</p>
                    <span className="text-[11px] text-slate-400">
                      {new Date(w.completed_at || w.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(w.duration_seconds)}
                    </span>
                    <span>•</span>
                    <span>{w.completed_sets_count} sets</span>
                    <span>•</span>
                    <span className="text-lime-600 dark:text-lime-400 font-semibold">
                      {formatVolume(w.total_volume_kg, weightUnit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Records Achieved */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-lime-400" /> Personal Records
            </h2>
            <Link
              to="/records"
              className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:underline"
            >
              All PRs
            </Link>
          </div>
          {stats.personal_records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">
                Complete sets in the Workout Logger to unlock personal records.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.personal_records.slice(0, 4).map((pr) => (
                <div
                  key={pr.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-850 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {pr.exercise_name}
                    </p>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {pr.record_type.replace('_', ' ')} •{' '}
                      {new Date(pr.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-extrabold text-lime-600 dark:text-lime-400">
                      {pr.record_type === 'max_weight' || pr.record_type === 'best_1rm'
                        ? formatWeight(pr.value, weightUnit)
                        : pr.record_type === 'max_reps'
                        ? `${Math.round(pr.value)} reps`
                        : pr.record_type === 'longest_duration'
                        ? formatDuration(pr.value)
                        : `${pr.value}m`}
                    </span>
                    {pr.previous_value ? (
                      <span className="block text-[10px] text-slate-400">
                        Prev:{' '}
                        {pr.record_type === 'max_weight' || pr.record_type === 'best_1rm'
                          ? formatWeight(pr.previous_value, weightUnit)
                          : Math.round(pr.previous_value)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Favorite & Most Performed Exercises */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-lime-400" /> Favorite Exercises
            </h2>
            <Link
              to="/exercises"
              className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:underline"
            >
              Library
            </Link>
          </div>
          {stats.favorite_exercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">
                Star exercises in the library or log workouts to see your top lifts here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.favorite_exercises.slice(0, 4).map((ex) => (
                <div
                  key={ex.exercise_id}
                  onClick={() => navigate(`/progress?exerciseId=${ex.exercise_id}`)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-850 hover:border-lime-400/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {ex.primary_muscle} • {ex.equipment}
                    </p>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    {ex.best_weight_kg ? (
                      <span className="text-xs font-bold text-lime-600 dark:text-lime-400 block">
                        Best: {formatWeight(ex.best_weight_kg, weightUnit)}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-400">
                      {ex.times_performed} {ex.times_performed === 1 ? 'session' : 'sessions'}
                    </span>
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
