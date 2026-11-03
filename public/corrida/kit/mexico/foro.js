// Cidade do México — o Foro Sol: o estádio de beisebol onde o circuito atravessa a arquibancada (curvas 12 a 16). Só código, sem foto nem modelo.
// O estádio cabe no miolo da alça do fim da volta, encolhido: a arquibancada em ferradura (uma elipse de degraus lotados de camisa verde,
// branca e vermelha, aberta onde a pista passa perto), o muro do campo com o acolchoado e os painéis, o gramado listrado com o losango
// de terra e as linhas, o pódio no meio do campo virado para a torcida, as bandeiras do México no alto, as torres de refletores, o placar e a
// fumaça verde, branca e vermelha que sobe do campo. Escala do jogo (1 ≈ 10 cm). Peças repetidas em InstancedMesh; o resto, uma malha por material.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { Montador, solido, comTextura, letreiro, tom } from "../montagem.js";
import { marcaTex } from "../marcas.js";
import { instancias, sorteio } from "../comum.js";

export const CORES_MX = { verde: "#006847", branco: "#f4f4f0", vermelho: "#ce1126" };
export const CAMISAS_MX = ["#0a7a4a", "#f4f4f0", "#ce1126", "#f4f4f0", "#0a7a4a", "#ce1126", "#1b1b1b", "#ffd23f"];

// a textura da torcida: fileiras de camisa (verde, branco, vermelho) com a cabeça por cima; repete a cada fileira
function torcidaTex() {
  return canvasTex(64, 128, (x, w, h, rr) => {
    x.fillStyle = "#3b3f46"; x.fillRect(0, 0, w, h);
    const linhas = 8, alt = h / linhas;
    for (let j = 0; j < linhas; j++) {
      x.fillStyle = "#2c3036"; x.fillRect(0, j * alt + alt - 2, w, 2);
      for (let i = 0; i < 16; i++) {
        if (rr() < 0.08) continue;
        const cx = i * 4 + 1;
        x.fillStyle = CAMISAS_MX[(rr() * CAMISAS_MX.length) | 0]; x.fillRect(cx, j * alt + alt * 0.42, 3, alt * 0.5);
        x.fillStyle = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a", "#5a3820"][(rr() * 5) | 0]; x.fillRect(cx, j * alt + alt * 0.18, 3, alt * 0.26);
        if (rr() < 0.12) { x.fillStyle = "#ffd23f"; x.fillRect(cx - 1, j * alt + alt * 0.1, 5, 2); } // um chapéu de mariachi (sombrero) aqui e ali
      }
    }
  });
}

// o gramado listrado com o losango de terra e as linhas, desenhado numa elipse (uv planar: 0..1 sobre o retângulo que a contém)
function campoTex() {
  return canvasTex(512, 256, (x, w, h) => {
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? "#4f9a3e" : "#5aa646"; x.fillRect(i * (w / 16), 0, w / 16 + 1, h); }
    const cx = w * 0.5, cy = h * 0.5, r = h * 0.34;
    x.fillStyle = "#b98a58"; x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fill();
    x.fillStyle = "#5aa646"; const s = r * 0.62; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); x.fill();
    x.strokeStyle = "#f4f4f0"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy + r); x.lineTo(cx + w * 0.42, cy + r - h * 0.5 * 1.05); x.moveTo(cx, cy + r); x.lineTo(cx - w * 0.42, cy + r - h * 0.5 * 1.05); x.stroke();
    x.fillStyle = "#b98a58"; x.beginPath(); x.arc(cx, cy, r * 0.22, 0, 7); x.fill();
    x.fillStyle = "#f4f4f0"; for (const [px, py] of [[cx, cy + r], [cx + r, cy], [cx - r, cy]]) x.fillRect(px - 4, py - 4, 8, 8);
  }, false);
}

