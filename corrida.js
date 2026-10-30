// Corrida da Galera — corrida de kart de 1 a 8 jogadores, com caixas opcionais.
// Nas regras de F1 o SERVIDOR é a autoridade: o navegador manda o que o piloto apertou em cada passo da física (`inp`) e o
// servidor anda o carro (corrida-humanos.js, com public/corrida/sim.js), conta os setores, as batidas e as paradas e devolve o
// estado verdadeiro (`ack`); o navegador prevê com a mesma física e se corrige aos poucos. Nas outras salas (arcade, com caixas)
// cada navegador roda a física do próprio carro e só manda a posição, e os carros batem uns nos outros (cada navegador resolve
// a sua metade da batida, em `public/corrida/colisao.js`).
// O servidor cuida da largada sincronizada, repassa as posições e conta as voltas pelos setores da pista,
// na ordem (contra atalho e contramão), com um tempo mínimo de volta. Canal "/corrida" do Socket.io.
const T = require("./public/corrida/pistas.js");
const Itens = require("./corrida-itens.js");
const F1 = require("./public/corrida/f1-regras.js"); // as regras de F1 (os pneus), opção da sala
const Direcao = require("./corrida-f1-direcao.js");
const Quali = require("./corrida-f1-classificacao.js"); // a classificação (Q1, Q2, Q3) que define o grid das regras de F1
const Robos = require("./corrida-robos.js"); // os robôs (rodam aqui no servidor)
const Setores = require("./corrida-setores.js"); // a conta dos setores sem travar a volta por um aviso perdido
const Humanos = require("./corrida-humanos.js"); // os humanos nas regras de F1: o servidor anda o carro com as entradas do piloto (autoridade)
const Contato = require("./corrida-contato.js"); // as batidas entre carros (e quem está fantasma por causa do box)
const Pecas = require("./public/corrida/f1-pecas.js"); // as peças do carro (modo carreira), que viram a montagem
const Equipes = require("./public/corrida/f1-equipes.js"); // as equipes de 2026, o orçamento em pontos e a montagem do carro
const Pilotos = require("./public/corrida/f1-pilotos-2026.js");
const TRobo = require("./corrida-temporada-robo.js"); // o robô que leva o carro de quem cai no meio do GP da temporada em grupo
const bd = require("./bd.js");
Robos.usarFonte((pista) => bd.melhoresTracadosCorrida(pista), (pista, nomes) => bd.ritmoCorrida(pista, nomes), (pista) => bd.melhorVoltaCorrida(pista));
const { SKINS } = require("./public/pelada/campo.js"); // o piloto do kart usa as skins da Pelada
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && !room.players[id].bot && room.players[id].name).filter(Boolean); // robô não entra no placar da Noite

const LUZES_MS = 3500; // regras de F1: o tempo até acender a primeira das cinco luzes (a largada vem 4 s mais a espera sorteada depois)
// regras de F1: a transmissão de TV (a pista, o clima, o campeonato e o grid) tem tempo próprio ANTES das luzes: 25 s numa
// temporada (com a tabela do campeonato), 20 s fora dela. `CORRIDA_TV_MS` troca os dois (0 desliga: os testes de rede usam).
const TV_TEMPORADA_MS = 25000, TV_AVULSA_MS = 20000;
const MAX_PLAYERS = 8, COUNTDOWN_MS = 4500, AFTER_FIRST_MS = 60000, MAX_RACE_MS = 45 * 60000; // 45 min: dá para as 21 voltas
const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

