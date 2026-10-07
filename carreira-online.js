// Carreira em grupo — canal "/carreira-online" do Socket.io (planos/carreira-online.md, PR 4: a sala).
// Uma turma joga a mesma carreira: o criador abre a sala com código e vira o anfitrião (escolhe as temporadas, o aporte
// do investidor, as ligas e o ritmo), os amigos entram pelo código e cada um escolhe um clube livre. Quando o
// anfitrião começa, nasce um mundo só (carreira.js, novaCarreiraGrupo) com um clube humano por pessoa; cada um vê a
// sede do seu clube e mexe na escalação. A rodada ao vivo para todos é o PR 5; o mercado disputado, o PR 6.
// - Reconexão: cada pessoa tem um token (fica no navegador em "carreira-online:<CÓDIGO>"; o servidor guarda só o
//   hash). Fechar a aba não tira ninguém da sala.
// - A sala inteira fica no banco (bd.js, tabela carreiras_online): o servidor pode reiniciar no meio da noite. A sala
//   se apaga 24 h depois do último uso.
const crypto = require("crypto");
const bd = require("./bd.js");
const { rid, novoCodigo, limparNome, ok, falha, buscarSala, nomeEmUso, limparSalasParadas } = require("./salas.js");
const Carreira = require("./carreira.js").grupo;

const MAX_PESSOAS = 8;
const APORTES = [0, 250e6, 500e6, 1e9];
const OPCOES_PADRAO = { temporadas: 2, aporte: 1e9, ligas: "mundo", ritmo: "normal" };
const HORAS_PARADA = 24;
const hash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

// as opções do anfitrião, sempre dentro do permitido
function limparOpcoes(atual, d = {}) {
  const o = { ...atual };
  if (d.temporadas != null) { const n = Math.round(Number(d.temporadas)); if (n >= 1 && n <= 5) o.temporadas = n; }
  if (d.aporte != null && APORTES.includes(Number(d.aporte))) o.aporte = Number(d.aporte);
  if (d.ligas === "brasil" || d.ligas === "mundo") o.ligas = d.ligas;
  if (d.ritmo === "normal" || d.ritmo === "turbo") o.ritmo = d.ritmo;
  return o;
}

