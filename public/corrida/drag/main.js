// Drag da Galera: desenha a `corrida` de logic.mjs (cena noturna, carros, HUD) e manda os comandos.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import * as L from "./logic.mjs";
import { MODELOS, visualDe } from "./modelos.js";
import { criarGaragem } from "./garagem.js";

const { LANE_X, ZONA, ZONA_PNEU, clamp } = L;
const $ = (id) => document.getElementById(id);
const D = Math.PI / 180;
const DEBUG = location.hash.includes("debug");
const LEVE = new URLSearchParams(location.search).has("leve");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

// As pistas: todas à noite (`curva`: amplitude e período em metros). As três primeiras são retas com curvas leves; a
// Serra tem curvas de verdade. Em todas o carro esterça sozinho: as faixas acompanham a pista e você só troca de faixa.
const TRACKS = [
  { id: "ponte", name: "Ponte Estaiada", detail: "Cabos acesos de verde sobre o rio", length: 1400, swatch: "#45651a",
    curva: [9, 1300], ceu: ["#010301", "#0b1307", "#40601a"], nevoa: [0x16200c, 90, 560], hemi: [0xa8d070, 0x0c1008, 0.75], asfalto: "#25282a", molhado: 0.42, luz: 0xd8ff9a },
  { id: "elevado", name: "Debaixo do Elevado", detail: "Pilares, luz de sódio e alambrado vermelho", length: 1600, swatch: "#6a3a10",
    curva: [14, 1700], ceu: ["#010102", "#0a090c", "#3a2412"], nevoa: [0x120c08, 45, 330], hemi: [0xffb066, 0x0a0806, 0.55], asfalto: "#2a2a2c", molhado: 0.5, luz: 0xffa040 },
  { id: "porto", name: "Porto à Noite", detail: "Contêineres, guindastes e chão molhado", length: 1200, swatch: "#0d4a5e",
    curva: [6, 1000], ceu: ["#01030a", "#061626", "#1f5268"], nevoa: [0x0a1a24, 60, 430], hemi: [0x7fd0ff, 0x060a10, 0.6], asfalto: "#1d2328", molhado: 0.3, luz: 0x9fe8ff },
  { id: "serra", name: "Serra à Noite", detail: "Curvas fechadas descendo a serra: o carro esterça sozinho", length: 1800, swatch: "#2a5a3a",
    curva: [46, 620], ceu: ["#010203", "#071210", "#24443a"], nevoa: [0x08100e, 40, 300], hemi: [0x9fd8c0, 0x060a08, 0.5], asfalto: "#232527", molhado: 0.38, luz: 0xffb060 },
];
const CARROS = Object.entries(L.CARROS).map(([id, c]) => ({ id, ...c }));
const NEON_RIVAL = [0xff2a6d, 0x39ff7a, 0xb04dff];
const COR_RIVAL = [0xc8102e, 0xe9e9e4, 0x1b2fd8];
const COR_TRAFEGO = [0x8a8f96, 0x3b4a5c, 0x6b1f1f, 0xd8d4c8, 0x2d3a2a, 0x1c1c22];

let selected = 0, selectedCar = CARS0();
function CARS0() { try { return localStorage.getItem("drag:carro") || "supra"; } catch { return "supra"; } }
if (!L.CARROS[selectedCar]) selectedCar = "supra";

// ---------- Menu ----------
$("carSelect").innerHTML = CARROS.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
$("carSelect").value = selectedCar;
function escolherCarro(id) {
  selectedCar = id; $("carSelect").value = id;
  try { localStorage.setItem("drag:carro", selectedCar); } catch {}
  prepareCar(); garagem.mostrarFicha(id);
}
$("carSelect").onchange = () => escolherCarro($("carSelect").value);
const girarCarro = (passo) => escolherCarro(CARROS[(CARROS.findIndex((c) => c.id === selectedCar) + passo + CARROS.length) % CARROS.length].id);
$("carPrev").onclick = () => girarCarro(-1); $("carNext").onclick = () => girarCarro(1);
for (const [i, tr] of TRACKS.entries()) {
  const b = document.createElement("button"); b.className = `track ${i === 0 ? "selected" : ""}`; b.style.setProperty("--swatch", tr.swatch);
  b.innerHTML = `<small>PONTO ${String(i + 1).padStart(2, "0")} · ${tr.length} M</small><strong>${tr.name}</strong><span>${tr.detail}</span>`;
  b.onclick = () => { selected = i; document.querySelectorAll(".track").forEach((x, n) => x.classList.toggle("selected", n === i)); };
  $("tracks").append(b);
}

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("view"), antialias: true, powerPreference: "high-performance" });
let pixelRatio = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.2, 900);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let usarBloom = true;
const hemi = new THREE.HemisphereLight(0xffffff, 0x101010, 0.7); scene.add(hemi);
const lua = new THREE.DirectionalLight(0x9db8ff, 0.35); lua.position.set(-40, 80, -30); scene.add(lua);
const farol = new THREE.SpotLight(0xf4f7ff, 26, 95, 0.46, 0.65, 1); scene.add(farol); scene.add(farol.target);
const pmrem = new THREE.PMREMGenerator(renderer);
const loader = new GLTFLoader(), modelCache = new Map();
let readyModel = null;

// Carrega um GLB uma vez só (o vidro com "transmission" pede uma passada inteira a mais por quadro: vira vidro comum).
// `progresso[id]`: de 0 a 1, quanto do arquivo já chegou (a garagem e a tela de carregando mostram).
const progresso = {};
const aoBaixar = (id) => (e) => { if (e.total) progresso[id] = Math.min(0.99, e.loaded / e.total); atualizarCarregando(); };
function carregarModelo(id) {
  if (!modelCache.has(id)) modelCache.set(id, loader.loadAsync(`/corrida/drag/models/${id}.glb`, aoBaixar(id)).then((gltf) => {
    progresso[id] = 1; atualizarCarregando();
    gltf.scene.traverse((o) => { for (const m of [].concat(o.material || [])) if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.45); m.needsUpdate = true; } });
    acenderLanternas(gltf);
    return gltf;
  }).catch((error) => { modelCache.delete(id); throw error; }));
  return modelCache.get(id);
}
// Os rivais andam com os outros carros da garagem (três sorteados entre os que você não escolheu). Eles carregam
// enquanto você está na garagem, e a largada espera por eles: trocar o carro provisório pelo modelo no meio da corrida
// (montar a malha, subir as texturas, compilar os shaders) era o que travava a primeira corrida.
let modelosRivais = [], rivaisProntos = Promise.resolve();
function sortearRivais() {
  modelosRivais = CARROS.map((c) => c.id).filter((id) => id !== selectedCar).sort(() => Math.random() - 0.5).slice(0, 3);
  rivaisProntos = Promise.allSettled(modelosRivais.map((id) => carregarModelo(id).catch((e) => { console.warn("Drag: modelo do rival não carregou", id, e); throw e; })));
  rivaisProntos.then(baixarOResto);
}
// Com o seu carro e os rivais prontos, os outros carros da garagem vão baixando um por um, sem pressa, para trocar de
// carro na hora (só o arquivo, que fica no cache do navegador; montar o carro fica para quando ele for escolhido).
// No celular e com economia de dados ligada, não.
let baixandoResto = false;
function baixarOResto() {
  if (baixandoResto || matchMedia("(pointer: coarse)").matches || navigator.connection?.saveData) return;
  baixandoResto = true;
  const fila = CARROS.map((c) => c.id).filter((id) => !modelCache.has(id));
  const proximo = () => {
    const id = fila.shift(); if (!id) return;
    const ocioso = window.requestIdleCallback || ((f) => setTimeout(f, 300));
    ocioso(() => fetch(`/corrida/drag/models/${id}.glb`, { priority: "low" }).then((r) => r.arrayBuffer()).catch(() => {}).finally(proximo));
  };
  proximo();
}
// A tela de carregando da largada: seu carro e os três rivais (o quanto já baixou de cada um) e, por fim, a pista.
let carregandoEtapa = null;
function atualizarCarregando() {
  const id = selectedCar, p = progresso[id];
  if (!readyModel && p !== undefined && p < 1 && phase === "menu") $("carStatus").textContent = `Carregando modelo... ${Math.round(p * 100)}%`;
  if (!carregandoEtapa) return;
  const ids = [selectedCar, ...modelosRivais], feito = ids.reduce((a, i) => a + (progresso[i] ?? (modelCache.has(i) ? 0 : 1)), 0) / ids.length;
  const total = carregandoEtapa === "pista" ? 0.9 + 0.1 * 0.5 : feito * 0.9;
  $("carregandoBarra").style.width = `${Math.round(total * 100)}%`;
  $("carregandoTexto").textContent = carregandoEtapa === "pista" ? "Preparando a pista..." : `Chegando os carros · ${ids.filter((i) => (progresso[i] ?? 1) >= 1).length} de ${ids.length}`;
}
function mostrarCarregando(etapa) {
  carregandoEtapa = etapa;
  $("carregando").classList.toggle("hidden", !etapa);
  if (etapa) { $("carregandoPista").textContent = TRACKS[selected].name; atualizarCarregando(); }
}
function prepareCar() {
  const id = selectedCar;
  readyModel = null; $("start").disabled = true; $("carStatus").textContent = "Carregando modelo...";
  carregarModelo(id).then((gltf) => {
    if (selectedCar !== id) return;
    readyModel = gltf.scene; $("carStatus").textContent = "Modelo pronto"; $("start").disabled = false;
    garagem.mostrarCarro(importedCar(readyModel, id, visualDe(id, L.CARROS[id].neon)));
    sortearRivais();
  }).catch((error) => {
    console.warn("Drag: modelo não carregou", id, error);
    if (selectedCar === id) { $("carStatus").textContent = "Modelo indisponível; carro provisório"; $("start").disabled = false; garagem.mostrarCarro(carroProcedural("esporte", 0xf4f6f6, L.CARROS[id].neon)); }
  });
}

