"""Add benefits_mr, critical_difference_en, critical_difference_mr to products

Revision ID: 004
Revises: 002
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '004'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('benefits_mr', JSON, nullable=True, server_default='[]'))
    op.add_column('products', sa.Column('critical_difference_en', JSON, nullable=True, server_default='[]'))
    op.add_column('products', sa.Column('critical_difference_mr', JSON, nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('products', 'benefits_mr')
    op.drop_column('products', 'critical_difference_en')
    op.drop_column('products', 'critical_difference_mr')
