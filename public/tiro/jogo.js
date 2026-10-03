// Tiro da Galera — o jogo no navegador: menus, 3D (Three.js), movimento, armas, sons e rede.
// O movimento do meu boneco roda aqui (física em arena.js) e vai para o servidor ~30x por segundo.
// Os outros aparecem 100 ms "no passado", interpolados entre as posições recebidas (fica liso mesmo com ping).
// O servidor confere os tiros voltando no tempo esses mesmos 100 ms + meio ping, então o que você vê é o que vale.
import * as THREE from "three";
import { Ragdoll } from "/ragdoll.js";

const AR = window.Arena, WP = AR.WEAPONS;
const { $, h, store } = Comum;
const setH = (id, html) => { const e = $(id); if (e._h !== html) { e._h = html; e.innerHTML = html; } }; // só mexe no HTML quando muda
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const TEAM = { A: "Azul", B: "Laranja" };
const INTERP = 100; // ms que os outros ficam "no passado"
const toast = Comum.criarToast(3200);

// ======================================================================
// Rede
// ======================================================================
const socket = io("/tiro");
let S = null, ME = null;
const relogio = Comum.relogio(), sNow = relogio.agora;
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const P = (id) => S && S.players.find((p) => p.id === id);
const act = Comum.criarAct(socket, toast);
// acerta o relógio com o do servidor (fica com a medida de menor ping, que é a mais precisa)
const syncClock = (n) => relogio.sincronizar(socket, n);
socket.on("png", (ack) => typeof ack === "function" && ack());

// ---------- entrar / criar ----------
let urlCode = new URLSearchParams(location.search).get("sala");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("tiro:" + r.code, ME);
  history.replaceState(null, "", "/tiro/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: store.get("tiro:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("tiro:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/tiro/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("tiro:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("kicked", () => { toast("O organizador tirou você da sala."); urlCode = null; ME = null; S = null; history.replaceState(null, "", "/tiro/"); $("roomTag").classList.add("hidden"); stopGame(); show("home"); });
function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- sala de espera ----------
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, size = S.config.size;
  const row = (p) => `<div class="pl ${p.id === (ME && ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}<span class="w">${WP[p.w].name}</span>${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const list = S.players.filter((p) => p.team === t);
    $("t" + t).innerHTML = list.map(row).join("") + Array.from({ length: Math.max(0, size - list.length) }, () => `<div class="pl muted" style="font-weight:500">vaga livre</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || list.length >= size);
  }
  const bench = S.players.filter((p) => !p.team);
  $("tN").innerHTML = bench.length ? bench.map(row).join("") : "Ninguém no banco.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  $("myW").classList.toggle("hidden", !mine);
  document.querySelectorAll("#myW .wcard").forEach((b) => b.classList.toggle("on", !!mine && b.dataset.w === mine.w));
  document.querySelectorAll("#cfgSize button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === size); b.disabled = !isHost; });
  document.querySelectorAll("#cfgRounds button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === S.config.rounds); b.disabled = !isHost; });
  const a = S.players.filter((p) => p.team === "A").length, b = S.players.filter((p) => p.team === "B").length;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${a && b ? "" : "disabled"}>Começar partida</button>${a && b ? (a !== b ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Times desiguais (${a} x ${b}). Dá pra jogar assim mesmo.</p>` : "") : `<p class="muted" style="font-size:13px;margin:8px 0 0">Precisa de pelo menos 1 jogador em cada time. Mande o convite!</p>`}`
    : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
  document.querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
document.querySelectorAll("#myW .wcard").forEach((b) => (b.onclick = () => act("weapon", { w: b.dataset.w })));
function setCfg(k, v) { const c = { ...S.config, [k]: v }; store.set("tiro:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgRounds button").forEach((b) => (b.onclick = () => setCfg("rounds", +b.dataset.v)));
$("btnPractice").onclick = () => startGame("treino");
$("btnPractice2").onclick = () => startGame("treino");

// ======================================================================
// Sons (tudo sintetizado com WebAudio: sem arquivos para baixar)
// ======================================================================
const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("tiro:vol") ?? 0.7;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
      const len = ac.sampleRate; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function out(gain, pan) {
    const c = ac, g = c.createGain(); g.gain.value = gain;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(master); } else g.connect(master);
    return g;
  }
  function burst({ dur, f0, f1, gain, pan = 0, type = "lowpass", q = 0.7, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out(gain, pan)); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function tone({ f0, f1 = f0, dur, gain, type = "sine", pan = 0, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out(gain, pan)); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("tiro:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    // k: 0..1 volume pela distância; muffle: abafa o som de longe
    shot(w, k = 1, pan = 0) {
      if (k < 0.02) return;
      if (w === "faca") { burst({ dur: 0.14, f0: 2500, f1: 6000, gain: 0.18 * k, pan, type: "bandpass", q: 1.5 }); return; }
      if (w === "deagle") {
        burst({ dur: 0.25, f0: 4800, f1: 500, gain: 0.75 * k, pan }); tone({ f0: 130, f1: 38, dur: 0.18, gain: 0.7 * k, pan });
        burst({ dur: 0.45, f0: 1000, f1: 180, gain: 0.18 * k, pan, at: 0.05 }); return;
      }
      if (w === "awp") {
        burst({ dur: 0.7, f0: 4200, f1: 260, gain: 0.9 * k, pan }); tone({ f0: 110, f1: 32, dur: 0.35, gain: 0.8 * k, pan });
        burst({ dur: 0.9, f0: 900, f1: 120, gain: 0.25 * k, pan, at: 0.09 });
      } else {
        burst({ dur: 0.16, f0: 5200, f1: 700, gain: 0.55 * k, pan }); tone({ f0: 150, f1: 45, dur: 0.11, gain: 0.55 * k, pan });
        burst({ dur: 0.3, f0: 1200, f1: 200, gain: 0.12 * k, pan, at: 0.04 });
      }
    },
    step(k = 1, pan = 0) { if (k > 0.03) burst({ dur: 0.07, f0: 900, f1: 300, gain: 0.25 * k, pan, type: "bandpass", q: 1.4 }); },
    land() { burst({ dur: 0.1, f0: 600, f1: 150, gain: 0.3, type: "bandpass" }); },
    hit(head) { if (head) { tone({ f0: 2400, f1: 2100, dur: 0.12, gain: 0.25 }); tone({ f0: 3600, dur: 0.08, gain: 0.12 }); } else burst({ dur: 0.06, f0: 1500, f1: 400, gain: 0.35, type: "bandpass", q: 2 }); },
    hurt() { burst({ dur: 0.12, f0: 700, f1: 200, gain: 0.5 }); tone({ f0: 180, f1: 90, dur: 0.15, gain: 0.25 }); },
    kill() { tone({ f0: 880, dur: 0.12, gain: 0.18, type: "triangle" }); tone({ f0: 1320, dur: 0.18, gain: 0.18, type: "triangle", at: 0.09 }); },
    dry() { tone({ f0: 1800, f1: 1200, dur: 0.03, gain: 0.15, type: "square" }); },
    stab() { burst({ dur: 0.08, f0: 900, f1: 300, gain: 0.45 }); tone({ f0: 160, f1: 90, dur: 0.09, gain: 0.3 }); },
    reload(w) { const T = WP[w].reload; [0.25, T * 0.45, T * 0.8].forEach((at, i) => { burst({ dur: 0.05, f0: 3000, f1: 1500, gain: 0.25, type: "bandpass", q: 3, at }); tone({ f0: i === 2 ? 500 : 900, dur: 0.04, gain: 0.1, type: "square", at }); }); },
    zoom() { tone({ f0: 1500, f1: 1100, dur: 0.04, gain: 0.08, type: "square" }); },
    round() { tone({ f0: 660, dur: 0.12, gain: 0.15, type: "triangle" }); tone({ f0: 990, dur: 0.2, gain: 0.15, type: "triangle", at: 0.13 }); },
    win(good) { (good ? [523, 659, 784, 1047] : [440, 370, 311]).forEach((f, i) => tone({ f0: f, dur: 0.18, gain: 0.15, type: "triangle", at: i * 0.12 })); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

// ======================================================================
// 3D: renderizador, céu, luz e a arena
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9e4ec, 60, 190);
const cam = new THREE.PerspectiveCamera(74, 1, 0.1, 500); cam.rotation.order = "YXZ";
const BASE_FOV = 74, ZOOM_FOV = [74, 30, 8];

{ // céu: degradê numa esfera grande, sem neblina
  const g = new THREE.SphereGeometry(420, 32, 16), col = [], pos = g.attributes.position;
  const top = new THREE.Color(0x3d7fd1), mid = new THREE.Color(0x9cc6ec), low = new THREE.Color(0xf0dcc0);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 420, c = y > 0.1 ? mid.clone().lerp(top, Math.min(1, (y - 0.1) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.15, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);
  // sol
  const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
  sun.position.set(160, 260, 100); sun.lookAt(0, 0, 0); scene.add(sun);
}
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0xb08a5a, 1.5));
const sunL = new THREE.DirectionalLight(0xfff0d6, 2.6);
sunL.position.set(24, 40, 15); sunL.castShadow = true;
Object.assign(sunL.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 1, far: 120 });
sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
scene.add(sunL);

// ---------- texturas desenhadas no canvas ----------
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
function canvasTex(size, draw) {
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size, rng(size * 7 + draw.length));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function speckle(x, s, r, n, cols) { for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; const z = 1 + r() * 3; x.fillRect(r() * s, r() * s, z, z); } }
const shade = (hex, k, r) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (r() - 0.5) * k); return "#" + c.getHexString(); };
const TEX = {
  chao: canvasTex(512, (x, s, r) => { // lajotas de 1 m (a textura cobre 4 m)
    const t = s / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = shade("#cbb083", 0.08, r); x.fillRect(i * t, j * t, t, t); }
    speckle(x, s, r, 5000, ["#0000000f", "#ffffff14", "#7a5b3322"]);
    x.fillStyle = "#8f7651"; for (let i = 0; i <= 4; i++) { x.fillRect(i * t - 2, 0, 4, s); x.fillRect(0, i * t - 2, s, 4); }
  }),
  muro: canvasTex(512, (x, s, r) => { // tijolos de arenito 1 m x 0,5 m (a textura cobre 2 m)
    x.fillStyle = "#b89a68"; x.fillRect(0, 0, s, s);
    const bw = s / 2, bh = s / 4;
    for (let j = 0; j < 4; j++) for (let i = -1; i < 3; i++) {
      const ox = (j % 2) * bw / 2 + i * bw;
      const g = x.createLinearGradient(0, j * bh, 0, (j + 1) * bh); const c = shade("#dcc08c", 0.09, r); g.addColorStop(0, c); g.addColorStop(1, shade(c, 0.06, () => 0.2));
      x.fillStyle = g; x.fillRect(ox + 3, j * bh + 3, bw - 6, bh - 6);
    }
    speckle(x, s, r, 6000, ["#0000000c", "#ffffff12", "#80603018"]);
  }),
  concreto: canvasTex(512, (x, s, r) => {
    x.fillStyle = "#a9a59d"; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.02 + r() * 0.04})`; x.beginPath(); x.arc(r() * s, r() * s, 10 + r() * 60, 0, 7); x.fill(); }
    speckle(x, s, r, 7000, ["#00000012", "#ffffff10"]);
    x.fillStyle = "#00000030"; x.fillRect(s / 2 - 1, 0, 3, s); x.fillRect(0, s - 3, s, 3);
  }),
  caixa: canvasTex(256, (x, s, r) => { // caixote de madeira: tábuas, moldura e a travessa em diagonal
    for (let i = 0; i < 5; i++) { x.fillStyle = shade("#a8743c", 0.08, r); x.fillRect(0, i * s / 5, s, s / 5); x.fillStyle = "#00000040"; x.fillRect(0, i * s / 5, s, 2); }
    for (let i = 0; i < 300; i++) { x.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.1})`; x.beginPath(); const y = r() * s; x.moveTo(0, y); x.bezierCurveTo(s / 3, y + r() * 6 - 3, s * 2 / 3, y + r() * 6 - 3, s, y); x.stroke(); }
    const f = 26; x.fillStyle = "#7d5128"; x.fillRect(0, 0, s, f); x.fillRect(0, s - f, s, f); x.fillRect(0, 0, f, s); x.fillRect(s - f, 0, f, s);
    x.save(); x.translate(s / 2, s / 2); x.rotate(-Math.PI / 4); x.fillRect(-s * 0.7, -f / 2, s * 1.4, f); x.restore();
    x.strokeStyle = "#00000055"; x.lineWidth = 3; x.strokeRect(1.5, 1.5, s - 3, s - 3); x.strokeRect(f, f, s - 2 * f, s - 2 * f);
    x.fillStyle = "#2b2b2b"; for (const [a, b] of [[13, 13], [s - 13, 13], [13, s - 13], [s - 13, s - 13]]) { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); }
  }),
};
const MAT = {
  muro: new THREE.MeshStandardMaterial({ map: TEX.muro, roughness: 0.95 }),
  concreto: new THREE.MeshStandardMaterial({ map: TEX.concreto, roughness: 0.9 }),
  caixa: new THREE.MeshStandardMaterial({ map: TEX.caixa, roughness: 0.8 }),
  topo: new THREE.MeshStandardMaterial({ color: 0xa88a5c, roughness: 0.9 }),
};
const TEX_M = { muro: 2, concreto: 2, caixa: 1.2 }; // quantos metros cada repetição da textura cobre
function boxGeo(w, hh, d, tm) { // caixa com a textura repetida pelo tamanho real de cada face
  const g = new THREE.BoxGeometry(w, hh, d), uv = g.attributes.uv, dims = [[d, hh], [d, hh], [w, d], [w, d], [w, hh], [w, hh]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tm, uv.getY(k) * dims[f][1] / tm); }
  return g;
}
const solids = [];
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(AR.HALF_X * 2 + 2, AR.HALF_Z * 2 + 2), new THREE.MeshStandardMaterial({ map: TEX.chao, roughness: 0.95 }));
  floor.material.map = TEX.chao.clone(); floor.material.map.repeat.set((AR.HALF_X * 2 + 2) / 4, (AR.HALF_Z * 2 + 2) / 4); floor.material.map.needsUpdate = true;
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = "chao"; scene.add(floor); solids.push(floor);
  // deserto em volta (aparece por cima dos muros de longe)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -0.4; scene.add(sand); // bem abaixo do chão: senão as duas superfícies "brigam" em placas de vídeo com pouca precisão
  for (const b of AR.BOXES) {
    const [x0, y0, z0, x1, y1, z1, kind] = b, w = x1 - x0, hh = y1 - y0, d = z1 - z0;
    const m = new THREE.Mesh(boxGeo(w, hh, d, TEX_M[kind]), MAT[kind]);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; scene.add(m); solids.push(m);
    if (kind === "muro") { // acabamento no topo do muro
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12), MAT.topo);
      cap.position.set((x0 + x1) / 2, y1 + 0.06, (z0 + z1) / 2); cap.castShadow = cap.receiveShadow = true; scene.add(cap);
    }
  }
  // palmeiras simples atrás dos muros, para o horizonte não ficar vazio
  const trunk = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 1, side: THREE.DoubleSide });
  const r = rng(99);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, dist = 48 + r() * 60, x = Math.cos(a) * dist * 1.2, z = Math.sin(a) * dist, hh = 7 + r() * 6;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, hh, 6), trunk); t.position.y = hh / 2; t.rotation.z = (r() - 0.5) * 0.2; g.add(t);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 4.2), leaf); l.position.set(0, hh, 0); l.rotation.set(-1.1, (k / 6) * Math.PI * 2, 0, "YXZ"); l.translateY(1.8); g.add(l); }
    scene.add(g);
  }
}