// ---------- Texturas desenhadas ----------
function canvasTex(w, h, desenhar, { repetir = false, srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  desenhar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
const radial = (g, w, h, stops) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, w, h); };
const TEX = {
  brilho: canvasTex(64, 64, (g, w, h) => radial(g, w, h, [[0, "#fff"], [0.25, "rgba(255,255,255,.55)"], [1, "rgba(255,255,255,0)"]])),
  poça: canvasTex(128, 128, (g, w, h) => radial(g, w, h, [[0, "rgba(255,255,255,.9)"], [0.5, "rgba(255,255,255,.3)"], [1, "rgba(255,255,255,0)"]])),
  neon: canvasTex(64, 128, (g, w, h) => { g.save(); g.scale(1, 2); radial(g, w, h / 2, [[0, "rgba(255,255,255,.95)"], [0.55, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]); g.restore(); }),
  fumaça: canvasTex(64, 64, (g, w, h) => radial(g, w, h, [[0, "rgba(235,235,235,.75)"], [0.6, "rgba(200,200,200,.25)"], [1, "rgba(180,180,180,0)"]])),
  rede: canvasTex(128, 128, (g, w, h) => {
    g.strokeStyle = "#ff3030"; g.lineWidth = 4; g.lineJoin = "round";
    for (let i = -4; i < 8; i++) {
      g.beginPath(); g.moveTo(i * 32, 0); for (let y = 0; y <= h; y += 16) g.lineTo(i * 32 + y * 0.5 + (y / 16 % 2 ? 3 : -3), y); g.stroke();
      g.beginPath(); g.moveTo(i * 32 + 64, 0); for (let y = 0; y <= h; y += 16) g.lineTo(i * 32 + 64 - y * 0.5 + (y / 16 % 2 ? -3 : 3), y); g.stroke();
    }
  }, { repetir: true }),
  xadrez: canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#eee"; g.fillRect(x * 16, y * 16, 16, 16); } }),
  obra: canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#f4f4f0"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff6a00"; for (let x = -64; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + 48, 0); g.lineTo(x + 48, 0); g.fill(); } }),
  seta: canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#111"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffb21c"; for (const x of [18, 58]) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 30, 64); g.lineTo(x, 108); g.lineTo(x + 18, 108); g.lineTo(x + 48, 64); g.lineTo(x + 18, 20); g.fill(); } }),
  janelas: canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = "#06080c"; g.fillRect(0, 0, w, h);
    for (let y = 4; y < h; y += 8) for (let x = 3; x < w; x += 7) if (Math.random() < 0.42) { g.fillStyle = Math.random() < 0.7 ? "#ffd28a" : "#9fd8ff"; g.globalAlpha = 0.5 + Math.random() * 0.5; g.fillRect(x, y, 4, 4); }
  }, { repetir: true }),
};
function placa(texto, { fundo = "#0c6b35", cor = "#fff", w = 512, h = 160, borda = "#fff" } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = fundo; g.fillRect(0, 0, w, h); g.strokeStyle = borda; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = cor; g.font = `italic 900 ${Math.round(h * 0.5)}px "Barlow Condensed", Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, w / 2, h / 2 + 4);
  });
}

// ---------- Geometria ao longo da pista ----------
// `s` é a posição lateral (positivo = à esquerda de quem dirige); o carro em x da lógica fica em s = -x.
let curva = [0, 1000];
function cx(z) { const [a, p] = curva; const r = clamp((z - 60) / 260, 0, 1); return a * r * r * (3 - 2 * r) * Math.sin(2 * Math.PI * z / p); }
function inclin(z) { return cx(z + 0.5) - cx(z - 0.5); }
function yawEm(z) { return Math.atan(inclin(z)); }
function ponto(s, z, y = 0, v = new THREE.Vector3()) {
  const d = inclin(z), n = Math.hypot(1, d);
  return v.set(cx(z) + s / n, y, z - s * d / n);
}
const mat = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1, ...opt });
const brilhoMat = (color, intens = 1, opt = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intens), ...opt });
const aditivo = (map, color, opacity = 1) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

// Faixa varrida ao longo da pista: `perfil` = [[s, y], ...].
function varrer(parent, perfil, z0, z1, material, { passo = 4, uvZ = 4 } = {}) {
  const n = perfil.length, linhas = Math.ceil((z1 - z0) / passo) + 1;
  const pos = new Float32Array(linhas * n * 3), uv = new Float32Array(linhas * n * 2), idx = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < linhas; i++) {
    const z = Math.min(z1, z0 + i * passo);
    for (let j = 0; j < n; j++) {
      ponto(perfil[j][0], z, perfil[j][1], v);
      pos.set([v.x, v.y, v.z], (i * n + j) * 3);
      uv.set([j / (n - 1), z / uvZ], (i * n + j) * 2);
      if (i && j) { const a = (i - 1) * n + j - 1, b = a + 1, c = i * n + j - 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material); parent.add(mesh); return mesh;
}
// Muitas peças iguais numa chamada só. Itens: { s, z, y, sx, sy, sz, ry, rx, cor }.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, "YXZ"), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function instanciar(parent, geo, material, itens) {
  if (!itens.length) return null;
  const im = new THREE.InstancedMesh(geo, material, itens.length);
  itens.forEach((it, i) => {
    ponto(it.s, it.z, it.y || 0, _p);
    _e.set(it.rx || 0, yawEm(it.z) + (it.ry || 0), it.rz || 0); _q.setFromEuler(_e);
    _s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    im.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (it.cor !== undefined) im.setColorAt(i, new THREE.Color(it.cor));
  });
  im.computeBoundingSphere();
  parent.add(im); return im;
}
const CUBO = new THREE.BoxGeometry(1, 1, 1);
const CHAO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const CILINDRO = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const CONE_LUZ = new THREE.CylinderGeometry(0.4, 4.5, 1, 16, 1, true).translate(0, 0.5, 0);
const ESFERA = new THREE.SphereGeometry(0.5, 12, 8);
const COMPARTILHADOS = new Set([CUBO, CHAO, CILINDRO, CONE_LUZ, ESFERA, ...Object.values(TEX)]);
function colocar(obj, s, z, y = 0, ry = 0) { ponto(s, z, y, obj.position); obj.rotation.y = yawEm(z) + ry; return obj; }

// ---------- O mundo ----------
let world = null, arvoreLuzes = [], placasDinamicas = [], ceu = null;
// O céu da meia-noite: a foto noturna que a Corrida já usa (qwantani_night_puresky do Poly Haven, CC0, em
// /corrida/ceus/tokyo.jpg). Enquanto ela não chega, vale o céu desenhado; quando chega, só troca a imagem da esfera
// (o que não recompila nenhum shader) e, na garagem, também o reflexo.
let fotoNoite = null;
const fotoNoitePronta = new THREE.TextureLoader().loadAsync("/corrida/ceus/tokyo.jpg").then((tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  COMPARTILHADOS.add(tex); fotoNoite = tex;
  if (world) vestirCeu(world.userData.ceu, world.userData.trilha);
  return tex;
}).catch((e) => { console.warn("Drag: o céu da noite não carregou", e); return null; });
// a foto vai tingida com a cor do lugar (o verde da ponte, o sódio do elevado, o azul do porto)
function vestirCeu(esfera, tr) {
  if (!fotoNoite || !esfera || !tr) return;
  esfera.material.map = fotoNoite; esfera.material.color.set(tr.ceu[2]).lerp(new THREE.Color(1, 1, 1), 0.4).multiplyScalar(0.3); esfera.material.needsUpdate = true;
}
function texturaDoCeu(tr) {
  return canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, tr.ceu[0]); gr.addColorStop(0.4, tr.ceu[1]); gr.addColorStop(0.5, tr.ceu[2]); gr.addColorStop(0.53, tr.ceu[1]); gr.addColorStop(1, "#000");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h * 0.38, 1.4, 1.4); }
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.7 ? "rgba(255,200,120,.7)" : "rgba(160,220,255,.7)"; g.fillRect(Math.random() * w, h * 0.47 + Math.random() * h * 0.05, 1.5, 1.5); }
  });
}
function asfaltoTex(tr) {
  const t = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = tr.asfalto; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const c = 20 + Math.random() * 40; g.fillStyle = `rgba(${c},${c},${c + 4},${Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(Math.random() * w, 0, 6 + Math.random() * 30, h); }
    const u = (s) => (7.9 - s) / 15.8 * w;
    g.fillStyle = "#e8b622"; g.fillRect(u(7.4) - 4, 0, 8, h);
    g.fillStyle = "#e9ecec"; g.fillRect(u(-7.4) - 4, 0, 8, h);
    for (const s of [3.7, 0, -3.7]) g.fillRect(u(s) - 3, 0, 6, h * 0.3);
  }, { repetir: true });
  return t;
}
function disposeGroup(group) {
  const mats = new Set(), geos = new Set();
  group.traverse((o) => {
    if (o.material) for (const m of [].concat(o.material)) mats.add(m);
    if (o.geometry && !COMPARTILHADOS.has(o.geometry)) geos.add(o.geometry);
  });
  mats.forEach((m) => { for (const k of ["map", "envMap"]) if (m[k] && !COMPARTILHADOS.has(m[k]) && m[k] !== scene.environment) m[k].dispose(); m.dispose(); });
  geos.forEach((g) => g.dispose());
}

// O ar de cada lugar (o da pista, ou o da garagem): reflexo, fundo, névoa e luz ambiente.
function aplicarAmbiente(a) {
  scene.environment = a.env; scene.environmentIntensity = a.envIntensidade;
  scene.background = new THREE.Color(a.fundo); scene.fog = a.fog;
  hemi.color.setHex(a.hemi[0]); hemi.groundColor.setHex(a.hemi[1]); hemi.intensity = a.hemi[2];
  lua.intensity = a.lua ?? 0.35;
}
// Monta a pista escolhida. A mesma pista de antes é reaproveitada (nada de montar e subir tudo de novo).
function buildWorld() {
  const tr = TRACKS[selected]; curva = tr.curva;
  if (world && world.userData.id === tr.id) { world.visible = true; aplicarAmbiente(world.userData.ambiente); ceu = world.userData.ceu; return; }
  if (world) { scene.remove(world); world.userData.ambiente.env.dispose(); disposeGroup(world); }
  world = new THREE.Group(); world.userData.id = tr.id; scene.add(world); arvoreLuzes = []; placasDinamicas = [];
  const ceuTex = texturaDoCeu(tr);
  ceuTex.mapping = THREE.EquirectangularReflectionMapping;
  world.userData.ambiente = { env: pmrem.fromEquirectangular(ceuTex).texture, envIntensidade: 0.55, fundo: tr.ceu[0], fog: new THREE.Fog(tr.nevoa[0], tr.nevoa[1], tr.nevoa[2]), hemi: tr.hemi };
  aplicarAmbiente(world.userData.ambiente);
  ceu = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.MeshBasicMaterial({ map: ceuTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  ceu.renderOrder = -1; world.add(ceu); world.userData.ceu = ceu; world.userData.trilha = tr;
  vestirCeu(ceu, tr);
  const L0 = -90, L1 = tr.length + 320;

  // Asfalto com as faixas pintadas
  const asfalto = new THREE.MeshStandardMaterial({ map: asfaltoTex(tr), roughness: tr.molhado, metalness: 0.15, envMapIntensity: 1.4 });
  varrer(world, [[7.9, 0], [-7.9, 0]], L0, L1, asfalto, { uvZ: 12 });
  // Largada e chegada
  for (const z of [0, tr.length]) varrer(world, [[7.6, 0.012], [-7.6, 0.012]], z - 1.2, z + 1.2, new THREE.MeshBasicMaterial({ map: TEX.xadrez, color: 0x9a9a9a }), { passo: 2.4, uvZ: 2.4 });
  const luzPool = tr.luz;

  if (tr.id === "ponte") montarPonte(tr, L0, L1, luzPool);
  else if (tr.id === "elevado") montarElevado(tr, L0, L1, luzPool);
  else if (tr.id === "serra") montarSerra(tr, L0, L1, luzPool);
  else montarPorto(tr, L0, L1, luzPool);
  montarLargada(tr);
}

function barreiraJersey(lado, z0, z1, material) {
  const p = [[8.0, 0], [8.05, 0.28], [8.22, 0.42], [8.28, 0.92], [8.62, 0.92], [8.62, 0]].map(([s, y]) => [s * lado, y]);
  varrer(world, p, z0, z1, material);
}
function poças(lista, cor, opacity = 0.8) {
  instanciar(world, CHAO, aditivo(TEX.poça, cor, opacity), lista.map((p) => ({ ...p, y: 0.03 })));
}
function postes(lado, z0, z1, passo, { altura = 9, braco = 2.4, cor = 0xffa040, base = 8.7, poca = true } = {}) {
  const hastes = [], bracos = [], cabecas = [], pools = [];
  for (let z = z0; z < z1; z += passo) {
    const s = base * lado;
    hastes.push({ s, z, y: altura / 2, sx: 0.24, sy: altura, sz: 0.24 });
    bracos.push({ s: s - lado * braco / 2, z, y: altura - 0.1, sx: braco, sy: 0.14, sz: 0.18 });
    cabecas.push({ s: s - lado * braco, z, y: altura - 0.28, sx: 0.9, sy: 0.16, sz: 0.4 });
    if (poca) pools.push({ s: s - lado * (braco + 1.4), z, sx: 9, sz: 13 });
  }
  instanciar(world, CILINDRO, mat(0x3a4046, { metalness: 0.6, roughness: 0.4 }), hastes);
  instanciar(world, CUBO, mat(0x3a4046, { metalness: 0.6, roughness: 0.4 }), bracos);
  instanciar(world, CUBO, brilhoMat(cor, 3.2), cabecas);
  poças(pools, cor);
}
function predios(z0, z1, minS, maxS, passo, alturaMax) {
  const itens = [];
  for (let z = z0; z < z1; z += passo * (0.6 + Math.random() * 0.8)) for (const lado of [-1, 1]) {
    if (Math.random() < 0.25) continue;
    const h = 18 + Math.random() * alturaMax, w = 12 + Math.random() * 22;
    itens.push({ s: lado * (minS + Math.random() * (maxS - minS)), z, y: h / 2 - 4, sx: w, sy: h, sz: 10 + Math.random() * 18, cor: [0xffffff, 0xd8e8ff, 0xffe2c0][Math.floor(Math.random() * 3)] });
  }
  const janelas = TEX.janelas.clone(); janelas.repeat.set(3, 4); janelas.needsUpdate = true;
  instanciar(world, CUBO, new THREE.MeshBasicMaterial({ map: janelas, color: 0x8f8f8f }), itens);
}

function montarPonte(tr, L0, L1, luz) {
  const concreto = mat(0x8c8270, { roughness: 0.85 });
  // tabuleiro da ponte e o rio lá embaixo
  varrer(world, [[8.62, 0], [12.5, -0.6], [12.5, -2.8], [-12.5, -2.8], [-12.5, -0.6], [-8.62, 0]], L0, L1, mat(0x3a3c3e), { uvZ: 8 });
  const rio = new THREE.Mesh(new THREE.PlaneGeometry(1600, L1 - L0 + 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050a08, roughness: 0.12, metalness: 0.9, envMapIntensity: 1.2 }));
  rio.position.set(0, -26, (L0 + L1) / 2); world.add(rio);
  for (const lado of [-1, 1]) {
    barreiraJersey(lado, L0, L1, concreto);
    varrer(world, [[8.45 * lado, 0.95], [8.45 * lado, 1.5]], L0, L1, mat(0x6c7a7c, { metalness: 0.7, roughness: 0.35 }));
    postes(lado, L0 + 10 + (lado > 0 ? 0 : 18), L1, 36, { altura: 9.5, cor: 0xd8ff9a, base: 9.1 });
  }
  // As torres com os cabos em leque e os refletores verdes
  const torres = [], cabos = [], fachos = [];
  for (const zt of [40, Math.round(tr.length * 0.55), tr.length + 120]) for (const lado of [-1, 1]) {
    const s = 10.4 * lado;
    torres.push({ s, z: zt, y: 24, sx: 1.6, sy: 52, sz: 2.4, rz: -lado * 0.05 });
    torres.push({ s: s + lado * 0.3, z: zt, y: 2, sx: 2.6, sy: 6, sz: 3.4 });
    const topo = ponto(s - lado * 1.2, zt, 47);
    for (let k = 1; k <= 13; k++) for (const sentido of [-1, 1]) {
      const zc = zt + sentido * k * 9, alt = 47 - k * 1.2;
      const a = ponto(s - lado * 1.0, zt, alt), b = ponto(8.6 * lado, zc, 1.2);
      cabos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    for (let k = -3; k <= 3; k++) fachos.push({ s: 9.4 * lado, z: zt + k * 14, y: 0.5, sx: 1, sy: 48, sz: 1, rx: k * 0.08, rz: -lado * 0.18 });
    void topo;
  }
  instanciar(world, CUBO, mat(0x6b2420, { roughness: 0.6, emissive: 0x1a0503 }), torres);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(cabos, 3));
  world.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xe8ffd0).multiplyScalar(1.6) })));
  instanciar(world, CONE_LUZ, aditivo(null, 0x7dff4a, 0.06), fachos).material.side = THREE.DoubleSide;
  predios(L0 - 200, L1 + 400, 230, 420, 26, 120);
}

