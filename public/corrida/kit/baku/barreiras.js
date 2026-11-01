// Baku — as barreiras de verdade, só onde a pista real as tem. O mapa é o MESMO da física (`tr.murosEscape`, de `muros` em pistas.js: a distância da
// face da barreira até a borda do asfalto, por ponto e por lado; 0 = sem barreira, e ali o carro pode sair da pista): o que está desenhado é o que
// o carro encontra. Cada trecho contínuo ganha, como nas fotos da corrida:
//   · a barreira de concreto com a faixa de patrocínio (Qatar Airways, MSC Cruises, American Express, AWS...), uma placa por ~100 unidades;
//   · a cerca alta de detritos: TELA de arame (galvanizada, em quadrados) contínua, presa em postes de aço de ponta a ponta, sem nada solto no ar,
//     e o friso no topo;
//   · onde a pista estreita (Cidade Velha) a barreira entra no asfalto, e a pedra do calçadão cobre o que sobra do asfalto por fora dela;
//   · as áreas de escape de asfalto pintado (vermelho junto da pista e verde por fora, como na curva 1) e os blocos Tecpro nas curvas de bater.
// Peça só desta pista. `cfg`: { placas: [[de, ate, marca]], escapes: [[de, ate, lado]], tecpro: [[de, ate, lado]] }.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias, livre } from "../comum.js";

const MARCAS = { // fundo, texto, cor do texto
  qatar: ["#4a1738", "QATAR AIRWAYS", "#eadcea"], msc: ["#0d2757", "MSC CRUISES", "#ffffff"], amex: ["#1b68c9", "AMERICAN EXPRESS", "#ffffff"], aws: ["#222d3b", "aws", "#ffffff"],
  rolex: ["#0a5a36", "ROLEX", "#e6c35a"], dhl: ["#f4c20d", "DHL", "#d3122b"], baku: ["#5b2a8a", "BAKU CITY CIRCUIT", "#ffffff"], azer: ["#00a3c8", "AZERBAIJAN  LAND OF FIRE", "#ffffff"], pirelli: ["#f2c100", "PIRELLI", "#111111"],
};
const matPlaca = (marca, lado) => new THREE.MeshStandardMaterial({ map: canvasTex(1024, 128, (x, w, hh, rr) => {
  const [fundo, texto, cor] = MARCAS[marca] || MARCAS.qatar;
  x.fillStyle = "#9d9b95"; x.fillRect(0, 0, w, hh); // o concreto
  x.fillStyle = fundo; x.fillRect(0, 12, w, hh * 0.68);
  x.fillStyle = "#ffffff18"; x.fillRect(0, 12, w, 4); x.fillStyle = "#00000030"; x.fillRect(0, hh * 0.68 + 8, w, 4);
  x.save(); // (o nome sai certo dos dois lados: a fita de cada lado já é desenhada de frente para a pista)
  x.fillStyle = cor; x.textBaseline = "middle"; x.textAlign = "center"; x.font = `700 ${marca === "aws" ? 62 : 54}px "Figtree", "Segoe UI", Arial, sans-serif`;
  for (let k = 0; k < 2; k++) x.fillText(texto, w * (0.25 + k * 0.5), 12 + hh * 0.34);
  x.restore();
  x.fillStyle = "#00000022"; for (let k = 1; k < 4; k++) x.fillRect(k * 256 - 1, 0, 2, hh); // as juntas entre os blocos
  for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff12"; x.fillRect(rr() * w, rr() * hh, 3, 2); }
}), roughness: 0.75, side: THREE.DoubleSide });

const telaTex = () => { const t = canvasTex(64, 64, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.strokeStyle = "#9aa1a8"; x.lineWidth = 2; for (const p of [1, 17, 33, 49]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, hh); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(w, p); x.stroke(); } }); return t; };

