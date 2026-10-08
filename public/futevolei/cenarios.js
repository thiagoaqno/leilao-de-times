// Futevôlei da Galera — os dois lugares para jogar, com gráficos mais caprichados que os outros jogos da vila:
//   - "praia": a quadra na areia da praia de Santos, de tarde. Céu com sol e nuvens (Sky), o mar com ondas e a
//     espuma batendo na beira, a areia com marquinhas de vento, coqueiros, guarda-sóis, o quiosque, a torre do
//     salva-vidas, o calçadão em ondas e os prédios da orla;
//   - "arena": a arena coberta (sala fechada) com o tanque de areia, a arquibancada, o telão com o placar, as placas de
//     LED em volta da quadra e os refletores no teto de treliça.
// Tudo é desenhado aqui (texturas em canvas, nenhuma imagem de fora). A luz do ambiente (os reflexos) vem do próprio
// céu (praia) ou de uma sala genérica (RoomEnvironment, na arena). montarCenario devolve { atualizar, placar,
// lugaresTorcida, naAreia, liberar }.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { canvasTex, rng } from "/pelada/tex.js";

const F = window.Futevolei, Q = F.Q;
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

// ---------- ruído que emenda nas bordas (para as texturas repetirem sem costura) ----------
function ruidoTile(n, seed) {
  const r = rng(seed), g = Array.from({ length: n * n }, () => r());
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => { // x, y em [0, n)
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
    const v = (i, j) => g[((j % n + n) % n) * n + ((i % n + n) % n)];
    return (v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx) * (1 - fy) + (v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx) * fy;
  };
}
// mapa de altura (0..1) que emenda: várias oitavas de ruído e, na areia, as marquinhas de vento
function alturas(tam, seed, ondinhas) {
  const oit = [ruidoTile(4, seed), ruidoTile(8, seed + 1), ruidoTile(16, seed + 2), ruidoTile(32, seed + 3), ruidoTile(64, seed + 4)];
  const h = new Float32Array(tam * tam);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const u = x / tam, v = y / tam; let a = 0, amp = 0.5, tot = 0;
    oit.forEach((f, i) => { const n = [4, 8, 16, 32, 64][i]; a += f(u * n, v * n) * amp; tot += amp; amp *= 0.55; });
    a /= tot;
    if (ondinhas) a = a * 0.72 + 0.28 * (0.5 + 0.5 * Math.sin((v * 22 + oit[1](u * 8, v * 8) * 2.2) * Math.PI * 2));
    h[y * tam + x] = a;
  }
  return h;
}
// textura de normal (relevo) a partir do mapa de altura
function normalTex(h, tam, forca) {
  const c = document.createElement("canvas"); c.width = c.height = tam; const x = c.getContext("2d"), img = x.createImageData(tam, tam);
  const H = (i, j) => h[((j + tam) % tam) * tam + ((i + tam) % tam)];
  for (let j = 0; j < tam; j++) for (let i = 0; i < tam; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * forca, dy = (H(i, j + 1) - H(i, j - 1)) * forca, l = Math.hypot(dx, dy, 1), o = (j * tam + i) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}
// a areia: cor com grãozinhos, relevo (marquinhas de vento) e áspera
function areia(seed, rep, cor = [226, 200, 150], ondinhas = true) {
  const tam = 256, h = alturas(tam, seed, ondinhas);
  const cTex = canvasTex(512, 512, (x, w, hh, r) => {
    const img = x.createImageData(w, hh);
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
      const a = h[((j >> 1) % tam) * tam + ((i >> 1) % tam)], g = r(), o = (j * w + i) * 4, k = 0.86 + a * 0.2 + (g - 0.5) * 0.14;
      const conchinha = g > 0.9992 ? 60 : 0; // um ou outro pontinho claro (conchinha, quartzo)
      img.data[o] = Math.min(255, cor[0] * k + conchinha); img.data[o + 1] = Math.min(255, cor[1] * k + conchinha); img.data[o + 2] = Math.min(255, cor[2] * k + conchinha * 0.8); img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }, true);
  const nTex = normalTex(h, tam, ondinhas ? 1.7 : 1.4);
  for (const t of [cTex, nTex]) t.repeat.set(rep, rep);
  return new THREE.MeshStandardMaterial({ map: cTex, normalMap: nTex, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96, metalness: 0 });
}

// ---------- peças da quadra (iguais nos dois lugares) ----------
function quadra(grupo) {
  // fitas azuis da linha (presas por estacas nos cantos)
  const fita = M(0x1e5bc6, { roughness: 0.5 });
  const linha = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), fita); m.position.set(x, 0.006, z); m.receiveShadow = true; grupo.add(m); };
  for (const s of [-1, 1]) { linha(2 * Q.MX + 0.05, 0.05, 0, s * Q.MZ); linha(0.05, 2 * Q.MZ + 0.05, s * Q.MX, 0); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.12, 8), M(0xdddddd, { metalness: 0.6, roughness: 0.3 })); e.position.set(sx * Q.MX, 0.03, sz * Q.MZ); grupo.add(e); }
  // a rede: postes acolchoados, a tela (1 m de altura), a faixa branca em cima e embaixo, as antenas listradas e os cabos
  const POSTE = Q.MX + 0.9, LARG = 2 * (Q.MX + 0.5);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 14), M(0xc9ced4, { metalness: 0.8, roughness: 0.25 })); p.position.set(s * POSTE, 1.35, 0); p.castShadow = true; grupo.add(p);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.8, 14), M(0x1e5bc6, { roughness: 0.6 })); pad.position.set(s * POSTE, 0.9, 0); pad.castShadow = true; grupo.add(pad);
    const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.1, 4), M(0x333333)); cabo.position.set(s * (POSTE + 1.05), 1.2, 0); cabo.rotation.z = s * 0.72; grupo.add(cabo);
    const ancora = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), M(0x6b5a3a)); ancora.position.set(s * (POSTE + 2.1), 0.02, 0); grupo.add(ancora);
  }
  const tela = canvasTex(64, 64, (x, w) => { x.fillStyle = "rgba(20,20,20,0.28)"; x.fillRect(0, 0, w, w); x.strokeStyle = "#111"; x.lineWidth = 6; x.strokeRect(0, 0, w, w); }, true); // de longe, a malha vira um cinza transparente
  tela.repeat.set(LARG / 0.1, 1 / 0.1);
  const rede = new THREE.Mesh(new THREE.PlaneGeometry(LARG, 1), new THREE.MeshStandardMaterial({ map: tela, transparent: true, alphaTest: 0.05, depthWrite: false, side: THREE.DoubleSide, color: 0x222222, roughness: 0.9 }));
  rede.position.y = Q.REDE - 0.5; rede.castShadow = true; grupo.add(rede);
  const faixa = (y, h) => { const f = new THREE.Mesh(new THREE.BoxGeometry(LARG, h, 0.02), M(0xf4f4f0, { roughness: 0.6 })); f.position.y = y; f.castShadow = true; grupo.add(f); };
  faixa(Q.REDE - 0.035, 0.07); faixa(Q.REDE - 1, 0.05);
  const listra = canvasTex(8, 64, (x, w, hh) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#f4f4f4" : "#d32f2f"; x.fillRect(0, i * hh / 8, w, hh / 8); } });
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.8, 8), new THREE.MeshStandardMaterial({ map: listra, roughness: 0.4 })); a.position.set(s * Q.ANTENA, Q.REDE + 0.3, 0); a.castShadow = true; grupo.add(a); }
}