// ======================================================================
// Armas e bonecos (feitos de caixinhas)
// ======================================================================
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const GM = { metal: M(0x2a2b2e, { metalness: 0.6, roughness: 0.4 }), metal2: M(0x3b3d42, { metalness: 0.5, roughness: 0.45 }), wood: M(0x8a4a22, { roughness: 0.55 }), wood2: M(0x6e3a1a), awp: M(0x56664a, { roughness: 0.7 }), black: M(0x151515, { roughness: 0.5 }), glass: M(0x1a2a3a, { metalness: 0.9, roughness: 0.1 }) };
function part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
const BG = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
const CY = (r, len, n = 10) => { const g = new THREE.CylinderGeometry(r, r, len, n); g.rotateX(Math.PI / 2); return g; };
function makeAK() {
  const g = new THREE.Group();
  part(g, BG(0.06, 0.08, 0.42), GM.metal, 0, 0.03, -0.12);
  part(g, BG(0.056, 0.03, 0.36), GM.metal2, 0, 0.08, -0.1);
  part(g, BG(0.05, 0.09, 0.32), GM.wood, 0, 0.0, 0.24, -0.12);
  part(g, BG(0.045, 0.12, 0.05), GM.wood2, 0, -0.07, 0.03, 0.35);
  part(g, BG(0.066, 0.065, 0.22), GM.wood, 0, 0.02, -0.42);
  part(g, BG(0.05, 0.035, 0.18), GM.wood, 0, 0.07, -0.41);
  part(g, CY(0.012, 0.36), GM.metal, 0, 0.035, -0.68);
  part(g, BG(0.012, 0.05, 0.012), GM.metal, 0, 0.075, -0.8);
  part(g, CY(0.019, 0.05), GM.metal, 0, 0.035, -0.87);
  part(g, BG(0.045, 0.13, 0.07), GM.metal2, 0, -0.07, -0.2, 0.22);
  part(g, BG(0.045, 0.11, 0.07), GM.metal2, 0, -0.17, -0.16, 0.5);
  g.userData.muzzle = new THREE.Vector3(0, 0.035, -0.9);
  return g;
}
function makeAWP() {
  const g = new THREE.Group();
  part(g, BG(0.07, 0.1, 0.72), GM.awp, 0, 0, -0.16);
  part(g, BG(0.06, 0.14, 0.3), GM.awp, 0, -0.02, 0.33);
  part(g, BG(0.04, 0.11, 0.05), GM.black, 0, -0.08, 0.1, 0.3);
  part(g, CY(0.014, 0.62), GM.black, 0, 0.03, -0.8);
  part(g, CY(0.022, 0.09), GM.black, 0, 0.03, -1.13);
  part(g, CY(0.03, 0.34, 14), GM.black, 0, 0.11, -0.12);
  part(g, CY(0.042, 0.07, 14), GM.black, 0, 0.11, -0.31);
  part(g, CY(0.036, 0.06, 14), GM.black, 0, 0.11, 0.07);
  part(g, CY(0.034, 0.005, 14), GM.glass, 0, 0.11, -0.345);
  part(g, BG(0.02, 0.05, 0.03), GM.black, 0, 0.07, -0.22);
  part(g, BG(0.02, 0.05, 0.03), GM.black, 0, 0.07, -0.02);
  part(g, BG(0.07, 0.015, 0.015), GM.metal2, 0.05, 0.045, 0.06);
  part(g, BG(0.05, 0.07, 0.1), GM.black, 0, -0.08, -0.12);
  g.userData.muzzle = new THREE.Vector3(0, 0.03, -1.18);
  return g;
}
function makeDeagle() { // pistola grande: ferrolho prateado, cabo preto
  const g = new THREE.Group(), steel = M(0xb9bec4, { metalness: 0.8, roughness: 0.3 });
  part(g, BG(0.042, 0.05, 0.27), steel, 0, 0.045, -0.11);
  part(g, BG(0.036, 0.03, 0.22), GM.metal, 0, 0.005, -0.1);
  part(g, BG(0.036, 0.11, 0.055), GM.black, 0, -0.06, 0.02, 0.22);
  part(g, BG(0.012, 0.03, 0.04), GM.metal, 0, -0.02, -0.04);
  part(g, BG(0.01, 0.012, 0.012), GM.metal, 0, 0.076, -0.22);
  g.userData.muzzle = new THREE.Vector3(0, 0.045, -0.26);
  return g;
}
function makeKnife() { // faca: cabo preto, guarda e lâmina prateada
  const g = new THREE.Group(), blade = M(0xd7dbe0, { metalness: 0.9, roughness: 0.2 });
  part(g, BG(0.03, 0.032, 0.11), GM.black, 0, 0, 0.02);
  part(g, BG(0.055, 0.014, 0.014), GM.metal, 0, 0, -0.04);
  part(g, BG(0.008, 0.036, 0.19), blade, 0, 0.006, -0.14);
  part(g, BG(0.008, 0.02, 0.04), blade, 0, 0.014, -0.25, 0.5);
  g.userData.muzzle = new THREE.Vector3(0, 0, -0.27);
  return g;
}
const TEAMCOL = { A: 0x2f6fde, B: 0xe0742a }, TEAMDARK = { A: 0x1d3f7a, B: 0x8a3f12 };
function nameSprite(text, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 6; x.strokeStyle = "#000a"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.2, 0.3, 1); s.renderOrder = 10; return s;
}
function makePlayer(team, name, mate) {
  const g = new THREE.Group(), shirt = M(TEAMCOL[team] || 0x888888), dark = M(TEAMDARK[team] || 0x444444), pants = M(0x3a3f47), skin = M(0xd6a47a), boot = M(0x1e1e1e);
  const legs = [];
  for (const sx of [-0.11, 0.11]) { const l = new THREE.Group(); l.position.set(sx, 0.85, 0); part(l, BG(0.17, 0.75, 0.19), pants, 0, -0.38, 0); part(l, BG(0.18, 0.12, 0.26), boot, 0, -0.79, -0.03); g.add(l); legs.push(l); }
  part(g, BG(0.46, 0.62, 0.26), shirt, 0, 1.15, 0);
  part(g, BG(0.48, 0.4, 0.29), dark, 0, 1.2, 0);
  part(g, BG(0.5, 0.08, 0.3), M(0x2a2a2a), 0, 0.9, 0);
  const head = new THREE.Group(); head.position.set(0, 1.46, 0); g.add(head);
  part(head, BG(0.26, 0.28, 0.26), skin, 0, 0.15, 0);
  part(head, BG(0.29, 0.1, 0.29), dark, 0, 0.31, 0);
  part(head, BG(0.3, 0.03, 0.12), dark, 0, 0.27, -0.16);
  part(head, BG(0.2, 0.045, 0.02), M(0x111111), 0, 0.17, -0.135);
  const upper = new THREE.Group(); upper.position.set(0, 1.38, 0); g.add(upper);
  part(upper, BG(0.12, 0.12, 0.42), shirt, 0.21, -0.08, -0.17, 0, 0.05);
  part(upper, BG(0.12, 0.12, 0.42), shirt, -0.12, -0.08, -0.28, 0, -0.45);
  const gun = new THREE.Group(); gun.position.set(0.1, -0.08, -0.35); upper.add(gun);
  const guns = { ak: makeAK(), awp: makeAWP(), deagle: makeDeagle(), faca: makeKnife() }; gun.add(guns.ak, guns.awp, guns.deagle, guns.faca);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  let tag = null; if (mate) { tag = nameSprite(name, "#9be27a"); tag.position.y = 2.05; g.add(tag); }
  g.userData = { legs, head, upper, guns, gunGroup: gun, tag, mats: { head: skin, hair: dark, torso: shirt, upperArm: shirt, forearm: shirt, thigh: pants, shin: pants, boot } };
  return g;
}

