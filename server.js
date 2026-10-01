// Leilão de Times — servidor multiplayer (Express + Socket.io)
const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { simulate, FORMATIONS } = require("./simulador.js");
const { cleanPins } = require("./public/escalacao.js");
const Juri = require("./juri.js");
const Ratings = require("./public/ratings.js");
const ALL_FORMATIONS = new Set(["auto", ...Object.keys(FORMATIONS.futsal), ...Object.keys(FORMATIONS.futebol)]);

const app = express();
const server = http.createServer(app);
// compressão das mensagens do WebSocket: os pacotes dos jogos em tempo real se repetem muito e encolhem bastante
const io = new Server(server, { perMessageDeflate: { threshold: 128 } });
require("./banco.js")(io); // Banco da Galera: jogo de tabuleiro, canal /banco
require("./uno.js")(io); // Uno da Galera: jogo de cartas, canal /uno
require("./sinuca.js")(io); // Sinuca da Galera: bola 8, canal /sinuca
require("./truco.js")(io); // Truco da Galera: truco paulista, canal /truco
require("./domino.js")(io); // Dominó da Galera: dominó de dupla, canal /domino
require("./ludo.js")(io); // Ludo da Galera: ludo de 2 a 4 jogadores, canal /ludo
require("./botao.js")(io); // Futebol de Botão da Galera: x1, duplas ou rei do campo, canal /botao
require("./corrida.js")(io); // Corrida da Galera: kart com fantasmas em Mônaco, Interlagos e Tóquio, canal /corrida
require("./vila.js")(io); // Vila da Galera: o lobby em mapinha, canal /vila
require("./tiro.js")(io); // Tiro da Galera: FPS de arena x1 ou x2 com AK-47 e AWP, canal /tiro
require("./pelada.js")(io); // Pelada da Galera: futsal 3D do 1x1 ao 3x3, canal /pelada
app.use(express.static(path.join(__dirname, "public")));
app.get("/leilao", (req, res) => res.redirect("/leilao/"));
app.get("/banco", (req, res) => res.redirect("/banco/"));
app.get("/uno", (req, res) => res.redirect("/uno/"));
app.get("/sinuca", (req, res) => res.redirect("/sinuca/"));
app.get("/truco", (req, res) => res.redirect("/truco/"));
app.get("/domino", (req, res) => res.redirect("/domino/"));
app.get("/ludo", (req, res) => res.redirect("/ludo/"));
app.get("/botao", (req, res) => res.redirect("/botao/"));
app.get("/corrida", (req, res) => res.redirect("/corrida/"));
app.get("/tiro", (req, res) => res.redirect("/tiro/"));
app.get("/pelada", (req, res) => res.redirect("/pelada/"));
app.get("/vendor/marked.js", (req, res) => res.sendFile(require.resolve("marked/marked.min.js")));
app.use("/vendor/three", express.static(path.dirname(require.resolve("three"))));
app.get("/vendor/purify.js", (req, res) => res.sendFile(require.resolve("dompurify/dist/purify.min.js")));

const rooms = new Map(); // code -> room

