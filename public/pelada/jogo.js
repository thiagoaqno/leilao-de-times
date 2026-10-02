// Pelada da Galera — o jogo no navegador: menus, 3D (Three.js), jogador a pé ou carro, bola, sons e rede.
// Eu mexo o meu jogador/carro aqui e mando a posição ~30x por segundo. O servidor manda UM pacote 20x por segundo
// com a bola e todo mundo; os outros aparecem 100 ms "no passado", interpolados. A bola é PREVISTA a partir do último
// pacote (rodando a mesma física de campo.js) e a diferença é corrigida aos poucos.
import * as THREE from "three";
import { Ragdoll } from "/ragdoll.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

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
const FL = { sprint: 1, charge: 2, slide: 4, dive: 8, flip: 16, down: 32, boost: 64, grab: 128, deke: 256, estrela: 512, cogumelo: 1024 }; // deke: drible com giro (Strikers) // grab: segurando alguém
// contra bots: velocidade (fração da sua), tempo de reação (s), erro na mira (rad) e vontade de dar carrinho
const BOT_DIF = {
  facil: { nome: "Fácil", vel: 0.8, reac: 0.5, erro: 0.18, carrinho: 0.2 },
  medio: { nome: "Médio", vel: 0.9, reac: 0.3, erro: 0.1, carrinho: 0.45 },
  dificil: { nome: "Difícil", vel: 0.98, reac: 0.16, erro: 0.05, carrinho: 0.8 },
};
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
for (const id of FIXO === "carros" ? ["btnPractice", "btnFalta", "btnBots"] : ["btnPracticeCar"]) document.getElementById(id).classList.add("hidden");
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
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("pelada:skin"), config: { ...(store.get("pelada:cfg") || {}), mode: FIXO } }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pelada:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("pelada:skin"), id: saved.id, token: saved.token }, enter);
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
  const row = (p) => `<div class="pl ${p.id === (ME && ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}${p.gk && !cars ? ` <span title="Goleiro">🧤</span>` : ""}${!cars && C.SKINS[p.skin] && p.skin !== "padrao" ? ` <span title="${h(C.SKINS[p.skin].name)}">${C.SKINS[p.skin].emoji}</span>` : ""}${cars ? ` <span class="muted" style="font-weight:500;font-size:12px">${h(C.CARS[p.car].name)}</span>` : ""}${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" style="margin-left:auto">✕</button>` : ""}</div>`;
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
  if (mine && !cars) $("myRole").innerHTML += `<label style="margin-top:14px">Sua skin</label><div class="skins">${skinButtons(mine.skin)}</div>`;
  const est = S.config.estilo === "strikers" ? "strikers" : "futsal";
  $("cfgEstilo").innerHTML = estiloButtons(est, "data-estilo", isHost ? "" : "disabled");
  $("cfgEstiloInfo").textContent = ESTILOS[est].info;
  $("cfgArena").innerHTML = Object.entries(C.ARENAS).map(([k, a]) => `<button data-arena="${k}" class="${(S.config.arena || "society") === k ? "on" : ""}" title="${h(a.desc)}" ${isHost ? "" : "disabled"}>${a.emoji} ${h(a.name)}</button>`).join("");
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
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">🎮 <b>Controle:</b> RT acelera, LT ré, analógico vira (e inclina no ar), A pula, B turbo, X derrapa, Y câmera da bola, Start pausa.</p>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Dica: pule e use o turbo no ar para pegar a bola alta. O mortal bate na bola com mais força. Passe pelas almofadas amarelas para encher o turbo.</p>`;
  return `<ul class="keys">
    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> correr · mouse vira a câmera</li><li><kbd>Shift</kbd> pique</li>
    <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> direção do chute/passe</li><li><kbd>K</kbd> ou clique: chute (segure)</li>
    <li><kbd>J</kbd> ou botão direito: passe</li><li><kbd>L</kbd> ou botão do meio: cavadinha</li>
    <li><kbd>U</kbd> cruzamento alto (cai na área)</li>
    <li><kbd>R</kbd> segurado + <kbd>K</kbd>/<kbd>J</kbd>: chute/passe colocado (sai na hora, força máxima)</li>
    <li><kbd>Q</kbd>/<kbd>E</kbd> segurados no chute: efeito (curva)</li>
    <li>Rodinha do mouse: carrinho (só sem a bola)</li><li><kbd>F</kbd> segurar quem está perto (ele corre devagar)</li><li><kbd>Espaço</kbd> pular / cabecear</li>
    <li>Contra bots: <kbd>T</kbd> troca de jogador</li>
    <li>Goleiro: <kbd>Espaço</kbd> + <kbd>A</kbd>/<kbd>D</kbd> se joga</li><li><kbd>C</kbd> câmera: atrás, TV ou 1ª pessoa</li></ul>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">🎮 <b>Controle do Xbox (FIFA clássico):</b> analógico esquerdo corre e mira, o direito mexe a câmera · A passe · B chute · X cruzamento alto (sem a bola: carrinho) · Y cavadinha · <b>RB + B</b> chute colocado e <b>RB + A</b> passe colocado (saem na hora, força máxima) · <b>LB</b> troca de jogador (contra bots) · RT pique · LT segurar · R3 (apertar o analógico direito) pular/cabecear (goleiro: R3 + lado se joga) · View câmera · Menu pausa.</p>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Sem seta apertada, a bola vai para onde o jogador está virado. O passe procura o companheiro mais perto da direção (como no FIFA). Carrinho só sem a bola: derruba quem estiver na frente.</p>`;
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
function setCfg(k, v) { const c = { ...S.config, [k]: v, mode: FIXO }; store.set("pelada:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgMode button").forEach((b) => (b.onclick = () => setCfg("mode", b.dataset.v)));
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgMin button").forEach((b) => (b.onclick = () => setCfg("minutes", +b.dataset.v)));
// skins e quadras: os botões são desenhados de novo a cada mudança, então o clique é tratado aqui, num lugar só
const skinButtons = (atual) => Object.entries(C.SKINS).map(([k, sk]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${sk.emoji}</i>${h(sk.name)}</button>`).join("");
const ESTILOS = { futsal: { nome: "⚽ Futsal", info: "" }, strikers: { nome: "⚡ Strikers", info: "Arcade: campo maior com cerca elétrica (dá choque), posse firme (só o carrinho tira), sem fôlego, drible com giro (Espaço com a bola), itens e o Super Chute. Sempre no Estádio Elétrico." } };
const estiloButtons = (atual, attr, dis = "") => Object.entries(ESTILOS).map(([k, e]) => `<button ${attr}="${k}" class="${atual === k ? "on" : ""}" ${dis}>${e.nome}</button>`).join("");
function renderHomePicks() {
  $("hSkins").innerHTML = skinButtons(store.get("pelada:skin"));
  const a = store.get("pelada:arena") || "society";
  const est = store.get("pelada:estilo") === "strikers" ? "strikers" : "futsal";
  $("hEstilo").innerHTML = estiloButtons(est, "data-estilo-treino");
  $("hArena").innerHTML = Object.entries(C.ARENAS).map(([k, ar]) => `<button data-arena-treino="${k}" class="${a === k ? "on" : ""}" title="${h(ar.desc)}">${ar.emoji} ${h(ar.name)}</button>`).join("");
  const n = store.get("pelada:botSize") || 3, d = BOT_DIF[store.get("pelada:botDif")] ? store.get("pelada:botDif") : "medio";
  $("hBotSize").innerHTML = [1, 2, 3, 4, 5].map((k) => `<button data-botsize="${k}" class="${n === k ? "on" : ""}">${k}x${k}</button>`).join("");
  $("hBotDif").innerHTML = Object.entries(BOT_DIF).map(([k, v]) => `<button data-botdif="${k}" class="${d === k ? "on" : ""}">${v.nome}</button>`).join("");
}
function escolherSkin(id) {
  if (!C.SKINS[id]) return;
  store.set("pelada:skin", id);
  if (ME && ME.id && S) act("skin", { skin: id }); // na sala: o servidor avisa todo mundo e cada um troca o boneco
  if (G.active && offline() && G.meModel && !isCar()) mudarSkinJogador(G.meModel, id); // no treino (e contra bots) troca na hora
  renderHomePicks(); if (G.active) renderPauseSb();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.skin) escolherSkin(b.dataset.skin);
  else if (b.dataset.arenaTreino) { store.set("pelada:arena", b.dataset.arenaTreino); renderHomePicks(); }
  else if (b.dataset.estiloTreino) { store.set("pelada:estilo", b.dataset.estiloTreino); renderHomePicks(); }
  else if (b.dataset.estilo && S) setCfg("estilo", b.dataset.estilo);
  else if (b.dataset.botsize) { store.set("pelada:botSize", +b.dataset.botsize); renderHomePicks(); }
  else if (b.dataset.botdif) { store.set("pelada:botDif", b.dataset.botdif); renderHomePicks(); }
  else if (b.dataset.arena && S) setCfg("arena", b.dataset.arena);
});
if (FIXO === "carros") document.querySelectorAll(".soPe").forEach((e) => e.classList.add("hidden"));
else renderHomePicks();
$("btnPractice").onclick = () => startGame("treino", "pes");
$("btnBots").onclick = () => startGame("bots", "pes");
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
    item() { [660, 880, 1320].forEach((f, i) => tone({ f0: f, dur: 0.09, gain: 0.08, type: "square", at: i * 0.06 })); },
    lanca() { burst({ dur: 0.2, f0: 600, f1: 2400, gain: 0.18, type: "bandpass", q: 1.2 }); },
    boom() { tone({ f0: 90, f1: 35, dur: 0.6, gain: 0.5 }); burst({ dur: 0.7, f0: 1800, f1: 120, gain: 0.55 }); },
    choque() { tone({ f0: 140, f1: 70, dur: 0.35, gain: 0.22, type: "sawtooth" }); tone({ f0: 290, f1: 150, dur: 0.3, gain: 0.1, type: "square" }); burst({ dur: 0.32, f0: 5000, f1: 1600, gain: 0.28, type: "highpass" }); },
    deke() { burst({ dur: 0.25, f0: 900, f1: 3000, gain: 0.16, type: "bandpass", q: 1.5 }); },
    puxao() { burst({ dur: 0.16, f0: 1600, f1: 500, gain: 0.22, type: "bandpass", q: 1.4 }); }, // camisa sendo puxada
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
// céu: uma esfera com degradê (as cores mudam com a quadra; no ginásio fica escondida)
const skyGeo = new THREE.SphereGeometry(600, 32, 16);
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
scene.add(sky);
function pintarCeu([topC, midC, lowC]) {
  const pos = skyGeo.attributes.position, col = [], top = new THREE.Color(topC), mid = new THREE.Color(midC), low = new THREE.Color(lowC);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 600, c = y > 0.08 ? mid.clone().lerp(top, Math.min(1, (y - 0.08) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.13, 0, 1)); col.push(c.r, c.g, c.b); }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
}
const hemiL = new THREE.HemisphereLight(0xd8e8ff, 0x4a6a3a, 1.4); scene.add(hemiL);
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

// ======================================================================
// Quadras (arenas): o tamanho e a física são os mesmos; muda o visual. O organizador escolhe na sala (config.arena)
// e todo mundo monta a mesma; no treino vale a escolha da tela inicial. O Rocket usa sempre a "society".
// Texturas: cada piso é desenhado num canvas; se a foto existir (ex.: public/pelada/texturas/madeira.jpg), ela é
// usada como base do desenho (as linhas continuam por cima).
// ======================================================================
const ARENAS_CONFIG = {
  society: { // a quadra de sempre: grama sintética no fim de tarde, alambrado e torcida de um lado
    piso: { textura: "/pelada/texturas/grama.jpg", metrosFoto: 2, tipo: "grama", roughness: 0.95, metalness: 0, linhas: "#f4f4f0" },
    ambiente: { ceu: 0xd8e8ff, chao: 0x4a6a3a, intensidade: 1.4 },
    luz: { tipo: "sol", cor: 0xfff0d8, intensidade: 2.4, pos: [-18, 34, 22] },
    fundo: { tipo: "ceu", cores: [0x3a6fb8, 0x9fc6ea, 0xf4d6a8], neblina: 0xcfdde8, longe: 260 },
    paredes: "alambrado", muretas: "propaganda", refletores: "torres", arquibancada: "torcida",
  },
  rio: { // quadra de rua: cimento pintado, mureta de tijolo grafitada, sol forte e o morro cheio de casinhas
    piso: { textura: "/pelada/texturas/cimento.jpg", metrosFoto: 3, tipo: "cimento", roughness: 0.82, metalness: 0, linhas: "#fff6c2" },
    ambiente: { ceu: 0xcfe8ff, chao: 0xb08a5a, intensidade: 1.2 },
    luz: { tipo: "sol", cor: 0xfff2d6, intensidade: 3.6, pos: [-10, 40, 14] },
    fundo: { tipo: "ceu", cores: [0x1f7fe0, 0x8fd3ff, 0xffe6b8], neblina: 0xbfe2ff, longe: 420 },
    paredes: "alambrado", muretas: "tijolo", refletores: "nenhum", arquibancada: "morro",
  },
  ginasio: { // liga profissional: taco de madeira que reflete, refletores no teto, paredes fechadas e arquibancada escura
    piso: { textura: "/pelada/texturas/madeira.jpg", metrosFoto: 1.5, tipo: "madeira", roughness: 0.22, metalness: 0, linhas: "#ffffff" }, // liso: brilha com a luz do teto
    ambiente: { ceu: 0x9aa3b5, chao: 0x3a2a1a, intensidade: 0.85 },
    luz: { tipo: "refletores", cor: 0xfff6e8, intensidade: 2.1, pos: [0, 40, 1] },
    fundo: { tipo: "cor", cor: 0x0c0e13, neblina: 0x0c0e13, longe: 200 },
    paredes: "fechadas", muretas: "acolchoadas", refletores: "teto", arquibancada: "escura",
  },
  eletrico: { // Strikers: estádio noturno, gramado escuro com linhas neon e a cerca elétrica em volta (dá choque)
    piso: { tipo: "neon", roughness: 0.9, metalness: 0, linhas: "#7ff7ff", brilho: true },
    ambiente: { ceu: 0x8a7cff, chao: 0x0d2a24, intensidade: 1.05 },
    luz: { tipo: "refletores", cor: 0xe8f0ff, intensidade: 2.3, pos: [-12, 40, 16] },
    fundo: { tipo: "ceu", cores: [0x05061a, 0x241046, 0x5a2266], neblina: 0x120a2a, longe: 240 },
    paredes: "eletrica", muretas: "neon", refletores: "torres", arquibancada: "escura",
  },
};
// solta da memória tudo o que um pedaço da cena criou (geometrias, materiais e texturas)
function liberar(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap"]) m[k]?.dispose?.();
      m.dispose();
    }
    if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
  });
}
// foto de textura (só baixa uma vez; se não existir, a promessa falha e fica o desenho)
const fotos = {};
const foto = (url) => (fotos[url] ||= new Promise((ok, erro) => { const img = new Image(); img.onload = () => ok(img); img.onerror = erro; img.src = url; }));

let goalSigns = [];
let arena = null, arenaMode = null, arenaKits = null, arenaId = null, pads = [];
function arenaEscolhida(mode) {
  if (mode === "carros") return "ginasio"; // o Rocket é sempre no ginásio (com a arena arredondada, buildArenaRocket)
  if (G.F && G.F.strikers) return "eletrico"; // o Strikers é sempre no estádio elétrico
  const id = offline() ? store.get("pelada:arena") : S && S.config.arena;
  return ARENAS_CONFIG[id] ? id : "society";
}
// a cerca elétrica treme: a cada quadro os raios pulam para outro lugar e piscam
function animarArena(t) {
  const raios = arena && arena.userData.raios; if (!raios || !raios.length) return;
  for (const m of raios) { m.map.offset.x = Math.random(); m.map.offset.y = (Math.random() - 0.5) * 0.08; m.opacity = 0.55 + Math.random() * 0.45; }
}
function ensureArena(mode) {
  const kits = S ? `${S.kits.A}|${S.kits.B}` : "", id = arenaEscolhida(mode);
  if (arenaMode === mode && arenaId === id && (mode !== "carros" || arenaKits === kits)) return;
  arenaMode = mode; arenaKits = kits; carregarArena(id, mode);
}
// monta a quadra pedida: tira a anterior (e libera a memória), troca luzes, céu e neblina, e monta a nova
function carregarArena(id, mode = arenaMode || "pes") {
  id = ARENAS_CONFIG[id] ? id : "society";
  const cfg = ARENAS_CONFIG[id], F = mode === "carros" ? C.MODES.carros : G.F, s = F.L / 20;
  if (arena) { scene.remove(arena); liberar(arena); arena = null; }
  arenaId = id;
  // luz ambiente e luz principal (sol ou a luz geral do teto, que faz as sombras)
  hemiL.color.setHex(cfg.ambiente.ceu); hemiL.groundColor.setHex(cfg.ambiente.chao); hemiL.intensity = cfg.ambiente.intensidade;
  const [lx, ly, lz] = cfg.luz.pos;
  sunL.color.setHex(cfg.luz.cor); sunL.intensity = cfg.luz.intensidade;
  sunL.position.set(lx * s, ly * s, lz * s); sunL.target.position.set(0, 0, 0);
  Object.assign(sunL.shadow.camera, { left: -F.L - 10, right: F.L + 10, top: F.W + 10, bottom: -F.W - 10, near: 1, far: 140 * s }); sunL.shadow.camera.updateProjectionMatrix();
  // fundo: céu aberto (degradê) ou cor fechada (ginásio)
  if (cfg.fundo.tipo === "ceu") { pintarCeu(cfg.fundo.cores); sky.visible = true; scene.background = null; }
  else { sky.visible = false; scene.background = new THREE.Color(cfg.fundo.cor); }
  scene.fog.color.setHex(cfg.fundo.neblina); scene.fog.near = 80 * s; scene.fog.far = cfg.fundo.longe * s;
  arena = buildArena(F, cfg); scene.add(arena);
  ballMesh.scale.setScalar(F.ballR); blob.scale.setScalar(F.ballR / 0.15);
  ballMesh.material.map = mode === "carros" ? beachTex : ballTex; ballMesh.material.roughness = mode === "carros" ? 0.3 : 0.45; ballMesh.material.needsUpdate = true;
}
const tons = (r, lista) => lista[Math.floor(r() * lista.length)];
function buildArena(F, cfg) {
  if (F.rc) return buildArenaRocket(F);
  const grp = new THREE.Group(), L = F.L, W = F.W, cars = F.id === "carros", PX = cars ? 25 : 50, P = cfg.piso;
  const add = (o) => (grp.add(o), o);
  // chão em volta da quadra (cimento, asfalto da rua ou o piso escuro do ginásio)
  const outCol = { grama: "#8d8f8a", cimento: "#6f675d", madeira: "#26282d" }[P.tipo];
  const out = add(new THREE.Mesh(new THREE.PlaneGeometry(L * 7, W * 9), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = outCol; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? "#0000000c" : "#ffffff0c"; x.fillRect(r() * w, r() * hh, 2, 2); } }, true), roughness: 1 })));
  out.material.map.repeat.set(L, W); out.rotation.x = -Math.PI / 2; out.position.y = -0.05; out.receiveShadow = true;
  // a quadra: base (grama, cimento pintado ou taco) e as linhas por cima
  const X = (v) => (v + L + 1) * PX, Z = (v) => (v + W + 1) * PX;
  const base = (x, w, hh, r) => {
    if (P.tipo === "grama") {
      const step = cars ? 4 : 2;
      for (let i = 0; i < 2 * L + 2; i += step) { x.fillStyle = (i / step) % 2 ? "#2f8f48" : "#2a8141"; x.fillRect(i * PX, 0, step * PX, hh); }
      if (cars && S) for (const [t, x0] of [["A", 0], ["B", X(0)]]) { x.globalAlpha = 0.14; x.fillStyle = C.kitColor(S.kits[t]); x.fillRect(x0, 0, w / 2, hh); x.globalAlpha = 1; }
      for (let i = 0; i < w * hh / 120; i++) { x.fillStyle = r() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(r() * w, r() * hh, 2, 3); }
    } else if (P.tipo === "neon") { // gramado escuro em faixas, com um desenho de hexágonos bem de leve
      for (let i = 0; i < 2 * L + 2; i += 3) { x.fillStyle = (i / 3) % 2 ? "#0f3b2f" : "#0c3328"; x.fillRect(i * PX, 0, 3 * PX, hh); }
      x.strokeStyle = "#7ff7ff10"; x.lineWidth = 2; const hx = 1.2 * PX;
      for (let row = 0; row * hx * 0.87 < hh; row++) for (let col = 0; col * hx * 1.5 < w + hx; col++) {
        const cx = col * hx * 1.5, cy = row * hx * 1.74 + (col % 2) * hx * 0.87; x.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; x.lineTo(cx + Math.cos(a) * hx, cy + Math.sin(a) * hx); } x.closePath(); x.stroke();
      }
      for (const sg of [-1, 1]) { const g = x.createRadialGradient(X(sg * L), Z(0), 0, X(sg * L), Z(0), F.areaR * PX); g.addColorStop(0, "#7ff7ff22"); g.addColorStop(1, "#7ff7ff00"); x.fillStyle = g; x.beginPath(); x.arc(X(sg * L), Z(0), F.areaR * PX, 0, 7); x.fill(); }
    } else if (P.tipo === "cimento") {
      x.fillStyle = "#cf5a3a"; x.fillRect(0, 0, w, hh); // faixa de fora: vermelho-terra
      x.fillStyle = "#2b6cb0"; x.fillRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX); // quadra azul
      x.fillStyle = "#3d8f4a"; for (const sg of [-1, 1]) { x.beginPath(); x.arc(X(sg * L), Z(0), F.areaR * PX, 0, 7); x.fill(); } // áreas verdes
      for (let i = 0; i < w * hh / 90; i++) { x.fillStyle = r() < 0.5 ? "#00000016" : "#ffffff14"; x.fillRect(r() * w, r() * hh, 2, 2); }
      for (let i = 0; i < 25; i++) { x.globalAlpha = 0.025 + r() * 0.035; x.fillStyle = "#ffffff"; x.beginPath(); x.arc(r() * w, r() * hh, (0.5 + r() * 2) * PX, 0, 7); x.fill(); } // tinta gasta
      x.globalAlpha = 1; x.strokeStyle = "#0000003a"; x.lineWidth = 2;
      for (let i = 0; i < 45; i++) { let px = r() * w, py = r() * hh; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * PX * 1.6; py += (r() - 0.5) * PX * 1.6; x.lineTo(px, py); } x.stroke(); } // rachaduras
    } else { // taco de madeira: réguas em fileiras, cada uma de um tom
      const ph = Math.max(4, Math.round(0.14 * PX));
      for (let y = 0, row = 0; y < hh; y += ph, row++) {
        let x0 = -r() * PX;
        while (x0 < w) {
          const len = (0.8 + r() * 1.2) * PX, k = r();
          x.fillStyle = `rgb(${Math.round(190 + k * 30)},${Math.round(130 + k * 30)},${Math.round(78 + k * 20)})`; x.fillRect(x0, y, len, ph);
          x.fillStyle = "#00000014"; for (let g = 0; g < 3; g++) x.fillRect(x0 + r() * len, y + r() * ph, len * 0.3, 1);
          x.fillStyle = "#3b220f55"; x.fillRect(x0, y, 1, ph); x0 += len;
        }
        x.fillStyle = "#3b220f40"; x.fillRect(0, y, w, 1);
      }
      x.fillStyle = "#7a1f1fd0"; // faixa de fora vinho, como nas ligas
      x.fillRect(0, 0, w, Z(-W)); x.fillRect(0, Z(W), w, hh - Z(W)); x.fillRect(0, 0, X(-L), hh); x.fillRect(X(L), 0, w - X(L), hh);
      x.fillStyle = "#1d4f91b0"; for (const sg of [-1, 1]) { x.beginPath(); if (sg < 0) x.arc(X(-L), Z(0), F.areaR * PX, -Math.PI / 2, Math.PI / 2); else x.arc(X(L), Z(0), F.areaR * PX, Math.PI / 2, 1.5 * Math.PI); x.fill(); }
      x.fillStyle = "#b3262670"; x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.fill();
      // as "poças" de luz dos refletores do teto, pintadas no próprio piso (luz de verdade pesava demais)
      x.globalCompositeOperation = "lighter";
      for (const sx of [-0.62, 0, 0.62]) for (const sz of [-1, 1]) {
        const cx = X(sx * L * 0.8), cz = Z(sz * W * 0.55 * 0.35), rr = 6.5 * PX, g = x.createRadialGradient(cx, cz, 0, cx, cz, rr);
        g.addColorStop(0, "rgba(120,105,80,0.75)"); g.addColorStop(0.6, "rgba(80,70,52,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - rr, cz - rr, 2 * rr, 2 * rr);
      }
      x.globalCompositeOperation = "source-over";
    }
  };
  const lines = (x) => {
    x.strokeStyle = P.linhas; x.lineWidth = (cars ? 0.25 : 0.08) * PX; x.fillStyle = P.linhas;
    if (P.brilho) { x.shadowColor = P.linhas; x.shadowBlur = 0.25 * PX; x.lineWidth = 0.1 * PX; } // linhas neon (brilham)
    x.strokeRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX);
    x.beginPath(); x.moveTo(X(0), Z(-W)); x.lineTo(X(0), Z(W)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), (cars ? 0.6 : 0.15) * PX, 0, 7); x.fill();
    for (const sg of [-1, 1]) {
      const gx = X(sg * L), r6 = F.areaR * PX;
      x.beginPath(); // área: semicírculo em volta do gol (é onde o goleiro pega com a mão)
      if (sg < 0) x.arc(gx, Z(0), r6, -Math.PI / 2, Math.PI / 2); else x.arc(gx, Z(0), r6, Math.PI / 2, 1.5 * Math.PI);
      x.stroke();
      if (!cars) { x.beginPath(); x.arc(X(sg * (L - 6)), Z(0), 0.12 * PX, 0, 7); x.fill(); x.beginPath(); x.arc(X(sg * (L - 10)), Z(0), 0.12 * PX, 0, 7); x.fill(); }
    }
  };
  const pisoTex = canvasTex((2 * L + 2) * PX, (2 * W + 2) * PX, (x, w, hh, r) => { base(x, w, hh, r); lines(x); });
  const field = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 2, 2 * W + 2), new THREE.MeshStandardMaterial({ map: pisoTex, roughness: P.roughness, metalness: P.metalness })));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true;
  if (P.textura && !cars) foto(P.textura).then((img) => { // tem a foto: ela vira a base, e as linhas vão por cima
    const cv = pisoTex.image, x = cv.getContext("2d"), pat = x.createPattern(img, "repeat");
    pat.setTransform(new DOMMatrix().scale((P.metrosFoto * PX) / img.width));
    x.fillStyle = pat; x.fillRect(0, 0, cv.width, cv.height); lines(x); pisoTex.needsUpdate = true;
  }).catch(() => {});
  // muretas em volta (placas de propaganda, tijolo grafitado ou parede acolchoada)
  const BH = cars ? 2.2 : 1.0, BT = 0.15;
  let muretaTex, lado = 0x333333, topo = 0x222222;
  if (cfg.muretas === "tijolo") {
    lado = 0x8f8a82; topo = 0x9c968c;
    muretaTex = canvasTex(1024, 64, (x, w, hh, r) => {
      x.fillStyle = "#d8ccb6"; x.fillRect(0, 0, w, hh);
      for (let row = 0; row < 4; row++) for (let i = -1; i < w / 40 + 1; i++) { x.fillStyle = tons(r, ["#a4553a", "#b8643f", "#8f4a33", "#9d5a3c"]); x.fillRect(i * 40 + (row % 2) * 20 + 2, row * 16 + 2, 36, 12); }
      x.fillStyle = "#c9c2b5"; x.fillRect(560, 0, 180, hh); // pedaço rebocado
      const graf = [["VILA DA GALERA", "#ff3d7f"], ["PELADA ⚽", "#2ee6a6"], ["RJ", "#ffd84a"], ["GALERA", "#3ab0ff"]];
      graf.forEach(([t, c], i) => { x.save(); x.translate(110 + i * 250, 34); x.rotate((r() - 0.5) * 0.15); x.font = "900 30px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 6; x.strokeStyle = "#111"; x.strokeText(t, 0, 0); x.fillStyle = c; x.fillText(t, 0, 0); x.restore(); for (let d = 0; d < 4; d++) { x.fillStyle = c; x.fillRect(80 + i * 250 + r() * 60, 44, 2, 6 + r() * 12); } });
    }, true);
  } else if (cfg.muretas === "neon") {
    lado = 0x0a0d1f; topo = 0x10163a;
    muretaTex = canvasTex(1024, 64, (x, w, hh) => {
      x.fillStyle = "#0b0f26"; x.fillRect(0, 0, w, hh); x.fillStyle = "#7ff7ff"; x.shadowColor = "#7ff7ff"; x.shadowBlur = 8; x.fillRect(0, 4, w, 3); x.fillRect(0, hh - 7, w, 3);
      x.font = "900 26px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffe14a"; x.shadowColor = "#ffb000";
      for (let i = 0; i < 2; i++) x.fillText("⚡ STRIKERS DA GALERA ⚡", w / 4 + i * w / 2, hh / 2 + 1);
    }, true);
  } else if (cfg.muretas === "acolchoadas") {
    lado = 0x0f2550; topo = 0x0b1a38;
    muretaTex = canvasTex(1024, 64, (x, w, hh) => {
      x.fillStyle = "#163a7a"; x.fillRect(0, 0, w, hh); x.fillStyle = "#0e2a5e"; for (let i = 0; i < w; i += 64) x.fillRect(i, 0, 3, hh);
      x.fillStyle = "#ffd84a"; x.fillRect(0, hh - 6, w, 6);
      x.font = "bold 30px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffffff";
      for (let i = 0; i < 2; i++) x.fillText("GINÁSIO DA GALERA ⚽", w / 4 + i * w / 2, hh / 2 - 2);
    }, true);
  } else {
    const ads = ["PELADA DA GALERA", "⚽ VILA DA GALERA", "LEILÃO DA GALERA", "BAR DA SINUCA", "CORRIDA DA GALERA", "TIRO DA GALERA"];
    const adCols = [["#0d47a1", "#ffd84a"], ["#b71c1c", "#ffffff"], ["#1b5e20", "#ffffff"], ["#212121", "#ffd84a"], ["#e65100", "#ffffff"], ["#4a148c", "#ffffff"]];
    muretaTex = canvasTex(2048, 64, (x, w, hh) => { const seg = w / 6; ads.forEach((t, i) => { const [bg, fg] = adCols[i]; x.fillStyle = bg; x.fillRect(i * seg, 0, seg, hh); x.fillStyle = fg; x.font = "bold 34px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, i * seg + seg / 2, hh / 2 + 2); }); }, true);
  }
  const texLen = cfg.muretas === "propaganda" ? 24 : 16;
  const board = (len, x0, z0, rotY) => {
    const t = muretaTex.clone(); t.repeat.set(len / (texLen * BH), 1); t.needsUpdate = true;
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(len, BH, BT), [M(lado), M(lado), M(topo), M(topo), new THREE.MeshStandardMaterial({ map: t, roughness: cfg.muretas === "acolchoadas" ? 0.45 : 0.8 }), M(lado)]));
    m.position.set(x0, BH / 2, z0); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true;
  };
  board(2 * L + 2 * BT, 0, -W - BT / 2, 0); board(2 * L + 2 * BT, 0, W + BT / 2, Math.PI);
  for (const sg of [-1, 1]) for (const zs of [-1, 1]) { const len = W - F.goalW - 0.1; board(len, sg * (L + BT / 2), zs * (F.goalW + 0.1 + len / 2), sg < 0 ? Math.PI / 2 : -Math.PI / 2); }
  muretaTex.dispose(); // os clones têm a própria cópia
  // em cima da mureta: alambrado aberto (tela em losango) ou, no ginásio, vidro (quadra fechada)
  const FH = F.wallH, glass = cfg.paredes === "fechadas", eletrica = cfg.paredes === "eletrica";
  // cerca elétrica: raios desenhados num canvas (somados por cima, brilhando); a textura "pula" a cada quadro (animarArena)
  const raioTex = eletrica ? canvasTex(256, 64, (x, w, hh, r) => {
    for (const [cor, lw] of [["#2fd8ff", 5], ["#e8ffff", 1.6]]) for (let k = 0; k < 4; k++) {
      x.strokeStyle = cor; x.lineWidth = lw; x.globalAlpha = lw > 2 ? 0.35 : 0.9; x.beginPath(); let y = hh * (0.15 + k * 0.23); x.moveTo(0, y);
      for (let px = 0; px <= w; px += 8) { y = clamp(y + (r() - 0.5) * 14, 4, hh - 4); x.lineTo(px, y); } x.stroke();
    }
    x.globalAlpha = 1;
  }, true) : null;
  grp.userData.raios = [];
  const fenceTex = glass || eletrica ? null : canvasTex(64, 64, (x, w) => { x.strokeStyle = "#d8dde0"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, w / 2); x.lineTo(w / 2, 0); x.lineTo(w, w / 2); x.lineTo(w / 2, w); x.closePath(); x.stroke(); }, true);
  const cell = cars ? 1 : 0.5;
  const fence = (lw, lh, x0, y0, z0, rotY) => {
    let mat;
    if (glass) mat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }); // vidro simples (sem calcular luz)
    else if (eletrica) { const t = raioTex.clone(); t.repeat.set(lw / 6, 1); t.needsUpdate = true; mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }); grp.userData.raios.push(mat); }
    else { const t = fenceTex.clone(); t.repeat.set(lw / cell, lh / cell); t.needsUpdate = true; mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }); }
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), mat)); m.position.set(x0, y0 + lh / 2, z0); m.rotation.y = rotY;
  };
  fence(2 * L, FH - BH, 0, BH, -W - 0.05, 0); fence(2 * L, FH - BH, 0, BH, W + 0.05, 0);
  for (const sg of [-1, 1]) { fence(2 * W, FH - F.goalH - 0.4, sg * (L + F.goalD + 0.05), F.goalH + 0.4, 0, Math.PI / 2); for (const zs of [-1, 1]) { const lw = W - F.goalW; fence(lw, FH - BH, sg * (L + 0.05), BH, zs * (F.goalW + lw / 2), Math.PI / 2); } }
  fenceTex?.dispose(); raioTex?.dispose();
  const pole = eletrica ? new THREE.MeshBasicMaterial({ color: 0x7ff7ff, toneMapped: false }) : M(glass ? 0xc9cdd2 : 0x4a4f55, { metalness: glass ? 0.15 : 0.6, roughness: 0.4 }), gap = cars ? 8 : 5, pr = cars ? 0.12 : glass ? 0.04 : 0.06;
  for (let x0 = -L; x0 <= L + 0.01; x0 += gap) for (const zs of [-1, 1]) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, FH, 8), pole)); m.position.set(x0, FH / 2, zs * (W + 0.1)); m.castShadow = true; }
  // refletores
  if (cfg.refletores === "torres") for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // torres nos cantos
    const g = add(new THREE.Group()); g.position.set(sx * (L + 4), 0, sz * (W + 4));
    const hp = cars ? 26 : 16;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, hp, 8), pole); m.position.y = hp / 2; m.castShadow = true; g.add(m);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), M(0x2b2f33)); box.position.y = hp + 0.4; box.lookAt(-sx * 40, 0, -sz * 40); g.add(box);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); l.position.set((i % 3 - 1) * 0.7, (i < 3 ? 0.3 : -0.3), 0.21); box.add(l); }
  }
  if (cfg.refletores === "teto") { // ginásio: treliças no teto e refletores focados na quadra
    // Os refletores são só a peça acesa: a luz deles está pintada no piso. Luz de verdade (SpotLight) encarecia o desenho
    // de TUDO na cena: com 6 delas o ginásio rodava a 1/3 da velocidade das outras quadras.
    const HT = 15, metal = M(0x2a2d33, { metalness: 0.7, roughness: 0.5 });
    for (let x0 = -L - 6; x0 <= L + 6; x0 += 8) { const t = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2 * W + 24), metal)); t.position.set(x0, HT + 1.5, 0); }
    for (const sx of [-0.62, 0, 0.62]) for (const sz of [-1, 1]) {
      const px = sx * L, pz = sz * (W * 0.55);
      const lamp = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.0), M(0x1c1e22))); lamp.position.set(px, HT + 0.3, pz);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ color: 0xfff8e6 })); face.rotation.x = Math.PI / 2; face.position.y = -0.26; lamp.add(face);
    }
    // o prédio: paredes e teto escuros em volta de tudo
    const hall = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 50, HT + 6, 2 * W + 40), new THREE.MeshBasicMaterial({ color: 0x15171d, side: THREE.BackSide }))); // escuro: não precisa calcular luz
    hall.position.y = (HT + 6) / 2 - 0.06;
  }
  // arquibancadas e o que fica em volta
  const crowdTex = (escura) => canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#6d6f72"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = tons(r, ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"]); x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = tons(r, ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"]); x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } if (escura) { x.fillStyle = "#000000a8"; x.fillRect(0, 0, w, hh); } }, true);
  const stands = (zSide, rows, escura) => {
    const tex = crowdTex(escura), sc = cars ? 2 : 1, cor = escura ? 0x2a2c31 : 0x777a7e, cor2 = escura ? 0x34363c : 0x8a8d90;
    for (let i = 0; i < rows; i++) {
      const t = tex.clone(); t.repeat.set(6 * L / 20, 1); t.offset.x = i * 0.37; t.needsUpdate = true;
      const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
      const step = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 6, 0.5 * sc, 1 * sc), [M(cor), M(cor), M(cor2), M(cor), zSide < 0 ? front : M(cor), zSide < 0 ? M(cor) : front]));
      step.position.set(0, (0.25 + i * 0.5 + 0.3) * sc, zSide * (W + 3 * sc + i * sc)); step.castShadow = step.receiveShadow = true;
    }
    tex.dispose();
  };
  if (cfg.arquibancada === "torcida") stands(-1, 6, false);
  if (cfg.arquibancada === "escura") { stands(-1, 8, true); stands(1, 8, true); }
  if (cfg.arquibancada === "morro") morro(add, L, W);
  // gols: traves e rede
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / (cars ? 0.5 : 0.12), lh / (cars ? 0.5 : 0.12)); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = F.postR, GW = F.goalW, GH = F.goalH, GD = F.goalD;
  for (const sg of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.x = sg * L;
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; bar.castShadow = true; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(sg * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(sg * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(sg * GD / 2, GH / 2, z); g.add(side); }
  }
  netTex.dispose();
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

// ======================================================================
// Rocket: ginásio coberto com a arena arredondada (como no Rocket League, sem quina viva: o chão vira parede numa
// curva, a parede vira teto e os cantos são curvos; a física é a mesma, em campo.js: arenaSDF e rampa).
// Piso de taco com a metade de cada time tingida, a rampa de madeira escurecendo até a parede acolchoada na cor do
// time, vidro em cima, faixa de luz em volta, treliças e refletores no teto e arquibancada escura dos dois lados.
// ======================================================================
function rrPontos(hx, hz, r, y, n = 160) { // contorno de um retângulo de cantos redondos (meias-larguras hx, hz; raio r)
  const pts = [], per = 4 * (hx - r) + 4 * (hz - r) + 2 * Math.PI * r;
  const segs = [[hx - r, hz - r, 0], [-(hx - r), hz - r, Math.PI / 2], [-(hx - r), -(hz - r), Math.PI], [hx - r, -(hz - r), 1.5 * Math.PI]];
  for (const [cx, cz, a0] of segs) for (let i = 0; i <= Math.ceil(n * (Math.PI / 2 * r) / per) + 2; i++) { const a = a0 + (i / (Math.ceil(n * (Math.PI / 2 * r) / per) + 2)) * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
  return pts;
}
function buildArenaRocket(F) {
  const grp = new THREE.Group(), L = F.L, W = F.W, H = F.ceil, Rc = F.rc, GW = F.goalW, GH = F.goalH, GD = F.goalD;
  const add = (o) => (grp.add(o), o);
  const kits = S && S.kits ? S.kits : { A: "celeste", B: "laranja" };
  const corA = new THREE.Color(C.kitColor(kits.A)), corB = new THREE.Color(C.kitColor(kits.B));
  // ---- piso de taco (a parte reta) ----
  const PX = 20, X = (v) => (v + L) * PX, Z = (v) => (v + W) * PX;
  const piso = canvasTex(2 * L * PX, 2 * W * PX, (x, w, hh, r) => {
    const ph = 7;
    for (let y = 0; y < hh; y += ph) { let x0 = -r() * 30; while (x0 < w) { const len = 18 + r() * 26, k = r(); x.fillStyle = `rgb(${Math.round(196 + k * 26)},${Math.round(140 + k * 26)},${Math.round(84 + k * 18)})`; x.fillRect(x0, y, len, ph); x.fillStyle = "#3b220f40"; x.fillRect(x0, y, 1, ph); x0 += len; } x.fillStyle = "#3b220f30"; x.fillRect(0, y, w, 1); }
    for (const [cor, x0] of [[corA, 0], [corB, w / 2]]) { x.globalAlpha = 0.16; x.fillStyle = "#" + cor.getHexString(); x.fillRect(x0, 0, w / 2, hh); }
    x.globalAlpha = 1;
    // poças de luz dos refletores pintadas no piso (luz de verdade pesava demais)
    x.globalCompositeOperation = "lighter";
    for (const sx of [-0.6, 0, 0.6]) for (const sz of [-0.45, 0.45]) { const cx = X(sx * L), cz = Z(sz * W), rr = 16 * PX, g = x.createRadialGradient(cx, cz, 0, cx, cz, rr); g.addColorStop(0, "rgba(110,95,70,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - rr, cz - rr, 2 * rr, 2 * rr); }
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = "#ffffffd8"; x.fillStyle = "#ffffffd8"; x.lineWidth = 0.3 * PX;
    x.beginPath(); x.roundRect(X(-L + Rc - 0.6), Z(-W + Rc - 0.6), (2 * (L - Rc) + 1.2) * PX, (2 * (W - Rc) + 1.2) * PX, 2 * PX); x.stroke(); // onde começa a rampa
    x.beginPath(); x.moveTo(X(0), Z(-W + Rc)); x.lineTo(X(0), Z(W - Rc)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), 0.7 * PX, 0, 7); x.fill();
    for (const sg of [-1, 1]) { x.beginPath(); if (sg < 0) x.arc(X(-L), Z(0), F.areaR * PX, -Math.PI / 2, Math.PI / 2); else x.arc(X(L), Z(0), F.areaR * PX, Math.PI / 2, 1.5 * Math.PI); x.stroke(); }
    x.save(); x.translate(X(0), Z(0)); x.font = `900 ${3.2 * PX}px Figtree, Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffffff30"; x.fillText("ROCKET DA GALERA", 0, F.circle * PX + 3 * PX); x.restore();
  });
  const field = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * W), new THREE.MeshStandardMaterial({ map: piso, roughness: 0.25, metalness: 0 })));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true;
  // dentro dos gols: o mesmo taco, escurecido
  for (const sg of [-1, 1]) { const g = add(new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), M(0x5a3d22, { roughness: 0.5 }))); g.rotation.x = -Math.PI / 2; g.position.set(sg * (L + GD / 2), 0.01, 0); }
  // ---- a casca arredondada: uma caixa com 1 m por quadradinho, cada vértice empurrado para a superfície curva ----
  const geo = new THREE.BoxGeometry(2 * L, H, 2 * W, 2 * L, H, 2 * W).toNonIndexed(); geo.translate(0, H / 2, 0);
  const pos = geo.attributes.position, nor = geo.attributes.normal, ix = L - Rc, iy = H / 2 - Rc, iz = W - Rc, hy = H / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) - hy, z = pos.getZ(i);
    const cx = clamp(x, -ix, ix), cy = clamp(y, -iy, iy), cz = clamp(z, -iz, iz), dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
    if (d > 1e-6) { pos.setXYZ(i, cx + dx / d * Rc, cy + dy / d * Rc + hy, cz + dz / d * Rc); nor.setXYZ(i, dx / d, dy / d, dz / d); } // normal certinha (para fora)
  }
  // tira o chão reto (o piso de taco já está lá) e o buraco da boca dos gols; separa a parte de baixo (opaca) do vidro
  const baixo = [], alto = [], cols = [], madeira = new THREE.Color(0xb47a45), escuro = new THREE.Color(0x10131c), tmp = new THREE.Color();
  const corDe = (x, y) => { // madeira embaixo, cor do time subindo pela rampa, parede acolchoada escura em cima
    const time = tmp.copy(corA).lerp(corB, clamp((x + 6) / 12, 0, 1));
    if (y < 0.4) return madeira.clone();
    const t3 = madeira.clone().multiplyScalar(0.7).lerp(time.multiplyScalar(0.55), 0.5); // a rampa vai pegando a cor do time
    if (y < 3) return madeira.clone().lerp(t3, (y - 0.4) / 2.6);
    return t3.lerp(escuro, clamp((y - 3) / 3.5, 0, 1));
  };
  const P = pos.array, N = nor.array, out = { b: { p: [], n: [], c: [] }, a: { p: [], n: [] } };
  for (let t = 0; t < pos.count; t += 3) {
    let mx = 0, my = 0, mz = 0; for (let k = 0; k < 3; k++) { mx += P[(t + k) * 3] / 3; my += P[(t + k) * 3 + 1] / 3; mz += P[(t + k) * 3 + 2] / 3; }
    if (my < 0.02 && Math.abs(mx) < ix + 0.01 && Math.abs(mz) < iz + 0.01) continue; // chão reto
    if (Math.abs(mz) < GW && my < GH && Math.abs(mx) > L - Rc - 0.01) continue; // boca do gol
    const dst = my < 7.5 ? out.b : out.a;
    for (let k = 0; k < 3; k++) {
      const j = (t + k) * 3; dst.p.push(P[j], P[j + 1], P[j + 2]); dst.n.push(N[j], N[j + 1], N[j + 2]);
      if (dst === out.b) { const c = corDe(P[j], P[j + 1]); dst.c.push(c.r, c.g, c.b); }
    }
  }
  geo.dispose();
  const casca = (o, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(o.n, 3)); if (o.c) g.setAttribute("color", new THREE.Float32BufferAttribute(o.c, 3)); return add(new THREE.Mesh(g, mat)); };
  const parede = casca(out.b, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.BackSide })); parede.receiveShadow = true;
  casca(out.a, new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  // linhas de nível na rampa (para dar para ver a curva) e a grade do vidro em cima
  { const linhas = (alturas, cor, op) => { const g = new THREE.BufferGeometry(), v = [];
      for (const y of alturas) {
        const e = y < Rc ? Math.sqrt(Rc * Rc - (Rc - y) * (Rc - y)) : Rc, pts = rrPontos(L - Rc + e - 0.03, W - Rc + e - 0.03, Math.max(0.05, e - 0.03), y, 240);
        for (let i = 0; i < pts.length; i++) { // em pedacinhos de ~0,5 m: os que passam na boca do gol (onde a rampa foi cortada) ficam de fora
          const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.5));
          for (let k = 0; k < n; k++) {
            const x0 = a.x + (b.x - a.x) * k / n, z0 = a.z + (b.z - a.z) * k / n, x1 = a.x + (b.x - a.x) * (k + 1) / n, z1 = a.z + (b.z - a.z) * (k + 1) / n;
            if (y < GH + 0.5 && Math.abs((x0 + x1) / 2) > L - Rc - 0.5 && Math.abs((z0 + z1) / 2) < GW + 0.6) continue;
            v.push(x0, y, z0, x1, y, z1);
          }
        }
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: op }))); };
    linhas([0.35, 1.2, 2.6, 4.4], 0xffffff, 0.35); linhas([9, H - Rc], 0x9fb8d8, 0.25); }
  // faixa de luz em volta (onde a parede opaca vira vidro), na cor de cada time
  for (const [cor, sx] of [[corA, -1], [corB, 1]]) {
    const pts = rrPontos(L - 0.08, W - 0.08, Rc, 7.5, 260).filter((p) => p.x * sx >= -0.5);
    pts.sort((a, b) => Math.atan2(a.z, a.x * sx) - Math.atan2(b.z, b.x * sx));
    const tube = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.12, 6, false), new THREE.MeshBasicMaterial({ color: cor.clone().lerp(new THREE.Color(0xffffff), 0.35) }))); void tube;
  }
  // os lados da rampa cortados pela boca do gol (a "bochecha") e o teto da boca
  { const x1 = L - Rc + Math.sqrt(Math.max(0, Rc * Rc - (Rc - GH) * (Rc - GH))); // onde a curva chega na altura do travessão
    const sh = new THREE.Shape(); sh.moveTo(L - Rc, 0);
    for (let i = 1; i <= 16; i++) { const xx = L - Rc + (x1 - (L - Rc)) * i / 16, e = xx - (L - Rc); sh.lineTo(xx, Rc - Math.sqrt(Math.max(0, Rc * Rc - e * e))); }
    sh.lineTo(L, GH); sh.lineTo(L, 0); sh.closePath();
    const mat = M(0x3a2a1c, { roughness: 0.6, side: THREE.DoubleSide }), sg0 = new THREE.ShapeGeometry(sh);
    for (const sg of [-1, 1]) for (const zs of [-1, 1]) { const m = add(new THREE.Mesh(sg0, mat)); m.scale.x = sg; m.position.z = zs * GW; }
    for (const sg of [-1, 1]) { const lid = add(new THREE.Mesh(new THREE.PlaneGeometry(L - x1, 2 * GW), M(0x2a2f3a, { side: THREE.DoubleSide }))); lid.rotation.x = Math.PI / 2; lid.position.set(sg * (x1 + L) / 2, GH, 0); }
  }
  // ---- o prédio: teto com treliças e refletores, paredes escuras e arquibancada dos dois lados ----
  const HT = H + 6, metal = M(0x2a2d33, { metalness: 0.7, roughness: 0.5 });
  for (let x0 = -L - 8; x0 <= L + 8; x0 += 10) { const t = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 2 * W + 40), metal)); t.position.set(x0, HT, 0); }
  for (const sx of [-0.6, 0, 0.6]) for (const sz of [-0.45, 0.45]) {
    const lamp = add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 2), M(0x1c1e22))); lamp.position.set(sx * L, HT - 1, sz * W);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xfff8e6 })); face.rotation.x = Math.PI / 2; face.position.y = -0.41; lamp.add(face);
  }
  const hall = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 70, HT + 8, 2 * W + 80), new THREE.MeshBasicMaterial({ color: 0x15171d, side: THREE.BackSide }))); hall.position.y = (HT + 8) / 2 - 0.1;
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 70, 2 * W + 80), M(0x23252b, { roughness: 1 }))); chao.rotation.x = -Math.PI / 2; chao.position.y = -0.06;
  const crowd = canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#2c2e33"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = tons(r, ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"]); x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = tons(r, ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"]); x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } x.fillStyle = "#00000080"; x.fillRect(0, 0, w, hh); }, true);
  for (const zs of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = crowd.clone(); t.repeat.set(5, 1); t.offset.x = i * 0.37; t.needsUpdate = true;
    const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), cz = M(0x2a2c31);
    const st = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 10, 1.2, 2.2), [cz, cz, M(0x34363c), cz, zs < 0 ? front : cz, zs < 0 ? cz : front]));
    st.position.set(0, 0.6 + i * 1.2, zs * (W + 4 + i * 2.2));
  }
  crowd.dispose();
  // ---- gols: traves brancas, rede e uma moldura de luz na cor de quem defende ----
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / 0.5, lh / 0.5); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = F.postR;
  for (const sg of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.x = sg * L;
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(sg * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(sg * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(sg * GD / 2, GH / 2, z); g.add(side); }
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.15, GH + 0.6, 2 * GW + 0.6), new THREE.MeshBasicMaterial({ color: sg < 0 ? corA : corB, transparent: true, opacity: 0.18, depthWrite: false })); glow.position.set(sg * (GD + 0.1), GH / 2, 0); g.add(glow);
  }
  netTex.dispose();
  // placas em cima de cada gol (updateGoalSigns) e a faixa no chão da boca do gol
  goalSigns = [];
  for (const sgn of [-1, 1]) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(16, 4, 1); spr.position.set(sgn * (L - 3), GH + 6.5, 0); add(spr);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2, 2 * GW), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(sgn * (L - 1.2), 0.025, 0); add(strip);
    goalSigns.push({ s: sgn, c, tex, spr, key: "", strip });
  }
  // almofadas de turbo, todas no chão reto (as grandes nos cantos da parte reta e no meio das laterais)
  pads = [];
  const fx = L - Rc - 2, fz = W - Rc - 2;
  const spots = [[fx, fz, 1], [fx, -fz, 1], [-fx, fz, 1], [-fx, -fz, 1], [0, fz + 0.5, 1], [0, -fz - 0.5, 1], [L * 0.5, 0, 0], [-L * 0.5, 0, 0], [0, 12, 0], [0, -12, 0], [L * 0.5, 14, 0], [L * 0.5, -14, 0], [-L * 0.5, 14, 0], [-L * 0.5, -14, 0], [L - Rc - 3, 6, 0], [L - Rc - 3, -6, 0], [-(L - Rc - 3), 6, 0], [-(L - Rc - 3), -6, 0]];
  for (const [x0, z0, big] of spots) {
    const g = add(new THREE.Group()); g.position.set(x0, 0.02, z0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.6 : 0.9, big ? 1.8 : 1, 0.12, 16), M(0x3a3a3a)); base.position.y = 0.06; g.add(base);
    const orb = new THREE.Mesh(big ? new THREE.SphereGeometry(0.6, 12, 8) : new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xff9900, emissiveIntensity: 0.9 }));
    orb.position.y = big ? 1.1 : 0.16; g.add(orb);
    pads.push({ x: x0, z: z0, big: !!big, orb, until: 0 });
  }
  return grp;
}

