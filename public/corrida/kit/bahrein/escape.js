// Bahrein — as áreas de escape de Sakhir: o asfalto pintado em MOSAICO de triângulos azuis (com uns verdes e brancos, como no
// modelo que o Thiago gostou) do lado de fora das curvas lentas, e o muro de pilhas de pneus por fora delas. Os pneus são uma
// pilha de três num só InstancedMesh (cilindros de 8 lados: uns 100 triângulos por pilha, e não os 430 dos toros do kit).
// O carro anda igual: é tudo tinta e cenário depois da zebra, na mesma faixa de escape.d do kit (a largura é a do `escape` do GP).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { canvasTex, M } from "../../cena.js";
import { lotes, tira, sinalDaCurva, livre, ocupado } from "../comum.js";

// de qual lado cada trecho vai (como em kit/escape.js): 1, -1, 0 (os dois) ou "fora"/"dentro" da curva mais fechada do trecho
function lados(tr, a, b, lado) {
  const { pts, n } = tr;
  if (lado === 1 || lado === -1) return [lado];
  if (lado === 0 || lado === undefined) return [-1, 1];
  let i = a; for (let k = a; k <= b; k++) if ((pts[k % n].k || 0) > (pts[i % n].k || 0)) i = k;
  const dentro = sinalDaCurva(pts, n, i % n); return [lado === "dentro" ? dentro : -dentro];
}

export function escapeMosaico(tr, add, { trechos = [], pneus = [], largura = 36 } = {}) {
  const { pts, n, W } = tr, de = W / 2 + 7, ate = de + largura, L = lotes();
  // o mosaico: uma grade de 4 × 4 casas, cada uma cortada na diagonal em dois triângulos de tons de azul (alguns verdes e brancos)
  const AZUIS = ["#1f5aa6", "#2a6dbd", "#3a82cf", "#4f96d9", "#2563a8", "#1b4f94", "#5ba3e0"], VERDES = ["#2e9f86", "#3ab57b", "#27a39a"], BRANCOS = ["#e6eef5", "#cfe3f2"];
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, map: canvasTex(128, 128, (c, w, h, rr) => {
    const q = 32, cor = () => { const x = rr(); return x < 0.1 ? VERDES[(rr() * VERDES.length) | 0] : x < 0.16 ? BRANCOS[(rr() * BRANCOS.length) | 0] : AZUIS[(rr() * AZUIS.length) | 0]; };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * q, y = j * q, diag = (i + j) % 2;
      c.fillStyle = cor(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + q, y); c.lineTo(diag ? x : x + q, y + q); c.closePath(); c.fill();
      c.fillStyle = cor(); c.beginPath(); c.moveTo(x, y + q); c.lineTo(x + q, y + q); c.lineTo(diag ? x + q : x, y); c.closePath(); c.fill();
    }
    c.fillStyle = "#f4f4f4"; c.fillRect(0, 0, 3, h); // a linha branca junto da zebra
    for (let i = 0; i < 220; i++) { c.fillStyle = rr() < 0.5 ? "#00000014" : "#ffffff10"; c.fillRect(rr() * w, rr() * h, 2, 2); } // o asfalto gasto
  }) });
  let km = 0;
  for (const [f0, f1, lado] of trechos) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    for (const s of lados(tr, a, b, lado)) { tira(tr, L.de(mat), a, b, s * de, s * ate, 0.42, 0.42, (a * 3.78) / 40, (b * 3.78) / 40); km += b - a; }
  }
  L.montar(add, `${tr.id}-escape-mosaico`);
  // o muro de pneus: pilha de 3 (cilindros de 8 lados), preta ou, de vez em quando, branca
  const dPneus = ate - 4, pilhas = [];
  for (const [f0, f1, lado] of pneus) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    for (const s of lados(tr, a, b, lado)) for (let i = a; i < b; i += 2) {
      const p = pts[i % n], x = p.x + p.nx * s * dPneus, z = p.y + p.ny * s * dPneus;
      if (!livre(tr, x, z, 12) || ocupado(tr, x, z, i % n)) continue;
      pilhas.push({ x, z, y: p.h, c: ((i / 2) | 0) % 7 === 0 ? "#e6e6e0" : "#18191c" });
    }
  }
  if (pilhas.length) {
    const partes = [0, 1, 2].map((k) => { const g = new THREE.CylinderGeometry(3.5, 3.5, 3.3, 8); g.translate(0, 1.7 + k * 3.6, 0); return g; });
    const geo = mergeGeometries(partes), d = new THREE.Object3D(), cor = new THREE.Color();
    const m = new THREE.InstancedMesh(geo, M(0xffffff, { roughness: 0.95, flatShading: true }), pilhas.length);
    pilhas.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, k * 0.7, 0); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, cor.set(o.c)); });
    m.castShadow = true; m.name = `${tr.id}-pneus`; add(m);
  }
  tr.escapeMosaico = { pontos: km, pilhas: pilhas.length };
}
