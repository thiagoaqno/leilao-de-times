// Futevôlei da Galera — o atleta: o "controlador" de cada jogador na tela (posição, para onde olha, o pulo e as
// animações dos golpes). As regras de movimento e de toque ficam em regras.js (o servidor manda); aqui é só o corpo.
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
// Gatilhos: frente, lado, peito, cabeca, letra, calcanhar, voleio, bicicleta, shark, saque, comemora, lamenta.
// Opções do gatilho: { lado: 1 (bola à direita) ou −1, pulo: true (toque no alto, com pulo), estilo (no shark: "voleio" ou
// "bicicleta") }.
import * as THREE from "three";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
// sobe e desce entre a e b (0 fora), com o pico no meio
const bump = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));
// vai de 0 a 1 entre a e b (suave)
const ease = (k, a, b) => { const t = clamp((k - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// chave de quadros: [[k, valor], ...] → valor em k (interpolação suave entre as chaves)
function chave(k, pts) {
  if (k <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) { const [k0, v0] = pts[i - 1], [k1, v1] = pts[i]; return lerp(v0, v1, ease(k, k0, k1)); }
  return pts[pts.length - 1][1];
}

// ----------------------------------------------------------------------
// As poses de cada golpe. k vai de 0 a 1 durante o golpe; P é a pose (os valores que a função muda); "K" é a perna
// que chuta (a do lado da bola) e "A" a de apoio; m = +1 chutando com a direita, −1 com a esquerda (espelha os giros).
// O boneco olha para −z: rotation.x positivo leva perna/braço para a frente; joelho negativo dobra para trás; coluna
// positiva inclina para trás.
// ----------------------------------------------------------------------
const GOLPES = {
  frente: { dur: 0.5, pose(k, P, m) {
    P.legK.x = chave(k, [[0, 0], [0.3, -0.75], [0.5, 1.45], [0.75, 0.7], [1, 0]]); P.kneeK = chave(k, [[0, 0], [0.3, -1.2], [0.5, -0.05], [1, 0]]);
    P.spine.x = 0.25 * bump(k, 0.25, 0.85); P.armA.x = 0.7 * bump(k, 0.2, 0.9); P.armK.z = m * 0.6 * bump(k, 0.2, 0.9); P.kneeA = -0.3 * bump(k, 0.1, 0.9);
  } },
  lado: { dur: 0.55, pose(k, P, m) {
    const b = bump(k, 0.1, 0.95);
    P.legK.z = m * chave(k, [[0, 0], [0.35, 0.55], [0.5, 0.95], [0.8, 0.4], [1, 0]]); P.legK.y = -m * 0.9 * b; P.legK.x = 0.45 * b; P.kneeK = -0.5 * b;
    P.body.z = -m * 0.15 * b; P.armA.z = -m * 0.7 * b; P.armK.z = m * 0.4 * b; P.kneeA = -0.35 * b;
  } },
  peito: { dur: 0.6, pose(k, P) {
    const b = bump(k, 0.05, 0.95);
    P.spine.x = chave(k, [[0, 0], [0.4, 0.6], [0.6, 0.15], [1, 0]]); P.head.x = -0.35 * b;
    P.armK.z = 1.1 * b; P.armA.z = -1.1 * b; P.armK.x = P.armA.x = -0.25 * b; P.kneeK = P.kneeA = -0.4 * bump(k, 0, 0.5);
  } },
  cabeca: { dur: 0.55, pose(k, P) {
    P.spine.x = chave(k, [[0, 0], [0.35, 0.35], [0.55, -0.45], [1, 0]]); P.head.x = chave(k, [[0, 0], [0.35, 0.3], [0.55, -0.55], [1, 0]]);
    const b = bump(k, 0.05, 0.95); P.armK.x = P.armA.x = 0.5 * b; P.armK.z = 0.6 * b; P.armA.z = -0.6 * b; P.kneeK = P.kneeA = -0.35 * bump(k, 0, 0.4);
  } },
  letra: { dur: 0.65, pose(k, P, m) {
    // a perna que chuta passa por trás da de apoio e bate na bola do outro lado
    P.legK.x = chave(k, [[0, 0], [0.3, -0.6], [0.55, -0.95], [1, 0]]); P.legK.z = -m * chave(k, [[0, 0], [0.3, 0.35], [0.55, 1.05], [1, 0]]);
    P.kneeK = chave(k, [[0, 0], [0.3, -1.5], [0.55, -0.5], [1, 0]]); P.spine.y = m * 0.45 * bump(k, 0.1, 0.95); P.spine.x = -0.2 * bump(k, 0.2, 0.9);
    P.armA.z = -m * 0.8 * bump(k, 0.1, 0.95); P.armK.z = m * 0.6 * bump(k, 0.1, 0.95); P.kneeA = -0.35 * bump(k, 0.1, 0.9);
  } },
  calcanhar: { dur: 0.55, pose(k, P) {
    P.legK.x = chave(k, [[0, 0], [0.3, 0.2], [0.55, -1.2], [1, 0]]); P.kneeK = chave(k, [[0, 0], [0.3, -1.7], [0.55, -0.35], [1, 0]]);
    P.spine.x = -0.4 * bump(k, 0.1, 0.95); P.head.x = 0.35 * bump(k, 0.2, 0.9); P.armK.x = P.armA.x = 0.45 * bump(k, 0.1, 0.9);
  } },
  voleio: { dur: 0.6, salto: 0.3, pose(k, P, m) {
    const b = bump(k, 0.05, 0.95);
    P.body.z = -m * 0.8 * b; P.legK.z = m * chave(k, [[0, 0], [0.35, 0.9], [0.5, 1.55], [0.8, 1.0], [1, 0]]); P.legK.x = 0.4 * b;
    P.kneeK = chave(k, [[0, 0], [0.35, -1.1], [0.5, -0.1], [1, 0]]); P.armA.z = -m * 1.2 * b; P.armK.z = m * 0.3 * b; P.legA.z = -m * 0.25 * b;
  } },
  bicicleta: { dur: 0.95, salto: 1.05, pose(k, P) {
    // pula de costas, o corpo deita no ar, a perna de apoio sobe primeiro e a outra bate por cima da cabeça (tesoura)
    P.body.x = chave(k, [[0, 0], [0.15, 0.4], [0.5, 1.85], [0.8, 1.2], [1, 0]]);
    P.legA.x = chave(k, [[0, 0], [0.25, 1.9], [0.5, 1.0], [1, 0]]); P.legK.x = chave(k, [[0, 0], [0.3, 0.6], [0.5, 2.7], [0.75, 1.6], [1, 0]]);
    P.kneeK = chave(k, [[0, 0], [0.3, -1.2], [0.5, -0.05], [1, 0]]); P.kneeA = chave(k, [[0, 0], [0.25, -0.2], [0.5, -1.2], [1, 0]]);
    const b = bump(k, 0.1, 0.95); P.armK.z = 1.3 * b; P.armA.z = -1.3 * b; P.armK.x = P.armA.x = -0.6 * b;
  } },
  // o Shark Attack é com o pé: de voleio (pula de lado, a perna sobe bem alto por cima da rede e desce na bola) ou de
  // bicicleta (sharkBicicleta: a tesoura de costas, mais alta)
  sharkBicicleta: { dur: 0.95, salto: 1.3, pose(k, P, m) { GOLPES.bicicleta.pose(k, P, m); } },
  shark: { dur: 0.9, salto: 1.15, pose(k, P, m) {
    const b = bump(k, 0.05, 0.97);
    P.body.z = m * chave(k, [[0, 0], [0.3, 0.55], [0.5, 0.95], [0.8, 0.4], [1, 0]]);
    P.legK.z = m * chave(k, [[0, 0], [0.3, 1.4], [0.45, 2.3], [0.58, 1.1], [1, 0]]); P.legK.x = 0.7 * b; P.kneeK = chave(k, [[0, 0], [0.3, -1.3], [0.45, -0.1], [1, 0]]);
    P.legA.x = -0.3 * b; P.kneeA = -0.9 * b; P.armA.z = -m * 1.4 * b; P.armK.z = m * 0.5 * b; P.spine.x = 0.2 * b;
  } },
  saque: { dur: 0.7, pose(k, P, m) {
    P.legK.x = chave(k, [[0, 0], [0.4, -0.9], [0.6, 1.6], [0.85, 0.8], [1, 0]]); P.kneeK = chave(k, [[0, 0], [0.4, -1.4], [0.6, -0.05], [1, 0]]);
    P.spine.x = 0.3 * bump(k, 0.3, 0.95); P.armA.x = 0.9 * bump(k, 0.2, 0.95); P.armK.z = m * 0.8 * bump(k, 0.2, 0.95); P.kneeA = -0.35 * bump(k, 0.2, 0.9);
  } },
  comemora: { dur: 1.3, salto: 0.35, saltos: 2, pose(k, P) {
    const b = bump(k, 0, 1); P.armK.x = P.armA.x = -2.9 * Math.min(1, b * 3); P.armK.z = 0.3 * b; P.armA.z = -0.3 * b; P.elbow = 0.2;
  } },
  lamenta: { dur: 1.3, pose(k, P) {
    const b = Math.min(1, bump(k, 0, 1) * 3); P.armK.x = P.armA.x = -2.5 * b; P.armK.z = 0.5 * b; P.armA.z = -0.5 * b; P.elbow = 2.0 * b; P.spine.x = -0.25 * b; P.head.x = 0.3 * b;
  } },
};
export const GATILHOS = Object.keys(GOLPES);

// ----------------------------------------------------------------------
// O animador: a passada (correndo), a base de espera (joelho dobrado, de frente para a rede) e o golpe em cima.
// ----------------------------------------------------------------------
class Animador {
  constructor() { this.clip = null; this.fase = 0; this.passoAnt = 0; this.alturaPulo = 0; }
  disparar(gatilho, o = {}) {
    if (gatilho === "shark" && o.estilo === "bicicleta") gatilho = "sharkBicicleta";
    const G = GOLPES[gatilho]; if (!G) return;
    const salto = Math.max(G.salto || 0, o.pulo ? clamp((o.h || 2.4) - 1.75, 0.3, 1.1) : 0);
    this.clip = { G, nome: gatilho, t: 0, m: o.lado < 0 ? -1 : 1, salto };
  }
  get ocupado() { return !!this.clip; }
  // u: as juntas do visual (userData do boneco). velocidade em m/s; pronto: esperando a bola (agachadinho).
  // Devolve true quando um pé toca o chão (para a pegada na areia).
  atualizar(u, body, vel, dt, pronto) {
    const run = Math.min(1, vel / 6);
    this.fase += dt * (4 + vel * 1.6);
    const sw = Math.sin(this.fase) * 0.85 * run;
    // pose base: correndo, ou a base de espera (pernas abertas, joelhos dobrados, tronco para a frente)
    const base = pronto ? 1 : 0.55;
    const P = {
      legK: { x: -sw, y: 0, z: 0.08 * (1 - run) }, legA: { x: sw, y: 0, z: -0.08 * (1 - run) },
      kneeK: -(Math.max(0, Math.sin(this.fase)) * 1.2 * run + 0.25 * base * (1 - run)), kneeA: -(Math.max(0, -Math.sin(this.fase)) * 1.2 * run + 0.25 * base * (1 - run)),
      armK: { x: sw * 0.8, z: 0.22 * (1 - run) }, armA: { x: -sw * 0.8, z: -0.22 * (1 - run) }, elbow: 0.35 + 0.8 * run,
      spine: { x: -0.12 * base - 0.18 * run, y: 0, z: 0 }, head: { x: 0.1 * base + 0.12 * run }, body: { x: 0, z: 0, y: 0 },
    };
    let m = 1, k = 0;
    if (this.clip) {
      const c = this.clip; c.t += dt; k = clamp(c.t / c.G.dur, 0, 1); m = c.m;
      const q = { ...P, legK: { x: 0, y: 0, z: 0 }, legA: { x: 0, y: 0, z: 0 }, kneeK: 0, kneeA: 0, armK: { x: 0, z: 0 }, armA: { x: 0, z: 0 }, elbow: 0.35, spine: { x: 0, y: 0, z: 0 }, head: { x: 0 }, body: { x: 0, z: 0, y: 0 } };
      c.G.pose(k, q, m);
      const w = Math.min(ease(k, 0, 0.12), 1 - ease(k, 0.88, 1)); // entra e sai do golpe sem tranco
      const mix = (a, b) => lerp(a, b, w);
      for (const p of ["legK", "legA", "armK", "armA", "spine", "head", "body"]) for (const e of Object.keys(q[p])) P[p][e] = mix(P[p][e] ?? 0, q[p][e]);
      P.kneeK = mix(P.kneeK, q.kneeK); P.kneeA = mix(P.kneeA, q.kneeA); P.elbow = mix(P.elbow, q.elbow);
      P.body.y = c.salto * Math.abs(Math.sin(k * (c.G.saltos || 1) * Math.PI)); // o pulo (dois pulinhos na comemoração)
      if (k >= 1) this.clip = null;
    }
    if (!u || !u.legs) { if (body) aplicarCorpo(body, P.body); return false; }
    // m = +1: a perna que chuta é a direita (índice 1); −1: a esquerda (índice 0)
    const iK = m > 0 ? 1 : 0, iA = 1 - iK;
    const perna = (i, v) => { const l = u.legs[i]; l.rotation.set(v.x, v.y || 0, v.z || 0); };
    perna(iK, P.legK); perna(iA, P.legA);
    u.knees[iK].rotation.x = P.kneeK; u.knees[iA].rotation.x = P.kneeA;
    u.arms[iK].rotation.set(P.armK.x, 0, P.armK.z); u.arms[iA].rotation.set(P.armA.x, 0, P.armA.z);
    u.elbows[0].rotation.x = u.elbows[1].rotation.x = P.elbow;
    u.spine.rotation.set(P.spine.x, P.spine.y, P.spine.z); u.head.rotation.set(P.head.x, 0, 0);
    if (u.capa) u.capa.rotation.x = -(0.08 + 0.7 * run);
    aplicarCorpo(u.body, P.body);
    // a pegada: cada vez que a passada cruza o meio (um pé no chão), correndo
    const pe = Math.sign(Math.sin(this.fase)); let pisou = false;
    if (run > 0.25 && pe !== this.passoAnt && P.body.y < 0.02) pisou = true;
    this.passoAnt = pe;
    return pisou;
  }
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
    this.vel = 0; this.pronto = false;
    this.frente = this.yaw; // para onde fica de frente (o jogador, para a rede; quem assiste, para a quadra)
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
  // ---------- a cada quadro ----------
  // e: { x, z, vx, vz } do jogador (das regras); olhar: { x, z } para onde virar (ou null: de frente para a rede)
  atualizar(e, olhar, dt) {
    this.raiz.position.set(e.x, e.y || 0, e.z);
    this.vel = Math.hypot(e.vx || 0, e.vz || 0);
    const rede = this.frente;
    let alvo = rede;
    if (olhar) { const dx = olhar.x - e.x, dz = olhar.z - e.z; if (dx * dx + dz * dz > 0.04) alvo = Math.atan2(-dx, -dz); }
    // nunca fica de costas para a rede no meio do lance (o golpe para trás é animação, não giro)
    let dif = Math.atan2(Math.sin(alvo - rede), Math.cos(alvo - rede)); dif = clamp(dif, -1.2, 1.2); alvo = rede + dif;
    this.yaw += Math.atan2(Math.sin(alvo - this.yaw), Math.cos(alvo - this.yaw)) * Math.min(1, dt * 9);
    this.raiz.rotation.y = this.yaw;
    const u = this.juntas;
    const pisou = this.animador.atualizar(u, u && u.body, this.vel, dt, this.pronto);
    if (pisou && this.aoPisar) this.aoPisar(e.x, e.z, this.animador.passoAnt);
  }
}
