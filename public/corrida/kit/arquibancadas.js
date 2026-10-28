// Kit de pista — as arquibancadas lotadas ao longo da pista: degraus com a galera sentada, o fundo, a marquise e as
// colunas. Cada trecho é uma fita que acompanha a curva. Põe em tr.arquibancadas (o som da torcida de som.js) e em
// tr.reservado (os enfeites soltos não entram).
//
// cfg: { trechos: [{ de, ate, lado, degraus, cor, encosto, cobertura }] }
//   de, ate: frações da volta (0 a 1, a partir da chegada) · lado: 1 ou -1, de que lado da pista (o sinal de p.nx)
//   degraus: quantas fileiras (9 unidades de fundo e 6 de altura cada) · cor, encosto: o assento e a borda dele
//   cobertura: marquise lá atrás (false deixa aberta) · torcida: as cores das camisas (lista; padrão: variadas)
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { recortar } from "./comum.js";

export function faixa(tr, add, i0, i1, l0, l1, y0, y1, mat, vLen = 40, uSpan = 1) {
  const { pts, n } = tr, vs = [], uv = [], idx = [];
  for (let i = i0; i <= i1; i++) {
    const p = pts[((i % n) + n) % n], d = (i - i0) * 6;
    vs.push(p.x + p.nx * l0, p.h + y0, p.y + p.ny * l0, p.x + p.nx * l1, p.h + y1, p.y + p.ny * l1); uv.push(0, d / vLen, uSpan, d / vLen);
    if (i < i1) { const a = (i - i0) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.castShadow = m.receiveShadow = true; return m;
}

// cada degrau é uma fileira: o encosto corre ao longo da pista (v) e a galera sentada por cima
const CAMISAS = ["#ffffff", "#e63946", "#ffd23f", "#1b1b1b", "#ff7ad9", "#43a047", "#f4f4f4"];
const cadeiras = (cor, encosto, fundo, camisas = CAMISAS) => new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, map: canvasTex(32, 256, (x, w, hh, rr) => {
  x.fillStyle = cor; x.fillRect(0, 0, w, hh); x.fillStyle = encosto; x.fillRect(w - 9, 0, 9, hh); x.fillStyle = fundo; for (let yy = 0; yy < hh; yy += 6) x.fillRect(0, yy, w - 9, 1);
  for (let yy = 1; yy < hh - 4; yy += 6) if (rr() < 0.8) { x.fillStyle = camisas[(rr() * camisas.length) | 0]; x.fillRect(8 + rr() * 8, yy, 6, 4); x.fillStyle = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a"][(rr() * 4) | 0]; x.fillRect(16 + rr() * 2, yy + 1, 3, 3); }
}) });

export function arquibancadas(tr, add, { trechos }) {
  const { pts, n } = tr, estrutura = M(0xd8dbe0, { roughness: 0.7, side: THREE.DoubleSide }), cobertura = M(0xf4f4f4, { roughness: 0.5, side: THREE.DoubleSide });
  const L = tr.wallLat < 1e9 ? tr.wallLat : tr.W / 2 + 30, colunaGeo = new THREE.CylinderGeometry(0.9, 0.9, 1, 6), materiais = new Map();
  tr.arquibancadas ||= []; tr.reservado ||= []; tr.arqDegraus ||= [];
  for (const { de, ate, lado = -1, degraus = 6, cor = "#1f5fbf", encosto = "#3f86e8", cobertura: coberta = true, torcida } of trechos) {
    let i0 = Math.floor(de * n), i1 = Math.floor(ate * n); if (i1 < i0) i1 += n;
    const chave = cor + encosto + (torcida || ""); if (!materiais.has(chave)) materiais.set(chave, cadeiras(cor, encosto, "#00000038", torcida));
    const l0 = lado * (L + 6), alto = degraus * 6 + 30;
    // num grampo ou ao lado de outro trecho da pista a arquibancada não cabe: fica só o pedaço onde ela fica onde foi desenhada
    const rec = recortar(tr, i0, i1, [l0, l0 + lado * degraus * 9]); if (!rec) continue;
    ({ i0, i1 } = rec);
    if (tr.noCorredor && Array.from({ length: Math.ceil((i1 - i0) / 4) + 1 }, (_, k) => pts[(i0 + k * 4) % n])
      .some((p) => tr.noCorredor(p.x + p.nx * l0, p.y + p.ny * l0))) continue;
    // os degraus são uma rampa só (a galera aparece de baixo também); a textura repete a fileira em cada 9 unidades
    faixa(tr, add, i0, i1, l0, l0 + lado * degraus * 9, 4, 4 + degraus * 6, materiais.get(chave), 48, degraus);
    faixa(tr, add, i0, i1, l0 + lado * degraus * 9, l0 + lado * degraus * 9, -8, 4 + degraus * 6 + 22, estrutura, 60); // o fundo
    faixa(tr, add, i0, i1, l0, l0, -8, 4, estrutura, 60);
    if (coberta) faixa(tr, add, i0, i1, l0 + lado * (degraus * 9 - 8), l0 + lado * (degraus * 9 + 4), 4 + degraus * 6 + 22, 4 + degraus * 6 + 25, cobertura, 60); // a marquise lá atrás (os assentos ficam à vista)
    const colunas = [];
    for (let i = i0; i <= i1; i += 10) { const p = pts[i % n]; for (const d of [l0 + lado * 2, l0 + lado * degraus * 9]) colunas.push([p.x + p.nx * d, p.h + alto / 2 - 4, p.y + p.ny * d]); }
    const cs = add(new THREE.InstancedMesh(colunaGeo, estrutura, colunas.length)), o = new THREE.Object3D();
    colunas.forEach(([x, y, z], k) => { o.position.set(x, y, z); o.scale.set(1, alto, 1); o.updateMatrix(); cs.setMatrixAt(k, o.matrix); }); cs.castShadow = true;
    for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; tr.reservado.push([p.x + p.nx * (l0 + lado * 30), p.y + p.ny * (l0 + lado * 30), 60]); }
    tr.arquibancadas.push([i0, i1]); // o som da torcida (kit/som.js)
    (tr.arqDegraus ||= []).push({ i0, i1, l0, lado, degraus }); // onde ficam os degraus: a torcida de vida.js senta neles
  }
}
