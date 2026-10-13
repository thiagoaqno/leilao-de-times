// Gatinhos Explosivos — jogo de cartas de sobrevivência, de 2 a 5 jogadores. Canal separado do Socket.io ("/kittens").
// Cada um joga quantas cartas quiser e termina a vez comprando do monte; quem compra um Gatinho Explosivo sem ter
// um Desarmar sai do jogo. Quem sobrar ganha. Cada jogador recebe só as próprias cartas; dos outros, só quantas têm.
const R = require("./public/kittens/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js"); // o placar da Noite da Galera
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const TURN_MS = +process.env.KITTENS_TURN_MS || 45000;     // a vez de cada um
const NOPE_MS = +process.env.KITTENS_NOPE_MS || 3500;      // a janela do "Nem Pensar" depois de cada jogada
const DEFUSE_MS = +process.env.KITTENS_DEFUSE_MS || 25000; // colocar o gatinho de volta no monte
const FAVOR_MS = +process.env.KITTENS_FAVOR_MS || 25000;   // escolher a carta de um favor
const OFFLINE_MS = 8000;                                   // quem caiu da sala não segura a mesa
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachKittens(io) {
  const nsp = io.of("/kittens");
  const rooms = new Map();
  require("./lobby.js").registrar("kittens", rooms, { max: R.MAX_JOGADORES }); // aparece na lista de salas da Vila

  // ---------- estado ----------
  function publicState(room) {
    const g = room.g;
    const players = room.order.map((id) => {
      const p = room.players[id];
      return { id, name: p.name, pawn: p.pawn, wins: p.wins, online: p.sockets.size > 0, alive: g ? g.alive.includes(id) : true, count: g ? g.hands[id].length : 0 };
    });
    return {
      code: room.code, host: room.host, phase: room.phase, players, winner: room.winner,
      turn: g && room.phase === "playing" ? g.turn : null, turnsLeft: g ? g.turnsLeft : 0,
      drawCount: g ? g.draw.length : 0, discard: g ? g.discard.slice(-6) : [], discardCount: g ? g.discard.length : 0,
      pending: g && g.pending ? { by: g.pending.by, kind: g.pending.kind, type: g.pending.type, cards: g.pending.cards, target: g.pending.target, named: g.pending.named, nopes: g.pending.nopes } : null,
      defuse: g && g.defuse ? { pid: g.defuse.pid, bomb: g.defuse.bomb, max: g.draw.length } : null,
      favor: g && g.favor ? { from: g.favor.from, to: g.favor.to } : null,
      fx: g ? g.fx : [], log: room.log.slice(-40), deadline: room.deadline ? { kind: room.deadline.kind, who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null,
      seq: room.seq, now: Date.now(),
    };
  }
  // Cada um recebe o estado público mais a própria mão, o que espiou e os avisos só dele.
  function broadcast(room) {
    armTimer(room);
    room.seq++; room.t = Date.now();
    const pub = publicState(room), g = room.g;
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const pid = s.data.pid;
      s.emit("state", pid && g && g.hands[pid] ? { ...pub, hand: g.hands[pid], peek: g.peek && g.peek.pid === pid ? g.peek.cards : null, notes: g.notes[pid] || [] } : pub);
    }
  }
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 150) room.log.splice(0, room.log.length - 150); }
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const fx = (room, o) => { const g = room.g; g.fx.push({ id: ++g.fxSeq, ...o }); if (g.fx.length > 40) g.fx.splice(0, g.fx.length - 40); };
  // aviso que só uma pessoa recebe (o que ela roubou, ganhou ou espiou)
  const note = (room, pid, text) => { const g = room.g, l = g.notes[pid] || (g.notes[pid] = []); l.push({ id: ++g.noteSeq, text }); if (l.length > 6) l.shift(); };

  // ---------- a mesa ----------
  const nextAlive = (room, pid) => {
    const g = room.g, i = room.order.indexOf(pid);
    for (let k = 1; k <= room.order.length; k++) { const id = room.order[(i + k) % room.order.length]; if (g.alive.includes(id)) return id; }
    return pid;
  };
  function passTurn(room, turns) {
    const g = room.g;
    g.peek = null;
    g.turn = nextAlive(room, g.turn); g.turnsLeft = turns;
    fx(room, { kind: "turn", pid: g.turn, turns });
  }
  // uma das vezes de quem joga acabou (se ele tinha duas por causa de um Ataque, a outra continua)
  function endTurn(room) {
    const g = room.g;
    g.peek = null;
    g.turnsLeft--;
    if (g.turnsLeft > 0) fx(room, { kind: "turn", pid: g.turn, turns: g.turnsLeft }); else passTurn(room, 1);
  }
  function takeTop(room) {
    const g = room.g;
    if (!g.draw.length) { g.draw = shuffle(g.discard.splice(0)); log(room, "🔀 O monte acabou: o descarte foi embaralhado."); }
    return g.draw.shift();
  }
  function eliminate(room, pid) {
    const g = room.g;
    g.discard.push(...g.hands[pid].splice(0));
    g.alive = g.alive.filter((id) => id !== pid);
    fx(room, { kind: "out", pid });
    log(room, `💥 ${nameOf(room, pid)} explodiu e saiu do jogo!`);
    if (g.alive.length === 1) return endGame(room, g.alive[0]);
    if (g.turn === pid) passTurn(room, 1);
  }
  function endGame(room, winner) {
    clearTimeout(room.timer); room.deadline = null;
    room.phase = "ended"; room.winner = winner;
    room.players[winner].wins++;
    fx(room, { kind: "win", pid: winner });
    log(room, `🏆 ${nameOf(room, winner)} sobreviveu e ganhou!`);
    noite.vitoria("kittens", room.code, nomesDe(room, [winner]), nomesDe(room, room.order.filter((id) => id !== winner)));
  }
  // comprar: termina a vez, a não ser que venha um Gatinho Explosivo
  function drawAction(room, pid) {
    const g = room.g, c = takeTop(room);
    if (c.t === "bomb") {
      fx(room, { kind: "bomb", pid });
      const hand = g.hands[pid], di = hand.findIndex((x) => x.t === "defuse");
      if (di < 0) { log(room, `😾 ${nameOf(room, pid)} comprou um Gatinho Explosivo e não tinha Desarmar!`); g.discard.push(c); eliminate(room, pid); return; }
      g.discard.push(...hand.splice(di, 1));
      g.defuse = { pid, bomb: c }; g.peek = null;
      fx(room, { kind: "defuse", pid });
      log(room, `🧯 ${nameOf(room, pid)} comprou um Gatinho Explosivo e usou o Desarmar!`);
      return;
    }
    g.hands[pid].push(c);
    fx(room, { kind: "draw", pid });
    endTurn(room);
  }
  // o Gatinho volta ao monte na posição `pos` (0 = o próximo a ser comprado); só quem desarmou sabe onde
  function placeBomb(room, pos) {
    const g = room.g, d = g.defuse;
    g.draw.splice(Math.max(0, Math.min(g.draw.length, pos)), 0, d.bomb);
    g.defuse = null; g.peek = null;
    log(room, `🤫 ${nameOf(room, d.pid)} colocou o Gatinho de volta no monte, em segredo.`);
    fx(room, { kind: "place", pid: d.pid });
    endTurn(room);
  }
  function giveCard(room, cardId) {
    const g = room.g, f = g.favor, from = g.hands[f.from];
    const i = cardId == null ? Math.floor(Math.random() * from.length) : from.findIndex((c) => c.id === cardId);
    const [c] = from.splice(i, 1);
    g.hands[f.to].push(c); g.favor = null;
    fx(room, { kind: "give", pid: f.from, to: f.to });
    log(room, `🤝 ${nameOf(room, f.from)} deu uma carta para ${nameOf(room, f.to)}.`);
    note(room, f.to, `${nameOf(room, f.from)} te deu: ${R.TIPOS[c.t].emoji} ${R.nomeDe(c)}.`);
  }

  // ---------- jogadas e o Nem Pensar ----------
  // Toda jogada fica pendente por uma janela curta: nela qualquer pessoa viva pode jogar Nem Pensar (e outro em cima).
  // Quando a janela fecha, número ímpar de Nem Pensar cancela a jogada.
  function resolvePending(room) {
    const g = room.g, p = g.pending, who = nameOf(room, p.by);
    g.pending = null;
    if (p.nopes % 2 === 1) { log(room, `🚫 A jogada de ${who} foi cancelada!`); fx(room, { kind: "cancel", pid: p.by }); return; }
    const alvo = p.target && g.alive.includes(p.target) ? p.target : null;
    if (p.kind === "carta") {
      switch (p.type) {
        case "attack": {
          const turns = 2 * g.turnsLeft;
          log(room, `⚔️ ${who} atacou! ${nameOf(room, nextAlive(room, p.by))} joga ${turns} vezes seguidas.`);
          fx(room, { kind: "attack", pid: p.by });
          passTurn(room, turns); break;
        }
        case "skip": log(room, `⏭️ ${who} pulou a vez sem comprar.`); fx(room, { kind: "skip", pid: p.by }); endTurn(room); break;
        case "shuffle": shuffle(g.draw); g.peek = null; log(room, `🔀 ${who} embaralhou o monte.`); fx(room, { kind: "shuffle", pid: p.by }); break;
        case "peek":
          g.peek = { pid: p.by, cards: g.draw.slice(0, 3) };
          log(room, `🔮 ${who} espiou o futuro.`); fx(room, { kind: "peek", pid: p.by }); break;
        case "favor":
          if (!alvo || !g.hands[alvo].length) { log(room, `🤝 ${who} pediu um favor, mas não tinha o que dar.`); break; }
          g.favor = { from: alvo, to: p.by };
          log(room, `🤝 ${who} pediu um favor a ${nameOf(room, alvo)}.`); fx(room, { kind: "favor", pid: p.by, to: alvo }); break;
      }
      return;
    }
    // gatos: par rouba uma carta sem ver, trio pede uma carta pelo nome
    if (!alvo) return;
    const mao = g.hands[alvo];
    if (p.kind === "par") {
      if (!mao.length) { log(room, `🐾 ${who} tentou roubar de ${nameOf(room, alvo)}, mas a mão estava vazia.`); return; }
      const [c] = mao.splice(Math.floor(Math.random() * mao.length), 1);
      g.hands[p.by].push(c);
      log(room, `🐾 ${who} roubou uma carta de ${nameOf(room, alvo)}!`); fx(room, { kind: "steal", pid: p.by, from: alvo });
      note(room, p.by, `Você roubou de ${nameOf(room, alvo)}: ${R.TIPOS[c.t].emoji} ${R.nomeDe(c)}.`);
      note(room, alvo, `${who} roubou de você: ${R.TIPOS[c.t].emoji} ${R.nomeDe(c)}.`);
      return;
    }
    const i = mao.findIndex((c) => c.t === p.named), nm = `${R.TIPOS[p.named].emoji} ${R.TIPOS[p.named].nome}`;
    if (i < 0) { log(room, `🐾🐾🐾 ${who} pediu ${nm} a ${nameOf(room, alvo)}, que não tinha.`); fx(room, { kind: "miss", pid: p.by, from: alvo }); return; }
    g.hands[p.by].push(...mao.splice(i, 1));
    log(room, `🐾🐾🐾 ${who} pediu ${nm} a ${nameOf(room, alvo)} e levou!`); fx(room, { kind: "steal", pid: p.by, from: alvo });
  }

  // ---------- relógio ----------
  // O que está esperando define o relógio: a janela do Nem Pensar, o Desarmar, o favor ou a vez de quem joga.
  // g.step muda a cada jogada, e é ele que zera o relógio.
  function armTimer(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.timer); room.deadline = null; return; }
    let kind, who = null, ms;
    if (g.pending) { kind = "nope"; ms = NOPE_MS; }
    else if (g.defuse) { kind = "defuse"; who = g.defuse.pid; ms = DEFUSE_MS; }
    else if (g.favor) { kind = "favor"; who = g.favor.from; ms = FAVOR_MS; }
    else { kind = "turn"; who = g.turn; ms = TURN_MS; }
    if (who && !room.players[who].sockets.size) ms = Math.min(ms, OFFLINE_MS);
    const key = `${kind}|${g.step}`;
    if (room.deadline && room.deadline.key === key) return;
    clearTimeout(room.timer);
    room.deadline = { key, kind, who, at: Date.now() + ms, total: ms };
    room.timer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      const g2 = room.g;
      if (kind === "nope") resolvePending(room);
      else if (kind === "defuse") placeBomb(room, Math.floor(Math.random() * (g2.draw.length + 1)));
      else if (kind === "favor") giveCard(room, null);
      else { log(room, `⏱️ ${nameOf(room, g2.turn)} demorou e comprou.`); drawAction(room, g2.turn); }
      g2.step++;
      broadcast(room);
    }, ms + 50);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const used = new Set(Object.values(room.players).map((p) => p.pawn));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: R.PAWNS.find((x) => !used.has(x)), wins: 0, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", players: {}, order: [], g: null, winner: null, log: [], seq: 0, t: Date.now() };
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
      if (room.order.length >= R.MAX_JOGADORES) return fail(cb, `A mesa já tem ${R.MAX_JOGADORES} jogadores. Você pode entrar para assistir.`);
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
      if (room.g) room.g.step++;
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
        const m = R.montarMesa(room.order.length, shuffle);
        room.g = { hands: {}, draw: m.monte, discard: [], alive: room.order.slice(), turn: room.order[0], turnsLeft: 1, pending: null, defuse: null, favor: null, peek: null, notes: {}, noteSeq: 0, fx: [], fxSeq: 0, step: 0 };
        room.order.forEach((id, i) => { room.g.hands[id] = m.maos[i]; });
        room.phase = "playing"; room.winner = null; room.deadline = null;
        fx(room, { kind: "deal" });
        log(room, `🎉 Começou! Ordem: ${room.order.map((id) => nameOf(room, id)).join(" → ")}. Tem ${room.order.length - 1} Gatinho${room.order.length > 2 ? "s" : ""} Explosivo${room.order.length > 2 ? "s" : ""} no monte.`);
        return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.timer);
        room.phase = "lobby"; room.g = null; room.winner = null; room.deadline = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      if (room.phase !== "playing") return "O jogo não está em andamento.";
      if (!g.alive.includes(me.id)) return "Você já explodiu. Agora é só assistir!";

      // ---- Nem Pensar: a qualquer hora em que tem uma jogada pendente ----
      if (type === "nope") {
        if (!g.pending) return "Não tem jogada para cancelar agora.";
        const i = g.hands[me.id].findIndex((c) => c.t === "nope");
        if (i < 0) return "Você não tem Nem Pensar.";
        g.discard.push(...g.hands[me.id].splice(i, 1));
        g.pending.nopes++;
        fx(room, { kind: "nope", pid: me.id });
        log(room, `🚫 ${me.name}: Nem Pensar! (${g.pending.nopes % 2 ? "a jogada está cancelada" : "a jogada volta a valer"})`);
        return;
      }
      // ---- escolhas fora da vez: dar a carta do favor e recolocar o gatinho ----
      if (type === "give") {
        if (!g.favor || g.favor.from !== me.id) return "Ninguém pediu um favor a você.";
        const id = int(data.id, -1);
        if (!g.hands[me.id].some((c) => c.id === id)) return "Essa carta não está na sua mão.";
        giveCard(room, id); return;
      }
      if (type === "place") {
        if (!g.defuse || g.defuse.pid !== me.id) return "Você não está com um Gatinho para recolocar.";
        placeBomb(room, int(data.pos, 0)); return;
      }

      if (g.turn !== me.id) return "Não é a sua vez.";
      if (g.pending || g.defuse || g.favor) return "Espere a jogada atual terminar.";

      if (type === "draw") { drawAction(room, me.id); return; }
      if (type === "play") {
        const ids = Array.isArray(data.ids) ? [...new Set(data.ids.map((x) => int(x, -1)))].slice(0, 3) : [int(data.id, -1)];
        const cards = ids.map((id) => g.hands[me.id].find((c) => c.id === id));
        if (!cards.length || cards.some((c) => !c)) return "Essa carta não está na sua mão.";
        const t0 = cards[0].t;
        let kind, named = null;
        if (cards.length === 1) {
          if (t0 === "nope") return "O Nem Pensar só serve para cancelar a jogada de outra pessoa.";
          if (t0 === "defuse") return "O Desarmar é usado sozinho quando você compra um Gatinho Explosivo.";
          if (R.ehGato(t0)) return "Um gato sozinho não faz nada: junte 2 ou 3 iguais.";
          kind = "carta";
        } else {
          if (!R.ehGato(t0) || cards.some((c) => c.t !== t0)) return "Só dá para jogar juntos gatos iguais.";
          kind = cards.length === 2 ? "par" : "trio";
          if (kind === "trio") { named = data.named; if (!R.NOMEAVEIS.includes(named)) return "Escolha qual carta pedir."; }
        }
        const needsTarget = kind !== "carta" || t0 === "favor";
        let target = null;
        if (needsTarget) {
          target = data.target;
          if (!target || target === me.id || !g.alive.includes(target)) return "Escolha uma pessoa que ainda está no jogo.";
          if (kind !== "trio" && !g.hands[target].length) return `${nameOf(room, target)} está sem cartas.`;
        }
        for (const c of cards) g.discard.push(...g.hands[me.id].splice(g.hands[me.id].indexOf(c), 1));
        g.pending = { by: me.id, kind, type: t0, cards, target, named, nopes: 0 };
        g.peek = null;
        fx(room, { kind: "play", pid: me.id, cards, target });
        const alvoTxt = target ? ` em ${nameOf(room, target)}` : "";
        log(room, `${me.name} jogou ${kind === "carta" ? `${R.TIPOS[t0].emoji} ${R.nomeDe(cards[0])}` : kind === "par" ? `um par de ${R.nomeDe(cards[0])}` : `um trio de ${R.nomeDe(cards[0])} (pede ${R.TIPOS[named].nome})`}${alvoTxt}.`);
        return;
      }
      return "Ação desconhecida.";
    }

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  // mesas paradas há mais de 12 horas somem
  limparSalasParadas(rooms, { aoApagar: (r) => clearTimeout(r.timer) });
  return { rooms };
};
