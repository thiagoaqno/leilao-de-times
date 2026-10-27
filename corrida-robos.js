// Corrida da Galera — os robôs. Rodam no servidor e aprendem com a galera: se alguém já fez uma volta limpa na pista,
// eles usam até cinco linhas humanas diferentes, com velocidade limitada e margem para ultrapassagem. Sem volta
// gravada, seguem o traçado de corrida calculado (abre antes da curva, corta no ápice) com a velocidade que a curva
// permite. Pegam caixas e usam os itens. Para os navegadores eles são pilotos como os outros: a posição sai pelo
// mesmo evento "ghost" e as voltas contam pelos mesmos setores.
const T = require("./public/corrida/pistas.js");
const Itens = require("./corrida-itens.js");
const F1 = require("./public/corrida/f1-regras.js"); // os pneus das regras de F1
const F1Equipes = require("./public/corrida/f1-equipes.js"); // a montagem do carro de cada equipe
const D = require("./public/corrida/dinamica.js");
const Sim = require("./public/corrida/sim.js");
const Pilotos = require("./public/corrida/f1-pilotos-2026.js"); // as equipes e os pilotos reais de 2026 (os robôs das regras de F1)
const { SKINS } = require("./public/pelada/campo.js");

const NOMES = ["Faísca", "Pistão", "Graxa", "Biela", "Vácuo", "Turbo", "Chicane"];
const NIVEIS = { facil: 0.80, medio: 0.87, dificil: 0.93 }; // modo clássico: fração da velocidade do traçado
// Com voltas guardadas: o tempo de volta que o robô mira, em relação ao ritmo de quem joga (a média das cinco
// melhores voltas de cada um). No médio, um pouco mais lento que essa média; no difícil, um pouco mais rápido.
const RITMO = { facil: 1.12, medio: 1.03, dificil: 0.98 };
const STEP = 6;
// O robô de F1 segue a linha de corrida (o elástico de `tracado`) por inteiro, menos uma folga: o suficiente para abrir as curvas e
// encostar nos ápices sem raspar no zebra. A velocidade que ele mira sai da curvatura DESSE caminho (`curvaturaDoCaminho`), não da do
// elástico cru, que tinha quinas de raio quase zero.
const FATOR_LINHA = 0.8;
// o menor raio (u) que o robô considera numa curva: o carro não fecha mais que isso, e uma quina de raio quase zero no traçado (um
// ponto fora do lugar) fazia o perfil de velocidade despencar para 1 u/s no meio de uma reta
const RAIO_MIN = 22;
// a fração do limite de aderência (a velocidade de curva) que o piloto ideal usa; o nível do robô desce a partir daqui
const MARGEM_F1 = 0.95;
const MARGEM_FREIO = 0.8; // e a fração da frenagem máxima que ele usa
const TRAVA_ABS = 0.25; // quanto a roda pode travar na frenagem antes do robô soltar o freio
const ALFA_FRENTE = 0.10, K_FRENTE = 8; // o pico do pneu é 0,11 rad
const V_PRESO = 8, T_PRESO = 2.5, T_SEM_ANDAR = 10; // u/s, s e pontos de pista (6 u cada): quando o robô se considera preso
const ALFA_TRACAO = 0.11, PAT = 0.3; // o ângulo de deriva da traseira (rad; o pico do pneu é 0,11) a partir do qual o robô tira o pé do acelerador
const GRID_F1 = 20; // as regras de F1: o grid tem 20 carros (humanos e robôs)
const ENCOLHIDO = 0.72, BALA = 1.45; // o raio deixa o carro com 72% da velocidade final; a bala anda a 145% (iguais em fisica.js)
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
  const k = new Float64Array(n), sinal = new Float64Array(n); // sinal: +1 se a curva vai para o lado de lat positivo, -1 para o outro
  for (let i = 0; i < n; i++) { // curvatura do traçado: quanto a direção vira por unidade andada
    const a = (i - 3 + n) % n, b = (i + 3) % n, d1 = Math.atan2(Y[i] - Y[a], X[i] - X[a]), d2 = Math.atan2(Y[b] - Y[i], X[b] - X[i]);
    k[i] = Math.abs(Math.atan2(Math.sin(d2 - d1), Math.cos(d2 - d1))) / Math.max(1, Math.hypot(X[b] - X[a], Y[b] - Y[a]) / 2);
    sinal[i] = Math.sin(d2 - d1) >= 0 ? 1 : -1;
  }
  const out = { pts, n, lat, k, sinal, X, Y }; LINHAS.set(pista, out); return out;
}
// A curvatura do caminho que o robô de F1 faz (a pista mais `lat` de lado em cada ponto): o círculo por três pontos, a `m` pontos de cada
// lado, depois a média de uma janelinha, e nunca mais que 1/RAIO_MIN. Sem as quinas que o ruído do traçado cru deixava.
function curvaturaDoCaminho(pts, lat, m = 4) {
  const n = pts.length, X = new Float64Array(n), Y = new Float64Array(n), cru = new Float64Array(n), k = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; }
  for (let i = 0; i < n; i++) {
    const a = (i - m + n) % n, b = (i + m) % n, cruz = (X[i] - X[a]) * (Y[b] - Y[i]) - (Y[i] - Y[a]) * (X[b] - X[i]);
    const da = Math.hypot(X[i] - X[a], Y[i] - Y[a]), db = Math.hypot(X[b] - X[i], Y[b] - Y[i]), dc = Math.hypot(X[b] - X[a], Y[b] - Y[a]);
    cru[i] = da * db * dc > 1e-6 ? (2 * Math.abs(cruz)) / (da * db * dc) : 0;
  }
  for (let i = 0; i < n; i++) { let q = 0; for (let j = -2; j <= 2; j++) q += cru[(i + j + n) % n]; k[i] = Math.min(1 / RAIO_MIN, q / 5); }
  return k;
}
// ---------- aprender com a volta de alguém ----------
// A volta gravada (amostras [tempo ms, x, y, z, ângulo, progresso] a cada 0,1 s) vira, para cada ponto da pista, o
// lado em que o carro passou (lat) e a velocidade dele, em fração da velocidade final daquele carro (para valer para
// qualquer um dos cinco). Pontos sem amostra são preenchidos pelos vizinhos, e tudo é suavizado.
const APRENDIDO = new Map(); // pista -> até cinco perfis humanos válidos
let fonte = () => []; // de onde vêm até cinco voltas guardadas (o servidor liga no banco)
let fonteRitmo = () => null; // o ritmo de quem joga: (pista, nomes da sala ou null) -> { tempo } (bd.ritmoCorrida)
let fonteRecorde = () => null;
function usarFonte(f, ritmo = () => null, recorde = () => null) { fonte = f; fonteRitmo = ritmo; fonteRecorde = recorde; APRENDIDO.clear(); CACHE.clear(); }
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
function perfil(pista, carro, tracadoId = 0) { // `carro`: o nome de um dos cinco carros ou um `spec` (a montagem de uma equipe de F1, com `chave`)
  const chave = pista + ":" + (carro.chave ? "spec-" + carro.chave : carro) + ":" + tracadoId; if (CACHE.has(chave)) return CACHE.get(chave);
  const t = T.PISTAS[pista], c = carro.chave ? carro : T.CARROS[carro], linha = tracado(pista), pts = linha.pts, n = pts.length, perfis = aprendido(pista), ap = perfis[tracadoId % perfis.length];
  let lim, lat;
  const curva = Array.from(linha.k, (k) => (k > 1e-4 ? Math.min(c.turn / k * 1.1, Math.sqrt(c.grip / k) * 1.2, c.vmax) : c.vmax));
  for (let volta = 0; volta < 2; volta++) for (let i = n - 1; i >= 0; i--) curva[i] = Math.min(curva[i], Math.sqrt(curva[(i + 1) % n] ** 2 + 2 * c.brake * 0.72 * STEP));
  if (ap) { lim = Array.from(ap.vel, (v, i) => Math.min(curva[i], Math.max(40, v * c.vmax))); lat = ap.lat; }
  else {
    lim = curva;
    lat = linha.lat;
  }
  const latF1 = Float64Array.from({ length: n }, (_, i) => lat[(i + 2) % n] * FATOR_LINHA); // o caminho do robô de F1 (passoF1 usa a mesma conta)
  const out = { pts, n, lim, lat, t, c, linha, aprendeu: !!ap, corredor: F1.corredor(t, n, t.width), kf: curvaturaDoCaminho(pts, latF1) }; CACHE.set(chave, out); return out; // corredor: o dos boxes, se a pista tem
}
// O tempo de uma volta lançada andando no limite do perfil vezes `escala`, com a arrancada do carro (a mesma conta do
// passo, sem tráfego). Serve para achar a escala que fecha a volta no tempo que o robô mira.
// `ader` (opcional, regras de F1): a aderência do pneu (F1.aderencia), aplicada como no passo: nas curvas a velocidade vai
// com a raiz do grip, a velocidade final com `final` e a arrancada com `tracao`.
function tempoDaVolta(pf, escala, ader) {
  if (pf.c.chave) { // classificação e ritmo da F1: o mesmo perfil de velocidade dos carros em movimento (tabela por nível, interpolada)
    const tab = tabelaF1(pf, ader), f = Math.min(1, Math.max(0.3, escala));
    let j = 1; while (j < NIVEIS_F1.length - 1 && f > NIVEIS_F1[j]) j++;
    const u = (f - NIVEIS_F1[j - 1]) / (NIVEIS_F1[j] - NIVEIS_F1[j - 1]);
    return tab[j - 1] + (tab[j] - tab[j - 1]) * u;
  }
  const { lim, n, c } = pf, raiz = ader ? Math.sqrt(ader.grip) : 1;
  let v = 0, t = 0;
  for (let volta = 0; volta < 2; volta++) {
    t = 0;
    for (let i = 0; i < n; i++) {
      const teto = Math.min(c.vmax * (ader ? ader.final : 1), Math.min(lim[i], lim[(i + 3) % n]) * escala * (ader && lim[i] < c.vmax * 0.97 ? raiz : 1));
      v = Math.min(teto, Math.sqrt(v * v + 2 * c.acc * (ader ? ader.tracao : 1) * (1 - 0.8 * Math.pow(Math.max(0, v) / c.vmax, 1.6)) * STEP));
      t += STEP / Math.max(v, 1);
    }
  }
  return t;
}
// ---------- o perfil de velocidade do robô de F1 ----------
// O nível `f` (0,4 a 1) do robô é a fração da margem do piloto ideal (MARGEM_F1) que ele usa nas curvas: 1 é o limite, abaixo disso
// ele faz as curvas mais devagar e freia mais cedo. Nas retas ninguém tira o pé por nível: só a curva e a frenagem custam tempo.
const NIVEIS_F1 = [0.3, 0.5, 0.65, 0.8, 0.9, 1];
function topoDe(pf) { return pf.topo || (pf.topo = D.velocidadeFinal(pf.c)); }
function perfilF1(pf, f) {
  const q = Math.round(Math.min(1, Math.max(0.3, f)) * 100) / 100, mapa = pf.perfisF1 || (pf.perfisF1 = new Map());
  let v = mapa.get(q);
  if (!v) {
    v = D.perfilIdeal(pf.pts.map((p, i) => ({ k: pf.kf[i], h: p.h })), pf.c, STEP, MARGEM_F1 * q, null, MARGEM_FREIO);
    if (mapa.size >= 30) mapa.delete(mapa.keys().next().value);
    mapa.set(q, v);
  }
  return v;
}
// O tempo de uma volta lançada andando no perfil do nível `f`, com a arrancada do carro (sem tráfego), com a aderência `ader` do pneu.
function voltaDoPerfil(pf, f, ader) {
  const fis = perfilF1(pf, f), ext = ader ? { grip: ader.grip, tracao: ader.tracao } : null, raiz = ader ? Math.sqrt(ader.grip) : 1;
  const topo = topoDe(pf), teto0 = topo * (ader ? ader.final : 1);
  let v = 0, t = 0;
  for (let volta = 0; volta < 2; volta++) {
    t = 0;
    for (let i = 0; i < pf.n; i++) {
      const teto = Math.min(teto0, fis[i] < topo * 0.97 ? fis[i] * raiz : fis[i]);
      const a = Math.max(0, D.aceleracaoMaxima(pf.c, v, 0, ext));
      v = Math.min(teto, Math.sqrt(v * v + 2 * a * STEP));
      t += STEP / Math.max(v, 1);
    }
  }
  return t;
}
function tabelaF1(pf, ader) {
  const chave = ader ? ader.grip + "|" + ader.tracao + "|" + ader.final : "-", mapa = pf.tabelas || (pf.tabelas = new Map());
  if (!mapa.has(chave)) mapa.set(chave, NIVEIS_F1.map((f) => voltaDoPerfil(pf, f, ader)));
  return mapa.get(chave);
}
function escalaPara(pf, alvo, ader, teto = 1.6) {
  let lo = 0.4, hi = teto;
  if (tempoDaVolta(pf, hi, ader) > alvo) return hi;
  for (let k = 0; k < (pf.c.chave ? 12 : 24); k++) { const m = (lo + hi) / 2; if (tempoDaVolta(pf, m, ader) > alvo) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// O ritmo da largada: o de quem está na sala; sem volta deles nesta pista, o de todo mundo que já correu nela.
function ritmoDaSala(room) {
  const nomes = room.order.map((id) => room.players[id]).filter((p) => p && !p.bot).map((p) => p.name);
  try { return (nomes.length && fonteRitmo(room.config.pista, nomes)) || fonteRitmo(room.config.pista, null) || null; } catch (e) { return null; }
}
// No GP, o robô mira o tempo de volta do piloto ideal DO CARRO DELE nesta pista (o perfil de velocidade no limite, `tempoDaVolta(pf, 1)`)
// mais uma folga que depende do nível: o fácil fica uns 9% atrás, o médio uns 4,5% (perto de quem joga bem) e o difícil uns 2%. Cada
// piloto soma um pouco mais de acordo com o ritmo dele (até ~1,2%), e o carro fraco continua mais lento que o forte porque o ideal
// dele já é mais lento. Nunca abaixo do limite do carro. Se a galera já fez voltas quase perfeitas, o robô não passa de 2,5% delas.
// A referência do ritmo é o piloto ideal com o pneu neutro. O robô de verdade anda com o pneu de cada momento.
// o pneu de referência do ritmo é o médio novo e quente: o nível é medido contra o piloto ideal com ele, e o pneu de cada
// momento (o macio mais rápido, o duro mais lento, o gasto e o frio) mexe no ritmo de verdade, em passoF1
let ADER_REF = null;
const aderRef = () => ADER_REF || (ADER_REF = F1.aderencia({ composto: "medio", desgaste: 0, temp: 1 }));
function idealDe(pista, spec) { return tempoDaVolta(perfil(pista, spec || F1Equipes.specDaEquipe("mclaren")), 1, aderRef()); }
const FOLGA_F1 = { facil: 0.137, medio: 0.074, dificil: 0.025 };
function referenciaF1(room) {
  const pista = room.config.pista;
  const pf = perfil(pista, F1Equipes.specDaEquipe("mclaren"));
  const ideal = tempoDaVolta(pf, 1, aderRef());
  let recorde = null;
  try { const v = fonteRecorde(pista); if (v && Number.isFinite(v.tempo) && v.tempo >= T.PISTAS[pista].minLap) recorde = v.tempo; } catch (e) { /* banco indisponível: usa o traçado */ }
  return { tempo: ideal * (1 + (FOLGA_F1[room.config.nivel] ?? FOLGA_F1.medio)), ideal, recorde, origem: false, proteger: !!recorde && recorde <= ideal * 1.01 };
}
function alvoF1(room, p, pf) {
  const ref = room.referenciaF1 || referenciaF1(room);
  const folga = FOLGA_F1[room.config.nivel] ?? FOLGA_F1.medio, piloto = p.piloto ? Math.min(0.012, Math.max(0, 96 - p.piloto.ritmo) * 0.0006) : 0.006;
  return Math.max(ref.proteger ? ref.recorde * 1.025 : 0, tempoDaVolta(pf, 1, aderRef()) * (1 + folga + piloto));
}
function largada(pts, g, W, f1) { // o mesmo lugar do grid do navegador (gridSpot, em pista.js); com 20 carros as filas ficam mais juntas
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * (f1 ? 8 : 13) + n * 2) % n;
  return { idx, lat: (g % 2 ? 1 : -1) * W * 0.22 };
}
// O nível de um robô (a escala do limite do traçado, em `ia.nivel`). Na F1, o alvo combina recorde/procedural,
// montagem do carro e ritmo do piloto; no modo clássico, continua seguindo a média das voltas da sala.
function nivelDe(room, p, tracadoId, nBots, pf) {
  if (room.config.regras === "f1") {
    return escalaPara(pf, alvoF1(room, p, pf), aderRef(), 8); // o nível é do piloto; o pneu de cada momento (macio, gasto, frio) mexe no ritmo de verdade, em passoF1
  }
  const pil = p.piloto, ritmo = room.ritmoRobos;
  const sorte = rnd;
  const espalha = pil ? Pilotos.fatorDeRitmo(pil.ritmo) - 1 : nBots > 1 ? (tracadoId / (nBots - 1) - 0.5) * 0.03 : 0;
  return ritmo ? escalaPara(pf, ritmo * (1 + espalha)) : (NIVEIS[room.config.nivel] || NIVEIS.medio) * sorte(0.98, 1.02) * (pil ? 2 - Pilotos.fatorDeRitmo(pil.ritmo) : 1);
}
// o ritmo da sala (o tempo que os robôs miram), guardado em room.ritmoRobos
function ritmoDosRobos(room) {
  if (room.config.regras === "f1") {
    room.referenciaF1 = referenciaF1(room);
    room.ritmoRobos = room.referenciaF1.tempo;
    return room.ritmoRobos;
  }
  const ritmo = ritmoDaSala(room);
  room.ritmoRobos = ritmo ? ritmo.tempo * (RITMO[room.config.nivel] || RITMO.medio) : null;
  return room.ritmoRobos;
}
// Depois da primeira chegada, estima quanto falta ao robô ativo mais distante. Uma margem cobre tráfego e box.
function prazoDeChegada(room, prazoNormal = 45000) {
  if (room.config.regras !== "f1") return prazoNormal;
  const n = perfil(room.config.pista, "equilibrado").n;
  const falta = room.order.map((id) => room.players[id]).filter((p) => p && p.bot && p.finish == null && !p.dnf)
    .map((p) => Math.max(0, room.config.voltas - p.laps - (p.started && p.pos ? ((p.pos.prog % n) + n) % n / n : 0)));
  return Math.min(10 * 60000, Math.max(60000, Math.ceil(Math.max(0, ...falta) * (room.ritmoRobos || 60) * 1.45 * 1000)));
}
// ---------- a classificação (regras de F1) ----------
// A volta lançada de um robô: o tempo da volta no ritmo dele (a mesma conta da corrida, `tempoDaVolta`) com pneu macio novo e
// quente (a mesma aderência do carro de quem joga), mais o ruído da constância do piloto, sorteado pela semente do GP,
// da sessão e do robô (recarregar nada muda). `em` é a hora (fração da sessão) em que o robô cruza a linha.
function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
function voltaLancada(room, p, sessao, tracadoId, nBots) {
  const pf = perfil(room.config.pista, p.spec || p.car, tracadoId), nivel = nivelDe(room, p, tracadoId, nBots, pf);
  const ader = F1.aderencia({ composto: "macio", desgaste: 0.03, temp: 0.8 });
  const r = F1.sorteio(`quali:${room.semente}:${sessao}:${p.id}`), sigma = p.piloto ? Pilotos.ruidoDaVolta(p.piloto.constancia) : 0.012;
  const tempo = tempoDaVolta(pf, nivel, ader) * (1 + Math.max(-2.5, Math.min(2.5, gauss(r))) * sigma);
  const final = room.config.regras === "f1" && (room.referenciaF1 || referenciaF1(room)).proteger
    ? Math.max(tempo, (room.referenciaF1 || referenciaF1(room)).recorde * 1.015) : tempo;
  return { tempo: Math.round(final * 1000) / 1000, em: 0.3 + 0.62 * r() };
}
// quanto dura uma sessão de classificação, em segundos: dá para uma volta de saída e duas lançadas de um carro médio
function duracaoDaClassificacao(pista) {
  const t = tempoDaVolta(perfil(pista, "equilibrado", 0), NIVEIS.medio);
  return Math.max(70, Math.min(210, Math.round(t * 2.2 + 12)));
}

// troca os robôs da sala pelos novos (chamado na largada); devolve os ids
function preparar(room, COLORS, rid) {
  remover(room);
  const f1 = room.config.regras === "f1";
  const livres = (f1 ? GRID_F1 : 8) - room.order.length, n = Math.max(0, Math.min(livres, room.config.robos || 0)), carros = Object.keys(T.CARROS), skins = Object.keys(SKINS);
  const sorteio = f1 ? F1.sorteio(`robos:${room.semente}`) : Math.random;
  // regras de F1: o robô anda com o carro da equipe dele (a montagem do chefe humano, se tem, senão a padrão de f1-equipes.js);
  // quem já tem humano na equipe deixa a vaga dele (cada equipe tem 2 carros)
  const ocupadas = {};
  for (const q of Object.values(room.players)) if (!q.bot && q.equipe) ocupadas[q.equipe] = (ocupadas[q.equipe] || 0) + 1;
  const pilotos = f1 ? (room.pilotosTemporada || Pilotos.escolher(n, room.semente, ocupadas)) : []; // na temporada, o contrato fixa o companheiro
  for (let k = 0; k < n; k++) {
    const usadas = new Set(Object.values(room.players).map((p) => p.color)), id = f1 ? `robo-${k + 1}` : "r" + rid(5), pil = pilotos[k], equipe = pil && Pilotos.EQUIPES[pil.equipe];
    room.players[id] = { id, name: pil ? pil.curto : NOMES[k % NOMES.length], bot: true, token: null, pawn: "🤖", color: equipe ? equipe.cor : COLORS.find((c) => !usadas.has(c)) || COLORS[k % COLORS.length], skin: skins[(sorteio() * skins.length) | 0], car: f1 ? "equilibrado" : carros[(sorteio() * carros.length) | 0], mods: equipe && T.MODS.pintura[equipe.pintura] ? { pintura: equipe.pintura } : { ...T.MODS_PADRAO }, grid: 0, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, best: null, last: null, sockets: new Set(),
      ...(pil ? { piloto: { id: pil.id, ritmo: pil.ritmo, constancia: pil.constancia, largada: pil.largada }, equipe: pil.equipe, numero: pil.numero, sigla: pil.sigla, nomeCompleto: pil.nome, spec: F1Equipes.specDaEquipe(pil.equipe, room.montagens && room.montagens[pil.equipe]) } : {}) };
    room.order.push(id);
  }
}
function remover(room) {
  for (const id of room.order) if (room.players[id] && room.players[id].bot) delete room.players[id];
  room.order = room.order.filter((id) => room.players[id]);
}
// depois do grid sorteado: cada robô no seu lugar, parado
function largar(room) {
  const t = T.PISTAS[room.config.pista], bots = room.order.filter((id) => room.players[id].bot);
  ritmoDosRobos(room);
  for (const id of room.order) {
    const p = room.players[id]; if (!p.bot) continue;
    const tracadoId = bots.indexOf(id), pf = perfil(room.config.pista, p.spec || p.car, tracadoId), g = largada(pf.pts, p.grid, t.width, room.config.regras === "f1");
    const nivel = nivelDe(room, p, tracadoId, bots.length, pf);
    const pil = p.piloto; // regras de F1: o piloto de verdade manda na reação da largada e na regularidade da linha
    p.pos = null; // a posição da corrida passada não vale (o bico seria calculado a partir dela)
    // na largada: sai na própria faixa do grid, com um tempo de reação diferente, e cada um tem o seu jeito de fazer as curvas
    // regras de F1: a estratégia de parada do robô (o composto da largada e as paradas) e o mesmo pneu de quem joga
    const f1 = room.config.regras === "f1", plano = f1 ? F1.estrategia(room.config.voltas, room.config.nivel, `${room.semente}:${id}`, room.config.pista, p.spec ? p.spec.desgaste : 1) : null;
    if (plano) Object.assign(p, { pneu: plano.largada, pneuAtual: plano.largada, compostos: [plano.largada], paradas: [], acrescimo: 0, box: null });
    const rng = F1.sorteio(`estilo:${room.semente}:${id}`); // regras de F1: cada robô tem o seu jeito (sorteado pela semente do GP)
    p.ia = { s: g.idx, s0: g.idx, lat: g.lat, lat0: g.lat, desvio: 0, v: 0, nivel, jeito: pil ? rnd(-1, 1) * (2 + (100 - pil.constancia) * 0.3) : rnd(-7, 7), tracadoId, reacao: pil ? Pilotos.reacaoNaLargada(pil.largada) + rnd(0, 120) : rnd(0, 450), usaEm: 0,
      pneu: f1 ? F1.pneuNovo(p.pneu) : null, ers: f1 ? F1.ersNovo() : null, plano, box: null,
      estilo: f1 ? estiloDe(room, p, rng) : null, erro: null, erroLivre: 0, ult: null };
    if (f1) {
      p.ia.jeito += p.ia.estilo.lado;
      const tr = Sim.criarPista(t, room.config.pista);
      const car = Sim.novo(tr, { grid: p.grid, f1: true, pneu: p.ia.pneu, box: true });
      car.ers = p.ia.ers;
      p.ia.sim = car;
      p.pos = { x: car.x, y: car.y, z: car.z, a: car.a, v: 0, prog: car.prog, at: Date.now() };
    } else posicionar(p, pf, 0);
  }
}
// O jeito de pilotar de um robô (regras de F1): `dentro` (de -1, abre as curvas, a 1, fecha por dentro), `lado` (o quanto
// anda para um lado da linha), `look` (quantos pontos antes da curva ele começa a frear: 2 freia tarde, 5 cedo) e `erroK`
// (o quanto erra: o nível e a constância do piloto contam). Os erros saem de um sorteio da semente, como o resto do GP.
function estiloDe(room, p, rng) {
  const pil = p.piloto, nivel = { facil: 1.5, medio: 1, dificil: 0.6 }[room.config.nivel] || 1;
  return { dentro: rng() * 2 - 1, lado: (rng() * 2 - 1) * 9, look: 2 + Math.floor(rng() * 4), erroK: nivel * (pil ? 0.5 + (100 - pil.constancia) / 40 : 1), erros: F1.sorteio(`erros:${room.semente}:${p.id}`) };
}
const L_CARRO = 44, W_CARRO = 26; // o carro em unidades da pista (carros.js: 4,4 m x 2,6 m, escala 10)
// os 3 círculos do carro (como em colisao.js, que é do navegador)
function circulos(pos) {
  const r = W_CARRO * 0.45, d = Math.max(0, L_CARRO / 2 - r), fx = Math.cos(pos.a), fy = Math.sin(pos.a);
  return [-d, 0, d].map((u) => [pos.x + fx * u, pos.y + fy * u, r]);
}
// A força do contato entre dois carros: a velocidade com que se aproximaram (a de colisao.js: 0 se não encostaram).
function forcaDoContato(A, B) {
  if (Math.hypot(A.x - B.x, A.y - B.y) > L_CARRO * 1.6 || Math.abs((A.z || 0) - (B.z || 0)) > 12) return 0;
  let melhor = null;
  for (const [ax, ay, ar] of circulos(A)) for (const [bx, by, br] of circulos(B)) {
    const dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy), pen = ar + br - d;
    if (pen > 0 && (!melhor || pen > melhor.pen)) melhor = { pen, nx: d > 1e-6 ? dx / d : 0, ny: d > 1e-6 ? dy / d : 1 };
  }
  if (!melhor) return 0;
  const vx = Math.cos(A.a) * (A.v || 0) - Math.cos(B.a) * (B.v || 0), vy = Math.sin(A.a) * (A.v || 0) - Math.sin(B.a) * (B.v || 0);
  return Math.max(0, -(vx * melhor.nx + vy * melhor.ny));
}
// Os robôs batem entre si e nos humanos (a metade dos humanos o navegador deles manda): o servidor diz a força do contato.
function contatos(room, emit) {
  const rodando = room.order.map((id) => room.players[id]).filter((q) => q && q.pos && q.finish == null && !q.dnf && !q.box);
  for (let a = 0; a < rodando.length; a++) for (let b = a + 1; b < rodando.length; b++) {
    const A = rodando[a], B = rodando[b]; if (!A.bot && !B.bot) continue;
    const forca = forcaDoContato(A.pos, B.pos); if (!(forca >= F1.BATIDA_MIN)) continue;
    for (const q of [A, B]) if (q.bot) emit("batida", { id: q.id, forca, tipo: "carro" });
  }
}
// O trânsito de um robô nas regras de F1. Cada carro por perto vira: um que está ao lado (o robô não vai para cima dele, nem
// fecha a porta), um na mesma faixa à frente (o robô para a tempo de não bater: a velocidade do da frente mais o que dá para
// frear até chegar nele) e a vez de ultrapassar, que só começa na reta (ou diante de um carro parado) e só pelo lado livre.
// Devolve o desvio do traçado, o limite de velocidade, se tem alguém à frente, os lados bloqueados e o vácuo (0 a 1).
function transito(room, p, ia, pf, i, baseLat, maxLat, vLivre = 0) {
  const ponto = pf.pts[i], c = pf.c, k = pf.kf, n = pf.n;
  const out = { desvio: 0, freio: Infinity, encontrou: false, bloqPos: false, bloqNeg: false, draft: 0 };
  const reta = k[i] < 1 / 1100 && k[(i + 6) % n] < 1 / 1100 && k[(i + 12) % n] < 1 / 900;
  let alvo = null;
  for (const oid of room.order) {
    const o = room.players[oid]; if (o === p || !o.pos || o.finish != null || o.dnf || Math.abs((o.pos.z || 0) - ponto.h) > 15) continue;
    // Duas partes próximas do desenho (especialmente curvas de Spa) não são tráfego uma da outra. Confere também a
    // distância ao longo da pista; só o carro realmente adiante pode mandar frear.
    const distancia = ((o.ia ? o.ia.s : o.pos.prog) - ia.s + n * 1.5) % n - n * 0.5;
    if (distancia * STEP < -75 || distancia * STEP > 300) continue;
    const dx = o.pos.x - p.pos.x, dy = o.pos.y - p.pos.y;
    const frente = dx * ponto.tx + dy * ponto.ty, lado = dx * -ponto.ty + dy * ponto.tx;
    if (frente < -70 || frente > 260 || Math.abs(lado) > 90 || (o.box && !p.box)) continue;
    const ov = o.pos.v || 0, latOutro = (o.pos.x - ponto.x) * -ponto.ty + (o.pos.y - ponto.y) * ponto.tx;
    if (Math.abs(frente) < L_CARRO * 1.7 && Math.abs(lado) < 52) { if (lado > 0) out.bloqPos = true; else out.bloqNeg = true; } // ao lado
    if (frente > 22 && frente < 170 && distancia * STEP > 8 && Math.abs(lado) < 24) out.draft = Math.max(out.draft, 1 - (frente - 22) / 148);
    if (frente > 0 && distancia * STEP > 8 && Math.abs(lado) < 32) { // na minha faixa, à frente
      const folga = frente - L_CARRO - 32 - Math.min(40, k[i] * 2500); // reserva espaço para o freio progressivo da física nova
      const desacel = D.frenagemMaxima(c, ia.v) * 0.55;
      out.freio = Math.min(out.freio, folga <= 0 ? ov * 0.82 : Math.sqrt(ov * ov + 2 * desacel * folga));
      if (frente < 120 && (!alvo || frente < alvo.frente)) alvo = { o, ov, frente, latOutro };
    }
  }
  out.encontrou = !!alvo;
  const livre = (side) => (side > 0 ? !out.bloqPos : !out.bloqNeg), naPista = (lat) => Math.abs(lat) <= maxLat;
  // "preso": o carro da frente é bem mais lento do que eu andaria sozinho; nem esperando na reta nem atrás dele numa curva leve: passa por onde cabe
  const preso = !!alvo && vLivre > alvo.ov + 12, leve = k[i] < 1 / 450 && k[(i + 6) % n] < 1 / 450;
  if (room.direcao?.safety || room.direcao?.amarelo) ia.ult = null; // sob bandeira ninguém ultrapassa
  else if (!ia.ult && alvo && (reta || alvo.ov < 40 || (preso && leve)) && ((ia.v > alvo.ov + 6 && ia.v > 30) || (preso && ia.v > 30) || (ia.v < 12 && alvo.ov < 12))) {
    const pos = alvo.latOutro + 32, neg = alvo.latOutro - 32, cabePos = naPista(pos) && livre(1), cabeNeg = naPista(neg) && livre(-1);
    const lado = cabePos && (!cabeNeg || Math.abs(pos - baseLat) < Math.abs(neg - baseLat)) ? 1 : cabeNeg ? -1 : 0;
    if (lado) ia.ult = { id: alvo.o.id, lado, ate: Date.now() + 7000 };
  }
  if (ia.ult) { // a ultrapassagem em andamento segue até o carro ficar para trás (ou o lado fechar)
    const o = room.players[ia.ult.id], tem = o && o.pos, dx = tem ? o.pos.x - p.pos.x : 0, dy = tem ? o.pos.y - p.pos.y : 0;
    const frente = dx * ponto.tx + dy * ponto.ty, alvoLat = (tem ? (o.pos.x - ponto.x) * -ponto.ty + (o.pos.y - ponto.y) * ponto.tx : 0) + ia.ult.lado * 32;
    if (!tem || frente < -L_CARRO * 1.6 || Date.now() > ia.ult.ate || !naPista(alvoLat) || (!livre(ia.ult.lado) && Math.abs(frente) < L_CARRO)) ia.ult = null;
    else out.desvio = alvoLat - baseLat;
  }
  return out;
}
// Os erros de um robô (regras de F1): na frenagem para uma curva, de vez em quando (mais nos níveis fáceis e nos pilotos menos
// constantes) ele trava a roda: freia pela metade por um instante, estraga um pouco o pneu e entra rápido demais; aí sai largo
// (abre para fora da curva e perde tempo). Raramente entra tão rápido que bate no muro (a batida tem força, punição e dano
// como a de quem joga). Os erros só custam tempo: nunca dão velocidade. Devolve o alvo, o freio e o desvio de linha.
function erroDoRobo(room, p, ia, pf, i, alvo, olha, now, dt, emit) {
  const est = ia.estilo, k = pf.kf, j = (i + olha + 2) % pf.n, out = { alvo, freioK: 1, desvio: 0 };
  if (!ia.erro && now > ia.erroLivre && ia.v > alvo + 12 && Math.max(k[j], k[(j + 4) % pf.n], k[(j + 8) % pf.n]) > 1 / 450 && est.erros() < 0.05 * est.erroK * dt) {
    ia.erro = { tipo: "travou", ate: now + 900, lado: -pf.linha.sinal[j] }; ia.erroLivre = now + 30000;
    if (ia.pneu) ia.pneu.desgaste = Math.min(1, ia.pneu.desgaste + 0.004); // o pneu travado ganha um ponto chato
  }
  const e = ia.erro; if (!e) return out;
  if (now >= e.ate) {
    if (e.tipo === "travou" && ia.v > alvo + 15) ia.erro = { tipo: "largo", ate: now + 1800, lado: e.lado, bateu: false }; else ia.erro = null;
    return out;
  }
  if (e.tipo === "travou") out.freioK = 0.45;
  else {
    out.desvio = e.lado * 24; out.alvo = alvo * 0.9;
    const excesso = ia.v - pf.lim[i] * 1.25;
    if (!e.bateu && excesso > 20 && Math.abs(ia.lat) > T.PISTAS[room.config.pista].width * 0.22 && est.erros() < 0.35) { // entrou tão rápido que não segurou: o muro
      e.bateu = true; emit("batida", { id: p.id, forca: Math.min(F1.BATIDA_MAX, excesso * 1.2), tipo: "muro" }); ia.v *= 0.5;
    }
  }
  return out;
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
// ---------- o pit stop (regras de F1) ----------
// Passando pela linha de entrada do corredor, o robô entra se está na volta da parada da estratégia, ou antes dela se o
// pneu já passou do penhasco (e nunca na última volta, que passa pela chegada dentro do corredor).
function entrarNoBox(room, p, ia, pf) {
  const cor = pf.corredor, prox = ia.plano && ia.plano.paradas[(p.paradas || []).length];
  if (!cor || !prox || !p.started || p.laps + 1 >= room.config.voltas) return;
  const rel = (Math.floor(ia.s) - cor.i0 + pf.n) % pf.n; if (rel > 5) return;
  const gasto = ia.pneu && ia.pneu.desgaste > F1.PENHASCO * 0.95;
  if (p.laps + 1 < prox.volta && !gasto && !room.direcao?.safety) return;
  const n = (p.paradas || []).length + 1;
  ia.box = { fase: "entra", u: rel + (ia.s - Math.floor(ia.s)), lat0: ia.lat, garagem: F1.garagemDe(cor, p.grid), parada: F1.tempoDeParada(room.semente, p.id, n), composto: prox.composto, volta: p.laps + 1, tempo: 0, t: 0 };
  p.box = ia.box;
}
// um passo dentro do corredor: freia até o limitador, para na garagem, espera a parada e sai no limitador
function passoNoBox(room, p, ia, pf, dt, emit) {
  const b = ia.box, cor = pf.corredor, c = pf.c, vlim = F1.LIMITADOR * c.vmax;
  b.tempo += dt;
  const vai = (alvo) => { ia.v = ia.v > alvo ? Math.max(alvo, ia.v - c.brake * dt) : Math.min(alvo, ia.v + c.acc * dt); };
  if (b.fase === "entra") {
    const falta = Math.max(0, b.garagem - b.u) * STEP;
    vai(Math.min(vlim, Math.sqrt(2 * c.brake * 0.6 * falta)));
    b.u = Math.min(b.garagem, b.u + (ia.v * dt) / STEP);
    if (b.u >= b.garagem - 0.02) { b.u = b.garagem; ia.v = 0; b.fase = "parada"; b.t = 0; }
  } else if (b.fase === "parada") {
    ia.v = 0; b.t += dt;
    if (b.t >= b.parada) { b.fase = "sai"; ia.pneu = F1.pneuNovo(b.composto); }
  } else {
    vai(vlim); b.u += (ia.v * dt) / STEP;
    if (b.u >= cor.len) { b.u = cor.len; ia.box = null; p.box = null; emit("box", { id: p.id, composto: b.composto, tempo: b.tempo, volta: b.volta }); }
  }
    ia.s = (cor.i0 + b.u) % pf.n; ia.lat = cor.latParada(b.u, b.garagem, b.lat0);
}
// O robô está preso? Parado (menos de V_PRESO) por T_PRESO segundos, ou sem andar nem T_SEM_ANDAR pontos de pista em 6 s (rodando no
// lugar, de lado no muro, na brita). Não conta no box, sob bandeira, antes de a corrida ficar de pé nem com o carro quebrado.
function encalhou(room, ia, car, now, dt) {
  if (car.box?.fase || room.direcao?.safety || car.air) { ia.parado = 0; ia.refProg = car.prog; ia.refT = now; return false; }
  ia.parado = Math.abs(car.v) < V_PRESO ? (ia.parado || 0) + dt : 0;
  if (ia.refT == null || now - ia.refT > 6000) {
    const andou = ia.refT == null ? Infinity : car.prog - ia.refProg;
    ia.refProg = car.prog; ia.refT = now;
    if (andou < T_SEM_ANDAR) { ia.parado = 0; return true; }
  }
  if (ia.parado > T_PRESO) { ia.parado = 0; return true; }
  return false;
}
// F1: os robôs usam o mesmo carro e a mesma pista física dos humanos. O controlador escolhe só o alvo de
// velocidade e o lugar da pista; Sim.passo aplica direção, pneu, freio, motor, muro e box a 120 Hz.
function passoF1(room, p, ia, pf, dt, now, setor, emit, outros) {
  const tr = Sim.criarPista(T.PISTAS[room.config.pista], room.config.pista), car = ia.sim;
  const spec = pf.c, n = tr.n;
  // Também aceita ajustes explícitos de velocidade feitos pela sala e pelos testes.
  if (Math.abs(ia.v - car.v) > 0.01) car.v = ia.v;
  const i = car.idx, est = ia.estilo;
  ia.s = i; ia.lat = Sim.quadro(tr, car.x, car.y, i).lat;
  const saidaGrid = Math.min(1, ((car.prog - (car.gridIdx - n)) / 100));
  const linha = pf.lat[(i + 2) % n] * FATOR_LINHA + ia.jeito + Math.sin(car.prog / 105 + ia.tracadoId * 1.7) * 3
    + est.dentro * pf.linha.sinal[i] * Math.min(1, pf.kf[i] * 400) * 7;
  const baseLat = ia.lat0 * (1 - saidaGrid) + linha * saidaGrid;
  const maxLat = tr.W / 2 - 18;
  const pneu = F1.aderencia(car.pneu), dano = F1.efeitoDoDano(p.dano), curva = pf.kf[i] > 1 / 600;
  const fis = perfilF1(pf, ia.nivel), topo = topoDe(pf);
  const olhar = Math.max(3, Math.ceil(Math.max(car.v, 30) * 0.25 / STEP));
  let alvo = Infinity;
  for (let k = 0; k <= olhar; k++) alvo = Math.min(alvo, fis[(i + k) % n]);
  const vLivre = Math.min(spec.vmax * pneu.final * dano.final, alvo < topo * 0.97 ? alvo * Math.sqrt(pneu.grip * dano.grip) : alvo); // a velocidade do robô sem ninguém na frente
  const tf = transito(room, p, ia, pf, i, baseLat, maxLat, vLivre);
  ia.desvio += (tf.desvio - ia.desvio) * Math.min(1, dt * 1.8);
  let alvoLat = Math.max(-maxLat, Math.min(maxLat, baseLat + ia.desvio));
  if (tf.bloqPos) alvoLat = Math.min(alvoLat, ia.lat);
  if (tf.bloqNeg) alvoLat = Math.max(alvoLat, ia.lat);
  const vac = F1.vacuoF1(tf.draft, curva);
  if (alvo < topo * 0.97) alvo *= Math.sqrt(pneu.grip * dano.grip * vac.aderencia); // só as curvas dependem da aderência
  alvo = Math.min(alvo, spec.vmax * pneu.final * dano.final);
  // Enquanto há pista livre ao lado, o ERS ajuda a passar. Se a porta fecha, o limite de tráfego manda frear.
  if (ia.ult && !tf.bloqPos && !tf.bloqNeg) alvo = Math.min(spec.vmax, alvo * 1.04);
  alvo = Math.min(alvo, tf.freio);
  if (p.quebrou) alvo = Math.min(alvo, spec.vmax * F1Equipes.EMERGENCIA);
  if (p.incidenteAte > now) alvo = Math.min(alvo, spec.vmax * 0.24);
  const proxima = ia.plano && ia.plano.paradas[(p.paradas || []).length];
  const relBox = tr.corredor ? (i - tr.corredor.i0 + n) % n : Infinity;
  const pedirBox = proxima && p.started && p.laps + 1 < room.config.voltas &&
    (p.laps + 1 >= proxima.volta || car.pneu.desgaste > F1.PENHASCO * 0.95 || room.direcao?.safety) && relBox <= 8;
  const amb = { spec, dano: p.dano || 0, drsZona: p.drsZona ?? -1, safety: !!room.direcao?.safety,
    amarela: room.direcao?.amarelo?.setor === Math.floor(i / (n / T.SECTORS)), ersAuto: false,
    voltas: room.config.voltas, laps: p.laps || 0, paradas: (p.paradas || []).length,
    semente: room.semente, id: p.id, grid: p.grid, f1: true, outros };
  const ent = ia.ent || (ia.ent = {});
  const ev = [];
  if (encalhou(room, ia, car, now, dt)) { // preso (parado, rodado, de lado no muro ou sem andar): o "↺ Pista" do robô, do lado livre
    Sim.voltarParaPista(car, tr, ev);
    const q = tr.pts[car.idx], lado = tf.bloqPos && !tf.bloqNeg ? -1 : tf.bloqNeg && !tf.bloqPos ? 1 : 0, lat = lado * Math.min(maxLat, 40);
    car.x += q.nx * lat; car.y += q.ny * lat; car.sp = { x: car.x, y: car.y };
    ia.desvio = 0; ia.ult = null; ia.erro = null; ia.recuperacoes = (ia.recuperacoes || 0) + 1;
  }
  for (let s = 0, passos = Math.round(dt / Sim.PASSO); s < passos; s++) {
    ev.length = 0;
    // o volante e os pedais são calculados a cada passo da física (120 Hz), como quem joga: o robô sente o carro escorregar
    Sim.pilotoAutomatico(car, tr, spec, alvo, alvoLat, ent);
    if (ent.gas && (car.patina > PAT || Math.abs(car.alR) > ALFA_TRACAO)) ent.gas = 0; // a traseira já está no limite: tira o pé em vez de rodar
    const exc = Math.abs(car.alF) - ALFA_FRENTE; // a frente já passou do pico do pneu (anda de frente): mais volante só piora, alivia até ela voltar a pegar
    if (exc > 0 && car.alF * ent.steer < 0) ent.steer *= Math.max(0, 1 - exc * K_FRENTE);
    if (ent.brake && car.travada > TRAVA_ABS) ent.brake = 0; // a roda da frente travou: solta o freio um instante (o ABS de quem sabe frear)
    ent.ers = !!ia.ult;
    ent.pedido = pedirBox ? proxima.composto : null;
    Sim.passo(car, ent, amb, tr, ev);
    for (const e of ev) {
      if (e.t === "setor") setor(p, e.s);
      else if (e.t === "box" && e.fase === "sai") emit("box", { id: p.id, composto: e.composto, tempo: e.tempo, volta: e.volta });
      else if (e.t === "muro" && e.forca >= F1.BATIDA_MIN) emit("batida", { id: p.id, forca: e.forca, tipo: "muro" });
    }
    amb.laps = p.laps || 0;
    amb.paradas = (p.paradas || []).length;
  }
  ia.s = car.idx; ia.v = car.v; ia.lat = Sim.quadro(tr, car.x, car.y, car.idx).lat;
  ia.pneu = car.pneu; ia.ers = car.ers; ia.box = car.box?.fase ? car.box : null; p.box = ia.box;
  p.pos = { x: car.x, y: car.y, z: car.z, a: car.a, v: car.v, prog: car.prog, at: now };
}
// um passo (dt em segundos). setor(p, s) é o mesmo onSector dos humanos; emit manda eventos para a sala
function passo(room, dt, setor, emit) {
  const now = Date.now(), corrida = room.phase === "race" && now >= room.startAt, t = T.PISTAS[room.config.pista];
  const humanos = room.order.map((id) => room.players[id]).filter((q) => !q.bot && q.pos);
  const lider = humanos.length ? Math.max(...humanos.map((q) => q.pos.prog)) : null, f1 = room.config.regras === "f1";
  const outrosF1 = f1 ? room.order.map((id) => room.players[id]).filter((q) => q.pos && !q.dnf && q.finish == null).map((q) => q.pos) : null;
  for (const id of room.order) {
    const p = room.players[id]; if (!p.bot || !p.ia) continue;
    const ia = p.ia, pf = perfil(room.config.pista, p.spec || p.car, ia.tracadoId), c = pf.c;
    if (f1 && ia.sim) {
      if (p.dnf) { ia.sim.v = ia.v = 0; if (p.pos) { p.pos.v = 0; p.pos.at = now; } continue; }
      if (corrida && p.finish == null && now >= room.startAt + ia.reacao) passoF1(room, p, ia, pf, dt, now, setor, emit, outrosF1);
      continue;
    }
    if (p.dnf) { ia.v = Math.max(0, ia.v - c.brake * 1.2 * dt); ia.s = (ia.s + (ia.v * dt) / STEP) % pf.n; } // perda total: o carro para onde está
    else if (ia.box && corrida && p.finish == null) passoNoBox(room, p, ia, pf, dt, emit);
    else if (corrida && p.finish == null && now >= room.startAt + ia.reacao) {
      // Corre pelo próprio ritmo; a posição do humano não dá aceleração extra ao bot.
      let el = 1; if (lider != null && p.pos && (p.pos.prog - lider) / pf.n > 0.08) el = 0.97;
      const i = Math.floor(ia.s) % pf.n;
      const aderencia = ia.pneu && F1.aderencia(ia.pneu), est = f1 ? ia.estilo : null, dano = f1 ? F1.efeitoDoDano(p.dano) : null;
      // o traçado de cada robô: a linha mais o seu jeito (regras de F1: mais por dentro ou por fora das curvas, mais para um lado)
      const baseLat = pf.lat[(i + 2) % pf.n] + ia.jeito + Math.sin(ia.s / 105 + ia.tracadoId * 1.7) * 4 + (est ? est.dentro * pf.linha.sinal[i] * Math.min(1, pf.linha.k[i] * 400) * 12 : 0);
      const maxLat = t.width / 2 - 10, ponto = pf.pts[i];
      let desvio = 0, freioTrafego = Infinity, encontrou = false, tf = null;
      if (f1) { tf = transito(room, p, ia, pf, i, baseLat, maxLat); desvio = tf.desvio; freioTrafego = tf.freio; encontrou = tf.encontrou; }
      // regras de F1: cada robô começa a frear numa distância (est.look pontos antes da curva); com o pneu gasto ou o carro
      // batido, mais cedo
      const olha = est ? Math.max(1, Math.round(est.look + (aderencia ? (1 - aderencia.freio * dano.grip) * 14 : 0))) : 3;
      let alvo = Math.min(pf.lim[i], pf.lim[(i + olha) % pf.n]) * ia.nivel * el * (1 - Math.min(1, Math.abs(ia.desvio) / 40) * 0.06);
      // regras de F1: nas curvas, a velocidade vai com a raiz da aderência (o pneu gasto ou frio, o dano e o ar sujo de quem vem
      // colado atrás): o robô freia antes e não escorrega
      const curva = pf.linha.k[i] > 1 / 600, vac = aderencia ? F1.vacuoF1(tf ? tf.draft : 0, curva) : null;
      if (aderencia && pf.lim[i] < c.vmax * 0.97) alvo *= Math.sqrt(aderencia.grip * dano.grip * vac.aderencia);
      if (aderencia) alvo = Math.min(alvo, c.vmax * aderencia.final * dano.final);
      if (!f1) for (const oid of room.order) {
        const o = room.players[oid]; if (o === p || !o.pos || Math.abs((o.pos.z || 0) - ponto.h) > 15) continue;
        const dx = o.pos.x - p.pos.x, dy = o.pos.y - p.pos.y;
        const frente = dx * ponto.tx + dy * ponto.ty, lado = dx * -ponto.ty + dy * ponto.tx;
        if (frente < -40 || frente > 185 || Math.abs(lado) > 65) continue;
        const latOutro = (o.pos.x - ponto.x) * -ponto.ty + (o.pos.y - ponto.y) * ponto.tx;
        if (Math.abs(latOutro - ia.lat) > 34) continue;
        encontrou = true;
        const esquerda = latOutro - 30, direita = latOutro + 30;
        const cabeEsquerda = esquerda >= -maxLat, cabeDireita = direita <= maxLat;
        if (room.direcao?.safety) ia.passSide = 0;
        else if (!ia.passSide || (ia.passSide < 0 && !cabeEsquerda) || (ia.passSide > 0 && !cabeDireita))
          ia.passSide = cabeEsquerda && (!cabeDireita || Math.abs(esquerda - baseLat) < Math.abs(direita - baseLat)) ? -1 : cabeDireita ? 1 : 0;
        const alvoPassagem = ia.passSide < 0 ? esquerda : direita;
        if (ia.passSide) desvio = alvoPassagem - baseLat;
        const faltaEspaco = !ia.passSide || Math.abs(ia.lat - latOutro) < 25;
        if (frente > 0 && frente < 115 && faltaEspaco) freioTrafego = Math.min(freioTrafego, Math.max(35, (o.pos.v || 0) * 0.94));
      }
      if (!f1 && !encontrou) ia.passSide = 0;
      if (p.azul) { desvio = maxLat * 0.65 - baseLat; alvo *= 0.82; }
      const bala = p.balaUntil > now; // a bala não freia para ninguém nem para curva: passa por cima
      if (!bala) alvo = Math.min(alvo, freioTrafego);
      let freioK = 1;
      if (est && !bala) { // regras de F1: de vez em quando o robô erra, como quem joga: trava a roda na frenagem e sai largo da curva
        const e = erroDoRobo(room, p, ia, pf, i, alvo, olha, now, dt, emit); alvo = e.alvo; freioK = e.freioK; desvio += e.desvio;
      }
      alvo = Math.min(alvo, c.vmax); // nunca passa da velocidade final do carro (a mesma de quem joga)
      if (room.direcao?.safety) alvo = Math.min(alvo, c.vmax * 0.54);
      else if (room.direcao?.amarelo?.setor === Math.floor(i / (pf.n / T.SECTORS))) alvo = Math.min(alvo, c.vmax * 0.82);
      if (p.incidenteAte > now) alvo = Math.min(alvo, c.vmax * 0.24);
      if (p.quebrou) alvo = Math.min(alvo, c.vmax * F1Equipes.EMERGENCIA); // o carro quebrou (f1-equipes.js): anda no modo de emergÃªncia
      if (p.shrinkUntil > now) alvo *= ENCOLHIDO; // o raio: pequeno e lento, como quem joga (fisica.js)
      if (p.inkUntil > now) alvo *= 0.9; // a lula: sem enxergar direito, tira o pé
      if (bala) alvo = c.vmax; // e a bala soma a força dela logo abaixo, como o turbo
      // turbo e estrela: as mesmas contas do carro de quem joga (fisica.js): mais velocidade final e mais força para chegar nela
      const turbo = p.boostUntil > now, estrela = p.starUntil > now;
      const drs = !!(aderencia && p.drsZona === F1.zonaDRS(ia.s / pf.n, t.drs) && p.drsZona >= 0 && !room.direcao?.safety && !room.direcao?.amarelo);
      const ers = ia.ers;
      if (ers) F1.carregarErs(ers, dt, ia.v > alvo + 12, ia.v >= alvo, p.laps);
      const usaErs = !!(ers && !room.direcao?.safety && F1.usarErsAuto(ers.carga, ia.v, c.vmax, pf.lim[i] > c.vmax * 0.93, encontrou));
      if (ers) F1.gastarErs(ers, dt, usaErs);
      // regras de F1: o vácuo na reta (o mesmo de quem joga, com o mesmo teto do ganho aerodinâmico)
      const aero = vac ? Math.min(F1.AERO_MAX, vac.final + (drs ? 0.05 * (c.drs ?? 1) : 0) + (usaErs ? 0.03 : 0)) : (drs ? 0.05 * (c.drs ?? 1) : 0) + (usaErs ? 0.03 : 0);
      const bk = 1 + (turbo ? 0.18 : 0) + (estrela ? 0.12 : 0) + (bala ? BALA - 1 : 0) + aero;
      const ak = 1 + (turbo ? 0.8 : 0) + (estrela ? 0.4 : 0) + (bala ? 1.5 : 0) + (usaErs ? 0.25 : 0) + (vac ? vac.acel : 0);
      alvo += c.vmax * (bk - 1); // o item mantém sua força mesmo com o ritmo base mais acessível
      if (room.direcao?.safety) alvo = Math.min(alvo, c.vmax * 0.54);
      else if (room.direcao?.amarelo?.setor === Math.floor(i / (pf.n / T.SECTORS))) alvo = Math.min(alvo, c.vmax * 0.82);
      if (p.spinUntil > now) ia.v *= Math.exp(-dt * 2.2);
      else if (ia.v < alvo) ia.v = Math.min(alvo, ia.v + c.acc * ak * (aderencia?.tracao || 1) * (dano ? dano.tracao : 1) * (1 - 0.8 * Math.pow(Math.max(0, ia.v) / (c.vmax * bk), 1.6)) * dt); // a mesma arrancada do carro de quem joga
      else ia.v = Math.max(alvo, ia.v - (ia.v > c.vmax && alvo >= c.vmax * 0.98 ? T.TURBO_SOLTA : c.brake * (aderencia?.freio || 1) * (dano ? dano.freio : 1) * freioK) * dt); // fim do turbo na reta: solta aos poucos, como quem joga
      ia.s = (ia.s + (ia.v * dt) / STEP) % pf.n;
      entrarNoBox(room, p, ia, pf);
      // o pneu gasta pela distância; escorrega quando a curva pede mais que o grip do carro
      if (ia.pneu) F1.gastarPneu(ia.pneu, { dist: ia.v * dt, volta: pf.n * STEP, slip: Math.max(0, (ia.v * ia.v * pf.linha.k[i]) / c.grip - 0.9) * 120, v: ia.v, vmax: c.vmax, dt, fator: c.desgaste });
      // depois da largada (~600 de reta), sai da faixa do grid e vai aos poucos para o traçado; antes disso, não desvia de ninguém
      const saida = Math.min(1, ((ia.s - ia.s0 + pf.n) % pf.n) / 100), largando = saida < 1;
      ia.desvio += (desvio - ia.desvio) * Math.min(1, dt * 2.2);
      const alvoLat = largando ? ia.lat0 * (1 - saida) + (baseLat + ia.desvio) * saida : baseLat + ia.desvio;
      let quer = Math.max(-maxLat, Math.min(maxLat, alvoLat));
      if (tf) { if (tf.bloqPos) quer = Math.min(quer, ia.lat); if (tf.bloqNeg) quer = Math.max(quer, ia.lat); } // não fecha a porta de quem está ao lado
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
  if (f1 && corrida) contatos(room, emit); // as batidas entre os carros (o servidor confere a força e aplica a punição e o dano)
}
function possivel(pista, spec) { return perfilF1(perfil(pista, spec || F1Equipes.specDaEquipe("mclaren"), 0), 1); }
possivel.topo = (pista, spec) => topoDe(perfil(pista, spec || F1Equipes.specDaEquipe("mclaren"), 0));
module.exports = { idealDe, possivel, forcaDoContato, preparar, remover, largar, passo, NIVEIS, RITMO, GRID_F1, aprender, usarFonte, aprendido, tempoDaVolta, perfil, ritmoDosRobos, prazoDeChegada, voltaLancada, duracaoDaClassificacao };
