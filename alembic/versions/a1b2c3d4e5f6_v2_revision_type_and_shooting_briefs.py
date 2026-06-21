"""v2: add revision_type to tasks, create shooting_briefs table

Revision ID: a1b2c3d4e5f6
Revises: 3f82ba910c12
Create Date: 2026-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '3f82ba910c12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add revision_type to tasks
    op.add_column('tasks', sa.Column('revision_type', sa.String(20), nullable=True))

    # Create shooting_briefs table
    op.create_table(
        'shooting_briefs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('what_was_shot', sa.Text(), nullable=True),
        sa.Column('location', sa.String(300), nullable=True),
        sa.Column('shoot_date', sa.Date(), nullable=True),
        sa.Column('crew_present', sa.String(500), nullable=True),
        sa.Column('what_happened', sa.Text(), nullable=True),
        sa.Column('raw_footage_notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id'),
    )
    op.create_index('ix_shooting_briefs_id', 'shooting_briefs', ['id'], unique=False)
    op.create_index('ix_shooting_briefs_task_id', 'shooting_briefs', ['task_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_shooting_briefs_task_id', table_name='shooting_briefs')
    op.drop_index('ix_shooting_briefs_id', table_name='shooting_briefs')
    op.drop_table('shooting_briefs')
    op.drop_column('tasks', 'revision_type')
