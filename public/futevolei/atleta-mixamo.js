// Futevôlei da Galera — o atleta com esqueleto (modelo e animações do Mixamo, gerados por ferramentas/animacoes-mixamo.mjs).
// O modelo (modelo/atleta.glb) e as animações (modelo/clipes.json) baixam uma vez; cada atleta ganha um clone do esqueleto e o
// seu AnimationMixer. Os dois "Animadores" (este e o de caixinhas, em atleta.js) têm a mesma cara: disparar, antecipar,
// confirmar, atualizar e o `clip` em andamento, então o Atleta usa um ou outro conforme o visual.
//
// Em vez de tocar os clipes sozinhos, o mixer só avalia: cada quadro este arquivo põe o tempo e o peso de cada animação
// (correr, de costas, de lado, parado e pronto se misturam pela velocidade; o golpe entra por cima e sai no fim).
//
// Skin padrão: o boneco do Mixamo aparece. Outras skins (caixinhas dos bonecos.js): o esqueleto roda escondido e cada quadro
// `copiarParaCaixas` passa a pose para as juntas da caixinha (quadril, coluna, cabeça, coxa/joelho, braço/cotovelo), pela
// direção de cada osso. Assim todas as skins usam as mesmas animações.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as clonarEsqueleto } from "three/addons/utils/SkeletonUtils.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k, a, b) => { const t = clamp((k - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));
const sorteia = (l) => l[Math.floor(Math.random() * l.length)];

// O recorte de cada golpe dentro da animação do Mixamo, em segundos do clipe: c clipe, i começo, imp impacto (o toque na
// bola), f fim. Com f < i a animação roda de trás para a frente. salto: sobe o corpo (toque no alto); depois: o clipe que
// vem em seguida; solta: no saque, quando a bola sai das mãos.
export const GOLPES_M = {
  frente: { c: "soccerPass", i: 0.17, imp: 0.58, f: 1.1 }, lado: { c: "soccerPass", i: 0.17, imp: 0.58, f: 1.1 },
  letra: { c: "soccerPass", i: 0.17, imp: 0.58, f: 1.1 }, calcanhar: { c: "soccerPass", i: 0.17, imp: 0.58, f: 1.1 },
  peito: { c: "receiveSoccerball", i: 1.35, imp: 1.7, f: 2.35 },                 // o domínio no peito
  cabeca: { c: "soccerHeader", i: 0.3, imp: 1.12, f: 1.9 },                      // cabeçada pulando
  cabecaChao: { c: "headerSoccerball", i: 0.3, imp: 0.68, f: 1.3 },              // cabeçada de pé
  voleio: { c: "strikeFowardJog", i: 0.03, imp: 0.6, f: 1.0, salto: 0.3, depois: "aterrissa" },
  shark: { c: "strikeFowardJog", i: 0.03, imp: 0.6, f: 1.0, salto: 0.35, depois: "aterrissa" },
  bicicleta: { c: "scissorKick", i: 0.37, imp: 1.0, f: 2.77 }, sharkBicicleta: { c: "scissorKick", i: 0.37, imp: 1.0, f: 2.77 }, // cai e levanta
  saque: { c: "goalkeeperDropKick", i: 1.45, imp: 2.2, f: 3.0, solta: 1.85 },    // a reposição do goleiro: solta a bola e chuta
  // sem bola
  pegaBola: { c: "goalkeeperPlacingBall", i: 1.0, f: 0 },                         // abaixa e pega a bola da areia (o "pôr a bola" ao contrário)
  aterrissa: { c: "fallingToLanding", i: 0.3, f: 1.07 },
  parada: { c: "runToStop", i: 0.25, f: 0.9 },                                    // a freada depois de correr
  mergulho: { c: "goalkeeperBodyBlock", i: 0.3, imp: 0.7, f: 2.47 },              // o peixinho atrás da bola que vai cair
  // comemorações, lamentos e manias (sorteados)
  comemora1: { c: "standingJump", i: 0.27, f: 1.83 }, comemora2: { c: "runningJump", i: 0, f: 0.9 }, comemora3: { c: "goalkeeperOverhandThrow", i: 0.3, f: 1.7 },
  lamenta1: { c: "standingUp", i: 0, f: 1.67, entra: 0.25 }, lamenta2: { c: "goalkeeperScoop", i: 0.37, f: 1.9 }, lamenta3: { c: "endBicycleSitUp", i: 1.31, f: 3.3, entra: 0.3 },
  mania1: { c: "idleTransition", i: 0, f: 1.87 }, mania2: { c: "goalkeeperPlacingBall", i: 0.3, f: 2.6 },
};
const GRUPOS = { comemora: ["comemora1", "comemora2", "comemora3"], lamenta: ["lamenta1", "lamenta2", "lamenta3"], mania: ["mania1", "mania2"] };
const ESCALA_MAX = 1.8; // o quanto o começo do golpe pode ser acelerado para o impacto cair na hora da bola
const nomeDoGolpe = (g, o = {}) => (g === "shark" && o.estilo === "bicicleta" ? "sharkBicicleta" : g === "cabeca" && o.pulo === false ? "cabecaChao" : GRUPOS[g] ? sorteia(GRUPOS[g]) : g);
export const ateImpactoM = (g, o) => { const c = GOLPES_M[nomeDoGolpe(g, o)]; return c && c.imp != null ? (c.imp - c.i) / ESCALA_MAX : 0; };
// os clipes da base (sem golpe)
const BASE = ["idleTransition", "goalkeeperSidestep", "running", "runningBackward", "leftStrafe", "rightStrafe", "walkStrafeLeft", "walkStrafeRight"];

