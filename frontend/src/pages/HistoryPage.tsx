import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Dumbbell,
  Trash2,
  Edit3,
  Eye,
  X,
  Trophy,
  Plus,
} from 'lucide-react';
import { workoutsApi, extractErrorMessage } from '../api/client';
import { Workout, WorkoutExerciseItem, WorkoutSetItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  formatDuration,
  formatVolume,
  formatWeight,
  toDisplayWeight,
  fromDisplayWeight,
  MUSCLE_GROUPS,
} from '../utils/units';

export const HistoryPage: React.FC = () => {
  const { weightUnit, showToast } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');

  // Detail / Edit Modal
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExercises, setEditExercises] = useState<WorkoutExerciseItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const list = await workoutsApi.listHistory({
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        muscle: muscleFilter !== 'All' ? muscleFilter : undefined,
      });
      setWorkouts(list);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load workout history'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, muscleFilter, showToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openDetail = (w: Workout, editMode = false) => {
    setSelectedWorkout(w);
    setIsEditing(editMode);
    setEditName(w.name);
    setEditNotes(w.notes || '');
    setEditExercises(JSON.parse(JSON.stringify(w.exercises)));
  };

  const handleSaveHistoricalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout) return;
    setSavingEdit(true);
    try {
      const updated = await workoutsApi.syncWorkout(selectedWorkout.id, {
        name: editName.trim() || selectedWorkout.name,
        notes: editNotes.trim() || null,
        duration_seconds: selectedWorkout.duration_seconds,
        exercises: editExercises.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          order_index: idx,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          sets: ex.sets.map((s, sIdx) => ({
            set_number: sIdx + 1,
            set_type: s.set_type,
            weight_kg: s.weight_kg,
            reps: s.reps,
            duration_seconds: s.duration_seconds,
            distance_meters: s.distance_meters,
            is_completed: s.is_completed,
          })),
        })),
      });
      setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setSelectedWorkout(updated);
      setIsEditing(false);
      showToast('Historical workout updated and statistics recalculated', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update workout'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkout) return;
    try {
      await workoutsApi.remove(deletingWorkout.id);
      setWorkouts((prev) => prev.filter((w) => w.id !== deletingWorkout.id));
      if (selectedWorkout?.id === deletingWorkout.id) {
        setSelectedWorkout(null);
      }
      setDeletingWorkout(null);
      showToast('Workout deleted from history', 'info');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete workout'), 'error');
    }
  };

  const updateEditSet = (exIdx: number, sIdx: number, changes: Partial<WorkoutSetItem>) => {
    setEditExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...ex.sets];
      sets[sIdx] = { ...sets[sIdx], ...changes };
      ex.sets = sets;
      next[exIdx] = ex;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Workout History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Review chronological training sessions, inspect set details, or edit historical logs.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workout name..."
            aria-label="Search workout history"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          />
        </div>

        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          aria-label="Filter by workout muscle group"
          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
        >
          <option value="All">All Workout Types / Muscles</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From Date"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To Date"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          />
          {(search || dateFrom || dateTo || muscleFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDateFrom('');
                setDateTo('');
                setMuscleFilter('All');
              }}
              className="px-2.5 py-2 rounded-lg bg-charcoal-800 text-xs text-slate-300 hover:text-white shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Workouts List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-charcoal-900 border border-charcoal-800" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No completed workouts found
          </p>
          <p className="text-xs text-slate-400">
            Complete a workout in the Workout Logger or adjust your date filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 hover:border-lime-400/40 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3
                      onClick={() => openDetail(w, false)}
                      className="text-base font-extrabold text-slate-900 dark:text-white hover:text-lime-400 cursor-pointer"
                    >
                      {w.name}
                    </h3>
                    {w.pr_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-lime-400/15 text-lime-400 border border-lime-400/30">
                        <Trophy className="w-3 h-3" /> {w.pr_count} PR{w.pr_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(w.completed_at || w.started_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(w, false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetail(w, true)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:text-lime-400"
                    title="Edit Workout"
                    aria-label={`Edit ${w.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingWorkout(w)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:text-red-400"
                    title="Delete Workout"
                    aria-label={`Delete ${w.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* KPI Pill Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-lime-400" />
                  {formatDuration(w.duration_seconds)}
                </span>
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
                  <Dumbbell className="w-3.5 h-3.5 text-lime-400" />
                  {w.completed_exercises_count} exercises
                </span>
                <span className="text-slate-500 dark:text-slate-300">
                  {w.completed_sets_count} sets
                </span>
                <span className="font-bold text-lime-600 dark:text-lime-400">
                  Volume: {formatVolume(w.total_volume_kg, weightUnit)}
                </span>
              </div>

              {/* Compact Exercise Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-charcoal-800">
                {w.exercises.map((ex) => {
                  const completedSets = ex.sets.filter((s) => s.is_completed);
                  const bestSet = completedSets[completedSets.length - 1];
                  return (
                    <div
                      key={ex.id}
                      className="text-xs flex items-center justify-between bg-slate-50 dark:bg-charcoal-850 px-3 py-1.5 rounded-md"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                        {completedSets.length} × {ex.exercise_name_snapshot}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {bestSet
                          ? ex.tracking_type_snapshot === 'weight_reps'
                            ? `${formatWeight(bestSet.weight_kg, weightUnit)} × ${bestSet.reps ?? 0}`
                            : ex.tracking_type_snapshot === 'reps_only'
                            ? `${bestSet.reps ?? 0} reps`
                            : ex.tracking_type_snapshot === 'duration'
                            ? `${bestSet.duration_seconds ?? 0}s`
                            : `${bestSet.distance_meters ?? 0}m`
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail / Edit Workout Modal */}
      {selectedWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-charcoal-800 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {isEditing ? 'Edit Historical Workout' : selectedWorkout.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {new Date(
                    selectedWorkout.completed_at || selectedWorkout.started_at
                  ).toLocaleString()}{' '}
                  • {formatDuration(selectedWorkout.duration_seconds)} •{' '}
                  {formatVolume(selectedWorkout.total_volume_kg, weightUnit)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-lg bg-charcoal-800 text-lime-400 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedWorkout(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <form
                onSubmit={handleSaveHistoricalEdit}
                className="space-y-4 flex-1 overflow-y-auto pr-1"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Workout Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-charcoal-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-charcoal-700 text-sm"
                    />
                  </div>
                </div>

                {editExercises.map((ex, exIdx) => (
                  <div
                    key={exIdx}
                    className="p-4 rounded-xl border border-charcoal-800 bg-charcoal-950 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-lime-400">
                        {ex.exercise_name_snapshot}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditExercises((prev) => {
                            const next = [...prev];
                            const target = { ...next[exIdx] };
                            target.sets = [
                              ...target.sets,
                              {
                                set_number: target.sets.length + 1,
                                set_type: 'working',
                                weight_kg: 40,
                                reps: 10,
                                is_completed: true,
                                is_pr: false,
                              },
                            ];
                            next[exIdx] = target;
                            return next;
                          });
                        }}
                        className="text-xs text-lime-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Set
                      </button>
                    </div>

                    <div className="space-y-2">
                      {ex.sets.map((s, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2 text-xs font-mono">
                          <span className="w-12 text-slate-400">Set {sIdx + 1}</span>
                          {ex.tracking_type_snapshot === 'weight_reps' && (
                            <>
                              <input
                                type="number"
                                step="0.5"
                                value={
                                  s.weight_kg != null
                                    ? toDisplayWeight(s.weight_kg, weightUnit)
                                    : ''
                                }
                                onChange={(e) =>
                                  updateEditSet(exIdx, sIdx, {
                                    weight_kg: fromDisplayWeight(
                                      Number(e.target.value),
                                      weightUnit
                                    ),
                                  })
                                }
                                className="w-24 px-2 py-1 rounded bg-charcoal-900 border border-charcoal-700"
                              />
                              <span>{weightUnit} ×</span>
                            </>
                          )}
                          <input
                            type="number"
                            value={s.reps ?? ''}
                            onChange={(e) =>
                              updateEditSet(exIdx, sIdx, { reps: Number(e.target.value) })
                            }
                            className="w-20 px-2 py-1 rounded bg-charcoal-900 border border-charcoal-700"
                          />
                          <span>reps</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditExercises((prev) => {
                                const next = [...prev];
                                const target = { ...next[exIdx] };
                                target.sets = target.sets.filter((_, i) => i !== sIdx);
                                next[exIdx] = target;
                                return next;
                              });
                            }}
                            className="ml-auto text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {selectedWorkout.notes && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 text-xs text-slate-300">
                    <strong>Notes:</strong> {selectedWorkout.notes}
                  </div>
                )}

                {selectedWorkout.exercises.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-950 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-lime-500 dark:text-lime-400">
                        {idx + 1}. {ex.exercise_name_snapshot}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {ex.primary_muscle_snapshot} • {ex.equipment_snapshot}
                      </span>
                    </div>
                    {ex.notes && <p className="text-xs text-slate-400 italic">{ex.notes}</p>}

                    <div className="divide-y divide-slate-200 dark:divide-charcoal-800 text-xs font-mono">
                      {ex.sets.map((s) => (
                        <div key={s.id || s.set_number} className="py-1.5 flex items-center justify-between">
                          <span className="text-slate-400">
                            Set {s.set_number}{' '}
                            {s.set_type !== 'working' ? `(${s.set_type.toUpperCase()})` : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ex.tracking_type_snapshot === 'weight_reps'
                                ? `${formatWeight(s.weight_kg, weightUnit)} × ${s.reps ?? 0} reps`
                                : ex.tracking_type_snapshot === 'reps_only'
                                ? `${s.reps ?? 0} reps`
                                : ex.tracking_type_snapshot === 'duration'
                                ? `${s.duration_seconds ?? 0}s`
                                : `${s.distance_meters ?? 0}m`}
                            </span>
                            {s.is_pr && (
                              <span className="px-1.5 py-0.5 rounded bg-lime-400 text-charcoal-950 text-[10px] font-extrabold">
                                PR
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Delete Workout &ldquo;{deletingWorkout.name}&rdquo;?
            </h3>
            <p className="text-xs text-slate-400">
              This will permanently remove this workout session and any personal records achieved
              exclusively in it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingWorkout(null)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                Delete Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
