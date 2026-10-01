// Sinuca da Galera — física da mesa (bolas, tabelas, caçapas), arrumação do triângulo e linha de mira.
// Usado pelo servidor (sinuca.js), que decide o resultado da tacada, e pelo navegador, que refaz a mesma
// simulação para animar. Dentro da simulação só entram + − × ÷ e raiz quadrada (nada de seno/cosseno),
// então o resultado é idêntico no Node e em qualquer navegador.
(function (root) {

// Medidas em "unidades de mesa": o pano tem 1000 × 500 (mesa de 9 pés) e a bola tem raio 11,25.
const L = 1000, W = 500, R = 11.25, D = 2 * R;
const HEAD_X = 250, FOOT_X = 750, MID_Y = 250; // linha de saída (cabeceira) e marca do triângulo
const CG = 36, SG = 25; // boca das caçapas: de canto (distância do canto) e do meio (meia boca)

// Caçapas na ordem: 0 sup. esq., 1 sup. meio, 2 sup. dir., 3 inf. esq., 4 inf. meio, 5 inf. dir.
const POCKETS = [
  { x: -8, y: -8, r: 26 }, { x: L / 2, y: -16, r: 23 }, { x: L + 8, y: -8, r: 26 },
  { x: -8, y: W + 8, r: 26 }, { x: L / 2, y: W + 16, r: 23 }, { x: L + 8, y: W + 8, r: 26 },
];
// Tabelas (retas, com a normal apontando para dentro da mesa) e as quinas das bocas.
const RAILS = [
  { h: 1, at: 0, a: CG, b: L / 2 - SG, n: 1 }, { h: 1, at: 0, a: L / 2 + SG, b: L - CG, n: 1 },
  { h: 1, at: W, a: CG, b: L / 2 - SG, n: -1 }, { h: 1, at: W, a: L / 2 + SG, b: L - CG, n: -1 },
  { h: 0, at: 0, a: CG, b: W - CG, n: 1 }, { h: 0, at: L, a: CG, b: W - CG, n: -1 },
];
const JAWS = [];
for (const r of RAILS) for (const v of [r.a, r.b]) JAWS.push(r.h ? { x: v, y: r.at } : { x: r.at, y: v });

const DT = 1 / 900, FRAME_EVERY = 15, MAX_STEPS = 900 * 40; // 900 passos por segundo, quadro a cada 1/60 s
const VMAX = 4200;          // tacada no máximo
const A_SLIDE = 1100;       // atrito com a bola escorregando (efeito de cima/baixo vira rolamento)
const ROLL_A = 90, ROLL_K = 0.28; // atrito rolando (fixo + proporcional à velocidade)
const E_BALL = 0.95, E_RAIL = 0.75;
const SIDE_RAIL = 0.3, SIDE_DECAY = 250; // efeito lateral: quanto abre/fecha o ângulo na tabela
const STOP2 = 9; // abaixo de 3 unidades/s a bola para

const speedOf = (p) => VMAX * Math.pow(Math.max(0, Math.min(1, p)), 1.25);

// Simula uma tacada. balls: [{n, x, y}] (n = 0 é a branca). shot: {dx, dy} (direção, unitária),
// v (velocidade), sx (efeito lateral, −1..1, + = direita) e sy (−1..1, + = em cima/"siga", − = embaixo/"puxe").
// Devolve a primeira bola tocada pela branca, se alguma bola bateu na tabela depois do toque, as bolas
// encaçapadas (em ordem, com a caçapa) e as posições finais. Com opt.frames/opt.events, grava a animação e os sons.
function simulate(balls, shot, opt = {}) {
  const B = balls.map((b) => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, wx: 0, wy: 0, s: 0, on: true }));
  const cue = B.find((b) => b.n === 0);
  const v0 = shot.v;
  cue.vx = shot.dx * v0; cue.vy = shot.dy * v0;
  cue.wx = cue.vx * 1.25 * shot.sy; cue.wy = cue.vy * 1.25 * shot.sy;
  cue.s = shot.sx * v0 * 0.6;
  const res = { first: null, rail: false, pocketed: [], t: 0, frames: null, events: null };
  const FR = opt.frames ? [] : null, EV = opt.events ? [] : null;
  const snap = () => { const f = new Float32Array(B.length * 3); B.forEach((b, i) => { f[i * 3] = b.x; f[i * 3 + 1] = b.y; f[i * 3 + 2] = b.on ? 1 : 0; }); FR.push(f); };
  if (FR) snap();
  if (EV) EV.push({ t: 0, k: "cue", v: v0 });
  let step = 0;
  const now = () => step * DT;

  function bounce(b, nx, ny) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    const tx = -ny, ty = nx;
    const vt = b.vx * tx + b.vy * ty - b.s * SIDE_RAIL;
    const wn = b.wx * nx + b.wy * ny, wt = b.wx * tx + b.wy * ty;
    b.s *= 0.5;
    const vn2 = -vn * E_RAIL, wn2 = -wn * 0.4;
    b.vx = nx * vn2 + tx * vt; b.vy = ny * vn2 + ty * vt;
    b.wx = nx * wn2 + tx * wt; b.wy = ny * wn2 + ty * wt;
    if (res.first !== null) res.rail = true;
    if (EV) EV.push({ t: now(), k: "rail", v: -vn });
  }

  while (step < MAX_STEPS) {
    step++;
    let moving = false;
    // movimento e atrito
    for (const b of B) {
      if (!b.on) continue;
      const ux = b.vx - b.wx, uy = b.vy - b.wy, u2 = ux * ux + uy * uy;
      if (u2 > 1e-4) { // escorregando: o atrito leva a bola a rolar
        const u = Math.sqrt(u2), dv = A_SLIDE * DT;
        if (3.5 * dv >= u) {
          const vx = (2.5 * b.vx + b.wx) / 3.5, vy = (2.5 * b.vy + b.wy) / 3.5;
          b.vx = b.wx = vx; b.vy = b.wy = vy;
        } else {
          const ex = ux / u, ey = uy / u;
          b.vx -= ex * dv; b.vy -= ey * dv; b.wx += ex * 2.5 * dv; b.wy += ey * 2.5 * dv;
        }
        moving = true;
      } else {
        const v2 = b.vx * b.vx + b.vy * b.vy;
        if (v2 < STOP2) { b.vx = b.vy = b.wx = b.wy = 0; b.s = 0; }
        else {
          const v = Math.sqrt(v2), nv = v - (ROLL_A + ROLL_K * v) * DT;
          if (nv <= 0) { b.vx = b.vy = b.wx = b.wy = 0; b.s = 0; }
          else { const k = nv / v; b.vx *= k; b.vy *= k; b.wx = b.vx; b.wy = b.vy; moving = true; }
        }
      }
      if (b.s) { const d = SIDE_DECAY * DT; b.s = b.s > d ? b.s - d : b.s < -d ? b.s + d : 0; }
      b.x += b.vx * DT; b.y += b.vy * DT;
    }
    // caçapas: entrou no círculo da caçapa ou passou da linha da tabela (só dá pela boca)
    for (const b of B) {
      if (!b.on) continue;
      const out = b.x < 0 || b.x > L || b.y < 0 || b.y > W;
      let best = -1, bd = Infinity;
      for (let p = 0; p < 6; p++) {
        const dx = b.x - POCKETS[p].x, dy = b.y - POCKETS[p].y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = p; }
      }
      if (out || bd < POCKETS[best].r * POCKETS[best].r) {
        b.on = false; b.vx = b.vy = b.wx = b.wy = 0;
        res.pocketed.push({ n: b.n, p: best });
        if (EV) EV.push({ t: now(), k: "pocket", n: b.n, p: best });
      }
    }
    // tabelas e quinas
    for (const b of B) {
      if (!b.on) continue;
      for (const r of RAILS) {
        const along = r.h ? b.x : b.y, across = (r.h ? b.y : b.x) - r.at;
        if (along < r.a || along > r.b) continue;
        const pen = R - across * r.n;
        if (pen <= 0 || pen > 2 * R) continue;
        if (r.h) { b.y = r.at + R * r.n; bounce(b, 0, r.n); } else { b.x = r.at + R * r.n; bounce(b, r.n, 0); }
      }
      for (const j of JAWS) {
        const dx = b.x - j.x, dy = b.y - j.y, d2 = dx * dx + dy * dy;
        if (d2 >= R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        b.x = j.x + nx * R; b.y = j.y + ny * R;
        bounce(b, nx, ny);
      }
    }
    // bola com bola (massas iguais)
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      if (!a.on) continue;
      for (let k = i + 1; k < B.length; k++) {
        const b = B[k];
        if (!b.on) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= D * D || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const push = (D - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn <= 0) continue;
        const j = vn * (1 + E_BALL) / 2;
        a.vx -= nx * j; a.vy -= ny * j; b.vx += nx * j; b.vy += ny * j;
        if (res.first === null && (a.n === 0 || b.n === 0)) res.first = a.n === 0 ? b.n : a.n;
        if (EV) EV.push({ t: now(), k: "ball", v: vn });
        moving = true;
      }
    }
    if (FR && step % FRAME_EVERY === 0) snap();
    if (!moving) break;
  }
  if (FR) snap();
  res.t = step * DT;
  res.balls = B.filter((b) => b.on).map((b) => ({ n: b.n, x: b.x, y: b.y }));
  res.frames = FR; res.events = EV;
  return res;
}