// ---------- Resultado colado (modo suspense) ----------
// Divide o texto da IA em partes pelos títulos Markdown (## …) para revelar uma de cada vez.
function splitSections(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const levelOf = (l) => { const m = /^(#{1,4})\s+\S/.exec(l); return m ? m[1].length : 0; };
  const counts = {}; lines.forEach((l) => { const v = levelOf(l); if (v) counts[v] = (counts[v] || 0) + 1; });
  let lvl = [1, 2, 3, 4].find((v) => (counts[v] || 0) >= 2) || [1, 2, 3, 4].find((v) => counts[v]);
  let parts = [];
  if (lvl) {
    let cur = [];
    for (const l of lines) {
      const v = levelOf(l);
      if (v && v <= lvl && cur.join("").trim()) { parts.push(cur.join("\n").trim()); cur = []; }
      cur.push(l);
    }
    if (cur.join("").trim()) parts.push(cur.join("\n").trim());
    // um "# Título" isolado no topo gruda na parte seguinte
    if (parts.length > 1 && parts[0].split("\n").filter((x) => x.trim()).length === 1) parts = [parts[0] + "\n\n" + parts[1], ...parts.slice(2)];
  } else {
    // sem títulos: agrupa parágrafos de 3 em 3
    const paras = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    for (let i = 0; i < paras.length; i += 3) parts.push(paras.slice(i, i + 3).join("\n\n"));
  }
  return parts.slice(0, 60);
}
function revealPublic(room) {
  const r = room.reveal;
  // o resumo (para o card do campeão) só vai para os participantes depois que tudo foi revelado
  return { total: r.sections.length, shown: r.shown, sections: r.sections.slice(0, r.shown), summary: r.summary && r.shown >= r.sections.length ? r.summary : null };
}


const str = (v, d, max = 30) => { const t = String(v ?? "").trim().slice(0, max); return t || d; };
function cleanTerms(t = {}) {
  return {
    item: str(t.item, "item"), items: str(t.items, "itens"),
    team: str(t.team, "time"), teams: str(t.teams, "times"),
    prefix: str(t.prefix, "Time"), icon: str(t.icon, "🏆", 8), label: str(t.label, "Personalizado", 40),
    prompt: ["futsal", "futebol", "cs", "valorant", "food", "generic"].includes(t.prompt) ? t.prompt : "generic",
    skin: ["hamburguer", "pizza", "drink", "sobremesa"].includes(t.skin) ? t.skin : null, // desenho montado nos temas de comida
  };
}
function cleanComp(c, perTeam) {
  c = c || {};
  const mode = ["min", "exact"].includes(c.mode) ? c.mode : "free";
  const clean = (o) => { const r = {}; for (const [k, v] of Object.entries(o || {}).slice(0, 12)) { const n = parseInt(v); if (n > 0) r[String(k).slice(0, 30)] = Math.min(n, 11); } return r; };
  const slots = clean(c.slots), req = clean(c.req);
  if (mode === "exact" && Object.values(slots).reduce((a, b) => a + b, 0) !== perTeam) return { mode: "free", slots, req };
  if (mode === "min" && Object.values(req).reduce((a, b) => a + b, 0) > perTeam) return { mode: "free", slots, req };
  if (mode !== "free" && !Object.keys(mode === "exact" ? slots : req).length) return { mode: "free", slots, req };
  return { mode, slots, req };
}
const num = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
  return c;
}

function slotsLeft(room, cap) { return room.config.perTeam - cap.team.length; }
function maxBid(room, cap) {
  return cap.coins - (slotsLeft(room, cap) - 1) * room.config.minBid;
}
function eligible(room) {
  return room.order.map((id) => room.captains[id]).filter((c) => slotsLeft(room, c) > 0);
}

// ---------- Composição (ex.: todo time precisa de 1 goleiro) ----------
// config.comp = { mode: "free" | "min" | "exact", slots: {cat: n}, req: {cat: n} }
// A categoria de cada item vem do texto entre parênteses no fim: "Neuer (Goleiro)".
const catOf = (item) => { const m = /\(([^)]+)\)\s*$/.exec(item); return m ? m[1].trim() : null; };
function countCat(cap, cat) { return cap.team.filter((t) => catOf(t.player) === cat).length; }
function reqOf(room) {
  const c = room.config.comp;
  return c.mode === "exact" ? c.slots : c.mode === "min" ? c.req : {};
}
function missing(room, cap) { // vagas que ainda precisam ir para categorias obrigatórias
  const req = reqOf(room); let n = 0;
  for (const [k, v] of Object.entries(req)) n += Math.max(0, v - countCat(cap, k));
  return n;
}
function canTake(room, cap, item) {
  const left = slotsLeft(room, cap);
  if (left <= 0) return false;
  const comp = room.config.comp;
  if (comp.mode === "free") return true;
  const cat = catOf(item), req = reqOf(room);
  if (comp.mode === "exact" && cat && comp.slots[cat] != null && countCat(cap, cat) >= comp.slots[cat]) return false;
  const helps = cat && req[cat] != null && countCat(cap, cat) < req[cat] ? 1 : 0;
  // item obrigatório escasso: se quem já tem o suficiente pegar, falta para quem ainda precisa
  if (cat && req[cat] != null && !helps) {
    const othersNeed = room.order.reduce((n, id) => { const o = room.captains[id]; return o === cap || slotsLeft(room, o) <= 0 ? n : n + Math.max(0, req[cat] - countCat(o, cat)); }, 0);
    const supply = room.pool.filter((it) => catOf(it) === cat && it !== item).length;
    if (supply < othersNeed) return false;
  }
  return left - 1 >= missing(room, cap) - helps;
}
function takers(room, item) { return room.order.filter((id) => canTake(room, room.captains[id], item)); }