// ---------- arma na mão (primeira pessoa): cena separada, desenhada por cima, para não atravessar paredes ----------
const vScene = new THREE.Scene(), vCam = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
vScene.add(new THREE.HemisphereLight(0xdfeaff, 0x806040, 1.6));
const vSun = new THREE.DirectionalLight(0xfff0d6, 2.2); vSun.position.set(0.5, 1, 0.3); vScene.add(vSun);
const vm = new THREE.Group(); vScene.add(vm);
const VM = { ak: makeAK(), awp: makeAWP(), deagle: makeDeagle(), faca: makeKnife() };
const glove = M(0x3a3a3a, { roughness: 0.8 }), sleeve = M(0x6b7f5a, { roughness: 0.9 });
for (const [k, gun] of Object.entries(VM)) {
  // luvas e antebraços curtos, saindo pela parte de baixo da tela
  const wrap = new THREE.Group(); wrap.add(gun);
  const gz = k === "awp" ? 0.1 : 0.03, oneHand = k === "deagle" || k === "faca";
  part(wrap, BG(0.06, 0.08, 0.09), glove, 0.005, k === "faca" ? -0.01 : -0.08, gz);
  part(wrap, BG(0.07, 0.07, 0.26), sleeve, 0.02, k === "faca" ? -0.1 : -0.17, gz + 0.14, 0.75, 0.08);
  if (!oneHand) { part(wrap, BG(0.07, 0.06, 0.1), glove, 0, -0.03, -0.42); part(wrap, BG(0.07, 0.07, 0.3), sleeve, -0.07, -0.13, -0.27, 0.6, -0.5); }
  wrap.scale.setScalar(0.85);
  wrap.visible = false; vm.add(wrap); VM[k] = wrap; wrap.userData.muzzle = gun.userData.muzzle;
}
// clarão do tiro
const flashTex = canvasTex(128, (x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "#fffbe0"); g.addColorStop(0.25, "#ffd060"); g.addColorStop(0.6, "#ff800055"); g.addColorStop(1, "#ff800000");
  x.fillStyle = g; x.translate(s / 2, s / 2); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, -4); x.lineTo(s / 2, 0); x.lineTo(0, 4); x.fill(); } x.beginPath(); x.arc(0, 0, s / 4, 0, 7); x.fill();
});
const vFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); vFlash.visible = false; vScene.add(vFlash);
const flashLight = new THREE.PointLight(0xffc060, 0, 8, 2); scene.add(flashLight);

