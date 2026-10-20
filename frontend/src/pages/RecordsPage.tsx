import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Calendar, ArrowUpRight, Filter } from 'lucide-react';
import { statsApi, exercisesApi, extractErrorMessage } from '../api/client';
import { PersonalRecordItem, Exercise } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatWeight, formatDuration } from '../utils/units';

const RECORD_TYPE_LABELS: Record<string, string> = {
  max_weight: 'Heaviest Weight',
  best_1rm: 'Best Est. 1RM (Epley)',
  max_reps: 'Highest Repetitions',
  longest_duration: 'Longest Duration',
  max_distance: 'Greatest Distance',
};

export const RecordsPage: React.FC = () => {
  const { weightUnit, showToast } = useAuth();
  const [records, setRecords] = useState<PersonalRecordItem[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [prList, exList] = await Promise.all([
        statsApi.getPersonalRecords(
          selectedExerciseId !== 'All' ? Number(selectedExerciseId) : undefined
        ),
        exercisesApi.list({ include_archived: true }),
      ]);
      setRecords(prList);
      setExercises(exList);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load personal records'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedExerciseId, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = records.filter(
    (r) => selectedType === 'All' || r.record_type === selectedType
  );

  const formatPrValue = (pr: PersonalRecordItem, val: number) => {
    if (pr.record_type === 'max_weight' || pr.record_type === 'best_1rm') {
      return formatWeight(val, weightUnit);
    }
    if (pr.record_type === 'max_reps') {
      return `${Math.round(val)} reps${
        pr.weight_kg ? ` @ ${formatWeight(pr.weight_kg, weightUnit)}` : ''
      }`;
    }
    if (pr.record_type === 'longest_duration') {
      return formatDuration(val);
    }
    return `${val} m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-lime-400" /> Personal Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automatically detected milestones when a completed workout surpasses your previous best.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            aria-label="Filter personal records by exercise"
            className="px-3 py-2 rounded-lg bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 text-xs sm:text-sm focus:outline-none focus:border-lime-400"
          >
            <option value="All">All Exercises</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter personal records by record type"
            className="px-3 py-2 rounded-lg bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 text-xs sm:text-sm focus:outline-none focus:border-lime-400"
          >
            <option value="All">All Record Types</option>
            <option value="max_weight">Heaviest Weight</option>
            <option value="best_1rm">Best Estimated 1RM</option>
            <option value="max_reps">Highest Repetitions</option>
            <option value="longest_duration">Longest Duration</option>
            <option value="max_distance">Greatest Distance</option>
          </select>
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-charcoal-900 border border-charcoal-800" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-10 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No personal records found for this filter
          </p>
          <p className="text-xs text-slate-400">
            Complete working sets in the Workout Logger to set new personal records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((pr) => (
            <div
              key={pr.id}
              className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-5 flex flex-col justify-between hover:border-lime-400/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-lime-400/15 text-lime-500 dark:text-lime-400 border border-lime-400/30 mb-1.5">
                    {RECORD_TYPE_LABELS[pr.record_type] || pr.record_type}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {pr.exercise_name}
                  </h3>
                  <p className="text-xs text-slate-400">{pr.primary_muscle}</p>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xl font-extrabold text-lime-500 dark:text-lime-400 block">
                    {formatPrValue(pr, pr.value)}
                  </span>
                  {pr.previous_value != null && pr.previous_value > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 mt-0.5">
                      <ArrowUpRight className="w-3 h-3 text-lime-400" /> Prev:{' '}
                      {pr.record_type === 'max_weight' || pr.record_type === 'best_1rm'
                        ? formatWeight(pr.previous_value, weightUnit)
                        : Math.round(pr.previous_value)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Baseline PR</span>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-charcoal-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Achieved {new Date(pr.achieved_at).toLocaleDateString()}
                </span>
                {pr.record_type === 'best_1rm' && pr.weight_kg && pr.reps ? (
                  <span className="font-mono">
                    Set: {formatWeight(pr.weight_kg, weightUnit)} × {pr.reps}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
