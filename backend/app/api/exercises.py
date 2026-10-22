from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import or_, func, cast, String
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Exercise,
    ExerciseMedia,
    ExerciseFavorite,
    WorkoutExercise,
    RoutineExercise,
    WorkoutRoutine,
    PersonalRecord,
)
from app.schemas.schemas import (
    ExerciseCreate,
    ExerciseUpdate,
    ExerciseOut,
    ExerciseDeleteOut,
)
from app.core.security import get_current_user
from app.services.seed import seed_initial_data
from app.services.exercise_catalog import MUSCLE_FAMILY_ALIASES

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB limit
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "exercises"


def _detect_image_mime(data: bytes) -> Optional[str]:
    """Inspect magic bytes of uploaded file content to verify it is a genuine image or GIF."""
    if len(data) < 12:
        return None
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _cleanup_exercise_media(db: Session, exercise_id: int) -> None:
    """Safely delete uploaded media records owned by this exercise unless referenced elsewhere."""
    media_rows = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise_id).all()
    for m in media_rows:
        media_url_ref = f"/api/exercises/media/{m.id}"
        other_refs = (
            db.query(Exercise)
            .filter(Exercise.id != exercise_id, Exercise.media_url == media_url_ref)
            .count()
        )
        if other_refs == 0:
            try:
                disk_file = UPLOADS_DIR / f"{m.id}_{m.filename}"
                if disk_file.exists():
                    disk_file.unlink()
            except Exception:
                pass
            db.delete(m)


def _enrich_exercises(db: Session, exercises: List[Exercise], user_id: int) -> List[ExerciseOut]:
    if not exercises:
        return []
    ex_ids = [e.id for e in exercises]

    fav_ids = {
        row[0]
        for row in db.query(ExerciseFavorite.exercise_id)
        .filter(
            ExerciseFavorite.user_id == user_id,
            ExerciseFavorite.exercise_id.in_(ex_ids),
        )
        .all()
    }

    usage_rows = (
        db.query(WorkoutExercise.exercise_id, func.count(WorkoutExercise.id))
        .filter(WorkoutExercise.exercise_id.in_(ex_ids))
        .group_by(WorkoutExercise.exercise_id)
        .all()
    )
    usage_map = {ex_id: cnt for ex_id, cnt in usage_rows}

    routine_rows = (
        db.query(RoutineExercise.exercise_id, func.count(RoutineExercise.id))
        .join(WorkoutRoutine, RoutineExercise.routine_id == WorkoutRoutine.id)
        .filter(
            RoutineExercise.exercise_id.in_(ex_ids),
            WorkoutRoutine.user_id == user_id,
        )
        .group_by(RoutineExercise.exercise_id)
        .all()
    )
    routine_map = {ex_id: cnt for ex_id, cnt in routine_rows}

    results: List[ExerciseOut] = []
    for e in exercises:
        out = ExerciseOut.model_validate(e)
        out.is_favorite = e.id in fav_ids
        out.usage_count = int(usage_map.get(e.id, 0))
        out.routine_count = int(routine_map.get(e.id, 0))
        results.append(out)
    return results


@router.get("/media/{media_id}", tags=["Exercise Media"])
def serve_exercise_media(
    media_id: int,
    db: Session = Depends(get_db),
):
    """Serve persistent user-uploaded exercise demonstration image or GIF."""
    media = db.query(ExerciseMedia).filter(ExerciseMedia.id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise media not found.")

    return Response(
        content=media.data,
        media_type=media.content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="{media.filename}"',
        },
    )


