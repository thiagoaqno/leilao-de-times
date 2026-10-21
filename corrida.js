// Corrida da Galera — corrida de kart de 1 a 8 jogadores, com caixas opcionais.
// Cada navegador roda a física do próprio carro e só manda a posição; os carros batem uns nos outros (cada navegador
// resolve a sua metade da batida com a posição que recebeu, em `public/corrida/colisao.js`).
// O servidor cuida da largada sincronizada, repassa as posições e conta as voltas pelos setores da pista,
// na ordem (contra atalho e contramão), com um tempo mínimo de volta. Canal "/corrida" do Socket.io.
const T = require("./public/corrida/pistas.js");
const Itens = require("./corrida-itens.js");
const Robos = require("./corrida-robos.js"); // os robôs (rodam aqui no servidor)
const bd = require("./bd.js");
Robos.usarFonte((pista) => bd.melhoresTracadosCorrida(pista), (pista, nomes) => bd.ritmoCorrida(pista, nomes)); // até cinco linhas humanas e o ritmo de quem joga
const { SKINS } = require("./public/pelada/campo.js"); // o piloto do kart usa as skins da Pelada
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && !room.players[id].bot && room.players[id].name).filter(Boolean); // robô não entra no placar da Noite

const MAX_PLAYERS = 8, COUNTDOWN_MS = 4500, AFTER_FIRST_MS = 45000, MAX_RACE_MS = 15 * 60000;
const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

