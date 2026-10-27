// Suzuka (Japão): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (jp-1962, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import * as THREE from "three";
import { M } from "../cena.js";
import { gpSimples } from "../kit/gp-simples.js";

// a ponte do oito: o trecho de cima (a reta de trás, antes da 130R) passa por cima do trecho depois da Degner. O tabuleiro
// com as muretas acompanha a pista de cima; os pilares ficam dos dois lados da pista de baixo (pista.js baixa o chão ali)
function ponte(tr, { add }) {
  const { pts, n, W, t } = tr, [baixo, cima] = t.cruza[0], ib = Math.floor(baixo * n), ic = Math.floor(cima * n);
  const concreto = M(0xb9b5ab, { roughness: 0.9 }), mureta = M(0xe9e7e1, { roughness: 0.7 });
  for (let k = -46; k <= 46; k++) {
    const p = pts[(ic + k + n) % n], q = pts[(ic + k + 1 + n) % n], comp = Math.hypot(q.x - p.x, q.y - p.y) + 0.5, a = Math.atan2(q.y - p.y, q.x - p.x);
    const laje = new THREE.Mesh(new THREE.BoxGeometry(comp, 6, W + 30), concreto); laje.position.set((p.x + q.x) / 2, p.h - 3.4, (p.y + q.y) / 2); laje.rotation.y = -a; add(laje);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(comp, 9, 3), mureta); m.position.set((p.x + q.x) / 2 + p.nx * s * (W / 2 + 13), p.h + 3.5, (p.y + q.y) / 2 + p.ny * s * (W / 2 + 13)); m.rotation.y = -a; add(m); }
  }
  const pb = pts[ib], pc = pts[ic];
  for (const s of [-1, 1]) for (const d of [-1, 1]) {
    const x = pb.x + pb.nx * s * (W / 2 + 22) + pb.tx * d * 40, y = pb.y + pb.ny * s * (W / 2 + 22) + pb.ty * d * 40, alto = pc.h - pb.h;
    const pilar = new THREE.Mesh(new THREE.BoxGeometry(10, alto, 10), concreto); pilar.position.set(x, pb.h + alto / 2 - 6, y); pilar.castShadow = true; add(pilar);
  }
}

export const GP_SUZUKA = gpSimples("suzuka", {
  bandeira: [0xffffff, 0xbc002d], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  montanha: { angulo: Math.PI, afastamento: 1500, altura: 620, rocha: "#6f7a66", mato: "#3f5a36", longe: "#9fb0bf" }, // os montes Suzuka, a oeste
  beira: { arvores: 0.2, longe: { arvores: 0.25 } },
  cenario: ponte, // a ponte do oito
});