// ======================================================================
// Efeitos: rastro da bala, buraco na parede, poeira e sangue
// ======================================================================
const fx = [];
const dotTex = canvasTex(64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "#fff"); g.addColorStop(1, "#fff0"); x.fillStyle = g; x.fillRect(0, 0, s, s); });
function particles(p, color, n, speed, size, life) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, depthWrite: false }));
    s.position.set(p[0], p[1], p[2]); s.scale.setScalar(size * (0.6 + Math.random() * 0.8)); scene.add(s);
    fx.push({ o: s, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed), life, max: life, grav: 3, grow: 1.5 });
  }
}
function tracer(a, b, w) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: w === "awp" ? 0xffffff : 0xffe28a, transparent: true, opacity: w === "awp" ? 0.6 : 0.85 }));
  scene.add(l); fx.push({ o: l, life: w === "awp" ? 0.5 : 0.06, max: w === "awp" ? 0.5 : 0.06, line: true });
}
const holes = [], holeGeo = new THREE.CircleGeometry(0.035, 8), holeMat = new THREE.MeshBasicMaterial({ color: 0x1a1410, polygonOffset: true, polygonOffsetFactor: -2 });
function impact(p, n, dust = 0xcdb38a) {
  if (n) {
    const m = new THREE.Mesh(holeGeo, holeMat); m.position.set(p[0] + n[0] * 0.003, p[1] + n[1] * 0.003, p[2] + n[2] * 0.003);
    m.lookAt(m.position.x + n[0], m.position.y + n[1], m.position.z + n[2]); scene.add(m); holes.push(m);
    if (holes.length > 120) scene.remove(holes.shift());
  }
  particles(p, dust, 5, 2.2, 0.16, 0.45);
}
function blood(p) { particles(p, 0xa01010, 8, 2.5, 0.14, 0.5); }
// ---------- corpo caindo (ragdoll) quando alguém morre ----------
const rags = [];
function solidRag(p, r) { // empurra o ponto para fora das caixas e paredes do mapa
  const hx = AR.HALF_X - r, hz = AR.HALF_Z - r; p.x = clamp(p.x, -hx, hx); p.z = clamp(p.z, -hz, hz);
  for (const b of AR.BOXES) {
    if (p.x < b[0] - r || p.x > b[3] + r || p.y < b[1] - r || p.y > b[4] + r || p.z < b[2] - r || p.z > b[5] + r) continue;
    const d = [p.x - (b[0] - r), b[3] + r - p.x, p.y - (b[1] - r), b[4] + r - p.y, p.z - (b[2] - r), b[5] + r - p.z];
    let k = 0; for (let i = 1; i < 6; i++) if (d[i] < d[k]) k = i;
    if (k === 0) p.x = b[0] - r; else if (k === 1) p.x = b[3] + r; else if (k === 2) p.y = b[1] - r; else if (k === 3) p.y = b[4] + r; else if (k === 4) p.z = b[2] - r; else p.z = b[5] + r;
  }
}
// dir: para onde o tiro empurra (do atirador para a vítima); head: tiro na cabeça joga a cabeça para trás
function addRag(model, x, y, z, yaw, vel, dir, head) {
  const d = dir || { x: -Math.sin(yaw) * -1, z: -Math.cos(yaw) * -1 }, k = head ? 3 : 4.5;
  rags.push(new Ragdoll({ scene, x, y, z, yaw, vel, mats: model.userData.mats, life: 7, sink: true, solid: solidRag,
    push: { x: d.x * k, y: 1.2, z: d.z * k }, headPush: head ? { x: d.x * 8, y: 2, z: d.z * 8 } : null }));
  if (rags.length > 10) rags.shift().dispose();
}
function updateRags(dt) { for (let i = rags.length - 1; i >= 0; i--) if (!rags[i].step(dt)) { rags[i].dispose(); rags.splice(i, 1); } }
function clearRags() { while (rags.length) rags.pop().dispose(); }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt;
    if (f.life <= 0) { scene.remove(f.o); if (f.line) f.o.geometry.dispose(); f.o.material.dispose(); fx.splice(i, 1); continue; }
    const k = f.life / f.max;
    if (f.line) { f.o.material.opacity = k * 0.8; continue; }
    f.v.y -= f.grav * dt; f.o.position.addScaledVector(f.v, dt); f.o.material.opacity = k; f.o.scale.multiplyScalar(1 + f.grow * dt);
  }
}

// ======================================================================
// Estado do jogo no navegador
// ======================================================================
const G = {
  active: false, mode: null, // "online" | "treino"
  me: null, remotes: new Map(), bots: [], specIdx: 0, lastSend: 0, roundKey: null, kills: 0, hs: 0, shots: 0,
};
const keys = new Set();
let mouseDown = false, triggerUp = true, jumpQueued = false, sens = store.get("tiro:sens") ?? 1.6;
// me.w = arma na mão; me.prim = principal (AK ou AWP); me.inv guarda a munição das outras
function newMe(spawn, prim) {
  const W = WP[prim];
  return { x: spawn[0], y: spawn[1], z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, yaw: spawn[3], pitch: 0, alive: true, hp: 100, w: prim, prim, last: "deagle",
    inv: { deagle: { ammo: WP.deagle.mag, reserve: WP.deagle.reserve } }, swingT: 0, heavy: false,
    ammo: W.mag, reserve: W.reserve, reloadUntil: 0, nextShot: 0, scope: 0, scopeAt: 0, rec: { n: 0, px: 0, py: 0, last: 0 }, punch: 0, kick: 0, deployAt: performance.now() / 1000, stepT: 0, wasGround: true };
}
const now = () => performance.now() / 1000;
// no celular não tem "prender o mouse": jogando = depois de tocar em "Voltar pro jogo"
const TOUCH = window.Toque && Toque.isTouch();
let touchPlay = false;
const locked = () => document.pointerLockElement === canvas || (TOUCH && touchPlay && G.active);

