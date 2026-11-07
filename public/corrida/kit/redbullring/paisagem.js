// Red Bull Ring — a paisagem da Estíria (peça só desta pista): o circuito está numa bacia de morros verdes que fecha três lados e se abre para o vale do
// lado dos boxes, com a mata de abetos em manchas, o pasto limpo entre elas, os fardos de feno e, no fundo, as montanhas. Aqui:
// 1. `mataEm`: onde é mata e onde é pasto (um ruído que repete sempre igual): as encostas, as árvores e os fardos concordam entre si;
// 2. `encostasVerdes`: o relevo de baixa resolução (uma malha só, cor por vértice: pasto, mata de abeto e clareira), que sobe nos três lados fechados
//    e quase não existe no lado do vale, longe do chão da pista (que continua o de pista.js);
// 3. `serrasDaEstiria`: as montanhas de longe em anel aberto para o vale, com a mata nas faldas e a pedra cinza nos cumes;
// 4. `bosqueDaBeira` e `florestaDeLonge`: as árvores (abetos escuros e altos, lariços claros, bétulas e faias), em InstancedMesh e sem sombra própria;
// 5. `fardosNosPastos`: os fardos redondos de feno no pasto perto da pista.
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";
import { ruido, lim, passo01, dentroDaVolta } from "./lugar.js";

/** 0 no pasto aberto e 1 na mata fechada (manchas de ~400 a ~900 de largura, com borda macia). */
export const mataEm = (x, z) => passo01(0.4, 0.58, ruido(x / 520, z / 520, 7) * 0.65 + ruido(x / 210, z / 210, 8) * 0.35);

/**
 * Os morros verdes em volta da bacia. `fecho(x, z)` (de lugar.js `abertura`) diz quanto da encosta vale em cada lado: 1 nos três lados fechados, quase 0 no vale.
 * @param {object} o { fecho, inicio=380, fim=1250, altura=300, margem=1500, passo=110, vazio: [[x, z, raio]], miolo: quanto do relevo vale dentro da volta (0,25) }
 * @returns {{alturaEm:(x:number,z:number)=>number, malha:THREE.Mesh}}
 */
