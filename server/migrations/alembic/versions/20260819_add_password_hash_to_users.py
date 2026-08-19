"""add password_hash column to users

Revision ID: 20260819_add_password_hash
Revises:
Create Date: 2026-08-19
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260819_add_password_hash"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # No-op: users.password_hash was removed in favor of dedicated admins table.
    pass


def downgrade() -> None:
    pass
