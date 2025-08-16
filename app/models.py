"""
SQLAlchemy models for the Support Desk application.

This module defines the core database schema used by the service. It
contains a simplified version of the original models focused on the
`User` entity for the sake of this example. The `password_hash`
column is now non‑nullable to enforce that all accounts have a
password set.
"""

from datetime import datetime
import enum
import uuid
from typing import Optional

from sqlalchemy import String, Enum, DateTime, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Role(str, enum.Enum):
    agent = "agent"
    admin = "admin"


class User(Base):
    __tablename__ = 'users'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # require a password hash for all users (email+senha auth)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.agent)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"