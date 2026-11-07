// Monta o piloto da festa do pódio do GP (public/corrida/f1/podio/): roda uma vez, na máquina de quem tem os arquivos originais.
//   node ferramentas/podio-pilotos.mjs <pasta com o race_car_driver.glb e os FBX do Mixamo> <capacete.glb, de dentro do zip> <pasta do pacote meshoptimizer>
// Sai:
//   piloto.glb   o corpo do race_car_driver (sem a cabeça com rosto) ligado a um esqueleto do Mixamo, mais o capacete reduzido, sem os decalques de marca
//   clipes.json  as comemorações (só rotação dos ossos e a altura do quadril, sem os dedos)
//   traje-*.webp e luvas-*.webp: a sombra (dobras) e a máscara (faixas) das folhas originais, sem os logos, que o jogo pinta por equipe (f1-uniformes.js)
// O corpo vem em peças separadas, numa pose em A: cada peça vira um osso, e as pontas das peças se misturam com o osso vizinho para a junta não abrir.
// Os clipes do Mixamo guardam a rotação de cada osso a partir da pose em T dele; aqui o osso nasce com a mesma orientação, só girado até a direção do
// membro do boneco, então as trilhas valem sem nenhuma conta na hora de jogar.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const raiz = path.dirname(require.resolve("three"));
const imp = (p) => import(pathToFileURL(path.join(raiz, p)).href);
const THREE = await imp("../build/three.module.js");
const { FBXLoader } = await imp("../examples/jsm/loaders/FBXLoader.js");
const { GLTFExporter } = await imp("../examples/jsm/exporters/GLTFExporter.js");
const { mergeVertices } = await imp("../examples/jsm/utils/BufferGeometryUtils.js");
const [pastaOrig, arqCapacete, pastaMeshopt] = process.argv.slice(2);
if (!pastaMeshopt) { console.error("Uso: node ferramentas/podio-pilotos.mjs <pasta dos originais> <capacete.glb> <pasta do meshoptimizer>"); process.exit(1); }
const { MeshoptSimplifier } = await import(pathToFileURL(path.join(pastaMeshopt, "meshopt_simplifier.js")).href);
await MeshoptSimplifier.ready;
const SAIDA = "public/corrida/f1/podio";
fs.mkdirSync(SAIDA, { recursive: true });
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); this.onload?.({ target: this }); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = "data:application/octet-stream;base64," + Buffer.from(r).toString("base64"); this.onloadend?.(); }); } };

// ---------- lê um GLB (sem carregar as imagens, que aqui não servem) ----------
function lerGLB(f) {
  const b = fs.readFileSync(f), n = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + n).toString("utf8")), bin = b.slice(20 + n + 8);
  const TAM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const acc = (i) => {
    const a = j.accessors[i], v = j.bufferViews[a.bufferView], c = TAM[a.type], Tipo = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    const off = (v.byteOffset || 0) + (a.byteOffset || 0), st = v.byteStride || c * Tipo.BYTES_PER_ELEMENT, out = new Float64Array(a.count * c);
    const ler = { 5126: (o) => bin.readFloatLE(o), 5125: (o) => bin.readUInt32LE(o), 5123: (o) => bin.readUInt16LE(o), 5121: (o) => bin.readUInt8(o) }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let q = 0; q < c; q++) out[k * c + q] = ler(off + k * st + q * Tipo.BYTES_PER_ELEMENT);
    return out;
  };
  const pecas = [];
  const anda = (i, pai, topo) => {
    const no = j.nodes[i], m = new THREE.Matrix4();
    if (no.matrix) m.fromArray(no.matrix);
    else m.compose(new THREE.Vector3(...(no.translation || [0, 0, 0])), new THREE.Quaternion(...(no.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(no.scale || [1, 1, 1])));
    m.premultiply(pai);
    const nomeTopo = topo || no.name;
    if (no.mesh != null) for (const p of j.meshes[no.mesh].primitives) {
      const pos = acc(p.attributes.POSITION), nor = p.attributes.NORMAL != null ? acc(p.attributes.NORMAL) : null, uv = p.attributes.TEXCOORD_0 != null ? acc(p.attributes.TEXCOORD_0) : null;
      const idx = p.indices != null ? acc(p.indices) : Float64Array.from({ length: pos.length / 3 }, (_, k) => k);
      if (m.determinant() < 0) for (let k = 0; k + 2 < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } // escala negativa: a face vira do avesso
      const nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3();
      for (let k = 0; k < pos.length; k += 3) { v.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(m); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z; if (nor) { v.set(nor[k], nor[k + 1], nor[k + 2]).applyMatrix3(nm).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z; } }
      pecas.push({ no: no.name, topo: nomeTopo, mat: p.material != null ? j.materials[p.material].name : null, pos, nor, uv, idx });
    }
    for (const c of no.children || []) anda(c, m, nomeTopo);
  };
  for (const r of j.scenes[0].nodes) anda(r, new THREE.Matrix4(), null);
  return pecas;
}

