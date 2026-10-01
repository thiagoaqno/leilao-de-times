// Tiro da Galera — FPS de arena x1 ou x2 com AK-47 e AWP, em rodadas como no CS. Canal "/tiro" do Socket.io.
// Cada navegador roda o movimento do próprio boneco e manda a posição (~30 vezes por segundo); o servidor junta todo
// mundo num pacote só e manda 20 vezes por segundo (poucos pacotes pequenos: gasta bem menos internet).
// Os tiros são conferidos AQUI: o servidor guarda o último segundo de posições de cada um e "volta no tempo"
// (compensação de lag) para ver onde o alvo estava na tela de quem atirou, testando paredes, cabeça, corpo e pernas.
// Quem decide dano, morte, rodada e placar é o servidor.
const crypto = require("crypto");
const A = require("./public/tiro/arena.js");

const FREEZE_MS = 4000, ROUND_MS = 100000, END_MS = 4500, INTERP_MS = 100, MAX_REWIND_MS = 300, HIST_MS = 1000;
const NAMES = { A: "Azul", B: "Laranja" };
const WIDX = ["ak", "awp", "deagle", "faca"]; // número da arma no pacote
// munição de cada arma do jogador (principal e Deagle; a faca não gasta) e volta para a principal
function refill(p) {
  p.ammo = {};
  for (const w of [p.w, "deagle"]) p.ammo[w] = { mag: A.WEAPONS[w].mag, res: A.WEAPONS[w].reserve };
  p.cur = p.w; p.reloadUntil = 0;
}
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

