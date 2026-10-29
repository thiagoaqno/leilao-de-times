// Corrida da Galera — a transmissão de TV antes da largada (regras de F1).
// O servidor dá um tempo próprio para ela (`room.tvAte`, corrida.js): 25 s numa temporada, 20 s fora dela, e só DEPOIS vêm as
// luzes. Quatro blocos, cada um com a sua câmera e o seu cartão no estilo da TV: A PISTA (um voo contínuo pelo mapa inteiro, com
// o cartão do circuito e o minimapa), O CLIMA, O CAMPEONATO (só em temporada: pilotos e equipes) e O GRID (a câmera passa
// entre os carros, com a pole em destaque). Nos últimos 1,3 s a câmera funde com a normal. A sequência anda pelo relógio do
// servidor e termina em `tvAte`; encolhe para caber se o navegador chegou atrasado. Pular: botão, Esc ou toque (`tvpular`).
// O que NÃO existe no jogo (e por isso é estimado, sem mexer na física): o clima. Ele sai da hora do GP, de uma tabela de
// temperaturas típicas por circuito e da semente do GP, igual para todos na sala.
import { E, PISTAS, $, sNow, me, act } from "./estado.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), suave = (x) => x * x * (3 - 2 * x);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const tempo = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`;

// país, nome do circuito, temperatura do ar típica da época do GP (°C) e céu (0 limpo, 1 parcial, 2 nublado)
const INFO = {
  monaco: ["Mônaco", "Circuit de Monaco", 22, 1], interlagos: ["Brasil", "Autódromo José Carlos Pace", 24, 2], monza: ["Itália", "Autodromo Nazionale Monza", 25, 0],
  barcelona: ["Espanha", "Circuit de Barcelona-Catalunya", 23, 0], silverstone: ["Reino Unido", "Silverstone Circuit", 19, 2], melbourne: ["Austrália", "Albert Park Circuit", 22, 1],
  xangai: ["China", "Shanghai International Circuit", 18, 2], suzuka: ["Japão", "Suzuka International Racing Course", 21, 1], bahrein: ["Bahrein", "Bahrain International Circuit", 28, 0],
  jeddah: ["Arábia Saudita", "Jeddah Corniche Circuit", 29, 0], miami: ["Estados Unidos", "Miami International Autodrome", 30, 1], montreal: ["Canadá", "Circuit Gilles-Villeneuve", 20, 1],
  redbullring: ["Áustria", "Red Bull Ring", 22, 1], spa: ["Bélgica", "Circuit de Spa-Francorchamps", 17, 2], hungaroring: ["Hungria", "Hungaroring", 28, 0],
  zandvoort: ["Países Baixos", "Circuit Zandvoort", 20, 1], madri: ["Espanha", "Circuito de Madring", 27, 0], baku: ["Azerbaijão", "Baku City Circuit", 25, 0],
  singapura: ["Singapura", "Marina Bay Street Circuit", 30, 1], austin: ["Estados Unidos", "Circuit of the Americas", 27, 0], mexico: ["México", "Autódromo Hermanos Rodríguez", 24, 1],
  lasvegas: ["Estados Unidos", "Las Vegas Street Circuit", 17, 0], catar: ["Catar", "Losail International Circuit", 30, 0], abudhabi: ["Emirados Árabes", "Yas Marina Circuit", 28, 0],
  nurburgring: ["Alemanha", "Nürburgring", 15, 2], rio: ["Brasil", "Rio de Janeiro", 28, 1], deserto: ["", "Deserto Dourado", 36, 0], serra: ["", "Serra Verde", 14, 1],
};
const infoDe = (id) => INFO[id] || ["", PISTAS[id]?.name || id, 22, 1];