// ---------- o corpo: as peças, em metros, com os pés no chão e de frente para +z ----------
const orig = lerGLB(path.join(pastaOrig, "race_car_driver_-_low_poly.glb"));
const piso = -2.22, topoH = 2.12, ESC = 1.8 / (topoH - piso), Z0 = 0.2;
for (const p of orig) for (let k = 0; k < p.pos.length; k += 3) { p.pos[k] *= ESC; p.pos[k + 1] = (p.pos[k + 1] - piso) * ESC; p.pos[k + 2] = (p.pos[k + 2] - Z0) * ESC; }
const peca = (n) => orig.find((p) => p.no === n);
const verts = (p) => { const o = []; for (let k = 0; k < p.pos.length; k += 3) o.push(new THREE.Vector3(p.pos[k], p.pos[k + 1], p.pos[k + 2])); return o; };
const media = (l) => l.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(l.length);
// a junta entre duas peças: o meio dos pontos de B que estão mais perto de A
function anel(a, b) {
  const va = verts(a), vb = verts(b).map((v) => ({ v, d: Math.min(...va.map((u) => u.distanceTo(v))) })).sort((x, y) => x.d - y.d);
  return media(vb.slice(0, Math.max(3, Math.ceil(vb.length * 0.25))).map((x) => x.v.clone()));
}
const longe = (p, de, frac) => { const vs = verts(p).map((v) => ({ v, d: v.distanceTo(de) })), mx = Math.max(...vs.map((x) => x.d)); return media(vs.filter((x) => x.d >= mx * frac).map((x) => x.v.clone())); };
const MAPA = { Object_14: "LeftHand", Object_16: "LeftForeArm", Object_18: "LeftArm", Object_20: "RightHand", Object_22: "RightForeArm", Object_24: "RightArm", Object_26: "Spine2", Object_28: "Spine2", Object_30: "Spine1", Object_32: "LeftFoot", Object_34: "LeftLeg", Object_36: "LeftUpLeg", Object_38: "RightFoot", Object_40: "RightLeg", Object_42: "RightUpLeg", Object_44: "Hips" };

// as juntas, do lado esquerdo do boneco (+x); o direito é o espelho
const P = {};
const cotovelo = anel(peca("Object_18"), peca("Object_16")), pulso = anel(peca("Object_16"), peca("Object_14"));
const ombro = longe(peca("Object_18"), cotovelo, 0.85), joelho = anel(peca("Object_36"), peca("Object_34")), tornozelo = anel(peca("Object_34"), peca("Object_32"));
const quadrilE = longe(peca("Object_36"), joelho, 0.88), ponta = longe(peca("Object_14"), pulso, 0.75), dedoPe = (() => { const vs = verts(peca("Object_32")), z = Math.max(...vs.map((v) => v.z)); return media(vs.filter((v) => v.z > z - 0.08 * 1)); })();
const hipY = quadrilE.y + 0.04, neckY = (1.42 - piso) * ESC, headY = (1.56 - piso) * ESC, zC = (quadrilE.z + ombro.z) / 2;
P.Hips = new THREE.Vector3(0, hipY, zC);
for (const [n, f] of [["Spine", 0.19], ["Spine1", 0.41], ["Spine2", 0.66]]) P[n] = new THREE.Vector3(0, THREE.MathUtils.lerp(hipY, neckY, f), zC);
P.Neck = new THREE.Vector3(0, neckY, ombro.z + 0.01); P.Head = new THREE.Vector3(0, headY, (0.2 - Z0) * ESC + 0.02);
const lado = (n, v) => { P["Left" + n] = v.clone(); P["Right" + n] = new THREE.Vector3(-v.x, v.y, v.z); };
lado("Shoulder", new THREE.Vector3(ombro.x * 0.35, ombro.y - 0.01, ombro.z)); lado("Arm", ombro); lado("ForeArm", cotovelo); lado("Hand", pulso);
lado("UpLeg", quadrilE); lado("Leg", joelho); lado("Foot", tornozelo); lado("ToeBase", dedoPe);
const fim = { LeftHand: ponta, RightHand: new THREE.Vector3(-ponta.x, ponta.y, ponta.z) }; // para onde a mão aponta

