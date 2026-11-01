// Singapura — os marcos, feitos em código a partir de fotos e das plantas do OpenStreetMap: o Marina Bay Sands (três torres de duas pernas que se
// inclinam uma para a outra, com o SkyPark em forma de barco por cima), o Singapore Flyer (a roda de 165 m que gira, com as cabines, ao lado da
// pista de verdade), o Esplanade das duas cúpulas "durião" de escamas, o Fullerton, a City Hall e a Old Supreme Court (a cúpula verde), o Merlion,
// o Padang com os balões de luz, e as pontes sobre a água (os paredões, os pilares e o vão fechado por baixo). Tudo só de noite acende (tr.noite).
import * as THREE from "three";
import { Montador, solido } from "../montagem.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { materialDaNoite, soDeNoite, emissivoDaNoite } from "../bahrein/base.js";
import { predios, materialFachada, JANELA, ANDAR } from "./predios.js";
import { D, K, NIVEL_AGUA, distanciaDaAgua, marco } from "./mundo.js";

const poligono = (e) => { const P = []; for (let k = 2; k < e.length; k += 2) P.push([e[k], e[k + 1]]); return P; };
const doEsp = (codigo, filtro = () => true) => D.predios.filter((e) => (e[1] >> 3) === codigo && filtro(e));
// a caixa orientada de uma planta: centro, eixo maior (u), comprimento e largura
function obb(P) {
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length; let melhor = null;
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI, ux = Math.cos(a), uz = Math.sin(a); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, z] of P) { const u = (x - cx) * ux + (z - cz) * uz, v = -(x - cx) * uz + (z - cz) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0); if (!melhor || area < melhor.area) melhor = { area, a, ux, uz, cu: (u0 + u1) / 2, cv: (v0 + v1) / 2, L: u1 - u0, Wd: v1 - v0 };
  }
  const { ux, uz } = melhor; let { L, Wd } = melhor, a = melhor.a;
  if (Wd > L) { [L, Wd] = [Wd, L]; a += Math.PI / 2; }
  const c = { x: cx + ux * melhor.cu - uz * melhor.cv, z: cz + uz * melhor.cu + ux * melhor.cv };
  return { x: c.x, z: c.z, a, L, Wd, ux: Math.cos(a), uz: Math.sin(a) };
}

// uma caixa inclinada (paralelepípedo com o topo deslocado): oito cantos, seis faces; uv da fachada (janelas) ou lisa
function prisma(mont, mat, base, topo, cor) {
  const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
  const f = (a, b, c, d, u1, v1) => { const k = pos.length / 3; pos.push(...a, ...b, ...c, ...d); uv.push(0, 0, u1, 0, u1, v1, 0, v1); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const alt = topo[0][1] - base[0][1];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, l = Math.hypot(base[j][0] - base[i][0], base[j][2] - base[i][2]); f(base[i], base[j], topo[j], topo[i], l / (JANELA * 16), alt / (ANDAR * 32)); }
  f(topo[0], topo[1], topo[2], topo[3], 0.01, 0.01); f(base[3], base[2], base[1], base[0], 0.01, 0.01);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  mont.geo(mat, g, { cor });
}
const cantos = (cx, cz, ux, uz, L, Wd, y) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [cx + ux * s * L / 2 - uz * t * Wd / 2, y, cz + uz * s * L / 2 + ux * t * Wd / 2]);

