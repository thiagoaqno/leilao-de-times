// Futebol de Botão da Galera — sons, entrar/criar, estado e sala de espera (parte 1 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
const B = window.Botao;
const { L, W, RB, RBALL } = B;
const BAR_MAX = 3;
const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "⚽"];
const REACTIONS = ["👏", "😂", "😱", "🔥", "😡", "🙏", "🍀", "💀"];
// camisas: o desenho da tampinha lembra o uniforme do time. rim = borda serrilhada; face = o miolo
// (liso, listras verticais, listras horizontais ou faixa no peito); num = cor do número.
const KITS = {
  corinthians: { name: "Corinthians", rim: "#151515", face: { kind: "plain", c: ["#f4f4f4"] }, num: "#151515" },
  saopaulo: { name: "São Paulo", rim: "#f4f4f4", face: { kind: "band", c: ["#f4f4f4", "#c8102e", "#151515"] }, num: "#151515" },
  santos: { name: "Santos", rim: "#151515", face: { kind: "vstripes", c: ["#f4f4f4", "#151515"] }, num: "#c8102e" },
  palmeiras: { name: "Palmeiras", rim: "#06401f", face: { kind: "plain", c: ["#0b6b34"] }, num: "#f4f4f4" },
  rubronegro: { name: "Rubro-negro", rim: "#151515", face: { kind: "hstripes", c: ["#c8102e", "#151515"] }, num: "#f4f4f4" },
  celeste: { name: "Celeste", rim: "#123a80", face: { kind: "plain", c: ["#1e5bc6"] }, num: "#f4f4f4" },
  canarinho: { name: "Canarinho", rim: "#0b7a3b", face: { kind: "plain", c: ["#f5d000"] }, num: "#0b7a3b" },
  laranja: { name: "Laranja", rim: "#151515", face: { kind: "plain", c: ["#f07c1c"] }, num: "#151515" },
};
// "id:alt" = segunda camisa (quando os dois lados escolheram o mesmo time): miolo liso na cor da borda e borda na cor do miolo
const kitOf = (k) => {
  const [id, alt] = String(k || "").split(":"), base = KITS[id] || KITS.corinthians;
  return alt ? { ...base, name: base.name + " (2ª camisa)", rim: base.face.c[0], face: { kind: "plain", c: [base.rim] }, num: base.face.c[0] } : base;
};
// a mesma camisa em CSS (bolinhas da sala de espera)
function kitCss(k) {
  const [a, b, c] = k.face.c, f = k.face.kind;
  const face = f === "vstripes" ? `repeating-linear-gradient(90deg,${a} 0 5px,${b} 5px 10px)` : f === "hstripes" ? `repeating-linear-gradient(0deg,${a} 0 5px,${b} 5px 10px)`
    : f === "band" ? `linear-gradient(180deg,${a} 0 38%,${b} 38% 50%,${c} 50% 62%,${a} 62%)` : a;
  return `radial-gradient(circle,transparent 0 64%,${k.rim} 66%),${face}`;
}
// estádios: a moldura vira a arquibancada nas cores do time da casa
const STADIUMS = {
  mesa: { name: "Mesa de madeira" },
  morumbis: { name: "MorumBIS", home: "São Paulo", c: ["#c8102e", "#f4f4f4", "#151515"] },
  neoquimica: { name: "Neo Química Arena", home: "Corinthians", c: ["#151515", "#f4f4f4"] },
  nubank: { name: "Nubank Parque", home: "Palmeiras", c: ["#0b6b34", "#f4f4f4"] },
  baixada: { name: "Arena da Baixada", home: "Athletico", c: ["#c8102e", "#151515"] },
  vilabelmiro: { name: "Vila Belmiro", home: "Santos", c: ["#f4f4f4", "#151515"] },
};
const socket = io("/botao");
const { $, h, store } = Comum;
let S = null, ME = null;
const relogio = Comum.relogio(), sNow = relogio.agora;
const me = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const P = (id) => S && S.players.find((p) => p.id === id);
const cfg = () => (S ? S.config : {});
const toast = Comum.criarToast(3200);
const act = Comum.criarAct(socket, toast);
function show(id) { for (const s of ["home", "lobby", "game"]) $(s).classList.toggle("hidden", s !== id); if (id === "game") requestAnimationFrame(layout); }