// ---------- o esqueleto: a hierarquia e a orientação de repouso do Mixamo, nas juntas do boneco ----------
const lerFBX = (f) => { const b = fs.readFileSync(f); return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ""); };
const CLIPES = { palmas: "Clapping.fbx", torcida: "Rallying.fbx", vitoria: "Victory.fbx", vitoria2: "Victory (1).fbx" };
const fbxBase = lerFBX(path.join(pastaOrig, "Clapping.fbx"));
fbxBase.updateMatrixWorld(true);
const ossoFBX = {}; fbxBase.traverse((o) => { if (o.isBone) ossoFBX[o.name.replace("mixamorig", "")] = o; });
const NOMES = Object.keys(P);
const qRep = (n) => ossoFBX[n].getWorldQuaternion(new THREE.Quaternion()), pRep = (n) => ossoFBX[n].getWorldPosition(new THREE.Vector3());
const FILHO = { Shoulder: "Arm", Arm: "ForeArm", ForeArm: "Hand", UpLeg: "Leg", Leg: "Foot", Foot: "ToeBase" };
const qBind = {};
for (const n of NOMES) {
  const m = /^(Left|Right)(.+)$/.exec(n);
  let R = new THREE.Quaternion();
  if (m && FILHO[m[2]]) { const c = m[1] + FILHO[m[2]]; R.setFromUnitVectors(pRep(c).sub(pRep(n)).normalize(), P[c].clone().sub(P[n]).normalize()); }
  else if (m && m[2] === "Hand") R.setFromUnitVectors(pRep(m[1] + "HandMiddle1").sub(pRep(n)).normalize(), fim[n].clone().sub(P[n]).normalize());
  else if (m && m[2] === "ToeBase") { const f = m[1] + "Foot"; R.setFromUnitVectors(pRep(n).sub(pRep(f)).normalize(), P[n].clone().sub(P[f]).normalize()); }
  qBind[n] = R.multiply(qRep(n));
}
const ossos = {}; for (const n of NOMES) { const b = new THREE.Bone(); b.name = n; ossos[n] = b; }
const paiDe = (n) => { let o = ossoFBX[n].parent; while (o && !o.isBone) o = o.parent; return o ? o.name.replace("mixamorig", "") : null; };
const PAI = {};
const raizEsq = new THREE.Group(); raizEsq.name = "piloto";
for (const n of NOMES) {
  const p = paiDe(n); PAI[n] = p;
  if (p) { ossos[p].add(ossos[n]); ossos[n].position.copy(P[n]).sub(P[p]).applyQuaternion(qBind[p].clone().invert()); ossos[n].quaternion.copy(qBind[p].clone().invert().multiply(qBind[n])); }
  else { raizEsq.add(ossos[n]); ossos[n].position.copy(P[n]); ossos[n].quaternion.copy(qBind[n]); }
}
raizEsq.updateMatrixWorld(true);
const LISTA = NOMES.map((n) => ossos[n]), IDX = Object.fromEntries(NOMES.map((n, i) => [n, i]));
const esqueleto = new THREE.Skeleton(LISTA);

