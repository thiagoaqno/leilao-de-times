// Cidade do México — o horizonte: a cidade (a mancha baixa de casas de cores quentes, com as torres do centro) e, a sudeste, os vulcões Popocatépetl
// (o cone perfeito, com a fumaça) e Iztaccíhuatl (a "mulher adormecida", de cume nevado em quatro saliências), na névoa da altitude. Só código.
// A cidade é um InstancedMesh de caixas dentro da neblina do jogo; os vulcões são malhas de relevo com cor por vértice, `fog: false`, e a bruma é
// pintada nos vértices (mais forte embaixo), como numa foto do horizonte com poluição. Ficam bem além do terreno.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { instancias, sorteio } from "../comum.js";
import { ruido } from "./lugar.js";

const HAZE = new THREE.Color("#a9b3c0");

// uma montanha de revolução com o perfil `perfil(raio01)` (altura) e um ruído de crista; cor por vértice: rocha escura embaixo, neve em cima,
// luz de um lado só e a bruma por cima de tudo
function montanha({ x, z, raio, alto, perfil, semente, neveAcima, rocha, neve, achata = 1, rot = 0, bruma = 0.08 }) {
  const NR = 12, NA = 40, pos = [], col = [], idx = [], c = new THREE.Color(), sol = new THREE.Vector3(-0.5, 0.7, -0.5).normalize();
  const altura = (rr, a) => alto * perfil(rr) * (1 + 0.1 * (ruido(Math.cos(a) * 3 + semente, Math.sin(a) * 3, semente) - 0.5) * (1 - rr));
  for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
    const rr = i / NR, a = (j / NA) * Math.PI * 2, h = altura(rr, a);
    const lx = Math.cos(a) * raio * rr * achata, lz = Math.sin(a) * raio * rr, cs = Math.cos(rot), sn = Math.sin(rot);
    pos.push(x + lx * cs - lz * sn, h - 40, z + lx * sn + lz * cs);
    // inclinação para a luz: compara com o vizinho de dentro e o do lado
    const h2 = altura(Math.min(1, rr + 0.05), a), dh = (h2 - h) / (raio * 0.05), luz = THREE.MathUtils.clamp(0.8 + dh * -0.6 * (Math.cos(a - 2.3)), 0.55, 1.15);
    const neva = THREE.MathUtils.smoothstep(h / alto, neveAcima, neveAcima + 0.08 + 0.05 * ruido(a * 4, rr * 8, semente + 3));
    c.set(rocha).lerp(c.set(neve), neva); c.set(rocha).lerp(new THREE.Color(neve), neva).multiplyScalar(luz);
    const nevoa = THREE.MathUtils.clamp(bruma + (1 - h / alto) * 0.5, 0, 0.9); c.lerp(HAZE, nevoa);
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })); m.frustumCulled = false; return m;
}

export function vulcoes(tr, add) {
  const C = tr.t.world / 2, ang = Math.PI / 4;
  // Popocatépetl: o cone alto com a cratera e o penacho de fumaça; Iztaccíhuatl: a crista comprida de quatro saliências (cabeça, peito, joelhos e pés)
  const popo = montanha({ x: C + Math.cos(ang) * 10200, z: C + Math.sin(ang) * 10200, raio: 3000, alto: 1850, semente: 3, neveAcima: 0.55, rocha: "#4e463e", neve: "#f2f5f8",
    perfil: (r) => (r > 0.995 ? 0 : Math.pow(1 - r, 1.15) * (r < 0.06 ? 0.93 + r : 1)) });
  popo.name = "popocatepetl"; add(popo);
  const penacho = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xdcd6d0, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
  penacho.position.set(popo.geometry.attributes.position.array[0], 1850, popo.geometry.attributes.position.array[2]); penacho.scale.set(420, 900, 420); penacho.position.y = 1850 + 380; penacho.name = "popo-fumaca"; penacho.frustumCulled = false; add(penacho);
  const a2 = ang - 0.3, rot = a2 + Math.PI / 2;
  const izta = montanha({ x: C + Math.cos(a2) * 9300, z: C + Math.sin(a2) * 9300, raio: 2800, alto: 1500, semente: 7, neveAcima: 0.52, rocha: "#554c43", neve: "#eef2f6", achata: 2.1, rot,
    perfil: (r) => Math.pow(1 - r, 1.2) * (0.88 + 0.12 * Math.cos(r * 13)) });
  izta.name = "iztaccihuatl"; add(izta);
  tr.vulcoesMexico = { popo: popo.name, izta: izta.name };
}

// ---------------------------------------------------------------------------------------------------------------------
// A cidade: casas baixas de cores quentes até onde a vista alcança e as torres do centro
// ---------------------------------------------------------------------------------------------------------------------
export function cidade(tr, add) {
  const r = sorteio(909), C = tr.t.world / 2, lista = [], altas = [];
  const tex = canvasTex(64, 128, (x, w, h, q) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 6; i++) { x.fillStyle = q() < 0.18 ? "#f4e2a8" : "#6f7d8c"; x.fillRect(4 + i * 10, 5 + j * 9, 6, 5); }
  });
  const quentes = ["#e8c9a0", "#d9a37a", "#e7d4b0", "#c97b5a", "#f1e6d0", "#b98a6a", "#d4a5a0", "#a9b8c4", "#e0b24f", "#8fa5b8"];
  for (let k = 0; k < 520; k++) {
    const a = r() * Math.PI * 2, d = 3400 + r() * 2600, x = C + Math.cos(a) * d * 1.04, z = C + Math.sin(a) * d * 1.04;
    if (tr.distAprox(x, z) < 700) continue;
    const alta = r() < 0.05, h = alta ? 160 + r() * 260 : 36 + r() * r() * 110, w = alta ? 70 + r() * 60 : 50 + r() * 90;
    const o = { x, y: h / 2 - 2, z, sx: w, sy: h, sz: w * (0.7 + r() * 0.6), r: r() * 3, cor: quentes[(r() * quentes.length) | 0] };
    (alta ? altas : lista).push(o);
  }
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), geo = new THREE.BoxGeometry(1, 1, 1);
  for (const [l, nome] of [[lista, "mexico-cidade-baixa"], [altas, "mexico-cidade-torres"]]) {
    const m = instancias(add, geo, mat, l, { sombra: false, nome });
    if (m) { const c = new THREE.Color(); l.forEach((o, k) => m.setColorAt(k, c.set(o.cor))); m.instanceColor.needsUpdate = true; }
  }
  // a Torre Latinoamericana, de cima do centro: os degraus e a antena, ao sul-sudoeste do autódromo, na névoa
  const tx = C - 1500, tz = C + 4200;
  const torre = new THREE.Group(); torre.name = "torre-latino";
  const concreto = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.6, map: tex });
  for (const [w, h, y] of [[90, 260, 0], [64, 150, 260], [40, 90, 410]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), concreto); b.position.y = y + h / 2; torre.add(b); }
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 160, 5), new THREE.MeshStandardMaterial({ color: 0xe03b2a })); antena.position.y = 580; torre.add(antena);
  torre.position.set(tx, 0, tz); add(torre);
  tr.cidadeMexico = { casas: lista.length, torres: altas.length + 1 };
}