// ---------- sons (gerados pelo navegador) ----------
const Sound = (() => {
  let ac = null, on = store.get("botao:sound") !== false, last = 0;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "sine", vol = 0.2, at = 0, slide = 0 } = {}) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, type = "bandpass", attack = 0 } = {}) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * (attack ? Math.min(1, k / attack) * (1 - k) : Math.pow(1 - k, 3)); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  const whistle = (dur = 0.3, at = 0) => { tone(2350, dur, { vol: 0.09, type: "square", at }); tone(2450, dur, { vol: 0.05, type: "sine", at }); };
  const fx = {
    flick(v) { const k = Math.min(1, v / 1500); noise(0.03, { vol: 0.2 + 0.3 * k, freq: 2600, q: 2 }); },
    ball(v) { const now = performance.now(); if (now - last < 18) return; last = now; const k = Math.min(1, v / 1800); if (k < 0.03) return; noise(0.04, { vol: 0.15 + 0.4 * k, freq: 1800, q: 3 }); tone(900 + 300 * k, 0.03, { vol: 0.05 + 0.08 * k, type: "triangle" }); },
    btn(v) { const k = Math.min(1, v / 1500); if (k < 0.04) return; noise(0.05, { vol: 0.15 + 0.4 * k, freq: 3200, q: 2.5 }); tone(1500, 0.03, { vol: 0.04 + 0.06 * k, type: "triangle" }); },
    wall(v) { const k = Math.min(1, v / 1500); if (k < 0.05) return; noise(0.08, { vol: 0.2 * k + 0.05, freq: 300, q: 0.8, type: "lowpass" }); },
    post(v) { const k = Math.min(1, v / 1500); tone(1180, 0.35, { vol: 0.1 * k + 0.04, type: "triangle" }); tone(1770, 0.25, { vol: 0.05 * k + 0.02 }); },
    net() { noise(0.25, { vol: 0.12, freq: 900, q: 0.6 }); },
    goal() { noise(1.8, { vol: 0.32, freq: 1100, q: 0.5, attack: 0.15 }); whistle(0.25, 0.05); [523, 659, 784].forEach((f, i) => tone(f, 0.2, { vol: 0.08, at: 0.2 + i * 0.1, type: "triangle" })); },
    out() { whistle(0.18); },
    foul() { whistle(0.15); whistle(0.3, 0.2); },
    turn() { tone(660, 0.12, { vol: 0.12 }); tone(990, 0.18, { vol: 0.12, at: 0.1 }); },
    power() { tone(300, 0.35, { vol: 0.12, type: "sawtooth", slide: 900 }); },
    win() { whistle(0.3); whistle(0.3, 0.4); whistle(0.7, 0.8); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { vol: 0.14, at: 1.4 + i * 0.11, type: "triangle" })); },
    pop() { tone(880, 0.06, { vol: 0.08 }); },
  };
  return { play(k, v) { if (on && fx[k]) try { fx[k](v); } catch {} }, toggle() { on = !on; store.set("botao:sound", on); }, get on() { return on; }, unlock() { if (on) ctx(); } };
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
  if (r.id) store.set("botao:" + r.code, ME);
  history.replaceState(null, "", "/botao/?mesa=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code; document.body.classList.add("inroom");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("botao:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da mesa."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/botao/?mesa=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("botao:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else show("home");
}
socket.on("connect", autoJoin);
socket.on("kicked", () => { toast("O organizador tirou você da mesa."); ME = null; S = null; history.replaceState(null, "", "/botao/"); document.body.classList.remove("inroom"); $("roomTag").classList.add("hidden"); show("home"); });

// ---------- estado vindo do servidor ----------
let anim = null, pre = null, lastNote = null, seenShot = null;
let remote = null; // mira ao vivo de quem está jogando
socket.on("state", (st) => {
  relogio.doEstado(st.now);
  const old = S;
  S = st;
  const sh = st.g && st.g.shot;
  if (sh && sh.id !== seenShot) { seenShot = sh.id; if (sNow() < sh.at + sh.dur * 1000 + 300) startAnim(sh, old); }
  if (!st.g) { anim = null; pre = null; }
  const geomKey = (x) => (x && x.match ? x.match.sides.join() + x.config.mesa + x.config.estadio : "");
  if (!old || !old.match || geomKey(st) !== geomKey(old)) layout();
  render();
});
// Durante a animação, a tela mostra o estado de antes (placar, vez) e só depois o novo.
const shown = () => (anim && pre ? pre : S);
const mySide = () => { const st = shown(); return st && st.match && ME ? st.match.sides.findIndex((s) => s.includes(ME.id)) : -1; };

function render() {
  if (!S) return;
  if (S.phase === "lobby") { show("lobby"); renderLobby(); return; }
  if ($("game").classList.contains("hidden")) show("game");
  syncTurn(); renderHud(); renderStatus(); renderCtrls(); renderSide(); renderOverlay(); renderReacts();
}

