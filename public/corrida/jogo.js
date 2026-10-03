// Corrida da Galera — o jogo no navegador: sala, garagem, e a corrida em 3D (Three.js) com subidas, descidas e lombadas.
import * as THREE from "three";
const { PISTAS, CARROS, sample, elevate, SECTORS, WORLD } = window.Pistas;
const carOf = (p) => (p && CARROS[p.car]) || CARROS.equilibrado;
const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
const socket = io("/corrida");
const { $, h, store } = Comum;
let S = null, ME = null;
const relogio = Comum.relogio(), sNow = relogio.agora;
const me = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const P = (id) => S && S.players.find((p) => p.id === id);
const toast = Comum.criarToast(3200);
const act = Comum.criarAct(socket, toast);
const fmt = (s) => s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

// ---------- sons ----------
const Sound = (() => {
  let ac = null, on = store.get("corrida:sound") !== false, eng = null, skidG = null;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "square", vol = 0.12, at = 0 } = {}) {
    const c = ctx(); if (!c || !on) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // motor: dente de serra passando por um filtro, a nota sobe com a velocidade
  function engine(speed, racing) {
    const c = ctx(); if (!c) return;
    if (!eng) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g).connect(c.destination); o.start(); o2.start(); eng = { o, o2, g }; }
    const v = Math.abs(speed), t = c.currentTime;
    eng.o.frequency.setTargetAtTime(45 + v * 0.42, t, 0.05); eng.o2.frequency.setTargetAtTime(22 + v * 0.21, t, 0.05);
    eng.g.gain.setTargetAtTime(on && racing ? 0.035 + v * 0.00012 : 0, t, 0.08);
  }
  return {
    beep(hi) { tone(hi ? 880 : 440, hi ? 0.5 : 0.25, { vol: 0.15 }); },
    lap() { [660, 880].forEach((f, i) => tone(f, 0.15, { at: i * 0.12 })); },
    finish() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, { at: i * 0.13, type: "triangle", vol: 0.16 })); },
    bump() { tone(90, 0.12, { type: "sawtooth", vol: 0.12 }); },
    skid(lvl) { const c = ctx(); if (!c) return; if (!skidG) { const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = b; src.loop = true; f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 6; g.gain.value = 0; src.connect(f).connect(g).connect(c.destination); src.start(); skidG = g; } skidG.gain.setTargetAtTime(on && lvl ? Math.min(0.06, lvl / 4000) : 0, c.currentTime, 0.05); },
    pop() { tone(700, 0.05, { vol: 0.06 }); },
    sling() { [520, 780, 1040].forEach((f, i) => tone(f, 0.12, { at: i * 0.06, type: "sawtooth", vol: 0.07 })); },
    engine, toggle() { on = !on; store.set("corrida:sound", on); if (!on) engine(0, false); }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

// ---------- entrar / criar ----------
const urlCode = new URLSearchParams(location.search).get("sala");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("corrida:" + r.code, ME);
  history.replaceState(null, "", "/corrida/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code; document.body.classList.add("inroom");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("corrida:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/corrida/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("corrida:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else show("home");
}
socket.on("connect", autoJoin);
socket.on("kicked", () => { toast("O organizador tirou você da sala."); ME = null; S = null; history.replaceState(null, "", "/corrida/"); document.body.classList.remove("inroom"); $("roomTag").classList.add("hidden"); show("home"); });
function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
}

// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  relogio.doEstado(st.now);
  const old = S; S = st;
  if (st.phase === "lobby") { show("lobby"); renderLobby(); stopRace(); return; }
  show("race");
  if (!race || race.startAt !== st.startAt) startRace(st);
  if (old && old.phase === "race" && st.phase === "results") Sound.finish();
  checkMyLap(old);
  renderResults();
});

// ---------- sala de espera ----------
function renderLobby() {
  const m = me(), isHost = m && S.host === m.id, c = S.config;
  $("pilots").innerHTML = S.players.map((p) => `<div class="pilot" style="--c:${p.color}"><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${h(carOf(p).name)}, ${p.id === S.host ? "organizador" : p.online ? "no box" : "desconectado"}${m && p.id === m.id ? " · você" : ""}</small></div>${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`).join("")
    + (S.players.length < 8 ? `<p class="hint">Dá para correr sozinho (contra o relógio) ou chamar até 8 pilotos.</p>` : "");
  $("pilots").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  $("myPick").classList.toggle("hidden", !m);
  if (m) {
    $("colorPick").innerHTML = COLORS.map((col) => { const taken = S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""} ${taken ? "taken" : ""}" data-c="${col}" ${taken ? "disabled" : ""} style="background:${col}" aria-label="Cor ${col}"></button>`; }).join("");
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("color", { color: b.dataset.c })));
    $("carPick").innerHTML = Object.entries(CARROS).map(([id, k]) => `<button class="car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><b>${h(k.name)}</b><small class="inspo">${h(k.inspo || "")}</small><p>${h(k.desc)}</p>
      <div class="spec">${specRows(k).map(([lbl, n]) => `<span>${lbl}</span>${leds(n)}`).join("")}</div></button>`).join("");
    $("carPick").querySelectorAll("[data-carprev]").forEach((c) => carPreview(c, m.color, c.dataset.carprev, m.mods));
    // personalização: rodas, aerofólio e faixas
    const mods = { ...MODS_PADRAO, ...(m.mods || {}) }, seg = (key, opts) => `<div class="modrow"><span>${{ rodas: "Rodas", aero: "Aerofólio", faixa: "Faixas" }[key]}</span><div class="seg">${Object.entries(opts).map(([v, o]) => `<button data-mod="${key}" data-v="${v}" class="${mods[key] === v ? "on" : ""}">${key === "rodas" ? `<i class="rim" style="background:${o.c}"></i>` : ""}${h(typeof o === "string" ? o : o.name)}</button>`).join("")}</div></div>`;
    $("modPick").innerHTML = seg("rodas", MODS3.rodas) + seg("aero", MODS3.aero) + seg("faixa", MODS3.faixa);
    $("modPick").querySelectorAll("[data-mod]").forEach((b) => (b.onclick = () => act("mods", { mods: { [b.dataset.mod]: b.dataset.v } })));
    $("carPick").querySelectorAll("[data-car]").forEach((b) => (b.onclick = () => act("car", { car: b.dataset.car })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-p="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
  }
  const dis = isHost ? "" : "disabled";
  $("cfg").innerHTML = `<div class="tracks">${Object.entries(PISTAS).map(([id, t]) => `<button class="track ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis}><canvas data-prev="${id}" width="160" height="160"></canvas><b>${t.name}</b><small>${h(t.sub)}</small>${loadBest(id) ? `<small class="rec">🏆 seu recorde: ${fmt(loadBest(id).t)}</small>` : ""}</button>`).join("")}</div>
    <div class="field"><label>Voltas</label><div class="seg">${[1, 2, 3, 5].map((v) => `<button data-v="${v}" class="${c.voltas === v ? "on" : ""}" ${dis}>${v}</button>`).join("")}</div></div>`;
  $("cfg").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  $("cfg").querySelectorAll("[data-pista]").forEach((b) => (b.onclick = () => act("config", { config: { ...S.config, pista: b.dataset.pista } })));
  $("cfg").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => act("config", { config: { ...S.config, voltas: +b.dataset.v } })));
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%;font-size:19px">🏁 Largar</button><p class="hint">A largada é igual para todo mundo: 3, 2, 1… vai!</p>`
    : `<p class="muted" style="margin:0">Esperando o organizador dar a largada…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
// ficha do carro (de 1 a 10 LEDs): velocidade final, aceleração, aderência na curva e resistência (muro e grama)
const lerp10 = (v, a, b) => Math.max(1, Math.min(10, Math.round(1 + ((v - a) / (b - a)) * 9)));
const specRows = (k) => [["Velocidade", lerp10(k.vmax, 245, 355)], ["Aceleração", lerp10(k.acc, 52, 115)], ["Aderência", lerp10(k.grip, 350, 570)], ["Resistência", lerp10(k.wall * 100 + k.offMax * 0.4, 85, 150)]];
const leds = (n) => `<span class="leds" role="img" aria-label="${n} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? (i < 6 ? "g" : i < 8 ? "y" : "r") : ""}"></i>`).join("")}</span>`;
// traçado em miniatura (cartões da sala e minimapa)
function drawPreview(cv, id) {
  const t = PISTAS[id], c = cv.getContext("2d"), s = cv.width / t.world, th = THEMES[id];
  c.fillStyle = th.preview; c.fillRect(0, 0, cv.width, cv.height);
  const pts = sample(t.points, 12);
  c.lineJoin = c.lineCap = "round";
  for (const [w, col] of [[t.width * 1.3, "#0006"], [t.width, "#d9dbe0"], [t.width * 0.6, "#3a3d46"]]) {
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x * s, p.y * s) : c.moveTo(p.x * s, p.y * s))); c.closePath(); c.lineWidth = Math.max(2, w * s); c.strokeStyle = col; c.stroke();
  }
  const a = pts[0]; c.fillStyle = "#fff"; c.fillRect(a.x * s - 4, a.y * s - 4, 8, 8); c.fillStyle = "#111"; c.fillRect(a.x * s - 4, a.y * s - 4, 4, 4); c.fillRect(a.x * s, a.y * s, 4, 4);
}

// ---------- temas das pistas: cores, chão, enfeites e o horizonte ----------
const THEMES = {
  monaco: { preview: "#2a6fa3", sky: ["#5fb7ff", "#cfeeff"], fog: "#cfe6f2", oob: 0xffae6f1f, roadCol: "#5b5b61" },
  interlagos: { preview: "#2f7d33", sky: ["#4aa3e8", "#f3e6c8"], fog: "#dfe7d8", oob: 0xff3a9a3f, roadCol: "#4b4b50" },
  losangeles: { preview: "#7a4a6a", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xff6a8aa0, roadCol: "#3f3f46" },
  rio: { preview: "#1f8a8a", sky: ["#3f97e0", "#d6f1ff"], fog: "#cfeaf2", oob: 0xff2a7a3a, roadCol: "#4a4a50" },
  tokyo: { preview: "#14152a", sky: ["#05061a", "#3a1d5c"], fog: "#2a1a44", oob: 0xff1f1514, roadCol: "#24252c" },
};

// posição de largada g: atrás da linha, em duas filas
function gridSpot(pts, g, W) {
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * 13 + n) % n, p = pts[idx], nx = -p.ty, ny = p.tx, side = g % 2 ? 1 : -1, lat = side * W * 0.22;
  return { x: p.x + nx * lat, y: p.y + ny * lat, tx: p.tx, ty: p.ty, nx, ny, a: Math.atan2(p.ty, p.tx), idx };
}