// ---------- os pesos ----------
const R_JUNTA = 0.09;
function pesosDe(v, osso, no) {
  const p = {}; const soma = (n, w) => { if (w > 0) p[n] = (p[n] || 0) + w; };
  if (no === "Object_30") { const t = THREE.MathUtils.clamp((v.y - P.Hips.y) / (P.Spine1.y - P.Hips.y), 0, 1); if (t < 0.5) { soma("Hips", 1 - t * 2); soma("Spine", t * 2); } else { soma("Spine", 2 - t * 2); soma("Spine1", t * 2 - 1); } }
  else if (no === "Object_26" || no === "Object_28") {
    const t = THREE.MathUtils.clamp((v.y - P.Spine1.y) / (P.Spine2.y - P.Spine1.y), 0, 1); soma("Spine1", 1 - t); soma("Spine2", t);
    const dx = Math.abs(v.x) - Math.abs(P.LeftShoulder.x); if (no === "Object_26" && dx > 0 && v.y > P.Spine2.y) { const k = Math.min(0.5, dx / 0.1 * 0.5); for (const q of Object.keys(p)) p[q] *= 1 - k; soma((v.x > 0 ? "Left" : "Right") + "Shoulder", k); }
  } else if (no === "Object_44") { const t = THREE.MathUtils.clamp((v.y - P.Hips.y) / (P.Spine.y - P.Hips.y), 0, 1); soma("Hips", 1 - t * 0.5); soma("Spine", t * 0.5); }
  else {
    soma(osso, 1);
    const pai = PAI[osso], dp = v.distanceTo(P[osso]);
    if (pai && dp < R_JUNTA) { const k = 0.5 * (1 - dp / R_JUNTA); p[osso] -= k; soma(pai, k); }
    const m = /^(Left|Right)(.+)$/.exec(osso), f = m && FILHO[m[2]] ? m[1] + FILHO[m[2]] : null;
    if (f && m[2] !== "Foot") { const d = v.distanceTo(P[f]); if (d < R_JUNTA) { const k = 0.5 * (1 - d / R_JUNTA); p[osso] -= k; soma(f, k); } }
    if (m && m[2] === "Foot" && v.z > P[f].z - 0.04) { const w = p[osso]; delete p[osso]; soma(f, w); }
  }
  const l = Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 4), t = l.reduce((s, x) => s + x[1], 0);
  return l.map(([n, w]) => [IDX[n], w / t]);
}
function geoSkin(pecas, comUV = true) {
  const pos = [], nor = [], uv = [], si = [], sw = [], idx = []; let base = 0;
  for (const p of pecas) {
    const vs = verts(p);
    vs.forEach((v, k) => {
      pos.push(v.x, v.y, v.z); nor.push(p.nor[k * 3], p.nor[k * 3 + 1], p.nor[k * 3 + 2]); if (comUV) uv.push(p.uv[k * 2], p.uv[k * 2 + 1]);
      const w = pesosDe(v, MAPA[p.no], p.no); for (let q = 0; q < 4; q++) { si.push(w[q] ? w[q][0] : 0); sw.push(w[q] ? w[q][1] : 0); }
    });
    for (const i of p.idx) idx.push(i + base); base += vs.length;
  }
  return montarGeo(pos, nor, comUV ? uv : null, si, sw, idx);
}
function montarGeo(pos, nor, uv, si, sw, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx); return g;
}
const mesh = (nome, geo) => { const m = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ name: nome, color: 0xffffff })); m.name = nome; raizEsq.add(m); m.bind(esqueleto, new THREE.Matrix4()); return m; };
const doMat = (m) => orig.filter((p) => p.mat === m && MAPA[p.no]);
mesh("traje", geoSkin(doMat("RT_DriverSuit")));
mesh("luvas", geoSkin(doMat("RT_Gloves")));
mesh("hans", geoSkin(doMat("RT_HANS"), false));

