// Futebol de Botão da Galera — a mira, o goleiro e o estilingue (parte 3 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- mira (quem joga) ----------
// aim: a minha jogada sendo montada. place = onde arrumei a tampinha na bola parada.
const aim = { i: -1, a: 0, p: 0, place: null, super: false, key: null };
let placing = false; // modo "arrumar a tampinha"
const canAct = () => { const st = shown(); return !!(st && st.phase === "playing" && st.g && ME && st.g.shooter === ME.id && !anim && sNow() >= st.g.busyUntil - 50); };
// posições com a tampinha arrumada (a minha, ou a de quem está cobrando, ao vivo)
function piecesWithPlaces(base) {
  if (!S || !S.g || anim) return base;
  const pl = canAct() ? (aim.place ? { i: aim.i, ...aim.place } : null) : remote && remote.who === S.g.shooter && remote.place ? { i: remote.i, ...remote.place } : null;
  if (!pl || !base[pl.i]) return base;
  const out = base.map((p) => ({ ...p })); out[pl.i].x = pl.x; out[pl.i].y = pl.y;
  return out;
}
function nearestToBall(pieces, side) {
  let best = -1, bd = Infinity; const b = pieces[0];
  pieces.forEach((p, i) => { if (p.k === "btn" && p.t === side) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = i; } } });
  return best;
}
function syncTurn() {
  const st = shown(); if (!st || !st.g || st.phase !== "playing") return;
  const key = `${st.match.gameNo}|${st.g.step}|${st.g.shooter}`;
  if (key === aim.key) return;
  const wasMine = aim.mine;
  aim.key = key; remote = null; placing = false;
  aim.mine = !!(ME && st.g.shooter === ME.id);
  aim.p = 0; aim.place = null; aim.super = false;
  if (aim.mine) {
    const g = st.g, keep = g.pieces[aim.i] && g.pieces[aim.i].t === g.turn && g.toques > 0 && wasMine;
    if (!keep) aim.i = nearestToBall(g.pieces, g.turn);
    const p = g.pieces[aim.i], b = g.pieces[0];
    aim.a = Math.atan2(b.y - p.y, b.x - p.x);
    if (!g.toques) { Sound.play("turn"); bannerShow("SUA VEZ!", "gold"); }
    else if (!wasMine) { Sound.play("turn"); bannerShow("TOCOU PRA VOCÊ!", "gold"); }
    sendAim(true);
  }
}
let aimSent = 0, aimTimer = null;
function sendAim(force) {
  if (!canAct()) return;
  const doIt = () => { aimSent = Date.now(); socket.emit("aim", { i: aim.i, a: aim.a, p: aim.p, place: aim.place }); };
  clearTimeout(aimTimer);
  if (force || Date.now() - aimSent > 60) doIt(); else aimTimer = setTimeout(doIt, 60);
}
socket.on("aim", (d) => { remote = d; });
socket.on("keeper", ({ side, y }) => { if (keeperDrag && keeperDrag.side === side) return; for (const st of [S, pre]) if (st && st.g && st.g.keepers) st.g.keepers[side] = y; });
// Goleiro: qualquer um do time mexe o seu sempre que as peças estão paradas (também enquanto o adversário mira).
let keeperDrag = null, keeperSent = 0, keeperTimer = null;
const canMoveKeeper = () => { const st = shown(); return !!(st && st.g && st.g.keepers && st.phase === "playing" && !anim && mySide() >= 0 && sNow() >= st.g.busyUntil - 50); };
function keeperHit(w) {
  if (!canMoveKeeper()) return false;
  const side = mySide(), ks = B.keeperSeg(side, shown().g.keepers[side]);
  return Math.abs(w.x - ks.ax) < 30 && w.y > ks.ay - 20 && w.y < ks.by + 20;
}
function sendKeeper() {
  const y = keeperDrag.y, doIt = () => { keeperSent = Date.now(); socket.emit("keeper", { y }); };
  clearTimeout(keeperTimer);
  if (Date.now() - keeperSent > 60) doIt(); else keeperTimer = setTimeout(doIt, 60);
}

