// Barcelona (Circuit de Barcelona-Catalunya, Montmeló): o que o GP usa do kit (kit/README.md explica cada peça) e o que só
// ele tem: o prédio dos boxes com a torre de controle. As frações (0 a 1) são da volta, a partir da linha de chegada,
// no meio da reta dos boxes. Autódromo: sem muro colado, com brita do lado de fora das curvas e a serra de Montserrat ao
// noroeste.
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { faixa } from "../kit/arquibancadas.js";
import { marcaTex } from "../kit/marcas.js";

// o prédio dos boxes, do lado direito da reta (o lado oposto das arquibancadas): garagens, sacada de vidro, o teto com
// os painéis dos patrocinadores e, no meio, a torre de controle
function predioDosBoxes(tr, { add }) {
  const { pts, n, W } = tr, lado = 1, f0 = 0.984, f1 = 1.078, i0 = Math.floor(f0 * n), i1 = Math.floor(f1 * n), alto = 36, fundo = 46;
  const l0 = lado * (W / 2 + 62), l1 = l0 + lado * fundo;
  // a frente: portas das garagens (uma a cada 16 m), a faixa de vidro e a platibanda com o friso vermelho
  const frente = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: canvasTex(64, 128, (x, w, hh, rr) => {
    x.fillStyle = "#e9e7e1"; x.fillRect(0, 0, w, hh);
    x.fillStyle = "#2b2f36"; x.fillRect(0, 10, 34, 108); x.fillStyle = "#454b55"; for (let yy = 14; yy < 116; yy += 7) x.fillRect(0, yy, 34, 2);
    x.fillStyle = ["#e10600", "#00a3e0", "#ffd100", "#ff7a00", "#00a86b"][(rr() * 5) | 0]; x.fillRect(0, 10, 34, 5);
    x.fillStyle = "#6f94ad"; x.fillRect(38, 0, 16, hh); x.fillStyle = "#ffffff44"; for (let yy = 8; yy < hh; yy += 32) x.fillRect(38, yy, 16, 3);
    x.fillStyle = "#c8102e"; x.fillRect(56, 0, 4, hh);
  }) });
  const parede = M(0xdedbd2, { roughness: 0.8, side: THREE.DoubleSide }), teto = M(0xb9bcc0, { roughness: 0.6, side: THREE.DoubleSide });
  faixa(tr, add, i0, i1, l0, l0, 0, alto, frente, 160);
  faixa(tr, add, i0, i1, l1, l1, 0, alto, parede, 60);
  faixa(tr, add, i0, i1, l0 - lado * 6, l1, alto, alto, teto, 60); // o teto, com a marquise saindo para a pista
  for (const i of [i0, i1]) { const p = pts[i % n], g = new THREE.Mesh(new THREE.PlaneGeometry(fundo, alto), parede); g.position.set(p.x + p.nx * (l0 + l1) / 2, p.h + alto / 2, p.y + p.ny * (l0 + l1) / 2); g.rotation.y = Math.atan2(-p.ny, p.nx); add(g); }
  // os painéis em cima do teto, virados para a pista, e a torre de controle no meio
  const meio = Math.floor((i0 + i1) / 2), pm = pts[meio % n], g = new THREE.Group();
  g.position.set(pm.x, pm.h, pm.y); g.rotation.y = Math.atan2(pm.nx, pm.ny); add(g); // z do grupo = lado da pista
  const zFrente = lado * (W / 2 + 62), vidro = M(0x1f3446, { roughness: 0.15, metalness: 0.5 }), branco = M(0xf1efe8, { roughness: 0.6 });
  const torre = new THREE.Mesh(new THREE.BoxGeometry(44, 70, 34), branco); torre.position.set(0, 35, zFrente + lado * 30); torre.castShadow = true; g.add(torre);
  const sala = new THREE.Mesh(new THREE.BoxGeometry(45, 12, 35), vidro); sala.position.set(0, 62, zFrente + lado * 30); g.add(sala);
  const topo = new THREE.Mesh(new THREE.BoxGeometry(50, 3, 40), M(0x5a5f66)); topo.position.set(0, 71.5, zFrente + lado * 30); g.add(topo);
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 40, 6), M(0xd9d9d9)); mastro.position.set(14, 92, zFrente + lado * 30); g.add(mastro);
  [["circuit", -170], ["pirelli", -60], ["lacaixa", 60], ["f1", 170]].forEach(([marca, x]) => {
    const painel = new THREE.Mesh(new THREE.PlaneGeometry(76, 19), new THREE.MeshBasicMaterial({ map: marcaTex(marca, 512, 128), side: THREE.DoubleSide }));
    painel.position.set(x, alto + 11, zFrente - lado * 3); painel.rotation.y = lado > 0 ? Math.PI : 0; g.add(painel);
    for (const s of [-1, 1]) { const pe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), M(0x444a52)); pe.position.set(x + s * 30, alto + 2, zFrente - lado * 3); g.add(pe); }
  });
  for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; tr.reservado.push([p.x + p.nx * (l0 + lado * 30), p.y + p.ny * (l0 + lado * 30), 70]); }
}

// o cenário próprio: o prédio dos boxes (as arquibancadas vêm do kit, em `arquibancadas`)
const cenario = (tr, ctx) => predioDosBoxes(tr, ctx);

export const GP_BARCELONA = {
  asfalto: true, // o asfalto de GP de asfalto-gp.js, com as linhas de borda e a borracha
  chao: {
    margem: { cor: "#6d6e72" }, // a faixa de asfalto da área de escape, logo depois da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 },
    sc: [[0.93, "SC 1"], [0.12, "SC 2"]],
    grid: true, remendos: 26,
    brita: { cor: "#e3d9bb", largura: 24 }, // a brita do lado de fora das curvas
  },
  arquibancadas: { trechos: [
    { de: 0.004, ate: 0.108, lado: -1, degraus: 7, cor: "#c8102e", encosto: "#f1b82d" }, // a tribuna da reta dos boxes, vermelha e amarela
    { de: 0.142, ate: 0.185, lado: -1, degraus: 6, cor: "#1f5fbf", encosto: "#5aa0f0" }, // por fora da curva 1
  ] },
  cenario,
  ambiente: { bandeira: [0xc60b1e, 0xffc400], marcas: ["repsol", "pirelli", "lacaixa", "rolex", "sabadell", "heineken", "dhl", "aramco", "circuit"], posto: "f1" },
  passarelas: { candidatos: [0.962, 0.5, 0.62, 0.32], marcas: ["repsol", "lacaixa", "pirelli"], max: 3 }, // a da reta dos boxes, pouco antes dos boxes
  montanha: { angulo: (-3 * Math.PI) / 4, afastamento: 1500, altura: 760, rocha: "#9a8c78", mato: "#6e6e4a", longe: "#a8b1ba" }, // Montserrat, a noroeste
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 1, cidade: 0.12 }, // vento e passarinhos de autódromo; a cidade fica longe
  },
};
