// Austin — as ferramentas de posição das peças deste circuito (kit/austin/): são as de Miami (a fração da volta, a pegada que cabe, o lugar reservado,
// o ruído de valor que sempre repete igual), reexportadas, mais `colocar` com o aterro de terra seca sob a peça e a pergunta "este ponto está dentro da volta?".
import * as THREE from "three";
import { M } from "../../cena.js";
import { indice, cabe, reservar, pousar } from "../miami/lugar.js";
export { indice, lim, sorteio, ruido, mundoDe, pousar, cabe, reservar, reservarRet, cabeRet, acharRet, cabeElipse, acharElipse, alturaDoChao, somDaTorcida } from "../miami/lugar.js";

// o ponto (x, z) está dentro do laço da pista (a linha central como polígono)?
export function dentroDaVolta(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; }
  return d;
}
// o aterro de terra seca sob a peça: o chão cai para longe da pista e a peça não pode ficar flutuando
let _terra = null;
export function aterro(g, w, d, fundo = 140) {
  _terra ||= M(0x8f8a5c, { roughness: 1 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w + 4, fundo, d + 4), _terra); b.position.set(0, -fundo / 2 - 0.4, -d / 2); g.add(b); return b;
}
// tenta em cada deslocamento da lista, do lado `lado` e depois do outro (se `ambos`); põe, reserva e devolve onde ficou (ou null)
export function colocar(tr, add, g, { nome = g.name, f, lado, lats, ao = 0, w, d, folga = 24, ambos = false, base = true, reserva = 22 }) {
  for (const l of ambos ? [lado, -lado] : [lado]) for (const lat of lats) {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * l * lat + p.tx * ao, z = p.y + p.ny * l * lat + p.ty * ao, ry = Math.atan2(-l * p.nx, -l * p.ny);
    if (!cabe(tr, x, z, ry, w, d, folga)) continue;
    pousar(tr, g, f, l, lat, ao); if (base) aterro(g, w, d); add(g); if (reserva !== null) reservar(tr, x, z, ry, w, d, reserva);
    (tr.pecasAustin ||= []).push({ nome, f: +f.toFixed(4), ao, lado: l, lat: Math.round(lat), x: Math.round(x), z: Math.round(z), ry, w, d });
    return { x, z, ry, w, d, lado: l, lat };
  }
  (tr.faltouAustin ||= []).push({ nome, f });
  return null;
}
// o recuo da barreira (da borda do asfalto até a face dela) na fração f, do lado l: o que `muros` de pistas.js disse; sem barreira, `padrao`
export function recuoDoMuro(tr, l, f, padrao = 30) { const r = tr.murosEscape?.[l]?.[indice(tr, f)]; return r > 0 ? r : padrao; }
