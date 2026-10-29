// Zandvoort — o mar laranja (peça só desta pista). O Grande Prêmio da Holanda é o jogo em casa do Verstappen: as arquibancadas e as encostas das
// dunas ficam todas laranja, de gente de camisa, chapéu e peruca laranja, com bandeiras da Holanda, do "33" e do leão, faixas "HUP HOLLAND HUP" e
// fumaça laranja dos sinalizadores subindo e indo embora com o vento do mar. Aqui:
// · `torcidaLaranja`: a galera nas dunas, de pé e sentada atrás da cerca (duas InstancedMesh, corpo e cabeça, cor por instância) e as bandeiras;
// · `bandeirasLaranja`: as bandeiras numa malha só (um atlas de textura), em hastes instanciadas (altas, nos pórticos e arquibancadas);
// · `fumacaLaranja`: as colunas de fumaça dos sinalizadores (um InstancedMesh de bolhas que sobem, crescem e somem; só anda perto da câmera).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { ocupado, sorteio, instancias } from "../comum.js";
import { indice } from "./lugar.js";

export const LARANJA = "#ff6a13";
// a torcida: laranja em quase tudo, e um pouco de branco, azul e vermelho da bandeira
export const CAMISAS_NL = [LARANJA, LARANJA, LARANJA, "#ff7a1a", LARANJA, "#ff5a00", LARANJA, LARANJA, "#ff8a2a", LARANJA, "#ffffff", "#21468b", "#ae1c28", LARANJA, "#ff6a13", "#111111"];
const PELES = ["#f1c7a5", "#e8b894", "#d9a37a", "#a8714a", "#f4d3b8"], CHAPEUS = [LARANJA, LARANJA, "#ff7a1a", "#ffffff", "#21468b"];
const cor = (c) => new THREE.Color(c);

// o atlas de 2 × 2: a Holanda, a laranja lisa, a laranja do "33" e a "HOLLAND" laranja e azul
let _atlas = null;
function atlas() {
  return (_atlas ||= canvasTex(256, 256, (x) => {
    x.fillStyle = "#ae1c28"; x.fillRect(0, 0, 128, 43); x.fillStyle = "#ffffff"; x.fillRect(0, 43, 128, 42); x.fillStyle = "#21468b"; x.fillRect(0, 85, 128, 43); // a Holanda: três faixas horizontais
    x.fillStyle = LARANJA; x.fillRect(128, 0, 128, 128); x.fillStyle = "#ffffff"; x.fillRect(128, 56, 128, 16); // a laranja lisa, com a faixa branca
    x.fillStyle = LARANJA; x.fillRect(0, 128, 128, 128); x.fillStyle = "#ffffff"; x.font = "900 76px 'Arial Black', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("33", 64, 196, 110); // o "33"
    x.fillStyle = "#21468b"; x.fillRect(128, 128, 128, 128); x.fillStyle = LARANJA; x.fillRect(128, 128, 128, 34); x.fillRect(128, 222, 128, 34); x.fillStyle = "#ffffff"; x.font = "900 28px Arial, sans-serif"; x.fillText("HOLLAND", 192, 192, 112);
  }, false));
}
const CELULA = [[0, 0.5], [0.5, 0.5], [0, 0], [0.5, 0]]; // o canto de cada bandeira no atlas (u, v), cada uma de 0,5 × 0,5

/**
 * As bandeiras, numa malha só: cada uma é um retângulo de 12 × 8 no alto de uma haste (instanciada), a ponta solta ao vento.
 * @param {Array} lista [{ x, y, z, tipo (0 Holanda, 1 laranja, 2 "33", 3 Holland), r (giro), s (escala), alto }]
 */
export function bandeirasLaranja(tr, add, lista) {
  if (!lista.length) return 0;
  const vs = [], uv = [], idx = [], hastes = [];
  lista.forEach((o, k) => {
    const alto = o.alto ?? 26, s = o.s ?? 1, w = 12 * s, h = 8 * s, c = Math.cos(o.r || 0), sn = Math.sin(o.r || 0), [u0, v0] = CELULA[o.tipo % 4], b = vs.length / 3;
    const ondula = 0.6 + (k % 3) * 0.5;
    for (const [a, yy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { vs.push(o.x + c * w * a + (a ? sn * ondula : 0), o.y + alto - h + h * yy, o.z - sn * w * a + (a ? c * ondula : 0)); uv.push(u0 + 0.5 * a, v0 + 0.5 * yy); }
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    hastes.push({ x: o.x, y: o.y + alto / 2, z: o.z, sx: 0.6, sy: alto, sz: 0.6 });
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas(), roughness: 0.85, side: THREE.DoubleSide }))); m.name = `${tr.id}-bandeiras-torcida`;
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 4), M(0xd9d9d9, { roughness: 0.5 }), hastes, { sombra: false, nome: `${tr.id}-hastes-torcida` });
  tr.bandeirasZandvoort = (tr.bandeirasZandvoort || 0) + lista.length;
  return lista.length;
}

/**
 * A galera nas dunas, de pé e sentada, atrás da cerca.
 * @param {Array} zonas [{ f0, f1, lado, lat0, lat1, dens, bandeiras (fração com bandeira, 0,14), y (elevação extra, em cima de um terraço) }]: de f0 a f1 (frações da volta), do lado 1 ou -1, de lat0 a lat1
 *   do centro da pista, `dens` pessoas por ponto-amostra (de 2 em 2 pontos)
 */