export function encostasVerdes(tr, add, { fecho = () => 1, inicio = 380, fim = 1250, altura = 300, margem = 1500, passo = 110, vazio = [], miolo = 0.25 } = {}) {
  const { pts } = tr, mundoT = tr.t.world, x0 = -margem, nn = Math.ceil((mundoT + margem * 2) / passo), lado = nn + 1;
  const alt = new Float32Array(lado * lado), pos = new Float32Array(lado * lado * 3), cores = new Float32Array(lado * lado * 3);
  const pasto = new THREE.Color("#69a447"), pasto2 = new THREE.Color("#7fb34f"), feno = new THREE.Color("#a9b85a"), abetal = new THREE.Color("#244f2d"), mato = new THREE.Color("#3d7336"), pedra = new THREE.Color("#7c7a6f"), cor = new THREE.Color();
  for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) {
    const x = x0 + i * passo, z = x0 + j * passo, d = tr.distAt(x, z), k = j * lado + i;
    let m = passo01(inicio, fim, d) * fecho(x, z);
    if (m > 0 && d < 2600 && dentroDaVolta(pts, x, z)) m *= miolo; // dentro da volta, só ondulações
    for (const [cx, cz, r] of vazio) m *= passo01(r * 0.75, r * 1.5, Math.hypot(x - cx, z - cz));
    const f = ruido(x / 1300, z / 1300, 21) * 0.55 + ruido(x / 560, z / 560, 22) * 0.3 + ruido(x / 240, z / 240, 23) * 0.15;
    const h = m * (26 + altura * f * f);
    alt[k] = h; pos[k * 3] = x; pos[k * 3 + 1] = h - 3; pos[k * 3 + 2] = z;
    // a cor: pasto limpo ou mata de abeto, onde o mesmo ruído das árvores manda; as encostas altas ficam mais escuras e o topo mostra um pouco de pedra
    const t = lim(h / (altura * 0.62)), mata = mataEm(x, z), tufos = ruido(x / 120, z / 120, 31);
    cor.copy(pasto).lerp(pasto2, tufos).lerp(feno, passo01(0.7, 0.95, ruido(x / 260, z / 260, 33)) * 0.55);
    cor.lerp(mato, passo01(0.1, 0.5, t) * 0.7).lerp(abetal, mata * (0.55 + 0.45 * passo01(0.05, 0.3, t)));
    if (t > 0.82) cor.lerp(pedra, (t - 0.82) * 2.4);
    cores[k * 3] = cor.r; cores[k * 3 + 1] = cor.g; cores[k * 3 + 2] = cor.b;
  }
  const idx = [];
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const a = j * lado + i, b = a + 1, c = a + lado, d = c + 1;
    if (alt[a] + alt[b] + alt[c] + alt[d] < 0.5) continue; // onde não há morro nenhum não há triângulo
    if (Math.abs(alt[a] - alt[d]) < Math.abs(alt[b] - alt[c])) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const malha = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  malha.name = `${tr.id}-encostas`; malha.receiveShadow = false; malha.castShadow = false;
  const alturaEm = (x, z) => {
    const u = (x - x0) / passo, v = (z - x0) / passo; if (u < 0 || v < 0 || u >= nn || v >= nn) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = alt[j * lado + i], b = alt[j * lado + i + 1], c = alt[(j + 1) * lado + i], d = alt[(j + 1) * lado + i + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  tr.encostasAustria = { alturaEm, triangulos: idx.length / 3 };
  return { alturaEm, malha };
}

/**
 * As montanhas de longe: um anel em torno do mundo, baixo e aberto no lado do vale (`fecho`), com a mata escura nas faldas, os prados de altitude e a pedra
 * cinza nos cumes, e a bruma azulada que cresce com a distância. Sem neblina do jogo (`fog: false`) para não sumirem.
 * @param {object} o { fecho, raioDentro=3250, raioFora=5200, altura=1250, rocha="#8a8880", mato="#34603a", longe="#9db0c2" }
 */
export function serrasDaEstiria(tr, add, { fecho = () => 1, raioDentro = 3250, raioFora = 5200, altura = 1250, rocha = "#8a8880", mato = "#34603a", longe = "#9db0c2", segmentos = 140, aneis = 14 } = {}) {
  const mundoT = tr.t.world, cx = mundoT / 2, cz = mundoT / 2, pos = [], cores = [], idx = [], cR = new THREE.Color(rocha), cM = new THREE.Color(mato), cL = new THREE.Color(longe), cP = new THREE.Color("#6f9a47"), c = new THREE.Color();
  for (let a = 0; a <= segmentos; a++) for (let r = 0; r <= aneis; r++) {
    const ang = (a / segmentos) * Math.PI * 2, t = r / aneis, raio = raioDentro + (raioFora - raioDentro) * t, x = cx + Math.cos(ang) * raio, z = cz + Math.sin(ang) * raio;
    const crista = altura * (0.55 + 0.45 * ruido(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, 41)) * (0.12 + 0.88 * fecho(x, z)) * (0.8 + 0.5 * ruido(ang * 3.1, 7.7, 43));
    const dentes = (ruido(x / 520, z / 520, 47) - 0.5) * 380 * t;
    const h = Math.max(-20, crista * Math.pow(t, 1.15) + dentes - 30);
    pos.push(x, h, z);
    const alto = lim(h / (altura * 0.8)), cume = lim((alto - 0.45) * 2.2 + (ruido(x / 300, z / 300, 49) - 0.5) * 0.6);
    c.copy(cM).lerp(cP, passo01(0.3, 0.7, ruido(x / 400, z / 400, 51)) * 0.4 * (1 - alto)).lerp(cR, cume).lerp(cL, 0.1 + 0.4 * t);
    cores.push(c.r, c.g, c.b);
    if (a < segmentos && r < aneis) { const i0 = a * (aneis + 1) + r, i1 = i0 + 1, i2 = i0 + aneis + 1, i3 = i2 + 1; idx.push(i0, i1, i2, i1, i3, i2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false, side: THREE.DoubleSide })));
  m.name = `${tr.id}-serras`; m.castShadow = false; m.receiveShadow = false; tr.serrasAustria = idx.length / 3;
  return m;
}

