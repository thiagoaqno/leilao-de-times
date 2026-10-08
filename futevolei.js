// Futevôlei da Galera — futevôlei 3D na areia, 1x1 ou em duplas (2x2), com robôs completando as vagas, na praia ou
// na arena coberta. Canal "/futevolei" do Socket.io.
// Cada navegador mexe o próprio jogador e manda a posição ~30 vezes por segundo (com a mira de agora). A BOLA e o
// PLACAR são do servidor: ele roda as regras (public/futevolei/regras.js) 60 vezes por segundo, faz os robôs jogarem e
// toca a bola quando um toque armado alcança ela. Manda um pacote pequeno 20 vezes por segundo.
const F = require("./public/futevolei/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js");
const C = require("./public/pelada/campo.js"); // a lista de skins é a mesma da Pelada
const noite = require("./noite.js"); // o placar da Noite da Galera

const TICK = 1 / 60, SNAP_EVERY = 3, MAX_SALA = 8;
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BOT_NOMES = ["Robozão", "Tchuco", "Parafuso", "Bip-Bop"];
const BOT_SKINS = ["neymar", "cr7", "steve", "shrek", "naruto", "woody"];
const ARENAS = ["praia", "arena"];

module.exports = function attachFutevolei(io) {
  const nsp = io.of("/futevolei");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({
    duplas: c.duplas !== false, // futevôlei é em dupla; 1x1 é opção
    pontos: [10, 15, 18].includes(int(c.pontos, 15)) ? int(c.pontos, 15) : 15,
    dif: F.DIF[c.dif] ? c.dif : "medio",
    bots: c.bots !== false, // completar as vagas com robôs
    arena: ARENAS.includes(c.arena) ? c.arena : "praia",
  });
  const tamanho = (room) => (room.config.duplas ? 2 : 1);
  const doTime = (room, t) => room.order.map((id) => room.players[id]).filter((p) => p.team === t);
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }

  function publicState(room) {
    const m = room.match;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, team: p.team, skin: p.skin, online: p.sockets.size > 0, ping: p.rtt == null ? null : Math.round(p.rtt) }; }),
      match: m ? { ...F.estado(m), jogadores: m.jogadores.map((j) => ({ id: j.id, team: j.team, slot: j.slot, bot: !!j.bot, nome: j.nome, skin: j.skin })) } : null,
      feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- partida ----------
  function startMatch(room) {
    const n = tamanho(room), lista = [];
    let b = 0;
    for (const t of ["A", "B"]) {
      const humanos = doTime(room, t).slice(0, n);
      humanos.forEach((p, i) => lista.push({ id: p.id, team: t, slot: i, bot: false, nome: p.name, skin: p.skin }));
      for (let i = humanos.length; i < n; i++, b++) lista.push({ id: "bot" + b, team: t, slot: i, bot: true, nome: BOT_NOMES[b % BOT_NOMES.length], skin: BOT_SKINS[(b + room.seq) % BOT_SKINS.length] });
    }
    room.seq++;
    room.match = F.novaPartida(lista, room.config, Date.now() + 1500);
    room.phase = "play";
    log(room, `Valendo: ${n === 2 ? "duplas" : "1x1"}, set de ${room.config.pontos} pontos.`);
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK * 1000);
    broadcast(room);
  }
  function tick(room) {
    const m = room.match; if (!m || room.phase !== "play") return;
    const now = Date.now();
    F.passo(m, TICK, now);
    if (m.ev.length) {
      const evs = m.ev.splice(0);
      nsp.to(room.code).emit("ev", evs);
      if (evs.some((e) => e.tipo === "ponto" || e.tipo === "fim" || (e.tipo === "toque" && e.golpe === "saque"))) {
        const fim = evs.find((e) => e.tipo === "fim");
        if (fim) {
          room.phase = "over"; clearInterval(room.loop); room.loop = null;
          const nomes = (dentro) => m.jogadores.filter((j) => (j.team === fim.time) === dentro).map((j) => j.nome);
          noite.vitoria("futevolei", room.code, nomes(true), nomes(false));
          log(room, `Vitória do time ${fim.time === "A" ? "Amarelo" : "Azul"}.`);
        }
        broadcast(room);
      }
    }
    room.frame = (room.frame || 0) + 1;
    if (room.frame % SNAP_EVERY === 0) nsp.to(room.code).volatile.emit("snap", { t: now, f: m.fase, ...F.pacote(m) });
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    const jogadorDe = (room, me) => room && me && room.match && room.match.jogadores.find((j) => j.id === me.id);
    function addPlayer(room, name, skin) {
      const id = rid(6), n = tamanho(room), a = doTime(room, "A").length, b = doTime(room, "B").length;
      const team = a <= b && a < n ? "A" : b < n ? "B" : null; // sobrou? fica de fora (pode trocar no lobby)
      room.players[id] = { id, token: rid(12), name, team, skin: C.SKINS[skin] ? skin : "padrao", rtt: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], seq: 0, match: null, feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin);
      room.host = p.id; bind(room, p.id);
      log(room, `Quadra aberta por ${name}.`);
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
      if (room.order.length >= MAX_SALA) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin);
      if (room.phase === "play") p.team = null; // jogo rolando: entra de fora e joga a próxima
      bind(room, p.id);
      log(room, `${name} chegou na quadra.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "team") {
          if (!me || playing) return "Só dá para trocar de time fora do jogo.";
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (t && t !== me.team && doTime(room, t).length >= tamanho(room)) return "Esse time está cheio.";
          me.team = t; return;
        }
        if (type === "skin") { if (!me || !C.SKINS[data.skin]) return "Skin inválida."; me.skin = data.skin; return; }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora do jogo.";
          room.config = cleanConfig(data.config);
          for (const t of ["A", "B"]) doTime(room, t).slice(tamanho(room)).forEach((p) => (p.team = null));
          return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora do jogo.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da quadra.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador começa.";
          const n = tamanho(room), a = doTime(room, "A").length, b = doTime(room, "B").length;
          if (!a && !b) return "Entre num time para jogar.";
          if (!room.config.bots && (a < n || b < n)) return `Faltam jogadores: cada time precisa de ${n} (ou ligue "completar com robôs").`;
          startMatch(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearInterval(room.loop); room.loop = null; room.phase = "lobby"; room.match = null; return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    // minha posição e a mira (~30 por segundo): o navegador mexe o próprio jogador; aqui só confere
    socket.on("st", (d = {}) => {
      const { room, me } = ctx(), j = jogadorDe(room, me);
      if (!j || room.phase !== "play") return;
      const { x, z, vx, vz } = d; if (![x, z, vx, vz].every(fin)) return;
      const m = room.match, now = Date.now(), dt = Math.min(0.5, (now - (j.ultSt || now - 33)) / 1000) + 0.05, passo = F.VEL * 1.6 * dt;
      const dx = x - j.x, dz = z - j.z, dd = Math.hypot(dx, dz), k = dd > passo ? passo / dd : 1; // sem teletransporte
      if (m.fase === "jogo" || m.fase === "saque") { j.x += dx * k; j.z += dz * k; }
      j.vx = clamp(vx, -8, 8); j.vz = clamp(vz, -8, 8); F.limitar(j, m); j.ultSt = now;
      if (fin(d.mx) && fin(d.mz)) j.mira = { x: clamp(d.mx, -1, 1), z: clamp(d.mz, -1, 1) };
    });
    // apertou passar ou atacar: arma o toque (o tempo é o de quando apertou, descontando metade do ping) ou saca
    socket.on("toque", (d = {}) => {
      const { room, me } = ctx(), j = jogadorDe(room, me);
      if (!j || room.phase !== "play") return;
      if (fin(d.mx) && fin(d.mz)) j.mira = { x: clamp(d.mx, -1, 1), z: clamp(d.mz, -1, 1) };
      const agora = Date.now() - Math.min(150, (me.rtt || 0) / 2);
      F.armar(room.match, j, d.tipo === "ataque" ? "ataque" : "passe", agora, j.mira);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  medirPing(nsp, rooms);
  limparSalasParadas(rooms, {
    horas: 6, intervalo: 60000,
    cadaVolta: (r) => { const anyone = r.order.some((id) => r.players[id].sockets.size); if (r.loop && !anyone) { clearInterval(r.loop); r.loop = null; r.phase = "lobby"; r.match = null; } },
    aoApagar: (r) => clearInterval(r.loop),
  });
};
