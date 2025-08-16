from datetime import datetime
import enum
import uuid
from typing import Optional

from sqlalchemy import String, Text, Enum, DateTime, ForeignKey, Index, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Role(str, enum.Enum):
    agent = "agent"
    admin = "admin"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    waiting_customer = "waiting_customer"
    resolved = "resolved"
    closed = "closed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.agent)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[int] = mapped_column(index=True, nullable=False)  # gerado na aplicação
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requester_name: Mapped[str] = mapped_column(String(120), nullable=False)
    requester_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), nullable=False, default=TicketStatus.open)
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    messages: Mapped[list["TicketMessage"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at.asc()"
    )

    __table_args__ = (
        Index("ix_tickets_status", "status"),
        Index("ix_tickets_assignee_id", "assignee_id"),
        Index("ix_tickets_requester_email", "requester_email"),
    )


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket: Mapped["Ticket"] = relationship(back_populates="messages")

class AuditEvent(str, enum.Enum):
    ticket_created = "ticket_created"
    status_changed = "status_changed"
    assignee_changed = "assignee_changed"
    message_added = "message_added"

class TicketAudit(Base):
    __tablename__ = "ticket_audit"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[AuditEvent] = mapped_column(Enum(AuditEvent), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)