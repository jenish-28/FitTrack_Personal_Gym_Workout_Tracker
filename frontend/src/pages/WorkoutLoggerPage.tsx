import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Plus,
  Check,
  Trash2,
  ArrowUp,
  ArrowDown,
  Timer,
  Pause,
  Play,
  SkipForward,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Dumbbell,
  Save,
  ClipboardList,
} from 'lucide-react';
import {
  workoutsApi,
  routinesApi,
  extractErrorMessage,
} from '../api/client';
import {
  Workout,
  WorkoutRoutine,
  Exercise,
  SetType,
  TrackingType,
  PreviousSetPerformance,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  toDisplayWeight,
  fromDisplayWeight,
  formatVolume,
  formatWeight,
  formatClock,
  formatDuration,
} from '../utils/units';
import { ExercisePickerModal } from '../components/ExercisePickerModal';

const LOCAL_DRAFT_KEY = 'fittrack_active_workout_draft';

interface LoggerSetState {
  set_number: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  is_completed: boolean;
}

interface LoggerExerciseState {
  exercise_id: number;
  exercise_name: string;
  tracking_type: TrackingType;
  primary_muscle: string;
  equipment: string;
  rest_seconds: number;
  notes: string;
  sets: LoggerSetState[];
  previous_sets: PreviousSetPerformance[];
}

interface LoggerDraftState {
  workoutId: number;
  name: string;
  notes: string;
  startedAt: string;
  elapsedSeconds: number;
  exercises: LoggerExerciseState[];
}

