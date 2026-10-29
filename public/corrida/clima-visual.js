// Corrida da Galera — o visual do clima (regras de F1): tudo é dirigido por `clima` (clima.js) e muda devagar, sem salto.
//   céu fechado (um domo de nuvens por cima da foto), sol fraco e sem sombra dura, luz mais fria e baixa, neblina cinza e
//   mais perto · gotas caindo em volta da câmera (um LineSegments só: traços curtos e transparentes que param no chão e viram
//   respingos de anel) · gotas na tela (canvas 2D: poucas lentes d'água que escorrem
//   para as bordas conforme a velocidade; só na primeira pessoa e um pouco na câmera de trás) · asfalto escuro e espelhado conforme `agua`, com poças, o traçado ideal mais seco, rastro dos carros e a
//   luz deles refletida (agua-pista.js) · borrifo atrás dos carros mais perto da câmera (um Points só, com LOD) · chiado de chuva e dos pneus no molhado (sons.js) · o ícone e o nível da pista no HUD (#hClima).
// Gasta tudo na criação: nada é alocado por quadro, e sem chuva e com a pista seca o passo não faz nada.
// A luz, a neblina e o fundo são escritos por outros módulos (pista.js e ceu.js, a cada pista): aqui guarda-se a BASE (o
// último valor que não foi escrito por mim) e escreve-se base × fator, então ao parar de chover tudo volta ao que era.
import * as THREE from "three";
import { renderer, scene, hemi, sun, canvasTex } from "./cena.js";
import { clima } from "./clima.js";
import { Sound } from "./sons.js";
import { $ } from "./estado.js";

const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const lim = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const suave = (a, b, v) => { const k = lim((v - a) / (b - a)); return k * k * (3 - 2 * k); };
const frac = (v) => v - Math.floor(v);

// ---------- o que escurece o céu e a luz ----------
let I = 0; // a chuva suavizada (0 a 1): sobe em ~5 s e desce em ~10 s; o céu e as gotas seguem ela, não o degrau de `clima.chuva`
const esc = () => ({ b: 0, u: NaN }), cor = () => ({ base: new THREE.Color(), ult: new THREE.Color(), ok: false });
const eSol = esc(), eHemi = esc(), eAmb = esc(), eExp = esc(), eNear = esc(), eFar = esc(), eCorSol = cor(), eCorHemi = cor(), eCorFog = cor();
let fogRef = null;
// escalar: se o valor não é o que escrevi da última vez, alguém mudou a base; devolve base × fator
function escalar(e, atual, fator) { if (!(Math.abs(atual - e.u) < 1e-5)) e.b = atual; return (e.u = e.b * fator); }
function capturar(e, atual) { if (!e.ok || Math.abs(atual.r - e.ult.r) + Math.abs(atual.g - e.ult.g) + Math.abs(atual.b - e.ult.b) > 1e-4) { e.base.copy(atual); e.ok = true; } }
const FRIO_SOL = new THREE.Color(0xc8d4e4), FRIO_HEMI = new THREE.Color(0xa9b8ca), cinza = new THREE.Color(), BRANCO = new THREE.Color(1, 1, 1);

// o domo de nuvens: uma calota em volta da câmera, mais escura no alto, com nuvens pintadas que andam devagar. Desenhada
// antes de tudo o que é transparente (renderOrder) e escondida atrás do chão e das montanhas pelo teste de profundidade.
const nuvens = canvasTex(512, 128, (x, w, h, r) => {
  x.fillStyle = "#e6e6e6"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const px = r() * w, py = r() * h, rad = 18 + r() * 46, tom = r() < 0.5 ? "190,190,196" : "255,255,255", a = 0.1 + r() * 0.16;
    for (const dx of [-w, 0, w]) { // dá a volta: a emenda do lado não aparece
      const g = x.createRadialGradient(px + dx, py, 0, px + dx, py, rad); g.addColorStop(0, `rgba(${tom},${a})`); g.addColorStop(1, `rgba(${tom},0)`);
      x.fillStyle = g; x.fillRect(px + dx - rad, py - rad, rad * 2, rad * 2);
    }
  }
});
nuvens.repeat.set(2, 1);
const domo = (() => {
  const R = 12000, g = new THREE.SphereGeometry(R, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const s = 1 - 0.42 * Math.pow(lim(p.getY(i) / R), 0.7); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = s; } // alto escuro, horizonte claro (a cor do horizonte é a da neblina)
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: nuvens, vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.visible = false; m.name = "clima-nuvens"; return m;
})();

// ---------- as gotas caindo ----------
// Traços curtos, cinza-azulados e transparentes (alfa por vértice, a cauda some), inclinados pela velocidade do carro. Cada gota cai
// até o chão do ponto onde está (a altura vem de uma grade de alturas em volta da câmera, refeita só quando a câmera muda de
// célula) e, perto da câmera, vira um respingo: um anel e um pontinho que somem rápido no asfalto (pool fixo de quadrados deitados).
const MAX_GOTAS = 2200, QUEDA = 520; // unidades por segundo
const gotasPos = new Float32Array(MAX_GOTAS * 6), gotasCor = new Float32Array(MAX_GOTAS * 8), semente = new Float32Array(MAX_GOTAS * 3);
{
  let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < semente.length; i++) semente[i] = r();
  for (let i = 0; i < MAX_GOTAS; i++) { // a ponta de baixo (a cabeça) tem alfa de 0,05 a 0,32 e a de cima, zero
    const a = 0.05 + 0.27 * Math.pow(r(), 2), t = r(), o = i * 8;
    gotasCor[o] = 0.6 + 0.1 * t; gotasCor[o + 1] = 0.7 + 0.1 * t; gotasCor[o + 2] = 0.82 + 0.06 * t; gotasCor[o + 3] = a;
    gotasCor[o + 4] = gotasCor[o]; gotasCor[o + 5] = gotasCor[o + 1]; gotasCor[o + 6] = gotasCor[o + 2]; gotasCor[o + 7] = 0;
  }
}
const gotasAttr = new THREE.BufferAttribute(gotasPos, 3).setUsage(THREE.DynamicDrawUsage);
const gotasGeo = new THREE.BufferGeometry(); gotasGeo.setAttribute("position", gotasAttr); gotasGeo.setAttribute("color", new THREE.BufferAttribute(gotasCor, 4)); gotasGeo.setDrawRange(0, 0);
const gotas = new THREE.LineSegments(gotasGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, fog: true, depthWrite: false }));
gotas.frustumCulled = false; gotas.visible = false; gotas.renderOrder = 5; gotas.name = "clima-gotas";
const onda = (v, S) => v - S * Math.floor(v / S + 0.5); // v em [-S/2, S/2)

