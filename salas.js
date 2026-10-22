// Salas dos jogos — as peças que todo canal do Socket.io repetia (código da sala, entrar no canal, nome, respostas
// {ok, error}, reconexão e a faxina das salas paradas). São funções soltas e pequenas, sem classe base: o que muda de
// um jogo para outro (limite de jogadores, times, mensagens, quando dá para entrar) continua no módulo de cada jogo.
const crypto = require("crypto");

const rid = (n = 16) => crypto.randomBytes(n).toString("hex");

// código de 5 letras, sem as que se confundem (I, O, 0 e 1), que ainda não está em uso
function novoCodigo(rooms) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (rooms.has(c));
  return c;
}

// nome de até 8 letras (conta emoji como uma), sem espaço sobrando
const limparNome = (s) => Array.from(String(s || "").trim().replace(/\s+/g, " ")).slice(0, 8).join("").trim();

// respostas dos eventos com callback: {ok: true, ...} ou {ok: false, error}
const ok = (cb, extra = {}) => cb && cb({ ok: true, ...extra });
const falha = (cb, error) => cb && cb({ ok: false, error });

// a sala e o jogador deste socket (me é null para quem só assiste)
function contexto(socket, rooms) {
  const room = socket.data.code && rooms.get(socket.data.code);
  return { room, me: room && socket.data.pid ? room.players[socket.data.pid] : null };
}
// liga o socket à sala (sai da anterior) e guarda o socket no jogador; pid null = só assistir
function ligarSocket(socket, rooms, room, pid) {
  const old = contexto(socket, rooms);
  if (old.me) old.me.sockets.delete(socket.id);
  if (old.room) socket.leave(old.room.code);
  socket.data.code = room.code; socket.data.pid = pid;
  socket.join(room.code);
  if (pid) room.players[pid].sockets.add(socket.id);
}

// a sala do código digitado (aceita minúscula e espaço em volta)
const buscarSala = (rooms, code) => rooms.get(String(code || "").toUpperCase().trim());
// quem está voltando (caiu ou recarregou a página): o id e o token batem com um jogador da sala
const quemVolta = (room, data) => (data.id && room.players[data.id] && room.players[data.id].token === data.token ? room.players[data.id] : null);
// já tem alguém com esse nome (sem diferenciar maiúscula)?
const nomeEmUso = (room, name) => Object.values(room.players).some((p) => p.name.toLowerCase() === name.toLowerCase());

// faxina: de tempos em tempos (a cada hora, por padrão), apaga as salas sem movimento (room.t) há mais de `horas`.
// cadaVolta(room): roda em toda sala a cada passada (ex.: parar o jogo de quem saiu todo mundo);
// aoApagar(room): para os relógios da sala antes de ela sumir.
function limparSalasParadas(rooms, { horas = 12, intervalo = 3600e3, cadaVolta = null, aoApagar = null } = {}) {
  return setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) {
      if (cadaVolta) cadaVolta(r);
      if (now - r.t > horas * 3600e3) { if (aoApagar) aoApagar(r); rooms.delete(code); }
    }
  }, intervalo).unref?.();
}

// ping de cada jogador a cada 2 s (jogos em tempo real): o navegador responde o "png" e a média fica em p.rtt.
// pular(room): salas que não precisam medir agora
function medirPing(nsp, rooms, pular = null) {
  return setInterval(() => {
    for (const room of rooms.values()) {
      if (pular && pular(room)) continue;
      for (const id of room.order) {
        const p = room.players[id];
        for (const sid of p.sockets) {
          const s = nsp.sockets.get(sid); if (!s) continue;
          const t0 = Date.now();
          s.timeout(2000).emit("png", (err) => { if (!err) { const rtt = Date.now() - t0; p.rtt = p.rtt == null ? rtt : p.rtt * 0.6 + rtt * 0.4; } });
        }
      }
    }
  }, 2000).unref?.();
}

// O esqueleto dos jogos de mesa (Uno, Truco, Dominó, Ludo, Bloqueio, Sinuca e Botão), que cada um repetia igual: criar
// a mesa, entrar (voltar com o token, assistir ou sentar), as ações, as reações e a saída. O jogo passa só o que é dele:
//   max: quantos sentam; sala(data): os campos próprios da sala nova; novoJogador(room, nome): cria o jogador e põe na
//   ordem; acao(room, me, data): faz a ação e devolve o erro em texto (ou nada); broadcast(room); log(room, texto);
//   reacoes: os emojis aceitos (sem a lista, a mesa não tem reações); extras(socket, ctx): eventos a mais (a mira da
//   Sinuca, o sinal do Truco); textos: { criou(nome), sentou(nome) } quando a frase do registro é outra.
function ligarMesa(nsp, rooms, j) {
  const criou = (j.textos && j.textos.criou) || ((nome) => `Mesa criada por ${nome}.`);
  const sentou = (j.textos && j.textos.sentou) || ((nome) => `${nome} sentou à mesa.`);
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);

    socket.on("create", (data = {}, cb) => {
      const name = limparNome(data.name);
      if (!name) return falha(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", players: {}, order: [], ...j.sala(data), log: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = j.novoJogador(room, name);
      room.host = p.id;
      bind(room, p.id);
      j.log(room, criou(name));
      ok(cb, { code: room.code, id: p.id, token: p.token });
      j.broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return falha(cb, "Mesa não encontrada. Confira o código (se o servidor reiniciou, a mesa se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return j.broadcast(room); }
      if (data.watch || room.phase !== "lobby") {
        if (!data.watch) return falha(cb, "O jogo já começou. Você pode entrar para assistir.");
        bind(room, null); ok(cb, { code: room.code, id: null }); return j.broadcast(room);
      }
      const name = limparNome(data.name);
      if (!name) return falha(cb, "Coloque o seu nome.");
      if (room.order.length >= j.max) return falha(cb, `A mesa já tem ${j.max} jogadores. Você pode entrar para assistir.`);
      if (nomeEmUso(room, name)) return falha(cb, "Já tem alguém com esse nome na mesa.");
      const p = j.novoJogador(room, name);
      bind(room, p.id);
      j.log(room, sentou(name));
      ok(cb, { code: room.code, id: p.id, token: p.token });
      j.broadcast(room);
    });

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return falha(cb, "Você não está numa mesa.");
      const err = j.acao(room, me, data);
      if (err) return falha(cb, err);
      ok(cb);
      j.broadcast(room);
    });

    // reação com emoji: vai direto para a mesa, sem mexer no estado do jogo
    if (j.reacoes) socket.on("react", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase === "lobby" || !j.reacoes.includes(data.emoji)) return;
      const now = Date.now();
      if (now - (me.lastReact || 0) < 700) return;
      me.lastReact = now;
      nsp.to(room.code).emit("react", { player: me.id, emoji: data.emoji });
    });

    if (j.extras) j.extras(socket, ctx);

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      j.broadcast(room);
    });
  });
}

module.exports = { ligarMesa, rid, novoCodigo, limparNome, ok, falha, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing };
