// Bahrein — a corrida noturna: as torres de refletores altíssimas (mastro cônico, uma cabeça com dois painéis de lâmpadas virada
// para a pista) e, só de noite, o brilho dos painéis e a luz de verdade no asfalto. Mastros, cabeças, painéis e brilhos são 4
// InstancedMesh para a pista inteira. Cada torre só nasce onde `livre` e `ocupado` deixam.
import * as THREE from "three";
import { canvasTex, M, hemi } from "../../cena.js";
import { livre, ocupado } from "../comum.js";
import { luzDaNoite, soDeNoite } from "./base.js";

// A luz no chão é SpotLight de verdade (ilumina o asfalto e os carros, que passam por dentro dela), não uma placa clara por cima.
// Uma luz por torre seria caro demais: são LUZES fixas (mudar o número de luzes recompila todos os materiais), que a cada quadro
// vão para as torres mais perto do carro. A que está para sair da lista já chega apagada (FAIXA), então a troca não pisca.
// A noite padrão do jogo (hemi 0,95, em pista.js) é clara demais para a luz dos refletores aparecer: no Bahrein ela baixa para HEMI_NOITE.
const LUZES = 6, FORCA = 1100, FAIXA = 160, ALCANCE = 560, HEMI_NOITE = 0.5;

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
  const aditivo = (map, o = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...o });
  const mastroGeo = new THREE.CylinderGeometry(1.3, 2.7, alto, 8); mastroGeo.translate(0, alto / 2, 0);
  const cabecaGeo = new THREE.BoxGeometry(56, 16, 2.4), painelGeo = new THREE.PlaneGeometry(25, 12.5), brilhoGeo = new THREE.PlaneGeometry(64, 34);
  const k = lista.length;
  const mastros = new THREE.InstancedMesh(mastroGeo, M(0xc9cdd1, { roughness: 0.5, metalness: 0.4 }), k);
  const cabecas = new THREE.InstancedMesh(cabecaGeo, M(0x2a2d33, { roughness: 0.5, metalness: 0.4 }), k);
  const paineis = new THREE.InstancedMesh(painelGeo, new THREE.MeshBasicMaterial({ map: lampadas }), k * 2);
  const brilhos = new THREE.InstancedMesh(brilhoGeo, aditivo(brilho), k * 2);
  const o = new THREE.Object3D(), cab = new THREE.Matrix4(), local = new THREE.Matrix4();
  o.rotation.order = "YXZ";
  lista.forEach((t, j) => {
    const { x, y, z, s, nx, ny, ph } = t;
    o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mastros.setMatrixAt(j, o.matrix);
    o.position.set(x, y + alto + 6, z); o.rotation.set(0.3, Math.atan2(-nx * s, -ny * s), 0); o.updateMatrix(); cab.copy(o.matrix); cabecas.setMatrixAt(j, cab);
    [-1, 1].forEach((d, e) => {
      paineis.setMatrixAt(j * 2 + e, cab.clone().multiply(local.makeTranslation(d * 13.6, 0, 1.4)));
      brilhos.setMatrixAt(j * 2 + e, cab.clone().multiply(local.makeTranslation(d * 13.6, 0, 3.2)));
    });
    // de onde a luz sai (a cabeça) e para onde ela aponta: o asfalto, a uns 45 do eixo da pista (para o lado de dentro)
    t.cabeca = [x, y + alto + 6, z]; t.alvo = [x - nx * s * (recuo + 70), ph, z - ny * s * (recuo + 70)];
  });
  mastros.castShadow = cabecas.castShadow = true; mastros.name = `${tr.id}-holofotes`;
  for (const m of [mastros, cabecas, paineis]) add(m);
  brilhos.frustumCulled = false; brilhos.renderOrder = 4; soDeNoite(tr, add(brilhos));
  // as luzes: ficam sempre na cena (de dia, apagadas), para o número de luzes não mudar quando o dia vira noite
  const luzes = [];
  for (let j = 0; j < LUZES; j++) {
    const l = new THREE.SpotLight(0xffe6bf, 0, ALCANCE, 0.72, 0.8, 1); l.name = `${tr.id}-luz-refletor`;
    add(l); add(l.target); luzes.push(l);
  }
  // guardadas em `tr`: elas só andam de noite e com o carro na pista, e o kit/fundir.js congelaria quem não andou no teste dele
  // (a matriz parada na origem: a luz não chegava na pista)
  tr.luzesRefletores = luzes.flatMap((l) => [l, l.target]);
  const perto = lista.map((t) => ({ t, d: 0 }));
  luzDaNoite(tr).quadro.push((noite, foco) => {
    if (!noite || !foco) { for (const l of luzes) l.intensity = 0; return; }
    hemi.intensity = HEMI_NOITE; // (ceu.js e useTrack voltam a pôr a de sempre quando a foto do céu chega ou a pista muda)
    for (const p of perto) p.d = Math.hypot(p.t.alvo[0] - foco.x, p.t.alvo[2] - foco.y);
    perto.sort((a, b) => a.d - b.d);
    const limite = perto[LUZES]?.d ?? Infinity; // a primeira torre que ficou de fora: quem está quase tão longe quanto ela vai apagando
    luzes.forEach((l, j) => {
      const p = perto[j]; if (!p) { l.intensity = 0; return; }
      l.position.set(...p.t.cabeca); l.target.position.set(...p.t.alvo);
      l.intensity = FORCA * Math.min(1, (limite - p.d) / FAIXA);
    });
  });
  tr.holofotes = k;
  return k;
}