// ---------- o Marina Bay Sands ----------
function marinaBaySands(tr, add, mont, mats) {
  const torres = [1, 2, 3].map((c) => doEsp(c, (e) => e[0] / 2 === 193)[0]).filter(Boolean).map(poligono).map(obb);
  if (torres.length < 3) return;
  const baixo = (t) => tr.chao(t.x, t.z) - 1.5, altura = 193 * K, topoSky = 207 * K;
  const eixoFila = [torres[2].x - torres[0].x, torres[2].z - torres[0].z], lf = Math.hypot(...eixoFila), fx = eixoFila[0] / lf, fz = eixoFila[1] / lf; // a fila das três torres
  for (const t of torres) {
    const y0 = baixo(t), Wd = Math.max(t.Wd, 38 * K), L = Math.max(t.L, 52 * K);
    // cada torre: duas pernas (lajes de vidro) que se inclinam uma para a outra, e um corpo de ligação embaixo
    const lista = [];
    for (const lado of [-1, 1]) {
      const cx = t.x + fx * lado * Wd * 0.27, cz = t.z + fz * lado * Wd * 0.27, w = Wd * 0.34, l = Math.max(L, Wd);
      const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, u]) => [cx - fz * s * l / 2 + fx * u * w / 2, cz + fx * s * l / 2 + fz * u * w / 2]);
      lista.push({ P, esp: 0, cor: 2, metros: 0, h: altura, cx, cz, caixa: [cx - 80, cz - 80, cx + 80, cz + 80], baixo: y0, alto: y0, topo: y0 + altura, id: 9000 + lista.length + torres.indexOf(t) * 2, dt: [-fx * lado * Wd * 0.2, -fz * lado * Wd * 0.2], corTopo: [0.55, 0.57, 0.6] });
    }
    // o átrio que une as pernas até a metade da altura
    const cxa = t.x, cza = t.z, wa = Wd * 0.26, la = Math.max(L, Wd) * 0.96, Pa = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, u]) => [cxa - fz * s * la / 2 + fx * u * wa / 2, cza + fx * s * la / 2 + fz * u * wa / 2]);
    lista.push({ P: Pa, esp: 0, cor: 7, metros: 0, h: altura * 0.55, cx: cxa, cz: cza, caixa: [cxa - 80, cza - 80, cxa + 80, cza + 80], baixo: y0, alto: y0, topo: y0 + altura * 0.55, id: 9100 + torres.indexOf(t), corTopo: [0.7, 0.72, 0.75] });
    predios(tr, add, lista, { ignorar: () => false });
    // o brilho da fachada à noite (a escada de luzes que sobe pelas pernas): fitas finas e acesas nos cantos
    for (const lado of [-1, 1]) {
      const cx = t.x + fx * lado * Wd * 0.27, cz = t.z + fz * lado * Wd * 0.27;
      for (const q of [-1, 1]) mont.caixa(mats.luz, [cx - fz * q * Math.max(L, Wd) / 2 - fx * lado * Wd * 0.1, y0 + altura / 2, cz + fx * q * Math.max(L, Wd) / 2 - fz * lado * Wd * 0.1], [3, altura * 0.96, 3], { cor: "#ffffff" });
    }
  }
  // o SkyPark: o barco de 340 m sobre as três torres, com a proa em balanço para o norte, o pelo de verde, a piscina azul e o casco branco aceso por baixo
  const sp = poligono(doEsp(1, (e) => e[0] / 2 === 207)[0] || []);
  const ang = Math.atan2(fz, fx), cx = (torres[0].x + torres[2].x) / 2, cz = (torres[0].z + torres[2].z) / 2, comp = Math.max(lf + 90 * K, sp.length ? obb(sp).L : 340 * K), larg = 38 * K * 0.95;
  const y = baixo(torres[1]) + altura, ux = fx, uz = fz, vx = -fz, vz = fx;
  const c = (s, t, yy) => [cx + ux * s + vx * t, yy, cz + uz * s + vz * t];
  // o casco: do meio para a popa reto, depois afinando para a proa no norte (a direção de fila com z menor)
  const proa = Math.sign(-fz) || 1; // (+s para o norte)
  const sN = proa * comp * 0.5, sS = -proa * comp * 0.5;
  prisma(mont, mats.casco, [c(sS, -larg / 2, y), c(sS * 0.2, -larg / 2, y), c(sS * 0.2, larg / 2, y), c(sS, larg / 2, y)], [c(sS, -larg / 2, y + 9 * K), c(sS * 0.2, -larg / 2, y + 9 * K), c(sS * 0.2, larg / 2, y + 9 * K), c(sS, larg / 2, y + 9 * K)], "#f2f2ee");
  prisma(mont, mats.casco, [c(sS * 0.2, -larg / 2, y), c(sN * 0.7, -larg / 2, y), c(sN * 0.7, larg / 2, y), c(sS * 0.2, larg / 2, y)], [c(sS * 0.2, -larg / 2, y + 9 * K), c(sN * 0.7, -larg / 2, y + 9 * K), c(sN * 0.7, larg / 2, y + 9 * K), c(sS * 0.2, larg / 2, y + 9 * K)], "#f2f2ee");
  prisma(mont, mats.casco, [c(sN * 0.7, -larg / 2, y), c(sN, -larg * 0.16, y + 2 * K), c(sN, larg * 0.16, y + 2 * K), c(sN * 0.7, larg / 2, y)], [c(sN * 0.7, -larg / 2, y + 9 * K), c(sN, -larg * 0.16, y + 10 * K), c(sN, larg * 0.16, y + 10 * K), c(sN * 0.7, larg / 2, y + 9 * K)], "#f2f2ee"); // a proa
  // o deque verde e a piscina azul
  const yd = y + 9.2 * K;
  mont.caixa(mats.verde, [cx + ux * proa * comp * 0.05, yd + 0.8, cz + uz * proa * comp * 0.05], [comp * 0.78, 1.6, larg * 0.72], { ry: Math.atan2(-uz, ux), cor: "#3f7d3a" });
  mont.caixa(mats.piscina, [cx + ux * sS * 0.45, yd + 1.8, cz + uz * sS * 0.45], [comp * 0.3, 1.2, larg * 0.22], { ry: Math.atan2(-uz, ux), cor: "#46d0f0" });
  mont.caixa(mats.luz, [cx, y + 3.2, cz], [comp * 0.96, 2.4, larg * 1.02], { ry: Math.atan2(-uz, ux), cor: "#ffffff" }); // a faixa de luz do casco
  tr.mbsSG = { torres: torres.length, lista: torres, skypark: Math.round(comp) };
  tr.reservado.push(...torres.map((t) => [t.x, t.z, Math.max(t.L, t.Wd) * 0.6]));
  return { y, cx, cz, comp };
}

