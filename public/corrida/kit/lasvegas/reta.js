// Las Vegas — a reta dos boxes e a avenida: o prédio dos boxes permanente do GP (o Grand Prix Plaza: três andares de garagens e terraços de vidro, branco e grafite, com a
// fachada de LED acesa de noite), os pórticos de patrocínio por cima da pista (Heineken Silver Las Vegas Grand Prix, Aramco, Pirelli...), os mastros de luz da reta e as
// bandeiras. Peça só desta pista.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias, livre, ocupado } from "../comum.js";
import { prediosDosBoxes } from "../boxes.js";
import { holofotes } from "../holofotes.js";
import { materialDaNoite } from "../bahrein/base.js";

const faixa = (texto, fundo, cor, w = 1024, h = 160, destaque = null) => canvasTex(w, h, (x, ww, hh) => {
  x.fillStyle = fundo; x.fillRect(0, 0, ww, hh); x.fillStyle = "#ffffff14"; x.fillRect(0, 0, ww, 6);
  x.fillStyle = cor; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `800 ${Math.floor(hh * 0.5)}px "Figtree", "Segoe UI", Arial, sans-serif`; x.fillText(texto, ww / 2, hh / 2 + 4, ww - 60);
  if (destaque) { x.fillStyle = destaque; x.fillRect(0, hh - 14, ww, 14); }
}, false);

// o pórtico: dois pilares de aço do lado de fora das duas barreiras e a viga com a faixa (a de verdade passa a uns 9 m do chão)
export function porticos(tr, add, lista) {
  const { pts, n, W } = tr, pilares = [], vigas = []; let k = 0;
  for (const [f, texto, fundo, cor, destaque] of lista) {
    const i = Math.floor(f * n) % n, p = pts[i], d = (s) => W / 2 + Math.max(tr.murosEscape?.[s]?.[i] || 0, 9) + 7;
    const xa = p.x - p.nx * d(-1), za = p.y - p.ny * d(-1), xb = p.x + p.nx * d(1), zb = p.y + p.ny * d(1);
    if (!livre(tr, xa, za, 0) || !livre(tr, xb, zb, 0)) continue;
    const ang = Math.atan2(zb - za, xb - xa), larg = Math.hypot(xb - xa, zb - za), meio = [(xa + xb) / 2, (za + zb) / 2];
    pilares.push({ x: xa, y: p.h + 20, z: za, sx: 2.6, sy: 40, sz: 2.6 }, { x: xb, y: p.h + 20, z: zb, sx: 2.6, sy: 40, sz: 2.6 });
    // a faixa é uma face só virada para quem vem (contra o sentido da volta); o verso é outro plano com o mesmo texto lido certo (nada espelhado)
    const tex = faixa(texto, fundo, cor, 1024, 160, destaque), mat = materialDaNoite(tr, 0xb8b8c0, 0xffffff, { map: tex }); mat.userData.bloom = 0.6;
    for (const frente of [1, -1]) {
      const faixaMesh = new THREE.Mesh(new THREE.PlaneGeometry(larg, 12), mat);
      faixaMesh.position.set(meio[0] + Math.sin(ang) * 0.4 * frente, p.h + 37, meio[1] - Math.cos(ang) * 0.4 * frente); faixaMesh.rotation.y = -ang + (frente > 0 ? Math.PI : 0); faixaMesh.userData.semContato = true; add(faixaMesh);
    }
    vigas.push({ x: meio[0], y: p.h + 43.2, z: meio[1], sx: larg + 2.6, sy: 2.4, sz: 3.4, r: -ang }, { x: meio[0], y: p.h + 30.6, z: meio[1], sx: larg, sy: 1.2, sz: 2.6, r: -ang }); k++;
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  instancias(add, caixa, M(0x6f767e, { roughness: 0.5, metalness: 0.6 }), pilares, { nome: "lasvegas-portico" });
  instancias(add, caixa, M(0x6f767e, { roughness: 0.5, metalness: 0.6 }), vigas);
  tr.porticosLV = k;
}

// o prédio dos boxes do GP de Las Vegas (o Grand Prix Plaza) e a faixa de LED com o nome do GP, e os mastros de luz da reta
export function retaDosBoxes(tr, add, { lado, marcas }) {
  const de = 0.9838, ate = 1.0125;
  prediosDosBoxes(tr, add, { de, ate, lado, recuo: 64, fundo: 52, alto: 42, torre: true, paineis: marcas, cores: { parede: "#dfe1e4", friso: "#e10a50", teto: 0xc9ccd0 } });
  // a fachada de LED no alto do prédio: o nome do GP e o logotipo da F1, aceso de noite (cada face lida certa; a faixa corre na frente do prédio)
  const { pts, n, W } = tr, i0 = Math.floor(de * n), i1 = Math.floor(ate * n), im = Math.floor((i0 + i1) / 2), pm = pts[im % n];
  const tex = canvasTex(1024, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#14000a"); g.addColorStop(0.5, "#2a0414"); g.addColorStop(1, "#14000a"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "#e10a50"; x.fillRect(0, 0, w, 8); x.fillRect(0, h - 8, w, 8); x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "italic 900 78px Arial Black, Arial"; x.shadowColor = "#ff2d6a"; x.shadowBlur = 20; x.fillText("F1 LAS VEGAS GRAND PRIX", w / 2, h / 2 + 3, w - 40); }, false);
  const mat = materialDaNoite(tr, 0x40404a, 0xffffff, { map: tex }); mat.userData.bloom = 1.4;
  const L = lado * (W / 2 + 64) - lado * 2, y = pm.h + 42 + 9, comp = Math.min(260, (i1 - i0) * 6 * 0.8);
  const g = new THREE.Group(); g.position.set(pm.x, pm.h, pm.y); g.rotation.y = Math.atan2(pm.nx, pm.ny); add(g);
  for (const frente of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(comp, comp / 8), mat); m.position.set(0, y - pm.h, L + frente * 0.5); m.rotation.y = frente > 0 ? (lado > 0 ? Math.PI : 0) : (lado > 0 ? 0 : Math.PI); m.userData.semContato = true; g.add(m); }
  holofotes(tr, add, { passo: 70, recuo: 56, alto: 62, de: 0.9, ate: 1.0, cor: 0x7c838b });
  holofotes(tr, add, { passo: 70, recuo: 56, alto: 62, de: 0.0, ate: 0.05, cor: 0x7c838b });
}

void ocupado;
