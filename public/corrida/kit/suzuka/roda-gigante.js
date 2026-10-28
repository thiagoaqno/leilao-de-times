// Suzuka — a roda-gigante do parque do circuito (peça nova, só desta pista; o parque fica dentro da volta, atrás dos boxes e
// perto da chicane final). Pernas em A, o cubo, dois aros com os raios, as lâmpadas coloridas do aro e as cabines penduradas.
// Estático: pernas e cubo, numa malha. O que gira (aros, raios e lâmpadas) é um grupo que gira devagar; as cabines são um
// InstancedMesh recalculado a cada quadro (cada uma fica de pé quando a roda gira), só se a câmera estiver perto.
//
//   const roda = rodaGigante({ raio: 200, cabines: 20 });   // origem no chão, a roda no plano x-y (o eixo é o z)
//   roda.grupo.position.set(x, y, z); roda.grupo.rotation.y = ry; add(roda.grupo);
//   roda.animar(dt, foco)  // foco: { x, y } (o carro seguido); sem foco, gira sempre
import * as THREE from "three";
import { Montador, solido } from "../montagem.js";

export function rodaGigante({ raio = 200, cabines = 20, cor = "#f4f5f7", corAcento = "#2b6fd6", cores = ["#e8212b", "#ffd23f", "#2b6fd6", "#f4f5f7", "#43a047", "#ff8a1f"], velocidade = 0.05, distanciaDeGiro = 3800 } = {}) {
  const S = solido(), grupo = new THREE.Group(), cubo = raio * 1.12, meio = raio * 0.09; // a altura do cubo e a metade da distância entre os aros
  // ---- o que não gira: pernas em A dos dois lados, a base e o eixo ----
  const base = new Montador(), pe = raio * 0.62;
  for (const sz of [-1, 1]) {
    const z = sz * (meio + 5);
    for (const sx of [-1, 1]) {
      const comp = Math.hypot(pe, cubo), ang = Math.atan2(pe, cubo);
      base.caixa(S, [sx * pe / 2, cubo / 2, z], [raio * 0.045, comp, raio * 0.05], { cor, rz: sx * ang });
      base.caixa(S, [sx * pe, 3, z], [raio * 0.2, 6, raio * 0.11], { cor: "#9a9ea6" }); // o pé de concreto
    }
    base.caixa(S, [0, raio * 0.33, z], [pe * 1.05, raio * 0.025, raio * 0.025], { cor: corAcento }); // o travessão
  }
  base.cilindro(S, [0, cubo, 0], [raio * 0.07, meio * 2 + 14], { cor: "#6a7078", rx: Math.PI / 2, seg: 12 });
  base.caixa(S, [0, 2, 0], [pe * 2.4, 4, raio * 0.34], { cor: "#b7b9bd" }); // a plataforma de embarque
  const parado = base.montar("roda-gigante-base");
  grupo.add(parado);
  // ---- o que gira ----
  const roda = new THREE.Group(); roda.position.y = cubo; grupo.add(roda);
  const gira = new Montador(), lampadas = [];
  for (const sz of [-1, 1]) {
    gira.geo(S, new THREE.TorusGeometry(raio, raio * 0.014, 5, 56), { z: sz * meio, cor });
    gira.geo(S, new THREE.TorusGeometry(raio * 0.6, raio * 0.008, 5, 40), { z: sz * meio, cor: corAcento });
    gira.geo(S, new THREE.TorusGeometry(raio * 0.22, raio * 0.012, 5, 24), { z: sz * meio, cor });
    for (let k = 0; k < cabines; k++) {
      const a = (k / cabines) * Math.PI * 2;
      // raios: dois por cabine, do cubo até o aro (um de cada lado)
      gira.caixa(S, [-Math.sin(a) * raio / 2, Math.cos(a) * raio / 2, sz * meio], [raio * 0.01, raio, raio * 0.01], { cor, rz: a });
      const b = a + Math.PI / cabines; // os raios do meio, mais finos, em zigue-zague até o aro de dentro
      gira.caixa(S, [-Math.sin(b) * raio * 0.8, Math.cos(b) * raio * 0.8, sz * meio], [raio * 0.006, raio * 0.4, raio * 0.006], { cor: corAcento, rz: b });
    }
  }
  for (let k = 0; k < cabines; k++) { const a = (k / cabines) * Math.PI * 2; gira.caixa(S, [-Math.sin(a) * raio, Math.cos(a) * raio, 0], [raio * 0.02, raio * 0.02, meio * 2], { cor: "#8b9098", rz: a }); } // a barra que prende a cabine
  roda.add(gira.montar("roda-gigante-giro"));
  // as lâmpadas do aro (cores alternadas, chapadas): um InstancedMesh pequeno que gira com a roda
  const nl = 48, lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(raio * 0.018, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), nl * 2), d = new THREE.Object3D();
  for (let k = 0; k < nl; k++) for (const [s, sz] of [[0, -1], [1, 1]]) {
    const a = (k / nl) * Math.PI * 2; d.position.set(-Math.sin(a) * raio, Math.cos(a) * raio, sz * meio); d.updateMatrix(); lamp.setMatrixAt(k * 2 + s, d.matrix);
    lamp.setColorAt(k * 2 + s, new THREE.Color(cores[k % cores.length]));
  }
  lamp.instanceColor.needsUpdate = true; lamp.castShadow = false; lamp.frustumCulled = false; roda.add(lamp); lampadas.push(lamp);
  // ---- as cabines penduradas ----
  const cab = new Montador();
  cab.caixa(S, [0, -9, 0], [raio * 0.085, raio * 0.07, meio * 1.7 + 4], { cor: "#ffffff" }); // o corpo
  cab.caixa(S, [0, -5, 0], [raio * 0.095, raio * 0.012, meio * 1.7 + 6], { cor: "#444a52" }); // a cobertura
  cab.caixa(S, [0, -3, 0], [raio * 0.008, raio * 0.04, raio * 0.008], { cor: "#8b9098" }); // a haste
  const geoCabine = cab.montar("c").children[0].geometry;
  const cabs = new THREE.InstancedMesh(geoCabine, new THREE.MeshStandardMaterial({ roughness: 0.6 }), cabines);
  cabs.castShadow = false; cabs.receiveShadow = false; cabs.frustumCulled = false; cabs.name = "roda-gigante-cabines"; grupo.add(cabs);
  for (let k = 0; k < cabines; k++) cabs.setColorAt(k, new THREE.Color(cores[k % cores.length]));
  cabs.instanceColor.needsUpdate = true;
  // a matriz de cada cabine: o ponto do aro (rodado) e a cabine de pé, no espaço do grupo
  const rotacao = new THREE.Matrix4(), mm = new THREE.Matrix4();
  let angulo = 0, pronta = false;
  const posicionar = () => {
    for (let k = 0; k < cabines; k++) {
      const a = angulo + (k / cabines) * Math.PI * 2;
      mm.makeTranslation(-Math.sin(a) * raio, cubo + Math.cos(a) * raio - 2, 0); cabs.setMatrixAt(k, mm);
    }
    cabs.instanceMatrix.needsUpdate = true;
  };
  void rotacao;
  posicionar();
  const reduz = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const api = {
    grupo, roda, cabines: cabs, raio, altura: cubo + raio + 20,
    animar(dt, foco) {
      if (reduz.matches) return;
      if (foco && pronta) { grupo.updateWorldMatrix(true, false); const w = grupo.position; if ((w.x - foco.x) ** 2 + (w.z - foco.y) ** 2 > distanciaDeGiro ** 2) return; }
      pronta = true; angulo += dt * velocidade; roda.rotation.z = angulo; posicionar();
    },
  };
  return api;
}