@router.get("", response_model=List[ExerciseOut])
def list_exercises(
    search: Optional[str] = Query(default=None),
    muscle: Optional[str] = Query(default=None),
    equipment: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    tracking_type: Optional[str] = Query(default=None),
    custom_only: bool = Query(default=False),
    include_archived: bool = Query(default=False),
    limit: int = Query(default=300, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seed_initial_data(db)

    query = db.query(Exercise).filter(
        or_(Exercise.is_system == True, Exercise.user_id == current_user.id)  # noqa: E712
    )

    if not include_archived:
        query = query.filter(Exercise.is_archived == False)  # noqa: E712

    if custom_only:
        query = query.filter(Exercise.user_id == current_user.id, Exercise.is_system == False)  # noqa: E712

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Exercise.name).like(term),
                func.lower(Exercise.primary_muscle).like(term),
                func.lower(Exercise.equipment).like(term),
                func.lower(Exercise.category).like(term),
                func.lower(cast(Exercise.secondary_muscles, String)).like(term),
            )
        )

    if muscle and muscle.strip() and muscle.lower() != "all":
        m_lower = muscle.strip().lower()
        family_matches = MUSCLE_FAMILY_ALIASES.get(m_lower)
        if family_matches:
            query = query.filter(
                or_(
                    func.lower(Exercise.primary_muscle).in_(family_matches),
                    func.lower(Exercise.primary_muscle).like(f"%{m_lower}%"),
                    func.lower(cast(Exercise.secondary_muscles, String)).like(f"%{m_lower}%"),
                )
            )
        else:
            query = query.filter(
                or_(
                    func.lower(Exercise.primary_muscle) == m_lower,
                    func.lower(Exercise.primary_muscle).like(f"%{m_lower}%"),
                    func.lower(cast(Exercise.secondary_muscles, String)).like(f"%{m_lower}%"),
                )
            )

    if equipment and equipment.strip() and equipment.lower() != "all":
        query = query.filter(func.lower(Exercise.equipment) == equipment.strip().lower())

    if category and category.strip() and category.lower() != "all":
        query = query.filter(func.lower(Exercise.category) == category.strip().lower())

    if tracking_type and tracking_type.strip() and tracking_type.lower() != "all":
        query = query.filter(Exercise.tracking_type == tracking_type.strip())

    exercises = (
        query.order_by(Exercise.is_system.asc(), Exercise.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return _enrich_exercises(db, exercises, current_user.id)


@router.post("", response_model=ExerciseOut, status_code=status.HTTP_201_CREATED)
def create_custom_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cleaned_name = payload.name.strip()

    # Check duplicate against this user's custom exercises or system exercises
    duplicate = (
        db.query(Exercise)
        .filter(
            func.lower(Exercise.name) == cleaned_name.lower(),
            or_(
                Exercise.is_system == True,  # noqa: E712
                Exercise.user_id == current_user.id,
            ),
            Exercise.is_archived == False,  # noqa: E712
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An exercise named '{cleaned_name}' already exists in your library.",
        )

    # Check if user previously had an archived custom exercise with the exact same name; if so, unarchive & update it
    archived_match = (
        db.query(Exercise)
        .filter(
            func.lower(Exercise.name) == cleaned_name.lower(),
            Exercise.user_id == current_user.id,
            Exercise.is_archived == True,  # noqa: E712
        )
        .first()
    )
    if archived_match:
        archived_match.name = cleaned_name
        archived_match.primary_muscle = payload.primary_muscle.strip()
        archived_match.secondary_muscles = payload.secondary_muscles
        archived_match.equipment = payload.equipment.strip()
        archived_match.category = payload.category.strip()
        archived_match.difficulty_level = (payload.difficulty_level or "Intermediate").strip()
        archived_match.tracking_type = payload.tracking_type
        archived_match.instructions = payload.instructions
        archived_match.media_url = payload.media_url
        archived_match.is_archived = False
        db.commit()
        db.refresh(archived_match)
        return _enrich_exercises(db, [archived_match], current_user.id)[0]

    make_system = bool(payload.is_system and current_user.is_admin)
    new_ex = Exercise(
        user_id=None if make_system else current_user.id,
        name=cleaned_name,
        primary_muscle=payload.primary_muscle.strip(),
        secondary_muscles=payload.secondary_muscles,
        equipment=payload.equipment.strip(),
        category=payload.category.strip(),
        difficulty_level=(payload.difficulty_level or "Intermediate").strip(),
        tracking_type=payload.tracking_type,
        instructions=payload.instructions,
        media_url=payload.media_url,
        is_system=make_system,
        is_archived=False,
    )
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return _enrich_exercises(db, [new_ex], current_user.id)[0]


@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise_detail(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if not ex.is_system and ex.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view another user's private custom exercise.",
        )

    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_custom_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System exercises are protected and cannot be modified.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own custom exercises.",
        )

    if payload.name is not None:
        cleaned_name = payload.name.strip()
        conflict = (
            db.query(Exercise)
            .filter(
                Exercise.id != ex.id,
                func.lower(Exercise.name) == cleaned_name.lower(),
                or_(
                    Exercise.is_system == True,  # noqa: E712
                    Exercise.user_id == current_user.id,
                ),
                Exercise.is_archived == False,  # noqa: E712
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An exercise named '{cleaned_name}' already exists.",
            )
        ex.name = cleaned_name

    if payload.primary_muscle is not None:
        ex.primary_muscle = payload.primary_muscle.strip()
    if payload.secondary_muscles is not None:
        ex.secondary_muscles = payload.secondary_muscles
    if payload.equipment is not None:
        ex.equipment = payload.equipment.strip()
    if payload.category is not None:
        ex.category = payload.category.strip()
    if payload.difficulty_level is not None:
        ex.difficulty_level = payload.difficulty_level.strip() or "Intermediate"
    if payload.tracking_type is not None:
        ex.tracking_type = payload.tracking_type
    if payload.instructions is not None:
        ex.instructions = payload.instructions
    if payload.media_url is not None:
        if payload.media_url == "":
            _cleanup_exercise_media(db, ex.id)
            ex.media_url = None
        else:
            ex.media_url = payload.media_url

    db.commit()
    db.refresh(ex)
    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.post("/{exercise_id}/media", response_model=ExerciseOut)
async def upload_exercise_media(
    exercise_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload or replace an exercise demonstration image or animated GIF.
    Validates file extension, MIME type, size limit, and magic-byte file signature,
    and stores a persistent media record in PostgreSQL.
    """
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System exercises are protected. Only administrators can modify system exercise media.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload or modify media for your own custom exercises.",
        )

    original_filename = (file.filename or "exercise_media").strip()
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a JPEG, PNG, WebP, or GIF file.",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 8 MB maximum upload limit.",
        )

    detected_mime = _detect_image_mime(raw_bytes)
    if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image content. The file signature does not match a valid JPEG, PNG, WebP, or GIF.",
        )

    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES and file.content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{file.content_type}'. Allowed types: JPEG, PNG, WebP, GIF.",
        )

    # Remove previous uploaded media for this exercise safely
    _cleanup_exercise_media(db, ex.id)

    safe_filename = "".join(c for c in Path(original_filename).name if c.isalnum() or c in "._-")[:120] or f"media{ext}"
    media_row = ExerciseMedia(
        exercise_id=ex.id,
        user_id=current_user.id,
        filename=safe_filename,
        content_type=detected_mime,
        file_size=len(raw_bytes),
        data=raw_bytes,
    )
    db.add(media_row)
    db.flush()

    try:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        (UPLOADS_DIR / f"{media_row.id}_{safe_filename}").write_bytes(raw_bytes)
    except Exception:
        pass

    ex.media_url = f"/api/exercises/media/{media_row.id}"
    db.commit()
    db.refresh(ex)
    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.delete("/{exercise_id}/media", response_model=ExerciseOut)
def delete_exercise_media(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uploaded demonstration media from an exercise owned by the current user."""
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System exercises are protected and cannot be modified.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove media from your own custom exercises.",
        )

    _cleanup_exercise_media(db, ex.id)
    ex.media_url = None
    db.commit()
    db.refresh(ex)
    return _enrich_exercises(db, [ex], current_user.id)[0]


@router.delete("/{exercise_id}", response_model=ExerciseDeleteOut)
def delete_or_archive_custom_exercise(
    exercise_id: int,
    remove_from_routines: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    if ex.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Built-in system exercises cannot be deleted.",
        )

    if not ex.is_system and ex.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own custom exercises.",
        )

    # Check if used in routines
    routine_q = db.query(RoutineExercise).join(
        WorkoutRoutine, RoutineExercise.routine_id == WorkoutRoutine.id
    ).filter(RoutineExercise.exercise_id == ex.id)
    if not current_user.is_admin:
        routine_q = routine_q.filter(WorkoutRoutine.user_id == current_user.id)
    routine_links = routine_q.all()
    removed_routines_count = 0
    if routine_links and remove_from_routines:
        for rl in routine_links:
            db.delete(rl)
            removed_routines_count += 1
        db.flush()

    remaining_routine_refs = (
        db.query(RoutineExercise).filter(RoutineExercise.exercise_id == ex.id).count()
    )
    workout_refs = (
        db.query(WorkoutExercise).filter(WorkoutExercise.exercise_id == ex.id).count()
    )
    pr_refs = (
        db.query(PersonalRecord).filter(PersonalRecord.exercise_id == ex.id).count()
    )

    if workout_refs > 0 or pr_refs > 0 or remaining_routine_refs > 0:
        ex.is_archived = True
        db.commit()
        return ExerciseDeleteOut(
            action="archived",
            message=(
                f"'{ex.name}' is referenced by historical workout data and has been safely archived. "
                "Your workout history and statistics remain intact."
            ),
            removed_from_routines=removed_routines_count,
            exercise_id=ex.id,
        )

    _cleanup_exercise_media(db, ex.id)
    ex_id = ex.id
    ex_name = ex.name
    db.delete(ex)
    db.commit()
    return ExerciseDeleteOut(
        action="deleted",
        message=f"Custom exercise '{ex_name}' has been permanently deleted.",
        removed_from_routines=removed_routines_count,
        exercise_id=ex_id,
    )


@router.post("/{exercise_id}/favorite")
def toggle_favorite_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex or (not ex.is_system and ex.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found.")

    existing = (
        db.query(ExerciseFavorite)
        .filter(
            ExerciseFavorite.user_id == current_user.id,
            ExerciseFavorite.exercise_id == exercise_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"is_favorite": False}
    else:
        fav = ExerciseFavorite(user_id=current_user.id, exercise_id=exercise_id)
        db.add(fav)
        db.commit()
        return {"is_favorite": True}
