// Austin — as marcas pintadas e as placas do circuito (peça só desta pista): o nome "Big Red" escrito grande no asfalto de escape da curva 1 (o nome foi pintado
// ali na cerimônia que batizou a curva, em homenagem a um dos fundadores do circuito) e as placas com o número de algumas curvas. Sem marca registrada.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { lotes, tira, tinta, sinalDaCurva, ocupado } from "../comum.js";
import { Montador, solido } from "../montagem.js";
import { indice } from "./lugar.js";

/**
 * "BIG RED" no escape de asfalto da curva 1: uma fita que acompanha a curva, de `f0` a `f1`, do lado `lado`, entre `l0` e `l1` do centro; as letras correm no sentido da volta.
 * (A cor das letras não foi confirmada: branco com contorno vermelho.)
 */
export function bigRedNoAsfalto(tr, add, { f0 = 0.052, f1 = 0.074, lado = 1, l0, l1 } = {}) {
  const { n, W } = tr, a = Math.floor(f0 * n), b = Math.floor(f1 * n), L = lotes();
  const tex = canvasTex(128, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); // o texto deitado ao longo da fita (o v da textura é o sentido da volta)
    x.textAlign = "center"; x.textBaseline = "middle"; x.font = "900 112px 'Arial Black', Impact, sans-serif";
    x.lineJoin = "round"; x.lineWidth = 12; x.strokeStyle = "#bf0a30"; x.strokeText("BIG RED", 0, 6, 470); x.fillStyle = "#f6f4ee"; x.fillText("BIG RED", 0, 6, 470);
    x.restore();
  }, false);
  const mat = tinta(tex, { roughness: 0.85 });
  tira(tr, L.de(mat), a, b, lado * (l0 ?? W / 2 + 33), lado * (l1 ?? W / 2 + 62), 0.6, 0.6, 0, 1, 0, 1);
  L.montar(add, `${tr.id}-bigred`);
  tr.bigRedAustin = { f0, f1, lado };
}

/** As placas com o número da curva (e, na primeira, o nome), uma malha só com um atlas de canvas e as pernas em outra. `CURVAS`: [[texto, fração]] */
export function placasDasCurvas(tr, add, CURVAS) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido(), cols = 4, linhas = Math.ceil(CURVAS.length / cols);
  const atlas = canvasTex(cols * 256, linhas * 128, (x) => {
    CURVAS.forEach(([nome], k) => {
      const c = k % cols, rr = Math.floor(k / cols), x0 = c * 256, y0 = rr * 128;
      x.fillStyle = "#f6f6f2"; x.fillRect(x0, y0, 256, 128); x.fillStyle = "#002868"; x.fillRect(x0, y0, 256, 22); x.fillStyle = "#bf0a30"; x.fillRect(x0, y0 + 22, 256, 8);
      x.fillStyle = "#15161a"; x.font = "900 54px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(nome, x0 + 128, y0 + 80, 236);
      x.strokeStyle = "#15161a"; x.lineWidth = 4; x.strokeRect(x0 + 2, y0 + 2, 252, 124);
    });
  }, false);
  let feitas = 0;
  CURVAS.forEach(([, f], k) => {
    const i = indice(tr, f), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) {
      for (const d of [W / 2 + 56, W / 2 + 80]) {
        const x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
        if (tr.distAt(x, z) >= d - 8 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z) - 1.5;
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len;
    const w = 88, h = 34, y0 = y + 22, c = k % cols, rr = Math.floor(k / cols), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / cols, 1 - (rr + 1 - b) / linhas); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 13, z + ez * s * (w / 2 - 6)], [2.4, 28, 2.4], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    (tr.reservado ||= []).push([x, z, 28]); feitas++;
  });
  if (!idx.length) return 0;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("austin-placas-curvas-postes"));
  tr.placasAustin = feitas;
  return feitas;
}
