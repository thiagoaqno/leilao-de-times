// Corrida da Galera — o piloto dentro do carro de F1 de 2026: capacete (viseira escura, desenho nas cores da equipe, faixa e o número),
// ombros, braços e luvas nas cores da equipe. Tudo em poucas malhas por carro (cabeça: capacete e viseira; corpo: ombros e dois braços;
// mãos: uma malha só com as duas luvas) e com geometrias, texturas e materiais reaproveitados por equipe: o que muda de um carro para o
// outro é só a pose. A pose sai das coordenadas do carro (metros do modelo, a frente é −z) e é calculada a cada quadro por `animarPiloto`.
//
// Animação viva, sem repetir (nada de clipe gravado): molas amortecidas levam a cabeça para o lado de dentro da curva (pelo esterço e
// pela velocidade) com atraso e um pouquinho de passada, e para a frente na frenagem; nas retas, uma soma de senos com frequências e
// fases sorteadas para ESTE carro (mais uma modulação lenta) faz a cabeça nunca repetir; de vez em quando, num intervalo sorteado, o
// piloto dá uma olhada rápida num espelho. O sorteio vem de uma semente por carro (`semente`), então dois carros nunca se mexem juntos.
// `prefers-reduced-motion`: a cabeça fica parada na posição neutra (as luvas continuam seguindo o volante, que já gira).
// O corpo (`p.corpo`) some na câmera de cockpit do meu carro (`ocultarPiloto`); as luvas (`p.maos`) ficam. De longe (`lodKart`, carros.js)
// as luvas, os braços e os ombros saem e a animação para.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pintarFolha, capacetePorSigla } from "./f1-capacetes.js";

const menosMovimento = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (s) => s * s * (3 - 2 * s);

// onde as coisas ficam, no quadro do carro (metros do modelo; a frente é −z, o chão é y = 0): o pescoço, o centro do volante e as empunhaduras
// O piloto fica deitado fundo no cockpit, como no carro de verdade: só a metade de cima do capacete (da viseira para cima) passa da borda do cockpit (~0,69 m do chão
// ao lado da cabeça), o topo fica na altura da barra do halo (~0,776 m; medido no modelo) e o queixo e o pescoço ficam escondidos atrás das laterais.
const RC = { x: 0.073, y: 0.081, z: 0.095 }; // os raios do capacete (m)
const PESCOCO = { x: 0, y: 0.543, z: 0.0 }; // o capacete é uma bola de ~0,26 m 0,14 m acima: o centro dele fica a ~0,683 m, a viseira na altura da borda do cockpit (~0,69) e o topo a ~0,764 m (um pouco abaixo da barra do halo, ~0,776)
const VOLANTE = { x: 0, y: 0.524, z: -0.32 }; // o centro do volante do Audi R26 (f1-2026.js); com o volante do modelo, usa o dele
const MAO = { x: 0.108, y: 0, z: 0.085 }; // cada luva em relação ao centro do volante (antes de girar com ele)
const OMBRO = { x: 0.12, y: 0.52, z: 0.2 };

// ---------- o que é dividido entre todos os carros ----------
const sinal = (v) => (v < 0 ? -1 : 1), passo = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// o formato do capacete de F1: um elipsoide "quadrado" (calota achatada em cima, lados quase retos), mais comprido que alto, que desce reto atrás com uma aba (o spoiler) e tem o queixo saliente na frente.
// Deforma uma esfera unitária (a frente é −z, o topo +y) mantendo as coordenadas de textura; `esc` engorda a casca (a viseira fica 1,2% por fora).
function casco(g, esc) {
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    const sx = P.getX(i), sy = P.getY(i), sz = P.getZ(i);
    let x = sinal(sx) * Math.abs(sx) ** 0.8, y = sinal(sy) * Math.abs(sy) ** (sy > 0 ? 0.58 : 0.85), z = sinal(sz) * Math.abs(sz) ** 0.8; // (a coroa chata: expoente menor que 1 em cima)
    x *= RC.x * esc; y *= RC.y * esc; z *= RC.z * esc;
    const frente = passo(0.2, 0.9, -sz), baixo = passo(-0.05, -0.55, sy), costas = passo(0.35, 0.95, sz);
    const queixo = frente * baixo; x *= 1 - 0.16 * queixo; z -= 0.022 * queixo; y -= 0.008 * queixo; // o queixo: sai para a frente e afina
    const aba = costas * Math.max(0, 1 - ((sy - 0.2) / 0.3) ** 2) * (1 - passo(0.5, 0.9, Math.abs(sx))); z += 0.018 * aba; // a aba atrás: um degrau na altura da nuca
    z += 0.01 * costas * (1 - passo(-0.4, 0.2, sy)); // e as costas descem retas (um pouco para trás embaixo)
    P.setXYZ(i, x, y, z);
    const nx = sx / (RC.x * esc), ny = sy / (RC.y * esc), nz = sz / (RC.z * esc), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / l, ny / l, nz / l);
  }
  P.needsUpdate = true; N.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}
