// Temporada solo da F1: contas puras, usadas pelo servidor e pela sede.
(function (root) {
const Pilotos = root.F1Pilotos || require("../f1-pilotos-2026.js");
const Equipes = root.F1Equipes || require("../f1-equipes.js");
const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
// Seleção curta, em ordem do calendário real de 2026, só com pistas presentes no jogo.
const CALENDARIO = [
  ["melbourne", "Austrália"], ["suzuka", "Japão"], ["monaco", "Mônaco"], ["silverstone", "Grã-Bretanha"],
  ["spa", "Bélgica"], ["monza", "Itália"], ["austin", "Estados Unidos"], ["interlagos", "São Paulo"],
];
const ENGENHEIROS = {
  mecanico: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Box experiente", custo: 8, reducao: 0.12 }, { nome: "Box de elite", custo: 18, reducao: 0.24 }],
  estrategista: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Estrategista experiente", custo: 6, reducao: 0.08 }, { nome: "Estrategista de elite", custo: 14, reducao: 0.16 }],
};
const teto = 140;
const inteiro = (n) => Number.isInteger(n) && n >= 0;
function criar(nome, equipe, tamanho = 8, voltas = 3, semente = Date.now()) {
  if (!Pilotos.EQUIPES[equipe] || !Equipes.EQUIPES[equipe]) throw Error("Equipe inválida.");
  if (![4, 8].includes(tamanho) || ![2, 3, 5].includes(voltas)) throw Error("Formato inválido.");
  const titulares = Pilotos.PILOTOS.filter((p) => p.equipe === equipe);
  return { v: 1, nome: String(nome || "").trim().slice(0, 40), equipe, ano: 1, gp: 0, tamanho, voltas, semente,
    montagem: Equipes.montagemPadrao(equipe), bonus: 0, caixa: 42, gasto: 0, patrocinio: 6,
    piloto2: titulares[0].id, engenheiros: { mecanico: 0, estrategista: 0 },
    resultados: [], calendario: (tamanho === 4 ? [CALENDARIO[0], CALENDARIO[2], CALENDARIO[5], CALENDARIO[7]] : CALENDARIO).map(([pista, nomeGP]) => ({ pista, nome: nomeGP })) };
}
function conferirMontagem(s, m) {
  const v = Equipes.validar(s.equipe, m, s.bonus);
  if (!v.ok) throw Error(v.erro);
  return v.montagem;
}
function gastar(s, quantia) {
  if (!inteiro(quantia) || quantia > s.caixa) throw Error("Caixa insuficiente.");
  if (s.gasto + quantia > teto) throw Error(`Teto de gastos de ${teto} milhões atingido nesta temporada.`);
  s.caixa -= quantia; s.gasto += quantia;
}
function contratarPiloto(s, id) {
  if (s.gp >= s.tamanho) throw Error("A temporada terminou.");
  const p = Pilotos.PILOTOS.find((x) => x.id === id);
  if (!p || p.equipe === s.equipe && p.id === Pilotos.PILOTOS.filter((x) => x.equipe === s.equipe)[1].id) throw Error("Piloto indisponível.");
  if (s.piloto2 === id) return s;
  const custo = Math.max(5, Math.round((p.ritmo - 70) * 0.7));
  gastar(s, custo); s.piloto2 = id; return s;
}
function contratarEngenheiro(s, area, nivel) {
  const lista = ENGENHEIROS[area];
  if (!lista || ![0, 1, 2].includes(nivel)) throw Error("Engenheiro inválido.");
  if (nivel <= s.engenheiros[area]) throw Error("Escolha um nível superior.");
  gastar(s, lista[nivel].custo - lista[s.engenheiros[area]].custo);
  s.engenheiros[area] = nivel; return s;
}
function desenvolver(s) {
  if (s.bonus >= 4) throw Error("O carro atingiu o limite de desenvolvimento.");
  gastar(s, 12 + s.bonus * 6); s.bonus++; return s;
}
function pilotosNoGrid(s) {
  const titulares = Pilotos.PILOTOS.filter((p) => p.equipe === s.equipe);
  const companheiro = Pilotos.PILOTOS.find((p) => p.id === s.piloto2);
  const removidos = new Set([titulares[1].id, companheiro.id]);
  const disponiveis = Pilotos.PILOTOS.filter((p) => !removidos.has(p.id) && p.equipe !== s.equipe);
  // 20 carros: humano, companheiro e 18 rivais. O corte é fixo durante o ano.
  const sorteio = ((Number(s.semente) >>> 0) % disponiveis.length);
  const cortados = new Set();
  for (let i = 0; cortados.size < disponiveis.length - 18; i++) {
    const p = disponiveis[(sorteio + i * 7) % disponiveis.length];
    cortados.add(p.id);
  }
  const grid = disponiveis.filter((p) => !cortados.has(p.id));
  return [{ ...companheiro, equipe: s.equipe }, ...grid].slice(0, 19);
}
function registrarResultado(s, linhas) {
  if (s.gp >= s.tamanho) throw Error("A temporada terminou.");
  if (!Array.isArray(linhas) || linhas.length !== 20) throw Error("Resultado incompleto.");
  const ids = new Set(linhas.map((r) => r.piloto));
  const posicoes = new Set(linhas.map((r) => r.pos));
  if (ids.size !== 20 || !ids.has("voce") || posicoes.size !== 20 || linhas.some((r) => !inteiro(r.pos) || r.pos < 1 || r.pos > 20 || r.pontos !== (r.dnf || r.nc ? 0 : PONTOS[r.pos - 1] || 0))) throw Error("Resultado inválido.");
  const gp = s.calendario[s.gp];
  const resultado = { ano: s.ano, gp: s.gp, pista: gp.pista, linhas: linhas.map((r) => ({ piloto: r.piloto, equipe: r.equipe, pos: r.pos, pontos: r.pontos || 0, dnf: !!r.dnf, nc: !!r.nc })) };
  s.resultados.push(resultado); s.gp++;
  const humano = resultado.linhas.find((r) => r.piloto === "voce");
  const premio = 4 + Math.round((humano.pontos || 0) * 0.4);
  const contratado = Pilotos.PILOTOS.find((p) => p.id === s.piloto2);
  const salarios = 3 + Math.round((contratado.ritmo - 70) / 8) + s.engenheiros.mecanico + s.engenheiros.estrategista;
  s.caixa = Math.max(0, s.caixa + s.patrocinio + premio - salarios);
  resultado.financas = { patrocinio: s.patrocinio, premio, salarios };
  return { resultado, receita: s.patrocinio + premio - salarios };
}
function tabelas(s) {
  const pilotos = new Map(), equipes = new Map();
  for (const p of Pilotos.PILOTOS) pilotos.set(p.id, { id: p.id, nome: p.nome, equipe: p.equipe, pontos: 0, vitorias: 0, colocacoes: Array(20).fill(0) });
  if (pilotos.has(s.piloto2)) pilotos.get(s.piloto2).equipe = s.equipe;
  pilotos.set("voce", { id: "voce", nome: s.nome, equipe: s.equipe, pontos: 0, vitorias: 0, colocacoes: Array(20).fill(0) });
  for (const [id, eq] of Object.entries(Pilotos.EQUIPES)) equipes.set(id, { id, nome: eq.nome, pontos: 0, vitorias: 0, colocacoes: Array(20).fill(0) });
  for (const gp of s.resultados.filter((r) => r.ano === s.ano)) for (const r of gp.linhas) {
    const p = pilotos.get(r.piloto); if (!p) continue;
    p.pontos += r.pontos; p.vitorias += r.pos === 1 && !r.nc && !r.dnf ? 1 : 0;
    if (!r.dnf && !r.nc) p.colocacoes[r.pos - 1]++;
    const e = equipes.get(r.equipe); if (e) { e.pontos += r.pontos; e.vitorias += r.pos === 1 && !r.nc && !r.dnf ? 1 : 0; if (!r.dnf && !r.nc) e.colocacoes[r.pos - 1]++; }
  }
  const ordenar = (a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.colocacoes.reduce((d, _, i) => d || b.colocacoes[i] - a.colocacoes[i], 0)
    || Number(b.id === "voce" || b.id === s.equipe) - Number(a.id === "voce" || a.id === s.equipe) || a.nome.localeCompare(b.nome, "pt-BR");
  return { pilotos: [...pilotos.values()].sort(ordenar), equipes: [...equipes.values()].sort(ordenar) };
}
function proximaTemporada(s) {
  if (s.gp !== s.tamanho) throw Error("Termine o calendário primeiro.");
  s.ano++; s.gp = 0; s.gasto = 0; s.semente = Number(s.semente) + 937; return s;
}
const api = { CALENDARIO, PONTOS, ENGENHEIROS, teto, criar, conferirMontagem, contratarPiloto, contratarEngenheiro, desenvolver, pilotosNoGrid, registrarResultado, tabelas, proximaTemporada };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Temporada = api;
})(typeof window !== "undefined" ? window : globalThis);