// ---------- as contas (puras) ----------
// extensão em metros (a escala do velocímetro, a mesma da torre), curvas (trechos que viram pelo menos ~29°) e as duas curvas
// mais fechadas (o começo de cada uma, para os voos); `pts` fecha a volta no primeiro ponto
export function medirPista(pts) {
  const n = pts.length, d = [], mDe = (u) => (window.HudTorre ? window.HudTorre.mDe(u) : (u * 0.75) / 3.6);
  let L = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; L += Math.hypot(b.x - a.x, b.y - a.y);
    let x = Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx); d.push(Math.atan2(Math.sin(x), Math.cos(x)));
  }
  let ini = 0, melhor = 1e9; // começa onde a pista está mais reta, para não cortar uma curva ao meio
  for (let i = 0; i < n; i++) { const s = Math.abs(d[i] + d[(i + 1) % n] + d[(i + 2) % n]); if (s < melhor) { melhor = s; ini = i; } }
  let curvas = 0, soma = 0, sinal = 0, vazio = 0;
  const fecha = () => { if (Math.abs(soma) >= 0.5) curvas++; soma = 0; sinal = 0; vazio = 0; };
  for (let k = 0; k < n; k++) {
    const x = d[(ini + k) % n];
    if (Math.abs(x) > 0.0035) { if (sinal && Math.sign(x) !== sinal) fecha(); sinal = Math.sign(x); soma += x; vazio = 0; } else if (sinal && ++vazio > 3) fecha();
  }
  fecha();
  // as curvas mais fechadas: a janela de 50 pontos que mais vira, longe da linha de chegada e uma da outra
  const J = 50, nota = (i) => { let s = 0; for (let k = 0; k < J; k++) s += d[(i + k) % n]; return Math.abs(s); };
  const dist = (a, b) => { const x = Math.abs(a - b); return Math.min(x, n - x); };
  let c1 = -1, c2 = -1, n1 = -1, n2 = -1;
  for (let i = Math.floor(n * 0.1); i < n * 0.9; i += 3) { const s = nota(i); if (s > n1) { n1 = s; c1 = i; } }
  for (let i = Math.floor(n * 0.1); i < n * 0.9; i += 3) { if (dist(i, c1) < n * 0.2) continue; const s = nota(i); if (s > n2) { n2 = s; c2 = i; } }
  return { metros: mDe(L), curvas, marcantes: [c1, c2].filter((i) => i >= 0).sort((a, b) => a - b) };
}
// clima estimado: igual para todos da sala (a semente do GP), só para a transmissão
export function climaDoGP(S) {
  const id = S.config.pista, info = infoDe(id), noite = S.config.hora === "noite", ceu = info[3];
  const r = (k) => hash(`${S.semente}:${id}:${k}`);
  const ar = Math.round(info[2] + (r("ar") - 0.5) * 6 - (noite ? 5 : 0));
  const pista = Math.round(ar + (noite ? 2 + r("pista") * 3 : [16, 11, 6][ceu] + r("pista") * 4));
  const cond = noite ? ["Noite limpa", "Noite de nuvens ralas", "Noite nublada"][ceu] : ["Ensolarado", "Parcialmente nublado", "Nublado"][ceu];
  return { cond, ar, pista, umidade: Math.round(35 + ceu * 14 + r("umid") * 18 + (noite ? 8 : 0)), vento: Math.round(5 + r("vento") * 17) };
}
// o ponto da pista na posição fracionária `f` (volta fechada)
function ponto(tr, f) {
  const n = tr.n, i = Math.floor(f), t = f - i, a = tr.pts[((i % n) + n) % n], b = tr.pts[(((i + 1) % n) + n) % n];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, h: (a.h || 0) + ((b.h || 0) - (a.h || 0)) * t, tx: a.tx, ty: a.ty };
}

// ---------- o voo do bloco "O circuito" ----------
// Um voo só, sem cortes: sai alto e longe, varre o cenário em volta (por cima das arquibancadas e dos prédios reservados da
// pista), sobe e abre para mostrar o traçado inteiro e desce até a reta de largada, chegando no sentido da corrida. O
// caminho no chão é uma curva Catmull-Rom que anda por comprimento de arco (velocidade parecida o tempo todo); a altura é
// uma curva monótona por trecho (PCHIP: sobe e desce sem estourar para baixo do ponto seguinte). A câmera olha um pedaço
// à frente no caminho, então a rotação sai suave: só gira o que o caminho gira. Só lê a pista (`tr.chao` é o relevo).
const catmull = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
const mix = (a, b, t) => a + (b - a) * t;
function pchip(xs, ys) { // interpolação cúbica que não passa dos valores vizinhos
  const n = xs.length, h = [], dl = [], m = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i] || 1e-6); dl.push((ys[i + 1] - ys[i]) / h[i]); }
  m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = dl[i - 1] * dl[i] <= 0 ? 0 : (2 * dl[i - 1] * dl[i]) / (dl[i - 1] + dl[i]);
  return (x) => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const t = lim((x - xs[i]) / h[i]), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
