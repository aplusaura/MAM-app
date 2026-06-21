"""add_milestones_table

Revision ID: d1e2f3a4b5c6
Revises: 4c31bca5346b
Create Date: 2026-03-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = '4c31bca5346b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'milestones',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_milestones_id', 'milestones', ['id'])
    op.create_index('ix_milestones_project_id', 'milestones', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_milestones_project_id', table_name='milestones')
    op.drop_index('ix_milestones_id', table_name='milestones')
    op.drop_table('milestones')