// Public view of the room (sealed bids hidden until reveal)
function view(room, forId) {
  const cur = room.current;
  let current = null;
  if (cur) {
    const revealed = room.phase === "reveal";
    const bids = {};
    for (const id of Object.keys(cur.bids)) {
      bids[id] = revealed || id === forId ? cur.bids[id] : { hidden: true };
    }
    current = { player: cur.player, bids, result: revealed ? cur.result : null, deadline: cur.deadline, eligible: cur.eligible,
      high: cur.high || null, feed: cur.feed || [], passed: cur.passed || {}, finalStretch: !!cur.finalStretch };
  }
  // roleta oculta: até o fim, ninguém recebe os nomes que ainda estão na roleta (só o sorteado)
  const hide = room.config.hidePool && room.phase !== "done";
  const spin = hide && room.spin ? { ...room.spin, names: room.spin.names.map((n, i) => (i === room.spin.index ? n : "?")) } : room.spin;
  return {
    code: room.code,
    phase: room.phase,
    config: room.config,
    poolCount: room.pool.length,
    pool: hide ? room.pool.map(() => "?") : room.pool,
    poolHidden: hide,
    unsold: room.unsold,
    spin,
    captains: room.order.map((id) => {
      const c = room.captains[id];
      return { id, name: c.name, formation: c.formation || "auto", pins: c.pins || {}, coins: c.coins, skipsLeft: c.skipsLeft, team: c.team, connected: c.sockets.size > 0, isHost: id === room.hostCap };
    }),
    current,
    log: room.log.slice(-40),
    now: Date.now(),
    reveal: revealPublic(room),
    judge: judgePublic(room, forId),
  };
}

// votação dos pratos: cada um vê só os próprios votos; dos outros, só quantos pratos já votou
function judgePublic(room, forId) {
  const j = room.judge; if (!j) return null;
  const voted = {}; for (const [id, m] of Object.entries(j.votes)) voted[id] = Object.keys(m).length;
  return { status: j.status, voted, mine: (forId && j.votes[forId]) || {} };
}
const withDish = (room) => room.order.filter((id) => room.captains[id].team.length);

function broadcast(room) {
  for (const id of room.order) {
    for (const sid of room.captains[id].sockets) io.to(sid).emit("state", view(room, id));
  }
  for (const sid of room.hostSockets) {
    if (room.hostCap && room.captains[room.hostCap].sockets.has(sid)) continue;
    io.to(sid).emit("state", view(room, null));
  }
  // quem entrou em "Só assistir"
  for (const sid of room.watchers) if (!room.hostSockets.has(sid)) io.to(sid).emit("state", view(room, null));
}

function log(room, msg) { room.log.push({ t: Date.now(), msg }); }

function checkDone(room) {
  const noOneNeeds = eligible(room).length === 0;
  const nothingFits = !noOneNeeds && !room.pool.some((it) => takers(room, it).length);
  if (noOneNeeds || room.pool.length === 0 || nothingFits) {
    room.phase = "done";
    room.current = null;
    log(room, noOneNeeds ? "Todo mundo completou as vagas. Leilão encerrado!" : nothingFits && room.pool.length ? `Nenhum ${room.config.terms.item} restante serve para as vagas abertas (regra de composição). Leilão encerrado — o organizador pode devolver os sem dono à roleta.` : `Acabaram os ${room.config.terms.items}. Leilão encerrado!`);
    return true;
  }
  return false;
}

