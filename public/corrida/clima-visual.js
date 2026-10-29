// Corrida da Galera — o visual do clima (regras de F1): tudo é dirigido por `clima` (clima.js) e muda devagar, sem salto.
//   céu fechado (um domo de nuvens por cima da foto), sol fraco e sem sombra dura, luz mais fria e baixa, neblina cinza e
//   mais perto · gotas caindo em volta da câmera (um LineSegments só) · gotas na tela (canvas 2D: poucas lentes d'água que escorrem
//   para as bordas conforme a velocidade; só na primeira pessoa e um pouco na câmera de trás) · asfalto escuro e brilhante conforme `agua` · borrifo atrás dos carros mais perto da câmera
//   (um Points só) · chiado de chuva e dos pneus no molhado (sons.js) · o ícone e o nível da pista no HUD (#hClima).
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
const MAX_GOTAS = 2200, QUEDA = 520; // unidades por segundo
const gotasPos = new Float32Array(MAX_GOTAS * 6), semente = new Float32Array(MAX_GOTAS * 3);
{ let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < semente.length; i++) semente[i] = r(); }
const gotasAttr = new THREE.BufferAttribute(gotasPos, 3).setUsage(THREE.DynamicDrawUsage);
const gotasGeo = new THREE.BufferGeometry(); gotasGeo.setAttribute("position", gotasAttr); gotasGeo.setDrawRange(0, 0);
const gotas = new THREE.LineSegments(gotasGeo, new THREE.LineBasicMaterial({ color: 0xd2dfec, transparent: true, opacity: 0.3, fog: false, depthWrite: false }));
gotas.frustumCulled = false; gotas.visible = false; gotas.renderOrder = 5; gotas.name = "clima-gotas";
const onda = (v, S) => v - S * Math.floor(v / S + 0.5); // v em [-S/2, S/2)

