// Futebol de Botão da Galera — física da mesa (tampinhas, bolinha, traves e bordas) e as posições de saída.
// Usado pelo servidor (botao.js), que decide o resultado de cada jogada, e pelo navegador, que refaz a mesma
// simulação para animar. Dentro da simulação só entram + − × ÷ e raiz quadrada (nada de seno/cosseno),
// então o resultado é idêntico no Node e em qualquer navegador.
(function (root) {

// Medidas em "unidades de mesa": o campo tem 1000 × 640. O time 0 defende o gol da esquerda e ataca para a direita.
// Duas mesas (configuração da sala): "fechada" (as linhas são bordas, a bola bate e volta) e "aberta" (a bola sai:
// lateral, escanteio e tiro de meta; as peças param na moldura, MARGIN para fora das linhas).
const L = 1000, W = 640, MID_Y = W / 2;
const RB = 26, RBALL = 11;       // raio da tampinha e da bolinha
const MB = 1, MBALL = 0.35;      // massas
const GW = 150, GD = 42;         // boca do gol (largura) e fundo da rede
const MARGIN = 54;               // mesa aberta: faixa de fora das linhas até a moldura
const CIRCLE = 80;               // círculo central
const AREA_W = 120, AREA_H = 300; // grande área (só desenho)
const G0 = MID_Y - GW / 2, G1 = MID_Y + GW / 2; // traves (y)
const KX = 20, KH = 22, KR = 9;  // goleiro (opcional): distância da linha do gol, meia altura e raio do bloquinho
const KY_MIN = G0 - 10, KY_MAX = G1 + 10; // onde o meio do goleiro pode ficar
const PLACE_R = 140;             // bola parada: até onde a tampinha do cobrador pode ser arrumada (distância da bola)

const DT = 1 / 600, FRAME_EVERY = 10, MAX_STEPS = 600 * 20; // 600 passos por segundo, quadro a cada 1/60 s
const VMAX = 1500;                       // peteleco no máximo
const SUPER = 1.7;                       // super palhetada: quanto a mais de velocidade
const A_BTN = 700, K_BTN = 0.9;          // atrito da tampinha deslizando (fixo + proporcional à velocidade)
const A_BALL = 400, K_BALL = 1.4;        // atrito da bolinha
const E_BB = 0.7, E_BALL = 0.85, E_WALL = 0.55, E_KEEP = 0.6, E_NET = 0.05; // a rede segura a bolinha
const STOP2 = 16; // abaixo de 4 unidades/s a peça para

const speedOf = (p) => VMAX * Math.pow(Math.max(0, Math.min(1, p)), 1.2);

// Paredes fixas (segmentos). "mouth" é a boca do gol: só segura as tampinhas, a bolinha passa
// (assim ninguém estaciona uma tampinha dentro do gol).
const NETS = [
  { ax: 0, ay: G0, bx: -GD, by: G0, k: "post" }, { ax: 0, ay: G1, bx: -GD, by: G1, k: "post" }, { ax: -GD, ay: G0, bx: -GD, by: G1, k: "net" },
  { ax: 0, ay: G0, bx: 0, by: G1, k: "mouth" },
  { ax: L, ay: G0, bx: L + GD, by: G0, k: "post" }, { ax: L, ay: G1, bx: L + GD, by: G1, k: "post" }, { ax: L + GD, ay: G0, bx: L + GD, by: G1, k: "net" },
  { ax: L, ay: G0, bx: L, by: G1, k: "mouth" },
];
const SEGS_CLOSED = [
  { ax: 0, ay: 0, bx: L, by: 0, k: "wall" }, { ax: 0, ay: W, bx: L, by: W, k: "wall" },
  { ax: 0, ay: 0, bx: 0, by: G0, k: "wall" }, { ax: 0, ay: G1, bx: 0, by: W, k: "wall" },
  { ax: L, ay: 0, bx: L, by: G0, k: "wall" }, { ax: L, ay: G1, bx: L, by: W, k: "wall" },
  ...NETS,
];
const SEGS_OPEN = [
  { ax: -MARGIN, ay: -MARGIN, bx: L + MARGIN, by: -MARGIN, k: "wall" }, { ax: -MARGIN, ay: W + MARGIN, bx: L + MARGIN, by: W + MARGIN, k: "wall" },
  { ax: -MARGIN, ay: -MARGIN, bx: -MARGIN, by: W + MARGIN, k: "wall" }, { ax: L + MARGIN, ay: -MARGIN, bx: L + MARGIN, by: W + MARGIN, k: "wall" },
  ...NETS,
];
// O goleiro do time t é um bloquinho em pé (segmento com raio) na frente do gol que ele defende. Ele fica parado
// durante a jogada, na posição que o próprio time deixou (só dá para mexer na vez do seu time).
const keeperSeg = (t, y) => ({ ax: t ? L - KX : KX, ay: y - KH, bx: t ? L - KX : KX, by: y + KH, r: KR, t });
const clampKeeper = (y) => Math.max(KY_MIN, Math.min(KY_MAX, y));

// Formações de quadra (time 0, atacando para a direita): a tampinha 1 guarda o gol e as outras 4 se arrumam
// como no futsal. Quem dá a saída põe a tampinha mais adiantada encostada na bola.
const FORMATIONS = {
  "2-2": [[210, 190], [210, 450], [380, 245], [380, 395]],
  "3-1": [[200, 160], [200, 320], [200, 480], [390, 320]],
  "1-2-1": [[180, 320], [300, 180], [300, 460], [410, 320]],
  "1-1-2": [[180, 320], [290, 320], [400, 220], [400, 420]],
};
const GUARD = [60, MID_Y];
function lineup(kickoff, forms = []) {
  const pieces = [{ k: "ball", t: -1, x: L / 2, y: MID_Y }];
  for (const t of [0, 1]) {
    const spots = [GUARD, ...(FORMATIONS[forms[t]] || FORMATIONS["2-2"])].map(([x, y]) => [x, y]);
    if (kickoff === t) { let f = 1; spots.forEach(([x], i) => { if (x > spots[f][0]) f = i; }); spots[f] = [L / 2 - RB - RBALL - 2, MID_Y]; }
    spots.forEach(([x, y], i) => pieces.push({ k: "btn", t, n: i + 1, x: t ? L - x : x, y }));
  }
  return pieces;
}

function closest(px, py, s) {
  const ex = s.bx - s.ax, ey = s.by - s.ay, l2 = ex * ex + ey * ey;
  let u = l2 ? ((px - s.ax) * ex + (py - s.ay) * ey) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return { x: s.ax + ex * u, y: s.ay + ey * u };
}
const inMouth = (y) => y > G0 && y < G1;

// Simula uma jogada. pieces: [{k: "ball"|"btn", t, x, y}] (a bolinha é a 0).
// flicks: [{i (peça), dx, dy (unitário), v}] — um ou vários petelecos ao mesmo tempo (todos do mesmo time).
// opt.open: mesa aberta (a bola sai). opt.keepers: [y do goleiro do time 0, y do time 1] ou nada (sem goleiro).
// Devolve: touchers (tampinhas do peteleco que encostaram na bola, na ordem), foul (alguma bateu primeiro numa
// tampinha adversária), last (último toque na bola antes de acabar: time e onde estava a bola), goal, out e as
// posições finais. Com opt.frames/opt.events, grava a animação e os sons.
function simulate(pieces, flicks, opt = {}) {
  const P = pieces.map((p) => ({ k: p.k, t: p.t, n: p.n, x: p.x, y: p.y, vx: 0, vy: 0, r: p.k === "ball" ? RBALL : RB, m: p.k === "ball" ? MBALL : MB }));
  const ball = P[0], team = P[flicks[0].i].t, first = new Map(), flicked = new Set();
  for (const f of flicks) { const p = P[f.i]; p.vx = f.dx * f.v; p.vy = f.dy * f.v; flicked.add(p); }
  const segs = opt.open ? SEGS_OPEN : SEGS_CLOSED;
  const K = opt.keepers ? [keeperSeg(0, opt.keepers[0]), keeperSeg(1, opt.keepers[1])] : [];
  const res = { touchers: [], foul: false, last: null, goal: null, out: null, t: 0, frames: null, events: null };
  const FR = opt.frames ? [] : null, EV = opt.events ? [] : null;
  const snap = () => { const f = new Float32Array(P.length * 2); P.forEach((p, i) => { f[i * 2] = p.x; f[i * 2 + 1] = p.y; }); FR.push(f); };
  if (FR) snap();
  if (EV) for (const f of flicks) EV.push({ t: 0, k: "flick", v: f.v });
  let step = 0;
  const now = () => step * DT;
  const done = () => res.goal || res.out;

  function hitWall(p, s, e, kind) {
    const q = closest(p.x, p.y, s), dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy, rr = p.r + (s.r || 0);
    if (d2 >= rr * rr || d2 === 0) return false;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    p.x = q.x + nx * rr; p.y = q.y + ny * rr;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      p.vx -= (1 + e) * vn * nx; p.vy -= (1 + e) * vn * ny;
      if (EV) EV.push({ t: now(), k: kind, v: -vn });
    }
    return true;
  }

  while (step < MAX_STEPS) {
    step++;
    let moving = false;
    // movimento e atrito (dentro da rede a bolinha freia forte)
    for (const p of P) {
      const v2 = p.vx * p.vx + p.vy * p.vy;
      if (v2 < STOP2) { p.vx = p.vy = 0; continue; }
      const inNet = p.k === "ball" && (p.x < -RBALL || p.x > L + RBALL) && inMouth(p.y);
      const v = Math.sqrt(v2), a = p.k === "ball" ? (inNet ? 4000 : A_BALL) + K_BALL * v : A_BTN + K_BTN * v, nv = v - a * DT;
      if (nv <= 0) { p.vx = p.vy = 0; continue; }
      const k = nv / v; p.vx *= k; p.vy *= k;
      p.x += p.vx * DT; p.y += p.vy * DT;
      moving = true;
    }
    // gol (a bolinha passou inteira da linha, entre as traves) e, na mesa aberta, bola fora
    if (!done()) {
      if (ball.x < -RBALL && inMouth(ball.y)) res.goal = { side: 0, t: now() };
      else if (ball.x > L + RBALL && inMouth(ball.y)) res.goal = { side: 1, t: now() };
      else if (opt.open && (ball.y < -RBALL || ball.y > W + RBALL)) res.out = { line: "side", x: ball.x, y: ball.y < 0 ? 0 : W, t: now() };
      else if (opt.open && (ball.x < -RBALL || ball.x > L + RBALL)) res.out = { line: "end", end: ball.x < 0 ? 0 : 1, x: ball.x < 0 ? 0 : L, y: ball.y, t: now() };
      if (res.goal && EV) EV.push({ t: now(), k: "goal", side: res.goal.side });
      if (res.out && EV) EV.push({ t: now(), k: "out" });
      if (res.out) res.out.by = res.last ? res.last.t : team; // quem tocou por último
    }
    // bordas, traves, redes e goleiros
    for (const p of P) {
      for (const s of segs) {
        if (s.k === "mouth" && p.k === "ball") continue;
        hitWall(p, s, s.k === "net" ? E_NET : E_WALL, s.k === "net" ? "net" : s.k === "post" ? "post" : "wall");
      }
      for (const s of K) if (hitWall(p, s, E_KEEP, "keeper") && p === ball && !done()) res.last = { t: s.t, x: ball.x, y: ball.y };
    }
    // peça com peça
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = a.r + b.r;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, im = 1 / a.m + 1 / b.m;
        const push = (rr - d) / im;
        a.x -= nx * push / a.m; a.y -= ny * push / a.m; b.x += nx * push / b.m; b.y += ny * push / b.m;
        const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn <= 0) continue;
        const isBall = a.k === "ball" || b.k === "ball", e = isBall ? E_BALL : E_BB;
        const jj = vn * (1 + e) / im;
        a.vx -= nx * jj / a.m; a.vy -= ny * jj / a.m; b.vx += nx * jj / b.m; b.vy += ny * jj / b.m;
        // quem encostou em quem
        for (const [s, o] of [[a, b], [b, a]]) {
          if (!flicked.has(s)) continue;
          if (!first.has(s)) first.set(s, o);
          if (o === ball && !res.touchers.includes(P.indexOf(s))) res.touchers.push(P.indexOf(s));
        }
        if (isBall && !done()) { const o = a === ball ? b : a; res.last = { t: o.t, x: ball.x, y: ball.y }; }
        if (EV) EV.push({ t: now(), k: isBall ? "ball" : "btn", v: vn });
        moving = true;
      }
    }
    if (FR && step % FRAME_EVERY === 0) snap();
    if (!moving) break;
  }
  if (FR) snap();
  res.foul = [...first.values()].some((o) => o.k === "btn" && o.t !== team);
  res.t = step * DT;
  res.pieces = P.map((p) => ({ k: p.k, t: p.t, n: p.n, x: p.x, y: p.y }));
  res.frames = FR; res.events = EV;
  return res;
}