// ---------- sala de espera ----------
function renderLobby() {
  const m = me(), isHost = m && S.host === m.id, c = S.config, times = c.mode === "times";
  const seat = (p) => { const k = kitOf(p.kit); return `<div class="lseat"><div class="kitdot" style="background:${kitCss(k)}" title="${h(k.name)}"></div><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${h(k.name)} · ${h(p.form)}${p.id === S.host ? " · organizador" : ""}${m && p.id === m.id ? " · você" : ""}</small></div>
    ${times && m && (p.id === m.id || isHost) ? `<button class="small" data-team="${p.id}" title="Trocar de time">⇄</button>` : ""}
    ${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da mesa">✕</button>` : ""}</div>`; };
  const t = [0, 1].map((k) => S.players.filter((p) => p.team === k));
  if (times) {
    $("seats").innerHTML = `<p class="hint" style="margin:-4px 0 10px;font-size:15px">Formação: <b>${t[0].length || "?"} x ${t[1].length || "?"}</b></p>
      <div class="teams">${[0, 1].map((k) => `<div class="team"><h3>Time ${k + 1}</h3>${t[k].map(seat).join("")}${t[k].length < 4 ? `<div class="lseat empty">lugar vago</div>` : ""}</div>`).join("")}</div>
      ${isHost ? `<div class="row" style="margin-top:10px"><button class="small" id="btnShuffle">🎲 Sortear times</button><span class="hint" style="margin:0">Cada um troca de time no ⇄. Pode ser desigual (3x2).</span></div>` : ""}`;
  } else {
    $("seats").innerHTML = `<div class="plist">${S.players.map(seat).join("")}${Array.from({ length: Math.max(0, Math.min(8, Math.max(2, S.players.length + 1)) - S.players.length) }, () => `<div class="lseat empty">lugar vago</div>`).join("")}</div>`;
  }
  $("seats").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  $("seats").querySelectorAll("[data-team]").forEach((b) => (b.onclick = () => act("team", { id: b.dataset.team })));
  if ($("btnShuffle")) $("btnShuffle").onclick = () => act("shuffleTeams");
  $("myPick").classList.toggle("hidden", !m);
  if (m) {
    $("kitPick").innerHTML = Object.entries(KITS).map(([id, k]) => `<button class="${id === m.kit ? "on" : ""}" data-kit="${id}" title="${h(k.name)}" aria-label="${h(k.name)}" style="background:${kitCss(k)}"></button>`).join("") + `<span class="hint" style="align-self:center">${h(kitOf(m.kit).name)}</span>`;
    $("formPick").innerHTML = Object.keys(B.FORMATIONS).map((f) => `<button class="${f === m.form ? "on" : ""}" data-form="${f}" title="Formação ${f}">${formSvg(f)}<b>${f}</b></button>`).join("") + `<span class="hint" style="align-self:center">${times ? "Vale para o time todo." : ""}</span>`;
    $("formPick").querySelectorAll("[data-form]").forEach((b) => (b.onclick = () => act("form", { form: b.dataset.form })));
    $("kitPick").querySelectorAll("[data-kit]").forEach((b) => (b.onclick = () => act("kit", { kit: b.dataset.kit })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-pawn="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-pawn]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.pawn })));
  }
  const dis = isHost ? "" : "disabled", n = S.players.length;
  const rei = c.format === "rei", serie = times || n <= 2;
  const tLabel = (v) => (!serie && rei ? `Quem ganhar ${v} jogo${v > 1 ? "s" : ""} primeiro` : v === 1 ? "Jogo único" : `Melhor de ${2 * v - 1} (quem ganhar ${v})`);
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, label]) => `<button data-k="${key}" data-v="${v}" class="${String(c[key]) === String(v) ? "on" : ""}" ${dis}>${label}</button>`).join("")}</div>`;
  const sel = (key, opts) => `<select data-sel="${key}" ${dis}>${opts.map(([v, label]) => `<option value="${v}" ${String(v) === String(c[key]) ? "selected" : ""}>${label}</option>`).join("")}</select>`;
  $("cfg").innerHTML = `
    <label>Modo</label>
    ${seg("mode", [["times", "👥 Times (1x1 a 4x4)"], ["individual", "👑 Cada um por si"]])}
    ${times ? "" : `<div class="field"><label>Formato ${n <= 2 ? "(com 2 jogadores é x1)" : ""}</label>
    ${seg("format", [["rei", "👑 Rei do campo"], ["mata", "🏆 Mata-mata"]])}
    <p class="hint">${rei ? "Quem ganha fica na mesa, quem perde vai para o fim da fila. Vale para qualquer número de jogadores." : "Semifinais e final (com 8: quartas também). Precisa de 4 ou 8 jogadores."}</p></div>`}
    <div class="field"><label>Tampinhas por time</label>${sel("tampinhas", B.TAMPINHAS.map((v) => [v, `${v} tampinhas${v === 5 ? " (padrão)" : ""}`]))}
    <p class="hint">A tampinha 1 guarda o gol. A formação escolhida vale com 5; com outra quantidade, a arrumação é fixa.</p></div>
    <div class="field"><label>Mira</label>${seg("trajetoria", [["false", "🎯 Só a força"], ["true", "📐 Com trajetória"]])}
    <p class="hint">${c.trajetoria ? "Aparece a linha até a peça em que a tampinha vai bater e, se for a bola, para onde ela vai." : "Só a seta com a força: onde a tampinha bate e para onde a bola vai é no olho."}</p></div>
    <div class="field"><label>Toques por vez</label>${sel("toques", [[2, "2 toques"], [3, "3 toques"], [4, "4 toques"]])}
    <p class="hint">Todo peteleco conta, mesmo sem encostar na bola (dá para usar um toque para se posicionar). Falta passa a vez na hora. Num time com mais gente, cada toque é de um: um passa, o outro recebe.</p></div>
    <div class="field"><label>Estádio</label>${sel("estadio", Object.entries(STADIUMS).map(([id, x]) => [id, x.home ? `${x.name} (casa do ${x.home})` : x.name]))}</div>
    <div class="field"><label>Mesa</label>${seg("mesa", [["fechada", "🧱 Fechada"], ["aberta", "🚩 Com lateral"]])}
    <p class="hint">${c.mesa === "aberta" ? "A bola sai: lateral, escanteio e tiro de meta para o outro time." : "As linhas são bordas: a bola bate e volta, sem lateral."}</p></div>
    <div class="field"><label>Goleiro</label>${seg("goleiro", [["true", "🧤 Com goleiro"], ["false", "Sem goleiro"]])}
    <p class="hint">${c.goleiro ? "Um bloquinho na frente de cada gol. Cada time mexe o seu a qualquer hora, inclusive enquanto o adversário mira; só fica parado com as peças andando." : "A tampinha 1 é o goleiro, como no futsal."}</p></div>
    <div class="field"><label>Bola parada (falta, lateral, escanteio, tiro de meta)</label>${seg("cobranca", [["true", "✋ Arrumar a tampinha"], ["false", "Bate de onde está"]])}
    <p class="hint">${c.cobranca ? "Quem cobra pode arrastar a sua tampinha para perto da bola antes de bater. O outro time fica parado." : "Ninguém mexe nas tampinhas antes da cobrança."}</p></div>
    <div class="field"><label>Super palhetada</label>${seg("superTiro", [["false", "Desligada"], ["true", "⚡ Ligada"]])}
    <p class="hint">${c.superTiro ? `Cada passe certo (uma tampinha toca, outra do time recebe) enche a barra. Com ${BAR_MAX} passes, o próximo peteleco pode sair ${Math.round((B.SUPER - 1) * 100)}% mais forte.` : "Sem power-up: só o peteleco."}</p></div>
    <div class="field"><label>Cada jogo vai até</label>${sel("goals", [2, 3, 5, 7].map((v) => [v, `${v} gols`]))}</div>
    <div class="field"><label>Tempo de jogo</label>${sel("minutes", [0, 5, 10, 15].map((v) => [v, v ? `${v} minutos (empate no fim: gol de ouro)` : "Sem tempo (só pelos gols)"]))}</div>
    <div class="field"><label>${!serie && rei ? "Para ser campeão" : "Cada confronto"}</label>${sel("target", [1, 2, 3].map((v) => [v, tLabel(v)]))}</div>
    <div class="field"><label>Tempo para cada jogada</label>${sel("timer", [15, 20, 30, 45].map((v) => [v, `${v} segundos`]))}</div>`;
  const send = (patch) => act("config", { config: { ...S.config, ...patch } });
  const cast = (v) => (v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? +v : v);
  $("cfg").querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => send({ [b.dataset.k]: cast(b.dataset.v) })));
  $("cfg").querySelectorAll("[data-sel]").forEach((s) => (s.onchange = () => send({ [s.dataset.sel]: cast(s.value) })));
  let why = "";
  if (n < 2) why = "Espere pelo menos mais uma pessoa entrar.";
  else if (times && (!t[0].length || !t[1].length)) why = "Cada time precisa de pelo menos 1 jogador.";
  else if (times && (t[0].length > 4 || t[1].length > 4)) why = "Cada time pode ter até 4 jogadores.";
  else if (!times && !rei && n > 2 && n !== 4 && n !== 8) why = "Mata-mata precisa de 4 ou 8 jogadores. Use o rei do campo.";
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%;font-size:19px;padding:14px" ${why ? "disabled" : ""}>⚽ Apitar o início${times && !why ? ` (${t[0].length}x${t[1].length})` : ""}</button><p class="hint">${why || "Quem dá a primeira saída é sorteado."}</p>`
    : `<p class="muted" style="margin:0">Esperando o organizador apitar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
