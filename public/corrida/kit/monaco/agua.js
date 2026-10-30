// Mônaco — o Port Hercule e o mar: os píeres do OpenStreetMap com os iates amarrados dos dois lados, os superiates no meio da bacia e
// lá fora, a Digue e a Piscina Rainier III (Stade Nautique, com a plataforma de saltos). Os iates são os InstancedMesh de pista.js
// (`ctx.yachts`); o mar é o plano de água que anda (`tr.agua`).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { D, NIVEL_DO_MAR, fundoMonaco, distanciaDoMar } from "./mundo.js";
import { sorteio } from "../comum.js";

// o mar inteiro (o chão afunda onde é água: pista.js usa fundoMonaco)
export function mar(tr, { add, aguaTex, size }) {
  const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#1f6fae"), roughness: 0.15, metalness: 0.25 }); mat.map.repeat.set(size / 220, size / 220); tr.agua.push(mat);
  const m = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)); m.rotation.x = -Math.PI / 2; m.position.set(tr.t.world / 2, NIVEL_DO_MAR, tr.t.world / 2); m.name = "monaco-mar";
}

// os píeres e os iates
export function porto(tr, add, ctx) {
  const r = sorteio(2024), L = tr.wallLat, yachts = ctx.yachts;
  const tiras = { vs: [], idx: [] }, piso = M(0xb9b09c, { roughness: 0.9 });
  let barcos = 0, comprimento = 0;
  const livreDeAgua = (x, z, folga) => fundoMonaco(tr, x, z) > folga && tr.distAt(x, z) > L + 30;
  for (const P of D.piers) {
    if (P.length < 3) continue;
    // o píer é o contorno fechado do deck: o eixo vem do lado maior (a linha de popas) e a largura, do lado menor
    let melhor = 0, ux = 1, uz = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > melhor) { melhor = l; ux = (q[0] - p[0]) / l; uz = (q[1] - p[1]) / l; } }
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const cv = (v0 + v1) / 2, ax = u0 * ux - cv * uz, az = u0 * uz + cv * ux, bx = u1 * ux - cv * uz, bz = u1 * uz + cv * ux, dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l, meio = [(ax + bx) / 2, (az + bz) / 2];
    if (l < 30 || fundoMonaco(tr, meio[0], meio[1]) < -6) continue; // o que fica em terra (cais, molhes) é calçada, não píer
    // o convés: a planta do OpenStreetMap, só onde está dentro da água do jogo
    const tris = THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), []), k0 = tiras.vs.length / 3;
    for (const [x, z] of P) tiras.vs.push(x, NIVEL_DO_MAR + 3.4, z);
    for (const [i, j, k] of tris) { const A = P[i], B = P[j], C = P[k], c = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (c > 0) tiras.idx.push(k0 + i, k0 + k, k0 + j); else tiras.idx.push(k0 + i, k0 + j, k0 + k); }
    comprimento += l;
    // os iates dos dois lados, de popa para o píer
    const passos = Math.max(1, Math.ceil(l / 40));
    for (let p = 0; p < passos; p++) for (const lado of [-1, 1]) {
      if (r() < 0.2) continue;
      const u = (p + 0.5) / passos, s = 0.7 + r() * 0.75, off = (v1 - v0) / 2 + 6 + 28 * s, x = ax + dx * u + nx * lado * off, z = az + dz * u + nz * lado * off;
      if (!livreDeAgua(x, z, 8) || !livreDeAgua(x + nx * lado * 22 * s, z + nz * lado * 22 * s, 2)) continue;
      yachts.push({ x, y: z, h: NIVEL_DO_MAR - 0.2, s, r: Math.atan2(-nz * lado, nx * lado) }); barcos++;
    }
  }
  if (tiras.idx.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(tiras.vs, 3)); g.setIndex(tiras.idx); g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, piso)); m.receiveShadow = true; m.name = "monaco-piers";
  }
  // os superiates: soltos no meio da bacia e na boca do porto, ao longo do cais (paralelos à margem)
  let grandes = 0; const alvo = 9;
  for (let t = 0; t < 600 && grandes < alvo; t++) {
    const x = r() * tr.t.world, z = r() * tr.t.world, d = distanciaDoMar(x, z);
    if (d < 120 || d > 420 || !livreDeAgua(x, z, 140)) continue;
    yachts.push({ x, y: z, h: NIVEL_DO_MAR - 0.2, s: 2.1 + r() * 0.8, r: r() * Math.PI * 2 }); grandes++;
  }
  // lá fora, no mar aberto
  for (let t = 0; t < 800 && grandes < alvo + 14; t++) {
    const x = (r() * 1.4 - 0.2) * tr.t.world, z = (r() * 1.4 - 0.2) * tr.t.world, d = distanciaDoMar(x, z);
    if (d < 520 || d > 1900) continue;
    yachts.push({ x, y: z, h: NIVEL_DO_MAR - 0.2, s: 1.4 + r() * 1.2, r: r() * Math.PI * 2 }); grandes++;
  }
  tr.portoMonaco = { barcos, grandes, pier: Math.round(comprimento) };
}

