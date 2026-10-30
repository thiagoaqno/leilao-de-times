// Mônaco — o que se vê na beira de uma volta de verdade (fotos e onboards do GP): os blocos de proteção Tecpro do lado de fora da Sainte Dévote
// e da saída do túnel, os telões nos postes, o relógio da Rolex na reta dos boxes e a faixa TAG Heuer no pórtico da largada, as tendas
// brancas e os guindastes amarelos do cais, o bar La Rascasse, a fonte e o canteiro da Place du Casino e os cruzeiros ao fundo.
// Tudo com os materiais compartilhados do kit (o fundir.js junta por material) e InstancedMesh onde se repete.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { marcaTex } from "../marcas.js";
import { livre, ocupado, instancias, sinalDaCurva, sorteio } from "../comum.js";
import { D, fundoMonaco, distanciaDoMar, NIVEL_DO_MAR } from "./mundo.js";

const BRANCO = M(0xf2f2ee, { roughness: 0.8 }), VERMELHO = M(0xc8262c, { roughness: 0.8 }), AMARELO = M(0xe6b422, { roughness: 0.6 }), CINZA = M(0x6a7077, { roughness: 0.7 }), FERRO = M(0x2c3036, { roughness: 0.6, metalness: 0.3 });
const noTraco = (tr, f) => { const i = Math.floor(((f % 1) + 1) % 1 * tr.n) % tr.n; return [tr.pts[i], i]; };
const lateral = (p, lado, d) => [p.x + p.nx * lado * d, p.y + p.ny * lado * d];
const ladoDe = (tr, p, quer) => { const L = tr.wallLat; if (quer === "agua") { return fundoMonaco(tr, ...lateral(p, 1, L + 70)) > fundoMonaco(tr, ...lateral(p, -1, L + 70)) ? 1 : -1; } return quer; };

// ---- os blocos Tecpro: duas filas de blocos brancos com a faixa vermelha, de dois andares, do lado de fora da curva ----
export function tecpro(tr, add, trechos) {
  const L = tr.wallLat, { pts, n } = tr, brancos = [], vermelhos = [];
  for (const [f0, f1, quer] of trechos) {
    let i0 = Math.floor(f0 * n), i1 = Math.floor(f1 * n); if (i1 < i0) i1 += n;
    const lado = quer === "fora" ? -sinalDaCurva(pts, n, Math.floor((i0 + i1) / 2) % n) : quer;
    for (let i = i0; i <= i1; i += 4) {
      const p = pts[i % n];
      for (let fila = 0; fila < 2; fila++) {
        const d = L + 8 + fila * 11, [x, z] = lateral(p, lado, d);
        if (!livre(tr, x, z, 14) || ocupado(tr, x, z) || tr.distAt(x, z) < d - 4) continue;
        const y = tr.chao(x, z) - 1.5, ry = Math.atan2(p.tx, p.ty) + Math.PI / 2;
        for (let andar = 0; andar < 2; andar++) { brancos.push({ x, y: y + 4.5 + andar * 9, z, sx: 8.6, sy: 8.4, sz: 22, r: ry - Math.PI / 2 }); vermelhos.push({ x, y: y + 4.5 + andar * 9, z, sx: 8.9, sy: 2.4, sz: 22.3, r: ry - Math.PI / 2 }); }
      }
    }
  }
  const g = new THREE.BoxGeometry(1, 1, 1);
  instancias(add, g, BRANCO, brancos, { nome: "monaco-tecpro" }); instancias(add, g, VERMELHO, vermelhos, { nome: "monaco-tecpro-faixa", sombra: false });
  tr.tecproMonaco = brancos.length;
}

