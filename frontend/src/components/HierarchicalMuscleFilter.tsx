import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { Exercise } from '../types';

export interface MuscleChildOption {
  label: string;
  value: string;
  matchTerms: readonly string[];
}

export interface MuscleHierarchyCategory {
  category: string;
  allLabel: string;
  categoryMatchTerms: readonly string[];
  children: readonly MuscleChildOption[];
}

export const HIERARCHICAL_MUSCLE_TREE: readonly MuscleHierarchyCategory[] = [
  {
    category: 'Chest',
    allLabel: 'All Chest Muscles',
    categoryMatchTerms: [
      'chest',
      'pectoralis major',
      'upper chest / clavicular head',
      'upper chest',
      'clavicular head',
      'middle and lower chest / sternal and abdominal regions',
      'middle chest',
      'lower chest',
      'pectoralis minor',
      'serratus anterior',
    ],
    children: [
      {
        label: 'Pectoralis Major',
        value: 'Pectoralis Major',
        matchTerms: ['pectoralis major'],
      },
      {
        label: 'Upper Chest',
        value: 'Upper Chest',
        matchTerms: ['upper chest / clavicular head', 'upper chest', 'clavicular head'],
      },
      {
        label: 'Middle Chest',
        value: 'Middle Chest',
        matchTerms: [
          'middle and lower chest / sternal and abdominal regions',
          'middle chest',
          'sternal',
        ],
      },
      {
        label: 'Lower Chest',
        value: 'Lower Chest',
        matchTerms: [
          'middle and lower chest / sternal and abdominal regions',
          'lower chest',
          'abdominal regions',
        ],
      },
      {
        label: 'Pectoralis Minor',
        value: 'Pectoralis Minor',
        matchTerms: ['pectoralis minor'],
      },
      {
        label: 'Serratus Anterior',
        value: 'Serratus Anterior',
        matchTerms: ['serratus anterior'],
      },
    ],
  },
  {
    category: 'Back',
    allLabel: 'All Back Muscles',
    categoryMatchTerms: [
      'back',
      'latissimus dorsi (lats)',
      'latissimus dorsi',
      'lats',
      'upper back',
      'middle back',
      'lower back',
      'rhomboids',
      'trapezius: upper, middle, and lower fibers',
      'trapezius',
      'erector spinae',
      'teres major and teres minor',
      'teres major',
    ],
    children: [
      {
        label: 'Latissimus Dorsi (Lats)',
        value: 'Latissimus Dorsi (Lats)',
        matchTerms: ['latissimus dorsi (lats)', 'latissimus dorsi', 'lats'],
      },
      {
        label: 'Upper Back',
        value: 'Upper Back',
        matchTerms: ['upper back'],
      },
      {
        label: 'Middle Back',
        value: 'Middle Back',
        matchTerms: ['middle back'],
      },
      {
        label: 'Lower Back',
        value: 'Lower Back',
        matchTerms: ['lower back'],
      },
      {
        label: 'Rhomboids',
        value: 'Rhomboids',
        matchTerms: ['rhomboids'],
      },
      {
        label: 'Trapezius',
        value: 'Trapezius',
        matchTerms: ['trapezius: upper, middle, and lower fibers', 'trapezius'],
      },
      {
        label: 'Erector Spinae',
        value: 'Erector Spinae',
        matchTerms: ['erector spinae'],
      },
      {
        label: 'Teres Major',
        value: 'Teres Major',
        matchTerms: ['teres major and teres minor', 'teres major', 'teres minor'],
      },
    ],
  },
  {
    category: 'Shoulders',
    allLabel: 'All Shoulder Muscles',
    categoryMatchTerms: [
      'shoulders',
      'anterior deltoids',
      'lateral deltoids',
      'posterior deltoids',
      'rotator cuff',
    ],
    children: [
      {
        label: 'Anterior Deltoids',
        value: 'Anterior Deltoids',
        matchTerms: ['anterior deltoids'],
      },
      {
        label: 'Lateral Deltoids',
        value: 'Lateral Deltoids',
        matchTerms: ['lateral deltoids'],
      },
      {
        label: 'Posterior Deltoids',
        value: 'Posterior Deltoids',
        matchTerms: ['posterior deltoids'],
      },
      {
        label: 'Rotator Cuff',
        value: 'Rotator Cuff',
        matchTerms: ['rotator cuff'],
      },
    ],
  },
  {
    category: 'Arms',
    allLabel: 'All Arm Muscles',
    categoryMatchTerms: [
      'arms',
      'biceps',
      'biceps brachii',
      'brachialis',
      'brachioradialis',
      'triceps',
      'triceps brachii: long, lateral, and medial heads',
      'forearms',
      'forearms: wrist flexors and extensors',
      'grip muscles',
    ],
    children: [
      {
        label: 'Biceps Brachii',
        value: 'Biceps Brachii',
        matchTerms: ['biceps brachii', 'biceps'],
      },
      {
        label: 'Brachialis',
        value: 'Brachialis',
        matchTerms: ['brachialis'],
      },
      {
        label: 'Brachioradialis',
        value: 'Brachioradialis',
        matchTerms: ['brachioradialis'],
      },
      {
        label: 'Triceps Brachii',
        value: 'Triceps Brachii',
        matchTerms: ['triceps brachii: long, lateral, and medial heads', 'triceps'],
      },
      {
        label: 'Forearms (Wrist Flexors & Extensors)',
        value: 'Forearms (Wrist Flexors & Extensors)',
        matchTerms: ['forearms: wrist flexors and extensors', 'forearms'],
      },
      {
        label: 'Grip Muscles',
        value: 'Grip Muscles',
        matchTerms: ['grip muscles'],
      },
    ],
  },
  {
    category: 'Core & Abs',
    allLabel: 'All Core & Abs Muscles',
    categoryMatchTerms: [
      'core',
      'rectus abdominis',
      'upper abs',
      'lower abs',
      'obliques: internal and external',
      'obliques',
      'transverse abdominis',
      'deep core muscles',
    ],
    children: [
      {
        label: 'Rectus Abdominis',
        value: 'Rectus Abdominis',
        matchTerms: ['rectus abdominis'],
      },
      {
        label: 'Upper Abs',
        value: 'Upper Abs',
        matchTerms: ['upper abs'],
      },
      {
        label: 'Lower Abs',
        value: 'Lower Abs',
        matchTerms: ['lower abs'],
      },
      {
        label: 'Obliques',
        value: 'Obliques',
        matchTerms: ['obliques: internal and external', 'obliques'],
      },
      {
        label: 'Transverse Abdominis',
        value: 'Transverse Abdominis',
        matchTerms: ['transverse abdominis'],
      },
      {
        label: 'Deep Core Muscles',
        value: 'Deep Core Muscles',
        matchTerms: ['deep core muscles'],
      },
    ],
  },
  {
    category: 'Glutes & Hips',
    allLabel: 'All Glutes & Hips Muscles',
    categoryMatchTerms: [
      'glutes',
      'gluteus maximus',
      'gluteus medius',
      'gluteus minimus',
      'hip abductors',
      'hip adductors',
      'hip flexors',
      'iliopsoas',
    ],
    children: [
      {
        label: 'Gluteus Maximus',
        value: 'Gluteus Maximus',
        matchTerms: ['gluteus maximus'],
      },
      {
        label: 'Gluteus Medius',
        value: 'Gluteus Medius',
        matchTerms: ['gluteus medius'],
      },
      {
        label: 'Gluteus Minimus',
        value: 'Gluteus Minimus',
        matchTerms: ['gluteus minimus'],
      },
      {
        label: 'Hip Abductors',
        value: 'Hip Abductors',
        matchTerms: ['hip abductors'],
      },
      {
        label: 'Hip Adductors',
        value: 'Hip Adductors',
        matchTerms: ['hip adductors'],
      },
      {
        label: 'Hip Flexors',
        value: 'Hip Flexors',
        matchTerms: ['hip flexors'],
      },
      {
        label: 'Iliopsoas',
        value: 'Iliopsoas',
        matchTerms: ['iliopsoas'],
      },
    ],
  },
  {
    category: 'Legs',
    allLabel: 'All Leg Muscles',
    categoryMatchTerms: [
      'legs',
      'quadriceps',
      'rectus femoris',
      'vastus lateralis',
      'vastus medialis',
      'vastus intermedius',
      'hamstrings',
      'biceps femoris',
      'semitendinosus',
      'semimembranosus',
      'calves',
      'calves: gastrocnemius and soleus',
      'tibialis anterior',
      'other relevant lower-leg muscles',
    ],
    children: [
      {
        label: 'Quadriceps',
        value: 'Quadriceps',
        matchTerms: ['quadriceps'],
      },
      {
        label: 'Rectus Femoris',
        value: 'Rectus Femoris',
        matchTerms: ['rectus femoris'],
      },
      {
        label: 'Vastus Lateralis',
        value: 'Vastus Lateralis',
        matchTerms: ['vastus lateralis'],
      },
      {
        label: 'Vastus Medialis',
        value: 'Vastus Medialis',
        matchTerms: ['vastus medialis'],
      },
      {
        label: 'Vastus Intermedius',
        value: 'Vastus Intermedius',
        matchTerms: ['vastus intermedius'],
      },
      {
        label: 'Hamstrings',
        value: 'Hamstrings',
        matchTerms: ['hamstrings'],
      },
      {
        label: 'Biceps Femoris',
        value: 'Biceps Femoris',
        matchTerms: ['biceps femoris'],
      },
      {
        label: 'Semitendinosus',
        value: 'Semitendinosus',
        matchTerms: ['semitendinosus'],
      },
      {
        label: 'Semimembranosus',
        value: 'Semimembranosus',
        matchTerms: ['semimembranosus'],
      },
      {
        label: 'Calves (Gastrocnemius & Soleus)',
        value: 'Calves (Gastrocnemius & Soleus)',
        matchTerms: ['calves: gastrocnemius and soleus', 'calves'],
      },
      {
        label: 'Tibialis Anterior',
        value: 'Tibialis Anterior',
        matchTerms: ['tibialis anterior'],
      },
      {
        label: 'Lower Leg Muscles',
        value: 'Lower Leg Muscles',
        matchTerms: ['other relevant lower-leg muscles'],
      },
    ],
  },
  {
    category: 'Neck',
    allLabel: 'All Neck Muscles',
    categoryMatchTerms: ['neck', 'spinal stabilizers'],
    children: [
      {
        label: 'Neck Flexors & Extensors',
        value: 'Neck Flexors & Extensors',
        matchTerms: ['neck'],
      },
      {
        label: 'Spinal Stabilizers',
        value: 'Spinal Stabilizers',
        matchTerms: ['spinal stabilizers'],
      },
    ],
  },
  {
    category: 'Full Body',
    allLabel: 'All Full Body Movements',
    categoryMatchTerms: ['full body', 'olympic lifts / full-body power movements'],
    children: [
      {
        label: 'Full Body Compound',
        value: 'Full Body Compound',
        matchTerms: ['full body'],
      },
      {
        label: 'Olympic Lifts & Power Movements',
        value: 'Olympic Lifts & Power Movements',
        matchTerms: ['olympic lifts / full-body power movements'],
      },
    ],
  },
  {
    category: 'Cardio',
    allLabel: 'All Cardio Exercises',
    categoryMatchTerms: ['cardio'],
    children: [
      {
        label: 'Cardio & Conditioning',
        value: 'Cardio & Conditioning',
        matchTerms: ['cardio'],
      },
    ],
  },
  {
    category: 'Mobility & Stretching',
    allLabel: 'All Mobility & Stretching',
    categoryMatchTerms: ['mobility and stretching', 'mobility'],
    children: [
      {
        label: 'Mobility & Flexibility',
        value: 'Mobility & Flexibility',
        matchTerms: ['mobility and stretching', 'mobility'],
      },
    ],
  },
  {
    category: 'Other',
    allLabel: 'All Other Exercises',
    categoryMatchTerms: ['other'],
    children: [
      {
        label: 'Unclassified / Other',
        value: 'Unclassified / Other',
        matchTerms: ['other'],
      },
    ],
  },
] as const;

