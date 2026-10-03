// Futebol de Botão da Galera — a mesa, as peças e a animação da jogada (parte 2 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- mesa: tamanho e transformação mundo → tela ----------
const cv = $("table"), g2 = cv.getContext("2d");
const view = { s: 1, rot: false, flip: false, dpr: 1, open: false, fr: B.GD + 22 };
const VW = () => L + 2 * view.fr, VH = () => W + 2 * view.fr;
let tableImg = null;
function layout() {
  if ($("game").classList.contains("hidden")) return;
  view.open = cfg().mesa === "aberta";
  view.fr = view.open ? B.MARGIN + 20 : B.GD + 22; // área desenhada: campo, (faixa de fora), gols e moldura
  const wrapW = $("game").clientWidth;
  const rot = window.innerWidth < 760 && window.innerHeight > window.innerWidth;
  const hudH = $("hud").offsetHeight + 10, belowH = 80;
  const availH = Math.max(260, window.innerHeight - 54 - hudH - belowH - 24);
  const s = rot ? Math.min(wrapW / VH(), availH / VW()) : Math.min(wrapW / VW(), availH / VH());
  view.s = Math.max(0.22, s); view.rot = rot; view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  // quem joga do lado direito vê o campo virado: o seu gol fica sempre embaixo (ou à esquerda)
  view.flip = mySide() === 1;
  const cw = Math.round((rot ? VH() : VW()) * view.s), ch = Math.round((rot ? VW() : VH()) * view.s);
  cv.style.width = cw + "px"; cv.style.height = ch + "px";
  cv.width = Math.round(cw * view.dpr); cv.height = Math.round(ch * view.dpr);
  $("tablebox").style.width = cw + "px"; $("tablebox").style.height = ch + "px";
  tableImg = drawTable(cv.width, cv.height);
  if (S && S.g) renderHud(); // o placar segue o lado da tela
}
window.addEventListener("resize", () => { clearTimeout(layout.t); layout.t = setTimeout(layout, 80); });
function worldTf(c, k = view.dpr) {
  const s = view.s * k, F = view.fr;
  if (!view.rot) c.setTransform(s, 0, 0, s, F * s, F * s);
  else c.setTransform(0, -s, s, 0, F * s, (L + F) * s);
  if (view.flip) c.transform(-1, 0, 0, -1, L, W);
}
// larguras de linha e textos da mira em pixels de tela (não encolhem com o campo no celular)
const px = (n) => n / view.s;
// ângulo para o texto ficar de pé na tela
const textRot = () => (view.rot ? Math.PI / 2 : 0) + (view.flip ? Math.PI : 0);
function toWorld(ev) {
  const r = cv.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top, s = view.s, F = view.fr;
  let w = view.rot ? { x: L + F - sy / s, y: sx / s - F } : { x: sx / s - F, y: sy / s - F };
  if (view.flip) w = { x: L - w.x, y: W - w.y };
  return w;
}
function toScreen(x, y) {
  if (view.flip) { x = L - x; y = W - y; }
  const r = cv.getBoundingClientRect(), s = view.s, F = view.fr;
  return view.rot ? { x: r.left + (y + F) * s, y: r.top + (L + F - x) * s } : { x: r.left + (x + F) * s, y: r.top + (y + F) * s };
}
// deslocamento na tela (para a sombra cair sempre para o mesmo lado) convertido para o mundo
function screenVec(dx, dy) { let v = view.rot ? { x: -dy, y: dx } : { x: dx, y: dy }; if (view.flip) v = { x: -v.x, y: -v.y }; return v; }
function rng(seed) { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }

