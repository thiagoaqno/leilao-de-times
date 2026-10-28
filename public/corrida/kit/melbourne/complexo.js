// Melbourne — as construções da reta principal de Albert Park, montadas com o kit 2: a arquibancada longa de aço (Fangio) em
// frente aos boxes, o complexo dos boxes (andar de garagens, faixa de vidro e as arquibancadas de cobertura azul e vermelha, como
// nas fotos aéreas) e o paddock com as tendas brancas. As peças do kit são retas e de frente para +z: aqui cada uma é posta ao
// longo da reta, de frente para a pista, e só fica onde a beirada dela está onde foi desenhada (`distAt`).
import * as THREE from "three";
import { tribunaCoberta, tendaPaddock } from "../coberturas.js";
import { Montador, solido, vidro, tom } from "../montagem.js";
import { sorteio } from "../comum.js";

// o lugar de uma peça: centro da frente em (x, z) e a direção da frente (para a pista); retângulo para tr.ocupado
function lugar(tr, i, lado, lat) {
  const p = tr.pts[((i % tr.n) + tr.n) % tr.n], dx = -lado * p.nx, dz = -lado * p.ny;
  return { p, x: p.x + p.nx * lado * lat, z: p.y + p.ny * lado * lat, dx, dz, ry: Math.atan2(dx, dz) };
}
// põe o grupo `g` (comprimento L, profundidade P) com a frente em `lat`, centrado no ponto i. Devolve o retângulo ou null.
function colocar(tr, add, g, i, lado, lat, L, P, { y = 0, folga = 5, checar = true } = {}) {
  const o = lugar(tr, i, lado, lat), ex = [o.dz, -o.dx];
  if (checar) for (const s of [-1, 1]) for (const f of [0, 0.5, 1]) {
    const x = o.x + ex[0] * s * L / 2 - o.dx * f * P, z = o.z + ex[1] * s * L / 2 - o.dz * f * P;
    if (tr.distAt(x, z) < Math.abs(lat) - folga - (f ? 0 : 0)) return null;
  }
  g.position.set(o.x, o.p.h - 1.5 + y, o.z); g.rotation.y = o.ry; add(g);
  const r = { cx: o.x - o.dx * P / 2, cz: o.z - o.dz * P / 2, ex, ez: [o.dx, o.dz], a: L / 2, b: P / 2 };
  (tr.retangulosGP ||= []).push(r);
  for (let k = -1; k <= 1; k++) tr.reservado.push([r.cx + ex[0] * k * L / 3, r.cz + ex[1] * k * L / 3, Math.max(P, L / 3) * 0.7]); // os enfeites soltos não entram
  return r;
}
/** `tr.ocupado` do GP: dentro dos retângulos das construções (com uma margem) ou do que mais o GP quiser (`tr.outrosOcupados`). */
export function instalarOcupado(tr, extra) {
  tr.ocupado = (x, z) => {
    for (const r of tr.retangulosGP || []) { const rx = x - r.cx, rz = z - r.cz; if (Math.abs(rx * r.ex[0] + rz * r.ex[1]) < r.a + 8 && Math.abs(rx * r.ez[0] + rz * r.ez[1]) < r.b + 8) return true; }
    return !!extra?.(x, z);
  };
}

/**
 * A arquibancada longa em frente aos boxes (Fangio / Piastri): degraus de assentos escuros lotados, estrutura de aço e cobertura
 * escura sobre quase tudo. Peças de `comprimento` em fila, do ponto `de` ao `ate` (frações da volta).
 */
export function arquibancadaLonga(tr, add, { de, ate, lado = -1, lat = 99, comprimento = 240, degraus = 12, publico = 0.34, cobertura = "#2d3238", cores = ["#243b73", "#3a3f48", "#7a2a2a"], secoes = 5 } = {}) {
  const { n } = tr, passo = Math.round(comprimento / 6) + 1; let a = Math.floor(de * n), b = Math.floor(ate * n); if (b < a) b += n;
  let k = 0, feitas = 0;
  for (let i = a + (passo >> 1); i <= b - (passo >> 1) + 1; i += passo, k++) {
    const g = tribunaCoberta({ comprimento, degraus, altura: 4.6, fundo: 7, cores, secoes, cobertura, estrutura: "#59616b", publico, alcance: 0.62, folga: 18, semente: 11 + k });
    const r = colocar(tr, add, g, i, lado, lat, comprimento, degraus * 7 + 6); if (!r) continue;
    feitas++; tr.arquibancadas ||= []; tr.arquibancadas.push([i - (passo >> 1), i + (passo >> 1)]);
  }
  tr.arquibancadaLongaGP = feitas;
}