// a altura do chão em volta da câmera: 9×9 pontos a cada 60 unidades, em volta da célula da câmera (`tr.chao` do pista.js)
const GR_N = 9, GR_C = 60, grAlt = new Float32Array(GR_N * GR_N);
let grX = NaN, grZ = NaN, grTr = null;
function atualizarChao(tr, cx, cz, fixo) {
  const gx = Math.round(cx / GR_C) * GR_C, gz = Math.round(cz / GR_C) * GR_C;
  if (gx === grX && gz === grZ && tr === grTr) return;
  grX = gx; grZ = gz; grTr = tr;
  for (let j = 0; j < GR_N; j++) for (let i = 0; i < GR_N; i++) grAlt[j * GR_N + i] = tr.chao ? tr.chao(gx + (i - 4) * GR_C, gz + (j - 4) * GR_C) : fixo;
}
function alturaChao(x, z) {
  const fx = lim((x - grX) / GR_C + 4, 0, 7.999), fz = lim((z - grZ) / GR_C + 4, 0, 7.999), i = fx | 0, j = fz | 0, a = fx - i, b = fz - j, o = j * GR_N + i;
  return (grAlt[o] * (1 - a) + grAlt[o + 1] * a) * (1 - b) + (grAlt[o + GR_N] * (1 - a) + grAlt[o + GR_N + 1] * a) * b;
}

