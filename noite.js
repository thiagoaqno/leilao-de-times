// Noite da Galera — o que liga os jogos numa mesma noite. Canal "/noite" do Socket.io.
// Quem está numa sala de qualquer jogo entra na "noite" daquela sala (a primeira pessoa cria; quem chega depois cai
// na mesma). Na noite:
//   - "Bora de outro jogo": alguém chama (ex.: Uno), o navegador dele abre uma sala nova lá e, assim que ela existe,
//     todo mundo da noite recebe o destino e vai junto, entrando com o próprio nome (sem digitar código);
//   - o placar da noite: cada jogo avisa aqui quem ganhou e quem perdeu (vitoria()), e a noite soma e dá os títulos
//     (campeão da noite, rei de cada jogo, em chamas, pé-frio).
// Tudo fica na memória do servidor; uma noite parada por 12 horas é apagada.
const { limparNome } = require("./salas.js");

const JOGOS = { leilao: "Leilão", banco: "Banco", uno: "Uno", sinuca: "Sinuca", truco: "Truco", domino: "Dominó", ludo: "Ludo", botao: "Botão",
  corrida: "Corrida", tiro: "Tiro", pelada: "Pelada", rocket: "Rocket", batalha: "Batalha", tenis: "Tênis", rumi: "Rumi", proibida: "Palavra Proibida", pingpong: "Pingue-Pongue", ginasio: "Ginásio" };
const noites = new Map(), porSala = new Map(); // id -> noite; "jogo:CÓDIGO" -> id da noite
const CHAMADO_MS = 90000, PARADA_MS = 12 * 3600 * 1000;
let nsp = null, seq = 0;
const chave = (jogo, sala) => `${jogo}:${String(sala || "").toUpperCase()}`;
const novoId = () => { let id; do id = Math.random().toString(36).slice(2, 8).toUpperCase(); while (noites.has(id)); return id; };

function membro(n, nome) {
  if (!n.membros.has(nome)) n.membros.set(nome, { nome, v: 0, d: 0, seq: 0, porJogo: {} });
  return n.membros.get(nome);
}
// títulos (recalculados a cada resultado): só valem com pelo menos uma partida jogada na noite
function titulos(n) {
  const lista = [...n.membros.values()], t = new Map(lista.map((m) => [m.nome, []]));
  const lider = lista.slice().sort((a, b) => b.v - a.v)[0];
  if (lider && lider.v > 0 && lista.filter((m) => m.v === lider.v).length === 1) t.get(lider.nome).push("👑 Campeão da noite");
  for (const jogo of Object.keys(JOGOS)) {
    const melhor = lista.filter((m) => (m.porJogo[jogo] || 0) >= 2).sort((a, b) => b.porJogo[jogo] - a.porJogo[jogo]);
    if (melhor.length && (melhor.length === 1 || melhor[0].porJogo[jogo] > melhor[1].porJogo[jogo])) t.get(melhor[0].nome).push(`🏅 Rei do ${JOGOS[jogo]}`);
  }
  for (const m of lista) { if (m.seq >= 3) t.get(m.nome).push(`🔥 Em chamas (${m.seq} seguidas)`); if (m.seq <= -3) t.get(m.nome).push(`🧊 Pé-frio (${-m.seq} derrotas seguidas)`); }
  return t;
}
function estado(n) {
  const t = titulos(n);
  return {
    id: n.id, jogos: JOGOS,
    ranking: [...n.membros.values()].sort((a, b) => b.v - a.v || a.d - b.d || a.nome.localeCompare(b.nome)).map((m) => ({ nome: m.nome, v: m.v, d: m.d, titulos: t.get(m.nome) })),
    partidas: n.partidas.slice(-12).reverse(),
    chamado: n.chamado && Date.now() - n.chamado.t < CHAMADO_MS ? { quem: n.chamado.quem, jogo: n.chamado.jogo } : null,
  };
}
const avisar = (n) => nsp && nsp.to("n:" + n.id).emit("noite", estado(n));

