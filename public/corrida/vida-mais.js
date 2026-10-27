// Corrida da Galera — mais coisas se mexendo pela volta inteira (completa vida.js): torcida espalhada pelas curvas,
// cata-ventos, roda-gigante, mastros com bandeira, helicóptero da TV seguindo a corrida, avião com rastro, barcos,
// um trem dando a volta ao longe, neve, bolas de feno e holofotes. Tudo enfeite: não bate em nada.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { canvasTex, M } from "./cena.js";

const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const RURAL = { interlagos: 1, serra: 1, deserto: 1, luigi: 1, sorvete: 1, nurburgring: 1, laguna: 1 }, CIDADE = { monaco: 1, rio: 1, losangeles: 1, tokyo: 1, luigi: 1 };
const PELE = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a", "#5a3520"], CAMISA = ["#ffd23f", "#e63946", "#1e88e5", "#43a047", "#ffffff", "#fb8c00", "#8e24aa", "#111111"];

export function enfeitarMais(tr, add, r, alturaEm, V) {
  const { pts, n, W, id } = tr, t = tr.t, comMuro = tr.wallLat < 1e9, borda = comMuro ? tr.wallLat : W / 2 + 30, C = t.world / 2;
  const lat = (p, l) => [p.x + p.nx * l, p.y + p.ny * l];
  const livre = (x, z, folga) => tr.distAt(x, z) > W / 2 + folga && x > -1200 && z > -1200 && x < t.world + 1200 && z < t.world + 1200 && !tr.noCorredor?.(x, z) && !(tr.ocupado && tr.ocupado(x, z));
  if (t.espaco) return enfeitarEspaco(tr, add, r, V);
  // torcida nas curvas: um grupo a cada ~1/9 da volta, do lado de fora (onde a ultrapassagem acontece)
  if (V.torcida) {
    const extra = [];
    for (let g = 1; g < 9; g++) {
      let i0 = Math.floor((n * g) / 9); for (let k = 0; k < n / 12 && !(pts[(i0 + k) % n].k > 1 / 300); k++) i0++; // procura a próxima curva
      const p0 = pts[i0 % n], q0 = pts[(i0 + 3) % n], fora = p0.tx * q0.ty - p0.ty * q0.tx > 0 ? -1 : 1;
      for (let i = i0; i < i0 + Math.floor(n * 0.012); i++) { const p = pts[i % n]; for (let fila = 0; fila < 2; fila++) {
        if (r() < 0.4) continue; const d = borda + 12 + fila * 8, [x, z] = lat(p, fora * d); if (tr.distAt(x, z) < borda + 4 || tr.noCorredor?.(x, z) || (tr.ocupado && tr.ocupado(x, z, i % n))) continue;
        extra.push({ x, y: alturaEm(x, z, i % n) + fila * 3, z, ry: Math.atan2(-p.nx * fora, -p.ny * fora), fase: r() * 6.3, ritmo: 5 + r() * 5, pula: r() < 0.6, pele: PELE[(r() * 5) | 0], camisa: (tr.camisasGP || CAMISA)[(r() * (tr.camisasGP || CAMISA).length) | 0] }); } }
    }
    V.torcidas = [montarTorcida(add, extra)];
  }
  // mastros com bandeira grande balançando, dos dois lados, pela volta toda
  const panos = [], corPano = ["#e63946", "#ffd23f", "#1e88e5", "#43a047", "#ff7ad9", "#ffffff"];
  for (let k = 0; k < 14; k++) {
    const i = Math.floor((n * (k + 0.5)) / 14), p = pts[i], s = k % 2 ? 1 : -1, [x, z] = lat(p, s * (borda + 10)); if (!livre(x, z, 20)) continue;
    const y = alturaEm(x, z, i), mastro = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 70, 6), M(0xc9ced6, { metalness: 0.5, roughness: 0.4 }))); mastro.position.set(x, y + 35, z);
    const geo = new THREE.PlaneGeometry(26, 15, 10, 4); geo.translate(13, 0, 0);
    const pano = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: corPano[k % corPano.length], side: THREE.DoubleSide, roughness: 0.8 }))); pano.position.set(x, y + 61, z); pano.rotation.y = r() * 6.3;
    panos.push({ pano, base: Float32Array.from(geo.attributes.position.array), fase: r() * 6 });
  }
  V.panos = panos;
  // cata-ventos nas pistas de campo, longe da pista, pela volta toda
  V.helices = [];
  if (RURAL[id]) for (let k = 0; k < 12; k++) {
    const i = Math.floor((n * k) / 12 + r() * 20) % n, p = pts[i], s = r() < 0.5 ? 1 : -1, d = borda + 160 + r() * 260, [x, z] = lat(p, s * d); if (!livre(x, z, 120)) continue;
    const y = alturaEm(x, z, i), g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = r() * 6.3;
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, 110, 8), M(0xf2f2f2, { roughness: 0.5 })); torre.position.y = 55; torre.castShadow = true; g.add(torre);
    const cubo = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), M(0xe6e6e6)); cubo.position.set(0, 110, 4); g.add(cubo);
    const helice = new THREE.Group(); helice.position.set(0, 110, 10); g.add(helice);
    for (let b = 0; b < 3; b++) { const pa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 52, 0.8), M(0xffffff)); pa.geometry.translate(0, 26, 0); pa.rotation.z = (b / 3) * Math.PI * 2; pa.castShadow = true; helice.add(pa); }
    V.helices.push({ helice, vel: 0.9 + r() * 0.6 });
  }
  // roda-gigante nas pistas de cidade (uma ou duas, girando devagar e com as cabines penduradas)
  V.rodas = [];
  if (CIDADE[id]) for (const f of id === "luigi" ? [0.55] : [0.3, 0.72]) {
    let feito = false;
    for (let tent = 0; tent < 30 && !feito; tent++) {
      const i = Math.floor(n * f + tent * 9) % n, p = pts[i], s = tent % 2 ? 1 : -1, [x, z] = lat(p, s * (borda + 150)); if (!livre(x, z, 110)) continue;
      const y = alturaEm(x, z, i), g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = Math.atan2(p.tx, p.ty) + Math.PI / 2;
      const aco = M(id === "tokyo" ? 0xff4fd8 : 0xf2f2f2, { metalness: 0.4, roughness: 0.4, emissive: id === "tokyo" ? 0x661a55 : 0 });
      // a roda é três malhas: as pernas (juntas numa), o aro com os raios (junto numa, gira com o grupo) e as 16 cabines num
      // InstancedMesh (cada uma continua de pé quando a roda gira: a matriz de cada uma sai de uma cadeia de apoio, fora da cena)
      const pernas = [];
      for (const sz of [-8, 8]) for (const sx of [-1, 1]) { const pe = new THREE.CylinderGeometry(1.6, 2, 104, 6); pe.rotateZ(sx * 0.3); pe.translate(sx * 30, 50, sz); pernas.push(pe); }
      g.add(new THREE.Mesh(mergeGeometries(pernas, false), aco));
      const roda = new THREE.Group(); roda.position.y = 100; g.add(roda);
      const aros = [], cores = [0xe63946, 0xffd23f, 0x1e88e5, 0x43a047, 0xff7ad9, 0xfb8c00];
      for (const sz of [-8, 8]) { const aro = new THREE.TorusGeometry(80, 1.6, 6, 48); aro.translate(0, 0, sz); aros.push(aro); }
      const raiz = new THREE.Object3D(), rodaH = new THREE.Object3D(), cabH = []; raiz.position.copy(g.position); raiz.rotation.copy(g.rotation); rodaH.position.y = 100; raiz.add(rodaH);
      const cabs = add(new THREE.InstancedMesh(new THREE.BoxGeometry(10, 10, 12), id === "tokyo" ? new THREE.MeshBasicMaterial({ color: 0xffffff }) : M(0xffffff), 16)); cabs.castShadow = false;
      for (let c = 0; c < 16; c++) {
        const a = (c / 16) * Math.PI * 2, raio = new THREE.BoxGeometry(1, 80, 1); raio.translate(0, 40, 0); raio.rotateZ(a); aros.push(raio);
        const h = new THREE.Object3D(); h.position.set(-Math.sin(a) * 80, Math.cos(a) * 80 - 6, 0); rodaH.add(h); cabH.push(h); cabs.setColorAt(c, new THREE.Color(cores[c % cores.length]));
      }
      roda.add(new THREE.Mesh(mergeGeometries(aros, false), aco));
      const W3 = { roda, rodaH, raiz, cabH, cabs, x: g.position.x, z: g.position.z }; V.rodas.push(W3); animarRoda(W3, 0, null); cabs.computeBoundingSphere(); feito = true;
    }
  }
  // helicóptero da TV: acompanha a corrida de lado, um pouco à frente (os GPs com vidaGP já têm o seu: kit/vida.js)
  if (!tr.heliGP) {
    const g = add(new THREE.Group()), corpo = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 10), M(0xf2f2f2, { metalness: 0.3, roughness: 0.3 })); corpo.scale.set(1, 0.8, 1.5); g.add(corpo);
    const vidro = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), M(0x27354a, { metalness: 0.6, roughness: 0.1 })); vidro.position.set(0, 2, 7); g.add(vidro);
    const cauda = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 26), M(0xe63946)); cauda.position.z = -20; g.add(cauda);
    const rotor = new THREE.Group(); rotor.position.y = 9; g.add(rotor);
    for (const a of [0, Math.PI / 2]) { const pa = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 2.4), M(0x222222)); pa.rotation.y = a; rotor.add(pa); }
    const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 1.6), M(0x222222)); rotor2.position.set(1.4, 2, -32); g.add(rotor2);
    for (const s of [-1, 1]) { const esqui = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 22), M(0x333333)); esqui.position.set(s * 6, -9, 0); g.add(esqui); }
    V.heli = { g, rotor, rotor2, x: C, y: 300, z: C };
  }
  // avião cruzando o céu de vez em quando, com o rastro branco atrás
  {
    const g = add(new THREE.Group()), corpo = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 60, 10), M(0xf4f4f4)); corpo.rotation.x = Math.PI / 2; g.add(corpo);
    const asa = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 12), M(0xdfe3ea)); g.add(asa);
    const leme = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 9), M(0xe63946)); leme.position.set(0, 7, -26); g.add(leme);
    const rastro = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.6, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    rastro.rotation.x = Math.PI / 2; g.add(rastro);
    for (const o of [corpo, asa, leme]) o.material.fog = false;
    V.aviao = { g, rastro, t: 99, dur: 40, ini: new THREE.Vector3(), fim: new THREE.Vector3(), noite: id === "tokyo" };
  }
  // trem dando a volta ao longe (um anel de trilho em volta de tudo)
  if (RURAL[id] || id === "losangeles") {
    const raio = t.world * 0.5 + 700, vag = [];
    const trilho = add(new THREE.Mesh(new THREE.TorusGeometry(raio, 3, 4, 160), M(0x55504a))); trilho.rotation.x = Math.PI / 2; trilho.position.set(C, -1, C);
    for (let k = 0; k < 9; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 40), M(k ? [0x1e5bc6, 0xe63946, 0x43a047, 0xffd23f][k % 4] : 0x222222)); v.castShadow = true; add(v); vag.push(v); }
    V.trem = { vag, raio, C, a: r() * 6 };
  }
  // barcos no mar (Mônaco e Rio), indo e vindo devagar
  V.barcos = [];
  if (id === "monaco" || id === "rio") {
    // os 8 barcos: casco e cabine numa geometria só (cores nos vértices) e a esteira de espuma, cada uma num InstancedMesh (2 chamadas de desenho em vez de 24)
    const casco = new THREE.BoxGeometry(46, 8, 14), cab = new THREE.BoxGeometry(18, 8, 10);
    casco.translate(0, 4, 0); cab.translate(-4, 11, 0);
    for (const [geo, cor] of [[casco, new THREE.Color(0xf7f7f7)], [cab, new THREE.Color(0x1f6fae)]]) geo.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: geo.attributes.position.count }, () => [cor.r, cor.g, cor.b]).flat(), 3));
    const esteiraGeo = new THREE.PlaneGeometry(90, 12); esteiraGeo.rotateX(-Math.PI / 2); esteiraGeo.translate(-66, 0.6, 0);
    const cascos = add(new THREE.InstancedMesh(mergeGeometries([casco, cab], false), M(0xffffff, { vertexColors: true }), 8)), esteiras = add(new THREE.InstancedMesh(esteiraGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }), 8));
    cascos.frustumCulled = esteiras.frustumCulled = false; cascos.castShadow = false;
    for (let k = 0; k < 8; k++) {
      const K = t.scale, x0 = id === "monaco" ? r() * t.world : (-200 + r() * 150) * K, z0 = id === "monaco" ? (1340 + r() * 300) * K : (300 + r() * 1100) * K;
      V.barcos.push({ k, cascos, esteiras, x: x0, z: z0, ang: id === "monaco" ? (r() < 0.5 ? 0 : Math.PI) : Math.PI / 2 + (r() < 0.5 ? 0 : Math.PI), vel: 14 + r() * 16, ida: 0, max: 900 + r() * 900 });
    }
  }
  // neve caindo na Terra do Sorvete, bolas de feno no Deserto, holofotes em Tóquio
  if (id === "sorvete") {
    const N = 900, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); for (let k = 0; k < N * 3; k++) pos[k] = (r() - 0.5) * 900;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const neve = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, transparent: true, opacity: 0.9, depthWrite: false }))); neve.frustumCulled = false; V.neve = neve;
  }
  V.fenos = [];
  if (id === "deserto") for (let k = 0; k < 10; k++) {
    const m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), new THREE.MeshStandardMaterial({ color: 0xa8854a, wireframe: true }))); m.castShadow = true;
    const i = Math.floor((n * k) / 10), p = pts[i]; V.fenos.push({ m, i, lado: -borda - 60, vel: 18 + r() * 14, p });
  }
  V.holofotes = [];
  if (id === "tokyo") for (let k = 0; k < 6; k++) {
    const i = Math.floor((n * k) / 6 + 40) % n, p = pts[i], s = k % 2 ? 1 : -1, [x, z] = lat(p, s * (borda + 140));
    const cone = add(new THREE.Mesh(new THREE.ConeGeometry(40, 900, 18, 1, true), new THREE.MeshBasicMaterial({ color: [0x7fe3ff, 0xff7ad9, 0xfff07a][k % 3], transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false })));
    cone.geometry.translate(0, -450, 0); cone.position.set(x, alturaEm(x, z, i) + 10, z); V.holofotes.push({ cone, fase: r() * 6, vel: 0.3 + r() * 0.3 });
  }
}
// torcida: corpo, cabeça e braços em três malhas instanciadas (uma pessoa por instância)
export function montarTorcida(add, gente) {
  if (!gente.length) return null;
  const corpo = add(new THREE.InstancedMesh(new THREE.BoxGeometry(4.6, 8, 2.8).translate(0, 4, 0), M(0xffffff), gente.length));
  const cabeca = add(new THREE.InstancedMesh(new THREE.SphereGeometry(2, 8, 6).translate(0, 10.2, 0), M(0xffffff), gente.length));
  const bracos = add(new THREE.InstancedMesh(new THREE.BoxGeometry(7.6, 1.4, 1.4).translate(0, 8.5, 0), M(0xffffff), gente.length));
  gente.forEach((o, k) => { corpo.setColorAt(k, new THREE.Color(o.camisa)); cabeca.setColorAt(k, new THREE.Color(o.pele)); bracos.setColorAt(k, new THREE.Color(o.camisa)); });
  for (const m of [corpo, cabeca, bracos]) { m.castShadow = false; m.receiveShadow = true; }
  const x = gente.reduce((s, o) => s + o.x, 0) / gente.length, z = gente.reduce((s, o) => s + o.z, 0) / gente.length;
  return { gente, corpo, cabeca, bracos, x, z, primeira: true };
}
function enfeitarEspaco(tr, add, r, V) { // Arco-íris: asteroides girando em volta da pista
  const C = tr.t.world / 2, geo = new THREE.IcosahedronGeometry(1, 0), lista = [];
  for (let k = 0; k < 40; k++) { const a = r() * 6.3, d = tr.t.world * (0.55 + r() * 0.5); lista.push({ x: C + Math.cos(a) * d, y: -150 + r() * 600, z: C + Math.sin(a) * d, s: 10 + r() * 40, g: (r() - 0.5) * 0.6 }); }
  const m = add(new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x6d6880, roughness: 0.9, flatShading: true }), lista.length)); m.frustumCulled = false;
  V.asteroides = { m, lista };
}

