// Corrida de Digitação — todo mundo recebe a mesma frase e quem digitar mais rápido (e certinho) ganha. Canal "/digita".
// A sala tem rodadas: contagem 3-2-1 -> digitação -> resultado. O navegador manda o texto digitado (`digitou`) e o
// servidor confere com a frase (public/digita/frases.js), anda os robôs pelo relógio e manda o progresso de todos
// 4 vezes por segundo. Pontos por lugar em cada rodada; no fim, quem tiver mais pontos leva a noite.
const D = require("./public/digita/frases.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js");

const MAX_HUMANOS = 8;
const T_CONTAGEM = +process.env.DIGITA_CONTAGEM_MS || 3500, T_RESULTADO = +process.env.DIGITA_RESULTADO_MS || 14000, T_MAX = +process.env.DIGITA_MAX_MS || 90000, TICK_MS = 250;
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const BOTS = ["Tofu", "Mestre Kenji", "Sakura"];

module.exports = function attachDigita(io) {
  const nsp = io.of("/digita");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({ rodadas: [1, 3, 5].includes(int(c.rodadas, 3)) ? int(c.rodadas, 3) : 3, bots: c.bots !== false });
  const log = (room, text) => { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); };
  const humanos = (room) => room.order.map((id) => room.players[id]);
  const online = (p) => p.sockets.size > 0;
  const nomeDe = (room, id) => (room.players[id] ? room.players[id].name : (room.robos.find((r) => r.id === id) || {}).nome || "?");

  // o progresso de cada um agora: humanos pelo que digitaram, robôs pelo relógio
  function progresso(room, agora = Date.now()) {
    const r = room.rodadaAtual; if (!r) return [];
    const el = Math.max(0, (agora - r.inicio) / 1000), n = r.frase.length;
    return r.corredores.map((c) => {
      if (c.humano) return { id: c.id, certos: c.certos, fim: c.fim };
      if (c.fim == null && Math.floor(el * c.wpm * 5 / 60) >= n) c.fim = n * 12 / c.wpm; // o robô terminou (n letras a wpm*5/60 por s)
      return { id: c.id, certos: c.fim != null ? n : Math.min(n, Math.floor(el * c.wpm * 5 / 60)), fim: c.fim };
    });
  }

  function publicState(room) {
    const r = room.rodadaAtual;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, rodada: room.rodada, deadline: room.deadline,
      players: humanos(room).map((p) => ({ id: p.id, name: p.name, online: online(p), pontos: p.pontos })),
      corredores: r ? r.corredores.map((c) => ({ id: c.id, nome: c.nome, humano: c.humano })) : [],
      frase: r ? r.frase : null, inicio: r ? r.inicio : null, progresso: r ? progresso(room) : [],
      resultado: room.resultado, historico: room.historico, placar: room.placar || null, feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  function agendar(room, ms, fn) {
    clearTimeout(room.timer);
    room.deadline = ms ? Date.now() + ms : null;
    const rodada = room.rodada, phase = room.phase;
    if (ms) room.timer = setTimeout(() => { if (room.rodada === rodada && room.phase === phase) fn(room); }, ms);
  }

  function comecarRodada(room) {
    room.rodada++;
    const usadas = room.usadas || (room.usadas = new Set());
    if (usadas.size >= D.FRASES.length) usadas.clear();
    let i; do { i = Math.floor(Math.random() * D.FRASES.length); } while (usadas.has(i));
    usadas.add(i);
    const hs = humanos(room);
    const bs = room.config.bots ? room.robos.slice(0, Math.max(0, 4 - hs.length)) : [];
    room.rodadaAtual = {
      frase: D.FRASES[i], inicio: Date.now() + T_CONTAGEM,
      corredores: [...hs.map((p) => ({ id: p.id, nome: p.name, humano: true, certos: 0, fim: null })),
        ...bs.map((b) => ({ id: b.id, nome: b.nome, humano: false, wpm: Math.max(18, Math.round(b.wpm + (Math.random() - 0.5) * 16)), certos: 0, fim: null }))],
    };
    room.resultado = null; room.phase = "run";
    log(room, `⌨️ Rodada ${room.rodada}: preparar...`);
    agendar(room, T_CONTAGEM + T_MAX, fimDaRodada);
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK_MS);
    broadcast(room);
  }
  function tick(room) {
    if (room.phase !== "run" || !room.rodadaAtual) { clearInterval(room.loop); room.loop = null; return; }
    const agora = Date.now(), pr = progresso(room, agora);
    nsp.to(room.code).volatile.emit("snap", { el: +((agora - room.rodadaAtual.inicio) / 1000).toFixed(2), p: pr.map((x) => [x.id, x.certos, x.fim]) });
    const faltam = room.rodadaAtual.corredores.filter((c) => c.humano && c.fim == null && online(room.players[c.id] || { sockets: new Set() }));
    if (agora > room.rodadaAtual.inicio && !faltam.length) fimDaRodada(room);
  }
  function fimDaRodada(room) {
    if (room.phase !== "run") return;
    clearInterval(room.loop); room.loop = null;
    const r = room.rodadaAtual, pr = progresso(room), n = r.frase.length;
    const ordem = r.corredores.map((c) => { const x = pr.find((y) => y.id === c.id); return { id: c.id, nome: c.nome, humano: c.humano, certos: x.certos, fim: x.fim }; })
      .sort((a, b) => (a.fim != null && b.fim != null ? a.fim - b.fim : a.fim != null ? -1 : b.fim != null ? 1 : b.certos - a.certos));
    ordem.forEach((o, i) => {
      o.pontos = o.fim != null ? D.pontosDoLugar(i) : 0;
      o.wpm = o.fim != null ? D.wpm(n, o.fim) : null;
      const p = room.players[o.id]; if (p) { p.pontos += o.pontos; if (i === 0 && o.fim != null) p.vitorias++; }
    });
    room.resultado = { frase: r.frase, ordem };
    room.historico.push({ rodada: room.rodada, vencedor: ordem[0].fim != null ? ordem[0].nome : null, wpm: ordem[0].wpm });
    log(room, ordem[0].fim != null ? `🏁 ${ordem[0].nome} venceu a rodada ${room.rodada} (${ordem[0].wpm} palavras por minuto).` : `Ninguém terminou a rodada ${room.rodada}.`);
    room.phase = "result";
    agendar(room, T_RESULTADO, room.rodada >= room.config.rodadas ? fimDoJogo : comecarRodada);
    broadcast(room);
  }
  function fimDoJogo(room) {
    if (room.phase !== "result") return;
    room.phase = "final"; agendar(room, 0);
    const hs = humanos(room).sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
    room.placar = hs.map((p) => ({ id: p.id, nome: p.name, pontos: p.pontos, vitorias: p.vitorias }));
    if (hs.length) {
      const top = hs[0].pontos;
      noite.vitoria("digita", room.code, hs.filter((p) => p.pontos === top).map((p) => p.name), hs.filter((p) => p.pontos !== top).map((p) => p.name));
      log(room, `🏆 ${hs[0].name} fechou com ${hs[0].pontos} pontos.`);
    }
    broadcast(room);
  }

  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    const addPlayer = (room, name) => {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, sockets: new Set(), pontos: 0, vitorias: 0 };
      room.order.push(id);
      return room.players[id];
    };

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], robos: BOTS.map((n, i) => ({ id: "bot" + i, nome: "🤖 " + n, wpm: [28, 40, 52][i] })), rodada: 0, rodadaAtual: null, resultado: null, historico: [], deadline: null, feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id; bind(room, p.id);
      log(room, `Pista aberta por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX_HUMANOS) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      if (room.phase !== "lobby" && room.phase !== "final") return fail(cb, "A partida já começou. Você pode entrar para assistir.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} chegou na pista.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    // o texto digitado até agora: confere com a frase e anota a hora em que fechou certinho
    socket.on("digitou", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "run") return;
      const r = room.rodadaAtual, c = r.corredores.find((x) => x.id === me.id), agora = Date.now();
      if (!c || c.fim != null || agora < r.inicio || typeof d.texto !== "string" || d.texto.length > 400) return;
      c.certos = D.prefixoCerto(r.frase, d.texto);
      if (d.texto === r.frase) { c.fim = (agora - r.inicio) / 1000; c.certos = r.frase.length; }
    });

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id;
      const err = (() => {
        if (type === "config") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador muda, antes de começar.";
          room.config = cleanConfig(data.config); return;
        }
        if (type === "kick") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da pista.`); return;
        }
        if (type === "start") {
          if (!isHost || (room.phase !== "lobby" && room.phase !== "final")) return "Só o organizador começa.";
          for (const p of humanos(room)) Object.assign(p, { pontos: 0, vitorias: 0 });
          room.rodada = 0; room.historico = []; room.placar = null; room.usadas = new Set();
          comecarRodada(room); return;
        }
        if (type === "lobby") {
          if (!isHost || room.phase === "lobby") return "Só o organizador.";
          clearTimeout(room.timer); clearInterval(room.loop); room.loop = null;
          room.phase = "lobby"; room.rodada = 0; room.rodadaAtual = null; room.resultado = null; room.deadline = null; return;
        }
        if (type === "next") {
          if (!isHost || room.phase !== "result") return "Só o organizador adianta.";
          if (room.rodada >= room.config.rodadas) fimDoJogo(room); else comecarRodada(room); return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => { clearTimeout(r.timer); clearInterval(r.loop); } });
};
