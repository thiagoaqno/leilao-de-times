// Sinuca da Galera — a mira e a entrada na mesa (taco) (parte 3 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- mira (quem joga) ----------
const aim = { a: 0, p: 0, sx: 0, sy: 0, cx: null, cy: null, pk: -1, pkManual: false, dragCue: false, aiming: false, cueOk: true, key: null };
const myTurn = () => { const st = shown(); return !!(st && st.phase === "playing" && st.g && ME && st.g.shooter === ME.id && !anim && sNow() >= st.g.busyUntil - 50); };
// a próxima tacada é minha, mesmo que as bolas ainda estejam terminando de parar: dá para já começar a puxar o taco
// (antes, um toque um instante antes de a vez liberar era ignorado e era preciso soltar e tocar de novo)
const vezChegando = () => !!(S && S.phase === "playing" && S.g && ME && S.g.shooter === ME.id);
let tacadaPendente = null, puxando = false;
// soltou o taco antes de a vez liberar de fato: a tacada sai assim que as bolas pararem (até 15 s). O relógio do
// servidor pode estar um pouquinho atrás do daqui: se ele responder "espere as bolas pararem", tenta de novo em seguida.
function shootQuandoPuder() {
  const t0 = Date.now(), p = aim.p; clearTimeout(tacadaPendente);
  const tenta = async () => {
    if (Date.now() - t0 > 15000 || !vezChegando()) { tacadaPendente = null; aim.p = 0; renderPower(); return; }
    if (!myTurn()) { tacadaPendente = setTimeout(tenta, 40); return; }
    aim.p = p; tacadaPendente = setTimeout(() => {}, 0); // marca como pendente enquanto a tacada vai
    const r = await shoot(true);
    if (r === "cedo") tacadaPendente = setTimeout(tenta, 150); else tacadaPendente = null;
  };
  tenta();
}
function cuePos() {
  const g = shown().g;
  if (myTurn() && g.ballInHand && aim.cx != null) return { x: aim.cx, y: aim.cy };
  if (!myTurn() && remote && remote.who === g.shooter && g.ballInHand && remote.cx != null) return { x: remote.cx, y: remote.cy };
  const c = g.balls.find((b) => b.n === 0);
  if (c) return { x: c.x, y: c.y };
  return defaultCue(g);
}
function defaultCue(g) {
  const others = g.balls.filter((b) => b.n !== 0);
  for (let dx = 0; dx < 400; dx += 6) for (const sgn of [1, -1]) {
    const x = Fi.HEAD_X - 40 + dx * (g.kitchen ? -1 : sgn) * (g.kitchen ? 0.3 : 1), y = Fi.MID_Y + (dx % 60) * sgn;
    if (Fi.freeSpot(others, x, y, g.kitchen)) return { x, y };
  }
  return { x: Fi.HEAD_X - 40, y: Fi.MID_Y };
}
function legalFor(g, side) {
  const own = g.groups[side];
  return (n) => (own == null ? n !== 8 : g.onEight[side] ? n === 8 : Fi.group(n) === own);
}
function syncTurn() {
  const st = shown(); if (!st || !st.g || st.phase !== "playing") return;
  const key = `${st.match.rackNo}|${st.g.step}|${st.g.shooter}`;
  if (key === aim.key) return;
  aim.key = key;
  remote = null;
  if (ME && st.g.shooter === ME.id) {
    const g = st.g, cue = g.balls.find((b) => b.n === 0) || defaultCue(g);
    if (g.ballInHand) { const c = g.balls.find((b) => b.n === 0); const ok = c && Fi.freeSpot(g.balls.filter((b) => b.n), c.x, c.y, g.kitchen); const pos = ok ? c : defaultCue(g); aim.cx = pos.x; aim.cy = pos.y; }
    else { aim.cx = aim.cy = null; }
    const cp = g.ballInHand ? { x: aim.cx, y: aim.cy } : cue;
    let tx = Fi.FOOT_X, ty = Fi.MID_Y;
    if (!g.isBreak) {
      const legal = legalFor(g, g.turn); let bd = Infinity;
      for (const b of g.balls) if (b.n && legal(b.n)) { const d = Math.hypot(b.x - cp.x, b.y - cp.y); if (d < bd) { bd = d; tx = b.x; ty = b.y; } }
    }
    // já estava puxando o taco (começou antes de a vez liberar): mantém a mira e a força de quem está jogando
    if (!puxando && !tacadaPendente) { aim.a = Math.atan2(ty - cp.y, tx - cp.x); aim.p = 0; }
    aim.sx = aim.sy = 0; aim.pk = -1; aim.pkManual = false; aim.cueOk = true;
    renderSpin(); renderPower();
    Sound.play("turn");
    bannerShow("SUA VEZ!", "gold");
    sendAim();
  }
}
let aimSent = 0, aimTimer = null;
function sendAim(force) {
  if (!myTurn()) return;
  const doIt = () => { aimSent = Date.now(); socket.emit("aim", { a: aim.a, p: aim.p, cx: aim.cx, cy: aim.cy, sx: aim.sx, sy: aim.sy, pk: aim.pk, drag: aim.dragCue }); };
  clearTimeout(aimTimer);
  if (force || Date.now() - aimSent > 60) doIt(); else aimTimer = setTimeout(doIt, 60);
}
socket.on("aim", (d) => { remote = d; });

