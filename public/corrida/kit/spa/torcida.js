// Spa-Francorchamps — a torcida do circuito (peça só desta pista). Em Spa a galera não fica só nas arquibancadas: assiste de pé e sentada
// nas encostas atrás da cerca (Eau Rouge, Pouhon, Blanchimont, Les Combes), e a maior parte vem da Holanda, de laranja da cabeça aos pés,
// com os belgas (preto, amarelo e vermelho) e gente de capa de chuva. Aqui:
// · `torcidaNasEncostas`: as pessoas (duas InstancedMesh, corpo e cabeça, cor por instância) e as bandeiras, só onde `livre`/`ocupado` deixam;
// · `bandeirasDaTorcida`: as bandeiras da Bélgica, da Holanda, a laranja e a do leão de Flandres, todas numa malha só (um atlas de textura);
// · `acampamento`: as barracas e os carros de quem acampa na beira (o camping laranja de Blanchimont e do Eau Rouge).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";

export const LARANJA = "#ff6a13";
// a torcida: laranja em quase tudo (os holandeses), o preto, o amarelo e o vermelho da Bélgica, branco e azul, e as capas de chuva
export const CAMISAS_SPA = [LARANJA, LARANJA, LARANJA, "#ff7a1a", LARANJA, "#ff5a00", LARANJA, "#111111", "#fdda24", "#ef3340", "#ffffff", "#2b4fa8", "#3f7a52", "#fdda24", LARANJA];
const PELES = ["#f1c7a5", "#e8b894", "#d9a37a", "#a8714a", "#f4d3b8"];

const cor = (c) => new THREE.Color(c);

// as bandeiras: um atlas de 2 × 2 (Bélgica, Holanda, a laranja e a de Flandres)
let _atlas = null;
function atlas() {
  return (_atlas ||= canvasTex(256, 256, (x) => {
    x.fillStyle = "#000000"; x.fillRect(0, 0, 43, 128); x.fillStyle = "#fdda24"; x.fillRect(43, 0, 42, 128); x.fillStyle = "#ef3340"; x.fillRect(85, 0, 43, 128); // a Bélgica: três faixas verticais
    x.fillStyle = "#ae1c28"; x.fillRect(128, 0, 128, 43); x.fillStyle = "#ffffff"; x.fillRect(128, 43, 128, 42); x.fillStyle = "#21468b"; x.fillRect(128, 85, 128, 43); // a Holanda: três faixas horizontais
    x.fillStyle = LARANJA; x.fillRect(0, 128, 128, 128); x.fillStyle = "#ffffff"; x.font = "900 26px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("HOLLAND", 64, 192, 112); // a laranja
    x.fillStyle = "#fdda24"; x.fillRect(128, 128, 128, 128); x.fillStyle = "#111111"; // o leão de Flandres, de leve: o corpo, a cabeça e a cauda
    x.beginPath(); x.ellipse(192, 200, 26, 20, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(172, 178, 11, 0, Math.PI * 2); x.fill(); x.fillRect(212, 160, 5, 36);
    x.fillRect(172, 214, 6, 24); x.fillRect(204, 214, 6, 24);
  }, false));
}
const CELULA = [[0, 0.5], [0.5, 0.5], [0, 0], [0.5, 0]]; // o canto de cada bandeira no atlas (u, v), cada uma de 0,5 × 0,5

/**
 * As bandeiras da torcida, numa malha só: cada uma é um retângulo de 12 × 8 no alto de uma haste (instanciada), de lado para a pista.
 * @param {Array} lista [{ x, y, z, tipo (0 Bélgica, 1 Holanda, 2 laranja, 3 Flandres), r (giro), s (escala), alto }]
 */
export function bandeirasDaTorcida(tr, add, lista) {
  if (!lista.length) return 0;
  const vs = [], uv = [], idx = [], hastes = [];
  lista.forEach((o, k) => {
    const alto = o.alto ?? 26, s = o.s ?? 1, w = 12 * s, h = 8 * s, c = Math.cos(o.r || 0), sn = Math.sin(o.r || 0), [u0, v0] = CELULA[o.tipo % 4], b = vs.length / 3;
    const ondula = 0.6 + (k % 3) * 0.5; // a ponta solta da bandeira fica um pouco fora do plano
    for (const [a, yy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { vs.push(o.x + c * w * a + (a ? sn * ondula : 0), o.y + alto - h + h * yy, o.z - sn * w * a + (a ? c * ondula : 0)); uv.push(u0 + 0.5 * a, v0 + 0.5 * yy); }
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    hastes.push({ x: o.x, y: o.y + alto / 2, z: o.z, sx: 0.6, sy: alto, sz: 0.6 });
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas(), roughness: 0.85, side: THREE.DoubleSide }))); m.name = `${tr.id}-bandeiras-torcida`;
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 4), M(0xd9d9d9, { roughness: 0.5 }), hastes, { sombra: false, nome: `${tr.id}-hastes-torcida` });
  tr.bandeirasSpa = (tr.bandeirasSpa || 0) + lista.length;
  return lista.length;
}

/**
 * A galera nas encostas, de pé e sentada, atrás da cerca.
 * @param {Array} zonas [{ f0, f1, lado, lat0, lat1, dens, bandeiras (fração com bandeira, 0,12) }]: de f0 a f1 (frações da volta), do lado 1 ou -1, de lat0 a lat1 do
 *   centro da pista (a cerca fica a W/2 + 31), `dens` pessoas por ponto-amostra (de 2 em 2 pontos)
 * @param {object} cfg { semente, camisas }
 */
