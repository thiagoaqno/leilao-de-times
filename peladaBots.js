// Pelada da Galera — amistoso online com bots (só a pé, futsal ou Strikers).
// Cada time tem 4 na linha e 1 goleiro. Quem entrou na sala joga; os lugares que sobram são de bots, que rodam aqui
// no servidor (a mesma física de campo.js). É como um amistoso do FIFA com poucos humanos e o resto do time na IA:
// com LB/T o humano troca de corpo com um bot do time, e no passe para um bot o controle vai junto com a bola.
const C = require("./public/pelada/campo.js");

const LINHA = 4; // jogadores de linha por time (mais o goleiro)
const NOMES = ["Zé", "Tião", "Bira", "Dedé", "Nenê", "Tuca", "Juca", "Lelo", "Pipo", "Guga"];
// lugares dos 4 de linha (x para o ataque, em fração do meio campo; z em fração da largura): 2 atrás, 2 na frente
const SLOTS = [[-0.55, -0.42], [-0.55, 0.42], [-0.1, -0.3], [-0.1, 0.3]];
const PENSA = 0.45, CARRINHO_CD = 4000, CARRINHO_MS = 600, GK_SEGURA = 1200;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vivo = (p) => !!p.team && (p.bot || p.sockets.size > 0);

// cria os bots que faltam em cada time (chamado no começo da partida). Humanos: os da sala; goleiro humano, se tiver.
function montarBots(room, novoId) {
  tirarBots(room);
  let k = 0;
  for (const t of ["A", "B"]) {
    const humanos = room.order.map((id) => room.players[id]).filter((p) => p.team === t);
    const linha = humanos.filter((p) => !p.gk).length, temGk = humanos.some((p) => p.gk);
    const faltam = [...Array(Math.max(0, LINHA - linha)).fill(false), ...(temGk ? [] : [true])];
    faltam.forEach((gk, i) => {
      const id = novoId();
      room.players[id] = { id, bot: true, token: "", n: room.seq++, name: gk ? "Goleiro" : NOMES[k++ % NOMES.length], team: t, num: 10, gk, car: "godzilla", skin: "padrao",
        goals: 0, assists: 0, shots: 0, saves: 0, lastKick: 0, rtt: 0, downUntil: 0, holdSince: 0, noCatch: 0, itens: [], cogumeloAte: 0, estrelaAte: 0,
        pos: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, f: 0, onGround: true }, spawn: null, sockets: new Set(),
        slot: i, pensa: 0, slideAte: 0, slideCd: 0 };
      room.order.push(id);
    });
  }
}
function tirarBots(room) {
  for (const id of room.order) if (room.players[id].bot) delete room.players[id];
  room.order = room.order.filter((id) => room.players[id]);
}