// ---------- corrida em 3D (Three.js): pista com relevo, câmera atrás do kart ----------
// Mundo: o traçado continua em 2D (x, y de 0 a 1600, igual ao servidor), e cada ponto da pista tem uma altura h.
// No 3D, o "y" do traçado vira o z, e a altura vira o y. 1 unidade ≈ 10 cm (um kart tem ~18 de largura).
const cv = $("screen");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(68, 16 / 9, 2, 9000);
const hemi = new THREE.HemisphereLight(0xdfeaff, 0x4a5a3a, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.5;
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1600 });
scene.add(sun, sun.target);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, hh, draw, repeat = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 7 + hh * 3));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// cores e clima de cada pista
const LOOK = {
  monaco: { sky: [0x4fa9f5, 0xd9f0ff], fog: 0xcfe6f2, fogN: 900, fogF: 3800, hemi: [0xe8f2ff, 0x6a6a5a, 1.35], sun: [0xfff3df, 2.3], ground: ["#cdbd9a", "#bfae8a", "#d9caa9"], road: "#5b5b61", kerb: ["#d62828", "#f4f4f4"] },
  interlagos: { sky: [0x3f97e0, 0xf3e6c8], fog: 0xdfe7d8, fogN: 1000, fogF: 4200, hemi: [0xe4efff, 0x4a6a3a, 1.3], sun: [0xfff1dc, 2.3], ground: ["#3f9a3a", "#47a542", "#378331"], road: "#4b4b50", kerb: ["#e53935", "#f4f4f4"] },
  losangeles: { sky: [0x3b2a6b, 0xff9a5a], fog: 0xe8a07a, fogN: 900, fogF: 4000, hemi: [0xffd2b0, 0x5a4a5a, 1.25], sun: [0xffb070, 2.4], ground: ["#9c8a6a", "#8f7d5e", "#a89677"], road: "#3f3f46", kerb: ["#e53935", "#f4f4f4"] },
  rio: { sky: [0x3f97e0, 0xd6f1ff], fog: 0xcfeaf2, fogN: 1000, fogF: 4200, hemi: [0xeaf6ff, 0x3f6a3a, 1.35], sun: [0xfff3df, 2.4], ground: ["#3f8a3a", "#4a9a42", "#367a31"], road: "#4a4a50", kerb: ["#ffd23f", "#1f8a3a"] },
  tokyo: { sky: [0x05061a, 0x3a1d5c], fog: 0x2a1a44, fogN: 700, fogF: 3400, hemi: [0xa89cff, 0x3a2f55, 1.9], sun: [0xc9d2ff, 1.3], ground: ["#2a2b38", "#30313f", "#252633"], road: "#3c3d48", kerb: ["#4fe3ff", "#1b1c26"] },
};

// ---------- a pista: pontos com altura, chão, asfalto, zebras, muros e enfeites ----------
const TRACKS = {};
function buildTrack(id) {
  if (TRACKS[id]) return TRACKS[id];
  const t = PISTAS[id], pts = elevate(sample(t.points, 6), t.hills), n = pts.length, W = t.width;
  for (const p of pts) { p.nx = -p.ty; p.ny = p.tx; }
  const mini = document.createElement("canvas"); mini.width = mini.height = 240; drawPreview(mini, id);
  const tr = { id, t, pts, n, W, look: LOOK[id], theme: THEMES[id], mini, wallLat: t.walls ? W / 2 + t.wall : Infinity, grp: new THREE.Group() };
  // grade de distância até a pista (para o relevo e para espalhar enfeites sem cair na pista)
  const G = 64, cell = t.world / G, gd = new Float32Array((G + 1) * (G + 1)), gh = new Float32Array((G + 1) * (G + 1));
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const x = i * cell, y = j * cell; let bd = 1e12, bh = 0;
    for (let k = 0; k < n; k += 2) { const p = pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bh = p.h; } }
    gd[j * (G + 1) + i] = Math.sqrt(bd); gh[j * (G + 1) + i] = bh;
  }
  tr.distAt = (x, y) => { const i = Math.max(0, Math.min(G, Math.round(x / cell))), j = Math.max(0, Math.min(G, Math.round(y / cell))); return gd[j * (G + 1) + i]; };
  buildWorld(tr);
  return (TRACKS[id] = tr);
}
// altura do chão: em cima da pista e um pouco para os lados é a altura da pista; mais longe, desce até o nível 0
function falloff(tr, lat) { const t = tr.t, off = Math.abs(lat) - tr.W / 2 - t.flat; return off <= 0 ? 1 : Math.max(0, 1 - off / t.fall); }
function trackFrame(tr, x, y, idx) { // ponto da pista mais perto (já sabendo o índice), com a altura e a distância de lado
  const a = tr.pts[idx], b = tr.pts[(idx + 1) % tr.n], c = tr.pts[(idx - 1 + tr.n) % tr.n];
  const proj = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2)); const px = p.x + dx * k, py = p.y + dy * k; return { k, d2: (x - px) ** 2 + (y - py) ** 2, h: p.h + (q.h - p.h) * k, px, py }; };
  const f = proj(a, b), g = proj(c, a), r = f.d2 <= g.d2 ? f : g;
  const lat = (x - r.px) * a.nx + (y - r.py) * a.ny;
  return { h: r.h, lat };
}
function groundH(tr, x, y, idx) { const f = trackFrame(tr, x, y, idx); return f.h * falloff(tr, f.lat); }

