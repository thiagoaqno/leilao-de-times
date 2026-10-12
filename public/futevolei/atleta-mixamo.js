// Futevôlei da Galera — o atleta com esqueleto (modelo e animações do Mixamo, gerados por ferramentas/animacoes-mixamo.mjs).
// O modelo (modelo/atleta.glb) e as animações (modelo/clipes.json) baixam uma vez; cada atleta ganha um clone do esqueleto e o
// seu AnimationMixer. Os dois "Animadores" (este e o de caixinhas, em atleta.js) têm a mesma cara: disparar, antecipar,
// confirmar, atualizar e o `clip` em andamento, então o Atleta usa um ou outro conforme o visual.
//
// Em vez de tocar os clipes sozinhos, o mixer só avalia: cada quadro este arquivo põe o tempo e o peso de cada animação
// (correr, de costas, de lado e parado se misturam pela velocidade; o golpe entra por cima e sai no fim).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as clonarEsqueleto } from "three/addons/utils/SkeletonUtils.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k, a, b) => { const t = clamp((k - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// O recorte de cada golpe dentro da animação do Mixamo: [clipe, começo, impacto, fim] em segundos do clipe.
export const GOLPES_M = {
  frente: ["soccerPass", 0.17, 0.5, 1.1], lado: ["soccerPass", 0.17, 0.5, 1.1], letra: ["soccerPass", 0.17, 0.5, 1.1], calcanhar: ["soccerPass", 0.17, 0.5, 1.1],
  saque: ["soccerPass", 0.17, 0.5, 1.1],
  peito: ["soccerHeader", 0.3, 1.18, 1.9],
  cabeca: ["soccerHeader", 0.3, 1.18, 1.9],
  voleio: ["strikeFowardJog", 0.03, 0.47, 1.0], shark: ["strikeFowardJog", 0.03, 0.47, 1.0],
  bicicleta: ["scissorKick", 0.37, 1.0, 2.2], sharkBicicleta: ["scissorKick", 0.37, 1.0, 2.2],
  comemora: ["standingJump", 0.27, 0.67, 1.83],
};
const ESCALA_MAX = 1.8; // o quanto o começo do golpe pode ser acelerado para o impacto cair na hora da bola
const nomeDoGolpe = (g, o = {}) => (g === "shark" && o.estilo === "bicicleta" ? "sharkBicicleta" : g);
export const ateImpactoM = (g, o) => { const c = GOLPES_M[nomeDoGolpe(g, o)]; return c ? (c[2] - c[1]) / ESCALA_MAX : 0; };

// ---------- o carregamento (uma vez só) ----------
export const Modelo = { ativo: false, base: null, clipes: null, promessa: null };
const geoPorCor = new Map();
Modelo.carregar = () => (Modelo.promessa ||= Promise.all([new GLTFLoader().loadAsync("/futevolei/modelo/atleta.glb"), fetch("/futevolei/modelo/clipes.json").then((r) => r.json())]).then(([gltf, json]) => {
  Modelo.base = gltf.scene;
  Modelo.clipes = {};
  for (const [nome, c] of Object.entries(json)) {
    const trilhas = [];
    for (const t of c.tracks) {
      if (t.p === "q") trilhas.push(new THREE.QuaternionKeyframeTrack(`mixamorig${t.n}.quaternion`, t.t, t.v));
      else { // quadril: a altura fica; o andar para a frente fica por conta do jogo (x e z presos no primeiro quadro). O modelo está em cm.
        const v = t.v.map((x) => x * 100);
        for (let i = 0; i < v.length; i += 3) { v[i] = t.v[0] * 100; v[i + 2] = t.v[2] * 100; }
        trilhas.push(new THREE.VectorKeyframeTrack(`mixamorig${t.n}.position`, t.t, v));
      }
    }
    Modelo.clipes[nome] = new THREE.AnimationClip(nome, c.dur, trilhas);
  }
  Modelo.ativo = true;
  return Modelo;
}).catch(() => { Modelo.ativo = false; return Modelo; }));

// A geometria pintada com as cores do time (pele, camisa, bermuda), uma por combinação, compartilhada por quem usa as mesmas.
function geometriaCom(malha, cores) {
  const chave = cores.join("|");
  let g = geoPorCor.get(chave);
  if (g) return g;
  g = malha.geometry.clone();
  const reg = g.getAttribute("_regiao") || g.getAttribute("_REGIAO"), cor = new Float32Array(reg.count * 3), paleta = cores.map((c) => new THREE.Color(c));
  for (let i = 0; i < reg.count; i++) { const c = paleta[reg.getX(i)] || paleta[0]; cor.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(cor, 3));
  geoPorCor.set(chave, g);
  return g;
}
const material = () => (material.m ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 }));

// O atleta com esqueleto: devolve { raiz, animador } (a raiz é pendurada no visual do jogador).
export function criarMixamo(cores) {
  const modelo = clonarEsqueleto(Modelo.base);
  modelo.traverse((o) => { if (o.isSkinnedMesh) { o.geometry = geometriaCom(o, cores); o.material = material(); o.castShadow = true; o.frustumCulled = false; } });
  modelo.scale.setScalar(0.01);
  const espelho = new THREE.Group(); espelho.rotation.y = Math.PI; espelho.add(modelo); // o boneco olha para −z; o Mixamo para +z
  const raiz = new THREE.Group(); raiz.add(espelho);
  return { raiz, espelho, modelo, animador: new AnimadorMixamo(modelo, espelho) };
}
// o atleta saiu da cena: solta o mixer (a geometria é compartilhada e fica)
export function soltarMixamo(m) { if (!m) return; m.animador.mixer.stopAllAction(); m.animador.mixer.uncacheRoot(m.modelo); m.raiz.parent?.remove(m.raiz); }

