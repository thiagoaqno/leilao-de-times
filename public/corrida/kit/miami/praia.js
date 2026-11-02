// Miami — o Beach Club do paddock: o deque de madeira com a piscina turquesa, as espreguiçadeiras e os guarda-sóis em aqua, rosa e branco
// (InstancedMesh), o pavilhão branco de dois andares com pérgula e o letreiro, o bar de palha, as cabanas listradas e os cordões de lâmpadas.
// Origem no centro; o pavilhão fica no fundo (z negativo) e a piscina na frente.
import * as THREE from "three";
import { M } from "../../cena.js";
import { Montador, solido, tom } from "../montagem.js";
import { marcaTex } from "../marcas.js";
import { instancias, sorteio } from "../comum.js";
import { texAgua, texMadeira } from "./marina.js";

const AQUA = "#0aa3ad", ROSA = "#ff5fa2", BRANCO = "#f7f6f1";

export function beachClub(tr, add, { x, z, rot = 0, a = 130, b = 90, semente = 33, palmas = null }) {
  const rr = sorteio(semente), c = Math.cos(rot), s = Math.sin(rot);
  let hi = -1e9; for (const u of [-a, 0, a]) for (const v of [-b, 0, b]) hi = Math.max(hi, tr.chao(x + c * u - s * v, z + s * u + c * v));
  hi += 0.5;
  const g = new THREE.Group(); g.name = "miami-beach-club"; g.position.set(x, hi, z); g.rotation.y = -rot; add(g);
  const S = solido(), m = new Montador(), mad = new THREE.MeshStandardMaterial({ map: texMadeira(), roughness: 0.85 }), mm = new Montador();
  // o chão: um bloco que desce até o terreno e o deque de madeira por cima
  const base = new THREE.Mesh(new THREE.BoxGeometry(2 * a, 12, 2 * b), M(0xd9c79a, { roughness: 1 })); base.position.y = -6; base.receiveShadow = true; g.add(base);
  mm.caixa(mad, [0, 0.3, 0], [2 * a - 2, 0.7, 2 * b - 2], { cor: "#ffffff", uv: [a / 14, b / 14] });
  // a piscina: borda branca, água turquesa e degraus
  const pa = a * 0.62, pb = b * 0.26, pz = b * 0.12;
  m.caixa(S, [0, 0.9, pz], [2 * pa + 6, 1.2, 2 * pb + 6], { cor: "#f4f1e8" });
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(2 * pa, 2 * pb), new THREE.MeshStandardMaterial({ map: texAgua(), roughness: 0.15, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  agua.material.map.repeat.set(pa / 36, pb / 36); agua.rotation.x = -Math.PI / 2; agua.position.set(0, 1.55, pz); g.add(agua);
  m.caixa(S, [0, 1.7, pz], [3, 0.4, 2 * pb], { cor: "#ffffff" }); // a faixa de raia do meio
  // as espreguiçadeiras (duas fileiras de cada lado da piscina) e os guarda-sóis
  const camas = [], sois = [];
  for (const sz of [-1, 1]) for (let px = -pa + 6; px <= pa - 6; px += 17) {
    const zc = pz + sz * (pb + 14);
    camas.push({ x: px, y: 1.6, z: zc, sx: 1, sy: 1, sz: 1, r: sz > 0 ? 0 : Math.PI, cor: [AQUA, ROSA, BRANCO][Math.floor(rr() * 3)] });
    if (rr() < 0.55) sois.push({ x: px + 6, y: 1, z: zc + sz * 12, cor: [AQUA, ROSA, BRANCO, "#ffd23f"][Math.floor(rr() * 4)] });
  }
  const cama = new THREE.BoxGeometry(5, 1.1, 14), camasM = instancias((o) => { g.add(o); return o; }, cama, new THREE.MeshStandardMaterial({ roughness: 0.7 }), camas, { sombra: false, nome: "miami-camas" });
  const col = new THREE.Color(); camas.forEach((o, k) => camasM.setColorAt(k, col.set(o.cor))); camasM.instanceColor.needsUpdate = true;
  const haste = new THREE.CylinderGeometry(0.45, 0.45, 26, 5); haste.translate(0, 13, 0);
  const copa = new THREE.ConeGeometry(15, 5.5, 12, 1, true); copa.translate(0, 27.5, 0);
  instancias((o) => { g.add(o); return o; }, haste, M(0xe9e6df), sois, { sombra: false, nome: "miami-sois-hastes" });
  const copas = instancias((o) => { g.add(o); return o; }, copa, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), sois, { sombra: true, nome: "miami-sois" });
  if (copas) { sois.forEach((o, k) => copas.setColorAt(k, col.set(o.cor))); copas.instanceColor.needsUpdate = true; }
  // o pavilhão de dois andares no fundo: térreo de vidro, terraço com pérgula de ripas e as cobertas listradas em aqua e rosa
  const pzP = -b + 26, PW = a * 1.5, PD = 36;
  m.caixa(S, [0, 12, pzP], [PW, 24, PD], { cor: BRANCO });
  m.caixa(S, [0, 11, pzP + PD / 2 + 0.2], [PW - 8, 14, 0.8], { cor: "#1c2b36" }); // a vidraça do térreo
  for (let px = -PW / 2 + 6; px <= PW / 2 - 5; px += 11) m.caixa(S, [px, 11, pzP + PD / 2 + 0.6], [0.8, 14, 1], { cor: "#e9e6df" });
  m.caixa(S, [0, 24.6, pzP], [PW + 6, 1.4, PD + 8], { cor: "#ffffff" }); // a laje do terraço
  m.caixa(S, [0, 30, pzP + PD / 2 - 1], [PW - 6, 8, 1], { cor: "#2b3a46" }); // o primeiro andar recuado, de vidro
  for (let px = -PW / 2 + 6; px <= PW / 2 - 5; px += 11) m.caixa(S, [px, 30, pzP + PD / 2], [0.8, 8, 1.2], { cor: "#ffffff" });
  m.caixa(S, [0, 34.5, pzP - 4], [PW - 6, 1.2, PD - 14], { cor: "#ffffff" });
  for (let px = -PW / 2 + 4; px <= PW / 2 - 4; px += 4.4) m.caixa(S, [px, 36.2, pzP + 2], [1.6, 1.2, PD + 4], { cor: "#c6a171" }); // a pérgula
  for (let k = 0; k < 8; k++) { const px = -PW / 2 + 8 + k * ((PW - 16) / 7); m.caixa(S, [px, 19.6, pzP + PD / 2 + 7], [(PW - 16) / 7 - 2, 1, 14], { cor: k % 2 ? ROSA : AQUA, rx: 0.32 }); } // os toldos do térreo
  for (const sx of [-1, 1]) m.caixa(S, [sx * (PW / 2 + 2), 22, pzP + 2], [3, 44, 3], { cor: AQUA });
  // o bar de palha: cabana redonda com a cobertura de palha e o balcão
  for (const sx of [-1, 1]) {
    const bx = sx * a * 0.78, bz = b * 0.1;
    m.cilindro(S, [bx, 5, bz], [11, 10], { cor: "#e9d9ad", seg: 12 });
    m.cilindro(S, [bx, 11, bz], [9, 2], { cor: "#d9c692", seg: 12 });
    for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; m.cilindro(S, [bx + Math.cos(an) * 12, 9, bz + Math.sin(an) * 12], [0.7, 18], { cor: "#7a5a3a", seg: 5 }); }
  }
  const palha = new THREE.ConeGeometry(17, 11, 14); palha.translate(0, 5.5, 0);
  for (const sx of [-1, 1]) { const o = new THREE.Mesh(palha, M(0xc9a658, { roughness: 1 })); o.position.set(sx * a * 0.78, 17, b * 0.1); o.castShadow = true; g.add(o); }
  // as cabanas listradas ao longo da lateral da frente e os cordões de lâmpadas
  for (let k = 0; k < 6; k++) { const px = -a * 0.8 + k * (a * 1.6 / 5), cor = k % 2 ? ROSA : AQUA; m.caixa(S, [px, 6, b - 12], [14, 12, 12], { cor: BRANCO }); m.caixa(S, [px, 13, b - 12], [16, 2, 14], { cor }); m.caixa(S, [px, 6, b - 5.8], [9, 10, 0.5], { cor: tom(cor, 0.5) }); }
  const lampadas = [];
  for (let k = 0; k < 7; k++) { const px = -a * 0.9 + k * (a * 1.8 / 6); m.cilindro(S, [px, 9, b * 0.62], [0.6, 18], { cor: "#454b52", seg: 5 }); for (let t = 1; t < 5; t++) lampadas.push({ x: px + (t / 5) * (a * 1.8 / 6), y: 17 - Math.sin((t / 5) * Math.PI) * 2.2, z: b * 0.62 }); }
  instancias((o) => { g.add(o); return o; }, new THREE.SphereGeometry(1.1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false }), lampadas, { sombra: false, nome: "miami-lampadas" });
  g.add(m.montar("beach-club-pecas")); g.add(mm.montar("beach-club-deque"));
  // o letreiro no alto do pavilhão (nos dois lados da pérgula)
  const letreiro = new THREE.Mesh(new THREE.PlaneGeometry(PW * 0.5, 9), new THREE.MeshBasicMaterial({ map: marcaTex("mibeach", 512, 64), side: THREE.DoubleSide }));
  letreiro.position.set(0, 41, pzP + PD / 2 + 2); g.add(letreiro);
  // as palmeiras do deque
  if (palmas) for (let k = 0; k < 9; k++) { const u = -a + 12 + k * ((2 * a - 24) / 8), v = k % 2 ? b - 6 : -b + 6; palmas.poe(x + c * u - s * v, z + s * u + c * v, hi, 0.8 + rr() * 0.4, rr() * 6); }
  for (let u = -a; u <= a + 1; u += 60) for (let v = -b; v <= b + 1; v += 60) tr.reservado.push([x + c * u - s * v, z + s * u + c * v, 70]);
  tr.beachClubMiami = { x, z, rot, a, b };
  return { hi };
}
