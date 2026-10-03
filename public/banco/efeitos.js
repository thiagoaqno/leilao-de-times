// Banco da Galera — sons, reações, evento da rodada e escrituras (parte 4 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- sons ----------
// Gerados na hora pelo próprio navegador (Web Audio), sem arquivos para baixar.
// O navegador só libera o som depois do primeiro toque na página.
const Sound = (() => {
  let ctx = null, muted = !!store.get("banco:mute");
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  function tone(freq, dur, { type = "sine", vol = 0.2, at = 0, slide = 0 } = {}) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1 } = {}) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + at, buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  const sounds = {
    dice() { for (let k = 0; k < 8; k++) noise(0.05, { at: k * 0.08 + Math.random() * 0.03, vol: 0.5, freq: 1500 + Math.random() * 2000, q: 4 }); },
    step() { tone(500 + Math.random() * 80, 0.05, { type: "triangle", vol: 0.04 }); },
    coin() { tone(1319, 0.1, { type: "square", vol: 0.05 }); tone(1976, 0.35, { type: "square", vol: 0.05, at: 0.08 }); },
    pay() { tone(587, 0.1, { type: "triangle", vol: 0.12 }); tone(392, 0.22, { type: "triangle", vol: 0.12, at: 0.09 }); },
    knock() { tone(240, 0.08, { vol: 0.3, slide: 120 }); noise(0.03, { vol: 0.3, freq: 1200 }); },
    gavel() { for (const at of [0, 0.25]) { tone(150, 0.22, { vol: 0.55, slide: 55, at }); noise(0.07, { vol: 0.6, freq: 800, at }); } },
    siren() { for (let k = 0; k < 3; k++) { tone(650, 0.32, { type: "sawtooth", vol: 0.06, at: k * 0.5, slide: 1000 }); tone(1000, 0.18, { type: "sawtooth", vol: 0.06, at: k * 0.5 + 0.32, slide: 650 }); } },
    card() { noise(0.2, { vol: 0.35, freq: 4500, q: 0.6 }); tone(880, 0.12, { type: "triangle", vol: 0.06, at: 0.45 }); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, k) => tone(f, k === 5 ? 0.5 : 0.16, { type: "square", vol: 0.06, at: k * 0.11 })); },
    boom() { noise(0.7, { vol: 1, freq: 180, q: 0.4 }); tone(95, 0.55, { vol: 0.5, slide: 35 }); },
    shield() { tone(660, 0.45, { vol: 0.12, slide: 1320 }); tone(1320, 0.5, { type: "triangle", vol: 0.08, at: 0.15 }); },
    deed() { noise(0.14, { vol: 0.25, freq: 5000, q: 0.8 }); },
    pop() { tone(700, 0.09, { vol: 0.12, slide: 1500 }); },
    turn() { tone(784, 0.12, { type: "triangle", vol: 0.14 }); tone(1175, 0.3, { type: "triangle", vol: 0.14, at: 0.11 }); },
  };
  return {
    play(n) { try { if (!muted && !document.hidden) sounds[n] && sounds[n](); } catch {} },
    get muted() { return muted; },
    toggle() { muted = !muted; store.set("banco:mute", muted); if (!muted) ac(); return muted; },
    unlock() { if (!muted) ac(); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
function renderSoundBtn() { Comum.iconeSom(!Sound.muted, { titulo: true }); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); if (!Sound.muted) Sound.play("coin"); };
renderSoundBtn();

// ---------- reações ----------
function renderReacts() {
  const m = me(), el = $("reacts");
  const show = m && !m.bankrupt && S.phase === "playing";
  el.classList.toggle("hidden", !show);
  if (show && !el.dataset.built) {
    el.dataset.built = 1;
    el.innerHTML = T.REACTIONS.map((e) => `<button data-rx="${e}" aria-label="Reagir com ${e}">${e}</button>`).join("");
    el.querySelectorAll("[data-rx]").forEach((b) => (b.onclick = () => socket.emit("react", { emoji: b.dataset.rx })));
  }
}
// O emoji sobe em cima do peão de quem mandou (ou da placa, se o peão não estiver visível).
socket.on("react", ({ player, emoji }) => {
  if (!S || !T.REACTIONS.includes(emoji)) return;
  const head = pieceEls[player] && pieceEls[player].querySelector(".head");
  const box = (head && head.getBoundingClientRect().width ? head : $("pl-" + player));
  if (!box) return;
  const r = box.getBoundingClientRect();
  Comum.flutuar(emoji, r.left + r.width / 2 + (Math.random() * 16 - 8), r.top, { classe: "rx", onde: $("fly"), fica: 2300 });
  Sound.play("pop");
});

// ---------- evento da rodada ----------
let lastEvent;
function checkEvent() {
  const seq = S.event ? S.event.seq : null;
  if (lastEvent === undefined) { lastEvent = seq; return; } // ao entrar na mesa, não mostra o que já passou
  if (!S.event || seq === lastEvent) { lastEvent = seq ?? lastEvent; return; }
  lastEvent = seq;
  const e = S.event, el = document.createElement("div");
  el.className = "banner";
  el.innerHTML = `<div class="ic">${e.icon}</div><small>Evento da rodada ${S.round}</small><h3>${h(e.name)}</h3><p>${h(e.text)}</p>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4100);
  Sound.play("fanfare");
}

// ---------- escrituras, demolição e escudo ----------
const gInk = (i) => (BOARD[i].group ? GROUPS[BOARD[i].group].ink : "var(--ink)");
function flyDeed(e) {
  const s = BOARD[e.sq];
  const a = e.from === "pile" ? spotEl($("pileDeed")) : spot(e.from, e.sq), b = spot(e.to, e.sq);
  const n = document.createElement("div");
  n.className = "deedfly";
  n.style.setProperty("--g", s.group ? GROUPS[s.group].color : "#ece0bf"); n.style.setProperty("--gi", gInk(e.sq));
  n.innerHTML = `<i>${h(s.name)}</i><span>ESCRITURA</span>`;
  $("fly").appendChild(n);
  const at = (x, y, sc, ry, r) => `translate(${x}px, ${y}px) translate(-50%, -50%) perspective(600px) rotateY(${ry}deg) rotate(${r}deg) scale(${sc})`;
  const flip = e.from === "pile" ? 180 : 0, lift = Math.min(160, 60 + Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
  n.animate([
    { transform: at(a.x, a.y, 0.5, flip, -6), opacity: 0 },
    { transform: at(a.x, a.y - 30, 1.2, flip / 2, 0), opacity: 1, offset: 0.25 },
    { transform: at((a.x + b.x) / 2, (a.y + b.y) / 2 - lift, 1.25, 0, 6), opacity: 1, offset: 0.6 },
    { transform: at(b.x, b.y, 0.6, 0, 0), opacity: 0.9 },
  ], { duration: 1300, easing: "cubic-bezier(.45,0,.35,1)", fill: "both" }).finished.then(() => n.remove(), () => n.remove());
  Sound.play(e.gavel ? "gavel" : "deed");
}
function spotEl(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function burstAt(sq, emoji, cls) {
  const el = document.createElement("div"), p = spotEl($("sq" + sq));
  el.className = "burst " + (cls || ""); el.textContent = emoji;
  el.style.left = p.x + "px"; el.style.top = p.y + "px";
  $("fly").appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
function boomAt(sq) {
  burstAt(sq, "💥");
  const sc = document.querySelector(".scene"); sc.classList.remove("shake"); void sc.offsetWidth; sc.classList.add("shake");
  const q = $("sq" + sq); q.classList.remove("boomed"); void q.offsetWidth; q.classList.add("boomed");
  Sound.play("boom");
}
function shieldAt(sq) { burstAt(sq, "🛡️", "shieldfx"); Sound.play("shield"); }

// ---------- sons ligados ao estado ----------
let lastTurnKey = null, lastBid = 0, lastCardSnd = null;
function stateSounds() {
  const key = S.phase === "playing" ? `${S.turn}|${S.round}` : null;
  if (ME && S.turn === ME.id && S.stage === "roll" && lastTurnKey !== null && key !== lastTurnKey) Sound.play("turn");
  lastTurnKey = key;
  const bid = S.auction ? S.auction.bid : 0;
  if (bid > lastBid) Sound.play("knock");
  lastBid = bid;
  if (S.card && S.card.seq !== lastCardSnd) { if (lastCardSnd !== null) Sound.play("card"); lastCardSnd = S.card.seq; }
  else if (!S.card && lastCardSnd === null) lastCardSnd = 0;
}