// ---- as árvores ----
const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
function instanciar(add, geo, mat, lista, nome) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, lista.length)), d = new THREE.Object3D();
  lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
  m.castShadow = false; m.receiveShadow = false; m.name = nome; colorir(m, lista); return m;
}
function juntar(gs) {
  const pos = [], nor = [], idx = []; let base = 0;
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(base + i); } base += p.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(idx); return r;
}
// a pícea: quatro cones abertos empilhados, cada um mais fino, de 1 de altura e 1 de raio na base; `simples` tem menos lados, para a mata de longe
export function geoPiceia(simples = false) {
  const gs = [], lados = simples ? 4 : 6;
  [[1, 0.36, 0.02], [0.78, 0.34, 0.24], [0.56, 0.32, 0.46], [0.34, 0.3, 0.68]].forEach(([r, h, y]) => { const c = new THREE.ConeGeometry(r, h * 1.25, lados, 1, true); c.translate(0, y + (h * 1.25) / 2, 0); gs.push(c); });
  return juntar(gs);
}
const geoCopa = () => juntar([[0, 0.06, 0, 0.72], [0.34, -0.08, 0.12, 0.5]].map(([x, y, z, r]) => { const s = new THREE.IcosahedronGeometry(r, 0); s.translate(x, y, z); return s; }));
export const VERDES_PICEA = ["#1b4527", "#1f4f2c", "#235a31", "#183c24", "#2a6137", "#1d4a2a"];
const VERDES_LARICIO = ["#8fae3e", "#a3b83f", "#7fa23a"], VERDES_BETULA = ["#7fae45", "#8cb84c", "#6f9f3c", "#9cc254"], VERDES_FAIA = ["#4d8a3a", "#3f7a33", "#5c9a40", "#6e9a35"];
const material = () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });

/**
 * A mata da beira: logo depois da cerca, árvores altas dos dois lados onde `mataEm` manda (o pasto fica aberto), menos onde há arquibancada, prédio ou outro
 * trecho da pista. A fileira da frente tem mais folhosa e lariço (a borda clara da mata); atrás vem o abetal escuro.
 * @param {object} cfg { recuo=70, fundo=300, passo=2, densidade=1.6, alturas=[170, 300], semente, de, ate, evitar: [{ f0, f1, lado, lat0, lat1 }] }
 */
export function bosqueDaBeira(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 4242), d0 = W / 2 + (cfg.recuo ?? 70), fundo = cfg.fundo ?? 300, [aMin, aMax] = cfg.alturas || [170, 300];
  const densidade = cfg.densidade ?? 1.6, passo = cfg.passo ?? 2, ate = cfg.ate ?? 1, de = cfg.de ?? 0, evitar = cfg.evitar || [];
  const piceas = [], copas = [], troncos = [];
  for (let i = Math.floor(de * n); i < Math.floor(ate * n); i += passo) {
    const p = pts[((i % n) + n) % n];
    for (const lado of [-1, 1]) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const frente = r() < 0.3, d = d0 + (frente ? r() * 60 : 40 + r() * r() * fundo), x = p.x + p.nx * lado * d + (r() - 0.5) * 18, z = p.y + p.ny * lado * d + (r() - 0.5) * 18;
      const mata = mataEm(x, z); if (r() > (frente ? 0.25 + 0.75 * mata : mata * mata)) continue; // o pasto fica aberto; só uma árvore solta aqui e ali
      const folhosa = frente ? r() < 0.32 : r() < 0.1, alt = aMin + r() * (aMax - aMin) * (folhosa ? 0.62 : 1), larg = alt * (folhosa ? 0.4 + r() * 0.12 : 0.2 + r() * 0.06);
      if (evitar.some((q) => q.lado === lado && i >= q.f0 * n && i <= q.f1 * n && d + larg > q.lat0 - 10 && d - larg < q.lat1 + 14)) continue;
      const rm = tr.murosEscape?.[lado]?.[i % n]; if (rm && d - larg < W / 2 + rm + 10) continue; // entre a pista e a barreira, nada
      if (!livre(tr, x, z, larg + 12) || ocupado(tr, x, z, i % n)) continue;
      const y = tr.chao(x, z) - 1.5;
      if (folhosa) {
        const tipo = r(), c = tipo < 0.4 ? VERDES_LARICIO[(r() * 3) | 0] : tipo < 0.7 ? VERDES_BETULA[(r() * 4) | 0] : VERDES_FAIA[(r() * 4) | 0];
        copas.push({ x, y: y + alt * 0.66, z, sx: larg, sy: alt * 0.36, sz: larg, r: r() * 6, c });
        troncos.push({ x, y: y + alt * 0.28, z, sx: alt * 0.022, sy: alt * 0.56, sz: alt * 0.022, c: tipo >= 0.4 && tipo < 0.7 ? "#e9e7df" : "#5b4a38" });
      } else piceas.push({ x, y, z, sx: larg, sy: alt, sz: larg, r: r() * 6, c: VERDES_PICEA[(r() * VERDES_PICEA.length) | 0] });
    }
  }
  const mat = material();
  instanciar(add, geoPiceia(), mat, piceas, `${tr.id}-piceas`);
  instanciar(add, geoCopa(), mat, copas, `${tr.id}-folhosas`);
  instanciar(add, new THREE.CylinderGeometry(0.8, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncos, `${tr.id}-troncos`);
  tr.bosqueAustria = { piceas: piceas.length, folhosas: copas.length };
  return tr.bosqueAustria;
}

