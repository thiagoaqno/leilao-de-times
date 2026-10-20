// Cozinha da Galera — o Overcooked da galera: de 1 a 4 cozinheiros na mesma cozinha, contra o relógio.
// Canal "/cozinha" do Socket.io.
// Cada navegador mexe o próprio cozinheiro (a física das bancadas é a de public/cozinha/regras.js) e manda a posição
// ~30 vezes por segundo; aqui só confere. A COMIDA é do servidor: pegar, soltar, juntar, picar, lavar, o fogão, os
// pedidos e os pontos rodam aqui 60 vezes por segundo. A cozinha ("mesa") vai para todos na hora em que muda (e 10
// vezes por segundo enquanto alguma barra anda); as posições vão num pacote pequeno, 20 vezes por segundo.
const K = require("./public/cozinha/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js");
const Campo = require("./public/pelada/campo.js"); // a lista de skins é a mesma da Pelada
const noite = require("./noite.js"); // o placar da Noite da Galera

const TICK = 1 / 60, SNAP_MS = 50, MESA_MS = 100, MAX_COZINHEIROS = 4, MAX_SALA = 12;
const VEL = Number(process.env.COZINHA_VEL) || 1; // os testes aceleram o relógio da cozinha
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const q2 = (v) => Math.round(v * 100) / 100;

