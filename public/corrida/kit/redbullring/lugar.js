// Red Bull Ring — as ferramentas de posição das peças só desta pista: pôr um grupo (origem no meio da frente, frente para +z) ao lado
// da pista de frente para ela, conferir se a pegada cabe fora da pista e fora do que já foi reservado, reservar o lugar, e o ruído de
// valor que decide onde a mata, o pasto e as encostas ficam (o mesmo desenho sempre). Nada aqui muda a física: é só onde as coisas vão.
import * as THREE from "three";
import { M } from "../../cena.js";
import { ocupado } from "../comum.js";

export const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;
export const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const suave = (t) => t * t * (3 - 2 * t);
export const passo01 = (a, b, v) => suave(lim((v - a) / (b - a)));

// ---- ruído de valor, suave, que repete sempre igual ----
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export function ruido(x, z, s = 1) {
  const i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j), a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** O ponto (x, z) está dentro da volta (a linha central como polígono)? */
export function dentroDaVolta(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; }
  return d;
}
/** O maior recuo da barreira (da borda do asfalto até a face dela) do lado `lado`, de f a `ao` ± w/2 ao longo da pista: nada entra entre a pista e a barreira. */
export function recuoMax(tr, lado, f, ao = 0, w = 0) {
  const m = tr.murosEscape?.[lado]; if (!m) return 0;
  const c = indice(tr, f) + Math.round(ao / 6), meio = Math.ceil(w / 12) + 2; let r = 0;
  for (let i = c - meio; i <= c + meio; i++) r = Math.max(r, m[((i % tr.n) + tr.n) % tr.n] || 0);
  return r;
}

// o lado (1 ou -1) de DENTRO da curva em f: o sinal do giro (a direita gira para +n, a esquerda para -n)
export function ladoDeDentro(tr, f) {
  const { pts, n } = tr, i = indice(tr, f), p = pts[i], q = pts[(i + 8) % n];
  return p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1;
}

/** Põe um grupo (origem no meio da frente, frente para +z) a `lat` do eixo, do lado `lado`, em f e `ao` ao longo da pista, de frente para a pista. */
export function pousar(tr, g, f, lado, lat, ao = 0, folgaY = 1) {
  const p = tr.pts[indice(tr, f)], x = p.x + p.nx * lado * lat + p.tx * ao, z = p.y + p.ny * lado * lat + p.ty * ao, ry = Math.atan2(-lado * p.nx, -lado * p.ny);
  g.position.set(x, tr.chao(x, z) - folgaY, z); g.rotation.y = ry;
  return { x, z, ry, p };
}
// o ponto (u para o lado da peça, v para trás a partir da frente) de um grupo de frente `ry` posto em (x, z)
export const mundo = (x, z, ry, u, v) => [x + Math.cos(ry) * u - Math.sin(ry) * v, z - Math.sin(ry) * u - Math.cos(ry) * v];
/** A pegada w × d cabe? Nove pontos (cantos, meios e centro) a mais de `folga` da borda da pista e fora do que já foi reservado. */
export function cabe(tr, x, z, ry, w, d, folga = 24) {
  for (const u of [-w / 2, 0, w / 2]) for (const v of [0, d / 2, d]) {
    const [px, pz] = mundo(x, z, ry, u, v);
    if (tr.distAt(px, pz) < tr.W / 2 + folga || ocupado(tr, px, pz)) return false;
  }
  return true;
}
/** Reserva a pegada (círculos ao longo da largura): as árvores, a torcida e o resto não entram. */
export function reservar(tr, x, z, ry, w, d, folga = 22) {
  const r = d / 2 + folga, passo = Math.max(20, d * 0.7);
  for (let u = -w / 2; u <= w / 2 + 0.1; u += passo) { const [px, pz] = mundo(x, z, ry, u, d / 2); tr.reservado.push([px, pz, r]); }
}
/** O aterro de terra verde sob a peça: o chão desce para longe da pista e a peça não pode ficar flutuando. */
export function aterro(g, w, d, fundo = 130) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w + 4, fundo, d + 4), M(0x5d7a3a, { roughness: 1 })); b.position.set(0, -fundo / 2 - 0.4, -d / 2); g.add(b); return b;
}
/** Tenta em cada deslocamento da lista, do lado `lado` e depois do outro (se `ambos`); põe, reserva e devolve onde ficou (ou null). */
export function colocar(tr, add, g, { nome = g.name, f, lado, lats, ao = 0, w, d, folga = 24, ambos = false, base = true, reserva = 22 }) {
  for (const l of ambos ? [lado, -lado] : [lado]) for (const lat of lats) {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * l * lat + p.tx * ao, z = p.y + p.ny * l * lat + p.ty * ao, ry = Math.atan2(-l * p.nx, -l * p.ny);
    if (lat < tr.W / 2 + recuoMax(tr, l, f, ao, w) + 14) continue; // por dentro da barreira não entra nada
    if (!cabe(tr, x, z, ry, w, d, folga)) continue;
    pousar(tr, g, f, l, lat, ao); if (base) aterro(g, w, d); add(g); if (reserva !== null) reservar(tr, x, z, ry, w, d, reserva);
    (tr.pecasAustria ||= []).push({ nome, f: +f.toFixed(4), ao, lado: l, lat: Math.round(lat), x: Math.round(x), z: Math.round(z), ry, w, d });
    return { x, z, ry, w, d, lado: l, lat };
  }
  (tr.faltouAustria ||= []).push({ nome, f });
  return null;
}
/** O som da torcida (kit/som.js): de f0 a f1. */
export const somDaTorcida = (tr, f0, f1) => (tr.arquibancadas ||= []).push([indice(tr, f0), indice(tr, f1)]);

/** A direção para fora da volta e a abertura do vale: o centro da volta e o ângulo (de -π a π) do lado aberto, onde as encostas baixam. */
export function abertura(tr, anguloAberto = Math.PI / 2) {
  let cx = 0, cz = 0; for (const p of tr.pts) { cx += p.x; cz += p.y; } cx /= tr.n; cz /= tr.n;
  // quanto da encosta vale naquele ponto: 1 nos três lados fechados, ~0,12 no lado do vale aberto
  const fecho = (x, z) => {
    let d = Math.atan2(z - cz, x - cx) - anguloAberto; d = Math.atan2(Math.sin(d), Math.cos(d));
    return 0.12 + 0.88 * passo01(0.45, 1.25, Math.abs(d));
  };
  return { cx, cz, fecho };
}
