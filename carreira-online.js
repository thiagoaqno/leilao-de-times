// Carreira em grupo — canal "/carreira-online" do Socket.io (planos/carreira-online.md, PRs 4, 5 e 6).
// Uma turma joga a mesma carreira: o criador abre a sala com código e vira o anfitrião (escolhe as temporadas, o aporte
// do investidor, as ligas e o ritmo), os amigos entram pelo código e cada um escolhe um clube livre. Quando o
// anfitrião começa, nasce um mundo só (carreira.js, novaCarreiraGrupo) com um clube humano por pessoa; cada um vê a
// sede do seu clube.
// - A rodada ao vivo (carreira-rodada.js): o anfitrião aperta "Jogar a rodada" e todos assistem juntos, cada um o seu
//   jogo, com o placar dos outros numa faixa. As paradas só pausam o jogo delas, com tempo para decidir. No turbo, as
//   rodadas sem humano contra humano e sem final saem na hora.
// - O mercado disputado: o leilão de um jogador por vez, com os amigos dando lances (cada lance reinicia o relógio); o
//   jogador de um amigo só sai quando o dono bate o martelo. E o olheiro (carreira.js, olheiro).
// - Reconexão: cada pessoa tem um token (fica no navegador em "carreira-online:<CÓDIGO>"; o servidor guarda só o
//   hash). Fechar a aba não tira ninguém da sala.
// - A sala inteira fica no banco (bd.js, tabela carreiras_online): o servidor pode reiniciar no meio da noite. A sala
//   se apaga 24 h depois do último uso.
const crypto = require("crypto");
const bd = require("./bd.js");
const { rid, novoCodigo, limparNome, ok, falha, buscarSala, nomeEmUso, limparSalasParadas } = require("./salas.js");
const Carreira = require("./carreira.js").grupo;
const Rd = require("./carreira-rodada.js");

const MAX_PESSOAS = 8;
const APORTES = [0, 250e6, 500e6, 1e9];
const CAIXAS_IGUAIS = [0, 100e6, 300e6]; // 0: cada clube com o seu orçamento
const OPCOES_PADRAO = { temporadas: 2, aporte: 1e9, ligas: "mundo", ritmo: "normal", caixaIgual: 0 };
const HORAS_PARADA = 48; // a sala (e a carreira) só expira depois de 48 horas sem ninguém mexer
// os tempos (os testes aceleram pelo ambiente): o relógio do jogo (minutos de jogo por segundo), a decisão, o lance do
// leilão (cada lance reinicia), a primeira janela do leilão, o martelo do dono e a contagem antes da rodada
const VEL = Number(process.env.CARREIRA_VEL) || 1.5;
const DECISAO_MS = Number(process.env.CARREIRA_DECISAO_MS) || 20000;
const LANCE_MS = Number(process.env.CARREIRA_LANCE_MS) || 15000;
const ABERTURA_MS = LANCE_MS + 5000, MARTELO_MS = 30000;
const ESPERA_MS = process.env.CARREIRA_ESPERA_MS != null ? Number(process.env.CARREIRA_ESPERA_MS) : 3000;
const TICK_MS = 250;
// quem fica fora da sala mais do que isso é "ausente": o jogo dele anda no automático (a volta de uma recarga não conta)
const AUSENTE_MS = process.env.CARREIRA_AUSENTE_MS != null ? Number(process.env.CARREIRA_AUSENTE_MS) : 15000;
const hash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

// as opções do anfitrião, sempre dentro do permitido
function limparOpcoes(atual, d = {}) {
  const o = { ...atual };
  if (d.temporadas != null) { const n = Math.round(Number(d.temporadas)); if (n >= 1 && n <= 5) o.temporadas = n; }
  if (d.aporte != null && APORTES.includes(Number(d.aporte))) o.aporte = Number(d.aporte);
  if (d.caixaIgual != null && CAIXAS_IGUAIS.includes(Number(d.caixaIgual))) o.caixaIgual = Number(d.caixaIgual);
  if (d.ligas === "brasil" || d.ligas === "mundo") o.ligas = d.ligas;
  if (d.ritmo === "normal" || d.ritmo === "turbo") o.ritmo = d.ritmo;
  return o;
}

