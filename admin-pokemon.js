// Painel privado dos times Pokémon dos personagens do Ginásio.
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const bd = require("./bd.js");
const Lideres = require("./public/galeramon/lideres.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const PREFIXO = "/admin/pokemon";
const padroes = new Map(Lideres.LISTA.map((l) => [l.id, l.times.pokemon.slice()]));
const valido = (time) => Array.isArray(time) && time.length === 3 && new Set(time).size === 3 &&
  time.every((id) => typeof id === "string" && Object.hasOwn(PokeDex.MONS, id));

function carregar() {
  for (const row of bd.timesPokemonGinasio()) {
    const lider = Lideres.de(row.treinador);
    if (!lider) continue;
    try {
      const time = JSON.parse(row.time_json);
      if (valido(time)) lider.times.pokemon = time;
    } catch { /* uma linha antiga inválida não derruba o jogo */ }
  }
}

function listar() {
  const editados = new Map(bd.timesPokemonGinasio().map((r) => [r.treinador, r]));
  return Lideres.LISTA.map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, onde: l.onde,
    cor: l.cor, time: l.times.pokemon.slice(), padrao: padroes.get(l.id),
    editadoEm: editados.get(l.id)?.atualizado_em || null }));
}

function attach(app) {
  try { carregar(); } catch (e) { console.warn("Times Pokémon do Ginásio indisponíveis:", e.message); }
  // O navegador do Ginásio lê os times em vigor; a edição fica protegida pelo login.
  app.get("/api/ginasio/treinadores-pokemon", (req, res) => {
    try { res.set("Cache-Control", "no-store").json(listar().map(({ id, time }) => ({ id, time }))); }
    catch { res.status(503).json({ erro: "Times indisponíveis." }); }
  });
  const auth = require("./admin-carreira.js").auth();
  if (!auth) return false;
  app.get(PREFIXO, (req, res) => {
    auth.headers(res);
    if (!auth.sessaoDe(req)) return res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Pokémon</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101426;color:#fff;font:16px system-ui}main{max-width:440px;padding:30px}a{display:inline-block;padding:12px 18px;background:#f3c75c;color:#161426;border-radius:12px;font-weight:800;text-decoration:none}</style><main><h1>Admin Pokémon</h1><p>Entre com GitHub para editar os times dos treinadores do Ginásio.</p><a href="/admin/carreira/entrar?destino=/admin/pokemon">Entrar com GitHub</a></main>`);
    res.type("html").send(fs.readFileSync(path.join(__dirname, "admin-pokemon.html"), "utf8"));
  });
  app.get(`${PREFIXO}/api`, auth.exigir, (req, res) => {
    try { res.json({ csrf: req.moderador.csrf, treinadores: listar(), pokemon: PokeDex.IDS.map((id) => ({ id, nome: PokeDex.MONS[id].n, sprite: PokeDex.sprite(id, false) })) }); }
    catch { res.status(503).json({ erro: "Banco indisponível." }); }
  });
  app.post(`${PREFIXO}/api/:id`, express.json({ limit: "2kb" }), auth.exigir, auth.alterar, (req, res) => {
    const lider = Lideres.de(req.params.id), time = req.body?.time;
    if (!lider || !valido(time)) return res.status(400).json({ erro: "Escolha três Pokémon diferentes e válidos." });
    try {
      bd.salvarTimePokemonGinasio(lider.id, time, req.moderador.ator);
      lider.times.pokemon = time.slice();
      res.json({ ok: true, time: lider.times.pokemon });
    } catch { res.status(503).json({ erro: "Não foi possível salvar no banco." }); }
  });
  app.delete(`${PREFIXO}/api/:id`, auth.exigir, auth.alterar, (req, res) => {
    const lider = Lideres.de(req.params.id);
    if (!lider) return res.status(404).json({ erro: "Treinador não encontrado." });
    try {
      bd.reporTimePokemonGinasio(lider.id);
      lider.times.pokemon = padroes.get(lider.id).slice();
      res.json({ ok: true, time: lider.times.pokemon });
    } catch { res.status(503).json({ erro: "Não foi possível restaurar o time." }); }
  });
  return true;
}

module.exports = { attach, carregar, listar };