export function montarVoo(tr) {
  const { pts, n, W } = tr, mundo = tr.t.world, chao = (x, z) => { try { return (tr.chao && tr.chao(x, z)) || 0; } catch { return 0; } };
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; // a caixa do traçado
  for (let i = 0; i < n; i += 4) { const p = pts[i]; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(400, Math.hypot(x1 - x0, y1 - y0) / 2);
  const P0 = pts[0], T = { x: P0.tx, y: P0.ty }, N = { x: -P0.ty, y: P0.tx };
  const angDe = (x, z) => Math.atan2(z - cy, x - cx), volta = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const thS = angDe(P0.x, P0.y), d = Math.sign((P0.x - cx) * T.y - (P0.y - cy) * T.x) || 1; // d: o sentido em que a corrida gira em volta do meio
  const antes = (x, z) => d * volta(thS - angDe(x, z)); // quanto falta (em rad) para chegar à largada girando no sentido da corrida: 0 a pi
  const noRaio = (ang, k) => ({ x: cx + Math.cos(thS - d * ang) * R * k, z: cy + Math.sin(thS - d * ang) * R * k });
  // marcos de cenário para sobrevoar: o meio de cada arquibancada e as estruturas reservadas de maior raio (prédios, torres)
  const marcos = [];
  for (const a of tr.arqDegraus || []) {
    const i1 = a.i1 < a.i0 ? a.i1 + n : a.i1, p = pts[((a.i0 + i1) >> 1) % n], off = a.l0 + a.lado * a.degraus * 4.5;
    marcos.push({ x: p.x + p.nx * off, z: p.y + p.ny * off, h: 118, peso: 4 });
  }
  const arqs = marcos.slice();
  for (const [x, z, r] of tr.reservado || []) if (r >= 40 && arqs.every((m) => Math.hypot(m.x - x, m.z - z) > 160)) marcos.push({ x, z, h: 190, peso: r / 60 });
  // até 3 marcos, cada um numa parte diferente da volta (pelo menos 0,5 rad entre si), antes do ponto da abertura e dentro do mundo
  const sel = [];
  for (const m of marcos.sort((a, b) => b.peso - a.peso)) {
    const a = antes(m.x, m.z);
    if (m.x < 0 || m.z < 0 || m.x > mundo || m.z > mundo || a < 1.0 || a > 3 || sel.some((s) => Math.abs(volta(angDe(s.x, s.z) - angDe(m.x, m.z))) < 0.5)) continue;
    sel.push(m); if (sel.length >= 3) break;
  }
  // o anel: do outro lado do mundo, alto, descendo e fechando em volta do circuito, com os marcos no meio (o marco toma o lugar do ponto do anel perto dele)
  const dentro = (v) => Math.max(-600, Math.min(mundo + 600, v));
  const itens = sel.map((m) => ({ x: m.x, z: m.z, y: Math.max(m.h, chao(m.x, m.z) + m.h), ang: antes(m.x, m.z) }));
  for (const [ang, k, h] of [[0.97, 1.6, 420], [0.8, 1.4, 260], [0.64, 1.3, 190]]) {
    if (sel.some((m) => Math.abs(antes(m.x, m.z) - ang * Math.PI) < 0.3)) continue;
    const q = noRaio(ang * Math.PI, k), x = dentro(q.x), z = dentro(q.z);
    itens.push({ x, z, y: Math.max(h, chao(x, z) + 120), ang: ang * Math.PI });
  }
  const ctl = itens.sort((a, b) => b.ang - a.ang).map(({ x, y, z }) => ({ x, y, z }));
  // a abertura: bem alto, um pouco para dentro do traçado, olhando o meio dele com tudo no quadro
  const Hrev = Math.max(450, Math.min(R * 1.25, 2200)), qr = noRaio(0.36 * Math.PI, 1.3);
  const rev = { x: qr.x, y: Hrev, z: qr.z };
  ctl.push(rev);
  // a descida: sobre a reta de largada, vindo de trás, cada vez mais baixa e perto do chão
  const lat = W * 0.28, ap = (dd, alt) => ({ x: P0.x - T.x * dd + N.x * lat, y: (P0.h || 0) + alt, z: P0.y - T.y * dd + N.y * lat });
  ctl.push(ap(1000, 150), ap(420, 70), ap(110, 32), ap(-60, 24), ap(-420, 22)); // (o último só dá a direção do olhar no fim)
  const iRev = ctl.indexOf(rev), iFim = ctl.length - 2; // a câmera termina no ponto "-60"
  // o caminho no chão (Catmull-Rom), medido por comprimento de arco; a altura vem das chaves por PCHIP
  const NS = 40, amostras = [], g = (i) => ctl[Math.max(0, Math.min(ctl.length - 1, i))];
  for (let i = 0; i < ctl.length - 1; i++) for (let k = 0; k < NS; k++) {
    const t = k / NS, a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2);
    amostras.push({ x: catmull(a.x, b.x, c.x, e.x, t), z: catmull(a.z, b.z, c.z, e.z, t) });
  }
  amostras.push({ x: ctl[ctl.length - 1].x, z: ctl[ctl.length - 1].z });
  const arcoH = [0]; for (let i = 1; i < amostras.length; i++) arcoH.push(arcoH[i - 1] + Math.hypot(amostras[i].x - amostras[i - 1].x, amostras[i].z - amostras[i - 1].z));
  const altura = pchip(ctl.map((_, i) => arcoH[i * NS]), ctl.map((p) => p.y));
  for (let i = 0; i < amostras.length; i++) amostras[i].y = altura(arcoH[i]);
  // o comprimento de arco em 3D: assim a subida e a descida também andam na mesma velocidade que o resto
  const arco = [0]; for (let i = 1; i < amostras.length; i++) arco.push(arco[i - 1] + Math.hypot(amostras[i].x - amostras[i - 1].x, amostras[i].y - amostras[i - 1].y, amostras[i].z - amostras[i - 1].z));
  const total = arco[arco.length - 1], sChave = ctl.map((_, i) => arco[i * NS]), sRev = sChave[iRev], sApro = sChave[iRev + 2], sFim = sChave[iFim];
  const em = (s) => { // o ponto do voo a `s` de comprimento
    s = lim(s, 0, total); let a = 0, b = arco.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (arco[m] <= s) a = m; else b = m; }
    const t = (s - arco[a]) / ((arco[b] - arco[a]) || 1), p = amostras[a], q = amostras[b];
    return { x: mix(p.x, q.x, t), y: mix(p.y, q.y, t), z: mix(p.z, q.z, t) };
  };
  const adiante = Math.max(300, R * 0.6), foco = { x: cx, z: cy }; // quanto à frente a câmera olha; o meio do traçado
  const sDe = (u) => (0.4 * u + 0.6 * suave(u)) * sFim; // o ease: sai e chega mais devagar, sem parar
  const unit = (v) => { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m }; };
  // a DIREÇÃO do olhar (e não um ponto no chão: passar perto de um ponto fixo faria a câmera girar rápido): mistura a direção do
  // caminho à frente com a direção do meio do traçado. Boa parte no meio o tempo todo (gira devagar), todo na abertura, e na
  // descida volta para a frente. A direção é tabelada e suavizada duas vezes (média móvel), então nunca vira rápido.
  const direcao = (u) => {
    const s = sDe(u), P = em(s), A = em(s + adiante), w = s < sRev ? mix(0.6, 1, suave(lim(s / sRev))) : 1 - suave(lim((s - sRev) / (sApro - sRev)));
    const F = unit({ x: A.x - P.x, y: mix(chao(A.x, A.z), P.y, 0.2) - P.y, z: A.z - P.z }), C = unit({ x: foco.x - P.x, y: -P.y, z: foco.z - P.z });
    return { x: mix(F.x, C.x, w), y: mix(F.y, C.y, w), z: mix(F.z, C.z, w), w };
  };
  const NT = 240, RAIO = 20;
  let tab = Array.from({ length: NT + 1 }, (_, k) => direcao(k / NT));
  for (let passo = 0; passo < 2; passo++) {
    const ant = tab; tab = ant.map((_, k) => { const o = { x: 0, y: 0, z: 0, w: 0 }; for (let j = k - RAIO; j <= k + RAIO; j++) { const q = ant[Math.max(0, Math.min(NT, j))]; o.x += q.x; o.y += q.y; o.z += q.z; o.w += q.w; } const nn = 2 * RAIO + 1; return { x: o.x / nn, y: o.y / nn, z: o.z / nn, w: o.w / nn }; });
  }
  return {
    pontos: ctl.length, marcos: sel.length, comprimento: sFim,
    // `u`: de 0 a 1 no bloco → posição da câmera, alvo e fov (e o ponto do chão olhado, para o minimapa)
    quadro(u) {
      u = lim(u); const P = em(sDe(u)), k = u * NT, i = Math.min(NT - 1, Math.floor(k)), t = k - i, p = tab[i], q = tab[i + 1];
      const D = unit({ x: mix(p.x, q.x, t), y: mix(p.y, q.y, t), z: mix(p.z, q.z, t) }), w = mix(p.w, q.w, t), y = Math.max(P.y, chao(P.x, P.z) + (u > 0.9 ? 14 : 40));
      const dc = D.y < -0.05 ? Math.min(4000, y / -D.y) : 1500; // onde o olhar toca o chão
      return { x: P.x, y, z: P.z, ax: P.x + D.x * 1000, ay: y + D.y * 1000, az: P.z + D.z * 1000, fov: 60 + 6 * w, gx: P.x + D.x * dc, gz: P.z + D.z * dc };
    },
  };
}