// os respingos: quadrados deitados no chão (um por respingo, quatro vértices), com o anel e o pontinho desenhados no sombreador
const N_RESP = 128;
const rPos = new Float32Array(N_RESP * 12), rFase = new Float32Array(N_RESP * 4), rUv = new Float32Array(N_RESP * 8), rIdx = new Uint16Array(N_RESP * 6);
const rX = new Float32Array(N_RESP), rY = new Float32Array(N_RESP), rZ = new Float32Array(N_RESP), rVida = new Float32Array(N_RESP), rVida0 = new Float32Array(N_RESP), rRaio = new Float32Array(N_RESP);
for (let k = 0; k < N_RESP; k++) {
  rUv.set([0, 0, 1, 0, 1, 1, 0, 1], k * 8); rIdx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6); rFase.fill(1, k * 4, k * 4 + 4);
}
const rAttrPos = new THREE.BufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage), rAttrFase = new THREE.BufferAttribute(rFase, 1).setUsage(THREE.DynamicDrawUsage);
const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute("position", rAttrPos); rGeo.setAttribute("fase", rAttrFase); rGeo.setAttribute("uv", new THREE.BufferAttribute(rUv, 2)); rGeo.setIndex(new THREE.BufferAttribute(rIdx, 1));
const rMat = new THREE.ShaderMaterial({
  uniforms: { cor: { value: new THREE.Color(0xdfe6ee) }, op: { value: 0.5 } },
  vertexShader: `attribute float fase; varying vec2 vUv; varying float vT; void main() { vUv = uv; vT = fase; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 cor; uniform float op; varying vec2 vUv; varying float vT;
    void main() { float d = length(vUv * 2.0 - 1.0); float anel = smoothstep(0.2, 0.0, abs(d - 0.74)), ponto = smoothstep(0.4, 0.0, d) * (1.0 - smoothstep(0.0, 0.35, vT));
      float a = (anel * 0.6 + ponto * 0.7) * (1.0 - vT) * op; if (a < 0.01) discard; gl_FragColor = vec4(cor, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
});
const resp = new THREE.Mesh(rGeo, rMat); resp.frustumCulled = false; resp.visible = false; resp.renderOrder = 4; resp.name = "clima-respingos";
let rProx = 0, rVivos = 0, gotaT = -1;
function respingo(x, z, tr, fixo, cima) {
  const i = rProx; rProx = (rProx + 1) % N_RESP; if (rVida[i] <= 0) rVivos++;
  rX[i] = x; rZ[i] = z; rY[i] = (tr.chao ? tr.chao(x, z) : fixo) + 0.85; rVida0[i] = rVida[i] = 0.2 + Math.random() * 0.18; rRaio[i] = (1.6 + Math.random() * 1.8) * (cima ? 2.5 : 1);
}
function passoRespingos(dt) {
  if (rVivos <= 0) { if (resp.visible) resp.visible = false; return; }
  resp.visible = true;
  for (let k = 0; k < N_RESP; k++) {
    if (rVida[k] <= 0) continue;
    rVida[k] -= dt; const o = k * 12;
    if (rVida[k] <= 0) { rVivos--; rPos.fill(0, o, o + 12); rFase.fill(1, k * 4, k * 4 + 4); continue; }
    const t = 1 - rVida[k] / rVida0[k], r = rRaio[k] * (0.35 + 0.65 * Math.sqrt(t)), x = rX[k], y = rY[k], z = rZ[k];
    rPos[o] = x - r; rPos[o + 1] = y; rPos[o + 2] = z - r; rPos[o + 3] = x + r; rPos[o + 4] = y; rPos[o + 5] = z - r;
    rPos[o + 6] = x + r; rPos[o + 7] = y; rPos[o + 8] = z + r; rPos[o + 9] = x - r; rPos[o + 10] = y; rPos[o + 11] = z + r;
    rFase.fill(t, k * 4, k * 4 + 4);
  }
  rAttrPos.needsUpdate = rAttrFase.needsUpdate = true;
  rMat.uniforms.op.value = 0.3 + 0.5 * I;
  if (scene.fog) rMat.uniforms.cor.value.copy(scene.fog.color).lerp(BRANCO, 0.4);
}

// ---------- o borrifo atrás dos carros ----------
// A "fumaça" de chuva que o carro levanta: nuvens de pontos macios (um Points só, com textura de nuvem que gira) atrás das rodas
// traseiras e do difusor, mais densas e altas com a velocidade e com a água na pista. LOD: os 3 carros mais perto da câmera soltam
// o borrifo inteiro; os outros até 5, com menos, e os longe quase nada. Os carros perto também mandam a posição para o asfalto
// (rastro mais seco e a luz refletida: agua-pista.js).
const N_SPRAY = 640, K_CARROS = 8, K_PERTO = 3;
const sPos = new Float32Array(N_SPRAY * 3), sTam = new Float32Array(N_SPRAY), sAlfa = new Float32Array(N_SPRAY), sRot = new Float32Array(N_SPRAY);
const sVx = new Float32Array(N_SPRAY), sVy = new Float32Array(N_SPRAY), sVz = new Float32Array(N_SPRAY), sVida = new Float32Array(N_SPRAY), sVida0 = new Float32Array(N_SPRAY), sTam0 = new Float32Array(N_SPRAY), sA0 = new Float32Array(N_SPRAY), sGiro = new Float32Array(N_SPRAY);
const sGeo = new THREE.BufferGeometry();
const sAttrPos = new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage), sAttrTam = new THREE.BufferAttribute(sTam, 1).setUsage(THREE.DynamicDrawUsage), sAttrAlfa = new THREE.BufferAttribute(sAlfa, 1).setUsage(THREE.DynamicDrawUsage), sAttrRot = new THREE.BufferAttribute(sRot, 1).setUsage(THREE.DynamicDrawUsage);
sGeo.setAttribute("position", sAttrPos); sGeo.setAttribute("tam", sAttrTam); sGeo.setAttribute("alfa", sAttrAlfa); sGeo.setAttribute("rot", sAttrRot);
// a nuvem: vários borrões somados e apagados em volta, só o canal alfa importa
const puff = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * 6.2832, d = Math.random() * 15, px = 32 + Math.cos(a) * d, py = 32 + Math.sin(a) * d, rad = 9 + Math.random() * 12, g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, "rgba(255,255,255,0.34)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }
  x.globalCompositeOperation = "destination-in"; const m = x.createRadialGradient(32, 32, 0, 32, 32, 31); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(0.6, "rgba(0,0,0,0.8)"); m.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = m; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
})();
const sMat = new THREE.ShaderMaterial({
  uniforms: { cor: { value: new THREE.Color(0xdfe6ee) }, escala: { value: 600 }, mapa: { value: puff } },
  vertexShader: `attribute float tam; attribute float alfa; attribute float rot; uniform float escala; varying float vA; varying float vR;
    void main() { vA = alfa; vR = rot; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(tam * escala / max(1.0, -mv.z), 0.0, 260.0); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 cor; uniform sampler2D mapa; varying float vA; varying float vR;
    void main() { vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); float t = texture2D(mapa, vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5).a; float a = t * vA; if (a < 0.004) discard; gl_FragColor = vec4(cor * (0.84 + 0.16 * t), a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  transparent: true, depthWrite: false,
});
const spray = new THREE.Points(sGeo, sMat); spray.frustumCulled = false; spray.visible = false; spray.name = "clima-borrifo";
let sProx = 0, sVivos = 0;
const emissor = new Array(K_CARROS).fill(null), emissorD = new Float32Array(K_CARROS), emissorMeu = new Array(K_CARROS).fill(false);
const tamBuf = new THREE.Vector2();
let nEmissores = 0, acMeu = 0;
function candidato(car, meu, cp) {
  const dx = car.x - cp.x, dy = (car.z || 0) - cp.y, dz = car.y - cp.z, d = dx * dx + dy * dy + dz * dz;
  if (d > 2500 * 2500 || (nEmissores === K_CARROS && d >= emissorD[K_CARROS - 1])) return;
  let j = nEmissores < K_CARROS ? nEmissores++ : K_CARROS - 1;
  while (j > 0 && emissorD[j - 1] > d) { emissor[j] = emissor[j - 1]; emissorD[j] = emissorD[j - 1]; emissorMeu[j] = emissorMeu[j - 1]; j--; }
  emissor[j] = car; emissorD[j] = d; emissorMeu[j] = meu;
}
// f: de 0 a 1, a velocidade com a água na pista (mais alto, mais longo e mais denso)
function nascer(car, a, v, f) {
  const i = sProx; sProx = (sProx + 1) % N_SPRAY; if (sVida[i] <= 0) sVivos++;
  const fx = Math.cos(a), fy = Math.sin(a), centro = Math.random() < 0.28, lado = Math.random() < 0.5 ? -1 : 1; // 28% sobe do difusor, no meio; o resto atrás de cada roda de trás
  const atras = centro ? 24 + Math.random() * 8 : 17 + Math.random() * 9, la = centro ? (Math.random() - 0.5) * 7 : lado * (7 + Math.random() * 4);
  sPos[i * 3] = car.x - fx * atras - fy * la; sPos[i * 3 + 1] = (car.z || 0) + (centro ? 5 : 2.5) + Math.random() * 3; sPos[i * 3 + 2] = car.y - fy * atras + fx * la;
  const vel = v * (0.2 + Math.random() * 0.14); // sai com uma parte da velocidade do carro e o ar freia: o carro corre e a nuvem fica
  sVx[i] = fx * vel + (Math.random() - 0.5) * 26 + -fy * lado * (centro ? 4 : 16); sVz[i] = fy * vel + (Math.random() - 0.5) * 26 + fx * lado * (centro ? 4 : 16);
  sVy[i] = (centro ? 34 : 20) + (18 + 34 * f) * Math.random();
  sVida0[i] = sVida[i] = 1 + Math.random() * 0.8 + 0.5 * f; sTam0[i] = (9 + Math.random() * 8) * (0.75 + 0.55 * f) * (centro ? 1.25 : 1); sTam[i] = sTam0[i];
  sA0[i] = (0.13 + Math.random() * 0.11) * (0.55 + 0.45 * f); sAlfa[i] = 0; sRot[i] = Math.random() * 6.2832; sGiro[i] = (Math.random() - 0.5) * 1.2;
}
function passoSpray(dt, c, race, cam) {
  const agua = suave(0.2, 0.8, clima.agua), cp = cam.position;
  if (agua > 0.01) {
    // os K carros mais perto da câmera (insere em ordem num vetor fixo)
    nEmissores = 0;
    if (race.kart && race.kart.g.visible) candidato(c, true, cp);
    for (const gh of race.ghosts.values()) if (gh.kart && gh.kart.g.visible !== false) candidato(gh, false, cp);
    for (let k = 0; k < nEmissores; k++) {
      const car = emissor[k], meu = emissorMeu[k], v = Math.abs(car.v || 0), f = suave(70, 290, v) * agua, lod = k < K_PERTO ? 1 : emissorD[k] > 900 * 900 ? 0.25 : 0.45;
      const fx = Math.cos(car.a || 0), fy = Math.sin(car.a || 0), rastro = v > 20 ? lim(v * 0.5, 0, 150) : 0;
      for (let q = 0; q < asfU.length; q++) { // o asfalto: o rastro mais seco por trás do carro e a luz traseira e o farol refletidos (o meu carro não reflete: a câmera está nele)
        const u = asfU[q]; u.uCarros.value[k].set(car.x, car.y, -fx * rastro, -fy * rastro);
        u.uLuzes.value[k * 2].set(car.x - fx * 24, car.y - fy * 24, 9, meu ? 0 : 2.2); u.uLuzes.value[k * 2 + 1].set(car.x + fx * 26, car.y + fy * 26, 5, meu ? 0 : 0.55);
      }
      if (f < 0.02) continue;
      let ac = (meu ? acMeu : car.__borrifo || 0) + dt * 70 * f * lod * (meu ? 0.7 : 1); // (o acumulador do meu carro fica aqui: `race.vis` pode ser outro objeto a cada quadro)
      for (let m = 0; ac >= 1; ac -= 1) { if (m++ < 8) nascer(car, car.a, v, f); }
      if (meu) acMeu = ac; else car.__borrifo = ac;
    }
    for (let k = 0; k < nEmissores; k++) emissor[k] = null;
    for (let k = nEmissores; k < K_CARROS; k++) for (let q = 0; q < asfU.length; q++) { asfU[q].uCarros.value[k].set(0, 0, 0, 0); asfU[q].uLuzes.value[k * 2].set(0, 0, 0, 0); asfU[q].uLuzes.value[k * 2 + 1].set(0, 0, 0, 0); }
  }
  if (sVivos <= 0) { if (spray.visible) spray.visible = false; return; }
  spray.visible = true;
  const drag = Math.exp(-1.7 * dt);
  for (let i = 0; i < N_SPRAY; i++) {
    if (sVida[i] <= 0) continue;
    sVida[i] -= dt;
    if (sVida[i] <= 0) { sVivos--; sAlfa[i] = 0; sTam[i] = 0; continue; }
    const k = 1 - sVida[i] / sVida0[i];
    sVx[i] *= drag; sVz[i] *= drag; sVy[i] = sVy[i] * drag - 3 * dt;
    sPos[i * 3] += sVx[i] * dt; sPos[i * 3 + 1] += sVy[i] * dt; sPos[i * 3 + 2] += sVz[i] * dt;
    sTam[i] = sTam0[i] * (1 + 3.2 * k); sAlfa[i] = sA0[i] * Math.min(1, k * 8) * (1 - k); sRot[i] += sGiro[i] * dt;
  }
  sAttrPos.needsUpdate = sAttrTam.needsUpdate = sAttrAlfa.needsUpdate = sAttrRot.needsUpdate = true;
  renderer.getDrawingBufferSize(tamBuf);
  sMat.uniforms.escala.value = tamBuf.y / (2 * Math.tan((cam.fov * Math.PI) / 360));
  if (scene.fog) sMat.uniforms.cor.value.copy(scene.fog.color).lerp(BRANCO, 0.25);
}

// ---------- o asfalto molhado ----------
// os materiais marcados com `userData.asfalto` (pista.js, asfalto-gp.js e a zebra do kit/chao.js) escurecem e ficam lisos conforme a
// água. O asfalto da pista tem o sombreador de agua-pista.js (`userData.aguaPista`: poças, traçado seco, reflexos), que só precisa do
// `uAgua`; a zebra (`asfalto: "zebra"`) só escurece e ganha brilho.
let asfaltos = [], asfU = [], aguaAplicada = -1, aguaSuave = 0, trAtual = null;
const aguaAlvo = () => suave(0, 0.8, clima.agua);
function aplicarAsfalto(w) {
  for (const a of asfaltos) {
    if (a.u) { a.u.uAgua.value = w; if (a.bump != null) a.m.bumpScale = a.bump * (1 - 0.5 * w); continue; }
    a.m.color.copy(a.cor).multiplyScalar(1 - (a.zebra ? 0.28 : 0.42) * w);
    a.m.roughness = a.rug + ((a.zebra ? 0.22 : 0.16) - a.rug) * w;
    if (a.bump != null) a.m.bumpScale = a.bump * (1 - 0.5 * w);
  }
}
function coletarAsfalto(tr) {
  aguaAplicada = 0; aplicarAsfalto(0); asfaltos = []; asfU = []; trAtual = tr;
  tr.grp.traverse((o) => {
    const m = o.material;
    if (m && !Array.isArray(m) && m.userData.asfalto && !asfaltos.some((a) => a.m === m)) {
      const u = m.userData.aguaPista || null; asfaltos.push({ m, u, zebra: m.userData.asfalto === "zebra", cor: m.color.clone(), rug: m.roughness, bump: m.bumpScale });
      if (u) asfU.push(u);
    }
  });
  aguaSuave = aguaAlvo(); aguaAplicada = -1;
}

// ---------- as gotas na tela ----------
// Poucas gotas, cada uma uma lentinha de água: corpo translúcido (sprite pré-desenhado), borda escura embaixo, brilho do céu em cima
// e um clarão por dentro. Paradas, escorrem devagar pela gravidade (aos soquinhos); com velocidade fogem do centro da tela para as
// bordas, se alongam na direção do movimento e deixam um rastro fino que some. Nada é alocado por quadro (as gotas, os rastros e o
// sprite nascem uma vez) e o canvas segue o DPR (até 1,5) e o tamanho da janela; as contas são em pixels CSS.
const cvTela = $("climaGotas"), ctxTela = cvTela && cvTela.getContext("2d");
const N_TELA = 44, N_RASTRO = 10, RASTRO_VIDA = 1.5;
const G = Array.from({ length: N_TELA }, () => ({
  vivo: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, t: 0, vida: 0, a: 0, ang: Math.PI / 2, grude: 0, fase: 0, esc: 0, dir: 0, px: 0, py: 0,
  rx: new Float32Array(N_RASTRO), ry: new Float32Array(N_RASTRO), rt: new Float32Array(N_RASTRO), rCab: 0, rN: 0,
}));
let telaW = 0, telaH = 0, telaEsc = 1, telaNivel = 0, telaOn = false, telaAc = 0, telaOp = -1, telaRel = 1;
// o corpo da gota: miolo claro e translúcido, anel escuro fino na borda (a borda de baixo é reforçada por um arco, por gota)
const sprGota = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, "rgba(225,236,247,0.13)"); g.addColorStop(0.55, "rgba(205,222,240,0.10)"); g.addColorStop(0.82, "rgba(120,145,170,0.16)"); g.addColorStop(0.94, "rgba(14,24,36,0.36)"); g.addColorStop(1, "rgba(14,24,36,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
})();
function ajustarTela() {
  if (!cvTela) return;
  telaEsc = Math.min(window.devicePixelRatio || 1, 1.5); telaW = Math.max(2, innerWidth); telaH = Math.max(2, innerHeight);
  cvTela.width = Math.max(2, Math.round(telaW * telaEsc)); cvTela.height = Math.max(2, Math.round(telaH * telaEsc)); telaRel = Math.min(1.6, Math.max(0.7, telaH / 900));
}
addEventListener("resize", ajustarTela); ajustarTela();
function nascerGota(g, w) {
  const dispersao = 1 - 0.5 * w; // em velocidade nascem mais perto do centro e logo escorrem para fora
  g.vivo = true; g.t = 0; g.vida = 3.5 + Math.random() * 5; g.r = (2.4 + 10.5 * Math.pow(Math.random(), 2.5)) * telaRel;
  g.x = telaW * (0.5 + (Math.random() - 0.5) * dispersao); g.y = telaH * (0.42 + (Math.random() - 0.5) * dispersao);
  g.vx = g.vy = 0; g.ang = Math.PI / 2; g.dir = Math.random() * 6.2832; g.fase = Math.random() * 6.2832; g.a = 0; g.rN = 0; g.rCab = 0; g.px = g.x; g.py = g.y;
  g.grude = 0.04 + 0.30 * Math.pow(Math.random(), 0.8) * (1.15 - Math.min(1, g.r / (10 * telaRel))); // gota pequena agarra mais no vidro
  g.esc = 0.6 + 0.9 * Math.min(1, g.r / (9 * telaRel)); // gota grande escorre mais rápido
}
function passoTela(dt, mode, sK) {
  if (!cvTela) return;
  const alvo = reduz.matches ? 0 : mode === "cockpit" ? 1 : mode === "perto" ? 0.4 : 0, w = suave(0.04, 1, Math.min(1, sK)); // w: a velocidade do carro, 0 a 1
  telaNivel += (alvo * (I > 0.02 ? 1 : 0.0001) - telaNivel) * (1 - Math.exp(-dt * 2.5)); // sem chuva, o nível desce e as gotas que sobram escorrem
  let vivas = 0; for (const g of G) if (g.vivo) vivas++;
  if (I > 0.02 && alvo > 0.02) { // poucas: garoa umas 6, chuva forte umas 30; vão nascendo uma a uma enquanto faltam
    const meta = Math.round(alvo * (2 + 30 * Math.pow(I, 1.6)));
    if (vivas < meta) {
      telaAc += dt * (0.9 + 2.2 * w) * (meta - vivas) * 0.5;
      while (telaAc >= 1 && vivas < meta) { telaAc -= 1; let g = null; for (const o of G) if (!o.vivo) { g = o; break; } if (!g) break; nascerGota(g, w); vivas++; }
    } else telaAc = 0;
  }
  if (telaNivel < 0.01 && !vivas) { if (telaOn) { telaOn = false; cvTela.style.display = "none"; ctxTela.setTransform(1, 0, 0, 1, 0, 0); ctxTela.clearRect(0, 0, cvTela.width, cvTela.height); } return; }
  if (!telaOn) { telaOn = true; cvTela.style.display = "block"; }
  const op = Math.round(telaNivel * 100) / 100; if (op !== telaOp) { telaOp = op; cvTela.style.opacity = op; }
  const S = telaEsc, cx = telaW * 0.5, cy = telaH * 0.42, meia = Math.hypot(telaW, telaH) * 0.5, kv = 1 - Math.exp(-dt * 5);
  ctxTela.setTransform(1, 0, 0, 1, 0, 0); ctxTela.clearRect(0, 0, cvTela.width, cvTela.height); ctxTela.setTransform(S, 0, 0, S, 0, 0); ctxTela.lineCap = "round";
  // mexe: gravidade devagar (aos soquinhos) + fuga radial pelo vento, que cresce com a velocidade e com a distância do centro
  for (const g of G) {
    if (!g.vivo) continue;
    g.t += dt; if (g.t >= g.vida) { g.vivo = false; continue; }
    const dx = g.x - cx, dy = g.y - cy, d = Math.hypot(dx, dy), q = Math.min(1.2, d / meia);
    const ux = d > 6 ? dx / d : Math.cos(g.dir), uy = d > 6 ? dy / d : Math.sin(g.dir); // no centro, cada uma escolhe um lado
    const solta = suave(g.grude, g.grude + 0.25, w); // a gota só sai do lugar quando o vento vence a aderência
    const vr = solta * g.esc * telaH * (0.16 + 1.05 * q * q) * (0.35 + 0.65 * w);
    const grav = (1 - w) * Math.max(0, Math.sin(g.t * 1.4 + g.fase)) * Math.max(0, g.r / telaRel - 2.6) * 5.2 * telaRel; // parada, escorre aos soquinhos; as pequenas ficam
    g.vx += (ux * vr - g.vx) * kv; g.vy += (uy * vr + grav - g.vy) * kv;
    g.x += g.vx * dt; g.y += g.vy * dt;
    const m = g.r * 3 + 30; if (g.x < -m || g.x > telaW + m || g.y < -m || g.y > telaH + m) { g.vivo = false; continue; }
    // o rastro: um ponto a cada tanto andado (mais espaçado em velocidade); os mais velhos vão saindo
    const sp = Math.hypot(g.vx, g.vy), passo = Math.max(3, g.r * 0.9, sp * 0.03);
    if (Math.hypot(g.x - g.px, g.y - g.py) >= passo) {
      const i = g.rCab; g.rx[i] = g.x; g.ry[i] = g.y; g.rt[i] = g.t; g.rCab = (i + 1) % N_RASTRO; if (g.rN < N_RASTRO) g.rN++; g.px = g.x; g.py = g.y;
    }
    while (g.rN > 0 && g.t - g.rt[(g.rCab - g.rN + N_RASTRO) % N_RASTRO] > RASTRO_VIDA) g.rN--;
    if (sp > 6) g.ang = Math.atan2(g.vy, g.vx);
    g.a = Math.min(1, g.t / 0.35, (g.vida - g.t) / 1.1);
  }
  // 1) os rastros: um fio fino de água, mais claro perto da gota e sumindo para trás
  ctxTela.strokeStyle = "rgb(205,222,238)";
  for (const g of G) {
    if (!g.vivo || g.rN < 1) continue;
    let ax = g.x, ay = g.y;
    for (let k = 0; k < g.rN; k++) {
      const i = (g.rCab - 1 - k + N_RASTRO * 2) % N_RASTRO, f = 1 - (g.t - g.rt[i]) / RASTRO_VIDA; if (f <= 0) break;
      ctxTela.globalAlpha = g.a * 0.34 * f; ctxTela.lineWidth = Math.max(0.8, g.r * 0.5 * f);
      ctxTela.beginPath(); ctxTela.moveTo(ax, ay); ctxTela.lineTo(g.rx[i], g.ry[i]); ctxTela.stroke(); ax = g.rx[i]; ay = g.ry[i];
    }
  }
  // 2) o corpo (sprite esticado na direção do movimento) e, por cima, a borda de baixo, o clarão de dentro e o brilho do céu
  for (const g of G) {
    if (!g.vivo) continue;
    const sp = Math.hypot(g.vx, g.vy), e = Math.min(1.7, sp / (telaH * 0.45)), nasce = 0.55 + 0.45 * suave(0, 0.8, g.t), cresce = nasce * (1 + 0.14 * g.t / g.vida) * (0.85 + 0.15 * suave(0, 1.2, g.vida - g.t));
    const R = g.r * cresce, L = R * (1.04 + 1.5 * e), Wd = R * (0.92 - 0.26 * Math.min(1, e)), ca = Math.cos(g.ang), sa = Math.sin(g.ang);
    ctxTela.globalAlpha = g.a;
    ctxTela.setTransform(S * ca, S * sa, -S * sa, S * ca, S * g.x, S * g.y); ctxTela.drawImage(sprGota, -L, -Wd, L * 2, Wd * 2); ctxTela.setTransform(S, 0, 0, S, 0, 0);
    const baixo = Math.PI / 2 - g.ang;
    ctxTela.lineWidth = Math.max(0.8, R * 0.16); ctxTela.strokeStyle = "rgba(6,14,24,0.6)"; // a borda escura de baixo
    ctxTela.beginPath(); ctxTela.ellipse(g.x, g.y, L * 0.96, Wd * 0.96, g.ang, baixo - 0.95, baixo + 0.95); ctxTela.stroke();
    if (R > 3.2) { // o clarão de dentro, onde a água junta a luz do céu de cabeça para baixo
      ctxTela.lineWidth = Math.max(0.8, R * 0.2); ctxTela.strokeStyle = "rgba(238,246,255,0.34)";
      ctxTela.beginPath(); ctxTela.ellipse(g.x, g.y + R * 0.05, L * 0.74, Wd * 0.74, g.ang, baixo - 0.75, baixo + 0.75); ctxTela.stroke();
    }
    ctxTela.fillStyle = "rgba(255,255,255,0.85)"; // o brilho do céu, sempre em cima
    ctxTela.beginPath(); ctxTela.ellipse(g.x - R * 0.28, g.y - R * 0.4, Math.max(0.8, R * 0.22), Math.max(0.6, R * 0.13), -0.6, 0, 6.2832); ctxTela.fill();
    if (R > 4.5) { ctxTela.fillStyle = "rgba(255,255,255,0.4)"; ctxTela.beginPath(); ctxTela.arc(g.x + R * 0.3, g.y + R * 0.34, Math.max(0.7, R * 0.07), 0, 6.2832); ctxTela.fill(); }
  }
  ctxTela.globalAlpha = 1;
}

