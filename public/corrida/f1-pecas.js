// Corrida da Galera — as PEÇAS do carro de F1 (modo carreira). UMD: o servidor confere e o navegador mostra, com as mesmas contas.
// Em vez de distribuir pontos à mão, a pessoa ESCOLHE UMA PEÇA por categoria (unidade de potência, ERS, asa dianteira, asa
// traseira, chassi/assoalho, suspensão, freios e câmbio). Cada peça tem nome, custo e um efeito nos seis níveis que já existem
// em f1-equipes.js (motor, aero, chassi, freios, suspensao, confiab). O custo de uma peça é a soma dos níveis que ela dá, então
// o custo total das peças é igual à soma dos níveis da montagem derivada e cabe no mesmo orçamento em pontos de antes. As
// trocas (mais carga = mais curva e menos reta) já estão nas contas de `specDaMontagem`; aqui as peças de "baixo arrasto"
// trocam carga por motor. A montagem de níveis continua sendo o que as salas e os saves guardam: `pecas` é só a escolha
// que gerou a montagem (saves antigos, sem `pecas`, abrem pela peça mais parecida: `migrarMontagem`).
(function (root) {

const Equipes = root.F1Equipes || (typeof module !== "undefined" && module.exports ? require("./f1-equipes.js") : null);
const NIVEIS = ["motor", "aero", "chassi", "freios", "suspensao", "confiab"];
const ROTULO = { motor: "Motor", aero: "Aerodinâmica", chassi: "Chassi", freios: "Freios", suspensao: "Suspensão", confiab: "Confiabilidade" };
const P = (id, nome, efeito, nivel) => ({ id, nome, nivel: Object.freeze(nivel), custo: Object.values(nivel).reduce((a, b) => a + b, 0), efeito });

// ordem das categorias na tela; `padrao` é a peça do carro "todo médio" (todos os níveis em 3, 18 pontos)
const CATEGORIAS = [
  { id: "unidade", nome: "Unidade de potência", icone: "🔥", padrao: "v6-padrao", pecas: [
    P("v6-cliente", "V6 Cliente", "Potência baixa, mas dura mais", { motor: 1, confiab: 1 }),
    P("v6-padrao", "V6 Padrão", "Potência de equipe do meio", { motor: 2 }),
    P("v6-turbo", "V6 Turbo+", "Mais reta e mais aceleração", { motor: 3 }),
    P("v6-quali", "V6 Especial", "O motor mais forte do grid", { motor: 4 }) ] },
  { id: "ers", nome: "ERS e bateria", icone: "🔋", padrao: "ers-basico", pecas: [
    P("ers-basico", "Bateria básica", "Um empurrão a mais nas saídas de curva", { motor: 1 }),
    P("ers-eficiente", "Bateria eficiente", "Gasta menos: o conjunto quebra menos", { confiab: 1 }),
    P("ers-forte", "Bateria de alta carga", "Mais energia para atacar na reta", { motor: 2 }),
    P("ers-total", "Híbrido avançado", "Energia de sobra e conjunto resistente", { motor: 2, confiab: 1 }) ] },
  { id: "asa-diant", nome: "Asa dianteira", icone: "🏁", padrao: "af-equilibrada", pecas: [
    P("af-baixa", "Baixo arrasto", "Menos carga, mais velocidade final", { motor: 1 }),
    P("af-equilibrada", "Equilibrada", "Acerto sem exagero", { aero: 1 }),
    P("af-alta", "Alta pressão", "Cola na curva, cobra na reta", { aero: 2 }) ] },
  { id: "asa-tras", nome: "Asa traseira", icone: "🏎️", padrao: "ar-equilibrada", pecas: [
    P("ar-baixa", "Baixo arrasto (DRS longo)", "Voa na reta, escorrega na curva", { aero: 1, motor: 1 }),
    P("ar-equilibrada", "Equilibrada", "Carga média para a pista toda", { aero: 2 }),
    P("ar-alta", "Alta pressão", "Mais volante nas curvas, menos reta", { aero: 3 }),
    P("ar-maxima", "Carga máxima", "Pista de curva: o DRS rende mais", { aero: 4 }) ] },
  { id: "chassi", nome: "Chassi e assoalho", icone: "⚖️", padrao: "ch-equilibrado", pecas: [
    P("ch-robusto", "Robusto", "Aguenta mais muro e grama, mas é pesado", { chassi: 1, confiab: 1 }),
    P("ch-equilibrado", "Equilibrado", "Peso e resistência de equipe do meio", { chassi: 3 }),
    P("ch-leve", "Fibra leve", "Arranca e freia melhor, amassa mais", { chassi: 4 }),
    P("ch-ultra", "Ultraleve", "O mais leve: delicado fora do asfalto", { chassi: 5 }) ] },
  { id: "suspensao", nome: "Suspensão", icone: "🔧", padrao: "su-padrao", pecas: [
    P("su-simples", "Rígida simples", "Barata, gasta mais o pneu", { suspensao: 2 }),
    P("su-padrao", "Padrão", "Boa nas zebras e na grama", { suspensao: 3 }),
    P("su-adaptativa", "Adaptativa", "Poupa o pneu e passa melhor nas zebras", { suspensao: 4 }),
    P("su-pullrod", "Pull-rod de ponta", "A melhor com o pneu e com a aderência", { suspensao: 5 }) ] },
  { id: "freios", nome: "Freios", icone: "🛑", padrao: "fr-carbono", pecas: [
    P("fr-aco", "Aço", "Freia mais cedo", { freios: 2 }),
    P("fr-carbono", "Carbono padrão", "Distância de frenagem normal", { freios: 3 }),
    P("fr-ventilado", "Carbono ventilado", "Freia mais tarde antes da curva", { freios: 4 }),
    P("fr-competicao", "Competição", "O disco maior do grid", { freios: 5 }) ] },
  { id: "cambio", nome: "Câmbio", icone: "⚙️", padrao: "cb-padrao", pecas: [
    P("cb-basico", "Básico", "Chance maior de quebrar", { confiab: 2 }),
    P("cb-padrao", "Padrão", "Chance de quebra normal", { confiab: 3 }),
    P("cb-reforcado", "Reforçado", "Quebra menos", { confiab: 4 }),
    P("cb-titanio", "Titânio", "Quase não quebra", { confiab: 5 }) ] },
];
const POR_ID = {}; for (const c of CATEGORIAS) for (const p of c.pecas) POR_ID[p.id] = { ...p, cat: c.id };
const IDS = CATEGORIAS.map((c) => c.id);

const pecasPadrao = () => Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.padrao]));
// as peças escolhidas viram os níveis (cada um de 0 a MAX_NIVEL) que o resto do jogo já entende
function montagemDePecas(pecas) {
  const m = Object.fromEntries(NIVEIS.map((k) => [k, 0]));
  for (const c of CATEGORIAS) { const p = POR_ID[pecas && pecas[c.id]]; if (p && p.cat === c.id) for (const k of NIVEIS) m[k] += p.nivel[k] || 0; }
  for (const k of NIVEIS) m[k] = Math.min(Equipes.MAX_NIVEL, m[k]);
  return m;
}
const custoDePecas = (pecas) => CATEGORIAS.reduce((s, c) => { const p = POR_ID[pecas && pecas[c.id]]; return s + (p && p.cat === c.id ? p.custo : 0); }, 0);

