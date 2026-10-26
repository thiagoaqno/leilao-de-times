// Mônaco no detalhe, como nas fotos da corrida de verdade: o chão (sarjeta, zebras só nas curvas, as amarelas da chicane
// e da Piscine, faixas de pedestre, as linhas da rua que ficam pintadas, as linhas do safety car, o grid com os números,
// remendos e bueiros), o guard-rail pintado em painéis, as fachadas com sacadas, venezianas e toldos, as passarelas por
// cima da pista, a capela de Sainte Dévote, os postes da rua e a montanha de pedra atrás da cidade (a Tête de Chien).
// Tudo é cenário: nada aqui muda a física. As frações (0 a 1) são da volta, a partir da linha de chegada.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";

// ---------- trechos pintados ao longo da pista ----------
// Cada material junta todos os seus pedaços numa malha só (uma chamada de desenho por material).
function lotes() {
  const mapa = new Map();
  const de = (mat) => { if (!mapa.has(mat)) mapa.set(mat, { vs: [], uv: [], idx: [] }); return mapa.get(mat); };
  const montar = (add, nome) => {
    for (const [mat, l] of mapa) {
      if (!l.idx.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(l.vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(l.uv, 2)); g.setIndex(l.idx); g.computeVertexNormals();
      const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = nome;
    }
  };
  return { de, montar };
}
// do ponto i0 ao i1 (podem passar de n), de lado l0 a l1, na altura da pista + y0 (em l0) e y1 (em l1); v vai de v0 a v1
function tira(tr, l, i0, i1, l0, l1, y0, y1, v0 = 0, v1 = 1, u0 = 0, u1 = 1) {
  const { pts, n } = tr, base = l.vs.length / 3;
  for (let i = i0; i <= i1; i++) {
    const p = pts[((i % n) + n) % n], v = v0 + (v1 - v0) * ((i - i0) / Math.max(1, i1 - i0));
    l.vs.push(p.x + p.nx * l0, p.h + y0, p.y + p.ny * l0, p.x + p.nx * l1, p.h + y1, p.y + p.ny * l1); l.uv.push(u0, v, u1, v);
    if (i < i1) { const a = base + (i - i0) * 2; l.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
}
// tinta no asfalto: por cima do asfalto e da borracha, sem brigar com eles na profundidade
const tinta = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });
// tinta gasta: falhas e pontinhos de asfalto aparecendo por baixo
function gastar(x, w, hh, rr, quanto = 0.18) {
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < w * hh * 0.02; i++) { x.fillStyle = `rgba(0,0,0,${rr() * quanto * 2})`; x.fillRect(rr() * w, rr() * hh, 1 + rr() * 3, 1 + rr() * 3); }
  x.globalCompositeOperation = "source-over";
}
const sinalDaCurva = (pts, n, i) => { const p = pts[i], q = pts[(i + 3) % n]; return p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1; }; // o lado de dentro