function drawTable(pw, ph) {
  const oc = document.createElement("canvas"); oc.width = pw; oc.height = ph;
  const c = oc.getContext("2d");
  worldTf(c);
  const rnd = rng(11), F = view.fr, M = view.open ? B.MARGIN : 0;
  const rr = (x, y, w, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, r) : c.rect(x, y, w, hh); };
  const std = STADIUMS[cfg().estadio] || STADIUMS.mesa;
  rr(-F, -F, L + 2 * F, W + 2 * F, 22);
  if (!std.c) { // moldura de madeira
    const wg = c.createLinearGradient(0, -F, 0, W + F); wg.addColorStop(0, "#8a5630"); wg.addColorStop(0.5, "#6b3f20"); wg.addColorStop(1, "#4a2a12");
    c.fillStyle = wg; c.fill();
    c.save(); c.clip(); c.globalAlpha = 0.16;
    for (let i = 0; i < 120; i++) { c.strokeStyle = rnd() < 0.5 ? "#2a1408" : "#b07a48"; c.lineWidth = 0.6 + rnd() * 1.6; const y = -F + rnd() * (W + 2 * F); c.beginPath(); c.moveTo(-F, y); for (let x = -F; x <= L + F; x += 60) c.lineTo(x, y + Math.sin(x / 80 + i) * 2.5 + (rnd() - 0.5) * 2); c.stroke(); }
    c.restore(); c.globalAlpha = 1;
  } else drawStands(c, std, F, rnd);
  // friso onde as peças batem (na mesa fechada, nas linhas; na aberta, na moldura)
  c.fillStyle = "#3a200d"; c.fillRect(-M - 7, -M - 7, L + 2 * M + 14, W + 2 * M + 14);
  if (M) { c.fillStyle = "#24683a"; c.fillRect(-M, -M, L + 2 * M, W + 2 * M); } // faixa de fora das linhas
  // gramado em faixas, com textura de tinta do Eucatex
  for (let k = 0; k < 10; k++) { c.fillStyle = k % 2 ? "#2e8a49" : "#2a7f43"; c.fillRect((L / 10) * k, 0, L / 10 + 0.5, W); }
  c.globalAlpha = 0.07;
  for (let i = 0; i < 2400; i++) { c.fillStyle = rnd() < 0.5 ? "#000" : "#fff"; c.fillRect(-M + rnd() * (L + 2 * M), -M + rnd() * (W + 2 * M), 1.3, 1.3); }
  c.globalAlpha = 1;
  // linhas (na mesa fechada, um pouco para dentro da borda)
  const o = M ? 0 : 6;
  c.strokeStyle = "#f4f1e6e8"; c.lineWidth = 3; c.lineJoin = "round";
  c.strokeRect(o, o, L - 2 * o, W - 2 * o);
  c.beginPath(); c.moveTo(L / 2, o); c.lineTo(L / 2, W - o); c.stroke();
  c.beginPath(); c.arc(L / 2, B.MID_Y, B.CIRCLE, 0, 7); c.stroke();
  c.fillStyle = "#f4f1e6"; c.beginPath(); c.arc(L / 2, B.MID_Y, 4, 0, 7); c.fill();
  for (const end of [0, 1]) {
    const x0 = end ? L - o : o, dir = end ? -1 : 1;
    c.strokeRect(Math.min(x0, x0 + dir * B.AREA_W), B.MID_Y - B.AREA_H / 2, B.AREA_W, B.AREA_H);
    c.strokeRect(Math.min(x0, x0 + dir * 44), B.MID_Y - 105, 44, 210);
    c.beginPath(); c.arc(x0 + dir * 88, B.MID_Y, 3.5, 0, 7); c.fill();
    c.beginPath(); c.arc(x0 + dir * 88, B.MID_Y, 70, end ? Math.PI - 0.82 : -0.82, end ? Math.PI + 0.82 : 0.82); c.stroke();
    if (M) for (const y0 of [0, W]) { c.beginPath(); c.arc(x0, y0, 12, end ? (y0 ? Math.PI : Math.PI / 2) : (y0 ? -Math.PI / 2 : 0), end ? (y0 ? 1.5 * Math.PI : Math.PI) : (y0 ? 0 : Math.PI / 2)); c.stroke(); }
    // rede: fundo e laterais, com a malha
    const gx = end ? L : -B.GD;
    c.fillStyle = "#0e2a17"; c.fillRect(gx, B.G0, B.GD, B.GW);
    c.save(); c.beginPath(); c.rect(gx, B.G0, B.GD, B.GW); c.clip();
    c.strokeStyle = "#f4f1e655"; c.lineWidth = 1;
    for (let k = -B.GW; k < B.GW + B.GD; k += 9) { c.beginPath(); c.moveTo(gx + k, B.G0); c.lineTo(gx + k + B.GW, B.G1); c.stroke(); c.beginPath(); c.moveTo(gx + k, B.G1); c.lineTo(gx + k + B.GW, B.G0); c.stroke(); }
    c.restore();
    c.strokeStyle = "#f4f1e6"; c.lineWidth = 5; c.lineCap = "round";
    const xe = end ? L : 0;
    c.beginPath(); c.moveTo(xe, B.G0); c.lineTo(end ? L + B.GD : -B.GD, B.G0); c.lineTo(end ? L + B.GD : -B.GD, B.G1); c.lineTo(xe, B.G1); c.stroke();
    c.fillStyle = "#ffffff"; for (const y of [B.G0, B.G1]) { c.beginPath(); c.arc(xe, y, 5, 0, 7); c.fill(); }
    c.lineWidth = 3; c.strokeStyle = "#f4f1e6e8"; c.fillStyle = "#f4f1e6";
  }
  // sombra da borda no gramado
  const edge = (x0, y0, x1, y1, gx0, gy0, gx1, gy1) => { const g = c.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, "#0007"); g.addColorStop(1, "#0000"); c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0); };
  edge(-M, -M, L + M, -M + 14, 0, -M, 0, -M + 14); edge(-M, W + M - 14, L + M, W + M, 0, W + M, 0, W + M - 14);
  if (M) { edge(-M, -M, -M + 14, W + M, -M, 0, -M + 14, 0); edge(L + M - 14, -M, L + M, W + M, L + M, 0, L + M - 14, 0); }
  else { edge(0, 0, 14, B.G0, 0, 0, 14, 0); edge(0, B.G1, 14, W, 0, 0, 14, 0); edge(L - 14, 0, L, B.G0, L, 0, L - 14, 0); edge(L - 14, B.G1, L, W, L, 0, L - 14, 0); }
  // plaquinha na moldura (no estádio, o nome dele)
  const plate = std.c ? std.name.toUpperCase() : "BOTÃO DA GALERA";
  for (const y of std.c ? [W + F - 13, -F + 13] : [W + F - 13]) {
    c.save(); c.translate(L / 2, y); c.rotate(view.flip ? Math.PI : 0); // corre ao longo da moldura
    c.font = "16px 'Alfa Slab One', Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const tw = c.measureText(plate).width;
    const bg = std.c ? (std.c[0] === "#151515" ? "#f4f4f4" : std.c[0]) : null; // placa clara (branca) leva letra preta
    if (bg) { c.fillStyle = bg; c.fillRect(-tw / 2 - 10, -11, tw + 20, 22); }
    c.fillStyle = "#00000066"; c.fillText(plate, 0.8, 1.2);
    c.fillStyle = bg ? (bg === "#f4f4f4" ? "#151515" : "#ffffff") : "#f2c14ebb"; c.fillText(plate, 0, 0);
    c.restore();
  }
  return oc;
}
// Arquibancada nas cores do time da casa: degraus de concreto, a torcida (pontinhos nas cores do time)
// e uma faixa pintada com as cores do clube em volta do gramado.
function drawStands(c, std, F, rnd) {
  c.fillStyle = "#2b2f36"; c.fill();
  c.save(); c.clip();
  // degraus
  for (let k = 0; k < 6; k++) {
    const d = F - k * (F / 6); c.strokeStyle = k % 2 ? "#3a3f48" : "#23262c"; c.lineWidth = F / 6;
    c.strokeRect(-d + F / 12, -d + F / 12, L + 2 * d - F / 6, W + 2 * d - F / 6);
  }
  // torcida
  const cols = [...std.c, ...std.c, "#e8c9a0", "#7a5236"];
  for (let i = 0; i < 2600; i++) {
    const side = rnd() * 4 | 0, t = rnd(), depth = 14 + rnd() * (F - 22);
    let x, y;
    if (side === 0) { x = -F + t * (L + 2 * F); y = -depth; } else if (side === 1) { x = -F + t * (L + 2 * F); y = W + depth; }
    else if (side === 2) { x = -depth; y = -F + t * (W + 2 * F); } else { x = L + depth; y = -F + t * (W + 2 * F); }
    c.fillStyle = cols[rnd() * cols.length | 0]; c.beginPath(); c.arc(x, y, 3 + rnd() * 2, 0, 7); c.fill();
  }
  c.restore();
  // faixa com as cores do clube colada no campo
  const band = 6, n = std.c.length;
  for (let k = 0; k < n; k++) { c.strokeStyle = std.c[k]; c.lineWidth = band; const d = 10 + band * (n - k); c.strokeRect(-d + band / 2, -d + band / 2, L + 2 * d - band, W + 2 * d - band); }
}

