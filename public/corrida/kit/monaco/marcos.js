// Mônaco — os marcos de verdade, modelados em código por cima das plantas reais (kit/monaco/dados.js): o Casino de Monte-Carlo com as
// duas torres e as cúpulas de cobre, o Hôtel de Paris com o telhado mansarda de ardósia e a cúpula, o Café de Paris com os toldos
// vermelhos, o Hermitage com a cúpula de vidro, a capela de Sainte Dévote, o Palácio do Príncipe e a catedral no Rochedo, o Museu
// Oceanográfico na falésia, o Fairmont e a Place du Casino. Cada peça nasce na planta do prédio que o OpenStreetMap desenha naquele
// ponto (o tamanho, a direção e a frente voltada para a praça), então fica onde está na cidade. Materiais compartilhados: o fundir.js
// junta tudo numa malha por material.
import * as THREE from "three";
import { M } from "../../cena.js";
import { D } from "./mundo.js";

const COBRE = M(0x5d9d88, { roughness: 0.55, metalness: 0.25 }), ARDOSIA = M(0x4b5563, { roughness: 0.7 }), PEDRA = M(0xeadfc6, { roughness: 0.85 }), CREME = M(0xf0e4c8, { roughness: 0.85 });
const VERMELHO = M(0xb3262f, { roughness: 0.8, side: THREE.DoubleSide }), BRANCO = M(0xf6f1e4, { roughness: 0.8 }), FERRO = M(0x2c3036, { roughness: 0.6, metalness: 0.3 }), TELHA = M(0xb5583c, { roughness: 0.85, flatShading: true });
const OURO = M(0xd9b24a, { roughness: 0.4, metalness: 0.5 }), VIDRO = new THREE.MeshStandardMaterial({ color: 0x9fc4d4, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 }), PEDRA_CLARA = M(0xdcd2bb, { roughness: 0.9 });

// o retângulo orientado de um prédio (da planta): o centro, a direção do lado maior e as medidas; `alvo` (x, z) diz para onde fica a frente
function quadro(b, alvo) {
  let melhor = 0, ux = 1, uz = 0;
  for (let i = 0; i < b.P.length; i++) { const a = b.P[i], c = b.P[(i + 1) % b.P.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > melhor) { melhor = l; ux = (c[0] - a[0]) / l; uz = (c[1] - a[1]) / l; } }
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, z] of b.P) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, cx = cu * ux - cv * uz, cz = cu * uz + cv * ux;
  let phi = Math.atan2(-uz, ux), w = u1 - u0, d = v1 - v0;
  // a frente (+z local) é o lado que olha para o alvo
  const vx = -uz, vz = ux; if (alvo && (alvo[0] - cx) * vx + (alvo[1] - cz) * vz < 0) phi += Math.PI;
  return { cx, cz, phi, w, d };
}
const caixa = (g, mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.name = "monaco-marco"; g.add(m); return m; };
const cilindro = (g, mat, r, h, x, y, z, seg = 14, r2 = r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.name = "monaco-marco"; g.add(m); return m; };
const cone = (g, mat, r, h, x, y, z, seg = 4, giro = Math.PI / 4) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.rotation.y = giro; m.position.set(x, y, z); m.castShadow = true; m.name = "monaco-marco"; g.add(m); return m; };
const cupula = (g, mat, r, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat); m.position.set(x, y, z); m.castShadow = true; m.name = "monaco-marco"; g.add(m); return m; };

function noPredio(tr, add, b, alvo) {
  const q = quadro(b, alvo), g = new THREE.Group(); g.position.set(q.cx, b.topo, q.cz); g.rotation.y = q.phi; add(g);
  return { g, w: q.w, d: q.d, solo: b.baixo - b.topo, ...q };
}

