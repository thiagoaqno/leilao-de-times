// Sinuca da Galera — sons, entrar/criar, estado e sala de espera (parte 1 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
const Fi = window.Fisica;
const { L, W, R, D } = Fi;
const FRAME = 58, VW = L + 2 * FRAME, VH = W + 2 * FRAME; // área desenhada: pano + madeira
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🎱"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🙏", "🍀", "💀"];
const COLORS = { 0: "#f4f1e8", 1: "#f5c518", 2: "#1f4fd1", 3: "#d6262b", 4: "#5b2a86", 5: "#f07c1c", 6: "#11804a", 7: "#7a1f1f", 8: "#141414" };
const colorOf = (n) => COLORS[n > 8 ? n - 8 : n];
const socket = io("/sinuca");
const { $, h, store } = Comum;
let S = null, ME = null;
const relogio = Comum.relogio(), sNow = relogio.agora;
const me = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const P = (id) => S && S.players.find((p) => p.id === id);
const toast = Comum.criarToast(3200);
const act = Comum.criarAct(socket, toast);
function show(id) { for (const s of ["home", "lobby", "game"]) $(s).classList.toggle("hidden", s !== id); if (id === "game") requestAnimationFrame(layout); }

// ---------- sons (gerados pelo navegador) ----------
const Sound = (() => {
  let ac = null, on = store.get("sinuca:sound") !== false, lastBall = 0;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "sine", vol = 0.2, at = 0, slide = 0 } = {}) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, type = "bandpass" } = {}) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  const fx = {
    ball(v) { const now = performance.now(); if (now - lastBall < 18) return; lastBall = now; const k = Math.min(1, v / 2200); if (k < 0.03) return; noise(0.05, { vol: 0.15 + 0.5 * k, freq: 3400, q: 2.5 }); tone(2100 + 500 * k, 0.03, { vol: 0.08 * k + 0.02, type: "triangle" }); },
    rail(v) { const k = Math.min(1, v / 2200); if (k < 0.04) return; noise(0.09, { vol: 0.25 * k + 0.05, freq: 320, q: 0.8, type: "lowpass" }); tone(95, 0.09, { vol: 0.12 * k + 0.02 }); },
    pocket() { tone(150, 0.28, { vol: 0.3, slide: -80 }); noise(0.18, { vol: 0.18, freq: 600, q: 1, type: "lowpass", at: 0.03 }); tone(420, 0.05, { vol: 0.05, type: "triangle", at: 0.12 }); },
    cue(v) { const k = Math.min(1, v / 3000); noise(0.04, { vol: 0.25 + 0.4 * k, freq: 1400, q: 1.5 }); tone(700, 0.04, { vol: 0.08, type: "triangle" }); },
    turn() { tone(660, 0.12, { vol: 0.12 }); tone(990, 0.18, { vol: 0.12, at: 0.1 }); },
    foul() { tone(180, 0.22, { vol: 0.14, type: "sawtooth" }); tone(140, 0.26, { vol: 0.12, type: "sawtooth", at: 0.12 }); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { vol: 0.14, at: i * 0.11, type: "triangle" })); },
    pop() { tone(880, 0.06, { vol: 0.08 }); },
  };
  return { play(k, v) { if (on && fx[k]) try { fx[k](v); } catch {} }, toggle() { on = !on; store.set("sinuca:sound", on); }, get on() { return on; }, unlock() { if (on) ctx(); } };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); Sound.play("pop"); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

// ---------- entrar / criar ----------
const urlCode = new URLSearchParams(location.search).get("mesa");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("sinuca:" + r.code, ME);
  history.replaceState(null, "", "/sinuca/?mesa=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code; document.body.classList.add("inroom");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("sinuca:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da mesa."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/sinuca/?mesa=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("sinuca:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else show("home");
}
socket.on("connect", autoJoin);
socket.on("kicked", () => { toast("O organizador tirou você da mesa."); ME = null; S = null; history.replaceState(null, "", "/sinuca/"); document.body.classList.remove("inroom"); $("roomTag").classList.add("hidden"); show("home"); });

// ---------- estado vindo do servidor ----------
let anim = null, pre = null, lastNote = null, remote = null, seenShot = null;
socket.on("state", (st) => {
  relogio.doEstado(st.now);
  const old = S;
  S = st;
  const sh = st.g && st.g.shot;
  if (sh && sh.id !== seenShot) { seenShot = sh.id; if (sNow() < sh.at + sh.dur * 1000 + 300) startAnim(sh, old); }
  if (!st.g) { anim = null; pre = null; }
  render();
});
// Durante a animação da tacada, a tela mostra o estado de antes (placar, vez, bola na mão) e só depois o novo.
const shown = () => (anim && pre ? pre : S);

function render() {
  if (!S) return;
  if (S.phase === "lobby") { show("lobby"); renderLobby(); return; }
  if ($("game").classList.contains("hidden")) show("game");
  renderHud(); renderStatus(); renderSide(); renderOverlay(); renderReacts(); syncTurn();
}

