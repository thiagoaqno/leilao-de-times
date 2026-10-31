// Corrida da Galera — as batidas entre carros no SERVIDOR (regras de F1), a cada passo da física de cada carro.
// Cada carro (humano ou robô) anda no seu próprio relógio de passos; para a batida valer o mesmo para os dois, o servidor guarda o
// HISTÓRICO de cada carro (uma amostra por passo, com a hora do passo) e, a cada passo de um carro, olha os outros NA HORA DESSE
// PASSO (interpolando o histórico; se o outro ainda não chegou lá, segue a velocidade dele por até 0,25 s). Assim a batida
// acontece onde os dois veem os carros, e não onde o outro estava "agora" no relógio do servidor.
//
// Quem detecta a batida primeiro troca o momento (sim.js: contatoCom) e deixa o impulso oposto numa fila do outro carro, que o aplica
// quando o seu relógio chega àquela hora (ou logo, se já passou): a mesma batida não conta duas vezes (`pares`) e o momento se conserva.
const Sim = require("./public/corrida/sim.js");
const T = require("./public/corrida/pistas.js");
const Pose = require("./public/corrida/pose.js"); // a mesma regra de pose do navegador (extrapolar)

const PASSO_MS = Sim.PASSO * 1000;
const N = 256;              // amostras guardadas por carro (2,1 s)
const ACEL_JANELA = 6;      // a aceleração de um carro que ainda não chegou à hora pedida vem de 6 passos atrás (50 ms)
const PAR_MS = 120;         // a mesma batida: dentro disto, só quem registrou primeiro troca o momento
const PENDENTE_MS = 800;    // um impulso que o outro carro não aplicou em tanto tempo (ficou parado, saiu) se perde

function estado(room) { const K = room.contato || (room.contato = { hist: new Map(), pend: new Map(), pares: new Map() }); return K.impactos ? K : (K.impactos = new Map(), K); }
function limpar(room) { room.contato = null; }

function novoHistorico() { return { n: 0, i: 0, t: new Float64Array(N), x: new Float64Array(N), y: new Float64Array(N), z: new Float64Array(N), a: new Float64Array(N), vx: new Float64Array(N), vy: new Float64Array(N), r: new Float64Array(N) }; }
// guarda o estado do carro `c` na hora `t` (ms do servidor)
function gravar(room, id, t, c) {
  const K = estado(room); let H = K.hist.get(id); if (!H) K.hist.set(id, H = novoHistorico());
  const i = H.i; if (H.n) { const ult = H.t[(i - 1 + N) % N]; if (t <= ult) t = ult + 0.001; } // (o relógio de um piloto pode recuar um pouco: as horas guardadas só crescem)
  H.t[i] = t; H.x[i] = c.x; H.y[i] = c.y; H.z[i] = c.z || 0; H.a[i] = c.a; H.vx[i] = c.vx; H.vy[i] = c.vy; H.r[i] = c.r || 0;
  H.i = (i + 1) % N; if (H.n < N) H.n++;
}
// o carro na hora `t`: interpola o histórico; depois da última amostra segue o movimento (pose.js, extrapolar: velocidade e aceleração, que se
// apagam se o histórico demora); antes da primeira, fica nela
const SB = {}, SA = {}, EX = {};
const amostraDe = (H, i, a) => { a.t = H.t[i]; a.x = H.x[i]; a.y = H.y[i]; a.z = H.z[i]; a.a = H.a[i]; a.vx = H.vx[i]; a.vy = H.vy[i]; a.r = H.r[i]; return a; };
function em(H, t, o) {
  const ult = (H.i - 1 + N) % N, tn = H.t[ult];
  if (t >= tn - 1e-6) {
    const antes = H.n > ACEL_JANELA ? (ult - ACEL_JANELA + N) % N : -1;
    Pose.extrapolar(amostraDe(H, ult, SB), antes >= 0 ? amostraDe(H, antes, SA) : null, t, EX);
    o.x = EX.x; o.y = EX.y; o.z = EX.z; o.a = EX.a; o.vx = EX.vx; o.vy = EX.vy; o.r = EX.r;
    return o;
  }
  let b = ult, c = 0; // anda para trás até achar a amostra `a` no ou antes de `t` (b é a seguinte)
  while (c < H.n - 1 && H.t[(b - 1 + N) % N] > t) { b = (b - 1 + N) % N; c++; }
  const a = (b - 1 + N) % N;
  if (c >= H.n - 1) { o.x = H.x[b]; o.y = H.y[b]; o.z = H.z[b]; o.a = H.a[b]; o.vx = H.vx[b]; o.vy = H.vy[b]; o.r = H.r[b]; return o; } // antes da primeira amostra: fica nela
  const u = Math.max(0, Math.min(1, (t - H.t[a]) / Math.max(1e-6, H.t[b] - H.t[a]))); let da = H.a[b] - H.a[a]; da = Math.atan2(Math.sin(da), Math.cos(da));
  o.x = H.x[a] + (H.x[b] - H.x[a]) * u; o.y = H.y[a] + (H.y[b] - H.y[a]) * u; o.z = H.z[a] + (H.z[b] - H.z[a]) * u; o.a = H.a[a] + da * u;
  o.vx = H.vx[a] + (H.vx[b] - H.vx[a]) * u; o.vy = H.vy[a] + (H.vy[b] - H.vy[a]) * u; o.r = H.r[a] + (H.r[b] - H.r[a]) * u;
  return o;
}

