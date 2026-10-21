import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Dumbbell,
  TrendingUp,
  Trophy,
  BookOpen,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  adminApi,
  exercisesApi,
  routinesApi,
  extractErrorMessage,
} from '../api/client';
import {
  AdminPlatformStats,
  AdminUserSummary,
  Exercise,
  WorkoutRoutine,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { formatVolume, formatDateShort } from '../utils/units';

export const AdminPage: React.FC = () => {
  const { user, weightUnit, showToast } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<AdminPlatformStats | null>(null);
  const [systemExercises, setSystemExercises] = useState<Exercise[]>([]);
  const [starterTemplates, setStarterTemplates] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, allExercises, allRoutines] = await Promise.all([
        adminApi.getOverview(),
        exercisesApi.list(),
        routinesApi.list(),
      ]);
      setOverview(overviewData);
      setSystemExercises(allExercises.filter((e) => e.is_system));
      setStarterTemplates(allRoutines.filter((r) => r.is_template));
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load admin overview'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    loadAdminData();
  }, [user, navigate, loadAdminData]);

  const handleToggleAdminRole = async (targetUser: AdminUserSummary) => {
    if (targetUser.id === user?.id) return;
    setUpdatingUserId(targetUser.id);
    try {
      const updated = await adminApi.updateUserRole(targetUser.id, !targetUser.is_admin);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
            }
          : prev
      );
      showToast(
        updated.is_admin
          ? `Granted Admin privileges to ${updated.name}`
          : `Revoked Admin privileges from ${updated.name}`,
        'success'
      );
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update user role'), 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteTemplate = async (tmpl: WorkoutRoutine) => {
    if (!window.confirm(`Delete global starter template "${tmpl.name}" for all users?`)) {
      return;
    }
    try {
      await routinesApi.remove(tmpl.id);
      setStarterTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
      showToast(`Deleted starter template "${tmpl.name}"`, 'info');
      loadAdminData();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete template'), 'error');
    }
  };

  const handleDeleteSystemExercise = async (ex: Exercise) => {
    if (
      !window.confirm(
        `Delete or archive global system exercise "${ex.name}"? Past workout logs will remain intact.`
      )
    ) {
      return;
    }
    try {
      const res = await exercisesApi.remove(ex.id, true);
      setSystemExercises((prev) => prev.filter((e) => e.id !== ex.id));
      showToast(res.message, 'info');
      loadAdminData();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to remove system exercise'), 'error');
    }
  };

  if (!user?.is_admin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lime-400/15 border border-lime-400/40 flex items-center justify-center text-lime-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                FitTrack Admin Control Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-lime-400 text-charcoal-950">
                Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Monitor registered users, platform-wide workout statistics, global system exercises,
              and ready-made starter templates.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAdminData}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:border-lime-400/50 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-lime-400' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Platform KPI Grid */}
      {loading && !overview ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800"
            />
          ))}
        </div>
      ) : (
        overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Registered Users
                </span>
                <Users className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {overview.total_users}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Active platform accounts
              </p>
            </div>

            <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Completed Workouts
                </span>
                <Dumbbell className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {overview.total_completed_workouts}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview.total_sets_logged.toLocaleString()} total completed sets
              </p>
            </div>

            <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Platform Volume
                </span>
                <TrendingUp className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {formatVolume(overview.total_volume_kg, weightUnit)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Across all registered athletes
              </p>
            </div>

            <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Global Catalog
                </span>
                <Trophy className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {overview.system_exercises_count} Ex / {overview.template_routines_count} Tmpl
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                +{overview.custom_exercises_count} user exercises &amp;{' '}
                {overview.custom_routines_count} user routines
              </p>
            </div>
          </div>
        )
      )}

      {/* Registered Users Table */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-charcoal-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-lime-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Registered Users ({overview?.users.length ?? 0})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            All existing users &amp; historical records preserved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-charcoal-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-charcoal-950/40">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Workouts</th>
                <th className="py-3 px-4">Total Volume</th>
                <th className="py-3 px-4">Custom Routines</th>
                <th className="py-3 px-4">Custom Exercises</th>
                <th className="py-3 px-4">PRs</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Admin Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-charcoal-800 text-xs sm:text-sm">
              {overview?.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50 dark:hover:bg-charcoal-850/60 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">#{u.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-400/20 text-lime-400 border border-lime-400/30">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-charcoal-800 text-slate-400">
                        Athlete
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {u.workouts_completed}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {formatVolume(u.total_volume_kg, weightUnit)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {u.routines_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {u.custom_exercises_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-lime-500 dark:text-lime-400 font-bold">
                    {u.prs_count}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {formatDateShort(u.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id === user.id ? (
                      <span className="text-[11px] text-slate-500 italic">Current Admin</span>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingUserId === u.id}
                        onClick={() => handleToggleAdminRole(u)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                          u.is_admin
                            ? 'border border-red-500/40 text-red-400 hover:bg-red-500/10'
                            : 'border border-lime-400/40 text-lime-400 hover:bg-lime-400/10'
                        }`}
                      >
                        {updatingUserId === u.id
                          ? 'Saving...'
                          : u.is_admin
                          ? 'Revoke Admin'
                          : 'Make Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Catalog Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Starter Routine Templates */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Global Starter Routine Templates ({starterTemplates.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready-made templates available to all users.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/routines')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs hover:bg-lime-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Manage in Routines
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {starterTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {tmpl.name}
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-charcoal-800 text-slate-400">
                      {tmpl.exercises.length} exercises
                    </span>
                  </div>
                  {tmpl.description && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{tmpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/routines')}
                    className="p-1.5 rounded text-slate-400 hover:text-lime-400 hover:bg-charcoal-800"
                    title="Edit Template in Routines Page"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tmpl)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-charcoal-800"
                    title="Delete Global Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global System Exercises */}
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-lime-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Global System Exercises ({systemExercises.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Built-in exercises shared across all users.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/exercises')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs hover:bg-lime-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Manage in Library
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {systemExercises.map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {ex.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ex.primary_muscle} • {ex.equipment}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/exercises')}
                    className="p-1.5 rounded text-slate-400 hover:text-lime-400 hover:bg-charcoal-800"
                    title="Edit System Exercise in Library"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSystemExercise(ex)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-charcoal-800"
                    title="Delete or Archive System Exercise"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