// troca de corpo: o humano h vai para onde o bot estava (posição, velocidade, bola no pé) e o bot fica com o lugar dele.
// O navegador do humano recebe "trocou" e se teletransporta; até ele confirmar (tq), o servidor ignora as posições
// velhas que ainda estão a caminho.
function trocar(room, h, bot, nsp) {
  const a = { ...h.pos }, b = { ...bot.pos }, now = Date.now();
  h.pos = { ...b, at: now }; bot.pos = { ...a, onGround: true, at: now };
  [h.downUntil, bot.downUntil] = [bot.downUntil, h.downUntil];
  const ball = room.ball;
  if (ball.dono === bot.id) ball.dono = h.id; else if (ball.dono === h.id) ball.dono = bot.id;
  if (ball.alvoPasse === bot.id) ball.alvoPasse = h.id; else if (ball.alvoPasse === h.id) ball.alvoPasse = bot.id;
  if (ball.holder === bot.id) ball.holder = h.id; else if (ball.holder === h.id) ball.holder = bot.id;
  h.trocaSeq = (h.trocaSeq || 0) + 1; bot.pensa = 0;
  for (const sid of h.sockets) nsp.sockets.get(sid)?.emit("trocou", { tq: h.trocaSeq, x: h.pos.x, y: h.pos.y, z: h.pos.z, vx: h.pos.vx, vz: h.pos.vz, yaw: h.pos.yaw, bot: bot.id });
}
// LB/T: o humano pega o bot do time mais perto da bola (apertando de novo logo em seguida, o próximo)
function trocarPedido(room, h, nsp) {
  if (!room.config.bots || h.gk) return false;
  const b = room.ball, now = Date.now();
  if (b.dono === h.id || b.holder === h.id) return false; // com a bola, não troca
  const lista = room.order.map((id) => room.players[id]).filter((p) => p.bot && !p.gk && p.team === h.team)
    .sort((p, q) => Math.hypot(b.x - p.pos.x, b.z - p.pos.z) - Math.hypot(b.x - q.pos.x, b.z - q.pos.z));
  if (!lista.length) return false;
  h.trocaN = now - (h.trocaT || 0) < 1200 ? (h.trocaN || 0) + 1 : 0; h.trocaT = now;
  trocar(room, h, lista[h.trocaN % lista.length], nsp);
  return true;
}
// passe para um bot do time: um humano passa a controlar quem recebe. Se tem outro humano no time (sem a bola), vai o
// mais perto do receptor; senão, quem passou. Passe para um humano: ninguém troca.
function trocaNoPasse(room, passador, recId, nsp) {
  const r = room.players[recId];
  if (!room.config.bots || !r || !r.bot || r.gk || r.team !== passador.team) return false;
  const outros = room.order.map((id) => room.players[id]).filter((p) => !p.bot && p !== passador && p.team === passador.team && !p.gk && p.sockets.size)
    .sort((p, q) => Math.hypot(p.pos.x - r.pos.x, p.pos.z - r.pos.z) - Math.hypot(q.pos.x - r.pos.x, q.pos.z - r.pos.z));
  trocar(room, outros[0] || passador, r, nsp);
  return true;
}

