// Bloqueio — corrida de peões num tabuleiro 9x9 em que cada um põe paredes para atrapalhar o caminho dos outros.
// 2 ou 4 jogadores (robôs completam). Roda no mesmo servidor, num canal separado do Socket.io ("/bloqueio").
// As regras ficam em public/bloqueio/regras.js (as mesmas do navegador); aqui só ficam a sala, a vez e o relógio.
const R = require("./public/bloqueio/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js");

const ROBO_MS = +process.env.BLOQUEIO_ROBO_MS || 900, OFFLINE_MS = +process.env.BLOQUEIO_OFFLINE_MS || 6000;
const NOMES_ROBO = ["Robô Beto", "Robô Duda", "Robô Zeca", "Robô Lia"];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachBloqueio(io) {
  const nsp = io.of("/bloqueio");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({ timer: [30, 45, 60].includes(+c.timer) ? +c.timer : 45 });
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  const log = (room, text) => { room.log.push({ t: Date.now(), text }); if (room.log.length > 100) room.log.splice(0, room.log.length - 100); };

  function publicState(room) {
    const g = room.g;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id, i) => { const p = room.players[id]; return { id, name: p.name, pawn: p.pawn, bot: !!p.bot, online: !!p.bot || p.sockets.size > 0, seat: room.phase === "lobby" ? null : R.lugaresDe(room.order.length)[i] }; }),
      game: g ? { n: g.n, paredes: g.paredes, peoes: g.peoes, sobram: g.sobram, vez: room.phase === "playing" ? g.vez : null, vencedor: g.vencedor, ultima: g.ultima || null } : null,
      winner: room.winner ?? null, wins: room.wins,
      deadline: room.deadline ? { who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null,
      log: room.log.slice(-30), now: Date.now(),
    };
  }
  function broadcast(room) {
    armTurn(room);
    room.t = Date.now();
    const pub = publicState(room);
    for (const s of nsp.sockets.values()) if (s.data.code === room.code) s.emit("state", pub);
  }

  // ---------- vez ----------
  const idDaVez = (room) => room.order[room.g.vez];
  function depois(room, jogou) {
    const g = room.g;
    if (g.vencedor != null) {
      const id = room.order[g.vencedor];
      room.phase = "ended"; room.winner = id; room.wins[id] = (room.wins[id] || 0) + 1;
      clearTimeout(room.turnTimer); room.deadline = null;
      log(room, `👑 ${nameOf(room, id)} cruzou o tabuleiro e ganhou!`);
      const humanos = (ids) => ids.filter((x) => !room.players[x].bot).map((x) => nameOf(room, x));
      noite.vitoria("bloqueio", room.code, humanos([id]), humanos(room.order.filter((x) => x !== id)));
    }
  }
  function jogar(room, pid, j) {
    const g = room.g, i = room.order.indexOf(pid), nome = nameOf(room, pid);
    const e = j.mover ? R.mover(g, i, j.mover.r, j.mover.c) : R.parede(g, i, j.parede);
    if (e) return e;
    g.ultima = j.mover ? { quem: pid, tipo: "mover", ...j.mover } : { quem: pid, tipo: "parede", ...j.parede };
    if (j.parede) log(room, `🧱 ${nome} pôs uma parede (sobram ${g.sobram[i]}).`);
    depois(room, j);
    return null;
  }

  // ---------- relógio e robôs ----------
  function armTurn(room) {
    const g = room.g;
    if (room.phase !== "playing" || !g) { clearTimeout(room.turnTimer); room.deadline = null; room.deadlineKey = null; return; }
    const who = idDaVez(room), key = `${room.rodada}|${room.passo}`;
    if (room.deadlineKey === key) return;
    clearTimeout(room.turnTimer);
    const p = room.players[who], robo = p.bot, off = !robo && !p.sockets.size;
    const ms = robo ? ROBO_MS : off ? OFFLINE_MS : room.config.timer * 1000;
    room.deadline = robo ? null : { key, who, at: Date.now() + ms, total: ms }; room.deadlineKey = key;
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || room.deadlineKey !== key) return;
      // robô joga de verdade; quem demorou anda um passo pelo melhor caminho (sem pôr parede)
      let j = R.jogadaDoRobo(room.g, room.g.vez);
      if (!robo && j && j.parede) { const m = R.movimentos(room.g, room.g.vez); const f = R.fechadas(room.g.paredes); m.sort((a, b) => R.distancia(null, a, room.g.metas[room.g.vez], f) - R.distancia(null, b, room.g.metas[room.g.vez], f)); j = { mover: m[0] }; }
      if (!robo) log(room, `⏱️ ${nameOf(room, who)} demorou e a vez passou.`);
      if (j) jogar(room, who, j);
      room.passo++; broadcast(room);
    }, ms + (robo ? 0 : 150));
  }

  function comecar(room) {
    const n = room.order.length;
    shuffle(room.order);
    room.g = R.novoJogo(n); room.phase = "playing"; room.winner = null; room.rodada = (room.rodada || 0) + 1; room.passo = 0; room.deadline = null;
    log(room, `🎉 Começou! ${room.order.map((id) => nameOf(room, id)).join(", ")} — ${nameOf(room, room.order[0])} abre.`);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name, bot = false) {
      const used = new Set(Object.values(room.players).map((p) => p.pawn));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: R.AVATARES.find((x) => !used.has(x)), bot, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], g: null, wins: {}, log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id; bind(room, p.id);
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
      const type = data.type, isHost = me && room.host === me.id;
      const lobby = room.phase === "lobby";
      if (type === "pawn") {
        if (!me || !lobby) return "Só dá para trocar antes de começar.";
        if (!R.AVATARES.includes(data.pawn)) return "Avatar inválido.";
        if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outra pessoa.";
        me.pawn = data.pawn; return;
      }
      if (type === "config") { if (!isHost || !lobby) return "Só o organizador muda as regras, antes de começar."; room.config = cleanConfig(data.config); return; }
      if (type === "addBot") {
        if (!isHost || !lobby) return "Só o organizador, antes de começar.";
        if (room.order.length >= 4) return "A mesa está cheia.";
        const usados = new Set(Object.values(room.players).map((p) => p.name));
        addPlayer(room, NOMES_ROBO.find((n) => !usados.has(n)) || "Robô", true); return;
      }
      if (type === "kick") {
        if (!isHost || !lobby) return "Só o organizador, antes de começar.";
        const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
        for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
        delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
        log(room, `${p.name} saiu da mesa.`); return;
      }
      if (type === "start") {
        if (!isHost || !lobby) return "Só o organizador começa o jogo.";
        const n = room.order.length;
        if (n !== 2 && n !== 4) return "O Bloqueio é de 2 ou 4 jogadores (use os robôs para completar a mesa).";
        comecar(room); return;
      }
      if (type === "restart") {
        if (!isHost || lobby) return "Só o organizador.";
        clearTimeout(room.turnTimer); room.phase = "lobby"; room.g = null; room.deadline = null; room.winner = null;
        log(room, "A mesa voltou para a sala de espera."); return;
      }
      if (type === "again") {
        if (!isHost || room.phase !== "ended") return "Só o organizador, depois que o jogo acabar.";
        comecar(room); return;
      }
      if (!me) return "Você está só assistindo.";
      if (type === "move" || type === "wall") {
        if (room.phase !== "playing") return "O jogo não está em andamento.";
        if (idDaVez(room) !== me.id) return "Não é a sua vez.";
        const e = type === "move" ? jogar(room, me.id, { mover: { r: data.r | 0, c: data.c | 0 } }) : jogar(room, me.id, { parede: { r: data.r, c: data.c, o: data.o } });
        if (!e) room.passo++;
        return e;
      }
      return "Ação desconhecida.";
    }

    socket.on("react", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase === "lobby" || !R.REACOES.includes(data.emoji)) return;
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

  limparSalasParadas(rooms, { aoApagar: (r) => clearTimeout(r.turnTimer) });
};
