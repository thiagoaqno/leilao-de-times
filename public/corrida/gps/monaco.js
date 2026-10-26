// Mônaco: o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem. O porto, a piscina, as
// arquibancadas, o túnel, a Place du Casino e o Rochedo ficam em ../monaco.js (cenario); a capela de Sainte Dévote, aqui.
// As frações (0 a 1) são da volta, a partir da linha de chegada.
import * as THREE from "three";
import { M } from "../cena.js";
import { cenarioMonaco, fundoMonaco } from "../monaco.js";
import { livre, ocupado, sinalDaCurva } from "../kit/comum.js";
import { pertoDe } from "../kit/som.js";
import { FACHADAS_MEDITERRANEO } from "../kit/beira.js";

// a capela de Sainte Dévote, do lado de fora da primeira curva (creme, telhado de telha e a torrinha do sino)
function capela(tr, { add, hAt }) {
  const { pts, n } = tr, L = tr.wallLat, perto = (f) => Math.floor(f * n);
  let a = perto(0.063); for (let k = perto(0.04); k <= perto(0.09); k++) if ((pts[k].k || 0) > (pts[a].k || 0)) a = k;
  const p = pts[a], fora = -sinalDaCurva(pts, n, a);
  for (const d of [L + 60, L + 90, L + 130]) {
    const x = p.x + p.nx * fora * d, z = p.y + p.ny * fora * d;
    if (!livre(tr, x, z, 50) || ocupado(tr, x, z)) continue;
    const g = new THREE.Group(), h = hAt(x, z); g.position.set(x, h, z); g.rotation.y = Math.atan2(p.tx, p.ty); add(g);
    const creme = M(0xefe3c8, { roughness: 0.85 }), telha = M(0xb5583c, { roughness: 0.85, flatShading: true });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(28, 26, 46), creme); nave.position.y = 13; nave.castShadow = nave.receiveShadow = true; g.add(nave);
    const empena = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 48, 3), telha); empena.rotation.set(Math.PI / 2, 0, Math.PI / 2); empena.scale.set(1, 1, 0.55); empena.position.y = 30; empena.castShadow = true; g.add(empena);
    const torre = new THREE.Mesh(new THREE.BoxGeometry(10, 48, 10), creme); torre.position.set(0, 24, -26); torre.castShadow = true; g.add(torre);
    const sino = new THREE.Mesh(new THREE.BoxGeometry(10.4, 7, 10.4), M(0x3a3026)); sino.position.set(0, 42, -26); g.add(sino);
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(7.6, 12, 4), telha); ponta.rotation.y = Math.PI / 4; ponta.position.set(0, 54, -26); g.add(ponta);
    const porta = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.6), M(0x5b3a24)); porta.position.set(0, 6, 23.3); g.add(porta);
    tr.reservado.push([x, z, 50]); tr.capelaMonaco = { x, y: z }; return; // os sinos (o som)
  }
}

const BOXES = window.Pistas.PISTAS.monaco.boxes; // o corredor dos boxes (pistas.js): as linhas SC 1 e SC 2 são a entrada e a saída dele

export const GP_MONACO = {
  asfalto: true, // o asfalto de GP de asfalto-gp.js, com as linhas de borda e a borracha
  chao: {
    margem: "sarjeta",
    amarelas: [[0.608, 0.645], [0.735, 0.805]], // Nouvelle Chicane e Piscine
    faixasPedestre: [0.12, 0.24, 0.31, 0.36, 0.402, 0.445, 0.69, 0.865],
    tracejado: [[0.09, 0.24], [0.33, 0.37], [0.44, 0.61], [0.655, 0.7]], // Beau Rivage, Portier, túnel e cais
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 46, bueiros: 40,
  },
  guardrail: { paineis: ["rolex", "pirelli", null, "aramco", "heineken", null, "dhl", "lenovo"] },
  cenario: (tr, ctx) => cenarioMonaco(tr, ctx), // o porto, a piscina, as arquibancadas, o túnel, o Cassino e o Rochedo
  boxes: { garagens: false }, // o corredor dos boxes sem as garagens: a rua é estreita demais para elas
  ambiente: {}, // cerca, painéis, bandeiras vermelhas e brancas, postos e placas (os padrões do kit)
  passarelas: { candidatos: [0.02, 0.165, 0.855, 0.31, 0.93], marcas: ["rolex", "heineken", "tag"] }, // a da Rolex na reta dos boxes
  marcos: capela,
  postes: { passo: 34 },
  montanha: { angulo: -Math.PI / 2, altura: 860 }, // a Tête de Chien, ao norte
  fachadas: FACHADAS_MEDITERRANEO,
  vida: {
    gaivotas: (tr) => Array.from({ length: 14 }, (_, k) => ({ x: (480 + (k % 5) * 110) * tr.t.scale, z: (930 + (k % 3) * 70) * tr.t.scale })), // sobre o porto
    som: {
      porto: (tr, x, y) => Math.max(0, Math.min(1, 1 - Math.max(0, -fundoMonaco(tr, x, y)) / 450)),
      fonte: pertoDe((tr) => tr.pracaCassino, 420),
      sinos: pertoDe((tr) => tr.capelaMonaco, 900),
    },
  },
};
