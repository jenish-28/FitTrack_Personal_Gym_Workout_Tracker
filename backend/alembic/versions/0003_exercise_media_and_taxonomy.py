"""exercise_media_and_taxonomy

Revision ID: 0003_exercise_media_and_taxonomy
Revises: 0002_add_user_is_admin
Create Date: 2026-10-22 06:58:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0003_exercise_media_and_taxonomy"
down_revision: Union[str, None] = "0002_add_user_is_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Widen muscle, equipment, and category columns on exercises & workout_exercises non-destructively
    op.alter_column(
        "exercises",
        "primary_muscle",
        existing_type=sa.String(length=60),
        type_=sa.String(length=120),
        existing_nullable=False,
    )
    op.alter_column(
        "exercises",
        "equipment",
        existing_type=sa.String(length=60),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "exercises",
        "category",
        existing_type=sa.String(length=60),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.add_column(
        "exercises",
        sa.Column(
            "difficulty_level",
            sa.String(length=40),
            nullable=True,
            server_default="Intermediate",
        ),
    )

    op.alter_column(
        "workout_exercises",
        "primary_muscle_snapshot",
        existing_type=sa.String(length=60),
        type_=sa.String(length=120),
        existing_nullable=False,
    )
    op.alter_column(
        "workout_exercises",
        "equipment_snapshot",
        existing_type=sa.String(length=60),
        type_=sa.String(length=100),
        existing_nullable=False,
    )

    # 2. Create exercise_media table for persistent user image/GIF uploads
    op.create_table(
        "exercise_media",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "exercise_id",
            sa.Integer(),
            sa.ForeignKey("exercises.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=80), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_exercise_media_id", "exercise_media", ["id"])
    op.create_index("ix_exercise_media_exercise_id", "exercise_media", ["exercise_id"])
    op.create_index("ix_exercise_media_user_id", "exercise_media", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_exercise_media_user_id", table_name="exercise_media")
    op.drop_index("ix_exercise_media_exercise_id", table_name="exercise_media")
    op.drop_index("ix_exercise_media_id", table_name="exercise_media")
    op.drop_table("exercise_media")
    op.drop_column("exercises", "difficulty_level")
