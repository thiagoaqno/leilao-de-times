// Corrida da Galera — as regras de Fórmula 1 (planos/temporada-f1.md), as mesmas no servidor e no navegador.
// Só contas, sem desenho: liga com `config.regras === "f1"` na sala. Os pneus: três compostos secos, o desgaste e a
// temperatura. A física (fisica.js) multiplica a aderência do carro pela do pneu, e os robôs (corrida-robos.js) usam as
// mesmas funções. E o pit stop: o corredor dos boxes (`corredor`), o tempo da parada (`tempoDeParada`), a regra dos dois
// compostos e a estratégia de parada dos robôs (`estrategia`).
(function (root) {

// Cada composto: a aderência no auge (sobre o grip do carro), quanto da corrida ele dura até o "penhasco" (a fração da
// distância total em que o desgaste chega a PENHASCO) e quão rápido esquenta. As cores são as da Pirelli.
const PNEUS = {
  macio: { nome: "Macio", cor: "#e8202a", pico: 1.06, vida: 0.35, aquece: 1.6 },
  medio: { nome: "Médio", cor: "#ffd100", pico: 1.03, vida: 0.6, aquece: 1.0 },
  duro: { nome: "Duro", cor: "#f4f4f4", pico: 1.0, vida: 0.9, aquece: 0.6 },
};
const COMPOSTO_PADRAO = "medio";
// Até o penhasco o pneu perde pouco (até PERDA_ANTES); depois dele, despenca até PERDA_FIM com o pneu acabado.
const PENHASCO = 0.8, PERDA_ANTES = 0.06, PERDA_FIM = 0.26;
// Pneu frio (saindo do box ou na largada) segura FRIO do normal; fica bom a partir de TEMP_BOA.
const TEMP_SAIDA = 0.6, TEMP_BOA = 0.75, FRIO = 0.92;
const limite = (v, a, b) => Math.max(a, Math.min(b, v));

function pneuNovo(composto = COMPOSTO_PADRAO) {
  return { composto: PNEUS[composto] ? composto : COMPOSTO_PADRAO, desgaste: 0, temp: TEMP_SAIDA };
}
// Um passo do pneu. O desgaste anda pela distância (fração da corrida inteira), então 3 ou 8 voltas gastam a mesma
// fração do pneu: a estratégia é a mesma em qualquer tamanho de corrida. Escorregar gasta mais; andar limpo, um pouco
// menos que o normal. A temperatura vai para um alvo pela velocidade e pelo escorregão, mais rápido no macio.
// d: { dist (andado neste passo), total (a corrida inteira), slip, v, vmax, dt }
function gastarPneu(pneu, d) {
  const pn = PNEUS[pneu.composto] || PNEUS[COMPOSTO_PADRAO];
  const escorrega = limite((d.slip || 0) / 60, 0, 1);
  if (d.total > 0 && d.dist > 0) pneu.desgaste = Math.min(1, pneu.desgaste + (d.dist / d.total) * (PENHASCO / pn.vida) * (0.85 + 0.6 * escorrega));
  const vel = d.vmax > 0 ? limite(Math.abs(d.v || 0) / d.vmax, 0, 1) : 0;
  const alvo = Math.min(1, 0.5 + 0.45 * vel + 0.15 * escorrega);
  pneu.temp += (alvo - pneu.temp) * Math.min(1, (d.dt || 0) * 0.25 * pn.aquece);
  return pneu;
}
// Quanto o pneu segura agora: `grip` multiplica o grip do carro e `kin` o quanto sobra escorregando.
function aderencia(pneu) {
  const pn = PNEUS[pneu && pneu.composto] || PNEUS[COMPOSTO_PADRAO], d = pneu ? pneu.desgaste : 0, temp = pneu ? pneu.temp : TEMP_BOA;
  const perda = d <= PENHASCO ? PERDA_ANTES * d / PENHASCO : PERDA_ANTES + (PERDA_FIM - PERDA_ANTES) * (d - PENHASCO) / (1 - PENHASCO);
  const quente = FRIO + (1 - FRIO) * limite((temp - TEMP_SAIDA) / (TEMP_BOA - TEMP_SAIDA), 0, 1);
  const base = limite(pn.pico * (1 - perda) * quente, 0.7, 1.1);
  return { grip: base, kin: limite(1 - perda * 0.5, 0.85, 1),
    freio: limite(base, 0.72, 1.08), tracao: limite(base * quente, 0.65, 1.08),
    final: limite(1 - Math.max(0, d - PENHASCO) * 0.22, 0.95, 1) };
}
const frio = (pneu) => !!pneu && pneu.temp < TEMP_BOA - 0.02;

// DRS clássico: a elegibilidade é decidida na detecção e vale apenas na zona correspondente.
// Frações de volta atravessam a linha de chegada sem mudar a semântica da zona.
const fracao = (v) => ((v % 1) + 1) % 1;
const naZona = (f, abre, fecha) => abre <= fecha ? f >= abre && f < fecha : f >= abre || f < fecha;
function zonaDRS(progresso, zonas) {
  const f = fracao(progresso);
  return (zonas || []).findIndex(([, abre, fecha]) => naZona(f, abre, fecha));
}
function drsHabilitado({ volta, intervalo, amarela, safety }) {
  return volta >= 2 && intervalo >= 0 && intervalo < 1 && !amarela && !safety;
}

// O teto de recarga vale por volta: frear repõe mais que apenas aliviar o acelerador.
const ERS_MAX_RECARGA = 0.45, ERS_GASTO = 0.28;
const ersNovo = () => ({ carga: 0.65, recarga: 0, volta: 0 });
function carregarErs(ers, dt, freando, semGas, volta) {
  if (volta !== ers.volta) { ers.volta = volta; ers.recarga = 0; }
  const ganho = Math.min(Math.max(0, ERS_MAX_RECARGA - ers.recarga), Math.max(0, dt) * (freando ? 0.18 : semGas ? 0.045 : 0));
  ers.carga = limite(ers.carga + ganho, 0, 1); ers.recarga += ganho;
  return ganho;
}
function gastarErs(ers, dt, ativo) {
  const gasto = ativo ? Math.min(ers.carga, Math.max(0, dt) * ERS_GASTO) : 0;
  ers.carga = limite(ers.carga - gasto, 0, 1);
  return gasto > 0;
}
const usarErsAuto = (carga, velocidade, vmax, reta, perto) => carga > (perto ? 0.12 : 0.38) && velocidade > vmax * 0.35 && (reta || perto);

// ---------- o pit stop ----------
// No corredor dos boxes o carro anda sozinho no limitador (LIMITADOR da velocidade final), para na garagem, troca os
// pneus e volta para a pista. A parada leva PARADA_BASE s mais o erro dos mecânicos (de 0 a PARADA_ERRO s, sorteado
// com a semente do GP: recarregar a página nunca muda o resultado). Quem termina a corrida sem ter usado dois
// compostos leva UM_COMPOSTO s no resultado; passar do limitador leva RAPIDO s.
const LIMITADOR = 0.40, PARADA_BASE = 2.4, PARADA_ERRO = 1.5, UM_COMPOSTO = 10, RAPIDO = 5;
const RAMPA = 14, LARGURA_CORREDOR = 54, FOLGA_CORREDOR = 12, GARAGENS = 10; // duas faixas de 27 unidades; a rampa é em pontos da pista (6 unidades cada)
const hashTexto = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// gerador com semente (mulberry32): a mesma semente dá sempre a mesma sequência
function sorteio(semente) { let a = hashTexto(semente) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// quanto dura a n-ésima parada de `quem` neste GP: a maioria sai limpa, de vez em quando o mecânico erra
function tempoDeParada(semente, quem, n) {
  const r = sorteio(`${semente}:${quem}:${n}`)();
  return Math.round((PARADA_BASE + PARADA_ERRO * r * r) * 100) / 100;
}
// O corredor da pista `t` (que tem `boxes: { entra, para, sai, lado }`, frações da volta): faixa paralela à reta, do lado
// de dentro, atrás de uma mureta. `n` é o número de pontos da pista (de 6 em 6 unidades) e `W` a largura. Os pontos do
// corredor vão de 0 (a entrada, `i0`) a `len` (a saída); `lat(u, lat0)` é o lado em que o carro está no ponto u, saindo
// de onde estava (lat0) e entrando na faixa na rampa; no fim a rampa leva de volta para a beira da pista.
function corredor(t, n, W) {
  const b = t && t.boxes; if (!b || !n) return null;
  const i0 = Math.round(b.entra * n) % n, rel = (f) => (((Math.round(f * n) - i0) % n) + n) % n;
  const len = rel(b.sai), ip = rel(b.para), lado = b.lado < 0 ? -1 : 1;
  const faixa = LARGURA_CORREDOR / 2, D = lado * (W / 2 + FOLGA_CORREDOR + faixa / 2), centroAsfalto = D + lado * faixa / 2;
  const garagemLat = D + lado * faixa, fim = lado * (W / 2 - 22);
  const gap = Math.max(2, Math.min(7, Math.min(ip - RAMPA - 2, len - RAMPA - 2 - ip) / 5)); // pontos entre garagens
  const garagens = Array.from({ length: GARAGENS }, (_, k) => ip + (k - (GARAGENS - 1) / 2) * gap);
  const suave = (x) => { x = limite(x, 0, 1); return x * x * (3 - 2 * x); };
  const lat = (u, lat0 = fim) => u >= len - RAMPA ? D + (fim - D) * suave((u - (len - RAMPA)) / RAMPA) : lat0 + (D - lat0) * suave(u / RAMPA);
  // O carro que para desvia da faixa rápida só junto da sua garagem e volta a ela após a troca.
  const latParada = (u, garagem, lat0 = fim) => lat(u, lat0) + (garagemLat - D) *
    Math.min(suave((u - garagem + 6) / 5), 1 - suave((u - garagem - 1) / 5));
  return { i0, ip, len, lado, D, centroAsfalto, garagemLat, fim, garagens, gap, lat, latParada, larguraCorredor: LARGURA_CORREDOR, folga: FOLGA_CORREDOR, comprimento: len * 6 };
}
// a garagem do piloto de número `k` no grid (cada um tem a sua, até GARAGENS)
const garagemDe = (c, k) => c.garagens[((k % GARAGENS) + GARAGENS) % GARAGENS];
// Ao deixar a rampa, usa a tangente da pista: o último ponto do corredor não tem um ponto seguinte.
function saidaDoCorredor(c, pts) {
  const indice = (c.i0 + c.len) % pts.length, p = pts[indice];
  return { indice, a: Math.atan2(p.ty, p.tx) };
}
// o tempo que uma parada deixa o carro no corredor: andar nele no limitador mais a parada
const tempoNoBox = (c, vmax, parada) => c.comprimento / (LIMITADOR * vmax) + parada;
// registra a parada de `p` (volta em que entrou, quanto ficou, composto novo) e o composto passa a valer
function registrarParada(p, { volta, tempo, composto }) {
  (p.paradas = p.paradas || []).push({ volta, tempo, composto });
  p.compostos = Array.from(new Set([...(p.compostos || [p.pneu || COMPOSTO_PADRAO]), composto]));
  p.pneuAtual = composto;
  return p.paradas.length;
}
// o que a regra dos dois compostos tira de quem terminou com um só (corrida de uma volta não tem onde parar)
const usouDoisCompostos = (p) => new Set(p.compostos || [p.pneu || COMPOSTO_PADRAO]).size >= 2;
const acrescimoDeFinal = (p, voltas) => (voltas >= 2 && !usouDoisCompostos(p) ? UM_COMPOSTO : 0);
// A estratégia de um robô: o composto da largada e as paradas { volta, composto } (`volta` = a volta, de 1 a voltas − 1,
// no fim da qual ele entra no corredor: nunca na última). Cada trecho tem que caber na vida do composto, e dois
// trechos seguidos nunca usam o mesmo, então a corrida sempre tem dois compostos. Os difíceis, com a corrida longa,
// às vezes fazem duas paradas.
function estrategia(voltas, nivel = "medio", semente = 1) {
  const r = sorteio(`estrategia:${semente}`), compostos = Object.keys(PNEUS);
  const escolher = (trecho, anterior) => {
    const cabem = compostos.filter((c) => c !== anterior && PNEUS[c].vida * 1.15 >= trecho);
    const lista = cabem.length ? cabem : compostos.filter((c) => c !== anterior).sort((a, b) => PNEUS[b].vida - PNEUS[a].vida).slice(0, 1);
    return lista[Math.floor(r() * lista.length)];
  };
  if (voltas < 2) return { largada: escolher(1, null), paradas: [] };
  const duas = nivel === "dificil" && voltas >= 5 && r() < 0.4;
  const folga = nivel === "facil" ? 0.2 : nivel === "dificil" ? 0.08 : 0.14;
  let voltasDasParadas;
  if (duas) {
    const v1 = limite(Math.round(voltas * (0.27 + folga * r() * 0.5)), 1, voltas - 2);
    voltasDasParadas = [v1, limite(Math.round(voltas * (0.62 + folga * r() * 0.5)), v1 + 1, voltas - 1)];
  } else voltasDasParadas = [limite(Math.round(voltas * (0.38 + folga * (r() * 2 - 1))), 1, voltas - 1)];
  const marcos = [0, ...voltasDasParadas, voltas], paradas = [];
  let anterior = null, largada = null;
  for (let k = 0; k + 1 < marcos.length; k++) {
    const c = escolher((marcos[k + 1] - marcos[k]) / voltas, anterior);
    if (k === 0) largada = c; else paradas.push({ volta: marcos[k], composto: c });
    anterior = c;
  }
  return { largada, paradas };
}

// ---------- o fim de semana: classificação e pontos ----------
// Q1, Q2 e Q3: o Q1 tem todos os carros e deixa 15, o Q2 deixa 10 e o Q3 decide o resto. Com menos carros, as sessões
// que não eliminam ninguém não existem (20 carros: [20, 15, 10]; 12: [12, 10]; 8: [8]).
const SEGUEM_NA_CLASSIFICACAO = [15, 10];
function sessoesDeClassificacao(n) {
  const t = [Math.max(0, n)];
  for (const k of SEGUEM_NA_CLASSIFICACAO) if (t[t.length - 1] > k) t.push(k);
  return t;
}
// `tabela`: [{ id, tempo (s, ou null se não fez volta), quando (ms em que fez o melhor tempo) }]. Vale o menor tempo; quem
// não tem tempo fica por último; empate: quem fez o tempo primeiro (e, sem `quando`, a ordem em que veio).
function ordenarClassificacao(tabela) {
  const t = (x) => (x.tempo == null ? Infinity : x.tempo), q = (x) => (x.quando == null ? Infinity : x.quando);
  return tabela.map((x, i) => ({ x, i })).sort((a, b) => {
    const dt = t(a.x) === t(b.x) ? 0 : t(a.x) < t(b.x) ? -1 : 1; if (dt) return dt;
    const dq = q(a.x) === q(b.x) ? 0 : q(a.x) < q(b.x) ? -1 : 1; return dq || a.i - b.i;
  }).map((o) => o.x);
}
// fecha uma sessão: a ordem dos tempos, quem passa para a próxima (`passam` carros) e quem é eliminado
function fecharSessao(tabela, passam) {
  const ordem = ordenarClassificacao(tabela), n = Math.max(0, Math.min(ordem.length, passam));
  return { ordem, passam: ordem.slice(0, n), eliminados: ordem.slice(n) };
}
// O grid (ids, do 1º ao último) pelas sessões fechadas, da primeira à última: a última sessão decide as primeiras
// posições, os eliminados do Q2 vêm depois deles e os do Q1 no fim, cada grupo na ordem dos seus tempos.
function gridDaClassificacao(sessoes) {
  const grid = [];
  for (let i = sessoes.length - 1; i >= 0; i--) for (const x of (i === sessoes.length - 1 ? sessoes[i].ordem : sessoes[i].eliminados)) grid.push(x.id);
  return grid;
}

// Os pontos oficiais do GP (do 1º ao 10º); não tem ponto pela volta mais rápida (a F1 tirou em 2025).
const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], CLASSIFICADO = 0.9;
// O resultado do GP. `carros`: [{ id, laps, finish (s, ou null), acrescimo (s), prog }], `voltas` da corrida. Quem cruzou a
// chegada vem primeiro, pelo tempo mais os acréscimos; depois, quem não terminou, por voltas e progresso. Quem fez menos de
// 90% das voltas da corrida é "NC" (não classificado) e não pontua. Devolve [{ id, pos, nc, tempo, pontos }].
function classificacaoFinal(carros, voltas) {
  const minimo = Math.ceil(voltas * CLASSIFICADO), final = (c) => c.finish + (c.acrescimo || 0);
  const terminaram = carros.filter((c) => c.finish != null).sort((a, b) => final(a) - final(b));
  const resto = carros.filter((c) => c.finish == null).sort((a, b) => (b.laps - a.laps) || ((b.prog || 0) - (a.prog || 0)));
  return [...terminaram, ...resto].map((c, i) => {
    const nc = c.finish == null && (c.laps || 0) < minimo;
    return { id: c.id, pos: i + 1, nc, tempo: c.finish != null ? final(c) : null, pontos: !nc && i < PONTOS.length ? PONTOS[i] : 0 };
  });
}

const api = { PNEUS, COMPOSTO_PADRAO, PENHASCO, sessoesDeClassificacao, ordenarClassificacao, fecharSessao, gridDaClassificacao, PONTOS, classificacaoFinal, pneuNovo, gastarPneu, aderencia, frio,
  zonaDRS, drsHabilitado, ersNovo, carregarErs, gastarErs, usarErsAuto, ERS_MAX_RECARGA, ERS_GASTO,
  LIMITADOR, PARADA_BASE, PARADA_ERRO, UM_COMPOSTO, RAPIDO, RAMPA, GARAGENS, sorteio, tempoDeParada, corredor, garagemDe, saidaDoCorredor, tempoNoBox, registrarParada, usouDoisCompostos, acrescimoDeFinal, estrategia };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
