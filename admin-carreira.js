// Painel privado, separado das telas do jogo. A identidade vem do GitHub OAuth.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const ID_MODERADOR = 266817963;
const PREFIXO = "/admin/carreira";
const SESSAO_MS = 8 * 60 * 60 * 1000;
const ESTADO_MS = 10 * 60 * 1000;
const aleatorio = () => crypto.randomBytes(32).toString("base64url");

function attach(app, carreira, opcoes = {}) {
  const clientId = opcoes.clientId ?? process.env.MODERACAO_GITHUB_CLIENT_ID;
  const clientSecret = opcoes.clientSecret ?? process.env.MODERACAO_GITHUB_CLIENT_SECRET;
  const baseUrl = opcoes.baseUrl ?? process.env.MODERACAO_BASE_URL;
  if (!clientId || !clientSecret || !baseUrl) return false;
  const origem = new URL(baseUrl);
  if (!/^https:$/.test(origem.protocol) && !(process.env.NODE_ENV === "test" && origem.hostname === "127.0.0.1"))
    throw new Error("MODERACAO_BASE_URL precisa usar HTTPS.");
  if (origem.pathname !== "/" || origem.search || origem.hash || origem.username || origem.password)
    throw new Error("MODERACAO_BASE_URL precisa ser apenas a origem do site.");
  const callback = `${origem.origin}${PREFIXO}/callback`;
  const seguro = origem.protocol === "https:";
  const buscar = opcoes.fetch || fetch;
  const estados = new Map(), sessoes = new Map();
  const cookie = (nome, valor, maxAge, sameSite) =>
    `${nome}=${encodeURIComponent(valor)}; Path=${PREFIXO}; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}; ${seguro ? "Secure; " : ""}Priority=High`;
  const cookies = (req) => Object.fromEntries(String(req.headers.cookie || "").split(";").map((p) => {
    const i = p.indexOf("=");
    if (i < 0) return ["", ""];
    try { return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))]; } catch { return ["", ""]; }
  }));
  const limpar = () => {
    const agora = Date.now();
    for (const [k, v] of estados) if (v.ate < agora) estados.delete(k);
    for (const [k, v] of sessoes) if (v.ate < agora) sessoes.delete(k);
  };
  const headers = (res) => res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  const sessaoDe = (req) => { limpar(); return sessoes.get(cookies(req).mod_sessao); };
  const exigir = (req, res, next) => {
    headers(res);
    const s = sessaoDe(req);
    if (!s) return res.status(401).json({ erro: "Entre com o GitHub para acessar o painel." });
    req.moderador = s;
    next();
  };
  const alterar = (req, res, next) => {
    if (req.get("Origin") !== origem.origin || req.get("X-CSRF-Token") !== req.moderador.csrf)
      return res.status(403).json({ erro: "Sessão inválida. Recarregue o painel." });
    next();
  };

  app.get(PREFIXO, (req, res) => {
    headers(res);
    if (!sessaoDe(req)) return res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Moderação da carreira</title><style>body{font:18px system-ui;background:#102b29;color:#f7f7ef;min-height:100vh;display:grid;place-items:center;margin:0}main{max-width:440px;padding:32px}a{display:inline-block;background:#ebcf82;color:#102b29;padding:14px 20px;border-radius:8px;font-weight:700;text-decoration:none}</style><main><h1>Moderação da carreira</h1><p>Entre com sua conta do GitHub para gerenciar as salas em andamento.</p><a href="${PREFIXO}/entrar">Entrar com GitHub</a></main></html>`);
    res.type("html").send(fs.readFileSync(path.join(__dirname, "admin-carreira.html"), "utf8"));
  });
  app.get(`${PREFIXO}/entrar`, (req, res) => {
    headers(res);
    limpar();
    if (estados.size > 1000) return res.status(429).send("Tente novamente em alguns minutos.");
    const estado = aleatorio(), verificador = aleatorio();
    estados.set(estado, { ate: Date.now() + ESTADO_MS, verificador });
    res.set("Set-Cookie", cookie("mod_estado", estado, 600, "Lax"));
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("state", estado);
    url.searchParams.set("code_challenge", crypto.createHash("sha256").update(verificador).digest("base64url"));
    url.searchParams.set("code_challenge_method", "S256");
    res.redirect(url.href);
  });
  app.get(`${PREFIXO}/callback`, async (req, res) => {
    headers(res);
    const estado = String(req.query.state || ""), codigo = String(req.query.code || "");
    const estadoSalvo = estados.get(estado);
    estados.delete(estado);
    res.set("Set-Cookie", cookie("mod_estado", "", 0, "Lax"));
    if (!estado || !codigo || !estadoSalvo || estadoSalvo.ate < Date.now() || cookies(req).mod_estado !== estado)
      return res.status(403).send("Login inválido. Volte ao painel e tente novamente.");
    try {
      const troca = await buscar("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: codigo,
          redirect_uri: callback, code_verifier: estadoSalvo.verificador }),
        signal: AbortSignal.timeout(10000),
      });
      if (!troca.ok) throw new Error("Falha na troca do código.");
      const token = (await troca.json()).access_token;
      if (!token) throw new Error("Token ausente.");
      const perfil = await buscar("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "leilao-de-times-moderacao" },
        signal: AbortSignal.timeout(10000),
      });
      if (!perfil.ok) throw new Error("Falha ao ler a conta.");
      const usuario = await perfil.json();
      if (usuario.id !== ID_MODERADOR || usuario.login !== "thiagoaqno") return res.status(403).send("Esta conta não tem acesso à moderação.");
      limpar();
      if (sessoes.size > 1000) return res.status(429).send("Tente novamente em alguns minutos.");
      const sid = aleatorio();
      sessoes.set(sid, { ator: usuario.login, csrf: aleatorio(), ate: Date.now() + SESSAO_MS });
      res.set("Set-Cookie", [cookie("mod_estado", "", 0, "Lax"), cookie("mod_sessao", sid, SESSAO_MS / 1000, "Lax")]);
      res.redirect(PREFIXO);
    } catch { res.status(502).send("Não foi possível entrar pelo GitHub. Tente novamente."); }
  });
  app.get(`${PREFIXO}/api/inicio`, exigir, (req, res) => res.json({ csrf: req.moderador.csrf, salas: carreira.listar() }));
  app.get(`${PREFIXO}/api/salas/:codigo`, exigir, (req, res) => {
    const r = carreira.detalhar(req.params.codigo, String(req.query.clube || ""));
    res.status(!r ? 404 : r.erro ? 400 : 200).json(r || { erro: "Sala não encontrada." });
  });
  app.post(`${PREFIXO}/api/salas/:codigo`, express.json({ limit: "4kb" }), exigir, alterar, (req, res) => {
    if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body))
      return res.status(400).json({ erro: "Edição inválida." });
    const r = carreira.editar(req.params.codigo, req.body, req.moderador.ator);
    res.status(r.erro ? 400 : 200).json(r);
  });
  app.post(`${PREFIXO}/sair`, exigir, alterar, (req, res) => {
    sessoes.delete(cookies(req).mod_sessao);
    res.set("Set-Cookie", cookie("mod_sessao", "", 0, "Lax"));
    res.json({ ok: true });
  });
  return true;
}
module.exports = { attach };
