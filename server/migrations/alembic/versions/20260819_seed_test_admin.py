"""seed one test admin

Revision ID: 20260819_seed_test_admin
Revises: 20260819_create_admins_table
Create Date: 2026-08-19
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260819_seed_test_admin"
down_revision: Union[str, None] = "20260819_create_admins_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TEST_ADMIN_ID = "00000000-0000-0000-0000-000000000001"
TEST_ADMIN_EMAIL = "admin@test.com"
TEST_ADMIN_PASSWORD_HASH = "$2b$12$6ibMmIa5vY9GUoTYrOneBeveiRX3k70RfuUiwNZv5HZZ2/5.qFdtC"


def upgrade() -> None:
    admins = sa.table(
        "admins",
        sa.column("id", sa.Uuid()),
        sa.column("email", sa.String(length=255)),
        sa.column("password_hash", sa.String(length=255)),
        sa.column("is_active", sa.Boolean()),
    )

    op.bulk_insert(
        admins,
        [
            {
                "id": uuid.UUID(TEST_ADMIN_ID),
                "email": TEST_ADMIN_EMAIL,
                "password_hash": TEST_ADMIN_PASSWORD_HASH,
                "is_active": True,
            }
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM admins WHERE id = :admin_id").bindparams(admin_id=TEST_ADMIN_ID)
    )
