/*
 * Support Desk MVP Frontend
 *
 * Esta é uma implementação simples em JavaScript puro que consome os
 * endpoints do backend FastAPI. O foco é fornecer um MVP funcional
 * sem depender de frameworks externos. Ajuste o valor de `API_BASE`
 * conforme o endereço onde o backend está rodando.
 */

// URL base da API (ajuste conforme necessário)
const API_BASE = "http://127.0.0.1:8000";

// Armazena o token JWT retornado no login
let jwtToken = null;

// Armazena o ID e o papel do usuário autenticado
let currentUser = { user_id: null, role: null };

// Elementos de navegação
const navLogin = document.getElementById("nav-login");
const navCreateTicket = document.getElementById("nav-create-ticket");
const navListTickets = document.getElementById("nav-list-tickets");

// Seções
const sectionLogin = document.getElementById("section-login");
const sectionCreateTicket = document.getElementById("section-create-ticket");
const sectionListTickets = document.getElementById("section-list-tickets");

// Result containers
const loginResultDiv = document.getElementById("login-result");
const createTicketResultDiv = document.getElementById("create-ticket-result");

// Form elements
const loginForm = document.getElementById("login-form");
const createTicketForm = document.getElementById("create-ticket-form");
const filterTicketsForm = document.getElementById("filter-tickets-form");

// List and detail containers
const ticketsListDiv = document.getElementById("tickets-list");
const paginationControlsDiv = document.getElementById("pagination-controls");
const ticketDetailDiv = document.getElementById("ticket-detail");

// Helper: mostra apenas a seção selecionada
function showSection(section) {
  sectionLogin.classList.add("hidden");
  sectionCreateTicket.classList.add("hidden");
  sectionListTickets.classList.add("hidden");
  section.classList.remove("hidden");
}

// Navegação
navLogin.addEventListener("click", () => {
  showSection(sectionLogin);
});

navCreateTicket.addEventListener("click", () => {
  if (!jwtToken) {
    alert("Faça login antes de criar um ticket.");
    return;
  }
  showSection(sectionCreateTicket);
});

navListTickets.addEventListener("click", () => {
  showSection(sectionListTickets);
});

// Login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  if (!email) return;
  loginResultDiv.textContent = "Realizando login...";
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro no login");
    }
    const data = await res.json();
    jwtToken = data.token;
    loginResultDiv.textContent = "Login bem-sucedido! Obtendo dados do usuário...";
    // Obter dados do usuário usando /me
    await fetchCurrentUser();
    loginResultDiv.textContent = `Logado como ${currentUser.user_id} (role: ${currentUser.role})`;
  } catch (err) {
    console.error(err);
    loginResultDiv.textContent = err.message;
  }
});

// Busca dados de /me usando o token atual
async function fetchCurrentUser() {
  if (!jwtToken) return;
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      currentUser.user_id = data.user_id;
      currentUser.role = data.role;
    } else {
      currentUser = { user_id: null, role: null };
    }
  } catch (err) {
    console.error("Erro ao obter /me:", err);
  }
}

// Criar ticket
createTicketForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!jwtToken) {
    alert("Você precisa estar logado para criar tickets.");
    return;
  }
  const title = document.getElementById("ticket-title").value.trim();
  const description = document.getElementById("ticket-description").value.trim();
  const requester_name = document.getElementById("ticket-requester-name").value.trim();
  const requester_email = document
    .getElementById("ticket-requester-email")
    .value.trim();
  createTicketResultDiv.textContent = "Enviando...";
  try {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        title,
        description,
        requester_name,
        requester_email,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao criar o ticket");
    }
    const data = await res.json();
    createTicketResultDiv.textContent = `Ticket #${data.number} criado com sucesso!`;
    createTicketForm.reset();
  } catch (err) {
    console.error(err);
    createTicketResultDiv.textContent = err.message;
  }
});

// Filtrar/listar tickets
filterTicketsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await fetchAndRenderTickets();
});

