// Mônaco — a vida em volta da pista, tudo em InstancedMesh (poucas chamadas de desenho): a galera nas sacadas, nos terraços e nas arquibancadas,
// os fiscais laranja nos postos, as bandeiras nos prédios, os telões acesos com a faixa de notícias correndo, barcos passeando de verdade pelo
// porto, os guindastes das câmeras de TV, as tendas brancas, as ambulâncias e os carros de apoio nas áreas de escape, e mais palmeiras.
// Roda DEPOIS do ambiente e do vidaGP (gps/monaco.js `depois`): precisa dos postos de fiscais (tr.postosGP) e do tr.animarPista. A galera e os fiscais
// (gente de pé) entram em tr.torcidasGP, que vida-mais.js monta e anima como as outras torcidas (só mexe quem está perto da câmera).
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";
import { D, fundoMonaco, NIVEL_DO_MAR } from "./mundo.js";

const PELE = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a", "#5a3520"], CAMISA = ["#ffffff", "#e63946", "#ffd23f", "#1e88e5", "#f4f4f4", "#111111", "#fb8c00", "#43a047"];
const reduz = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

// um InstancedMesh com posição, giro (y), inclinação (x) e escala por instância, e cor opcional
function montar(add, geo, mat, itens, nome, { sombra = false } = {}) {
  if (!itens.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, itens.length)), o = new THREE.Object3D(), c = new THREE.Color();
  itens.forEach((a, k) => { o.position.set(a.x, a.y, a.z); o.rotation.set(a.rx || 0, a.r || 0, 0, "YXZ"); o.scale.set(a.sx ?? 1, a.sy ?? 1, a.sz ?? 1); o.updateMatrix(); m.setMatrixAt(k, o.matrix); if (a.cor) m.setColorAt(k, c.set(a.cor)); });
  m.castShadow = sombra; m.receiveShadow = true; m.name = nome; return m;
}
const comCor = (geo, cor) => { const c = new THREE.Color(cor), n = geo.attributes.position.count, v = []; for (let i = 0; i < n; i++) v.push(c.r, c.g, c.b); geo.setAttribute("color", new THREE.Float32BufferAttribute(v, 3)); return geo; };
const junta = (gs) => { // junta geometrias já coloridas numa só
  const pos = [], nor = [], cor = []; for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); cor.push(...g.attributes.color.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); return g;
};