function montarElevado(tr, L0, L1, luz) {
  const concreto = mat(0x7a6c58, { roughness: 0.9 }), escuro = mat(0x2a2522, { roughness: 0.95 });
  for (const lado of [-1, 1]) barreiraJersey(lado, L0, L1, concreto);
  // o alambrado vermelho em cima da mureta da direita, com os postinhos
  const rede = TEX.rede.clone(); rede.needsUpdate = true;
  varrer(world, [[-8.45, 0.92], [-8.45, 3.1]], L0, L1, new THREE.MeshBasicMaterial({ map: rede, color: new THREE.Color(0xff3a3a).multiplyScalar(1.25), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), { uvZ: 2.2 });
  const postinhos = []; for (let z = L0; z < L1; z += 4.4) postinhos.push({ s: -8.45, z, y: 2, sx: 0.08, sy: 2.2, sz: 0.08 });
  instanciar(world, CUBO, mat(0x5a2020), postinhos);
  // a pista do outro sentido, à esquerda, com faróis vindo
  varrer(world, [[24, 0], [9, 0]], L0, L1, mat(0x161616, { roughness: 0.6 }));
  barreiraJersey(1, L0, L1, concreto);
  // o elevado: laje por cima, vigas, pilares, luz de sódio; vãos abertos de vez em quando
  const vigas = [], pilares = [], lampadas = [], pools = [];
  let z = L0;
  while (z < L1) {
    const fim = Math.min(L1, z + 200 + Math.random() * 90);
    varrer(world, [[26, 10.2], [-14, 10.2]], z, fim, escuro, { uvZ: 10 });
    varrer(world, [[26, 10.9], [26, 9.2]], z, fim, concreto);
    varrer(world, [[-14, 9.2], [-14, 10.9]], z, fim, concreto);
    for (let zz = z + 4; zz < fim; zz += 13) vigas.push({ s: 6, z: zz, y: 9.6, sx: 40, sy: 1.1, sz: 0.8 });
    for (let zz = z + 10; zz < fim; zz += 26) for (const s of [-11.8, 11.8]) pilares.push({ s, z: zz, y: 4.6, sx: 1.6, sy: 9.2, sz: 1.6 });
    for (let zz = z + 7; zz < fim; zz += 17) for (const s of [-4.6, 4.6]) { lampadas.push({ s, z: zz, y: 9.0, sx: 0.5, sy: 0.18, sz: 1.4 }); pools.push({ s: s * 0.95, z: zz, sx: 7.5, sz: 10 }); }
    z = fim + 30 + Math.random() * 25;
  }
  instanciar(world, CUBO, concreto, vigas);
  instanciar(world, CUBO, concreto, pilares);
  instanciar(world, CUBO, brilhoMat(0xffa040, 3.5), lampadas);
  poças(pools, luz, 0.5);
  // placas verdes penduradas
  const tex = placa("CENTRO ↓ ↓"), placaMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xb0b0b0 });
  for (let zp = 260; zp < L1; zp += 420) world.add(colocar(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2), placaMat), -3, zp, 7.6, Math.PI));
  predios(L0 - 100, L1 + 300, 60, 160, 30, 70);
  // faróis do outro sentido (andam no frame)
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.brilho, color: 0xfff2d8, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.set(2.2, 1.1, 1); sp.userData.contramao = { s: 14 + (i % 3) * 3.6, z: L0 + Math.random() * (L1 - L0), v: 22 + Math.random() * 10 };
    world.add(sp); placasDinamicas.push(sp);
  }
}

function montarPorto(tr, L0, L1, luz) {
  const trilho = mat(0x9aa3a8, { metalness: 0.75, roughness: 0.3 });
  for (const lado of [-1, 1]) {
    const postinhos = [];
    for (let z = L0; z < L1; z += 4) postinhos.push({ s: 8.5 * lado, z, y: 0.4, sx: 0.14, sy: 0.8, sz: 0.14 });
    instanciar(world, CUBO, trilho, postinhos);
    varrer(world, [[8.4 * lado, 0.55], [8.4 * lado, 0.85]], L0, L1, trilho);
    varrer(world, [[8.5 * lado, 0], [40 * lado, 0]], L0, L1, mat(0x1a1e22, { roughness: 0.5 }));
    postes(lado, L0 + (lado > 0 ? 0 : 24), L1, 48, { altura: 13, braco: 3, cor: 0xffc070, base: 9.6 });
  }
  const conteineres = [];
  const cores = [0x1f6f86, 0x8f3b30, 0x4d7a62, 0xa77a3c, 0x6a4c8c, 0x2b3f6e];
  for (let z = L0; z < L1 + 200; z += 13) for (const lado of [-1, 1]) for (let fila = 0; fila < 3; fila++) {
    if (Math.random() < 0.18) continue;
    const altura = 1 + Math.floor(Math.random() * (fila + 2));
    for (let n = 0; n < altura; n++) conteineres.push({ s: lado * (15 + fila * 3.2), z, y: 1.3 + n * 2.6, sx: 2.5, sy: 2.55, sz: 12, cor: cores[Math.floor(Math.random() * cores.length)] });
  }
  instanciar(world, CUBO, mat(0xffffff, { roughness: 0.6, metalness: 0.3 }), conteineres);
  // os guindastes do cais, com a luz vermelha no alto
  const ferro = [], luzes = [];
  for (let z = 120; z < L1; z += 210) {
    for (const zz of [z - 6, z + 6]) for (const s of [-24, -44]) ferro.push({ s, z: zz, y: 15, sx: 1, sy: 30, sz: 1 });
    ferro.push({ s: -34, z, y: 30, sx: 46, sy: 1.6, sz: 14 });
    ferro.push({ s: -34, z, y: 34, sx: 2, sy: 6, sz: 2 });
    luzes.push({ s: -12, z, y: 30.6, sx: 0.8, sy: 0.8, sz: 0.8 }, { s: -56, z, y: 30.6, sx: 0.8, sy: 0.8, sz: 0.8 });
  }
  instanciar(world, CUBO, mat(0xb0782a, { metalness: 0.4, roughness: 0.5 }), ferro);
  instanciar(world, ESFERA, brilhoMat(0xff2020, 4), luzes);
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(1600, L1 - L0 + 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x04080c, roughness: 0.15, metalness: 0.9 }));
  mar.position.set(-300, -0.6, (L0 + L1) / 2); world.add(mar);
  predios(L0 - 200, L1 + 400, 230, 420, 30, 90);
}

// A serra: paredão de pedra de um lado, a ribanceira com mata do outro, guard-rail, olhos de gato no asfalto, as
// placas de curva por fora de cada curva e a cidade acesa lá embaixo.
const CONE_ARVORE = new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0); COMPARTILHADOS.add(CONE_ARVORE);
function montarSerra(tr, L0, L1, luz) {
  const pedra = mat(0x3b3631, { roughness: 0.95 }), mata = mat(0x0f1a14, { roughness: 1 }), trilho = mat(0xb0b6ba, { metalness: 0.7, roughness: 0.35 });
  for (const lado of [-1, 1]) {
    const postinhos = []; for (let z = L0; z < L1; z += 4) postinhos.push({ s: 8.5 * lado, z, y: 0.4, sx: 0.14, sy: 0.8, sz: 0.14 });
    instanciar(world, CUBO, trilho, postinhos);
    varrer(world, [[8.4 * lado, 0.5], [8.4 * lado, 0.85]], L0, L1, trilho);
  }
  // o paredão à esquerda (s positivo) e a ribanceira à direita
  varrer(world, [[8.7, 0], [10, 3], [11.5, 9], [16, 17], [26, 22]], L0, L1, pedra, { uvZ: 8 });
  varrer(world, [[-8.7, 0], [-12, -1], [-40, -26], [-120, -60]], L0, L1, mata, { uvZ: 10 });
  const arvores = [];
  for (let z = L0; z < L1; z += 5) {
    if (Math.random() < 0.8) { const h = 6 + Math.random() * 7; arvores.push({ s: -(13 + Math.random() * 22), z: z + Math.random() * 4, y: -2 - Math.random() * 12, sx: h * 0.45, sy: h, sz: h * 0.45, cor: 0x1c3a26 }); }
    if (Math.random() < 0.5) { const h = 5 + Math.random() * 6; arvores.push({ s: 17 + Math.random() * 10, z: z + Math.random() * 4, y: 17 + Math.random() * 3, sx: h * 0.45, sy: h, sz: h * 0.45, cor: 0x223f2a }); }
  }
  instanciar(world, CONE_ARVORE, mat(0xffffff, { roughness: 1 }), arvores);
  postes(-1, L0 + 20, L1, 70, { altura: 9, cor: 0xffa040, base: 9.1 });
  // olhos de gato nas linhas das faixas
  const olhos = []; for (let z = L0; z < L1; z += 12) for (const s of [3.7, 0, -3.7]) olhos.push({ s, z, y: 0.02, sx: 0.07, sy: 0.03, sz: 0.12 });
  instanciar(world, CUBO, brilhoMat(0xfff0b0, 1.5), olhos);
  // placa de curva (as setas) por fora de cada curva fechada
  const setaMat = new THREE.MeshBasicMaterial({ map: TEX.seta, color: 0xd8d8d8 }), curvatura = (z) => inclin(z + 2) - inclin(z - 2);
  for (let z = 120; z < tr.length + 200; z += 30) {
    const k = curvatura(z); if (Math.abs(k) < 0.12) continue;
    const fora = k > 0 ? -1 : 1; // a curva vira para um lado: a placa fica do outro
    for (const dz of [-6, 0, 6]) {
      const pl = colocar(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), setaMat), 9.3 * fora, z + dz, 1.4, Math.PI);
      if (fora < 0) pl.scale.x = -1; world.add(pl);
    }
    z += 60;
  }
  predios(L0 - 200, L1 + 400, 300, 520, 24, 60);
}

function montarLargada(tr) {
  // A árvore de luzes da largada, à esquerda
  const poste = colocar(new THREE.Mesh(CUBO, mat(0x22262a)), 8.9, 5, 2.4); poste.scale.set(0.35, 4.8, 0.35); world.add(poste);
  const caixa = colocar(new THREE.Mesh(CUBO, mat(0x111316)), 8.9, 5, 4.2); caixa.scale.set(0.8, 2.8, 0.5); world.add(caixa);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(ESFERA, new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
    m.scale.setScalar(0.42); colocar(m, 8.9, 4.72, 5.2 - i * 0.62); world.add(m); arvoreLuzes.push(m);
  }
  // Os portais com a faixa na largada e na chegada
  for (const [z, texto, fundo] of [[-2, "DRAG DA GALERA", "#101820"], [tr.length, "CHEGADA", "#7a0d14"]]) {
    for (const s of [-9.4, 9.4]) { const p = colocar(new THREE.Mesh(CUBO, mat(0x30353a, { metalness: 0.6 })), s, z, 3.6); p.scale.set(0.5, 7.2, 0.5); world.add(p); }
    const faixa = colocar(new THREE.Mesh(new THREE.PlaneGeometry(18.8, 1.8), new THREE.MeshBasicMaterial({ map: placa(texto, { fundo, w: 1024, h: 96, borda: "#ffbd45" }), color: 0xd0d0d0, side: THREE.DoubleSide })), 0, z, 6.6, Math.PI);
    world.add(faixa);
    const luzes = []; for (let s = -9; s <= 9; s += 1.5) luzes.push({ s, z: z + 0.2, y: 7.7, sx: 0.4, sy: 0.4, sz: 0.4 });
    instanciar(world, ESFERA, brilhoMat(0xfff0c8, 3), luzes);
  }
  // Placas de distância na direita
  for (let z = 200; z < tr.length; z += 200) {
    const p = colocar(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ map: placa(`${z}`, { fundo: "#101010", cor: "#ffbd45", w: 192, h: 120, borda: "#ffbd45" }), color: 0xcccccc })), -9.1, z, 2.2, Math.PI);
    world.add(p);
  }
}

