// Equipamentos de GP adaptados às ruas estreitas de Mônaco e ao túnel.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";

export function ambienteMonaco(tr, add) {
  const { pts, n, W, wallLat: L } = tr, lotes = new Map();
  const metal = M(0x697780), branco = M(0xf0eee6), vermelho = M(0xc42d38), laranja = M(0xf27421), escuro = M(0x18242b);
  const luz = new THREE.MeshBasicMaterial({ color: 0xffdf9c, toneMapped: false });
  const placa = (texto, fundo, cor = "#ffffff") => new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.fillStyle = cor; x.fillRect(0, h - 6, w, 6);
    x.font = "900 65px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, h / 2, w - 24);
  }, false) });
  const anuncios = [placa("MONTE-CARLO", "#9d2331"), placa("GRAND PRIX", "#132c36"), placa("MONACO", "#eee8dc", "#a11e30")];
  const distancias = [100, 50].map(v => placa(String(v), "#f5f4ee", "#18242b"));
  const stats = tr.ambienteGP = { paineis: 0, postos: 0, placas: 0, bandeiras: 0, luzesTunel: 0, setores: [0, 0, 0, 0] };
  function caixa(mat, x, y, z, sx, sy, sz, ry = 0) {
    if (!lotes.has(mat)) lotes.set(mat, []);
    lotes.get(mat).push({ x, y, z, sx, sy, sz, ry });
  }
  function lugar(i, lado, lat = L + 1, raio = 2) {
    const p = pts[(i + n) % n], x = p.x + p.nx * lado * lat, z = p.y + p.ny * lado * lat;
    // Distância exata ao traçado, inclusive ao trecho vizinho no grampo.
    if (pts.some(q => Math.hypot(q.x - x, q.y - z) < W / 2 + raio)) return null;
    return { p, x, z, h: p.h, ry: Math.atan2(-p.nx * lado, -p.ny * lado) };
  }
  for (let i = 0; i < n; i += 9) for (const lado of [-1, 1]) {
    const o = lugar(i, lado); if (!o) continue;
    const { p, x, z, h, ry } = o;
    if (tr.coberto(i)) {
      // Guias luminosas baixas; não acrescentam luzes dinâmicas nem atravessam o teto.
      caixa(luz, x - p.nx * lado * 3, h + 9, z - p.ny * lado * 3, 20, 0.8, 0.5, ry);
      stats.luzesTunel++; continue;
    }
    // Cerca sobre o guard-rail existente; postes altos e travessas seguem o relevo.
    caixa(metal, x, h + 24, z, 0.8, 24, 0.8);
    for (const altura of [15, 23, 34]) caixa(metal, x, h + altura, z, 32, 0.5, 0.5, ry);
    for (const deslocamento of [-12, -6, 6, 12]) caixa(metal, x + p.tx * deslocamento, h + 24, z + p.ty * deslocamento, 0.22, 22, 0.22);
    if (i % 27 === 0) {
      caixa(anuncios[(i / 27) % 3], x - p.nx * lado * 1.6, h + 7, z - p.ny * lado * 1.6, 30, 9, 0.6, ry);
      stats.paineis++; stats.setores[Math.floor(i / n * 4)]++;
    }
    if (i % 81 === 0) {
      caixa(metal, x, h + 31, z, 1, 38, 1);
      caixa(vermelho, x, h + 47, z, 15, 4.5, 0.5, ry);
      caixa(branco, x, h + 42.5, z, 15, 4.5, 0.5, ry); stats.bandeiras++;
    }
  }
  // Postos compactos só onde há calçada livre, sem ocupar piscina, arquibancadas ou porto.
  for (let i = 20; i < n; i += 55) for (const lado of [-1, 1]) {
    if (tr.coberto(i)) continue;
    const o = lugar(i, lado, L + 30, 17); if (!o || tr.ocupado(o.x, o.z, i)) continue;
    const { x, z, ry } = o, h = tr.chao(x, z);
    caixa(escuro, x, h + 1, z, 23, 2, 20, ry);
    for (const s of [-1, 1]) caixa(metal, x + s * 9 * Math.cos(ry), h + 13, z - s * 9 * Math.sin(ry), 1, 24, 1);
    caixa(vermelho, x, h + 26, z, 26, 2, 23, ry);
    caixa(anuncios[1], x, h + 19, z, 21, 6, 1, ry);
    // Equipamentos e dois fiscais enfileirados no posto, com capacete branco.
    for (const s of [-1, 1]) {
      caixa(laranja, x + s * 5, h + 7, z, 3.4, 8, 3, ry);
      caixa(branco, x + s * 5, h + 12, z, 3, 2.5, 3, ry);
    }
    stats.postos++; tr.reservado.push([x, z, 22]);
  }
  // Placas compactas de frenagem no lado de fora das curvas, apoiadas sobre a barreira.
  let ultima = -n;
  for (let i = 0; i < n; i += 3) {
    if (pts[i].k < 1 / 350 || i - ultima < n / 12) continue;
    ultima = i;
    const p = pts[i], q = pts[(i + 3) % n], lado = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
    [100, 50].forEach((distancia, j) => {
      const idx = (i - Math.round(distancia * 10 / 6) + n) % n, o = lugar(idx, lado, L + 2, 5);
      if (!o || tr.coberto(idx)) return;
      caixa(distancias[j], o.x, o.h + 22, o.z, 13, 9, 0.8, Math.atan2(-o.p.tx, -o.p.ty)); stats.placas++;
    });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D();
  for (const [mat, lista] of lotes) {
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.y = o.ry; d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.name = "monaco-ambiente-gp"; m.receiveShadow = true; add(m);
  }
}