const d = new THREE.Object3D(), v3 = new THREE.Vector3();
// as cabines da roda-gigante ficam de pé enquanto a roda gira; longe da câmera (a mais de 3500) ficam como estavam
function animarRoda(w, dt, foco) {
  if (foco && w.pronta && (w.x - foco.x) ** 2 + (w.z - foco.y) ** 2 > 3500 ** 2) return;
  w.pronta = true; w.rodaH.rotation.z = w.roda.rotation.z;
  for (const h of w.cabH) h.rotation.z = -w.roda.rotation.z;
  w.raiz.updateMatrixWorld(true);
  w.cabH.forEach((h, c) => w.cabs.setMatrixAt(c, h.matrixWorld));
  w.cabs.instanceMatrix.needsUpdate = true;
}
export function animarMais(tr, V, t, dt, foco) {
  const parado = reduz.matches, C = tr.t.world / 2;
  if ((V.vez = (V.vez || 0) + 1) % 2 === 0) for (const p of V.panos || []) { // a bandeira ondula (mais na ponta solta), a cada 2 quadros
    if (foco && p.pronto && (p.pano.position.x - foco.x) ** 2 + (p.pano.position.z - foco.y) ** 2 > 2200 ** 2) continue; // longe da câmera fica como estava
    p.pronto = true;
    const pos = p.pano.geometry.attributes.position, b = p.base;
    for (let k = 0; k < pos.count; k++) { const x = b[k * 3], y = b[k * 3 + 1]; pos.setZ(k, parado ? 0 : Math.sin(x * 0.28 - t * 6 + p.fase) * x * 0.12 + Math.sin(y * 0.4 + t * 3) * x * 0.03); }
    pos.needsUpdate = true;
  }
  if (!parado) for (const h of V.helices || []) h.helice.rotation.z -= dt * h.vel;
  for (const w of V.rodas || []) { if (!parado) w.roda.rotation.z += dt * 0.06; animarRoda(w, dt, foco); }
  if (V.heli && foco) { // fica ao lado e à frente de quem a câmera segue, balançando
    const h = V.heli, fx = Math.cos(foco.a || 0), fz = Math.sin(foco.a || 0);
    const alvo = v3.set(foco.x + fx * 160 - fz * 130, (foco.z || 0) + 110 + Math.sin(t * 0.7) * 8, foco.y + fz * 160 + fx * 130);
    const k = 1 - Math.exp(-dt * 0.8); h.x += (alvo.x - h.x) * k; h.y += (alvo.y - h.y) * k; h.z += (alvo.z - h.z) * k;
    h.g.position.set(h.x, h.y, h.z); h.g.lookAt(foco.x, h.y - 30, foco.y); h.g.rotation.z += Math.sin(t * 1.3) * 0.05;
    h.rotor.rotation.y += dt * 30; h.rotor2.rotation.x += dt * 40;
  }
  if (V.aviao) {
    const a = V.aviao; a.t += dt;
    if (a.t > a.dur + 14) { // um avião novo, cruzando de um lado ao outro do céu
      a.t = 0; const ang = Math.random() * 6.3, R = tr.t.world * 1.1 + 1500, alto = 900 + Math.random() * 300;
      a.ini.set(C + Math.cos(ang) * R, alto, C + Math.sin(ang) * R); a.fim.set(C - Math.cos(ang + 0.5) * R, alto, C - Math.sin(ang + 0.5) * R);
    }
    const k = Math.min(1, a.t / a.dur); a.g.visible = k < 1 && !a.noite; a.g.position.lerpVectors(a.ini, a.fim, k); a.g.lookAt(a.fim);
    const L = Math.min(900, a.t * 70); a.rastro.scale.set(1, L, 1); a.rastro.position.z = -30 - L / 2;
  }
  if (V.trem && !parado) { const T = V.trem; T.a += dt * 0.022; T.vag.forEach((v, k) => { const a = T.a - k * (44 / T.raio); v.position.set(T.C + Math.cos(a) * T.raio, 8, T.C + Math.sin(a) * T.raio); v.rotation.y = -a; }); }
  for (const b of V.barcos || []) { if (parado) break; b.ida += b.vel * dt; if (b.ida > b.max) { b.ida = 0; b.ang += Math.PI; } b.x += Math.cos(b.ang) * b.vel * dt; b.z += Math.sin(b.ang) * b.vel * dt; d.position.set(b.x, -6 + Math.sin(t * 1.5 + b.max) * 0.8, b.z); d.rotation.set(0, -b.ang, Math.sin(t * 1.2 + b.max) * 0.04); d.scale.setScalar(1); d.updateMatrix(); b.cascos.setMatrixAt(b.k, d.matrix); b.esteiras.setMatrixAt(b.k, d.matrix); b.cascos.instanceMatrix.needsUpdate = b.esteiras.instanceMatrix.needsUpdate = true; }
  if (V.neve && foco) { // a neve anda junto com a câmera e cai
    const pos = V.neve.geometry.attributes.position;
    if (!parado) for (let k = 0; k < pos.count; k++) { let y = pos.getY(k) - dt * 28; if (y < -150) y += 450; pos.setY(k, y); pos.setX(k, pos.getX(k) + Math.sin(t + k) * dt * 6); }
    pos.needsUpdate = true; V.neve.position.set(foco.x, (foco.z || 0) + 120, foco.y);
  }
  for (const f of V.fenos || []) { // atravessam a pista rolando e voltam do outro lado
    if (parado) break; f.lado += f.vel * dt; if (f.lado > tr.W / 2 + 120) f.lado = -tr.W / 2 - 120;
    const x = f.p.x + f.p.nx * f.lado, z = f.p.y + f.p.ny * f.lado; f.m.position.set(x, f.p.h + 7 + Math.abs(Math.sin(t * 4 + f.i)) * 5, z); f.m.rotation.x += dt * f.vel / 7;
  }
  for (const h of V.holofotes || []) { h.cone.rotation.z = Math.PI + Math.sin(t * h.vel + h.fase) * 0.5; h.cone.rotation.x = Math.cos(t * h.vel * 0.8 + h.fase) * 0.35; }
  if (V.asteroides) { const { m, lista } = V.asteroides; lista.forEach((o, k) => { d.position.set(o.x, o.y + Math.sin(t * 0.3 + k) * 10, o.z); d.rotation.set(t * o.g, t * o.g * 0.7, 0); d.scale.setScalar(o.s); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }); m.instanceMatrix.needsUpdate = true; }
}
