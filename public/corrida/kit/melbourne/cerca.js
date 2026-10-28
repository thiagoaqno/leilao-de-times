// Melbourne — a beira da pista de Albert Park: a mureta contínua de publicidade (as faixas azuis, brancas e pretas das fotos) e,
// em cima dela, o alambrado alto de aço, com a ponta inclinada para a pista, os postes e a tela. Tudo são fitas que seguem a
// pista (uma malha por material) mais um InstancedMesh de postes: umas 6 chamadas de desenho para a volta inteira.
// Só cenário: não muda nada da física (o carro passa por dentro, como em qualquer beirada de autódromo sem muro).
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { desenharMarca } from "../marcas.js";
import { instancias } from "../comum.js";

const PASSO = 2; // pontos da pista (de 6 em 6 unidades) entre dois cortes da fita

// os pedaços da volta onde dá para pôr a fita no deslocamento `lat`: nenhum outro trecho da pista (um grampo vizinho) mais perto
// do que ele, e `pular(i, lado)` (o corredor dos boxes, por exemplo) diz que não
function trechos(tr, s, lat, pular) {
  const { pts, n } = tr, runs = [], folga = lat - 4;
  const bom = (i) => {
    const q = i % n, p = pts[q]; if (pular?.(q, s) || tr.coberto?.(q)) return false;
    const x = p.x + p.nx * s * lat, z = p.y + p.ny * s * lat;
    return tr.distAt(x, z) >= folga && tr.distAt(x + p.tx * 16, z + p.ty * 16) >= folga && tr.distAt(x - p.tx * 16, z - p.ty * 16) >= folga;
  };
  let a = -1;
  for (let i = 0; i <= n; i += PASSO) {
    const ok = bom(i);
    if (ok && a < 0) a = i;
    if ((!ok || i + PASSO > n) && a >= 0) { const fim = ok ? i : i - PASSO; if (fim - a >= 2 * PASSO) runs.push([a, fim]); a = -1; }
  }
  return runs;
}