// a Piscina Rainier III (Stade Nautique) e as outras piscinas grandes: água azul, borda branca, raias e, na maior, a plataforma de saltos
export function piscinas(tr, add, { aguaTex }) {
  if (!D.piscinas.length) return;
  const agua = new THREE.MeshStandardMaterial({ map: aguaTex("#2fb3e0"), roughness: 0.1, metalness: 0.1 }); agua.map.repeat.set(3, 1); tr.agua.push(agua);
  const deck = M(0xf2efe6, { roughness: 0.7 }), raia = M(0xff5a4a), branco = M(0xffffff), pedra = M(0xdedad0);
  for (const P of D.piscinas) {
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length, y = tr.chao(cx, cz) - 1.5 + 1.2;
    if (fundoMonaco(tr, cx, cz) > -4 || tr.distAt(cx, cz) < tr.wallLat + 70 || tr.predioEmMonaco?.(cx, cz, 0)) continue; // as piscinas de terraço e as coladas na pista ficam de fora
    const forma = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x - cx, -(z - cz)))), geo = new THREE.ShapeGeometry(forma); geo.rotateX(-Math.PI / 2); // deitada, de frente para cima, com o z do mundo
    const a = new THREE.Mesh(geo, agua); a.position.set(cx, y + 0.5, cz); add(a);
    const borda = new THREE.Mesh(geo, deck); borda.scale.set(1.12, 1, 1.12); borda.position.set(cx, y, cz); borda.receiveShadow = true; add(borda);
    // o eixo maior: as raias correm nele
    let melhor = 0, ux = 1, uz = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > melhor) { melhor = l; ux = (q[0] - p[0]) / l; uz = (q[1] - p[1]) / l; } }
    if (melhor > 120) {
      const g = new THREE.Group(); g.position.set(cx, y + 1, cz); g.rotation.y = Math.atan2(-uz, ux); add(g);
      for (let k = -3; k <= 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(melhor * 0.9, 0.5, 0.7), k % 2 ? raia : branco); m.position.set(0, 0.3, k * 9); m.name = "monaco-raias"; g.add(m); }
      const torre = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 10), pedra); torre.position.set(melhor * 0.5 + 12, 11, 20); torre.castShadow = true; torre.name = "monaco-raias"; g.add(torre); // a plataforma de saltos
    }
    (tr.reservado ||= []).push([cx, cz, melhor * 0.6]);
  }
}

// os iates atracados no cais, colados na pista: uma fila ao longo do cais do porto (de Tabac à Piscine), de popa para o cais, paralelos ao guard-rail
export function atracados(tr, ctx, [f0, f1]) {
  const r = sorteio(515), L = tr.wallLat, { pts, n } = tr; let feitos = 0;
  for (let i = Math.floor(f0 * n); i < Math.floor(f1 * n); i += 8) {
    const p = pts[i % n], a = fundoMonaco(tr, p.x + p.nx * (L + 70), p.y + p.ny * (L + 70)), b = fundoMonaco(tr, p.x - p.nx * (L + 70), p.y - p.ny * (L + 70)), lado = a > b ? 1 : -1;
    if (Math.max(a, b) < 20) continue;
    const s = 1 + r() * 0.9, d = L + 40 + 14 + 22 * s, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (fundoMonaco(tr, x, z) < 10 || tr.distAt(x, z) < L + 40) continue;
    ctx.yachts.push({ x, y: z, h: NIVEL_DO_MAR - 0.2, s, r: Math.atan2(-p.ty, p.tx) + (r() < 0.5 ? 0 : Math.PI) }); feitos++;
  }
  tr.atracadosMonaco = feitos;
}