// Rio: morros cheios de casinhas coloridas atrás da quadra, palmeiras nos cantos e o Cristo lá longe
function morro(add, L, W) {
  const r = rng(77), cores = [0xe5533d, 0xf2b134, 0x4aa3df, 0x7bc96f, 0xf4f1e8, 0xe98fb7, 0xc8a27a, 0x9b6fd1, 0xffffff, 0xb5633f];
  const morros = [ // centro (x, z), raio em x, altura, raio em z e para onde a frente olha (a quadra)
    { x: 0, z: -(W + 80), sx: L * 3.6, h: 42, sz: 48, fx: 0, fz: 1 },
    { x: L + 90, z: 0, sx: 48, h: 30, sz: W * 4, fx: -1, fz: 0 },
    { x: -(L + 95), z: 6, sx: 50, h: 34, sz: W * 4, fx: 1, fz: 0 },
  ];
  const verde = M(0x527d3c, { roughness: 1 }), casas = [];
  for (const m of morros) {
    const hill = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), verde));
    hill.scale.set(m.sx, m.h, m.sz); hill.position.set(m.x, -2, m.z);
    for (let i = 0; i < 320; i++) { // casinhas só na encosta virada para a quadra
      const a = r() * 2 - 1, b = r() * 2 - 1, q = a * a + b * b;
      if (q > 0.85 || a * m.fx + b * m.fz < 0.05) continue;
      const w = 1.6 + r() * 1.8, hh = 1.6 + r() * 1.6, d = 1.6 + r() * 1.6, y = -2 + m.h * Math.sqrt(1 - q);
      casas.push({ x: m.x + a * m.sx, y: y + (hh - 3) / 2, z: m.z + b * m.sz, w, hh: hh + 3, d, ry: (r() - 0.5) * 0.3, cor: tons(r, cores) }); // a base fica enterrada no morro
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1), inst = add(new THREE.InstancedMesh(box, M(0xffffff, { roughness: 0.9 }), casas.length));
  const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  casas.forEach((c, i) => { mt.compose(new THREE.Vector3(c.x, c.y, c.z), q.setFromEuler(e.set(0, c.ry, 0)), new THREE.Vector3(c.w, c.hh, c.d)); inst.setMatrixAt(i, mt); inst.setColorAt(i, col.setHex(c.cor)); });
  inst.castShadow = false; inst.receiveShadow = true;
  // palmeiras nos cantos, do lado de fora do alambrado
  const tronco = M(0x7a5a3a, { roughness: 1 }), folha = M(0x2f8a3a, { roughness: 0.8 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.set(sx * (L + 3.5), 0, sz * (W + 3.5));
    for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 7), tronco); t.position.set(sx * k * 0.06, 0.7 + k * 1.35, 0); t.rotation.z = -sx * 0.05; t.castShadow = true; g.add(t); }
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), folha); const a = (k / 7) * Math.PI * 2; f.position.set(sx * 0.36 + Math.sin(a) * 1.1, 8.3, Math.cos(a) * 1.1); f.rotation.set(0.35 * Math.cos(a), a, -0.35 * Math.sin(a)); f.castShadow = true; g.add(f); }
  }
  // o Corcovado lá longe, com o Cristo em cima
  const pico = add(new THREE.Mesh(new THREE.ConeGeometry(34, 90, 10), verde)); pico.position.set(-L * 1.4, 43, -(W + 150));
  const pedra = M(0xf1efe8, { roughness: 0.7 }), cristo = add(new THREE.Group()); cristo.position.set(-L * 1.4, 88, -(W + 150)); cristo.scale.setScalar(1.6);
  for (const [w, hh, d, y] of [[2.4, 2, 2.4, 1], [1.6, 7, 1.2, 5.5], [10, 1.1, 1, 8.3], [1, 1.1, 1, 9.6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), pedra); p.position.y = y; cristo.add(p); }
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
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a77c];
const SPINE_Y = 0.85; // altura da cintura (pivô da coluna)

