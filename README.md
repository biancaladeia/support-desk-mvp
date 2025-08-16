# Support Desk MVP

Minimal service desk API built with **FastAPI**, **SQLAlchemy**, **Alembic**
and **PostgreSQL**. This fork modernises the authentication flow to use
e‑mail and password credentials instead of pre‑generated JWTs. A short‑
lived JWT is still issued after login to authorise subsequent
requests, but you never need to copy a token manually – just call
`/auth/login` from the front‑end and store the returned token.

## ✅ Features in this MVP

- Registro de tickets (criar, detalhar, listar com filtros e paginação)
- Status do ticket (open, in_progress, waiting_customer, resolved, closed)
- Atribuição de responsável (assignee)
- Mensagens internas por ticket
- Auditoria/histórico de eventos (created/status/assignee/message)
- RBAC simples (JWT, roles `agent`/`admin`, guards por rota)
- Upload de anexos por ticket
- Healthcheck (`/health`) e endpoint `/me` (mostra usuário autenticado)

---

## 1) Requisitos

- Python 3.11+
- PostgreSQL 16+
- Git

## 2) Setup rápido

```bash
# 2.1. Clonar e entrar
git clone git@github.com:biancaladeia/support-desk-mvp.git
cd support-desk-mvp

# 2.2. Criar venv e instalar deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # ou instale fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic-settings, PyJWT, email-validator, passlib

# 2.3. Configurar .env (exemplo)
cat > .env << 'ENV'
ENV=dev
DATABASE_URL=postgresql+psycopg2://<user>@localhost:5432/support_desk
JWT_SECRET=please-change-me
JWT_ALG=HS256
JWT_EXPIRES_HOURS=8
ENV

# 2.4. Criar DB e rodar migrations
createdb support_desk
alembic upgrade head

# 2.5. Criar usuários iniciais com senha
python -m scripts.seed_users
```

O último passo (`seed_users`) cria contas de `Admin`, `Agent` e
`User` com senhas padrão definidas no script. Você pode alterar
essas senhas ou criar usuários adicionais através do endpoint
`POST /auth/register`.

## 3) Rodar o servidor

```bash
uvicorn app.main:app --reload
# Servirá em http://127.0.0.1:8000
```

## 4) Autenticação e autorização

- Para se autenticar, envie um `POST /auth/login` com `email` e
  `password` no corpo JSON. O servidor devolverá um objeto
  `{ "token": "<jwt>" }`. Guarde esse token no front‑end (por
  exemplo, no `localStorage` ou num cookie HttpOnly) e envie-o no
  header `Authorization: Bearer <jwt>` para as rotas protegidas.
- O endpoint `GET /me` devolve o usuário associado ao token.
- O endpoint `POST /auth/register` permite criar novos usuários
  passando `name`, `email`, `password` e um `role` opcional.

## 5) Endpoints principais

### Health

```
GET /health  -> {"status":"ok"}
```

### Tickets

- `POST /tickets` (auth: agent/admin) — cria ticket
- `GET /tickets` — lista com filtros `q`, `status`, `assignee_id`, `page`, `limit`
- `GET /tickets/{id}` — detalhe + mensagens + anexos
- `PATCH /tickets/{id}/status` (auth: agent/admin)
- `PATCH /tickets/{id}/assignee` (auth: agent/admin)
- `POST /tickets/{id}/messages` (auth: agent/admin) — adiciona nota interna
- `GET /tickets/{id}/audit` (auth: admin) — eventos do ticket
- `POST /tickets/{id}/attachments` (auth: agent/admin) — upload de arquivo

### Auth utilitário

- `GET /me` — dados do token atual (user_id, role)

---

## 6) Scripts úteis

```bash
# rodar linters/tests (se adicionar futuramente)
# ruff .
# pytest -q
```

---

### Observações

- Uploads são salvos em `uploads/<ticket_id>/arquivo.ext`. O
  diretório `uploads/` está no `.gitignore`.
- Em produção, mova `JWT_SECRET` para um segredo seguro (ex.: variáveis
  de ambiente do container).
- Para maior segurança, considere expirar o JWT em alguns minutos e
  implementar um token de *refresh*. Também é recomendável adicionar
  limitação de requisições ao endpoint `/auth/login` (ex.: fastapi‑limiter
  com Redis) e bloqueio após múltiplas tentativas falhas.