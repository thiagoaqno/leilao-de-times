// Ginasio da Galera: batalhas em tempo real no canal /ginasio.
// O servidor recebe comandos, roda o motor a 60/s e manda um pacote por jogador a 20/s.
const G = require("./public/ginasio/regras.js");
const Galeramon = require("./public/galeramon/dados.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const NarutoDex = require("./public/galeramon/naruto.js");
const Lideres = require("./public/galeramon/lideres.js"); // os líderes e treinadores da Vila (o time dos robôs)
const { rid, novoCodigo, limparNome, ok, falha, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js");
const noite = require("./noite.js");

const TICK = 1 / 60, SNAP_EVERY = 3, MAX_SALA = 8, COMANDO_MS = 250;
// Os testes aceleram o relogio sem mudar o passo, o dano ou a duracao da partida.
const TESTE = process.env.NODE_ENV === "test";
const TICK_MS = TESTE ? Math.max(1, Number(process.env.GINASIO_TICK_MS) || TICK * 1000) : TICK * 1000;
const PRONTO_MS = TESTE ? 20 : 1500;
const BOT_NOMES = ["Robozinho", "Parafuso", "Tchuco", "Bip-Bop"];
const objeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const finito = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dexDe = (modo) => ({ galeramon: Galeramon, pokemon: PokeDex, naruto: NarutoDex })[modo] || Galeramon;

function limparConfig(c) {
  c = objeto(c) ? c : {};
  // lider: o desafio a um líder ou treinador da Vila (1x1 contra o robô com o time dele)
  const lider = Lideres.de(c.lider) ? c.lider : null;
  return { modo: ["galeramon", "pokemon", "naruto"].includes(c.modo) ? c.modo : "galeramon", formato: lider ? "1x1" : c.formato === "2x2" ? "2x2" : "1x1", bots: lider ? true : c.bots !== false, ...(lider && { lider }) };
}

function timeValido(modo, time) {
  const D = dexDe(modo);
  return Array.isArray(time) && time.length === 3 && new Set(time).size === 3 && time.every((id) => typeof id === "string" && D.IDS.includes(id));
}

function limparComando(d) {
  if (!objeto(d) || !Number.isSafeInteger(d.seq) || d.seq < 0 || ![d.dx, d.dy].every(finito)) return null;
  if (!objeto(d.mira) || ![d.mira.x, d.mira.y].every(finito)) return null;
  if (d.golpe != null && (!Number.isInteger(d.golpe) || d.golpe < 0 || d.golpe > 3)) return null;
  if (d.troca != null && (!Number.isInteger(d.troca) || d.troca < 0 || d.troca > 2)) return null;
  if (d.esquiva != null && typeof d.esquiva !== "boolean") return null;
  if (d.alvo != null && (!objeto(d.alvo) || ![d.alvo.x, d.alvo.y].every(finito))) return null;
  const c = {
    seq: d.seq, dx: clamp(d.dx, -1, 1), dy: clamp(d.dy, -1, 1),
    mira: { x: clamp(d.mira.x, -G.ARENA.w, G.ARENA.w), y: clamp(d.mira.y, -G.ARENA.h, G.ARENA.h) },
  };
  if (d.golpe != null) c.golpe = d.golpe;
  if (d.troca != null) c.troca = d.troca;
  if (d.esquiva) c.esquiva = true;
  if (d.alvo) c.alvo = { x: clamp(d.alvo.x, -G.ARENA.w / 2, G.ARENA.w / 2), y: clamp(d.alvo.y, -G.ARENA.h / 2, G.ARENA.h / 2) };
  return c;
}

const projetilDe = (pr) => ({ id: pr.id, lado: pr.lado, dono: pr.dono, x: pr.x, y: pr.y, dx: pr.dx, dy: pr.dy, v: pr.v, raio: pr.raio, vida: pr.vida, golpe: pr.hab.id, elemento: pr.hab.tipo, classe: pr.hab.classe });
const areaDe = (a) => ({ id: a.id, lado: a.lado, dono: a.dono, x: a.x, y: a.y, r: a.r, falta: a.t, aviso: a.hab.aviso, golpe: a.hab.id, elemento: a.hab.tipo });

module.exports = function ligarGinasio(io) {
  const nsp = io.of("/ginasio"), salas = new Map();
  const tamanho = (sala) => sala.config.formato === "2x2" ? 2 : 1;
  const doLado = (sala, lado) => sala.order.map((id) => sala.players[id]).filter((p) => p.lado === lado);
  const emCampo = (sala, p) => sala.match && sala.match.entidades.find((e) => e.id === p?.id);

  function limparEntrada(p) {
    p.recebida = -1; p.processada = -1; p.comandos = []; p.movimento = null; p.ultComando = 0;
  }
  function novaSala(config) {
    const sala = { code: novoCodigo(salas), host: null, phase: "lobby", config, players: {}, order: [], match: null, results: null, feed: [], loop: null, t: Date.now() };
    salas.set(sala.code, sala);
    return sala;
  }
  function adicionar(sala, name, time) {
    const id = rid(6), n = tamanho(sala), a = doLado(sala, 0).length, b = doLado(sala, 1).length;
    const lado = a <= b && a < n ? 0 : b < n ? 1 : null;
    const p = { id, token: rid(12), name, lado, rtt: null, sockets: new Set(), times: { galeramon: Galeramon.DEFAULT_TEAM.slice(), pokemon: PokeDex.DEFAULT_TEAM.slice(), naruto: NarutoDex.DEFAULT_TEAM.slice() } };
    if (time) p.times[sala.config.modo] = time.slice();
    sala.players[id] = p; sala.order.push(id); limparEntrada(p);
    return p;
  }
  // A Vila reserva os dois lados; cada pessoa assume seu lugar com o proprio token.
  function criarDesafio(modo, a, b) {
    if (!["galeramon", "pokemon", "naruto"].includes(modo)) return null;
    const nomes = [a, b].map((p) => limparNome(p.name));
    if (nomes.some((n) => !n) || ![a, b].every((p) => timeValido(modo, p.team))) return null;
    const sala = novaSala({ modo, formato: "1x1", bots: false });
    const pessoas = [a, b].map((p, i) => adicionar(sala, nomes[i], p.team));
    sala.host = pessoas[0].id;
    log(sala, `Desafio da Vila: ${nomes[0]} contra ${nomes[1]}.`);
    return pessoas.map((p) => ({ code: sala.code, id: p.id, token: p.token }));
  }
  function log(sala, text) {
    sala.feed.push({ t: Date.now(), text });
    if (sala.feed.length > 30) sala.feed.splice(0, sala.feed.length - 30);
  }
  function pacote(sala) {
    const m = sala.match;
    return {
      tempo: m.t, fim: m.fim, vencedor: m.vencedor, empate: m.empate,
      entidades: m.entidades.map((e) => ({
        id: e.id, lado: e.lado, slot: e.slot, x: e.x, y: e.y, vx: e.vx, vy: e.vy, mira: { ...e.mira },
        campo: e.campo, bicho: e.bicho.id, forma: e.bicho.as || e.bicho.id, raio: e.raio,
        hp: e.bicho.hp, max: e.bicho.max, cds: [...e.bicho.cds], st: { ...e.bicho.st },
        ...(m.modo === "naruto" && { chakra: e.bicho.chakra, substitutes: e.jogador.substitutes }),
        esquivaCd: e.esquivaCd, esquivaT: e.esquivaT, invulneravel: e.invulneravel,
        canal: e.canal && { ...e.canal }, escudo: e.escudo && { ...e.escudo },
        dash: e.dash && { x: e.dash.x, y: e.dash.y, falta: e.dash.falta, velocidade: e.dash.hab.velocidade, giro: !!e.dash.hab.giro, elemento: e.dash.hab.tipo },
        oculto: e.oculto && { jeito: e.oculto.jeito, t: e.oculto.t, total: e.oculto.total, de: { ...e.oculto.de }, para: { ...e.oculto.para } },
        ativo: e.jogador.ativo, trocaCd: e.jogador.trocaCd, entradaEm: e.jogador.entradaEm,
        time: e.jogador.time.map((b) => ({ id: b.id, hp: b.hp, max: b.max })),
      })),
      projeteis: m.projeteis.map(projetilDe), areas: m.areas.map(areaDe),
    };
  }
  function publicState(sala) {
    const m = sala.match;
    return {
      code: sala.code, host: sala.host, phase: sala.phase, config: sala.config,
      players: sala.order.map((id) => {
        const p = sala.players[id];
        return { id, name: p.name, lado: p.lado, time: p.times[sala.config.modo], online: p.sockets.size > 0, ping: p.rtt == null ? null : Math.round(p.rtt) };
      }),
      match: m ? {
        start: sala.inicio, end: sala.inicio + m.duracao * 1000, modo: m.modo, formato: m.formato, duracao: m.duracao,
        jogadores: m.lados.flatMap((l) => l.jogadores.map((p) => ({ id: p.id, nome: p.nome, lado: p.lado, slot: p.slot, bot: !!p.bot, time: p.time.map((b) => b.id) }))),
        ...pacote(sala),
      } : null,
      results: sala.results, feed: sala.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(sala) {
    sala.t = Date.now();
    nsp.to(sala.code).emit("state", publicState(sala));
  }
  function enviarPacote(sala, now) {
    const dados = pacote(sala);
    for (const sid of nsp.adapter.rooms.get(sala.code) || []) {
      const socket = nsp.sockets.get(sid);
      if (!socket) continue;
      const p = sala.players[socket.data.pid];
      socket.volatile.emit("snap", { t: now, seq: p ? p.processada : -1, ...dados });
    }
  }

  function parar(sala) {
    clearInterval(sala.loop); sala.loop = null;
    sala.phase = "lobby"; sala.match = null; sala.results = null;
    for (const p of Object.values(sala.players)) limparEntrada(p);
  }
  function comecar(sala) {
    const lados = [0, 1].map((lado) => doLado(sala, lado).map((p) => ({ id: p.id, nome: p.name, bot: false, time: p.times[sala.config.modo] })));
    sala.match = G.criarPartida({ ...sala.config, seed: rid(16) }, lados);
    let b = 0;
    const lider = Lideres.de(sala.config.lider);
    for (const l of sala.match.lados) for (const p of l.jogadores) if (p.bot) p.nome = lider && p.lado === 1 ? lider.nome : BOT_NOMES[b++];
    for (const p of Object.values(sala.players)) limparEntrada(p);
    sala.inicio = Date.now() + PRONTO_MS; sala.frame = 0; sala.results = null; sala.phase = "play";
    log(sala, `Valendo: ${sala.config.formato}, modo ${{ pokemon: "Pokémon", naruto: "Naruto Shippuden" }[sala.config.modo] || "Galeramon"}.`);
    clearInterval(sala.loop);
    sala.loop = setInterval(() => tick(sala), TICK_MS);
  }
  function terminar(sala) {
    const m = sala.match;
    clearInterval(sala.loop); sala.loop = null; sala.phase = "over";
    sala.results = {
      vencedor: m.vencedor, empate: m.empate, tempo: m.t,
      lados: m.lados.map((l, lado) => ({
        lado, vida: l.jogadores.reduce((total, p) => total + p.time.reduce((v, b) => v + b.hp / b.max, 0), 0),
        jogadores: l.jogadores.map((p) => ({ id: p.id, nome: p.nome, bot: !!p.bot })),
      })),
    };
    if (!m.empate) {
      const humanos = (lado) => m.lados[lado].jogadores.filter((p) => !p.bot).map((p) => p.nome);
      noite.vitoria("ginasio", sala.code, humanos(m.vencedor), humanos(1 - m.vencedor));
    }
    log(sala, m.empate ? "A batalha terminou empatada." : `O lado ${m.vencedor + 1} venceu a batalha.`);
    broadcast(sala);
  }
  function comandoDe(p, now) {
    if (!p || !p.sockets.size || now - p.ultComando > COMANDO_MS) {
      if (p) { p.comandos.length = 0; p.movimento = null; }
      return {};
    }
    const c = p.comandos.shift();
    if (c) {
      p.processada = c.seq;
      p.movimento = { dx: c.dx, dy: c.dy, mira: c.mira, ...(c.alvo && { alvo: c.alvo }) };
      return c;
    }
    return p.movimento || {};
  }
  function tick(sala) {
    const m = sala.match, now = Date.now();
    if (!m || sala.phase !== "play") return;
    if (now >= sala.inicio) {
      const comandos = Object.fromEntries(sala.order.map((id) => [id, comandoDe(sala.players[id], now)]));
      const seq = m.seq, projeteis = m.projeteis.slice(), areas = m.areas.slice();
      const ev = [...G.passo(m, TICK, comandos)];
      // Os efeitos nascem por evento, com trajetoria suficiente para o navegador anima-los entre pacotes.
      for (const pr of m.projeteis) if (pr.id >= seq) ev.push({ tipo: "projetil", ...projetilDe(pr) });
      for (const a of m.areas) if (a.id >= seq) ev.push({ tipo: "area", ...areaDe(a) });
      for (const pr of projeteis) if (!m.projeteis.includes(pr)) ev.push({ tipo: "impacto", ...projetilDe(pr) });
      for (const a of areas) if (!m.areas.includes(a)) ev.push({ tipo: "explosao", ...areaDe(a) });
      if (ev.length) nsp.to(sala.code).emit("ev", ev.map((e) => ({ ...e, t: now })));
      if (m.fim) { enviarPacote(sala, now); return terminar(sala); }
      if (ev.some((e) => e.tipo === "desmaiou" || e.tipo === "troca")) broadcast(sala);
      if ((sala.frame + 1) % 60 === 0) broadcast(sala);
    }
    sala.frame++;
    if (sala.frame % SNAP_EVERY === 0) enviarPacote(sala, now);
  }

  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, salas);
    function bind(sala, pid) {
      ligarSocket(socket, salas, sala, pid);
      if (pid) limparEntrada(sala.players[pid]);
    }
    socket.on("create", (data, cb) => {
      data = objeto(data) ? data : {};
      const name = limparNome(typeof data.name === "string" ? data.name : ""), config = limparConfig(data.config);
      if (!name) return falha(cb, "Coloque o seu nome.");
      if (data.time != null && !timeValido(config.modo, data.time)) return falha(cb, "Escolha 3 bichos diferentes desse modo.");
      const sala = novaSala(config);
      const p = adicionar(sala, name, data.time);
      sala.host = p.id; bind(sala, p.id);
      log(sala, `Ginásio aberto por ${name}.`);
      ok(cb, { code: sala.code, id: p.id, token: p.token }); broadcast(sala);
    });
    socket.on("join", (data, cb) => {
      data = objeto(data) ? data : {};
      const sala = buscarSala(salas, typeof data.code === "string" ? data.code : "");
      if (!sala) return falha(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const volta = typeof data.id === "string" && typeof data.token === "string" && quemVolta(sala, data);
      if (volta) { bind(sala, volta.id); ok(cb, { code: sala.code, id: volta.id, token: volta.token }); return broadcast(sala); }
      if (data.watch) { bind(sala, null); ok(cb, { code: sala.code, id: null }); return broadcast(sala); }
      const name = limparNome(typeof data.name === "string" ? data.name : "");
      if (!name) return falha(cb, "Coloque o seu nome.");
      if (nomeEmUso(sala, name)) return falha(cb, "Já tem alguém com esse nome na sala.");
      if (sala.order.length >= MAX_SALA) return falha(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (data.time != null && !timeValido(sala.config.modo, data.time)) return falha(cb, "Escolha 3 bichos diferentes desse modo.");
      const p = adicionar(sala, name, data.time);
      if (sala.phase === "play") p.lado = null;
      bind(sala, p.id); log(sala, `${name} chegou no ginásio.`);
      ok(cb, { code: sala.code, id: p.id, token: p.token }); broadcast(sala);
    });
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));
    socket.on("act", (data, cb) => {
      data = objeto(data) ? data : {};
      const { room: sala, me } = ctx();
      if (!sala) return falha(cb, "Você não está numa sala.");
      const organizador = me && sala.host === me.id, jogando = sala.phase === "play";
      const erro = (() => {
        if (data.type === "time") {
          if (!me || jogando) return "Só dá para trocar os bichos fora do jogo.";
          if (!timeValido(sala.config.modo, data.time)) return "Escolha 3 bichos diferentes desse modo.";
          me.times[sala.config.modo] = data.time.slice(); return;
        }
        if (data.type === "lado") {
          if (!me || jogando) return "Só dá para trocar de lado fora do jogo.";
          if (![0, 1, null].includes(data.lado)) return "Lado inválido.";
          if (data.lado != null && data.lado !== me.lado && doLado(sala, data.lado).length >= tamanho(sala)) return "Esse lado está cheio.";
          me.lado = data.lado; return;
        }
        if (data.type === "config") {
          if (!organizador || jogando) return "Só o organizador muda, fora do jogo.";
          if (!objeto(data.config)) return "Configuração inválida.";
          sala.config = limparConfig({ ...sala.config, ...data.config });
          for (const lado of [0, 1]) doLado(sala, lado).slice(tamanho(sala)).forEach((p) => { p.lado = null; });
          sala.match = null; sala.results = null; sala.phase = "lobby"; return;
        }
        if (data.type === "kick") {
          if (!organizador || jogando) return "Só o organizador, fora do jogo.";
          if (typeof data.id !== "string") return "Jogador inválido.";
          const p = Object.prototype.hasOwnProperty.call(sala.players, data.id) && sala.players[data.id];
          if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) {
            const outro = nsp.sockets.get(sid);
            if (outro) { outro.emit("removido"); outro.leave(sala.code); outro.data.pid = null; outro.data.code = null; }
          }
          delete sala.players[p.id]; sala.order = sala.order.filter((id) => id !== p.id);
          log(sala, `${p.name} saiu do ginásio.`); return;
        }
        if (data.type === "start") {
          if (!organizador || jogando) return "Só o organizador começa a batalha.";
          const n = tamanho(sala), humanos = sala.order.map((id) => sala.players[id]).filter((p) => p.lado != null);
          if (!humanos.length) return "Entre num lado para jogar.";
          if (humanos.some((p) => !p.sockets.size)) return "Há jogador desconectado: espere voltar ou retire da sala.";
          if (!sala.config.bots && [0, 1].some((lado) => doLado(sala, lado).length < n)) return `Faltam jogadores: cada lado precisa de ${n} (ou ligue os robôs).`;
          comecar(sala); return;
        }
        if (data.type === "lobby") {
          if (!organizador) return "Só o organizador.";
          parar(sala); return;
        }
        return "Ação desconhecida.";
      })();
      if (erro) return falha(cb, erro);
      ok(cb); broadcast(sala);
    });
    socket.on("cmd", (data) => {
      const { room: sala, me } = ctx();
      if (!me || sala.phase !== "play" || !emCampo(sala, me) || Date.now() < sala.inicio) return;
      const c = limparComando(data);
      if (!c || c.seq <= me.recebida) return;
      me.recebida = c.seq; me.ultComando = Date.now();
      // Limita a fila; comandos antigos ou repetidos nao podem acelerar o motor.
      if (me.comandos.length >= 8) me.comandos.shift();
      me.comandos.push(c);
    });
    socket.on("disconnect", () => {
      const { room: sala, me } = ctx();
      if (!sala) return;
      if (me) { me.sockets.delete(socket.id); if (!me.sockets.size) limparEntrada(me); }
      broadcast(sala);
    });
  });

  medirPing(nsp, salas);
  limparSalasParadas(salas, {
    horas: 6, intervalo: 60000,
    cadaVolta: (sala) => {
      if (sala.loop && !sala.order.some((id) => sala.players[id].sockets.size)) { parar(sala); broadcast(sala); }
    },
    aoApagar: (sala) => clearInterval(sala.loop),
  });
  return { timeValido, criarDesafio };
};