// ---- os telões nos postes (um de cada lado da curva): tela escura com a marca do GP ----
export function telaos(tr, add, fracoes) {
  const L = tr.wallLat, // a textura tem o desenho duas vezes lado a lado e a tela mostra uma metade: o offset anda (kit/monaco/vida.js) e a faixa de notícias corre sem emenda
    tex = canvasTex(512, 128, (x, w, h) => { x.fillStyle = "#0b1226"; x.fillRect(0, 0, w, h); x.fillStyle = "#e10600"; x.fillRect(0, h - 14, w, 14); x.textAlign = "center"; x.textBaseline = "middle"; for (const cx of [w / 4, (3 * w) / 4]) { x.fillStyle = "#ffffff"; x.font = "900 50px Arial Black, Impact, sans-serif"; x.fillText("MONACO", cx, 40); x.font = "900 32px Arial Black, Impact, sans-serif"; x.fillText("GRAND PRIX", cx, 84); x.fillStyle = "#ffffff"; x.font = "700 12px Arial, sans-serif"; x.fillText("LIVE  P1  P2  P3  •  FASTEST LAP  •  DRS ENABLED", cx, h - 7); } }, false);
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = 0.5; tr.telaoTex = tex;
  const tela = new THREE.MeshBasicMaterial({ map: tex }); let feitos = 0;
  for (const f of fracoes) for (const lado of [1, -1]) {
    const [p] = noTraco(tr, f), d = L + 26, [x, z] = lateral(p, lado, d);
    if (!livre(tr, x, z, 30) || ocupado(tr, x, z) || tr.coberto?.(Math.floor(f * tr.n))) continue;
    const gr = new THREE.Group(); gr.position.set(x, tr.chao(x, z) - 1.5, z); gr.rotation.y = Math.atan2(-p.nx * lado, -p.ny * lado); add(gr);
    const poste = new THREE.Mesh(new THREE.BoxGeometry(3, 52, 3), FERRO); poste.position.y = 26; poste.name = "monaco-marco"; gr.add(poste);
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(56, 32, 3), FERRO); caixa.position.y = 62; caixa.name = "monaco-marco"; gr.add(caixa);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(52, 28), tela); t.position.set(0, 62, 1.8); gr.add(t);
    (tr.reservado ||= []).push([x, z, 34]); feitos++;
  }
  tr.telaosMonaco = feitos;
}

// ---- o relógio da Rolex na reta dos boxes e a faixa TAG Heuer no pórtico da largada ----
export function largada(tr, add) {
  const L = tr.wallLat, [p] = noTraco(tr, 0.012), lado = -(tr.t.boxes?.lado ?? 1), d = L + 12, [x, z] = lateral(p, lado, d);
  const rolex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = "#0b5a36"; c.fillRect(0, 0, w, h); c.fillStyle = "#e8d49a"; c.font = "900 40px Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ROLEX", w / 2, 34); c.fillStyle = "#101010"; c.fillRect(24, 58, w - 48, 52); c.fillStyle = "#ff3b1f"; c.font = "900 44px monospace"; c.fillText("00:00.0", w / 2, 86); }, false);
  if (livre(tr, x, z, 12) && !tr.noCorredor?.(x, z)) {
    const g = new THREE.Group(); g.position.set(x, tr.chao(x, z) - 1.5, z); g.rotation.y = Math.atan2(-p.nx * lado, -p.ny * lado); add(g);
    const poste = new THREE.Mesh(new THREE.BoxGeometry(3, 60, 3), FERRO); poste.position.y = 30; poste.name = "monaco-marco"; g.add(poste);
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(44, 26, 4), FERRO); caixa.position.y = 66; caixa.name = "monaco-marco"; g.add(caixa);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: rolex })); t.position.set(0, 66, 2.2); g.add(t);
  }
  // a faixa TAG Heuer nos dois lados da viga do pórtico (pista.js: o pórtico de F1 fica na linha de chegada)
  const q = tr.pts[Math.round(420 / 6) % tr.n], W = tr.W / 2 + 14, tag = marcaTex("tag", 512, 64); // (o pórtico fica 420 depois da linha: gps/monaco.js `portico.adiante`)
  for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * W - 6, 7.4), new THREE.MeshBasicMaterial({ map: tag, side: THREE.FrontSide })); f.position.set(q.x, q.h + 62, q.y); f.rotation.y = -Math.atan2(q.ny, q.nx) + (s > 0 ? 0 : Math.PI); f.translateZ(1.8); add(f); }
}

