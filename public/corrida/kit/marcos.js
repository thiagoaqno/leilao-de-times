// Kit de pista — marcos que servem em qualquer GP: as passarelas com as faixas dos patrocinadores por cima da pista, os
// postes de rua atrás do guard-rail e a serra/montanha no horizonte.
import * as THREE from "three";
import { M } from "../cena.js";
import { marcaTex } from "./marcas.js";
import { livre, ocupado, instancias } from "./comum.js";

const L_ = (tr) => (tr.wallLat < 1e9 ? tr.wallLat : tr.W / 2 + 30); // onde fica a beira (o guard-rail, ou um pouco além da pista)

// passarelas: candidatos (frações da volta, em ordem de preferência), no máximo `max`; marcas: as faixas, na ordem
export function passarelas(tr, add, { candidatos, marcas = ["rolex", "heineken", "tag"], max = 3 }) {
  const { pts, n } = tr, L = L_(tr), feitas = [];
  const faixas = marcas.map((nome) => marcaTex(nome, 1024, 128));
  const aco = M(0x3a4048, { roughness: 0.5, metalness: 0.4 }), vidro = M(0x9fb8c8, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 });
  for (const f of candidatos) {
    const i = Math.floor(f * n), p = pts[i], vao = L + 16, k = feitas.length;
    if (k >= max || tr.coberto?.(i)) continue;
    const pes = [-1, 1].map((s) => [p.x + p.nx * s * vao, p.y + p.ny * s * vao]);
    if (!pes.every(([x, z]) => livre(tr, x, z, 14) && !ocupado(tr, x, z))) continue; // nem na água, nem na arquibancada, nem no grampo vizinho
    const g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
    const alto = 74, fx = new THREE.MeshBasicMaterial({ map: faixas[k % faixas.length] });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 16, vao * 2 + 16), [fx, fx, aco, aco, aco, aco]); deck.position.y = alto + 8; deck.castShadow = true; g.add(deck);
    const corrimao = new THREE.Mesh(new THREE.BoxGeometry(12, 10, vao * 2 + 14), vidro); corrimao.position.y = alto + 21; g.add(corrimao);
    for (const s of [-1, 1]) {
      const torre = new THREE.Mesh(new THREE.BoxGeometry(16, alto + 26, 18), aco); torre.position.set(0, (alto + 26) / 2, s * (vao + 2)); torre.castShadow = true; g.add(torre);
      const janela = new THREE.Mesh(new THREE.BoxGeometry(16.4, alto - 10, 12), vidro); janela.position.set(0, (alto - 10) / 2 + 8, s * (vao + 2)); g.add(janela);
    }
    for (const [x, z] of pes) (tr.reservado ||= []).push([x, z, 30]);
    feitas.push(f);
  }
  if (feitas.length) tr.semBandeirolas = true; // as passarelas ficam no lugar das bandeirolas coloridas de vida.js
  return feitas.length;
}

// postes de rua com o braço virado para a pista, um lado de cada vez a cada `passo` pontos
export function postes(tr, add, { passo = 34, cor = 0x22352b } = {}) {
  const { pts, n } = tr, L = L_(tr), lista = [], bracos = [], lanternas = [];
  for (let i = 10, lado = 1; i < n; i += passo, lado = -lado) {
    if (tr.coberto?.(i)) continue;
    const p = pts[i], d = L + 13, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (!livre(tr, x, z, 16) || ocupado(tr, x, z, i)) continue;
    const h = p.h, dx = -p.nx * lado, dz = -p.ny * lado, ry = Math.atan2(-dz, dx);
    lista.push({ x, y: h + 32, z });
    bracos.push({ x: x + dx * 7, y: h + 63, z: z + dz * 7, sx: 15, sy: 1, sz: 1, r: ry });
    lanternas.push({ x: x + dx * 13, y: h + 61, z: z + dz * 13, sx: 4, sy: 3, sz: 4, r: ry });
  }
  const metal = M(cor, { roughness: 0.6, metalness: 0.3 });
  instancias(add, new THREE.CylinderGeometry(0.8, 1.3, 64, 8), metal, lista, { nome: `${tr.id}-postes` });
  instancias(add, new THREE.BoxGeometry(1, 1, 1), metal, bracos);
  instancias(add, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd99a, emissiveIntensity: 0.6 }), lanternas, { sombra: false });
  return lista.length;
}

// a serra no horizonte, além do fim do chão (a neblina não apaga; a cor já vem misturada com o azul da distância).
// angulo: a direção a partir do centro do mundo (-π/2 é o norte, o y pequeno do traçado); altura: a crista média;
// cores: rocha, mato e o azul da distância
export function montanha(tr, add, { angulo = -Math.PI / 2, afastamento = 1350, altura = 860, largura = 12000, rocha = "#7d776c", mato = "#3f5236", longe = "#8fa3b3" } = {}) {
  const world = tr.t.world, fundo = 2400, geo = new THREE.PlaneGeometry(largura, fundo, 120, 24); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cores = [], cR = new THREE.Color(rocha), cM = new THREE.Color(mato), cL = new THREE.Color(longe), c = new THREE.Color();
  const ruido = (x, z) => Math.sin(x / 233 + z / 171) * Math.cos(x / 97 - z / 143) + 0.5 * Math.sin(x / 61 + z / 37);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), t = (fundo / 2 - z) / fundo; // 0 na frente (perto da pista), 1 lá atrás
    const crista = altura + altura * 0.3 * Math.sin(x / 1100 + 1.2) + altura * 0.2 * Math.sin(x / 430 + 2) + altura * 0.09 * Math.sin(x / 170);
    const h = crista * Math.pow(t, 0.75) + ruido(x, z) * 40 * t - 8;
    pos.setY(i, h);
    const alto = Math.min(1, Math.max(0, h / 520)), pedra = Math.min(1, alto * 0.9 + (ruido(x * 1.7, z * 1.3) * 0.5 + 0.5) * 0.35);
    c.copy(cM).lerp(cR, pedra).lerp(cL, 0.12 + 0.2 * t); cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); geo.computeVertexNormals();
  const m = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false })));
  const dist = world / 2 + afastamento + fundo / 2;
  m.position.set(world / 2 + Math.cos(angulo) * dist, 0, world / 2 + Math.sin(angulo) * dist); m.rotation.y = Math.atan2(-Math.cos(angulo), -Math.sin(angulo)); // o fundo virado para fora
  m.name = `${tr.id}-montanha`; return m;
}