function resolve(room) {
  const cur = room.current;
  if (!cur || room.phase !== "bidding") return;
  clearTimeout(cur.timer);
  if (room.config.mode === "open") return resolveOpen(room);
  // timeouts: missing bids -> use skip if available, else minimum bid
  for (const id of cur.eligible) {
    if (cur.bids[id]) continue;
    const c = room.captains[id];
    if (c.skipsLeft > 0) { c.skipsLeft--; cur.bids[id] = { skip: true, auto: true }; }
    else cur.bids[id] = { amount: room.config.minBid, auto: true };
  }
  const offers = cur.eligible.filter((id) => cur.bids[id].amount != null).map((id) => ({ id, amount: cur.bids[id].amount }));
  let result;
  if (offers.length === 0 && cur.finalStretch) {
    result = lottery(room, cur);
  } else if (offers.length === 0) {
    room.unsold.push(cur.player);
    result = { winner: null, amount: 0, tie: false };
    log(room, `${cur.player}: ninguém deu lance. Ficou sem dono.`);
  } else {
    const top = Math.max(...offers.map((o) => o.amount));
    const tied = offers.filter((o) => o.amount === top);
    const w = tied[Math.floor(Math.random() * tied.length)];
    const cap = room.captains[w.id];
    cap.coins -= top;
    cap.team.push({ player: cur.player, price: top });
    result = { winner: w.id, amount: top, tie: tied.length > 1, tiedIds: tied.map((t) => t.id) };
    log(room, `${cur.player} → ${cap.name} por ${top} moeda(s)${tied.length > 1 ? " (empate decidido no sorteio)" : ""}.`);
  }
  cur.result = result;
  room.history.push({ player: cur.player, result, bids: JSON.parse(JSON.stringify(cur.bids)) });
  room.phase = "reveal";
  broadcast(room);
}

// "Reta final": nobody can refuse — if no one bids, a random team with a free slot gets the player for the minimum
function lottery(room, cur) {
  const ids = cur.eligible.filter((id) => canTake(room, room.captains[id], cur.player));
  const id = ids[Math.floor(Math.random() * ids.length)];
  const cap = room.captains[id];
  const amount = room.config.minBid;
  cap.coins -= amount;
  cap.team.push({ player: cur.player, price: amount });
  log(room, `${cur.player}: ninguém deu lance na reta final → sorteado para ${cap.name} por ${amount} moeda(s).`);
  return { winner: id, amount, lottery: true, tie: false };
}

function resolveOpen(room) {
  const cur = room.current;
  let result;
  if (!cur.high && cur.finalStretch) {
    result = lottery(room, cur);
  } else if (!cur.high) {
    room.unsold.push(cur.player);
    result = { winner: null, amount: 0 };
    log(room, `${cur.player}: ninguém deu lance. Ficou sem dono.`);
  } else {
    const cap = room.captains[cur.high.id];
    cap.coins -= cur.high.amount;
    cap.team.push({ player: cur.player, price: cur.high.amount });
    result = { winner: cur.high.id, amount: cur.high.amount };
    log(room, `${cur.player} → ${cap.name} por ${cur.high.amount} moeda(s) (${cur.feed.length} lance${cur.feed.length === 1 ? "" : "s"}).`);
  }
  cur.result = result;
  room.history.push({ player: cur.player, result, bids: {} });
  room.phase = "reveal";
  broadcast(room);
}

// Open mode: a captain is "out" if passed or can no longer outbid the current high
function openOut(room, id) {
  const cur = room.current, c = room.captains[id];
  if (cur.passed[id]) return true;
  if (cur.high && cur.high.id === id) return false;
  const need = cur.high ? cur.high.amount + 1 : room.config.minBid;
  return maxBid(room, c) < need;
}
function openCheckEnd(room) {
  const cur = room.current;
  const rivals = cur.eligible.filter((id) => !(cur.high && cur.high.id === id));
  if (rivals.every((id) => openOut(room, id))) { resolve(room); return true; }
  return false;
}
function openArm(room, ms) {
  const cur = room.current;
  clearTimeout(cur.timer);
  cur.deadline = Date.now() + ms;
  cur.timer = setTimeout(() => { if (room.current === cur && room.phase === "bidding") resolve(room); }, ms);
}

function isHost(room, socket) { return room.hostSockets.has(socket.id); }

