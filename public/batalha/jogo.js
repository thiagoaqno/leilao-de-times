// Batalha da Galera — o jogo no navegador: menus, 3D (Three.js), kart, itens, efeitos, sons e rede.
// Eu dirijo o meu kart aqui (mesma física de regras.js) e mando a posição ~30x por segundo. O servidor manda nos itens
// e manda UM pacote 20x por segundo com todos os karts e itens; os outros aparecem 100 ms "no passado", interpolados.
// Para disfarçar o atraso da internet: a caixa quebra na hora em que eu passo, a roleta gira enquanto o servidor confirma,
// e quem leva um item roda, solta confete e perde o balão com animação.
import * as THREE from "three";
import { montarKart, animarKart, soltarKart } from "../kart3d.js";

const R = window.Regras;
const { $, h, store } = Comum;
const setH = (id, html) => { const e = $(id); if (e._h !== html) { e._h = html; e.innerHTML = html; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
const INTERP = 100;
const ICON = { banana: "🍌", verde: "🟢", vermelho: "🔴", cogumelo: "🍄", estrela: "⭐", bomba: "💣" };
const BOT_NAMES = ["Robozão", "Tchuco", "Ferrugem", "Parafuso", "Bip-Bop", "Turbinho", "Lataria"];
const BOT_SKINS = ["steve", "pikachu", "shrek", "naruto", "woody", "aranha", "cj"];
const toast = Comum.criarToast(3200);

// ======================================================================
// Rede
// ======================================================================
const socket = io("/batalha");
let S = null, ME = null;
const relogio = Comum.relogio(), sNow = relogio.agora;
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const act = Comum.criarAct(socket, toast);
const syncClock = (n) => relogio.sincronizar(socket, n);
socket.on("png", (ack) => typeof ack === "function" && ack());

let urlCode = new URLSearchParams(location.search).get("sala");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("batalha:" + r.code, ME);
  history.replaceState(null, "", "/batalha/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin"), config: store.get("batalha:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("batalha:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/batalha/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("batalha:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); leaveRoom(); });
function leaveRoom() { urlCode = null; ME = null; S = null; history.replaceState(null, "", "/batalha/"); $("roomTag").classList.add("hidden"); stopGame(); show("home"); }
function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- sala de espera ----------
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id;
  $("count").textContent = `(${S.players.length} + ${S.config.bots} robô${S.config.bots === 1 ? "" : "s"}, máx. 8)`;
  $("plist").innerHTML = S.players.map((p) => `<div class="pl ${p.id === (ME && ME.id) ? "me" : ""}"><i class="sw" style="background:${R.COLORS[p.color]}"></i><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}${p.ping != null ? `<span class="muted" style="font-weight:500;font-size:12px">${p.ping} ms</span>` : ""}${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" style="margin-left:auto">✕</button>` : ""}</div>`).join("")
    + Array.from({ length: S.config.bots }, (_, i) => `<div class="pl muted"><i class="sw" style="background:#666"></i>🤖 ${BOT_NAMES[i]}</div>`).join("");
  const taken = new Set(S.players.filter((p) => p !== mine).map((p) => p.color));
  $("lSkins").innerHTML = mine ? skinBotoes(mine.skin) : "";
  $("colors").innerHTML = mine ? R.COLORS.map((c, i) => `<button data-color="${i}" class="${mine.color === i ? "on" : ""}" style="background:${c}" ${taken.has(i) ? "disabled" : ""} title="${taken.has(i) ? "Já tem dono" : "Escolher"}"></button>`).join("") : `<span class="muted">Você está assistindo.</span>`;
  document.querySelectorAll("#cfgMin button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === S.config.minutes); b.disabled = !isHost; });
  $("cfgArena").innerHTML = arenaBotoes(S.config.arena || "praca", isHost ? "" : "disabled");
  const maxBots = Math.max(0, 8 - S.players.length);
  $("cfgBots").innerHTML = Array.from({ length: Math.min(7, maxBots) + 1 }, (_, i) => `<button data-v="${i}" class="${S.config.bots === i ? "on" : ""}" ${isHost ? "" : "disabled"}>${i}</button>`).join("");
  const n = S.players.length + S.config.bots;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${n < 2 ? "disabled" : ""}>🎈 Começar a batalha</button>${n < 2 ? `<p class="muted" style="font-size:13px;margin:6px 0 0">Chame alguém (botão Convidar) ou coloque robôs.</p>` : ""}`
    : `<p class="muted" style="margin:0">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
$("plist").addEventListener("click", (e) => { const b = e.target.closest("[data-kick]"); if (b) act("kick", { id: b.dataset.kick }); });
// o piloto: as skins da Pelada (o jogo lembra a última escolhida, a mesma da Corrida)
const skinBotoes = (atual) => Object.entries(window.Campo.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
function telaSkins() { $("hSkins").innerHTML = skinBotoes(store.get("galera:skin")); }
telaSkins();
for (const id of ["hSkins", "lSkins"]) $(id).addEventListener("click", (e) => { const b = e.target.closest("[data-skin]"); if (!b) return; store.set("galera:skin", b.dataset.skin); telaSkins(); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); });
$("colors").addEventListener("click", (e) => { const b = e.target.closest("[data-color]"); if (b) act("color", { color: +b.dataset.color }); });
$("cfgMin").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setCfg({ minutes: +b.dataset.v }); });
$("cfgBots").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setCfg({ bots: +b.dataset.v }); });
// arenas: na sala, o organizador escolhe; no treino, a escolha da tela inicial
const arenaBotoes = (atual, dis = "") => Object.entries(R.ARENAS).map(([k, a]) => `<button data-arena="${k}" class="${atual === k ? "on" : ""}" ${dis}>${a.emoji} ${h(a.nome)}</button>`).join("");
$("cfgArena").addEventListener("click", (e) => { const b = e.target.closest("[data-arena]"); if (b && !b.disabled) setCfg({ arena: b.dataset.arena }); });
function renderArenaTreino() { $("hArena").innerHTML = arenaBotoes(store.get("batalha:arena") || "praca"); }
$("hArena").addEventListener("click", (e) => { const b = e.target.closest("[data-arena]"); if (b) { store.set("batalha:arena", b.dataset.arena); renderArenaTreino(); } });
renderArenaTreino();
function setCfg(c) { const cfg = { ...S.config, ...c }; store.set("batalha:cfg", cfg); act("config", { config: cfg }); }
$("btnPractice").onclick = () => startPractice();
$("btnPractice2").onclick = () => startPractice();

socket.on("state", (st) => {
  if (!ME || st.code !== ME.code) return;
  S = st;
  if (S.phase === "lobby") { if (G.active && !G.practice) stopGame(); if (!G.active) { show("lobby"); renderLobby(); } return; }
  if (!G.active || G.practice || G.mStart !== S.match.start) { if (G.practice) stopGame(); startOnline(); } // nova batalha
  if (S.phase === "over") showOver();
});
socket.on("snap", (d) => { if (G.active && !G.practice) pushSnap(d); });
socket.on("ev", (e) => { if (G.active && !G.practice) onEv(e); });

// ======================================================================
// Sons (feitos na hora com WebAudio, sem arquivos)
// ======================================================================
const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("batalha:vol") ?? 0.7, eng = null;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
      const len = ac.sampleRate * 2; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function burst({ dur, f0, f1, gain, type = "lowpass", q = 0.7, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone({ f0, f1 = f0, dur, gain, type = "sine", at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("batalha:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    engine(on) {
      const c = ctx(); if (!c) return;
      if (on && !eng) {
        const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = "sawtooth"; o2.type = "square"; o.frequency.value = 50; o2.frequency.value = 25; f.type = "lowpass"; f.frequency.value = 500; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); eng = { o, o2, f, g };
      } else if (!on && eng) { const e = eng; eng = null; e.g.gain.setTargetAtTime(0, c.currentTime, 0.05); setTimeout(() => { e.o.stop(); e.o2.stop(); }, 300); }
    },
    rev(speed, boost) { if (!eng) return; const t = ac.currentTime, k = clamp(Math.abs(speed) / R.MAX, 0, 1.6); eng.o.frequency.setTargetAtTime(48 + k * 95 + (boost ? 30 : 0), t, 0.06); eng.o2.frequency.setTargetAtTime(24 + k * 48, t, 0.06); eng.f.frequency.setTargetAtTime(380 + k * 900, t, 0.08); eng.g.gain.setTargetAtTime(0.035 + k * 0.03, t, 0.1); },
    pop(k = 1) { burst({ dur: 0.12, f0: 3000, f1: 400, gain: 0.5 * k, type: "bandpass", q: 0.8 }); tone({ f0: 900, f1: 200, dur: 0.08, gain: 0.25 * k }); },
    box() { burst({ dur: 0.18, f0: 4000, f1: 1200, gain: 0.25, type: "highpass" }); tone({ f0: 660, f1: 990, dur: 0.12, gain: 0.12, type: "triangle" }); },
    tick() { tone({ f0: 1400, dur: 0.03, gain: 0.06, type: "square" }); },
    ding() { tone({ f0: 1320, dur: 0.25, gain: 0.15, type: "triangle" }); tone({ f0: 1760, dur: 0.3, gain: 0.1, type: "triangle", at: 0.07 }); },
    throw(k = 1) { burst({ dur: 0.25, f0: 600, f1: 2400, gain: 0.25 * k, type: "bandpass", q: 1.4 }); },
    boom(k = 1) { burst({ dur: 0.9, f0: 900, f1: 60, gain: 0.9 * k }); tone({ f0: 90, f1: 30, dur: 0.6, gain: 0.6 * k }); },
    poof(k = 1) { burst({ dur: 0.15, f0: 1500, f1: 300, gain: 0.2 * k }); },
    spin() { for (let i = 0; i < 4; i++) tone({ f0: 900 - i * 150, f1: 700 - i * 150, dur: 0.1, gain: 0.12, type: "triangle", at: i * 0.1 }); },
    ghost() { tone({ f0: 500, f1: 180, dur: 1.2, gain: 0.15, type: "sine" }); tone({ f0: 505, f1: 185, dur: 1.2, gain: 0.1, type: "sine" }); },
    back() { [523, 659, 784].forEach((f, i) => tone({ f0: f, dur: 0.15, gain: 0.12, type: "triangle", at: i * 0.09 })); },
    score() { [784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.14, gain: 0.14, type: "square", at: i * 0.08 })); },
    boost() { burst({ dur: 0.6, f0: 300, f1: 3000, gain: 0.3, type: "bandpass", q: 0.6 }); },
    star() { const s = [523, 659, 784, 1047]; for (let i = 0; i < 4; i++) tone({ f0: s[i], dur: 0.07, gain: 0.07, type: "square", at: i * 0.075 }); },
    beep(go) { tone({ f0: go ? 1046 : 523, dur: go ? 0.5 : 0.2, gain: 0.2, type: "square" }); },
    bump() { tone({ f0: 120, f1: 60, dur: 0.12, gain: 0.25 }); },
    end() { [784, 659, 784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.2, gain: 0.15, type: "triangle", at: i * 0.15 })); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
document.addEventListener("keydown", () => Sound.unlock(), { once: true });

// ======================================================================
// 3D: céu, luz e a arena
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x4a3a78, 130, 360);
const cam = new THREE.PerspectiveCamera(72, 1, 0.1, 800);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
function canvasTex(w, hh, draw, repeat = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 31 + hh));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o }); }
{ // céu de fim de tarde num parque de diversões
  const g = new THREE.SphereGeometry(600, 32, 16), col = [], pos = g.attributes.position;
  const top = new THREE.Color(0x1d1446), mid = new THREE.Color(0x7a4ea8), low = new THREE.Color(0xffa26b);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 600, c = y > 0.06 ? mid.clone().lerp(top, Math.min(1, (y - 0.06) / 0.5)) : low.clone().lerp(mid, clamp((y + 0.04) / 0.1, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
}
scene.add(new THREE.HemisphereLight(0xd8c8ff, 0x3a2a50, 1.5));
const sunL = new THREE.DirectionalLight(0xffe0c0, 2.3);
sunL.position.set(-40, 70, 35); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
Object.assign(sunL.shadow.camera, { left: -66, right: 66, top: 66, bottom: -66, near: 1, far: 200 });
scene.add(sunL, sunL.target);

const boxMeshes = [];
// a arena é montada de novo quando muda (cada sala escolhe a sua): tudo fica num grupo que é jogado fora inteiro
let arenaGrp = null, arenaId = null, miniBase = null;
function construirArena(id) {
  const A = R.usarArena(id);
  if (arenaGrp && arenaId === id) return;
  if (arenaGrp) { scene.remove(arenaGrp); arenaGrp.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); } }); }
  arenaGrp = new THREE.Group(); scene.add(arenaGrp); arenaId = id; boxMeshes.length = 0; miniBase = null;
  const H = R.HALF, add = (o) => (arenaGrp.add(o), o), furo = A.vazio || (() => false);
  const box = (w, hh, d, x, y, z, mat, shadow = true) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat)); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; };
  // grama em volta
  const grass = add(new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = "#2f5a2c"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 4000; i++) { x.fillStyle = r() < 0.5 ? "#00000014" : "#ffffff0e"; x.fillRect(r() * w, r() * hh, 2, 3); } }, true), roughness: 1 })));
  grass.material.map.repeat.set(80, 80); grass.rotation.x = -Math.PI / 2; grass.position.y = A.vazio ? R.VAZIO - 0.5 : -0.06; grass.receiveShadow = true;
  if (A.tema === "predio") grass.visible = false;
  // piso da arena: ladrilhos roxos com marcas coloridas
  const floorTex = canvasTex(2048, 2048, (x, w, hh, r) => {
    const n = 30, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? "#4a3780" : "#3e2d6c"; x.fillRect(i * s, j * s, s, s); }
    for (let i = 0; i < 20000; i++) { x.fillStyle = r() < 0.5 ? "#00000010" : "#ffffff08"; x.fillRect(r() * w, r() * hh, 3, 3); }
    const c = w / 2, k = w / (H * 2);
    x.lineWidth = 10; x.setLineDash([30, 22]); x.strokeStyle = "#ffffff88"; x.beginPath(); x.arc(c, c, 30 * k, 0, Math.PI * 2); x.stroke();
    x.setLineDash([]); x.lineWidth = 14; x.strokeStyle = "#ffd84a99"; x.beginPath(); x.arc(c, c, 42 * k, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 12; x.strokeStyle = "#ff5fa299"; x.strokeRect(5 * k, 5 * k, w - 10 * k, hh - 10 * k);
    R.SPAWNS.forEach(([sx, sz], i) => { x.fillStyle = R.COLORS[i] + "aa"; x.beginPath(); x.arc(c + sx * k, c + sz * k, 2.2 * k, 0, Math.PI * 2); x.fill(); });
    if (A.vazio) { // buracos: o piso some (transparente), com uma faixa de aviso amarela e preta na beirada
      const st = 4, img = x.getImageData(0, 0, w, hh), d = img.data;
      for (let py = 0; py < hh; py += st) for (let px = 0; px < w; px += st) {
        const wx = px / k - H, wz = py / k - H; if (!furo(wx, wz)) continue;
        for (let yy = py; yy < py + st; yy++) for (let xx = px; xx < px + st; xx++) d[(yy * w + xx) * 4 + 3] = 0;
      }
      for (let py = 0; py < hh; py += st) for (let px = 0; px < w; px += st) { // beirada
        const wx = px / k - H, wz = py / k - H; if (furo(wx, wz)) continue;
        if (furo(wx + 1.2, wz) || furo(wx - 1.2, wz) || furo(wx, wz + 1.2) || furo(wx, wz - 1.2)) { const on = ((px + py) / (st * 3)) % 2 < 1; for (let yy = py; yy < py + st; yy++) for (let xx = px; xx < px + st; xx++) { const q = (yy * w + xx) * 4; d[q] = on ? 255 : 30; d[q + 1] = on ? 210 : 30; d[q + 2] = on ? 60 : 30; } }
      }
      x.putImageData(img, 0, 0);
    }
  });
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, alphaTest: 0.5, side: THREE.DoubleSide })));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  if (A.vazio) { // a "espessura" do piso (uma segunda camada um pouco abaixo) e o que tem lá embaixo
    const sob = add(new THREE.Mesh(floor.geometry, new THREE.MeshStandardMaterial({ color: 0x2a2140, map: floorTex, alphaTest: 0.5, side: THREE.DoubleSide })));
    sob.rotation.x = -Math.PI / 2; sob.position.y = -0.8;
    if (A.tema === "lava") { // o poço de lava (embaixo do buraco do meio e dos furos do anel)
      const lava = add(new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3a00, emissiveIntensity: 1.2, roughness: 0.6 })));
      lava.rotation.x = -Math.PI / 2; lava.position.y = -6;
    } else { // a cidade lá embaixo: telhados com janelinhas acesas
      const jan = canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = "#14102a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.3 ? "#ffd27a" : "#2d2650"; x.fillRect(r() * w, r() * hh, 3, 3); } }, true);
      jan.repeat.set(30, 30);
      const cid = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: jan, emissive: 0x332244, emissiveMap: jan, roughness: 0.9 })));
      cid.rotation.x = -Math.PI / 2; cid.position.y = R.VAZIO - 1;
      const torre = add(new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 28, 8), M(0x3a3352, { roughness: 0.8 }))); torre.position.y = R.VAZIO + 13; torre.rotation.y = Math.PI / 8; // o prédio por baixo da praça
    }
  }
  if (A.relevo) { // Rosquinha: a borda de fora sobe como uma rampa até o muro redondo
    const bank = add(new THREE.Mesh(new THREE.CylinderGeometry(58, 50, 2.8, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x7a5aa8, roughness: 0.7, side: THREE.DoubleSide })));
    bank.position.y = 1.4; bank.receiveShadow = true;
    const muro = add(new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 9, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8c27a, roughness: 0.6, side: THREE.DoubleSide })));
    muro.position.y = 4.5;
  }
  // muro em volta: zebrado vermelho e branco
  const red = M(0xe53935, { roughness: 0.5 }), white = M(0xf5f5f5, { roughness: 0.5 });
  if (A.cerca && !A.relevo) for (let i = -H; i < H; i += 4) for (const [sx, sz, rot] of [[0, -1, 0], [0, 1, 0], [-1, 0, 1], [1, 0, 1]]) {
    const mat = ((i + H) / 4) % 2 ? red : white;
    const g = rot ? R.groundAt(sx * (H - 1), i + 2) : R.groundAt(i + 2, sz * (H - 1)), wh = 1.3 + g; // muro mais alto em volta dos mirantes
    if (rot) box(1, wh, 4, sx * (H + 0.5), wh / 2, i + 2, mat, false); else box(4, wh, 1, i + 2, wh / 2, sz * (H + 0.5), mat, false);
  }
  if (A.cerca && !A.relevo) for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(1, 4.8, 1, x * (H + 0.5), 2.4, z * (H + 0.5), white, false);
  // relevo: planalto, mirantes e rampas (as rampas de pulo são amarelas com setas)
  const stripe = (a, b) => canvasTex(64, 64, (x, w) => { x.fillStyle = a; x.fillRect(0, 0, w, w); x.fillStyle = b; for (let i = -w; i < w * 2; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 16 - w, w); x.lineTo(i - w, w); x.fill(); } }, true);
  const tileTex = (a, b) => canvasTex(128, 128, (x, w) => { x.fillStyle = a; x.fillRect(0, 0, w, w); x.fillStyle = b; x.fillRect(0, 0, w / 2, w / 2); x.fillRect(w / 2, w / 2, w / 2, w / 2); x.strokeStyle = "#ffffff22"; x.lineWidth = 3; x.strokeRect(0, 0, w, w); }, true);
  const wallTex = canvasTex(128, 64, (x, w, hh, r) => { x.fillStyle = "#8f86a8"; x.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) for (let i = (y / 16) % 2 ? -16 : 0; i < w; i += 32) { x.fillStyle = r() < 0.5 ? "#9d94b6" : "#857c9e"; x.fillRect(i + 1, y + 1, 30, 14); } }, true);
  const arrowTex = canvasTex(128, 128, (x, w) => { x.fillStyle = "#ffd84a"; x.fillRect(0, 0, w, w); x.fillStyle = "#2a2a2a"; for (const y of [10, 70]) { x.beginPath(); x.moveTo(20, y + 44); x.lineTo(64, y); x.lineTo(108, y + 44); x.lineTo(88, y + 44); x.lineTo(64, y + 20); x.lineTo(40, y + 44); x.fill(); } }, true);
  const topMat = (h) => { const t = tileTex(h >= 4 ? "#6b4fb0" : "#3d7d8f", h >= 4 ? "#5a3f9a" : "#346d7e"); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); };
  const sideMat = (len, hh) => { const t = wallTex.clone(); t.repeat.set(len / 4, Math.max(1, hh / 2)); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); };
  for (const s of R.SHAPES) {
    const [x0, z0, x1, z1, h0, h1, ax] = s, w = x1 - x0, d = z1 - z0, hm = Math.max(h0, h1);
    if (!ax) { // bloco plano: em cima, ladrilho; dos lados, pedra. Ponte (s[7]): só uma laje lá em cima
      const top = topMat(hm); top.map.repeat.set(w / 4, d / 4);
      const esp = s[7] ? 0.6 : hm, sm = sideMat(Math.max(w, d), esp);
      box(w, esp, d, (x0 + x1) / 2, hm - esp / 2, (z0 + z1) / 2, [sm, sm, top, sm, sm, sm]);
      continue;
    }
    // rampa: cunha com a parte de cima inclinada
    const kick = hm <= 2.3, g = new THREE.BufferGeometry();
    const P = (x, z) => [x, R.heightOf(s, Math.min(x1, Math.max(x0, x)), Math.min(z1, Math.max(z0, z))), z];
    const c = [P(x0, z0), P(x1, z0), P(x1, z1), P(x0, z1)], b = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]];
    const tris = [], uvs = [], L = ax === "x" ? w : d, Wd = ax === "x" ? d : w;
    const quad = (a, bq, cq, dq, uv) => { tris.push(...a, ...bq, ...cq, ...a, ...cq, ...dq); uvs.push(...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]); };
    // topo (UV: v ao longo da subida)
    const up = (ax === "x" ? h1 > h0 : h1 > h0);
    const uvT = ax === "x" ? [[0, 0], [L / 4, 0], [L / 4, Wd / 4], [0, Wd / 4]].map(([u, v]) => (up ? [v, u] : [v, L / 4 - u])) : [[0, 0], [Wd / 4, 0], [Wd / 4, L / 4], [0, L / 4]].map(([u, v]) => (up ? [u, v] : [u, L / 4 - v]));
    quad(c[0], c[3], c[2], c[1], [uvT[0], uvT[3], uvT[2], uvT[1]]);
    // lados (paredes da cunha)
    quad(b[0], b[1], c[1], c[0], [[0, 0], [w / 4, 0], [w / 4, c[1][1] / 2], [0, c[0][1] / 2]]);
    quad(b[2], b[3], c[3], c[2], [[0, 0], [w / 4, 0], [w / 4, c[3][1] / 2], [0, c[2][1] / 2]]);
    quad(b[3], b[0], c[0], c[3], [[0, 0], [d / 4, 0], [d / 4, c[0][1] / 2], [0, c[3][1] / 2]]);
    quad(b[1], b[2], c[2], c[1], [[0, 0], [d / 4, 0], [d / 4, c[2][1] / 2], [0, c[1][1] / 2]]);
    g.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.addGroup(0, 6, 0); g.addGroup(6, 24, 1); g.computeVertexNormals();
    const topM = kick ? new THREE.MeshStandardMaterial({ map: arrowTex, roughness: 0.5 }) : (() => { const m = topMat(hm); return m; })();
    const m = add(new THREE.Mesh(g, [topM, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, side: THREE.DoubleSide })]));
    m.castShadow = true; m.receiveShadow = true;
  }
  // beiradas coloridas nos mirantes e no planalto (para ver de longe onde acaba)
  for (const s of R.SHAPES) {
    if (s[6]) continue;
    const [x0, z0, x1, z1, h] = s, col = M(h >= 4 ? 0xffd84a : 0x5fe0ff, { emissive: h >= 4 ? 0x553f00 : 0x0b4250 });
    for (const [x, z, w, d] of [[(x0 + x1) / 2, z0, x1 - x0, 0.3], [(x0 + x1) / 2, z1, x1 - x0, 0.3], [x0, (z0 + z1) / 2, 0.3, z1 - z0], [x1, (z0 + z1) / 2, 0.3, z1 - z0]]) box(w, 0.12, d, x, h + 0.06, z, col, false);
  }
  // obstáculos
  const stone = M(0xb9b2c8, { roughness: 0.85 });
  for (const [x0, z0, x1, z1, hh, kind, base] of R.BLOCKS) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y0 = base || 0;
    if (kind === "fonte") {
      box(w, 1.0, d, cx, y0 + 0.5, cz, stone);
      const water = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.8, d - 0.8), new THREE.MeshStandardMaterial({ color: 0x3fa9f5, emissive: 0x0a4a88, roughness: 0.15, metalness: 0.1 })));
      water.rotation.x = -Math.PI / 2; water.position.set(cx, y0 + 0.85, cz);
      const col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 2.8, 16), stone)); col.position.set(cx, y0 + 1.4, cz); col.castShadow = true;
      const bowl = add(new THREE.Mesh(new THREE.CylinderGeometry(2, 1.2, 0.5, 20), stone)); bowl.position.set(cx, y0 + 2.9, cz); bowl.castShadow = true;
      const top = add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), M(0xffd84a, { emissive: 0x6a5000, metalness: 0.4, roughness: 0.3 }))); top.position.set(cx, y0 + 3.8, cz); top.castShadow = true;
    } else if (kind === "pilar") {
      const t = stripe("#ffd84a", "#2a2a2a"); t.repeat.set(2, 3);
      box(w, hh, d, cx, hh / 2, cz, M(0xffffff, { map: t }));
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), M(R.COLORS[Math.abs(Math.round(cx + cz * 3)) % 8], { roughness: 0.25 })));
      b.scale.y = 1.2; b.position.set(cx, hh + 1.5, cz); b.castShadow = true;
    } else if (kind === "muro") {
      const sm = sideMat(Math.max(w, d), hh); box(w, hh, d, cx, hh / 2, cz, sm);
    } else {
      const t = stripe("#e53935", "#f5f5f5"); t.repeat.set(Math.max(w, d) / 2, 1);
      box(w, hh, d, cx, hh / 2, cz, M(0xffffff, { map: t }));
    }
  }
  // enfeites fora da arena: cachos de balões em postes e árvores
  const r = rng(7), yb = A.tema === "predio" ? R.VAZIO : 0; // no prédio, os enfeites ficam lá embaixo, na rua
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2, rad = 70 + r() * 22, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), M(0x888888))); pole.position.set(x, 4 + yb, z);
    for (let j = 0; j < 5; j++) {
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), M(R.COLORS[(i + j) % 8], { roughness: 0.3 })));
      b.scale.y = 1.2; b.position.set(x + (r() - 0.5) * 3, 9 + r() * 2.2 + yb, z + (r() - 0.5) * 3);
    }
  }
  for (let i = 0; i < 60; i++) { // árvores
    const a = r() * Math.PI * 2, rad = 100 + r() * 90, x = Math.cos(a) * rad, z = Math.sin(a) * rad, s = 1 + r() * 1.4;
    const tr = add(new THREE.Mesh(new THREE.ConeGeometry(3 * s, 8 * s, 8), M(0x1f4a2a))); tr.position.set(x, 4 * s + yb, z);
  }
  // caixas de item: cubo colorido com "?", girando
  const qTex = canvasTex(128, 128, (x, w) => {
    const g = x.createLinearGradient(0, 0, w, w); ["#ff5f5f", "#ffd84a", "#5fff8f", "#5fc8ff", "#c45fff"].forEach((c, i) => g.addColorStop(i / 4, c));
    x.fillStyle = g; x.fillRect(0, 0, w, w); x.strokeStyle = "#fff"; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, w - 8);
    x.fillStyle = "#fff"; x.font = "bold 90px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.strokeStyle = "#0008"; x.lineWidth = 6; x.strokeText("?", w / 2, w / 2 + 6); x.fillText("?", w / 2, w / 2 + 6);
  });
  const qMat = new THREE.MeshStandardMaterial({ map: qTex, transparent: true, opacity: 0.88, emissive: 0x332244, roughness: 0.2 });
  R.BOXES.forEach(([x, z], i) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), qMat)); m.position.set(x, R.boxY(i) + 1.3, z); m.castShadow = true; m.userData.y = R.boxY(i) + 1.3; boxMeshes.push(m); });
}
construirArena("praca");

// ---------- partículas (confete, faíscas, fumaça) ----------
const parts = [];
const partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18), partMats = {};
const pMat = (c) => partMats[c] || (partMats[c] = new THREE.MeshBasicMaterial({ color: c, transparent: true }));
function burstAt(x, y, z, colors, n = 20, speed = 6, life = 0.9, grav = 9, size = 1) {
  for (let i = 0; i < n; i++) {
    if (parts.length > 400) { const o = parts.shift(); scene.remove(o.m); }
    const m = new THREE.Mesh(partGeo, pMat(colors[i % colors.length])); m.position.set(x, y, z); m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 0.3;
    parts.push({ m, vx: Math.cos(a) * speed * Math.random(), vy: speed * (0.4 + u * 0.6), vz: Math.sin(a) * speed * Math.random(), life, t: life, grav, spin: (Math.random() - 0.5) * 12 });
    scene.add(m);
  }
}
const blasts = [];
function explosion(x, z, y = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.85, depthWrite: false }));
  m.position.set(x, y + 0.5, z); scene.add(m); blasts.push({ m, t: 0 });
  burstAt(x, y + 1, z, ["#ff8a00", "#ffd84a", "#ff3b1f", "#444444"], 40, 14, 1.1, 12, 1.6);
}
function stepFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t -= dt;
    if (p.t <= 0) { scene.remove(p.m); parts.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    p.m.rotation.x += p.spin * dt; p.m.rotation.y += p.spin * dt;
    p.m.material.opacity = 1; p.m.scale.multiplyScalar(p.t < 0.25 ? 0.9 : 1);
  }
  for (let i = blasts.length - 1; i >= 0; i--) {
    const b = blasts[i]; b.t += dt; const k = b.t / 0.5;
    if (k >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); blasts.splice(i, 1); continue; }
    b.m.scale.setScalar(R.BLAST * Math.sqrt(k)); b.m.material.opacity = 0.85 * (1 - k);
  }
}

// ---------- kart ----------
function nameTag(text, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 7; x.strokeStyle = "#000c"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(3.2, 0.8, 1); s.renderOrder = 5; return s;
}
const balloonGeo = new THREE.SphereGeometry(0.42, 16, 12), BALLOON_POS = [[-0.5, 2.6, 2.0], [0, 2.9, 2.2], [0.5, 2.6, 2.0]];
// o kart com o piloto sentado (a skin escolhida) vem de /kart3d.js, em metros: aqui fica um pouco maior
const KART_S = 1.45;
function makeKart(colorIdx, name, isMe, skin) {
  const color = R.COLORS[colorIdx] || "#999";
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const kt = montarKart({ cor: color, skin: skin || "padrao", num: colorIdx + 1 }); kt.g.scale.setScalar(KART_S); body.add(kt.g);
  const mats = [...kt.mats], mm = (c, o) => { const m = M(c, o); mats.push(m); return m; };
  // balões: 3 na traseira, presos por barbantes
  const balloons = [], bMat = mm(color, { roughness: 0.22, emissive: new THREE.Color(color).multiplyScalar(0.15) });
  const strMat = new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true });
  for (const [x, y, z] of BALLOON_POS) {
    const bg = new THREE.Group(); bg.position.set(0, 0, 0); body.add(bg);
    const b = new THREE.Mesh(balloonGeo, bMat); b.scale.set(1, 1.2, 1); b.position.set(x, y, z); b.castShadow = true; bg.add(b);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 6), bMat); knot.position.set(x, y - 0.52, z); knot.rotation.x = Math.PI; bg.add(knot);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.75, 1.15), new THREE.Vector3(x, y - 0.55, z)]), strMat); bg.add(line);
    balloons.push({ g: bg, b, base: [x, y, z], ph: Math.random() * 6 });
  }
  mats.push(strMat);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xff9a20, transparent: true, opacity: 0.85 }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(-0.3, 0.55, 1.85); flame.visible = false; body.add(flame);
  let tag = null; if (!isMe) { tag = nameTag(name, color); tag.position.y = 4.1; g.add(tag); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  scene.add(g);
  return { g, body, mats, paint: kt.pintura, kt, balloons, flame, tag, shadow, color, shown: 3, spinA: 0, ghostK: 0, steer: 0, lastYaw: null, sparkT: 0 };
}
function disposeKart(k) { scene.remove(k.g); soltarKart(k.kt); k.g.traverse((o) => { if (o.geometry && o.geometry !== balloonGeo && o.geometry !== partGeo) o.geometry.dispose(); }); }
const _c = new THREE.Color();
// desenha o kart: posição, giro quando leva item, derrapagem, estrela, fantasma, balões
function poseKart(k, s, dt, now) {
  const { x, z, yaw, v, f, balloons } = s, y = s.y || 0;
  k.g.position.set(x, y, z);
  // no ar o bico levanta um pouco; no pouso, dá uma amassadinha
  k.g.rotation.x = lerp(k.g.rotation.x, f & R.FL.air ? 0.18 : 0, 0.15);
  k.shadow.position.y = R.groundAt(x, z) - y + 0.03; // a sombra fica no chão quando o kart voa
  if (k.lastYaw != null) { let d = yaw - k.lastYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); k.steer = lerp(k.steer, clamp(-d / Math.max(dt, 1e-3) / 2.5, -1, 1), 0.2); }
  k.lastYaw = yaw;
  const spin = f & R.FL.spin, drift = f & R.FL.drift;
  if (spin) k.spinA += dt * 13; else k.spinA = Math.abs(k.spinA) > 0.01 ? angLerp(k.spinA, 0, 0.25) : 0;
  k.g.rotation.y = yaw + k.spinA + (drift ? -k.steer * 0.45 : 0);
  k.body.rotation.z = lerp(k.body.rotation.z, (drift ? -0.12 : -0.05) * k.steer * clamp(v / 8, 0, 1), 0.2);
  k.body.position.y = spin ? Math.abs(Math.sin(now / 90)) * 0.35 : 0;
  animarKart(k.kt, (v * dt) / KART_S, k.steer);
  // fantasma: meio transparente e flutuando
  const ghost = !!(f & R.FL.ghost); k.ghostK = lerp(k.ghostK, ghost ? 1 : 0, 0.15);
  const op = 1 - k.ghostK * 0.7;
  for (const m of k.mats) { m.transparent = op < 0.99; m.opacity = op; m.depthWrite = op >= 0.99; }
  if (ghost) k.body.position.y = 0.4 + Math.sin(now / 300) * 0.15;
  // estrela: cores do arco-íris
  if (f & R.FL.star) { _c.setHSL((now / 300) % 1, 1, 0.5); k.paint.emissive.copy(_c); k.paint.emissiveIntensity = 0.9; }
  else k.paint.emissiveIntensity = 0;
  k.flame.visible = !!(f & R.FL.boost); if (k.flame.visible) k.flame.scale.set(1, 0.7 + Math.random() * 0.6, 1);
  // balões balançando; o que estourou some
  const want = ghost ? 0 : balloons;
  k.balloons.forEach((b, i) => {
    const on = i < want; b.g.visible = on;
    if (on) { b.b.position.set(b.base[0] + Math.sin(now / 400 + b.ph) * 0.08, b.base[1] + Math.sin(now / 330 + b.ph) * 0.06, b.base[2] + clamp(v / R.MAX, -1, 1.5) * 0.25); }
  });
  if (k.tag) k.tag.material.opacity = op;
  // faíscas da derrapagem
  k.sparkT -= dt;
  if (drift && k.sparkT <= 0 && !ghost) {
    k.sparkT = 0.04; const c = s.driftT > 1.8 ? "#d06cff" : s.driftT > 0.9 ? "#ff9a20" : "#6cc8ff", sy = Math.sin(yaw), cy = Math.cos(yaw);
    for (const side of [-0.9, 0.9]) burstAt(x + cy * side + sy * 1.0, y + 0.2, z - sy * side + cy * 1.0, [c, "#ffffff"], 2, 3, 0.3, 6, 0.6);
  }
}

// ---------- itens no chão e voando ----------
const projMeshes = new Map();
function makeProj(type) {
  const g = new THREE.Group();
  if (type === "banana") {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 8, 14, Math.PI * 1.1), M(0xffd83a, { roughness: 0.4 }));
    m.rotation.set(0, 0, Math.PI * 0.95); m.position.y = 0.45; m.castShadow = true; g.add(m);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15), M(0x5a3a1a)); tip.position.set(0.42, 0.5, 0); g.add(tip);
  } else if (type === "verde" || type === "vermelho") {
    const c = type === "verde" ? 0x2ecc40 : 0xe53935;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(c, { roughness: 0.3 })); top.castShadow = true; g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 18), M(0xffffff)); rim.rotation.x = Math.PI / 2; g.add(rim);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.2, 16), M(0xfff0c0)); bot.position.y = -0.1; g.add(bot);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.CircleGeometry(0.14, 6), M(0xffffff, { side: THREE.DoubleSide })); const a = (i / 5) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.36, 0.38, Math.sin(a) * 0.36); sp.lookAt(Math.cos(a) * 2, 1.5, Math.sin(a) * 2); top.add(sp); }
    g.userData.spin = true;
  } else if (type === "bomba") {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), M(0x1d1d24, { roughness: 0.3, metalness: 0.3 })); b.castShadow = true; g.add(b);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.2, 10), M(0x888888)); cap.position.y = 0.62; g.add(cap);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd84a })); spark.position.y = 0.85; g.add(spark);
    for (const sx of [-0.2, 0.2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx, 0.15, -0.52); g.add(e); }
    g.userData.spark = spark;
  }
  scene.add(g); return g;
}

// ======================================================================
// Estado do jogo
// ======================================================================
const G = { active: false, practice: false, m: null, me: null, myN: null, buf: [], karts: new Map(), item: null, rollUntil: 0, rollShow: 0, boxHide: [], ghostUntil: 0,
  camYaw: 0, camPos: new THREE.Vector3(), shake: 0, lookBack: false, lastSend: 0, msgUntil: 0, feed: [], counted: -1, overShown: false, last: null, starBeep: 0 };
const keys = {};

function kartsInfo() { return G.practice ? G.m.players : S ? S.karts : []; }
const infoById = (id) => kartsInfo().find((k) => k.id === id);
const infoByN = (n) => kartsInfo().find((k) => k.n === n);
const nowG = () => (G.practice ? Date.now() : sNow());
const matchStart = () => (G.practice ? G.m.start : S && S.match ? S.match.start : 0);
const matchEnd = () => (G.practice ? G.m.end : S && S.match ? S.match.end : 0);

function resetGame() {
  for (const k of G.karts.values()) disposeKart(k); G.karts.clear();
  for (const m of projMeshes.values()) scene.remove(m); projMeshes.clear();
  Object.assign(G, { buf: [], item: null, rollUntil: 0, boxHide: [], ghostUntil: 0, feed: [], counted: -1, overShown: false, last: null, shake: 0, msgUntil: 0 });
  setH("hMsg", ""); $("over").classList.add("hidden"); $("pause").classList.add("hidden");
}
function beginGame() {
  construirArena(G.practice ? store.get("batalha:arena") || "praca" : S.config.arena);
  show("game"); resize(); G.active = true; Sound.engine(true);
  for (const id of ["hItem", "hItemL", "hSpeed"]) $(id).style.display = G.myN != null ? "" : "none";
  const myIdx = Math.max(0, kartsInfo().findIndex((k) => k.n === G.myN));
  if (!G.practice && G.myN != null) { const s = R.SPAWNS[myIdx % 8]; G.me = { x: s[0], y: R.groundAt(s[0], s[1]), z: s[1], yaw: s[2], v: 0, vy: 0, air: false, spinT: 0, boostT: 0, starT: 0, driftT: 0, drifting: false }; }
  if (G.me) { G.camYaw = G.me.yaw; G.camPos.set(G.me.x + Math.sin(G.me.yaw) * 7, (G.me.y || 0) + 3.5, G.me.z + Math.cos(G.me.yaw) * 7); }
  else G.camPos.set(0, 30, 45);
  $("hHint").innerHTML = G.me ? "W/S acelera e freia · A/D vira · Shift derrapa<br>Espaço usa o item · S + Espaço joga para trás · C olha para trás · Esc menu" : "Você está assistindo.";
}
function startOnline() {
  resetGame(); G.practice = false; G.m = null; G.mStart = S.match.start;
  const mine = S.karts.find((k) => ME && k.id === ME.id);
  G.myN = mine ? mine.n : null; G.me = null;
  beginGame();
}
function startPractice() {
  if (G.active && !G.practice) return;
  resetGame(); G.practice = true; R.usarArena(store.get("batalha:arena") || "praca");
  const name = $("hName").value.trim() || (myP() && myP().name) || "Você", color = myP() ? myP().color : store.get("batalha:color") ?? 0;
  const list = [Object.assign(R.newPlayer("me", 0, name, color, 0), { skin: store.get("galera:skin") || "padrao" })];
  let c = 0; for (let i = 0; i < 5; i++) { if (c === color) c++; list.push(Object.assign(R.newPlayer("bot" + i, 100 + i, "🤖 " + BOT_NAMES[i], c++, list.length, true), { skin: BOT_SKINS[i] })); }
  R.usarArena(store.get("batalha:arena") || "praca");
  G.m = R.newMatch(list, Date.now() + 3500, 3 * 60000);
  G.me = G.m.players[0]; G.myN = 0;
  beginGame();
}
function stopGame() {
  if (!G.active) return;
  G.active = false; Sound.engine(false); resetGame(); G.me = null; G.m = null;
  if (G.practice) { G.practice = false; if (S && ME) { show(S.phase === "lobby" ? "lobby" : "home"); if (S.phase === "lobby") renderLobby(); } else show("home"); }
}

// pacotes do servidor (ou do treino): guardo os últimos e desenho os outros um pouquinho no passado
function pushSnap(d) {
  const p = new Map(), o = new Map();
  for (const a of d.p) p.set(a[0], { x: a[1], z: a[2], yaw: a[3], v: a[4], f: a[5], balloons: a[6], points: a[7], y: a[8] || 0 });
  for (const a of d.o) o.set(a[0], { type: R.ITEMS[a[1]], x: a[2], z: a[3], y: a[4] });
  G.buf.push({ t: d.t, p, o, bx: d.bx });
  if (G.buf.length > 40) G.buf.splice(0, G.buf.length - 40);
  G.last = G.buf[G.buf.length - 1];
}
function sample(rt) {
  const B = G.buf; if (!B.length) return null;
  let i = B.findIndex((s) => s.t >= rt);
  if (i === -1) { // sem pacote novo: empurra os karts um pouquinho para a frente
    const L = B[B.length - 1], ex = Math.min(0.15, (rt - L.t) / 1000), p = new Map();
    for (const [n, s] of L.p) p.set(n, { ...s, x: s.x - Math.sin(s.yaw) * s.v * ex, z: s.z - Math.cos(s.yaw) * s.v * ex });
    return { p, o: L.o, bx: L.bx };
  }
  if (i === 0) return B[0];
  const a = B[i - 1], b = B[i], k = (rt - a.t) / Math.max(1, b.t - a.t), p = new Map(), o = new Map();
  for (const [n, s] of b.p) { const q = a.p.get(n); p.set(n, q ? { ...s, x: lerp(q.x, s.x, k), y: lerp(q.y, s.y, k), z: lerp(q.z, s.z, k), yaw: angLerp(q.yaw, s.yaw, k), v: lerp(q.v, s.v, k) } : s); }
  for (const [id, s] of b.o) { const q = a.o.get(id); o.set(id, q ? { ...s, x: lerp(q.x, s.x, k), z: lerp(q.z, s.z, k), y: lerp(q.y, s.y, k) } : s); }
  return { p, o, bx: b.bx };
}

// ---------- o que acontece (vem do servidor, ou do treino) ----------
function feed(text) { G.feed.push({ t: performance.now(), text }); if (G.feed.length > 5) G.feed.shift(); }
function msg(html, ms = 1600) { const e = $("hMsg"); e.innerHTML = e._h = html; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); G.msgUntil = performance.now() + ms; }
function distTo(x, z) { const c = G.me || { x: cam.position.x, z: cam.position.z }; return Math.hypot(x - c.x, z - c.z); }
const near = (x, z) => clamp(1.3 - distTo(x, z) / 40, 0.15, 1);
const nm = (id) => { const k = infoById(id); return k ? h(k.name) : "?"; };
function kartPos(id) { const k = infoById(id), s = k && G.last && G.last.p.get(k.n); return k && k.n === G.myN && G.me ? G.me : s; }
const pev = (type, d) => onEv({ type, ...d }); // no treino as regras avisam do mesmo jeito que o servidor
function onEv(e) {
  const mine = (id) => { const k = infoById(id); return k && k.n === G.myN; };
  if (e.type === "caixa") {
    const b = R.BOXES[e.i]; if (b) { burstAt(b[0], R.boxY(e.i) + 1.3, b[1], ["#ff5f5f", "#ffd84a", "#5fff8f", "#5fc8ff", "#c45fff"], 16, 6, 0.6); G.boxHide[e.i] = nowG() + 400; }
    if (mine(e.id)) { G.item = e.item; G.rollUntil = performance.now() + 1100; if (!G.boxPred) Sound.box(); }
    else if (b && distTo(b[0], b[1]) < 20) Sound.poof(0.5);
    G.boxPred = false;
  } else if (e.type === "usou") {
    const p = kartPos(e.id);
    if (mine(e.id)) {
      G.item = null;
      if (e.item === "cogumelo") { G.me.boostT = 1.5; Sound.boost(); }
      else if (e.item === "estrela") { G.me.starT = 6; Sound.star(); }
      else Sound.throw();
    } else { if (p) Sound.throw(near(p.x, p.z) * 0.6); }
    if (p && (e.item === "cogumelo")) burstAt(p.x, (p.y || 0) + 0.6, p.z, ["#ff9a20", "#ffd84a"], 12, 4, 0.5);
  } else if (e.type === "estourou") {
    const k = infoById(e.to), col = k ? R.COLORS[k.color] : "#fff";
    burstAt(e.x, (e.y || 0) + 2.6, e.z, [col, "#ffffff", col, "#ffd84a"], 26, 7, 1.0, 7);
    Sound.pop(near(e.x, e.z));
    const kv = k && G.karts.get(k.n); if (kv) { kv.shown = e.left; kv.ovUntil = performance.now() + 700; } // some na hora, sem esperar o pacote
    if (mine(e.to)) {
      G.me.spinT = 1.2; G.me.boostT = 0; G.me.v *= 0.4; G.shake = 0.5; Sound.spin();
      $("flash").style.opacity = 1; setTimeout(() => ($("flash").style.opacity = 0), 250);
      if (e.left > 0) msg(`💥 Perdeu um balão!<small>${e.by ? nm(e.by) + " acertou você" : "Cuidado!"} · sobraram ${e.left}</small>`);
    }
    if (mine(e.by)) { msg(`+1 🎈<small>você estourou o balão de ${nm(e.to)}</small>`, 1300); Sound.score(); }
    const how = { banana: "🍌", verde: "🟢", vermelho: "🔴", bomba: "💣", estrela: "⭐", cogumelo: "🍄", queda: "😵" }[e.cause] || "💥";
    feed(e.by ? `${nm(e.by)} ${how} ${nm(e.to)}` : `${how} ${nm(e.to)}`);
  } else if (e.type === "fantasma") {
    if (mine(e.id)) { G.ghostUntil = performance.now() + R.GHOST_MS; G.item = null; Sound.ghost(); msg(`👻 Virou fantasma!<small>perdeu ${e.lost} ponto${e.lost === 1 ? "" : "s"} · volta em 8 segundos</small>`, 2600); }
    feed(`👻 ${nm(e.id)} virou fantasma`);
  } else if (e.type === "caiu") { // caiu no buraco: volta na largada mais perto
    if (mine(e.id)) {
      if (!G.practice && G.me) Object.assign(G.me, { x: e.x, y: e.y, z: e.z, yaw: e.yaw, v: 0, vy: 0, air: false });
      if (G.me) { G.camYaw = e.yaw; G.camPos.set(e.x + Math.sin(e.yaw) * 7, (e.y || 0) + 3.5, e.z + Math.cos(e.yaw) * 7); }
      msg("😵 Caiu!<small>perdeu um balão</small>", 1400); Sound.ghost?.();
    }
    feed(`😵 ${nm(e.id)} caiu`);
  } else if (e.type === "voltou") {
    if (mine(e.id)) { G.ghostUntil = 0; Sound.back(); msg("🎈🎈🎈<small>De volta com 3 balões!</small>", 1400); }
  } else if (e.type === "bum") {
    explosion(e.x, e.z, (e.y || 0.4) - 0.4); Sound.boom(near(e.x, e.z));
    if (distTo(e.x, e.z) < 20) G.shake = Math.max(G.shake, 0.8 * (1 - distTo(e.x, e.z) / 20));
  } else if (e.type === "poof") {
    burstAt(e.x, (e.y || 0.5) + 0.1, e.z, ["#ffffff", "#cccccc"], 10, 3, 0.5, 2); Sound.poof(near(e.x, e.z) * 0.6);
  }
}

// ======================================================================
// Controles
// ======================================================================
addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.target && e.target.tagName === "INPUT") return;
  if (e.code === "Escape") { togglePause(); return; }
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === "Space" || e.code === "KeyE") useItem();
  if (e.code === "KeyC") G.lookBack = true;
});
addEventListener("keyup", (e) => { keys[e.code] = false; if (e.code === "KeyC") G.lookBack = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
function useItem() {
  if (!G.me || !G.item || performance.now() < G.rollUntil || G.me.spinT > 0 || nowG() < matchStart()) return;
  const back = !!(keys.KeyS || keys.ArrowDown);
  if (G.practice) R.useItem(G.m, G.me, back, Date.now(), pev);
  else socket.emit("use", { back });
}
// botões na tela (celular): joystick acelera/freia/vira; item (com o joystick para baixo, joga para trás), derrapagem e olhar para trás
const TOUCH = window.Toque && Toque.setup({
  buttons: [{ icon: "💨", label: "derrapar", code: "ShiftLeft" }, { icon: "👀", label: "trás", code: "KeyC" }, { icon: "🎁", label: "item", code: "Space", big: true }],
  top: [{ icon: "⏸", code: "Escape" }],
  topStyle: "left:50%;right:auto;top:auto;bottom:16px;transform:translateX(-50%);flex-direction:row",
});
function togglePause(force) {
  const p = $("pause"), open = force ?? p.classList.contains("hidden");
  p.classList.toggle("hidden", !open);
  if (open) { $("vol").value = Sound.vol; $("volV").textContent = Math.round(Sound.vol * 100) + "%"; $("pauseSb").innerHTML = scoreTable(); $("pauseHint").textContent = G.practice ? "Treino contra robôs" : `Sala ${ME ? ME.code : ""}`; }
}
$("btnResume").onclick = () => { togglePause(false); if (TOUCH) Toque.fullscreen(); };
$("vol").oninput = (e) => { Sound.setVol(+e.target.value); $("volV").textContent = Math.round(+e.target.value * 100) + "%"; };
$("btnLeave").onclick = () => {
  if (G.practice) { stopGame(); return; }
  if (confirm("Sair da arena? A batalha continua sem você.")) { socket.disconnect(); leaveRoom(); socket.connect(); }
};
function standings() {
  const L = G.last;
  return kartsInfo().map((k) => { const s = L && L.p.get(k.n); return { ...k, points: s ? s.points : k.points || 0, balloons: s ? s.balloons : 3, ghost: s ? !!(s.f & R.FL.ghost) : false }; })
    .sort((a, b) => b.points - a.points);
}
function scoreTable(list = standings(), final = false) {
  return `<table class="sb"><tr><th>#</th><th>Piloto</th><th class="n">Pontos</th><th class="n">${final ? "Estourou" : "Balões"}</th></tr>${list.map((k, i) =>
    `<tr class="${k.n === G.myN || (final && ME && k.id === ME.id) ? "me" : ""}"><td>${i + 1}</td><td><i class="sw" style="background:${R.COLORS[k.color]}"></i>${h(k.name)}</td><td class="n">${k.points}</td><td class="n">${final ? k.pops : "🎈".repeat(Math.max(0, k.balloons)) || "👻"}</td></tr>`).join("")}</table>`;
}
function showOver() {
  if (G.overShown) return; G.overShown = true;
  const res = G.practice ? [...G.m.players].sort((a, b) => b.points - a.points || b.pops - a.pops) : S.results || [];
  const w = res[0], meWon = w && (G.practice ? w.id === "me" : ME && w.id === ME.id), isHost = !G.practice && ME && S.host === ME.id;
  Sound.end();
  $("overBox").innerHTML = `<h2>${meWon ? "🏆 Você venceu!" : w ? `🏆 ${h(w.name)} venceu!` : "Fim!"}</h2><p class="muted" style="margin:0">Fim da batalha. Pontos = balões estourados (quem virou fantasma perdeu metade).</p>
    ${scoreTable(res, true)}
    <div class="row" style="margin-top:12px">${G.practice ? `<button class="primary" id="btnAgain">Jogar de novo</button><button id="btnOut">Sair</button>`
      : isHost ? `<button class="primary" id="btnAgain">Jogar de novo</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}</div>`;
  $("over").classList.remove("hidden");
  if ($("btnAgain")) $("btnAgain").onclick = () => { if (G.practice) { G.active = false; startPractice(); } else act("start"); };
  if ($("btnOut")) $("btnOut").onclick = () => stopGame();
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
}

// ======================================================================
// Laço principal
// ======================================================================
function resize() { const w = innerWidth, hh = innerHeight; renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
addEventListener("resize", resize);
const q = (v) => Math.round(v * 100) / 100;
let lastT = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const tNow = performance.now(), dt = Math.min(0.05, (tNow - lastT) / 1000); lastT = tNow;
  if (!G.active) return;
  if (TOUCH) { const want = !!G.me && $("pause").classList.contains("hidden") && $("over").classList.contains("hidden"); if (Toque.on !== want) Toque.show(want); }
  const now = nowG(), started = now >= matchStart(), over = G.practice ? G.m.over : S && S.phase === "over";
  // ---- meu kart ----
  const me = G.me;
  if (me) {
    const ctl = started && !over && $("pause").classList.contains("hidden");
    const inp = ctl ? { thr: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), steer: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), drift: !!(keys.ShiftLeft || keys.ShiftRight) } : { thr: 0, steer: 0, drift: false };
    const wasBoost = me.boostT > 0;
    if (started && !over) R.moveKart(me, inp, dt);
    if (!wasBoost && me.boostT > 0) Sound.boost(); // mini-turbo da derrapagem
    if (me.landed) { if (me.landed > 6) { Sound.bump(); burstAt(me.x, (me.y || 0) + 0.2, me.z, ["#d8d0e8", "#ffffff"], 12, 4, 0.5, 6); G.shake = Math.max(G.shake, Math.min(0.4, me.landed / 40)); } me.landed = 0; }
    // empurra para fora dos outros karts (no treino, os robôs também levam o empurrão)
    if (G.last) for (const [n, s] of G.last.p) {
      if (n === G.myN || (s.f & R.FL.ghost) || myGhost()) continue;
      const dx = me.x - s.x, dz = me.z - s.z, d = Math.hypot(dx, dz);
      if (Math.abs((me.y || 0) - (s.y || 0)) > 1.5) continue;
      if (d < 2.1 && d > 1e-3) { me.x = s.x + dx / d * 2.1; me.z = s.z + dz / d * 2.1; if (me.starT <= 0) { if (Math.abs(me.v) > 4) Sound.bump(); me.v *= 0.6; } }
    }
    // caixa: quebra na hora (o servidor confirma em seguida)
    if (!G.item && !myGhost()) R.BOXES.forEach(([bx, bz], i) => {
      if ((G.boxHide[i] || 0) > now || (G.last && G.last.bx[i] === "0")) return;
      if (Math.hypot(me.x - bx, me.z - bz) < 2.2 && Math.abs((me.y || 0) - R.boxY(i)) < 2) { G.boxHide[i] = now + 500; burstAt(bx, R.boxY(i) + 1.3, bz, ["#ff5f5f", "#ffd84a", "#5fff8f", "#5fc8ff"], 10, 5, 0.5); Sound.box(); G.boxPred = true; }
    });
    if (!G.practice && tNow - G.lastSend > 33 && started) { G.lastSend = tNow; socket.volatile.emit("st", { x: q(me.x), y: q(me.y || 0), z: q(me.z), yaw: q(me.yaw), v: q(me.v), f: (me.drifting ? R.FL.drift : 0) | (me.air ? R.FL.air : 0) }); }
    Sound.rev(me.v, me.boostT > 0);
    if (me.starT > 0 && tNow - G.starBeep > 320) { G.starBeep = tNow; Sound.star(); }
  }
  // ---- treino: robôs, itens e regras rodam aqui mesmo ----
  if (G.practice && !G.m.over) {
    const m = G.m, t = Date.now();
    if (t >= m.start) {
      for (const k of m.players) {
        if (!k.bot) continue;
        const inp = R.botInput(m, k, t); R.moveKart(k, inp, dt);
        if (inp.fire) R.useItem(m, k, inp.back, t, pev);
      }
      for (const k of m.players) if (!R.ghost(k, t)) for (let i = 0; i < R.BOXES.length; i++) if (R.pickBox(m, k, i, t, pev, 0)) break;
      R.tick(m, t, dt, pev);
    }
    pushSnap({ t, ...R.snap(m, t) });
    if (m.over) showOver();
  }
  // ---- desenhar todos ----
  const smp = sample(G.practice ? now : now - INTERP);
  if (smp) {
    const seen = new Set();
    for (const [n, s] of smp.p) {
      seen.add(n);
      let k = G.karts.get(n);
      if (!k) { const inf = infoByN(n); k = makeKart(inf ? inf.color : 0, inf ? inf.name : "?", n === G.myN, inf && inf.skin); G.karts.set(n, k); }
      const nb = shownBalloons(k, s, tNow);
      if (n === G.myN && me) poseKart(k, { x: me.x, y: me.y || 0, z: me.z, yaw: me.yaw, v: me.v, f: (me.air ? R.FL.air : 0) | (me.drifting ? R.FL.drift : 0) | (me.spinT > 0 ? R.FL.spin : 0) | (myGhost() ? R.FL.ghost : 0) | (me.starT > 0 ? R.FL.star : 0) | (me.boostT > 0 ? R.FL.boost : 0), balloons: nb, driftT: me.driftT }, dt, tNow);
      else poseKart(k, { ...s, balloons: nb, driftT: 0.5 }, dt, tNow);
    }
    for (const [n, k] of G.karts) if (!seen.has(n)) { disposeKart(k); G.karts.delete(n); }
    const pseen = new Set();
    for (const [id, s] of smp.o) {
      pseen.add(id);
      let m = projMeshes.get(id); if (!m) { m = makeProj(s.type); projMeshes.set(id, m); }
      m.position.set(s.x, s.type === "banana" ? s.y : s.type === "bomba" ? s.y + 0.2 : s.y - 0.1, s.z);
      if (m.userData.spin) m.rotation.y += dt * 14;
      if (m.userData.spark) m.userData.spark.visible = Math.floor(tNow / 90) % 2 === 0;
    }
    for (const [id, m] of projMeshes) if (!pseen.has(id)) { scene.remove(m); projMeshes.delete(id); }
    boxMeshes.forEach((b, i) => {
      b.visible = smp.bx[i] === "1" && !((G.boxHide[i] || 0) > now); b.rotation.y += dt * 1.2; b.rotation.x = Math.sin(tNow / 700 + i) * 0.3; b.position.y = b.userData.y + Math.sin(tNow / 400 + i) * 0.15;
    });
  }
  stepFx(dt);
  // ---- câmera: atrás do meu kart (ou do líder, para quem assiste) ----
  let tgt = me;
  if (!tgt && smp) { const lead = standings()[0], s = lead && smp.p.get(lead.n); tgt = s || null; }
  if (tgt) {
    G.camYaw = angLerp(G.camYaw, tgt.yaw + (G.lookBack ? Math.PI : 0), G.lookBack ? 1 : 1 - Math.exp(-dt * 5));
    const fx = -Math.sin(G.camYaw), fz = -Math.cos(G.camYaw), speedK = clamp(Math.abs(tgt.v || 0) / R.MAX, 0, 1.5);
    const ty = tgt.y || 0, dist = 6.6 + speedK * 1.2, want = new THREE.Vector3(tgt.x - fx * dist, ty + 5.2 + speedK * 0.3, tgt.z - fz * dist); // alta, olhando para baixo: dá para ver o que vem na frente
    want.y = Math.max(want.y, R.groundAt(want.x, want.z) + 1.6); // a câmera não entra no planalto
    // não deixa a câmera atravessar o muro
    want.x = clamp(want.x, -R.HALF - 3, R.HALF + 3); want.z = clamp(want.z, -R.HALF - 3, R.HALF + 3);
    G.camPos.lerp(want, G.lookBack ? 1 : 1 - Math.exp(-dt * 8));
    cam.position.copy(G.camPos);
    if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt); cam.position.x += (Math.random() - 0.5) * G.shake; cam.position.y += (Math.random() - 0.5) * G.shake; }
    cam.lookAt(tgt.x + fx * 7, ty + 0.6, tgt.z + fz * 7);
    cam.fov = lerp(cam.fov, 72 + (me && me.boostT > 0 ? 10 : 0) + speedK * 4, 0.1); cam.updateProjectionMatrix();
  } else { cam.position.set(0, 40, 50); cam.lookAt(0, 0, 0); }
  renderer.render(scene, cam);
  hud(now, started, over, tNow);
}
const shownBalloons = (k, s, tNow) => ((k.ovUntil || 0) > tNow ? Math.min(s.balloons, k.shown) : s.balloons);
function myGhost() { if (G.practice) return G.me && R.ghost(G.me, Date.now()); const s = G.last && G.last.p.get(G.myN); return performance.now() < G.ghostUntil || !!(s && (s.f & R.FL.ghost)); }

