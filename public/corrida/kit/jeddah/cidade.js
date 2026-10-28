// Jeddah — a cidade lá longe: arranha-céus de vidro com janelas acesas (um InstancedMesh por forma, janelas do tamanho certo
// qualquer que seja o prédio), a Jeddah Tower (a torre de três pétalas que vai passar de 1 km, ainda com guindastes no alto)
// e os guindastes. Tudo é cenário parado, longe da pista, em poucas chamadas de desenho.
//   materialJanelas(cor)            — vidro com janelas (e as acesas por emissivo): a textura repete pelo tamanho da instância
//   cidadeJeddah(tr, { add, hAt })  — espalha os prédios a leste da pista (o lado da terra) e põe a Jeddah Tower
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { canvasTex } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";
import { Montador, solido } from "../montagem.js";

const CELULA = [96, 128]; // largura e altura (em unidades) de uma repetição da textura: 4 colunas x 6 andares de janelas
export function materialJanelas() {
  const acesas = Array.from({ length: 96 }, (_, k) => ((k * 7919 + 13 + ((k * k) % 17)) % 100) < 22 ? 1 : 0), pinta = (aceso) => canvasTex(128, 192, (x, w, h) => {
    x.fillStyle = aceso ? "#000000" : "#cfdae1"; x.fillRect(0, 0, w, h);
    for (let a = 0; a < 12; a++) for (let c = 0; c < 8; c++) {
      const lit = acesas[a * 8 + c], tom = (a * 3 + c * 5) % 3;
      x.fillStyle = aceso ? (lit ? "#ffd98a" : "#000000") : (lit ? "#ffe9b8" : ["#6f93aa", "#7aa0b6", "#8fb0c2"][tom]); x.fillRect(c * 16 + 1, a * 16 + 1, 14, 13);
      if (!aceso && !lit) { x.fillStyle = "#ffffff40"; x.fillRect(c * 16 + 1, a * 16 + 1, 14, 3); }
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: pinta(false), emissiveMap: pinta(true), emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.45, metalness: 0.1 });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_INSTANCING
  vec3 escalaJ = vec3( length( instanceMatrix[ 0 ].xyz ), length( instanceMatrix[ 1 ].xyz ), length( instanceMatrix[ 2 ].xyz ) );
  vec2 fatorJ = vec2( abs( normal.x ) > 0.5 ? escalaJ.z : escalaJ.x, abs( normal.y ) > 0.5 ? escalaJ.z : escalaJ.y ) / vec2( ${CELULA[0].toFixed(1)}, ${CELULA[1].toFixed(1)} );
  #ifdef USE_MAP
    vMapUv *= fatorJ;
  #endif
  #ifdef USE_EMISSIVEMAP
    vEmissiveMapUv *= fatorJ;
  #endif
#endif`);
  };
  mat.customProgramCacheKey = () => "jeddah-janelas";
  return mat;
}

// uma caixa de tamanho (sx, sy, sz) com o centro em (ox, oy, oz): as uv já levam o tamanho para a textura não esticar
function caixaUV(sx, sy, sz, ox, oy, oz) {
  const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, nm = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nm.getX(i)) > 0.5, ny = Math.abs(nm.getY(i)) > 0.5;
    uv.setXY(i, uv.getX(i) * (nx ? sz : sx), uv.getY(i) * (ny ? sz : sy));
  }
  g.translate(ox, oy, oz); return g;
}
// as formas de prédio (altura 1, largura 1): o instance scale esticar tudo junto; as uv acima já vêm "com tamanho 1" e o
// shader multiplica pela escala da instância
const unit = (partes) => mergeGeometries(partes.map(([sx, sy, sz, ox, oy, oz]) => caixaUV(sx, sy, sz, ox, oy, oz)), false);
const FORMAS = {
  caixa: () => unit([[1, 1, 1, 0, 0.5, 0]]),
  degraus: () => unit([[1, 0.7, 1, 0, 0.35, 0], [0.7, 0.2, 0.7, 0, 0.8, 0], [0.4, 0.1, 0.4, 0, 0.95, 0]]),
  torreFina: () => unit([[1, 0.88, 1, 0, 0.44, 0], [0.5, 0.12, 0.5, 0, 0.94, 0]]),
  gemeas: () => unit([[0.42, 1, 1, -0.29, 0.5, 0], [0.42, 1, 1, 0.29, 0.5, 0], [0.2, 0.06, 0.8, 0, 0.62, 0]]),
};