function startGame(mode) {
  if (G.active && G.mode === mode) return;
  stopGame();
  G.active = true; G.mode = mode; G.roundKey = null; G.spec = null; G.kills = 0; G.hs = 0; G.shots = 0; G.feed = [];
  show("game"); resize();
  const spawn = AR.SPAWNS.A[0];
  G.me = newMe(spawn, (myP() && myP().w) || store.get("tiro:w") || "ak");
  if (mode === "treino") spawnBots();
  else syncFromState(null, S);
  setVM(G.me.w);
  $("pause").classList.remove("hidden"); touchPlay = false;
  requestAnimationFrame(loop);
}
function stopGame() {
  if (!G.active) return;
  G.active = false;
  for (const r of G.remotes.values()) scene.remove(r.model);
  G.remotes.clear(); G.bots = []; clearRags();
  if (document.pointerLockElement) document.exitPointerLock();
  touchPlay = false; if (TOUCH) Toque.show(false);
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
function leaveGame() {
  if (G.mode === "treino") { stopGame(); if (S) { show(S.phase === "lobby" ? "lobby" : "game"); if (S.phase !== "lobby") startGame("online"); else renderLobby(); } else show("home"); return; }
  if (confirm("Sair da arena? A partida continua sem você.")) { socket.disconnect(); urlCode = null; ME = null; S = null; stopGame(); history.replaceState(null, "", "/tiro/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect(); }
}

// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  const old = S; S = st;
  if (st.phase === "lobby") {
    if (G.active && G.mode === "online") stopGame();
    if (!G.active) { show("lobby"); renderLobby(); }
    return;
  }
  if (!G.active || G.mode === "treino") startGame("online");
  else syncFromState(old, st);
});
function syncFromState(old, st) {
  if (!st || !G.active || G.mode !== "online") return;
  const mine = myP(), r = st.round;
  // bonecos dos outros
  const ids = new Set();
  for (const p of st.players) {
    if (!p.team || (ME && p.id === ME.id)) continue;
    ids.add(p.id);
    let rm = G.remotes.get(p.id);
    if (!rm || rm.team !== p.team) {
      if (rm) scene.remove(rm.model);
      const mate = mine && mine.team === p.team;
      rm = { id: p.id, team: p.team, name: p.name, model: makePlayer(p.team, p.name, mate), buf: [], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, w: p.w, speed: 0, stepT: 0, g: 1, wk: 0 };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    rm.alive = p.alive; rm.w = rm.w || p.w;
    if (p.spawn && (!old || !old.round || !r || old.round.n !== r.n)) { rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: p.spawn[1], z: p.spawn[2], yaw: p.spawn[3], pitch: 0, w: p.w }]; }
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { scene.remove(rm.model); G.remotes.delete(id); }
  // rodada nova: volto para a base, vida cheia
  const key = r ? `${r.n}` : null;
  if (r && key !== G.roundKey) {
    G.roundKey = key;
    if (mine && mine.team && mine.spawn) { G.me = newMe(mine.spawn, mine.w); G.me.alive = mine.alive; setVM(mine.w); }
    else if (G.me) G.me.alive = false;
    flashMsg(`Rodada ${r.n}`, mine && mine.team ? "Principal: AK-47 ou AWP (1 troca) · 2 Deagle · 3 faca" : "Assistindo", 2500);
    Sound.round();
  }
  if (mine && G.me) {
    if (G.me.alive && !mine.alive) die();
    G.me.hp = mine.hp;
    if (mine.w !== G.me.prim && r && r.phase === "freeze") setPrimary(mine.w, false);
  }
  if (r && r.phase === "end" && (!old || !old.round || old.round.phase !== "end" || old.round.n !== r.n)) {
    const good = mine && mine.team && r.winner === mine.team;
    flashMsg(r.winner ? `Time ${TEAM[r.winner]} venceu a rodada` : "Rodada empatada", r.reason === "tempo" ? "Acabou o tempo" : "", 3500, r.winner ? (r.winner === "A" ? "#8dbbff" : "#ffb27a") : "#fff");
    if (mine && mine.team) Sound.win(good);
  }
  // abates novos: mostra no canto
  const seen = new Set((old && old.kills || []).map((k) => k.t + k.by + k.to));
  for (const k of st.kills) if (!seen.has(k.t + k.by + k.to)) pushFeed(k);
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}
function die() {
  const me = G.me; me.alive = false; me.scope = 0;
  const k = S && [...S.kills].reverse().find((x) => ME && x.to === ME.id);
  const killer = k && P(k.by);
  flashMsg("Você morreu", killer ? `${killer.name} te pegou de ${WP[k.w].name}${k.head ? ", na cabeça" : ""}` : "", 3000, "#ff6b6b");
  G.specIdx = 0;
}

// ---------- abates (canto de cima) ----------
function pushFeed(k) {
  const by = G.mode === "treino" ? { name: k.byName, team: "A" } : P(k.by), to = G.mode === "treino" ? { name: k.toName, team: "B" } : P(k.to);
  if (!by || !to) return;
  G.feed.push({ at: now(), html: `<span class="${by.team}">${h(by.name)}</span><span class="wx">${WP[k.w].name}${k.head ? " 🎯" : ""}</span><span class="${to.team}">${h(to.name)}</span>`, mine: ME && (k.by === ME.id || k.to === ME.id) || G.mode === "treino" });
  if (G.feed.length > 5) G.feed.shift();
}
let msgT = 0;
function flashMsg(big, small = "", ms = 2500, color = "#fff") { setH("hMsg", `<span style="color:${color}">${h(big)}</span>${small ? `<small>${h(small)}</small>` : ""}`); msgT = now() + ms / 1000; }

// ---------- tiros, acertos e recargas dos outros ----------
// pacote do servidor (20x por segundo) com todo mundo: [n, x, y, z, yaw, pitch, arma, mira, chão + 2*andando devagar]
socket.on("snap", (d) => {
  if (!S) return;
  for (const e of d.p) {
    const p = S.players.find((x) => x.n === e[0]); if (!p) continue;
    const rm = G.remotes.get(p.id); if (!rm) continue;
    const s = { t: d.t, x: e[1], y: e[2], z: e[3], yaw: e[4], pitch: e[5], w: ["ak", "awp", "deagle", "faca"][e[6]] || "ak", sc: e[7], g: e[8] & 1, wk: (e[8] >> 1) & 1 };
    rm.buf.push(s); if (rm.buf.length > 40) rm.buf.shift();
    rm.w = s.w; rm.sc = s.sc; rm.g = s.g; rm.wk = s.wk;
  }
});
socket.on("shot", (d) => {
  if (!G.active || G.mode !== "online") return;
  const rm = G.remotes.get(d.id);
  const from = rm ? muzzleOfRemote(rm) : d.o;
  if (d.w !== "faca") { tracer(from, d.e, d.w); if (!d.hit) impact(d.e, d.n); }
  if (rm) { rm.flash = now() + 0.05; rm.kick = 1; }
  const [k, pan] = hearing(d.o); Sound.shot(d.w, k, pan);
});
socket.on("hit", (d) => {
  if (!G.active || G.mode !== "online") return;
  blood(d.p);
  const vic = G.remotes.get(d.to), sh = ME && d.by === ME.id ? G.me : G.remotes.get(d.by);
  if (vic && sh) { const dx = vic.x - sh.x, dz = vic.z - sh.z, l = Math.hypot(dx, dz) || 1; vic.lastHit = { dir: { x: dx / l, z: dz / l }, head: d.part === "head", t: now() }; }
  if (ME && d.by === ME.id) { hitMarker(d.hp <= 0); Sound.hit(d.part === "head"); if (d.hp <= 0) setTimeout(() => Sound.kill(), 90); }
  if (ME && d.to === ME.id) { G.me.hp = d.hp; hurt(); }
});
socket.on("reload", (d) => { const rm = G.remotes.get(d.id); if (rm) { rm.reloadAt = now(); const [k, pan] = hearing([rm.x, rm.y + 1, rm.z]); if (k > 0.2) Sound.dry(); } });
function hearing(p) { // volume e lado (esquerda/direita) de um som no mundo
  const ex = cam.position, dx = p[0] - ex.x, dz = p[2] - ex.z, dist = Math.hypot(dx, dz, p[1] - ex.y);
  const yaw = cam.rotation.y, right = [Math.cos(yaw), -Math.sin(yaw)];
  return [1 / (1 + dist / 9), dist > 0.5 ? (dx * right[0] + dz * right[1]) / dist * 0.8 : 0];
}
function muzzleOfRemote(rm) { const d = AR.dirOf(rm.yaw, rm.pitch); return [rm.x + d[0] * 0.8 + Math.cos(rm.yaw) * 0.12, rm.y + 1.32 + d[1] * 0.8, rm.z + d[2] * 0.8 - Math.sin(rm.yaw) * 0.12]; }
let hitT = 0;
function hitMarker(kill) { const e = $("hitm"); e.classList.toggle("kill", !!kill); e.style.opacity = 1; hitT = now() + 0.18; }
function hurt() { $("dmg").style.transition = "none"; $("dmg").style.opacity = 0.85; requestAnimationFrame(() => { $("dmg").style.transition = "opacity .5s"; $("dmg").style.opacity = 0; }); Sound.hurt(); }

// ======================================================================
// Treino: alvos que andam de um lado para o outro (só no seu navegador)
// ======================================================================
const BOT_SPOTS = [[20, 0, 0], [12, 0, 10], [12, 0, -10], [22, 0, 12], [18, 0, -12], [7, 0, 3], [26, 0, -5], [3, 0, -16.5], [9, 0, 16.4]];
function spawnBots() {
  G.bots = [];
  for (let i = 0; i < 5; i++) {
    const b = { id: "bot" + i, name: "Alvo " + (i + 1), team: "B", model: makePlayer("B", "", false), hp: 100, alive: true, x: 0, y: 0, z: 0, yaw: Math.PI / 2, pitch: 0, w: i % 2 ? "awp" : "ak", speed: 0, stepT: 0, g: 1 };
    placeBot(b); scene.add(b.model); G.bots.push(b); G.remotes.set(b.id, b);
  }
}
function placeBot(b) {
  const used = new Set(G.bots.filter((o) => o !== b && o.alive).map((o) => o.spot));
  const free = BOT_SPOTS.map((s, i) => i).filter((i) => !used.has(i));
  b.spot = free[Math.floor(Math.random() * free.length)];
  const s = BOT_SPOTS[b.spot]; b.home = s; b.x = s[0]; b.y = s[1]; b.z = s[2]; b.phase = Math.random() * 6; b.amp = Math.random() < 0.3 ? 0 : 1.2 + Math.random() * 1.5;
  b.hp = 100; b.alive = true; b.model.visible = true;
}
function updateBots(dt, t) {
  for (const b of G.bots) {
    if (!b.alive) { if (t > b.respawnAt) placeBot(b); continue; }
    const nz = b.home[2] + Math.sin(t * 1.6 + b.phase) * b.amp;
    b.speed = Math.abs(nz - b.z) / Math.max(dt, 1e-3); b.z = nz;
    b.yaw = Math.atan2(-(G.me.x - b.x), -(G.me.z - b.z)); // olha para você
  }
}
function botHit(b, part, point, fixed) {
  const dmg = fixed ?? AR.damage(G.me.w, part); b.hp -= dmg; blood(point);
  const kill = b.hp <= 0; hitMarker(kill); Sound.hit(part === "head");
  if (kill) {
    b.alive = false; b.model.visible = false; b.respawnAt = now() + 1.5; G.kills++; if (part === "head") G.hs++;
    const dl = Math.hypot(b.x - G.me.x, b.z - G.me.z) || 1; b.lastHit = { dir: { x: (b.x - G.me.x) / dl, z: (b.z - G.me.z) / dl }, head: part === "head", t: now() }; // o corpo cai em updateRemotes
    setTimeout(() => Sound.kill(), 90);
    pushFeed({ byName: store.get("galera:name") || "Você", toName: b.name, w: G.me.w, head: part === "head" });
  }
}

// ======================================================================
// Controles
// ======================================================================
canvas.addEventListener("click", () => { if (G.active && !locked() && $("over").classList.contains("hidden")) canvas.requestPointerLock?.(); });
$("btnResume").onclick = () => { Sound.unlock(); if (TOUCH) { touchPlay = true; $("pause").classList.add("hidden"); Toque.fullscreen(); } else canvas.requestPointerLock?.(); };
// botões na tela (celular)
if (TOUCH) Toque.setup({
  look: (dx, dy) => {
    const me = G.me; if (!locked() || !me || !me.alive) return;
    const zoomK = me.scope ? Math.tan((ZOOM_FOV[me.scope] * Math.PI) / 360) / Math.tan((BASE_FOV * Math.PI) / 360) : 1, k = 0.0028 * sens * zoomK;
    me.yaw -= dx * k; me.pitch = clamp(me.pitch - dy * k, -1.55, 1.55);
  },
  buttons: [
    { icon: "🔁", label: "arma", down: () => { const me = G.me; if (!me) return; const order = [me.prim, "deagle", "faca"], next = order[(order.indexOf(me.w) + 1) % 3]; const code = next === "deagle" ? "Digit2" : next === "faca" ? "Digit3" : "Digit1"; Toque.press(code); Toque.release(code); } },
    { icon: "↻", label: "recarregar", code: "KeyR" },
    { icon: "🎯", label: "mira", down: () => { if (!locked() || !G.me) return; if (WP[G.me.w].melee) { if (canFire()) tryFire(true); } else toggleScope(); } },
    { icon: "🚶", label: "devagar", code: "ShiftLeft" },
    { icon: "⬆", label: "pular", code: "Space" },
    { icon: "🔫", label: "atirar", big: true, down: () => { if (!locked() || !G.me) return; mouseDown = true; if (!G.me.alive) G.specIdx++; }, up: () => { mouseDown = false; triggerUp = true; } },
  ],
  top: [
    { icon: "⏸", down: () => { touchPlay = false; keys.clear(); mouseDown = false; $("pause").classList.remove("hidden"); renderPauseSb(); } },
    { icon: "📋", code: "Tab" },
  ],
});
$("btnLeave").onclick = leaveGame;
document.addEventListener("pointerlockchange", () => {
  const on = locked();
  $("pause").classList.toggle("hidden", on || !G.active || !$("over").classList.contains("hidden"));
  if (!on) { keys.clear(); mouseDown = false; renderPauseSb(); }
});
$("sens").value = sens; $("sensV").textContent = sens.toFixed(2);
$("sens").oninput = (e) => { sens = +e.target.value; $("sensV").textContent = sens.toFixed(2); store.set("tiro:sens", sens); };
$("vol").value = Sound.vol; $("volV").textContent = Math.round(Sound.vol * 100) + "%";
$("vol").oninput = (e) => { Sound.setVol(+e.target.value); $("volV").textContent = Math.round(Sound.vol * 100) + "%"; };
document.addEventListener("mousemove", (e) => {
  if (!locked() || !G.me) return;
  const me = G.me, zoomK = me.scope ? Math.tan((ZOOM_FOV[me.scope] * Math.PI) / 360) / Math.tan((BASE_FOV * Math.PI) / 360) : 1;
  const k = sens * 0.022 * (Math.PI / 180) * zoomK; // mesma conta do CS: sensibilidade x 0,022 grau por contagem do mouse
  if (me.alive) { me.yaw -= e.movementX * k; me.pitch = clamp(me.pitch - e.movementY * k, -1.55, 1.55); }
});
document.addEventListener("mousedown", (e) => {
  if (!locked() || !G.me) return;
  if (e.button === 0) { mouseDown = true; if (!G.me.alive) G.specIdx++; }
  if (e.button === 2) { if (WP[G.me.w].melee) { if (canFire()) tryFire(true); } else toggleScope(); }
});
document.addEventListener("mouseup", (e) => { if (e.button === 0) { mouseDown = false; triggerUp = true; } });
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Tab") { e.preventDefault(); $("tab").classList.remove("hidden"); renderTab(); return; }
  if (!locked()) return;
  if (e.code === "Space" && !e.repeat) jumpQueued = true;
  if (e.code === "KeyR") reload();
  // 1 principal (no começo da rodada, apertar de novo troca AK <-> AWP), 2 Deagle, 3 faca, Q a anterior
  if (e.code === "Digit1") { if (G.me.w === G.me.prim && canSwitch()) setPrimary(G.me.prim === "ak" ? "awp" : "ak"); else switchTo(G.me.prim); }
  if (e.code === "Digit2") switchTo("deagle");
  if (e.code === "Digit3") switchTo("faca");
  if (e.code === "KeyQ") switchTo(G.me.last);
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => { keys.delete(e.code); if (e.code === "Tab") $("tab").classList.add("hidden"); });
window.addEventListener("blur", () => { keys.clear(); mouseDown = false; });
document.querySelectorAll("#pick button").forEach((b) => b.addEventListener("click", () => setPrimary(b.dataset.w)));