// Linha de mira: a partir da branca, na direção (dx, dy), onde ela bate primeiro.
// Devolve a bola (e a posição da "bola fantasma") ou o ponto da tabela, e para onde cada bola vai.
function trace(balls, cx, cy, dx, dy) {
  let best = Infinity, hit = null;
  for (const b of balls) {
    if (b.n === 0) continue;
    const ox = b.x - cx, oy = b.y - cy, proj = ox * dx + oy * dy;
    if (proj <= 0) continue;
    const perp2 = ox * ox + oy * oy - proj * proj;
    if (perp2 >= D * D) continue;
    const t = proj - Math.sqrt(D * D - perp2);
    if (t < best) { best = t; hit = b; }
  }
  let tw = Infinity, nx = 0, ny = 0;
  if (dx > 0 && (L - R - cx) / dx < tw) { tw = (L - R - cx) / dx; nx = -1; ny = 0; }
  if (dx < 0 && (R - cx) / dx < tw) { tw = (R - cx) / dx; nx = 1; ny = 0; }
  if (dy > 0 && (W - R - cy) / dy < tw) { tw = (W - R - cy) / dy; nx = 0; ny = -1; }
  if (dy < 0 && (R - cy) / dy < tw) { tw = (R - cy) / dy; nx = 0; ny = 1; }
  if (hit && best <= tw) {
    const gx = cx + dx * best, gy = cy + dy * best;
    let ox = hit.x - gx, oy = hit.y - gy; const ol = Math.sqrt(ox * ox + oy * oy) || 1; ox /= ol; oy /= ol;
    const cos = dx * ox + dy * oy;
    let tx = dx - cos * ox, ty = dy - cos * oy; const tl = Math.sqrt(tx * tx + ty * ty);
    if (tl > 1e-6) { tx /= tl; ty /= tl; } else { tx = ty = 0; }
    return { ball: hit, x: gx, y: gy, dist: best, obj: { dx: ox, dy: oy, k: cos }, cue: { dx: tx, dy: ty, k: tl } };
  }
  tw = Math.max(0, tw);
  const px = cx + dx * tw, py = cy + dy * tw, dot = dx * nx + dy * ny;
  return { ball: null, x: px, y: py, dist: tw, bounce: { dx: dx - 2 * dot * nx, dy: dy - 2 * dot * ny } };
}

// As 15 posições do triângulo (a ponta na marca, virada para a cabeceira). row/k: fileira e posição nela.
function rackSlots() {
  const s = [];
  for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) s.push({ r, k, x: FOOT_X + r * (D * 0.8660254 + 0.05), y: MID_Y + (k - r / 2) * (D + 0.05) });
  return s;
}

// A posição está livre para a branca (dentro do pano, sem encostar em outra bola, e na cabeceira se precisar)?
function freeSpot(balls, x, y, kitchen) {
  if (!(x >= R && x <= L - R && y >= R && y <= W - R)) return false;
  if (kitchen && x > HEAD_X) return false;
  return balls.every((b) => b.n === 0 || (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) >= D * D);
}

const group = (n) => (n === 8 ? "8" : n >= 1 && n <= 7 ? "lisas" : n >= 9 ? "listradas" : "branca");

const api = { L, W, R, D, HEAD_X, FOOT_X, MID_Y, CG, SG, POCKETS, RAILS, JAWS, DT, FRAME_EVERY, VMAX, speedOf, simulate, trace, rackSlots, freeSpot, group };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Fisica = api;
})(typeof window !== "undefined" ? window : globalThis);
