// Uno da Galera — baralho, o que pode ser jogado em cima do quê, e pontos.
// Usado pelo servidor (uno.js) e pelo navegador (public/uno/index.html).
(function (root) {

const COLORS = ["r", "y", "g", "b"];
const COLOR_NAMES = { r: "vermelho", y: "amarelo", g: "verde", b: "azul" };
const COLOR_HEX = { r: "#e53935", y: "#f9b91a", g: "#2fa84f", b: "#1e7fe0", w: "#1d1b22" };

// 108 cartas: por cor, um 0 e dois de cada 1–9, Bloqueio (skip), Inverter (rev) e +2;
// mais 4 Coringas (wild) e 4 Coringas +4.
function newDeck() {
  const d = [];
  let id = 0;
  for (const c of COLORS) {
    d.push({ id: id++, c, v: "0" });
    for (const v of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "rev", "+2"]) {
      d.push({ id: id++, c, v });
      d.push({ id: id++, c, v });
    }
  }
  for (let k = 0; k < 4; k++) { d.push({ id: id++, c: "w", v: "wild" }); d.push({ id: id++, c: "w", v: "+4" }); }
  return d;
}

// Pode jogar `card` em cima de `top`, com a cor da mesa `color`?
// stack: quantas cartas estão acumuladas (regra de acumular +2/+4). Com acúmulo, qualquer +2 ou +4
// passa adiante, inclusive +2 em cima de +4.
function canPlay(card, top, color, stack = 0) {
  if (stack > 0) return card.v === "+4" || card.v === "+2";
  if (card.c === "w") return true;
  return card.c === color || card.v === top.v;
}

// Pontos que a carta vale na mão de quem perdeu a rodada.
const points = (card) => (/^\d$/.test(card.v) ? +card.v : card.c === "w" ? 50 : 20);

const NAMES = { skip: "Bloqueio", rev: "Inverter", "+2": "+2", wild: "Coringa", "+4": "Coringa +4" };
const cardName = (card) => (NAMES[card.v] || card.v) + (card.c === "w" ? "" : " " + COLOR_NAMES[card.c]);

const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🍕"];
const REACTIONS = ["😂", "😡", "🤡", "😭", "🔥", "👏"];

const api = { COLORS, COLOR_NAMES, COLOR_HEX, newDeck, canPlay, points, cardName, PAWNS, REACTIONS };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