// ---------- sala de espera ----------
function renderLobby() {
  const m = me(), isHost = m && S.host === m.id, c = S.config, duo = c.mode === "duplas";
  const seat = (p) => `<div class="lseat"><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${p.id === S.host ? "organizador" : p.online ? "pronto" : "desconectado"}${m && p.id === m.id ? " · você" : ""}</small></div>
    ${duo && m && (p.id === m.id || isHost) ? `<button class="small" data-team="${p.id}" title="Trocar de dupla">⇄</button>` : ""}
    ${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da mesa">✕</button>` : ""}</div>`;
  if (duo) {
    const t = [0, 1].map((k) => S.players.filter((p) => p.team === k));
    $("seats").innerHTML = `<div class="teams">${[0, 1].map((k) => `<div class="team ${k ? "tB" : "tA"}"><h3><i></i>Dupla ${k + 1}</h3>${t[k].map(seat).join("")}${Array.from({ length: Math.max(0, 2 - t[k].length) }, () => `<div class="lseat empty">lugar vago</div>`).join("")}</div>`).join("")}</div>
      ${isHost ? `<div class="row" style="margin-top:10px"><button class="small" id="btnShuffle">🎲 Sortear duplas</button><span class="hint" style="margin:0">Cada um pode trocar de dupla no ⇄.</span></div>` : ""}
      ${S.players.length > 4 ? `<p class="err">Duplas são 4 jogadores. Tem ${S.players.length} na mesa: tire alguém ou mude para individual.</p>` : ""}`;
  } else {
    $("seats").innerHTML = `<div class="plist">${S.players.map(seat).join("")}${Array.from({ length: Math.max(0, Math.min(8, Math.max(4, S.players.length + 1)) - S.players.length) }, () => `<div class="lseat empty">lugar vago</div>`).join("")}</div>`;
  }
  $("seats").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  $("seats").querySelectorAll("[data-team]").forEach((b) => (b.onclick = () => act("team", { id: b.dataset.team })));
  if ($("btnShuffle")) $("btnShuffle").onclick = () => act("shuffleTeams");
  $("myPick").classList.toggle("hidden", !m);
  if (m) {
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-pawn="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-pawn]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.pawn })));
  }
  const dis = isHost ? "" : "disabled", n = S.players.length;
  const rei = c.format === "rei", serie = !duo && n <= 2;
  const tLabel = (v) => (!duo && !serie && rei ? `Quem ganhar ${v} partida${v > 1 ? "s" : ""} primeiro` : v === 1 ? "Partida única" : `Melhor de ${2 * v - 1} (quem ganhar ${v})`);
  $("cfg").innerHTML = `
    <label>Modo</label>
    <div class="seg"><button data-mode="duplas" class="${duo ? "on" : ""}" ${dis}>👥 Duplas (2x2)</button><button data-mode="individual" class="${!duo ? "on" : ""}" ${dis}>🧍 Individual</button></div>
    ${duo ? `<p class="hint">As duplas se revezam: joga alguém da Dupla 1, depois da Dupla 2, depois o parceiro da Dupla 1… As bolas (lisas ou listradas) são da dupla.</p>` : `
    <div class="field"><label>Formato ${n <= 2 ? "(com 2 jogadores é um contra o outro)" : ""}</label>
    <div class="seg"><button data-format="rei" class="${rei ? "on" : ""}" ${dis}>👑 Rei da mesa</button><button data-format="mata" class="${!rei ? "on" : ""}" ${dis}>🏆 Mata-mata</button></div>
    <p class="hint">${rei ? "Quem ganha fica na mesa, quem perde vai para o fim da fila. Vale para qualquer número de jogadores." : "Semifinais e final (com 8: quartas também). Precisa de 4 ou 8 jogadores."}</p></div>`}
    <div class="field"><label>${!duo && !serie && rei ? "Para ser campeão" : duo ? "Série entre as duplas" : "Cada confronto"}</label>
    <select id="cTarget" ${dis}>${[1, 2, 3, 5].map((v) => `<option value="${v}" ${v === c.target ? "selected" : ""}>${tLabel(v)}</option>`).join("")}</select></div>
    <div class="field"><label>Tempo por tacada</label>
    <select id="cTimer" ${dis}>${[30, 45, 60].map((v) => `<option value="${v}" ${v === c.timer ? "selected" : ""}>${v} segundos</option>`).join("")}</select></div>`;
  const send = (patch) => act("config", { config: { ...S.config, ...patch } });
  $("cfg").querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => send({ mode: b.dataset.mode })));
  $("cfg").querySelectorAll("[data-format]").forEach((b) => (b.onclick = () => send({ format: b.dataset.format })));
  if ($("cTarget")) $("cTarget").onchange = (e) => send({ target: +e.target.value });
  if ($("cTimer")) $("cTimer").onchange = (e) => send({ timer: +e.target.value });
  let why = "";
  if (n < 2) why = "Espere pelo menos mais uma pessoa entrar.";
  else if (duo && n !== 4) why = `Duplas precisam de 4 jogadores (tem ${n}).`;
  else if (duo && S.players.filter((p) => p.team === 0).length !== 2) why = "Deixe 2 jogadores em cada dupla.";
  else if (!duo && !rei && n > 2 && n !== 4 && n !== 8) why = "Mata-mata precisa de 4 ou 8 jogadores. Use o rei da mesa.";
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%;font-size:19px;padding:14px" ${why ? "disabled" : ""}>🎱 Arrumar o triângulo</button><p class="hint">${why || "Quem dá a primeira saída é sorteado. Depois, a saída alterna."}</p>`
    : `<p class="muted" style="margin:0">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
