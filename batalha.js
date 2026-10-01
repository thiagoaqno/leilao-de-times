// Batalha da Galera — batalha de kart estilo Mario Kart. Canal "/batalha" do Socket.io.
// Cada navegador dirige o próprio kart e manda a posição ~30 vezes por segundo.
// O servidor manda nos ITENS: caixas, cascos, bananas, bombas, balões e pontos (regras em public/batalha/regras.js).
// Ele roda 60 vezes por segundo (robôs, itens, batidas) e manda UM pacote por jogador 20 vezes por segundo.
const crypto = require("crypto");
const R = require("./public/batalha/regras.js");

const TICK = 1 / 60, SNAP_EVERY = 3, READY_MS = 3500, MAX_KARTS = 8;
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BOT_NAMES = ["Robozão", "Tchuco", "Ferrugem", "Parafuso", "Bip-Bop", "Turbinho", "Lataria"];

module.exports = function attachBatalha(io) {
  const nsp = io.of("/batalha");
  const rooms = new Map();

  function newCode() {
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => L[Math.floor(Math.random() * L.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  const cleanConfig = (c = {}) => ({
    minutes: [2, 3, 5].includes(int(c.minutes, 3)) ? int(c.minutes, 3) : 3,
    bots: clamp(int(c.bots, 0), 0, MAX_KARTS - 1),
  });
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }
  const freeColor = (room) => R.COLORS.findIndex((_, i) => !room.order.some((id) => room.players[id].color === i));

  function publicState(room) {
    const m = room.match;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      match: m ? { start: m.start, end: m.end, over: m.over } : null,
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, n: p.n, name: p.name, color: p.color, ping: p.rtt == null ? null : Math.round(p.rtt), online: p.sockets.size > 0 };
      }),
      karts: m ? m.players.map((k) => ({ id: k.id, n: k.n, name: k.name, color: k.color, bot: k.bot, points: k.points, pops: k.pops, hits: k.hits })) : [],
      results: room.results, feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- partida ----------
  function startMatch(room) {
    const list = [];
    room.order.forEach((id) => { const p = room.players[id]; list.push(R.newPlayer(id, p.n, p.name, p.color, list.length)); });
    const used = new Set(list.map((k) => k.color));
    for (let i = 0; i < room.config.bots && list.length < MAX_KARTS; i++) {
      const color = R.COLORS.findIndex((_, c) => !used.has(c)); used.add(color);
      list.push(R.newPlayer("bot" + i, 100 + i, "🤖 " + BOT_NAMES[i], color, list.length, true));
    }
    const now = Date.now();
    room.match = R.newMatch(list, now + READY_MS, room.config.minutes * 60000);
    room.phase = "play"; room.results = null;
    log(room, `🎈 Batalha valendo: ${room.config.minutes} minutos.`);
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK * 1000);
    broadcast(room);
  }
  function endMatch(room) {
    clearInterval(room.loop); room.loop = null;
    const m = room.match;
    room.results = [...m.players].sort((a, b) => b.points - a.points || b.pops - a.pops).map((k) => ({ id: k.id, name: k.name, color: k.color, bot: k.bot, points: k.points, pops: k.pops, hits: k.hits }));
    room.phase = "over";
    const w = room.results[0];
    log(room, w ? `🏆 ${w.name} venceu com ${w.points} ponto${w.points === 1 ? "" : "s"}.` : "Fim da batalha.");
    broadcast(room);
  }
  // o que acontece no jogo vira aviso para todo mundo (sons e animações no navegador)
  function evFor(room) {
    return (type, d) => {
      const m = room.match;
      if (type === "fim") return;
      if (type === "estourou") { const v = m.players.find((k) => k.id === d.to); if (v) v.hits++; }
      if (type === "fantasma") { const k = m.players.find((x) => x.id === d.id), by = m.lastBy; log(room, `👻 ${k ? k.name : "?"} virou fantasma${by ? ` (${by})` : ""} e perdeu ${d.lost} ponto${d.lost === 1 ? "" : "s"}.`); }
      if (type === "estourou" && d.by) { const by = m.players.find((k) => k.id === d.by); m.lastBy = by ? by.name : null; }
      nsp.to(room.code).emit("ev", { type, ...d });
      if (type === "fantasma" || type === "voltou") broadcast(room);
    };
  }
  function tick(room) {
    const m = room.match, now = Date.now();
    if (!m || room.phase !== "play") return;
    const ev = evFor(room);
    if (now >= m.start) {
      for (const k of m.players) {
        if (k.bot) {
          const inp = R.botInput(m, k, now);
          R.moveKart(k, inp, TICK);
          if (inp.fire) R.useItem(m, k, inp.back, now, ev);
        } else { // o navegador mexe o kart; aqui só passam os relógios dos efeitos
          k.spinT = Math.max(0, k.spinT - TICK); k.boostT = Math.max(0, k.boostT - TICK); k.starT = Math.max(0, k.starT - TICK);
        }
        if (!R.ghost(k, now)) for (let i = 0; i < R.BOXES.length; i++) if (R.pickBox(m, k, i, now, ev, k.bot ? 0 : 0.6)) break;
      }
      R.tick(m, now, TICK, ev);
      if (m.over) return endMatch(room);
    }
    room.frame = (room.frame || 0) + 1;
    if (room.frame % SNAP_EVERY === 0) nsp.to(room.code).volatile.emit("snap", { t: now, ...R.snap(m, now) });
    if (room.frame % 60 === 0) broadcast(room); // placar uma vez por segundo
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ok = (cb, extra = {}) => cb && cb({ ok: true, ...extra });
    const fail = (cb, error) => cb && cb({ ok: false, error });
    const ctx = () => {
      const room = socket.data.code && rooms.get(socket.data.code);
      return { room, me: room && socket.data.pid ? room.players[socket.data.pid] : null };
    };
    const kartOf = (room, me) => room && me && room.match && room.match.players.find((k) => k.id === me.id);
    function bind(room, pid) {
      const old = ctx();
      if (old.me) old.me.sockets.delete(socket.id);
      if (old.room) socket.leave(old.room.code);
      socket.data.code = room.code; socket.data.pid = pid;
      socket.join(room.code);
      if (pid) room.players[pid].sockets.add(socket.id);
    }
    function addPlayer(room, name) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), n: room.seq++, name, color: Math.max(0, freeColor(room)), rtt: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    const cleanName = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: newCode(), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], seq: 0, match: null, results: null, feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Arena aberta por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = rooms.get(String(data.code || "").toUpperCase().trim());
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = data.id && room.players[data.id] && room.players[data.id].token === data.token ? room.players[data.id] : null;
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.phase === "play") return fail(cb, "A batalha já começou. Entre para assistir e jogue a próxima.");
      if (room.order.length >= MAX_KARTS) return fail(cb, "A arena está cheia (8 karts). Você pode entrar para assistir.");
      if (Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name);
      room.config.bots = Math.min(room.config.bots, MAX_KARTS - room.order.length);
      bind(room, p.id);
      log(room, `${name} chegou na arena.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "color") {
          const c = int(data.color, -1);
          if (!me || playing || !R.COLORS[c]) return "Cor inválida.";
          if (room.order.some((id) => id !== me.id && room.players[id].color === c)) return "Alguém já está com essa cor.";
          me.color = c; return;
        }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora do jogo.";
          room.config = cleanConfig(data.config);
          room.config.bots = Math.min(room.config.bots, MAX_KARTS - room.order.length);
          return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora do jogo.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da arena.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador começa a batalha.";
          if (room.order.length + room.config.bots < 2) return "Precisa de pelo menos 2 karts (chame alguém ou coloque robôs).";
          startMatch(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearInterval(room.loop); room.loop = null; room.phase = "lobby"; room.match = null; return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    // meu kart (~30 por segundo): x, z, yaw, v e se estou derrapando
    socket.on("st", (d = {}) => {
      const { room, me } = ctx();
      const k = kartOf(room, me);
      if (!k || room.phase !== "play") return;
      const { x, z, yaw, v } = d, now = Date.now();
      if (![x, z, yaw, v].every(fin)) return;
      if (now < room.match.start) return; // parado na largada
      // não deixa "teleportar": no máximo o que um kart com turbo anda desde o último pacote (com folga)
      const dt = Math.min(0.5, (now - (k.lastSt || now - 33)) / 1000) + 0.05, step = R.MAX * 1.8 * dt;
      const dx = x - k.x, dz = z - k.z, dist = Math.hypot(dx, dz);
      const s = dist > step ? step / dist : 1;
      k.x += dx * s; k.z += dz * s; R.collideCircle(k, R.KR * 0.8);
      const g = R.groundAt(k.x, k.z), f = int(d.f, 0); // altura: do chão até um pulo bem alto
      k.y = fin(d.y) ? clamp(d.y, g - 0.5, g + 8) : g; k.air = !!(f & R.FL.air);
      k.yaw = yaw; k.v = clamp(v, -8, R.MAX * 1.8); k.drifting = !!(f & R.FL.drift); k.lastSt = now;
    });

    // usar o item (para trás segurando S)
    socket.on("use", (d = {}) => {
      const { room, me } = ctx();
      const k = kartOf(room, me), now = Date.now();
      if (!k || room.phase !== "play" || now < room.match.start || R.ghost(k, now)) return;
      R.useItem(room.match, k, !!d.back, now, evFor(room));
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  // ping de cada jogador
  setInterval(() => {
    for (const room of rooms.values()) for (const id of room.order) {
      const p = room.players[id];
      for (const sid of p.sockets) {
        const s = nsp.sockets.get(sid); if (!s) continue;
        const t0 = Date.now();
        s.timeout(2000).emit("png", (err) => { if (!err) { const rtt = Date.now() - t0; p.rtt = p.rtt == null ? rtt : p.rtt * 0.6 + rtt * 0.4; } });
      }
    }
  }, 2000).unref?.();

  // salas paradas há mais de 6 horas somem; jogo sem ninguém conectado para
  setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) {
      const anyone = r.order.some((id) => r.players[id].sockets.size);
      if (r.loop && !anyone) { clearInterval(r.loop); r.loop = null; r.phase = "lobby"; r.match = null; }
      if (now - r.t > 6 * 3600e3) { clearInterval(r.loop); rooms.delete(code); }
    }
  }, 60000).unref?.();
};
