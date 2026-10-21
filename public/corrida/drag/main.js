import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LANE_X, TOP_SPEEDS, PERFECT_MIN, PERFECT_MAX, ENGINE_LIMIT_SECONDS, makeCar, requestLane, shift, stepCar, clamp } from "./logic.mjs";

const $ = (id) => document.getElementById(id);
const TRACKS = [
  { id: "porto", name: "Porto à noite", detail: "Contêineres e asfalto molhado", length: 1400, sky: 0x071827, skyImage: "tokyo", fog: 0x102c3b, road: 0x202b33, ground: 0x182c38, accent: 0x30c6d8, swatch: "#07566a", sun: 0x70c9e0 },
  { id: "deserto", name: "Estrada do sol", detail: "Horizonte aberto e poeira quente", length: 1600, sky: 0xe7a969, skyImage: "deserto", fog: 0xd0a074, road: 0x464748, ground: 0xb68c62, accent: 0xffdb88, swatch: "#b87345", sun: 0xffdfaa },
  { id: "cidade", name: "Anel industrial", detail: "Concreto e neblina", length: 1200, sky: 0x6b7c8a, skyImage: "losangeles", fog: 0x788892, road: 0x343940, ground: 0x58656b, accent: 0xffac4f, swatch: "#555d69", sun: 0xe4edf1 },
];
const CARS = [
  { id: "supra", name: "Toyota Supra MK IV" },
  { id: "skyline-r33", name: "Nissan Skyline R33" },
  { id: "bmw-m4", name: "BMW M4 G82" },
  { id: "porsche-911", name: "Porsche 911 Carrera 4S" },
  { id: "porsche-718", name: "Porsche 718 Cayman GT4" },
  { id: "ferrari-sf90", name: "Ferrari SF90 XX" },
];
let selected = 0, phase = "menu", player = makeCar(), rivals = [], world = null, visualCars = [], elapsed = 0, countdown = 0, countdownEnd = 0, last = 0, messageUntil = 0, cameraShake = 0;
let gasHeld = false, blowUntil = 0, burst = [];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const loader = new GLTFLoader(), modelCache = new Map(), skyCache = new Map();
let readyModel = null, selectedCar = CARS[0].id;

$("carSelect").innerHTML = CARS.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
$("carSelect").onchange = () => { selectedCar = $("carSelect").value; prepareCar(); };
function prepareCar() {
  const id = selectedCar;
  readyModel = null; $("start").disabled = true; $("carStatus").textContent = "Carregando modelo...";
  if (!modelCache.has(id)) modelCache.set(id, loader.loadAsync(`/corrida/drag/models/${id}.glb`));
  modelCache.get(id).then((gltf) => {
    if (selectedCar !== id) return;
    readyModel = gltf.scene; $("carStatus").textContent = "Modelo pronto"; $("start").disabled = false;
  }).catch((error) => {
    console.warn("Drag: modelo não carregou", id, error);
    modelCache.delete(id);
    if (selectedCar === id) { $("carStatus").textContent = "Modelo indisponível; carro provisório"; $("start").disabled = false; }
  });
}
prepareCar();

for (const [i, tr] of TRACKS.entries()) {
  const b = document.createElement("button"); b.className = `track ${i === 0 ? "selected" : ""}`; b.style.setProperty("--swatch", tr.swatch);
  b.innerHTML = `<small>PISTA ${String(i + 1).padStart(2, "0")} / ${tr.length} M</small><strong>${tr.name}</strong><span>${tr.detail}</span>`;
  b.onclick = () => { selected = i; document.querySelectorAll(".track").forEach((x, n) => x.classList.toggle("selected", n === i)); buildWorld(); };
  $("tracks").append(b);
}
const rpmPath = $("rpmBase"), rpmLength = rpmPath.getTotalLength(), svgNS = "http://www.w3.org/2000/svg";
for (let i = 0; i <= 10; i++) {
  const p = rpmPath.getPointAtLength(rpmLength * i / 10);
  const tick = document.createElementNS(svgNS, "line");
  tick.setAttribute("x1", p.x - 9); tick.setAttribute("y1", p.y); tick.setAttribute("x2", p.x + 9); tick.setAttribute("y2", p.y);
  tick.setAttribute("stroke", i >= 9 ? "#ff515b" : "white"); tick.setAttribute("stroke-width", i % 2 ? "2" : "3"); $("rpmTicks").append(tick);
  const label = document.createElementNS(svgNS, "text"); label.setAttribute("x", p.x + 17); label.setAttribute("y", p.y + 6); label.textContent = i; $("rpmTicks").append(label);
}
$("rpmFill").style.strokeDasharray = `0 ${rpmLength}`;