// ---------- coqueiro (tronco curvo, folhas que caem e os cocos) ----------
let FOLHA = null, TRONCO = null;
function coqueiro(r) {
  if (!FOLHA) {
    FOLHA = new THREE.MeshStandardMaterial({ map: canvasTex(128, 512, (x, w, hh) => {
      x.clearRect(0, 0, w, hh); x.strokeStyle = "#5d4a1f"; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, hh); x.stroke();
      for (let y = 6; y < hh; y += 7) { const comp = (w / 2 - 4) * Math.sin((y / hh) * Math.PI * 0.95 + 0.1); for (const s of [-1, 1]) { x.strokeStyle = y % 3 ? "#3f7d2c" : "#4f8f34"; x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2, y); x.quadraticCurveTo(w / 2 + s * comp * 0.5, y + 4, w / 2 + s * comp, y + 14); x.stroke(); } }
    }), side: THREE.DoubleSide, alphaTest: 0.4, roughness: 0.8 });
    TRONCO = new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (x, w, hh, rr) => { x.fillStyle = "#8a7356"; x.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 9) { x.fillStyle = "#6e5a40"; x.fillRect(0, y, w, 3); x.fillStyle = "#a08a6a"; x.fillRect(0, y + 3, w, 1); } for (let i = 0; i < 200; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 3, 2); } }, true), roughness: 0.95 });
  }
  const g = new THREE.Group(), alt = 6 + r() * 4, curva = 1 + r() * 2.2, giro = r() * Math.PI * 2;
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * 1.4) * curva * t, t * alt, 0)); }
  const caminho = new THREE.CatmullRomCurve3(pts);
  const tronco = new THREE.Mesh(new THREE.TubeGeometry(caminho, 16, 0.2, 8), TRONCO); tronco.castShadow = true; g.add(tronco);
  const topo = pts[8];
  for (let i = 0; i < 9; i++) {
    const comp = 3 + r() * 1.2, geo = new THREE.PlaneGeometry(1.1, comp, 1, 8); geo.translate(0, comp / 2, 0);
    const pos = geo.attributes.position; for (let k = 0; k < pos.count; k++) { const y = pos.getY(k), t = y / comp; pos.setZ(k, t * t * comp * 0.75); } // a folha cai na ponta
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, FOLHA); f.position.copy(topo); f.rotation.order = "YXZ"; f.rotation.y = (i / 9) * Math.PI * 2 + r() * 0.3; f.rotation.x = -1.0 - r() * 0.5; f.castShadow = true; g.add(f);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(0x4a3a1e, { roughness: 0.7 })); c.position.set(topo.x + Math.cos(i * 2.1) * 0.25, topo.y - 0.25, Math.sin(i * 2.1) * 0.25); g.add(c); }
  g.rotation.y = giro;
  return g;
}
function guardaSol(r, x, z) {
  const g = new THREE.Group(), cores = [[0xe53935, 0xf4f4f4], [0x1e88e5, 0xf4f4f4], [0xfdd835, 0x43a047], [0xff7043, 0xffffff]][Math.floor(r() * 4)];
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), M(0xdddddd, { metalness: 0.5 })); haste.position.y = 1.15; haste.rotation.z = (r() - 0.5) * 0.2; g.add(haste);
  const gomos = 8, lona = new THREE.Group(); lona.position.y = 2.25; lona.rotation.z = haste.rotation.z;
  for (let i = 0; i < gomos; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 2, 1, true, (i / gomos) * Math.PI * 2, (Math.PI * 2) / gomos), M(cores[i % 2], { side: THREE.DoubleSide, roughness: 0.85 })); c.castShadow = true; lona.add(c); }
  g.add(lona);
  // duas cadeiras de praia e uma toalha
  for (const s of [-1, 1]) { const c = new THREE.Group(); const assento = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), M(cores[0], { roughness: 0.9 })); assento.position.y = 0.25; const enc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.04), M(cores[0], { roughness: 0.9 })); enc.position.set(0, 0.5, 0.28); enc.rotation.x = -0.4; c.add(assento, enc); c.position.set(s * 0.6, 0, 0.7); c.rotation.y = Math.PI + (r() - 0.5) * 0.6; c.traverse((o) => (o.castShadow = true)); g.add(c); }
  const toalha = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), M([0xff8a65, 0x4fc3f7, 0xba68c8][Math.floor(r() * 3)], { roughness: 1 })); toalha.rotation.x = -Math.PI / 2; toalha.position.set(0.2, 0.012, -0.9); toalha.rotation.z = r(); g.add(toalha);
  g.position.set(x, 0, z); g.rotation.y = r() * Math.PI * 2;
  return g;
}
// faixa de propaganda / placa com texto
const placa = (txt, fundo, cor, w = 1024, h = 128, fonte = 72) => canvasTex(w, h, (x) => { x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.fillStyle = cor; x.font = `900 ${fonte}px Anton, Impact, Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, w / 2, h / 2 + 4); });

// ======================================================================
// A PRAIA
// ======================================================================
function praia(renderer, scene) {
  const grupo = new THREE.Group(), r = rng(77), animar = [];
  renderer.toneMappingExposure = 0.21; // o céu (Sky) é bem forte: exposição baixa e luzes fortes
  // o céu e o sol (de tarde, baixo, por cima do mar)
  const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 32), THREE.MathUtils.degToRad(35)); // atrás do time Amarelo, de lado
  const fazCeu = () => { const s = new Sky(); s.scale.setScalar(900); const u = s.material.uniforms; u.turbidity.value = 3; u.rayleigh.value = 2.4; u.mieCoefficient.value = 0.003; u.mieDirectionalG.value = 0.85; u.sunPosition.value.copy(sol); u.cloudCoverage.value = 0.35; u.cloudDensity.value = 0.45; return s; };
  const ceu = fazCeu(); grupo.add(ceu); animar.push((dt, t) => (ceu.material.uniforms.time.value = t));
  const pmrem = new THREE.PMREMGenerator(renderer), cenaCeu = new THREE.Scene(); cenaCeu.add(fazCeu());
  const env = pmrem.fromScene(cenaCeu, 0.03); scene.environment = env.texture; scene.environmentIntensity = 1.2; pmrem.dispose();
  scene.fog = new THREE.Fog(0xc4d6e2, 260, 1100);
  const luzSol = new THREE.DirectionalLight(0xffe2b8, 8); luzSol.position.copy(sol).multiplyScalar(60); luzSol.castShadow = true;
  luzSol.shadow.mapSize.set(2048, 2048); luzSol.shadow.bias = -0.0003; luzSol.shadow.normalBias = 0.03; luzSol.shadow.radius = 3;
  Object.assign(luzSol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 10, far: 140 });
  grupo.add(luzSol, luzSol.target, new THREE.HemisphereLight(0xbfd8ff, 0xd9c08f, 1.6));
  // a areia (de -50 até a orla) e a areia molhada perto do mar
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(400, 120, 80, 24), areia(5, 60, [218, 188, 138]));
  { const p = chao.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), longe = Math.max(0, Math.hypot(x / 1.6, y) - 18); p.setZ(i, Math.min(1.2, longe * 0.02) * (Math.sin(x * 0.11) * 0.5 + Math.cos(y * 0.17 + x * 0.05) * 0.5)); } chao.geometry.computeVertexNormals(); }
  chao.rotation.x = -Math.PI / 2; chao.position.z = 8; chao.receiveShadow = true; grupo.add(chao);
  const molhada = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), new THREE.MeshStandardMaterial({ map: chao.material.map, normalMap: chao.material.normalMap, color: 0xa08560, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.9 }));
  molhada.rotation.x = -Math.PI / 2; molhada.position.set(0, 0.02, -30); molhada.receiveShadow = true; grupo.add(molhada);
  // o mar: ondulação com relevo animado, reflexo do céu, e a espuma indo e voltando na beira
  const agua = alturas(128, 31, false), nAgua = normalTex(agua, 128, 3.5); nAgua.repeat.set(40, 40);
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(1600, 800, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1d5f73, roughness: 0.08, metalness: 0.15, normalMap: nAgua, normalScale: new THREE.Vector2(0.6, 0.6) }));
  mar.rotation.x = -Math.PI / 2; mar.position.set(0, 0.05, -436); grupo.add(mar);
  const nAgua2 = nAgua.clone(); nAgua2.repeat.set(9, 9);
  const raso = new THREE.Mesh(new THREE.PlaneGeometry(1600, 22), new THREE.MeshStandardMaterial({ color: 0x4e9aa0, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, normalMap: nAgua2 }));
  raso.rotation.x = -Math.PI / 2; raso.position.set(0, 0.07, -46); grupo.add(raso);
  const espTex = canvasTex(512, 64, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { const px = rr() * w, py = hh * (0.3 + 0.7 * Math.pow(rr(), 2)); x.fillStyle = `rgba(255,255,255,${0.25 + rr() * 0.6})`; x.beginPath(); x.arc(px, py, 1 + rr() * 3, 0, 7); x.fill(); } const gr = x.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.85, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,1)"); x.fillStyle = gr; x.globalCompositeOperation = "destination-in"; x.fillRect(0, 0, w, hh); }, true);
  espTex.repeat.set(30, 1);
  const espumas = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 3 + i), new THREE.MeshBasicMaterial({ map: espTex, transparent: true, depthWrite: false, opacity: 0.9, fog: true })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.09 + i * 0.01, -34 - i * 7); grupo.add(m); return m; });
  animar.push((dt, t) => {
    nAgua.offset.set(t * 0.004, t * 0.012); nAgua2.offset.set(-t * 0.01, t * 0.02);
    espumas.forEach((m, i) => { const fase = t * 0.35 + i * 2.1, ida = Math.sin(fase); m.position.z = -34 - i * 7 + ida * 2.4; m.material.opacity = 0.55 + 0.4 * Math.max(0, -Math.cos(fase)); espTex.offset.x = t * 0.003; });
  });
  quadra(grupo);
  // arquibancada tubular de um lado (com a torcida pintada) e bancos de madeira do outro
  const torcida = canvasTex(1024, 128, (x, w, hh, rr) => { x.fillStyle = "#3a4048"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 520; i++) { const cx = rr() * w, cy = 30 + rr() * 80; x.fillStyle = ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#fafafa", "#ff7043", "#8e24aa", "#26c6da"][Math.floor(rr() * 8)]; x.fillRect(cx - 5, cy, 10, 22); x.fillStyle = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"][Math.floor(rr() * 4)]; x.beginPath(); x.arc(cx, cy - 4, 5, 0, 7); x.fill(); } }, true);
  for (let i = 0; i < 5; i++) {
    const t = torcida.clone(); t.repeat.set(3, 1); t.offset.x = r(); t.needsUpdate = true;
    const d = new THREE.Mesh(new THREE.BoxGeometry(1, 0.45, 26), [new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), M(0x9aa3ad, { metalness: 0.6, roughness: 0.4 }), M(0xb0b8c0, { metalness: 0.5, roughness: 0.4 }), M(0x9aa3ad), M(0x9aa3ad), M(0x9aa3ad)]);
    d.position.set(-(9.5 + i), 0.5 + i * 0.45, 0); d.castShadow = d.receiveShadow = true; grupo.add(d);
  }
  const faixaPatro = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.9), new THREE.MeshStandardMaterial({ map: placa("FUTEVÔLEI DA GALERA · SANTOS", "#1e5bc6", "#ffd54f", 2048, 72, 54), roughness: 0.6 }));
  faixaPatro.position.set(-9.0, 0.45, 0); faixaPatro.rotation.y = Math.PI / 2; grupo.add(faixaPatro);
  // coqueiros (ao longo da orla e uns perto da quadra), guarda-sóis, o quiosque e a torre do salva-vidas
  for (let x = -120; x <= 120; x += 9 + r() * 5) { const c = coqueiro(r); c.position.set(x, 0, 44 + r() * 4); grupo.add(c); }
  for (const [x, z] of [[14, 12], [17, -6], [-16, 15], [22, 20], [-24, -12], [28, -2], [-13, -17], [11, -20], [-21, -24], [19, -23], [3, -26]]) { const c = coqueiro(r); c.position.set(x, 0, z); grupo.add(c); }
  for (let i = 0; i < 26; i++) { const x = (r() < 0.5 ? -1 : 1) * (14 + r() * 90), z = -24 + r() * 60; if (Math.abs(x) < 20 && Math.abs(z) < 18) continue; grupo.add(guardaSol(r, x, z)); }
  { // quiosque de palha
    const k = new THREE.Group(); k.position.set(22, 0, 26);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 2.4), M(0x8d6e4a, { roughness: 0.9 })); base.position.y = 0.55; k.add(base);
    const balcao = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.6), M(0xe8dcc0)); balcao.position.y = 1.12; k.add(balcao);
    for (const [sx, sz] of [[-1.8, -1], [1.8, -1], [-1.8, 1], [1.8, 1]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), M(0x6d5236)); p.position.set(sx, 1.3, sz); k.add(p); }
    const telhado = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.4, 8), M(0xc8a96a, { roughness: 1 })); telhado.position.y = 3.2; telhado.rotation.y = Math.PI / 8; k.add(telhado);
    const nome = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshStandardMaterial({ map: placa("ÁGUA DE COCO", "#2e7d32", "#fffde7", 512, 96, 56) })); nome.position.set(0, 2.45, -1.31); nome.rotation.y = Math.PI; k.add(nome);
    k.traverse((o) => { if (o.isMesh) o.castShadow = true; }); grupo.add(k);
  }
  { // torre do salva-vidas
    const t = new THREE.Group(); t.position.set(-26, 0, -22);
    for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), M(0xf4f4f4)); p.position.set(sx, 1.5, sz); t.add(p); }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), M(0xd32f2f)); cab.position.y = 3.7; t.add(cab);
    const teto = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.4), M(0xf4f4f4)); teto.position.y = 4.5; t.add(teto);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), M(0xffeb3b, { side: THREE.DoubleSide })); band.position.set(0.5, 5.6, 0); t.add(band);
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), M(0xdddddd)); mastro.position.set(0, 5.2, 0); t.add(mastro);
    animar.push((dt, tt) => { band.rotation.y = Math.sin(tt * 3) * 0.3; band.scale.x = 0.9 + Math.sin(tt * 5) * 0.1; });
    t.traverse((o) => { if (o.isMesh) o.castShadow = true; }); grupo.add(t);
  }
  // outra rede de futevôlei mais longe (tem sempre uma rodinha jogando)
  { const g2 = new THREE.Group(); quadra(g2); g2.position.set(-45, 0, 8); g2.rotation.y = 0.15; grupo.add(g2); }
  // o calçadão em ondas (pedra portuguesa), a avenida e os prédios da orla
  const calcadao = canvasTex(512, 512, (x, w, hh) => { x.fillStyle = "#f2efe8"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1c1c1c"; for (let y = -64; y < hh + 64; y += 64) { x.beginPath(); for (let i = 0; i <= w; i += 4) x.lineTo(i, y + Math.sin((i / w) * Math.PI * 4) * 18); for (let i = w; i >= 0; i -= 4) x.lineTo(i, y + 26 + Math.sin((i / w) * Math.PI * 4) * 18); x.closePath(); x.fill(); } }, true);
  calcadao.repeat.set(60, 2);
  const calc = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), new THREE.MeshStandardMaterial({ map: calcadao, roughness: 0.7 })); calc.rotation.x = -Math.PI / 2; calc.position.set(0, 0.18, 52.5); calc.receiveShadow = true; grupo.add(calc);
  const meio = new THREE.Mesh(new THREE.BoxGeometry(400, 0.18, 0.3), M(0xd8d2c4)); meio.position.set(0, 0.09, 49); grupo.add(meio);
  const rua = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), M(0x3a3d42, { roughness: 0.85 })); rua.rotation.x = -Math.PI / 2; rua.position.set(0, 0.17, 61); grupo.add(rua);
  const janelas = canvasTex(256, 512, (x, w, hh, rr) => { x.fillStyle = "#e9e4da"; x.fillRect(0, 0, w, hh); for (let y = 10; y < hh; y += 26) for (let i = 8; i < w; i += 30) { x.fillStyle = rr() < 0.15 ? "#f6d58a" : rr() < 0.5 ? "#5d7d93" : "#3f5868"; x.fillRect(i, y, 20, 16); x.fillStyle = "#c9c2b4"; x.fillRect(i - 2, y + 17, 24, 3); } }, true);
  for (let x = -200; x < 200; x += 14 + r() * 8) {
    const w = 10 + r() * 6, hh = 18 + r() * 40, d = 12, t = janelas.clone(); t.repeat.set(w / 10, hh / 20); t.needsUpdate = true;
    const cor = [0xffffff, 0xf3e7d3, 0xdfe8ee, 0xf0dccf][Math.floor(r() * 4)];
    const pr = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), [new THREE.MeshStandardMaterial({ map: t, color: cor, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: t, color: cor, roughness: 0.6 }), M(0xbfb8aa), M(0xbfb8aa), new THREE.MeshStandardMaterial({ map: t, color: cor, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: t, color: cor, roughness: 0.6 })]);
    pr.position.set(x, hh / 2, 74 + r() * 6); pr.castShadow = false; grupo.add(pr);
  }
  // uns barquinhos e o navio lá no fundo (o porto de Santos)
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 40 : 3, i === 0 ? 6 : 0.8, i === 0 ? 7 : 1.2), M(i === 0 ? 0x8a2f2f : 0xf4f4f4)); b.position.set(-150 + i * 90, i === 0 ? 3 : 0.4, -250 - i * 40); grupo.add(b); animar.push((dt, t) => (b.position.y = (i === 0 ? 3 : 0.4) + Math.sin(t + i) * 0.1)); }
  // as gaivotas
  const gaivotas = [];
  const asa = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.6, 0.1, 0), new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0.6, 0.1, 0)]); asa.setIndex([0, 1, 2, 1, 3, 2]); asa.computeVertexNormals();
  for (let i = 0; i < 7; i++) { const gv = new THREE.Mesh(asa, new THREE.MeshBasicMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide })); gv.userData = { r: 30 + r() * 30, h: 18 + r() * 10, v: 0.08 + r() * 0.08, f: r() * 7, cz: -20 - r() * 20 }; grupo.add(gv); gaivotas.push(gv); }
  animar.push((dt, t) => { for (const gv of gaivotas) { const u = gv.userData, a = t * u.v + u.f; gv.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.f) * 2, u.cz + Math.sin(a) * u.r * 0.4); gv.rotation.y = -a; gv.scale.y = 1 + Math.sin(t * 9 + u.f) * 0.8; } });
  scene.add(grupo);
  return {
    grupo, animar, ambiente: env,
    // em volta da quadra: quem fica olhando, em pé (x, z, para onde olha)
    lugaresTorcida: [[8.5, -7], [8.5, -4], [9, -1], [8.8, 2.5], [8.2, 6], [9.5, 8.5], [10.5, -9]].map(([x, z]) => ({ x, z, olha: Math.atan2(x, z) })),
    naAreia: () => true,
  };
}

// ======================================================================
// A ARENA COBERTA (sala fechada)
// ======================================================================
function arena(renderer, scene) {
  const grupo = new THREE.Group(), r = rng(91), animar = [];
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer), env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.45; pmrem.dispose();
  scene.fog = new THREE.Fog(0x14161c, 50, 120);
  scene.background = new THREE.Color(0x14161c);
  const L = 26, P = 24, A = 15; // meia largura, meio comprimento e altura do galpão
  // o chão de concreto polido (reflete as luzes) e o tanque de areia com a borda de madeira
  const conc = canvasTex(512, 512, (x, w, hh, rr) => { x.fillStyle = "#7d8288"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2 + rr() * 4, 2 + rr() * 4); } x.strokeStyle = "#00000030"; x.lineWidth = 2; x.strokeRect(0, 0, w, hh); }, true);
  conc.repeat.set(12, 12);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * P), new THREE.MeshStandardMaterial({ map: conc, roughness: 0.32, metalness: 0.05 })); piso.rotation.x = -Math.PI / 2; piso.position.y = -0.02; piso.receiveShadow = true; grupo.add(piso);
  const AX = 8.5, AZ = 13.5; // o tanque de areia
  const tanque = new THREE.Mesh(new THREE.PlaneGeometry(2 * AX, 2 * AZ), areia(13, 7, [222, 196, 148], false)); tanque.rotation.x = -Math.PI / 2; tanque.position.y = 0.0; tanque.receiveShadow = true; grupo.add(tanque);
  const madeira = canvasTex(512, 64, (x, w, hh, rr) => { x.fillStyle = "#9c6b3f"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 40; i++) { x.strokeStyle = rr() < 0.5 ? "#7a512d" : "#b07c4c"; x.lineWidth = 1 + rr() * 2; x.beginPath(); const y = rr() * hh; x.moveTo(0, y); x.bezierCurveTo(w / 3, y + rr() * 8 - 4, (2 * w) / 3, y + rr() * 8 - 4, w, y); x.stroke(); } }, true);
  for (const [w, d, x, z] of [[2 * AX + 0.6, 0.3, 0, AZ + 0.15], [2 * AX + 0.6, 0.3, 0, -AZ - 0.15], [0.3, 2 * AZ, AX + 0.15, 0], [0.3, 2 * AZ, -AX - 0.15, 0]]) {
    const t = madeira.clone(); t.repeat.set(Math.max(w, d) / 4, 1); t.needsUpdate = true;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); b.position.set(x, 0.14, z); b.castShadow = b.receiveShadow = true; grupo.add(b);
  }
  quadra(grupo);
  // paredes: painéis escuros com faixas e o grafite da galera; o fundo com o telão
  const parede = canvasTex(1024, 512, (x, w, hh, rr) => {
    const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, "#1b2433"); g.addColorStop(1, "#283548"); x.fillStyle = g; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < w; i += 64) { x.fillStyle = "#00000040"; x.fillRect(i, 0, 3, hh); }
    x.fillStyle = "#ffb300"; x.fillRect(0, hh * 0.7, w, 10); x.fillStyle = "#1e88e5"; x.fillRect(0, hh * 0.7 + 14, w, 6);
    x.font = "900 120px Anton, Impact, Arial"; x.textAlign = "center"; x.textBaseline = "middle";
    for (const [cor, dx, dy] of [["#00000080", 6, 6], ["#ff7043", 0, 0]]) { x.fillStyle = cor; x.fillText("FUTEVÔLEI", w / 2 + dx, hh * 0.42 + dy); }
    x.font = "700 40px Figtree, Arial"; x.fillStyle = "#cfd8dc"; x.fillText("ARENA DA GALERA", w / 2, hh * 0.58);
  }, false);
  const lisa = M(0x222a36, { roughness: 0.85 });
  for (const s of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(2 * P, A), new THREE.MeshStandardMaterial({ map: parede, roughness: 0.8 })); lat.position.set(s * L, A / 2, 0); lat.rotation.y = -s * Math.PI / 2; grupo.add(lat);
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, A), lisa); fundo.position.set(0, A / 2, s * P); fundo.rotation.y = s > 0 ? Math.PI : 0; grupo.add(fundo);
  }
  // o teto: a cobertura escura, as treliças de aço e as fileiras de refletores
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * P), M(0x15181e, { roughness: 1 })); teto.rotation.x = Math.PI / 2; teto.position.y = A; grupo.add(teto);
  const aco = M(0x9aa3ad, { metalness: 0.75, roughness: 0.35 });
  for (let z = -P + 4; z <= P - 4; z += 6) {
    const banzo = new THREE.Mesh(new THREE.BoxGeometry(2 * L, 0.18, 0.18), aco); banzo.position.set(0, A - 0.6, z); grupo.add(banzo);
    const banzo2 = banzo.clone(); banzo2.position.y = A - 2; grupo.add(banzo2);
    for (let x = -L + 1; x < L; x += 2) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), aco); d.position.set(x, A - 1.3, z); d.rotation.z = (x / 2) % 2 ? 0.6 : -0.6; grupo.add(d); }
  }
  const lampada = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 3.2 });
  for (let z = -15; z <= 15; z += 6) for (let x = -12; x <= 12; x += 6) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.3, 16), [M(0x2a2e35, { metalness: 0.6 }), lampada, lampada]); l.position.set(x, A - 2.3, z); grupo.add(l); }
  // a luz: uma de cima com sombra (as fileiras de refletores juntas) e quatro canhões quentes nos cantos
  const cima = new THREE.DirectionalLight(0xfff6ea, 2.6); cima.position.set(3, 30, 6); cima.castShadow = true; cima.shadow.mapSize.set(2048, 2048); cima.shadow.bias = -0.0003; cima.shadow.normalBias = 0.03; cima.shadow.radius = 4;
  Object.assign(cima.shadow.camera, { left: -16, right: 16, top: 18, bottom: -18, near: 5, far: 50 }); grupo.add(cima, cima.target);
  grupo.add(new THREE.HemisphereLight(0xdfe6ff, 0x5a4a35, 0.7));
  for (const [x, z] of [[-14, -16], [14, -16], [-14, 16], [14, 16]]) { const s = new THREE.SpotLight(0xffd9a8, 220, 60, 0.55, 0.6, 1.6); s.position.set(x, A - 2.5, z); s.target.position.set(0, 0, 0); grupo.add(s, s.target); }
  // arquibancadas dos dois lados (degraus com a torcida) e as placas de LED em volta do tanque
  const torcida = canvasTex(1024, 128, (x, w, hh, rr) => { x.fillStyle = "#2b2f38"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 560; i++) { const cx = rr() * w, cy = 30 + rr() * 80; x.fillStyle = ["#ffb300", "#1e88e5", "#fafafa", "#ff7043", "#43a047", "#e53935"][Math.floor(rr() * 6)]; x.fillRect(cx - 5, cy, 10, 22); x.fillStyle = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"][Math.floor(rr() * 4)]; x.beginPath(); x.arc(cx, cy - 4, 5, 0, 7); x.fill(); } }, true);
  const torc = [];
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = torcida.clone(); t.repeat.set(4, 1); t.offset.x = r(); t.needsUpdate = true; torc.push(t);
    const frente = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), cinza = M(0x4a505a);
    const d = new THREE.Mesh(new THREE.BoxGeometry(1, 0.55, 2 * AZ + 4), s < 0 ? [cinza, frente, M(0x5a616c), cinza, cinza, cinza] : [frente, cinza, M(0x5a616c), cinza, cinza, cinza]);
    d.position.set(s * (11.5 + i), 0.3 + i * 0.55, 0); d.receiveShadow = true; grupo.add(d);
  }
  animar.push((dt, t) => torc.forEach((tx, i) => (tx.offset.y = Math.max(0, Math.sin(t * 6 + i)) * 0.02))); // a torcida pulando
  const ledTex = canvasTex(2048, 64, (x, w, hh) => { x.fillStyle = "#050608"; x.fillRect(0, 0, w, hh); x.font = "900 44px Anton, Impact, Arial"; x.textBaseline = "middle"; const itens = [["FUTEVÔLEI DA GALERA", "#ffb300"], ["VILA DA GALERA", "#4fc3f7"], ["SHARK ATTACK!", "#ff7043"], ["ÁGUA DE COCO GELADA", "#81c784"]]; let px = 20; for (let k = 0; k < 2; k++) for (const [t, c] of itens) { x.fillStyle = c; x.fillText(t, px, hh / 2 + 2); px += x.measureText(t).width + 80; } }, true);
  for (const [w, x, z, ry] of [[2 * AX, 0, AZ + 1.8, Math.PI], [2 * AX, 0, -AZ - 1.8, 0], [2 * AZ, AX + 1.8, 0, -Math.PI / 2], [2 * AZ, -AX - 1.8, 0, Math.PI / 2]]) {
    const t = ledTex.clone(); t.repeat.set(w / 20, 1); t.needsUpdate = true;
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.12), [M(0x111111), M(0x111111), M(0x111111), M(0x111111), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3, color: 0x000000 }), M(0x111111)]);
    p.position.set(x, 0.4, z); p.rotation.y = ry; grupo.add(p); animar.push((dt, tt) => (t.offset.x = tt * 0.05));
  }
  // o telão com o placar, no fundo (atrás do time Azul) e outro atrás do Amarelo
  const tel = document.createElement("canvas"); tel.width = 512; tel.height = 256; const telTex = new THREE.CanvasTexture(tel); telTex.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) {
    const telao = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.3), [M(0x111111), M(0x111111), M(0x111111), M(0x111111), new THREE.MeshStandardMaterial({ map: telTex, emissive: 0xffffff, emissiveMap: telTex, emissiveIntensity: 1.1, color: 0x000000 }), M(0x111111)]);
    telao.position.set(0, 8.5, s * (P - 0.4)); telao.rotation.y = s > 0 ? Math.PI : 0; grupo.add(telao);
  }
  function placar(a, b, txt) {
    const x = tel.getContext("2d"); x.fillStyle = "#06080c"; x.fillRect(0, 0, 512, 256);
    x.fillStyle = "#f5d000"; x.fillRect(0, 0, 256, 40); x.fillStyle = "#1e5bc6"; x.fillRect(256, 0, 256, 40);
    x.font = "900 28px Anton, Impact, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#0b2a14"; x.fillText("AMARELO", 128, 21); x.fillStyle = "#fff"; x.fillText("AZUL", 384, 21);
    x.font = "900 150px Anton, Impact, Arial"; x.fillStyle = "#ffffff"; x.fillText(String(a), 128, 150); x.fillText(String(b), 384, 150);
    x.font = "700 24px Figtree, Arial"; x.fillStyle = "#ffb300"; x.fillText(txt || "", 256, 236);
    telTex.needsUpdate = true;
  }
  placar(0, 0, "");
  scene.add(grupo);
  return {
    grupo, animar, ambiente: env, placar,
    lugaresTorcida: [[-11.2, -9], [-11.2, -3], [-11.2, 4], [11.2, -6], [11.2, 1], [11.2, 8], [-11.2, 10]].map(([x, z]) => ({ x, z, olha: x > 0 ? Math.PI / 2 : -Math.PI / 2, y: 0.6 })),
    naAreia: (x, z) => Math.abs(x) < AX && Math.abs(z) < AZ,
  };
}

// monta o lugar (e desmonta o anterior): devolve o que o jogo usa
export function montarCenario(renderer, scene, tipo) {
  const c = (tipo === "arena" ? arena : praia)(renderer, scene);
  let t = 0;
  return {
    tipo, lugaresTorcida: c.lugaresTorcida, naAreia: c.naAreia,
    placar: c.placar || (() => {}),
    atualizar(dt) { t += dt; for (const f of c.animar) f(dt, t); },
    liberar() {
      scene.remove(c.grupo);
      c.grupo.traverse((o) => { o.geometry?.dispose?.(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { for (const k of ["map", "normalMap", "emissiveMap"]) m[k]?.dispose?.(); m.dispose(); } });
      c.ambiente.dispose(); scene.environment = null; scene.fog = null; scene.background = null;
    },
  };
}