// Linha de mira: a partir da tampinha i, na direção (dx, dy), em que peça ela encosta primeiro (ou onde bate na borda).
function trace(pieces, i, dx, dy, open) {
  const s = pieces[i]; let best = Infinity, hit = null;
  pieces.forEach((p, j) => {
    if (j === i) return;
    const rr = RB + (p.k === "ball" ? RBALL : RB), ox = p.x - s.x, oy = p.y - s.y, proj = ox * dx + oy * dy;
    if (proj <= 0) return;
    const perp2 = ox * ox + oy * oy - proj * proj;
    if (perp2 >= rr * rr) return;
    const t = proj - Math.sqrt(rr * rr - perp2);
    if (t < best) { best = t; hit = p; }
  });
  if (hit) {
    const gx = s.x + dx * best, gy = s.y + dy * best;
    let ox = hit.x - gx, oy = hit.y - gy; const ol = Math.sqrt(ox * ox + oy * oy) || 1; ox /= ol; oy /= ol;
    return { hit, x: gx, y: gy, dist: best, obj: { dx: ox, dy: oy, k: dx * ox + dy * oy } };
  }
  const m = open ? MARGIN : 0;
  let tw = Infinity;
  if (dx > 0) tw = Math.min(tw, (L + m - RB - s.x) / dx);
  if (dx < 0) tw = Math.min(tw, (-m + RB - s.x) / dx);
  if (dy > 0) tw = Math.min(tw, (W + m - RB - s.y) / dy);
  if (dy < 0) tw = Math.min(tw, (-m + RB - s.y) / dy);
  tw = Math.max(0, tw);
  return { hit: null, x: s.x + dx * tw, y: s.y + dy * tw, dist: tw };
}

