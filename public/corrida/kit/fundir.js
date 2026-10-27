// Kit de pista — junta as malhas paradas do cenário. A pista monta o cenário peça por peça (cada caixa, cada poste, cada
// fachada é uma malha com o seu material) e o navegador paga uma chamada de desenho por malha, em Mônaco passa de 900.
// Aqui, depois de tudo montado:
//   1. os materiais iguais (mesma cor, textura, brilho...) viram um só;
//   2. as malhas paradas que usam o mesmo material, as mesmas sombras e ficam na mesma região viram uma malha só;
//   3. o que sobrou parado deixa de ter a matriz recalculada a cada quadro.
// Fica de fora, intacto, o que mexe: tudo que o resto do jogo guarda em `tr` (portais, cones, pórtico, boxes...), o que as
// animações de vida.js e dos GPs movem (descoberto rodando a animação por alguns segundos em vários pontos da volta,
// porque o que um GP guarda dentro de uma função não aparece em `tr`), e o que é transparente ou espelhado. A malha com
// vários materiais (a caixa com um material por face) primeiro vira uma malha por material. Instâncias (InstancedMesh) já são uma chamada só, mas as que se espalham pela volta inteira (cerca, painéis, fachadas,
// árvores) tinham uma esfera de corte do tamanho do mundo e nunca saíam da tela: viram um InstancedMesh por região.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const hex = (c) => (c && c.isColor ? c.getHex() : 0);
// tudo que muda o desenho de um material, para saber se dois são o mesmo
function assinatura(m) {
  return [m.type, hex(m.color), hex(m.emissive), m.emissiveIntensity, m.roughness, m.metalness, m.side, m.transparent, m.opacity, m.flatShading, m.vertexColors, m.fog, m.depthWrite, m.depthTest,
    m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.wireframe, m.toneMapped, m.blending, m.alphaTest, m.map?.uuid, m.emissiveMap?.uuid, m.alphaMap?.uuid, m.normalMap?.uuid, m.roughnessMap?.uuid, m.envMapIntensity].join("|");
}
const atributos = (g) => Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? "n" : "")).join(",") + (g.index ? "|i" : "|-");