// Rio: o mar fica do lado de fora da reta da orla (Copacabana)
const rioShore = (y) => 347 + (y - 530) * 0.4163 - 150;
const rioSea = (x, y) => x < rioShore(y) && y < 1700;
function buildWorld(tr) {
  const { pts, n, W, look, id, grp } = tr, t = tr.t, add = (o) => (grp.add(o), o), r = rng(id.length * 977);
  const WORLD = t.world, K = t.scale; // pistas ampliadas: o mundo cresce junto e as coordenadas fixas (mar, porto) vão × K
  // ---- chão em volta (malha com relevo) ----
  const S = Math.round(140 * K), pad = 1400, size = WORLD + pad * 2, geo = new THREE.PlaneGeometry(size, size, S, S); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + WORLD / 2, y = pos.getZ(i) + WORLD / 2;
    let bi = 0, bd = 1e12; for (let k = 0; k < n; k += 3) { const p = pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bi = k; } }
    let h = groundH(tr, x, y, bi) - 1.5;
    if (id === "monaco" && y > 1250 * K + Math.sin(x / 170) * 20) h = Math.min(h, -14); // o mar
    if (id === "rio" && rioSea(x, y)) h = Math.min(h, -14); // o mar de Copacabana
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const gtex = canvasTex(256, 256, (x, w, hh, rr) => { x.fillStyle = look.ground[0]; x.fillRect(0, 0, w, hh); for (let i = 0; i < 5000; i++) { x.fillStyle = look.ground[1 + ((rr() * 2) | 0)]; x.fillRect(rr() * w, rr() * hh, 3, 3); } });
  gtex.repeat.set(size / 120, size / 120);
  const ground = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gtex, roughness: 1 })));
  ground.position.set(WORLD / 2, 0, WORLD / 2); ground.receiveShadow = true;
  if (id === "monaco") { // mar e o porto
    const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, 1600 * K), new THREE.MeshStandardMaterial({ color: 0x1f6fae, roughness: 0.2, metalness: 0.2 })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD / 2, -6, (1250 + 800) * K);
    const port = add(new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x2a80bf, roughness: 0.2 })));
    port.rotation.x = -Math.PI / 2; port.scale.set(270 * K, 58 * K, 1); port.position.set(800 * K, groundH(tr, 800 * K, 1020 * K, nearest(tr, 800 * K, 1020 * K, 0)) - 0.5, 1020 * K);
  }
  // ---- fitas ao longo da pista (asfalto, zebras, calçada): cada ponto com a sua altura ----
  function ribbon(l0, l1, y0, mat, vLen, y1 = y0, uSpan = 1, i0 = 0, i1 = n) { // de i0 a i1: só um trecho da volta
    const vs = [], uv = [], idx = [];
    for (let i = i0; i <= i1; i++) {
      const p = pts[i % n], d = i * 6;
      for (const [l, yy, u] of [[l0, y0, 0], [l1, y1, uSpan]]) { vs.push(p.x + p.nx * l, p.h * falloff(tr, l) + yy, p.y + p.ny * l); uv.push(u, d / vLen); }
      if (i < i1) { const a = (i - i0) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; return m;
  }
  const asphalt = canvasTex(128, 256, (x, w, hh, rr) => { x.fillStyle = look.road; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#e8e8e8"; x.fillRect(2, 0, 3, hh); x.fillRect(w - 5, 0, 3, hh); if (id === "tokyo") { x.fillStyle = "#f2c94c"; x.fillRect(w / 2 - 1.5, 0, 3, hh * 0.55); } });
  ribbon(-W / 2, W / 2, 0.4, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, side: THREE.DoubleSide }), 256);
  const kerbT = canvasTex(32, 64, (x, w, hh) => { x.fillStyle = look.kerb[0]; x.fillRect(0, 0, w, hh / 2); x.fillStyle = look.kerb[1]; x.fillRect(0, hh / 2, w, hh / 2); });
  const kerbM = new THREE.MeshStandardMaterial({ map: kerbT, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x0a3a44 : 0 });
  ribbon(W / 2, W / 2 + 7, 0.6, kerbM, 28); ribbon(-W / 2 - 7, -W / 2, 0.6, kerbM, 28);
  if (id === "interlagos") { // área de escape de brita
    const brita = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#c9b37a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 600; i++) { x.fillStyle = rr() < 0.5 ? "#b39c66" : "#ddc893"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }), roughness: 1, side: THREE.DoubleSide });
    ribbon(W / 2 + 7, W / 2 + 30, 0.3, brita, 64, 0.2); ribbon(-W / 2 - 30, -W / 2 - 7, 0.2, brita, 64, 0.3);
  } else { // calçada até o muro
    const side = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = id === "tokyo" ? "#3b3e52" : id === "losangeles" ? "#a9a49a" : "#bdb39b"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#0002"; x.strokeRect(0, 0, w, hh); }), roughness: 0.9, side: THREE.DoubleSide });
    const L = tr.wallLat; ribbon(W / 2 + 7, L, 0.5, side, 40); ribbon(-L, -W / 2 - 7, 0.5, side, 40);
    // muro (guard-rail zebrado em Mônaco; mureta de concreto com neon em Tóquio)
    const wt = id === "monaco" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d62828"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#9aa"; x.fillRect(0, hh - 3, w, 3); })
      : id === "losangeles" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#c9c2b4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#e8b83a"; x.fillRect(0, 3, w, 2); x.fillStyle = "#0002"; x.fillRect(w - 2, 0, 2, hh); })
      : id === "rio" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1f8a3a"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#ffd23f"; x.fillRect(w / 2, 0, w / 2, 4); })
      : canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#6c6f80"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ff4fd8"; x.fillRect(0, 2, w, 3); });
    const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x220a22 : 0 });
    for (const s of [1, -1]) { const m = ribbon(s * L, s * L, 0.5, wm, 32, 12, 1); m.castShadow = true; }
  }
  // paredão embaixo dos trechos altos (para não ficar "flutuando") e pilares nos viadutos
  if (id === "tokyo" || id === "losangeles") {
    const pil = new THREE.CylinderGeometry(6, 7, 1, 10), pm = M(id === "tokyo" ? 0x55586a : 0xb8b0a0);
    for (let i = 0; i < n; i += 22) { const p = pts[i]; if (p.h < 15) continue; for (const s of [1, -1]) { const m = add(new THREE.Mesh(pil, pm)); m.scale.y = p.h; m.position.set(p.x + p.nx * s * (W / 2 - 6), p.h / 2, p.y + p.ny * s * (W / 2 - 6)); m.castShadow = true; } }
  }
  // linha de chegada quadriculada e o grid
  const a0 = pts[0], chk = canvasTex(128, 16, (x, w, hh) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; x.fillRect(i * 8, j * 8, 8, 8); } }, false);
  const line = add(new THREE.Mesh(new THREE.PlaneGeometry(W, 12), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.6 })));
  line.rotation.x = -Math.PI / 2; line.rotation.z = -Math.atan2(a0.ty, a0.tx) + Math.PI / 2; line.position.set(a0.x, a0.h + 0.55, a0.y);
  for (let g = 0; g < 8; g++) { const p = gridSpot(pts, g, W); const m = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }))); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(p.ty, p.tx) + Math.PI / 2; m.position.set(p.x + p.tx * 12, pts[p.idx].h + 0.55, p.y + p.ty * 12); }
  // pórtico da largada
  { const s = 1, L = W / 2 + 14, mat = M(0x333844), sign = canvasTex(256, 32, (x, w, hh) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ffd23f"; x.font = "bold 24px sans-serif"; x.textAlign = "center"; x.fillText("CORRIDA DA GALERA", w / 2, 24); }, false);
    for (const k of [1, -1]) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(4, 60, 4), mat)); m.position.set(a0.x + a0.nx * k * L, a0.h + 30, a0.y + a0.ny * k * L); m.castShadow = true; }
    const top = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 4, 10, 3), [mat, mat, mat, mat, new THREE.MeshBasicMaterial({ map: sign }), new THREE.MeshBasicMaterial({ map: sign })]));
    top.position.set(a0.x, a0.h + 62, a0.y); top.rotation.y = -Math.atan2(a0.ny, a0.nx); void s; }
  // ---- enfeites ----
  const spots = []; // [x, y, chão] longe da pista
  const free = (x, y, gap) => x > -pad + 50 && y > -pad + 50 && x < WORLD + pad - 50 && y < WORLD + pad - 50 && tr.distAt(x, y) > W / 2 + gap;
  const hAt = (x, y) => groundH(tr, x, y, nearest(tr, x, y, 0)) - 1.5;
  const inst = (geo, mat, list, sc = (o) => o.s) => {
    if (!list.length) return;
    const m = add(new THREE.InstancedMesh(geo, mat, list.length)), d = new THREE.Object3D();
    list.forEach((o, i) => { d.position.set(o.x, o.h + (o.dy || 0) * sc(o), o.y); d.rotation.set(0, o.r || 0, 0); const s = sc(o); d.scale.set(o.sx || s, o.sy || s, o.sz || s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (o.c != null && m.setColorAt) m.setColorAt(i, new THREE.Color(o.c)); });
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const trees = [], palms = [], blds = [], towers = [], stands = [], yachts = [], neons = [], glass = [], jungle = [], houses = [];
  for (let i = 0; i < n; i += 5) {
    const p = pts[i];
    for (const side of [-1, 1]) {
      const near = (tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 36) + 10 + r() * 60, x = p.x + p.nx * side * near, y = p.y + p.ny * side * near;
      if (!free(x, y, 20)) continue;
      const k = r();
      if (id === "monaco") { if (k < 0.3) palms.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.5, r: r() * 6 }); else if (k < 0.75) { const sx = 50 + r() * 40, sz = 50 + r() * 40, far = near + 40 + r() * 80, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) blds.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 60 + r() * 90, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#f1d9b5", "#efc9a7", "#f6e7c9", "#e8b78f", "#f3e0c0"][(r() * 5) | 0] }); } }
      else if (id === "interlagos") { if (k < 0.45) trees.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.8 }); }
      else if (id === "losangeles") { // palmeiras altas na beira e prédios de vidro mais para trás
        if (k < 0.35) palms.push({ x, y, h: hAt(x, y), s: 1.6 + r() * 0.5, r: r() * 6 });
        else if (k < 0.7) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 60 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) glass.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 140 + r() * 360, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); }
      }
      else if (id === "rio") { // orla com palmeiras; na subida, mata fechada e casinhas coloridas
        const beach = i < n * 0.22 && side > 0;
        if (beach) { if (k < 0.6) palms.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 0.4, r: r() * 6 }); }
        else if (p.h > 18) { if (k < 0.75) jungle.push({ x, y, h: hAt(x, y), s: 0.9 + r() * 0.9 }); else houses.push({ x, y, h: hAt(x, y), s: 1, sx: 18 + r() * 14, sy: 14 + r() * 10, sz: 18 + r() * 14, dy: 0.5, r: r() * 3, c: ["#f2c14e", "#e86a5a", "#5fb3e8", "#7ed07a", "#f29ad8", "#fff3d6"][(r() * 6) | 0] }); }
        else if (k < 0.5) { const sx = 50 + r() * 40, sz = 50 + r() * 40, far = near + 50 + r() * 100, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (!rioSea(bx, by) && free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) blds.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 70 + r() * 110, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#f4f1e6", "#e8e0cf", "#d9e6ef", "#f2dfc8"][(r() * 4) | 0] }); }
      }
      else { if (k < 0.25) neons.push({ x, y, h: hAt(x, y), r: Math.atan2(p.ty, p.tx) + (side > 0 ? 0 : Math.PI), g: (r() * 4) | 0 }); else if (k < 0.8) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 50 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) towers.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 120 + r() * 380, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] }); } }
    }
  }
  // longe da pista: mais prédios, árvores, morros
  for (let k = 0; k < Math.round(220 * K * K); k++) {
    const x = -pad + 100 + r() * (WORLD + 2 * pad - 200), y = -pad + 100 + r() * (WORLD + 2 * pad - 200);
    if (!free(x, y, 160)) continue;
    if (id === "monaco") { if (y > 1260 * K) continue; blds.push({ x, y, h: hAt(x, y), s: 1, sx: 60 + r() * 60, sy: 80 + r() * 140, sz: 60 + r() * 60, dy: 0.5, r: r() * 3, c: ["#f1d9b5", "#efc9a7", "#f6e7c9", "#e8b78f"][(r() * 4) | 0] }); }
    else if (id === "interlagos") trees.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 1.2 });
    else if (id === "losangeles") { if (r() < 0.5) glass.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 120 + r() * 420, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); else palms.push({ x, y, h: hAt(x, y), s: 1.8, r: r() * 6 }); }
    else if (id === "rio") { if (rioSea(x, y)) continue; if (hAt(x, y) > 15 || r() < 0.5) jungle.push({ x, y, h: hAt(x, y), s: 1.3 + r() * 1.2 }); else blds.push({ x, y, h: hAt(x, y), s: 1, sx: 60 + r() * 50, sy: 70 + r() * 120, sz: 60 + r() * 50, dy: 0.5, r: r() * 3, c: ["#f4f1e6", "#e8e0cf", "#d9e6ef"][(r() * 3) | 0] }); }
    else towers.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 150 + r() * 500, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] });
  }
  if (id === "monaco") { for (let k = 0; k < 26; k++) { const a = r() * 6.28, rr2 = Math.sqrt(r()); yachts.push({ x: (800 + Math.cos(a) * 230 * rr2) * K, y: (1020 + Math.sin(a) * 40 * rr2) * K, h: hAt(800 * K, 1020 * K) + 1, s: 1, r: r() * 0.4 }); } for (let k = 0; k < 20; k++) yachts.push({ x: r() * WORLD, y: (1320 + r() * 500) * K, h: -6, s: 1.3, r: r() * 6 }); }
  if (id === "interlagos") for (let k = 0; k < 7; k++) { const p = pts[Math.floor(n * (0.015 + k * 0.025))], L = W / 2 + 70; stands.push({ x: p.x - p.nx * L, y: p.y - p.ny * L, h: p.h, s: 1, r: -Math.atan2(p.ny, p.nx) }); }
  // modelos
  const leaf = new THREE.ConeGeometry(30, 70, 7); leaf.translate(0, 55, 0);
  inst(leaf, M(0x2d7a33), trees); const trunk = new THREE.CylinderGeometry(4, 5, 30, 6); trunk.translate(0, 15, 0); inst(trunk, M(0x6b4423), trees);
  const pt = new THREE.CylinderGeometry(2, 3, 60, 6); pt.translate(0, 30, 0); inst(pt, M(0x8b5a2b), palms);
  const fronds = new THREE.ConeGeometry(22, 12, 6, 1, true); fronds.translate(0, 62, 0); inst(fronds, M(0x2f8f3a, { side: THREE.DoubleSide }), palms);
  const win = (base, lit) => canvasTex(64, 128, (x, w, hh, rr) => { x.fillStyle = lit ? "#1a1c2a" : "#fff"; x.fillRect(0, 0, w, hh); for (let yy = 6; yy < hh; yy += 10) for (let xx = 4; xx < w; xx += 10) { x.fillStyle = lit ? (rr() < 0.55 ? (rr() < 0.7 ? "#ffd86b" : "#9fe3ff") : "#0b0c14") : "#4d6f94"; x.fillRect(xx, yy, 6, 6); } });
  const bgeo = new THREE.BoxGeometry(1, 1, 1);
  if (blds.length) { const t = win(0, false); t.repeat.set(1, 1); const m = inst(bgeo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), blds, () => 1); if (m) m.castShadow = true; }
  if (towers.length) { const t = win(0, true); const mm = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6 }); for (const o of towers) delete o.c; inst(bgeo, mm, towers, () => 1); }
  if (glass.length) inst(bgeo, new THREE.MeshStandardMaterial({ map: win(0, false), metalness: 0.15, roughness: 0.35, emissive: 0x2a1a10, emissiveIntensity: 0.4 }), glass, () => 1); // arranha-céus de vidro (LA)
  if (houses.length) inst(bgeo, M(0xffffff, { roughness: 0.9 }), houses, () => 1); // casinhas coloridas no morro (Rio)
  if (jungle.length) { const crown = new THREE.IcosahedronGeometry(26, 0); crown.translate(0, 40, 0); inst(crown, M(0x1f6a2a), jungle); const tk = new THREE.CylinderGeometry(3, 4, 22, 6); tk.translate(0, 11, 0); inst(tk, M(0x5a3a1a), jungle); }
  if (yachts.length) { const yg = new THREE.BoxGeometry(60, 10, 18); yg.translate(0, 5, 0); inst(yg, M(0xf7f7f7, { roughness: 0.4 }), yachts); const cab = new THREE.BoxGeometry(24, 8, 12); cab.translate(-4, 14, 0); inst(cab, M(0xdfe3ea), yachts); }
  for (const s0 of stands) { // arquibancadas da reta dos boxes
    const g = new THREE.Group(); g.position.set(s0.x, s0.h, s0.y); g.rotation.y = s0.r; add(g);
    const crowd = canvasTex(256, 32, (x, w, hh, rr) => { x.fillStyle = "#8a8f99"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = ["#ffdd00", "#009c3b", "#fff", "#e53935", "#1e5bc6"][(rr() * 5) | 0]; x.fillRect(rr() * w, rr() * hh, 2, 3); } });
    for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 140), [M(0x8a8f99), M(0x8a8f99), new THREE.MeshStandardMaterial({ map: crowd }), M(0x777), M(0x777), M(0x777)]); st.position.set(-k * 14, 4 + k * 8, 0); st.castShadow = true; g.add(st); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 3, 150), M(0x555a66)); roof.position.set(-30, 64, 0); g.add(roof);
  }
  const NEON = [["#ff4fd8", "東京"], ["#4fe3ff", "夜道"], ["#ffe14f", "走れ"], ["#7dff6b", "友達"]].map(([c, t]) => canvasTex(64, 128, (x, w, hh) => { x.fillStyle = "#0b0b14"; x.fillRect(0, 0, w, hh); x.strokeStyle = c; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, hh - 8); x.fillStyle = c; x.font = "bold 40px sans-serif"; x.textAlign = "center"; x.fillText(t[0], w / 2, 52); x.fillText(t[1], w / 2, 104); }, false));
  for (const o of neons) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 52), new THREE.MeshBasicMaterial({ map: NEON[o.g], side: THREE.DoubleSide }))); m.position.set(o.x, o.h + 40, o.y); m.rotation.y = -o.r + Math.PI / 2; const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 16), M(0x222222))); pole.position.set(o.x, o.h + 8, o.y); }
  if (id === "losangeles") landmarksLA(tr, add, r);
  if (id === "rio") landmarksRio(tr, add, r, size, ribbon);
  // horizonte: montanhas (e o Fuji e a Tokyo Tower em Tóquio)
  const far = (geo, mat, x, y, h) => { const m = add(new THREE.Mesh(geo, mat)); m.position.set(x, h, y); return m; };
  if (id === "tokyo") {
    const fuji = far(new THREE.ConeGeometry(1400, 900, 24), M(0x3b2c63, { fog: false }), -2600, -2400, 300); void fuji;
    const cap = far(new THREE.ConeGeometry(420, 270, 24), M(0xe9e6ff, { fog: false }), -2600, -2400, 615); void cap;
    const tower = far(new THREE.ConeGeometry(70, 700, 4, 8, true), new THREE.MeshBasicMaterial({ color: 0xff4b3a, wireframe: true }), 2600, -1400, 350); void tower;
  } else for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, R0 = 3600 + r() * 600, hh = 300 + r() * 500; const m = far(new THREE.ConeGeometry(700 + r() * 500, hh, 7), M(id === "monaco" ? 0x7e8f86 : id === "losangeles" ? 0x8a6a6a : id === "rio" ? 0x2f6a3a : 0x86a37a), WORLD / 2 + Math.cos(a) * R0, WORLD / 2 + Math.sin(a) * R0, hh / 2 - 40); if ((id === "monaco" && Math.sin(a) > 0.3) || (id === "rio" && Math.cos(a) < -0.3)) m.visible = false; }
  // céu
  const sky = new THREE.SphereGeometry(5000, 32, 16), col = [], ps = sky.attributes.position, top = new THREE.Color(look.sky[0]), low = new THREE.Color(look.sky[1]);
  for (let i = 0; i < ps.count; i++) { const yy = ps.getY(i) / 5000, c = low.clone().lerp(top, Math.min(1, Math.max(0, yy * 2.2))); col.push(c.r, c.g, c.b); }
  sky.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const skyM = add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))); skyM.position.set(WORLD / 2, 0, WORLD / 2); tr.sky = skyM;
  if (id === "tokyo") { const moon = add(new THREE.Mesh(new THREE.SphereGeometry(90, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2f0e8, fog: false }))); moon.position.set(WORLD / 2 + 2500, 1800, WORLD / 2 - 3000); }
}
// Los Angeles: placa "GALERA" no morro (estilo Hollywood) e placa verde da freeway em cima da pista
function landmarksLA(tr, add, r) {
  const { pts, n, W } = tr;
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(900, 520, 9), M(0x8a6a5a))); hill.position.set(800, 220, -1500);
  const letters = canvasTex(1024, 160, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.font = "bold 150px Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("G A L E R A", w / 2, hh / 2 + 6); }, false);
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 140), new THREE.MeshBasicMaterial({ map: letters, transparent: true }))); sign.position.set(800, 300, -1250); sign.rotation.x = -0.25;
  const p = pts[Math.floor(n * 0.33)], gsign = canvasTex(256, 96, (x, w, hh) => { x.fillStyle = "#1d6b3a"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, hh - 12); x.fillStyle = "#fff"; x.font = "bold 30px sans-serif"; x.textAlign = "center"; x.fillText("110 FREEWAY", w / 2, 42); x.font = "bold 22px sans-serif"; x.fillText("Vila da Galera ↑", w / 2, 76); }, false);
  const g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // o z do grupo aponta para o lado da pista
  const mat = M(0x777777);
  for (const k of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(3, 64, 3), mat); post.position.set(0, 32, k * (W / 2 + 6)); g.add(post); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2, 30, 70), [new THREE.MeshBasicMaterial({ map: gsign }), new THREE.MeshBasicMaterial({ map: gsign }), mat, mat, mat, mat]); board.position.set(0, 64, 0); g.add(board);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 2, W + 12), mat); beam.position.y = 52; g.add(beam);
}
// Rio: calçadão de Copacabana com as ondas pretas e brancas, areia, Pão de Açúcar, Cristo no morro e os Arcos da Lapa
function landmarksRio(tr, add, r, size, ribbon) {
  const { pts, n, W } = tr, L = tr.wallLat, i1 = Math.floor(n * 0.24);
  const waves = canvasTex(128, 128, (x, w, hh) => { x.fillStyle = "#f4f1e6"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#1a1a1a"; x.lineWidth = 14; for (let k = -1; k < 3; k++) { x.beginPath(); for (let yy = 0; yy <= hh; yy += 4) { const xx = w / 2 + Math.sin((yy / hh) * Math.PI * 2) * 30 + k * 0; yy ? x.lineTo(xx + (k - 0.5) * 64, yy) : x.moveTo(xx + (k - 0.5) * 64, yy); } x.stroke(); } });
  ribbon(L, L + 34, 0.5, new THREE.MeshStandardMaterial({ map: waves, roughness: 0.8, side: THREE.DoubleSide }), 40, 0.5, 1, 0, i1);
  const sand = canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#e8d6a8"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#dcc995" : "#f2e3bb"; x.fillRect(rr() * w, rr() * hh, 2, 2); } });
  ribbon(L + 34, L + 190, 0.3, new THREE.MeshStandardMaterial({ map: sand, roughness: 1, side: THREE.DoubleSide }), 64, -10, 4, 0, i1);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x1f8ab0, roughness: 0.15, metalness: 0.25 }))); sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD / 2, -6, WORLD / 2);
  // guarda-sóis coloridos na areia
  for (let i = 4; i < i1; i += 6) { const p = pts[i], d = L + 60 + r() * 90, x = p.x + p.nx * d, y = p.y + p.ny * d, col = [0xff5a5a, 0xffd23f, 0x3fa9f5, 0x7ed07a][(r() * 4) | 0];
    const um = add(new THREE.Mesh(new THREE.ConeGeometry(12, 5, 8), M(col))); um.position.set(x, 13, y); const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12), M(0xdddddd))); st.position.set(x, 6, y); }
  // Pão de Açúcar (dois morros no mar)
  for (const [x, y, s] of [[-420, 1650, 1], [-180, 1820, 0.6]]) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), M(0x4a5a46))); m.scale.set(s, s * 1.9, s * 0.9); m.position.set(x, 0, y); }
  // Cristo Redentor num morro alto atrás da subida
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(700, 900, 10), M(0x2f5a32))); hill.position.set(2300, 380, -700);
  const stone = M(0xeeeeee, { roughness: 0.6 }), cg = new THREE.Group(); cg.position.set(2300, 830, -700); add(cg);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 110, 10), stone); body.position.y = 55; cg.add(body);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(150, 14, 14), stone); arms.position.y = 98; arms.rotation.y = 0.7; cg.add(arms);
  const head = new THREE.Mesh(new THREE.SphereGeometry(11, 10, 8), stone); head.position.y = 118; cg.add(head);
  // Arcos da Lapa atravessando a pista (o carro passa por baixo de um arco)
  const p = pts[Math.floor(n * 0.79)], g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
  const white = M(0xf4f1e6, { roughness: 0.9 }), span = 34;
  for (let k = -6; k <= 6; k++) {
    const z = k * span; if (Math.abs(z) < W / 2 + 14) continue; // o vão em cima da pista
    const pil = new THREE.Mesh(new THREE.BoxGeometry(10, 64, 10), white); pil.position.set(0, 32, z); pil.castShadow = true; g.add(pil);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 16, span * 13), white); top.position.y = 72; top.castShadow = true; g.add(top);
  for (let k = -6; k < 6; k++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2 - 5, 3, 6, 12, Math.PI), white); arch.position.set(0, 62, (k + 0.5) * span); arch.rotation.y = Math.PI / 2; g.add(arch); }
}
let worldOn = null;
function useTrack(tr) {
  if (worldOn === tr) return;
  if (worldOn) scene.remove(worldOn.grp);
  worldOn = tr; scene.add(tr.grp);
  const L = tr.look;
  scene.fog = new THREE.Fog(L.fog, L.fogN, L.fogF); renderer.setClearColor(L.fog);
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
}

