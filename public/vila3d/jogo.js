// Protótipo da Vila em 3D: as coordenadas vêm de dados.js (1 casa do mapa = 1 unidade; x para a direita, z para baixo).
// Os modelos são do KayKit City Builder Bits (CC0): cada módulo mede 2x2 casas.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const D = window.VILA3D_DADOS;
const VW = 58, VH = 52;
const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86c6f0);
scene.fog = new THREE.Fog(0x86c6f0, 90, 190);
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 400);
camera.position.set(VW / 2 + 22, 48, VH / 2 + 52);
const ctl = new OrbitControls(camera, renderer.domElement);
ctl.target.set(VW / 2, 0, VH / 2 - 2);
ctl.maxPolarAngle = Math.PI * 0.47;
ctl.minDistance = 8; ctl.maxDistance = 120;
ctl.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xdff1ff, 0x7a9a5a, 1.1));
const sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
sol.position.set(VW / 2 - 40, 70, VH / 2 + 35);
sol.target.position.set(VW / 2, 0, VH / 2);
sol.castShadow = true;
sol.shadow.mapSize.set(q.has("leve") ? 1024 : 4096, q.has("leve") ? 1024 : 4096);
Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 40, bottom: -40, near: 10, far: 180 });
sol.shadow.bias = -0.0004;
scene.add(sol, sol.target);

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...o });
const caixa = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
function plano(x0, y0, w, h, cor, alt = 0) { // um retângulo de chão, em casas
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(cor));
  m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, alt, y0 + h / 2); m.receiveShadow = true; scene.add(m); return m;
}

// ---------- os modelos ----------
const NOMES = ["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => "building_" + l + "_withoutBase").concat([
  "road_straight", "road_straight_crossing", "road_corner", "road_junction", "road_tsplit", "streetlight", "bench", "bush", "firehydrant",
  "car_hatchback", "car_police", "car_sedan", "car_stationwagon", "car_taxi", "watertower", "trafficlight_A", "trash_A"]);
const M = {};
const gl = new GLTFLoader();
await Promise.all(NOMES.map((n) => gl.loadAsync("kaykit/" + n + ".gltf").then((g) => {
  g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
  M[n] = g.scene;
})));
const usa = (n, x, z, giro = 0, esc = 1) => { const o = M[n].clone(true); o.position.set(x, 0, z); o.rotation.y = giro; o.scale.setScalar(esc); scene.add(o); return o; };

// ---------- o chão ----------
plano(-60, -60, VW + 120, VH + 120, 0x5fa04e, -0.02); // grama, até longe
plano(0, 0, VW, VH, 0x6cb35a, -0.01);
plano(2, 17, VW - 4, 11, 0xd9cfb8, 0.005); // a Praça (pedra portuguesa)
for (const y of [35, 43]) plano(2, y, 26, 2, 0xb8553a, 0.01); // a pista de atletismo da Vila Esportiva
for (const t of D.terrenos) plano(t.x, t.y, t.w, t.h, 0x9b7a52, 0.01);

// ---------- as ruas (módulos de 2x2; as células começam em x par e y ímpar) ----------
const ehRua = (x, y) => (y >= 7 && y <= 8 && x >= 0 && x <= 57) || (y >= 15 && y <= 16 && x >= 2 && x <= 55)
  || (x >= 28 && x <= 29 && ((y >= 9 && y <= 14) || y >= 28)) || ((y >= 35 && y <= 36 || y >= 43 && y <= 44) && x >= 28 && x <= 55);
const celula = (x0, y0) => ehRua(x0, y0) || ehRua(x0 + 1, y0) || ehRua(x0, y0 + 1) || ehRua(x0 + 1, y0 + 1);
// quanto girar cada peça para ficar com a abertura certa (calibrado olhando a cena)
const GIRO = { reta: 0, T: { N: 0, E: 0, S: 0, W: 0 } };
for (let y0 = 1; y0 < VH + 2; y0 += 2) for (let x0 = 0; x0 < VW; x0 += 2) {
  if (!celula(x0, y0)) continue;
  const N = celula(x0, y0 - 2), S = celula(x0, y0 + 2), L = celula(x0 + 2, y0), O = celula(x0 - 2, y0);
  const n = N + S + L + O, cx = x0 + 1, cz = y0 + 1;
  if (n === 4) usa("road_junction", cx, cz);
  else if (n === 3) { // T: a abertura que falta diz o giro
    const falta = !N ? "N" : !S ? "S" : !L ? "E" : "W";
    usa("road_tsplit", cx, cz, GIRO.T[falta]);
  } else usa("road_straight", cx, cz, (L || O) && !(N || S) ? Math.PI / 2 + GIRO.reta : GIRO.reta);
}

