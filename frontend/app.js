// Front‑end logic for Support Desk.  All pages share this file.  It detects
// which page is loaded through the `data-page` attribute on the <body> and
// runs the appropriate initializer.

const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
const tokenKey = 'sd_token';

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

/**
 * Generic helper for API calls.  Adds JWT header when disponível and
 * automatically redireciona para a página de login quando a resposta for 401/403.
 *
 * @param {string} path Caminho relativo da rota (ex.: `/tickets`)
 * @param {object} options Fetch options (method, headers, body)
 */
async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};
  // Define content-type apenas se estiver enviando JSON
  if (options.body && !headers['Content-Type'] && typeof options.body !== 'object') {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { ...options, headers };
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, opts);
    if (response.status === 401 || response.status === 403) {
      clearToken();
      window.location.href = 'index.html';
      return Promise.reject(new Error('Sessão expirada. Faça login novamente.'));
    }
    if (!response.ok) {
      // tenta extrair mensagem de erro JSON
      let detail;
      try {
        const errJson = await response.json();
        detail = errJson.detail || errJson.message;
      } catch (e) {
        detail = response.statusText;
      }
      throw new Error(detail || 'Erro de requisição');
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } catch (err) {
    throw err;
  }
}

/**
 * Autentica o usuário via e‑mail e grava o token retornado.
 */
async function doLogin(email) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (data && data.token) {
    setToken(data.token);
    return data.token;
  }
  throw new Error('Token não retornado');
}

/**
 * Obtém o usuário autenticado via /me e retorna objeto {user_id, role}.
 */
async function getCurrentUser() {
  try {
    const user = await apiRequest('/me');
    return user;
  } catch (err) {
    console.error('Erro ao obter usuário atual', err);
    return null;
  }
}

/**
 * Renderiza a lista de tickets em cards.  Cada card é clicável e abre o modal de
 * detalhes.
 */
async function loadTickets() {
  const listEl = document.getElementById('tickets-list');
  const emptyEl = document.getElementById('empty-state');
  listEl.innerHTML = '';
  try {
    const result = await apiRequest('/tickets');
    const tickets = result.items || [];
    if (tickets.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    tickets.forEach((ticket) => {
      const card = document.createElement('div');
      card.className = 'ticket-card';
      card.dataset.id = ticket.id;
      card.innerHTML = `
        <span class="ticket-number">#${ticket.number}</span>
        <div class="ticket-title">${ticket.title}</div>
        <span class="ticket-status status-${ticket.status}">${statusLabel(ticket.status)}</span>
      `;
      card.addEventListener('click', () => openTicketModal(ticket.id));
      listEl.appendChild(card);
    });
  } catch (err) {
    alert('Erro ao carregar tickets: ' + err.message);
  }
}

/**
 * Converte o valor do enum TicketStatus em um texto amigável.
 */
function statusLabel(status) {
  const map = {
    open: 'Aberto',
    in_progress: 'Em progresso',
    waiting_customer: 'Aguardando cliente',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };
  return map[status] || status;
}

/**
 * Abre o modal de detalhes e popula com as informações do ticket.
 *
 * @param {string} ticketId UUID do ticket
 */
async function openTicketModal(ticketId) {
  const modal = document.getElementById('ticket-modal');
  const body = document.getElementById('ticket-detail-body');
  const titleEl = document.getElementById('modal-ticket-title');
  // Limpa conteúdo anterior
  body.innerHTML = '<p>Carregando...</p>';
  modal.classList.add('show');
  try {
    const ticket = await apiRequest(`/tickets/${ticketId}`);
    // Preencher título
    titleEl.textContent = `Ticket #${ticket.number}`;
    // Montar formulário de status
    const statusSelectOptions = ['open','in_progress','waiting_customer','resolved','closed']
      .map(s => `<option value="${s}" ${s === ticket.status ? 'selected' : ''}>${statusLabel(s)}</option>`)
      .join('');
    const statusSelect = `<select id="status-select">${statusSelectOptions}</select>`;
    const assigneeInput = `<input id="assignee-input" placeholder="UUID do responsável (opcional)" value="" />`;
    const detailHtml = `
      <p><strong>Título:</strong> ${ticket.title}</p>
      <p><strong>Solicitante:</strong> ${ticket.requester_name} &lt;${ticket.requester_email}&gt;</p>
      <div class="form-group">
        <label for="status-select">Status</label>
        ${statusSelect}
      </div>
      <div class="form-group">
        <label for="assignee-input">Atribuir a (UUID)</label>
        ${assigneeInput}
        <button id="save-assignee" class="secondary" style="margin-top:0.5rem;">Salvar responsável</button>
      </div>
      <p><strong>Descrição:</strong></p>
      <p>${ticket.description}</p>
      <h3>Mensagens internas</h3>
      <div id="message-list" class="message-list"></div>
      <div class="form-group">
        <label for="new-message">Nova mensagem</label>
        <textarea id="new-message" rows="3"></textarea>
        <button id="send-message" class="primary" style="margin-top:0.5rem;">Enviar mensagem</button>
      </div>
    `;
    body.innerHTML = detailHtml;
    // Renderizar mensagens
    renderMessages(ticket);
    // Event listeners
    document.getElementById('status-select').addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        await apiRequest(`/tickets/${ticketId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        // Atualiza etiqueta no card
        const card = document.querySelector(`.ticket-card[data-id="${ticketId}"] .ticket-status`);
        if (card) {
          card.className = `ticket-status status-${newStatus}`;
          card.textContent = statusLabel(newStatus);
        }
        alert('Status atualizado com sucesso.');
      } catch (err) {
        alert('Erro ao atualizar status: ' + err.message);
      }
    });
    document.getElementById('save-assignee').addEventListener('click', async () => {
      const assigneeValue = document.getElementById('assignee-input').value.trim();
      const payload = { assignee_id: assigneeValue || null };
      try {
        await apiRequest(`/tickets/${ticketId}/assignee`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        alert('Responsável atualizado com sucesso.');
      } catch (err) {
        alert('Erro ao atualizar responsável: ' + err.message);
      }
    });
    document.getElementById('send-message').addEventListener('click', async () => {
      const msgBody = document.getElementById('new-message').value.trim();
      if (!msgBody) return;
      try {
        // Obter usuário atual para author_id
        const user = await getCurrentUser();
        await apiRequest(`/tickets/${ticketId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_id: user.user_id, body: msgBody }),
        });
        // Limpa campo
        document.getElementById('new-message').value = '';
        // Recarrega detalhes do ticket
        const updated = await apiRequest(`/tickets/${ticketId}`);
        renderMessages(updated);
      } catch (err) {
        alert('Erro ao enviar mensagem: ' + err.message);
      }
    });
  } catch (err) {
    body.innerHTML = `<p style="color:red;">Erro ao carregar ticket: ${err.message}</p>`;
  }
}

