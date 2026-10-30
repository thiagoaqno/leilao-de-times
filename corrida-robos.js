// Corrida da Galera — os robôs. Rodam no servidor e aprendem com a galera: se alguém já fez uma volta limpa na pista,
// eles usam até cinco linhas humanas diferentes, com velocidade limitada e margem para ultrapassagem. Sem volta
// gravada, seguem o traçado de corrida calculado (abre antes da curva, corta no ápice) com a velocidade que a curva
// permite. Pegam caixas e usam os itens. Para os navegadores eles são pilotos como os outros: a posição sai pelo
// mesmo evento "ghost" e as voltas contam pelos mesmos setores.
const T = require("./public/corrida/pistas.js");
const Linha = require("./corrida-linha.js"); // a linha de corrida por otimização (curvatura mínima)
const Itens = require("./corrida-itens.js");
const F1 = require("./public/corrida/f1-regras.js"); // os pneus das regras de F1
const F1Equipes = require("./public/corrida/f1-equipes.js"); // a montagem do carro de cada equipe
const D = require("./public/corrida/dinamica.js");
const Sim = require("./public/corrida/sim.js");
const Contato = require("./corrida-contato.js"); // a batida entre carros a cada passo, igual à dos humanos (histórico e impulsos)
const Pilotos = require("./public/corrida/f1-pilotos-2026.js"); // as equipes e os pilotos reais de 2026 (os robôs das regras de F1)
const { SKINS } = require("./public/pelada/campo.js");