const EQUIPES = ["#ff8700", "#e8002d", "#27f4d2", "#3671c6", "#6692ff", "#229971", "#37bedd", "#d7172f", "#ff87bc", "#c6cbd0"];
/**
 * O complexo dos boxes atrás das garagens do corredor: o prédio de garagens (faixas na cor das equipes, vidros, platibanda) e, em
 * cima, as arquibancadas de cobertura azul e vermelha. Centrado no ponto `centro` (índice), `pecas` peças de `comprimento`.
 */
export function complexoDosBoxes(tr, add, { centro = 0, lado = 1, lat = 150, pecas = 4, comprimento = 150, prof = 56, alto = 26 } = {}) {
  const passo = Math.round(comprimento / 6), S = solido(), V = vidro();
  for (let k = 0; k < pecas; k++) {
    const i = centro + Math.round((k - (pecas - 1) / 2) * passo);
    const g = new THREE.Group(), m = new Montador();
    m.caixa(S, [0, alto / 2, -prof / 2], [comprimento, alto, prof], { cor: "#d4d7da" }); // o volume
    m.caixa(S, [0, 1, 0.8], [comprimento, 2, 1.6], { cor: "#8a9096" }); // o rodapé
    for (let q = 0; q < 6; q++) { // as faixas das equipes sobre as portas das garagens
      const x = -comprimento / 2 + (q + 0.5) * comprimento / 6;
      m.caixa(S, [x, 10, 0.4], [comprimento / 6 - 3, 8, 0.8], { cor: "#23272d" }); m.caixa(S, [x, 15, 0.9], [comprimento / 6 - 3, 2.2, 1.2], { cor: EQUIPES[(k * 6 + q) % 10] });
    }
    m.caixa(V, [0, alto - 5.5, 0.5], [comprimento - 2, 7, 0.8], { cor: "#26303a" }); // a faixa de vidro das suítes
    for (let q = 0; q <= 15; q++) m.caixa(S, [-comprimento / 2 + 1 + q * (comprimento - 2) / 15, alto - 5.5, 1], [0.7, 7.4, 0.8], { cor: "#f2f4f5" });
    m.caixa(S, [0, alto + 0.6, -prof / 2 + 1], [comprimento + 2, 1.4, prof + 2], { cor: tom("#9aa0a6", 1) }); // o teto
    g.add(m.montar("complexo-boxes"));
    // as arquibancadas de cima: cobertura azul e vermelha alternadas
    const t = tribunaCoberta({ comprimento, degraus: 6, altura: 4.6, fundo: 6.4, cores: ["#2f5fd0", "#6a45c8"], secoes: 3, cobertura: k % 2 ? "#c8102e" : "#1d4e9e", estrutura: "#8a9096", publico: 0.3, alcance: 0.85, semente: 40 + k });
    t.position.set(0, alto + 1.4, -2); g.add(t);
    colocar(tr, add, g, i, lado, lat, comprimento, prof, { checar: false });
  }
}

/** O paddock: tendas brancas em fileiras atrás do complexo (poucas com letreiro, para não pesar), mais uma grande de hospitalidade. */
export function paddock(tr, add, { centro = 0, lado = 1, lat = 225, fileiras = 3, tendas = 7, passo = 24, textos = ["AUSTRALIAN GP", "PADDOCK CLUB", "HEINEKEN", "ROLEX"] } = {}) {
  const r = sorteio(77); let feitos = 0;
  for (let f = 0; f < fileiras; f++) for (let k = 0; k < tendas; k++) {
    if (r() < 0.2) continue;
    const mod = 2 + ((r() * 3) | 0), fil = 2, texto = f === 0 && textos[k % textos.length] && k % 2 === 0 ? textos[k % textos.length] : "";
    const g = tendaPaddock({ modulos: mod, filas: fil, texto, corFaixa: ["#c8102e", "#0e1f4a", "#007a3d"][(r() * 3) | 0], mesas: r() < 0.7, corMesas: "#c8102e" });
    const L = mod * 34, P = fil * 34, i = centro + Math.round((k - (tendas - 1) / 2) * (passo + 6));
    if (colocar(tr, add, g, i, lado, lat + f * 78 + P, L, P, { folga: 8 })) feitos++;
  }
  tr.paddockGP = feitos;
}
