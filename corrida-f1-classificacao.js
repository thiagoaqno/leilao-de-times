// Corrida da Galera — a classificação das regras de F1 (planos/temporada-f1.md): Q1, Q2 e Q3 em voltas lançadas, com o
// relógio da sessão, eliminando os mais lentos; a ordem dos tempos vira o grid da corrida. O servidor manda: quem joga
// corre a volta na própria física (o tempo sai dos setores, como na corrida) e os robôs ganham a volta pela mesma conta
// de `corrida-robos.js` (mesmos pneus), que aparece na tabela ao longo da sessão. As contas puras (as sessões, a
// eliminação, a ordem do grid) ficam em `public/corrida/f1-regras.js`.
const T = require("./public/corrida/pistas.js");
const F1 = require("./public/corrida/f1-regras.js");
const Robos = require("./corrida-robos.js");

const CONTAGEM_MS = 4000, INTERVALO_MS = 9000, GRACA_MS = 30000, SO_ROBOS_MS = 8000;
const humanosAtivos = (room) => room.quali.ativos.map((id) => room.players[id]).filter((p) => p && !p.bot && p.sockets.size);

// A tabela da sessão agora: cada um com o melhor tempo e a hora em que o fez. Os robôs "cruzam a linha" em momentos
// sorteados da sessão (`em`), então a tabela vai se enchendo; `agora = Infinity` mostra todos.
function tabela(room, agora = Date.now()) {
  const q = room.quali;
  return F1.ordenarClassificacao(q.ativos.map((id) => {
    const p = room.players[id];
    if (p && p.bot) { const r = q.robos[id], quando = q.startAt + r.em * q.durMs; return agora >= quando ? { id, tempo: r.tempo, quando } : { id, tempo: null, quando: null }; }
    return { id, tempo: p && p.qMelhor != null ? p.qMelhor : null, quando: p && p.qQuando != null ? p.qQuando : null };
  }));
}
// o que vai no estado público da sala
function publico(room) {
  const q = room.quali; if (!q) return null;
  const nomeDe = (i) => `Q${i + 1}`;
  return { nome: q.nome, i: q.i, total: q.sessoes.length, startAt: q.startAt, fimAt: q.fimAt, pausa: !!q.pausaAte, pausaAte: q.pausaAte, ativos: q.ativos,
    pronto: q.ativos.filter((id) => room.players[id] && room.players[id].qPronto), grid: q.grid,
    tabela: tabela(room).filter((x) => x.tempo != null).map((x) => ({ id: x.id, tempo: x.tempo })),
    fechadas: q.fechadas.map((f, i) => ({ nome: nomeDe(i), ordem: f.ordem.map((x) => ({ id: x.id, tempo: x.tempo })), eliminados: f.eliminados.map((x) => x.id) })) };
}
function cancelar(room) {
  const q = room.quali; if (!q) return;
  clearTimeout(q.fim); clearTimeout(q.corte); clearInterval(q.tique); clearTimeout(q.proxima);
  room.quali = null;
}