// A 8: sugere a caçapa para onde a linha da mira manda a 8 (até a pessoa tocar numa caçapa).
function suggestPocket(tr) {
  if (!tr || !tr.ball || tr.ball.n !== 8) return;
  let best = -1, bd = Infinity;
  Fi.POCKETS.forEach((p, i) => {
    const ox = p.x - tr.ball.x, oy = p.y - tr.ball.y, proj = ox * tr.obj.dx + oy * tr.obj.dy; if (proj <= 0) return;
    const perp = Math.abs(ox * tr.obj.dy - oy * tr.obj.dx); if (perp < bd) { bd = perp; best = i; }
  });
  if (best >= 0) aim.pk = best;
}

// ---------- entrada: mesa ----------
let ptr = null;
cv.addEventListener("pointerdown", (e) => {
  if (!myTurn()) return;
  const g = shown().g, w = toWorld(e), cue = cuePos();
  cv.setPointerCapture(e.pointerId);
  if (g.onEight[g.turn]) {
    const pi = Fi.POCKETS.findIndex((p) => Math.hypot(p.x - w.x, p.y - w.y) < 42);
    if (pi >= 0) { aim.pk = pi; aim.pkManual = true; Sound.play("pop"); sendAim(true); return; }
  }
  const grab = e.pointerType === "touch" ? 34 : 20;
  if (g.ballInHand && Math.hypot(w.x - cue.x, w.y - cue.y) < grab) { ptr = { mode: "cue", id: e.pointerId, lastOk: { x: aim.cx, y: aim.cy } }; aim.dragCue = true; cv.style.cursor = "grabbing"; return; }
  ptr = { mode: "aim", id: e.pointerId };
  setAimTo(w);
});
cv.addEventListener("pointermove", (e) => {
  if (!ptr || ptr.id !== e.pointerId || !myTurn()) {
    if (myTurn() && shown().g.ballInHand && e.pointerType === "mouse") { const w = toWorld(e), c = cuePos(); cv.style.cursor = Math.hypot(w.x - c.x, w.y - c.y) < 20 ? "grab" : "crosshair"; }
    return;
  }
  const w = toWorld(e), g = shown().g;
  if (ptr.mode === "cue") {
    const x = Math.max(R, Math.min((g.kitchen ? Fi.HEAD_X : L - R), w.x)), y = Math.max(R, Math.min(W - R, w.y));
    aim.cx = x; aim.cy = y; aim.cueOk = Fi.freeSpot(g.balls.filter((b) => b.n), x, y, g.kitchen);
    if (aim.cueOk) ptr.lastOk = { x, y };
    sendAim();
  } else setAimTo(w);
});
const endPtr = (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  if (ptr.mode === "cue") { if (!aim.cueOk) { aim.cx = ptr.lastOk.x; aim.cy = ptr.lastOk.y; aim.cueOk = true; } aim.dragCue = false; cv.style.cursor = "crosshair"; sendAim(true); }
  ptr = null;
};
cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);
function setAimTo(w) {
  const c = cuePos(); if (Math.hypot(w.x - c.x, w.y - c.y) < 4) return;
  aim.a = Math.atan2(w.y - c.y, w.x - c.x); sendAim();
}
cv.addEventListener("wheel", (e) => { if (!myTurn()) return; e.preventDefault(); aim.a += Math.sign(e.deltaY) * (e.shiftKey ? 0.01 : 0.0015); sendAim(); }, { passive: false });

// ajuste fino
(() => {
  const el = $("fine"); let st = null;
  el.addEventListener("pointerdown", (e) => { if (!myTurn()) return; el.setPointerCapture(e.pointerId); st = { x: e.clientX, a: aim.a }; });
  el.addEventListener("pointermove", (e) => { if (!st) return; aim.a = st.a + (e.clientX - st.x) * 0.0009; sendAim(); });
  const end = () => (st = null); el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
})();

