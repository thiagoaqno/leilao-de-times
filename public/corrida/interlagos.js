// Interlagos: o que só o autódromo tem. O resto (zebras, escape, painéis, postos, placas, passarelas, serra, som e vida) é
// do kit, na configuração de gps/interlagos.js.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, sorteio } from "./kit/comum.js";

// o antes: as arquibancadas para o som da torcida, São Paulo em volta (prédios para as fachadas do kit) e o lago
export function cenarioInterlagos(tr, { add, hAt, blds, aguaTex }) {
  const { pts, n } = tr, f = (v) => Math.floor(v * n);
  // onde pista.js põe as arquibancadas: a reta dos boxes e uma em cada setor
  tr.arquibancadas = [[0, f(0.1)], [f(0.96), n], ...[0.16, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87].map((v) => [f(v - 0.012), f(v + 0.012)])];
  // São Paulo em volta: blocos de prédios longe da pista (de 8 a 25 andares), mais altos quanto mais longe do centro
  const r = sorteio(7731), mundo = tr.t.world;
  for (let k = 0; k < 220; k++) {
    const x = -1300 + r() * (mundo + 2600), y = -1300 + r() * (mundo + 2600);
    if (!livre(tr, x, y, 760)) continue;
    const longe = Math.min(1, Math.hypot(x - mundo / 2, y - mundo / 2) / (mundo * 0.75)), andares = 8 + Math.floor(r() * 12 * (0.4 + longe));
    blds.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 70, sy: andares * 30, sz: 80 + r() * 70, dy: 0.5, r: r() * 3 });
  }
  // o lago da Descida do Lago, por dentro da curva
  const i = f(0.355), p = pts[i], q = pts[(i + 3) % n], dentro = p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1, c = [p.x + p.nx * dentro * 230, p.y + p.ny * dentro * 230];
  if (livre(tr, c[0], c[1], 130)) {
    const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#2f7f9a"), roughness: 0.15, metalness: 0.25, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); mat.map.repeat.set(3, 3); tr.agua.push(mat);
    const lago = add(new THREE.Mesh(new THREE.CircleGeometry(115, 28), mat)); lago.scale.set(1.5, 1, 1); lago.rotation.set(-Math.PI / 2, 0, Math.atan2(p.tx, p.ty) + Math.PI / 2, "YXZ");
    lago.position.set(c[0], hAt(c[0], c[1]) + 0.6, c[1]); tr.reservado.push([c[0], c[1], 150]); tr.lagoInterlagos = { x: c[0], y: c[1] };
  }
}

// o depois, por cima dos enfeites: o prédio dos boxes com a torre de controle, no lado da reta oposto às arquibancadas
export function depoisInterlagos(tr, { add, hAt }) {
  const { pts, n, W } = tr, p = pts[Math.floor(n * 0.045)], d = W / 2 + 115, x = p.x + p.nx * d, z = p.y + p.ny * d;
  if (!livre(tr, x, z, 70)) return;
  const g = new THREE.Group(); g.position.set(x, hAt(x, z), z); g.rotation.y = Math.atan2(p.tx, p.ty) + Math.PI / 2; add(g); // x do grupo = ao longo da reta, z = o lado da pista
  const branco = M(0xe9e8e2, { roughness: 0.85 }), verde = M(0x0b7a43), amarelo = M(0xffcf32), vidro = M(0x2a3a48, { roughness: 0.2, metalness: 0.4 });
  const portas = canvasTex(512, 64, (c, w, h) => { c.fillStyle = "#e9e8e2"; c.fillRect(0, 0, w, h); for (let k = 0; k < 16; k++) { c.fillStyle = "#4a5560"; c.fillRect(8 + k * 31, 10, 24, 44); c.fillStyle = "#ffffff30"; c.fillRect(8 + k * 31, 10, 24, 6); } });
  const fachada = new THREE.MeshStandardMaterial({ map: portas, roughness: 0.8 });
  const bloco = new THREE.Mesh(new THREE.BoxGeometry(520, 34, 46), [branco, branco, branco, branco, fachada, branco]); bloco.position.y = 17; bloco.castShadow = true; g.add(bloco);
  const camarotes = new THREE.Mesh(new THREE.BoxGeometry(500, 30, 40), [branco, branco, branco, branco, vidro, branco]); camarotes.position.set(0, 49, -2); camarotes.castShadow = true; g.add(camarotes);
  const faixaV = new THREE.Mesh(new THREE.BoxGeometry(504, 5, 42), verde); faixaV.position.set(0, 66, -2); g.add(faixaV);
  const faixaA = new THREE.Mesh(new THREE.BoxGeometry(504, 3, 42), amarelo); faixaA.position.set(0, 70, -2); g.add(faixaA);
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(256, 20), new THREE.MeshBasicMaterial({ map: marcaTex("gpsp", 1024, 80) })); marca.position.set(0, 82, 20.6); g.add(marca);
  const torre = new THREE.Mesh(new THREE.BoxGeometry(34, 120, 34), branco); torre.position.set(-200, 60, -2); torre.castShadow = true; g.add(torre);
  const cabine = new THREE.Mesh(new THREE.BoxGeometry(46, 22, 46), vidro); cabine.position.set(-200, 130, -2); g.add(cabine);
  const topo = new THREE.Mesh(new THREE.BoxGeometry(50, 3, 50), verde); topo.position.set(-200, 143, -2); g.add(topo);
  tr.reservado.push([x, z, 150]); tr.boxesInterlagos = { x, y: z };
}
