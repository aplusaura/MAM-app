"""v1.4 new fields: task_code, revision_notes, client_code, logo_url

Revision ID: 3f82ba910c12
Revises: 25634cd70bd8
Create Date: 2026-03-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '3f82ba910c12'
down_revision = '25634cd70bd8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('task_code', sa.String(20), nullable=True, unique=True))
    op.add_column('tasks', sa.Column('revision_notes', sa.Text(), nullable=True))
    op.create_index('ix_tasks_task_code', 'tasks', ['task_code'], unique=True)

    op.add_column('clients', sa.Column('client_code', sa.String(20), nullable=True, unique=True))
    op.add_column('clients', sa.Column('logo_url', sa.String(500), nullable=True))
    op.create_index('ix_clients_client_code', 'clients', ['client_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_clients_client_code', table_name='clients')
    op.drop_column('clients', 'logo_url')
    op.drop_column('clients', 'client_code')

    op.drop_index('ix_tasks_task_code', table_name='tasks')
    op.drop_column('tasks', 'revision_notes')
    op.drop_column('tasks', 'task_code')
