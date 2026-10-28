// Bahrein (Bahrain International Circuit, Sakhir): o que só o autódromo tem. O resto (zebras, escape, arquibancadas, painéis,
// postos, placas, passarelas, serra e som) é do kit, na configuração de gps/bahrein.js. Aqui:
// 1. o prédio dos boxes (kit/boxes.js) e, atrás dele, a Torre Al Sakhir (a torre VIP de oito andares com anéis e a tenda);
// 2. as torres de holofotes da corrida noturna (kit/holofotes.js);
// 3. os jardins de tamareiras do paddock;
// 4. o deserto em volta: dunas baixas e, ao longe, a refinaria com a chama do flare.
// O pórtico da largada é o de pista.js (as cinco luzes), que já atravessa a pista na linha de chegada.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { marcaTex } from "./kit/marcas.js";
import { holofotes } from "./kit/holofotes.js";
import { livre, ocupado, instancias, sorteio } from "./kit/comum.js";

const BOXES = { de: 0.982, ate: 1.055, lado: 1, recuo: 60, fundo: 48, alto: 38 };

// a Torre Al Sakhir, atrás do prédio dos boxes (do lado de trás: o prédio fica entre ela e a pista)
export function torreAlSakhir(tr, { add, hAt }) {
  const { pts, n, W } = tr, p = pts[Math.floor(n * 0.0185)];
  const K = 1.7, base = W / 2 + BOXES.recuo + BOXES.fundo + 38 * K + 26; // a torre é 1,7× o desenho (o pódio tem 65 de raio): ele fica 26 depois do fundo do prédio
  let x, z;
  for (const d of [base, base + 30, base + 70]) {
    x = p.x + p.nx * d; z = p.y + p.ny * d;
    if (livre(tr, x, z, 100) && !ocupado(tr, x, z)) break; x = null;
  }
  if (x == null) return;
  const g = new THREE.Group(); g.position.set(x, hAt(x, z), z); g.scale.setScalar(K); add(g);
  const calcario = M(0xcfc1a5, { roughness: 0.85 }), laje = M(0x2c2e33, { roughness: 0.7 }), grade = M(0x8d9196, { roughness: 0.5, metalness: 0.4 }), aco = M(0x9099a2, { roughness: 0.4, metalness: 0.6 });
  const vela = M(0xe6d3a6, { roughness: 0.6, side: THREE.DoubleSide });
  const janelas = canvasTex(64, 64, (c, w, h, rr) => {
    c.fillStyle = "#14181d"; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 8; k++) { c.fillStyle = rr() < 0.25 ? "#ffd98a" : "#2f4558"; c.fillRect(k * 8 + 1, 8, 6, 46); } // as vidraças, algumas acesas
  });
  janelas.repeat.set(6, 1);
  const vidro = new THREE.MeshStandardMaterial({ map: janelas, roughness: 0.2, metalness: 0.5 });
  const parte = (geo, mat, y, sombra = false) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = sombra; g.add(m); return m; };
  // a base de pedra clara, com o pódio em volta
  parte(new THREE.CylinderGeometry(24, 26, 16, 32), calcario, 8, true);
  parte(new THREE.CylinderGeometry(36, 38, 3, 32), calcario, 1.5, true).receiveShadow = true;
  // os andares empilhados como na torre de verdade: núcleo escuro e uma laje larga com a grade de varanda, cada uma de um tamanho
  const andares = 9, altura = 6.4, h0 = 16, grades = [];
  for (let i = 0; i < andares; i++) {
    const y = h0 + i * altura, rLaje = 28 - Math.abs(i - 3.5) * 0.9;
    parte(new THREE.CylinderGeometry(21, 21, altura - 1.4, 32), vidro, y + (altura - 1.4) / 2, true);
    parte(new THREE.CylinderGeometry(rLaje, rLaje, 1.4, 32), laje, y + altura - 0.7, true);
    parte(new THREE.CylinderGeometry(rLaje - 0.3, rLaje - 0.3, 2.2, 32, 1, true), grade, y + altura + 0.7).material.side = THREE.DoubleSide;
  }
  void grades;
  // a cobertura em velas bege (tendas pontudas em anel, com os mastros) e o mastro com a bandeira do Bahrein
  const yT = h0 + andares * altura + 1.8;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, vela1 = new THREE.Mesh(new THREE.ConeGeometry(8.5, 13, 4), vela); vela1.position.set(Math.cos(a) * 20, yT + 6.5, Math.sin(a) * 20); vela1.rotation.y = a + Math.PI / 4; vela1.castShadow = true; g.add(vela1);
    const mastroV = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 11, 4), aco); mastroV.position.set(Math.cos(a) * 20, yT + 17, Math.sin(a) * 20); g.add(mastroV);
  }
  parte(new THREE.CylinderGeometry(18, 20, 4, 24), vela, yT + 2);
  parte(new THREE.ConeGeometry(14, 18, 8), vela, yT + 12, true);
  parte(new THREE.CylinderGeometry(0.5, 0.7, 40, 6), aco, yT + 37);
  const bandeira = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: canvasTex(70, 40, (c, w, h) => { c.fillStyle = "#ce1126"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.fillRect(0, 0, 14, h); for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(14, k * 8); c.lineTo(24, k * 8 + 4); c.lineTo(14, k * 8 + 8); c.fill(); } }, false), side: THREE.DoubleSide }));
  bandeira.position.set(7.5, yT + 51, 0); g.add(bandeira);
  tr.reservado.push([x, z, 38 * K + 20]); tr.torreAlSakhir = { x, y: z };
}

