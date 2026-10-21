import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PlayCircle,
  Copy,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { routinesApi, extractErrorMessage } from '../api/client';
import { WorkoutRoutine, Exercise } from '../types';
import { useAuth } from '../context/AuthContext';
import { toDisplayWeight, fromDisplayWeight, formatWeight } from '../utils/units';
import { ExercisePickerModal } from '../components/ExercisePickerModal';

interface DraftRoutineItem {
  exercise_id: number;
  exercise_name: string;
  primary_muscle: string;
  tracking_type: string;
  target_sets: number;
  target_reps: number;
  display_weight: string;
  rest_seconds: number;
  notes: string;
}

export const RoutinesPage: React.FC = () => {
  const { user, weightUnit, showToast } = useAuth();
  const navigate = useNavigate();

  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);

  // Routine Editor Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [items, setItems] = useState<DraftRoutineItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingRoutine, setDeletingRoutine] = useState<WorkoutRoutine | null>(null);

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await routinesApi.list();
      setRoutines(data);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load routines'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const openCreateEditor = (asTemplate = false) => {
    setEditingRoutine(null);
    setName('');
    setDescription('');
    setIsTemplate(asTemplate);
    setItems([]);
    setEditorOpen(true);
  };

  const openEditEditor = (routine: WorkoutRoutine) => {
    setEditingRoutine(routine);
    setName(routine.name);
    setDescription(routine.description || '');
    setIsTemplate(Boolean(routine.is_template));
    setItems(
      routine.exercises.map((re) => ({
        exercise_id: re.exercise_id,
        exercise_name: re.exercise?.name || `Exercise #${re.exercise_id}`,
        primary_muscle: re.exercise?.primary_muscle || 'Strength',
        tracking_type: re.exercise?.tracking_type || 'weight_reps',
        target_sets: re.target_sets || 3,
        target_reps: re.target_reps || 10,
        display_weight:
          re.target_weight_kg != null
            ? String(toDisplayWeight(re.target_weight_kg, weightUnit))
            : '',
        rest_seconds: re.rest_seconds || 90,
        notes: re.notes || '',
      }))
    );
    setEditorOpen(true);
  };

  const handleAddExerciseToDraft = (ex: Exercise) => {
    setItems((prev) => [
      ...prev,
      {
        exercise_id: ex.id,
        exercise_name: ex.name,
        primary_muscle: ex.primary_muscle,
        tracking_type: ex.tracking_type,
        target_sets: 3,
        target_reps: 10,
        display_weight: '',
        rest_seconds: 90,
        notes: '',
      },
    ]);
  };

  const moveItem = (idx: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Please enter a routine name (at least 2 characters)', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Add at least one exercise to the routine', 'error');
      return;
    }

    setSaving(true);
    try {
      const exercisesPayload = items.map((item, idx) => ({
        exercise_id: item.exercise_id,
        order_index: idx,
        target_sets: Math.max(1, Number(item.target_sets) || 3),
        target_reps: Math.max(1, Number(item.target_reps) || 10),
        target_weight_kg:
          item.display_weight.trim() !== ''
            ? fromDisplayWeight(Number(item.display_weight), weightUnit)
            : null,
        rest_seconds: Math.max(0, Number(item.rest_seconds) || 90),
        notes: item.notes.trim() || null,
      }));

      if (editingRoutine) {
        const updated = await routinesApi.update(editingRoutine.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          exercises: exercisesPayload,
        });
        setRoutines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showToast(`Updated routine "${updated.name}"`, 'success');
      } else {
        const created = await routinesApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
          is_template: Boolean(user?.is_admin && isTemplate),
          exercises: exercisesPayload,
        });
        setRoutines((prev) => [created, ...prev]);
        showToast(
          created.is_template
            ? `Created global starter template "${created.name}"`
            : `Created custom routine "${created.name}"`,
          'success'
        );
      }
      setEditorOpen(false);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to save routine'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (routine: WorkoutRoutine) => {
    try {
      const copy = await routinesApi.duplicate(routine.id);
      setRoutines((prev) => [copy, ...prev]);
      showToast(`Duplicated "${routine.name}" into your personal routines`, 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to duplicate routine'), 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoutine) return;
    try {
      await routinesApi.remove(deletingRoutine.id);
      setRoutines((prev) => prev.filter((r) => r.id !== deletingRoutine.id));
      showToast(`Deleted routine "${deletingRoutine.name}"`, 'info');
      setDeletingRoutine(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete routine'), 'error');
    }
  };

  const customRoutines = routines.filter((r) => !r.is_template);
  const starterTemplates = routines.filter((r) => r.is_template);

  const customRoutinesSection = (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-lime-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Custom Routines ({customRoutines.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customRoutines.length > 0
                ? 'Your personal custom routines — shown first across FitTrack.'
                : 'Create your own custom routine to have it prioritized first across FitTrack.'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-charcoal-900 border border-charcoal-800" />
          ))}
        </div>
      ) : customRoutines.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-8 text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You haven&apos;t created any custom routines yet. Create one from scratch or duplicate a
            ready-made starter template above.
          </p>
          <button
            type="button"
            onClick={() => openCreateEditor(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
          >
            <Plus className="w-4 h-4" /> New Custom Routine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customRoutines.map((routine) => (
            <div
              key={routine.id}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-lime-400/30 p-5 flex flex-col justify-between hover:border-lime-400/60 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {routine.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-400/15 text-lime-500 dark:text-lime-400 border border-lime-400/30">
                      Custom
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(routine)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-charcoal-800"
                      title="Duplicate Routine"
                      aria-label={`Duplicate ${routine.name}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditEditor(routine)}
                      className="p-1.5 rounded text-slate-400 hover:text-lime-400 hover:bg-charcoal-800"
                      title="Edit Routine"
                      aria-label={`Edit ${routine.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRoutine(routine)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-charcoal-800"
                      title="Delete Routine"
                      aria-label={`Delete ${routine.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {routine.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {routine.description}
                  </p>
                )}

                <div className="mt-4 space-y-1.5">
                  {routine.exercises.slice(0, 5).map((re, idx) => (
                    <div
                      key={`${routine.id}-${idx}`}
                      className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                    >
                      <span className="truncate pr-2">
                        {idx + 1}. {re.exercise?.name || 'Exercise'}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {re.target_sets} × {re.target_reps || 10}
                        {re.target_weight_kg
                          ? ` @ ${formatWeight(re.target_weight_kg, weightUnit)}`
                          : ''}
                      </span>
                    </div>
                  ))}
                  {routine.exercises.length > 5 && (
                    <p className="text-[11px] text-slate-400">
                      +{routine.exercises.length - 5} more exercises
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-charcoal-800">
                <button
                  type="button"
                  onClick={() => navigate(`/workout?routineId=${routine.id}`)}
                  className="w-full py-2 px-4 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <PlayCircle className="w-4 h-4 stroke-[2.5]" />
                  Start Routine Workout
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const starterTemplatesSection = (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lime-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ready-Made Starter Templates ({starterTemplates.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customRoutines.length === 0
                ? 'Default ready-made workout splits — start immediately or click Customize to save your own.'
                : 'Optional proven templates — start directly or duplicate to customize.'}
            </p>
          </div>
        </div>
        {user?.is_admin && (
          <button
            type="button"
            onClick={() => openCreateEditor(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-lime-400/50 bg-lime-400/10 text-lime-400 hover:bg-lime-400 hover:text-charcoal-950 font-bold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Global Starter Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {starterTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {tmpl.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-charcoal-800 text-slate-400">
                    Template
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(tmpl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-lime-400 hover:bg-lime-400/10"
                    title="Copy template to My Custom Routines"
                  >
                    <Copy className="w-3.5 h-3.5" /> Customize
                  </button>
                  {user?.is_admin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditEditor(tmpl)}
                        className="p-1.5 rounded text-slate-400 hover:text-lime-400 hover:bg-charcoal-800"
                        title="Admin: Edit Global Template"
                        aria-label={`Edit ${tmpl.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRoutine(tmpl)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-charcoal-800"
                        title="Admin: Delete Global Template"
                        aria-label={`Delete ${tmpl.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {tmpl.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tmpl.description}
                </p>
              )}

              <div className="mt-4 space-y-1.5">
                {tmpl.exercises.map((re, idx) => (
                  <div
                    key={`${tmpl.id}-${idx}`}
                    className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span className="truncate pr-2">
                      {idx + 1}. {re.exercise?.name || 'Exercise'}
                    </span>
                    <span className="font-mono text-slate-400 shrink-0">
                      {re.target_sets} × {re.target_reps || 10}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-charcoal-800">
              <button
                type="button"
                onClick={() => navigate(`/workout?routineId=${tmpl.id}`)}
                className="w-full py-2 px-4 rounded-lg border border-lime-400/50 bg-lime-400/10 hover:bg-lime-400 hover:text-charcoal-950 text-lime-500 dark:text-lime-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                Start {tmpl.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workout Routines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Build custom training splits or start immediately from ready-made starter templates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateEditor(false)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create Custom Routine
        </button>
      </div>

      {/* Show My Custom Routines FIRST when the user has created at least 1 custom routine; otherwise show Ready-Made Starter Templates FIRST by default */}
      {customRoutines.length > 0 ? (
        <>
          {customRoutinesSection}
          {starterTemplatesSection}
        </>
      ) : (
        <>
          {starterTemplatesSection}
          {customRoutinesSection}
        </>
      )}

      {/* Routine Editor Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-charcoal-800 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {editingRoutine
                  ? editingRoutine.is_template
                    ? 'Edit Global Starter Template'
                    : 'Edit Custom Routine'
                  : isTemplate
                  ? 'Create Global Starter Template'
                  : 'Create Workout Routine'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoutine} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {user?.is_admin && !editingRoutine && (
                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-lime-400/10 border border-lime-400/30 text-xs font-semibold text-lime-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTemplate}
                    onChange={(e) => setIsTemplate(e.target.checked)}
                    className="rounded border-charcoal-700 text-lime-500 focus:ring-lime-400"
                  />
                  <span>
                    Admin: Save as Global Ready-Made Starter Template (visible to all users)
                  </span>
                </label>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Routine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Upper Hypertrophy A"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Chest, back & arms focus..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Routine Exercises ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-charcoal-700 text-center text-xs text-slate-400">
                    No exercises added yet. Click &ldquo;Add Exercise&rdquo; to build your routine.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((item, idx) => (
                      <div
                        key={`${item.exercise_id}-${idx}`}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-950 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {idx + 1}. {item.exercise_name}
                            </span>
                            <span className="ml-2 text-xs text-slate-400">
                              ({item.primary_muscle})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, -1)}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                              aria-label="Move exercise up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === items.length - 1}
                              onClick={() => moveItem(idx, 1)}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                              aria-label="Move exercise down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded text-slate-400 hover:text-red-400"
                              aria-label="Remove exercise"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Target Sets
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={item.target_sets}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, target_sets: val } : it))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Target Reps
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={item.target_reps}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, target_reps: val } : it))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Target Weight ({weightUnit.toUpperCase()})
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Optional"
                              value={item.display_weight}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, display_weight: val } : it
                                  )
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Rest (sec)
                            </label>
                            <input
                              type="number"
                              step="15"
                              value={item.rest_seconds}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, rest_seconds: val } : it
                                  )
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-xs"
                >
                  {saving ? 'Saving...' : editingRoutine ? 'Update Routine' : 'Save Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingRoutine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Delete Routine &ldquo;{deletingRoutine.name}&rdquo;?
            </h3>
            <p className="text-xs text-slate-400">
              Your past completed workouts from this routine will remain safely preserved in your
              Workout History.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRoutine(null)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                Delete Routine
              </button>
            </div>
          </div>
        </div>
      )}

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExerciseToDraft}
      />
    </div>
  );
};
