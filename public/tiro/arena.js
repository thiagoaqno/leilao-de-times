// Arena da Galera — mapa, armas, física de movimento e tiros. Usado pelo navegador (desenho, movimento e
// treino offline) e pelo servidor (conferir quem acertou quem). Tudo em metros e segundos.
// O mapa é simétrico pelo centro (x, z) -> (-x, -z): os dois lados têm exatamente as mesmas coberturas.
(function (root) {
  const HALF_X = 30, HALF_Z = 20; // a arena vai de -30 a 30 em x e de -20 a 20 em z
  const R = 0.32, H = 1.8, EYE = 1.62; // raio e altura do jogador, altura do olho

  // caixas: [x0, y0, z0, x1, y1, z1, tipo] — tipos: muro (arenito), caixa (madeira), concreto
  const half = [
    // muros que dividem as três rotas (cima, meio e baixo)
    [-15, 0, -7.5, -5, 4, -6.5, "muro"], [-15, 0, 6.5, -5, 4, 7.5, "muro"],
    // meio: caixas empilhadas de frente para a torre
    [-10.6, 0, -0.6, -9.4, 1.2, 0.6, "caixa"], [-10.6, 1.2, -0.6, -9.4, 2.4, 0.6, "caixa"], [-9.4, 0, -0.6, -8.2, 1.2, 0.6, "caixa"],
    [-3.4, 0, 3.0, -2.2, 1.2, 4.2, "caixa"],
    // rota de cima
    [-11, 0, 12, -9.8, 1.2, 13.2, "caixa"], [-4, 0, 13, -1, 2.2, 14, "concreto"],
    [-20, 0, 15, -18.8, 1.2, 16.2, "caixa"], [-20, 1.2, 15, -18.8, 2.4, 16.2, "caixa"], [-21.2, 0, 15, -20, 1.2, 16.2, "caixa"],
    // rota de baixo
    [-12, 0, -14, -10.8, 1.2, -12.8, "caixa"], [-7, 0, -17, -4.6, 1.2, -15.8, "caixa"], [-17, 0, -11, -16, 1.5, -9, "concreto"],
    // base: muretas para se esconder logo no começo
    [-24, 0, -4, -23, 1.3, -1, "concreto"], [-24, 0, 1, -23, 1.3, 4, "concreto"], [-27, 0, 8, -25.8, 1.2, 9.2, "caixa"],
    // ---- elevações ----
    // escada até o topo da torre do meio (3,2 m): quem sobe vê tudo, mas fica exposto
    ...stairs(-2, -1, 0.4, 1.8, 7, "x"),
    // ninho de sniper perto da base (2,4 m), com mureta e escada
    [-27, 0, 12, -23, 2.4, 16, "muro"], [-23.2, 2.4, 13.6, -23, 3.3, 16, "concreto"], [-27, 2.4, 15.8, -23.2, 3.3, 16, "concreto"],
    ...stairs(-23, 1, 12, 13.4, 5, "x"),
    // passarela na rota de baixo (1,6 m), colada no muro de fora, com degraus nas duas pontas
    [-14, 0, -19.5, -8, 1.6, -17.5, "concreto"],
    ...stairs(-14, -1, -19.5, -17.5, 3, "x", 0.4), ...stairs(-8, 1, -19.5, -17.5, 3, "x", 0.4),
  ];
  // degraus (blocos maciços de 0,4 m de altura cada): começam em `start` e descem no sentido `dir` (+1/-1) do eixo,
  // ocupando de a0 a a1 no outro eixo. O degrau mais alto fica encostado em `start`.
  function stairs(start, dir, a0, a1, n, axis, run = 0.6) {
    const out = [];
    for (let i = 1; i <= n; i++) {
      const near = start + dir * run * (n - i), far = start + dir * run * (n - i + 1), lo = Math.min(near, far), hi = Math.max(near, far);
      out.push(axis === "x" ? [lo, 0, a0, hi, 0.4 * i, a1, "concreto"] : [a0, 0, lo, a1, 0.4 * i, hi, "concreto"]);
    }
    return out;
  }
  const mirror = (b) => [-b[3], b[1], -b[5], -b[0], b[4], -b[2], b[6]];
  const T = 1, WH = 7; // espessura e altura do muro de fora
  const BOXES = [
    [-HALF_X - T, 0, -HALF_Z - T, HALF_X + T, WH, -HALF_Z, "muro"], [-HALF_X - T, 0, HALF_Z, HALF_X + T, WH, HALF_Z + T, "muro"],
    [-HALF_X - T, 0, -HALF_Z, -HALF_X, WH, HALF_Z, "muro"], [HALF_X, 0, -HALF_Z, HALF_X + T, WH, HALF_Z, "muro"],
    [-2, 0, -2, 2, 3.2, 2, "muro"], // torre do meio
    ...half, ...half.map(mirror),
  ];

  // time A nasce no oeste olhando para o leste; time B é o espelho
  const SPAWNS = {
    A: [[-27, 0, -2, -Math.PI / 2], [-27, 0, 2, -Math.PI / 2]],
    B: [[27, 0, 2, Math.PI / 2], [27, 0, -2, Math.PI / 2]],
  };

  // velocidades ~ as do CS (1 unidade do CS ≈ 2,54 cm)
  const WEAPONS = {
    ak: { id: "ak", name: "AK-47", dmg: 36, head: 4, legs: 0.75, interval: 0.1, mag: 30, reserve: 90, reload: 2.5, speed: 5.46, auto: true },
    awp: { id: "awp", name: "AWP", dmg: 115, head: 4, legs: 0.75, interval: 1.46, mag: 5, reserve: 30, reload: 3.7, speed: 5.08, scopedSpeed: 2.54, auto: false },
    deagle: { id: "deagle", name: "Desert Eagle", dmg: 53, head: 4, legs: 0.75, interval: 0.27, mag: 7, reserve: 35, reload: 2.2, speed: 5.84, auto: false },
    // faca: corpo a corpo (alcance 1,9 m). Botão esquerdo rápido, direito forte; pelas costas o dano é bem maior. Corre mais.
    faca: { id: "faca", name: "Faca", dmg: 40, heavy: 65, head: 1, legs: 1, interval: 0.5, heavyInterval: 1.0, mag: 0, reserve: 0, reload: 0, speed: 6.35, auto: true, melee: true, reach: 1.9 },
  };
  const SLOTS = ["principal", "deagle", "faca"]; // teclas 1, 2 e 3

  // ---------- física (estilo Quake/Source: atrito, aceleração e pouco controle no ar) ----------
  const G = 20.3, JUMP = 7.65, FRICTION = 5.2, STOP = 2.03, ACCEL = 5.5, AIR_ACCEL = 12, AIR_CAP = 0.76;
  function overlaps(x, y, z, b) {
    return x + R > b[0] && x - R < b[3] && y + H > b[1] && y < b[4] && z + R > b[2] && z - R < b[5];
  }
  function hitBox(x, y, z) { for (const b of BOXES) if (overlaps(x, y, z, b)) return b; return null; }
  // degrau: no chão, encostou numa caixa de até 0,45 m acima dos pés e tem espaço em cima? sobe
  function tryStep(p, b) {
    const rise = b[4] - p.y;
    if (!p.onGround || rise <= 0 || rise > 0.45 || hitBox(p.x, b[4] + 1e-3, p.z)) return false;
    p.y = b[4] + 1e-4; return true;
  }
  function accelerate(p, wx, wz, wishSpeed, accel, dt) {
    const cap = p.onGround ? wishSpeed : Math.min(wishSpeed, AIR_CAP);
    const cur = p.vx * wx + p.vz * wz, add = cap - cur;
    if (add <= 0) return;
    const acc = Math.min(accel * dt * wishSpeed, add);
    p.vx += acc * wx; p.vz += acc * wz;
  }
  // p: {x,y,z,vx,vy,vz,onGround}; wish: {x, z} direção no mundo (comprimento 0 ou 1), speed, jump
  function step(p, wish, dt) {
    if (p.onGround) {
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0) { const drop = Math.max(sp, STOP) * FRICTION * dt, k = Math.max(sp - drop, 0) / sp; p.vx *= k; p.vz *= k; }
      accelerate(p, wish.x, wish.z, wish.speed, ACCEL, dt);
      if (wish.jump) { p.vy = JUMP; p.onGround = false; }
    } else accelerate(p, wish.x, wish.z, wish.speed, AIR_ACCEL, dt);
    p.vy -= G * dt;
    // um eixo de cada vez: bateu, encosta na parede e zera a velocidade naquele eixo
    p.x += p.vx * dt;
    let b = hitBox(p.x, p.y, p.z);
    if (b && !tryStep(p, b)) { p.x = p.vx > 0 ? b[0] - R - 1e-4 : b[3] + R + 1e-4; p.vx = 0; }
    p.z += p.vz * dt;
    b = hitBox(p.x, p.y, p.z);
    if (b && !tryStep(p, b)) { p.z = p.vz > 0 ? b[2] - R - 1e-4 : b[5] + R + 1e-4; p.vz = 0; }
    p.y += p.vy * dt;
    p.onGround = false;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    b = hitBox(p.x, p.y, p.z);
    if (b) {
      if (p.vy <= 0) { p.y = b[4]; p.onGround = true; } else p.y = b[1] - H - 1e-4;
      p.vy = 0;
    }
    if (!p.onGround && p.vy <= 0) { // em cima de uma caixa, parado
      for (const c of BOXES) if (Math.abs(p.y - c[4]) < 1e-3 && p.x + R > c[0] && p.x - R < c[3] && p.z + R > c[2] && p.z - R < c[5]) { p.onGround = true; break; }
    }
  }
  function move(p, wish, dt) { // passos pequenos para não atravessar nada
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) step(p, wish, dt / n);
  }

  // ---------- tiros ----------
  const dirOf = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  // raio x caixa (método das placas): devolve t e a normal da face atingida
  function rayAABB(o, d, b0, b1) {
    let tmin = -Infinity, tmax = Infinity, axis = -1, sign = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < b0[i] || o[i] > b1[i]) return null; continue; }
      let t1 = (b0[i] - o[i]) / d[i], t2 = (b1[i] - o[i]) / d[i], s = -1;
      if (t1 > t2) { const k = t1; t1 = t2; t2 = k; s = 1; }
      if (t1 > tmin) { tmin = t1; axis = i; sign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    if (tmax < 0) return null;
    const n = [0, 0, 0]; if (axis >= 0) n[axis] = sign;
    return { t: Math.max(tmin, 0), n };
  }
  function rayMap(o, d, max = 200) {
    let best = { t: max, n: null };
    if (d[1] < 0) { const t = -o[1] / d[1]; if (t < best.t) best = { t, n: [0, 1, 0] }; } // chão
    for (const b of BOXES) {
      const r = rayAABB(o, d, [b[0], b[1], b[2]], [b[3], b[4], b[5]]);
      if (r && r.t < best.t) best = r;
    }
    return best;
  }
  function raySphere(o, d, c, r) {
    const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
    const b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : null;
  }
  // alvos: [{id, x, y, z}] (pés). Devolve o primeiro acerto antes da parede: {id, t, part, point}
  function hitScan(o, d, targets, max = 200) {
    const wall = rayMap(o, d, max);
    let best = null;
    for (const p of targets) {
      const th = raySphere(o, d, [p.x, p.y + 1.6, p.z], 0.21);
      const rb = rayAABB(o, d, [p.x - 0.3, p.y, p.z - 0.3], [p.x + 0.3, p.y + 1.45, p.z + 0.3]);
      let t = null, part = null;
      if (th != null) { t = th; part = "head"; }
      if (rb && (t == null || rb.t < t)) { t = rb.t; part = o[1] + d[1] * rb.t - p.y < 0.75 ? "legs" : "body"; }
      if (t != null && t < wall.t && (!best || t < best.t)) best = { id: p.id, t, part };
    }
    const t = best ? best.t : wall.t;
    const point = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    return best ? { ...best, point } : { id: null, t, point, normal: wall.n };
  }
  function damage(w, part, heavy = false) {
    const W = WEAPONS[w];
    return Math.round((heavy && W.heavy ? W.heavy : W.dmg) * (part === "head" ? W.head : part === "legs" ? W.legs : 1));
  }

  const api = { HALF_X, HALF_Z, R, H, EYE, BOXES, SPAWNS, WEAPONS, SLOTS, move, dirOf, rayMap, hitScan, damage };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Arena = api;
})(typeof window !== "undefined" ? window : globalThis);