// ---------- os prédios: uma grade de módulos esticada para caber na planta ----------
const alvos = [];
const letreiro = (texto, cor) => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const g = c.getContext("2d"); g.fillStyle = "#0d1022"; g.beginPath(); g.roundRect(4, 4, 504, 120, 24); g.fill(); g.strokeStyle = cor; g.lineWidth = 10; g.stroke();
  g.fillStyle = "#fff"; g.font = "bold 64px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false })); s.scale.set(4, 1, 1); s.renderOrder = 10; return s;
};
const hash = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
for (const j of D.jogos) {
  const g = new THREE.Group(); g.userData.jogo = j;
  const nx = Math.ceil(j.w / 2), nz = Math.ceil(j.h / 2), sx = j.w / (2 * nx), sz = j.h / (2 * nz);
  const tipo = "building_" + "ABCDEFGH"[hash(j.id) % 8] + "_withoutBase";
  let alto = 0;
  const caixaModelo = new THREE.Box3().setFromObject(M[tipo]); alto = caixaModelo.max.y;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const m = M[tipo].clone(true); m.scale.set(sx, 1.35, sz);
    m.position.set(-j.w / 2 + sx + i * 2 * sx, 0, -j.h / 2 + sz + k * 2 * sz); g.add(m);
  }
  const h = alto * 1.35;
  const telhado = caixa(j.w + 0.1, 0.25, j.h + 0.1, mat(j.telhado)); telhado.position.y = h + 0.1; g.add(telhado);
  const porta = j.portas[0] + 0.5 - (j.x + j.w / 2);
  const toldo = caixa(Math.max(1.6, j.portas.length * 1.2), 0.18, 0.9, mat(j.telhado)); toldo.position.set(porta, 1.0, j.h / 2 + 0.35); g.add(toldo);
  const placa = letreiro(j.sinal || j.nome, j.telhado); placa.position.set(porta, h + 1.3, j.h / 2 + 0.3); g.add(placa);
  g.position.set(j.x + j.w / 2, 0, j.y + j.h / 2); scene.add(g); alvos.push(g);
}

// ---------- o resto: chafariz, telão, terrenos, postes, bancos, árvores, cerca viva ----------
const f = D.fonte;
const bacia = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.5, 24), mat(0xcfc9ba)); bacia.position.set(f.x + f.w / 2, 0.25, f.y + f.h / 2); bacia.castShadow = bacia.receiveShadow = true;
const agua = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.1, 24), mat(0x4fb4e8, { roughness: 0.2 })); agua.position.set(f.x + f.w / 2, 0.52, f.y + f.h / 2);
const jato = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.6, 8), mat(0xbfe6fb)); jato.position.set(f.x + f.w / 2, 1.3, f.y + f.h / 2);
scene.add(bacia, agua, jato);
const tl = D.telao;
const tela = caixa(tl.w, 3, 0.3, mat(0x10142b, { emissive: 0x1d3bff, emissiveIntensity: 0.6 })); tela.position.set(tl.x + tl.w / 2, 3.2, tl.y + 0.5); scene.add(tela);
for (const dx of [0.5, tl.w - 0.5]) { const p = caixa(0.3, 2, 0.3, mat(0x444)); p.position.set(tl.x + dx, 1, tl.y + 0.5); scene.add(p); }
for (const t of D.terrenos) for (let i = 0; i < t.w; i++) { const c = caixa(0.7, 0.5, 0.1, mat(0x8a6a3c)); c.position.set(t.x + i + 0.5, 0.3, t.y + t.h - 0.1); scene.add(c); }
for (const [x, y] of D.postes) usa("streetlight", x + 0.5, y + 0.5, 0, 1.6);
for (const [x, y] of D.bancos) usa("bench", x + 0.5, y + 0.5, 0, 2);
for (const [x, y] of D.arvores) usa("bush", x + 0.5, y + 0.5, (x * 7 + y) % 6, 5);
for (let x = 0; x < VW; x++) for (const y of [0.5, 1.5, VH - 1.5, VH - 0.5]) if (!ehRua(x, y | 0) && !(x >= 28 && x <= 29)) usa("bush", x + 0.5, y, (x * 3) % 6, 5);
for (let y = 2; y < VH - 2; y++) for (const x of [0.5, 1.5, VW - 1.5, VW - 0.5]) if (!ehRua(x | 0, y)) usa("bush", x, y + 0.5, (y * 3) % 6, 5);