// ---------- os cartões ----------
const equipeDe = (id) => (window.F1Pilotos && window.F1Pilotos.EQUIPES[id]) || null;
const corDe = (p) => (equipeDe(p.equipe) || {}).cor || p.color || "#888";
function cartaPista(S, tr, med) {
  const info = infoDe(S.config.pista), voltas = S.config.voltas, km = med.metros / 1000, drs = (tr.t.drs || []).length, d = S.tv;
  const celula = (rot, val, id = "") => `<div><dt>${rot}</dt><dd${id ? ` id="${id}"` : ""}>${val}</dd></div>`;
  return `<div class="tvCarta tvPista" data-b="pista"><div class="tvKicker">${info[0] ? esc(info[0]) + " · " : ""}Fórmula 1${d && d.total ? ` · rodada ${d.gp} de ${d.total}` : ""}</div>
    <h3>${esc(info[1])}</h3><div class="tvMiniBox"><canvas class="tvMini" width="320" height="220"></canvas><i class="tvPonto"></i></div>
    <dl>${celula("Extensão", `${km.toFixed(2).replace(".", ",")} km`)}${celula("Voltas", voltas)}${celula("Distância", `${(km * voltas).toFixed(1).replace(".", ",")} km`)}${celula("Curvas", `~${med.curvas}`)}${celula("Zonas de DRS", drs || "—")}${celula("Recorde", "—", "tvRecorde")}</dl></div>`;
}
// o clima de verdade da corrida (o roteiro sorteado no servidor, S.clima): como a pista larga e se há chuva a caminho
function climaReal(S) {
  const F = window.F1Regras, ini = F && S.clima ? F.climaEm(S.clima, S.clima.t0) : null;
  if (!ini || !S.clima.chove) return { cond: null, pista: "Seca", umidade: 0 };
  if (ini.chuva) return { cond: ini.garoa ? "Garoa" : "Chovendo", pista: ini.encharcada ? "Encharcada" : "Molhada", umidade: 90 };
  if (ini.molhada) return { cond: "Pista molhada, secando", pista: "Molhada", umidade: 80 };
  return { cond: "Chance de chuva", pista: "Seca", umidade: 75 };
}
function cartaClima(S) {
  const c = climaDoGP(S), r = climaReal(S), m = me(), pn = m && window.F1Regras && window.F1Regras.PNEUS[m.pneu];
  const celula = (rot, val) => `<div><dt>${rot}</dt><dd>${val}</dd></div>`;
  return `<div class="tvCarta tvClima" data-b="clima"><div class="tvKicker">Condições da corrida</div><h3>${r.cond || c.cond}</h3>
    <dl>${celula("Ar", `${c.ar}°C`)}${celula("Pista", `${c.pista}°C`)}${celula("Umidade", `${Math.max(c.umidade, r.umidade)}%`)}${celula("Vento", `${c.vento} km/h`)}${celula("Pista", r.pista)}${pn ? celula("Seu pneu", `<u class="pn" style="--c:${pn.cor}"></u> ${esc(pn.nome)}`) : ""}</dl></div>`;
}
function cartaCampeonato(S) {
  const d = S.tv, eu = (me() || {}).name, linha = (p, tipo) => {
    const cor = tipo === "p" ? corDe(p) : (equipeDe(p.id) || {}).cor || "#888", meu = tipo === "p" ? p.humano && p.nome === eu : p.humana && p.id === (me() || {}).equipe;
    return `<li class="${p.humano || p.humana ? "hum" : ""}${meu ? " eu" : ""}" style="--c:${cor}"><b>${p.pos}</b><span>${esc(p.nome)}</span><em>${p.pontos}</em></li>`;
  };
  return `<div class="tvCarta tvCamp" data-b="camp"><div class="tvKicker">Campeonato · após ${d.gp - 1} GP${d.gp - 1 > 1 ? "s" : ""}</div>
    <div class="tvDuas"><div><h3>Pilotos</h3><ol>${d.pilotos.map((p) => linha(p, "p")).join("")}</ol></div><div><h3>Equipes</h3><ol>${d.equipes.map((p) => linha(p, "e")).join("")}</ol></div></div></div>`;
}
function cartaGrid(S) {
  const eu = me(), lista = [...S.players].sort((a, b) => a.grid - b.grid);
  const linha = (p) => `<li class="${p.grid === 0 ? "pole" : ""}${eu && p.id === eu.id ? " eu" : ""}" style="--c:${corDe(p)}"><b>${p.grid + 1}</b><span>${esc(p.nomeCompleto || p.name)}</span><em>${esc(p.grid === 0 ? "POLE" : (equipeDe(p.equipe) || {}).sigla || "")}</em></li>`;
  const meio = Math.ceil(lista.length / 2);
  return `<div class="tvCarta tvGrid" data-b="grid"><div class="tvKicker">Grid de largada</div><div class="tvDuas"><ol>${lista.slice(0, meio).map(linha).join("")}</ol><ol start="${meio + 1}">${lista.slice(meio).map(linha).join("")}</ol></div></div>`;
}
// o traçado no minimapa (a mesma largura em todo circuito) e os pontos de DRS em verde
function desenharMini(cv, tr) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height, pts = tr.pts;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const m = 16, k = Math.min((W - 2 * m) / (x1 - x0 || 1), (H - 2 * m) / (y1 - y0 || 1)), ox = (W - (x1 - x0) * k) / 2, oy = (H - (y1 - y0) * k) / 2;
  const X = (p) => ox + (p.x - x0) * k, Y = (p) => oy + (p.y - y0) * k, trecho = (a, b) => { c.beginPath(); for (let i = a; i <= b; i += 2) { const p = pts[i % tr.n]; i === a ? c.moveTo(X(p), Y(p)) : c.lineTo(X(p), Y(p)); } c.stroke(); };
  c.lineJoin = c.lineCap = "round"; c.strokeStyle = "#000a"; c.lineWidth = 9; trecho(0, tr.n);
  c.strokeStyle = "#f4f5f5"; c.lineWidth = 5; trecho(0, tr.n);
  c.strokeStyle = "#39c988"; c.lineWidth = 5; for (const z of tr.t.drs || []) trecho(Math.floor(z[0] * tr.n), Math.floor(z[1] * tr.n)); // (detecção, abertura, fim)
  c.fillStyle = "#e10600"; c.beginPath(); c.arc(X(pts[0]), Y(pts[0]), 6, 0, 7); c.fill(); // a linha de chegada
  return { ondeXY: (x, z) => [lim(((ox + (x - x0) * k) / W) * 100, 3, 97), lim(((oy + (z - y0) * k) / H) * 100, 3, 97)], onde: (i) => { const p = pts[((Math.floor(i) % tr.n) + tr.n) % tr.n]; return [(X(p) / W) * 100, (Y(p) / H) * 100]; } };
}

