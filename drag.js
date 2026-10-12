// Arrancada JDM — tune um carro japonês e aposte numa corrida de arrancada (1/4 de milha). Canal "/drag" do Socket.io.
// A sala tem rodadas: garagem (comprar o carro e as peças) -> apostas -> largada -> resultado. O caixa de cada um
// passa de rodada em rodada, e quem terminar mais rico ganha. O servidor roda a física (public/drag/regras.js) e manda
// a posição dos carros 20 vezes por segundo; o navegador só desenha e manda "largar" e "nos".
//
// Dados dos carros: o AutoHub (steadyapi.com) pede chave e a ficha técnica fica numa tabela local (regras.js). A
// lista de modelos de cada marca vem da vPIC da NHTSA (pública, sem chave) por /api/drag/marca/:marca, com cache; se a
// internet falhar, a página só não mostra os modelos.
const D = require("./public/drag/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js");

const MAX_HUMANOS = 6, CAIXA_INICIAL = 2000, SALARIO = 250, PREMIO_CORRIDA = 300;
const T_GARAGEM = +process.env.DRAG_GARAGEM_MS || 90000, T_APOSTAS = +process.env.DRAG_APOSTAS_MS || 30000, T_RESULTADO = +process.env.DRAG_RESULTADO_MS || 20000;
const T_LUZES = +process.env.DRAG_LUZES_MS || 3200, T_ESPERA_LARGADA = 2500, T_MAX_CORRIDA = 45000, TICK_MS = 50;
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BOTS = ["Tofu", "Mestre Kenji", "Drift King", "Sakura"];

