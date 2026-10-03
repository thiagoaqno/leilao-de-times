// Pelada da Galera — futebol 3D do 1x1 ao 5x5, a pé (futsal, com goleiro opcional) ou de carro (estilo Rocket League).
// Canal "/pelada" do Socket.io.
// Cada navegador mexe o próprio jogador/carro e manda a posição ~30 vezes por segundo.
// A BOLA é do servidor: ele roda a física (public/pelada/campo.js) 60 vezes por segundo com as posições de todo mundo,
// confere chutes, defesas do goleiro e carrinhos, conta os gols e manda UM pacote por jogador, 20 vezes por segundo,
// com a bola e todo mundo dentro (pacotes pequenos e poucos: gasta bem menos internet).
const C = require("./public/pelada/campo.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas, medirPing } = require("./salas.js"); // as peças de sala que todo jogo repete
const Bots = require("./peladaBots.js"); // amistoso com bots (a IA roda aqui)

const TICK = 1 / 60, SNAP_EVERY = 3, READY_MS = 3000, GOAL_MS = 4000, MAX_TEAM = 5;
const HOLD_MS = 6000, DOWN_MS = 1400;
const SIDES = { A: "Mandante", B: "Visitante" };
// bits do "f" (o que o jogador está fazendo), iguais aos do navegador
const FL = { sprint: 1, charge: 2, slide: 4, dive: 8, flip: 16, down: 32, boost: 64, grab: 128, deke: 256, estrela: 512, cogumelo: 1024 }; // estrela/cogumelo: só o servidor liga (itens do Strikers) // deke: drible com giro (Strikers) // grab: segurando alguém
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const q2 = (v) => Math.round(v * 100) / 100;

module.exports = function attachPelada(io) {
  const nsp = io.of("/pelada");
  const rooms = new Map();

  const cleanConfig = (c = {}) => ({
    mode: c.mode === "carros" ? "carros" : "pes",
    size: clamp(int(c.size, 2), 1, MAX_TEAM),
    minutes: [3, 5, 8].includes(int(c.minutes, 5)) ? int(c.minutes, 5) : 5,
    arena: C.ARENAS[c.arena] ? c.arena : "society", // quadra escolhida pelo organizador (todo mundo vê a mesma)
    estilo: c.estilo === "strikers" ? "strikers" : "futsal", // a pé: futsal ou Strikers (arcade, com itens e Super Chute)
    bots: c.mode !== "carros" && !!c.bots,
    molinho: c.molinho !== false, // corpo molinho: a mola do tronco atrapalha a aderência nas viradas bruscas (campo.js, GINGA) // amistoso: 4 na linha + goleiro por time, os lugares vagos são de bots
  });
  const F = (room) => C.campoDe(room.config.mode, room.config.estilo);
  const teamOf = (room, t) => room.order.map((id) => room.players[id]).filter((p) => p.team === t);
  function log(room, text) { room.feed.push({ t: Date.now(), text }); if (room.feed.length > 30) room.feed.splice(0, room.feed.length - 30); }

  function publicState(room) {
    const m = room.match;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, kits: room.kits,
      match: m ? { phase: m.phase, until: m.until, left: Math.max(0, Math.round(m.left)), score: m.score, kickoff: m.kickoff, goals: m.goals.slice(-20) } : null,
      players: room.order.map((id) => {
        const p = room.players[id];
        return { id, n: p.n, name: p.name, team: p.team, bot: !!p.bot, num: p.num, gk: !!p.gk, car: p.car, skin: p.skin, itens: p.itens || [], goals: p.goals, assists: p.assists, shots: p.shots, saves: p.saves,
          ping: p.rtt == null ? null : Math.round(p.rtt), online: !!p.bot || p.sockets.size > 0, spawn: p.spawn, tq: p.trocaSeq || 0 };
      }),
      feed: room.feed.slice(-12), now: Date.now(),
    };
  }
  function broadcast(room) { room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }

  // ---------- partida ----------
  function startMatch(room) {
    room.phase = "play";
    room.match = { phase: "ready", until: 0, left: room.config.minutes * 60000, score: { A: 0, B: 0 }, kickoff: 0, goals: [], last: [] };
    if (room.config.bots) Bots.montarBots(room, () => rid(6)); else Bots.tirarBots(room);
    for (const id of room.order) Object.assign(room.players[id], { goals: 0, assists: 0, shots: 0, saves: 0 });
    if (room.config.mode === "carros") for (const id of room.order) room.players[id].gk = false;
    // números das camisas: goleiro é o 1; os outros na ordem em que entraram
    for (const t of ["A", "B"]) { let k = 0; teamOf(room, t).forEach((p) => { p.num = p.gk ? 1 : [10, 7, 9, 8, 11][k++] || 12 + k; }); }
    log(room, `⚽ Bola rolando${room.config.mode === "carros" ? " (de carro!)" : ""}: ${room.config.minutes} minutos.`);
    kickoff(room, Math.random() < 0.5 ? "A" : "B");
    clearInterval(room.loop);
    room.loop = setInterval(() => tick(room), TICK * 1000);
  }
  // saída de bola: todo mundo no seu campo, bola no meio, 3 segundos parados
  function kickoff(room, kicking) {
    const m = room.match;
    m.phase = "ready"; m.until = Date.now() + READY_MS; m.kickoff++; m.last = [];
    room.ball = C.newBall(F(room));
    room.itens = []; room.passes = { A: 0, B: 0 }; room.ultDono = null; // Strikers: campo limpo (os itens na mão continuam)
    for (const t of ["A", "B"]) {
      const list = teamOf(room, t), sp = C.spawns(F(room).id, t, list, t === kicking);
      list.forEach((p, i) => { p.spawn = sp[i]; p.pos = { x: sp[i][0], y: 0, z: sp[i][2], vx: 0, vy: 0, vz: 0, yaw: sp[i][3], pitch: 0, f: 0 }; p.downUntil = 0; });
    }
    broadcast(room);
  }
  function endMatch(room) {
    const m = room.match;
    clearInterval(room.loop); room.loop = null;
    room.phase = "over"; m.phase = "over";
    const { A, B } = m.score;
    log(room, A === B ? `Fim de jogo: empate em ${A} a ${B}.` : `Fim de jogo: ${SIDES[A > B ? "A" : "B"]} venceu por ${Math.max(A, B)} a ${Math.min(A, B)}.`);
    broadcast(room);
  }
  function goal(room, side, qtd = 1, sup = false) { // qtd: o Super Chute (Strikers) vale vários gols de uma vez
    const m = room.match, now = Date.now();
    m.score[side] += qtd;
    // quem fez: o último a encostar. Se foi do outro time, é gol contra. Assistência: o toque anterior, do mesmo time.
    const [lastId, prevId] = m.last;
    const scorer = room.players[lastId], prev = room.players[prevId];
    const own = scorer && scorer.team !== side;
    if (scorer && !own) scorer.goals += qtd;
    const assist = !own && prev && prev !== scorer && prev.team === side ? prev : null;
    if (assist) assist.assists++;
    m.goals.push({ t: now, side, qtd, by: scorer ? scorer.id : null, own: !!own, assist: assist ? assist.id : null, at: Math.round((room.config.minutes * 60000 - m.left) / 1000) });
    log(room, `⚽ ${qtd > 1 ? `${qtd} GOLS (Super Chute)` : "GOL"} do ${SIDES[side]}${scorer ? (own ? ` (contra, ${scorer.name})` : ` — ${scorer.name}`) : ""}${assist ? `, passe de ${assist.name}` : ""}.`);
    m.phase = "goal"; m.until = now + GOAL_MS;
    nsp.to(room.code).emit("goal", { side, qtd, sup, by: scorer ? scorer.id : null, own: !!own, assist: assist ? assist.id : null });
    broadcast(room);
  }
  function touched(room, id) {
    const m = room.match;
    if (!id || m.last[0] === id) return;
    m.last.unshift(id); m.last.length = Math.min(m.last.length, 3);
  }
  // corpo de cada jogador para a física da bola. Entre um pacote e outro (chegam ~30 por segundo), o jogador continua
  // andando com a última velocidade (até 100 ms), senão ele fica "parado" no servidor e a bola no pé escapa.
  const bodyOf = (room, p, now) => {
    const f = p.pos.f | 0, down = p.downUntil > now, ag = clamp((now - (p.pos.at || now)) / 1000, 0, 0.1);
    return { id: p.id, kind: room.config.mode === "carros" ? "car" : "pe", x: p.pos.x + p.pos.vx * ag, y: p.pos.y, z: p.pos.z + p.pos.vz * ag, vx: p.pos.vx, vy: p.pos.vy, vz: p.pos.vz, yaw: p.pos.yaw,
      sprint: f & FL.sprint, slide: (f & FL.slide) || (f & FL.down) || down, dive: f & FL.dive, flip: f & FL.flip,
      conduz: true, chutou: now - p.lastKick < 350 }; // conduz: a bola fica no pé (campo.js); logo depois do chute, solta
  };
  // goleiro: pega a bola que chega perto dentro da área (se não vier forte demais), segura até 6 s e solta com chute ou passe
  function keepers(room, now) {
    const b = room.ball, mode = F(room).id;
    if (room.config.mode !== "pes") return;
    if (b.holder) {
      const k = room.players[b.holder];
      const keep = k && Bots.vivo(k) && k.downUntil <= now && C.inArea(mode, k.team, k.pos.x, k.pos.z) && now - k.holdSince < HOLD_MS;
      if (!keep) { b.holder = null; if (k) { k.noCatch = now + 1000; b.vx = -Math.sin(k.pos.yaw) * 2; b.vz = -Math.cos(k.pos.yaw) * 2; } return; }
      b.x = k.pos.x - Math.sin(k.pos.yaw) * 0.45; b.z = k.pos.z - Math.cos(k.pos.yaw) * 0.45; b.y = k.pos.y + 1.15; b.vx = b.vy = b.vz = 0;
      return;
    }
    for (const id of room.order) {
      const p = room.players[id];
      if (!p.gk || !Bots.vivo(p) || p.downUntil > now || (p.noCatch || 0) > now) continue;
      if (!C.inArea(mode, p.team, p.pos.x, p.pos.z) || !C.inArea(mode, p.team, b.x, b.z)) continue;
      const dive = (p.pos.f | 0) & FL.dive, reach = dive ? 1.7 : 1.0, top = p.pos.y + (dive ? 2.0 : 2.4);
      const d = Math.hypot(b.x - p.pos.x, b.z - p.pos.z);
      if (d > reach || b.y > top) continue;
      const rel = Math.hypot(b.vx - p.pos.vx, b.vy, b.vz - p.pos.vz);
      if (rel > 27) continue; // bomba: espalma (a física do corpo rebate)
      b.holder = p.id; p.holdSince = now; p.saves++;
      touched(room, p.id);
      nsp.to(room.code).emit("pegou", { id: p.id });
      return;
    }
  }
  // ---------- Strikers: itens ----------
  // ganhou item (até 2 na mão): avisa todo mundo (o estado leva o inventário)
  function darItem(room, p, motivo) {
    if (room.config.estilo !== "strikers" || !p || p.bot) return; // bot não usa item
    p.itens ||= []; if (p.itens.length >= 2) return;
    const k = C.sortearItem(); p.itens.push(k);
    nsp.to(room.code).emit("ganhou", { id: p.id, tipo: k, motivo }); broadcast(room);
  }
  function derruba(room, o, by, now) {
    if (!o || o.downUntil > now) return;
    o.downUntil = now + DOWN_MS; if (room.ball.dono === o.id) room.ball.dono = null;
    nsp.to(room.code).emit("caiu", { id: o.id, by });
  }
  // a cada passo: os itens andam (e derrubam quem acertam), a estrela derruba quem encosta e 3 passes seguidos do
  // mesmo time dão item para quem recebeu
  function strikers(room, now, Fm) {
    const b = room.ball, vivos = room.order.map((id) => room.players[id]).filter(Bots.vivo);
    room.itens ||= [];
    const corpos = vivos.map((p) => ({ id: p.id, team: p.team, x: p.pos.x, z: p.pos.z, imune: p.downUntil > now || (p.estrelaAte || 0) > now, bola: b.dono === p.id || b.holder === p.id }));
    const r = C.stepItens(Fm, room.itens, corpos, TICK);
    for (const e of r.explosoes) nsp.to(room.code).emit("boom", { x: q2(e.x), z: q2(e.z) });
    for (const a of r.acertos) derruba(room, room.players[a.id], a.por, now);
    for (const s of vivos) if ((s.estrelaAte || 0) > now) for (const o of vivos)
      if (o.team !== s.team && o.downUntil <= now && !((o.estrelaAte || 0) > now) && Math.hypot(o.pos.x - s.pos.x, o.pos.z - s.pos.z) < 1.0) derruba(room, o, s.id, now);
    if (b.dono && b.dono !== room.ultDono) {
      const a = room.players[room.ultDono], c = room.players[b.dono];
      if (a && c && a.team === c.team) { room.passes[c.team] = (room.passes[c.team] || 0) + 1; if (room.passes[c.team] % 3 === 0) darItem(room, c, "3 passes"); }
      else room.passes = { A: 0, B: 0 };
      room.ultDono = b.dono;
    }
  }
  // carrinho: quem estiver na frente de quem desliza cai (fica 1,4 s no chão)
  function tackles(room, now) {
    if (room.config.mode !== "pes") return;
    for (const sid of room.order) {
      const s = room.players[sid];
      if (!s.team || !((s.pos.f | 0) & FL.slide) || s.downUntil > now || room.ball.dono === s.id) continue; // carrinho só de quem está sem a bola
      const fx = -Math.sin(s.pos.yaw), fz = -Math.cos(s.pos.yaw), hx = s.pos.x + fx * 0.6, hz = s.pos.z + fz * 0.6;
      for (const oid of room.order) {
        const o = room.players[oid];
        if (o === s || !o.team || o.team === s.team || o.downUntil > now || room.ball.holder === o.id || ((o.pos.f | 0) & FL.deke) || (o.estrelaAte || 0) > now) continue; // no giro do drible (e com estrela), não pega
        if (Math.hypot(o.pos.x - hx, o.pos.z - hz) < 0.85 && o.pos.y < 0.6) {
          const tinhaBola = room.ball.dono === o.id;
          o.downUntil = now + DOWN_MS;
          nsp.to(room.code).emit("caiu", { id: o.id, by: s.id });
          if (!tinhaBola) darItem(room, o, "derrubado sem a bola"); // Strikers: falta em quem está sem a bola dá item
        }
      }
    }
  }
  function tick(room) {
    const m = room.match, now = Date.now(), Fm = F(room);
    if (!m || room.phase !== "play") return;
    if (m.phase === "ready") { if (now >= m.until) { m.phase = "live"; broadcast(room); } }
    else if (m.phase === "goal") { if (now >= m.until) { if (m.left <= 0) return endMatch(room); kickoff(room, m.goals[m.goals.length - 1].side === "A" ? "B" : "A"); } }
    if (m.phase === "goal") C.simulate(Fm, room.ball, [], TICK); // a bola acaba de rolar na rede
    if (m.phase === "super" && now >= m.until) { // fim da animação do Super Chute: soma os gols (ou a bola fica com a defesa)
      const r = room.superRes; room.superRes = null;
      if (r && r.gols) goal(room, r.side, r.gols, true);
      else { room.ball = C.newBall(Fm); if (r) room.ball.x = r.s * (Fm.L - 2); m.phase = "live"; broadcast(room); }
    }
    if (m.phase === "live") {
      m.left -= TICK * 1000;
      keepers(room, now);
      tackles(room, now);
      if (room.config.bots) Bots.passo(room, Fm, now, TICK, botFx(room));
      const bodies = room.order.map((id) => room.players[id]).filter(Bots.vivo).map((p) => bodyOf(room, p, now));
      const r = C.simulate(Fm, room.ball, bodies, TICK);
      if (r.touch) touched(room, r.touch);
      if (room.config.estilo === "strikers" && room.config.mode === "pes") strikers(room, now, Fm);
      if (r.hit > 2) room.bump = Math.max(room.bump || 0, r.hit);
      const side = C.goalOf(Fm, room.ball);
      if (side) goal(room, side);
      else if (m.left <= 0) { m.left = 0; return endMatch(room); }
    }
    // um pacote para todo mundo, 20 vezes por segundo: a bola e cada jogador (números com 2 casas, em listas)
    room.frame = (room.frame || 0) + 1;
    if (room.frame % SNAP_EVERY === 0) {
      const b = room.ball, holder = b.holder && room.players[b.holder] ? room.players[b.holder].n : -1;
      const p = room.order.map((id) => room.players[id]).filter(Bots.vivo)
        .map((x) => [x.n, q2(x.pos.x), q2(x.pos.y), q2(x.pos.z), q2(x.pos.vx), q2(x.pos.vy), q2(x.pos.vz), q2(x.pos.yaw), q2(x.pos.pitch || 0),
          (x.pos.f | 0) | (x.downUntil > now ? FL.down : 0) | ((x.estrelaAte || 0) > now ? FL.estrela : 0) | ((x.cogumeloAte || 0) > now ? FL.cogumelo : 0)]);
      const it = room.itens && room.itens.length ? room.itens.map((i) => [i.id, C.ITEM_LISTA.indexOf(i.tipo), q2(i.x), q2(i.z), q2(i.vx), q2(i.vz), q2(i.t)]) : undefined; // itens andando (Strikers)
      nsp.to(room.code).volatile.emit("snap", { t: now, b: [q2(b.x), q2(b.y), q2(b.z), q2(b.vx), q2(b.vy), q2(b.vz), room.bump ? Math.round(room.bump) : 0, holder, q2(b.sp || 0), q2(b.wx || 0), q2(b.wy || 0), q2(b.wz || 0), b.dono && room.players[b.dono] ? room.players[b.dono].n : -1], p, it }); // depois do giro (bola do Rocket): quem conduz a bola
      room.bump = 0;
    }
  }

  // o que a IA dos bots pode fazer na bola: chutar/passar (a mesma conta do chute de um humano)
  function botFx(room) {
    return {
      kick(p, kind, power, yaw, opt = null) {
        const now = Date.now(), how = C.kick(room.ball, { ...p.pos, id: p.id }, kind, power, yaw, 0, 0, F(room), opt);
        if (!how) return false;
        p.lastKick = now; if (kind === "chute") p.shots++;
        touched(room, p.id);
        nsp.to(room.code).emit("kicked", { id: p.id, kind, how, power });
        return true;
      },
    };
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    const cleanSkin = (s) => (C.SKINS[s] ? s : "padrao");
    function addPlayer(room, name, skin) {
      const id = rid(6), a = teamOf(room, "A").length, b = teamOf(room, "B").length, size = room.config.size;
      const team = room.phase !== "lobby" ? null : a <= b && a < size ? "A" : b < size ? "B" : null; // sobrou? banco
      const cars = Object.keys(C.CARS);
      room.players[id] = { id, token: rid(12), n: room.seq++, name, team, num: 10, gk: false, car: cars[room.order.length % cars.length], skin: cleanSkin(skin), goals: 0, assists: 0, shots: 0, saves: 0,
        lastKick: 0, rtt: null, downUntil: 0, holdSince: 0, noCatch: 0, itens: [], cogumeloAte: 0, estrelaAte: 0,
        pos: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, f: 0 }, spawn: null, sockets: new Set() };
      room.order.push(id);
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = { code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), kits: { A: "corinthians", B: "palmeiras" },
        players: {}, order: [], seq: 0, match: null, ball: C.newBall(), feed: [], t: Date.now() };
      rooms.set(room.code, room);
      const p = addPlayer(room, name, data.skin);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Quadra aberta por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Sala não encontrada. Confira o código (se o servidor reiniciou, a sala se perdeu).");
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch) { bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room); }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= 14) return fail(cb, "A sala está cheia. Você pode entrar para assistir.");
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na sala.");
      const p = addPlayer(room, name, data.skin);
      bind(room, p.id);
      log(room, `${name} chegou na quadra.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("clock", (cb) => typeof cb === "function" && cb(Date.now()));

    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa sala.");
      const type = data.type, isHost = me && room.host === me.id, playing = room.phase === "play";
      const err = (() => {
        if (type === "team") {
          if (!me || playing) return "Só dá para trocar de time fora do jogo.";
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (t && t !== me.team && teamOf(room, t).length >= room.config.size) return `O ${SIDES[t]} está cheio.`;
          me.team = t; me.gk = false; return;
        }
        if (type === "gk") { // ser (ou deixar de ser) o goleiro do time
          if (!me || playing || !me.team) return "Entre num time primeiro.";
          if (room.config.mode !== "pes") return "No modo carros não tem goleiro.";
          if (data.on && teamOf(room, me.team).some((p) => p !== me && p.gk)) return "Seu time já tem goleiro.";
          me.gk = !!data.on; return;
        }
        if (type === "skin") { // dá para trocar a qualquer hora, até no meio do jogo
          if (!me || !C.SKINS[data.skin]) return "Skin inválida.";
          me.skin = data.skin; return;
        }
        if (type === "car") {
          if (!me || playing || !C.CARS[data.car]) return "Carro inválido.";
          me.car = data.car; return;
        }
        if (type === "kit") { // qualquer um do time (ou o organizador) escolhe a camisa
          const t = data.team === "A" || data.team === "B" ? data.team : null;
          if (!t || playing) return "Só dá para trocar a camisa fora do jogo.";
          if (!isHost && (!me || me.team !== t)) return "Só quem é do time (ou o organizador) troca a camisa.";
          if (C.KITS[data.kit]) room.kits[t] = data.kit; return;
        }
        if (type === "config") {
          if (!isHost || playing) return "Só o organizador muda, fora do jogo.";
          room.config = cleanConfig(data.config);
          for (const t of ["A", "B"]) teamOf(room, t).slice(room.config.size).forEach((p) => { p.team = null; p.gk = false; });
          return;
        }
        if (type === "kick") {
          if (!isHost || playing) return "Só o organizador, fora do jogo.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("removido");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da quadra.`); return;
        }
        if (type === "start") {
          if (!isHost || playing) return "Só o organizador começa o jogo.";
          if (room.config.bots ? !teamOf(room, "A").length && !teamOf(room, "B").length : !teamOf(room, "A").length || !teamOf(room, "B").length)
            return room.config.bots ? "Entre num time para jogar (os bots completam o resto)." : "Precisa de pelo menos 1 jogador em cada time.";
          startMatch(room); return;
        }
        if (type === "lobby") {
          if (!isHost) return "Só o organizador.";
          clearInterval(room.loop); room.loop = null; room.phase = "lobby"; room.match = null; Bots.tirarBots(room); return;
        }
        return "Ação desconhecida.";
      })();
      if (err) return fail(cb, err);
      ok(cb);
      broadcast(room);
    });

    // minha posição (~30 por segundo): o servidor usa na física da bola e manda para os outros no pacote
    socket.on("st", (d = {}) => {
      const { room, me } = ctx();
      if (!room || !me || !me.team || room.phase !== "play" || !room.match) return;
      const { x, y, z, vx, vy, vz, yaw } = d;
      if (![x, y, z, vx, vy, vz, yaw].every(fin)) return;
      if (int(d.tq, 0) !== (me.trocaSeq || 0)) return; // trocou de corpo com um bot: posição velha ainda chegando
      const Fm = F(room), m = room.match, lim = room.config.mode === "carros" ? 40 : 14;
      if (m.phase === "ready" && me.spawn) Object.assign(me.pos, { x: me.spawn[0], y: 0, z: me.spawn[2], vx: 0, vy: 0, vz: 0 }); // parado na saída
      else Object.assign(me.pos, { x: clamp(x, -Fm.L - Fm.goalD, Fm.L + Fm.goalD), y: clamp(y, 0, Fm.ceil), z: clamp(z, -Fm.W, Fm.W),
        vx: clamp(vx, -lim, lim), vy: clamp(vy, -lim, lim), vz: clamp(vz, -lim, lim) });
      me.pos.yaw = yaw; me.pos.pitch = fin(d.p) ? clamp(d.p, -3.2, 3.2) : 0; me.pos.at = Date.now();
      // conduzindo, a bola vem do navegador de quem está com ela (como a posição do jogador): o servidor só confere se é
      // plausível (a bola rasteira, perto dele, sem teletransporte) e se ninguém mais é o dono (roubo e carrinho são daqui)
      const bola = d.bola, b = room.ball;
      if (Array.isArray(bola) && bola.length === 6 && bola.every(fin) && room.config.mode === "pes" && m.phase === "live" && !b.holder && (!b.dono || b.dono === me.id)) {
        const [bx, by, bz, bvx, bvy, bvz] = bola;
        if (by < 0.6 && Math.hypot(bx - me.pos.x, bz - me.pos.z) < 1.6 && Math.hypot(bx - b.x, bz - b.z) < 2.5)
          Object.assign(b, { x: clamp(bx, -Fm.L - Fm.goalD, Fm.L + Fm.goalD), y: clamp(by, Fm.ballR, 0.6), z: clamp(bz, -Fm.W, Fm.W), vx: clamp(bvx, -14, 14), vy: clamp(bvy, -8, 8), vz: clamp(bvz, -14, 14), sp: 0, dono: me.id });
      }
      me.pos.f = int(d.f, 0) & (FL.sprint | FL.charge | FL.slide | FL.dive | FL.flip | FL.boost | FL.grab | FL.down | FL.deke); // down: choque na cerca (Strikers)
      if (room.config.estilo !== "strikers") me.pos.f &= ~FL.deke;
      if (room.config.mode !== "pes") me.pos.f &= ~FL.grab; // segurar é só a pé
      if (!me.gk) me.pos.f &= ~FL.dive;
    });

    // Strikers: Super Chute. Quem está com a bola no campo de ataque pede com n bolas (2 a 5, pela barra). O servidor
    // confere, sorteia as defesas (goleiro de verdade na área pega mais), avisa todo mundo para animar e congela o jogo
    // até a animação acabar; aí soma os gols (tick).
    socket.on("super", (d = {}) => {
      return; // Super Chute desligado por enquanto (duplicava a bola)
      const { room, me } = ctx(); const m = room && room.match, now = Date.now();
      if (!room || !me || !me.team || room.phase !== "play" || !m || m.phase !== "live" || room.config.estilo !== "strikers" || room.config.mode !== "pes") return;
      if (me.downUntil > now || now - (me.superAt || 0) < 3000) return;
      const Fm = F(room), b = room.ball, s = me.team === "A" ? 1 : -1;
      if (b.holder || !(b.dono === me.id || Math.hypot(b.x - me.pos.x, b.z - me.pos.z) < 1.8) || s * me.pos.x < 0) return;
      me.superAt = now; me.shots++; m.last = [me.id];
      const n = clamp(int(d.n, 2), 2, 5), rival = me.team === "A" ? "B" : "A";
      const def = teamOf(room, rival).find((p) => p.gk && p.sockets.size && p.downUntil <= now && C.inArea(Fm.id, p.team, p.pos.x, p.pos.z));
      const chance = def ? 0.45 : 0.3, alvos = [], salvas = []; // sem goleiro no gol, a trave e o "goleiro linha" ainda pegam algumas
      for (let i = 0; i < n; i++) { alvos.push([q2((Math.random() * 2 - 1) * Fm.goalW * 0.8), q2(0.3 + Math.random() * (Fm.goalH - 0.7))]); salvas.push(Math.random() < chance); }
      const gols = salvas.filter((x) => !x).length;
      m.phase = "super"; m.until = now + Math.round(((n - 1) * 0.13 + 0.55 + 1.1) * 1000); room.superRes = { side: me.team, gols, by: me.id, s };
      nsp.to(room.code).emit("super", { by: me.id, team: me.team, x: q2(me.pos.x), z: q2(me.pos.z), alvos, salvas, gols });
      broadcast(room);
    });

    // Strikers: usar o primeiro item da mão (efeito em quem usa, ou um item que sai andando)
    socket.on("item", () => {
      const { room, me } = ctx(); const m = room && room.match, now = Date.now();
      if (!room || !me || !me.team || room.phase !== "play" || !m || m.phase !== "live" || room.config.estilo !== "strikers" || room.config.mode !== "pes") return;
      if (me.downUntil > now || !me.itens || !me.itens.length) return;
      const k = me.itens.shift(), I = C.ITENS[k];
      if (I.eu) { me[k + "Ate"] = now + I.dura * 1000; nsp.to(room.code).emit("efeito", { id: me.id, tipo: k, ms: I.dura * 1000 }); }
      else { const it = C.lancarItem(k, { x: me.pos.x, z: me.pos.z, facing: me.pos.yaw }, me.team, me.id); if (it) (room.itens ||= []).push(it); }
      broadcast(room);
    });

    // chute: o servidor confere a distância até a bola (com uma folga pela internet) e aplica
    socket.on("kick", (d = {}) => {
      const { room, me } = ctx();
      const m = room && room.match, now = Date.now();
      if (!room || !me || !me.team || room.phase !== "play" || !m || m.phase !== "live" || room.config.mode !== "pes") return;
      if (now - me.lastKick < C.KICK_CD * 800 || me.downUntil > now) return;
      const strk = room.config.estilo === "strikers", passeS = strk && ["curto", "longo", "profundidade"].includes(d.kind);
      const kind = passeS || ["passe", "cavadinha", "lancamento", "cruzamento"].includes(d.kind) ? d.kind : "chute";
      if (![d.power, d.yaw].every(fin)) return;
      const slack = clamp(0.25 + (me.rtt || 0) / 1000 * 6, 0.25, 0.8); // a bola anda enquanto o chute viaja
      // quem estava conduzindo chuta a bola que está vendo no pé (a mesma que o navegador dele vinha mandando)
      if (Array.isArray(d.bola) && d.bola.length === 3 && d.bola.every(fin) && room.ball.dono === me.id && !room.ball.holder) {
        const [bx, by, bz] = d.bola;
        if (by < 0.6 && Math.hypot(bx - room.ball.x, bz - room.ball.z) < 2.5 && Math.hypot(bx - me.pos.x, bz - me.pos.z) < 1.6) Object.assign(room.ball, { x: bx, y: Math.max(F(room).ballR, by), z: bz });
      }
      // passe do Strikers: o navegador planejou (velocidade, altura e quem recebe); aqui só confere os limites e o receptor
      const rec = passeS && typeof d.alvo === "string" && room.players[d.alvo], opt = passeS && fin(d.vel) ? { vel: clamp(d.vel, 3, 34), elev: fin(d.elev) ? clamp(d.elev, 0, 1.1) : 0.02,
        alvo: rec && rec.id !== me.id && rec.team === me.team ? rec.id : null } : null;
      const how = C.kick(room.ball, { ...me.pos, id: me.id }, kind, d.power, d.yaw, slack, opt ? 0 : fin(d.curve) ? d.curve : 0, F(room), opt);
      if (!how) return;
      me.lastKick = now;
      if (how === "mao") me.noCatch = now + 800;
      if (kind === "chute" && how !== "mao") me.shots++;
      touched(room, me.id);
      nsp.to(room.code).emit("kicked", { id: me.id, kind, how, power: d.power });
      if (typeof d.rec === "string" && Bots.trocaNoPasse(room, me, d.rec, nsp)) broadcast(room); // amistoso: passe para um bot, o controle vai junto
    });

    // amistoso: LB/T troca de corpo com um bot do time
    socket.on("trocar", () => {
      const { room, me } = ctx();
      if (!room || !me || !me.team || room.phase !== "play" || !room.match || room.match.phase !== "live") return;
      if (Bots.trocarPedido(room, me, nsp)) broadcast(room);
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  // ping de cada jogador (para a folga do chute e o placar)
  medirPing(nsp, rooms);

  // salas paradas há mais de 6 horas somem; jogo sem ninguém conectado para
  limparSalasParadas(rooms, {
    horas: 6, intervalo: 60000,
    cadaVolta: (r) => { const anyone = r.order.some((id) => r.players[id].sockets.size); if (r.loop && !anyone) { clearInterval(r.loop); r.loop = null; r.phase = "lobby"; r.match = null; } },
    aoApagar: (r) => clearInterval(r.loop),
  });
};