// ---------- carros esportivos 3D ----------
// Cada modelo é um perfil de lado (comprimento u, altura v, em metros) extrudado na largura: a carroceria e a cabine
// (vidro escuro com o teto pintado). Rodas, faróis, lanternas e os extras de cada um por cima. Personalização:
// cor da pintura, cor das rodas, aerofólio (sem/baixo/alto) e faixas (sem/dupla no capô e teto/lateral).
const CARS3 = {
  equilibrado: { // cupê japonês tipo R34: quadradão, lanternas redondas
    L: 4.6, W: 1.82, r: 0.34, axles: [0.95, 3.75],
    body: [[0, 0.3], [0, 0.82], [0.25, 0.95], [1.1, 0.98], [3.3, 0.9], [4.45, 0.78], [4.6, 0.58], [4.6, 0.3]],
    cabin: [[1.1, 0.97], [1.55, 1.36], [2.85, 1.38], [3.35, 0.9]],
  },
  foguete: { // superesportivo em cunha (V12 italiano)
    L: 4.7, W: 2.0, r: 0.35, axles: [1.0, 3.85],
    body: [[0, 0.32], [0, 0.82], [0.5, 0.9], [1.4, 0.92], [4.35, 0.62], [4.7, 0.46], [4.7, 0.3]],
    cabin: [[1.25, 0.9], [2.05, 1.17], [2.75, 1.15], [3.95, 0.68]],
  },
  formiga: { // hatch esportivo: curtinho e alto, traseira reta
    L: 3.95, W: 1.78, r: 0.32, axles: [0.65, 3.2],
    body: [[0, 0.32], [0, 0.98], [0.12, 1.02], [3.0, 0.97], [3.8, 0.82], [3.95, 0.62], [3.95, 0.32]],
    cabin: [[0.12, 1.01], [0.3, 1.52], [2.35, 1.54], [3.0, 0.98]],
  },
  drifteiro: { // cupê leve dos anos 80 (AE86)
    L: 4.25, W: 1.66, r: 0.31, axles: [0.85, 3.25],
    body: [[0, 0.3], [0, 0.84], [0.55, 0.9], [3.25, 0.84], [4.15, 0.72], [4.25, 0.55], [4.25, 0.3]],
    cabin: [[0.55, 0.89], [1.3, 1.3], [2.55, 1.32], [3.3, 0.86]],
  },
  tanque: { // muscle car: capô comprido, largão
    L: 4.85, W: 1.98, r: 0.36, axles: [1.0, 3.95],
    body: [[0, 0.32], [0, 0.9], [0.95, 0.96], [3.55, 1.0], [4.75, 0.94], [4.85, 0.7], [4.85, 0.32]],
    cabin: [[0.95, 0.95], [1.75, 1.34], [2.65, 1.34], [3.3, 0.99]],
  },
};
const KS = 10; // metros do modelo -> unidades da pista
// altura do teto do carro numa posição u (para as faixas e o aerofólio)
function topAt(spec, u) {
  const lerpChain = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; if (u >= Math.min(a[0], b[0]) && u <= Math.max(a[0], b[0]) && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); } return -Infinity; };
  return Math.max(lerpChain(spec.body.slice(1, -1)), lerpChain(spec.cabin));
}
function profileGeo(pts, depth, bevel) {
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? sh.lineTo(u, v) : sh.moveTo(u, v))); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return g;
}
const MODS3 = window.Pistas.MODS, MODS_PADRAO = window.Pistas.MODS_PADRAO;
const luma = (hex) => { const c = new THREE.Color(hex); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };
function makeKart(color, model, ghost = false, name = "", mods = MODS_PADRAO, target = scene) {
  const spec = CARS3[model] || CARS3.equilibrado, md = { ...MODS_PADRAO, ...(mods || {}) };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const car = new THREE.Group(); body.add(car); car.scale.setScalar(KS);
  const mats = [], mm = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }); if (ghost) { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; } mats.push(m); return m; };
  const paint = mm(color, { metalness: 0.45, roughness: 0.28 }), glass = mm(0x12161f, { metalness: 0.6, roughness: 0.15 }), black = mm(0x18181c, { roughness: 0.7 });
  const rim = mm(MODS3.rodas[md.rodas]?.c || "#c3c7cf", { metalness: 0.8, roughness: 0.3 });
  const head = mm(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.9 }), tail = mm(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 0.8 });
  const stripeM = mm(luma(color) > 0.55 ? 0x16161a : 0xf4f4f4, { roughness: 0.4 });
  // no carro, u vai de trás (0) para a frente (L); depois de girar, a frente aponta para -z
  const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2; holder.position.x = 0; car.add(holder);
  const L = spec.L, W = spec.W, at = (u) => u - L / 2; // u -> x local do holder (vira -z no carro)
  const add = (mesh, shadow = true) => { mesh.castShadow = shadow && !ghost; holder.add(mesh); return mesh; };
  const roofBits = []; // o que fica em cima da cabine (faixa no teto, aerofólio de teto): some na primeira pessoa
  const bodyG = profileGeo(spec.body, W, 0.06); bodyG.translate(-L / 2, 0, 0); add(new THREE.Mesh(bodyG, paint));
  const cabG = profileGeo(spec.cabin, W * 0.84, 0.05); cabG.translate(-L / 2, 0, 0); const cabin = add(new THREE.Mesh(cabG, glass));
  // teto pintado em cima do vidro
  const [c1, c2] = [spec.cabin[1], spec.cabin[2]], roofL = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  const roof = add(new THREE.Mesh(new THREE.BoxGeometry(roofL, 0.04, W * 0.8), paint)); roof.position.set(at((c1[0] + c2[0]) / 2), (c1[1] + c2[1]) / 2 + 0.065, 0); // a extrusão tem chanfro de ~6 cm em volta roof.rotation.z = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
  // faróis, grade e lanternas
  const B = 0.065, fu = L + B, fh = topAt(spec, L - 0.15) - 0.12, rh = spec.body[1][1] - 0.14;
  for (const s of [-1, 1]) {
    const hl = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.36), head), false); hl.position.set(at(fu), fh, s * (W / 2 - 0.3));
    if (model === "equilibrado") for (const k of [0.25, 0.6]) { const tl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), tail), false); tl.rotation.z = Math.PI / 2; tl.position.set(at(0) - B, rh, s * (W / 2 - k)); }
    else { const tl = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, model === "tanque" ? 0.7 : 0.45), tail), false); tl.position.set(at(0) - B, rh, s * (W / 2 - (model === "tanque" ? 0.45 : 0.32))); }
  }
  const grill = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, W * 0.5), black), false); grill.position.set(at(L) + B, 0.45, 0);
  const bump = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, W * 0.96), black)); bump.position.set(at(L) + B, 0.33, 0);
  const bumpR = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, W * 0.96), black)); bumpR.position.set(at(0) - B, 0.33, 0);
  // extras de cada modelo
  if (model === "tanque") { const sc = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), black)); sc.position.set(at(3.9), topAt(spec, 3.9) + 0.1, 0); }
  if (model === "foguete") for (const s of [-1, 1]) { const ai = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.04), black), false); ai.position.set(at(1.1), 0.62, s * (W / 2 + 0.07)); }
  if (model === "formiga") { const rs = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, W * 0.8), paint)); rs.position.set(at(0.25), 1.55, 0); rs.rotation.z = -0.2; roofBits.push(rs); }
  // aerofólio
  if (md.aero === "baixo") { const lip = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, W * 0.9), black)); lip.position.set(at(0.12), topAt(spec, 0.15) + 0.1, 0); lip.rotation.z = 0.25; }
  if (md.aero === "alto") {
    const u = 0.28, h0 = topAt(spec, u), wingY = Math.max(h0 + 0.38, spec.cabin[2][1] - 0.02);
    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, W * 0.98), black)); wing.position.set(at(u), wingY, 0); wing.rotation.z = 0.12;
    for (const s of [-1, 1]) {
      const st = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, wingY - h0, 0.05), black)); st.position.set(at(u), (wingY + h0) / 2, s * W * 0.3);
      const ep = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.03), paint)); ep.position.set(at(u), wingY + 0.02, s * W * 0.49);
    }
  }
  // faixas
  if (md.faixa === "dupla") {
    const skip = (u) => (u > spec.cabin[0][0] && u < spec.cabin[1][0]) || (u > spec.cabin[2][0] && u < spec.cabin[3][0]); // pula o para-brisa e o vidro de trás
    for (let u = 0.08; u < L - 0.1; u += 0.16) {
      const u1 = Math.min(L - 0.08, u + 0.16), um = (u + u1) / 2; if (skip(um)) continue;
      const y0 = topAt(spec, u), y1 = topAt(spec, u1), len = Math.hypot(u1 - u, y1 - y0) + 0.01;
      for (const s of [-1, 1]) { const st = add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.16), stripeM), false); st.position.set(at(um), (y0 + y1) / 2 + 0.072, s * 0.15); st.rotation.z = Math.atan2(y1 - y0, u1 - u); if (um > spec.cabin[0][0] && um < spec.cabin[3][0]) roofBits.push(st); }
    }
  }
  if (md.faixa === "lateral") for (const s of [-1, 1]) { const st = add(new THREE.Mesh(new THREE.BoxGeometry(L * 0.78, 0.1, 0.012), stripeM), false); st.position.set(at(L * 0.48), 0.62, s * (W / 2 + 0.07)); }
  // rodas (pneu + aro na cor escolhida + raios para ver girando)
  const wheels = [], steer = [], tireG = new THREE.CylinderGeometry(spec.r, spec.r, 0.26, 18), rimG = new THREE.CylinderGeometry(spec.r * 0.66, spec.r * 0.66, 0.27, 14), spokeG = new THREE.BoxGeometry(spec.r * 1.25, 0.275, 0.07);
  for (const [k, u] of spec.axles.entries()) for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(at(u), spec.r, s * (W / 2 - 0.1)); holder.add(piv);
    const spin = new THREE.Group(); spin.rotation.x = Math.PI / 2; piv.add(spin); // eixo da roda = largura do carro
    const tire = new THREE.Mesh(tireG, black); tire.castShadow = !ghost; spin.add(tire);
    spin.add(new THREE.Mesh(rimG, rim));
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) { const sp = new THREE.Mesh(spokeG, black); sp.rotation.y = a; spin.add(sp); }
    wheels.push({ wm: spin, r: spec.r * KS, axisY: true }); if (k === 1) steer.push(piv);
  }
  if (name) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
    x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000c"; x.strokeText(name, 128, 32); x.fillStyle = color; x.fillText(name, 128, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, opacity: ghost ? 0.8 : 1 })); sp.scale.set(30, 7.5, 1); sp.position.y = 26; sp.renderOrder = 5; g.add(sp);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: ghost ? 0.15 : 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set((W / 2 + 0.25) * KS, (L / 2 + 0.25) * KS, 1); g.add(shadow);
  target.add(g);
  return { g, body, wheels, steer, shadow, mats, steerV: 0, target, roof, cabin, roofBits };
}
function poseKart(k, x, y, z, a, v, steer, ground, dt, lean = 0, pitch = 0) {
  k.g.position.set(x, z, y); k.g.rotation.set(0, -a - Math.PI / 2, 0);
  k.body.rotation.set(pitch, 0, lean);
  // a roda gira em volta do eixo dela (o y do cilindro, que aponta para a lateral)
  for (const w of k.wheels) w.wm.rotation.y -= (v * dt) / w.r;
  k.steerV += (steer - k.steerV) * 0.3; for (const s of k.steer) s.rotation.y = -k.steerV * 0.4;
  k.shadow.position.y = ground - z + 0.7;
}
function dropKart(k) { if (!k) return; (k.target || scene).remove(k.g); k.g.traverse((o) => o.geometry && o.geometry.dispose()); }