export function fundirEstaticos(tr, { simular = null, celula = 1600, tamanhoMax = 900, celulaInst = 2400 } = {}) {
  const grp = tr.grp, stats = { malhasAntes: 0, malhasDepois: 0, materiaisAntes: 0, materiaisDepois: 0 };
  grp.updateMatrixWorld(true);
  // ---- o que não pode mudar ----
  const guardados = new Set(), matGuardados = new Set(), visto = new Set();
  const proteger = (o) => o.traverse((x) => { guardados.add(x); for (const m of [].concat(x.material || [])) matGuardados.add(m); });
  const varrer = (v, prof) => {
    if (!v || typeof v !== "object" || visto.has(v) || prof > 7 || v === grp) return;
    visto.add(v);
    if (v.isObject3D) { proteger(v); return; }
    if (v.isMaterial) { matGuardados.add(v); return; }
    if (v.isTexture || v.isBufferGeometry || v.isColor || v.isVector3 || ArrayBuffer.isView(v)) return;
    if (v instanceof Map || v instanceof Set) { for (const x of v.values()) varrer(x, prof + 1); return; }
    for (const k of Object.keys(v)) varrer(v[k], prof + 1);
  };
  for (const k of Object.keys(tr)) if (!["grp", "pts", "t", "look", "theme", "mini"].includes(k)) varrer(tr[k], 0);
  // o que se mexe sem estar em `tr`: roda a animação e vê quem mudou de lugar, de tamanho ou de visibilidade
  if (simular) {
    const tira = (o) => `${o.instanceMatrix ? o.instanceMatrix.version : 0},${o.position.x},${o.position.y},${o.position.z},${o.quaternion.x},${o.quaternion.y},${o.quaternion.z},${o.quaternion.w},${o.scale.x},${o.scale.y},${o.scale.z},${o.visible}`;
    const antes = new Map(); grp.traverse((o) => antes.set(o, tira(o)));
    simular();
    grp.traverse((o) => { if (antes.has(o) && antes.get(o) !== tira(o)) proteger(o); });
  }
  // quem tem um antepassado que se mexe também não pode ser fundido
  const parado = (o) => { for (let p = o; p && p !== grp; p = p.parent) if (guardados.has(p)) return false; return true; };

  // ---- 0. a malha com vários materiais (a caixa de 6 faces com um material em cada) vira uma malha por material ----
  const multis = []; grp.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && Array.isArray(o.material) && o.geometry.index && o.geometry.groups.length && o.visible && parado(o) && !o.material.some((m) => matGuardados.has(m))) multis.push(o); });
  for (const o of multis) {
    const g = o.geometry, ind = g.index.array, pai = o.parent;
    for (const gr of g.groups) {
      const mat = o.material[gr.materialIndex]; if (!mat || !gr.count) continue;
      const novo = new Map(), indice = [];
      for (let i = gr.start; i < gr.start + gr.count; i++) { const v = ind[i]; if (!novo.has(v)) novo.set(v, novo.size); indice.push(novo.get(v)); }
      const sub = new THREE.BufferGeometry();
      for (const [nome, a] of Object.entries(g.attributes)) {
        const arr = new a.array.constructor(novo.size * a.itemSize);
        for (const [v, j] of novo) for (let c = 0; c < a.itemSize; c++) arr[j * a.itemSize + c] = a.array[v * a.itemSize + c];
        sub.setAttribute(nome, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
      }
      sub.setIndex(indice);
      const m = new THREE.Mesh(sub, mat); m.name = o.name; m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); m.castShadow = o.castShadow; m.receiveShadow = o.receiveShadow; m.renderOrder = o.renderOrder; m.frustumCulled = o.frustumCulled; m.layers.mask = o.layers.mask;
      pai.add(m);
    }
    o.removeFromParent();
  }
  grp.updateMatrixWorld(true);
  // ---- 1. materiais iguais viram um só ----
  const canonico = new Map(), todos = new Set();
  grp.traverse((o) => { if (o.isMesh || o.isInstancedMesh) for (const m of [].concat(o.material)) todos.add(m); });
  stats.materiaisAntes = todos.size;
  grp.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || matGuardados.has(o.material) || !parado(o)) return;
    const a = assinatura(o.material);
    if (!canonico.has(a)) canonico.set(a, o.material); else o.material = canonico.get(a);
  });

  // ---- 2. as malhas paradas do mesmo material viram uma só, por região ----
  const lotes = new Map(), caixa = new THREE.Box3(), esfera = new THREE.Sphere(), rel = new THREE.Matrix4(), inv = new THREE.Matrix4().copy(grp.matrixWorld).invert();
  const candidatas = [];
  grp.traverse((o) => {
    stats.malhasAntes += o.isMesh ? 1 : 0;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible || !parado(o)) return;
    const m = o.material, g = o.geometry;
    if (!g || !g.attributes.position || m.transparent || matGuardados.has(m) || Object.keys(g.morphAttributes).length) return;
    rel.multiplyMatrices(inv, o.matrixWorld); if (rel.determinant() <= 0) return; // espelhada: inverteria as faces
    if (!g.boundingBox) g.computeBoundingBox();
    caixa.copy(g.boundingBox).applyMatrix4(rel); caixa.getBoundingSphere(esfera);
    if (esfera.radius * 2 > tamanhoMax) return; // as fitas e o chão grandes ficam como estão (culling por pedaço)
    const chave = [m.uuid, o.castShadow, o.receiveShadow, o.name, o.renderOrder, o.frustumCulled, o.layers.mask, atributos(g), Math.floor(esfera.center.x / celula), Math.floor(esfera.center.z / celula)].join("#");
    if (!lotes.has(chave)) lotes.set(chave, []);
    lotes.get(chave).push({ o, m: rel.clone() });
    candidatas.push(o);
  });
  for (const lista of lotes.values()) {
    if (lista.length < 2) continue;
    const geos = lista.map(({ o, m }) => { const g = o.geometry.clone(); g.applyMatrix4(m); return g; });
    const junta = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!junta) continue;
    const base = lista[0].o, nova = new THREE.Mesh(junta, base.material);
    nova.name = base.name; nova.castShadow = base.castShadow; nova.receiveShadow = base.receiveShadow; nova.renderOrder = base.renderOrder; nova.frustumCulled = base.frustumCulled; nova.layers.mask = base.layers.mask;
    grp.add(nova);
    for (const { o } of lista) o.removeFromParent();
  }
  // ---- as instâncias espalhadas pela volta viram um InstancedMesh por região (para a tela e a sombra cortarem o que está longe) ----
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), cor = new THREE.Color(); let dividas = 0, instanciadasExtras = 0;
  // (só as pesadas, de 15 mil triângulos para cima: cortar as leves só trocaria triângulos de graça por chamadas de desenho caras)
  const triangulos = (m) => ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) * m.count;
  for (const m of grp.children.filter((o) => o.isInstancedMesh && o.count >= 24 && triangulos(o) >= 15000 && parado(o))) {
    const baldes = new Map();
    for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); v3.setFromMatrixPosition(m4).applyMatrix4(m.matrixWorld); const k = Math.floor(v3.x / celulaInst) + "#" + Math.floor(v3.z / celulaInst); if (!baldes.has(k)) baldes.set(k, []); baldes.get(k).push(i); }
    if (baldes.size < 2) continue;
    for (const ids of baldes.values()) {
      const nova = new THREE.InstancedMesh(m.geometry, m.material, ids.length);
      ids.forEach((i, j) => { m.getMatrixAt(i, m4); nova.setMatrixAt(j, m4); if (m.instanceColor) { m.getColorAt(i, cor); nova.setColorAt(j, cor); } });
      nova.name = m.name; nova.castShadow = m.castShadow; nova.receiveShadow = m.receiveShadow; nova.frustumCulled = m.frustumCulled; nova.renderOrder = m.renderOrder; nova.layers.mask = m.layers.mask;
      nova.instanceMatrix.needsUpdate = true; if (nova.instanceColor) nova.instanceColor.needsUpdate = true; nova.computeBoundingSphere();
      grp.add(nova);
    }
    m.removeFromParent(); dividas++; instanciadasExtras += baldes.size - 1;
  }
  stats.instanciadasDivididas = dividas;
  stats.instanciadasExtras = instanciadasExtras; // malhas extras intencionais: cada região pode sair do campo de visão sozinha
  // grupos que ficaram vazios saem
  const vazios = []; grp.traverse((o) => { if (o !== grp && o.isGroup && !o.children.length && parado(o)) vazios.push(o); });
  for (let k = 0; k < vazios.length; k++) { const p = vazios[k].parent; vazios[k].removeFromParent(); if (p && p !== grp && p.isGroup && !p.children.length && parado(p)) vazios.push(p); }

  // ---- 3. o que ficou parado não recalcula a matriz a cada quadro ----
  const congelar = (o) => {
    if (!parado(o)) return;
    o.updateMatrix(); o.matrixAutoUpdate = false;
    for (const c of o.children) congelar(c);
  };
  grp.updateMatrixWorld(true);
  for (const c of grp.children) {
    let dinamico = false; c.traverse((x) => { if (guardados.has(x)) dinamico = true; });
    if (dinamico) { for (const x of c.children) congelar(x); continue; }
    congelar(c); c.matrixWorldAutoUpdate = false; // a subárvore inteira é parada: nem desce nela
  }
  const finais = new Set(); grp.traverse((o) => { if (o.isMesh) { stats.malhasDepois++; for (const m of [].concat(o.material)) finais.add(m); } });
  stats.materiaisDepois = finais.size;
  tr.fundido = stats;
  return stats;
}
