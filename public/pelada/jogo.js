// Pelada da Galera — o jogo no navegador: menus, 3D (Three.js), jogador, bola, sons e rede.
// Mesmo esquema do Tiro da Galera: eu mexo o meu jogador aqui e mando a posição ~30x por segundo; os outros aparecem
// um pouquinho "no passado", interpolados. A bola é do servidor: aqui ela é PREVISTA a partir da última atualização
// (rodando a mesma física de campo.js), e quando chega uma atualização nova a diferença é corrigida aos poucos.
import * as THREE from "three";

const C = window.Campo, KITS = C.KITS;
const $ = (id) => document.getElementById(id);
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const setH = (id, html) => { const e = $(id); if (e._h !== html) { e._h = html; e.innerHTML = html; } }; // só mexe no HTML quando muda
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const SIDES = { A: "Mandante", B: "Visitante" };
const INTERP = 70; // ms que os outros ficam "no passado"
function toast(msg, ms = 3200) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.add("hidden"), ms); }
const kitOf = (k) => KITS[k] || KITS.corinthians;
// fundo do botão de camisa (listras, faixa…)
function kitCss(k) {
  const K = kitOf(k), c = K.c;
  if (K.kind === "vstripes") return `repeating-linear-gradient(90deg,${c[0]} 0 5px,${c[1]} 5px 10px)`;
  if (K.kind === "hstripes") return `repeating-linear-gradient(0deg,${c[0]} 0 5px,${c[1]} 5px 10px)`;
  if (K.kind === "band") return `linear-gradient(${c[0]} 0 35%,${c[1]} 35% 55%,${c[2]} 55% 70%,${c[0]} 70%)`;
  return c[0];
}

// ======================================================================
// Rede
// ======================================================================
const socket = io("/pelada");
let S = null, ME = null, offset = 0, bestRtt = Infinity, rtt = 60;
const sNow = () => Date.now() + offset;
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const P = (id) => S && S.players.find((p) => p.id === id);
function act(type, data = {}) { return new Promise((res) => socket.emit("act", { type, ...data }, (r) => { if (!r || !r.ok) toast(r ? r.error : "Sem conexão."); res(r && r.ok); })); }
function syncClock(n = 5) {
  for (let i = 0; i < n; i++) setTimeout(() => {
    const t0 = Date.now();
    socket.emit("clock", (ts) => { const r = Date.now() - t0; rtt = rtt * 0.7 + r * 0.3; if (r <= bestRtt + 5) { bestRtt = Math.min(bestRtt, r); offset = ts - (t0 + r / 2); } });
  }, i * 250);
}
socket.on("png", (ack) => typeof ack === "function" && ack());