// ======================================================================
// Skins zoeiras. Cada skin tem um boneco de caixinhas feito aqui ("look": sempre funciona, com joelho, cotovelo,
// coluna e as molas) e, se o arquivo existir em public/pelada/modelos/, o modelo 3D de verdade (.glb/.gltf) é
// carregado com o GLTFLoader e entra no lugar. Ajustes do arquivo: scale (tamanho), yOffset (sobe/desce em relação
// ao chão) e rotationOffset (gira o modelo; a frente do jogador é -z, e a maioria dos modelos vem olhando para +z).
// A camisa continua com a cor do time, para dar para saber quem é de quem.
// ======================================================================
const SKINS_CONFIG = {
  padrao: { arquivo: null, scale: 1, yOffset: 0, rotationOffset: 0, look: {} },
  cr7: { arquivo: "/pelada/modelos/cr7.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xd9a77c, cabelo: 0x17110c, estilo: "topete", larg: 1.1, altura: 1.04, num: 7 } },
  neymar: { arquivo: "/pelada/modelos/neymar.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xc68642, cabelo: 0xf3d36c, estilo: "moicano", larg: 0.92, num: 10 },
    queda: { push: 2 } }, // o cai-cai: no carrinho, rola o dobro (só o visual: levanta na mesma hora que os outros)
  lula: { arquivo: "/pelada/modelos/lula.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xe8b98a, cabelo: 0xdcdcdc, estilo: "calvo", barba: 0xd2d2d2, larg: 1.14, barriga: 1.2, altura: 0.95 } },
  bob_esponja: { arquivo: "/pelada/modelos/bob_esponja.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { esponja: true, altura: 0.92 } },
  levi: { arquivo: "/pelada/modelos/levi.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xf3d3b0, cabelo: 0x111111, estilo: "franja", altura: 0.88, gravata: 0xf4f4f4, capa: 0x2f5233 } },
};
const hex = (c) => new THREE.Color(c).getHex();

// cria o jogador: um container (é ele que anda e gira) com o nome em cima; o visual (a skin) fica dentro
function makePlayer(kitId, num, name, opts = {}) {
  const g = new THREE.Group();
  g.userData = { kitId, num, gk: !!opts.gk, nameLen: name.length, skin: null, pedido: 0, tag: null };
  if (name) { const tag = nameSprite((opts.gk ? "🧤 " : "") + name, tagColor(kitId)); tag.position.y = 2.15; g.add(tag); g.userData.tag = tag; }
  mudarSkinJogador(g, opts.skin);
  return g;
}

// troca a skin na hora: tira o visual antigo (liberando a memória), monta o boneco de caixinhas da skin nova e,
// se ela tiver arquivo 3D, carrega o modelo e troca quando terminar. Aceita o modelo ou o objeto que tem .model.
function mudarSkinJogador(jogador, novoSkinId) {
  const g = jogador && jogador.isObject3D ? jogador : jogador && jogador.model;
  if (!g) return null;
  const u = g.userData, id = SKINS_CONFIG[novoSkinId] ? novoSkinId : "padrao";
  if (u.skin === id && u.body) return g;
  tirarVisual(g);
  u.skin = id; const pedido = ++u.pedido;
  montarVoxel(g, id);
  const cfg = SKINS_CONFIG[id];
  if (cfg.arquivo) pegarGLTF(cfg.arquivo).then((gltf) => {
    if (u.pedido !== pedido) { soltarGLTF(cfg.arquivo); return; } // mudou de ideia enquanto baixava
    tirarVisual(g); montarGLTF(g, id, gltf);
  }, () => {}); // sem o arquivo: fica o boneco de caixinhas (é o reserva)
  return g;
}
// tira o visual da skin do container e libera a memória (o modelo 3D é compartilhado: só devolve a "ficha")
function tirarVisual(g) {
  const u = g.userData;
  if (!u.body) return;
  g.remove(u.body);
  if (u.gltfUrl) {
    if (u.mixer) { u.mixer.stopAllAction(); u.mixer.uncacheRoot(u.inner); }
    for (const m of u.matsExtra || []) m.dispose();
    soltarGLTF(u.gltfUrl);
  } else liberar(u.body);
  for (const k of ["body", "spine", "head", "legs", "knees", "arms", "elbows", "capa", "lean", "inner", "mixer", "acRun", "acIdle", "gltfUrl", "matsExtra", "rest", "mats"]) u[k] = null;
}
// o jogador saiu de vez da cena: tira a skin e o nome
function descartarJogador(g) {
  if (!g) return;
  g.parent?.remove(g);
  if (g.userData.skin == null) return; // carro: as texturas de pixel são compartilhadas, só tira da cena
  g.userData.pedido++; tirarVisual(g);
  if (g.userData.tag) { g.userData.tag.material.map.dispose(); g.userData.tag.material.dispose(); }
}

// ---------- modelos 3D (GLTFLoader), com cache: cada arquivo baixa uma vez e é clonado para cada jogador ----------
const gltfLoader = new GLTFLoader(), gltfCache = {};
function pegarGLTF(url) {
  const e = (gltfCache[url] ||= { users: 0, gltf: null, promise: gltfLoader.loadAsync(url).then((gl) => (e.gltf = gl)) });
  e.users++;
  return e.promise;
}
function soltarGLTF(url) {
  const e = gltfCache[url]; if (!e) return;
  if (--e.users <= 0 && e.gltf) { liberar(e.gltf.scene); delete gltfCache[url]; } // ninguém mais usa: libera
}
function montarGLTF(g, id, gltf) {
  const cfg = SKINS_CONFIG[id], u = g.userData;
  const body = new THREE.Group(), lean = new THREE.Group(), inner = cloneSkinned(gltf.scene);
  inner.scale.setScalar(cfg.scale); inner.position.y = cfg.yOffset; inner.rotation.y = cfg.rotationOffset;
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
  lean.add(inner); body.add(lean); g.add(body);
  const osso = (re) => { let b = null; inner.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  Object.assign(u, { body, lean, inner, gltfUrl: cfg.arquivo, spine: osso(/spine/i), head: osso(/head/i) });
  u.rest = { spine: u.spine && u.spine.rotation.clone(), head: u.head && u.head.rotation.clone() };
  // cores do time para o boneco de pano (o ragdoll do carrinho é de caixinhas)
  const K = u.gk ? GK_KIT : kitOf(u.kitId), pele = M(SKIN_TONES[(u.nameLen * 7 + u.num) % SKIN_TONES.length]), camisa = M(hex(K.c[0])), calcao = M(hex(K.shorts)), bota = M(0x161616);
  u.mats = { head: pele, torso: camisa, upperArm: camisa, forearm: pele, thigh: calcao, shin: calcao, boot: bota }; u.matsExtra = [pele, camisa, calcao, bota];
  // animações que vierem no arquivo (correr / parado)
  if (gltf.animations.length) {
    u.mixer = new THREE.AnimationMixer(inner);
    const clip = (re) => gltf.animations.find((a) => re.test(a.name));
    const run = clip(/run|corr|jog/i) || clip(/walk|anda/i), idle = clip(/idle|parad|stand/i);
    if (run) { u.acRun = u.mixer.clipAction(run); u.acRun.play(); }
    if (idle) { u.acIdle = u.mixer.clipAction(idle); u.acIdle.play(); }
    if (!run && !idle) u.mixer.clipAction(gltf.animations[0]).play();
  }
}

// ---------- o boneco de caixinhas de cada skin ----------
function montarVoxel(g, id) {
  const u = g.userData, L = SKINS_CONFIG[id].look || {}, bob = !!L.esponja;
  const K = u.gk ? { ...GK_KIT, num: C.kitColor(u.kitId) } : kitOf(u.kitId), num = L.num ?? u.num;
  const body = new THREE.Group(); body.scale.setScalar(L.altura || 1); g.add(body);
  const tom = bob ? 0xf5e04a : L.tom ?? SKIN_TONES[(u.nameLen * 7 + u.num) % SKIN_TONES.length];
  const skin = M(tom), shorts = M(bob ? 0x8a5a2b : hex(K.shorts)), sock = M(bob ? 0xf4f4f4 : hex(u.gk ? "#26282b" : C.kitColor(u.kitId))), boot = M(0x161616);
  const shirtC = M(bob ? 0xffffff : hex(K.c[0])), hair = M(L.cabelo ?? 0x2a1b10);
  const part = (gg, w, hh, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); gg.add(m); return m; };
  const lw = L.larg || 1, perna = bob ? 0.6 : 1; // o Bob tem perninha fina
  // pernas e braços com joelho e cotovelo (dobram na corrida, para o boneco não ficar duro)
  const legs = [], knees = [];
  for (const sx of [-0.11 * lw, 0.11 * lw]) {
    const l = new THREE.Group(); l.position.set(sx, 0.85, 0);
    part(l, 0.18 * lw, 0.3, 0.2, shorts, 0, -0.12, 0); part(l, 0.14 * perna, 0.12, 0.15 * perna, skin, 0, -0.29, 0);
    const kn = new THREE.Group(); kn.position.y = -0.3; l.add(kn);
    part(kn, 0.14 * perna, 0.2, 0.15 * perna, skin, 0, -0.08, 0); part(kn, 0.15 * (bob ? 0.8 : 1), 0.22, 0.16 * (bob ? 0.8 : 1), sock, 0, -0.36, 0); part(kn, 0.16, 0.1, 0.27, boot, 0, -0.5, -0.04);
    if (L.capa) part(l, 0.19, 0.03, 0.21, M(0x5a3a1e), 0, -0.2, 0); // cinto do equipamento de manobra (Levi)
    if (bob) part(kn, 0.13, 0.04, 0.14, M(hex(K.c[0])), 0, -0.3, 0); // faixa da meia com a cor do time
    body.add(l); legs.push(l); knees.push(kn);
  }
  // coluna ("spine"): tronco, braços e cabeça ficam num pivô na cintura, assim o tronco balança por cima das pernas
  const spine = new THREE.Group(); spine.position.y = SPINE_Y; body.add(spine);
  let front, backM, torsoMats;
  if (bob) { // a esponja: um tronco quadradão amarelo com furinhos, camisa branca e gravata da cor do time
    const pores = canvasTex(64, 64, (x, w, hh, r) => { x.fillStyle = "#f5e04a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? "#c9b52e" : "#d8c43a"; x.beginPath(); x.ellipse(r() * w, r() * hh, 2 + r() * 4, 2 + r() * 3, 0, 0, 7); x.fill(); } });
    front = new THREE.MeshStandardMaterial({ map: pores, roughness: 0.8 }); backM = front;
    torsoMats = [front, front, front, front, front, front];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.3), front); torso.position.y = 1.2 - SPINE_Y; spine.add(torso);
    part(spine, 0.63, 0.1, 0.31, shirtC, 0, 0.9 - SPINE_Y, 0); // camisa
    part(spine, 0.07, 0.16, 0.02, M(hex(K.c[0])), 0, 0.88 - SPINE_Y, -0.16); // gravata
  } else {
    front = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, false), roughness: 0.7 }); backM = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, true), roughness: 0.7 });
    torsoMats = [shirtC, shirtC, shirtC, shirtC, backM, front];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46 * lw, 0.6, 0.26 * (L.barriga || 1)), torsoMats); torso.position.y = 1.16 - SPINE_Y; spine.add(torso);
    if (L.gravata) part(spine, 0.14, 0.12, 0.05, M(L.gravata), 0, 1.38 - SPINE_Y, -0.14 * (L.barriga || 1)); // a gravata (cravat) do Levi
  }
  const arms = [], elbows = [], fore = u.gk ? shirtC : skin, ombro = bob ? 0.36 : 0.3 * lw;
  for (const sx of [-ombro, ombro]) {
    const a = new THREE.Group(); a.position.set(sx, (bob ? 1.36 : 1.42) - SPINE_Y, 0);
    part(a, 0.13 * (bob ? 0.9 : 1), 0.26, 0.14, shirtC, 0, -0.12, 0);
    const el = new THREE.Group(); el.position.y = -0.25; a.add(el);
    part(el, 0.11 * perna, 0.3, 0.12 * perna, fore, 0, -0.15, 0);
    if (u.gk) part(el, 0.15, 0.13, 0.15, M(0xf5f5f5), 0, -0.35, 0);
    spine.add(a); arms.push(a); elbows.push(el);
  }
  const head = new THREE.Group(); spine.add(head);
  if (bob) { // o rosto fica na frente do tronco: olhões, nariz e o sorrisão com dois dentes
    head.position.y = 1.2 - SPINE_Y;
    const white = M(0xffffff), azul = M(0x3a8de0), preto = M(0x111111);
    for (const sx of [-0.12, 0.12]) { part(head, 0.17, 0.17, 0.06, white, sx, 0.1, -0.18); part(head, 0.08, 0.08, 0.02, azul, sx, 0.1, -0.215); part(head, 0.04, 0.04, 0.02, preto, sx, 0.1, -0.226); }
    part(head, 0.06, 0.06, 0.12, skin, 0, 0.01, -0.21);
    part(head, 0.3, 0.05, 0.02, M(0x8c1d1d), 0, -0.09, -0.155);
    for (const sx of [-0.04, 0.04]) part(head, 0.05, 0.06, 0.02, white, sx, -0.12, -0.16);
  } else {
    head.position.y = 1.46 - SPINE_Y;
    part(head, 0.26, 0.28, 0.26, skin, 0, 0.15, 0);
    part(head, 0.18, 0.04, 0.01, M(0x111111), 0, 0.18, -0.131); // sobrancelhas
    const e = L.estilo;
    if (e === "topete") { part(head, 0.28, 0.07, 0.28, hair, 0, 0.31, 0.01); const q = part(head, 0.22, 0.09, 0.12, hair, 0, 0.37, -0.08); q.rotation.x = -0.35; }
    else if (e === "moicano") { part(head, 0.28, 0.04, 0.28, M(0x2a1b10), 0, 0.3, 0); part(head, 0.08, 0.13, 0.27, hair, 0, 0.36, 0); }
    else if (e === "calvo") { // careca em cima, cabelo branco dos lados e atrás, e a barba
      for (const sx of [-0.14, 0.14]) part(head, 0.02, 0.12, 0.2, hair, sx, 0.2, 0.02); part(head, 0.28, 0.12, 0.02, hair, 0, 0.2, 0.135);
      const b = M(L.barba); part(head, 0.27, 0.11, 0.05, b, 0, 0.04, -0.12); for (const sx of [-0.135, 0.135]) part(head, 0.02, 0.16, 0.18, b, sx, 0.07, -0.03); part(head, 0.15, 0.03, 0.02, b, 0, 0.1, -0.135);
    } else if (e === "franja") { part(head, 0.28, 0.07, 0.28, hair, 0, 0.31, 0.01); for (const sx of [-0.08, 0.08]) part(head, 0.09, 0.06, 0.03, hair, sx, 0.27, -0.135); } // franja repartida no meio
    else part(head, 0.28, 0.08, 0.28, hair, 0, 0.31, 0);
  }
  let capa = null;
  if (L.capa) { capa = new THREE.Group(); capa.position.set(0, 1.44 - SPINE_Y, 0.15); part(capa, 0.5, 0.75, 0.03, M(L.capa), 0, -0.37, 0); spine.add(capa); }
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  Object.assign(u, { body, spine, head, legs, knees, arms, elbows, capa, gltfUrl: null,
    mats: { head: skin, hair: bob ? skin : hair, torso: torsoMats, upperArm: shirtC, forearm: fore, thigh: shorts, shin: sock, boot } });
}
// poses: correr, chutar, carrinho (deitado de costas), mergulho do goleiro (de lado), caído (de bruços), segurando a bola
function animate(model, speed, dt, st, f = 0) {
  const u = model.userData, t = performance.now() / 1000;
  if (!u.legs) return animarGLTF(model, speed, dt, st, f);
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const lying = f & (FL.slide | FL.dive | FL.down);
  const sw = speed > 0.4 && !lying ? Math.sin(st.anim) * Math.min(0.9, speed / 7) : 0;
  const kick = st.kickT ? Math.sin(clamp((t - st.kickT) / 0.28, 0, 1) * Math.PI) : 0;
  u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.35);
  // o boneco olha para -z: rotation.x positivo leva perna/braço para a frente
  u.legs[1].rotation.x = kick > 0.01 ? kick * 1.3 : lerp(u.legs[1].rotation.x, (f & FL.slide) ? 0.5 : -sw, 0.35);
  const armTo = st.holding ? 1.4 : (f & FL.dive) ? 2.8 : null;
  const mola = springs(model, dt, st, lying, speed), jp = mola.jpitch.x - mola.pitch.x, jr = mola.jroll.x - mola.roll.x;
  u.arms[0].rotation.x = lerp(u.arms[0].rotation.x, (armTo ?? -sw * 0.8) + jp * 1.6, 0.35);
  u.arms[1].rotation.x = lerp(u.arms[1].rotation.x, (st.segura ? 1.35 : armTo ?? sw * 0.8) + jp * 1.6, 0.35); // segurando: braço esticado na camisa do outro
  // joelho dobra quando a perna vai para trás; cotovelo dobrado correndo; tronco inclina para a frente e balança
  const run = lying ? 0 : Math.min(1, speed / 7);
  // joelho dobra para trás (negativo) e cotovelo para a frente (positivo)
  u.knees[0].rotation.x = lerp(u.knees[0].rotation.x, (f & FL.slide) ? -1.1 : -(Math.max(0, -Math.sin(st.anim)) * 1.3 * run + 0.1 * run), 0.35);
  u.knees[1].rotation.x = lerp(u.knees[1].rotation.x, kick > 0.01 ? -0.9 * (1 - kick) : (f & FL.slide) ? -0.1 : -(Math.max(0, Math.sin(st.anim)) * 1.3 * run + 0.1 * run), 0.35);
  const elb = st.holding ? 0.6 : (f & FL.dive) ? 0 : 0.25 + 0.9 * run;
  u.elbows[0].rotation.x = lerp(u.elbows[0].rotation.x, elb, 0.3); u.elbows[1].rotation.x = lerp(u.elbows[1].rotation.x, elb, 0.3);
  poseCorpo(u.body, f, st, run);
  u.spine.rotation.x = mola.pitch.x; u.spine.rotation.z = mola.roll.x;
  // gelatina: cabeça e braços seguem a coluna com atraso (mola mais fraca), então balançam soltos e passam do ponto
  const rosto = u.skin === "bob_esponja"; // no Bob o rosto é o próprio tronco: só balança, não compensa a inclinação
  u.head.rotation.x = (rosto ? 0 : -mola.pitch.x * 0.6) + jp * (rosto ? 0.5 : 1.1); // a cabeça compensa a inclinação (olha para a frente)
  u.head.rotation.z = (rosto ? 0 : -mola.roll.x * 0.4) + jr * (rosto ? 0.5 : 1.1);
  u.arms[0].rotation.z = -0.1 * run + jr * 1.5; u.arms[1].rotation.z = 0.1 * run + jr * 1.5;
  if (u.capa) { u.capa.rotation.x = -(0.08 + 0.75 * run) + jp * 1.4; u.capa.rotation.z = jr * 1.2; } // a capa voa para trás
}
// o corpo inteiro só gira nas poses deitadas (carrinho, caído, mergulho); correndo, quem inclina é a coluna (mola)
function poseCorpo(b, f, st, run) {
  const lying = f & (FL.slide | FL.dive | FL.down);
  const tx = (f & FL.slide) ? 1.25 : (f & FL.down) ? -1.45 : 0, tz = (f & FL.dive) ? (st.diveSide || 1) * -1.35 : 0;
  b.rotation.x = lerp(b.rotation.x, tx, 0.3); b.rotation.z = lerp(b.rotation.z, tz, 0.15);
  const bob = lying ? 0 : Math.abs(Math.sin(st.anim)) * 0.06 * run;
  b.position.y = lerp(b.position.y, (f & FL.slide) ? 0.25 : (f & FL.down) ? 0.18 : (f & FL.dive) ? 0.5 : bob, 0.3);
}
// skin com modelo 3D: as mesmas molas inclinam o osso da coluna (se o modelo tiver esqueleto) ou o modelo inteiro,
// a cabeça balança atrasada, e o corpo estica e achata como gelatina a cada passada
function animarGLTF(model, speed, dt, st, f) {
  const u = model.userData, lying = f & (FL.slide | FL.dive | FL.down), run = lying ? 0 : Math.min(1, speed / 7);
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const mola = springs(model, dt, st, lying, speed), jp = mola.jpitch.x - mola.pitch.x, jr = mola.jroll.x - mola.roll.x;
  poseCorpo(u.body, f, st, run);
  if (u.spine) { u.spine.rotation.x = u.rest.spine.x + mola.pitch.x; u.spine.rotation.z = u.rest.spine.z + mola.roll.x; u.lean.rotation.set(0, 0, 0); }
  else { u.lean.rotation.x = mola.pitch.x * 0.6; u.lean.rotation.z = mola.roll.x * 0.6; } // sem esqueleto: tomba o modelo todo (pivô no pé)
  if (u.head) { u.head.rotation.x = u.rest.head.x + jp * 1.1; u.head.rotation.z = u.rest.head.z + jr * 1.1; }
  const k = SKINS_CONFIG[u.skin].scale, passo = Math.abs(Math.sin(st.anim)) * run;
  const estica = clamp(1 + 0.07 * passo - 0.3 * Math.abs(jp) - 0.04 * run, 0.8, 1.15); // estica no passo, achata no tranco
  u.inner.scale.set(k / Math.sqrt(estica), k * estica, k / Math.sqrt(estica)); // mantém o "volume"
  if (u.mixer) {
    const w = clamp(speed / 3, 0, 1);
    if (u.acRun) { u.acRun.setEffectiveWeight(u.acIdle ? w : 1); u.acRun.timeScale = u.acIdle ? Math.max(0.6, speed / 6) : speed > 0.3 ? Math.max(0.6, speed / 6) : 0; }
    if (u.acIdle) u.acIdle.setEffectiveWeight(u.acRun ? 1 - w : 1);
    u.mixer.update(dt);
  }
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
// anel embaixo do companheiro que vai receber o passe (assistência de passe)
const passMark = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 32), new THREE.MeshBasicMaterial({ color: 0x7cf29a, transparent: true, opacity: 0.8, depthWrite: false }));
passMark.rotation.x = -Math.PI / 2; passMark.visible = false; scene.add(passMark);

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
let adiantado = 0; // só para testes (#debug): tempo simulado de uma vez
const now = () => performance.now() / 1000 + adiantado;
// no celular não tem "prender o mouse": jogando = depois de tocar em "Voltar pro jogo"
const TOUCH = window.Toque && Toque.isTouch();
let touchPlay = false;
const locked = () => document.pointerLockElement === canvas || (TOUCH && touchPlay && G.active) || (PAD.play && G.active);
const ballS = { snap: null, view: C.newBall(), off: { x: 0, y: 0, z: 0 }, ignoreUntil: 0 };
const local = { ball: null };
const isCar = () => G.game === "carros";
const offline = () => G.mode === "treino" || G.mode === "bots"; // bola e (contra bots) os outros jogadores rodam só aqui
// marca em cima de quem eu controlo (contra bots, para achar o seu jogador no meio dos companheiros)
const meMark = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xffd84a }));
meMark.rotation.x = Math.PI; meMark.visible = false; scene.add(meMark);

