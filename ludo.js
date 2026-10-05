// Ludo da Galera — servidor. Canal "/ludo" do Socket.io.
// 2 a 4 jogadores, cada um com uma cor. Os dados são rolados aqui no servidor (ninguém escolhe o número).
// Com 2 dados (o padrão), cada dado é uma jogada: usa um num peão e o outro no mesmo ou em outro peão. Dobradinha
// (os dois iguais) joga de novo; três dobradinhas seguidas perdem a vez. Com 1 dado, é o ludo de sempre (6 joga de novo).
const R = require("./public/ludo/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const OFFLINE_MS = 8000; // quem caiu não segura a vez dos outros
const AUTO_MS = +process.env.LUDO_AUTO_MS || 650; // só tinha uma jogada: anda sozinho depois de mostrar o dado
const PASS_MS = +process.env.LUDO_PASS_MS || 1300; // não tinha jogada: mostra o dado e passa a vez
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🍻"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };

function cleanConfig(c = {}) {
  return {
    pawns: int(c.pawns, 4) === 2 ? 2 : 4,
    exit16: !!c.exit16, // sai da base com 1 ou 6 (normal: só com 6)
    barrier: !!c.barrier, // torre bloqueia a passagem
    timer: [20, 30, 45].includes(int(c.timer, 30)) ? int(c.timer, 30) : 30,
    dados: int(c.dados, 2) === 1 ? 1 : 2,
  };
}

module.exports = function attachLudo(io) {
  const nsp = io.of("/ludo");
  const rooms = new Map();

  const byColor = (room, color) => Object.values(room.players).find((p) => p.color === color);
  const nameOf = (room, color) => { const p = byColor(room, color); return p ? p.name : R.NAMES[color]; };
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 120) room.log.splice(0, room.log.length - 120); }

  // ---------- jogo ----------
  function startGame(room) {
    const colors = R.COLORS.filter((c) => byColor(room, c));
    const pawns = {};
    for (const c of colors) pawns[c] = Array(room.config.pawns).fill(-1);
    room.g = { colors, pawns, turn: Math.floor(Math.random() * colors.length), dice: null, restam: [], bonus: false, dobrou: false, sixes: 0, stage: "roll", legal: [], rollSeq: 0, moveSeq: 0, last: null, ranking: [] };
    room.phase = "playing"; room.winner = null;
    log(room, `🎲 Começou! ${nameOf(room, colors[room.g.turn])} joga primeiro.`);
    arm(room);
  }
  const turnColor = (g) => g.colors[g.turn];
  const done = (g, c) => g.pawns[c].every((p) => p >= R.FINISH);
  function nextTurn(room) {
    const g = room.g;
    g.sixes = 0;
    for (let k = 1; k <= g.colors.length; k++) {
      const i = (g.turn + k) % g.colors.length;
      if (!done(g, g.colors[i])) { g.turn = i; break; }
    }
    g.stage = "roll"; g.legal = []; g.dice = g.dice; // o último dado continua aparecendo até a próxima rolada
  }
  // rola os dados (1 ou 2). g.dice: os números tirados; g.restam: os que ainda não foram usados nesta rolada
  function roll(room) {
    const g = room.g, color = turnColor(g), n = room.config.dados;
    g.dice = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)); g.rollSeq++;
    g.restam = [...g.dice]; g.bonus = false;
    g.dobrou = n === 1 ? g.dice[0] === 6 : g.dice[0] === g.dice[1]; // joga de novo: 6 (com 1 dado) ou dobradinha (com 2)
    if (g.dobrou) g.sixes++;
    if (g.sixes === 3) { // três seguidos: perde a vez
      log(room, `😬 ${nameOf(room, color)} tirou ${n === 1 ? "três 6" : "três dobradinhas"} seguidos e perdeu a vez.`);
      g.stage = "pass"; g.legal = []; g.restam = [];
      return;
    }
    proximaJogada(room, true);
  }
  // jogadas possíveis com os dados que restam (cada uma diz qual dado usa: k). Dados iguais contam uma vez só.
  function jogadas(room) {
    const g = room.g, color = turnColor(g), out = [], vistos = new Set();
    g.restam.forEach((d, k) => { if (vistos.has(d)) return; vistos.add(d); for (const m of R.legalMoves(g.pawns, color, d, room.config)) out.push({ ...m, k, d }); });
    return out;
  }
  // depois de rolar ou de andar: escolhe o próximo passo (escolher peão, andar sozinho, passar ou acabar a vez)
  function proximaJogada(room, rolou) {
    const g = room.g;
    g.legal = g.restam.length ? jogadas(room) : [];
    if (!g.legal.length) {
      g.restam = [];
      if (rolou) { g.stage = "pass"; return; } // não deu para usar nenhum dado
      return fimDaVez(room);
    }
    // só tem um jeito de jogar (ou os peões que podem andar estão juntos na base): anda sozinho
    g.stage = g.legal.every((m) => m.from === g.legal[0].from && m.to === g.legal[0].to) ? "auto" : "move";
  }
  // acabaram os dados: joga de novo (6/dobradinha, comeu ou chegou em casa) ou passa a vez
  function fimDaVez(room) {
    const g = room.g, color = turnColor(g);
    if ((g.dobrou || g.bonus) && !done(g, color)) { g.stage = "roll"; g.legal = []; if (!g.dobrou) g.sixes = 0; }
    else nextTurn(room);
  }
  function move(room, m) {
    const g = room.g, color = turnColor(g);
    g.restam.splice(m.k, 1); // esse dado já foi
    const caught = R.victims(g.pawns, color, m.to);
    g.pawns[color][m.i] = m.to;
    for (const v of caught) g.pawns[v.color][v.i] = -1;
    g.moveSeq++;
    g.last = { color, i: m.i, from: m.from, to: m.to, caught: caught.map((v) => ({ ...v })), seq: g.moveSeq };
    if (caught.length) log(room, `💥 ${nameOf(room, color)} comeu ${caught.map((v) => nameOf(room, v.color)).join(" e ")}!`);
    const home = m.to === R.FINISH;
    if (home) log(room, `🏠 Um peão ${R.NAMES[color].toLowerCase()} chegou em casa.`);
    if (done(g, color) && !g.ranking.includes(color)) {
      g.ranking.push(color);
      log(room, g.ranking.length === 1 ? `🏆 ${nameOf(room, color)} levou todos os peões para casa e venceu!` : `${nameOf(room, color)} terminou em ${g.ranking.length}º.`);
    }
    const left = g.colors.filter((c) => !done(g, c));
    if (left.length <= 1) { // só sobrou um: acabou
      if (left.length) g.ranking.push(left[0]);
      room.phase = "ended"; room.winner = g.ranking[0]; g.stage = "over"; g.legal = [];
      noite.vitoria("ludo", room.code, nomesDe(room, room.order.filter((id) => room.players[id].color === room.winner)), nomesDe(room, room.order.filter((id) => room.players[id].color !== room.winner)));
      return;
    }
    // comeu alguém ou chegou em casa: ganha mais uma rolada (depois de usar os dados que sobraram)
    if (caught.length || home) g.bonus = true;
    if (done(g, color)) { g.restam = []; return nextTurn(room); }
    proximaJogada(room, false);
  }
  // jogada automática: come > chega em casa > sai da base > o peão mais adiantado
  function bestMove(room) {
    const g = room.g, color = turnColor(g);
    const score = (m) => (R.victims(g.pawns, color, m.to).length ? 1000 : 0) + (m.to === R.FINISH ? 500 : 0) + (m.from < 0 ? 300 : 0) + m.to;
    return [...g.legal].sort((a, b) => score(b) - score(a))[0];
  }
  function arm(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.timer); room.deadline = null; room.armKey = null; return; }
    const key = `${g.rollSeq}|${g.moveSeq}|${g.stage}|${g.turn}`;
    if (room.armKey === key) return; // a vez não mudou: o relógio continua de onde estava
    clearTimeout(room.timer);
    room.armKey = key;
    const p = byColor(room, turnColor(g)), online = p && p.sockets.size > 0;
    let ms;
    if (g.stage === "auto") ms = AUTO_MS;
    else if (g.stage === "pass") ms = PASS_MS;
    else ms = online ? room.config.timer * 1000 : OFFLINE_MS;
    room.deadline = g.stage === "roll" || g.stage === "move" ? { at: Date.now() + ms, total: ms, color: turnColor(g) } : null;
    room.timer = setTimeout(() => {
      if (room.phase !== "playing" || `${g.rollSeq}|${g.moveSeq}|${g.stage}|${g.turn}` !== key) return;
      if (g.stage === "roll") roll(room);
      else if (g.stage === "move" || g.stage === "auto") move(room, g.stage === "auto" ? g.legal[0] : bestMove(room));
      else if (g.stage === "pass") nextTurn(room);
      broadcast(room);
    }, ms);
  }

  function publicState(room) {
    const g = room.g;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, winner: room.winner || null,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, pawn: p.pawn, color: p.color, online: p.sockets.size > 0 }; }),
      game: g ? { colors: g.colors, pawns: g.pawns, turn: turnColor(g), dice: g.dice, restam: g.restam, sixes: g.sixes, stage: g.stage, legal: g.stage === "move" ? g.legal : [], rollSeq: g.rollSeq, moveSeq: g.moveSeq, last: g.last, ranking: g.ranking } : null,
      deadline: room.deadline, log: room.log.slice(-30), now: Date.now(),
    };
  }
  function broadcast(room) {
    arm(room);
    room.t = Date.now();
    nsp.to(room.code).emit("state", publicState(room));
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const usedPawn = new Set(Object.values(room.players).map((p) => p.pawn));
      const usedColor = new Set(Object.values(room.players).map((p) => p.color));
      // com 2 pessoas, ficam em cantos opostos (vermelho e amarelo)
      const color = ["red", "yellow", "green", "blue"].find((c) => !usedColor.has(c));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: PAWNS.find((x) => !usedPawn.has(x)), color, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], g: null, timer: null, deadline: null, log: [], t: Date.now() };
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
      if (room.order.length >= 4) return fail(cb, "A mesa já tem 4 jogadores. Você pode entrar para assistir.");
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
      if (type === "pawn") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!PAWNS.includes(data.pawn)) return "Avatar inválido.";
        if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outra pessoa.";
        me.pawn = data.pawn; return;
      }
      if (type === "color") {
        if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
        if (!R.COLORS.includes(data.color)) return "Cor inválida.";
        if (Object.values(room.players).some((p) => p !== me && p.color === data.color)) return "Essa cor já é de outra pessoa.";
        me.color = data.color; return;
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
        startGame(room); return;
      }
      if (type === "restart") {
        if (!isHost || room.phase === "lobby") return "Só o organizador.";
        clearTimeout(room.timer);
        room.phase = "lobby"; room.g = null; room.deadline = null; room.winner = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (!me) return "Você está só assistindo.";
      if (room.phase !== "playing") return "O jogo não está em andamento.";
      if (turnColor(g) !== me.color) return "Não é a sua vez.";
      if (type === "roll") {
        if (g.stage !== "roll") return "Agora não é hora de rolar o dado.";
        roll(room); return;
      }
      if (type === "move") {
        if (g.stage !== "move") return "Role o dado primeiro.";
        const i = int(data.i, -1), k = int(data.k, -1);
        const m = g.legal.find((x) => x.i === i && (k < 0 || x.k === k || g.restam[x.k] === g.restam[k])) || g.legal.find((x) => x.i === i);
        if (!m) return "Esse peão não pode andar com esse número.";
        move(room, m); return;
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

  // mesas paradas há mais de 12 horas são apagadas
  limparSalasParadas(rooms, { aoApagar: (r) => { clearTimeout(r.timer); } });
};