// um lugar com sobra: em terra, fora de prédio, longe da pista e fora da faixa das arquibancadas daquele lado
function sobra(tr, x, z, i, lado, d, meia) {
  if (fundoMonaco(tr, x, z) > -3 || tr.predioEmMonaco?.(x, z, meia * 0.6) || tr.distAt(x, z) < tr.W / 2 + meia || tr.coberto?.(i) || tr.noCorredor?.(x, z)) return false;
  for (const q of tr.arqDegraus || []) if (q.lado === lado && ((i - q.i0 + tr.n) % tr.n) <= q.i1 - q.i0 + 6 && d < Math.abs(q.l0) + 9 * q.degraus + 10) return false;
  return !(tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < (rr * 0.6) ** 2);
}

// ---- as tendas brancas do paddock e os guindastes amarelos: no cais, atrás das arquibancadas ----
export function cais(tr, add, [f0, f1]) {
  const L = tr.wallLat, { n } = tr, tendas = [], tetos = [], rng = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  let guindastes = 0;
  const i0 = Math.floor(f0 * n), i1 = Math.floor(f1 * n);
  for (let i = i0; i <= i1; i += 22) {
    const p = tr.pts[i % n], lado = rng() < 0.5 ? 1 : -1, d = L + 20 + rng() * 22, [x, z] = lateral(p, lado, d);
    if (!sobra(tr, x, z, i % n, lado, d, 20)) continue;
    const y = tr.chao(x, z) - 1.5, ry = Math.atan2(p.tx, p.ty);
    tendas.push({ x, y: y + 7, z, sx: 24, sy: 14, sz: 18, r: ry }); tetos.push({ x, y: y + 17, z, sx: 26, sy: 8, sz: 20, r: ry + Math.PI / 4 });
  }
  instancias(add, new THREE.BoxGeometry(1, 1, 1), BRANCO, tendas, { nome: "monaco-tenda" });
  instancias(add, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), M(0xe8e8e2, { roughness: 0.8 }), tetos.map((o) => ({ ...o, r: o.r })), { nome: "monaco-tenda-teto" });
  // guindastes amarelos de obra (a montagem das arquibancadas): dois, no cais
  for (const f of [f0 + (f1 - f0) * 0.3, f0 + (f1 - f0) * 0.78]) {
    const p = tr.pts[Math.floor(f * n) % n];
    for (const lado of [1, -1]) for (const d of [L + 34, L + 28, L + 40]) {
      const [x, z] = lateral(p, lado, d); if (!sobra(tr, x, z, Math.floor(f * n) % n, lado, d, 16)) continue;
      const g = new THREE.Group(); g.position.set(x, tr.chao(x, z) - 1.5, z); g.rotation.y = Math.atan2(p.tx, p.ty) + 0.6; add(g);
      const peca = (w, h, dd, px, py, pz, mat = AMARELO) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), mat); m.position.set(px, py, pz); m.castShadow = true; m.name = "monaco-marco"; g.add(m); return m; };
      peca(7, 110, 7, 0, 55, 0); peca(5, 5, 130, 0, 112, 36); peca(5, 5, 40, 0, 112, -30); peca(8, 8, 14, 0, 106, -48, CINZA); peca(9, 11, 11, 0, 104, 4, CINZA);
      (tr.reservado ||= []).push([x, z, 40]); guindastes++; break;
    }
    if (guindastes >= 2) break;
  }
  tr.caisMonaco = { tendas: tendas.length, guindastes };
}

// ---- La Rascasse: o bar de esquina, de dois andares, com o toldo vermelho e a placa, virado para a curva ----
export function rascasse(tr, add, hAt) {
  const m = D.marcos.rascasse; if (!m) return;
  const L = tr.wallLat, i = tr.indiceAt(m[0], m[1]), p = tr.pts[i];
  let x = m[0], z = m[1];
  if (tr.distAt(x, z) < L + 34) { const s = Math.sign((x - p.x) * p.nx + (z - p.y) * p.ny) || 1; [x, z] = lateral(p, s, L + 40); }
  if (tr.predioEmMonaco?.(x, z, 6) || fundoMonaco(tr, x, z) > -6) return;
  const g = new THREE.Group(), y = hAt(x, z); g.position.set(x, y, z); g.rotation.y = Math.atan2(p.x - x, p.y - z); add(g);
  const placa = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#7a1a1e"; c.fillRect(0, 0, w, h); c.fillStyle = "#f4e7c8"; c.font = "900 34px Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("LA RASCASSE", w / 2, h / 2); }, false);
  const peca = (w, h, d, px, py, pz, mat) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); q.position.set(px, py, pz); q.castShadow = true; q.name = "monaco-marco"; g.add(q); return q; };
  peca(64, 42, 40, 0, 21, 0, M(0xf1d3b0, { roughness: 0.85 })); peca(68, 3, 44, 0, 43, 0, BRANCO); peca(68, 1.6, 20, 0, 22, 28, VERMELHO);
  for (const s of [-30, 30]) peca(1.2, 22, 1.2, s, 11, 37, FERRO);
  const t = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshBasicMaterial({ map: placa })); t.position.set(0, 33, 20.6); g.add(t);
  (tr.reservado ||= []).push([x, z, 50]);
}

