from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db import get_db
from app.models import Ticket
from app.schemas import TicketCreate, TicketOut
from uuid import UUID 
from app.schemas import TicketCreate, TicketOut, TicketStatusUpdate

router = APIRouter()

def next_ticket_number(db: Session) -> int:
    # MVP: pega o maior número existente e soma 1; começa em 1000
    max_num = db.execute(select(func.max(Ticket.number))).scalar()
    return (max_num or 999) + 1

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

@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: UUID, db: Session = Depends(get_db)): 
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_status(ticket_id: UUID, payload: TicketStatusUpdate, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.status = payload.status
    db.commit()
    db.refresh(t)
    return t