export function torcidaNasEncostas(tr, add, zonas, cfg = {}) {
  const { pts, n } = tr, r = sorteio(cfg.semente ?? 7771), camisas = cfg.camisas || CAMISAS_SPA, corpos = [], cabecas = [], bandeiras = [];
  for (const z of zonas) {
    const a = Math.floor(z.f0 * n), b = Math.floor(z.f1 * n);
    for (let i = a; i <= b; i += 2) {
      const p = pts[((i % n) + n) % n];
      for (let k = 0, q = Math.floor(z.dens) + (r() < z.dens % 1 ? 1 : 0); k < q; k++) {
        const lat = z.lat0 + (z.lat1 - z.lat0) * r() * r(), x = p.x + p.nx * z.lado * lat + p.tx * (r() - 0.5) * 12, zz = p.y + p.ny * z.lado * lat + p.ty * (r() - 0.5) * 12;
        if (tr.distAt(x, zz) < lat - 6 || ocupado(tr, x, zz, i % n)) continue;
        const y = tr.chao(x, zz) - 1.5, sentado = r() < 0.4, alto = sentado ? 5.4 : 8, c = camisas[(r() * camisas.length) | 0];
        corpos.push({ x, y: y + alto / 2, z: zz, sx: 2.8, sy: alto, sz: 2.2, r: r() * 6.28, c });
        cabecas.push({ x, y: y + alto + 1.2, z: zz, sx: 2.3, sy: 2.4, sz: 2.3, r: r() * 6.28, c: PELES[(r() * PELES.length) | 0] });
        if (r() < (z.bandeiras ?? 0.12)) bandeiras.push({ x, y: y + alto - 1, z: zz, tipo: r() < 0.5 ? 2 : r() < 0.55 ? 0 : r() < 0.7 ? 1 : 3, r: r() * 6.28, s: 0.8 + r() * 0.5, alto: 16 + r() * 10 });
      }
    }
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), corpos, { sombra: false, nome: `${tr.id}-torcida-corpos` }), corpos);
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.9 }), cabecas, { sombra: false, nome: `${tr.id}-torcida-cabecas` }), cabecas);
  bandeirasDaTorcida(tr, add, bandeiras);
  tr.torcidaSpa = corpos.length;
  return corpos.length;
}

/**
 * O acampamento: barracas (laranja e de cores variadas), motorhomes e carros, em manchas ao lado da pista.
 * @param {Array} zonas [{ f0, f1, lado, lat0, lat1, dens }] (como em `torcidaNasEncostas`) · @param {object} cfg { semente, barracas (fração de barracas, o resto são carros; 0,72) }
 */
export function acampamento(tr, add, zonas, cfg = {}) {
  const { pts, n } = tr, r = sorteio(cfg.semente ?? 3301), barracas = [], carros = [], tetos = [];
  const CORES = [LARANJA, LARANJA, "#ff8a2a", "#fdda24", "#2b4fa8", "#3f7a52", "#ef3340", "#f4f4f2", LARANJA];
  const CARROS = ["#e9eaec", "#ff7a1a", "#2b4fa8", "#c8102e", "#3a3d42", "#f4f4f2", "#5a8a52", "#f2c500"];
  for (const z of zonas) {
    const a = Math.floor(z.f0 * n), b = Math.floor(z.f1 * n);
    for (let i = a; i <= b; i += 3) {
      const p = pts[((i % n) + n) % n];
      for (let k = 0, q = Math.floor(z.dens) + (r() < z.dens % 1 ? 1 : 0); k < q; k++) {
        const lat = z.lat0 + (z.lat1 - z.lat0) * r(), x = p.x + p.nx * z.lado * lat + p.tx * (r() - 0.5) * 20, zz = p.y + p.ny * z.lado * lat + p.ty * (r() - 0.5) * 20;
        if (!livre(tr, x, zz, 70) || ocupado(tr, x, zz, i % n)) continue;
        const y = tr.chao(x, zz) - 1.5, giro = r() * 6.28;
        if (r() < (cfg.barracas ?? 0.72)) barracas.push({ x, y, z: zz, sx: 11 + r() * 5, sy: 7 + r() * 2.5, sz: 12 + r() * 5, r: giro + Math.PI / 4, c: CORES[(r() * CORES.length) | 0] });
        else { const c = CARROS[(r() * CARROS.length) | 0], comp = 20 + r() * 8; carros.push({ x, y: y + 4.4, z: zz, sx: comp, sy: 7.4, sz: 10, r: giro, c }); tetos.push({ x, y: y + 9.4, z: zz, sx: comp * 0.58, sy: 3.4, sz: 9, r: giro, c: "#26323d" }); }
      }
    }
  }
  const tenda = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); tenda.rotateY(Math.PI / 4); tenda.translate(0, 0.5, 0); // pirâmide de base 1 × 1 com a base no chão
  const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
  colorir(instancias(add, tenda, M(0xffffff, { roughness: 0.9, flatShading: true }), barracas, { sombra: false, nome: `${tr.id}-barracas` }), barracas);
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.6 }), carros, { sombra: false, nome: `${tr.id}-motorhomes` }), carros);
  colorir(instancias(add, caixa, M(0xffffff, { roughness: 0.4 }), tetos, { sombra: false, nome: `${tr.id}-motorhomes-vidro` }), tetos);
  tr.acampamentoSpa = barracas.length + carros.length;
  return tr.acampamentoSpa;
}