// ---------- o carregamento (uma vez só) ----------
export const Modelo = { ativo: false, base: null, clipes: null, promessa: null };
const geoPorCor = new Map();
const OSSOS_DOS_BRACOS = /^(Spine|Spine1|Spine2|Neck|Head|LeftShoulder|LeftArm|LeftForeArm|LeftHand|RightShoulder|RightArm|RightForeArm|RightHand)$/;
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
  // segurando a bola para sacar: só tronco e braços da reposição do goleiro (as pernas continuam andando)
  const dk = json.goalkeeperDropKick;
  if (dk) Modelo.clipes.segura = new THREE.AnimationClip("segura", dk.dur, Modelo.clipes.goalkeeperDropKick.tracks.filter((t) => OSSOS_DOS_BRACOS.test(t.name.split(".")[0].replace("mixamorig", ""))));
  Modelo.ativo = true;
  return Modelo;
}).catch((e) => { console.warn("futevôlei: sem o modelo do Mixamo", e); Modelo.ativo = false; return Modelo; }));

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

// O atleta com esqueleto: devolve { raiz, animador } (a raiz é pendurada no visual do jogador). Com `caixas` (o userData do
// boneco de caixinhas), o boneco do Mixamo fica escondido e só empresta a pose às caixinhas; a raiz não vai para a cena.
export function criarMixamo(cores, caixas = null) {
  const modelo = clonarEsqueleto(Modelo.base);
  modelo.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (caixas) { o.visible = false; return; }
    o.geometry = geometriaCom(o, cores); o.material = material(); o.castShadow = true; o.frustumCulled = false;
  });
  modelo.scale.setScalar(0.01);
  const espelho = new THREE.Group(); espelho.rotation.y = Math.PI; espelho.add(modelo); // o boneco olha para −z; o Mixamo para +z
  const raiz = new THREE.Group(); raiz.add(espelho);
  return { raiz, espelho, modelo, caixas, animador: new AnimadorMixamo(modelo, espelho, raiz, caixas) };
}
// o atleta saiu da cena: solta o mixer (a geometria é compartilhada e fica)
export function soltarMixamo(m) { if (!m) return; m.animador.mixer.stopAllAction(); m.animador.mixer.uncacheRoot(m.modelo); m.raiz.parent?.remove(m.raiz); }