function canSwitch() { return G.mode === "treino" || (S && S.round && S.round.phase === "freeze"); }
// troca a arma na mão (a munição de cada uma fica guardada)
function switchTo(w) {
  const me = G.me; if (!me || !me.alive || !w || me.w === w || ![me.prim, "deagle", "faca"].includes(w)) return;
  if (me.w && !WP[me.w].melee) me.inv[me.w] = { ammo: me.ammo, reserve: me.reserve };
  const a = me.inv[w] || { ammo: 0, reserve: 0 };
  Object.assign(me, { last: me.w || me.last, w, ammo: a.ammo, reserve: a.reserve, reloadUntil: 0, scope: 0, deployAt: now(), nextShot: 0 });
  me.rec.n = 0; me.rec.px = 0; me.rec.py = 0;
  setVM(w);
  if (G.mode === "online") socket.emit("cur", { w });
}
// arma principal (AK ou AWP): só no começo da rodada (ou no treino)
function setPrimary(w, tell = true) {
  const me = G.me; if (!me || !me.alive || !["ak", "awp"].includes(w)) return;
  if (tell && !canSwitch()) return toast("Só dá para trocar a arma principal no começo da rodada.", 1800);
  delete me.inv[me.prim]; me.prim = w; me.inv[w] = { ammo: WP[w].mag, reserve: WP[w].reserve };
  if (me.w === "ak" || me.w === "awp") { me.w = null; switchTo(w); } else switchTo(w);
  store.set("tiro:w", w);
  if (tell && G.mode === "online") act("weapon", { w });
}
function setVM(w) { for (const k of Object.keys(VM)) VM[k].visible = k === w; }
function toggleScope() {
  const me = G.me; if (!me || !me.alive || me.w !== "awp" || me.reloadUntil) return;
  me.scope = (me.scope + 1) % 3; me.scopeAt = now(); Sound.zoom();
}
function reload() {
  const me = G.me, W = WP[me.w]; if (W.melee || !me.alive || me.reloadUntil || me.ammo >= W.mag || me.reserve <= 0) return;
  me.reloadUntil = now() + W.reload; me.scope = 0; Sound.reload(me.w);
  if (G.mode === "online") socket.emit("reload");
}

// ---------- tiro ----------
function spreadOf(me) {
  const W = WP[me.w], sp = Math.hypot(me.vx, me.vz), mv = clamp((sp - W.speed * 0.34) / (W.speed * 0.66), 0, 1), air = me.onGround ? 0 : 1;
  if (me.w === "awp") {
    const scoped = me.scope ? clamp((now() - me.scopeAt) / 0.25, 0, 1) : 0; // a mira leva um instante para "assentar"
    return lerp(0.085, 0.0004, scoped) + mv * 0.12 + air * 0.35;
  }
  if (me.w === "faca") return 0;
  if (me.w === "deagle") return 0.002 + mv * 0.07 + air * 0.18 + Math.min(me.rec.n * 0.011, 0.05); // atirar rápido demais espalha
  // AK: o 1º tiro é certeiro; numa rajada, a bala abre aos poucos
  return 0.003 + mv * 0.09 + air * 0.2 + Math.min(Math.max(0, me.rec.n - 1) * 0.0025, 0.03);
}
// recuo da AK (quanto a mira sobe a cada tiro, em radianos): sobe suave nos primeiros e depois só "dança" um pouco
const AK_UP = [0, 0.004, 0.0055, 0.0065, 0.007, 0.007, 0.0065, 0.006, 0.005, 0.004];
function canFire() {
  if (G.mode === "treino") return true;
  return S && S.phase === "play" && S.round && S.round.phase === "live";
}
function tryFire(heavy = false) {
  const me = G.me, W = WP[me.w], t = now();
  if (W.melee) return knifeAttack(heavy, t);
  if (me.reloadUntil || t < me.nextShot || t - me.deployAt < 0.35) return;
  if (!W.auto && !triggerUp) return;
  if (me.ammo <= 0) { if (triggerUp) { Sound.dry(); reload(); } triggerUp = false; return; }
  triggerUp = false; me.nextShot = t + W.interval; me.ammo--; G.shots++;
  // recuo da AK: sobe nos primeiros tiros e depois puxa para os lados
  const rec = me.rec;
  if (me.w === "ak") {
    // rec.n volta aos poucos (fracionado) quando você para de atirar: o índice da tabela tem que ser inteiro,
    // senão AK_UP[2.4] = undefined deixava a mira NaN e a tela ficava toda preta até trocar de arma
    const i = Math.floor(rec.n);
    rec.py += i < AK_UP.length ? AK_UP[i] : 0.0012;
    rec.px += rec.n >= 8 ? Math.sin(rec.n * 0.55) * 0.0035 : (Math.random() - 0.5) * 0.0012;
    rec.n++; rec.last = t; me.kick = 0.7;
  } else if (me.w === "deagle") { rec.py += 0.022; rec.px += (Math.random() - 0.5) * 0.006; rec.n++; rec.last = t; me.punch = 0.035; me.kick = 1.4; }
  else { me.punch = 0.05; me.kick = 1.6; }
  const s = spreadOf(me), a = Math.random() * Math.PI * 2, r = s * Math.sqrt(Math.random());
  const yaw = me.yaw + rec.px + Math.cos(a) * r, pitch = me.pitch + rec.py + Math.sin(a) * r;
  const d = AR.dirOf(yaw, pitch), eye = [me.x, me.y + AR.EYE, me.z];
  // efeitos na hora (o servidor confirma o acerto)
  const targets = [...G.remotes.values()].filter((o) => o.alive && o.team && (!myP() || o.team !== myP().team || G.mode === "treino")).map((o) => ({ id: o.id, x: o.x, y: o.y, z: o.z }));
  const hit = AR.hitScan(eye, d, targets);
  const right = [Math.cos(me.yaw), 0, -Math.sin(me.yaw)], fwd = AR.dirOf(me.yaw, me.pitch);
  const muzzle = [eye[0] + right[0] * 0.14 + fwd[0] * 0.7, eye[1] - 0.1 + fwd[1] * 0.7, eye[2] + right[2] * 0.14 + fwd[2] * 0.7];
  tracer(muzzle, hit.point, me.w);
  if (!hit.id) impact(hit.point, hit.normal);
  muzzleFlash();
  Sound.shot(me.w, 1, 0);
  if (me.w === "awp") me.scope = 0; // a AWP sai da mira depois do tiro
  if (G.mode === "treino") { if (hit.id) botHit(G.bots.find((b) => b.id === hit.id), hit.part, hit.point); }
  else socket.emit("fire", { o: eye, d });
  if (me.ammo === 0 && me.reserve > 0) setTimeout(() => G.me === me && reload(), W.auto ? 250 : 900);
}
// faca: golpe rápido (esquerdo) ou forte (direito), alcance curto. Pelas costas o dano é bem maior.
function knifeAttack(heavy, t) {
  const me = G.me, W = WP.faca;
  if (t < me.nextShot || t - me.deployAt < 0.3) return;
  me.nextShot = t + (heavy ? W.heavyInterval : W.interval); me.swingT = t; me.heavy = heavy;
  const d = AR.dirOf(me.yaw, me.pitch), eye = [me.x, me.y + AR.EYE, me.z];
  const targets = [...G.remotes.values()].filter((o) => o.alive && o.team && (!myP() || o.team !== myP().team || G.mode === "treino")).map((o) => ({ id: o.id, x: o.x, y: o.y, z: o.z }));
  const hit = AR.hitScan(eye, d, targets, W.reach);
  Sound.shot("faca");
  if (hit.id) Sound.stab(); else if (hit.t < W.reach) impact(hit.point, hit.normal);
  if (G.mode === "treino") { if (hit.id) { const b = G.bots.find((x) => x.id === hit.id); const back = Math.cos(b.yaw - me.yaw) > 0.4; botHit(b, hit.part, hit.point, back ? (heavy ? 180 : 90) : AR.damage("faca", hit.part, heavy)); } }
  else socket.emit("fire", { o: eye, d, heavy });
}
let flashUntil = 0;
function muzzleFlash() { flashUntil = now() + 0.045; vFlash.material.rotation = Math.random() * Math.PI; }