module.exports = function ligarCarreiraOnline(io) {
  const nsp = io.of("/carreira-online");
  const rooms = new Map();

  // ---------- o banco: guardar e carregar as salas ----------
  const paraGuardar = (room) => ({ code: room.code, host: room.host, fase: room.fase, opcoes: room.opcoes, order: room.order, save: room.save, t: room.t,
    nRodada: room.nRodada || 0, prontos: room.prontos || {}, rodada: room.rodada || null, ultimaRodada: room.ultimaRodada || null, leilao: room.leilao || null, ultimoLeilao: room.ultimoLeilao || null, trocas: room.trocas || [],
    players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { id, name: p.name, skin: p.skin, clube: p.clube, tokenHash: p.tokenHash, ...(p.dispensado && { dispensado: true }) }])) });
  function guardar(room) { room.t = Date.now(); try { bd.salvarSalaCarreira(room.code, paraGuardar(room)); } catch (e) { console.warn("carreira-online: não salvou a sala", room.code, e.message); } }
  try {
    for (const { codigo, dados, atualizadaEm } of bd.salasCarreira()) {
      if (Date.now() - atualizadaEm > HORAS_PARADA * 3600e3) { bd.apagarSalaCarreira(codigo); continue; }
      if (dados.save && dados.save.v !== Carreira.VERSAO) { bd.apagarSalaCarreira(codigo); continue; } // mundo da base antiga (EA FC 26)
      const players = Object.fromEntries(Object.entries(dados.players || {}).map(([id, p]) => [id, { ...p, sockets: new Set(), saiuEm: Date.now() }]));
      rooms.set(codigo, { ...dados, code: codigo, players, t: atualizadaEm });
    }
  } catch (e) { console.warn("carreira-online: o banco não abriu; as salas ficam só na memória.", e.message); }
  limparSalasParadas(rooms, { horas: HORAS_PARADA, aoApagar: (room) => { try { bd.apagarSalaCarreira(room.code); } catch {} } });

  // ---------- o estado ----------
  // o leilão aberto, como todo mundo vê
  const verLeilao = (l) => (l ? { jogador: l.jogador, dono: l.dono, tipo: l.tipo, minimo: l.minimo, abertoPor: l.abertoPor, lances: l.lances.slice(-12), fim: l.fim, estado: l.estado, ate: l.ate || null,
    passo: Carreira.passoDoLance(l.lances.length ? l.lances[l.lances.length - 1].valor : l.minimo), teto: Number.isFinite(l.teto) ? l.teto : null } : null);
  // o que todo mundo da sala vê: as pessoas (com o clube de cada uma), as opções, a fase, a rodada e o leilão
  const publicState = (room) => ({
    code: room.code, fase: room.fase, host: room.host, opcoes: room.opcoes, max: MAX_PESSOAS, now: Date.now(),
    players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, clube: p.clube || null, online: p.sockets.size > 0, host: id === room.host, pronto: !!(p.clube && room.prontos && room.prontos[p.clube] === (room.nRodada || 0)) }; }),
    ocupados: Object.fromEntries(room.order.filter((id) => room.players[id].clube).map((id) => [room.players[id].clube, id])),
    clubes: Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => c.id),
    nRodada: room.nRodada || 0,
    caixas: room.fase === "carreira" && room.save && room.save.caixaIA ? Object.fromEntries(Carreira.clubesEscolhiveis(room.opcoes.ligas).filter((c) => c.id in room.save.caixaIA).map((c) => [c.id, Math.round(room.save.caixaIA[c.id] / 1e5) * 1e5])) : null,
    rodada: room.rodada ? { n: room.rodada.n, semana: room.rodada.semana, inicio: room.rodada.inicio, velocidade: room.rodada.multiplicador || 1, jogos: room.rodada.jogos.map((j) => ({ casa: j.casa, fora: j.fora, fim: j.fim })) } : null,
    ultimaRodada: room.ultimaRodada || null,
    leilao: verLeilao(room.leilao), ultimoLeilao: room.ultimoLeilao || null,
    trocas: (room.trocas || []).filter((x) => x.estado === "aberta").map(({ id, de, para, dou, recebo, dinheiro, t }) => ({ id, de, para, dou, recebo, dinheiro, t })),
    temporadaAcabou: room.save ? !Carreira.proximaRodadaGrupo(room.save) : false,
    carreiraAcabou: room.save ? !Carreira.proximaRodadaGrupo(room.save) && room.save.temporada >= room.save.temporadasMax : false,
  });
  // a sede de cada pessoa (depois do começo): o estado da carreira visto pelo clube dela, com a rodada ao vivo
  const estadoDe = (room, p) => {
    if (!room.save || !p.clube || !room.save.humanos[p.clube]) return null;
    const v = Carreira.vistaDe(room.save, p.clube), e = Carreira.estado(v);
    e.regraCompras = Carreira.regraDeCompras(v); // as regras de compra da turma (e, para quem entrou agora, a janela da entrada)
    if (e.regraCompras.tipo === "entrada" && !e.janela.aberta) e.janela = { ...e.janela, aberta: true, entrada: true };
    e.rodadaGrupo = Rd.visao(room.save, room.rodada, p.clube, Date.now());
    e.anfitriao = p.id === room.host;
    return e;
  };
  // tudo para todo mundo: a sala (state) e a sede de cada um (carreira)
  function broadcast(room) {
    nsp.to(room.code).emit("state", publicState(room));
    if (room.fase !== "carreira") return;
    for (const id of room.order) {
      const p = room.players[id], e = p.sockets.size ? estadoDe(room, p) : null;
      if (e) for (const sid of p.sockets) nsp.to(sid).emit("carreira", e);
    }
  }
  // só a rodada (leve, várias vezes por rodada: o relógio, as paradas e a faixa dos outros jogos)
  function mandarRodada(room) {
    const agora = Date.now();
    for (const id of room.order) {
      const p = room.players[id]; if (!p.sockets.size || !p.clube) continue;
      const v = Rd.visao(room.save, room.rodada, p.clube, agora);
      for (const sid of p.sockets) nsp.to(sid).emit("rodada", v);
    }
  }

  // ---------- quem saiu da sala ----------
  // os clubes de quem está fora há mais de AUSENTE_MS (ou já foi dispensado): o jogo deles anda no automático
  function ausentesDe(room, agora) {
    const ausentes = new Set();
    for (const id of room.order) {
      const p = room.players[id];
      if (p.clube && (p.dispensado || (!p.sockets.size && agora - (p.saiuEm || agora) > AUSENTE_MS))) ausentes.add(p.clube);
    }
    return ausentes;
  }
  // tira a pessoa da sala. Se tinha clube na carreira, o clube volta para o computador (com o caixa que tinha) e o
  // leilão em que ele estava é cancelado. Quem estava na sala vira espectador.
  function removerPessoa(room, p) {
    const clube = p.clube;
    if (clube && room.save && room.save.humanos[clube]) {
      const l = room.leilao;
      if (l && (l.dono === clube || l.abertoPor === clube || l.lances.some((x) => x.clube === clube))) fecharLeilao(room, Date.now(), "cancelado");
      room.save.caixaIA[clube] = room.save.humanos[clube].estado.caixa;
      delete room.save.humanos[clube];
      if (room.prontos) delete room.prontos[clube];
    }
    for (const sid of p.sockets) { nsp.to(sid).emit("dispensado", { sala: room.code }); const s = nsp.sockets.get(sid); if (s) s.data.pid = null; }
    room.order = room.order.filter((id) => id !== p.id);
    delete room.players[p.id];
  }
  // quem foi dispensado sai na hora; com a bola rolando, o clube só passa para o computador no fim da rodada (o jogo dele anda no automático)
  function limparDispensados(room) {
    let saiu = false;
    for (const id of [...room.order]) {
      const p = room.players[id];
      if (!p || !p.dispensado) continue;
      if (room.rodada && p.clube && room.save && room.save.humanos[p.clube]) continue;
      removerPessoa(room, p); saiu = true;
    }
    return saiu;
  }
  // ---------- a rodada ao vivo (carreira-rodada.js) ----------
  function comecarRodada(room) {
    const save = room.save;
    if (room.rodada) return "A rodada já está rolando.";
    limparDispensados(room);
    if (room.leilao) return "Espere o leilão acabar.";
    let p = Carreira.proximaRodadaGrupo(save), pulou = 0;
    if (!p) return "A temporada acabou. Comece a próxima.";
    // turbo: as rodadas sem humano contra humano e sem final saem na hora
    if (room.opcoes.ritmo === "turbo") {
      const especial = (x) => x.jogos.some((j) => (save.humanos[j.casa] && save.humanos[j.fora]) || j.fase === "final");
      while (p && !especial(p)) {
        Carreira.comecarRodadaGrupo(save);
        const jogos = p.jogos.map((j) => ({ casa: j.casa, fora: j.fora, placar: Carreira.jogarNaHora(save, j).placar }));
        Carreira.fecharRodadaGrupo(save);
        room.nRodada = (room.nRodada || 0) + 1; pulou++;
        room.ultimaRodada = { n: room.nRodada, jogos };
        p = Carreira.proximaRodadaGrupo(save);
      }
      if (!p) return { pulou };
    }
    // os avisos sem resposta valem a opção padrão, como antes de um jogo
    for (const c of Object.keys(save.humanos)) { const v = Carreira.vistaDe(save, c); Carreira.resolverPendentes(v); Carreira.guardarVista(save, v); }
    Carreira.comecarRodadaGrupo(save);
    room.nRodada = (room.nRodada || 0) + 1;
    room.rodada = Rd.criarRodada(save, p, Date.now(), { vel: VEL, decisaoMs: DECISAO_MS, espera: ESPERA_MS, n: room.nRodada });
    return { pulou };
  }
  // ---------- o leilão entre os amigos ----------
  function fecharLeilao(room, agora, resultado, venda) {
    const l = room.leilao;
    room.ultimoLeilao = { jogador: l.jogador, de: l.dono, resultado, t: agora, ...(venda || {}) };
    room.leilao = null;
  }
  // o martelo: o maior lance que ainda pode pagar leva (alguém pode ter gastado o caixa no meio do caminho)
  function venderNoLeilao(room, agora) {
    const l = room.leilao, save = room.save;
    if (Carreira.donoDe(Carreira.vistaDe(save, Object.keys(save.humanos)[0]), l.jogador) !== l.dono) return fecharLeilao(room, agora, "cancelado");
    for (const x of [...l.lances].reverse()) {
      const v = Carreira.vistaDe(save, x.clube);
      if (v.caixa < x.valor || Carreira.elencoDe(v, x.clube).length >= Carreira.Mercado.ELENCO_MAX || Carreira.erroDeCompra(save, x.clube, l.jogador)) continue;
      Carreira.concluirLeilao(save, { jogador: l.jogador, dono: l.dono, comprador: x.clube, valor: x.valor });
      return fecharLeilao(room, agora, "vendido", { para: x.clube, valor: x.valor });
    }
    fecharLeilao(room, agora, "sem lances");
  }
  function tickLeilao(room, agora) {
    const l = room.leilao; if (!l) return false;
    if (l.estado === "lances" && agora >= l.fim) {
      if (!l.lances.length) fecharLeilao(room, agora, "sem lances");
      else if (l.tipo === "cpu") venderNoLeilao(room, agora);
      else { l.estado = "martelo"; l.ate = agora + MARTELO_MS; } // o dono decide: bater o martelo ou ficar com ele
      return true;
    }
    if (l.estado === "martelo" && agora >= l.ate) { fecharLeilao(room, agora, "recusado"); return true; }
    return false;
  }
  // o relógio da sala: a rodada e o leilão andam sozinhos
  let ultimaRodadaMandada = 0;
  setInterval(() => {
    const agora = Date.now();
    for (const room of rooms.values()) {
      if (room.fase !== "carreira" || !room.save) continue;
      let mudou = false, rodadaMudou = false;
      if (room.rodada) {
        const r = Rd.tick(room.save, room.rodada, agora, ausentesDe(room, agora));
        rodadaMudou = r.mudou;
        if (r.acabou) {
          room.ultimaRodada = { n: room.rodada.n, jogos: room.rodada.jogos.map((j) => ({ casa: j.casa, fora: j.fora, placar: j.placar })) };
          room.rodada = null; room.prontos = {}; mudou = true;
          limparDispensados(room); // quem foi dispensado no meio da rodada sai agora
        }
      }
      if (tickLeilao(room, agora)) mudou = true;
      if (mudou) { guardar(room); broadcast(room); }
      else if (room.rodada && (rodadaMudou || agora - ultimaRodadaMandada > 2000)) { if (rodadaMudou) guardar(room); mandarRodada(room); }
    }
    if (agora - ultimaRodadaMandada > 2000) ultimaRodadaMandada = agora;
  }, TICK_MS).unref?.();

  nsp.on("connection", (socket) => {
    const minha = () => { const room = socket.data.code && rooms.get(socket.data.code); return { room, me: room && socket.data.pid ? room.players[socket.data.pid] : null }; };
    function ligar(room, pid) {
      const velho = minha();
      if (velho.me) velho.me.sockets.delete(socket.id);
      if (velho.room) socket.leave(velho.room.code);
      socket.data.code = room.code; socket.data.pid = pid;
      socket.join(room.code);
      if (pid) { room.players[pid].sockets.add(socket.id); delete room.players[pid].saiuEm; }
    }
    function novaPessoa(room, name, skin) {
      const id = rid(8), token = rid(16);
      room.players[id] = { id, name, skin: String(skin || "").slice(0, 20), clube: null, tokenHash: hash(token), sockets: new Set() };
      room.order.push(id);
      return { id, token };
    }
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("create", (d = {}, cb) => {
      const name = limparNome(d.name);
      if (!name) return falha(cb, "Coloque o seu nome.");
      const code = novoCodigo(rooms);
      const room = { code, host: null, fase: "espera", opcoes: { ...OPCOES_PADRAO }, players: {}, order: [], save: null, t: Date.now() };
      rooms.set(code, room);
      const { id, token } = novaPessoa(room, name, d.skin);
      room.host = id;
      ligar(room, id); guardar(room);
      ok(cb, { code, id, token });
      broadcast(room);
    });
    socket.on("join", (d = {}, cb) => {
      const room = buscarSala(rooms, d.code);
      if (!room) return falha(cb, "Sala não encontrada. Confira o código.");
      // voltando (recarregou, caiu ou fechou a aba): o id e o token batem
      const volta = d.id && room.players[d.id] && room.players[d.id].tokenHash === hash(d.token) ? room.players[d.id] : null;
      if (volta) { ligar(room, volta.id); ok(cb, { code: room.code, id: volta.id, token: d.token }); return broadcast(room); }
      if (d.watch) { ligar(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = limparNome(d.name);
      if (!name) return falha(cb, "Coloque o seu nome.");
      if (nomeEmUso(room, name)) return falha(cb, "Já tem alguém com esse nome na sala.");
      // com a carreira rolando também dá para entrar: a pessoa escolhe um clube livre quando não tiver rodada nem leilão
      if (room.order.length >= MAX_PESSOAS) return falha(cb, `A sala está cheia (${MAX_PESSOAS} técnicos).`);
      const { id, token } = novaPessoa(room, name, d.skin);
      ligar(room, id); guardar(room);
      ok(cb, { code: room.code, id, token });
      broadcast(room);
    });

    // as ações da sala: na espera, as opções (anfitrião), o clube e começar (anfitrião); depois do começo, jogar a
    // rodada e a temporada nova (anfitrião), e o leilão (abrir, dar lance, bater o martelo ou recusar)
    socket.on("act", (d = {}, cb) => {
      const { room, me } = minha();
      if (!room) return falha(cb, "Você não está numa sala.");
      if (!me) return falha(cb, "Quem assiste não mexe na sala.");
      const agora = Date.now();
      let extra = {};
      if (me.dispensado) return falha(cb, "O anfitrião dispensou você da sala.");
      if (d.type === "opcoes") {
        if (me.id !== room.host) return falha(cb, "Só o anfitrião muda as opções.");
        if (room.fase !== "espera") return falha(cb, "A carreira já começou.");
        room.opcoes = limparOpcoes(room.opcoes, d);
        // trocou as ligas: quem estava num clube que saiu da lista volta a escolher
        const pode = new Set(Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => c.id));
        for (const id of room.order) if (room.players[id].clube && !pode.has(room.players[id].clube)) room.players[id].clube = null;
      } else if (d.type === "clube" && room.fase !== "espera") {
        // a carreira já rolando: quem entrou depois assume um clube livre (o clube é do computador até alguém pegar)
        if (me.clube) return falha(cb, "Você já tem um clube nesta carreira.");
        const clube = String(d.clube || "");
        if (!Carreira.clubesEscolhiveis(room.opcoes.ligas).some((c) => c.id === clube)) return falha(cb, "Esse clube não está nas ligas desta sala.");
        const dono = room.order.find((id) => room.players[id].clube === clube);
        if (dono) return falha(cb, `O ${Carreira.clubeDe(clube).nome} já é do ${room.players[dono].name}.`);
        if (room.rodada) return falha(cb, "Tem rodada rolando: espere ela acabar para entrar.");
        if (room.leilao) return falha(cb, "Tem leilão aberto: espere ele acabar para entrar.");
        const r = Carreira.entrarNaCarreira(room.save, { clube, nome: me.name, skin: me.skin }, { aporte: room.opcoes.aporte });
        if (typeof r === "string") return falha(cb, r);
        me.clube = clube;
      } else if (d.type === "clube") {
        const clube = d.clube == null ? null : String(d.clube);
        if (clube && !Carreira.clubesEscolhiveis(room.opcoes.ligas).some((c) => c.id === clube)) return falha(cb, "Esse clube não está nas ligas desta sala.");
        const dono = clube && room.order.find((id) => id !== me.id && room.players[id].clube === clube);
        if (dono) return falha(cb, `O ${Carreira.clubeDe(clube).nome} já é do ${room.players[dono].name}.`);
        me.clube = clube;
      } else if (d.type === "comecar") {
        if (me.id !== room.host) return falha(cb, "Só o anfitrião começa a carreira.");
        if (room.fase !== "espera") return falha(cb, "A carreira já começou.");
        const sem = room.order.filter((id) => !room.players[id].clube).map((id) => room.players[id].name);
        if (sem.length) return falha(cb, `Falta escolher o clube: ${sem.join(", ")}.`);
        try {
          room.save = Carreira.novaCarreiraGrupo(room.order.map((id) => ({ clube: room.players[id].clube, nome: room.players[id].name, skin: room.players[id].skin })),
            { temporadas: room.opcoes.temporadas, aporte: room.opcoes.aporte, caixaIgual: room.opcoes.caixaIgual || 0 });
        } catch (e) { console.warn("carreira-online: não começou", e); return falha(cb, "Não deu para montar a carreira. Tente de novo."); }
        room.fase = "carreira"; room.nRodada = 0; room.prontos = {};
      } else if (d.type === "dispensar") {
        // o anfitrião tira alguém da sala (quem saiu no meio e não vai voltar): o clube passa para o computador
        if (me.id !== room.host) return falha(cb, "Só o anfitrião dispensa alguém.");
        const alvo = room.players[String(d.pessoa || "")];
        if (!alvo) return falha(cb, "Essa pessoa não está mais na sala.");
        if (alvo.id === me.id) return falha(cb, "Você é o anfitrião: não dá para se dispensar.");
        const nome = alvo.name, clube = alvo.clube;
        alvo.dispensado = true;
        limparDispensados(room);
        extra = { dispensado: nome, clube, noFimDaRodada: !!room.players[alvo.id] };
      } else if (room.fase !== "carreira" || !me.clube) return falha(cb, "Agora não.");
      else if (d.type === "rodada") {
        if (me.id !== room.host) return falha(cb, "Quem começa a rodada é o anfitrião.");
        const r = comecarRodada(room);
        if (typeof r === "string") return falha(cb, r);
        extra = r;
      } else if (d.type === "velocidade") {
        if (me.id !== room.host) return falha(cb, "Só o anfitrião controla a velocidade.");
        if (!room.rodada) return falha(cb, "Não tem rodada ao vivo agora.");
        const velocidade = Number(d.velocidade);
        if (![1, 3].includes(velocidade)) return falha(cb, "Escolha 1× ou 3×.");
        Rd.alterarVelocidade(room.rodada, velocidade, agora);
        extra = { velocidade };
      } else if (d.type === "novaTemporada") {
        if (me.id !== room.host) return falha(cb, "Quem começa a temporada é o anfitrião.");
        if (room.rodada || room.leilao) return falha(cb, "Espere a rodada e o leilão acabarem.");
        const r = Carreira.novaTemporadaGrupo(room.save);
        if (r) return falha(cb, r);
      } else if (d.type === "leilao") {
        if (room.rodada) return falha(cb, "Com a bola rolando, o mercado espera o fim da rodada.");
        if (room.leilao) return falha(cb, "Já tem um leilão aberto: um por vez.");
        const pid = String(d.jogador || ""), info = Carreira.infoLeilao(room.save, me.clube, pid);
        if (typeof info === "string") return falha(cb, info);
        room.leilao = { jogador: pid, ...info, abertoPor: me.clube, lances: [], fim: agora + ABERTURA_MS, estado: "lances" };
      } else if (d.type === "lance") {
        const l = room.leilao;
        if (!l || l.estado !== "lances") return falha(cb, "Não tem leilão recebendo lances agora.");
        const valor = Math.round(Number(d.valor) / 1e5) * 1e5, erro = Carreira.erroDoLance(room.save, me.clube, l, valor);
        if (erro) return falha(cb, erro);
        l.lances.push({ clube: me.clube, valor, t: agora });
        l.fim = agora + LANCE_MS; // cada lance novo reinicia o relógio
      } else if (d.type === "martelo" || d.type === "recusar") {
        const l = room.leilao;
        if (!l || l.dono !== me.clube) return falha(cb, "Só o dono do jogador bate o martelo.");
        if (d.type === "recusar") fecharLeilao(room, agora, "recusado");
        else if (!l.lances.length) return falha(cb, "Ainda não tem lance.");
        else venderNoLeilao(room, agora);
      } else return falha(cb, "Agora não.");
      guardar(room);
      ok(cb, extra);
      broadcast(room);
    });

    // ---------- depois do começo: cada um na sede do seu clube ----------
    // a mesma conversa do canal /carreira (a página é a mesma): a ação devolve o estado do seu clube
    function comClube(cb, acao) {
      const { room, me } = minha();
      if (!room || !me) return falha(cb, "Você não está numa sala.");
      if (me.dispensado) return falha(cb, "O anfitrião dispensou você da sala.");
      if (room.fase !== "carreira" || !me.clube) return falha(cb, "A carreira desta sala ainda não começou.");
      const v = Carreira.vistaDe(room.save, me.clube);
      Carreira.completar(v);
      const r = acao(v, room, me);
      if (typeof r === "string") return falha(cb, r);
      Carreira.guardarVista(room.save, v);
      guardar(room);
      ok(cb, { ...(r || {}), estado: estadoDe(room, me) });
    }
    const semRodada = (room) => (room.rodada ? "Com a bola rolando, o mercado espera o fim da rodada." : null);
    socket.on("entrar", (d, cb) => comClube(cb, () => null));
    socket.on("escalacao", (d = {}, cb) => comClube(cb, (v, room) => {
      const erro = Carreira.limparEscalacao(v, d); if (erro) return erro;
      (room.prontos ||= {})[v.clube] = room.nRodada || 0; // o anfitrião vê quem já mexeu no time para a rodada
      setImmediate(() => nsp.to(room.code).emit("state", publicState(room)));
      return null;
    }));
    socket.on("modo", (d = {}, cb) => comClube(cb, (v) => { const m = Math.round(Number(d.modo)); v.modo = m >= 1 && m <= 3 ? m : 1; }));
    socket.on("vender", (d = {}, cb) => comClube(cb, (v, room) => semRodada(room) || (room.leilao && room.leilao.jogador === String(d.jogador) ? "Ele está em leilão agora." : Carreira.venderAcao(v, d))));
    // trocas entre técnicos: sem limite de nota nem de janela. A proposta fica aberta até o outro responder (ou quem propôs cancelar).
    const lista = (x) => (Array.isArray(x) ? [...new Set(x.map(String))] : []);
    socket.on("trocaPropor", (d = {}, cb) => {
      const { room, me } = minha();
      if (!room || !me || me.dispensado || room.fase !== "carreira" || !me.clube) return falha(cb, "A carreira desta sala ainda não começou.");
      const espera = semRodada(room); if (espera) return falha(cb, espera);
      const t = { id: Math.random().toString(36).slice(2, 9), de: me.clube, para: String(d.para || ""), dou: lista(d.dou), recebo: lista(d.recebo), dinheiro: Math.round(Number(d.dinheiro) || 0), t: Date.now(), estado: "aberta" };
      const erro = Carreira.erroDeTroca(room.save, t); if (erro) return falha(cb, erro);
      if (room.leilao && [...t.dou, ...t.recebo].includes(room.leilao.jogador)) return falha(cb, "Um dos jogadores está em leilão agora.");
      if ((room.trocas || []).filter((x) => x.estado === "aberta" && x.de === me.clube).length >= 5) return falha(cb, "Você já tem 5 propostas abertas: cancele alguma.");
      room.trocas = [t, ...(room.trocas || [])].slice(0, 40);
      guardar(room); broadcast(room);
      ok(cb, { estado: estadoDe(room, me) });
    });
    socket.on("trocaResponder", (d = {}, cb) => {
      const { room, me } = minha();
      if (!room || !me || me.dispensado || room.fase !== "carreira" || !me.clube) return falha(cb, "A carreira desta sala ainda não começou.");
      const t = (room.trocas || []).find((x) => x.id === String(d.id || ""));
      if (!t || t.estado !== "aberta") return falha(cb, "Essa proposta não está mais aberta.");
      if (d.acao === "cancelar") { if (t.de !== me.clube) return falha(cb, "Só quem propôs cancela."); t.estado = "cancelada"; }
      else if (d.acao === "recusar") { if (t.para !== me.clube) return falha(cb, "A proposta não é para você."); t.estado = "recusada"; }
      else if (d.acao === "aceitar") {
        if (t.para !== me.clube) return falha(cb, "A proposta não é para você.");
        const espera = semRodada(room); if (espera) return falha(cb, espera);
        if (room.leilao && [...t.dou, ...t.recebo].includes(room.leilao.jogador)) return falha(cb, "Um dos jogadores está em leilão agora.");
        const erro = Carreira.erroDeTroca(room.save, t); if (erro) { t.estado = "invalida"; guardar(room); broadcast(room); return falha(cb, erro); }
        Carreira.executarTroca(room.save, t); t.estado = "aceita";
        for (const x of room.trocas) if (x.estado === "aberta" && Carreira.erroDeTroca(room.save, x)) x.estado = "invalida"; // as outras que dependiam deles
      } else return falha(cb, "Ação desconhecida.");
      guardar(room); broadcast(room);
      ok(cb, { estado: estadoDe(room, me) });
    });
    socket.on("evento", (d = {}, cb) => comClube(cb, (v) => Carreira.eventoAcao(v, d)));
    socket.on("olheiro", (d, cb) => comClube(cb, (v) => ({ sugestoes: Carreira.olheiro(v) })));
    // a decisão do jogo ao vivo (a parada do seu jogo)
    socket.on("decidir", (d = {}, cb) => {
      const { room, me } = minha();
      if (!room || !me || !room.rodada) return falha(cb, "Nenhuma partida em andamento.");
      if (me.dispensado) return falha(cb, "O anfitrião dispensou você da sala.");
      const erro = Rd.decidir(room.save, room.rodada, me.clube, String(d.id || ""), d.resposta, Date.now());
      if (erro) return falha(cb, erro);
      guardar(room);
      ok(cb, { rodada: Rd.visao(room.save, room.rodada, me.clube, Date.now()) });
      mandarRodada(room);
    });
    // na carreira em grupo, quem começa a rodada é o anfitrião, e a compra é por leilão
    socket.on("jogar", (d, cb) => falha(cb, "Na carreira em grupo, quem começa a rodada é o anfitrião."));
    socket.on("proposta", (d, cb) => falha(cb, "Na carreira em grupo, a compra é por leilão: abra o leilão do jogador."));
    socket.on("novaTemporada", (d, cb) => falha(cb, "Quem começa a temporada é o anfitrião."));

    socket.on("disconnect", () => {
      const { room, me } = minha();
      if (me) { me.sockets.delete(socket.id); if (!me.sockets.size) me.saiuEm = Date.now(); }
      if (room) broadcast(room);
    });
  });
};
module.exports.HORAS_PARADA = HORAS_PARADA;