// ---------- o capacete: casco num pedaço só (a pintura de verdade era feita de peças por cor), sem os decalques, reduzido e preso na cabeça ----------
const cap = lerGLB(arqCapacete);
// os materiais por papel. Os decalques de marca (malhas sem material, os Face.*) e as peças transparentes de enfeite ficam de fora.
const PAPEL = { casco: /^mat_(2|3|4|5|6|7|9|10|11|12|13|14)$/, vedacao: /^(mat_0|Material\.011|Material\.012|Material\.008)$/, metal: /^Material\.00[3456]$/, viseira: /^Material\.001$/ };
const ALVO = { casco: 3600, vedacao: 700, metal: 260, viseira: 300 };
const velhoH = orig.find((p) => p.mat === "RT_Helemt"), caixaVelha = new THREE.Box3().setFromArray(velhoH.pos);
const usados = cap.filter((p) => p.mat && !/^Face/.test(p.no) && p.no !== "Compound.038"); // (a Compound.038 é a cópia do INTERNO)
const cx = new THREE.Box3(); for (const p of usados.filter((q) => PAPEL.casco.test(q.mat))) cx.union(new THREE.Box3().setFromArray(p.pos));
const tamN =cx.getSize(new THREE.Vector3()), tamV = caixaVelha.getSize(new THREE.Vector3()), escCap = tamV.x * 0.98 / tamN.x, cN = cx.getCenter(new THREE.Vector3()), cV = caixaVelha.getCenter(new THREE.Vector3());
for (const [papel, re] of Object.entries(PAPEL)) {
  const lista = usados.filter((p) => re.test(p.mat));
  const pos = [], idx = []; let base = 0;
  // o forro encolhe um pouco: reduzido, ele vazaria por fora do casco
  const enc = papel === "vedacao" ? 0.93 : 1;
  for (const p of lista) { for (let k = 0; k < p.pos.length; k += 3) pos.push((p.pos[k] - cN.x) * escCap * enc + cV.x, (p.pos[k + 1] - cN.y) * escCap * enc + cV.y, (p.pos[k + 2] - cN.z) * escCap * enc + cV.z); for (const i of p.idx) idx.push(i + base); base += p.pos.length / 3; }
  let g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g = mergeVertices(g, 2e-4);
  const posW = g.attributes.position.array, ind = new Uint32Array(g.index.array);
  // (as peças de cor não são soldadas umas às outras: o "sloppy" junta por proximidade e chega ao alvo sem ficar preso nas bordas)
  const [novo] = MeshoptSimplifier.simplifySloppy(ind, posW, 3, null, Math.min(ALVO[papel] * 3, ind.length), 0.03);
  // tira os vértices que sobraram e refaz as normais
  const mapa = new Map(), p2 = [], i2 = [];
  for (const v of novo) { if (!mapa.has(v)) { mapa.set(v, mapa.size); p2.push(posW[v * 3], posW[v * 3 + 1], posW[v * 3 + 2]); } i2.push(mapa.get(v)); }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(p2, 3)); g2.setIndex(i2); g2.computeVertexNormals();
  const n = p2.length / 3, si = new Array(n * 4).fill(0), sw = new Array(n * 4).fill(0); for (let v = 0; v < n; v++) { si[v * 4] = IDX.Head; sw[v * 4] = 1; }
  const final = montarGeo(p2, Array.from(g2.attributes.normal.array), null, si, sw, i2);
  mesh(papel, final);
  console.log(papel, lista.length, "peças,", (idx.length / 3) | 0, "→", (i2.length / 3) | 0, "triângulos");
}