export function cidadeJeddah(tr, { add, hAt }) {
  const r = sorteio(8821), mat = materialJanelas(), listas = { caixa: [], degraus: [], torreFina: [], gemeas: [] };
  const tintas = ["#ffffff", "#d7e7f3", "#c4d6c9", "#efe2c8", "#c9d1e8"].map((c) => new THREE.Color(c));
  const passo = 190;
  for (let x = 4300; x < 8300; x += passo) for (let z = -400; z < 8700; z += passo) {
    const px = x + (r() - 0.5) * passo * 0.7, pz = z + (r() - 0.5) * passo * 0.7;
    const densidade = Math.min(0.92, Math.max(0.12, (pz - 1800) / 4200 + 0.15)) * (px > 6800 ? 0.55 : 1);
    if (r() > densidade) continue;
    const sx = 60 + r() * 70, sz = 60 + r() * 70, longe = Math.min(1, (px - 4500) / 2200), alto = 90 + r() * (180 + 420 * longe * (0.3 + r()));
    if (!livre(tr, px, pz, 300 + Math.hypot(sx, sz) / 2) || ocupado(tr, px, pz) || Math.hypot(px - 6350, pz - 6650) < 330) continue; // a Jeddah Tower tem o terreno dela
    const forma = r() < 0.5 ? "caixa" : r() < 0.5 ? "degraus" : r() < 0.5 ? "torreFina" : "gemeas";
    listas[forma].push({ x: px, y: hAt(px, pz), z: pz, sx, sy: alto, sz, r: Math.floor(r() * 4) * 0.4 + (r() - 0.5) * 0.15, c: tintas[(r() * tintas.length) | 0] });
  }
  const d = new THREE.Object3D(), total = Object.values(listas).reduce((a, l) => a + l.length, 0);
  for (const [nome, lista] of Object.entries(listas)) {
    if (!lista.length) continue;
    const m = add(new THREE.InstancedMesh(FORMAS[nome](), mat, lista.length));
    lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, o.c); });
    m.castShadow = false; m.receiveShadow = false; m.name = `${tr.id}-cidade-${nome}`; m.frustumCulled = false;
  }
  jeddahTower(tr, { add, hAt }, mat);
  return total;
}

// a Jeddah Tower: três "asas" de vidro a 120 graus que recuam em degraus, o miolo subindo até a agulha, e os guindastes no topo
export function jeddahTower(tr, { add, hAt }, mat, { x = 6350, z = 6650, altura = 1750 } = {}) {
  const base = hAt(x, z), asas = [], miolo = [], nucleo = caixaUV(1, 1, 1, 0, 0.5, 0);
  const niveis = [[0.46, 1.0], [0.62, 0.78], [0.78, 0.58], [0.9, 0.4], [1.0, 0.26]]; // [até onde sobe (fração), comprimento da asa]
  const cadaAsa = (k, fn) => { for (let a = 0; a < 3; a++) fn(a, (a / 3) * Math.PI * 2 + k * 0); };
  cadaAsa(0, (a, ang) => {
    let h0 = 0;
    niveis.forEach(([ate, comp], k) => {
      const h = (ate - h0) * altura * (0.86 + 0.06 * a), dist = 40 * comp + 16;
      asas.push({ x: x + Math.cos(ang) * dist, y: base + h0 * altura * (0.86 + 0.06 * a), z: z + Math.sin(ang) * dist, sx: 150 * comp + 40, sy: h, sz: 62 * (0.6 + comp * 0.4), r: -ang });
      h0 = ate * (1 - 0.03 * k);
    });
  });
  miolo.push({ x, y: base, z, sx: 70, sy: altura * 0.93, sz: 70, r: 0 }, { x, y: base + altura * 0.93, z, sx: 34, sy: altura * 0.07, sz: 34, r: 0.4 });
  const d = new THREE.Object3D();
  for (const [lista, cor] of [[asas, "#e9f2f8"], [miolo, "#cfdce6"]]) {
    const m = add(new THREE.InstancedMesh(nucleo, mat, lista.length)), c = new THREE.Color(cor);
    lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, c); });
    m.name = `${tr.id}-jeddah-tower`; m.frustumCulled = false;
  }
  // a agulha e dois guindastes de obra, com a lança e o contrapeso
  const mt = new Montador(), S = solido();
  mt.cilindro(S, [x, base + altura + 90, z], [3, 190], { cor: "#d9dde0", seg: 6 });
  for (const [dx, dz, giro] of [[60, 20, 0.5], [-50, -40, 2.2]]) {
    const gx = x + dx, gz = z + dz, topo = base + altura * 0.9;
    mt.caixa(S, [gx, topo + 70, gz], [5, 140, 5], { cor: "#f2b705" });
    mt.caixa(S, [gx + Math.cos(giro) * 70, topo + 142, gz + Math.sin(giro) * 70], [140, 3.5, 3.5], { cor: "#f2b705", ry: -giro });
    mt.caixa(S, [gx - Math.cos(giro) * 30, topo + 142, gz - Math.sin(giro) * 30], [30, 6, 6], { cor: "#7b7f84", ry: -giro });
  }
  const g = mt.montar("jeddah-tower-agulha"); add(g);
  tr.reservado.push([x, z, 340]); tr.jeddahTower = { x, z, altura };
}