// ---------- o HUD ----------
const hClima = $("hClima");
const NUVEM = '<path d="M17.5 14H7a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.6 1.2A3.4 3.4 0 0 1 17.5 14z"/>';
const ICONES = {
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  garoa: NUVEM + '<path d="M8 17.5v1.5M12 17.5v3M16 17.5v1.5"/>',
  chuva: NUVEM + '<path d="M8 16.5l-1.5 4.5M12.5 16.5L11 21M17 16.5l-1.5 4.5"/>',
};
const ROTULO = { sol: "SOL", garoa: "GAROA", chuva: "CHUVA" }, PISTA = ["PISTA SECA", "PISTA ÚMIDA", "PISTA MOLHADA"];
const TIPOS = ["sol", "garoa", "chuva"]; let hudChave = -1;
function passoHud() {
  if (!hClima) return;
  const t = clima.chuva >= 0.9 ? 2 : clima.chuva > 0 ? 1 : 0, nivel = clima.agua < 0.15 ? 0 : clima.agua < 0.45 ? 1 : 2, chave = t * 3 + nivel, tipo = TIPOS[t];
  if (chave === hudChave) return; hudChave = chave;
  hClima.dataset.nivel = nivel; hClima.dataset.tipo = tipo;
  hClima.querySelector("svg").innerHTML = ICONES[tipo]; hClima.querySelector(".cl-t1").textContent = ROTULO[tipo]; hClima.querySelector(".cl-t2").textContent = PISTA[nivel];
}

