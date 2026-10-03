// Sinuca da Galera — a mesa, as bolas 3D e a animação da tacada (parte 2 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- mesa: tamanho, desenho da mesa e das bolas ----------
const cv = $("table"), g2 = cv.getContext("2d");
const view = { s: 1, rot: false, dpr: 1, light: [-0.45, -0.55, 0.7] };
let tableImg = null;
function layout() {
  if ($("game").classList.contains("hidden")) return;
  const stage = $("stage"), wrapW = $("game").clientWidth;
  const rot = window.innerWidth < 760 && window.innerHeight > window.innerWidth;
  stage.classList.toggle("rot", rot);
  const hudH = $("hud").offsetHeight + 10, belowH = rot ? 170 : 64;
  const availH = Math.max(260, window.innerHeight - 54 - hudH - belowH - 24);
  const availW = wrapW - (rot ? 0 : 150);
  const s = rot ? Math.min(availW / VH, availH / VW) : Math.min(availW / VW, availH / VH);
  view.s = Math.max(0.25, s); view.rot = rot; view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = Math.round((rot ? VH : VW) * view.s), ch = Math.round((rot ? VW : VH) * view.s);
  cv.style.width = cw + "px"; cv.style.height = ch + "px";
  cv.width = Math.round(cw * view.dpr); cv.height = Math.round(ch * view.dpr);
  $("tablebox").style.width = cw + "px"; $("tablebox").style.height = ch + "px";
  if (rot) { $("power").style.height = ""; } else { $("power").style.height = Math.round(ch * 0.62) + "px"; }
  // no celular em pé, o ajuste fino fica junto da força; na horizontal, embaixo da mesa
  if (rot && $("fine").parentElement !== $("tools")) $("tools").appendChild($("fine"));
  if (!rot && $("fine").parentElement === $("tools")) $("below").prepend($("fine"));
  renderPower();
  view.light = rot ? [0.55, -0.45, 0.7] : [-0.45, -0.55, 0.7];
  const ll = Math.hypot(...view.light); view.light = view.light.map((v) => v / ll);
  tableImg = drawTable(cv.width, cv.height);
  sprites.clear();
}
window.addEventListener("resize", () => { clearTimeout(layout.t); layout.t = setTimeout(layout, 80); });
// transformação mundo → tela (pixels do canvas)
function worldTf(c, k = view.dpr) {
  const s = view.s * k;
  if (!view.rot) c.setTransform(s, 0, 0, s, FRAME * s, FRAME * s);
  else c.setTransform(0, -s, s, 0, FRAME * s, (L + FRAME) * s);
}
function toWorld(ev) {
  const r = cv.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top, s = view.s;
  return view.rot ? { x: L + FRAME - sy / s, y: sx / s - FRAME } : { x: sx / s - FRAME, y: sy / s - FRAME };
}
function toScreen(x, y) { // mundo → posição na página (para emojis e avisos)
  const r = cv.getBoundingClientRect(), s = view.s;
  return view.rot ? { x: r.left + (y + FRAME) * s, y: r.top + (L + FRAME - x) * s } : { x: r.left + (x + FRAME) * s, y: r.top + (y + FRAME) * s };
}
function rng(seed) { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }

