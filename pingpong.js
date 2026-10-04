// Pingue-Pongue da Galera — tênis de mesa 1x1 pela internet. Canal "/pingpong" do Socket.io.
// "Quem rebate manda": quem bate na bola manda a batida (posição, velocidade e a hora no relógio do servidor) e o
// servidor repassa. Como a bola só tem gravidade e quique, os dois navegadores calculam o mesmo voo. Quem decide o
// ponto é quem está recebendo a bola (é na tela dele que ela chega ou não na raquete). As raquetes vão e voltam
// ~30x por segundo só para aparecer na tela do outro.
const P = require("./public/pingpong/regras.js");
const { SKINS } = require("./public/pelada/campo.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");

const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const vec = (a) => Array.isArray(a) && a.length === 3 && a.every(fin) && Math.abs(a[0]) < 8 && a[1] > -1 && a[1] < 8 && Math.abs(a[2]) < 10;
const PAUSA_MS = 1300, SEM_RESPOSTA_MS = 9000;

module.exports = function attachPingPong(io) {
  const nsp = io.of("/pingpong");
  const rooms = new Map();
  const cleanConfig = (c = {}) => ({ pontos: int(c.pontos, 11) === 21 ? 21 : 11, games: int(c.games, 1) === 3 ? 3 : 1 });
  const ladoDe = (room, id) => room.lados.indexOf(id);

  function publicState(room) {
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, lados: room.lados, placar: room.placar, prontoEm: room.prontoEm, ultimo: room.ultimo,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, skin: p.skin, online: p.sockets.size > 0 }; }),
      now: Date.now(),
    };
  }
  const broadcast = (room) => nsp.to(room.code).emit("state", publicState(room));
  function ponto(room, lado, motivo) {
    clearTimeout(room.timer); room.rally = null;
    const r = P.marcar(room.placar, lado), nome = room.players[room.lados[lado]]?.name || "?";
    room.ultimo = { lado, motivo, nome, t: Date.now() };
    if (r.fim) room.phase = "fim";
    room.prontoEm = Date.now() + (r.fimGame ? PAUSA_MS * 2 : PAUSA_MS);
    broadcast(room);
  }

  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name, skin) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, skin: SKINS[skin] ? skin : "padrao", sockets: new Set() };
      room.order.push(id);
      const livre = room.lados.indexOf(null); if (livre >= 0) room.lados[livre] = id;
      return room.players[id];
    }
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));
    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], lados: [null, null], placar: null, rally: null, prontoEm: 0, ultimo: null, t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin); room.host = p.id; bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name); if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= 10) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin); bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token }); broadcast(room);
    });
    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx(); if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, jogando = room.phase === "jogo";
      const err = (() => {
        if (type === "skin") { if (!me || !SKINS[data.skin]) return "Skin inválida."; me.skin = data.skin; return; }
        if (type === "config") { if (!isHost || jogando) return "Só o organizador muda, fora do jogo."; room.config = cleanConfig(data.config); return; }
        if (type === "lado") { // senta na mesa (0 ou 1) ou sai dela (-1)
          if (!me || jogando) return "Só dá para trocar fora do jogo.";
          const l = int(data.lado, -1), at = ladoDe(room, me.id);
          if (l >= 0 && l <= 1) { if (room.lados[l] && room.lados[l] !== me.id) return "Esse lado já tem jogador."; if (at >= 0) room.lados[at] = null; room.lados[l] = me.id; }
          else if (at >= 0) room.lados[at] = null;
          return;
        }
        if (type === "start") {
          if (!isHost) return "Só o organizador começa.";
          if (!room.lados[0] || !room.lados[1]) return "Precisa de um jogador em cada lado da mesa.";
          room.placar = P.novoPlacar(room.config, Math.random() < 0.5 ? 0 : 1);
          Object.assign(room, { phase: "jogo", rally: null, ultimo: null, prontoEm: Date.now() + 1500 }); return;
        }
        if (type === "lobby") { if (!isHost) return "Só o organizador."; clearTimeout(room.timer); Object.assign(room, { phase: "lobby", rally: null }); return; }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb); broadcast(room);
    });
    // a batida (ou o saque) de quem está na mesa
    socket.on("bola", (d = {}) => {
      const { room, me } = ctx(); if (!room || !me || room.phase !== "jogo" || !vec(d.p) || !vec(d.v)) return;
      const lado = ladoDe(room, me.id), now = Date.now(); if (lado < 0) return;
      if (d.saque) { if (room.rally || lado !== room.placar.sacador || now < room.prontoEm - 200) return; }
      else if (!room.rally || room.rally.quem === lado) return;
      const t = fin(d.t) ? Math.max(now - 400, Math.min(now, d.t)) : now;
      room.rally = { quem: lado, saque: !!d.saque, t };
      socket.to(room.code).emit("bola", { p: d.p, v: d.v, quem: lado, saque: !!d.saque, t, giro: fin(d.giro) ? d.giro : 0 });
      clearTimeout(room.timer); room.timer = setTimeout(() => room.rally && room.rally.t === t && ponto(room, lado, "sem resposta"), SEM_RESPOSTA_MS);
    });
    // o ponto: quem decide é quem está recebendo a bola
    socket.on("ponto", (d = {}) => {
      const { room, me } = ctx(); if (!room || !me || room.phase !== "jogo" || !room.rally) return;
      if (ladoDe(room, me.id) !== 1 - room.rally.quem) return;
      const v = int(d.vence, -1); if (v !== 0 && v !== 1) return;
      ponto(room, v, typeof d.motivo === "string" ? d.motivo.slice(0, 40) : "");
    });
    socket.on("raq", (d = {}) => {
      const { room, me } = ctx(); if (!room || !me || !fin(d.x) || !fin(d.z) || !fin(d.y)) return;
      const lado = ladoDe(room, me.id); if (lado < 0) return;
      socket.to(room.code).volatile.emit("raq", { lado, x: d.x, y: d.y, z: d.z });
    });
    socket.on("disconnect", () => { const { room, me } = ctx(); if (!room) return; if (me) me.sockets.delete(socket.id); broadcast(room); });
  });
  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => clearTimeout(r.timer) });
};