// ---------- a sequência ----------
const BASE = { pista: 9.5, clima: 4, camp: 6.5, grid: 5 }; // segundos; encolhem se faltar tempo e o grid pega a sobra
const TITULO = { pista: "O circuito", clima: "O clima", camp: "O campeonato", grid: "O grid de largada" };
const MIN_S = 7; // com menos que isso para o fim da transmissão, não vale começar
let ultimo = null;
export function pularTV() {
  const race = ultimo; if (!race || !race.tv || race.tv.espera) return;
  const tv = race.tv; tv.el.remove(); race.tv = { espera: true, chip: criarChip(tv.el.parentNode) };
  if (window.Narrador) window.Narrador.parar(); // pular a transmissão corta o narrador
  act("tvpular");
}
function criarChip(pai) { const c = document.createElement("div"); c.className = "tvEspera"; c.textContent = "Esperando os outros pilotos pularem a transmissão…"; pai.appendChild(c); return c; }
function acabar(race) {
  const tv = race.tv; if (tv) { if (tv.el) tv.el.remove(); if (tv.chip) tv.chip.remove(); }
  // fim natural: a fala do narrador continua por cima do grid parado, até as luzes; fim antecipado (todos pularam): corta
  if (window.Narrador && !(tv && tv.total && sNow() - tv.ini >= tv.total * 1000 - 500)) window.Narrador.parar();
  race.tv = null; $("race").classList.remove("tvOn");
}

