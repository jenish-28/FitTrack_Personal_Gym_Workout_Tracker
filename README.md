# FitTrack — Personal Gym & Workout Tracking Platform

FitTrack is a full-stack gym workout tracking and strength progression platform built with **React + TypeScript + Tailwind CSS** on the frontend and **Python + FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL** on the backend.

---

## Core Features

1. **Interactive Dashboard**:
   - Real-time metrics calculated directly from PostgreSQL: total workouts completed, weekly workout count vs. goal, cumulative and weekly training volume, active/longest workout streaks, 7-day volume bar chart, recent workouts, unlocked personal records, favorite exercises, and 1-tap routine quick-start.
2. **Active Workout Logger**:
   - Start an empty freestyle workout or launch directly from a saved routine or starter template.
   - Supports 4 tracking modes: **Weight & Reps (`weight_reps`)**, **Bodyweight Reps Only (`reps_only`)**, **Duration (`duration`)**, and **Distance & Time (`distance`)**.
   - Supports **Warm-up (`W`)**, **Working**, **Dropset (`D`)**, and **Failure (`F`)** sets.
   - Displays **Previous performance** for each exercise set automatically.
   - Dual-layer autosave (`localStorage` + debounced `PUT /api/workouts/{id}`) so page refreshes or navigation never lose active session data.
   - Built-in interactive **Rest Timer** with presets (`60s`, `90s`, `120s`, `180s`), `+15s / -15s` controls, pause/resume, and skip.
   - Instant `KG` / `LBS` unit switching.
   - End-of-workout completion summary with duration, sets, total volume, and newly unlocked Personal Records.
3. **User-Managed Exercise Library (Full CRUD)**:
   - Pre-seeded with 18 system exercises (`Bench Press`, `Incline Dumbbell Press`, `Chest Fly`, `Lat Pulldown`, `Seated Cable Row`, `Pull-Up`, `Shoulder Press`, `Lateral Raise`, `Barbell Curl`, `Triceps Pushdown`, `Squat`, `Leg Press`, `Romanian Deadlift`, `Leg Curl`, `Calf Raise`, `Plank`, `Crunches`, `Treadmill Run`).
   - Users can **Add**, **Edit**, and **Delete / Archive** custom exercises.
   - **Historical Data Protection**: Deleting a custom exercise that has been used in historical workouts automatically **soft-archives** (`is_archived = true`) the exercise and optionally removes it from active routines, ensuring historical workout logs and statistics are never corrupted.
   - Strict backend ownership & permission enforcement (`403 Forbidden` if attempting to modify system exercises or another user's custom exercises).
4. **Workout Routines & Starter Templates**:
   - Create, edit, reorder, duplicate, and delete custom routines.
   - Includes 6 optional starter templates (`Push Day`, `Pull Day`, `Leg Day`, `Upper Body`, `Lower Body`, `Full Body`).
5. **Workout History, Progress Analytics & Personal Records**:
   - Chronological workout history with search, muscle group, and date range filters, plus full historical workout editing and confirmed deletion.
   - Interactive Recharts progression charts for exercise Max Weight, **Estimated 1RM (Epley Formula)**, session volume, weekly/monthly frequency, and sets per muscle group.
   - Automatic, deduplicated Personal Record detection (`max_weight`, `best_1rm`, `max_reps`, `longest_duration`, `max_distance`).
6. **User Profile & Settings**:
   - Display name, email, training bio, avatar URL, `KG` / `LBS` unit toggle, `Dark` / `Light` theme toggle, weekly workout goal, default rest timer, password update, and confirmed account deletion.

---

## Mathematical & Domain Definitions

- **Weighted Exercise Volume**:
  $$\text{Volume} = \sum (\text{Weight} \times \text{Reps})$$
  Calculated across completed non-warmup sets (`working`, `dropset`, `failure`) for `weight_reps` exercises. Warm-up sets and bodyweight-only (`reps_only`) sets contribute `0` external tonnage volume while tracking completed sets and repetitions.
- **Estimated One-Rep Max (Epley Formula)**:
  $$\text{1RM} = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right) \quad (\text{for } \text{Reps} > 1)$$

---

## Setup & Local Execution Commands

### 1. Backend Setup (FastAPI + PostgreSQL + Alembic)

```powershell
cd f:\Fit_Bit\New\backend

# 1. Copy example environment configuration
Copy-Item .env.example .env

# 2. Install Python dependencies
python -m pip install -r requirements.txt

# 3. Run Alembic PostgreSQL migrations
python -m alembic upgrade head

# 4. Run Backend Pytest Suite
python -m pytest -v

# 5. Start FastAPI Server (http://localhost:8000)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **OpenAPI / Swagger UI Documentation**: `http://localhost:8000/docs`

### 2. Frontend Setup (React + TypeScript + Vite)

```powershell
cd f:\Fit_Bit\New\frontend

# 1. Install dependencies
npm install

# 2. Run TypeScript & Vitest checks
npm run typecheck
npm test

# 3. Start Vite Dev Server (http://localhost:5173)
npm run dev
```

- **Local Application URL**: `http://localhost:5173`
