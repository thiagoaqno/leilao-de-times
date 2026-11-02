// Miami — as ferramentas de posição das peças deste circuito (kit/miami/): o ponto da pista numa fração da volta, pôr um grupo de frente
// para a pista a uma distância do eixo, conferir se a pegada cabe (fora do asfalto e do que já foi reservado), reservar o lugar, achar um
// lugar livre no miolo do circuito e o ruído de valor que sempre repete igual.
import { ocupado, sorteio } from "../comum.js";

export const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;
export const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export { sorteio };
const suave = (t) => t * t * (3 - 2 * t);
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export function ruido(x, z, s = 1) {
  const i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j), a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
// o ponto (u para o lado da peça, v para trás a partir da frente) de um grupo de frente `ry` posto em (x, z)
export const mundoDe = (x, z, ry, u, v) => [x + Math.cos(ry) * u - Math.sin(ry) * v, z - Math.sin(ry) * u - Math.cos(ry) * v];

// Põe um grupo (origem no meio da frente, frente para +z) a `lat` do eixo, do lado `lado`, em f e `ao` ao longo da pista, de frente para a pista.
export function pousar(tr, g, f, lado, lat, ao = 0, elev = 0) {
  const p = tr.pts[indice(tr, f)], x = p.x + p.nx * lado * lat + p.tx * ao, z = p.y + p.ny * lado * lat + p.ty * ao, ry = Math.atan2(-lado * p.nx, -lado * p.ny);
  g.position.set(x, tr.chao(x, z) - 1 + elev, z); g.rotation.y = ry;
  return { x, z, ry, p };
}
// a pegada w × d (de frente para a pista, com a frente em z = 0) cabe? Nove pontos a mais de `folga` da borda da pista e fora do reservado
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
// reserva um retângulo girado qualquer (centro, rotação, meias medidas) com círculos
export function reservarRet(tr, cx, cz, rot, a, b, folga = 20) {
  const c = Math.cos(rot), s = Math.sin(rot), r = Math.min(a, b) * 0.7 + folga, passo = Math.max(24, r);
  for (let u = -a; u <= a + 0.1; u += passo) for (let v = -b; v <= b + 0.1; v += passo) tr.reservado.push([cx + c * u - s * v, cz + s * u + c * v, r]);
}
// o retângulo girado cabe no miolo (a pista, ou outra coisa reservada, fica a mais de `folga` de todos os pontos de uma grade)?
export function cabeRet(tr, cx, cz, rot, a, b, folga = 40) {
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let u = -a; u <= a + 0.1; u += a / 2) for (let v = -b; v <= b + 0.1; v += b / 2) {
    const x = cx + c * u - s * v, z = cz + s * u + c * v;
    if (tr.distAt(x, z) < tr.W / 2 + folga || ocupado(tr, x, z)) return false;
  }
  return true;
}
// procura, em volta de (cx, cz), o retângulo que cabe; devolve { x, z } ou null
export function acharRet(tr, cx, cz, rot, a, b, { folga = 40, raio = 260, passo = 40 } = {}) {
  for (let r = 0; r <= raio; r += passo) {
    const k = Math.max(1, Math.round(r / passo) * 6);
    for (let q = 0; q < k; q++) {
      const ang = (q / k) * Math.PI * 2, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
      if (cabeRet(tr, x, z, rot, a, b, folga)) return { x, z };
    }
  }
  return null;
}
// tenta em cada deslocamento da lista, do lado `lado` e depois do outro (se `ambos`); põe, reserva e devolve onde ficou (ou null)
export function colocar(tr, add, g, { nome = g.name, f, lado, lats, ao = 0, w, d, folga = 24, ambos = false, reserva = 22, elev = 0 }) {
  for (const l of ambos ? [lado, -lado] : [lado]) for (const lat of lats) {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * l * lat + p.tx * ao, z = p.y + p.ny * l * lat + p.ty * ao, ry = Math.atan2(-l * p.nx, -l * p.ny);
    if (!cabe(tr, x, z, ry, w, d, folga)) continue;
    pousar(tr, g, f, l, lat, ao, elev); add(g); if (reserva !== null) reservar(tr, x, z, ry, w, d, reserva);
    (tr.pecasMiami ||= []).push({ nome, f: +f.toFixed(4), ao, lado: l, lat: Math.round(lat), x: Math.round(x), z: Math.round(z), ry, w, d });
    return { x, z, ry, w, d, lado: l, lat };
  }
  (tr.faltouMiami ||= []).push({ nome, f });
  return null;
}
// o som da torcida (kit/som.js): de f0 a f1
export const somDaTorcida = (tr, f0, f1) => (tr.arquibancadas ||= []).push([indice(tr, f0), indice(tr, f1)]);
// a menor e a maior altura do chão sob uma pegada retangular (o prédio fica no nível mais alto e a base desce até o mais baixo)
export function alturaDoChao(tr, cx, cz, rot, a, b) {
  const c = Math.cos(rot), s = Math.sin(rot); let lo = 1e9, hi = -1e9;
  for (let u = -a; u <= a + 0.1; u += a / 2) for (let v = -b; v <= b + 0.1; v += b / 2) { const h = tr.chao(cx + c * u - s * v, cz + s * u + c * v); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  return { lo, hi };
}
// a elipse (centro, semieixos a e b no eixo x) cabe? Todos os pontos do contorno a mais de `folga` da borda da pista
export function cabeElipse(tr, cx, cz, a, b, folga = 40) {
  for (let k = 0; k < 48; k++) { const t = (k / 48) * Math.PI * 2; { const px = cx + a * Math.cos(t), pz = cz + b * Math.sin(t); if (tr.distAt(px, pz) < tr.W / 2 + folga || ocupado(tr, px, pz)) return false; } }
  return tr.distAt(cx, cz) >= tr.W / 2 + folga;
}
// o centro dentro da caixa [x0, x1, z0, z1] onde a elipse cabe com a MAIOR folga (de `max` a `min`); null se nenhuma cabe
export function acharElipse(tr, [x0, x1, z0, z1], a, b, { max = 130, min = 24, passo = 20 } = {}) {
  for (let folga = max; folga >= min; folga -= 12) {
    let melhor = null, d2 = 1e18; const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    for (let x = x0; x <= x1; x += passo) for (let z = z0; z <= z1; z += passo) if (cabeElipse(tr, x, z, a, b, folga)) { const d = (x - mx) ** 2 + (z - mz) ** 2; if (d < d2) { d2 = d; melhor = { x, z, folga }; } }
    if (melhor) return melhor;
  }
  return null;
}