export function bandeiraMexico(w = 96, h = 56) {
  return canvasTex(w, h, (x) => {
    x.fillStyle = CORES_MX.verde; x.fillRect(0, 0, w / 3, h); x.fillStyle = CORES_MX.branco; x.fillRect(w / 3, 0, w / 3, h); x.fillStyle = CORES_MX.vermelho; x.fillRect((w * 2) / 3, 0, w / 3, h);
    // o brasão: a águia sobre o nopal, só uma mancha marrom e verde no meio
    x.fillStyle = "#8a5a2b"; x.beginPath(); x.ellipse(w / 2, h * 0.47, w * 0.075, h * 0.17, 0, 0, 7); x.fill();
    x.fillStyle = "#2f8f3a"; x.beginPath(); x.ellipse(w / 2, h * 0.7, w * 0.085, h * 0.07, 0, 0, 7); x.fill();
  }, false);
}

// uma faixa de elipse entre os raios (A - d0, B - d0) e (A - d1, B - d1), de t0 a t1, nas alturas y0 e y1. `cor` opcional (cor por vértice).
function faixaEl(l, A, B, d0, y0, d1, y1, t0, t1, seg, { uvU = 1, uvV = 1, cor = null } = {}) {
  const base = l.pos.length / 3;
  for (let k = 0; k <= seg; k++) {
    const t = t0 + ((t1 - t0) * k) / seg;
    for (const [d, y, v] of [[d0, y0, 0], [d1, y1, uvV]]) {
      l.pos.push((A - d) * Math.cos(t), y, (B - d) * Math.sin(t)); l.uv.push(((k / seg) * uvU), v);
      if (cor) l.col.push(cor.r, cor.g, cor.b);
    }
    if (k < seg) { const a = base + k * 2; l.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
}
const novo = () => ({ pos: [], uv: [], idx: [], col: [] });
function malha(l, mat, comCor = false) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(l.pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(l.uv, 2));
  if (comCor) g.setAttribute("color", new THREE.Float32BufferAttribute(l.col, 3));
  g.setIndex(l.idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}

/**
 * O Foro Sol numa elipse de semieixos A e B (a parede de fora) centrada em (cx, cz). `ok(x, z)` diz se o ponto pode ficar ali (longe da pista):
 * a seção da ferradura que não passa é tirada, e é por esse vão que a pista "atravessa" a arquibancada. Devolve o que montou.
 */
export function foroSol(tr, add, { cx, cz, A, B, fundo = 56, degraus = 7, ok, semente = 11 }) {
  const SEG = 72, topo = 4 + degraus * 5.6, a0 = A - fundo, b0 = B - fundo;
  const y0 = tr.chao(cx, cz) - 0.6; // o campo fica no nível do chão do centro
  const g = new THREE.Group(); g.name = "foro-sol"; g.position.set(cx, y0, cz);
  const mundo = (d, t) => [cx + (A - d) * Math.cos(t), cz + (B - d) * Math.sin(t)];
  // as seções em pé: as que ficam a mais de uma folga da pista nos dois cantos de cada borda
  const em = [];
  for (let k = 0; k < SEG; k++) {
    const ta = (k / SEG) * Math.PI * 2, tb = ((k + 1) / SEG) * Math.PI * 2, tm = (ta + tb) / 2;
    const bom = [ta, tm, tb].every((t) => [0, fundo].every((d) => { const [x, z] = mundo(d, t); return ok(x, z); }) && ok(...mundo(-8, t)));
    if (bom) em.push([ta, tb]);
  }
  // fiapos soltos de uma seção só ficam feios: tira a seção sem vizinha
  const ativas = em.length > 3 ? em.filter(([ta, tb]) => em.some(([, ub]) => Math.abs(ub - ta) < 1e-6) || em.some(([ua]) => Math.abs(ua - tb) < 1e-6)) : em;
  const rake = novo(), conc = novo(), muro = novo(), corConc = new THREE.Color("#c9ccd0"), corFundo = new THREE.Color("#a9adb3");
  for (const [ta, tb] of ativas) {
    const comp = (tb - ta) * ((A + B) / 2), u = comp / 30;
    faixaEl(rake, A, B, fundo, 3, 0, topo, ta, tb, 1, { uvU: u, uvV: degraus });                        // os degraus lotados
    faixaEl(conc, A, B, 0, -6, 0, topo + 22, ta, tb, 1, { cor: corFundo });                                 // a parede de trás
    faixaEl(conc, A, B, 0, topo + 22, 4, topo + 24, ta, tb, 1, { cor: corConc });                           // o beiral
    faixaEl(conc, A, B, fundo, -6, fundo, 3, ta, tb, 1, { cor: corConc });                                  // o pé da arquibancada
    faixaEl(muro, A, B, fundo + 5, 0, fundo + 5, 7, ta, tb, 1, { uvU: u * 0.5, uvV: 1 });                   // o muro do campo, acolchoado
  }
  if (ativas.length) {
    g.add(malha(rake, comTextura(torcidaTex(), { roughness: 0.9 })));
    g.add(malha(conc, M(0xffffff, { roughness: 0.85, vertexColors: true, side: THREE.DoubleSide }), true));
    const mm = malha(muro, comTextura(canvasTex(64, 16, (x, w, h) => { x.fillStyle = "#14502f"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffd23f"; x.fillRect(0, 0, w, 3); x.fillStyle = "#f4f4f0"; x.fillRect(0, h - 3, w, 3); })), true);
    g.add(mm);
  }
  // o campo: um disco achatado com o gramado
  const campo = new THREE.Mesh(new THREE.CircleGeometry(1, 48), comTextura(campoTex(), { roughness: 1 }));
  campo.rotation.x = -Math.PI / 2; campo.scale.set(a0 + 5, b0 + 5, 1); campo.position.y = 0.35; campo.receiveShadow = true;
  // o uv do CircleGeometry vai de 0 a 1 no quadrado que o contém: dá certo com a escala elíptica
  g.add(campo);
  const aterro = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 48), M(0xb5ab98, { roughness: 1 })); aterro.scale.set(A + 6, 1, B + 6); aterro.position.y = -7.5; g.add(aterro);

  // o pódio no meio do campo, de frente para a maior parte da torcida
  let fx = 0, fz = 0; for (const [ta, tb] of ativas) { const t = (ta + tb) / 2; fx += Math.cos(t) * A; fz += Math.sin(t) * B; }
  const rot = ativas.length ? Math.atan2(fx, fz) : 0; // a frente do pódio (+z local) aponta para o centro da massa de torcida
  const pod = podio(); pod.position.set(0, 0.4, 0); pod.rotation.y = rot; g.add(pod);
  add(g);

  // as bandeiras do México no alto da parede de trás, em InstancedMesh (mastro e pano), e a fumaça
  const r = sorteio(semente), mastros = [], panos = [];
  ativas.forEach(([ta, tb], k) => {
    if (k % 2) return;
    const t = (ta + tb) / 2, [x, z] = mundo(0, t), altura = 38 + r() * 8, ang = -t + Math.PI / 2 + (r() - 0.5) * 0.5;
    mastros.push({ x, y: y0 + topo + 22 + altura / 2, z, sx: 0.7, sy: altura, sz: 0.7 });
    panos.push({ x: x + Math.cos(ang) * 14, y: y0 + topo + 22 + altura - 8, z: z - Math.sin(ang) * 14, sx: 28, sy: 16, sz: 1, r: ang });
  });
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 6), M(0xe9e9e9, { roughness: 0.5 }), mastros, { nome: "foro-mastros" });
  instancias(add, new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: bandeiraMexico(), side: THREE.DoubleSide, roughness: 0.8 }), panos, { sombra: false, nome: "foro-bandeiras" });

  // as torres de refletores nos quatro cantos da elipse (as que cabem)
  const m = new Montador(), S = solido(), torres = [];
  for (const t of [0.6, Math.PI - 0.6, Math.PI + 0.6, -0.6]) {
    const [x, z] = mundo(-6, t); if (!ok(x, z)) continue;
    const lx = x - cx, lz = z - cz;
    m.cilindro(S, [lx, 60, lz], [1.6, 130], { cor: "#aeb4ba", seg: 6 });
    m.caixa(S, [lx, 134, lz], [30, 16, 3], { cor: "#d9dde2", ry: -t + Math.PI / 2 });
    m.caixa(S, [lx, 134, lz], [28, 14, 3.4], { cor: "#fff3c4", ry: -t + Math.PI / 2 });
    torres.push([x, z]);
  }
  const torresG = m.montar("foro-torres"); torresG.position.set(cx, y0, cz); add(torresG);

  const fumaca = fumacaMexicana(add, { x: cx, y: y0, z: cz, a: a0, b: b0, rot });
  const info = { x: cx, z: cz, A, B, secoes: ativas.length, de: SEG, torres: torres.length, bandeiras: panos.length, rot, fumaca, y: y0 };
  return info;
}