export function torcidaLaranja(tr, add, zonas, cfg = {}) {
  const { pts, n } = tr, r = sorteio(cfg.semente ?? 7771), camisas = cfg.camisas || CAMISAS_NL, corpos = [], cabecas = [], bandeiras = [];
  for (const z of zonas) {
    const a = Math.floor(z.f0 * n), b = Math.floor(z.f1 * n);
    for (let i = a; i <= b; i += 2) {
      const p = pts[((i % n) + n) % n];
      for (let k = 0, q = Math.floor(z.dens) + (r() < z.dens % 1 ? 1 : 0); k < q; k++) {
        const lat = z.lat0 + (z.lat1 - z.lat0) * r() * r(), x = p.x + p.nx * z.lado * lat + p.tx * (r() - 0.5) * 12, zz = p.y + p.ny * z.lado * lat + p.ty * (r() - 0.5) * 12;
        if (tr.distAt(x, zz) < lat - 6 || ocupado(tr, x, zz, i % n)) continue;
        const y = (z.y != null ? p.h + z.y : tr.chao(x, zz)) - 1.5, sentado = r() < 0.4, alto = sentado ? 5.4 : 8, c = camisas[(r() * camisas.length) | 0], chapeu = r() < 0.32;
        corpos.push({ x, y: y + alto / 2, z: zz, sx: 2.8, sy: alto, sz: 2.2, r: r() * 6.28, c });
        cabecas.push({ x, y: y + alto + 1.2, z: zz, sx: 2.3, sy: chapeu ? 2.9 : 2.4, sz: 2.3, r: r() * 6.28, c: chapeu ? CHAPEUS[(r() * CHAPEUS.length) | 0] : PELES[(r() * PELES.length) | 0] });
        if (r() < (z.bandeiras ?? 0.14)) bandeiras.push({ x, y: y + alto - 1, z: zz, tipo: r() < 0.3 ? 0 : r() < 0.5 ? 1 : r() < 0.8 ? 2 : 3, r: r() * 6.28, s: 0.8 + r() * 0.5, alto: 16 + r() * 10 });
      }
    }
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), corpos, { sombra: false, nome: `${tr.id}-torcida-corpos` }), corpos);
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), cabecas, { sombra: false, nome: `${tr.id}-torcida-cabecas` }), cabecas);
  bandeirasLaranja(tr, add, bandeiras);
  tr.torcidaZandvoort = (tr.torcidaZandvoort || 0) + corpos.length;
  return corpos.length;
}

/**
 * A fumaça laranja dos sinalizadores: cada foco solta bolhas que sobem, crescem e somem, empurradas pelo vento do mar (de oeste para leste).
 * Um InstancedMesh só; `animar(dt, foco)` recalcula as matrizes só dos focos a menos de `alcance` da câmera.
 * @param {Array} focos [{ x, y, z, tam }] · @returns {{ animar }}
 */
export function fumacaLaranja(tr, add, focos, { bolhas = 9, alcance = 1300, vento = [22, 8] } = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.36, depthWrite: false, fog: true });
  const geo = new THREE.IcosahedronGeometry(1, 1), total = focos.length * bolhas, malha = new THREE.InstancedMesh(geo, mat, Math.max(1, total)), d = new THREE.Object3D(), r = sorteio(9191);
  const fase = Array.from({ length: total }, () => r()), giro = Array.from({ length: total }, () => r() * 6.28), ciclo = 11;
  malha.name = `${tr.id}-fumaca-laranja`; malha.frustumCulled = false; malha.castShadow = false; malha.receiveShadow = false; malha.renderOrder = 3;
  const colocar = (t, so) => {
    focos.forEach((f, fi) => {
      if (so && so(f) === false) return;
      for (let b = 0; b < bolhas; b++) {
        const k = fi * bolhas + b, idade = (((t / ciclo) + fase[k]) % 1), env = Math.sin(Math.PI * Math.min(1, idade * 1.05)) ** 0.8, rajada = 1 + 0.35 * Math.sin(t * 0.7 + fi), tam = (f.tam ?? 1) * (6 + 30 * idade) * env;
        d.position.set(f.x + vento[0] * rajada * idade * ciclo + Math.cos(giro[k]) * 4 * idade, f.y + 8 + idade * 120 * (f.tam ?? 1), f.z + vento[1] * rajada * idade * ciclo + Math.sin(giro[k]) * 4 * idade);
        d.scale.setScalar(Math.max(0.01, tam)); d.rotation.set(giro[k], idade, 0); d.updateMatrix(); malha.setMatrixAt(k, d.matrix);
      }
    });
    malha.instanceMatrix.needsUpdate = true;
  };
  colocar(0);
  add(malha);
  let tempo = 0;
  const animar = (dt, foco) => {
    tempo += dt;
    colocar(tempo, foco ? (f) => Math.hypot(f.x - foco.x, f.z - foco.y) < alcance : null);
  };
  tr.fumacaZandvoort = { focos: focos.length, bolhas: total };
  return { animar, malha };
}
export const indiceDe = indice;
