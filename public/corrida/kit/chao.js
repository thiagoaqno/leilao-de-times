// Kit de pista — o chão de um GP: a margem (sarjeta de rua ou faixa de asfalto de autódromo), as zebras só nas curvas
// (e as amarelas onde a pista pede), faixas de pedestre, a linha da rua tracejada, as linhas do safety car, o grid com os
// números, remendos e bueiros. Tudo é tinta: nada muda a física. As frações (0 a 1) são da volta, a partir da chegada.
//
// cfg (tudo opcional):
//   margem: "sarjeta" (rua) | { cor: "#…" } (asfalto ou grama pintada do autódromo)
//   zebra: { cores: [a, b], dentro: 300, fora: 180 }  — raio (em unidades) abaixo do qual a curva ganha zebra por dentro
//          e, mais fechada, também por fora na saída
//   amarelas: [[f0, f1], ...]  — trechos com as zebras de dentro amarelas e altas (anticorte)
//   faixasPedestre: [f, ...]   — perto de cada fração, onde a rua for mais reta
//   tracejado: [[f0, f1], ...] — a linha do meio da rua, gasta
//   sc: [[f, "SC 1"], ...]     — linhas do safety car com o nome pintado
//   grid: true                 — o colchete e o número de cada posição (no lugar das barras de pista.js)
//   remendos: 46, bueiros: 40  — quantos
import * as THREE from "three";
import { canvasTex } from "../cena.js";
import { lotes, tira, tinta, gastar, sinalDaCurva, sorteio } from "./comum.js";