// ======================================================================
// Laço principal
// ======================================================================
function resize() {
  const w = innerWidth, hh = innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); vCam.aspect = w / hh; vCam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
let lastT = now();
function loop() {
  if (!G.active) return;
  requestAnimationFrame(loop);
  if (TOUCH) { const want = touchPlay && $("over").classList.contains("hidden"); if (Toque.on !== want) Toque.show(want); }
  const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
  try { frame(dt, t); } catch (e) { console.error(e); }
}
function frame(dt, t) {
  const me = G.me, r = S && S.round, online = G.mode === "online";
  const mine = online ? myP() : { team: "A" };
  const frozen = online && r && r.phase === "freeze";
  // recarga terminou?
  if (me.reloadUntil && t >= me.reloadUntil) { const W = WP[me.w], n = Math.min(W.mag - me.ammo, me.reserve); me.ammo += n; me.reserve -= n; me.reloadUntil = 0; }
  // movimento
  if (me.alive) {
    const W = WP[me.w], f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    let wx = -Math.sin(me.yaw) * f + Math.cos(me.yaw) * s, wz = -Math.cos(me.yaw) * f - Math.sin(me.yaw) * s;
    const len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
    const walk = keys.has("ShiftLeft") || keys.has("ShiftRight");
    let speed = (me.w === "awp" && me.scope ? W.scopedSpeed : W.speed) * (walk ? 0.52 : 1);
    if (frozen || !len) speed = 0;
    const jump = jumpQueued && !frozen; jumpQueued = false;
    if (frozen) { me.vx = 0; me.vz = 0; }
    AR.move(me, { x: wx, z: wz, speed, jump }, dt);
    if (me.onGround && !me.wasGround) Sound.land();
    me.wasGround = me.onGround;
    // passos (andando devagar não faz barulho)
    const hs = Math.hypot(me.vx, me.vz);
    if (me.onGround && hs > 3 && !walk) { me.stepT -= dt; if (me.stepT <= 0) { me.stepT = 0.36; Sound.step(0.35); } }
    if (mouseDown && locked() && canFire()) tryFire();
  }
  // o recuo volta ao normal quando você para de atirar
  const rec = me.rec;
  if (t - rec.last > WP[me.w].interval * 1.3) { const k = Math.exp(-dt * 13); rec.px *= k; rec.py *= k; rec.n = Math.max(0, rec.n - dt * 22); }
  me.punch *= Math.exp(-dt * 10); me.kick *= Math.exp(-dt * 14);
  // envia minha posição
  if (online && me.alive && mine && mine.team && t - G.lastSend > 1 / 30) {
    G.lastSend = t;
    const q = (v) => Math.round(v * 1000) / 1000;
    socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), yaw: q(me.yaw), pitch: q(me.pitch), sc: me.scope, g: me.onGround ? 1 : 0, wk: keys.has("ShiftLeft") ? 1 : 0 });
  }
  if (G.mode === "treino") updateBots(dt, t);
  updateRemotes(dt, t);
  updateRags(dt);
  updateCamera(dt, t);
  updateFx(dt);
  // clarão
  const fl = t < flashUntil;
  flashLight.intensity = fl ? 30 : 0;
  if (fl) { const d = AR.dirOf(me.yaw, me.pitch); flashLight.position.set(me.x + d[0] * 1.2, me.y + AR.EYE + d[1] * 1.2, me.z + d[2] * 1.2); }
  hud(t);
  renderer.clear(); renderer.render(scene, cam);
  if (vm.visible) { renderer.clearDepth(); renderer.render(vScene, vCam); }
}

function updateRemotes(dt, t) {
  const rt = sNow() - INTERP;
  for (const rm of G.remotes.values()) {
    if (G.mode === "online") {
      const b = rm.buf;
      if (b.length) {
        let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
        const B = b[i], A = b[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((rt - A.t) / (B.t - A.t), 0, 1);
        const nx = lerp(A.x, B.x, k), nz = lerp(A.z, B.z, k);
        rm.speed = Math.hypot(nx - rm.x, nz - rm.z) / Math.max(dt, 1e-3); rm.vx = (nx - rm.x) / Math.max(dt, 1e-3); rm.vz = (nz - rm.z) / Math.max(dt, 1e-3);
        rm.x = nx; rm.y = lerp(A.y, B.y, k); rm.z = nz;
        let dy = B.yaw - A.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); rm.yaw = A.yaw + dy * k; rm.pitch = lerp(A.pitch, B.pitch, k);
        while (b.length > 2 && b[1].t < rt - 200) b.shift();
      }
    }
    const m = rm.model, u = m.userData;
    // acabou de morrer: o corpo cai de verdade, empurrado na direção do tiro
    if (rm.wasAlive && !rm.alive) { const h = rm.lastHit && now() - rm.lastHit.t < 1.5 ? rm.lastHit : null; addRag(m, rm.x, rm.y, rm.z, rm.yaw, { x: clamp(rm.vx || 0, -8, 8), y: 0, z: clamp(rm.vz || 0, -8, 8) }, h && h.dir, h && h.head); }
    rm.wasAlive = rm.alive;
    m.visible = !!rm.alive && !(G.spec === rm);
    m.position.set(rm.x, rm.y, rm.z); m.rotation.y = rm.yaw;
    u.head.rotation.x = rm.pitch * 0.6; u.upper.rotation.x = rm.pitch;
    for (const k of Object.keys(u.guns)) u.guns[k].visible = k === (rm.w || "ak");
    const moving = rm.speed > 0.6 && rm.g !== 0;
    rm.anim = (rm.anim || 0) + dt * (moving ? rm.speed * 1.9 : 0);
    const sw = moving ? Math.sin(rm.anim) * 0.6 : 0;
    u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.3); u.legs[1].rotation.x = lerp(u.legs[1].rotation.x, -sw, 0.3);
    u.gunGroup.position.z = -0.35 + (rm.kick || 0) * 0.06; rm.kick = (rm.kick || 0) * Math.exp(-dt * 12);
    // passos dos outros: dá para ouvir alguém chegando (andando devagar com Shift não faz barulho)
    if (rm.alive && moving && rm.speed > 3 && !rm.wk && G.mode === "online") { rm.stepT -= dt; if (rm.stepT <= 0) { rm.stepT = 0.36; const [k, pan] = hearing([rm.x, rm.y, rm.z]); Sound.step(k * 1.2, pan); } }
  }
}

