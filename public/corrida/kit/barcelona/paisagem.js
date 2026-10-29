// Barcelona — a paisagem de fundo de Montmeló: as serras (Sant Llorenç del Munt e Montserrat, de paredões de conglomerado ocre sobre o pinhal;
// o Montseny azulado ao norte; as colinas baixas do litoral) e os povoados do Vallès (casas de telha, a igreja, as naves industriais).
// As serras são malhas de relevo pintadas por altura (mato escuro embaixo, a rocha cor de ferrugem em cima), sem neblina como o `montanha` do
// kit; os povoados são dois InstancedMesh (paredes e telhados) espalhados longe da pista.
import * as THREE from "three";
import { instancias, sorteio } from "../comum.js";

const cor = (c) => new THREE.Color(c);
const ruido = (x, z) => Math.sin(x / 233 + z / 171) * Math.cos(x / 97 - z / 143) + 0.5 * Math.sin(x / 61 + z / 37);

/**
 * Uma serra no horizonte, além do fim do chão.
 * @param {object} cfg · angulo: a direção a partir do centro (-π/2 é o norte) · afastamento · altura (a crista média) · largura · tipo: "mesa" (paredões de
 * conglomerado com o topo reto, Sant Llorenç), "agulhas" (Montserrat, os pináculos) ou "onda" (Montseny e o litoral, só um perfil redondo) · mato, rocha, longe: as cores
 */
export function serra(tr, add, { angulo = -2.4, afastamento = 1500, altura = 760, largura = 6200, tipo = "mesa", mato = "#3d5233", rocha = "#b07a55", longe = "#9fb2c2", semente = 1 } = {}) {
  const mundo = tr.t.world, fundo = 2400, geo = new THREE.PlaneGeometry(largura, fundo, 150, 24); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cores = [], cR = cor(rocha), cM = cor(mato), cL = cor(longe), c = new THREE.Color(), r = sorteio(semente * 7919), fase = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), t = (fundo / 2 - z) / fundo; // 0 na frente, 1 lá atrás
    let crista = altura * (0.78 + 0.16 * Math.sin(x / 1300 + fase) + 0.1 * Math.sin(x / 520 + fase * 2) + 0.05 * Math.sin(x / 190));
    if (tipo === "mesa") { // o topo reto dos paredões, em degraus, cortado por canhões
      const degrau = Math.round((crista / altura) * 5) / 5; crista = altura * (degrau * 0.9 + 0.12) * (1 - 0.18 * Math.max(0, Math.sin(x / 140 + fase)) ** 3);
    } else if (tipo === "agulhas") { // os pináculos de Montserrat: dentes finos em cima da crista
      crista += altura * 0.28 * Math.max(0, Math.sin(x / 95 + fase)) ** 2 * (0.5 + 0.5 * Math.sin(x / 410));
    }
    const h = crista * Math.pow(t, tipo === "onda" ? 0.9 : 0.62) + ruido(x, z) * 30 * t - 8;
    pos.setY(i, h);
    const alto = Math.min(1, Math.max(0, h / (altura * 0.95))), pedra = tipo === "onda" ? alto * 0.35 : Math.min(1, Math.max(0, (alto - 0.5) * 2.4) + (ruido(x * 1.9, z * 1.4) * 0.5 + 0.5) * 0.12 * alto);
    c.copy(cM).lerp(cR, pedra).lerp(cL, (tipo === "onda" ? 0.5 : 0.1) + 0.28 * t); cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); geo.computeVertexNormals();
  const m = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false })));
  const dist = mundo / 2 + afastamento + fundo / 2;
  m.position.set(mundo / 2 + Math.cos(angulo) * dist, 0, mundo / 2 + Math.sin(angulo) * dist); m.rotation.y = Math.atan2(-Math.cos(angulo), -Math.sin(angulo));
  m.name = `${tr.id}-serra-${tipo}`; return m;
}

/**
 * Os povoados do Vallès: aglomerados de casas de paredes ocres e brancas com telhado de quatro águas em telha, com a torre da igreja no meio,
 * e as naves industriais (brancas e cinza, de teto plano) dos polígonos de Montmeló. Só em lugar baixo, longe da pista.
 * @param {object} cfg · povoados (4) · industriais (3) · semente · afastamento: a distância mínima da pista (620)
 */
