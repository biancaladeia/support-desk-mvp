// frontend/login.js
const API_BASE_URL = 'http://localhost:9000';

function ensureDebugUI() {
  // cria um painel de debug visível na página
  let panel = document.getElementById('sd-debug-panel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'sd-debug-panel';
  panel.style.position = 'fixed';
  panel.style.right = '16px';
  panel.style.bottom = '16px';
  panel.style.zIndex = '9999';
  panel.style.width = '360px';
  panel.style.maxWidth = '90vw';
  panel.style.background = '#ffffff';
  panel.style.border = '1px solid #e0e0e0';
  panel.style.borderRadius = '12px';
  panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  panel.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
  panel.style.fontSize = '12px';
  panel.style.color = '#333';
  panel.style.padding = '12px';

  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px">Debug (front)</div>
    <div><b>API_BASE_URL:</b> <code id="dbg-api">${API_BASE_URL}</code></div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="dbg-health" style="padding:6px 8px;border:1px solid #ddd;border-radius:8px;background:#f7f7ff;cursor:pointer">Testar /health</button>
      <button id="dbg-close"  style="padding:6px 8px;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;cursor:pointer">Fechar</button>
    </div>
    <div id="dbg-log" style="margin-top:8px;max-height:160px;overflow:auto;white-space:pre-wrap;background:#fafafa;border:1px dashed #eee;border-radius:8px;padding:8px"></div>
    <div style="margin-top:8px">
      <div style="font-weight:600;margin-bottom:4px">Entrar colando token</div>
      <input id="dbg-token" placeholder="cole aqui seu JWT" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ddd;border-radius:8px" />
      <button id="dbg-use-token" style="margin-top:6px;padding:6px 8px;border:1px solid #ddd;border-radius:8px;background:#eefbea;cursor:pointer">Usar token e ir para Home</button>
    </div>
  `;
  document.body.appendChild(panel);

  const log = (msg) => {
    const box = document.getElementById('dbg-log');
    box.textContent += (box.textContent ? '\n' : '') + msg;
    box.scrollTop = box.scrollHeight;
  };

  document.getElementById('dbg-health').onclick = async () => {
    try {
      log(`→ GET ${API_BASE_URL}/health`);
      const r = await fetch(`${API_BASE_URL}/health`);
      const t = await r.text();
      log(`← ${r.status}\n${t}`);
    } catch (e) {
      log(`ERR health: ${e && e.message ? e.message : e}`);
    }
  };
  document.getElementById('dbg-close').onclick = () => panel.remove();
  document.getElementById('dbg-use-token').onclick = () => {
    const t = document.getElementById('dbg-token').value.trim();
    if (!t) { log('Informe um token.'); return; }
    localStorage.setItem('sd_token', t);
    location.href = 'home.html';
  };

  // primeira linha de log
  log('Painel iniciado. Clique em "Testar /health" para checar conexão com o backend.');
  return panel;
}

document.addEventListener('DOMContentLoaded', () => {
  // garante debug na tela
  ensureDebugUI();

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const errorDiv = document.getElementById('error');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  const showError = (msg) => {
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }
    const box = document.getElementById('dbg-log');
    if (box) {
      box.textContent += (box.textContent ? '\n' : '') + `ERRO: ${msg}`;
    }
  };

  if (!form) {
    showError('Formulário de login não encontrado no HTML.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorDiv) errorDiv.style.display = 'none';

    const email = (emailInput && emailInput.value || '').trim();
    if (!email) return showError('Informe um e-mail.');
    if (submitBtn) submitBtn.disabled = true;

    const log = (m) => {
      const box = document.getElementById('dbg-log');
      if (box) { box.textContent += (box.textContent ? '\n' : '') + m; box.scrollTop = box.scrollHeight; }
    };

    try {
      log(`→ POST ${API_BASE_URL}/auth/login`);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const raw = await res.text();
      log(`← ${res.status}\n${raw}`);

      if (res.status === 401) { showError('Usuário não encontrado.'); return; }
      if (!res.ok) { showError(`Falha ao autenticar (HTTP ${res.status}).`); return; }

      let data = {};
      try { data = JSON.parse(raw); } catch {}
      const token = data.token || data.access_token;
      if (!token) { showError('Resposta inválida do servidor (sem token).'); return; }

      localStorage.setItem('sd_token', token);
      location.href = 'home.html';
    } catch (err) {
      showError('Erro de rede. Verifique se o backend está em http://localhost:9000');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
