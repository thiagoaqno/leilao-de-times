// Montreal — os muros de concreto colados na pista (a marca do circuito: quase não há área de escape), o alambrado em cima deles, os
// blocos vermelhos e brancos de proteção e o Muro dos Campeões, na saída da chicane final, com a inscrição "Bienvenue au Québec".
// Tudo é cenário (a física não muda): o muro fica a MURO_LAT da linha central, depois da zebra e da faixa de escape do kit.
//   muros(tr, add, trechos) · [{ de, ate, lado, lat, alto }] (frações da volta; lado 1 ou -1; `lat`: o deslocamento; `cerca`: false tira o alambrado)
//   blocos(tr, add, trechos) · os blocos de plástico/concreto vermelhos e brancos (a faixa que corre em frente do muro)
//   muroDosCampeoesMontreal(tr, add, f0, f1) · o muro branco com a inscrição e a pilha de pneus vermelhos e brancos na frente
// Referências (Wikimedia Commons): "Circuit Gilles Villeneuve Famous Wall" (a inscrição preta em cursiva, os pneus pintados e os blocos vermelhos e
// brancos na frente, o alambrado em cima), "Felipe Massa Canada 2012" e "Circuit Gilles-Villeneuve1" (concreto cinza claro com alambrado e
// bloco vermelho e branco nas curvas).
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { lotes, tira, recortar, sinalDaCurva, sorteio } from "../comum.js";
import { muroDosCampeoes } from "./marcas.js";

export const MURO_LAT = 88; // da linha central: W/2 + 28

const matConcreto = () => new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide, map: canvasTex(128, 64, (x, w, h, rr) => {
  x.fillStyle = "#d8d6d0"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000010" : "#ffffff16"; x.fillRect(rr() * w, rr() * h, 3, 2); }
  x.fillStyle = "#b3b1aa"; x.fillRect(0, 0, 2, h); x.fillRect(0, h - 6, w, 6); x.fillStyle = "#c8c6bf"; x.fillRect(0, 0, w, 3); // a junta das placas e a base manchada
}) });
const matTopo = () => new THREE.MeshStandardMaterial({ color: 0xc9c7c0, roughness: 0.9, side: THREE.DoubleSide });
const matAlambrado = () => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.4, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.2, map: canvasTex(32, 32, (x, w, h) => {
  x.clearRect(0, 0, w, h); x.strokeStyle = "#8d9399"; x.lineWidth = 1.5;
  for (let k = -h; k < w + h; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
  x.fillStyle = "#6e757c"; x.fillRect(0, 0, w, 3); x.fillRect(w - 2, 0, 2, h); // o poste (uma linha por repetição) e o fio de cima
}) });
const matBloco = () => new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, map: canvasTex(16, 64, (x, w, h, rr) => { // o v corre ao longo do bloco: metade vermelha, metade branca
  x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, w, h); x.fillStyle = "#d52b1e"; x.fillRect(0, 0, w, h / 2);
  for (let i = 0; i < 60; i++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff18"; x.fillRect(rr() * w, rr() * h, 2, 3); }
  x.fillStyle = "#00000030"; x.fillRect(0, 0, w, 1); x.fillRect(0, h / 2, w, 1);
}) });

// o pedaço [de, ate] (frações) na lateral `lat`, sem passar por cima de outro trecho da pista (o grampo)
function trecho(tr, de, ate, lado, lat) {
  const { n } = tr, i0 = Math.floor(de * n), i1 = Math.floor((ate < de ? ate + 1 : ate) * n);
  return recortar(tr, i0, i1, [lado * lat], 3);
}

export function muros(tr, add, trechos, { alto = 13, cerca = 15 } = {}) {
  const L = lotes(), concreto = matConcreto(), topo = matTopo(), alambrado = matAlambrado();
  let comprimento = 0;
  for (const t of trechos) {
    const lat = t.lat ?? MURO_LAT, h = t.alto ?? alto, r = trecho(tr, t.de, t.ate, t.lado, lat); if (!r) continue;
    const l = t.lado * lat, v1 = ((r.i1 - r.i0) * 6) / 80;
    tira(tr, L.de(concreto), r.i0, r.i1, l, l, 0, h, 0, v1); // a face, de frente para a pista (o material é de dois lados)
    tira(tr, L.de(topo), r.i0, r.i1, l - 1.6, l + 1.6, h, h, 0, 1);
    if (t.cerca !== false && cerca) tira(tr, L.de(alambrado), r.i0, r.i1, l, l, h, h + cerca, 0, ((r.i1 - r.i0) * 6) / 56);
    comprimento += (r.i1 - r.i0) * 6;
  }
  L.montar(add, `${tr.id}-muros`);
  tr.murosMontreal = (tr.murosMontreal || 0) + comprimento;
}