let G = null;
function geometrias() {
  if (G) return G;
  const capacete = casco(new THREE.SphereGeometry(1, 40, 24), 1);
  // a viseira: uma faixa escura larga e bem marcada na frente (u = 0,75), na altura dos olhos (~25% da altura do capacete), que dá a volta pela frente seguindo a curva da cabeça (um pedaço da mesma forma, 1,2% maior)
  const viseira = casco(new THREE.SphereGeometry(1, 40, 3, 1.5 * Math.PI - 1.15, 2.3, 1.2, 0.36), 1.012);
  const luva = (s) => { const c = new THREE.CapsuleGeometry(0.034, 0.045, 3, 8); c.translate(s * MAO.x, MAO.y, MAO.z); return c; };
  const luvas = mergeGeometries([luva(-1), luva(1)]);
  const braco = new THREE.CylinderGeometry(0.03, 0.024, 1, 8, 1); braco.translate(0, 0.5, 0); // do ombro (y = 0) à luva (y = 1); esticado a cada quadro
  const tronco = new THREE.CapsuleGeometry(0.075, 0.12, 4, 10); tronco.rotateZ(Math.PI / 2); tronco.scale(1, 1, 1.15);
  const aro = new THREE.BoxGeometry(0.235, 0.12, 0.035); // o volante dos carros "leves" (que não trazem o do modelo): só para as mãos terem onde segurar
  return (G = { capacete, viseira, luvas, braco, tronco, aro });
}
const VISEIRA = () => (VISEIRA.m ||= new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.1, metalness: 0.4 }));
const CARBONO = () => (CARBONO.m ||= new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.4, metalness: 0.1 }));
const TECIDOS = new Map(), CAPACETES = new Map();
// o tecido do macacão e das luvas: um material por cor (e por escurecimento), guardado e reaproveitado por todos os carros da equipe
const tecido = (cor, escurece = 0) => {
  const k = cor + "|" + escurece; let m = TECIDOS.get(k);
  if (!m) { const c = new THREE.Color(cor); if (escurece) c.multiplyScalar(1 - escurece); m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0 }); TECIDOS.set(k, m); }
  return m;
};
// a luva na cor da equipe que se vê: a cor 1, ou a cor 2 se a 1 é escura demais (o preto e o azul-marinho somem contra o carbono do volante)
function corDaLuva(c1, c2) { const c = new THREE.Color(c1); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.06 ? c2 : c1; }
// a cor da faixa do capacete: branco, ou quase preto se as cores da equipe já são claras
function corDaFaixa(c1, c2) {
  const lum = (h) => { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
  return lum(c1) > 0.5 || lum(c2) > 0.5 ? "#14161b" : "#ffffff";
}
// o desenho do capacete numa folha 512x256 (ver f1-capacetes.js): o do robô é o do piloto dele (`cap`), o dos outros é o genérico nas cores 1 e 2 da equipe
const materialDoCapacete = (c1, c2, numero, cap) => {
  const cores = cap ? cap.cores : [c1, c2, corDaFaixa(c1, c2)], desenho = cap ? cap.desenho : "generico", k = [...cores, desenho, numero ?? ""].join("|"); let m = CAPACETES.get(k);
  if (!m) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256; pintarFolha(cv.getContext("2d"), cores, desenho, numero);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.12 }); CAPACETES.set(k, m);
  }
  return m;
};

