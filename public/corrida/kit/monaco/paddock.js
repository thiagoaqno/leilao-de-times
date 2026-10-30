// Mônaco — o paddock do cais: as hospitalidades das equipes (motorhomes de dois andares, brancos, com a faixa e o toldo na cor da equipe e o nome no letreiro), as tendas brancas de apoio com a
// estrutura de pagode e o paddock flutuante, uma barcaça ancorada no Port Hercule com tendas em cima, como o de verdade. Só peças de Mônaco (nada do kit). Tudo em InstancedMesh e um atlas de letreiros.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { instancias } from "../comum.js";
import { fundoMonaco, NIVEL_DO_MAR, D } from "./mundo.js";

const EQUIPES = [["McLaren", "#ff8700"], ["Ferrari", "#e8002d"], ["Mercedes", "#27f4d2"], ["Red Bull", "#3671c6"], ["Racing Bulls", "#6692ff"], ["Aston Martin", "#229971"], ["Williams", "#37bedd"], ["Audi", "#d7172f"], ["Alpine", "#ff87bc"], ["Haas", "#c6cbd0"]];

export function paddockMonaco(tr, add, hAt) {
  const { pts, n } = tr, L = tr.wallLat, [f0, f1] = D.frac.trechos.cais, i0 = Math.floor((f0 - 0.05) * n), i1 = Math.floor((f1 + 0.05) * n), caixa = new THREE.BoxGeometry(1, 1, 1);
  const livre = (x, z, i, d, folga) => fundoMonaco(tr, x, z) < -3 && !tr.predioEmMonaco?.(x, z, folga * 0.6) && tr.distAt(x, z) > tr.W / 2 + folga && !tr.coberto?.(i) && !tr.noCorredor?.(x, z) && !(tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < (rr * 0.6) ** 2)
    && !(tr.arqDegraus || []).some((q) => ((i - q.i0 + n) % n) <= q.i1 - q.i0 + 6 && d < Math.abs(q.l0) + 9 * q.degraus + 10);
  const casas = [], faixas = [], toldos = [], tendas = [], tetos = [], letreiros = [];
  let k = 0;
  for (let i = i0; i < i1 && k < EQUIPES.length; i += 9) {
    const p = pts[i % n];
    if (casas.some((c) => (c.x - p.x) ** 2 + (c.z - p.y) ** 2 < 70 ** 2)) continue;
    for (const l of [1, -1]) for (const dd of [34, 46, 60]) {
      const d = L + dd, x = p.x + p.nx * l * d, z = p.y + p.ny * l * d;
      if (!livre(x, z, i % n, d, 28)) continue;
      const y = hAt(x, z), r = Math.atan2(-p.ty, p.tx), [nome, c] = EQUIPES[k];
      const frente = (a, b, h) => ({ x: x + p.tx * a - p.nx * l * b, y: y + h, z: z + p.ty * a - p.ny * l * b }); // b: para o lado da pista
      casas.push({ x, y: y + 11, z, r, sx: 34, sy: 22, sz: 20 }); // o motorhome de dois andares
      faixas.push({ ...frente(0, 10.2, 9), r, sx: 34.4, sy: 3, sz: 0.8, c }); // a faixa da equipe, no meio da fachada
      toldos.push({ ...frente(0, 13.5, 6.4), r, sx: 30, sy: 0.6, sz: 7, c }); // o toldo da hospitalidade, na cor da equipe
      for (const s of [-1, 1]) toldos.push({ ...frente(s * 14, 16.4, 3.2), r, sx: 0.6, sy: 6.4, sz: 0.6, c: "#d9d9d6" });
      letreiros.push({ ...frente(0, 10.4, 17.4), t: [p.tx, p.ty], k, larg: 26 });
      (tr.reservado ||= []).push([x, z, 34]); k++; break;
    }
  }
  // as tendas brancas de apoio, em pagode (base quadrada e teto de quatro águas), entre as hospitalidades
  for (let i = i0 + 4; i < i1 && tendas.length < 14; i += 7) {
    const p = pts[i % n];
    if (tendas.some((c) => (c.x - p.x) ** 2 + (c.z - p.y) ** 2 < 46 ** 2)) continue;
    for (const l of [1, -1]) for (const dd of [26, 36, 50]) {
      const d = L + dd, x = p.x + p.nx * l * d, z = p.y + p.ny * l * d;
      if (!livre(x, z, i % n, d, 18)) continue;
      const y = hAt(x, z), r = Math.atan2(-p.ty, p.tx);
      tendas.push({ x, y: y + 5, z, r, sx: 20, sy: 10, sz: 14 }); tetos.push({ x, y: y + 13, z, r: r + Math.PI / 4, sx: 22, sy: 8, sz: 22 });
      (tr.reservado ||= []).push([x, z, 22]); break;
    }
  }
  const M2 = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const colorida = (lista, mat, nome) => { // instâncias com a cor da equipe
    if (!lista.length) return; const m = add(new THREE.InstancedMesh(caixa, mat, lista.length)), o = new THREE.Object3D(), c = new THREE.Color(); m.name = nome; m.castShadow = false; m.receiveShadow = true;
    lista.forEach((a, j) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(a.sx, a.sy, a.sz); o.updateMatrix(); m.setMatrixAt(j, o.matrix); m.setColorAt(j, c.set(a.c)); }); m.instanceColor.needsUpdate = true;
  };
  instancias(add, caixa, M2(0xf4f2ec, { roughness: 0.6 }), casas, { nome: "monaco-hospitalidade", sombra: false });
  colorida(faixas, M2(0xffffff), "monaco-hospitalidade-faixa"); colorida(toldos, M2(0xffffff, { roughness: 0.6 }), "monaco-hospitalidade-toldo");
  instancias(add, caixa, M2(0xf6f6f2), tendas, { nome: "monaco-tenda-apoio", sombra: false });
  instancias(add, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), M2(0xefeee8), tetos, { nome: "monaco-tenda-apoio-teto", sombra: false });
  // os letreiros das hospitalidades (um atlas, uma malha)
  if (letreiros.length) {
    const H = 64, atlas = canvasTex(512, H * EQUIPES.length, (x, w) => EQUIPES.forEach(([nome, c], j) => { x.fillStyle = "#101319"; x.fillRect(0, j * H, w, H); x.fillStyle = c; x.fillRect(0, j * H + H - 8, w, 8); x.fillStyle = "#ffffff"; x.font = "900 34px Arial Black, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(nome.toUpperCase() + "  HOSPITALITY", w / 2, j * H + H / 2 - 3, w - 16); }), false);
    const vs = [], uv = [], idx = [];
    for (const s of letreiros) { const q = vs.length / 3, w = s.larg / 2; for (const [a, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { vs.push(s.x + s.t[0] * w * a, s.y + 2.2 * v, s.z + s.t[1] * w * a); uv.push((a + 1) / 2, 1 - (s.k + (1 - v) / 2) / EQUIPES.length); } idx.push(q, q + 1, q + 2, q, q + 2, q + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide }))); m.name = "monaco-hospitalidade-letreiro";
  }
  // o paddock flutuante: uma barcaça ancorada no porto, ao lado do cais, com tendas brancas e a faixa de cada equipe
  let barca = null;
  for (let i = i0 + 40; i < i1 && !barca; i += 12) {
    const p = pts[i % n];
    for (const l of [1, -1]) {
      const ok = [-90, 0, 90].every((s) => [0, 70].every((d) => fundoMonaco(tr, p.x + p.nx * l * (L + 180 + d) + p.tx * s, p.y + p.ny * l * (L + 180 + d) + p.ty * s) > 30));
      if (!ok) continue;
      const x = p.x + p.nx * l * (L + 215), z = p.y + p.ny * l * (L + 215), r = Math.atan2(-p.ty, p.tx);
      barca = { x, z, r, p, l }; break;
    }
  }
  if (barca) {
    const { x, z, r, p } = barca, y = NIVEL_DO_MAR + 1.5, casco = instancias(add, caixa, M2(0x2c3642), [{ x, y: y - 1, z, r, sx: 190, sy: 4, sz: 64 }], { nome: "monaco-paddock-flutuante", sombra: false });
    const ponto = (a, b, h) => ({ x: x + p.tx * a + p.nx * b, y: y + h, z: z + p.ty * a + p.ny * b });
    const cx = [], tt = [], ff = [];
    for (let j = 0; j < 6; j++) { const a = -80 + j * 32; for (const b of [-14, 14]) { cx.push({ ...ponto(a, b, 6), r, sx: 24, sy: 11, sz: 17 }); tt.push({ ...ponto(a, b, 14.5), r: r + Math.PI / 4, sx: 26, sy: 7, sz: 26 }); ff.push({ ...ponto(a, b, 11.5), r, sx: 24.4, sy: 2.4, sz: 17.4, c: EQUIPES[(j * 2 + (b > 0 ? 1 : 0)) % EQUIPES.length][1] }); } }
    instancias(add, caixa, M2(0xf6f6f2), cx, { nome: "monaco-paddock-tenda", sombra: false }); instancias(add, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), M2(0xefeee8), tt, { nome: "monaco-paddock-teto", sombra: false });
    colorida(ff, M2(0xffffff), "monaco-paddock-faixa");
  }
  tr.paddockMonaco = { hospitalidades: casas.length, apoio: tendas.length, flutuante: !!barca, casas: casas.map((c) => [c.x, c.z]), barca: barca ? [barca.x, barca.z] : null };
}
