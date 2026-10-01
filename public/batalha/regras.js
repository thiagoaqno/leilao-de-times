// Batalha da Galera — arena, kart, itens e regras do modo batalha (estilo Mario Kart). Usado pelo servidor (quem manda
// no jogo) e pelo navegador (mexer o próprio kart e o treino contra robôs, que roda as mesmas regras sem internet).
// Cada um começa com 3 balões. Estourar um balão de alguém vale 1 ponto. Quem perde os 3 vira fantasma por 8 s, perde
// metade dos pontos e volta com 3 balões. Ganha quem tiver mais pontos quando o tempo acabar. Tudo em metros e segundos.
(function (root) {
  const HALF = 60; // arena de 120 x 120 m, cercada

  // ---------- relevo ----------
  // O chão é feito de peças [x0, z0, x1, z1, h0, h1, eixo]: plana (eixo null, altura h0) ou rampa (a altura vai de h0
  // em x0/z0 até h1 em x1/z1, ao longo do eixo "x" ou "z"). A altura num ponto é a da peça mais alta ali (fora: 0).
  const SHAPES = [];
  // espelha uma peça do canto (+x, +z) para os outros lados da arena
  function mirror(s, sx, sz) {
    let [x0, z0, x1, z1, h0, h1, ax] = s;
    if (sx < 0) { [x0, x1] = [-x1, -x0]; if (ax === "x") [h0, h1] = [h1, h0]; }
    if (sz < 0) { [z0, z1] = [-z1, -z0]; if (ax === "z") [h0, h1] = [h1, h0]; }
    return [x0, z0, x1, z1, h0, h1, ax];
  }
  const QUADS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  const PLAT = 4, CORNER = 3.5, KICK = 2.2;
  // planalto do meio com a fonte, e uma rampa em cada lado
  SHAPES.push([-10, -10, 10, 10, PLAT, PLAT, null]);
  for (const s of [[-3, 10, 3, 24, PLAT, 0, "z"], [10, -3, 24, 3, PLAT, 0, "x"]]) { SHAPES.push(s); SHAPES.push(mirror(s, s[6] === "x" ? -1 : 1, s[6] === "z" ? -1 : 1)); }
  for (const [sx, sz] of QUADS) {
    SHAPES.push(mirror([38, 38, 60, 60, CORNER, CORNER, null], sx, sz));     // mirante no canto, colado no muro
    SHAPES.push(mirror([24, 42, 38, 50, 0, CORNER, "x"], sx, sz));           // e duas rampas para subir nele
    SHAPES.push(mirror([42, 24, 50, 38, 0, CORNER, "z"], sx, sz));
  }
  // rampas de pulo no meio de cada lado: sobe e voa
  for (const s of [[-4, 34, 4, 40, 0, KICK, "z"], [34, -4, 40, 4, 0, KICK, "x"]]) { SHAPES.push(s); SHAPES.push(mirror(s, s[6] === "x" ? -1 : 1, s[6] === "z" ? -1 : 1)); }

  function heightOf(s, x, z) {
    if (x < s[0] || x > s[2] || z < s[1] || z > s[3]) return -Infinity;
    if (!s[6]) return s[4];
    const t = s[6] === "x" ? (x - s[0]) / (s[2] - s[0]) : (z - s[1]) / (s[3] - s[1]);
    return s[4] + (s[5] - s[4]) * t;
  }
  function groundAt(x, z) { let h = 0; for (const s of SHAPES) { const v = heightOf(s, x, z); if (v > h) h = v; } return h; }

  // obstáculos sólidos [x0, z0, x1, z1, topo, tipo, base]: só batem em quem está abaixo do topo
  const BLOCKS = [[-3, -3, 3, 3, PLAT + 1.6, "fonte", PLAT]];
  for (const [sx, sz] of QUADS) for (const b of [[20, 20, 24, 24, 7, "pilar"], [28, 10, 29.5, 18, 1.2, "mureta"], [10, 28, 18, 29.5, 1.2, "mureta"]]) {
    const m = mirror([b[0], b[1], b[2], b[3], 0, 0, null], sx, sz);
    BLOCKS.push([m[0], m[1], m[2], m[3], b[4], b[5], 0]);
  }
  // caixas de item [x, z]: no planalto, em volta dele, nos mirantes, nos lados e no meio do caminho
  const BOXES = [];
  for (const [sx, sz] of QUADS) BOXES.push([6 * sx, 6 * sz], [15 * sx, 15 * sz], [50 * sx, 50 * sz]);
  for (const [x, z] of [[0, 50], [0, -50], [50, 0], [-50, 0], [0, 30], [0, -30], [30, 0], [-30, 0]]) BOXES.push([x, z]);
  // largada: em volta da arena, olhando para o meio
  const SPAWNS = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = Math.sin(a) * 46, z = Math.cos(a) * 46; return [x, z, Math.atan2(x, z)]; });
  const COLORS = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];

  // ---------- kart ----------
  const KR = 1.1, MAX = 15, REV = 6, GRAV = 26, STEP = 0.5;
  // dá para ir até (x, z)? Não sobe degrau mais alto que STEP (lateral de rampa e beira de mirante viram parede)
  function canGo(k, x, z) {
    const dx = x - k.x, dz = z - k.z, d = Math.hypot(dx, dz) || 1, top = (k.y || 0) + STEP;
    return groundAt(x, z) <= top && groundAt(x + (dx / d) * KR * 0.8, z + (dz / d) * KR * 0.8) <= top;
  }
  // k: {x, y, z, yaw, v, vy, air, spinT, boostT, starT, driftT, drifting}; inp: {thr, steer, drift}
  function moveKart(k, inp, dt) {
    if (k.y == null) k.y = groundAt(k.x, k.z);
    k.boostT = Math.max(0, (k.boostT || 0) - dt); k.starT = Math.max(0, (k.starT || 0) - dt);
    if (k.spinT > 0) { // rodando depois de levar um item: sem controle
      k.spinT = Math.max(0, k.spinT - dt); k.v *= Math.exp(-dt * 3); k.drifting = false; k.driftT = 0;
    } else {
      const t = inp.thr || 0, top = MAX * (k.boostT > 0 ? 1.45 : 1) * (k.starT > 0 ? 1.2 : 1), grip = k.air ? 0.25 : 1;
      if (k.boostT > 0) k.v = Math.min(top, k.v + 30 * dt);
      else if (t > 0) k.v += (k.v < 0 ? 30 : 14) * t * dt * grip;
      else if (t < 0) k.v += (k.v > 0 ? -26 : -10) * -t * dt * grip;
      else if (!k.air) k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), 6 * dt);
      if (k.v > top) k.v = Math.max(top, k.v - 14 * dt);
      if (k.v < -REV) k.v = -REV;
      // derrapagem: segurando o drift numa curva, o kart vira mais; soltando depois de um tempo, ganha um mini-turbo
      const steer = inp.steer || 0;
      if (inp.drift && steer && k.v > 8 && !k.air) { k.drifting = true; k.driftT = (k.driftT || 0) + dt; }
      else if (!k.air) { if (k.drifting && k.driftT > 0.9) k.boostT = Math.max(k.boostT, k.driftT > 1.8 ? 1.1 : 0.6); k.drifting = false; k.driftT = 0; }
      const turn = 2.3 * Math.min(1, Math.abs(k.v) / 4) * (k.drifting ? 1.4 : 1) * (k.air ? 0.5 : 1);
      k.yaw -= steer * turn * Math.sign(k.v || 1) * dt;
    }
    const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
    // subida freia, descida embala
    if (!k.air) { const g0 = groundAt(k.x, k.z), g1 = groundAt(k.x + fx * 0.6, k.z + fz * 0.6); if (Math.abs(g1 - g0) < STEP) k.v -= ((g1 - g0) / 0.6) * GRAV * 0.3 * dt; }
    let nx = k.x + fx * k.v * dt, nz = k.z + fz * k.v * dt;
    if (!canGo(k, nx, nz)) { // degrau alto: escorrega junto da parede, se der
      if (canGo(k, nx, k.z)) nz = k.z; else if (canGo(k, k.x, nz)) nx = k.x; else { nx = k.x; nz = k.z; }
      k.v *= 0.5; k.bump = true;
    }
    k.x = nx; k.z = nz;
    if (collideCircle(k, KR)) { k.v *= 0.45; k.bump = true; }
    // altura: no chão acompanha o relevo; saindo de uma rampa ou da beira, voa (e cai)
    const g = groundAt(k.x, k.z);
    if (k.air) {
      k.vy -= GRAV * dt; k.y += k.vy * dt;
      if (k.y <= g) { k.landed = -k.vy; k.y = g; k.vy = 0; k.air = false; }
    } else if (g < k.y - 0.3) { k.air = true; k.vy = Math.max(0, k.gvy || 0); k.y += k.vy * dt; }
    else { k.gvy = Math.max(-20, Math.min(20, (g - k.y) / Math.max(dt, 1e-3))); k.y = g; }
  }
  // empurra um círculo para fora das paredes e obstáculos (de acordo com a altura dele); devolve true se bateu
  function collideCircle(o, r) {
    let hit = false;
    const lim = HALF - r, y = o.y || 0;
    if (o.x > lim) { o.x = lim; hit = true; } if (o.x < -lim) { o.x = -lim; hit = true; }
    if (o.z > lim) { o.z = lim; hit = true; } if (o.z < -lim) { o.z = -lim; hit = true; }
    for (const b of BLOCKS) {
      if (y > b[4] - 0.3 || y < b[6] - 1) continue; // por cima (ou bem por baixo) não bate
      const cx = Math.max(b[0], Math.min(b[2], o.x)), cz = Math.max(b[1], Math.min(b[3], o.z));
      const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        hit = true;
        if (d > 1e-6) { o.x = cx + (dx / d) * r; o.z = cz + (dz / d) * r; }
        else { // dentro do bloco: sai pelo lado mais perto
          const opts = [[o.x - b[0], -1, 0], [b[2] - o.x, 1, 0], [o.z - b[1], 0, -1], [b[3] - o.z, 0, 1]].sort((a, c) => a[0] - c[0])[0];
          o.x += opts[1] * (opts[0] + r); o.z += opts[2] * (opts[0] + r);
        }
      }
    }
    return hit;
  }
  // projétil batendo: reflete a velocidade (casco verde quica)
  function bounce(p, r) {
    const ox = p.x, oz = p.z;
    if (!collideCircle(p, r)) return false;
    const nx = p.x - ox, nz = p.z - oz, d = Math.hypot(nx, nz);
    if (d > 1e-6) { const ux = nx / d, uz = nz / d, vn = p.vx * ux + p.vz * uz; if (vn < 0) { p.vx -= 2 * vn * ux; p.vz -= 2 * vn * uz; } }
    else { p.vx = -p.vx; p.vz = -p.vz; }
    return true;
  }
  // casco andando pelo chão: sobe rampa, cai da beira, e quica em degrau alto
  function stepShell(pr, dt) {
    let hit = false;
    const nx = pr.x + pr.vx * dt, nz = pr.z + pr.vz * dt, top = pr.y - 0.5 + STEP;
    if (groundAt(nx, nz) > top) {
      if (groundAt(nx, pr.z) > top) pr.vx = -pr.vx;
      if (groundAt(pr.x, nz) > top) pr.vz = -pr.vz;
      hit = true;
    } else { pr.x = nx; pr.z = nz; }
    const floor = groundAt(pr.x, pr.z) + 0.5;
    if (pr.y > floor + 0.05) { pr.vy = (pr.vy || 0) - GRAV * dt; pr.y = Math.max(floor, pr.y + pr.vy * dt); if (pr.y === floor) pr.vy = 0; }
    else { pr.y = floor; pr.vy = 0; }
    return bounce(pr, 0.5) || hit;
  }

  // ---------- itens ----------
  const ITEMS = ["banana", "verde", "vermelho", "cogumelo", "estrela", "bomba"];
  const ITEM_NAMES = { banana: "Banana", verde: "Casco verde", vermelho: "Casco vermelho", cogumelo: "Cogumelo", estrela: "Estrela", bomba: "Bomba" };
  // quem está atrás no placar ganha itens melhores (como no Mario Kart)
  function rollItem(rank, rnd = Math.random) {
    const w = { banana: 4 - 2.5 * rank, verde: 4 - 1.5 * rank, vermelho: 1 + 3 * rank, cogumelo: 2 + rank, estrela: 0.2 + 1.8 * rank, bomba: 0.6 + 1.6 * rank };
    let s = 0; for (const k of ITEMS) s += Math.max(0.05, w[k]);
    let x = rnd() * s; for (const k of ITEMS) { x -= Math.max(0.05, w[k]); if (x <= 0) return k; }
    return "banana";
  }

  // ---------- partida ----------
  const GHOST_MS = 8000, SPIN_MS = 1200, SAFE_MS = 1600, BOX_MS = 3000, STAR_MS = 6000, BOOST_MS = 1500, FUSE_MS = 2000, BLAST = 7;
  function newPlayer(id, n, name, color, i, bot = false) {
    const s = SPAWNS[i % SPAWNS.length];
    return { id, n, name, color, bot, x: s[0], y: groundAt(s[0], s[1]), z: s[1], yaw: s[2], v: 0, vy: 0, air: false, spinT: 0, boostT: 0, starT: 0, driftT: 0, drifting: false,
      balloons: 3, points: 0, pops: 0, ghostUntil: 0, safeUntil: 0, item: null, rolling: 0, hits: 0 };
  }
  function newMatch(players, now, ms) {
    return { players, proj: [], boxes: BOXES.map(() => 0), seq: 1, start: now, end: now + ms, over: false };
  }
  const ghost = (p, now) => p.ghostUntil > now;
  const alive = (m, id, now) => { const p = m.players.find((x) => x.id === id); return p && !ghost(p, now) ? p : null; };
  const boxY = (i) => groundAt(BOXES[i][0], BOXES[i][1]);
  // estoura um balão de `v` (quem fez: `by`). ev(tipo, dados) avisa o que aconteceu (sons, animações, placar)
  function popBalloon(m, v, by, cause, now, ev) {
    if (!v || ghost(v, now) || v.safeUntil > now || v.starT > 0) return false;
    v.balloons--; v.spinT = SPIN_MS / 1000; v.safeUntil = now + SAFE_MS; v.boostT = 0; v.drifting = false;
    if (by && by !== v) { by.points++; by.pops++; }
    ev("estourou", { to: v.id, by: by && by !== v ? by.id : null, cause, x: v.x, y: v.y || 0, z: v.z, left: v.balloons });
    if (v.balloons <= 0) {
      v.ghostUntil = now + GHOST_MS; const lost = Math.ceil(v.points / 2); v.points -= lost; v.item = null;
      ev("fantasma", { id: v.id, lost });
    }
    return true;
  }
  // pegou uma caixa? (o servidor confere a distância com uma folga pela internet)
  function pickBox(m, p, i, now, ev, slack = 1.5) {
    const b = BOXES[i];
    if (!b || m.boxes[i] > now || p.item || p.rolling > now) return false;
    if (Math.hypot(p.x - b[0], p.z - b[1]) > 2.2 + slack || Math.abs((p.y || 0) - boxY(i)) > 2) return false;
    m.boxes[i] = now + BOX_MS;
    const order = [...m.players].sort((a, c) => c.points - a.points), rank = m.players.length > 1 ? order.indexOf(p) / (m.players.length - 1) : 0.5;
    p.item = rollItem(rank); p.rolling = now + 1100; // a roleta gira um pouquinho antes de liberar o item
    ev("caixa", { id: p.id, i, item: p.item });
    return true;
  }
  // usar o item: para a frente (ou para trás, segurando S)
  function useItem(m, p, back, now, ev) {
    if (!p.item || p.rolling > now || p.spinT > 0) return false;
    const it = p.item; p.item = null;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), s = back ? -1 : 1, y = p.y || 0;
    if (it === "banana") {
      let d = back ? -2.4 : 10, bx = p.x + fx * d, bz = p.z + fz * d;
      if (groundAt(bx, bz) > y + STEP) { d = back ? -2.4 : 2.4; bx = p.x + fx * d; bz = p.z + fz * d; } // não joga dentro da parede
      m.proj.push({ id: m.seq++, type: "banana", owner: p.id, x: bx, z: bz, y: groundAt(bx, bz), vx: 0, vz: 0, t0: now, ttl: 60 });
    } else if (it === "verde" || it === "vermelho") {
      const speed = 30 + Math.max(0, p.v * s);
      const pr = { id: m.seq++, type: it, owner: p.id, x: p.x + fx * s * 2.2, z: p.z + fz * s * 2.2, y: y + 0.5, vy: 0, vx: fx * s * speed, vz: fz * s * speed, t0: now, ttl: 7, bounces: 0, target: null };
      if (it === "vermelho" && !back) { // persegue o rival mais perto que estiver na frente
        let best = null, bd = 1e9;
        for (const o of m.players) { if (o === p || ghost(o, now)) continue; const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz); if ((dx * fx + dz * fz) / (d || 1) > -0.2 && d < bd) { bd = d; best = o; } }
        pr.target = best ? best.id : null;
      }
      if (it === "vermelho" && back) pr.type = "verde";
      m.proj.push(pr);
    } else if (it === "bomba") m.proj.push({ id: m.seq++, type: "bomba", owner: p.id, x: p.x + fx * s * 2, z: p.z + fz * s * 2, y: y + 1, vy: back ? 3 : 7, vx: fx * s * (back ? 5 : 16), vz: fz * s * (back ? 5 : 16), t0: now, ttl: FUSE_MS / 1000 });
    else if (it === "cogumelo") p.boostT = BOOST_MS / 1000;
    else if (it === "estrela") p.starT = STAR_MS / 1000;
    ev("usou", { id: p.id, item: it });
    return true;
  }
  // um passo do jogo (posição dos karts já atualizada): itens andando, batidas, fantasmas voltando, tempo
  function tick(m, now, dt, ev) {
    if (m.over) return;
    for (const p of m.players) if (p.ghostUntil && p.ghostUntil <= now) { p.ghostUntil = 0; p.balloons = 3; p.safeUntil = now + SAFE_MS; ev("voltou", { id: p.id }); }
    const keep = [];
    for (const pr of m.proj) {
      const age = (now - pr.t0) / 1000;
      let gone = age > pr.ttl;
      if (pr.type === "verde" || pr.type === "vermelho") {
        if (pr.type === "vermelho" && pr.target) { // vira aos poucos na direção do alvo
          const t = alive(m, pr.target, now);
          if (t) {
            const sp = Math.hypot(pr.vx, pr.vz), a = Math.atan2(pr.vz, pr.vx), want = Math.atan2(t.z - pr.z, t.x - pr.x);
            let d = want - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + Math.max(-5 * dt, Math.min(5 * dt, d));
            pr.vx = Math.cos(na) * sp; pr.vz = Math.sin(na) * sp;
          }
        }
        if (stepShell(pr, dt)) { pr.bounces++; if (pr.type === "vermelho" || pr.bounces > 6) gone = true; }
      } else if (pr.type === "bomba") {
        if (!pr.landed) { // voa em arco e para onde cair
          pr.vy -= GRAV * dt; pr.x += pr.vx * dt; pr.z += pr.vz * dt; pr.y += pr.vy * dt; bounce(pr, 0.6);
          const f2 = groundAt(pr.x, pr.z) + 0.4;
          if (pr.y <= f2) { pr.y = f2; pr.landed = true; pr.vx = pr.vz = pr.vy = 0; }
        }
        const near = pr.landed && m.players.some((o) => o.id !== pr.owner && !ghost(o, now) && Math.hypot(o.x - pr.x, (o.y || 0) + 0.5 - pr.y, o.z - pr.z) < 2.4);
        if (age >= pr.ttl || near) { // explode e estoura um balão de todo mundo perto
          ev("bum", { x: pr.x, y: pr.y, z: pr.z, id: pr.id });
          const by = m.players.find((o) => o.id === pr.owner);
          for (const o of m.players) if (Math.hypot(o.x - pr.x, (o.y || 0) - pr.y, o.z - pr.z) < BLAST) popBalloon(m, o, by, "bomba", now, ev);
          continue;
        }
      }
      if (!gone && pr.type !== "bomba") { // bateu num kart?
        const r = pr.type === "banana" ? 1.5 : 1.7, dy = pr.type === "banana" ? 1.2 : 1.6;
        for (const o of m.players) {
          if (ghost(o, now) || (o.id === pr.owner && age < 0.5)) continue;
          if (Math.hypot(o.x - pr.x, o.z - pr.z) < r && Math.abs((o.y || 0) + (pr.type === "banana" ? 0 : 0.5) - pr.y) < dy) {
            const by = m.players.find((x) => x.id === pr.owner);
            if (o.starT > 0) { gone = true; ev("poof", { id: pr.id, x: pr.x, y: pr.y, z: pr.z }); break; } // a estrela destrói o item
            popBalloon(m, o, by, pr.type, now, ev); gone = true; break;
          }
        }
      }
      if (gone) { if (age <= pr.ttl) ev("poof", { id: pr.id, x: pr.x, y: pr.y, z: pr.z }); }
      else keep.push(pr);
    }
    m.proj = keep;
    // batida entre karts: com estrela, ou no turbo do cogumelo, estoura o balão de quem levou a batida
    for (const a of m.players) for (const b of m.players) {
      if (a === b || ghost(a, now) || ghost(b, now)) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) > 2.3 || Math.abs((a.y || 0) - (b.y || 0)) > 1.5) continue;
      if (a.starT > 0 && b.starT <= 0) popBalloon(m, b, a, "estrela", now, ev);
      else if (a.boostT > 0 && a.v > b.v + 4 && b.starT <= 0) popBalloon(m, b, a, "cogumelo", now, ev);
    }
    if (now >= m.end) { m.over = true; ev("fim", {}); }
  }
  // pacote compacto: karts [n, x, z, yaw, v, flags, balões, pontos, y] e itens [id, tipo, x, z, y]
  const FL = { drift: 1, spin: 2, ghost: 4, star: 8, boost: 16, air: 32 };
  const q2 = (v) => Math.round(v * 100) / 100;
  function snap(m, now) {
    return {
      p: m.players.map((p) => [p.n, q2(p.x), q2(p.z), q2(p.yaw), q2(p.v), (p.drifting ? FL.drift : 0) | (p.spinT > 0 ? FL.spin : 0) | (ghost(p, now) ? FL.ghost : 0) | (p.starT > 0 ? FL.star : 0) | (p.boostT > 0 ? FL.boost : 0) | (p.air ? FL.air : 0), p.balloons, p.points, q2(p.y || 0)]),
      o: m.proj.map((pr) => [pr.id, ITEMS.indexOf(pr.type), q2(pr.x), q2(pr.z), q2(pr.y || 0)]),
      bx: m.boxes.map((t) => (t > now ? 0 : 1)).join(""),
    };
  }

  // ---------- robôs ----------
  // caminho até um lugar alto: primeiro o pé da rampa que leva até lá, depois o topo dela
  const RAMPS = SHAPES.filter((s) => s[6]).map((s) => {
    const cx = (s[0] + s[2]) / 2, cz = (s[1] + s[3]) / 2, up = s[5] > s[4];
    const lo = s[6] === "x" ? [up ? s[0] - 2 : s[2] + 2, cz] : [cx, up ? s[1] - 2 : s[3] + 2];
    const hi = s[6] === "x" ? [up ? s[2] + 2 : s[0] - 2, cz] : [cx, up ? s[3] + 2 : s[1] - 2];
    return { lo, hi, h: Math.max(s[4], s[5]) };
  }).filter((r) => r.h > KICK);
  function route(p, tx, tz) {
    const th = groundAt(tx, tz), y = p.y || 0;
    if (th <= y + STEP) return [tx, tz];
    let best = null, bd = 1e9;
    for (const r of RAMPS) { if (Math.abs(groundAt(r.hi[0], r.hi[1]) - th) > 0.6) continue; const d = Math.hypot(r.lo[0] - p.x, r.lo[1] - p.z) + Math.hypot(r.hi[0] - tx, r.hi[1] - tz); if (d < bd) { bd = d; best = r; } }
    if (!best) return [tx, tz];
    const g = groundAt(p.x, p.z), onRamp = g > 0.2 && g < th - 0.2;
    return Math.hypot(best.lo[0] - p.x, best.lo[1] - p.z) > 3 && !onRamp ? best.lo : best.hi;
  }
  // vai atrás de uma caixa quando está sem item; com item, procura um rival e atira quando ele está na frente
  function botInput(m, p, now) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let tx = 0, tz = 0, fire = false, back = false;
    if (!p.item || p.rolling > now) {
      let bd = 1e9; BOXES.forEach(([x, z], i) => { if (m.boxes[i] > now) return; const d = Math.hypot(x - p.x, z - p.z) + Math.max(0, boxY(i) - (p.y || 0)) * (p.n % 2 ? -4 : 3); /* metade dos robôs gosta de subir */ if (d < bd) { bd = d; tx = x; tz = z; } });
      if (bd === 1e9) { tx = 0; tz = 30; }
    } else {
      let best = null, bd = 1e9;
      for (const o of m.players) { if (o === p || ghost(o, now)) continue; const d = Math.hypot(o.x - p.x, o.z - p.z) + Math.abs((o.y || 0) - (p.y || 0)) * 4; if (d < bd) { bd = d; best = o; } }
      if (best) {
        tx = best.x; tz = best.z;
        const d = Math.hypot(tx - p.x, tz - p.z), cos = ((tx - p.x) * fx + (tz - p.z) * fz) / (d || 1), level = Math.abs((best.y || 0) - (p.y || 0)) < 1;
        if (p.item === "banana") { fire = Math.random() < 0.01; back = true; }
        else if (p.item === "cogumelo" || p.item === "estrela") fire = d < 14 && cos > 0.8;
        else fire = d < 36 && cos > 0.92 && (level || p.item === "bomba");
      } else fire = Math.random() < 0.005;
    }
    [tx, tz] = route(p, tx, tz);
    let want = Math.atan2(-(tx - p.x), -(tz - p.z));
    // desvia de obstáculo no caminho: olha 4 m à frente e, se tiver parede, tenta um pouco para cada lado
    const y = p.y || 0, free = (a, d) => {
      const x = p.x - Math.sin(a) * d, z = p.z - Math.cos(a) * d;
      if (Math.abs(x) > HALF - 1.5 || Math.abs(z) > HALF - 1.5 || groundAt(x, z) > y + STEP + 0.4 * d) return false; // rampa (subida suave) pode
      return !BLOCKS.some((b) => y < b[4] - 0.3 && y > b[6] - 1 && x > b[0] - 1.4 && x < b[2] + 1.4 && z > b[1] - 1.4 && z < b[3] + 1.4);
    };
    const look = Math.min(4, Math.hypot(tx - p.x, tz - p.z));
    if (look > 1.5 && !free(want, look)) for (const off of [0.5, -0.5, 1, -1, 1.5, -1.5]) if (free(want + off, look) && free(want + off, look / 2)) { want += off; break; }
    let dy = want - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    // preso (parado batendo em algo): dá ré virando por quase 1 segundo
    if (Math.abs(p.v) < 1.5 && !(p.revUntil > now)) p.stuckT = (p.stuckT || 0) + 1 / 30; else if (Math.abs(p.v) > 3) p.stuckT = 0;
    if (p.stuckT > 1.2) { p.revUntil = now + 900; p.stuckT = 0; }
    const stuck = p.revUntil > now;
    return { thr: stuck ? -1 : Math.abs(dy) > 1.6 ? 0.4 : 1, steer: Math.max(-1, Math.min(1, -dy * 2.5)) * (stuck ? -1 : 1), drift: false, fire, back };
  }

  const api = { HALF, SHAPES, BLOCKS, BOXES, SPAWNS, COLORS, KR, MAX, STEP, ITEMS, ITEM_NAMES, FL, GHOST_MS, BLAST,
    groundAt, heightOf, boxY, moveKart, collideCircle, rollItem, newPlayer, newMatch, popBalloon, pickBox, useItem, tick, snap, botInput, ghost };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
