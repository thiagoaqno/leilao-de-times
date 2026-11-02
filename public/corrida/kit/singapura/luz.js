// Singapura — a iluminação do GP: a corrida é à noite sob cerca de 1600 refletores presos em treliças nos postes dos dois lados da pista, que deixam o
// asfalto claro e uniforme (nada de poças escuras entre um poste e outro). Aqui: os postes (InstancedMesh), a treliça contínua de uma ponta a outra de
// cada trecho com as lâmpadas penduradas (InstancedMesh, com brilho no pós) e iluminação uniforme durante a noite. O
// laço da noite é o de kit/bahrein/base.js (`luzDaNoite`, `ligarNoite`, `soDeNoite`).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { soDeNoite } from "../bahrein/base.js";
import { registrarLuz } from "../luz-postes.js";

const ALTO = 96, PASSO = 54;

export function iluminacao(tr, add, { alto = ALTO, passo = PASSO } = {}) {
  const { pts, n, W } = tr, o = new THREE.Object3D(), postes = [];
  const recuoDe = (q, lado) => tr.murosEscape?.[lado]?.[q] || 14;
  let acc = { 1: 0, [-1]: 0 };
  for (let i = 0; i < n; i += 3) {
    const p = pts[i];
    for (const lado of [1, -1]) {
      acc[lado] += 18;
      if (acc[lado] < passo) continue;
      acc[lado] = 0;
      const lat = lado * (W / 2 + recuoDe(i, lado) + 8), x = p.x + p.nx * lat, z = p.y + p.ny * lat, y = tr.chao(x, z);
      if (tr.distAt(x, z) < W / 2 + 14) continue; // nunca em cima de outro trecho da pista
      if (tr.ocupadoSG?.(x, z) && tr.distAt(x, z) > W / 2 + 34) continue; // água ou prédio (na ponte o poste fica na beira do tabuleiro)
      postes.push({ x, y, z, lado, nx: p.nx, ny: p.ny, ph: p.h, i, tx: p.tx, ty: p.ty });
    }
  }
  if (!postes.length) return 0;
  // ---- os postes: um mastro fino com o braço dobrado para a pista; a treliça sai do alto de cada um ----
  const mastroGeo = new THREE.CylinderGeometry(0.9, 1.5, alto, 8); mastroGeo.translate(0, alto / 2, 0);
  const mastros = new THREE.InstancedMesh(mastroGeo, M(0x8b9096, { roughness: 0.5, metalness: 0.5 }), postes.length);
  postes.forEach((t, k) => { o.position.set(t.x, t.y - 1, t.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mastros.setMatrixAt(k, o.matrix); });
  mastros.castShadow = false; mastros.name = "singapura-postes-luz"; mastros.userData.semContato = true; add(mastros);
  // o braço: da ponta do mastro para dentro, 15 unidades, onde fica a cabeça com as lâmpadas
  const bracoGeo = new THREE.BoxGeometry(1.6, 1.6, 17); bracoGeo.translate(0, 0, 8);
  const bracos = new THREE.InstancedMesh(bracoGeo, M(0x8b9096, { roughness: 0.5, metalness: 0.5 }), postes.length);
  postes.forEach((t, k) => { o.position.set(t.x, t.y + alto - 1, t.z); o.rotation.set(0, Math.atan2(-t.nx * t.lado, -t.ny * t.lado), 0); o.updateMatrix(); bracos.setMatrixAt(k, o.matrix); });
  bracos.name = "singapura-bracos-luz"; bracos.userData.semContato = true; add(bracos);
  // ---- a cabeça: uma barra de lâmpadas (4 por poste, em duas fileiras) virada para a pista ----
  const cabecaGeo = new THREE.BoxGeometry(18, 3, 6); const cabeca = new THREE.InstancedMesh(cabecaGeo, M(0x2c2f34, { roughness: 0.6, metalness: 0.4 }), postes.length);
  const lampGeo = new THREE.PlaneGeometry(5.2, 3.4);
  const lamp = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfff1d6, side: THREE.DoubleSide, fog: false, userData: { bloom: 2.4 } }), postes.length * 4);
  lamp.material.userData.bloom = 2.4;
  postes.forEach((t, k) => {
    const rot = Math.atan2(-t.nx * t.lado, -t.ny * t.lado), cx = t.x - t.nx * t.lado * 17, cz = t.z - t.ny * t.lado * 17, cy = t.y + alto - 2;
    o.position.set(cx, cy, cz); o.rotation.set(0, rot, 0); o.scale.set(1, 1, 1); o.updateMatrix(); cabeca.setMatrixAt(k, o.matrix);
    const dx = Math.cos(rot), dz = -Math.sin(rot); // o eixo x da cabeça no mundo
    [-6.6, -2.2, 2.2, 6.6].forEach((d, e) => { o.position.set(cx + dx * d, cy - 1.8, cz + dz * d); o.rotation.set(-Math.PI / 2, rot, 0); o.updateMatrix(); lamp.setMatrixAt(k * 4 + e, o.matrix); });
  });
  cabeca.castShadow = false; cabeca.name = "singapura-cabecas-luz"; cabeca.userData.semContato = true; add(cabeca);
  lamp.frustumCulled = false; lamp.name = "singapura-lampadas"; lamp.userData.semContato = true; add(lamp);
  // ---- o brilho (halo) de cada cabeça: um cartão aditivo que olha para a câmera (só de noite) ----
  const halo = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255,246,224,0.95)"); g.addColorStop(0.3, "rgba(255,232,180,0.4)"); g.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
  const haloMat = new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const haloGeo = new THREE.PlaneGeometry(36, 24);
  const halos = new THREE.InstancedMesh(haloGeo, haloMat, postes.length);
  postes.forEach((t, k) => { const rot = Math.atan2(-t.nx * t.lado, -t.ny * t.lado); o.position.set(t.x - t.nx * t.lado * 17, t.y + alto - 3, t.z - t.ny * t.lado * 17); o.rotation.set(0, rot, 0); o.updateMatrix(); halos.setMatrixAt(k, o.matrix); });
  halos.frustumCulled = false; halos.renderOrder = 4; halos.name = "singapura-halos"; soDeNoite(tr, add(halos)); halos.userData.semContato = true;
  // A luz de verdade: cada cabeça de poste lança um cone macio no asfalto (kit/luz-postes.js), em vez de luz uniforme.
  for (const t of postes) {
    const cx = t.x - t.nx * t.lado * 17, cz = t.z - t.ny * t.lado * 17, q = tr.pts[t.i];
    registrarLuz(tr, { x: cx, y: t.y + alto - 3, z: cz, alvo: [q.x + q.tx * 6, q.h, q.y + q.ty * 6], intensidade: 14, cone: 20, suave: 0.6 });
  }
  tr.refletoresSG = { postes: postes.length };
  return postes.length;
}