// prévia 3D do carro na garagem (um renderizador pequeno, só para as fotos)
const prevR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
prevR.setSize(240, 135, false); prevR.toneMapping = THREE.ACESFilmicToneMapping;
const prevScene = new THREE.Scene(), prevCam = new THREE.PerspectiveCamera(30, 240 / 135, 1, 500);
prevScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
{ const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-40, 60, -30); prevScene.add(d); }
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; prevScene.add(fl); }
const PREV = new Map();
function carPreview(cv, color, model, mods) {
  const key = [color, model, JSON.stringify(mods || {})].join("|");
  let url = PREV.get(key);
  if (!url) {
    const k = makeKart(color, model, false, "", mods, prevScene);
    k.g.rotation.y = Math.PI * 0.78; // de três quartos, mostrando a frente
    prevCam.position.set(-58, 26, -52); prevCam.lookAt(0, 6, 0);
    prevR.render(prevScene, prevCam); url = prevR.domElement.toDataURL(); PREV.set(key, url);
    dropKart(k);
  }
  const img = new Image(); img.onload = () => { const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height); }; img.src = url;
}

// fumaça dos pneus e poeira da grama
const puffs = [], puffGeo = new THREE.SphereGeometry(1, 8, 6), puffMats = {};
function puff(x, y, z, color = "#e6e6e6", s = 3) {
  if (puffs.length > 160) { const o = puffs.shift(); scene.remove(o.m); }
  const mat = (puffMats[color] ||= new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
  const m = new THREE.Mesh(puffGeo, mat.clone()); m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
  puffs.push({ m, t: 0.7, vy: 6 + Math.random() * 6 });
}
function stepPuffs(dt) { for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t -= dt; if (p.t <= 0) { scene.remove(p.m); p.m.material.dispose(); puffs.splice(i, 1); continue; } p.m.position.y += p.vy * dt; p.m.scale.multiplyScalar(1 + dt * 1.6); p.m.material.opacity = p.t * 0.8; } }

// ---------- corrida ----------
let race = null, raf = 0;
const keys = { gas: false, brake: false, left: false, right: false };
function startRace(st) {
  const tr = buildTrack(st.config.pista), mine = me();
  useTrack(tr);
  const spot = gridSpot(tr.pts, mine ? mine.grid : 0, tr.W);
  if (race) clearRace();
  race = { startAt: st.startAt, tr, car: { x: spot.x, y: spot.y, z: tr.pts[spot.idx].h, vz: 0, air: false, a: spot.a, v: 0, vx: 0, vy: 0, slip: 0, steer: 0 }, idx: spot.idx, sector: SECTORS - 1, lastSent: 0, wrong: 0, ghosts: new Map(), msg: null, beeped: 0, finished: false, laps: 0, shake: 0,
    kart: mine ? makeKart(mine.color, mine.car, false, "", mine.mods) : null, cam: { pos: null, a: spot.a }, lapT0: st.startAt, rec: [], recLast: -1e9, best: loadBest(st.config.pista), bestKart: null, bptr: 0, draft: 0, draftT: 0, sling: 0 };
  $("results").classList.add("hidden");
  resize();
  if (!raf) raf = requestAnimationFrame(loop);
}
function clearRace() { if (!race) return; dropKart(race.kart); dropKart(race.bestKart); for (const gh of race.ghosts.values()) dropKart(gh.kart); }
function stopRace() { clearRace(); race = null; Sound.engine(0, false); }
function resize() {
  const w = window.innerWidth, hh = window.innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix();
  const touch = matchMedia("(pointer: coarse)").matches;
  $("padL").classList.toggle("hidden", !touch); $("padR").classList.toggle("hidden", !touch);
}
window.addEventListener("resize", () => race && resize());