function newMe(spawn) {
  return { x: spawn[0], y: 0, z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, facing: spawn[3], yaw: spawn[3], pitch: 0, stamina: 1, sprint: false,
    kickT: 0, lastKick: 0, slideT: 0, slideCd: 0, diveT: 0, downT: 0, jumps: 0, jumpT: 9, flipT: 0, boost: 34, boosting: false, st: {}, up: null, fw: null }; // up/fw: orientação do carro (parede, teto)
}
function myKit() { if (offline()) return store.get("pelada:kit") || "corinthians"; const m = myP(); return m && m.team ? S.kits[m.team] : "corinthians"; }
function startGame(mode, game, falta = false) {
  if (G.active && G.mode === mode && G.game === game && !!G.falta === falta) return;
  stopGame();
  G.active = true; G.mode = mode; G.game = game; G.F = C.campoDe(game, falta ? "futsal" : estiloDe(mode)); // a falta é treino de futsal G.kickoffKey = null; G.feed = [];
  ensureArena(game);
  show("game"); resize();
  const sp = C.spawns(G.F.id, "A", [{}], false)[0];
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
  } else if (mode === "bots") { local.ball = C.newBall(G.F); setupBots(); }
  else syncFromState(null, S);
  $("pause").classList.remove("hidden"); renderPauseSb(); touchPlay = false;
  requestAnimationFrame(loop);
}
function stopGame() {
  if (!G.active) return;
  G.active = false;
  clearRags(); limparItens();
  for (const r of G.remotes.values()) descartarJogador(r.model);
  G.remotes.clear();
  if (G.keeper) { descartarJogador(G.keeper.model); G.keeper = null; }
  if (G.falta) { for (const w of G.falta.wall) descartarJogador(w.model); G.falta = null; }
  for (const bt of G.bots || []) descartarJogador(bt.model);
  for (const k of G.keepers || []) descartarJogador(k.model);
  G.bots = []; G.keepers = []; G.bm = null; meMark.visible = false;
  if (G.meModel) { descartarJogador(G.meModel); G.meModel = null; }
  local.ball = null; ballS.mine = null; charge = null; Sound.engine(0, false);
  if (document.pointerLockElement) document.exitPointerLock();
  touchPlay = false; if (TOUCH) Toque.show(false); soltarPad(); PAD.play = false;
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
function mySkin() { const m = myP(); return (G.mode === "online" && m && m.skin) || store.get("pelada:skin") || "padrao"; }
function rebuildMyModel() {
  if (G.meModel) descartarJogador(G.meModel);
  const m = myP(), playing = offline() || (m && m.team);
  const car = (m && m.car) || store.get("pelada:car") || "godzilla";
  G.meModel = !playing ? null : isCar() ? makeCar(car, myKit(), "") : makePlayer(myKit(), m ? m.num || 10 : 10, "", { gk: !!(m && m.gk), skin: mySkin() });
  G.meKey = `${G.game}|${myKit()}|${m && m.gk}|${car}|${m && m.num}`;
  if (G.meModel) scene.add(G.meModel);
}
function leaveGame() {
  if (offline()) { stopGame(); if (S) { if (S.phase !== "lobby") startGame("online", S.config.mode); else { show("lobby"); renderLobby(); } } else show("home"); return; }
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
      if (rm) descartarJogador(rm.model);
      const model = isCar() ? makeCar(p.car, st.kits[p.team], p.name) : makePlayer(st.kits[p.team], p.num, p.name, { gk: p.gk, skin: p.skin });
      rm = { id: p.id, n: p.n, key, team: p.team, name: p.name, model, buf: [], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, f: 0, speed: 0, st: {} };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    rm.n = p.n; rm.ping = p.ping ?? 80; // o ping dele: quanto atrasada chega a posição (para o corpo a corpo)
    if (!isCar() && rm.model.userData.skin !== (C.SKINS[p.skin] ? p.skin : "padrao")) mudarSkinJogador(rm, p.skin); // trocou a skin: troca na hora
    if (p.spawn && m && (!old || !old.match || old.match.kickoff !== m.kickoff)) rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: 0, z: p.spawn[2], yaw: p.spawn[3], pitch: 0, f: 0, vx: 0, vz: 0 }];
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { descartarJogador(rm.model); G.remotes.delete(id); }
  const car = (mine && mine.car) || "godzilla";
  if (G.meKey !== `${G.game}|${myKit()}|${mine && mine.gk}|${car}|${mine && mine.num}` || (!!G.meModel !== !!(mine && mine.team))) rebuildMyModel();
  else if (G.meModel && !isCar() && G.meModel.userData.skin !== mySkin()) mudarSkinJogador(G.meModel, mySkin());
  if (m && `${m.kickoff}` !== G.kickoffKey) {
    G.kickoffKey = `${m.kickoff}`;
    if (mine && mine.team && mine.spawn) { const boost = G.me.boost; Object.assign(G.me, newMe(mine.spawn)); G.me.boost = Math.max(34, boost); G.camYaw = mine.spawn[3]; G.camPitch = 0.05; G.camCarYaw = mine.spawn[3]; }
    ballS.snap = null; ballS.mine = null; Object.assign(ballS.view, C.newBall(G.F)); ballS.off = { x: 0, y: 0, z: 0 };
    for (const pd of pads) pd.until = 0;
    if (m.kickoff > 1) flashMsg("Saída de bola", "", 2000);
  }
  if (m && old && old.match && old.match.phase === "ready" && m.phase === "live") Sound.start();
  if (st.phase === "over" && old && old.phase !== "over") Sound.end();
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}

