// Singapura — a água: a baía de Marina Bay, o rio Singapura e o canal de Kallang (os anéis de OpenStreetMap em dados.js), o paredão de concreto
// da margem (o chão desce de uns 4 m até a água) e os reflexos de noite: faixas de luz aditivas sob os prédios acesos, o Marina Bay Sands, o Flyer
// e as cúpulas do Esplanade, que se estendem pela baía. A água anda (`tr.agua`, o mesmo deslizar de listras das outras pistas).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { soDeNoite, luzDaNoite } from "../bahrein/base.js";
import { D, NIVEL_AGUA, distanciaDaAgua } from "./mundo.js";

// o plano de água: cada anel vira um polígono (a água do Marina Bay é verde-azulada de dia e quase preta de noite, com a cidade refletida)
export function agua(tr, add) {
  const aneis = (D.agua || []).filter((P) => P.length >= 4);
  const tex = canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 320; i++) { x.fillStyle = rr() < 0.5 ? "#00000026" : "#ffffff30"; x.fillRect(rr() * w, rr() * hh, 8 + rr() * 34, 2); }
  });
  tex.repeat.set(1 / 130, 1 / 130); // uv em unidades do mundo
  const agua = new THREE.MeshStandardMaterial({ map: tex, color: tr.noite ? 0x0a1b26 : 0x2f8a93, roughness: 0.16, metalness: 0.55, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  // a cor muda com a noite junto com as outras peças da noite
  luzDaNoite(tr).materiais.push({ mat: { color: { set: (c) => agua.color.set(c) } }, dia: "#2f8a93", noite: "#0a1b26" });
  tr.agua.push(agua);
  let tris = 0;
  for (const P of aneis) {
    const contorno = P.map(([x, z]) => new THREE.Vector2(x, z)), t = THREE.ShapeUtils.triangulateShape(contorno, []);
    if (!t.length) continue;
    const pos = [], uv = [], idx = [];
    for (const [x, z] of P) { pos.push(x, NIVEL_AGUA, z); uv.push(x, z); }
    for (const [a, b, c] of t) idx.push(a, c, b);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, agua)); m.name = "singapura-agua"; m.receiveShadow = true; m.userData.semContato = true; tris += t.length;
  }
  tr.aguaSG = { aneis: aneis.length, triangulos: tris };
}

// o paredão da margem: uma tira vertical de concreto do fundo até a calçada (o chão do jogo desce numa rampa suave, o paredão tapa a rampa)
export function paredoes(tr, add, { alcance = 900 } = {}) {
  const vs = [], idx = [], mat = M(0x9a9a94, { roughness: 0.95, side: THREE.DoubleSide });
  for (const P of D.agua || []) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), passos = Math.max(1, Math.ceil(l / 28));
    for (let s = 0; s < passos; s++) {
      const t0 = s / passos, t1 = (s + 1) / passos, q = [0, 1].map((k) => { const t = k ? t1 : t0, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; return [x, z]; });
      if (q.every(([x, z]) => tr.distAt(x, z) > alcance)) continue;
      const topo = q.map(([x, z]) => { // a altura da calçada do lado da terra
        const gx = distanciaDaAgua(x + 5, z) - distanciaDaAgua(x - 5, z), gz = distanciaDaAgua(x, z + 5) - distanciaDaAgua(x, z - 5), gl = Math.hypot(gx, gz) || 1;
        return Math.max(NIVEL_AGUA + 3, tr.chao(x - (gx / gl) * 14, z - (gz / gl) * 14) - 0.4);
      });
      const k0 = vs.length / 3;
      vs.push(q[0][0], NIVEL_AGUA - 5, q[0][1], q[0][0], topo[0], q[0][1], q[1][0], NIVEL_AGUA - 5, q[1][1], q[1][0], topo[1], q[1][1]);
      idx.push(k0, k0 + 2, k0 + 1, k0 + 1, k0 + 2, k0 + 3);
    }
  }
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.name = "singapura-paredao"; m.receiveShadow = true; m.userData.semContato = true;
}

// os reflexos de noite: cada fonte { x, z, w, comp, cor } vira uma faixa aditiva sobre a água, saindo da margem para o meio da baía
export function reflexos(tr, add, fontes) {
  const lista = [];
  for (const f of fontes) {
    // a direção: da fonte para a água mais perto (procura num anel de 8 direções até 900)
    let melhor = null;
    for (let d = 40; d <= 900 && !melhor; d += 40) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d; if (distanciaDaAgua(x, z) > 6) { if (!melhor || distanciaDaAgua(x, z) > melhor.s) melhor = { a, d, x, z, s: distanciaDaAgua(x, z) }; } }
    if (!melhor) continue;
    // anda até a margem
    let x = f.x, z = f.z; const ux = Math.cos(melhor.a), uz = Math.sin(melhor.a);
    for (let d = 0; d < melhor.d + 30; d += 4) { x = f.x + ux * d; z = f.z + uz * d; if (distanciaDaAgua(x, z) > 0) break; }
    lista.push({ x: x + ux * f.comp * 0.5, z: z + uz * f.comp * 0.5, r: Math.atan2(ux, uz), w: f.w, comp: f.comp, cor: f.cor });
  }
  if (!lista.length) return 0;
  const faixa = canvasTex(64, 128, (c, w, h, rr) => { // pontos e traços de luz que se alargam e somem com a distância
    c.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { const f = 1 - y / h, larg = 6 + (1 - f) * 22, a = Math.max(0, f) ** 1.3 * (0.45 + rr() * 0.55); c.fillStyle = `rgba(255,255,255,${(a * 0.9).toFixed(3)})`; const x0 = w / 2 - larg / 2 + (rr() - 0.5) * 8; c.fillRect(x0, y, larg * (0.4 + rr() * 0.6), 2); }
  }, false);
  const mat = new THREE.MeshBasicMaterial({ map: faixa, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, vertexColors: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0);
  const im = new THREE.InstancedMesh(geo, mat, lista.length), o = new THREE.Object3D(), c = new THREE.Color();
  lista.forEach((q, k) => { o.position.set(q.x, NIVEL_AGUA + 0.6, q.z); o.rotation.set(0, q.r, 0); o.scale.set(q.w, 1, q.comp); o.updateMatrix(); im.setMatrixAt(k, o.matrix); c.set(q.cor); im.setColorAt(k, c); });
  im.frustumCulled = false; im.renderOrder = 3; im.name = "singapura-reflexos"; im.userData.semContato = true;
  soDeNoite(tr, add(im));
  return lista.length;
}
