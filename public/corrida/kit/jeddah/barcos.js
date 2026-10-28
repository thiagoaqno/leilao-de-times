// Jeddah — os barcos do Mar Vermelho: dhows (o barco de madeira árabe, casco largo e a vela latina triangular), lanchas e os
// iates amarrados na marina com o píer e os postes de luz. Dhows e lanchas se mexem devagar (uma matriz por barco por quadro:
// são poucos), cada tipo num InstancedMesh de cor por vértice.
//   barcosJeddah(tr, { add }, { mar, orla })  → { animar(dt, foco, t) }
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { sorteio } from "../comum.js";
import { Montador, solido } from "../montagem.js";

const colorir = (geo, cor) => { const c = new THREE.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } if (geo.attributes.uv) geo.deleteAttribute("uv"); if (!geo.attributes.normal) geo.computeVertexNormals(); geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); return geo.index ? geo.toNonIndexed() : geo; };
const matBarco = () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, flatShading: true });

// casco de proa afilada (planta em gota) com a borda mais alta na popa
function casco(comp, larg, alto, cor) {
  const f = new THREE.Shape(); f.moveTo(-comp / 2, -larg / 2); f.lineTo(comp * 0.18, -larg / 2); f.quadraticCurveTo(comp * 0.42, -larg * 0.35, comp / 2, 0); f.quadraticCurveTo(comp * 0.42, larg * 0.35, comp * 0.18, larg / 2); f.lineTo(-comp / 2, larg / 2); f.closePath();
  const g = new THREE.ExtrudeGeometry(f, { depth: alto, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return colorir(g, cor);
}
function geoDhow() {
  const partes = [casco(40, 12, 7, "#7b4f2c"), casco(36, 10, 1, "#c9a26b")];
  partes[1].translate(0, 7, 0);
  const cabine = new THREE.BoxGeometry(11, 5, 8); cabine.translate(-12, 9.5, 0); partes.push(colorir(cabine, "#e8dcc0"));
  const mastro = new THREE.CylinderGeometry(0.5, 0.6, 38, 5); mastro.translate(2, 26, 0); partes.push(colorir(mastro, "#4a3320"));
  // a vela latina: triângulo comprido inclinado, nas duas faces
  const vela = new THREE.BufferGeometry(); vela.setAttribute("position", new THREE.Float32BufferAttribute([-10, 10, 0, 22, 12, 0, 3, 44, 0.4], 3)); vela.setIndex([0, 1, 2]); vela.computeVertexNormals(); partes.push(colorir(vela, "#f2ead6"));
  const verga = new THREE.CylinderGeometry(0.4, 0.4, 34, 4); verga.rotateZ(Math.atan2(32, 14) - Math.PI / 2 + 0); verga.translate(6, 28, 0); partes.push(colorir(verga, "#4a3320"));
  return mergeGeometries(partes.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}
function geoLancha() {
  const partes = [casco(26, 8, 4, "#f5f5f2")], cab = new THREE.BoxGeometry(9, 4, 6); cab.translate(-4, 6, 0); partes.push(colorir(cab, "#223344"));
  const topo = new THREE.BoxGeometry(10, 0.8, 7); topo.translate(-4, 8.6, 0); partes.push(colorir(topo, "#f5f5f2"));
  const faixa = casco(26.2, 8.2, 0.8, "#006c35"); faixa.translate(0, 1.2, 0); partes.push(faixa);
  return mergeGeometries(partes.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

export function barcosJeddah(tr, { add, yachts }, { mar, orla, lagoa }) {
  const r = sorteio(6403), mat = matBarco();
  const dhows = [], lanchas = [];
  // dhows e lanchas no mar, a 150 a 1500 da costa (centro de cada volta), alguns na lagoa
  const orlaOeste = orla.filter((o) => o.ix > 0.7 && o.z > 500 && o.z < 7600);
  for (let k = 0; k < 14 && orlaOeste.length; k++) {
    const o = orlaOeste[Math.floor(r() * orlaOeste.length)], d = 260 + r() * 1200;
    dhows.push({ cx: o.x - d, cz: o.z + (r() - 0.5) * 300, raio: 80 + r() * 160, vel: (0.012 + r() * 0.02) * (k % 2 ? 1 : -1), fase: r() * 6.28, s: 1.1 + r() * 0.5 });
  }
  for (let k = 0; k < 8 && orlaOeste.length; k++) {
    const o = orlaOeste[Math.floor(r() * orlaOeste.length)], d = 180 + r() * 700;
    lanchas.push({ cx: o.x - d, cz: o.z + (r() - 0.5) * 300, raio: 120 + r() * 220, vel: (0.05 + r() * 0.05) * (k % 2 ? 1 : -1), fase: r() * 6.28, s: 1 });
  }
  const mk = (geo, lista, nome) => { const m = new THREE.InstancedMesh(geo, mat, lista.length); m.castShadow = false; m.name = nome; m.frustumCulled = false; add(m); return m; };
  const mD = dhows.length ? mk(geoDhow(), dhows, `${tr.id}-dhows`) : null, mL = lanchas.length ? mk(geoLancha(), lanchas, `${tr.id}-lanchas`) : null;
  const d = new THREE.Object3D(), nivel = 0.9;
  const pose = (lista, m, t) => lista.forEach((b, k) => {
    const a = b.fase + t * b.vel;
    d.position.set(b.cx + Math.cos(a) * b.raio, nivel + Math.sin(t * 0.8 + b.fase) * 0.4, b.cz + Math.sin(a) * b.raio);
    d.rotation.set(Math.sin(t * 0.6 + b.fase) * 0.025, -a + (b.vel > 0 ? 0 : Math.PI), 0); d.scale.setScalar(b.s); d.updateMatrix(); m.setMatrixAt(k, d.matrix);
  });
  const reduz = matchMedia("(prefers-reduced-motion: reduce)");
  if (mD) pose(dhows, mD, 0); if (mL) pose(lanchas, mL, 0);
  // a marina: píer de pedra para dentro do mar com postes de luz, e os iates atracados dos dois lados (os de pista.js: ctx.yachts)
  const mt = new Montador(), S = solido(), lampada = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  const o0 = orla.reduce((m, o) => (Math.abs(o.z - 6300) < Math.abs(m.z - 6300) && o.ix > 0.7 ? o : m), orla[0]);
  const px = o0.x, pz = o0.z;
  for (const [dz, comp] of [[-70, 150], [0, 190], [70, 150]]) {
    mt.caixa(S, [px - comp / 2, 1.4, pz + dz], [comp, 2, 9], { cor: "#e1d8c3" });
    for (let x = 12; x < comp; x += 30) { mt.cilindro(S, [px - x, 7, pz + dz + 3.5], [0.5, 12], { cor: "#7c8288", seg: 5 }); mt.caixa(lampada, [px - x, 13.4, pz + dz + 3.5], [2, 1.2, 2]); }
    for (let x = 22; x < comp - 20; x += 30) for (const s of [-1, 1]) if (r() < 0.8 && yachts) yachts.push({ x: px - x, y: pz + dz + s * 17, h: 0.5, s: 0.95 + r() * 0.35, r: s > 0 ? 0 : Math.PI });
  }
  add(mt.montar("marina-jeddah"));
  tr.reservado.push([px - 90, pz, 190]);
  return {
    animar(dt, foco, t) {
      if (reduz.matches) return;
      if (foco && Math.hypot(foco.x - tr.costaJeddah.xCosta(foco.y), 0) > 3200) return; // longe do mar: nem calcula
      if (mD) { pose(dhows, mD, t); mD.instanceMatrix.needsUpdate = true; }
      if (mL) { pose(lanchas, mL, t); mL.instanceMatrix.needsUpdate = true; }
    },
    mar, lagoa,
  };
}
