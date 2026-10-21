// Corrida da Galera — os robôs. Rodam no servidor e aprendem com a galera: se alguém já fez uma volta limpa na pista,
// eles usam até cinco linhas humanas diferentes, com velocidade limitada e margem para ultrapassagem. Sem volta
// gravada, seguem o traçado de corrida calculado (abre antes da curva, corta no ápice) com a velocidade que a curva
// permite. Pegam caixas e usam os itens. Para os navegadores eles são pilotos como os outros: a posição sai pelo
// mesmo evento "ghost" e as voltas contam pelos mesmos setores.
const T = require("./public/corrida/pistas.js");
const Itens = require("./corrida-itens.js");
const { SKINS } = require("./public/pelada/campo.js");

const NOMES = ["Faísca", "Pistão", "Graxa", "Biela", "Vácuo", "Turbo", "Chicane"];
const NIVEIS = { facil: 0.80, medio: 0.87, dificil: 0.93 }; // sem ninguém com volta na pista: fração da velocidade do traçado
// Com voltas guardadas: o tempo de volta que o robô mira, em relação ao ritmo de quem joga (a média das cinco
// melhores voltas de cada um). No médio, um pouco mais lento que essa média; no difícil, um pouco mais rápido.
const RITMO = { facil: 1.12, medio: 1.03, dificil: 0.98 };
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
const APRENDIDO = new Map(); // pista -> até cinco perfis humanos válidos
let fonte = () => []; // de onde vêm até cinco voltas guardadas (o servidor liga no banco)
let fonteRitmo = () => null; // o ritmo de quem joga: (pista, nomes da sala ou null) -> { tempo } (bd.ritmoCorrida)
function usarFonte(f, ritmo = () => null) { fonte = f; fonteRitmo = ritmo; APRENDIDO.clear(); CACHE.clear(); }
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
  if (!APRENDIDO.has(pista)) { let v = []; try { const voltas = fonte(pista); v = (Array.isArray(voltas) ? voltas : [voltas]).map((volta) => processar(pista, volta)).filter(Boolean).slice(0, 5); } catch (e) { v = []; } APRENDIDO.set(pista, v); }
  return APRENDIDO.get(pista);
}
// Uma das cinco melhores voltas mudou: recarrega os perfis para a próxima largada.
function aprender(pista, volta) {
  const v = (Array.isArray(volta) ? volta : [volta]).map((item) => processar(pista, item)).filter(Boolean).slice(0, 5); if (!v.length) return false;
  APRENDIDO.set(pista, v); for (const k of [...CACHE.keys()]) if (k.startsWith(pista + ":")) CACHE.delete(k);
  return true;
}
// a pista amostrada, a linha e a velocidade de referência em cada ponto, para um carro
function perfil(pista, carro, tracadoId = 0) {
  const chave = pista + ":" + carro + ":" + tracadoId; if (CACHE.has(chave)) return CACHE.get(chave);
  const t = T.PISTAS[pista], c = T.CARROS[carro], linha = tracado(pista), pts = linha.pts, n = pts.length, perfis = aprendido(pista), ap = perfis[tracadoId % perfis.length];
  let lim, lat;
  const curva = Array.from(linha.k, (k) => (k > 1e-4 ? Math.min(c.turn / k * 1.1, Math.sqrt(c.grip / k) * 1.2, c.vmax) : c.vmax));
  for (let volta = 0; volta < 2; volta++) for (let i = n - 1; i >= 0; i--) curva[i] = Math.min(curva[i], Math.sqrt(curva[(i + 1) % n] ** 2 + 2 * c.brake * 0.72 * STEP));
  if (ap) { lim = Array.from(ap.vel, (v, i) => Math.min(curva[i], Math.max(40, v * c.vmax))); lat = ap.lat; }
  else {
    lim = curva;
    lat = linha.lat;
  }
  const out = { pts, n, lim, lat, t, c, linha, aprendeu: !!ap }; CACHE.set(chave, out); return out;
}
// O tempo de uma volta lançada andando no limite do perfil vezes `escala`, com a arrancada do carro (a mesma conta do
// passo, sem tráfego). Serve para achar a escala que fecha a volta no tempo que o robô mira.
function tempoDaVolta(pf, escala) {
  const { lim, n, c } = pf;
  let v = 0, t = 0;
  for (let volta = 0; volta < 2; volta++) {
    t = 0;
    for (let i = 0; i < n; i++) {
      const teto = Math.min(c.vmax, Math.min(lim[i], lim[(i + 3) % n]) * escala);
      v = Math.min(teto, Math.sqrt(v * v + 2 * c.acc * (1 - 0.8 * Math.pow(Math.max(0, v) / c.vmax, 1.6)) * STEP));
      t += STEP / Math.max(v, 1);
    }
  }
  return t;
}
function escalaPara(pf, alvo) {
  let lo = 0.4, hi = 1.6;
  if (tempoDaVolta(pf, hi) > alvo) return hi; // nem no máximo chega: vai no máximo
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (tempoDaVolta(pf, m) > alvo) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// O ritmo da largada: o de quem está na sala; sem volta deles nesta pista, o de todo mundo que já correu nela.
function ritmoDaSala(room) {
  const nomes = room.order.map((id) => room.players[id]).filter((p) => p && !p.bot).map((p) => p.name);
  try { return (nomes.length && fonteRitmo(room.config.pista, nomes)) || fonteRitmo(room.config.pista, null) || null; } catch (e) { return null; }
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
  const t = T.PISTAS[room.config.pista], bots = room.order.filter((id) => room.players[id].bot), ritmo = ritmoDaSala(room);
  room.ritmoRobos = ritmo ? ritmo.tempo * (RITMO[room.config.nivel] || RITMO.medio) : null;
  for (const id of room.order) {
    const p = room.players[id]; if (!p.bot) continue;
    const tracadoId = bots.indexOf(id), pf = perfil(room.config.pista, p.car, tracadoId), g = largada(pf.pts, p.grid, t.width);
    // Todos miram o mesmo ritmo (com uns 3% de diferença entre o mais rápido e o mais lento), seja qual for o traçado
    // que copiam. Sem volta de ninguém na pista, andam numa fração do limite do traçado.
    const espalha = bots.length > 1 ? (tracadoId / (bots.length - 1) - 0.5) * 0.03 : 0;
    const nivel = ritmo ? escalaPara(pf, room.ritmoRobos * (1 + espalha)) : (NIVEIS[room.config.nivel] || NIVEIS.medio) * rnd(0.98, 1.02);
    p.pos = null; // a posição da corrida passada não vale (o bico seria calculado a partir dela)
    // na largada: sai na própria faixa do grid, com um tempo de reação diferente, e cada um tem o seu jeito de fazer as curvas
    p.ia = { s: g.idx, s0: g.idx, lat: g.lat, lat0: g.lat, desvio: 0, v: 0, nivel, jeito: rnd(-7, 7), tracadoId, reacao: rnd(0, 450), usaEm: 0 };
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
    const ia = p.ia, pf = perfil(room.config.pista, p.car, ia.tracadoId), c = pf.c;
    if (corrida && p.finish == null && now >= room.startAt + ia.reacao) {
      // Corre pelo próprio ritmo; a posição do humano não dá aceleração extra ao bot.
      let el = 1; if (lider != null && p.pos && (p.pos.prog - lider) / pf.n > 0.08) el = 0.97;
      const i = Math.floor(ia.s) % pf.n;
      let alvo = Math.min(pf.lim[i], pf.lim[(i + 3) % pf.n]) * ia.nivel * el * (1 - Math.min(1, Math.abs(ia.desvio) / 40) * 0.06);
      const baseLat = pf.lat[(i + 2) % pf.n] + ia.jeito + Math.sin(ia.s / 105 + ia.tracadoId * 1.7) * 4;
      const maxLat = t.width / 2 - 10, ponto = pf.pts[i];
      let desvio = 0, freioTrafego = Infinity, encontrou = false;
      for (const oid of room.order) {
        const o = room.players[oid]; if (o === p || !o.pos || Math.abs((o.pos.z || 0) - ponto.h) > 15) continue;
        const dx = o.pos.x - p.pos.x, dy = o.pos.y - p.pos.y;
        const frente = dx * ponto.tx + dy * ponto.ty, lado = dx * -ponto.ty + dy * ponto.tx;
        if (frente < -40 || frente > 185 || Math.abs(lado) > 65) continue;
        const latOutro = (o.pos.x - ponto.x) * -ponto.ty + (o.pos.y - ponto.y) * ponto.tx;
        if (Math.abs(latOutro - ia.lat) > 34) continue;
        encontrou = true;
        const esquerda = latOutro - 30, direita = latOutro + 30;
        const cabeEsquerda = esquerda >= -maxLat, cabeDireita = direita <= maxLat;
        if (!ia.passSide || (ia.passSide < 0 && !cabeEsquerda) || (ia.passSide > 0 && !cabeDireita))
          ia.passSide = cabeEsquerda && (!cabeDireita || Math.abs(esquerda - baseLat) < Math.abs(direita - baseLat)) ? -1 : cabeDireita ? 1 : 0;
        const alvoPassagem = ia.passSide < 0 ? esquerda : direita;
        if (ia.passSide) desvio = alvoPassagem - baseLat;
        const faltaEspaco = !ia.passSide || Math.abs(ia.lat - latOutro) < 25;
        if (frente > 0 && frente < 115 && faltaEspaco) freioTrafego = Math.min(freioTrafego, Math.max(35, (o.pos.v || 0) * 0.94));
      }
      if (!encontrou) ia.passSide = 0;
      alvo = Math.min(alvo, freioTrafego);
      alvo = Math.min(alvo, c.vmax); // nunca passa da velocidade final do carro (a mesma de quem joga)
      // turbo e estrela: as mesmas contas do carro de quem joga (fisica.js): mais velocidade final e mais força para chegar nela
      const turbo = p.boostUntil > now, estrela = p.starUntil > now, bk = 1 + (turbo ? 0.18 : 0) + (estrela ? 0.12 : 0), ak = 1 + (turbo ? 0.8 : 0) + (estrela ? 0.4 : 0);
      alvo += c.vmax * (bk - 1); // o item mantém sua força mesmo com o ritmo base mais acessível
      if (p.spinUntil > now) ia.v *= Math.exp(-dt * 2.2);
      else if (ia.v < alvo) ia.v = Math.min(alvo, ia.v + c.acc * ak * (1 - 0.8 * Math.pow(Math.max(0, ia.v) / (c.vmax * bk), 1.6)) * dt); // a mesma arrancada do carro de quem joga
      else ia.v = Math.max(alvo, ia.v - (ia.v > c.vmax && alvo >= c.vmax * 0.98 ? T.TURBO_SOLTA : c.brake) * dt); // fim do turbo na reta: solta aos poucos, como quem joga
      ia.s = (ia.s + (ia.v * dt) / STEP) % pf.n;
      // depois da largada (~600 de reta), sai da faixa do grid e vai aos poucos para o traçado; antes disso, não desvia de ninguém
      const saida = Math.min(1, ((ia.s - ia.s0 + pf.n) % pf.n) / 100), largando = saida < 1;
      ia.desvio += (desvio - ia.desvio) * Math.min(1, dt * 2.2);
      const alvoLat = largando ? ia.lat0 * (1 - saida) + (baseLat + ia.desvio) * saida : baseLat + ia.desvio;
      const quer = Math.max(-maxLat, Math.min(maxLat, alvoLat));
      ia.lat += Math.max(-42 * dt, Math.min(42 * dt, quer - ia.lat));
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
module.exports = { preparar, remover, largar, passo, NIVEIS, RITMO, aprender, usarFonte, aprendido, tempoDaVolta, perfil };
