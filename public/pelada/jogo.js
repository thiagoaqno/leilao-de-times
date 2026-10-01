// Pelada da Galera — o jogo no navegador: menus, 3D (Three.js), jogador a pé ou carro, bola, sons e rede.
// Eu mexo o meu jogador/carro aqui e mando a posição ~30x por segundo. O servidor manda UM pacote 20x por segundo
// com a bola e todo mundo; os outros aparecem 100 ms "no passado", interpolados. A bola é PREVISTA a partir do último
// pacote (rodando a mesma física de campo.js) e a diferença é corrigida aos poucos.
import * as THREE from "three";
import { Ragdoll } from "/ragdoll.js";

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
const angLerp = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
const SIDES = { A: "Mandante", B: "Visitante" };
const FL = { sprint: 1, charge: 2, slide: 4, dive: 8, flip: 16, down: 32, boost: 64 };
const INTERP = 100; // ms que os outros ficam "no passado" (pacotes a cada 50 ms)
// a mesma página serve duas casas: /pelada/ (futebol a pé) e /rocket/ (futebol de carro, estilo Rocket League)
const FIXO = location.pathname.startsWith("/rocket") ? "carros" : "pes", BASE = FIXO === "carros" ? "/rocket/" : "/pelada/";
if (FIXO === "carros") {
  document.title = "Rocket da Galera";
  document.getElementById("brandTitle").innerHTML = "🚀 Rocket da <span>Galera</span>";
  document.getElementById("heroTitle").innerHTML = "Futebol de<br><em>carro</em>";
  document.getElementById("heroLead").innerHTML = "Estilo Rocket League: arena fechada, bola gigante, turbo, pulo duplo e mortal. Do 1x1 ao 5x5 com carros pixelados inspirados no GT-R R34, no 911, na F40 e na M3.";
  document.getElementById("heroFeats").innerHTML = "<span>🚀 turbo</span><span>🤸 mortal</span><span>🏎️ 4 carros</span><span>👥 1x1 a 5x5</span><span>🎥 câmera da bola</span>";
}
for (const id of FIXO === "carros" ? ["btnPractice", "btnFalta"] : ["btnPracticeCar"]) document.getElementById(id).classList.add("hidden");
function toast(msg, ms = 3200) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.add("hidden"), ms); }
const kitOf = C.kitOf;
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
const PN = (n) => S && S.players.find((p) => p.n === n);
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
  history.replaceState(null, "", BASE + "?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: { ...(store.get("pelada:cfg") || {}), mode: FIXO } }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pelada:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + BASE + "?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("pelada:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); urlCode = null; ME = null; S = null; history.replaceState(null, "", BASE); $("roomTag").classList.add("hidden"); stopGame(); show("home"); });
function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- desenhinho do carro (de lado, em pixel) para a escolha na sala ----------
const CAR_SIDES = { // perfis em "pixels" de 4 px: [x, y, w, h] (corpo) e janelas; rodas e faróis por cima
  godzilla: { body: [[1, 5, 16, 3], [5, 3, 8, 2], [15, 2, 3, 1], [16, 3, 1, 2]], win: [[6, 3.5, 6, 1.4]] },
  noveonze: { body: [[1, 5, 16, 3], [5, 3, 6, 2], [11, 3.5, 4, 1.5], [3, 4.4, 2, 0.6]], win: [[6, 3.4, 4.5, 1.4]] },
  cavallino: { body: [[0, 5.5, 18, 2.5], [6, 4, 5, 1.5], [14, 2.6, 4, 0.8], [16, 3.4, 1, 2]], win: [[6.5, 4.2, 3.8, 1]] },
  bimmer: { body: [[1, 4.6, 16, 3.4], [5, 2.6, 8, 2], [15, 4.2, 2, 0.5]], win: [[5.6, 3, 6.8, 1.4]] },
};
function carPreview(model, color) {
  const c = document.createElement("canvas"); c.width = 72; c.height = 36; const x = c.getContext("2d"), u = 4, d = CAR_SIDES[model];
  x.fillStyle = color; for (const [a, b, w, hh] of d.body) x.fillRect(a * u, b * u, w * u, hh * u);
  x.fillStyle = "#1c2a36"; for (const [a, b, w, hh] of d.win) x.fillRect(a * u, b * u, w * u, hh * u);
  x.fillStyle = "#ffe08a"; x.fillRect(0, 5.4 * u, u, u); x.fillStyle = "#e53935"; x.fillRect(17 * u, 5.4 * u, u, u);
  x.fillStyle = "#151515"; for (const wx of [3.5, 13.5]) x.fillRect((wx - 1.5) * u, 6.6 * u, 3 * u, 2.4 * u);
  x.fillStyle = "#9aa0a6"; for (const wx of [3.5, 13.5]) x.fillRect((wx - 0.5) * u, 7.3 * u, u, u);
  return c.toDataURL();
}

// ---------- sala de espera ----------
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, size = S.config.size, cars = S.config.mode === "carros";
  const row = (p) => `<div class="pl ${p.id === (ME && ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}${p.gk && !cars ? ` <span title="Goleiro">🧤</span>` : ""}${cars ? ` <span class="muted" style="font-weight:500;font-size:12px">${h(C.CARS[p.car].name)}</span>` : ""}${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" style="margin-left:auto">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const list = S.players.filter((p) => p.team === t), kit = S.kits[t];
    $("t" + t).innerHTML = list.map(row).join("") + Array.from({ length: Math.max(0, size - list.length) }, () => `<div class="pl muted" style="font-weight:500">vaga livre</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || list.length >= size);
    $("kn" + t).textContent = (cars ? "Pintura: " : "Camisa: ") + kitOf(kit).name;
    $("box" + t).style.borderColor = C.kitColor(kit);
    const canKit = isHost || (mine && mine.team === t);
    $("kits" + t).innerHTML = Object.keys(KITS).map((k) => `<button title="${h(KITS[k].name)}" data-kit="${k}" data-team="${t}" class="${k === kit ? "on" : ""}" style="background:${kitCss(k)}" ${canKit ? "" : "disabled"}></button>`).join("");
  }
  const bench = S.players.filter((p) => !p.team);
  $("tN").innerHTML = bench.length ? bench.map(row).join("") : "Ninguém no banco.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  // posição (a pé) ou carro (de carro)
  if (mine && mine.team && !cars) {
    const other = S.players.find((p) => p.team === mine.team && p.gk && p.id !== mine.id);
    $("myRole").innerHTML = `<label>Posição</label><div class="seg"><button data-gk="0" class="${mine.gk ? "" : "on"}">🏃 Linha</button><button data-gk="1" class="${mine.gk ? "on" : ""}" ${other ? "disabled title='Seu time já tem goleiro'" : ""}>🧤 Goleiro</button></div>
      <p class="muted" style="font-size:13px;margin:6px 0 0">${other ? `${h(other.name)} é o goleiro do seu time.` : "O goleiro pega a bola com a mão dentro da área e pode se jogar (Espaço + A/D)."}</p>`;
  } else if (mine && cars) {
    const col = mine.team ? C.kitColor(S.kits[mine.team]) : "#9aa0a6";
    $("myRole").innerHTML = `<label>Seu carro</label><div class="cars">${Object.entries(C.CARS).map(([k, c]) => `<button data-car="${k}" class="${mine.car === k ? "on" : ""}" title="${h(c.inspo)}"><img src="${carPreview(k, col)}" width="72" height="36" alt="" style="image-rendering:pixelated;display:block;margin:0 auto 4px"><b>${h(c.name)}</b><small>${h(c.inspo)}</small></button>`).join("")}</div>`;
  } else $("myRole").innerHTML = "";
  document.querySelectorAll("#cfgMode button").forEach((b) => { b.classList.toggle("on", b.dataset.v === S.config.mode); b.disabled = !isHost; });
  document.querySelectorAll("#cfgSize button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === size); b.disabled = !isHost; });
  document.querySelectorAll("#cfgMin button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === S.config.minutes); b.disabled = !isHost; });
  setH("keysBox", keysHelp(S.config.mode));
  const a = S.players.filter((p) => p.team === "A").length, b = S.players.filter((p) => p.team === "B").length;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${a && b ? "" : "disabled"}>Apitar o começo</button>${a && b ? (a !== b ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Times desiguais (${a} x ${b}). Dá pra jogar assim mesmo.</p>` : "") : `<p class="muted" style="font-size:13px;margin:8px 0 0">Precisa de pelo menos 1 jogador em cada time. Mande o convite!</p>`}`
    : `<p class="muted">Esperando o organizador apitar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
  document.querySelectorAll("[data-kick]").forEach((x) => (x.onclick = () => act("kick", { id: x.dataset.kick })));
  document.querySelectorAll("[data-kit]").forEach((x) => (x.onclick = () => act("kit", { team: x.dataset.team, kit: x.dataset.kit })));
  document.querySelectorAll("[data-gk]").forEach((x) => (x.onclick = () => act("gk", { on: x.dataset.gk === "1" })));
  document.querySelectorAll("[data-car]").forEach((x) => (x.onclick = () => { store.set("pelada:car", x.dataset.car); act("car", { car: x.dataset.car }); }));
}
function keysHelp(mode) {
  if (mode === "carros") return `<ul class="keys">
    <li><kbd>W</kbd> acelerar · <kbd>S</kbd> ré</li><li><kbd>A</kbd><kbd>D</kbd> virar</li>
    <li><kbd>Shift</kbd> turbo</li><li><kbd>Espaço</kbd> pular (2x = pulo duplo)</li>
    <li>No ar: <kbd>Espaço</kbd> + direção = mortal</li><li>No ar: <kbd>W</kbd><kbd>S</kbd> inclinam o carro</li>
    <li><kbd>Q</kbd> freio de mão (derrapar)</li><li><kbd>C</kbd> câmera da bola</li></ul>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Dica: pule e use o turbo no ar para pegar a bola alta. O mortal bate na bola com mais força. Passe pelas almofadas amarelas para encher o turbo.</p>`;
  return `<ul class="keys">
    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> correr · mouse vira a câmera</li><li><kbd>Shift</kbd> pique</li>
    <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> direção do chute/passe</li><li><kbd>K</kbd> ou clique: chute (segure)</li>
    <li><kbd>J</kbd> ou botão direito: passe</li><li><kbd>L</kbd> ou botão do meio: cavadinha</li>
    <li><kbd>Q</kbd>/<kbd>E</kbd> segurados no chute: efeito (curva)</li>
    <li>Rodinha do mouse: carrinho</li><li><kbd>Espaço</kbd> pular / cabecear</li>
    <li>Goleiro: <kbd>Espaço</kbd> + <kbd>A</kbd>/<kbd>D</kbd> se joga</li><li><kbd>C</kbd> câmera: atrás, TV ou 1ª pessoa</li></ul>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Sem seta apertada, a bola vai para onde o jogador está virado. O passe procura o companheiro mais perto da direção (como no FIFA). Carrinho derruba quem estiver na frente.</p>`;
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
function setCfg(k, v) { const c = { ...S.config, [k]: v, mode: FIXO }; store.set("pelada:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgMode button").forEach((b) => (b.onclick = () => setCfg("mode", b.dataset.v)));
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgMin button").forEach((b) => (b.onclick = () => setCfg("minutes", +b.dataset.v)));
$("btnPractice").onclick = () => startGame("treino", "pes");
$("btnFalta").onclick = () => startGame("treino", "pes", true);
$("btnPracticeCar").onclick = () => startGame("treino", "carros");
$("btnPractice2").onclick = () => startGame("treino", FIXO);

// ======================================================================
// Sons (sintetizados)
// ======================================================================
const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("pelada:vol") ?? 0.7, eng = null;
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
  function whistle(n = 1, len = 0.35) { for (let i = 0; i < n; i++) { const at = i * (len + 0.12); tone({ f0: 2900, dur: len, gain: 0.08, type: "triangle", at }); tone({ f0: 3080, dur: len, gain: 0.06, type: "sine", at }); } }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("pelada:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    kick(power = 0.5, k = 1, pan = 0) { tone({ f0: 160 + power * 60, f1: 60, dur: 0.12, gain: (0.35 + power * 0.4) * k, pan }); burst({ dur: 0.06, f0: 2500, f1: 600, gain: 0.25 * k, pan, type: "bandpass", q: 1.2 }); },
    bounce(force, k = 1, pan = 0, big = false) { const v = clamp(force / 15, 0.05, 1) * k; if (v < 0.03) return; tone({ f0: big ? 70 : 120, f1: big ? 40 : 70, dur: big ? 0.18 : 0.08, gain: 0.4 * v, pan }); burst({ dur: 0.05, f0: 1200, f1: 300, gain: 0.2 * v, pan }); },
    net() { burst({ dur: 0.45, f0: 5000, f1: 1500, gain: 0.25, type: "highpass" }); },
    catch() { burst({ dur: 0.08, f0: 900, f1: 300, gain: 0.45 }); tone({ f0: 200, f1: 120, dur: 0.06, gain: 0.25 }); },
    slide() { burst({ dur: 0.4, f0: 2200, f1: 500, gain: 0.25, type: "bandpass", q: 0.8 }); },
    fall() { tone({ f0: 140, f1: 60, dur: 0.18, gain: 0.35 }); burst({ dur: 0.15, f0: 800, f1: 200, gain: 0.3 }); },
    jump() { burst({ dur: 0.12, f0: 600, f1: 1800, gain: 0.15, type: "bandpass", q: 2 }); },
    boost() { burst({ dur: 0.18, f0: 1800, f1: 900, gain: 0.08, type: "bandpass", q: 0.6 }); },
    pad() { tone({ f0: 660, f1: 1320, dur: 0.18, gain: 0.12, type: "triangle" }); },
    engine(speed, on) { // motor: dente de serra que sobe com a velocidade
      const c = ac; if (!c) return;
      if (!eng) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 600; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); eng = { o, o2, g }; }
      const t = c.currentTime, v = Math.abs(speed);
      eng.o.frequency.setTargetAtTime(50 + v * 7, t, 0.06); eng.o2.frequency.setTargetAtTime(25 + v * 3.5, t, 0.06);
      eng.g.gain.setTargetAtTime(on ? 0.03 + v * 0.002 : 0, t, 0.08);
    },
    whistle, start() { whistle(1, 0.7); }, end() { whistle(3, 0.45); },
    cheer() { burst({ dur: 3.2, f0: 1400, f1: 700, gain: 0.5, type: "bandpass", q: 0.6, attack: 0.25 }); burst({ dur: 2.6, f0: 600, f1: 300, gain: 0.35, attack: 0.3 }); [523, 659, 784].forEach((f, i) => tone({ f0: f, dur: 0.25, gain: 0.08, type: "square", at: 0.2 + i * 0.12 })); },
    ooh() { burst({ dur: 1.2, f0: 500, f1: 350, gain: 0.25, type: "bandpass", q: 1, attack: 0.15 }); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

// ======================================================================
// 3D: céu, luz e a arena (montada de novo quando muda o modo)
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfdde8, 80, 260);
const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 800);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
function canvasTex(w, hh, draw, repeat = false, pixel = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 31 + hh));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}
function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o }); }
{ // céu de fim de tarde
  const g = new THREE.SphereGeometry(600, 32, 16), col = [], pos = g.attributes.position;
  const top = new THREE.Color(0x3a6fb8), mid = new THREE.Color(0x9fc6ea), low = new THREE.Color(0xf4d6a8);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 600, c = y > 0.08 ? mid.clone().lerp(top, Math.min(1, (y - 0.08) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.13, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
}
scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x4a6a3a, 1.4));
const sunL = new THREE.DirectionalLight(0xfff0d8, 2.4);
sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
scene.add(sunL, sunL.target);

// ---------- bola ----------
const ballTex = canvasTex(512, 256, (x, w, hh) => {
  x.fillStyle = "#fafafa"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1a1a1a";
  const spots = [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5], [0.9, 0.5], [0.2, 0.18], [0.6, 0.18], [0.4, 0.82], [0.8, 0.82], [0, 0.04], [0.5, 0.96]];
  for (const [u, v] of spots) { x.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const px = u * w + Math.cos(a) * 30 / Math.max(0.35, Math.sin(v * Math.PI)), py = v * hh + Math.sin(a) * 30; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); }
});
// bola de praia do Rocket: gomos coloridos com as tampinhas brancas
const beachTex = canvasTex(512, 256, (x, w, hh) => {
  const cols = ["#e53935", "#fdd835", "#1e88e5", "#ffffff", "#43a047", "#fb8c00"];
  cols.forEach((c, i) => { x.fillStyle = c; x.fillRect((i * w) / 6, 0, w / 6 + 1, hh); });
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh * 0.1); x.fillRect(0, hh * 0.9, w, hh * 0.1);
});
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 }));
ballMesh.castShadow = true; scene.add(ballMesh);
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);
const landMark = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.6, depthWrite: false }));
landMark.rotation.x = -Math.PI / 2; landMark.visible = false; scene.add(landMark);

let goalSigns = [];
let arena = null, arenaMode = null, arenaKits = null, pads = [];
function ensureArena(mode) {
  const kits = S ? `${S.kits.A}|${S.kits.B}` : "";
  if (arenaMode === mode && (mode !== "carros" || arenaKits === kits)) return;
  if (arena) { scene.remove(arena); arena.traverse((o) => { o.geometry?.dispose?.(); }); }
  arenaMode = mode; arenaKits = kits; arena = buildArena(C.MODES[mode]); scene.add(arena);
  const F = C.MODES[mode], s = F.L / 20;
  sunL.position.set(-18 * s, 34 * s, 22 * s); sunL.target.position.set(0, 0, 0);
  Object.assign(sunL.shadow.camera, { left: -F.L - 10, right: F.L + 10, top: F.W + 10, bottom: -F.W - 10, near: 1, far: 140 * s }); sunL.shadow.camera.updateProjectionMatrix();
  scene.fog.near = 80 * s; scene.fog.far = 260 * s;
  ballMesh.scale.setScalar(F.ballR); blob.scale.setScalar(F.ballR / 0.15);
  ballMesh.material.map = mode === "carros" ? beachTex : ballTex; ballMesh.material.roughness = mode === "carros" ? 0.3 : 0.45; ballMesh.material.needsUpdate = true;
}
function buildArena(F) {
  const grp = new THREE.Group(), L = F.L, W = F.W, cars = F.id === "carros", PX = cars ? 25 : 50;
  const add = (o) => (grp.add(o), o);
  // chão em volta (cimento)
  const out = add(new THREE.Mesh(new THREE.PlaneGeometry(L * 7, W * 9), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = "#8d8f8a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? "#0000000c" : "#ffffff0c"; x.fillRect(r() * w, r() * hh, 2, 2); } }, true), roughness: 1 })));
  out.material.map.repeat.set(L, W); out.rotation.x = -Math.PI / 2; out.position.y = -0.05; out.receiveShadow = true;
  // gramado com as linhas (no modo carros, cada metade com um toque da cor do time)
  const grass = canvasTex((2 * L + 2) * PX, (2 * W + 2) * PX, (x, w, hh, r) => {
    const X = (v) => (v + L + 1) * PX, Z = (v) => (v + W + 1) * PX, step = cars ? 4 : 2;
    for (let i = 0; i < 2 * L + 2; i += step) { x.fillStyle = (i / step) % 2 ? "#2f8f48" : "#2a8141"; x.fillRect(i * PX, 0, step * PX, hh); }
    if (cars && S) for (const [t, x0] of [["A", 0], ["B", X(0)]]) { x.globalAlpha = 0.14; x.fillStyle = C.kitColor(S.kits[t]); x.fillRect(x0, 0, w / 2, hh); x.globalAlpha = 1; }
    for (let i = 0; i < w * hh / 120; i++) { x.fillStyle = r() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(r() * w, r() * hh, 2, 3); }
    x.strokeStyle = "#f4f4f0"; x.lineWidth = (cars ? 0.25 : 0.08) * PX; x.fillStyle = "#f4f4f0";
    x.strokeRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX);
    x.beginPath(); x.moveTo(X(0), Z(-W)); x.lineTo(X(0), Z(W)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), (cars ? 0.6 : 0.15) * PX, 0, 7); x.fill();
    for (const s of [-1, 1]) {
      const gx = X(s * L), r6 = F.areaR * PX;
      x.beginPath(); // área: semicírculo em volta do gol (é onde o goleiro pega com a mão)
      if (s < 0) x.arc(gx, Z(0), r6, -Math.PI / 2, Math.PI / 2); else x.arc(gx, Z(0), r6, Math.PI / 2, 1.5 * Math.PI);
      x.stroke();
      if (!cars) { x.beginPath(); x.arc(X(s * (L - 6)), Z(0), 0.12 * PX, 0, 7); x.fill(); x.beginPath(); x.arc(X(s * (L - 10)), Z(0), 0.12 * PX, 0, 7); x.fill(); }
    }
  });
  const field = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 2, 2 * W + 2), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 })));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true;
  // placas de propaganda
  const ads = ["PELADA DA GALERA", "⚽ VILA DA GALERA", "LEILÃO DA GALERA", "BAR DA SINUCA", "CORRIDA DA GALERA", "TIRO DA GALERA"];
  const adCols = [["#0d47a1", "#ffd84a"], ["#b71c1c", "#ffffff"], ["#1b5e20", "#ffffff"], ["#212121", "#ffd84a"], ["#e65100", "#ffffff"], ["#4a148c", "#ffffff"]];
  const adTex = canvasTex(2048, 64, (x, w, hh) => { const seg = w / 6; ads.forEach((t, i) => { const [bg, fg] = adCols[i]; x.fillStyle = bg; x.fillRect(i * seg, 0, seg, hh); x.fillStyle = fg; x.font = "bold 34px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, i * seg + seg / 2, hh / 2 + 2); }); }, true);
  const BH = cars ? 2.2 : 1.0, BT = 0.15;
  const board = (len, x0, z0, rotY) => {
    const t = adTex.clone(); t.repeat.set(len / (24 * BH), 1); t.needsUpdate = true;
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(len, BH, BT), [M(0x333333), M(0x333333), M(0x222222), M(0x222222), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), M(0x333333)]));
    m.position.set(x0, BH / 2, z0); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true;
  };
  board(2 * L + 2 * BT, 0, -W - BT / 2, 0); board(2 * L + 2 * BT, 0, W + BT / 2, Math.PI);
  for (const s of [-1, 1]) for (const zs of [-1, 1]) { const len = W - F.goalW - 0.1; board(len, s * (L + BT / 2), zs * (F.goalW + 0.1 + len / 2), s < 0 ? Math.PI / 2 : -Math.PI / 2); }
  // alambrado (tela em losango) e postes
  const fenceTex = canvasTex(64, 64, (x, w) => { x.strokeStyle = "#d8dde0"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, w / 2); x.lineTo(w / 2, 0); x.lineTo(w, w / 2); x.lineTo(w / 2, w); x.closePath(); x.stroke(); }, true);
  const cell = cars ? 1 : 0.5;
  const fence = (lw, lh, x0, y0, z0, rotY) => { const t = fenceTex.clone(); t.repeat.set(lw / cell, lh / cell); t.needsUpdate = true; const m = add(new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }))); m.position.set(x0, y0 + lh / 2, z0); m.rotation.y = rotY; };
  const FH = F.wallH;
  fence(2 * L, FH - BH, 0, BH, -W - 0.05, 0); fence(2 * L, FH - BH, 0, BH, W + 0.05, 0);
  for (const s of [-1, 1]) { fence(2 * W, FH - F.goalH - 0.4, s * (L + F.goalD + 0.05), F.goalH + 0.4, 0, Math.PI / 2); for (const zs of [-1, 1]) { const lw = W - F.goalW; fence(lw, FH - BH, s * (L + 0.05), BH, zs * (F.goalW + lw / 2), Math.PI / 2); } }
  const pole = M(0x4a4f55, { metalness: 0.6, roughness: 0.4 }), gap = cars ? 8 : 5, pr = cars ? 0.12 : 0.06;
  for (let x0 = -L; x0 <= L + 0.01; x0 += gap) for (const zs of [-1, 1]) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, FH, 8), pole)); m.position.set(x0, FH / 2, zs * (W + 0.1)); m.castShadow = true; }
  // refletores nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.set(sx * (L + 4), 0, sz * (W + 4));
    const hp = cars ? 26 : 16;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, hp, 8), pole); m.position.y = hp / 2; m.castShadow = true; g.add(m);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), M(0x2b2f33)); box.position.y = hp + 0.4; box.lookAt(-sx * 40, 0, -sz * 40); g.add(box);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); l.position.set((i % 3 - 1) * 0.7, (i < 3 ? 0.3 : -0.3), 0.21); box.add(l); }
  }
  // arquibancada de um lado, com a torcida
  const crowdTex = canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#6d6f72"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"][Math.floor(r() * 7)]; x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"][Math.floor(r() * 4)]; x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } }, true);
  const sc = cars ? 2 : 1;
  for (let i = 0; i < 6; i++) {
    const t = crowdTex.clone(); t.repeat.set(6 * L / 20, 1); t.offset.x = i * 0.37; t.needsUpdate = true;
    const step = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 6, 0.5 * sc, 1 * sc), [M(0x777a7e), M(0x777a7e), M(0x8a8d90), M(0x777a7e), new THREE.MeshStandardMaterial({ map: t }), M(0x777a7e)]));
    step.position.set(0, (0.25 + i * 0.5 + 0.3) * sc, -(W + 3 * sc + i * sc)); step.castShadow = step.receiveShadow = true;
  }
  // gols: traves e rede
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / (cars ? 0.5 : 0.12), lh / (cars ? 0.5 : 0.12)); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = F.postR, GW = F.goalW, GH = F.goalH, GD = F.goalD;
  for (const s of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.x = s * L;
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; bar.castShadow = true; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(s * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(s * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(s * GD / 2, GH / 2, z); g.add(side); }
  }
  // placas em cima de cada gol: dizem de quem é o gol e quem ataca (atualizadas em updateGoalSigns)
  goalSigns = [];
  for (const s of [-1, 1]) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const w = cars ? 16 : 4.6; spr.scale.set(w, w / 4, 1); spr.position.set(s * (L + GD * 0.5), GH + (cars ? 3.4 : 1.1), 0);
    add(spr); goalSigns.push({ s, c, tex, spr, key: "" });
    // faixa no chão, na boca do gol, com a cor de quem defende
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(cars ? 2 : 0.5, 2 * GW), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(s * (L - (cars ? 1.2 : 0.3)), 0.025, 0); add(strip); goalSigns[goalSigns.length - 1].strip = strip;
  }
  // modo carros: almofadas de turbo (amarelas). Cada um pega a sua: some por alguns segundos só para quem pegou.
  pads = [];
  if (cars) {
    const spots = [[L - 6, W - 5, 1], [L - 6, -W + 5, 1], [-L + 6, W - 5, 1], [-L + 6, -W + 5, 1], [0, W - 4, 1], [0, -W + 4, 1], [L * 0.5, 0, 0], [-L * 0.5, 0, 0], [0, 12, 0], [0, -12, 0], [L * 0.5, 14, 0], [L * 0.5, -14, 0], [-L * 0.5, 14, 0], [-L * 0.5, -14, 0]];
    for (const [x0, z0, big] of spots) {
      const g = add(new THREE.Group()); g.position.set(x0, 0.02, z0);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.6 : 0.9, big ? 1.8 : 1, 0.12, 16), M(0x3a3a3a)); base.position.y = 0.06; g.add(base);
      const orb = new THREE.Mesh(big ? new THREE.SphereGeometry(0.6, 12, 8) : new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xff9900, emissiveIntensity: 0.9 }));
      orb.position.y = big ? 1.1 : 0.16; g.add(orb);
      pads.push({ x: x0, z: z0, big: !!big, orb, until: 0 });
    }
  }
  return grp;
}

// ---------- jogadores a pé (caixinhas com a camisa do time) ----------
const GK_KIT = { kind: "plain", c: ["#26282b"], num: "#ffffff", shorts: "#26282b" };
function shirtTex(K, num, back) {
  const c = K.c;
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
function nameSprite(text, color, scale = 1) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 32px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000b"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.3 * scale, 0.33 * scale, 1); s.renderOrder = 10; return s;
}
const tagColor = (kit) => (C.kitColor(kit) === "#f4f4f4" ? "#ffffff" : C.kitColor(kit));
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a77c];
const SPINE_Y = 0.85; // altura da cintura (pivô da coluna)
function makePlayer(kitId, num, name, opts = {}) {
  const K = opts.gk ? { ...GK_KIT, num: C.kitColor(kitId) } : kitOf(kitId);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const skin = M(SKINS[(name.length * 7 + num) % SKINS.length]), shorts = M(new THREE.Color(K.shorts).getHex()), sock = M(new THREE.Color(opts.gk ? "#26282b" : C.kitColor(kitId)).getHex()), boot = M(0x161616);
  const shirtC = M(new THREE.Color(K.c[0]).getHex());
  const part = (gg, w, hh, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); gg.add(m); return m; };
  // pernas e braços com joelho e cotovelo (dobram na corrida, para o boneco não ficar duro)
  const legs = [], knees = [];
  for (const sx of [-0.11, 0.11]) {
    const l = new THREE.Group(); l.position.set(sx, 0.85, 0);
    part(l, 0.18, 0.3, 0.2, shorts, 0, -0.12, 0); part(l, 0.14, 0.12, 0.15, skin, 0, -0.29, 0);
    const kn = new THREE.Group(); kn.position.y = -0.3; l.add(kn);
    part(kn, 0.14, 0.2, 0.15, skin, 0, -0.08, 0); part(kn, 0.15, 0.22, 0.16, sock, 0, -0.36, 0); part(kn, 0.16, 0.1, 0.27, boot, 0, -0.5, -0.04);
    body.add(l); legs.push(l); knees.push(kn);
  }
  // coluna ("spine"): tronco, braços e cabeça ficam num pivô na cintura, assim o tronco balança por cima das pernas
  const spine = new THREE.Group(); spine.position.y = SPINE_Y; body.add(spine);
  const front = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, false), roughness: 0.7 }), backM = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, true), roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.26), [shirtC, shirtC, shirtC, shirtC, backM, front]); torso.position.y = 1.16 - SPINE_Y; spine.add(torso);
  const arms = [], elbows = [], fore = opts.gk ? shirtC : skin;
  for (const sx of [-0.3, 0.3]) {
    const a = new THREE.Group(); a.position.set(sx, 1.42 - SPINE_Y, 0);
    part(a, 0.13, 0.26, 0.14, shirtC, 0, -0.12, 0);
    const el = new THREE.Group(); el.position.y = -0.25; a.add(el);
    part(el, 0.11, 0.3, 0.12, fore, 0, -0.15, 0);
    if (opts.gk) part(el, 0.15, 0.13, 0.15, M(0xf5f5f5), 0, -0.35, 0);
    spine.add(a); arms.push(a); elbows.push(el);
  }
  const head = new THREE.Group(); head.position.y = 1.46 - SPINE_Y; spine.add(head);
  const hair = M(0x2a1b10);
  part(head, 0.26, 0.28, 0.26, skin, 0, 0.15, 0); part(head, 0.28, 0.08, 0.28, hair, 0, 0.31, 0); part(head, 0.18, 0.04, 0.01, M(0x111111), 0, 0.18, -0.131);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let tag = null; if (name) { tag = nameSprite((opts.gk ? "🧤 " : "") + name, tagColor(kitId)); tag.position.y = 2.15; g.add(tag); }
  g.userData = { legs, knees, arms, elbows, head, tag, body, spine, mats: { head: skin, hair, torso: [shirtC, shirtC, shirtC, shirtC, backM, front], upperArm: shirtC, forearm: fore, thigh: shorts, shin: sock, boot } };
  return g;
}
// poses: correr, chutar, carrinho (deitado de costas), mergulho do goleiro (de lado), caído (de bruços), segurando a bola
function animate(model, speed, dt, st, f = 0) {
  const u = model.userData, t = performance.now() / 1000;
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const lying = f & (FL.slide | FL.dive | FL.down);
  const sw = speed > 0.4 && !lying ? Math.sin(st.anim) * Math.min(0.9, speed / 7) : 0;
  const kick = st.kickT ? Math.sin(clamp((t - st.kickT) / 0.28, 0, 1) * Math.PI) : 0;
  u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.35);
  u.legs[1].rotation.x = kick > 0.01 ? -kick * 1.3 : lerp(u.legs[1].rotation.x, (f & FL.slide) ? -1.2 : -sw, 0.35);
  const armTo = st.holding ? -1.4 : (f & FL.dive) ? -2.8 : null;
  const mola = springs(model, dt, st, lying, speed), jp = mola.jpitch.x - mola.pitch.x, jr = mola.jroll.x - mola.roll.x;
  u.arms[0].rotation.x = lerp(u.arms[0].rotation.x, (armTo ?? -sw * 0.8) - jp * 1.6, 0.35);
  u.arms[1].rotation.x = lerp(u.arms[1].rotation.x, (armTo ?? sw * 0.8) - jp * 1.6, 0.35);
  // joelho dobra quando a perna vai para trás; cotovelo dobrado correndo; tronco inclina para a frente e balança
  const run = lying ? 0 : Math.min(1, speed / 7);
  if (u.knees) {
    u.knees[0].rotation.x = lerp(u.knees[0].rotation.x, (f & FL.slide) ? 0.2 : Math.max(0, -Math.sin(st.anim)) * 1.3 * run + 0.1 * run, 0.35);
    u.knees[1].rotation.x = lerp(u.knees[1].rotation.x, kick > 0.01 ? 0.9 * (1 - kick) : (f & FL.slide) ? 0.1 : Math.max(0, Math.sin(st.anim)) * 1.3 * run + 0.1 * run, 0.35);
    const elb = st.holding ? -0.6 : (f & FL.dive) ? 0 : -0.25 - 0.9 * run;
    u.elbows[0].rotation.x = lerp(u.elbows[0].rotation.x, elb, 0.3); u.elbows[1].rotation.x = lerp(u.elbows[1].rotation.x, elb, 0.3);
  }
  // o corpo inteiro só gira nas poses deitadas (carrinho, caído, mergulho); correndo, quem inclina é a coluna (mola)
  const b = u.body;
  const tx = (f & FL.slide) ? 1.25 : (f & FL.down) ? -1.45 : 0, tz = (f & FL.dive) ? (st.diveSide || 1) * -1.35 : 0;
  b.rotation.x = lerp(b.rotation.x, tx, 0.3); b.rotation.z = lerp(b.rotation.z, tz, 0.15);
  const bob = lying ? 0 : Math.abs(Math.sin(st.anim)) * 0.06 * run;
  b.position.y = lerp(b.position.y, (f & FL.slide) ? 0.25 : (f & FL.down) ? 0.18 : (f & FL.dive) ? 0.5 : bob, 0.3);
  u.spine.rotation.x = mola.pitch.x; u.spine.rotation.z = mola.roll.x;
  // gelatina: cabeça e braços seguem a coluna com atraso (mola mais fraca), então balançam soltos e passam do ponto
  u.head.rotation.x = -mola.pitch.x * 0.6 - jp * 1.1; // a cabeça compensa a inclinação (olha para a frente)
  u.head.rotation.z = -mola.roll.x * 0.4 - jr * 1.1;
  u.arms[0].rotation.z = -0.1 * run - jr * 1.5; u.arms[1].rotation.z = 0.1 * run - jr * 1.5;
}

// ---------- física de mola (o boneco "molinho") ----------
// Cada jogador tem molas para a inclinação da coluna: pitch (frente/trás, rotation.x) e roll (lados, rotation.z).
// Força = (alvo - atual) * rigidez - velocidade * amortecimento; a velocidade vira rotação. Como a mola é pouco
// amortecida, o tronco passa um pouquinho do ponto e volta, como gelatina. A cabeça e os braços têm outra mola,
// mais mole, que persegue a coluna (o "jiggle").
const MOLA = { k: 15, c: 4 }, GELATINA = { k: 7, c: 2.2 };
const newSpring = () => ({ x: 0, v: 0, alvo: 0 });
function stepSpring(sp, alvo, k, c, dt) {
  sp.alvo = alvo;
  const forca = (alvo - sp.x) * k - sp.v * c;
  sp.v += forca * dt; sp.x += sp.v * dt;
  return sp.x;
}
function springs(model, dt, st, lying, speed) {
  const m = (st.mola ||= { k: MOLA.k, c: MOLA.c, pitch: newSpring(), roll: newSpring(), jpitch: newSpring(), jroll: newSpring(), vx: 0, vz: 0, fwd: 0, acc: 0, yawRate: 0 });
  const p = model.position, yaw = model.rotation.y, h = Math.max(dt, 1e-3);
  // velocidade pela diferença de posição entre os quadros (serve para mim, para os outros e para o goleiro robô)
  if (m.px == null) { m.px = p.x; m.pz = p.z; m.yaw = yaw; }
  let dx = p.x - m.px, dz = p.z - m.pz; if (dx * dx + dz * dz > 9) dx = dz = 0; // teletransporte (saída de bola): ignora
  m.px = p.x; m.pz = p.z;
  const sm = Math.min(1, dt * 10); m.vx = lerp(m.vx, dx / h, sm); m.vz = lerp(m.vz, dz / h, sm);
  // velocidade para a frente (o boneco olha para -z) e aceleração
  const fwd = m.vx * -Math.sin(yaw) + m.vz * -Math.cos(yaw);
  m.acc = lerp(m.acc, (fwd - m.fwd) / h, Math.min(1, dt * 6)); m.fwd = fwd;
  let dy = yaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw = yaw;
  m.yawRate = lerp(m.yawRate, dy / h, Math.min(1, dt * 8));
  // alvos: acelerou para a frente -> tomba para a frente; freou -> joga para trás; curva -> tomba para dentro da curva
  const run = Math.min(1, speed / 7), step = Math.sin(st.anim * 2) * 0.05 * run; // cada passada dá um tranquinho
  const pitchAlvo = lying ? 0 : -clamp(fwd * 0.028 + m.acc * 0.03, -0.3, 0.55) + step;
  const rollAlvo = lying ? 0 : clamp(m.yawRate * Math.hypot(m.vx, m.vz) * 0.025, -0.38, 0.38);
  // passos pequenos para a mola não explodir num quadro lento
  const n = Math.ceil(dt / (1 / 120)), sdt = dt / n;
  for (let i = 0; i < n; i++) {
    stepSpring(m.pitch, pitchAlvo, m.k, m.c, sdt); stepSpring(m.roll, rollAlvo, m.k, m.c, sdt);
    stepSpring(m.jpitch, m.pitch.x, GELATINA.k, GELATINA.c, sdt); stepSpring(m.jroll, m.roll.x, GELATINA.k, GELATINA.c, sdt);
  }
  return m;
}

// ---------- carros pixelados (caixinhas + texturas de pixel) ----------
const pixTex = (w, hh, draw) => canvasTex(w, hh, draw, false, true);
const TEX = {
  head: pixTex(8, 4, (x) => { x.fillStyle = "#fff6c8"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#ffe066"; x.fillRect(1, 1, 6, 2); x.fillStyle = "#ffffff"; x.fillRect(2, 1, 2, 1); }),
  tail: pixTex(8, 4, (x) => { x.fillStyle = "#7a0c0c"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#ff3030"; x.fillRect(1, 1, 6, 2); x.fillStyle = "#ffb0b0"; x.fillRect(1, 1, 2, 1); }),
  grill: pixTex(8, 4, (x) => { x.fillStyle = "#111"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#444"; for (let i = 0; i < 8; i += 2) x.fillRect(i, 1, 1, 2); }),
  plate: pixTex(16, 4, (x) => { x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, 16, 4); x.fillStyle = "#1e3a8a"; x.fillRect(0, 0, 16, 1); x.fillStyle = "#222"; for (const i of [2, 4, 6, 9, 11, 13]) x.fillRect(i, 2, 1, 1); }),
  glass: pixTex(8, 8, (x) => { x.fillStyle = "#1c2a36"; x.fillRect(0, 0, 8, 8); x.fillStyle = "#3d5a73"; x.fillRect(1, 1, 2, 1); x.fillRect(5, 2, 1, 1); }),
};
const flat = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.45, ...o });
function makeCar(model, kitId, name) {
  const paint = flat({ color: new THREE.Color(C.kitColor(kitId)), metalness: 0.25 }), accent = flat({ color: new THREE.Color(C.kitColor2(kitId)) });
  const dark = flat({ color: 0x1a1a1a }), glass = flat({ map: TEX.glass, roughness: 0.2, metalness: 0.4 }), chrome = flat({ color: 0xc9ced3, metalness: 0.8, roughness: 0.25 });
  const head = flat({ map: TEX.head, emissive: 0xfff2b0, emissiveMap: TEX.head, emissiveIntensity: 0.6 }), tail = flat({ map: TEX.tail, emissive: 0xff2020, emissiveMap: TEX.tail, emissiveIntensity: 0.8 });
  const grill = flat({ map: TEX.grill }), plate = flat({ map: TEX.plate });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const box = (w, hh, d, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; body.add(m); return m; };
  const cyl = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); body.add(m); return m; };
  if (model === "godzilla") { // GT-R R34: sedã quadrado, asa traseira, quatro lanternas redondas
    box(1.8, 0.55, 3.9, paint, 0, 0.5, 0); box(1.55, 0.45, 1.9, glass, 0, 0.98, 0.15); box(1.5, 0.07, 1.6, paint, 0, 1.22, 0.2);
    box(0.8, 0.06, 1.1, paint, 0, 0.8, -1.25); box(1.82, 0.12, 3.6, accent, 0, 0.3, 0);
    for (const x of [-0.6, 0.6]) box(0.08, 0.28, 0.14, dark, x, 0.9, 1.75);
    box(1.75, 0.07, 0.38, paint, 0, 1.06, 1.8);
    for (const x of [-0.65, -0.35, 0.35, 0.65]) cyl(0.11, 0.04, tail, x, 0.6, 1.96);
    for (const x of [-0.58, 0.58]) box(0.45, 0.13, 0.05, head, x, 0.62, -1.96);
    box(0.6, 0.13, 0.04, grill, 0, 0.55, -1.96); box(0.5, 0.13, 0.03, plate, 0, 0.35, 1.97);
  } else if (model === "noveonze") { // 911: traseira caída, faróis "de sapo", rabo de pato
    box(1.75, 0.5, 3.8, paint, 0, 0.48, 0); box(1.7, 0.16, 1.2, paint, 0, 0.74, -1.25); box(1.4, 0.36, 1.5, glass, 0, 0.9, 0.25);
    box(1.32, 0.12, 0.95, paint, 0, 1.12, 0.3); box(1.5, 0.12, 1.3, paint, 0, 0.86, 1.15, -0.38); box(1.55, 0.05, 0.28, paint, 0, 0.78, 1.86);
    for (const x of [-0.6, 0.6]) cyl(0.14, 0.12, head, x, 0.74, -1.8);
    box(1.5, 0.08, 0.04, tail, 0, 0.62, 1.91); box(1.78, 0.1, 3.5, accent, 0, 0.27, 0); box(0.5, 0.13, 0.03, plate, 0, 0.36, 1.92);
  } else if (model === "cavallino") { // F40: cunha baixa, asa enorme, tomadas de ar
    box(1.9, 0.42, 4.1, paint, 0, 0.4, 0); box(1.85, 0.1, 1.3, paint, 0, 0.64, -1.38, 0.12); box(1.35, 0.35, 1.2, glass, 0, 0.82, 0.15);
    box(1.3, 0.06, 0.9, paint, 0, 1.02, 0.15); box(1.4, 0.05, 1.2, dark, 0, 0.66, 1.2);
    for (const x of [-0.9, 0.9]) box(0.08, 0.45, 0.5, paint, x, 0.82, 1.85);
    box(1.95, 0.08, 0.42, paint, 0, 1.07, 1.88);
    for (const x of [-0.96, 0.96]) box(0.05, 0.2, 0.6, dark, x, 0.5, 0.4);
    for (const x of [-0.6, 0.6]) box(0.4, 0.06, 0.3, head, x, 0.7, -1.6);
    for (const x of [-0.7, -0.4, 0.4, 0.7]) cyl(0.1, 0.04, tail, x, 0.48, 2.06);
    box(1.92, 0.08, 3.9, accent, 0, 0.2, 0);
  } else { // M3 E30: caixote anos 80, para-lamas largos, rim duplo na grade
    box(1.75, 0.55, 3.7, paint, 0, 0.5, 0); for (const z of [-1.15, 1.15]) box(1.88, 0.3, 0.9, paint, 0, 0.48, z);
    box(1.5, 0.45, 1.6, glass, 0, 0.98, 0.2); box(1.5, 0.07, 1.4, paint, 0, 1.22, 0.25); box(1.7, 0.05, 1.0, paint, 0, 0.8, -1.3);
    box(1.6, 0.06, 0.26, dark, 0, 0.84, 1.75);
    for (const x of [-0.12, 0.12]) { box(0.2, 0.16, 0.05, chrome, x, 0.56, -1.87); box(0.14, 0.11, 0.06, grill, x, 0.56, -1.88); }
    for (const x of [-0.7, -0.42, 0.42, 0.7]) box(0.22, 0.13, 0.04, head, x, 0.58, -1.86);
    for (const x of [-0.55, 0.55]) box(0.52, 0.15, 0.04, tail, x, 0.6, 1.86);
    box(1.9, 0.08, 3.4, accent, 0, 0.3, 0); box(0.5, 0.13, 0.03, plate, 0, 0.36, 1.87);
  }
  // rodas (as da frente viram)
  const tire = flat({ color: 0x151515, roughness: 0.9 }), rim = flat({ color: 0xaab0b6, metalness: 0.7 });
  const wheels = [];
  for (const [x, z, front] of [[-0.88, -1.25, 1], [0.88, -1.25, 1], [-0.88, 1.25, 0], [0.88, 1.25, 0]]) {
    const wg = new THREE.Group(); wg.position.set(x, 0.36, z); body.add(wg);
    const spin = new THREE.Group(); wg.add(spin);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), tire); t.rotation.z = Math.PI / 2; t.castShadow = true; spin.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.31, 6), rim); r.rotation.z = Math.PI / 2; spin.add(r);
    wheels.push({ wg, spin, front });
  }
  // chama do turbo
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a, transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(0, 0.5, 2.5); flame.visible = false; body.add(flame);
  let tag = null; if (name) { tag = nameSprite(name, tagColor(kitId), 1.6); tag.position.y = 2.4; g.add(tag); }
  g.userData = { body, wheels, flame, tag, roll: 0 };
  return g;
}
function animateCar(model, st, dt, speed, f, pitch) {
  const u = model.userData;
  u.roll = (u.roll || 0) + speed * dt / 0.36;
  for (const w of u.wheels) { w.spin.rotation.x = -u.roll; if (w.front) w.wg.rotation.y = lerp(w.wg.rotation.y, clamp(-(st.steer || 0) * 0.45, -0.45, 0.45), 0.3); }
  u.flame.visible = !!(f & FL.boost); if (u.flame.visible) u.flame.scale.setScalar(0.8 + Math.random() * 0.5);
  // mortal: uma volta inteira na direção do tranco
  const t = performance.now() / 1000;
  if ((f & FL.flip) && !st.flipAt) st.flipAt = t;
  if (!(f & FL.flip) && st.flipAt && t - st.flipAt > 0.7) st.flipAt = 0;
  const k = st.flipAt ? clamp((t - st.flipAt) / 0.6, 0, 1) : 0, ang = k * Math.PI * 2, fd = st.flipDir || [1, 0];
  u.body.rotation.set((pitch || 0) - fd[0] * ang, 0, -fd[1] * ang, "YXZ");
}

// mira no chão (a pé): setinha na frente do jogador mostrando para onde vai a bola
const aim = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.2, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
aim.rotation.x = -Math.PI / 2; scene.add(aim);

// ======================================================================
// Estado do jogo no navegador
// ======================================================================
const G = { active: false, mode: null, game: "pes", F: C.MODES.pes, me: null, remotes: new Map(), keeper: null, kickoffKey: null, lastSend: 0, feed: [],
  camYaw: 0, camPitch: 0.05, tv: false, ballCam: true, camCarYaw: 0, view: store.get("pelada:view") || "atras" };
// câmeras a pé: atrás do jogador (o mouse gira), TV (da lateral) e primeira pessoa. W/A/S/D sempre seguem a TELA:
// na TV, W é para cima da tela (e não para onde você mirou por último).
const VIEWS = ["atras", "tv", "primeira"], VIEW_NAMES = { atras: "Câmera atrás do jogador", tv: "Câmera de TV", primeira: "Primeira pessoa" };
const ctrlYaw = () => (G.view === "tv" ? 0 : G.camYaw);
const keys = new Set();
let sens = store.get("pelada:sens") ?? 1.6, jumpQueued = false, charge = null, wheelQueued = false;
const now = () => performance.now() / 1000;
// no celular não tem "prender o mouse": jogando = depois de tocar em "Voltar pro jogo"
const TOUCH = window.Toque && Toque.isTouch();
let touchPlay = false;
const locked = () => document.pointerLockElement === canvas || (TOUCH && touchPlay && G.active);
const ballS = { snap: null, view: C.newBall(), off: { x: 0, y: 0, z: 0 }, ignoreUntil: 0 };
const local = { ball: null };
const isCar = () => G.game === "carros";

function newMe(spawn) {
  return { x: spawn[0], y: 0, z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, facing: spawn[3], yaw: spawn[3], pitch: 0, stamina: 1, sprint: false,
    kickT: 0, lastKick: 0, slideT: 0, slideCd: 0, diveT: 0, downT: 0, jumps: 0, jumpT: 9, flipT: 0, boost: 34, boosting: false, st: {} };
}
function myKit() { if (G.mode === "treino") return store.get("pelada:kit") || "corinthians"; const m = myP(); return m && m.team ? S.kits[m.team] : "corinthians"; }
function startGame(mode, game, falta = false) {
  if (G.active && G.mode === mode && G.game === game && !!G.falta === falta) return;
  stopGame();
  G.active = true; G.mode = mode; G.game = game; G.F = C.MODES[game]; G.kickoffKey = null; G.feed = [];
  ensureArena(game);
  show("game"); resize();
  const sp = C.spawns(game, "A", [{}], false)[0];
  G.me = newMe(sp); G.camYaw = sp[3]; G.camPitch = 0.05; G.camCarYaw = sp[3];
  rebuildMyModel();
  if (mode === "treino") {
    local.ball = C.newBall(G.F);
    if (game === "pes") {
      local.ball.x = 3; G.me.x = -2;
      G.keeper = { id: "goleiro", x: G.F.L - 0.6, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, holdT: 0, model: makePlayer("laranja", 1, "Goleiro", { gk: true }), st: {} };
      G.keeper.model.rotation.y = Math.PI / 2; scene.add(G.keeper.model);
    } else { local.ball.x = -10; G.me.x = -26; }
    G.tKicks = 0; G.tGoals = 0;
    G.falta = falta ? { n: 0, goals: 0, state: "mirar", t0: 0, wall: [] } : null;
    if (falta) setupFalta();
  } else syncFromState(null, S);
  $("pause").classList.remove("hidden"); touchPlay = false;
  requestAnimationFrame(loop);
}
function stopGame() {
  if (!G.active) return;
  G.active = false;
  for (const r of G.remotes.values()) scene.remove(r.model);
  G.remotes.clear(); clearRags();
  if (G.keeper) { scene.remove(G.keeper.model); G.keeper = null; }
  if (G.falta) { for (const w of G.falta.wall) scene.remove(w.model); G.falta = null; }
  if (G.meModel) { scene.remove(G.meModel); G.meModel = null; }
  local.ball = null; charge = null; Sound.engine(0, false);
  if (document.pointerLockElement) document.exitPointerLock();
  touchPlay = false; if (TOUCH) Toque.show(false);
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
function rebuildMyModel() {
  if (G.meModel) scene.remove(G.meModel);
  const m = myP(), playing = G.mode === "treino" || (m && m.team);
  const car = (m && m.car) || store.get("pelada:car") || "godzilla";
  G.meModel = !playing ? null : isCar() ? makeCar(car, myKit(), "") : makePlayer(myKit(), m ? m.num || 10 : 10, "", { gk: !!(m && m.gk) });
  G.meKey = `${G.game}|${myKit()}|${m && m.gk}|${car}|${m && m.num}`;
  if (G.meModel) scene.add(G.meModel);
}
function leaveGame() {
  if (G.mode === "treino") { stopGame(); if (S) { if (S.phase !== "lobby") startGame("online", S.config.mode); else { show("lobby"); renderLobby(); } } else show("home"); return; }
  if (confirm("Sair da quadra? O jogo continua sem você.")) { socket.disconnect(); urlCode = null; ME = null; S = null; stopGame(); history.replaceState(null, "", BASE); $("roomTag").classList.add("hidden"); show("home"); socket.connect(); }
}

// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  // entrou pelo código numa sala da outra casa (pelada x rocket): vai para a página certa
  if (st.config.mode !== FIXO) { location.replace((st.config.mode === "carros" ? "/rocket/" : "/pelada/") + "?sala=" + st.code); return; }
  const old = S; S = st;
  if (st.phase === "lobby") {
    if (G.active && G.mode === "online") stopGame();
    if (!G.active) { show("lobby"); renderLobby(); }
    return;
  }
  if (!G.active || G.mode === "treino" || G.game !== st.config.mode) startGame("online", st.config.mode);
  else syncFromState(old, st);
});
function syncFromState(old, st) {
  if (!st || !G.active || G.mode !== "online") return;
  ensureArena(G.game);
  const mine = myP(), m = st.match;
  const ids = new Set();
  for (const p of st.players) {
    if (!p.team || (ME && p.id === ME.id)) continue;
    ids.add(p.id);
    let rm = G.remotes.get(p.id);
    const key = `${G.game}|${p.team}|${st.kits[p.team]}|${p.num}|${p.gk}|${p.car}`;
    if (!rm || rm.key !== key) {
      if (rm) scene.remove(rm.model);
      const model = isCar() ? makeCar(p.car, st.kits[p.team], p.name) : makePlayer(st.kits[p.team], p.num, p.name, { gk: p.gk });
      rm = { id: p.id, n: p.n, key, team: p.team, name: p.name, model, buf: [], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, f: 0, speed: 0, st: {} };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    rm.n = p.n;
    if (p.spawn && m && (!old || !old.match || old.match.kickoff !== m.kickoff)) rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: 0, z: p.spawn[2], yaw: p.spawn[3], pitch: 0, f: 0, vx: 0, vz: 0 }];
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { scene.remove(rm.model); G.remotes.delete(id); }
  const car = (mine && mine.car) || "godzilla";
  if (G.meKey !== `${G.game}|${myKit()}|${mine && mine.gk}|${car}|${mine && mine.num}` || (!!G.meModel !== !!(mine && mine.team))) rebuildMyModel();
  if (m && `${m.kickoff}` !== G.kickoffKey) {
    G.kickoffKey = `${m.kickoff}`;
    if (mine && mine.team && mine.spawn) { const boost = G.me.boost; Object.assign(G.me, newMe(mine.spawn)); G.me.boost = Math.max(34, boost); G.camYaw = mine.spawn[3]; G.camPitch = 0.05; G.camCarYaw = mine.spawn[3]; }
    ballS.snap = null; Object.assign(ballS.view, C.newBall(G.F)); ballS.off = { x: 0, y: 0, z: 0 };
    for (const pd of pads) pd.until = 0;
    if (m.kickoff > 1) flashMsg("Saída de bola", "", 2000);
  }
  if (m && old && old.match && old.match.phase === "ready" && m.phase === "live") Sound.start();
  if (st.phase === "over" && old && old.phase !== "over") Sound.end();
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}

// ---------- pacote do servidor (20x por segundo): bola e todo mundo ----------
socket.on("snap", (d) => {
  if (!G.active || G.mode !== "online") return;
  for (const e of d.p) {
    const p = PN(e[0]); if (!p) continue;
    const rm = G.remotes.get(p.id); if (!rm) continue;
    rm.buf.push({ t: d.t, x: e[1], y: e[2], z: e[3], vx: e[4], vy: e[5], vz: e[6], yaw: e[7], pitch: e[8], f: e[9] });
    if (rm.buf.length > 30) rm.buf.shift();
  }
  const [x, y, z, vx, vy, vz, hit, hn, sp, wx = 0, wy = 0, wz = 0] = d.b;
  if (hit > 2) { const [k, pan] = hearing([x, y, z]); Sound.bounce(hit, k, pan, isCar()); }
  const holder = hn >= 0 && PN(hn) ? PN(hn).id : null;
  if (performance.now() < ballS.ignoreUntil && !holder) return; // acabei de chutar: espero o chute voltar do servidor
  const before = { ...ballS.view };
  ballS.snap = { t: d.t, x, y, z, vx, vy, vz, sp: sp || 0, wx, wy, wz, holder };
  const pred = predictBall();
  if (pred && !holder) { ballS.off = { x: before.x - pred.x, y: before.y - pred.y, z: before.z - pred.z }; if (Math.hypot(ballS.off.x, ballS.off.y, ballS.off.z) > 4) ballS.off = { x: 0, y: 0, z: 0 }; }
  else ballS.off = { x: 0, y: 0, z: 0 };
});
socket.on("kicked", (d) => {
  if (!G.active || G.mode !== "online") return;
  const rm = G.remotes.get(d.id);
  if (rm) { rm.st.kickT = now(); const [k, pan] = hearing([rm.x, 0.5, rm.z]); Sound.kick(d.power, k, pan); }
  if (ME && d.id === ME.id) ballS.ignoreUntil = 0;
});
socket.on("pegou", () => { if (G.active) Sound.catch(); });
socket.on("caiu", (d) => {
  if (!G.active || G.mode !== "online") return;
  Sound.fall();
  // o derrubado vira boneco de pano por um instante (empurrado na direção do carrinho) e depois levanta
  const vic = ME && d.id === ME.id ? { model: G.meModel, x: G.me.x, y: G.me.y, z: G.me.z, yaw: G.me.facing, vx: G.me.vx, vz: G.me.vz } : G.remotes.get(d.id);
  const tk = ME && d.by === ME.id ? G.me : G.remotes.get(d.by); // quem deu o carrinho
  if (vic && vic.model && !isCar() && !(vic.model === G.meModel && G.view === "primeira")) {
    const dx = tk ? vic.x - tk.x : 0, dz = tk ? vic.z - tk.z : 1, l = Math.hypot(dx, dz) || 1;
    addRag(vic.model, vic.x, vic.y || 0, vic.z, vic.yaw ?? vic.model.rotation.y, { x: vic.vx || 0, y: 0, z: vic.vz || 0 }, { x: (dx / l) * 3.5, y: 2.2, z: (dz / l) * 3.5 }, 1.15);
  }
  if (ME && d.id === ME.id) { G.me.downT = 1.4; charge = null; }
  const by = P(d.by), to = P(d.id);
  if (by && to) pushFeed(`🦵 ${h(by.name)} derrubou ${h(to.name)}`);
});
socket.on("goal", (d) => {
  if (!G.active || G.mode !== "online") return;
  const by = P(d.by), as = P(d.assist), kit = S.kits[d.side];
  Sound.net(); Sound.cheer();
  flashMsg("GOOOL!", by ? (d.own ? `Gol contra de ${by.name}` : `${by.name}${as ? ` (passe de ${as.name})` : ""} · ${SIDES[d.side]}`) : SIDES[d.side], 3800, C.kitColor(kit), true);
  pushFeed(`⚽ ${by ? h(by.name) + (d.own ? " (contra)" : "") : SIDES[d.side]}${as ? ` <span style="opacity:.75">· ${h(as.name)}</span>` : ""}`);
});
// onde está a bola agora: segura na mão do goleiro, ou prevista a partir do último pacote (com o meu corpo junto)
function holderPos(id) {
  if (ME && id === ME.id && G.me) return { x: G.me.x, y: G.me.y, z: G.me.z, yaw: G.me.facing };
  const rm = G.remotes.get(id); return rm ? { x: rm.x, y: rm.y, z: rm.z, yaw: rm.yaw } : null;
}
function predictBall() {
  const s = ballS.snap; if (!s) return null;
  if (s.holder) { const hp = holderPos(s.holder); if (hp) return { x: hp.x - Math.sin(hp.yaw) * 0.45, y: hp.y + 1.15, z: hp.z - Math.cos(hp.yaw) * 0.45, vx: 0, vy: 0, vz: 0, holder: s.holder }; }
  const b = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, sp: s.sp || 0, wx: s.wx || 0, wy: s.wy || 0, wz: s.wz || 0, holder: null };
  const live = S && S.match && S.match.phase !== "ready";
  const dt = live ? clamp((sNow() - s.t) / 1000, 0, 0.25) : 0;
  const me = myBody();
  if (dt > 0) C.simulate(G.F, b, me ? [me] : [], dt);
  return b;
}
function myBody() {
  if (!G.meModel || !G.me) return null;
  const me = G.me;
  return isCar() ? { id: "eu", kind: "car", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, yaw: me.yaw, flip: me.flipT > 0 }
    : { id: "eu", kind: "pe", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, sprint: me.sprint, slide: me.slideT > 0 || me.downT > 0, dive: me.diveT > 0 };
}
function hearing(p) {
  const ex = cam.position, dx = p[0] - ex.x, dz = p[2] - ex.z, dist = Math.hypot(dx, dz, p[1] - ex.y);
  const yaw = isCar() ? G.camCarYaw : G.camYaw, right = [Math.cos(yaw), -Math.sin(yaw)];
  return [1 / (1 + dist / (isCar() ? 30 : 14)), dist > 0.5 ? (dx * right[0] + dz * right[1]) / dist * 0.7 : 0];
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
$("btnResume").onclick = () => { Sound.unlock(); if (TOUCH) { setupTouch(); touchPlay = true; $("pause").classList.add("hidden"); Toque.fullscreen(); } else canvas.requestPointerLock?.(); };
// botões na tela (celular): a pé, chute/passe/cavadinha (segure para carregar a força), pique, carrinho e pulo;
// de carro, turbo, pulo (duas vezes: mortal) e derrapagem. O joystick anda (ou acelera e vira).
function setupTouch() {
  const pause = { icon: "⏸", down: () => { touchPlay = false; keys.clear(); charge = null; $("pause").classList.remove("hidden"); renderPauseSb(); } };
  if (isCar()) Toque.setup({
    buttons: [{ icon: "💨", label: "derrapar", code: "KeyQ" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "🔥", label: "turbo", code: "ShiftLeft", big: true }],
    top: [pause, { icon: "🎥", code: "KeyC" }, { icon: "📺", code: "KeyV" }, { icon: "📋", code: "Tab" }],
  });
  else Toque.setup({
    look: (dx, dy) => { if (!locked() || G.view === "tv") return; const k = 0.0028 * sens; G.camYaw -= dx * k; G.camPitch = clamp(G.camPitch - dy * k, ...pitchRange()); },
    buttons: [
      { icon: "🌙", label: "cavadinha", code: "KeyL" }, { icon: "🎯", label: "passe", code: "KeyJ" }, { icon: "🦵", label: "carrinho", down: () => { if (locked() && G.meModel) wheelQueued = true; } },
      { icon: "🏃", label: "pique", code: "ShiftLeft" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "⚽", label: "chute", code: "KeyK", big: true },
    ],
    top: [pause, { icon: "🎥", code: "KeyC" }, { icon: "📋", code: "Tab" }],
  });
}
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
  if (!locked() || isCar() || G.view === "tv") return;
  const k = sens * 0.022 * (Math.PI / 180);
  G.camYaw -= e.movementX * k; G.camPitch = clamp(G.camPitch - e.movementY * k, ...pitchRange());
});
const KICK_BTN = { 0: "chute", 2: "passe", 1: "cavadinha" }, KICK_KEY = { KeyK: "chute", KeyJ: "passe", KeyL: "cavadinha" };
document.addEventListener("mousedown", (e) => { if (!locked() || !G.meModel || isCar()) return; if (KICK_BTN[e.button] && !charge) { e.preventDefault(); charge = { kind: KICK_BTN[e.button], t0: now(), src: "m" + e.button }; } });
document.addEventListener("mouseup", (e) => { if (charge && charge.src === "m" + e.button) releaseKick(); });
document.addEventListener("wheel", (e) => { if (locked() && G.meModel && !isCar()) { e.preventDefault(); wheelQueued = true; } }, { passive: false });
function releaseKick() { const c = charge; charge = null; if (c) doKick(c.kind, powerOf(c)); }
const powerOf = (c) => clamp((now() - c.t0) / (c.kind === "passe" ? 0.8 : 0.9), 0, 1);
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Tab") { e.preventDefault(); $("tab").classList.remove("hidden"); $("tab").innerHTML = scoreTable(); return; }
  if (!locked()) return;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  if (e.code === "Space" && !e.repeat) jumpQueued = true;
  if (e.code === "KeyC" && !e.repeat) {
    if (isCar()) G.ballCam = !G.ballCam;
    else { G.view = VIEWS[(VIEWS.indexOf(G.view) + 1) % VIEWS.length]; store.set("pelada:view", G.view); G.camPitch = clamp(G.camPitch, ...pitchRange()); flashMsg("", VIEW_NAMES[G.view], 1200); }
  }
  if (e.code === "KeyV" && !e.repeat && isCar()) G.tv = !G.tv;
  if (KICK_KEY[e.code] && !e.repeat && !charge && !isCar()) charge = { kind: KICK_KEY[e.code], t0: now(), src: e.code };
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Tab") $("tab").classList.add("hidden");
  if (charge && charge.src === e.code) releaseKick();
});
window.addEventListener("blur", () => { keys.clear(); charge = null; });

function canPlay() { if (G.mode === "treino") return true; const m = S && S.match; return S && S.phase === "play" && m && m.phase === "live"; }
// direção da bola: as setas (em relação à câmera); sem seta, para onde o jogador está virado
// quanto dá para olhar para baixo e para cima: em primeira pessoa dá para olhar o chão (e a bola no pé)
const pitchRange = () => (G.view === "primeira" ? [-1.35, 0.9] : [-0.45, 0.7]);
function aimYaw() {
  const f = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0), s = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
  if (!f && !s) return G.me.facing;
  const yaw = ctrlYaw(), wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  return Math.atan2(-wx, -wz);
}
function mates() {
  if (G.mode !== "online") return [];
  const mine = myP(); if (!mine) return [];
  return [...G.remotes.values()].filter((r) => r.team === mine.team).map((r) => ({ x: r.x, z: r.z, vx: r.vx || 0, vz: r.vz || 0 }));
}
// efeito: segurar Q (curva para a esquerda) ou E (para a direita) na hora do chute
const curveNow = () => (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
function doKick(kind, power) {
  const me = G.me, t = now();
  if (!canPlay() || t - me.lastKick < C.KICK_CD || me.downT > 0) return;
  const ball = G.mode === "treino" ? local.ball : ballS.view;
  const body = { ...me, id: ME ? ME.id : "eu" };
  const how = C.canKick(body, ball, G.mode === "treino" ? 0 : 0.2);
  me.kickT = t; me.lastKick = t; me.st.kickT = t; // a perna balança mesmo se errar
  if (!how) return;
  let yaw = aimYaw();
  if (kind === "passe" && how !== "mao") ({ yaw, power } = C.assistPass(me, yaw, mates(), power));
  if (kind === "chute" && how === "pe" && !isCar()) yaw = C.assistShot(me, yaw, myAttackTeam() || "A", G.F); // ajudinha para os cantos
  me.facing = yaw;
  Sound.kick(power);
  const curve = curveNow();
  if (G.mode === "treino") { C.kick(local.ball, { ...me, id: "eu" }, kind, power, yaw, 0, curve); G.tKicks++; if (G.falta && G.falta.state === "mirar") { G.falta.state = "voando"; G.falta.t0 = t; G.falta.touched = null; } return; }
  socket.emit("kick", { kind, power, yaw, curve });
  // previsão: a bola já sai do meu pé aqui; o servidor confirma em seguida
  const b = { ...ballS.view }; C.kick(b, body, kind, power, yaw, 0.2, curve);
  ballS.snap = { t: sNow(), x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sp: b.sp, wx: b.wx || 0, wy: b.wy || 0, wz: b.wz || 0, holder: null }; ballS.off = { x: 0, y: 0, z: 0 };
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
  if (TOUCH) { const want = touchPlay && $("over").classList.contains("hidden"); if (Toque.on !== want) Toque.show(want); }
  const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
  try { frame(dt, t); } catch (e) { console.error(e); }
}
function myFlags() {
  const me = G.me; let f = 0;
  if (me.sprint) f |= FL.sprint; if (charge) f |= FL.charge; if (me.slideT > 0) f |= FL.slide; if (me.diveT > 0) f |= FL.dive;
  if (me.flipT > 0) f |= FL.flip; if (me.boosting) f |= FL.boost;
  return f;
}
function frame(dt, t) {
  const online = G.mode === "online", m = S && S.match;
  const frozen = online && (!m || m.phase === "ready" || S.phase !== "play");
  if (G.meModel) (isCar() ? stepCar : stepFoot)(dt, t, frozen);
  // envia minha posição
  if (G.meModel && online && t - G.lastSend > 1 / 30) {
    const me = G.me; G.lastSend = t; const q = (v) => Math.round(v * 100) / 100;
    socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), vx: q(me.vx), vy: q(me.vy), vz: q(me.vz), yaw: q(isCar() ? me.yaw : me.facing), p: q(me.pitch || 0), f: myFlags() });
  }
  if (G.mode === "treino") practiceStep(dt, t);
  updateRemotes(dt);
  updateRags(dt);
  updateBall(dt);
  updateCamera(dt);
  hud(t);
  updateGoalSigns();
  renderer.render(scene, cam);
}
// de quem é cada gol: o gol da direita (+x) é defendido pelo Visitante (B) e é onde o Mandante (A) faz gol.
// Cada um vê "ATAQUE" no gol onde precisa marcar e "DEFESA" no seu; quem assiste vê o nome de quem defende.
function myAttackTeam() { if (G.mode === "treino") return "A"; const m = myP(); return m && m.team ? m.team : null; }
function updateGoalSigns() {
  const team = myAttackTeam(), kits = S && S.kits ? S.kits : { A: myKit(), B: "palmeiras" };
  for (const g of goalSigns) {
    const def = g.s > 0 ? "B" : "A", col = C.kitColor(kits[def]);
    const text = team ? (team === def ? "🧤 SEU GOL" : "⚽ ATAQUE AQUI") : `Gol do ${SIDES[def]}`;
    const sub = G.mode === "treino" ? "" : kitOf(kits[def]).name;
    const key = text + col + sub;
    if (g.key !== key) {
      g.key = key; const x = g.c.getContext("2d"); x.clearRect(0, 0, 512, 128);
      x.fillStyle = col; x.globalAlpha = 0.9; x.beginPath(); x.roundRect(6, 6, 500, 116, 26); x.fill(); x.globalAlpha = 1;
      x.lineWidth = 8; x.strokeStyle = team && team !== def ? "#ffd84a" : "#ffffff"; x.stroke();
      x.textAlign = "center"; x.textBaseline = "middle"; x.font = "bold 54px Figtree, sans-serif"; x.lineWidth = 10; x.strokeStyle = "#000b";
      x.strokeText(text, 256, sub ? 52 : 66); x.fillStyle = "#fff"; x.fillText(text, 256, sub ? 52 : 66);
      if (sub) { x.font = "bold 28px Figtree, sans-serif"; x.lineWidth = 6; x.strokeText(sub, 256, 100); x.fillText(sub, 256, 100); }
      g.tex.needsUpdate = true; g.strip.material.color.set(col);
    }
  }
  // seta na tela apontando para o gol onde eu ataco
  const el = $("hDir");
  if (!team || !G.F) { el.classList.add("hidden"); return; }
  const gx = (team === "A" ? 1 : -1) * G.F.L, f = new THREE.Vector3(); cam.getWorldDirection(f);
  const dx = gx - cam.position.x, dz = -cam.position.z, fl = Math.hypot(f.x, f.z) || 1, fx = f.x / fl, fz = f.z / fl;
  const ang = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
  el.classList.remove("hidden"); el.querySelector("b").style.transform = `rotate(${ang}rad)`;
  el.querySelector("i").style.background = C.kitColor(kits[team]);
}
// ---------- a pé ----------
function stepFoot(dt, t, frozen) {
  const me = G.me, F = G.F, yaw = ctrlYaw(), mine = myP(), isGK = G.mode === "online" && mine && mine.gk;
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  let wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  const len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
  me.slideT = Math.max(0, me.slideT - dt); me.diveT = Math.max(0, me.diveT - dt); me.downT = Math.max(0, me.downT - dt); me.slideCd = Math.max(0, me.slideCd - dt);
  const busy = me.slideT > 0 || me.diveT > 0 || me.downT > 0;
  const holding = ballS.snap && ME && ballS.snap.holder === ME.id;
  // carrinho (rodinha do mouse): desliza para onde está virado e derruba quem estiver na frente
  if (wheelQueued && !frozen && !busy && me.onGround && me.slideCd <= 0 && !holding) {
    const sp = Math.max(Math.hypot(me.vx, me.vz), 7.5); me.vx = -Math.sin(me.facing) * sp; me.vz = -Math.cos(me.facing) * sp;
    me.slideT = 0.6; me.slideCd = 1.3; charge = null; Sound.slide();
  }
  wheelQueued = false;
  // mergulho do goleiro: Espaço com A/D (ou ←/→) apertado
  const side = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  if (jumpQueued && isGK && side && me.onGround && !busy && !frozen && !holding) {
    const ry = me.facing, rx = Math.cos(ry), rz = -Math.sin(ry);
    me.vx = rx * side * 7.5; me.vz = rz * side * 7.5; me.vy = 3.2; me.onGround = false; me.diveT = 0.75; me.st.diveSide = side; jumpQueued = false; Sound.jump();
  }
  const wantSprint = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && len > 0 && !charge && !busy;
  me.sprint = wantSprint && me.stamina > 0.02;
  me.stamina = clamp(me.stamina + (me.sprint ? -0.24 : 0.14) * dt, 0, 1);
  let speed = charge ? C.CHARGING : me.sprint ? C.SPRINT : C.RUN;
  if (frozen || !len) speed = 0;
  if (frozen) { me.vx = 0; me.vz = 0; }
  if (busy) { const k = Math.exp(-dt * (me.downT > 0 ? 6 : 1.6)); me.vx *= k; me.vz *= k; }
  const jumping = jumpQueued && !frozen && !busy && me.onGround;
  C.movePlayer(me, { x: wx, z: wz, speed, jump: jumping, free: busy }, dt, F);
  if (jumping) Sound.jump();
  jumpQueued = false;
  // goleiro com a bola: não sai da área
  if (isGK && holding && !C.inArea("pes", mine.team, me.x, me.z)) { const gx = mine.team === "A" ? -F.L : F.L, d = Math.hypot(me.x - gx, me.z) || 1; me.x = gx + (me.x - gx) / d * (F.areaR - 0.05); me.z = me.z / d * (F.areaR - 0.05); }
  // empurrão leve: não dá para atravessar os outros
  const others = [...G.remotes.values(), ...(G.keeper ? [G.keeper] : [])];
  for (const o of others) { const dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz), min = 2 * C.P_R; if (d < min && d > 1e-4) { me.x += (dx / d) * (min - d); me.z += (dz / d) * (min - d); } }
  // o corpo vira para onde está correndo; carregando o chute, vira para a mira
  const hsp = Math.hypot(me.vx, me.vz);
  if (!busy) { const target = charge ? aimYaw() : hsp > 0.5 ? Math.atan2(-me.vx, -me.vz) : me.facing; me.facing = angLerp(me.facing, target, Math.min(1, dt * 12)); }
  me.st.holding = holding;
  G.meModel.position.set(me.x, me.y, me.z); G.meModel.rotation.y = me.facing;
  animate(G.meModel, hsp, dt, me.st, myFlags() | (me.downT > 0 ? FL.down : 0));
}
// ---------- de carro ----------
function stepCar(dt, t, frozen) {
  const me = G.me, F = G.F;
  const thr = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const steer = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
  if (frozen) { me.vx = 0; me.vz = 0; me.vy = Math.min(me.vy, 0); }
  const wasGround = me.onGround, wasBoost = me.boosting;
  me.boosting = boost && me.boost > 0 && !frozen;
  C.moveCar(me, { thr: frozen ? 0 : thr, steer, boost: me.boosting, jump: jumpQueued && !frozen, drift: keys.has("KeyQ") }, dt, F);
  if (jumpQueued && !frozen) Sound.jump();
  jumpQueued = false;
  if (me.boosting && !wasBoost) Sound.boost();
  if (me.onGround && !wasGround) Sound.bounce(6, 0.6, 0, true);
  // almofadas de turbo
  for (const pd of pads) {
    pd.orb.visible = t >= pd.until;
    if (pd.orb.visible) { pd.orb.rotation.y += dt * 2; if (Math.hypot(me.x - pd.x, me.z - pd.z) < (pd.big ? 2.2 : 1.4) && me.y < 1.5 && me.boost < 100) { me.boost = Math.min(100, me.boost + (pd.big ? 100 : 15)); pd.until = t + (pd.big ? 10 : 5); Sound.pad(); } }
  }
  // batida leve entre carros
  for (const o of G.remotes.values()) { const dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz); if (d < 2.6 && d > 1e-4 && Math.abs(me.y - o.y) < 1.4) { me.x += (dx / d) * (2.6 - d) * 0.5; me.z += (dz / d) * (2.6 - d) * 0.5; } }
  const sp = Math.hypot(me.vx, me.vz);
  me.st.steer = steer;
  if (me.flipT > 0) me.st.flipDir = me.flipDir; else me.st.flipDir = null;
  G.meModel.position.set(me.x, me.y, me.z); G.meModel.rotation.y = me.yaw;
  animateCar(G.meModel, me.st, dt, (me.vx * -Math.sin(me.yaw) + me.vz * -Math.cos(me.yaw)), myFlags(), me.pitch);
  Sound.engine(sp, true);
}

// ---------- boneco de pano (derrubado no carrinho) ----------
const rags = [];
function addRag(model, x, y, z, yaw, vel, push, life) {
  const F = G.F, solid = (p, r) => { p.x = clamp(p.x, -F.L - F.goalD + r, F.L + F.goalD - r); p.z = clamp(p.z, -F.W + r, F.W - r); };
  // a perna que leva o carrinho sai do chão primeiro: empurra os pés mais que o corpo
  const rg = new Ragdoll({ scene, x, y, z, yaw, vel, mats: model.userData.mats, life, solid, push });
  rg.model = model; rags.push(rg); model.visible = false;
  for (const i of [13, 14]) rg.q[i].addScaledVector(new THREE.Vector3(push.x, 0, push.z), -1 / 60); // pés: rasteira
  if (rags.length > 8) { const o = rags.shift(); o.model.visible = true; o.dispose(); }
}
function updateRags(dt) {
  for (let i = rags.length - 1; i >= 0; i--) { const r = rags[i]; r.model.visible = false; if (!r.step(dt)) { r.model.visible = true; r.dispose(); rags.splice(i, 1); } }
}
function clearRags() { while (rags.length) { const r = rags.pop(); r.model.visible = true; r.dispose(); } }
function updateRemotes(dt) {
  const rt = sNow() - INTERP;
  for (const rm of G.remotes.values()) {
    const b = rm.buf;
    if (b.length) {
      let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
      const B = b[i], A = b[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((rt - A.t) / (B.t - A.t), 0, 1);
      const nx = lerp(A.x, B.x, k), nz = lerp(A.z, B.z, k);
      rm.speed = Math.hypot(nx - rm.x, nz - rm.z) / Math.max(dt, 1e-3);
      rm.x = nx; rm.y = lerp(A.y, B.y, k); rm.z = nz; rm.vx = B.vx; rm.vz = B.vz;
      const ny = angLerp(A.yaw, B.yaw, k); rm.st.steer = clamp(angLerp(0, ny - rm.yaw, 1) / Math.max(dt, 1e-3) / -2, -1, 1); rm.yaw = ny;
      rm.pitch = lerp(A.pitch || 0, B.pitch || 0, k); rm.f = B.f | 0;
      while (b.length > 2 && b[1].t < rt - 200) b.shift();
    }
    rm.model.position.set(rm.x, rm.y, rm.z); rm.model.rotation.y = rm.yaw;
    if (isCar()) animateCar(rm.model, rm.st, dt, rm.speed, rm.f, rm.pitch);
    else { rm.st.holding = ballS.snap && ballS.snap.holder === rm.id; animate(rm.model, rm.speed, dt, rm.st, rm.f); }
  }
}

function updateBall(dt) {
  let b;
  if (G.mode === "treino") b = local.ball;
  else {
    const pred = predictBall() || C.newBall(G.F);
    const k = Math.exp(-dt * 12); ballS.off.x *= k; ballS.off.y *= k; ballS.off.z *= k;
    b = ballS.view; b.x = pred.x + ballS.off.x; b.y = Math.max(G.F.ballR, pred.y + ballS.off.y); b.z = pred.z + ballS.off.z; b.vx = pred.vx; b.vy = pred.vy; b.vz = pred.vz; b.wx = pred.wx || 0; b.wy = pred.wy || 0; b.wz = pred.wz || 0; b.holder = pred.holder || null;
  }
  if (!b) return;
  const R = G.F.ballR, prev = ballMesh.userData.prev || { x: b.x, z: b.z }, mx = b.x - prev.x, mz = b.z - prev.z, dist = Math.hypot(mx, mz);
  const w = Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0);
  if (G.F.rl && w > 1e-3) ballMesh.rotateOnWorldAxis(new THREE.Vector3(b.wx / w, b.wy / w, b.wz / w), w * dt); // giro de verdade (Rocket)
  else if (dist > 1e-5 && dist < 4) ballMesh.rotateOnWorldAxis(new THREE.Vector3(mz / dist, 0, -mx / dist), dist / R);
  ballMesh.userData.prev = { x: b.x, z: b.z };
  ballMesh.position.set(b.x, b.y, b.z);
  blob.position.set(b.x, 0.02, b.z); blob.material.opacity = clamp(0.3 - (b.y - R) * 0.03, 0.05, 0.3);
  // Rocket: marca no chão de onde a bola vai cair (quando ela está no alto)
  const air = G.F.rl && b.y > R + 2 && !b.holder, L = air ? C.landing(G.F, b) : null;
  landMark.visible = !!L;
  if (L) { landMark.position.set(L.x, 0.04, L.z); landMark.scale.setScalar(R * (0.8 + Math.min(1, L.t) * 0.6)); landMark.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(now() * 6)); }
}

// goleiro robô (treino e faltas): fica na linha entre a bola e o gol; com a bola vindo, vai para onde ela vai
// cruzar a linha e se joga se não der tempo de chegar andando. Segura a bola que para perto e devolve.
function keeperBot(k, b, dt, t) {
  const F = G.F, gx = F.L - 0.6;
  k.diveT = Math.max(0, (k.diveT || 0) - dt);
  const coming = b.vx > 5 && b.x < gx;
  const zc = coming ? b.z + b.vz * (gx - b.x) / b.vx : b.z * (G.falta ? 0.35 : 0.8);
  const tz = clamp(zc, -F.goalW + 0.3, F.goalW - 0.3);
  if (!k.diveT) {
    const tArrive = coming ? (gx - b.x) / b.vx : 9;
    if (coming && tArrive < 0.45 && Math.abs(tz - k.z) > 0.55 && k.onGround) { // não chega andando: se joga
      const sd = Math.sign(tz - k.z); k.vz = sd * 7; k.vy = 3; k.onGround = false; k.diveT = 0.7; k.st.diveSide = -sd; Sound.jump();
    } else {
      const want = clamp((tz - k.z) * 7, -6, 6);
      C.movePlayer(k, { x: 0, z: Math.sign(want), speed: Math.abs(want), jump: coming && b.y > 1.3 && tArrive < 0.4 && k.onGround }, dt, F);
    }
  } else C.movePlayer(k, { x: 0, z: 0, speed: 0, free: true }, dt, F);
  k.x = gx;
  const near = Math.hypot(b.x - k.x, b.z - k.z) < 1.2 && Math.hypot(b.vx, b.vz) < 3 && b.y < 1;
  if (near && !G.falta) { k.holdT += dt; if (k.holdT > 0.8) { k.holdT = 0; k.st.kickT = t; C.kick(b, k, "passe", 0.6 + Math.random() * 0.3, Math.PI / 2 + (Math.random() - 0.5) * 0.8); Sound.kick(0.5, 0.6); } }
  else k.holdT = 0;
  k.model.position.set(k.x, k.y, k.z); animate(k.model, Math.abs(k.vz), dt, k.st, k.diveT ? FL.dive : 0);
  return { ...k, kind: "pe", dive: k.diveT > 0 };
}
// faltas: bola parada num ponto entre 8 e 14 m do gol, barreira de 3 e o goleiro
function setupFalta() {
  const F = G.F, fz = G.falta, b = local.ball, me = G.me, k = G.keeper;
  let x, z;
  do { x = F.L - 8 - Math.random() * 6; z = (Math.random() * 2 - 1) * 7; } while (Math.hypot(F.L - x, z) < 8);
  Object.assign(b, C.newBall(F), { x, z });
  const dx = F.L - x, dz = -z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, yaw = Math.atan2(-ux, -uz);
  Object.assign(me, { x: x - ux * 1.6, z: z - uz * 1.6, vx: 0, vy: 0, vz: 0, y: 0, onGround: true, facing: yaw });
  G.camYaw = yaw; G.camPitch = 0.05;
  for (const w of fz.wall) scene.remove(w.model);
  fz.wall = [-0.75, 0, 0.75].map((o, i) => {
    const w = { id: "barreira" + i, x: x + ux * 5 - uz * (o + 0.35), y: 0, z: z + uz * 5 + ux * (o + 0.35), vx: 0, vy: 0, vz: 0, onGround: true, st: {}, model: makePlayer("laranja", 4 + i, "") };
    w.model.rotation.y = yaw + Math.PI; scene.add(w.model); return w;
  });
  Object.assign(k, { z: clamp(z * 0.35, -1.2, 1.2), vz: 0, vy: 0, y: 0, onGround: true, diveT: 0 });
  fz.state = "mirar"; fz.n++;
  flashMsg(`Falta ${fz.n}`, "Q/E: efeito · setas: mirar · K: chute · L: cavadinha", 2600);
}
function faltaResult(msg, color, sound) {
  const fz = G.falta; fz.state = "fim"; fz.t0 = now();
  flashMsg(msg, `${fz.goals} gol${fz.goals === 1 ? "" : "s"} em ${fz.n} falta${fz.n === 1 ? "" : "s"}`, 1800, color, msg.startsWith("GOO"));
  sound();
}
// treino: a bola (e o goleiro robô, a pé) rodam só aqui
function practiceStep(dt, t) {
  const b = local.ball, me = G.me, k = G.keeper, F = G.F, fz = G.falta;
  const bodies = [myBody()];
  if (k) bodies.push(keeperBot(k, b, dt, t));
  if (fz) {
    for (const w of fz.wall) { // a barreira pula logo depois do chute
      if (fz.state === "voando" && !w.jumped && t - fz.t0 > 0.12) { w.jumped = true; w.vy = 4.2; w.onGround = false; }
      if (fz.state === "mirar") w.jumped = false;
      C.movePlayer(w, { x: 0, z: 0, speed: 0 }, dt, F);
      w.model.position.set(w.x, w.y, w.z); animate(w.model, 0, dt, w.st);
      bodies.push({ ...w, kind: "pe" });
    }
    if (fz.state === "fim") { if (t - fz.t0 > 1.9) setupFalta(); else C.simulate(F, b, [], dt); return; }
    const r = C.simulate(F, b, bodies, dt);
    if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan); }
    if (r.touch && r.touch !== "eu" && fz.state === "voando") fz.touched = fz.touched || r.touch;
    if (fz.state !== "voando") { if (r.touch === "eu" && Math.hypot(b.vx, b.vz) > 0.5) { fz.state = "voando"; fz.t0 = t; } return; }
    const side = C.goalOf(F, b), slow = Math.hypot(b.vx, b.vy, b.vz) < 0.6;
    if (side === "A") { fz.goals++; G.tGoals++; faltaResult("GOOOL!", "#ffd84a", () => { Sound.net(); Sound.cheer(); }); }
    else if (t - fz.t0 > 3.5 || slow || b.x > F.L + 0.5 || Math.abs(b.z) > F.W - 1) {
      const by = fz.touched || "";
      faltaResult(by === "goleiro" ? "Defendeu!" : by.startsWith("barreira") ? "Na barreira!" : "Pra fora!", "#ffffff", () => Sound.ooh());
    }
    return;
  }
  if (G.practiceGoalAt) {
    if (t - G.practiceGoalAt > 2.2) { G.practiceGoalAt = 0; Object.assign(b, C.newBall(F), isCar() ? { x: clamp(me.x - Math.sin(me.yaw) * 12, -F.L + 4, F.L - 4), z: clamp(me.z - Math.cos(me.yaw) * 12, -F.W + 4, F.W - 4) } : { x: me.x + 1.5 * -Math.sin(G.camYaw), z: me.z + 1.5 * -Math.cos(G.camYaw) }); }
    else C.simulate(F, b, [], dt);
    return;
  }
  const r = C.simulate(F, b, bodies, dt);
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan, isCar()); }
  const side = C.goalOf(F, b);
  if (side === "A" || (side && isCar())) { G.tGoals++; G.practiceGoalAt = t; Sound.net(); Sound.cheer(); flashMsg("GOOOL!", `${G.tGoals} gol${G.tGoals === 1 ? "" : "s"} no treino`, 2500, "#ffd84a", true); }
  else if (side === "B") { G.practiceGoalAt = t; Sound.ooh(); flashMsg("Gol contra!", "", 2000, "#ff8a8a"); }
}

// a câmera nunca sai da quadra (senão o alambrado tapa tudo): se o "braço" da câmera passar da parede, ele encolhe
// (a câmera chega mais perto do jogador) e sobe um pouco. Atrás do goleiro, ela pode entrar no gol (como no FIFA).
function keepInside(F, tgt, m = 0.3) {
  const p = cam.position, lz = F.W - m;
  const inMouth = Math.abs(p.z) < F.goalW - 0.25 && !isCar();
  const lx = inMouth ? F.L + F.goalD - 0.2 : F.L - m;
  const dx = p.x - tgt.x, dz = p.z - tgt.z;
  let s = 1;
  if (Math.abs(p.x) > lx && Math.abs(dx) > 1e-6) s = Math.min(s, (Math.sign(p.x) * lx - tgt.x) / dx);
  if (Math.abs(p.z) > lz && Math.abs(dz) > 1e-6) s = Math.min(s, (Math.sign(p.z) * lz - tgt.z) / dz);
  s = clamp(s, 0, 1);
  const over = (1 - s) * Math.hypot(dx, dz);
  p.x = tgt.x + dx * s; p.z = tgt.z + dz * s; p.y += over * 0.9;
  if (inMouth && Math.abs(p.x) > F.L - 0.2) p.y = Math.min(p.y, F.goalH - 0.3); // embaixo do travessão
  return over;
}
function updateCamera(dt) {
  const me = G.me, b = ballMesh.position, F = G.F, tvOn = isCar() ? G.tv : G.view === "tv";
  if (G.meModel) G.meModel.visible = (isCar() || G.view !== "primeira") && !rags.some((r) => r.model === G.meModel); // caído: quem aparece é o boneco de pano
  if (!G.meModel || tvOn) { // câmera de TV: do alto da lateral, seguindo o MEU jogador (com um pouco da bola)
    const fx0 = G.meModel ? lerp(me.x, b.x, 0.25) : b.x, fz0 = G.meModel ? lerp(me.z, b.z, 0.25) : b.z;
    const tx = clamp(fx0, -F.L + 4, F.L - 4), hgt = isCar() ? 22 : 10;
    cam.position.lerp(new THREE.Vector3(tx, hgt, F.W - 0.6), Math.min(1, dt * 4));
    cam.lookAt(tx, 0, fz0 - (isCar() ? 6 : 2.5));
    if (cam.fov !== 58) { cam.fov = 58; cam.updateProjectionMatrix(); }
    if (G.meModel && !isCar()) showAim(me); else aim.visible = false;
    return;
  }
  if (isCar()) { // atrás do carro; com a câmera da bola, a bola fica sempre na tela
    const fov = 75 + (me.boosting ? 6 : 0); if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = lerp(cam.fov, fov, 0.15); cam.updateProjectionMatrix(); }
    let dx = -Math.sin(me.yaw), dz = -Math.cos(me.yaw);
    if (G.ballCam) { const bx = b.x - me.x, bz = b.z - me.z, d = Math.hypot(bx, bz); if (d > 2) { dx = bx / d; dz = bz / d; } }
    G.camCarYaw = angLerp(G.camCarYaw, Math.atan2(-dx, -dz), Math.min(1, dt * 6));
    const fx = -Math.sin(G.camCarYaw), fz = -Math.cos(G.camCarYaw);
    const target = new THREE.Vector3(me.x - fx * 8.5, Math.max(1, me.y + 3.4), me.z - fz * 8.5);
    cam.position.lerp(target, Math.min(1, dt * 10));
    keepInside(F, me, 1);
    if (G.ballCam) cam.lookAt(lerp(me.x, b.x, 0.5), lerp(me.y + 1, b.y, 0.4), lerp(me.z, b.z, 0.5));
    else cam.lookAt(me.x + fx * 6, me.y + 1.2, me.z + fz * 6);
    aim.visible = false; return;
  }
  const yaw = G.camYaw, pitch = G.camPitch, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  if (G.view === "primeira") { // primeira pessoa: os olhos do jogador
    if (cam.fov !== 80) { cam.fov = 80; cam.updateProjectionMatrix(); }
    const low = me.slideT > 0 || me.downT > 0 || me.diveT > 0;
    cam.position.set(me.x + fx * 0.15, me.y + (low ? 0.45 : 1.62), me.z + fz * 0.15);
    cam.lookAt(cam.position.x + fx * Math.cos(pitch), cam.position.y + Math.sin(pitch) - 0.08, cam.position.z + fz * Math.cos(pitch));
    showAim(me); return;
  }
  if (cam.fov !== 70) { cam.fov = 70; cam.updateProjectionMatrix(); }
  const elev = clamp(0.32 - pitch * 0.8, -0.05, 1.1), dist = 4.6;
  const tgt = new THREE.Vector3(me.x, me.y + 1.5, me.z);
  cam.position.set(tgt.x - fx * dist * Math.cos(elev), Math.max(0.35, tgt.y + dist * Math.sin(elev)), tgt.z - fz * dist * Math.cos(elev));
  // encostado na parede (goleiro, escanteio): a câmera chega perto e olha mais para o jogador, para ele não sumir da tela
  const over = keepInside(F, tgt), w = clamp(over / 4.6, 0, 0.8);
  cam.lookAt(lerp(tgt.x + fx * 6, me.x, w), lerp(tgt.y + pitch * 6 - 0.3, me.y + 0.6, w), lerp(tgt.z + fz * 6, me.z, w));
  showAim(me);
}
function showAim(me) {
  let ay = aimYaw();
  if (charge && charge.kind === "chute" && !isCar()) ay = C.assistShot(me, ay, myAttackTeam() || "A", G.F); // a seta já mostra a ajudinha
  aim.visible = true; aim.position.set(me.x - Math.sin(ay) * 1.1, 0.03, me.z - Math.cos(ay) * 1.1); aim.rotation.z = ay + Math.PI / 2;
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
    setH("hTop", G.falta ? `<div class="clock" style="font-size:16px">🎯 FALTAS · ${G.falta.goals} gol${G.falta.goals === 1 ? "" : "s"} em ${G.falta.n}</div>`
      : `<div class="clock" style="font-size:16px">${isCar() ? "🏎️" : "🧤"} TREINO · ${G.tGoals} gol${G.tGoals === 1 ? "" : "s"}${isCar() ? "" : ` · ${G.tKicks} chute${G.tKicks === 1 ? "" : "s"}`}</div>`);
    setH("hPing", isCar() ? "C = câmera da bola · V = câmera de TV · Esc = menu" : "C = troca a câmera · Esc = menu");
    if (t > msgT) setH("hMsg", "");
  }
  $("hPow").classList.toggle("hidden", !charge); $("hPowL").classList.toggle("hidden", !charge);
  if (charge) { $("hPow").firstElementChild.style.width = Math.round(powerOf(charge) * 100) + "%"; setH("hPowL", { chute: "Chute", passe: "Passe", cavadinha: "Cavadinha" }[charge.kind]); }
  $("hSta").classList.toggle("hidden", !G.meModel);
  if (G.meModel) {
    setH("hStaL", isCar() ? `Turbo · ${Math.round(Math.hypot(me.vx, me.vz) * 3.6)} km/h` : "Fôlego");
    const bar = $("hSta").querySelector("i"); bar.style.width = Math.round((isCar() ? me.boost / 100 : me.stamina) * 100) + "%"; bar.style.background = isCar() ? "#ffb300" : "#7fe3ff";
  }
  setH("hHint", !G.meModel ? "Assistindo · Tab: placar" : isCar() ? "W/S acelerar · A/D virar · Shift turbo<br>Espaço pular (2x: mortal) · Q derrapar · C câmera da bola"
    : "Setas: mirar · K/clique chute · J/direito passe · L cavadinha<br>Rodinha: carrinho · Shift pique · Espaço pular · C troca a câmera");
  G.feed = G.feed.filter((f) => t - f.at < 8);
  setH("hFeed", G.feed.map((f) => `<div>${f.html}</div>`).join(""));
  $("cross").classList.add("hidden");
}
function scoreTable() {
  if (G.mode === "treino") return `<p>Gols: <b>${G.tGoals}</b>${isCar() ? "" : ` · Chutes: <b>${G.tKicks}</b>`}</p>`;
  if (!S || !S.match) return "";
  const m = S.match;
  const rows = ["A", "B"].flatMap((tm) => S.players.filter((p) => p.team === tm).sort((a, b) => b.goals - a.goals))
    .map((p) => `<tr class="${ME && p.id === ME.id ? "me" : ""}"><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${kitCss(S.kits[p.team])};margin-right:6px"></i>${p.gk ? "🧤 " : ""}${h(p.name)} <span class="muted">${isCar() ? h(C.CARS[p.car].name) : "#" + p.num}</span></td><td class="n">${p.goals}</td><td class="n">${p.assists}</td><td class="n">${isCar() ? "—" : p.gk ? p.saves : p.shots}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>${h(kitOf(S.kits.A).name)} ${m.score.A}</span><span>${m.score.B} ${h(kitOf(S.kits.B).name)}</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Gols</th><th class="n">Assist.</th><th class="n">Chutes/defesas</th><th class="n">Ping</th></tr>${rows}</table>`;
}
function renderPauseSb() { $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div><div style="margin-top:12px">${keysHelp(G.game)}</div>` : ""; $("pauseHint").textContent = G.mode === "treino" ? "Treino: só você vê." : ""; }
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
if (location.hash === "#debug") window.__pelada = { scene, G, cam, ballS, local, keys, addRag, rags }; // para testes