// A câmera de cada bloco: devolve a posição e o alvo. `u`: quanto do bloco já passou (0 a 1)
function camera(tv, tr, b, u) {
  const n = tr.n, W = tr.W;
  if (b === "pista") { // o voo contínuo pelo mapa inteiro (montarVoo): sem cortes, cada quadro é um ponto da mesma curva
    const q = tv.voo.quadro(u); tv.alvo = [q.gx, q.gz];
    return q;
  }
  if (b === "clima") { // baixa, ao lado da pista, olhando para o horizonte e o céu
    const P = ponto(tr, tv.climaF + 30 * u), lado = W * 0.95;
    return { x: P.x - P.ty * lado, y: P.h + 9 + 6 * u, z: P.y + P.tx * lado, ax: P.x + P.tx * 380 + P.ty * 90 * (u - 0.5), ay: P.h + 70 + 40 * u, az: P.y + P.ty * 380 - P.tx * 90 * (u - 0.5), fov: 56 };
  }
  if (b === "camp") { // grua: sobe sobre a reta dos boxes
    const P = ponto(tr, n - 55), Q = ponto(tr, n + 5), e = suave(u);
    return { x: P.x - P.tx * (190 - 50 * e) - P.ty * 34, y: P.h + 12 + 85 * e, z: P.y - P.ty * (190 - 50 * e) + P.tx * 34, ax: Q.x, ay: Q.h + 8, az: Q.y, fov: 60 };
  }
  const f = n - 125 + 135 * u, P = ponto(tr, f), Q = ponto(tr, f + 38); // o grid: no meio das duas filas, da última fila até a pole
  return { x: P.x, y: P.h + 11 + 3 * Math.sin(u * 3), z: P.y, ax: Q.x, ay: Q.h + 5, az: Q.y, fov: 66 };
}
function corte(tv) { tv.el.classList.remove("corte"); void tv.el.offsetWidth; tv.el.classList.add("corte"); }

