// Painel privado dos perfis dos pilotos de F1 (/admin/pilotos): ponto de frenagem, agressividade, retomada, zebra, consistência, erro e o resto de
// corrida-estilos.js. O login e a sessão são os do painel da carreira (admin-carreira.js); sem linha no banco, vale o perfil original. O ajuste vale a
// partir da próxima corrida.
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const bd = require("./bd.js");
const Estilos = require("./corrida-estilos.js");
const Pilotos = require("./public/corrida/f1-pilotos-2026.js");
const PREFIXO = "/admin/pilotos";
const piloto = (id) => Pilotos.PILOTOS.find((p) => p.id === id);

function carregar() {
  for (const row of bd.perfisPilotoCorrida()) {
    if (!piloto(row.piloto)) continue;
    try { Estilos.ajustar(row.piloto, JSON.parse(row.perfil_json)); } catch { /* uma linha antiga inválida não derruba o jogo */ }
  }
}
function listar() {
  const editados = new Map(bd.perfisPilotoCorrida().map((r) => [r.piloto, r]));
  return Pilotos.PILOTOS.map((p) => ({ id: p.id, nome: p.nome, sigla: p.sigla, numero: p.numero, equipe: p.equipe, ritmo: p.ritmo, perfil: Estilos.dePiloto(p.id), original: Estilos.original(p.id), editadoEm: editados.get(p.id)?.atualizado_em || null }));
}
function attach(app) {
  try { carregar(); } catch (e) { console.warn("Perfis dos pilotos indisponíveis:", e.message); }
  const auth = require("./admin-carreira.js").auth();
  if (!auth) return false;
  app.get(PREFIXO, (req, res) => {
    auth.headers(res);
    if (!auth.sessaoDe(req)) return res.type("html").send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin dos pilotos</title><body style="font:16px system-ui;background:#101322;color:#f4f0ff;display:grid;place-items:center;min-height:100vh;margin:0"><main><h1>Perfis dos pilotos</h1><p>Entre pela conta do GitHub da moderação.</p><a style="color:#ffcf68" href="/admin/carreira">Entrar pelo painel da carreira</a></main></body></html>');
    res.type("html").send(fs.readFileSync(path.join(__dirname, "admin-pilotos.html"), "utf8"));
  });
  app.get(`${PREFIXO}/api`, auth.exigir, (req, res) => {
    try { res.json({ csrf: req.moderador.csrf, pilotos: listar(), campos: Estilos.CAMPOS, boxes: Estilos.BOXES }); }
    catch { res.status(503).json({ erro: "Banco indisponível." }); }
  });
  app.post(`${PREFIXO}/api/:id`, express.json({ limit: "2kb" }), auth.exigir, auth.alterar, (req, res) => {
    const p = piloto(req.params.id), perfil = Estilos.limpar(req.body?.perfil);
    if (!p || !perfil) return res.status(400).json({ erro: "Use valores de 0 a 1 e um jeito de box válido." });
    try {
      bd.salvarPerfilPilotoCorrida(p.id, perfil, req.moderador.ator);
      Estilos.ajustar(p.id, perfil);
      res.json({ ok: true, perfil: Estilos.dePiloto(p.id) });
    } catch { res.status(503).json({ erro: "Não foi possível salvar no banco." }); }
  });
  app.delete(`${PREFIXO}/api/:id`, auth.exigir, auth.alterar, (req, res) => {
    const p = piloto(req.params.id);
    if (!p) return res.status(404).json({ erro: "Piloto não encontrado." });
    try {
      bd.reporPerfilPilotoCorrida(p.id);
      Estilos.ajustar(p.id, null);
      res.json({ ok: true, perfil: Estilos.dePiloto(p.id) });
    } catch { res.status(503).json({ erro: "Não foi possível restaurar o perfil." }); }
  });
  return true;
}
module.exports = { attach };
