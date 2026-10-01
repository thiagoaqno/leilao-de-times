// Batalha da Galera — arena, kart, itens e regras do modo batalha (estilo Mario Kart). Usado pelo servidor (quem manda
// no jogo) e pelo navegador (mexer o próprio kart e o treino contra robôs, que roda as mesmas regras sem internet).
// Cada um começa com 3 balões. Estourar um balão de alguém vale 1 ponto. Quem perde os 3 vira fantasma por 8 s, perde
// metade dos pontos e volta com 3 balões. Ganha quem tiver mais pontos quando o tempo acabar. Tudo em metros e segundos.
(function (root) {
  const HALF = 36; // arena de 72 x 72 m, cercada
  // obstáculos [x0, z0, x1, z1, altura, tipo] — o mapa é igual nos quatro cantos
  const quarter = [
    [12, 12, 16, 16, 3, "pilar"],
    [21, 3, 22.5, 9, 1.2, "mureta"], [3, 21, 9, 22.5, 1.2, "mureta"],
    [27, 27, 31, 28.5, 1, "mureta"], [27, 25, 28.5, 31, 1, "mureta"],
  ];
  const BLOCKS = [[-4, -4, 4, 4, 1.6, "fonte"]];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (const b of quarter) {
    const xs = [b[0] * sx, b[2] * sx], zs = [b[1] * sz, b[3] * sz];
    BLOCKS.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), b[4], b[5]]);
  }
  // caixas de item: anel em volta da fonte, meio das bordas e perto dos cantos
  const BOXES = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; BOXES.push([Math.cos(a) * 9, Math.sin(a) * 9]); }
  for (const [x, z] of [[0, 25], [0, -25], [25, 0], [-25, 0], [24, 24], [-24, 24], [24, -24], [-24, -24]]) BOXES.push([x, z]);
  // largada: em volta da arena, olhando para o meio
  const SPAWNS = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const x = Math.sin(a) * 31, z = Math.cos(a) * 31; return [x, z, Math.atan2(x, z)]; });
  const COLORS = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];

  // ---------- kart ----------
  const KR = 1.1, MAX = 15, REV = 6;
  // k: {x, z, yaw, v, spinT, boostT, starT, driftT, drifting}; inp: {thr, steer, drift}
  function moveKart(k, inp, dt) {
    const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
    k.boostT = Math.max(0, (k.boostT || 0) - dt); k.starT = Math.max(0, (k.starT || 0) - dt);
    if (k.spinT > 0) { // rodando depois de levar um item: sem controle
      k.spinT = Math.max(0, k.spinT - dt); k.v *= Math.exp(-dt * 3); k.drifting = false; k.driftT = 0;
    } else {
      const t = inp.thr || 0, top = MAX * (k.boostT > 0 ? 1.45 : 1) * (k.starT > 0 ? 1.2 : 1);
      if (k.boostT > 0) k.v = Math.min(top, k.v + 30 * dt);
      else if (t > 0) k.v += (k.v < 0 ? 30 : 14) * t * dt;
      else if (t < 0) k.v += (k.v > 0 ? -26 : -10) * -t * dt;
      else k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), 6 * dt);
      if (k.v > top) k.v = Math.max(top, k.v - 14 * dt);
      if (k.v < -REV) k.v = -REV;
      // derrapagem: segurando o drift numa curva, o kart vira mais; soltando depois de um tempo, ganha um mini-turbo
      const steer = inp.steer || 0;
      if (inp.drift && steer && k.v > 8) { k.drifting = true; k.driftT = (k.driftT || 0) + dt; }
      else { if (k.drifting && k.driftT > 0.9) k.boostT = Math.max(k.boostT, k.driftT > 1.8 ? 1.1 : 0.6); k.drifting = false; k.driftT = 0; }
      const turn = 2.3 * Math.min(1, Math.abs(k.v) / 4) * (k.drifting ? 1.4 : 1);
      k.yaw -= steer * turn * Math.sign(k.v || 1) * dt;
    }
    const nfx = -Math.sin(k.yaw), nfz = -Math.cos(k.yaw);
    k.x += nfx * k.v * dt; k.z += nfz * k.v * dt;
    if (collideCircle(k, KR)) k.v *= 0.45;
  }
  // empurra um círculo para fora das paredes e obstáculos; devolve true se bateu
  function collideCircle(o, r) {
    let hit = false;
    const lim = HALF - r;
    if (o.x > lim) { o.x = lim; hit = true; } if (o.x < -lim) { o.x = -lim; hit = true; }
    if (o.z > lim) { o.z = lim; hit = true; } if (o.z < -lim) { o.z = -lim; hit = true; }
    for (const b of BLOCKS) {
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
  // projétil bate na parede: reflete a velocidade (casco verde quica)
  function bounce(p, r) {
    const ox = p.x, oz = p.z;
    if (!collideCircle(p, r)) return false;
    const nx = p.x - ox, nz = p.z - oz, d = Math.hypot(nx, nz);
    if (d > 1e-6) { const ux = nx / d, uz = nz / d, vn = p.vx * ux + p.vz * uz; if (vn < 0) { p.vx -= 2 * vn * ux; p.vz -= 2 * vn * uz; } }
    else { p.vx = -p.vx; p.vz = -p.vz; }
    return true;
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
  const GHOST_MS = 8000, SPIN_MS = 1200, SAFE_MS = 1600, BOX_MS = 3000, STAR_MS = 6000, BOOST_MS = 1500, FUSE_MS = 1600, BLAST = 7;
  function newPlayer(id, n, name, color, i, bot = false) {
    const s = SPAWNS[i % SPAWNS.length];
    return { id, n, name, color, bot, x: s[0], z: s[1], yaw: s[2], v: 0, spinT: 0, boostT: 0, starT: 0, driftT: 0, drifting: false,
      balloons: 3, points: 0, pops: 0, ghostUntil: 0, safeUntil: 0, item: null, rolling: 0, hits: 0 };
  }
  function newMatch(players, now, ms) {
    return { players, proj: [], boxes: BOXES.map(() => 0), seq: 1, start: now, end: now + ms, over: false };
  }
  const ghost = (p, now) => p.ghostUntil > now;
  const alive = (m, id, now) => { const p = m.players.find((x) => x.id === id); return p && !ghost(p, now) ? p : null; };
  // estoura um balão de `v` (quem fez: `by`). ev(tipo, dados) avisa o que aconteceu (sons, animações, placar)
  function popBalloon(m, v, by, cause, now, ev) {
    if (!v || ghost(v, now) || v.safeUntil > now || v.starT > 0) return false;
    v.balloons--; v.spinT = SPIN_MS / 1000; v.safeUntil = now + SAFE_MS; v.boostT = 0; v.drifting = false;
    if (by && by !== v) { by.points++; by.pops++; }
    ev("estourou", { to: v.id, by: by && by !== v ? by.id : null, cause, x: v.x, z: v.z, left: v.balloons });
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
    if (Math.hypot(p.x - b[0], p.z - b[1]) > 2.2 + slack) return false;
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
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), s = back ? -1 : 1;
    const shot = (type, speed) => {
      const pr = { id: m.seq++, type, owner: p.id, x: p.x + fx * s * 2.2, z: p.z + fz * s * 2.2, y: 0.5, vx: fx * s * speed, vz: fz * s * speed, t0: now, ttl: 7, bounces: 0, target: null };
      if (type === "vermelho" && !back) { // persegue o rival mais perto que estiver na frente
        let best = null, bd = 1e9;
        for (const o of m.players) { if (o === p || ghost(o, now)) continue; const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz); if ((dx * fx + dz * fz) / (d || 1) > -0.2 && d < bd) { bd = d; best = o; } }
        pr.target = best ? best.id : null;
      }
      if (type === "vermelho" && back) pr.type = "verde";
      m.proj.push(pr); return pr;
    };
    if (it === "banana") m.proj.push({ id: m.seq++, type: "banana", owner: p.id, x: p.x + fx * (back ? -2.4 : 10), z: p.z + fz * (back ? -2.4 : 10), y: 0, vx: 0, vz: 0, t0: now, ttl: 60 });
    else if (it === "verde" || it === "vermelho") shot(it, 30 + Math.max(0, p.v * s));
    else if (it === "bomba") m.proj.push({ id: m.seq++, type: "bomba", owner: p.id, x: p.x + fx * s * 2, z: p.z + fz * s * 2, y: 1, vx: fx * s * (back ? 6 : 22), vz: fz * s * (back ? 6 : 22), t0: now, ttl: FUSE_MS / 1000 });
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
        pr.x += pr.vx * dt; pr.z += pr.vz * dt;
        if (bounce(pr, 0.5)) { pr.bounces++; if (pr.type === "vermelho" || pr.bounces > 6) gone = true; }
      } else if (pr.type === "bomba") {
        const fly = Math.min(age, 0.6);
        if (age < 0.6) { pr.x += pr.vx * dt; pr.z += pr.vz * dt; bounce(pr, 0.6); }
        pr.y = age < 0.6 ? 1 + 6 * fly * (0.6 - fly) / 0.36 * 0.5 : 0.4;
        const near = age > 0.6 && m.players.some((o) => o.id !== pr.owner && !ghost(o, now) && Math.hypot(o.x - pr.x, o.z - pr.z) < 2.2);
        if (age >= pr.ttl || near) { // explode e estoura um balão de todo mundo perto
          ev("bum", { x: pr.x, z: pr.z, id: pr.id });
          const by = m.players.find((o) => o.id === pr.owner);
          for (const o of m.players) if (Math.hypot(o.x - pr.x, o.z - pr.z) < BLAST) popBalloon(m, o, by, "bomba", now, ev);
          continue;
        }
      }
      if (!gone && pr.type !== "bomba") { // bateu num kart?
        const r = pr.type === "banana" ? 1.5 : 1.7;
        for (const o of m.players) {
          if (ghost(o, now) || (o.id === pr.owner && age < 0.5)) continue;
          if (Math.hypot(o.x - pr.x, o.z - pr.z) < r) {
            const by = m.players.find((x) => x.id === pr.owner);
            if (o.starT > 0) { gone = true; ev("poof", { id: pr.id, x: pr.x, z: pr.z }); break; } // a estrela destrói o item
            popBalloon(m, o, by, pr.type, now, ev); gone = true; break;
          }
        }
      }
      if (gone) { if (age <= pr.ttl) ev("poof", { id: pr.id, x: pr.x, z: pr.z }); }
      else keep.push(pr);
    }
    m.proj = keep;
    // batida entre karts: com estrela, ou no turbo do cogumelo, estoura o balão de quem levou a batida
    for (const a of m.players) for (const b of m.players) {
      if (a === b || ghost(a, now) || ghost(b, now)) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) > 2.3) continue;
      if (a.starT > 0 && b.starT <= 0) popBalloon(m, b, a, "estrela", now, ev);
      else if (a.boostT > 0 && a.v > b.v + 4 && b.starT <= 0) popBalloon(m, b, a, "cogumelo", now, ev);
    }
    if (now >= m.end) { m.over = true; ev("fim", {}); }
  }
  // pacote compacto: karts [n, x, z, yaw, v, flags, balões, pontos] e itens [id, tipo, x, z, y]
  const FL = { drift: 1, spin: 2, ghost: 4, star: 8, boost: 16 };
  const q2 = (v) => Math.round(v * 100) / 100;
  function snap(m, now) {
    return {
      p: m.players.map((p) => [p.n, q2(p.x), q2(p.z), q2(p.yaw), q2(p.v), (p.drifting ? FL.drift : 0) | (p.spinT > 0 ? FL.spin : 0) | (ghost(p, now) ? FL.ghost : 0) | (p.starT > 0 ? FL.star : 0) | (p.boostT > 0 ? FL.boost : 0), p.balloons, p.points]),
      o: m.proj.map((pr) => [pr.id, ITEMS.indexOf(pr.type), q2(pr.x), q2(pr.z), q2(pr.y || 0)]),
      bx: m.boxes.map((t) => (t > now ? 0 : 1)).join(""),
    };
  }

  // ---------- robôs ----------
  // vai atrás de uma caixa quando está sem item; com item, procura um rival e atira quando ele está na frente
  function botInput(m, p, now) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let tx = 0, tz = 0, fire = false, back = false;
    if (!p.item || p.rolling > now) {
      let bd = 1e9; BOXES.forEach(([x, z], i) => { if (m.boxes[i] > now) return; const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; tx = x; tz = z; } });
      if (bd === 1e9) { tx = 0; tz = 0; }
    } else {
      let best = null, bd = 1e9;
      for (const o of m.players) { if (o === p || ghost(o, now)) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; best = o; } }
      if (best) {
        tx = best.x; tz = best.z;
        const d = Math.hypot(tx - p.x, tz - p.z), cos = ((tx - p.x) * fx + (tz - p.z) * fz) / (d || 1);
        if (p.item === "banana") { fire = Math.random() < 0.01; back = true; }
        else if (p.item === "cogumelo" || p.item === "estrela") fire = d < 14 && cos > 0.8;
        else fire = d < 36 && cos > 0.92;
      } else fire = Math.random() < 0.005;
    }
    const want = Math.atan2(-(tx - p.x), -(tz - p.z));
    let dy = want - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const stuck = Math.abs(p.v) < 1 && (p.stuckT = (p.stuckT || 0) + 1 / 30) > 1.2;
    if (Math.abs(p.v) > 2) p.stuckT = 0;
    return { thr: stuck ? -1 : Math.abs(dy) > 1.6 ? 0.4 : 1, steer: Math.max(-1, Math.min(1, -dy * 2.5)) * (stuck ? -1 : 1), drift: false, fire, back };
  }

  const api = { HALF, BLOCKS, BOXES, SPAWNS, COLORS, KR, MAX, ITEMS, ITEM_NAMES, FL, GHOST_MS, BLAST,
    moveKart, collideCircle, rollItem, newPlayer, newMatch, popBalloon, pickBox, useItem, tick, snap, botInput, ghost };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
