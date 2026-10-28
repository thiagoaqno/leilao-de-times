// Melbourne — as árvores do parque Albert, em bosques soltos (e não numa parede contínua): moitas de 6 a 14 copas longe da pista,
// mais a fileira de árvores na margem do lago. Copas e troncos em dois InstancedMesh (sem sombra), cor por instância. Nada fica
// mais perto da pista do que `minimo` (a copa mais larga entra na conta) nem em `proibido`/`tr.ocupado`.
import * as THREE from "three";
import { M } from "../../cena.js";
import { instancias, sorteio } from "../comum.js";

/**
 * @param {object} tr · @param {Function} add
 * @param {object} o
 * @param {number} [o.moitas=110] quantas · @param {number} [o.minimo=150] distância mínima da pista (da meia largura para fora)
 * @param {number[]} [o.alturas=[90,150]] · @param {string[]} [o.folhas] cores das copas · @param {(x:number,z:number)=>boolean} [o.proibido]
 * @param {number[][]} [o.fixas] árvores soltas [x, z] (a margem do lago, a ilha) · @param {number} [o.semente=1996]
 */
export function bosques(tr, add, { moitas = 110, minimo = 150, alturas = [90, 150], folhas = ["#3f7a34", "#4d8a3a", "#5b9442", "#356b30", "#6d9c45", "#2f6b3a"], proibido = () => false, fixas = [], semente = 1996 } = {}) {
  const r = sorteio(semente), { W } = tr, mundo = tr.t.world, copas = [], troncos = [];
  const ok = (x, z, raio) => tr.distAt(x, z) > W / 2 + minimo * 0.5 + raio && !proibido(x, z) && !tr.ocupado?.(x, z) && !(tr.reservado || []).some(([cx, cz, rr]) => (x - cx) ** 2 + (z - cz) ** 2 < rr * rr);
  const arvore = (x, z, esp = 1) => {
    const alt = (alturas[0] + r() * (alturas[1] - alturas[0])) * esp, larg = alt * (0.34 + r() * 0.1), h = tr.chao(x, z) - 1.5, cor = folhas[(r() * folhas.length) | 0];
    if (!ok(x, z, larg)) return;
    copas.push({ x, y: h + alt * 0.62, z, sx: larg, sy: alt * 0.4, sz: larg, r: r() * 6, c: cor }); troncos.push({ x, y: h + alt * 0.24, z, sx: alt * 0.04, sy: alt * 0.48, sz: alt * 0.04 });
  };
  for (let t = 0, f = 0; f < moitas && t < moitas * 12; t++) {
    const cx = -200 + r() * (mundo + 400), cz = -200 + r() * (mundo + 400);
    if (tr.distAt(cx, cz) < W / 2 + minimo || proibido(cx, cz)) continue;
    f++; const m = 6 + ((r() * 9) | 0), raio = 40 + r() * 50;
    for (let k = 0; k < m; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * raio; arvore(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0.8 + r() * 0.5); }
  }
  for (const [x, z] of fixas) arvore(x, z, 0.7 + r() * 0.5);
  const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); m.instanceColor.needsUpdate = true; } return m; };
  colorir(instancias(add, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), copas, { sombra: false, nome: `${tr.id}-bosques-copas` }), copas);
  instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), M(0x5b4631, { roughness: 1 }), troncos, { sombra: false, nome: `${tr.id}-bosques-troncos` });
  tr.bosquesGP = { copas: copas.length };
}