// ---- o Casino de Monte-Carlo (Charles Garnier, 1863): fachada creme, duas torres com cúpulas de cobre, a escada e o toldo de ferro e vidro
function casino(tr, add, b, praca, ponto) {
  // a planta do OpenStreetMap junta o Casino, o átrio e o teatro numa peça só (150 m): a fachada de 72 m vai no ponto do marco, virada para a praça
  const g = new THREE.Group(), dx = praca[0] - ponto[0], dz = praca[1] - ponto[1]; g.position.set(ponto[0], b.topo, ponto[1]); g.rotation.y = Math.atan2(dx, dz); add(g);
  const w = 300, d = 150, solo = b.baixo - b.topo;
  caixa(g, COBRE, w * 0.9, 14, d * 0.86, 0, 7, 0); // a mansarda de cobre
  caixa(g, PEDRA, w * 0.94, 3, d * 0.92, 0, 1.5, 0); // a cornija
  for (const s of [-1, 1]) {
    caixa(g, CREME, 32, 54, 32, s * (w / 2 - 20), 27, d / 2 - 20); // as torres da fachada
    caixa(g, PEDRA, 36, 4, 36, s * (w / 2 - 20), 54, d / 2 - 20);
    cone(g, COBRE, 26, 40, s * (w / 2 - 20), 76, d / 2 - 20, 4); cilindro(g, OURO, 1.2, 14, s * (w / 2 - 20), 100, d / 2 - 20, 6); // a cúpula pontuda de cobre com o fecho dourado
  }
  cilindro(g, CREME, 20, 18, 0, 22, 0, 18); cupula(g, COBRE, 21, 0, 31, 0); // a cúpula do átrio, atrás
  caixa(g, VIDRO, w * 0.3, 2, 34, 0, solo + 21, d / 2 + 16); for (const s of [-1, 1]) cilindro(g, FERRO, 1.1, 21, s * w * 0.15, solo + 10, d / 2 + 30, 6); // o toldo de ferro e vidro
  caixa(g, PEDRA_CLARA, w * 0.38, 4, 40, 0, solo + 2, d / 2 + 20); // a escada da entrada
  caixa(g, PEDRA_CLARA, w * 0.9, 5, 3, 0, solo + 14, -d / 2 - 2); // a balaustrada do terraço do mar
  tr.reservado.push([ponto[0], ponto[1], 150]);
}
// ---- o Hôtel de Paris (1864): mansarda de ardósia, cúpula de canto, o toldo vermelho e as bandeiras
function hotelDeParis(tr, add, b, praca) {
  const { g, w, d, solo } = noPredio(tr, add, b, praca);
  caixa(g, ARDOSIA, w * 0.94, 16, d * 0.9, 0, 8, 0); caixa(g, PEDRA, w * 0.98, 3, d * 0.94, 0, 1.5, 0);
  cilindro(g, CREME, 14, 18, w / 2 - 20, 25, d / 2 - 20, 12); cupula(g, COBRE, 15, w / 2 - 20, 34, d / 2 - 20); cilindro(g, OURO, 1, 12, w / 2 - 20, 54, d / 2 - 20, 6);
  caixa(g, VERMELHO, w * 0.34, 1.6, 22, 0, solo + 16, d / 2 + 11); for (const s of [-1, 1]) cilindro(g, FERRO, 0.9, 16, s * w * 0.16, solo + 8, d / 2 + 21, 6);
  for (const s of [-1, 1]) { cilindro(g, FERRO, 0.6, 34, s * w * 0.3, 17, d / 2, 6); caixa(g, VERMELHO, 12, 4, 0.5, s * w * 0.3 + 6, 31, d / 2); caixa(g, BRANCO, 12, 4, 0.5, s * w * 0.3 + 6, 27, d / 2); } // as bandeiras de Mônaco, vermelho e branco
  tr.reservado.push([b.cx, b.cz, Math.max(w, d) * 0.7 + 20]);
}
// ---- o Café de Paris: o terraço coberto de toldos vermelhos e brancos virado para a praça
function cafeDeParis(tr, add, ponto, praca, hAt) {
  // o terraço do Café de Paris, na esquina da praça: toldos vermelhos e brancos sobre as mesas
  const g = new THREE.Group(), y = hAt(ponto[0], ponto[1]); g.position.set(ponto[0], y, ponto[1]); g.rotation.y = Math.atan2(praca[0] - ponto[0], praca[1] - ponto[1]); add(g);
  for (let k = 0; k < 5; k++) caixa(g, k % 2 ? BRANCO : VERMELHO, 22, 1.4, 26, -50 + k * 25, 16, 20);
  for (const s of [-62, 62]) cilindro(g, FERRO, 0.8, 16, s, 8, 32, 6);
  for (let k = 0; k < 8; k++) { cilindro(g, FERRO, 4, 1, -48 + k * 14, 7, 22, 8); cilindro(g, FERRO, 0.5, 7, -48 + k * 14, 3.5, 22, 4); }
}
// ---- o Hermitage (1900): a cúpula de vidro e ferro e o telhado de ardósia
function hermitage(tr, add, b, praca) {
  const { g, w, d } = noPredio(tr, add, b, praca);
  caixa(g, ARDOSIA, w * 0.92, 14, d * 0.88, 0, 7, 0); cilindro(g, FERRO, 22, 10, 0, 16, 0, 20); cupula(g, VIDRO, 22, 0, 20, 0); cilindro(g, OURO, 1.2, 14, 0, 50, 0, 6);
}
// ---- o Fairmont (o antigo Loews): o hotel de terraços em degraus sobre o túnel, com o toldo da entrada
function fairmont(tr, add, b, alvo) {
  const { g, w, d, solo } = noPredio(tr, add, b, alvo);
  for (let k = 0; k < 3; k++) { caixa(g, BRANCO, w * (0.96 - k * 0.07), 6, d * (0.94 - k * 0.08), 0, 3 + k * 6, 0); caixa(g, FERRO, w * (0.96 - k * 0.07) + 1, 1.4, d * (0.94 - k * 0.08) + 1, 0, 6 + k * 6, 0); } // os recuos do topo
  caixa(g, M(0x9bc4d4, { roughness: 0.2, metalness: 0.3 }), w * 0.5, 2, 26, 0, solo + 14, d / 2 + 13); // a marquise da entrada
  tr.reservado.push([b.cx, b.cz, Math.max(w, d) * 0.6 + 20]);
}
// ---- a capela de Sainte Dévote (a padroeira, na planta de OSM): telhado de duas águas de telha, o campanário e a cruz
function capela(tr, add, b, alvo) {
  const { g, w, d, solo } = noPredio(tr, add, b, alvo);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.62, w * 0.62, d * 1.02, 3), TELHA); m.rotation.set(Math.PI / 2, 0, Math.PI / 2); m.scale.set(1, 1, 0.5); m.position.set(0, w * 0.22, 0); m.castShadow = true; m.name = "monaco-marco"; g.add(m);
  caixa(g, CREME, 11, 38, 11, 0, 19, -d / 2 + 6); caixa(g, FERRO, 11.6, 7, 11.6, 0, 40, -d / 2 + 6); cone(g, TELHA, 8.4, 14, 0, 51, -d / 2 + 6, 4);
  caixa(g, FERRO, 0.8, 7, 0.8, 0, 62, -d / 2 + 6); caixa(g, FERRO, 4, 0.8, 0.8, 0, 63, -d / 2 + 6);
  tr.capelaMonaco = { x: b.cx, y: b.cz }; // o som dos sinos
  tr.reservado.push([b.cx, b.cz, Math.max(w, d) * 0.8 + 30]);
}
// ---- o Museu Oceanográfico (1910), no paredão do Rochedo: pedra branca, a fachada com o frontão e a cúpula pequena
function oceanografico(tr, add, b, alvo) {
  const { g, w, d } = noPredio(tr, add, b, alvo);
  caixa(g, PEDRA_CLARA, w * 0.96, 8, d * 0.92, 0, 4, 0); cupula(g, PEDRA, 14, 0, 8, 0);
  for (const s of [-1, 1]) { caixa(g, PEDRA_CLARA, 14, 30, 14, s * (w / 2 - 10), 15, d / 2 - 10); cupula(g, PEDRA, 9, s * (w / 2 - 10), 30, d / 2 - 10); }
  caixa(g, PEDRA, w * 0.5, 14, 4, 0, 7, d / 2 + 1);
}

