// Xangai — a vegetação baixa do parque do circuito (peça só desta pista): gramados com moitas de arbustos podados, canforeiras de copa redonda e
// baixa, salgueiros-chorões na beira da água, touceiras de bambu e juncos nas margens dos lagos e canais. Tudo em InstancedMesh (sem sombra), em
// manchas por ruído, só onde `livre` e `ocupado` deixam, e na altura do terreno de verdade (o chão afundado das margens incluído).
import * as THREE from "three";
import { M } from "../../cena.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";
import { ruido } from "./lugar.js";
import { planoDaAgua, alturaDoTerreno, NIVEL } from "./agua.js";

const cor = (c) => new THREE.Color(c);
const ARBUSTOS = ["#4f7a3a", "#5d8a42", "#456b34", "#6a9348", "#3f6a3a", "#7a9a45"], FLORES = ["#c94b6b", "#e9d36a", "#d9803a"], CANFORAS = ["#3f6a38", "#4a7a3e", "#38603a", "#557f42"], SALGUEIROS = ["#9db862", "#8fb05a", "#a9c06c"], JUNCOS = ["#9a9a58", "#8a9a50", "#a8a460"], BAMBUS = ["#86a54b", "#7a9a44", "#94b055"];

const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
// a altura do chão onde a árvore pisa: o terreno de pista.js (menos 1,5), já com a margem afundada
const chaoEm = (tr, x, z) => alturaDoTerreno(tr, x, z, tr.chao(x, z) - 1.5, 0);

// pontos ao longo da pista, dos dois lados, em manchas de ruído (`ruidoMin` deixa de fora o vazio entre as manchas)
function semear(tr, { passo = 2, dMin = 40, dMax = 380, densidade = 3, semente = 1, ruidoMin = 0, folga = 12, escala = 150 }) {
  const { pts, n, W } = tr, r = sorteio(semente), out = [], plano = planoDaAgua(tr);
  for (let i = 0; i < n; i += passo) {
    const p = pts[i];
    for (const lado of [-1, 1]) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const d = W / 2 + dMin + (dMax - dMin) * r() * r(), x = p.x + p.nx * lado * d + (r() - 0.5) * 40, z = p.y + p.ny * lado * d + (r() - 0.5) * 40;
      if (ruido(x / escala, z / escala, semente) < ruidoMin) continue;
      if (!livre(tr, x, z, folga + 10) || ocupado(tr, x, z, i) || plano.campo(x, z) > -30) continue;
      out.push({ x, z });
    }
  }
  return out;
}
// pontos em volta da água: a faixa de `s0` a `s1` (distância da borda; negativo = em terra)
function emVoltaDaAgua(tr, { passo = 26, s0 = -70, s1 = -12, semente = 1, folga = 12 }) {
  const plano = planoDaAgua(tr), r = sorteio(semente), out = [];
  for (const e of plano.elems) {
    const x0 = e.tipo === "lago" ? e.cx - e.raio : e.x0, x1 = e.tipo === "lago" ? e.cx + e.raio : e.x1, z0 = e.tipo === "lago" ? e.cz - e.raio : e.z0, z1 = e.tipo === "lago" ? e.cz + e.raio : e.z1;
    for (let x = x0; x < x1; x += passo) for (let z = z0; z < z1; z += passo) {
      const px = x + (r() - 0.5) * passo, pz = z + (r() - 0.5) * passo, s = plano.campo(px, pz);
      if (s < s0 || s > s1 || !livre(tr, px, pz, folga + 6) || (tr.reservado || []).some(([cx, cy, rr]) => rr < 100 && (px - cx) ** 2 + (pz - cy) ** 2 < rr * rr)) continue;
      out.push({ x: px, z: pz, s });
    }
  }
  return out;
}
// uma touceira de bambu: sete colmos finos e altos, um pouco abertos
function geoBambu() {
  const partes = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, d = 0.28 + (k % 3) * 0.1, g = new THREE.CylinderGeometry(0.035, 0.05, 1 - (k % 2) * 0.18, 4);
    g.translate(0, 0.5 - (k % 2) * 0.09, 0); g.rotateZ(Math.cos(a) * 0.12); g.rotateX(Math.sin(a) * 0.12); g.translate(Math.cos(a) * d, 0, Math.sin(a) * d); partes.push(g);
  }
  return mergeGeometries(partes);
}