// ---------- o Singapore Flyer ----------
function flyer(tr, add, mont, mats) {
  const [fxm, fzm] = marco("flyer"), R = 75 * K, hub = 90 * K, ang = Math.atan2(-87.3, 112.4), dx = Math.cos(ang), dz = Math.sin(ang), nx = -dz, nz = dx; // o plano da roda (de OpenStreetMap)
  const y0 = tr.chao(fxm, fzm) - 1.5;
  // os dois aros e os raios de cabo, a árvore do eixo e a perna em A
  const aro = new THREE.TorusGeometry(R, 1.3 * K, 6, 72);
  for (const o of [-1, 1]) mont.geo(mats.aro, aro, { x: fxm + nx * o * 3.6 * K, y: y0 + hub, z: fzm + nz * o * 3.6 * K, ry: Math.atan2(nx, nz), cor: "#f4f4f4" });
  const raio = new THREE.CylinderGeometry(0.16 * K, 0.16 * K, 1, 4);
  for (let k = 0; k < 32; k++) for (const o of [-1, 1]) {
    const a = (k / 32) * Math.PI * 2, px = Math.cos(a) * R, py = Math.sin(a) * R;
    // do cubo (offset 0) ao aro (offset o * 3,6): um cilindro fino esticado
    const p1 = [fxm + dx * 0, y0 + hub, fzm + dz * 0], p2 = [fxm + dx * px + nx * o * 3.6 * K, y0 + hub + py, fzm + dz * px + nz * o * 3.6 * K], mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, mz = (p1[2] + p2[2]) / 2, ex = p2[0] - p1[0], ey = p2[1] - p1[1], ez = p2[2] - p1[2], l = Math.hypot(ex, ey, ez);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ex, ey, ez).normalize()), e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    mont.geo(mats.aro, raio, { x: mx, y: my, z: mz, rx: e.x, ry: e.y, rz: e.z, sy: l, cor: "#dddddd" });
  }
  mont.cilindro(mats.aro, [fxm, y0 + hub, fzm], [6 * K, 9 * K], { rx: Math.PI / 2, ry: Math.atan2(nx, nz) * 0 , cor: "#eeeeee", seg: 16 });
  // a perna de apoio: duas escoras inclinadas do eixo até o chão, para trás (-normal), e a base
  for (const o of [-1, 1]) {
    const b = [fxm - nx * 26 * K + dx * o * 24 * K, y0, fzm - nz * 26 * K + dz * o * 24 * K], t = [fxm - nx * 6 * K, y0 + hub, fzm - nz * 6 * K], ex = t[0] - b[0], ey = t[1] - b[1], ez = t[2] - b[2], l = Math.hypot(ex, ey, ez), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ex, ey, ez).normalize()), e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    mont.geo(mats.aro, new THREE.CylinderGeometry(1.5 * K, 2.4 * K, 1, 8), { x: (b[0] + t[0]) / 2, y: (b[1] + t[1]) / 2, z: (b[2] + t[2]) / 2, rx: e.x, ry: e.y, rz: e.z, sy: l, cor: "#f2f2f2" });
  }
  // o terminal embaixo (a planta de OpenStreetMap vira um prédio baixo de vidro): fica por conta de predios.js com `esp: 4`; aqui o piso iluminado
  // as cabines: 28, cada uma uma cápsula de vidro presa ao aro externo; giram devagar (volta em 30 min no real; aqui em ~4 min) e só se atualizam perto da câmera
  const cabGeo = new THREE.CapsuleGeometry(1.7 * K, 4.6 * K, 4, 8); cabGeo.rotateZ(Math.PI / 2);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xcfe3f0, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.8, emissive: 0xffe0a8, emissiveIntensity: 0 });
  emissivoDaNoite(tr, cabMat, 0, 0.9);
  const cabs = new THREE.InstancedMesh(cabGeo, cabMat, 28), o = new THREE.Object3D(); cabs.name = "singapura-flyer-cabines"; cabs.frustumCulled = false; cabs.userData.semContato = true; add(cabs);
  const posicionar = (t) => { for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2 + t * 0.026, px = Math.cos(a) * (R + 2.4 * K), py = Math.sin(a) * (R + 2.4 * K); o.position.set(fxm + dx * px, y0 + hub + py, fzm + dz * px); o.rotation.set(0, Math.atan2(nx, nz) + Math.PI / 2, 0); o.scale.set(1, 1, 1); o.updateMatrix(); cabs.setMatrixAt(k, o.matrix); } cabs.instanceMatrix.needsUpdate = true; };
  posicionar(0);
  const antes = tr.animarPista;
  let ultimo = -1;
  tr.animarPista = (dt, foco, t) => { antes?.(dt, foco, t); tr.relogioFlyer = (tr.relogioFlyer || 0) + dt; if (foco && Math.hypot(foco.x - fxm, foco.y - fzm) > 3200) return; if (Math.floor(tr.relogioFlyer * 8) === ultimo) return; ultimo = Math.floor(tr.relogioFlyer * 8); posicionar(tr.relogioFlyer); };
  tr.reservado.push([fxm, fzm, 30 * K]);
  tr.flyerSG = { x: fxm, z: fzm, raio: R, altura: hub + R };
}

