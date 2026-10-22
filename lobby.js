// Lobby da Vila — a lista de todas as salas abertas de todos os jogos, para quem está no menu entrar sem digitar código.
// Cada jogo avisa uma vez onde guarda as suas salas (registrar); o canal "/lobby" não mexe nelas, só olha. A cada
// 1,5 s monta a lista e, se mudou, manda para quem está olhando (evento "salas"). Só entram salas com alguém online.
const { JOGOS } = require("./noite.js");

const MESA = ["banco", "uno", "sinuca", "truco", "domino", "bloqueio", "ludo", "botao"]; // o endereço usa ?mesa= em vez de ?sala=
const URLS = { rocket: "/rocket/", carreira: "/carreira/", drag: "/corrida/drag/" };
const registros = new Map(); // jogo -> { rooms, max, jogadores, config }

// opcoes.max: número ou função(sala); opcoes.jogadores(sala): [{ nome, online, host }] quando a sala não é do formato padrão
function registrar(jogo, rooms, opcoes = {}) { registros.set(jogo, { rooms, ...opcoes }); }

const nomeDe = (jogo) => (jogo === "carreira" ? "Carreira em grupo" : JOGOS[jogo] || jogo);
const enderecoDe = (jogo, code) => {
  const base = URLS[jogo] || `/${jogo}/`;
  if (jogo === "carreira") return `${base}?sala=${code}`;
  return `${base}?${MESA.includes(jogo) ? "mesa" : "sala"}=${code}&entrar=1`;
};
const padrao = (r) => r.order.map((id) => r.players[id]).filter(Boolean).map((p) => ({ nome: p.name, online: !!(p.sockets && p.sockets.size), host: false }));
const nomeCartao = (r) => String(r.nome || r.config?.nome || "").slice(0, 24);

function descrever(jogo, reg, r) {
  const gente = (reg.jogadores ? reg.jogadores(r) : padrao(r)).map((p) => ({ ...p, host: p.host || (r.host && r.players?.[r.host]?.name === p.nome) }));
  if (!gente.some((p) => p.online)) return null; // sala abandonada, esperando a faxina
  const max = typeof reg.max === "function" ? reg.max(r) : reg.max || 0;
  const espera = (r.phase || r.fase) === "lobby" || r.fase === "espera";
  return {
    jogo, nome: nomeDe(jogo), code: r.code, url: enderecoDe(jogo, r.code), nomeSala: nomeCartao(r),
    jogadores: gente.map((p) => ({ nome: p.nome, online: p.online, host: !!p.host })), max,
    estado: espera ? (max && gente.length >= max ? "cheia" : "aberta") : "jogando",
    t: r.t || 0,
  };
}

function listar() {
  const out = [];
  for (const [jogo, reg] of registros) {
    for (const r of reg.rooms.values()) {
      try { const d = descrever(jogo, reg, r); if (d) out.push(d); } catch { /* sala com formato estranho: fica de fora */ }
    }
  }
  const peso = { aberta: 0, cheia: 1, jogando: 2 };
  return out.sort((a, b) => peso[a.estado] - peso[b.estado] || b.t - a.t);
}

function attach(io) {
  const nsp = io.of("/lobby");
  let ultima = "[]";
  nsp.on("connection", (socket) => { ultima = JSON.stringify(listar()); socket.emit("salas", JSON.parse(ultima)); });
  setInterval(() => {
    if (!nsp.sockets.size) return;
    const lista = listar(), s = JSON.stringify(lista);
    if (s !== ultima) { ultima = s; nsp.emit("salas", lista); }
  }, 1500).unref?.();
  return nsp;
}

module.exports = { registrar, attach, listar };