// ---------- o laço ----------
scene.add(domo, gotas, resp, spray);
let ultRace = null, ativoAntes = false;
// chamado por quadro (jogo.js, depois de posicionar a câmera): `mode` é a câmera ("perto", "cockpit", "longe", "cima"), `src` o carro
// que a câmera segue e `c` o meu carro como é desenhado
export function passoClima(dt, race, cam, mode, src, c) {
  if (race !== ultRace) { ultRace = race; I = clima.chuva; sVivos = 0; sVida.fill(0); sAlfa.fill(0); rVivos = 0; rVida.fill(0); gotaT = -1; grX = NaN; coletarAsfalto(race.tr); }
  else if (race.tr !== trAtual) coletarAsfalto(race.tr);
  const k = clima.chuva > I ? 1 - Math.exp(-dt / 5) : 1 - Math.exp(-dt / 10);
  I += (clima.chuva - I) * k; if (I < 0.002 && clima.chuva === 0) I = 0;
  const sK = Math.min(1.2, Math.abs(src.v || 0) / 300);

  // céu, luz e neblina (some tudo, voltando à base, quando I chega a 0)
  if (I > 0 || ativoAntes) {
    const fog = scene.fog;
    if (fog !== fogRef) { fogRef = fog; eNear.u = eFar.u = NaN; eCorFog.ok = false; }
    sun.intensity = escalar(eSol, sun.intensity, 1 - 0.72 * I);
    hemi.intensity = escalar(eHemi, hemi.intensity, 1 - 0.28 * I);
    scene.environmentIntensity = escalar(eAmb, scene.environmentIntensity, 1 - 0.25 * I);
    renderer.toneMappingExposure = escalar(eExp, renderer.toneMappingExposure, 1 - 0.08 * I);
    sun.shadow.intensity = 1 - 0.8 * I;
    capturar(eCorSol, sun.color); sun.color.copy(eCorSol.base).lerp(FRIO_SOL, 0.7 * I); eCorSol.ult.copy(sun.color);
    capturar(eCorHemi, hemi.color); hemi.color.copy(eCorHemi.base).lerp(FRIO_HEMI, 0.6 * I); eCorHemi.ult.copy(hemi.color);
    if (fog) {
      fog.near = escalar(eNear, fog.near, 1 - 0.7 * I); fog.far = escalar(eFar, fog.far, 1 - 0.6 * I);
      capturar(eCorFog, fog.color); const l = eCorFog.base.r * 0.2126 + eCorFog.base.g * 0.7152 + eCorFog.base.b * 0.0722;
      cinza.setRGB(l * 0.78, l * 0.83, l * 0.89); fog.color.copy(eCorFog.base).lerp(cinza, 0.8 * I); eCorFog.ult.copy(fog.color);
      domo.material.color.copy(fog.color);
    }
    const op = Math.min(1, I * 1.15) * 0.94;
    domo.material.opacity = op; domo.visible = op > 0.01; domo.position.copy(cam.position);
    if (!reduz.matches) nuvens.offset.x = (nuvens.offset.x + dt * 0.002) % 1;
    ativoAntes = I > 0;
  }

  // as gotas caindo
  const dens = I < 0.01 ? 0 : (0.15 + 0.85 * I * I) * (reduz.matches ? 0.4 : mode === "cima" ? 0.6 : 1), n = Math.round(MAX_GOTAS * dens);
  if (n > 0) {
    const cima = mode === "cima", S = cima ? 1100 : 760, H = cima ? 700 : 420, cx = cima ? src.x : cam.position.x, cz = cima ? src.y : cam.position.z, fixo = src.z || 0;
    atualizarChao(race.tr, cx, cz, fixo);
    const tt = performance.now() / 1000, a = src.a || 0, h = sK * 380, rx = -Math.cos(a) * h, rz = -Math.sin(a) * h, ry = -QUEDA, rl = 1 / Math.hypot(rx, ry, rz), comp = 8 + 24 * sK;
    const dx = rx * rl * comp, dy = ry * rl * comp, dz = rz * rl * comp, comRespingo = gotaT >= 0 && I > 0.05 && !reduz.matches, RS2 = (cima ? 500 : 130) ** 2;
    let nr = 0;
    for (let i = 0; i < n; i++) {
      const sx = semente[i * 3], sy = semente[i * 3 + 1], sz = semente[i * 3 + 2], x = cx + onda(sx * S - cx, S), z = cz + onda(sz * S - cz, S), fase = frac(sy - (tt * QUEDA) / H);
      const y = (cima ? fixo : alturaChao(x, z)) + 0.5 + H * fase, q = 0.6 + 0.8 * frac(sx * 37), o = i * 6; // cada gota cai até o chão do seu ponto
      gotasPos[o] = x; gotasPos[o + 1] = y; gotasPos[o + 2] = z; gotasPos[o + 3] = x - dx * q; gotasPos[o + 4] = y - dy * q; gotasPos[o + 5] = z - dz * q; // a ponta fica no sentido de onde a gota vem, relativo ao carro
      if (comRespingo && nr < 14 && fase > frac(sy - (gotaT * QUEDA) / H)) { // a fase só sobe quando a gota bateu no chão e voltou ao alto: é o respingo
        const ex = x - cx, ez = z - cz; if (ex * ex + ez * ez < RS2) { respingo(x, z, race.tr, fixo, cima); nr++; }
      }
    }
    gotaT = tt;
    gotasGeo.setDrawRange(0, n * 2); gotasAttr.needsUpdate = true; gotas.material.opacity = 0.55 + 0.4 * I; gotas.visible = true;
  } else { gotaT = -1; if (gotas.visible) gotas.visible = false; }
  passoRespingos(dt);

  // asfalto: sobe e desce devagar atrás da água do clima e só mexe quando mudou de verdade
  const alvoW = aguaAlvo(); aguaSuave += (alvoW - aguaSuave) * (1 - Math.exp(-dt * 1.5)); if (Math.abs(alvoW - aguaSuave) < 0.002) aguaSuave = alvoW;
  if (aguaSuave !== aguaAplicada) { aguaAplicada = aguaSuave; aplicarAsfalto(aguaSuave); }
  if (aguaSuave > 0 && scene.fog) for (let q = 0; q < asfU.length; q++) asfU[q].uCeu.value.copy(scene.fog.color).multiplyScalar(0.9);

  passoSpray(dt, c, race, cam);
  passoTela(dt, mode, sK);
  passoHud();

  // o som: chuva pela intensidade, pneus no molhado pela velocidade do meu carro (mais baixo no túnel)
  const abafa = race.tr.coberto?.(race.idx) ? 0.3 : 1;
  Sound.chuva(I * abafa, race.kart ? lim(clima.agua * 1.3) * suave(40, 260, Math.abs(c.v || 0)) * abafa : 0);
}
// ao sair da corrida: tudo volta ao seco (a luz já volta sozinha quando I vai a 0; aqui é no corte)
export function limparClima() {
  I = 0; ultRace = null; domo.visible = gotas.visible = spray.visible = resp.visible = false; sVivos = 0; sVida.fill(0); rVivos = 0; rVida.fill(0); gotaT = -1; grX = NaN;
  if (ativoAntes) {
    ativoAntes = false;
    sun.intensity = escalar(eSol, sun.intensity, 1); hemi.intensity = escalar(eHemi, hemi.intensity, 1); scene.environmentIntensity = escalar(eAmb, scene.environmentIntensity, 1); renderer.toneMappingExposure = escalar(eExp, renderer.toneMappingExposure, 1);
    sun.shadow.intensity = 1; sun.color.copy(eCorSol.base); hemi.color.copy(eCorHemi.base);
    if (scene.fog && scene.fog === fogRef) { scene.fog.near = escalar(eNear, scene.fog.near, 1); scene.fog.far = escalar(eFar, scene.fog.far, 1); scene.fog.color.copy(eCorFog.base); }
  }
  aplicarAsfalto(0); aguaAplicada = -1; aguaSuave = 0; for (const g of G) g.vivo = false; telaNivel = 0;
  if (telaOn) { telaOn = false; cvTela.style.display = "none"; }
  Sound.chuva(0, 0);
}