// ---------- Strikers online: efeitos de item, item ganho e explosão ----------
socket.on("efeito", (d) => {
  if (!G.active || G.mode !== "online") return;
  if (ME && d.id === ME.id) { G.me[d.tipo + "T"] = d.ms / 1000; flashMsg("", `${C.ITENS[d.tipo].emoji} ${C.ITENS[d.tipo].nome}!`, 800, "#ffe14a"); Sound.item(); }
});
socket.on("ganhou", (d) => {
  if (!G.active || G.mode !== "online") return;
  if (ME && d.id === ME.id) { flashMsg("", `${C.ITENS[d.tipo].emoji} ${C.ITENS[d.tipo].nome}! (${d.motivo}) · ${PAD.on ? "↑" : "G"} para usar`, 1600, "#ffe14a"); Sound.item(); }
  else { const p = P(d.id); if (p) pushFeed(`🎁 ${h(p.name)} ganhou ${C.ITENS[d.tipo].emoji}`); }
});
socket.on("boom", (d) => { if (G.active && G.mode === "online") boomFx(d.x, d.z); });
// ---------- pacote do servidor (20x por segundo): bola e todo mundo ----------
socket.on("snap", (d) => {
  if (!G.active || G.mode !== "online") return;
  for (const e of d.p) {
    const p = PN(e[0]); if (!p) continue;
    const rm = G.remotes.get(p.id); if (!rm) continue;
    rm.buf.push({ t: d.t, x: e[1], y: e[2], z: e[3], vx: e[4], vy: e[5], vz: e[6], yaw: e[7], pitch: e[8], f: e[9], o: Array.isArray(e[10]) ? e[10] : null });
    if (rm.buf.length > 30) rm.buf.shift();
  }
  // itens andando (Strikers): guarda com a hora, e o desenho anda com eles até o próximo pacote
  G.itensRede = (d.it || []).map(([id, k, x, z, vx, vz, t]) => ({ id, tipo: C.ITEM_LISTA[k], x, z, vx, vz, t, at: performance.now() }));
  const [x, y, z, vx, vy, vz, hit, hn, sp, wx = 0, wy = 0, wz = 0, dn = -1] = d.b;
  if (hit > 2) { const [k, pan] = hearing([x, y, z]); Sound.bounce(hit, k, pan, isCar()); }
  const holder = hn >= 0 && PN(hn) ? PN(hn).id : null;
  if (performance.now() < ballS.ignoreUntil && !holder) return; // acabei de chutar: espero o chute voltar do servidor
  const before = { ...ballS.view };
  const donoId = dn >= 0 && PN(dn) ? PN(dn).id : null; // quem está conduzindo (eu viro "eu", como no myBody)
  ballS.snap = { t: d.t, x, y, z, vx, vy, vz, sp: sp || 0, wx, wy, wz, holder, dono: ME && donoId === ME.id ? "eu" : donoId };
  (ballS.buf ||= []).push({ t: d.t, x, y, z, vx, vz }); if (ballS.buf.length > 30) ballS.buf.shift(); // para desenhar no relógio de quem conduz
  // bola no meu pé: o servidor diz que sou eu quem conduz, então a bola passa a ser simulada aqui (como o meu jogador)
  // e vai junto nos meus pacotes. Se o servidor disser duas vezes seguidas que não sou mais eu (roubo, carrinho), ele manda.
  if (ballS.mine) {
    if (ME && donoId === ME.id && !holder) { ballS.naoDono = 0; return; }
    if (++ballS.naoDono < 2 || performance.now() - ballS.mineT < 300) return;
    ballS.mine = null; // devolve para o servidor (a diferença é corrigida aos poucos, logo abaixo)
  } else if (ME && donoId === ME.id && !holder && !isCar() && G.meModel && G.me.downT <= 0) {
    ballS.mine = { ...ballS.view, sp: 0, wx: 0, wy: 0, wz: 0, holder: null, dono: "eu" }; ballS.mineT = performance.now(); ballS.naoDono = 0; return;
  }
  const pred = predictBall();
  if (ballS.modo === "outro" && donoId && !holder) return; // outro conduzindo: a bola é interpolada (updateBall), sem correção aqui
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
    const dx = tk ? vic.x - tk.x : 0, dz = tk ? vic.z - tk.z : 1, l = Math.hypot(dx, dz) || 1, k = SKINS_CONFIG[vic.model.userData.skin]?.queda?.push || 1;
    addRag(vic.model, vic.x, vic.y || 0, vic.z, vic.yaw ?? vic.model.rotation.y, { x: vic.vx || 0, y: 0, z: vic.vz || 0 }, { x: (dx / l) * 3.5 * k, y: 2.2 * k, z: (dz / l) * 3.5 * k }, 1.15);
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
  const b = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, sp: s.sp || 0, wx: s.wx || 0, wy: s.wy || 0, wz: s.wz || 0, holder: null, dono: s.dono };
  const live = S && S.match && S.match.phase !== "ready";
  const dt = live ? clamp((sNow() - s.t) / 1000, 0, 0.25) : 0;
  const me = myBody();
  if (dt > 0) C.simulate(G.F, b, me ? [me] : [], dt);
  return b;
}
// a bola no pé vira junto com o corpo: gira a posição (e a velocidade) da bola em volta do jogador pelo mesmo ângulo que o
// corpo virou neste quadro. Sem isso o corpo virava primeiro e a bola chegava depois (a "mola" da condução demora).
function viraComABola(b, me) {
  const a = me && me.dFacing; if (!a || b.dono !== "eu" || b.holder || b.y > G.F.ballR + 0.12) return;
  const c = Math.cos(a), s = Math.sin(a), rx = b.x - me.x, rz = b.z - me.z, vx = b.vx - me.vx, vz = b.vz - me.vz;
  b.x = me.x + rx * c + rz * s; b.z = me.z + rz * c - rx * s;
  b.vx = me.vx + vx * c + vz * s; b.vz = me.vz + vz * c - vx * s;
}
// os outros jogadores, onde estão agora, para a bola no meu pé bater neles (e eles poderem tomar) aqui também
function corposRemotos() {
  const out = [];
  for (const rm of G.remotes.values()) out.push({ id: rm.id, kind: "pe", x: rm.px ?? rm.x, y: rm.y, z: rm.pz ?? rm.z, vx: rm.pvx || 0, vy: 0, vz: rm.pvz || 0, yaw: rm.yaw,
    sprint: rm.f & FL.sprint, slide: rm.f & (FL.slide | FL.down), dive: rm.f & FL.dive, conduz: true });
  return out;
}
// a bola no instante t (relógio do servidor), entre dois pacotes, como os bonecos dos outros
function interpBola(t) {
  const q = ballS.buf; if (!q || q.length < 2) return null;
  let i = q.length - 1; while (i > 0 && q[i - 1].t > t) i--;
  const B = q[i], A = q[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((t - A.t) / (B.t - A.t), 0, 1);
  return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), z: lerp(A.z, B.z, k) };
}
function myBody() {
  if (!G.meModel || !G.me) return null;
  const me = G.me;
  return isCar() ? { id: "eu", kind: "car", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, yaw: me.yaw, flip: me.flipT > 0, o: carO(me) }
    : { id: "eu", kind: "pe", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, yaw: me.facing, sprint: me.sprint, slide: me.slideT > 0 || me.downT > 0, dive: me.diveT > 0, girando: !!me.girando,
      conduz: !G.falta, chutou: now() - me.lastKick < 0.35 }; // conduz: a bola fica no pé (na falta, não)
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
      ...(G.F.strikers ? [{ icon: "🎁", label: "item", code: "KeyG" }] : []), { icon: "🌙", label: "cavadinha", code: "KeyL" }, { icon: "🎯", label: "passe", code: "KeyJ" }, { icon: "🦵", label: "carrinho", down: () => { if (locked() && G.meModel && !souDono()) wheelQueued = true; } },
      { icon: "↗", label: "cruzar", code: "KeyU" }, ...(G.mode === "bots" ? [{ icon: "🔁", label: "trocar", code: "KeyT" }] : []),
      { icon: "✋", label: "segurar", code: "KeyF" }, { icon: "🏃", label: "pique", code: "ShiftLeft" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "⚽", label: "chute", code: "KeyK", big: true },
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
document.addEventListener("mousedown", (e) => { if (!locked() || !G.meModel || isCar()) return; if (KICK_BTN[e.button] && !charge) { e.preventDefault(); if (modificador() && KICK_BTN[e.button] !== "cavadinha") return chuteColocado(KICK_BTN[e.button]); charge = { kind: KICK_BTN[e.button], t0: now(), src: "m" + e.button }; } });
document.addEventListener("mouseup", (e) => { if (charge && charge.src === "m" + e.button) releaseKick(); });
document.addEventListener("wheel", (e) => { if (locked() && G.meModel && !isCar()) { e.preventDefault(); if (!souDono()) wheelQueued = true; } }, { passive: false });
function releaseKick() { const c = charge; charge = null; if (c) doKick(c.kind, powerOf(c)); }

// ======================================================================
// Controle (Xbox, PlayStation e parecidos, pela Gamepad API do navegador), no estilo FIFA. Os botões apertam as
// mesmas teclas do teclado (o jogo nem percebe a diferença); o analógico esquerdo também dá a direção exata (em vez
// das 8 direções do WASD) e a velocidade (empurrou pouco, anda devagar). Start pausa e volta.
// ======================================================================
const PAD = { on: false, play: false, prev: [], lx: 0, ly: 0, rx: 0, ry: 0, fontes: new Map() };
// botões no layout padrão: 0 A/✕, 1 B/○, 2 X/□, 3 Y/△, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 direcional
// a pé, no layout clássico do FIFA (Xbox): A passe, B chute, X cruzamento alto (sem a bola: carrinho), Y cavadinha,
// RB colocado (RB + B chute colocado, RB + A passe colocado), LB troca de jogador, RT pique, LT segurar,
// R3 (apertar o analógico direito) pula/cabeceia (goleiro: R3 + lado se joga), View câmera, Menu pausa
const PAD_PE = { 0: "KeyJ", 1: "KeyK", 2: "acaoX", 3: "KeyL", 4: "KeyT", 5: "KeyR", 6: "KeyF", 7: "ShiftLeft", 11: "Space", 8: "KeyC", 12: "KeyG", 13: "Tab", 9: "start" }; // ↑ (12): item do Strikers
const PAD_CARRO = { 0: "Space", 1: "ShiftLeft", 2: "KeyQ", 3: "KeyC", 7: "KeyW", 6: "KeyS", 8: "KeyV", 13: "Tab", 9: "start" };
// a mesma tecla pode vir de duas fontes (RT e o analógico apertam W no carro): só solta quando as duas soltarem
function padTecla(code, fonte, down) {
  const set = PAD.fontes.get(code) || new Set(), antes = set.size > 0;
  if (down) set.add(fonte); else set.delete(fonte);
  PAD.fontes.set(code, set);
  if (antes !== set.size > 0) document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
}
function soltarPad() { for (const [code, set] of PAD.fontes) if (set.size) { set.clear(); document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true })); } }
function padPausa(jogar) {
  if (!G.active) return;
  if (jogar) { PAD.play = true; Sound.unlock(); $("pause").classList.add("hidden"); if (document.pointerLockElement) document.exitPointerLock(); }
  else { PAD.play = false; soltarPad(); keys.clear(); charge = null; $("pause").classList.remove("hidden"); renderPauseSb(); }
}
function lerPad(dt) {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected);
  if (!gp) { if (PAD.on) { soltarPad(); if (PAD.play) padPausa(false); } PAD.on = false; return; }
  if (!PAD.on) { PAD.on = true; toast("🎮 Controle conectado! Aperte Start (ou A na pausa) para jogar."); }
  const dz = (v) => (Math.abs(v || 0) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82); // zona morta (o analógico nunca fica no zero exato)
  PAD.lx = dz(gp.axes[0]); PAD.ly = dz(gp.axes[1]); PAD.rx = dz(gp.axes[2]); PAD.ry = dz(gp.axes[3]);
  const map = isCar() ? PAD_CARRO : PAD_PE;
  gp.buttons.forEach((b, i) => {
    const v = b.pressed || b.value > 0.4, era = !!PAD.prev[i]; PAD.prev[i] = v;
    if (v === era) return;
    const m = map[i]; if (!m) return;
    if (m === "start") { if (v) padPausa(!PAD.play); return; }
    if (!PAD.play) { if (v && i === 0 && G.active && $("over").classList.contains("hidden")) padPausa(true); return; } // pausado: A volta
    if (m === "acaoX") { // X: com a bola (ou ela no pé), cruzamento alto; sem a bola, carrinho (como no FIFA)
      if (v && G.meModel && !isCar() && !temBola()) { wheelQueued = true; return; }
      padTecla("KeyU", "b" + i, v); return;
    }
    padTecla(m, "b" + i, v);
  });
  if (!PAD.play || !G.active) return;
  // analógico esquerdo também aperta W/A/S/D (o carro, o mergulho do goleiro e quem mais lê as teclas)
  const t = 0.45;
  padTecla("KeyW", "ax", PAD.ly < -t); padTecla("KeyS", "ax", PAD.ly > t); padTecla("KeyA", "ax", PAD.lx < -t); padTecla("KeyD", "ax", PAD.lx > t);
  // analógico direito: câmera (a pé)
  if (!isCar() && G.view !== "tv" && (PAD.rx || PAD.ry)) { G.camYaw -= PAD.rx * 2.6 * dt * (sens / 1.6); G.camPitch = clamp(G.camPitch - PAD.ry * 1.8 * dt, ...pitchRange()); }
}
// chute colocado (RB/R + chute): sai na hora, com força máxima e efeito automático: a bola faz a curva de volta para o
// meio do gol (o "chute colocado" do FIFA)
function curvaColocada() {
  const me = G.me, team = myAttackTeam() || "A", gx = (team === "B" ? -1 : 1) * G.F.L;
  const b = bolaAqui(), a = aimYaw();
  const meio = Math.atan2(-(gx - b.x), -(0 - b.z)), d = Math.atan2(Math.sin(a - meio), Math.cos(a - meio));
  return Math.sign(d || 1) * Math.max(0.55, Math.min(1, Math.abs(d) * 4)); // mirou à esquerda do meio: curva para a direita
}
const powerOf = (c) => clamp((now() - c.t0) / (c.kind === "passe" ? 0.8 : 0.9), 0, 1);
// a bola como eu vejo agora (offline, a bola local; online, a do meu pé ou a prevista)
const bolaAqui = () => (offline() ? local.ball : ballS.mine || ballS.view);
// "estou com a bola": conduzindo (dono) ou com ela no alcance do pé/cabeça. Sem a bola: B dá carrinho e LB troca de jogador.
function souDono() { if (offline()) return !!local.ball && local.ball.dono === "eu"; return !!ballS.mine || !!(ballS.snap && ballS.snap.dono === "eu"); }
function temBola() { const b = bolaAqui(); return !!G.me && !!b && (souDono() || !!C.canKick({ ...G.me, id: "eu" }, b, 0.1)); }
const modificador = () => keys.has("KeyR"); // RB no controle: chute/passe colocado
function chuteColocado(kind) { if (charge) return; doKick(kind, 1, { colocado: true }); } // sai na hora, sem barra
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
  if (e.code === "KeyG" && !e.repeat && !isCar()) itemQueued = true; // Strikers: usa o item
  if (KICK_KEY[e.code] && !e.repeat && !charge && !isCar()) {
    if (modificador() && KICK_KEY[e.code] !== "cavadinha") chuteColocado(KICK_KEY[e.code]); // R/LB + chute/passe: colocado, na hora
    else charge = { kind: KICK_KEY[e.code], t0: now(), src: e.code };
  }
  if (e.code === "KeyU" && !e.repeat && !charge && !isCar() && G.meModel) doKick("cruzamento", 0); // cruzamento alto
  if (e.code === "KeyT" && !e.repeat && !isCar() && G.mode === "bots" && !souDono()) trocarJogador(); // T/LB: troca de jogador
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Tab") $("tab").classList.add("hidden");
  if (charge && charge.src === e.code) releaseKick();
});
window.addEventListener("blur", () => { keys.clear(); charge = null; });