function updateCamera(dt, t) {
  const me = G.me;
  G.spec = null;
  let x, y, z, yaw, pitch, w = me.w, showVM = true;
  if (!Number.isFinite(me.rec.px) || !Number.isFinite(me.rec.py)) { me.rec.px = 0; me.rec.py = 0; me.rec.n = 0; } // proteção: mira nunca NaN
  if (!Number.isFinite(me.punch)) me.punch = 0;
  if (me.alive) {
    x = me.x; y = me.y + AR.EYE; z = me.z; yaw = me.yaw + me.rec.px * 0.5; pitch = me.pitch + me.rec.py * 0.5 + me.punch;
  } else {
    // morto ou no banco: assiste alguém vivo (time primeiro). Clique para trocar.
    const mine = myP();
    const alive = [...G.remotes.values()].filter((o) => o.alive).sort((a, b) => (mine && b.team === mine.team) - (mine && a.team === mine.team));
    if (alive.length) {
      const o = alive[G.specIdx % alive.length]; G.spec = o;
      x = o.x; y = o.y + AR.EYE; z = o.z; yaw = o.yaw; pitch = o.pitch; w = o.w;
      setH("hSpec", `Assistindo <b style="color:${o.team === "A" ? "#8dbbff" : "#ffb27a"}">${h(o.name)}</b> · clique para trocar`); $("hSpec").classList.remove("hidden");
    } else { x = 0; y = 16; z = 26; yaw = 0; pitch = -0.55; showVM = false; $("hSpec").classList.add("hidden"); }
  }
  if (me.alive) $("hSpec").classList.add("hidden");
  cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0);
  // zoom da AWP
  const scoped = me.alive && me.w === "awp" && me.scope > 0;
  const fov = scoped ? ZOOM_FOV[me.scope] : BASE_FOV;
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  $("scope").classList.toggle("hidden", !scoped);
  vm.visible = showVM && !scoped && (me.alive || !!G.spec);
  setVM(w);
  // arma na mão: balanço ao andar, coice e recarga
  const sp = me.alive ? Math.hypot(me.vx, me.vz) : 0, bob = me.alive && me.onGround ? sp / 5.5 : 0;
  G.bobT = (G.bobT || 0) + dt * sp * 1.5;
  const rl = me.reloadUntil ? 1 - (me.reloadUntil - t) / WP[me.w].reload : 0, rdip = me.reloadUntil ? Math.sin(Math.PI * clamp(rl, 0, 1)) : 0;
  const dep = clamp((t - me.deployAt) / 0.35, 0, 1), depOff = (1 - dep) * (1 - dep);
  const base = { awp: [0.2, -0.26, -0.6], deagle: [0.16, -0.2, -0.42], faca: [0.2, -0.22, -0.4] }[w] || [0.2, -0.25, -0.58];
  const sw = w === "faca" && me.swingT ? clamp((t - me.swingT) / (me.heavy ? 0.45 : 0.25), 0, 1) : 1, slash = Math.sin(sw * Math.PI);
  vm.position.set(base[0] + Math.sin(G.bobT) * 0.012 * bob - slash * 0.12, base[1] + Math.abs(Math.cos(G.bobT)) * 0.012 * bob - rdip * 0.12 - depOff * 0.3 + slash * 0.04, base[2] + me.kick * 0.045 - slash * 0.12);
  vm.rotation.set(me.kick * 0.06 - rdip * 0.6 + depOff * -0.6 - slash * (me.heavy ? 0.9 : 0.3), 0.03 + slash * 0.9, rdip * 0.3 + slash * (me.heavy ? -0.4 : 0.6));
  // clarão na ponta da arma
  const vis = VM[w];
  vFlash.visible = t < flashUntil && me.alive;
  if (vFlash.visible) { vis.updateMatrixWorld(true); const p = vis.userData.muzzle.clone(); vis.localToWorld(p); vFlash.position.copy(p); vFlash.scale.setScalar(w === "awp" ? 0.35 : 0.22); }
}

// ======================================================================
// HUD
// ======================================================================
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function hud(t) {
  const me = G.me, W = WP[me.w], online = G.mode === "online", r = S && S.round;
  // vida e munição
  const hp = Math.max(0, me.hp);
  setH("hHp", me.alive ? `<span>✚ ${hp}</span><div class="bar"><i style="width:${hp}%"></i></div>` : "");
  $("hHp").classList.toggle("low", hp <= 25);
  setH("hAmmo", !me.alive ? "" : W.melee ? `<div class="n">🔪</div><div class="wn">${W.name} · esquerdo rápido, direito forte</div>`
    : `<div class="n num">${me.reloadUntil ? "…" : me.ammo}<small> / ${me.reserve}</small></div><div class="wn">${me.reloadUntil ? "Recarregando" : W.name}</div>`);
  // placar e relógio
  if (online && r && S.phase !== "lobby") {
    const alive = (tm) => S.players.filter((p) => p.team === tm).map((p) => `<i class="${p.alive ? "" : "dead"}"></i>`).join("");
    const left = r.phase === "freeze" ? r.freezeUntil - sNow() : r.phase === "live" ? r.endsAt - sNow() : r.nextAt - sNow();
    setH("hTop", `<div class="alive">${alive("A")}</div><div class="sc A">${S.score.A}</div><div class="clock num ${r.phase === "live" && left < 10000 ? "hot" : ""}">${r.phase === "freeze" ? "⏳ " : ""}${fmtT(left)}</div><div class="sc B">${S.score.B}</div><div class="alive">${alive("B")}</div>`);
    const mp = myP(); $("hPing").textContent = mp && mp.ping != null ? `ping ${mp.ping} ms` : "";
  } else {
    setH("hTop", `<div class="clock" style="font-size:18px">🎯 TREINO · ${G.kills} abate${G.kills === 1 ? "" : "s"}${G.kills ? ` · ${Math.round((100 * G.hs) / G.kills)}% na cabeça` : ""}</div>`);
    $("hPing").textContent = "1 principal (de novo: AK/AWP) · 2 Deagle · 3 faca · Esc = menu";
  }
  // escolher arma no começo da rodada
  const showPick = online && me.alive && r && r.phase === "freeze";
  $("pick").classList.toggle("hidden", !showPick);
  if (showPick) document.querySelectorAll("#pick button").forEach((b) => b.classList.toggle("on", b.dataset.w === me.prim));
  // mensagens
  if (t > msgT) setH("hMsg", online && r && r.phase === "freeze" && me.alive ? `<small>A rodada começa em ${Math.ceil((r.freezeUntil - sNow()) / 1000)}…</small>` : "");
  // abates
  G.feed = G.feed.filter((f) => t - f.at < 7);
  setH("hFeed", G.feed.map((f) => `<div class="${f.mine ? "mine" : ""}">${f.html}</div>`).join(""));
  // mira: abre conforme a bala espalha
  const showCross = me.alive && !(me.w === "awp" && me.scope);
  if (showCross) {
    const s = spreadOf(me), px = Math.min(70, s * (innerHeight / 2) / Math.tan((cam.fov * Math.PI) / 360));
    const gap = Math.round(3 + px), L = 7;
    setH("cross", me.w === "awp" || me.w === "faca" ? `<i class="dot"></i>` : `<i style="left:${gap}px;top:-1px;width:${L}px;height:2px"></i><i style="left:${-gap - L}px;top:-1px;width:${L}px;height:2px"></i><i style="top:${gap}px;left:-1px;height:${L}px;width:2px"></i><i style="top:${-gap - L}px;left:-1px;height:${L}px;width:2px"></i>`);
  } else setH("cross", "");
  if (t > hitT) $("hitm").style.opacity = 0;
}
function scoreTable() {
  if (G.mode === "treino") return `<p>Abates: <b>${G.kills}</b> · Na cabeça: <b>${G.hs}</b> · Tiros: <b>${G.shots}</b></p>`;
  if (!S) return "";
  const rows = ["A", "B"].flatMap((tm) => S.players.filter((p) => p.team === tm).sort((a, b) => b.kills - a.kills))
    .map((p) => `<tr class="${p.team} ${p.alive ? "" : "dead"} ${ME && p.id === ME.id ? "me" : ""}"><td>${h(p.name)}</td><td class="n">${p.kills}</td><td class="n">${p.deaths}</td><td class="n">${p.kills ? Math.round((100 * p.hs) / p.kills) + "%" : "—"}</td><td class="n">${p.dmg}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span style="color:var(--blue)">Azul ${S.score.A}</span><span class="muted" style="font-size:14px;font-family:var(--body)">primeiro a ${S.config.rounds}</span><span style="color:var(--orange)">${S.score.B} Laranja</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Abates</th><th class="n">Mortes</th><th class="n">Cabeça</th><th class="n">Dano</th><th class="n">Ping</th></tr>${rows}</table>`;
}
function renderTab() { $("tab").innerHTML = scoreTable(); }
function renderPauseSb() { $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div>` : ""; $("pauseHint").textContent = G.mode === "treino" ? "Treino: só você vê os alvos." : ""; }
function showOver() {
  if (document.pointerLockElement) document.exitPointerLock();
  $("pause").classList.add("hidden");
  const w = S.winner, mine = myP(), isHost = ME && S.host === ME.id;
  $("overBox").innerHTML = `<h2 style="color:${w === "A" ? "var(--blue)" : "var(--orange)"}">🏆 Time ${TEAM[w]} venceu!</h2>
    <p class="muted" style="margin:0 0 6px">${mine && mine.team ? (mine.team === w ? "Boa! Você ganhou." : "Não foi dessa vez.") : ""}</p>${scoreTable()}
    <div class="row" style="margin-top:12px">${isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if ($("btnAgain")) $("btnAgain").onclick = () => act("start");
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = leaveGame;
}
if (location.hash === "#debug") window.__tiro = { scene, G, cam, botHit, rags }; // para testes
