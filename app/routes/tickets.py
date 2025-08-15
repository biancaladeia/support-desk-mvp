from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.db import get_db
from app.models import Ticket, TicketMessage, User
from app.schemas import (
    TicketCreate, TicketOut, TicketStatusUpdate, TicketAssigneeUpdate,
    TicketMessageCreate, TicketMessageOut, TicketDetailOut, TicketStatus, TicketListOut
)

router = APIRouter()


def next_ticket_number(db: Session) -> int:
    max_num = db.execute(select(func.max(Ticket.number))).scalar()
    return (max_num or 999) + 1


# ---------- Create ----------
@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    t = Ticket(
        number=next_ticket_number(db),
        title=payload.title,
        description=payload.description,
        requester_name=payload.requester_name,
        requester_email=payload.requester_email,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# ---------- Detail (inclui mensagens internas) ----------
@router.get("/{ticket_id}", response_model=TicketDetailOut)
def get_ticket(ticket_id: UUID, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


# ---------- Update status ----------
@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_status(ticket_id: UUID, payload: TicketStatusUpdate, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.status = payload.status
    db.commit()
    db.refresh(t)
    return t


# ---------- List + filtros ----------
def _build_filters(
    q: Optional[str],
    status: Optional[TicketStatus],
    assignee_id: Optional[UUID],
):
    filters = []
    if q:
        like = f"%{q}%"
        filters.append(or_(Ticket.title.ilike(like), Ticket.description.ilike(like)))
    if status:
        filters.append(Ticket.status == status)
    if assignee_id is not None:
        filters.append(Ticket.assignee_id == assignee_id)
    return filters


@router.get("", response_model=TicketListOut)
def list_tickets(
    q: Optional[str] = None,
    status: Optional[TicketStatus] = None,
    assignee_id: Optional[UUID] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    limit = max(1, min(limit, 100))

    filters = _build_filters(q, status, assignee_id)

    total = db.scalar(select(func.count()).select_from(Ticket).where(*filters)) or 0

    stmt = (
        select(Ticket)
        .where(*filters)
        .order_by(Ticket.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()

    return TicketListOut(items=items, page=page, limit=limit, total=total)


# ---------- Atribuição ----------
@router.patch("/{ticket_id}/assignee", response_model=TicketOut)
def update_assignee(ticket_id: UUID, payload: TicketAssigneeUpdate, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if payload.assignee_id:
        user = db.get(User, payload.assignee_id)
        if not user:
            raise HTTPException(status_code=400, detail="Assignee not found")
        t.assignee_id = user.id
    else:
        t.assignee_id = None
    db.commit()
    db.refresh(t)
    return t


# ---------- Mensagens internas ----------
@router.post("/{ticket_id}/messages", response_model=TicketMessageOut, status_code=201)
def add_message(ticket_id: UUID, payload: TicketMessageCreate, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    author = db.get(User, payload.author_id)
    if not author:
        raise HTTPException(status_code=400, detail="Author not found")

    msg = TicketMessage(ticket_id=ticket_id, author_id=payload.author_id, body=payload.body)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
