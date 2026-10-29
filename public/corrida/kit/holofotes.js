// Kit de pista — as torres de holofotes dos autódromos de corrida noturna (Bahrein, Catar, Jeddah, Singapura...): mastros
// de treliça, cada um com um painel de lâmpadas inclinado para a pista. Tudo em InstancedMesh (o mastro, a caixa e o
// painel de lâmpadas: 3 chamadas de desenho para a pista inteira). Só cenário: as torres ficam depois do muro de pneus.
//
// holofotes(tr, add, cfg): cfg (tudo opcional)
//   passo: 64     — de quantos em quantos pontos da linha central cabe uma torre (alterna o lado da pista)
//   recuo: 52     — da borda da pista até o mastro
//   alto: 70      — altura do mastro
//   de, ate: 0, 1 — o trecho da volta (frações) onde pode haver torres
//   cor: 0x8a9096 — o aço do mastro
// Devolve quantas torres entraram. Cada uma entra em tr.reservado, e só nasce onde `livre` e `ocupado` deixam.
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { livre, ocupado } from "./comum.js";

export function holofotes(tr, add, { passo = 64, recuo = 52, alto = 70, de = 0, ate = 1, cor = 0x8a9096 } = {}) {
  const { pts, n, W } = tr, lat = W / 2 + recuo, lista = [];
  for (let i = Math.floor(de * n) + 8, lado = 1; i < Math.floor(ate * n); i += passo, lado = -lado) {
    for (const s of [lado, -lado]) { // tenta o lado da vez e, se não couber, o outro
      const p = pts[i % n], x = p.x + p.nx * s * lat, z = p.y + p.ny * s * lat;
      if (!livre(tr, x, z, recuo - 8) || ocupado(tr, x, z, i % n)) continue;
      lista.push({ x, z, y: tr.chao ? tr.chao(x, z) - 1.5 : p.h, s, nx: p.nx, ny: p.ny });
      tr.reservado ||= []; tr.reservado.push([x, z, 14]);
      break;
    }
  }
  if (!lista.length) return 0;
  // o mastro: 4 faces de treliça (um X em cada), vazado, afinando para cima
  const trelica = canvasTex(64, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = "#ffffff"; c.lineWidth = 5;
    for (let k = 0; k < 2; k++) { const y0 = k * 64; c.strokeRect(2, y0 + 2, w - 4, 62); c.beginPath(); c.moveTo(2, y0 + 2); c.lineTo(w - 2, y0 + 64); c.moveTo(w - 2, y0 + 2); c.lineTo(2, y0 + 64); c.stroke(); }
  });
  trelica.repeat.set(4, 6);
  const aco = M(0xc9cdd1, { roughness: 0.5, metalness: 0.4 }); void trelica; void cor;
  const mastroGeo = new THREE.CylinderGeometry(1.5, 2.6, alto, 8); mastroGeo.translate(0, alto / 2, 0);
  const caixaGeo = new THREE.BoxGeometry(30, 16, 1.6), painelGeo = new THREE.PlaneGeometry(27, 13);
  const lampadas = canvasTex(192, 96, (c, w, h) => {
    c.fillStyle = "#1a1c20"; c.fillRect(0, 0, w, h);
    for (let a = 0; a < 4; a++) for (let b = 0; b < 8; b++) { const g = c.createRadialGradient(12 + b * 24, 12 + a * 24, 1, 12 + b * 24, 12 + a * 24, 11); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#fff3cf"); g.addColorStop(1, "#c9b27a"); c.fillStyle = g; c.beginPath(); c.arc(12 + b * 24, 12 + a * 24, 10, 0, 7); c.fill(); }
  }, false);
  const mastros = new THREE.InstancedMesh(mastroGeo, aco, lista.length);
  const caixas = new THREE.InstancedMesh(caixaGeo, M(0x2a2d33, { roughness: 0.5, metalness: 0.4 }), lista.length);
  const paineis = new THREE.InstancedMesh(painelGeo, new THREE.MeshBasicMaterial({ map: lampadas, fog: true, userData: { bloom: 2.2 } }) /* userData.bloom: as lâmpadas brilham no pós (pos.js) */, lista.length);
  const o = new THREE.Object3D(), frente = new THREE.Matrix4().makeTranslation(0, 0, 1);
  o.rotation.order = "YXZ";
  lista.forEach(({ x, y, z, s, nx, ny }, k) => {
    o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mastros.setMatrixAt(k, o.matrix);
    o.position.set(x, y + alto + 4, z); o.rotation.set(0.28, Math.atan2(-nx * s, -ny * s), 0); o.updateMatrix(); // a frente (+z) olha para a pista e para baixo
    caixas.setMatrixAt(k, o.matrix); paineis.setMatrixAt(k, o.matrix.clone().multiply(frente));
  });
  mastros.castShadow = caixas.castShadow = true; mastros.name = `${tr.id}-holofotes`; add(mastros); add(caixas); add(paineis);
  tr.holofotes = lista.length;
  return lista.length;
}
