// Gatinhos Explosivos — as cartas e a montagem do baralho.
// Usado pelo servidor (kittens.js) e pelo navegador (public/kittens/index.html). Arte e textos são nossos.
(function (root) {

// cada tipo: nome, símbolo, quantas no baralho e o que faz (a explicação aparece na tela)
const TIPOS = {
  bomb:    { nome: "Gatinho Explosivo", emoji: "💣", qtd: 0, desc: "Quem compra e não tem Desarmar explode e sai do jogo." },
  defuse:  { nome: "Desarmar", emoji: "🧯", qtd: 0, desc: "Salva você de um Gatinho Explosivo: ele volta para o baralho onde você quiser." },
  nope:    { nome: "Nem Pensar", emoji: "🚫", qtd: 5, desc: "Cancela a jogada de outra pessoa (até outro Nem Pensar). Vale a qualquer hora." },
  attack:  { nome: "Ataque", emoji: "⚔️", qtd: 4, desc: "Encerra a sua vez sem comprar. O próximo joga duas vezes seguidas." },
  skip:    { nome: "Pular", emoji: "⏭️", qtd: 4, desc: "Encerra a sua vez sem comprar carta." },
  favor:   { nome: "Favor", emoji: "🤝", qtd: 4, desc: "Escolha alguém: essa pessoa escolhe uma carta da mão e dá para você." },
  shuffle: { nome: "Embaralhar", emoji: "🔀", qtd: 4, desc: "Embaralha o monte de compra." },
  peek:    { nome: "Espiar o Futuro", emoji: "🔮", qtd: 5, desc: "Só você vê as 3 primeiras cartas do monte." },
  cat1:    { nome: "Gato Pizza", emoji: "🍕", qtd: 4, desc: "Gatos não fazem nada sozinhos: 2 iguais roubam uma carta, 3 iguais pedem uma carta pelo nome." },
  cat2:    { nome: "Gato Abacate", emoji: "🥑", qtd: 4, desc: "Gatos não fazem nada sozinhos: 2 iguais roubam uma carta, 3 iguais pedem uma carta pelo nome." },
  cat3:    { nome: "Gato Meia", emoji: "🧦", qtd: 4, desc: "Gatos não fazem nada sozinhos: 2 iguais roubam uma carta, 3 iguais pedem uma carta pelo nome." },
  cat4:    { nome: "Gato Pipoca", emoji: "🍿", qtd: 4, desc: "Gatos não fazem nada sozinhos: 2 iguais roubam uma carta, 3 iguais pedem uma carta pelo nome." },
  cat5:    { nome: "Gato Rosquinha", emoji: "🍩", qtd: 4, desc: "Gatos não fazem nada sozinhos: 2 iguais roubam uma carta, 3 iguais pedem uma carta pelo nome." },
};
const GATOS = ["cat1", "cat2", "cat3", "cat4", "cat5"];
const ACOES = ["attack", "skip", "favor", "shuffle", "peek"]; // as que se jogam sozinhas
const NOMEAVEIS = Object.keys(TIPOS).filter((t) => t !== "bomb"); // o que dá para pedir com três gatos iguais
const ehGato = (t) => GATOS.includes(t);
const nomeDe = (carta) => (TIPOS[carta.t] ? TIPOS[carta.t].nome : "?");

const MAX_JOGADORES = 5, MAO = 7;

// Monta a mesa para n jogadores: cada um recebe 1 Desarmar + 7 cartas; no monte entram os Desarmar que sobraram
// e n-1 Gatinhos Explosivos. `embaralhar(lista)` embaralha no lugar (o servidor passa o dele).
function montarMesa(n, embaralhar) {
  let id = 0;
  const nova = (t) => ({ id: id++, t });
  const resto = [];
  for (const t of Object.keys(TIPOS)) for (let k = 0; k < TIPOS[t].qtd; k++) resto.push(nova(t));
  embaralhar(resto);
  const maos = [];
  for (let i = 0; i < n; i++) maos.push([nova("defuse"), ...resto.splice(0, MAO)]);
  const sobra = n <= 3 ? 2 : Math.max(1, 6 - n); // Desarmar que ficam no monte
  for (let k = 0; k < sobra; k++) resto.push(nova("defuse"));
  for (let k = 0; k < n - 1; k++) resto.push(nova("bomb"));
  embaralhar(resto);
  return { maos, monte: resto };
}

const api = { TIPOS, GATOS, ACOES, NOMEAVEIS, ehGato, nomeDe, montarMesa, MAX_JOGADORES, MAO, PAWNS: ["😺", "😸", "😼", "🙀", "😻", "😾", "🐱", "🦁", "🐯", "🐆", "🦊", "🐼"] };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Gatinhos = api;
})(typeof window !== "undefined" ? window : globalThis);