function canPlay() { if (G.mode === "treino") return true; if (G.mode === "bots") return !!G.bm && G.bm.phase === "live"; const m = S && S.match; return S && S.phase === "play" && m && m.phase === "live"; }
// direção da bola: as setas (em relação à câmera); sem seta, para onde o jogador está virado
// quanto dá para olhar para baixo e para cima: em primeira pessoa dá para olhar o chão (e a bola no pé)
const pitchRange = () => (G.view === "primeira" ? [-1.35, 0.9] : [-0.45, 0.7]);
function aimYaw() {
  let f = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0), s = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
  if (!f && !s && PAD.play && Math.hypot(PAD.lx, PAD.ly) > 0.3) { f = -PAD.ly; s = PAD.lx; } // controle: mira com o analógico esquerdo (como no FIFA)
  if (!f && !s) return G.me.facing;
  const yaw = ctrlYaw(), wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  return Math.atan2(-wx, -wz);
}
function mates() {
  if (G.mode === "bots") return G.bots.filter((x) => x.team === "A" && x.downT <= 0 && x.slideT <= 0).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz }));
  if (G.mode !== "online") return [];
  const mine = myP(); if (!mine) return [];
  return [...G.remotes.values()].filter((r) => r.team === mine.team && !(r.f & (FL.slide | FL.down))).map((r) => ({ id: r.id, x: r.px ?? r.x, z: r.pz ?? r.z, vx: r.pvx ?? r.vx ?? 0, vz: r.pvz ?? r.vz ?? 0 })); // onde estão agora
}
// efeito: segurar Q (curva para a esquerda) ou E (para a direita) na hora do chute
const curveNow = () => (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
// o = { colocado }: chute colocado (força máxima + curva para o gol) ou passe colocado (tenso, no mais alinhado)
function doKick(kind, power, o = {}) {
  const me = G.me, t = now();
  if (!canPlay() || t - me.lastKick < C.KICK_CD || me.downT > 0) return;
  const ball = bolaAqui();
  const body = { ...me, id: ME && G.mode === "online" ? ME.id : "eu" };
  const how = C.canKick(body, ball, offline() ? 0 : 0.2);
  me.kickT = t; me.lastKick = t; me.st.kickT = t; // a perna balança mesmo se errar
  if (!how) return;
  let yaw = aimYaw();
  if (kind === "passe" && how !== "mao") { const r = C.assistPass(me, yaw, mates(), power, !!o.colocado, G.F); yaw = r.yaw; power = r.power; if (r.kind) kind = r.kind; } // longe: lançamento pelo alto
  if (kind === "cruzamento" && how === "pe") { const r = C.assistCross(me, yaw, myAttackTeam() || "A", mates(), G.F); yaw = r.yaw; power = r.power; }
  else if (kind === "cruzamento") { kind = "cavadinha"; power = 0.7; } // de cabeça ou com a mão: vai alto
  const curve = o.colocado && kind === "chute" && how === "pe" ? curvaColocada() : curveNow();
  if (kind === "chute" && how === "pe" && !isCar()) yaw = C.assistShot(me, yaw, myAttackTeam() || "A", G.F, curve, ball); // assistência estilo FIFA (último terço)
  me.facing = yaw;
  Sound.kick(power);
  if (offline()) { C.kick(local.ball, { ...me, id: "eu" }, kind, power, yaw, 0, curve, G.F); G.tKicks = (G.tKicks || 0) + 1; if (G.falta && G.falta.state === "mirar") { G.falta.state = "voando"; G.falta.t0 = t; G.falta.touched = null; } return; }
  const mine = ballS.mine; ballS.mine = null;
  socket.emit("kick", { kind, power, yaw, curve, ...(mine ? { bola: [mine.x, mine.y, mine.z] } : {}) }); // conduzindo: chuta a bola que eu vejo
  // previsão: a bola já sai do meu pé aqui; o servidor confirma em seguida
  const b = { ...(mine || ballS.view) }; C.kick(b, body, kind, power, yaw, 0.2, curve, G.F);
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
  try { lerPad(dt); frame(dt, t); } catch (e) { console.error(e); }
}
// o giro do drible: uma volta inteira enquanto dura
const giroDeke = (t) => (t > 0 ? (1 - t / DEKE_T) * Math.PI * 2 : 0);
function myFlags() {
  const me = G.me; let f = 0;
  if (me.sprint) f |= FL.sprint; if (charge) f |= FL.charge; if (me.slideT > 0) f |= FL.slide; if (me.diveT > 0) f |= FL.dive;
  if (me.flipT > 0) f |= FL.flip; if (me.boosting) f |= FL.boost; if (me.segurando) f |= FL.grab;
  if (me.dekeT > 0) f |= FL.deke; if (me.downT > 0) f |= FL.down; // os outros veem o giro e o choque
  return f;
}
function frame(dt, t) {
  const online = G.mode === "online", m = S && S.match;
  const frozen = (online && (!m || m.phase === "ready" || S.phase !== "play")) || (G.mode === "bots" && (!G.bm || G.bm.phase !== "live" || !locked()));
  if (G.meModel) (isCar() ? stepCar : stepFoot)(dt, t, frozen);
  // envia minha posição
  if (G.meModel && online && t - G.lastSend > 1 / 30) {
    const me = G.me; G.lastSend = t; const q = (v) => Math.round(v * 100) / 100;
    socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), vx: q(me.vx), vy: q(me.vy), vz: q(me.vz), yaw: q(isCar() ? me.yaw : me.facing), p: q(me.pitch || 0), f: myFlags(), ...(isCar() && carO(me) ? { o: carO(me).map(q) } : {}),
      ...(ballS.mine ? { bola: [q(ballS.mine.x), q(ballS.mine.y), q(ballS.mine.z), q(ballS.mine.vx), q(ballS.mine.vy), q(ballS.mine.vz)] } : {}) }); // conduzindo: a bola vai junto
  }
  if (G.mode === "treino") practiceStep(dt, t);
  if (G.mode === "bots") botsStep(dt, t);
  meMark.visible = G.mode === "bots" && !!G.meModel && G.view !== "primeira";
  if (meMark.visible) meMark.position.set(G.me.x, G.me.y + 2.25 + Math.sin(t * 5) * 0.06, G.me.z);
  updateRemotes(dt);
  updateRags(dt);
  updateBall(dt);
  updateFaiscas(dt); animarArena(t); updateBooms(dt); hudItens();
  if (G.mode === "online" && G.F.strikers) { const agora = performance.now(); desenharItens((G.itensRede || []).map((i) => { const s = Math.min(0.15, (agora - i.at) / 1000); return { ...i, x: i.x + i.vx * s, z: i.z + i.vz * s, t: i.t + s }; }), dt); }
  updateCamera(dt); if (camHook) camHook(cam);
  hud(t);
  updateGoalSigns();
  renderer.render(scene, cam);
}
// de quem é cada gol: o gol da direita (+x) é defendido pelo Visitante (B) e é onde o Mandante (A) faz gol.
// Cada um vê "ATAQUE" no gol onde precisa marcar e "DEFESA" no seu; quem assiste vê o nome de quem defende.
function myAttackTeam() { if (offline()) return "A"; const m = myP(); return m && m.team ? m.team : null; }
function updateGoalSigns() {
  const team = myAttackTeam(), kits = G.mode === "bots" && G.bm ? G.bm.kits : S && S.kits ? S.kits : { A: myKit(), B: "palmeiras" };
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
// ======================================================================
// Strikers (estilo arcade, inspirado no Mario Strikers): campo maior com cerca elétrica, posse firme, sem fôlego,
// drible com giro, itens e o Super Chute. A física fica em campo.js (MODES.strikers); aqui, o que é do jogador.
// ======================================================================
// estilo da partida: na sala, o organizador escolhe; no treino e contra bots, vale o da tela inicial
function estiloDe(mode) { const e = mode === "online" ? S && S.config.estilo : store.get("pelada:estilo"); return e === "strikers" ? "strikers" : "futsal"; }
const DEKE_T = 0.42, DEKE_CD = 1.1;
// drible com giro (Espaço com a bola, no Strikers): o jogador gira 360° com a bola colada, ganha um tranco de
// velocidade e, durante o giro, o carrinho não pega nele
function tentarDeke(p) {
  if (!G.F.strikers || p.dekeCd > 0 || p.downT > 0 || p.slideT > 0) return false;
  p.dekeT = DEKE_T; p.dekeCd = DEKE_CD; Sound.deke(); return true;
}
function tempoStrikers(p, dt) { for (const k of ["dekeT", "dekeCd", "cogumeloT", "estrelaT"]) p[k] = Math.max(0, (p[k] || 0) - dt); }
// multiplicador de velocidade do Strikers (campo maior, jogo mais rápido; giro dá um tranco; cogumelo e estrela também)
const velStrikers = (p) => (G.F.vel || 1) * ((p.dekeT || 0) > 0 ? 1.3 : 1) * ((p.cogumeloT || 0) > 0 ? 1.45 : 1) * ((p.estrelaT || 0) > 0 ? 1.2 : 1);
// cerca elétrica: quem bate forte nela (correndo ou empurrado) leva choque: cai um instante, é jogado de volta para
// dentro, solta a bola e sai faísca. O vão do gol não tem cerca. Devolve true se deu choque.
function cercaEletrica(p, nome) {
  const F = G.F, bt = p.bateu; if (!F.cerca || !bt || bt.v < 4 || p.downT > 0 || (p.estrelaT || 0) > 0) return false;
  if (bt.nx && !bt.nz && Math.abs(p.z) < F.goalW + 0.2) return false; // boca do gol
  p.downT = 0.9; p.slideT = 0; p.vx = -bt.nx * 6; p.vz = -bt.nz * 6;
  faiscas(p.x + bt.nx * 0.35, 1.0, p.z + bt.nz * 0.35, 18); Sound.choque();
  if (nome) pushFeed(`⚡ ${h(nome)} levou choque na cerca`);
  return true;
}
// faíscas (choque, itens): caixinhas brilhando que voam e somem
const FAISCAS = [];
const faiscaGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
function faiscas(x, y, z, n = 14, cor = 0x9ff8ff) {
  for (let i = 0; i < n; i++) {
    let f = FAISCAS.find((q) => q.t <= 0);
    if (!f) { if (FAISCAS.length > 120) break; f = { m: new THREE.Mesh(faiscaGeo, new THREE.MeshBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), t: 0 }; scene.add(f.m); FAISCAS.push(f); }
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    f.m.material.color.setHex(cor); f.m.position.set(x, y, z); f.v = [Math.cos(a) * v, 1 + Math.random() * 4, Math.sin(a) * v]; f.t = 0.35 + Math.random() * 0.3; f.m.visible = true;
  }
}
function updateFaiscas(dt) {
  for (const f of FAISCAS) {
    if (f.t <= 0) continue; f.t -= dt;
    f.v[1] -= 12 * dt; f.m.position.x += f.v[0] * dt; f.m.position.y += f.v[1] * dt; f.m.position.z += f.v[2] * dt;
    f.m.scale.setScalar(Math.max(0.05, f.t * 2.5)); f.m.material.opacity = Math.min(1, f.t * 3); if (f.t <= 0) f.m.visible = false;
  }
}
// ---------- itens do Strikers (no navegador) ----------
// Inventário: até 2 por jogador (p.itens). Contra bots e no treino tudo roda aqui; online, o servidor manda (evento
// "item" para usar; os itens que andam no campo chegam nos pacotes). Efeitos em quem usa: p.cogumeloT e p.estrelaT.
let itemQueued = false;
const ITEM_MAX = 2;
// visual de cada item no campo (caixinhas e formas simples, no estilo do jogo)
function itemMesh(tipo) {
  const g = new THREE.Group();
  if (tipo === "casco" || tipo === "teleguiado") {
    const cor = tipo === "casco" ? 0x2fbf4a : 0xe53935;
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(cor, { roughness: 0.35 })); g.add(casco);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16), M(0xf4f4f4)); aro.rotation.x = Math.PI / 2; g.add(aro);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.12), M(0xf4f4f4)); const a = (i / 5) * Math.PI * 2; p.position.set(Math.cos(a) * 0.18, 0.22, Math.sin(a) * 0.18); g.add(p); }
    g.position.y = 0.06;
  } else if (tipo === "banana") {
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 10, Math.PI * 0.9), M(0xffd83a, { roughness: 0.5 })); b.rotation.x = Math.PI / 2 - 0.3; b.position.y = 0.1; g.add(b);
    const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), M(0x5a3d1a)); ponta.position.set(0.22, 0.12, 0); g.add(ponta);
  } else if (tipo === "bomba") {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), M(0x1b1b22, { roughness: 0.4, metalness: 0.3 })); s.position.y = 0.3; g.add(s);
    const pavio = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), M(0xc9a36a)); pavio.position.y = 0.66; g.add(pavio);
    const fogo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa31a, toneMapped: false })); fogo.position.y = 0.78; g.add(fogo); g.userData.fogo = fogo;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const itemMeshes = new Map(); // id -> { g, tipo }
// desenha a lista de itens no campo: [{id, tipo, x, z, t}] (cria e tira os bonecos que entraram/saíram)
function desenharItens(lista, dt) {
  const vivos = new Set();
  for (const it of lista) {
    vivos.add(it.id);
    let m = itemMeshes.get(it.id);
    if (!m) { m = { g: itemMesh(it.tipo), tipo: it.tipo }; scene.add(m.g); itemMeshes.set(it.id, m); }
    m.g.position.x = it.x; m.g.position.z = it.z;
    if (it.tipo === "casco" || it.tipo === "teleguiado") m.g.rotation.y += dt * 14; // gira deslizando
    if (it.tipo === "bomba") { const k = 1 + Math.max(0, (it.t || 0) - 0.8) * 0.5 * (1 + Math.sin(now() * 30)); m.g.scale.setScalar(k); if (m.g.userData.fogo) m.g.userData.fogo.visible = Math.sin(now() * 40) > 0; }
  }
  for (const [id, m] of itemMeshes) if (!vivos.has(id)) { scene.remove(m.g); liberar(m.g); itemMeshes.delete(id); }
}
function limparItens() { for (const m of itemMeshes.values()) { scene.remove(m.g); liberar(m.g); } itemMeshes.clear(); if (G.itens) G.itens.length = 0; }
// explosão da bomba: faíscas laranja e uma bola de luz que cresce e some
const boomGeo = new THREE.SphereGeometry(1, 16, 12);
const BOOMS = [];
function boomFx(x, z) {
  faiscas(x, 0.6, z, 40, 0xff8a1a);
  const m = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, 0.6, z); scene.add(m); BOOMS.push({ m, t: 0 }); Sound.boom();
}
function updateBooms(dt) {
  for (let i = BOOMS.length - 1; i >= 0; i--) { const b = BOOMS[i]; b.t += dt; b.m.scale.setScalar(0.3 + b.t * 11); b.m.material.opacity = Math.max(0, 0.8 - b.t * 3); if (b.t > 0.3) { scene.remove(b.m); b.m.material.dispose(); BOOMS.splice(i, 1); } }
}
// ganhou um item (derrubado sem a bola, ou 3 passes seguidos do time)
function darItem(p, motivo) {
  if (!G.F.strikers || !p) return null;
  p.itens ||= []; if (p.itens.length >= ITEM_MAX) return null;
  const k = C.sortearItem(); p.itens.push(k);
  if (p === G.me) { flashMsg("", `${C.ITENS[k].emoji} ${C.ITENS[k].nome}! ${motivo ? `(${motivo})` : ""} · G para usar`, 1600, "#ffe14a"); Sound.item(); }
  return k;
}
// usa o primeiro item (sem servidor): efeito em quem usa ou um objeto que sai andando
function usarItemLocal(p, id, team) {
  const k = p.itens && p.itens.shift(); if (!k) return null;
  const I = C.ITENS[k];
  if (I.eu) { p[k + "T"] = I.dura; Sound.item(); }
  else { const it = C.lancarItem(k, p, team, id); if (it) { G.itens.push(it); Sound.lanca(); } }
  if (p === G.me) flashMsg("", `${I.emoji} ${I.nome}!`, 800, "#ffe14a");
  return k;
}
// quem está em campo (sem servidor), para os itens: eu, os bots
function entsLocais() {
  return [{ e: G.me, id: "eu", team: "A", eu: true, name: "Você" }, ...(G.bots || []).map((x) => ({ e: x, id: x.id, team: x.team, name: `${x.team === "A" ? "Seu" : "Bot"} ${x.name}` }))];
}
// sem servidor: anda os itens, derruba quem eles acertam, a estrela derruba quem encosta
function itensLocais(dt) {
  if (!G.F.strikers) return;
  G.itens ||= [];
  const ents = entsLocais(), b = local.ball;
  const corpos = ents.map((o) => ({ id: o.id, team: o.team, x: o.e.x, z: o.e.z, imune: o.e.downT > 0 || (o.e.estrelaT || 0) > 0, bola: b && b.dono === o.id }));
  const r = C.stepItens(G.F, G.itens, corpos, dt);
  for (const e of r.explosoes) boomFx(e.x, e.z);
  for (const a of r.acertos) { const o = ents.find((q) => q.id === a.id); if (o) derrubarPor(o, a.x, a.z, ents.find((q) => q.id === a.por)); }
  for (const s of ents) if ((s.e.estrelaT || 0) > 0) for (const o of ents) // estrela: quem encostar cai
    if (o.team !== s.team && !(o.e.downT > 0) && !((o.e.estrelaT || 0) > 0) && Math.hypot(o.e.x - s.e.x, o.e.z - s.e.z) < 1.0) derrubarPor(o, s.e.x, s.e.z, s);
  desenharItens(G.itens, dt);
}
// derrubado por um item ou pela estrela (sem servidor)
function derrubarPor(o, hx, hz, quem) {
  const e = o.e; e.downT = 1.4; e.slideT = 0; Sound.fall();
  if (local.ball && local.ball.dono === o.id) local.ball.dono = null;
  const model = o.eu ? G.meModel : e.model;
  if (model && !(o.eu && G.view === "primeira")) { const dx = e.x - hx, dz = e.z - hz, l = Math.hypot(dx, dz) || 1; addRag(model, e.x, e.y || 0, e.z, e.facing, { x: e.vx || 0, y: 0, z: e.vz || 0 }, { x: (dx / l) * 4, y: 3, z: (dz / l) * 4 }, 1.15); }
  if (o.eu) charge = null;
  pushFeed(`💥 ${h(quem ? quem.name : "Item")} derrubou ${h(o.name)}`);
}
// efeitos de quem usou cogumelo/estrela: rastro e brilho
function auraItens(p, dt) {
  if ((p.cogumeloT || 0) > 0 && Math.random() < dt * 30) faiscas(p.x, 0.25, p.z, 1, 0xff5a5a);
  if ((p.estrelaT || 0) > 0 && Math.random() < dt * 45) faiscas(p.x + (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 1.4, p.z + (Math.random() - 0.5) * 0.6, 1, [0xffe14a, 0x7ff7ff, 0xff7ad9][Math.floor(Math.random() * 3)]);
}
// os bots usam os itens quando faz sentido: casco/bomba em quem está na frente, teleguiado em quem tem a bola,
// banana em quem vem atrás, cogumelo/estrela quando estão com a bola
function botUsaItem(bot, t, d) {
  const k = bot.itens && bot.itens[0]; if (!k || t < (bot.itemT || 0)) return;
  bot.itemT = t + 0.4 + Math.random() * d.reac * 3;
  const b = local.ball, tem = b.dono === bot.id, rivais = entsLocais().filter((o) => o.team !== bot.team && !(o.e.downT > 0));
  const fx = -Math.sin(bot.facing), fz = -Math.cos(bot.facing);
  const naFrente = rivais.filter((o) => { const dx = o.e.x - bot.x, dz = o.e.z - bot.z, dd = Math.hypot(dx, dz); return dd < 14 && (dx * fx + dz * fz) / (dd || 1) > 0.9; });
  const atras = rivais.some((o) => { const dx = o.e.x - bot.x, dz = o.e.z - bot.z, dd = Math.hypot(dx, dz); return dd < 4 && (dx * fx + dz * fz) / (dd || 1) < -0.5; });
  const comBola = rivais.find((o) => b.dono === o.id);
  let usa = false;
  if (C.ITENS[k].eu) usa = tem;
  else if (k === "banana") usa = atras;
  else if (k === "teleguiado") usa = !!comBola && Math.hypot(comBola.e.x - bot.x, comBola.e.z - bot.z) < 18;
  else usa = naFrente.length > 0;
  if (usa) usarItemLocal(bot, bot.id, bot.team);
}
// usar o meu item: sem servidor, aqui; online, o servidor decide (e manda de volta o efeito ou o item andando)
function usarMeuItem() {
  if (G.mode === "online") { const inv = (myP() || {}).itens || []; if (inv.length) { socket.emit("item"); Sound.lanca(); } return; }
  usarItemLocal(G.me, "eu", "A");
}
// treino no Strikers: ganha um item a cada 6 s para treinar
function itensTreino(t) { if (!G.F.strikers || G.falta) return; G.me.itens ||= []; if (G.me.itens.length < ITEM_MAX && t > (G.itemTreinoT || 0)) { G.itemTreinoT = t + 6; darItem(G.me, "treino"); } }
// barrinha com os itens (canto de baixo, à esquerda)
function hudItens() {
  let el = $("hItens");
  if (!el) { el = document.createElement("div"); el.id = "hItens"; el.className = "hud"; el.style.cssText = "left:18px;bottom:22px;display:flex;gap:8px;align-items:center;font:700 13px Figtree,system-ui,sans-serif;color:#fff;text-shadow:0 2px 4px #000"; document.getElementById("game").appendChild(el); }
  const ativo = G.active && !isCar() && G.F.strikers && G.meModel;
  el.classList.toggle("hidden", !ativo); if (!ativo) return;
  const inv = G.mode === "online" ? (myP() || {}).itens || [] : G.me.itens || [];
  const slot = (k, i) => `<div style="width:${i ? 40 : 54}px;height:${i ? 40 : 54}px;border-radius:12px;background:#0b0f26cc;border:2px solid ${i ? "#7ff7ff55" : "#ffe14a"};display:grid;place-items:center;font-size:${i ? 22 : 30}px">${k ? C.ITENS[k].emoji : ""}</div>`;
  const ef = (G.me.estrelaT > 0 ? "⭐ " : "") + (G.me.cogumeloT > 0 ? "🍄 " : "");
  setH("hItens", `${slot(inv[0], 0)}${slot(inv[1], 1)}<span style="margin-left:4px">${inv.length ? (PAD.on ? "↑ usa" : "G usa") : "sem item"} ${ef}</span>`);
}
// ---------- a pé ----------
function stepFoot(dt, t, frozen) {
  const me = G.me, F = G.F, yaw = ctrlYaw(), mine = myP(), isGK = G.mode === "online" && mine && mine.gk;
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  let wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  let len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
  const padMag = PAD.play ? Math.min(1, Math.hypot(PAD.lx, PAD.ly)) : 0;
  if (padMag > 0.15) { // controle: a direção exata do analógico (não só as 8 do WASD)
    wx = -Math.sin(yaw) * -PAD.ly + Math.cos(yaw) * PAD.lx; wz = -Math.cos(yaw) * -PAD.ly - Math.sin(yaw) * PAD.lx;
    const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; len = 1;
  }
  me.slideT = Math.max(0, me.slideT - dt); me.diveT = Math.max(0, me.diveT - dt); me.downT = Math.max(0, me.downT - dt); me.slideCd = Math.max(0, me.slideCd - dt);
  tempoStrikers(me, dt);
  if (G.F.strikers && jumpQueued && !frozen && souDono() && tentarDeke(me)) jumpQueued = false; // Strikers: Espaço com a bola = drible com giro
  if (itemQueued) { itemQueued = false; if (G.F.strikers && !frozen && !(me.downT > 0)) usarMeuItem(); }
  if (G.F.strikers) auraItens(me, dt);
  const busy = me.slideT > 0 || me.diveT > 0 || me.downT > 0;
  const holding = ballS.snap && ME && ballS.snap.holder === ME.id;
  // carrinho (rodinha do mouse): desliza para onde está virado e derruba quem estiver na frente
  if (wheelQueued && !frozen && !busy && me.onGround && me.slideCd <= 0 && !holding && !souDono()) { // carrinho só sem a bola
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
  // segurar (F, com ou sem bola): perto de um adversário, puxa a camisa dele e ele corre bem mais devagar (55%).
  // Quem segura também fica mais lento (85%) e sem pique. Cada puxão dura no máximo 1,5 s; depois, 2 s de espera.
  me.segCd = Math.max(0, (me.segCd || 0) - dt);
  const alvo = keys.has("KeyF") && !busy && !frozen && !charge && me.segCd <= 0 ? alvoSegurar(me) : null;
  if (alvo) { me.segT = (me.segT || 0) + dt; if (me.segT > SEGURA_MAX) { me.segCd = 2; me.segT = 0; } }
  else if (me.segT > 0) { me.segCd = Math.max(me.segCd, 0.5); me.segT = 0; }
  const antes = !!me.segurando, antesV = !!me.seguradoPor;
  me.segurando = alvo && me.segT > 0 ? alvo : null;
  me.seguradoPor = busy ? null : quemMeSegura(me); // algum adversário colado com a mão em mim
  if (me.segurando && !antes) { flashMsg("", `✋ Segurando ${h(me.segurando.name)}`, 900); Sound.puxao(); }
  if (me.seguradoPor && !antesV) { flashMsg("", `✋ ${h(me.seguradoPor.name)} está te segurando!`, 1200, "#ffb4a8"); Sound.puxao(); }
  const wantSprint = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && len > 0 && !charge && !busy && !me.segurando;
  me.sprint = wantSprint && me.stamina > 0.02;
  me.stamina = F.semFolego ? 1 : clamp(me.stamina + (me.sprint ? -0.24 : 0.14) * dt, 0, 1); // Strikers: sem fôlego
  let speed = (charge ? C.CHARGING : me.sprint ? C.SPRINT : C.RUN) * velStrikers(me);
  if (me.seguradoPor) speed *= SEGURADO_VEL; if (me.segurando) speed *= 0.85;
  if (padMag > 0.15 && !me.sprint) speed *= clamp(padMag * 1.5, 0.35, 1); // empurrou pouco o analógico: anda devagar
  if (frozen || !len) speed = 0;
  if (frozen) { me.vx = 0; me.vz = 0; }
  if (busy) { const k = Math.exp(-dt * (me.downT > 0 ? 6 : 1.6)); me.vx *= k; me.vz *= k; }
  const jumping = jumpQueued && !frozen && !busy && me.onGround;
  C.movePlayer(me, { x: wx, z: wz, speed, jump: jumping, free: busy }, dt, F);
  if (cercaEletrica(me, "Você")) { charge = null; flashMsg("", "⚡ Choque na cerca!", 900, "#9ff8ff"); }
  if (jumping) Sound.jump();
  jumpQueued = false;
  // goleiro com a bola: não sai da área
  if (isGK && holding && !C.inArea(G.F.id, mine.team, me.x, me.z)) { const gx = mine.team === "A" ? -F.L : F.L, d = Math.hypot(me.x - gx, me.z) || 1; me.x = gx + (me.x - gx) / d * (F.areaR - 0.05); me.z = me.z / d * (F.areaR - 0.05); }
  // corpo a corpo: ninguém atravessa ninguém (os outros jogadores, o goleiro robô e a barreira da falta).
  // Os outros chegam atrasados (100 ms de interpolação + metade do ping deles): a conta usa onde cada um está AGORA
  // (rm.px/pz, calculado em updateRemotes), senão dois jogadores cruzando rápido passam um pelo outro.
  const outros = [];
  for (const rm of G.remotes.values()) outros.push({ x: rm.px ?? rm.x, z: rm.pz ?? rm.z, y: rm.y, vx: rm.pvx || 0, vz: rm.pvz || 0, sprint: rm.f & FL.sprint, caido: rm.f & (FL.slide | FL.dive | FL.down) });
  if (G.keeper) { G.keeper.local = true; G.keeper.caido = !!G.keeper.diveT; outros.push(G.keeper); }
  for (const o of G.bots || []) outros.push({ x: o.x, z: o.z, y: o.y, vx: o.vx, vz: o.vz, sprint: o.sprint, caido: o.slideT > 0 || o.downT > 0 });
  for (const k of G.keepers || []) outros.push({ x: k.x, z: k.z, y: k.y, vx: k.vx, vz: k.vz, caido: !!k.diveT });
  if (G.falta) for (const w of G.falta.wall) outros.push({ x: w.x, z: w.z, y: w.y, fixo: true });
  C.corpoACorpo(me, outros, busy);
  // o corpo vira para onde está correndo; carregando o chute, vira para a mira
  const hsp = Math.hypot(me.vx, me.vz);
  // o corpo vira para onde você está mandando (não para onde a velocidade aponta: na meia-volta a velocidade inverte de
  // uma vez e o corpo girava 180° num piscar). O giro tem velocidade máxima: devagar vira rápido; correndo, uma
  // meia-volta leva ~0,4 s (no pique, mais), e a bola acompanha (viraComABola).
  const f0 = me.facing;
  if (!busy) {
    const target = charge ? aimYaw() : len > 0 ? Math.atan2(-wx, -wz) : hsp > 0.5 ? Math.atan2(-me.vx, -me.vz) : me.facing;
    const d = Math.atan2(Math.sin(target - me.facing), Math.cos(target - me.facing));
    const maxRate = charge ? 16 : hsp < 1.5 ? 11 : me.sprint ? 6 : 7.5; // rad/s: parado, meia-volta em ~0,3 s
    me.facing += clamp(d * Math.min(1, dt * 14), -maxRate * dt, maxRate * dt);
    me.girando = Math.abs(d) > 1.2; // virada grande: a bola vem para perto do pé
  } else me.girando = false;
  me.dFacing = Math.atan2(Math.sin(me.facing - f0), Math.cos(me.facing - f0)); // a bola no pé vira junto (viraComABola)
  me.st.holding = holding; me.st.segura = !!me.segurando;
  G.meModel.position.set(me.x, me.y, me.z); G.meModel.rotation.y = me.facing + giroDeke(me.dekeT);
  animate(G.meModel, hsp, dt, me.st, myFlags() | (me.downT > 0 ? FL.down : 0));
}
// segurar: o adversário mais perto (até 1,3 m, em pé). Quem está segurando eu: adversário com a mão (FL.grab)
// a até 1,6 m de mim (um pouco mais de folga por causa do atraso da internet). Posições "de agora" (rm.px/pz).
const SEGURA_R = 1.3, SEGURA_MAX = 1.5, SEGURADO_VEL = 0.55;
function adversarios() {
  if (G.mode === "bots") return G.bots.filter((x) => x.team === "B" && x.slideT <= 0 && x.downT <= 0);
  const eu = myP(); if (G.mode !== "online" || !eu || !eu.team) return [];
  return [...G.remotes.values()].filter((rm) => rm.team && rm.team !== eu.team && !(rm.f & (FL.slide | FL.dive | FL.down)));
}
function alvoSegurar(me) {
  let best = null, bd = SEGURA_R;
  for (const rm of adversarios()) { const d = Math.hypot((rm.px ?? rm.x) - me.x, (rm.pz ?? rm.z) - me.z); if (d < bd) { bd = d; best = rm; } }
  return best;
}
function quemMeSegura(me) {
  for (const rm of adversarios()) if ((rm.f & FL.grab) && Math.hypot((rm.px ?? rm.x) - me.x, (rm.pz ?? rm.z) - me.z) < SEGURA_R + 0.3) return rm;
  return null;
}
// ---------- de carro ----------
// orientação do carro: frente (fw) e cima (up) — na parede e no teto o carro fica deitado na superfície e, no ar, gira
// livre. Vai na rede como o = [fx, fy, fz, ux, uy, uz] (para os outros verem e para a bola bater certo no servidor).
const carO = (c) => (c.fw && c.up ? [c.fw[0], c.fw[1], c.fw[2], c.up[0], c.up[1], c.up[2]] : null);
const _qY = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _mb = new THREE.Matrix4();
function poseCar(model, x, y, z, yaw, o) {
  model.position.set(x, y, z);
  if (!o) { model.quaternion.copy(_qY.setFromAxisAngle(_up, yaw)); return; }
  _bz.set(-o[0], -o[1], -o[2]).normalize(); // o carro olha para -z
  _by.set(o[3], o[4], o[5]); _by.addScaledVector(_bz, -_by.dot(_bz)).normalize();
  _bx.crossVectors(_by, _bz); // direita = cima × trás
  model.quaternion.setFromRotationMatrix(_mb.makeBasis(_bx, _by, _bz));
}
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
  poseCar(G.meModel, me.x, me.y, me.z, me.yaw, carO(me));
  animateCar(G.meModel, me.st, dt, me.fw ? me.vx * me.fw[0] + me.vy * me.fw[1] + me.vz * me.fw[2] : (me.vx * -Math.sin(me.yaw) + me.vz * -Math.cos(me.yaw)), myFlags(), me.fw ? 0 : me.pitch);
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
      rm.o = A.o && B.o ? A.o.map((v, j) => lerp(v, B.o[j], k)) : B.o || null; // orientação (parede/teto), misturada e normalizada no poseCar
      while (b.length > 2 && b[1].t < rt - 200) b.shift();
      // onde ele está AGORA: o último pacote andado para a frente (o tempo desde o pacote + metade do ping dele,
      // que é o quanto a posição demorou para chegar no servidor). É contra essa posição que eu colido.
      const U = b[b.length - 1], ahead = clamp((sNow() - U.t + (rm.ping || 80) / 2) / 1000, 0, 0.3);
      rm.px = U.x + (U.vx || 0) * ahead; rm.pz = U.z + (U.vz || 0) * ahead; rm.pvx = U.vx || 0; rm.pvz = U.vz || 0;
    }
    // perto de mim, o boneco é desenhado na posição de agora (o que eu vejo é o que colide); longe, a interpolada (lisa)
    const perto = G.me && rm.px != null && !isCar() ? clamp((3 - Math.hypot(rm.x - G.me.x, rm.z - G.me.z)) / 1.5, 0, 1) : 0;
    rm.k = lerp(rm.k || 0, perto, Math.min(1, dt * 6));
    if (G.F.strikers) auraItens({ x: rm.x, z: rm.z, estrelaT: rm.f & FL.estrela ? 1 : 0, cogumeloT: rm.f & FL.cogumelo ? 1 : 0 }, dt); // brilho de quem está com estrela/cogumelo
    rm.giro = rm.f & FL.deke ? Math.min(Math.PI * 2, (rm.giro || 0) + (dt / DEKE_T) * Math.PI * 2) : 0; // o giro do drible dele
    rm.model.position.set(lerp(rm.x, rm.px ?? rm.x, rm.k), rm.y, lerp(rm.z, rm.pz ?? rm.z, rm.k)); rm.model.rotation.y = rm.yaw + rm.giro;
    if (isCar()) poseCar(rm.model, rm.model.position.x, rm.y, rm.model.position.z, rm.yaw, rm.o);
    if (isCar()) animateCar(rm.model, rm.st, dt, rm.speed, rm.f, rm.o ? 0 : rm.pitch);
    else { rm.st.holding = ballS.snap && ballS.snap.holder === rm.id; rm.st.segura = !!(rm.f & FL.grab); animate(rm.model, rm.speed, dt, rm.st, rm.f); }
  }
}