// ---------- sorteio por carro ----------
let contador = 0;
const hash = (s) => { let a = 2166136261; for (const ch of String(s)) { a ^= ch.charCodeAt(0); a = Math.imul(a, 16777619); } return a >>> 0; };
const gerador = (sem) => { let a = (sem >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// três senos (frequência em Hz, fase, peso) que somam 1: o ruído suave de um canal da cabeça; `faixa` é o intervalo das frequências
const senos = (r, f0, f1) => { const l = [0, 1, 2].map((i) => [f0 + (f1 - f0) * (i * 0.34 + r() * 0.3), r() * 6.2832, 0.35 + r() * 0.65]), s = l.reduce((a, q) => a + q[2], 0); return l.map((q) => [q[0], q[1], q[2] / s]); };
const ruido = (l, t) => l[0][2] * Math.sin(6.2832 * l[0][0] * t + l[0][1]) + l[1][2] * Math.sin(6.2832 * l[1][0] * t + l[1][1]) + l[2][2] * Math.sin(6.2832 * l[2][0] * t + l[2][1]);
const mola = (s, alvo, w, z, dt) => { // uma mola amortecida (w: rad/s, z: amortecimento); `s` = { x, v }
  const n = dt > 0.02 ? 2 : 1, h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (w * w * (alvo - s.x) - 2 * z * w * s.v) * h; s.x += s.v * h; }
  return s.x;
};

// monta o piloto no carro `kt` (de montarF1, no modelo de 2026): devolve { corpo, maos, ... } ou null se o carro não tem o modelo novo.
// op: { cor1, cor2, numero, nome, semente, sigla (o piloto robô: o capacete é o dele) }
export function criarPiloto(kt, op) {
  const g = geometrias(), { cor1, cor2 } = op;
  const sem = op.semente ?? hash([op.nome || "", op.numero ?? "", cor1, cor2].join("|") + ":" + (contador++)), r = gerador(sem);
  const centro = kt.volante ? kt.volante.position : new THREE.Vector3(VOLANTE.x, VOLANTE.y, VOLANTE.z);
  const solta = (m) => { m.castShadow = false; m.receiveShadow = false; return m; };
  // o corpo (some na câmera de cockpit): o pescoço é o pivô da cabeça
  const corpo = new THREE.Group(); corpo.name = "piloto"; kt.carro.add(corpo);
  const cab = new THREE.Group(); cab.position.set(PESCOCO.x, PESCOCO.y, PESCOCO.z); cab.rotation.order = "YXZ"; corpo.add(cab);
  const capacete = solta(new THREE.Mesh(g.capacete, materialDoCapacete(cor1, cor2, op.numero, op.sigla ? capacetePorSigla(op.sigla) : null))); capacete.name = "capacete"; capacete.position.y = 0.14; cab.add(capacete);
  const viseira = solta(new THREE.Mesh(g.viseira, VISEIRA())); viseira.name = "viseira"; viseira.position.y = 0.14; cab.add(viseira);
  const tronco = solta(new THREE.Mesh(g.tronco, tecido(cor1, 0.45))); tronco.name = "tronco"; tronco.position.set(0, 0.49, 0.2); corpo.add(tronco);
  const bracos = [-1, 1].map((s) => { const b = solta(new THREE.Mesh(g.braco, tecido(cor1, 0.45))); b.name = "braco"; b.position.set(s * OMBRO.x, OMBRO.y, OMBRO.z); corpo.add(b); return b; });
  // as mãos (ficam no volante e aparecem também na primeira pessoa): uma malha só, com as duas luvas, num pivô que gira com o volante
  const maos = new THREE.Group(); maos.name = "maos"; maos.position.copy(centro); kt.carro.add(maos);
  const luvas = solta(new THREE.Mesh(g.luvas, tecido(corDaLuva(cor1, cor2)))); luvas.name = "luvas"; maos.add(luvas);
  let aro = null; if (!kt.volante) { aro = solta(new THREE.Mesh(g.aro, CARBONO())); aro.name = "luvas-aro"; maos.add(aro); }
  const agit = 0.7 + r() * 0.7; // quão mexida é a cabeça deste piloto (uns são mais calmos)
  const p = {
    kt, corpo, cab, tronco, bracos, maos, aro, centro, rng: r, t: r() * 100, fant: false, escondido: false, neutro: false,
    mRoll: { x: 0, v: 0 }, mYaw: { x: 0, v: 0 }, mPitch: { x: 0, v: 0 }, mX: { x: 0, v: 0 }, brk: 0,
    w: { roll: 8 + r() * 3.5, yaw: 6 + r() * 2.5, pitch: 9 + r() * 3.5 }, z: { roll: 0.45 + r() * 0.2, yaw: 0.6 + r() * 0.2, pitch: 0.42 + r() * 0.2 }, // frequência e amortecimento das molas: ~0,5 passa um pouco do ponto
    agit, modula: [0.03 + r() * 0.05, r() * 6.2832], // a respiração lenta do ruído (nunca igual)
    nRoll: senos(r, 0.17, 1.5), nYaw: senos(r, 0.13, 1.2), nPitch: senos(r, 0.2, 1.8), nX: senos(r, 0.15, 0.9), vibra: senos(r, 6.5, 13.5),
    olhar: { prox: 2.5 + r() * 6, t: -1, dur: 0.6, lado: 1 }, // a olhada no espelho: quando, há quanto tempo, quanto dura, para que lado (−1 esquerdo, 1 direito)
    ang: 0,
  };
  p.ocultarFantasma = (on) => { p.fant = !!on; visivel(p); };
  vistaNeutra(p);
  return p;
}
function visivel(p) { p.corpo.visible = !p.fant && !p.escondido; p.maos.visible = !p.fant; }
// na primeira pessoa (câmera de cockpit do meu carro): o capacete e o corpo somem; as luvas ficam
export function ocultarPiloto(k, sim) { const p = k?.pil; if (!p || p.escondido === !!sim) return; p.escondido = !!sim; visivel(p); }
export function soltarPiloto(k) { const p = k?.pil; if (!p) return; p.corpo.removeFromParent(); p.maos.removeFromParent(); k.pil = null; } // (geometrias, texturas e materiais são de todos: nada a descartar)

// a pose parada: a cabeça no centro, os braços no volante reto
function vistaNeutra(p) { p.cab.rotation.set(0, 0, 0); p.cab.position.set(PESCOCO.x, PESCOCO.y, PESCOCO.z); p.tronco.rotation.z = 0; posicionarMaos(p, 0); p.neutro = true; }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0);
// as luvas giram com o volante; cada braço vai do ombro até a luva (esticado, sem cotovelo: o cockpit esconde o meio)
function posicionarMaos(p, ang, tremX = 0, tremY = 0) {
  p.maos.position.set(p.centro.x + tremX, p.centro.y + tremY, p.centro.z); p.maos.rotation.z = ang;
  if (!p.corpo.visible) return;
  const c = Math.cos(ang), s = Math.sin(ang);
  p.bracos.forEach((b, i) => {
    const lado = i ? 1 : -1, hx = lado * MAO.x, hy = MAO.y; // a luva no quadro do volante → no quadro do carro (gira em z)
    _b.set(p.centro.x + tremX + hx * c - hy * s, p.centro.y + tremY + hx * s + hy * c, p.centro.z + MAO.z + 0.01);
    _a.set(lado * OMBRO.x, OMBRO.y, OMBRO.z);
    _b.sub(_a); const len = _b.length(); _b.divideScalar(len || 1);
    b.quaternion.copy(_q.setFromUnitVectors(_y, _b)); b.scale.set(1, Math.max(0.01, len - 0.045), 1);
  });
}

