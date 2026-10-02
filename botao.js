// Futebol de Botão da Galera — times de 1x1 até 4x4 (pode ser desigual, como 3x2) ou rei do campo / mata-mata.
// Cada time tem 5 tampinhas, numa formação de quadra (2-2, 3-1, 1-2-1, 1-1-2). Cada toque é de um jogador do time
// (rodízio). O organizador escolhe as regras da mesa: toques por vez, mesa fechada ou com lateral, goleiro,
// cobranças com a tampinha arrumada, super palhetada e o estádio.
// Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/botao").
// O servidor simula cada jogada (public/botao/fisica.js) e aplica as regras; os navegadores recebem a jogada e
// refazem a mesma simulação só para animar.
const crypto = require("crypto");
const F = require("./public/botao/fisica.js");

const MAX_PLAYERS = 8, MAX_TEAM = 4, BAR_MAX = 3;
const OFFLINE_MS = 12000, NEXT_MS = 8000;
const SET_PIECES = ["Falta", "Lateral", "Escanteio", "Tiro de meta"]; // bolas paradas (dá para arrumar a tampinha)
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "⚽"];
// camisas (o mesmo time pode ser escolhido por mais de um; se os dois lados empatarem, o segundo joga com a invertida)
const KITS = ["corinthians", "saopaulo", "santos", "palmeiras", "rubronegro", "celeste", "canarinho", "laranja"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🙏", "🍀", "💀"];
const FORMS = Object.keys(F.FORMATIONS);
const STADIUMS = ["mesa", "morumbis", "neoquimica", "nubank", "baixada", "vilabelmiro"]; // mesa de madeira ou o estádio (nas cores do time da casa)
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (v, list, d) => (list.includes(v) ? v : d);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachBotao(io) {
  const nsp = io.of("/botao");
  const rooms = new Map();

  function newCode() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  function cleanConfig(c = {}) {
    return {
      mode: c.mode === "individual" ? "individual" : "times", // times: cada um escolhe o lado (1x1 a 4x4)
      format: c.format === "mata" ? "mata" : "rei", // individual com 3 ou mais: rei do campo ou mata-mata
      target: pick(int(c.target, 1), [1, 2, 3], 1),  // jogos para vencer o confronto (ou para ser campeão no rei)
      goals: pick(int(c.goals, 3), [2, 3, 5, 7], 3),   // quem fizer primeiro ganha o jogo
      minutes: pick(int(c.minutes, 10), [0, 5, 10, 15], 10), // 0 = sem tempo
      timer: pick(int(c.timer, 30), [15, 20, 30, 45], 30), // segundos para cada jogada
      toques: pick(int(c.toques, 3), [2, 3, 4], 3),    // jogadas por vez (todas contam, menos depois de falta)
      mesa: c.mesa === "aberta" ? "aberta" : "fechada", // aberta: a bola sai (lateral, escanteio, tiro de meta)
      cobranca: c.cobranca !== false,                    // bola parada: o cobrador arruma a tampinha perto da bola
      superTiro: !!c.superTiro,                          // passes enchem a barra da super palhetada
      goleiro: c.goleiro !== false,                      // bloquinho na frente do gol: o time arruma na própria vez, fica parado na do outro
      estadio: pick(c.estadio, STADIUMS, "mesa"),
      tampinhas: pick(int(c.tampinhas, 5), F.TAMPINHAS, 5),  // tampinhas por time (a 1 guarda o gol)
    };
  }

  // ---------- estado ----------
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const sideName = (room, side) => room.match.sides[side].map((id) => nameOf(room, id)).join(" e ");
  const sideOf = (room, pid) => (room.match ? room.match.sides.findIndex((s) => s.includes(pid)) : -1);
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  // rodízio: cada toque de um lado é do próximo jogador dele (um passa, o outro finaliza). Com 1 jogador, é sempre ele.
  function shooterOf(room) {
    const g = room.g, s = room.match.sides[g.turn];
    return s[g.cursor[g.turn] % s.length];
  }
  const isSetPiece = (room) => room.config.cobranca && SET_PIECES.includes(room.g.restart);

  function publicState(room) {
    const g = room.g, m = room.match, playing = room.phase === "playing";
    const players = room.order.map((id) => {
      const p = room.players[id];
      return { id, name: p.name, pawn: p.pawn, kit: p.kit, form: p.form, team: p.team, wins: p.wins, online: p.sockets.size > 0 };
    });
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, players,
      match: m ? { sides: m.sides, score: m.score, gameNo: m.gameNo, label: m.label, kits: m.kits, forms: m.forms } : null,
      tour: room.tour, champion: room.champion || null, result: room.result || null,
      g: g ? {
        pieces: g.pieces, goals: g.goals, turn: g.turn, toques: g.toques, max: g.maxToques, restart: g.restart, setPiece: playing && isSetPiece(room),
        shooter: playing ? shooterOf(room) : null,
        next: playing ? m.sides[g.turn][(g.cursor[g.turn] + 1) % m.sides[g.turn].length] : null, // quem faz o toque seguinte
        bar: g.bar, keepers: room.config.goleiro ? g.keepers : null,
        shot: g.shot, note: g.note || null, busyUntil: g.busyUntil, step: g.step,
        endsAt: g.endsAt, golden: g.golden, lastGoal: g.lastGoal || null,
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

  // ---------- confrontos e jogos ----------
  function startMatch(room, sides, label) {
    // cada lado joga com a camisa mais escolhida pelos seus jogadores (empate: a de quem está na frente);
    // se os dois lados ficarem com a mesma, o segundo usa a camisa invertida
    const kits = sides.map((s) => { const n = {}; s.forEach((id) => (n[room.players[id].kit] = (n[room.players[id].kit] || 0) + 1)); return s.map((id) => room.players[id].kit).sort((a, b) => n[b] - n[a])[0]; });
    if (kits[0] === kits[1]) kits[1] += ":alt";
    const forms = sides.map((s) => room.players[s[0]].form); // a formação é do time (todos do time têm a mesma)
    room.match = { sides, score: [0, 0], gameNo: 0, kickFirst: Math.random() < 0.5 ? 0 : 1, label: label || "", kits, forms };
    log(room, `⚽ ${label ? label + ": " : ""}${sideName(room, 0)} x ${sideName(room, 1)}.`);
    startGame(room);
  }
  function startGame(room) {
    const m = room.match;
    if (m.gameNo > 0) m.kickFirst = 1 - m.kickFirst;
    m.gameNo++;
    const k = m.kickFirst, mins = room.config.minutes;
    room.g = {
      // saída: a primeira vez de cada time vale só 1 toque (ninguém sai driblando até o gol); depois, os toques combinados
      pieces: F.lineup(k, m.forms, room.config.tampinhas), goals: [0, 0], turn: k, cursor: [0, 0], starter: [0, 0], toques: 0, maxToques: 1, opening: 1, restart: "Saída",
      bar: [0, 0], lastCap: null, keepers: [F.MID_Y, F.MID_Y],
      shot: null, note: null, shotSeq: room.g ? room.g.shotSeq : 0, busyUntil: 0, step: 0,
      endsAt: mins ? Date.now() + mins * 60000 : null, golden: false, lastGoal: null,
    };
    room.phase = "playing"; room.result = null; room.nextAt = null;
    armClock(room);
    log(room, `Jogo ${m.gameNo}: ${nameOf(room, shooterOf(room))} dá a saída.`);
  }
  // passa a bola para o lado "to": começa uma vez nova, com os toques zerados. Quem começa a vez também roda
  // (num 2x2: A passa para B, na vez seguinte B passa para A; num 3x3: A→B→C, depois B→C→A…).
  function giveBall(room, to) {
    const g = room.g, n = room.match.sides[to].length;
    g.turn = to;
    g.toques = 0;
    if (g.opening > 0) { g.maxToques = 1; g.opening--; } else g.maxToques = room.config.toques;
    g.lastCap = null;
    g.starter[to] = (g.starter[to] + 1) % n;
    g.cursor[to] = g.starter[to];
  }

  // Fim de um jogo: conta o ponto no confronto e decide o que vem depois.
  function endGame(room, win, reason) {
    const m = room.match, cfg = room.config, t = room.tour;
    clearTimeout(room.clockTimer);
    m.score[win]++;
    room.phase = "gameEnd";
    const winners = m.sides[win];
    log(room, `🏆 ${sideName(room, win)} venceu o jogo ${m.gameNo}: ${reason}`);
    room.result = { win, reason, winners, score: [...m.score], goals: [...room.g.goals], gameNo: m.gameNo };
    let next = null;
    if (t.kind === "rei") {
      const w = winners[0], l = m.sides[1 - win][0];
      room.players[w].wins++;
      if (room.players[w].wins >= cfg.target) return champion(room, [w]);
      t.queue = [w, ...t.queue.filter((x) => x !== w && x !== l), l];
      t.streak = t.last === w ? t.streak + 1 : 1; t.last = w;
      next = () => startMatch(room, [[t.queue[0]], [t.queue[1]]], "Rei do campo");
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
    } else next = () => startGame(room);
    room.nextAt = Date.now() + Math.max(0, room.g.busyUntil - Date.now()) + NEXT_MS;
    room.nextFn = next;
    clearTimeout(room.nextTimer);
    room.nextTimer = setTimeout(() => { if (room.phase === "gameEnd" && room.nextFn === next) { next(); broadcast(room); } }, room.nextAt - Date.now());
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

  // ---------- relógio do jogo: acabou o tempo, ganha quem está na frente; empatado, gol de ouro ----------
  function armClock(room) {
    clearTimeout(room.clockTimer);
    const g = room.g;
    if (room.phase !== "playing" || !g.endsAt || g.golden) return;
    const at = Math.max(g.endsAt, g.busyUntil + 50);
    room.clockTimer = setTimeout(() => { if (room.g === g && checkClock(room)) broadcast(room); }, Math.max(0, at - Date.now()) + 50);
  }
  function checkClock(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g.endsAt || g.golden || Date.now() < g.endsAt) return false;
    if (Date.now() < g.busyUntil) { armClock(room); return false; }
    if (g.goals[0] !== g.goals[1]) { const w = g.goals[0] > g.goals[1] ? 0 : 1; endGame(room, w, `fim de tempo, ${g.goals[w]} a ${g.goals[1 - w]}.`); return true; }
    g.golden = true;
    g.note = { id: ++g.step, msgs: ["Acabou o tempo empatado: GOL DE OURO! Quem marcar primeiro vence."], foul: null, banner: "GOL DE OURO!", at: Date.now() };
    log(room, "⏱️ Fim de tempo empatado: gol de ouro!");
    return true;
  }

  // ---------- jogada ----------
  // Confere um peteleco vindo do navegador ({i, a, p, place, super}) e devolve o peteleco limpo ou um erro.
  function cleanFlick(room, d) {
    const g = room.g, i = int(d.i, -1), pc = g.pieces[i];
    if (!pc || pc.k !== "btn" || pc.t !== g.turn) return { err: "Escolha uma tampinha do seu time." };
    const a = num(d.a);
    if (!Number.isFinite(a)) return { err: "Mira inválida." };
    const f = { i, a, p: clamp(num(d.p) || 0, 0, 1), super: !!d.super };
    if (d.place && isSetPiece(room)) {
      const x = num(d.place.x), y = num(d.place.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !F.placeOk(g.pieces, i, x, y)) return { err: "A tampinha tem que ficar perto da bola, sem encostar em ninguém." };
      f.place = { x, y };
    }
    return f;
  }
  // Solta a jogada (um peteleco; a física aceita vários de uma vez). byIds: quem jogou.
  function play(room, flicks, byIds) {
    const g = room.g, cfg = room.config, side = g.turn, other = 1 - side;
    const start = g.pieces.map((x) => ({ ...x }));
    // bola parada: cada cobrador arruma a sua tampinha (uma de cada vez, sem encostar nas outras)
    for (const f of flicks) if (f.place) { if (F.placeOk(start, f.i, f.place.x, f.place.y)) { start[f.i].x = f.place.x; start[f.i].y = f.place.y; } }
    const shots = flicks.filter((f) => f.p >= 0.03).map((f) => ({ i: f.i, dx: Math.cos(f.a), dy: Math.sin(f.a), v: F.speedOf(f.p) }));
    // super palhetada: a barra cheia deixa um peteleco bem mais forte
    let superUsed = false;
    if (cfg.superTiro && g.bar[side] >= BAR_MAX) {
      const k = flicks.findIndex((f) => f.super && f.p >= 0.03);
      if (k >= 0) { const s = shots.find((x) => x.i === flicks[k].i); s.v *= F.SUPER; g.bar[side] = 0; superUsed = true; }
    }
    const names = byIds.map((id) => nameOf(room, id)).join(" e ");
    const msgs = []; let foul = null, banner = superUsed ? "⚡ SUPER PALHETADA!" : null;
    g.step++;
    g.toques++;
    g.cursor[side]++; // o próximo toque deste lado é do próximo jogador
    if (!shots.length) { // ninguém armou nada: passa
      g.restart = null;
      giveBall(room, other);
      g.note = { id: g.step, msgs: [`${names} não jogou. Vez de ${turnName(room)}.`], foul: "tempo", at: Date.now() };
      return;
    }
    const opts = { open: cfg.mesa === "aberta", keepers: cfg.goleiro ? [...g.keepers] : null };
    const res = F.simulate(start, shots, opts);
    g.pieces = res.pieces;
    g.shot = { id: ++g.shotSeq, by: byIds, start, ...opts, flicks: shots, at: Date.now() + 160, dur: res.t };
    g.busyUntil = g.shot.at + res.t * 1000 + 350;
    g.restart = null;

    // passe certo (para a super palhetada): uma tampinha diferente da que tocou por último recebe a bola
    if (cfg.superTiro && res.touchers.length && !res.foul) {
      const cap = res.touchers[0];
      if (g.lastCap != null && g.lastCap !== cap && g.bar[side] < BAR_MAX) { g.bar[side]++; if (g.bar[side] === BAR_MAX) msgs.push("⚡ Barra cheia: a próxima pode ser uma super palhetada!"); }
      g.lastCap = res.touchers[res.touchers.length - 1];
    }

    if (res.goal) {
      const scorer = res.goal.side === 0 ? 1 : 0, own = scorer !== side;
      // vale de qualquer lugar do campo (até de trás do meio), desde que sem falta; gol contra vale sempre
      if (own || !res.foul) {
        g.goals[scorer]++;
        g.lastGoal = { by: own ? null : byIds, side: scorer, own, at: g.busyUntil };
        const why = own ? `Gol contra (${names})!` : `GOOOL de ${names}!`;
        msgs.push(why, `${g.goals[0]} x ${g.goals[1]}.`);
        log(room, `⚽ ${why} ${g.goals[0]} x ${g.goals[1]}`);
        g.note = { id: g.step, msgs, foul: null, banner: own ? "GOL CONTRA!" : "GOOOL!", goal: scorer, at: g.busyUntil };
        if (g.goals[scorer] >= cfg.goals || g.golden) { endGame(room, scorer, g.golden ? `gol de ouro${own ? " (contra)" : ` de ${names}`}!` : `${g.goals[scorer]} a ${g.goals[1 - scorer]}.`); return; }
        const k = 1 - scorer; // saída para quem levou o gol (de novo, 1 toque para cada time na primeira vez)
        g.pieces = F.lineup(k, room.match.forms, room.config.tampinhas); g.keepers = [F.MID_Y, F.MID_Y];
        g.opening = 2; giveBall(room, k); g.restart = "Saída";
        armClock(room);
        return;
      }
      // gol que não vale: teve falta antes; o time que defende aquele gol cobra
      const def = res.goal.side;
      msgs.push("A bola entrou, mas teve falta antes. Não vale!");
      banner = "NÃO VALEU!";
      restartAt(g, def ? F.L - 70 : 70, F.MID_Y);
      giveBall(room, def); g.restart = "Falta";
      msgs.push(`${g.restart} para ${turnName(room)}.`);
    } else if (res.out) {
      const o = res.out;
      if (o.line === "side") {
        const to = o.by === side ? other : side;
        restartAt(g, clamp(o.x, 30, F.L - 30), o.y === 0 ? F.RBALL + 4 : F.W - F.RBALL - 4);
        giveBall(room, to); g.restart = "Lateral";
        msgs.push(`Bola na lateral para ${turnName(room)}.`);
      } else if (o.by === o.end) { // o defensor pôs para fora: escanteio
        restartAt(g, o.end ? F.L - 14 : 14, o.y < F.MID_Y ? 14 : F.W - 14);
        giveBall(room, 1 - o.end); g.restart = "Escanteio";
        msgs.push(`Escanteio para ${turnName(room)}!`); banner = banner || "ESCANTEIO!";
      } else {
        restartAt(g, o.end ? F.L - 70 : 70, F.MID_Y);
        giveBall(room, o.end); g.restart = "Tiro de meta";
        msgs.push(`Tiro de meta para ${turnName(room)}.`);
      }
    } else if (res.foul) {
      foul = "bateu numa tampinha adversária antes da bola";
      giveBall(room, other); g.restart = "Falta";
      msgs.push(`Falta de ${names}: ${foul}. Bola para ${turnName(room)}.`);
      log(room, `🚫 Falta de ${names}.`);
    } else if (g.toques >= g.maxToques) {
      const max = g.maxToques;
      giveBall(room, other);
      msgs.push(max === 1 ? `Saída: só 1 toque. Vez de ${turnName(room)}.` : `Acabaram os ${max} toques. Vez de ${turnName(room)}.`);
    } else {
      const next = nameOf(room, shooterOf(room));
      msgs.push(next === names ? `${names} continua (${g.toques} de ${g.maxToques} toques).` : `${names} tocou para ${next} (${g.toques} de ${g.maxToques}).`);
    }
    g.note = { id: g.step, msgs, foul, banner, at: g.busyUntil };
    armClock(room);
  }
  const turnName = (room) => nameOf(room, shooterOf(room));
  function restartAt(g, x, y) {
    const b = F.placeBall(g.pieces, x, y);
    g.pieces[0] = { ...g.pieces[0], x: b.x, y: b.y };
  }
  // ---------- relógio da jogada ----------
  function armTurn(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.turnTimer); room.deadline = null; return; }
    const who = shooterOf(room);
    const key = `${who}|${g.turn}|${g.step}|${room.match.gameNo}|${room.match.sides.join()}`;
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
      giveBall(room, 1 - g2.turn);
      g2.restart = null;
      g2.note = { id: g2.step, msgs: [`${nameOf(room, who)} demorou demais. Bola para ${turnName(room)}.`], foul: "tempo", at: Date.now() };
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
      const used = new Set(Object.values(room.players).map((p) => p.pawn)), kits = new Set(Object.values(room.players).map((p) => p.kit));
      const id = rid(6);
      const t0 = room.order.filter((x) => room.players[x].team === 0).length, t1 = room.order.length - t0;
      // começa com uma camisa que ninguém está usando (dá para trocar para a mesma de outro depois)
      room.players[id] = { id, name, token: rid(), pawn: PAWNS.find((x) => !used.has(x)), kit: KITS.find((k) => !kits.has(k)) || KITS[0], form: "2-2", team: t0 <= t1 ? 0 : 1, wins: 0, sockets: new Set() };
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
      log(room, `Mesa montada por ${name}.`);
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
      if (type === "kit") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!KITS.includes(data.kit)) return "Camisa inválida.";
        me.kit = data.kit; return;
      }
      if (type === "form") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!FORMS.includes(data.form)) return "Formação inválida.";
        // nos times, a formação é do time inteiro; cada um por si, é só a sua
        for (const p of Object.values(room.players)) if (p === me || (room.config.mode === "times" && p.team === me.team)) p.form = data.form;
        return;
      }
      if (type === "team") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        const id = data.id && isHost ? data.id : me.id, p = room.players[id];
        if (!p) return "Jogador inválido.";
        p.team = p.team ? 0 : 1;
        if (room.config.mode === "times") { const mate = Object.values(room.players).find((x) => x !== p && x.team === p.team); if (mate) p.form = mate.form; } // entra na formação do time novo
        return;
      }
      if (type === "shuffleTeams") {
        if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
        shuffle([...room.order]).forEach((id, i) => (room.players[id].team = i % 2));
        log(room, "🎲 Times sorteados."); return;
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
        if (cfg.mode === "times") {
          const a = room.order.filter((id) => room.players[id].team === 0), b = room.order.filter((id) => room.players[id].team === 1);
          if (!a.length || !b.length) return "Cada time precisa de pelo menos 1 jogador.";
          if (a.length > MAX_TEAM || b.length > MAX_TEAM) return `Cada time pode ter até ${MAX_TEAM} jogadores.`;
          room.tour = { kind: "times" };
          startMatch(room, [shuffle(a), shuffle(b)], `${a.length}x${b.length}`);
        } else if (n === 2) {
          room.tour = { kind: "serie" };
          startMatch(room, shuffle([[room.order[0]], [room.order[1]]]), "");
        } else if (cfg.format === "mata") {
          if (n !== 4 && n !== 8) return "Mata-mata precisa de 4 ou 8 jogadores. Com outra quantidade, use o Rei do campo.";
          const ids = shuffle([...room.order]), r0 = [];
          for (let i = 0; i < n; i += 2) r0.push({ a: ids[i], b: ids[i + 1], w: null });
          room.tour = { kind: "mata", rounds: [r0], r: 0, m: 0 };
          mataMatch(room);
        } else {
          const q = shuffle([...room.order]);
          room.tour = { kind: "rei", queue: q, streak: 0, last: null };
          startMatch(room, [[q[0]], [q[1]]], "Rei do campo");
        }
        return;
      }
      if (type === "next") {
        if (!isHost || room.phase !== "gameEnd" || !room.nextFn) return "Só o organizador adianta.";
        clearTimeout(room.nextTimer); const f = room.nextFn; room.nextFn = null; f(); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.nextTimer); clearTimeout(room.turnTimer); clearTimeout(room.clockTimer);
        room.phase = "lobby"; room.g = null; room.match = null; room.tour = null; room.result = null; room.champion = null; room.deadline = null; room.nextAt = null; room.nextFn = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      // ---- jogo ----
      if (type === "shoot") {
        if (room.phase !== "playing") return "O jogo não está em andamento.";
        if (Date.now() < room.g.busyUntil) return "Espere as peças pararem.";
        if (shooterOf(room) !== me.id) return "Não é a sua vez.";
        const f = cleanFlick(room, data);
        if (f.err) return f.err;
        if (f.p < 0.03) return "Puxe a tampinha para chutar.";
        play(room, [f], [me.id]);
        return;
      }
      return "Ação desconhecida.";
    }

    // Mira ao vivo: quem está jogando manda a tampinha escolhida e o quanto puxou, e os outros veem a seta.
    socket.on("aim", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "playing" || shooterOf(room) !== me.id) return;
      const now = Date.now();
      if (now - (me.lastAim || 0) < 40) return;
      me.lastAim = now;
      const a = num(d.a), p = num(d.p), place = d.place && Number.isFinite(num(d.place.x)) && Number.isFinite(num(d.place.y)) ? { x: num(d.place.x), y: num(d.place.y) } : null;
      socket.to(room.code).emit("aim", { who: me.id, i: clamp(int(d.i, -1), -1, 2 * 7), a: Number.isFinite(a) ? a : 0, p: Number.isFinite(p) ? clamp(p, 0, 1) : 0, place });
    });
    // Goleiro: qualquer um do time mexe o seu a qualquer hora em que as peças estão paradas, inclusive enquanto o
    // adversário mira. No peteleco ele fica onde estava: a jogada é calculada na hora, então não dá para defender
    // "no reflexo" com a bola andando, e o atraso da internet não importa.
    socket.on("keeper", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "playing" || !room.g || !room.config.goleiro) return;
      const g = room.g, side = sideOf(room, me.id), y = num(d.y);
      if (side < 0 || Date.now() < g.busyUntil || !Number.isFinite(y)) return;
      const now = Date.now();
      if (now - (me.lastKeeper || 0) < 40) return;
      me.lastKeeper = now;
      g.keepers[side] = F.clampKeeper(y);
      socket.to(room.code).emit("keeper", { side, y: g.keepers[side] });
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
    for (const [code, r] of rooms) if (now - r.t > 12 * 3600e3) { clearTimeout(r.turnTimer); clearTimeout(r.nextTimer); clearTimeout(r.clockTimer); rooms.delete(code); }
  }, 3600e3).unref?.();
};
module.exports.PAWNS = PAWNS;
module.exports.KITS = KITS;
module.exports.REACTIONS = REACTIONS;