// Função para buscar e mostrar tickets conforme filtros
async function fetchAndRenderTickets() {
  // Limpa detalhes ao listar
  ticketDetailDiv.innerHTML = "";
  const q = document.getElementById("filter-q").value.trim();
  const status = document.getElementById("filter-status").value;
  const assignee = document.getElementById("filter-assignee").value.trim();
  const page = parseInt(document.getElementById("filter-page").value) || 1;
  const limit = parseInt(document.getElementById("filter-limit").value) || 10;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (assignee) params.set("assignee_id", assignee);
  params.set("page", page.toString());
  params.set("limit", limit.toString());
  ticketsListDiv.textContent = "Carregando...";
  try {
    const res = await fetch(`${API_BASE}/tickets?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao listar tickets");
    }
    const data = await res.json();
    renderTickets(data);
  } catch (err) {
    console.error(err);
    ticketsListDiv.textContent = err.message;
  }
}

// Renderiza lista de tickets e controles de paginação
function renderTickets(listResult) {
  const { items, page, limit, total } = listResult;
  ticketsListDiv.innerHTML = "";
  if (items.length === 0) {
    ticketsListDiv.textContent = "Nenhum ticket encontrado.";
  } else {
    items.forEach((ticket) => {
      const div = document.createElement("div");
      div.className = "ticket-item";
      div.textContent = `#${ticket.number} | ${ticket.title} | ${ticket.status}`;
      div.addEventListener("click", () => {
        showTicketDetail(ticket.id);
      });
      ticketsListDiv.appendChild(div);
    });
  }
  // Paginação
  const totalPages = Math.ceil(total / limit);
  paginationControlsDiv.innerHTML = "";
  if (totalPages > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Anterior";
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener("click", () => {
      document.getElementById("filter-page").value = page - 1;
      fetchAndRenderTickets();
    });
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Próxima";
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener("click", () => {
      document.getElementById("filter-page").value = page + 1;
      fetchAndRenderTickets();
    });
    paginationControlsDiv.appendChild(prevBtn);
    const info = document.createElement("span");
    info.textContent = ` Página ${page} de ${totalPages} `;
    paginationControlsDiv.appendChild(info);
    paginationControlsDiv.appendChild(nextBtn);
  }
}

// Mostrar detalhes do ticket selecionado
async function showTicketDetail(ticketId) {
  ticketDetailDiv.textContent = "Carregando detalhes...";
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao obter detalhes");
    }
    const data = await res.json();
    renderTicketDetail(data);
  } catch (err) {
    console.error(err);
    ticketDetailDiv.textContent = err.message;
  }
}

// Renderiza detalhe do ticket com formulários de atualização
function renderTicketDetail(ticket) {
  // Limpa conteúdo
  ticketDetailDiv.innerHTML = "";
  // Cabeçalho
  const header = document.createElement("h3");
  header.textContent = `Ticket #${ticket.number} (${ticket.status})`;
  ticketDetailDiv.appendChild(header);
  // Informações básicas
  const info = document.createElement("div");
  info.className = "ticket-detail-section";
  info.innerHTML = `
    <p><strong>Título:</strong> ${ticket.title}</p>
    <p><strong>Descrição:</strong> ${ticket.description}</p>
    <p><strong>Solicitante:</strong> ${ticket.requester_name} (${ticket.requester_email})</p>
    <p><strong>Responsável:</strong> ${ticket.assignee_id || '—'}</p>
  `;
  ticketDetailDiv.appendChild(info);
  // Formulário de alteração de status
  const statusForm = document.createElement("form");
  statusForm.innerHTML = `
    <label for="status-select">Alterar status:</label>
    <select id="status-select">
      <option value="open">Aberto</option>
      <option value="in_progress">Em progresso</option>
      <option value="waiting_customer">Aguardando cliente</option>
      <option value="resolved">Resolvido</option>
      <option value="closed">Fechado</option>
    </select>
    <button type="submit">Atualizar</button>
  `;
  statusForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const newStatus = statusForm.querySelector("#status-select").value;
    updateTicketStatus(ticket.id, newStatus);
  });
  ticketDetailDiv.appendChild(statusForm);
  // Formulário de alteração de responsável
  const assigneeForm = document.createElement("form");
  assigneeForm.innerHTML = `
    <label for="assignee-input">Alterar responsável (UUID, vazio para remover):</label>
    <input id="assignee-input" type="text" placeholder="UUID" />
    <button type="submit">Atualizar</button>
  `;
  assigneeForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const assigneeId = assigneeForm.querySelector("#assignee-input").value.trim() || null;
    updateTicketAssignee(ticket.id, assigneeId);
  });
  ticketDetailDiv.appendChild(assigneeForm);
  // Mensagens existentes
  const msgList = document.createElement("div");
  msgList.className = "ticket-detail-section";
  msgList.innerHTML = `<h4>Mensagens</h4>`;
  if (ticket.messages.length === 0) {
    msgList.innerHTML += `<p>Nenhuma mensagem.</p>`;
  } else {
    ticket.messages.forEach((msg) => {
      const p = document.createElement("p");
      const created = new Date(msg.created_at).toLocaleString();
      p.innerHTML = `<strong>${msg.author_id}</strong> (${created}): ${msg.body}`;
      msgList.appendChild(p);
    });
  }
  ticketDetailDiv.appendChild(msgList);
  // Formulário para adicionar mensagem
  const addMessageForm = document.createElement("form");
  addMessageForm.innerHTML = `
    <h4>Adicionar mensagem interna</h4>
    <textarea id="message-body" rows="3" placeholder="Mensagem" required></textarea>
    <button type="submit">Enviar</button>
  `;
  addMessageForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const body = addMessageForm.querySelector("#message-body").value.trim();
    if (!body) return;
    addTicketMessage(ticket.id, body);
    addMessageForm.reset();
  });
  ticketDetailDiv.appendChild(addMessageForm);
  // Lista de anexos
  const attachmentList = document.createElement("div");
  attachmentList.className = "ticket-detail-section";
  attachmentList.innerHTML = `<h4>Anexos</h4>`;
  if (ticket.attachments.length === 0) {
    attachmentList.innerHTML += `<p>Nenhum anexo.</p>`;
  } else {
    ticket.attachments.forEach((att) => {
      const p = document.createElement("p");
      p.innerHTML = `${att.filename} (${(att.size / 1024).toFixed(1)} KB)`;
      attachmentList.appendChild(p);
    });
  }
  ticketDetailDiv.appendChild(attachmentList);
  // Formulário de upload de anexo
  const uploadForm = document.createElement("form");
  uploadForm.enctype = "multipart/form-data";
  uploadForm.innerHTML = `
    <h4>Enviar anexo</h4>
    <input id="file-input" type="file" required />
    <button type="submit">Enviar</button>
  `;
  uploadForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fileInput = uploadForm.querySelector("#file-input");
    if (!fileInput.files || fileInput.files.length === 0) return;
    uploadAttachment(ticket.id, fileInput.files[0]);
    uploadForm.reset();
  });
  ticketDetailDiv.appendChild(uploadForm);
  // Botão para mostrar auditoria (somente admin)
  if (currentUser.role === "admin") {
    const auditBtn = document.createElement("button");
    auditBtn.textContent = "Ver auditoria";
    auditBtn.addEventListener("click", () => {
      showTicketAudit(ticket.id);
    });
    ticketDetailDiv.appendChild(auditBtn);
  }
}