// ---------- o chão: sarjeta, zebras e as marcas da rua ----------
export function chaoMonaco(tr, add, { gridSpot }) {
  const { pts, n, W } = tr, L = lotes(), meia = W / 2, perto = (f) => Math.floor(f * n);
  const r = (() => { let s = 90210; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  // a sarjeta: a junta escura colada no asfalto, o concreto do meio-fio e a canaleta do lado do guard-rail
  const sarjeta = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => {
    x.fillStyle = "#aaa69c"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 700; i++) { x.fillStyle = rr() < 0.5 ? "#9c988e" : "#b8b4aa"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
    x.fillStyle = "#4f5154"; x.fillRect(0, 0, 5, hh); x.fillStyle = "#8d8a82"; x.fillRect(46, 0, 18, hh); x.fillStyle = "#77746d"; x.fillRect(46, 0, 2, hh);
    x.fillStyle = "#86837b"; x.fillRect(0, 0, w, 2); // as juntas a cada placa de concreto
  }), roughness: 0.95, side: THREE.DoubleSide });
  for (const s of [-1, 1]) tira(tr, L.de(sarjeta), 0, n, s * meia, s * (meia + 7), 0.5, 0.5, 0, (n * 6) / 40);
  // zebras só nas curvas: do lado de dentro em volta do ápice e do lado de fora na saída. Na Nouvelle Chicane e na
  // Piscine, as zebras de dentro são as amarelas, mais altas (as de verdade foram pintadas assim para ninguém cortar)
  const zebraT = canvasTex(32, 64, (x, w, hh) => { x.fillStyle = "#d62828"; x.fillRect(0, 0, w, hh / 2); x.fillStyle = "#f4f4f4"; x.fillRect(0, hh / 2, w, hh / 2); x.fillStyle = "#00000030"; x.fillRect(0, 0, 3, hh); });
  const zebra = new THREE.MeshStandardMaterial({ map: zebraT, roughness: 0.6, side: THREE.DoubleSide });
  const amarela = new THREE.MeshStandardMaterial({ map: canvasTex(32, 64, (x, w, hh) => { x.fillStyle = "#f2c230"; x.fillRect(0, 0, w, hh); x.fillStyle = "#c99a1a"; x.fillRect(0, hh - 4, w, 4); x.fillStyle = "#00000030"; x.fillRect(0, 0, 3, hh); }), roughness: 0.6, side: THREE.DoubleSide });
  const amarelas = [[0.608, 0.645], [0.735, 0.805]], ehAmarela = (i) => amarelas.some(([a, b]) => i >= a * n && i <= b * n);
  const marca = { "-1": new Uint8Array(n), "1": new Uint8Array(n) };
  for (let i = 0; i < n; i++) {
    const k = pts[i].k || 0; if (k < 1 / 300) continue;
    const dentro = sinalDaCurva(pts, n, i);
    for (let j = i - 8; j <= i + 8; j++) marca[dentro][(j + n) % n] = 1;
    if (k > 1 / 180) for (let j = i + 2; j <= i + 16; j++) marca[-dentro][(j + n) % n] = 1;
  }
  tr.zebras = new Uint8Array(n); // para as faíscas do assoalho (jogo.js): só onde tem zebra de verdade
  for (const s of [-1, 1]) { // cada trecho seguido de zebra vira uma fita, cortada onde muda de cor
    const m = marca[s]; let a = -1, corA = false;
    for (let i = 0; i <= n; i++) {
      const tem = i < n && !!m[i], cor = tem && ehAmarela(i);
      if (a >= 0 && (!tem || cor !== corA)) { tira(tr, L.de(corA ? amarela : zebra), a, i, s * meia, s * (meia + 7), 0.58, corA ? 1.6 : 1.0, (a * 6) / 28, (i * 6) / 28); a = -1; }
      if (tem && a < 0) { a = i; corA = cor; }
      if (tem) tr.zebras[i] = 1;
    }
  }
  const proibido = (i) => { const f = (((i % n) + n) % n) / n; return f > 0.955 || f < 0.012 || (tr.coberto && tr.coberto(((i % n) + n) % n)); }; // o grid, a linha e o túnel
  // faixas de pedestre (as listras correm no sentido da rua), onde a rua é quase reta
  const zebraPe = tinta(canvasTex(256, 64, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f2f1ea"; for (let k = 0; k < 10; k++) x.fillRect(6 + k * 25, 0, 13, hh); gastar(x, w, hh, rr, 0.25); }, false));
  const faixas = [];
  for (const f of [0.12, 0.24, 0.31, 0.36, 0.402, 0.445, 0.69, 0.865]) {
    let best = perto(f); for (let k = perto(f) - 30; k <= perto(f) + 30; k++) { const q = (k + n) % n; if ((pts[q].k || 0) < (pts[best].k || 0) && !proibido(q)) best = q; }
    if (proibido(best)) continue;
    tira(tr, L.de(zebraPe), best, best + 5, -meia + 4, meia - 4, 0.54, 0.54); faixas.push(best);
  }
  // a linha da rua que sobra pintada (tracejada, gasta) na subida da Beau Rivage, em Portier, dentro do túnel e no cais
  const tracejado = tinta(canvasTex(8, 64, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#e9e7dc"; x.fillRect(0, 0, w, 24); gastar(x, w, 24, rr, 0.3); }), { opacity: 0.7 });
  for (const [a, b] of [[0.09, 0.24], [0.33, 0.37], [0.44, 0.61], [0.655, 0.7]]) {
    let i0 = perto(a);
    for (let i = perto(a); i <= perto(b); i++) {
      const parar = i === perto(b) || faixas.some((c) => Math.abs(c - i) < 8);
      if (!parar) continue;
      if (i - i0 > 6) tira(tr, L.de(tracejado), i0, i, -0.8, 0.8, 0.53, 0.53, (i0 * 6) / 80, (i * 6) / 80);
      i0 = i + 1;
    }
  }
  // as linhas do safety car: SC 2 na saída dos boxes (depois da Sainte Dévote) e SC 1 na entrada (antes da Anthony Noghès)
  const linha = tinta(canvasTex(4, 32, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.fillRect(0, 12, w, 8); }, false));
  const escrito = (texto) => tinta(canvasTex(256, 128, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f2f1ea"; x.font = "900 110px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, hh / 2 + 4, w - 10); gastar(x, w, hh, rr); }, false));
  for (const [f, nome] of [[0.075, "SC 2"], [0.89, "SC 1"]]) {
    const i = perto(f);
    tira(tr, L.de(linha), i, i + 1, -meia, meia, 0.55, 0.55);
    tira(tr, L.de(escrito(nome)), i + 2, i + 6, meia - 30, meia - 6, 0.55, 0.55);
  }
  // o grid: o "colchete" de cada posição e o número pintado (as posições ímpares de um lado, as pares do outro)
  for (let g = 0; g < 8; g++) {
    const sp = gridSpot(pts, g, W), lat = (g % 2 ? 1 : -1) * W * 0.22;
    const mat = tinta(canvasTex(128, 192, (x, w, hh, rr) => {
      x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.fillRect(4, 4, w - 8, 12); x.fillRect(4, 4, 10, 60); x.fillRect(w - 14, 4, 10, 60);
      x.font = "900 70px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(g + 1), w / 2, 120); gastar(x, w, hh, rr, 0.12);
    }, false));
    tira(tr, L.de(mat), sp.idx - 3, sp.idx + 3, lat - 15, lat + 15, 0.55, 0.55);
  }
  // remendos de asfalto (rua de cidade, refeita aos pedaços) e os bueiros
  const remendo = (cor) => tinta(canvasTex(64, 64, (x, w, hh, rr) => {
    x.clearRect(0, 0, w, hh); x.fillStyle = cor; x.fillRect(2, 2, w - 4, hh - 4);
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000014" : "#ffffff0c"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
    x.strokeStyle = "#1c1d20aa"; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, hh - 4);
  }, false), { opacity: 0.6 });
  const remendos = [remendo("#3e3f43"), remendo("#6a6a6c")];
  for (let k = 0; k < 46; k++) {
    const i = Math.floor(r() * n), compr = 3 + Math.floor(r() * 9), larg = 14 + r() * 28, c = (r() * 2 - 1) * (meia - 6 - larg / 2);
    if (proibido(i) || proibido(i + compr)) continue;
    tira(tr, L.de(remendos[k % 2]), i, i + compr, c - larg / 2, c + larg / 2, 0.52, 0.52);
  }
  const bueiro = tinta(canvasTex(64, 64, (x, w) => {
    x.clearRect(0, 0, w, w); x.fillStyle = "#3a3c40"; x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "#5c5f64"; x.lineWidth = 3; for (let k = 10; k <= 54; k += 8) { x.beginPath(); x.moveTo(k, 8); x.lineTo(k, 56); x.stroke(); }
    x.strokeStyle = "#232427"; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.stroke();
  }, false), { roughness: 0.5, metalness: 0.4 });
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(r() * n), c = (r() * 2 - 1) * (meia - 10); if (proibido(i)) continue;
    tira(tr, L.de(bueiro), i, i + 1, c - 3.5, c + 3.5, 0.53, 0.53);
  }
  L.montar(add, "monaco-chao");
  tr.detalhesMonaco = { faixas: faixas.length };
}

