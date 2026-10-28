// Jeddah — a Mesquita Al-Rahma (a "mesquita flutuante"): branca, sobre estacas dentro do mar, com a cúpula central achatada,
// cúpulas menores nos cantos, arcos em toda a volta e dois minaretes de varanda. Fica a oeste da pista, no mar, com um
// píer de pedra até a corniche e a luz amarela nos arcos. Uma malha por material (Montador do kit 2).
//
//   mesquitaFlutuante({ largura: 150, profundidade: 120, alto: 34 }) → THREE.Group (origem na água; a frente, o lado do píer, é +z)
import * as THREE from "three";
import { Montador, solido, comTextura, tex } from "../montagem.js";

// a parede de arcos: pedra clara com arcos escuros e uma luz quente dentro; a faixa de cima com o friso
function texturaArcos() {
  return tex(128, 64, (x, w, h) => {
    x.fillStyle = "#f4efe2"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const cx = k * 32 + 16;
      x.fillStyle = "#e9e2d0"; x.fillRect(cx - 12, 6, 24, h - 6);
      x.fillStyle = "#3a3126"; x.beginPath(); x.moveTo(cx - 9, h); x.lineTo(cx - 9, 30); x.quadraticCurveTo(cx - 9, 12, cx, 10); x.quadraticCurveTo(cx + 9, 12, cx + 9, 30); x.lineTo(cx + 9, h); x.fill();
      x.fillStyle = "#ffd98a"; x.beginPath(); x.moveTo(cx - 6, h); x.lineTo(cx - 6, 32); x.quadraticCurveTo(cx - 6, 17, cx, 15); x.quadraticCurveTo(cx + 6, 17, cx + 6, 32); x.lineTo(cx + 6, h); x.fill();
    }
    x.fillStyle = "#cfc4a8"; x.fillRect(0, 0, w, 5); x.fillRect(0, 5, w, 1);
  }, { repeat: true });
}