// teclado e botões na tela
const KEYMAP = { ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
document.addEventListener("keydown", (e) => { if (!race || e.target.tagName === "INPUT") return; const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } if (e.key === "r" || e.key === "R") respawn(); if ((e.key === "c" || e.key === "C") && !e.repeat) nextCam(); });
// câmeras: perto do carro (padrão), primeira pessoa e longe. C (ou o botão 🎥) troca, e o jogo lembra a escolha.
const CAMS = { perto: "🎥 Câmera perto", cockpit: "🎥 Primeira pessoa", longe: "🎥 Câmera longe" };
let camMode = CAMS[store.get("corrida:cam")] ? store.get("corrida:cam") : "perto";
function nextCam() { const ks = Object.keys(CAMS); camMode = ks[(ks.indexOf(camMode) + 1) % ks.length]; store.set("corrida:cam", camMode); if (race) race.cam.pos = null; toast(CAMS[camMode], 1400); }
document.addEventListener("keyup", (e) => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
document.querySelectorAll(".pad button").forEach((b) => {
  const k = b.dataset.k, set = (v) => { keys[k] = v; b.classList.toggle("on", v); };
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
  b.addEventListener("pointerup", () => set(false)); b.addEventListener("pointercancel", () => set(false)); b.addEventListener("lostpointercapture", () => set(false));
});
// controle (Xbox/PlayStation): analógico esquerdo vira (com a força exata), RT acelera, LT freia/ré,
// A também acelera e B/X também freiam (para quem prefere botão), Y troca a câmera, Back/Select (ou LB) volta para a pista.
const pad = { steer: 0, on: false, prev: [] };
function pollPad() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected);
  if (!gp) { if (pad.on) { pad.on = false; keys.gas = keys.brake = false; } return; }
  const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3)), hit = (i) => b(i) && !pad.prev[i];
  let x = gp.axes[0] || 0; if (b(14)) x = -1; if (b(15)) x = 1;
  const dz = 0.15; x = Math.abs(x) < dz ? 0 : Math.sign(x) * ((Math.abs(x) - dz) / (1 - dz)) ** 1.4;
  const gas = b(7) || b(0) || b(12), brake = b(6) || b(1) || b(2) || b(13);
  if (gas || brake || x || pad.on) { pad.on = true; pad.steer = x; keys.gas = gas; keys.brake = brake && !gas; }
  if (hit(3)) nextCam();
  if (hit(8) || hit(4)) respawn();
  pad.prev = gp.buttons.map((_, i) => b(i));
}
window.addEventListener("gamepaddisconnected", () => { pad.on = false; pad.steer = 0; keys.gas = keys.brake = false; });
window.addEventListener("gamepadconnected", () => toast("🎮 Controle conectado: RT acelera, LT freia, analógico vira", 2600));
$("bRespawn").onclick = () => respawn();
$("bCam").onclick = () => nextCam();
$("bExit").onclick = () => { if (confirm("Sair da corrida e voltar para a vila?")) location.href = "/"; };

// ponto da pista mais perto (procura perto do último, ou na pista toda)
function nearest(tr, x, y, from) {
  let best = from, bd = Infinity;
  const scan = (i0, i1, st = 1) => { for (let k = i0; k <= i1; k += st) { const i = (k + tr.n) % tr.n, p = tr.pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } } };
  scan(from - 40, from + 40);
  if (bd > 160 * 160) { scan(0, tr.n - 1, 2); scan(best - 3, best + 3); }
  return best;
}
function respawn() {
  if (!race || sNow() < race.startAt) return;
  const p = race.tr.pts[race.idx]; Object.assign(race.car, { x: p.x, y: p.y, z: p.h, vz: 0, air: false, a: Math.atan2(p.ty, p.tx), v: 0, vx: 0, vy: 0, slip: 0 }); Sound.pop();
}

// Física do kart (arcade com aderência): o carro tem inércia e os pneus só seguram uma certa força de lado.
// Virar gira o bico, mas a velocidade continua indo para onde ia; os pneus puxam o carro para a nova direção até o
// limite de aderência (grip). Entrou rápido demais, o que sobra vira escorregão para fora da curva, que come
// velocidade (scrub) e leva o kart para a grama ou para o muro. Por isso tem que frear antes das curvas fechadas.
// Agora com relevo: subida freia, descida embala, e numa lombada rápida o kart voa (no ar não acelera nem vira muito).
const GRAV = 160;
function physics(dt, spec = carOf(me())) {
  const c = race.car, tr = race.tr, go = sNow() >= race.startAt && !!me();
  if (!go) { c.v = c.vx = c.vy = 0; return; }
  const fr0 = trackFrame(tr, c.x, c.y, race.idx), road = Math.abs(fr0.lat) <= tr.W / 2 + 6, air = c.air;
  let fx = Math.cos(c.a), fy = Math.sin(c.a);
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * -fy + c.vy * fx; // velocidade para a frente e de lado
  // VÁCUO: logo atrás de outro carro (até ~17 m, na mesma linha e mesma direção) o ar empurra menos e o carro anda
  // mais. Ficou no vácuo mais de 1 s e saiu de trás dele (para ultrapassar)? Ganha o ESTILINGUE, um empurrão curto.
  let draft = 0;
  if (!air && vf > 120) for (const gh of race.ghosts.values()) {
    const dx = gh.x - c.x, dy = gh.y - c.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (along < 22 || along > 170 || lat > 24 || Math.abs((gh.z || 0) - c.z) > 15 || Math.cos(gh.a - c.a) < 0.9) continue;
    draft = Math.max(draft, 1 - (along - 22) / 148);
  }
  race.draft += (draft - race.draft) * Math.min(1, dt * 4);
  if (race.draft > 0.35) race.draftT += dt; else { if (race.draftT > 1 && race.draft < 0.2) { race.sling = 1.2; Sound.sling(); } race.draftT = 0; }
  race.sling = Math.max(0, race.sling - dt);
  const boostK = 1 + 0.12 * race.draft + (race.sling > 0 ? 0.08 : 0);
  const vmax = (road ? spec.vmax : spec.offMax) * boostK;
  if (!air) {
    if (keys.gas) vf += (vf < 0 ? spec.brake : spec.acc * (1 + race.draft * 0.6 + (race.sling > 0 ? 0.8 : 0)) * (1 - 0.8 * Math.pow(Math.max(0, vf) / (spec.vmax * boostK), 1.6))) * dt; // arranca forte, demora a chegar no topo
    else if (keys.brake) vf -= (vf > 0 ? spec.brake : 120) * dt;
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 70 * dt);
    if (vf > vmax) vf = Math.max(vmax, vf - (road ? 300 : 700) * dt);
    // ladeira: a gravidade puxa para baixo da pista
    const h1 = groundH(tr, c.x + fx * 10, c.y + fy * 10, race.idx), h0 = groundH(tr, c.x, c.y, race.idx);
    vf -= ((h1 - h0) / 10) * GRAV * 0.55 * dt;
  }
  vf = Math.max(-70, vf);
  // volante: gira o bico (só andando); a velocidade fica no mundo e é medida de novo no eixo novo do carro
  const steer = pad.on && pad.steer ? pad.steer : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  c.steer += (steer - c.steer) * Math.min(1, dt * 10);
  const wx = fx * vf - fy * vl, wy = fy * vf + fx * vl;
  c.a += c.steer * spec.turn * Math.min(1, Math.abs(vf) / 90) * Math.sign(vf || 1) * dt * (air ? 0.35 : 1);
  fx = Math.cos(c.a); fy = Math.sin(c.a);
  vf = wx * fx + wy * fy; vl = wx * -fy + wy * fx;
  // pneus: tiram até grip·dt da velocidade de lado; o resto escorrega e freia o carro (no ar, os pneus não seguram)
  if (!air) {
    const g = spec.grip * (road ? 1 : 0.5) * (c.slip > 30 ? spec.kin : 1) * dt;
    if (Math.abs(vl) <= g) vl = 0;
    else { vl -= Math.sign(vl) * g; vf -= Math.sign(vf) * Math.min(Math.abs(vf), spec.scrub * 3 * Math.abs(vl) * dt); }
  }
  c.vx = fx * vf - fy * vl; c.vy = fy * vf + fx * vl; c.v = vf; c.slip = air ? 0 : Math.abs(vl);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  race.idx = nearest(tr, nx, ny, race.idx);
  const fr = trackFrame(tr, nx, ny, race.idx), lim = tr.wallLat - 8;
  if (Math.abs(fr.lat) > lim || nx < 2 || ny < 2 || nx > tr.t.world - 2 || ny > tr.t.world - 2) {
    const p = tr.pts[race.idx], s = Math.sign(fr.lat) || 1, over = Math.abs(fr.lat) - lim;
    if (over > 0) { nx -= p.nx * s * over; ny -= p.ny * s * over; }
    nx = Math.max(2, Math.min(tr.t.world - 2, nx)); ny = Math.max(2, Math.min(tr.t.world - 2, ny));
    const vn = c.vx * p.nx * s + c.vy * p.ny * s, hit = Math.abs(vn);
    if (vn > 0) { c.vx -= p.nx * s * vn * 1.25; c.vy -= p.ny * s * vn * 1.25; }
    c.vx *= spec.wall + (1 - spec.wall) * 0.6; c.vy *= spec.wall + (1 - spec.wall) * 0.6;
    if (hit > 60) { Sound.bump(); race.shake = 0.25; race.bumps = (race.bumps || 0) + 1; }
  }
  c.x = nx; c.y = ny;
  // altura: no chão acompanha o relevo; se o chão some (lombada rápida), voa e cai com a gravidade
  const gh = groundH(tr, c.x, c.y, race.idx);
  if (c.air) {
    c.vz -= GRAV * dt; c.z += c.vz * dt;
    if (c.z <= gh) { const hard = -c.vz; c.z = gh; c.vz = 0; c.air = false; if (hard > 60) { Sound.bump(); race.shake = Math.min(0.35, hard / 400); race.land = 0.3; } }
  } else if (gh < c.z - 2.5) { c.air = true; c.vz = Math.max(0, c.gvz || 0); c.z += c.vz * dt; }
  else { c.gvz = Math.max(-400, Math.min(400, (gh - c.z) / Math.max(dt, 1e-3))); c.z = gh; }
  race.offroad = !road && !c.air && Math.abs(vf) > 30;
  // progresso na pista, setores e contramão
  const sec = Math.floor(race.idx / (tr.n / SECTORS));
  if (sec === (race.sector + 1) % SECTORS) { race.sector = sec; act2("sector", { s: sec }); }
  const p = tr.pts[race.idx], dot = Math.cos(c.a) * p.tx + Math.sin(c.a) * p.ty;
  race.wrong = dot < -0.3 && c.v > 40 ? race.wrong + dt : 0;
}
// setor: manda sem esperar e sem mostrar erro (o servidor ignora o que não vale)
function act2(type, data) { socket.emit("act", { type, ...data }, () => {}); }