module.exports = function attachTiro(io) {
  const nsp = io.of("/tiro");
  const rooms = new Map();

  function newCode() {
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => L[Math.floor(Math.random() * L.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  const cleanConfig = (c = {}) => ({
    size: int(c.size, 1) === 2 ? 2 : 1,
    rounds: [3, 5, 8].includes(int(c.rounds, 5)) ? int(c.rounds, 5) : 5,
  });
  const teamOf = (room, t) => room.order.map((id) => room.players[id]).filter((p) => p.team === t);
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }

  function publicState(room) {
    const r = room.round;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, score: room.score,
      round: r ? { n: r.n, phase: r.phase, freezeUntil: r.freezeUntil, endsAt: r.endsAt, nextAt: r.nextAt, winner: r.winner, reason: r.reason } : null,
      winner: room.winner || null,
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, n: p.n, name: p.name, team: p.team, hp: p.hp, alive: p.alive, w: p.w, cur: p.cur, kills: p.kills, deaths: p.deaths, hs: p.hs, dmg: p.dmgDone,
          ping: p.rtt == null ? null : Math.round(p.rtt), online: p.sockets.size > 0, spawn: p.spawn };
      }),
      kills: room.kills.slice(-6), feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- partida e rodadas ----------
  function startMatch(room) {
    room.phase = "play"; room.score = { A: 0, B: 0 }; room.winner = null; room.kills = [];
    for (const id of room.order) Object.assign(room.players[id], { kills: 0, deaths: 0, hs: 0, dmgDone: 0 });
    log(room, `🔫 Partida começou: primeiro a ${room.config.rounds} rodadas vence.`);
    startRound(room, 1);
    clearInterval(room.net);
    room.net = setInterval(() => sendSnap(room), 50);
  }
  function startRound(room, n) {
    clearTimeout(room.timer);
    const now = Date.now();
    room.round = { n, phase: "freeze", freezeUntil: now + FREEZE_MS, endsAt: now + FREEZE_MS + ROUND_MS, nextAt: null, winner: null, reason: null };
    for (const t of ["A", "B"]) teamOf(room, t).forEach((p, i) => {
      const s = A.SPAWNS[t][i % A.SPAWNS[t].length];
      Object.assign(p, { hp: 100, alive: p.sockets.size > 0, spawn: s, pos: { x: s[0], y: s[1], z: s[2], yaw: s[3], pitch: 0 }, hist: [], lastShot: 0 });
      refill(p);
    });
    room.timer = setTimeout(() => { room.round.phase = "live"; checkRound(room); if (room.round.phase !== "live") return; broadcast(room); room.timer = setTimeout(() => endRound(room, null, "tempo"), ROUND_MS); }, FREEZE_MS);
  }
  function endRound(room, winner, reason) {
    const r = room.round;
    if (!r || r.phase === "end") return;
    clearTimeout(room.timer);
    if (reason === "tempo") { // acabou o tempo: quem tem mais gente viva; empatou, quem tem mais vida somada
      const alive = (t) => teamOf(room, t).filter((p) => p.alive), hp = (t) => alive(t).reduce((s, p) => s + p.hp, 0);
      const a = alive("A").length, b = alive("B").length;
      winner = a !== b ? (a > b ? "A" : "B") : hp("A") !== hp("B") ? (hp("A") > hp("B") ? "A" : "B") : null;
    }
    r.phase = "end"; r.winner = winner; r.reason = reason; r.nextAt = Date.now() + END_MS;
    if (winner) room.score[winner]++;
    log(room, winner ? `Rodada ${r.n}: time ${NAMES[winner]} venceu${reason === "tempo" ? " no tempo" : ""}.` : `Rodada ${r.n}: empate.`);
    const champ = ["A", "B"].find((t) => room.score[t] >= room.config.rounds);
    room.timer = setTimeout(() => {
      if (champ) { room.phase = "over"; room.winner = champ; log(room, `🏆 Time ${NAMES[champ]} venceu a partida!`); broadcast(room); }
      else { startRound(room, r.n + 1); broadcast(room); }
    }, END_MS);
    broadcast(room);
  }
  function checkRound(room) {
    const r = room.round;
    if (room.phase !== "play" || !r || r.phase === "end") return;
    const a = teamOf(room, "A").some((p) => p.alive), b = teamOf(room, "B").some((p) => p.alive);
    if (!a || !b) endRound(room, a ? "A" : b ? "B" : null, "eliminação");
  }

  // pacote com todo mundo vivo: [n, x, y, z, yaw, pitch, arma, mira, chão + 2*andando devagar] (números com 2 casas)
  function sendSnap(room) {
    if (room.phase !== "play") { clearInterval(room.net); room.net = null; return; }
    const q = (v) => Math.round(v * 100) / 100;
    const p = room.order.map((id) => room.players[id]).filter((x) => x.alive && x.team && x.sockets.size && x.net)
      .map((x) => [x.n, q(x.pos.x), q(x.pos.y), q(x.pos.z), q(x.pos.yaw), q(x.pos.pitch), Math.max(0, WIDX.indexOf(x.cur)), x.net.sc, x.net.g | (x.net.wk << 1)]);
    if (p.length) nsp.to(room.code).volatile.emit("snap", { t: Date.now(), p });
  }

  // onde o alvo estava `t` ms atrás (interpolando o histórico)
  function posAt(p, t) {
    const h = p.hist;
    if (!h.length) return p.pos;
    if (t >= h[h.length - 1].t) return h[h.length - 1];
    for (let i = h.length - 1; i > 0; i--) {
      const b = h[i], a = h[i - 1];
      if (a.t <= t) { const k = (t - a.t) / Math.max(1, b.t - a.t); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }; }
    }
    return h[0];
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
      const team = a <= b && a < size ? "A" : b < size ? "B" : null; // sobrou? fica no banco esperando vaga
      room.players[id] = { id, n: room.seq++, name, token: rid(), team, w: "ak", hp: 100, alive: false, kills: 0, deaths: 0, hs: 0, dmgDone: 0,
        pos: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, hist: [], cur: "ak", ammo: {}, reloadUntil: 0, lastShot: 0, rtt: null, sockets: new Set() };
      refill(room.players[id]);
      room.order.push(id);
      return room.players[id];
    }
    const cleanName = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: newCode(), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], seq: 0, score: { A: 0, B: 0 }, round: null, kills: [], feed: [], t: Date.now() };
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
      if (room.order.length >= 10) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name);
      if (room.phase !== "lobby") p.team = null; // partida rolando: entra no banco
      bind(room, p.id);
      log(room, `${name} entrou na arena.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    // relógio: o navegador acerta o relógio dele com o do servidor
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "team") {
          if (!me || playing) return "Só dá para trocar de time fora da partida.";
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (t && t !== me.team && teamOf(room, t).length >= room.config.size) return `O time ${NAMES[t]} está cheio.`;
          me.team = t; return;
        }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora da partida.";
          room.config = cleanConfig(data.config);
          for (const t of ["A", "B"]) teamOf(room, t).slice(room.config.size).forEach((p) => { p.team = null; });
          return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora da partida.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da arena.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador começa a partida.";
          if (!teamOf(room, "A").length || !teamOf(room, "B").length) return "Precisa de pelo menos 1 jogador em cada time.";
          startMatch(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearTimeout(room.timer); clearInterval(room.net); room.net = null; room.phase = "lobby"; room.round = null; return;
        }
        if (!me) return "Você está só assistindo.";
        if (type === "weapon") { // arma principal (AK ou AWP): só no começo da rodada (no "tempo de compra")
          if (!["ak", "awp"].includes(data.w)) return "Arma inválida.";
          if (playing && room.round && room.round.phase !== "freeze") return "Só dá para trocar de arma no começo da rodada.";
          me.w = data.w; refill(me);
          return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    // minha posição (~30 por segundo): guarda no histórico e repassa para os outros
    socket.on("st", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "play" || !me.alive || !me.team) return;
      const x = d.x, y = d.y, z = d.z, yaw = d.yaw, pitch = d.pitch;
      if (![x, y, z, yaw, pitch].every(fin)) return;
      const now = Date.now();
      const r = room.round, frozen = r && r.phase === "freeze";
      const pos = frozen && me.spawn
        ? { x: me.spawn[0], y: me.spawn[1], z: me.spawn[2] }
        : { x: clamp(x, -A.HALF_X, A.HALF_X), y: clamp(y, 0, 8), z: clamp(z, -A.HALF_Z, A.HALF_Z) };
      Object.assign(me.pos, pos, { yaw, pitch: clamp(pitch, -1.6, 1.6) });
      me.hist.push({ t: now, ...pos });
      while (me.hist.length && me.hist[0].t < now - HIST_MS) me.hist.shift();
      me.net = { sc: clamp(int(d.sc, 0), 0, 2), g: d.g ? 1 : 0, wk: d.wk ? 1 : 0 }; // vai no próximo pacote
    });

    // troca de arma na mão (1 principal, 2 Deagle, 3 faca): a qualquer hora
    socket.on("cur", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || ![me.w, "deagle", "faca"].includes(d.w)) return;
      me.cur = d.w; me.reloadUntil = 0;
    });

    socket.on("reload", () => {
      const { room, me } = ctx();
      if (!room || !me || !me.alive) return;
      const W = A.WEAPONS[me.cur], a = me.ammo[me.cur], now = Date.now();
      if (W.melee || !a || me.reloadUntil > now || a.mag >= W.mag || a.res <= 0) return;
      me.reloadUntil = now + W.reload * 1000 - 150; // um pouco de folga para a internet
      socket.to(room.code).emit("reload", { id: me.id });
    });

    socket.on("fire", (d = {}) => {
      const { room, me } = ctx();
      const r = room && room.round;
      if (!room || !me || !me.alive || !me.team || room.phase !== "play" || !r || r.phase !== "live") return;
      const w = me.cur, W = A.WEAPONS[w], a = me.ammo[w], now = Date.now(), heavy = !!(W.melee && d.heavy);
      // terminou de recarregar?
      if (a && me.reloadUntil && me.reloadUntil <= now) { const n = Math.min(W.mag - a.mag, a.res); a.mag += n; a.res -= n; me.reloadUntil = 0; }
      if (!W.melee && (me.reloadUntil > now || !a || a.mag <= 0)) return;
      if (now - me.lastShot < (heavy ? W.heavyInterval : W.interval) * 1000 * 0.75) return; // cadência (com folga para a internet)
      const o = Array.isArray(d.o) ? d.o.map(Number) : null, dir = Array.isArray(d.d) ? d.d.map(Number) : null;
      if (!o || !dir || o.length !== 3 || dir.length !== 3 || ![...o, ...dir].every(fin)) return;
      const len = Math.hypot(...dir); if (len < 0.5) return;
      const dn = dir.map((v) => v / len);
      // a origem tem que estar perto do olho do atirador (senão usa a posição que o servidor conhece)
      const eye = [me.pos.x, me.pos.y + A.EYE, me.pos.z];
      const org = Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) < 1.5 ? o : eye;
      me.lastShot = now; if (a) a.mag--;
      // volta no tempo: o atirador via os outros com atraso de (meio ping + interpolação)
      const back = clamp((me.rtt || 0) / 2 + INTERP_MS, 0, MAX_REWIND_MS);
      const targets = room.order.map((id) => room.players[id]).filter((p) => p.alive && p.team && p.team !== me.team)
        .map((p) => ({ id: p.id, ...posAt(p, now - back) }));
      const hit = A.hitScan(org, dn, targets, W.melee ? W.reach + 0.3 : 200);
      socket.to(room.code).emit("shot", { id: me.id, w, o: org, e: hit.point, n: hit.normal || null, hit: !!hit.id, heavy });
      if (!hit.id) return;
      const v = room.players[hit.id];
      let full = A.damage(w, hit.part, heavy);
      if (W.melee) { // facada pelas costas: a vítima estava de costas para quem atacou
        const vx = -Math.sin(v.pos.yaw), vz = -Math.cos(v.pos.yaw), hl = Math.hypot(dn[0], dn[2]) || 1;
        if ((vx * dn[0] + vz * dn[2]) / hl > 0.4) full = heavy ? 180 : 90;
      }
      const dmg = Math.min(v.hp, full);
      v.hp -= dmg; me.dmgDone += dmg;
      const head = hit.part === "head";
      nsp.to(room.code).emit("hit", { by: me.id, to: v.id, dmg, part: hit.part, p: hit.point, hp: v.hp });
      if (v.hp <= 0) {
        v.alive = false; v.deaths++; me.kills++; if (head) me.hs++;
        room.kills.push({ t: now, by: me.id, to: v.id, w, head });
        if (room.kills.length > 20) room.kills.shift();
        checkRound(room);
      }
      broadcast(room);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) {
        me.sockets.delete(socket.id);
        if (!me.sockets.size && room.phase === "play" && me.alive) { me.alive = false; log(room, `${me.name} caiu da partida.`); checkRound(room); }
      }
      broadcast(room);
    });
  });

  // ping de cada jogador (usado na compensação de lag e mostrado no placar)
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.phase === "lobby" && !room.order.length) continue;
      for (const id of room.order) {
        const p = room.players[id];
        for (const sid of p.sockets) {
          const s = nsp.sockets.get(sid); if (!s) continue;
          const t0 = Date.now();
          s.timeout(2000).emit("png", (err) => { if (!err) { const rtt = Date.now() - t0; p.rtt = p.rtt == null ? rtt : p.rtt * 0.6 + rtt * 0.4; } });
        }
      }
    }
  }, 2000).unref?.();

  // salas paradas há mais de 6 horas somem
  setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) if (now - r.t > 6 * 3600e3) { clearTimeout(r.timer); rooms.delete(code); }
  }, 3600e3).unref?.();
};