function iniciar(race, tr, reduzMov) {
  const S = E.S, agora = sNow(), resta = (race.tvAte - agora) / 1000;
  if (!S || S.phase !== "race" || S.config.regras !== "f1" || !race.luzes || !me() || !race.tvAte || resta < MIN_S || !tr.pts) return null;
  const blocos = ["pista", "clima", S.tv && S.tv.pilotos ? "camp" : null, "grid"].filter(Boolean);
  const soma = blocos.reduce((a, k) => a + BASE[k], 0), esc_ = Math.min(1, resta / soma), faixas = [];
  let t = 0;
  for (const k of blocos) { const d = BASE[k] * esc_ + (k === "grid" ? Math.max(0, resta - soma * esc_) : 0); faixas.push({ k, ini: t, d }); t += d; }
  const el = document.createElement("div"); el.className = "tvTrans";
  const med = medirPista(tr.pts), info = infoDe(S.config.pista);
  el.innerHTML = `<div class="tvTopo"><span class="tvAoVivo">● AO VIVO</span><span>Transmissão · ${esc(PISTAS[S.config.pista]?.name || "")}</span></div>
    ${cartaPista(S, tr, med)}${cartaClima(S)}${S.tv && S.tv.pilotos ? cartaCampeonato(S) : ""}${cartaGrid(S)}
    <div class="tvBarra"><b class="tvRotulo"></b><div><strong>${esc(PISTAS[S.config.pista]?.name || "")}</strong><small>${info[0] ? esc(info[0]) + " · " : ""}${S.config.voltas} volta${S.config.voltas > 1 ? "s" : ""}</small></div></div>
    <button type="button" class="tvPular">Pular ⏭</button>`;
  el.onclick = pularTV;
  el.querySelector(".tvPular").onclick = (ev) => { ev.stopPropagation(); pularTV(); };
  $("race").appendChild(el);
  const mini = el.querySelector(".tvMini"), desenho = mini ? desenharMini(mini, tr) : null;
  // o recorde da pista vem do quadro de recordes (não atrasa nada: chega quando chegar)
  fetch("/api/recordes-corrida").then((r) => r.json()).then((j) => {
    const top = (j.pistas.find((p) => p.id === S.config.pista) || {}).top, c = el.querySelector("#tvRecorde");
    if (c && top && top[0]) c.innerHTML = `${tempo(top[0].tempo)}<small>${esc(top[0].piloto)}</small>`;
  }).catch(() => {});
  let climaF = tr.n * 0.5; // o trecho do bloco do clima: fora de túnel
  for (let k = 0; k < 12; k++) { const f = tr.n * (0.4 + 0.045 * k); if (!tr.coberto || !tr.coberto(Math.floor(f % tr.n)) && !tr.coberto(Math.floor((f + 40) % tr.n))) { climaF = f; break; } }
  return { el, ini: agora, faixas, total: t, med, desenho, climaF, bloco: "", alvo: [0, 0], voo: montarVoo(tr), reduz: reduzMov };
}