export function blocos(tr, add, trechos) {
  const L = lotes(), mat = matBloco(), r0 = sorteio(404);
  for (const t of trechos) {
    const lat = t.lat ?? MURO_LAT - 11, r = trecho(tr, t.de, t.ate, t.lado, lat + 3); if (!r) continue;
    const l = t.lado * lat, v1 = ((r.i1 - r.i0) * 6) / 24, h = t.alto ?? 6;
    tira(tr, L.de(mat), r.i0, r.i1, l, l, 0, h, 0, v1); // a face de frente para a pista
    tira(tr, L.de(mat), r.i0, r.i1, l, l + t.lado * 8, h, h, 0, v1); // o topo
    tira(tr, L.de(mat), r.i0, r.i1, l + t.lado * 8, l + t.lado * 8, h, 0, 0, v1); // a face de trás
    void r0;
  }
  L.montar(add, `${tr.id}-blocos`);
}

/** O Muro dos Campeões: entre as frações f0 e f1, no lado de fora da última curva. Devolve { lado, i0, i1, x, z } do meio da inscrição. */
export function muroDosCampeoesMontreal(tr, add, f0, f1, fa = 0.95) {
  const { pts, n, W } = tr, i0 = Math.floor(f0 * n), i1 = Math.floor(f1 * n), lado = -sinalDaCurva(pts, n, Math.floor(fa * n)); // o lado de fora da curva da saída
  const lat = MURO_LAT - 2, r = recortar(tr, i0, i1, [lado * lat], 3); if (!r) return null;
  const L = lotes(), concreto = matConcreto(), topo = matTopo(), alambrado = matAlambrado(), l = lado * lat;
  tira(tr, L.de(concreto), r.i0, r.i1, l, l, 0, 22, 0, ((r.i1 - r.i0) * 6) / 80);
  tira(tr, L.de(topo), r.i0, r.i1, l - 1.8, l + 1.8, 22, 22, 0, 1);
  tira(tr, L.de(alambrado), r.i0, r.i1, l, l, 22, 38, 0, ((r.i1 - r.i0) * 6) / 56);
  L.montar(add, `${tr.id}-muro-dos-campeoes`);
  // a inscrição: um quadro reto no trecho de trás (a pista é reta ali), de frente para quem sai da chicane
  const meio = Math.floor((r.i0 + r.i1) / 2), p = pts[meio % n], larg = Math.min(250, (r.i1 - r.i0) * 6 - 20), tx = p.tx, ty = p.ty;
  const cx = p.x + p.nx * lado * (lat - 0.4) + tx * 8, cz = p.y + p.ny * lado * (lat - 0.4) + ty * 8;
  const quadro = new THREE.Mesh(new THREE.PlaneGeometry(larg, larg * 0.16), new THREE.MeshStandardMaterial({ map: muroDosCampeoes(), roughness: 0.9, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  quadro.position.set(cx, p.h + 11.6, cz);
  // a frente (+z do plano) aponta para a pista: do muro para o centro, ou seja, -lado·n
  quadro.rotation.y = Math.atan2(-lado * p.nx, -lado * p.ny); quadro.name = `${tr.id}-inscricao-muro`; add(quadro);
  // a pilha de pneus pintados de vermelho e branco, na frente do muro, e a fileira de blocos em frente
  const pneu = new THREE.TorusGeometry(3.2, 1.6, 6, 10); pneu.rotateX(Math.PI / 2);
  const brancos = new THREE.InstancedMesh(pneu, new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.85 }), 900), vermelhos = new THREE.InstancedMesh(pneu, new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.85 }), 900), d = new THREE.Object3D();
  let nb = 0, nv = 0;
  for (let i = r.i0; i <= r.i1 && nb < 890 && nv < 890; i += 1) {
    const q = pts[i % n];
    for (let k = 0; k < 3; k++) {
      const x = q.x + q.nx * lado * (lat - 6) + q.tx * ((k * 3) % 5 - 2), z = q.y + q.ny * lado * (lat - 6) + q.ty * ((k * 3) % 5 - 2);
      d.position.set(x, q.h + 1.8 + k * 3.2, z); d.rotation.set(0, 0, 0); d.updateMatrix();
      if ((i + k) % 2) { brancos.setMatrixAt(nb++, d.matrix); } else { vermelhos.setMatrixAt(nv++, d.matrix); }
    }
  }
  brancos.count = nb; vermelhos.count = nv; brancos.castShadow = vermelhos.castShadow = true; brancos.name = `${tr.id}-pneus-brancos`; vermelhos.name = `${tr.id}-pneus-vermelhos`; add(brancos); add(vermelhos);
  void W;
  return { lado, i0: r.i0, i1: r.i1, x: cx, z: cz, meio };
}