// ---------- o Esplanade: as duas cúpulas de durião ----------
function esplanade(tr, add, mont, mats) {
  const base = doEsp(5)[0];
  const cupulas = [doEsp(6)[0], doEsp(7)[0]].filter(Boolean).map(poligono).map(obb);
  const escamas = [];
  for (const c of cupulas) {
    const a = c.L * 0.5 * 0.98, b = c.Wd * 0.5 * 0.98, h = 36 * K, y0 = tr.chao(c.x, c.z) - 1.5;
    const sh = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    mont.geo(mats.cupula, sh, { x: c.x, y: y0 + 4 * K, z: c.z, ry: -c.a, sx: a, sy: h, sz: b, cor: "#6a5638" });
    // as escamas: aletas de alumínio triangulares em espiral sobre a casca (cada uma aponta para fora da superfície)
    const N = 900;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, phi = Math.acos(1 - t), th = i * 2.399963; // espiral de ouro no hemisfério
      const sx = Math.sin(phi) * Math.cos(th), sz = Math.sin(phi) * Math.sin(th), sy = Math.cos(phi);
      const lx = sx * a, ly = sy * h, lz = sz * b, cs = Math.cos(-c.a), sn = Math.sin(-c.a);
      const ex = c.x + lx * cs + lz * sn, ez = c.z - lx * sn + lz * cs; if (tr.distAt(ex, ez) < tr.W / 2 + 40) continue; // nenhuma escama perto da pista
      escamas.push({ x: c.x + lx * cs + lz * sn, y: y0 + 4 * K + ly, z: c.z - lx * sn + lz * cs, nx: sx / a, ny: sy / h, nz: sz / b, ca: cs, sa: sn, tam: 1.7 * K });
    }
    tr.reservado.push([c.x, c.z, Math.max(a, b) + 40]);
  }
  if (escamas.length) {
    const cone = new THREE.ConeGeometry(1, 2.2, 4); cone.translate(0, 1.3, 0);
    const im = new THREE.InstancedMesh(cone, mats.escama, escamas.length), o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), q = new THREE.Quaternion();
    escamas.forEach((e, k) => { v.set(e.nx * e.ca + e.nz * e.sa, e.ny, -e.nx * e.sa + e.nz * e.ca).normalize(); q.setFromUnitVectors(up, v); o.position.set(e.x, e.y, e.z); o.quaternion.copy(q); o.scale.set(e.tam * 0.8, e.tam, e.tam * 0.8); o.updateMatrix(); im.setMatrixAt(k, o.matrix); });
    im.castShadow = false; im.name = "singapura-esplanade-escamas"; im.userData.semContato = true; add(im);
  }
  void base;
  tr.esplanadeSG = { cupulas: cupulas.length, lista: cupulas, escamas: escamas.length };
}