// fantasmas: posição recebida, suavizada e empurrada um pouquinho pela velocidade
socket.on("ghost", (d) => {
  if (!race) return;
  let gh = race.ghosts.get(d.id);
  if (!gh) { gh = { x: d.x, y: d.y, z: d.z || 0, a: d.a, idx: nearest(race.tr, d.x, d.y, 0) }; race.ghosts.set(d.id, gh); }
  Object.assign(gh, { tx: d.x, ty: d.y, tz: d.z || 0, ta: d.a, v: d.v, prog: d.prog, at: performance.now() });
});
function updateGhosts(dt) {
  const k = 1 - Math.exp(-dt * 10);
  for (const gh of race.ghosts.values()) {
    const ahead = Math.min(0.25, (performance.now() - gh.at) / 1000), tx = gh.tx + Math.cos(gh.ta) * gh.v * ahead, ty = gh.ty + Math.sin(gh.ta) * gh.v * ahead;
    gh.x += (tx - gh.x) * k; gh.y += (ty - gh.y) * k; gh.z += (gh.tz - gh.z) * k;
    let da = gh.ta - gh.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; gh.a += da * k;
    gh.idx = nearest(race.tr, gh.x, gh.y, gh.idx || 0);
  }
}
// ---------- FANTASMA DO RECORDE ----------
// A volta mais rápida que você já fez em cada pista fica salva neste navegador (posição a cada 0,1 s). Nas próximas
// corridas, um carro dourado transparente refaz essa volta junto com você, e o placar mostra quanto você está
// na frente (verde) ou atrás (vermelho) dele naquele ponto da pista.
const REC_KEY = (id) => "corrida:recorde:" + id + (PISTAS[id] && PISTAS[id].scale !== 1 ? ":x" + PISTAS[id].scale : ""); // pista ampliada: recorde novo
function loadBest(id) { const b = store.get(REC_KEY(id)); return b && Array.isArray(b.s) && b.s.length > 20 && b.t > 0 ? b : null; }
const progOf = (idx, tl) => (idx > race.tr.n * 0.75 && tl < 8000 ? idx - race.tr.n : idx); // antes de cruzar a linha conta negativo
function recordLap() {
  const m = me(); if (!m || !S || S.phase !== "race" || m.finish != null) return;
  const tl = sNow() - race.lapT0; if (tl < 0 || tl - race.recLast < 100) return;
  race.recLast = tl; const c = race.car, q = (v, k = 10) => Math.round(v * k) / k;
  race.rec.push([Math.round(tl), q(c.x), q(c.y), q(c.z), q(c.a, 100), progOf(race.idx, tl)]);
  if (race.rec.length > 4000) race.rec.length = 0; // volta enorme (parado/perdido): não vale guardar
}
function lapDone(m) {
  const lt = m.last; if (!lt) return;
  if ((!race.best || lt < race.best.t) && race.rec.length > 20) {
    race.best = { t: lt, car: m.car, mods: m.mods, s: race.rec }; store.set(REC_KEY(S.config.pista), race.best);
    dropKart(race.bestKart); race.bestKart = null; race.newRecord = sNow();
  }
  race.lapT0 += lt * 1000; race.rec = []; race.recLast = -1e9; race.bptr = 0;
}
function drawBest(dt) {
  const b = race.best, m = me();
  const hide = () => { if (race.bestKart) race.bestKart.g.visible = false; };
  if (!b || !m || S.phase !== "race" || m.finish != null) return hide();
  const s = b.s, tl = sNow() - race.lapT0;
  if (tl < 0 || tl > s[s.length - 1][0]) return hide();
  while (race.bptr < s.length - 2 && s[race.bptr + 1][0] < tl) race.bptr++;
  while (race.bptr > 0 && s[race.bptr][0] > tl) race.bptr--;
  const A = s[race.bptr], B = s[race.bptr + 1], k = Math.max(0, Math.min(1, (tl - A[0]) / (B[0] - A[0] || 1)));
  let da = B[4] - A[4]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const x = A[1] + (B[1] - A[1]) * k, y = A[2] + (B[2] - A[2]) * k, z = A[3] + (B[3] - A[3]) * k, a = A[4] + da * k;
  const v = Math.hypot(B[1] - A[1], B[2] - A[2]) / ((B[0] - A[0]) / 1000 || 0.1), idx = ((Math.round(A[5]) % race.tr.n) + race.tr.n) % race.tr.n;
  if (!race.bestKart) race.bestKart = makeKart("#ffd23f", b.car, true, "🏆 Seu recorde", b.mods);
  race.bestKart.g.visible = true;
  poseKart(race.bestKart, x, y, z, a, v, 0, groundH(race.tr, x, y, idx), dt);
}
// diferença para o recorde no mesmo ponto da pista (em segundos; negativo = na frente)
function deltaBest() {
  const b = race.best, m = me(); if (!b || !m || !m.started || m.finish != null) return null;
  const tl = sNow() - race.lapT0, my = progOf(race.idx, tl), s = b.s;
  if (tl < 1500) return null;
  let i = 0; while (i < s.length - 1 && s[i][5] < my) i++;
  if (i >= s.length - 1) return null;
  return (tl - s[i][0]) / 1000;
}
// quanto cada um já andou (para a posição na corrida): voltas completas + ponto da pista (antes da largada conta negativo)
function myProg() { const m = me(); if (!m) return 0; return (m.started ? m.laps * race.tr.n + race.idx : race.idx - race.tr.n); }

let lastT = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  if (!race) { raf && cancelAnimationFrame(raf); raf = 0; return; }
  const dt = Math.min(1 / 30, (t - (lastT || t)) / 1000); lastT = t;
  pollPad();
  if (S && S.phase === "race") { const steps = dt > 1 / 50 ? 2 : 1; for (let i = 0; i < steps; i++) physics(dt / steps); }
  updateGhosts(dt);
  recordLap();
  if (me() && S.phase === "race" && performance.now() - race.lastSent > 100) { race.lastSent = performance.now(); socket.emit("pos", { x: race.car.x, y: race.car.y, z: race.car.z, a: race.car.a, v: race.car.v, prog: myProg() }); }
  Sound.engine(race.car.v, S && S.phase === "race" && sNow() >= race.startAt - 300 && !!me());
  Sound.skid(me() && S.phase === "race" && race.car.slip > 45 ? race.car.slip : 0);
  draw(dt);
  hud();
}

// câmera atrás do kart (quem só assiste segue o primeiro colocado)
function draw(dt) {
  const tr = race.tr, c = race.car;
  // meu kart
  if (race.kart) {
    const slide = Math.max(-1, Math.min(1, (c.slip || 0) / 160)) * Math.sign(c.steer || 1), fr = groundH(tr, c.x, c.y, race.idx);
    poseKart(race.kart, c.x, c.y, c.z, c.a + slide * 0.25, c.v, c.steer, fr, dt, -c.steer * 0.04, c.air ? -0.12 : 0);
    if (c.slip > 45 && Math.random() < 0.7) for (const s of [-1, 1]) puff(c.x - Math.cos(c.a) * 15 + -Math.sin(c.a) * s * 8, c.z + 2, c.y - Math.sin(c.a) * 15 + Math.cos(c.a) * s * 8, "#e6e6e6", 3.5);
    if (race.offroad && Math.random() < 0.5) puff(c.x - Math.cos(c.a) * 18, c.z + 2, c.y - Math.sin(c.a) * 18, tr.id === "interlagos" ? "#b39c66" : "#9a9a9a", 2.5);
  }
  // fantasmas
  for (const [id, gh] of race.ghosts) {
    const pl = P(id); if (!pl) continue;
    const key = pl.color + pl.car + JSON.stringify(pl.mods || {}); if (!gh.kart || gh.kartKey !== key) { dropKart(gh.kart); gh.kart = makeKart(pl.color, pl.car, true, pl.name, pl.mods); gh.kartKey = key; }
    poseKart(gh.kart, gh.x, gh.y, gh.z, gh.a, gh.v || 0, 0, groundH(tr, gh.x, gh.y, gh.idx || 0), dt);
  }
  drawBest(dt);
  stepPuffs(dt);
  let src = c;
  if (!me()) { const lead = standings()[0]; const gh = lead && race.ghosts.get(lead.id); if (gh) src = gh; }
  const C = race.cam, k = 1 - Math.exp(-dt * 6), mode = src === c && race.kart ? camMode : "longe";
  let da = src.a - C.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; C.a += da * (1 - Math.exp(-dt * (mode === "perto" ? 7 : 5)));
  const speedK = Math.min(1.2, Math.abs(src.v || 0) / 300);
  if (race.kart) { const out = mode !== "cockpit"; race.kart.roof.visible = race.kart.cabin.visible = out; for (const b of race.kart.roofBits) b.visible = out; } // de dentro, cabine, teto e faixa do teto tapariam a vista
  if (mode === "cockpit") {
    // primeira pessoa: no lugar do piloto, olhando pelo para-brisa (o capô aparece embaixo)
    const spec = CARS3[me().car] || CARS3.equilibrado, eyeU = spec.cabin[1][0] + 0.1, eyeH = spec.cabin[1][1] + 0.02;
    const fx = Math.cos(c.a), fy = Math.sin(c.a), fo = (eyeU - spec.L / 2) * KS, eh = eyeH * KS;
    const ahead = c.air ? c.z : groundH(tr, c.x + fx * 70, c.y + fy * 70, nearest(tr, c.x + fx * 70, c.y + fy * 70, race.idx));
    C.lookY = C.lookY == null ? ahead : C.lookY + (ahead - C.lookY) * (1 - Math.exp(-dt * 6));
    cam.position.set(c.x + fx * fo, c.z + eh, c.y + fy * fo); C.pos = null;
    cam.lookAt(c.x + fx * (fo + 70), C.lookY + eh + 1, c.y + fy * (fo + 70));
    if (race.shake > 0) { race.shake -= dt; cam.position.y += (Math.random() - 0.5) * 1.2; }
    if (race.offroad) cam.position.y += (Math.random() - 0.5) * 0.6;
    cam.fov += ((74 + speedK * 12) - cam.fov) * 0.08; cam.updateProjectionMatrix();
  } else {
    // atrás do carro: perto (padrão) ou longe
    const near = mode === "perto", back = near ? 50 + speedK * 8 : 88 + speedK * 16, up = near ? 17 + speedK * 2 : 30 + speedK * 4;
    const fx = Math.cos(C.a), fy = Math.sin(C.a);
    const want = V3(src.x - fx * back, (src.z || 0) + up, src.y - fy * back);
    want.y = Math.max(want.y, groundH(tr, want.x, want.z, nearest(tr, want.x, want.z, race.idx)) + 6);
    if (!C.pos) C.pos = want.clone(); else C.pos.lerp(want, near ? 1 - Math.exp(-dt * 9) : k);
    cam.position.copy(C.pos);
    if (race.shake > 0) { race.shake -= dt; cam.position.x += (Math.random() - 0.5) * 3; cam.position.y += (Math.random() - 0.5) * 3; }
    if (race.offroad) cam.position.y += (Math.random() - 0.5) * 1.2;
    cam.lookAt(src.x + fx * (near ? 35 : 45), (src.z || 0) + (near ? 9 : 12), src.y + fy * (near ? 35 : 45));
    cam.fov += ((near ? 70 : 68) + speedK * 10 - cam.fov) * 0.08; cam.updateProjectionMatrix();
  }
  // sol e sombras acompanham o carro
  sun.position.set(src.x - 300, (src.z || 0) + 700, src.y + 260); sun.target.position.set(src.x, src.z || 0, src.y);
  if (tr.sky) tr.sky.position.set(cam.position.x, 0, cam.position.z);
  renderer.render(scene, cam);
}