// ---- o Rochedo de Mônaco-Ville: o Palácio do Príncipe (torres redondas com ameias, o pátio e o estandarte) e a catedral de pedra
function palacio(tr, add, [px, pz], chao) {
  const h = chao(px, pz) - 1.5, g = new THREE.Group(); g.position.set(px, h, pz); add(g);
  const torre = (x, z, r, alt) => { cilindro(g, PEDRA, r, alt, x, alt / 2, z, 14); cilindro(g, CREME, r + 2.2, 4, x, alt + 2, z, 14); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; caixa(g, PEDRA, 3.4, 6, 3.4, x + Math.cos(a) * (r + 1.6), alt + 7, z + Math.sin(a) * (r + 1.6)); } cone(g, TELHA, r + 1, 12, x, alt + 16, z, 12, 0); };
  torre(-46, -42, 12, 56); torre(48, -40, 11, 50); torre(-40, 50, 10, 44); torre(52, 46, 10, 40);
  caixa(g, CREME, 90, 30, 14, 0, 15, -44); caixa(g, CREME, 14, 30, 90, 50, 15, 4); caixa(g, CREME, 14, 30, 90, -46, 15, 4); caixa(g, PEDRA_CLARA, 100, 1, 100, 0, 0.6, 0); // as alas em volta do pátio
  cilindro(g, FERRO, 0.7, 36, 0, 24, -44, 6); caixa(g, VERMELHO, 14, 5, 0.5, 8, 38, -44); caixa(g, BRANCO, 14, 5, 0.5, 8, 33, -44); // o estandarte dos Grimaldi, vermelho e branco
  tr.reservado.push([px, pz, 150]);
}
function catedral(tr, add, [px, pz], chao, alvo) {
  const h = chao(px, pz) - 1.5, g = new THREE.Group(); g.position.set(px, h, pz); g.rotation.y = Math.atan2(alvo[0] - px, alvo[1] - pz); add(g);
  caixa(g, PEDRA, 40, 30, 78, 0, 15, 0); caixa(g, PEDRA_CLARA, 30, 10, 70, 0, 33, 0); // a nave
  for (const s of [-1, 1]) { caixa(g, PEDRA, 12, 54, 12, s * 15, 27, 36); cone(g, PEDRA, 11, 18, s * 15, 63, 36, 4); }
  cupula(g, CREME, 16, 0, 38, -8); tr.reservado.push([px, pz, 90]);
}


