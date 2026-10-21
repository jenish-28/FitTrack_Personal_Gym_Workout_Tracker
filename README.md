# FitTrack — Personal Gym & Workout Tracker

FitTrack is a full-stack gym and workout tracking web application for planning routines, logging training sessions, managing exercises, and reviewing strength and workout progress over time.

## Live Demo

**[Open FitTrack](https://fittrack-app-vx8f.onrender.com)**

- **Source code:** [FitTrack on GitHub](https://github.com/jenish-28/FitTrack_Personal_Gym_Workout_Tracker)
- **API health check:** [Check API status](https://fittrack-app-vx8f.onrender.com/api/health)
- **API documentation (local development):** `/docs` on the backend server

## Features

### Dashboard
- Review completed workouts, weekly progress, training volume, and workout streaks.
- See recent sessions, personal records, and favorite exercises.
- Explore training-volume trends and quickly start a saved routine.

### Workout Tracking
- Start a freestyle session or use a saved routine or starter template.
- Log exercises by weight and reps, reps only, duration, or distance and time.
- Record warm-up, working, dropset, and failure sets.
- See previous performance while logging sets.
- Use automatic session saving and a built-in rest timer with pause, resume, skip, and time adjustments.
- Switch between kilograms (KG) and pounds (LBS).
- Review workout summaries including duration, sets, volume, and new personal records.

### Exercise Library
- Browse exercises for chest, back, shoulders, arms, legs, core, and cardio.
- Add, edit, and delete custom exercises.
- Archive exercises used in previous workouts to preserve historical records.
- Apply ownership and permission checks to exercise management.

### Workout Routines
- Create, edit, reorder, duplicate, and delete routines.
- Use starter routines such as Push Day, Pull Day, Leg Day, Upper Body, Lower Body, and Full Body.

### Workout History & Analytics
- Browse past sessions and filter by search, muscle group, or date range.
- Edit or delete historical workouts.
- Track maximum weight, estimated one-rep max (1RM), session volume, workout frequency, and sets by muscle group.
- Detect personal records for weight, estimated 1RM, reps, duration, and distance.

### Profile & Settings
- Manage your display name, email, training bio, and avatar URL.
- Set weekly workout goals and a default rest timer.
- Choose KG/LBS and dark/light theme preferences.
- Update your password or delete your account.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling & UI | Tailwind CSS, Lucide React |
| Charts | Recharts |
| API | Python, FastAPI, Uvicorn |
| Database & ORM | PostgreSQL, SQLAlchemy 2.0 |
| Migrations | Alembic |
| Authentication | JWT and Argon2 password hashing |
| Testing | Pytest, Vitest, TypeScript type checking |
| Deployment | Render |

## Training Calculations

**Weighted training volume**

```text
Volume = sum(weight × reps)
```

Volume is calculated for completed working, dropset, and failure sets for weighted exercises. Warm-up sets and reps-only exercises do not contribute external weight volume.

**Estimated one-rep max (Epley formula)**

```text
Estimated 1RM = weight × (1 + reps / 30)
```

The estimate is used for sets with more than one rep and is an estimate, not a guaranteed maximum lift.

## Run Locally

### Prerequisites
- Git
- Python 3.10 or newer (compatible with the installed dependencies)
- Node.js and npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/jenish-28/FitTrack_Personal_Gym_Workout_Tracker.git
cd FitTrack_Personal_Gym_Workout_Tracker
```

### 2. Configure the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install the Python dependencies:

```bash
python -m pip install -r requirements.txt
```

Configure the backend environment for your local PostgreSQL database. At minimum, review the settings in the backend configuration and provide a valid `DATABASE_URL` and a strong `JWT_SECRET_KEY` as required by the application. Never commit real credentials or secret keys.

Apply database migrations:

```bash
python -m alembic upgrade head
```

### 3. Start the backend

From the `backend` directory, run:

```bash
python -m uvicorn app.main:app --reload
```

The API will normally be available at [http://localhost:8000](http://localhost:8000).

- Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 4. Start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite (usually [http://localhost:5173](http://localhost:5173)). If the frontend needs a backend URL in your environment, configure it according to the frontend's environment settings.

### Production deployment

The repository includes a `render.yaml` Blueprint configuration for deploying the web service and PostgreSQL database on Render. Review the Blueprint and the environment variables before deploying. The deployed FastAPI app serves the built frontend from `frontend/dist`, so the frontend build and backend service are configured together.

## Tests & Quality Checks

Run backend tests from the `backend` directory:

```bash
python -m pytest -v
```

Run frontend checks from the `frontend` directory:

```bash
npm run typecheck
npm test
```

The frontend scripts are defined in `frontend/package.json`. If a command is unavailable in your local checkout, check the available scripts and test configuration.

## Security Notes

- Keep database credentials, JWT secrets, and other private configuration out of Git.
- Use a strong, unique JWT secret in production.
- Keep authentication and ownership checks in place when changing user or exercise data.
- Use HTTPS for the deployed application.

## License

No license file or license declaration has been confirmed for this project. Unless a license is added to the repository, reuse and redistribution are subject to the repository owner's rights.
