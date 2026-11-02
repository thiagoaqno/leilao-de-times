// Xangai — as ferramentas de posição das peças deste circuito (kit/xangai/): o ponto da pista numa fração da volta, pôr um grupo de frente para a
// pista a uma distância do eixo, conferir se a pegada cabe (fora do asfalto e do que já foi reservado), reservar o lugar e o ruído de valor que
// sempre repete igual (os gramados, os bosques, os lagos). Só deste GP: não depende de outra pista.
import * as THREE from "three";
import { ocupado } from "../comum.js";
import { M } from "../../cena.js";

export const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;
export const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const suave = (t) => t * t * (3 - 2 * t);
export const passo01 = (a, b, v) => suave(lim((v - a) / (b - a)));

// ruído de valor (suave, sempre igual)
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export function ruido(x, z, s = 1) {
  const i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j), a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

// o ponto do mundo a `lat` do eixo (positivo = lado +1, a direita de quem anda; negativo = a esquerda) e `ao` à frente, na fração `f` da volta
export function ponto(tr, f, lat = 0, ao = 0) {
  const p = tr.pts[indice(tr, f)];
  return { x: p.x + p.nx * lat + p.tx * ao, z: p.y + p.ny * lat + p.ty * ao, p };
}

// o ponto (u para o lado da peça, v para trás a partir da frente) de um grupo de frente `ry` posto em (x, z)
export const mundoDe = (x, z, ry, u, v) => [x + Math.cos(ry) * u - Math.sin(ry) * v, z - Math.sin(ry) * u - Math.cos(ry) * v];

// Põe um grupo (origem no meio da frente, frente para +z) a `lat` do eixo, do lado `lado`, em f e `ao` ao longo da pista, de frente para a pista.
export function pousar(tr, g, f, lado, lat, ao = 0, elev = 0) {
  const p = tr.pts[indice(tr, f)], x = p.x + p.nx * lado * lat + p.tx * ao, z = p.y + p.ny * lado * lat + p.ty * ao, ry = Math.atan2(-lado * p.nx, -lado * p.ny);
  g.position.set(x, tr.chao(x, z) - 1 + elev, z); g.rotation.y = ry;
  return { x, z, ry, p };
}
// a pegada w × d cabe? Nove pontos (cantos, meios e centro) a mais de `folga` da borda da pista e fora do que já foi reservado
export function cabe(tr, x, z, ry, w, d, folga = 24) {
  for (const u of [-w / 2, 0, w / 2]) for (const v of [0, d / 2, d]) {
    const [px, pz] = mundoDe(x, z, ry, u, v);
    if (tr.distAt(px, pz) < tr.W / 2 + folga || ocupado(tr, px, pz)) return false;
  }
  return true;
}
// reserva a pegada (círculos ao longo da largura): as árvores, a torcida e o resto não entram
export function reservar(tr, x, z, ry, w, d, folga = 22) {
  const r = d / 2 + folga, passo = Math.max(20, d * 0.7);
  for (let u = -w / 2; u <= w / 2 + 0.1; u += passo) { const [px, pz] = mundoDe(x, z, ry, u, d / 2); tr.reservado.push([px, pz, r]); }
}
// o aterro sob a peça: o chão desce para longe da pista e a peça não pode ficar flutuando
export function aterro(g, w, d, fundo = 130, cor = 0x9a9a92) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w + 4, fundo, d + 4), M(cor, { roughness: 1 })); b.position.set(0, -fundo / 2 - 0.4, -d / 2); g.add(b); return b;
}
// tenta em cada deslocamento da lista, do lado `lado` e depois do outro (se `ambos`); põe, reserva e devolve onde ficou (ou null)
export function colocar(tr, add, g, { nome = g.name, f, lado, lats, ao = 0, w, d, folga = 24, ambos = false, base = true, reserva = 22, elev = 0 }) {
  for (const l of ambos ? [lado, -lado] : [lado]) for (const lat of lats) {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * l * lat + p.tx * ao, z = p.y + p.ny * l * lat + p.ty * ao, ry = Math.atan2(-l * p.nx, -l * p.ny);
    if (!cabe(tr, x, z, ry, w, d, folga)) continue;
    pousar(tr, g, f, l, lat, ao, elev); if (base) aterro(g, w, d, 130 + elev); add(g); if (reserva !== null) reservar(tr, x, z, ry, w, d, reserva);
    (tr.pecasXangai ||= []).push({ nome, f: +f.toFixed(4), ao, lado: l, lat: Math.round(lat), x: Math.round(x), z: Math.round(z), ry, w, d });
    return { x, z, ry, w, d, lado: l, lat };
  }
  (tr.faltouXangai ||= []).push({ nome, f });
  return null;
}
// o som da torcida (kit/som.js): de f0 a f1
export const somDaTorcida = (tr, f0, f1) => (tr.arquibancadas ||= []).push([indice(tr, f0), indice(tr, f1)]);
