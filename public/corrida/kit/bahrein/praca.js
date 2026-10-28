// Bahrein — o paddock e a praça de Sakhir: o piso de pedra clara em volta da torre, os gramados com as tamareiras, as tendas
// brancas do paddock com as mesas vermelhas, o heliporto, os estacionamentos com os carros e as fileiras de tamareiras ao
// longo da reta. Tudo atrás do prédio dos boxes e do muro: nada entra na pista (livre/ocupado) nem no corredor dos boxes.
import * as THREE from "three";
import { M, canvasTex } from "../../cena.js";
import { tendaPaddock } from "../coberturas.js";
import { livre, ocupado, sorteio } from "../comum.js";
import { moldura, piso, disco, pisoMat } from "./base.js";

// ---- a tamareira: tronco fino e cônico, e uma copa de 9 folhas arqueadas (4 segmentos cada), em 2 InstancedMesh ----
function geoCopa() {
  const pos = [], cor = [], idx = [], folhas = 9, segs = 4, verde = new THREE.Color("#ffffff"), ponta = new THREE.Color("#b9d6a0");
  for (let f = 0; f < folhas; f++) {
    const a = (f / folhas) * Math.PI * 2 + (f % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a), comp = f % 2 ? 28 : 24, k0 = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, r = t * comp, y = 4 * Math.sin(t * 1.5) - 13 * t * t * (f % 2 ? 1 : 0.8) + 2, w = 4.2 * (1 - t * 0.85) * Math.sin(Math.PI * Math.min(1, t * 2.2 + 0.25)) + 0.3;
      const px = ca * r, pz = sa * r, ox = -sa * w, oz = ca * w, c = verde.clone().lerp(ponta, t * 0.6);
      pos.push(px - ox, y, pz - oz, px + ox, y, pz + oz); cor.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (s < segs) { const k = k0 + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function tamareiras(tr, add, lista) {
  if (!lista.length) return 0;
  const tronco = new THREE.CylinderGeometry(1.1, 2.3, 1, 6); tronco.translate(0, 0.5, 0);
  const copa = geoCopa(), d = new THREE.Object3D(), verdes = ["#4f9d45", "#5cab4c", "#43903c", "#68b556"], cor = new THREE.Color();
  const mt = new THREE.InstancedMesh(tronco, M(0x8a6a48, { roughness: 1 }), lista.length);
  const mc = new THREE.InstancedMesh(copa, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), lista.length);
  lista.forEach((o, k) => {
    const alt = o.alt ?? 34 + (o.s ?? 1) * 14;
    d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(1, alt, 1); d.updateMatrix(); mt.setMatrixAt(k, d.matrix);
    d.position.set(o.x, o.y + alt, o.z); d.scale.setScalar(0.9 + (o.s ?? 1) * 0.25); d.updateMatrix(); mc.setMatrixAt(k, d.matrix); mc.setColorAt(k, cor.set(verdes[k % verdes.length]));
  });
  mt.castShadow = mc.castShadow = true; mt.name = mc.name = `${tr.id}-tamareiras`; add(mt); add(mc);
  return lista.length;
}

// ---- o heliporto: o círculo branco com o anel vermelho e o H ----
const matHeli = () => new THREE.MeshStandardMaterial({ roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, map: canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = "#c92a2a"; c.beginPath(); c.arc(64, 64, 63, 0, 7); c.fill(); c.fillStyle = "#f4f2ec"; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill();
  c.strokeStyle = "#c92a2a"; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 46, 0, 7); c.stroke();
  c.fillStyle = "#c92a2a"; c.fillRect(42, 36, 10, 56); c.fillRect(76, 36, 10, 56); c.fillRect(42, 59, 44, 10);
}, false) });