/**
 * Renderiza a lista de mensagens na área do modal.
 * @param {object} ticket Ticket com array de mensagens
 */
function renderMessages(ticket) {
  const container = document.getElementById('message-list');
  if (!container) return;
  container.innerHTML = '';
  if (!ticket.messages || ticket.messages.length === 0) {
    container.innerHTML = '<p>Nenhuma mensagem.</p>';
    return;
  }
  ticket.messages.forEach((msg) => {
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `
      <span class="message-author">${msg.author_id}</span>
      <div class="message-body">${msg.body}</div>
      <small>${new Date(msg.created_at).toLocaleString()}</small>
    `;
    container.appendChild(div);
  });
}

/**
 * Inicializa a página de login.
 */
function initLoginPage() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) return;
    try {
      await doLogin(email);
      window.location.href = 'tickets.html';
    } catch (err) {
      alert('Erro ao efetuar login: ' + err.message);
    }
  });
}

/**
 * Inicializa a página de listagem/gestão de tickets.
 */
function initTicketsPage() {
  // Checa se existe token
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }
  // Eventos de logout
  const logoutLink = document.getElementById('logout-link');
  logoutLink.addEventListener('click', () => {
    clearToken();
    window.location.href = 'index.html';
  });
  // Abrir modal de criação
  const createBtn = document.getElementById('open-create');
  const createModal = document.getElementById('create-modal');
  const closeCreateBtn = document.getElementById('close-create-modal');
  const cancelCreate = document.getElementById('cancel-create');
  const createForm = document.getElementById('create-ticket-form');
  createBtn.addEventListener('click', () => {
    createModal.classList.add('show');
  });
  closeCreateBtn.addEventListener('click', () => {
    createModal.classList.remove('show');
  });
  cancelCreate.addEventListener('click', () => {
    createModal.classList.remove('show');
  });
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('new-title').value.trim();
    const description = document.getElementById('new-description').value.trim();
    const name = document.getElementById('new-requester-name').value.trim();
    const email = document.getElementById('new-requester-email').value.trim();
    if (!title || !description || !name || !email) return;
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          requester_name: name,
          requester_email: email,
        }),
      });
      alert('Ticket criado com sucesso.');
      createModal.classList.remove('show');
      createForm.reset();
      // Recarrega a lista
      await loadTickets();
    } catch (err) {
      alert('Erro ao criar ticket: ' + err.message);
    }
  });
  // Eventos do modal de detalhes
  const closeModalBtn = document.getElementById('close-ticket-modal');
  const ticketModal = document.getElementById('ticket-modal');
  closeModalBtn.addEventListener('click', () => {
    ticketModal.classList.remove('show');
  });
  // Carrega tickets
  loadTickets();
}

// Detecta página ao carregar
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') initLoginPage();
  if (page === 'tickets') initTicketsPage();
});