// ---- vPIC (NHTSA): modelos de uma marca, com cache de um dia ----
const MARCAS = new Set(D.CARROS.map((c) => c.marca.toLowerCase()));
const cacheMarcas = new Map();
async function modelosDaMarca(marca) {
  marca = String(marca || "").toLowerCase();
  if (!MARCAS.has(marca)) return null;
  const c = cacheMarcas.get(marca);
  if (c && Date.now() - c.t < 24 * 3600e3) return c.modelos;
  try {
    const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(marca)}?format=json`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error("vPIC " + r.status);
    const j = await r.json();
    const modelos = [...new Set((j.Results || []).map((x) => String(x.Model_Name || "").trim()).filter(Boolean))].sort().slice(0, 80);
    cacheMarcas.set(marca, { t: Date.now(), modelos });
    return modelos;
  } catch { cacheMarcas.set(marca, { t: Date.now() - 23 * 3600e3, modelos: c ? c.modelos : null }); return c ? c.modelos : null; } // tenta de novo daqui a uma hora
}

function attachDrag(io) {
  const nsp = io.of("/drag");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({ rodadas: [1, 3, 5].includes(int(c.rodadas, 3)) ? int(c.rodadas, 3) : 3, bots: c.bots !== false });
  const log = (room, text) => { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); };
  const humanos = (room) => room.order.map((id) => room.players[id]);
  const nomeDe = (room, id) => (room.players[id] ? room.players[id].name : (room.robos.find((r) => r.id === id) || {}).nome || "?");
  const online = (p) => p.sockets.size > 0;

  // quem corre: os humanos que têm carro e os robôs (completando 4, se ligado)
  function corredores(room) {
    const hs = humanos(room).filter((p) => p.carro).slice(0, MAX_HUMANOS).map((p) => ({ id: p.id, nome: p.name, humano: true, carro: p.carro, pecas: p.pecas }));
    const bs = room.config.bots ? room.robos.slice(0, Math.max(0, 4 - hs.length)).map((r) => ({ id: r.id, nome: r.nome, humano: false, carro: r.carro, pecas: r.pecas })) : [];
    return [...hs, ...bs];
  }
  const fichaDe = (r) => D.ficha(D.carroPorId(r.carro), r.pecas);

  function publicState(room) {
    const rc = room.phase === "lobby" || room.phase === "garage" ? [] : room.pista ? room.pista.lista : corredores(room);
    const pool = room.apostas ? room.apostas.reduce((s, a) => s + a.valor, 0) : 0;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, rodada: room.rodada, deadline: room.deadline,
      players: humanos(room).map((p) => ({ id: p.id, name: p.name, online: online(p), ping: null, caixa: p.caixa, carro: p.carro, pecas: p.pecas, pronto: p.pronto, apostou: !!(room.apostas || []).find((a) => a.id === p.id) })),
      corredores: rc.map((r) => {
        const est = D.estimar(fichaDe(r));
        const noAlvo = (room.apostas || []).filter((a) => a.alvo === r.id).reduce((s, a) => s + a.valor, 0);
        return { id: r.id, nome: r.nome, humano: r.humano, carro: r.carro, pecas: r.pecas, estimativa: +est.tempo.toFixed(2), vel: Math.round(est.vel), apostado: noAlvo };
      }),
      apostas: room.phase === "bets" ? room.apostas.map((a) => ({ id: a.id, alvo: a.alvo, valor: a.valor })) : room.phase === "lobby" || room.phase === "garage" ? [] : room.apostasFeitas,
      pool,
      pista: room.pista ? { verde: room.pista.verde, estado: room.pista.estado, quarto: D.QUARTO } : null,
      resultado: room.resultado, historico: room.historico, feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- fases ----------
  function agendar(room, ms, fn) {
    clearTimeout(room.timer);
    room.deadline = ms ? Date.now() + ms : null;
    const rodada = room.rodada, phase = room.phase;
    if (ms) room.timer = setTimeout(() => { if (room.rodada === rodada && room.phase === phase) fn(room); }, ms);
  }
  function robosEvoluem(room) {
    for (const r of room.robos) {
      if (!r.carro) { // cada robô começa com um carro sorteado
        const lista = D.CARROS.filter((c) => c.preco <= 600);
        r.carro = lista[Math.floor(Math.random() * lista.length)].id; r.pecas = D.pecasZeradas();
      }
      const keys = Object.keys(D.PECAS).filter((k) => r.pecas[k] < D.NIVEL_MAX);
      const n = room.rodada === 1 ? 2 : 1; // melhora uma ou duas peças por rodada
      for (let i = 0; i < n && keys.length; i++) { const k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0]; r.pecas[k]++; }
    }
  }
  function comecarRodada(room) {
    room.rodada++;
    room.phase = "garage"; room.pista = null; room.resultado = null; room.apostas = []; room.apostasFeitas = [];
    for (const p of humanos(room)) { p.pronto = false; if (room.rodada > 1) p.caixa += SALARIO; }
    robosEvoluem(room);
    log(room, room.rodada === 1 ? "🔧 A garagem abriu: escolha o carro e tune." : `🔧 Rodada ${room.rodada}: a diretoria pagou ${SALARIO} ¥ de patrocínio. Dá para tunar mais.`);
    agendar(room, T_GARAGEM, abrirApostas);
    broadcast(room);
  }
  const todosProntos = (room) => humanos(room).filter((p) => online(p) && (room.phase === "garage" ? true : p.carro)).every((p) => p.pronto);
  function abrirApostas(room) {
    if (room.phase !== "garage") return;
    for (const p of humanos(room)) if (!p.carro) { // quem não escolheu carro e tem dinheiro fica com o mais barato
      const c = D.CARROS.filter((x) => x.preco <= p.caixa).sort((a, b) => a.preco - b.preco)[0];
      if (c) { p.carro = c.id; p.caixa -= c.preco; log(room, `${p.name} ficou com o ${c.nome} (o tempo acabou).`); }
    }
    if (!corredores(room).length) { room.phase = "lobby"; room.rodada = 0; agendar(room, 0); return broadcast(room); }
    room.phase = "bets"; room.apostas = [];
    for (const p of humanos(room)) p.pronto = false;
    log(room, "💰 Apostas abertas: em quem vai ganhar?");
    agendar(room, T_APOSTAS, largar);
    broadcast(room);
  }
  function largar(room) {
    if (room.phase !== "bets") return;
    // trava as apostas: o dinheiro sai do caixa agora
    room.apostas = room.apostas.filter((a) => {
      const p = room.players[a.id]; if (!p || a.valor > p.caixa || a.valor <= 0) return false;
      p.caixa -= a.valor; return true;
    });
    room.apostasFeitas = room.apostas.map((a) => ({ ...a }));
    const lista = corredores(room);
    const verde = Date.now() + T_LUZES + Math.floor(Math.random() * 900);
    room.pista = {
      verde, estado: "luzes", lista,
      carros: lista.map((r) => {
        const c = D.novoCorredor(fichaDe(r), 0);
        Object.assign(c, { id: r.id, humano: r.humano, largou: false, salida: null, falso: false, nosAuto: null });
        if (!r.humano) { c.largou = true; c.salida = +(0.16 + Math.random() * 0.2).toFixed(3); c.nosAuto = 1 + Math.random() * 3.5; }
        return c;
      }),
      sim: 0,
    };
    room.phase = "race"; agendar(room, 0);
    log(room, "🚦 Todo mundo na linha! Largue quando o verde acender.");
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK_MS);
    broadcast(room);
  }
  function tick(room) {
    const pista = room.pista;
    if (!pista || room.phase !== "race") { clearInterval(room.loop); room.loop = null; return; }
    const agora = Date.now(), el = (agora - pista.verde) / 1000; // segundos desde o verde
    if (el >= -0.0 && pista.estado === "luzes") { pista.estado = "correndo"; nsp.to(room.code).emit("ev", [{ tipo: "verde" }]); }
    if (el >= T_ESPERA_LARGADA / 1000) for (const c of pista.carros) if (!c.largou) { c.largou = true; c.salida = T_ESPERA_LARGADA / 1000; } // dormiu no ponto
    if (el > 0) {
      for (const c of pista.carros) {
        if (!c.largou || c.fim != null) continue;
        const alvo = el - c.salida - (c.falso ? 0.8 : 0); // queimou a largada: 0,8 s de castigo
        let n = 0;
        while (c.t < alvo && c.fim == null && n++ < 200) {
          if (c.nosAuto != null && c.t >= c.nosAuto) D.usarNitro(c);
          D.passo(c, 0.01);
        }
        if (c.fim != null) c.total = c.fim + c.salida + (c.falso ? 0.8 : 0);
      }
    }
    nsp.to(room.code).volatile.emit("snap", { el: +el.toFixed(3), c: pista.carros.map((c) => [c.id, +c.x.toFixed(2), +c.v.toFixed(2), c.marcha, c.nosRest > 0 ? 1 : 0, c.patina ? 1 : 0, c.fim != null ? +c.total.toFixed(3) : null, c.largou ? 1 : 0, c.falso ? 1 : 0]) });
    if (pista.carros.every((c) => c.fim != null) || agora - pista.verde > T_MAX_CORRIDA) fimDaCorrida(room);
  }
  function fimDaCorrida(room) {
    clearInterval(room.loop); room.loop = null;
    const pista = room.pista;
    const ordem = [...pista.carros].sort((a, b) => (a.fim != null && b.fim != null ? a.total - b.total : a.fim != null ? -1 : b.fim != null ? 1 : b.x - a.x));
    const vencedor = ordem[0].id;
    const pg = D.pagar(room.apostasFeitas, vencedor);
    const pagamentos = [];
    for (const x of pg) { const p = room.players[x.id]; if (p) { p.caixa += x.ganho; pagamentos.push({ id: p.id, nome: p.name, aposta: x.valor, delta: x.delta, alvo: room.apostasFeitas.find((a) => a.id === x.id).alvo }); } }
    const premiado = room.players[vencedor];
    if (premiado) { premiado.caixa += PREMIO_CORRIDA; premiado.vitorias++; }
    room.resultado = {
      vencedor, premio: premiado ? PREMIO_CORRIDA : 0, pagamentos,
      ordem: ordem.map((c) => ({ id: c.id, nome: nomeDe(room, c.id), humano: c.humano, tempo: c.fim != null ? +c.fim.toFixed(3) : null, total: c.fim != null ? +c.total.toFixed(3) : null, vel: c.vfim != null ? Math.round(c.vfim * 3.6) : null, falso: c.falso, carro: pista.lista.find((r) => r.id === c.id).carro })),
    };
    room.historico.push({ rodada: room.rodada, vencedor: nomeDe(room, vencedor), tempo: room.resultado.ordem[0].total });
    log(room, `🏁 ${nomeDe(room, vencedor)} venceu a rodada ${room.rodada}${room.resultado.ordem[0].total ? " em " + room.resultado.ordem[0].total.toFixed(2) + " s" : ""}.`);
    room.phase = "result"; pista.estado = "fim";
    nsp.to(room.code).emit("ev", [{ tipo: "fim" }]);
    if (room.rodada >= room.config.rodadas) agendar(room, T_RESULTADO, fimDoJogo);
    else agendar(room, T_RESULTADO, comecarRodada);
    broadcast(room);
  }
  function fimDoJogo(room) {
    if (room.phase !== "result") return;
    room.phase = "final"; agendar(room, 0);
    const hs = humanos(room).sort((a, b) => b.caixa - a.caixa);
    room.placar = hs.map((p) => ({ id: p.id, nome: p.name, caixa: p.caixa, vitorias: p.vitorias }));
    if (hs.length) {
      const top = hs[0].caixa;
      noite.vitoria("drag", room.code, hs.filter((p) => p.caixa === top).map((p) => p.name), hs.filter((p) => p.caixa !== top).map((p) => p.name));
      log(room, `🏆 ${hs[0].name} fechou o campeonato com ${hs[0].caixa} ¥.`);
    }
    broadcast(room);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const id = rid(6);
      room.players[id] = { id, token: rid(12), name, sockets: new Set(), caixa: CAIXA_INICIAL, carro: null, pecas: D.pecasZeradas(), pronto: false, vitorias: 0 };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], robos: BOTS.map((n, i) => ({ id: "bot" + i, nome: "🤖 " + n, carro: null, pecas: D.pecasZeradas() })), rodada: 0, apostas: [], apostasFeitas: [], pista: null, resultado: null, historico: [], deadline: null, feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id; bind(room, p.id);
      log(room, `Garagem aberta por ${name}.`);
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
      if (room.phase !== "lobby" && room.rodada > 0 && room.phase !== "garage") return fail(cb, "A corrida já começou. Você pode entrar para assistir ou esperar a próxima partida.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} chegou na garagem.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

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
          log(room, `${p.name} saiu da garagem.`); return;
        }
        if (type === "start") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador começa.";
          for (const p of humanos(room)) Object.assign(p, { caixa: CAIXA_INICIAL, carro: null, pecas: D.pecasZeradas(), pronto: false, vitorias: 0 });
          room.rodada = 0; room.historico = []; room.placar = null;
          comecarRodada(room); return;
        }
        if (type === "lobby") {
          if (!isHost || room.phase === "lobby") return "Só o organizador.";
          clearTimeout(room.timer); clearInterval(room.loop); room.loop = null;
          room.phase = "lobby"; room.rodada = 0; room.pista = null; room.resultado = null; room.deadline = null; return;
        }
        if (type === "next") {
          if (!isHost || room.phase !== "result") return "Só o organizador adianta.";
          if (room.rodada >= room.config.rodadas) fimDoJogo(room); else comecarRodada(room); return;
        }
        if (!me) return "Você está só assistindo.";
        if (type === "carro") {
          if (room.phase !== "garage") return "A garagem está fechada.";
          if (me.carro) return "Você já tem carro.";
          const c = D.carroPorId(data.id); if (!c) return "Carro inválido.";
          if (c.preco > me.caixa) return `Falta dinheiro: o ${c.nome} custa ${c.preco} ¥.`;
          me.caixa -= c.preco; me.carro = c.id; return;
        }
        if (type === "peca") {
          if (room.phase !== "garage") return "A garagem está fechada.";
          if (!me.carro) return "Escolha o carro primeiro.";
          const k = data.peca; if (!D.PECAS[k]) return "Peça inválida.";
          const nv = me.pecas[k] + 1, custo = D.custoDaPeca(k, nv);
          if (custo == null) return "Essa peça já está no máximo.";
          if (custo > me.caixa) return `Falta dinheiro: custa ${custo} ¥.`;
          me.caixa -= custo; me.pecas[k] = nv; me.pronto = false; return;
        }
        if (type === "pronto") {
          if (room.phase === "garage") { if (!me.carro) return "Escolha o carro primeiro."; me.pronto = data.pronto !== false; if (todosProntos(room)) abrirApostas(room); return; }
          if (room.phase === "bets") { me.pronto = data.pronto !== false; if (todosProntos(room)) largar(room); return; }
          return "Agora não.";
        }
        if (type === "apostar") {
          if (room.phase !== "bets") return "As apostas não estão abertas.";
          const alvo = corredores(room).find((r) => r.id === data.alvo);
          if (!alvo) return "Corredor inválido.";
          const valor = clamp(int(data.valor, 0), 0, me.caixa);
          room.apostas = room.apostas.filter((a) => a.id !== me.id);
          if (valor > 0) room.apostas.push({ id: me.id, alvo: alvo.id, valor });
          return;
        }
        if (type === "largar") {
          const c = room.phase === "race" && room.pista && room.pista.carros.find((x) => x.id === me.id);
          if (!c || c.largou) return;
          const agora = Date.now(), t = Number.isFinite(data.t) ? clamp(data.t, agora - 1500, agora) : agora;
          const rea = (t - room.pista.verde) / 1000;
          if (rea < 0) { c.falso = true; c.salida = 0.1; } else c.salida = Math.max(0.05, rea);
          c.largou = true; return;
        }
        if (type === "nos") {
          const c = room.phase === "race" && room.pista && room.pista.carros.find((x) => x.id === me.id);
          if (!c || !c.largou || c.fim != null) return;
          D.usarNitro(c); return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      if (!["largar", "nos"].includes(type)) broadcast(room);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => { clearTimeout(r.timer); clearInterval(r.loop); } });
}

module.exports = attachDrag;
module.exports.modelosDaMarca = modelosDaMarca;