// efeito (onde o taco bate na branca)
(() => {
  const el = $("spin"); let on = false;
  const set = (e) => { const r = el.getBoundingClientRect(); let x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1); const l = Math.hypot(x, y); if (l > 0.8) { x *= 0.8 / l; y *= 0.8 / l; } aim.sx = Math.round(x / 0.8 * 100) / 100; aim.sy = Math.round(y / 0.8 * 100) / 100; renderSpin(); sendAim(); };
  el.addEventListener("pointerdown", (e) => { if (!myTurn()) return; el.setPointerCapture(e.pointerId); on = true; set(e); });
  el.addEventListener("pointermove", (e) => on && set(e));
  el.addEventListener("pointerup", () => (on = false)); el.addEventListener("pointercancel", () => (on = false));
  el.addEventListener("dblclick", () => { if (!myTurn()) return; aim.sx = aim.sy = 0; renderSpin(); sendAim(); });
})();
function renderSpin() { const d = $("spinDot"); d.style.left = 50 + aim.sx * 40 + "%"; d.style.top = 50 - aim.sy * 40 + "%"; }

// força: puxa o taco para trás e solta
(() => {
  const el = $("power"); let st = null;
  const len = () => (view.rot ? el.clientWidth : el.clientHeight) - 12;
  el.addEventListener("pointerdown", (e) => { if (!myTurn() && !vezChegando()) return; el.setPointerCapture(e.pointerId); st = { x: e.clientX, y: e.clientY }; aim.p = 0; puxando = true; });
  el.addEventListener("pointermove", (e) => {
    if (!st) return;
    const d = view.rot ? st.x - e.clientX : e.clientY - st.y;
    aim.p = Math.max(0, Math.min(1, d / len())); renderPower(); sendAim();
  });
  const end = (e) => { if (!st) return; st = null; puxando = false; if (aim.p >= 0.02 && vezChegando()) shootQuandoPuder(); else { aim.p = 0; renderPower(); sendAim(true); } };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", () => { st = null; puxando = false; aim.p = 0; renderPower(); });
})();
function renderPower() {
  const p = aim.p, rot = view.rot;
  $("powerFill").style[rot ? "width" : "height"] = p * 100 + "%";
  $("powerFill").style[rot ? "height" : "width"] = "";
  $("powerStick").style.transform = rot ? `translate(${-p * 60}%, -50%)` : `translate(-50%, ${p * 55}%)`;
  $("powerLbl").textContent = p > 0 ? Math.round(p * 100) + "%" : "";
}
document.addEventListener("keydown", (e) => {
  if (!myTurn() || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { aim.a += (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.02 : 0.002); sendAim(); e.preventDefault(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") { aim.p = Math.max(0, Math.min(1, aim.p + (e.key === "ArrowUp" ? 0.05 : -0.05))); renderPower(); sendAim(); e.preventDefault(); }
  else if ((e.key === " " || e.key === "Enter") && aim.p >= 0.02) { shoot(); e.preventDefault(); }
});
// Golpe do taco (estilingue): ao soltar, o taco sai do ponto puxado e acelera até a branca, que parte em shot.at.
let stroke = null;
const STROKE_MS = (p) => 170 - 90 * p; // mais força, golpe mais rápido
const ease = (k) => k * k * k;
async function shoot(pendente = false) {
  const g = shown().g;
  if (g.onEight[g.turn] && aim.pk < 0) { toast("Escolha a caçapa da 8: toque numa caçapa."); aim.p = 0; renderPower(); return; }
  if (g.ballInHand && !aim.cueOk) { toast("A branca não pode ficar aí."); return; }
  const cue = cuePos();
  const data = { a: aim.a, p: aim.p, sx: aim.sx, sy: aim.sy, pk: aim.pk, cx: cue.x, cy: cue.y };
  stroke = { p: data.p, t0: sNow(), a: data.a, cx: cue.x, cy: cue.y, sx: data.sx, sy: data.sy };
  aim.p = 0; renderPower();
  if (pendente) { // tacada que estava esperando a vez: se o servidor ainda acha cedo, volta a esperar (sem aviso na tela)
    const r = await new Promise((res) => socket.emit("act", { type: "shoot", ...data }, res));
    if (r && r.ok) return "ok";
    stroke = null;
    if (r && /parar/i.test(r.error || "")) { aim.p = data.p; renderPower(); return "cedo"; }
    toast(r ? r.error : "Sem conexão."); return "erro";
  }
  if (!(await act("shoot", data))) stroke = null;
}
