# FitTrack — Personal Gym & Workout Tracker

FitTrack is a full-stack workout tracking application for logging gym sessions, managing exercises and routines, and monitoring strength and training progress over time.

## 🚀 Live Demo

**[Open FitTrack](https://fittrack-app-vx8f.onrender.com)**

- **Source code:** [GitHub repository](https://github.com/jenish-28/fittrack)

## ✨ Features

### Dashboard
- View completed workouts, weekly workout progress, training volume, and workout streaks.
- Review recent sessions, personal records, and favorite exercises.
- See a 7-day training-volume chart and quickly start a saved routine.

### Workout Tracking
- Start a freestyle workout or begin from a saved routine or starter template.
- Track exercises using four modes: weight and reps, reps only, duration, or distance and time.
- Record warm-up, working, dropset, and failure sets.
- See previous performance while logging sets.
- Use automatic session saving to help preserve progress when refreshing or navigating away.
- Use the built-in rest timer with presets, pause/resume, skip, and time adjustments.
- Switch between kilograms (KG) and pounds (LBS).
- Review a completion summary with workout duration, sets, volume, and new personal records.

### Exercise Library
- Start with a library of common exercises covering chest, back, shoulders, arms, legs, core, and cardio.
- Add, edit, and delete your own custom exercises.
- Exercises used in past workouts can be archived instead of permanently removed, protecting historical workout records.
- Backend permissions protect system exercises and users' custom exercises.

### Routines
- Create, edit, reorder, duplicate, and delete workout routines.
- Use starter templates such as Push Day, Pull Day, Leg Day, Upper Body, Lower Body, and Full Body.

### Workout History & Analytics
- Browse past workouts and filter by search, muscle group, or date range.
- Edit historical workouts or delete them after confirmation.
- View progress charts for maximum weight, estimated one-rep max (1RM), session volume, workout frequency, and sets by muscle group.
- Automatically detect personal records for max weight, estimated 1RM, reps, duration, and distance.

### Profile & Settings
- Manage your display name, email, training bio, and avatar URL.
- Configure your weekly workout goal and default rest timer.
- Change KG/LBS units and dark/light theme.
- Update your password or delete your account.

## 🧰 Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Charts & workout UI | Recharts and interactive workout components |
| Backend | Python, FastAPI |
| Database & ORM | PostgreSQL, SQLAlchemy 2.0 |
| Database migrations | Alembic |
| Testing | Pytest, Vitest, TypeScript type checking |
| Deployment | Render |

## 📊 Training Calculations

**Weighted exercise volume**

\[
\text{Volume} = \sum (\text{Weight} \times \text{Reps})
\]

Volume is calculated for completed working, dropset, and failure sets for weighted exercises. Warm-up sets and reps-only exercises do not add external weight volume.

**Estimated one-rep max (Epley formula)**

\[
\text{Estimated 1RM} = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right)
\]

The estimate is used when reps are greater than one.

## 💻 Run Locally

### Prerequisites
- Python 3.10 or newer (use the version supported by the project's dependencies)
- Node.js and npm
- PostgreSQL

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/jenish-28/fittrack.git
cd fittrack
\`\`\`

### 2. Configure and start the backend

Open a terminal in the backend directory:

\`\`\`bash
cd backend
python -m venv .venv
\`\`\`

Activate the virtual environment.

**Windows PowerShell**
\`\`\`powershell
.\.venv\Scripts\Activate.ps1
\`\`\`

**macOS / Linux**
\`\`\`bash
source .venv/bin/activate
\`\`\`

Install dependencies and configure the environment:

\`\`\`bash
python -m pip install -r requirements.txt
\`\`\`

Create your local environment file from the provided example if the repository contains a `.env.example` file, then configure the PostgreSQL connection and any required application settings. Keep secrets and credentials out of version control.

Run database migrations:

\`\`\`bash
python -m alembic upgrade head
\`\`\`

Start the API:

\`\`\`bash
python -m uvicorn app.main:app --reload
\`\`\`

The API is typically available at [http://localhost:8000](http://localhost:8000), with interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Install and start the frontend

Open another terminal:

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Open the local URL printed by Vite in your terminal (commonly [http://localhost:5173](http://localhost:5173)).

> **Note:** Local setup may require environment variables and database settings specific to your configuration. Check the backend and frontend environment example files and project scripts before running the app.

## 🧪 Tests

Run the checks supported by the project:

**Backend**
\`\`\`bash
cd backend
python -m pytest -v
\`\`\`

**Frontend**
\`\`\`bash
cd frontend
npm run typecheck
npm test
\`\`\`

If a script is not defined in the relevant `package.json`, use the available project scripts instead.

## 🔒 Security Notes

- Do not commit `.env` files, passwords, API keys, or database credentials.
- Use a separate PostgreSQL database and environment configuration for local development.
- Keep account and exercise ownership checks enabled when modifying user data.

## 📄 License

No license is specified in this repository yet. Unless a license is added, reuse and redistribution are subject to the repository owner's rights.