export class AnimadorMixamo {
  constructor(modelo, espelho) {
    this.modelo = modelo; this.espelho = espelho; this.mixer = new THREE.AnimationMixer(modelo);
    this.a = {};
    for (const n of ["idleTransition", "running", "runningBackward", "leftStrafe", "rightStrafe", ...new Set(Object.values(GOLPES_M).map((g) => g[0]))]) {
      const c = Modelo.clipes[n]; if (!c) continue;
      const ac = this.mixer.clipAction(c); ac.play(); ac.paused = true; ac.weight = 0; this.a[n] = ac;
    }
    this.clip = null; this.t = Math.random() * 10; this.fase = 0; this.passoAnt = 1; this.w = { idle: 1, f: 0, b: 0, l: 0, r: 0 }; this.parado = 0;
  }
  disparar(gatilho, o = {}, t0 = 0) {
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C) return;
    this.clip = { nome, C, t: t0, escala: 1, m: o.lado < 0 ? -1 : 1, bola: nome !== "comemora", confirmado: false, impT: C[2] - C[1], dur: C[3] - C[1] };
  }
  antecipar(gatilho, o, falta) {
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C || !C[2]) return;
    if (this.clip && this.clip.bola && !this.clip.confirmado && this.clip.nome === nome) return;
    this.disparar(gatilho, o, 0);
    const c = this.clip, esc = clamp(c.impT / Math.max(0.05, falta), 1, ESCALA_MAX);
    c.escala = esc; c.t = Math.min(0, esc * (c.impT / esc - falta)); // longe da bola: espera parado até a hora de começar
  }
  confirmar(gatilho, o) {
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C) return;
    const c = this.clip;
    if (c && c.nome === nome && !c.confirmado && c.t <= c.impT + 0.08) c.t = Math.max(c.t, c.impT - 0.02);
    else this.disparar(gatilho, o, C[2] - C[1] - 0.03);
    this.clip.m = o.lado < 0 ? -1 : 1; this.clip.confirmado = true;
  }
  get ocupado() { return !!this.clip; }
  atualizar(u, body, mov, dt, pronto) {
    this.t += dt;
    const vel = mov.vel, cam = vel > 0.15 ? 1 : 0, ir = clamp((vel - 0.25) / 1.0, 0, 1);
    // para onde está indo (no referencial do atleta): quatro animações misturadas pelo quanto aponta para cada lado
    let wf = 0, wb = 0, wl = 0, wr = 0;
    if (cam) { const f = mov.fwd / vel, l = mov.lat / vel; wf = Math.max(0, f) ** 2; wb = Math.max(0, -f) ** 2; wr = Math.max(0, l) ** 2; wl = Math.max(0, -l) ** 2; const s = wf + wb + wl + wr || 1; wf /= s; wb /= s; wl /= s; wr /= s; }
    const alvo = { idle: 1 - ir, f: ir * wf, b: ir * wb, l: ir * wl, r: ir * wr }, k = 1 - Math.exp(-dt * 14), W = this.w;
    for (const n in alvo) W[n] += (alvo[n] - W[n]) * k;
    this.fase = (this.fase + dt * clamp(vel / 4.2, 0.5, 1.5) / 0.63) % 1;
    // o golpe por cima de tudo: entra rápido, sai no fim
    let g = 0, c = this.clip;
    if (c) {
      c.t += dt * c.escala;
      g = c.t < 0 ? 0 : Math.min(ease(c.t, 0, 0.07), 1 - ease(c.t, c.dur - 0.2, c.dur));
      if (c.t >= c.dur) { this.clip = null; c = null; g = 0; }
    }
    const base = 1 - g, A = this.a;
    const loco = (n, w, t) => { const ac = A[n]; if (!ac) return; ac.weight = w * base; if (t != null) ac.time = t * ac.getClip().duration; };
    loco("idleTransition", W.idle, 1.8 / A.idleTransition.getClip().duration);
    loco("running", W.f, this.fase); loco("runningBackward", W.b, this.fase); loco("leftStrafe", W.l, this.fase); loco("rightStrafe", W.r, this.fase);
    for (const n of new Set(Object.values(GOLPES_M).map((x) => x[0]))) if (A[n]) A[n].weight = 0;
    if (c) { const ac = A[c.C[0]]; if (ac) { ac.weight = g; ac.time = c.C[1] + Math.max(0, c.t); } this.espelho.scale.x = c.m; }
    else this.espelho.scale.x = 1;
    this.mixer.update(0);
    // a pegada: a cada meio ciclo da corrida
    const meio = Math.floor(this.fase * 2) % 2; let pisou = false;
    if (ir > 0.5 && !c && meio !== this.meio) { pisou = true; this.passoAnt = meio ? 1 : -1; }
    this.meio = meio;
    return pisou;
  }
}