const ESP = { casino: 1, hotelDeParis: 2, cafeDeParis: 3, opera: 4, fairmont: 5, metropole: 6, hermitage: 7, sainteDevote: 8, catedral: 9, palacio: 10, oceanografico: 11 };
export function marcosMonaco(tr, add, lista, hAt) {
  const m = D.marcos, praca = m.praca || m.casino, feitos = [], { pts, n } = tr, noTraco = (f) => { const p = pts[Math.floor(f * n) % n]; return [p.x, p.y]; };
  const dono = (nome) => lista.find((q) => q.esp === ESP[nome]);
  let b;
  if ((b = dono("casino")) && m.casino) { casino(tr, add, b, praca, m.casino, hAt); feitos.push("casino"); }
  // o bloco do Café de Paris na planta é o do Hôtel de Paris (os dois dividem a esquina da praça): a mansarda de ardósia e a cúpula vão nele
  if ((b = dono("cafeDeParis") || dono("hotelDeParis"))) { hotelDeParis(tr, add, b, praca); feitos.push("hotelDeParis"); }
  if (m.cafeDeParis) { cafeDeParis(tr, add, m.cafeDeParis, praca, hAt); feitos.push("cafeDeParis"); }
  if ((b = dono("hermitage"))) { hermitage(tr, add, b, m.casino); feitos.push("hermitage"); }
  if ((b = dono("fairmont"))) { fairmont(tr, add, b, noTraco(D.frac.curvas.hairpin)); feitos.push("fairmont"); }
  if ((b = dono("sainteDevote"))) { capela(tr, add, b, noTraco(D.frac.curvas.sainteDevote)); feitos.push("sainteDevote"); }
  if ((b = dono("oceanografico"))) { oceanografico(tr, add, b, m.palacio || noTraco(0.5)); feitos.push("oceanografico"); }
  if (m.palacio) { palacio(tr, add, m.palacio, hAt); feitos.push("palacio"); }
  if (m.catedral) { catedral(tr, add, m.catedral, hAt, m.palacio || m.catedral); feitos.push("catedral"); }
  tr.marcosMonaco = feitos;
}
