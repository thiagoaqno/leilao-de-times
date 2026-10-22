// Drag da Galera — o racha com a galera: até 4 pessoas na mesma sala, cada uma numa faixa, e os rivais robôs nas
// faixas que sobram. Canal "/drag" do Socket.io.
// A corrida roda nos navegadores (public/corrida/drag/logic.mjs): cada um pilota o próprio carro e manda o estado
// ~12 vezes por segundo, e o organizador pilota também os robôs. Aqui ficam a sala, a escolha dos carros e da pista,
// a largada (todos começam juntos, no mesmo instante do relógio do servidor), o repasse das posições e o resultado.
// O tráfego e as obras saem da mesma semente em todos os navegadores, então a rua é a mesma para todo mundo.
const { pathToFileURL } = require("url");
const path = require("path");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js");
const noite = require("./noite.js"); // o placar da Noite da Galera

const MAX = 4, PISTAS = 4, ESPERA_PRONTOS_MS = 25000, ATE_LARGAR_MS = 1200, ESPERA_CHEGADA_MS = 25000, CORRIDA_MAX_MS = 150000;
const FAIXAS = [1, 2, 0, 3]; // quem entra primeiro fica com as faixas do meio
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// os carros e os rivais vêm das regras do navegador (um módulo ES): até carregar, só o Supra e nomes provisórios
let CARROS = ["supra"], RIVAIS = [{ nome: "Duda Neon" }, { nome: "Rafa Turbo" }, { nome: "Bia Escape" }];
import(pathToFileURL(path.join(__dirname, "public/corrida/drag/logic.mjs")).href)
  .then((L) => { CARROS = Object.keys(L.CARROS); RIVAIS = L.RIVAIS; })
  .catch((e) => console.warn("Drag: não carregou as regras", e.message));