// ---------- o guard-rail pintado: painéis de 60 (6 m) com as faixas vermelhas e brancas e os nomes do GP ----------
// A textura cobre 480 unidades. lado: de que lado da pista ele fica (o texto lê na direção de quem olha da pista).
export function guardRailMonaco(lado) {
  const C = 1024, H = 48, plano = document.createElement("canvas"); plano.width = C; plano.height = H;
  const x = plano.getContext("2d"), painel = C / 8;
  const listras = (x0) => { for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? "#f4f4f4" : "#d62828"; x.fillRect(x0 + (k * painel) / 8, 0, painel / 8 + 1, H); } };
  const nome = (x0, fundo, cor, texto) => { x.fillStyle = fundo; x.fillRect(x0, 0, painel, H); x.fillStyle = cor; x.font = "900 26px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, x0 + painel / 2, H / 2 + 1, painel - 10); };
  listras(0); nome(painel, "#c8102e", "#ffffff", "MONACO"); listras(painel * 2); nome(painel * 3, "#10283a", "#ffffff", "GRAND PRIX");
  nome(painel * 4, "#0d3b2e", "#e6c56a", "MONTE-CARLO"); listras(painel * 5); nome(painel * 6, "#f4f4f4", "#c8102e", "MONACO"); nome(painel * 7, "#ffd23f", "#111111", "GALERA");
  // a lâmina ondulada do guard-rail: duas dobras escuras e as bordas de aço
  x.fillStyle = "#0000002a"; x.fillRect(0, 15, C, 3); x.fillRect(0, 31, C, 3); x.fillStyle = "#9aa3a8"; x.fillRect(0, 0, C, 3); x.fillRect(0, H - 4, C, 4);
  x.fillStyle = "#00000040"; for (let k = 0; k < C; k += painel / 2) x.fillRect(k, 0, 2, H); // os parafusos/emendas
  // na textura da fita, u é a altura (0 embaixo) e v o comprimento (1 = para a frente): gira o desenho
  return canvasTex(H, C, (c) => { if (lado > 0) c.setTransform(0, 1, -1, 0, H, 0); else c.setTransform(0, -1, -1, 0, H, C); c.drawImage(plano, 0, 0); });
}

