// Rumi da Galera — o jogo de peças numeradas clássico, de 2 a 4 (com robôs, se quiser). Canal "/rumi" do Socket.io.
// As regras ficam em public/rumi/regras.js (o navegador usa as mesmas para mostrar se a mesa está valendo).
// Cada jogador recebe só as próprias peças; dos outros, só quantas têm. Na sua vez, o navegador manda o "rascunho"
// da mesa enquanto você mexe (todo mundo vê ao vivo) e, no fim, a mesa proposta: o servidor confere e aplica.
const R = require("./public/rumi/regras.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js");
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const MAX = 4, PAUSA_RODADA = 9000, ROBO_MS = [1400, 2600];
const NOMES_ROBO = ["Robozão", "Tchuco", "Parafuso"];
const AVATARES = ["🦊", "🐸", "🐼", "🐯", "🦁", "🐵", "🐧", "🦉"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = function attachRumi(io) {
  const nsp = io.of("/rumi");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({
    tempo: [0, 60, 90, 120].includes(int(c.tempo, 60)) ? int(c.tempo, 60) : 60, // segundos por vez (0: sem limite)
    rodadas: [1, 3, 5].includes(int(c.rodadas, 3)) ? int(c.rodadas, 3) : 3,
    robos: Math.max(0, Math.min(3, int(c.robos, 0))),
  });
  const nome = (room, id) => (room.players[id] ? room.players[id].name : "?");
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 60) room.log.splice(0, room.log.length - 60); }
  const pecas = (room, ids) => ids.map((id) => room.P[id]);

  function publicState(room) {
    const r = room.r;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config,
      players: room.order.map((id) => { const p = room.players[id]; return { id, name: p.name, avatar: p.avatar, bot: !!p.bot, online: !!p.bot || p.sockets.size > 0, n: r ? r.maos[id].length : 0, abriu: r ? !!r.abriu[id] : false, total: room.placar[id] || 0 }; }),
      rodada: r ? {
        no: r.no, vez: room.phase === "jogando" ? room.order[r.vez] : null, monte: r.monte.length,
        mesa: r.mesa.map((g) => pecas(room, g)), rascunho: r.rascunho ? r.rascunho.map((g) => pecas(room, g)) : null,
        ultima: r.ultima || null, fim: r.fim || null, revela: room.phase !== "jogando" ? Object.fromEntries(room.order.map((id) => [id, pecas(room, r.maos[id])])) : null,
      } : null,
      prazo: room.prazo ? { quem: room.prazo.quem, ate: room.prazo.ate, total: room.prazo.total } : null,
      proxAte: room.proxAte || null, vencedor: room.vencedor || null, log: room.log.slice(-30), now: Date.now(),
    };
  }
  function broadcast(room) {
    armarVez(room);
    room.t = Date.now();
    const pub = publicState(room), r = room.r;
    for (const s of nsp.sockets.values()) {
      if (s.data.code !== room.code) continue;
      const pid = s.data.pid;
      s.emit("state", pid && r && r.maos[pid] ? { ...pub, minhaMao: pecas(room, r.maos[pid]) } : pub);
    }
  }

  // ---------- rodada ----------
  function comecar(room) {
    // os robôs entram como jogadores de verdade (sem socket) e saem quando a sala volta para o lobby
    for (const id of room.order.filter((x) => room.players[x].bot)) delete room.players[id];
    room.order = room.order.filter((id) => room.players[id]);
    for (let i = 0; i < room.config.robos && room.order.length < MAX; i++) {
      const id = "robo" + i; room.players[id] = { id, name: "🤖 " + NOMES_ROBO[i], avatar: "🤖", bot: true, sockets: new Set() }; room.order.push(id);
    }
    room.placar = Object.fromEntries(room.order.map((id) => [id, 0])); room.vencedor = null;
    room.r = null; novaRodada(room, Math.floor(Math.random() * room.order.length));
  }
  function novaRodada(room, quemComeca) {
    const todas = R.novoJogo(); room.P = Object.fromEntries(todas.map((t) => [t.id, t]));
    const monte = embaralhar(todas.map((t) => t.id)), maos = {}, abriu = {};
    for (const id of room.order) { maos[id] = monte.splice(0, R.MAO_INICIAL); abriu[id] = false; }
    room.r = { no: (room.r ? room.r.no : 0) + 1, monte, maos, abriu, mesa: [], rascunho: null, vez: quemComeca, comecou: quemComeca, passes: 0 };
    room.phase = "jogando"; room.proxAte = null;
    log(room, `🀄 Rodada ${room.r.no}: ${nome(room, room.order[quemComeca])} começa.`);
  }
  function proximo(room) { const r = room.r; r.rascunho = null; r.vez = (r.vez + 1) % room.order.length; }
  // fim da rodada: quem bateu ganha a soma do que ficou na mão dos outros; os outros perdem o que ficou na mão.
  // Monte acabou e ninguém consegue jogar (uma volta inteira só passando): ganha quem tem menos pontos na mão.
  function fimRodada(room, quem, como) {
    const r = room.r, soma = Object.fromEntries(room.order.map((id) => [id, R.somaMao(r.maos[id], room.P)]));
    const ganhou = quem || room.order.slice().sort((a, b) => soma[a] - soma[b])[0];
    const pts = {}; let total = 0;
    for (const id of room.order) if (id !== ganhou) { const v = como === "bateu" ? soma[id] : soma[id] - soma[ganhou]; pts[id] = -v; total += v; }
    pts[ganhou] = total;
    for (const id of room.order) room.placar[id] += pts[id];
    r.fim = { quem: ganhou, como, pts };
    log(room, como === "bateu" ? `🏆 ${nome(room, ganhou)} bateu e ganhou ${total} pontos.` : `🧱 Acabou o monte: ${nome(room, ganhou)} tinha menos pontos na mão (+${total}).`);
    clearTimeout(room.turnTimer); room.prazo = null;
    if (r.no >= room.config.rodadas) {
      room.phase = "fim"; room.vencedor = room.order.slice().sort((a, b) => room.placar[b] - room.placar[a])[0];
      noite.vitoria("rumi", room.code, nomesDe(room, [room.vencedor]), nomesDe(room, room.order.filter((id) => id !== room.vencedor)));
      log(room, `👑 ${nome(room, room.vencedor)} venceu o jogo com ${room.placar[room.vencedor]} pontos.`);
      return;
    }
    room.phase = "intervalo"; room.proxAte = Date.now() + PAUSA_RODADA;
    clearTimeout(room.proxTimer);
    room.proxTimer = setTimeout(() => { if (room.phase !== "intervalo") return; novaRodada(room, (r.comecou + 1) % room.order.length); broadcast(room); }, PAUSA_RODADA);
  }
  // compra uma peça e passa a vez (por vontade, porque o tempo acabou ou porque o robô não tem jogada)
  function comprar(room, pid, porque) {
    const r = room.r;
    if (r.monte.length) { r.maos[pid].push(r.monte.pop()); r.passes = 0; }
    else r.passes++;
    r.ultima = { quem: pid, tipo: "comprou", porque };
    if (porque === "tempo") log(room, `⏱️ ${nome(room, pid)} demorou: a mesa voltou e ${r.monte.length || r.passes ? "comprou uma peça" : "passou"}.`);
    if (!r.monte.length && r.passes >= room.order.length) return fimRodada(room, null, "monte");
    proximo(room);
  }
  // aplica uma jogada já conferida
  function jogar(room, pid, mesa, usadas) {
    const r = room.r;
    r.mesa = mesa.map((g) => R.avaliar(pecas(room, g)).ordem.map((t) => t.id)); // guarda cada combinação já na ordem de mostrar
    r.maos[pid] = r.maos[pid].filter((id) => !usadas.includes(id));
    const primeira = !r.abriu[pid]; r.abriu[pid] = true; r.passes = 0;
    r.ultima = { quem: pid, tipo: "jogou", n: usadas.length, primeira };
    log(room, `${primeira ? "🎉 " : ""}${nome(room, pid)} ${primeira ? "abriu o jogo e " : ""}baixou ${usadas.length} peça${usadas.length > 1 ? "s" : ""}.`);
    if (!r.maos[pid].length) return fimRodada(room, pid, "bateu");
    proximo(room);
  }

  // ---------- relógio da vez e os robôs ----------
  function armarVez(room) {
    const r = room.r;
    if (room.phase !== "jogando" || !r) { clearTimeout(room.turnTimer); room.prazo = null; return; }
    const quem = room.order[r.vez], chave = `${r.no}|${r.mesa.length}|${quem}|${r.monte.length}|${r.maos[quem].length}`;
    if (room.prazo && room.prazo.chave === chave) return;
    clearTimeout(room.turnTimer);
    const p = room.players[quem];
    if (p.bot) {
      room.prazo = { chave, quem, ate: null, total: 0 };
      room.turnTimer = setTimeout(() => {
        if (room.phase !== "jogando" || room.order[room.r.vez] !== quem) return;
        const nova = R.jogadaRobo(r.mesa, r.maos[quem], r.abriu[quem], room.P);
        if (nova) { const c = R.conferir(r.mesa, r.maos[quem], nova, r.abriu[quem], room.P); if (c.ok) jogar(room, quem, nova, c.usadas); else comprar(room, quem, "robo"); }
        else comprar(room, quem, "robo");
        broadcast(room);
      }, ROBO_MS[0] + Math.random() * (ROBO_MS[1] - ROBO_MS[0]));
      return;
    }
    const ms = room.config.tempo * 1000 + (p.sockets.size ? 0 : 0);
    if (!ms) { room.prazo = { chave, quem, ate: null, total: 0 }; return; }
    room.prazo = { chave, quem, ate: Date.now() + ms, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "jogando" || room.order[room.r.vez] !== quem) return;
      comprar(room, quem, "tempo"); broadcast(room);
    }, ms);
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const id = rid(6), usados = new Set(room.order.map((x) => room.players[x].avatar));
      room.players[id] = { id, token: rid(12), name, avatar: AVATARES.find((a) => !usados.has(a)) || "🙂", sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }
    const humanos = (room) => room.order.filter((id) => !room.players[id].bot).length;

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], placar: {}, r: null, log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name); room.host = p.id; bind(room, p.id);
      log(room, `Mesa aberta por ${name}.`);
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
      if (room.phase !== "lobby") return fail(cb, "O jogo já começou. Entre para assistir e jogue a próxima.");
      if (humanos(room) >= MAX) return fail(cb, "A mesa está cheia (4 jogadores). Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name); bind(room, p.id);
      room.config.robos = Math.min(room.config.robos, MAX - humanos(room));
      log(room, `${name} sentou na mesa.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });
    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, r = room.r, minhaVez = me && room.phase === "jogando" && r && room.order[r.vez] === me.id;
      const err = (() => {
        if (type === "config") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador muda, antes de começar.";
          room.config = cleanConfig(data.config); room.config.robos = Math.min(room.config.robos, MAX - humanos(room)); return;
        }
        if (type === "kick") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id); log(room, `${p.name} saiu da mesa.`); return;
        }
        if (type === "start") {
          if (!isHost || room.phase === "jogando") return "Só o organizador começa.";
          if (humanos(room) + room.config.robos < 2) return "Precisa de pelo menos 2 jogadores (chame alguém ou coloque robôs).";
          comecar(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearTimeout(room.turnTimer); clearTimeout(room.proxTimer);
          for (const id of room.order.filter((x) => room.players[x].bot)) delete room.players[id];
          room.order = room.order.filter((id) => room.players[id]);
          room.phase = "lobby"; room.r = null; room.prazo = null; room.proxAte = null; room.vencedor = null; return;
        }
        if (type === "jogar") { // a mesa proposta: [[id]]
          if (!minhaVez) return "Não é a sua vez.";
          const mesa = Array.isArray(data.mesa) ? data.mesa.filter((g) => Array.isArray(g) && g.length).map((g) => g.map((x) => int(x, -1))) : null;
          if (!mesa) return "Jogada inválida.";
          const c = R.conferir(r.mesa, r.maos[me.id], mesa, r.abriu[me.id], room.P);
          if (!c.ok) return "Não vale: " + c.motivo + ".";
          jogar(room, me.id, mesa, c.usadas); return;
        }
        if (type === "comprar") { if (!minhaVez) return "Não é a sua vez."; comprar(room, me.id, "vontade"); return; }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });
    // enquanto mexe na mesa: todo mundo vê ao vivo (não vale nada até confirmar; o servidor só confere o formato)
    socket.on("rascunho", (d = {}) => {
      const { room, me } = ctx(), r = room && room.r;
      if (!r || room.phase !== "jogando" || !me || room.order[r.vez] !== me.id) return;
      const mesa = Array.isArray(d.mesa) ? d.mesa.filter((g) => Array.isArray(g)).map((g) => g.map((x) => int(x, -1)).filter((id) => room.P[id])) : null;
      if (!mesa) return;
      const permitidas = new Set([...r.mesa.flat(), ...r.maos[me.id]]);
      r.rascunho = mesa.map((g) => g.filter((id) => permitidas.has(id))).filter((g) => g.length);
      const naMesa = new Set(r.rascunho.flat()), pegando = Array.isArray(d.pegando) ? d.pegando.map((x) => int(x, -1)).filter((id) => naMesa.has(id)).slice(0, 40) : []; // peças da mesa que ele escolheu (as da mão não: segredo)
      const pub = publicState(room);
      nsp.to(room.code).emit("rascunho", { quem: me.id, mesa: pub.rodada.rascunho, pegando });
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  limparSalasParadas(rooms, { horas: 6, intervalo: 60000, aoApagar: (r) => { clearTimeout(r.turnTimer); clearTimeout(r.proxTimer); } });
};
