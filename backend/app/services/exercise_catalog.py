"""
Comprehensive FitTrack Exercise Catalogue & Muscle Group Taxonomy.

Demonstration media URLs use verified entries from the Public Domain (Unlicense)
`yuhonas/free-exercise-db` open-source dataset (https://github.com/yuhonas/free-exercise-db)
where an exact movement match exists, and fall back to FitTrack's built-in SVG movement &
anatomical target diagram generator (`/api/exercises/{id}/illustration.svg`) when no external
photo is available or when offline.
"""

from typing import Dict, List

FREE_EX_DB_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"

# Broad muscle group -> prefix / related subdivisions mapping so filtering by a broad
# muscle group (e.g. "Chest") returns both "Chest" and all "Chest - ..." subdivisions.
MUSCLE_FAMILY_ALIASES: Dict[str, List[str]] = {
    "chest": [
        "chest",
        "pectoralis major",
        "upper chest / clavicular head",
        "middle and lower chest / sternal and abdominal regions",
        "pectoralis minor",
        "serratus anterior",
    ],
    "back": [
        "back",
        "latissimus dorsi (lats)",
        "upper back",
        "middle back",
        "lower back",
        "rhomboids",
        "trapezius: upper, middle, and lower fibers",
        "erector spinae",
        "teres major and teres minor",
    ],
    "shoulders": [
        "shoulders",
        "anterior deltoids",
        "lateral deltoids",
        "posterior deltoids",
        "rotator cuff",
    ],
    "biceps": [
        "biceps",
        "biceps brachii",
        "brachialis",
        "brachioradialis",
    ],
    "triceps": [
        "triceps",
        "triceps brachii: long, lateral, and medial heads",
    ],
    "forearms": [
        "forearms",
        "forearms: wrist flexors and extensors",
        "grip muscles",
        "brachioradialis",
    ],
    "core": [
        "core",
        "rectus abdominis",
        "upper abs",
        "lower abs",
        "obliques: internal and external",
        "transverse abdominis",
        "deep core muscles",
        "spinal stabilizers",
    ],
    "glutes": [
        "glutes",
        "gluteus maximus",
        "gluteus medius",
        "gluteus minimus",
        "hip abductors",
        "hip adductors",
        "hip flexors",
        "iliopsoas",
    ],
    "quadriceps": [
        "quadriceps",
        "rectus femoris",
        "vastus lateralis",
        "vastus medialis",
        "vastus intermedius",
    ],
    "hamstrings": [
        "hamstrings",
        "biceps femoris",
        "semitendinosus",
        "semimembranosus",
    ],
    "calves": [
        "calves",
        "calves: gastrocnemius and soleus",
        "tibialis anterior",
        "other relevant lower-leg muscles",
    ],
    "full body": [
        "full body",
        "olympic lifts / full-body power movements",
    ],
    "cardio": ["cardio"],
    "mobility and stretching": ["mobility and stretching", "mobility"],
}


