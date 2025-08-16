# MVP – Service Desk Checklist

## 0. Setup
- [x] Configurar pyenv/venv e dependências (FastAPI, SQLAlchemy, Alembic) source .venv/bin/activate     
- [x] Criar estrutura `app/` (main, db, models, schemas, routes)
- [x] Adicionar `.env` e `pydantic-settings` (DATABASE_URL)

## 1. Registro de Tickets
- [X] Modelos `User`, `Ticket`
- [X] Alembic: migração inicial (users, tickets)
- [X] Endpoint POST /tickets (criar ticket com number único)
- [X] Endpoint GET /tickets/{id} (detalhe do ticket)

## 2. Status do Ticket
- [X] Campo `status ∈ {open, in_progress, waiting_customer, resolved, closed}`
- [X] Endpoint PATCH /tickets/{id}/status

## 3. Listagem e Filtros
- [X] Endpoint GET /tickets?q=&status=&assignee_id=&page=&limit=
- [X] Índices em status, assignee_id, requester_email

## 4. Mensagens Internas
- [X] Modelo `TicketMessage(ticket_id, author_id, body)`
- [X] Endpoint POST /tickets/{id}/messages (nota interna)
- [X] Incluir mensagens no GET /tickets/{id}

## 5. Atribuição de Responsável
- [X] FK `tickets.assignee_id -> users.id`
- [X] Endpoint PATCH /tickets/{id}/assignee

## 6. Auditoria/Histórico
- [X] Modelo `TicketAudit(ticket_id, actor_id, event_type, payload)`
- [X] Eventos: ticket_created, status_changed, assignee_changed, message_added
- [X] Endpoint GET /tickets/{id}/audit

## 7. RBAC simples
- [ ] `users.role ∈ {agent, admin}` + seed inicial
- [ ] Middleware JWT simples
- [ ] Guards por rota

## 8. Anexos (básico)
- [ ] Modelo `Attachment(ticket_id, filename, mime, path, size)`
- [ ] Endpoint POST /tickets/{id}/attachments
- [ ] Listar anexos no detalhe do ticket
