// Silverstone (Silverstone Circuit, o antigo aeródromo da RAF): o que o GP usa do kit (kit/README.md explica cada peça) e
// o que só ele tem: The Wing, o prédio dos boxes. As frações (0 a 1) são da volta, a partir da linha de chegada, na reta
// entre Club e Abbey: Abbey 0,04-0,07 · Farm 0,07-0,10 · Village 0,12-0,13 · The Loop 0,145-0,165 · Aintree 0,17-0,19 ·
// Wellington Straight 0,2-0,29 · Brooklands 0,30-0,32 · Luffield 0,33-0,36 · Woodcote 0,365-0,43 · Copse 0,49-0,52 ·
// Maggotts, Becketts e Chapel 0,58-0,67 · Hangar Straight 0,7-0,8 · Stowe 0,82-0,85 · Vale 0,915-0,93 · Club 0,94-0,97.
// Campo aberto e plano: sem muro colado, sem serra no horizonte, com a brita de Stowe e de Copse.
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { faixa } from "../kit/arquibancadas.js";
import { marcaTex } from "../kit/marcas.js";

// The Wing, do lado direito da reta (o lado oposto das arquibancadas): garagens embaixo, a faixa de vidro, o teto
// inclinado que sobe para trás como uma asa, os painéis dos patrocinadores na frente e, no meio, a torre de controle
function theWing(tr, { add }) {
  const { pts, n, W } = tr, lado = 1, f0 = 0.975, f1 = 1.04, i0 = Math.floor(f0 * n), i1 = Math.floor(f1 * n), fundo = 54;
  const l0 = lado * (W / 2 + 62), l1 = l0 + lado * fundo, garagem = 15, vidro = 31, teto0 = 35, teto1 = 52;
  const frente = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: canvasTex(64, 128, (x, w, hh, rr) => {
    x.fillStyle = "#e6e6e2"; x.fillRect(0, 0, w, hh);
    x.fillStyle = "#2b2f36"; x.fillRect(0, 70, 34, 56); x.fillStyle = "#454b55"; for (let yy = 74; yy < 124; yy += 7) x.fillRect(0, yy, 34, 2);
    x.fillStyle = ["#e10600", "#00a3e0", "#ffd100", "#ff7a00", "#00a86b", "#1d3f8f"][(rr() * 6) | 0]; x.fillRect(0, 70, 34, 5);
    x.fillStyle = "#35546c"; x.fillRect(0, 0, w, 62); x.fillStyle = "#ffffff55"; for (let xx = 0; xx < w; xx += 16) x.fillRect(xx, 0, 2, 62); x.fillRect(0, 30, w, 2);
  }) });
  const parede = M(0xd6d8da, { roughness: 0.8, side: THREE.DoubleSide }), prata = M(0xc9ced3, { roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide });
  // a frente em duas fitas (garagens e vidro: a textura tem as duas), o teto em asa e as laterais
  faixa(tr, add, i0, i1, l0, l0, 0, vidro, frente, 128);
  faixa(tr, add, i0, i1, l0, l0, vidro, teto0, parede, 60); // a platibanda, onde ficam os painéis
  faixa(tr, add, i0, i1, l0 - lado * 7, l1, teto0, teto1, prata, 60); // o teto sobe para trás, com a marquise saindo para a pista
  faixa(tr, add, i0, i1, l1, l1, 0, teto1, parede, 60);
  for (const i of [i0, i1]) { const p = pts[i % n], g = new THREE.Mesh(new THREE.PlaneGeometry(fundo, teto1), parede); g.position.set(p.x + p.nx * (l0 + l1) / 2, p.h + teto1 / 2, p.y + p.ny * (l0 + l1) / 2); g.rotation.y = Math.atan2(-p.ny, p.nx); add(g); }
  // os painéis na platibanda, virados para a pista
  const meio = Math.floor((i0 + i1) / 2), pm = pts[meio % n], g = new THREE.Group();
  g.position.set(pm.x, pm.h, pm.y); g.rotation.y = Math.atan2(pm.nx, pm.ny); add(g); // z do grupo = lado da pista
  const zFrente = l0, vidroM = M(0x1f3446, { roughness: 0.15, metalness: 0.5 }), branco = M(0xf1efe8, { roughness: 0.6 });
  [["silverstone", -190], ["pirelli", -95], ["britgp", 0], ["rolex", 95], ["skysports", 190]].forEach(([marca, x]) => {
    const painel = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), new THREE.MeshBasicMaterial({ map: marcaTex(marca, 512, 96), side: THREE.DoubleSide }));
    painel.position.set(x, vidro + 3.5, zFrente - lado * 0.6); painel.rotation.y = lado > 0 ? Math.PI : 0; g.add(painel);
  });
  // a torre de controle: três andares de vidro por cima do teto, no meio
  const torre = new THREE.Mesh(new THREE.BoxGeometry(46, 22, 26), branco); torre.position.set(0, teto1 + 8, zFrente + lado * 34); torre.castShadow = true; g.add(torre);
  const sala = new THREE.Mesh(new THREE.BoxGeometry(47, 8, 27), vidroM); sala.position.set(0, teto1 + 12, zFrente + lado * 34); g.add(sala);
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 34, 6), M(0xd9d9d9)); mastro.position.set(16, teto1 + 36, zFrente + lado * 34); g.add(mastro);
  for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; tr.reservado.push([p.x + p.nx * (l0 + lado * 30), p.y + p.ny * (l0 + lado * 30), 70]); }
}

