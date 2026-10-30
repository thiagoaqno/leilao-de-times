// Corrida da Galera — as pistas em 3D: temas, relevo, asfalto, zebras, muros e enfeites.
import * as THREE from "three";
import { PISTAS, sample, elevate, WORLD, rng } from "./estado.js";
import { drawPreview } from "./menus.js";
import { renderer, scene, hemi, sun, canvasTex, M, LOOK } from "./cena.js";
import { asfaltoGP, borrachaGP } from "./asfalto-gp.js";
import { aguaUvDaFita, prepararAguaPista } from "./agua-pista.js";
import { PROPS, aoCarregar } from "./props.js";
import { enfeitar, animarVida } from "./vida.js";
import { aplicarCeu } from "./ceu.js";
import { fundoMonaco, relevoMonaco, corDoChaoMonaco, NIVEL_DO_MAR } from "./monaco.js";
// o kit de pista (kit/README.md) e a configuração de cada GP (gps/)
import { GPS } from "./gps/index.js";
import { arquibancadas } from "./kit/arquibancadas.js";
import { chaoGP } from "./kit/chao.js";
import { escapeGP } from "./kit/escape.js";
import { guardRail, fachadas } from "./kit/beira.js";
import { ambienteGP } from "./kit/ambiente.js";
import { passarelas, postes, montanha } from "./kit/marcos.js";
import { vidaGP } from "./kit/vida.js";
import { boxesGP } from "./kit/corredor-boxes.js";
import { parque } from "./kit/parque.js";
import { fundirEstaticos } from "./kit/fundir.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---------- temas das pistas: cores, chão, enfeites e o horizonte ----------
export const THEMES = {
  monaco: { preview: "#2a6fa3", sky: ["#5fb7ff", "#cfeeff"], fog: "#cfe6f2", oob: 0xffae6f1f, roadCol: "#5b5b61" },
  interlagos: { preview: "#2f7d33", sky: ["#4aa3e8", "#f3e6c8"], fog: "#dfe7d8", oob: 0xff3a9a3f, roadCol: "#4b4b50" },
  monza: { preview: "#4f8b3d", sky: ["#4a8fd6", "#f6e1bd"], fog: "#e6dccb", oob: 0xff4f8b3d, roadCol: "#4d4e53" },
  barcelona: { preview: "#a9a35a", sky: ["#4a9be0", "#f2ead6"], fog: "#e8e4d2", oob: 0xffa9a35a, roadCol: "#4c4d52" },
  silverstone: { preview: "#5e9a47", sky: ["#8aa3b8", "#dde3e6"], fog: "#cfd6d6", oob: 0xff5e9a47, roadCol: "#4d4e53" },
  // as pistas convertidas do calendário de F1 (ferramentas/circuitos-f1.js)
  melbourne: { preview: "#2e7d32", sky: ["#3a8fd8", "#ebf2f8"], fog: "#d6e5d8", oob: 0xff388339, roadCol: "#46474c" },
  xangai: { preview: "#6a8a52", sky: ["#8aa0b4", "#dde2e2"], fog: "#d0d6d4", oob: 0xff6a8a52, roadCol: "#4d4e53" },
  suzuka: { preview: "#4f8b3d", sky: ["#6f9fd0", "#e2e8e6"], fog: "#d2dbd6", oob: 0xff4f8b3d, roadCol: "#4d4e53" },
  bahrein: { preview: "#d6bf8e", sky: ["#63b0e5", "#fce0aa"], fog: "#e9cc9d", oob: 0xffd6bf8e, roadCol: "#4d4e53" },
  jeddah: { preview: "#d6bf8e", sky: ["#63b0e5", "#fce0aa"], fog: "#e9cc9d", oob: 0xffd6bf8e, roadCol: "#4d4e53" },
  miami: { preview: "#4f9a46", sky: ["#3f97e0", "#d6f1ff"], fog: "#cfeaf2", oob: 0xff4f9a46, roadCol: "#4d4e53" },
  montreal: { preview: "#4f8b3d", sky: ["#4a95dc", "#f1eadb"], fog: "#dde6d6", oob: 0xff4f8b3d, roadCol: "#4d4e53" },
  redbullring: { preview: "#467b45", sky: ["#6eb9f0", "#e4f6ff"], fog: "#cde6dd", oob: 0xff467b45, roadCol: "#4d4e53" },
  spa: { preview: "#2f6a32", sky: ["#7d94a8", "#d9e2e6"], fog: "#c8d2d4", oob: 0xff2f6a32, roadCol: "#4d4e53" },
  hungaroring: { preview: "#a9a35a", sky: ["#3f93dc", "#f2ead6"], fog: "#e8e4d2", oob: 0xffa9a35a, roadCol: "#4d4e53" },
  zandvoort: { preview: "#b6ad74", sky: ["#8ea3b3", "#dde3e4"], fog: "#cdd6d6", oob: 0xffb6ad74, roadCol: "#4d4e53" },
  madri: { preview: "#a9a35a", sky: ["#3f93dc", "#f2ead6"], fog: "#e8e4d2", oob: 0xffa9a35a, roadCol: "#4d4e53" },
  baku: { preview: "#bdb6a6", sky: ["#4fa9f5", "#d9f0ff"], fog: "#cfe6f2", oob: 0xffbdb6a6, roadCol: "#4d4e53" },
  singapura: { preview: "#a99c84", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xffa99c84, roadCol: "#4d4e53" },
  austin: { preview: "#a9a35a", sky: ["#3f93dc", "#f2ead6"], fog: "#e8e4d2", oob: 0xffa9a35a, roadCol: "#4d4e53" },
  mexico: { preview: "#4f8b3d", sky: ["#6f9fd0", "#e2e8e6"], fog: "#d2dbd6", oob: 0xff4f8b3d, roadCol: "#4d4e53" },
  lasvegas: { preview: "#a99c84", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xffa99c84, roadCol: "#4d4e53" },
  catar: { preview: "#d6bf8e", sky: ["#63b0e5", "#fce0aa"], fog: "#e9cc9d", oob: 0xffd6bf8e, roadCol: "#4d4e53" },
  abudhabi: { preview: "#a99c84", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xffa99c84, roadCol: "#4d4e53" },
  losangeles: { preview: "#7a4a6a", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xff6a8aa0, roadCol: "#3f3f46" },
  rio: { preview: "#1f8a8a", sky: ["#3f97e0", "#d6f1ff"], fog: "#cfeaf2", oob: 0xff2a7a3a, roadCol: "#4a4a50" },
  serra: { preview: "#4d8854", sky: ["#6eb9f0", "#e4f6ff"], fog: "#cde6dd", oob: 0xff467b45, roadCol: "#51545a" },
  deserto: { preview: "#cca96e", sky: ["#63b0e5", "#fce0aa"], fog: "#e9cc9d", oob: 0xffcaab72, roadCol: "#55565a" },
  nurburgring: { preview: "#2f6a32", sky: ["#7d94a8", "#d9e2e6"], fog: "#c8d2d4", oob: 0xff2f6a32, roadCol: "#4a4c52" },
  laguna: { preview: "#b39352", sky: ["#5a7fbf", "#f7c99a"], fog: "#e8c9a6", oob: 0xffc2a35e, roadCol: "#4f5056" },
  luigi: { preview: "#3f8f3a", sky: ["#3f97e0", "#eaf4ff"], fog: "#dfeee0", oob: 0xff3a9a3f, roadCol: "#55555c" },
  sorvete: { preview: "#8fb8d8", sky: ["#8fc6f2", "#f2f8ff"], fog: "#e8f2fa", oob: 0xffe4edf5, roadCol: "#9fc3dd" },
  arcoiris: { preview: "#0b0a1a", sky: ["#02020a", "#1a0b3a"], fog: "#0a0618", oob: 0xff05040c, roadCol: "#ffffff" },
  tokyo: { preview: "#14152a", sky: ["#05061a", "#3a1d5c"], fog: "#2a1a44", oob: 0xff1f1514, roadCol: "#24252c" },
};

// posição de largada g: atrás da linha, em duas filas
// (regras de F1: o grid tem 20 carros e as filas ficam mais juntas, a 8 pontos uma da outra em vez de 13)
export function gridSpot(pts, g, W, f1 = false) {
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * (f1 ? 8 : 13) + n * 2) % n, p = pts[idx], nx = -p.ty, ny = p.tx, side = g % 2 ? 1 : -1, lat = side * W * 0.22;
  return { x: p.x + nx * lat, y: p.y + ny * lat, tx: p.tx, ty: p.ty, nx, ny, a: Math.atan2(p.ty, p.tx), idx };
}