const renderer = new THREE.WebGLRenderer({ canvas: $("view"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 460);
const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2930, 1.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(-30, 90, 80); scene.add(sun);
const follow = new THREE.Vector3();
const mat = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12, ...opt });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function cube(parent, w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(boxGeo, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function wheel(parent, x, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.34, 10), mat(0x0a1014));
  mesh.rotation.z = Math.PI / 2; mesh.position.set(x, 0.62, z); parent.add(mesh); return mesh;
}
function carModel(primary, stripe) {
  const g = new THREE.Group(), body = mat(primary, { metalness: 0.4, roughness: 0.38 }), dark = mat(0x101820, { metalness: 0.25 }), glass = mat(0x142f3e, { metalness: 0.48, roughness: 0.18 }), detail = mat(stripe, { metalness: 0.3 }), red = mat(0xff202f, { emissive: 0xcc0b15, emissiveIntensity: 1.2 }), white = mat(0xe9f8ff, { emissive: 0xa5d7ec, emissiveIntensity: 0.8 });
  cube(g, 2.35, 0.7, 4.7, 0, 0.65, 0, body);
  cube(g, 1.8, 0.72, 2.05, 0, 1.26, -0.2, glass);
  cube(g, 1.83, 0.12, 2.1, 0, 1.65, -0.2, body);
  cube(g, 1.32, 0.05, 3.95, 0, 1.02, 0.08, detail);
  cube(g, 2.35, 0.18, 0.35, 0, 0.41, -2.13, dark);
  for (const x of [-1.14, 1.14]) {
    for (const z of [-1.47, 1.45]) wheel(g, x, z);
    cube(g, 0.52, 0.23, 0.08, x * 0.69, 0.82, -2.37, red);
    cube(g, 0.46, 0.17, 0.08, x * 0.72, 0.86, 2.37, white);
  }
  return g;
}
function roadside(parent, tr, z, side, n, materials) {
  const x = side * (15 + (n * 37 % 18)), kind = tr.id;
  if (kind === "porto") {
    const c = materials.containers[n % materials.containers.length];
    cube(parent, 10, 3, 5, x, 1.55, z, c);
    if (n % 3 === 0) cube(parent, 10, 3, 5, x, 4.65, z + 1, materials.containers[(n + 2) % materials.containers.length]);
  } else if (kind === "deserto") {
    const h = 2 + (n * 17 % 6);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(h, 0), materials.rock); rock.position.set(x, h * .32, z); rock.scale.set(1.2, .45, 1.3); parent.add(rock);
  } else {
    const h = 6 + (n * 13 % 14);
    cube(parent, 9, h, 9, x, h / 2, z, materials.building);
    if (n % 3 === 0) cube(parent, 9.3, .18, 9.3, x, h + .2, z, materials.accent);
  }
}
function buildWorld() {
  if (world) { scene.remove(world); disposeGroup(world); }
  const tr = TRACKS[selected]; world = new THREE.Group(); scene.add(world);
  scene.background = new THREE.Color(tr.sky); scene.fog = new THREE.Fog(tr.fog, tr.id === "deserto" ? 110 : 95, tr.id === "deserto" ? 430 : 340);
  if (!skyCache.has(tr.skyImage)) skyCache.set(tr.skyImage, new THREE.TextureLoader().loadAsync(`/corrida/ceus/${tr.skyImage}.jpg`).then((tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace; return tex; }));
  skyCache.get(tr.skyImage).then((tex) => { if (TRACKS[selected] === tr) scene.background = tex; }).catch(() => {});
  sun.color.setHex(tr.sun); hemi.color.setHex(tr.sun);
  const asphalt = mat(tr.road, { roughness: tr.id === "porto" ? .36 : .88 }), ground = mat(tr.ground), white = mat(tr.id === "porto" ? 0xc1e2e7 : 0xe7ddd0), edge = mat(tr.accent, { emissive: tr.id === "porto" ? tr.accent : 0x000000, emissiveIntensity: .25 }), rail = mat(0x74828b, { metalness: .65 }), dark = mat(0x293640);
  const mats = { accent: edge, rock: mat(0x9b7456), building: mat(0x48535b), concrete: mat(tr.id === "porto" ? 0x687575 : 0x83898a), containers: [mat(0x237588), mat(0x8f4f48), mat(0x567c72), mat(0x9d7851)] };
  cube(world, 1000, .12, tr.length + 520, 0, -.19, tr.length / 2, ground);
  cube(world, 14.8, .11, tr.length + 210, 0, -.05, tr.length / 2 + 5, asphalt);
  for (const side of [-1, 1]) {
    cube(world, .25, .04, tr.length + 210, side * 7.15, .02, tr.length / 2 + 5, edge);
    cube(world, .22, .5, tr.length + 210, side * 9, .36, tr.length / 2 + 5, rail);
    if (tr.id !== "deserto") {
      cube(world, .62, tr.id === "porto" ? 2.7 : 3.5, tr.length + 210, side * 8.25, tr.id === "porto" ? 1.35 : 1.75, tr.length / 2 + 5, mats.concrete);
      cube(world, .85, .25, tr.length + 210, side * 8.25, tr.id === "porto" ? 2.78 : 3.55, tr.length / 2 + 5, dark);
    }
    for (let z = -40; z < tr.length + 80; z += 14) {
      cube(world, 1.1, .43, .3, side * 9, .52, z, dark);
      if (z % 28 === 2) cube(world, .6, .07, 1.5, side * 7.45, .035, z, edge);
    }
  }
  for (const x of [-2.2, 2.2]) for (let z = -28; z < tr.length + 20; z += 13) cube(world, .12, .015, 5.5, x, .019, z, white);
  for (let x = -7; x <= 7; x += 1.65) cube(world, 1.12, .024, 2.5, x, .035, tr.length, x % 3 > 1 ? white : dark);
  for (let z = 0, n = 0; z < tr.length + 190; z += 24, n++) for (const side of [-1, 1]) roadside(world, tr, z, side, n + (side + 1) * 3, mats);
  if (tr.id !== "deserto") for (let z = 220; z < tr.length; z += 380) {
    cube(world, 45, 3, 13, 0, 9, z, mats.concrete);
    for (const side of [-1, 1]) cube(world, 7, 7, 13, side * 22.5, 3.5, z, mats.concrete);
    cube(world, 17, .45, .25, 0, 7.35, z - 6.6, dark);
  }
}

