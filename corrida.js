// Corrida da Galera — corrida de kart (sem poderes) de 1 a 8 jogadores, em Mônaco, Interlagos ou Tóquio.
// Os outros carros são "fantasmas": ninguém bate em ninguém, então cada navegador roda a física do próprio carro
// e só manda a posição (o atraso da internet vira, no máximo, um fantasma um pouquinho atrasado).
// O servidor cuida da largada sincronizada, repassa as posições e conta as voltas pelos setores da pista,
// na ordem (contra atalho e contramão), com um tempo mínimo de volta. Canal "/corrida" do Socket.io.
const T = require("./public/corrida/pistas.js");
const { SKINS } = require("./public/pelada/campo.js"); // o piloto do kart usa as skins da Pelada
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const MAX_PLAYERS = 8, COUNTDOWN_MS = 4500, AFTER_FIRST_MS = 45000, MAX_RACE_MS = 15 * 60000;
const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

module.exports = function attachCorrida(io) {
  const nsp = io.of("/corrida");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({
    pista: T.PISTAS[c.pista] ? c.pista : "interlagos",
    voltas: [1, 2, 3, 5].includes(int(c.voltas, 3)) ? int(c.voltas, 3) : 3,
  });
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 80) room.log.splice(0, room.log.length - 80); }

  function publicState(room) {
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, startAt: room.startAt || null, endAt: room.endAt || null,
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, name: p.name, pawn: p.pawn, color: p.color, skin: p.skin, car: p.car, mods: p.mods, grid: p.grid, online: p.sockets.size > 0, laps: p.laps, sector: p.sector, started: p.started, finish: p.finish, best: p.best, last: p.last };
      }),
      finishOrder: room.finishOrder, log: room.log.slice(-20), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- corrida ----------
  function startRace(room) {
    clearTimeout(room.endTimer);
    room.phase = "race";
    room.startAt = Date.now() + COUNTDOWN_MS;
    room.endAt = null;
    room.finishOrder = [];
    // grid: ordem de chegada da sala, embaralhada a cada corrida
    const ids = [...room.order].sort(() => Math.random() - 0.5);
    ids.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, lapStart: null, lastPos: 0 }));
    room.endTimer = setTimeout(() => endRace(room), COUNTDOWN_MS + MAX_RACE_MS);
    log(room, `🏁 Largada em ${T.PISTAS[room.config.pista].name}, ${room.config.voltas} volta${room.config.voltas > 1 ? "s" : ""}.`);
  }
  function endRace(room) {
    if (room.phase !== "race") return;
    clearTimeout(room.endTimer);
    room.phase = "results";
    if (room.finishOrder.length) noite.vitoria("corrida", room.code, nomesDe(room, room.finishOrder.slice(0, 1)), nomesDe(room, room.order.filter((id) => id !== room.finishOrder[0])));
    log(room, "🏆 Fim de corrida!");
    broadcast(room);
  }
  // Setor novo: só vale o próximo na ordem. Voltar ao setor 0 depois do 3 fecha a volta (a primeira passagem é a largada).
  function onSector(room, p, s) {
    const now = Date.now();
    if (room.phase !== "race" || now < room.startAt || p.finish != null) return false;
    if (s !== (p.sector + 1) % T.SECTORS) return false;
    p.sector = s;
    if (s !== 0) return true;
    if (!p.started) { p.started = true; p.lapStart = room.startAt; return true; }
    const lap = (now - p.lapStart) / 1000;
    if (lap < T.PISTAS[room.config.pista].minLap) { p.sector = T.SECTORS - 1; return false; } // rápido demais: atalho
    p.laps++; p.last = lap; p.best = p.best == null ? lap : Math.min(p.best, lap); p.lapStart = now;
    if (p.laps >= room.config.voltas) {
      p.finish = (now - room.startAt) / 1000;
      room.finishOrder.push(p.id);
      log(room, `🏁 ${p.name} cruzou a chegada em ${room.finishOrder.length}º.`);
      const racing = room.order.filter((id) => room.players[id].finish == null && room.players[id].sockets.size);
      if (!racing.length) endRace(room);
      else if (room.finishOrder.length === 1) { // o primeiro chegou: os outros têm um tempo para terminar
        room.endAt = now + AFTER_FIRST_MS;
        clearTimeout(room.endTimer);
        room.endTimer = setTimeout(() => endRace(room), AFTER_FIRST_MS);
      }
    }
    return true;
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name, skin) {
      const usedP = new Set(Object.values(room.players).map((p) => p.pawn)), usedC = new Set(Object.values(room.players).map((p) => p.color));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: PAWNS.find((x) => !usedP.has(x)), color: COLORS.find((c) => !usedC.has(c)), skin: SKINS[skin] ? skin : "padrao", car: "equilibrado", mods: { ...T.MODS_PADRAO }, grid: room.order.length, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], finishOrder: [], log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Box aberto por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch || room.phase === "race") {
        if (!data.watch) return fail(cb, "A corrida já começou. Você pode entrar para assistir.");
        bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room);
      }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX_PLAYERS) return fail(cb, `A sala já tem ${MAX_PLAYERS} pilotos. Você pode entrar para assistir.`);
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin);
      bind(room, p.id);
      log(room, `${name} chegou ao box.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id;
      const err = (() => {
        if (type === "color") {
          if (!me || room.phase === "race") return "Só dá para trocar fora da corrida.";
          if (!COLORS.includes(data.color)) return "Cor inválida.";
          if (Object.values(room.players).some((p) => p !== me && p.color === data.color)) return "Essa cor já é de outro piloto.";
          me.color = data.color; return;
        }
        if (type === "skin") { if (!me || room.phase === "race") return "Só dá para trocar fora da corrida."; if (!SKINS[data.skin]) return "Skin inválida."; me.skin = data.skin; return; }
        if (type === "car") {
          if (!me || room.phase === "race") return "Só dá para trocar de carro fora da corrida.";
          if (!T.CARROS[data.car]) return "Carro inválido.";
          me.car = data.car; return;
        }
        if (type === "mods") { // rodas, aerofólio e faixas
          if (!me || room.phase === "race") return "Só dá para mexer no carro fora da corrida.";
          const d = data.mods || {}, n = { ...me.mods };
          if (T.MODS.rodas[d.rodas]) n.rodas = d.rodas;
          if (T.MODS.aero[d.aero]) n.aero = d.aero;
          if (T.MODS.faixa[d.faixa]) n.faixa = d.faixa;
          me.mods = n; return;
        }
        if (type === "pawn") {
          if (!me || room.phase === "race") return "Só dá para trocar fora da corrida.";
          if (!PAWNS.includes(data.pawn)) return "Avatar inválido.";
          if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outro piloto.";
          me.pawn = data.pawn; return;
        }
        if (type === "config") {
          if (!isHost || room.phase === "race") return "Só o organizador muda, fora da corrida.";
          room.config = cleanConfig(data.config); return;
        }
        if (type === "kick") {
          if (!isHost || room.phase === "race") return "Só o organizador, fora da corrida.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Piloto inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da sala.`); return;
        }
        if (type === "start") {
          if (!isHost || room.phase === "race") return "Só o organizador dá a largada.";
          startRace(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearTimeout(room.endTimer); room.phase = "lobby"; room.startAt = null; room.endAt = null; return;
        }
        if (type === "end") {
          if (!isHost || room.phase !== "race") return "Só o organizador encerra a corrida.";
          endRace(room); return;
        }
        if (!me) return "Você está só assistindo.";
        if (type === "sector") {
          if (!onSector(room, me, int(data.s, -1))) return "ignorado";
          return;
        }
        return "Ação desconhecida.";
      })();
      if (err === "ignorado") return ok(cb, { ignored: true });
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    // posição do meu carro (10 por segundo): vai para os outros como fantasma
    socket.on("pos", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "race") return;
      const now = Date.now();
      if (now - (me.lastPos || 0) < 50) return;
      me.lastPos = now;
      const x = num(d.x), y = num(d.y), a = num(d.a), v = num(d.v), prog = num(d.prog);
      if (![x, y, a].every(Number.isFinite)) return;
      const z = num(d.z);
      socket.to(room.code).volatile.emit("ghost", { id: me.id, x, y, z: Number.isFinite(z) ? Math.max(-50, Math.min(400, z)) : 0, a, v: Number.isFinite(v) ? v : 0, prog: Number.isFinite(prog) ? prog : 0, laps: me.laps, t: now });
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      if (room.phase === "race" && room.finishOrder.length && !room.order.some((id) => room.players[id].finish == null && room.players[id].sockets.size)) endRace(room);
      broadcast(room);
    });
  });

  // salas paradas há mais de 12 horas somem
  limparSalasParadas(rooms, { aoApagar: (r) => { clearTimeout(r.endTimer); } });
};
module.exports.COLORS = COLORS;
module.exports.PAWNS = PAWNS;
