import React, { useEffect, useState } from 'react';
import { Dumbbell, Play, Pause } from 'lucide-react';
import { Exercise } from '../types';

interface ExerciseMediaPreviewProps {
  exercise: Pick<Exercise, 'name' | 'primary_muscle' | 'equipment' | 'media_url'>;
  size?: 'sm' | 'md' | 'lg';
  animateFrames?: boolean;
  className?: string;
}

export const ExerciseMediaPreview: React.FC<ExerciseMediaPreviewProps> = ({
  exercise,
  size = 'md',
  animateFrames = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const [frameIndex, setFrameIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(animateFrames);

  const mediaUrl = exercise.media_url?.trim() || null;
  const hasDualFrameDemo = Boolean(
    mediaUrl &&
      mediaUrl.includes('raw.githubusercontent.com/yuhonas/free-exercise-db/') &&
      mediaUrl.endsWith('/0.jpg')
  );

  useEffect(() => {
    setImgError(false);
    setFrameIndex(0);
    setIsPlaying(animateFrames);
  }, [mediaUrl, animateFrames]);

  useEffect(() => {
    if (!hasDualFrameDemo || !isPlaying || imgError) return;
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev === 0 ? 1 : 0));
    }, 1100);
    return () => window.clearInterval(interval);
  }, [hasDualFrameDemo, isPlaying, imgError]);

  const activeSrc =
    hasDualFrameDemo && frameIndex === 1 && mediaUrl
      ? mediaUrl.replace(/\/0\.jpg$/, '/1.jpg')
      : mediaUrl;

  const sizeClasses =
    size === 'sm'
      ? 'w-12 h-12 rounded-lg shrink-0'
      : size === 'lg'
      ? 'w-full h-56 sm:h-72 rounded-xl'
      : 'w-full h-36 rounded-lg';

  if (!activeSrc || imgError) {
    return (
      <div
        className={`${sizeClasses} bg-slate-100 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 flex flex-col items-center justify-center text-center p-2 select-none ${className}`}
      >
        <div className="w-8 h-8 rounded-lg bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-lime-500 dark:text-lime-400 mb-1">
          <Dumbbell className="w-4 h-4" />
        </div>
        {size !== 'sm' && (
          <>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1 px-2">
              {exercise.name}
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              {exercise.primary_muscle} • {exercise.equipment}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} relative overflow-hidden bg-slate-900 border border-slate-200 dark:border-charcoal-800 group ${className}`}
      onMouseEnter={() => {
        if (hasDualFrameDemo && size !== 'lg') setIsPlaying(true);
      }}
      onMouseLeave={() => {
        if (hasDualFrameDemo && size !== 'lg' && !animateFrames) {
          setIsPlaying(false);
          setFrameIndex(0);
        }
      }}
    >
      <img
        src={activeSrc}
        alt={`${exercise.name} demonstration`}
        loading="lazy"
        onError={() => {
          if (frameIndex === 1) {
            setFrameIndex(0);
            setIsPlaying(false);
          } else {
            setImgError(true);
          }
        }}
        className={`w-full h-full ${
          size === 'lg' ? 'object-contain bg-charcoal-950' : 'object-cover'
        } transition-transform duration-300`}
      />

      {hasDualFrameDemo && size === 'lg' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying((prev) => !prev);
          }}
          className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-charcoal-900/90 border border-charcoal-700 text-[11px] font-bold text-lime-400 flex items-center gap-1 hover:bg-charcoal-800"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3 h-3" /> Pause Motion
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Animate Motion
            </>
          )}
        </button>
      )}

      {mediaUrl?.startsWith('/api/exercises/media/') && size !== 'sm' && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-lime-400 text-charcoal-950 text-[10px] font-extrabold uppercase tracking-wider shadow">
          Uploaded Media
        </span>
      )}
    </div>
  );
};

interface MuscleTargetDiagramProps {
  primaryMuscle: string;
  secondaryMuscles: string[];
}

export const MuscleTargetDiagram: React.FC<MuscleTargetDiagramProps> = ({
  primaryMuscle,
  secondaryMuscles,
}) => {
  const lowerPrimary = primaryMuscle.toLowerCase();
  const lowerSecondary = secondaryMuscles.map((m) => m.toLowerCase()).join(' | ');

  const isRegionStatus = (keywords: string[]): 'primary' | 'secondary' | 'none' => {
    if (keywords.some((k) => lowerPrimary.includes(k))) return 'primary';
    if (keywords.some((k) => lowerSecondary.includes(k))) return 'secondary';
    return 'none';
  };

  const getFill = (status: 'primary' | 'secondary' | 'none') => {
    if (status === 'primary') return '#a3e635'; // vibrant lime-400
    if (status === 'secondary') return '#f59e0b'; // amber-500
    return '#334155'; // slate-700 neutral
  };

  const chestStatus = isRegionStatus(['chest', 'pectoralis', 'serratus', 'full body']);
  const shoulderStatus = isRegionStatus(['shoulder', 'deltoid', 'rotator', 'full body', 'olympic']);
  const bicepsStatus = isRegionStatus(['bicep', 'brachialis', 'arm']);
  const forearmStatus = isRegionStatus(['forearm', 'brachioradialis', 'grip', 'wrist']);
  const coreStatus = isRegionStatus(['core', 'abdomin', 'abs', 'oblique', 'transverse']);
  const quadStatus = isRegionStatus(['quad', 'rectus femoris', 'vastus', 'hip flexor', 'iliopsoas', 'full body', 'olympic', 'cardio']);
  const trapStatus = isRegionStatus(['trap', 'neck', 'upper back', 'olympic']);
  const backStatus = isRegionStatus(['back', 'lat', 'rhomboid', 'teres', 'erector', 'spinal']);
  const tricepsStatus = isRegionStatus(['tricep']);
  const gluteStatus = isRegionStatus(['glute', 'hip abductor', 'hip adductor', 'full body', 'olympic']);
  const hamstringStatus = isRegionStatus(['hamstring', 'biceps femoris', 'semitendinosus', 'semimembranosus']);
  const calfStatus = isRegionStatus(['calf', 'calves', 'gastrocnemius', 'soleus', 'tibialis', 'lower-leg', 'cardio']);

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-800 p-4 flex flex-col sm:flex-row items-center gap-4">
      {/* Anterior & Posterior Silhouette SVG */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <svg viewBox="0 0 100 210" className="w-20 h-36 mx-auto" aria-label="Anterior muscle map">
            {/* Head & Neck */}
            <circle cx="50" cy="18" r="11" fill="#475569" />
            <rect x="45" y="29" width="10" height="7" rx="2" fill={getFill(trapStatus)} />
            {/* Shoulders */}
            <ellipse cx="26" cy="46" rx="9" ry="11" fill={getFill(shoulderStatus)} />
            <ellipse cx="74" cy="46" rx="9" ry="11" fill={getFill(shoulderStatus)} />
            {/* Chest */}
            <rect x="34" y="37" width="15" height="18" rx="4" fill={getFill(chestStatus)} />
            <rect x="51" y="37" width="15" height="18" rx="4" fill={getFill(chestStatus)} />
            {/* Biceps */}
            <rect x="18" y="58" width="9" height="22" rx="4" fill={getFill(bicepsStatus)} />
            <rect x="73" y="58" width="9" height="22" rx="4" fill={getFill(bicepsStatus)} />
            {/* Forearms */}
            <rect x="15" y="82" width="8" height="22" rx="3" fill={getFill(forearmStatus)} />
            <rect x="77" y="82" width="8" height="22" rx="3" fill={getFill(forearmStatus)} />
            {/* Core / Abs */}
            <rect x="37" y="57" width="26" height="36" rx="5" fill={getFill(coreStatus)} />
            {/* Quads */}
            <rect x="34" y="96" width="14" height="45" rx="6" fill={getFill(quadStatus)} />
            <rect x="52" y="96" width="14" height="45" rx="6" fill={getFill(quadStatus)} />
            {/* Shins / Tibialis / Calves */}
            <rect x="35" y="145" width="12" height="42" rx="5" fill={getFill(calfStatus)} />
            <rect x="53" y="145" width="12" height="42" rx="5" fill={getFill(calfStatus)} />
          </svg>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Front</span>
        </div>

        <div className="text-center">
          <svg viewBox="0 0 100 210" className="w-20 h-36 mx-auto" aria-label="Posterior muscle map">
            {/* Head */}
            <circle cx="50" cy="18" r="11" fill="#475569" />
            {/* Traps & Neck */}
            <polygon points="35,34 50,27 65,34 58,48 42,48" fill={getFill(trapStatus)} />
            {/* Rear Shoulders */}
            <ellipse cx="26" cy="46" rx="9" ry="11" fill={getFill(shoulderStatus)} />
            <ellipse cx="74" cy="46" rx="9" ry="11" fill={getFill(shoulderStatus)} />
            {/* Upper/Mid/Lower Back & Lats */}
            <rect x="34" y="46" width="32" height="38" rx="5" fill={getFill(backStatus)} />
            {/* Triceps */}
            <rect x="18" y="58" width="9" height="22" rx="4" fill={getFill(tricepsStatus)} />
            <rect x="73" y="58" width="9" height="22" rx="4" fill={getFill(tricepsStatus)} />
            {/* Forearms */}
            <rect x="15" y="82" width="8" height="22" rx="3" fill={getFill(forearmStatus)} />
            <rect x="77" y="82" width="8" height="22" rx="3" fill={getFill(forearmStatus)} />
            {/* Glutes */}
            <rect x="34" y="86" width="15" height="20" rx="6" fill={getFill(gluteStatus)} />
            <rect x="51" y="86" width="15" height="20" rx="6" fill={getFill(gluteStatus)} />
            {/* Hamstrings */}
            <rect x="34" y="108" width="14" height="35" rx="6" fill={getFill(hamstringStatus)} />
            <rect x="52" y="108" width="14" height="35" rx="6" fill={getFill(hamstringStatus)} />
            {/* Calves */}
            <rect x="35" y="146" width="12" height="41" rx="5" fill={getFill(calfStatus)} />
            <rect x="53" y="146" width="12" height="41" rx="5" fill={getFill(calfStatus)} />
          </svg>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Back</span>
        </div>
      </div>

      {/* Target Muscle Legend & Breakdown */}
      <div className="flex-1 space-y-3 w-full">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block" />
            <span>Primary Target Muscle</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
            {primaryMuscle}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Secondary Synergist Muscles</span>
          </div>
          {secondaryMuscles && secondaryMuscles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {secondaryMuscles.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-semibold"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Isolated primary muscle focus</p>
          )}
        </div>
      </div>
    </div>
  );
};
