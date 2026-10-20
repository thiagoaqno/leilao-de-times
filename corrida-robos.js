// Corrida da Galera — os robôs. Rodam no servidor e aprendem com a galera: se alguém já fez uma volta limpa na pista,
// eles copiam a linha e a velocidade dessa volta (a melhor de todas, guardada no banco), ponto a ponto. Sem volta
// gravada, seguem o traçado de corrida calculado (abre antes da curva, corta no ápice) com a velocidade que a curva
// permite. Pegam caixas e usam os itens. Para os navegadores eles são pilotos como os outros: a posição sai pelo
// mesmo evento "ghost" e as voltas contam pelos mesmos setores.
const T = require("./public/corrida/pistas.js");
const Itens = require("./corrida-itens.js");
const { SKINS } = require("./public/pelada/campo.js");

const NOMES = ["Faísca", "Pistão", "Graxa", "Biela", "Vácuo", "Turbo", "Chicane"];
const NIVEIS = { facil: 0.86, medio: 0.95, dificil: 1.0 }; // quanto da velocidade de referência (a volta gravada ou o limite da curva) o robô usa
const STEP = 6;
const rnd = (a, b) => a + Math.random() * (b - a);
const CACHE = new Map();
// O traçado de corrida: um elástico esticado dentro da pista. Começa no meio e, várias vezes, cada ponto vai para o
// meio dos vizinhos (o caminho mais reto possível), sem passar da beira. O resultado abre antes da curva, encosta
// por dentro no ápice e volta a abrir na saída. Devolve o deslocamento lateral de cada ponto (lat) e a curvatura dele.
const LINHAS = new Map();
function tracado(pista) {
  if (LINHAS.has(pista)) return LINHAS.get(pista);
  const t = T.PISTAS[pista], pts = T.pontos(t, STEP), n = pts.length, max = t.width / 2 - 16;
  const lat = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n);
  const pos = () => { for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; } };
  for (const k of [12, 8, 5, 3]) for (let it = 0; it < 60; it++) {
    pos();
    for (let i = 0; i < n; i++) {
      const a = (i - k + n) % n, b = (i + k) % n, mx = (X[a] + X[b]) / 2, my = (Y[a] + Y[b]) / 2;
      const alvo = (mx - pts[i].x) * -pts[i].ty + (my - pts[i].y) * pts[i].tx;
      lat[i] = Math.max(-max, Math.min(max, lat[i] + (alvo - lat[i]) * 0.5));
    }
  }
  pos();
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) { // curvatura do traçado: quanto a direção vira por unidade andada
    const a = (i - 3 + n) % n, b = (i + 3) % n, d1 = Math.atan2(Y[i] - Y[a], X[i] - X[a]), d2 = Math.atan2(Y[b] - Y[i], X[b] - X[i]);
    k[i] = Math.abs(Math.atan2(Math.sin(d2 - d1), Math.cos(d2 - d1))) / Math.max(1, Math.hypot(X[b] - X[a], Y[b] - Y[a]) / 2);
  }
  const out = { pts, n, lat, k, X, Y }; LINHAS.set(pista, out); return out;
}
// ---------- aprender com a volta de alguém ----------
// A volta gravada (amostras [tempo ms, x, y, z, ângulo, progresso] a cada 0,1 s) vira, para cada ponto da pista, o
// lado em que o carro passou (lat) e a velocidade dele, em fração da velocidade final daquele carro (para valer para
// qualquer um dos cinco). Pontos sem amostra são preenchidos pelos vizinhos, e tudo é suavizado.
const APRENDIDO = new Map(); // pista -> { lat, vel, tempo, piloto } ou null
let fonte = () => null; // de onde vem a melhor volta guardada (o servidor liga no banco)
function usarFonte(f) { fonte = f; APRENDIDO.clear(); CACHE.clear(); }
function processar(pista, volta) {
  const t = T.PISTAS[pista], linha = tracado(pista), pts = linha.pts, n = pts.length, s = volta && volta.s;
  const vmax = (T.CARROS[volta && volta.carro] || T.CARROS.equilibrado).vmax;
  if (!Array.isArray(s) || s.length < 100) return null;
  const somaL = new Float64Array(n), somaV = new Float64Array(n), cont = new Uint16Array(n);
  for (let k = 0; k + 1 < s.length; k++) {
    const a = s[k], b = s[k + 1], dt = (b[0] - a[0]) / 1000; if (!(dt > 0.02 && dt < 0.5)) continue;
    const i = ((Math.round(a[5]) % n) + n) % n, p = pts[i];
    const lat = (a[1] - p.x) * -p.ty + (a[2] - p.y) * p.tx, v = Math.hypot(b[1] - a[1], b[2] - a[2]) / dt;
    if (Math.abs(lat) > t.width / 2 + 30 || v > vmax * 1.6) continue; // fora da pista ou pulo de posição: não serve
    // acima da velocidade final era vácuo, estilingue ou turbo de quem gravou: o robô não tem isso, então conta só o topo
    somaL[i] += lat; somaV[i] += Math.min(1, v / vmax); cont[i]++;
  }
  const tem = cont.reduce((q, c) => q + (c ? 1 : 0), 0); if (tem < n * 0.12) return null; // volta incompleta
  const lat = new Float64Array(n), vel = new Float64Array(n);
  for (let i = 0; i < n; i++) if (cont[i]) { lat[i] = somaL[i] / cont[i]; vel[i] = somaV[i] / cont[i]; }
  for (let i = 0; i < n; i++) if (!cont[i]) { // preenche o buraco pelo ponto com amostra mais perto de cada lado
    let a = i, b = i; while (!cont[(a - 1 + n) % n] && a - i > -n) a--; while (!cont[(b + 1) % n] && b - i < n) b++;
    const ia = (a - 1 + n) % n, ib = (b + 1) % n, f = (i - a + 1) / (b - a + 2);
    lat[i] = lat[ia] + (lat[ib] - lat[ia]) * f; vel[i] = vel[ia] + (vel[ib] - vel[ia]) * f;
  }
  const suave = (arr, r) => { const out = new Float64Array(n); for (let i = 0; i < n; i++) { let q = 0; for (let k = -r; k <= r; k++) q += arr[(i + k + n) % n]; out[i] = q / (2 * r + 1); } return out; };
  return { lat: suave(lat, 4), vel: suave(vel, 3), tempo: volta.tempo, piloto: volta.piloto };
}
function aprendido(pista) {
  if (!APRENDIDO.has(pista)) { let v = null; try { v = processar(pista, fonte(pista)); } catch (e) { v = null; } APRENDIDO.set(pista, v); }
  return APRENDIDO.get(pista);
}
// volta nova mais rápida que a guardada: os robôs passam a usá-la já na próxima largada
function aprender(pista, volta) {
  const v = processar(pista, volta); if (!v) return false;
  APRENDIDO.set(pista, v); for (const k of [...CACHE.keys()]) if (k.startsWith(pista + ":")) CACHE.delete(k);
  return true;
}
// a pista amostrada, a linha e a velocidade de referência em cada ponto, para um carro
function perfil(pista, carro) {
  const chave = pista + ":" + carro; if (CACHE.has(chave)) return CACHE.get(chave);
  const t = T.PISTAS[pista], c = T.CARROS[carro], linha = tracado(pista), pts = linha.pts, n = pts.length, ap = aprendido(pista);
  let lim, lat;
  if (ap) { lim = Array.from(ap.vel, (v) => Math.max(40, v * c.vmax)); lat = ap.lat; } // a velocidade de quem gravou, na escala deste carro
  else {
    lim = Array.from(linha.k, (k) => (k > 1e-4 ? Math.min(c.turn / k * 1.1, Math.sqrt(c.grip / k) * 1.2, c.vmax) : c.vmax));
    for (let volta = 0; volta < 2; volta++) for (let i = n - 1; i >= 0; i--) lim[i] = Math.min(lim[i], Math.sqrt(lim[(i + 1) % n] ** 2 + 2 * c.brake * 0.85 * STEP)); // freia tarde
    lat = linha.lat;
  }
  const out = { pts, n, lim, lat, t, c, linha, aprendeu: !!ap }; CACHE.set(chave, out); return out;
}
function largada(pts, g, W) { // o mesmo lugar do grid do navegador (gridSpot, em pista.js)
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * 13 + n) % n;
  return { idx, lat: (g % 2 ? 1 : -1) * W * 0.22 };
}

