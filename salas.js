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

module.exports = { rid, novoCodigo, limparNome, ok, falha, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing };
