// Singapura — o Pit Building: o prédio permanente dos boxes ao lado da reta de chegada, em frente ao Singapore Flyer, de acordo com as fotos: base de
// concreto claro com faixa de vidro, e por cima o telhado verde-escuro que avança curvo sobre as garagens (a grande concha de aço). O corredor, a mureta
// e as garagens são do kit (kit/corredor-boxes.js, que manda na lógica do pit stop); aqui só o prédio atrás delas, as torres de controle e a faixa de
// luz noturna. Fica sempre visível (fora das regras de F1 também).
import * as THREE from "three";
import { M } from "../../cena.js";
import { materialDaNoite } from "../bahrein/base.js";

export function pitBuilding(tr, add) {
  const F = window.F1Regras, cor = F?.corredor(tr.t, tr.n, tr.W); if (!cor) return;
  const { pts, n } = tr, lado = cor.lado, G = new Map(), g = (mat) => { if (!G.has(mat)) G.set(mat, { vs: [], uv: [], cs: [], idx: [] }); return G.get(mat); };
  const parede = M(0xffffff, { roughness: 0.85, vertexColors: true, side: THREE.DoubleSide }), telhado = M(0xffffff, { roughness: 0.55, metalness: 0.35, vertexColors: true, side: THREE.DoubleSide }), vidro = materialDaNoite(tr, "#3f5c6e", "#ffe9b8", { side: THREE.DoubleSide, fog: true });
  const col = (c) => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
  const quad = (mat, A, B, C2, D2, cor2) => { const L = g(mat), k = L.vs.length / 3, c = col(cor2); for (const P of [A, B, C2, D2]) { L.vs.push(...P); L.cs.push(...c); L.uv.push(0, 0); } L.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const em = (u, l, y) => { const i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = pts[i % n], b = pts[(i + 1) % n]; const px = a.x + (b.x - a.x) * f, pz = a.y + (b.y - a.y) * f, nx = a.nx + (b.nx - a.nx) * f, nz = a.ny + (b.ny - a.ny) * f, h = a.h + (b.h - a.h) * f; return [px + nx * l, h + y, pz + nz * l]; };
  const lf = cor.garagemLat + lado * 22, prof = 112, lb = lf + lado * prof, alto = 58, beiral = 20;
  const u0 = 0, u1 = cor.len, passo = 4;
  for (let u = u0; u < u1; u += passo) {
    const v = Math.min(u + passo, u1);
    const fb = (uu) => em(uu, lf, 0), ft = (uu) => em(uu, lf, alto), bb = (uu) => em(uu, lb, 0), bt = (uu) => em(uu, lb, alto + 6);
    quad(parede, fb(u), fb(v), ft(v), ft(u), "#cdcdc6"); // a frente de concreto
    quad(vidro, em(u, lf - lado * 0.4, alto * 0.42), em(v, lf - lado * 0.4, alto * 0.42), em(v, lf - lado * 0.4, alto * 0.86), em(u, lf - lado * 0.4, alto * 0.86), "#ffffff"); // a faixa de vidro, acesa à noite
    quad(parede, bb(v), bb(u), bt(u), bt(v), "#bdbdb6"); // o fundo
    // a concha verde: a borda da frente avança sobre as garagens e fica mais alta; desce até o fundo
    const topo = (uu, l, y) => em(uu, l, y);
    const ondulacao = 1 + 0.12 * Math.sin((u / (u1 - u0)) * Math.PI * 3);
    const yF = alto + 14 * ondulacao, yB = alto + 4;
    quad(telhado, topo(u, lf - lado * beiral, yF), topo(v, lf - lado * beiral, yF), topo(v, lb, yB), topo(u, lb, yB), "#2f4a32"); // a face de cima
    quad(telhado, topo(u, lf - lado * beiral, yF - 6), topo(u, lf - lado * beiral, yF), topo(v, lf - lado * beiral, yF), topo(v, lf - lado * beiral, yF - 6), "#1f3322"); // a espessura da borda
    quad(telhado, topo(u, lf, alto), topo(v, lf, alto), topo(v, lf - lado * beiral, yF - 6), topo(u, lf - lado * beiral, yF - 6), "#15221a"); // por baixo da concha
  }
  // as pontas do prédio: o paredão inclinado de verde (o "talude" do fim do prédio na foto)
  for (const [uu, s] of [[u0, -1], [u1, 1]]) {
    quad(parede, em(uu, lf, 0), em(uu, lb, 0), em(uu, lb, alto + 4), em(uu, lf, alto), "#bfbfb8");
    quad(telhado, em(uu, lf - lado * beiral, alto + 8), em(uu, lb, alto + 4), em(uu, lb, 0), em(uu - s * 26, lf, 0), "#27402b");
  }
  for (const [mat, L] of G) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(L.vs, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(L.cs, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(L.uv, 2)); geo.setIndex(L.idx); geo.computeVertexNormals();
    const m = add(new THREE.Mesh(geo, mat)); m.castShadow = true; m.receiveShadow = true; m.name = "singapura-pit-building"; m.userData.semContato = true;
  }
  // o terreno reservado: nada (árvore, prédio, poste) nasce dentro
  for (let u = 0; u <= cor.len; u += 16) { const [x, , z] = em(u, lf + lado * prof * 0.5, 0); (tr.reservado ||= []).push([x, z, prof * 0.7]); }
  tr.pitBuildingSG = { u: cor.len, prof, alto };
}
