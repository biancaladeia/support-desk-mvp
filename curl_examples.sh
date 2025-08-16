#!/usr/bin/env bash
set -euo pipefail

# ==== Variáveis ====
HOST="http://127.0.0.1:8000"
ADMIN="PASTE_YOUR_ADMIN_TOKEN_HERE"
AGENT="PASTE_YOUR_AGENT_TOKEN_HERE"
TID="PASTE_TICKET_UUID_HERE"
ASSIGNEE="PASTE_USER_UUID_HERE"
AUTHOR="PASTE_USER_UUID_HERE"
FILE="$HOME/Downloads/exemplo.pdf"

# ==== Quem sou eu ====
echo "== /me (ADMIN) =="
curl -s -H "Authorization: Bearer $ADMIN" "$HOST/me" | jq

echo "== /me (AGENT) =="
curl -s -H "Authorization: Bearer $AGENT" "$HOST/me" | jq

# ==== Criar ticket ====
echo "== POST /tickets (AGENT) =="
CREATE_RES=$(curl -s -X POST "$HOST/tickets" \
  -H "Authorization: Bearer $AGENT" \
  -H "Content-Type: application/json" \
  --data '{"title":"Teste RBAC","description":"desc","requester_name":"RBAC","requester_email":"rbac@example.com"}')
echo "$CREATE_RES" | jq

# Atualiza TID com o retorno do create (se quiser)
TID=$(echo "$CREATE_RES" | jq -r '.id')
echo "TID=$TID"

# ==== Listar tickets ====
echo "== GET /tickets =="
curl -s "$HOST/tickets" | jq

# ==== Detalhe ====
echo "== GET /tickets/{id} =="
curl -s -H "Authorization: Bearer $AGENT" "$HOST/tickets/$TID" | jq

# ==== Atualizar status ====
echo "== PATCH /tickets/{id}/status -> in_progress =="
curl -s -X PATCH "$HOST/tickets/$TID/status" \
  -H "Authorization: Bearer $AGENT" \
  -H "Content-Type: application/json" \
  --data '{"status":"in_progress"}' | jq

# ==== Atribuir responsável ====
echo "== PATCH /tickets/{id}/assignee =="
curl -s -X PATCH "$HOST/tickets/$TID/assignee" \
  -H "Authorization: Bearer $AGENT" \
  -H "Content-Type: application/json" \
  --data '{"assignee_id":"'"$ASSIGNEE"'"}' | jq

# ==== Adicionar mensagem interna ====
echo "== POST /tickets/{id}/messages =="
curl -s -X POST "$HOST/tickets/$TID/messages" \
  -H "Authorization: Bearer $AGENT" \
  -H "Content-Type: application/json" \
  --data '{"author_id":"'"$AUTHOR"'","body":"Investigando passo 1."}' | jq

# ==== Upload de anexo ====
if [[ -f "$FILE" ]]; then
  echo "== POST /tickets/{id}/attachments =="
  curl -s -X POST "$HOST/tickets/$TID/attachments" \
    -H "Authorization: Bearer $AGENT" \
    -H "accept: application/json" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@${FILE}" | jq
else
  echo "Arquivo para upload não encontrado em $FILE (skip upload)"
fi

# ==== Auditoria (403 para AGENT, 200 para ADMIN) ====
echo "== GET /tickets/{id}/audit (AGENT - esperado 403) =="
curl -i -s -H "Authorization: Bearer $AGENT" "$HOST/tickets/$TID/audit" | head -n 1

echo "== GET /tickets/{id}/audit (ADMIN - esperado 200) =="
curl -s -H "Authorization: Bearer $ADMIN" "$HOST/tickets/$TID/audit" | jq