// ---------- a pista: pontos com altura, chão, asfalto, zebras, muros e enfeites ----------
const TRACKS = {};
export function buildTrack(id) {
  if (TRACKS[id]) return TRACKS[id];
  const t = PISTAS[id], pts = window.Pistas.pontos(t, 6), n = pts.length, W = t.width;
  for (const p of pts) { p.nx = -p.ty; p.ny = p.tx; }
  const mini = document.createElement("canvas"); mini.width = mini.height = 240; drawPreview(mini, id);
  const tr = { id, t, pts, n, W, look: LOOK[id], theme: THEMES[id], mini, wallLat: t.walls ? W / 2 + t.wall : Infinity, grp: new THREE.Group() };
  // grade de distância até a pista (para o relevo e para espalhar enfeites sem cair na pista)
  const G = 96, cell = t.world / G, gd = new Float32Array((G + 1) * (G + 1)), gi = new Int32Array((G + 1) * (G + 1));
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const x = i * cell, y = j * cell; let bd = 1e12, bi = 0;
    for (let k = 0; k < n; k += 2) { const p = pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bi = k; } }
    gd[j * (G + 1) + i] = Math.sqrt(bd); gi[j * (G + 1) + i] = bi;
  }
  const celula = (x, y) => Math.max(0, Math.min(G, Math.round(y / cell))) * (G + 1) + Math.max(0, Math.min(G, Math.round(x / cell)));
  tr.distAprox = (x, y) => gd[celula(x, y)]; // a grade é grossa (erra até ~40): serve para o relevo, não para pôr enfeite
  // a distância EXATA até a linha central (de qualquer trecho, inclusive os vizinhos de um grampo): é a que os enfeites usam
  const HC = 64, hash = new Map(), hk = (a, b) => a * 100003 + b;
  pts.forEach((p, i) => { const k = hk(Math.floor(p.x / HC), Math.floor(p.y / HC)); (hash.get(k) || hash.set(k, []).get(k)).push(i); });
  tr.distAt = (x, y) => {
    const c = tr.distAprox(x, y); if (c > 700) return c;
    const r = Math.ceil((c + 45) / HC), cx = Math.floor(x / HC), cy = Math.floor(y / HC); let m = Infinity;
    for (let a = cx - r; a <= cx + r; a++) for (let b = cy - r; b <= cy + r; b++) { const l = hash.get(hk(a, b)); if (l) for (const i of l) { const d = (pts[i].x - x) ** 2 + (pts[i].y - y) ** 2; if (d < m) m = d; } }
    return Math.sqrt(m);
  };
  // o ponto da pista mais perto de (x, y): começa pelo da célula da grade e só procura em volta dele (rápido)
  tr.indiceAt = (x, y) => { const c = gi[celula(x, y)]; let best = c, bd = Infinity; for (let k = c - 45; k <= c + 45; k++) { const q = (k + n) % n, p = pts[q], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = q; } } return best; };
  // altura do chão em qualquer lugar: longe demais para o barranco da pista alcançar, é o nível zero
  const alcance = W / 2 + t.flat + t.fall + cell;
  tr.chao = (x, y) => (tr.distAprox(x, y) > alcance ? 0 : groundH(tr, x, y, tr.indiceAt(x, y)));
  // GPs com relevo de verdade (Mônaco: o morro do EU-DEM/SRTM em volta da pista): `tr.relevoGP(x, y, f, idx)` manda em groundH e o chão vale em toda parte, não só perto da pista
  if (id === "monaco") { tr.relevoGP = relevoMonaco(tr); tr.chao = (x, y) => groundH(tr, x, y, tr.indiceAt(x, y)); }
  // pista que passa por cima de si mesma (`cruza`, o oito de Suzuka): perto do cruzamento o chão é o do trecho de baixo, e o
  // de cima fica no ar, na ponte do GP
  if (t.cruza) {
    const baixos = t.cruza.map(([a, b]) => { const ia = Math.floor(a * n), ib = Math.floor(b * n); return pts[ia].h <= pts[ib].h ? ia : ib; });
    tr.sobPonte = (x, y) => {
      let h = Infinity;
      for (const i0 of baixos) {
        const p = pts[i0]; if ((p.x - x) ** 2 + (p.y - y) ** 2 > (W * 2.4) ** 2) continue;
        let best = i0, bd = Infinity; for (let k = i0 - 70; k <= i0 + 70; k++) { const q = pts[(k + n) % n], d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = (k + n) % n; } }
        h = Math.min(h, groundH(tr, x, y, best));
      }
      return h;
    };
    const plano = tr.chao; tr.chao = (x, y) => Math.min(plano(x, y), tr.sobPonte(x, y));
  }
  buildWorld(tr); tr.comProps = !!PROPS.pronto;
  return (TRACKS[id] = tr);
}
// altura do chão: em cima da pista e um pouco para os lados é a altura da pista; mais longe, desce até o nível 0
function falloff(tr, lat) { const t = tr.t, off = Math.abs(lat) - tr.W / 2 - t.flat; return off <= 0 ? 1 : Math.max(0, 1 - off / t.fall); }
export function trackFrame(tr, x, y, idx) { // ponto da pista mais perto (já sabendo o índice), com a altura e a distância de lado
  const a = tr.pts[idx], b = tr.pts[(idx + 1) % tr.n], c = tr.pts[(idx - 1 + tr.n) % tr.n];
  const proj = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2)); const px = p.x + dx * k, py = p.y + dy * k; return { k, d2: (x - px) ** 2 + (y - py) ** 2, h: p.h + (q.h - p.h) * k, px, py }; };
  const f = proj(a, b), g = proj(c, a), r = f.d2 <= g.d2 ? f : g;
  const lat = (x - r.px) * a.nx + (y - r.py) * a.ny;
  return { h: r.h, lat };
}
// corta uma PlaneGeometry de S × S quadrados em N × N pedaços (os vértices da borda se repetem nos dois vizinhos)
function emPedacos(geo, S, N) {
  const CO = geo.attributes.color ? geo.attributes.color.array : null, P = geo.attributes.position.array, NO = geo.attributes.normal.array, UV = geo.attributes.uv.array, out = [];
  for (let tj = 0; tj < N; tj++) for (let ti = 0; ti < N; ti++) {
    const x0 = Math.floor((ti * S) / N), x1 = Math.floor(((ti + 1) * S) / N), y0 = Math.floor((tj * S) / N), y1 = Math.floor(((tj + 1) * S) / N), w = x1 - x0 + 1;
    const pos = [], nor = [], uv = [], idx = [], col = [];
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) { const k = iy * (S + 1) + ix; pos.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); nor.push(NO[k * 3], NO[k * 3 + 1], NO[k * 3 + 2]); uv.push(UV[k * 2], UV[k * 2 + 1]); if (CO) col.push(CO[k * 3], CO[k * 3 + 1], CO[k * 3 + 2]); }
    for (let iy = 0; iy < y1 - y0; iy++) for (let ix = 0; ix < x1 - x0; ix++) { const a = iy * w + ix, b = a + w, c = b + 1, d = a + 1; idx.push(a, b, d, b, c, d); }
    // pedaço liso (longe da pista, sem relevo): 4 vértices bastam, a luz e a textura saem iguais (junta-se tudo numa malha só, adiante)
    const liso = pos.every((v, k) => k % 3 !== 1 || Math.abs(v - pos[1]) < 0.02) && nor.every((v, k) => k % 3 !== 1 || v > 0.9999);
    if (liso) {
      const h = y1 - y0 + 1, cantos = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1], q = new THREE.BufferGeometry();
      q.setAttribute("position", new THREE.Float32BufferAttribute(cantos.flatMap((c) => pos.slice(c * 3, c * 3 + 3)), 3)); q.setAttribute("normal", new THREE.Float32BufferAttribute(cantos.flatMap((c) => nor.slice(c * 3, c * 3 + 3)), 3));
      q.setAttribute("uv", new THREE.Float32BufferAttribute(cantos.flatMap((c) => uv.slice(c * 2, c * 2 + 2)), 2)); if (CO) q.setAttribute("color", new THREE.Float32BufferAttribute(cantos.flatMap((c) => col.slice(c * 3, c * 3 + 3)), 3)); q.setIndex([0, 2, 1, 2, 3, 1]); q.userData.liso = true; out.push(q); continue;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    if (CO) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    out.push(g);
  }
  return out;
}
export function groundH(tr, x, y, idx) { const f = trackFrame(tr, x, y, idx); return tr.relevoGP ? tr.relevoGP(x, y, f, idx) : f.h * falloff(tr, f.lat); }