// minimapa: relevo (mais alto = mais claro), caixas e karts
function fazerMini() {
  const c = document.createElement("canvas"); c.width = c.height = 150; const x = c.getContext("2d"), k = 150 / (R.HALF * 2);
  x.fillStyle = "#2a1f45"; x.fillRect(0, 0, 150, 150);
  for (let i = 0; i < 75; i++) for (let j = 0; j < 75; j++) { const h = R.groundAt((i * 2 + 1) / k / 1 - R.HALF, (j * 2 + 1) / k - R.HALF); if (h <= R.VAZIO + 1) { x.fillStyle = "#0a0614"; x.fillRect(i * 2, j * 2, 2, 2); } else if (h > 0.05) { x.fillStyle = `hsl(265,40%,${Math.min(80, 32 + h * 9)}%)`; x.fillRect(i * 2, j * 2, 2, 2); } }
  x.fillStyle = "#cfc6e6"; for (const b of R.BLOCKS) x.fillRect((b[0] + R.HALF) * k, (b[1] + R.HALF) * k, (b[2] - b[0]) * k, (b[3] - b[1]) * k);
  return c;
}
function drawMini(L) {
  const x = $("hMini").getContext("2d"), k = 150 / (R.HALF * 2), P = (v) => (v + R.HALF) * k;
  x.drawImage(miniBase ||= fazerMini(), 0, 0);
  if (!L) return;
  x.fillStyle = "#ffd84a"; R.BOXES.forEach(([bx, bz], i) => { if (L.bx[i] === "1") x.fillRect(P(bx) - 1.5, P(bz) - 1.5, 3, 3); });
  for (const [n, s] of L.p) {
    const inf = infoByN(n), me = n === G.myN && G.me, p = me ? G.me : s;
    x.globalAlpha = s.f & R.FL.ghost ? 0.4 : 1; x.fillStyle = inf ? R.COLORS[inf.color] : "#fff"; x.strokeStyle = me ? "#fff" : "#000"; x.lineWidth = me ? 2 : 1;
    x.beginPath(); x.arc(P(p.x), P(p.z), me ? 4.5 : 3.5, 0, 7); x.fill(); x.stroke();
    if (me) { x.beginPath(); x.moveTo(P(p.x), P(p.z)); x.lineTo(P(p.x - Math.sin(p.yaw) * 8), P(p.z - Math.cos(p.yaw) * 8)); x.stroke(); }
  }
  x.globalAlpha = 1;
}
function hud(now, started, over, tNow) {
  drawMini(G.last);
  const left = Math.max(0, matchEnd() - now), mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  setH("hClock", started ? `${mm}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`);
  $("hClock").style.color = started && left < 30000 ? "#ff7a7a" : "";
  // contagem 3, 2, 1, VAI!
  if (!started) { const c = Math.ceil((matchStart() - now) / 1000); if (c !== G.counted && c <= 3) { G.counted = c; msg(c > 0 ? String(c) : "", 900); Sound.beep(false); } }
  else if (G.counted > 0) { G.counted = 0; msg("VAI! 🎈", 900); Sound.beep(true); }
  if (tNow > G.msgUntil && $("hMsg").innerHTML) setH("hMsg", "");
  setH("hPing", G.practice ? "TREINO" : `${Math.round(relogio.rtt)} ms`);
  const L = G.last, mine = L && L.p.get(G.myN);
  if (G.me && mine) {
    const ghost = myGhost(), k = G.karts.get(G.myN), b = ghost ? 0 : k ? shownBalloons(k, mine, tNow) : mine.balloons;
    setH("hMe", `<div class="balloons">${[0, 1, 2].map((i) => `<i class="${i < b ? "" : "gone"}">${ghost ? "👻" : "🎈"}</i>`).join("")}</div><div class="pts">${mine.points}<small>ponto${mine.points === 1 ? "" : "s"}</small></div>`);
    // item: a roleta gira enquanto o servidor confirma; depois mostra o item
    const rolling = tNow < G.rollUntil, it = $("hItem");
    it.classList.toggle("rolling", rolling); it.classList.toggle("ready", !!G.item && !rolling);
    if (rolling) { const idx = Math.floor(tNow / 80) % R.ITEMS.length; if (idx !== G.rollShow) { G.rollShow = idx; Sound.tick(); } setH("hItem", ICON[R.ITEMS[idx]]); }
    else setH("hItem", G.item ? ICON[G.item] : "");
    if (!rolling && G.item && it._was !== G.item) { it._was = G.item; Sound.ding(); }
    if (!G.item) it._was = null;
    setH("hItemL", ghost ? `👻 ${Math.max(0, Math.ceil((G.practice ? G.me.ghostUntil - Date.now() : G.ghostUntil - tNow) / 1000))} s` : G.item && !rolling ? h(R.ITEM_NAMES[G.item]) + "<br><span style='opacity:.8'>Espaço</span>" : "");
    $("hSpeed").firstElementChild.style.width = clamp(Math.abs(G.me.v) / (R.MAX * 1.45), 0, 1) * 100 + "%";
  } else { setH("hMe", ""); setH("hItem", ""); setH("hItemL", ""); }
  setH("hRank", standings().map((k) => `<div class="${k.n === G.myN ? "me" : ""} ${k.ghost ? "gh" : ""}"><i style="background:${R.COLORS[k.color]}"></i>${h(k.name)} <span class="bl">${k.ghost ? "👻" : "🎈".repeat(Math.max(0, k.balloons))}</span><b>${k.points}</b></div>`).join(""));
  const tf = performance.now();
  setH("hFeed", G.feed.filter((f) => tf - f.t < 5000).map((f) => `<div>${f.text}</div>`).join(""));
  if (over && G.practice) showOver();
}
requestAnimationFrame(frame);
if (location.hash === "#debug") window.__batalha = { G, R, onEv, scene, useItem, keys };
