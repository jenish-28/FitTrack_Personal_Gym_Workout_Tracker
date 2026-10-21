# FitTrack — Personal Gym & Workout Tracker

FitTrack is a full-stack gym and workout tracking web application for planning routines, recording training sessions, managing exercises, and monitoring strength and workout progress.

## Live Demo

**[Open FitTrack](https://fittrack-app-vx8f.onrender.com)**

- **GitHub source code:** [jenish-28/FitTrack_Personal_Gym_Workout_Tracker](https://github.com/jenish-28/FitTrack_Personal_Gym_Workout_Tracker)

The live application opens at the sign-in page. Users can sign in with an existing account or create a new account. Access to protected features requires authentication.

## Account Roles

FitTrack supports two account roles:

- **User:** Manage personal workouts, exercises, routines, workout history, progress analytics, personal records, and profile settings.
- **Administrator:** Access a separate, role-protected administration area for reviewing platform statistics and managing user roles.

Administrator access is restricted to authorized accounts. This README intentionally does not publish administrator credentials, login details, or instructions for obtaining elevated access.

## Features

### Dashboard
- Review completed workouts, weekly progress, training volume, workout streaks, recent sessions, and personal records.
- View training-volume trends and quickly start a saved routine.

### Workout Tracking
- Start a freestyle workout or use a saved routine or starter template.
- Log exercises by weight and reps, reps only, duration, or distance and time.
- Record warm-up, working, dropset, and failure sets.
- View previous performance while logging sets.
- Use automatic session saving and a rest timer with pause, resume, skip, and time adjustments.
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
- Manage display name, email, training bio, and avatar URL.
- Set weekly workout goals and a default rest timer.
- Choose KG/LBS and dark/light theme preferences.
- Update password or delete the account.

### Administration
- View platform-level statistics such as registered users, completed workouts, logged sets, training volume, exercises, and routines.
- Review user summaries and manage account roles.
- Administrative API endpoints are protected by server-side authorization checks.

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

This is an estimate for sets with more than one rep, not a guaranteed maximum lift.

## Run Locally

### Prerequisites
- Git
- Python 3.10 or newer, compatible with the project dependencies
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

Install backend dependencies:

```bash
python -m pip install -r requirements.txt
```

Configure the backend for your local PostgreSQL database. Review the backend configuration and provide a valid `DATABASE_URL` and a strong `JWT_SECRET_KEY` as required by the application. Never commit real credentials or secret keys.

Apply database migrations:

```bash
python -m alembic upgrade head
```

### 3. Start the backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --reload
```

The API is normally available at [http://localhost:8000](http://localhost:8000).

- API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- API health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 4. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually [http://localhost:5173](http://localhost:5173). The app's login route is available at `/login`.

### Production deployment

The repository includes a `render.yaml` Blueprint for deploying the web service and PostgreSQL database on Render. The deployment builds the frontend and serves the generated `frontend/dist` files through FastAPI. Review production environment variables and database settings before deploying.

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

## Security Notes

- Never commit database credentials, JWT secrets, or other private configuration.
- Use a strong, unique JWT secret in production.
- Keep authentication, role checks, and user-ownership checks enabled.
- Administrator functionality should only be available to authorized accounts.
- Use HTTPS for the deployed application.

## License

No license file or license declaration has been confirmed for this project. Unless a license is added, reuse and redistribution are subject to the repository owner's rights.

## Owner

Jenish Patel
