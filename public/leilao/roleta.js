// Leilão da Galera — a roleta (parte 4 de 4 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- WHEEL ----------
const cv = $("wheel"), ctx = cv.getContext("2d");
const BULBS = 28, calmMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function drawWheel(names, angle){
  const W = cv.width, C = W/2, RIM = C - 6, R = C - 46, n = names.length, seg = 2*Math.PI/n;
  ctx.clearRect(0,0,W,W);
  // aro com lâmpadas de programa de auditório: piscam enquanto a roleta gira
  ctx.beginPath(); ctx.arc(C,C,RIM,0,2*Math.PI); const P = wheelPal();
  ctx.fillStyle = P.rim; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = P.rimLine; ctx.stroke();
  const phase = spinning && !calmMotion ? Math.floor(performance.now() / 110) % 2 : 0;
  for (let i = 0; i < BULBS; i++) {
    const a = i * 2*Math.PI/BULBS, on = (i % 2) === phase || !spinning;
    ctx.beginPath(); ctx.arc(C + Math.cos(a)*(R + 21), C + Math.sin(a)*(R + 21), 8.5, 0, 2*Math.PI);
    ctx.fillStyle = on ? P.bulbOn : P.bulbOff;
    ctx.shadowColor = P.glow; ctx.shadowBlur = on ? 18 : 0; ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.save(); ctx.translate(C, C); ctx.rotate(angle);
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI/2 + i*seg; // segment i starts at top when angle=0
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,a0,a0+seg); ctx.closePath();
    ctx.fillStyle = n === 1 ? P.empty : P.seg[(n % P.seg.length === 1 && i === n-1) ? 2 : i % P.seg.length];
    ctx.fill();
    ctx.strokeStyle = P.sep; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.rotate(a0 + seg/2);
    ctx.fillStyle = n === 1 ? P.emptyText : P.text;
    const fs = Math.max(12, Math.min(34, 600 / n + 6));
    ctx.font = `700 ${fs}px "Saira Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    let t = names[i]; const maxW = R*0.66;
    while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0,-2) + "…";
    ctx.fillText(t, R - 18, 0);
    ctx.restore();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(C,C,R,0,2*Math.PI); ctx.strokeStyle = P.ring; ctx.lineWidth = 5; ctx.stroke();
}
function spinTo(names, index, dur){
  spinning = true; render();
  const n = names.length, seg = 2*Math.PI/n;
  // pointer is at top (-PI/2). segment i center at -PI/2 + (i+.5)seg + angle => want angle = -(i+.5)seg (mod 2PI)
  const jitter = (Math.random() - .5) * seg * .6;
  const target = -(index + .5) * seg + jitter;
  const start = wheelAngle % (2*Math.PI);
  let end = target - 2*Math.PI*6; while (end > start - 2*Math.PI*5) end -= 2*Math.PI;
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 4);
  (function frame(now){
    const t = Math.min(1, (now - t0) / Math.min(4500, Math.max(800, dur)));
    wheelAngle = start + (end - start) * ease(t);
    drawWheel(names, wheelAngle);
    if (t < 1) requestAnimationFrame(frame);
    else { spinning = false; wheelAngle = end; render(); if (S.phase === "bidding") $("bidAmt").focus?.(); }
  })(t0);
}
drawWheel(["—"], 0);
document.fonts?.ready.then(() => { if (S && !spinning) render(); else if (!S) drawWheel(["—"], 0); });
