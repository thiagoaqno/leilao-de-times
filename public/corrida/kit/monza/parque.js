// Monza — o Parco di Monza em volta do autódromo: o que faz a pista parecer Monza. Árvores altas e densas dos dois lados, de copa em dois
// lóbulos (plátanos, carvalhos e tílias com uns poucos pinheiros), as moitas do sub-bosque, as folhas já douradas caídas junto da fileira
// de árvores, o gramado cortado em faixas junto da área de escape e o velho carvalho da Variante Ascari, que a pista contornou.
// Tudo em InstancedMesh (sem sombra própria) e só onde `livre` e `ocupado` deixam: as arquibancadas, os prédios e o paddock ficam limpos.
import * as THREE from "three";
import { M, canvasTex } from "../../cena.js";
import { instancias, livre, ocupado, sorteio, sinalDaCurva } from "../comum.js";
import { Montador, solido } from "../montagem.js";

// as folhas do fim do verão: verdes fundos com um pouco de amarelo e de cobre, de setembro
export const FOLHAS_DE_MONZA = ["#2f6a30", "#3a7a34", "#4a8a3a", "#2a5a2e", "#5b8f3c", "#3f6f2c", "#6a9a3a", "#8a9a35", "#a89a35", "#b07a2c"];

const cor = (c) => new THREE.Color(c);
const colorir = (m, lista) => { if (!m) return null; lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); m.instanceColor.needsUpdate = true; return m; };

/**
 * O bosque: fileiras de árvores altas começando depois da área de escape. Cada árvore tem o tronco e dois lóbulos de copa (um grande e um
 * menor, mais claro, no alto e de lado), e a fileira da frente ganha moitas baixas por baixo. Põe as contagens em tr.bosqueMonza.
 * @param {object} cfg · de, ate: frações da volta · recuo: onde começa (depois do escape, 22) · fundo: quantas unidades de bosque (110) · alturas: [mín, máx]
 * @param {number} cfg.densidade árvores por ponto (de 2 em 2) e por lado · @param {string[]} cfg.folhas · @param {number} cfg.coniferas fração de pinheiros · cfg.semente
 */