// ---------- carros rodando pelas ruas ----------
const rotas = [[0, 8, 57, 8, 1], [57, 7, 0, 7, -1], [2, 16, 55, 16, 1], [55, 15, 2, 15, -1], [30, 36, 55, 36, 1], [55, 35, 30, 35, -1]];
const carros = [];
const tiposCarro = ["car_hatchback", "car_police", "car_sedan", "car_stationwagon", "car_taxi"];
rotas.forEach(([x0, z0, x1, z1], i) => {
  for (let k = 0; k < 2; k++) {
    const c = M[tiposCarro[(i + k) % 5]].clone(true); c.scale.setScalar(3.4);
    const base = -new THREE.Box3().setFromObject(c).min.y + 0.1; // o modelo tem a origem no meio: sobe até a pista (a pista tem 0,1 de espessura) c.rotation.y = x1 > x0 ? Math.PI / 2 : -Math.PI / 2; scene.add(c);
    carros.push({ c, base, x0, z0: z0 + 0.5, x1, v: 3 + (i % 3), t: k * 0.5 });
  }
});

// ---------- tocar num prédio ----------
const ray = new THREE.Raycaster(), p = new THREE.Vector2();
let comeco = null;
renderer.domElement.addEventListener("pointerdown", (e) => { comeco = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!comeco || Math.hypot(e.clientX - comeco[0], e.clientY - comeco[1]) > 6) return;
  p.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(p, camera);
  const h = ray.intersectObjects(alvos, true)[0];
  let o = h && h.object; while (o && !o.userData.jogo) o = o.parent;
  if (!o) { $("cartao").style.display = "none"; return; }
  $("cNome").textContent = o.userData.jogo.nome; $("cIr").href = o.userData.jogo.url; $("cartao").style.display = "block";
});

function ajustar() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", ajustar); ajustar();
const relogio = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(relogio.getDelta(), 0.1), t = relogio.elapsedTime;
  for (const c of carros) { c.t = (c.t + dt * c.v / Math.abs(c.x1 - c.x0)) % 1; c.c.position.set(c.x0 + (c.x1 - c.x0) * c.t, c.base, c.z0); }
  jato.scale.y = 1 + Math.sin(t * 3) * 0.15;
  ctl.update(); renderer.render(scene, camera);
});
$("carregando").remove();
window.__vila3d = { camera, ctl, scene, M, carros };

// ---------- música ambiente (public/vila3d/musica/): 5% do volume, toca sozinha e passa para a próxima ----------
const VOLUME = 0.05;
let mudo = false;
try { mudo = localStorage.getItem("vila3d:mudo") === "1"; } catch (e) { /* sem armazenamento */ }
const botao = document.createElement("button");
botao.id = "musica"; botao.type = "button";
document.body.appendChild(botao);
fetch("/api/musicas-vila3d").then((r) => r.json()).then((lista) => {
  if (!lista.length) { botao.remove(); return; }
  let i = 0;
  const audio = new Audio(lista[0].url); audio.volume = VOLUME; audio.muted = mudo;
  audio.addEventListener("ended", () => { i = (i + 1) % lista.length; audio.src = lista[i].url; audio.play().catch(() => {}); });
  const pintar = () => { botao.textContent = mudo ? "🔇" : "🔊"; botao.title = mudo ? "Ligar a música" : "Silenciar a música"; };
  const tocar = () => audio.play().then(() => { for (const ev of ["pointerdown", "keydown"]) removeEventListener(ev, tocar); }).catch(() => {}); // o navegador pode recusar sem toque na página: tenta de novo no primeiro toque
  botao.addEventListener("click", (e) => {
    e.stopPropagation(); mudo = !mudo; audio.muted = mudo; pintar();
    try { localStorage.setItem("vila3d:mudo", mudo ? "1" : "0"); } catch (err) { /* sem armazenamento */ }
    if (!mudo) audio.play().catch(() => {});
  });
  pintar(); tocar();
  for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, tocar);
}).catch(() => botao.remove());