// ---------- as comemorações ----------
const r3 = (v) => Math.round(v * 1000) / 1000, r4 = (v) => Math.round(v * 10000) / 10000;
const escQuadril = P.Hips.y / pRep("Hips").y; // as trilhas do quadril estão em cm, na altura do Mixamo
const clipes = {};
const pes = ["LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase"].map((n) => ossos[n]);
for (const [id, arq] of Object.entries(CLIPES)) {
  const clip = lerFBX(path.join(pastaOrig, arq)).animations[0];
  const tracks = [];
  for (const t of clip.tracks) {
    const [o, prop] = t.name.split("."), n = o.replace("mixamorig", "");
    if (!ossos[n] || prop === "scale" || (prop === "position" && n !== "Hips")) continue;
    const c = prop === "position" ? 3 : 4, T = [], V = [];
    for (let k = 0; k < t.times.length; k += 2) { T.push(r3(t.times[k])); for (let q = 0; q < c; q++) V.push(t.values[k * c + q]); }
    tracks.push({ n, p: prop === "position" ? "p" : "q", t: T, v: V });
  }
  // o quadril: a altura na escala do boneco; o andar para os lados fica preso no primeiro quadro (ele não sai do degrau)
  const h = tracks.find((t) => t.p === "p");
  if (h) { const x0 = h.v[0], z0 = h.v[2]; for (let i = 0; i < h.v.length; i += 3) { h.v[i] = (h.v[i] - x0) * escQuadril * 0.15; h.v[i + 1] *= escQuadril; h.v[i + 2] = (h.v[i + 2] - z0) * escQuadril * 0.15 + P.Hips.z; } }
  // os pés no chão: mede o pé mais baixo do clipe inteiro e desce (ou sobe) o quadril
  const trilhas = tracks.map((t) => (t.p === "q" ? new THREE.QuaternionKeyframeTrack(t.n + ".quaternion", t.t, t.v) : new THREE.VectorKeyframeTrack(t.n + ".position", t.t, t.v)));
  const mx = new THREE.AnimationMixer(raizEsq), ac = mx.clipAction(new THREE.AnimationClip(id, clip.duration, trilhas)); ac.play();
  let chao = 1e9; const vv = new THREE.Vector3();
  for (let s = 0; s <= 60; s++) { mx.setTime(clip.duration * s / 60); raizEsq.updateMatrixWorld(true); for (const b of pes) chao = Math.min(chao, b.getWorldPosition(vv).y); }
  ac.stop(); mx.uncacheRoot(raizEsq);
  const sola = Math.min(P.LeftFoot.y, P.LeftToeBase.y) - 0; // o quanto o osso do pé fica acima da sola, na pose de repouso
  const ajuste = chao - sola; for (let i = 1; h && i < h.v.length; i += 3) h.v[i] -= ajuste;
  for (const t of tracks) t.v = t.v.map(t.p === "q" ? r4 : r3);
  clipes[id] = { dur: r3(clip.duration), tracks };
  console.log(id, clip.duration.toFixed(2) + "s,", tracks.length, "trilhas, ajuste do chão", ajuste.toFixed(3));
}
// volta o esqueleto para a pose de ligação antes de salvar
for (const n of NOMES) { const p = PAI[n]; if (p) { ossos[n].position.copy(P[n]).sub(P[p]).applyQuaternion(qBind[p].clone().invert()); ossos[n].quaternion.copy(qBind[p].clone().invert().multiply(qBind[n])); } else { ossos[n].position.copy(P[n]); ossos[n].quaternion.copy(qBind[n]); } }
raizEsq.updateMatrixWorld(true);
fs.writeFileSync(path.join(SAIDA, "clipes.json"), JSON.stringify(clipes));
const glb = await new GLTFExporter().parseAsync(raizEsq, { binary: true, onlyVisible: false });
fs.writeFileSync(path.join(SAIDA, "piloto.glb"), Buffer.from(glb));
console.log("piloto.glb", (glb.byteLength / 1024) | 0, "KB; clipes.json", (fs.statSync(path.join(SAIDA, "clipes.json")).size / 1024) | 0, "KB");
console.log("juntas", JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.toArray().map(r3)]))));