// ---------- as fachadas: sacadas, venezianas, toldos listrados, cornija e os telhados de telha ----------
const CORES = [["#f1d9b5", "#3f6b4a"], ["#efc9a7", "#4f7392"], ["#f6e7c9", "#7a5236"], ["#e8b78f", "#2f5f4a"], ["#f4ece0", "#46617d"], ["#e9ac93", "#3f6b4a"], ["#f3dca0", "#5a7d9a"]];
const TOLDOS = ["#2f6db3", "#2f8a4f", "#c8102e", "#e0a21b"];
function fachada([parede, veneziana], semente) {
  // 256 × 256 = 4 × 4 janelas, 120 × 120 unidades (cada andar com 3 m)
  return canvasTex(256, 256, (x, w, hh, rr) => {
    for (let k = 0; k < semente; k++) rr();
    x.fillStyle = parede; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#0000000a" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) {
      const x0 = c * 64, y0 = a * 64, aberta = rr() < 0.55;
      x.fillStyle = "#00000018"; x.fillRect(x0, y0 + 60, 64, 4); // a linha do andar
      x.fillStyle = aberta ? "#2c3540" : "#3b4b5a"; x.fillRect(x0 + 22, y0 + 14, 20, 34); x.fillStyle = "#ffffff30"; x.fillRect(x0 + 24, y0 + 16, 7, 30);
      x.fillStyle = veneziana; if (aberta) { x.fillRect(x0 + 12, y0 + 14, 9, 34); x.fillRect(x0 + 43, y0 + 14, 9, 34); } else x.fillRect(x0 + 22, y0 + 14, 20, 34);
      x.fillStyle = "#00000030"; for (let k = 0; k < 34; k += 4) { if (aberta) { x.fillRect(x0 + 12, y0 + 14 + k, 9, 1); x.fillRect(x0 + 43, y0 + 14 + k, 9, 1); } else x.fillRect(x0 + 22, y0 + 14 + k, 20, 1); }
      if (rr() < 0.6) { // a sacada com a grade
        x.fillStyle = "#ece7dc"; x.fillRect(x0 + 8, y0 + 48, 48, 5); x.fillStyle = "#2d2f33"; x.fillRect(x0 + 8, y0 + 38, 48, 2);
        for (let k = 10; k < 56; k += 4) x.fillRect(x0 + k, y0 + 38, 1, 10);
      }
      if (rr() < 0.22) { // toldo listrado em cima da janela
        const cor = TOLDOS[(rr() * TOLDOS.length) | 0];
        for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? "#f4f4f4" : cor; x.fillRect(x0 + 16 + k * 5.4, y0 + 5, 5.4, 10); }
        x.fillStyle = "#00000040"; x.fillRect(x0 + 16, y0 + 15, 32, 2);
      }
    }
  });
}
// o tamanho de cada janela no mundo, qualquer que seja o tamanho do prédio: a textura repete pelo tamanho da instância
function repetePelaEscala(mat) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#if defined( USE_INSTANCING ) && defined( USE_MAP )
  vec3 escala = vec3( length( instanceMatrix[ 0 ].xyz ), length( instanceMatrix[ 1 ].xyz ), length( instanceMatrix[ 2 ].xyz ) );
  vMapUv *= vec2( abs( normal.x ) > 0.5 ? escala.z : escala.x, escala.y ) / 120.0;
