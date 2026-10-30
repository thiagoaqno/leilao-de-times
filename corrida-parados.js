// Corrida da Galera (regras de F1) — o carro parado na pista não trava o pelotão. Um carro (humano ou robô) parado, ou muito lento e
// atravessado, por mais de PARADO_MS vira FANTASMA (`p.fantAte`: sem colisão para os dois lados, semitransparente na tela), é recolocado
// alinhado na pista como o "↺ Pista" e continua fantasma por FANTASMA_MS. Depois volta ao normal. Assim um acidente numa curva não
// engaveta 20 carros, e nenhum robô fica mais de ~3 s parado fora do box (2 s de espera + a recolocação).
const Sim = require("./public/corrida/sim.js");
const T = require("./public/corrida/pistas.js");

const PARADO_MS = 2000, FANTASMA_MS = 2000;
const V_PARADO = 12;        // u/s: abaixo disto o carro está parado
const V_LENTO = 40, COS_ATRAVESSADO = 0.35; // lento (menos de 40 u/s) e a mais de ~70 graus do rumo da pista: atravessado
const LARGADA_MS = 6000;    // na largada (e na primeira curva) o pelotão ainda está se arrumando: ninguém é fantasma

const carroDe = (p) => (p.sim ? p.sim.c : p.ia && p.ia.sim) || null;
function parado(c, tr) {
  const v = Math.abs(c.v || 0);
  if (v < V_PARADO) return true;
  if (v >= V_LENTO) return false;
  const q = tr.pts[((c.idx % tr.n) + tr.n) % tr.n];
  return Math.cos(c.a) * q.tx + Math.sin(c.a) * q.ty < COS_ATRAVESSADO;
}
// recoloca o carro alinhado no meio da pista (como o "reiniciar"), parado, e zera o que prende o robô
function recolocar(p, c, tr) {
  Sim.voltarParaPista(c, tr, null);
  c.inst = 0; c.instK = 0; c.rIns = 0;
  const ia = p.ia;
  if (ia) { Object.assign(ia, { v: 0, desvio: 0, ult: null, defesa: null, erro: null, parado: 0, refT: null, susto: 0, lat: 0 }); }
}
// Chamado a cada ~100 ms pelo laço da direção de prova. Devolve true se algum carro virou ou deixou de ser fantasma (o estado público muda).
function passo(room, agora) {
  if (room.phase !== "race" || room.config.regras !== "f1" || !room.startAt || agora < room.startAt + LARGADA_MS) return false;
  const tr = Sim.criarPista(T.PISTAS[room.config.pista], room.config.pista), seguro = !!(room.direcao && room.direcao.safety);
  let mudou = false;
  for (const id of room.order) {
    const p = room.players[id]; if (!p) continue;
    if (p.fantAte && agora >= p.fantAte) { p.fantAte = 0; mudou = true; }
    const c = carroDe(p);
    if (!c || p.finish != null || p.dnf || p.box || (c.box && c.box.fase) || c.air || seguro || (p.fantAte && agora < p.fantAte)) { p.paradoDesde = 0; continue; }
    if (!parado(c, tr)) { p.paradoDesde = 0; continue; }
    if (!p.paradoDesde) { p.paradoDesde = agora; continue; }
    if (agora - p.paradoDesde < PARADO_MS) continue;
    recolocar(p, c, tr);
    p.fantAte = agora + FANTASMA_MS; p.paradoDesde = 0; p.recolocacoes = (p.recolocacoes || 0) + 1; mudou = true;
  }
  return mudou;
}
module.exports = { passo, parado, PARADO_MS, FANTASMA_MS };
