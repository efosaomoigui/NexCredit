"""add pricing policy configs

Revision ID: c4f1a2b9e8d3
Revises: 8f3b7d1f2a90
Create Date: 2026-05-23 12:05:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "c4f1a2b9e8d3"
down_revision = "8f3b7d1f2a90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pricing_policy_configs",
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pricing_policy_configs_version"), "pricing_policy_configs", ["version"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_pricing_policy_configs_version"), table_name="pricing_policy_configs")
    op.drop_table("pricing_policy_configs")