// Rio: o mar fica do lado de fora da reta da orla (Copacabana); as coordenadas foram desenhadas no quadrado de 1600
const rioSea = (x, y) => { const K = PISTAS.rio.scale; return x < 230 * K + (y - 335 * K) * 0.04 && y < 1450 * K; };
// água que mexe: listras claras numa textura que desliza (vida.js anda com o offset)
const aguaTex = (cor) => canvasTex(256, 256, (x, w, hh, rr) => { x.fillStyle = cor; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { x.fillStyle = rr() < 0.5 ? "#ffffff22" : "#00000018"; x.fillRect(rr() * w, rr() * hh, 10 + rr() * 30, 2); } });
function buildWorld(tr) {
  const { pts, n, W, look, id, grp } = tr, t = tr.t, add = (o) => (grp.add(o), o), r = rng(id.length * 977), gp = GPS[id];
  tr.reservado = []; // onde os enfeites soltos não entram (o kit e o cenário de cada GP vão pondo aqui)
  tr.sem = gp?.sem || {}; // o que este GP não tem e vida.js / vida-mais.js não devem pôr (Mônaco: olhos de gato, setas, mastros, roda-gigante...)
  // Reserva as duas faixas e o prédio antes do cenário, do ambiente e da vida da pista.
  if (t.boxes && gp?.boxes !== false && window.F1Regras) {
    const cor = window.F1Regras.corredor(t, n, W);
    const pontosBox = [];
    for (let u = 0; u <= cor.len; u += 2) {
      const i = (cor.i0 + u) % n, p = pts[i];
      const lat = cor.lat(u, cor.fim) + cor.centroAsfalto - cor.D;
      pontosBox.push([p.x + p.nx * lat, p.y + p.ny * lat, cor.larguraCorredor / 2 + 25]);
    }
    tr.reservado.push(...pontosBox);
    tr.noCorredor = (x, y) => pontosBox.some(([cx, cy, raio]) => (x - cx) ** 2 + (y - cy) ** 2 < raio * raio);
  }
  const WORLD = t.world, K = t.scale; // pistas ampliadas: o mundo cresce junto e as coordenadas fixas (mar, porto) vão × K
  tr.agua = [];
  // ---- chão em volta (malha com relevo) ----
  const S = gp?.terreno?.S ?? Math.min(380, Math.round(140 * K)), pad = 1400, size = WORLD + pad * 2, geo = new THREE.PlaneGeometry(size, size, S, S); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + WORLD / 2, y = pos.getZ(i) + WORLD / 2;
    const longe = !tr.relevoGP && tr.distAprox(x, y) > W / 2 + t.flat + t.fall + WORLD / 96, bi = longe ? 0 : tr.indiceAt(x, y);
    const perto = !longe && Math.abs(trackFrame(tr, x, y, bi).lat) < W / 2 + 26; // embaixo da pista o chão afunda mais (a malha é grossa e furava o asfalto nas rampas)
    let h = t.espaco ? -700 : (longe ? 0 : groundH(tr, x, y, bi)) - (perto ? 9 : 1.5); // no espaço não tem chão: o "chão" fica bem lá embaixo
    if (id === "monaco") { const s = fundoMonaco(tr, x, y); if (s > -90) h = s > 0 ? Math.max(-34, NIVEL_DO_MAR - 7 - s * 0.35) : Math.min(h, NIVEL_DO_MAR + 1 + 3.2 * -s); } // a bacia do porto e o mar, o cais em paredão e a falésia do Rochedo (3 de altura por unidade)
    if (id === "rio" && rioSea(x, y)) h = Math.min(h, -14); // o mar de Copacabana
    if (tr.sobPonte) h = Math.min(h, tr.sobPonte(x, y) - 4); // embaixo da ponte (Suzuka)
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  if (id === "monaco") { // a cor do terreno por vértice: rua e calçada de pedra, jardins, mata, paredão de pedra e o mato do morro (monaco.js)
    const cor = corDoChaoMonaco(), cores = new Float32Array(pos.count * 3), nor = geo.attributes.normal;
    for (let k = 0; k < pos.count; k++) { const c = cor(pos.getX(k) + WORLD / 2, pos.getZ(k) + WORLD / 2, pos.getY(k), nor.getY(k)); cores[k * 3] = c[0]; cores[k * 3 + 1] = c[1]; cores[k * 3 + 2] = c[2]; }
    geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  }
  const gtex = canvasTex(256, 256, (x, w, hh, rr) => { x.fillStyle = look.ground[0]; x.fillRect(0, 0, w, hh); for (let i = 0; i < 5000; i++) { x.fillStyle = look.ground[1 + ((rr() * 2) | 0)]; x.fillRect(rr() * w, rr() * hh, 3, 3); } });
  gtex.repeat.set(size / 120, size / 120);
  // em pedaços (8 × 8): a malha inteira tem quase 300 mil triângulos e era desenhada toda a cada quadro; assim a placa
  // só desenha os pedaços que aparecem na tela. As normais já foram calculadas na malha inteira (sem emenda entre eles)
  const chaoM = new THREE.MeshStandardMaterial({ map: gtex, roughness: 1, vertexColors: !!geo.attributes.color });
  const lisos = [];
  for (const pedaco of emPedacos(geo, S, gp?.terreno?.pedacos ?? 8)) { // (`terreno` do GP: a grade e os pedaços; Mônaco usa menos, para caber no teto de malhas e triângulos)
    if (pedaco.userData.liso) { lisos.push(pedaco); continue; }
    const m = add(new THREE.Mesh(pedaco, chaoM)); m.position.set(WORLD / 2, 0, WORLD / 2); m.receiveShadow = true; m.name = `${id}-terreno`;
  }
  if (lisos.length) { const m = add(new THREE.Mesh(mergeGeometries(lisos, false), chaoM)); m.position.set(WORLD / 2, 0, WORLD / 2); m.receiveShadow = true; m.name = `${id}-terreno`; lisos.forEach((g) => g.dispose()); } // os pedaços lisos, uma chamada só
  geo.dispose();
  // ---- fitas ao longo da pista (asfalto, zebras, calçada): cada ponto com a sua altura ----
  function ribbon(l0, l1, y0, mat, vLen, y1 = y0, uSpan = 1, i0 = 0, i1 = n) { // de i0 a i1: só um trecho da volta
    const vs = [], uv = [], idx = [];
    for (let i = i0; i <= i1; i++) {
      const p = pts[((i % n) + n) % n], d = i * 6;
      for (const [l, yy, u] of [[l0, y0, 0], [l1, y1, uSpan]]) { vs.push(p.x + p.nx * l, p.h * falloff(tr, l) + yy, p.y + p.ny * l); uv.push(u, d / vLen); }
      if (i < i1) { const a = (i - i0) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (mat.userData.asfalto === true && l0 === -W / 2 && l1 === W / 2 && i0 === 0 && i1 === n) { g.setAttribute("aguaUv", new THREE.Float32BufferAttribute(aguaUvDaFita(n, i0, i1), 2)); prepararAguaPista(tr, mat); } // a máscara de água da pista (agua-pista.js): traçado seco, poças, manchas
    const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = `${id}-faixa`; return m;
  }
  const asphalt = gp?.asfalto ? null : canvasTex(128, 256, (x, w, hh, rr) => { x.fillStyle = look.road; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#00000022"; x.fillRect(w * 0.3, 0, 10, hh); x.fillRect(w * 0.62, 0, 12, hh); x.fillStyle = "#e8e8e8"; x.fillRect(2, 0, 3, hh); x.fillRect(w - 5, 0, 3, hh); x.fillStyle = id === "tokyo" ? "#f2c94c" : "#f2f2f2"; if (id !== "interlagos") x.fillRect(w / 2 - 1.5, 0, 3, hh * 0.45); });
  // a faixa do meio tracejada (uma a cada 10 m) e as marcas de pneu: passando rápido embaixo do carro, dão a noção de velocidade
  const arco = id === "arcoiris" ? canvasTex(128, 32, (x, w, hh) => { ["#ff3b3b", "#ff9a2e", "#ffe14a", "#3ee07a", "#3aa0ff", "#8a5bff", "#ff5fd2"].forEach((c, i) => { x.fillStyle = c; x.fillRect((i * w) / 7, 0, w / 7 + 1, hh); }); x.fillStyle = "#ffffff55"; x.fillRect(0, 0, w, 3); }) : null;
  if (gp?.asfalto) {
    ribbon(-W / 2, W / 2, 0.4, asfaltoGP(), 80, 0.4, W / 80);
    const tinta = M(0xe2e0d7, { roughness: 0.95, side: THREE.DoubleSide });
    for (const lado of [-1, 1]) ribbon(lado * (W / 2 - 2.6), lado * (W / 2 - 1.2), 0.49, tinta, 80);
    borrachaGP(tr, add);
  } else ribbon(-W / 2, W / 2, 0.4, arco ? new THREE.MeshStandardMaterial({ map: arco, emissive: 0xffffff, emissiveMap: arco, emissiveIntensity: 0.55, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }) : Object.assign(new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, side: THREE.DoubleSide }), { userData: { asfalto: true } }), 256); // asfalto: o clima molha (clima-visual.js)
  // Balizadores leves nas saídas de curva: o carro pode tocá-los e eles se inclinam.
  tr.cones = [];
  if (!t.espaco && !gp) {
    const orange = M(0xff792d), white = M(0xf7f1df), base = M(0x34383a);
    for (let i = 28; i < n; i += Math.max(45, Math.floor(n / 42))) {
      const p = pts[i], side = i % 2 ? -1 : 1, lat = side * (W / 2 - 3);
      const cone = new THREE.Group(); cone.name = `${id}-balizador`; cone.position.set(p.x + p.nx * lat, p.h + 0.5, p.y + p.ny * lat);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(9, 1.5, 9), base); cone.add(foot);
      const body = new THREE.Mesh(new THREE.ConeGeometry(3.2, 10, 6), orange); body.position.y = 5; cone.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.1, 1.8, 6), white); band.position.y = 6.5; cone.add(band);
      add(cone); tr.cones.push({ mesh: cone, x: cone.position.x, y: cone.position.z, h: p.h, hit: 0, dir: 0 });
    }
  }
  const kerbT = canvasTex(32, 64, (x, w, hh) => { x.fillStyle = look.kerb[0]; x.fillRect(0, 0, w, hh / 2); x.fillStyle = look.kerb[1]; x.fillRect(0, hh / 2, w, hh / 2); });
  const kerbM = new THREE.MeshStandardMaterial({ map: kerbT, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x0a3a44 : 0 });
  if (gp?.chao) chaoGP(tr, add, gp.chao, { gridSpot }); // margem, zebras só nas curvas e as marcas da rua (kit/chao.js)
  else { ribbon(W / 2, W / 2 + 7, 0.6, kerbM, 28); ribbon(-W / 2 - 7, -W / 2, 0.6, kerbM, 28); }
  if (gp?.escape) escapeGP(tr, add, gp.escape); // brita e asfalto de escape listrado só onde o GP diz (kit/escape.js)
  if ((id === "interlagos" || id === "laguna") && !gp?.escape) { // área de escape de brita
    const brita = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#c9b37a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 600; i++) { x.fillStyle = rr() < 0.5 ? "#b39c66" : "#ddc893"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }), roughness: 1, side: THREE.DoubleSide });
    ribbon(W / 2 + 7, W / 2 + 30, 0.3, brita, 64, 0.2); ribbon(-W / 2 - 30, -W / 2 - 7, 0.2, brita, 64, 0.3);
  } else { // calçada até o muro
    const side = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = id === "tokyo" ? "#3b3e52" : id === "losangeles" ? "#a9a49a" : id === "sorvete" ? "#dfe9f2" : "#bdb39b"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#0002"; x.strokeRect(0, 0, w, hh); }), roughness: 0.9, side: THREE.DoubleSide });
    const L = tr.wallLat; if (L < 1e9 && L > W / 2 + 7) { ribbon(W / 2 + 7, L, 0.5, side, 40); ribbon(-L, -W / 2 - 7, 0.5, side, 40); }
    // muro (guard-rail zebrado em Mônaco; mureta de concreto com neon em Tóquio)
    const wt = id === "monaco" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d62828"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#9aa"; x.fillRect(0, hh - 3, w, 3); })
      : id === "losangeles" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#c9c2b4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#e8b83a"; x.fillRect(0, 3, w, 2); x.fillStyle = "#0002"; x.fillRect(w - 2, 0, 2, hh); })
      : id === "rio" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1f8a3a"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#ffd23f"; x.fillRect(w / 2, 0, w / 2, 4); })
      : id !== "tokyo" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#aeb4ba"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d9dee2"; x.fillRect(0, 4, w, 3); x.fillRect(0, 10, w, 2); x.fillStyle = "#5d6268"; x.fillRect(w - 3, 0, 3, hh); }) // guard-rail de aço
      : canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#6c6f80"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ff4fd8"; x.fillRect(0, 2, w, 3); });
    const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x220a22 : 0 });
    // nos GPs, o guard-rail pintado em painéis (kit/beira.js; um material por lado, para os nomes não saírem espelhados)
    if (L < 1e9) for (const s of [1, -1]) {
      const mat = gp?.guardrail ? new THREE.MeshStandardMaterial({ map: guardRail(s, gp.guardrail), roughness: 0.55, side: THREE.DoubleSide }) : wm, vLen = gp?.guardrail ? 480 : 32;
      // `guardrail.baixos`: [[f0, f1, lado]] trechos em que o guard-rail daquele lado é baixo, de aço de duas lâminas (a reta dos boxes de Mônaco), em vez do painel alto
      const matBaixo = gp?.guardrail?.baixos ? new THREE.MeshStandardMaterial({ map: guardRail(s, { ...gp.guardrail, estilo: "duplo" }), roughness: 0.55, side: THREE.DoubleSide }) : null;
      const baixosDe = (gp?.guardrail?.baixos || []).filter(([, , lado]) => lado === s).map(([f0, f1]) => [Math.floor(f0 * n), Math.floor(f1 * n) + (f1 < f0 ? n : 0)]);
      const trecho = (i0, i1) => {
        const fatias = []; let a = i0;
        const emBaixo = (i) => baixosDe.some(([x0, x1]) => { const k = ((i % n) + n) % n; return (k >= x0 && k <= x1) || (k + n >= x0 && k + n <= x1); });
        if (!baixosDe.length) fatias.push([i0, i1, false]);
        else { for (let i = i0 + 1; i <= i1 + 1; i++) if (i === i1 + 1 || emBaixo(i) !== emBaixo(a)) { fatias.push([a, Math.min(i, i1), emBaixo(a)]); a = i; } }
        let m = null;
        for (const [x0, x1, baixo] of fatias) { if (x1 <= x0) continue; m = ribbon(s * L, s * L, 0.5, baixo ? matBaixo : mat, vLen, baixo ? 11 : gp?.guardrail?.alto ?? 12, 1, x0, x1); m.castShadow = true; m.name = `${id}-muro`; }
        return m;
      };
      // o trecho do corredor dos boxes (regras de F1) é uma peça à parte, que some enquanto o corredor aparece (kit/corredor-boxes.js)
      const cb = tr.t.boxes && s === tr.t.boxes.lado && window.F1Regras ? window.F1Regras.corredor(tr.t, n, W) : null;
      if (!cb) trecho(0, n);
      else { trecho(cb.i0 + cb.len + 1, cb.i0 + n - 1); (tr.guardaBox = tr.guardaBox || []).push(trecho(cb.i0 - 1, cb.i0 + cb.len + 1)); }
    }
  }
  // paredão embaixo dos trechos altos (para não ficar "flutuando") e pilares nos viadutos
  if (id === "tokyo" || id === "losangeles") {
    const pil = new THREE.CylinderGeometry(6, 7, 1, 10), pm = M(id === "tokyo" ? 0x55586a : 0xb8b0a0);
    for (let i = 0; i < n; i += 22) { const p = pts[i]; if (p.h < 15) continue; for (const s of [1, -1]) { const m = add(new THREE.Mesh(pil, pm)); m.scale.y = p.h; m.position.set(p.x + p.nx * s * (W / 2 - 6), p.h / 2, p.y + p.ny * s * (W / 2 - 6)); m.castShadow = true; } }
  }
  // linha de chegada quadriculada e o grid
  const a0 = pts[0], chk = canvasTex(128, 16, (x, w, hh) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; x.fillRect(i * 8, j * 8, 8, 8); } }, false);
  const line = add(new THREE.Mesh(new THREE.PlaneGeometry(W, 12), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.6 })));
  line.rotation.x = -Math.PI / 2; line.rotation.z = -Math.atan2(a0.ty, a0.tx) + Math.PI / 2; line.position.set(a0.x, a0.h + 0.55, a0.y);
  // os GPs com o chão do kit têm o grid pintado com os números
  // (as barras das regras de F1 são as 20 vagas do grid mais juntas; as de hoje, as 8 de sempre: pista.js liga um conjunto de cada vez)
  if (!gp?.chao?.grid) { tr.gridGalera = add(new THREE.Group()); tr.gridF1 = add(new THREE.Group()); tr.gridF1.visible = false;
    const barra = new THREE.PlaneGeometry(20, 2), branco = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [grupo, quantas, f1] of [[tr.gridGalera, 8, false], [tr.gridF1, 20, true]]) for (let g = 0; g < quantas; g++) { const p = gridSpot(pts, g, W, f1); const m = new THREE.Mesh(barra, branco); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(p.ty, p.tx) + Math.PI / 2; m.position.set(p.x + p.tx * 12, pts[p.idx].h + 0.55, p.y + p.ty * 12); grupo.add(m); } }
  // pórtico da largada
  { const s = 1, L = W / 2 + 14, mat = M(0x333844), sign = canvasTex(256, 32, (x, w, hh) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ffd23f"; x.font = "bold 24px sans-serif"; x.textAlign = "center"; x.fillText("CORRIDA DA GALERA", w / 2, 24); }, false);
    for (const k of [1, -1]) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(4, 60, 4), mat)); m.position.set(a0.x + a0.nx * k * L, a0.h + 30, a0.y + a0.ny * k * L); m.castShadow = true; }
    const top = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 4, 10, 3), [mat, mat, mat, mat, new THREE.MeshBasicMaterial({ map: sign }), new THREE.MeshBasicMaterial({ map: sign })]));
    top.position.set(a0.x, a0.h + 62, a0.y); top.rotation.y = -Math.atan2(a0.ny, a0.nx); void s;
    // nas pistas de GP, o pórtico das regras de F1: no lugar da faixa "CORRIDA DA GALERA", cinco caixas com duas luzes vermelhas
    // cada, que acendem uma por segundo e apagam juntas (tr.luzes.set(n), chamado por hud.js). jogo.js liga um pórtico ou o outro.
    if (gp) {
      const topF1 = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 4, 10, 3), mat)); topF1.position.copy(top.position); topF1.rotation.copy(top.rotation); topF1.visible = false;
      const grupo = add(new THREE.Group()); grupo.position.copy(top.position); grupo.rotation.copy(top.rotation); grupo.visible = false;
      const caixa = new THREE.BoxGeometry(10, 15, 2), esfera = new THREE.SphereGeometry(2.6, 12, 8), preto = M(0x0b0c10), apagada = 0x2a0505, acesa = 0xff2a1a, lampadas = [];
      for (let k = 0; k < 5; k++) {
        const c = new THREE.Mesh(caixa, preto); c.position.set((k - 2) * 13, 0, 2.2); grupo.add(c);
        const luz = new THREE.MeshBasicMaterial({ color: apagada }); lampadas.push(luz);
        for (const dy of [-3.6, 3.6]) { const e = new THREE.Mesh(esfera, luz); e.position.set((k - 2) * 13, dy, 3.7); grupo.add(e); }
      }
      tr.faixaGalera = top; tr.portico = { topF1, grupo };
      tr.luzes = { set(n) { lampadas.forEach((l, i) => l.color.setHex(i < n ? acesa : apagada)); } };
    } }
  // ---- enfeites ----
  const spots = []; // [x, y, chão] longe da pista
  const free = (x, y, gap) => x > -pad + 50 && y > -pad + 50 && x < WORLD + pad - 50 && y < WORLD + pad - 50 && tr.distAt(x, y) > W / 2 + gap;
  const hAt = (x, y) => tr.chao(x, y) - 1.5;
  const inst = (geo, mat, list, sc = (o) => o.s) => {
    if (!list.length) return;
    const m = add(new THREE.InstancedMesh(geo, mat, list.length)), d = new THREE.Object3D();
    list.forEach((o, i) => { d.position.set(o.x, o.h + (o.dy || 0) * sc(o), o.y); d.rotation.set(0, o.r || 0, 0); const s = sc(o); d.scale.set(o.sx || s, o.sy || s, o.sz || s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (o.c != null && m.setColorAt) m.setColorAt(i, new THREE.Color(o.c)); });
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  // barreiras de pneus: do lado de fora das curvas fechadas (a física bate nelas: tr.pneus guarda o lado de cada ponto).
  // Em Mônaco, não: o guard-rail fica colado na pista o tempo todo
  tr.pneus = new Int8Array(n);
  if (!t.espaco && !t.muro) {
    const pilhas = [], topos = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 3) % n]; if (!(p.k > 1 / 170)) continue;
      const fora = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
      for (let j = i - 4; j <= i + 4; j++) tr.pneus[(j + n) % n] = fora;
      if (i % 3) continue;
      const x = p.x + p.nx * fora * (W / 2 + 30), y = p.y + p.ny * fora * (W / 2 + 30), h = groundH(tr, x, y, i);
      for (let k = 0; k < 3; k++) (k === 2 ? topos : pilhas).push({ x, y, h: h + 1.1 + k * 2.2, s: 1, r: 0, c: k === 2 ? ((i / 3) % 2 ? "#e53935" : "#f4f4f4") : undefined });
    }
    const pneuGeo = new THREE.CylinderGeometry(3, 3, 2.1, 10);
    inst(pneuGeo, M(0x1d1e22, { roughness: 0.9 }), pilhas);
    inst(pneuGeo, M(0xffffff, { roughness: 0.7 }), topos);
  }
  // os checkpoints (como no Forza): duas bandeiras altas verde-limão, uma de cada lado, com "CHECKPOINT." na vertical.
  // Só aparecem o próximo e o seguinte (jogo.js acende, balança e pinta de vermelho o perdido).
  tr.portais = [];
  const bandeira = canvasTex(128, 512, (x, w, hh) => {
    x.fillStyle = "#d9f02e"; x.fillRect(0, 0, w, hh); x.fillStyle = "#c2d81f"; x.fillRect(0, 0, 8, hh);
    x.save(); x.translate(w / 2 + 6, hh * 0.42); x.rotate(-Math.PI / 2); x.fillStyle = "#121212"; x.font = "900 74px Bungee, Impact, Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("CHECKPOINT.", 0, 0, hh * 0.78); x.restore();
    x.fillStyle = "#121212"; x.fillRect(w / 2 - 22, hh - 92, 44, 44); x.fillStyle = "#d9f02e"; x.font = "900 34px Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("G", w / 2, hh - 69);
  }, false);
  const panoGeo = new THREE.PlaneGeometry(10, 40), mastroGeo = new THREE.CylinderGeometry(0.5, 0.6, 50, 6), mastroMat = M(0xe8e8e8, { metalness: 0.4, roughness: 0.4 });
  for (let k = 1; k < window.Pistas.SECTORS; k++) {
    const i = window.Pistas.checkpoint(k, n), p = pts[i], g = new THREE.Group(); add(g);
    const mat = new THREE.MeshBasicMaterial({ map: bandeira, side: THREE.DoubleSide, transparent: true }), panos = [];
    for (const sd of [-1, 1]) {
      // a bandeira (o mastro e o pano de 10 de largura, que fica do lado da pista) tem que ficar onde foi desenhada: se há outro trecho
      // da pista por perto, afasta; se não há lugar, esse lado fica sem bandeira
      const off = [23, 32, 44, 60].find((o) => [o, o - 5.4, o - 10.4].every((q) => tr.distAt(p.x + p.nx * sd * (W / 2 + q), p.y + p.ny * sd * (W / 2 + q)) >= W / 2 + q - 2));
      if (off === undefined) continue;
      const x = p.x + p.nx * sd * (W / 2 + off), y = p.y + p.ny * sd * (W / 2 + off), h = groundH(tr, x, y, i); // a bandeira (10 de largura) fica toda fora do asfalto e da zebra
      const m = new THREE.Mesh(mastroGeo, mastroMat); m.position.set(x, h + 25, y); g.add(m);
      const pano = new THREE.Group(); pano.position.set(x, h + 27, y); pano.rotation.y = Math.atan2(-p.tx, -p.ty); g.add(pano); // virada para quem chega
      const pm = new THREE.Mesh(panoGeo, mat); pm.position.x = -5.4 * sd; pano.add(pm); panos.push(pano);
    }
    tr.portais.push({ k, g, mat, panos, base: panos.map((q) => q.rotation.y) });
  }

  const palms = []; // a copa da palmeira tem 22 de raio (× a escala): o tronco só entra onde a copa também fica fora da pista
  palms.push = (o) => (free(o.x, o.y, 22 * (o.s || 1) + 10) ? Array.prototype.push.call(palms, o) : palms.length);
  // a copa da árvore tem 30 de raio (× a escala) e a do mato do morro 26: a escala encolhe até caber fora da pista, ou a árvore não entra
  const copaFora = (lista, raio) => { lista.push = (o) => { const s = Math.min(o.s || 1, (tr.distAt(o.x, o.y) - W / 2 - 11) / raio); return s < 0.8 ? lista.length : Array.prototype.push.call(lista, Object.assign(o, { s })); }; return lista; };
  const trees = copaFora([], 30), blds = [], towers = [], stands = [], yachts = [], neons = [], glass = [], jungle = copaFora([], 26), houses = [];
  // os GPs (gps/): o que só a pista tem (em Mônaco, o porto, a piscina, as arquibancadas, o túnel e a Place du Casino) e
  // as peças do kit; os enfeites soltos de depois não caem na água nem em cima delas
  const ctx = { add, r, hAt, size, aguaTex, palms, yachts, jungle, blds };
  if (gp) {
    if (gp.arquibancadas) arquibancadas(tr, add, gp.arquibancadas); // as arquibancadas do kit (kit/arquibancadas.js)
    gp.cenario?.(tr, ctx);
    if (gp.ambiente) ambienteGP(tr, add, gp.ambiente); // cerca, painéis, bandeiras, postos e placas
    if (gp.passarelas) passarelas(tr, add, gp.passarelas);
    gp.marcos?.(tr, ctx); // os marcos próprios (Mônaco: a capela de Sainte Dévote)
    if (gp.postes) postes(tr, add, gp.postes);
    if (gp.montanha) montanha(tr, add, gp.montanha);
    if (gp.vida) vidaGP(tr, add, gp.vida); // helicóptero, gaivotas, fiscais com a bandeira e o som de cada região
  }
  if (t.boxes && gp?.boxes !== false) boxesGP(tr, add, gp?.boxes || {}); // o corredor dos boxes das regras de F1 (kit/corredor-boxes.js)
  if (t.drs?.length) {
    const mapa = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#f2f6f8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#102d42'; c.font = '900 70px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DRS', w / 2, h / 2); }, false);
    const mat = new THREE.SpriteMaterial({ map: mapa, depthWrite: false });
    tr.drsPlacas = add(new THREE.Group()); tr.drsPlacas.visible = false;
    for (const [deteccao, abre] of t.drs) for (const f of [deteccao, abre]) {
      const p = pts[Math.floor(f * n) % n], lado = W / 2 + 28;
      const placa = new THREE.Sprite(mat); placa.position.set(p.x + p.nx * lado, p.h + 18, p.y + p.ny * lado);
      placa.scale.set(33, 13, 1); tr.drsPlacas.add(placa);
    }
  }
  const terra = (x, y) => id !== "monaco" || (!aguaMonaco(tr, x, y) && !tr.reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr));
  const livreRes = (x, y) => !tr.reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr); // fora das arquibancadas e prédios do GP
  // `beira` do GP (kit/gp-simples.js): árvores, palmeiras, prédios (com janelas) e prédios de vidro, nas proporções de `b`;
  // perto da pista (p) o prédio fica mais para trás, de frente para ela; longe, solto
  const beiraGP = (b, x, y, p, side, near, k) => {
    if (!livreRes(x, y)) return;
    const a = b.arvores || 0, pa = a + (b.palmeiras || 0), pr = pa + (b.predios || 0), vi = pr + (b.vidro || 0);
    if (k < a) trees.push({ x, y, h: hAt(x, y), s: (p ? 1 : 1.2) + r() * (p ? 0.8 : 1.2) });
    else if (k < pa) palms.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 0.5, r: r() * 6 });
    else if (k < vi) {
      const sx = 55 + r() * 55, sz = 55 + r() * 55, far = p ? near + 50 + r() * 110 : 0, bx = p ? p.x + p.nx * side * far : x, by = p ? p.y + p.ny * side * far : y;
      if (p && (!free(bx, by, Math.hypot(sx, sz) / 2 + (t.walls ? t.wall : 20) + 25) || !livreRes(bx, by))) return;
      const o = { x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: (b.altura || 90) + r() * (b.altura || 90) * (k < pr ? 1.4 : 3), sz, dy: 0.5, r: p ? Math.atan2(p.ty, p.tx) : r() * 3, c: (b.cores || ["#e8e4da", "#d9d4c8", "#cfd8e0", "#efe6d2"])[(r() * (b.cores || [0, 0, 0, 0]).length) | 0] };
      (k < pr ? blds : glass).push(o);
    }
  };
  for (let i = 0; i < (t.espaco ? 0 : n); i += 5) { // no espaço (Arco-íris) não tem enfeite na beira
    const p = pts[i];
    for (const side of [-1, 1]) {
      const near = (tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 36) + 10 + r() * 60, x = p.x + p.nx * side * near, y = p.y + p.ny * side * near;
      if (!free(x, y, 20) || (tr.boxesInfo && !livreRes(x, y))) continue; // nem em cima das garagens do corredor dos boxes
      const k = r();
      if (id === "monaco") { /* a cidade de verdade (prédios, palmeiras e plátanos) vem de kit/monaco, em monaco.js */ }
      else if (id === "interlagos" || id === "luigi" || id === "sorvete" || id === "serra" || id === "nurburgring" || id === "laguna" || id === "silverstone") { if (k < (id === "nurburgring" ? 0.9 : id === "laguna" ? 0.22 : id === "interlagos" || id === "barcelona" || id === "silverstone" ? 0.07 : 0.52) && ((id !== "barcelona" && id !== "silverstone") || livreRes(x, y))) trees.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.8 }); }
      else if (id === "deserto") { if (k < 0.11) palms.push({ x, y, h: hAt(x, y), s: 0.9 + r() * 0.4, r: r() * 6 }); }
      else if (gp?.parque) { /* o bosque fechado vem de kit/parque.js */ }
      else if (gp?.beira) beiraGP(gp.beira, x, y, p, side, near, k); // as pistas do kit/gp-simples.js
      else if (id === "losangeles") { // palmeiras altas na beira e prédios de vidro mais para trás
        if (k < 0.35) palms.push({ x, y, h: hAt(x, y), s: 1.6 + r() * 0.5, r: r() * 6 });
        else if (k < 0.7) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 60 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) glass.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 140 + r() * 360, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); }
      }
      else if (id === "rio") { // orla com palmeiras; na subida, mata fechada e casinhas coloridas
        const beach = p.x < 470 * K && side > 0; // a orla de Copacabana: o lado do mar
        if (beach) { if (k < 0.6) palms.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 0.4, r: r() * 6 }); }
        else if (p.h > 18) { if (k < 0.75) jungle.push({ x, y, h: hAt(x, y), s: 0.9 + r() * 0.9 }); else houses.push({ x, y, h: hAt(x, y), s: 1, sx: 18 + r() * 14, sy: 14 + r() * 10, sz: 18 + r() * 14, dy: 0.5, r: r() * 3, c: ["#f2c14e", "#e86a5a", "#5fb3e8", "#7ed07a", "#f29ad8", "#fff3d6"][(r() * 6) | 0] }); }
        else if (k < 0.5) { const sx = 50 + r() * 40, sz = 50 + r() * 40, far = near + 50 + r() * 100, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (!rioSea(bx, by) && free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) blds.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 70 + r() * 110, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#f4f1e6", "#e8e0cf", "#d9e6ef", "#f2dfc8"][(r() * 4) | 0] }); }
      }
      else { if (k < 0.25) neons.push({ x, y, h: hAt(x, y), r: Math.atan2(p.ty, p.tx) + (side > 0 ? 0 : Math.PI), g: (r() * 4) | 0 }); else if (k < 0.8) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 50 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) towers.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 120 + r() * 380, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] }); } }
    }
  }
  if (t.espaco) { // estrelas em volta (pontinhos que não dependem de luz)
    const v = []; for (let k = 0; k < 2500; k++) { const a = r() * Math.PI * 2, e = Math.asin(r() * 2 - 1), R0 = 3500; v.push(WORLD / 2 + Math.cos(a) * Math.cos(e) * R0, Math.sin(e) * R0, WORLD / 2 + Math.sin(a) * Math.cos(e) * R0); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false, fog: false })));
  }
  // longe da pista: mais prédios, árvores, morros
  for (let k = 0; k < (t.espaco ? 0 : Math.round(220 * K * K)); k++) {
    const x = -pad + 100 + r() * (WORLD + 2 * pad - 200), y = -pad + 100 + r() * (WORLD + 2 * pad - 200);
    if (!free(x, y, 160)) continue;
    if (id === "monaco") { /* o morro e a cidade em degraus vêm do relevo real e das plantas de kit/monaco */ }
    else if (id === "interlagos" || id === "luigi" || id === "sorvete" || id === "serra" || id === "nurburgring" || id === "laguna" || id === "silverstone") { if ((id !== "laguna" && id !== "barcelona" && id !== "silverstone") || r() < (id === "silverstone" ? 0.1 : id === "barcelona" ? 0.12 : 0.3)) trees.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 1.2 }); } // Laguna: morros dourados com poucos carvalhos; Nürburgring: floresta fechada
    else if (id === "deserto") { if (r() < 0.07) palms.push({ x, y, h: hAt(x, y), s: 1.2, r: r() * 6 }); }
    else if (gp?.parque) { if (r() < 0.1) trees.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 1.2 }); } // o parque continua longe da pista
    else if (gp?.beira) beiraGP(gp.beira.longe || {}, x, y, null, 0, 0, r());
    else if (id === "losangeles") { if (r() < 0.5) glass.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 120 + r() * 420, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); else palms.push({ x, y, h: hAt(x, y), s: 1.8, r: r() * 6 }); }
    else if (id === "rio") { if (rioSea(x, y)) continue; if (hAt(x, y) > 15 || r() < 0.5) jungle.push({ x, y, h: hAt(x, y), s: 1.3 + r() * 1.2 }); else blds.push({ x, y, h: hAt(x, y), s: 1, sx: 60 + r() * 50, sy: 70 + r() * 120, sz: 60 + r() * 50, dy: 0.5, r: r() * 3, c: ["#f4f1e6", "#e8e0cf", "#d9e6ef"][(r() * 3) | 0] }); }
    else towers.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 150 + r() * 500, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] });
  }
  if (id === "interlagos" || id === "laguna" || id === "nurburgring") for (let k = 0; k < 7; k++) { const p = pts[Math.floor(n * (0.015 + k * 0.013))], L = W / 2 + 70; stands.push({ x: p.x - p.nx * L, y: p.y - p.ny * L, h: p.h, s: 1, r: -Math.atan2(p.ny, p.nx) }); }
  // modelos
  if (PROPS.arvore) for (const { geo, mat } of PROPS.arvore.pecas) { const g = geo.clone(); g.scale(60, 60, 60); inst(g, mat, trees); } // a árvore do Kenney: 1,5 do modelo vira uns 9 m
  else { const leaf = new THREE.ConeGeometry(30, 70, 7); leaf.translate(0, 55, 0);
    inst(leaf, M(0x2d7a33), trees); const trunk = new THREE.CylinderGeometry(4, 5, 30, 6); trunk.translate(0, 15, 0); inst(trunk, M(0x6b4423), trees); }
  const pt = new THREE.CylinderGeometry(2, 3, 60, 6); pt.translate(0, 30, 0); inst(pt, M(0x8b5a2b), palms);
  const fronds = new THREE.ConeGeometry(22, 12, 6, 1, true); fronds.translate(0, 62, 0); inst(fronds, M(0x2f8f3a, { side: THREE.DoubleSide }), palms);
  const win = (base, lit) => canvasTex(64, 128, (x, w, hh, rr) => { x.fillStyle = lit ? "#1a1c2a" : "#fff"; x.fillRect(0, 0, w, hh); for (let yy = 6; yy < hh; yy += 10) for (let xx = 4; xx < w; xx += 10) { x.fillStyle = lit ? (rr() < 0.55 ? (rr() < 0.7 ? "#ffd86b" : "#9fe3ff") : "#0b0c14") : "#4d6f94"; x.fillRect(xx, yy, 6, 6); } });
  const bgeo = new THREE.BoxGeometry(1, 1, 1);
  if (gp?.fachadas) fachadas(add, blds, gp.fachadas); // sacadas, venezianas, toldos e telhados (kit/beira.js)
  else if (blds.length) { const t = win(0, false); t.repeat.set(1, 1); const m = inst(bgeo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), blds, () => 1); if (m) m.castShadow = true; }
  if (towers.length) { const t = win(0, true); const mm = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6 }); for (const o of towers) delete o.c; inst(bgeo, mm, towers, () => 1); }
  if (glass.length) inst(bgeo, new THREE.MeshStandardMaterial({ map: win(0, false), metalness: 0.15, roughness: 0.35, emissive: 0x2a1a10, emissiveIntensity: 0.4 }), glass, () => 1); // arranha-céus de vidro (LA)
  if (houses.length) inst(bgeo, M(0xffffff, { roughness: 0.9 }), houses, () => 1); // casinhas coloridas no morro (Rio)
  if (jungle.length) { const crown = new THREE.IcosahedronGeometry(26, 0); crown.translate(0, 40, 0); inst(crown, M(0x1f6a2a), jungle); const tk = new THREE.CylinderGeometry(3, 4, 22, 6); tk.translate(0, 11, 0); inst(tk, M(0x5a3a1a), jungle); }
  if (yachts.length) { // casco com a proa fina e dois andares de cabine com os vidros escuros
    const casco = new THREE.Shape(); casco.moveTo(-30, -9); casco.lineTo(14, -9); casco.quadraticCurveTo(28, -7, 34, 0); casco.quadraticCurveTo(28, 7, 14, 9); casco.lineTo(-30, 9); casco.closePath();
    const yg = new THREE.ExtrudeGeometry(casco, { depth: 10, bevelEnabled: false }); yg.rotateX(-Math.PI / 2); inst(yg, M(0xf7f7f7, { roughness: 0.4 }), yachts);
    const deck = new THREE.BoxGeometry(40, 1, 15); deck.translate(-6, 10.5, 0); inst(deck, M(0xc9a27a, { roughness: 0.7 }), yachts);
    const cab = new THREE.BoxGeometry(26, 6, 12); cab.translate(-4, 14, 0); inst(cab, M(0xeef1f5), yachts);
    const vidro = new THREE.BoxGeometry(16, 4.5, 10.5); vidro.translate(-2, 19, 0); inst(vidro, M(0x22313f, { roughness: 0.2, metalness: 0.4 }), yachts);
  }
  if (id === "interlagos") for (const f of [0.16, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87]) {
    const p = pts[Math.floor(n * f)], L = W / 2 + 155, x = p.x - p.nx * L, y = p.y - p.ny * L;
    if (pts.every(q => Math.hypot(q.x - x, q.y - y) > W / 2 + 95)) stands.push({ x, y, h: hAt(x, y), s: 1, r: -Math.atan2(p.ny, p.nx) });
  }
  for (const s0 of stands) { // arquibancadas da reta dos boxes
    const g = new THREE.Group(); g.position.set(s0.x, s0.h, s0.y); g.rotation.y = s0.r; add(g);
    if (PROPS.arquibancada) { // a arquibancada coberta do Kenney, de frente para a pista (o modelo olha para +z, a pista fica em +x)
      const { pecas, tam } = PROPS.arquibancada;
      for (const { geo, mat } of pecas) { const gg = geo.clone(); gg.scale(150 / tam.x, 70 / tam.y, 80 / tam.z); gg.rotateY(Math.PI / 2); gg.translate(-40, 0, 0); const m = new THREE.Mesh(gg, mat); m.castShadow = m.receiveShadow = true; g.add(m); }
      continue;
    }
    const crowd = canvasTex(256, 32, (x, w, hh, rr) => { x.fillStyle = "#8a8f99"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = ["#ffdd00", "#009c3b", "#fff", "#e53935", "#1e5bc6"][(rr() * 5) | 0]; x.fillRect(rr() * w, rr() * hh, 2, 3); } });
    for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 140), [M(0x8a8f99), M(0x8a8f99), new THREE.MeshStandardMaterial({ map: crowd }), M(0x777), M(0x777), M(0x777)]); st.position.set(-k * 14, 4 + k * 8, 0); st.castShadow = true; g.add(st); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 3, 150), M(0x555a66)); roof.position.set(-30, 64, 0); g.add(roof);
  }
  const NEON = [["#ff4fd8", "東京"], ["#4fe3ff", "夜道"], ["#ffe14f", "走れ"], ["#7dff6b", "友達"]].map(([c, t]) => canvasTex(64, 128, (x, w, hh) => { x.fillStyle = "#0b0b14"; x.fillRect(0, 0, w, hh); x.strokeStyle = c; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, hh - 8); x.fillStyle = c; x.font = "bold 40px sans-serif"; x.textAlign = "center"; x.fillText(t[0], w / 2, 52); x.fillText(t[1], w / 2, 104); }, false));
  for (const o of neons) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 52), new THREE.MeshBasicMaterial({ map: NEON[o.g], side: THREE.DoubleSide }))); m.position.set(o.x, o.h + 40, o.y); m.rotation.y = -o.r + Math.PI / 2; const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 16), M(0x222222))); pole.position.set(o.x, o.h + 8, o.y); }
  gp?.depois?.(tr, ctx); // o que vem por cima dos enfeites (Interlagos: o ambiente de interlagos.js)
  if (gp?.parque) parque(tr, add, gp.parque); // o bosque fechado em volta da pista (kit/parque.js)
  enfeitar(tr, add, r, (x, y, i) => groundH(tr, x, y, i));
  if (id === "losangeles") landmarksLA(tr, add, r);
  if (id === "rio") landmarksRio(tr, add, r, size, ribbon);
  // horizonte: montanhas (e o Fuji e a Tokyo Tower em Tóquio)
  const far = (geo, mat, x, y, h) => { const m = add(new THREE.Mesh(geo, mat)); m.position.set(x, h, y); return m; };
  if (id === "tokyo") {
    const fuji = far(new THREE.ConeGeometry(1400, 900, 24), M(0x3b2c63, { fog: false }), -2600, -2400, 300); void fuji;
    const cap = far(new THREE.ConeGeometry(420, 270, 24), M(0xe9e6ff, { fog: false }), -2600, -2400, 615); void cap;
    const tower = far(new THREE.ConeGeometry(70, 700, 4, 8, true), new THREE.MeshBasicMaterial({ color: 0xff4b3a, wireframe: true }), 2600, -1400, 350); void tower;
  } else if (!t.espaco && id !== "silverstone" && gp?.horizonte !== false) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, R0 = WORLD * 0.5 + 2400 + r() * 600, hh = 300 + r() * 500; const m = far(new THREE.ConeGeometry(700 + r() * 500, hh, 7), M(gp?.horizonte?.cor ?? (id === "monaco" ? 0x7e8f86 : id === "barcelona" ? 0x9a9472 : id === "losangeles" ? 0x8a6a6a : id === "rio" ? 0x2f6a3a : 0x86a37a)), WORLD / 2 + Math.cos(a) * R0, WORLD / 2 + Math.sin(a) * R0, hh / 2 - 40); if ((id === "monaco" && Math.abs(Math.sin(a)) > 0.3) || (id === "rio" && Math.cos(a) < -0.3)) m.visible = false; }
  // céu
  const sky = new THREE.SphereGeometry(5000, 32, 16), col = [], ps = sky.attributes.position, top = new THREE.Color(look.sky[0]), low = new THREE.Color(look.sky[1]);
  for (let i = 0; i < ps.count; i++) { const yy = ps.getY(i) / 5000, c = low.clone().lerp(top, Math.min(1, Math.max(0, yy * 2.2))); col.push(c.r, c.g, c.b); }
  sky.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const skyM = add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))); skyM.position.set(WORLD / 2, 0, WORLD / 2); tr.sky = skyM;
  if (id === "tokyo") { const moon = add(new THREE.Mesh(new THREE.SphereGeometry(90, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2f0e8, fog: false }))); moon.position.set(WORLD / 2 + 2500, 1800, WORLD / 2 - 3000); }
  // juntar as malhas paradas por material e região (kit/fundir.js): de 900 chamadas de desenho em Mônaco para umas 300. O que as
  // animações movem é descoberto rodando a vida da pista por alguns segundos em 24 pontos da volta.
  fundirEstaticos(tr, { simular: () => { for (let k = 0; k < 24; k++) { const p = pts[Math.floor((k / 24) * n)], foco = { x: p.x, y: p.y, z: p.h, a: Math.atan2(p.ty, p.tx) }; for (let s = 0; s < 6; s++) animarVida(tr, 0.08, foco); } } });
}
// Los Angeles: placa "GALERA" no morro (estilo Hollywood) e placa verde da freeway em cima da pista
function landmarksLA(tr, add, r) {
  const { pts, n, W } = tr, K = tr.t.scale;
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(900, 520, 9), M(0x8a6a5a))); hill.position.set(800 * K, 220, -1500 * K);
  const letters = canvasTex(1024, 160, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.font = "bold 150px Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("G A L E R A", w / 2, hh / 2 + 6); }, false);
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 140), new THREE.MeshBasicMaterial({ map: letters, transparent: true }))); sign.position.set(800 * K, 300, -1500 * K + 250); sign.rotation.x = -0.25;
  const p = pts[Math.floor(n * 0.33)], gsign = canvasTex(256, 96, (x, w, hh) => { x.fillStyle = "#1d6b3a"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, hh - 12); x.fillStyle = "#fff"; x.font = "bold 30px sans-serif"; x.textAlign = "center"; x.fillText("110 FREEWAY", w / 2, 42); x.font = "bold 22px sans-serif"; x.fillText("Vila da Galera ↑", w / 2, 76); }, false);
  const g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // o z do grupo aponta para o lado da pista
  const mat = M(0x777777);
  for (const k of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(3, 64, 3), mat); post.position.set(0, 32, k * (W / 2 + 6)); g.add(post); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2, 30, 70), [new THREE.MeshBasicMaterial({ map: gsign }), new THREE.MeshBasicMaterial({ map: gsign }), mat, mat, mat, mat]); board.position.set(0, 64, 0); g.add(board);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 2, W + 12), mat); beam.position.y = 52; g.add(beam);
}
// Rio: calçadão de Copacabana com as ondas pretas e brancas, areia, Pão de Açúcar, Cristo no morro e os Arcos da Lapa
function landmarksRio(tr, add, r, size, ribbon) {
  const { pts, n, W } = tr, L0 = tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 20, L = L0;
  // o trecho da orla: os pontos perto do mar (com a largada girada, ele pode passar pelo índice 0)
  const naOrla = (i) => pts[(i + n) % n].x < 470 * tr.t.scale;
  let i0 = 0; while (i0 < n && !naOrla(i0)) i0++; while (i0 > -n && naOrla(i0 - 1)) i0--; // volta até o começo da orla
  let i1 = i0; while (i1 < i0 + n - 1 && naOrla(i1 + 1)) i1++; // e vai até o fim dela (i1 pode passar de n: a fita usa i % n)
  const waves = canvasTex(128, 128, (x, w, hh) => { x.fillStyle = "#f4f1e6"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#1a1a1a"; x.lineWidth = 14; for (let k = -1; k < 3; k++) { x.beginPath(); for (let yy = 0; yy <= hh; yy += 4) { const xx = w / 2 + Math.sin((yy / hh) * Math.PI * 2) * 30 + k * 0; yy ? x.lineTo(xx + (k - 0.5) * 64, yy) : x.moveTo(xx + (k - 0.5) * 64, yy); } x.stroke(); } });
  ribbon(L, L + 34, 0.5, new THREE.MeshStandardMaterial({ map: waves, roughness: 0.8, side: THREE.DoubleSide }), 40, 0.5, 1, i0, i1);
  const sand = canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#e8d6a8"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#dcc995" : "#f2e3bb"; x.fillRect(rr() * w, rr() * hh, 2, 2); } });
  ribbon(L + 34, L + 190, 0.6, new THREE.MeshStandardMaterial({ map: sand, roughness: 1, side: THREE.DoubleSide }), 64, 0.6, 4, i0, i1);
  const world = tr.t.world, K = tr.t.scale;
  const seaM = new THREE.MeshStandardMaterial({ map: aguaTex("#1f8ab0"), roughness: 0.15, metalness: 0.25 }); seaM.map.repeat.set(size / 220, size / 220); tr.agua.push(seaM);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), seaM)); sea.rotation.x = -Math.PI / 2; sea.position.set(world / 2, -6, world / 2);
  // guarda-sóis coloridos na areia
  for (let i = i0 + 4; i < i1; i += 6) { const p = pts[(i + n) % n], d = L + 60 + r() * 90, x = p.x + p.nx * d, y = p.y + p.ny * d, col = [0xff5a5a, 0xffd23f, 0x3fa9f5, 0x7ed07a][(r() * 4) | 0];
    const um = add(new THREE.Mesh(new THREE.ConeGeometry(12, 5, 8), M(col))); um.position.set(x, 13, y); const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12), M(0xdddddd))); st.position.set(x, 6, y); }
  // Pão de Açúcar (dois morros no mar)
  for (const [x, y, s] of [[-420, 1650, 1], [-180, 1820, 0.6]]) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), M(0x4a5a46))); m.scale.set(s * K, s * K * 1.9, s * K * 0.9); m.position.set(x * K, 0, y * K); }
  // Cristo Redentor num morro alto atrás da subida
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(700, 900, 10), M(0x2f5a32))); hill.position.set(2300 * K, 380, -700 * K);
  const stone = M(0xeeeeee, { roughness: 0.6 }), cg = new THREE.Group(); cg.position.set(2300 * K, 830, -700 * K); add(cg);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 110, 10), stone); body.position.y = 55; cg.add(body);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(150, 14, 14), stone); arms.position.y = 98; arms.rotation.y = 0.7; cg.add(arms);
  const head = new THREE.Mesh(new THREE.SphereGeometry(11, 10, 8), stone); head.position.y = 118; cg.add(head);
  // Arcos da Lapa atravessando a pista (o carro passa por baixo de um arco)
  const p = pts[Math.floor(n * 0.79)], g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
  const white = M(0xf4f1e6, { roughness: 0.9 }), span = 34;
  for (let k = -6; k <= 6; k++) {
    const z = k * span; if (Math.abs(z) < W / 2 + 14) continue; // o vão em cima da pista
    const pil = new THREE.Mesh(new THREE.BoxGeometry(10, 64, 10), white); pil.position.set(0, 32, z); pil.castShadow = true; g.add(pil);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 16, span * 13), white); top.position.y = 72; top.castShadow = true; g.add(top);
  for (let k = -6; k < 6; k++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2 - 5, 3, 6, 12, Math.PI), white); arch.position.set(0, 62, (k + 0.5) * span); arch.rotation.y = Math.PI / 2; g.add(arch); }
}
let worldOn = null;
// devolve a promessa do céu (resolve quando a foto chegou e foi aplicada, ou na hora se ela não vem)
export function useTrack(tr, hora = "dia", podeMudarLuz = () => true) {
  const noite = hora === "noite";
  if (worldOn === tr && tr.noite === noite) return Promise.resolve();
  if (worldOn) scene.remove(worldOn.grp);
  worldOn = tr; tr.noite = noite; scene.add(tr.grp);
  const L = tr.look;
  const corNeblina = noite ? 0x101b33 : L.fog;
  scene.fog = new THREE.Fog(corNeblina, noite ? Math.min(L.fogN, 650) : L.fogN, noite ? Math.min(L.fogF, 3400) : L.fogF); renderer.setClearColor(corNeblina);
  hemi.color.set(noite ? 0x9eb9ee : L.hemi[0]); hemi.groundColor.set(noite ? 0x41445a : L.hemi[1]); hemi.intensity = noite ? 0.95 : L.hemi[2];
  sun.color.set(noite ? 0xc9dcff : L.sun[0]); sun.intensity = noite ? 0.8 : L.sun[1];
  if (tr.sky) { tr.sky.visible = true; tr.sky.material.color.set(noite ? 0x15213d : 0xffffff); }
  return aplicarCeu(tr, L, noite, podeMudarLuz).then(() => { if (worldOn === tr && tr.sky && scene.background) tr.sky.visible = false; }); // a foto do céu chegou: sai o degradê
}

// quando os enfeites do Kenney chegam, as pistas que já tinham sido montadas com formas simples são refeitas
aoCarregar(() => { for (const tr of Object.values(TRACKS)) if (!tr.comProps) { for (const c of [...tr.grp.children]) { tr.grp.remove(c); c.traverse?.((o) => { o.geometry?.dispose?.(); }); } buildWorld(tr); tr.comProps = true; } });