function drawTable(pw, ph) {
  const oc = document.createElement("canvas"); oc.width = pw; oc.height = ph;
  const c = oc.getContext("2d");
  worldTf(c);
  const F = FRAME, rnd = rng(7);
  // madeira
  const rr = (x, y, w, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, r) : c.rect(x, y, w, hh); };
  rr(-F, -F, L + 2 * F, W + 2 * F, 26);
  const wg = c.createLinearGradient(0, -F, 0, W + F);
  wg.addColorStop(0, "#7a4827"); wg.addColorStop(0.5, "#5a321a"); wg.addColorStop(1, "#3f2210");
  c.fillStyle = wg; c.fill();
  c.save(); c.clip();
  c.globalAlpha = 0.18;
  for (let i = 0; i < 140; i++) { // veios
    c.strokeStyle = rnd() < 0.5 ? "#2a1408" : "#a06a3e"; c.lineWidth = 0.6 + rnd() * 1.6;
    const y = -F + rnd() * (W + 2 * F); c.beginPath(); c.moveTo(-F, y);
    for (let x = -F; x <= L + F; x += 60) c.lineTo(x, y + Math.sin(x / 90 + i) * 2.5 + (rnd() - 0.5) * 2);
    c.stroke();
  }
  c.restore();
  c.globalAlpha = 1;
  // brilho na borda da madeira
  rr(-F + 2, -F + 2, L + 2 * F - 4, W + 2 * F - 4, 24); c.strokeStyle = "#ffffff22"; c.lineWidth = 2; c.stroke();
  // sombra interna perto do pano
  c.fillStyle = "#1a0d05"; c.fillRect(-18, -18, L + 36, W + 36);
  // pano
  const fg = c.createRadialGradient(L / 2, W / 2, 60, L / 2, W / 2, L * 0.62);
  fg.addColorStop(0, "#23905a"); fg.addColorStop(0.6, "#1b7a4b"); fg.addColorStop(1, "#11583a");
  c.fillStyle = fg; c.fillRect(-18, -18, L + 36, W + 36);
  // textura do pano
  c.globalAlpha = 0.05;
  for (let i = 0; i < 2600; i++) { c.fillStyle = rnd() < 0.5 ? "#000" : "#fff"; c.fillRect(rnd() * L, rnd() * W, 1.4, 1.4); }
  c.globalAlpha = 1;
  // tabelas (borrachas)
  const C = 18;
  c.fillStyle = "#156a41";
  for (const r of Fi.RAILS) {
    const cornerA = r.a === Fi.CG, cornerB = r.b === (r.h ? L - Fi.CG : W - Fi.CG);
    const inA = cornerA ? C * 0.9 : C * 0.45, inB = cornerB ? C * 0.9 : C * 0.45;
    const off = -C * r.n; // para fora do pano
    c.beginPath();
    if (r.h) { c.moveTo(r.a, r.at); c.lineTo(r.b, r.at); c.lineTo(r.b + inB * 0 + (cornerB ? C : C * 0.6), r.at + off); c.lineTo(r.a - (cornerA ? C : C * 0.6), r.at + off); }
    else { c.moveTo(r.at, r.a); c.lineTo(r.at, r.b); c.lineTo(r.at + off, r.b + (cornerB ? C : C * 0.6)); c.lineTo(r.at + off, r.a - (cornerA ? C : C * 0.6)); }
    c.closePath(); c.fill();
    // brilho no nariz da tabela
    c.strokeStyle = "#3fbf7f55"; c.lineWidth = 1.6; c.beginPath();
    if (r.h) { c.moveTo(r.a, r.at + 0.8 * r.n); c.lineTo(r.b, r.at + 0.8 * r.n); } else { c.moveTo(r.at + 0.8 * r.n, r.a); c.lineTo(r.at + 0.8 * r.n, r.b); }
    c.stroke();
  }
  // sombra das tabelas no pano
  const edge = (x0, y0, x1, y1, gx0, gy0, gx1, gy1) => { const g = c.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, "#0007"); g.addColorStop(1, "#0000"); c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0); };
  edge(0, 0, L, 14, 0, 0, 0, 14); edge(0, W - 14, L, W, 0, W, 0, W - 14); edge(0, 0, 14, W, 0, 0, 14, 0); edge(L - 14, 0, L, W, L, 0, L - 14, 0);
  // linha de saída e marcas
  c.strokeStyle = "#ffffff1f"; c.lineWidth = 1.5; c.setLineDash([6, 8]);
  c.beginPath(); c.moveTo(Fi.HEAD_X, 4); c.lineTo(Fi.HEAD_X, W - 4); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#ffffff40";
  for (const [x, y] of [[Fi.FOOT_X, Fi.MID_Y], [Fi.HEAD_X, Fi.MID_Y]]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
  // caçapas
  for (const p of Fi.POCKETS) {
    const corner = p.r > 24, cx = corner ? p.x + Math.sign(p.x - L / 2) * -2 : p.x, cy = corner ? p.y + Math.sign(p.y - W / 2) * -2 : p.y + Math.sign(p.y) * -2;
    const rad = corner ? 25 : 22;
    c.fillStyle = "#2b1a0f"; c.beginPath(); c.arc(cx, cy, rad + 5, 0, 7); c.fill();
    const hg = c.createRadialGradient(cx, cy, 2, cx, cy, rad);
    hg.addColorStop(0, "#000"); hg.addColorStop(0.75, "#050505"); hg.addColorStop(1, "#1d1d1d");
    c.fillStyle = hg; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fill();
  }
  // diamantes
  c.fillStyle = "#f1e6c8";
  const dia = (x, y, rot) => { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(0, -5); c.lineTo(3.2, 0); c.lineTo(0, 5); c.lineTo(-3.2, 0); c.closePath(); c.fill(); c.restore(); };
  for (let k = 1; k < 8; k++) if (k !== 4) { dia((L / 8) * k, -F / 2 - 6, Math.PI / 2); dia((L / 8) * k, W + F / 2 + 6, Math.PI / 2); }
  for (let k = 1; k < 4; k++) { dia(-F / 2 - 6, (W / 4) * k, 0); dia(L + F / 2 + 6, (W / 4) * k, 0); }
  // plaquinha
  c.save(); c.translate(L / 2, W + F / 2 + 6); if (view.rot) c.rotate(0);
  c.font = "15px 'Bebas Neue', Impact, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = "#00000055"; c.fillText("SINUCA DA GALERA", 0.8, 1.2); c.fillStyle = "#e9b94999"; c.fillText("SINUCA DA GALERA", 0, 0);
  c.restore();
  return oc;
}

