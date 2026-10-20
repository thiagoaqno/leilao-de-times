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
      return { id: p.id, name: p.name, team: p.team, bot: !!p.bot, x: p.team ? 710 : 250,
        y: H / 2 + (slot - (n - 1) / 2) * Math.min(74, 360 / Math.max(1, n - 1)),
        homeX: p.team ? 710 : 250, homeY: H / 2 + (slot - (n - 1) / 2) * Math.min(74, 360 / Math.max(1, n - 1)),
        vx: 0, vy: 0, input: { x: 0, y: 0 }, kick: false, lastKick: 0 };
    });
    return { discs, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 }, score: [0, 0],
      phase: "ready", resumeAt: now + 2200, remaining: config.minutes * 60, limit: config.goals,
      lastEvent: "A partida vai começar!", winner: null, fxSeq: 0, fx: [] };
  }
  function effect(m, kind, x, y, team = null, id = null) {
    m.fx.push({ seq: ++m.fxSeq, kind, x, y, team, id });
    if (m.fx.length > 12) m.fx.shift();
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
      const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (closing > 45) {
        const impulse = closing * 0.22;
        a.vx -= nx * impulse; a.vy -= ny * impulse;
        b.vx += nx * impulse; b.vy += ny * impulse;
        if (closing > 100 && now - (a.lastBump?.[b.id] || 0) > 180) {
          (a.lastBump ||= {})[b.id] = now;
          effect(m, "bump", (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      }
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
        if (closing > 0) {
          ball.vx += nx * closing * 1.12; ball.vy += ny * closing * 1.12;
          if (closing > 85 && now - (p.lastTouch || 0) > 160) { p.lastTouch = now; effect(m, "touch", ball.x, ball.y, p.team, p.id); }
        }
      }
      if (p.kick && now - p.lastKick >= 230) {
        p.lastKick = now;
        if (d < PR + BR + 29) {
          ball.vx = nx * 615 + p.vx * 0.25;
          ball.vy = ny * 615 + p.vy * 0.25;
          effect(m, "kick", ball.x, ball.y, p.team, p.id);
        }
      }
      p.kick = false;
    }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    const friction = Math.exp(-1.15 * dt);
    ball.vx *= friction; ball.vy *= friction;
    if (ball.y < TOP + BR) { ball.y = TOP + BR; if (ball.vy < -150) effect(m, "wall", ball.x, ball.y); ball.vy = Math.abs(ball.vy) * 0.84; }
    if (ball.y > BOTTOM - BR) { ball.y = BOTTOM - BR; if (ball.vy > 150) effect(m, "wall", ball.x, ball.y); ball.vy = -Math.abs(ball.vy) * 0.84; }
    const inGoal = ball.y > GOAL_TOP + BR && ball.y < GOAL_BOTTOM - BR;
    if (inGoal && (ball.x < LEFT - BR || ball.x > RIGHT + BR)) {
      const team = ball.x < LEFT ? 1 : 0;
      effect(m, "goal", ball.x, ball.y, team);
      m.score[team]++;
      m.lastEvent = `Gol do time ${team === 0 ? "azul" : "vermelho"}!`;
      if (m.score[team] >= m.limit) { m.phase = "over"; m.winner = team; return "over"; }
      reset(m, now); return "goal";
    }
    // bola presa: 4 s quase no mesmo lugar, encostada numa parede (no canto, entre dois discos)? volta para dentro, como um lateral
    const naParede = ball.x < LEFT + BR + 14 || ball.x > RIGHT - BR - 14 || ball.y < TOP + BR + 14 || ball.y > BOTTOM - BR - 14;
    if (!naParede || !m.presa || Math.hypot(ball.x - m.presa.x, ball.y - m.presa.y) > 25) m.presa = naParede ? { t: now, x: ball.x, y: ball.y } : null;
    else if (now - m.presa.t > 4000) {
      const cx = W / 2 - ball.x, cy = H / 2 - ball.y, cl = Math.hypot(cx, cy) || 1;
      ball.x += (cx / cl) * 70; ball.y += (cy / cl) * 70; ball.vx = ball.vy = 0; m.presa = null;
      effect(m, "wall", ball.x, ball.y); m.lastEvent = "Bola presa: volta para o campo";
    }
    if (ball.x < LEFT + BR && !inGoal) { ball.x = LEFT + BR; if (ball.vx < -150) effect(m, "wall", ball.x, ball.y); ball.vx = Math.abs(ball.vx) * 0.84; }
    if (ball.x > RIGHT - BR && !inGoal) { ball.x = RIGHT - BR; if (ball.vx > 150) effect(m, "wall", ball.x, ball.y); ball.vx = -Math.abs(ball.vx) * 0.84; }
    return null;
  }
  // ---------- robôs ----------
  // Cada robô decide a cada passo para onde ir e se chuta. O mais perto da bola do time vai nela; se o time tem 2 ou
  // mais, o mais recuado fica de goleiro (anda na frente do gol, acompanhando a bola); os outros guardam posição. Quem
  // vai na bola contorna por trás dela (do lado do próprio gol) e só chuta com o gol adversário na frente.
  const NIVEIS = { facil: { vel: 0.72, mira: 0.62, reacao: 0.35 }, medio: { vel: 0.88, mira: 0.8, reacao: 0.18 }, dificil: { vel: 1, mira: 0.92, reacao: 0.06 } };
  function robo(m, p, nivel = "medio", now = Date.now()) {
    const N = NIVEIS[nivel] || NIVEIS.medio, ball = m.ball, ataca = p.team === 0 ? 1 : -1;
    const golAlvo = { x: ataca > 0 ? RIGHT + 10 : LEFT - 10, y: H / 2 }, golMeu = { x: ataca > 0 ? LEFT : RIGHT, y: H / 2 };
    const time = m.discs.filter((d) => d.team === p.team), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // a bola daqui a pouco (quem pensa mais rápido mira mais longe)
    const prev = 0.12 + (1 - N.reacao) * 0.18, bola = { x: ball.x + ball.vx * prev, y: ball.y + ball.vy * prev };
    // os papéis são divididos só entre os robôs (gente joga do jeito que quiser): o robô mais perto da bola vai nela e,
    // se sobrar mais de um, o mais recuado fica no gol
    const robos = time.filter((d) => d.bot || d === p);
    const atacante = robos.reduce((a, d) => (dist(d, bola) < dist(a, bola) ? d : a), robos[0]);
    const goleiro = robos.length > 1 ? robos.filter((d) => d !== atacante).reduce((a, d) => (Math.abs(d.x - golMeu.x) < Math.abs(a.x - golMeu.x) ? d : a)) : null;
    let alvo, chuta = false;
    const dentro = (q) => ({ x: Math.max(LEFT + PR, Math.min(RIGHT - PR, q.x)), y: Math.max(TOP + PR, Math.min(BOTTOM - PR, q.y)) });
    // travado: colado na bola que quase não sai do lugar (no canto, contra outro disco) há mais de 1 s? chuta (a bola
    // quica nas paredes e sai) e recua um pouco antes de tentar de novo
    const colado = dist(p, ball) < PR + BR + 10;
    if (!colado) p.travado = null;
    else if (!p.travado) p.travado = { t: now, x: ball.x, y: ball.y };
    else if (Math.hypot(ball.x - p.travado.x, ball.y - p.travado.y) > 30) p.travado = { t: now, x: ball.x, y: ball.y };
    else if (now - p.travado.t > 900 + (p.team ? 300 : 0)) { p.recua = now + 600; p.travado = null; return { x: 0, y: 0, kick: true }; }
    if (p.recua > now) {
      const cx = W / 2 - ball.x, cy = H / 2 - ball.y, cl = Math.hypot(cx, cy) || 1;
      alvo = dentro({ x: ball.x + (cx / cl) * 80 - ataca * 30, y: ball.y + (cy / cl) * 80 });
    } else if (p === atacante) {
      // ponto atrás da bola, na linha bola -> gol adversário
      const gx = golAlvo.x - bola.x, gy = golAlvo.y - bola.y, gl = Math.hypot(gx, gy) || 1, ux = gx / gl, uy = gy / gl;
      const atras = { x: bola.x - ux * (PR + BR + 4), y: bola.y - uy * (PR + BR + 4) };
      const naFrente = (p.x - bola.x) * ux + (p.y - bola.y) * uy > -2; // está do lado errado da bola
      if (naFrente && dist(p, bola) < 90) { // contorna pelo lado, sem empurrar a bola para o próprio gol
        const lado = (p.y - bola.y) >= 0 ? 1 : -1;
        alvo = { x: bola.x - ux * 34 - uy * lado * 46, y: bola.y - uy * 34 + ux * lado * 46 };
      } else alvo = dist(p, dentro(atras)) > 14 ? atras : { x: bola.x + ux * 20, y: bola.y + uy * 20 }; // alinhado: empurra para o gol
      alvo = dentro(alvo);
      const dx = ball.x - p.x, dy = ball.y - p.y, dl = Math.hypot(dx, dy) || 1, alinhado = (dx * ux + dy * uy) / dl;
      chuta = dl < PR + BR + 24 && alinhado > N.mira && dx * ataca > 0;
      // perto do próprio gol, qualquer chute para longe vale (afastar o perigo)
      if (!chuta && dl < PR + BR + 24 && Math.abs(p.x - golMeu.x) < 170 && dx * ataca > 0) chuta = true;
    } else if (p === goleiro) {
      const gy = Math.max(GOAL_TOP + 10, Math.min(GOAL_BOTTOM - 10, bola.y));
      alvo = { x: golMeu.x + ataca * (PR + 22), y: gy };
      if (dist(p, ball) < PR + BR + 22 && (ball.x - p.x) * ataca > 0) chuta = true; // tira a bola da área
    } else {
      // os outros: um pouco atrás da bola, espalhados na altura do campo
      const outros = robos.filter((d) => d !== atacante && d !== goleiro), k = outros.indexOf(p), n = outros.length;
      const faixa = n > 1 ? TOP + 60 + (k / (n - 1)) * (BOTTOM - TOP - 120) : H / 2 + (bola.y - H / 2) * 0.5;
      alvo = { x: Math.max(LEFT + 60, Math.min(RIGHT - 60, bola.x - ataca * 140)), y: faixa };
    }
    // anda até o alvo (freia chegando), com um tremidinho de quem não é perfeito
    const ax = alvo.x - p.x, ay = alvo.y - p.y, al = Math.hypot(ax, ay), forca = Math.min(1, al / 26) * N.vel;
    const ruido = Math.sin(now / 370 + p.x * 0.01) * N.reacao * 0.4;
    return { x: al > 1 ? (ax / al) * forca + ruido * 0.3 : 0, y: al > 1 ? (ay / al) * forca - ruido * 0.3 : 0, kick: chuta };
  }
  function snapshot(m) {
    return { discs: m.discs.map(({ id, name, team, x, y, vx, vy, bot }) => ({ id, name, team, x, y, vx, vy, bot: !!bot })),
      ball: { ...m.ball }, score: [...m.score], phase: m.phase, remaining: m.remaining,
      resumeAt: m.resumeAt, lastEvent: m.lastEvent, winner: m.winner, fxSeq: m.fxSeq, fx: m.fx.map((e) => ({ ...e })) };
  }
  return { W, H, LEFT, RIGHT, TOP, BOTTOM, GOAL_TOP, GOAL_BOTTOM, PR, BR, NIVEIS, nova, step, snapshot, robo };
});