// Põe a bolinha num lugar livre perto de (x, y), indo para o meio do campo se tiver tampinha em cima.
function placeBall(pieces, x, y) {
  const free = (bx, by) => pieces.every((p, j) => j === 0 || (p.x - bx) * (p.x - bx) + (p.y - by) * (p.y - by) >= (RB + RBALL + 3) * (RB + RBALL + 3));
  const dx = L / 2 - x, dy = MID_Y - y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
  for (let k = 0; k < 200; k++) {
    for (const side of [0, 1, -1]) {
      const bx = x + (dx / dl) * k * 4 + (side ? (-dy / dl) * side * k * 3 : 0), by = y + (dy / dl) * k * 4 + (side ? (dx / dl) * side * k * 3 : 0);
      if (bx >= RBALL && bx <= L - RBALL && by >= RBALL && by <= W - RBALL && free(bx, by)) return { x: bx, y: by };
    }
  }
  return { x: L / 2, y: MID_Y };
}
// Bola parada: a tampinha i pode ir para (x, y)? Dentro do campo, perto da bola e sem encostar em ninguém.
function placeOk(pieces, i, x, y) {
  if (!(x >= RB && x <= L - RB && y >= RB && y <= W - RB)) return false;
  const b = pieces[0];
  if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) > PLACE_R * PLACE_R) return false;
  return pieces.every((p, j) => { if (j === i) return true; const rr = RB + (p.k === "ball" ? RBALL : RB) + 1; return (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) >= rr * rr; });
}

const api = { L, W, MID_Y, RB, RBALL, GW, GD, MARGIN, CIRCLE, AREA_W, AREA_H, G0, G1, KX, KH, KR, KY_MIN, KY_MAX, PLACE_R, DT, FRAME_EVERY, VMAX, SUPER, FORMATIONS,
  speedOf, keeperSeg, clampKeeper, lineup, simulate, trace, placeBall, placeOk };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Botao = api;
})(typeof window !== "undefined" ? window : globalThis);