/**
 * Checks whether an exercise's primary or secondary muscles match the selected
 * parent category or specific muscle subdivision.
 */
export function matchesHierarchicalMuscleFilter(
  exercise: Pick<Exercise, 'primary_muscle' | 'secondary_muscles'>,
  selectedMuscle: string
): boolean {
  if (!selectedMuscle || selectedMuscle === 'All') {
    return true;
  }

  const exerciseMuscles = [
    exercise.primary_muscle,
    ...(exercise.secondary_muscles || []),
  ]
    .filter((m): m is string => Boolean(m))
    .map((m) => m.toLowerCase().trim());

  const selectedLower = selectedMuscle.toLowerCase().trim();

  // 1. Check if selectedMuscle is a top-level parent category
  const parentCat = HIERARCHICAL_MUSCLE_TREE.find(
    (c) =>
      c.category.toLowerCase() === selectedLower ||
      c.allLabel.toLowerCase() === selectedLower
  );
  if (parentCat) {
    const allTerms = new Set<string>([
      ...parentCat.categoryMatchTerms.map((t) => t.toLowerCase()),
      ...parentCat.children.flatMap((ch) => ch.matchTerms.map((t) => t.toLowerCase())),
    ]);
    return exerciseMuscles.some((em) =>
      Array.from(allTerms).some((term) => em === term || em.includes(term))
    );
  }

  // 2. Check if selectedMuscle is a specific child option
  for (const cat of HIERARCHICAL_MUSCLE_TREE) {
    const child = cat.children.find(
      (ch) =>
        ch.value.toLowerCase() === selectedLower ||
        ch.label.toLowerCase() === selectedLower
    );
    if (child) {
      return exerciseMuscles.some((em) =>
        child.matchTerms.some((term) => {
          const t = term.toLowerCase();
          return em === t || em.includes(t);
        })
      );
    }
  }

  // 3. Fallback direct/substring match
  return exerciseMuscles.some(
    (em) => em === selectedLower || em.includes(selectedLower)
  );
}