export function bosque(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 2025), de = Math.floor((cfg.de ?? 0) * n), ate = Math.floor((cfg.ate ?? 1) * n);
  const L = tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 30, d0 = L + (cfg.recuo ?? 22), fundo = cfg.fundo ?? 110, alturas = cfg.alturas || [170, 300];
  const densidade = cfg.densidade ?? 1.6, folhas = cfg.folhas || FOLHAS_DE_MONZA, coniferas = cfg.coniferas ?? 0.1, folga = cfg.folga ?? 34, passo = cfg.passo ?? 2;
  const lobos = [], pinheiros = [], troncos = []; let moitas = 0;
  for (let i = de; i < ate; i += passo) {
    const p = pts[((i % n) + n) % n];
    for (const lado of [-1, 1]) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const d = d0 + r() * r() * fundo + (k === 0 ? 0 : r() * fundo * 0.4), x = p.x + p.nx * lado * d + (r() - 0.5) * 16, z = p.y + p.ny * lado * d + (r() - 0.5) * 16;
      if (!livre(tr, x, z, folga) || ocupado(tr, x, z, i % n)) continue;
      const h = tr.chao(x, z) - 1.5, alt = alturas[0] + r() * (alturas[1] - alturas[0]), c = folhas[(r() * folhas.length) | 0];
      let larg = alt * (0.34 + r() * 0.12);
      // a copa baixa não avança por cima da pista: encolhe até caber
      const dist = tr.distAt(x, z), baixa = h + alt * 0.2 - pts[tr.indiceAt(x, z)].h < 26;
      if (baixa && dist < W / 2 + 10 + larg) { larg = Math.min(larg, dist - W / 2 - 10); if (larg < alt * 0.2) continue; }
      if (r() < coniferas) {
        pinheiros.push({ x, y: h + alt * 0.58, z, sx: larg * 0.5, sy: alt * 0.84, sz: larg * 0.5, r: r() * 6, c: "#24502b" });
        troncos.push({ x, y: h + alt * 0.12, z, sx: alt * 0.035, sy: alt * 0.24, sz: alt * 0.035 });
      } else {
        lobos.push({ x, y: h + alt * 0.6, z, sx: larg, sy: alt * 0.3, sz: larg, r: r() * 6, c });
        if (r() < 0.6) { // o segundo lóbulo (em seis de cada dez): menor, mais alto e mais claro
          const a = r() * 6.28, dx = Math.cos(a) * larg * 0.35, dz = Math.sin(a) * larg * 0.35;
          lobos.push({ x: x + dx, y: h + alt * 0.8, z: z + dz, sx: larg * 0.66, sy: alt * 0.22, sz: larg * 0.66, r: r() * 6, c: cor(c).offsetHSL(0.01, 0.02, 0.05).getStyle() });
        }
        troncos.push({ x, y: h + alt * 0.3, z, sx: alt * 0.04, sy: alt * 0.6, sz: alt * 0.04 });
      }
      if (d < d0 + fundo * 0.3 && r() < 0.3) { // as moitas do sub-bosque, na fileira da frente
        const mx = x + (r() - 0.5) * 30, mz = z + (r() - 0.5) * 30;
        if (livre(tr, mx, mz, folga - 8) && !ocupado(tr, mx, mz, i % n)) { lobos.push({ x: mx, y: tr.chao(mx, mz) - 1.5 + 5, z: mz, sx: 12 + r() * 16, sy: 9 + r() * 8, sz: 12 + r() * 16, r: r() * 6, c: ["#2f5f2a", "#3c6e30", "#27522a", "#4c7a35"][(r() * 4) | 0] }); moitas++; }
      }
    }
  }
  const material = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  colorir(instancias(add, new THREE.IcosahedronGeometry(1, 0), material, lobos, { sombra: false, nome: `${tr.id}-bosque-copas` }), lobos);
  colorir(instancias(add, new THREE.ConeGeometry(1, 1, 6), material, pinheiros, { sombra: false, nome: `${tr.id}-bosque-pinheiros` }), pinheiros);
  instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 4, 1, true), M(0x5a4a38, { roughness: 1, side: THREE.DoubleSide }), troncos, { sombra: false, nome: `${tr.id}-bosque-troncos` });
  tr.bosqueMonza = { copas: lobos.length, pinheiros: pinheiros.length, troncos: troncos.length };
}

/**
 * As folhas caídas: manchas achatadas douradas, cobre e marrons no chão, junto da fileira das árvores (uma malha instanciada só).
 * @param {object} cfg · lat0, lat1: faixa (a partir da meia largura) onde caem (40 a 150) · quantas: por ponto (0,5) · semente
 */
export function folhasCaidas(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 909), lista = [], cores = ["#c9a227", "#d8a42c", "#b8741f", "#9a5a1c", "#c2862a", "#8b6a2a", "#a9983a"];
  for (let i = 0; i < n; i += 2) {
    const p = pts[i];
    for (const lado of [-1, 1]) for (let k = 0; k < (cfg.quantas ?? 0.5) * 2; k++) {
      if (r() < 0.45) continue;
      const d = W / 2 + (cfg.lat0 ?? 40) + r() * ((cfg.lat1 ?? 150) - (cfg.lat0 ?? 40)), x = p.x + p.nx * lado * d + (r() - 0.5) * 24, z = p.y + p.ny * lado * d + (r() - 0.5) * 24;
      if (!livre(tr, x, z, 36) || ocupado(tr, x, z, i)) continue;
      const s = 6 + r() * 16;
      lista.push({ x, y: tr.chao(x, z) - 1.5 + 0.55, z, sx: s * (1 + r()), sy: 1, sz: s, r: r() * 6, c: cores[(r() * cores.length) | 0] });
    }
  }
  const disco = new THREE.CircleGeometry(1, 7); disco.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  colorir(instancias(add, disco, mat, lista, { sombra: false, nome: `${tr.id}-folhas-caidas` }), lista);
  tr.folhasMonza = lista.length;
}

/**
 * O gramado cortado em faixas junto da pista, dos dois lados (uma fita de cada lado, numa malha só): listras claras e escuras, paralelas à
 * pista, só onde o chão está livre (fora das arquibancadas, do paddock e dos prédios).
 * @param {object} cfg · lat0: onde começa, depois do escape (104) · faixa: largura de cada listra (22) · faixas: quantas (7) · forca: contraste (1,5)
 */