function updateBall(dt) {
  let b;
  if (offline()) b = local.ball;
  else if (ballS.mine) { // bola no meu pé: física aqui mesmo, a cada quadro (sem esperar o servidor)
    const m = ballS.mine, eu = myBody();
    viraComABola(m, G.me);
    C.simulate(G.F, m, eu ? [eu, ...corposRemotos()] : [], dt);
    if (m.dono !== "eu") { // escapou do pé aqui (ou alguém tomou): volta a seguir o servidor a partir daqui
      ballS.snap = { t: sNow(), x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, sp: m.sp || 0, wx: 0, wy: 0, wz: 0, holder: null, dono: m.dono };
      ballS.off = { x: 0, y: 0, z: 0 }; ballS.ignoreUntil = performance.now() + rtt + 60; ballS.mine = null;
    }
    b = ballS.view; Object.assign(b, { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, wx: 0, wy: 0, wz: 0, holder: null });
  } else {
    // outro jogador conduzindo: a bola é desenhada no mesmo relógio que ele (interpolada 100 ms no passado, como os
    // bonecos dos outros), senão ela aparece adiantada e balançando em relação ao pé dele. Perto de mim, o boneco dele
    // é desenhado no presente (rm.k), e a bola acompanha. Sem dono (ou eu), a bola é prevista no presente.
    const pred = predictBall() || C.newBall(G.F), s = ballS.snap;
    const rmD = s && !s.holder && s.dono && s.dono !== "eu" ? G.remotes.get(s.dono) : null, it = rmD ? interpBola(sNow() - INTERP) : null;
    const alvo = it ? { ...pred, x: lerp(it.x, pred.x, rmD.k || 0), y: lerp(it.y, pred.y, rmD.k || 0), z: lerp(it.z, pred.z, rmD.k || 0) } : pred;
    const modo = it ? "outro" : "prev"; b = ballS.view;
    if (modo !== ballS.modo) { ballS.off = { x: b.x - alvo.x, y: b.y - alvo.y, z: b.z - alvo.z }; if (Math.hypot(ballS.off.x, ballS.off.z) > 4) ballS.off = { x: 0, y: 0, z: 0 }; ballS.modo = modo; } // troca sem pulo
    const k = Math.exp(-dt * 12); ballS.off.x *= k; ballS.off.y *= k; ballS.off.z *= k;
    b.x = alvo.x + ballS.off.x; b.y = Math.max(G.F.ballR, alvo.y + ballS.off.y); b.z = alvo.z + ballS.off.z; b.vx = pred.vx; b.vy = pred.vy; b.vz = pred.vz; b.wx = pred.wx || 0; b.wy = pred.wy || 0; b.wz = pred.wz || 0; b.holder = pred.holder || null;
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
// k.s: de que lado é o gol dele (+1: o da direita, padrão; -1: o da esquerda, contra bots). ativo = false: fica parado.
function keeperBot(k, b, dt, t, ativo = true) {
  const F = G.F, s = k.s || 1, gx = s * (F.L - 0.6);
  k.diveT = Math.max(0, (k.diveT || 0) - dt);
  if (!ativo) { k.model.position.set(k.x, k.y, k.z); animate(k.model, 0, dt, k.st, 0); return { ...k, kind: "pe", dive: false }; }
  const coming = s * b.vx > 5 && s * b.x < s * gx;
  const zc = coming ? b.z + b.vz * (gx - b.x) / b.vx : b.z * (G.falta ? 0.35 : 0.8);
  const tz = clamp(zc, -F.goalW + 0.3, F.goalW - 0.3);
  if (!k.diveT) {
    const tArrive = coming ? (gx - b.x) / b.vx : 9;
    if (coming && tArrive < 0.45 && Math.abs(tz - k.z) > 0.55 && k.onGround) { // não chega andando: se joga
      const sd = Math.sign(tz - k.z); k.vz = sd * 7; k.vy = 3; k.onGround = false; k.diveT = 0.7; k.st.diveSide = -sd * s; Sound.jump();
    } else {
      const want = clamp((tz - k.z) * 7, -6, 6);
      C.movePlayer(k, { x: 0, z: Math.sign(want), speed: Math.abs(want), jump: coming && b.y > 1.3 && tArrive < 0.4 && k.onGround }, dt, F);
    }
  } else C.movePlayer(k, { x: 0, z: 0, speed: 0, free: true }, dt, F);
  k.x = gx;
  const near = Math.hypot(b.x - k.x, b.z - k.z) < 1.2 && Math.hypot(b.vx, b.vz) < 3 && b.y < 1;
  if (near && !G.falta) { k.holdT += dt; if (k.holdT > 0.8) { k.holdT = 0; k.st.kickT = t; reposicao(k, b); Sound.kick(0.5, 0.6); } }
  else k.holdT = 0;
  k.model.position.set(k.x, k.y, k.z); animate(k.model, Math.abs(k.vz), dt, k.st, k.diveT ? FL.dive : 0);
  return { ...k, kind: "pe", dive: k.diveT > 0 };
}
// o goleiro robô devolve a bola: no treino, para o meio; contra bots, rasteiro para um companheiro (ou para a frente)
function reposicao(k, b) {
  const s = k.s || 1, base = s > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (G.mode === "bots" && k.team) {
    const mates = [...(k.team === "A" ? [{ id: "eu", x: G.me.x, z: G.me.z, vx: G.me.vx, vz: G.me.vz }] : []), ...G.bots.filter((x) => x.team === k.team && x.downT <= 0).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz }))];
    const r = C.assistPass(k, base + (Math.random() - 0.5) * 1.2, mates, 0.3 + Math.random() * 0.5, false, G.F);
    C.kick(b, k, r.kind || "passe", r.alvo ? r.power : 0.7, r.yaw, 0, 0, G.F); return;
  }
  C.kick(b, k, "passe", 0.6 + Math.random() * 0.3, base + (Math.random() - 0.5) * 0.8, 0, 0, G.F);
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
  for (const w of fz.wall) descartarJogador(w.model);
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
  if (F.strikers) { itensTreino(t); itensLocais(dt); }
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
  viraComABola(b, me);
  const r = C.simulate(F, b, bodies, dt);
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan, isCar()); }
  const side = C.goalOf(F, b);
  if (side === "A" || (side && isCar())) { G.tGoals++; G.practiceGoalAt = t; Sound.net(); Sound.cheer(); flashMsg("GOOOL!", `${G.tGoals} gol${G.tGoals === 1 ? "" : "s"} no treino`, 2500, "#ffd84a", true); }
  else if (side === "B") { G.practiceGoalAt = t; Sound.ooh(); flashMsg("Gol contra!", "", 2000, "#ff8a8a"); }
}

// ======================================================================
// Contra bots (sozinho, sem servidor): o seu time (A) com bots companheiros contra um time só de bots, cada time com
// um goleiro robô. A bola e os bots rodam só aqui, como no treino. LB (ou T) troca para o companheiro mais
// perto da bola (apertando de novo, o próximo); quando um companheiro domina a bola, o controle passa para ele.
// Os bots: o mais perto da bola de cada time vai nela (no seu time, só se você estiver longe), os outros guardam
// posição acompanhando a bola; com a bola, conduzem para o gol desviando de quem vem, passam quando apertados e
// chutam de perto. Dão carrinho em quem conduz e cabeceiam bola alta.
// ======================================================================
// posições de cada um (x para o ataque, z para o lado) com a bola no meio, por tamanho de time (o goleiro é à parte)
const BOT_SLOTS = { 1: [[0, 0]], 2: [[-6, 0], [6, 0]], 3: [[-8, 0], [4, -6], [4, 6]], 4: [[-9, -5], [-9, 5], [5, -5], [5, 5]], 5: [[0, 0], [-10, -6], [-10, 6], [9, -6], [9, 6]] };
const BOT_MIN = 4;
function setupBots() {
  const n = clamp(store.get("pelada:botSize") || 3, 1, 5), dif = BOT_DIF[store.get("pelada:botDif")] ? store.get("pelada:botDif") : "medio";
  const a = myKit(), kits = { A: a, B: a === "palmeiras" ? "rubronegro" : "palmeiras" };
  G.bm = { n, dif, kits, passes: { A: 0, B: 0 }, ultDono: null, score: { A: 0, B: 0 }, left: BOT_MIN * 60000, phase: "ready", until: 0, kicking: "A", trocaT: 0, trocaN: 0 };
  G.bots = []; G.keepers = [];
  const nums = [10, 7, 5, 9, 11];
  for (const team of ["A", "B"]) for (let i = team === "A" ? 1 : 0; i < n; i++) {
    const bot = { id: `bot${team}${i}`, team, slot: i, num: nums[i], name: `#${nums[i]}`, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, facing: 0, yaw: 0,
      sprint: false, slideT: 0, slideCd: 0, downT: 0, lastKick: 0, kickT: 0, think: 0, st: {}, model: makePlayer(kits[team], nums[i], "") };
    scene.add(bot.model); G.bots.push(bot);
  }
  G.me.slot = 0;
  for (const team of ["A", "B"]) {
    const s = team === "A" ? -1 : 1, k = { id: "gk" + team, team, s, x: s * (G.F.L - 0.6), y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, holdT: 0, st: {}, model: makePlayer(kits[team], 1, "", { gk: true }) };
    k.model.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(k.model); G.keepers.push(k);
  }
  botsKickoff("A");
}
function botsKickoff(kicking) {
  const F = G.F, bm = G.bm;
  limparItens(); bm.passes = { A: 0, B: 0 }; bm.ultDono = null; // saída de bola: o campo fica limpo (os itens na mão continuam)
  Object.assign(local.ball, C.newBall(F));
  for (const team of ["A", "B"]) {
    const list = [...(team === "A" ? [G.me] : []), ...G.bots.filter((x) => x.team === team)];
    const sp = C.spawns(G.F.id, team, list.map(() => ({})), kicking === team);
    list.forEach((p, i) => Object.assign(p, { x: sp[i][0], y: 0, z: sp[i][2], vx: 0, vy: 0, vz: 0, onGround: true, facing: sp[i][3], yaw: sp[i][3], slideT: 0, downT: 0, sprint: false }));
  }
  for (const k of G.keepers) Object.assign(k, { z: 0, vx: 0, vy: 0, vz: 0, y: 0, onGround: true, diveT: 0, holdT: 0 });
  G.camYaw = G.me.facing; G.camPitch = 0.05;
  bm.phase = "ready"; bm.until = now() + 1.6; bm.kicking = kicking;
}
const botBody = (x) => ({ id: x.id, kind: "pe", x: x.x, y: x.y, z: x.z, vx: x.vx, vy: x.vy, vz: x.vz, yaw: x.facing, sprint: x.sprint, slide: x.slideT > 0 || x.downT > 0, dive: false,
  girando: !!x.girando, conduz: true, chutou: now() - x.lastKick < 0.35 });
const timeDe = (id) => (id === "eu" ? "A" : (G.bots.find((x) => x.id === id) || {}).team || null);
// quem do time vai na bola: o bot mais perto (no meu time, só se eu estiver bem mais longe que ele)
function cacador(team) {
  const b = local.ball; let best = null, bd = Infinity;
  for (const x of G.bots) if (x.team === team && x.downT <= 0) { const d = Math.hypot(b.x - x.x, b.z - x.z); if (d < bd) { bd = d; best = x; } }
  if (team === "A" && best && Math.hypot(b.x - G.me.x, b.z - G.me.z) < bd + 2) return null;
  return best;
}
// todo mundo do time (eu incluído no A), onde está agora
const doTime = (team, menos) => [...(team === "A" ? [{ id: "eu", x: G.me.x, z: G.me.z, vx: G.me.vx, vz: G.me.vz, down: G.me.downT > 0 }] : []),
  ...G.bots.filter((x) => x.team === team).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz, down: x.downT > 0 || x.slideT > 0 }))].filter((x) => x.id !== menos && !x.down);