// Chamado a cada quadro de `draw` (jogo.js), depois da câmera normal. Põe a câmera da TV por cima, ou deixa a normal.
export function quadroTV(race, tr, cam, reduzMov) {
  ultimo = race;
  if (race.tv === undefined) {
    race.tv = iniciar(race, tr, reduzMov);
    if (race.tv && reduzMov) { pularTV(); return; } // movimento reduzido: sem voo de câmera; pula (e espera os outros, se houver)
    if (!race.tv) return;
    $("race").classList.add("tvOn");
  }
  const tv = race.tv; if (!tv) return;
  const agora = sNow();
  if (agora >= race.tvAte) { acabar(race); return; }
  if (tv.espera) return;
  const t = Math.min(tv.total, (agora - tv.ini) / 1000), f = tv.faixas.find((x) => t < x.ini + x.d) || tv.faixas[tv.faixas.length - 1], u = lim((t - f.ini) / f.d);
  if (f.k !== tv.bloco) { // novo bloco: o cartão certo entra e a faixa vermelha varre a tela
    tv.bloco = f.k; corte(tv);
    tv.el.querySelectorAll(".tvCarta").forEach((c) => c.classList.toggle("on", c.dataset.b === f.k));
    tv.el.querySelector(".tvRotulo").textContent = TITULO[f.k];
    if (window.Narrador) { // o narrador apresenta a pista junto do voo; no grid ele abaixa; as luzes cortam (narrador.js)
      if (f.k === "pista") window.Narrador.falarDaPista(E.S.config.pista, E.S.semente, { cortarEm: race.startAt - ((race.luzes?.espera || 0) + 4) * 1000 - sNow() });
      else if (f.k === "grid") window.Narrador.abaixar(0.3, 0.6);
    }
  }
  const c = camera(tv, tr, f.k, u);
  if (tv.desenho && f.k === "pista") { const [px, py] = tv.desenho.ondeXY(tv.alvo[0], tv.alvo[1]), pt = tv.el.querySelector(".tvPonto"); pt.style.left = px + "%"; pt.style.top = py + "%"; }
  // nos últimos 1,3 s, funde com a câmera normal (que já foi posta neste quadro)
  const w = lim((t - (tv.total - 1.3)) / 1.3), w2 = suave(w), pos = cam.position.clone(), rot = cam.quaternion.clone();
  cam.position.set(c.x, c.y, c.z); cam.lookAt(c.ax, c.ay, c.az);
  if (w2 > 0) { cam.position.lerp(pos, w2); cam.quaternion.slerp(rot, w2); }
  cam.fov = c.fov + 10 * w2; cam.updateProjectionMatrix();
  tv.el.classList.toggle("sai", w > 0);
}
