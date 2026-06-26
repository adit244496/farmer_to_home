"""add site_settings table for runtime configuration

Revision ID: 002
Revises: 001
Create Date: 2026-06-26

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'site_settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table('site_settings')