module.exports = function attachCorrida(io) {
  const nsp = io.of("/corrida");
  const rooms = new Map();
  require("./lobby.js").registrar("corrida", rooms, { max: MAX_PLAYERS }); // aparece na lista de salas da Vila

  // regras "f1" (planos/temporada-f1.md): pneus que gastam; sem caixas e sem a ajuda do pelotão
  const cleanConfig = (c = {}) => {
    const f1 = c.regras === "f1";
    return {
      pista: T.PISTAS[c.pista] ? c.pista : "interlagos",
      hora: c.hora === "noite" ? "noite" : "dia",
      voltas: [1, 2, 3, 5, 10, 21].includes(int(c.voltas, 3)) ? int(c.voltas, 3) : 3,
      regras: f1 ? "f1" : "galera",
      caixas: !f1 && c.caixas === true,
      equilibrio: !f1 && c.equilibrio !== false,
      robos: Math.max(0, Math.min(f1 ? Robos.GRID_F1 - 1 : 7, int(c.robos, 0))), // nas regras de F1 o grid tem até 20 carros
      classificacao: f1 && c.classificacao === "pular" ? "pular" : f1 ? "completa" : "pular", // F1: Q1, Q2 e Q3 antes da corrida, ou grid pela ordem dos pilotos
      cambio: c.cambio === "manual" ? "manual" : "auto",
      ers: f1 && c.ers === "manual" ? "manual" : "auto",
      clima: f1 && F1.OPCOES_DE_CLIMA.includes(c.clima) ? c.clima : "aleatorio", // F1: aleatório (a previsão do GP), seco, chuva ou variável (começa seco e chove no meio)
      nivel: Robos.NIVEIS[c.nivel] ? c.nivel : "medio",
    };
  };
  const nameOf = (room, id) => (room.players[id] ? room.players[id].name : "?");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 80) room.log.splice(0, room.log.length - 80); }

  function publicState(room) {
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, startAt: room.startAt || null, endAt: room.endAt || null, ...(room.temporada ? { temporada: true, ...(room.salaTemporada ? { salaTemporada: room.salaTemporada } : {}) } : {}),
      boxReady: Itens.publicBoxes(room), ...(room.config.regras === "f1" ? { tvAte: room.tvAte || null, tv: room.tvAte && Date.now() < room.tvAte ? room.tv || null : null, clima: room.clima || null, previsao: F1.previsaoDoGP(sementeDoClima(room), room.config.clima), montagens: room.montagens || {}, bonusMontagem: room.bonusMontagem || {}, pecasEq: room.pecasEq || {}, chefes: chefes(room), semente: room.semente || null, direcao: Direcao.publico(room), luzes: room.luzes || null, quali: Quali.publico(room), resultado: room.resultado || null } : {}),
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, bot: !!p.bot, ...(p.assumido ? { assumido: true } : {}), name: p.name, nomeCompleto: p.nomeCompleto || null, equipe: p.equipe || null, numero: p.numero || null, sigla: p.sigla || null, pawn: p.pawn, color: p.color, skin: p.skin, car: p.car, mods: p.mods, pneu: p.pneu || F1.COMPOSTO_PADRAO, pneuAtual: p.pneuAtual || p.pneu || F1.COMPOSTO_PADRAO, paradas: (p.paradas || []).length, jogos: room.config.regras === "f1" ? F1.jogosRestantes(p) : null, noBox: !!p.box, fantBox: Contato.fantasmaDoBox(p), quebrou: !!p.quebrou, acrescimo: p.acrescimo || 0, penal: p.penal || 0, dano: p.dano || 0, dnf: !!p.dnf, ultimaBatida: p.ultimaBatida || null, avisosLimite: p.avisosLimite || 0, azul: !!p.azul, drsZona: p.drsZona ?? -1, ers: p.ia?.ers?.carga ?? p.ers?.carga ?? null, grid: p.grid, online: p.sockets.size > 0, laps: p.laps, sector: p.sector, started: p.started, finish: p.finish, best: p.best, last: p.last,
          item: p.item || null, cargas: p.cargas || 0, rolling: p.rolling || 0, boostUntil: p.boostUntil || 0, starUntil: p.starUntil || 0, spinUntil: p.spinUntil || 0,
          shrinkUntil: p.shrinkUntil || 0, inkUntil: p.inkUntil || 0, balaUntil: p.balaUntil || 0 };
      }),
      finishOrder: room.finishOrder, log: room.log.slice(-20), now: Date.now(),
    };
  }
  // ---------- a equipe e o carro (regras de F1) ----------
  // Cada equipe tem um orçamento em pontos para as peças (f1-equipes.js). A montagem da equipe fica em `room.montagens[equipe]`
  // (só quando o chefe mexeu: sem ela vale a padrão) e vale para os dois carros dela, humanos ou robôs. O chefe é o primeiro
  // humano da equipe na ordem da sala. Dois amigos podem dividir a mesma equipe; cada equipe tem só 2 carros.
  const humanosDa = (room, equipe) => room.order.filter((id) => room.players[id] && !room.players[id].bot && room.players[id].equipe === equipe);
  const chefes = (room) => { const out = {}; for (const id of room.order) { const p = room.players[id]; if (p && !p.bot && p.equipe && !out[p.equipe]) out[p.equipe] = id; } return out; };
  const limparMontagens = (room) => { if (!room.montagens) return; for (const eq of Object.keys(room.montagens)) if (!humanosDa(room, eq).length) delete room.montagens[eq]; if (room.pecasEq) for (const eq of Object.keys(room.pecasEq)) if (!room.montagens || !room.montagens[eq]) delete room.pecasEq[eq]; if (!Object.keys(room.montagens).length) delete room.montagens; };
  // o carro de cada um (`p.spec`) e a chance de quebrar: tudo sai da equipe; sem equipe (ou sem as regras de F1), vale o carro escolhido
  function atribuirCarros(room) {
    const f1 = room.config.regras === "f1";
    for (const id of room.order) {
      const p = room.players[id]; if (!p) continue;
      if (f1 && p.equipe && Equipes.EQUIPES[p.equipe]) p.spec = Equipes.specDaEquipe(p.equipe, room.montagens && room.montagens[p.equipe]); else delete p.spec;
    }
  }
  const specDe = (p) => p.spec || T.CARROS[p.car] || T.CARROS.equilibrado;
  // a falha mecânica: quem tira a sorte decide pela semente do GP em que ponto da corrida o carro quebra (ou se nem quebra)
  function sortearFalhas(room) {
    for (const id of room.order) {
      const p = room.players[id]; if (!p) continue;
      p.quebrou = false; p.falhaEm = null;
      if (!p.spec) continue;
      p.falhaEm = Equipes.sortearFalha(F1.sorteio(`quebra:${room.semente}:${id}`), p.spec); // em que fração da corrida o carro quebra (ou null)
    }
  }
  const pontosPorVolta = (pista) => (PONTOS_DA_PISTA[pista] = PONTOS_DA_PISTA[pista] || T.pontos(T.PISTAS[pista], 6).length);
  const PONTOS_DA_PISTA = {};
  function verificarFalhas(room) {
    const total = pontosPorVolta(room.config.pista) * room.config.voltas; let mudou = false;
    for (const id of room.order) {
      const p = room.players[id];
      if (!p || p.falhaEm == null || p.quebrou || p.finish != null || !p.pos || p.pos.prog / total < p.falhaEm) continue;
      p.quebrou = true; mudou = true;
      log(room, `🔧 ${p.name} quebrou! Anda no modo de emergência.`);
    }
    return mudou;
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- os humanos nas regras de F1 ----------
  // Um laço por sala (a cada 10 ms) anda cada carro humano com as entradas que o piloto já mandou e, a cada 30 ms, manda a
  // posição dos carros (`snap`, binário: pose.js, Snap): quem está perto de você 33 vezes por segundo, o resto menos (corrida-humanos.js,
  // snapPara). Os ganchos levam o que a física viu (checkpoint, batida, box) para as regras da sala.
  const SNAP_TIQUES = 3; // a cada 3 voltas do laço de 10 ms
  function enviarSnaps(room, n) {
    const agora = Date.now(), lista = Humanos.snap(room, agora), donos = [];
    if (!lista.length) return;
    for (const id of room.order) {
      const p = room.players[id]; if (!p || p.bot || !p.sockets.size) continue;
      const meus = Humanos.snapPara(lista, id, n), pacote = meus.length ? Humanos.pacote(agora, meus) : null;
      for (const sid of p.sockets) { donos.push(sid); const s = nsp.sockets.get(sid); if (s && pacote) s.volatile.emit("snap", pacote); }
    }
    nsp.to(room.code).except(donos).volatile.emit("snap", Humanos.pacote(agora, lista)); // (quem só assiste recebe todos)
  }
  function ligarHumanos(room) {
    clearInterval(room.humanosTimer);
    if (room.config.regras !== "f1") return;
    const h = {
      aoSetor: (r, p, s, quando) => onSector(r, p, s, quando),
      aoBater: (r, p, forca, tipo, chave, quando) => aplicarBatida(r, p, forca, tipo, quando, chave),
      aoParada: (r, p, d) => concluirParada(r, p, d),
      registrar: (r, p, pos, quando) => { // a direção de prova olha o carro (DRS, limites de pista, bandeiras); na classificação só guarda a posição
        if (r.phase !== "race") { p.pos = pos; return false; }
        const penal = p.penal || 0; Direcao.registrar(r, p, pos, quando, (s) => log(r, s));
        return (p.penal || 0) !== penal; // a penalidade aparece na hora
      },
      mandarAck: (p, ack) => { for (const sid of p.sockets) { const s = nsp.sockets.get(sid); if (s) s.emit("ack", ack); } },
      mudou: () => broadcast(room),
    };
    let tique = 0, nSnap = 0;
    room.humanosTimer = setInterval(() => {
      if (room.phase !== "race" && room.phase !== "quali") return;
      Humanos.andar(room, Date.now(), h);
      if (++tique % SNAP_TIQUES) return;
      enviarSnaps(room, ++nSnap);
    }, 10);
  }

  // ---------- corrida ----------
  // A classificação (regras de F1) já escolheu a semente e os robôs; ela chama `startRace(room, grid)` com os ids na ordem do grid.
  function startRace(room, grid) {
    const f1 = room.config.regras === "f1", daClassificacao = !!(grid && room.quali);
    clearTimeout(room.endTimer);
    clearInterval(room.itemTimer); clearInterval(room.botTimer); clearInterval(room.f1Timer); clearInterval(room.humanosTimer);
    Quali.cancelar(room);
    room.phase = "race";
    for (const id of room.order) delete room.players[id].sim; // cada largada começa com o carro no grid
    require("./corrida-contato.js").limpar(room);
    ligarHumanos(room);
    if (!daClassificacao) preparar(room);
    atribuirCarros(room);
    if (f1) sortearFalhas(room);
    room.resultado = null;
    // as cinco luzes (F1): acendem uma por segundo e apagam juntas depois de uma espera sorteada (0,4 a 2,8 s) pela semente do GP
    room.luzes = f1 ? { espera: Math.round((0.4 + F1.sorteio(`luzes:${room.semente}`)() * 2.4) * 100) / 100 } : null;
    // a transmissão de TV vem antes de tudo: `tvAte` é quando ela acaba e as luzes só começam depois (LUZES_MS + as cinco luzes)
    const tvMs = !f1 ? 0 : process.env.CORRIDA_TV_MS ? Math.max(0, Number(process.env.CORRIDA_TV_MS) || 0) : room.temporada ? TV_TEMPORADA_MS : TV_AVULSA_MS;
    room.tvAte = tvMs ? Date.now() + tvMs : null; room.tvPulos = new Set(); room.tv = tvMs ? room.tvTemporada || {} : null;
    room.startAt = (room.tvAte || Date.now()) + (f1 ? Math.round(LUZES_MS + (4 + room.luzes.espera) * 1000) : COUNTDOWN_MS);
    room.endAt = null;
    room.clima = room.sorteioClima ? { ...room.sorteioClima.corrida, t0: room.startAt } : null; // o relógio da chuva começa na largada
    room.finishOrder = [];
    // grid: o da classificação; nas regras de F1 sem classificação, a ordem dos pilotos da sala; senão, embaralhado a cada corrida
    const ids = grid ? [...grid.filter((id) => room.players[id]), ...room.order.filter((id) => !grid.includes(id))] : f1 ? [...room.order] : [...room.order].sort(() => Math.random() - 0.5);
    ids.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, lapStart: null, lastPos: 0 }));
    // regras de F1: a semente do GP (os erros dos mecânicos saem dela) e o pit stop de cada um começa do zero
    // quem não escolheu o pneu (fora da carreira) e larga com a pista molhada vai de pneu de chuva, em vez do médio padrão
    const largaMolhado = f1 && F1.climaEm(room.clima, room.startAt).agua >= F1.AGUA_MOLHADA;
    if (largaMolhado && !room.temporada) for (const id of ids) { const p = room.players[id]; if (!p.bot && !p.pneuEscolhido) p.pneu = "chuva"; }
    for (const id of ids) { const p = room.players[id]; Object.assign(p, { paradas: [], compostos: [p.pneu || F1.COMPOSTO_PADRAO], pneuAtual: p.pneu || F1.COMPOSTO_PADRAO, acrescimo: 0, box: null, boxFant: 0 }); }
    Itens.start(room);
    Robos.largar(room);
    if (room.grupo) for (const id of room.order) { const p = room.players[id]; if (!p.bot && !p.sockets.size) TRobo.assumir(room, p, (s) => log(room, s)); } // temporada em grupo: quem não chegou à largada tem o carro levado por um robô
    if (room.config.regras === "f1") {
      Direcao.iniciar(room);
      room.f1Timer = setInterval(() => {
        if (room.phase !== "race") return;
        for (const id of room.order) { const p = room.players[id]; if (p?.bot && p.pos && p.finish == null && !p.dnf) Direcao.registrar(room, p, p.pos, Date.now(), (s) => log(room, s)); }
        const quebrou = verificarFalhas(room);
        if (Direcao.passo(room, Date.now(), (s) => log(room, s)) || quebrou) broadcast(room);
      }, 100);
    } else room.direcao = null;
    if (room.ritmoRobos) { const tt = room.ritmoRobos; log(room, `🤖 Os robôs miram voltas de ${Math.floor(tt / 60)}:${(tt % 60).toFixed(1).padStart(4, "0")} (${room.config.regras === "f1" ? room.referenciaF1.origem ? "pelo recorde da pista" : "pela capacidade dos carros nesta pista" : "pela média das 5 melhores voltas de quem está na sala"}).`); }
    if (room.order.some((id) => room.players[id].bot)) {
      let tique = 0;
      const emit = (event, data) => nsp.to(room.code).emit(event, data);
      room.botTimer = setInterval(() => {
        Robos.passo(room, 0.05, (p, s) => { if (onSector(room, p, s)) broadcast(room); }, (e, d) => {
          if (e === "box") { concluirParada(room, room.players[d.id], d); return broadcast(room); } // um robô acabou a parada
          if (e === "batida") { if (aplicarBatida(room, room.players[d.id], d.forca, d.tipo, Date.now(), d.chave)) broadcast(room); return; } // um robô bateu (no muro ou em outro carro)
          emit(e, d); if (e === "item:box" || e === "item:use") broadcast(room);
        });
        if (++tique % 2) return;
        // todos os robôs num pacote só (dois pacotes "volatile" seguidos: o segundo se perde)
        if (room.config.regras === "f1") return; // (nas regras de F1 os robôs vão no `snap` junto com os humanos)
        const lista = room.order.map((id) => room.players[id]).filter((p) => p && p.bot && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, a: p.pos.a, v: p.pos.v, prog: p.pos.prog, laps: p.laps, t: Date.now() }));
        nsp.to(room.code).volatile.emit("ghosts", lista);
      }, 50);
    }
    if (room.config.caixas) {
      let frame = 0;
      room.itemTimer = setInterval(() => { Itens.tick(room, (event, data) => nsp.to(room.code).emit(event, data));
        if (++frame % 2 === 0) nsp.to(room.code).volatile.emit("item:hazards", Itens.publicHazards(room)); }, 50);
    }
    room.endTimer = setTimeout(() => endRace(room), tvMs + COUNTDOWN_MS + MAX_RACE_MS);
    log(room, `🏁 Largada em ${T.PISTAS[room.config.pista].name}, ${room.config.voltas} volta${room.config.voltas > 1 ? "s" : ""}.`);
  }
  // a semente do GP (os sorteios saem dela) e os robôs da sala
  function preparar(room) {
    room.semente = room.config.regras === "f1" ? (room.sementeFixa ?? room.sementeProx ?? Math.floor(Math.random() * 1e9)) : null;
    room.sementeProx = null;
    Robos.preparar(room, COLORS, rid);
    atribuirCarros(room); // quem tem equipe corre com o carro dela (os robôs já saem com o spec); a classificação já usa
    sortearClima(room);
  }
  // A semente que vale para a previsão do tempo: na sala (antes de largar) é a do GP que vem aí (`sementeProx`, sorteada na primeira
  // vez que alguém pergunta e usada por `preparar`: a previsão que se vê é a do GP que acontece); a carreira já tem a sua fixa.
  function sementeDoClima(room) {
    if (room.phase !== "lobby") return room.semente;
    return room.sementeFixa ?? (room.sementeProx ??= Math.floor(Math.random() * 1e9));
  }
  // O clima do GP (regras de F1): a previsão e a chuva saem da semente do GP (o mesmo em qualquer recarga): chove com a chance da
  // previsão, dentro da janela prevista, e a opção de clima da sala (aleatório, seco, chuva, variável) manda nela. Se chove, a
  // classificação e a corrida têm cada uma o seu roteiro (f1-regras.js, `sortearClima`). `room.sorteioClima` guarda os dois;
  // `room.clima` é o da sessão que está valendo (o que vai no estado público), com o zero do relógio (`t0`) na largada da
  // sessão: a primeira classificação (Q1) ou as luzes apagando na corrida.
  function sortearClima(room) {
    room.clima = null; room.sorteioClima = null;
    if (room.config.regras !== "f1") return;
    const pista = room.config.pista, tab = require("./public/corrida/f1-pneus-ritmo.js").tabelaDe(pista), volta = (tab ? tab.volta : 75) * 1.12;
    const sessoes = F1.sessoesDeClassificacao(room.order.length).length;
    room.sorteioClima = F1.sortearClima(room.semente, { corrida: Math.round(volta * room.config.voltas + 15), quali: sessoes * (Robos.duracaoDaClassificacao(pista) + 13) }, room.config.clima);
  }
  // a classificação (Q1, Q2 e Q3) antes da corrida das regras de F1; no fim ela chama startRace com o grid
  const classificacao = { log, broadcast, largar: (room, grid) => startRace(room, grid) };
  function iniciarClassificacao(room) {
    clearTimeout(room.endTimer); clearInterval(room.itemTimer); clearInterval(room.botTimer); clearInterval(room.f1Timer); clearInterval(room.humanosTimer);
    preparar(room);
    room.phase = "quali"; room.resultado = null; room.luzes = null; room.finishOrder = [];
    room.clima = room.sorteioClima ? { ...room.sorteioClima.quali } : null; // (o `t0` vem na abertura do Q1: corrida-f1-classificacao.js)
    for (const id of room.order) delete room.players[id].sim;
    ligarHumanos(room);
    Quali.iniciar(room, classificacao);
  }
  function endRace(room) {
    if (room.phase !== "race") return;
    clearTimeout(room.endTimer);
    clearInterval(room.itemTimer); clearInterval(room.botTimer); clearInterval(room.f1Timer); clearInterval(room.humanosTimer);
    room.phase = "results";
    // regras de F1: os acréscimos (um composto só, passar do limitador) mexem na ordem de chegada
    if (room.config.regras === "f1" && room.finishOrder.some((id) => room.players[id].acrescimo)) {
      const final = (id) => room.players[id].finish + (room.players[id].acrescimo || 0), antes = room.finishOrder.join();
      room.finishOrder.sort((a, b) => final(a) - final(b));
      if (room.finishOrder.join() !== antes) log(room, `⏱️ Com os acréscimos, ${nameOf(room, room.finishOrder[0])} fica com a vitória.`);
    }
    // regras de F1: o resultado do GP, com os pontos oficiais (quem fez menos de 90% das voltas é NC e não pontua)
    if (room.config.regras === "f1") {
      room.resultado = F1.classificacaoFinal(room.order.map((id) => { const p = room.players[id]; const bonus = bonusDoBox(room, p); return { id, laps: p.laps, finish: p.finish, dnf: !!p.dnf, acrescimo: (p.acrescimo || 0) - bonus, prog: p.pos ? p.pos.prog : 0 }; }), room.config.voltas)
        .map((r) => { const p = room.players[r.id]; return { ...r, voltas: p.laps, grid: p.grid, paradas: (p.paradas || []).length, compostos: p.compostos || [], penal: p.penal || 0, dano: p.dano || 0, batidas: p.batidas || 0, melhor: p.best }; });
      const v = room.resultado[0]; if (v) log(room, `🏆 ${nameOf(room, v.id)} venceu o GP e leva ${v.pontos} pontos.`);
    }
    if (room.finishOrder.length) noite.vitoria("corrida", room.code, nomesDe(room, room.finishOrder.slice(0, 1)), nomesDe(room, room.order.filter((id) => id !== room.finishOrder[0])));
    log(room, "🏆 Fim de corrida!");
    if (room.aoTerminarGP) { try { room.aoTerminarGP(room); } catch (e) { console.warn("Temporada F1: GP não salvo:", e.message); } }
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
  // ---------- o pit stop (regras de F1) ----------
  // A parada acabou (o navegador diz ao sair do corredor; o robô, aqui mesmo): guarda volta, tempo e composto novo,
  // confere o limitador pelo tempo que ficou no corredor (rápido demais: RAPIDO s de acréscimo) e avisa no log.
  function concluirParada(room, p, d) {
    if (!p || !F1.PNEUS[d.composto]) return;
    d = { ...d, composto: F1.compostoParaParada(p, d.composto) }; // limite de 2 jogos de cada composto: o servidor troca o esgotado
    const n = (p.paradas || []).length + 1, tempo = Math.round(d.tempo * 10) / 10, motivo = [];
    F1.registrarParada(p, { volta: d.volta, tempo, composto: d.composto });
    const caro = corredorDe(room);
    if (!p.bot && caro && tempo < F1.tempoNoBox(caro, specDe(p).vmax, F1.tempoDeParada(room.semente, p.id, n)) * 0.85 - 1) {
      p.acrescimo = (p.acrescimo || 0) + F1.RAPIDO; motivo.push(`passou do limitador: +${F1.RAPIDO} s`);
    }
    const parada = F1.tempoDeParada(room.semente, p.id, n); // o tempo sorteado pela semente: o box perfeito, o normal ou o ruim
    log(room, `🔧 ${p.name} parou nos boxes (${F1.PNEUS[d.composto].nome}): ${F1.textoDaParada(parada)}, ${tempo.toFixed(1)} s no corredor.${motivo.length ? " " + motivo.join(", ") : ""}`);
  }
  // o corredor dos boxes da pista da sala (os pontos da pista são de 6 em 6 unidades, como no navegador)
  const corredorDe = (room) => { const t = T.PISTAS[room.config.pista]; return t.boxes ? F1.corredor(t, T.pontos(t, 6).length, t.width) : null; };
  // onde o carro está na pista agora (o ponto da pista), para conferir um setor que pulou: a simulação do servidor (humanos e
  // robôs das regras de F1) ou a posição que o navegador mandou
  const pontoDoCarro = (room, p) => {
    const t = T.PISTAS[room.config.pista], n = T.pontos(t, 6).length, c = p.sim ? p.sim.c : p.ia && p.ia.sim;
    if (c && Number.isFinite(c.idx)) return { idx: c.idx, n };
    if (p.pos && Number.isFinite(p.pos.prog)) return { idx: ((Math.floor(p.pos.prog) % n) + n) % n, n };
    return { idx: NaN, n };
  };
  // Setor novo: vale o próximo na ordem (ou, se um aviso se perdeu, o que o carro mostra estar ali: corrida-setores.js).
  // Voltar ao setor 0 depois do 11 fecha a volta (a primeira passagem é a largada).
  function onSector(room, p, s, now = Date.now()) { // (`now`: a hora do passo da física em que o carro cruzou o portão)
    if (room.phase === "quali") { const mudou = Quali.aoSetor(room, p, s, now); if (mudou) Quali.verificarFim(room, classificacao); return mudou; } // classificação: volta lançada
    if (room.phase !== "race" || p.finish != null) return false;
    if (now < room.startAt) { if (now < room.startAt - 2000) return false; now = room.startAt; } // (o relógio dos passos pode errar por alguns ms: um setor logo antes das luzes não pode ser jogado fora, senão o contador do servidor fica um setor atrás para sempre)
    if (p.dnf) return false;
    const ponto = pontoDoCarro(room, p), lista = Setores.setoresDoAviso(p.sector, s, ponto.idx, ponto.n, T.SECTORS, T.checkpoint);
    if (!lista.length) return false;
    let mudou = false;
    for (const x of lista) mudou = fecharSetor(room, p, x, now) || mudou;
    return mudou;
  }
  function fecharSetor(room, p, s, now) {
    if (p.finish != null) return false;
    p.sector = s;
    if (s !== 0) return true;
    if (!p.started) { p.started = true; p.lapStart = room.startAt; return true; }
    const lap = (now - p.lapStart) / 1000;
    if (lap < T.PISTAS[room.config.pista].minLap) return false; // rápido demais: atalho (a volta não conta, mas o setor segue o do navegador, senão a volta seguinte morria)
    p.laps++; p.last = lap; p.best = p.best == null ? lap : Math.min(p.best, lap); p.lapStart = now;
    if (!p.bot) registrarRecorde(room, p, lap);
    if (p.laps >= room.config.voltas) {
      p.finish = (now - room.startAt) / 1000;
      room.finishOrder.push(p.id);
      log(room, `🏁 ${p.name} cruzou a chegada em ${room.finishOrder.length}º.`);
      if (room.config.regras === "f1") { // a regra dos dois compostos
        const mais = F1.acrescimoDeFinal(p, room.config.voltas, !!(room.clima && room.clima.chove)); // (com chuva a regra não vale)
        if (mais) { p.acrescimo = (p.acrescimo || 0) + mais; log(room, `⏱️ ${p.name} usou um composto só: +${mais} s no resultado.`); }
      }
      const racing = room.order.filter((id) => room.players[id].finish == null && !room.players[id].dnf && (room.players[id].sockets.size || (room.config.regras === "f1" && room.players[id].bot)));
      if (!racing.length) endRace(room);
      else if (room.finishOrder.length === 1) { // o primeiro chegou: os outros têm um tempo para terminar
        const prazo = Robos.prazoDeChegada(room, AFTER_FIRST_MS);
        room.endAt = now + prazo;
        clearTimeout(room.endTimer);
        room.endTimer = setTimeout(() => endRace(room), prazo);
      }
    }
    return true;
  }

  // uma batida (de um humano ou de um robô): a punição e o dano ficam com a direção de prova; com a perda total de quem
  // ainda corria, a corrida pode ter acabado para todos
  function aplicarBatida(room, p, forca, tipo, quando = Date.now(), chave = tipo) {
    const b = Direcao.bater(room, p, forca, tipo, quando, (s) => log(room, s), chave);
    if (!b) return false;
    if (p.dnf && !room.order.some((id) => { const q = room.players[id]; return q.finish == null && !q.dnf && (q.sockets.size || q.bot); })) endRace(room);
    return true;
  }

  // O que a transmissão de TV mostra do campeonato (só em temporada): os 10 primeiros pilotos (mais os humanos que ficaram
  // de fora) e as 11 equipes, com os pontos de antes deste GP. `tab` é o `tabelas` da temporada (solo ou em grupo); no 1º GP
  // ninguém tem ponto e a tabela fica de fora (`vazia`). Só nome, equipe e pontos viajam: o resto da tabela fica no servidor.
  function resumoTV(tab, info, humano, equipeHumana) {
    if (!tab || !tab.pilotos.some((p) => p.pontos > 0)) return { ...info, vazia: true };
    const pil = tab.pilotos.map((p, i) => ({ pos: i + 1, nome: p.nome, equipe: p.equipe, pontos: p.pontos, ...(humano(p) ? { humano: 1 } : {}) }));
    return { ...info, pilotos: [...pil.slice(0, 10), ...pil.slice(10).filter((p) => p.humano)],
      equipes: tab.equipes.map((e, i) => ({ pos: i + 1, id: e.id, nome: e.nome, pontos: e.pontos, ...(equipeHumana(e) ? { humana: 1 } : {}) })) };
  }
  // ---------- conexões ----------
  function abrirGP(temporada, aoTerminarGP, aoMontar) {
    const gp = temporada.calendario[temporada.gp];
    if (!gp) throw Error("A temporada terminou.");
    const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig({ regras: "f1", pista: gp.pista, voltas: temporada.voltas, robos: 19, classificacao: "completa", nivel: temporada.nivel || "medio" }),
      players: {}, order: [], finishOrder: [], log: [], t: Date.now(), privada: true, temporada: true, equipeTemporada: temporada.equipe,
      sementeFixa: `${temporada.semente}:${temporada.ano}:${temporada.gp}`, pilotosTemporada: require("./public/corrida/temporada/regras.js").pilotosNoGrid(temporada),
      montagens: { [temporada.equipe]: temporada.montagem }, bonusMontagem: { [temporada.equipe]: temporada.bonus }, bonusBox: (temporada.engenheiros.mecanico * 0.5 + temporada.engenheiros.estrategista * 0.25), aoTerminarGP, aoMontar,
      tvTemporada: resumoTV(require("./public/corrida/temporada/regras.js").tabelas(temporada), { gp: temporada.gp + 1, total: temporada.tamanho, ano: temporada.ano }, (p) => p.id === "voce", (e) => e.id === temporada.equipe) };
    const eq = Pilotos.EQUIPES[temporada.equipe], id = rid(6), token = rid();
    room.players[id] = { id, name: temporada.nome, token, pawn: "🏎️", color: eq.cor, skin: "padrao", car: "equilibrado", equipe: temporada.equipe,
      mods: { ...T.MODS_PADRAO, pintura: eq.pintura }, pneu: F1.COMPOSTO_PADRAO, grid: 0, laps: 0, sector: T.SECTORS - 1,
      started: false, finish: null, best: null, last: null, sockets: new Set() };
    room.order.push(id); room.host = id; rooms.set(room.code, room); log(room, `🏁 GP de ${gp.nome}: box da temporada aberto.`);
    return { code: room.code, id, token, phase: room.phase };
  }
  // GP da temporada em grupo (corrida-temporada-grupo.js): todos os humanos da sala no mesmo grid, os robôs completando os 20
  // carros. `g.pessoas`: [{ pid, nome, equipe }]; `g.robos`: os pilotos reais de robô (com a equipe de quem os contratou);
  // `g.bonusBox`: o bônus dos engenheiros por equipe. Devolve o acesso de cada pessoa (e o de quem só assiste).
  function abrirGPGrupo(g, aoTerminarGP) {
    const gp = T.PISTAS[g.pista];
    if (!gp) throw Error("Pista inválida.");
    const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig({ regras: "f1", pista: g.pista, voltas: g.voltas, robos: g.robos.length, classificacao: "completa", nivel: g.nivel }),
      players: {}, order: [], finishOrder: [], log: [], t: Date.now(), privada: true, temporada: true, grupo: true, salaTemporada: g.salaTemporada || null, espectadores: new Set(),
      sementeFixa: g.semente, pilotosTemporada: g.robos, montagens: g.montagens || {}, bonusMontagem: g.bonusMontagem || {}, bonusBoxEquipes: g.bonusBox || {}, aoTerminarGP, aoMontar: g.aoMontar,
      tvTemporada: g.tv ? resumoTV(g.tv.tabelas, { gp: g.tv.gp, total: g.tv.total, ano: g.tv.ano }, (p) => p.humano, (e) => e.humana) : null };
    const pessoas = {};
    for (const h of g.pessoas) {
      const eq = Pilotos.EQUIPES[h.equipe], id = rid(6), token = rid();
      room.players[id] = { id, pessoa: h.pid, name: h.nome, token, pawn: "🏎️", color: eq.cor, skin: "padrao", car: "equilibrado", equipe: h.equipe,
        mods: { ...T.MODS_PADRAO, pintura: eq.pintura }, pneu: F1.COMPOSTO_PADRAO, grid: room.order.length, laps: 0, sector: T.SECTORS - 1,
        started: false, finish: null, best: null, last: null, sockets: new Set() };
      room.order.push(id); if (!room.host) room.host = id; pessoas[h.pid] = { id, token };
    }
    const espectador = { watch: true, token: rid() };
    room.espectadores.add(espectador.token);
    rooms.set(room.code, room); log(room, `🏁 GP de ${gp.name}: a temporada em grupo abriu o box.`);
    return { code: room.code, pessoas, espectador };
  }
  // o bônus dos mecânicos e estrategistas da equipe, por parada (temporada solo: uma equipe; em grupo: uma por equipe humana)
  function bonusDoBox(room, p) {
    if (!room.temporada) return 0;
    const k = room.bonusBoxEquipes ? room.bonusBoxEquipes[p.equipe] || 0 : p.equipe === room.equipeTemporada ? room.bonusBox || 0 : 0;
    return (p.paradas || []).length * k;
  }
  // GP em grupo: a classificação começa quando todos os humanos chegaram à pista (ou 30 s depois da primeira pessoa)
  const ESPERA_GRUPO_MS = Number(process.env.CORRIDA_ESPERA_GRUPO_MS) || 30000, ASSUME_MS = process.env.CORRIDA_ASSUME_MS != null ? Number(process.env.CORRIDA_ASSUME_MS) : 8000;
  function entrouNoGP(room) {
    if (!room.grupo) return iniciarClassificacao(room);
    if (room.order.every((id) => room.players[id].bot || room.players[id].sockets.size)) { clearTimeout(room.esperaTimer); room.esperaTimer = null; return iniciarClassificacao(room); }
    if (!room.esperaTimer) room.esperaTimer = setTimeout(() => { room.esperaTimer = null; if (room.phase === "lobby") { iniciarClassificacao(room); broadcast(room); } }, ESPERA_GRUPO_MS);
  }
  // GP em grupo: quem caiu na corrida tem o carro levado por um robô depois de alguns segundos (a recarga da página não conta)
  function agendarAssumir(room, p) {
    clearTimeout(p.assumeTimer);
    p.assumeTimer = setTimeout(() => { if (p.sockets.size || room.phase !== "race") return; if (TRobo.assumir(room, p, (s) => log(room, s))) broadcast(room); }, ASSUME_MS);
  }
  function salaGP(code) { const r = rooms.get(code); return r?.temporada ? r : null; }
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name, skin) {
      const usedP = new Set(Object.values(room.players).map((p) => p.pawn)), usedC = new Set(Object.values(room.players).map((p) => p.color));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: PAWNS.find((x) => !usedP.has(x)), color: COLORS.find((c) => !usedC.has(c)), skin: SKINS[skin] ? skin : "padrao", car: "equilibrado", equipe: null, mods: { ...T.MODS_PADRAO }, pneu: F1.COMPOSTO_PADRAO, grid: room.order.length, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, sockets: new Set() };
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
      if (back) { clearTimeout(room.abandonoTimer); clearTimeout(back.assumeTimer); bind(room, back.id); if (room.grupo && back.assumido) TRobo.devolver(room, back, (s) => log(room, s)); ok(cb, { code: room.code, id: back.id, token: back.token }); if (room.temporada && room.phase === "lobby") entrouNoGP(room); return broadcast(room); }
      if (room.privada && !(room.grupo && data.watch && room.espectadores.has(data.token))) return fail(cb, "GP privado da temporada. Entre pela sede.");
      if (data.watch || room.phase === "race" || room.phase === "quali") {
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
      if (room.temporada && !["qpronto", "confirmarLargada", "montagemGrid", "box", "batida", "sector", "pneu", "tvpular"].includes(type)) return fail(cb, "Este GP é controlado pela sede da temporada.");
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
        if (type === "pneu") { // o composto da largada (regras de F1)
          if (!me || room.phase === "race") return "Só dá para trocar o pneu fora da corrida.";
          if (room.quali && room.quali.confirmados.has(me.id)) return "Você já confirmou a largada.";
          if (!F1.PNEUS[data.pneu]) return "Pneu inválido.";
          me.pneu = data.pneu; me.pneuEscolhido = true; return;
        }
        if (type === "equipe") { // regras de F1: a equipe de 2026 (dois amigos podem dividir a mesma; o primeiro dela é o chefe)
          if (!me || room.phase !== "lobby") return "Só dá para escolher a equipe na sala, antes da largada.";
          if (room.config.regras !== "f1") return "A equipe vale só nas regras de Fórmula 1.";
          if (data.id == null || data.id === "") { me.equipe = null; limparMontagens(room); return; }
          const eq = Pilotos.EQUIPES[data.id];
          if (!eq || !Equipes.EQUIPES[data.id]) return "Equipe inválida.";
          if (me.equipe !== data.id && humanosDa(room, data.id).length >= 2) return `A ${eq.nome} já tem os dois carros ocupados.`;
          me.equipe = data.id;
          if (T.MODS.pintura[eq.pintura]) me.mods = { ...me.mods, pintura: eq.pintura }; // a pintura da equipe (dá para trocar depois)
          limparMontagens(room); return;
        }
        if (type === "montagem") { // regras de F1: só o chefe da equipe distribui os pontos; `montagem: null` volta para a padrão
          if (!me || room.phase !== "lobby") return "Só dá para montar o carro na sala, antes da largada.";
          if (room.config.regras !== "f1") return "A montagem vale só nas regras de Fórmula 1.";
          if (!me.equipe) return "Escolha uma equipe primeiro.";
          if (chefes(room)[me.equipe] !== me.id) return "Só o chefe da equipe monta o carro.";
          if (data.montagem == null && data.pecas == null) { if (room.montagens) delete room.montagens[me.equipe]; if (room.pecasEq) delete room.pecasEq[me.equipe]; limparMontagens(room); return; }
          const v = Pecas.resolver(me.equipe, data); // `pecas` (a escolha de peças) ou `montagem` (os níveis, formato antigo)
          if (!v.ok) return v.erro;
          room.montagens = { ...(room.montagens || {}), [me.equipe]: v.montagem };
          room.pecasEq = { ...(room.pecasEq || {}) }; if (v.pecas) room.pecasEq[me.equipe] = v.pecas; else delete room.pecasEq[me.equipe]; return;
        }
        if (type === "pawn") {
          if (!me || room.phase === "race") return "Só dá para trocar fora da corrida.";
          if (!PAWNS.includes(data.pawn)) return "Avatar inválido.";
          if (Object.values(room.players).some((p) => p !== me && p.pawn === data.pawn)) return "Esse avatar já é de outro piloto.";
          me.pawn = data.pawn; return;
        }
        if (type === "config") {
          if (!isHost || room.phase === "race" || room.phase === "quali") return "Só o organizador muda, fora da corrida.";
          room.config = cleanConfig(data.config); return;
        }
        if (type === "kick") {
          if (!isHost || room.phase === "race" || room.phase === "quali") return "Só o organizador, fora da corrida.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Piloto inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id); limparMontagens(room);
          log(room, `${p.name} saiu da sala.`); return;
        }
        if (type === "start") {
          if (!isHost || room.phase === "race" || room.phase === "quali") return "Só o organizador dá a largada.";
          if (room.config.regras === "f1" && room.config.classificacao !== "pular") iniciarClassificacao(room); else startRace(room);
          return;
        }
        if (type === "reiniciar") { // corrida avulsa: o organizador recomeça do zero (a classificação também, se a sala tiver); na carreira não
          if (!isHost || room.temporada || room.grupo) return "Só o organizador, fora da carreira.";
          if (!["race", "quali", "results"].includes(room.phase)) return "Não há corrida para reiniciar.";
          clearTimeout(room.endTimer); clearInterval(room.itemTimer); clearInterval(room.botTimer); clearInterval(room.f1Timer); clearInterval(room.humanosTimer); Quali.cancelar(room); Robos.remover(room); room.resultado = null; room.phase = "lobby"; room.startAt = null; room.endAt = null; room.tvAte = null;
          log(room, `${me ? me.name : "O organizador"} reiniciou a corrida.`);
          if (room.config.regras === "f1" && room.config.classificacao !== "pular") iniciarClassificacao(room); else startRace(room);
          return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearTimeout(room.endTimer); clearInterval(room.itemTimer); clearInterval(room.botTimer); clearInterval(room.f1Timer); clearInterval(room.humanosTimer); Quali.cancelar(room); Robos.remover(room); room.resultado = null; room.phase = "lobby"; room.startAt = null; room.endAt = null; room.tvAte = null; return;
        }
        if (type === "end") {
          if (!isHost || room.phase !== "race") return "Só o organizador encerra a corrida.";
          endRace(room); return;
        }
        if (!me) return "Você está só assistindo.";
        if (room.config.regras === "f1" && (type === "sector" || type === "box" || type === "batida")) return "ignorado"; // regras de F1: checkpoint, box e batida saem da física do servidor
        if (type === "qpronto") { // classificação: "já fiz a minha volta" (a sessão fecha quando todo mundo na pista disser)
          if (room.phase !== "quali" || room.quali.pausaAte) return "ignorado";
          Quali.pronto(room, me); Quali.verificarFim(room, classificacao); return;
        }
        if (type === "confirmarLargada") {
          if (room.phase !== "quali" || !room.quali || !room.quali.grid) return "ignorado";
          Quali.confirmarLargada(room, me, classificacao); return;
        }
        if (type === "montagemGrid") {
          if (!room.temporada || room.phase !== "quali" || !room.quali?.pausaAte || !(room.quali.grid || room.quali.nome === "Q2")) return "A montagem só pode mudar após o Q2 ou no grid final da carreira.";
          if (room.quali.confirmados.has(me.id)) return "Você já confirmou a largada.";
          if (!me.equipe || !room.montagens?.[me.equipe]) return "Equipe inválida.";
          const v = Equipes.validar(me.equipe, data.montagem, room.bonusMontagem?.[me.equipe] || 0);
          if (!v.ok) return v.erro;
          try { if (room.aoMontar) room.aoMontar(me, v.montagem); } catch (e) { return e.message || "Não foi possível salvar a montagem."; }
          room.montagens[me.equipe] = v.montagem;
          atribuirCarros(room);
          return;
        }
        if (type === "box") { // regras de F1: entrou no corredor dos boxes (fase "entra") ou saiu dele com o pneu novo (fase "sai")
          if (room.config.regras !== "f1" || room.phase !== "race" || me.finish != null || !corredorDe(room)) return "ignorado";
          if (data.fase === "entra") {
            if (me.box || me.laps + 1 >= room.config.voltas) return "ignorado"; // na última volta o corredor passa pela chegada: sem box
            me.box = { entrou: Date.now(), volta: me.laps + 1 }; return;
          }
          if (data.fase === "sai") {
            if (!me.box) return "ignorado";
            if (!F1.PNEUS[data.composto]) return "Pneu inválido.";
            const box = me.box; me.box = null; me.boxFant = Date.now() + Contato.BOX_FANTASMA_MS;
            concluirParada(room, me, { composto: data.composto, tempo: (Date.now() - box.entrou) / 1000, volta: box.volta }); return;
          }
          return "Fase inválida.";
        }
        if (type === "batida") { // regras de F1: o navegador diz a força; o servidor confere com o carro, a velocidade e quem estava perto
          const forca = num(data.forca), car = T.CARROS[me.car] || T.CARROS.equilibrado;
          if (room.config.regras !== "f1" || room.phase !== "race" || !me.pos || !(forca > 0)) return "ignorado";
          const tipo = data.tipo === "carro" ? "carro" : "muro", agora = Date.now();
          const perto = tipo === "carro" ? room.order.some((id) => { const o = room.players[id]; return o && o !== me && !o.dnf && o.finish == null && o.pos && Math.abs((o.pos.z || 0) - me.pos.z) < 20 && Math.hypot(o.pos.x - me.pos.x, o.pos.y - me.pos.y) < 90; }) : true;
          const teto = Math.min(F1.BATIDA_MAX, car.vmax * 1.15, (Math.abs(me.pos.v || 0) + 80) * 1.3);
          if (!perto || agora - me.pos.at > 1500) return "ignorado";
          if (!aplicarBatida(room, me, Math.min(forca, teto), tipo)) return "ignorado";
          return;
        }
        if (type === "tvpular") { // regras de F1: pulou a transmissão de TV; quando todos os humanos presentes pulam, as luzes vêm já
          const agora = Date.now();
          if (room.config.regras !== "f1" || room.phase !== "race" || !room.tvAte || agora >= room.tvAte - 400 || room.tvPulos.has(me.id)) return "ignorado";
          room.tvPulos.add(me.id);
          if (room.order.some((id) => { const q = room.players[id]; return q && !q.bot && q.sockets.size && !room.tvPulos.has(id); })) return "ignorado"; // ainda falta gente: só esconde para quem pulou
          room.tvAte = agora; room.startAt = agora + Math.round(LUZES_MS + (4 + room.luzes.espera) * 1000);
          if (room.clima) room.clima.t0 = room.startAt;
          return;
        }
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

    // o relógio: o navegador pergunta a hora do servidor várias vezes e fica com a resposta de menor ida e volta (pose.js, criarRelogio)
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    // regras de F1: as entradas do piloto, um número por passo da física (corrida-humanos.js)
    socket.on("inp", (d) => {
      const { room, me } = ctx();
      if (!room || !me || me.bot) return;
      Humanos.entrada(room, me, d);
    });

    // posição do meu carro (10 por segundo): vai para os outros (só nas salas sem as regras de F1; nelas o servidor anda o carro)
    socket.on("pos", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || me.dnf || room.config.regras === "f1" || (room.phase !== "race" && room.phase !== "quali")) return;
      if (room.phase === "quali" && (room.quali.pausaAte || !room.quali.ativos.includes(me.id))) return; // só quem está na sessão
      const now = Date.now();
      if (now - (me.lastPos || 0) < 50) return;
      me.lastPos = now;
      const x = num(d.x), y = num(d.y), a = num(d.a), v = num(d.v), prog = num(d.prog);
      if (![x, y, a].every(Number.isFinite)) return;
      const z = num(d.z);
      const world = T.PISTAS[room.config.pista].world;
      if (x < 0 || y < 0 || x > world || y > world) return;
      const pos = { x, y, z: Number.isFinite(z) ? z : 0, a, v: Number.isFinite(v) ? v : 0, prog: Number.isFinite(prog) ? prog : 0, at: now };
      if (room.config.regras === "f1" && room.phase === "race") { const penal = me.penal || 0; Direcao.registrar(room, me, pos, now, (s) => log(room, s)); if ((me.penal || 0) !== penal) broadcast(room); } // a penalidade aparece na hora
      else me.pos = pos;
      socket.to(room.code).volatile.emit("ghost", { id: me.id, x, y, z: Number.isFinite(z) ? Math.max(-50, Math.min(400, z)) : 0, a, v: Number.isFinite(v) ? v : 0, prog: Number.isFinite(prog) ? prog : 0, laps: me.laps, t: now });
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      if (room.grupo) { if (me && !me.sockets.size && room.phase === "race") agendarAssumir(room, me); } // (na classificação quem sai só fica sem tempo)
      else if (room.temporada && me && !me.sockets.size && (room.phase === "race" || room.phase === "quali")) {
        clearTimeout(room.abandonoTimer);
        room.abandonoTimer = setTimeout(() => { if (me.sockets.size || room.phase === "results") return; me.dnf = true; log(room, `${me.name} abandonou o GP (DNF).`); if (room.phase === "quali") Quali.verificarFim(room, classificacao); broadcast(room); }, 20000);
      }
      if (room.phase === "quali") { Quali.verificarFim(room, classificacao); Quali.verificarLargada(room, classificacao); } // quem saiu não segura a sessão nem a confirmação
      if (!room.temporada && room.phase === "race" && room.finishOrder.length && !room.order.some((id) => room.players[id].finish == null && room.players[id].sockets.size)) endRace(room);
      broadcast(room);
    });
  });

  // salas paradas há mais de 12 horas somem
  limparSalasParadas(rooms, { aoApagar: (r) => { Quali.cancelar(r); clearTimeout(r.endTimer); clearTimeout(r.abandonoTimer); clearTimeout(r.esperaTimer); for (const id of r.order) clearTimeout(r.players[id]?.assumeTimer); clearInterval(r.itemTimer); clearInterval(r.botTimer); clearInterval(r.f1Timer); clearInterval(r.humanosTimer); } });
  // (as regras de cada evento da física, para os testes chamarem sem passar pela rede: checkpoint, parada nos boxes e batida)
  return { abrirGP, abrirGPGrupo, salaGP, internos: { sala: (codigo) => rooms.get(codigo), endRace, startRace, entrouNoGP, onSector, concluirParada, aplicarBatida } };
};
module.exports.COLORS = COLORS;
module.exports.PAWNS = PAWNS;
