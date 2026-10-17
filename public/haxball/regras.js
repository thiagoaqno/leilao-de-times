// Futebol de discos 2D. O servidor usa estas regras; o navegador só desenha o estado recebido.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Haxball = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const W = 960, H = 540, LEFT = 42, RIGHT = 918, TOP = 48, BOTTOM = 492;
  const GOAL_TOP = 208, GOAL_BOTTOM = 332, PR = 19, BR = 11;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function nova(players, config, now = Date.now()) {
    const count = [0, 0];
    const discs = players.map((p) => {
      const slot = count[p.team]++, n = config.size;
      return { id: p.id, name: p.name, team: p.team, x: p.team ? 710 : 250,
        y: H / 2 + (slot - (n - 1) / 2) * Math.min(74, 360 / Math.max(1, n - 1)),
        homeX: p.team ? 710 : 250, homeY: H / 2 + (slot - (n - 1) / 2) * Math.min(74, 360 / Math.max(1, n - 1)),
        vx: 0, vy: 0, input: { x: 0, y: 0 }, kick: false, lastKick: 0 };
    });
    return { discs, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 }, score: [0, 0],
      phase: "ready", resumeAt: now + 2200, remaining: config.minutes * 60, limit: config.goals,
      lastEvent: "A partida vai começar!", winner: null };
  }
  function reset(m, now) {
    m.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    for (const p of m.discs) { p.x = p.homeX; p.y = p.homeY; p.vx = 0; p.vy = 0; p.kick = false; }
    m.phase = "ready"; m.resumeAt = now + 2200;
  }
  function step(m, dt, now = Date.now()) {
    if (m.phase === "over") return null;
    if (m.phase === "ready") {
      if (now >= m.resumeAt) { m.phase = "play"; m.lastEvent = "Bola rolando!"; return "start"; }
      return null;
    }
    dt = clamp(dt, 0, 1 / 30);
    m.remaining = Math.max(0, m.remaining - dt);
    if (m.remaining <= 0) {
      m.phase = "over"; m.winner = m.score[0] === m.score[1] ? null : (m.score[0] > m.score[1] ? 0 : 1);
      m.lastEvent = m.winner === null ? "Empate!" : `Vitória do time ${m.winner === 0 ? "azul" : "vermelho"}!`;
      return "over";
    }
    for (const p of m.discs) {
      const ix = clamp(Number(p.input.x) || 0, -1, 1), iy = clamp(Number(p.input.y) || 0, -1, 1);
      const mag = Math.max(1, Math.hypot(ix, iy));
      const accel = 1700, drag = Math.exp(-7 * dt);
      p.vx = (p.vx + ix / mag * accel * dt) * drag;
      p.vy = (p.vy + iy / mag * accel * dt) * drag;
      const speed = Math.hypot(p.vx, p.vy), max = 270;
      if (speed > max) { p.vx *= max / speed; p.vy *= max / speed; }
      p.x = clamp(p.x + p.vx * dt, LEFT + PR, RIGHT - PR);
      p.y = clamp(p.y + p.vy * dt, TOP + PR, BOTTOM - PR);
    }
    // Evita sobreposição entre discos, mesmo com dez jogadores na quadra.
    for (let i = 0; i < m.discs.length; i++) for (let j = i + 1; j < m.discs.length; j++) {
      const a = m.discs[i], b = m.discs[j];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= PR * 2) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      const push = (PR * 2 - d) / 2, nx = dx / d, ny = dy / d;
      a.x = clamp(a.x - nx * push, LEFT + PR, RIGHT - PR);
      a.y = clamp(a.y - ny * push, TOP + PR, BOTTOM - PR);
      b.x = clamp(b.x + nx * push, LEFT + PR, RIGHT - PR);
      b.y = clamp(b.y + ny * push, TOP + PR, BOTTOM - PR);
    }
    const ball = m.ball;
    for (const p of m.discs) {
      let dx = ball.x - p.x, dy = ball.y - p.y, d = Math.hypot(dx, dy);
      if (d < 0.001) { dx = p.team ? -1 : 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d;
      if (d < PR + BR) {
        ball.x = p.x + nx * (PR + BR); ball.y = p.y + ny * (PR + BR);
        const closing = (p.vx - ball.vx) * nx + (p.vy - ball.vy) * ny;
        if (closing > 0) { ball.vx += nx * closing * 1.12; ball.vy += ny * closing * 1.12; }
      }
      if (p.kick && now - p.lastKick >= 230) {
        p.lastKick = now;
        if (d < PR + BR + 29) {
          ball.vx = nx * 615 + p.vx * 0.25;
          ball.vy = ny * 615 + p.vy * 0.25;
        }
      }
      p.kick = false;
    }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    const friction = Math.exp(-1.15 * dt);
    ball.vx *= friction; ball.vy *= friction;
    if (ball.y < TOP + BR) { ball.y = TOP + BR; ball.vy = Math.abs(ball.vy) * 0.84; }
    if (ball.y > BOTTOM - BR) { ball.y = BOTTOM - BR; ball.vy = -Math.abs(ball.vy) * 0.84; }
    const inGoal = ball.y > GOAL_TOP + BR && ball.y < GOAL_BOTTOM - BR;
    if (inGoal && (ball.x < LEFT - BR || ball.x > RIGHT + BR)) {
      const team = ball.x < LEFT ? 1 : 0;
      m.score[team]++;
      m.lastEvent = `Gol do time ${team === 0 ? "azul" : "vermelho"}!`;
      if (m.score[team] >= m.limit) { m.phase = "over"; m.winner = team; return "over"; }
      reset(m, now); return "goal";
    }
    if (ball.x < LEFT + BR && !inGoal) { ball.x = LEFT + BR; ball.vx = Math.abs(ball.vx) * 0.84; }
    if (ball.x > RIGHT - BR && !inGoal) { ball.x = RIGHT - BR; ball.vx = -Math.abs(ball.vx) * 0.84; }
    return null;
  }
  function snapshot(m) {
    return { discs: m.discs.map(({ id, name, team, x, y, vx, vy }) => ({ id, name, team, x, y, vx, vy })),
      ball: { ...m.ball }, score: [...m.score], phase: m.phase, remaining: m.remaining,
      resumeAt: m.resumeAt, lastEvent: m.lastEvent, winner: m.winner };
  }
  return { W, H, LEFT, RIGHT, TOP, BOTTOM, GOAL_TOP, GOAL_BOTTOM, PR, BR, nova, step, snapshot };
});
