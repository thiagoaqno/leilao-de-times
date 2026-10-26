// Kit de pista — o corredor dos boxes (regras de F1): a faixa de asfalto ao lado da reta, com a linha branca da entrada e a
// vermelha da saída, a mureta entre ela e a pista, o quadrado pintado onde cada carro para e as 10 garagens com a cor
// de cada equipe. O traçado do corredor vem de `boxes` em ../pistas.js (frações da volta) e da conta de
// `F1Regras.corredor` (f1-regras.js), a mesma que o carro e os robôs usam para andar nele. Só pintura e cenário: quem
// segura o carro no corredor é box.js. Aparece só quando a sala usa as regras de F1 (`tr.mostrarBoxes`).
//
// cfg (tudo opcional):
//   asfalto: "#46484d"  — a cor do asfalto do corredor
//   cores: ["#e8002d", …] — a cor de cada garagem (10); sem isso elas ficam cinzas até o jogo pintar (grp.userData.colorir)
//   mureta: true | false — a mureta entre a pista e o corredor (padrão: sim, menos onde a pista já tem muro de rua)
//   garagens: false — só o corredor e os quadrados pintados, sem as garagens (Mônaco)
import * as THREE from "three";
import { canvasTex } from "../cena.js";
import { lotes } from "./comum.js";