// Confere a escolha: uma peça válida por categoria, nada além delas e o custo dentro do orçamento da equipe (mais o bônus).
// Devolve { ok, pecas, montagem, custo } ou { ok: false, erro }.
function validarPecas(equipeId, pecas, bonus = 0) {
  const eq = Equipes.EQUIPES[equipeId];
  if (!eq) return { ok: false, erro: "Equipe inválida." };
  if (!pecas || typeof pecas !== "object" || Array.isArray(pecas)) return { ok: false, erro: "Peças inválidas." };
  for (const k of Object.keys(pecas)) if (!IDS.includes(k)) return { ok: false, erro: "Categoria desconhecida." };
  const limpa = {};
  for (const c of CATEGORIAS) {
    const p = typeof pecas[c.id] === "string" ? POR_ID[pecas[c.id]] : null;
    if (!p || p.cat !== c.id) return { ok: false, erro: `Escolha uma peça válida em ${c.nome}.` };
    limpa[c.id] = p.id;
  }
  const custo = custoDePecas(limpa), limite = eq.orcamento + Math.max(0, Math.min(4, Number(bonus) || 0));
  if (custo > limite) return { ok: false, erro: `As peças passam do orçamento (${custo} de ${limite} pontos).` };
  return { ok: true, pecas: limpa, montagem: montagemDePecas(limpa), custo };
}