#endif`);
  };
  mat.customProgramCacheKey = () => "fachada-monaco";
  return mat;
}
// blds: a lista de prédios de pista.js ({ x, y, h, sx, sy, sz, r }; o centro fica em h + 0,5)
export function fachadasMonaco(add, blds) {
  if (!blds.length) return;
  const caixa = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D();
  const grupos = CORES.map(() => []), cornijas = [], telhados = [], casinhas = [];
  blds.forEach((o, k) => {
    grupos[(k * 7 + Math.floor(Math.abs(o.x))) % CORES.length].push(o);
    const topo = o.h + 0.5 + o.sy / 2;
    cornijas.push({ x: o.x, y: topo + 1.5, z: o.y, sx: o.sx + 4, sy: 3, sz: o.sz + 4, r: o.r });
    if ((k * 13) % 9 < 4) telhados.push({ x: o.x, y: topo + 3 + 11, z: o.y, sx: o.sx + 2, sy: 22, sz: o.sz + 2, r: o.r });
    else casinhas.push({ x: o.x + Math.cos(o.r) * o.sx * 0.2, y: topo + 8, z: o.y - Math.sin(o.r) * o.sx * 0.2, sx: Math.min(30, o.sx * 0.35), sy: 10, sz: Math.min(24, o.sz * 0.3), r: o.r }); // casa de máquinas no terraço
  });
  const instancias = (geo, mat, lista) => {
    if (!lista.length) return;
    const m = add(new THREE.InstancedMesh(geo, mat, lista.length));
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = m.receiveShadow = true; return m;
  };
  grupos.forEach((lista, k) => instancias(caixa, repetePelaEscala(new THREE.MeshStandardMaterial({ map: fachada(CORES[k], k * 37), roughness: 0.85 })), lista.map((o) => ({ x: o.x, y: o.h + 0.5, z: o.y, sx: o.sx, sy: o.sy, sz: o.sz, r: o.r }))));
  instancias(caixa, M(0xf3eee2, { roughness: 0.8 }), cornijas);
  instancias(caixa, M(0xd8d2c4, { roughness: 0.9 }), casinhas);
  const quatroAguas = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); quatroAguas.rotateY(Math.PI / 4);
  instancias(quatroAguas, new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#b5583c"; x.fillRect(0, 0, w, hh); for (let yy = 0; yy < hh; yy += 6) { x.fillStyle = "#00000022"; x.fillRect(0, yy, w, 2); } for (let i = 0; i < 200; i++) { x.fillStyle = rr() < 0.5 ? "#c8694a" : "#9e4a30"; x.fillRect(rr() * w, rr() * hh, 4, 3); } }), roughness: 0.85, flatShading: true }), telhados);
}