// ---------- a pose do esqueleto nas caixinhas ----------
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _m = new THREE.Matrix4();
const espelhar = (v, m) => { if (m < 0) v.x = -v.x; return v; };
const espelharQ = (q, m) => { if (m < 0) { q.y = -q.y; q.z = -q.z; } return q; };
class Caixas {
  constructor(modelo, raiz) {
    this.raiz = raiz; this.o = {};
    for (const n of ["Hips", "Spine2", "Head", "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand"]) this.o[n] = modelo.getObjectByName("mixamorig" + n);
    raiz.updateMatrixWorld(true);
    this.rest = {}; for (const n of ["Hips", "Spine2", "Head"]) this.rest[n] = this.o[n].getWorldQuaternion(new THREE.Quaternion()).invert();
    this.altura = this.o.Hips.getWorldPosition(new THREE.Vector3()).y; // altura do quadril do Mixamo (m)
    this.dh = new THREE.Quaternion(); this.ds = new THREE.Quaternion(); this.dc = new THREE.Quaternion();
  }
  pos(n, m, out) { return espelhar(this.o[n].getWorldPosition(out), m); }
  delta(n, m, out) { return espelharQ(this.o[n].getWorldQuaternion(out).multiply(this.rest[n]), m); }
  // um membro: a direção do osso de cima e a do de baixo, no espaço do pai (q = rotação do pai). dobra: +1 o de baixo
  // vai para trás (joelho), −1 para a frente (cotovelo). Devolve o ângulo da dobra.
  membro(junta, q, a, b, c, dobra) {
    _qi.copy(q).invert();
    const d = _x.subVectors(b, a).normalize().applyQuaternion(_qi), s = _y.subVectors(c, b).normalize().applyQuaternion(_qi);
    const ang = Math.acos(clamp(d.dot(s), -1, 1));
    const yy = _z.copy(d).negate();
    // o eixo da dobra: a parte do osso de baixo que sai da linha do de cima (reto, fica o "para trás" do corpo)
    const p = _v.copy(s).addScaledVector(d, -s.dot(d)).multiplyScalar(dobra).add(_c.set(0, 0, 0.12));
    p.addScaledVector(yy, -p.dot(yy)).normalize();
    const xx = _b.crossVectors(yy, p);
    junta.quaternion.setFromRotationMatrix(_m.makeBasis(xx, yy, p));
    return ang;
  }
  copiar(u, m, salto) {
    this.raiz.updateMatrixWorld(true);
    const S = u.body.scale.x || 1, k = (0.85 * S) / this.altura;
    // o corpo gira no quadril e sobe/desce com ele
    const dh = this.delta("Hips", m, this.dh), ds = this.delta("Spine2", m, this.ds), dc = this.delta("Head", m, this.dc);
    const hp = this.pos("Hips", m, _a); hp.multiplyScalar(k); hp.y += salto;
    u.body.quaternion.copy(dh); u.body.position.copy(hp).sub(_v.set(0, 0.85 * S, 0).applyQuaternion(dh));
    u.spine.quaternion.copy(_q.copy(dh).invert().multiply(ds));
    u.head.quaternion.copy(_q.copy(ds).invert().multiply(dc));
    // pernas (no corpo) e braços (na coluna). Índice 1 = direita (+x); espelhado, os lados trocam
    const lados = m < 0 ? ["Right", "Left"] : ["Left", "Right"];
    for (let i = 0; i < 2; i++) {
      const L = lados[i], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      this.pos(L + "UpLeg", m, A); this.pos(L + "Leg", m, B); this.pos(L + "Foot", m, C);
      u.knees[i].rotation.set(-this.membro(u.legs[i], dh, A, B, C, 1), 0, 0);
      this.pos(L + "Arm", m, A); this.pos(L + "ForeArm", m, B); this.pos(L + "Hand", m, C);
      u.elbows[i].rotation.set(this.membro(u.arms[i], ds, A, B, C, -1), 0, 0);
    }
    if (u.capa) u.capa.rotation.x = -0.3;
  }
}