const AZUL = "#1d3f8f", VERMELHO = "#c8102e";

export const GP_SILVERSTONE = {
  asfalto: true,
  chao: {
    margem: { cor: "#6f7075" }, // o asfalto cinza da área de escape, logo depois da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 330, fora: 210 },
    sc: [[0.955, "SC 1"], [0.13, "SC 2"]],
    grid: true, remendos: 30,
  },
  // o escape: brita em Copse e em Stowe (as famosas), asfalto pintado nas saídas de Abbey, Becketts e Club e muros de
  // pneus por fora das curvas rápidas
  escape: {
    largura: 30,
    brita: [[0.48, 0.535, "fora"], [0.815, 0.865, "fora"]],
    listrado: [[0.04, 0.075, "fora"], [0.6, 0.68, "fora"], [0.935, 0.975, "fora"]],
    cores: [VERMELHO, AZUL],
    pneus: [[0.48, 0.535, "fora"], [0.815, 0.865, "fora"], [0.04, 0.075, "fora"], [0.6, 0.68, "fora"]],
  },
  arquibancadas: { trechos: [
    { de: 0.935, ate: 0.998, lado: -1, degraus: 6, cor: AZUL, encosto: "#f4f4f4" }, // Club
    { de: 0.004, ate: 0.075, lado: -1, degraus: 8, cor: AZUL, encosto: VERMELHO }, // a tribuna da reta dos boxes e Abbey, azul e vermelha
    { de: 0.14, ate: 0.17, lado: 1, degraus: 5, cor: "#f4f4f4", encosto: AZUL }, // por fora de The Loop
    { de: 0.30, ate: 0.36, lado: -1, degraus: 6, cor: VERMELHO, encosto: "#f4f4f4" }, // Luffield
    { de: 0.48, ate: 0.535, lado: -1, degraus: 6, cor: AZUL, encosto: "#f4f4f4" }, // Copse
    { de: 0.815, ate: 0.865, lado: -1, degraus: 6, cor: VERMELHO, encosto: AZUL }, // Stowe
  ] },
  cenario: (tr, ctx) => theWing(tr, ctx),
  ambiente: {
    bandeira: [0x012169, 0xc8102e], // a Union Jack: azul e vermelho
    marcas: ["pirelli", "rolex", "britgp", "heineken", "dhl", "aramco", "skysports", "silverstone", "tag", "lenovo"],
    outdoors: ["britgp", "pirelli", "rolex", "skysports", "heineken", "aramco", "dhl", "silverstone"],
    posto: "britgp",
  },
  passarelas: { candidatos: [0.99, 0.45, 0.2, 0.74], marcas: ["britgp", "pirelli", "silverstone"], max: 2 }, // a da reta dos boxes
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 1, cidade: 0.04 }, // vento e passarinhos do aeródromo; a torcida vem das arquibancadas
  },
};
