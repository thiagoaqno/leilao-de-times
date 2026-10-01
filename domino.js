// Dominó da Galera — dominó de dupla (4 jogadores, 7 peças cada), por pontos de batida.
// Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/domino").
// Cada jogador recebe só as próprias peças; dos outros, só quantas têm (no fim da mão, todo mundo vê).
const crypto = require("crypto");
const R = require("./public/domino/regras.js");

const PASS_MS = +process.env.DOMINO_PASS_MS || 1300, HAND_PAUSE = 6000, OFFLINE_MS = 8000;
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tn = (t) => `${t.a}|${t.b}`;

module.exports = function attachDomino(io) {
  const nsp = io.of("/domino");
  const rooms = new Map();

  function newCode() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  function cleanConfig(c = {}) {
    return {
      target: [4, 6, 10].includes(int(c.target, 6)) ? int(c.target, 6) : 6,
      timer: [20, 30, 45].includes(int(c.timer, 30)) ? int(c.timer, 30) : 30,
    };
  }

  // ---------- estado ----------
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const teamOf = (room, id) => room.players[id].team;
  const teamName = (room, t) => room.order.filter((id) => teamOf(room, id) === t).map((id) => nameOf(room, id)).join(" e ");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  const fx = (room, o) => { room.fxSeq = (room.fxSeq || 0) + 1; room.fx.push({ id: room.fxSeq, at: Date.now(), ...o }); if (room.fx.length > 30) room.fx.splice(0, room.fx.length - 30); };

  function publicState(room) {
    const h = room.h, done = room.phase !== "playing";
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, pawn: p.pawn, team: p.team, online: p.sockets.size > 0, count: h ? h.hands[id].length : 0 }; }),
      score: room.score, games: room.games, winner: room.winner ?? null,
      hand: h ? {
        no: h.no, chain: h.chain, ends: R.ends(h.chain), turn: room.phase === "playing" ? room.order[h.turn] : null,
        starter: room.order[h.starter], mustOpen: h.mustOpen, passes: h.passes, result: h.result || null, lastPlay: h.lastPlay || null,
        reveal: done ? h.hands : null, // no fim da mão, todo mundo vê as peças que sobraram
      } : null,
      deadline: room.deadline ? { who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null,
      nextAt: room.nextAt || null, fx: room.fx, log: room.log.slice(-40), now: Date.now(),
    };
  }
  function broadcast(room) {
    armTurn(room);
    room.t = Date.now();
    const pub = publicState(room), h = room.h;
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const pid = s.data.pid;
      s.emit("state", pid && h && h.hands[pid] ? { ...pub, myHand: h.hands[pid] } : pub);
    }
  }

  // ---------- mão ----------
  function startHand(room, starterIdx) {
    const set = shuffle(R.newSet()), hands = {};
    room.order.forEach((id, i) => (hands[id] = set.slice(i * 7, i * 7 + 7).sort((x, y) => x.a - y.a || x.b - y.b)));
    const no = (room.h ? room.h.no : 0) + 1;
    let starter = starterIdx, mustOpen = null;
    if (starter == null) { // primeira mão: começa quem tem a carroça de sena, jogando ela
      starter = room.order.findIndex((id) => hands[id].some((t) => t.a === 6 && t.b === 6));
      mustOpen = hands[room.order[starter]].find((t) => t.a === 6 && t.b === 6).id;
    }
    room.h = { no, hands, chain: null, turn: starter, starter, mustOpen, passes: 0, step: 0 };
    room.phase = "playing"; room.nextAt = null;
    fx(room, { kind: "deal" });
    log(room, `🎲 Mão ${no}: ${nameOf(room, room.order[starter])} começa${mustOpen != null ? " com a carroça de sena (6|6)" : ""}.`);
    autoPass(room);
  }
  function endHand(room, team, pts, why, kind) {
    const h = room.h;
    if (team >= 0) room.score[team] = Math.min(room.config.target, room.score[team] + pts);
    h.result = { team, pts, why, kind };
    fx(room, { kind: "hand", team, pts, name: kind });
    log(room, team >= 0 ? `🏁 ${teamName(room, team)} marcaram ${pts} ${pts > 1 ? "pontos" : "ponto"} (${why}). Placar: ${room.score[0]} × ${room.score[1]}.` : `🤝 ${why}: ninguém marcou.`);
    room.phase = "handEnd";
    if (team >= 0 && room.score[team] >= room.config.target) {
      room.phase = "ended"; room.winner = team; room.games[team]++; room.nextAt = null;
      fx(room, { kind: "game", team });
      log(room, `👑 ${teamName(room, team)} ganharam o jogo!`);
      return;
    }
    room.nextAt = Date.now() + HAND_PAUSE;
    clearTimeout(room.nextTimer);
    room.nextTimer = setTimeout(() => nextHand(room), HAND_PAUSE);
  }
  function nextHand(room) {
    if (room.phase !== "handEnd") return;
    clearTimeout(room.nextTimer);
    startHand(room, room.h.nextStarter);
    broadcast(room);
  }
  const anyoneCan = (room) => room.order.some((id) => R.canPlay(room.h.hands[id], R.ends(room.h.chain)));

  function place(room, pid, tile, side) {
    const h = room.h, e = R.ends(h.chain);
    const hand = h.hands[pid];
    hand.splice(hand.indexOf(tile), 1);
    let placed;
    if (!h.chain) { h.chain = { center: { id: tile.id, a: tile.a, b: tile.b }, L: [], R: [] }; placed = "C"; }
    else {
      const v = side === "L" ? e.l : e.r;
      const t = tile.a === v ? { id: tile.id, a: tile.a, b: tile.b } : { id: tile.id, a: tile.b, b: tile.a }; // a = lado que encosta
      h.chain[side].push(t); placed = side;
    }
    h.mustOpen = null; h.passes = 0; h.step++;
    h.lastPlay = { pid, id: tile.id, side: placed };
    fx(room, { kind: "play", pid, id: tile.id, side: placed });
    const who = nameOf(room, pid);
    if (!hand.length) { // bateu!
      const b = R.batida(tile, e);
      h.nextStarter = room.order.indexOf(pid);
      log(room, `💥 ${who} bateu com ${tn(tile)}${b.pts > 1 ? ` — ${b.name.toUpperCase()}!` : "!"}`);
      return endHand(room, teamOf(room, pid), b.pts, b.pts > 1 ? `${who} bateu de ${b.name.toLowerCase()}` : `${who} bateu`, b.name);
    }
    if (!anyoneCan(room)) { // fechou: menos pontos na mão ganha
      const sum = [0, 0], each = {};
      for (const id of room.order) { each[id] = h.hands[id].reduce((s, t) => s + R.pips(t), 0); sum[teamOf(room, id)] += each[id]; }
      log(room, `🔒 Jogo fechado! Pontos na mão: ${teamName(room, 0)} ${sum[0]} × ${sum[1]} ${teamName(room, 1)}.`);
      const win = sum[0] === sum[1] ? -1 : sum[0] < sum[1] ? 0 : 1;
      // começa a próxima quem tem menos pontos no time vencedor (empate: o próximo de quem começou)
      if (win >= 0) h.nextStarter = room.order.indexOf(room.order.filter((id) => teamOf(room, id) === win).sort((x, y) => each[x] - each[y])[0]);
      else h.nextStarter = (h.starter + 1) % 4;
      return endHand(room, win, 1, win >= 0 ? `jogo fechado, ${sum[win]} contra ${sum[1 - win]} pontos na mão` : "Jogo fechado empatado", "Fechado");
    }
    h.turn = (h.turn + 1) % 4;
    autoPass(room);
  }
  // Quem não tem peça que sirva passa sozinho, com um tempinho para todo mundo ver.
  function autoPass(room) {
    const h = room.h;
    clearTimeout(room.passTimer);
    if (room.phase !== "playing" || !h.chain) return;
    const pid = room.order[h.turn];
    if (R.canPlay(h.hands[pid], R.ends(h.chain))) return;
    h.passing = true;
    const step = h.step;
    room.passTimer = setTimeout(() => {
      if (room.phase !== "playing" || room.h !== h || h.step !== step) return;
      h.passing = false; h.passes++; h.step++;
      fx(room, { kind: "pass", pid });
      log(room, `✊ ${nameOf(room, pid)} passou.`);
      h.turn = (h.turn + 1) % 4;
      autoPass(room);
      broadcast(room);
    }, PASS_MS);
  }

  // ---------- relógio ----------
  function armTurn(room) {
    const h = room.h;
    if (room.phase !== "playing" || !h || h.passing) { clearTimeout(room.turnTimer); room.deadline = null; return; }
    const who = room.order[h.turn], key = `${h.no}|${h.step}`;
    if (room.deadline && room.deadline.key === key) return;
    clearTimeout(room.turnTimer);
    const ms = room.players[who].sockets.size ? room.config.timer * 1000 : OFFLINE_MS;
    room.deadline = { key, who, at: Date.now() + ms, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      const hand = h.hands[who], e = R.ends(h.chain);
      // joga a peça mais pesada que servir
      const opts = hand.filter((t) => (h.mustOpen != null ? t.id === h.mustOpen : R.sides(t, e).length)).sort((x, y) => R.pips(y) - R.pips(x));
      if (!opts.length) return;
      log(room, `⏱️ ${nameOf(room, who)} demorou e jogou ${tn(opts[0])}.`);
      place(room, who, opts[0], R.sides(opts[0], e)[0]);
      broadcast(room);
    }, ms + 150);
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
      const used = new Set(Object.values(room.players).map((p) => p.pawn));
      const id = rid(6);
      const t0 = room.order.filter((x) => room.players[x].team === 0).length, t1 = room.order.length - t0;
      room.players[id] = { id, name, token: rid(), pawn: R.PAWNS.find((x) => !used.has(x)), team: t0 <= t1 ? 0 : 1, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    const cleanName = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: newCode(), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], h: null, score: [0, 0], games: [0, 0], fx: [], log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Mesa criada por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = rooms.get(String(data.code || "").toUpperCase().trim());
      if (!room) return fail(cb, "Mesa não encontrada. Confira o código (se o servidor reiniciou, a mesa se perdeu).");
      const back = data.id && room.players[data.id] && room.players[data.id].token === data.token ? room.players[data.id] : null;
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch || room.phase !== "lobby") {
        if (!data.watch) return fail(cb, "O jogo já começou. Você pode entrar para assistir.");
        bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room);
      }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= 4) return fail(cb, "A mesa já tem 4 jogadores. Você pode entrar para assistir.");
      if (Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já tem alguém com esse nome na mesa.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} sentou à mesa.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa mesa.");
      const err = handle(room, me, data);
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    function handle(room, me, data) {
      const type = data.type, isHost = me && room.host === me.id, h = room.h;
      if (type === "pawn") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!R.PAWNS.includes(data.pawn)) return "Avatar inválido.";
        if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outra pessoa.";
        me.pawn = data.pawn; return;
      }
      if (type === "team") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        const p = room.players[data.id && isHost ? data.id : me.id];
        if (!p) return "Jogador inválido.";
        p.team = p.team ? 0 : 1; return;
      }
      if (type === "shuffleTeams") {
        if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
        shuffle([...room.order]).forEach((id, i) => (room.players[id].team = i % 2));
        log(room, "🎲 Duplas sorteadas."); return;
      }
      if (type === "config") {
        if (!isHost || room.phase !== "lobby") return "Só o organizador muda as regras, antes de começar.";
        room.config = cleanConfig(data.config); return;
      }
      if (type === "kick") {
        if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
        const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
        for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
        delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
        log(room, `${p.name} saiu da mesa.`); return;
      }
      if (type === "start") {
        if (!isHost || room.phase !== "lobby") return "Só o organizador começa o jogo.";
        const a = room.order.filter((id) => room.players[id].team === 0), b = room.order.filter((id) => room.players[id].team === 1);
        if (room.order.length !== 4 || a.length !== 2 || b.length !== 2) return "O dominó de dupla é com 4 jogadores, 2 em cada dupla.";
        shuffle(a); shuffle(b);
        room.order = [a[0], b[0], a[1], b[1]]; // parceiros de frente
        room.score = [0, 0]; room.winner = null; room.h = null; room.fx = [];
        log(room, `🎉 Começou! ${teamName(room, 0)} contra ${teamName(room, 1)}.`);
        startHand(room, null); return;
      }
      if (type === "next") {
        if (!isHost || room.phase !== "handEnd") return "Só o organizador adianta.";
        nextHand(room); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.nextTimer); clearTimeout(room.turnTimer); clearTimeout(room.passTimer);
        room.phase = "lobby"; room.h = null; room.deadline = null; room.nextAt = null; room.winner = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      if (type === "play") {
        if (room.phase !== "playing") return "A mão não está em andamento.";
        if (room.order[h.turn] !== me.id) return "Não é a sua vez.";
        const tile = h.hands[me.id].find((t) => t.id === int(data.id, -1));
        if (!tile) return "Essa peça não está na sua mão.";
        if (h.mustOpen != null && tile.id !== h.mustOpen) return "A primeira mão começa com a carroça de sena (6|6).";
        const ok = R.sides(tile, R.ends(h.chain));
        if (!ok.length) return "Essa peça não encaixa em nenhuma ponta.";
        const side = ok.includes(data.side) ? data.side : ok[0];
        place(room, me.id, tile, side);
        return;
      }
      return "Ação desconhecida.";
    }

    socket.on("react", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase === "lobby" || !R.REACTIONS.includes(data.emoji)) return;
      const now = Date.now();
      if (now - (me.lastReact || 0) < 700) return;
      me.lastReact = now;
      nsp.to(room.code).emit("react", { player: me.id, emoji: data.emoji });
    });
    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) if (now - r.t > 12 * 3600e3) { clearTimeout(r.turnTimer); clearTimeout(r.nextTimer); clearTimeout(r.passTimer); rooms.delete(code); }
  }, 3600e3).unref?.();
};