// ---------- os marcos: passarelas, a capela, os postes e a montanha ----------
export function marcosMonaco(tr, add, { hAt }) {
  const { pts, n, W } = tr, L = tr.wallLat, perto = (f) => Math.floor(f * n);
  // longe de qualquer outro trecho da pista (os grampos deixam trechos vizinhos colados)
  const livre = (x, z, folga) => pts.every((q) => Math.hypot(q.x - x, q.y - z) > W / 2 + folga);
  const stats = { passarelas: 0, postes: 0, capela: 0 };
  // passarelas por cima da pista, com as faixas do GP dos dois lados
  const faixa = (texto, fundo, cor) => canvasTex(1024, 128, (x, w, hh) => { x.fillStyle = fundo; x.fillRect(0, 0, w, hh); x.fillStyle = cor; x.fillRect(0, hh - 10, w, 10); x.font = "900 76px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, hh / 2 - 2, w - 40); }, false);
  const faixas = [faixa("GRAND PRIX DE MONACO", "#c8102e", "#f4f4f4"), faixa("MONTE-CARLO", "#10283a", "#e6c56a"), faixa("GALERA · MONACO", "#f4f4f4", "#c8102e")];
  const aco = M(0x3a4048, { roughness: 0.5, metalness: 0.4 }), vidro = M(0x9fb8c8, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 });
  // os candidatos, em ordem: ficam no máximo três (os pés não podem cair na água, na arquibancada ou no grampo vizinho)
  [0.02, 0.165, 0.855, 0.31, 0.93].forEach((f) => {
    const i = perto(f), p = pts[i], vao = L + 16, k = stats.passarelas;
    if (k >= 3 || (tr.coberto && tr.coberto(i))) return;
    const pes = [-1, 1].map((s) => [p.x + p.nx * s * vao, p.y + p.ny * s * vao]);
    if (!pes.every(([x, z]) => livre(x, z, 14) && !tr.ocupado?.(x, z))) return;
    const g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
    const alto = 74, fx = new THREE.MeshBasicMaterial({ map: faixas[k % 3] });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 16, vao * 2 + 16), [fx, fx, aco, aco, aco, aco]); deck.position.y = alto + 8; deck.castShadow = true; g.add(deck);
    const corrimao = new THREE.Mesh(new THREE.BoxGeometry(12, 10, vao * 2 + 14), vidro); corrimao.position.y = alto + 21; g.add(corrimao);
    for (const s of [-1, 1]) {
      const torre = new THREE.Mesh(new THREE.BoxGeometry(16, alto + 26, 18), aco); torre.position.set(0, (alto + 26) / 2, s * (vao + 2)); torre.castShadow = true; g.add(torre);
      const janela = new THREE.Mesh(new THREE.BoxGeometry(16.4, alto - 10, 12), vidro); janela.position.set(0, (alto - 10) / 2 + 8, s * (vao + 2)); g.add(janela);
    }
    for (const [x, z] of pes) tr.reservado?.push([x, z, 30]);
    stats.passarelas++;
  });
  // a capela de Sainte Dévote, do lado de fora da primeira curva (creme, telhado de telha e a torrinha do sino)
  {
    let a = perto(0.063); for (let k = perto(0.04); k <= perto(0.09); k++) if ((pts[k].k || 0) > (pts[a].k || 0)) a = k;
    const p = pts[a], fora = -sinalDaCurva(pts, n, a);
    for (const d of [L + 60, L + 90, L + 130]) {
      const x = p.x + p.nx * fora * d, z = p.y + p.ny * fora * d;
      if (!livre(x, z, 50) || tr.ocupado?.(x, z)) continue;
      const g = new THREE.Group(), h = hAt(x, z); g.position.set(x, h, z); g.rotation.y = Math.atan2(p.tx, p.ty); add(g);
      const creme = M(0xefe3c8, { roughness: 0.85 }), telha = M(0xb5583c, { roughness: 0.85, flatShading: true });
      const nave = new THREE.Mesh(new THREE.BoxGeometry(28, 26, 46), creme); nave.position.y = 13; nave.castShadow = nave.receiveShadow = true; g.add(nave);
      const empena = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 48, 3), telha); empena.rotation.set(Math.PI / 2, 0, Math.PI / 2); empena.scale.set(1, 1, 0.55); empena.position.y = 30; empena.castShadow = true; g.add(empena);
      const torre = new THREE.Mesh(new THREE.BoxGeometry(10, 48, 10), creme); torre.position.set(0, 24, -26); torre.castShadow = true; g.add(torre);
      const sino = new THREE.Mesh(new THREE.BoxGeometry(10.4, 7, 10.4), M(0x3a3026)); sino.position.set(0, 42, -26); g.add(sino);
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(7.6, 12, 4), telha); ponta.rotation.y = Math.PI / 4; ponta.position.set(0, 54, -26); g.add(ponta);
      const porta = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.6), M(0x5b3a24)); porta.position.set(0, 6, 23.3); g.add(porta);
      tr.reservado?.push([x, z, 50]); stats.capela = 1; break;
    }
  }
  // postes da rua, verde-escuros, com o braço virado para a pista (atrás do guard-rail, um lado de cada vez)
  const postes = [], bracos = [], lanternas = [];
  for (let i = 10, lado = 1; i < n; i += 34, lado = -lado) {
    if (tr.coberto && tr.coberto(i)) continue;
    const p = pts[i], d = L + 13, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (!livre(x, z, 16) || tr.ocupado?.(x, z, i)) continue; // nem na água, nem nas arquibancadas, nem no grampo vizinho
    const h = p.h, dx = -p.nx * lado, dz = -p.ny * lado, ry = Math.atan2(-dz, dx);
    postes.push({ x, y: h + 32, z, sx: 1, sy: 1, sz: 1, r: 0 });
    bracos.push({ x: x + dx * 7, y: h + 63, z: z + dz * 7, sx: 15, sy: 1, sz: 1, r: ry });
    lanternas.push({ x: x + dx * 13, y: h + 61, z: z + dz * 13, sx: 4, sy: 3, sz: 4, r: ry });
  }
  const d = new THREE.Object3D();
  const inst = (geo, mat, lista, sombra = true) => { if (!lista.length) return; const m = add(new THREE.InstancedMesh(geo, mat, lista.length)); lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }); m.castShadow = sombra; m.receiveShadow = true; m.name = "monaco-postes"; };
  const verde = M(0x22352b, { roughness: 0.6, metalness: 0.3 });
  inst(new THREE.CylinderGeometry(0.8, 1.3, 64, 8), verde, postes);
  inst(new THREE.BoxGeometry(1, 1, 1), verde, bracos);
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd99a, emissiveIntensity: 0.6 }), lanternas, false);
  stats.postes = postes.length;
  tr.marcosMonaco = stats;
}