// ---------- a IA, um passo (60 por segundo) ----------
// fx: { kick(p, kind, power, yaw, opt), touched(id) } — o servidor faz o chute, o som e a conta de quem tocou
function passo(room, F, now, dt, fx) {
  const b = room.ball, todos = room.order.map((id) => room.players[id]).filter(vivo);
  const timeDe = (id) => (room.players[id] ? room.players[id].team : null), donoT = b.dono ? timeDe(b.dono) : b.holder ? timeDe(b.holder) : null;
  // quem vai na bola em cada time: o de linha mais perto dela (se for humano, os bots só guardam posição)
  const cacador = {};
  for (const t of ["A", "B"]) {
    let best = null, bd = Infinity;
    for (const p of todos) if (p.team === t && !p.gk && p.downUntil <= now) { const d = Math.hypot(b.x - p.pos.x, b.z - p.pos.z); if (d < bd) { bd = d; best = p; } }
    cacador[t] = best;
  }
  for (const p of todos) {
    if (!p.bot) continue;
    const s = p.team === "A" ? 1 : -1, pos = p.pos, caido = p.downUntil > now, deslizando = p.slideAte > now;
    let tx = pos.x, tz = pos.z, sprint = false, olha = b;
    if (!caido && !deslizando) {
      if (p.gk) {
        // goleiro: na linha do gol, acompanhando a bola; segurou, solta logo num companheiro (ou para a frente)
        const gx = -s * (F.L - 0.8);
        tx = gx; tz = clamp(b.z * 0.55, -(F.goalW - 0.3), F.goalW - 0.3);
        if (C.inArea(F.id, p.team, b.x, b.z) && !b.dono && !b.holder && Math.hypot(b.vx, b.vz) < 9) { tx = b.x; tz = b.z; sprint = true; } // bola solta na área: vai nela
        if (b.holder === p.id && now - p.holdSince > GK_SEGURA) {
          const mates = todos.filter((q) => q.team === p.team && q !== p).map((q) => ({ id: q.id, x: q.pos.x, z: q.pos.z, vx: q.pos.vx, vz: q.pos.vz }));
          const r = C.assistPass(pos, s > 0 ? -Math.PI / 2 : Math.PI / 2, mates, 0.4 + Math.random() * 0.4, false, F);
          if (fx.kick(p, r.kind || "passe", r.alvo ? r.power : 0.8, r.yaw)) p.noCatch = now + 1000;
        }
      } else if (b.dono === p.id) {
        // com a bola: conduz para o gol desviando, chuta de perto, passa quando apertado (ou de vez em quando)
        const gx = s * F.L, rivais = todos.filter((q) => q.team !== p.team && q.downUntil <= now);
        if (now >= p.pensa) { p.pensa = now + PENSA * 1000 * (0.7 + Math.random() * 0.6); if (decide(p, F, b, todos, rivais, s, now, fx)) continue; }
        let dx = gx - pos.x, dz = (p.alvoZ ?? 0) - pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        let livre = true;
        for (const o of rivais) {
          const ox = o.pos.x - pos.x, oz = o.pos.z - pos.z, od = Math.hypot(ox, oz), fr = (ox * dx + oz * dz) / (od || 1);
          if (od < 4 && fr > 0.2) { livre = false; const lado = Math.sign(ox * -dz + oz * dx) || 1, k = (4 - od) * 0.35, px = -dz * lado, pz = dx * lado; dx -= px * k; dz -= pz * k; } // desvia para o lado livre
        }
        tx = pos.x + dx * 3; tz = pos.z + dz * 3; sprint = livre; olha = null;
      } else if (cacador[p.team] === p && donoT !== p.team) {
        // vai na bola (um pouco à frente dela); perto de quem conduz, às vezes dá carrinho
        const dB = Math.hypot(b.x - pos.x, b.z - pos.z), lead = Math.min(0.6, dB / 10);
        tx = b.x + b.vx * lead; tz = b.z + b.vz * lead; sprint = dB > 3;
        if (b.dono && donoT !== p.team && dB < 1.9 && now > p.slideCd && Math.random() < dt * 1.2) {
          const yaw = Math.atan2(-(b.x - pos.x), -(b.z - pos.z)), sp = Math.max(Math.hypot(pos.vx, pos.vz), 7.5);
          pos.yaw = yaw; pos.vx = -Math.sin(yaw) * sp; pos.vz = -Math.cos(yaw) * sp; p.slideAte = now + CARRINHO_MS; p.slideCd = now + CARRINHO_CD;
        }
        // bola solta no pé e perto do gol: chuta de primeira
        if (!b.dono && !b.holder && now - p.lastKick > 500 && C.canKick({ ...pos, id: p.id }, b, 0) === "pe" && Math.hypot(s * F.L - b.x, b.z) < F.L * 0.45 && Math.random() < 0.5) chuta(p, F, b, s, fx);
      } else {
        // guarda posição acompanhando a bola (mais à frente quando o time tem a bola)
        const sl = SLOTS[p.slot % SLOTS.length], bxa = s * b.x;
        const xa = clamp(sl[0] * F.L * 0.8 + bxa * 0.55 + (donoT === p.team ? F.L * 0.2 : -F.L * 0.1), -F.L + 3, F.L - 3);
        tx = s * xa; tz = clamp(sl[1] * F.W * 2 * 0.7 + b.z * 0.3, -F.W + 1.5, F.W - 1.5);
      }
    }
    // anda (a mesma física do jogador), sem atravessar ninguém, e vira para onde corre (ou para a bola)
    let wx = 0, wz = 0, speed = 0;
    const dx = tx - pos.x, dz = tz - pos.z, dist = Math.hypot(dx, dz);
    if (!caido && !deslizando && dist > 0.4) { wx = dx / dist; wz = dz / dist; speed = (sprint ? C.SPRINT : C.RUN) * (F.vel || 1) * clamp(dist / 2, 0.35, 1) * (p.gk ? 0.9 : 0.95); }
    if (caido || deslizando) { const k = Math.exp(-dt * (caido ? 6 : 1.6)); pos.vx *= k; pos.vz *= k; }
    C.movePlayer(pos, { x: wx, z: wz, speed, free: caido || deslizando }, dt, F);
    const outros = todos.filter((q) => q !== p).map((q) => ({ x: q.pos.x, z: q.pos.z, y: q.pos.y, vx: q.pos.vx, vz: q.pos.vz, caido: q.downUntil > now || (q.slideAte || 0) > now }));
    C.corpoACorpo(pos, outros, caido || deslizando);
    if (!caido && !deslizando) {
      const alvo = speed > 0 ? Math.atan2(-wx, -wz) : olha ? Math.atan2(-(olha.x - pos.x), -(olha.z - pos.z)) : pos.yaw;
      const df = Math.atan2(Math.sin(alvo - pos.yaw), Math.cos(alvo - pos.yaw));
      pos.yaw += clamp(df, -9 * dt, 9 * dt);
    }
    pos.f = (sprint && speed > 0 ? 1 : 0) | (deslizando ? 4 : 0); // FL.sprint, FL.slide
    pos.at = now;
  }
}
// com a bola, a cada ~0,45 s: chuta, passa ou continua conduzindo. Devolve true se a bola saiu do pé.
function decide(p, F, b, todos, rivais, s, now, fx) {
  const pos = p.pos, gx = s * F.L, dGol = Math.hypot(gx - pos.x, pos.z);
  if (dGol < F.L * 0.55 && s * (gx - pos.x) > 1.5 && Math.random() < 0.8) return chuta(p, F, b, s, fx);
  const perto = (q, r) => rivais.some((o) => Math.hypot(o.pos.x - q.pos.x, o.pos.z - q.pos.z) < r);
  const apertado = perto(p, 2.4);
  if (apertado || Math.random() < 0.2) {
    let best = null, bs = -Infinity;
    for (const m of todos) {
      if (m === p || m.team !== p.team || m.gk || m.downUntil > now) continue;
      const dd = Math.hypot(m.pos.x - pos.x, m.pos.z - pos.z); if (dd < 3 || dd > 26) continue;
      const sc = s * (m.pos.x - pos.x) * 0.6 - (perto(m, 2.5) ? 12 : 0) - dd * 0.15 + (m.bot ? 0 : 2); // gosta de tocar para os humanos
      if (sc > bs) { bs = sc; best = m; }
    }
    if (best && (apertado ? bs > -10 : bs > 1)) return passa(p, F, best, rivais, s, fx);
  }
  p.alvoZ = clamp(pos.z * 0.5 + (Math.random() * 2 - 1) * F.W * 0.4, -F.W + 3, F.W - 3);
  return false;
}
function chuta(p, F, b, s, fx) {
  const alvoZ = (Math.random() * 2 - 1) * (F.goalW - 0.4), yaw = Math.atan2(-(s * F.L - b.x), -(alvoZ - b.z)) + (Math.random() * 2 - 1) * 0.06;
  return fx.kick(p, "chute", 0.75 + Math.random() * 0.25, yaw);
}
// passe: no Strikers, o passe planejado (curto, longo ou em profundidade, como o humano); no futsal, o assistido
function passa(p, F, alvo, rivais, s, fx) {
  const pos = p.pos, m = { id: alvo.id, x: alvo.pos.x, z: alvo.pos.z, vx: alvo.pos.vx, vz: alvo.pos.vz };
  const dx = m.x - pos.x, dz = m.z - pos.z, d = Math.hypot(dx, dz), yaw = Math.atan2(-dx, -dz);
  if (F.strikers) {
    const naLinha = rivais.some((o) => { const u = clamp(((o.pos.x - pos.x) * dx + (o.pos.z - pos.z) * dz) / (d * d), 0, 1); return u > 0.1 && u < 0.9 && Math.hypot(pos.x + dx * u - o.pos.x, pos.z + dz * u - o.pos.z) < 1.2; });
    const tipo = s * (m.vx || 0) > 2.5 && Math.random() < 0.7 ? "profundidade" : naLinha || d > 17 ? "longo" : "curto";
    const colado = rivais.some((o) => Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z) < 1.6), forca = Math.random() * 0.6;
    const pl = C.planejarPasse(F, pos, yaw, [m], tipo, forca, colado, s);
    return fx.kick(p, pl.kind, forca, pl.yaw, { vel: pl.vel, elev: pl.elev, alvo: pl.alvo });
  }
  const r = C.assistPass(pos, yaw, [m], 0.45, false, F);
  return fx.kick(p, r.kind || "passe", r.power, r.yaw);
}

module.exports = { montarBots, tirarBots, passo, trocarPedido, trocaNoPasse, vivo, LINHA };