COMPREHENSIVE_SYSTEM_EXERCISES: List[Dict] = [
    # =========================================================================
    # 1. ORIGINAL 18 CORE SYSTEM EXERCISES (Preserved Names & Primary Muscles)
    # =========================================================================
    {
        "name": "Bench Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Shoulders", "Pectoralis major", "Anterior deltoids"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie flat on a horizontal bench with your eyes directly beneath the barbell.\n"
            "2. Retract and depress your shoulder blades into the pad and plant your feet firmly on the floor.\n"
            "3. Grip the barbell slightly wider than shoulder-width and unrack with straight arms over your shoulders.\n"
            "4. Inhale and lower the bar under control to your mid-to-lower sternum with elbows tucked at roughly 45–60 degrees.\n"
            "5. Press the barbell upward and slightly back toward the rack until elbows lock out.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep wrists stacked straight over elbows.\n"
            "• Avoid bouncing the bar off the ribcage or flaring elbows to 90 degrees."
        ),
    },
    {
        "name": "Incline Dumbbell Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Upper chest / clavicular head", "Anterior deltoids", "Triceps"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Incline_Dumbbell_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set an adjustable bench to a 30-degree incline to target the clavicular head of the chest.\n"
            "2. Kick the dumbbells up to shoulder level using your thighs as you lean back.\n"
            "3. Lower the dumbbells slowly until the handles align with your upper chest.\n"
            "4. Press the weights up in a converging arc without clanking the dumbbells together.\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid setting the bench higher than 45 degrees, which shifts tension excessively to the front delts."
        ),
    },
    {
        "name": "Chest Fly",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Pectoralis major", "Anterior deltoids", "Serratus anterior"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Cable_Crossover/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set dual cable pulleys to chest height and stand centered with a staggered stance.\n"
            "2. Maintain a slight, fixed bend in your elbows throughout the movement.\n"
            "3. Sweep your hands together in a wide hugging arc in front of your sternum and pause for 1 second.\n"
            "4. Return slowly until you feel a controlled stretch across the pectorals.\n\n"
            "Technique & Safety Notes:\n"
            "• Do not turn the movement into a press by bending and extending the elbows."
        ),
    },
    {
        "name": "Lat Pulldown",
        "primary_muscle": "Back",
        "secondary_muscles": ["Latissimus dorsi (lats)", "Biceps", "Teres major and teres minor", "Forearms"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Wide-Grip_Lat_Pulldown/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Secure your thighs tightly under the knee pad and grasp the bar wider than shoulder width.\n"
            "2. Depress your scapulae first, lean back 10–15 degrees, and drive your elbows down toward your hips.\n"
            "3. Pull the bar to your upper chest below the collarbone, then return slowly to a full overhead stretch.\n\n"
            "Technique & Safety Notes:\n"
            "• Never pull the bar behind your neck, as it places excessive strain on the rotator cuff and cervical spine."
        ),
    },
    {
        "name": "Seated Cable Row",
        "primary_muscle": "Back",
        "secondary_muscles": ["Middle back", "Rhomboids", "Latissimus dorsi (lats)", "Biceps"],
        "equipment": "Cable",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Seated_Cable_Rows/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit tall on the row bench with feet planted on the platform and knees slightly bent.\n"
            "2. Brace your torso upright and pull the V-handle toward your lower ribcage/upper abdomen.\n"
            "3. Squeeze your rhomboids and middle traps together at peak contraction.\n"
            "4. Extend your arms forward under control while maintaining a neutral lower back.\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid swinging your torso back and forth to generate momentum."
        ),
    },
    {
        "name": "Pull-Up",
        "primary_muscle": "Back",
        "secondary_muscles": ["Latissimus dorsi (lats)", "Biceps", "Core", "Upper back"],
        "equipment": "Bodyweight",
        "category": "Bodyweight",
        "difficulty_level": "Intermediate",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Pullups/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Grip an overhead bar with a pronated (overhand) grip slightly wider than shoulder width.\n"
            "2. Engage your core and pull your shoulder blades down and back.\n"
            "3. Drive your elbows down until your chin clears the bar, then lower all the way to a dead hang.\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid kipping or cutting the bottom range of motion short."
        ),
    },
    {
        "name": "Shoulder Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Anterior deltoids", "Lateral deltoids", "Triceps", "Core"],
        "equipment": "Dumbbell",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Dumbbell_Shoulder_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit on an upright bench or stand tall holding dumbbells at shoulder level with palms facing forward or slightly inward (30° scapular plane).\n"
            "2. Brace your abs and press the dumbbells vertically overhead until arms are extended.\n"
            "3. Lower slowly back to ear/chin level under control.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep your ribcage down to prevent hyperextending your lumbar spine."
        ),
    },
    {
        "name": "Lateral Raise",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Lateral deltoids", "Anterior deltoids", "Forearms"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Side_Lateral_Raise/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand tall with dumbbells at your sides and a slight 15-degree bend in your elbows.\n"
            "2. Raise your arms out in the scapular plane (slightly forward of your torso) until elbows reach shoulder height.\n"
            "3. Lower slowly over 2–3 seconds to maintain constant tension on the lateral deltoids.\n\n"
            "Technique & Safety Notes:\n"
            "• Lead with your elbows rather than your wrists, and avoid shrugging your upper traps."
        ),
    },
    {
        "name": "Barbell Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Biceps brachii", "Brachialis", "Forearms"],
        "equipment": "Barbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Curl/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand upright holding a barbell with an underhand (supinated) shoulder-width grip.\n"
            "2. Pin your elbows against your torso and curl the bar upward in a smooth arc.\n"
            "3. Squeeze your biceps hard at the top, then lower all the way to full elbow extension.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep your hips and lower back stationary—do not lean back to heave the weight up."
        ),
    },
    {
        "name": "Triceps Pushdown",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Triceps brachii: long, lateral, and medial heads", "Forearms"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Triceps_Pushdown/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Attach a straight bar, V-bar, or rope to a high cable pulley.\n"
            "2. Tuck your elbows snugly at your sides and hinge forward slightly from the hips.\n"
            "3. Extend your forearms downward until your elbows lock out completely, then return under control.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep your upper arms motionless so the triceps perform 100% of the work."
        ),
    },
    {
        "name": "Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings", "Core", "Erector spinae"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Squat/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Rest the barbell across your upper traps (high-bar) or rear delts (low-bar), unrack, and step back.\n"
            "2. Take a deep 360-degree diaphragmatic breath and brace your core.\n"
            "3. Descend by breaking at the hips and knees simultaneously, tracking knees in line with your toes until thighs break parallel.\n"
            "4. Drive through your mid-foot to stand back up.\n\n"
            "Technique & Safety Notes:\n"
            "• Prevent knee valgus (knees caving inward) on the ascent."
        ),
    },
    {
        "name": "Leg Press",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings", "Vastus lateralis", "Vastus medialis"],
        "equipment": "Machine",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Leg_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit in the leg press machine with your lower back and glutes pressed flat against the seat pad.\n"
            "2. Place feet hip-to-shoulder width apart on the sled, unlock the safety catches, and lower until knees reach at least 90 degrees.\n"
            "3. Press the platform back up smoothly without locking out your knee joints.\n\n"
            "Technique & Safety Notes:\n"
            "• Never let your lower back round or lift off the pad at the bottom of the rep."
        ),
    },
    {
        "name": "Romanian Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Back", "Erector spinae", "Biceps femoris"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Romanian_Deadlift/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand holding a barbell at hip height with a pronated shoulder-width grip.\n"
            "2. Unlock your knees slightly (15-degree bend) and push your hips straight backward.\n"
            "3. Slide the barbell down your thighs and upper shins while keeping a flat spine until your hips can no longer travel back.\n"
            "4. Drive your hips forward and squeeze your glutes to return to standing.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep the bar in contact with your legs to protect your lumbar spine."
        ),
    },
    {
        "name": "Leg Curl",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Biceps femoris", "Semitendinosus", "Calves"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Lying_Leg_Curls/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Align your knee joint with the pivot point of the leg curl machine and position the pad above your heels.\n"
            "2. Keep your pelvis pressed firmly into the pad and curl your lower legs as far as possible.\n"
            "3. Pause briefly at peak contraction, then lower under control.\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid lifting your hips off the pad to cheat the weight up."
        ),
    },
    {
        "name": "Calf Raise",
        "primary_muscle": "Calves",
        "secondary_muscles": ["Calves: gastrocnemius and soleus"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Standing_Calf_Raises/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand with the balls of your feet on the platform edge and shoulders under the pads.\n"
            "2. Lower your heels for a 2-second stretch at the bottom.\n"
            "3. Press up as high as possible onto the balls of your feet and hold for 1 second.\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid bouncing rapidly out of the bottom—the Achilles tendon will absorb the work instead of the calves."
        ),
    },
    {
        "name": "Plank",
        "primary_muscle": "Core",
        "secondary_muscles": ["Rectus abdominis", "Transverse abdominis", "Shoulders", "Glutes"],
        "equipment": "Bodyweight",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "duration",
        "media_url": f"{FREE_EX_DB_BASE}/Plank/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Place your forearms on the floor with elbows directly beneath your shoulders.\n"
            "2. Extend your legs behind you and tuck your pelvis slightly (posterior pelvic tilt).\n"
            "3. Squeeze your glutes, quads, and abs to maintain a rigid straight line from head to heels.\n\n"
            "Technique & Safety Notes:\n"
            "• Stop the set if your lower back begins to sag."
        ),
    },
    {
        "name": "Crunches",
        "primary_muscle": "Core",
        "secondary_muscles": ["Rectus abdominis", "Upper abs"],
        "equipment": "Bodyweight",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Crunches/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie on your back with knees bent and feet flat on the floor.\n"
            "2. Exhale and flex your thoracic spine to lift your shoulder blades off the mat.\n"
            "3. Pause for 1 second while squeezing your upper abs, then lower slowly.\n\n"
            "Technique & Safety Notes:\n"
            "• Do not yank on the back of your neck with your hands."
        ),
    },
    {
        "name": "Treadmill Run",
        "primary_muscle": "Cardio",
        "secondary_muscles": ["Quadriceps", "Hamstrings", "Calves"],
        "equipment": "Machine",
        "category": "Cardio",
        "difficulty_level": "Beginner",
        "tracking_type": "distance",
        "media_url": f"{FREE_EX_DB_BASE}/Jogging-Treadmill/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Start with a 3–5 minute brisk walk warm-up before increasing belt speed.\n"
            "2. Maintain an upright posture, relaxed shoulders, and a mid-foot strike beneath your center of mass.\n"
            "3. Record total distance (meters) and duration (seconds).\n\n"
            "Technique & Safety Notes:\n"
            "• Avoid holding onto the side handrails while running."
        ),
    },

    # =========================================================================
    # 2. CHEST SUBDIVISIONS & VARIATIONS
    # =========================================================================
    {
        "name": "Incline Barbell Bench Press",
        "primary_muscle": "Upper chest / clavicular head",
        "secondary_muscles": ["Chest", "Pectoralis major", "Anterior deltoids", "Triceps"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set the incline bench between 30° and 45° and retract your shoulder blades.\n"
            "2. Unrack the barbell and lower it under control to your upper chest just below the clavicles.\n"
            "3. Press vertically to lockout while keeping glutes and upper back glued to the bench.\n\n"
            "Technique & Safety Notes:\n"
            "• Keep forearms vertical at the bottom of the press."
        ),
    },
    {
        "name": "Decline Barbell Bench Press",
        "primary_muscle": "Middle and lower chest / sternal and abdominal regions",
        "secondary_muscles": ["Chest", "Pectoralis major", "Triceps", "Anterior deltoids"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Decline_Barbell_Bench_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Secure your ankles under the leg rollers on a 15–30° decline bench.\n"
            "2. Lower the barbell to the lower sternum, then press straight up to lockout.\n\n"
            "Technique & Safety Notes:\n"
            "• Always use safety pins or a spotter when performing decline presses."
        ),
    },
    {
        "name": "Flat Dumbbell Bench Press",
        "primary_muscle": "Pectoralis major",
        "secondary_muscles": ["Chest", "Triceps", "Anterior deltoids"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Dumbbell_Bench_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie flat on a bench with dumbbells held at chest level and wrists neutral.\n"
            "2. Lower the dumbbells slightly deeper than a barbell allows for a full pectoral stretch.\n"
            "3. Drive the weights upward until stacked over your shoulders."
        ),
    },
    {
        "name": "Chest Dip",
        "primary_muscle": "Middle and lower chest / sternal and abdominal regions",
        "secondary_muscles": ["Chest", "Pectoralis minor", "Triceps", "Anterior deltoids"],
        "equipment": "Bodyweight",
        "category": "Bodyweight",
        "difficulty_level": "Intermediate",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Dips_-_Chest_Version/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Support yourself on parallel dip bars and lean your torso forward 20–30 degrees.\n"
            "2. Lower your body until your shoulders are slightly below your elbows.\n"
            "3. Press back up to full support while maintaining the forward torso lean."
        ),
    },
    {
        "name": "Pec Deck Machine Fly",
        "primary_muscle": "Pectoralis major",
        "secondary_muscles": ["Chest", "Anterior deltoids"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Butterfly/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Adjust the seat height so the handles align with mid-chest level.\n"
            "2. Bring the handles together in a controlled arc and hold the peak squeeze for 1 second.\n"
            "3. Return slowly without letting the weight stack slam."
        ),
    },
    {
        "name": "Push-Up",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Pectoralis major", "Serratus anterior", "Triceps", "Core"],
        "equipment": "Bodyweight",
        "category": "Bodyweight",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Pushups/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set hands slightly wider than shoulder width and brace your body in a rigid plank.\n"
            "2. Lower your chest to within an inch of the floor with elbows angled at 45 degrees.\n"
            "3. Push through your palms and protract your shoulder blades at the top to activate the serratus anterior."
        ),
    },
    {
        "name": "Dumbbell Pullover",
        "primary_muscle": "Serratus anterior",
        "secondary_muscles": ["Chest", "Pectoralis minor", "Latissimus dorsi (lats)", "Triceps"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Bent-Arm_Dumbbell_Pullover/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie supine on a flat bench holding one dumbbell with both hands diamond-style over your chest.\n"
            "2. Keeping elbows slightly bent, lower the dumbbell in an arc behind your head until you feel a deep stretch.\n"
            "3. Pull the weight back over your chest by contracting your chest, serratus, and lats."
        ),
    },

    # =========================================================================
    # 3. BACK, LATS, TRAPS & LOWER BACK
    # =========================================================================
    {
        "name": "Barbell Bent-Over Row",
        "primary_muscle": "Upper back",
        "secondary_muscles": ["Back", "Latissimus dorsi (lats)", "Rhomboids", "Erector spinae", "Biceps"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Bent_Over_Barbell_Row/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hinge at the hips until your torso is 30–45° above parallel with a flat lower back.\n"
            "2. Row the barbell toward your lower sternum/upper abdomen, squeezing your shoulder blades together.\n"
            "3. Lower the bar under control without jerking your torso."
        ),
    },
    {
        "name": "Single-Arm Dumbbell Row",
        "primary_muscle": "Latissimus dorsi (lats)",
        "secondary_muscles": ["Back", "Middle back", "Rhomboids", "Teres major and teres minor", "Biceps"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/One-Arm_Dumbbell_Row/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Support your non-working hand and knee on a flat bench with a neutral spine.\n"
            "2. Pull the dumbbell back in an arc toward your hip pocket rather than straight up to your shoulder.\n"
            "3. Lower fully to stretch the lat at the bottom."
        ),
    },
    {
        "name": "T-Bar Row",
        "primary_muscle": "Middle back",
        "secondary_muscles": ["Back", "Rhomboids", "Latissimus dorsi (lats)", "Trapezius: upper, middle, and lower fibers", "Biceps"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/T-Bar_Row_with_Handle/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Straddle a landmine or T-Bar row station with knees bent and chest proud.\n"
            "2. Pull the handle toward your sternum and contract your rhomboids and middle traps.\n"
            "3. Control the eccentric descent."
        ),
    },
    {
        "name": "Chin-Up",
        "primary_muscle": "Latissimus dorsi (lats)",
        "secondary_muscles": ["Back", "Biceps brachii", "Teres major and teres minor", "Core"],
        "equipment": "Bodyweight",
        "category": "Bodyweight",
        "difficulty_level": "Intermediate",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Chin-Up/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Grip the pull-up bar with a supinated (palms facing you) shoulder-width grip.\n"
            "2. Pull your chest to the bar by driving elbows down and back.\n"
            "3. Lower smoothly to full arm extension."
        ),
    },
    {
        "name": "Straight-Arm Cable Pulldown",
        "primary_muscle": "Teres major and teres minor",
        "secondary_muscles": ["Latissimus dorsi (lats)", "Back", "Triceps"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Straight-Arm_Pulldown/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand facing a high pulley holding a straight bar or rope at eye level.\n"
            "2. With elbows locked in a slight bend, sweep the bar down in an arc to your thighs.\n"
            "3. Squeeze your lats and teres major hard, then return slowly overhead."
        ),
    },
    {
        "name": "Barbell Shrug",
        "primary_muscle": "Trapezius: upper, middle, and lower fibers",
        "secondary_muscles": ["Upper back", "Neck", "Forearms"],
        "equipment": "Barbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Shrug/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand tall holding a barbell in front of your thighs with arms straight.\n"
            "2. Elevate your shoulders straight up toward your ears and pause for 1 full second.\n"
            "3. Lower slowly without rolling your shoulders."
        ),
    },
    {
        "name": "Conventional Barbell Deadlift",
        "primary_muscle": "Lower back",
        "secondary_muscles": ["Erector spinae", "Glutes", "Hamstrings", "Trapezius: upper, middle, and lower fibers", "Grip muscles"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Advanced",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Deadlift/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand with feet hip-width apart and the barbell directly over your mid-foot.\n"
            "2. Grip the bar outside your knees, drop hips until shins touch the bar, lift your chest, and pull the slack out of the bar.\n"
            "3. Push the floor away and extend hips and knees together until standing tall.\n\n"
            "Technique & Safety Notes:\n"
            "• Maintain a neutral spine throughout; never jerk the bar off the floor."
        ),
    },
    {
        "name": "Back Extension (Hyperextension)",
        "primary_muscle": "Erector spinae",
        "secondary_muscles": ["Lower back", "Glutes", "Hamstrings", "Spinal stabilizers"],
        "equipment": "Bodyweight",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Hyperextensions_Back_Extensions/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set the 45-degree Roman chair pad just below your hip bones so your pelvis can hinge freely.\n"
            "2. Lower your torso under control with a flat spine, then contract your glutes and erector spinae to return to a straight line."
        ),
    },

    # =========================================================================
    # 4. SHOULDERS & ROTATOR CUFF
    # =========================================================================
    {
        "name": "Overhead Barbell Press (Military Press)",
        "primary_muscle": "Anterior deltoids",
        "secondary_muscles": ["Shoulders", "Lateral deltoids", "Triceps", "Upper chest / clavicular head", "Core"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Standing_Military_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Unrack the barbell across your front delts/clavicles with elbows slightly forward of the bar.\n"
            "2. Squeeze glutes and abs tightly, then press the bar straight overhead, moving your head slightly back to clear the chin and stacking the bar over mid-foot at lockout."
        ),
    },
    {
        "name": "Arnold Dumbbell Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Anterior deltoids", "Lateral deltoids", "Triceps"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Arnold_Dumbbell_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Start holding dumbbells at chin height with palms facing toward you.\n"
            "2. Press overhead while smoothly rotating your wrists 180 degrees so palms face forward at the top.\n"
            "3. Reverse the rotation on the way down."
        ),
    },
    {
        "name": "Cable Lateral Raise",
        "primary_muscle": "Lateral deltoids",
        "secondary_muscles": ["Shoulders", "Trapezius: upper, middle, and lower fibers"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Cable_Seated_Lateral_Raise/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand perpendicular to a low cable pulley holding the D-handle in your outside hand.\n"
            "2. Sweep your arm out to shoulder height against constant cable tension, then lower slowly."
        ),
    },
    {
        "name": "Reverse Pec Deck / Rear Delt Fly",
        "primary_muscle": "Posterior deltoids",
        "secondary_muscles": ["Shoulders", "Rhomboids", "Middle back", "Trapezius: upper, middle, and lower fibers"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Reverse_Flyes/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit facing the pad on a rear delt machine and grasp the horizontal handles.\n"
            "2. Drive the backs of your hands outward in a wide arc without shrugging your shoulders."
        ),
    },
    {
        "name": "Cable Face Pull",
        "primary_muscle": "Posterior deltoids",
        "secondary_muscles": ["Rotator cuff", "Rhomboids", "Trapezius: upper, middle, and lower fibers", "Shoulders"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Face_Pull/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set a rope attachment at upper-chest or eye height.\n"
            "2. Pull the ends of the rope apart toward your forehead while externally rotating your shoulders into a double-biceps pose.\n"
            "3. Hold for 1 second to strengthen the rear delts and rotator cuff."
        ),
    },
    {
        "name": "Cable External Shoulder Rotation",
        "primary_muscle": "Rotator cuff",
        "secondary_muscles": ["Posterior deltoids", "Shoulders"],
        "equipment": "Cable",
        "category": "Mobility",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/External_Rotation_with_Cable/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Set the cable pulley to elbow height and pin your elbow against your ribcage at a 90-degree angle.\n"
            "2. Rotate your forearm outward away from your torso while keeping your elbow fixed.\n\n"
            "Technique & Safety Notes:\n"
            "• Use light weight and strict control to target the infraspinatus and teres minor."
        ),
    },

    # =========================================================================
    # 5. ARMS: BICEPS, TRICEPS, FOREARMS & GRIP
    # =========================================================================
    {
        "name": "Incline Dumbbell Curl",
        "primary_muscle": "Biceps brachii",
        "secondary_muscles": ["Biceps", "Forearms"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Incline_Dumbbell_Curl/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lean back on a 45–60° incline bench with arms hanging perpendicular to the floor to stretch the long head of the biceps.\n"
            "2. Curl the dumbbells upward while keeping your upper arms stationary behind your torso."
        ),
    },
    {
        "name": "Dumbbell Hammer Curl",
        "primary_muscle": "Brachialis",
        "secondary_muscles": ["Brachioradialis", "Biceps brachii", "Forearms"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Hammer_Curls/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hold dumbbells at your sides with a neutral (palms facing each other) grip.\n"
            "2. Curl the weights up without rotating your wrists to target the brachialis and brachioradialis."
        ),
    },
    {
        "name": "EZ-Bar Preacher Curl",
        "primary_muscle": "Biceps brachii",
        "secondary_muscles": ["Biceps", "Brachialis", "Forearms"],
        "equipment": "EZ Bar",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Preacher_Curl/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Rest the backs of your upper arms flat across the preacher pad.\n"
            "2. Lower the EZ-bar under strict control and curl back up without lifting your elbows off the pad."
        ),
    },
    {
        "name": "Reverse Barbell Curl",
        "primary_muscle": "Brachioradialis",
        "secondary_muscles": ["Forearms: wrist flexors and extensors", "Brachialis", "Biceps"],
        "equipment": "Barbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Reverse_Barbell_Curl/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hold a barbell or EZ-bar with a pronated (overhand) shoulder-width grip.\n"
            "2. Keep elbows tucked and curl the bar upward to develop forearm extensor and brachioradialis thickness."
        ),
    },
    {
        "name": "EZ-Bar Skull Crusher (Lying Triceps Extension)",
        "primary_muscle": "Triceps brachii: long, lateral, and medial heads",
        "secondary_muscles": ["Triceps", "Forearms"],
        "equipment": "EZ Bar",
        "category": "Hypertrophy",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/EZ-Bar_Skullcrusher/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie on a flat bench holding an EZ-bar angled slightly back behind your head.\n"
            "2. Bend only at the elbows to lower the bar toward your forehead or just behind the crown of your head.\n"
            "3. Extend the elbows back to the starting angle."
        ),
    },
    {
        "name": "Overhead Cable Triceps Extension",
        "primary_muscle": "Triceps brachii: long, lateral, and medial heads",
        "secondary_muscles": ["Triceps", "Core"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Cable_Rope_Overhead_Triceps_Extension/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Face away from a cable pulley holding a rope attachment behind your head with elbows raised.\n"
            "2. Extend your forearms overhead until elbows lock out, emphasizing the stretched long head of the triceps."
        ),
    },
    {
        "name": "Close-Grip Barbell Bench Press",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Triceps brachii: long, lateral, and medial heads", "Chest", "Anterior deltoids"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Close-Grip_Barbell_Bench_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Grip the barbell shoulder-width apart and keep elbows tucked close to your ribcage as you lower the bar to your lower chest.\n"
            "2. Drive up powerfully using your triceps."
        ),
    },
    {
        "name": "Barbell Wrist Curl",
        "primary_muscle": "Forearms: wrist flexors and extensors",
        "secondary_muscles": ["Forearms", "Grip muscles"],
        "equipment": "Barbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Palms-Up_Barbell_Wrist_Curl_Over_A_Bench/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Rest your forearms on a flat bench or across your thighs with wrists hanging over the edge and palms facing up.\n"
            "2. Lower the bar into your fingertips and curl your wrists upward for full forearm flexor contraction."
        ),
    },
    {
        "name": "Farmer's Walk",
        "primary_muscle": "Grip muscles",
        "secondary_muscles": ["Forearms", "Trapezius: upper, middle, and lower fibers", "Core", "Spinal stabilizers"],
        "equipment": "Dumbbell",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "distance",
        "media_url": f"{FREE_EX_DB_BASE}/Farmers_Walk/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Pick up heavy dumbbells or farmer's handles with a neutral spine, tall posture, and braced core.\n"
            "2. Walk forward with controlled, quick steps for the target distance or time without letting your shoulders slump."
        ),
    },

    # =========================================================================
    # 6. CORE & ABDOMEN
    # =========================================================================
    {
        "name": "Hanging Leg Raise",
        "primary_muscle": "Lower abs",
        "secondary_muscles": ["Rectus abdominis", "Core", "Hip flexors", "Grip muscles"],
        "equipment": "Bodyweight",
        "category": "Core",
        "difficulty_level": "Intermediate",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Hanging_Leg_Raise/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hang from an overhead bar and initiate the movement by posteriorly tilting your pelvis.\n"
            "2. Raise your legs until your pelvis curls upward, then lower slowly without swinging."
        ),
    },
    {
        "name": "Ab Wheel Rollout",
        "primary_muscle": "Rectus abdominis",
        "secondary_muscles": ["Core", "Transverse abdominis", "Deep core muscles", "Latissimus dorsi (lats)"],
        "equipment": "Other",
        "category": "Core",
        "difficulty_level": "Intermediate",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Ab_Roller/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Kneel on a pad holding the ab wheel beneath your shoulders with your pelvis tucked and glutes squeezed.\n"
            "2. Roll forward as far as you can while maintaining a flat lower back, then contract your abs to pull back to the start."
        ),
    },
    {
        "name": "Cable Woodchopper",
        "primary_muscle": "Obliques: internal and external",
        "secondary_muscles": ["Core", "Transverse abdominis", "Shoulders"],
        "equipment": "Cable",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Standing_Cable_Wood_Chop/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand sideways to a cable pulley and grasp the handle with both hands.\n"
            "2. Rotate your torso and hips to pull the cable diagonally across your body while keeping arms relatively straight."
        ),
    },
    {
        "name": "Cable Kneeling Crunch",
        "primary_muscle": "Upper abs",
        "secondary_muscles": ["Rectus abdominis", "Core"],
        "equipment": "Cable",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Cable_Crunch/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Kneel below a high pulley holding the rope ends beside your temples.\n"
            "2. Keep your hips stationary and flex your spine to curl your elbows toward your knees."
        ),
    },
    {
        "name": "Pallof Press (Anti-Rotation Hold)",
        "primary_muscle": "Transverse abdominis",
        "secondary_muscles": ["Deep core muscles", "Obliques: internal and external", "Spinal stabilizers"],
        "equipment": "Cable",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Pallof_Press/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Stand perpendicular to a chest-height cable pulley with feet shoulder-width apart.\n"
            "2. Press the handle straight out from your sternum and resist the rotational pull of the cable for 2 seconds per rep."
        ),
    },
    {
        "name": "Dead Bug",
        "primary_muscle": "Deep core muscles",
        "secondary_muscles": ["Transverse abdominis", "Rectus abdominis", "Hip flexors"],
        "equipment": "Bodyweight",
        "category": "Core",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Dead_Bug/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees.\n"
            "2. Press your lower back flat into the floor and slowly extend opposite arm and leg toward the floor without losing lumbar contact."
        ),
    },

    # =========================================================================
    # 7. HIPS & GLUTES
    # =========================================================================
    {
        "name": "Barbell Hip Thrust",
        "primary_muscle": "Gluteus maximus",
        "secondary_muscles": ["Glutes", "Hamstrings", "Core"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Barbell_Hip_Thrust/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Rest your upper back (just below the shoulder blades) against a bench with a padded barbell across your hips.\n"
            "2. Drive through your heels until your thighs are parallel to the floor and your shins are vertical.\n"
            "3. Tuck your chin slightly and squeeze your glutes hard at the top for 1 second."
        ),
    },
    {
        "name": "Bulgarian Split Squat",
        "primary_muscle": "Glutes",
        "secondary_muscles": ["Gluteus maximus", "Gluteus medius", "Quadriceps", "Hamstrings"],
        "equipment": "Dumbbell",
        "category": "Strength",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Split_Squat_with_Dumbbells/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Elevate your rear foot on a bench behind you and hold dumbbells at your sides.\n"
            "2. Lower your back knee toward the floor with a slight forward torso lean to emphasize glute recruitment.\n"
            "3. Drive through your front heel to stand tall."
        ),
    },
    {
        "name": "Seated Machine Hip Abduction",
        "primary_muscle": "Hip abductors",
        "secondary_muscles": ["Gluteus medius", "Gluteus minimus", "Glutes"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Thigh_Abductor/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit in the hip abductor machine with the outer knee pads resting against your distal thighs.\n"
            "2. Press your legs outward against resistance and pause for 1 second to isolate the gluteus medius and minimus."
        ),
    },
    {
        "name": "Seated Machine Hip Adduction",
        "primary_muscle": "Hip adductors",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Thigh_Adductor/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit tall in the hip adductor machine with pads positioned on the inside of your knees.\n"
            "2. Squeeze your thighs together smoothly, pause, and return to a controlled inner-thigh stretch."
        ),
    },
    {
        "name": "Cable Glute Kickback",
        "primary_muscle": "Gluteus medius",
        "secondary_muscles": ["Gluteus maximus", "Gluteus minimus", "Hamstrings"],
        "equipment": "Cable",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Glute_Kickback/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Attach an ankle cuff to a low cable pulley and hinge forward slightly holding the frame.\n"
            "2. Drive your working leg backward and slightly outward (15–30°) to maximally contract the glutes without arching your lower back."
        ),
    },
    {
        "name": "Cable Hip Flexor March",
        "primary_muscle": "Hip flexors",
        "secondary_muscles": ["Iliopsoas", "Rectus femoris", "Lower abs"],
        "equipment": "Cable",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Attach a low cable strap around the arch of your foot or ankle while standing tall.\n"
            "2. Drive your knee upward above hip crease height against the cable resistance, pausing for 1 second at the top."
        ),
    },

    # =========================================================================
    # 8. LEGS: QUADRICEPS, HAMSTRINGS, CALVES & LOWER LEGS
    # =========================================================================
    {
        "name": "Barbell Front Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Vastus medialis", "Rectus femoris", "Glutes", "Upper back", "Core"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Advanced",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Front_Barbell_Squat/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Rack the barbell across your front deltoids using a clean grip with elbows pointed high.\n"
            "2. Descend with an upright torso until hips pass below parallel, then drive straight up."
        ),
    },
    {
        "name": "Hack Squat Machine",
        "primary_muscle": "Vastus lateralis",
        "secondary_muscles": ["Quadriceps", "Vastus medialis", "Vastus intermedius", "Glutes"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Intermediate",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Hack_Squat/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Place your back flat against the sled pad and set feet shoulder-width apart on the lower-to-middle platform.\n"
            "2. Lower under control to maximum knee flexion while keeping heels planted, then press back up."
        ),
    },
    {
        "name": "Seated Leg Extension",
        "primary_muscle": "Rectus femoris",
        "secondary_muscles": ["Quadriceps", "Vastus medialis", "Vastus lateralis", "Vastus intermedius"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Leg_Extensions/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Adjust the backrest so the backs of your knees sit flush against the seat edge and the pad rests above your ankles.\n"
            "2. Extend your knees completely and hold the top contraction for 1 full second to isolate all four heads of the quadriceps, especially the rectus femoris."
        ),
    },
    {
        "name": "Dumbbell Walking Lunge",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Gluteus maximus", "Vastus medialis", "Hamstrings", "Calves"],
        "equipment": "Dumbbell",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Dumbbell_Lunges/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hold dumbbells at your sides and step forward into a stride where both knees bend to 90 degrees.\n"
            "2. Gently kiss the floor with your trailing knee and drive through your front foot into the next step."
        ),
    },
    {
        "name": "Seated Leg Curl",
        "primary_muscle": "Semitendinosus",
        "secondary_muscles": ["Hamstrings", "Semimembranosus", "Biceps femoris", "Calves"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Seated_Leg_Curl/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lock the thigh pad tightly across your quads so your hips remain flexed (which pre-stretches the hamstrings across the hip joint).\n"
            "2. Drive your heels down and back as far as possible, pause, and control the return."
        ),
    },
    {
        "name": "Nordic Hamstring Curl",
        "primary_muscle": "Biceps femoris",
        "secondary_muscles": ["Hamstrings", "Semitendinosus", "Semimembranosus", "Glutes"],
        "equipment": "Bodyweight",
        "category": "Strength",
        "difficulty_level": "Advanced",
        "tracking_type": "reps_only",
        "media_url": f"{FREE_EX_DB_BASE}/Natural_Glute_Ham_Raise/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Kneel on a pad with your ankles anchored securely.\n"
            "2. Keeping hips extended in line with your torso, lower your body forward as slowly as possible using eccentric hamstring strength."
        ),
    },
    {
        "name": "Seated Calf Raise",
        "primary_muscle": "Calves: gastrocnemius and soleus",
        "secondary_muscles": ["Calves"],
        "equipment": "Machine",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Seated_Calf_Raise/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Sit with the knee pad resting snugly above your knees and balls of your feet on the step.\n"
            "2. Because the knees are bent at 90°, the gastrocnemius is slackened, placing direct tension on the soleus muscle."
        ),
    },
    {
        "name": "Tibialis Anterior Raise",
        "primary_muscle": "Tibialis anterior",
        "secondary_muscles": ["Other relevant lower-leg muscles", "Calves"],
        "equipment": "Bodyweight",
        "category": "Mobility",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lean your upper back against a wall with your feet positioned 18–24 inches in front of the wall and knees straight.\n"
            "2. Dorsiflex your ankles to pull your toes as high toward your shins as possible, pause for 1 second, and lower slowly."
        ),
    },

    # =========================================================================
    # 9. NECK, SPINAL STABILIZERS, OLYMPIC & FULL-BODY POWER
    # =========================================================================
    {
        "name": "Lying Plate Neck Curl (Flexion)",
        "primary_muscle": "Neck",
        "secondary_muscles": ["Trapezius: upper, middle, and lower fibers"],
        "equipment": "Other",
        "category": "Hypertrophy",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Lying_Face_Up_Plate_Neck_Resistance/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Lie supine on a flat bench with your head hanging just off the edge and hold a light towel-wrapped weight plate on your forehead.\n"
            "2. Slowly nod your chin toward your sternum and lower under strict control."
        ),
    },
    {
        "name": "Bird-Dog (Quadruped Spinal Stabilization)",
        "primary_muscle": "Spinal stabilizers",
        "secondary_muscles": ["Erector spinae", "Deep core muscles", "Glutes"],
        "equipment": "Bodyweight",
        "category": "Mobility",
        "difficulty_level": "Beginner",
        "tracking_type": "reps_only",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Start on hands and knees with wrists under shoulders and knees under hips.\n"
            "2. Brace your core and extend opposite arm and leg until parallel to the floor without rotating your pelvis."
        ),
    },
    {
        "name": "Barbell Power Clean",
        "primary_muscle": "Olympic lifts / full-body power movements",
        "secondary_muscles": ["Full Body", "Glutes", "Hamstrings", "Quadriceps", "Trapezius: upper, middle, and lower fibers"],
        "equipment": "Barbell",
        "category": "Strength",
        "difficulty_level": "Advanced",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/Power_Clean/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Pull the bar smoothly from the floor past your knees, then explosively extend hips, knees, and ankles (triple extension).\n"
            "2. Shrug and pull yourself under the bar, catching it cleanly on your front deltoids in a quarter-squat before standing tall."
        ),
    },
    {
        "name": "Kettlebell Swing",
        "primary_muscle": "Full Body",
        "secondary_muscles": ["Gluteus maximus", "Hamstrings", "Erector spinae", "Core", "Shoulders"],
        "equipment": "Kettlebell",
        "category": "Strength",
        "difficulty_level": "Beginner",
        "tracking_type": "weight_reps",
        "media_url": f"{FREE_EX_DB_BASE}/One-Arm_Kettlebell_Swings/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Hike the kettlebell back between your thighs with a crisp hip hinge.\n"
            "2. Snap your hips forward explosively to float the kettlebell to chest height while keeping arms relaxed like ropes."
        ),
    },
    {
        "name": "Rowing Machine (Ergometer)",
        "primary_muscle": "Cardio",
        "secondary_muscles": ["Full Body", "Quadriceps", "Back", "Latissimus dorsi (lats)", "Core"],
        "equipment": "Machine",
        "category": "Cardio",
        "difficulty_level": "Beginner",
        "tracking_type": "distance",
        "media_url": f"{FREE_EX_DB_BASE}/Rowing_Stationary/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Drive through your legs first (60% of power), swing your torso back slightly (20%), and finish by pulling the handle to your lower ribs (20%).\n"
            "2. Recover in the exact reverse order: arms, torso, then knees."
        ),
    },
    {
        "name": "Stationary Bike / Spin Cycling",
        "primary_muscle": "Cardio",
        "secondary_muscles": ["Quadriceps", "Hamstrings", "Calves"],
        "equipment": "Machine",
        "category": "Cardio",
        "difficulty_level": "Beginner",
        "tracking_type": "distance",
        "media_url": f"{FREE_EX_DB_BASE}/Bicycling_Stationary/0.jpg",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Adjust saddle height so your knee retains a slight 25-degree bend at the bottom of the pedal stroke.\n"
            "2. Maintain steady cadence and log total distance and duration."
        ),
    },
    {
        "name": "World's Greatest Stretch & Thoracic Opener",
        "primary_muscle": "Mobility and stretching",
        "secondary_muscles": ["Hip flexors", "Hamstrings", "Upper back", "Shoulders"],
        "equipment": "Bodyweight",
        "category": "Mobility",
        "difficulty_level": "Beginner",
        "tracking_type": "duration",
        "instructions": (
            "Step-by-Step Setup & Execution:\n"
            "1. Step into a deep forward lunge and place your opposite hand on the floor.\n"
            "2. Drop your inside elbow toward your front instep, then rotate your thoracic spine and reach your hand toward the ceiling."
        ),
    },
]