export function povoados(tr, add, cfg = {}) {
  const r = sorteio(cfg.semente ?? 77), { pts, n } = tr, mundo = tr.t.world, pad = 1200, minimo = cfg.afastamento ?? 620;
  const paredes = [], telhados = [], naves = [], tetos = [];
  const centros = (qtd, raioMin) => { // pontos longe da pista e entre si, em terreno baixo
    const lista = [];
    for (let tent = 0; tent < 4000 && lista.length < qtd; tent++) {
      const x = -pad + 200 + r() * (mundo + 2 * pad - 400), z = -pad + 200 + r() * (mundo + 2 * pad - 400);
      if (tr.distAt(x, z) < minimo || tr.chao(x, z) > 6 || lista.some(([a, b]) => Math.hypot(a - x, b - z) < raioMin)) continue;
      lista.push([x, z]);
    }
    return lista;
  };
  const OCRES = ["#e3cfa6", "#d9b98a", "#eadfc4", "#f0ebe0", "#d4a77a", "#e8d7b5", "#cfae80"], TELHAS = ["#a5503a", "#b25b3d", "#94452f", "#b8694a"];
  for (const [cx, cz] of centros(cfg.povoados ?? 4, 900)) {
    const raio = 170 + r() * 190, rot = r() * 3, k = Math.round(raio * raio / 1500);
    for (let j = 0; j < k; j++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * raio, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = tr.chao(x, z) - 1.5;
      const w = 34 + r() * 40, p = 30 + r() * 36, h = 40 + r() * 70 * (1 - d / raio * 0.5), ry = rot + Math.round(r() * 2) * 1.5708 + (r() - 0.5) * 0.2, c = OCRES[(r() * OCRES.length) | 0];
      paredes.push({ x, y: y + h / 2, z, sx: w, sy: h, sz: p, r: ry, c });
      telhados.push({ x, y: y + h + 12, z, sx: w * 0.98, sy: 24, sz: p * 0.98, r: ry + 0.785, c: TELHAS[(r() * TELHAS.length) | 0] });
    }
    const y = tr.chao(cx, cz) - 1.5; // a igreja: nave e torre de campanário
    paredes.push({ x: cx, y: y + 45, z: cz, sx: 46, sy: 90, sz: 80, r: rot, c: "#e8dcc0" }, { x: cx + 22, y: y + 100, z: cz, sx: 22, sy: 200, sz: 22, r: rot, c: "#d9c9a2" });
    telhados.push({ x: cx, y: y + 100, z: cz, sx: 40, sy: 26, sz: 64, r: rot + 0.785, c: "#a5503a" }, { x: cx + 22, y: y + 212, z: cz, sx: 18, sy: 34, sz: 18, r: rot + 0.785, c: "#7d4a3a" });
  }
  for (const [cx, cz] of centros(cfg.industriais ?? 3, 900)) {
    const rot = r() * 1.57, k = 8 + Math.floor(r() * 7);
    for (let j = 0; j < k; j++) {
      const x = cx + (r() - 0.5) * 520, z = cz + (r() - 0.5) * 380, y = tr.chao(x, z) - 1.5, w = 120 + r() * 200, p = 90 + r() * 140, h = 38 + r() * 50;
      naves.push({ x, y: y + h / 2, z, sx: w, sy: h, sz: p, r: rot, c: ["#e6e8ea", "#cfd3d6", "#f2f2ee", "#b9c2c9", "#dfe2e4"][(r() * 5) | 0] });
      tetos.push({ x, y: y + h + 2, z, sx: w * 1.02, sy: 4, sz: p * 1.02, r: rot, c: ["#8d9aa6", "#a7b0b8", "#7f8c97"][(r() * 3) | 0] });
    }
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1), piramide = new THREE.ConeGeometry(0.72, 1, 4);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const colore = (m, lista) => { if (!m) return; const c = new THREE.Color(); lista.forEach((o, k) => m.setColorAt(k, c.set(o.c))); m.instanceColor.needsUpdate = true; };
  colore(instancias(add, caixa, mat, paredes.concat(naves), { sombra: false, nome: `${tr.id}-povoados-paredes` }), paredes.concat(naves));
  colore(instancias(add, piramide, mat, telhados, { sombra: false, nome: `${tr.id}-povoados-telhados` }), telhados);
  colore(instancias(add, caixa, mat, tetos, { sombra: false, nome: `${tr.id}-povoados-tetos` }), tetos);
  tr.povoadosBCN = { casas: paredes.length, naves: naves.length };
}
