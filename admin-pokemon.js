// Painel privado dos times Pokémon dos personagens do Ginásio (/admin/pokemon) e da Pokédex de cada treinador
// (/admin/pokedex: o nível, a experiência, a espécie e o brilhante de cada Pokémon, dar e tirar Pokémon e o nível de
// todos de uma vez). O login e a sessão são os do painel da carreira (admin-carreira.js); cada edição da Pokédex vai
// para a tabela moderacao_pokemon (bd.js).
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const bd = require("./bd.js");
const Lideres = require("./public/galeramon/lideres.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const Niveis = require("./public/galeramon/niveis.js");
const Mato = require("./public/vila/mato.js");
const PREFIXO = "/admin/pokemon", DEX = "/admin/pokedex";
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
  ligarPokedex(app, auth);
  return true;
}

// ---------- a Pokédex dos treinadores ----------
const hashValido = (h) => typeof h === "string" && /^[a-f0-9]{64}$/.test(h);
const inteiro = (v, a, b) => { const n = Number(v); return Number.isSafeInteger(n) && n >= a && n <= b ? n : null; };
// o Pokémon como a Vila mostra (a ficha da Pokédex): o nome, a experiência que falta e a próxima evolução
function ficha(p) {
  const m = PokeDex.MONS[p.bicho], ev = Niveis.evolucaoDe(p.bicho, p.id);
  return { ...p, nome: m ? m.n : p.bicho, num: m ? m.num : 0, sprite: m ? PokeDex.sprite(p.bicho, false) : "", falta: p.nivel >= Niveis.NIVEL_MAX ? 0 : Niveis.faltaParaSubir(p.bicho, p.nivel),
    evolui: ev && PokeDex.MONS[ev.para] ? { para: ev.para, nome: PokeDex.MONS[ev.para].n, nivel: ev.nivel, como: ev.como } : null };
}
// o nível novo pode passar do nível da evolução: com "evoluir", a espécie segue a evolução (até duas fases, como no jogo)
function evoluido(bicho, nivel, id) {
  for (let i = 0; i < 3; i++) { const ev = Niveis.evolucaoDe(bicho, id); if (!ev || nivel < ev.nivel || !PokeDex.MONS[ev.para]) break; bicho = ev.para; }
  return bicho;
}
function detalhe(treinador) {
  return { treinador, nome: bd.nomeDoTreinador(treinador), pokemons: bd.pokemonsDe(treinador).map(ficha), especies: bd.pokedexDe(treinador), historico: bd.historicoPokemon(treinador, 25) };
}
function ligarPokedex(app, auth) {
  app.get(DEX, (req, res) => {
    auth.headers(res);
    if (!auth.sessaoDe(req)) return res.redirect(`/admin/carreira/entrar?destino=${DEX}`);
    res.type("html").send(fs.readFileSync(path.join(__dirname, "admin-pokedex.html"), "utf8"));
  });
  app.get(`${DEX}/api`, auth.exigir, (req, res) => {
    try { res.json({ csrf: req.moderador.csrf, nivelMax: Niveis.NIVEL_MAX, treinadores: bd.treinadoresPokemon(String(req.query.busca || "")), pokemon: PokeDex.IDS.map((id) => ({ id, nome: PokeDex.MONS[id].n, num: PokeDex.MONS[id].num })) }); }
    catch { res.status(503).json({ erro: "Banco indisponível." }); }
  });
  app.get(`${DEX}/api/:treinador`, auth.exigir, (req, res) => {
    if (!hashValido(req.params.treinador)) return res.status(400).json({ erro: "Treinador inválido." });
    try { const d = detalhe(req.params.treinador); return d.pokemons.length || d.especies.length ? res.json(d) : res.status(404).json({ erro: "Treinador não encontrado." }); }
    catch { res.status(503).json({ erro: "Banco indisponível." }); }
  });
  // editar um Pokémon: nível, experiência (do nível), espécie e brilhante; "evoluir" aplica a evolução do nível novo
  app.post(`${DEX}/api/:treinador/pokemon/:id`, express.json({ limit: "2kb" }), auth.exigir, auth.alterar, (req, res) => {
    const t = req.params.treinador, id = inteiro(req.params.id, 1, Number.MAX_SAFE_INTEGER), d = req.body || {};
    if (!hashValido(t) || !id) return res.status(400).json({ erro: "Pokémon inválido." });
    try {
      const atual = bd.capturaPorId(t, id); if (!atual) return res.status(404).json({ erro: "Esse Pokémon não é mais desse treinador." });
      const campos = {};
      if (d.nivel != null) { const n = inteiro(d.nivel, 1, Niveis.NIVEL_MAX); if (n == null) return res.status(400).json({ erro: `O nível vai de 1 a ${Niveis.NIVEL_MAX}.` }); campos.nivel = n; }
      if (d.bicho != null) { if (!Object.hasOwn(PokeDex.MONS, String(d.bicho))) return res.status(400).json({ erro: "Espécie desconhecida." }); campos.bicho = String(d.bicho); }
      if (d.brilhante != null) campos.brilhante = !!d.brilhante;
      const bicho = campos.bicho || atual.bicho, nivel = campos.nivel ?? atual.nivel;
      if (d.evoluir) campos.bicho = evoluido(bicho, nivel, id);
      const final = campos.bicho || atual.bicho, falta = nivel >= Niveis.NIVEL_MAX ? 0 : Niveis.faltaParaSubir(final, nivel);
      if (d.xp != null) { const x = inteiro(d.xp, 0, Math.max(0, falta - 1)); if (x == null) return res.status(400).json({ erro: `A experiência deste nível vai de 0 a ${Math.max(0, falta - 1)}.` }); campos.xp = x; }
      else if (campos.nivel != null && campos.nivel !== atual.nivel) campos.xp = 0;
      else if (atual.xp >= falta) campos.xp = 0;
      if (campos.bicho && campos.bicho !== atual.bicho) campos.raridade = Mato.raridadeDe(campos.bicho) || atual.raridade;
      const p = bd.editarCapturaAdmin(t, id, campos, req.moderador.ator);
      res.json({ ok: true, pokemon: ficha(p), ...detalhe(t) });
    } catch { res.status(503).json({ erro: "Não foi possível salvar no banco." }); }
  });
  // dar um Pokémon ao treinador (entra na Pokédex dele)
  app.post(`${DEX}/api/:treinador/pokemon`, express.json({ limit: "2kb" }), auth.exigir, auth.alterar, (req, res) => {
    const t = req.params.treinador, d = req.body || {}, bicho = String(d.bicho || ""), nivel = inteiro(d.nivel ?? 5, 1, Niveis.NIVEL_MAX);
    if (!hashValido(t)) return res.status(400).json({ erro: "Treinador inválido." });
    if (!Object.hasOwn(PokeDex.MONS, bicho)) return res.status(400).json({ erro: "Escolha uma espécie da lista." });
    if (nivel == null) return res.status(400).json({ erro: `O nível vai de 1 a ${Niveis.NIVEL_MAX}.` });
    try { const p = bd.darPokemonAdmin(t, { bicho, raridade: Mato.raridadeDe(bicho) || "comum", nivel, brilhante: !!d.brilhante }, req.moderador.ator); res.json({ ok: true, pokemon: ficha(p), ...detalhe(t) }); }
    catch { res.status(503).json({ erro: "Não foi possível salvar no banco." }); }
  });
  app.delete(`${DEX}/api/:treinador/pokemon/:id`, auth.exigir, auth.alterar, (req, res) => {
    const t = req.params.treinador, id = inteiro(req.params.id, 1, Number.MAX_SAFE_INTEGER);
    if (!hashValido(t) || !id) return res.status(400).json({ erro: "Pokémon inválido." });
    try { return bd.tirarPokemonAdmin(t, id, req.moderador.ator) ? res.json({ ok: true, ...detalhe(t) }) : res.status(404).json({ erro: "Esse Pokémon não é mais desse treinador." }); }
    catch { res.status(503).json({ erro: "Não foi possível apagar no banco." }); }
  });
  // o nível de todos os Pokémon do treinador de uma vez
  app.post(`${DEX}/api/:treinador/nivel`, express.json({ limit: "1kb" }), auth.exigir, auth.alterar, (req, res) => {
    const t = req.params.treinador, nivel = inteiro((req.body || {}).nivel, 1, Niveis.NIVEL_MAX);
    if (!hashValido(t)) return res.status(400).json({ erro: "Treinador inválido." });
    if (nivel == null) return res.status(400).json({ erro: `O nível vai de 1 a ${Niveis.NIVEL_MAX}.` });
    try { const n = bd.nivelDeTodosAdmin(t, nivel, req.moderador.ator); return n ? res.json({ ok: true, alterados: n, ...detalhe(t) }) : res.status(404).json({ erro: "Treinador sem Pokémon." }); }
    catch { res.status(503).json({ erro: "Não foi possível salvar no banco." }); }
  });
}

module.exports = { attach, carregar, listar };