// ---------- o Merlion ----------
function merlion(tr, add, mont, mats) {
  const m = marco("merlion"); if (!m) return;
  const [x, z] = m, y = tr.chao(x, z) - 1.5, s = K; // o chão de lá é a calçada do paredão
  mont.caixa(mats.pedra, [x, y + 1.5 * s, z], [9 * s, 3 * s, 9 * s], { cor: "#b8b3a6" });
  mont.cilindro(mats.merlion, [x, y + 6 * s, z], [2.3 * s, 6 * s], { cor: "#f4f4f0", seg: 12 });
  mont.cilindro(mats.merlion, [x, y + 10.2 * s, z], [2.7 * s, 3 * s], { cor: "#f4f4f0", seg: 12 });
  mont.geo(mats.merlion, new THREE.SphereGeometry(1, 14, 10), { x, y: y + 13 * s, z, sx: 3 * s, sy: 2.6 * s, sz: 3 * s, cor: "#f7f7f3" }); // a cabeça de leão
  mont.geo(mats.merlion, new THREE.TorusGeometry(1, 0.34, 6, 14), { x, y: y + 13 * s, z, rx: Math.PI / 2, sx: 3.2 * s, sy: 3.2 * s, sz: 3.2 * s, cor: "#ececE6" }); // a juba
  mont.geo(mats.agua, new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 1, 5), { x: x + 2.4 * s, y: y + 12 * s, z, rz: -0.9, sy: 7 * s, cor: "#e9fbff" }); // o jato d'água
  tr.merlionSG = { x, z };
}

// ---------- o Padang: a relva, os balões de luz e a sede do clube ----------
function padang(tr, add, mats) {
  const campo = D.campos.find((c) => c.at(-1) === "Padang"); if (!campo) return;
  const P = []; for (let i = 1; i + 1 < campo.length - 1; i += 2) P.push([campo[i], campo[i + 1]]);
  const o = obb(P);
  const n = 11, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mats.balao, n), t = new THREE.Object3D();
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, px = o.x + Math.cos(a) * o.L * 0.46, pz = o.z + Math.sin(a) * o.Wd * 0.5; t.position.set(px, tr.chao(px, pz) + 22 * K * 0.5, pz); t.scale.setScalar(5.2 * K * 0.8); t.updateMatrix(); im.setMatrixAt(k, t.matrix); }
  im.frustumCulled = false; im.userData.semContato = true; im.name = "singapura-padang-baloes"; add(im);
  tr.padangSG = { x: o.x, z: o.z, L: o.L, Wd: o.Wd };
}