// Bolas 3D: cada bola tem uma orientação (matriz 3×3) que gira conforme ela rola. O desenho é feito pixel a pixel
// (cor, faixa das listradas, círculo do número, luz e brilho) num canvas pequeno, e o número vai por cima.
const ori = new Map(), lastPos = new Map(), sprites = new Map();
const ident = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
function rotateBall(n, dx, dy) {
  const d = Math.sqrt(dx * dx + dy * dy); if (d < 1e-4) return;
  const m = ori.get(n) || ident(), th = d / R, ux = -dy / d, uy = dx / d, c = Math.cos(th), s = Math.sin(th);
  for (let k = 0; k < 3; k++) {
    const vx = m[k * 3], vy = m[k * 3 + 1], vz = m[k * 3 + 2];
    const dot = ux * vx + uy * vy;
    // Rodrigues com eixo (ux, uy, 0)
    const cx = uy * vz, cy = -ux * vz, cz = ux * vy - uy * vx;
    m[k * 3] = vx * c + cx * s + ux * dot * (1 - c);
    m[k * 3 + 1] = vy * c + cy * s + uy * dot * (1 - c);
    m[k * 3 + 2] = vz * c + cz * s;
  }
  // reortonormaliza
  let [ax, ay, az] = [m[0], m[1], m[2]]; let l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
  let [bx, by, bz] = [m[3], m[4], m[5]]; const dab = ax * bx + ay * by + az * bz; bx -= dab * ax; by -= dab * ay; bz -= dab * az; l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
  m.splice(0, 9, ax, ay, az, bx, by, bz, ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  ori.set(n, m); sprites.delete(n);
}
function ballSprite(n, px) {
  const key = n, cached = sprites.get(key);
  if (cached && cached.width === px) return cached;
  const m = ori.get(n) || ident();
  const oc = cached && cached.width === px ? cached : document.createElement("canvas"); oc.width = oc.height = px;
  const c = oc.getContext("2d"), img = c.createImageData(px, px), d = img.data;
  const base = hex(colorOf(n)), white = [246, 243, 234], red = [210, 30, 30];
  const [lx, ly, lz] = view.light, hx = lx, hy = ly, hz = lz + 1, hl = Math.hypot(hx, hy, hz);
  const stripe = n > 8, half = px / 2;
  for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
    let x = (i + 0.5 - half) / half, y = (j + 0.5 - half) / half;
    const r2 = x * x + y * y, distPx = Math.sqrt(r2) * half, a = Math.min(1, Math.max(0, half - distPx + 0.5));
    const o = (j * px + i) * 4;
    if (a <= 0) { d[o + 3] = 0; continue; }
    let rr = r2; if (rr > 0.9999) { const k = Math.sqrt(0.9999 / rr); x *= k; y *= k; rr = 0.9999; }
    const z = Math.sqrt(1 - rr);
    const u = m[0] * x + m[1] * y + m[2] * z, v = m[3] * x + m[4] * y + m[5] * z, w = m[6] * x + m[7] * y + m[8] * z;
    // bordas suaves entre as cores (e = largura de ~1 pixel na superfície da bola)
    const e = 1.4 / half, sm = (d) => Math.min(1, Math.max(0, d / e + 0.5));
    let col;
    if (n === 0) col = mix(white, red, sm(Math.max(Math.abs(u), Math.abs(v), Math.abs(w)) - 0.965));
    else {
      col = stripe ? mix(white, base, sm(0.5 - Math.abs(v))) : base;
      col = mix(col, white, sm(Math.abs(w) - 0.86));
    }
    const diff = Math.max(0, x * lx + y * ly + z * lz);
    const spec = Math.pow(Math.max(0, (x * hx + y * hy + z * hz) / hl), 60);
    const rim = 0.72 + 0.28 * z;
    const k = (0.38 + 0.72 * diff) * rim;
    d[o] = Math.min(255, col[0] * k + 255 * spec * 0.85);
    d[o + 1] = Math.min(255, col[1] * k + 255 * spec * 0.85);
    d[o + 2] = Math.min(255, col[2] * k + 255 * spec * 0.85);
    d[o + 3] = a * 255;
  }
  c.putImageData(img, 0, 0);
  sprites.set(key, oc);
  return oc;
}
function mix(a, b, t) { return t <= 0 ? a : t >= 1 ? b : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function hex(s) { const v = parseInt(s.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
let shadowImg = null;
function shadowSprite() {
  if (shadowImg) return shadowImg;
  const oc = document.createElement("canvas"); oc.width = oc.height = 64; const c = oc.getContext("2d");
  const g = c.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, "#000a"); g.addColorStop(0.55, "#0005"); g.addColorStop(1, "#0000");
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); return (shadowImg = oc);
}
function drawBall(c, n, x, y, scale = 1, alpha = 1) {
  const px = Math.max(8, Math.round(2 * R * view.s * view.dpr));
  c.globalAlpha = alpha;
  c.drawImage(ballSprite(n, px), x - R * scale, y - R * scale, 2 * R * scale, 2 * R * scale);
  if (n > 0 && scale > 0.6) { // número
    const m = ori.get(n) || ident();
    for (const f of [1, -1]) {
      const cz = m[8] * f; if (cz < 0.3) continue;
      const cx = m[6] * f, cy = m[7] * f, k = (R / 20) * scale;
      c.save();
      c.transform(m[0] * f * k, m[1] * f * k, m[3] * k, m[4] * k, x + cx * R * scale, y + cy * R * scale);
      c.fillStyle = `rgba(17,17,17,${Math.min(1, (cz - 0.3) * 3)})`;
      c.font = `800 ${n > 9 ? 11 : 13}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(String(n), 0, 1);
      c.restore();
    }
  }
  c.globalAlpha = 1;
}

// ---------- animação da tacada ----------
function startAnim(sh, old) {
  const r = Fi.simulate(sh.start, sh, { frames: true, events: true });
  const lastOn = sh.start.map((b, i) => { for (let k = r.frames.length - 1; k >= 0; k--) if (r.frames[k][i * 3 + 2]) return k; return 0; });
  pre = old && old.g ? old : S;
  anim = { shot: sh, frames: r.frames, events: r.events, ei: 0, lastOn, start: sh.start };
  // de onde o taco sai: o golpe que eu mesmo comecei, a última mira recebida de quem jogou, ou a força da tacada
  const mineStroke = stroke && ME && sh.by === ME.id ? stroke : null;
  const p0 = mineStroke ? mineStroke.p : remote && remote.who === sh.by && remote.p > 0.02 ? remote.p : Math.pow(sh.v / Fi.VMAX, 0.8);
  // mesma duração do golpe para todos: o taco chega na branca e espera o contato (sh.at) encostado nela
  anim.stroke = { p: p0, t0: mineStroke ? mineStroke.t0 : sh.at - STROKE_MS(p0), dur: STROKE_MS(p0) };
  stroke = null;
  for (const b of sh.start) lastPos.set(b.n, { x: b.x, y: b.y });
}
function finishAnim() {
  anim = null; pre = null;
  render();
}
// posições para desenhar agora
function currentBalls() {
  if (!S || !S.g) return [];
  if (anim) {
    const t = (sNow() - anim.shot.at) / 1000;
    if (t < 0) return anim.start.map((b) => ({ n: b.n, x: b.x, y: b.y }));
    const k = Math.min(anim.frames.length - 1, Math.floor(t * 60)), f = anim.frames[k], out = [];
    anim.start.forEach((b, i) => {
      if (f[i * 3 + 2]) out.push({ n: b.n, x: f[i * 3], y: f[i * 3 + 1] });
      else { // caindo na caçapa
        const ev = anim.events.find((e) => e.k === "pocket" && e.n === b.n);
        const dt = ev ? t - ev.t : 1;
        if (dt < 0.22) { const lf = anim.frames[anim.lastOn[i]], p = Fi.POCKETS[ev.p], q = dt / 0.22; out.push({ n: b.n, x: lf[i * 3] + (p.x - lf[i * 3]) * q, y: lf[i * 3 + 1] + (p.y - lf[i * 3 + 1]) * q, scale: 1 - 0.45 * q, alpha: 1 - q * 0.8 }); }
      }
    });
    return out;
  }
  return S.g.balls;
}
