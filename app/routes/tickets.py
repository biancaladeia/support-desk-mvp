from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_

from pydantic import BaseModel, EmailStr, constr
from passlib.hash import bcrypt

from pathlib import Path

from app.db import get_db
from app.models import Ticket, TicketMessage, User, TicketAudit, AuditEvent, Attachment, Role
from app.schemas import (
    TicketCreate, TicketOut, TicketStatusUpdate, TicketAssigneeUpdate,
    TicketMessageCreate, TicketMessageOut, TicketDetailOut, TicketStatus,
    TicketListOut, TicketAuditOut, AttachmentOut, RegisterIn, UserOut
)

from app.security import require_agent, require_admin, require_agent_or_admin, get_current_user, TokenData


router = APIRouter()
UPLOAD_ROOT = Path("uploads")

def _audit(db: Session, *, ticket_id: UUID, event: AuditEvent, actor_id: UUID | None, payload: dict):
    rec = TicketAudit(ticket_id=ticket_id, event_type=event, actor_id=actor_id, payload=payload or {})
    db.add(rec)
    # não faz commit aqui; cada rota decide quando commitar
    return rec


def next_ticket_number(db: Session) -> int:
    max_num = db.execute(select(func.max(Ticket.number))).scalar()
    return (max_num or 999) + 1


# ---------- Create ----------
@router.post("", response_model=TicketOut, status_code=201, dependencies=[Depends(require_agent_or_admin)])
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
    t = db.query(Ticket).options(
        joinedload(Ticket.messages),
        joinedload(Ticket.attachments)
    ).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


# ---------- Update status ----------
@router.patch("/{ticket_id}/status", response_model=TicketOut, dependencies=[Depends(require_agent_or_admin)])
def update_status(ticket_id: UUID, payload: TicketStatusUpdate, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    old = t.status
    t.status = payload.status
# auditoria: status_changed
    _audit(
        db,
        ticket_id=t.id,
        event=AuditEvent.status_changed,
        actor_id=None,
        payload={"from": str(old), "to": str(t.status)},
    )
    
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
@router.patch("/{ticket_id}/assignee", response_model=TicketOut, dependencies=[Depends(require_agent_or_admin)])
def update_assignee(ticket_id: UUID, payload: TicketAssigneeUpdate, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)

    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    old = str(t.assignee_id) if t.assignee_id else None

    if payload.assignee_id:
        user = db.get(User, payload.assignee_id)
        if not user:
            raise HTTPException(status_code=400, detail="Assignee not found")
        t.assignee_id = user.id
    else:
        t.assignee_id = None

# auditoria: assignee_changed
    _audit(
        db,
        ticket_id=t.id,
        event=AuditEvent.assignee_changed,
        actor_id=payload.assignee_id,  # quem foi setado (ou None)
        payload={"from": old, "to": str(t.assignee_id) if t.assignee_id else None},
    )

    db.commit()

    db.refresh(t)

    # auditoria: ticket_created
    _audit(
        db,
        ticket_id=t.id,
        event=AuditEvent.ticket_created,
        actor_id=None,  # se tiver auth, passe o id do usuário autenticado
        payload={
            "number": t.number,
            "title": t.title,
            "requester_email": t.requester_email
        },
)
    db.commit()  # confirma também a auditoria
    
    return t


# ---------- Mensagens internas ----------
@router.post("/{ticket_id}/messages", response_model=TicketMessageOut, status_code=201, dependencies=[Depends(require_agent_or_admin)])
def add_message(ticket_id: UUID, payload: TicketMessageCreate, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    author = db.get(User, payload.author_id)
    if not author:
        raise HTTPException(status_code=400, detail="Author not found")

    msg = TicketMessage(ticket_id=ticket_id, author_id=payload.author_id, body=payload.body)

    db.add(msg)

 # auditoria: message_added
    _audit(
        db,
        ticket_id=ticket_id,
        event=AuditEvent.message_added,
        actor_id=payload.author_id,
        payload={"body_len": len(payload.body)},
    )

    db.commit()
    db.refresh(msg)
    return msg

@router.get("/{ticket_id}/audit", response_model=list[TicketAuditOut], dependencies=[Depends(require_admin)])
def get_audit(ticket_id: UUID, db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    rows = db.execute(
        select(TicketAudit).where(TicketAudit.ticket_id == ticket_id).order_by(TicketAudit.created_at.asc())
    ).scalars().all()
    return rows


@router.post("/{ticket_id}/attachments", response_model=AttachmentOut, status_code=201,
             dependencies=[Depends(require_agent_or_admin)])
def upload_attachment(ticket_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # cria pasta do ticket
    ticket_dir = UPLOAD_ROOT / str(ticket_id)
    ticket_dir.mkdir(parents=True, exist_ok=True)

    # caminho final do arquivo
    dest = ticket_dir / file.filename

    # grava em disco (stream)
    with dest.open("wb") as f:
        for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
            f.write(chunk)

    size = dest.stat().st_size
    mime = file.content_type or "application/octet-stream"

    att = Attachment(
        ticket_id=ticket_id,
        filename=file.filename,
        mime=mime,
        path=str(dest.as_posix()),  # salva relativo; você pode optar por salvar relativo à raiz
        size=size,
    )
    db.add(att)

    # auditoria (opcional)
    _audit(
        db,
        ticket_id=ticket_id,
        event=AuditEvent.message_added,  # você pode criar um AuditEvent `attachment_added` se quiser
        actor_id=None,
        payload={"filename": file.filename, "mime": mime, "size": size},
    )

    db.commit()
    db.refresh(att)
    return att

@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="E‑mail já cadastrado")
    user = User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        password_hash=bcrypt.hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": str(user.id), "email": user.email}