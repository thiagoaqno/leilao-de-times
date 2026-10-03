// Palavra Proibida da Galera — jogo de explicar palavras em dois times. Canal "/proibida" do Socket.io.
// Na vez de um time, quem explica vê a carta (a palavra e as 5 proibidas); o time adversário também vê, para
// fiscalizar. O time de quem explica não vê. Acertou: ponto e puxa outra carta. Não conseguiu (ou falou uma
// proibida, ou o tempo acabou): a vez passa para o outro time. Ganha quem chegar primeiro aos pontos da partida.
const { CARTAS } = require("./public/proibida/cartas.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");

const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachProibida(io) {
  const nsp = io.of("/proibida");
  const rooms = new Map();
  const cleanConfig = (c = {}) => ({
    tempo: [45, 60, 90].includes(int(c.tempo, 60)) ? int(c.tempo, 60) : 60,
    meta: [10, 15, 20, 30].includes(int(c.meta, 15)) ? int(c.meta, 15) : 15,
  });
  const time = (room, t) => room.order.filter((id) => room.players[id].team === t);
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 40) room.log.splice(0, room.log.length - 40); }

  function publicState(room) {
    const v = room.vez;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, placar: room.placar, vencedor: room.vencedor || null,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, team: p.team, online: p.sockets.size > 0 }; }),
      vez: v ? { time: v.time, quem: v.quem, ate: v.ate, acertos: v.acertos } : null,
      log: room.log.slice(-15), now: Date.now(),
    };
  }
  // cada um recebe o estado; quem explica e o time adversário recebem também a carta
  function broadcast(room) {
    const pub = publicState(room), v = room.vez;
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const p = room.players[s.data.pid], ve = v && v.carta && (!p || s.data.pid === v.quem || p.team !== v.time); // quem assiste também vê
      s.emit("state", ve ? { ...pub, carta: v.carta } : pub);
    }
  }
  function puxar(room) { if (!room.monte.length) room.monte = embaralhar(CARTAS.map((_, i) => i)); room.vez.carta = CARTAS[room.monte.pop()]; }
  function novaVez(room, t) {
    const lista = time(room, t);
    room.prox[t] = (room.prox[t] + 1) % lista.length;
    room.vez = { time: t, quem: lista[room.prox[t]], ate: Date.now() + room.config.tempo * 1000, acertos: 0, carta: null };
    puxar(room);
    clearTimeout(room.timer);
    room.timer = setTimeout(() => passar(room, "tempo"), room.config.tempo * 1000);
  }
  function passar(room, porque) {
    if (room.phase !== "jogando") return;
    const v = room.vez, nomeQ = room.players[v.quem] ? room.players[v.quem].name : "?";
    log(room, porque === "tempo" ? `⏱️ Acabou o tempo de ${nomeQ} (${v.acertos} acerto${v.acertos === 1 ? "" : "s"}).` : porque === "proibida" ? `🚫 ${nomeQ} falou uma palavra proibida! A carta era "${v.carta[0]}".` : `🙈 ${nomeQ} passou a vez. A carta era "${v.carta[0]}".`);
    novaVez(room, v.time === "A" ? "B" : "A");
    broadcast(room);
  }

  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const id = rid(6), a = time(room, "A").length, b = time(room, "B").length;
      room.players[id] = { id, token: rid(12), name, team: a <= b ? "A" : "B", sockets: new Set() };
      room.order.push(id); return room.players[id];
    }
    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], placar: { A: 0, B: 0 }, prox: { A: -1, B: -1 }, monte: [], vez: null, log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name); room.host = p.id; bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= 16) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name); bind(room, p.id); log(room, `${name} chegou.`);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx(); if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, v = room.vez, jogando = room.phase === "jogando";
      const err = (() => {
        if (type === "team") { if (!me || jogando) return "Só dá para trocar de time fora do jogo."; me.team = data.team === "B" ? "B" : "A"; return; }
        if (type === "config") { if (!isHost || jogando) return "Só o organizador muda, fora do jogo."; room.config = cleanConfig(data.config); return; }
        if (type === "start") {
          if (!isHost) return "Só o organizador começa.";
          if (time(room, "A").length < 2 || time(room, "B").length < 2) return "Cada time precisa de pelo menos 2 pessoas.";
          Object.assign(room, { phase: "jogando", placar: { A: 0, B: 0 }, vencedor: null, monte: [] });
          log(room, "🗣️ Valendo!"); novaVez(room, Math.random() < 0.5 ? "A" : "B"); return;
        }
        if (type === "lobby") { if (!isHost) return "Só o organizador."; clearTimeout(room.timer); room.phase = "lobby"; room.vez = null; return; }
        if (!jogando || !v || !me) return "Agora não.";
        if (type === "acertou") { // só quem explica marca o acerto
          if (me.id !== v.quem) return "Só quem está explicando marca o acerto.";
          room.placar[v.time]++; v.acertos++; log(room, `✅ ${me.name} fez o time acertar "${v.carta[0]}".`);
          if (room.placar[v.time] >= room.config.meta) { clearTimeout(room.timer); room.phase = "fim"; room.vencedor = v.time; room.vez = null; log(room, `🏆 Time ${v.time === "A" ? "Azul" : "Laranja"} venceu!`); return; }
          puxar(room); return;
        }
        if (type === "passar") { if (me.id !== v.quem) return "Só quem está explicando passa a vez."; passar(room, "passou"); return "_"; }
        if (type === "proibida") { // o time adversário fiscaliza
          if (me.team === v.time) return "Quem fiscaliza é o outro time."; room.placar[me.team]++; passar(room, "proibida"); return "_";
        }
        return "Ação desconhecida.";
      })();
      if (err && err !== "_") return fail(cb, err);
      ok(cb); if (err !== "_") broadcast(room);
    });
    socket.on("disconnect", () => { const { room, me } = ctx(); if (!room) return; if (me) me.sockets.delete(socket.id); broadcast(room); });
  });
  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => clearTimeout(r.timer) });
};
