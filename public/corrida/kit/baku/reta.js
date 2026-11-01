// Baku — a reta dos boxes e a avenida: os pórticos de patrocínio por cima da pista (a faixa grande de Qatar Airways das fotos), o prédio dos boxes
// (comprido, cinza e baixo, com o terraço de hospitalidade e a mureta vermelha) e os mastros de luz da reta. Peça só desta pista.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias, livre, ocupado } from "../comum.js";
import { prediosDosBoxes } from "../boxes.js";
import { holofotes } from "../holofotes.js";

const faixa = (texto, fundo, cor, w = 1024, h = 160) => canvasTex(w, h, (x, ww, hh) => {
  x.fillStyle = fundo; x.fillRect(0, 0, ww, hh); x.fillStyle = "#ffffff14"; x.fillRect(0, 0, ww, 6);
  x.fillStyle = cor; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `600 ${Math.floor(hh * 0.5)}px "Figtree", "Segoe UI", Arial, sans-serif`; x.fillText(texto, ww / 2, hh / 2 + 4);
});

// o pórtico: dois pilares de aço do lado de fora das duas barreiras e a viga com a faixa (a de verdade tem 5 m de altura de faixa e passa a uns 9 m do chão)
export function porticos(tr, add, lista) {
  const { pts, n, W } = tr, pilares = [], vigas = [];
  for (const [f, texto, fundo, cor] of lista) {
    const i = Math.floor(f * n) % n, p = pts[i], d = (s) => W / 2 + Math.max(tr.murosEscape?.[s]?.[i] || 0, 9) + 7;
    const xa = p.x - p.nx * d(-1), za = p.y - p.ny * d(-1), xb = p.x + p.nx * d(1), zb = p.y + p.ny * d(1);
    if (!livre(tr, xa, za, 0) || !livre(tr, xb, zb, 0)) continue;
    const ang = Math.atan2(zb - za, xb - xa), larg = Math.hypot(xb - xa, zb - za), meio = [(xa + xb) / 2, (za + zb) / 2], h0 = tr.chao(xa, za) - 1.5;
    pilares.push({ x: xa, y: p.h + 20, z: za, sx: 2.6, sy: 40, sz: 2.6 }, { x: xb, y: p.h + 20, z: zb, sx: 2.6, sy: 40, sz: 2.6 });
    const faixaMesh = new THREE.Mesh(new THREE.PlaneGeometry(larg, 12), new THREE.MeshBasicMaterial({ map: faixa(texto, fundo, cor), side: THREE.DoubleSide }));
    faixaMesh.position.set(meio[0], p.h + 37, meio[1]); faixaMesh.rotation.y = -ang; add(faixaMesh);
    vigas.push({ x: meio[0], y: p.h + 43.2, z: meio[1], sx: larg + 2.6, sy: 2.4, sz: 3.4, r: -ang }, { x: meio[0], y: p.h + 30.6, z: meio[1], sx: larg, sy: 1.2, sz: 2.6, r: -ang });
    void h0;
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  instancias(add, caixa, M(0x6f767e, { roughness: 0.5, metalness: 0.6 }), pilares, { nome: "baku-portico" });
  instancias(add, caixa, M(0x6f767e, { roughness: 0.5, metalness: 0.6 }), vigas);
  tr.porticosBaku = pilares.length / 2;
}

// o prédio dos boxes (a reta de Neftchilar): o do kit, na cor do prédio provisório de verdade (painéis cinza e vidro escuro, friso vermelho), e os mastros de luz
export function retaDosBoxes(tr, add, { lado, marcas }) {
  prediosDosBoxes(tr, add, { de: 0.984, ate: 1.062, lado, recuo: 62, torre: false, paineis: marcas, cores: { parede: "#c9ccd1", friso: "#c4161c", teto: 0x7f858c } });
  holofotes(tr, add, { passo: 70, recuo: 54, alto: 64, de: 0.8, ate: 1.0, cor: 0x7c838b });
  holofotes(tr, add, { passo: 70, recuo: 54, alto: 64, de: 0.0, ate: 0.06, cor: 0x7c838b });
}

void ocupado;
