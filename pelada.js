// Pelada da Galera — futsal 3D do 1x1 ao 3x3, numa quadra com alambrado (a bola nunca sai). Canal "/pelada".
// Cada navegador mexe o próprio jogador e manda a posição ~30 vezes por segundo (como no Tiro da Galera).
// A BOLA é do servidor: ele roda a física (public/pelada/campo.js) 60 vezes por segundo com as posições de todo mundo,
// confere os chutes, conta os gols e manda a bola para todos ~30 vezes por segundo.
const crypto = require("crypto");
const C = require("./public/pelada/campo.js");

const TICK = 1 / 60, READY_MS = 3000, GOAL_MS = 4000, MAX_TEAM = 3;
const SIDES = { A: "Mandante", B: "Visitante" };
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

module.exports = function attachPelada(io) {
  const nsp = io.of("/pelada");
  const rooms = new Map();

  function newCode() {
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => L[Math.floor(Math.random() * L.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  const cleanConfig = (c = {}) => ({
    size: clamp(int(c.size, 2), 1, MAX_TEAM),
    minutes: [3, 5, 8].includes(int(c.minutes, 5)) ? int(c.minutes, 5) : 5,
  });
  const cleanKit = (k, d) => (C.KITS[k] ? k : d);
  const teamOf = (room, t) => room.order.map((id) => room.players[id]).filter((p) => p.team === t);
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }

  function publicState(room) {
    const m = room.match;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, kits: room.kits,
      match: m ? { phase: m.phase, until: m.until, left: Math.max(0, Math.round(m.left)), score: m.score, kickoff: m.kickoff, goals: m.goals.slice(-20) } : null,
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, name: p.name, team: p.team, num: p.num, goals: p.goals, assists: p.assists, shots: p.shots, ping: p.rtt == null ? null : Math.round(p.rtt), online: p.sockets.size > 0, spawn: p.spawn };
      }),
      feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- partida ----------
  function startMatch(room) {
    room.phase = "play";
    room.match = { phase: "ready", until: 0, left: room.config.minutes * 60000, score: { A: 0, B: 0 }, kickoff: 0, goals: [], last: [] };
    for (const id of room.order) Object.assign(room.players[id], { goals: 0, assists: 0, shots: 0 });
    // números das camisas: na ordem em que entraram no time
    for (const t of ["A", "B"]) teamOf(room, t).forEach((p, i) => { p.num = [10, 7, 9][i] || 11 + i; });
    log(room, `⚽ Bola rolando: ${room.config.minutes} minutos.`);
    kickoff(room, Math.random() < 0.5 ? "A" : "B");
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK * 1000);
  }
  // saída de bola: todo mundo no seu campo, bola no meio, 3 segundos parados
  function kickoff(room, kicking) {
    const m = room.match;
    m.phase = "ready"; m.until = Date.now() + READY_MS; m.kickoff++; m.last = [];
    room.ball = C.newBall();
    for (const t of ["A", "B"]) {
      const list = teamOf(room, t), sp = C.spawns(t, list.length, t === kicking);
      list.forEach((p, i) => { p.spawn = sp[i]; p.pos = { x: sp[i][0], y: 0, z: sp[i][2], vx: 0, vy: 0, vz: 0, yaw: sp[i][3], sprint: 0 }; });
    }
    broadcast(room);
  }
  function endMatch(room) {
    const m = room.match;
    clearInterval(room.loop); room.loop = null;
    room.phase = "over"; m.phase = "over";
    const { A, B } = m.score;
    log(room, A === B ? `Fim de jogo: empate em ${A} a ${B}.` : `Fim de jogo: ${SIDES[A > B ? "A" : "B"]} venceu por ${Math.max(A, B)} a ${Math.min(A, B)}.`);
    broadcast(room);
  }
  function goal(room, side) {
    const m = room.match, now = Date.now();
    m.score[side]++;
    // quem fez: o último a encostar. Se foi do outro time, é gol contra. Assistência: o toque anterior, do mesmo time.
    const [lastId, prevId] = m.last;
    const scorer = room.players[lastId], prev = room.players[prevId];
    const own = scorer && scorer.team !== side;
    if (scorer && !own) scorer.goals++;
    const assist = !own && prev && prev !== scorer && prev.team === side ? prev : null;
    if (assist) assist.assists++;
    m.goals.push({ t: now, side, by: scorer ? scorer.id : null, own: !!own, assist: assist ? assist.id : null, at: Math.round((room.config.minutes * 60000 - m.left) / 1000) });
    log(room, `⚽ GOL do ${SIDES[side]}${scorer ? (own ? ` (contra, ${scorer.name})` : ` — ${scorer.name}`) : ""}${assist ? `, passe de ${assist.name}` : ""}.`);
    m.phase = "goal"; m.until = now + GOAL_MS;
    nsp.to(room.code).emit("goal", { side, by: scorer ? scorer.id : null, own: !!own, assist: assist ? assist.id : null });
    broadcast(room);
  }
  function touched(room, id) {
    const m = room.match;
    if (!id || m.last[0] === id) return;
    m.last.unshift(id); m.last.length = Math.min(m.last.length, 3);
  }
  function tick(room) {
    const m = room.match, now = Date.now();
    if (!m || room.phase !== "play") return;
    if (m.phase === "ready") { if (now >= m.until) { m.phase = "live"; broadcast(room); } }
    else if (m.phase === "goal") { if (now >= m.until) { if (m.left <= 0) return endMatch(room); kickoff(room, m.goals[m.goals.length - 1].side === "A" ? "B" : "A"); } }
    if (m.phase === "goal") C.simulate(room.ball, [], TICK); // a bola acaba de rolar na rede
    if (m.phase === "live") {
      m.left -= TICK * 1000;
      const players = room.order.map((id) => room.players[id]).filter((p) => p.team && p.sockets.size)
        .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.pos.vx, vy: p.pos.vy, vz: p.pos.vz, sprint: p.pos.sprint }));
      const r = C.simulate(room.ball, players, TICK);
      if (r.touch) touched(room, r.touch);
      if (r.hit > 2) room.bump = Math.max(room.bump || 0, r.hit);
      const side = C.goalOf(room.ball);
      if (side) goal(room, side);
      else if (m.left <= 0) { m.left = 0; return endMatch(room); }
    }
    // bola para todo mundo, 30 vezes por segundo
    room.frame = (room.frame || 0) + 1;
    if (room.frame % 2 === 0) {
      const b = room.ball, q = (v) => Math.round(v * 1000) / 1000;
      nsp.to(room.code).volatile.emit("ball", { t: now, x: q(b.x), y: q(b.y), z: q(b.z), vx: q(b.vx), vy: q(b.vy), vz: q(b.vz), hit: room.bump ? Math.round(room.bump * 10) / 10 : 0 });
      room.bump = 0;
    }
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ok = (cb, extra = {}) => cb && cb({ ok: true, ...extra });
    const fail = (cb, error) => cb && cb({ ok: false, error });
    const ctx = () => {
      const room = socket.data.code && rooms.get(socket.data.code);
      return { room, me: room && socket.data.pid ? room.players[socket.data.pid] : null };
    };
    function bind(room, pid) {
      const old = ctx();
      if (old.me) old.me.sockets.delete(socket.id);
      if (old.room) socket.leave(old.room.code);
      socket.data.code = room.code; socket.data.pid = pid;
      socket.join(room.code);
      if (pid) room.players[pid].sockets.add(socket.id);
    }
    function addPlayer(room, name) {
      const id = rid(6), a = teamOf(room, "A").length, b = teamOf(room, "B").length, size = room.config.size;
      const team = room.phase !== "lobby" ? null : a <= b && a < size ? "A" : b < size ? "B" : null; // sobrou? banco
      room.players[id] = { id, name, token: rid(), team, num: 10, goals: 0, assists: 0, shots: 0, lastKick: 0, rtt: null,
        pos: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, sprint: 0 }, spawn: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    const cleanName = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: newCode(), host: null, phase: "lobby", config: cleanConfig(data.config), kits: { A: "corinthians", B: "palmeiras" },
        players: {}, order: [], match: null, ball: C.newBall(), feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Quadra aberta por ${name}.`);
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
      if (room.order.length >= 12) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} chegou na quadra.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "team") {
          if (!me || playing) return "Só dá para trocar de time fora do jogo.";
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (t && t !== me.team && teamOf(room, t).length >= room.config.size) return `O ${SIDES[t]} está cheio.`;
          me.team = t; return;
        }
        if (type === "kit") { // qualquer um do time (ou o organizador) escolhe a camisa
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (!t || playing) return "Só dá para trocar a camisa fora do jogo.";
          if (!isHost && (!me || me.team !== t)) return "Só quem é do time (ou o organizador) troca a camisa.";
          room.kits[t] = cleanKit(data.kit, room.kits[t]); return;
        }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora do jogo.";
          room.config = cleanConfig(data.config);
          for (const t of ["A", "B"]) teamOf(room, t).slice(room.config.size).forEach((p) => { p.team = null; });
          return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora do jogo.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da quadra.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador começa o jogo.";
          if (!teamOf(room, "A").length || !teamOf(room, "B").length) return "Precisa de pelo menos 1 jogador em cada time.";
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

    // minha posição (~30 por segundo): o servidor usa na física da bola e repassa para os outros
    socket.on("st", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || !me.team || room.phase !== "play" || !room.match) return;
      const { x, y, z, vx, vy, vz, yaw } = d;
      if (![x, y, z, vx, vy, vz, yaw].every(fin)) return;
      const m = room.match;
      if (m.phase === "ready" && me.spawn) Object.assign(me.pos, { x: me.spawn[0], y: 0, z: me.spawn[2], vx: 0, vy: 0, vz: 0 }); // parado na saída
      else Object.assign(me.pos, { x: clamp(x, -C.HALF_L, C.HALF_L), y: clamp(y, 0, 3), z: clamp(z, -C.HALF_W, C.HALF_W),
        vx: clamp(vx, -12, 12), vy: clamp(vy, -12, 12), vz: clamp(vz, -12, 12) });
      me.pos.yaw = yaw; me.pos.sprint = d.sp ? 1 : 0;
      socket.to(room.code).volatile.emit("st", { id: me.id, t: Date.now(), x: me.pos.x, y: me.pos.y, z: me.pos.z, vx: me.pos.vx, vz: me.pos.vz, yaw, ch: d.ch ? 1 : 0 });
    });

    // chute: o servidor confere a distância até a bola (com uma folga pela internet) e aplica
    socket.on("kick", (d = {}) => {
      const { room, me } = ctx();
      const m = room && room.match;
      if (!room || !me || !me.team || room.phase !== "play" || !m || m.phase !== "live") return;
      const now = Date.now();
      if (now - me.lastKick < C.KICK_CD * 800) return;
      const kind = d.kind === "passe" ? "passe" : "chute";
      if (![d.power, d.yaw, d.pitch].every(fin)) return;
      const slack = clamp(0.25 + (me.rtt || 0) / 1000 * 6, 0.25, 0.8); // a bola anda enquanto o chute viaja
      const how = C.kick(room.ball, me.pos, kind, d.power, d.yaw, clamp(d.pitch, -1, 1), slack);
      if (!how) return;
      me.lastKick = now;
      if (kind === "chute") me.shots++;
      touched(room, me.id);
      nsp.to(room.code).emit("kicked", { id: me.id, kind, how, power: d.power });
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  // ping de cada jogador (para a folga do chute e o placar)
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
