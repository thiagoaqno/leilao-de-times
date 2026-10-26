// Kit de pista — o prédio dos boxes ao longo da reta dos boxes: as garagens (uma porta a cada 16 m, com a faixa da equipe),
// a faixa de vidro, a platibanda com o friso da cor do autódromo, o teto com os painéis dos patrocinadores virados para a
// pista e, no meio, a torre de controle. Põe o prédio em tr.reservado (os enfeites soltos não entram).
//
// cfg: { de, ate: frações da volta (podem passar de 1: o prédio atravessa a linha de chegada) · lado: 1 ou -1 ·
//        recuo: da borda da pista até a frente do prédio (62) · fundo (46) · alto (36) · torre: true ·
//        paineis: nomes de marcas.js em cima do teto · cores: { parede, friso, teto } }
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { faixa } from "./arquibancadas.js";
import { marcaTex } from "./marcas.js";

export function prediosDosBoxes(tr, add, { de = 0.984, ate = 1.078, lado = 1, recuo = 62, fundo = 46, alto = 36, torre = true, paineis = [], cores = {} } = {}) {
  const { pts, n, W } = tr, i0 = Math.floor(de * n), i1 = Math.floor(ate * n), l0 = lado * (W / 2 + recuo), l1 = l0 + lado * fundo;
  const c = { parede: "#e9e7e1", friso: "#c8102e", teto: 0xb9bcc0, ...cores };
  // a frente: portas das garagens, a faixa de vidro e a platibanda com o friso
  const frente = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: canvasTex(64, 128, (x, w, hh, rr) => {
    x.fillStyle = c.parede; x.fillRect(0, 0, w, hh);
    x.fillStyle = "#2b2f36"; x.fillRect(0, 10, 34, 108); x.fillStyle = "#454b55"; for (let yy = 14; yy < 116; yy += 7) x.fillRect(0, yy, 34, 2);
    x.fillStyle = ["#e10600", "#00a3e0", "#ffd100", "#ff7a00", "#00a86b", "#1e41ff", "#f4f4f4"][(rr() * 7) | 0]; x.fillRect(0, 10, 34, 5);
    x.fillStyle = "#6f94ad"; x.fillRect(38, 0, 16, hh); x.fillStyle = "#ffffff44"; for (let yy = 8; yy < hh; yy += 32) x.fillRect(38, yy, 16, 3);
    x.fillStyle = c.friso; x.fillRect(56, 0, 4, hh);
  }) });
  const parede = M(new THREE.Color(c.parede).getHex(), { roughness: 0.8, side: THREE.DoubleSide }), teto = M(c.teto, { roughness: 0.6, side: THREE.DoubleSide });
  faixa(tr, add, i0, i1, l0, l0, 0, alto, frente, 160);
  faixa(tr, add, i0, i1, l1, l1, 0, alto, parede, 60);
  faixa(tr, add, i0, i1, l0 - lado * 6, l1, alto, alto, teto, 60); // o teto, com a marquise saindo para a pista
  for (const i of [i0, i1]) { const p = pts[i % n], g = new THREE.Mesh(new THREE.PlaneGeometry(fundo, alto), parede); g.position.set(p.x + p.nx * (l0 + l1) / 2, p.h + alto / 2, p.y + p.ny * (l0 + l1) / 2); g.rotation.y = Math.atan2(-p.ny, p.nx); add(g); }
  // os painéis em cima do teto, virados para a pista, e a torre de controle no meio
  const meio = Math.floor((i0 + i1) / 2), pm = pts[meio % n], g = new THREE.Group();
  g.position.set(pm.x, pm.h, pm.y); g.rotation.y = Math.atan2(pm.nx, pm.ny); add(g); // z do grupo = lado da pista
  const zFrente = l0, comprimento = (i1 - i0) * 6;
  if (torre) {
    const vidro = M(0x1f3446, { roughness: 0.15, metalness: 0.5 }), branco = M(0xf1efe8, { roughness: 0.6 });
    const t = new THREE.Mesh(new THREE.BoxGeometry(44, 70, 34), branco); t.position.set(0, 35, zFrente + lado * 30); t.castShadow = true; g.add(t);
    const sala = new THREE.Mesh(new THREE.BoxGeometry(45, 12, 35), vidro); sala.position.set(0, 62, zFrente + lado * 30); g.add(sala);
    const topo = new THREE.Mesh(new THREE.BoxGeometry(50, 3, 40), M(0x5a5f66)); topo.position.set(0, 71.5, zFrente + lado * 30); g.add(topo);
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 40, 6), M(0xd9d9d9)); mastro.position.set(14, 92, zFrente + lado * 30); g.add(mastro);
  }
  const passo = Math.min(110, comprimento / Math.max(1, paineis.length + 1));
  paineis.forEach((marca, k) => {
    const x = (k - (paineis.length - 1) / 2) * passo * 1.15;
    const painel = new THREE.Mesh(new THREE.PlaneGeometry(passo * 0.72, 19), new THREE.MeshBasicMaterial({ map: marcaTex(marca, 512, 128), side: THREE.DoubleSide }));
    painel.position.set(x, alto + 11, zFrente - lado * 3); painel.rotation.y = lado > 0 ? Math.PI : 0; g.add(painel);
    for (const s of [-1, 1]) { const pe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), M(0x444a52)); pe.position.set(x + s * passo * 0.3, alto + 2, zFrente - lado * 3); g.add(pe); }
  });
  tr.reservado ||= [];
  for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; tr.reservado.push([p.x + p.nx * (l0 + lado * fundo / 2), p.y + p.ny * (l0 + lado * fundo / 2), fundo + 24]); }
}
