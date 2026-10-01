// Truco da Galera — truco paulista (baralho limpo, manilha pela vira), para 2, 4 ou 6 jogadores em dois times.
// Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/truco").
// Cada jogador recebe só as próprias cartas (na mão de onze, o time que tem 11 vê as cartas do parceiro).
const crypto = require("crypto");
const R = require("./public/truco/regras.js");

const MAX_PLAYERS = 6, TARGET = 12;
const OFFLINE_MS = 8000, ROUND_PAUSE = 1500, HAND_PAUSE = 4000, GAME_PAUSE = 8000;
const rid = (n = 16) => crypto.randomBytes(n).toString("hex");
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachTruco(io) {
  const nsp = io.of("/truco");
  const rooms = new Map();

  function newCode() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c;
    do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
    return c;
  }
  function cleanConfig(c = {}) {
    return {
      games: [1, 2, 3].includes(int(c.games, 1)) ? int(c.games, 1) : 1, // partidas de 12 para ganhar
      timer: [20, 30, 45].includes(int(c.timer, 30)) ? int(c.timer, 30) : 30,
      signals: c.signals !== false,
    };
  }

  // ---------- estado ----------
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const teamOf = (room, id) => room.players[id].team;
  const teamIds = (room, t) => room.order.filter((id) => teamOf(room, id) === t);
  const teamName = (room, t) => { const ns = teamIds(room, t).map((id) => nameOf(room, id)); return ns.length > 1 ? ns.slice(0, -1).join(", ") + " e " + ns[ns.length - 1] : ns[0] || "?"; };
  const pl = (room, t, one, many) => (teamIds(room, t).length > 1 ? many : one); // concordância: "levou" / "levaram"
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  const fx = (room, o) => { room.fxSeq = (room.fxSeq || 0) + 1; room.fx.push({ id: room.fxSeq, at: Date.now(), ...o }); if (room.fx.length > 30) room.fx.splice(0, room.fx.length - 30); };

  function publicState(room) {
    const h = room.h;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, pawn: p.pawn, team: p.team, online: p.sockets.size > 0, count: h && h.hands[id] ? h.hands[id].length : 0 }; }),
      score: room.score, games: room.games, winner: room.winner ?? null,
      hand: h ? {
        no: h.no, dealer: room.order[h.dealer], vira: h.vira, manilha: h.mr, value: h.value, stage: h.stage, special: h.special,
        turn: h.stage === "play" ? room.order[h.turn] : null, raise: h.raise, lastRaiser: h.lastRaiser, onzeTeam: h.onzeTeam ?? null,
        rounds: h.rounds.map((rd) => ({ winner: rd.winner, by: rd.by || null, plays: rd.plays.map((p) => ({ pid: p.pid, card: p.hidden ? null : p.card, hidden: p.hidden })) })),
        pauseUntil: h.pauseUntil || 0, result: h.result || null,
      } : null,
      deadline: room.deadline ? { who: room.deadline.who, team: room.deadline.team, at: room.deadline.at, total: room.deadline.total } : null,
      nextAt: room.nextAt || null, fx: room.fx, log: room.log.slice(-40), now: Date.now(),
    };
  }
  // Cada um recebe o estado público mais a própria mão (e, na mão de onze, a do parceiro).
  function broadcast(room) {
    armTurn(room);
    room.t = Date.now();
    const pub = publicState(room), h = room.h;
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const pid = s.data.pid;
      if (!pid || !h || !h.hands[pid]) { s.emit("state", pub); continue; }
      const mine = h.special === "ferro" ? h.hands[pid].map((_, i) => ({ id: -1 - i, blind: true })) : h.hands[pid];
      let mates = null;
      if (h.special === "onze" && teamOf(room, pid) === h.onzeTeam) {
        mates = {};
        for (const id of room.order) if (id !== pid && teamOf(room, id) === h.onzeTeam) mates[id] = h.hands[id];
      }
      s.emit("state", { ...pub, myHand: mine, mates });
    }
  }

  // ---------- mão ----------
  const n = (room) => room.order.length;
  function startHand(room) {
    const prev = room.h;
    const dealer = prev ? (prev.dealer + 1) % n(room) : room.firstDealer;
    const deck = shuffle(R.newDeck()), hands = {};
    for (const id of room.order) hands[id] = [];
    for (let k = 0; k < 3; k++) for (let i = 1; i <= n(room); i++) hands[room.order[(dealer + i) % n(room)]].push(deck.pop());
    const vira = deck.pop(), [a, b] = room.score;
    const special = a === TARGET - 1 && b === TARGET - 1 ? "ferro" : a === TARGET - 1 || b === TARGET - 1 ? "onze" : null;
    room.h = {
      no: (prev ? prev.no : 0) + 1, dealer, hands, vira, mr: R.manilhaOf(vira), value: 1, lastRaiser: null, raise: null,
      mao: (dealer + 1) % n(room), turn: (dealer + 1) % n(room), rounds: [{ plays: [], winner: null, start: (dealer + 1) % n(room) }],
      special, onzeTeam: special === "onze" ? (a === TARGET - 1 ? 0 : 1) : null, stage: special === "onze" ? "onze" : "play", step: 0, pauseUntil: 0,
    };
    room.phase = "playing"; room.nextAt = null;
    fx(room, { kind: "deal", dealer: room.order[dealer] });
    log(room, `🃏 Mão ${room.h.no}: ${nameOf(room, room.order[dealer])} deu as cartas. Vira: ${room.h.vira.r}${R.SUIT_SYM[room.h.vira.s]}, manilha ${room.h.mr}.`);
    if (special === "onze") log(room, `✋ Mão de onze para ${teamName(room, room.h.onzeTeam)}: jogar vale 3, correr dá 1 ponto para o outro lado.`);
    if (special === "ferro") log(room, "🔩 Mão de ferro! Os dois times com 11: todo mundo joga no escuro, sem ver as próprias cartas.");
  }
  function endHand(room, team, pts, why) {
    const h = room.h;
    h.stage = "done"; h.raise = null;
    if (team >= 0) room.score[team] = Math.min(TARGET, room.score[team] + pts);
    h.result = { team, pts, why };
    fx(room, { kind: "hand", team, pts });
    log(room, team >= 0 ? `🏁 ${teamName(room, team)} ${pl(room, team, "levou", "levaram")} ${pts > 1 ? `${pts} pontos` : "1 ponto"} (${why}). Placar: ${room.score[0]} × ${room.score[1]}.` : `🤝 Tudo empatado: ninguém marcou.`);
    room.phase = "handEnd";
    let delay = HAND_PAUSE;
    if (team >= 0 && room.score[team] >= TARGET) {
      room.games[team]++;
      fx(room, { kind: "game", team });
      log(room, `🏆 ${teamName(room, team)} ${pl(room, team, "ganhou", "ganharam")} a partida!`);
      if (room.games[team] >= room.config.games) {
        room.phase = "ended"; room.winner = team; room.nextAt = null;
        log(room, `👑 ${teamName(room, team)} ${pl(room, team, "é o campeão", "são os campeões")}!`);
        return;
      }
      h.gameOver = true; delay = GAME_PAUSE;
    }
    room.nextAt = Date.now() + delay;
    clearTimeout(room.nextTimer);
    room.nextTimer = setTimeout(() => nextHand(room), delay);
  }
  function nextHand(room) {
    if (room.phase !== "handEnd") return;
    clearTimeout(room.nextTimer);
    if (room.h.gameOver) { room.score = [0, 0]; log(room, "🔄 Nova partida!"); }
    startHand(room); broadcast(room);
  }
  function play(room, me, data) {
    const h = room.h, pid = me.id, hand = h.hands[pid];
    let idx;
    if (h.special === "ferro") idx = int(data.idx, -1);
    else idx = hand.findIndex((c) => c.id === int(data.id, -999));
    if (idx < 0 || idx >= hand.length) return "Essa carta não está na sua mão.";
    const hidden = !!data.hidden;
    if (hidden && h.rounds.length === 1) return "Na primeira rodada não dá para jogar coberta.";
    const [card] = hand.splice(idx, 1);
    const rd = h.rounds[h.rounds.length - 1];
    rd.plays.push({ pid, card, hidden });
    h.step++;
    fx(room, { kind: "play", pid, card: hidden ? null : card, hidden });
    if (rd.plays.length < n(room)) { h.turn = (h.turn + 1) % n(room); return; }
    // fim da rodada
    let best = -1, bestPlay = null;
    for (const p of rd.plays) { const pw = p.hidden ? -1 : R.power(p.card, h.mr); if (pw > best) { best = pw; bestPlay = p; } }
    const teams = new Set(rd.plays.filter((p) => (p.hidden ? -1 : R.power(p.card, h.mr)) === best).map((p) => teamOf(room, p.pid)));
    rd.winner = best < 0 || teams.size > 1 ? -1 : teamOf(room, bestPlay.pid);
    rd.by = bestPlay ? bestPlay.pid : null;
    const k = h.rounds.length, ord = ["primeira", "segunda", "terceira"][k - 1];
    fx(room, { kind: "round", winner: rd.winner, by: rd.by, n: k });
    log(room, rd.winner === -1 ? `🤝 A ${ord} cangou (empatou).` : `✅ ${nameOf(room, rd.by)} fez a ${ord}.`);
    const w = R.handWinner(h.rounds.map((r) => r.winner));
    if (w !== null) return endHand(room, w, h.value, w >= 0 ? `${pl(room, w, "ganhou", "ganharam")} na ${ord}` : "empate");
    const start = room.order.indexOf(rd.by);
    h.rounds.push({ plays: [], winner: null, start });
    h.turn = start;
    h.pauseUntil = Date.now() + ROUND_PAUSE;
  }

  // ---------- relógio ----------
  function armTurn(room) {
    const h = room.h;
    if (room.phase !== "playing" || !h) { clearTimeout(room.turnTimer); room.deadline = null; return; }
    let who = null, team = null;
    if (h.stage === "onze") team = h.onzeTeam;
    else if (h.raise) team = 1 - h.raise.team;
    else who = room.order[h.turn];
    const key = `${h.no}|${h.step}|${h.stage}|${h.raise ? h.raise.to : 0}`;
    if (room.deadline && room.deadline.key === key) return;
    clearTimeout(room.turnTimer);
    const online = who ? room.players[who].sockets.size > 0 : room.order.some((id) => teamOf(room, id) === team && room.players[id].sockets.size);
    const ms = online ? room.config.timer * 1000 : OFFLINE_MS;
    const at = Math.max(Date.now(), h.pauseUntil || 0) + ms;
    room.deadline = { key, who, team, at, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      const h2 = room.h;
      if (h2.stage === "onze") { log(room, `⏱️ Demorou: ${teamName(room, h2.onzeTeam)} ${pl(room, h2.onzeTeam, "vai", "vão")} jogar a mão de onze.`); h2.value = 3; h2.stage = "play"; h2.step++; }
      else if (h2.raise) { log(room, `⏱️ Demoraram para responder: aceito.`); acceptRaise(room, null); }
      else {
        const pid = room.order[h2.turn], hand = h2.hands[pid];
        log(room, `⏱️ ${nameOf(room, pid)} demorou e jogou a carta mais fraca.`);
        let wi = 0;
        if (h2.special === "ferro") wi = Math.floor(Math.random() * hand.length);
        else hand.forEach((c, i) => { if (R.power(c, h2.mr) < R.power(hand[wi], h2.mr)) wi = i; });
        play(room, room.players[pid], { id: hand[wi].id, idx: wi });
      }
      broadcast(room);
    }, at - Date.now() + 150);
  }

  function acceptRaise(room, me) {
    const h = room.h, r = h.raise;
    h.value = r.to; h.lastRaiser = r.team; h.raise = null; h.step++;
    fx(room, { kind: "accept", pid: me ? me.id : null, value: h.value });
    if (me) log(room, `👍 ${me.name} aceitou. A mão vale ${h.value}.`);
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
      if (room.order.length >= MAX_PLAYERS) return fail(cb, `A mesa já tem ${MAX_PLAYERS} jogadores. Você pode entrar para assistir.`);
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
      // ---- sala de espera ----
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
        const a = room.order.filter((id) => room.players[id].team === 0), b = room.order.filter((id) => room.players[id].team === 1);
        if (![2, 4, 6].includes(room.order.length)) return "O truco é com 2, 4 ou 6 jogadores.";
        if (a.length !== b.length) return "Os dois times precisam ter o mesmo número de jogadores.";
        // lugares alternados: um de cada time
        shuffle(a); shuffle(b);
        room.order = a.flatMap((id, i) => [id, b[i]]);
        room.score = [0, 0]; room.games = [0, 0]; room.winner = null; room.h = null; room.fx = [];
        room.firstDealer = Math.floor(Math.random() * room.order.length);
        log(room, `🎉 Começou! ${teamName(room, 0)} contra ${teamName(room, 1)}.`);
        startHand(room); return;
      }
      if (type === "next") {
        if (!isHost || room.phase !== "handEnd") return "Só o organizador adianta.";
        nextHand(room); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.nextTimer); clearTimeout(room.turnTimer);
        room.phase = "lobby"; room.h = null; room.deadline = null; room.nextAt = null; room.winner = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      if (room.phase !== "playing") return "A mão não está em andamento.";
      const myTeam = me.team;

      if (type === "onze") {
        if (h.stage !== "onze" || myTeam !== h.onzeTeam) return "Não é hora disso.";
        if (data.play) { h.value = 3; h.stage = "play"; h.step++; fx(room, { kind: "onze", pid: me.id, play: true }); log(room, `✋ ${me.name}: vamos jogar a mão de onze (vale 3).`); }
        else { fx(room, { kind: "run", pid: me.id }); log(room, `🏃 ${me.name} correu da mão de onze.`); endHand(room, 1 - myTeam, 1, `${teamName(room, myTeam)} ${pl(room, myTeam, "correu", "correram")} da mão de onze`); }
        return;
      }
      if (type === "accept" || type === "run" || type === "raise") {
        const r = h.raise;
        if (!r || myTeam === r.team) return "Não tem pedido para responder.";
        if (type === "accept") { acceptRaise(room, me); return; }
        if (type === "run") {
          fx(room, { kind: "run", pid: me.id });
          log(room, `🏃 ${me.name} correu.`);
          endHand(room, r.team, h.value, `${teamName(room, myTeam)} ${pl(room, myTeam, "correu", "correram")} do ${R.RAISE_NAME[r.to].toLowerCase()}`);
          return;
        }
        const to = R.nextValue(r.to);
        if (to > TARGET) return "Não dá para aumentar mais.";
        h.value = r.to; h.lastRaiser = r.team;
        h.raise = { team: myTeam, to, by: me.id }; h.step++;
        fx(room, { kind: "raise", pid: me.id, to });
        log(room, `🗣️ ${me.name}: ${R.RAISE_NAME[to].toUpperCase()}!`);
        return;
      }
      if (h.stage !== "play") return "Espere a decisão da mão de onze.";
      if (room.order[h.turn] !== me.id) return "Não é a sua vez.";
      if (Date.now() < (h.pauseUntil || 0)) return "Calma, a rodada acabou de fechar.";
      if (type === "truco") {
        if (h.raise) return "Já tem um pedido na mesa.";
        if (h.special) return "Na mão de onze (e na de ferro) não tem truco.";
        if (h.lastRaiser === myTeam) return "Agora só o outro time pode aumentar.";
        const to = R.nextValue(h.value);
        if (to > TARGET) return "A mão já vale 12.";
        h.raise = { team: myTeam, to, by: me.id }; h.step++;
        fx(room, { kind: "raise", pid: me.id, to });
        log(room, `🗣️ ${me.name}: ${R.RAISE_NAME[to].toUpperCase()}!`);
        return;
      }
      if (type === "play") {
        if (h.raise) return "Espere a resposta do pedido.";
        return play(room, me, data);
      }
      return "Ação desconhecida.";
    }

    // Sinal para o parceiro: vai para a mesa toda, como na vida real (o adversário também vê, então dá para blefar).
    socket.on("signal", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || !room.config.signals || room.phase !== "playing" || !R.SIGNALS.some((s) => s.k === data.k)) return;
      const now = Date.now();
      if (now - (me.lastSig || 0) < 900) return;
      me.lastSig = now;
      nsp.to(room.code).emit("signal", { from: me.id, k: data.k });
    });
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
    for (const [code, r] of rooms) if (now - r.t > 12 * 3600e3) { clearTimeout(r.turnTimer); clearTimeout(r.nextTimer); rooms.delete(code); }
  }, 3600e3).unref?.();
};