// ---------- as folhas: a sombra e a máscara, sem os logos, pelo Chrome (que decodifica o PNG e grava WebP) ----------
const { chromium } = require("playwright");
const texDe = (mat) => { const b = fs.readFileSync(path.join(pastaOrig, "race_car_driver_-_low_poly.glb")), n = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + n).toString("utf8")), bin = b.slice(20 + n + 8), m = j.materials.find((x) => x.name === mat), im = j.images[j.textures[m.pbrMetallicRoughness.baseColorTexture.index].source], v = j.bufferViews[im.bufferView]; return "data:image/png;base64," + bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength).toString("base64"); };
const nav = await chromium.launch({ channel: "chrome", headless: true }), pag = await nav.newPage();
const folhas = await pag.evaluate(async ({ traje, luvas }) => {
  const abrir = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
  const tela = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const out = {};
  // o macacão: R é a sombra (vermelho, branco e cinza guardam a luz no R); G/R diz o que é faixa (branco) e o que é o fundo vermelho
  { const i = await abrir(traje), W = i.width, H = i.height, c = tela(W, H), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, W, H), s = new Float32Array(W * H), m = new Float32Array(W * H);
    for (let k = 0; k < W * H; k++) { const r = d.data[k * 4], g = d.data[k * 4 + 1]; s[k] = r; m[k] = r > 12 ? Math.min(1, g / r) : 0; }
    // os logos: cada retângulo é refeito pela interpolação das bordas (por coluna, de cima a baixo), então a linha da costura e a faixa continuam
    for (const [x0, y0, x1, y1] of [[232, 334, 432, 370], [776, 84, 816, 240], [778, 770, 818, 930], [168, 440, 214, 470], [462, 436, 504, 472]]) {
      for (let a = x0; a <= x1; a++) for (let b = y0 + 1; b < y1; b++) { const t = (b - y0) / (y1 - y0), k = b * W + a; s[k] = s[y0 * W + a] * (1 - t) + s[y1 * W + a] * t; m[k] = m[y0 * W + a] * (1 - t) + m[y1 * W + a] * t; }
    }
    const cs = tela(W, H), xs = cs.getContext("2d"), ds = xs.createImageData(W, H), cm = tela(W, H), xm = cm.getContext("2d"), dm = xm.createImageData(W, H);
    for (let k = 0; k < W * H; k++) { const v = s[k]; ds.data[k * 4] = ds.data[k * 4 + 1] = ds.data[k * 4 + 2] = v; ds.data[k * 4 + 3] = 255; dm.data[k * 4] = dm.data[k * 4 + 1] = dm.data[k * 4 + 2] = 255; dm.data[k * 4 + 3] = m[k] * 255; }
    xs.putImageData(ds, 0, 0); xm.putImageData(dm, 0, 0);
    out.trajeSombra = cs.toDataURL("image/webp", 0.72); out.trajeMascara = cm.toDataURL("image/webp", 0.72); }
  // as luvas: pequenas na tela, então 256 px bastam, e a redução apaga as letras e as estrelas. A máscara é o que era vermelho (vira a cor da equipe)
  { const i = await abrir(luvas), W = 256, H = 128, c = tela(W, H), x = c.getContext("2d", { willReadFrequently: true }); x.filter = "blur(1.2px)"; x.drawImage(i, 0, 0, W, H); const d = x.getImageData(0, 0, W, H);
    const cs = tela(W, H), xs = cs.getContext("2d"), ds = xs.createImageData(W, H), cm = tela(W, H), xm = cm.getContext("2d"), dm = xm.createImageData(W, H);
    for (let k = 0; k < W * H; k++) { const r = d.data[k * 4], g = d.data[k * 4 + 1], b = d.data[k * 4 + 2], lum = Math.max(r, g, b), ver = Math.min(1, Math.max(0, (r - Math.max(g, b)) / 70)), azul = Math.min(1, Math.max(0, (b - r) / 50)); ds.data[k * 4] = ds.data[k * 4 + 1] = ds.data[k * 4 + 2] = Math.min(255, lum * (ver > 0.5 ? 1.5 : 1) * (azul > 0.5 ? 0.3 : 1)); ds.data[k * 4 + 3] = 255; dm.data[k * 4] = dm.data[k * 4 + 1] = dm.data[k * 4 + 2] = 255; dm.data[k * 4 + 3] = Math.max(ver, azul) * 255; }
    xs.putImageData(ds, 0, 0); xm.putImageData(dm, 0, 0);
    out.luvasSombra = cs.toDataURL("image/webp", 0.75); out.luvasMascara = cm.toDataURL("image/webp", 0.75); }
  return out;
}, { traje: texDe("RT_DriverSuit"), luvas: texDe("RT_Gloves") });
await nav.close();
for (const [nome, arq] of [["trajeSombra", "traje-sombra.webp"], ["trajeMascara", "traje-mascara.webp"], ["luvasSombra", "luvas-sombra.webp"], ["luvasMascara", "luvas-mascara.webp"]]) { const b = Buffer.from(folhas[nome].split(",")[1], "base64"); fs.writeFileSync(path.join(SAIDA, arq), b); console.log(arq, (b.length / 1024) | 0, "KB"); }
