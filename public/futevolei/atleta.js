// Futevôlei da Galera — o atleta: o "controlador" de cada jogador na tela (posição, para onde olha, o pulo e as
// animações). As regras de movimento e de toque ficam em regras.js (o servidor manda); aqui é só o corpo.
//
// Duas regras de arquitetura:
// 1. O atleta NÃO cria malha nenhuma. Ele tem um transform (`raiz`, um THREE.Group que anda e gira) e um gancho de
//    skin: quem cuida das skins (bonecos.js, o mesmo da Pelada e do Tênis) monta o visual e entrega pronto com
//    `atleta.vestir(visual)`. O atleta só pendura o visual no transform e avisa quem estiver ouvindo (`aoVestir`).
//    Trocar de skin no meio do jogo é chamar `vestir` de novo (o visual antigo volta para quem o criou, via
//    `despir()`, para ser liberado da memória).
// 2. As animações saem por gatilhos, como no Animator da Unity: `atleta.disparar("cabeca")`, `disparar("shark")`...
//    O animador procura as juntas no visual (pernas, joelhos, braços, cotovelos, coluna, cabeça e corpo, que
//    os bonecos de caixinhas guardam em userData) e mexe nelas. Visual sem juntas: só o pulo e o giro do corpo.
//
// O golpe começa ANTES do toque: cada golpe tem o seu `impacto` (o momento em que o pé/cabeça/peito pega na bola).
// Quem sabe que a bola vai chegar chama `antecipar(golpe, opções, falta)` e o golpe começa de modo que o impacto caia
// daqui a `falta` segundos; quando o toque acontece de verdade, `confirmar(golpe, opções)` acerta o relógio (pula
// para o impacto se estava atrasado, ou começa já no impacto se ninguém antecipou).
//
// Gatilhos dos golpes: frente, lado, peito, cabeca, letra, calcanhar, voleio, bicicleta, shark, saque.
// Grupos (sorteiam uma versão): comemora, lamenta e mania (o que ele faz parado, sozinho, de vez em quando).
// Opções: { lado: 1 (bola à direita) ou −1, pulo: true (toque no alto), h (altura da bola), estilo (no shark:
// "voleio" ou "bicicleta") }.
import * as THREE from "three";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
// sobe e desce entre a e b (0 fora), com o pico no meio
const bump = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));
// vai de 0 a 1 entre a e b (suave)
const ease = (k, a, b) => { const t = clamp((k - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// entra até a, segura e sai depois de b
const segura = (k, a, b) => ease(k, 0, a) * (1 - ease(k, b, 1));
// chave de quadros: [[k, valor], ...] → valor em k (interpolação suave entre as chaves)
function chave(k, pts) {
  if (k <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) { const [k0, v0] = pts[i - 1], [k1, v1] = pts[i]; return lerp(v0, v1, ease(k, k0, k1)); }
  return pts[pts.length - 1][1];
}
const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];

// ----------------------------------------------------------------------
// As poses. k vai de 0 a 1 durante o clipe; P é a pose (os valores que a função muda, partindo do neutro); "K" é a
// perna/braço do lado da bola (a que chuta) e "A" o outro (o apoio); m = +1 com a direita, −1 com a esquerda (espelha
// os giros de lado). O boneco olha para −z: rotation.x positivo leva perna/braço para a frente; joelho negativo dobra
// para trás; coluna positiva inclina para trás; body.y é a altura do corpo (o pulo; negativo, agachado).
// dur: duração (s); impacto: o momento do toque na bola (fração de dur); salto: altura do pulo.
// ----------------------------------------------------------------------
const CLIPES = {
  // ---------- golpes ----------
  frente: { dur: 0.36, impacto: 0.5, pose(k, P, m) {
    P.legK.x = chave(k, [[0, 0], [0.3, -0.8], [0.5, 1.45], [0.72, 0.8], [1, 0]]); P.kneeK = chave(k, [[0, -0.2], [0.3, -1.25], [0.5, -0.05], [1, -0.2]]);
    P.spine.x = 0.25 * bump(k, 0.2, 0.9); P.armA.x = 0.7 * bump(k, 0.1, 0.95); P.armK.z = m * 0.6 * bump(k, 0.1, 0.95); P.kneeA = -0.35 * bump(k, 0, 1);
    P.spine.y = -m * 0.25 * bump(k, 0.2, 0.8);
  } },
  lado: { dur: 0.38, impacto: 0.5, pose(k, P, m) {
    const b = bump(k, 0.05, 0.98);
    P.legK.z = m * chave(k, [[0, 0], [0.3, 0.5], [0.5, 1.0], [0.75, 0.45], [1, 0]]); P.legK.y = -m * 0.9 * b; P.legK.x = 0.45 * b; P.kneeK = -0.55 * b;
    P.body.z = -m * 0.16 * b; P.armA.z = -m * 0.75 * b; P.armK.z = m * 0.45 * b; P.kneeA = -0.4 * b; P.spine.y = m * 0.2 * b;
  } },
  peito: { dur: 0.4, impacto: 0.42, pose(k, P) {
    const b = bump(k, 0, 1);
    P.spine.x = chave(k, [[0, 0], [0.42, 0.62], [0.65, 0.15], [1, 0]]); P.head.x = -0.35 * b;
    P.armK.z = 1.15 * b; P.armA.z = -1.15 * b; P.armK.x = P.armA.x = -0.25 * b; P.kneeK = P.kneeA = chave(k, [[0, -0.2], [0.3, -0.55], [0.5, -0.1], [1, -0.2]]);
  } },
  cabeca: { dur: 0.4, impacto: 0.55, pose(k, P) {
    P.spine.x = chave(k, [[0, 0], [0.38, 0.38], [0.55, -0.45], [1, 0]]); P.head.x = chave(k, [[0, 0], [0.38, 0.32], [0.55, -0.6], [1, 0]]);
    const b = bump(k, 0, 1); P.armK.x = P.armA.x = 0.5 * b; P.armK.z = 0.65 * b; P.armA.z = -0.65 * b; P.kneeK = P.kneeA = -0.45 * bump(k, 0, 0.5);
  } },
  letra: { dur: 0.46, impacto: 0.55, pose(k, P, m) {
    // a perna que chuta passa por trás da de apoio e bate na bola do outro lado
    P.legK.x = chave(k, [[0, 0], [0.3, -0.6], [0.55, -0.95], [1, 0]]); P.legK.z = -m * chave(k, [[0, 0], [0.3, 0.35], [0.55, 1.05], [1, 0]]);
    P.kneeK = chave(k, [[0, 0], [0.3, -1.5], [0.55, -0.5], [1, 0]]); P.spine.y = m * 0.5 * bump(k, 0.05, 0.98); P.spine.x = -0.2 * bump(k, 0.15, 0.9);
    P.armA.z = -m * 0.85 * bump(k, 0.05, 0.98); P.armK.z = m * 0.65 * bump(k, 0.05, 0.98); P.kneeA = -0.4 * bump(k, 0, 1);
  } },
  calcanhar: { dur: 0.4, impacto: 0.55, pose(k, P) {
    P.legK.x = chave(k, [[0, 0], [0.3, 0.25], [0.55, -1.25], [1, 0]]); P.kneeK = chave(k, [[0, 0], [0.3, -1.75], [0.55, -0.35], [1, 0]]);
    P.spine.x = -0.42 * bump(k, 0.05, 0.98); P.head.x = 0.35 * bump(k, 0.15, 0.9); P.armK.x = P.armA.x = 0.5 * bump(k, 0.05, 0.95);
  } },
  voleio: { dur: 0.44, impacto: 0.5, salto: 0.3, pose(k, P, m) {
    const b = bump(k, 0, 1);
    P.body.z = -m * 0.85 * b; P.legK.z = m * chave(k, [[0, 0], [0.32, 0.9], [0.5, 1.6], [0.78, 1.0], [1, 0]]); P.legK.x = 0.4 * b;
    P.kneeK = chave(k, [[0, -0.2], [0.32, -1.15], [0.5, -0.1], [1, -0.2]]); P.armA.z = -m * 1.25 * b; P.armK.z = m * 0.35 * b; P.legA.z = -m * 0.25 * b;
  } },
  bicicleta: { dur: 0.72, impacto: 0.5, salto: 1.05, pose(k, P) {
    // pula de costas, o corpo deita no ar, a perna de apoio sobe primeiro e a outra bate por cima da cabeça (tesoura)
    P.body.x = chave(k, [[0, 0], [0.15, 0.45], [0.5, 1.85], [0.8, 1.2], [1, 0]]);
    P.legA.x = chave(k, [[0, 0], [0.25, 1.9], [0.5, 1.0], [1, 0]]); P.legK.x = chave(k, [[0, 0], [0.3, 0.6], [0.5, 2.7], [0.75, 1.6], [1, 0]]);
    P.kneeK = chave(k, [[0, 0], [0.3, -1.2], [0.5, -0.05], [1, 0]]); P.kneeA = chave(k, [[0, 0], [0.25, -0.2], [0.5, -1.2], [1, 0]]);
    const b = bump(k, 0.05, 0.98); P.armK.z = 1.3 * b; P.armA.z = -1.3 * b; P.armK.x = P.armA.x = -0.6 * b;
  } },
  // o Shark Attack é com o pé: de voleio (pula de lado, a perna sobe bem alto por cima da rede e desce na bola) ou de
  // bicicleta (a tesoura de costas, mais alta)
  shark: { dur: 0.66, impacto: 0.5, salto: 1.15, pose(k, P, m) {
    const b = bump(k, 0.02, 0.99);
    P.body.z = m * chave(k, [[0, 0], [0.3, 0.6], [0.5, 0.95], [0.8, 0.4], [1, 0]]);
    P.legK.z = m * chave(k, [[0, 0], [0.32, 1.5], [0.45, 2.35], [0.56, 1.1], [1, 0]]); P.legK.x = 0.7 * b; P.kneeK = chave(k, [[0, 0], [0.32, -1.3], [0.45, -0.1], [1, 0]]);
    P.legA.x = -0.3 * b; P.kneeA = -0.9 * b; P.armA.z = -m * 1.45 * b; P.armK.z = m * 0.55 * b; P.spine.x = 0.2 * b;
  } },
  sharkBicicleta: { dur: 0.72, impacto: 0.5, salto: 1.3, pose(k, P, m) { CLIPES.bicicleta.pose(k, P, m); } },
  saque: { dur: 0.5, impacto: 0.6, pose(k, P, m) {
    P.legK.x = chave(k, [[0, 0], [0.4, -0.95], [0.6, 1.6], [0.85, 0.8], [1, 0]]); P.kneeK = chave(k, [[0, -0.2], [0.4, -1.45], [0.6, -0.05], [1, -0.2]]);
    P.spine.x = 0.3 * bump(k, 0.3, 0.95); P.armA.x = 0.9 * bump(k, 0.15, 0.98); P.armK.z = m * 0.85 * bump(k, 0.15, 0.98); P.kneeA = -0.4 * bump(k, 0.1, 0.95);
    P.spine.y = -m * 0.3 * bump(k, 0.3, 0.9);
  } },
  // ---------- comemorações ----------
  comemora: { dur: 1.3, salto: 0.38, saltos: 2, pose(k, P) { // dois pulos com os braços para cima
    const s = segura(k, 0.12, 0.85); P.armK.x = P.armA.x = -2.9 * s; P.armK.z = 0.3 * s; P.armA.z = -0.3 * s; P.elbowK = P.elbowA = 0.2;
  } },
  soco: { dur: 1.4, pose(k, P, m) { // soco no ar: o braço sobe e desce três vezes, gritando
    const s = segura(k, 0.1, 0.88); P.armK.x = -s * (2.3 + 0.45 * Math.sin(k * Math.PI * 6)); P.elbowK = s * (0.5 + 0.6 * Math.max(0, -Math.sin(k * Math.PI * 6)));
    P.armA.x = 0.35 * s; P.elbowA = 1.6 * s; P.kneeK = P.kneeA = -0.5 * s; P.legK.x = P.legA.x = 0.25 * s; P.spine.x = -0.3 * s; P.head.x = -0.35 * s; P.body.y = -0.08 * s;
    P.spine.y = m * 0.2 * s;
  } },
  danca: { dur: 1.6, pose(k, P) { // a dancinha: o quadril vai e volta, os braços acompanham
    const s = segura(k, 0.1, 0.9), w = Math.sin(k * Math.PI * 6);
    P.body.z = 0.14 * w * s; P.spine.z = -0.25 * w * s; P.armK.z = (0.9 + 0.5 * w) * s; P.armA.z = -(0.9 - 0.5 * w) * s; P.elbowK = P.elbowA = 1.3 * s;
    P.kneeK = -0.45 * s * (0.5 + 0.5 * w); P.kneeA = -0.45 * s * (0.5 - 0.5 * w); P.head.z = 0.2 * w * s; P.body.y = 0.04 * Math.abs(w) * s;
  } },
  aviao: { dur: 1.5, pose(k, P, m) { // o aviãozinho: braços abertos, inclinando de um lado para o outro
    const s = segura(k, 0.12, 0.88), w = Math.sin(k * Math.PI * 3);
    P.armK.z = m * 1.5 * s; P.armA.z = -m * 1.5 * s; P.body.z = 0.3 * w * s; P.spine.y = 0.3 * w * s; P.kneeK = P.kneeA = -0.25 * s; P.head.x = -0.25 * s;
  } },
  // ---------- frustrações ----------
  lamenta: { dur: 1.4, pose(k, P) { // as mãos na cabeça
    const s = segura(k, 0.15, 0.85); P.armK.x = P.armA.x = -2.5 * s; P.armK.z = 0.5 * s; P.armA.z = -0.5 * s; P.elbowK = P.elbowA = 2.0 * s; P.spine.x = -0.25 * s; P.head.x = 0.3 * s;
    P.head.y = 0.25 * Math.sin(k * Math.PI * 4) * s;
  } },
  agacha: { dur: 1.6, pose(k, P) { // agacha com as mãos nos joelhos
    const s = segura(k, 0.18, 0.82); P.kneeK = P.kneeA = -1.3 * s; P.legK.x = P.legA.x = 0.7 * s; P.spine.x = -0.75 * s; P.armK.x = P.armA.x = 0.75 * s; P.elbowK = P.elbowA = 0.25 * s;
    P.head.x = -0.15 * s; P.body.y = -0.24 * s;
  } },
  reclama: { dur: 1.4, pose(k, P) { // braços abertos com a palma para cima, balançando a cabeça
    const s = segura(k, 0.12, 0.85); P.armK.x = P.armA.x = 0.55 * s; P.armK.z = 0.95 * s; P.armA.z = -0.95 * s; P.elbowK = P.elbowA = 1.25 * s; P.spine.x = 0.15 * s;
    P.head.y = 0.4 * Math.sin(k * Math.PI * 6) * s; P.body.y = 0.06 * bump(k, 0.1, 0.3);
  } },
  chutaAreia: { dur: 1.3, pose(k, P, m) { // chuta a areia de raiva e põe a mão na cintura
    P.legK.x = chave(k, [[0, 0], [0.2, -0.45], [0.32, 0.95], [0.5, 0], [1, 0]]); P.kneeK = chave(k, [[0, -0.2], [0.2, -0.9], [0.32, -0.1], [1, -0.2]]);
    const s = segura(k, 0.15, 0.85); P.spine.x = -0.3 * s; P.head.x = 0.4 * s; P.armK.z = m * 0.6 * ease(k, 0.45, 0.6) * s; P.elbowK = 1.8 * ease(k, 0.45, 0.6) * s; P.armK.x = -0.3 * s;
    P.armA.z = -m * 0.6 * ease(k, 0.45, 0.6) * s; P.elbowA = 1.8 * ease(k, 0.45, 0.6) * s;
  } },
  // ---------- manias (parado, esperando) ----------
  alonga: { dur: 2.2, pose(k, P) { // alonga os braços por cima da cabeça, inclinando para os lados
    const s = segura(k, 0.2, 0.8); P.armK.x = P.armA.x = -2.95 * s; P.elbowK = P.elbowA = 0.3 * s; P.spine.z = 0.28 * Math.sin(k * Math.PI * 2) * s; P.spine.x = 0.15 * s;
  } },
  ajeita: { dur: 2.4, pose(k, P) { // mãos na cintura, olhando em volta
    const s = segura(k, 0.15, 0.85); P.armK.z = 0.6 * s; P.armA.z = -0.6 * s; P.armK.x = P.armA.x = -0.25 * s; P.elbowK = P.elbowA = 1.8 * s; P.head.y = 0.5 * Math.sin(k * Math.PI * 2) * s;
  } },
  pescoco: { dur: 1.8, pose(k, P) { // gira o pescoço e solta os ombros
    const s = segura(k, 0.15, 0.85), a = k * Math.PI * 4; P.head.z = 0.3 * Math.sin(a) * s; P.head.x = 0.25 * Math.cos(a) * s; P.armK.z = 0.2 * Math.max(0, Math.sin(a)) * s; P.armA.z = -0.2 * Math.max(0, -Math.sin(a)) * s;
  } },
  areiaPe: { dur: 1.6, pose(k, P, m) { // ajeita a areia com o pé
    const s = segura(k, 0.15, 0.85), w = Math.sin(k * Math.PI * 6); P.legK.x = 0.25 * s; P.legK.z = m * 0.2 * w * s; P.kneeK = -0.2 * s; P.head.x = 0.45 * s; P.spine.x = -0.15 * s;
  } },
};
const GRUPOS = { comemora: ["comemora", "soco", "danca", "aviao"], lamenta: ["lamenta", "agacha", "reclama", "chutaAreia"], mania: ["alonga", "ajeita", "pescoco", "areiaPe"] };
const GOLPES_DE_BOLA = ["frente", "lado", "peito", "cabeca", "letra", "calcanhar", "voleio", "bicicleta", "shark", "sharkBicicleta", "saque"];
export const GATILHOS = [...Object.keys(CLIPES), ...Object.keys(GRUPOS)];
const nomeDoClipe = (g, o = {}) => (g === "shark" && o.estilo === "bicicleta" ? "sharkBicicleta" : g);
// quanto tempo o golpe leva do começo até pegar na bola (s)
export const ateImpacto = (g, o) => { const c = CLIPES[nomeDoClipe(g, o)]; return c && c.impacto != null ? c.dur * c.impacto : 0; };

// ----------------------------------------------------------------------
// O animador: a base (respiração, peso trocando de perna, o quiquinho de quem espera a bola, a corrida de frente e de
// lado), o clipe por cima e, no fim, a suavização: cada junta vai atrás do alvo com uma mola rápida, então nada pula.
// ----------------------------------------------------------------------
const neutra = () => ({ legK: { x: 0, y: 0, z: 0 }, legA: { x: 0, y: 0, z: 0 }, kneeK: 0, kneeA: 0, armK: { x: 0, y: 0, z: 0 }, armA: { x: 0, y: 0, z: 0 },
  elbowK: 0.35, elbowA: 0.35, spine: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 }, body: { x: 0, y: 0, z: 0 } });
const PARTES = ["legK", "legA", "armK", "armA", "spine", "head", "body"];
class Animador {
  constructor() { this.clip = null; this.fase = 0; this.passoAnt = 0; this.t = Math.random() * 10; this.parado = 0; this.proxMania = 3 + Math.random() * 5; this.s = null; }
  disparar(gatilho, o = {}, t0 = 0) {
    if (GRUPOS[gatilho]) gatilho = sorteia(GRUPOS[gatilho]);
    gatilho = nomeDoClipe(gatilho, o);
    const C = CLIPES[gatilho]; if (!C) return;
    const salto = Math.max(C.salto || 0, o.pulo ? clamp((o.h || 2.4) - 1.75, 0.3, 1.1) : 0);
    this.clip = { C, nome: gatilho, t: clamp(t0, 0, C.dur), m: o.lado < 0 ? -1 : o.lado > 0 ? 1 : Math.random() < 0.5 ? -1 : 1, salto, bola: GOLPES_DE_BOLA.includes(gatilho), confirmado: false };
    this.parado = 0;
  }
  // começa o golpe já, para o impacto cair daqui a `falta` segundos
  antecipar(gatilho, o, falta) {
    const nome = nomeDoClipe(gatilho, o), C = CLIPES[nome]; if (!C || C.impacto == null) return;
    if (this.clip && this.clip.bola && !this.clip.confirmado && this.clip.nome === nome) return; // já está indo
    this.disparar(gatilho, o, C.dur * C.impacto - falta);
  }
  // o toque aconteceu agora: o golpe tem que estar no impacto (se estava adiantado, espera; se atrasado, pula)
  confirmar(gatilho, o) {
    const nome = nomeDoClipe(gatilho, o), C = CLIPES[nome]; if (!C) return;
    const imp = C.dur * (C.impacto ?? 0);
    if (this.clip && this.clip.nome === nome && !this.clip.confirmado && this.clip.t <= imp + 0.08) this.clip.t = Math.max(this.clip.t, imp - 0.02);
    else this.disparar(gatilho, o, imp - 0.03);
    this.clip.m = o.lado < 0 ? -1 : 1; this.clip.confirmado = true;
  }
  get ocupado() { return !!this.clip; }
  // u: as juntas do visual (userData do boneco). mov: { vel, fwd, lat } (m/s, no referencial do atleta).
  // pronto: esperando a bola (base com o quiquinho). Devolve true quando um pé toca o chão (para a pegada na areia).
  atualizar(u, body, mov, dt, pronto) {
    this.t += dt;
    const t = this.t, vel = mov.vel, run = Math.min(1, vel / 5.5), fk = vel > 0.2 ? mov.fwd / vel : 1, lk = vel > 0.2 ? mov.lat / vel : 0;
    this.fase += dt * (4.5 + vel * 1.7);
    const sf = Math.sin(this.fase), P = neutra();
    // ---------- a base ----------
    const resp = Math.sin(t * 2.1), lado = Math.abs(lk) > 0.6 && run > 0.15; // respirando · correndo de lado (passo cruzado)
    const quica = pronto ? Math.abs(Math.sin(t * 7.5)) : 0, peso = pronto ? 0 : Math.sin(t * 0.8);
    const parado = 1 - run;
    // pernas: passada para a frente (ou para trás, de costas), ou o passo de lado abrindo e fechando
    const swing = lado ? 0 : sf * 0.85 * run * Math.sign(fk || 1);
    const abre = lado ? 0.12 + 0.32 * run * (0.5 + 0.5 * sf) : 0;
    P.legK.x = -swing; P.legA.x = swing;
    P.legK.z = abre + 0.1 * parado * (pronto ? 1.6 : 1) + 0.04 * peso * parado; P.legA.z = -abre - 0.1 * parado * (pronto ? 1.6 : 1) + 0.04 * peso * parado;
    P.kneeK = -(Math.max(0, sf) * 1.2 * run * (lado ? 0.4 : 1)) - (pronto ? 0.32 + 0.12 * quica : 0.08) * parado - (lado ? 0.3 * run : 0);
    P.kneeA = -(Math.max(0, -sf) * 1.2 * run * (lado ? 0.4 : 1)) - (pronto ? 0.32 + 0.12 * quica : 0.08) * parado - (lado ? 0.3 * run : 0);
    P.legK.x += (pronto ? 0.16 : 0.04) * parado; P.legA.x += (pronto ? 0.16 : 0.04) * parado;
    // braços: balançam contra as pernas; esperando a bola, ficam soltos na frente do corpo
    P.armK.x = swing * 0.85 + (pronto ? 0.35 : 0.04) * parado; P.armA.x = -swing * 0.85 + (pronto ? 0.35 : 0.04) * parado;
    P.armK.z = 0.16 + 0.04 * resp + (lado ? 0.35 * run : 0); P.armA.z = -0.16 - 0.04 * resp - (lado ? 0.35 * run : 0);
    P.elbowK = P.elbowA = 0.3 + 0.9 * run + (pronto ? 0.5 : 0) * parado;
    // tronco: inclina para a frente correndo (para trás, de costas), para dentro da curva de lado; respira parado
    P.spine.x = -(pronto ? 0.18 : 0.04) * parado - 0.22 * run * Math.max(0, fk) + 0.12 * run * Math.max(0, -fk) + 0.025 * resp;
    P.spine.y = -0.1 * swing;
    P.body.z = -0.13 * run * lk + 0.03 * peso * parado;
    P.body.y = Math.abs(sf) * 0.05 * run + 0.03 * quica * parado;
    P.head.x = (pronto ? 0.12 : 0.04) * parado + 0.1 * run; P.head.y = pronto ? 0 : 0.3 * Math.sin(t * 0.37) * parado;
    // ---------- o clipe por cima ----------
    let m = 1;
    if (this.clip) {
      const c = this.clip; c.t += dt; const k = clamp(c.t / c.C.dur, 0, 1); m = c.m;
      const q = neutra(); c.C.pose(k, q, m);
      // o pulo; em clipe de corpo inteiro (golpe), a base sai; em comemoração, as pernas da base continuam se não mexer
      q.body.y = q.body.y + c.salto * Math.abs(Math.sin(k * (c.C.saltos || 1) * Math.PI));
      const w = Math.min(ease(k, 0, 0.08), 1 - ease(k, 0.9, 1));
      const mix = (a, b) => lerp(a, b, w);
      // o clipe é escrito com K = o lado m; a base está com K = direita: troca antes de misturar
      if (m < 0) trocaLados(P);
      for (const p of PARTES) for (const e of ["x", "y", "z"]) P[p][e] = mix(P[p][e], q[p][e]);
      for (const e of ["kneeK", "kneeA", "elbowK", "elbowA"]) P[e] = mix(P[e], q[e]);
      if (m < 0) trocaLados(P);
      if (k >= 1) this.clip = null;
    } else if (!pronto && vel < 0.3) { // parado sem nada para fazer: de vez em quando, uma mania
      this.parado += dt;
      if (this.parado > this.proxMania) { this.disparar("mania"); this.proxMania = 4 + Math.random() * 6; }
    } else this.parado = 0;
    // ---------- suaviza (cada junta vai atrás do alvo) ----------
    const rapida = this.clip && this.clip.bola, a = 1 - Math.exp(-dt * (rapida ? 45 : 16));
    if (!this.s) this.s = JSON.parse(JSON.stringify(P));
    const S = this.s;
    for (const p of PARTES) for (const e of ["x", "y", "z"]) S[p][e] = lerp(S[p][e], P[p][e], p === "body" && e === "y" ? Math.max(a, 1 - Math.exp(-dt * 30)) : a);
    for (const e of ["kneeK", "kneeA", "elbowK", "elbowA"]) S[e] = lerp(S[e], P[e], a);
    if (!u || !u.legs) { if (body) aplicarCorpo(body, S.body); return false; }
    // K = direita (índice 1), A = esquerda (índice 0)
    u.legs[1].rotation.set(S.legK.x, S.legK.y, S.legK.z); u.legs[0].rotation.set(S.legA.x, S.legA.y, S.legA.z);
    u.knees[1].rotation.x = S.kneeK; u.knees[0].rotation.x = S.kneeA;
    u.arms[1].rotation.set(S.armK.x, S.armK.y, S.armK.z); u.arms[0].rotation.set(S.armA.x, S.armA.y, S.armA.z);
    u.elbows[1].rotation.x = S.elbowK; u.elbows[0].rotation.x = S.elbowA;
    u.spine.rotation.set(S.spine.x, S.spine.y, S.spine.z); u.head.rotation.set(S.head.x, S.head.y, S.head.z);
    if (u.capa) u.capa.rotation.x = -(0.08 + 0.7 * run);
    aplicarCorpo(u.body, S.body);
    // a pegada: cada vez que a passada cruza o meio (um pé no chão), correndo
    const pe = Math.sign(sf); let pisou = false;
    if (run > 0.25 && pe !== this.passoAnt && S.body.y < 0.08) pisou = true;
    this.passoAnt = pe;
    return pisou;
  }
}
// troca direita e esquerda de lugar (a pose passa a ter K = a perna/braço esquerdo). Os valores vão junto com o
// membro, sem mudar de sinal: os clipes já espelham os giros de lado com m.
function trocaLados(P) {
  for (const [a, b] of [["legK", "legA"], ["armK", "armA"]]) { const t = P[a]; P[a] = P[b]; P[b] = t; }
  for (const [a, b] of [["kneeK", "kneeA"], ["elbowK", "elbowA"]]) { const t = P[a]; P[a] = P[b]; P[b] = t; }
}
// gira o corpo inteiro em volta do quadril (não do pé) e sobe no pulo
const QUADRIL = 0.95;
function aplicarCorpo(b, c) {
  b.rotation.set(c.x, 0, c.z);
  b.position.set(QUADRIL * Math.sin(c.z), c.y + QUADRIL * (1 - Math.cos(c.x)) + QUADRIL * (1 - Math.cos(c.z)), -QUADRIL * Math.sin(c.x));
}

// ----------------------------------------------------------------------
// O atleta
// ----------------------------------------------------------------------
export class Atleta {
  constructor({ id, team }) {
    this.id = id; this.team = team;
    this.raiz = new THREE.Group(); this.raiz.name = "atleta:" + id; // o transform: é ele que anda e gira
    this.visual = null;
    this.yaw = team === "A" ? 0 : Math.PI;
    this.frente = this.yaw; // para onde fica de frente (o jogador, para a rede; quem assiste, para a quadra)
    this.vel = 0; this.pronto = false;
    this.animador = new Animador();
    this.aoVestir = new Set(); // quem quer saber quando a skin mudou (ex.: a sombra, o marcador)
    this.aoPisar = null;       // (x, z, lado) => {}: cada passada na areia (a pegada)
  }
  // ---------- gancho de skin ----------
  // O sistema de skins entrega o visual pronto (um Object3D com as juntas em userData) e o atleta só o pendura.
  vestir(visual) {
    const antigo = this.despir();
    this.visual = visual;
    if (visual) { visual.position.set(0, 0, 0); visual.rotation.set(0, 0, 0); this.raiz.add(visual); }
    for (const f of this.aoVestir) f(visual, antigo);
    return antigo;
  }
  despir() { const v = this.visual; if (v) this.raiz.remove(v); this.visual = null; return v; }
  get juntas() { return this.visual && this.visual.userData; }
  // ---------- gatilhos de animação ----------
  disparar(gatilho, opcoes) { this.animador.disparar(gatilho, opcoes); }
  antecipar(golpe, opcoes, falta) { this.animador.antecipar(golpe, opcoes, falta); }
  confirmar(golpe, opcoes) { this.animador.confirmar(golpe, opcoes); }
  get golpeNoAr() { const c = this.animador.clip; return c && c.bola && !c.confirmado ? c.nome : null; }
  // ---------- a cada quadro ----------
  // e: { x, z, vx, vz } do jogador (das regras); olhar: { x, z } para onde virar (ou null: de frente para a rede)
  atualizar(e, olhar, dt) {
    this.raiz.position.set(e.x, e.y || 0, e.z);
    const vx = e.vx || 0, vz = e.vz || 0;
    this.vel = Math.hypot(vx, vz);
    const rede = this.frente;
    let alvo = rede;
    if (olhar) { const dx = olhar.x - e.x, dz = olhar.z - e.z; if (dx * dx + dz * dz > 0.04) alvo = Math.atan2(-dx, -dz); }
    // nunca fica de costas para a rede no meio do lance (o golpe para trás é animação, não giro)
    let dif = Math.atan2(Math.sin(alvo - rede), Math.cos(alvo - rede)); dif = clamp(dif, -1.2, 1.2); alvo = rede + dif;
    this.yaw += Math.atan2(Math.sin(alvo - this.yaw), Math.cos(alvo - this.yaw)) * Math.min(1, dt * 9);
    this.raiz.rotation.y = this.yaw;
    // a velocidade no referencial do atleta (para a frente e para o lado), para a passada certa
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const mov = { vel: this.vel, fwd: -vx * sy - vz * cy, lat: vx * cy - vz * sy };
    const u = this.juntas;
    const pisou = this.animador.atualizar(u, u && u.body, mov, dt, this.pronto);
    if (pisou && this.aoPisar) this.aoPisar(e.x, e.z, this.animador.passoAnt);
  }
}
