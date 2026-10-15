// Ginasio da Galera: batalhas em tempo real no canal /ginasio.
// O servidor recebe comandos, roda o motor a 60/s e manda um pacote por jogador a 20/s.
const G = require("./public/ginasio/regras.js");
const Galeramon = require("./public/galeramon/dados.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const NarutoDex = require("./public/galeramon/naruto.js");
const Lideres = require("./public/galeramon/lideres.js"); // os líderes e treinadores da Vila (o time dos robôs)
const { rid, novoCodigo, limparNome, ok, falha, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js");
const noite = require("./noite.js");
const Mato = require("./public/vila/mato.js"); // os três iniciais
const { hashDe, colecaoDe, darXp, anunciar, INICIAIS } = require("./vila-mato.js"); // a coleção da grama alta da Vila (bd.js)
const Niveis = require("./public/galeramon/niveis.js"); // nível, experiência, evolução e a Pokébola (PokéAPI)
const bd = require("./bd.js");
const BOLA_RECARGA_MS = 1500; // entre uma Pokébola e outra, depois que a cena acaba

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
  // arena: o lugar da luta no modo Pokémon (sortear, ou um dos lugares de regras.js)
  // robo: a dificuldade dos robôs (fácil, normal ou difícil; o líder é sempre difícil)
  // pokemons: "todos" (qualquer um) ou "capturados" (só os iniciais e os que cada um pegou na grama alta da Vila)
  return { modo: ["galeramon", "pokemon", "naruto"].includes(c.modo) ? c.modo : "galeramon", formato: lider ? "1x1" : c.formato === "2x2" ? "2x2" : "1x1", bots: lider ? true : c.bots !== false, robo: lider ? "dificil" : G.DIFICULDADES.includes(c.robo) ? c.robo : "normal", arena: G.BIOMAS.includes(c.arena) ? c.arena : "sortear", pokemons: c.pokemons === "capturados" ? "capturados" : "todos", ...(lider && { lider }) };
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
  if (d.guarda != null && typeof d.guarda !== "boolean") return null;
  if (d.alvo != null && (!objeto(d.alvo) || ![d.alvo.x, d.alvo.y].every(finito))) return null;
  const c = {
    seq: d.seq, dx: clamp(d.dx, -1, 1), dy: clamp(d.dy, -1, 1),
    mira: { x: clamp(d.mira.x, -G.ARENA.w, G.ARENA.w), y: clamp(d.mira.y, -G.ARENA.h, G.ARENA.h) },
  };
  if (d.golpe != null) c.golpe = d.golpe;
  if (d.troca != null) c.troca = d.troca;
  if (d.esquiva) c.esquiva = true;
  if (d.guarda) c.guarda = true;
  if (d.alvo) c.alvo = { x: clamp(d.alvo.x, -G.ARENA.w / 2, G.ARENA.w / 2), y: clamp(d.alvo.y, -G.ARENA.h / 2, G.ARENA.h / 2) };
  return c;
}

const projetilDe = (pr) => ({ id: pr.id, lado: pr.lado, dono: pr.dono, x: pr.x, y: pr.y, dx: pr.dx, dy: pr.dy, v: pr.v, raio: pr.raio, vida: pr.vida, golpe: pr.hab.id, elemento: pr.hab.tipo, classe: pr.hab.classe, forma: pr.forma, ...(pr.refletido && { refletido: true }) });
// a área diz o seu jeito: queda e bomba (caem no fim do aviso), anel, onda, zona, armadilha, feixe e cone
const areaDe = (a) => ({
  id: a.id, lado: a.lado, dono: a.dono, x: a.x, y: a.y, r: a.r, falta: a.t, aviso: a.aviso ?? a.hab.aviso, golpe: a.hab.id, elemento: a.hab.tipo, forma: a.forma || "queda",
  ...(a.dx != null && { dx: a.dx, dy: a.dy }), ...(a.v && { v: a.v }), ...(a.len && { len: a.len }), ...(a.arco && { arco: a.arco }),
  ...(a.de && { de: { ...a.de } }), ...(a.arma != null && { arma: Math.max(0, a.arma) }), ...(a.estourou && { estourou: true }), ...(a.hab.puxa && { puxa: true }),
});

module.exports = function ligarGinasio(io) {
  const nsp = io.of("/ginasio"), salas = new Map();
  const tamanho = (sala) => sala.config.formato === "2x2" ? 2 : 1;
  const doLado = (sala, lado) => sala.order.map((id) => sala.players[id]).filter((p) => p.lado === lado);
  const emCampo = (sala, p) => sala.match && sala.match.entidades.find((e) => e.id === p?.id);

  // a sala "só capturados": cada um joga só com os Pokémon que tem (os iniciais e os da grama alta da Vila)
  const soCapturados = (sala) => sala.config.modo === "pokemon" && sala.config.pokemons === "capturados";
  const foraDaColecao = (sala, p, time) => (soCapturados(sala) ? time.find((id) => !colecaoDe(p.treinador, p.name).has(id)) || null : null);
  // o time de quem só joga com os seus: o pedido, se é todo dele; senão, os três de nível mais alto
  function timeDaColecao(p, pedido) {
    const c = colecaoDe(p.treinador, p.name);
    if (Array.isArray(pedido) && pedido.length === 3 && new Set(pedido).size === 3 && pedido.every((id) => c.has(id))) return pedido.slice();
    return [...c.values()].sort((a, b) => b.nivel - a.nivel || b.xp - a.xp).slice(0, 3).map((x) => x.bicho);
  }
  // quem está com um time que não tem volta para os iniciais (ao ligar a regra, ao entrar e ao começar)
  function ajustarAColecao(sala, p) {
    if (!foraDaColecao(sala, p, p.times.pokemon)) return false;
    p.times.pokemon = sala.selvagem ? timeDaColecao(p) : Mato.INICIAIS.slice();
    log(sala, `${p.name} ainda não tem todos os Pokémon do time: voltou para os iniciais.`);
    return true;
  }
  function limparEntrada(p) {
    p.recebida = -1; p.processada = -1; p.comandos = []; p.movimento = null; p.ultComando = 0;
  }
  function novaSala(config) {
    const sala = { code: novoCodigo(salas), host: null, phase: "lobby", config, players: {}, order: [], match: null, results: null, feed: [], loop: null, t: Date.now() };
    salas.set(sala.code, sala);
    return sala;
  }
  function adicionar(sala, name, time, treinador = null) {
    const id = rid(6), n = tamanho(sala), a = doLado(sala, 0).length, b = doLado(sala, 1).length;
    const lado = a <= b && a < n ? 0 : b < n ? 1 : null;
    const p = { id, token: rid(12), name, lado, treinador, rtt: null, sockets: new Set(), times: { galeramon: Galeramon.DEFAULT_TEAM.slice(), pokemon: PokeDex.DEFAULT_TEAM.slice(), naruto: NarutoDex.DEFAULT_TEAM.slice() } };
    if (time) p.times[sala.config.modo] = time.slice();
    sala.players[id] = p; sala.order.push(id); limparEntrada(p);
    ajustarAColecao(sala, p);
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
        campo: e.campo, bicho: e.bicho.id, forma: e.bicho.as || e.bicho.id, raio: e.raio, ...(e.bicho.nivel && { nivel: e.bicho.nivel }),
        hp: e.bicho.hp, max: e.bicho.max, cds: [...e.bicho.cds], st: { ...e.bicho.st },
        ...(m.modo === "naruto" && { chakra: e.bicho.chakra, substitutes: e.jogador.substitutes }),
        esquivaCd: e.esquivaCd, esquivaT: e.esquivaT, invulneravel: e.invulneravel,
        kx: e.kx, ky: e.ky, atordoado: e.atordoado, guarda: e.guarda, guardando: e.guardando, guardaSolta: e.guardaSolta, foco: e.foco,
        preparo: e.preparo && { t: e.preparo.t, total: e.preparo.total, classe: e.preparo.hab.classe, golpe: e.preparo.golpe, elemento: e.preparo.hab.tipo, mira: { ...e.preparo.mira }, alcance: e.preparo.hab.alcance, largura: e.preparo.hab.largura, arco: e.preparo.hab.arco },
        salto: e.salto && { t: e.salto.t, total: e.salto.total, de: { ...e.salto.de }, para: { ...e.salto.para }, r: e.salto.hab.raio, elemento: e.salto.hab.tipo },
        sequencia: e.sequencia && { tipo: e.sequencia.tipo, falta: e.sequencia.falta },
        canal: e.canal && { ...e.canal }, escudo: e.escudo && { ...e.escudo },
        bote: e.bote && { x: e.bote.x, y: e.bote.y, falta: e.bote.falta },
        dash: e.dash && { x: e.dash.x, y: e.dash.y, falta: e.dash.falta, velocidade: e.dash.hab.velocidade, giro: !!e.dash.hab.giro, elemento: e.dash.hab.tipo },
        oculto: e.oculto && { jeito: e.oculto.jeito, t: e.oculto.t, total: e.oculto.total, de: { ...e.oculto.de }, para: { ...e.oculto.para } },
        ativo: e.jogador.ativo, trocaCd: e.jogador.trocaCd, entradaEm: e.jogador.entradaEm,
        time: e.jogador.time.map((b) => ({ id: b.id, hp: b.hp, max: b.max, ...(b.nivel && { nivel: b.nivel }) })),
      })),
      projeteis: m.projeteis.map(projetilDe), areas: m.areas.map(areaDe),
    };
  }
  function publicState(sala) {
    const m = sala.match;
    return {
      code: sala.code, host: sala.host, phase: sala.phase, config: sala.config,
      ...(sala.selvagem && { selvagem: { bicho: sala.selvagem.bicho, nivel: sala.selvagem.nivel, raridade: sala.selvagem.raridade, brilhante: sala.selvagem.brilhante, usado: !!sala.selvagem.usado } }),
      players: sala.order.map((id) => {
        const p = sala.players[id];
        return { id, name: p.name, lado: p.lado, time: p.times[sala.config.modo], online: p.sockets.size > 0, ping: p.rtt == null ? null : Math.round(p.rtt) };
      }),
      match: m ? {
        start: sala.inicio, end: sala.inicio + m.duracao * 1000, modo: m.modo, formato: m.formato, duracao: m.duracao, bioma: m.bioma,
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
    // na sala "só capturados" (e na luta com o selvagem), cada um joga com o nível dos seus Pokémon; o robô, com a média
    let nivelRobo = null;
    if (soCapturados(sala)) {
      const niveis = [];
      for (const l of lados) for (const j of l) {
        const p = sala.players[j.id], c = colecaoDe(p.treinador, p.name);
        p.inds = j.time.map((id) => c.get(id) || null);
        j.niveis = p.inds.map((x) => (x ? x.nivel : Niveis.NIVEL_INICIAL));
        niveis.push(...j.niveis);
      }
      if (niveis.length) nivelRobo = Math.round(niveis.reduce((a, b) => a + b, 0) / niveis.length);
    }
    sala.match = G.criarPartida({ ...sala.config, seed: rid(16), ...(nivelRobo && { nivelRobo }), ...(sala.selvagem && { selvagem: sala.selvagem }) }, lados);
    sala.pausaAte = 0; sala.proximaBola = 0; sala.capturou = null; sala.participantes = new Set();
    let b = 0;
    const lider = Lideres.de(sala.config.lider);
    for (const l of sala.match.lados) for (const p of l.jogadores) if (p.bot && !p.selvagem) p.nome = lider && p.lado === 1 ? lider.nome : BOT_NOMES[b++];
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
    if (sala.selvagem) sala.results.selvagem = fimDaLutaSelvagem(sala);
    if (!m.empate && !sala.selvagem) {
      const humanos = (lado) => m.lados[lado].jogadores.filter((p) => !p.bot).map((p) => p.nome);
      noite.vitoria("ginasio", sala.code, humanos(m.vencedor), humanos(1 - m.vencedor));
    }
    log(sala, m.empate ? "A batalha terminou empatada." : `O lado ${m.vencedor + 1} venceu a batalha.`);
    broadcast(sala);
  }
  // ---------- a luta com o Pokémon selvagem (a grama alta da Vila) ----------
  // A Vila leva o encontro para cá (criarSelvagem): uma sala 1x1 com o treinador de um lado e o selvagem, sozinho, do
  // outro. Dá para jogar a Pokébola a qualquer hora (act "pokebola": a chance sobe com a vida baixa e com o Pokémon
  // tonto); a luta para durante a cena. Pegou ou venceu: quem lutou ganha experiência (Niveis.xpDaVitoria, dividida
  // entre os que entraram em campo), sobe de nível e evolui no banco.
  function criarSelvagem({ nome, treinador, time, encontro }) {
    if (!treinador || !encontro || !PokeDex.MONS[encontro.bicho]) return null;
    const tipo = PokeDex.MONS[encontro.bicho].types[0];
    // o selvagem luta pela raridade: o comum é fácil, o épico e o lendário são difíceis
    const robo = { comum: "facil", incomum: "normal", raro: "normal", epico: "dificil", lendario: "dificil" }[encontro.raridade] || "normal";
    const sala = novaSala(limparConfig({ modo: "pokemon", formato: "1x1", bots: true, robo, pokemons: "capturados", arena: G.BIOMA_DO_TIPO[tipo] || "floresta" }));
    sala.selvagem = { bicho: encontro.bicho, nivel: encontro.nivel, raridade: encontro.raridade, brilhante: !!encontro.brilhante, hp: encontro.hp, max: encontro.max };
    const p = adicionar(sala, limparNome(nome) || "Treinador", null, treinador);
    p.times.pokemon = timeDaColecao(p, time);
    sala.host = p.id;
    log(sala, `Um ${PokeDex.MONS[encontro.bicho].n} selvagem (nível ${encontro.nivel}) apareceu!`);
    return { code: sala.code, id: p.id, token: p.token };
  }
  const selvagemEm = (m) => m.entidades.find((e) => e.lado === 1);
  function jogarPokebola(sala, me) {
    const m = sala.match, now = Date.now(), alvo = m && selvagemEm(m);
    if (!sala.selvagem || sala.phase !== "play" || !m || m.fim) return "Não tem Pokémon para capturar agora.";
    if (me.lado !== 0) return "Só quem está lutando joga a Pokébola.";
    if (now < sala.inicio || (sala.pausaAte && now < sala.pausaAte) || sala.capturou) return "Espere um instante.";
    if (now < sala.proximaBola) return "Ainda pegando outra Pokébola.";
    if (!alvo || !alvo.campo || alvo.bicho.hp <= 0) return "Ele já desmaiou: não dá mais para capturar.";
    if (alvo.oculto || (alvo.salto && alvo.salto.t > 0)) return "Ele está fora de alcance.";
    const chance = Niveis.chanceDeCaptura({ bicho: alvo.bicho.id, hp: alvo.bicho.hp, max: alvo.bicho.max, tonto: alvo.atordoado > 0 });
    // nos testes a cena passa 20 vezes mais rápido (o navegador toca no tempo de verdade)
    const jogada = Niveis.jogarPokebola(chance), dur = Math.round(Niveis.duracaoDaCaptura(jogada.balancos, jogada.pegou) * (TESTE ? 0.05 : 1));
    sala.pausaAte = now + dur; sala.inicio += dur; sala.proximaBola = now + dur + BOLA_RECARGA_MS; sala.bolas = (sala.bolas || 0) + 1;
    const eu = m.entidades.find((e) => e.id === me.id);
    if (jogada.pegou) {
      const s = sala.selvagem;
      sala.capturou = { bicho: s.bicho, nivel: s.nivel };
      bd.garantirIniciais(me.treinador, me.name, INICIAIS());
      bd.guardarCaptura(me.treinador, me.name, s.bicho, s.raridade, s.brilhante, s.nivel);
      anunciar((text) => io.of("/vila").emit("news", { text }), me.name, s);
    }
    nsp.to(sala.code).emit("ev", [{ tipo: "pokebola", de: me.id, em: alvo.id, chance, balancos: jogada.balancos, pegou: jogada.pegou, dur, x: alvo.x, y: alvo.y, ...(eu && { dx: eu.x, dy: eu.y }), t: now }]);
    log(sala, jogada.pegou ? `${me.name} capturou ${PokeDex.MONS[alvo.bicho.id].n}!` : `${PokeDex.MONS[alvo.bicho.id].n} escapou da Pokébola (${Niveis.porcento(chance)}).`);
  }
  // pegou ou venceu: a experiência de quem lutou
  function fimDaLutaSelvagem(sala) {
    const m = sala.match, s = sala.selvagem, alvo = selvagemEm(m), capturado = !!sala.capturou;
    const venceu = capturado || (m.vencedor === 0 && !m.empate && alvo && alvo.bicho.hp <= 0);
    const r = { bicho: s.bicho, nivel: s.nivel, capturado, derrotado: venceu && !capturado, bolas: sala.bolas || 0, xp: [] };
    s.usado = true;
    const humano = m.lados[0].jogadores.find((j) => !j.bot), p = humano && sala.players[humano.id];
    if (!venceu || !p || !p.treinador || !p.inds) return r;
    const quem = [...sala.participantes].filter((i) => p.inds[i]);
    for (const i of quem) {
      const ind = p.inds[i], ganho = Niveis.xpDaVitoria(s.bicho, s.nivel, ind.nivel) / quem.length;
      const d = darXp(p.treinador, ind, ganho);
      if (d) r.xp.push({ bicho: d.antes.bicho, para: d.bicho, ganho: d.ganho, nivelAntes: d.antes.nivel, nivel: d.nivel, xp: d.xp, falta: Niveis.faltaParaSubir(d.bicho, d.nivel), evolucoes: d.evolucoes });
    }
    // quem evoluiu entra no time guardado da sala com o nome novo
    p.times.pokemon = p.times.pokemon.map((id, i) => { const x = r.xp.find((y) => y.bicho === id && p.inds[i] && y.para); return x ? x.para : id; });
    return r;
  }

  function comandoDe(p, now) {
    if (!p || !p.sockets.size || now - p.ultComando > COMANDO_MS) {
      if (p) { p.comandos.length = 0; p.movimento = null; }
      return {};
    }
    const c = p.comandos.shift();
    if (c) {
      p.processada = c.seq;
      p.movimento = { dx: c.dx, dy: c.dy, mira: c.mira, ...(c.alvo && { alvo: c.alvo }), ...(c.guarda && { guarda: true }) };
      return c;
    }
    return p.movimento || {};
  }
  function tick(sala) {
    const m = sala.match, now = Date.now();
    if (!m || sala.phase !== "play") return;
    // a cena da Pokébola: a luta para; quando acaba, se pegou, a partida termina
    if (sala.pausaAte && now < sala.pausaAte) { sala.frame++; if (sala.frame % SNAP_EVERY === 0) enviarPacote(sala, now); return; }
    if (sala.capturou && !m.fim) { m.fim = true; m.vencedor = 0; m.empate = false; enviarPacote(sala, now); return terminar(sala); }
    if (sala.selvagem) for (const e of m.entidades) if (e.lado === 0 && e.campo && !e.jogador.bot) sala.participantes.add(e.jogador.ativo);
    if (now >= sala.inicio) {
      const comandos = Object.fromEntries(sala.order.map((id) => [id, comandoDe(sala.players[id], now)]));
      const seq = m.seq, projeteis = m.projeteis.slice(), areas = m.areas.slice();
      const ev = [...G.passo(m, TICK, comandos)];
      // Os efeitos nascem por evento, com trajetoria suficiente para o navegador anima-los entre pacotes.
      for (const pr of m.projeteis) if (pr.id >= seq) ev.push({ tipo: "projetil", ...projetilDe(pr) });
      for (const a of m.areas) if (a.id >= seq) ev.push({ tipo: "area", ...areaDe(a) });
      for (const pr of projeteis) if (!m.projeteis.includes(pr)) ev.push({ tipo: "impacto", ...projetilDe(pr) });
      for (const a of areas) if (!m.areas.includes(a)) ev.push({ tipo: a.estourou ? "explosao" : "fimArea", ...areaDe(a) });
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
      const p = adicionar(sala, name, data.time, hashDe(data.treinador));
      sala.host = p.id; bind(sala, p.id);
      log(sala, `Ginásio aberto por ${name}.`);
      ok(cb, { code: sala.code, id: p.id, token: p.token }); broadcast(sala);
    });
    socket.on("join", (data, cb) => {
      data = objeto(data) ? data : {};
      const sala = buscarSala(salas, typeof data.code === "string" ? data.code : "");
      if (!sala) return falha(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const volta = typeof data.id === "string" && typeof data.token === "string" && quemVolta(sala, data);
      if (volta) { if (hashDe(data.treinador)) volta.treinador = hashDe(data.treinador); bind(sala, volta.id); ok(cb, { code: sala.code, id: volta.id, token: volta.token }); return broadcast(sala); }
      if (data.watch) { bind(sala, null); ok(cb, { code: sala.code, id: null }); return broadcast(sala); }
      const name = limparNome(typeof data.name === "string" ? data.name : "");
      if (!name) return falha(cb, "Coloque o seu nome.");
      if (nomeEmUso(sala, name)) return falha(cb, "Já tem alguém com esse nome na sala.");
      if (sala.order.length >= MAX_SALA) return falha(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (data.time != null && !timeValido(sala.config.modo, data.time)) return falha(cb, "Escolha 3 bichos diferentes desse modo.");
      const p = adicionar(sala, name, data.time, hashDe(data.treinador));
      if (sala.phase === "play" || sala.selvagem) p.lado = null; // na luta com o selvagem, quem chega só assiste
      bind(sala, p.id); log(sala, `${name} chegou no ginásio.`);
      ok(cb, { code: sala.code, id: p.id, token: p.token }); broadcast(sala);
    });
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));
    // os Pokémon que o treinador tem (para a escolha da sala "só capturados")
    socket.on("colecao", (data, cb) => {
      if (typeof cb !== "function") return;
      const t = hashDe(objeto(data) ? data.codigo : null);
      const c = colecaoDe(t);
      cb({ ok: true, ids: [...c.keys()], niveis: Object.fromEntries([...c].map(([id, x]) => [id, x.nivel])) });
    });
    socket.on("act", (data, cb) => {
      data = objeto(data) ? data : {};
      const { room: sala, me } = ctx();
      if (!sala) return falha(cb, "Você não está numa sala.");
      const organizador = me && sala.host === me.id, jogando = sala.phase === "play";
      const erro = (() => {
        if (data.type === "time") {
          if (!me || jogando) return "Só dá para trocar os bichos fora do jogo.";
          if (!timeValido(sala.config.modo, data.time)) return "Escolha 3 bichos diferentes desse modo.";
          const falta = foraDaColecao(sala, me, data.time);
          if (falta) return `Você ainda não tem ${PokeDex.MONS[falta].n}: capture na grama alta da Vila (em frente ao Ginásio).`;
          me.times[sala.config.modo] = data.time.slice(); return;
        }
        if (data.type === "lado") {
          if (!me || jogando) return "Só dá para trocar de lado fora do jogo.";
          if (![0, 1, null].includes(data.lado)) return "Lado inválido.";
          if (sala.selvagem && data.lado !== null && me.id !== sala.host) return "Essa luta é de quem achou o Pokémon.";
          if (sala.selvagem && data.lado === 1) return "Do lado de lá só fica o Pokémon selvagem.";
          if (data.lado != null && data.lado !== me.lado && doLado(sala, data.lado).length >= tamanho(sala)) return "Esse lado está cheio.";
          me.lado = data.lado; return;
        }
        if (data.type === "config") {
          if (!organizador || jogando) return "Só o organizador muda, fora do jogo.";
          if (sala.selvagem) return "A luta com o selvagem não muda de regra.";
          if (!objeto(data.config)) return "Configuração inválida.";
          sala.config = limparConfig({ ...sala.config, ...data.config });
          for (const id of sala.order) ajustarAColecao(sala, sala.players[id]);
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
          if (sala.selvagem?.usado) return "Essa luta já acabou: volte para a grama alta para achar outro.";
          const n = tamanho(sala), humanos = sala.order.map((id) => sala.players[id]).filter((p) => p.lado != null);
          if (!humanos.length) return "Entre num lado para jogar.";
          if (humanos.some((p) => !p.sockets.size)) return "Há jogador desconectado: espere voltar ou retire da sala.";
          if (!sala.config.bots && [0, 1].some((lado) => doLado(sala, lado).length < n)) return `Faltam jogadores: cada lado precisa de ${n} (ou ligue os robôs).`;
          for (const id of sala.order) ajustarAColecao(sala, sala.players[id]); // pode ter mudado o banco
          comecar(sala); return;
        }
        if (data.type === "pokebola") {
          if (!me) return "Só quem está lutando joga a Pokébola.";
          return jogarPokebola(sala, me);
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
  return { timeValido, criarDesafio, criarSelvagem };
};
