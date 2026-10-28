// Bahrein (Bahrain International Circuit, Sakhir): o que só o autódromo tem. O resto (zebras, arquibancadas, painéis, postos, placas,
// passarelas, serra e som) é do kit, na configuração de gps/bahrein.js. As peças exclusivas ficam em kit/bahrein/:
// 1. o prédio dos boxes com a cobertura em velas ao longo dele todo (boxes.js) e a Torre de anéis azuis (torre.js);
// 2. a praça, o paddock com as tendas, os gramados, as tamareiras, o heliporto e os estacionamentos (praca.js);
// 3. as torres de refletores e a luz da noite (luz.js), a mureta branca, o pórtico e a cobertura da arquibancada (reta.js);
// 4. o escape em mosaico azul e o muro de pneus (escape.js), as dunas em degraus (deserto.js) e a refinaria com o flare (aqui).
import * as THREE from "three";
import { livre } from "./kit/comum.js";
import { sorteio, instancias } from "./kit/comum.js";
import { M } from "./cena.js";
import { predioDosBoxes } from "./kit/bahrein/boxes.js";
import { torreSakhir } from "./kit/bahrein/torre.js";
import { praca } from "./kit/bahrein/praca.js";
import { torresDeLuz } from "./kit/bahrein/luz.js";
import { escapeMosaico } from "./kit/bahrein/escape.js";
import { deserto } from "./kit/bahrein/deserto.js";
import { ligarNoite } from "./kit/bahrein/base.js";
import { muretaBranca, porticoBahrein, velasTribuna } from "./kit/bahrein/reta.js";

export const ESCAPE = { largura: 36, mosaico: [[0.093, 0.135, "fora"], [0.243, 0.268, "fora"], [0.378, 0.4, "fora"], [0.462, 0.484, "fora"], [0.72, 0.742, "fora"], [0.872, 0.902, "fora"]],
  pneus: [[0.093, 0.135, "fora"], [0.243, 0.268, "fora"], [0.31, 0.352, "fora"], [0.378, 0.4, "fora"], [0.462, 0.484, "fora"], [0.6, 0.63, "fora"], [0.72, 0.742, "fora"], [0.872, 0.902, "fora"]] };

// a refinaria lá longe, para o lado para onde a reta dos boxes aponta: tanques, torres de destilação e o flare com a chama
function refinaria(tr, { add, hAt }) {
  const r = sorteio(2207), centro = [1200, -520];
  if (!livre(tr, centro[0], centro[1], 500)) return;
  const tanques = [], torres = [];
  for (let k = 0; k < 16; k++) {
    const x = centro[0] + ((k % 4) - 1.5) * 190 + (r() - 0.5) * 30, z = centro[1] + (Math.floor(k / 4) - 1.5) * 170 + (r() - 0.5) * 30, rr = 60 + r() * 25, h = 36 + r() * 24;
    tanques.push({ x, y: hAt(x, z) + h / 2, z, sx: rr, sy: h, sz: rr });
  }
  for (let k = 0; k < 5; k++) { const x = centro[0] + 300 + k * 55, z = centro[1] - 90 + (k % 2) * 60, h = 150 + r() * 90; torres.push({ x, y: hAt(x, z) + h / 2, z, sx: 12 + r() * 6, sy: h, sz: 12 + r() * 6 }); }
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 18), M(0xdad7cc, { roughness: 0.8 }), tanques, { nome: `${tr.id}-refinaria` });
  instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 10), M(0x9ea3a8, { roughness: 0.5, metalness: 0.5 }), torres);
  // o flare: torre fina de treliça e a chama (laranja, acesa)
  const fx = centro[0] - 330, fz = centro[1], fh = hAt(fx, fz);
  const torre = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 6, 380, 6), M(0x8d9298, { metalness: 0.4 })); torre.position.set(fx, fh + 190, fz); add(torre);
  const chama = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 8), new THREE.MeshBasicMaterial({ color: 0xff8a1f, fog: false })); chama.position.set(fx, fh + 410, fz); add(chama);
  const miolo = new THREE.Mesh(new THREE.ConeGeometry(7, 40, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false })); miolo.position.set(fx, fh + 402, fz); add(miolo);
  tr.reservado.push([centro[0], centro[1], 420]);
}

// o antes: o prédio dos boxes, a torre, a praça e o paddock, os refletores, o escape em mosaico, o deserto e a refinaria
export function cenarioBahrein(tr, ctx) {
  const { add, hAt } = ctx;
  tr.reservado ||= [];
  const boxes = predioDosBoxes(tr, add);
  // a torre fica no pé do prédio, do lado de dentro da curva 15, onde a reta começa (como nas fotos)
  let torre = null;
  const p = tr.pts[Math.floor(tr.n * 0.957)];
  for (const d of [250, 290, 340]) { const x = p.x + p.nx * d, z = p.y + p.ny * d; if (livre(tr, x, z, 130)) { torreSakhir(tr, add, { x, z }); torre = tr.torreAlSakhir; break; } }
  praca(tr, add, { torre, boxes });
  torresDeLuz(tr, add);
  escapeMosaico(tr, add, { trechos: ESCAPE.mosaico, pneus: ESCAPE.pneus, largura: ESCAPE.largura });
  deserto(tr, add, ctx);
  refinaria(tr, ctx);
}

// o depois: o pórtico branco, a mureta, a cobertura da arquibancada principal
export function depoisBahrein(tr, { add }) {
  porticoBahrein(tr, add);
  const n = tr.n, corr = window.F1Regras?.corredor?.(tr.t, n, tr.W), a = corr ? corr.i0 - 18 : Math.floor(0.97 * n), b = corr ? (corr.i0 + corr.len + 18) % n : Math.floor(0.02 * n);
  muretaBranca(tr, add, [[0.915, 1.085, -1], [0.915, a / n, 1], [b / n, 0.09, 1]]);
  velasTribuna(tr, add, 0);
  ligarNoite(tr); // por último: depois de vidaGP, que define tr.animarPista
}
