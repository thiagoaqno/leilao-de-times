// Pelada da Galera — quadra, uniformes, física da bola e dos jogadores. Usado pelo servidor (quem manda na bola)
// e pelo navegador (prever a bola entre uma atualização e outra, mexer o próprio jogador e o modo treino).
// Tudo em metros e segundos. O time A ataca para +x (defende o gol da esquerda); o B ataca para -x.
(function (root) {
  const HALF_L = 20, HALF_W = 12; // quadra de 40 x 24 m, cercada por placas e alambrado (a bola nunca sai)
  const GOAL_W = 1.6, GOAL_H = 2.1, GOAL_D = 1.2; // meia largura, altura e fundo do gol (3,2 x 2,1 m)
  const FENCE_H = 7, CEIL = 14;
  const BALL_R = 0.15, P_R = 0.35, P_H = 1.8; // bola um pouco maior que a de verdade, para enxergar de longe
  const POST_R = 0.05;
  const G = 9.81;

  // camisas (as mesmas do futebol de botão): cor da camisa, desenho e cor do número/calção
  const KITS = {
    corinthians: { name: "Corinthians", kind: "plain", c: ["#f4f4f4"], num: "#151515", shorts: "#151515" },
    saopaulo: { name: "São Paulo", kind: "band", c: ["#f4f4f4", "#c8102e", "#151515"], num: "#151515", shorts: "#f4f4f4" },
    santos: { name: "Santos", kind: "vstripes", c: ["#f4f4f4", "#151515"], num: "#c8102e", shorts: "#f4f4f4" },
    palmeiras: { name: "Palmeiras", kind: "plain", c: ["#0b6b34"], num: "#f4f4f4", shorts: "#f4f4f4" },
    rubronegro: { name: "Rubro-negro", kind: "hstripes", c: ["#c8102e", "#151515"], num: "#f4f4f4", shorts: "#f4f4f4" },
    celeste: { name: "Celeste", kind: "plain", c: ["#1e5bc6"], num: "#f4f4f4", shorts: "#f4f4f4" },
    canarinho: { name: "Canarinho", kind: "plain", c: ["#f5d000"], num: "#0b7a3b", shorts: "#1e5bc6" },
    laranja: { name: "Laranja", kind: "plain", c: ["#f07c1c"], num: "#151515", shorts: "#151515" },
  };
  // cor principal de cada camisa (placar, nome em cima do jogador)
  const kitColor = (k) => (KITS[k] || KITS.corinthians).c[(KITS[k] || KITS.corinthians).kind === "band" ? 1 : 0];

  // posições na saída de bola (até 3 por time). Quem levou o gol sai mais perto do meio.
  function spawns(team, n, kicking) {
    const s = team === "A" ? -1 : 1, yaw = team === "A" ? -Math.PI / 2 : Math.PI / 2;
    const spots = [[kicking ? 1.2 : 5, 0], [10, -5], [10, 5]];
    return spots.slice(0, Math.max(1, n)).map(([d, z]) => [s * d, 0, s * z, yaw]);
  }

  // ---------- jogador ----------
  const RUN = 6.4, SPRINT = 8.4, CHARGING = 4.2, ACC = 34, AIR_ACC = 8, JUMP = 4.6;
  // p: {x,y,z,vx,vy,vz,onGround}; wish: {x, z} (direção no mundo, comprimento 0..1), speed, jump
  function movePlayer(p, wish, dt) {
    const acc = p.onGround ? ACC : AIR_ACC;
    const tx = wish.x * wish.speed, tz = wish.z * wish.speed;
    const dx = tx - p.vx, dz = tz - p.vz, d = Math.hypot(dx, dz), m = acc * dt;
    if (d <= m) { p.vx = tx; p.vz = tz; } else { p.vx += (dx / d) * m; p.vz += (dz / d) * m; }
    if (wish.jump && p.onGround) { p.vy = JUMP; p.onGround = false; }
    p.vy -= G * 1.4 * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    const lx = HALF_L - P_R, lz = HALF_W - P_R;
    if (p.x < -lx) { p.x = -lx; p.vx = 0; } if (p.x > lx) { p.x = lx; p.vx = 0; }
    if (p.z < -lz) { p.z = -lz; p.vz = 0; } if (p.z > lz) { p.z = lz; p.vz = 0; }
  }

  // ---------- bola ----------
  const newBall = () => ({ x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wz: 0 });
  // colisão bola x cilindro vertical (trave, jogador) ou horizontal (travessão)
  function bounceOff(b, nx, ny, nz, pen, e, vx = 0, vy = 0, vz = 0) {
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rv = (b.vx - vx) * nx + (b.vy - vy) * ny + (b.vz - vz) * nz;
    if (rv < 0) { b.vx -= (1 + e) * rv * nx; b.vy -= (1 + e) * rv * ny; b.vz -= (1 + e) * rv * nz; }
    return rv < 0 ? -rv : 0;
  }
  // devolve a força da batida mais forte (para o som) e o id do jogador que encostou por último
  function stepBall(b, players, dt) {
    let hit = 0, touch = null;
    b.vy -= G * dt;
    // resistência do ar e atrito no chão
    const sp = Math.hypot(b.vx, b.vy, b.vz), drag = Math.max(0, 1 - 0.012 * sp * dt);
    b.vx *= drag; b.vy *= drag; b.vz *= drag;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < BALL_R) {
      b.y = BALL_R;
      if (b.vy < -0.6) { hit = Math.max(hit, -b.vy); b.vy = -b.vy * 0.55; b.vx *= 0.92; b.vz *= 0.92; }
      else b.vy = 0;
    }
    if (b.y <= BALL_R + 1e-3) { // rolando
      const h = Math.hypot(b.vx, b.vz);
      if (h > 0) { const k = Math.max(0, h - 2.6 * dt) / h; b.vx *= k; b.vz *= k; }
    }
    if (b.y > CEIL - BALL_R) { b.y = CEIL - BALL_R; b.vy = -Math.abs(b.vy) * 0.5; }
    // laterais (placas + alambrado)
    const wz = HALF_W - BALL_R;
    if (b.z > wz) { b.z = wz; if (b.vz > 0) { hit = Math.max(hit, b.vz); b.vz = -b.vz * 0.6; } }
    if (b.z < -wz) { b.z = -wz; if (b.vz < 0) { hit = Math.max(hit, -b.vz); b.vz = -b.vz * 0.6; } }
    // fundos: parede, menos na boca do gol
    const inMouth = Math.abs(b.z) < GOAL_W - BALL_R && b.y < GOAL_H - BALL_R;
    for (const s of [1, -1]) {
      const line = s * HALF_L, sx = s * b.x;
      const inGoal = sx > HALF_L && Math.abs(b.z) < GOAL_W;
      if (sx > HALF_L - BALL_R && !inMouth && !inGoal && sx < HALF_L + 0.3) { b.x = s * (HALF_L - BALL_R); if (s * b.vx > 0) { hit = Math.max(hit, Math.abs(b.vx)); b.vx = -b.vx * 0.6; } }
      // dentro do gol: rede (amortece bastante)
      if (sx > HALF_L) {
        const back = HALF_L + GOAL_D - BALL_R;
        if (sx > back) { b.x = s * back; if (s * b.vx > 0) b.vx = -b.vx * 0.12; b.vz *= 0.6; b.vy *= 0.6; }
        if (Math.abs(b.z) > GOAL_W - BALL_R) { b.z = Math.sign(b.z) * (GOAL_W - BALL_R); b.vz = -b.vz * 0.15; b.vx *= 0.7; }
        if (b.y > GOAL_H - BALL_R) { b.y = GOAL_H - BALL_R; b.vy = -Math.abs(b.vy) * 0.15; }
      }
      // traves e travessão
      for (const pz of [GOAL_W, -GOAL_W]) {
        const dx = b.x - line, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < POST_R + BALL_R && b.y < GOAL_H + POST_R) hit = Math.max(hit, bounceOff(b, dx / d, 0, dz / d, POST_R + BALL_R - d, 0.6));
      }
      if (Math.abs(b.z) < GOAL_W) {
        const dx = b.x - line, dy = b.y - GOAL_H, d = Math.hypot(dx, dy);
        if (d < POST_R + BALL_R) hit = Math.max(hit, bounceOff(b, dx / d, dy / d, 0, POST_R + BALL_R - d, 0.6));
      }
    }
    // jogadores: corpo (cilindro) e cabeça. Encostar empurra a bola (é assim que se conduz).
    for (const p of players || []) {
      const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
      const top = p.y + P_H;
      if (b.y - BALL_R < top - 0.25 && b.y + BALL_R > p.y && d < P_R + BALL_R && d > 1e-6) {
        const e = p.sprint ? 0.5 : 0.25; // correndo, a bola espirra mais longe
        const f = bounceOff(b, dx / d, 0, dz / d, P_R + BALL_R - d, e, p.vx || 0, 0, p.vz || 0);
        if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.4); }
      } else {
        const hy = top - 0.12, ex = b.x - p.x, ey = b.y - hy, ez = b.z - p.z, dd = Math.hypot(ex, ey, ez);
        if (dd < 0.16 + BALL_R && dd > 1e-6) { const f = bounceOff(b, ex / dd, ey / dd, ez / dd, 0.16 + BALL_R - dd, 0.55, p.vx || 0, p.vy || 0, p.vz || 0); if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.5); } }
      }
    }
    // giro visual (a bola rola na direção em que anda)
    b.wx = b.vz / BALL_R; b.wz = -b.vx / BALL_R;
    return { hit, touch };
  }
  // passos fixos de 1/120 s (servidor e navegador fazem a mesma conta)
  function simulate(b, players, dt) {
    let hit = 0, touch = null;
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) { const r = stepBall(b, players, dt / n); hit = Math.max(hit, r.hit); if (r.touch) touch = r.touch; }
    return { hit, touch };
  }
  // gol? "A" se a bola entrou inteira no gol da direita (+x), "B" se entrou no da esquerda
  function goalOf(b) {
    if (Math.abs(b.z) < GOAL_W && b.y < GOAL_H) {
      if (b.x > HALF_L + BALL_R) return "A";
      if (b.x < -HALF_L - BALL_R) return "B";
    }
    return null;
  }

  // ---------- chute ----------
  // tipo: "chute" (força pela barra, mirar para cima levanta a bola), "passe" (rasteiro). Cabeçada se a bola estiver alta.
  const KICK_RANGE = 1.35, KICK_CD = 0.3;
  function canKick(p, b, slack = 0) {
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
    const rel = b.y - p.y;
    if (rel < 1.0) return d < KICK_RANGE + slack ? "pe" : null;
    if (rel < 2.3) return d < 0.9 + slack ? "cabeca" : null;
    return null;
  }
  function kick(b, p, kind, power, yaw, pitch, slack = 0) {
    const how = canKick(p, b, slack); if (!how) return null;
    power = Math.max(0, Math.min(1, power));
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let speed, elev;
    if (how === "cabeca") { speed = 7 + 9 * power; elev = Math.max(-0.35, Math.min(0.5, pitch * 0.8 + 0.05)); }
    else if (kind === "passe") { speed = 4 + 10 * power; elev = 0.02 + Math.max(0, pitch) * 0.25; }
    else { speed = 9 + 20 * power; elev = Math.max(0.04, Math.min(1.1, 0.07 + Math.max(0, pitch + 0.15) * 1.1 + power * 0.04)); }
    const h = Math.cos(elev) * speed;
    b.vx = fx * h + (p.vx || 0) * 0.3; b.vz = fz * h + (p.vz || 0) * 0.3; b.vy = Math.sin(elev) * speed;
    if (how === "pe" && b.y < BALL_R + 0.05) b.y = BALL_R + 0.02;
    return how;
  }

  const api = { HALF_L, HALF_W, GOAL_W, GOAL_H, GOAL_D, FENCE_H, BALL_R, P_R, P_H, POST_R, RUN, SPRINT, CHARGING, KICK_CD, KITS, kitColor, spawns,
    movePlayer, newBall, stepBall, simulate, goalOf, canKick, kick };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Campo = api;
})(typeof window !== "undefined" ? window : globalThis);
