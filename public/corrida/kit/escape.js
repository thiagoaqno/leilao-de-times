// Kit de pista — a área de escape de autódromo, depois da zebra: brita (a caixa de pedra que segura o carro) e o
// asfalto de escape pintado em listras (no Brasil, verde e amarelo). As faixas de piso são compartilhadas com a física.
//
// cfg: {
//   brita: [[f0, f1, lado], ...]    — trechos de brita (frações da volta, a partir da chegada)
//   britaCurvas: 450                — brita automática do lado de fora das curvas mais fechadas que esse raio (em unidades),
//                                     do ápice até a saída; some com os trechos de `brita`, se houver
//   corBrita: "#e3d9bb"             — a cor da brita (padrão: o bege de sempre)
//   listrado: [[f0, f1, lado], ...] — trechos de asfalto pintado em listras
//   cores: ["#1f9a3d", "#f2c230"]   — as listras
//   largura: 23                     — da zebra para fora, em unidades
//   pneus: [[f0, f1, lado], ...]    — muro de pilhas de pneus (3 de altura) na beira de fora da área de escape
// }
// lado: 1 ou -1 (o lado de p.nx), 0 (os dois) ou "fora" / "dentro" da curva mais fechada do trecho.
import * as THREE from "three";
import { canvasTex } from "../cena.js";
import { M } from "../cena.js";
import { lotes, tira, sinalDaCurva, livre, ocupado, instancias } from "./comum.js";

export function escapeGP(tr, add, cfg = {}) {
  // Spa desenha o asfalto pintado na peça própria; as demais usam as mesmas faixas da física.
  const dados = tr.t.superficieEscape;
  if (dados) { const { listrado, ...comuns } = dados; cfg = { ...cfg, ...comuns, britaCurvas: dados.britaCurvas, ...(tr.id === "spa" ? {} : { listrado }) }; }
  const { pts, n, W } = tr, L = lotes(), de = W / 2 + 7, ate = de + (cfg.largura ?? 23);
  const cores = cfg.cores || ["#1f9a3d", "#f2c230"];
  const brita = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => {
    x.fillStyle = cfg.corBrita || "#c9b37a"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 700; i++) { x.fillStyle = cfg.corBrita ? (rr() < 0.5 ? "#00000022" : "#ffffff26") : (rr() < 0.5 ? "#b39c66" : "#ddc893"); x.fillRect(rr() * w, rr() * hh, 2, 2); }
  }), roughness: 1, side: THREE.DoubleSide });
  const listrado = new THREE.MeshStandardMaterial({ map: canvasTex(32, 64, (x, w, hh, rr) => {
    x.fillStyle = cores[0]; x.fillRect(0, 0, w, hh / 2); x.fillStyle = cores[1]; x.fillRect(0, hh / 2, w, hh / 2);
    for (let i = 0; i < 260; i++) { x.fillStyle = rr() < 0.5 ? "#00000016" : "#ffffff12"; x.fillRect(rr() * w, rr() * hh, 2, 2); } // asfalto de escape, gasto
    x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, 2, hh); // a linha branca junto da zebra
  }), roughness: 0.85, side: THREE.DoubleSide });
  const lados = (a, b, lado) => {
    if (lado === 1 || lado === -1) return [lado];
    if (lado === 0 || lado === undefined) return [-1, 1];
    let i = a; for (let k = a; k <= b; k++) if ((pts[k % n].k || 0) > (pts[i % n].k || 0)) i = k;
    const dentro = sinalDaCurva(pts, n, i % n); return [lado === "dentro" ? dentro : -dentro];
  };
  const stats = (tr.escapeGP = { brita: 0, listrado: 0, pneus: 0 });
  if (cfg.britaCurvas) { // do lado de fora de cada curva fechada, do ápice (10 pontos antes) até a saída (14 depois)
    const fora = { "-1": new Uint8Array(n), "1": new Uint8Array(n) }, explicitas = window.Pistas.mapaSuperficies(pts, { brita: cfg.brita });
    for (let i = 0; i < n; i++) { if ((pts[i].k || 0) < 1 / cfg.britaCurvas) continue; const s = -sinalDaCurva(pts, n, i); for (let j = i - 10; j <= i + 14; j++) { const k = (j + n) % n; if (explicitas[s][k] !== 1) fora[s][k] = 1; } }
    for (const s of [-1, 1]) for (let i = 0, a = -1; i <= n; i++) {
      const tem = i < n && !!fora[s][i];
      if (a >= 0 && !tem) { tira(tr, L.de(brita), a, i, s * de, s * ate, 0.3, 0.2, (a * 6) / 64, (i * 6) / 64); stats.brita += i - a; a = -1; }
      if (tem && a < 0) a = i;
    }
  }
  for (const [chave, mat, v] of [["brita", brita, 64], ["listrado", listrado, 60]]) for (const [f0, f1, lado] of cfg[chave] || []) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    for (const s of lados(a, b, lado)) {
      tira(tr, L.de(mat), a, b, s * de, s * ate, chave === "brita" ? 0.3 : 0.4, chave === "brita" ? 0.2 : 0.4, (a * 6) / v, (b * 6) / v);
      stats[chave] += b - a;
    }
  }
  L.montar(add, `${tr.id}-escape`);
  // as pilhas de pneus: uma a cada 2 pontos, de 3 pneus; de vez em quando um pneu pintado de branco
  const pretos = [], brancos = [];
  for (const [f0, f1, lado] of cfg.pneus || []) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    for (const s of lados(a, b, lado)) for (let i = a; i < b; i += 2) {
      if (tr.murosEscape && !tr.murosEscape[s][i % n]) continue;
      const d = tr.murosEscape ? W / 2 + tr.murosEscape[s][i % n] - 4 : (W / 2 + 7) + (cfg.largura ?? 23) - 4;
      const p = pts[i % n], x = p.x + p.nx * s * d, z = p.y + p.ny * s * d;
      if (!livre(tr, x, z, 12) || ocupado(tr, x, z, i % n)) continue;
      for (let k = 0; k < 3; k++) (((i / 2 + k) % 7 | 0) === 0 ? brancos : pretos).push({ x, y: (tr.murosEscape ? tr.chao(x, z) : p.h) + 1.7 + k * 3.6, z, sx: 1, sy: 1, sz: 1 });
    }
  }
  const pneu = new THREE.TorusGeometry(3.4, 1.7, 6, 12); pneu.rotateX(Math.PI / 2);
  instancias(add, pneu, M(0x16171a, { roughness: 0.95 }), pretos, { nome: `${tr.id}-pneus` });
  instancias(add, pneu, M(0xe4e4de, { roughness: 0.9 }), brancos);
  stats.pneus = pretos.length + brancos.length;
}