// a cada quadro, depois de animarF1 (o volante já girou). e: { dt, v, steer (−1 a 1; positivo = direita), dec (desaceleração, u/s²; negativa = acelerando), lod, vitrine }
export function animarPiloto(p, e) {
  if (!p) return;
  const dt = Math.min(0.05, Math.max(0, e.dt || 0)); if (!(dt > 0)) return;
  const ang = p.kt.volante ? p.kt.volante.rotation.z : -(e.steer || 0) * 0.9; p.ang = ang;
  if (e.lod >= 1) return; // de longe: sem animação (e sem luvas nem ombros: lodKart)
  if (p.escondido) { posicionarMaos(p, ang); return; } // na primeira pessoa só as luvas contam: a cabeça e os braços nem se calculam
  const rm = menosMovimento.matches;
  if (rm) { // movimento reduzido: a cabeça parada no centro; só as luvas acompanham o volante
    if (!p.neutro) vistaNeutra(p);
    posicionarMaos(p, ang); return;
  }
  p.neutro = false; p.t += dt;
  const t = p.t, v = e.vitrine ? 140 : Math.abs(e.v || 0), vk = e.vitrine ? 0.35 : lim(v / 300, 0, 1.2);
  const lat = lim(e.steer || 0, -1, 1) * lim(v / 220, 0, 1); // a força lateral (com sinal: positivo = curva para a direita)
  // frenagem e aceleração: a desaceleração, suavizada
  const dec = e.dec || 0, brkAlvo = lim((dec - 30) / 190, 0, 1), acc = lim((-dec - 30) / 220, 0, 1);
  p.brk += (brkAlvo - p.brk) * (1 - Math.exp(-dt * 9));
  p.acc = (p.acc || 0) + (acc - (p.acc || 0)) * (1 - Math.exp(-dt * 5));
  // o ruído das retas: soma de senos por canal, com a respiração lenta; maior com a velocidade
  const resp = 0.72 + 0.28 * Math.sin(6.2832 * p.modula[0] * t + p.modula[1]), A = p.agit * resp * (0.4 + 0.6 * lim(vk, 0, 1));
  const vib = vk > 0.2 ? ruido(p.vibra, t) * 0.004 * vk * vk : 0; // a trepidação de alta velocidade
  // a olhada no espelho
  const o = p.olhar; let env = 0;
  if (o.t < 0) {
    o.prox -= dt;
    if (o.prox <= 0) {
      if (Math.abs(e.steer || 0) < 0.3 && (v > 60 || e.vitrine) && p.brk < 0.4) { o.t = 0; o.dur = 0.5 + p.rng() * 0.4; o.lado = p.rng() < 0.5 ? -1 : 1; }
      else o.prox = 0.6;
    }
  } else {
    o.t += dt; const s = o.t / o.dur;
    if (s >= 1) { o.t = -1; o.prox = 3.5 + p.rng() * 8.5; } else env = s < 0.3 ? suave(s / 0.3) : s < 0.7 ? 1 : suave((1 - s) / 0.3);
  }
  // os alvos das molas (positivo = direita no roll e no yaw)
  const roll = mola(p.mRoll, 0.2 * lat + 0.026 * A * ruido(p.nRoll, t), p.w.roll, p.z.roll, dt);
  const yaw = mola(p.mYaw, 0.25 * lat + 0.034 * A * ruido(p.nYaw, t), p.w.yaw, p.z.yaw, dt);
  const pitch = mola(p.mPitch, -0.14 * p.brk + 0.035 * p.acc + 0.01 * A * ruido(p.nPitch, t), p.w.pitch, p.z.pitch, dt);
  const sx = mola(p.mX, 0.008 * lat + 0.004 * A * ruido(p.nX, t), 8, 0.7, dt);
  // a cabeça: pivô no pescoço (inclinar a cabeça em torno dele já a desloca para o lado de dentro)
  p.cab.rotation.set(pitch + vib - 0.04 * env, -(yaw + p.olhar.lado * 0.6 * env), -(roll + p.olhar.lado * 0.05 * env + vib * 0.6));
  p.cab.position.set(PESCOCO.x + sx, PESCOCO.y, PESCOCO.z - 0.025 * p.brk + 0.008 * p.acc);
  p.tronco.rotation.z = -roll * 0.22;
  posicionarMaos(p, ang, ruido(p.nX, t * 1.7) * 0.0025 * A, ruido(p.nPitch, t * 1.3) * 0.0025 * A);
}