module.exports = function attachCorrida(io) {
  const nsp = io.of("/corrida");
  const rooms = new Map();
  require("./lobby.js").registrar("corrida", rooms, { max: MAX_PLAYERS }); // aparece na lista de salas da Vila

  const cleanConfig = (c = {}) => ({
    pista: T.PISTAS[c.pista] ? c.pista : "interlagos",
    hora: c.hora === "noite" ? "noite" : "dia",
    voltas: [1, 2, 3, 5].includes(int(c.voltas, 3)) ? int(c.voltas, 3) : 3,
    caixas: c.caixas === true,
    equilibrio: c.equilibrio !== false,
    robos: Math.max(0, Math.min(7, int(c.robos, 0))),
    cambio: c.cambio === "manual" ? "manual" : "auto",
    nivel: Robos.NIVEIS[c.nivel] ? c.nivel : "medio",
  });
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 80) room.log.splice(0, room.log.length - 80); }

  function publicState(room) {
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, startAt: room.startAt || null, endAt: room.endAt || null,
      boxReady: Itens.publicBoxes(room),
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, bot: !!p.bot, name: p.name, pawn: p.pawn, color: p.color, skin: p.skin, car: p.car, mods: p.mods, grid: p.grid, online: p.sockets.size > 0, laps: p.laps, sector: p.sector, started: p.started, finish: p.finish, best: p.best, last: p.last,
          item: p.item || null, rolling: p.rolling || 0, boostUntil: p.boostUntil || 0, starUntil: p.starUntil || 0, spinUntil: p.spinUntil || 0 };
      }),
      finishOrder: room.finishOrder, log: room.log.slice(-20), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- corrida ----------
  function startRace(room) {
    clearTimeout(room.endTimer);
    clearInterval(room.itemTimer); clearInterval(room.botTimer);
    room.phase = "race";
    Robos.preparar(room, COLORS, rid);
    room.startAt = Date.now() + COUNTDOWN_MS;
    room.endAt = null;
    room.finishOrder = [];
    // grid: ordem de chegada da sala, embaralhada a cada corrida
    const ids = [...room.order].sort(() => Math.random() - 0.5);
    ids.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, lapStart: null, lastPos: 0 }));
    Itens.start(room);
    Robos.largar(room);
    if (room.ritmoRobos) { const tt = room.ritmoRobos; log(room, `🤖 Os robôs miram voltas de ${Math.floor(tt / 60)}:${(tt % 60).toFixed(1).padStart(4, "0")} (pela média das 5 melhores voltas de quem está na sala).`); }
    if (room.order.some((id) => room.players[id].bot)) {
      let tique = 0;
      const emit = (event, data) => nsp.to(room.code).emit(event, data);
      room.botTimer = setInterval(() => {
        Robos.passo(room, 0.05, (p, s) => { if (onSector(room, p, s)) broadcast(room); }, (e, d) => { emit(e, d); if (e === "item:box" || e === "item:use") broadcast(room); });
        if (++tique % 2) return;
        // todos os robôs num pacote só (dois pacotes "volatile" seguidos: o segundo se perde)
        const lista = room.order.map((id) => room.players[id]).filter((p) => p && p.bot && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, a: p.pos.a, v: p.pos.v, prog: p.pos.prog, laps: p.laps, t: Date.now() }));
        nsp.to(room.code).volatile.emit("ghosts", lista);
      }, 50);
    }
    if (room.config.caixas) {
      let frame = 0;
      room.itemTimer = setInterval(() => { Itens.tick(room, (event, data) => nsp.to(room.code).emit(event, data));
        if (++frame % 2 === 0) nsp.to(room.code).volatile.emit("item:hazards", Itens.publicHazards(room)); }, 50);
    }
    room.endTimer = setTimeout(() => endRace(room), COUNTDOWN_MS + MAX_RACE_MS);
    log(room, `🏁 Largada em ${T.PISTAS[room.config.pista].name}, ${room.config.voltas} volta${room.config.voltas > 1 ? "s" : ""}.`);
  }
  function endRace(room) {
    if (room.phase !== "race") return;
    clearTimeout(room.endTimer);
    clearInterval(room.itemTimer); clearInterval(room.botTimer);
    room.phase = "results";
    if (room.finishOrder.length) noite.vitoria("corrida", room.code, nomesDe(room, room.finishOrder.slice(0, 1)), nomesDe(room, room.order.filter((id) => id !== room.finishOrder[0])));
    log(room, "🏆 Fim de corrida!");
    broadcast(room);
  }
  // os recordes da pista para sempre (bd.js, os 5 melhores, um por piloto). O tempo é o que o servidor mediu pelos
  // setores, então não depende do que o navegador manda. Entrou no quadro: todo mundo da sala fica sabendo.
  function registrarRecorde(room, p, lap) {
    let pos = 0;
    try { pos = bd.registrarRecordeCorrida(room.config.pista, lap, p.car, p.name); } catch (e) { console.warn("Corrida: recorde não guardado", e.message); }
    if (!pos) return;
    const pista = T.PISTAS[room.config.pista].name;
    log(room, pos === 1 ? `🏆 Recorde de ${pista}! ${p.name} fez ${lap.toFixed(3)} s.` : `🏆 ${p.name} entrou no quadro de ${pista}: ${pos}º, ${lap.toFixed(3)} s.`);
    nsp.to(room.code).emit("recorde", { piloto: p.name, pos, tempo: lap, pista: room.config.pista });
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
    if (!p.bot) registrarRecorde(room, p, lap);
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
        if (type === "mods") { // a pintura do carro
          if (!me || room.phase === "race") return "Só dá para mexer no carro fora da corrida.";
          const d = data.mods || {}, n = { ...me.mods };
          for (const k of Object.keys(T.MODS)) if (T.MODS[k][d[k]]) n[k] = d[k];
          for (const k of Object.keys(n)) if (!T.MODS[k]) delete n[k]; // opções antigas (rodas, aerofólio, faixa) saem
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
          clearTimeout(room.endTimer); clearInterval(room.itemTimer); clearInterval(room.botTimer); Robos.remover(room); room.phase = "lobby"; room.startAt = null; room.endAt = null; return;
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

    socket.on("item:pick", (d = {}) => {
      const { room, me } = ctx(); if (!room || !me) return;
      if (Itens.pick(room, me, int(d.i, -1), (event, data) => nsp.to(room.code).emit(event, data))) broadcast(room);
    });
    socket.on("item:use", (d = {}) => {
      const { room, me } = ctx(); if (!room || !me) return;
      if (Itens.use(room, me, d.back === true, (event, data) => nsp.to(room.code).emit(event, data))) broadcast(room);
    });

    // a volta que acabei de fazer (amostras a cada 0,1 s): até cinco pilotos ensinam linhas diferentes.
    // Só vale se bate com o tempo que o servidor mediu e se é uma volta só (uma por volta, de quem está correndo).
    socket.on("volta", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || me.bot || !Number.isFinite(me.last) || me.voltaEnviada === me.laps) return;
      const s = d.s, pista = room.config.pista, t = T.PISTAS[pista];
      if (!Array.isArray(s) || s.length < 100 || s.length > 4000 || me.last < t.minLap) return;
      if (!s.every((a) => Array.isArray(a) && a.length === 6 && a.every(Number.isFinite) && a[1] >= 0 && a[2] >= 0 && a[1] <= t.world && a[2] <= t.world)) return;
      if (Math.abs((s[s.length - 1][0] - s[0][0]) / 1000 - me.last) > 1.5) return;
      me.voltaEnviada = me.laps;
      let nova = 0;
      try { nova = bd.salvarVoltaCorrida(pista, me.last, me.car, me.name, s); } catch (e) { console.warn("Corrida: volta não guardada", e.message); }
      // o ritmo (as cinco melhores de cada um) vale na próxima largada; a linha muda só com a melhor volta do piloto
      if (nova === 2 && Robos.aprender(pista, bd.melhoresTracadosCorrida(pista))) { log(room, `🤖 Os robôs aprenderam a volta de ${me.name} em ${t.name}.`); broadcast(room); }
    });

    // posição do meu carro (10 por segundo): vai para os outros
    socket.on("pos", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase !== "race") return;
      const now = Date.now();
      if (now - (me.lastPos || 0) < 50) return;
      me.lastPos = now;
      const x = num(d.x), y = num(d.y), a = num(d.a), v = num(d.v), prog = num(d.prog);
      if (![x, y, a].every(Number.isFinite)) return;
      const z = num(d.z);
      const world = T.PISTAS[room.config.pista].world;
      if (x < 0 || y < 0 || x > world || y > world) return;
      me.pos = { x, y, z: Number.isFinite(z) ? z : 0, a, v: Number.isFinite(v) ? v : 0, prog: Number.isFinite(prog) ? prog : 0, at: now };
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
  limparSalasParadas(rooms, { aoApagar: (r) => { clearTimeout(r.endTimer); clearInterval(r.itemTimer); clearInterval(r.botTimer); } });
};
module.exports.COLORS = COLORS;
module.exports.PAWNS = PAWNS;