export class AnimadorMixamo {
  constructor(modelo, espelho, raiz, caixas) {
    this.modelo = modelo; this.espelho = espelho; this.mixer = new THREE.AnimationMixer(modelo);
    this.caixas = caixas ? new Caixas(modelo, raiz) : null;
    this.a = {};
    for (const n of new Set([...BASE, "segura", ...Object.values(GOLPES_M).map((g) => g.c)])) {
      const c = Modelo.clipes[n]; if (!c) continue;
      const ac = this.mixer.clipAction(c); ac.play(); ac.paused = true; ac.weight = 0; this.a[n] = ac;
    }
    this.golpes = new Set(Object.values(GOLPES_M).map((g) => g.c));
    this.clip = null; this.t = Math.random() * 10; this.fase = 0; this.faseW = 0; this.passoAnt = 1;
    this.w = { idle: 1, pr: 0, f: 0, b: 0, l: 0, r: 0, wl: 0, wr: 0 }; this.ws = 0; this.vRecente = 0; this.segura = false; this.m = 1;
  }
  disparar(gatilho, o = {}, t0 = 0) {
    // comemorar ou lamentar não corta o peixinho nem um golpe no meio
    if (GRUPOS[gatilho] && this.clip && (this.clip.nome === "mergulho" || this.clip.bola)) { this.clip.depois = nomeDoGolpe(gatilho); return; }
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C) return;
    const dur = Math.abs(C.f - C.i), salto = C.salto && (o.pulo || nome === "shark") ? clamp((o.h || 1.6) - 1.15, 0.15, 0.6) : 0;
    this.clip = { nome, C, t: t0, escala: 1, m: o.lado < 0 ? -1 : 1, bola: C.imp != null && nome !== "mergulho", confirmado: false, impT: C.imp != null ? C.imp - C.i : 0, dur, salto, depois: C.depois || null, entra: C.entra || 0.07 };
  }
  antecipar(gatilho, o, falta) {
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C || C.imp == null) return;
    if (this.clip && this.clip.bola && !this.clip.confirmado && this.clip.nome === nome) return;
    this.disparar(gatilho, o, 0);
    const c = this.clip, esc = clamp(c.impT / Math.max(0.05, falta), 1, ESCALA_MAX);
    c.escala = esc; c.t = Math.min(0, esc * (c.impT / esc - falta)); // longe da bola: espera parado até a hora de começar
  }
  confirmar(gatilho, o) {
    const nome = nomeDoGolpe(gatilho, o), C = GOLPES_M[nome]; if (!C) return;
    const c = this.clip;
    if (c && c.nome === nome && !c.confirmado && c.t <= c.impT + 0.08) c.t = Math.max(c.t, c.impT - 0.02);
    else this.disparar(gatilho, o, (C.imp ?? C.i) - C.i - 0.03);
    this.clip.m = o.lado < 0 ? -1 : 1; this.clip.confirmado = true;
  }
  get ocupado() { return !!this.clip; }
  // o tempo do clipe em andamento (segundos da animação do Mixamo)
  tempoNoClipe(c = this.clip) { return c ? c.C.i + Math.sign(c.C.f - c.C.i) * Math.max(0, c.t) : 0; }
  // a bola do saque: "mao" (nas mãos), { cai: k } (solta, caindo até o pé; k de 0 a 1) ou null (a bola é a do jogo)
  bolaDoSaque() {
    const c = this.clip;
    if (c && c.nome === "pegaBola") return "mao";
    if (c && c.nome === "saque") { const tc = this.tempoNoClipe(); if (tc < c.C.solta) return "mao"; if (tc < c.C.imp) return { cai: (tc - c.C.solta) / (c.C.imp - c.C.solta) }; return null; }
    return this.segura && !c ? "mao" : null;
  }
  atualizar(u, body, mov, dt, pronto) {
    this.t += dt;
    const vel = mov.vel, cam = vel > 0.15 ? 1 : 0, ir = clamp((vel - 0.25) / 1.0, 0, 1), rapido = clamp((vel - 2) / 2, 0, 1);
    // para onde está indo (no referencial do atleta): as animações misturadas pelo quanto aponta para cada lado; de lado,
    // devagar anda de lado e rápido corre de lado
    let wf = 0, wb = 0, wl = 0, wr = 0;
    if (cam) { const f = mov.fwd / vel, l = mov.lat / vel; wf = Math.max(0, f) ** 2; wb = Math.max(0, -f) ** 2; wr = Math.max(0, l) ** 2; wl = Math.max(0, -l) ** 2; const s = wf + wb + wl + wr || 1; wf /= s; wb /= s; wl /= s; wr /= s; }
    const pr = pronto && !this.segura ? 1 : 0; // esperando a bola: a base aberta (segurando a bola para sacar, fica em pé)
    const alvo = { idle: (1 - ir) * (1 - pr), pr: (1 - ir) * pr, f: ir * wf, b: ir * wb, l: ir * wl * rapido, r: ir * wr * rapido, wl: ir * wl * (1 - rapido), wr: ir * wr * (1 - rapido) };
    const k = 1 - Math.exp(-dt * 12), W = this.w;
    for (const n in alvo) W[n] += (alvo[n] - W[n]) * k;
    this.ws += ((this.segura ? 1 : 0) - this.ws) * k;
    this.fase = (this.fase + dt * clamp(vel / 4.2, 0.5, 1.5) / 0.63) % 1;
    this.faseW = (this.faseW + dt * clamp(vel / 1.6, 0.6, 1.6) / 1.47) % 1;
    // a freada: vinha correndo e parou de repente
    this.vRecente = Math.max(vel, this.vRecente - dt * 5);
    if (!this.clip && this.vRecente > 4 && vel < 1.2 && !this.segura) { this.disparar("parada"); this.vRecente = 0; }
    // o golpe por cima de tudo: entra rápido, sai no fim
    let g = 0, c = this.clip;
    if (c) {
      c.t += dt * c.escala;
      g = c.t < 0 ? 0 : Math.min(ease(c.t, 0, c.entra), 1 - ease(c.t, c.dur - 0.2, c.dur));
      if (c.t >= c.dur) {
        const depois = c.depois; this.clip = null; c = null; g = 0;
        if (depois) { this.disparar(depois, { lado: this.m }); c = this.clip; }
      }
    }
    const base = 1 - g, A = this.a;
    const loco = (n, w, fase) => { const ac = A[n]; if (!ac) return; ac.weight = w * base; if (fase != null) ac.time = fase * ac.getClip().duration; };
    loco("idleTransition", W.idle, 1.8 / A.idleTransition.getClip().duration);
    loco("goalkeeperSidestep", W.pr, (this.t / 0.5) % 1); // pronto: a base aberta, quicando
    loco("running", W.f, this.fase); loco("runningBackward", W.b, this.fase); loco("leftStrafe", W.l, this.fase); loco("rightStrafe", W.r, this.fase);
    loco("walkStrafeLeft", W.wl, this.faseW); loco("walkStrafeRight", W.wr, this.faseW);
    for (const n of this.golpes) if (A[n] && !BASE.includes(n)) A[n].weight = 0;
    if (A.segura) { A.segura.weight = this.ws * base * 1000; A.segura.time = 0.35; } // os braços seguram a bola por cima de qualquer passada
    if (c) {
      const ac = A[c.C.c];
      if (ac) { ac.weight = Math.max(ac.weight, g); ac.time = this.tempoNoClipe(c); }
      this.m = c.m;
    } else this.m = 1;
    // o pulo dos toques no alto: sobe até o impacto e desce
    const salto = c && c.salto ? c.salto * bump(Math.max(0, c.t), 0, Math.min(c.dur, c.impT * 1.9)) : 0;
    this.mixer.update(0);
    if (this.caixas && u && u.legs) { this.espelho.scale.x = 1; this.caixas.copiar(u, this.m, salto); }
    else { this.espelho.scale.x = this.m; this.espelho.position.y = salto; }
    // a pegada: a cada meio ciclo da corrida
    const meio = Math.floor(this.fase * 2) % 2; let pisou = false;
    if (ir > 0.5 && !c && meio !== this.meio) { pisou = true; this.passoAnt = meio ? 1 : -1; }
    this.meio = meio;
    return pisou;
  }
}
