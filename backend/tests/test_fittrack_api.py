import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.core.security import reset_rate_limiter
from app.services.seed import seed_initial_data


test_engine = create_engine(settings.TEST_DATABASE_URL, pool_pre_ping=True, future=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_clean_database():
    reset_rate_limiter()
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def register_and_headers(client: TestClient, name: str, email: str, password: str = "StrongPass123!"):
    res = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, res.json()["user"]


def test_authentication_and_authorization(client: TestClient):
    # Unauthenticated request to protected route fails with 401
    unauth = client.get("/api/stats/dashboard")
    assert unauth.status_code == 401

    # Register user
    headers, user = register_and_headers(client, "Taylor Lift", "taylor@fittrack.app")
    assert user["email"] == "taylor@fittrack.app"
    assert user["settings"]["weight_unit"] == "kg"

    # Duplicate email fails with 409
    dup = client.post(
        "/api/auth/register",
        json={"name": "Taylor 2", "email": "taylor@fittrack.app", "password": "StrongPass123!"},
    )
    assert dup.status_code == 409

    # Wrong password fails with 401
    bad_login = client.post(
        "/api/auth/login",
        json={"email": "taylor@fittrack.app", "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # Valid login succeeds
    good_login = client.post(
        "/api/auth/login",
        json={"email": "taylor@fittrack.app", "password": "StrongPass123!"},
    )
    assert good_login.status_code == 200
    assert good_login.json()["user"]["name"] == "Taylor Lift"


def test_custom_exercise_crud_permissions_and_archiving(client: TestClient):
    headers_a, _ = register_and_headers(client, "User A", "usera@fittrack.app")
    headers_b, _ = register_and_headers(client, "User B", "userb@fittrack.app")

    # 1. System exercises exist and cannot be edited or deleted by users
    ex_list = client.get("/api/exercises", headers=headers_a).json()
    bench = next(e for e in ex_list if e["name"] == "Bench Press" and e["is_system"])

    patch_sys = client.patch(
        f"/api/exercises/{bench['id']}",
        headers=headers_a,
        json={"name": "Hacked Bench"},
    )
    assert patch_sys.status_code == 403

    del_sys = client.delete(f"/api/exercises/{bench['id']}", headers=headers_a)
    assert del_sys.status_code == 403

    # 2. User A creates a custom exercise
    create_res = client.post(
        "/api/exercises",
        headers=headers_a,
        json={
            "name": "Viking Press",
            "primary_muscle": "Shoulders",
            "secondary_muscles": ["Triceps"],
            "equipment": "Barbell",
            "category": "Strength",
            "tracking_type": "weight_reps",
            "instructions": "Drive handles overhead with neutral grip.",
        },
    )
    assert create_res.status_code == 201
    viking = create_res.json()
    assert viking["name"] == "Viking Press"
    assert viking["is_system"] is False

    # Duplicate custom exercise name for User A is rejected with 409
    dup_ex = client.post(
        "/api/exercises",
        headers=headers_a,
        json={
            "name": "viking press",
            "primary_muscle": "Shoulders",
            "equipment": "Barbell",
            "tracking_type": "weight_reps",
        },
    )
    assert dup_ex.status_code == 409

    # 3. User B cannot view, edit, or delete User A's custom exercise
    get_b = client.get(f"/api/exercises/{viking['id']}", headers=headers_b)
    assert get_b.status_code == 403
    patch_b = client.patch(
        f"/api/exercises/{viking['id']}",
        headers=headers_b,
        json={"name": "Stolen Exercise"},
    )
    assert patch_b.status_code == 403
    del_b = client.delete(f"/api/exercises/{viking['id']}", headers=headers_b)
    assert del_b.status_code == 403

    # 4. User A renames/edits their custom exercise
    patch_a = client.patch(
        f"/api/exercises/{viking['id']}",
        headers=headers_a,
        json={"name": "Strict Viking Press", "equipment": "Machine"},
    )
    assert patch_a.status_code == 200
    assert patch_a.json()["name"] == "Strict Viking Press"
    assert patch_a.json()["equipment"] == "Machine"

    # 5. User A creates an unused custom exercise and deletes it permanently
    unused = client.post(
        "/api/exercises",
        headers=headers_a,
        json={
            "name": "Temp Isolation Curl",
            "primary_muscle": "Biceps",
            "equipment": "Dumbbell",
            "tracking_type": "weight_reps",
        },
    ).json()
    del_unused = client.delete(f"/api/exercises/{unused['id']}", headers=headers_a)
    assert del_unused.status_code == 200
    assert del_unused.json()["action"] == "deleted"

    # 6. User A uses Strict Viking Press in a completed workout, then deletes it -> soft-archived!
    w_start = client.post("/api/workouts", headers=headers_a, json={"name": "Shoulder Day"}).json()
    w_finish = client.post(
        f"/api/workouts/{w_start['id']}/finish",
        headers=headers_a,
        json={
            "name": "Shoulder Day",
            "duration_seconds": 1800,
            "exercises": [
                {
                    "exercise_id": viking["id"],
                    "order_index": 0,
                    "rest_seconds": 90,
                    "sets": [
                        {
                            "set_number": 1,
                            "set_type": "working",
                            "weight_kg": 70.0,
                            "reps": 8,
                            "is_completed": True,
                        }
                    ],
                }
            ],
        },
    )
    assert w_finish.status_code == 200

    del_used = client.delete(f"/api/exercises/{viking['id']}", headers=headers_a)
    assert del_used.status_code == 200
    assert del_used.json()["action"] == "archived"

    # Archived exercise is hidden from default library selection
    active_library = client.get("/api/exercises", headers=headers_a).json()
    assert not any(e["id"] == viking["id"] for e in active_library)

    # Historical workout remains 100% readable with preserved exercise name and sets!
    history = client.get("/api/workouts", headers=headers_a).json()
    assert len(history) == 1
    assert history[0]["exercises"][0]["exercise_name_snapshot"] == "Strict Viking Press"
    assert history[0]["exercises"][0]["sets"][0]["weight_kg"] == 70.0


def test_routines_historical_preservation_and_workout_pr_detection(client: TestClient):
    headers, _ = register_and_headers(client, "Jordan Strong", "jordan@fittrack.app")
    exercises = client.get("/api/exercises", headers=headers).json()
    bench = next(e for e in exercises if e["name"] == "Bench Press")
    squat = next(e for e in exercises if e["name"] == "Squat")

    # 1. Create a routine
    routine_res = client.post(
        "/api/routines",
        headers=headers,
        json={
            "name": "Strength A",
            "description": "Bench and Squat focus",
            "exercises": [
                {
                    "exercise_id": bench["id"],
                    "order_index": 0,
                    "target_sets": 2,
                    "target_reps": 5,
                    "target_weight_kg": 80.0,
                    "rest_seconds": 120,
                },
                {
                    "exercise_id": squat["id"],
                    "order_index": 1,
                    "target_sets": 2,
                    "target_reps": 5,
                    "target_weight_kg": 100.0,
                    "rest_seconds": 150,
                },
            ],
        },
    )
    assert routine_res.status_code == 201
    routine = routine_res.json()
    assert len(routine["exercises"]) == 2

    # 2. Start workout from routine and complete it
    w1 = client.post(
        "/api/workouts", headers=headers, json={"routine_id": routine["id"]}
    ).json()
    assert w1["name"] == "Strength A"
    assert len(w1["exercises"]) == 2

    finish_w1 = client.post(
        f"/api/workouts/{w1['id']}/finish",
        headers=headers,
        json={
            "name": "Strength A — Session 1",
            "duration_seconds": 2400,
            "exercises": [
                {
                    "exercise_id": bench["id"],
                    "order_index": 0,
                    "sets": [
                        {"set_number": 1, "set_type": "warmup", "weight_kg": 50.0, "reps": 10, "is_completed": True},
                        {"set_number": 2, "set_type": "working", "weight_kg": 80.0, "reps": 5, "is_completed": True},
                        {"set_number": 3, "set_type": "working", "weight_kg": 85.0, "reps": 5, "is_completed": True},
                    ],
                }
            ],
        },
    )
    assert finish_w1.status_code == 200
    w1_done = finish_w1.json()
    # Volume excludes warmup: (80*5) + (85*5) = 400 + 425 = 825.0 kg
    assert w1_done["total_volume_kg"] == 825.0
    assert len(w1_done["new_records"]) >= 2  # max_weight (85), best_1rm, max_reps

    # 3. Edit and then delete the routine — verify completed workout w1 is untouched!
    client.patch(
        f"/api/routines/{routine['id']}",
        headers=headers,
        json={"name": "Modified Routine Name", "exercises": []},
    )
    client.delete(f"/api/routines/{routine['id']}", headers=headers)

    w1_check = client.get(f"/api/workouts/{w1['id']}", headers=headers).json()
    assert w1_check["name"] == "Strength A — Session 1"
    assert w1_check["total_volume_kg"] == 825.0
    assert len(w1_check["exercises"]) == 1

    # 4. Log a second workout with the EXACT SAME 85kg x 5 -> should NOT create duplicate PRs!
    w2 = client.post("/api/workouts", headers=headers, json={"name": "Bench Repeat"}).json()
    w2_done = client.post(
        f"/api/workouts/{w2['id']}/finish",
        headers=headers,
        json={
            "name": "Bench Repeat",
            "duration_seconds": 1800,
            "exercises": [
                {
                    "exercise_id": bench["id"],
                    "order_index": 0,
                    "sets": [
                        {"set_number": 1, "set_type": "working", "weight_kg": 85.0, "reps": 5, "is_completed": True}
                    ],
                }
            ],
        },
    ).json()
    assert len(w2_done["new_records"]) == 0

    # 5. Log a third workout improving Bench Press to 90kg x 5 -> should create new PR with previous_value = 85.0!
    w3 = client.post("/api/workouts", headers=headers, json={"name": "Bench PR Day"}).json()
    w3_done = client.post(
        f"/api/workouts/{w3['id']}/finish",
        headers=headers,
        json={
            "name": "Bench PR Day",
            "duration_seconds": 1800,
            "exercises": [
                {
                    "exercise_id": bench["id"],
                    "order_index": 0,
                    "sets": [
                        {"set_number": 1, "set_type": "working", "weight_kg": 90.0, "reps": 5, "is_completed": True}
                    ],
                }
            ],
        },
    ).json()
    max_w_pr = next(r for r in w3_done["new_records"] if r["record_type"] == "max_weight")
    assert max_w_pr["value"] == 90.0
    assert max_w_pr["previous_value"] == 85.0

    # 6. Check dashboard statistics & exercise progress endpoint
    dash = client.get("/api/stats/dashboard", headers=headers).json()
    assert dash["total_workouts"] == 3
    assert dash["total_volume_kg"] == 825.0 + 425.0 + 450.0

    prog = client.get(f"/api/stats/exercises/{bench['id']}/progress", headers=headers).json()
    assert len(prog) == 3
    assert prog[-1]["max_weight_kg"] == 90.0


def test_user_data_isolation_and_set_validation(client: TestClient):
    headers_1, _ = register_and_headers(client, "Athlete One", "one@fittrack.app")
    headers_2, _ = register_and_headers(client, "Athlete Two", "two@fittrack.app")

    w_one = client.post("/api/workouts", headers=headers_1, json={"name": "Private Session"}).json()

    # Athlete Two cannot view, edit, finish, or delete Athlete One's workout
    assert client.get(f"/api/workouts/{w_one['id']}", headers=headers_2).status_code == 404
    assert client.delete(f"/api/workouts/{w_one['id']}", headers=headers_2).status_code == 404

    # Invalid negative weight is rejected by Pydantic set validation (422)
    ex_id = client.get("/api/exercises", headers=headers_1).json()[0]["id"]
    bad_sync = client.put(
        f"/api/workouts/{w_one['id']}",
        headers=headers_1,
        json={
            "name": "Invalid Set Test",
            "exercises": [
                {
                    "exercise_id": ex_id,
                    "order_index": 0,
                    "sets": [
                        {"set_number": 1, "set_type": "working", "weight_kg": -20.0, "reps": 5, "is_completed": True}
                    ],
                }
            ],
        },
    )
    assert bad_sync.status_code == 422


def test_admin_panel_and_custom_routine_ordering(client: TestClient):
    # 1. Ordinary user cannot access /api/admin/overview
    user_headers, user_info = register_and_headers(client, "Regular User", "regular@fittrack.app")
    assert user_info["is_admin"] is False
    assert client.get("/api/admin/overview", headers=user_headers).status_code == 403

    # 2. Seeded Admin account can sign in and access /api/admin/overview
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@fittrack.app", "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200
    admin_data = admin_login.json()
    assert admin_data["user"]["is_admin"] is True
    admin_headers = {"Authorization": f"Bearer {admin_data['access_token']}"}

    overview = client.get("/api/admin/overview", headers=admin_headers)
    assert overview.status_code == 200
    ov = overview.json()
    assert ov["total_users"] >= 2
    assert ov["system_exercises_count"] >= 17
    assert ov["template_routines_count"] >= 6

    # 3. Admin can create a global system exercise and a global starter routine template
    sys_ex = client.post(
        "/api/exercises",
        headers=admin_headers,
        json={
            "name": "Pendlay Row",
            "primary_muscle": "Back",
            "secondary_muscles": ["Biceps"],
            "equipment": "Barbell",
            "category": "Strength",
            "tracking_type": "weight_reps",
            "is_system": True,
        },
    )
    assert sys_ex.status_code == 201
    assert sys_ex.json()["is_system"] is True

    global_tmpl = client.post(
        "/api/routines",
        headers=admin_headers,
        json={
            "name": "Powerbuilding Split",
            "description": "Global starter template added by admin",
            "is_template": True,
            "exercises": [
                {
                    "exercise_id": sys_ex.json()["id"],
                    "order_index": 0,
                    "target_sets": 4,
                    "target_reps": 6,
                }
            ],
        },
    )
    assert global_tmpl.status_code == 201
    assert global_tmpl.json()["is_template"] is True

    # 4. Regular user sees starter templates by default, and once they create a custom routine, custom routines appear FIRST!
    initial_routines = client.get("/api/routines", headers=user_headers).json()
    assert all(r["is_template"] is True for r in initial_routines)

    custom_r = client.post(
        "/api/routines",
        headers=user_headers,
        json={
            "name": "My Priority Custom Routine",
            "exercises": [
                {
                    "exercise_id": sys_ex.json()["id"],
                    "order_index": 0,
                    "target_sets": 3,
                    "target_reps": 10,
                }
            ],
        },
    )
    assert custom_r.status_code == 201
    assert custom_r.json()["is_template"] is False

    ordered_routines = client.get("/api/routines", headers=user_headers).json()
    assert ordered_routines[0]["is_template"] is False
    assert ordered_routines[0]["name"] == "My Priority Custom Routine"

