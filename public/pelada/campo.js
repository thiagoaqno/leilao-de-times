// Pelada da Galera — arenas, uniformes, carros e física (bola, jogador a pé e carro). Usado pelo servidor (quem manda
// na bola) e pelo navegador (prever a bola, mexer o próprio jogador/carro e o modo treino).
// Dois modos: "pes" (futsal, quadra 40 x 24 m) e "carros" (estilo Rocket League: arena 80 x 54 m e bola gigante).
// Tudo em metros e segundos. O time A ataca para +x (defende o gol da esquerda); o B ataca para -x.
(function (root) {
  const MODES = {
    pes: { id: "pes", L: 20, W: 12, goalW: 1.6, goalH: 2.1, goalD: 1.2, ballR: 0.15, wallH: 7, ceil: 14, g: 9.81, bounce: 0.55, roll: 2.6, drag: 0.012, wallE: 0.6, postR: 0.05, areaR: 6, circle: 3 },
    // carros: física da bola do Rocket League (parâmetros da Psyonix convertidos de uu para metros: 1 uu = 1 cm):
    // gravidade 650 uu/s², quique 0,6, atrito 0,35 com giro, arrasto linear 0,0305/s, até 6000 uu/s e 6 rad/s
    carros: { id: "carros", L: 40, W: 27, goalW: 7, goalH: 5.5, goalD: 4, ballR: 1.25, wallH: 18, ceil: 18, g: 6.5, bounce: 0.6, roll: 0, drag: 0.0305, wallE: 0.6, postR: 0.3, areaR: 14, circle: 9,
      rl: true, mu: 0.35, vmax: 60, wmax: 6, carE: 0.1 },
  };
  const P_R = 0.35, P_H = 1.8;

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
  const kitOf = (k) => KITS[k] || KITS.corinthians;
  // cor principal (placar, nome em cima, pintura do carro) e a segunda cor (faixa do carro)
  const kitColor = (k) => kitOf(k).c[kitOf(k).kind === "band" ? 1 : 0];
  const kitColor2 = (k) => { const K = kitOf(k); return K.c[1] || K.num; };

  // carros (pixelados, de caixinhas) inspirados em clássicos
  const CARS = {
    godzilla: { name: "Godzilla", inspo: "inspirado no Nissan GT-R R34" },
    noveonze: { name: "Nove-Onze", inspo: "inspirado no Porsche 911" },
    cavallino: { name: "Cavallino", inspo: "inspirada na Ferrari F40" },
    bimmer: { name: "Bimmer", inspo: "inspirado no BMW M3 E30" },
  };

  // ---------- posições na saída ----------
  // pés: quem dá a saída fica no meio; goleiro (se tiver) no gol. Carros: em leque, como no Rocket League.
  function spawns(mode, team, list, kicking) {
    const F = MODES[mode], s = team === "A" ? -1 : 1, yaw = team === "A" ? -Math.PI / 2 : Math.PI / 2;
    if (mode === "carros") {
      const spots = [[F.L - 10, 0], [F.L - 16, -11], [F.L - 16, 11], [F.L - 4, -6], [F.L - 4, 6]];
      return list.map((p, i) => [s * spots[i % 5][0], 0, s * spots[i % 5][1], yaw]);
    }
    const field = [[kicking ? 1.2 : 5, 0], [9, -5], [9, 5], [14, -2.5], [14, 2.5]];
    let k = 0;
    return list.map((p) => {
      if (p.gk) return [s * (F.L - 1), 0, 0, yaw];
      const [d, z] = field[k++ % field.length];
      return [s * d, 0, s * z, yaw];
    });
  }
  // a área do goleiro (meio círculo de raio areaR em volta do centro do gol)
  function inArea(mode, team, x, z) {
    const F = MODES[mode], gx = team === "A" ? -F.L : F.L;
    return Math.hypot(x - gx, z) < F.areaR;
  }

  // ---------- jogador a pé ----------
  const RUN = 6.4, SPRINT = 8.4, CHARGING = 4.2, ACC = 34, AIR_ACC = 8, JUMP = 4.6;
  // p: {x,y,z,vx,vy,vz,onGround}; wish: {x, z} (direção no mundo, comprimento 0..1), speed, jump
  function movePlayer(p, wish, dt, F = MODES.pes) {
    const acc = p.onGround ? ACC : AIR_ACC;
    const tx = wish.x * wish.speed, tz = wish.z * wish.speed;
    const dx = tx - p.vx, dz = tz - p.vz, d = Math.hypot(dx, dz), m = acc * dt;
    if (!wish.free) { if (d <= m) { p.vx = tx; p.vz = tz; } else { p.vx += (dx / d) * m; p.vz += (dz / d) * m; } }
    if (wish.jump && p.onGround) { p.vy = JUMP; p.onGround = false; }
    p.vy -= F.g * 1.4 * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    const lx = F.L - P_R, lz = F.W - P_R;
    if (p.x < -lx) { p.x = -lx; p.vx = 0; } if (p.x > lx) { p.x = lx; p.vx = 0; }
    if (p.z < -lz) { p.z = -lz; p.vz = 0; } if (p.z > lz) { p.z = lz; p.vz = 0; }
  }

  // ---------- carro (estilo Rocket League) ----------
  const CAR = { hx: 0.95, hy: 0.6, hz: 1.9, lift: 0.65, max: 14, boostMax: 23, jump: 6.2 };
  // c: {x,y,z,vx,vy,vz,yaw,pitch,onGround,jumps,jumpT,flipT,boost}; inp: {thr, steer, boost, jump (apertou agora), drift}
  function moveCar(c, inp, dt, F = MODES.carros) {
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    const boosting = inp.boost && c.boost > 0;
    if (boosting) c.boost = Math.max(0, c.boost - 34 * dt); else c.boost = Math.min(100, c.boost + 5 * dt);
    c.jumpT += dt;
    if (c.flipT > 0) c.flipT = Math.max(0, c.flipT - dt);
    if (c.onGround) {
      let fv = c.vx * fx + c.vz * fz, lat = c.vx * rx + c.vz * rz;
      const t = inp.thr;
      if (t > 0) fv += (fv < 0 ? 32 : 15) * t * dt;
      else if (t < 0) fv += (fv > 0 ? -32 : -12) * -t * dt;
      else fv -= Math.sign(fv) * Math.min(Math.abs(fv), 5 * dt);
      if (boosting) fv += 22 * dt;
      const top = boosting ? CAR.boostMax : CAR.max;
      if (fv > top) fv = boosting ? top : Math.max(top, fv - 9 * dt);
      if (fv < -9) fv = -9;
      lat *= Math.exp(-dt * (inp.drift ? 1.6 : 11)); // aderência (no freio de mão, derrapa)
      const turn = (2.7 / (1 + Math.abs(fv) / 16)) * Math.min(1, Math.abs(fv) / 2.5) * (inp.drift ? 1.5 : 1);
      c.yaw -= inp.steer * turn * Math.sign(fv || 1) * dt;
      const nfx = -Math.sin(c.yaw), nfz = -Math.cos(c.yaw), nrx = Math.cos(c.yaw), nrz = -Math.sin(c.yaw);
      c.vx = nfx * fv + nrx * lat; c.vz = nfz * fv + nrz * lat;
      c.pitch *= Math.exp(-dt * 12);
      if (inp.jump) { c.vy = CAR.jump; c.onGround = false; c.jumps = 1; c.jumpT = 0; }
    } else {
      c.vy -= F.g * 1.1 * dt;
      // no ar: W abaixa o bico, S levanta (como no Rocket League); A/D giram
      c.pitch = Math.max(-1.3, Math.min(1.3, c.pitch - inp.thr * 3.2 * dt));
      c.yaw -= inp.steer * 2.4 * dt;
      if (boosting) { const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch); c.vx += fx * cp * 24 * dt; c.vz += fz * cp * 24 * dt; c.vy += sp * 24 * dt; }
      if (inp.jump && c.jumps === 1 && c.jumpT < 1.4) {
        c.jumps = 2;
        if (inp.thr || inp.steer) { // mortal: um tranco na direção apertada
          const d = Math.hypot(inp.thr, inp.steer), kf = inp.thr / d, ks = inp.steer / d;
          c.vx += (fx * kf + rx * ks) * 9; c.vz += (fz * kf + rz * ks) * 9; c.vy = Math.max(c.vy, 1.5);
          c.flipT = 0.65; c.flipDir = [kf, ks];
        } else c.vy += 5.2;
      }
      const sp = Math.hypot(c.vx, c.vz); if (sp > 30) { c.vx *= 30 / sp; c.vz *= 30 / sp; }
    }
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (c.y <= 0) { c.y = 0; if (!c.onGround) { c.onGround = true; c.jumps = 0; c.flipT = 0; } c.vy = 0; }
    if (c.y > F.ceil - 1.4) { c.y = F.ceil - 1.4; c.vy = -Math.abs(c.vy) * 0.3; }
    // paredes (dá para entrar no gol)
    const r = 1.6, inGoal = Math.abs(c.z) < F.goalW - 1.2 && c.y < F.goalH - 1.3;
    const lx = inGoal ? F.L + F.goalD - r : F.L - r, lz = (Math.abs(c.x) > F.L - 0.2 ? F.goalW - 1.2 : F.W - r);
    if (c.x > lx) { c.x = lx; c.vx = -Math.abs(c.vx) * 0.3; } if (c.x < -lx) { c.x = -lx; c.vx = Math.abs(c.vx) * 0.3; }
    if (c.z > lz) { c.z = lz; c.vz = -Math.abs(c.vz) * 0.3; } if (c.z < -lz) { c.z = -lz; c.vz = Math.abs(c.vz) * 0.3; }
  }

  // ---------- bola ----------
  const newBall = (F = MODES.pes) => ({ x: 0, y: F.ballR, z: 0, vx: 0, vy: 0, vz: 0, sp: 0, wx: 0, wy: 0, wz: 0, holder: null });
  // Rocket League: batida da bola numa superfície (chão, parede, teto) com atrito de Coulomb e giro.
  // O ponto de contato desliza com v + w × r; o atrito tira até mu·Jn desse deslize (ou tudo, e a bola passa a rolar)
  // e vira giro. Devolve a força da batida.
  function rlContact(F, b, nx, ny, nz, pen) {
    const R = F.ballR;
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rx = -nx * R, ry = -ny * R, rz = -nz * R; // do centro até o ponto de contato
    const cx = b.vx + (b.wy * rz - b.wz * ry), cy = b.vy + (b.wz * rx - b.wx * rz), cz = b.vz + (b.wx * ry - b.wy * rx);
    const vn = cx * nx + cy * ny + cz * nz;
    if (vn >= 0) return 0;
    const e = vn > -0.3 ? 0 : F.bounce, jn = -(1 + e) * vn; // impulso por unidade de massa
    const tx = cx - nx * vn, ty = cy - ny * vn, tz = cz - nz * vn, tl = Math.hypot(tx, ty, tz);
    let jx = 0, jy = 0, jz = 0;
    if (tl > 1e-4) { const jt = Math.min((2 / 7) * tl, F.mu * jn); jx = -tx / tl * jt; jy = -ty / tl * jt; jz = -tz / tl * jt; }
    b.vx += nx * jn + jx; b.vy += ny * jn + jy; b.vz += nz * jn + jz;
    const k = 1 / (0.4 * R * R); // giro: (r × J) / I, com I = 2/5·m·R²
    b.wx += (ry * jz - rz * jy) * k; b.wy += (rz * jx - rx * jz) * k; b.wz += (rx * jy - ry * jx) * k;
    return -vn;
  }
  function bounceOff(b, nx, ny, nz, pen, e, vx = 0, vy = 0, vz = 0) {
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rv = (b.vx - vx) * nx + (b.vy - vy) * ny + (b.vz - vz) * nz;
    if (rv < 0) { b.vx -= (1 + e) * rv * nx; b.vy -= (1 + e) * rv * ny; b.vz -= (1 + e) * rv * nz; }
    return rv < 0 ? -rv : 0;
  }
  // corpos: {id, kind: "pe"|"car", x,y,z,vx,vy,vz, yaw, sprint, slide, dive, flip}
  function hitBody(b, p, R, F = MODES.pes) {
    if (p.kind === "car") {
      const cy = p.y + CAR.lift, dx = b.x - p.x, dy = b.y - cy, dz = b.z - p.z;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
      const lx = dx * rx + dz * rz, lf = dx * fx + dz * fz;
      const qx = Math.max(-CAR.hx, Math.min(CAR.hx, lx)), qy = Math.max(-CAR.hy, Math.min(CAR.hy, dy)), qf = Math.max(-CAR.hz, Math.min(CAR.hz, lf));
      const px = p.x + rx * qx + fx * qf, py = cy + qy, pz = p.z + rz * qx + fz * qf;
      let ex = b.x - px, ey = b.y - py, ez = b.z - pz, d = Math.hypot(ex, ey, ez);
      if (d >= R) return 0;
      if (d < 1e-6) { ex = 0; ey = 1; ez = 0; d = 1e-6; }
      const nx = ex / d, ny = ey / d, nz = ez / d;
      const rel = Math.hypot(b.vx - p.vx, b.vy - (p.vy || 0), b.vz - p.vz);
      const f = bounceOff(b, nx, ny, nz, R - d, F.carE || 0.35, p.vx, p.vy || 0, p.vz);
      if (F.rl && f > 0.3) { // Rocket League: impulso extra da Psyonix (é o que faz a bola sair forte do carro)
        // direção: do carro para a bola, com a altura achatada (0,35) e só 65% da componente para a frente do carro
        let hx = b.x - p.x, hy = (b.y - cy) * 0.35, hz = b.z - p.z, hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
        const fd = (hx * fx + hz * fz) * (1 - 0.65); hx -= fx * fd; hz -= fz * fd; hl = Math.hypot(hx, hy, hz) || 1;
        const sp = Math.min(46, rel), u = sp * 100; // velocidade relativa em uu/s
        const fac = u <= 500 ? 0.65 : u <= 2300 ? 0.65 - 0.1 * (u - 500) / 1800 : 0.55 - 0.25 * (u - 2300) / 2300;
        const add = sp * fac * (p.flip ? 1.25 : 1);
        b.vx += hx / hl * add; b.vy += hy / hl * add; b.vz += hz / hl * add;
      } else if (f > 0.3) { // tranco extra (o carro "chuta" a bola), mais forte no mortal
        const sp = Math.hypot(p.vx, p.vy || 0, p.vz), k = Math.min(9, sp * 0.3 + 1.5) * (p.flip ? 1.6 : 1) * (F.kick || 1);
        b.vx += nx * k; b.vy += ny * k + (p.flip ? 2 : 0); b.vz += nz * k;
      }
      return f;
    }
    // a pé: corpo (cilindro) e cabeça. Deitado (carrinho) fica baixo e comprido; no mergulho do goleiro, mais largo.
    const pr = p.slide ? 0.6 : p.dive ? 0.95 : P_R, top = p.slide ? 0.5 : p.dive ? 1.4 : P_H, base = p.dive ? p.y + 0.3 : p.y;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
    if (b.y - R < base + top - (p.slide || p.dive ? 0 : 0.25) && b.y + R > base && d < pr + R && d > 1e-6) {
      const e = p.slide ? 0.6 : p.sprint ? 0.5 : 0.25; // correndo, a bola espirra mais longe
      return bounceOff(b, dx / d, 0, dz / d, pr + R - d, e, p.vx || 0, 0, p.vz || 0);
    }
    if (p.slide || p.dive) return 0;
    const hy = p.y + P_H - 0.12, ex = b.x - p.x, ey = b.y - hy, ez = b.z - p.z, dd = Math.hypot(ex, ey, ez);
    if (dd < 0.16 + R && dd > 1e-6) return bounceOff(b, ex / dd, ey / dd, ez / dd, 0.16 + R - dd, 0.55, p.vx || 0, p.vy || 0, p.vz || 0);
    return 0;
  }
  // devolve a força da batida mais forte (para o som) e o id de quem encostou por último
  function stepBall(F, b, bodies, dt) {
    if (F.rl) return stepBallRL(F, b, bodies, dt);
    let hit = 0, touch = null;
    const R = F.ballR;
    b.vy -= F.g * dt;
    // efeito (chute com curva): a bola girando faz curva para o lado (efeito Magnus) e o giro vai acabando
    if (b.sp) {
      b.vx += -b.vz * b.sp * 0.022 * dt; b.vz += b.vx * b.sp * 0.022 * dt;
      b.sp *= Math.exp(-dt * (b.y <= R + 0.01 ? 3 : 0.5)); if (Math.abs(b.sp) < 0.3) b.sp = 0;
    }
    const sp = Math.hypot(b.vx, b.vy, b.vz), drag = Math.max(0, 1 - F.drag * sp * dt);
    b.vx *= drag; b.vy *= drag; b.vz *= drag;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < R) {
      b.y = R;
      if (b.vy < -0.8) { hit = Math.max(hit, -b.vy); b.vy = -b.vy * F.bounce; b.vx *= 0.94; b.vz *= 0.94; }
      else b.vy = 0;
    }
    if (b.y <= R + 1e-3) { const h = Math.hypot(b.vx, b.vz); if (h > 0) { const k = Math.max(0, h - F.roll * dt) / h; b.vx *= k; b.vz *= k; } }
    if (b.y > F.ceil - R) { b.y = F.ceil - R; b.vy = -Math.abs(b.vy) * 0.5; }
    const wz = F.W - R;
    if (b.z > wz) { b.z = wz; if (b.vz > 0) { hit = Math.max(hit, b.vz); b.vz = -b.vz * F.wallE; } }
    if (b.z < -wz) { b.z = -wz; if (b.vz < 0) { hit = Math.max(hit, -b.vz); b.vz = -b.vz * F.wallE; } }
    const inMouth = Math.abs(b.z) < F.goalW - R && b.y < F.goalH - R;
    for (const s of [1, -1]) {
      const line = s * F.L, sx = s * b.x;
      const inGoal = sx > F.L && Math.abs(b.z) < F.goalW;
      if (sx > F.L - R && !inMouth && !inGoal && sx < F.L + F.goalD) { b.x = s * (F.L - R); if (s * b.vx > 0) { hit = Math.max(hit, Math.abs(b.vx)); b.vx = -b.vx * F.wallE; } }
      if (sx > F.L) { // dentro do gol: rede (amortece bastante)
        const back = F.L + F.goalD - R;
        if (sx > back) { b.x = s * back; if (s * b.vx > 0) b.vx = -b.vx * 0.12; b.vz *= 0.6; b.vy *= 0.6; }
        if (Math.abs(b.z) > F.goalW - R) { b.z = Math.sign(b.z) * (F.goalW - R); b.vz = -b.vz * 0.15; b.vx *= 0.7; }
        if (b.y > F.goalH - R) { b.y = F.goalH - R; b.vy = -Math.abs(b.vy) * 0.15; }
      }
      for (const pz of [F.goalW, -F.goalW]) { // traves
        const dx = b.x - line, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < F.postR + R && b.y < F.goalH + F.postR && d > 1e-6) hit = Math.max(hit, bounceOff(b, dx / d, 0, dz / d, F.postR + R - d, 0.6));
      }
      if (Math.abs(b.z) < F.goalW) { // travessão
        const dx = b.x - line, dy = b.y - F.goalH, d = Math.hypot(dx, dy);
        if (d < F.postR + R && d > 1e-6) hit = Math.max(hit, bounceOff(b, dx / d, dy / d, 0, F.postR + R - d, 0.6));
      }
    }
    for (const p of bodies || []) {
      const f = hitBody(b, p, R, F);
      if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.45); b.sp = (b.sp || 0) * 0.3; }
    }
    return { hit, touch };
  }
  // bola do Rocket League: gravidade, arrasto linear, limites de velocidade e giro, e batidas com atrito e giro
  function stepBallRL(F, b, bodies, dt) {
    let hit = 0, touch = null;
    const R = F.ballR;
    b.wx = b.wx || 0; b.wy = b.wy || 0; b.wz = b.wz || 0;
    b.vy -= F.g * dt;
    const ld = Math.max(0, 1 - F.drag * dt), ad = Math.max(0, 1 - 0.015 * dt);
    b.vx *= ld; b.vy *= ld; b.vz *= ld; b.wx *= ad; b.wy *= ad; b.wz *= ad;
    const v = Math.hypot(b.vx, b.vy, b.vz); if (v > F.vmax) { const k = F.vmax / v; b.vx *= k; b.vy *= k; b.vz *= k; }
    const w = Math.hypot(b.wx, b.wy, b.wz); if (w > F.wmax) { const k = F.wmax / w; b.wx *= k; b.wy *= k; b.wz *= k; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < R) hit = Math.max(hit, rlContact(F, b, 0, 1, 0, R - b.y));
    if (b.y > F.ceil - R) hit = Math.max(hit, rlContact(F, b, 0, -1, 0, b.y - (F.ceil - R)));
    if (b.z > F.W - R) hit = Math.max(hit, rlContact(F, b, 0, 0, -1, b.z - (F.W - R)));
    if (b.z < -F.W + R) hit = Math.max(hit, rlContact(F, b, 0, 0, 1, -F.W + R - b.z));
    const inMouth = Math.abs(b.z) < F.goalW - R && b.y < F.goalH - R;
    for (const s of [1, -1]) {
      const line = s * F.L, sx = s * b.x, inGoal = sx > F.L && Math.abs(b.z) < F.goalW;
      if (sx > F.L - R && !inMouth && !inGoal && sx < F.L + F.goalD) hit = Math.max(hit, rlContact(F, b, -s, 0, 0, sx - (F.L - R)));
      if (sx > F.L) { // dentro do gol: rede (amortece bastante)
        const back = F.L + F.goalD - R;
        if (sx > back) { b.x = s * back; if (s * b.vx > 0) b.vx = -b.vx * 0.12; b.vz *= 0.6; b.vy *= 0.6; }
        if (Math.abs(b.z) > F.goalW - R) { b.z = Math.sign(b.z) * (F.goalW - R); b.vz = -b.vz * 0.15; b.vx *= 0.7; }
        if (b.y > F.goalH - R) { b.y = F.goalH - R; b.vy = -Math.abs(b.vy) * 0.15; }
      }
      for (const pz of [F.goalW, -F.goalW]) { // traves
        const dx = b.x - line, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < F.postR + R && b.y < F.goalH + F.postR && d > 1e-6) hit = Math.max(hit, rlContact(F, b, dx / d, 0, dz / d, F.postR + R - d));
      }
      if (Math.abs(b.z) < F.goalW) { // travessão
        const dx = b.x - line, dy = b.y - F.goalH, d = Math.hypot(dx, dy);
        if (d < F.postR + R && d > 1e-6) hit = Math.max(hit, rlContact(F, b, dx / d, dy / d, 0, F.postR + R - d));
      }
    }
    for (const p of bodies || []) {
      const f = hitBody(b, p, R, F);
      if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.45); }
    }
    return { hit, touch };
  }
  // onde a bola vai cair (para a marca no chão): simula até ela descer até o chão, no máximo `secs`
  function landing(F, b0, secs = 3) {
    const b = { ...b0 }; let t = 0;
    while (t < secs) { const vy = b.vy; stepBall(F, b, [], 1 / 60); t += 1 / 60; if (b.y <= F.ballR + 0.05 || (vy < 0 && b.vy > 0 && b.y < F.ballR + 0.5)) return { x: b.x, z: b.z, t }; }
    return null;
  }
  // passos fixos de 1/120 s (servidor e navegador fazem a mesma conta)
  function simulate(F, b, bodies, dt) {
    let hit = 0, touch = null;
    if (b.holder) return { hit, touch };
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) { const r = stepBall(F, b, bodies, dt / n); hit = Math.max(hit, r.hit); if (r.touch) touch = r.touch; }
    return { hit, touch };
  }
  // gol? "A" se a bola entrou inteira no gol da direita (+x), "B" se entrou no da esquerda
  function goalOf(F, b) {
    if (b.holder || Math.abs(b.z) >= F.goalW || b.y >= F.goalH) return null;
    if (b.x > F.L + F.ballR) return "A";
    if (b.x < -F.L - F.ballR) return "B";
    return null;
  }

  // ---------- chute (a pé) ----------
  // tipo: "chute" (força pela barra), "passe" (rasteiro), "cavadinha" (alto). Cabeçada se a bola estiver alta.
  // Com a bola na mão, o goleiro solta: chute vira tiro de meta pelo alto, passe vira arremesso rasteiro.
  const KICK_RANGE = 1.35, KICK_CD = 0.3;
  function canKick(p, b, slack = 0) {
    if (b.holder) return b.holder === p.id ? "mao" : null;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), rel = b.y - p.y;
    if (rel < 1.0) return d < KICK_RANGE + slack ? "pe" : null;
    if (rel < 2.3) return d < 0.9 + slack ? "cabeca" : null;
    return null;
  }
  // curva: -1 (para a esquerda) a 1 (para a direita)
  function kick(b, p, kind, power, yaw, slack = 0, curve = 0) {
    const how = canKick(p, b, slack); if (!how) return null;
    power = Math.max(0, Math.min(1, power));
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let speed, elev;
    if (how === "mao") { b.holder = null; b.x = p.x + fx * 0.6; b.z = p.z + fz * 0.6; b.y = 1.1; speed = kind === "passe" ? 6 + 10 * power : 14 + 12 * power; elev = kind === "passe" ? 0.05 : 0.45; }
    else if (how === "cabeca") { speed = 7 + 9 * power; elev = 0.12; }
    else if (kind === "passe") { speed = 4 + 10 * power; elev = 0.02; }
    else if (kind === "cavadinha") { speed = 7 + 13 * power; elev = 0.85; }
    else { speed = 9 + 20 * power; elev = 0.07 + power * 0.1; }
    const h = Math.cos(elev) * speed;
    b.vx = fx * h + (p.vx || 0) * 0.3; b.vz = fz * h + (p.vz || 0) * 0.3; b.vy = Math.sin(elev) * speed;
    if (how === "pe" && b.y < MODES.pes.ballR + 0.05) b.y = MODES.pes.ballR + 0.02;
    curve = Math.max(-1, Math.min(1, curve || 0));
    b.sp = how === "cabeca" ? 0 : curve * (kind === "passe" ? 14 : 24); // positivo: curva para a direita de quem chuta
    return how;
  }
  // passe assistido (como no FIFA): se tiver um companheiro perto da direção mirada, a bola vai nele
  function assistPass(p, yaw, mates, power) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let best = null, bestScore = Infinity;
    for (const m of mates) {
      const lx = m.x + (m.vx || 0) * 0.45, lz = m.z + (m.vz || 0) * 0.45, dx = lx - p.x, dz = lz - p.z, d = Math.hypot(dx, dz);
      if (d < 2 || d > 28) continue;
      const cos = (dx * fx + dz * fz) / d; if (cos < Math.cos(0.7)) continue;
      const score = d * (2 - cos);
      if (score < bestScore) { bestScore = score; best = { yaw: Math.atan2(-dx, -dz), d }; }
    }
    if (!best) return { yaw, power };
    const need = (Math.sqrt(2 * MODES.pes.roll * best.d) + 1.2 - 4) / 10; // força para a bola chegar rolando
    return { yaw: best.yaw, power: Math.max(Math.min(1, need), Math.min(power, need + 0.25)) };
  }

  const api = { MODES, P_R, P_H, RUN, SPRINT, CHARGING, KICK_CD, CAR, KITS, CARS, kitOf, kitColor, kitColor2, spawns, inArea,
    movePlayer, moveCar, newBall, stepBall, simulate, landing, goalOf, canKick, kick, assistPass };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Campo = api;
})(typeof window !== "undefined" ? window : globalThis);
