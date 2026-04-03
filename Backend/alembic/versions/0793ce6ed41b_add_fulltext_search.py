"""add_fulltext_search

Revision ID: 0793ce6ed41b
Revises: d43db703ccfb
Create Date: 2026-04-03 05:31:34.859467

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0793ce6ed41b'
down_revision: Union[str, Sequence[str], None] = 'd43db703ccfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE videos ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('spanish', coalesce(description, '')), 'B')
            ) STORED
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_videos_search ON videos USING GIN (search_vector)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_videos_search")
    op.execute("ALTER TABLE videos DROP COLUMN IF EXISTS search_vector")