io.on("connection", (socket) => {
  let bound = null; // {code, capId}

  const fail = (cb, msg) => cb && cb({ ok: false, error: msg });

  socket.on("create", (data, cb) => {
    try {
      const perTeam = Math.max(1, Math.min(11, num(data.perTeam, 5)));
      const coins = Math.max(1, num(data.coins, 50));
      const skips = Math.max(0, num(data.skips, 1));
      const minBid = Math.max(0, num(data.minBid, 1));
      const mode = data.mode === "open" ? "open" : "secret";
      const timer = mode === "open" ? Math.max(5, Math.min(120, num(data.timer, 15))) : Math.max(0, num(data.timer, 0));
      const players = [...new Set(String(data.players || "").split(/\r?\n/).map((s) => s.trim().slice(0, 60)).filter(Boolean))].slice(0, 400);
      const terms = cleanTerms(data.terms);
      if (players.length < 2) return fail(cb, `Coloque pelo menos 2 ${terms.items} na lista.`);
      if (coins < perTeam * minBid) return fail(cb, `Com lance mínimo ${minBid}, cada participante precisa de pelo menos ${perTeam * minBid} moedas.`);
      const code = newCode();
      const hostToken = rid();
      const room = {
        code, hostToken, hostSockets: new Set([socket.id]), watchers: new Set(), hostCap: null,
        config: { terms, formLock: data.formLock === "locked" ? "locked" : "fluid", comp: cleanComp(data.comp, perTeam), mode, perTeam, coins, skips: mode === "open" ? 0 : skips, minBid, timer, hidePool: !!data.hidePool },
        pool: players, original: players.slice(), unsold: [], captains: {}, order: [], phase: "lobby",
        current: null, spin: null, log: [], history: [],
        reveal: { sections: [], shown: 0 },
      };
      rooms.set(code, room);
      socket.join(code);
      bound = { code, capId: null };
      log(room, "Sala criada.");
      let capToken = null, capId = null;
      if (data.hostPlays && String(data.hostName || "").trim()) {
        capId = rid(6); capToken = rid();
        room.captains[capId] = { name: Array.from(String(data.hostName).trim()).slice(0, 8).join("").trim(), token: capToken, coins, skipsLeft: skips, team: [], sockets: new Set([socket.id]) };
        room.order.push(capId); room.hostCap = capId; bound.capId = capId;
        log(room, `${room.captains[capId].name} entrou (organizador).`);
      }
      cb({ ok: true, code, hostToken, capId, capToken });
      broadcast(room);
    } catch (e) { fail(cb, "Erro ao criar sala."); }
  });

  socket.on("join", (data, cb) => {
    const room = rooms.get(String(data.code || "").toUpperCase().trim());
    if (!room) return fail(cb, "Sala não encontrada. Confira o código.");
    socket.join(room.code);
    // host reconnect
    if (data.hostToken && data.hostToken === room.hostToken) room.hostSockets.add(socket.id);
    // captain reconnect by token
    if (data.capToken) {
      const id = Object.keys(room.captains).find((k) => room.captains[k].token === data.capToken);
      if (id) {
        room.captains[id].sockets.add(socket.id);
        bound = { code: room.code, capId: id };
        cb({ ok: true, code: room.code, capId: id, capToken: data.capToken, host: isHost(room, socket) });
        return broadcast(room);
      }
    }
    if (data.watch || (isHost(room, socket) && !data.name)) {
      bound = { code: room.code, capId: null };
      room.watchers.add(socket.id);
      cb({ ok: true, code: room.code, capId: null, host: isHost(room, socket) });
      return broadcast(room);
    }
    const name = Array.from(String(data.name || "").trim()).slice(0, 8).join("").trim();
    if (!name) return fail(cb, "Digite seu nome.");
    if (room.phase !== "lobby") return fail(cb, "O leilão já começou. Só quem já estava na sala pode voltar.");
    if (Object.values(room.captains).some((c) => c.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já existe alguém com esse nome.");
    const id = rid(6), token = rid();
    room.captains[id] = { name, token, coins: room.config.coins, skipsLeft: room.config.skips, team: [], sockets: new Set([socket.id]) };
    room.order.push(id);
    bound = { code: room.code, capId: id };
    log(room, `${name} entrou na sala.`);
    cb({ ok: true, code: room.code, capId: id, capToken: token, host: isHost(room, socket) });
    broadcast(room);
  });

  socket.on("host", (data, cb) => {
    const room = bound && rooms.get(bound.code);
    if (!room || !isHost(room, socket)) return fail(cb, "Só o organizador pode fazer isso.");
    const a = data.action;
    if (a === "start") {
      if (room.phase !== "lobby") return fail(cb, "O leilão já começou.");
      if (room.order.length < 2) return fail(cb, "Precisa de pelo menos 2 participantes na sala.");
      // shuffle order for display fairness
      room.order.sort(() => Math.random() - 0.5);
      room.phase = "idle";
      log(room, `Leilão começou com ${room.order.length} participantes e ${room.pool.length} ${room.config.terms.items}.`);
    } else if (a === "spin") {
      if (!["idle", "reveal"].includes(room.phase)) return fail(cb, "Espere a rodada atual terminar.");
      if (checkDone(room)) return broadcast(room), cb && cb({ ok: true });
      const fits = room.pool.map((it, i) => i).filter((i) => takers(room, room.pool[i]).length);
      const idx = fits[Math.floor(Math.random() * fits.length)];
      const player = room.pool[idx];
      const openSlots = eligible(room).reduce((n, c) => n + slotsLeft(room, c), 0);
      // reta final: não sobram itens extras no geral, ou não sobram extras desta categoria obrigatória
      const cat = catOf(player), req = reqOf(room);
      const catDemand = cat && req[cat] != null ? room.order.reduce((n, id) => n + Math.max(0, req[cat] - countCat(room.captains[id], cat)), 0) : 0;
      const catLeft = cat ? room.pool.filter((it) => catOf(it) === cat).length : 0;
      const finalStretch = fits.length <= openSlots || (catDemand > 0 && catLeft <= catDemand);
      room.spin = { id: rid(4), names: room.pool.slice(), index: idx, at: Date.now() };
      room.pool.splice(idx, 1);
      const elig = takers(room, player);
      room.current = { player, bids: {}, eligible: elig, result: null, deadline: null, timer: null, high: null, feed: [], passed: {}, finalStretch };
      room.phase = "bidding";
      log(room, `A roleta sorteou: ${player}.${finalStretch ? " (reta final: ninguém pode recusar)" : ""}`);
      const SPIN_MS = 4200;
      if (room.config.mode === "open") {
        openArm(room, SPIN_MS + room.config.timer * 1000);
      } else if (room.config.timer > 0) {
        room.current.deadline = Date.now() + SPIN_MS + room.config.timer * 1000;
        const cur = room.current;
        cur.timer = setTimeout(() => { if (room.current === cur) resolve(room); }, SPIN_MS + room.config.timer * 1000);
      }
    } else if (a === "reveal") {
      if (room.phase !== "bidding") return fail(cb, "Não há lances abertos.");
      return resolve(room), cb && cb({ ok: true });
    } else if (a === "next") {
      if (room.phase !== "reveal") return fail(cb, "Nada para avançar.");
      room.current = null; room.phase = "idle";
      checkDone(room);
    } else if (a === "undo") {
      if (!["reveal", "idle"].includes(room.phase) || !room.history.length) return fail(cb, "Nada para desfazer.");
      const h = room.history.pop();
      room.judge = null; // os pratos mudaram: votação antiga não vale mais
      if (h.result.winner) {
        const c = room.captains[h.result.winner];
        c.coins += h.result.amount;
        c.team = c.team.filter((t) => t.player !== h.player);
      } else room.unsold = room.unsold.filter((p) => p !== h.player);
      for (const [id, b] of Object.entries(h.bids)) if (b.skip) room.captains[id].skipsLeft++;
      room.pool.push(h.player);
      room.current = null; room.phase = "idle";
      log(room, `Desfeito: ${h.player} voltou para a roleta.`);
    } else if (a === "returnUnsold") {
      if (!room.unsold.length) return fail(cb, "Não há nada sem dono.");
      room.pool.push(...room.unsold);
      log(room, `${room.unsold.length} ${room.unsold.length === 1 ? room.config.terms.item : room.config.terms.items} sem dono voltaram para a roleta.`);
      room.unsold = [];
      if (room.phase === "done" && eligible(room).length) room.phase = "idle";
    } else if (a === "kick") {
      if (room.phase !== "lobby") return fail(cb, "Só dá para remover participantes antes de começar.");
      const c = room.captains[data.id];
      if (!c || data.id === room.hostCap) return fail(cb, "Participante inválido.");
      for (const sid of c.sockets) io.to(sid).emit("kicked");
      delete room.captains[data.id];
      room.order = room.order.filter((x) => x !== data.id);
      log(room, `${c.name} foi removido.`);
    } else if (a === "judgeOpen") {
      if (!Juri.SKINS.includes(room.config.terms.skin)) return fail(cb, "Esse tema não tem batalha no site. Use o prompt da IA.");
      if (room.phase !== "done") return fail(cb, "Encerre o leilão antes de abrir a votação.");
      if (withDish(room).length < 2) return fail(cb, "Precisa de pelo menos 2 pratos para ter batalha.");
      room.judge = { status: "voting", votes: {} };
      log(room, "Votação aberta! Cada um dá nota para os pratos dos outros.");
    } else if (a === "judgeClose") {
      if (!room.judge || room.judge.status !== "voting") return fail(cb, "A votação não está aberta.");
      try {
        const { sections, summary } = Juri.julgar(room);
        room.reveal = { sections, shown: 0, summary };
        room.judge.status = "done";
        log(room, `Votação encerrada e pratos julgados (${sections.length} partes). Prepare-se!`);
      } catch (e) { return fail(cb, e.message); }
    } else if (a === "simFootball") {
      if (!room.order.some((id) => room.captains[id].team.length)) return fail(cb, "Ainda não tem time para simular.");
      if (room.reveal.sections.length && room.reveal.shown < room.reveal.sections.length && !data.force) return fail(cb, "Ainda tem resultado sendo revelado.");
      try {
        const { sections, summary } = simulate(room, { sport: data.sport, format: data.format });
        room.reveal = { sections, shown: 0, summary };
        log(room, `Campeonato simulado com as notas do FC 27 (${sections.length} partes). Prepare-se!`);
      } catch (e) { return fail(cb, e.message || "Erro na simulação."); }
    } else if (a === "publish") {
      const text = String(data.text || "").slice(0, 80000).trim();
      if (text.length < 20) return fail(cb, "Cole a resposta da IA antes de publicar.");
      const sections = splitSections(text);
      room.reveal = { sections, shown: 0 };
      log(room, `Resultado publicado em ${sections.length} partes. Prepare-se!`);
    } else if (a === "revealNext" || a === "revealAll" || a === "revealPrev") {
      const r = room.reveal;
      if (!r.sections.length) return fail(cb, "Nenhum resultado publicado.");
      r.shown = a === "revealAll" ? r.sections.length : a === "revealPrev" ? Math.max(0, r.shown - 1) : Math.min(r.sections.length, r.shown + 1);
    } else if (a === "revealClear") {
      room.reveal = { sections: [], shown: 0 };
    } else if (a === "reset") {
      // recomeça o leilão com os mesmos participantes, a mesma lista e as mesmas regras
      if (room.current) clearTimeout(room.current.timer);
      room.pool = room.original.slice();
      room.unsold = []; room.current = null; room.spin = null; room.history = [];
      room.reveal = { sections: [], shown: 0 };
      for (const id of room.order) { const c = room.captains[id]; c.coins = room.config.coins; c.skipsLeft = room.config.skips; c.team = []; c.pins = {}; }
      room.judge = null;
      room.phase = "lobby";
      log(room, "🔄 O organizador reiniciou o leilão. Moedas, pulos e times zerados; todos os itens voltaram para a roleta.");
    } else if (a === "finish") {
      room.phase = "done"; if (room.current) clearTimeout(room.current.timer); room.current = null;
      log(room, "O organizador encerrou o leilão.");
    } else return fail(cb, "Ação desconhecida.");
    cb && cb({ ok: true });
    broadcast(room);
  });

  socket.on("bid", (data, cb) => {
    const room = bound && rooms.get(bound.code);
    if (!room || !bound.capId) return fail(cb, "Você não é um participante nesta sala.");
    if (room.phase !== "bidding") return fail(cb, "Os lances não estão abertos.");
    const cur = room.current, id = bound.capId, c = room.captains[id];
    if (!cur.eligible.includes(id)) return fail(cb, "Você já completou todas as vagas.");
    if (room.spin && Date.now() - room.spin.at < 3500) return fail(cb, "Espere a roleta parar.");
    if (room.config.mode === "open") {
      if (cur.passed[id]) return fail(cb, "Você já saiu desta disputa.");
      if (data.skip) {
        if (cur.high && cur.high.id === id) return fail(cb, "Você está na frente — não dá para sair agora.");
        cur.passed[id] = true;
        cb && cb({ ok: true });
        if (!openCheckEnd(room)) broadcast(room);
        return;
      }
      if (cur.high && cur.high.id === id) return fail(cb, "Você já tem o maior lance.");
      const amt = parseInt(data.amount);
      const need = cur.high ? cur.high.amount + 1 : room.config.minBid;
      const mx = maxBid(room, c);
      if (!Number.isFinite(amt) || amt < need) return fail(cb, cur.high ? `Precisa cobrir: mínimo ${need}.` : `O lance mínimo é ${need}.`);
      if (amt > mx) return fail(cb, `Seu lance máximo agora é ${mx} (você precisa guardar moedas para as vagas restantes).`);
      cur.high = { id, amount: amt };
      cur.feed.push({ id, amount: amt, t: Date.now() });
      cb && cb({ ok: true });
      if (!openCheckEnd(room)) { openArm(room, room.config.timer * 1000); broadcast(room); }
      return;
    }
    if (cur.bids[id]) return fail(cb, "Você já deu seu lance nesta rodada.");
    if (data.skip) {
      if (c.skipsLeft <= 0) return fail(cb, "Você já usou todos os seus pulos.");
      c.skipsLeft--; cur.bids[id] = { skip: true };
    } else {
      const amt = parseInt(data.amount);
      const mx = maxBid(room, c);
      if (!Number.isFinite(amt) || amt < room.config.minBid) return fail(cb, `O lance mínimo é ${room.config.minBid}.`);
      if (amt > mx) return fail(cb, `Seu lance máximo agora é ${mx} (você precisa guardar moedas para as vagas restantes).`);
      cur.bids[id] = { amount: amt };
    }
    cb && cb({ ok: true });
    if (cur.eligible.every((e) => cur.bids[e])) resolve(room);
    else broadcast(room);
  });

  socket.on("formation", (data, cb) => {
    const room = bound && rooms.get(bound.code);
    if (!room || !bound.capId) return fail(cb, "Você não é um participante nesta sala.");
    if (room.config.formLock === "locked" && room.phase !== "lobby") return fail(cb, "A formação está travada: só dava para escolher antes do leilão começar.");
    const f = String(data.formation || "auto");
    if (!ALL_FORMATIONS.has(f)) return fail(cb, "Formação inválida.");
    room.captains[bound.capId].formation = f;
    log(room, `${room.captains[bound.capId].name} escolheu a formação ${f === "auto" ? "automática" : f}.`);
    cb && cb({ ok: true });
    broadcast(room);
  });

  // posições dos jogadores no campinho: livres até a simulação, mesmo com a formação travada
  socket.on("pins", (data, cb) => {
    const room = bound && rooms.get(bound.code);
    if (!room || !bound.capId) return fail(cb, "Você não é um participante nesta sala.");
    const c = room.captains[bound.capId];
    c.pins = cleanPins(data && data.pins, c.team.map((t) => Ratings.parseItem(t.player).name));
    cb && cb({ ok: true });
    broadcast(room);
  });

  socket.on("vote", (data, cb) => {
    const room = bound && rooms.get(bound.code);
    if (!room || !bound.capId) return fail(cb, "Só participantes votam.");
    const j = room.judge;
    if (!j || j.status !== "voting") return fail(cb, "A votação não está aberta.");
    if (!room.captains[bound.capId].team.length) return fail(cb, "Só quem montou um prato vota.");
    const target = String(data && data.target || ""), score = Math.round(Number(data && data.score));
    if (target === bound.capId) return fail(cb, "Não dá para votar no próprio prato.");
    if (!room.captains[target] || !room.captains[target].team.length) return fail(cb, "Prato inválido.");
    if (!(score >= 1 && score <= 10)) return fail(cb, "A nota vai de 1 a 10.");
    (j.votes[bound.capId] = j.votes[bound.capId] || {})[target] = score;
    cb && cb({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    if (!bound) return;
    const room = rooms.get(bound.code);
    if (!room) return;
    room.hostSockets.delete(socket.id);
    room.watchers.delete(socket.id);
    if (bound.capId && room.captains[bound.capId]) room.captains[bound.capId].sockets.delete(socket.id);
    broadcast(room);
  });
});

// cleanup rooms idle > 12h
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    const last = r.log.length ? r.log[r.log.length - 1].t : 0;
    if (now - last > 12 * 3600e3) rooms.delete(code);
  }
}, 3600e3);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leilão rodando em http://localhost:${PORT}`));