export const WorkoutLoggerPage: React.FC = () => {
  const { user, weightUnit, setWeightUnitPreference, showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<LoggerDraftState | null>(null);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Rest Timer state
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(90);
  const [restRunning, setRestRunning] = useState<boolean>(false);

  // Modals
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [submittingFinish, setSubmittingFinish] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<Workout | null>(null);

  const syncTimeoutRef = useRef<number | null>(null);

  const mapServerWorkoutToDraft = useCallback((w: Workout): LoggerDraftState => {
    const startMs = new Date(w.started_at).getTime();
    const nowMs = Date.now();
    const elapsed = Math.max(w.duration_seconds || 0, Math.floor((nowMs - startMs) / 1000));
    return {
      workoutId: w.id,
      name: w.name,
      notes: w.notes || '',
      startedAt: w.started_at,
      elapsedSeconds: elapsed,
      exercises: w.exercises.map((we) => ({
        exercise_id: we.exercise_id,
        exercise_name: we.exercise_name_snapshot,
        tracking_type: we.tracking_type_snapshot,
        primary_muscle: we.primary_muscle_snapshot || 'Full Body',
        equipment: we.equipment_snapshot || 'Barbell',
        rest_seconds: we.rest_seconds || 90,
        notes: we.notes || '',
        sets: we.sets.map((s, idx) => ({
          set_number: idx + 1,
          set_type: s.set_type,
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          duration_seconds: s.duration_seconds ?? null,
          distance_meters: s.distance_meters ?? null,
          is_completed: s.is_completed,
        })),
        previous_sets: we.previous_sets || [],
      })),
    };
  }, []);

  // Initialize active workout or routine start
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoadingInit(true);
      try {
        const routineIdParam = searchParams.get('routineId');
        const routineList = await routinesApi.list();
        if (mounted) setRoutines(routineList);

        if (routineIdParam) {
          const started = await workoutsApi.start({ routine_id: Number(routineIdParam) });
          if (mounted) {
            const mapped = mapServerWorkoutToDraft(started);
            setDraft(mapped);
            localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(mapped));
            setSearchParams({}, { replace: true });
          }
          return;
        }

        // Check local draft first so refresh never loses unsaved edits
        const rawLocal = localStorage.getItem(LOCAL_DRAFT_KEY);
        if (rawLocal) {
          try {
            const parsed: LoggerDraftState = JSON.parse(rawLocal);
            if (parsed && parsed.workoutId) {
              if (mounted) setDraft(parsed);
              return;
            }
          } catch {
            localStorage.removeItem(LOCAL_DRAFT_KEY);
          }
        }

        const active = await workoutsApi.getActive();
        if (active && mounted) {
          const mapped = mapServerWorkoutToDraft(active);
          setDraft(mapped);
          localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(mapped));
        }
      } catch (err) {
        showToast(extractErrorMessage(err, 'Failed to initialize workout logger'), 'error');
      } finally {
        if (mounted) setLoadingInit(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [searchParams, setSearchParams, mapServerWorkoutToDraft, showToast]);

  // Workout Duration Stopwatch
  useEffect(() => {
    if (!draft || completedSummary) return;
    const interval = window.setInterval(() => {
      setDraft((prev) => {
        if (!prev) return null;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [draft?.workoutId, completedSummary]);

  // Rest Countdown Timer
  useEffect(() => {
    if (!restRunning || restRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          setRestRunning(false);
          showToast('Rest timer complete! Ready for next set.', 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restRunning, restRemaining, showToast]);

  // Persist to localStorage & debounced backend sync
  const persistDraftUpdate = useCallback(
    (updater: (prev: LoggerDraftState) => LoggerDraftState) => {
      setDraft((prev) => {
        if (!prev) return null;
        const updated = updater(prev);
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(updated));
        setAutosaveStatus('saving');

        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = window.setTimeout(async () => {
          try {
            await workoutsApi.syncWorkout(updated.workoutId, {
              name: updated.name,
              notes: updated.notes,
              duration_seconds: updated.elapsedSeconds,
              exercises: updated.exercises.map((ex, idx) => ({
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
            setAutosaveStatus('saved');
          } catch {
            setAutosaveStatus('idle');
          }
        }, 900);

        return updated;
      });
    },
    []
  );

  const handleStartEmptyWorkout = async () => {
    try {
      const started = await workoutsApi.start({ name: 'Strength Session' });
      const mapped = mapServerWorkoutToDraft(started);
      setDraft(mapped);
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(mapped));
      setCompletedSummary(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Could not start workout'), 'error');
    }
  };

  const handleStartRoutine = async (routineId: number) => {
    try {
      const started = await workoutsApi.start({ routine_id: routineId });
      const mapped = mapServerWorkoutToDraft(started);
      setDraft(mapped);
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(mapped));
      setCompletedSummary(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Could not start routine workout'), 'error');
    }
  };

  const handleAddExercise = async (ex: Exercise) => {
    let prevSets: PreviousSetPerformance[] = [];
    try {
      prevSets = await workoutsApi.getPreviousSets(ex.id);
    } catch {
      prevSets = [];
    }

    const defaultRest = user?.settings?.default_rest_seconds || 90;
    const firstPrev = prevSets[0];

    const initialSet: LoggerSetState = {
      set_number: 1,
      set_type: 'working',
      weight_kg: ex.tracking_type === 'weight_reps' ? (firstPrev?.weight_kg ?? 40) : null,
      reps:
        ex.tracking_type === 'weight_reps' || ex.tracking_type === 'reps_only'
          ? (firstPrev?.reps ?? 10)
          : null,
      duration_seconds: ex.tracking_type === 'duration' ? (firstPrev?.duration_seconds ?? 60) : null,
      distance_meters: ex.tracking_type === 'distance' ? (firstPrev?.distance_meters ?? 500) : null,
      is_completed: false,
    };

    persistDraftUpdate((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: ex.id,
          exercise_name: ex.name,
          tracking_type: ex.tracking_type,
          primary_muscle: ex.primary_muscle,
          equipment: ex.equipment,
          rest_seconds: defaultRest,
          notes: '',
          sets: [initialSet],
          previous_sets: prevSets,
        },
      ],
    }));
  };

  const handleAddSet = (exIdx: number, setType: SetType = 'working') => {
    persistDraftUpdate((prev) => {
      const exercises = [...prev.exercises];
      const targetEx = { ...exercises[exIdx] };
      const nextNum = targetEx.sets.length + 1;
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const prevSetMatch = targetEx.previous_sets.find((p) => p.set_number === nextNum);

      const newSet: LoggerSetState = {
        set_number: nextNum,
        set_type: setType,
        weight_kg:
          targetEx.tracking_type === 'weight_reps'
            ? (lastSet?.weight_kg ?? prevSetMatch?.weight_kg ?? 40)
            : null,
        reps:
          targetEx.tracking_type === 'weight_reps' || targetEx.tracking_type === 'reps_only'
            ? (lastSet?.reps ?? prevSetMatch?.reps ?? 10)
            : null,
        duration_seconds:
          targetEx.tracking_type === 'duration' ? (lastSet?.duration_seconds ?? 60) : null,
        distance_meters:
          targetEx.tracking_type === 'distance' ? (lastSet?.distance_meters ?? 500) : null,
        is_completed: false,
      };
      targetEx.sets = [...targetEx.sets, newSet];
      exercises[exIdx] = targetEx;
      return { ...prev, exercises };
    });
  };

  const handleUpdateSet = (
    exIdx: number,
    setIdx: number,
    changes: Partial<LoggerSetState>
  ) => {
    const exRest = draft?.exercises[exIdx]?.rest_seconds || 90;
    const wasCompleted = draft?.exercises[exIdx]?.sets[setIdx]?.is_completed;

    persistDraftUpdate((prev) => {
      const exercises = [...prev.exercises];
      const targetEx = { ...exercises[exIdx] };
      const sets = [...targetEx.sets];
      sets[setIdx] = { ...sets[setIdx], ...changes };
      targetEx.sets = sets;
      exercises[exIdx] = targetEx;
      return { ...prev, exercises };
    });

    if (changes.is_completed === true && !wasCompleted) {
      setRestTotal(exRest);
      setRestRemaining(exRest);
      setRestRunning(true);
    }
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    persistDraftUpdate((prev) => {
      const exercises = [...prev.exercises];
      const targetEx = { ...exercises[exIdx] };
      const filtered = targetEx.sets
        .filter((_, idx) => idx !== setIdx)
        .map((s, idx) => ({ ...s, set_number: idx + 1 }));
      targetEx.sets = filtered;
      exercises[exIdx] = targetEx;
      return { ...prev, exercises };
    });
  };

  const handleMoveExercise = (exIdx: number, direction: -1 | 1) => {
    persistDraftUpdate((prev) => {
      const exercises = [...prev.exercises];
      const targetIdx = exIdx + direction;
      if (targetIdx < 0 || targetIdx >= exercises.length) return prev;
      const [moved] = exercises.splice(exIdx, 1);
      exercises.splice(targetIdx, 0, moved);
      return { ...prev, exercises };
    });
  };

  const handleRemoveExercise = (exIdx: number) => {
    persistDraftUpdate((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, idx) => idx !== exIdx),
    }));
  };

  const handleFinishWorkout = async () => {
    if (!draft || submittingFinish) return;
    setSubmittingFinish(true);
    try {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      const finished = await workoutsApi.finish(draft.workoutId, {
        name: draft.name.trim() || 'Strength Session',
        notes: draft.notes.trim() || null,
        duration_seconds: Math.max(60, draft.elapsedSeconds),
        exercises: draft.exercises.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          order_index: idx,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes.trim() || null,
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
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setConfirmFinishOpen(false);
      setRestRunning(false);
      setRestRemaining(0);
      setCompletedSummary(finished);
      setDraft(null);
      showToast('Workout completed and saved!', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to finish workout'), 'error');
    } finally {
      setSubmittingFinish(false);
    }
  };

  const handleCancelWorkout = async () => {
    if (!draft) return;
    try {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      await workoutsApi.cancel(draft.workoutId);
    } catch {
      // Ignore if already removed
    }
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setDraft(null);
    setConfirmCancelOpen(false);
    setRestRunning(false);
    setRestRemaining(0);
    showToast('Workout cancelled and discarded', 'info');
  };

  // Calculate live metrics
  const liveVolumeKg = (draft?.exercises || []).reduce((acc, ex) => {
    if (ex.tracking_type !== 'weight_reps') return acc;
    return (
      acc +
      ex.sets.reduce((sAcc, s) => {
        if (!s.is_completed || s.set_type === 'warmup') return sAcc;
        return sAcc + (s.weight_kg || 0) * (s.reps || 0);
      }, 0)
    );
  }, 0);

  const liveCompletedSets = (draft?.exercises || []).reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.is_completed).length,
    0
  );

  // Completed Workout Summary Screen
  if (completedSummary) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-lime-400/50 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lime-400/20 text-lime-400 border border-lime-400/40">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-lime-400">
              Session Complete
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {completedSummary.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(completedSummary.completed_at || completedSummary.started_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Duration</span>
              <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                {formatDuration(completedSummary.duration_seconds)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Exercises</span>
              <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                {completedSummary.completed_exercises_count}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Completed Sets
              </span>
              <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                {completedSummary.completed_sets_count}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Total Volume
              </span>
              <span className="text-lg font-extrabold font-mono text-lime-500 dark:text-lime-400">
                {formatVolume(completedSummary.total_volume_kg, weightUnit)}
              </span>
            </div>
          </div>

          {/* Newly Unlocked Personal Records */}
          {completedSummary.new_records && completedSummary.new_records.length > 0 && (
            <div className="rounded-xl bg-lime-400/10 border border-lime-400/30 p-4 text-left space-y-2.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> New Personal Records Unlocked (
                {completedSummary.new_records.length})
              </h2>
              <div className="space-y-2">
                {completedSummary.new_records.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between text-xs bg-charcoal-950/60 px-3 py-2 rounded-lg"
                  >
                    <div>
                      <span className="font-bold text-white">{pr.exercise_name}</span>
                      <span className="ml-2 text-slate-400 uppercase text-[10px]">
                        ({pr.record_type.replace('_', ' ')})
                      </span>
                    </div>
                    <span className="font-mono font-extrabold text-lime-400">
                      {pr.record_type === 'max_weight' || pr.record_type === 'best_1rm'
                        ? formatWeight(pr.value, weightUnit)
                        : pr.record_type === 'max_reps'
                        ? `${Math.round(pr.value)} reps`
                        : `${pr.value}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-charcoal-700 text-xs font-semibold"
            >
              View in Workout History
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingInit) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        Loading Workout Logger...
      </div>
    );
  }

  // Empty State: Start Empty Workout or Pick a Routine
  if (!draft) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workout Logger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Start a freestyle session or launch directly from one of your saved routines.
          </p>
        </div>

        {/* Start Empty Workout Card */}
        <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Quick Start — Empty Workout
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Begin an open gym session and add exercises as you go.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartEmptyWorkout}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-sm transition-colors shadow-sm shrink-0"
          >
            <PlayCircle className="w-5 h-5 stroke-[2.5]" />
            Start Empty Workout
          </button>
        </div>

        {/* Start from Routine */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-lime-400" /> Start from Routine or Template
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routines.map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 flex flex-col justify-between hover:border-lime-400/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {r.name}
                    </h3>
                    {r.is_template && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-charcoal-800 text-slate-400">
                        Template
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {r.exercises.map((e) => e.exercise?.name).filter(Boolean).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartRoutine(r.id)}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:bg-lime-400 hover:text-charcoal-950 font-bold text-xs transition-colors"
                >
                  Start {r.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Sticky Active Workout Telemetry Bar */}
      <div className="sticky top-0 md:top-2 z-20 rounded-xl bg-white/95 dark:bg-charcoal-900/95 backdrop-blur border border-slate-200 dark:border-charcoal-700 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="text"
            value={draft.name}
            onChange={(e) =>
              persistDraftUpdate((prev) => ({ ...prev, name: e.target.value }))
            }
            aria-label="Workout Name"
            className="text-lg font-extrabold bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-slate-900 dark:text-white truncate w-full max-w-xs"
          />
          <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
            <Save className="w-3 h-3 text-lime-400" />
            {autosaveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
          </span>
        </div>

        {/* Live Session Metrics */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-charcoal-800">
            <Clock className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-bold text-slate-900 dark:text-white">
              {formatClock(draft.elapsedSeconds)}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-charcoal-800">
            <span className="text-slate-400">Vol: </span>
            <span className="font-bold text-lime-500 dark:text-lime-400">
              {formatVolume(liveVolumeKg, weightUnit)}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-charcoal-800">
            <span className="text-slate-400">Sets: </span>
            <span className="font-bold text-slate-900 dark:text-white">{liveCompletedSets}</span>
          </div>

          {/* Unit Quick Switch */}
          <button
            type="button"
            onClick={() => setWeightUnitPreference(weightUnit === 'kg' ? 'lbs' : 'kg')}
            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-charcoal-700 font-bold uppercase text-lime-500 dark:text-lime-400"
          >
            {weightUnit}
          </button>

          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 font-sans font-semibold text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => setConfirmFinishOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-sans font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            Finish Workout
          </button>
        </div>
      </div>

      {/* Interactive Rest Timer Bar */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              restRunning
                ? 'bg-lime-400 text-charcoal-950'
                : 'bg-slate-100 dark:bg-charcoal-800 text-lime-400'
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rest Timer
              </span>
              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                {formatClock(restRemaining)}
              </span>
            </div>
            <div className="w-36 sm:w-48 h-1 bg-slate-200 dark:bg-charcoal-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-lime-400 transition-all"
                style={{
                  width: `${
                    restTotal > 0 ? Math.min(100, (restRemaining / restTotal) * 100) : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {[60, 90, 120, 180].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setRestTotal(preset);
                setRestRemaining(preset);
                setRestRunning(true);
              }}
              className="px-2 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-charcoal-800 hover:border-lime-400 border border-transparent text-slate-600 dark:text-slate-300"
            >
              {preset}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRestRemaining((r) => Math.max(0, r - 15))}
            className="px-2 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:text-white"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => {
              setRestRemaining((r) => r + 15);
              setRestTotal((t) => Math.max(t, restRemaining + 15));
            }}
            className="px-2 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:text-white"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={() => {
              if (restRemaining === 0) {
                setRestRemaining(restTotal || 90);
                setRestRunning(true);
              } else {
                setRestRunning((r) => !r);
              }
            }}
            aria-label={restRunning ? 'Pause Rest Timer' : 'Start Rest Timer'}
            className="p-1.5 rounded-lg bg-lime-400/20 text-lime-400 hover:bg-lime-400/30"
          >
            {restRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setRestRunning(false);
              setRestRemaining(0);
            }}
            aria-label="Skip Rest Timer"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:text-white"
            title="Skip Rest"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Workout Notes */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4">
        <input
          type="text"
          value={draft.notes}
          onChange={(e) =>
            persistDraftUpdate((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Add overall workout notes (energy level, gym equipment, bodyweight)..."
          aria-label="Workout Notes"
          className="w-full bg-transparent text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
        />
      </div>

      {/* Exercises List */}
      {draft.exercises.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-dashed border-slate-300 dark:border-charcoal-700 p-10 text-center space-y-3">
          <Dumbbell className="w-8 h-8 text-lime-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No exercises added to this session yet
          </p>
          <p className="text-xs text-slate-400">
            Add an exercise from the library to start logging sets and reps.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-lime-400 text-charcoal-950 font-bold text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add First Exercise
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {draft.exercises.map((ex, exIdx) => (
            <div
              key={`${ex.exercise_id}-${exIdx}`}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-4 sm:p-5 space-y-4"
            >
              {/* Exercise Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-lime-600 dark:text-lime-400">
                      {exIdx + 1}. {ex.exercise_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-charcoal-800 text-slate-400">
                      {ex.primary_muscle} • {ex.equipment}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {ex.tracking_type === 'weight_reps'
                      ? `Volume = Weight × Reps (${weightUnit.toUpperCase()})`
                      : ex.tracking_type === 'reps_only'
                      ? 'Bodyweight Movement — Tracks Repetitions (0 external weight volume)'
                      : ex.tracking_type === 'duration'
                      ? 'Isometric / Timed Movement — Tracks Duration (seconds)'
                      : 'Cardio / Distance Movement — Tracks Distance (m) & Duration (s)'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={exIdx === 0}
                    onClick={() => handleMoveExercise(exIdx, -1)}
                    className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Move Exercise Up"
                    aria-label={`Move ${ex.exercise_name} up`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={exIdx === draft.exercises.length - 1}
                    onClick={() => handleMoveExercise(exIdx, 1)}
                    className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Move Exercise Down"
                    aria-label={`Move ${ex.exercise_name} down`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exIdx)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400"
                    title="Remove Exercise"
                    aria-label={`Remove ${ex.exercise_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Exercise Note Input */}
              <input
                type="text"
                value={ex.notes}
                onChange={(e) => {
                  const val = e.target.value;
                  persistDraftUpdate((prev) => {
                    const exercises = [...prev.exercises];
                    exercises[exIdx] = { ...exercises[exIdx], notes: val };
                    return { ...prev, exercises };
                  });
                }}
                placeholder="Add exercise note (grip width, seat setting, RPE)..."
                aria-label={`Notes for ${ex.exercise_name}`}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-lime-400"
              />

              {/* Sets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-charcoal-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-2 w-20">Set</th>
                      <th className="py-2 px-2">Previous</th>
                      {ex.tracking_type === 'weight_reps' && (
                        <>
                          <th className="py-2 px-2 w-28">{weightUnit.toUpperCase()}</th>
                          <th className="py-2 px-2 w-24">Reps</th>
                        </>
                      )}
                      {ex.tracking_type === 'reps_only' && (
                        <th className="py-2 px-2 w-28">Reps</th>
                      )}
                      {ex.tracking_type === 'duration' && (
                        <th className="py-2 px-2 w-32">Duration (s)</th>
                      )}
                      {ex.tracking_type === 'distance' && (
                        <>
                          <th className="py-2 px-2 w-28">Dist (m)</th>
                          <th className="py-2 px-2 w-28">Time (s)</th>
                        </>
                      )}
                      <th className="py-2 pl-2 text-center w-20">Done</th>
                      <th className="py-2 pl-1 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-charcoal-850 text-xs sm:text-sm">
                    {ex.sets.map((s, sIdx) => {
                      const prevMatch = ex.previous_sets.find(
                        (p) => p.set_number === s.set_number
                      );
                      const prevLabel = prevMatch
                        ? ex.tracking_type === 'weight_reps'
                          ? `${toDisplayWeight(prevMatch.weight_kg, weightUnit)} ${weightUnit} × ${
                              prevMatch.reps ?? 0
                            }`
                          : ex.tracking_type === 'reps_only'
                          ? `${prevMatch.reps ?? 0} reps`
                          : ex.tracking_type === 'duration'
                          ? `${prevMatch.duration_seconds ?? 0}s`
                          : `${prevMatch.distance_meters ?? 0}m`
                        : '—';

                      return (
                        <tr
                          key={sIdx}
                          className={`transition-colors ${
                            s.is_completed
                              ? 'bg-lime-400/10 dark:bg-lime-400/10'
                              : 'hover:bg-slate-50 dark:hover:bg-charcoal-850/60'
                          }`}
                        >
                          {/* Set Number & Type Selector */}
                          <td className="py-2 pr-2">
                            <select
                              value={s.set_type}
                              onChange={(e) =>
                                handleUpdateSet(exIdx, sIdx, {
                                  set_type: e.target.value as SetType,
                                })
                              }
                              aria-label={`Set ${s.set_number} type`}
                              className={`px-2 py-1 rounded text-xs font-mono font-bold border ${
                                s.set_type === 'warmup'
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                  : 'bg-slate-100 dark:bg-charcoal-800 border-slate-200 dark:border-charcoal-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <option value="warmup">W</option>
                              <option value="working">{s.set_number}</option>
                              <option value="dropset">D</option>
                              <option value="failure">F</option>
                            </select>
                          </td>

                          {/* Previous Performance */}
                          <td className="py-2 px-2 font-mono text-xs text-slate-400">
                            {prevLabel}
                          </td>

                          {/* Inputs based on Tracking Type */}
                          {ex.tracking_type === 'weight_reps' && (
                            <>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={
                                    s.weight_kg !== null && s.weight_kg !== undefined
                                      ? toDisplayWeight(s.weight_kg, weightUnit)
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    handleUpdateSet(exIdx, sIdx, {
                                      weight_kg:
                                        raw === ''
                                          ? null
                                          : fromDisplayWeight(Number(raw), weightUnit),
                                    });
                                  }}
                                  aria-label={`${ex.exercise_name} Set ${s.set_number} Weight`}
                                  className="w-20 sm:w-24 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={s.reps ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    handleUpdateSet(exIdx, sIdx, {
                                      reps: raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
                                    });
                                  }}
                                  aria-label={`${ex.exercise_name} Set ${s.set_number} Reps`}
                                  className="w-16 sm:w-20 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                                />
                              </td>
                            </>
                          )}

                          {ex.tracking_type === 'reps_only' && (
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                value={s.reps ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  handleUpdateSet(exIdx, sIdx, {
                                    reps: raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
                                  });
                                }}
                                aria-label={`${ex.exercise_name} Set ${s.set_number} Reps`}
                                className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                              />
                            </td>
                          )}

                          {ex.tracking_type === 'duration' && (
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                value={s.duration_seconds ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  handleUpdateSet(exIdx, sIdx, {
                                    duration_seconds:
                                      raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
                                  });
                                }}
                                aria-label={`${ex.exercise_name} Set ${s.set_number} Duration`}
                                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                              />
                            </td>
                          )}

                          {ex.tracking_type === 'distance' && (
                            <>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={s.distance_meters ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    handleUpdateSet(exIdx, sIdx, {
                                      distance_meters:
                                        raw === '' ? null : Math.max(0, Number(raw) || 0),
                                    });
                                  }}
                                  aria-label={`${ex.exercise_name} Set ${s.set_number} Distance`}
                                  className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={s.duration_seconds ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    handleUpdateSet(exIdx, sIdx, {
                                      duration_seconds:
                                        raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
                                    });
                                  }}
                                  aria-label={`${ex.exercise_name} Set ${s.set_number} Duration`}
                                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 font-mono text-center focus:outline-none focus:border-lime-400"
                                />
                              </td>
                            </>
                          )}

                          {/* Set Completion Toggle */}
                          <td className="py-2 pl-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSet(exIdx, sIdx, {
                                  is_completed: !s.is_completed,
                                })
                              }
                              aria-label={`Mark ${ex.exercise_name} Set ${s.set_number} Completed`}
                              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
                                s.is_completed
                                  ? 'bg-lime-400 text-charcoal-950 font-bold shadow-sm'
                                  : 'bg-slate-100 dark:bg-charcoal-800 text-slate-400 hover:border-lime-400 border border-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </td>

                          {/* Remove Set */}
                          <td className="py-2 pl-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exIdx, sIdx)}
                              aria-label={`Remove Set ${s.set_number}`}
                              className="p-1 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Working / Warmup Set Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddSet(exIdx, 'working')}
                  className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-charcoal-800 hover:bg-slate-200 dark:hover:bg-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  + Add Working Set
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSet(exIdx, 'warmup')}
                  className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-400 transition-colors"
                >
                  + Warm-up Set
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Bar to Add Exercise */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-dashed border-lime-400/50 hover:border-lime-400 bg-lime-400/10 text-lime-500 dark:text-lime-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add Exercise to Workout
        </button>
      </div>

      {/* Finish Workout Confirmation Dialog */}
      {confirmFinishOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-lime-400" /> Finish &amp; Save Workout?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
              You have completed <strong>{liveCompletedSets} sets</strong> across{' '}
              <strong>{draft.exercises.length} exercises</strong> with a total working volume of{' '}
              <strong>{formatVolume(liveVolumeKg, weightUnit)}</strong>.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFinishOpen(false)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Keep Logging
              </button>
              <button
                type="button"
                disabled={submittingFinish}
                onClick={handleFinishWorkout}
                className="px-5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-charcoal-950 font-bold text-xs"
              >
                {submittingFinish ? 'Saving...' : 'Confirm & Finish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Workout Confirmation Dialog */}
      {confirmCancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" /> Discard Active Workout?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
              Are you sure you want to cancel this workout? Any sets logged during this session will
              be discarded.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Resume Workout
              </button>
              <button
                type="button"
                onClick={handleCancelWorkout}
                className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                Discard Workout
              </button>
            </div>
          </div>
        </div>
      )}

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </div>
  );
};
