# Support Desk MVP

Minimal service desk API built with **FastAPI**, **SQLAlchemy**, **Alembic**, and **PostgreSQL**.

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
- Python 3.11+ (você usou 3.13) e **venv**
- PostgreSQL 16+
- Git

## 2) Setup rápido
```bash
# 2.1. Clonar e entrar
git clone git@github.com:biancaladeia/support-desk-mvp.git
cd support-desk-mvp

# 2.2. Criar venv e instalar deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # (se houver) — ou:
pip install fastapi uvicorn[standard] sqlalchemy alembic psycopg2-binary pydantic-settings PyJWT email-validator

# 2.3. Configurar .env (exemplo)
cat > .env << 'ENV'
ENV=dev
DATABASE_URL=postgresql+psycopg2://<user>@localhost:5432/support_desk
JWT_SECRET=please-change-me
JWT_ALG=HS256
JWT_EXPIRES_HOURS=8
ENV

# 2.4. Criar DB e rodar migrations
# createdb support_desk  (se necessário, no macOS: `brew services start postgresql@16`)
alembic upgrade head
```

## 3) Rodar o servidor
```bash
uvicorn app.main:app --reload
# Servirá em http://127.0.0.1:8000
```

## 4) Seed e Tokens de teste (RBAC)
Crie usuários iniciais e gere tokens:
```bash
python -m scripts.seed_and_token
```
Saída esperada: imprime IDs e dois tokens (ADMIN e AGENT).

Verifique seu usuário autenticado:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8000/me
```

---

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

## 6) CURLs de exemplo
Veja o arquivo [`curl_examples.sh`](./curl_examples.sh) incluído neste pacote (rolar até a seção **Arquivos deste pacote**).

---

## 7) Postman collection
Importe o arquivo **SupportDeskMVP.postman_collection.json** (ver **Arquivos deste pacote**) no Postman.
- Variáveis: `host`, `token`, `ticket_id`.

---

## 8) Notas
- Uploads são salvos em `uploads/<ticket_id>/arquivo.ext`. O diretório `uploads/` está no `.gitignore`.
- Para auditoria de anexos, você pode criar um `AuditEvent.attachment_added` (opcional).
- Em produção, mova `JWT_SECRET` para um segredo seguro (ex.: variáveis de ambiente do container).

---

## 9) Scripts úteis
```bash
# rodar linters/tests (se adicionar futuramente)
# ruff .
# pytest -q
```

Boa construção! 🚀