// O que os servidores usam: `d` é o pedido ({ pecas } novo, ou { montagem } do formato antigo). Devolve { ok, montagem, pecas|null }.
function resolver(equipeId, d, bonus = 0) {
  d = d || {};
  if (d.pecas != null) { const v = validarPecas(equipeId, d.pecas, bonus); return v.ok ? { ok: true, montagem: v.montagem, pecas: v.pecas } : v; }
  const v = Equipes.validar(equipeId, d.montagem, bonus);
  return v.ok ? { ok: true, montagem: v.montagem, pecas: null } : v;
}

// Um save antigo (só os níveis): acha o conjunto de peças que dá o nível mais parecido sem passar do `limite` (empate: o mais
// barato). Se o conjunto der exatamente os mesmos níveis, a conversão não perde nada.
const _cache = new Map();
function migrarMontagem(montagem, limite = 99) {
  const alvo = NIVEIS.map((k) => Math.max(0, Math.min(Equipes.MAX_NIVEL, Math.round(+(montagem || {})[k] || 0))));
  const chave = alvo.join("-") + ":" + limite;
  if (_cache.has(chave)) return { ..._cache.get(chave) };
  let melhor = null, dist = Infinity, custoMelhor = Infinity;
  const atual = {}, nv = new Array(6).fill(0);
  (function rec(i, custo) {
    if (custo > limite) return;
    if (i === CATEGORIAS.length) {
      let d = 0; for (let j = 0; j < 6; j++) d += Math.abs(Math.min(Equipes.MAX_NIVEL, nv[j]) - alvo[j]);
      if (d < dist || (d === dist && custo < custoMelhor)) { dist = d; custoMelhor = custo; melhor = { ...atual }; }
      return;
    }
    const c = CATEGORIAS[i];
    for (const p of c.pecas) { atual[c.id] = p.id; NIVEIS.forEach((k, j) => (nv[j] += p.nivel[k] || 0)); rec(i + 1, custo + p.custo); NIVEIS.forEach((k, j) => (nv[j] -= p.nivel[k] || 0)); }
  })(0, 0);
  const r = melhor || pecasPadrao();
  _cache.set(chave, r);
  return { ...r };
}
// As peças de uma equipe: a escolha guardada, se ainda vale, senão a conversão da montagem de níveis
function pecasDe(equipeId, montagem, pecas, bonus = 0) {
  if (pecas) { const v = validarPecas(equipeId, pecas, bonus); if (v.ok) return v.pecas; }
  const eq = Equipes.EQUIPES[equipeId];
  return migrarMontagem(montagem || Equipes.montagemPadrao(equipeId), (eq ? eq.orcamento : 20) + Math.max(0, Math.min(4, Number(bonus) || 0)));
}

const api = { NIVEIS, ROTULO, CATEGORIAS, POR_ID, pecasPadrao, montagemDePecas, custoDePecas, validarPecas, resolver, migrarMontagem, pecasDe };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Pecas = api;
})(typeof window !== "undefined" ? window : globalThis);