// o pódio: o palco baixo, os três degraus (1º no meio e mais alto), o fundo com o letreiro e as bandeiras, o tapete verde, branco e vermelho
function podio() {
  const m = new Montador(), S = solido(), g = new THREE.Group();
  m.caixa(S, [0, 2, 0], [92, 4, 40], { cor: "#2b2f36" });                                          // o palco
  for (let i = 0; i < 3; i++) m.caixa(S, [-30 + i * 30, 4.5, -16 + 0 * i], [8, 1, 3], { cor: ["#006847", "#f4f4f0", "#ce1126"][i] }); // o tapete (listras)
  for (const [x, h, c] of [[0, 14, "#ffd23f"], [-26, 10, "#d7dce1"], [26, 7, "#c98a4b"]]) {
    m.caixa(S, [x, 4 + h / 2, 2], [22, h, 16], { cor: "#f4f4f0" });
    m.caixa(S, [x, 4 + h / 2, 10.2], [22, h, 0.4], { cor: c });
  }
  m.caixa(S, [0, 20, -18], [92, 32, 3], { cor: "#1c2a24" });                                         // o fundo
  m.caixa(S, [-44, 22, -17], [4, 36, 5], { cor: "#aeb4ba" }); m.caixa(S, [44, 22, -17], [4, 36, 5], { cor: "#aeb4ba" });
  m.caixa(S, [0, 38.5, -17], [92, 3, 5], { cor: "#aeb4ba" });                                         // a viga de cima
  const base = m.montar("podio-mexico");
  const letreiroMx = new THREE.Mesh(new THREE.PlaneGeometry(88, 24), new THREE.MeshBasicMaterial({ map: marcaTex("mxmexico", 1024, 280) })); letreiroMx.position.set(0, 21, -16.4); base.add(letreiroMx);
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ map: bandeiraMexico(), side: THREE.DoubleSide }));
  for (const x of [-34, 34]) { const b = bd.clone(); b.position.set(x, 33, -16); b.scale.set(1.5, 1.5, 1); base.add(b); }
  g.add(base); g.name = "podio-mexico"; return g;
}

