// Bloqueio — corrida de peões num tabuleiro 9x9 em que cada um põe paredes para atrapalhar o caminho dos outros.
// 2 ou 4 jogadores (robôs completam). Roda no mesmo servidor, num canal separado do Socket.io ("/bloqueio").
// As regras ficam em public/bloqueio/regras.js (as mesmas do navegador); aqui só ficam a sala, a vez e o relógio.
const R = require("./public/bloqueio/regras.js");
const { ligarMesa, rid, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js");

const ROBO_MS = +process.env.BLOQUEIO_ROBO_MS || 900, OFFLINE_MS = +process.env.BLOQUEIO_OFFLINE_MS || 6000;
const NOMES_ROBO = ["Robô Beto", "Robô Duda", "Robô Zeca", "Robô Lia"];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachBloqueio(io) {
  const nsp = io.of("/bloqueio");
  const rooms = new Map();
  require("./lobby.js").registrar("bloqueio", rooms, { max: 4 }); // aparece na lista de salas da Vila

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
  function addPlayer(room, name, bot = false) {
    const used = new Set(Object.values(room.players).map((p) => p.pawn));
    const id = rid(6);
    room.players[id] = { id, name, token: rid(), pawn: R.AVATARES.find((x) => !used.has(x)), bot, sockets: new Set() };
    room.order.push(id);
    return room.players[id];
  }

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

  // criar, entrar, as ações, as reações e a saída: o esqueleto comum dos jogos de mesa (salas.ligarMesa)
  ligarMesa(nsp, rooms, { max: 4, sala: (data) => ({ config: cleanConfig(data.config), g: null, wins: {} }), novoJogador: addPlayer, acao: handle, broadcast, log, reacoes: R.REACOES });

  limparSalasParadas(rooms, { aoApagar: (r) => clearTimeout(r.turnTimer) });
};
