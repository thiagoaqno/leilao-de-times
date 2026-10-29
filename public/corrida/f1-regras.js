// Corrida da Galera — as regras de Fórmula 1 (planos/temporada-f1.md), as mesmas no servidor e no navegador.
// Só contas, sem desenho: liga com `config.regras === "f1"` na sala. Os pneus: três compostos secos, o desgaste e a
// temperatura, e o clima: a chuva sorteada pela semente do GP, a água na pista e o pneu de chuva. A física (fisica.js)
// multiplica a aderência do carro pela do pneu, e os robôs (corrida-robos.js) usam as mesmas funções. E o pit stop: o corredor dos boxes (`corredor`), o tempo da parada (`tempoDeParada`), a regra dos dois
// compostos e a estratégia de parada dos robôs (`estrategia`).
(function (root) {

// ---------- os pneus ----------
// Três compostos secos e o de chuva. `pico` é a aderência lateral do pneu novo e quente sobre o grip do carro (1,35 é a referência
// original da dirigibilidade); `vida` é quantas VOLTAS ele dura, pilotado limpo, até o penhasco (não depende do tamanho da corrida:
// o macio dura uma volta e meia em qualquer GP); `aquece` é o quanto esquenta rápido e `perdaAntes` o que perde de
// aderência até o fim da vida. As cores são as da Pirelli. Os números saem da calibração de `tests/corrida-f1-estrategia.test.js`
// (o simulador de stint com a física do carro: ver `ferramentas/pneus-fisica.js`).
// `molhado` é quanto da aderência sobra com a pista encharcada (água 1; seco é 1 e no meio interpola): os secos ficam com a
// metade e o de chuva com 90%. O de chuva no seco tem o `pico` do duro, mas `derrete` (o desgaste vai a ×2,8) e `esquenta` (a
// temperatura passa de 1, até +0,4, e a aderência cai até 25%) quando a pista está seca: dura 2 a 3 voltas.
const PNEUS = {
  macio: { nome: "Macio", cor: "#e8202a", pico: 1.515, vida: 1.5, aquece: 1.7, perdaAntes: 0.03, molhado: 0.5 },
  medio: { nome: "Médio", cor: "#ffd100", pico: 1.278, vida: 3.8, aquece: 1.1, perdaAntes: 0.03, molhado: 0.5 },
  duro: { nome: "Duro", cor: "#f4f4f4", pico: 1.126, vida: 7, aquece: 0.85, perdaAntes: 0.02, molhado: 0.5 },
  chuva: { nome: "Chuva", cor: "#1e7fd6", pico: 1.126, vida: 7, aquece: 0.5, perdaAntes: 0.02, molhado: 0.9, derrete: 2.8, esquenta: 0.4 },
};
const SECOS = ["macio", "medio", "duro"]; // os compostos de pista seca (a estratégia e a tabela de ritmo só conhecem estes)
const COMPOSTO_PADRAO = "medio";
// O desgaste vai de 0 (novo) a 1 (acabado); PENHASCO é o fim da vida. Passou dele o pneu despenca até PERDA_FIM do pico,
// no resto do caminho até 1 (um quarto da vida do composto), e o carro fica muito ruim: sem aderência, sem tração, sem freio
// e com um pouco menos de velocidade final.
const PENHASCO = 0.8, PERDA_FIM = 0.4, FINAL_FIM = 0.08;
// Pneu frio (saindo do box ou na largada) segura FRIO do normal e fica bom aos poucos: a temperatura vai de TEMP_SAIDA a
// TEMP_BOA em alguns segundos (mais rápido no macio, mais devagar no duro).
const TEMP_SAIDA = 0.6, TEMP_BOA = 0.75, FRIO = 0.72, AQUECE = 0.12;
// O desgaste por escorregão: o piloto ideal (a conta do simulador de stint) gasta o pneu na vida em voltas do composto;
// quem escorrega de lado, trava a roda ou patina gasta mais (até uns 2×).
const ESTRESSE_BASE = 0.7, ESTRESSE_LADO = 0.6, ESTRESSE_TRAVA = 0.8, ESTRESSE_PATINA = 0.4, ESTRESSE_NORMAL = 0.76;
const limite = (v, a, b) => Math.max(a, Math.min(b, v));

function pneuNovo(composto = COMPOSTO_PADRAO) {
  return { composto: PNEUS[composto] ? composto : COMPOSTO_PADRAO, desgaste: 0, temp: TEMP_SAIDA };
}
// Um passo do pneu. O desgaste anda pela distância em VOLTAS (`volta` é o comprimento de uma volta): o macio dura uma
// volta e meia em qualquer corrida. Escorregar, travar a roda e patinar gastam mais. A temperatura vai para um alvo pela
// velocidade e pelo escorregão, mais rápido no macio.
// d: { dist (andado neste passo), volta (o comprimento de uma volta), slip, travada (0..1), patina (0..1), v, vmax, dt,
//      fator (opcional: o quanto o carro gasta o pneu, `desgaste` de f1-equipes.js), agua (opcional: a água na pista, 0 a 1) }
function gastarPneu(pneu, d) {
  const pn = PNEUS[pneu.composto] || PNEUS[COMPOSTO_PADRAO];
  const escorrega = limite((d.slip || 0) / 60, 0, 1), seca = secaDaPista(d.agua);
  if (d.volta > 0 && d.dist > 0) {
    const estresse = (ESTRESSE_BASE + ESTRESSE_LADO * escorrega + ESTRESSE_TRAVA * limite(d.travada || 0, 0, 1) + ESTRESSE_PATINA * limite(d.patina || 0, 0, 1)) / ESTRESSE_NORMAL;
    pneu.desgaste = Math.min(1, pneu.desgaste + (d.dist / d.volta) * (PENHASCO / pn.vida) * estresse * (d.fator || 1) * (1 + ((pn.derrete || 1) - 1) * seca));
  }
  const vel = d.vmax > 0 ? limite(Math.abs(d.v || 0) / d.vmax, 0, 1) : 0;
  const alvo = Math.min(1 + (pn.esquenta || 0) * seca, 0.65 + 0.35 * vel + 0.15 * escorrega + (pn.esquenta || 0) * seca); // (o de chuva no seco passa de 1: superaquece)
  pneu.temp += (alvo - pneu.temp) * Math.min(1, (d.dt || 0) * AQUECE * pn.aquece);
  return pneu;
}
// Quanto o pneu segura agora: `grip` multiplica o grip do carro (a curva), `freio` e `tracao` a frenagem e a arrancada
// (o antigo médio novo dá 1,08, e os outros acompanham a aderência dele), `final` a velocidade final e `kin` o quanto sobra escorregando.
const PICO_REFERENCIA = 1.35, BASE_FREIO = 1.08, EXPOENTE_FREIO = 0.85, EXPOENTE_TRACAO = 0.8;
// Quanto a pista está "seca" para o pneu de chuva: 1 sem água, 0 de metade de água para cima.
const secaDaPista = (agua) => 1 - limite((agua || 0) / 0.5, 0, 1);
// O que a água tira da aderência do composto: 1 na pista seca, `molhado` na encharcada, interpolando.
const fatorAgua = (composto, agua) => 1 + ((PNEUS[composto] || PNEUS[COMPOSTO_PADRAO]).molhado - 1) * limite(agua || 0, 0, 1);
// A temperatura passa de 1 só no pneu de chuva em pista seca; com +0,4 acima de 1 perde PERDA_ESQUENTA (25%) da aderência.
const PERDA_ESQUENTA = 0.25;
function aderencia(pneu, agua = 0) {
  const pn = PNEUS[pneu && pneu.composto] || PNEUS[COMPOSTO_PADRAO], d = pneu ? pneu.desgaste : 0, temp = pneu ? pneu.temp : TEMP_BOA;
  const x = limite((d - PENHASCO) / (1 - PENHASCO), 0, 1); // 0 até o penhasco, 1 com o pneu acabado
  const perda = d <= PENHASCO ? pn.perdaAntes * d / PENHASCO : pn.perdaAntes + (PERDA_FIM - pn.perdaAntes) * x;
  const quente = FRIO + (1 - FRIO) * limite((temp - TEMP_SAIDA) / (TEMP_BOA - TEMP_SAIDA), 0, 1);
  const esquentou = pn.esquenta ? limite((temp - 1) / pn.esquenta, 0, 1) : 0; // 0 a 1: o pneu de chuva superaquecido
  const base = limite(pn.pico * (1 - perda) * quente * fatorAgua(pneu ? pneu.composto : COMPOSTO_PADRAO, agua) * (1 - PERDA_ESQUENTA * esquentou), 0.4, 2.0), r = base / PICO_REFERENCIA;
  // `arcade`: qualquer composto dentro da vida útil usa a mesma dirigibilidade (dinamica.js, `lateralArcade`): a RESPOSTA da direção é igual nos
  // três e o composto só muda o limite de aderência (`grip`), o desgaste e a temperatura; passou do penhasco, volta à física intermediária
  // e fica prejudicado pelo desgaste. `rel` é a aderência relativa à referência original (o `grip` do carro usa essa base).
  return { arcade: !!pneu && d <= PENHASCO, rel: r, grip: base, kin: limite(1 - perda * 0.5, 0.85, 1),
    freio: limite(BASE_FREIO * Math.pow(r, EXPOENTE_FREIO), 0.4, 1.5), tracao: limite(BASE_FREIO * Math.pow(r, EXPOENTE_TRACAO), 0.4, 1.5),
    final: 1 - FINAL_FIM * x };
}
// Em quantas voltas o pneu chega ao penhasco, pilotado como o piloto ideal e com um gasto `fator` do carro
const vidaEmVoltas = (composto, fator = 1) => (PNEUS[composto] || PNEUS[COMPOSTO_PADRAO]).vida / (fator || 1);
// Quanto falta para o penhasco, de 1 (novo) a 0 (chegou ao penhasco: dali o pneu despenca). É o que o anel do HUD mostra.
const vidaRestante = (pneu) => limite(1 - (pneu ? pneu.desgaste : 0) / PENHASCO, 0, 1);
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
// pneus e volta para a pista. A parada leva um de três tempos (PARADAS): 2,0 s (perfeita), 2,7 s (normal) ou 3,3 s (ruim),
// sorteado com a semente do GP (recarregar a página nunca muda o resultado), com chance maior de ser normal. Quem termina a corrida sem ter usado dois
// compostos leva UM_COMPOSTO s no resultado; passar do limitador leva RAPIDO s.
const LIMITADOR = 0.40, PARADA_BASE = 2.0, PARADA_ERRO = 1.3, UM_COMPOSTO = 10, RAPIDO = 5;
const RAMPA = 14, LARGURA_CORREDOR = 54, FOLGA_CORREDOR = 12, GARAGENS = 10; // duas faixas de 27 unidades; a rampa é em pontos da pista (6 unidades cada)
const hashTexto = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// gerador com semente (mulberry32): a mesma semente dá sempre a mesma sequência
function sorteio(semente) { let a = hashTexto(semente) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// os três tempos do box e o corte do sorteio de cada um (25% perfeita, 55% normal, 20% ruim)
const PARADAS = [{ id: "perfeito", nome: "perfeito", tempo: 2.0, ate: 0.25 }, { id: "normal", nome: "normal", tempo: 2.7, ate: 0.8 }, { id: "ruim", nome: "ruim", tempo: 3.3, ate: 1 }];
// quanto dura a n-ésima parada de `quem` neste GP
function tempoDeParada(semente, quem, n) {
  const r = sorteio(`${semente}:${quem}:${n}`)();
  return (PARADAS.find((q) => r < q.ate) || PARADAS[1]).tempo;
}
// a classe de uma parada pelo tempo ("perfeito", "normal" ou "ruim") e o texto do HUD: "Box perfeito · 2,0 s"
const classeDaParada = (tempo) => PARADAS.reduce((a, q) => (Math.abs(q.tempo - tempo) < Math.abs(a.tempo - tempo) ? q : a), PARADAS[1]).id;
const textoDaParada = (tempo) => `Box ${classeDaParada(tempo)} · ${tempo.toFixed(1).replace(".", ",")} s`;
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
// Limite de jogos: cada piloto tem JOGOS_POR_COMPOSTO jogos de cada composto na corrida, contando o pneu da largada
// (`p.pneu`) e cada parada. Fixo em 2, seja qual for o número de voltas.
const JOGOS_POR_COMPOSTO = 2;
function jogosUsados(p) {
  const n = {}; for (const c of Object.keys(PNEUS)) n[c] = 0;
  const largada = p.pneu || COMPOSTO_PADRAO; n[largada] = (n[largada] || 0) + 1;
  for (const q of p.paradas || []) if (n[q.composto] !== undefined) n[q.composto]++;
  return n;
}
function jogosRestantes(p) { const u = jogosUsados(p), r = {}; for (const c of Object.keys(u)) r[c] = Math.max(0, JOGOS_POR_COMPOSTO - u[c]); return r; }
const podeUsar = (p, composto) => !!PNEUS[composto] && jogosRestantes(p)[composto] > 0;
// O composto que o servidor realmente põe num pedido de box: o pedido, se ainda há jogo; senão outro composto com jogo
// (diferente do atual, e que ainda não usou se só tinha usado um: mantém a regra dos dois compostos; entre eles o de mais
// jogos restantes). Se tudo estiver esgotado, repete o menos usado (o box acontece, mas nunca fica sem opção).
function compostoParaParada(p, pedido) {
  if (podeUsar(p, pedido)) return pedido;
  const atual = p.pneuAtual || p.pneu || COMPOSTO_PADRAO, r = jogosRestantes(p), usados = new Set(p.compostos || [p.pneu || COMPOSTO_PADRAO]);
  const todos = pedido === "chuva" ? Object.keys(PNEUS) : SECOS; // (quem pediu pneu seco nunca recebe o de chuva no lugar)
  let lista = todos.filter((c) => r[c] > 0 && c !== atual);
  if (usados.size < 2) { const novos = lista.filter((c) => !usados.has(c)); if (novos.length) lista = novos; }
  if (!lista.length) lista = todos.filter((c) => r[c] > 0);
  if (!lista.length) { const u = jogosUsados(p); lista = todos.slice().sort((a, b) => u[a] - u[b]); }
  return lista.sort((a, b) => r[b] - r[a])[0];
}
// o que a regra dos dois compostos tira de quem terminou com um só (corrida de uma volta não tem onde parar)
const usouDoisCompostos = (p) => new Set(p.compostos || [p.pneu || COMPOSTO_PADRAO]).size >= 2;
// (numa corrida com chuva a regra não vale, como na F1: `chuvoso` é o roteiro da corrida ter chuva)
const acrescimoDeFinal = (p, voltas, chuvoso = false) => (voltas >= 2 && !chuvoso && !usouDoisCompostos(p) ? UM_COMPOSTO : 0);
// A estratégia de um robô: o composto da largada e as paradas { volta, composto } (`volta` = a volta, de 1 a voltas − 1, em
// que ele entra no corredor, no fim dela se a entrada fica antes da linha de chegada: nunca na última). Vem da conta do
// simulador de stint (f1-pneus-ritmo.js, a tabela da `pista` medida com a física do carro): o tempo da corrida inteira de cada
// plano, com a vida de cada composto em voltas, o penhasco e o que a parada custa de verdade. O robô sorteia pela semente, entre
// os planos que terminam perto do melhor: os difíceis quase só o melhor, os fáceis uma escolha mais larga. A regra dos dois
// compostos vale em qualquer plano. Sem a tabela (ou sem a pista), cai numa conta simples pela vida dos compostos.
const NIVEIS_DE_PLANO = { facil: { janela: 6, tau: 3 }, medio: { janela: 3.5, tau: 1.8 }, dificil: { janela: 2, tau: 0.9 } };
const CACHE_PLANOS = new Map();
function ritmoDePneus() {
  try { return typeof require === "function" ? require("./f1-pneus-ritmo.js") : root.F1PneusRitmo || null; } catch (e) { return root.F1PneusRitmo || null; }
}
// os melhores planos de uma corrida de `voltas` na pista (guardados: a conta de uma corrida longa leva uns décimos de segundo)
function melhoresPlanos(voltas, pista, nivel = "medio", fator = 1) {
  const R = ritmoDePneus(); if (!R) return null;
  const tab = R.tabelaDe(pista) || R.tabelaDe("interlagos"); if (!tab) return null;
  fator = Math.round((fator || 1) * 20) / 20; // (o gasto de pneu do carro, de 0,05 em 0,05: a conta é guardada)
  const { janela } = NIVEIS_DE_PLANO[nivel] || NIVEIS_DE_PLANO.medio, chave = `${R.tabelaDe(pista) ? pista : "interlagos"}:${voltas}:${janela}:${fator}`;
  let l = CACHE_PLANOS.get(chave);
  if (!l) { l = R.planos(tab, voltas, { janela, max: 400, fator }).filter((p) => voltas < 2 || new Set([p.largada, ...p.paradas.map((q) => q.composto)]).size >= 2).slice(0, 80); /* o robô sempre cumpre a regra dos dois compostos */ if (CACHE_PLANOS.size > 200) CACHE_PLANOS.clear(); CACHE_PLANOS.set(chave, l); }
  return l;
}
function estrategia(voltas, nivel = "medio", semente = 1, pista = null, fator = 1) {
  const r = sorteio(`estrategia:${semente}`), compostos = SECOS;
  const lista = pista !== null && pista !== undefined ? melhoresPlanos(voltas, pista, nivel, fator) : null;
  if (lista && lista.length) { // o plano sai da conta: pesa cada um pela diferença para o melhor
    const { tau } = NIVEIS_DE_PLANO[nivel] || NIVEIS_DE_PLANO.medio, pesos = lista.map((p) => Math.exp(-(p.tempo - lista[0].tempo) / tau));
    let x = r() * pesos.reduce((s, w) => s + w, 0), i = 0; while (i < lista.length - 1 && x > pesos[i]) { x -= pesos[i]; i++; }
    return { largada: lista[i].largada, paradas: lista[i].paradas.map((q) => ({ ...q })) };
  }
  // a conta simples: cada trecho cabe na vida (em voltas) do composto, e dois trechos seguidos nunca usam o mesmo
  const escolher = (trecho, anterior) => {
    const cabem = compostos.filter((c) => c !== anterior && PNEUS[c].vida * 1.1 >= trecho);
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
    const c = escolher(marcos[k + 1] - marcos[k], anterior);
    if (k === 0) largada = c; else paradas.push({ volta: marcos[k], composto: c });
    anterior = c;
  }
  return { largada, paradas };
}

// ---------- o clima ----------
// Cada GP tem 20% de chance de chuva, sorteados no servidor pela semente do GP (`sortearClima`). Se chove, a classificação e a
// corrida ganham cada uma o seu roteiro (a mesma chuva do fim de semana, mas cada sessão com o seu relógio): pode largar
// molhado ou começar a chover no meio, ser garoa ou chuva forte, intensificar, aliviar e parar antes do fim. O roteiro é um
// objeto simples que viaja no estado da sala (`clima`): { chove, t0 (ms: o zero do relógio do roteiro), dur, agua0 (a água na
// pista no tempo 0), trechos: [[de, ate, forca] em segundos do relógio] }. Dele sai, para qualquer hora, a água na pista
// (`climaEm`): sobe com a chuva (de 0 seco a 1 encharcado) e desce devagar quando ela para. É uma conta pura do tempo, sem
// estado: o servidor, o navegador e os robôs chegam ao mesmo valor.
const CHANCE_CHUVA = 0.2, GAROA = 0.45, CHUVA_FORTE = 1;
const AGUA_SOBE_S = 75;   // segundos de chuva para a pista ir de seca a encharcada (a garoa para no teto dela, GAROA)
const AGUA_SECA_S = 240;  // segundos para uma pista encharcada secar de vez, sem chuva (quatro minutos de corrida)
const AGUA_MOLHADA = 0.15, AGUA_ENCHARCADA = 0.7; // a partir daqui a pista conta como molhada / encharcada (o texto da TV, o visual)
const AGUA_QUALI_CHUVA = 0.3; // na classificação ninguém troca de pneu: a sessão abre com o de chuva se a água passa disso
const seco = (dur) => ({ chove: false, t0: 0, dur: Math.round(dur), agua0: 0, trechos: [] });
// O roteiro de uma sessão de `dur` segundos (a semente já vem sorteada em `r`). Sessões curtas (menos de 4 min) largam sempre
// molhadas, para a chuva do GP aparecer.
function roteiroDeChuva(r, dur) {
  const largaMolhado = dur < 240 || r() < 0.4, forca = r() < 0.5 ? GAROA : CHUVA_FORTE;
  const agua0 = largaMolhado ? Math.round((forca === CHUVA_FORTE ? 0.7 + 0.3 * r() : 0.25 + 0.2 * r()) * 100) / 100 : 0;
  const ini = largaMolhado ? 0 : Math.round(dur * (0.12 + 0.5 * r()));
  const para = r() < 0.55; // para antes do fim?
  let fim = Math.round(dur * (0.4 + 0.45 * r()));
  fim = para && fim - ini >= 45 ? fim : Math.round(dur * 4); // (sem parar: chove até depois da bandeirada)
  let trechos = [[ini, fim, forca]];
  if (r() < 0.35 && Math.min(fim, dur) - ini > 90) { // muda de intensidade no meio: garoa que vira chuva, ou chuva que alivia
    const meio = Math.round(ini + (Math.min(fim, dur) - ini) * (0.35 + 0.3 * r()));
    trechos = [[ini, meio, forca], [meio, fim, forca === GAROA ? CHUVA_FORTE : GAROA]];
  }
  return { chove: true, t0: 0, dur: Math.round(dur), agua0, trechos };
}
// O sorteio do GP: `duracoes` { corrida, quali } em segundos (a corrida inteira e o fim de semana de classificação).
// Devolve { chuva (o GP tem chuva), quali, corrida } (os dois roteiros; `t0` o servidor põe quando a sessão abre).
function sortearClima(semente, duracoes = {}) {
  const dc = duracoes.corrida || 300, dq = duracoes.quali || 360;
  if (!(sorteio(`clima:${semente}`)() < CHANCE_CHUVA)) return { chuva: false, quali: seco(dq), corrida: seco(dc) };
  return { chuva: true, quali: roteiroDeChuva(sorteio(`clima:${semente}:quali`), dq), corrida: roteiroDeChuva(sorteio(`clima:${semente}:corrida`), dc) };
}
// A força da chuva do roteiro no segundo `t`: 0 sem chuva, GAROA (0,45) ou CHUVA_FORTE (1).
function chuvaEm(c, t) {
  let f = 0; for (const q of (c && c.trechos) || []) if (t >= q[0] && t < q[1] && q[2] > f) f = q[2];
  return f;
}
// A água na pista: anda para o teto da chuva (a força dela) subindo 1/AGUA_SOBE_S por segundo, ou para baixo secando
// 1/AGUA_SECA_S por segundo (sem chuva o teto é 0; com garoa depois de chuva forte, a água desce até o teto da garoa).
function aguaEm(c, t) {
  let a = (c && c.agua0) || 0;
  if (!c || !(t > 0)) return a;
  const marcas = [0, t];
  for (const q of c.trechos || []) for (const m of [q[0], q[1]]) if (m > 0 && m < t) marcas.push(m);
  marcas.sort((x, y) => x - y);
  for (let i = 0; i + 1 < marcas.length; i++) {
    const dt = marcas[i + 1] - marcas[i]; if (dt <= 0) continue;
    const alvo = chuvaEm(c, (marcas[i] + marcas[i + 1]) / 2);
    a = alvo > a ? Math.min(alvo, a + dt / AGUA_SOBE_S) : Math.max(alvo, a - dt / AGUA_SECA_S);
  }
  return a;
}
// O clima na hora `agora` (ms): { agua (0 seco a 1 encharcado), chuva (a força da chuva agora: 0, GAROA ou CHUVA_FORTE), garoa,
// molhada, encharcada, chove (o roteiro tem chuva), t (segundos do relógio do roteiro) }. Sem roteiro, seco. É o que o visual lê.
function climaEm(c, agora) {
  const t = c && c.t0 ? (agora - c.t0) / 1000 : 0, agua = c ? aguaEm(c, t) : 0, chuva = c ? chuvaEm(c, t) : 0;
  return { agua, chuva, garoa: chuva > 0 && chuva < CHUVA_FORTE, molhada: agua >= AGUA_MOLHADA, encharcada: agua >= AGUA_ENCHARCADA, chove: !!(c && c.chove), t };
}
// O pneu da classificação (ninguém troca de pneu nela): o de chuva se a pista abre com água suficiente, senão o macio.
const compostoDaClassificacao = (agua) => ((agua || 0) >= AGUA_QUALI_CHUVA ? "chuva" : "macio");
// O tempo estimado de uma volta com o pneu novo de `composto` com `agua` na pista: a conta simples dos robôs no molhado (sem
// regenerar a tabela): o tempo seco da tabela da pista (o de chuva usa o do duro, que tem o mesmo pico) cresce com a falta de
// aderência (o tempo vai com a raiz dela, ×0,7). O de chuva em pista seca perde mais um pouco, pelo superaquecimento.
function tempoMolhado(pista, composto, agua) {
  const R = ritmoDePneus(), tab = R && R.tabelaDe(pista), pn = PNEUS[composto] || PNEUS[COMPOSTO_PADRAO];
  const t0 = tab ? tab.compostos[composto === "chuva" ? "duro" : composto].tempos[0] : 70 * Math.sqrt(1.35 / pn.pico);
  const f = fatorAgua(composto, agua) * (1 - PERDA_ESQUENTA * 0.5 * secaDaPista(agua) * (pn.esquenta ? 1 : 0));
  return t0 * (1 + 0.7 * (1 / Math.sqrt(f) - 1)); // (0,7: o que a física dos robôs mede no molhado, de macio a chuva)
}
// O composto mais rápido de `candidatos` com `agua` na pista (o `atual` só sai se o melhor for `margem` segundos mais rápido).
function compostoPorAgua(pista, agua, candidatos, atual = null, margem = 0.8) {
  let melhor = null, tm = Infinity;
  for (const c of candidatos) { const t = tempoMolhado(pista, c, agua); if (t < tm) { tm = t; melhor = c; } }
  if (atual && candidatos.includes(atual) && tempoMolhado(pista, atual, agua) - tm < margem) return atual;
  return melhor;
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
  const terminaram = carros.filter((c) => c.finish != null && !c.dnf).sort((a, b) => final(a) - final(b));
  const resto = carros.filter((c) => c.finish == null || c.dnf).sort((a, b) => (b.laps - a.laps) || ((b.prog || 0) - (a.prog || 0)));
  return [...terminaram, ...resto].map((c, i) => {
    const nc = !c.dnf && c.finish == null && (c.laps || 0) < minimo; // quem abandonou por dano (dnf) não pontua
    return { id: c.id, pos: i + 1, nc, dnf: !!c.dnf, tempo: c.finish != null && !c.dnf ? final(c) : null, pontos: !nc && !c.dnf && i < PONTOS.length ? PONTOS[i] : 0 };
  });
}

// ---------- as batidas: dano fixo ----------
// A força serve para separar contato perceptível de aproximação sem impacto. Toda batida válida causa 1% de dano,
// sem segundos de penalidade; cada par (o muro, ou cada outro carro) só conta de novo depois de BATIDA_INTERVALO, para o
// mesmo contato (ou uma raspada comprida no muro) não contar várias vezes.
const BATIDA_MIN = 20, BATIDA_MEDIA = 110, BATIDA_FORTE = 180, BATIDA_MAX = 360, DANO_POR_BATIDA = 1, BATIDA_INTERVALO = 4000;
function batida(forca) {
  if (!(forca >= BATIDA_MIN)) return null;
  const nivel = forca >= BATIDA_FORTE ? "forte" : forca >= BATIDA_MEDIA ? "media" : "leve";
  return { nivel, segundos: 0, dano: DANO_POR_BATIDA };
}
// Cada ponto percentual de dano tira um ponto percentual de velocidade, aceleração, freio e aderência.
function efeitoDoDano(dano) {
  const d = limite((dano || 0) / 100, 0, 1);
  const desempenho = 1 - d;
  return { final: desempenho, grip: desempenho, tracao: desempenho, freio: desempenho };
}

// ---------- o vácuo da F1 ----------
// Atrás de outro carro na reta o ar empurra menos: um pouco de velocidade final (bem menos que o DRS, que é o que decide
// a ultrapassagem) e um pouco de aceleração. Nas curvas é o contrário, o ar sujo: o carro de trás perde aderência e
// escorrega, e por isso é difícil seguir colado. Sem o "estilingue" do modo arcade. `draft` vai de 0 (longe) a 1 (colado).
const VACUO_FINAL = 0.03, VACUO_ACEL = 0.15, AR_SUJO = 0.1, AERO_MAX = 0.11;
function vacuoF1(draft, curva) {
  const d = limite(draft || 0, 0, 1);
  return { final: VACUO_FINAL * d, acel: VACUO_ACEL * d, aderencia: 1 - (curva ? AR_SUJO * d : 0) };
}

const api = { PNEUS, SECOS, COMPOSTO_PADRAO, PENHASCO, PERDA_FIM, vidaEmVoltas, vidaRestante, sessoesDeClassificacao, ordenarClassificacao, fecharSessao, gridDaClassificacao, PONTOS, classificacaoFinal, pneuNovo, gastarPneu, aderencia, frio,
  zonaDRS, drsHabilitado, vacuoF1, VACUO_FINAL, VACUO_ACEL, AR_SUJO, AERO_MAX, ersNovo, carregarErs, gastarErs, usarErsAuto, ERS_MAX_RECARGA, ERS_GASTO,
  LIMITADOR, PARADA_BASE, PARADA_ERRO, UM_COMPOSTO, RAPIDO, RAMPA, GARAGENS, sorteio, tempoDeParada, PARADAS, classeDaParada, textoDaParada, BATIDA_MIN, BATIDA_MEDIA, BATIDA_FORTE, BATIDA_MAX, BATIDA_INTERVALO, batida, efeitoDoDano, corredor, garagemDe, saidaDoCorredor, tempoNoBox, registrarParada, usouDoisCompostos, JOGOS_POR_COMPOSTO, jogosUsados, jogosRestantes, podeUsar, compostoParaParada, acrescimoDeFinal, estrategia, melhoresPlanos,
  CHANCE_CHUVA, GAROA, CHUVA_FORTE, AGUA_SOBE_S, AGUA_SECA_S, AGUA_MOLHADA, AGUA_ENCHARCADA, AGUA_QUALI_CHUVA, sortearClima, chuvaEm, aguaEm, climaEm, fatorAgua, compostoDaClassificacao, tempoMolhado, compostoPorAgua };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
