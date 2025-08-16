# Front‑end for Support Desk Service

Este diretório contém uma interface Web mínima (MVP) para o projeto **Support Desk**. A interface é 100 % estática, escrita em HTML, CSS e JavaScript vanilla, e foi pensada para rodar localmente durante o desenvolvimento e também no GitHub Pages para que outras pessoas possam acompanhar o progresso.

## Requisitos

* Navegador moderno (Chrome/Firefox) – o front‑end é totalmente estático.
* Backend rodando em `http://localhost:8000` ou configurado via variável `apiBaseUrl` no JavaScript.

## Estrutura

```
frontend/
├── index.html         — Tela de login
├── tickets.html       — Lista de tickets e criação de novos
├── ticket.html        — (Reservado para futuras melhorias)
├── styles.css         — Paleta de cores e estilos gerais inspirados na Groovoo
├── app.js             — Funções JavaScript utilitárias e lógicas de negócio
└── README.md          — Este arquivo
```

O arquivo `index.html` é a porta de entrada da aplicação. Após o login, o token JWT é armazenado no `localStorage` e o utilizador é redireccionado para `tickets.html`.

## Configuração do Back‑end

Para que o front‑end funcione, o seu back‑end **FastAPI** precisa atender alguns pontos:

1. **CORS**: habilite o middleware `CORSMiddleware` no `FastAPI` para permitir requisições do domínio onde o front‑end está hospedado (por exemplo, `http://127.0.0.1:5500` ou `https://<username>.github.io`).
2. **Login**: a rota `POST /auth/login` deve retornar um token JWT válido. No MVP original, o login aceita apenas um endereço de e‑mail e gera um token para o usuário.
3. **Cadastro opcional**: se desejar permitir que agentes se registrem via front‑end, crie uma rota `POST /auth/register` no back‑end.

## Rodando localmente

Abra o arquivo `index.html` no navegador (pode simplesmente dar duplo‑clique ou servir via `python -m http.server` para evitar restrições de CORS em alguns navegadores). Informe o e‑mail cadastrado e faça login.

O front‑end usa `localStorage` para guardar o token. Caso precise redefinir o token, apague a chave `sd_token` do `localStorage` via DevTools ou pressione o botão “Logout” na página de tickets.

## Deploy no GitHub Pages

Para publicar esta interface no GitHub Pages, coloque o conteúdo da pasta `frontend/` na branch `gh-pages` do seu repositório e habilite as Pages nas configurações. A variável `apiBaseUrl` em `app.js` pode ser alterada para apontar para o endereço público do seu servidor FastAPI.