module.exports = function attachCozinha(io) {
  const nsp = io.of("/cozinha");
  const rooms = new Map();
  require("./lobby.js").registrar("cozinha", rooms, { max: MAX_COZINHEIROS });

  const cleanConfig = (c = {}) => ({ cozinha: K.COZINHAS[c.cozinha] ? c.cozinha : "1-1" });
  const cozinheiros = (room) => room.order.map((id) => room.players[id]).filter((p) => p.chef);
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }

  function publicState(room) {
    const m = room.match;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, chef: p.chef, skin: p.skin, online: p.sockets.size > 0, ping: p.rtt == null ? null : Math.round(p.rtt) }; }),
      match: m ? { coz: m.coz, jogadores: m.jogadores.map((j) => ({ id: j.id, nome: j.nome, skin: j.skin })) } : null,
      feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }
  const mandarMesa = (room) => { room.mesaV = room.match.versao; nsp.to(room.code).emit("mesa", K.mesa(room.match)); };

  // ---------- partida ----------
  function startMatch(room) {
    const lista = cozinheiros(room).map((p) => ({ id: p.id, nome: p.name, skin: p.skin }));
    room.match = K.novaPartida(room.config.cozinha, lista);
    room.phase = "play"; room.frame = 0; room.acum = 0; room.ultTick = Date.now();
    log(room, `Cozinha aberta: ${K.COZINHAS[room.match.coz].nome}.`);
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK * 1000);
    broadcast(room); mandarMesa(room);
  }
  // o relógio do jogo anda com o relógio de verdade: o setInterval do Windows atrasa (~40 voltas por segundo), então
  // cada volta roda quantos passos de 1/60 s couberem no tempo que passou
  function tick(room) {
    const m = room.match; if (!m || room.phase !== "play") return;
    const agora = Date.now(); room.acum = Math.min(0.25 * VEL, room.acum + VEL * (agora - room.ultTick) / 1000); room.ultTick = agora;
    while (room.acum >= TICK) { room.acum -= TICK; K.passo(m, TICK); }
    if (m.ev.length) nsp.to(room.code).emit("ev", m.ev.splice(0));
    room.frame++;
    if (m.versao !== room.mesaV || (agora - (room.ultMesa || 0) >= MESA_MS && K.andando(m))) { room.ultMesa = agora; mandarMesa(room); }
    if (agora - (room.ultSnap || 0) >= SNAP_MS) { room.ultSnap = agora; nsp.to(room.code).volatile.emit("snap", { t: Date.now(), j: m.jogadores.map((j) => [j.id, q2(j.x), q2(j.z), q2(j.vx), q2(j.vz), q2(j.d || 0)]) }); }
    if (m.fase === "fim") {
      room.phase = "over"; clearInterval(room.loop); room.loop = null;
      const nomes = m.jogadores.map((j) => j.nome);
      if (m.estrelas > 0) noite.vitoria("cozinha", room.code, nomes, []); else noite.vitoria("cozinha", room.code, [], nomes);
      log(room, `Fim do expediente: ${m.pontos} pontos e ${m.estrelas} ${m.estrelas === 1 ? "estrela" : "estrelas"}.`);
      broadcast(room); mandarMesa(room);
    }
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    const jogadorDe = (room, me) => room && me && room.match && room.match.jogadores.find((j) => j.id === me.id);
    function addPlayer(room, name, skin) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, chef: room.phase === "lobby" && cozinheiros(room).length < MAX_COZINHEIROS, skin: Campo.SKINS[skin] ? skin : "padrao", rtt: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    // a posição que veio do navegador: sem teletransporte e fora das bancadas
    function acertarPosicao(room, j, d) {
      const { x, z } = d; if (!fin(x) || !fin(z)) return;
      const m = room.match, now = Date.now(), dt = Math.min(0.5, (now - (j.ultSt || now - 33)) / 1000) + 0.06, max = K.MOV.dash * 1.3 * dt;
      if (m.fase !== "jogo") return;
      const dx = x - j.x, dz = z - j.z, dd = Math.hypot(dx, dz), k = dd > max ? max / dd : 1;
      j.x += dx * k; j.z += dz * k;
      if (fin(d.vx) && fin(d.vz)) { j.vx = clamp(d.vx, -K.MOV.dash, K.MOV.dash); j.vz = clamp(d.vz, -K.MOV.dash, K.MOV.dash); }
      if (fin(d.d)) j.d = d.d;
      K.colidir(m.mapa, j); j.ultSt = now;
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], match: null, feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin);
      room.host = p.id; bind(room, p.id);
      log(room, `Cozinha aberta por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); broadcast(room); if (room.match) socket.emit("mesa", K.mesa(room.match)); return; }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); broadcast(room); if (room.match) socket.emit("mesa", K.mesa(room.match)); return; }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX_SALA) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin);
      bind(room, p.id);
      log(room, `${name} chegou na cozinha.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
      if (room.match) socket.emit("mesa", K.mesa(room.match));
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "chef") { // entrar na cozinha ou ficar só olhando
          if (!me || playing) return "Só dá para trocar fora do expediente.";
          if (data.on && !me.chef && cozinheiros(room).length >= MAX_COZINHEIROS) return `A cozinha já tem ${MAX_COZINHEIROS} cozinheiros.`;
          me.chef = !!data.on; return;
        }
        if (type === "skin") { if (!me || !Campo.SKINS[data.skin]) return "Skin inválida."; me.skin = data.skin; return; }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora do expediente.";
          room.config = cleanConfig(data.config); return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora do expediente.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da cozinha.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador abre a cozinha.";
          if (!cozinheiros(room).length) return "Entre na cozinha para jogar.";
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

    // minha posição (~30 por segundo)
    socket.on("st", (d = {}) => {
      const { room, me } = ctx(), j = jogadorDe(room, me);
      if (!j || room.phase !== "play") return;
      acertarPosicao(room, j, d);
    });
    // pegar/soltar e usar: vêm com a posição e a frente de quando apertou, para a bancada ser a que o navegador acendeu
    socket.on("pegar", (d = {}) => {
      const { room, me } = ctx(), j = jogadorDe(room, me);
      if (!j || room.phase !== "play") return;
      acertarPosicao(room, j, d);
      if (K.interagir(room.match, j) || room.match.ev.length) tick0(room);
    });
    socket.on("usar", (d = {}) => {
      const { room, me } = ctx(), j = jogadorDe(room, me);
      if (!j || room.phase !== "play") return;
      acertarPosicao(room, j, d);
      if (K.usar(room.match, j)) tick0(room);
    });
    // manda na hora o que mudou (sem esperar o próximo passo)
    function tick0(room) {
      const m = room.match;
      if (m.ev.length) nsp.to(room.code).emit("ev", m.ev.splice(0));
      if (m.versao !== room.mesaV) mandarMesa(room);
    }

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