export function barreirasBaku(tr, add, cfg = {}) {
  const { pts, n, W } = tr, mapa = tr.murosEscape; if (!mapa) return;
  const placas = cfg.placas || [], marcaEm = (i) => { const f = ((i % n) + n) % n / n; for (const [de, ate, m] of placas) if (de <= ate ? f >= de && f < ate : f >= de || f < ate) return m; return "qatar"; };
  const ALTO = 9, CERCA = 17, PASSO_POSTE = 4;
  const telaMat = new THREE.MeshBasicMaterial({ map: telaTex(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.2, depthWrite: false, fog: true });
  const aco = M(0x8b9299, { roughness: 0.5, metalness: 0.6 }), concreto = M(0x9a9892, { roughness: 0.9, side: THREE.DoubleSide }), pedraCalcada = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#b9b2a2"; x.fillRect(0, 0, w, hh); for (let yy = 0; yy < hh; yy += 8) for (let xx = (yy / 8 % 2) * 4; xx < w; xx += 8) { x.fillStyle = rr() < 0.5 ? "#aaa393" : "#c4bdac"; x.fillRect(xx, yy, 7, 7); } }), roughness: 0.9, side: THREE.DoubleSide });
  const materiais = new Map(), matDe = (m, lado) => { const k = m + lado; if (!materiais.has(k)) materiais.set(k, matPlaca(m, lado)); return materiais.get(k); };
  const postes = [], stats = tr.barreirasBaku = { trechos: 0, pontos: 0, postes: 0, tecpro: 0, estreito: 0 };
  const geoBuf = (pos, uv, idx) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  for (const s of [-1, 1]) {
    const v = mapa[s];
    for (let i0 = 0; i0 < n; i0++) {
      if (!v[i0] || (v[(i0 - 1 + n) % n] && i0 > 0)) continue;
      let i1 = i0; while (i1 + 1 < i0 + n && v[(i1 + 1) % n]) i1++;
      if (i1 - i0 < 3) continue; stats.trechos++; stats.pontos += i1 - i0 + 1;
      const lat = (i) => s * (W / 2 + v[((i % n) + n) % n]), P = (i, l, y) => { const p = pts[((i % n) + n) % n]; return [p.x + p.nx * l, p.h + y, p.y + p.ny * l]; };
      // cada trecho de placa (mesmo patrocinador) é uma fita: a barreira de concreto com o painel
      for (let a = i0; a <= i1;) {
        const m = marcaEm(a); let b = a; while (b < i1 && marcaEm(b + 1) === m) b++;
        if (b === a) { a = b + 1; continue; }
        const pos = [], uv = [], idx = []; let u = (a * 6) / 100;
        for (let i = a; i <= b; i++) {
          const l = lat(i), [x0, y0, z0] = P(i, l, -8), [x1, y1, z1] = P(i, l, ALTO);
          pos.push(x0, y0, z0, x1, y1, z1); uv.push(s > 0 ? -u : u, 0, s > 0 ? -u : u, 1); // (a fita da direita corre ao contrário: o nome lê da esquerda para a direita de quem olha a barreira da pista)
          if (i < b) { const q = (i - a) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } u += 6 / 100;
        }
        const g = geoBuf(pos, uv, idx), mesh = add(new THREE.Mesh(g, matDe(m, s))); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = "baku-muro"; a = b;
      }
      // o topo do bloco (uma fita de 2,4 de largura) e o friso da cerca em cima
      { const pos = [], uv = [], idx = [];
        for (let i = i0; i <= i1; i++) { const l = lat(i); const A = P(i, l - s * 1.2, ALTO), B = P(i, l + s * 1.2, ALTO); pos.push(...A, ...B); uv.push(0, 0, 1, 0); if (i < i1) { const q = (i - i0) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
        const mesh = add(new THREE.Mesh(geoBuf(pos, uv, idx), concreto)); mesh.name = "baku-muro"; mesh.receiveShadow = true; }
      // a tela: uma fita contínua do topo do bloco até o alto da cerca (o arame em quadrados de 4,5), presa nos postes; o friso de aço corre em cima
      { const pos = [], uv = [], idx = []; let u = 0;
        for (let i = i0; i <= i1; i++) { const l = lat(i) + s * 0.8, A = P(i, l, ALTO), B = P(i, l, ALTO + CERCA); pos.push(...A, ...B); uv.push(u, 0, u, CERCA / 4.5 / 2); if (i < i1) { const q = (i - i0) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } u += 6 / 9; }
        const mesh = add(new THREE.Mesh(geoBuf(pos, uv, idx), telaMat)); mesh.name = "baku-muro"; mesh.renderOrder = 2;
        const pf = [], uf = [], xf = [];
        for (let i = i0; i <= i1; i++) { const l = lat(i) + s * 0.8; pf.push(...P(i, l, ALTO + CERCA - 0.6), ...P(i, l, ALTO + CERCA + 0.6)); uf.push(0, 0, 1, 0); if (i < i1) { const q = (i - i0) * 2; xf.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
        const friso = add(new THREE.Mesh(geoBuf(pf, uf, xf), aco)); friso.name = "baku-muro"; }
      // os postes: nas duas pontas e a cada PASSO_POSTE pontos, do pé do bloco ao friso (a tela só existe entre dois postes, então nada fica solto)
      for (let i = i0; i <= i1; i++) if (i === i0 || i === i1 || (i - i0) % PASSO_POSTE === 0) { const p = pts[((i % n) + n) % n], l = lat(i) + s * 0.8; postes.push({ x: p.x + p.nx * l, y: p.h + ALTO + CERCA / 2, z: p.y + p.ny * l, sy: CERCA + 1.2, r: Math.atan2(p.ty, p.tx) }); }
      // onde a barreira entra na pista, o asfalto que sobrou por fora dela vira calçadão de pedra: da face da barreira até a sarjeta
      let estreito = false; for (let i = i0; i <= i1; i++) if (v[i % n] < 0) { estreito = true; break; }
      if (estreito) {
        const pos = [], uv = [], idx = [], A = [];
        for (let i = i0; i <= i1; i++) { const r = v[i % n]; if (r >= 0) { A.push(null); continue; } const l0 = lat(i), l1 = s * (W / 2 + 9); pos.push(...P(i, l0, 0.9), ...P(i, l1, 0.9)); uv.push(i * 6 / 40, 0, i * 6 / 40, 1); A.push(pos.length / 3 - 2); }
        for (let k = 0; k + 1 < A.length; k++) if (A[k] != null && A[k + 1] != null) idx.push(A[k], A[k + 1], A[k] + 1, A[k] + 1, A[k + 1], A[k + 1] + 1);
        if (idx.length) { const mesh = add(new THREE.Mesh(geoBuf(pos, uv, idx), pedraCalcada)); mesh.receiveShadow = true; mesh.name = "baku-chao"; stats.estreito += idx.length / 6; }
      }
    }
  }
  if (postes.length) {
    const geo = new THREE.BoxGeometry(1, 1, 1), im = instancias(add, geo, aco, postes.map((p) => ({ x: p.x, y: p.y, z: p.z, sx: 1.1, sy: p.sy, sz: 1.1, r: p.r })), { nome: "baku-muro" }); void im; stats.postes = postes.length;
  }
  // as áreas de escape de asfalto pintado: vermelho junto da pista e verde por fora (a curva 1 e as outras), do asfalto da pista até a face da barreira
  const escapes = cfg.escapes || [];
  if (escapes.length) {
    const tinta = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#b8453f"; x.fillRect(0, 0, w * 0.42, hh); x.fillStyle = "#3b8d58"; x.fillRect(w * 0.42, 0, w * 0.58, hh); x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, 2, hh); for (let i = 0; i < 400; i++) { x.fillStyle = rr() < 0.5 ? "#0000001a" : "#ffffff16"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }), roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const [de, ate, lado] of escapes) for (const s of lado ? [lado] : [-1, 1]) {
      const a = Math.floor(de * n), b = Math.floor(ate * n), pos = [], uv = [], idx = [];
      for (let i = a; i <= b; i++) { const p = pts[i % n], r = mapa[s][i % n] || 40, l0 = s * (W / 2 + 6.5), l1 = s * (W / 2 + Math.max(10, r - 1)); pos.push(p.x + p.nx * l0, p.h + 0.5, p.y + p.ny * l0, p.x + p.nx * l1, p.h + 0.5, p.y + p.ny * l1); uv.push(0, i * 6 / 50, 1, i * 6 / 50); if (i < b) { const q = (i - a) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
      const mesh = add(new THREE.Mesh(geoBuf(pos, uv, idx), tinta)); mesh.receiveShadow = true; mesh.name = "baku-escape";
    }
  }
  // os blocos Tecpro (o muro de blocos plásticos de absorção, claros com a faixa escura) na frente do concreto das curvas de bater
  const claros = [], escuros = [];
  for (const [de, ate, lado] of cfg.tecpro || []) for (const s of lado ? [lado] : [-1, 1]) for (let i = Math.floor(de * n); i < Math.floor(ate * n); i += 1) {
    const r = mapa[s][i % n]; if (r < 16) continue;
    const p = pts[i % n], l = s * (W / 2 + r - 3.2), x = p.x + p.nx * l, z = p.y + p.ny * l; if (!livre(tr, x, z, 8)) continue;
    for (let k = 0; k < 2; k++) { (k ? escuros : claros).push({ x, y: p.h + 2.4 + k * 4.4, z, sx: 6.4, sy: 3.9, sz: 3, r: -Math.atan2(p.ty, p.tx) }); stats.tecpro++; }
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  instancias(add, caixa, M(0xe4e9ee, { roughness: 0.55 }), claros, { nome: "baku-tecpro" }); instancias(add, caixa, M(0x2d3a4d, { roughness: 0.6 }), escuros, { nome: "baku-tecpro-faixa" });
}
