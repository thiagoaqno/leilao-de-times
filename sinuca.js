// Sinuca da Galera — bola 8 (estilo 8 Ball Pool), de 2 a 8 jogadores: duplas (2x2) ou individual
// (rei da mesa ou mata-mata). Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/sinuca").
// O servidor simula cada tacada (public/sinuca/fisica.js) e aplica as regras; os navegadores recebem a
// tacada e refazem a mesma simulação só para animar.
const crypto = require("crypto");
const F = require("./public/sinuca/fisica.js");

const MAX_PLAYERS = 8;
const OFFLINE_MS = 12000, NEXT_MS = 8000;
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🎱"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🙏", "🍀", "💀"];
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const GROUP_NAME = { lisas: "lisas", listradas: "listradas" };

module.exports = function attachSinuca(io) {
  const nsp = io.of("/sinuca");
  const rooms = new Map();

  function newCode() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  function cleanConfig(c = {}) {
    return {
      mode: c.mode === "individual" ? "individual" : "duplas",
      format: c.format === "mata" ? "mata" : "rei", // individual com 3 ou mais: rei da mesa ou mata-mata
      target: [1, 2, 3, 5].includes(int(c.target, 2)) ? int(c.target, 2) : 2,
      timer: [30, 45, 60].includes(int(c.timer, 45)) ? int(c.timer, 45) : 45,
    };
  }

  // ---------- estado ----------
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const sideName = (room, side) => room.match.sides[side].map((id) => nameOf(room, id)).join(" e ");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  function shooterOf(room) {
    const g = room.g, s = room.match.sides[g.turn];
    return s[g.inning[g.turn] % s.length];
  }
  const groupLeft = (g, grp) => g.balls.filter((b) => F.group(b.n) === grp).length;
  const onEight = (g, side) => !!g.groups[side] && groupLeft(g, g.groups[side]) === 0;

  function publicState(room) {
    const g = room.g, m = room.match;
    const players = room.order.map((id) => {
      const p = room.players[id];
      return { id, name: p.name, pawn: p.pawn, team: p.team, wins: p.wins, online: p.sockets.size > 0 };
    });
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, players,
      match: m ? { sides: m.sides, score: m.score, rackNo: m.rackNo, label: m.label } : null,
      tour: room.tour, champion: room.champion || null, result: room.result || null,
      g: g ? {
        balls: g.balls, groups: g.groups, turn: g.turn, shooter: room.phase === "playing" ? shooterOf(room) : null,
        ballInHand: g.ballInHand, kitchen: g.kitchen, isBreak: g.isBreak, onEight: [onEight(g, 0), onEight(g, 1)],
        shot: g.shot, note: g.note || null, busyUntil: g.busyUntil, step: g.step,
      } : null,
      deadline: room.deadline ? { who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null,
      nextAt: room.nextAt || null, log: room.log.slice(-40), now: Date.now(),
    };
  }
  function broadcast(room) {
    armTurn(room);
    room.t = Date.now();
    nsp.to(room.code).emit("state", publicState(room));
  }

  // ---------- partidas ----------
  function newRackBalls() {
    const slots = F.rackSlots();
    const solids = shuffle([1, 2, 3, 4, 5, 6, 7]), stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
    const nums = new Array(15);
    const idx = (r, k) => slots.findIndex((s) => s.r === r && s.k === k);
    nums[idx(2, 1)] = 8;
    const [c1, c2] = Math.random() < 0.5 ? [solids.pop(), stripes.pop()] : [stripes.pop(), solids.pop()];
    nums[idx(4, 0)] = c1; nums[idx(4, 4)] = c2;
    const rest = shuffle([...solids, ...stripes]);
    for (let i = 0; i < 15; i++) if (nums[i] == null) nums[i] = rest.pop();
    // arrumação com folguinhas aleatórias, como na mesa de verdade (senão o meio do triângulo não abre)
    const balls = slots.map((s, i) => ({ n: nums[i], x: s.x + (Math.random() - 0.5) * 0.5, y: s.y + (Math.random() - 0.5) * 0.5 }));
    return [{ n: 0, x: F.HEAD_X - 40, y: F.MID_Y }, ...balls];
  }
  function startMatch(room, sides, label) {
    room.match = { sides, score: [0, 0], rackNo: 0, breaker: Math.random() < 0.5 ? 0 : 1, label: label || "" };
    log(room, `🎱 ${label ? label + ": " : ""}${sideName(room, 0)} x ${sideName(room, 1)}.`);
    startRack(room);
  }
  function startRack(room) {
    const m = room.match;
    if (m.rackNo > 0) m.breaker = 1 - m.breaker;
    m.rackNo++;
    room.g = {
      balls: newRackBalls(), groups: [null, null], turn: m.breaker, inning: [0, 0],
      ballInHand: true, kitchen: true, isBreak: true, shot: null, note: null, shotSeq: room.g ? room.g.shotSeq : 0, busyUntil: 0, step: 0,
    };
    room.phase = "playing"; room.result = null; room.nextAt = null;
    log(room, `Partida ${m.rackNo}: ${nameOf(room, shooterOf(room))} dá a saída.`);
  }
  function passTurn(room) {
    const g = room.g;
    g.inning[g.turn]++;
    g.turn = 1 - g.turn;
  }

  // Fim de uma partida (rack): conta o ponto e decide o que vem depois.
  function endRack(room, win, reason) {
    const m = room.match, cfg = room.config, t = room.tour;
    m.score[win]++;
    room.phase = "rackEnd";
    const winners = m.sides[win];
    log(room, `🏆 ${sideName(room, win)} venceu a partida ${m.rackNo}: ${reason}`);
    room.result = { win, reason, winners, score: [...m.score], rackNo: m.rackNo };
    let next = null;
    if (t.kind === "rei") {
      const w = winners[0], l = m.sides[1 - win][0];
      room.players[w].wins++;
      if (room.players[w].wins >= cfg.target) return champion(room, [w]);
      t.queue = [w, ...t.queue.filter((x) => x !== w && x !== l), l];
      t.streak = t.last === w ? t.streak + 1 : 1; t.last = w;
      next = () => startMatch(room, [[t.queue[0]], [t.queue[1]]], "Rei da mesa");
    } else if (m.score[win] >= cfg.target) {
      if (t.kind !== "mata") return champion(room, winners);
      const round = t.rounds[t.r];
      round[t.m].w = winners[0];
      room.players[winners[0]].wins++;
      t.m++;
      if (t.m >= round.length) {
        if (round.length === 1) return champion(room, winners);
        const ws = round.map((x) => x.w), nr = [];
        for (let i = 0; i < ws.length; i += 2) nr.push({ a: ws[i], b: ws[i + 1], w: null });
        t.rounds.push(nr); t.r++; t.m = 0;
      }
      next = () => mataMatch(room);
    } else next = () => startRack(room);
    room.nextAt = Date.now() + Math.max(0, room.g.busyUntil - Date.now()) + NEXT_MS;
    room.nextFn = next;
    clearTimeout(room.nextTimer);
    room.nextTimer = setTimeout(() => { if (room.phase === "rackEnd" && room.nextFn === next) { next(); broadcast(room); } }, room.nextAt - Date.now());
  }
  function champion(room, ids) {
    room.phase = "ended";
    room.champion = { ids, at: Date.now() };
    room.nextAt = null;
    log(room, `👑 ${ids.map((id) => nameOf(room, id)).join(" e ")} ${ids.length > 1 ? "são os campeões" : "é o campeão"}!`);
  }
  function roundName(t) {
    const left = t.rounds[t.r].length;
    return left === 1 ? "Final" : left === 2 ? "Semifinal" : "Quartas de final";
  }
  function mataMatch(room) {
    const t = room.tour, x = t.rounds[t.r][t.m];
    startMatch(room, [[x.a], [x.b]], roundName(t));
  }

  // ---------- tacada ----------
  function shoot(room, me, d) {
    const g = room.g, side = g.turn;
    if (Date.now() < g.busyUntil) return "Espere as bolas pararem.";
    let balls = g.balls.map((b) => ({ ...b }));
    if (g.ballInHand) {
      const x = num(d.cx), y = num(d.cy);
      const others = balls.filter((b) => b.n !== 0);
      if (!F.freeSpot(others, x, y, g.kitchen)) return g.kitchen ? "Coloque a branca atrás da linha de saída, sem encostar em outra bola." : "A branca não pode ficar aí.";
      balls = [{ n: 0, x, y }, ...others];
    }
    const a = num(d.a);
    if (!Number.isFinite(a)) return "Mira inválida.";
    const p = clamp(num(d.p) || 0, 0.02, 1);
    let sx = clamp(num(d.sx) || 0, -1, 1), sy = clamp(num(d.sy) || 0, -1, 1);
    const sl = Math.sqrt(sx * sx + sy * sy); if (sl > 1) { sx /= sl; sy /= sl; }
    const eight = onEight(g, side);
    let call = null;
    if (eight) { call = int(d.pk, -1); if (call < 0 || call > 5) return "Escolha a caçapa da bola 8."; }

    const shot = { dx: Math.cos(a), dy: Math.sin(a), v: F.speedOf(p), sx, sy };
    const res = F.simulate(balls, shot);
    const own = g.groups[side], shooter = me.name, wasBreak = g.isBreak;
    const potted = res.pocketed.filter((x) => x.n !== 0);
    const cueIn = res.pocketed.some((x) => x.n === 0);
    const eightIn = res.pocketed.find((x) => x.n === 8);
    const legal = (n) => (own === null ? n !== 8 : eight ? n === 8 : F.group(n) === own);
    let foul = null;
    if (cueIn) foul = "a branca caiu";
    else if (res.first === null) foul = "a branca não tocou em nenhuma bola";
    else if (!wasBreak && !legal(res.first)) foul = res.first === 8 ? "bateu primeiro na 8" : `bateu primeiro na ${res.first}, que é das ${F.group(res.first)}`;
    else if (!wasBreak && !potted.length && !res.rail) foul = "nenhuma bola bateu na tabela depois do toque";

    const msgs = [];
    g.balls = res.balls;
    g.shot = { id: ++g.shotSeq, by: me.id, start: balls, dx: shot.dx, dy: shot.dy, v: shot.v, sx, sy, call, at: Date.now() + 160, dur: res.t }; // 160 ms para o golpe do taco aparecer em todo mundo
    g.busyUntil = g.shot.at + res.t * 1000 + 350;
    g.step++;
    const pottedTxt = potted.map((x) => x.n).join(", ");
    if (pottedTxt) msgs.push(`${shooter} encaçapou ${potted.length > 1 ? "as bolas" : "a"} ${pottedTxt}.`);

    // bola 8
    if (eightIn) {
      if (wasBreak) {
        let x = F.FOOT_X, y = F.MID_Y;
        while (!F.freeSpot(g.balls, x, y, false) && x < F.L - F.R) x += 1;
        g.balls.push({ n: 8, x, y });
        msgs.push("A 8 caiu na saída e voltou para a marca.");
      } else {
        const won = eight && !foul && eightIn.p === call;
        const why = won ? `${shooter} encaçapou a 8 na caçapa marcada.`
          : !eight ? `${shooter} encaçapou a 8 antes da hora.`
          : foul ? `${shooter} encaçapou a 8, mas ${foul}.`
          : `${shooter} encaçapou a 8 na caçapa errada.`;
        g.note = { id: g.step, msgs: [why], foul: won ? null : foul || "8 fora de hora", at: g.busyUntil };
        endRack(room, won ? side : 1 - side, why);
        return;
      }
    }
    // define lisas/listradas: primeira bola encaçapada numa tacada limpa depois da saída
    if (own === null && !wasBreak && !foul) {
      const first = potted.find((x) => x.n !== 8);
      if (first) {
        const grp = F.group(first.n);
        g.groups[side] = grp; g.groups[1 - side] = grp === "lisas" ? "listradas" : "lisas";
        msgs.push(`${sideName(room, side)} ${room.match.sides[side].length > 1 ? "ficam" : "fica"} com as ${GROUP_NAME[grp]}.`);
      }
    }
    const mine = g.groups[side];
    const keep = !foul && potted.some((x) => x.n !== 8 && (wasBreak || !mine || F.group(x.n) === mine));
    g.isBreak = false; g.kitchen = false;
    if (foul) {
      passTurn(room);
      g.ballInHand = true;
      msgs.push(`Falta: ${foul}. Bola na mão para ${nameOf(room, shooterOf(room))}.`);
      log(room, `🚫 ${shooter}: falta (${foul}).`);
    } else {
      g.ballInHand = false;
      if (keep) msgs.push(`${shooter} continua.`);
      else { passTurn(room); msgs.push(`Vez de ${nameOf(room, shooterOf(room))}.`); }
      if (pottedTxt) log(room, `🎯 ${shooter} encaçapou ${pottedTxt}.`);
    }
    g.note = { id: g.step, msgs, foul, at: g.busyUntil };
  }

  // ---------- relógio da tacada ----------
  function armTurn(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.turnTimer); room.deadline = null; return; }
    const who = shooterOf(room), key = `${who}|${g.step}|${room.match.rackNo}`;
    if (room.deadline && room.deadline.key === key) return;
    clearTimeout(room.turnTimer);
    const ms = room.players[who].sockets.size ? room.config.timer * 1000 : OFFLINE_MS;
    const at = Math.max(Date.now(), g.busyUntil) + ms;
    room.deadline = { who, key, at, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      const g2 = room.g;
      log(room, `⏱️ ${nameOf(room, who)} demorou demais.`);
      g2.step++;
      passTurn(room);
      if (g2.isBreak) { g2.ballInHand = true; g2.kitchen = true; }
      else { g2.ballInHand = true; g2.kitchen = false; }
      g2.note = { id: g2.step, msgs: [`${nameOf(room, who)} demorou demais. Bola na mão para ${nameOf(room, shooterOf(room))}.`], foul: "tempo", at: Date.now() };
      broadcast(room);
    }, at - Date.now() + 150);
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
      room.players[id] = { id, name, token: rid(), pawn: PAWNS.find((x) => !used.has(x)), team: t0 <= t1 ? 0 : 1, wins: 0, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    const cleanName = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: newCode(), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], g: null, match: null, tour: null, log: [], t: Date.now() };
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
      if (room.order.length >= MAX_PLAYERS) return fail(cb, `A mesa já tem ${MAX_PLAYERS} jogadores. Você pode entrar para assistir.`);
      if (Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(cb, "Já tem alguém com esse nome na mesa.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} chegou.`);
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
      const type = data.type, isHost = me && room.host === me.id;
      // ---- sala de espera ----
      if (type === "pawn") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!PAWNS.includes(data.pawn)) return "Avatar inválido.";
        if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outra pessoa.";
        me.pawn = data.pawn; return;
      }
      if (type === "team") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        const id = data.id && isHost ? data.id : me.id, p = room.players[id];
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
        const n = room.order.length, cfg = room.config;
        if (n < 2) return "Precisa de pelo menos 2 jogadores.";
        for (const id of room.order) room.players[id].wins = 0;
        room.champion = null; room.g = null;
        if (cfg.mode === "duplas") {
          const a = room.order.filter((id) => room.players[id].team === 0), b = room.order.filter((id) => room.players[id].team === 1);
          if (n !== 4 || a.length !== 2 || b.length !== 2) return "Duplas precisam de 4 jogadores, 2 em cada time.";
          room.tour = { kind: "duplas" };
          startMatch(room, [shuffle(a), shuffle(b)], "Duplas");
        } else if (n === 2) {
          room.tour = { kind: "serie" };
          startMatch(room, shuffle([[room.order[0]], [room.order[1]]]), "");
        } else if (cfg.format === "mata") {
          if (n !== 4 && n !== 8) return "Mata-mata precisa de 4 ou 8 jogadores. Com outra quantidade, use o Rei da mesa.";
          const ids = shuffle([...room.order]), r0 = [];
          for (let i = 0; i < n; i += 2) r0.push({ a: ids[i], b: ids[i + 1], w: null });
          room.tour = { kind: "mata", rounds: [r0], r: 0, m: 0 };
          mataMatch(room);
        } else {
          const q = shuffle([...room.order]);
          room.tour = { kind: "rei", queue: q, streak: 0, last: null };
          startMatch(room, [[q[0]], [q[1]]], "Rei da mesa");
        }
        return;
      }
      if (type === "next") {
        if (!isHost || room.phase !== "rackEnd" || !room.nextFn) return "Só o organizador adianta.";
        clearTimeout(room.nextTimer); const f = room.nextFn; room.nextFn = null; f(); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.nextTimer); clearTimeout(room.turnTimer);
        room.phase = "lobby"; room.g = null; room.match = null; room.tour = null; room.result = null; room.champion = null; room.deadline = null; room.nextAt = null; room.nextFn = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      if (type === "shoot") {
        if (room.phase !== "playing") return "A partida não está em andamento.";
        if (shooterOf(room) !== me.id) return "Não é a sua vez.";
        return shoot(room, me, data);
      }
      return "Ação desconhecida.";
    }

    // Mira ao vivo: quem está jogando manda a mira, e os outros veem o taco se mexendo.
    socket.on("aim", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "playing" || shooterOf(room) !== me.id) return;
      const now = Date.now();
      if (now - (me.lastAim || 0) < 40) return;
      me.lastAim = now;
      const a = num(d.a), p = num(d.p), cx = num(d.cx), cy = num(d.cy), sx = num(d.sx), sy = num(d.sy);
      socket.to(room.code).emit("aim", {
        who: me.id, a: Number.isFinite(a) ? a : 0, p: Number.isFinite(p) ? clamp(p, 0, 1) : 0,
        cx: Number.isFinite(cx) ? cx : null, cy: Number.isFinite(cy) ? cy : null,
        sx: Number.isFinite(sx) ? clamp(sx, -1, 1) : 0, sy: Number.isFinite(sy) ? clamp(sy, -1, 1) : 0,
        pk: clamp(int(d.pk, -1), -1, 5), drag: !!d.drag,
      });
    });

    socket.on("react", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase === "lobby" || !REACTIONS.includes(data.emoji)) return;
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

  // mesas paradas há mais de 12 horas somem
  setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) if (now - r.t > 12 * 3600e3) { clearTimeout(r.turnTimer); clearTimeout(r.nextTimer); rooms.delete(code); }
  }, 3600e3).unref?.();
};
module.exports.PAWNS = PAWNS;
module.exports.REACTIONS = REACTIONS;