let urlCode = new URLSearchParams(location.search).get("sala");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("pelada:" + r.code, ME);
  history.replaceState(null, "", "/pelada/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: store.get("pelada:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pelada:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/pelada/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("pelada:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); urlCode = null; ME = null; S = null; history.replaceState(null, "", "/pelada/"); $("roomTag").classList.add("hidden"); stopGame(); show("home"); });
function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- sala de espera ----------
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, size = S.config.size;
  const row = (p) => `<div class="pl ${p.id === (ME && ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" style="margin-left:auto">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const list = S.players.filter((p) => p.team === t), kit = S.kits[t];
    $("t" + t).innerHTML = list.map(row).join("") + Array.from({ length: Math.max(0, size - list.length) }, () => `<div class="pl muted" style="font-weight:500">vaga livre</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || list.length >= size);
    $("kn" + t).textContent = "Camisa: " + kitOf(kit).name;
    $("box" + t).style.borderColor = C.kitColor(kit);
    const canKit = isHost || (mine && mine.team === t);
    $("kits" + t).innerHTML = Object.keys(KITS).map((k) => `<button title="${h(KITS[k].name)}" data-kit="${k}" data-team="${t}" class="${k === kit ? "on" : ""}" style="background:${kitCss(k)}" ${canKit ? "" : "disabled"}></button>`).join("");
  }
  const bench = S.players.filter((p) => !p.team);
  $("tN").innerHTML = bench.length ? bench.map(row).join("") : "Ninguém no banco.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  document.querySelectorAll("#cfgSize button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === size); b.disabled = !isHost; });
  document.querySelectorAll("#cfgMin button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === S.config.minutes); b.disabled = !isHost; });
  const a = S.players.filter((p) => p.team === "A").length, b = S.players.filter((p) => p.team === "B").length;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${a && b ? "" : "disabled"}>Apitar o começo</button>${a && b ? (a !== b ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Times desiguais (${a} x ${b}). Dá pra jogar assim mesmo.</p>` : "") : `<p class="muted" style="font-size:13px;margin:8px 0 0">Precisa de pelo menos 1 jogador em cada time. Mande o convite!</p>`}`
    : `<p class="muted">Esperando o organizador apitar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
  document.querySelectorAll("[data-kick]").forEach((x) => (x.onclick = () => act("kick", { id: x.dataset.kick })));
  document.querySelectorAll("[data-kit]").forEach((x) => (x.onclick = () => act("kit", { team: x.dataset.team, kit: x.dataset.kit })));
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
function setCfg(k, v) { const c = { ...S.config, [k]: v }; store.set("pelada:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgMin button").forEach((b) => (b.onclick = () => setCfg("minutes", +b.dataset.v)));
$("btnPractice").onclick = () => startGame("treino");
$("btnPractice2").onclick = () => startGame("treino");

// ======================================================================
// Sons (sintetizados: chute, quique, apito, rede e torcida)
// ======================================================================
const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("pelada:vol") ?? 0.7;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
      const len = ac.sampleRate * 2; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function out(gain, pan) {
    const g = ac.createGain(); g.gain.value = gain;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(master); } else g.connect(master);
    return g;
  }
  function burst({ dur, f0, f1, gain, pan = 0, type = "lowpass", q = 0.7, at = 0, attack = 0.004 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out(gain, pan)); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone({ f0, f1 = f0, dur, gain, type = "sine", pan = 0, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out(gain, pan)); o.start(t); o.stop(t + dur + 0.05);
  }
  function whistle(n = 1, len = 0.35) { // apito: dois tons perto com trinado
    for (let i = 0; i < n; i++) { const at = i * (len + 0.12); tone({ f0: 2900, dur: len, gain: 0.08, type: "triangle", at }); tone({ f0: 3080, dur: len, gain: 0.06, type: "sine", at }); }
  }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("pelada:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    kick(power = 0.5, k = 1, pan = 0) { tone({ f0: 160 + power * 60, f1: 60, dur: 0.12, gain: (0.35 + power * 0.4) * k, pan }); burst({ dur: 0.06, f0: 2500, f1: 600, gain: 0.25 * k, pan, type: "bandpass", q: 1.2 }); },
    bounce(force, k = 1, pan = 0) { const v = clamp(force / 15, 0.05, 1) * k; if (v < 0.03) return; tone({ f0: 120, f1: 70, dur: 0.08, gain: 0.35 * v, pan }); burst({ dur: 0.05, f0: 1200, f1: 300, gain: 0.2 * v, pan }); },
    net() { burst({ dur: 0.45, f0: 5000, f1: 1500, gain: 0.25, type: "highpass" }); },
    whistle, start() { whistle(1, 0.7); }, end() { whistle(3, 0.45); },
    cheer() { burst({ dur: 3.2, f0: 1400, f1: 700, gain: 0.5, type: "bandpass", q: 0.6, attack: 0.25 }); burst({ dur: 2.6, f0: 600, f1: 300, gain: 0.35, attack: 0.3 }); [523, 659, 784].forEach((f, i) => tone({ f0: f, dur: 0.25, gain: 0.08, type: "square", at: 0.2 + i * 0.12 })); },
    ooh() { burst({ dur: 1.2, f0: 500, f1: 350, gain: 0.25, type: "bandpass", q: 1, attack: 0.15 }); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

// ======================================================================
// 3D: céu, luz, quadra, placas, alambrado, gols e arquibancada
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfdde8, 80, 220);
const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
function canvasTex(w, hh, draw, repeat = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 31 + hh));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
{ // céu de fim de tarde
  const g = new THREE.SphereGeometry(450, 32, 16), col = [], pos = g.attributes.position;
  const top = new THREE.Color(0x3a6fb8), mid = new THREE.Color(0x9fc6ea), low = new THREE.Color(0xf4d6a8);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 450, c = y > 0.08 ? mid.clone().lerp(top, Math.min(1, (y - 0.08) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.13, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
}
scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x4a6a3a, 1.4));
const sunL = new THREE.DirectionalLight(0xfff0d8, 2.4);
sunL.position.set(-18, 34, 22); sunL.castShadow = true;
Object.assign(sunL.shadow.camera, { left: -30, right: 30, top: 22, bottom: -22, near: 1, far: 120 });
sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
scene.add(sunL);

const L = C.HALF_L, W = C.HALF_W, PX = 50; // 50 pixels por metro na textura da quadra
{
  // chão em volta (cimento) e a grama sintética com as linhas do futsal
  const out = new THREE.Mesh(new THREE.PlaneGeometry(140, 110), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = "#8d8f8a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? "#0000000c" : "#ffffff0c"; x.fillRect(r() * w, r() * hh, 2, 2); } }, true), roughness: 1 }));
  out.material.map.repeat.set(20, 16); out.rotation.x = -Math.PI / 2; out.position.y = -0.05; out.receiveShadow = true; scene.add(out);
  const grass = canvasTex((2 * L + 2) * PX, (2 * W + 2) * PX, (x, w, hh, r) => {
    const m = (v) => (v + 1) * PX, X = (v) => m(v + L), Z = (v) => m(v + W);
    for (let i = 0; i < 2 * L + 2; i += 2) { x.fillStyle = (i / 2) % 2 ? "#2f8f48" : "#2a8141"; x.fillRect(i * PX, 0, 2 * PX, hh); }
    for (let i = 0; i < 26000; i++) { x.fillStyle = r() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(r() * w, r() * hh, 2, 3); }
    x.strokeStyle = "#f4f4f0"; x.lineWidth = 0.08 * PX; x.fillStyle = "#f4f4f0";
    x.strokeRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX);
    x.beginPath(); x.moveTo(X(0), Z(-W)); x.lineTo(X(0), Z(W)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), 3 * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), 0.15 * PX, 0, 7); x.fill();
    for (const s of [-1, 1]) { // área do futsal: dois quartos de círculo de 6 m saindo das traves, ligados por uma reta
      const gx = X(s * L), r6 = 6 * PX;
      x.beginPath();
      x.moveTo(gx, Z(-1.6 - 6));
      if (s < 0) { x.arc(gx, Z(-1.6), r6, -Math.PI / 2, 0); x.lineTo(gx + r6, Z(1.6)); x.arc(gx, Z(1.6), r6, 0, Math.PI / 2); }
      else { x.arc(gx, Z(-1.6), r6, -Math.PI / 2, -Math.PI, true); x.lineTo(gx - r6, Z(1.6)); x.arc(gx, Z(1.6), r6, Math.PI, Math.PI / 2, true); }
      x.stroke();
      x.beginPath(); x.arc(X(s * (L - 6)), Z(0), 0.12 * PX, 0, 7); x.fill();
      x.beginPath(); x.arc(X(s * (L - 10)), Z(0), 0.12 * PX, 0, 7); x.fill();
    }
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 2, 2 * W + 2), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true; scene.add(field);

  // placas de propaganda em volta
  const ads = ["PELADA DA GALERA", "⚽ VILA DA GALERA", "LEILÃO DA GALERA", "BAR DA SINUCA", "CORRIDA DA GALERA", "TIRO DA GALERA"];
  const adCols = [["#0d47a1", "#ffd84a"], ["#b71c1c", "#ffffff"], ["#1b5e20", "#ffffff"], ["#212121", "#ffd84a"], ["#e65100", "#ffffff"], ["#4a148c", "#ffffff"]];
  const adTex = canvasTex(2048, 64, (x, w, hh) => {
    const seg = w / 6;
    ads.forEach((t, i) => { const [bg, fg] = adCols[i]; x.fillStyle = bg; x.fillRect(i * seg, 0, seg, hh); x.fillStyle = fg; x.font = "bold 34px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, i * seg + seg / 2, hh / 2 + 2); });
  }, true);
  const BH = 1.0, BT = 0.15;
  const board = (len, x0, z0, rotY) => {
    const t = adTex.clone(); t.repeat.set(len / 24, 1); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, BH, BT), [M(0x333333), M(0x333333), M(0x222222), M(0x222222), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), M(0x333333)]);
    m.position.set(x0, BH / 2, z0); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true; scene.add(m);
  };
  board(2 * L + 2 * BT, 0, -W - BT / 2, 0); board(2 * L + 2 * BT, 0, W + BT / 2, Math.PI);
  for (const s of [-1, 1]) for (const zs of [-1, 1]) { const len = W - C.GOAL_W - 0.1; board(len, s * (L + BT / 2), zs * (C.GOAL_W + 0.1 + len / 2), s < 0 ? Math.PI / 2 : -Math.PI / 2); }

  // alambrado (tela em losango) e postes
  const fenceTex = canvasTex(64, 64, (x, w) => { x.strokeStyle = "#d8dde0"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, w / 2); x.lineTo(w / 2, 0); x.lineTo(w, w / 2); x.lineTo(w / 2, w); x.closePath(); x.stroke(); }, true);
  const fenceMat = (lw, lh) => { const t = fenceTex.clone(); t.repeat.set(lw / 0.5, lh / 0.5); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, transparent: false, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }); };
  const fence = (lw, lh, x0, y0, z0, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), fenceMat(lw, lh)); m.position.set(x0, y0 + lh / 2, z0); m.rotation.y = rotY; scene.add(m); };
  const FH = C.FENCE_H;
  fence(2 * L, FH - BH, 0, BH, -W - 0.05, 0); fence(2 * L, FH - BH, 0, BH, W + 0.05, 0);
  for (const s of [-1, 1]) { fence(2 * W, FH - C.GOAL_H - 0.4, s * (L + C.GOAL_D + 0.05), C.GOAL_H + 0.4, 0, Math.PI / 2); for (const zs of [-1, 1]) { const lw = W - C.GOAL_W; fence(lw, FH - BH, s * (L + 0.05), BH, zs * (C.GOAL_W + lw / 2), Math.PI / 2); } }
  const pole = M(0x4a4f55, { metalness: 0.6, roughness: 0.4 });
  for (let x0 = -L; x0 <= L; x0 += 5) for (const zs of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, FH, 8), pole); m.position.set(x0, FH / 2, zs * (W + 0.1)); m.castShadow = true; scene.add(m); }
  // refletores nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * (L + 4), 0, sz * (W + 4)); scene.add(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 16, 8), pole); m.position.y = 8; m.castShadow = true; g.add(m);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), M(0x2b2f33)); box.position.y = 16.4; box.lookAt(-sx * 40, 0, -sz * 40); g.add(box);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); l.position.set((i % 3 - 1) * 0.7, (i < 3 ? 0.3 : -0.3), 0.21); box.add(l); }
  }
  // arquibancada de um lado, com a torcida (pontinhos coloridos)
  const crowdTex = canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#6d6f72"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"][Math.floor(r() * 7)]; x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"][Math.floor(r() * 4)]; x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } }, true);
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2 * L + 6, 0.5, 1), [M(0x777a7e), M(0x777a7e), M(0x8a8d90), M(0x777a7e), new THREE.MeshStandardMaterial({ map: (() => { const t = crowdTex.clone(); t.repeat.set(6, 1); t.offset.x = i * 0.37; t.needsUpdate = true; return t; })() }), M(0x777a7e)]);
    step.position.set(0, 0.25 + i * 0.5 + 0.3, -(W + 3 + i * 1)); step.castShadow = step.receiveShadow = true; scene.add(step);
  }
}
function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o }); }

// gols: traves brancas e rede
{
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / 0.12, lh / 0.12); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = C.POST_R, GW = C.GOAL_W, GH = C.GOAL_H, GD = C.GOAL_D;
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.x = s * L; scene.add(g);
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; bar.castShadow = true; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(s * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(s * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(s * GD / 2, GH / 2, z); g.add(side); }
  }
}

// ---------- bola ----------
const ballTex = canvasTex(512, 256, (x, w, hh) => {
  x.fillStyle = "#fafafa"; x.fillRect(0, 0, w, hh);
  x.fillStyle = "#1a1a1a";
  const spots = [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5], [0.9, 0.5], [0.2, 0.18], [0.6, 0.18], [0.4, 0.82], [0.8, 0.82], [0, 0.04], [0.5, 0.96]];
  for (const [u, v] of spots) { x.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const px = u * w + Math.cos(a) * 30 / Math.max(0.35, Math.sin(v * Math.PI)), py = v * hh + Math.sin(a) * 30; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); }
});
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(C.BALL_R, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 }));
ballMesh.castShadow = true; scene.add(ballMesh);
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; scene.add(blob);

// ---------- jogadores (feitos de caixinhas, com a camisa do time) ----------
function shirtTex(kitId, num, back) {
  const K = kitOf(kitId), c = K.c;
  return canvasTex(128, 128, (x, w, hh) => {
    if (K.kind === "vstripes") for (let i = 0; i < 8; i++) { x.fillStyle = c[i % 2]; x.fillRect(i * w / 8, 0, w / 8, hh); }
    else if (K.kind === "hstripes") for (let i = 0; i < 8; i++) { x.fillStyle = c[i % 2]; x.fillRect(0, i * hh / 8, w, hh / 8); }
    else if (K.kind === "band") { x.fillStyle = c[0]; x.fillRect(0, 0, w, hh); x.fillStyle = c[1]; x.fillRect(0, hh * 0.32, w, hh * 0.14); x.fillStyle = c[2]; x.fillRect(0, hh * 0.46, w, hh * 0.1); }
    else { x.fillStyle = c[0]; x.fillRect(0, 0, w, hh); }
    x.fillStyle = K.num; x.textAlign = "center"; x.textBaseline = "middle";
    if (back) { x.font = "bold 70px Figtree, Arial, sans-serif"; x.lineWidth = 6; x.strokeStyle = "#0004"; x.strokeText(num, w / 2, hh / 2 + 6); x.fillText(num, w / 2, hh / 2 + 6); }
    else { x.font = "bold 28px Figtree, Arial, sans-serif"; x.fillText(num, w * 0.3, hh * 0.3); }
  });
}
function nameSprite(text, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 32px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000b"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.3, 0.33, 1); s.renderOrder = 10; return s;
}
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a77c];
function makePlayer(kitId, num, name, opts = {}) {
  const K = kitOf(kitId), g = new THREE.Group();
  const skin = M(SKINS[(name.length * 7 + num) % SKINS.length]), shorts = M(new THREE.Color(K.shorts).getHex()), sock = M(new THREE.Color(C.kitColor(kitId)).getHex()), boot = M(0x161616);
  const shirtC = M(new THREE.Color(K.c[0]).getHex());
  const legs = [];
  for (const sx of [-0.11, 0.11]) {
    const l = new THREE.Group(); l.position.set(sx, 0.85, 0);
    const part = (gg, w, hh, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); gg.add(m); return m; };
    part(l, 0.18, 0.3, 0.2, shorts, 0, -0.12, 0); part(l, 0.14, 0.3, 0.15, skin, 0, -0.4, 0); part(l, 0.15, 0.22, 0.16, sock, 0, -0.66, 0); part(l, 0.16, 0.1, 0.27, boot, 0, -0.8, -0.04);
    g.add(l); legs.push(l);
  }
  const front = new THREE.MeshStandardMaterial({ map: shirtTex(kitId, num, false), roughness: 0.7 }), backM = new THREE.MeshStandardMaterial({ map: shirtTex(kitId, num, true), roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.26), [shirtC, shirtC, shirtC, shirtC, backM, front]); torso.position.y = 1.16; g.add(torso);
  const arms = [];
  for (const sx of [-0.3, 0.3]) {
    const a = new THREE.Group(); a.position.set(sx, 1.42, 0);
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.14), shirtC); up.position.y = -0.12; a.add(up);
    const lo = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.3, 0.12), skin); lo.position.y = -0.4; a.add(lo);
    g.add(a); arms.push(a);
  }
  const head = new THREE.Group(); head.position.y = 1.46; g.add(head);
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skin); hd.position.y = 0.15; head.add(hd);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), M(0x2a1b10)); hair.position.y = 0.31; head.add(hair);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.01), M(0x111111)); eyes.position.set(0, 0.18, -0.131); head.add(eyes);
  if (opts.gloves) for (const a of arms) { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), M(0xf5f5f5)); gl.position.y = -0.6; a.add(gl); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let tag = null; if (name) { tag = nameSprite(name, C.kitColor(kitId) === "#f4f4f4" ? "#ffffff" : C.kitColor(kitId)); tag.position.y = 2.15; g.add(tag); }
  g.userData = { legs, arms, head, tag };
  return g;
}
// pose: corrida (balança braços e pernas), chute (perna direita vai para a frente)
function animate(model, speed, dt, st) {
  const u = model.userData;
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const sw = speed > 0.4 ? Math.sin(st.anim) * Math.min(0.9, speed / 7) : 0;
  const kick = st.kickT ? Math.sin(clamp((performance.now() / 1000 - st.kickT) / 0.28, 0, 1) * Math.PI) : 0;
  u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.35);
  u.legs[1].rotation.x = kick > 0.01 ? -kick * 1.3 : lerp(u.legs[1].rotation.x, -sw, 0.35);
  u.arms[0].rotation.x = lerp(u.arms[0].rotation.x, -sw * 0.8, 0.35); u.arms[1].rotation.x = lerp(u.arms[1].rotation.x, sw * 0.8, 0.35);
}

// mira no chão: uma setinha na frente do meu jogador mostrando para onde vai o chute
const aim = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.18, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
aim.rotation.x = -Math.PI / 2; scene.add(aim);

// ======================================================================
// Estado do jogo no navegador
// ======================================================================
const G = { active: false, mode: null, me: null, remotes: new Map(), keeper: null, kickoffKey: null, lastSend: 0, feed: [], camYaw: 0, camPitch: 0.05, score: { A: 0, B: 0 }, tv: false };
const keys = new Set();
let sens = store.get("pelada:sens") ?? 1.6, jumpQueued = false, charge = null;
const now = () => performance.now() / 1000;
const locked = () => document.pointerLockElement === canvas;
// bola: última atualização do servidor + correção visual
const ballS = { snap: null, view: C.newBall(), off: { x: 0, y: 0, z: 0 }, ignoreUntil: 0, pred: null };
const local = { ball: null }; // treino: a bola roda só aqui

function newMe(spawn) { return { x: spawn[0], y: 0, z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, facing: spawn[3], stamina: 1, sprint: false, kickT: 0, lastKick: 0 }; }
function myKit() { if (G.mode === "treino") return store.get("pelada:kit") || "corinthians"; const m = myP(); return m && m.team ? S.kits[m.team] : "corinthians"; }
function startGame(mode) {
  if (G.active && G.mode === mode) return;
  stopGame();
  G.active = true; G.mode = mode; G.kickoffKey = null; G.feed = []; G.score = { A: 0, B: 0 };
  show("game"); resize();
  const sp = C.spawns("A", 1, false)[0];
  G.me = newMe(sp); G.camYaw = sp[3]; G.camPitch = 0.05;
  rebuildMyModel();
  if (mode === "treino") {
    local.ball = C.newBall(); local.ball.x = 3;
    G.me.x = -2; G.keeper = { id: "goleiro", x: L - 0.6, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, holdT: 0, model: makePlayer("laranja", 1, "Goleiro", { gloves: true }), st: {} };
    G.keeper.model.rotation.y = Math.PI / 2; scene.add(G.keeper.model);
    G.tKicks = 0; G.tGoals = 0;
  } else syncFromState(null, S);
  $("pause").classList.remove("hidden");
  requestAnimationFrame(loop);
}
function stopGame() {
  if (!G.active) return;
  G.active = false;
  for (const r of G.remotes.values()) scene.remove(r.model);
  G.remotes.clear();
  if (G.keeper) { scene.remove(G.keeper.model); G.keeper = null; }
  if (G.meModel) { scene.remove(G.meModel); G.meModel = null; }
  local.ball = null; charge = null;
  if (document.pointerLockElement) document.exitPointerLock();
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
function rebuildMyModel() {
  if (G.meModel) scene.remove(G.meModel);
  const m = myP(), playing = G.mode === "treino" || (m && m.team);
  G.meModel = playing ? makePlayer(myKit(), m ? m.num || 10 : 10, "", {}) : null;
  G.meKit = myKit();
  if (G.meModel) scene.add(G.meModel);
}
function leaveGame() {
  if (G.mode === "treino") { stopGame(); if (S) { if (S.phase !== "lobby") startGame("online"); else { show("lobby"); renderLobby(); } } else show("home"); return; }
  if (confirm("Sair da quadra? O jogo continua sem você.")) { socket.disconnect(); urlCode = null; ME = null; S = null; stopGame(); history.replaceState(null, "", "/pelada/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect(); }
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
  const mine = myP(), m = st.match;
  // bonecos dos outros
  const ids = new Set();
  for (const p of st.players) {
    if (!p.team || (ME && p.id === ME.id)) continue;
    ids.add(p.id);
    let rm = G.remotes.get(p.id);
    const key = `${p.team}|${st.kits[p.team]}|${p.num}`;
    if (!rm || rm.key !== key) {
      if (rm) scene.remove(rm.model);
      rm = { id: p.id, key, team: p.team, name: p.name, model: makePlayer(st.kits[p.team], p.num, p.name), buf: [], x: 0, y: 0, z: 0, yaw: 0, speed: 0, st: {} };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    if (p.spawn && m && (!old || !old.match || old.match.kickoff !== m.kickoff)) rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: 0, z: p.spawn[2], yaw: p.spawn[3], vx: 0, vz: 0 }];
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { scene.remove(rm.model); G.remotes.delete(id); }
  if ((G.meKit !== myKit()) || (!!G.meModel !== !!(mine && mine.team))) rebuildMyModel();
  // saída de bola: volta para a posição e olha para o gol adversário
  if (m && `${m.kickoff}` !== G.kickoffKey) {
    G.kickoffKey = `${m.kickoff}`;
    if (mine && mine.team && mine.spawn) { Object.assign(G.me, newMe(mine.spawn)); G.camYaw = mine.spawn[3]; G.camPitch = 0.05; }
    ballS.snap = null; Object.assign(ballS.view, C.newBall()); ballS.off = { x: 0, y: 0, z: 0 };
    if (m.kickoff > 1 || !old || !old.match) flashMsg("Saída de bola", "", 2000);
  }
  if (m && old && old.match && old.match.phase === "ready" && m.phase === "live") Sound.start();
  if (st.phase === "over" && old && old.phase !== "over") Sound.end();
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}

// ---------- bola, chutes e gols vindos do servidor ----------
socket.on("ball", (d) => {
  if (!G.active || G.mode !== "online") return;
  if (d.hit > 2) { const [k, pan] = hearing([d.x, d.y, d.z]); Sound.bounce(d.hit, k, pan); }
  if (performance.now() < ballS.ignoreUntil) return; // acabei de chutar: espero o chute voltar do servidor
  // a bola "pula" para a posição certa, mas o desenho corrige aos poucos (sem teletransporte)
  const before = { ...ballS.view };
  ballS.snap = d;
  const pred = predictBall();
  if (pred) { ballS.off = { x: before.x - pred.x, y: before.y - pred.y, z: before.z - pred.z }; if (Math.hypot(ballS.off.x, ballS.off.y, ballS.off.z) > 3) ballS.off = { x: 0, y: 0, z: 0 }; }
});
socket.on("kicked", (d) => {
  if (!G.active || G.mode !== "online") return;
  const rm = G.remotes.get(d.id);
  if (rm) { rm.st.kickT = now(); const [k, pan] = hearing([rm.x, 0.5, rm.z]); Sound.kick(d.power, k, pan); }
  if (ME && d.id === ME.id) ballS.ignoreUntil = 0; // o servidor aceitou meu chute: volto a seguir a bola dele
});
socket.on("goal", (d) => {
  if (!G.active || G.mode !== "online") return;
  const by = P(d.by), as = P(d.assist), kit = S.kits[d.side];
  Sound.net(); Sound.cheer();
  flashMsg("GOOOL!", by ? (d.own ? `Gol contra de ${by.name}` : `${by.name}${as ? ` (passe de ${as.name})` : ""} · ${SIDES[d.side]}`) : SIDES[d.side], 3800, C.kitColor(kit), true);
  pushFeed(`⚽ ${by ? h(by.name) + (d.own ? " (contra)" : "") : SIDES[d.side]}${as ? ` <span style="opacity:.75">· ${h(as.name)}</span>` : ""}`);
});
function predictBall() {
  const s = ballS.snap; if (!s) return null;
  const b = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz };
  const live = S && S.match && S.match.phase !== "ready";
  const dt = live ? clamp((sNow() - s.t) / 1000, 0, 0.25) : 0;
  if (dt > 0) C.simulate(b, mePhys() ? [mePhys()] : [], dt);
  return b;
}
const mePhys = () => (G.meModel && G.me ? { id: "eu", x: G.me.x, y: G.me.y, z: G.me.z, vx: G.me.vx, vy: G.me.vy, vz: G.me.vz, sprint: G.me.sprint } : null);
function hearing(p) {
  const ex = cam.position, dx = p[0] - ex.x, dz = p[2] - ex.z, dist = Math.hypot(dx, dz, p[1] - ex.y);
  const yaw = G.camYaw, right = [Math.cos(yaw), -Math.sin(yaw)];
  return [1 / (1 + dist / 14), dist > 0.5 ? (dx * right[0] + dz * right[1]) / dist * 0.7 : 0];
}
let msgT = 0;
function flashMsg(big, small = "", ms = 2500, color = "#fff", pop = false) {
  setH("hMsg", `<span style="color:${color}">${h(big)}</span>${small ? `<small>${h(small)}</small>` : ""}`); msgT = now() + ms / 1000;
  const e = $("hMsg"); e.classList.remove("goal"); if (pop) { void e.offsetWidth; e.classList.add("goal"); }
}
function pushFeed(html) { G.feed.push({ at: now(), html }); if (G.feed.length > 5) G.feed.shift(); }

// ======================================================================
// Controles
// ======================================================================
canvas.addEventListener("click", () => { if (G.active && !locked() && $("over").classList.contains("hidden")) canvas.requestPointerLock?.(); });
$("btnResume").onclick = () => { Sound.unlock(); canvas.requestPointerLock?.(); };
$("btnLeave").onclick = leaveGame;
document.addEventListener("pointerlockchange", () => {
  const on = locked();
  $("pause").classList.toggle("hidden", on || !G.active || !$("over").classList.contains("hidden"));
  if (!on) { keys.clear(); charge = null; renderPauseSb(); }
});
$("sens").value = sens; $("sensV").textContent = sens.toFixed(2);
$("sens").oninput = (e) => { sens = +e.target.value; $("sensV").textContent = sens.toFixed(2); store.set("pelada:sens", sens); };
$("vol").value = Sound.vol; $("volV").textContent = Math.round(Sound.vol * 100) + "%";
$("vol").oninput = (e) => { Sound.setVol(+e.target.value); $("volV").textContent = Math.round(Sound.vol * 100) + "%"; };
document.addEventListener("mousemove", (e) => {
  if (!locked()) return;
  const k = sens * 0.022 * (Math.PI / 180);
  G.camYaw -= e.movementX * k; G.camPitch = clamp(G.camPitch - e.movementY * k, -0.45, 0.7);
});
document.addEventListener("mousedown", (e) => {
  if (!locked() || !G.meModel) return;
  if (e.button === 0) charge = { kind: "chute", t0: now() };
  if (e.button === 2) charge = { kind: "passe", t0: now() };
});
document.addEventListener("mouseup", (e) => {
  if (!charge || !G.meModel) return;
  if ((e.button === 0 && charge.kind === "chute") || (e.button === 2 && charge.kind === "passe")) { const c = charge; charge = null; doKick(c.kind, powerOf(c)); }
});
const powerOf = (c) => clamp((now() - c.t0) / (c.kind === "passe" ? 0.8 : 0.9), 0, 1);
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Tab") { e.preventDefault(); $("tab").classList.remove("hidden"); $("tab").innerHTML = scoreTable(); return; }
  if (!locked()) return;
  if (e.code === "Space" && !e.repeat) jumpQueued = true;
  if (e.code === "KeyC" && !e.repeat) G.tv = !G.tv; // câmera de TV
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => { keys.delete(e.code); if (e.code === "Tab") $("tab").classList.add("hidden"); });
window.addEventListener("blur", () => { keys.clear(); charge = null; });

function canPlay() { if (G.mode === "treino") return true; const m = S && S.match; return S && S.phase === "play" && m && m.phase === "live"; }
function doKick(kind, power) {
  const me = G.me, t = now();
  if (!canPlay() || t - me.lastKick < C.KICK_CD) return;
  const ball = G.mode === "treino" ? local.ball : ballS.view;
  const how = C.canKick(me, ball, G.mode === "treino" ? 0 : 0.2);
  me.kickT = t; me.lastKick = t; // a perna balança mesmo se errar
  if (!how) return;
  Sound.kick(power);
  if (G.mode === "treino") { C.kick(local.ball, me, kind, power, G.camYaw, G.camPitch); G.tKicks++; return; }
  socket.emit("kick", { kind, power, yaw: G.camYaw, pitch: G.camPitch });
  // previsão: a bola já sai do meu pé aqui; o servidor confirma em seguida
  const b = { ...ballS.view }; C.kick(b, me, kind, power, G.camYaw, G.camPitch, 0.2);
  ballS.snap = { t: sNow(), x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz }; ballS.off = { x: 0, y: 0, z: 0 };
  ballS.ignoreUntil = performance.now() + rtt + 60;
}

// ======================================================================
// Laço principal
// ======================================================================
function resize() { const w = innerWidth, hh = innerHeight; renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
window.addEventListener("resize", resize);
let lastT = now();
function loop() {
  if (!G.active) return;
  requestAnimationFrame(loop);
  const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
  try { frame(dt, t); } catch (e) { console.error(e); }
}
function frame(dt, t) {
  const me = G.me, online = G.mode === "online", m = S && S.match;
  const playing = !!G.meModel, frozen = online && (!m || m.phase === "ready" || S.phase !== "play");
  // meu jogador
  if (playing) {
    const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const yaw = G.camYaw;
    let wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
    const len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
    const wantSprint = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && len > 0 && !charge;
    me.sprint = wantSprint && me.stamina > 0.02;
    me.stamina = clamp(me.stamina + (me.sprint ? -0.24 : 0.14) * dt, 0, 1);
    let speed = charge ? C.CHARGING : me.sprint ? C.SPRINT : C.RUN;
    if (frozen || !len) speed = 0;
    if (frozen) { me.vx = 0; me.vz = 0; }
    C.movePlayer(me, { x: wx, z: wz, speed, jump: jumpQueued && !frozen }, dt);
    jumpQueued = false;
    // empurrão leve: não dá para atravessar os outros jogadores
    const others = [...G.remotes.values(), ...(G.keeper ? [G.keeper] : [])];
    for (const o of others) { const dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz), min = 2 * C.P_R; if (d < min && d > 1e-4) { me.x += (dx / d) * (min - d); me.z += (dz / d) * (min - d); } }
    // o corpo vira para onde estou correndo; carregando o chute, vira para a mira
    const hsp = Math.hypot(me.vx, me.vz);
    const target = charge ? yaw : hsp > 0.5 ? Math.atan2(-me.vx, -me.vz) : me.facing;
    let dy = target - me.facing; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.facing += dy * Math.min(1, dt * 12);
    G.meModel.position.set(me.x, me.y, me.z); G.meModel.rotation.y = me.facing;
    animate(G.meModel, hsp, dt, me);
    // envia minha posição
    if (online && t - G.lastSend > 1 / 30) {
      G.lastSend = t; const q = (v) => Math.round(v * 1000) / 1000;
      socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), vx: q(me.vx), vy: q(me.vy), vz: q(me.vz), yaw: q(me.facing), sp: me.sprint ? 1 : 0, ch: charge ? 1 : 0 });
    }
  }
  if (G.mode === "treino") practiceStep(dt, t);
  updateRemotes(dt);
  updateBall(dt);
  updateCamera(dt);
  hud(t);
  renderer.render(scene, cam);
}

function updateRemotes(dt) {
  const rt = sNow() - INTERP;
  for (const rm of G.remotes.values()) {
    const b = rm.buf;
    if (b.length) {
      let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
      const B = b[i], A = b[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((rt - A.t) / (B.t - A.t), 0, 1);
      const nx = lerp(A.x, B.x, k), nz = lerp(A.z, B.z, k);
      rm.speed = Math.hypot(nx - rm.x, nz - rm.z) / Math.max(dt, 1e-3);
      rm.x = nx; rm.y = lerp(A.y, B.y, k); rm.z = nz;
      let dy = B.yaw - A.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); rm.yaw = A.yaw + dy * k;
      while (b.length > 2 && b[1].t < rt - 200) b.shift();
    }
    rm.model.position.set(rm.x, rm.y, rm.z); rm.model.rotation.y = rm.yaw;
    animate(rm.model, rm.speed, dt, rm.st);
  }
}
socket.on("st", (d) => { const rm = G.remotes.get(d.id); if (!rm) return; rm.buf.push(d); if (rm.buf.length > 40) rm.buf.shift(); });

function updateBall(dt) {
  let b;
  if (G.mode === "treino") b = local.ball;
  else {
    const pred = predictBall() || C.newBall();
    const k = Math.exp(-dt * 12); ballS.off.x *= k; ballS.off.y *= k; ballS.off.z *= k;
    b = ballS.view; b.x = pred.x + ballS.off.x; b.y = Math.max(C.BALL_R, pred.y + ballS.off.y); b.z = pred.z + ballS.off.z; b.vx = pred.vx; b.vy = pred.vy; b.vz = pred.vz;
  }
  if (!b) return;
  // rola: gira em volta do eixo perpendicular ao movimento
  const prev = ballMesh.userData.prev || { x: b.x, z: b.z }, mx = b.x - prev.x, mz = b.z - prev.z, dist = Math.hypot(mx, mz);
  if (dist > 1e-5 && dist < 2) ballMesh.rotateOnWorldAxis(new THREE.Vector3(mz / dist, 0, -mx / dist), dist / C.BALL_R);
  ballMesh.userData.prev = { x: b.x, z: b.z };
  ballMesh.position.set(b.x, b.y, b.z);
  blob.position.set(b.x, 0.01, b.z); blob.material.opacity = clamp(0.3 - b.y * 0.04, 0.05, 0.3); blob.scale.setScalar(1 + b.y * 0.15);
}

// treino: a bola, o goleiro e os gols rodam só aqui
function practiceStep(dt, t) {
  const b = local.ball, me = G.me, k = G.keeper;
  // goleiro: anda na linha do gol acompanhando a bola, pula se ela vier alta, e devolve a bola quando ela para perto
  const tz = clamp(b.z * 0.8, -C.GOAL_W + 0.3, C.GOAL_W - 0.3);
  const want = clamp((tz - k.z) * 6, -5.5, 5.5), comingHigh = b.vx > 4 && b.x > L - 8 && b.y > 1.1;
  C.movePlayer(k, { x: 0, z: Math.sign(want), speed: Math.abs(want), jump: comingHigh && k.onGround }, dt);
  k.x = L - 0.6;
  const near = Math.hypot(b.x - k.x, b.z - k.z) < 1.2 && Math.hypot(b.vx, b.vz) < 3 && b.y < 1;
  if (near) { k.holdT += dt; if (k.holdT > 0.8) { k.holdT = 0; k.st.kickT = t; C.kick(b, k, "passe", 0.6 + Math.random() * 0.3, Math.PI / 2 + (Math.random() - 0.5) * 0.8, 0); Sound.kick(0.5, 0.6); } }
  else k.holdT = 0;
  k.model.position.set(k.x, k.y, k.z); animate(k.model, Math.abs(k.vz), dt, k.st);
  // bola com os dois jogadores
  if (G.practiceGoalAt) { if (t - G.practiceGoalAt > 2.2) { G.practiceGoalAt = 0; Object.assign(b, C.newBall(), { x: me.x + 1.5 * -Math.sin(G.camYaw), z: me.z + 1.5 * -Math.cos(G.camYaw) }); } else C.simulate(b, [], dt); return; }
  const r = C.simulate(b, [{ id: "eu", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, sprint: me.sprint }, k], dt);
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan); }
  const side = C.goalOf(b);
  if (side === "A") { G.tGoals++; G.practiceGoalAt = t; Sound.net(); Sound.cheer(); flashMsg("GOOOL!", `${G.tGoals} gol${G.tGoals === 1 ? "" : "s"} no treino`, 2500, "#ffd84a", true); }
  else if (side === "B") { G.practiceGoalAt = t; Sound.ooh(); flashMsg("Gol contra!", "", 2000, "#ff8a8a"); }
}

function updateCamera(dt) {
  const me = G.me, b = ballMesh.position;
  if (!G.meModel || G.tv) { // câmera de TV: do alto da lateral, seguindo a bola
    const tx = clamp(b.x, -L + 6, L - 6);
    cam.position.lerp(new THREE.Vector3(tx * 0.8, 8.5, W - 0.6), Math.min(1, dt * 3)); // no alto, por dentro do alambrado
    cam.lookAt(tx, 0, b.z * 0.3 - 3);
    if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
    aim.visible = false;
    return;
  }
  if (cam.fov !== 70) { cam.fov = 70; cam.updateProjectionMatrix(); }
  const yaw = G.camYaw, pitch = G.camPitch, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const elev = clamp(0.32 - pitch * 0.8, -0.05, 1.1), dist = 4.6;
  const tgt = new THREE.Vector3(me.x, me.y + 1.5, me.z);
  cam.position.set(tgt.x - fx * dist * Math.cos(elev), Math.max(0.35, tgt.y + dist * Math.sin(elev)), tgt.z - fz * dist * Math.cos(elev));
  cam.lookAt(tgt.x + fx * 6, tgt.y + pitch * 6 - 0.3, tgt.z + fz * 6);
  // setinha da mira no chão
  aim.visible = true; aim.position.set(me.x + fx * 1.1, 0.02, me.z + fz * 1.1); aim.rotation.z = yaw + Math.PI / 2;
  aim.material.opacity = charge ? 0.9 : 0.4;
}

// ======================================================================
// HUD
// ======================================================================
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function hud(t) {
  const online = G.mode === "online", m = S && S.match, me = G.me;
  if (online && m) {
    const left = m.phase === "live" ? m.left - (sNow() - S.now) : m.left;
    const sw = (tm) => `<i style="background:${kitCss(S.kits[tm])}"></i>`;
    setH("hTop", `<div class="t">${sw("A")}${h(kitOf(S.kits.A).name)}</div><div class="s">${m.score.A}</div><div class="clock num">${fmtT(left)}</div><div class="s">${m.score.B}</div><div class="t">${h(kitOf(S.kits.B).name)}${sw("B")}</div>`);
    const mp = myP(); setH("hPing", mp && mp.ping != null ? `ping ${mp.ping} ms` : "");
    if (m.phase === "ready" && t > msgT) setH("hMsg", `<small>Começa em ${Math.max(1, Math.ceil((m.until - sNow()) / 1000))}…</small>`);
    else if (t > msgT) setH("hMsg", "");
  } else if (G.mode === "treino") {
    setH("hTop", `<div class="clock" style="font-size:16px">🧤 TREINO · ${G.tGoals} gol${G.tGoals === 1 ? "" : "s"} · ${G.tKicks} chute${G.tKicks === 1 ? "" : "s"}</div>`);
    setH("hPing", "C = câmera de TV · Esc = menu");
    if (t > msgT) setH("hMsg", "");
  }
  // força do chute
  $("hPow").classList.toggle("hidden", !charge); $("hPowL").classList.toggle("hidden", !charge);
  if (charge) { const p = powerOf(charge); $("hPow").firstElementChild.style.width = Math.round(p * 100) + "%"; setH("hPowL", charge.kind === "passe" ? "Passe" : G.camPitch > 0.15 ? "Chute por cima" : "Chute"); }
  $("hSta").classList.toggle("hidden", !G.meModel);
  if (G.meModel) $("hSta").querySelector("i").style.width = Math.round(me.stamina * 100) + "%";
  setH("hHint", G.meModel ? "Segure o clique: chute · Botão direito: passe<br>Shift: pique · Espaço: pular · C: câmera de TV" : "Assistindo · Tab: placar");
  G.feed = G.feed.filter((f) => t - f.at < 8);
  setH("hFeed", G.feed.map((f) => `<div>${f.html}</div>`).join(""));
  $("cross").classList.toggle("hidden", !G.meModel || G.tv);
}
function scoreTable() {
  if (G.mode === "treino") return `<p>Gols: <b>${G.tGoals}</b> · Chutes: <b>${G.tKicks}</b></p>`;
  if (!S || !S.match) return "";
  const m = S.match;
  const rows = ["A", "B"].flatMap((tm) => S.players.filter((p) => p.team === tm).sort((a, b) => b.goals - a.goals))
    .map((p) => `<tr class="${ME && p.id === ME.id ? "me" : ""}"><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${kitCss(S.kits[p.team])};margin-right:6px"></i>${h(p.name)} <span class="muted">#${p.num}</span></td><td class="n">${p.goals}</td><td class="n">${p.assists}</td><td class="n">${p.shots}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>${h(kitOf(S.kits.A).name)} ${m.score.A}</span><span>${m.score.B} ${h(kitOf(S.kits.B).name)}</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Gols</th><th class="n">Assist.</th><th class="n">Chutes</th><th class="n">Ping</th></tr>${rows}</table>`;
}
function renderPauseSb() { $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div>` : ""; $("pauseHint").textContent = G.mode === "treino" ? "Treino: só você e o goleiro." : ""; }
function showOver() {
  if (document.pointerLockElement) document.exitPointerLock();
  $("pause").classList.add("hidden");
  const m = S.match, isHost = ME && S.host === ME.id, mine = myP();
  const w = m.score.A === m.score.B ? null : m.score.A > m.score.B ? "A" : "B";
  $("overBox").innerHTML = `<h2>${w ? `🏆 ${h(kitOf(S.kits[w]).name)} venceu!` : "🤝 Empate!"}</h2>
    <p class="muted" style="margin:0 0 6px">${mine && mine.team && w ? (mine.team === w ? "Boa! Seu time ganhou." : "Não foi dessa vez.") : ""}</p>${scoreTable()}
    <div class="row" style="margin-top:12px">${isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if ($("btnAgain")) $("btnAgain").onclick = () => act("start");
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = leaveGame;
}
if (location.hash === "#debug") window.__pelada = { scene, G, cam, ballS, local }; // para testes
