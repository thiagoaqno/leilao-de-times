// Kit de pista — o parque que fecha a pista dos dois lados (Monza, Spa, Suzuka...): um bosque de árvores altas, folhosas
// e algumas coníferas, em fileiras que começam depois da área de escape e vão até `fundo` unidades. Tudo em duas malhas
// instanciadas (copas e troncos), sem sombra própria. Põe as contagens em tr.parqueGP.
//
// cfg (tudo opcional): {
//   de, ate: frações da volta · lados: [-1, 1] · recuo: onde começa, depois da área de escape (24) · fundo: quantas unidades
//   de bosque (190) · alturas: [mínima, máxima] das árvores, em unidades (150 a 260) · densidade: árvores por ponto da
//   pista e por lado (1,3) · folhas: as cores das copas · coniferas: a fração de pinheiros (0,18) · folga: da pista (36) }
import * as THREE from "three";
import { M } from "../cena.js";
import { instancias, livre, ocupado, sorteio } from "./comum.js";

export function parque(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 4711), lados = cfg.lados || [-1, 1];
  const de = Math.floor((cfg.de ?? 0) * n), ate = Math.floor((cfg.ate ?? 1) * n);
  const L = tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 30, d0 = L + (cfg.recuo ?? 24), fundo = cfg.fundo ?? 190, alturas = cfg.alturas || [150, 260];
  const densidade = cfg.densidade ?? 1.3, folhas = cfg.folhas || ["#2e6a30", "#3a7a34", "#4a8a3a", "#2a5a2e", "#5b8f3c", "#3f6f2c"], coniferas = cfg.coniferas ?? 0.18, folga = cfg.folga ?? 36;
  const copas = [], pinheiros = [], troncos = [], troncosPinheiro = [];
  for (let i = de; i < ate; i += 2) {
    const p = pts[((i % n) + n) % n];
    for (const lado of lados) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const d = d0 + r() * fundo, x = p.x + p.nx * lado * d + (r() - 0.5) * 14, z = p.y + p.ny * lado * d + (r() - 0.5) * 14;
      if (!livre(tr, x, z, folga) || ocupado(tr, x, z, i % n)) continue;
      const h = tr.chao(x, z) - 1.5, alt = alturas[0] + r() * (alturas[1] - alturas[0]), cor = folhas[(r() * folhas.length) | 0];
      let larg = alt * (0.36 + r() * 0.12);
      // a copa baixa (menos de 2,4 m acima do asfalto de perto: o morro sobe ao lado da pista) não avança por cima da pista: encolhe até caber
      const dist = tr.distAt(x, z), baixa = h + alt * 0.2 - pts[tr.indiceAt(x, z)].h < 26;
      if (baixa && dist < W / 2 + 10 + larg) { larg = Math.min(larg, dist - W / 2 - 10); if (larg < alt * 0.2) continue; }
      if (r() < coniferas) { pinheiros.push({ x, y: h + alt * 0.6, z, sx: larg * 0.55, sy: alt * 0.8, sz: larg * 0.55, r: r() * 6, c: "#24502b" }); troncosPinheiro.push({ x, y: h + alt * 0.125, z, sx: alt * 0.04, sy: alt * 0.25, sz: alt * 0.04 }); }
      else { copas.push({ x, y: h + alt * 0.58, z, sx: larg, sy: alt * 0.42, sz: larg, r: r() * 6, c: cor }); troncos.push({ x, y: h + alt * 0.225, z, sx: alt * 0.045, sy: alt * 0.45, sz: alt * 0.045 }); }
    }
  }
  const colorir = (m, lista) => { if (m) lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m?.instanceColor) m.instanceColor.needsUpdate = true; return m; };
  const copa = new THREE.IcosahedronGeometry(1, 0), cone = new THREE.ConeGeometry(1, 1, 6), tronco = new THREE.CylinderGeometry(0.7, 1, 1, 5);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  colorir(instancias(add, copa, material, copas, { sombra: false, nome: `${tr.id}-parque-copas` }), copas);
  colorir(instancias(add, cone, material, pinheiros, { sombra: false, nome: `${tr.id}-parque-pinheiros` }), pinheiros);
  const casca = M(0x5b4631, { roughness: 1 });
  instancias(add, tronco, casca, troncos, { sombra: false, nome: `${tr.id}-parque-troncos` });
  instancias(add, tronco, casca, troncosPinheiro, { sombra: false });
  tr.parqueGP = { copas: copas.length, pinheiros: pinheiros.length };
}
