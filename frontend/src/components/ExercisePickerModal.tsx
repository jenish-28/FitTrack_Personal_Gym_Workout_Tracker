import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';
import { exercisesApi, extractErrorMessage } from '../api/client';
import { Exercise, TrackingType } from '../types';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_CATEGORIES,
  EQUIPMENT_TYPES,
  TRACKING_TYPE_LABELS,
} from '../utils/units';
import { useAuth } from '../context/AuthContext';
import { ExerciseMediaPreview } from './ExerciseMediaPreview';

interface ExercisePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const { showToast } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');

  // Inline custom creation mode
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [customEquipment, setCustomEquipment] = useState<string>(EQUIPMENT_TYPES[0]);
  const [customTracking, setCustomTracking] = useState<TrackingType>('weight_reps');
  const [savingCustom, setSavingCustom] = useState(false);

  const loadExercises = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const list = await exercisesApi.list({
        search: search.trim() || undefined,
        muscle: muscle !== 'All' ? muscle : undefined,
      });
      setExercises(list);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load exercises'), 'error');
    } finally {
      setLoading(false);
    }
  }, [open, search, muscle, showToast]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  if (!open) return null;

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim().length < 2) return;
    setSavingCustom(true);
    try {
      const created = await exercisesApi.create({
        name: customName.trim(),
        primary_muscle: customMuscle,
        equipment: customEquipment,
        tracking_type: customTracking,
      });
      showToast(`Created "${created.name}" and added to selection`, 'success');
      setCreatingCustom(false);
      setCustomName('');
      onSelect(created);
      onClose();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to create exercise'), 'error');
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select Exercise"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-charcoal-800">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {creatingCustom ? 'New Custom Exercise' : 'Select Exercise'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreatingCustom((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg bg-lime-400/15 border border-lime-400/40 text-lime-500 dark:text-lime-400 text-xs font-bold hover:bg-lime-400/25 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {creatingCustom ? 'Back to List' : 'Create Custom'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md"
              aria-label="Close Exercise Picker"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {creatingCustom ? (
          <form onSubmit={handleQuickCreate} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Exercise Name *
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., JM Barbell Press"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Primary Muscle
                </label>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
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
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Equipment
                </label>
                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
                >
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Tracking Type
                </label>
                <select
                  value={customTracking}
                  onChange={(e) => setCustomTracking(e.target.value as TrackingType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
                >
                  <option value="weight_reps">Weight &amp; Reps</option>
                  <option value="reps_only">Reps Only</option>
                  <option value="duration">Duration</option>
                  <option value="distance">Distance</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreatingCustom(false)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustom}
                className="px-4 py-2 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
              >
                {savingCustom ? 'Saving...' : 'Create & Select'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 py-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercise, muscle, or equipment..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-xs sm:text-sm focus:outline-none focus:border-lime-400"
                />
              </div>
              <select
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                aria-label="Filter picker by muscle group"
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-xs sm:text-sm"
              >
                <option value="All">All Muscles</option>
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

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <p className="text-center py-8 text-xs text-slate-400">Loading exercises...</p>
              ) : exercises.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs text-slate-400">No matching exercises found.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomName(search);
                      setCreatingCustom(true);
                    }}
                    className="px-3 py-1.5 rounded-md bg-lime-400 text-charcoal-950 font-bold text-xs"
                  >
                    + Create &ldquo;{search || 'Custom Exercise'}&rdquo;
                  </button>
                </div>
              ) : (
                exercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelect(ex);
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-charcoal-800 bg-slate-50 dark:bg-charcoal-850 hover:border-lime-400/50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ExerciseMediaPreview exercise={ex} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {ex.name}
                          </span>
                          {!ex.is_system && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-lime-400/15 text-lime-400 shrink-0">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block truncate">
                          {ex.primary_muscle} • {ex.equipment} •{' '}
                          {TRACKING_TYPE_LABELS[ex.tracking_type]}
                        </span>
                      </div>
                    </div>
                    <span className="p-1.5 rounded-lg bg-lime-400/15 text-lime-400 shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
