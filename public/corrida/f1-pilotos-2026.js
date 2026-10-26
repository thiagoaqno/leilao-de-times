// Corrida da Galera — o grid de Fórmula 1 de 2026 (planos/temporada-f1.md), o mesmo no servidor e no navegador.
// As 11 equipes com a cor oficial, os 22 pilotos titulares com número e um nível de cada um (de 60 a 99, estimado pelo
// que fizeram em 2025; o Thiago revisa a tabela): `ritmo` (quão rápido fecha a volta), `constancia` (quanto o tempo
// varia de uma volta para outra) e `largada` (a reação quando as luzes apagam). Os robôs de `corrida-robos.js` usam
// esses números no lugar dos nomes inventados. Lista conferida na internet em 26/10/2026 (formula1.com, the-race.com).
// O jogo é só para os amigos, então os nomes e as cores são os de verdade (como as marcas de `marcas.js`).
(function (root) {

// `id` é o mesmo de `logos/index.json` e de `equipe` em `MODS.pintura` (pistas.js); `pintura` é a chave dessa pintura.
const EQUIPES = {
  mclaren: { nome: "McLaren", sigla: "MCL", cor: "#ff8000", pintura: "papaia" },
  ferrari: { nome: "Ferrari", sigla: "FER", cor: "#e8002d", pintura: "rosso" },
  mercedes: { nome: "Mercedes", sigla: "MER", cor: "#27f4d2", pintura: "flecha" },
  "red-bull": { nome: "Red Bull", sigla: "RBR", cor: "#3671c6", pintura: "touro" },
  "racing-bulls": { nome: "Racing Bulls", sigla: "RB", cor: "#6692ff", pintura: "racingbulls" },
  "aston-martin": { nome: "Aston Martin", sigla: "AMR", cor: "#229971", pintura: "ingles" },
  williams: { nome: "Williams", sigla: "WIL", cor: "#64c4ff", pintura: "marinho" },
  audi: { nome: "Audi", sigla: "AUD", cor: "#f50537", pintura: "audi" },
  alpine: { nome: "Alpine", sigla: "ALP", cor: "#0093cc", pintura: "frances" },
  haas: { nome: "Haas", sigla: "HAS", cor: "#b6babd", pintura: "classico" },
  cadillac: { nome: "Cadillac", sigla: "CAD", cor: "#c9a227", pintura: "ouro" },
};

// Na ordem das equipes (as mais fortes de 2025 primeiro); cada linha: [id, nome, sigla, número, equipe, ritmo, constância, largada]
const LINHAS = [
  ["norris", "Lando Norris", "NOR", 1, "mclaren", 96, 94, 84], ["piastri", "Oscar Piastri", "PIA", 81, "mclaren", 95, 92, 86],
  ["leclerc", "Charles Leclerc", "LEC", 16, "ferrari", 95, 90, 88], ["hamilton", "Lewis Hamilton", "HAM", 44, "ferrari", 92, 91, 85],
  ["russell", "George Russell", "RUS", 63, "mercedes", 94, 93, 87], ["antonelli", "Kimi Antonelli", "ANT", 12, "mercedes", 91, 84, 88],
  ["verstappen", "Max Verstappen", "VER", 3, "red-bull", 98, 96, 93], ["hadjar", "Isack Hadjar", "HAD", 6, "red-bull", 85, 80, 82],
  ["lawson", "Liam Lawson", "LAW", 30, "racing-bulls", 83, 80, 80], ["lindblad", "Arvid Lindblad", "LIN", 41, "racing-bulls", 79, 74, 76],
  ["alonso", "Fernando Alonso", "ALO", 14, "aston-martin", 91, 92, 90], ["stroll", "Lance Stroll", "STR", 18, "aston-martin", 79, 80, 78],
  ["albon", "Alexander Albon", "ALB", 23, "williams", 88, 89, 84], ["sainz", "Carlos Sainz", "SAI", 55, "williams", 89, 88, 86],
  ["hulkenberg", "Nico Hülkenberg", "HUL", 27, "audi", 86, 87, 84], ["bortoleto", "Gabriel Bortoleto", "BOR", 5, "audi", 82, 78, 80],
  ["gasly", "Pierre Gasly", "GAS", 10, "alpine", 87, 86, 85], ["colapinto", "Franco Colapinto", "COL", 43, "alpine", 79, 74, 78],
  ["ocon", "Esteban Ocon", "OCO", 31, "haas", 83, 84, 82], ["bearman", "Oliver Bearman", "BEA", 87, "haas", 85, 82, 83],
  ["perez", "Sergio Pérez", "PER", 11, "cadillac", 82, 80, 78], ["bottas", "Valtteri Bottas", "BOT", 77, "cadillac", 82, 85, 79],
];
const PILOTOS = LINHAS.map(([id, nome, sigla, numero, equipe, ritmo, constancia, largada]) =>
  ({ id, nome, curto: nome.split(" ")[0][0] + ". " + nome.split(" ").slice(1).join(" "), sigla, numero, equipe, ritmo, constancia, largada }));

// quanto o tempo de volta do piloto muda pelo ritmo: um de 88 é a referência; cada ponto a mais tira 0,2% do tempo
const fatorDeRitmo = (ritmo) => 1 + (88 - ritmo) * 0.002;
// quanto o tempo varia de volta a volta (desvio padrão, em fração do tempo): 95 de constância ≈ 0,35%, 74 ≈ 1,8%
const ruidoDaVolta = (constancia) => (100 - constancia) * 0.0007;
// o tempo de reação na largada, em ms: 93 de largada ≈ 100 ms, 76 ≈ 340 ms
const reacaoNaLargada = (largada) => (100 - largada) * 14;

const gerador = (semente) => { // mulberry32 (a mesma de f1-regras.js `sorteio`), para não depender dele
  let a = 2166136261; for (const c of String(semente)) { a ^= c.charCodeAt(0); a = Math.imul(a, 16777619); } a = (a >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
// `n` pilotos para os robôs (o grid tem 20 carros e os titulares são 22: quem sobra sai pelo sorteio da semente), na
// ordem da tabela. Nunca repete e nunca passa de 22. `ocupadas` ({ equipe: quantos humanos }): cada humano numa equipe
// ocupa o lugar de um dos titulares dela (o segundo da tabela primeiro), que não corre como robô.
function escolher(n, semente = 1, ocupadas = {}) {
  const r = gerador(`pilotos:${semente}`), vagas = { ...ocupadas };
  const disponiveis = PILOTOS.slice().reverse().filter((p) => (vagas[p.equipe] > 0 ? (vagas[p.equipe]--, false) : true)).reverse();
  const resto = disponiveis.slice(), fora = new Set();
  const tira = Math.max(0, disponiveis.length - Math.max(0, Math.min(disponiveis.length, n)));
  while (fora.size < tira) { const k = Math.floor(r() * resto.length); fora.add(resto[k].id); resto.splice(k, 1); }
  return disponiveis.filter((p) => !fora.has(p.id));
}

const api = { EQUIPES, PILOTOS, fatorDeRitmo, ruidoDaVolta, reacaoNaLargada, escolher };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Pilotos = api;
})(typeof window !== "undefined" ? window : globalThis);