// ---------- peças ----------
const kitsOn = () => { const st = shown(); return st && st.match ? st.match.kits.map(kitOf) : [KITS.corinthians, KITS.palmeiras]; };
// tampinha de garrafa: borda serrilhada de metal pintado, o miolo na cor do time e o adesivo com o número
const CRIMPS = 21;
function capPath(c, x, y, r0, r1) {
  c.beginPath();
  for (let k = 0; k <= CRIMPS * 2; k++) { const a = (k / (CRIMPS * 2)) * Math.PI * 2, r = k % 2 ? r1 : r0; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
function drawButton(c, p, kit, opt = {}) {
  const { x, y } = p, sv = screenVec(2.5, 4), lg = screenVec(-0.4, -0.5), rim = kit.rim;
  c.globalAlpha = opt.alpha ?? 1;
  // sombra e a lateral da tampinha
  c.fillStyle = "#0006"; capPath(c, x + sv.x * 1.3, y + sv.y * 1.3, RB + 1, RB - 1.5); c.fill();
  const th = screenVec(0, 4);
  c.fillStyle = shade(rim, -0.45); capPath(c, x + th.x, y + th.y, RB, RB - 2.5); c.fill();
  // borda serrilhada, com brilho de metal
  const mg = c.createLinearGradient(x + lg.x * RB, y + lg.y * RB, x - lg.x * RB, y - lg.y * RB);
  mg.addColorStop(0, shade(rim, 0.45)); mg.addColorStop(0.5, rim); mg.addColorStop(1, shade(rim, -0.3));
  c.fillStyle = mg; capPath(c, x, y, RB, RB - 2.5); c.fill();
  // miolo com o uniforme (as listras ficam de pé na tela)
  const fr = RB - 6, [a, b, d] = kit.face.c;
  c.save(); c.beginPath(); c.arc(x, y, fr, 0, 7); c.clip();
  c.translate(x, y); c.rotate(textRot());
  c.fillStyle = a; c.fillRect(-fr, -fr, 2 * fr, 2 * fr);
  if (kit.face.kind === "vstripes") { c.fillStyle = b; for (let k = -3; k <= 3; k += 2) c.fillRect(k * fr / 4 - fr / 8, -fr, fr / 4, 2 * fr); }
  else if (kit.face.kind === "hstripes") { c.fillStyle = b; for (let k = -3; k <= 3; k += 2) c.fillRect(-fr, k * fr / 4 - fr / 8, 2 * fr, fr / 4); }
  else if (kit.face.kind === "band") { c.fillStyle = b; c.fillRect(-fr, -fr * 0.42, 2 * fr, fr * 0.24); c.fillStyle = d; c.fillRect(-fr, -fr * 0.18, 2 * fr, fr * 0.24); }
  // volume: claro em cima, escuro na borda
  const g = c.createRadialGradient(0, -fr * 0.4, 1, 0, 0, fr);
  g.addColorStop(0, "#ffffff40"); g.addColorStop(0.7, "#ffffff00"); g.addColorStop(1, "#00000040");
  c.fillStyle = g; c.fillRect(-fr, -fr, 2 * fr, 2 * fr);
  // número
  c.font = "15px 'Alfa Slab One', Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.lineWidth = 3; c.strokeStyle = kit.num === "#151515" ? "#f4f4f4" : "#151515"; c.globalAlpha = 0.85 * (opt.alpha ?? 1); c.strokeText(String(p.n || ""), 0, fr * 0.3);
  c.globalAlpha = opt.alpha ?? 1; c.fillStyle = kit.num; c.fillText(String(p.n || ""), 0, fr * 0.3);
  c.restore();
  c.globalAlpha = 1;
  if (opt.sel) { c.strokeStyle = `rgba(242,193,78,${0.7 + 0.3 * Math.sin(performance.now() / 160)})`; c.lineWidth = px(3); c.beginPath(); c.arc(x, y, RB + px(4), 0, 7); c.stroke(); }
  else if (opt.mine) { c.strokeStyle = "#f2c14e77"; c.lineWidth = px(1.5); c.setLineDash([px(4), px(4)]); c.beginPath(); c.arc(x, y, RB + px(3), 0, 7); c.stroke(); c.setLineDash([]); }
}
// desenho pequeno da formação (para o seletor da sala)
function formSvg(f) {
  const dots = [[60, 320], ...B.FORMATIONS[f]].map(([x, y]) => `<circle cx="${(x / 500) * 60 + 4}" cy="${(y / 640) * 40}" r="3.4"/>`).join("");
  return `<svg viewBox="0 0 70 40" width="70" height="40" aria-hidden="true"><rect x="0.5" y="0.5" width="69" height="39" rx="3" fill="#2e8a49" stroke="#8a6a40"/><line x1="64" y1="0" x2="64" y2="40" stroke="#f4f1e6" stroke-width="1"/><g fill="#151515" stroke="#f4f1e6" stroke-width="1">${dots}</g></svg>`;
}
function drawBall(c, x, y) {
  const sv = screenVec(1.5, 2.5);
  c.fillStyle = "#0007"; c.beginPath(); c.arc(x + sv.x, y + sv.y, RBALL + 0.5, 0, 7); c.fill();
  const lg = screenVec(-0.35, -0.45);
  const g = c.createRadialGradient(x + lg.x * RBALL, y + lg.y * RBALL, 1, x, y, RBALL);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.7, "#ecebe4"); g.addColorStop(1, "#a9a79c");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, RBALL, 0, 7); c.fill();
  c.fillStyle = "#1b1b1b";
  for (const [dx, dy, r] of [[0, 0, 3.4], [6.3, -3.4, 2.2], [-6.3, -3.4, 2.2], [0, 7, 2.2], [5.5, 5.5, 1.6], [-5.5, 5.5, 1.6]]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }
}
// goleiro: bloquinho de madeira pintado nas cores do time. Quando dá para mexer, uma trilha mostra até onde ele vai.
function drawKeeper(c, t, y, kit, opt = {}) {
  const s = B.keeperSeg(t, y), sv = screenVec(2.5, 4), R = B.KR;
  if (opt.mine) { c.strokeStyle = opt.drag ? "#f2c14e" : "#f2c14e88"; c.lineWidth = px(1.5); c.setLineDash([px(4), px(4)]); c.beginPath(); c.moveTo(s.ax, B.KY_MIN - B.KH); c.lineTo(s.ax, B.KY_MAX + B.KH); c.stroke(); c.setLineDash([]); }
  const cap = (ox, oy, col, r = R) => { c.fillStyle = col; c.beginPath(); c.moveTo(s.ax + ox - r, s.ay + oy); c.arc(s.ax + ox, s.ay + oy, r, Math.PI, 0); c.lineTo(s.bx + ox + r, s.by + oy); c.arc(s.bx + ox, s.by + oy, r, 0, Math.PI); c.closePath(); c.fill(); };
  cap(sv.x, sv.y, "#0006", R + 1);
  const th = screenVec(0, 4); cap(th.x, th.y, shade(kit.rim, -0.4));
  cap(0, 0, kit.rim);
  c.fillStyle = kit.face.c[0]; c.fillRect(s.ax - R * 0.45, s.ay, R * 0.9, s.by - s.ay);
}
function shade(hex, k) {
  const v = parseInt(hex.slice(1), 16); let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ---------- animação da jogada ----------
const STROKE_MS = 110;
let stroke = null; // o meu peteleco saiu e a resposta do servidor ainda não chegou
function startAnim(sh, old) {
  const r = B.simulate(sh.start, sh.flicks, { open: sh.open, keepers: sh.keepers, frames: true, events: true });
  pre = old && old.g ? old : S;
  anim = { shot: sh, frames: r.frames, events: r.events, ei: 0, start: sh.start };
  // a palheta: cada tampinha volta do ponto puxado até o disparo
  anim.stroke = { t0: sh.at - STROKE_MS, dur: STROKE_MS, p: sh.flicks.map((f) => Math.pow(f.v / B.VMAX, 0.8)) };
  stroke = null;
  aim.p = 0; aim.place = null; aim.super = false;
}
function finishAnim() { anim = null; pre = null; render(); }
function currentPieces() {
  if (!S || !S.g) return [];
  if (anim) {
    const t = (sNow() - anim.shot.at) / 1000;
    if (t < 0) return anim.start;
    const k = Math.min(anim.frames.length - 1, Math.floor(t * 60)), f = anim.frames[k];
    return anim.start.map((p, i) => ({ ...p, x: f[i * 2], y: f[i * 2 + 1] }));
  }
  return S.g.pieces;
}