const NOMES = ["Faísca", "Pistão", "Graxa", "Biela", "Vácuo", "Turbo", "Chicane"];
const NIVEIS = { facil: 0.80, medio: 0.87, dificil: 0.93 }; // modo clássico: fração da velocidade do traçado
// Com voltas guardadas: o tempo de volta que o robô mira, em relação ao ritmo de quem joga (a média das cinco
// melhores voltas de cada um). No médio, um pouco mais lento que essa média; no difícil, um pouco mais rápido.
const RITMO = { facil: 1.12, medio: 1.03, dificil: 0.98 };
const STEP = 6;
const FOLGA_LINHA = 4; // (pouca folga: no ápice e na saída o robô põe meio carro em cima da zebra, como quem joga)
const _FOLGA_LINHA_ANTIGA = 18; // a linha de F1 fica a esta distância (u) da beira da pista, de centro a centro: sobra meia largura do carro e um respiro
// O robô de F1 segue a linha de corrida (o elástico de `tracado`) por inteiro, menos uma folga: o suficiente para abrir as curvas e
// encostar nos ápices sem raspar no zebra. A velocidade que ele mira sai da curvatura DESSE caminho (`curvaturaDoCaminho`), não da do
// elástico cru, que tinha quinas de raio quase zero.
const FATOR_LINHA = 0.8; // (só nas pistas de fantasia e no jogo clássico: a linha de F1 de `tracado(pista, true)` já é a de menor curvatura e vale inteira)
// o menor raio (u) que o robô considera numa curva: o carro não fecha mais que isso, e uma quina de raio quase zero no traçado (um
// ponto fora do lugar) fazia o perfil de velocidade despencar para 1 u/s no meio de uma reta
const RAIO_MIN = 22;
// Limite de curva calibrado com o carro físico: 1,085 nas pistas largas e 1,08 entre muretas, com frenagem no limite.
// Valores maiores fazem o robô sair da pista em Mônaco. As pistas fantasia conservam a margem antiga por causa das lombadas.
const LARGURA_ESTREITA = 110, MARGEM_F1 = 1.085, MARGEM_FREIO = 1.0;
const MARGEM_ANTIGA = { margem: 0.95, freio: 0.8 }, PISTAS_FANTASIA = new Set(["serra", "deserto", "nurburgring", "arcoiris"]);
const margemDaPista = (pista) => (PISTAS_FANTASIA.has(pista) ? MARGEM_ANTIGA : { margem: T.PISTAS[pista].width <= LARGURA_ESTREITA ? 1.08 : MARGEM_F1, freio: MARGEM_FREIO });
const TRAVA_ABS = 0.25; // quanto a roda pode travar na frenagem antes do robô soltar o freio
const ALFA_FRENTE = 0.10, K_FRENTE = 8; // o pico do pneu é 0,11 rad
const V_ARRASTO = 16; // u/s: velocidade mínima para sair de trás do carro parado e contorná-lo
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
function tracado(pista, f1 = false) {
  const cache = f1 ? pista + ":f1" : pista;
  if (LINHAS.has(cache)) return LINHAS.get(cache);
  const t = T.PISTAS[pista], pts = T.pontos(t, STEP), n = pts.length, max = t.width / 2 - 16;
  const lat = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n);
  const pos = () => { for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; } };
  if (!f1) for (const k of [12, 8, 5, 3]) for (let it = 0; it < 60; it++) {
    pos();
    for (let i = 0; i < n; i++) {
      const a = (i - k + n) % n, b = (i + k) % n, mx = (X[a] + X[b]) / 2, my = (Y[a] + Y[b]) / 2;
      const alvo = (mx - pts[i].x) * -pts[i].ty + (my - pts[i].y) * pts[i].tx;
      lat[i] = Math.max(-max, Math.min(max, lat[i] + (alvo - lat[i]) * 0.5));
    }
  }
  // Linha de F1: a LINHA DE CORRIDA de verdade, por otimização (corrida-linha.js): curvatura mínima entre as beiras, com a folga do carro.
  // Abre por fora antes da curva, encosta por dentro no ápice e sai abrindo; as curvas em sequência saem resolvidas juntas.
  // (O relaxamento de antes, 12 mil passos de uma média local, não convergia: a linha ficava perto do eixo da pista.)
  if (f1) lat.set(Linha.otimizar(pts, max + 16 - FOLGA_LINHA));
  pos();
  const k = new Float64Array(n), sinal = new Float64Array(n); // sinal: +1 se a curva vai para o lado de lat positivo, -1 para o outro
  for (let i = 0; i < n; i++) { // curvatura do traçado: quanto a direção vira por unidade andada
    const a = (i - 3 + n) % n, b = (i + 3) % n, d1 = Math.atan2(Y[i] - Y[a], X[i] - X[a]), d2 = Math.atan2(Y[b] - Y[i], X[b] - X[i]);
    k[i] = Math.abs(Math.atan2(Math.sin(d2 - d1), Math.cos(d2 - d1))) / Math.max(1, Math.hypot(X[b] - X[a], Y[b] - Y[a]) / 2);
    sinal[i] = Math.sin(d2 - d1) >= 0 ? 1 : -1;
  }
  const out = { pts, n, lat, k, sinal, X, Y }; LINHAS.set(cache, out); return out;
}
// A curvatura do caminho que o robô de F1 faz (a pista mais `lat` de lado em cada ponto): o círculo por três pontos, a `m` pontos de cada
// lado, depois a média de uma janelinha, e nunca mais que 1/RAIO_MIN. Sem as quinas que o ruído do traçado cru deixava.
function curvaturaDoCaminho(pts, lat, m = 4, janela = 2) {
  const n = pts.length, X = new Float64Array(n), Y = new Float64Array(n), cru = new Float64Array(n), k = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; }
  for (let i = 0; i < n; i++) {
    const a = (i - m + n) % n, b = (i + m) % n, cruz = (X[i] - X[a]) * (Y[b] - Y[i]) - (Y[i] - Y[a]) * (X[b] - X[i]);
    const da = Math.hypot(X[i] - X[a], Y[i] - Y[a]), db = Math.hypot(X[b] - X[i], Y[b] - Y[i]), dc = Math.hypot(X[b] - X[a], Y[b] - Y[a]);
    cru[i] = da * db * dc > 1e-6 ? (2 * Math.abs(cruz)) / (da * db * dc) : 0;
  }
  for (let i = 0; i < n; i++) { let q = 0; for (let j = -janela; j <= janela; j++) q += cru[(i + j + n) % n]; k[i] = Math.min(1 / RAIO_MIN, q / (2 * janela + 1)); }
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
  const t = T.PISTAS[pista], c = carro.chave ? carro : T.CARROS[carro], f1 = !!carro.chave && !PISTAS_FANTASIA.has(pista), linha = tracado(pista, f1), pts = linha.pts, n = pts.length, perfis = aprendido(pista), ap = perfis[tracadoId % perfis.length];
  let lim, lat;
  const curva = Array.from(linha.k, (k) => (k > 1e-4 ? Math.min(c.turn / k * 1.1, Math.sqrt(c.grip / k) * 1.2, c.vmax) : c.vmax));
  for (let volta = 0; volta < 2; volta++) for (let i = n - 1; i >= 0; i--) curva[i] = Math.min(curva[i], Math.sqrt(curva[(i + 1) % n] ** 2 + 2 * c.brake * 0.72 * STEP));
  if (ap) { lim = Array.from(ap.vel, (v, i) => Math.min(curva[i], Math.max(40, v * c.vmax))); lat = ap.lat; }
  else {
    lim = curva;
    lat = linha.lat;
  }
  const fator = f1 ? 1 : FATOR_LINHA, latF1 = Float64Array.from({ length: n }, (_, i) => lat[(i + 2) % n] * fator); // o caminho do robô de F1 (passoF1 usa a mesma conta)
  const out = { pista, pts, n, lim, lat, t, c, linha, aprendeu: !!ap, corredor: F1.corredor(t, n, t.width), fator, kf: curvaturaDoCaminho(pts, latF1, f1 ? 12 : 4, f1 ? 6 : 2) }; CACHE.set(chave, out); return out; // corredor: o dos boxes, se a pista tem
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
const NIVEIS_F1 = [0.3, 0.5, 0.65, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5]; // (acima de 1: o difícil passa um pouco do ideal medido, como quem joga bem)
function topoDe(pf) { return pf.topo || (pf.topo = D.velocidadeFinal(pf.c)); }
function perfilF1(pf, f) {
  const q = Math.round(Math.min(1.5, Math.max(0.3, f)) * 100) / 100, mapa = pf.perfisF1 || (pf.perfisF1 = new Map());
  let v = mapa.get(q);
  if (!v) {
    v = D.perfilIdeal(pf.pts.map((p, i) => ({ k: pf.kf[i], h: p.h })), pf.c, STEP, margemDaPista(pf.pista).margem * q, null, margemDaPista(pf.pista).freio);
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
// Folga sobre o ideal do carro: difícil 0, médio 1,5% e fácil 5,5%, além da pequena diferença do piloto.
// O tráfego e o controle dos pedais ainda custam tempo na corrida real.
const FOLGA_F1 = { facil: 0.04, medio: 0, dificil: 0 };
// quem joga anda bem acima do "ideal" medido pelo perfil (o pneu segura mais do que a conta supõe): por nível, o robô usa esta
// fração a mais do limite das curvas, por cima do nível que dá o ideal. No difícil ele vai no limite de verdade.
const EMPURRAO_F1 = { facil: 1, medio: 1.27, dificil: 1.42 }; // (o médio é o difícil de antes; o difícil vai além) // (o difícil mira 3% abaixo do ideal: quem joga bem já bate o ideal)
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
    return Math.min(1.5, escalaPara(pf, alvoF1(room, p, pf), aderRef(), 8) * (EMPURRAO_F1[room.config.nivel] || 1)); // o nível é do piloto; o pneu de cada momento (macio, gasto, frio) mexe no ritmo de verdade, em passoF1
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
// Depois da primeira chegada, quem ainda corre tem 1 minuto para terminar (em todos os modos; passou disso, o resultado fecha).
function prazoDeChegada(room, prazoNormal = 60000) { return prazoNormal; }
// ---------- a classificação (regras de F1) ----------
// A volta lançada de um robô: o tempo da volta no ritmo dele (a mesma conta da corrida, `tempoDaVolta`) com pneu macio novo e
// quente (a mesma aderência do carro de quem joga), mais o ruído da constância do piloto, sorteado pela semente do GP,
// da sessão e do robô (recarregar nada muda). `em` é a hora (fração da sessão) em que o robô cruza a linha.
function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
// `janela` ({ startAt, durMs }, opcional): a sessão, para achar a água na pista na hora da volta do robô (clima.js do jogo: com
// chuva a classificação usa o pneu de chuva se a pista abre com água, o mesmo de quem joga).
function voltaLancada(room, p, sessao, tracadoId, nBots, janela = null) {
  const pf = perfil(room.config.pista, p.spec || p.car, tracadoId), nivel = nivelDe(room, p, tracadoId, nBots, pf);
  const r = F1.sorteio(`quali:${room.semente}:${sessao}:${p.id}`), sigma = p.piloto ? Pilotos.ruidoDaVolta(p.piloto.constancia) : 0.012;
  const ruido = Math.max(-2.5, Math.min(2.5, gauss(r))), em = 0.3 + 0.62 * r();
  let ader = F1.aderencia({ composto: "macio", desgaste: 0.03, temp: 0.8 });
  if (janela && room.clima) { // chuva: o pneu da sessão pela água na abertura, e a aderência pela água na hora da volta (em passos de 0,1: a tabela é guardada)
    const abre = F1.climaEm(room.clima, janela.startAt).agua, agua = Math.round(F1.climaEm(room.clima, janela.startAt + em * janela.durMs).agua * 10) / 10;
    ader = F1.aderencia({ composto: F1.compostoDaClassificacao(abre), desgaste: 0.03, temp: 0.8 }, agua);
  }
  const tempo = tempoDaVolta(pf, nivel, ader) * (1 + ruido * sigma);
  const final = room.config.regras === "f1" && (room.referenciaF1 || referenciaF1(room)).proteger
    ? Math.max(tempo, (room.referenciaF1 || referenciaF1(room)).recorde * 1.015) : tempo;
  return { tempo: Math.round(final * 1000) / 1000, em };
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
    // chuva: o quanto cada robô "sente" a água a mais ou a menos (±0,1, fixo no GP): não trocam todos de pneu juntos
    const vies = f1 ? Math.round((F1.sorteio(`vies:${room.semente}:${id}`)() - 0.5) * 20) / 100 : 0, aguaLargada = f1 && room.clima ? F1.climaEm(room.clima, room.startAt).agua : 0;
    if (plano && aguaLargada > 0 && F1.compostoPorAgua(room.config.pista, Math.max(0, Math.min(1, aguaLargada + vies)), [...F1.SECOS, "chuva"], plano.largada) === "chuva") { plano.largada = "chuva"; plano.paradas = []; } // larga molhado: sai de chuva
    if (plano) Object.assign(p, { pneu: plano.largada, pneuAtual: plano.largada, compostos: [plano.largada], paradas: [], acrescimo: 0, box: null });
    const rng = F1.sorteio(`estilo:${room.semente}:${id}`); // regras de F1: cada robô tem o seu jeito (sorteado pela semente do GP)
    p.ia = { s: g.idx, s0: g.idx, lat: g.lat, lat0: g.lat, desvio: 0, v: 0, nivel, jeito: pil ? rnd(-1, 1) * (2 + (100 - pil.constancia) * 0.3) : rnd(-7, 7), tracadoId, reacao: pil ? Math.max(150, Math.min(400, Pilotos.reacaoNaLargada(pil.largada) + rnd(-25, 25))) : rnd(150, 400), usaEm: 0,
      pneu: f1 ? F1.pneuNovo(p.pneu) : null, ers: f1 ? F1.ersNovo() : null, plano, box: null,
      estilo: f1 ? estiloDe(room, p, rng) : null, vies, erro: null, erroLivre: 0, ult: null };
    if (f1) {
      if (t.width <= LARGURA_ESTREITA) p.ia.jeito *= 0.5; // menos variação lateral entre as muretas
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
  const estreita = T.PISTAS[room.config.pista].width <= LARGURA_ESTREITA;
  return { dentro: (rng() * 2 - 1) * (estreita ? 0.5 : 1), lado: (rng() * 2 - 1) * (estreita ? 2 : 9), look: 2 + Math.floor(rng() * 4), erroK: nivel * (pil ? 0.5 + (100 - pil.constancia) / 40 : 1), erros: F1.sorteio(`erros:${room.semente}:${p.id}`) };
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
// ---------- o trânsito: perceber, ultrapassar, defender e não bater (regras de F1) ----------
// O robô olha cada carro por perto (humano ou robô) pela distância ao longo da pista, pelo lado e pela velocidade de aproximação:
//  - AO LADO (|frente| < 1,7 carro): marca o lado como ocupado e mantém `margem` de folga lateral (de centro a centro; o carro tem 26 u
//    de largura): não vai para cima de quem está ao lado e, se já está mais perto que isso, se afasta;
//  - À FRENTE na faixa: limita a velocidade para parar a tempo (a do da frente mais o que dá para frear até chegar nele) e segue no
//    vácuo; a vez de ultrapassar só começa se o robô chega ao lado ANTES da freada (`tAlcance` menor que o tempo até frear): senão fica
//    atrás; escolhe o lado de dentro da próxima curva se couber (o de fora, só com folga de tempo), muda de linha com antecedência e,
//    se na freada ainda está atrás, desiste em vez de mergulhar por dentro;
//  - ATRÁS e chegando: nos níveis médio e difícil o robô pode fechar a porta UMA vez por atacante e por volta (vai para o lado de
//    dentro antes da freada) e nunca depois que o atacante emparelha.
// Devolve o desvio do traçado, o limite de velocidade, se tem alguém à frente, os lados bloqueados e os limites laterais.
const MARG_PARADO = 32; // folga lateral (centro a centro) para passar por um carro parado na pista
const ARRANQUE_INI_MS = 2000, ARRANQUE_RAMPA_MS = 4000, ARRANQUE_SEM_ULT_MS = 3500; // a largada: a reserva de espaço à frente volta ao normal entre 2 s e 6 s, e sem ultrapassagem nos primeiros 3,5 s
const TRANSITO_NIVEL = { facil: { margem: 52, antec: 0.75, defende: 0 }, medio: { margem: 44, antec: 1, defende: 0.5 }, dificil: { margem: 44, antec: 1, defende: 0.5 } }; // (o difícil disputa como o médio: só o ritmo é maior, sem jogar ninguém para fora)
// a distância (u) até o ponto em que o perfil exige frear a partir da velocidade `v` (0: já freando; Infinity: nada nos próximos 540 u)
function distanciaDaFreada(fis, n, i, v) { const lim = v * 0.9; for (let k = 0; k <= 90; k++) if (fis[(i + k) % n] < lim) return k * STEP; return Infinity; }
// o lado de dentro da próxima curva de verdade (+1: lado de lat positivo; -1; 0 sem curva nos próximos ~600 u)
function ladoDeDentro(pf, i) { for (let k = 0; k <= 100; k++) { const j = (i + k) % pf.n; if (pf.kf[j] > 1 / 400) return pf.linha.sinal[j]; } return 0; }
function transito(room, p, ia, pf, i, baseLat, maxLat, vLivre = 0, plano = {}) {
  const ponto = pf.pts[i], c = pf.c, k = pf.kf, n = pf.n, now = Date.now();
  const niv = TRANSITO_NIVEL[room.config.nivel] || TRANSITO_NIVEL.medio, MARG = niv.margem;
  const dFreio = plano.dFreio ?? Infinity, dentro = plano.dentro || 0, meu = ia.sim;
  const tx = ponto.tx, ty = ponto.ty, vlatMeu = meu ? meu.vx * -ty + meu.vy * tx : 0;
  const out = { desvio: 0, freio: Infinity, encontrou: false, bloqPos: false, bloqNeg: false, draft: 0, limMin: -Infinity, limMax: Infinity, tras: null };
  const reta = k[i] < 1 / 1100 && k[(i + 6) % n] < 1 / 1100 && k[(i + 12) % n] < 1 / 900;
  let alvo = null, tras = null;
  const desdeLargada = room.startAt ? now - room.startAt : Infinity, arranque = Math.max(0, Math.min(1, (desdeLargada - ARRANQUE_INI_MS) / ARRANQUE_RAMPA_MS)), largando = desdeLargada < ARRANQUE_SEM_ULT_MS;
  for (const oid of room.order) {
    const o = room.players[oid]; if (o === p || !o.pos || o.finish != null || o.dnf || Math.abs((o.pos.z || 0) - ponto.h) > 15 || o.fantAte > now) continue; // (o fantasma, parado e recolocado, não é tráfego)
    // Duas partes próximas do desenho (especialmente curvas de Spa) não são tráfego uma da outra. Confere também a
    // distância ao longo da pista; só o carro realmente adiante pode mandar frear.
    const distancia = ((o.ia ? o.ia.s : o.pos.prog) - ia.s + n * 1.5) % n - n * 0.5;
    if (distancia * STEP < -220 || distancia * STEP > 340) continue;
    const dx = o.pos.x - p.pos.x, dy = o.pos.y - p.pos.y;
    const frente = dx * tx + dy * ty, lado = dx * -ty + dy * tx;
    if (frente < -210 || frente > 300 || Math.abs(lado) > 90 || (o.box && !p.box)) continue;
    const temV = o.pos.vx !== undefined, ov = temV ? o.pos.vx * tx + o.pos.vy * ty : (o.pos.v || 0), vlatO = temV ? o.pos.vx * -ty + o.pos.vy * tx : 0;
    const latOutro = (o.pos.x - ponto.x) * -ty + (o.pos.y - ponto.y) * tx;
    const perto = Math.min(Math.abs(lado), Math.abs(lado + (vlatO - vlatMeu) * 0.4)); // (a folga agora e daqui a 0,4 s: o humano que vem de lado conta antes)
    if (Math.abs(frente) < L_CARRO * 1.7 && perto < MARG + 12) { // ao lado (ou prestes a): lado ocupado e folga lateral mínima
      if (lado > 0) { out.bloqPos = true; out.limMax = Math.min(out.limMax, latOutro - MARG); } else { out.bloqNeg = true; out.limMin = Math.max(out.limMin, latOutro + MARG); }
    }
    if (frente > 22 && frente < 170 && distancia * STEP > 8 && Math.abs(lado) < 24) out.draft = Math.max(out.draft, 1 - (frente - 22) / 148);
    // quanto ele está freando (a desaceleração medida de uma passagem à outra): quem vem atrás conta com mais 0,6 s do mesmo freio
    const visto = (ia.vistos || (ia.vistos = {}))[oid] || (ia.vistos[oid] = { ov, t: now, a: 0 }), dtv = (now - visto.t) / 1000;
    if (dtv >= 0.04) { visto.a += (Math.max(-300, Math.min(100, (ov - visto.ov) / dtv)) - visto.a) * Math.min(1, dtv * 6); visto.ov = ov; visto.t = now; }
    const ovPlano = Math.max(0, ov + Math.min(0, visto.a) * 0.6);
    const aproxima = Math.max(0, ia.v - ovPlano); // a velocidade com que me aproximo dele
    if (frente > 0 && distancia * STEP > 8 && Math.abs(lado) < 34 + Math.min(10, aproxima * 0.1)) { // na minha faixa (quem chega rápido vê a faixa mais larga), à frente
      // reserva espaço para o freio progressivo da física (o pedal leva ~0,2 s para subir) e para o da frente frear mais forte que o previsto
      // (na largada o pelotão sai junto: a reserva de espaço cresce aos poucos, de quase nada no grid, onde os carros estão a 4 u um do outro, até
      // a de sempre; senão a fila de trás esperava cada carro da frente andar, uma fileira de cada vez)
      const folga = frente - L_CARRO - (32 + Math.min(40, k[i] * 2500) + aproxima * 0.3) * arranque - 1;
      const desacel = D.frenagemMaxima(c, ia.v, 0, plano.aderenciaFreio) * 0.5;
      let lim = folga <= 0 ? ovPlano * 0.82 : Math.sqrt(Math.max(0, ovPlano * ovPlano + 2 * desacel * folga));
      // Já decidiu ultrapassar este carro mas ainda está na faixa dele: um fio de velocidade (sem encostar) para o volante ter o que virar
      if (ia.ult && ia.ult.id === oid && frente > L_CARRO + 2) lim = Math.max(lim, V_ARRASTO);
      out.freio = Math.min(out.freio, lim);
      out.atras = Math.min(out.atras ?? Infinity, frente);
      const alcance = ov < 12 ? 240 : Math.max(120, Math.min(320, 100 + Math.max(0, ia.v - ov) * 1.6)); // quem chega rápido é visto de mais longe
      if (frente < alcance && (!alvo || frente < alvo.frente)) alvo = { o, ov, frente, latOutro };
    }
    if (frente < -22 && distancia * STEP < -8 && Math.abs(lado) < 40 && (!tras || -frente < tras.gap)) tras = { o, oid, gap: -frente, ov, lado }; // o carro logo atrás, na minha esteira
  }
  out.encontrou = !!alvo; out.tras = tras;
  const livre = (side) => (side > 0 ? !out.bloqPos : !out.bloqNeg), naPista = (lat) => Math.abs(lat) <= maxLat;
  // "preso": o carro da frente é bem mais lento do que eu andaria sozinho; nem esperando na reta nem atrás dele numa curva leve: passa por onde cabe
  const preso = !!alvo && vLivre > alvo.ov + 12, leve = k[i] < 1 / 450 && k[(i + 6) % n] < 1 / 450;
  const sob = !!(room.direcao?.safety || room.direcao?.amarelo) || largando; // (na largada ninguém ultrapassa nem defende: todos saem juntos, cada um na sua fila)
  if (sob) { ia.ult = null; ia.defesa = null; } // sob bandeira ninguém ultrapassa nem defende
  else {
    if (!ia.ult && alvo && now > (ia.ultAte || 0) && (reta || alvo.ov < 40 || (preso && leve) || dFreio === Infinity)) {
      const fecha = ia.v - alvo.ov, lento = alvo.ov < 40;
      // quanto tempo até emparelhar (o bico no meio do outro carro; a mudança de linha leva ~0,9 s em paralelo) contra o tempo até frear
      const tAlcance = Math.max(0.9, (alvo.frente - L_CARRO * 0.5) / Math.max(fecha, 10)), tFreio = dFreio / Math.max(ia.v, 30);
      const chega = lento || dFreio === Infinity || tAlcance < tFreio * niv.antec, foraDaFreada = lento || dFreio > 30;
      if (((fecha > 6 && ia.v > 30) || (preso && ia.v > 30) || (ia.v < 12 && alvo.ov < 12)) && chega && foraDaFreada) {
        // o lado: o de dentro da próxima curva se couber; o de fora só com folga de tempo (ou sem freada à vista); sem curva, o mais perto da minha linha
        const lados = dentro ? [dentro, -dentro] : (Math.abs(alvo.latOutro + MARG - baseLat) < Math.abs(alvo.latOutro - MARG - baseLat) ? [1, -1] : [-1, 1]);
        const folgaFora = lento || dFreio === Infinity || tAlcance < tFreio * niv.antec * 0.8;
        let lado = 0;
        // carro PARADO à frente (acidente, rodado): passa raspando, com menos folga lateral e usando até perto do muro (senão, numa pista estreita, ninguém cabia ao lado dele)
        const parado = alvo.ov < 15, mg = parado ? MARG_PARADO : MARG, cabe = (lat) => Math.abs(lat) <= maxLat + (parado ? 10 : 0);
        for (const s of lados) if (cabe(alvo.latOutro + s * mg) && livre(s) && (!dentro || s === dentro || folgaFora || parado)) { lado = s; break; }
        if (lado) ia.ult = { id: alvo.o.id, lado, ate: now + 7000, lento, parado, marg: mg };
      }
    }
    if (ia.ult) { // a ultrapassagem em andamento segue até o carro ficar para trás (ou o lado fechar)
      const o = room.players[ia.ult.id], tem = o && o.pos, dx = tem ? o.pos.x - p.pos.x : 0, dy = tem ? o.pos.y - p.pos.y : 0;
      const frente = dx * tx + dy * ty, alvoLat = (tem ? (o.pos.x - ponto.x) * -ty + (o.pos.y - ponto.y) * tx : 0) + ia.ult.lado * (ia.ult.marg || MARG);
      let acabou = !tem || frente < -L_CARRO * 1.6 || now > ia.ult.ate || Math.abs(alvoLat) > maxLat + (ia.ult.parado ? 10 : 0) || (!livre(ia.ult.lado) && Math.abs(frente) < L_CARRO);
      // na freada não mergulha: quem ainda está atrás do outro (o bico não chegou ao meio dele) desiste e fica no vácuo
      if (!acabou && !ia.ult.lento && dFreio < 30 && frente > L_CARRO * 0.45) { acabou = true; ia.ultAte = now + 2500; }
      if (acabou) ia.ult = null; else out.desvio = alvoLat - baseLat;
    }
    // defesa: UMA porta fechada por atacante e por volta, antes da freada, e nunca contra quem já emparelhou
    if (!ia.defesa && !ia.ult && tras && niv.defende > 0 && dentro && dFreio > 90 && dFreio < 450 && ia.v > 80) {
      const chave = tras.oid + ":" + (p.laps || 0), usadas = ia.defendeu || (ia.defendeu = {});
      if (!usadas[chave] && (tras.ov > ia.v - 4 || tras.gap < 110) && !out.bloqPos && !out.bloqNeg) {
        usadas[chave] = true;
        if (F1.sorteio(`defesa:${room.semente}:${p.id}:${chave}`)() < niv.defende) ia.defesa = { id: tras.oid, lado: dentro, ate: now + Math.min(3000, (dFreio / Math.max(ia.v, 60)) * 1000) };
      }
    }
    if (ia.defesa) {
      const emparelhou = out.bloqPos || out.bloqNeg;
      if (now > ia.defesa.ate || dFreio < 20 || ia.ult) ia.defesa = null;
      else if (emparelhou) out.desvio = (meu ? ia.lat : baseLat) - baseLat; // o atacante chegou ao lado: não se mexe mais
      else out.desvio = ia.defesa.lado * maxLat * 0.8 - baseLat;
    }
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
  const gasto = ia.pneu && ia.pneu.desgaste > F1.PENHASCO * 0.95;
  if (p.laps + 1 < prox.volta && !gasto && !room.direcao?.safety) return;
  const rel = (Math.floor(ia.s) - cor.i0 + pf.n) % pf.n;
  if (rel > 5) { // ainda não chegou: nos últimos 2 s antes da entrada já é fantasma (ninguém bate em quem está entrando)
    if ((pf.n - rel) * STEP < Math.max(ia.v, 60) * Contato.BOX_FANTASMA_MS / 1000) p.boxFant = Math.max(p.boxFant || 0, Date.now() + 250);
    return;
  }
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
    if (b.u >= cor.len) { b.u = cor.len; ia.box = null; p.box = null; p.boxFant = Date.now() + Contato.BOX_FANTASMA_MS; emit("box", { id: p.id, composto: b.composto, tempo: b.tempo, volta: b.volta }); }
  }
    ia.s = (cor.i0 + b.u) % pf.n; ia.lat = cor.latParada(b.u, b.garagem, b.lat0);
}
// O robô está preso? Parado (menos de V_PRESO) por T_PRESO segundos, ou sem andar nem T_SEM_ANDAR pontos de pista em 6 s (rodando no
// lugar, de lado no muro, na brita). Não conta no box, sob bandeira, antes de a corrida ficar de pé nem com o carro quebrado.
function encalhou(room, ia, car, now, dt, atras = false) {
  // esperando atrás de um carro à frente na própria faixa (parado ou lento) não é estar preso: é trânsito
  if (car.box?.fase || room.direcao?.safety || car.air || atras) { ia.parado = 0; ia.refProg = car.prog; ia.refT = now; return false; }
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
// ---------- a parada decidida pelo pneu, não só pelo plano ----------
// O plano (F1.estrategia) diz em que volta parar e com qual composto, mas o robô não pode seguir cego: uma parada antecipada
// (safety car) ou uma largada em tráfego desmancham a conta, e sem outra parada no plano ele rodava o resto da corrida com o
// pneu acabado (1,3x o tempo de volta). Então a cada passagem pela entrada do box o robô pergunta ao pneu: chega ao fim da
// corrida? Se sim, não para (só pela regra dos dois compostos, na última chance). Se não, para na volta do plano, ou antes se
// a próxima volta já passaria do penhasco, ou de graça sob safety car se o pneu já está pela metade.
// Depois da parada o composto é o que aguenta o resto da corrida (o mais rápido que aguenta), não o que o plano previa.
const MARGEM_PNEU = 1.12; // o desgaste real passa um pouco do teórico (tráfego, largada, escorregão)
const taxaDoPneu = (composto, fator) => (F1.PENHASCO / F1.vidaEmVoltas(composto, 1)) * (fator || 1) * MARGEM_PNEU; // desgaste por volta
function escolherComposto(restam, usados, fator, p) {
  const ordem = ["macio", "medio", "duro"].filter((c) => !p || F1.podeUsar(p, c)), aguenta = (c) => F1.vidaEmVoltas(c, fator * MARGEM_PNEU) >= restam;
  let lista = ordem.filter(aguenta); if (!lista.length) lista = ordem.slice(-1); // nem o mais duro chega: para de novo mais tarde
  if (!lista.length) return F1.compostoParaParada(p, "duro"); // tudo esgotado: repete o menos usado
  if (usados.size < 2) { const novos = lista.filter((c) => !usados.has(c)); if (novos.length) lista = novos; } // dois compostos: prefere um que ainda não usou
  return lista[0];
}
// O clima manda no pneu (corrida com chuva): o robô "sente" a água com o seu viés (`ia.vies`) e compara a estimativa de volta de cada
// composto (F1.compostoPorAgua, a conta simples do molhado). Seco → chuva quando o de chuva fica mais de 0,8 s mais rápido;
// chuva → seco quando o seco (o que aguenta o resto da corrida) fica mais de 0,8 s mais rápido. Cada robô tem o seu limite
// (o viés), então não entram no box todos juntos. Devolve o composto, ou null para seguir como está.
function trocaPeloClima(room, p, ia, pneu, cl, restam, usados, fator) {
  if (restam < 1) return null;
  const agua = Math.max(0, Math.min(1, cl.agua + (ia.vies || 0)));
  const livres = [...F1.SECOS, "chuva"].filter((c) => c === pneu.composto || F1.podeUsar(p, c));
  const melhor = F1.compostoPorAgua(room.config.pista, agua, livres, pneu.composto);
  if (pneu.composto !== "chuva") return melhor === "chuva" ? "chuva" : null;
  if (melhor === "chuva") return pneu.desgaste > F1.PENHASCO && F1.podeUsar(p, "chuva") ? "chuva" : null; // continua molhado: só troca o pneu de chuva se acabou
  return escolherComposto(restam, usados, fator, p); // secou: volta ao seco que aguenta o resto da corrida
}
function decidirParada(room, p, ia, car, spec, cl) {
  const voltas = room.config.voltas, feitas = p.laps || 0;
  if (!p.started || feitas + 1 >= voltas || car.box?.fase) return null; // na última volta o corredor passa pela chegada: sem box
  const chuvoso = !!(room.clima && room.clima.chove); // corrida com chuva: a regra dos dois compostos não vale e o plano de pneus seco fica de lado
  const planejada = !chuvoso && ia.plano && ia.plano.paradas[(p.paradas || []).length];
  const pneu = car.pneu, fator = spec.desgaste || 1, taxa = taxaDoPneu(pneu.composto, fator);
  const restam = voltas - feitas - 1, usados = new Set(p.compostos || [p.pneu || F1.COMPOSTO_PADRAO]);
  if (chuvoso && cl) { const pelaAgua = trocaPeloClima(room, p, ia, pneu, cl, restam, usados, fator); if (pelaAgua) return pelaAgua; if (pneu.composto === "chuva" && cl.agua + (ia.vies || 0) > 0.3) return null; }
  const chega = pneu.desgaste + taxa * (restam + 0.35) <= F1.PENHASCO; // o resto da corrida e o começo da volta de chegada
  const passaNaProxima = pneu.desgaste + taxa > F1.PENHASCO; // a volta que vem já passaria do penhasco
  let para = false;
  if (!chega) para = passaNaProxima || (planejada && feitas + 1 >= planejada.volta) || (room.direcao?.safety && pneu.desgaste > 0.3);
  if (!chuvoso && usados.size < 2 && restam <= 1) para = true; // a última chance de cumprir a regra dos dois compostos
  if (!para) return null;
  const aguentaPlano = planejada && planejada.composto !== pneu.composto && F1.podeUsar(p, planejada.composto) && F1.vidaEmVoltas(planejada.composto, fator * MARGEM_PNEU) >= restam;
  return aguentaPlano ? planejada.composto : escolherComposto(restam, usados, fator, p);
}
// Depois da bandeirada: fantasma (não bate e ninguém bate nele), no piloto automático da física a 70 u/s pela beira da pista. Antes ele
// ficava congelado onde cruzou a linha de chegada, e a galera que ainda corria dava de cara com um paredão de robôs parados.
function passoFantasma(room, p, ia, pf, dt, now) {
  const tr = Sim.criarPista(T.PISTAS[room.config.pista], room.config.pista), car = ia.sim;
  if (!car) return;
  car.fant = true;
  const amb = ia.ambFant || (ia.ambFant = { spec: pf.c, f1: true, ersAuto: false, fantasma: true, safety: false, agua: 0, semente: room.semente, id: p.id, grid: p.grid });
  amb.finish = p.finish; amb.voltas = room.config.voltas; amb.laps = p.laps || 0; amb.paradas = (p.paradas || []).length; amb.dano = p.dano || 0;
  const ent = ia.ent || (ia.ent = {}), ev = [];
  for (let s = 0, passos = Math.round(dt / Sim.PASSO); s < passos; s++) {
    ev.length = 0;
    Sim.passo(car, ent, amb, tr, ev);
    Contato.depoisDoPasso(room, p, car, now - dt * 1000 + (s + 1) * Sim.PASSO * 1000, [], false); // (só guarda o histórico)
  }
  ia.s = car.idx; ia.v = car.v; ia.lat = Sim.quadro(tr, car.x, car.y, car.idx).lat; ia.box = null; p.box = null;
  p.pos = { x: car.x, y: car.y, z: car.z, a: car.a, v: car.v, vx: car.vx, vy: car.vy, r: car.r, prog: car.prog, at: now };
}
function passoF1(room, p, ia, pf, dt, now, setor, emit, outros) {
  const tr = Sim.criarPista(T.PISTAS[room.config.pista], room.config.pista), car = ia.sim;
  const spec = pf.c, n = tr.n;
  // Também aceita ajustes explícitos de velocidade feitos pela sala e pelos testes.
  if (Math.abs(ia.v - car.v) > 0.01) car.v = ia.v;
  const i = car.idx, est = ia.estilo;
  ia.s = i; ia.lat = Sim.quadro(tr, car.x, car.y, i).lat;
  const saidaGrid = Math.min(1, ((car.prog - (car.gridIdx - n)) / 100));
  const linhaEm = (k, prog) => pf.lat[(k + 2) % n] * pf.fator + ia.jeito + Math.sin(prog / 105 + ia.tracadoId * 1.7) * 3
    + est.dentro * pf.linha.sinal[k % n] * Math.min(1, pf.kf[k % n] * 400) * 7;
  const linha = linhaEm(i, car.prog);
  const baseLat = ia.lat0 * (1 - saidaGrid) + linha * saidaGrid;
  const maxLat = tr.W / 2 - (ia.ult && ia.ult.parado ? 8 : 18);
  const cl = F1.climaEm(room.clima, now); // a água na pista agora (clima: f1-regras.js)
  const pneu = F1.aderencia(car.pneu, cl.agua), dano = F1.efeitoDoDano(p.dano), curva = pf.kf[i] > 1 / 600;
  const fis = perfilF1(pf, ia.nivel), topo = topoDe(pf);
  // molhado (ou pneu gasto): o freio segura menos, então o robô olha mais longe para começar a frear a tempo (no seco com o macio: 1)
  // (a conta é a da física: o freio pedido e o que o pneu segura antes de travar, `D.frenagemMaxima`, contra o do pneu de referência)
  const velFreio = Math.max(car.v, 60), ref = aderRef();
  const alongaFreio = Math.max(1, Math.min(2.2, D.frenagemMaxima(spec, velFreio, 0, { freio: ref.freio, grip: ref.grip }) / Math.max(1, D.frenagemMaxima(spec, velFreio, 0, { freio: pneu.freio * dano.freio, grip: pneu.grip * dano.grip }))));
  const olhar = Math.max(3, Math.ceil(Math.max(car.v, 30) * (tr.W <= LARGURA_ESTREITA ? 0.27 : 0.20) * alongaFreio / STEP)); // o perfil já antecipa a frenagem; circuitos estreitos pedem mais folga
  let alvo = Infinity;
  for (let k = 0; k <= olhar; k++) alvo = Math.min(alvo, fis[(i + k) % n]);
  // Mirabeau e o grampo de Mônaco exigem mais margem na chuva, inclusive na aproximação.
  const f = i / n, margemMolhada = room.config.pista === "monaco" ? Math.max(0, Math.min(1, (f - 0.29) / 0.03, (0.44 - f) / 0.02)) : 0;
  const cautela = 1 - 0.20 * cl.agua * margemMolhada;
  const vLivre = Math.min(spec.vmax * pneu.final * dano.final, alvo < topo * 0.97 ? alvo * Math.sqrt(pneu.grip * dano.grip) * cautela : alvo); // a velocidade do robô sem ninguém na frente
  // o plano da frente para o trânsito: a que distância é a próxima freada e qual é o lado de dentro da próxima curva
  const tf = transito(room, p, ia, pf, i, baseLat, maxLat, vLivre, { dFreio: distanciaDaFreada(fis, n, i, car.v), dentro: ladoDeDentro(pf, i), aderenciaFreio: cl.agua > 0 ? { freio: pneu.freio * dano.freio, grip: pneu.grip * dano.grip } : undefined });
  ia.desvio += (tf.desvio - ia.desvio) * Math.min(1, dt * 1.8);
  // a folga lateral de quem está ao lado: o robô fica entre os limites (e se está mais perto que a folga, se afasta)
  const entre = (l) => { let lo = Math.max(-maxLat, tf.limMin), hi = Math.min(maxLat, tf.limMax); if (lo > hi) lo = hi = (lo + hi) / 2; l = Math.max(lo, Math.min(hi, l)); if (tf.bloqPos) l = Math.min(l, Math.max(ia.lat, lo)); if (tf.bloqNeg) l = Math.max(l, Math.min(ia.lat, hi)); return l; };
  // o ponto que o volante mira, lá na frente, está sobre a linha DALI (não sobre o lado em que o carro está agora): é o que faz o
  // robô entrar na curva a tempo em vez de cortar por dentro
  const latAdiante = (j) => entre(Math.max(-maxLat, Math.min(maxLat, linhaEm(j, car.prog + (j - i + n) % n) * saidaGrid + ia.lat0 * (1 - saidaGrid) + ia.desvio)));
  const vac = F1.vacuoF1(tf.draft, curva);
  if (alvo < topo * 0.97) alvo *= Math.sqrt(pneu.grip * dano.grip * vac.aderencia) * (1 - 0.05 * cl.agua) * cautela; // só as curvas dependem da aderência (no molhado, mais 5% de cautela)
  alvo = Math.min(alvo, spec.vmax * pneu.final * dano.final);
  // Enquanto há pista livre ao lado, o ERS ajuda a passar. Se a porta fecha, o limite de tráfego manda frear.
  if (ia.ult && !tf.bloqPos && !tf.bloqNeg) alvo = Math.min(spec.vmax, alvo * 1.04);
  alvo = Math.min(alvo, tf.freio);
  // a batida abala o robô como a quem joga: a física já tira a aderência (car.inst, por 0,2 a 2 s); aqui ele também perde o ritmo (tira
  // o pé e dirige com mais cuidado) por mais um tempo, mais nos níveis fáceis e menos nos difíceis
  const ins = car.inst > 0 ? car.inst : 0;
  if (ins > (ia.susto || 0)) ia.vSusto = Math.max(car.v, 60); // a velocidade em que levou a pancada: o ritmo cai a partir dela e volta aos poucos
  ia.susto = Math.max(ins, (ia.susto || 0) - dt * 0.35);
  const medo = ia.susto * ({ facil: 1.2, medio: 1, dificil: 1 }[room.config.nivel] || 1);
  if (medo > 0.01) alvo = Math.min(alvo * (1 - 0.4 * Math.min(1, medo)), ia.vSusto * (1 - 0.4 * Math.min(1, medo)));
  if (p.quebrou) alvo = Math.min(alvo, spec.vmax * F1Equipes.EMERGENCIA);
  if (p.incidenteAte > now) alvo = Math.min(alvo, spec.vmax * 0.24);
  const relBox = tr.corredor ? (i - tr.corredor.i0 + n) % n : Infinity;
  // (só pesa a parada perto da entrada do corredor; nos 2 s antes de entrar o robô que vai parar já é fantasma: ninguém bate nele)
  const aEntrar = tr.corredor ? (n - relBox) % n : Infinity, antesDaEntrada = aEntrar * STEP < Math.max(car.v, 60) * Contato.BOX_FANTASMA_MS / 1000;
  let proxima = relBox <= 8 || antesDaEntrada ? decidirParada(room, p, ia, car, spec, cl) : null;
  // stop-and-go pendente: o robô cumpre na primeira passagem pelo box (a visita é só ele, sem trocar o pneu: amb.stopGo)
  const stopGo = p.stopGo && F1.stopGoCabe(p.laps, room.config.voltas) ? p.stopGo.s : 0;
  if (!proxima && stopGo && (relBox <= 8 || antesDaEntrada)) proxima = car.pneu ? car.pneu.composto : p.pneuAtual || "medio";
  if (proxima && antesDaEntrada && !car.box?.fase) p.boxFant = Math.max(p.boxFant || 0, now + 250);
  const estavaNoBox = !!p.box;
  const pedirBox = !!proxima; // (o composto pedido)
  const amb = { spec, dano: p.dano || 0, drsZona: p.drsZona ?? -1, safety: !!room.direcao?.safety,
    amarela: room.direcao?.amarelo?.setor === Math.floor(i / (n / T.SECTORS)), ersAuto: false,
    voltas: room.config.voltas, laps: p.laps || 0, paradas: (p.paradas || []).length,
    semente: room.semente, id: p.id, grid: p.grid, f1: true, agua: cl.agua, outros, stopGo };
  const ent = ia.ent || (ia.ent = {});
  const ev = [], evC = [];
  if (encalhou(room, ia, car, now, dt, tf.atras < 140)) { // preso (parado, rodado, de lado no muro ou sem andar): o "↺ Pista" do robô, do lado livre
    Sim.voltarParaPista(car, tr, ev);
    const q = tr.pts[car.idx], lado = tf.bloqPos && !tf.bloqNeg ? -1 : tf.bloqNeg && !tf.bloqPos ? 1 : 0, lat = lado * Math.min(maxLat, 40);
    car.x += q.nx * lat; car.y += q.ny * lat; car.sp = { x: car.x, y: car.y };
    ia.desvio = 0; ia.ult = null; ia.erro = null; ia.recuperacoes = (ia.recuperacoes || 0) + 1;
  }
  for (let s = 0, passos = Math.round(dt / Sim.PASSO); s < passos; s++) {
    ev.length = 0;
    // o volante e os pedais são calculados a cada passo da física (120 Hz), como quem joga: o robô sente o carro escorregar
    Sim.pilotoAutomatico(car, tr, spec, alvo, latAdiante, ent);
    if (ent.gas && (car.patina > PAT || Math.abs(car.alR) > ALFA_TRACAO)) ent.gas = 0; // a traseira já está no limite: tira o pé em vez de rodar
    const exc = Math.abs(car.alF) - ALFA_FRENTE; // a frente já passou do pico do pneu (anda de frente): mais volante só piora, alivia até ela voltar a pegar
    if (exc > 0 && car.alF * ent.steer < 0) ent.steer *= Math.max(0, 1 - exc * K_FRENTE);
    if (medo > 0.01) ent.steer = (ia.volante || 0) + (ent.steer - (ia.volante || 0)) * (1 - 0.85 * Math.min(1, medo)); // com o carro abalado o volante vai mais devagar
    ia.volante = ent.steer;
    if (ent.brake && car.travada > TRAVA_ABS) ent.brake = 0; // a roda da frente travou: solta o freio um instante (o ABS de quem sabe frear)
    ent.ers = !!ia.ult;
    ent.pedido = proxima;
    Sim.passo(car, ent, amb, tr, ev);
    // a batida deste passo: a mesma dos humanos (corrida-contato.js), com os outros carros na hora do passo; o robô também troca momento
    evC.length = 0;
    Contato.depoisDoPasso(room, p, car, now - dt * 1000 + (s + 1) * Sim.PASSO * 1000, evC, !amb.safety && p.finish == null && !p.dnf && !car.box?.fase);
    for (const e of evC) if (e.forca >= F1.BATIDA_MIN) emit("batida", { id: p.id, forca: e.forca, tipo: "carro", chave: "carro:" + e.id });
    for (const e of ev) {
      if (e.t === "setor") setor(p, e.s);
      else if (e.t === "box" && e.fase === "sai") emit("box", { id: p.id, composto: e.composto, tempo: e.tempo, volta: e.volta, stopGo: !!e.stopGo });
      else if (e.t === "muro" && e.forca >= F1.BATIDA_MIN) emit("batida", { id: p.id, forca: e.forca, tipo: "muro" });
    }
    amb.laps = p.laps || 0;
    amb.paradas = (p.paradas || []).length;
  }
  ia.s = car.idx; ia.v = car.v; ia.lat = Sim.quadro(tr, car.x, car.y, car.idx).lat;
  ia.pneu = car.pneu; ia.ers = car.ers; ia.box = car.box?.fase ? car.box : null; p.box = ia.box;
  if (estavaNoBox && !p.box) p.boxFant = now + Contato.BOX_FANTASMA_MS; // saiu do corredor: mais 2 s de fantasma
  p.pos = { x: car.x, y: car.y, z: car.z, a: car.a, v: car.v, vx: car.vx, vy: car.vy, r: car.r, prog: car.prog, at: now };
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
      else if (p.finish != null) passoFantasma(room, p, ia, pf, dt, now); // depois da bandeirada o carro segue rodando sozinho (como o dos humanos), em vez de parar na linha de chegada
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
  // (as batidas entre os carros: cada carro, humano ou robô, bate a cada passo da física: corrida-contato.js)
}
function possivel(pista, spec) { return perfilF1(perfil(pista, spec || F1Equipes.specDaEquipe("mclaren"), 0), 1); }
possivel.topo = (pista, spec) => topoDe(perfil(pista, spec || F1Equipes.specDaEquipe("mclaren"), 0));
module.exports = { idealDe, possivel, forcaDoContato, preparar, remover, largar, passo, NIVEIS, RITMO, GRID_F1, aprender, usarFonte, aprendido, tempoDaVolta, perfil, ritmoDosRobos, prazoDeChegada, voltaLancada, duracaoDaClassificacao, escolherComposto, decidirParada };
