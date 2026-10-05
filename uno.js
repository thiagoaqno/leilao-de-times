// Uno da Galera — jogo de cartas com as regras oficiais, de 2 a 8 jogadores.
// Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/uno").
// Todas as regras ficam aqui. Cada jogador recebe só as próprias cartas; dos outros, só quantas têm.
const R = require("./public/uno/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const MAX_PLAYERS = 8, HAND = 7;
const TURN_MS = +process.env.UNO_TURN_MS || 30000, TURN_MS_OFFLINE = Math.min(TURN_MS, 10000);
const NEXT_ROUND_MS = 12000; // intervalo entre rodadas (o organizador pode adiantar)
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachUno(io) {
  const nsp = io.of("/uno");
  const rooms = new Map();

  function cleanConfig(c = {}) {
    return {
      target: [0, 200, 500].includes(int(c.target, 500)) ? int(c.target, 500) : 500, // 0 = rodada única
      stack: !!c.stack, // regra da casa: acumular +2 e +4 (sem desafio do +4); +2 também cobre +4
      multi: c.multi !== false, // regra da casa: jogar cartas iguais juntas (dois 4, dois Bloqueios…)
    };
  }

  // ---------- estado ----------
  function publicState(room) {
    const g = room.g;
    const players = room.order.map((id) => {
      const p = room.players[id];
      return { id, name: p.name, pawn: p.pawn, score: p.score, online: p.sockets.size > 0, count: g ? g.hands[id].length : 0, uno: g ? !!g.said[id] && g.hands[id].length === 1 : false };
    });
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, players, round: room.roundNo, winner: room.winner,
      turn: g && room.phase === "playing" ? room.order[g.turn] : null, dir: g ? g.dir : 1, color: g ? g.color : null,
      top: g ? g.discard[g.discard.length - 1] : null, under: g ? g.discard.slice(-4, -1) : [], drawCount: g ? g.draw.length : 0, discardCount: g ? g.discard.length : 0,
      stack: g ? g.stack : 0, stackType: g ? g.stackType : null, challenge: g && g.challenge ? { victim: g.challenge.victim, by: g.challenge.by } : null,
      drew: g ? !!g.drew : false, unoPending: g ? g.unoPending : null,
      result: room.result || null, fx: g ? g.fx : [], deadline: room.deadline ? { who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null,
      nextAt: room.nextAt || null, log: room.log.slice(-40), seq: room.seq, now: Date.now(),
    };
  }
  // Cada um recebe o estado público mais a própria mão (e qual carta acabou de comprar).
  function broadcast(room) {
    armTurn(room);
    room.seq++; room.t = Date.now();
    const pub = publicState(room);
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const pid = s.data.pid, g = room.g;
      s.emit("state", pid && g && g.hands[pid] ? { ...pub, hand: g.hands[pid], drewId: room.order[g.turn] === pid && g.drew ? g.drew : null } : pub);
    }
  }
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const fx = (room, o) => { const g = room.g; g.fx.push({ id: ++g.fxSeq, ...o }); if (g.fx.length > 40) g.fx.splice(0, g.fx.length - 40); };

  // ---------- rodada ----------
  const n = (room) => room.order.length;
  const idxAfter = (room, i, steps = 1) => ((i + room.g.dir * steps) % n(room) + n(room)) % n(room);
  function drawCards(room, pid, k) {
    const g = room.g, got = [];
    for (let j = 0; j < k; j++) {
      if (!g.draw.length) {
        // monte acabou: embaralha o descarte (menos a carta de cima)
        const top = g.discard.pop();
        g.draw = shuffle(g.discard.map((c) => (c.c === "w" ? { ...c } : c)));
        g.discard = [top];
        if (!g.draw.length) break;
        log(room, "🔀 O monte acabou: o descarte foi embaralhado.");
      }
      got.push(g.draw.pop());
    }
    g.hands[pid].push(...got);
    if (g.hands[pid].length > 1) { g.said[pid] = false; g.armed[pid] = false; }
    if (got.length) fx(room, { kind: "draw", pid, n: got.length });
    return got;
  }
  function startRound(room) {
    room.roundNo++;
    room.dealer = (room.dealer + 1) % room.order.length;
    const g = room.g = { hands: {}, draw: shuffle(R.newDeck()), discard: [], turn: 0, dir: 1, color: null, stack: 0, stackType: null, challenge: null, drew: null, said: {}, armed: {}, unoPending: null, fx: [], fxSeq: room.g ? room.g.fxSeq : 0, step: 0 };
    for (const id of room.order) g.hands[id] = [];
    for (let k = 0; k < HAND; k++) for (const id of room.order) g.hands[id].push(g.draw.pop());
    fx(room, { kind: "deal" });
    // primeira carta: um +4 volta para o monte; as outras valem como se o carteador tivesse jogado
    let first = g.draw.pop();
    while (first.v === "+4") { g.draw.unshift(first); shuffle(g.draw); first = g.draw.pop(); }
    g.discard.push(first);
    g.turn = idxAfter(room, room.dealer);
    g.color = first.c === "w" ? R.COLORS[Math.floor(Math.random() * 4)] : first.c;
    room.phase = "playing"; room.result = null; room.nextAt = null;
    log(room, `🃏 Rodada ${room.roundNo}! Carta da mesa: ${R.cardName(first)}${first.c === "w" ? ` (cor sorteada: ${R.COLOR_NAMES[g.color]})` : ""}.`);
    const who = room.order[g.turn];
    if (first.v === "skip") { fx(room, { kind: "skip", pid: who }); log(room, `🚫 ${nameOf(room, who)} começa bloqueado.`); g.turn = idxAfter(room, g.turn); }
    else if (first.v === "rev" && n(room) > 2) { g.dir = -1; g.turn = idxAfter(room, room.dealer); fx(room, { kind: "rev", dir: -1 }); log(room, "🔄 A roda começa invertida."); }
    else if (first.v === "rev") { fx(room, { kind: "skip", pid: who }); g.turn = idxAfter(room, g.turn); }
    else if (first.v === "+2") {
      if (room.config.stack) { g.stack = 2; g.stackType = "+2"; }
      else { drawCards(room, who, 2); log(room, `${nameOf(room, who)} começa comprando 2.`); g.turn = idxAfter(room, g.turn); }
    }
    g.step++;
  }
  function endRound(room, winner) {
    const g = room.g;
    let pts = 0;
    const hands = {};
    for (const id of room.order) { hands[id] = g.hands[id]; if (id !== winner) pts += g.hands[id].reduce((a, c) => a + R.points(c), 0); }
    room.players[winner].score += pts;
    room.result = { winner, points: pts, hands, scores: Object.fromEntries(room.order.map((id) => [id, room.players[id].score])) };
    fx(room, { kind: "win", pid: winner, points: pts });
    log(room, `🏆 ${nameOf(room, winner)} bateu e fez ${pts} pontos!`);
    const t = room.config.target;
    if (!t || room.players[winner].score >= t) {
      room.phase = "ended";
      room.winner = room.order.slice().sort((a, b) => room.players[b].score - room.players[a].score)[0];
      noite.vitoria("uno", room.code, nomesDe(room, [room.winner]), nomesDe(room, room.order.filter((id) => id !== room.winner)));
      log(room, `🎉 ${nameOf(room, room.winner)} venceu ${t ? `com ${room.players[room.winner].score} pontos` : "a partida"}!`);
    } else {
      room.phase = "roundEnd";
      room.nextAt = Date.now() + NEXT_ROUND_MS;
      clearTimeout(room.nextTimer);
      room.nextTimer = setTimeout(() => { if (room.phase === "roundEnd") { startRound(room); broadcast(room); } }, NEXT_ROUND_MS);
    }
  }

  // Jogar uma ou mais cartas iguais (regra da casa). Já validado: é a vez de pid, a primeira carta
  // pode ser jogada e as outras têm o mesmo valor. A última que cai define a cor da mesa, e os
  // efeitos somam: dois Bloqueios pulam dois, dois +2 dão +4, dois Inverter se anulam.
  function play(room, pid, cards, color) {
    const g = room.g, hand = g.hands[pid];
    const prevColor = g.color, k = cards.length, last = cards[k - 1];
    for (const card of cards) {
      hand.splice(hand.findIndex((c) => c.id === card.id), 1);
      g.discard.push(card);
      fx(room, { kind: "play", pid, card, color: card.c === "w" ? color : card.c });
    }
    g.color = last.c === "w" ? color : last.c;
    g.drew = null;
    log(room, `${nameOf(room, pid)} jogou ${k > 1 ? `${k} cartas juntas: ${cards.map(R.cardName).join(", ")}` : R.cardName(last)}${last.c === "w" ? ` e escolheu ${R.COLOR_NAMES[g.color]}` : ""}.`);
    // UNO: quem apertou UNO antes de jogar a penúltima carta grita agora, ao ficar com 1
    if (hand.length === 1 && g.armed[pid] && !g.said[pid]) { g.said[pid] = true; fx(room, { kind: "uno", pid }); log(room, `📣 ${nameOf(room, pid)}: UNO!`); }
    g.armed[pid] = false;
    // quem ficou com 1 carta sem gritar pode ser pego até o próximo jogador agir
    if (hand.length > 1) g.said[pid] = false;
    if (hand.length === 1 && !g.said[pid]) g.unoPending = pid;
    const me = g.turn, next = idxAfter(room, me), nextId = room.order[next];
    const out = hand.length === 0;
    switch (last.v) {
      case "skip": {
        const skipped = [];
        for (let j = 1; j <= k; j++) skipped.push(room.order[idxAfter(room, me, j)]);
        for (const id of skipped) fx(room, { kind: "skip", pid: id });
        log(room, `🚫 ${[...new Set(skipped)].map((id) => nameOf(room, id)).join(" e ")} ${skipped.length > 1 ? "foram bloqueados" : "foi bloqueado"}.`);
        g.turn = idxAfter(room, me, k + 1); break;
      }
      case "rev":
        if (n(room) === 2) { fx(room, { kind: "skip", pid: nextId }); g.turn = idxAfter(room, me, k + 1); }
        else {
          if (k % 2) g.dir *= -1;
          fx(room, { kind: "rev", dir: g.dir }); log(room, k % 2 ? "🔄 Inverteu o sentido!" : "🔄 Inverteu duas vezes: o sentido continua o mesmo.");
          g.turn = idxAfter(room, me);
        }
        break;
      case "+2":
        if (room.config.stack) { g.stack += 2 * k; g.stackType = "+2"; g.turn = next; fx(room, { kind: "stack", pid: nextId, n: g.stack }); }
        else { drawCards(room, nextId, 2 * k); fx(room, { kind: "plus", pid: nextId, n: 2 * k }); log(room, `${nameOf(room, nextId)} comprou ${2 * k} e perdeu a vez.`); g.turn = idxAfter(room, me, 2); }
        break;
      case "+4":
        if (room.config.stack) { g.stack += 4; g.stackType = "+4"; g.turn = next; fx(room, { kind: "stack", pid: nextId, n: g.stack }); }
        else if (out) { drawCards(room, nextId, 4); fx(room, { kind: "plus", pid: nextId, n: 4 }); }
        else {
          // quem recebe pode desafiar: o +4 só vale se quem jogou não tinha carta da cor da mesa
          g.challenge = { victim: nextId, by: pid, guilty: hand.some((c) => c.c === prevColor), prevColor };
          g.turn = next;
        }
        break;
      default:
        g.turn = next;
    }
    g.step++;
    if (out && g.stack) { drawCards(room, room.order[g.turn], g.stack); fx(room, { kind: "plus", pid: room.order[g.turn], n: g.stack }); g.stack = 0; g.stackType = null; } // o acúmulo conta nos pontos
    if (out) endRound(room, pid);
  }
  function advance(room) { const g = room.g; g.turn = idxAfter(room, g.turn); g.drew = null; g.step++; }
  // Dá para ficar com 1 carta nesta jogada? Com 2 cartas: precisa ter uma que sirva na mesa.
  // Com 3 (só com "cartas iguais juntas" ligado): precisa de um par igual em que a primeira sirva.
  function canReachOne(room, pid) {
    const g = room.g, hand = g.hands[pid], top = g.discard[g.discard.length - 1];
    const fits = (c) => R.canPlay(c, top, g.color, g.stack, g.stackType) && (!g.drew || c.id === g.drew);
    if (g.challenge) return false;
    if (hand.length === 2) return hand.some(fits);
    if (hand.length === 3 && room.config.multi && !g.drew) return hand.some((c) => fits(c) && c.c !== "w" && hand.some((o) => o !== c && o.c !== "w" && o.v === c.v));
    return false;
  }
  // Quando o próximo jogador age, acaba a chance de pegar quem esqueceu o UNO.
  function closeUno(room, pid) { if (room.g.unoPending && room.g.unoPending !== pid) room.g.unoPending = null; }

  // Comprar: paga o acúmulo, ou compra 1 (se a carta servir, pode jogar; senão a vez passa).
  function drawAction(room, pid) {
    const g = room.g;
    if (g.stack) {
      const k = g.stack;
      drawCards(room, pid, k); fx(room, { kind: "plus", pid, n: k });
      log(room, `${nameOf(room, pid)} comprou ${k} acumuladas.`);
      g.stack = 0; g.stackType = null; advance(room); return;
    }
    const [c] = drawCards(room, pid, 1);
    if (c && R.canPlay(c, g.discard[g.discard.length - 1], g.color)) { g.drew = c.id; g.step++; log(room, `${nameOf(room, pid)} comprou uma carta que serve.`); }
    else { log(room, `${nameOf(room, pid)} comprou e passou.`); advance(room); }
  }
  function resolveChallenge(room, doIt) {
    const g = room.g, c = g.challenge;
    g.challenge = null;
    if (!doIt) {
      drawCards(room, c.victim, 4); fx(room, { kind: "plus", pid: c.victim, n: 4 });
      log(room, `${nameOf(room, c.victim)} aceitou o +4 e perdeu a vez.`);
      advance(room); return;
    }
    if (c.guilty) {
      drawCards(room, c.by, 4); fx(room, { kind: "caught", pid: c.by, by: c.victim, n: 4 });
      log(room, `⚖️ Desafio certo! ${nameOf(room, c.by)} tinha ${R.COLOR_NAMES[c.prevColor]} e comprou 4. ${nameOf(room, c.victim)} joga normal.`);
      g.step++;
    } else {
      drawCards(room, c.victim, 6); fx(room, { kind: "plus", pid: c.victim, n: 6 });
      log(room, `⚖️ Desafio errado! ${nameOf(room, c.by)} não tinha ${R.COLOR_NAMES[c.prevColor]}. ${nameOf(room, c.victim)} comprou 6 e perdeu a vez.`);
      advance(room);
    }
  }

  // ---------- relógio da jogada ----------
  function armTurn(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.turnTimer); room.deadline = null; return; }
    const who = room.order[g.turn], key = `${who}|${g.step}`;
    if (room.deadline && room.deadline.key === key && !room.forceArm) return;
    room.forceArm = false;
    clearTimeout(room.turnTimer);
    const ms = room.players[who].sockets.size ? TURN_MS : TURN_MS_OFFLINE;
    room.deadline = { who, key, at: Date.now() + ms, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      const g2 = room.g, p = room.order[g2.turn];
      log(room, `⏱️ ${nameOf(room, p)} demorou.`);
      closeUno(room, p);
      if (g2.challenge) resolveChallenge(room, false);
      else if (g2.drew) { log(room, `${nameOf(room, p)} passou a vez.`); advance(room); }
      else { drawAction(room, p); if (g2.drew) advance(room); }
      broadcast(room);
    }, ms + 100);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const used = new Set(Object.values(room.players).map((p) => p.pawn));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: R.PAWNS.find((x) => !used.has(x)), score: 0, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], g: null, dealer: -1, roundNo: 0, result: null, winner: null, log: [], seq: 0, t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Mesa criada por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Mesa não encontrada. Confira o código (se o servidor reiniciou, a mesa se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch || room.phase !== "lobby") {
        if (!data.watch) return fail(cb, "O jogo já começou. Você pode entrar para assistir.");
        bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room);
      }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX_PLAYERS) return fail(cb, `A mesa já tem ${MAX_PLAYERS} jogadores. Você pode entrar para assistir.`);
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na mesa.");
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
      const type = data.type, isHost = me && room.host === me.id, g = room.g;
      // ---- sala de espera ----
      if (type === "pawn") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!R.PAWNS.includes(data.pawn)) return "Avatar inválido.";
        if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outra pessoa.";
        me.pawn = data.pawn; return;
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
        if (room.order.length < 2) return "Precisa de pelo menos 2 jogadores.";
        shuffle(room.order);
        for (const id of room.order) room.players[id].score = 0;
        room.roundNo = 0; room.dealer = -1; room.winner = null;
        log(room, `🎉 Começou! Ordem: ${room.order.map((id) => nameOf(room, id)).join(" → ")}.`);
        startRound(room); return;
      }
      if (type === "next") {
        if (!isHost || room.phase !== "roundEnd") return "Só o organizador adianta a próxima rodada.";
        clearTimeout(room.nextTimer); startRound(room); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.nextTimer); clearTimeout(room.turnTimer);
        room.phase = "lobby"; room.g = null; room.result = null; room.winner = null; room.deadline = null; room.nextAt = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";

      // ---- UNO! e Pegou! (a qualquer hora da rodada) ----
      if (type === "uno") {
        if (room.phase !== "playing") return "Agora não.";
        const k = g.hands[me.id].length;
        const myTurn = room.order[g.turn] === me.id;
        if (!(k === 1 || (myTurn && canReachOne(room, me.id)))) return "Só dá para gritar UNO quando você vai mesmo ficar com 1 carta nesta jogada.";
        if (g.said[me.id]) return "Você já gritou UNO!";
        if (k > 1) { // ainda vai jogar a penúltima: o grito fica guardado e só vale (e aparece) quando ficar com 1 carta
          if (g.armed[me.id]) return "O UNO já está guardado. Ele vale quando você ficar com 1 carta.";
          g.armed[me.id] = true;
          return;
        }
        g.said[me.id] = true;
        if (g.unoPending === me.id) g.unoPending = null;
        fx(room, { kind: "uno", pid: me.id });
        log(room, `📣 ${me.name}: UNO!`);
        return;
      }
      if (type === "catch") {
        if (room.phase !== "playing" || !g.unoPending || g.unoPending === me.id) return "Não tem ninguém para pegar agora.";
        const t = g.unoPending;
        g.unoPending = null;
        drawCards(room, t, 2);
        fx(room, { kind: "caughtUno", pid: t, by: me.id });
        log(room, `🫵 ${me.name} pegou ${nameOf(room, t)} sem gritar UNO! Comprou 2.`);
        return;
      }

      if (room.phase !== "playing") return "A rodada não está em andamento.";
      if (room.order[g.turn] !== me.id) return "Não é a sua vez.";

      if (type === "play") {
        if (g.challenge) return "Primeiro decida: desafiar ou aceitar o +4.";
        // uma carta (id) ou várias iguais (ids, na ordem em que caem; a primeira precisa servir)
        const ids = Array.isArray(data.ids) ? [...new Set(data.ids.map((x) => int(x, -1)))].slice(0, 8) : [int(data.id, -1)];
        const cards = ids.map((id) => g.hands[me.id].find((c) => c.id === id));
        if (!cards.length || cards.some((c) => !c)) return "Essa carta não está na sua mão.";
        const card = cards[0];
        if (cards.length > 1) {
          if (!room.config.multi) return "Nesta mesa não vale jogar cartas iguais juntas.";
          if (g.drew) return "Depois de comprar, só dá para jogar a carta comprada.";
          if (cards.some((c) => c.c === "w" || c.v !== card.v)) return "Só dá para jogar juntas cartas iguais (e coringa não entra).";
        }
        if (g.drew && card.id !== g.drew) return "Depois de comprar, só dá para jogar a carta comprada (ou passar).";
        if (!R.canPlay(card, g.discard[g.discard.length - 1], g.color, g.stack, g.stackType)) return g.stack ? `Tem ${g.stack} acumuladas: jogue um +2 ou +4, ou compre.` : "Essa carta não combina com a da mesa.";
        if (card.c === "w" && !R.COLORS.includes(data.color)) return "Escolha uma cor.";
        closeUno(room, me.id);
        play(room, me.id, cards, data.color);
        return;
      }
      if (type === "draw") {
        if (g.challenge) return "Primeiro decida: desafiar ou aceitar o +4.";
        if (g.drew) return "Você já comprou. Jogue a carta comprada ou passe.";
        closeUno(room, me.id);
        drawAction(room, me.id); return;
      }
      if (type === "pass") {
        if (!g.drew) return "Compre uma carta antes de passar.";
        advance(room); log(room, `${me.name} passou.`); return;
      }
      if (type === "challenge" || type === "accept") {
        if (!g.challenge || g.challenge.victim !== me.id) return "Não tem +4 para desafiar.";
        closeUno(room, me.id);
        resolveChallenge(room, type === "challenge"); return;
      }
      return "Ação desconhecida.";
    }

    // Reação com emoji: vai direto para a mesa, sem mexer no estado do jogo.
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

  // mesas paradas há mais de 12 horas somem
  limparSalasParadas(rooms, { aoApagar: (r) => { clearTimeout(r.turnTimer); clearTimeout(r.nextTimer); } });
};
