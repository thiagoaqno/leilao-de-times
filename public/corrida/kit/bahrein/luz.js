// Bahrein — a corrida noturna: as torres de refletores altíssimas (mastro cônico, uma cabeça com dois painéis de lâmpadas virada
// para a pista) e, só de noite, o brilho dos painéis e as poças de luz no asfalto debaixo de cada uma. Mastros, cabeças, painéis,
// brilhos e poças são 5 InstancedMesh para a pista inteira. Cada torre só nasce onde `livre` e `ocupado` deixam.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { livre, ocupado } from "../comum.js";
import { soDeNoite } from "./base.js";

export function torresDeLuz(tr, add, { gap = 58, recuo = 62, alto = 130, de = 0, ate = 1 } = {}) {
  const { pts, n, W } = tr, lat = W / 2 + recuo, lista = [], ultimo = { 1: -1e9, "-1": -1e9 };
  for (let i = Math.floor(de * n) + 6; i < Math.floor(ate * n); i += 6) for (const s of [1, -1]) {
    if (i - ultimo[s] < gap) continue;
    const p = pts[i % n], x = p.x + p.nx * s * lat, z = p.y + p.ny * s * lat;
    if (!livre(tr, x, z, recuo - 10) || ocupado(tr, x, z, i % n)) continue;
    ultimo[s] = i; lista.push({ x, z, y: tr.chao(x, z) - 1.5, s, nx: p.nx, ny: p.ny, ph: p.h });
    tr.reservado ||= []; tr.reservado.push([x, z, 16]);
  }
  if (!lista.length) return 0;
  const lampadas = canvasTex(192, 96, (c, w, h) => {
    c.fillStyle = "#1a1c20"; c.fillRect(0, 0, w, h);
    for (let a = 0; a < 4; a++) for (let b = 0; b < 8; b++) { const g = c.createRadialGradient(12 + b * 24, 12 + a * 24, 1, 12 + b * 24, 12 + a * 24, 11); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#fff3cf"); g.addColorStop(1, "#c9b27a"); c.fillStyle = g; c.beginPath(); c.arc(12 + b * 24, 12 + a * 24, 10, 0, 7); c.fill(); }
  }, false);
  const brilho = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255,244,214,0.95)"); g.addColorStop(0.35, "rgba(255,232,170,0.4)"); g.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
  const poca = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 1, 32, 32, 32); g.addColorStop(0, "rgba(255,236,190,0.5)"); g.addColorStop(0.5, "rgba(255,226,160,0.2)"); g.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
  const aditivo = (map, o = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...o });
  const mastroGeo = new THREE.CylinderGeometry(1.3, 2.7, alto, 8); mastroGeo.translate(0, alto / 2, 0);
  const cabecaGeo = new THREE.BoxGeometry(56, 16, 2.4), painelGeo = new THREE.PlaneGeometry(25, 12.5), brilhoGeo = new THREE.PlaneGeometry(64, 34), pocaGeo = new THREE.PlaneGeometry(1, 1); pocaGeo.rotateX(-Math.PI / 2);
  const k = lista.length;
  const mastros = new THREE.InstancedMesh(mastroGeo, M(0xc9cdd1, { roughness: 0.5, metalness: 0.4 }), k);
  const cabecas = new THREE.InstancedMesh(cabecaGeo, M(0x2a2d33, { roughness: 0.5, metalness: 0.4 }), k);
  const paineis = new THREE.InstancedMesh(painelGeo, new THREE.MeshBasicMaterial({ map: lampadas }), k * 2);
  const brilhos = new THREE.InstancedMesh(brilhoGeo, aditivo(brilho), k * 2), pocas = new THREE.InstancedMesh(pocaGeo, aditivo(poca, { polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), k);
  const o = new THREE.Object3D(), cab = new THREE.Matrix4(), local = new THREE.Matrix4();
  o.rotation.order = "YXZ";
  lista.forEach(({ x, y, z, s, nx, ny, ph }, j) => {
    o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mastros.setMatrixAt(j, o.matrix);
    o.position.set(x, y + alto + 6, z); o.rotation.set(0.3, Math.atan2(-nx * s, -ny * s), 0); o.updateMatrix(); cab.copy(o.matrix); cabecas.setMatrixAt(j, cab);
    [-1, 1].forEach((d, e) => {
      paineis.setMatrixAt(j * 2 + e, cab.clone().multiply(local.makeTranslation(d * 13.6, 0, 1.4)));
      brilhos.setMatrixAt(j * 2 + e, cab.clone().multiply(local.makeTranslation(d * 13.6, 0, 3.2)));
    });
    // a poça de luz: no asfalto, a uns 45 do eixo da pista (para o lado de dentro), 300 de diâmetro
    o.position.set(x - nx * s * (recuo + 70), ph + 2.5, z - ny * s * (recuo + 70)); o.rotation.set(0, 0, 0); o.scale.set(300, 1, 300); o.updateMatrix(); pocas.setMatrixAt(j, o.matrix);
  });
  mastros.castShadow = cabecas.castShadow = true; mastros.name = `${tr.id}-holofotes`;
  for (const m of [mastros, cabecas, paineis]) add(m);
  pocas.name = `${tr.id}-pocas-chao`; // tinta de luz no chão (a conferência de invasão deixa as fitas e o chão de fora)
  for (const m of [brilhos, pocas]) { m.frustumCulled = false; m.renderOrder = 4; soDeNoite(tr, add(m)); }
  tr.holofotes = k;
  return k;
}