function botChute(bot, t, d, s, power) {
  const F = G.F, b = local.ball, alvoZ = (Math.random() * 2 - 1) * (F.goalW - 0.45);
  const yaw = Math.atan2(-(s * F.L - b.x), -(alvoZ - b.z)) + (Math.random() * 2 - 1) * d.erro;
  if (!C.kick(b, botBody(bot), "chute", power, yaw, 0, 0, G.F)) return false;
  bot.lastKick = t; bot.st.kickT = t; const [k, pan] = hearing([bot.x, 0.5, bot.z]); Sound.kick(power, k, pan); return true;
}
function botPasse(bot, t, alvo) {
  const b = local.ball, yaw = Math.atan2(-(alvo.x - bot.x), -(alvo.z - bot.z)), r = C.assistPass(botBody(bot), yaw, [alvo], 0.45, false, G.F);
  if (!C.kick(b, botBody(bot), r.kind || "passe", r.power, r.yaw, 0, 0, G.F)) return false;
  bot.lastKick = t; bot.st.kickT = t; const [k, pan] = hearing([bot.x, 0.5, bot.z]); Sound.kick(r.power, k, pan); return true;
}
// com a bola: chuta de perto, passa quando apertado (ou de vez em quando, para a frente), senão conduz
function botDecide(bot, t, d, s) {
  const F = G.F, gx = s * F.L, dGol = Math.hypot(gx - bot.x, bot.z);
  const rivais = doTime(bot.team === "A" ? "B" : "A");
  const perto = (p, r) => rivais.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < r);
  if (dGol < 12.5 && s * (gx - bot.x) > 1.5 && Math.random() < 0.85) { if (botChute(bot, t, d, s, 0.72 + Math.random() * 0.28)) return; }
  const apertado = perto(bot, 2.4);
  if (apertado || Math.random() < 0.18) {
    let best = null, bs = -Infinity;
    for (const m of doTime(bot.team, bot.id)) {
      const dd = Math.hypot(m.x - bot.x, m.z - bot.z); if (dd < 3 || dd > 24) continue;
      const sc = s * (m.x - bot.x) * 0.6 - (perto(m, 2.5) ? 12 : 0) - dd * 0.15;
      if (sc > bs) { bs = sc; best = m; }
    }
    if (best && (apertado ? bs > -10 : bs > 1) && botPasse(bot, t, best)) return;
  }
  bot.alvoZ = clamp(bot.z * 0.5 + (Math.random() * 2 - 1) * 5, -F.W + 3, F.W - 3);
}
function stepBot(bot, dt, t, live) {
  const F = G.F, b = local.ball, d = BOT_DIF[G.bm.dif], s = bot.team === "A" ? 1 : -1;
  bot.slideT = Math.max(0, bot.slideT - dt); bot.downT = Math.max(0, bot.downT - dt); bot.slideCd = Math.max(0, bot.slideCd - dt); tempoStrikers(bot, dt);
  const busy = bot.slideT > 0 || bot.downT > 0;
  let wx = 0, wz = 0, speed = 0, sprint = false, olha = null;
  if (live && !busy) {
    const tem = b.dono === bot.id, donoT = b.dono ? timeDe(b.dono) : null, dB = Math.hypot(b.x - bot.x, b.z - bot.z);
    let tx, tz;
    if (tem) {
      if (t >= bot.think) { bot.think = t + d.reac * (0.6 + Math.random() * 0.8); botDecide(bot, t, d, s); }
      if (b.dono === bot.id) { // ainda com ela: conduz para o gol, desviando de quem está na frente
        const gx = s * F.L; let dx = gx - bot.x, dz = (bot.alvoZ ?? 0) - bot.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        let livre = true;
        for (const o of doTime(bot.team === "A" ? "B" : "A")) {
          const ox = o.x - bot.x, oz = o.z - bot.z, od = Math.hypot(ox, oz), fr = (ox * dx + oz * dz) / (od || 1);
          if (od < 4 && fr > 0.2) { livre = false; const lado = Math.sign(ox * -dz + oz * dx) || 1, k = (4 - od) * 0.35, px = -dz * lado, pz = dx * lado; dx -= px * k; dz -= pz * k; }
        }
        tx = bot.x + dx * 3; tz = bot.z + dz * 3; sprint = livre && Math.random() < 0.97;
        if (!livre && G.F.strikers && Math.random() < dt * 2.5 * (1 - d.reac)) tentarDeke(bot); // Strikers: gira para fugir do marcador
      } else { tx = bot.x; tz = bot.z; }
    } else if (donoT !== bot.team && bot === G.bm.cacador[bot.team]) {
      const lead = Math.min(0.6, dB / 10); tx = b.x + b.vx * lead; tz = b.z + b.vz * lead; sprint = dB > 3;
      if (donoT && dB < 1.9 && bot.slideCd <= 0 && bot.onGround && Math.random() < d.carrinho * dt * 2.5) { // carrinho em quem conduz
        const fy = Math.atan2(-(b.x - bot.x), -(b.z - bot.z)); bot.facing = fy;
        const sp = Math.max(Math.hypot(bot.vx, bot.vz), 7.5); bot.vx = -Math.sin(fy) * sp; bot.vz = -Math.cos(fy) * sp; bot.slideT = 0.6; bot.slideCd = 2.5; Sound.slide();
      }
      if (!b.dono && t - bot.lastKick > 0.5) { // bola solta: alta cabeceia; no pé e perto do gol, chuta de primeira
        const how = C.canKick(botBody(bot), b, 0);
        if (how === "cabeca" || (how === "pe" && Math.hypot(s * F.L - b.x, b.z) < 9 && Math.random() < 0.5)) botChute(bot, t, d, s, how === "cabeca" ? 0.75 : 0.85);
      }
      olha = b;
    } else { // guarda posição acompanhando a bola (mais para a frente quando o time tem a bola)
      const sl = BOT_SLOTS[G.bm.n][bot.slot % BOT_SLOTS[G.bm.n].length], bxa = s * b.x;
      const xa = clamp(sl[0] * 0.8 + bxa * 0.55 + (donoT === bot.team ? 4 : -2), -F.L + 3, F.L - 3);
      tx = s * xa; tz = clamp(sl[1] + b.z * 0.3, -F.W + 1.5, F.W - 1.5); olha = b;
      if (!b.dono && dB < 1.2 && t - bot.lastKick > 0.5 && C.canKick(botBody(bot), b, 0) === "cabeca") botChute(bot, t, d, s, 0.7);
    }
    if (bot.slideT <= 0) {
      const dx = tx - bot.x, dz = tz - bot.z, dist = Math.hypot(dx, dz);
      if (dist > 0.4) { wx = dx / dist; wz = dz / dist; speed = (sprint ? C.SPRINT : C.RUN) * d.vel * clamp(dist / 2, 0.35, 1) * velStrikers(bot); }
      if (G.me.segurando === bot) speed *= SEGURADO_VEL;
    }
  }
  bot.sprint = sprint && speed > 0;
  if (F.strikers) { if (live && !busy) botUsaItem(bot, t, d); auraItens(bot, dt); }
  if (busy) { const k = Math.exp(-dt * (bot.downT > 0 ? 6 : 1.6)); bot.vx *= k; bot.vz *= k; }
  C.movePlayer(bot, { x: wx, z: wz, speed, jump: false, free: busy }, dt, F);
  cercaEletrica(bot, `${bot.team === "A" ? "Seu" : "Bot"} ${bot.name}`);
  const outros = [{ x: G.me.x, z: G.me.z, y: G.me.y, vx: G.me.vx, vz: G.me.vz, sprint: G.me.sprint, caido: G.me.slideT > 0 || G.me.downT > 0 }];
  for (const o of G.bots) if (o !== bot) outros.push({ x: o.x, z: o.z, y: o.y, vx: o.vx, vz: o.vz, sprint: o.sprint, caido: o.slideT > 0 || o.downT > 0 });
  for (const k of G.keepers) outros.push({ x: k.x, z: k.z, y: k.y, vx: k.vx, vz: k.vz, caido: !!k.diveT });
  C.corpoACorpo(bot, outros, busy);
  // vira para onde corre (com a bola ou parado, para a bola), com giro limitado como o jogador
  const hsp = Math.hypot(bot.vx, bot.vz);
  if (!busy) {
    const target = speed > 0 ? Math.atan2(-wx, -wz) : olha ? Math.atan2(-(olha.x - bot.x), -(olha.z - bot.z)) : bot.facing;
    const df = Math.atan2(Math.sin(target - bot.facing), Math.cos(target - bot.facing)), rate = hsp < 1.5 ? 11 : bot.sprint ? 6 : 7.5;
    bot.facing += clamp(df * Math.min(1, dt * 14), -rate * dt, rate * dt); bot.girando = Math.abs(df) > 1.2;
  }
  bot.yaw = bot.facing;
}
// carrinho (sem servidor): quem desliza derruba o adversário que estiver logo na frente
function carrinhosLocais() {
  const ents = [{ e: G.me, id: "eu", team: "A", eu: true }, ...G.bots.map((x) => ({ e: x, id: x.id, team: x.team }))];
  for (const a of ents) {
    if (!(a.e.slideT > 0) || a.e.downT > 0) continue;
    const hx = a.e.x - Math.sin(a.e.facing) * 0.6, hz = a.e.z - Math.cos(a.e.facing) * 0.6;
    for (const o of ents) if (o.team !== a.team && !(o.e.downT > 0) && !(o.e.dekeT > 0) && !(o.e.estrelaT > 0) && o.e.y < 0.6 && Math.hypot(o.e.x - hx, o.e.z - hz) < 0.85) { // no giro do drible (e com estrela), não pega
      const tinhaBola = local.ball.dono === o.id; derrubar(o, a);
      if (!tinhaBola) darItem(o.e, "derrubado sem a bola"); // Strikers: falta em quem está sem a bola dá item para quem caiu
    }
  }
}
function derrubar(o, a) {
  const e = o.e; e.downT = 1.4; e.slideT = 0;
  if (local.ball.dono === o.id) local.ball.dono = null;
  Sound.fall();
  const model = o.eu ? G.meModel : e.model;
  if (model && !(o.eu && G.view === "primeira")) {
    const dx = e.x - a.e.x, dz = e.z - a.e.z, l = Math.hypot(dx, dz) || 1, k = SKINS_CONFIG[model.userData.skin]?.queda?.push || 1;
    addRag(model, e.x, e.y || 0, e.z, e.facing, { x: e.vx || 0, y: 0, z: e.vz || 0 }, { x: (dx / l) * 3.5 * k, y: 2.2 * k, z: (dz / l) * 3.5 * k }, 1.15);
  }
  if (o.eu) charge = null;
  const nome = (x) => (x.eu ? "Você" : `${x.team === "A" ? "Seu" : "Bot"} ${x.e.name}`);
  pushFeed(`🦵 ${h(nome(a))} derrubou ${h(nome(o))}`);
}
// troca o controle para o bot: os dois trocam de corpo (posição, velocidade, modelo...), e a bola vai junto
function trocarCom(bot, aviso = true) {
  const me = G.me, b = local.ball;
  for (const k of ["x", "y", "z", "vx", "vy", "vz", "onGround", "facing", "slideT", "slideCd", "downT", "lastKick", "kickT", "st", "slot", "dekeT", "dekeCd", "cogumeloT", "estrelaT"]) { const v = me[k]; me[k] = bot[k]; bot[k] = v; }
  if (G.bm.ultDono === bot.id) G.bm.ultDono = "eu"; else if (G.bm.ultDono === "eu") G.bm.ultDono = bot.id; // a sequência de passes não conta a troca
  const m = G.meModel; G.meModel = bot.model; bot.model = m;
  me.yaw = me.facing; bot.yaw = bot.facing; bot.sprint = false; bot.think = 0; me.segurando = null;
  if (b.dono === bot.id) b.dono = "eu"; else if (b.dono === "eu") b.dono = bot.id;
  const num = bot.num; bot.num = me.num || 10; me.num = num; bot.name = `#${bot.num}`;
  charge = null; G.bm.trocaT = now();
  if (aviso) flashMsg("", "🔁 Trocou de jogador", 700);
}
function trocarJogador() {
  if (!G.bm || G.bm.phase === "over") return;
  const b = local.ball, t = now(), lista = G.bots.filter((x) => x.team === "A").sort((p, q) => Math.hypot(b.x - p.x, b.z - p.z) - Math.hypot(b.x - q.x, b.z - q.z));
  if (!lista.length) return;
  G.bm.trocaN = t - G.bm.trocaT < 1.2 ? G.bm.trocaN + 1 : 0; // apertou de novo logo em seguida: o próximo mais perto
  trocarCom(lista[G.bm.trocaN % lista.length]);
}
function animarBots(dt) {
  for (const x of G.bots) {
    x.model.position.set(x.x, x.y, x.z); x.model.rotation.y = x.facing + giroDeke(x.dekeT);
    animate(x.model, Math.hypot(x.vx, x.vz), dt, x.st, (x.sprint ? FL.sprint : 0) | (x.slideT > 0 ? FL.slide : 0) | (x.downT > 0 ? FL.down : 0));
  }
}
function botsStep(dt, t) {
  const bm = G.bm, F = G.F, b = local.ball; if (!bm) return;
  if (bm.phase === "over") { animarBots(dt); for (const k of G.keepers) keeperBot(k, b, dt, t, false); return; }
  if (bm.phase === "ready" && locked() && t >= bm.until) { bm.phase = "live"; Sound.start(); }
  if (bm.phase === "goal") {
    C.simulate(F, b, [], dt);
    for (const x of G.bots) C.movePlayer(x, { x: 0, z: 0, speed: 0 }, dt, F);
    animarBots(dt); for (const k of G.keepers) keeperBot(k, b, dt, t, false);
    if (t >= bm.until) { if (bm.left <= 0) return botsFim(); botsKickoff(bm.kicking); }
    return;
  }
  const live = bm.phase === "live" && locked();
  bm.cacador = { A: cacador("A"), B: cacador("B") };
  for (const x of G.bots) stepBot(x, dt, t, live);
  animarBots(dt);
  const bodies = [myBody(), ...G.bots.map(botBody), ...G.keepers.map((k) => keeperBot(k, b, dt, t, live))];
  if (!live) return;
  bm.left -= dt * 1000;
  carrinhosLocais();
  viraComABola(b, G.me);
  const antes = b.dono, r = C.simulate(F, b, bodies, dt);
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan); }
  if (F.strikers) { // itens: andam, derrubam; 3 passes seguidos do time dão item para quem recebeu
    itensLocais(dt);
    if (b.dono && b.dono !== bm.ultDono) {
      const t1 = bm.ultDono ? timeDe(bm.ultDono) : null, t2 = timeDe(b.dono);
      if (t1 && t1 === t2) { bm.passes[t2] = (bm.passes[t2] || 0) + 1; if (bm.passes[t2] % 3 === 0) { const o = entsLocais().find((q) => q.id === b.dono); if (o) darItem(o.e, "3 passes"); } }
      else bm.passes = { A: 0, B: 0 };
      bm.ultDono = b.dono;
    }
  }
  // um companheiro dominou a bola: o controle passa para ele (como no FIFA)
  if (b.dono && b.dono !== "eu" && b.dono !== antes) { const bot = G.bots.find((x) => x.id === b.dono); if (bot && bot.team === "A") trocarCom(bot, false); }
  const side = C.goalOf(F, b);
  if (side) {
    bm.score[side]++; bm.phase = "goal"; bm.until = t + 2.6; bm.kicking = side === "A" ? "B" : "A";
    Sound.net(); Sound.cheer();
    flashMsg("GOOOL!", side === "A" ? `Você ${bm.score.A} x ${bm.score.B} Bots` : `Gol dos bots · ${bm.score.A} x ${bm.score.B}`, 2500, side === "A" ? "#ffd84a" : "#ff8a8a", true);
    pushFeed(`⚽ ${side === "A" ? "Seu time" : "Bots"}`);
  } else if (bm.left <= 0) { bm.left = 0; botsFim(); }
}
function botsFim() {
  const bm = G.bm; bm.phase = "over"; Sound.end();
  if (document.pointerLockElement) document.exitPointerLock();
  PAD.play = false; soltarPad(); keys.clear(); charge = null;
  $("pause").classList.add("hidden");
  const r = bm.score.A === bm.score.B ? "🤝 Empate!" : bm.score.A > bm.score.B ? "🏆 Você venceu!" : "😓 Os bots venceram";
  $("overBox").innerHTML = `<h2>${r}</h2><p class="muted" style="margin:0 0 6px">Contra bots · ${BOT_DIF[bm.dif].nome} · ${bm.n}x${bm.n}</p>${scoreTable()}
    <div class="row" style="margin-top:12px"><button class="primary" id="btnAgain">Jogar de novo</button><button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  $("btnAgain").onclick = () => { stopGame(); startGame("bots", "pes"); };
  $("btnOut").onclick = () => { stopGame(); show("home"); };
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
  if (F.rc) { const sd = C.arenaSDF(F, p.x, p.y, p.z), lim = -0.8; if (sd.d > lim && !(Math.abs(p.x) > F.L - 1 && Math.abs(p.z) < F.goalW && p.y < F.goalH)) { const k = sd.d - lim; p.x -= sd.nx * k; p.y -= sd.ny * k; p.z -= sd.nz * k; } } // arena arredondada: não sai pela curva
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
    if (G.meModel && !isCar()) showAim(me); else { aim.visible = false; passMark.visible = false; }
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
    aim.visible = false; passMark.visible = false; return;
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
  if (charge && charge.kind === "chute" && !isCar()) ay = C.assistShot(me, ay, myAttackTeam() || "A", G.F, curveNow(), bolaAqui()); // a seta já mostra a ajudinha
  // carregando o passe: anel embaixo de quem vai receber (muda do mais perto para o mais longe conforme a força)
  let alvo = null;
  if (charge && charge.kind === "passe" && !isCar()) { const r = C.assistPass(me, ay, mates(), powerOf(charge), false, G.F); if (r.alvo) { alvo = r.alvo; ay = r.yaw; } }
  passMark.visible = !!alvo;
  if (alvo) { passMark.position.set(alvo.x, 0.04, alvo.z); passMark.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(now() * 8)); }
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
  } else if (G.mode === "bots" && G.bm) {
    const bm = G.bm, sw = (tm) => `<i style="background:${kitCss(bm.kits[tm])}"></i>`;
    setH("hTop", `<div class="t">${sw("A")}Você</div><div class="s">${bm.score.A}</div><div class="clock num">${fmtT(bm.left)}</div><div class="s">${bm.score.B}</div><div class="t">Bots · ${BOT_DIF[bm.dif].nome}${sw("B")}</div>`);
    setH("hPing", PAD.on ? "LB: troca de jogador · Menu = pausa" : "T: troca de jogador · Esc = menu");
    if (bm.phase === "ready" && t > msgT) setH("hMsg", "<small>Saída de bola…</small>");
    else if (t > msgT) setH("hMsg", "");
  }
  $("hPow").classList.toggle("hidden", !charge); $("hPowL").classList.toggle("hidden", !charge);
  if (charge) { $("hPow").firstElementChild.style.width = Math.round(powerOf(charge) * 100) + "%"; setH("hPowL", { chute: "Chute", passe: "Passe", cavadinha: "Cavadinha" }[charge.kind]); }
  $("hSta").classList.toggle("hidden", !G.meModel || (!isCar() && !!G.F.semFolego)); // Strikers: sem fôlego
  if (G.meModel) {
    setH("hStaL", isCar() ? `Turbo · ${Math.round(Math.hypot(me.vx, me.vz) * 3.6)} km/h` : "Fôlego");
    const bar = $("hSta").querySelector("i"); bar.style.width = Math.round((isCar() ? me.boost / 100 : me.stamina) * 100) + "%"; bar.style.background = isCar() ? "#ffb300" : "#7fe3ff";
  }
  setH("hHint", !G.meModel ? "Assistindo · Tab: placar" : isCar() ? "W/S acelerar · A/D virar · Shift turbo<br>Espaço pular (2x: mortal) · Q derrapar · C câmera da bola"
    : G.F.strikers ? "⚡ STRIKERS · K chute (segure no ataque: Super Chute) · J passe · L cavadinha<br>Espaço com a bola: giro · Rodinha: carrinho · G: item · Shift corre · C câmera"
    : "Setas: mirar · K/clique chute · J/direito passe · L cavadinha · U cruzar<br>R + K/J: colocado · T: trocar · Rodinha: carrinho · F segurar · Shift pique · Espaço pular · C câmera");
  G.feed = G.feed.filter((f) => t - f.at < 8);
  setH("hFeed", G.feed.map((f) => `<div>${f.html}</div>`).join(""));
  $("cross").classList.add("hidden");
}
function scoreTable() {
  if (G.mode === "treino") return `<p>Gols: <b>${G.tGoals}</b>${isCar() ? "" : ` · Chutes: <b>${G.tKicks}</b>`}</p>`;
  if (G.mode === "bots" && G.bm) return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>Você ${G.bm.score.A}</span><span>${G.bm.score.B} Bots (${BOT_DIF[G.bm.dif].nome})</span></div>`;
  if (!S || !S.match) return "";
  const m = S.match;
  const rows = ["A", "B"].flatMap((tm) => S.players.filter((p) => p.team === tm).sort((a, b) => b.goals - a.goals))
    .map((p) => `<tr class="${ME && p.id === ME.id ? "me" : ""}"><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${kitCss(S.kits[p.team])};margin-right:6px"></i>${p.gk ? "🧤 " : ""}${h(p.name)} <span class="muted">${isCar() ? h(C.CARS[p.car].name) : "#" + p.num}</span></td><td class="n">${p.goals}</td><td class="n">${p.assists}</td><td class="n">${isCar() ? "—" : p.gk ? p.saves : p.shots}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>${h(kitOf(S.kits.A).name)} ${m.score.A}</span><span>${m.score.B} ${h(kitOf(S.kits.B).name)}</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Gols</th><th class="n">Assist.</th><th class="n">Chutes/defesas</th><th class="n">Ping</th></tr>${rows}</table>`;
}
function renderPauseSb() { if (FIXO !== "carros") setH("pSkins", skinButtons(G.mode === "online" ? (myP() || {}).skin : store.get("pelada:skin"))); $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div><div style="margin-top:12px">${keysHelp(G.game)}</div>` : ""; $("pauseHint").textContent = (G.mode === "treino" ? "Treino: só você vê." : G.mode === "bots" ? "Contra bots: o jogo fica parado enquanto o menu está aberto." : "") + (PAD.on ? " 🎮 Start ou A: voltar" : ""); }
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
let camHook = null; // só para testes (#debug): reposiciona a câmera depois do jogo
if (location.hash === "#debug") window.__pelada = { scene, G, cam, ballS, local, keys, addRag, rags, makePlayer, animate, mudarSkinJogador, jogar: () => padPausa(true), avancar: (seg) => { for (let i = 0; i < seg * 60; i++) { adiantado += 1 / 60; frame(1 / 60, now()); } }, setCamHook: (f) => (camHook = f) }; // para testes
