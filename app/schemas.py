from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum
from uuid import UUID

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