// ---------- Carros ----------
const PERFIS = {
  esporte: { L: 4.5, W: 2.0, corpo: [[-2.25, 0.3], [2.2, 0.3], [2.28, 0.5], [2.12, 0.66], [0.95, 0.8], [-1.75, 0.9], [-2.22, 0.88], [-2.3, 0.55]], cabine: [[0.95, 0.78], [0.05, 1.2], [-1.0, 1.22], [-1.82, 0.88]], aerofolio: true },
  sedan: { L: 4.6, W: 1.95, corpo: [[-2.3, 0.32], [2.25, 0.32], [2.32, 0.55], [2.2, 0.8], [1.05, 0.9], [-1.6, 0.95], [-2.25, 0.95], [-2.32, 0.6]], cabine: [[1.05, 0.88], [0.25, 1.42], [-1.15, 1.44], [-1.65, 0.93]] },
  hatch: { L: 4.1, W: 1.9, corpo: [[-2.05, 0.32], [2.0, 0.32], [2.08, 0.55], [1.95, 0.8], [0.95, 0.9], [-2.0, 0.95], [-2.08, 0.6]], cabine: [[0.95, 0.88], [0.15, 1.42], [-1.75, 1.44], [-2.0, 0.93]] },
  van: { L: 5.2, W: 2.05, corpo: [[-2.6, 0.35], [2.55, 0.35], [2.6, 0.6], [2.45, 1.0], [1.7, 1.15], [-2.6, 1.15]], cabine: [[1.7, 1.12], [1.0, 2.1], [-2.6, 2.15], [-2.6, 1.12]], fechada: true },
  picape: { L: 5.0, W: 2.0, corpo: [[-2.5, 0.38], [2.45, 0.38], [2.5, 0.65], [2.35, 0.98], [1.25, 1.05], [-2.5, 1.05]], cabine: [[1.25, 1.02], [0.6, 1.72], [-0.6, 1.74], [-0.75, 1.02]] },
  caminhao: { L: 8.5, W: 2.5, corpo: [[-4.25, 0.5], [4.2, 0.5], [4.25, 0.8], [4.2, 1.4], [2.6, 1.4], [-4.25, 1.4]], cabine: [[4.15, 1.38], [4.0, 2.9], [2.6, 3.0], [2.6, 1.38]], bau: true },
};
const geoCache = new Map();
function extrudar(pontos, largura, chave) {
  if (geoCache.has(chave)) return geoCache.get(chave);
  const sh = new THREE.Shape(pontos.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: largura, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2); g.translate(largura / 2, 0, 0); g.computeVertexNormals();
  geoCache.set(chave, g); COMPARTILHADOS.add(g); return g;
}
const RODA = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 16).rotateZ(Math.PI / 2); COMPARTILHADOS.add(RODA);
const matVidro = mat(0x0b1218, { metalness: 0.6, roughness: 0.12 }), matPneu = mat(0x0b0b0c, { roughness: 0.9 });
const matLanterna = brilhoMat(0xff1a24, 2.6), matOcupado = new Set([matVidro, matPneu, matLanterna]);

// Lanternas (vermelhas, mais fortes no freio), faróis (com o facho no chão à frente), neon embaixo e as chamas do nitro.
// `lanternas` e `farois`: os pontos do modelo (modelos.js); sem eles, perto dos cantos da caixa do carro.
function enfeitar(root, { L, W, neon = null, altura = 0.72, lanternas = null, farois = null, farol = 0xeef4ff, chama = 0x3aa0ff }) {
  const ud = root.userData; ud.L = L; ud.W = W; ud.lanternas = []; ud.farois = [];
  const tras = lanternas || [-1, 1].map((lado) => new THREE.Vector3(lado * (W / 2 - 0.32), altura, -L / 2 - 0.08));
  const tam = tras.length > 2 ? 0.38 : 0.6;
  for (const pt of tras) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.brilho, color: 0xff2a2a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 }));
    sp.scale.set(tam, tam * 0.6, 1); sp.position.copy(pt); sp.position.z -= 0.04; sp.userData.tam = tam; root.add(sp); ud.lanternas.push(sp);
  }
  const frente = farois || [-1, 1].map((lado) => new THREE.Vector3(lado * (W / 2 - 0.35), altura * 0.85, L / 2 + 0.05));
  for (const pt of frente) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.brilho, color: new THREE.Color(farol).multiplyScalar(1.1), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    sp.scale.set(0.42, 0.28, 1); sp.position.copy(pt); sp.position.z += 0.05; root.add(sp); ud.farois.push(sp);
  }
  // o facho dos faróis no asfalto
  const facho = new THREE.Mesh(CHAO, aditivo(TEX.poça, new THREE.Color(farol).multiplyScalar(0.3), 0.6));
  facho.scale.set(W * 2.2, 1, 9); facho.position.set(0, 0.05, L / 2 + 5); root.add(facho); ud.facho = facho;
  if (neon !== null) {
    const n = new THREE.Mesh(CHAO, aditivo(TEX.neon, new THREE.Color(neon).multiplyScalar(1.8), 0.95));
    n.scale.set(W * 1.9, 1, L * 1.25); n.position.y = 0.04; root.add(n); ud.neon = n;
  }
  // a labareda do pop and bang, no escapamento (acende por um instante)
  ud.estouros = [-1, 1].map((lado) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.brilho, color: new THREE.Color(0xff8a2a).multiplyScalar(2.5), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.set(lado * 0.28, 0.38, -L / 2 - 0.25); sp.visible = false; root.add(sp); return sp;
  });
  ud.estouroT = 0;
  ud.chamas = [];
  for (const lado of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.5), aditivo(null, new THREE.Color(chama).multiplyScalar(2.2), 0.9));
    c.position.set(lado * 0.28, 0.38, -L / 2 - 0.05); c.visible = false; root.add(c); ud.chamas.push(c);
  }
}
// O freio acende as lanternas.
function frear(obj, forte) {
  for (const sp of obj.userData.lanternas || []) { const k = forte ? 1.5 : 1; sp.scale.set(sp.userData.tam * k, sp.userData.tam * 0.6 * k, 1); sp.material.opacity = forte ? 1 : 0.75; }
}
function carroProcedural(tipo, cor, neon) {
  const p = PERFIS[tipo], root = new THREE.Group(), corpo = new THREE.Group(); root.add(corpo);
  const pintura = mat(cor, { metalness: 0.55, roughness: 0.32, envMapIntensity: 1.2 });
  corpo.add(new THREE.Mesh(extrudar(p.corpo, p.W, tipo + ":c"), pintura));
  const cab = new THREE.Mesh(extrudar(p.cabine, p.W * (p.fechada ? 1 : 0.84), tipo + ":v"), p.fechada ? pintura : matVidro); corpo.add(cab);
  if (p.bau) { const b = new THREE.Mesh(CUBO, mat(0xd8d6cf, { roughness: 0.7 })); b.scale.set(p.W + 0.1, 2.6, 5.6); b.position.set(0, 2.05, -1.25); corpo.add(b); }
  if (p.aerofolio) { const a = new THREE.Mesh(CUBO, mat(0x111111)); a.scale.set(p.W * 0.95, 0.06, 0.4); a.position.set(0, 1.12, -p.L / 2 + 0.25); corpo.add(a); }
  const rodas = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new THREE.Mesh(RODA, matPneu); r.position.set(sx * (p.W / 2 - 0.1), 0.35, sz * (p.L / 2 - (p.L > 6 ? 1.4 : 0.85))); root.add(r); rodas.push(r); }
  for (const lado of [-1, 1]) { const t = new THREE.Mesh(CUBO, matLanterna); t.scale.set(0.42, 0.12, 0.06); t.position.set(lado * (p.W / 2 - 0.32), p.bau ? 0.9 : 0.72, -p.L / 2 - 0.04); corpo.add(t); }
  root.userData.corpo = corpo; root.userData.rodas = rodas; root.userData.banco = new THREE.Vector3(0.4, 1.1, -0.3);
  enfeitar(root, { L: p.L, W: p.W, neon, altura: p.bau ? 0.9 : 0.72 });
  return root;
}
// O carro de um GLB, encaixado no tamanho do jogo, com o visual da garagem (`visual`: pintura, neon, farol e chama em
// "#rrggbb"; a pintura `null` é a de fábrica e o neon `null` é sem neon). A pintura troca só a cor da peça de pintura
// deste carro (o material é copiado, o modelo carregado fica igual).
function importedCar(source, id, visual) {
  const root = new THREE.Group(), corpo = new THREE.Group(), car = source.clone(true), modelo = MODELOS[id] || {};
  root.userData.imported = true; root.add(corpo);
  car.rotation.y += modelo.giro || 0;
  car.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(car), size = bounds.getSize(new THREE.Vector3());
  if (size.x > size.z * 1.1) {
    car.rotation.y += Math.PI / 2; car.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(car); size = bounds.getSize(new THREE.Vector3());
  }
  const scale = Math.min(2.1 / size.x, 4.6 / size.z, 2.0 / size.y);
  const center = bounds.getCenter(new THREE.Vector3());
  car.scale.multiplyScalar(scale);
  car.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  if (visual.pintura && modelo.pintura) {
    const copias = new Map();
    car.traverse((o) => {
      if (!o.isMesh) return;
      const pintar = (m) => {
        if (!modelo.pintura.test(m.name)) return m;
        if (!copias.has(m)) { const c = m.clone(); c.map = null; c.color.set(visual.pintura); c.userData.copia = true; copias.set(m, c); }
        return copias.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(pintar) : pintar(o.material);
    });
  }
  corpo.add(car); root.userData.corpo = corpo; root.userData.rodas = [];
  root.userData.banco = new THREE.Vector3(...(modelo.banco || [0.37, size.y * scale * 0.72, -0.3]));
  const pontos = (lista) => lista?.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  enfeitar(root, { L: size.z * scale, W: size.x * scale, neon: visual.neon, altura: size.y * scale * 0.55, lanternas: pontos(modelo.tras), farois: pontos(modelo.frente), farol: visual.farol, chama: visual.chama });
  return root;
}
// O vidro das lanternas de cada modelo acende (vermelho com nome de luz traseira: red_glass, RED_GLASS, glassBackLight...).
function acenderLanternas(gltf) {
  gltf.scene.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      const c = m.color;
      if (!m.userData.acesa && /red|tail|backlight|stop/i.test(m.name) && c && c.r > 0.45 && c.g < c.r * 0.35 && c.b < c.r * 0.35) { m.userData.acesa = true; m.emissive?.setHex(0xff1010); m.emissiveIntensity = 1.6; }
    }
  });
}

// ---------- Partículas (fumaça dos pneus, faíscas) ----------
// Criadas de uma vez antes da largada (criarParticulas), para não montar material no meio da corrida.
const particulas = [];
function novaParticula(tipo) {
  const m = tipo === "fumaça"
    ? new THREE.SpriteMaterial({ map: TEX.fumaça, color: 0xd8d8d8, transparent: true, depthWrite: false })
    : new THREE.SpriteMaterial({ map: TEX.brilho, color: new THREE.Color(0xffa040).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false });
  const p = { tipo, sp: new THREE.Sprite(m), vivo: false }; p.sp.visible = false; scene.add(p.sp); particulas.push(p); return p;
}
function criarParticulas() { while (particulas.length < 120) novaParticula(particulas.length % 3 ? "fumaça" : "faisca"); }
function soltar(tipo, pos, vel, vida = 1.2, tam = 1) {
  if (reduced.matches && tipo === "fumaça" && particulas.filter((x) => x.vivo).length > 20) return;
  let p = particulas.find((x) => !x.vivo && x.tipo === tipo);
  if (!p) {
    if (particulas.length > 160) return;
    p = novaParticula(tipo);
  }
  Object.assign(p, { vivo: true, t: 0, vida, tam, vel: vel.clone() });
  p.sp.position.copy(pos); p.sp.visible = true;
}
function passoParticulas(dt) {
  for (const p of particulas) {
    if (!p.vivo) continue;
    p.t += dt; const k = p.t / p.vida;
    if (k >= 1) { p.vivo = false; p.sp.visible = false; continue; }
    p.sp.position.addScaledVector(p.vel, dt);
    if (p.tipo === "fumaça") { p.vel.multiplyScalar(1 - dt * 1.2); p.vel.y += dt * 0.8; p.sp.scale.setScalar(p.tam * (1 + k * 3.5)); p.sp.material.opacity = 0.55 * (1 - k); }
    else { p.vel.y -= 9 * dt; p.sp.scale.setScalar(0.35 * (1 - k)); }
  }
}
function limparParticulas() { for (const p of particulas) { p.vivo = false; p.sp.visible = false; } }