// um jogo terminou: ganhadores e perdedores pelos nomes (como aparecem na sala). Sem noite ligada à sala, não faz nada.
const ROBO = (nome) => !nome || /^🤖/u.test(nome);
function vitoria(jogo, sala, ganhadores = [], perdedores = []) {
  if (jogo === "pelada" && !porSala.has(chave("pelada", sala)) && porSala.has(chave("rocket", sala))) jogo = "rocket"; // o Rocket é a mesma sala da Pelada
  const n = noites.get(porSala.get(chave(jogo, sala))); if (!n) return;
  const g = [...new Set(ganhadores.filter((x) => !ROBO(x)))], p = [...new Set(perdedores.filter((x) => !ROBO(x)))].filter((x) => !g.includes(x));
  if (!g.length) return;
  for (const nome of g) { const m = membro(n, nome); m.v++; m.seq = m.seq > 0 ? m.seq + 1 : 1; m.porJogo[jogo] = (m.porJogo[jogo] || 0) + 1; }
  for (const nome of p) { const m = membro(n, nome); m.d++; m.seq = m.seq < 0 ? m.seq - 1 : -1; }
  n.partidas.push({ jogo, nome: JOGOS[jogo] || jogo, ganhadores: g, perdedores: p, t: Date.now() });
  n.t = Date.now();
  if (nsp) nsp.to("n:" + n.id).emit("resultado", { jogo, nome: JOGOS[jogo] || jogo, ganhadores: g });
  avisar(n);
}

function attach(io) {
  nsp = io.of("/noite");
  nsp.on("connection", (socket) => {
    const minha = () => noites.get(socket.data.noite);
    // estou na sala X do jogo Y (e talvez já venha com a noite, quando veio junto de outro jogo)
    socket.on("sala", (d = {}, cb) => {
      const jogo = JOGOS[d.jogo] ? d.jogo : null, nome = limparNome(d.nome);
      if (!jogo || !/^[A-Za-z0-9]{4,6}$/.test(String(d.sala || ""))) return typeof cb === "function" && cb({ ok: false });
      const k = chave(jogo, d.sala);
      let n = noites.get(porSala.get(k)) || (d.noite && noites.get(String(d.noite).toUpperCase()));
      if (!n) { n = { id: novoId(), membros: new Map(), partidas: [], chamado: null, t: Date.now() }; noites.set(n.id, n); }
      porSala.set(k, n.id);
      if (socket.data.noite && socket.data.noite !== n.id) socket.leave("n:" + socket.data.noite);
      socket.data.noite = n.id; socket.data.nome = nome; socket.join("n:" + n.id);
      if (nome) membro(n, nome);
      n.t = Date.now();
      // quem chamou acabou de abrir a sala nova: manda todo mundo da noite para lá
      const c = n.chamado;
      if (c && nome && c.quem === nome && c.jogo === jogo && Date.now() - c.t < CHAMADO_MS) {
        n.chamado = null;
        socket.to("n:" + n.id).emit("destino", { jogo, sala: String(d.sala).toUpperCase(), quem: nome, noite: n.id });
      }
      if (typeof cb === "function") cb({ ok: true, id: n.id });
      avisar(n);
    });
    // "Bora de outro jogo": avisa a galera; o navegador de quem chamou vai abrir a sala nova
    socket.on("chamar", (d = {}, cb) => {
      const n = minha(), jogo = JOGOS[d.jogo] ? d.jogo : null;
      if (!n || !jogo || !socket.data.nome) return typeof cb === "function" && cb({ ok: false });
      n.chamado = { quem: socket.data.nome, jogo, t: Date.now() };
      socket.to("n:" + n.id).emit("chamado", { quem: socket.data.nome, jogo, nome: JOGOS[jogo] });
      if (typeof cb === "function") cb({ ok: true, id: n.id });
      avisar(n);
    });
  });
  setInterval(() => { const agora = Date.now(); for (const [id, n] of noites) if (agora - n.t > PARADA_MS) { noites.delete(id); for (const [k, v] of porSala) if (v === id) porSala.delete(k); } }, 600000).unref();
}

module.exports = { attach, vitoria, JOGOS };