const specBase = (q) => q.spec || T.CARROS[q.car] || T.CARROS.equilibrado;
function geometria(q) { const [L, W] = Sim.dimensoes(q.car); return { L, W, massa: Sim.massaDe(specBase(q)) }; }

// Os outros carros na hora `t` (para o carro de `p`). Quem recebeu a bandeirada ou está no box é fantasma; quem perdeu o carro, dnf.
function outrosNaHora(room, p, t) {
  const K = estado(room), out = [];
  for (const id of room.order) {
    const q = room.players[id]; if (!q || q === p) continue;
    const H = K.hist.get(id), m = { id, x: 0, y: 0, z: 0, a: 0, vx: 0, vy: 0, r: 0, ...geometria(q), dnf: !!q.dnf, fant: q.finish != null || fantasmaDoBox(q, t) };
    if (H && H.n) em(H, t, m);
    else if (q.pos) { m.x = q.pos.x; m.y = q.pos.y; m.z = q.pos.z || 0; m.a = q.pos.a; m.vx = Math.cos(q.pos.a) * (q.pos.v || 0); m.vy = Math.sin(q.pos.a) * (q.pos.v || 0); }
    else continue;
    out.push(m);
  }
  return out;
}
// No box o carro é fantasma, e também por BOX_FANTASMA_MS na saída (`boxFant`: até quando) e, nos robôs, na chegada à entrada
const BOX_FANTASMA_MS = 2000;
// (e fantasma também o carro parado na pista que foi recolocado: `fantAte`, corrida-parados.js)
const fantasmaDoBox = (q, agora = Date.now()) => !!q.box || agora < (q.boxFant || 0) || agora < (q.fantAte || 0);
const chave = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

// O IMPACTO de cada par de carros, guardado no momento em que o primeiro dos dois detecta a batida e ANTES de o impulso trocar as
// velocidades (sim.js: contatoCom): a velocidade de aproximação (`forca`, u/s: a velocidade relativa na direção do outro carro) e quem
// causou (`culpado`: o id, ou null quando ninguém se aproximou claramente mais que o outro). A direção de prova lê daqui a gravidade e a
// culpa quando cada carro avisa a sua batida (o do batido só avisa depois, com as velocidades já trocadas).
const IMPACTO_VALE_MS = 8000;
function impactoDe(room, a, b) { const i = estado(room).impactos.get(chave(a, b)); return i || null; }
// (a freada de cada um nos 300 ms antes do impacto, em u/s²: positiva é freando)
function freada(K, id, t) {
  const H = K.hist.get(id); if (!H || !H.n) return 0;
  const a = {}, b = {}; em(H, t - 300, a); em(H, t, b);
  return (Math.hypot(a.vx, a.vy) - Math.hypot(b.vx, b.vy)) / 0.3;
}
function guardarImpacto(K, idA, e, t) {
  if (!e.pre) return;
  for (const [k, i] of K.impactos) if (t - i.t > IMPACTO_VALE_MS) K.impactos.delete(k);
  K.impactos.set(chave(idA, e.id), { t, forca: e.forca, culpado: e.culpa === 1 ? idA : e.culpa === -1 ? e.id : null, de: idA, pre: e.pre, freada: { [idA]: freada(K, idA, t), [e.id]: freada(K, e.id, t) } });
}

// Depois de cada passo do carro `c` do jogador `p`, na hora `tFim` (ms do servidor): aplica os impulsos que os outros deixaram para
// ele, bate nos outros (se `ativo`) e guarda o estado no histórico. As batidas vão em `ev` como { t: "carro", id, forca, k }.
function depoisDoPasso(room, p, c, tFim, ev, ativo) {
  const K = estado(room);
  const fila = K.pend.get(p.id);
  if (fila && fila.length) {
    for (let i = fila.length - 1; i >= 0; i--) {
      const e = fila[i];
      if (tFim - e.t > PENDENTE_MS) { fila.splice(i, 1); continue; }
      if (e.t > tFim) continue; // o meu relógio ainda não chegou à hora da batida
      fila.splice(i, 1);
      if (!ativo) continue;
      Sim.impulsoExterno(c, e.de, e.forca);
      if (ev && e.forca >= Sim.FORCA_EV) ev.push({ t: "carro", id: e.por, forca: e.forca, k: c.tick });
    }
  }
  if (ativo && !c.air && !c.fant && !fantasmaDoBox(p, tFim)) {
    const outros = outrosNaHora(room, p, tFim), eu = geometria(p), evl = [];
    Sim.contatoPasso(c, eu, outros, evl, null, Sim.PASSO, (o) => { // pode trocar momento? Não, se o outro carro registrou esta batida agora há pouco
      const par = K.pares.get(chave(p.id, o.id));
      return !(par && Math.abs(tFim - par.t) < PAR_MS && par.dono !== p.id);
    });
    for (const e of evl) {
      K.pares.set(chave(p.id, e.id), { t: tFim, dono: p.id });
      guardarImpacto(K, p.id, e, tFim);
      if (e.de) { let f = K.pend.get(e.id); if (!f) K.pend.set(e.id, f = []); if (f.length > 8) f.shift(); f.push({ t: tFim, de: e.de, forca: e.forca, por: p.id }); }
      if (ev && e.forca >= Sim.FORCA_EV) ev.push(e);
    }
  }
  gravar(room, p.id, tFim, c);
}

module.exports = { BOX_FANTASMA_MS, fantasmaDoBox, impactoDe, estado, limpar, gravar, em, outrosNaHora, depoisDoPasso, geometria, PAR_MS, N };