// ---- a Place du Casino: a fonte e o canteiro de flores no meio dos jardins ----
export function fonte(tr, add, hAt) {
  const m = D.marcos.praca; if (!m) return;
  const [x, z] = m; if (tr.distAt(x, z) < tr.wallLat + 50 || tr.predioEmMonaco?.(x, z, 10)) return;
  const y = hAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); add(g);
  const flores = canvasTex(128, 128, (c, w, h, r) => { c.fillStyle = "#4f9a3a"; c.fillRect(0, 0, w, h); for (let k = 0; k < 500; k++) { c.fillStyle = ["#e94f6a", "#ffd23f", "#ffffff", "#ff8fb8", "#3d8a2e"][(r() * 5) | 0]; c.fillRect(r() * w, r() * h, 3, 3); } });
  const cana = new THREE.Mesh(new THREE.CylinderGeometry(52, 54, 3, 28), new THREE.MeshStandardMaterial({ map: flores, roughness: 1 })); cana.position.y = 1.5; cana.receiveShadow = true; cana.name = "monaco-marco"; g.add(cana);
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 5, 22), M(0xe9e4d8, { roughness: 0.8 })); borda.position.y = 5; borda.name = "monaco-marco"; g.add(borda);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1, 22), new THREE.MeshStandardMaterial({ color: 0x4fb6e0, roughness: 0.1, metalness: 0.1 })); agua.position.y = 7.6; agua.name = "monaco-marco"; g.add(agua);
  const pilar = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 18, 10), M(0xd9d3c4)); pilar.position.y = 14; pilar.name = "monaco-marco"; g.add(pilar);
  (tr.reservado ||= []).push([x, z, 60]);
}

// ---- os cruzeiros ao fundo, no mar aberto (um casco longo e branco, as pontes de cabines e a chaminé) ----
export function cruzeiros(tr, add) {
  const w = tr.t.world, pos = [], r = sorteio(31);
  for (let t = 0; t < 4000 && pos.length < 2; t++) {
    const x = (0.7 + r() * 0.9) * w, z = (0.15 + r() * 1.0) * w, d = distanciaDoMar(x, z);
    if (d < 1100 || d > 2200 || pos.some(([a, b]) => Math.hypot(a - x, b - z) < 1500)) continue; pos.push([x, z]);
  }
  const casco = M(0xf4f6f8, { roughness: 0.5 }), azul = M(0x1c3f7a, { roughness: 0.6 }), vidro = M(0x2a3a4a, { roughness: 0.3, metalness: 0.4 });
  pos.forEach(([x, z], k) => {
    const g = new THREE.Group(); g.position.set(x, NIVEL_DO_MAR, z); g.rotation.y = 0.4 + k * 1.1; add(g);
    const peca = (a, b, c, px, py, pz, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(a, b, c), mat); m.position.set(px, py, pz); m.name = "monaco-marco"; g.add(m); };
    peca(520, 36, 84, 0, 18, 0, azul); peca(500, 30, 80, 0, 51, 0, casco);
    for (let a = 0; a < 5; a++) { peca(440 - a * 38, 12, 74 - a * 3, 10 + a * 14, 72 + a * 12, 0, casco); peca(430 - a * 38, 3, 75 - a * 3, 10 + a * 14, 66 + a * 12, 0, vidro); }
    peca(30, 38, 34, -40, 142, 0, AMARELO);
  });
  tr.cruzeirosMonaco = pos.length;
}