/** A mata de longe, por cima dos morros e da planície: abetal nas manchas de `mataEm` e prados no resto. @param {object} rel o resultado de `encostasVerdes` */
export function florestaDeLonge(tr, add, rel, { passo = 100, minDist = 250, densidade = 1, semente = 5171, ext = 1300, fecho = () => 1 } = {}) {
  const r = sorteio(semente), mundoT = tr.t.world, piceas = [], copas = [], troncos = [];
  for (let x = -ext; x < mundoT + ext; x += passo) for (let z = -ext; z < mundoT + ext; z += passo) {
    const px = x + (r() - 0.5) * passo * 0.9, pz = z + (r() - 0.5) * passo * 0.9, d = tr.distAt(px, pz);
    if (d < minDist) continue;
    const mata = mataEm(px, pz), prob = lim((d - minDist) / 400, 0.15, 1) * densidade * mata * (0.35 + 0.65 * fecho(px, pz)); // o vale aberto tem menos mata e mais pasto
    if (r() > prob || ocupado(tr, px, pz)) continue;
    const y = Math.max(tr.chao(px, pz), rel.alturaEm(px, pz) - 3) - 1.5, alto = 150 + r() * 190;
    if (ruido(px / 260, pz / 260, 17) > 0.76 && r() < 0.7) {
      const w = alto * 0.38; copas.push({ x: px, y: y + alto * 0.36, z: pz, sx: w, sy: alto * 0.3, sz: w, r: r() * 6, c: (r() < 0.5 ? VERDES_LARICIO : VERDES_FAIA)[(r() * 3) | 0] });
      troncos.push({ x: px, y: y + alto * 0.15, z: pz, sx: alto * 0.02, sy: alto * 0.3, sz: alto * 0.02, c: "#6a5a45" });
    } else { const w = alto * (0.2 + r() * 0.06); piceas.push({ x: px, y, z: pz, sx: w, sy: alto, sz: w, r: r() * 6, c: VERDES_PICEA[(r() * VERDES_PICEA.length) | 0] }); }
  }
  const mat = material();
  instanciar(add, geoPiceia(true), mat, piceas, `${tr.id}-piceas-longe`);
  instanciar(add, geoCopa(), mat, copas, `${tr.id}-folhosas-longe`);
  instanciar(add, new THREE.CylinderGeometry(0.8, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncos, `${tr.id}-troncos-longe`);
  tr.florestaAustria = { piceas: piceas.length, folhosas: copas.length };
  return tr.florestaAustria;
}

/** Os fardos redondos de feno nos pastos perto da pista (só onde a mata é rala, longe da pista e fora do que está reservado). @param {object} cfg { semente, quantos=120, de=60, ate=360 } */
export function fardosNosPastos(tr, add, { semente = 6161, quantos = 120, de = 60, ate = 360 } = {}) {
  const { pts, n, W } = tr, r = sorteio(semente), fardos = [];
  for (let tent = 0; tent < quantos * 12 && fardos.length < quantos; tent++) {
    const p = pts[Math.floor(r() * n)], lado = r() < 0.5 ? -1 : 1, d = W / 2 + de + r() * (ate - de), x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (mataEm(x, z) > 0.25 || !livre(tr, x, z, de - 10) || ocupado(tr, x, z)) continue;
    const y = tr.chao(x, z) - 1.5, rot = r() * 6.28, grupo = 1 + ((r() * 3) | 0);
    for (let k = 0; k < grupo; k++) { const gx = x + Math.cos(rot) * k * 15, gz = z + Math.sin(rot) * k * 15; if (!livre(tr, gx, gz, de - 10) || ocupado(tr, gx, gz)) continue; fardos.push({ x: gx, y: y + 6, z: gz, sx: 1, sy: 1, sz: 1, r: rot }); }
  }
  const geo = new THREE.CylinderGeometry(6.5, 6.5, 12, 10); geo.rotateZ(Math.PI / 2);
  instanciar(add, geo, M(0xd8bd62, { roughness: 1, flatShading: true }), fardos.map((o) => ({ ...o, c: "#ffffff" })), `${tr.id}-fardos`);
  tr.fardosAustria = fardos.length;
  return fardos.length;
}