// ---- o estacionamento: asfalto com as linhas das vagas e os carros (corpo e cabine em dois InstancedMesh) ----
function estacionamento(tr, add, F, [s0, s1, v0, v1]) {
  const asfalto = new THREE.MeshStandardMaterial({ roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = "#54565c"; c.fillRect(0, 0, w, h); c.fillStyle = "#f1f1ee"; c.fillRect(0, 0, 2, h); c.fillRect(w - 2, 0, 2, h);
  }) });
  asfalto.map.repeat.set((s1 - s0) / 24, 1);
  piso(tr, add, F, [s0, s1, v0, v1], asfalto, { y: 0.4, passo: 60, uv: [(s1 - s0) / 24, 1], nome: "bahrein-estacionamento" });
  const corpos = [], cabines = [], cores = ["#d9d9d6", "#25272b", "#a02b2b", "#2c4f8a", "#c9c3b4", "#6b6f75", "#e8e4d6"], cor = new THREE.Color();
  const fil = Math.floor((v1 - v0) / 56);
  for (let s = s0 + 14; s < s1 - 8; s += 24) for (let j = 0; j < fil; j++) {
    if (r() > 0.62) continue;
    const q = F.at(s, v0 + 8 + j * 56 + 26); corpos.push({ ...q, c: cores[(r() * cores.length) | 0] });
  }
  if (!corpos.length) return;
  const geoC = new THREE.BoxGeometry(18, 9, 46), geoT = new THREE.BoxGeometry(15, 6, 24);
  const mc = new THREE.InstancedMesh(geoC, M(0xffffff, { roughness: 0.5, metalness: 0.2 }), corpos.length), mt = new THREE.InstancedMesh(geoT, M(0x1a2430, { roughness: 0.3 }), corpos.length), d = new THREE.Object3D();
  corpos.forEach((o, k) => {
    const y = tr.chao(o.x, o.z) + 0.4;
    d.position.set(o.x, y + 6, o.z); d.rotation.set(0, o.ry, 0); d.scale.set(1, 1, 1); d.updateMatrix(); mc.setMatrixAt(k, d.matrix); mc.setColorAt(k, cor.set(o.c));
    d.position.set(o.x, y + 13, o.z); d.updateMatrix(); mt.setMatrixAt(k, d.matrix);
  });
  mc.castShadow = mt.castShadow = true; mc.name = mt.name = "bahrein-carros"; add(mc); add(mt);
  void cabines;
}
let r = sorteio(5521);