module.exports = function ligarCarreiraOnline(io) {
  const nsp = io.of("/carreira-online");
  const rooms = new Map();

  // ---------- o banco: guardar e carregar as salas ----------
  const paraGuardar = (room) => ({ code: room.code, host: room.host, fase: room.fase, opcoes: room.opcoes, order: room.order, save: room.save, t: room.t,
    players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { id, name: p.name, skin: p.skin, clube: p.clube, tokenHash: p.tokenHash }])) });
  function guardar(room) { room.t = Date.now(); try { bd.salvarSalaCarreira(room.code, paraGuardar(room)); } catch (e) { console.warn("carreira-online: não salvou a sala", room.code, e.message); } }
  try {
    for (const { codigo, dados, atualizadaEm } of bd.salasCarreira()) {
      if (Date.now() - atualizadaEm > HORAS_PARADA * 3600e3) { bd.apagarSalaCarreira(codigo); continue; }
      const players = Object.fromEntries(Object.entries(dados.players || {}).map(([id, p]) => [id, { ...p, sockets: new Set() }]));
      rooms.set(codigo, { ...dados, code: codigo, players, t: atualizadaEm });
    }
  } catch (e) { console.warn("carreira-online: o banco não abriu; as salas ficam só na memória.", e.message); }
  limparSalasParadas(rooms, { horas: HORAS_PARADA, aoApagar: (room) => { try { bd.apagarSalaCarreira(room.code); } catch {} } });

  // ---------- o estado ----------
  // o que todo mundo da sala vê: as pessoas (com o clube de cada uma), as opções e a fase
  const publicState = (room) => ({
    code: room.code, fase: room.fase, host: room.host, opcoes: room.opcoes, max: MAX_PESSOAS,
    players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, clube: p.clube || null, online: p.sockets.size > 0, host: id === room.host }; }),
    ocupados: Object.fromEntries(room.order.filter((id) => room.players[id].clube).map((id) => [room.players[id].clube, id])),
    clubes: Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => c.id),
  });
  // a sede de cada pessoa (depois do começo): o estado da carreira visto pelo clube dela
  const estadoDe = (room, p) => (room.save && p.clube && room.save.humanos[p.clube] ? Carreira.estado(Carreira.vistaDe(room.save, p.clube)) : null);
  function broadcast(room) {
    nsp.to(room.code).emit("state", publicState(room));
    if (room.fase !== "carreira") return;
    for (const id of room.order) {
      const p = room.players[id], e = p.sockets.size ? estadoDe(room, p) : null;
      if (e) for (const sid of p.sockets) nsp.to(sid).emit("carreira", e);
    }
  }

  nsp.on("connection", (socket) => {
    const minha = () => { const room = socket.data.code && rooms.get(socket.data.code); return { room, me: room && socket.data.pid ? room.players[socket.data.pid] : null }; };
    function ligar(room, pid) {
      const velho = minha();
      if (velho.me) velho.me.sockets.delete(socket.id);
      if (velho.room) socket.leave(velho.room.code);
      socket.data.code = room.code; socket.data.pid = pid;
      socket.join(room.code);
      if (pid) room.players[pid].sockets.add(socket.id);
    }
    function novaPessoa(room, name, skin) {
      const id = rid(8), token = rid(16);
      room.players[id] = { id, name, skin: String(skin || "").slice(0, 20), clube: null, tokenHash: hash(token), sockets: new Set() };
      room.order.push(id);
      return { id, token };
    }

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
      if (room.fase !== "espera") return falha(cb, "A carreira desta sala já começou. Dá para assistir.");
      if (room.order.length >= MAX_PESSOAS) return falha(cb, `A sala está cheia (${MAX_PESSOAS} técnicos).`);
      const { id, token } = novaPessoa(room, name, d.skin);
      ligar(room, id); guardar(room);
      ok(cb, { code: room.code, id, token });
      broadcast(room);
    });

    // as ações da sala de espera: as opções (só o anfitrião), escolher o clube e começar (só o anfitrião)
    socket.on("act", (d = {}, cb) => {
      const { room, me } = minha();
      if (!room) return falha(cb, "Você não está numa sala.");
      if (!me) return falha(cb, "Quem assiste não mexe na sala.");
      if (d.type === "opcoes") {
        if (me.id !== room.host) return falha(cb, "Só o anfitrião muda as opções.");
        if (room.fase !== "espera") return falha(cb, "A carreira já começou.");
        room.opcoes = limparOpcoes(room.opcoes, d);
        // trocou as ligas: quem estava num clube que saiu da lista volta a escolher
        const pode = new Set(Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => c.id));
        for (const id of room.order) if (room.players[id].clube && !pode.has(room.players[id].clube)) room.players[id].clube = null;
      } else if (d.type === "clube") {
        if (room.fase !== "espera") return falha(cb, "A carreira já começou.");
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
            { temporadas: room.opcoes.temporadas, aporte: room.opcoes.aporte });
        } catch (e) { console.warn("carreira-online: não começou", e); return falha(cb, "Não deu para montar a carreira. Tente de novo."); }
        room.fase = "carreira";
      } else return falha(cb, "Agora não.");
      guardar(room);
      ok(cb);
      broadcast(room);
    });

    // ---------- depois do começo: cada um na sede do seu clube ----------
    // a mesma conversa do canal /carreira (a página é a mesma): a ação devolve o estado do seu clube
    function comClube(cb, acao) {
      const { room, me } = minha();
      if (!room || !me) return falha(cb, "Você não está numa sala.");
      if (room.fase !== "carreira" || !me.clube) return falha(cb, "A carreira desta sala ainda não começou.");
      const v = Carreira.vistaDe(room.save, me.clube);
      Carreira.completar(v);
      const r = acao(v);
      if (typeof r === "string") return falha(cb, r);
      Carreira.guardarVista(room.save, v);
      guardar(room);
      ok(cb, { ...(r || {}), estado: Carreira.estado(Carreira.vistaDe(room.save, me.clube)) });
    }
    socket.on("entrar", (d, cb) => comClube(cb, () => null));
    socket.on("escalacao", (d = {}, cb) => comClube(cb, (v) => Carreira.limparEscalacao(v, d)));
    socket.on("modo", (d = {}, cb) => comClube(cb, (v) => { const m = Math.round(Number(d.modo)); v.modo = m >= 1 && m <= 3 ? m : 1; }));
    // o que ainda vem: a rodada ao vivo para todos e o mercado disputado entre os amigos
    for (const ev of ["jogar", "decidir", "novaTemporada"]) socket.on(ev, (d, cb) => falha(cb, "A rodada ao vivo para a turma toda ainda está chegando. Por enquanto, monte o time e espere o anfitrião."));
    for (const ev of ["proposta", "vender", "evento"]) socket.on(ev, (d, cb) => falha(cb, "O mercado disputado entre os amigos ainda está chegando. Por enquanto, monte o time."));

    socket.on("disconnect", () => {
      const { room, me } = minha();
      if (me) me.sockets.delete(socket.id);
      if (room) broadcast(room);
    });
  });
};