// ---------- placar da corrida ----------
function standings() {
  if (!S || !race) return [];
  const rows = S.players.map((p) => {
    const gh = race.ghosts.get(p.id), prog = ME && p.id === ME.id ? myProg() : gh ? gh.prog : -1e9;
    return { id: p.id, p, prog, done: p.finish };
  });
  return rows.sort((a, b) => (a.done != null || b.done != null ? (a.done ?? 1e9) - (b.done ?? 1e9) : b.prog - a.prog));
}
function hud() {
  if (!S) return;
  const m = me(), st = standings(), now = sNow(), cfg = S.config, tr = race.tr;
  const left = (race.startAt - now) / 1000;
  // contagem 3, 2, 1, VAI!
  let big = "";
  if (left > 0) { const n = Math.ceil(left); big = n <= 3 ? String(n) : ""; if (n <= 3 && race.beeped !== n) { race.beeped = n; Sound.beep(false); } }
  else if (left > -1) { big = "VAI!"; if (race.beeped !== 0) { race.beeped = 0; Sound.beep(true); } }
  if (m && m.finish != null && S.phase === "race") big = "";
  $("hBig").textContent = big;
  $("hBig").style.color = left > 0 ? "#ff4d4d" : "#2ecc71";
  if (m) {
    const pos = st.findIndex((r) => r.id === m.id) + 1;
    $("hPos").innerHTML = `${pos}º<small>/${st.length}</small>`;
    const lap = Math.min(cfg.voltas, (m.started ? m.laps : 0) + 1);
    $("hLap").textContent = m.finish != null ? "CHEGADA!" : `VOLTA ${lap}/${cfg.voltas}`;
    const t = m.finish != null ? m.finish : Math.max(0, (now - race.startAt) / 1000);
    $("hTime").textContent = `${fmt(t)}${m.best != null ? ` · melhor ${fmt(m.best)}` : ""}`;
    $("hSpeed").textContent = `${Math.round(Math.abs(race.car.v) * 0.75)} km/h`;
    const d = deltaBest(), el = $("hDelta");
    el.textContent = d == null ? (race.best ? `🏆 recorde ${fmt(race.best.t)}` : "") : `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} s do recorde`;
    el.className = "time num " + (d == null ? "" : d < 0 ? "ahead" : "behind");
  } else { $("hPos").innerHTML = "👀"; $("hLap").textContent = "ASSISTINDO"; $("hTime").textContent = fmt(Math.max(0, (now - race.startAt) / 1000)); $("hSpeed").textContent = ""; }
  $("hBoard").innerHTML = st.slice(0, 8).map((r, i) => `<div><span>${i + 1}.</span><i style="background:${r.p.color}"></i>${h(r.p.name)}${r.done != null ? " 🏁" : ""}</div>`).join("");
  // avisos
  let msg = "";
  if (race.wrong > 1) msg = "⚠️ CONTRAMÃO! (aperte ↺)";
  else if (m && m.finish == null && m.started && m.laps === cfg.voltas - 1 && cfg.voltas > 1 && race.lastLapMsg > now - 2500) msg = "ÚLTIMA VOLTA!";
  else if (S.endAt && m && m.finish == null) msg = `⏱️ ${Math.max(0, Math.ceil((S.endAt - now) / 1000))} s para cruzar`;
  if (!msg && race.newRecord > now - 3000) msg = "🏆 NOVO RECORDE!";
  $("hMsg").textContent = msg;
  // vácuo e estilingue
  const dr = race.sling > 0 ? 1 : race.draft;
  $("wind").style.opacity = Math.min(0.85, dr * 1.1).toFixed(2);
  const hd = $("hDraft"); hd.style.opacity = dr > 0.15 ? 1 : 0;
  hd.innerHTML = race.sling > 0 ? "🚀 ESTILINGUE!" : `💨 VÁCUO<i style="width:${Math.round(race.draft * 100)}%"></i>`;
  // minimapa
  const mc = $("mini").getContext("2d"), k = 240 / race.tr.t.world;
  mc.drawImage(tr.mini, 0, 0);
  for (const r of st) {
    const gh = ME && r.id === ME.id ? race.car : race.ghosts.get(r.id); if (!gh) continue;
    mc.fillStyle = r.p.color; mc.strokeStyle = "#000"; mc.lineWidth = 2; mc.beginPath(); mc.arc(gh.x * k, gh.y * k, ME && r.id === ME.id ? 7 : 5, 0, 7); mc.fill(); mc.stroke();
  }
}
// volta nova: bipe e "última volta"
function checkMyLap(old) {
  const m = me(), o = old && ME && old.players.find((p) => p.id === ME.id);
  if (!m || !o || !race) return;
  if (m.laps > o.laps) { lapDone(m); if (m.finish != null) Sound.finish(); else { Sound.lap(); race.lastLapMsg = sNow(); } }
}
function renderResults() {
  const el = $("results");
  if (!S || S.phase !== "results") { el.classList.add("hidden"); return; }
  const m = me(), isHost = m && S.host === m.id, rows = standings();
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa"><div class="chk"></div><div class="in"><h2 style="font-size:28px;margin-bottom:10px">🏆 Resultado · ${h(PISTAS[S.config.pista].name)}</h2>
    <table>${rows.map((r, i) => `<tr><td>${r.done != null ? i + 1 + "º" : "—"}</td><td>${r.p.pawn} <b style="color:${r.p.color}">${h(r.p.name)}</b></td><td class="num">${r.done != null ? fmt(r.done) : "não terminou"}</td><td class="num muted">${r.p.best != null ? "melhor " + fmt(r.p.best) : ""}</td></tr>`).join("")}</table>
    <div class="row" style="margin-top:14px;justify-content:center">${isHost ? `<button class="primary" id="rAgain">🏁 Correr de novo</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" onclick="location.href='/'">🏠 Vila</button></div></div></div>`;
  if ($("rAgain")) $("rAgain").onclick = () => act("start");
  if ($("rLobby")) $("rLobby").onclick = () => act("lobby");
}

// ---------- como jogar ----------
$("btnRules").onclick = () => {
  $("modalBox").innerHTML = `<h2>Como jogar</h2>
  <h3>Controles</h3><ul>
  <li><b>Teclado:</b> ↑ ou W acelera, ↓ ou S freia (e dá ré), ← → ou A D viram. R volta para a pista. C troca a câmera (perto, primeira pessoa ou longe).</li>
  <li><b>Controle (Xbox/PlayStation):</b> RT (ou A) acelera, LT (ou B) freia e dá ré, o analógico esquerdo vira com a força exata, Y troca a câmera e Select (ou LB) volta para a pista.</li>
  <li><b>Celular:</b> ◀ ▶ à esquerda viram; ▲ acelera e ▼ freia à direita.</li>
  <li><b>↺ Pista:</b> se rodar, ficar preso ou entrar na contramão, volta para o meio da pista.</li></ul>
  <h3>A corrida</h3><ul>
  <li>Largada igual para todo mundo: 3, 2, 1… vai! Ganha quem completar as voltas primeiro.</li>
  <li>Os outros carros são <b>fantasmas</b>: dá para passar por dentro deles. Ninguém bate em ninguém, e internet lenta não atrapalha a sua corrida.</li>
  <li><b>Vácuo:</b> logo atrás de outro carro, na mesma linha, o seu anda mais (aparecem as linhas de vento). Ficou mais de 1 segundo no vácuo e saiu de trás para ultrapassar? Ganha o <b>estilingue</b>, um empurrão curto.</li>
  <li><b>Fantasma do recorde:</b> a sua volta mais rápida em cada pista fica salva neste aparelho. Nas próximas corridas, um carro dourado refaz essa volta com você, e o placar mostra quantos segundos você está na frente (verde) ou atrás (vermelho).</li>
  <li><b>Relevo:</b> subida freia, descida embala, e numa lombada rápida o carro voa. No ar ele não acelera nem vira direito, então chegue alinhado.</li>
  <li><b>Freie antes da curva.</b> O pneu só segura até certo ponto: entrou rápido demais, o carro escorrega para fora (sai fumaça e o pneu canta) e perde velocidade. Fora do asfalto ele fica lento; em Mônaco e em Tóquio tem muro.</li>
  <li>A volta só conta passando pela pista inteira, na ordem. Atalho e contramão não valem.</li>
  <li>Quando o primeiro cruza a chegada, os outros têm 45 segundos para terminar.</li></ul>
  <h3>Carros</h3><ul>${Object.values(CARROS).map((k) => `<li><b>${h(k.name)}:</b> ${h(k.desc)}</li>`).join("")}</ul>
  <h3>Pistas</h3><ul>
  <li><b>Mônaco:</b> estreita, com guard-rail colado, a subida da Beau Rivage até o Cassino, a descida até o grampo e o porto cheio de iates.</li>
  <li><b>Interlagos:</b> larga e rápida: a descida do S do Senna, a lombada da Reta Oposta (dá para voar!), o Mergulho e a subida dos boxes.</li>
  <li><b>Tóquio:</b> de noite, entre os prédios de neon, com dois viadutos, uma rampa de pulo e o Fuji no horizonte.</li></ul>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });

// ---------- capa: a largada de Interlagos em 3D (o mesmo desenho da corrida) ----------
(function heroArt() {
  const paint = () => {
    const tr = buildTrack("interlagos"); useTrack(tr);
    const at = (g) => gridSpot(tr.pts, g, tr.W), ks = [];
    [[4, COLORS[0], "equilibrado", { aero: "alto", rodas: "preta" }], [0, COLORS[1], "foguete", { faixa: "lateral" }], [1, COLORS[2], "drifteiro", { aero: "baixo", rodas: "ouro" }], [2, COLORS[3], "formiga", { faixa: "dupla" }], [3, COLORS[4], "tanque", { faixa: "dupla", rodas: "preta" }]].forEach(([g, col, model, mods]) => { const s = at(g), k = makeKart(col, model, false, "", mods); poseKart(k, s.x, s.y, tr.pts[s.idx].h, s.a, 0, 0, tr.pts[s.idx].h, 0); ks.push(k); });
    const s = at(4), fx = Math.cos(s.a), fy = Math.sin(s.a), h = tr.pts[s.idx].h;
    renderer.setSize(640, 360, false); cam.aspect = 16 / 9; cam.fov = 64; cam.updateProjectionMatrix();
    cam.position.set(s.x - fx * 60, h + 22, s.y - fy * 60); cam.lookAt(s.x + fx * 60, h + 8, s.y + fy * 60);
    sun.position.set(s.x - 300, h + 700, s.y + 260); sun.target.position.set(s.x, h, s.y); if (tr.sky) tr.sky.position.set(s.x, 0, s.y);
    renderer.render(scene, cam);
    const hc = $("heroArt"); hc.width = 640; hc.height = 360; hc.getContext("2d").drawImage(renderer.domElement, 0, 0);
    ks.forEach(dropKart);
  };
  setTimeout(() => { try { paint(); } catch (e) { console.warn(e); } }, 60);
})();
if (location.hash === "#debug") window.__corrida = { get race() { return race; }, get S() { return S; }, keys, physics, groundH, buildTrack, act };
