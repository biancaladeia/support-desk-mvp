// Front‑end logic for Support Desk.
//
// This script detects which page is loaded via the `data-page` attribute on
// the <body> and runs the appropriate initializer. It has been updated
// to support e‑mail + password authentication. The helper `doLogin`
// posts both fields to `/auth/login` and stores the returned JWT. The
// previous behaviour of logging in with only an e‑mail address has been
// removed.

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
 * Generic helper for API calls. Adds the JWT header when available and
 * automatically redirects to the login page when the response status
 * indicates an authentication failure.
 *
 * @param {string} path   Relative API path (e.g. `/tickets`)
 * @param {object} options Fetch options (method, headers, body)
 */
async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};
  // Define content-type only if sending JSON as a string
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
 * Authenticate the user via e‑mail and password and persist the returned token.
 *
 * @param {string} email
 * @param {string} password
 */
async function doLogin(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (data && data.token) {
    setToken(data.token);
    return data.token;
  }
  throw new Error('Token não retornado');
}

/**
 * Obtain the authenticated user via /me and return an object {user_id, role}.
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

// Additional functions for ticket management remain unchanged from the
// original implementation (loadTickets, statusLabel, openTicketModal,
// initTicketsPage, etc.). Copy them from the original repository as
// needed. The login changes above do not affect those functions.

/**
 * Initialize the login page: bind the form submission to call doLogin.
 */
function initLoginPage() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return;
    try {
      await doLogin(email, password);
      window.location.href = 'tickets.html';
    } catch (err) {
      alert('Erro ao efetuar login: ' + err.message);
    }
  });
}

// Initialize the appropriate page once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') initLoginPage();
  // if (page === 'tickets') initTicketsPage();  // defined in original implementation
});