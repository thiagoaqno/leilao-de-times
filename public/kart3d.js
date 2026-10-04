// Kart com piloto: o kart de caixinhas pintado na cor do jogador e, sentado nele, o boneco da Pelada com a skin
// escolhida (as mesmas da Pelada e do Tênis). Usado na Corrida e na Batalha. Medidas em metros; a frente é −z.
// Precisa de /pelada/campo.js carregado antes (window.Campo: a lista de skins e as camisas).
import * as THREE from "three";
import { makePlayer, descartarJogador } from "/pelada/bonecos.js";
import { liberar } from "/pelada/tex.js";

const C = window.Campo;
// variações por modelo (a Corrida tem 5 "carros"; a Batalha usa o padrão): bico, laterais, roda traseira e asa
const TIPOS = {
  equilibrado: { bico: 1, lat: 1, rt: 0.24, asa: false },
  foguete: { bico: 1.25, lat: 0.9, rt: 0.24, asa: true, ponta: true },
  formiga: { bico: 0.85, lat: 1, rt: 0.22, asa: false },
  drifteiro: { bico: 1, lat: 0.85, rt: 0.23, asa: false, escape: 2 },
  tanque: { bico: 1.05, lat: 1.35, rt: 0.28, asa: false, escape: 2 },
};
// a camisa do boneco "padrão" é a do time com a cor mais parecida com a do kart
function kitParecido(cor) {
  const a = new THREE.Color(cor); let best = "corinthians", bd = Infinity;
  for (const k of Object.keys(C.KITS)) { const b = new THREE.Color(C.kitColor(k)), d = (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}
const SENTA = { z: 0.18, quadril: 0.3 }; // onde fica o quadril do piloto

export function montarKart({ cor = "#e63946", skin = "padrao", aro = "#c3c7cf", aero = "nenhum", faixa = "nenhuma", tipo = "equilibrado", num = 10 } = {}) {
  const T = TIPOS[tipo] || TIPOS.equilibrado, g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
  const tinta = M(cor, { roughness: 0.3, metalness: 0.25 }), preto = M(0x1d1d22, { roughness: 0.8 }), metal = M(0xaeb4bf, { metalness: 0.7, roughness: 0.3 });
  const claro = new THREE.Color(cor).getHSL({}).l > 0.6, faixaM = M(claro ? 0x16161a : 0xf4f4f4, { roughness: 0.4 }), aroM = M(aro, { metalness: 0.7, roughness: 0.3 });
  const kart = new THREE.Group(); g.add(kart);
  const box = (w, h, d, x, y, z, mat, pai = kart) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; pai.add(m); return m; };
  const B = T.bico, L = T.lat;
  // chassi, bico (cobre as pernas), para-choques, laterais, banco, motor e escapamento
  box(0.95, 0.06, 2.0, 0, 0.13, -0.05, preto);
  box(0.82, 0.26, 0.72 * B, 0, 0.3, -0.62 * B, tinta);
  const frente = box(1.08, 0.16, 0.3, 0, 0.22, -1.02 * B - 0.02, tinta); frente.rotation.x = -0.12;
  if (T.ponta) box(0.3, 0.12, 0.5, 0, 0.24, -1.35 * B, tinta);
  box(0.6, 0.1, 0.06, 0, 0.42, -0.27, preto); // painel
  box(1.22, 0.09, 0.12, 0, 0.17, -1.2 * B - 0.04, preto);
  box(1.3, 0.09, 0.14, 0, 0.2, 1.06, preto);
  for (const s of [-1, 1]) box(0.24 * L, 0.2, 0.95, s * (0.44 + 0.12 * L), 0.25, 0.12, tinta);
  box(0.48, 0.08, 0.46, 0, 0.22, SENTA.z, preto);
  const encosto = box(0.48, 0.55, 0.08, 0, 0.5, SENTA.z + 0.27, preto); encosto.rotation.x = -0.25;
  box(0.42, 0.3, 0.36, 0.18, 0.36, 0.78, metal);
  for (let i = 0; i < (T.escape || 1); i++) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8), metal); e.rotation.x = Math.PI / 2; e.position.set(-0.18 - i * 0.14, 0.38, 1.0); kart.add(e); }
  if (faixa === "dupla") for (const s of [-1, 1]) box(0.1, 0.01, 0.72 * B, s * 0.13, 0.435, -0.62 * B, faixaM);
  if (faixa === "lateral") for (const s of [-1, 1]) box(0.01, 0.07, 0.8, s * (0.44 + 0.24 * L + 0.006), 0.27, 0.12, faixaM);
  if (aero === "baixo" || T.asa && aero === "nenhum") box(1.0, 0.05, 0.22, 0, 0.62, 1.0, preto);
  if (aero === "alto") {
    box(1.2, 0.05, 0.3, 0, 0.95, 1.0, preto);
    for (const s of [-1, 1]) { box(0.05, 0.5, 0.06, s * 0.3, 0.7, 1.0, preto); box(0.04, 0.2, 0.36, s * 0.6, 0.95, 1.0, tinta); }
  }
  // volante na coluna de direção
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), preto); col.position.set(0, 0.5, -0.45); col.rotation.x = 1.0; kart.add(col);
  const volante = new THREE.Group(); volante.position.set(0, 0.64, -0.3); volante.rotation.x = -1.0; kart.add(volante);
  volante.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), preto));
  // rodas: pneu, aro na cor escolhida e um raio (para ver girando)
  const rodas = [], frenteP = [];
  for (const [z, r, w, fr] of [[-0.78 * B, 0.2, 0.2, true], [0.75, T.rt, 0.28, false]]) for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * (0.6 + 0.08 * L + w / 2 - 0.1), r, z); kart.add(piv);
    const gira = new THREE.Group(); piv.add(gira);
    const pneu = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), preto); pneu.rotation.z = Math.PI / 2; pneu.castShadow = true; gira.add(pneu);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w + 0.02, 10), aroM); a.rotation.z = Math.PI / 2; gira.add(a);
    box(w + 0.03, r * 1.1, 0.05, 0, 0, 0, preto, gira);
    rodas.push({ gira, r }); if (fr) frenteP.push(piv);
  }
  // o piloto sentado: pernas esticadas para a frente, mãos no volante
  const piloto = makePlayer(kitParecido(cor), num, "", { skin });
  for (const m of piloto.userData.marca || []) piloto.remove(m); // o marcador de time da Pelada não serve aqui
  piloto.position.set(0, SENTA.quadril - 0.85, SENTA.z); g.add(piloto);
  sentar(piloto, 0);
  const mats = new Set(); g.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) mats.add(m); });
  return { g, kart, piloto, rodas, frente: frenteP, volante, pintura: tinta, mats: [...mats], olho: { z: SENTA.z - 0.05, y: SENTA.quadril + 0.95 } };
}
function sentar(p, virar) {
  const u = p.userData; if (!u.legs) return; // modelo 3D sem esqueleto de caixinhas: fica como veio
  for (const l of u.legs) l.rotation.x = 1.45;
  for (const k of u.knees) k.rotation.x = -0.25;
  u.arms[0].rotation.x = 1.0 - virar * 0.25; u.arms[1].rotation.x = 1.0 + virar * 0.25;
  for (const e of u.elbows) e.rotation.x = 0.55;
  u.spine.rotation.z = -virar * 0.12; u.head.rotation.z = virar * 0.06; u.spine.rotation.x = -0.12;
}
// a cada quadro: roda gira pela distância andada, as da frente esterçam e o piloto vira o volante e inclina
export function animarKart(k, dist, virar) {
  for (const r of k.rodas) r.gira.rotation.x -= dist / r.r;
  for (const p of k.frente) p.rotation.y = -virar * 0.45;
  k.volante.rotation.z = virar * 0.9;
  sentar(k.piloto, virar);
}
export function soltarKart(k) {
  if (!k) return;
  k.g.remove(k.piloto); descartarJogador(k.piloto);
  liberar(k.g);
}