// Uma fita com o perfil `perfil` = [[deslocamento, altura, v]...] (deslocamento em módulo, na direção do lado `s`), de cima a baixo,
// ao longo dos trechos. A textura corre ao longo da pista (u) e a altura é o v do perfil. `tile` = comprimento de uma repetição.
function fita(tr, runs, s, perfil, tile) {
  const { pts, n } = tr, vs = [], uv = [], idx = [];
  for (const [i0, i1] of runs) {
    const base = vs.length / 3; let dist = 0, ant = null;
    for (let i = i0; i <= i1; i += PASSO) {
      const p = pts[i % n]; if (ant) dist += Math.hypot(p.x - ant.x, p.y - ant.y); ant = p;
      for (const [l, y, v] of perfil) { vs.push(p.x + p.nx * s * l, p.h - 1.5 + y, p.y + p.ny * s * l); uv.push(dist / tile, v); }
      const k = perfil.length, c = base + ((i - i0) / PASSO) * k;
      if (i < i1) for (let j = 0; j < k - 1; j++) idx.push(c + j, c + j + k, c + j + 1, c + j + 1, c + j + k, c + j + k + 1);
    }
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// a tela do alambrado: losangos de arame claro sobre um véu escuro (transparente: a tribuna aparece por trás, como nas fotos)
const telaTex = () => canvasTex(64, 64, (x, w, h) => {
  x.clearRect(0, 0, w, h); x.fillStyle = "rgba(18,22,28,0.06)"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(200,208,214,0.9)"; x.lineWidth = 1.3;
  for (let k = -h; k <= w + h; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
});
// a faixa de patrocinadores da mureta: 8 marcas de 4:1 lado a lado (uma volta de textura = 8 × 40 unidades)
const faixaTex = (marcas) => canvasTex(2048, 64, (x, w, h) => {
  const m = marcas.length, cw = w / m;
  marcas.forEach((nome, k) => { x.save(); x.beginPath(); x.rect(k * cw, 0, cw, h); x.clip(); desenharMarca(x, nome, k * cw, 0, cw, h); x.restore(); });
  x.fillStyle = "#00000055"; x.fillRect(0, h - 3, w, 3);
});

/**
 * A mureta de publicidade e o alambrado alto por cima, dos dois lados da pista.
 * @param {object} tr a pista · @param {Function} add põe na cena
 * @param {object} o
 * @param {number} [o.lat=91.2] deslocamento da frente da mureta · @param {number} [o.altura=58] do alambrado, do chão · @param {number} [o.alto=10] da mureta
 * @param {number} [o.inclinacao=9] quanto a ponta do alambrado se inclina para a pista · @param {string[]} [o.marcas] as marcas da faixa (8)
 * @param {(i:number, lado:number)=>boolean} [o.pular] onde não pôr (o corredor dos boxes)
 */
export function alambrado(tr, add, { lat = 91.2, altura = 58, alto = 10, inclinacao = 9, marcas = ["ausgp", "rolex", "heineken", "pirelli", "aramco", "dhl", "f1", "aws"], pular } = {}) {
  const tela = new THREE.MeshStandardMaterial({ map: telaTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.35 });
  const faixaM = new THREE.MeshStandardMaterial({ map: faixaTex(marcas), roughness: 0.7, side: THREE.DoubleSide });
  const concreto = new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.85, side: THREE.DoubleSide });
  const aco = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.5 });
  const postes = [], stats = (tr.alambradoGP = { trechos: 0, postes: 0 });
  const pe = lat + 2.4, tileTela = 32, tileFaixa = 320;
  for (const s of [-1, 1]) {
    const runs = trechos(tr, s, pe + 1, pular); stats.trechos += runs.length;
    // a faixa de patrocínio (v de 0 a 1 de baixo para cima; o lado +1 espelha para o texto sair certo para quem passa)
    const frente = fita(tr, runs, s, [[lat, 0, 0], [lat, alto, 1]], tileFaixa);
    if (frente) { if (s > 0) { const u = frente.attributes.uv; for (let k = 0; k < u.count; k++) u.setX(k, -u.getX(k)); } add(new THREE.Mesh(frente, faixaM)).receiveShadow = true; }
    const topo = fita(tr, runs, s, [[lat, alto, 0], [pe, alto + 0.6, 0], [pe, 0, 0]], 40); // o capuz e as costas da mureta
    if (topo) add(new THREE.Mesh(topo, concreto)).castShadow = true;
    // o alambrado: tela reta até o alto e a ponta inclinada para a pista
    const reta = fita(tr, runs, s, [[pe - 0.4, alto + 0.6, 0], [pe - 0.4, altura, altura / tileTela]], tileTela);
    const ponta = fita(tr, runs, s, [[pe - 0.4, altura, 0], [pe - 0.4 - inclinacao, altura + inclinacao * 0.9, 0.3]], tileTela);
    for (const g of [reta, ponta]) if (g) { const m = add(new THREE.Mesh(g, tela)); m.renderOrder = 2; }
    // os postes (a cada 5 pontos) e a travessa do alto, num InstancedMesh só
    const { pts, n } = tr;
    for (const [i0, i1] of runs) for (let i = i0; i <= i1; i += 6) {
      const p = pts[i % n], x = p.x + p.nx * s * (pe - 0.4), z = p.y + p.ny * s * (pe - 0.4), y0 = p.h - 1.5;
      postes.push({ x, y: y0 + (altura + alto) / 2 + 0.3, z, sx: 1.3, sy: altura - alto + 1, sz: 1.3, r: 0 });
      // o braço que segura a ponta inclinada (uma caixa pequena em cima, deslocada para a pista)
      postes.push({ x: x - p.nx * s * inclinacao * 0.5, y: y0 + altura + inclinacao * 0.45, z: z - p.ny * s * inclinacao * 0.5, sx: 1, sy: 1, sz: 1, r: Math.atan2(p.nx, p.ny) });
      stats.postes++;
    }
  }
  instancias(add, new THREE.BoxGeometry(1, 1, 1), aco, postes, { nome: `${tr.id}-alambrado-postes`, sombra: false });
}