module.exports = function attachDrag(io) {
  const nsp = io.of("/drag");
  const rooms = new Map();
  require("./lobby.js").registrar("drag", rooms, { max: MAX });

  const pilotos = (room) => room.order.map((id) => room.players[id]);
  function publicState(room) {
    const c = room.corrida;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, carro: p.carro, online: p.sockets.size > 0, pronto: !!(c && c.prontos.has(id)), ping: p.rtt == null ? null : Math.round(p.rtt) }; }),
      corrida: c ? { semente: c.semente, pista: c.pista, participantes: c.participantes, inicio: c.inicio, resultado: c.resultado } : null,
      now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }
  function limparTimers(room) { for (const k of ["tProntos", "tChegada", "tMax"]) { clearTimeout(room[k]); room[k] = null; } }

  // ---------- a corrida ----------
  function comecar(room) {
    limparTimers(room);
    const gente = pilotos(room), usados = new Set(gente.map((p) => p.carro));
    const livres = CARROS.filter((id) => !usados.has(id)).sort(() => Math.random() - 0.5);
    const participantes = gente.map((p, i) => ({ id: p.id, nome: p.name, carro: p.carro, lane: FAIXAS[i], robo: false }));
    const faixasLivres = FAIXAS.slice(gente.length);
    faixasLivres.forEach((lane, i) => participantes.push({ id: null, nome: RIVAIS[i % RIVAIS.length].nome, carro: livres[i % Math.max(1, livres.length)] || "supra", lane, robo: true, rival: i % RIVAIS.length }));
    participantes.sort((a, b) => a.lane - b.lane);
    room.corrida = { semente: 1 + Math.floor(Math.random() * 0xfffff), pista: room.config.pista, participantes, prontos: new Set(), inicio: null, chegadas: new Map(), resultado: null };
    room.phase = "carregando";
    // quem não terminou de carregar em 25 s não segura a largada dos outros
    room.tProntos = setTimeout(() => largar(room), ESPERA_PRONTOS_MS);
    broadcast(room);
  }
  function largar(room) {
    const c = room.corrida; if (!c || room.phase !== "carregando") return;
    clearTimeout(room.tProntos); room.tProntos = null;
    c.inicio = Date.now() + ATE_LARGAR_MS; room.phase = "corrida";
    room.tMax = setTimeout(() => fechar(room), ATE_LARGAR_MS + CORRIDA_MAX_MS);
    broadcast(room);
  }
  // uma chegada (ou quebra): de cada pessoa, pela faixa dela; dos robôs, pelo organizador
  function chegou(room, lane, d) {
    const c = room.corrida; if (!c || room.phase !== "corrida" || c.chegadas.has(lane)) return;
    const motivo = ["chegada", "motor", "perda-total"].includes(d.motivo) ? d.motivo : "chegada";
    c.chegadas.set(lane, { tempo: motivo === "chegada" && fin(d.tempo) ? clamp(d.tempo, 1, 600) : null, motivo, estimado: !!d.estimado });
    const humanos = c.participantes.filter((p) => !p.robo);
    if (humanos.every((p) => c.chegadas.has(p.lane))) return fechar(room);
    if (!room.tChegada) room.tChegada = setTimeout(() => fechar(room), ESPERA_CHEGADA_MS); // o primeiro chegou: os outros têm 25 s
    nsp.to(room.code).emit("chegou", { lane, ...c.chegadas.get(lane) });
  }
  function fechar(room) {
    const c = room.corrida; if (!c || room.phase !== "corrida") return;
    limparTimers(room);
    const ordem = c.participantes.map((p) => {
      const r = c.chegadas.get(p.lane);
      return { nome: p.nome, lane: p.lane, robo: p.robo, carro: p.carro, tempo: r ? r.tempo : null, fora: r ? (r.motivo === "motor" ? "motor" : r.motivo === "perda-total" ? "perda total" : null) : "não chegou" };
    }).sort((a, b) => !!a.fora - !!b.fora || (a.tempo ?? Infinity) - (b.tempo ?? Infinity));
    c.resultado = ordem; room.phase = "resultado";
    const humanos = ordem.filter((o) => !o.robo), venceu = humanos.find((o) => !o.fora && o === ordem[0]);
    if (humanos.length) noite.vitoria("drag", room.code, venceu ? [venceu.nome] : [], humanos.filter((o) => o !== venceu).map((o) => o.nome));
    broadcast(room);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    const carroValido = (id) => (CARROS.includes(id) ? id : "supra");
    function addPlayer(room, name, carro) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, carro: carroValido(carro), rtt: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: { pista: 0 }, players: {}, order: [], corrida: null, t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.carro);
      room.host = p.id; bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); broadcast(room); return; }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX) return fail(cb, "O racha já tem 4 pilotos.");
      if (room.phase !== "lobby" && room.phase !== "resultado") return fail(cb, "A corrida já começou. Espere ela acabar para entrar.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.carro);
      bind(room, p.id);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, correndo = room.phase === "carregando" || room.phase === "corrida";
      const err = (() => {
        if (!me) return "Você não está no racha.";
        if (type === "carro") { if (correndo) return "Só dá para trocar de carro fora da corrida."; me.carro = carroValido(data.carro); return; }
        if (type === "pista") {
          if (!isHost || correndo) return "Só o organizador escolhe a pista, fora da corrida.";
          const n = Number(data.pista); if (!Number.isInteger(n) || n < 0 || n >= PISTAS) return "Pista inválida.";
          room.config.pista = n; return;
        }
        if (type === "start") { if (!isHost || correndo) return "Só o organizador dá a largada."; comecar(room); return; }
        if (type === "pronto") { // o navegador terminou de carregar os carros e a pista
          const c = room.corrida; if (!c || room.phase !== "carregando") return;
          c.prontos.add(me.id);
          if (pilotos(room).every((p) => c.prontos.has(p.id) || !p.sockets.size)) largar(room);
          return;
        }
        if (type === "lobby") { if (!isHost) return "Só o organizador."; limparTimers(room); room.phase = "lobby"; room.corrida = null; return; }
        if (type === "kick") {
          if (!isHost || correndo) return "Só o organizador, fora da corrida.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Piloto inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id); return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      if (type !== "pronto") broadcast(room);
      else if (room.phase === "carregando") broadcast(room);
    });

    // o estado dos carros que este navegador pilota (o dele e, do organizador, os robôs): repassado aos outros
    socket.on("st", (d = {}) => {
      const { room, me } = ctx(), c = room && room.corrida;
      if (!me || !c || room.phase !== "corrida" || !Array.isArray(d.c)) return;
      const minhas = new Set(c.participantes.filter((p) => p.id === me.id || (p.robo && room.host === me.id)).map((p) => p.lane));
      const carros = d.c.filter((s) => Array.isArray(s) && minhas.has(s[0]) && s.slice(1, 6).every(fin)).slice(0, 4);
      if (carros.length) socket.to(room.code).volatile.emit("st", { c: carros });
    });
    socket.on("fim", (d = {}) => {
      const { room, me } = ctx(), c = room && room.corrida;
      if (!me || !c) return;
      const p = c.participantes.find((x) => x.lane === d.lane);
      if (!p || !(p.id === me.id || (p.robo && room.host === me.id))) return;
      chegou(room, d.lane, d);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      // quem saiu no carregamento não segura a largada; na corrida, conta como não chegou
      if (room.phase === "carregando" && room.corrida && pilotos(room).every((p) => room.corrida.prontos.has(p.id) || !p.sockets.size)) largar(room);
      broadcast(room);
    });
  });

  medirPing(nsp, rooms);
  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => limparTimers(r) });
};