function disposeGroup(group) {
  const mats = new Set(), geometries = new Set();
  group.traverse((obj) => {
    if (obj.material) for (const m of [].concat(obj.material)) mats.add(m);
    if (obj.geometry && obj.geometry !== boxGeo) geometries.add(obj.geometry);
  });
  mats.forEach((m) => m.dispose()); geometries.forEach((g) => g.dispose());
}

function importedCar(source, id) {
  const root = new THREE.Group(), car = source.clone(true);
  root.userData.imported = true;
  if (id === "skyline-r33") car.rotation.y += Math.PI;
  car.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(car), size = bounds.getSize(new THREE.Vector3());
  if (size.x > size.z * 1.1) {
    car.rotation.y += Math.PI / 2;
    car.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(car); size = bounds.getSize(new THREE.Vector3());
  }
  const scale = Math.min(2.35 / size.x, 4.7 / size.z, 2.2 / size.y);
  const center = bounds.getCenter(new THREE.Vector3());
  car.scale.multiplyScalar(scale);
  car.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  root.add(car);
  return root;
}

function makeRivals() {
  for (const v of visualCars) { scene.remove(v); if (!v.userData.imported) disposeGroup(v); }
  rivals = [
    { ...makeCar({ lane: 0, z: 34, speed: 74 }), cruise: 156, color: 0xf2614b },
    { ...makeCar({ lane: 2, z: 86, speed: 91 }), cruise: 176, color: 0xecc458 },
    { ...makeCar({ lane: 1, z: 152, speed: 108 }), cruise: 193, color: 0x74d7dc },
  ];
  visualCars = [readyModel ? importedCar(readyModel, selectedCar) : carModel(0xf4f6f6, 0x4fc8d5), ...rivals.map((r) => carModel(r.color, 0xf6f1e7))];
  visualCars.forEach((v) => scene.add(v));
}