export function mesquitaFlutuante({ largura = 150, profundidade = 120, alto = 34 } = {}) {
  const m = new Montador(), S = solido(), arcos = comTextura(texturaArcos(), { roughness: 0.8 });
  const branco = "#f6f1e4", pedra = "#cdc3ab", ouro = "#d9a93b", W = largura, D = profundidade;
  const dourado = new THREE.MeshStandardMaterial({ color: 0xd9a93b, roughness: 0.35, metalness: 0.7 });
  // as estacas e a plataforma baixa de pedra
  for (let x = -W / 2 + 8; x <= W / 2 - 8; x += 22) for (let z = -D / 2 + 8; z <= D / 2 - 8; z += 22) m.cilindro(S, [x, -2, z], [1.4, 6], { cor: "#6c6354", seg: 6 });
  m.caixa(S, [0, 3, 0], [W, 4, D], { cor: pedra });
  m.caixa(S, [0, 5.4, 0], [W - 6, 1, D - 6], { cor: "#e7dfca" });
  // o corpo: caixa com arcos nas quatro faces (a textura repete a cada 4 arcos)
  const cw = W - 26, cd = D - 26, y0 = 6;
  m.caixa(S, [0, y0 + alto / 2, 0], [cw, alto, cd], { cor: branco });
  m.plano(arcos, [0, y0 + alto * 0.42, cd / 2 + 0.2], [cw - 2, alto * 0.78], { uv: [cw / 40, 1] });
  m.plano(arcos, [0, y0 + alto * 0.42, -cd / 2 - 0.2], [cw - 2, alto * 0.78], { ry: Math.PI, uv: [cw / 40, 1] });
  for (const lado of [-1, 1]) m.plano(arcos, [lado * (cw / 2 + 0.2), y0 + alto * 0.42, 0], [cd - 2, alto * 0.78], { ry: lado * Math.PI / 2, uv: [cd / 40, 1] });
  m.caixa(S, [0, y0 + alto + 1, 0], [cw + 4, 2.4, cd + 4], { cor: "#ece5d2" }); // a cornija
  // as arcadas externas: uma fileira de colunas finas em volta da plataforma
  for (let x = -W / 2 + 6; x <= W / 2 - 6; x += 9) for (const z of [-D / 2 + 4, D / 2 - 4]) m.cilindro(S, [x, 11, z], [1.2, 12], { cor: branco, seg: 8 });
  for (let z = -D / 2 + 13; z <= D / 2 - 13; z += 9) for (const x of [-W / 2 + 4, W / 2 - 4]) m.cilindro(S, [x, 11, z], [1.2, 12], { cor: branco, seg: 8 });
  m.caixa(S, [0, 17.5, D / 2 - 4], [W - 4, 1.4, 3], { cor: "#ece5d2" }); m.caixa(S, [0, 17.5, -D / 2 + 4], [W - 4, 1.4, 3], { cor: "#ece5d2" });
  m.caixa(S, [W / 2 - 4, 17.5, 0], [3, 1.4, D - 4], { cor: "#ece5d2" }); m.caixa(S, [-W / 2 + 4, 17.5, 0], [3, 1.4, D - 4], { cor: "#ece5d2" });
  // a cúpula central (achatada, sobre o tambor) e as quatro dos cantos
  const topo = y0 + alto + 2.4, calota = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  m.cilindro(S, [0, topo + 4, 0], [27, 8], { cor: "#efe9d8", seg: 20 });
  m.geo(S, calota, { x: 0, y: topo + 8, z: 0, sx: 29, sy: 24, sz: 29, cor: branco });
  m.geo(dourado, new THREE.SphereGeometry(1.8, 10, 8), { x: 0, y: topo + 8 + 24 + 1, z: 0 });
  m.cilindro(dourado, [0, topo + 8 + 24 + 5, 0], [0.5, 8], { seg: 5 });
  m.geo(dourado, new THREE.TorusGeometry(2.4, 0.5, 5, 14, Math.PI * 1.55), { x: 0, y: topo + 8 + 24 + 10, z: 0, rx: 0, rz: Math.PI * 0.2 }); // o crescente
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = sx * (cw / 2 - 12), z = sz * (cd / 2 - 12);
    m.cilindro(S, [x, topo + 2, z], [10, 4], { cor: "#efe9d8", seg: 14 });
    m.geo(S, calota, { x, y: topo + 4, z, sx: 11, sy: 10, sz: 11, cor: branco });
    m.cilindro(dourado, [x, topo + 4 + 10 + 2.4, z], [0.35, 5], { seg: 5 });
  }
  // as pequenas cúpulas do pórtico da frente (as 6 do "paraíso") em cima da arcada
  for (let x = -W / 2 + 22; x <= W / 2 - 22; x += 22) m.geo(S, calota, { x, y: 18.2, z: D / 2 - 4, sx: 6, sy: 5.5, sz: 6, cor: branco });
  // os dois minaretes: fuste quadrado, varanda, torre redonda e a ponta com o crescente
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 14), z = D / 2 - 14, h0 = 18;
    m.caixa(S, [x, h0 + 22, z], [8, 44, 8], { cor: branco });
    m.caixa(S, [x, h0 + 45, z], [11.5, 2.4, 11.5], { cor: "#ece5d2" });
    m.cilindro(S, [x, h0 + 58, z], [3.6, 22], { cor: branco, seg: 10 });
    m.caixa(S, [x, h0 + 70, z], [8, 2, 8], { cor: "#ece5d2" });
    m.cilindro(S, [x, h0 + 79, z], [2.6, 14], { cor: branco, seg: 10 });
    m.geo(S, new THREE.ConeGeometry(3, 10, 10), { x, y: h0 + 90, z, cor: ouro });
    m.geo(dourado, new THREE.TorusGeometry(1.9, 0.4, 5, 12, Math.PI * 1.55), { x, y: h0 + 98, z, rz: Math.PI * 0.2 });
  }
  const g = m.montar("mesquita-flutuante");
  g.userData = { largura: W, profundidade: D, alto: topo + 40 };
  return g;
}
