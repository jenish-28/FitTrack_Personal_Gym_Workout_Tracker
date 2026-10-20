import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Star,
  ShieldCheck,
  User as UserBadgeIcon,
  Info,
  X,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  exercisesApi,
  extractErrorMessage,
} from '../api/client';
import {
  Exercise,
  TrackingType,
} from '../types';
import {
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  TRACKING_TYPE_LABELS,
} from '../utils/units';
import { useAuth } from '../context/AuthContext';

export const ExerciseLibraryPage: React.FC = () => {
  const { showToast } = useAuth();
  const navigate = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [selectedTracking, setSelectedTracking] = useState('All');
  const [customOnly, setCustomOnly] = useState(false);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrimaryMuscle, setFormPrimaryMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [formSecondaryMuscles, setFormSecondaryMuscles] = useState<string[]>([]);
  const [formEquipment, setFormEquipment] = useState<string>(EQUIPMENT_TYPES[0]);
  const [formCategory, setFormCategory] = useState<string>(EXERCISE_CATEGORIES[0]);
  const [formTrackingType, setFormTrackingType] = useState<TrackingType>('weight_reps');
  const [formInstructions, setFormInstructions] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete / Archive Confirmation Modal state
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [removeFromRoutines, setRemoveFromRoutines] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Exercise Detail Modal
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const list = await exercisesApi.list({
        search: search.trim() || undefined,
        muscle: selectedMuscle !== 'All' ? selectedMuscle : undefined,
        equipment: selectedEquipment !== 'All' ? selectedEquipment : undefined,
        tracking_type: selectedTracking !== 'All' ? selectedTracking : undefined,
        custom_only: customOnly || undefined,
      });
      setExercises(list);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load exercises'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedMuscle, selectedEquipment, selectedTracking, customOnly, showToast]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormName('');
    setFormPrimaryMuscle(MUSCLE_GROUPS[0]);
    setFormSecondaryMuscles([]);
    setFormEquipment(EQUIPMENT_TYPES[0]);
    setFormCategory(EXERCISE_CATEGORIES[0]);
    setFormTrackingType('weight_reps');
    setFormInstructions('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (ex: Exercise) => {
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormPrimaryMuscle(ex.primary_muscle);
    setFormSecondaryMuscles(ex.secondary_muscles || []);
    setFormEquipment(ex.equipment);
    setFormCategory(ex.category || 'Strength');
    setFormTrackingType(ex.tracking_type);
    setFormInstructions(ex.instructions || '');
    setFormError(null);
    setModalOpen(true);
  };

  const toggleSecondaryMuscle = (muscle: string) => {
    setFormSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (trimmedName.length < 2) {
      setFormError('Exercise name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      if (editingExercise) {
        const updated = await exercisesApi.update(editingExercise.id, {
          name: trimmedName,
          primary_muscle: formPrimaryMuscle,
          secondary_muscles: formSecondaryMuscles.filter((m) => m !== formPrimaryMuscle),
          equipment: formEquipment,
          category: formCategory,
          tracking_type: formTrackingType,
          instructions: formInstructions.trim() || undefined,
        });
        setExercises((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast(`Updated "${updated.name}"`, 'success');
      } else {
        const created = await exercisesApi.create({
          name: trimmedName,
          primary_muscle: formPrimaryMuscle,
          secondary_muscles: formSecondaryMuscles.filter((m) => m !== formPrimaryMuscle),
          equipment: formEquipment,
          category: formCategory,
          tracking_type: formTrackingType,
          instructions: formInstructions.trim() || undefined,
        });
        setExercises((prev) => [created, ...prev]);
        showToast(`Added custom exercise "${created.name}"`, 'success');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not save exercise'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExercise) return;
    setDeleting(true);
    try {
      const res = await exercisesApi.remove(deletingExercise.id, removeFromRoutines);
      setExercises((prev) => prev.filter((item) => item.id !== deletingExercise.id));
      showToast(res.message, 'info');
      setDeletingExercise(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete exercise'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (ex: Exercise) => {
    try {
      const res = await exercisesApi.toggleFavorite(ex.id);
      setExercises((prev) =>
        prev.map((item) => (item.id === ex.id ? { ...item, is_favorite: res.is_favorite } : item))
      );
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update favorite'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Exercise Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Browse built-in movements or create and manage your own custom exercises.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add Exercise
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercise name, muscle, or equipment..."
              aria-label="Search exercises"
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
            />
          </div>

          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            aria-label="Filter by muscle group"
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          >
            <option value="All">All Muscle Groups</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            aria-label="Filter by equipment"
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          >
            <option value="All">All Equipment</option>
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>

          <select
            value={selectedTracking}
            onChange={(e) => setSelectedTracking(e.target.value)}
            aria-label="Filter by tracking type"
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
          >
            <option value="All">All Tracking Types</option>
            <option value="weight_reps">Weight &amp; Reps</option>
            <option value="reps_only">Reps Only (Bodyweight)</option>
            <option value="duration">Duration</option>
            <option value="distance">Distance</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={customOnly}
              onChange={(e) => setCustomOnly(e.target.checked)}
              className="rounded border-charcoal-700 text-lime-500 focus:ring-lime-400"
            />
            <span>Show Only My Custom Exercises</span>
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} found
          </span>
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-36 rounded-xl bg-slate-200 dark:bg-charcoal-900 border border-slate-300 dark:border-charcoal-800"
            />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No exercises match your current filters.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
          >
            <Plus className="w-4 h-4" /> Create Custom Exercise
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 flex flex-col justify-between hover:border-lime-400/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {ex.name}
                      </h3>
                      {ex.is_system ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-charcoal-800 text-slate-500 dark:text-slate-400">
                          <ShieldCheck className="w-3 h-3 text-slate-400" /> System
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-lime-400/15 text-lime-600 dark:text-lime-400 border border-lime-400/30">
                          <UserBadgeIcon className="w-3 h-3" /> Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {ex.primary_muscle}
                      </span>{' '}
                      • {ex.equipment} • {ex.category}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(ex)}
                    aria-label={`Favorite ${ex.name}`}
                    className={`p-1.5 rounded-md transition-colors ${
                      ex.is_favorite
                        ? 'text-lime-400 bg-lime-400/10'
                        : 'text-slate-400 hover:text-lime-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${ex.is_favorite ? 'fill-lime-400' : ''}`} />
                  </button>
                </div>

                {ex.secondary_muscles && ex.secondary_muscles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {ex.secondary_muscles.map((sm) => (
                      <span
                        key={sm}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-charcoal-850 text-slate-500 dark:text-slate-400"
                      >
                        {sm}
                      </span>
                    ))}
                  </div>
                )}

                {ex.instructions && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2">
                    {ex.instructions}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-charcoal-800">
                <span className="text-[11px] font-mono text-slate-400">
                  {TRACKING_TYPE_LABELS[ex.tracking_type]}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewingExercise(ex)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-charcoal-800 transition-colors"
                    title="View Exercise Details"
                    aria-label={`View details for ${ex.name}`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/progress?exerciseId=${ex.id}`)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-lime-400 hover:bg-charcoal-800 transition-colors"
                    title="View Progress Charts"
                    aria-label={`View progress for ${ex.name}`}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                  {!ex.is_system && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(ex)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-lime-400 hover:bg-charcoal-800 transition-colors"
                        title="Edit Custom Exercise"
                        aria-label={`Edit ${ex.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingExercise(ex);
                          setRemoveFromRoutines(true);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-charcoal-800 transition-colors"
                        title="Delete or Archive Custom Exercise"
                        aria-label={`Delete ${ex.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Custom Exercise Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h2 id="exercise-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                {editingExercise ? 'Edit Custom Exercise' : 'Add Custom Exercise'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-md"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-medium"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveExercise} className="space-y-4">
              <div>
                <label
                  htmlFor="ex-name-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Exercise Name *
                </label>
                <input
                  id="ex-name-input"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Seal Barbell Row"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ex-muscle-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                  >
                    Primary Muscle Group *
                  </label>
                  <select
                    id="ex-muscle-select"
                    value={formPrimaryMuscle}
                    onChange={(e) => setFormPrimaryMuscle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  >
                    {MUSCLE_GROUPS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ex-equipment-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                  >
                    Equipment Type *
                  </label>
                  <select
                    id="ex-equipment-select"
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  >
                    {EQUIPMENT_TYPES.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ex-tracking-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                  >
                    Tracking Type *
                  </label>
                  <select
                    id="ex-tracking-select"
                    value={formTrackingType}
                    onChange={(e) => setFormTrackingType(e.target.value as TrackingType)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  >
                    <option value="weight_reps">Weight &amp; Reps</option>
                    <option value="reps_only">Reps Only (Bodyweight)</option>
                    <option value="duration">Duration (Seconds)</option>
                    <option value="distance">Distance (Meters)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ex-category-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="ex-category-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  >
                    {EXERCISE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Secondary Muscle Groups (Optional)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.filter((m) => m !== formPrimaryMuscle).map((m) => {
                    const active = formSecondaryMuscles.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleSecondaryMuscle(m)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-lime-400/20 border-lime-400 text-lime-300'
                            : 'bg-slate-50 dark:bg-charcoal-950 border-slate-200 dark:border-charcoal-700 text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ex-instructions-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Instructions &amp; Form Cues (Optional)
                </label>
                <textarea
                  id="ex-instructions-input"
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Describe setup, execution, and key cues..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-charcoal-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-charcoal-950 font-bold text-xs transition-colors"
                >
                  {saving
                    ? 'Saving...'
                    : editingExercise
                    ? 'Save Changes'
                    : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      {deletingExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exercise-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 id="delete-exercise-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                {(deletingExercise.usage_count || 0) > 0
                  ? 'Archive Custom Exercise?'
                  : 'Delete Custom Exercise?'}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {(deletingExercise.usage_count || 0) > 0 ? (
                <>
                  <strong>{deletingExercise.name}</strong> is referenced in{' '}
                  <strong>{deletingExercise.usage_count}</strong> historical workout(s). To protect
                  your historical workout data and statistics, it will be safely{' '}
                  <strong>archived</strong> and hidden from new workout selections while preserving
                  all past records.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deletingExercise.name}</strong>? It has
                  no historical workout logs and will be permanently removed.
                </>
              )}
            </p>

            {(deletingExercise.routine_count || 0) > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                <p className="text-xs font-semibold text-amber-300">
                  Used in {deletingExercise.routine_count} saved routine(s).
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeFromRoutines}
                    onChange={(e) => setRemoveFromRoutines(e.target.checked)}
                    className="rounded border-charcoal-700 text-lime-500"
                  />
                  <span>Remove this exercise from my active routines automatically</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExercise(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-charcoal-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-colors"
              >
                {deleting
                  ? 'Processing...'
                  : (deletingExercise.usage_count || 0) > 0
                  ? 'Confirm Archive'
                  : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {viewingExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {viewingExercise.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {viewingExercise.primary_muscle} • {viewingExercise.equipment} •{' '}
                  {viewingExercise.category}
                </p>
              </div>
              <button
                onClick={() => setViewingExercise(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 block">
                  Tracking Mode
                </span>
                <span className="font-mono text-lime-400">
                  {TRACKING_TYPE_LABELS[viewingExercise.tracking_type]}
                </span>
              </div>

              {viewingExercise.secondary_muscles.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
                    Secondary Muscles
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingExercise.secondary_muscles.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-charcoal-800 text-slate-300 text-xs"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
                  Execution Instructions
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {viewingExercise.instructions || 'No additional instructions recorded.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-charcoal-800">
              <button
                onClick={() => {
                  const id = viewingExercise.id;
                  setViewingExercise(null);
                  navigate(`/progress?exerciseId=${id}`);
                }}
                className="px-4 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
              >
                View Progression History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
