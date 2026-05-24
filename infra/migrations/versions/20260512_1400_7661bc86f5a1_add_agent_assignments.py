"""add agent assignments

Revision ID: 7661bc86f5a1
Revises: af7b0768c4e9
Create Date: 2026-05-12 14:00:00.070962+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import shared.encryption.fields
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7661bc86f5a1'
down_revision: Union[str, None] = 'af7b0768c4e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_assignments",
        sa.Column("agent_id", sa.UUID(), nullable=False, comment="FK → users.id (role=agent)"),
        sa.Column("borrower_id", sa.UUID(), nullable=False, comment="FK → users.id (role=borrower)"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["borrower_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_id", "borrower_id", name="uq_agent_assignments_agent_borrower"),
    )
    op.create_index(op.f("ix_agent_assignments_agent_id"), "agent_assignments", ["agent_id"], unique=False)
    op.create_index(op.f("ix_agent_assignments_borrower_id"), "agent_assignments", ["borrower_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_assignments_borrower_id"), table_name="agent_assignments")
    op.drop_index(op.f("ix_agent_assignments_agent_id"), table_name="agent_assignments")
    op.drop_table("agent_assignments")