// `deps`: { log(room, texto), broadcast(room), largar(room, grid) }. Começa a classificação: os robôs já estão no `room`.
function iniciar(room, deps) {
  cancelar(room);
  const n = room.order.length;
  room.quali = { sessoes: F1.sessoesDeClassificacao(n), i: 0, nome: "Q1", ativos: [], robos: {}, startAt: 0, fimAt: 0, durMs: 0, fechadas: [], grid: null, pausaAte: null };
  room.direcao = null;
  Robos.ritmoDosRobos(room);
  deps.log(room, `⏱️ Classificação: ${room.quali.sessoes.map((k, i) => `Q${i + 1} (${k} carros)`).join(", ")}.`);
  abrirSessao(room, deps);
}
function abrirSessao(room, deps) {
  const q = room.quali; if (!q) return;
  const bots = room.order.filter((id) => room.players[id].bot);
  q.nome = `Q${q.i + 1}`; q.pausaAte = null;
  q.ativos = q.i === 0 ? room.order.slice() : q.fechadas[q.i - 1].passam.map((x) => x.id);
  let g = 0;
  for (const id of q.ativos) {
    const p = room.players[id];
    Object.assign(p, { sector: T.SECTORS - 1, qIni: null, qMelhor: null, qQuando: null, qFim: false, qPronto: false, pos: null });
    if (!p.bot) p.grid = g++; // cada um na sua fila do grid, só para sair de um lugar diferente (na classificação não tem batida)
    else q.robos[id] = Robos.voltaLancada(room, p, q.i, bots.indexOf(id), bots.length);
  }
  const quemJoga = humanosAtivos(room).length > 0;
  q.durMs = quemJoga ? Robos.duracaoDaClassificacao(room.config.pista) * 1000 : SO_ROBOS_MS; // sem ninguém na pista, a sessão só mostra a tabela
  q.startAt = Date.now() + CONTAGEM_MS; q.fimAt = q.startAt + q.durMs;
  room.startAt = q.startAt; room.endAt = null;
  clearInterval(q.tique); q.tique = setInterval(() => deps.broadcast(room), 1000);
  clearTimeout(q.fim); q.fim = setTimeout(() => verificarFim(room, deps), CONTAGEM_MS + q.durMs);
  clearTimeout(q.corte); q.corte = setTimeout(() => fechar(room, deps), CONTAGEM_MS + q.durMs + GRACA_MS); // ninguém segura a sessão
  deps.log(room, `🟢 ${q.nome} aberto: ${q.ativos.length} carros, ${Math.round(q.durMs / 1000)} s.`);
  deps.broadcast(room);
}
// a sessão fecha quando o relógio acabou e todo mundo que joga já cruzou a linha (ou ficou sem volta aberta)
function verificarFim(room, deps) {
  const q = room.quali; if (!q || q.pausaAte) return;
  const agora = Date.now(), humanos = humanosAtivos(room);
  const todosProntos = humanos.length > 0 && humanos.every((p) => p.qPronto);
  if (todosProntos || (agora >= q.fimAt && humanos.every((p) => p.qFim || p.qPronto || p.qIni == null))) return fechar(room, deps);
  if (agora >= q.fimAt) deps.broadcast(room); // bandeirada: quem tem volta aberta ainda pode terminar
}
function fechar(room, deps) {
  const q = room.quali; if (!q || q.pausaAte) return;
  clearTimeout(q.fim); clearTimeout(q.corte); clearInterval(q.tique);
  const ultima = q.i >= q.sessoes.length - 1, nome = (id) => (room.players[id] ? room.players[id].name : "?");
  const f = F1.fecharSessao(tabela(room, Infinity), ultima ? q.ativos.length : q.sessoes[q.i + 1]);
  q.fechadas.push(f);
  q.pausaAte = Date.now() + INTERVALO_MS;
  const tempo = (x) => (x.tempo == null ? "sem tempo" : `${Math.floor(x.tempo / 60)}:${(x.tempo % 60).toFixed(3).padStart(6, "0")}`);
  if (!ultima) deps.log(room, `🔴 ${q.nome} acabou. Eliminados: ${f.eliminados.map((x) => nome(x.id)).join(", ")}.`);
  else {
    q.grid = F1.gridDaClassificacao(q.fechadas);
    deps.log(room, `🏁 ${q.nome} acabou. Pole: ${nome(f.ordem[0].id)} (${tempo(f.ordem[0])}).`);
  }
  deps.broadcast(room);
  q.proxima = setTimeout(() => {
    if (!room.quali) return;
    if (ultima) { const grid = room.quali.grid; deps.largar(room, grid); } else { q.i++; abrirSessao(room, deps); }
  }, INTERVALO_MS);
}
// Um setor novo de quem está na pista (o mesmo caminho da corrida: só vale o próximo, na ordem). Passando pela linha de
// chegada: a primeira vez abre a volta lançada; a seguinte fecha e vale o melhor tempo. Volta rápida demais é atalho.
// Quem cruza a linha depois do fim do relógio termina a sessão (a bandeirada), mas só se a volta já estava aberta.
function aoSetor(room, p, s, quando) { // (`quando`: a hora do passo da física em que o carro cruzou o portão)
  const q = room.quali, agora = quando ?? Date.now();
  if (!q || q.pausaAte || !q.ativos.includes(p.id) || agora < q.startAt || p.qFim) return false;
  if (s !== (p.sector + 1) % T.SECTORS) return false;
  p.sector = s;
  if (s !== 0) return true;
  if (p.qIni == null) { if (agora > q.fimAt) p.qFim = true; else p.qIni = agora; return true; }
  const volta = (agora - p.qIni) / 1000;
  if (volta < T.PISTAS[room.config.pista].minLap) return false; // atalho: não conta, mas o setor segue o do navegador
  if (p.qMelhor == null || volta < p.qMelhor) { p.qMelhor = volta; p.qQuando = agora; }
  if (agora > q.fimAt) p.qFim = true; else p.qIni = agora;
  return true;
}
const pronto = (room, p) => { if (room.quali && room.quali.ativos.includes(p.id)) p.qPronto = true; };

module.exports = { iniciar, publico, tabela, aoSetor, verificarFim, pronto, cancelar, fechar, CONTAGEM_MS, INTERVALO_MS };