// troca os robôs da sala pelos novos (chamado na largada); devolve os ids
function preparar(room, COLORS, rid) {
  remover(room);
  const livres = 8 - room.order.length, n = Math.max(0, Math.min(livres, room.config.robos || 0)), carros = Object.keys(T.CARROS), skins = Object.keys(SKINS);
  for (let k = 0; k < n; k++) {
    const usadas = new Set(Object.values(room.players).map((p) => p.color)), id = "r" + rid(5);
    room.players[id] = { id, name: NOMES[k % NOMES.length], bot: true, token: null, pawn: "🤖", color: COLORS.find((c) => !usadas.has(c)) || COLORS[k % COLORS.length], skin: skins[(Math.random() * skins.length) | 0], car: carros[(Math.random() * carros.length) | 0], mods: { ...T.MODS_PADRAO }, grid: 0, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, sockets: new Set() };
    room.order.push(id);
  }
}
function remover(room) {
  for (const id of room.order) if (room.players[id] && room.players[id].bot) delete room.players[id];
  room.order = room.order.filter((id) => room.players[id]);
}
// depois do grid sorteado: cada robô no seu lugar, parado
function largar(room) {
  const t = T.PISTAS[room.config.pista];
  for (const id of room.order) {
    const p = room.players[id]; if (!p.bot) continue;
    const pf = perfil(room.config.pista, p.car), g = largada(pf.pts, p.grid, t.width);
    p.pos = null; // a posição da corrida passada não vale (o bico seria calculado a partir dela)
    // na largada: sai na própria faixa do grid, com um tempo de reação diferente, e cada um tem o seu jeito de fazer as curvas
    p.ia = { s: g.idx, s0: g.idx, lat: g.lat, lat0: g.lat, desvio: 0, v: 0, nivel: (NIVEIS[room.config.nivel] || NIVEIS.medio) * rnd(0.97, 1.02), jeito: rnd(-11, 11), reacao: rnd(0, 450), usaEm: 0 };
    posicionar(p, pf, 0);
  }
}
function posicionar(p, pf, laps) {
  const { pts, n } = pf, i = Math.floor(p.ia.s) % n, j = (i + 1) % n, f = p.ia.s - Math.floor(p.ia.s), a = pts[i], b = pts[j];
  const x = a.x + (b.x - a.x) * f - a.ty * p.ia.lat, y = a.y + (b.y - a.y) * f + a.tx * p.ia.lat, z = a.h + (b.h - a.h) * f;
  const prog = p.started ? laps * n + i : i - n;
  // o bico aponta para onde o carro está andando de verdade (sem isso, trocando de lado ele parecia derrapar)
  const ant = p.pos, mov = ant ? Math.hypot(x - ant.x, y - ant.y) : 0;
  let dir = mov > 0.4 ? Math.atan2(y - ant.y, x - ant.x) : ant ? ant.a : Math.atan2(a.ty, a.tx);
  if (ant && mov > 0.4) { const d = Math.atan2(Math.sin(dir - ant.a), Math.cos(dir - ant.a)); dir = ant.a + d * 0.6; } // suaviza
  p.pos = { x, y, z, a: dir, v: p.ia.v, prog, at: Date.now() };
  return i;
}
// um passo (dt em segundos). setor(p, s) é o mesmo onSector dos humanos; emit manda eventos para a sala
function passo(room, dt, setor, emit) {
  const now = Date.now(), corrida = room.phase === "race" && now >= room.startAt, t = T.PISTAS[room.config.pista];
  const humanos = room.order.map((id) => room.players[id]).filter((q) => !q.bot && q.pos);
  const lider = humanos.length ? Math.max(...humanos.map((q) => q.pos.prog)) : null;
  for (const id of room.order) {
    const p = room.players[id]; if (!p.bot || !p.ia) continue;
    const pf = perfil(room.config.pista, p.car), ia = p.ia, c = pf.c;
    if (corrida && p.finish == null && now >= room.startAt + ia.reacao) {
      // elástico: quem dispara na frente dos humanos alivia; quem fica muito para trás aperta um pouco
      let el = 1; if (lider != null && p.pos) { const dif = (p.pos.prog - lider) / pf.n; el = dif > 0.08 ? 0.93 : dif < -0.25 ? 1.05 : 1; }
      const i = Math.floor(ia.s) % pf.n;
      let alvo = Math.min(pf.lim[i], pf.lim[(i + 3) % pf.n]) * ia.nivel * el * (1 - Math.min(1, Math.abs(ia.desvio) / 40) * 0.06);
      alvo = Math.min(alvo, c.vmax); // nunca passa da velocidade final do carro (a mesma de quem joga)
      if (p.boostUntil > now) alvo *= 1.18; if (p.starUntil > now) alvo *= 1.12;
      if (p.spinUntil > now) ia.v *= Math.exp(-dt * 2.2);
      else if (ia.v < alvo) ia.v = Math.min(alvo, ia.v + c.acc * (1 - 0.8 * Math.pow(Math.max(0, ia.v) / c.vmax, 1.6)) * dt); // a mesma arrancada do carro de quem joga (fisica.js)
      else ia.v = Math.max(alvo, ia.v - c.brake * dt);
      ia.s = (ia.s + (ia.v * dt) / STEP) % pf.n;
      // segue o traçado de corrida; se tem outro robô logo à frente na mesma linha, desvia para o lado para passar
      let desvio = 0;
      for (const oid of room.order) { const o = room.players[oid]; if (o === p || !o.bot || !o.ia) continue;
        const ds = (o.ia.s - ia.s + pf.n) % pf.n; if (ds > 0 && ds < 9 && Math.abs(o.ia.lat - ia.lat) < 26) desvio = (o.ia.lat > pf.lat[i] ? -1 : 1) * 34; }
      // depois da largada (~600 de reta), sai da faixa do grid e vai aos poucos para o traçado; antes disso, não desvia de ninguém
      const saida = Math.min(1, ((ia.s - ia.s0 + pf.n) % pf.n) / 100), largando = saida < 1;
      if (largando) desvio = 0;
      ia.desvio += (desvio - ia.desvio) * Math.min(1, dt * 1.5);
      const linha = pf.lat[(i + 2) % pf.n] + ia.jeito, alvoLat = largando ? ia.lat0 * (1 - saida) + linha * saida : linha + ia.desvio;
      const max = t.width / 2 - 10, quer = Math.max(-max, Math.min(max, alvoLat));
      ia.lat += (quer - ia.lat) * Math.min(1, dt * 4);
    }
    const i = posicionar(p, pf, p.laps);
    // setores: o mesmo caminho dos humanos (a volta só conta passando pelos 4, na ordem)
    const sec = Math.floor(i / (pf.n / T.SECTORS));
    if (sec === (p.sector + 1) % T.SECTORS) setor(p, sec);
    // itens: pega a caixa em que passou por cima e usa depois de um tempinho
    if (room.config.caixas && corrida && p.finish == null) {
      if (!p.item) room.itemBoxes.forEach((b, k) => { if (Math.hypot(b.x - p.pos.x, b.y - p.pos.y) < 30) Itens.pick(room, p, k, emit); });
      else if (p.rolling <= now) { if (!ia.usaEm) ia.usaEm = now + rnd(1500, 6000); if (now > ia.usaEm) { ia.usaEm = 0; Itens.use(room, p, false, emit); } }
    }
  }
}
module.exports = { preparar, remover, largar, passo, NIVEIS, aprender, usarFonte, aprendido };
