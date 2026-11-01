// Singapura — a iluminação do GP: a corrida é à noite sob cerca de 1600 refletores presos em treliças nos postes dos dois lados da pista, que deixam o
// asfalto claro e uniforme (nada de poças escuras entre um poste e outro). Aqui: os postes (InstancedMesh), a treliça contínua de uma ponta a outra de
// cada trecho com as lâmpadas penduradas (InstancedMesh, com brilho no pós), a luz no chão (uma mancha aditiva por poste, uma faixa só, de lado a
// lado da pista) e as poucas luzes de verdade (SpotLight) que seguem o carro e acendem os carros e a borda. Tudo só acende de noite (tr.noite): o
// laço da noite é o de kit/bahrein/base.js (`luzDaNoite`, `ligarNoite`, `soDeNoite`).
import * as THREE from "three";
import { canvasTex, M, hemi } from "../../cena.js";
import { luzDaNoite, soDeNoite } from "../bahrein/base.js";

const ALTO = 96, PASSO = 54, LUZES = 5, FORCA = 380, FAIXA = 140, ALCANCE = 520, HEMI_NOITE = 0.5;

export function iluminacao(tr, add, { alto = ALTO, passo = PASSO } = {}) {
  const { pts, n, W } = tr, o = new THREE.Object3D(), postes = [], lampadas = [], pocas = [], treliças = [];
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
      if (tr.ocupadoSG?.(x, z)) continue; // água ou prédio
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
  const lamp = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfff1d6, side: THREE.DoubleSide, fog: true, userData: { bloom: 2.4 } }), postes.length * 4);
  lamp.material.userData.bloom = 2.4;
  postes.forEach((t, k) => {
    const rot = Math.atan2(-t.nx * t.lado, -t.ny * t.lado), cx = t.x - t.nx * t.lado * 17, cz = t.z - t.ny * t.lado * 17, cy = t.y + alto - 2;
    o.position.set(cx, cy, cz); o.rotation.set(0, rot, 0); o.scale.set(1, 1, 1); o.updateMatrix(); cabeca.setMatrixAt(k, o.matrix);
    const dx = Math.cos(rot), dz = -Math.sin(rot); // o eixo x da cabeça no mundo
    [-6.6, -2.2, 2.2, 6.6].forEach((d, e) => { o.position.set(cx + dx * d, cy - 1.8, cz + dz * d); o.rotation.set(-Math.PI / 2, rot, 0); o.updateMatrix(); lamp.setMatrixAt(k * 4 + e, o.matrix); });
    // a luz no chão: uma faixa de lado a lado da pista, centrada no ponto da pista mais perto do poste
    pocas.push({ x: pts[t.i].x, z: pts[t.i].y, h: pts[t.i].h, tx: pts[t.i].tx, ty: pts[t.i].ty });
  });
  cabeca.castShadow = false; cabeca.name = "singapura-cabecas-luz"; cabeca.userData.semContato = true; add(cabeca);
  lamp.frustumCulled = false; lamp.name = "singapura-lampadas"; lamp.userData.semContato = true; add(lamp);
  // ---- o brilho (halo) de cada cabeça: um cartão aditivo que olha para a câmera (só de noite) ----
  const halo = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255,246,224,0.95)"); g.addColorStop(0.3, "rgba(255,232,180,0.4)"); g.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
  const haloMat = new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const haloGeo = new THREE.PlaneGeometry(36, 24);
  const halos = new THREE.InstancedMesh(haloGeo, haloMat, postes.length);
  postes.forEach((t, k) => { const rot = Math.atan2(-t.nx * t.lado, -t.ny * t.lado); o.position.set(t.x - t.nx * t.lado * 17, t.y + alto - 3, t.z - t.ny * t.lado * 17); o.rotation.set(0, rot, 0); o.updateMatrix(); halos.setMatrixAt(k, o.matrix); });
  halos.frustumCulled = false; halos.renderOrder = 4; halos.name = "singapura-halos"; soDeNoite(tr, add(halos)); halos.userData.semContato = true;
  // ---- a luz no chão ----
  const poca = canvasTex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 6, 64, 64, 64); g.addColorStop(0, "rgba(255,240,206,0.2)"); g.addColorStop(0.55, "rgba(255,232,190,0.1)"); g.addColorStop(1, "rgba(255,226,170,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
  const pocaMat = new THREE.MeshBasicMaterial({ map: poca, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true });
  const pocaGeo = new THREE.PlaneGeometry(W + 80, 118); pocaGeo.rotateX(-Math.PI / 2);
  const pocasIM = new THREE.InstancedMesh(pocaGeo, pocaMat, pocas.length);
  pocas.forEach((q, k) => { o.position.set(q.x, q.h + 0.9, q.z); o.rotation.set(0, Math.atan2(-q.ty, q.tx) + Math.PI / 2 * 0, 0); o.rotation.y = Math.atan2(-q.ty, q.tx) - Math.PI / 2; o.updateMatrix(); pocasIM.setMatrixAt(k, o.matrix); });
  pocasIM.frustumCulled = false; pocasIM.renderOrder = 2; pocasIM.name = "singapura-luz-no-chao"; soDeNoite(tr, add(pocasIM)); pocasIM.userData.semContato = true;
  // ---- as luzes de verdade: ficam sempre na cena (de dia, apagadas), indo para os postes mais perto do carro ----
  const luzes = [];
  for (let j = 0; j < LUZES; j++) { const l = new THREE.SpotLight(0xfff0d0, 0, ALCANCE, 0.8, 0.85, 1); l.name = "singapura-luz-refletor"; add(l); add(l.target); luzes.push(l); }
  tr.luzesRefletores = luzes.flatMap((l) => [l, l.target]);
  const alvos = postes.map((t) => ({ t, cabeca: [t.x - t.nx * t.lado * 17, t.y + alto - 3, t.z - t.ny * t.lado * 17], alvo: [t.x - t.nx * t.lado * (W / 2 + 40), t.ph, t.z - t.ny * t.lado * (W / 2 + 40)], d: 0 }));
  luzDaNoite(tr).quadro.push((noite, foco) => {
    if (!noite || !foco) { for (const l of luzes) l.intensity = 0; return; }
    hemi.intensity = HEMI_NOITE;
    for (const p of alvos) p.d = Math.hypot(p.alvo[0] - foco.x, p.alvo[2] - foco.y);
    alvos.sort((a, b) => a.d - b.d);
    const limite = alvos[LUZES]?.d ?? Infinity;
    luzes.forEach((l, j) => { const p = alvos[j]; if (!p) { l.intensity = 0; return; } l.position.set(...p.cabeca); l.target.position.set(...p.alvo); l.intensity = FORCA * Math.min(1, (limite - p.d) / FAIXA); });
  });
  tr.refletoresSG = { postes: postes.length };
  void treliças; void lampadas;
  return postes.length;
}
