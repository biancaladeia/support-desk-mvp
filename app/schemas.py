from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum
from uuid import UUID
from typing import List
from datetime import datetime

class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    waiting_customer = "waiting_customer"
    resolved = "resolved"
    closed = "closed"

class TicketCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    requester_name: str = Field(..., max_length=120)
    requester_email: EmailStr

class TicketOut(BaseModel):
    # Pydantic v2: habilita leitura direta de attrs do ORM
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    number: int
    title: str
    description: str
    requester_name: str
    requester_email: EmailStr
    status: TicketStatus

class TicketStatusUpdate(BaseModel):
    status: TicketStatus

class TicketListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[TicketOut]
    page: int
    limit: int
    total: int

class TicketAssigneeUpdate(BaseModel):
    assignee_id: UUID | None

class TicketMessageCreate(BaseModel):
    author_id: UUID
    body: str

class TicketMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    author_id: UUID
    body: str
    created_at: datetime

class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    mime: str
    path: str
    size: int
    created_at: datetime

class TicketDetailOut(BaseModel):
    """Detalhe do ticket + mensagens internas."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    number: int
    title: str
    description: str
    requester_name: str
    requester_email: str
    status: TicketStatus
    messages: list[TicketMessageOut]
    attachments: list[AttachmentOut]    


class AuditEvent(str, Enum):
    ticket_created = "ticket_created"
    status_changed = "status_changed"
    assignee_changed = "assignee_changed"
    message_added = "message_added"

class TicketAuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    ticket_id: UUID
    actor_id: UUID | None
    event_type: AuditEvent
    payload: dict
    created_at: datetime

class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    mime: str
    path: str
    size: int
    created_at: datetime