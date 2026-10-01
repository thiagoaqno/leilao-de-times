// Truco da Galera — baralho, força das cartas (com manilha pela vira) e quem leva a mão.
// Usado pelo servidor (truco.js) e pelo navegador (public/truco/index.html).
(function (root) {

// Baralho limpo (40 cartas, sem 8, 9 e 10), do mais fraco para o mais forte.
const RANKS = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
// Naipes na ordem de força das manilhas: ouros < espadas < copas < paus (o zap).
const SUITS = ["o", "e", "c", "p"];
const SUIT_SYM = { o: "♦", e: "♠", c: "♥", p: "♣" };
const SUIT_NAME = { o: "ouros", e: "espadas", c: "copas", p: "paus" };
const MANILHA_NAME = { p: "Zap", c: "Copas", e: "Espadilha", o: "Pica-fumo" };
const RAISE_NAME = { 3: "Truco", 6: "Seis", 9: "Nove", 12: "Doze" };

function newDeck() {
  const d = [];
  let id = 0;
  for (const s of SUITS) for (const r of RANKS) d.push({ id: id++, r, s });
  return d;
}
// A manilha é a carta seguinte à vira (vira 3 → manilha 4).
const manilhaOf = (vira) => RANKS[(RANKS.indexOf(vira.r) + 1) % RANKS.length];
// Força: 0–9 pela ordem normal, 10–13 para as manilhas. Carta coberta (ou nenhuma) = −1.
function power(card, mr) {
  if (!card) return -1;
  if (card.r === mr) return 10 + SUITS.indexOf(card.s);
  return RANKS.indexOf(card.r);
}
const nextValue = (v) => (v === 1 ? 3 : v + 3);
const cardName = (c, mr) => (mr && c.r === mr ? MANILHA_NAME[c.s] : `${c.r}${SUIT_SYM[c.s]}`);

// Quem leva a mão, pelos vencedores das rodadas (0 ou 1 = time, −1 = empatou/cangou).
// Devolve o time, −1 se tudo empatou (ninguém marca), ou null se ainda não decidiu.
function handWinner(r) {
  if (r.length < 2) return null;
  const [a, b, c] = r;
  if (r.length === 2) {
    if (a === -1 && b === -1) return null;
    if (a === -1) return b;   // empatou a primeira: quem fizer a segunda leva
    if (b === -1) return a;   // empatou a segunda: leva quem fez a primeira
    return a === b ? a : null;
  }
  if (c !== -1) return c;
  return a !== -1 ? a : -1;   // empatou a terceira: leva quem fez a primeira
}

const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🍺"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🤥", "🐔", "💀"];
// Sinais para o parceiro, como na mesa de verdade: a mesa toda vê, então também servem para blefar.
const SIGNALS = [
  { k: "zap", e: "😉", t: "Tenho o zap" },
  { k: "copas", e: "🤨", t: "Tenho a copas" },
  { k: "espadilha", e: "😗", t: "Tenho a espadilha" },
  { k: "picafumo", e: "😤", t: "Tenho o pica-fumo" },
  { k: "tres", e: "😬", t: "Tenho três" },
  { k: "dois", e: "✌️", t: "Tenho dois" },
  { k: "nada", e: "🙃", t: "Não tenho nada" },
  { k: "truca", e: "🗣️", t: "Pede truco!" },
  { k: "corre", e: "🏃", t: "Corre!" },
];

const api = { RANKS, SUITS, SUIT_SYM, SUIT_NAME, MANILHA_NAME, RAISE_NAME, newDeck, manilhaOf, power, nextValue, cardName, handWinner, PAWNS, REACTIONS, SIGNALS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.TrucoRegras = api;
})(typeof window !== "undefined" ? window : globalThis);