// a Tête de Chien e os morros de pedra calcária atrás da cidade, ao norte (longe do mar): a cor já vem misturada com o
// azul da distância e a neblina não apaga (fica muito além do fim dela)
export function montanhaMonaco(tr, add) {
  const world = tr.t.world, largura = 12000, fundo = 2400, geo = new THREE.PlaneGeometry(largura, fundo, 120, 24); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cores = [], rocha = new THREE.Color("#7d776c"), mato = new THREE.Color("#3f5236"), longe = new THREE.Color("#8fa3b3"), c = new THREE.Color();
  const ruido = (x, z) => Math.sin(x / 233 + z / 171) * Math.cos(x / 97 - z / 143) + 0.5 * Math.sin(x / 61 + z / 37);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), t = (fundo / 2 - z) / fundo; // 0 na frente (perto da cidade), 1 lá atrás
    const crista = 860 + 260 * Math.sin(x / 1100 + 1.2) + 170 * Math.sin(x / 430 + 2) + 80 * Math.sin(x / 170);
    const h = crista * Math.pow(t, 0.75) + ruido(x, z) * 40 * t - 8;
    pos.setY(i, h);
    const alto = Math.min(1, Math.max(0, h / 520)), pedra = Math.min(1, alto * 0.9 + (ruido(x * 1.7, z * 1.3) * 0.5 + 0.5) * 0.35);
    c.copy(mato).lerp(rocha, pedra).lerp(longe, 0.12 + 0.2 * t); cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); geo.computeVertexNormals();
  const m = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false })));
  m.position.set(world / 2, 0, -1350 - fundo / 2); m.name = "monaco-montanha";
}