// tamareiras do paddock: em volta da torre e nas pontas do prédio dos boxes, nunca em cima de um prédio ou da pista
function jardins(tr, { palms, hAt }) {
  const { pts, n, W } = tr, r = sorteio(4417), pontas = [0.972, 1.067].map((f) => pts[Math.floor(f * n) % n]);
  const lugares = [];
  if (tr.torreAlSakhir) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + r() * 0.3, d = 38 * 1.7 + 30 + r() * 30; lugares.push([tr.torreAlSakhir.x + Math.cos(a) * d, tr.torreAlSakhir.y + Math.sin(a) * d]); }
  for (const p of pontas) for (let k = 0; k < 7; k++) { const d = W / 2 + 62 + r() * 90, t = (k - 3) * 11 * (p === pontas[0] ? -1 : 1); lugares.push([p.x + p.nx * d + p.tx * (t + (p === pontas[0] ? -30 : 30)), p.y + p.ny * d + p.ty * (t + (p === pontas[0] ? -30 : 30))]); }
  for (const [x, z] of lugares) if (livre(tr, x, z, 60) && !ocupado(tr, x, z)) palms.push({ x, y: z, h: hAt(x, z), s: 1 + r() * 0.5, r: r() * 6 });
}

// as dunas baixas do deserto: montes de areia achatados, longe da pista, em duas cores de areia
function dunas(tr, { add, hAt }) {
  const r = sorteio(9183), mundo = tr.t.world, claras = [], escuras = [];
  for (let k = 0; k < 700 && claras.length + escuras.length < 150; k++) {
    const x = -1200 + r() * (mundo + 2400), z = -1200 + r() * (mundo + 2400);
    if (!livre(tr, x, z, 230) || ocupado(tr, x, z)) continue;
    const sx = 140 + r() * 260, o = { x, z, y: hAt(x, z) - 4, sx, sy: 14 + r() * 26, sz: sx * (0.45 + r() * 0.4), r: r() * 3 };
    (r() < 0.55 ? claras : escuras).push(o);
  }
  const geo = new THREE.IcosahedronGeometry(1, 1);
  for (const [lista, cor] of [[claras, 0xe3cf9f], [escuras, 0xcdb27e]]) instancias(add, geo, M(cor, { roughness: 1, flatShading: true }), lista, { sombra: false, nome: `${tr.id}-dunas` });
}

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

// o antes: o prédio dos boxes (antes dos enfeites soltos, para as palmeiras e os prédios não nascerem em cima dele), a torre,
// os jardins, os holofotes, as dunas e a refinaria
export function cenarioBahrein(tr, ctx) {
  const { add } = ctx;
  tr.reservado ||= [];
  prediosDosBoxes(tr, add, {
    ...BOXES, torre: true,
    paineis: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "f1"],
    cores: { parede: "#f7f5ef", friso: "#ce1126", teto: 0xd6bf8e },
  });
  torreAlSakhir(tr, ctx);
  jardins(tr, ctx);
  holofotes(tr, add, { passo: 62, recuo: 50, alto: 72 });
  dunas(tr, ctx);
  refinaria(tr, ctx);
}

// o depois: a faixa "Gulf Air" pendurada no pórtico da largada (o de pista.js, que já atravessa a pista na linha de chegada)
export function depoisBahrein(tr, { add }) {
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const faixa = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("gulfair", 1024, 64), side: THREE.FrontSide }));
    faixa.position.set(p.x, p.h + 62, p.y); faixa.rotation.y = rot + (s > 0 ? 0 : Math.PI); faixa.translateZ(s * 1.7); add(faixa);
  }
}
