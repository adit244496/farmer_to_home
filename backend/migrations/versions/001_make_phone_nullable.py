"""make users.phone nullable for email-only registration

Revision ID: 001
Revises:
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('users', 'phone', existing_type=sa.String(15), nullable=True)


def downgrade() -> None:
    # Revert only safe if there are no NULL phone rows
    op.alter_column('users', 'phone', existing_type=sa.String(15), nullable=False)