export function boxesGP(tr, add, cfg = {}) {
  const F = window.F1Regras, cor = F.corredor(tr.t, tr.n, tr.W); if (!cor) return;
  const { pts, n, W } = tr, lado = cor.lado, meia = cor.larguraCorredor / 2, grp = new THREE.Group(), L = lotes();
  grp.name = `${tr.id}-boxes`; grp.visible = !!tr.mostrarBoxes; tr.boxesGP = grp; add(grp);
  const latDe = (u) => cor.lat(u, lado * (W / 2 - 10)), cores = cfg.cores;
  // o ponto da pista no ponto u (inteiro ou não) do corredor, com o lado `l`
  const em = (u, l) => {
    const i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = pts[i % n], b = pts[(i + 1) % n];
    const x = a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * l, y = a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * l;
    return { x, y, h: tr.chao(x, y) };
  };
  // uma fita de u0 a u1: de `la(u)` a `lb(u)`, na altura do chão + ya e + yb (iguais: fita deitada; lados iguais: parede)
  const fita = (mat, u0, u1, la, lb, ya, yb, vRep = 60) => {
    const l = L.de(mat), base = l.vs.length / 3, passos = Math.max(1, Math.ceil(u1 - u0));
    for (let k = 0; k <= passos; k++) {
      const u = u0 + ((u1 - u0) * k) / passos, a = em(u, la(u)), b = em(u, lb(u)), v = (u * 6) / vRep;
      l.vs.push(a.x, a.h + ya, a.y, b.x, b.h + yb, b.y); l.uv.push(0, v, 1, v);
      if (k < passos) { const q = base + k * 2; l.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
  };
  const desloc = (f) => (u) => latDe(u) + f;
  // materiais: asfalto escuro, a linha branca, a vermelha e o concreto da mureta (na frente do asfalto da pista, sem brigar)
  const poly = (o) => new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });
  const asfalto = poly({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = cfg.asfalto || "#46484d"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#0000001a" : "#ffffff12"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }) });
  const branco = poly({ color: 0xf1f1ec, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), vermelho = poly({ color: 0xd8232a, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const concreto = poly({ map: canvasTex(32, 32, (x, w, hh, rr) => { x.fillStyle = "#b9b6ad"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff20"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#7f7c74"; x.fillRect(0, 0, w, 3); }) });
  const y0 = 0.62, fim = cor.len;
  fita(asfalto, 0, fim, desloc(-meia), desloc(meia), y0, y0);
  // as bordas do corredor (a linha branca do lado da pista é a "linha branca de entrada") e as linhas de entrada e saída
  fita(branco, 1, fim - 1, desloc(-meia + 0.4), desloc(-meia + 1.8), y0 + 0.04, y0 + 0.04);
  fita(branco, 1, fim - 1, desloc(meia - 1.8), desloc(meia - 0.4), y0 + 0.04, y0 + 0.04);
  fita(branco, F.RAMPA - 1, F.RAMPA - 0.5, desloc(-meia), desloc(meia), y0 + 0.05, y0 + 0.05);
  fita(vermelho, fim - F.RAMPA, fim - F.RAMPA + 0.5, desloc(-meia), desloc(meia), y0 + 0.05, y0 + 0.05);
  // a mureta entre a pista e o corredor, só no trecho reto (nas rampas o carro cruza); pista de rua já tem o guard-rail
  if ((cfg.mureta ?? !tr.t.walls) !== false) {
    const lm = (u) => lado * (W / 2 + 12.5), a = F.RAMPA + 1, b = fim - F.RAMPA - 1, alt = 3.6;
    fita(concreto, a, b, lm, lm, 0, alt, 8); fita(concreto, a, b, (u) => lm(u) + lado * 2.4, (u) => lm(u) + lado * 2.4, alt, 0, 8);
    fita(concreto, a, b, lm, (u) => lm(u) + lado * 2.4, alt, alt, 8);
  }
  L.montar((o) => (grp.add(o), o), `${tr.id}-boxes`);
  // as garagens, os mecânicos e o quadrado pintado onde o carro para: tudo numa malha só, com a cor nos vértices. As
  // partes na cor da equipe ficam anotadas em "faixas" para "colorir" trocar (jogo.js pinta com a cor de quem usa cada uma)
  const geo = { vs: [], cs: [] }, faixas = cor.garagens.map(() => []), cor3 = (c) => new THREE.Color(c);
  // caixa com o centro em (a ao longo da pista, b para o lado de fora), de altura sy a partir de y, nos eixos da pista no ponto q
  const caixa = (q, tx, ty, nx, ny, a, b, y, sa, sb, sy, c, k = -1) => {
    const col = cor3(c), v0 = geo.vs.length / 3, cantos = [];
    for (const [ka, kb, ky] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
      const pa = a + (ka * sa) / 2, pb = b + (kb * sb) / 2;
      cantos.push([q.x + tx * pa + nx * pb, q.h + y + ((ky + 1) / 2) * sy, q.y + ty * pa + ny * pb]);
    }
    for (const f of [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]) for (const i of [f[0], f[1], f[2], f[0], f[2], f[3]]) { geo.vs.push(...cantos[i]); geo.cs.push(col.r, col.g, col.b); }
    if (k >= 0) faixas[k].push([v0, geo.vs.length / 3]);
  };
  const fundo = 16, alt = 14, pele = "#e2b48c", cinza = "#8c8f96", comGaragem = cfg.garagens !== false;
  cor.garagens.forEach((u, k) => {
    const i = cor.i0 + Math.floor(u), p = pts[i % n], tx = p.tx, ty = p.ty, nx = p.nx * lado, ny = p.ny * lado;
    const largura = Math.max(18, cor.gap * 6 * 0.92), q = em(u, cor.D), c = cfg.cores ? cfg.cores[k % cfg.cores.length] : cinza;
    const ref = { x: q.x + nx * meia, y: q.y + ny * meia, h: q.h }; // a borda do corredor, do lado das garagens
    if (comGaragem) {
      caixa(ref, tx, ty, nx, ny, 0, fundo - 0.7, -9, largura, 1.4, 9 + alt, c, k); // o fundo, na cor da equipe
      for (const s of [-1, 1]) caixa(ref, tx, ty, nx, ny, s * (largura / 2 - 0.4), fundo / 2, -9, 0.8, fundo, 9 + alt, "#cfcdc6"); // as laterais
      caixa(ref, tx, ty, nx, ny, 0, fundo / 2 - 1.5, alt, largura + 1.4, fundo + 3, 1.2, "#dcdad4"); // o teto, saindo para o corredor
      caixa(ref, tx, ty, nx, ny, 0, -2.4, alt - 5.5, largura + 1.4, 1.2, 5.5, c, k); // a faixa grande na frente, na cor da equipe
      caixa(ref, tx, ty, nx, ny, 0, fundo + 0.2, alt + 1.2, 7, 1, 6, c, k); caixa(ref, tx, ty, nx, ny, 0, fundo + 0.2, alt + 6.8, 9, 1, 1.4, "#f4f4f4"); // a placa da garagem em cima do teto
      // os mecânicos da equipe: macacão da cor dela e capacete, em fila na frente da garagem
      for (const s of [-1.5, -0.5, 0.5, 1.5]) {
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 0, 2.2, 1.8, 5.2, c, k);
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 5.2, 1.8, 1.6, 1.8, pele);
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 6.6, 2.1, 1.9, 1, "#f4f4f4");
      }
    }
    caixa(q, tx, ty, nx, ny, 0, 0, 0.7, 13, 8.5, 0.05, c, k); // o quadrado pintado no corredor onde o carro para
    caixa(q, tx, ty, nx, ny, 0, 0, 0.78, 11.5, 7, 0.05, "#2c2e33");
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(geo.vs, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(geo.cs, 3)); g.computeVertexNormals();
  const malha = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  malha.castShadow = malha.receiveShadow = true; malha.name = `${tr.id}-garagens`; grp.add(malha);
  // pinta as partes da equipe de cada garagem: cores[k] (ou cinza) vale para a garagem k
  grp.userData.colorir = (cores) => {
    const atr = g.attributes.color;
    faixas.forEach((lista, k) => { const col = cor3(cores[k] || cinza); for (const [v0, v1] of lista) for (let v = v0; v < v1; v++) atr.setXYZ(v, col.r, col.g, col.b); });
    atr.needsUpdate = true;
  };
  // os balizadores que ficariam no meio do corredor saem de cena enquanto ele aparece (as regras de F1)
  const noCorredor = (tr.cones || []).filter((co) => { for (let u = 0; u <= fim; u += 3) { const q = em(u, latDe(u)); if (Math.hypot(q.x - co.x, q.y - co.y) < meia + 6) return true; } return false; });
  grp.userData.mostrar = (on) => { grp.visible = on; for (const m of tr.guardaBox || []) m.visible = !on; for (const co of noCorredor) { co.mesh.visible = !on; co.cooldown = on ? Infinity : 0; } };
  // os enfeites soltos de depois não entram em cima das garagens
  for (let u = F.RAMPA; u <= fim - F.RAMPA; u += 8) { const q = em(u, cor.D + lado * 28); if (comGaragem) tr.reservado.push([q.x, q.y, 50]); }
  grp.userData.mostrar(!!tr.mostrarBoxes);
  tr.boxesInfo = { garagens: cor.garagens.length, comprimento: cor.comprimento, lado };
}