export function vegetacaoDoParque(tr, add, { densidade = 1, semente = 4141 } = {}) {
  const r = sorteio(semente), plano = planoDaAgua(tr);
  const arbustos = [], flores = [], troncos = [], copas = [], troncosS = [], copasS = [], juncos = [], bambus = [];
  // os arbustos podados e a vegetação baixa em manchas, por todo o parque
  for (const o of semear(tr, { passo: 2, dMin: 36, dMax: 560, densidade: 3.2 * densidade, semente, ruidoMin: 0.42, folga: 12 })) {
    const y = chaoEm(tr, o.x, o.z), w = 11 + r() * 17, h = 7 + r() * 8;
    arbustos.push({ x: o.x, y: y + h * 0.2, z: o.z, sx: w, sy: h, sz: w * (0.8 + r() * 0.5), r: r() * 6.28, c: ARBUSTOS[(r() * ARBUSTOS.length) | 0] });
    if (r() < 0.12) flores.push({ x: o.x + (r() - 0.5) * w * 0.4, y: y + h * 0.85, z: o.z + (r() - 0.5) * w * 0.4, sx: w * 0.5, sy: h * 0.28, sz: w * 0.5, r: 0, c: FLORES[(r() * 3) | 0] });
  }
  // as canforeiras de copa redonda e baixa
  for (const o of semear(tr, { passo: 3, dMin: 90, dMax: 640, densidade: 0.8 * densidade, semente: semente + 3, ruidoMin: 0.5, folga: 40, escala: 210 })) {
    const y = chaoEm(tr, o.x, o.z), alto = 30 + r() * 22, w = alto * (1.0 + r() * 0.3);
    troncos.push({ x: o.x, y: y + alto * 0.22, z: o.z, sx: alto * 0.05, sy: alto * 0.46, sz: alto * 0.05, r: 0, c: "#5b4838" });
    copas.push({ x: o.x, y: y + alto * 0.68, z: o.z, sx: w, sy: alto * 0.62, sz: w * 0.92, r: r() * 6.28, c: CANFORAS[(r() * CANFORAS.length) | 0] });
    if (r() < 0.6) copas.push({ x: o.x + (r() - 0.5) * w * 0.5, y: y + alto * 0.5, z: o.z + (r() - 0.5) * w * 0.5, sx: w * 0.6, sy: alto * 0.44, sz: w * 0.55, r: r() * 6.28, c: CANFORAS[(r() * CANFORAS.length) | 0] });
  }
  // os salgueiros-chorões da margem: o tronco curto e a cortina de folhas que desce até perto da água
  for (const o of emVoltaDaAgua(tr, { passo: 30, s0: -64, s1: -14, semente: semente + 5, folga: 30 })) {
    if (ruido(o.x / 160, o.z / 160, 3) < 0.38 || r() < 0.4) continue;
    const y = chaoEm(tr, o.x, o.z), alto = 46 + r() * 22, w = alto * (1.0 + r() * 0.3);
    troncosS.push({ x: o.x, y: y + 12, z: o.z, sx: alto * 0.055, sy: 26, sz: alto * 0.055, r: 0, c: "#5b4a38" });
    copasS.push({ x: o.x, y: y + alto * 0.62, z: o.z, sx: w, sy: alto * 1.05, sz: w, r: r() * 6.28, c: SALGUEIROS[(r() * SALGUEIROS.length) | 0] });
  }
  // os juncos, na lama e na água rasa da margem, em touceiras
  for (const o of emVoltaDaAgua(tr, { passo: 18, s0: -16, s1: 7, semente: semente + 9, folga: 14 })) {
    if (ruido(o.x / 90, o.z / 90, 8) < 0.45) continue;
    for (let k = 0; k < 3; k++) { const x = o.x + (r() - 0.5) * 12, z = o.z + (r() - 0.5) * 12, s = plano.campo(x, z); if (s > 9) continue; juncos.push({ x, y: Math.max(chaoEm(tr, x, z), NIVEL - 0.6), z, sx: 1.7, sy: 14 + r() * 18, sz: 1.7, r: r() * 3, c: JUNCOS[(r() * JUNCOS.length) | 0] }); }
  }
  // o bambu: touceiras nos cantos do parque, mais fundo da pista
  for (const o of semear(tr, { passo: 6, dMin: 120, dMax: 620, densidade: 0.5 * densidade, semente: semente + 11, ruidoMin: 0.62, folga: 36, escala: 260 })) {
    const t = 26 + r() * 22;
    bambus.push({ x: o.x, y: chaoEm(tr, o.x, o.z), z: o.z, sx: t, sy: 48 + r() * 40, sz: t, r: r() * 6.28, c: BAMBUS[(r() * BAMBUS.length) | 0] });
  }
  const verde = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), duplo = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, flatShading: true });
  const nome = (s) => `${tr.id}-${s}`;
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 1), verde, arbustos, { sombra: false, nome: nome("arbustos") }), arbustos);
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 0), verde, flores, { sombra: false, nome: nome("flores") }), flores);
  colorir(instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncos, { sombra: false, nome: nome("canforas-troncos") }), troncos);
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 1), verde, copas, { sombra: false, nome: nome("canforas-copas") }), copas);
  colorir(instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncosS, { sombra: false, nome: nome("salgueiros-troncos") }), troncosS);
  colorir(instancias(add, new THREE.SphereGeometry(0.5, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.7), duplo, copasS, { sombra: false, nome: nome("salgueiros-copas") }), copasS);
  colorir(instancias(add, new THREE.ConeGeometry(0.5, 1, 4), verde, juncos, { sombra: false, nome: nome("juncos") }), juncos);
  colorir(instancias(add, geoBambu(), duplo, bambus, { sombra: false, nome: nome("bambu") }), bambus);
  tr.vegetacaoXangai = { arbustos: arbustos.length, canforeiras: copas.length, salgueiros: copasS.length, juncos: juncos.length, bambu: bambus.length };
  return tr.vegetacaoXangai;
}
