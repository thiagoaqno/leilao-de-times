// Festa da Galera — uma sequência de minijogos rápidos (1 a 1,5 min cada), todo mundo jogando junto; a colocação em
// cada um dá moedas e quem tiver mais moedas no fim ganha. Canal "/festa" do Socket.io.
// O servidor roda os minijogos (public/festa/minijogos.js) 30 vezes por segundo e manda um pacote ~20x por segundo.
// Cada minijogo tem três partes: a explicação (7 s), o jogo e o resultado (7 s). Robôs completam a sala.
const F = require("./public/festa/minijogos.js");
const { SKINS } = require("./public/pelada/campo.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js"); // o placar da Noite da Galera

const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TICK = 1 / 30, INTRO_MS = +(process.env.FESTA_INTRO_MS || 7000), RES_MS = +(process.env.FESTA_RES_MS || 7000), MAX = 8;
const ROBOS = [["Robozão", "steve"], ["Tchuco", "pikachu"], ["Ferrugem", "shrek"], ["Parafuso", "naruto"], ["Bip-Bop", "woody"], ["Turbinho", "aranha"], ["Lataria", "cj"]];
const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachFesta(io) {
  const nsp = io.of("/festa");
  const rooms = new Map();
  const cleanConfig = (c = {}) => ({ qtd: [5, 8, 10, 15].includes(int(c.qtd, 8)) ? int(c.qtd, 8) : 8, robos: clamp(int(c.robos, 2), 0, MAX - 1) });
  const humanos = (room) => room.order.length;

  function publicState(room) {
    const f = room.festa;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, now: Date.now(),
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, skin: p.skin, online: p.sockets.size > 0 }; }),
      festa: f ? { lista: f.lista, idx: f.idx, sub: f.sub, ate: f.ate, gente: f.gente, moedas: f.moedas, res: f.res, final: f.final || null } : null,
    };
  }
  const broadcast = (room) => nsp.to(room.code).emit("state", publicState(room));

  function comecar(room) {
    const gente = room.order.map((id) => ({ id, name: room.players[id].name, skin: room.players[id].skin, bot: false }));
    const nb = Math.min(room.config.robos, MAX - gente.length);
    embaralhar(ROBOS.slice()).slice(0, nb).forEach(([n, skin], i) => gente.push({ id: "bot" + i, name: "🤖 " + n, skin, bot: true }));
    room.festa = { lista: embaralhar(F.LISTA.slice()).slice(0, room.config.qtd), idx: 0, sub: "intro", ate: Date.now() + INTRO_MS, gente, moedas: Object.fromEntries(gente.map((g) => [g.id, 0])), primeiros: {}, res: null, m: null };
    room.phase = "festa";
    clearInterval(room.loop); room.loop = setInterval(() => tick(room), TICK * 1000);
  }
  function tick(room) {
    const f = room.festa, agora = Date.now(); if (!f) return;
    if (f.sub === "intro" && agora >= f.ate) { f.m = F.novo(f.lista[f.idx], f.gente.map((g) => g.id)); f.sub = "jogo"; f.seq = 0; broadcast(room); return; }
    if (f.sub === "jogo") {
      const bots = f.gente.filter((g) => g.bot || !room.players[g.id] || room.players[g.id].sockets.size === 0).map((g) => g.id); // quem caiu da internet vira robô até voltar
      const acabou = F.passo(f.m, TICK, bots);
      if (f.m.ev.length) { nsp.to(room.code).emit("ev", f.m.ev); f.m.ev = []; }
      if ((f.seq = (f.seq || 0) + 1) % 2 === 0 || acabou) nsp.to(room.code).volatile.emit("snap", { T: agora, ...F.snap(f.m) });
      if (acabou) {
        const mj = F.MJ[f.m.id], grupos = mj.ranking(f.m), pr = F.premiar(grupos);
        for (const [id, r] of Object.entries(pr)) { f.moedas[id] += r.moedas; if (r.pos === 1) f.primeiros[id] = (f.primeiros[id] || 0) + 1; }
        f.res = { id: f.m.id, grupos, pr, snap: F.snap(f.m) };
        f.sub = "resultado"; f.ate = agora + RES_MS; f.m = null; broadcast(room);
      }
      return;
    }
    if (f.sub === "resultado" && agora >= f.ate) {
      f.idx++;
      if (f.idx >= f.lista.length) return terminar(room);
      f.sub = "intro"; f.ate = agora + INTRO_MS; broadcast(room);
    }
  }
  function terminar(room) {
    const f = room.festa; clearInterval(room.loop); room.loop = null;
    const ordem = f.gente.slice().sort((a, b) => f.moedas[b.id] - f.moedas[a.id] || (f.primeiros[b.id] || 0) - (f.primeiros[a.id] || 0));
    f.final = ordem.map((g) => ({ id: g.id, moedas: f.moedas[g.id], primeiros: f.primeiros[g.id] || 0 }));
    f.sub = "fim"; room.phase = "fim";
    const topo = ordem.filter((g) => f.moedas[g.id] === f.moedas[ordem[0].id] && (f.primeiros[g.id] || 0) === (f.primeiros[ordem[0].id] || 0));
    noite.vitoria("festa", room.code, topo.map((g) => g.name), ordem.filter((g) => !topo.includes(g)).map((g) => g.name));
    broadcast(room);
  }

  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name, skin) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, skin: SKINS[skin] ? skin : "padrao", sockets: new Set() };
      room.order.push(id); room.config.robos = Math.min(room.config.robos, MAX - room.order.length);
      return room.players[id];
    }
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));
    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], festa: null, t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin); room.host = p.id; bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.phase === "festa") return fail(cb, "A festa já começou. Entre para assistir e jogue a próxima.");
      if (room.order.length >= MAX) return fail(cb, "A sala está cheia (8). Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin); bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx(); if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, rolando = room.phase === "festa";
      const err = (() => {
        if (type === "skin") { if (!me || !SKINS[data.skin]) return "Skin inválida."; me.skin = data.skin; return; }
        if (type === "config") { if (!isHost || rolando) return "Só o organizador muda, fora da festa."; room.config = cleanConfig(data.config); room.config.robos = Math.min(room.config.robos, MAX - humanos(room)); return; }
        if (type === "start") { if (!isHost) return "Só o organizador começa."; if (humanos(room) + room.config.robos < 2) return "Precisa de pelo menos 2 jogadores (chame alguém ou coloque robôs)."; comecar(room); return; }
        if (type === "lobby") { if (!isHost) return "Só o organizador."; clearInterval(room.loop); room.loop = null; room.festa = null; room.phase = "lobby"; return; }
        if (type === "kick") { if (!isHost || rolando) return "Só o organizador, fora da festa."; const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido."; for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido"); delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id); return; }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb); broadcast(room);
    });
    // controles da arena (direção e os contadores de pulo/ação) e os toques dos jogos de tela
    socket.on("in", (d = {}) => {
      const { room, me } = ctx(), m = room && room.festa && room.festa.m; if (!m || !me || !m.js[me.id]) return;
      const dx = fin(d.dx) ? clamp(d.dx, -1, 1) : 0, dz = fin(d.dz) ? clamp(d.dz, -1, 1) : 0;
      Object.assign(m.js[me.id].inp, { dx, dz, p: int(d.p, 0), a: int(d.a, 0) });
    });
    socket.on("tela", (d = {}) => {
      const { room, me } = ctx(), m = room && room.festa && room.festa.m; if (!m || !me || !m.js[me.id] || F.MJ[m.id].tipo !== "tela") return;
      if (typeof d.tipo !== "string") return;
      F.MJ[m.id].entrada(m, m.js[me.id], d);
    });
    socket.on("disconnect", () => { const { room, me } = ctx(); if (!room) return; if (me) me.sockets.delete(socket.id); broadcast(room); });
  });
  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => clearInterval(r.loop) });
};
