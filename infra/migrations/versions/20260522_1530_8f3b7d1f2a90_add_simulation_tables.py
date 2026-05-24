"""add simulation credit and bank tables

Revision ID: 8f3b7d1f2a90
Revises: c1e0f9e2c3a7
Create Date: 2026-05-22 15:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8f3b7d1f2a90"
down_revision = "c1e0f9e2c3a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sim_credit_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("bvn", sa.String(length=11), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("score_band", sa.String(length=10), nullable=False),
        sa.Column("risk_level", sa.String(length=20), nullable=False),
        sa.Column("recommended_limit", sa.Integer(), nullable=False),
        sa.Column("decision_hint", sa.String(length=30), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bvn"),
    )
    op.create_index(op.f("ix_sim_credit_profiles_bvn"), "sim_credit_profiles", ["bvn"], unique=False)

    op.create_table(
        "sim_bank_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("bank_code", sa.String(length=10), nullable=False),
        sa.Column("bank_name", sa.String(length=100), nullable=False),
        sa.Column("account_number", sa.String(length=10), nullable=False),
        sa.Column("account_name", sa.String(length=255), nullable=False),
        sa.Column("bvn", sa.String(length=11), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bank_code", "account_number", name="uq_sim_bank_code_account_number"),
    )
    op.create_index(op.f("ix_sim_bank_accounts_account_number"), "sim_bank_accounts", ["account_number"], unique=False)
    op.create_index(op.f("ix_sim_bank_accounts_bank_code"), "sim_bank_accounts", ["bank_code"], unique=False)
    op.create_index(op.f("ix_sim_bank_accounts_bvn"), "sim_bank_accounts", ["bvn"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sim_bank_accounts_bvn"), table_name="sim_bank_accounts")
    op.drop_index(op.f("ix_sim_bank_accounts_bank_code"), table_name="sim_bank_accounts")
    op.drop_index(op.f("ix_sim_bank_accounts_account_number"), table_name="sim_bank_accounts")
    op.drop_table("sim_bank_accounts")

    op.drop_index(op.f("ix_sim_credit_profiles_bvn"), table_name="sim_credit_profiles")
    op.drop_table("sim_credit_profiles")