// ---------- Corrida ----------
let corrida = null, phase = "menu", visual = new Map(), cones = [], obstaculosVis = [];
let gasHeld = false, nitroHeld = false, brakeHeld = false, last = 0, ultimoT = 0, fimAte = 0, messageUntil = 0, cameraShake = 0;
const follow = new THREE.Vector3(), olhar = new THREE.Vector3();
let primeiroQuadro = true, luzPainel = null;
// A câmera: de trás do carro ou de dentro (do banco do motorista, modelos.js). C ou o botão CAM trocam; fica guardada.
let camInterna = (() => { try { return localStorage.getItem("drag:camera") === "interna"; } catch { return false; } })();
function alternarCamera() {
  camInterna = !camInterna;
  try { localStorage.setItem("drag:camera", camInterna ? "interna" : "tras"); } catch {}
  if (corrida) showCallout(camInterna ? "CÂMERA INTERNA" : "CÂMERA DE TRÁS", 0.6, "azul");
  primeiroQuadro = true;
}

function setPhase(p) { phase = p; document.body.dataset.phase = p; }
function limparCarros() {
  for (const v of visual.values()) { scene.remove(v); soltarCarro(v); }
  visual.clear();
  for (const o of [...obstaculosVis, ...cones]) { scene.remove(o.obj || o); }
  obstaculosVis = []; cones = [];
}
function disposeCarro(g) { g.traverse((o) => { if (o.material && !matOcupado.has(o.material)) o.material.dispose(); if (o.geometry && !COMPARTILHADOS.has(o.geometry)) o.geometry.dispose(); }); }
// Solta um carro: o procedural inteiro; do importado, só o que é dele (brilhos, neon, chamas e a pintura copiada).
function soltarCarro(v) {
  if (!v.userData.imported) return disposeCarro(v);
  v.traverse((o) => {
    for (const m of [].concat(o.material || [])) if (o.isSprite || m.blending === THREE.AdditiveBlending || m.userData.copia) m.dispose();
    if (o.geometry?.type === "ConeGeometry") o.geometry.dispose();
  });
}

function montarCarros() {
  limparCarros();
  const j = corrida.jogador, spec = L.CARROS[selectedCar];
  visual.set(j, readyModel ? importedCar(readyModel, selectedCar, visualDe(selectedCar, spec.neon)) : carroProcedural("esporte", 0xf4f6f6, spec.neon));
  // a luz fraca do painel, que só acende na câmera interna (ela existe sempre: acender ou apagar uma luz nova
  // mudaria a conta de luzes e recompilaria todos os shaders no meio da corrida)
  const eu = visual.get(j), b = eu.userData.banco;
  luzPainel = new THREE.PointLight(0x9fb8ff, 0, 1.6, 2); luzPainel.position.set(b.x * 0.5, b.y - 0.2, b.z + 0.7); eu.userData.corpo.add(luzPainel);
  // os rivais: o modelo, se carregou (a largada espera por eles); senão, o carro provisório
  corrida.pilotos.slice(1).forEach((r, i) => {
    const id = modelosRivais[i], gltf = id && modelosProntos.get(id);
    visual.set(r, gltf ? importedCar(gltf.scene, id, { neon: `#${new THREE.Color(NEON_RIVAL[i % 3]).getHexString()}`, farol: "#eef4ff", chama: "#3aa0ff" }) : carroProcedural("esporte", COR_RIVAL[i % 3], NEON_RIVAL[i % 3]));
  });
  corrida.trafego.forEach((t) => visual.set(t, carroProcedural(t.tipo, COR_TRAFEGO[t.cor % COR_TRAFEGO.length], null)));
  for (const v of visual.values()) scene.add(v);
  // As obras: cavaletes listrados, pisca-alerta, cones antes e a placa de seta.
  const listras = new THREE.MeshStandardMaterial({ map: TEX.obra, roughness: 0.6, emissive: 0xffffff, emissiveMap: TEX.obra, emissiveIntensity: 0.25 });
  const pisca = brilhoMat(0xffb21c, 4), setaMat = new THREE.MeshBasicMaterial({ map: TEX.seta, color: 0xcfcfcf });
  for (const o of corrida.obstaculos) {
    const g = new THREE.Group(), s = -o.x;
    for (const y of [0.55, 1.15]) { const b = new THREE.Mesh(CUBO, listras); b.scale.set(3.2, 0.42, 0.12); b.position.y = y; g.add(b); }
    for (const x of [-1.4, 1.4]) { const p = new THREE.Mesh(CUBO, mat(0x333333)); p.scale.set(0.1, 1.4, 0.5); p.position.set(x, 0.7, 0); g.add(p); const l = new THREE.Mesh(ESFERA, pisca); l.scale.setScalar(0.28); l.position.set(x, 1.55, 0); l.userData.pisca = true; g.add(l); }
    colocar(g, s, o.z); scene.add(g); obstaculosVis.push({ obj: g, o });
    const placaSeta = new THREE.Group(); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), setaMat); pl.position.y = 1.5; pl.rotation.y = Math.PI; placaSeta.add(pl);
    const pe = new THREE.Mesh(CUBO, mat(0x333333)); pe.scale.set(0.1, 0.8, 0.1); pe.position.y = 0.4; placaSeta.add(pe);
    if (o.x < 0) pl.scale.x = -1; // a seta aponta para o lado livre
    colocar(placaSeta, s, o.z - 70); scene.add(placaSeta); obstaculosVis.push({ obj: placaSeta, o: null });
    for (let k = 1; k <= 4; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 10).translate(0, 0.35, 0), mat(0xff5a00, { emissive: 0x401000 }));
      const sc = s + (s > 0 ? -1 : 1) * (1.5 - k * 0.35);
      colocar(c, sc, o.z - 6 - k * 9); scene.add(c);
      cones.push({ obj: c, s: sc, z: o.z - 6 - k * 9, voando: null });
    }
  }
}

// Antes da largada, com tudo montado: o navegador compila os shaders de tudo o que vai aparecer (em paralelo, sem
// travar a página) e manda as texturas para a placa de vídeo. Sem isso, cada coisa nova que aparecia na tela pela
// primeira vez (um rival, a fumaça, a chama do nitro, um carro do tráfego) travava um quadro.
const MAPAS = ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap", "bumpMap", "clearcoatNormalMap", "specularColorMap"];
const texturasSubidas = new WeakSet();
// (O compile passa por tudo, até pelo que está escondido; só as luzes contam se estiverem acesas, e é com as luzes da
// pista que os shaders têm de sair.)
async function aquecer() {
  try {
    await Promise.race([renderer.compileAsync(scene, camera), new Promise((ok) => setTimeout(ok, 4000))]);
    scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of MAPAS) { const t = m[k]; if (t?.isTexture && !texturasSubidas.has(t)) { texturasSubidas.add(t); renderer.initTexture(t); } } });
  } catch (e) { console.warn("Drag: não deu para preparar os shaders", e); }
}
const modelosProntos = new Map();
let largando = false;
async function start() {
  if (largando) return;
  largando = true; $("start").disabled = true; $("again").disabled = true;
  garagem.fecharOficina(); mostrarCarregando("carros");
  audio.unlock(); music.start();
  try {
    const rivais = await Promise.race([rivaisProntos, new Promise((ok) => setTimeout(() => ok([]), 25000))]);
    modelosProntos.clear();
    rivais.forEach((r, i) => { if (r.status === "fulfilled") modelosProntos.set(modelosRivais[i], r.value); });
    mostrarCarregando("pista");
    await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0))); // a tela de carregando aparece antes de montar
    iniciarCorrida();
    await aquecer();
    corrida.pronta = true;
  } finally {
    mostrarCarregando(null);
    largando = false; $("start").disabled = false; $("again").disabled = false;
  }
}
function iniciarCorrida() {
  limparParticulas(); criarParticulas();
  const tr = TRACKS[selected];
  garagem.esconder(); buildWorld();
  corrida = L.criarCorrida({ comprimento: tr.length, carro: selectedCar, semente: (Date.now() & 0xffff) + selected * 977 });
  corrida.pronta = false; // o relógio só anda depois do aquecer
  audio.setPerfil(MODELOS[selectedCar]?.motor);
  montarCarros();
  sortearRivais(); // a próxima corrida já carrega outros rivais
  gasHeld = nitroHeld = brakeHeld = false; cameraShake = 0; primeiroQuadro = true; fimAte = 0;
  setPhase("burnout");
  $("menu").classList.add("hidden"); $("finish").classList.add("hidden"); $("hud").classList.remove("hidden"); $("touch").classList.remove("hidden");
  $("preparo").classList.remove("hidden");
  $("trackName").textContent = tr.name.toUpperCase();
  $("trilho").querySelectorAll("i").forEach((i) => i.remove());
  corrida.pilotos.forEach((p, i) => { const el = document.createElement("i"); el.style.setProperty("--c", `#${new THREE.Color(i ? NEON_RIVAL[(i - 1) % 3] : 0xffbd45).getHexString()}`); if (!i) el.className = "eu"; $("trilho").append(el); p.marcador = el; });
  desenharZonas(true);
  showCallout("", 0); updateHud();
}
$("start").onclick = start; $("again").onclick = start;

// ---------- Controles ----------
function todosNaPista() { return [...corrida.pilotos.filter((p) => !(p.foraT > 1.2)), ...corrida.trafego, ...corrida.obstaculos]; }
function action(a) {
  if (a === "cam") return alternarCamera();
  if (!corrida || corrida.fase !== "corrida") return;
  const j = corrida.jogador;
  if (a === "left" || a === "right") {
    if (L.requestLane(j, a === "left" ? -1 : 1, todosNaPista())) audio.blip(460, 0.04);
    else { audio.blip(110, 0.07); $("faixas").animate?.([{ transform: "translateX(-50%) translateX(-6px)" }, { transform: "translateX(-50%) translateX(6px)" }, { transform: "translateX(-50%)" }], { duration: 180 }); }
    return;
  }
  const q = L.shift(j, a === "up" ? 1 : -1);
  if (!q) return;
  audio.troca(q);
  const TXT = { perfeita: ["TROCA PERFEITA", "verde"], boa: ["BOA TROCA", "azul"], cedo: ["CEDO DEMAIS", "amarelo"], tarde: ["TARDE DEMAIS", "vermelho"] };
  if (TXT[q]) showCallout(TXT[q][0], 0.7, TXT[q][1]);
  else showCallout(`MARCHA ${j.gear}`, 0.5, "amarelo");
  if (q === "perfeita" && !reduced.matches) cameraShake = Math.max(cameraShake, 0.12);
}
const TECLAS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ShiftLeft: "up", ShiftRight: "up", KeyE: "up", KeyQ: "down", KeyZ: "down" };
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === "KeyW" || e.code === "ArrowUp") { e.preventDefault(); gasHeld = true; return; }
  if (e.code === "KeyS" || e.code === "ArrowDown") { e.preventDefault(); brakeHeld = true; return; }
  if (e.code === "Space" || e.code === "KeyN") { e.preventDefault(); nitroHeld = true; return; }
  if (TECLAS[e.code]) { e.preventDefault(); if (!e.repeat) action(TECLAS[e.code]); }
  if (e.code === "KeyC" && !e.repeat && phase !== "menu") alternarCamera();
  if (e.key === "Enter" && (phase === "menu" || phase === "finish") && !$("start").disabled) start();
});
document.addEventListener("keyup", (e) => {
  if (e.code === "KeyW" || e.code === "ArrowUp") gasHeld = false;
  if (e.code === "KeyS" || e.code === "ArrowDown") brakeHeld = false;
  if (e.code === "Space" || e.code === "KeyN") nitroHeld = false;
});
const soltarTudo = () => { gasHeld = nitroHeld = brakeHeld = false; };
window.addEventListener("blur", soltarTudo);
document.addEventListener("visibilitychange", () => { if (document.hidden) soltarTudo(); });
const SEGURAR = { gas: (v) => { gasHeld = v; }, nitro: (v) => { nitroHeld = v; }, freio: (v) => { brakeHeld = v; } };
$("touch").querySelectorAll("button").forEach((b) => {
  const segurar = SEGURAR[b.dataset.action];
  if (segurar) {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); segurar(true); b.classList.add("on"); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { segurar(false); b.classList.remove("on"); });
  } else b.addEventListener("pointerdown", (e) => { e.preventDefault(); action(b.dataset.action); });
});
$("touch").addEventListener("contextmenu", (e) => e.preventDefault());