interface HierarchicalMuscleFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const HierarchicalMuscleFilter: React.FC<HierarchicalMuscleFilterProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine which category owns the current selection
  const activeCategoryName = useMemo(() => {
    if (!value || value === 'All') return null;
    const lower = value.toLowerCase();
    for (const cat of HIERARCHICAL_MUSCLE_TREE) {
      if (cat.category.toLowerCase() === lower || cat.allLabel.toLowerCase() === lower) {
        return cat.category;
      }
      if (cat.children.some((ch) => ch.value.toLowerCase() === lower)) {
        return cat.category;
      }
    }
    return null;
  }, [value]);

  // Display label for the closed trigger button
  const displayLabel = useMemo(() => {
    if (!value || value === 'All') return 'All Muscle Groups';
    const lower = value.toLowerCase();
    for (const cat of HIERARCHICAL_MUSCLE_TREE) {
      if (cat.category.toLowerCase() === lower || cat.allLabel.toLowerCase() === lower) {
        return cat.category;
      }
      const child = cat.children.find((ch) => ch.value.toLowerCase() === lower);
      if (child) return child.label;
    }
    return value;
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input and expand active category when dropdown opens
  useEffect(() => {
    if (isOpen) {
      if (activeCategoryName) {
        setExpandedCategory(activeCategoryName);
      }
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, activeCategoryName]);

  // Filter categories and children based on searchQuery
  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return HIERARCHICAL_MUSCLE_TREE.map((cat) => ({
        ...cat,
        visibleChildren: cat.children,
        autoExpanded: false,
      }));
    }

    const result: Array<
      MuscleHierarchyCategory & {
        visibleChildren: readonly MuscleChildOption[];
        autoExpanded: boolean;
      }
    > = [];

    for (const cat of HIERARCHICAL_MUSCLE_TREE) {
      const categoryMatches =
        cat.category.toLowerCase().includes(q) ||
        cat.allLabel.toLowerCase().includes(q);

      const matchingChildren = cat.children.filter(
        (ch) =>
          ch.label.toLowerCase().includes(q) ||
          ch.matchTerms.some((t) => t.toLowerCase().includes(q))
      );

      if (categoryMatches || matchingChildren.length > 0) {
        result.push({
          ...cat,
          visibleChildren:
            matchingChildren.length > 0 ? matchingChildren : cat.children,
          autoExpanded: true,
        });
      }
    }

    return result;
  }, [searchQuery]);

  const handleToggleCategory = (categoryName: string) => {
    // Allow only one category expanded at a time when not searching
    setExpandedCategory((prev) => (prev === categoryName ? null : categoryName));
  };

  const handleSelectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!containerRef.current) return;
      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'input[data-muscle-search="true"], button[data-muscle-item="true"]'
        )
      );
      if (focusable.length === 0) return;
      e.preventDefault();
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      let nextIndex = 0;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
      }
      focusable[nextIndex]?.focus();
    }
  };

  const isFiltered = value !== 'All';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="relative w-full"
    >
      {/* Closed Trigger Button (matches adjacent filter height & layout) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Filter by muscle group"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border text-sm flex items-center justify-between gap-2 text-left transition-colors focus:outline-none focus:border-lime-400 ${
          isFiltered
            ? 'border-lime-400/70 text-lime-600 dark:text-lime-400 font-semibold'
            : 'border-slate-200 dark:border-charcoal-700 text-slate-900 dark:text-slate-100'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
            isFiltered ? 'text-lime-400' : 'text-slate-400'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Hierarchical Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Muscle group options"
          className="absolute left-0 right-0 sm:min-w-[290px] max-w-[calc(100vw-2rem)] mt-1.5 z-40 rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 shadow-2xl overflow-hidden"
        >
          {/* Sticky Search Input */}
          <div className="p-2 border-b border-slate-200 dark:border-charcoal-800 bg-slate-50/70 dark:bg-charcoal-950/80">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                data-muscle-search="true"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search muscles or categories..."
                aria-label="Search muscle groups"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-lime-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear muscle search"
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-200 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Categories & Subdivisions */}
          <div className="max-h-80 overflow-y-auto overscroll-contain p-1.5 space-y-0.5">
            {/* All Muscle Groups (Clear Filter) */}
            {(!searchQuery.trim() ||
              'all muscle groups'.includes(searchQuery.trim().toLowerCase())) && (
              <button
                type="button"
                role="option"
                aria-selected={value === 'All'}
                data-muscle-item="true"
                onClick={() => handleSelectOption('All')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                  value === 'All'
                    ? 'bg-lime-400/15 text-lime-600 dark:text-lime-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800'
                }`}
              >
                <span>All Muscle Groups</span>
                {value === 'All' && <Check className="w-3.5 h-3.5 text-lime-400 shrink-0" />}
              </button>
            )}

            {filteredTree.length === 0 ? (
              <div className="py-6 px-3 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-400">No muscles found</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-[11px] font-bold text-lime-400 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredTree.map((cat) => {
                const isExpanded = cat.autoExpanded || expandedCategory === cat.category;
                const isCategorySelected =
                  value.toLowerCase() === cat.category.toLowerCase();
                const hasSelectedChild =
                  activeCategoryName === cat.category && !isCategorySelected;

                return (
                  <div key={cat.category} className="space-y-0.5">
                    {/* Parent Category Row */}
                    <button
                      type="button"
                      data-muscle-item="true"
                      aria-expanded={isExpanded}
                      onClick={() => handleToggleCategory(cat.category)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                        isCategorySelected || hasSelectedChild
                          ? 'text-lime-600 dark:text-lime-400 bg-lime-400/10'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{cat.category}</span>
                        {(isCategorySelected || hasSelectedChild) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0" />
                        )}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150" />
                      )}
                    </button>

                    {/* Indented Child Options */}
                    {isExpanded && (
                      <div className="pl-3 ml-2.5 border-l border-slate-200 dark:border-charcoal-800 space-y-0.5 py-0.5">
                        {/* All <Category> Muscles option */}
                        <button
                          type="button"
                          role="option"
                          aria-selected={isCategorySelected}
                          data-muscle-item="true"
                          onClick={() => handleSelectOption(cat.category)}
                          className={`w-full px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between text-left transition-colors ${
                            isCategorySelected
                              ? 'bg-lime-400 text-charcoal-950 font-bold'
                              : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-charcoal-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="truncate">{cat.allLabel}</span>
                          {isCategorySelected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </button>

                        {/* Individual Muscle Subdivisions */}
                        {cat.visibleChildren.map((child) => {
                          const isChildSelected =
                            value.toLowerCase() === child.value.toLowerCase();
                          return (
                            <button
                              key={child.value}
                              type="button"
                              role="option"
                              aria-selected={isChildSelected}
                              data-muscle-item="true"
                              onClick={() => handleSelectOption(child.value)}
                              className={`w-full px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between text-left transition-colors ${
                                isChildSelected
                                  ? 'bg-lime-400 text-charcoal-950 font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span className="truncate">{child.label}</span>
                              {isChildSelected && (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
