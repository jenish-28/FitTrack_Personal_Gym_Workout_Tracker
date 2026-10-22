import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Upload,
  Image as ImageIcon,
  Trophy,
  BookOpen,
  History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  exercisesApi,
  statsApi,
  extractErrorMessage,
} from '../api/client';
import {
  Exercise,
  ExerciseProgressPoint,
  PersonalRecordItem,
  TrackingType,
} from '../types';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_CATEGORIES,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  DIFFICULTY_LEVELS,
  TRACKING_TYPE_LABELS,
  toDisplayWeight,
  formatWeight,
  formatVolume,
  formatDateShort,
} from '../utils/units';
import { useAuth } from '../context/AuthContext';
import { ExerciseMediaPreview, MuscleTargetDiagram } from '../components/ExerciseMediaPreview';
import {
  HierarchicalMuscleFilter,
  matchesHierarchicalMuscleFilter,
} from '../components/HierarchicalMuscleFilter';

export const ExerciseLibraryPage: React.FC = () => {
  const { user, weightUnit, showToast } = useAuth();
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
  const [secondaryFilterGroup, setSecondaryFilterGroup] = useState<string>('All');
  const [formEquipment, setFormEquipment] = useState<string>(EQUIPMENT_TYPES[0]);
  const [formCategory, setFormCategory] = useState<string>(EXERCISE_CATEGORIES[0]);
  const [formDifficulty, setFormDifficulty] = useState<string>('Intermediate');
  const [formTrackingType, setFormTrackingType] = useState<TrackingType>('weight_reps');
  const [formInstructions, setFormInstructions] = useState('');
  const [formIsSystem, setFormIsSystem] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete / Archive Confirmation Modal state
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [removeFromRoutines, setRemoveFromRoutines] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Exercise Detail Modal (Hevy-inspired overview, instructions, history & progress)
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [detailTab, setDetailTab] = useState<'summary' | 'howto' | 'history'>('summary');
  const [detailProgress, setDetailProgress] = useState<ExerciseProgressPoint[]>([]);
  const [detailRecords, setDetailRecords] = useState<PersonalRecordItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingDetailMedia, setUploadingDetailMedia] = useState(false);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const list = await exercisesApi.list({
        search: search.trim() || undefined,
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
  }, [search, selectedEquipment, selectedTracking, customOnly, showToast]);

  const filteredExercises = useMemo(
    () =>
      exercises.filter((ex) =>
        matchesHierarchicalMuscleFilter(ex, selectedMuscle)
      ),
    [exercises, selectedMuscle]
  );

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Clean up temporary local object URL used only for previewing file selection before upload
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Load exercise progress and personal records when Exercise Detail modal opens
  useEffect(() => {
    if (!viewingExercise) return;
    let active = true;
    setDetailLoading(true);
    Promise.all([
      statsApi.getExerciseProgress(viewingExercise.id).catch(() => []),
      statsApi.getPersonalRecords(viewingExercise.id).catch(() => []),
    ])
      .then(([prog, recs]) => {
        if (!active) return;
        setDetailProgress(prog);
        setDetailRecords(recs);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [viewingExercise]);

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormName('');
    setFormPrimaryMuscle(MUSCLE_GROUPS[0]);
    setFormSecondaryMuscles([]);
    setSecondaryFilterGroup('All');
    setFormEquipment(EQUIPMENT_TYPES[0]);
    setFormCategory(EXERCISE_CATEGORIES[0]);
    setFormDifficulty('Intermediate');
    setFormTrackingType('weight_reps');
    setFormInstructions('');
    setFormIsSystem(Boolean(user?.is_admin));
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setRemoveExistingMedia(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (ex: Exercise) => {
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormPrimaryMuscle(ex.primary_muscle);
    setFormSecondaryMuscles(ex.secondary_muscles || []);
    setSecondaryFilterGroup('All');
    setFormEquipment(ex.equipment);
    setFormCategory(ex.category || 'Strength');
    setFormDifficulty(ex.difficulty_level || 'Intermediate');
    setFormTrackingType(ex.tracking_type);
    setFormInstructions(ex.instructions || '');
    setFormIsSystem(Boolean(ex.is_system));
    setSelectedMediaFile(null);
    setMediaPreviewUrl(ex.media_url || null);
    setRemoveExistingMedia(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSelectMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Please select a valid JPEG, PNG, WebP, or GIF image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFormError('File size exceeds the 8 MB maximum limit.');
      return;
    }

    setFormError(null);
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setRemoveExistingMedia(false);
  };

  const handleClearSelectedMedia = () => {
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    if (editingExercise?.media_url) {
      setRemoveExistingMedia(true);
    }
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
      let savedExercise: Exercise;
      if (editingExercise) {
        savedExercise = await exercisesApi.update(editingExercise.id, {
          name: trimmedName,
          primary_muscle: formPrimaryMuscle,
          secondary_muscles: formSecondaryMuscles.filter((m) => m !== formPrimaryMuscle),
          equipment: formEquipment,
          category: formCategory,
          difficulty_level: formDifficulty,
          tracking_type: formTrackingType,
          instructions: formInstructions.trim() || undefined,
        });

        if (removeExistingMedia && !selectedMediaFile) {
          savedExercise = await exercisesApi.deleteMedia(savedExercise.id);
        }
      } else {
        savedExercise = await exercisesApi.create({
          name: trimmedName,
          primary_muscle: formPrimaryMuscle,
          secondary_muscles: formSecondaryMuscles.filter((m) => m !== formPrimaryMuscle),
          equipment: formEquipment,
          category: formCategory,
          difficulty_level: formDifficulty,
          tracking_type: formTrackingType,
          instructions: formInstructions.trim() || undefined,
          is_system: Boolean(user?.is_admin && formIsSystem),
        });
      }

      if (selectedMediaFile) {
        savedExercise = await exercisesApi.uploadMedia(savedExercise.id, selectedMediaFile);
      }

      if (editingExercise) {
        setExercises((prev) =>
          prev.map((item) => (item.id === savedExercise.id ? savedExercise : item))
        );
        if (viewingExercise?.id === savedExercise.id) {
          setViewingExercise(savedExercise);
        }
        showToast(`Updated "${savedExercise.name}"`, 'success');
      } else {
        setExercises((prev) => [savedExercise, ...prev]);
        showToast(
          savedExercise.is_system
            ? `Added global system exercise "${savedExercise.name}"`
            : `Added custom exercise "${savedExercise.name}"`,
          'success'
        );
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not save exercise'));
    } finally {
      setSaving(false);
    }
  };

  const handleDetailMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingExercise) return;
    setUploadingDetailMedia(true);
    try {
      const updated = await exercisesApi.uploadMedia(viewingExercise.id, file);
      setViewingExercise(updated);
      setExercises((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Uploaded demonstration media for "${updated.name}"`, 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to upload demonstration media'), 'error');
    } finally {
      setUploadingDetailMedia(false);
      e.target.value = '';
    }
  };

  const handleDetailMediaRemove = async () => {
    if (!viewingExercise) return;
    setUploadingDetailMedia(true);
    try {
      const updated = await exercisesApi.deleteMedia(viewingExercise.id);
      setViewingExercise(updated);
      setExercises((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Removed uploaded media from "${updated.name}"`, 'info');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to remove media'), 'error');
    } finally {
      setUploadingDetailMedia(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExercise) return;
    setDeleting(true);
    try {
      const res = await exercisesApi.remove(deletingExercise.id, removeFromRoutines);
      setExercises((prev) => prev.filter((item) => item.id !== deletingExercise.id));
      if (viewingExercise?.id === deletingExercise.id) {
        setViewingExercise(null);
      }
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
      if (viewingExercise?.id === ex.id) {
        setViewingExercise((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : prev));
      }
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update favorite'), 'error');
    }
  };

  const visibleSecondaryOptions =
    secondaryFilterGroup === 'All'
      ? MUSCLE_GROUPS.filter((m) => m !== formPrimaryMuscle)
      : (
          MUSCLE_GROUP_CATEGORIES.find((c) => c.group === secondaryFilterGroup)?.options || []
        ).filter((m) => m !== formPrimaryMuscle);

  const detailChartData = detailProgress.map((pt) => ({
    ...pt,
    displayMaxWeight: toDisplayWeight(pt.max_weight_kg, weightUnit),
    display1RM: toDisplayWeight(pt.estimated_1rm_kg, weightUnit),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Exercise Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Browse movement demonstrations, target muscle anatomy, or upload custom exercises.
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
              placeholder="Search exercise name, muscle group, or equipment..."
              aria-label="Search exercises"
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
            />
          </div>

          <HierarchicalMuscleFilter
            value={selectedMuscle}
            onChange={setSelectedMuscle}
          />

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
            {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'} found
          </span>
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-slate-200 dark:bg-charcoal-900 border border-slate-300 dark:border-charcoal-800"
            />
          ))}
        </div>
      ) : filteredExercises.length === 0 ? (
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
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 flex flex-col justify-between hover:border-lime-400/40 transition-colors"
            >
              <div>
                {/* Demonstration Image / Animated Preview */}
                <div
                  onClick={() => {
                    setViewingExercise(ex);
                    setDetailTab('summary');
                  }}
                  className="cursor-pointer mb-3"
                >
                  <ExerciseMediaPreview exercise={ex} size="md" />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => {
                          setViewingExercise(ex);
                          setDetailTab('summary');
                        }}
                        className="text-base font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-lime-400 transition-colors"
                      >
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
                      {ex.difficulty_level ? ` • ${ex.difficulty_level}` : ''}
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
                    {ex.secondary_muscles.slice(0, 4).map((sm) => (
                      <span
                        key={sm}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-charcoal-850 text-slate-500 dark:text-slate-400"
                      >
                        {sm}
                      </span>
                    ))}
                    {ex.secondary_muscles.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                        +{ex.secondary_muscles.length - 4}
                      </span>
                    )}
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
                    onClick={() => {
                      setViewingExercise(ex);
                      setDetailTab('summary');
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-charcoal-800 transition-colors"
                    title="View Exercise Details & Demonstration"
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
                  {(!ex.is_system || user?.is_admin) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(ex)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-lime-400 hover:bg-charcoal-800 transition-colors"
                        title={ex.is_system ? 'Admin: Edit System Exercise' : 'Edit Custom Exercise'}
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
                        title={
                          ex.is_system
                            ? 'Admin: Delete or Archive System Exercise'
                            : 'Delete or Archive Custom Exercise'
                        }
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
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2
                id="exercise-modal-title"
                className="text-lg font-extrabold text-slate-900 dark:text-white"
              >
                {editingExercise
                  ? editingExercise.is_system
                    ? 'Edit System Exercise'
                    : 'Edit Custom Exercise'
                  : 'Add Custom Exercise'}
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
              {user?.is_admin && !editingExercise && (
                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-lime-400/10 border border-lime-400/30 text-xs font-semibold text-lime-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsSystem}
                    onChange={(e) => setFormIsSystem(e.target.checked)}
                    className="rounded border-charcoal-700 text-lime-500 focus:ring-lime-400"
                  />
                  <span>Admin: Save as Global System Exercise (visible to all users)</span>
                </label>
              )}

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
                    {MUSCLE_GROUP_CATEGORIES.map((cat) => (
                      <optgroup key={cat.group} label={cat.group}>
                        {cat.options.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label
                    htmlFor="ex-difficulty-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                  >
                    Difficulty Level
                  </label>
                  <select
                    id="ex-difficulty-select"
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Secondary Muscle Groups with Category Filter */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Secondary Muscle Groups (Optional • {formSecondaryMuscles.length} selected)
                  </span>
                  <select
                    value={secondaryFilterGroup}
                    onChange={(e) => setSecondaryFilterGroup(e.target.value)}
                    aria-label="Filter secondary muscle group options"
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-[11px]"
                  >
                    <option value="All">All Regions</option>
                    {MUSCLE_GROUP_CATEGORIES.map((cat) => (
                      <option key={cat.group} value={cat.group}>
                        {cat.group}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg bg-slate-50/60 dark:bg-charcoal-950/60 border border-slate-200 dark:border-charcoal-800">
                  {visibleSecondaryOptions.map((m) => {
                    const active = formSecondaryMuscles.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleSecondaryMuscle(m)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-lime-400/20 border-lime-400 text-lime-300'
                            : 'bg-slate-50 dark:bg-charcoal-950 border-slate-200 dark:border-charcoal-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demonstration Image / Animated GIF Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Demonstration Image or Animated GIF (Optional • Max 8 MB)
                </label>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-dashed border-slate-300 dark:border-charcoal-700 space-y-3">
                  {mediaPreviewUrl ? (
                    <div className="space-y-2.5">
                      <div className="w-full h-44 rounded-lg overflow-hidden bg-charcoal-900 border border-charcoal-800 flex items-center justify-center">
                        <img
                          src={mediaPreviewUrl}
                          alt="Selected exercise demonstration preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 truncate">
                          {selectedMediaFile
                            ? `Selected: ${selectedMediaFile.name} (${Math.round(
                                selectedMediaFile.size / 1024
                              )} KB)`
                            : 'Current demonstration media attached'}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-xs font-semibold text-lime-400">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Replace</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleSelectMediaFile}
                              className="hidden"
                              aria-label="Upload demonstration media"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleClearSelectedMedia}
                            className="px-2.5 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold text-red-400"
                          >
                            Remove Media
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-4 cursor-pointer text-center">
                      <ImageIcon className="w-7 h-7 text-lime-400 mb-1.5" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Click to upload an exercise image or animated GIF
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Supports JPEG, PNG, WebP, and animated GIF up to 8 MB
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleSelectMediaFile}
                        className="hidden"
                        aria-label="Upload demonstration media"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ex-instructions-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
                >
                  Instructions, Technique &amp; Safety Cues (Optional)
                </label>
                <textarea
                  id="ex-instructions-input"
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Describe step-by-step setup, execution technique, and safety cues..."
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
              <h2
                id="delete-exercise-title"
                className="text-lg font-extrabold text-slate-900 dark:text-white"
              >
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

      {/* Hevy-Inspired Comprehensive Exercise Detail Modal */}
      {viewingExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-charcoal-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {viewingExercise.name}
                  </h2>
                  {viewingExercise.is_system ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-charcoal-800 text-slate-400">
                      System
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-lime-400/15 text-lime-400 border border-lime-400/30">
                      Custom
                    </span>
                  )}
                  {viewingExercise.difficulty_level && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-charcoal-800 text-slate-300">
                      {viewingExercise.difficulty_level}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {viewingExercise.primary_muscle} • {viewingExercise.equipment} •{' '}
                  {viewingExercise.category} •{' '}
                  <span className="text-lime-400 font-mono">
                    {TRACKING_TYPE_LABELS[viewingExercise.tracking_type]}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingExercise(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-md"
                aria-label="Close detail view"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Navigation Tabs */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800">
              <button
                type="button"
                onClick={() => setDetailTab('summary')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  detailTab === 'summary'
                    ? 'bg-lime-400 text-charcoal-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Summary &amp; Muscles</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('howto')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  detailTab === 'howto'
                    ? 'bg-lime-400 text-charcoal-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>How To &amp; Form</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('history')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  detailTab === 'history'
                    ? 'bg-lime-400 text-charcoal-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({detailProgress.length})</span>
              </button>
            </div>

            {/* Tab 1: Summary, Demonstration, Target Muscles & Progress */}
            {detailTab === 'summary' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <div className="space-y-2">
                    <ExerciseMediaPreview
                      exercise={viewingExercise}
                      size="lg"
                      animateFrames={true}
                    />
                    {(!viewingExercise.is_system || user?.is_admin) && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400/15 border border-lime-400/40 text-lime-400 hover:bg-lime-400/25 text-xs font-bold transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {uploadingDetailMedia
                              ? 'Uploading...'
                              : viewingExercise.media_url
                              ? 'Replace Image / GIF'
                              : 'Upload Image / GIF'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={uploadingDetailMedia}
                            onChange={handleDetailMediaUpload}
                            className="hidden"
                          />
                        </label>

                        {viewingExercise.media_url && (
                          <button
                            type="button"
                            disabled={uploadingDetailMedia}
                            onClick={handleDetailMediaRemove}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold transition-colors"
                          >
                            Remove Media
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Target Muscle Anatomy Breakdown */}
                  <MuscleTargetDiagram
                    primaryMuscle={viewingExercise.primary_muscle}
                    secondaryMuscles={viewingExercise.secondary_muscles}
                  />
                </div>

                {/* Personal Records & Progression Chart */}
                <div className="rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-lime-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Exercise Progress &amp; Personal Records
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Epley 1RM &amp; Max Weight ({weightUnit.toUpperCase()})
                    </span>
                  </div>

                  {detailRecords.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {detailRecords.slice(0, 3).map((pr) => (
                        <div
                          key={pr.id}
                          className="p-2.5 rounded-lg bg-white dark:bg-charcoal-900 border border-lime-400/30"
                        >
                          <span className="text-[10px] font-bold uppercase text-lime-400 block">
                            {pr.record_type.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                            {pr.record_type === 'max_reps'
                              ? `${Math.round(pr.value)} reps`
                              : formatWeight(pr.value, weightUnit)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {formatDateShort(pr.achieved_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailLoading ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Loading exercise performance chart...
                    </p>
                  ) : detailChartData.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No completed workouts logged for {viewingExercise.name} yet. Log a workout to
                      track weight and 1RM progression!
                    </p>
                  ) : (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detailChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262b33" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#121519',
                              borderColor: '#2a3038',
                              borderRadius: '0.5rem',
                              fontSize: '12px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="displayMaxWeight"
                            name={`Max Weight (${weightUnit})`}
                            stroke="#a3e635"
                            strokeWidth={2.5}
                            dot={{ r: 3.5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="display1RM"
                            name={`Est. 1RM (${weightUnit})`}
                            stroke="#38bdf8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Step-by-Step Instructions & Technique */}
            {detailTab === 'howto' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-lime-400 block">
                    Execution Instructions &amp; Form Cues
                  </span>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {viewingExercise.instructions || 'No additional instructions recorded.'}
                  </div>
                </div>
                <MuscleTargetDiagram
                  primaryMuscle={viewingExercise.primary_muscle}
                  secondaryMuscles={viewingExercise.secondary_muscles}
                />
              </div>
            )}

            {/* Tab 3: Exercise Workout History */}
            {detailTab === 'history' && (
              <div className="space-y-3">
                {detailProgress.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 p-8 text-center text-xs text-slate-400">
                    No historical sessions recorded for {viewingExercise.name} yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {[...detailProgress].reverse().map((pt) => (
                      <div
                        key={`${pt.workout_id}-${pt.date}`}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {pt.workout_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDateShort(pt.date)} • {pt.sets_completed} working sets completed
                          </p>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <div className="font-bold text-lime-400">
                            Top: {formatWeight(pt.max_weight_kg, weightUnit)} × {pt.best_reps}
                          </div>
                          <div className="text-slate-400">
                            1RM: {formatWeight(pt.estimated_1rm_kg, weightUnit)} • Vol:{' '}
                            {formatVolume(pt.total_volume_kg, weightUnit)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-charcoal-800">
              {(!viewingExercise.is_system || user?.is_admin) && (
                <button
                  type="button"
                  onClick={() => {
                    const exToEdit = viewingExercise;
                    setViewingExercise(null);
                    openEditModal(exToEdit);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-charcoal-700 text-xs font-bold hover:border-lime-400"
                >
                  Edit Exercise
                </button>
              )}
              <button
                type="button"
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