export function chaoGP(tr, add, cfg, { gridSpot }) {
  const { pts, n, W } = tr, L = lotes(), meia = W / 2, perto = (f) => Math.floor(f * n), r = sorteio(cfg.semente ?? 90210);
  // a margem até a zebra: a sarjeta de rua (junta escura, concreto e canaleta) ou uma faixa de uma cor só
  const margem = cfg.margem || "sarjeta";
  const matMargem = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => {
    const cor = margem === "sarjeta" ? "#aaa69c" : margem.cor; x.fillStyle = cor; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 700; i++) { x.fillStyle = rr() < 0.5 ? "#0000000e" : "#ffffff12"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
    if (margem === "sarjeta") { x.fillStyle = "#4f5154"; x.fillRect(0, 0, 5, hh); x.fillStyle = "#8d8a82"; x.fillRect(46, 0, 18, hh); x.fillStyle = "#77746d"; x.fillRect(46, 0, 2, hh); x.fillStyle = "#86837b"; x.fillRect(0, 0, w, 2); }
  }), roughness: 0.95, side: THREE.DoubleSide });
  for (const s of [-1, 1]) tira(tr, L.de(matMargem), 0, n, s * meia, s * (meia + 7), 0.5, 0.5, 0, (n * 6) / 40);
  // zebras só nas curvas: por dentro em volta do ápice e por fora na saída das mais fechadas
  const z = { cores: ["#d62828", "#f4f4f4"], dentro: 300, fora: 180, ...(cfg.zebra || {}) };
  const zebra = new THREE.MeshStandardMaterial({ map: canvasTex(32, 64, (x, w, hh) => { x.fillStyle = z.cores[0]; x.fillRect(0, 0, w, hh / 2); x.fillStyle = z.cores[1]; x.fillRect(0, hh / 2, w, hh / 2); x.fillStyle = "#00000030"; x.fillRect(0, 0, 3, hh); }), roughness: 0.6, side: THREE.DoubleSide });
  const amarela = new THREE.MeshStandardMaterial({ map: canvasTex(32, 64, (x, w, hh) => { x.fillStyle = "#f2c230"; x.fillRect(0, 0, w, hh); x.fillStyle = "#c99a1a"; x.fillRect(0, hh - 4, w, 4); x.fillStyle = "#00000030"; x.fillRect(0, 0, 3, hh); }), roughness: 0.6, side: THREE.DoubleSide });
  const amarelas = cfg.amarelas || [], ehAmarela = (i) => amarelas.some(([a, b]) => i >= a * n && i <= b * n);
  const marca = { "-1": new Uint8Array(n), "1": new Uint8Array(n) };
  for (let i = 0; i < n; i++) {
    const k = pts[i].k || 0; if (k < 1 / z.dentro) continue;
    const dentro = sinalDaCurva(pts, n, i);
    for (let j = i - 8; j <= i + 8; j++) marca[dentro][(j + n) % n] = 1;
    if (k > 1 / z.fora) for (let j = i + 2; j <= i + 16; j++) marca[-dentro][(j + n) % n] = 1;
  }
  tr.zebras = new Uint8Array(n); // para as faíscas do assoalho (jogo.js): só onde tem zebra de verdade
  for (const s of [-1, 1]) { // cada trecho seguido de zebra vira uma fita, cortada onde muda de cor
    const m = marca[s]; let a = -1, corA = false;
    for (let i = 0; i <= n; i++) {
      const tem = i < n && !!m[i], cor = tem && ehAmarela(i);
      if (a >= 0 && (!tem || cor !== corA)) { tira(tr, L.de(corA ? amarela : zebra), a, i, s * meia, s * (meia + 7), 0.58, corA ? 1.6 : 1.0, (a * 6) / 28, (i * 6) / 28); a = -1; }
      if (tem && a < 0) { a = i; corA = cor; }
      if (tem) tr.zebras[i] = 1;
    }
  }
  const proibido = (i) => { const q = ((i % n) + n) % n, f = q / n; return f > 0.955 || f < 0.012 || !!tr.coberto?.(q); }; // o grid, a linha e o túnel
  // faixas de pedestre (as listras correm no sentido da rua), onde a rua é quase reta
  const zebraPe = tinta(canvasTex(256, 64, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f2f1ea"; for (let k = 0; k < 10; k++) x.fillRect(6 + k * 25, 0, 13, hh); gastar(x, w, hh, rr, 0.25); }, false));
  const faixas = [];
  for (const f of cfg.faixasPedestre || []) {
    let best = perto(f); for (let k = perto(f) - 30; k <= perto(f) + 30; k++) { const q = (k + n) % n; if ((pts[q].k || 0) < (pts[best].k || 0) && !proibido(q)) best = q; }
    if (proibido(best)) continue;
    tira(tr, L.de(zebraPe), best, best + 5, -meia + 4, meia - 4, 0.54, 0.54); faixas.push(best);
  }
  // a linha do meio da rua que sobra pintada (tracejada e gasta), interrompida nas faixas de pedestre
  const tracejado = tinta(canvasTex(8, 64, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#e9e7dc"; x.fillRect(0, 0, w, 24); gastar(x, w, 24, rr, 0.3); }), { opacity: 0.7 });
  for (const [a, b] of cfg.tracejado || []) {
    let i0 = perto(a);
    for (let i = perto(a); i <= perto(b); i++) {
      if (i !== perto(b) && !faixas.some((c) => Math.abs(c - i) < 8)) continue;
      if (i - i0 > 6) tira(tr, L.de(tracejado), i0, i, -0.8, 0.8, 0.53, 0.53, (i0 * 6) / 80, (i * 6) / 80);
      i0 = i + 1;
    }
  }
  // as linhas do safety car
  const linha = tinta(canvasTex(4, 32, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.fillRect(0, 12, w, 8); }, false));
  const escrito = (texto) => tinta(canvasTex(256, 128, (x, w, hh, rr) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f2f1ea"; x.font = "900 110px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, hh / 2 + 4, w - 10); gastar(x, w, hh, rr); }, false));
  for (const [f, nome] of cfg.sc || []) {
    const i = perto(f);
    tira(tr, L.de(linha), i, i + 1, -meia, meia, 0.55, 0.55);
    tira(tr, L.de(escrito(nome)), i + 2, i + 6, meia - 30, meia - 6, 0.55, 0.55);
  }
  // o grid: o "colchete" de cada posição e o número pintado (as ímpares de um lado, as pares do outro)
  if (cfg.grid) for (let g = 0; g < 8; g++) {
    const sp = gridSpot(pts, g, W), lat = (g % 2 ? 1 : -1) * W * 0.22;
    const mat = tinta(canvasTex(128, 192, (x, w, hh, rr) => {
      x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.fillRect(4, 4, w - 8, 12); x.fillRect(4, 4, 10, 60); x.fillRect(w - 14, 4, 10, 60);
      x.font = "900 70px Arial Black, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(g + 1), w / 2, 120); gastar(x, w, hh, rr, 0.12);
    }, false));
    tira(tr, L.de(mat), sp.idx - 3, sp.idx + 3, lat - 15, lat + 15, 0.55, 0.55);
  }
  // remendos de asfalto e bueiros
  const remendo = (cor) => tinta(canvasTex(64, 64, (x, w, hh, rr) => {
    x.clearRect(0, 0, w, hh); x.fillStyle = cor; x.fillRect(2, 2, w - 4, hh - 4);
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000014" : "#ffffff0c"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
    x.strokeStyle = "#1c1d20aa"; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, hh - 4);
  }, false), { opacity: 0.6 });
  const remendos = [remendo("#3e3f43"), remendo("#6a6a6c")];
  for (let k = 0; k < (cfg.remendos ?? 0); k++) {
    const i = Math.floor(r() * n), compr = 3 + Math.floor(r() * 9), larg = 14 + r() * 28, c = (r() * 2 - 1) * (meia - 6 - larg / 2);
    if (proibido(i) || proibido(i + compr)) continue;
    tira(tr, L.de(remendos[k % 2]), i, i + compr, c - larg / 2, c + larg / 2, 0.52, 0.52);
  }
  const bueiro = tinta(canvasTex(64, 64, (x, w) => {
    x.clearRect(0, 0, w, w); x.fillStyle = "#3a3c40"; x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "#5c5f64"; x.lineWidth = 3; for (let k = 10; k <= 54; k += 8) { x.beginPath(); x.moveTo(k, 8); x.lineTo(k, 56); x.stroke(); }
    x.strokeStyle = "#232427"; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.stroke();
  }, false), { roughness: 0.5, metalness: 0.4 });
  for (let k = 0; k < (cfg.bueiros ?? 0); k++) {
    const i = Math.floor(r() * n), c = (r() * 2 - 1) * (meia - 10); if (proibido(i)) continue;
    tira(tr, L.de(bueiro), i, i + 1, c - 3.5, c + 3.5, 0.53, 0.53);
  }
  L.montar(add, `${tr.id}-chao`);
  tr.chaoGP = { faixas: faixas.length, zebras: tr.zebras.reduce((a, b) => a + b, 0) };
}
