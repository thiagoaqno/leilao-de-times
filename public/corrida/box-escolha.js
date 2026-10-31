// Corrida da Galera — as decisões de teclado do box, puras e testáveis (mfd.js e controles.js só as aplicam).
//
// O bug "B e depois 4 só põe o macio (ou o médio)": o 4 pedia a chuva, mas o B apertado de novo (hábito de "confirmar") CANCELAVA o pedido e, no
// aperto seguinte, pedia o `proximo()`, que com stop-and-go pendente é o pneu ATUAL (médio, macio...). Agora, com o pedido feito, o B não cancela nem troca
// o composto (só mostra o pedido); cancelar é do Backspace, do mesmo número ou da linha "Pedir box" do MFD; e o padrão de B, B com stop-and-go
// pendente só fica no pneu atual se ele ainda está bom.
(function (root) {

const ORDEM = ["macio", "medio", "duro", "chuva"];
// as ações de tecla do box → composto (1 a 4, na ordem de ORDEM)
const PNEU_DA_ACAO = { pneu1: "macio", pneu2: "medio", pneu3: "duro", pneu4: "chuva" };
const compostoDaAcao = (id) => PNEU_DA_ACAO[id] || null;

// Os compostos com jogo restante (`jogos`: { macio, medio, duro, chuva })
const disponiveis = (jogos) => ORDEM.filter((c) => !jogos || jogos[c] == null || jogos[c] > 0);

// O composto de B, B (sem número): o que a pessoa já deixou selecionado (`selecionado`); senão o seguinte ao atual na ordem (com jogo). Com stop-and-go
// pendente, o atual (só cumpre o stop-and-go) enquanto o pneu ainda está bom; passou de metade da vida do desgaste, o seguinte (cumpre e troca).
function padraoDoB({ atual, jogos, stopGo, desgaste = 0, selecionado = null }) {
  const op = disponiveis(jogos);
  if (selecionado && op.includes(selecionado)) return selecionado;
  if (stopGo && desgaste < 0.5) return atual;
  const i = ORDEM.indexOf(atual);
  for (let k = 1; k <= 3; k++) { const c = ORDEM[(i + k + 4) % 4]; if (op.includes(c)) return c; }
  return op[0] || atual;
}

// O que o B faz: com o painel do Box fechado ou em outra página, abre na do Box (sem pedir); com ela aberta e sem pedido, pede; com o pedido feito,
// MANTÉM (nunca cancela: era o que desfazia o "4").
const acaoDoB = ({ naPaginaBox, pedido }) => (!naPaginaBox ? "abrir" : pedido ? "manter" : "pedir");

// O que o número faz: pede o composto na hora (escolhe e confirma); o mesmo número do pedido já feito é só confirmação (não cancela); esgotado avisa.
// `soStopGo`: com stop-and-go pendente, o composto atual é permitido mesmo sem jogo (cumpre sem trocar).
function acaoDoDigito({ composto, pedido, jogos, atual, stopGo }) {
  if (!composto || !ORDEM.includes(composto)) return { acao: "nada" };
  const soStopGo = !!stopGo && composto === atual;
  if (!soStopGo && jogos && jogos[composto] != null && jogos[composto] <= 0) return { acao: "esgotado", composto };
  if (pedido === composto) return { acao: "manter", composto };
  return { acao: "pedir", composto };
}

const api = { ORDEM, PNEU_DA_ACAO, compostoDaAcao, disponiveis, padraoDoB, acaoDoB, acaoDoDigito };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.BoxEscolha = api;
})(typeof self !== "undefined" ? self : this);
