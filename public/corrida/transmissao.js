// Corrida da Galera — a transmissão de TV antes da largada (regras de F1).
// O servidor dá um tempo próprio para ela (`room.tvAte`, corrida.js): 25 s numa temporada, 20 s fora dela, e só DEPOIS vêm as
// luzes. Quatro blocos, cada um com a sua câmera e o seu cartão no estilo da TV: A PISTA (três voos curtos pelo traçado, com
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
function cartaClima(S) {
  const c = climaDoGP(S), m = me(), pn = m && window.F1Regras && window.F1Regras.PNEUS[m.pneu];
  const celula = (rot, val) => `<div><dt>${rot}</dt><dd>${val}</dd></div>`;
  return `<div class="tvCarta tvClima" data-b="clima"><div class="tvKicker">Condições da corrida</div><h3>${c.cond}</h3>
    <dl>${celula("Ar", `${c.ar}°C`)}${celula("Pista", `${c.pista}°C`)}${celula("Umidade", `${c.umidade}%`)}${celula("Vento", `${c.vento} km/h`)}${celula("Pista", "Seca")}${pn ? celula("Seu pneu", `<u class="pn" style="--c:${pn.cor}"></u> ${esc(pn.nome)}`) : ""}</dl></div>`;
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
  return { onde: (i) => { const p = pts[((Math.floor(i) % tr.n) + tr.n) % tr.n]; return [(X(p) / W) * 100, (Y(p) / H) * 100]; } };
}

// ---------- a sequência ----------
const BASE = { pista: 7, clima: 4, camp: 6.5, grid: 7.5 }; // segundos; encolhem se faltar tempo e o grid pega a sobra
const TITULO = { pista: "O circuito", clima: "O clima", camp: "O campeonato", grid: "O grid de largada" };
const MIN_S = 7; // com menos que isso para o fim da transmissão, não vale começar
let ultimo = null;
export function pularTV() {
  const race = ultimo; if (!race || !race.tv || race.tv.espera) return;
  const tv = race.tv; tv.el.remove(); race.tv = { espera: true, chip: criarChip(tv.el.parentNode) };
  act("tvpular");
}
function criarChip(pai) { const c = document.createElement("div"); c.className = "tvEspera"; c.textContent = "Esperando os outros pilotos pularem a transmissão…"; pai.appendChild(c); return c; }
function acabar(race) {
  const tv = race.tv; if (tv) { if (tv.el) tv.el.remove(); if (tv.chip) tv.chip.remove(); }
  race.tv = null; $("race").classList.remove("tvOn");
}

// A câmera de cada bloco: devolve a posição e o alvo. `u`: quanto do bloco já passou (0 a 1)
function camera(tv, tr, b, u) {
  const n = tr.n, W = tr.W;
  if (b === "pista") { // três voos curtos: a reta de largada e as duas curvas mais fechadas (cada um com 1/3 do bloco)
    const tiro = Math.min(2, Math.floor(u * 3)), uu = u * 3 - tiro, ini = [n - 70, ...tv.med.marcantes.map((i) => i - 60)][tiro] ?? n - 70;
    const f = ini + 170 * uu, P = ponto(tr, f), Q = ponto(tr, f + 55), lado = (tiro % 2 ? -1 : 1) * (45 + 25 * Math.sin(uu * Math.PI));
    tv.ponto = f;
    return { x: P.x - P.tx * 55 - P.ty * lado, y: P.h + 105 - 40 * uu, z: P.y - P.ty * 55 + P.tx * lado, ax: Q.x, ay: Q.h + 6, az: Q.y, fov: 62 };
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
  return { el, ini: agora, faixas, total: t, med, desenho, climaF, bloco: "", tiro: -1, ponto: 0, reduz: reduzMov };
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
  }
  const tiro = f.k === "pista" ? Math.min(2, Math.floor(u * 3)) : 0;
  if (f.k === "pista" && tiro !== tv.tiro) { if (tv.tiro >= 0) corte(tv); tv.tiro = tiro; }
  const c = camera(tv, tr, f.k, u);
  if (tv.desenho && f.k === "pista") { const [px, py] = tv.desenho.onde(tv.ponto), pt = tv.el.querySelector(".tvPonto"); pt.style.left = px + "%"; pt.style.top = py + "%"; }
  // nos últimos 1,3 s, funde com a câmera normal (que já foi posta neste quadro)
  const w = lim((t - (tv.total - 1.3)) / 1.3), w2 = suave(w), pos = cam.position.clone(), rot = cam.quaternion.clone();
  cam.position.set(c.x, c.y, c.z); cam.lookAt(c.ax, c.ay, c.az);
  if (w2 > 0) { cam.position.lerp(pos, w2); cam.quaternion.slerp(rot, w2); }
  cam.fov = c.fov + 10 * w2; cam.updateProjectionMatrix();
  tv.el.classList.toggle("sai", w > 0);
}