// ---------- Som ----------
// O som do seu motor, sintetizado com o jeito de cada carro (`motor` em modelos.js). A nota segue as explosões do
// motor (giro / 60 × cilindros / 4, com os harmônicos por cima); o turbo assobia com o giro e solta a válvula
// ("psssh") na troca; e tem os pops and bangs: tirar o pé em giro alto solta estalos no escapamento por um instante,
// e cada troca para cima dá um estouro. `aoEstourar(forte)` avisa o desenho (a labareda no escapamento).
class EngineAudio {
  constructor() { this.on = true; this.ctx = null; this.perfil = { cil: 6, giro: 7500, turbo: true, aspereza: 0.5 }; this.estalos = 0; this.gasAntes = false; this.aoEstourar = null; }
  setPerfil(p) { if (p) this.perfil = p; }
  ruido(c) {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
  }
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      this.ctx = new Ctx(); const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = 0.42; this.master.connect(c.destination);
      this.motor = c.createGain(); this.motor.gain.value = 0; this.filter = c.createBiquadFilter(); this.filter.type = "lowpass";
      this.motor.connect(this.filter).connect(this.master);
      this.oscs = [[1, "sawtooth", 0.2], [0.5, "triangle", 0.16], [2, "sawtooth", 0.05], [3, "square", 0.025]].map(([ratio, tipo, vol]) => {
        const o = c.createOscillator(); o.type = tipo; const g = c.createGain(); g.gain.value = vol; o.connect(g).connect(this.motor); o.start(); return { o, ratio, g, vol };
      });
      const faixa = (tipo, f, q = 1) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; };
      this.faixa = faixa;
      // o ronco rasgado: ruído numa faixa que acompanha a nota do motor
      this.rasgo = c.createGain(); this.rasgo.gain.value = 0; this.rasgoFiltro = faixa("bandpass", 200, 2.5);
      this.ruido(c).connect(this.rasgoFiltro).connect(this.rasgo).connect(this.filter);
      // o assobio do turbo
      this.turbo = c.createOscillator(); this.turbo.type = "sine"; this.turboGain = c.createGain(); this.turboGain.gain.value = 0;
      this.turbo.connect(this.turboGain).connect(this.master); this.turbo.start();
      // o ruído guardado para os estalos (cada estalo toca um pedaço dele)
      this.estaloBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.estaloBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.wind = c.createGain(); this.wind.gain.value = 0; this.ruido(c).connect(faixa("bandpass", 540)).connect(this.wind).connect(this.master);
      this.chiado = c.createGain(); this.chiado.gain.value = 0; this.ruido(c).connect(faixa("bandpass", 2300, 3)).connect(this.chiado).connect(this.master);
      this.sopro = c.createGain(); this.sopro.gain.value = 0; this.ruido(c).connect(faixa("highpass", 2600)).connect(this.sopro).connect(this.master);
      this.rival = c.createOscillator(); this.rival.type = "sawtooth"; this.rivalGain = c.createGain(); this.rivalGain.gain.value = 0;
      this.rival.connect(faixa("lowpass", 440)).connect(this.rivalGain).connect(this.master); this.rival.start();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  update({ speed = 0, rpm = 0, active = false, cut = false, rival = null, distRival = 1e9, gas = false, chiado = 0, nitro = false, dt = 0 }) {
    if (!this.ctx) return; const t = this.ctx.currentTime, on = this.on && active, P = this.perfil;
    const gain = on ? (gas ? 0.085 : 0.035) * (cut ? 0.4 : 1) : 0;
    const giro = 850 + Math.min(1.02, rpm) * (P.giro - 850), f = giro / 60 * P.cil / 4;
    for (const { o, ratio, g, vol } of this.oscs) { o.frequency.setTargetAtTime(f * ratio, t, 0.03); if (ratio === 3) g.gain.setTargetAtTime(vol * (0.4 + P.aspereza), t, 0.1); }
    this.filter.frequency.setTargetAtTime(350 + rpm * (gas ? 2600 : 1500), t, 0.05);
    this.motor.gain.setTargetAtTime(gain, t, 0.05);
    this.rasgoFiltro.frequency.setTargetAtTime(f * 2, t, 0.03);
    this.rasgo.gain.setTargetAtTime(on ? P.aspereza * (gas ? 0.5 : 0.2) * (0.3 + rpm) : 0, t, 0.06);
    this.turbo.frequency.setTargetAtTime(1500 + rpm * 2800, t, 0.08);
    this.turboGain.gain.setTargetAtTime(on && P.turbo && gas ? 0.01 * rpm * rpm : 0, t, 0.15);
    // tirou o pé em giro alto: os estalos no escapamento por um instante (e a válvula do turbo)
    if (on && this.gasAntes && !gas && rpm > 0.55) { this.estalos = 0.45 + rpm * 0.8; if (P.turbo) this.valvula(); }
    this.gasAntes = gas;
    if (on && this.estalos > 0) { this.estalos -= dt; if (Math.random() < dt * 16) this.estalo(Math.random() < 0.16); }
    if (!on) this.estalos = 0;
    this.wind.gain.setTargetAtTime(on ? Math.min(0.09, speed * 0.00036) : 0, t, 0.12);
    this.chiado.gain.setTargetAtTime(on ? chiado * 0.05 : 0, t, 0.06);
    this.sopro.gain.setTargetAtTime(on && nitro ? 0.07 : 0, t, 0.08);
    this.rival.frequency.setTargetAtTime(45 + (rival?.speed || 0) * 0.4, t, 0.08);
    this.rivalGain.gain.setTargetAtTime(on ? Math.max(0, 0.022 * (1 - distRival / 55)) : 0, t, 0.1);
  }
  blip(freq = 210, duration = 0.09, tipo = "square", vol = 0.07) {
    if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + duration);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + duration);
  }
  troca(q) {
    if (q !== "reduziu") { this.estalo(true); if (this.perfil.turbo) this.valvula(); } // o estouro da troca
    if (q === "perfeita") { this.blip(520, 0.07, "square", 0.04); setTimeout(() => this.blip(780, 0.09, "square", 0.04), 70); } else if (q === "boa") this.blip(380, 0.09, "square", 0.04); else if (q !== "reduziu") this.blip(170, 0.12, "sawtooth", 0.05);
  }
  // um estalo do escapamento: um pedacinho de ruído abafado; o forte (o "bang") tem a pancada grave por baixo
  estalo(forte = false) {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), dur = forte ? 0.14 : 0.03 + Math.random() * 0.04;
    s.buffer = this.estaloBuf; f.type = "lowpass"; f.frequency.value = forte ? 900 : 1100 + Math.random() * 1600;
    g.gain.setValueAtTime(forte ? 0.42 : 0.14 + Math.random() * 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 0.8, dur + 0.02);
    if (forte) this.blip(70, 0.16, "sine", 0.22);
    this.aoEstourar?.(forte);
  }
  // a válvula do turbo aliviando: um "psssh" que some
  valvula() {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.estaloBuf; f.type = "bandpass"; f.Q.value = 0.8; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
    g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 0.5, 0.42);
  }
  batida(forte = false) {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = this.ruido(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = "lowpass"; f.frequency.value = forte ? 900 : 1600;
    g.gain.setValueAtTime(forte ? 0.5 : 0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (forte ? 0.9 : 0.25));
    s.connect(f).connect(g).connect(this.master); s.stop(t + 1);
    this.blip(forte ? 55 : 90, forte ? 0.5 : 0.15, "sawtooth", forte ? 0.15 : 0.06);
  }
  toggle() { this.on = !this.on; $("sound").textContent = this.on ? "🔊" : "🔇"; this.unlock(); }
}
const audio = new EngineAudio();
audio.aoEstourar = (forte) => { const eu = corrida && visual.get(corrida.jogador); if (eu) acenderEstouro(eu, forte); };
class RaceMusic {
  constructor() {
    this.audio = $("musicAudio"); this.audio.volume = 0.38; this.tracks = []; this.index = 0; this.active = false; this.run = 0;
    this.audio.addEventListener("ended", () => this.next());
  }
  async start() {
    const run = ++this.run; this.active = true; this.audio.pause(); $("song").textContent = "";
    try {
      const response = await fetch("/api/corrida/drag/musicas", { cache: "no-store" });
      if (!response.ok) return;
      const tracks = await response.json();
      if (!this.active || run !== this.run || !tracks.length) return;
      this.tracks = tracks; this.index = 0; this.playCurrent();
    } catch (error) { console.warn("Drag: não foi possível listar as músicas", error); }
  }
  async playCurrent() {
    if (!this.active || !this.tracks.length) return;
    const track = this.tracks[this.index]; this.audio.src = track.url; this.audio.muted = !audio.on;
    $("song").textContent = `♪ ${track.nome}`;
    try { await this.audio.play(); }
    catch { $("song").textContent = `♪ Toque em 🔇/🔊 para iniciar: ${track.nome}`; }
  }
  next() { if (!this.active || !this.tracks.length) return; this.index = (this.index + 1) % this.tracks.length; this.playCurrent(); }
  toggle() { this.audio.muted = !audio.on; if (audio.on && this.active && this.audio.paused) this.playCurrent(); }
  stop() { this.active = false; this.run++; this.audio.pause(); this.audio.removeAttribute("src"); this.audio.load(); $("song").textContent = ""; }
}
const music = new RaceMusic();
$("sound").onclick = () => { audio.toggle(); music.toggle(); };

