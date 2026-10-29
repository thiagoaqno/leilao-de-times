// Temporada solo da F1: contas puras, usadas pelo servidor e pela sede.
(function (root) {
const Pilotos = root.F1Pilotos || require("../f1-pilotos-2026.js");
const Equipes = root.F1Equipes || require("../f1-equipes.js");
const Pecas = root.F1Pecas || require("../f1-pecas.js");
const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
// Seleção curta, em ordem do calendário real de 2026, só com pistas presentes no jogo.
const CALENDARIO = [
  ["melbourne", "Austrália"], ["suzuka", "Japão"], ["bahrein", "Bahrein"], ["jeddah", "Arábia Saudita"], ["montreal", "Canadá"], ["monaco", "Mônaco"], ["barcelona", "Barcelona"],
  ["silverstone", "Grã-Bretanha"], ["spa", "Bélgica"], ["zandvoort", "Holanda"], ["monza", "Itália"], ["austin", "Estados Unidos"], ["interlagos", "São Paulo"],
];
// As pistas "mais trabalhadas" (as que já têm cenário próprio): o sorteio do calendário sai só daqui. Quando uma pista
// ganhar cenário, é só incluir a chave (a mesma de `pistas.js` e do CALENDARIO acima) nesta lista.
const PISTAS_TRABALHADAS = ["interlagos", "monaco", "melbourne", "bahrein", "silverstone", "suzuka", "jeddah", "monza", "spa", "barcelona", "montreal", "zandvoort"];
// mulberry32 sobre o hash do texto (a mesma família de f1-regras.js `sorteio`, sem depender dele aqui)
function gerador(semente) {
  let a = 2166136261; for (const c of String(semente)) { a ^= c.charCodeAt(0); a = Math.imul(a, 16777619); } a = (a >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function embaralhar(lista, r) {
  const v = lista.slice();
  for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
  return v;
}
// Sorteia `tamanho` GPs sem repetir pista, de PISTAS_TRABALHADAS; se o calendário for maior que a lista, completa com as demais
// do CALENDARIO (hoje os tamanhos são 4 e 8, então isso não acontece). Depois põe na ordem do CALENDARIO. `anterior` (as pistas
// da temporada passada) faz o sorteio tentar outro conjunto, quando existe outro. Devolve a semente que valeu, para guardar no estado.
function sortearCalendario(tamanho, semente, anterior = []) {
  const n = Math.min(tamanho, CALENDARIO.length), antes = [...anterior].sort().join();
  const chaves = CALENDARIO.map(([pista]) => pista), boas = PISTAS_TRABALHADAS.filter((k) => chaves.includes(k));
  const resto = chaves.filter((k) => !boas.includes(k));
  let escolha, usada;
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    usada = `calendario:${semente}:${tentativa}`;
    const r = gerador(usada), ordem = [...embaralhar(boas, r), ...embaralhar(resto, r)];
    escolha = ordem.slice(0, n);
    if (escolha.slice().sort().join() !== antes) break;
  }
  return { semente: usada, calendario: CALENDARIO.filter(([pista]) => escolha.includes(pista)).map(([pista, nome]) => ({ pista, nome })) };
}
const ENGENHEIROS = {
  mecanico: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Box experiente", custo: 8, reducao: 0.12 }, { nome: "Box de elite", custo: 18, reducao: 0.24 }],
  estrategista: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Estrategista experiente", custo: 6, reducao: 0.08 }, { nome: "Estrategista de elite", custo: 14, reducao: 0.16 }],
};
const teto = 140;
const inteiro = (n) => Number.isInteger(n) && n >= 0;
const NIVEIS = ["facil", "medio", "dificil"];
function criar(nome, equipe, tamanho = 8, voltas = 3, semente = Date.now(), nivel = "medio") {
  if (!Pilotos.EQUIPES[equipe] || !Equipes.EQUIPES[equipe]) throw Error("Equipe inválida.");
  if (![4, 8].includes(tamanho) || ![2, 3, 5].includes(voltas)) throw Error("Formato inválido.");
  if (!NIVEIS.includes(nivel)) throw Error("Nível dos robôs inválido.");
  const titulares = Pilotos.PILOTOS.filter((p) => p.equipe === equipe);
  const sorteado = sortearCalendario(tamanho, semente);
  return { v: 1, nome: String(nome || "").trim().slice(0, 40), equipe, ano: 1, gp: 0, tamanho, voltas, nivel, semente,
    montagem: Object.fromEntries(Equipes.ORDEM.map((k) => [k, 0])), bonus: 0, caixa: 42, gasto: 0, patrocinio: 6,
    piloto2: titulares[0].id, engenheiros: { mecanico: 0, estrategista: 0 },
    resultados: [], calendario: sorteado.calendario, calendarioSemente: sorteado.semente };
}
// monta o carro: a carreira usa `d.montagem` (pontos livres); `d.pecas` segue aceito em saves antigos.
function aplicarMontagem(s, d) {
  const v = Pecas.resolver(s.equipe, d, s.bonus);
  if (!v.ok) throw Error(v.erro);
  s.montagem = v.montagem; s.pecas = v.pecas; // `pecas` é null quando veio do formato antigo
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
  s.ano++; s.gp = 0; s.gasto = 0; s.semente = Number(s.semente) + 937;
  const sorteado = sortearCalendario(s.tamanho, s.semente, s.calendario.map((g) => g.pista));
  s.calendario = sorteado.calendario; s.calendarioSemente = sorteado.semente; return s;
}
const api = { CALENDARIO, PISTAS_TRABALHADAS, sortearCalendario, PONTOS, ENGENHEIROS, teto, criar, conferirMontagem, aplicarMontagem, contratarPiloto, contratarEngenheiro, desenvolver, pilotosNoGrid, registrarResultado, tabelas, proximaTemporada };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Temporada = api;
})(typeof window !== "undefined" ? window : globalThis);