class EngineAudio {
  constructor() { this.on = true; this.ctx = null; }
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      this.ctx = new Ctx(); const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = .42; this.master.connect(c.destination);
      this.motor = c.createGain(); this.motor.gain.value = 0; this.filter = c.createBiquadFilter(); this.filter.type = "lowpass";
      this.motor.connect(this.filter).connect(this.master);
      this.oscs = [1, .5, 2].map((ratio, i) => { const o = c.createOscillator(); o.type = i === 1 ? "triangle" : "sawtooth"; const g = c.createGain(); g.gain.value = [0.22, 0.15, 0.04][i]; o.connect(g).connect(this.motor); o.start(); return { o, ratio }; });
      const noise = c.createBuffer(1, c.sampleRate, c.sampleRate), data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
      this.wind = c.createGain(); this.wind.gain.value = 0; const windFilter = c.createBiquadFilter(); windFilter.type = "bandpass"; windFilter.frequency.value = 540; src.connect(windFilter).connect(this.wind).connect(this.master); src.start();
      this.rival = c.createOscillator(); this.rival.type = "sawtooth"; this.rivalGain = c.createGain(); this.rivalGain.gain.value = 0;
      const rivalFilter = c.createBiquadFilter(); rivalFilter.type = "lowpass"; rivalFilter.frequency.value = 440;
      this.rival.connect(rivalFilter).connect(this.rivalGain).connect(this.master); this.rival.start();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  update(speed, rpm, active, cut, nearestRival = null, throttle = false) {
    if (!this.ctx) return; const t = this.ctx.currentTime, gain = this.on && active ? (throttle ? .08 : .035) * (cut ? .4 : 1) : 0;
    const f = 39 + rpm * 83; for (const { o, ratio } of this.oscs) o.frequency.setTargetAtTime(f * ratio, t, .035);
    this.filter.frequency.setTargetAtTime(300 + rpm * 1950, t, .06);
    this.motor.gain.setTargetAtTime(gain, t, .05);
    this.wind.gain.setTargetAtTime(this.on && active ? Math.min(.09, speed * .00036) : 0, t, .12);
    const distance = nearestRival ? Math.hypot(nearestRival.z - player.z, (nearestRival.x - player.x) * 2) : 1e9;
    this.rival.frequency.setTargetAtTime(45 + (nearestRival?.speed || 0) * .4, t, .08);
    this.rivalGain.gain.setTargetAtTime(this.on && active ? Math.max(0, .022 * (1 - distance / 55)) : 0, t, .1);
  }
  blip(freq = 210, duration = .09) {
    if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = "square"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .6, t + duration);
    g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + duration);
  }
  toggle() { this.on = !this.on; $("sound").textContent = this.on ? "🔊" : "🔇"; this.unlock(); }
}
const audio = new EngineAudio();
class RaceMusic {
  constructor() {
    this.audio = $("musicAudio"); this.audio.volume = .38; this.tracks = []; this.index = 0; this.active = false; this.run = 0;
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

function showCallout(text, seconds, good = false) {
  $("callout").textContent = text; $("callout").classList.toggle("good", good); messageUntil = performance.now() / 1000 + seconds;
}
function start() {
  clearBurst();
  audio.unlock(); music.start(); player = makeCar(); gasHeld = false; elapsed = 0; countdown = 3.4; countdownEnd = performance.now() + 3400; cameraShake = 0; phase = "countdown";
  document.body.dataset.phase = phase;
  makeRivals(); buildWorld(); $("menu").classList.add("hidden"); $("finish").classList.add("hidden"); $("hud").classList.remove("hidden"); $("touch").classList.remove("hidden");
  $("trackName").textContent = TRACKS[selected].name.toUpperCase();
  showCallout("3", .8); updateHud();
}
$("start").onclick = start; $("again").onclick = start;
function action(a) {
  if (phase !== "race") return;
  if (a === "left" || a === "right") { if (requestLane(player, a === "left" ? -1 : 1, rivals)) audio.blip(460, .04); }
  else {
    const perfect = a === "up" && player.rpm >= PERFECT_MIN && player.rpm <= PERFECT_MAX;
    if (shift(player, a === "up" ? 1 : -1)) { audio.blip(a === "up" ? 280 : 180, .08); showCallout(perfect ? "TROCA PERFEITA" : `MARCHA ${player.gear}`, .55, perfect); }
  }
}
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") { e.preventDefault(); gasHeld = true; return; }
  const map = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ShiftLeft: "up", ControlLeft: "down" };
  if (map[e.code]) { e.preventDefault(); if (!e.repeat) action(map[e.code]); }
  if (e.key === "Enter" && phase === "menu") start();
});
document.addEventListener("keyup", (e) => { if (e.code === "KeyW") gasHeld = false; });
window.addEventListener("blur", () => { gasHeld = false; });
document.addEventListener("visibilitychange", () => { if (document.hidden) gasHeld = false; });
$("touch").querySelectorAll("button").forEach((b) => {
  if (b.dataset.action === "gas") {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); gasHeld = true; });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(event, () => { gasHeld = false; });
  } else b.addEventListener("pointerdown", (e) => { e.preventDefault(); action(b.dataset.action); });
});

