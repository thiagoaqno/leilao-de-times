// Dominó da Galera — peças, encaixe nas pontas, tipo de batida e contagem de pontos.
// Usado pelo servidor (domino.js) e pelo navegador (public/domino/index.html).
(function (root) {

// 28 peças, do 0|0 ao 6|6.
function newSet() {
  const s = [];
  let id = 0;
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) s.push({ id: id++, a, b });
  return s;
}
const isDouble = (t) => t.a === t.b;
const pips = (t) => t.a + t.b;
const fits = (t, v) => t.a === v || t.b === v;
// Pontas da mesa: {l, r}, ou null com a mesa vazia.
function ends(chain) {
  if (!chain) return null;
  const L = chain.L, Rr = chain.R;
  return { l: L.length ? L[L.length - 1].b : chain.center.a, r: Rr.length ? Rr[Rr.length - 1].b : chain.center.b };
}
// Em quais pontas a peça entra ("L", "R"). Mesa vazia: entra em qualquer lugar.
function sides(t, e) {
  if (!e) return ["C"];
  const s = [];
  if (fits(t, e.l)) s.push("L");
  if (fits(t, e.r)) s.push("R");
  return s;
}
const canPlay = (hand, e) => hand.some((t) => sides(t, e).length > 0);

// Quanto vale a batida, olhando a última peça e as pontas antes de ela entrar.
// cruzada (carroça que serve nas duas pontas iguais) 4 · lá-e-lô (serve nas duas pontas, diferentes) 3 · carroça 2 · comum 1
function batida(t, e) {
  const both = !!e && fits(t, e.l) && fits(t, e.r);
  if (isDouble(t) && both) return { pts: 4, name: "Cruzada" };
  if (!isDouble(t) && both && e.l !== e.r) return { pts: 3, name: "Lá-e-lô" };
  if (isDouble(t)) return { pts: 2, name: "Carroça" };
  return { pts: 1, name: "Batida" };
}

const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🍻"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🤔", "🐔", "💀"];

const api = { newSet, isDouble, pips, fits, ends, sides, canPlay, batida, PAWNS, REACTIONS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.DominoRegras = api;
})(typeof window !== "undefined" ? window : globalThis);