// Estilingue: aperta (numa tampinha sua para escolher, ou em qualquer lugar para usar a escolhida), puxa e solta.
// A seta aponta para o lado oposto ao que você puxou; quanto mais puxar, mais forte.
const PULL = 170; // quanto puxar (em unidades de mesa) para a força máxima
let ptr = null;
cv.addEventListener("pointerdown", (e) => {
  const st = shown(); if (!st || !st.g || st.phase !== "playing" || anim) return;
  const w = toWorld(e);
  if (keeperHit(w)) { const side = mySide(); cv.setPointerCapture(e.pointerId); keeperDrag = { id: e.pointerId, side, y: st.g.keepers[side], dy: w.y - st.g.keepers[side] }; cv.style.cursor = "grabbing"; return; }
  if (!canAct()) return;
  cv.setPointerCapture(e.pointerId);
  const g = st.g, grab = e.pointerType === "touch" ? RB + 14 : RB + 4, pcs = piecesWithPlaces(g.pieces);
  const hit = pcs.findIndex((p) => p.k === "btn" && p.t === g.turn && Math.hypot(p.x - w.x, p.y - w.y) < grab);
  if (hit >= 0 && hit !== aim.i) { aim.i = hit; aim.place = null; Sound.play("pop"); }
  if (g.setPiece) {
    // bola parada: arrastar a tampinha para perto da bola. Vale com o "✋ Arrumar" ligado, ou direto numa tampinha
    // que ainda está longe da bola (essa não daria para bater dali mesmo).
    const far = hit >= 0 && Math.hypot(pcs[hit].x - pcs[0].x, pcs[hit].y - pcs[0].y) > B.PLACE_R;
    if (placing || far) {
      if (hit >= 0) { ptr = { id: e.pointerId, mode: "place", dx: far ? 0 : pcs[hit].x - w.x, dy: far ? 0 : pcs[hit].y - w.y }; dragPlace(w); }
      else if (placing && aim.i > 0 && pcs[aim.i] && pcs[aim.i].t === g.turn) { ptr = { id: e.pointerId, mode: "place", dx: 0, dy: 0 }; dragPlace(w); } // toque no campo: a escolhida vai para lá
      return;
    }
  }
  ptr = { id: e.pointerId, mode: "aim", x: w.x, y: w.y };
  aim.p = 0; sendAim();
});
cv.addEventListener("pointermove", (e) => {
  const w = toWorld(e);
  if (keeperDrag && keeperDrag.id === e.pointerId) {
    if (!canMoveKeeper()) { keeperDrag = null; return; } // as peças começaram a andar: o goleiro trava
    keeperDrag.y = B.clampKeeper(w.y - keeperDrag.dy);
    for (const st of [S, pre]) if (st && st.g && st.g.keepers) st.g.keepers[keeperDrag.side] = keeperDrag.y;
    sendKeeper();
    return;
  }
  if (!ptr || ptr.id !== e.pointerId || !canAct()) {
    if (e.pointerType === "mouse" && S && S.g && S.phase === "playing") {
      const st = shown();
      cv.style.cursor = keeperHit(w) ? "ns-resize" : canAct() && piecesWithPlaces(st.g.pieces).some((p) => p.k === "btn" && p.t === st.g.turn && Math.hypot(p.x - w.x, p.y - w.y) < RB + 4) ? (placing ? "move" : "grab") : "crosshair";
    }
    return;
  }
  if (ptr.mode === "place") { dragPlace(w); return; }
  const dx = ptr.x - w.x, dy = ptr.y - w.y, d = Math.hypot(dx, dy);
  if (d > 4) { aim.a = Math.atan2(dy, dx); }
  aim.p = Math.max(0, Math.min(1, (d - 6) / PULL));
  sendAim();
});
// leva a tampinha escolhida até o dedo/mouse: se passar do limite, fica na beirada do círculo em volta da bola;
// se cair em cima de outra peça, tenta um pouco mais perto ou mais longe da bola (senão fica onde estava)
function dragPlace(w) {
  const pcs = S.g.pieces, b = pcs[0];
  let x = w.x + ptr.dx, y = w.y + ptr.dy;
  const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy), max = B.PLACE_R - 1;
  if (d > max) { x = b.x + (dx / d) * max; y = b.y + (dy / d) * max; }
  x = Math.max(RB, Math.min(L - RB, x)); y = Math.max(RB, Math.min(W - RB, y));
  for (const k of [1, 0.9, 1.1, 0.8, 1.2, 0.7]) {
    const tx = b.x + (x - b.x) * k, ty = b.y + (y - b.y) * k;
    if (B.placeOk(pcs, aim.i, tx, ty)) { aim.place = { x: tx, y: ty }; sendAim(); return; }
  }
}
const endPtr = (e) => {
  if (keeperDrag && keeperDrag.id === e.pointerId) { const k = keeperDrag; keeperDrag = null; cv.style.cursor = "crosshair"; setTimeout(() => socket.emit("keeper", { y: k.y }), 70); return; }
  if (!ptr || ptr.id !== e.pointerId) return;
  const mode = ptr.mode; ptr = null;
  if (mode === "place") { sendAim(true); renderCtrls(); return; }
  if (aim.p >= 0.04 && canAct()) shoot(); else { aim.p = 0; sendAim(true); }
};
cv.addEventListener("pointerup", endPtr);
cv.addEventListener("pointercancel", (e) => { if (keeperDrag && keeperDrag.id === e.pointerId) keeperDrag = null; if (ptr && ptr.id === e.pointerId) { ptr = null; aim.p = 0; sendAim(true); } });
// teclado: Tab troca de tampinha, ← → miram, ↑ ↓ força, Espaço chuta
document.addEventListener("keydown", (e) => {
  if (!canAct() || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  const g = shown().g;
  if (e.key === "Tab") { const mine = g.pieces.map((p, i) => (p.k === "btn" && p.t === g.turn ? i : -1)).filter((i) => i >= 0); aim.i = mine[(mine.indexOf(aim.i) + (e.shiftKey ? mine.length - 1 : 1)) % mine.length]; aim.place = null; sendAim(); e.preventDefault(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { aim.a += (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.03 : 0.004) * (view.flip ? -1 : 1); sendAim(); e.preventDefault(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") { aim.p = Math.max(0, Math.min(1, aim.p + (e.key === "ArrowUp" ? 0.05 : -0.05))); sendAim(); e.preventDefault(); }
  else if ((e.key === " " || e.key === "Enter") && aim.p >= 0.04) { shoot(); e.preventDefault(); }
});
async function shoot() {
  const data = { i: aim.i, a: aim.a, p: aim.p, place: aim.place, super: aim.super };
  stroke = { i: data.i, a: data.a, p: data.p, t0: sNow() };
  aim.p = 0;
  if (!(await act("shoot", data))) stroke = null;
}