// ---------- HUD ----------
function showCallout(text, seconds, cor = "", sub = "") {
  const el = $("callout");
  el.innerHTML = text ? `${text}${sub ? `<small>${sub}</small>` : ""}` : "";
  el.className = `callout ${cor}`;
  if (text && !reduced.matches) { void el.offsetWidth; el.classList.add("pop"); }
  messageUntil = performance.now() / 1000 + seconds;
}
const svgNS = "http://www.w3.org/2000/svg";
const TC = { cx: 292, cy: 290, R: 252, a0: 118, a1: 242 };
const angTach = (v) => TC.a0 + (TC.a1 - TC.a0) * clamp(v, 0, 1);
const polar = (cx0, cy0, R, a) => [cx0 + R * Math.cos(a * D), cy0 + R * Math.sin(a * D)];
function arco(cx0, cy0, R, a0, a1) {
  const [x0, y0] = polar(cx0, cy0, R, a0), [x1, y1] = polar(cx0, cy0, R, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function linhaSVG(pai, attrs, tag = "path") { const el = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); pai.append(el); return el; }
(function montarConta() {
  const ticks = $("tachTicks");
  for (let i = 0; i <= 20; i++) {
    const v = i / 20, a = angTach(v), maior = i % 2 === 0;
    const [x0, y0] = polar(TC.cx, TC.cy, TC.R - 10, a), [x1, y1] = polar(TC.cx, TC.cy, TC.R - (maior ? 36 : 22), a);
    linhaSVG(ticks, { x1: x0, y1: y0, x2: x1, y2: y1, stroke: v >= ZONA.tarde ? "#ff3b45" : "#fff", "stroke-width": maior ? 4 : 2 }, "line");
    if (maior) { const [tx, ty] = polar(TC.cx, TC.cy, TC.R - 58, a); linhaSVG(ticks, { x: tx, y: ty + 9, "text-anchor": "middle" }, "text").textContent = i / 2; }
  }
  $("gear").setAttribute("x", 236); $("gear").setAttribute("y", 128);
  $("shiftLight").setAttribute("cx", 236); $("shiftLight").setAttribute("cy", 40);
  $("n2oBase").setAttribute("d", arco(-80, 200, 230, 58, -58));
})();
function desenharZonas(preparo) {
  const g = $("tachZonas"); g.innerHTML = "";
  linhaSVG(g, { d: arco(TC.cx, TC.cy, TC.R, TC.a0, TC.a1), fill: "none", stroke: "#ffffff38", "stroke-width": 16 });
  const faixa = (v0, v1, cor) => linhaSVG(g, { d: arco(TC.cx, TC.cy, TC.R, angTach(v0), angTach(v1)), fill: "none", stroke: cor, "stroke-width": 16 });
  if (preparo) faixa(ZONA_PNEU.min, ZONA_PNEU.max, "#3dff7a");
  else { faixa(ZONA.boa, ZONA.perfeitaMin, "#2aa8ff"); faixa(ZONA.perfeitaMin, ZONA.perfeitaMax, "#3dff7a"); faixa(ZONA.perfeitaMax, ZONA.tarde, "#2aa8ff"); }
  faixa(ZONA.tarde, 1, "#ff3b45");
  linhaSVG(g, { id: "rpmFill", fill: "none", stroke: "#fff", "stroke-width": 6, d: "" });
}
function timeString(s) { return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`; }
const cacheHud = new Map();
const setTxt = (id, v) => { if (cacheHud.get(id) !== v) { cacheHud.set(id, v); $(id).textContent = v; } };
function updateHud() {
  if (!corrida) return;
  const j = corrida.jogador, tr = TRACKS[selected];
  const corridaRolando = corrida.fase === "corrida" || corrida.fase === "fim";
  setTxt("distance", `${Math.min(tr.length, Math.max(0, Math.floor(j.z)))} / ${tr.length} m`);
  setTxt("timer", timeString(corrida.tempo));
  setTxt("speed", String(Math.round(j.speed)).padStart(3, "0"));
  setTxt("gear", corridaRolando ? String(j.gear) : "N");
  setTxt("lane", L.NOMES_FAIXA[j.targetLane]);
  $("faixas").querySelectorAll("i").forEach((el, i) => el.classList.toggle("on", i === j.targetLane));
  const pos = L.posicaoDe(corrida);
  const rank = `${pos}º/${corrida.pilotos.length}`;
  if (cacheHud.get("rank") !== rank) { cacheHud.set("rank", rank); $("rank").innerHTML = `${pos}<sup>º</sup><small>/${corrida.pilotos.length}</small>`; }
  for (const p of corrida.pilotos) if (p.marcador) p.marcador.style.left = `${clamp(p.z / tr.length * 100, 0, 100)}%`;
  // conta-giros
  const rpm = clamp(j.rpm, 0, 1), a = angTach(rpm);
  const [x0, y0] = polar(TC.cx, TC.cy, TC.R - 78, a), [x1, y1] = polar(TC.cx, TC.cy, TC.R + 16, a);
  const ag = $("rpmNeedle"); ag.setAttribute("x1", x0); ag.setAttribute("y1", y0); ag.setAttribute("x2", x1); ag.setAttribute("y2", y1);
  const fill = document.getElementById("rpmFill");
  const q = L.qualidadeDoGiro(j.rpm);
  const corGiro = !corridaRolando ? (rpm >= ZONA_PNEU.min && rpm <= ZONA_PNEU.max ? "#3dff7a" : rpm > ZONA.tarde ? "#ff3b45" : "#ffffff") : q === "perfeita" ? "#3dff7a" : q === "boa" ? "#2aa8ff" : q === "tarde" ? "#ff3b45" : "#ffffff";
  if (fill) { fill.setAttribute("d", arco(TC.cx, TC.cy, TC.R + 16, TC.a0, Math.max(TC.a0 + 0.1, a))); fill.setAttribute("stroke", corGiro); }
  const luz = !corridaRolando ? (corGiro === "#ffffff" ? "#20242a" : corGiro) : j.gear === j.marchas.length && q !== "tarde" ? "#20242a" : q === "cedo" ? "#20242a" : corGiro;
  $("shiftLight").setAttribute("fill", luz);
  $("shiftLight").style.filter = luz === "#20242a" ? "" : `drop-shadow(0 0 10px ${luz})`;
  // nitro, vácuo e motor
  const n = j.nitro / j.nitroMax;
  $("n2oFill").setAttribute("d", n > 0.005 ? arco(-80, 200, 230, 58, 58 - 116 * n) : "");
  $("n2oFill").setAttribute("stroke", j.nitroOn && n > 0 ? "#9fe4ff" : "#27b4ff");
  $("vacuoBar").style.width = `${j.vacuo * 100}%`; $("vacuoBox").classList.toggle("cheio", j.vacuo >= 1);
  $("hud").classList.toggle("enchendo", j.vacuo > 0.05 && j.nitro < j.nitroMax && corrida.fase === "corrida");
  $("motorBar").style.width = `${j.overrev / L.ENGINE_LIMIT_SECONDS * 100}%`; $("motorBox").classList.toggle("alerta", j.overrev > 1.2);
  // preparo: pneus e a árvore de luzes
  if (!corridaRolando) {
    $("pneuBar").style.width = `${j.pneu * 100}%`; setTxt("pneuPct", `${Math.round(j.pneu * 100)}%`);
    const titulo = corrida.fase === "aquecimento" ? "AQUEÇA OS PNEUS" : "SEGURE O GIRO";
    setTxt("preparoTitulo", titulo);
    setTxt("preparoTexto", corrida.fase === "aquecimento" ? "Segure o acelerador e mantenha o ponteiro na faixa verde do conta-giros." : "Largue com o ponteiro na faixa verde: alto demais, o pneu patina; baixo, o carro morre.");
  }
  $("arvore").querySelectorAll("i").forEach((el, i) => { el.className = i < 3 ? (corrida.luzes > i && corrida.luzes < 4 ? "ambar" : "") : corrida.luzes >= 4 ? "verde" : ""; });
  arvoreLuzes.forEach((m, i) => m.material.color.setHex(i < 3 ? (corrida.luzes > i && corrida.luzes < 4 ? 0xffb21c : 0x2a2a2a) : corrida.luzes >= 4 ? 0x3dff7a : 0x2a2a2a).multiplyScalar(i < 3 ? (corrida.luzes > i && corrida.luzes < 4 ? 4 : 1) : corrida.luzes >= 4 ? 4 : 1));
  document.body.classList.toggle("nitro", j.nitroOn && gasHeld && j.nitro > 0 && corrida.fase === "corrida");
}

// ---------- Eventos da lógica ----------
function tratarEventos() {
  for (const e of corrida.eventos.splice(0)) {
    if (e.tipo === "luz") audio.blip(450, 0.14);
    else if (e.tipo === "vai") { audio.blip(880, 0.3); setPhase("race"); $("preparo").classList.add("hidden"); desenharZonas(false); }
    else if (e.tipo === "largada") {
      const T = { perfeita: ["LARGADA PERFEITA", "verde"], boa: ["BOA LARGADA", "azul"], patinou: ["PATINOU!", "amarelo", "giro alto demais na largada"], fraca: ["LARGADA FRACA", "amarelo", "giro baixo demais na largada"] }[e.qualidade];
      showCallout(T[0], 1.1, T[1], T[2] || "");
    } else if (e.tipo === "vacuo") { showCallout("VÁCUO!", 0.8, "azul", `+N2O`); audio.blip(640, 0.12, "triangle"); }
    else if (e.tipo === "raspao") { batidaVisual(false); showCallout("RASPÃO", 0.5, "amarelo"); }
    else if (e.tipo === "batida") batidaVisual(false);
    else if (e.tipo === "perda-total") {
      if (e.jogador) { batidaVisual(true); showCallout("PERDA TOTAL", 2, "vermelho"); }
      else { const p = corrida.pilotos.find((x) => x.nome === e.nome); audio.batida(false); faiscas(p, 16); if (corrida.fase === "corrida") showCallout(`${e.nome.toUpperCase()}`, 1, "amarelo", "deu perda total"); }
    } else if (e.tipo === "ultrapassagem") audio.blip(560, 0.05, "triangle", 0.04);
  }
}
function faiscas(p, n = 10) {
  if (!p) return; const pos = ponto(-p.x, p.z + 2.2, 0.6);
  for (let i = 0; i < n; i++) soltar("faisca", pos, new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 4, p.speed / 3.6 * 0.6 + (Math.random() - 0.5) * 6), 0.6 + Math.random() * 0.4);
}
function batidaVisual(forte) {
  audio.batida(forte); faiscas(corrida.jogador, forte ? 30 : 10);
  if (!reduced.matches) cameraShake = Math.max(cameraShake, forte ? 0.6 : 0.25);
  $("impact").classList.remove("flash"); void $("impact").offsetWidth; $("impact").classList.add("flash");
}

// ---------- Fim ----------
function encerrar() {
  const r = corrida.resultado;
  gasHeld = nitroHeld = brakeHeld = false;
  if (r.motivo === "motor") { setPhase("blown"); showCallout("MOTOR EXPLODIU", 1.6, "vermelho"); audio.batida(true); fimAte = performance.now() + 1500; }
  else if (r.motivo === "perda-total") { setPhase("totaled"); fimAte = performance.now() + 1900; }
  else { setPhase("finishing"); const pos = r.posicao; showCallout(pos === 1 ? "VITÓRIA!" : `${pos}º LUGAR`, 1.4, pos === 1 ? "verde" : "amarelo"); audio.blip(pos === 1 ? 990 : 520, 0.3); fimAte = performance.now() + 1500; }
  music.stop();
}
function mostrarResultado() {
  const r = corrida.resultado, j = corrida.jogador, tr = TRACKS[selected];
  setPhase("finish"); audio.update({});
  $("hud").classList.add("hidden"); $("touch").classList.add("hidden"); $("finish").classList.remove("hidden");
  document.body.classList.remove("nitro");
  $("finishTrack").textContent = tr.name;
  const ruim = r.motivo !== "chegada";
  $("result").textContent = r.motivo === "motor" ? "MOTOR EXPLODIU" : r.motivo === "perda-total" ? "PERDA TOTAL" : r.posicao === 1 ? "VITÓRIA" : `${r.posicao}º LUGAR`;
  $("result").classList.toggle("ruim", ruim);
  $("resultSub").textContent = r.motivo === "motor" ? "O ponteiro ficou no vermelho tempo demais. Troque a marcha na luz verde." : r.motivo === "perda-total" ? "Bateu de frente. Troque de faixa antes de chegar no carro da frente." : r.posicao === 1 ? "Você dominou a reta." : "A próxima largada já está esperando.";
  $("finalTime").textContent = r.motivo === "chegada" ? timeString(j.chegada) : "—";
  $("finalSpeed").textContent = Math.round(j.velMax);
  $("finalShifts").textContent = `${j.trocas.perfeita} / ${Object.values(j.trocas).reduce((a, b) => a + b, 0)}`;
  $("finalLaunch").textContent = { perfeita: "Perfeita", boa: "Boa", patinou: "Patinou", fraca: "Fraca" }[j.largada] || "—";
  $("finalVacuo").textContent = `+${j.nitroDoVacuo.toFixed(1)} s`;
  $("tabela").innerHTML = r.ordem.map((o, i) => `<tr class="${o.jogador ? "eu" : ""}"><td>${o.fora ? "—" : `${i + 1}º`}</td><td>${o.nome}</td><td>${o.fora ? o.fora.toUpperCase() : o.tempo ? timeString(o.tempo) : "—"}</td></tr>`).join("");
}

// ---------- Desenho de cada quadro ----------
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function acenderEstouro(obj, forte) {
  const ud = obj.userData; if (!ud.estouros) return;
  ud.estouroT = forte ? 0.12 : 0.06;
  for (const sp of ud.estouros) sp.scale.setScalar((forte ? 1.3 : 0.7) * (0.8 + Math.random() * 0.4));
}
// o pneu canta na curva quando a força para fora passa do ponto
function curvaChiado(p) { const lateral = Math.abs((p.speed / 3.6) ** 2 * (inclin(p.z + 2) - inclin(p.z - 2)) / 4); return clamp((lateral - 7) / 9, 0, 0.8); }
function posicionarCarro(obj, p, dt, t) {
  const s = -p.x;
  ponto(s, p.z, 0.02, obj.position);
  const ud = obj.userData, corpo = ud.corpo;
  let yaw = yawEm(p.z);
  if (p.kind === "piloto") {
    yaw += -(LANE_X[p.targetLane] - p.x) * 0.035;
    const acel = ud.vAnt === undefined ? 0 : (p.speed - ud.vAnt) / Math.max(dt, 1e-3); ud.vAnt = p.speed;
    ud.pitch = (ud.pitch || 0) + (clamp(-acel * 0.0016, -0.04, 0.05) - (ud.pitch || 0)) * Math.min(1, dt * 6);
    corpo.rotation.x = ud.pitch;
    // na curva o carro esterça sozinho e a carroceria deita um pouco para fora
    const lateral = (p.speed / 3.6) ** 2 * (inclin(p.z + 2) - inclin(p.z - 2)) / 4;
    ud.roll = (ud.roll || 0) + (clamp(lateral * 0.0035, -0.07, 0.07) - (ud.roll || 0)) * Math.min(1, dt * 5);
    if (!p.totaled) corpo.rotation.z = ud.roll;
    if (p.totaled) {
      const k = p.foraT || 0;
      corpo.rotation.y = Math.min(1, k) * (p.lane % 2 ? 1.9 : -1.6);
      corpo.rotation.z = Math.sin(Math.min(1, k) * Math.PI) * 0.35;
      obj.position.y = k > 1.4 && p !== corrida.jogador ? -Math.min(3, (k - 1.4) * 2) : 0.02;
    }
    const usando = p.nitroOn && p.nitro > 0 && (p === corrida.jogador ? gasHeld : true) && corrida.fase !== "fim" && !p.totaled;
    for (const c of ud.chamas) { c.visible = usando; if (usando) c.scale.set(1, 1, 0.7 + Math.random() * 0.8); }
    frear(obj, !p.totaled && (p === corrida.jogador ? brakeHeld : p.freio));
    // os rivais também estouram na troca de marcha
    if (p !== corrida.jogador && ud.marcha !== undefined && p.gear > ud.marcha) acenderEstouro(obj, Math.random() < 0.4);
    ud.marcha = p.gear;
    ud.estouroT = Math.max(0, ud.estouroT - dt);
    for (const sp of ud.estouros || []) sp.visible = ud.estouroT > 0;
    if (ud.neon) ud.neon.material.opacity = p.totaled ? 0.2 : 0.8 + Math.sin(t * 0.004 + p.z) * 0.1;
    // fumaça dos pneus no aquecimento e quando o carro patina
    const preparo = corrida.fase === "aquecimento" || corrida.fase === "luzes";
    const patina = preparo ? p.rpm > 0.45 : p.grip < 0.93 && p.speed < 130 && corrida.fase === "corrida";
    if (patina && Math.random() < (preparo ? 0.55 : 0.4)) for (const lado of [-1, 1]) {
      ponto(s + lado * 0.85, p.z - 1.35, 0.3, _v);
      soltar("fumaça", _v, _v2.set((Math.random() - 0.5) * 1.5, 0.6, -2 - Math.random() * 2 + (preparo ? 0 : p.speed / 3.6 * 0.7)), 1.3, 1.1);
    }
  }
  obj.rotation.y = yaw;
  for (const r of ud.rodas || []) r.rotation.x += (p.speed / 3.6) * dt / 0.35;
}
function quadroVisual(dt, t) {
  if (!corrida) return;
  for (const [p, obj] of visual) {
    const longe = p.z - corrida.jogador.z;
    obj.visible = longe > -80 && longe < 520;
    if (obj.visible) posicionarCarro(obj, p, dt, t);
  }
  const pisca = Math.sin(t * 0.012) > 0;
  for (const { obj } of obstaculosVis) obj.traverse((o) => { if (o.userData.pisca) o.visible = pisca; });
  // cones: quem passa por cima joga longe
  for (const c of cones) {
    if (!c.voando) {
      for (const p of corrida.pilotos) if (Math.abs(p.z - c.z) < 2.6 && Math.abs(-p.x - c.s) < 1.3 && p.speed > 20) { c.voando = { v: new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 3, p.speed / 3.6 * 0.8), giro: Math.random() * 10 }; audio.blip(300, 0.05, "triangle", 0.04); break; }
    } else if (c.obj.position.y > -1) {
      c.voando.v.y -= 12 * dt; c.obj.position.addScaledVector(c.voando.v, dt); c.obj.rotation.x += c.voando.giro * dt;
    }
  }
  for (const sp of placasDinamicas) {
    const d = sp.userData.contramao; d.z -= d.v * dt; if (d.z < corrida.jogador.z - 60) d.z += 600;
    ponto(d.s, d.z, 0.8, sp.position);
  }
}
// Qualidade automática: medindo 2 s de quadros, desliga o brilho e depois baixa a resolução (guardado no navegador).
let qualidade = LEVE ? 2 : (() => { try { return +localStorage.getItem("drag:qualidade") || 0; } catch { return 0; } })();
let janelaQ = { t: 0, n: 0 };
function aplicarQualidade() {
  usarBloom = qualidade === 0;
  pixelRatio = Math.min(devicePixelRatio || 1, [1.5, 1, 0.75, 0.5][qualidade]);
  renderer.setPixelRatio(pixelRatio); resize();
}
function ajustarQualidade(dt) {
  if (dt <= 0 || document.hidden) return;
  janelaQ.t += dt; janelaQ.n++;
  if (janelaQ.t < 2) return;
  const media = janelaQ.t / janelaQ.n; janelaQ = { t: 0, n: 0 };
  if (media > 1 / 30 && qualidade < 3) {
    qualidade++; aplicarQualidade();
    try { localStorage.setItem("drag:qualidade", String(qualidade)); } catch {}
  }
}
function camera3d(dt, t) {
  const j = corrida ? corrida.jogador : null;
  if (!j) { garagem.camera(camera, dt, t, reduced.matches); return; } // no lobby: a volta em torno do carro na garagem
  const v = j.speed / 300, s = -j.x;
  const preparo = corrida.fase === "aquecimento" || corrida.fase === "luzes";
  const nitro = document.body.classList.contains("nitro");
  // de dentro: o olho no banco do motorista, preso ao carro (balança junto quando ele empina na arrancada)
  const eu = visual.get(j);
  if (luzPainel) luzPainel.intensity = camInterna ? 0.8 : 0;
  if (eu) for (const sp of eu.userData.farois || []) sp.visible = !camInterna; // o brilho do farol não vaza pelo capô
  if (camInterna && eu && corrida.fase !== "aquecimento") {
    const b = eu.userData.banco, corpo = eu.userData.corpo;
    eu.updateMatrixWorld(true);
    corpo.localToWorld(camera.position.copy(b));
    const tremor = reduced.matches ? 0 : cameraShake * 0.12 + (nitro ? 0.008 : 0) + Math.max(0, v - 0.6) * 0.006;
    if (tremor) camera.position.add(_v2.set((Math.random() - 0.5) * tremor, (Math.random() - 0.5) * tremor, 0));
    cameraShake = Math.max(0, cameraShake - dt);
    camera.lookAt(corpo.localToWorld(olhar.set(b.x * 0.85, b.y - 0.1, b.z + 14)));
    if (camera.near !== 0.04) camera.near = 0.04;
    const fovIn = 66 + (reduced.matches ? 0 : v * 12 + (nitro ? 5 : 0));
    camera.fov += (fovIn - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    primeiroQuadro = true;
    ponto(s, j.z + 1.8, 0.75, farol.position); ponto(s * 0.9, j.z + 26, 0, farol.target.position);
    return;
  }
  if (camera.near !== 0.2) camera.near = 0.2;
  let alvo;
  if (preparo && !reduced.matches) {
    // na largada, a câmera dá a volta no carro até ficar atrás dele
    const k = corrida.fase === "aquecimento" ? clamp(corrida.t / L.AQUECIMENTO, 0, 1) : 1;
    // começa na frente do carro e passa por cima do ombro (os vizinhos estão a uma faixa de distância)
    const ang = (1 - k * k * (3 - 2 * k)) * 180 * D;
    alvo = ponto(s + Math.sin(ang) * 2.2, j.z - Math.cos(ang) * 6.4, 1.6 + Math.sin(ang) * 1.6, _v);
  } else alvo = ponto(s * 0.8, j.z - (6.1 - v * 0.9), 1.72 - v * 0.15, _v);
  if (primeiroQuadro) { follow.copy(alvo); primeiroQuadro = false; }
  follow.lerp(alvo, Math.min(1, dt * (preparo ? 4 : 8)));
  camera.position.copy(follow);
  cameraShake = Math.max(0, cameraShake - dt);
  const tremor = reduced.matches ? 0 : cameraShake * 0.5 + (nitro ? 0.035 : 0) + Math.max(0, v - 0.6) * 0.03;
  if (tremor) camera.position.add(_v2.set((Math.random() - 0.5) * tremor, (Math.random() - 0.5) * tremor, 0));
  camera.lookAt(ponto(s * (preparo ? 1 : 0.55), j.z + (preparo ? 0.4 : 13), preparo ? 0.8 : 1.05, olhar));
  const fov = 60 + (reduced.matches ? 0 : v * 20 + (nitro ? 7 : 0));
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
  // o farol do carro
  ponto(s, j.z + 1.8, 0.75, farol.position); ponto(s * 0.9, j.z + 26, 0, farol.target.position);
}

function frame(t) { requestAnimationFrame(frame); quadro(t); }
function quadro(t) {
  const dt = Math.min(0.25, (t - (last || t)) / 1000); ultimoT = last; last = t;
  if (corrida && corrida.pronta === false) {
    // preparando a largada (aquecer): nada anda ainda
  } else if (corrida && corrida.fase !== "fim") {
    // No preparo o relógio anda em tempo real mesmo com poucos quadros; na corrida, no máximo 0,25 s por quadro.
    let resto = corrida.fase === "corrida" ? dt : Math.min(1, (t - (ultimoT || t)) / 1000);
    while (resto > 0 && corrida.fase !== "fim") {
      const passo = Math.min(0.02, resto); resto -= passo;
      L.passoCorrida(corrida, passo, { gas: gasHeld, nitro: nitroHeld, freio: brakeHeld });
    }
    const fase = corrida.fase === "aquecimento" ? "burnout" : corrida.fase === "luzes" ? "countdown" : null;
    if (fase && phase !== fase) setPhase(fase);
    tratarEventos();
    if (corrida.fase === "fim") encerrar();
    updateHud();
  } else if (corrida && fimAte) {
    tratarEventos();
    // depois do fim, os outros seguem andando enquanto a cena termina
    for (const p of corrida.pilotos) if (!p.totaled && !p.engineBlown) p.z += p.speed / 3.6 * dt;
    for (const p of corrida.pilotos) if (p.totaled) { p.foraT = (p.foraT || 0) + dt; p.speed = Math.max(0, p.speed - 95 * dt); p.z += p.speed / 3.6 * dt; }
    for (const tr of corrida.trafego) tr.z += tr.speed / 3.6 * dt;
    const j = corrida.jogador;
    if (j.engineBlown) { j.speed = Math.max(0, j.speed - 30 * dt); j.z += j.speed / 3.6 * dt; if (Math.random() < 0.7) soltar("fumaça", ponto(-j.x, j.z + 1.6, 1.1), new THREE.Vector3((Math.random() - 0.5), 2.5, j.speed / 3.6 * 0.5), 1.6, 1.4); }
    updateHud();
    if (performance.now() >= fimAte) { fimAte = 0; mostrarResultado(); }
  }
  if (performance.now() / 1000 > messageUntil && $("callout").textContent) showCallout("", 0);
  ajustarQualidade(dt);
  quadroVisual(dt, t);
  passoParticulas(dt);
  camera3d(dt, t);
  if (ceu) ceu.position.copy(camera.position);
  if (corrida) {
    const j = corrida.jogador, vivo = phase === "race" || phase === "burnout" || phase === "countdown";
    const rival = corrida.pilotos.slice(1).reduce((b, r) => !b || Math.abs(r.z - j.z) < Math.abs(b.z - j.z) ? r : b, null);
    audio.update({ speed: j.speed, rpm: j.rpm, active: vivo, cut: j.shiftCut > 0, rival, distRival: rival ? Math.hypot(rival.z - j.z, (rival.x - j.x) * 2) : 1e9,
      gas: gasHeld, chiado: corrida.fase === "corrida" ? Math.max(clamp((1 - j.grip) * 3, 0, 1) * (gasHeld ? 1 : 0), curvaChiado(j)) : (gasHeld && j.rpm > 0.45 ? 0.6 : 0), nitro: document.body.classList.contains("nitro"), dt });
  }
  if (usarBloom) composer.render(); else renderer.render(scene, camera);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
// ---------- Garagem ----------
const garagem = criarGaragem({ scene, pmrem, fotoNoitePronta, aplicarAmbiente, canvasTex, TEX, placa, brilhoMat, aditivo, carroProcedural, soltarCarro,
  remontar: () => { if (readyModel) garagem.mostrarCarro(importedCar(readyModel, selectedCar, visualDe(selectedCar, L.CARROS[selectedCar].neon))); } });
function voltarGaragem() {
  if (world) world.visible = false;
  limparCarros(); limparParticulas(); corrida = null; fimAte = 0; music.stop(); audio.update({});
  setPhase("menu"); document.body.classList.remove("nitro");
  $("finish").classList.add("hidden"); $("hud").classList.add("hidden"); $("touch").classList.add("hidden"); $("menu").classList.remove("hidden");
  garagem.mostrar();
}
$("garage").onclick = voltarGaragem;
addEventListener("resize", resize); aplicarQualidade();
voltarGaragem(); prepareCar(); garagem.mostrarFicha(selectedCar);
// #debug: o teste mexe no jogo por aqui (`quadro(ms)` desenha um quadro na mão, para quando a aba não anima sozinha)
if (DEBUG) window.__drag = { get corrida() { return corrida; }, get phase() { return phase; }, L, scene, renderer, garagem, get world() { return world; }, set bloom(v) { usarBloom = v; }, quadro: (ms = 16) => quadro((last || 0) + ms) };
requestAnimationFrame(frame);