function timeString(s) { return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`; }
function updateHud() {
  const tr = TRACKS[selected]; $("distance").textContent = `${Math.min(tr.length, Math.floor(player.z))} / ${tr.length} m`;
  $("progress").style.width = `${clamp(player.z / tr.length * 100, 0, 100)}%`;
  $("timer").textContent = timeString(elapsed); $("speed").textContent = String(Math.round(player.speed)).padStart(3, "0");
  $("gear").textContent = player.gear; $("lane").firstChild.textContent = ["FAIXA ESQUERDA", "FAIXA CENTRAL", "FAIXA DIREITA"][player.targetLane];
  $("rank").textContent = `${1 + rivals.filter((r) => r.z > player.z).length}º / ${rivals.length + 1}`;
  const rpm = clamp(player.rpm, 0, 1), p = rpmPath.getPointAtLength(rpmLength * rpm);
  $("rpmFill").style.strokeDasharray = `${rpmLength * rpm} ${rpmLength}`;
  $("rpmFill").setAttribute("stroke", player.rpm > PERFECT_MAX ? "#ff515b" : player.rpm >= PERFECT_MIN ? "#ffbd45" : "#dce8ec");
  $("rpmNeedle").setAttribute("x1", p.x - 16); $("rpmNeedle").setAttribute("x2", p.x + 30);
  $("rpmNeedle").setAttribute("y1", p.y); $("rpmNeedle").setAttribute("y2", p.y);
  $("revWarn").classList.toggle("danger", player.rpm > PERFECT_MAX || player.overrev > 1);
  $("revWarn").querySelector("strong").textContent = player.rpm > PERFECT_MAX ? "GIRO CRÍTICO" : player.rpm >= PERFECT_MIN ? "TROCA PERFEITA" : "GIRO NORMAL";
  $("revText").textContent = player.overrev > .01 ? `${player.overrev.toFixed(1)} / ${ENGINE_LIMIT_SECONDS.toFixed(1)} s até quebrar` : "Motor sob controle";
  $("revBar").querySelectorAll("i").forEach((el, i) => el.classList.toggle("on", player.overrev >= i + 1));
}
function finish(blown = false) {
  phase = "finish"; document.body.dataset.phase = phase; gasHeld = false; music.stop(); audio.update(0, 0, false, false); $("hud").classList.add("hidden"); $("touch").classList.add("hidden"); $("finish").classList.remove("hidden");
  const ahead = rivals.filter((r) => r.z >= TRACKS[selected].length).length;
  $("finishTrack").textContent = TRACKS[selected].name; $("result").textContent = blown ? "MOTOR EXPLODIU" : ahead ? `${ahead + 1}º LUGAR` : "VITÓRIA";
  $("resultSub").textContent = blown ? "Você ficou quatro segundos no giro crítico. Troque a marcha antes da faixa vermelha." : ahead ? "A próxima largada já está esperando." : "Você dominou a reta.";
  $("finalTime").textContent = timeString(elapsed); $("finalSpeed").textContent = Math.round(player.speed);
  audio.blip(blown ? 75 : 680, blown ? .45 : .22);
}
const burstGeo = new THREE.SphereGeometry(.4, 6, 4);
function clearBurst() { for (const p of burst) { scene.remove(p.mesh); p.mesh.material.dispose(); } burst = []; }
function blowEngine() {
  phase = "blown"; document.body.dataset.phase = phase; gasHeld = false; blowUntil = performance.now() + 1350;
  music.stop(); audio.blip(65, .4); showCallout("MOTOR EXPLODIU", 1.4);
  $("callout").classList.remove("good");
  if (reduced.matches) return;
  for (let i = 0; i < 18; i++) {
    const material = new THREE.MeshBasicMaterial({ color: i % 3 ? 0xff6b25 : 0x262a2c, transparent: true, opacity: .9, depthWrite: false });
    const mesh = new THREE.Mesh(burstGeo, material);
    mesh.position.set(player.x + (Math.random() - .5) * 1.5, .9 + Math.random() * .5, player.z + 1.8);
    scene.add(mesh); burst.push({ mesh, vx: (Math.random() - .5) * 7, vy: 2 + Math.random() * 4, vz: (Math.random() - .5) * 5 });
  }
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize(); buildWorld();

function frame(t) {
  requestAnimationFrame(frame); const dt = Math.min(.25, (t - (last || t)) / 1000); last = t;
  if (phase === "countdown") {
    const before = Math.ceil(countdown); countdown = (countdownEnd - performance.now()) / 1000;
    if (countdown <= 0) { phase = "race"; document.body.dataset.phase = phase; showCallout("VAI!", .8, true); audio.blip(740, .28); }
    else if (Math.ceil(countdown) !== before) { showCallout(String(Math.ceil(countdown)), .8); audio.blip(450, .12); }
  }
  if (phase === "race") {
    let remaining = dt;
    while (remaining > 0 && phase === "race") {
      const step = Math.min(.025, remaining); remaining -= step; elapsed += step;
      for (const rival of rivals) {
        rival.speed = Math.min(rival.cruise, rival.speed + 12 * step);
        rival.z += rival.speed / 3.6 * step;
      }
      const hit = stepCar(player, step, rivals, gasHeld);
      if (hit.collision) { cameraShake = reduced.matches ? 0 : .24; audio.blip(82, .18); $("impact").classList.remove("flash"); void $("impact").offsetWidth; $("impact").classList.add("flash"); }
      if (hit.blown) blowEngine();
      else if (player.z >= TRACKS[selected].length) finish();
    }
    updateHud();
  }
  if (phase === "blown") {
    for (const p of burst) { p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt; p.mesh.scale.multiplyScalar(1 + dt * .8); p.mesh.material.opacity = Math.max(0, p.mesh.material.opacity - dt * .65); }
    if (performance.now() >= blowUntil) { clearBurst(); finish(true); }
  }
  if (performance.now() / 1000 > messageUntil) $("callout").textContent = "";
  const nearestRival = rivals.reduce((best, r) => !best || Math.abs(r.z - player.z) < Math.abs(best.z - player.z) ? r : best, null);
  audio.update(player.speed, phase === "countdown" ? .25 : player.rpm, phase === "race" || phase === "countdown", player.shiftCut > 0, nearestRival, gasHeld);
  if (visualCars.length) {
    visualCars[0].position.set(player.x, .04, player.z);
    visualCars[0].rotation.y = (LANE_X[player.targetLane] - player.x) * .017;
    rivals.forEach((r, i) => visualCars[i + 1].position.set(r.x, .04, r.z));
  }
  const speedRatio = player.speed / TOP_SPEEDS.at(-1), targetFov = 68 + (reduced.matches ? 0 : speedRatio * 17);
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
  cameraShake = Math.max(0, cameraShake - dt);
  const shake = cameraShake ? Math.sin(t * .14) * cameraShake * .35 : 0;
  const target = new THREE.Vector3(player.x * .38 + shake, 2.9, player.z - 8.4 - speedRatio * 2);
  follow.lerp(target, Math.min(1, dt * 7)); camera.position.copy(follow);
  camera.lookAt(player.x * .48, 1.5, player.z + 29 + speedRatio * 14);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