// ---------- as pontes: os paredões, o fundo do tabuleiro e os pilares ----------
export function pontes(tr, add) {
  const { pts, n, W } = tr, mat = new THREE.MeshStandardMaterial({ color: 0xe9e8e2, roughness: 0.8, side: THREE.DoubleSide }), vs = [], idx = [], pil = [], arcos = [];
  let corridas = 0;
  const sobre = (i) => distanciaDaAgua(pts[i % n].x, pts[i % n].y) > 6;
  let i = 0; while (i < n && sobre(i)) i++;
  for (let k = 0; k < n; k++) {
    const a = (i + k) % n; if (!sobre(a)) continue;
    let b = a; while (sobre((b + 1) % n) && b - a < n) b++;
    if (b - a >= 10) { // uma ponte (mais de 60 unidades)
      corridas++;
      const i0 = a - 4, i1 = b + 4, lat = W / 2 + 22;
      // a ponte Anderson (por volta de 0,57 da volta): três vãos com os arcos de aço brancos de cada lado, como a de 1910
      if (((a + b) / 2 / n) > 0.54 && ((a + b) / 2 / n) < 0.6) for (let vao = 0; vao < 3; vao++) for (const s2 of [-1, 1]) {
        const j0 = i0 + Math.floor(((i1 - i0) * vao) / 3), j1 = i0 + Math.floor(((i1 - i0) * (vao + 1)) / 3), P = [];
        for (let j = j0; j <= j1; j += 2) { const p = pts[((j % n) + n) % n], t = (j - j0) / Math.max(1, j1 - j0); P.push(new THREE.Vector3(p.x + p.nx * s2 * lat, p.h + 4 + Math.sin(t * Math.PI) * 3.6 * K, p.y + p.ny * s2 * lat)); }
        if (P.length > 3) arcos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 14, 1.0 * K * 0.5, 5, false));
      }
      for (let j = i0; j < i1; j++) {
        const p = pts[((j % n) + n) % n], q = pts[(((j + 1) % n) + n) % n], k0 = vs.length / 3;
        for (const s of [-1, 1]) { vs.push(p.x + p.nx * s * lat, p.h + 4, p.y + p.ny * s * lat, p.x + p.nx * s * lat, p.h - 7, p.y + p.ny * s * lat); }
        vs.push(q.x + q.nx * -lat, q.h + 4, q.y + q.ny * -lat, q.x + q.nx * -lat, q.h - 7, q.y + q.ny * -lat, q.x + q.nx * lat, q.h + 4, q.y + q.ny * lat, q.x + q.nx * lat, q.h - 7, q.y + q.ny * lat);
        // lateral esquerda (s=-1): vértices k0, k0+1 (p) e k0+4, k0+5 (q) ; lateral direita (s=1): k0+2, k0+3 (p) e k0+6, k0+7 (q)
        idx.push(k0, k0 + 4, k0 + 1, k0 + 1, k0 + 4, k0 + 5, k0 + 2, k0 + 3, k0 + 6, k0 + 3, k0 + 7, k0 + 6);
        // o fundo do tabuleiro (fecha o vão por baixo)
        idx.push(k0 + 1, k0 + 5, k0 + 3, k0 + 3, k0 + 5, k0 + 7);
        if ((j - i0) % 14 === 0) pil.push({ x: p.x, z: p.y, y: p.h - 7, h: p.h - 7 - (NIVEL_AGUA - 8), rot: Math.atan2(p.tx, p.ty), w: W / 2 + 18 });
      }
    }
    k += Math.max(0, b - a);
  }
  if (idx.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, mat)); m.castShadow = true; m.receiveShadow = true; m.name = "singapura-pontes"; m.userData.semContato = true;
    const pg = new THREE.BoxGeometry(1, 1, 1), pi = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0xcfcdc6, roughness: 0.85 }), pil.length), o = new THREE.Object3D();
    pil.forEach((p, k) => { o.position.set(p.x, p.y - p.h / 2, p.z); o.rotation.set(0, p.rot, 0); o.scale.set(2 * p.w, p.h, 12); o.updateMatrix(); pi.setMatrixAt(k, o.matrix); });
    pi.name = "singapura-pilares"; pi.userData.semContato = true; add(pi);
  }
  if (arcos.length) {
    const gm = arcos.length === 1 ? arcos[0] : mergeGeometries(arcos, false), mArco = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.55, metalness: 0.3, emissive: 0xffe9b8, emissiveIntensity: 0 });
    emissivoDaNoite(tr, mArco, 0, 0.35);
    const m = add(new THREE.Mesh(gm, mArco)); m.name = "singapura-ponte-anderson"; m.userData.semContato = true; m.castShadow = true;
  }
  tr.pontesSG = { pontes: corridas, pilares: pil.length, arcos: arcos.length };
}

// ---------- tudo junto ----------
export function marcos(tr, add) {
  const mont = new Montador(), reservado = (tr.reservado ||= []);
  const mats = {
    casco: solido(), pedra: solido(), verde: solido(),
    luz: materialDaNoite(tr, "#cfd6dc", "#fff4d6", { fog: true }), piscina: materialDaNoite(tr, "#2d7bb0", "#58e0ff"), aro: materialDaNoite(tr, "#f0f0f0", "#ff7aa8"),
    cupula: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5, vertexColors: true, side: THREE.DoubleSide }),
    escama: new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.8, emissive: 0xffa640, emissiveIntensity: 0 }),
    merlion: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0 }), agua: solido(),
    balao: new THREE.MeshBasicMaterial({ color: 0xfff1d0 }),
  };
  mats.balao.userData.bloom = 2.2;
  emissivoDaNoite(tr, mats.escama, 0, 0.22); emissivoDaNoite(tr, mats.merlion, 0, 0.55);
  mats.torre = materialFachada(tr);
  marinaBaySands(tr, add, mont, mats);
  flyer(tr, add, mont, mats);
  esplanade(tr, add, mont, mats);
  merlion(tr, add, mont, mats);
  padang(tr, add, mats);
  const g = mont.montar("singapura-marcos"); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.userData.semContato = true; } }); add(g);
  void reservado; void soDeNoite;
}
