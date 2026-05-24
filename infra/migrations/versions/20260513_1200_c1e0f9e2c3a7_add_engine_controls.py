"""add engine controls

Revision ID: c1e0f9e2c3a7
Revises: 7661bc86f5a1
Create Date: 2026-05-13 12:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1e0f9e2c3a7"
down_revision: Union[str, None] = "7661bc86f5a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "engine_controls",
        sa.Column("engine_key", sa.String(length=64), nullable=False, comment="Unique engine identifier (e.g., identity_engine, payment_engine)"),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("engine_key", name="uq_engine_controls_engine_key"),
    )
    op.create_index(op.f("ix_engine_controls_engine_key"), "engine_controls", ["engine_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_engine_controls_engine_key"), table_name="engine_controls")
    op.drop_table("engine_controls")