// ---------- o borrifo atrás dos carros ----------
const N_SPRAY = 256, K_CARROS = 6;
const sPos = new Float32Array(N_SPRAY * 3), sTam = new Float32Array(N_SPRAY), sAlfa = new Float32Array(N_SPRAY);
const sVx = new Float32Array(N_SPRAY), sVy = new Float32Array(N_SPRAY), sVz = new Float32Array(N_SPRAY), sVida = new Float32Array(N_SPRAY), sVida0 = new Float32Array(N_SPRAY), sTam0 = new Float32Array(N_SPRAY);
const sGeo = new THREE.BufferGeometry();
const sAttrPos = new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage), sAttrTam = new THREE.BufferAttribute(sTam, 1).setUsage(THREE.DynamicDrawUsage), sAttrAlfa = new THREE.BufferAttribute(sAlfa, 1).setUsage(THREE.DynamicDrawUsage);
sGeo.setAttribute("position", sAttrPos); sGeo.setAttribute("tam", sAttrTam); sGeo.setAttribute("alfa", sAttrAlfa);
const sMat = new THREE.ShaderMaterial({
  uniforms: { cor: { value: new THREE.Color(0xdfe6ee) }, escala: { value: 600 } },
  vertexShader: `attribute float tam; attribute float alfa; uniform float escala; varying float vA;
    void main() { vA = alfa; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(tam * escala / max(1.0, -mv.z), 0.0, 240.0); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 cor; varying float vA;
    void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.05, r) * vA; if (a < 0.004) discard; gl_FragColor = vec4(cor, a);
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
function nascer(car, a, v) {
  const i = sProx; sProx = (sProx + 1) % N_SPRAY; if (sVida[i] <= 0) sVivos++;
  const fx = Math.cos(a), fy = Math.sin(a), lado = Math.random() < 0.5 ? -1 : 1, atras = 20 + Math.random() * 8, la = lado * (7 + Math.random() * 4);
  sPos[i * 3] = car.x - fx * atras - fy * la; sPos[i * 3 + 1] = (car.z || 0) + 3 + Math.random() * 3; sPos[i * 3 + 2] = car.y - fy * atras + fx * la;
  const vel = v * (0.22 + Math.random() * 0.14); // sai com uma parte da velocidade do carro e o ar freia: o carro corre e a nuvem fica
  sVx[i] = fx * vel + (Math.random() - 0.5) * 30 + -fy * lado * 14; sVz[i] = fy * vel + (Math.random() - 0.5) * 30 + fx * lado * 14; sVy[i] = 28 + Math.random() * 38;
  sVida0[i] = sVida[i] = 0.8 + Math.random() * 0.6; sTam0[i] = 8 + Math.random() * 7; sTam[i] = sTam0[i]; sAlfa[i] = 0;
}
function passoSpray(dt, c, race, cam) {
  const agua = suave(0.2, 0.8, clima.agua), cp = cam.position;
  if (agua > 0.01) {
    // os K carros mais perto da câmera (insere em ordem num vetor fixo)
    nEmissores = 0;
    if (race.kart && race.kart.g.visible) candidato(c, true, cp);
    for (const gh of race.ghosts.values()) if (gh.kart && gh.kart.g.visible !== false) candidato(gh, false, cp);
    for (let k = 0; k < nEmissores; k++) {
      const car = emissor[k], meu = emissorMeu[k], v = Math.abs(car.v || 0), f = suave(80, 280, v) * agua * (meu ? 0.55 : 1);
      emissor[k] = null; if (f < 0.02) continue;
      let ac = (meu ? acMeu : car.__borrifo || 0) + dt * 32 * f; // (o acumulador do meu carro fica aqui: `race.vis` pode ser outro objeto a cada quadro)
      while (ac >= 1) { ac -= 1; nascer(car, car.a, v); }
      if (meu) acMeu = ac; else car.__borrifo = ac;
    }
  }
  if (sVivos <= 0) { if (spray.visible) spray.visible = false; return; }
  spray.visible = true;
  const drag = Math.exp(-2.2 * dt);
  for (let i = 0; i < N_SPRAY; i++) {
    if (sVida[i] <= 0) continue;
    sVida[i] -= dt;
    if (sVida[i] <= 0) { sVivos--; sAlfa[i] = 0; sTam[i] = 0; continue; }
    const k = 1 - sVida[i] / sVida0[i];
    sVx[i] *= drag; sVz[i] *= drag; sVy[i] = sVy[i] * drag - 6 * dt;
    sPos[i * 3] += sVx[i] * dt; sPos[i * 3 + 1] += sVy[i] * dt; sPos[i * 3 + 2] += sVz[i] * dt;
    sTam[i] = sTam0[i] * (1 + 2.8 * k); sAlfa[i] = 0.34 * Math.min(1, k * 9) * (1 - k);
  }
  sAttrPos.needsUpdate = sAttrTam.needsUpdate = sAttrAlfa.needsUpdate = true;
  renderer.getDrawingBufferSize(tamBuf);
  sMat.uniforms.escala.value = tamBuf.y / (2 * Math.tan((cam.fov * Math.PI) / 360));
  if (scene.fog) sMat.uniforms.cor.value.copy(scene.fog.color).lerp(BRANCO, 0.25);
}

// ---------- o asfalto molhado ----------
// os materiais marcados com `userData.asfalto` (pista.js e asfalto-gp.js) escurecem e ficam lisos conforme a água
let asfaltos = [], aguaAplicada = -1, trAtual = null;
function aplicarAsfalto(w) {
  for (const a of asfaltos) {
    a.m.color.copy(a.cor).multiplyScalar(1 - 0.42 * w);
    a.m.roughness = a.rug + (0.16 - a.rug) * w;
    if (a.bump != null) a.m.bumpScale = a.bump * (1 - 0.5 * w);
  }
}
function coletarAsfalto(tr) {
  aguaAplicada = 0; aplicarAsfalto(0); asfaltos = []; trAtual = tr;
  tr.grp.traverse((o) => { const m = o.material; if (m && !Array.isArray(m) && m.userData.asfalto && !asfaltos.some((a) => a.m === m)) asfaltos.push({ m, cor: m.color.clone(), rug: m.roughness, bump: m.bumpScale }); });
  aguaAplicada = -1;
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
scene.add(domo, gotas, spray);
let ultRace = null, ativoAntes = false;
// chamado por quadro (jogo.js, depois de posicionar a câmera): `mode` é a câmera ("perto", "cockpit", "longe", "cima"), `src` o carro
// que a câmera segue e `c` o meu carro como é desenhado
export function passoClima(dt, race, cam, mode, src, c) {
  if (race !== ultRace) { ultRace = race; I = clima.chuva; sVivos = 0; sVida.fill(0); sAlfa.fill(0); coletarAsfalto(race.tr); }
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
    const cima = mode === "cima", S = cima ? 1100 : 760, H = cima ? 700 : 420, cx = cima ? src.x : cam.position.x, cz = cima ? src.y : cam.position.z, y0 = cima ? (src.z || 0) - 20 : cam.position.y - 150;
    const tt = performance.now() / 1000, a = src.a || 0, h = sK * 380, rx = -Math.cos(a) * h, rz = -Math.sin(a) * h, ry = -QUEDA, rl = 1 / Math.hypot(rx, ry, rz), comp = 22 + 60 * sK;
    const dx = rx * rl * comp, dy = ry * rl * comp, dz = rz * rl * comp;
    for (let i = 0; i < n; i++) {
      const sx = semente[i * 3], sy = semente[i * 3 + 1], sz = semente[i * 3 + 2], x = cx + onda(sx * S - cx, S), z = cz + onda(sz * S - cz, S), y = y0 + H * frac(sy - (tt * QUEDA) / H), q = 0.7 + 0.6 * frac(sx * 37), o = i * 6;
      gotasPos[o] = x; gotasPos[o + 1] = y; gotasPos[o + 2] = z; gotasPos[o + 3] = x - dx * q; gotasPos[o + 4] = y - dy * q; gotasPos[o + 5] = z - dz * q; // a ponta fica no sentido de onde a gota vem, relativo ao carro
    }
    gotasGeo.setDrawRange(0, n * 2); gotasAttr.needsUpdate = true; gotas.material.opacity = 0.18 + 0.18 * I; gotas.visible = true;
  } else if (gotas.visible) gotas.visible = false;

  // asfalto: só mexe quando a água mudou de verdade
  if (Math.abs(clima.agua - aguaAplicada) > 0.004) { aguaAplicada = clima.agua; aplicarAsfalto(suave(0, 0.8, clima.agua)); }

  passoSpray(dt, c, race, cam);
  passoTela(dt, mode, sK);
  passoHud();

  // o som: chuva pela intensidade, pneus no molhado pela velocidade do meu carro (mais baixo no túnel)
  const abafa = race.tr.coberto?.(race.idx) ? 0.3 : 1;
  Sound.chuva(I * abafa, race.kart ? lim(clima.agua * 1.3) * suave(40, 260, Math.abs(c.v || 0)) * abafa : 0);
}
// ao sair da corrida: tudo volta ao seco (a luz já volta sozinha quando I vai a 0; aqui é no corte)
export function limparClima() {
  I = 0; ultRace = null; domo.visible = gotas.visible = spray.visible = false; sVivos = 0; sVida.fill(0);
  if (ativoAntes) {
    ativoAntes = false;
    sun.intensity = escalar(eSol, sun.intensity, 1); hemi.intensity = escalar(eHemi, hemi.intensity, 1); scene.environmentIntensity = escalar(eAmb, scene.environmentIntensity, 1); renderer.toneMappingExposure = escalar(eExp, renderer.toneMappingExposure, 1);
    sun.shadow.intensity = 1; sun.color.copy(eCorSol.base); hemi.color.copy(eCorHemi.base);
    if (scene.fog && scene.fog === fogRef) { scene.fog.near = escalar(eNear, scene.fog.near, 1); scene.fog.far = escalar(eFar, scene.fog.far, 1); scene.fog.color.copy(eCorFog.base); }
  }
  aplicarAsfalto(0); aguaAplicada = -1; for (const g of G) g.vivo = false; telaNivel = 0;
  if (telaOn) { telaOn = false; cvTela.style.display = "none"; }
  Sound.chuva(0, 0);
}
