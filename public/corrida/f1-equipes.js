// Corrida da Galera — as equipes de F1 e a montagem do carro (planos/temporada-f1.md). UMD: o servidor confere e o
// navegador mostra, com as mesmas contas. Cada equipe tem um ORÇAMENTO EM PONTOS (as de ponta com mais, as do fundo com
// menos) para distribuir em seis peças; cada ponto é um nível da peça (de 0 a MAX_NIVEL). A montagem é um objeto
// simples { motor, aero, chassi, freios, suspensao, confiab } de inteiros: é isso que a sala guarda (e, mais tarde, o save
// da temporada). `specDaMontagem` transforma a montagem nos campos que `physics` (fisica.js) e os robôs já usam.
// Cada peça ajuda um eixo e custa um pouco em outro, e todo número fica entre o pior e o melhor dos cinco carros de
// antes (`LIMITES`): não existe carro quebrado, e com o mesmo orçamento nenhuma montagem é melhor em tudo.
(function (root) {

const MAX_NIVEL = 8;
const EMERGENCIA = 0.35; // carro quebrado: anda no modo de emergência, com essa fração da velocidade final (e metade da aceleração)
const ORDEM = ["motor", "aero", "chassi", "freios", "suspensao", "confiab"];
// o que cada peça faz (os textos da tela de montagem); `bom` e `custa` são as contas resumidas
const PECAS = {
  motor: { nome: "Motor", icone: "🔥", bom: "velocidade final e aceleração", custa: "quebra mais", desc: "Mais potência: o carro chega mais longe na reta e arranca melhor, mas o motor puxado quebra com mais facilidade." },
  aero: { nome: "Aerodinâmica", icone: "🌬️", bom: "aderência e volante nas curvas, e o DRS rende mais", custa: "velocidade final e aceleração", desc: "Mais carga: o carro cola no chão e vira mais, mas o arrasto cobra na reta. Com o DRS aberto, a asa de muita carga ganha mais." },
  chassi: { nome: "Chassi leve", icone: "⚖️", bom: "aceleração e frenagem", custa: "resistência (muro e grama)", desc: "Menos peso: arranca e freia melhor, mas amassa mais na batida e sofre mais fora do asfalto." },
  freios: { nome: "Freios", icone: "🛑", bom: "distância de frenagem", custa: "só os pontos", desc: "Discos maiores: freia mais tarde antes da curva e perde menos tempo." },
  suspensao: { nome: "Suspensão", icone: "🔧", bom: "zebras, grama e desgaste do pneu", custa: "só os pontos", desc: "Mais curso e trabalho: passa melhor pelas zebras e pela grama, escorrega com menos perda e poupa o pneu." },
  confiab: { nome: "Confiabilidade", icone: "🧰", bom: "chance de quebra e câmbio", custa: "só os pontos", desc: "Câmbio e motor reforçados: a chance de quebrar na corrida cai. Quebrou, o carro anda no modo de emergência." },
};

// O pior e o melhor de cada número entre os cinco carros de antes (`CARROS` em pistas.js): a montagem nunca sai daí.
const LIMITES = {
  vmax: [236, 360], acc: [58, 110], brake: [400, 520], grip: [380, 500], kin: [0.65, 0.88], turn: [2.0, 3.0],
  scrub: [0.35, 1.1], offMax: [85, 140], wall: [0.45, 0.8],
};
const entre = (v, [a, b]) => Math.max(a, Math.min(b, v));
const arredonda = (v, casas = 2) => { const k = 10 ** casas; return Math.round(v * k) / k; };

// As 11 equipes de 2026 (os ids de f1-pilotos-2026.js), na ordem de força de 2025. `orcamento`: pontos para gastar;
// `padrao`: o carro de cada uma (a distribuição que os robôs usam e a que o chefe humano recebe ao entrar).
const EQUIPES = {
  mclaren: { orcamento: 20, padrao: { motor: 4, aero: 4, chassi: 3, freios: 3, suspensao: 3, confiab: 3 }, nota: "O carro mais completo do grid." },
  ferrari: { orcamento: 19, padrao: { motor: 5, aero: 3, chassi: 3, freios: 3, suspensao: 2, confiab: 3 }, nota: "Motor forte e boa de reta." },
  mercedes: { orcamento: 19, padrao: { motor: 5, aero: 3, chassi: 3, freios: 2, suspensao: 3, confiab: 3 }, nota: "Motor forte e confiável." },
  "red-bull": { orcamento: 19, padrao: { motor: 3, aero: 5, chassi: 3, freios: 3, suspensao: 3, confiab: 2 }, nota: "Muita carga aerodinâmica: manda nas curvas." },
  williams: { orcamento: 17, padrao: { motor: 4, aero: 2, chassi: 3, freios: 3, suspensao: 2, confiab: 3 }, nota: "Pouco arrasto: voa na reta." },
  "aston-martin": { orcamento: 17, padrao: { motor: 3, aero: 4, chassi: 3, freios: 2, suspensao: 3, confiab: 2 }, nota: "Bom de curva e gentil com o pneu." },
  "racing-bulls": { orcamento: 16, padrao: { motor: 3, aero: 4, chassi: 2, freios: 3, suspensao: 2, confiab: 2 }, nota: "Carro de curva, na casa do meio." },
  haas: { orcamento: 16, padrao: { motor: 4, aero: 2, chassi: 3, freios: 2, suspensao: 2, confiab: 3 }, nota: "Carro de reta e fácil de manter inteiro." },
  audi: { orcamento: 15, padrao: { motor: 3, aero: 3, chassi: 2, freios: 3, suspensao: 2, confiab: 2 }, nota: "Equipe nova, tudo no básico." },
  alpine: { orcamento: 15, padrao: { motor: 2, aero: 4, chassi: 3, freios: 2, suspensao: 2, confiab: 2 }, nota: "Aposta nas curvas; falta motor." },
  cadillac: { orcamento: 15, padrao: { motor: 3, aero: 2, chassi: 3, freios: 2, suspensao: 2, confiab: 3 }, nota: "Estreante: simples e resistente." },
};

const soma = (m) => ORDEM.reduce((s, k) => s + (m[k] || 0), 0);
const custoDaMontagem = soma; // 1 ponto por nível

// A montagem de uma equipe, conferida: todas as seis peças, inteiros de 0 a MAX_NIVEL, nada além delas e a soma dentro
// do orçamento. Devolve { ok: true, montagem } (uma cópia limpa) ou { ok: false, erro }.
function validar(equipeId, m) {
  const eq = EQUIPES[equipeId];
  if (!eq) return { ok: false, erro: "Equipe inválida." };
  if (!m || typeof m !== "object" || Array.isArray(m)) return { ok: false, erro: "Montagem inválida." };
  for (const k of Object.keys(m)) if (!ORDEM.includes(k)) return { ok: false, erro: "Peça desconhecida." };
  const limpa = {};
  for (const k of ORDEM) {
    const v = m[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_NIVEL) return { ok: false, erro: `Nível inválido em ${PECAS[k].nome} (de 0 a ${MAX_NIVEL}).` };
    limpa[k] = v;
  }
  if (soma(limpa) > eq.orcamento) return { ok: false, erro: `A montagem passa do orçamento (${soma(limpa)} de ${eq.orcamento} pontos).` };
  return { ok: true, montagem: limpa };
}
const montagemPadrao = (equipeId) => ({ ...(EQUIPES[equipeId] || EQUIPES.mclaren).padrao });
const sobra = (equipeId, m) => EQUIPES[equipeId].orcamento - soma(m);

// Estilo do carro: reta (mais motor que carga), curva (mais carga que motor) ou equilibrado.
function estilo(m) { const d = m.motor - m.aero; return d >= 2 ? "reta" : d <= -2 ? "curva" : "equilibrado"; }
const ESTILOS = { reta: { nome: "Carro de reta", inspo: "pouca asa, motor forte" }, curva: { nome: "Carro de curva", inspo: "muita carga aerodinâmica" }, equilibrado: { nome: "Carro equilibrado", inspo: "acerto sem exagero" } };

// A montagem vira o `spec` da física (os campos de `CARROS`) mais três do F1:
//   desgaste: quanto o pneu gasta (1 é o normal) · drs: quanto o DRS rende (1 é o normal) · quebra: chance de o carro quebrar na corrida
// `m` já tem que ter passado por `validar` (ou ser uma padrão); níveis fora de 0..MAX_NIVEL são cortados mesmo assim.
function specDaMontagem(m, nome = "Carro de F1") {
  const n = {}; for (const k of ORDEM) n[k] = Math.max(0, Math.min(MAX_NIVEL, Math.round(+m[k] || 0)));
  const { motor, aero, chassi, freios, suspensao, confiab } = n, e = estilo(n);
  return {
    name: nome, inspo: ESTILOS[e].inspo, desc: ESTILOS[e].nome, estilo: e, chave: ORDEM.map((k) => n[k]).join("-"),
    vmax: arredonda(entre(286 + 6 * motor - 2.5 * aero, LIMITES.vmax), 1),
    acc: arredonda(entre(66 + 1.6 * motor + 3.5 * chassi - 0.4 * aero, LIMITES.acc), 1),
    grip: arredonda(entre(380 + 13 * aero + 3 * suspensao, LIMITES.grip), 1),
    turn: arredonda(entre(1.9 + 0.15 * aero + 0.05 * suspensao, LIMITES.turn), 3),
    brake: arredonda(entre(415 + 10 * freios + 3 * chassi, LIMITES.brake), 1),
    kin: arredonda(entre(0.65 + 0.028 * suspensao, LIMITES.kin), 3),
    scrub: arredonda(entre(1.1 - 0.075 * suspensao, LIMITES.scrub), 3),
    offMax: arredonda(entre(103 + 4.5 * suspensao - 2.2 * chassi, LIMITES.offMax), 1),
    wall: arredonda(entre(0.8 - 0.04 * chassi, LIMITES.wall), 3),
    desgaste: arredonda(1.25 - 0.07 * suspensao, 3),
    drs: arredonda(0.6 + 0.12 * aero, 3),
    quebra: arredonda(0.01 + 0.008 * motor + 0.01 * (MAX_NIVEL - confiab), 4),
  };
}
const pilotos = () => root.F1Pilotos || (typeof module !== "undefined" && module.exports ? require("./f1-pilotos-2026.js") : null); // o nome da equipe
const specDaEquipe = (equipeId, m) => specDaMontagem(m || montagemPadrao(equipeId), ((pilotos() || { EQUIPES: {} }).EQUIPES[equipeId] || {}).nome);

// A falha mecânica: `r` é um sorteio (0..1, o da semente do GP). Devolve em que fração da corrida o carro quebra (de 0,15 a
// 0,85), ou null se ele aguenta até o fim. A chance é `spec.quebra`.
function sortearFalha(r, spec) { return r() < spec.quebra ? Math.round((0.15 + 0.7 * r()) * 1000) / 1000 : null; }

// A ficha do carro para a tela: notas de 1 a 10 em cada eixo (reta, aceleração, curva, freio, resistência e confiabilidade)
const nota = (v, a, b) => Math.max(1, Math.min(10, Math.round(1 + ((v - a) / (b - a)) * 9)));
function ficha(s) {
  return [
    { id: "reta", rotulo: "Reta", nota: nota(s.vmax, 236, 360) },
    { id: "acc", rotulo: "Aceleração", nota: nota(s.acc, 58, 110) },
    { id: "curva", rotulo: "Curva", nota: nota(s.grip + s.turn * 40, 380 + 80, 500 + 120) },
    { id: "freio", rotulo: "Freio", nota: nota(s.brake, 415, 520) },
    { id: "resist", rotulo: "Resistência", nota: nota(s.offMax * 0.4 + s.wall * 100 + (1.25 - s.desgaste) * 60, 40, 110) },
    { id: "confiab", rotulo: "Confiabilidade", nota: nota(1 - s.quebra, 0.84, 0.99) },
  ];
}
// Os números que o servidor compara na hora de dizer "melhor em tudo": todos no sentido "maior é melhor"
const eixos = (s) => [s.vmax, s.acc, s.grip, s.turn, s.brake, s.kin, -s.scrub, s.offMax, s.wall, -s.desgaste, s.drs, -s.quebra];

const api = { MAX_NIVEL, EMERGENCIA, sortearFalha, ORDEM, PECAS, LIMITES, EQUIPES, ESTILOS, custoDaMontagem, validar, montagemPadrao, sobra, estilo, specDaMontagem, specDaEquipe, ficha, eixos };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Equipes = api;
})(typeof window !== "undefined" ? window : globalThis);
