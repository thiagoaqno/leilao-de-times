// Haxball da Galera: futebol de discos 2D em salas de 1x1 a 5x5.
const H = require("./public/haxball/regras.js");
const { rid, novoCodigo, limparNome, ok, falha, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js");
const configOf = (c = {}) => ({
  size: Math.max(1, Math.min(5, Number.parseInt(c.size, 10) || 1)),
  minutes: [3, 5, 10].includes(Number(c.minutes)) ? Number(c.minutes) : 5,
  goals: [3, 5, 10].includes(Number(c.goals)) ? Number(c.goals) : 5,
});

module.exports = function attachHaxball(io) {
  const nsp = io.of("/haxball"), rooms = new Map();
  require("./lobby.js").registrar("haxball", rooms, { max: 10 });
  const team = (r, t) => r.order.map((id) => r.players[id]).filter((p) => p.team === t);
  function state(r) {
    return { code: r.code, host: r.host, phase: r.phase, config: r.config,
      players: r.order.map((id) => { const p = r.players[id]; return { id, name: p.name, team: p.team, online: p.sockets.size > 0 }; }),
      match: r.match ? H.snapshot(r.match) : null };
  }
  function broadcast(r) { r.t = Date.now(); nsp.to(r.code).emit("state", state(r)); }
  function stop(r) { clearInterval(r.loop); r.loop = null; }
  function start(r) {
    const list = r.order.map((id) => r.players[id]).filter((p) => p.team !== null);
    r.match = H.nova(list, r.config); r.phase = "play";
    stop(r);
    let last = Date.now(), frame = 0;
    r.loop = setInterval(() => {
      const now = Date.now(), dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      const event = H.step(r.match, dt, now);
      if (event === "over") {
        r.phase = "over"; stop(r);
        if (r.match.winner !== null) {
          const win = r.match.winner;
          noite.vitoria("haxball", r.code, list.filter((p) => p.team === win).map((p) => p.name), list.filter((p) => p.team !== win).map((p) => p.name));
        }
      }
      if (event || ++frame % 3 === 0) nsp.to(r.code).volatile.emit("frame", H.snapshot(r.match));
      if (event === "over") broadcast(r);
    }, 1000 / 60);
    broadcast(r);
  }
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (r, id) => ligarSocket(socket, rooms, r, id);
    function add(r, name) {
      const a = team(r, 0).length, b = team(r, 1).length;
      const t = r.phase === "play" ? null : a <= b && a < r.config.size ? 0 : b < r.config.size ? 1 : null;
      const p = { id: rid(6), token: rid(12), name, team: t, sockets: new Set() };
      r.players[p.id] = p; r.order.push(p.id); return p;
    }
    socket.on("create", (data = {}, cb) => {
      const name = limparNome(data.name);
      if (!name) return falha(cb, "Digite seu nome.");
      const r = { code: novoCodigo(rooms), host: null, phase: "lobby", config: configOf(data.config), players: {}, order: [], match: null, loop: null, t: Date.now() };
      rooms.set(r.code, r);
      const p = add(r, name); r.host = p.id; bind(r, p.id);
      ok(cb, { code: r.code, id: p.id, token: p.token }); broadcast(r);
    });
    socket.on("join", (data = {}, cb) => {
      const r = buscarSala(rooms, data.code);
      if (!r) return falha(cb, "Sala não encontrada. Confira o código.");
      const back = quemVolta(r, data);
      if (back) { bind(r, back.id); ok(cb, { code: r.code, id: back.id, token: back.token }); return broadcast(r); }
      if (data.watch) { bind(r, null); ok(cb, { code: r.code, id: null }); return broadcast(r); }
      const name = limparNome(data.name);
      if (!name) return falha(cb, "Digite seu nome.");
      if (r.order.length >= 10) return falha(cb, "Sala cheia. Entre para assistir.");
      if (nomeEmUso(r, name)) return falha(cb, "Já existe alguém com esse nome na sala.");
      const p = add(r, name); bind(r, p.id);
      ok(cb, { code: r.code, id: p.id, token: p.token }); broadcast(r);
    });
    socket.on("act", (data = {}, cb) => {
      const { room: r, me } = ctx();
      if (!r || !me) return falha(cb, "Entre na sala primeiro.");
      const host = r.host === me.id, playing = r.phase === "play";
      if (data.type === "team") {
        if (playing) return falha(cb, "Troque de time entre partidas.");
        const t = data.team === 0 || data.team === 1 ? data.team : null;
        if (t !== null && t !== me.team && team(r, t).length >= r.config.size) return falha(cb, "Esse time está cheio.");
        me.team = t;
      } else if (data.type === "config") {
        if (!host || playing) return falha(cb, "Só o anfitrião configura fora da partida.");
        r.config = configOf(data.config);
        for (const t of [0, 1]) team(r, t).slice(r.config.size).forEach((p) => { p.team = null; });
      } else if (data.type === "start") {
        if (!host || playing) return falha(cb, "Só o anfitrião inicia a partida.");
        if (team(r, 0).length !== r.config.size || team(r, 1).length !== r.config.size) return falha(cb, `Cada time precisa de ${r.config.size} jogador(es).`);
        start(r);
      } else if (data.type === "lobby") {
        if (!host) return falha(cb, "Só o anfitrião pode voltar ao lobby.");
        stop(r); r.match = null; r.phase = "lobby";
      } else if (data.type === "kick") {
        if (!host || playing) return falha(cb, "Só o anfitrião remove jogadores entre partidas.");
        const p = r.players[data.id];
        if (!p || p.id === me.id) return falha(cb, "Jogador inválido.");
        for (const sid of p.sockets) { const s = nsp.sockets.get(sid); if (s) { s.emit("removed"); s.data.pid = null; } }
        delete r.players[p.id]; r.order = r.order.filter((id) => id !== p.id);
      } else return falha(cb, "Ação desconhecida.");
      ok(cb); broadcast(r);
    });
    socket.on("input", (data = {}) => {
      const { room: r, me } = ctx();
      if (!me || r.phase !== "play" || !r.match) return;
      const p = r.match.discs.find((d) => d.id === me.id);
      if (!p) return;
      const x = Number(data.x), y = Number(data.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      p.input = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
      if (data.kick === true) p.kick = true;
    });
    socket.on("disconnect", () => {
      const { room: r, me } = ctx();
      if (!r) return;
      if (me) {
        me.sockets.delete(socket.id);
        if (!me.sockets.size && r.match) { const p = r.match.discs.find((d) => d.id === me.id); if (p) p.input = { x: 0, y: 0 }; }
      }
      if (r.loop && !r.order.some((id) => r.players[id].sockets.size)) { stop(r); r.phase = "lobby"; r.match = null; }
      broadcast(r);
    });
  });
  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: stop });
};