export function gramado(tr, add, cfg = {}) {
  const { pts, n, W } = tr, lat0 = cfg.lat0 ?? 104, faixa = cfg.faixa ?? 22, faixas = cfg.faixas ?? 7, forca = cfg.forca ?? 1.5, PASSO = 3, vs = [], uv = [], idx = [];
  const mat = new THREE.MeshStandardMaterial({
    map: canvasTex(64, 4, (x, w, h) => { x.fillStyle = `rgba(214,240,140,${0.16 * forca})`; x.fillRect(0, 0, w / 2, h); x.fillStyle = `rgba(8,56,14,${0.2 * forca})`; x.fillRect(w / 2, 0, w / 2, h); }),
    transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const col = faixas + 1;
  for (const s of [-1, 1]) {
    const linhas = [];
    for (let i = 0; i <= n; i += PASSO) {
      const p = pts[i % n], l = [];
      for (let b = 0; b < col; b++) {
        const lat = lat0 + b * faixa, x = p.x + p.nx * s * lat, z = p.y + p.ny * s * lat;
        if (tr.distAt(x, z) >= lat - 8 && !ocupado(tr, x, z, i % n) && !tr.noCorredor?.(x, z)) { vs.push(x, tr.chao(x, z) - 1.5 + 0.35, z); uv.push(b * 0.5, 0); l.push(vs.length / 3 - 1); } else l.push(-1);
      }
      linhas.push(l);
    }
    for (let q = 0; q + 1 < linhas.length; q++) for (let b = 0; b + 1 < col; b++) {
      const a = linhas[q][b], c = linhas[q][b + 1], d = linhas[q + 1][b], e = linhas[q + 1][b + 1];
      if (a < 0 || c < 0 || d < 0 || e < 0) continue;
      idx.push(a, d, c, c, d, e);
    }
  }
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.renderOrder = 1; m.name = `${tr.id}-gramado-listrado`;
}

/**
 * O velho carvalho da Variante Ascari (a "Curva del Platano"): uma árvore enorme, de tronco grosso e copa em quatro lóbulos, que ficou na
 * beira de dentro da primeira curva da chicane, com a mureta de pedra em volta. `f` é a fração da volta da curva.
 */
export function carvalhoDoAscari(tr, add, f = 0.646) {
  const { pts, n, W } = tr, i = Math.floor(f * n) % n, p = pts[i], dentro = sinalDaCurva(pts, n, i);
  for (const d of [W / 2 + 66, W / 2 + 90, W / 2 + 120]) {
    const x = p.x + p.nx * dentro * d, z = p.y + p.ny * dentro * d;
    if (!livre(tr, x, z, 56) || ocupado(tr, x, z)) continue;
    const m = new Montador(), S = solido(), r = sorteio(33), copa = new THREE.IcosahedronGeometry(1, 1), verde = M(0xffffff, { roughness: 0.95, flatShading: true, vertexColors: true });
    m.cilindro(S, [0, 70, 0], [10, 140], { cor: "#5a4632", seg: 8 });
    for (const a of [0.5, 2.2, 4.0]) m.caixa(S, [Math.cos(a) * 18, 140, Math.sin(a) * 18], [5, 56, 5], { cor: "#5a4632", rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r(), q = k === 0 ? 0 : 52; m.geo(verde, copa, { x: Math.cos(a) * q, y: 190 + r() * 26 + (k === 0 ? 24 : 0), z: Math.sin(a) * q, sx: 78 - k * 3, sy: 56, sz: 78 - k * 3, cor: ["#3a7a34", "#4a8a3a", "#2f6a30", "#5b8f3c", "#3f6f2c", "#6a9a3a"][k] }); }
    const murete = new THREE.Mesh(new THREE.TorusGeometry(24, 2.4, 5, 16), M(0x9b9890, { roughness: 1 })); murete.rotation.x = Math.PI / 2; murete.position.y = 2.4; // a mureta de pedra em volta do tronco
    const g = m.montar("monza-carvalho-ascari"); g.add(murete);
    g.position.set(x, tr.chao(x, z) - 1.5, z); add(g);
    tr.reservado.push([x, z, 80]); tr.carvalhoAscari = { x, z, d };
    return g;
  }
  return null;
}
