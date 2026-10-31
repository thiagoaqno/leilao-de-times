// Corrida da Galera — a SUGESTÃO DE BOX do MFD (mfd.js mostra o cartão). Só lógica pura, testável em node, sem nada fixo: sai do desgaste e do
// penhasco do pneu, das voltas que faltam, da regra dos dois compostos, do clima (chuva chegando ou parando), do stop-and-go pendente e da janela de
// box que o MFD já estima (hud-mfd.js `janelaDeBox`). `F` é o f1-regras.js (PNEUS, PENHASCO, AVISO_S, vidaEmVoltas).
(function (root) {

const SECOS = ["macio", "medio", "duro"]; // do mais rápido ao mais durável

// O seco que vale para o que falta: o mais rápido que aguenta as voltas que restam; senão o que mais dura. `evitar`: compostos que não servem
// (a regra dos dois compostos exige outro). null se não sobra nenhum jogo.
function escolherSeco({ F, jogos, voltasRestantes, fator = 1, evitar = [] }) {
  const tem = (c) => !jogos || jogos[c] == null || jogos[c] > 0, vida = (c) => F.vidaEmVoltas(c, fator);
  const cands = SECOS.filter((c) => tem(c) && !evitar.includes(c)); if (!cands.length) return null;
  const aguenta = cands.find((c) => vida(c) >= voltasRestantes);
  return aguenta || cands.slice().sort((a, b) => vida(b) - vida(a))[0];
}

// e: { F, pneu: { composto, desgaste }, voltaAtual (a que se corre, 1..N), voltas, jogos ({ macio, medio, duro, chuva: jogos que restam }),
//      compostosUsados (secos diferentes já usados), janela (de janelaDeBox), agua (0..1 na pista), chuva (0..1 agora),
//      mudanca ({ tipo: "comeca"|"para", em: segundos } de F.proximaMudanca), tempoVolta (s), stopGo ({ s, v } do jogador), pedido, emBox, fator }
// Devolve null (nada a sugerir) ou { composto, motivo, razao, urgencia, chave, stopGo }.
function sugerirBox(e) {
  const F = e.F; if (!F || !e.pneu || e.emBox || e.pedido) return null;
  if (e.voltaAtual >= e.voltas - 1) return null; // a última volta não tem box
  const restam = e.voltas - e.voltaAtual, atual = e.pneu.composto, jogos = e.jogos || {}, seco = atual !== "chuva";
  const agua = e.agua || 0, molhado = (e.chuva || 0) > 0.05 || agua > 0.3, temChuva = jogos.chuva == null || jogos.chuva > 0;
  const mud = e.mudanca, iminente = !!mud && mud.em <= Math.max(F.AVISO_S || 40, e.tempoVolta || 0);
  const mk = (composto, motivo, razao, urgencia) => (composto ? { composto, motivo, razao, urgencia, chave: razao + ":" + composto, stopGo: !!e.stopGo } : null);
  const usados = SECOS.filter((c) => jogos[c] != null && jogos[c] < (F.JOGOS_POR_COMPOSTO || 2));
  const obrigatoria = !!(e.janela && e.janela.precisa && e.janela.obrigatoria && (e.compostosUsados || 0) < 2 && !molhado);
  const seu = (evitar) => escolherSeco({ F, jogos, voltasRestantes: restam, fator: e.fator, evitar });

  // 1) o clima manda: chuva chegando ou pista molhada com pneu seco; pista secando com pneu de chuva
  if (seco && temChuva && ((molhado && agua > 0.3) || (iminente && mud.tipo === "comeca"))) return mk("chuva", molhado ? "pista molhada" : "chuva chegando", "chuva", 3);
  if (!seco && !molhado && agua < 0.15 && !(iminente && mud && mud.tipo === "comeca")) return mk(seu([]), "pista secando", "seca", 3);
  if (!seco && iminente && mud && mud.tipo === "para" && agua < 0.5) return mk(seu([]), "chuva parando", "seca", 2);
  if (!seco) return null; // com o pneu de chuva e pista molhada fica

  // 2) o pneu passou do penhasco
  if (e.pneu.desgaste > F.PENHASCO) return mk(seu(obrigatoria ? usados : []) || seu([]), "pneu no fim", "pneu", 3);
  // 3) a uma volta (ou dentro) da janela ideal
  const j = e.janela;
  if (j && j.precisa && e.voltaAtual >= j.abre - 1) {
    if (obrigatoria) return mk(seu(usados) || seu([]), "falta o 2º composto", "dois", 2);
    return mk(seu([atual]) || seu([]), "pneu gasto, janela de box", "pneu", 2);
  }
  // 4) stop-and-go pendente perto do prazo: cumpre na mesma parada (o pneu atual só se ainda está bom)
  if (e.stopGo && e.stopGo.v != null && e.stopGo.v <= 1) return mk(e.pneu.desgaste < 0.5 ? atual : seu([]), "stop-and-go no prazo", "stopgo", 3);
  return null;
}

// Quando mostrar: a sugestão dura `duracao` ms; se ninguém confirma, some e só volta se a situação muda (outra chave) ou depois de uma volta.
// est: estado guardado entre chamadas ({ ativa: { chave, desde }, recusas: { chave: volta } }); devolve { est, mostrar, restante (ms), sug }.
function gerirSugestao(est, sug, { agora, volta }, duracao = 10000) {
  const e = { ativa: est && est.ativa ? est.ativa : null, recusas: { ...((est && est.recusas) || {}) } };
  if (!sug) { if (e.ativa) { e.recusas[e.ativa.chave] = volta; e.ativa = null; } return { est: e, mostrar: false, restante: 0, sug: null }; }
  if (e.ativa && e.ativa.chave !== sug.chave) { e.recusas[e.ativa.chave] = volta; e.ativa = null; } // a situação mudou: a antiga sai
  if (e.ativa) {
    const resta = duracao - (agora - e.ativa.desde);
    if (resta <= 0) { e.recusas[sug.chave] = volta; e.ativa = null; return { est: e, mostrar: false, restante: 0, sug }; }
    return { est: e, mostrar: true, restante: resta, sug };
  }
  const r = e.recusas[sug.chave];
  if (r != null && volta <= r) return { est: e, mostrar: false, restante: 0, sug }; // já foi mostrada nesta volta: sem spam
  e.ativa = { chave: sug.chave, desde: agora };
  return { est: e, mostrar: true, restante: duracao, sug };
}

const api = { sugerirBox, gerirSugestao, escolherSeco };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.EstrategiaBox = api;
})(typeof self !== "undefined" ? self : this);
