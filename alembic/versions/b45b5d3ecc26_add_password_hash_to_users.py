"""
Add password_hash to users

Revision ID: b45b5d3ecc26
Revises: 000000000000  # replace with your latest revision identifier
Create Date: 2025-08-16 09:48:26.957223
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b45b5d3ecc26'
down_revision: Union[str, Sequence[str], None] = '000000000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the password_hash column to the users table."""
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove the password_hash column from the users table."""
    op.drop_column('users', 'password_hash')