export function vidaMonaco(tr, ctx, { lista, predioEm, hAt }) {
  const { add } = ctx, { pts, n } = tr, L = tr.wallLat, r = sorteio(4242), w = tr.t.world, f = D.frac, c = f.curvas, t = f.trechos;
  const terra = (x, z) => x > -300 && z > -300 && x < w + 300 && z < w + 300 && fundoMonaco(tr, x, z) < -12;
  const limpo = (x, z, raio, i) => terra(x, z) && livre(tr, x, z, raio) && !ocupado(tr, x, z, i) && !predioEm(x, z, 3) && !(i != null && tr.coberto?.(i));
  const gente = [], stats = { sacadas: 0, terracos: 0, arquibancadas: 0, fiscais: 0, bandeiras: 0, postosExtras: 0, tendas: 0, guindastes: 0, ambulancias: 0, barcos: 0, palmeiras: 0 };
  const pessoa = (x, y, z, ry, camisa, pula = false) => gente.push({ x, y, z, ry, fase: r() * 6.3, ritmo: 5 + r() * 5, pula, pele: PELE[(r() * 5) | 0], camisa });

  // ---- a galera nas arquibancadas (as do kit; a da reta dos boxes é da torcida de vida.js) ----
  for (const q of tr.arqDegraus || []) {
    if ((((q.i0 + 0.04 * n) % n) + n) % n < 0.09 * n) continue;
    for (let i = q.i0; i <= q.i1; i += 3) for (let fila = 0; fila < q.degraus; fila++) {
      if (r() < 0.32) continue;
      const p = pts[i % n], d = Math.abs(q.l0) + 4.5 + fila * 9 + (r() - 0.5) * 3, x = p.x + p.nx * q.lado * d, z = p.y + p.ny * q.lado * d;
      pessoa(x, p.h + 4 + (fila + 0.5) * 6, z, Math.atan2(-p.nx * q.lado, -p.ny * q.lado), CAMISA[(r() * CAMISA.length) | 0], r() < 0.5); stats.arquibancadas++;
    }
  }

  // ---- as sacadas e os terraços dos prédios que dão para a pista: a galera olhando, com a laje da sacada; e a bandeira no telhado ----
  const cand = [];
  for (const b of lista) {
    if (b.metros < 14 || b.h < 40) continue;
    let melhor = null;
    for (let k = 0; k < b.P.length; k++) {
      const a = b.P[k], q = b.P[(k + 1) % b.P.length], len = Math.hypot(q[0] - a[0], q[1] - a[1]); if (len < 14) continue;
      const mx = (a[0] + q[0]) / 2, mz = (a[1] + q[1]) / 2, dist = tr.distAt(mx, mz); if (dist < L + 4 || dist > L + 230) continue;
      let nx = (q[1] - a[1]) / len, nz = -(q[0] - a[0]) / len; if (nx * (mx - b.cx) + nz * (mz - b.cz) < 0) { nx = -nx; nz = -nz; }
      if (tr.distAt(mx + nx * 10, mz + nz * 10) >= dist) continue; // a fachada que olha para a pista
      if (!melhor || dist < melhor.dist) melhor = { a, q, len, mx, mz, nx, nz, dist };
    }
    if (melhor) cand.push({ b, ...melhor });
  }
  cand.sort((u, v) => u.dist - v.dist);
  const usados = []; const lajes = [], mastrosMonaco = [], mastros = []; const bandeiras = { mc: [], it: [], fr: [] };
  for (const e of cand) {
    if (usados.some(([x, z]) => (x - e.mx) ** 2 + (z - e.mz) ** 2 < 85 ** 2)) continue;
    usados.push([e.mx, e.mz]);
    const { b } = e, andar = 3.1 * D.projecao.k * 1.1, ry = Math.atan2(-e.nx, -e.nz), ang = Math.atan2(e.nx, e.nz);
    const andares = Math.floor(b.h / andar);
    if (stats.sacadas < 150 && andares >= 4) {
      const y = b.baixo + andar * 2.2, qtd = Math.min(4, Math.max(2, Math.floor(e.len / 9)));
      lajes.push({ x: e.mx + e.nx * 1.6, y: y - 0.5, z: e.mz + e.nz * 1.6, r: ang, sx: Math.min(e.len * 0.8, 38), sy: 1, sz: 3.6 });
      for (let k = 0; k < qtd; k++) { const o = (k - (qtd - 1) / 2) * 8 + (r() - 0.5) * 2; pessoa(e.mx + e.nx * 2.4 - e.nz * o, y, e.mz + e.nz * 2.4 + e.nx * o, ry, CAMISA[(r() * CAMISA.length) | 0], r() < 0.4); stats.sacadas++; }
    }
    if (stats.terracos < 110 && b.metros >= 20) { // no terraço, junto da borda que olha para a pista
      for (let k = 0; k < 3; k++) { const o = (k - 1) * 9 + (r() - 0.5) * 3; pessoa(e.mx - e.nx * 3 - e.nz * o, b.topo, e.mz - e.nz * 3 + e.nx * o, ry, CAMISA[(r() * CAMISA.length) | 0], r() < 0.6); stats.terracos++; }
    }
    // a bandeira no canto do telhado mais perto da pista: Mônaco na maioria, e as da França e da Itália
    if (stats.bandeiras < 90) {
      let v = e.a; if (r() < 0.5) v = e.q;
      const tipo = r() < 0.62 ? "mc" : r() < 0.5 ? "it" : "fr"; bandeiras[tipo].push({ x: v[0] - e.nx * 1.5, y: b.topo + 8, z: v[1] - e.nz * 1.5, r: ang + (r() - 0.5) * 1.2, rx: 0, sx: 1, sy: 1, sz: 1 });
      mastros.push({ x: v[0] - e.nx * 1.5, y: b.topo + 8, z: v[1] - e.nz * 1.5 }); stats.bandeiras++;
    }
  }
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xe9e1cf, { roughness: 0.8 }), lajes, "monaco-sacada");
  const mastro = new THREE.BoxGeometry(0.7, 16, 0.7), pano = (cores, vertical) => { // o pano de bandeira: 2 ou 3 faixas coloridas, de 11 × 7, com a ponta presa no mastro
    const k = cores.length, gs = cores.map((cor, i) => { const g = vertical ? new THREE.PlaneGeometry(11 / k, 7) : new THREE.PlaneGeometry(11, 7 / k); if (vertical) g.translate((i + 0.5) * (11 / k) - 5.5, 0, 0); else g.translate(0, 3.5 - (i + 0.5) * (7 / k), 0); return comCor(g, cor); });
    const j = junta(gs); j.translate(5.6, 0, 0.1); return j;
  };
  const matPano = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
  montar(add, mastro, M(0x9a9a9a, { roughness: 0.6 }), mastros.map((m) => ({ ...m, y: m.y })), "monaco-mastro");
  montar(add, pano(["#d8232a", "#ffffff"], false), matPano, bandeiras.mc.map((q) => ({ ...q, y: q.y + 3.5 })), "monaco-bandeira");
  montar(add, pano(["#009246", "#ffffff", "#ce2b37"], true), matPano, bandeiras.it.map((q) => ({ ...q, y: q.y + 3.5 })), "monaco-bandeira");
  montar(add, pano(["#0055a4", "#ffffff", "#ef4135"], true), matPano, bandeiras.fr.map((q) => ({ ...q, y: q.y + 3.5 })), "monaco-bandeira");

  // ---- os fiscais laranja nos postos: uma plataforma atrás do muro, dois fiscais em cima, e postos a mais onde a volta tem vão ----
  const postos = (tr.postosGP || []).map((o) => ({ x: o.x, z: o.z, i: o.i })), tem = (i) => postos.some((q) => Math.min(Math.abs(q.i - i), n - Math.abs(q.i - i)) < 48);
  for (let i = 14; i < n; i += 20) {
    if (tem(i) || tr.coberto?.(i)) continue;
    const p = pts[i], lado = r() < 0.5 ? 1 : -1;
    for (const l of [lado, -lado]) { const d = L + 12, x = p.x + p.nx * l * d, z = p.y + p.ny * l * d; if (!limpo(x, z, 6, i)) continue; postos.push({ x, z, i }); stats.postosExtras++; break; }
  }
  const plataformas = [];
  for (const q of postos) {
    const p = pts[q.i], x = q.x, z = q.z, lado = Math.sign((x - p.x) * p.nx + (z - p.y) * p.ny) || 1, ry = Math.atan2(-p.nx * lado, -p.ny * lado), y = hAt(x, z);
    if (tr.coberto?.(q.i)) continue;
    plataformas.push({ x, y: y + 6.5, z, r: Math.atan2(p.tx, p.ty), sx: 12, sy: 13, sz: 8 }); // o posto sobe até a altura da barreira, para os fiscais aparecerem por cima dela
    for (const o of [-3, 3]) { pessoa(x + p.tx * o, y + 13, z + p.ty * o, ry, "#ff6a00"); stats.fiscais++; }
  }
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0x4a4f57, { roughness: 0.8 }), plataformas, "monaco-posto");

  // ---- os guindastes das câmeras de TV: base, braço inclinado por cima da pista e a câmera na ponta ----
  const bases = [], bracos = [], cameras = [];
  for (const fr of [0.045, 0.085, c.casino + 0.012, c.mirabeauHaute - 0.02, c.portier + 0.01, t.tunel[1] + 0.014, c.tabac - 0.02, c.piscine2 + 0.008, c.rascasse - 0.03, 0.965]) {
    const i0 = Math.floor(((fr % 1) + 1) % 1 * n);
    for (let di = 0; di < 40; di += 4) {
      const i = (i0 + di) % n, p = pts[i];
      const lado = r() < 0.5 ? 1 : -1, d = L + 16; let ok = false;
      for (const l of [lado, -lado]) {
        const x = p.x + p.nx * l * d, z = p.y + p.ny * l * d; if (!limpo(x, z, 9, i)) continue;
        const y = hAt(x, z), ry = Math.atan2(-p.nx * l, -p.ny * l), topo = Math.max(y, p.h) + 32; // o braço aponta para a pista e passa a mais de 24 acima do asfalto
        bases.push({ x, y: (y + topo) / 2, z, r: ry, sx: 5, sy: topo - y, sz: 5 }, { x, y: y + 3, z, r: ry, sx: 12, sy: 6, sz: 12 }); // a torre e o pé
        bracos.push({ x: x - p.nx * l * 26, y: topo + 4, z: z - p.ny * l * 26, r: ry, rx: -0.3, sx: 2.6, sy: 2.6, sz: 56 }); // o braço sobe até a câmera na ponta
        cameras.push({ x: x - p.nx * l * 52, y: topo + 12.5, z: z - p.ny * l * 52, r: ry, sx: 5, sy: 4, sz: 7 });
        (tr.reservado ||= []).push([x, z, 14]); stats.guindastes++; ok = true; break;
      }
      if (ok) break;
    }
  }
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xe6b422, { roughness: 0.6 }), bases, "monaco-guindaste");
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xe6b422, { roughness: 0.6 }), bracos, "monaco-guindaste-braco");
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0x1b1d22, { roughness: 0.5 }), cameras, "monaco-guindaste-camera");

  // ---- ambulâncias e carros de apoio nas áreas de escape (Sainte Dévote, chicane do porto, Mirabeau e Rascasse) ----
  const carros = [], faixas = [], luzes = [];
  for (const [f0, f1] of [[c.sainteDevote + 0.012, c.sainteDevote + 0.03], [t.nouvelleChicane[0] - 0.004, t.nouvelleChicane[1] + 0.012], [c.mirabeauHaute - 0.004, c.mirabeauHaute + 0.02], [c.rascasse - 0.012, c.rascasse + 0.006]]) {
    let feitos = 0;
    for (let i = Math.floor(f0 * n); i < Math.floor(f1 * n) && feitos < 2; i += 5) {
      const p = pts[i % n];
      for (const l of [1, -1]) {
        const d = L + 34, x = p.x + p.nx * l * d, z = p.y + p.ny * l * d; if (!limpo(x, z, 10, i % n)) continue;
        const y = hAt(x, z), ry = Math.atan2(p.tx, p.ty) + (feitos ? Math.PI : 0), ambulancia = feitos === 0;
        carros.push({ x, y: y + 5, z, r: ry, sx: 10, sy: 10, sz: ambulancia ? 24 : 19, cor: ambulancia ? "#f5f5f2" : "#e8e8e6" });
        faixas.push({ x, y: y + 5.2, z, r: ry, sx: 10.3, sy: 2.6, sz: ambulancia ? 24.3 : 19.3 }); luzes.push({ x, y: y + 10.6, z, r: ry, sx: 7, sy: 1.2, sz: 2.2 });
        (tr.reservado ||= []).push([x, z, 14]); feitos++; stats.ambulancias++; break;
      }
    }
  }
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xffffff, { roughness: 0.55 }), carros, "monaco-apoio");
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xd8262c, { roughness: 0.6 }), faixas, "monaco-apoio-faixa");
  montar(add, new THREE.BoxGeometry(1, 1, 1), M(0xff8a1a, { roughness: 0.4, emissive: 0x7a3300 }), luzes, "monaco-apoio-luz");

  // ---- barcos de verdade passeando pelo porto (ida e volta devagar, dentro d'água) ----
  const barcos = [], bx = new THREE.BoxGeometry(34, 6, 11), bc = new THREE.BoxGeometry(14, 6, 9);
  bx.translate(0, 3, 0); bc.translate(-4, 9, 0);
  const casco = junta([comCor(bx, "#f7f7f7"), comCor(bc, "#1f6fae")]);
  for (let k = 0, tent = 0; barcos.length < 8 && tent < 4000; tent++) {
    const x = r() * w, z = r() * w, ang = r() * Math.PI, dx = Math.cos(ang), dz = Math.sin(ang), comp = 150 + r() * 160;
    const dentro = (s) => { const px = x + dx * s, pz = z + dz * s; return fundoMonaco(tr, px, pz) > 14 && tr.distAt(px, pz) > L + 90; };
    let bom = true; for (let s = -comp / 2; s <= comp / 2; s += 20) if (!dentro(s)) { bom = false; break; }
    if (!bom) continue;
    barcos.push({ x, z, dx, dz, comp, fase: r() * comp * 2, vel: 7 + r() * 8 }); k++;
  }
  const mBarcos = barcos.length ? add(new THREE.InstancedMesh(casco, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), barcos.length)) : null;
  if (mBarcos) { mBarcos.frustumCulled = false; mBarcos.castShadow = false; mBarcos.name = "monaco-barco-passeio"; }
  stats.barcos = barcos.length;
  const ob = new THREE.Object3D(), poseBarco = (b, s) => { // s vai de 0 a 2*comp: vai e volta
    const u = s % (b.comp * 2), q = u < b.comp ? u : b.comp * 2 - u, sentido = u < b.comp ? 1 : -1;
    ob.position.set(b.x + b.dx * (q - b.comp / 2), NIVEL_DO_MAR - 0.2 + Math.sin(s * 0.05 + b.fase) * 0.25, b.z + b.dz * (q - b.comp / 2)); ob.rotation.set(0, Math.atan2(-b.dz * sentido, b.dx * sentido), Math.sin(s * 0.07) * 0.03); ob.scale.setScalar(1); ob.updateMatrix();
  };
  barcos.forEach((b, k) => { poseBarco(b, b.fase); mBarcos.setMatrixAt(k, ob.matrix); });

  // ---- os telões acesos: a faixa de notícias corre na tela (a textura anda) ----
  const anim = (dt, foco, tt) => {
    if (reduz.matches) return;
    if (tr.telaoTex) tr.telaoTex.offset.x = (tt * 0.06) % 1;
    if (mBarcos && foco) {
      mBarcos.userData.t = (mBarcos.userData.t || 0) + dt;
      if ((mBarcos.userData.v = (mBarcos.userData.v || 0) + 1) % 2 === 0) {
        barcos.forEach((b, k) => { poseBarco(b, b.fase + mBarcos.userData.t * b.vel); mBarcos.setMatrixAt(k, ob.matrix); }); mBarcos.instanceMatrix.needsUpdate = true;
      }
    }
  };
  const anterior = tr.animarPista; tr.animarPista = (dt, foco, tt) => { anterior?.(dt, foco, tt); anim(dt, foco, tt); };

  tr.torcidasGP = gente; // vida-mais.js monta e anima
  tr.vidaMonaco = stats;
}
