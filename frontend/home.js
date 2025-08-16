/*
 * Main script for the Support Desk front‑end. Handles listing tickets, filtering,
 * opening details, updating status/assignee, adding comments, and creating
 * new tickets. It uses the JWT stored in localStorage for authorized
 * endpoints and gracefully handles unauthenticated scenarios by redirecting
 * the user back to the login page.
 */

const API_BASE_URL = 'http://localhost:9000';

document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is authenticated
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  // Display user role if available
  const roleSpan = document.getElementById('userRole');
  const role = localStorage.getItem('role');
  roleSpan.textContent = role ? role : '';
  // Setup logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Elements
  const ticketsContainer = document.getElementById('ticketsContainer');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const newTicketBtn = document.getElementById('newTicketBtn');

  // Modals and modal elements
  const ticketModal = document.getElementById('ticketModal');
  const closeTicketModalBtn = document.getElementById('closeTicketModal');
  const modalTitle = document.getElementById('modalTicketTitle');
  const modalNumber = document.getElementById('modalTicketNumber');
  const modalRequester = document.getElementById('modalTicketRequester');
  const modalDescription = document.getElementById('modalTicketDescription');
  const statusSelect = document.getElementById('statusSelect');
  const updateStatusBtn = document.getElementById('updateStatusBtn');
  const assigneeInput = document.getElementById('assigneeInput');
  const assignBtn = document.getElementById('assignBtn');
  const messagesList = document.getElementById('messagesList');
  const attachmentsList = document.getElementById('attachmentsList');
  const addCommentBtn = document.getElementById('addCommentBtn');
  const attachmentInput = document.getElementById('attachmentInput');
  const uploadAttachmentBtn = document.getElementById('uploadAttachmentBtn');
  let currentTicketId = null;
  // Comment modal
  const commentModal = document.getElementById('commentModal');
  const closeCommentModalBtn = document.getElementById('closeCommentModal');
  const commentBodyInput = document.getElementById('commentBody');
  const submitCommentBtn = document.getElementById('submitCommentBtn');
  // New ticket modal
  const newTicketModal = document.getElementById('newTicketModal');
  const closeNewTicketModalBtn = document.getElementById('closeNewTicketModal');
  const newTitleInput = document.getElementById('newTitle');
  const newDescInput = document.getElementById('newDescription');
  const newNameInput = document.getElementById('newRequesterName');
  const newEmailInput = document.getElementById('newRequesterEmail');
  const createTicketBtn = document.getElementById('createTicketBtn');

  /**
   * Helper: returns headers object with Authorization if token is available.
   */
  function authHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const tk = localStorage.getItem('token');
    if (tk) headers['Authorization'] = `Bearer ${tk}`;
    return headers;
  }

  /**
   * Fetches tickets from the backend with optional query parameters
   */
  async function loadTickets() {
    const q = searchInput.value.trim();
    const status = statusFilter.value;
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (status) params.append('status', status);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets?${params.toString()}`, {
        headers: authHeaders({})
      });
      if (!res.ok) {
        throw new Error('Falha ao buscar tickets');
      }
      const data = await res.json();
      renderTickets(data.items);
    } catch (err) {
      console.error(err);
      ticketsContainer.innerHTML = '<p>Erro ao carregar tickets.</p>';
    }
  }

  /**
   * Renders an array of tickets into the cards container
   * @param {Array} tickets
   */
  function renderTickets(tickets) {
    ticketsContainer.innerHTML = '';
    if (!tickets || tickets.length === 0) {
      ticketsContainer.innerHTML = '<p>Nenhum ticket encontrado.</p>';
      return;
    }
    tickets.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'card';
      const title = document.createElement('h3');
      title.textContent = t.title;
      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge status-${t.status}`;
      // Translate status for display
      const statusNames = {
        open: 'Aberto',
        in_progress: 'Em andamento',
        waiting_customer: 'Aguardando cliente',
        resolved: 'Resolvido',
        closed: 'Fechado'
      };
      statusBadge.textContent = statusNames[t.status] || t.status;
      const assignee = document.createElement('div');
      assignee.className = 'assignee';
      assignee.textContent = t.assignee_id ? `Resp: ${t.assignee_id.substring(0, 8)}...` : 'Sem responsável';
      const openBtn = document.createElement('button');
      openBtn.className = 'open-btn';
      openBtn.textContent = 'Abrir';
      openBtn.addEventListener('click', () => openTicketModal(t.id));
      card.appendChild(title);
      card.appendChild(statusBadge);
      card.appendChild(assignee);
      card.appendChild(openBtn);
      ticketsContainer.appendChild(card);
    });
  }

  /**
   * Opens a ticket in the detail modal, populating its information and messages.
   * @param {string} id
   */
  async function openTicketModal(id) {
    currentTicketId = id;
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        headers: authHeaders({})
      });
      if (!res.ok) throw new Error('Falha ao obter ticket');
      const t = await res.json();
      // Populate fields
      modalTitle.textContent = t.title;
      modalNumber.textContent = `Número: ${t.number}`;
      modalRequester.textContent = `Solicitante: ${t.requester_name} (${t.requester_email})`;
      modalDescription.textContent = t.description;
      statusSelect.value = t.status;
      assigneeInput.value = t.assignee_id || '';
      // Messages
      messagesList.innerHTML = '';
      (t.messages || []).forEach((m) => {
        const li = document.createElement('li');
        const date = new Date(m.created_at);
        const formatted = date.toLocaleString();
        li.textContent = `[${formatted}] ${m.author_id.substring(0, 8)}: ${m.body}`;
        messagesList.appendChild(li);
      });
      // Attachments
      attachmentsList.innerHTML = '';
      (t.attachments || []).forEach((a) => {
        const li = document.createElement('li');
        li.textContent = a.filename;
        attachmentsList.appendChild(li);
      });
      ticketModal.hidden = false;
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir ticket');
    }
  }

  /**
   * Hides any open modal
   */
  function closeModal(modal) {
    modal.hidden = true;
  }

  // Event listeners for closing modals
  closeTicketModalBtn.addEventListener('click', () => closeModal(ticketModal));
  closeCommentModalBtn.addEventListener('click', () => closeModal(commentModal));
  closeNewTicketModalBtn.addEventListener('click', () => closeModal(newTicketModal));

  /**
   * Update ticket status via PATCH
   */
  updateStatusBtn.addEventListener('click', async () => {
    const status = statusSelect.value;
    if (!currentTicketId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${currentTicketId}/status`, {
        method: 'PATCH',
        headers: authHeaders({}),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
      await loadTickets();
      alert('Status atualizado');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status');
    }
  });

  /**
   * Update ticket assignee via PATCH
   */
  assignBtn.addEventListener('click', async () => {
    const assignee_id = assigneeInput.value.trim() || null;
    if (!currentTicketId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${currentTicketId}/assignee`, {
        method: 'PATCH',
        headers: authHeaders({}),
        body: JSON.stringify({ assignee_id }),
      });
      if (!res.ok) throw new Error('Falha ao atribuir responsável');
      await loadTickets();
      alert('Responsável atualizado');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar responsável');
    }
  });

  /**
   * Show comment modal
   */
  addCommentBtn.addEventListener('click', () => {
    commentBodyInput.value = '';
    commentModal.hidden = false;
  });

  /**
   * Submit a new comment (message) to the current ticket
   */
  submitCommentBtn.addEventListener('click', async () => {
    const body = commentBodyInput.value.trim();
    if (!body) return;
    const author_id = localStorage.getItem('user_id');
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${currentTicketId}/messages`, {
        method: 'POST',
        headers: authHeaders({}),
        body: JSON.stringify({ author_id, body }),
      });
      if (!res.ok) throw new Error('Falha ao adicionar comentário');
      // reload details
      await openTicketModal(currentTicketId);
      commentModal.hidden = true;
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar comentário');
    }
  });

  /**
   * Upload attachment to the current ticket
   */
  uploadAttachmentBtn.addEventListener('click', async () => {
    const file = attachmentInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${currentTicketId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Falha ao enviar anexo');
      // reload details
      await openTicketModal(currentTicketId);
      // clear input
      attachmentInput.value = '';
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar anexo');
    }
  });

  /**
   * Show new ticket modal
   */
  newTicketBtn.addEventListener('click', () => {
    newTitleInput.value = '';
    newDescInput.value = '';
    newNameInput.value = '';
    newEmailInput.value = '';
    newTicketModal.hidden = false;
  });

  /**
   * Create a new ticket via POST
   */
  createTicketBtn.addEventListener('click', async () => {
    const title = newTitleInput.value.trim();
    const description = newDescInput.value.trim();
    const requester_name = newNameInput.value.trim();
    const requester_email = newEmailInput.value.trim();
    if (!title || !description || !requester_name || !requester_email) {
      alert('Preencha todos os campos');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: authHeaders({}),
        body: JSON.stringify({ title, description, requester_name, requester_email }),
      });
      if (!res.ok) throw new Error('Falha ao criar ticket');
      await loadTickets();
      newTicketModal.hidden = true;
    } catch (err) {
      console.error(err);
      alert('Erro ao criar ticket');
    }
  });

  // Filters change events
  searchInput.addEventListener('input', () => {
    // Debounce search: small timeout to avoid many requests
    clearTimeout(searchInput._debounce);
    searchInput._debounce = setTimeout(loadTickets, 300);
  });
  statusFilter.addEventListener('change', loadTickets);

  // Initial load
  loadTickets();
});