// a fumaça verde, branca e vermelha do campo: puffs em InstancedMesh que sobem, abrem e somem; só se mexe com a câmera perto
function fumacaMexicana(add, { x, y, z, a, b, rot }) {
  const N = 66, geo = new THREE.IcosahedronGeometry(1, 1), mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const m = add(new THREE.InstancedMesh(geo, mat, N)), c = new THREE.Color(), d = new THREE.Object3D(), r = sorteio(77);
  const cores = ["#00a86b", "#ffffff", "#e0242b"], puffs = [];
  for (let i = 0; i < N; i++) {
    const cor = i % 3, fila = Math.floor(i / 3), lado = (fila % 2 ? 1 : -1), px = (cor - 1) * 34 * 1.0 + lado * (a * 0.38) * (0.6 + r() * 0.4), pz = (r() - 0.5) * b * 0.9;
    puffs.push({ x: px, z: pz, fase: r(), vel: 0.08 + r() * 0.05, esc: 9 + r() * 7, deriva: (r() - 0.5) * 8 }); m.setColorAt(i, c.set(cores[cor]));
  }
  m.instanceColor.needsUpdate = true; m.name = "foro-fumaca"; m.frustumCulled = false;
  const posa = (t) => {
    puffs.forEach((p, i) => {
      const s = (p.fase + t * p.vel) % 1, h = s * 70, e = p.esc * (0.5 + s * 1.5);
      const lx = p.x + p.deriva * s, lz = p.z; const cs = Math.cos(rot), sn = Math.sin(rot);
      d.position.set(x + lx * cs + lz * sn, y + 1 + h + e * 0.3, z - lx * sn + lz * cs); d.scale.setScalar(Math.max(0.01, e * (1 - s * 0.35))); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  posa(0);
  return { N, animar: (t, foco) => { if (!foco || (foco.x - x) ** 2 + (foco.y - z) ** 2 < 900 ** 2) posa(t); }, mesh: m };
}