// ---- a praça, os gramados, as tendas, o heliporto e os estacionamentos ----
export function praca(tr, add, { torre = null, boxes = null } = {}) {
  r = sorteio(5521);
  const { n } = tr, F = moldura(tr, Math.floor(0.915 * n), Math.floor(1.095 * n), 1), sF = (f) => F.sDe(f);
  const palmeiras = [], verde = pisoMat("#4f9a47"), verde2 = pisoMat("#5aa64e"), pedra = pisoMat("#e6dfcd"), pedra2 = pisoMat("#d3cab4"), servico = pisoMat("#b7b2a6");
  const pt = (x, z, o = {}) => palmeiras.push({ x, y: tr.chao(x, z) - 1, z, s: 0.8 + r() * 0.7, r: r() * 6, ...o });
  const solta = (x, z, folga = 14) => livre(tr, x, z, folga) && !ocupado(tr, x, z);
  // a praça de pedra clara em volta da torre (o disco grande, o anel claro e a calçada que vai até a reta)
  if (torre) {
    disco(tr, add, torre.x, torre.y, 168, pedra, { lados: 36, aneis: 5, y: 0.3, nome: "bahrein-praca" });
    disco(tr, add, torre.x, torre.y, 118, pedra2, { lados: 36, aneis: 4, y: 0.5, rot: 0.08, nome: "bahrein-praca" });
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + 0.1, x = torre.x + Math.cos(a) * 190, z = torre.y + Math.sin(a) * 190; if (solta(x, z, 20)) pt(x, z, { s: 1 + r() * 0.5 }); } // as tamareiras que rodeiam a praça
  }
  // o gramado entre a pista e a praça, com a fileira de tamareiras da beira (a da foto)
  const sA = sF(0.928), sB = sF(0.972);
  piso(tr, add, F, [sA, sB, 98, 150], verde, { y: 0.3, passo: 40, nome: "bahrein-gramado" });
  for (let s = sA + 10; s < sB; s += 26) { const q = F.at(s, 118); if (solta(q.x, q.z, 22)) pt(q.x, q.z); }
  // atrás do prédio dos boxes: a rua de serviço, o gramado do paddock e as tendas brancas com as mesas vermelhas
  if (boxes) {
    const b = boxes, sI = F.sDe(b.i0 / n), sF2 = sI + b.comprimento, v1 = b.v0 + b.fundo;
    piso(tr, add, F, [sI, sF2, v1 + 2, v1 + 34], servico, { y: 0.3, passo: 60, nome: "bahrein-servico" });
    piso(tr, add, F, [sI, sF2, v1 + 36, v1 + 130], verde2, { y: 0.3, passo: 50, nome: "bahrein-paddock" });
    const nT = Math.floor(b.comprimento / 190);
    for (let k = 0; k < nT; k++) {
      const s = sI + (k + 0.5) * (b.comprimento / nT), v = v1 + 84, q = F.at(s, v);
      if (!solta(q.x, q.z, 30)) continue;
      const t = tendaPaddock({ modulos: 3, filas: 2, texto: ["PADDOCK CLUB", "GULF AIR", "ARAMCO", "PIRELLI"][k % 4], corFaixa: ["#ce1126", "#1d1d1f", "#0c8a43", "#d4af37"][k % 4] });
      t.position.set(q.x, tr.chao(q.x, q.z) + 0.3, q.z); t.rotation.y = q.ry + Math.PI; add(t);
      tr.reservado.push([q.x, q.z, 60]);
      for (const ds of [-76, 76]) for (const dv of [-38, 40]) { const p = F.at(s + ds, v + dv); if (solta(p.x, p.z, 20)) pt(p.x, p.z); } // as tamareiras entre as tendas
    }
    for (let s = sI + 20; s < sF2; s += 32) { const q = F.at(s, v1 + 14); if (solta(q.x, q.z, 20)) pt(q.x, q.z, { s: 0.7 + r() * 0.5 }); } // a aleia atrás do prédio
    // o heliporto no gramado e os estacionamentos mais atrás
    const hs = sI + b.comprimento * 0.55, hv = v1 + 250, q = F.at(hs, hv);
    if (solta(q.x, q.z, 70)) {
      disco(tr, add, q.x, q.z, 74, pisoMat("#5aa64e"), { lados: 8, rot: Math.PI / 8, aneis: 2, y: 0.3, nome: "bahrein-heliporto" });
      disco(tr, add, q.x, q.z, 40, matHeli(), { lados: 32, aneis: 3, y: 0.6, nome: "bahrein-heliporto" });
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2, x = q.x + Math.cos(a) * 62, z = q.z + Math.sin(a) * 62; if (solta(x, z, 10)) pt(x, z, { s: 0.7 }); }
      tr.reservado.push([q.x, q.z, 80]);
    }
    const q2 = F.at(sI + b.comprimento * 0.18, v1 + 210), q3 = F.at(sI + b.comprimento * 0.86, v1 + 210);
    for (const [qq, w] of [[q2, 260], [q3, 240]]) if (solta(qq.x, qq.z, 130)) { const sc = sI + (qq === q2 ? b.comprimento * 0.18 : b.comprimento * 0.86); estacionamento(tr, add, F, [sc - w / 2, sc + w / 2, v1 + 170, v1 + 290]); tr.reservado.push([qq.x, qq.z, 150]); }
  }
  tamareiras(tr, add, palmeiras);
  tr.palmeirasBahrein = palmeiras.length;
}
