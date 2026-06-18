"""initial schema with profile fields

Revision ID: 4ba49cf12b8e
Revises:
Create Date: 2026-06-17 17:13:11.694459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4ba49cf12b8e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(), nullable=True, index=True),
        sa.Column('email', sa.String(), nullable=True, unique=True, index=True),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('role', sa.String(), server_default='JOBSEEKER'),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('target_role', sa.String(), nullable=True),
        sa.Column('experience_level', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'cv_data',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'analysis_results',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('target_role', sa.String(), server_default=''),
        sa.Column('level', sa.String(), server_default='MID'),
        sa.Column('missing_skills', sa.Text(), nullable=True),
        sa.Column('skill_details', sa.Text(), nullable=True),
        sa.Column('recommended_courses', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('analysis_results')
    op.drop_table('cv_data')
    op.drop_table('users')