// Atualiza status do ticket
async function updateTicketStatus(ticketId, newStatus) {
  if (!jwtToken) {
    alert("É necessário estar logado para atualizar o status.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Falha ao atualizar status");
    }
    const data = await res.json();
    alert(`Status atualizado para ${data.status}`);
    showTicketDetail(ticketId);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Atualiza responsável do ticket
async function updateTicketAssignee(ticketId, assigneeId) {
  if (!jwtToken) {
    alert("É necessário estar logado para alterar o responsável.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/assignee`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ assignee_id: assigneeId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Falha ao alterar responsável");
    }
    const data = await res.json();
    alert("Responsável atualizado");
    showTicketDetail(ticketId);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Adiciona mensagem interna ao ticket
async function addTicketMessage(ticketId, body) {
  if (!jwtToken) {
    alert("É necessário estar logado para adicionar mensagens.");
    return;
  }
  if (!currentUser.user_id) {
    alert("Não foi possível determinar seu ID de usuário.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ author_id: currentUser.user_id, body }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Falha ao adicionar mensagem");
    }
    alert("Mensagem adicionada");
    showTicketDetail(ticketId);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Envia arquivo de anexo
async function uploadAttachment(ticketId, file) {
  if (!jwtToken) {
    alert("É necessário estar logado para enviar anexos.");
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Falha ao enviar anexo");
    }
    alert("Anexo enviado com sucesso");
    showTicketDetail(ticketId);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Exibe auditoria do ticket (apenas admin)
async function showTicketAudit(ticketId) {
  if (!jwtToken) {
    alert("É necessário estar logado.");
    return;
  }
  if (currentUser.role !== "admin") {
    alert("Apenas administradores podem ver a auditoria.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/audit`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Falha ao obter auditoria");
    }
    const rows = await res.json();
    renderAuditRows(rows);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function renderAuditRows(rows) {
  // Cria uma área modal simples ou exibe abaixo do ticket
  const auditDiv = document.createElement("div");
  auditDiv.className = "ticket-detail-section";
  auditDiv.innerHTML = `<h4>Auditoria</h4>`;
  if (rows.length === 0) {
    auditDiv.innerHTML += `<p>Nenhum evento de auditoria.</p>`;
  } else {
    rows.forEach((row) => {
      const p = document.createElement("p");
      const created = new Date(row.created_at).toLocaleString();
      p.innerHTML = `${created} — <strong>${row.event_type}</strong> — Ator: ${
        row.actor_id || "N/A"
      } — Payload: ${JSON.stringify(row.payload)}`;
      auditDiv.appendChild(p);
    });
  }
  ticketDetailDiv.appendChild(auditDiv);
}

// Inicial: mostrar seção de login por padrão
showSection(sectionLogin);