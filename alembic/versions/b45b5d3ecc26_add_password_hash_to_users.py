"""add password_hash to users

Revision ID: b45b5d3ecc26
Revises: f3fcd1d54144
Create Date: 2025-08-16 09:48:26.957223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b45b5d3ecc26'
down_revision: Union[str, Sequence[str], None] = 'f3fcd1d54144'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
