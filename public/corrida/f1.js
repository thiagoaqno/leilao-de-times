// Corrida da Galera — o carro de Fórmula 1 (public/corrida/f1/f1.glb, CC0). A pintura do modelo é uma máscara: o que
// é vermelho na textura recebe a cor principal, o que é verde recebe a secundária e o azul fica preto. Assim cada carro
// tem a pintura escolhida (as de equipe, em PINTURAS, ou a cor do piloto com branco). Medidas em metros; a frente é −z
// (a mesma convenção do kart antigo, então quem usa só troca a escala).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// combinações de cor das equipes de F1 (ficam em pistas.js: o servidor confere a escolha)
export const PINTURAS = window.Pistas.MODS.pintura;
export const TAM = 4.35; // comprimento do modelo, em metros

const MODELO = { cena: null, falhou: false, espera: [] };
const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
export const f1Pronto = gl.loadAsync("/corrida/f1/f1.glb").then((g) => { MODELO.cena = g.scene; for (const k of MODELO.espera.splice(0)) montarCorpo(k); })
  .catch((e) => { MODELO.falhou = true; console.warn("Corrida: o carro de F1 não carregou", e); });

// a pintura: troca a cor que vem da máscara (mapa) pelas duas cores do carro
function pintura(base, cor1, cor2) {
  const m = base.clone(); m.color.set(0xffffff);
  m.userData.cores = { cor1: { value: new THREE.Color(cor1) }, cor2: { value: new THREE.Color(cor2) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.cores);
    sh.fragmentShader = "uniform vec3 cor1;\nuniform vec3 cor2;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      { vec3 mk = diffuseColor.rgb; diffuseColor.rgb = cor1 * mk.r + cor2 * mk.g + vec3(0.012) * mk.b; }`);
  };
  m.customProgramCacheKey = () => "f1-pintura";
  return m;
}
export function coresDa(pint, corPiloto) { const p = PINTURAS[pint] || PINTURAS.propria; return [p.c || corPiloto, p.c2]; }

export function montarF1({ cor = "#e63946", cor2 = "#f4f4f4" } = {}) {
  const g = new THREE.Group(), carro = new THREE.Group(); g.add(carro);
  const k = { g, carro, rodas: [], volante: null, mats: [], pintura: null, piloto: new THREE.Object3D(), olho: { z: 0.3, y: 0.95 }, cores: [cor, cor2], escapamento: { z: 2.2, y: 0.42 } };
  // enquanto o modelo não chega, uma silhueta simples no lugar
  const prov = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, TAM), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5 })); prov.position.y = 0.35; prov.castShadow = true; carro.add(prov);
  k.prov = prov; k.mats.push(prov.material); k.pintura = prov.material;
  if (MODELO.cena) montarCorpo(k); else if (!MODELO.falhou) MODELO.espera.push(k);
  return k;
}
function montarCorpo(k) {
  if (k.solto) return;
  k.carro.remove(k.prov); k.prov.geometry.dispose();
  const m = MODELO.cena.clone(true); m.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(m), c0 = caixa.getCenter(new THREE.Vector3());
  // descobre para que lado é a frente (as rodas da frente) e vira o carro para a frente ficar em −z
  const centro = (nome) => { const o = m.getObjectByName(nome); return o ? new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) : null; };
  const fr = centro("front_wheels"), tr = centro("back_wheels"), vira = fr && tr && fr.z > tr.z;
  const raiz = new THREE.Group(); const fe = new THREE.Group(); fe.position.set(-c0.x, -caixa.min.y, -c0.z); fe.add(m); raiz.add(fe);
  if (vira) raiz.rotation.y = Math.PI;
  k.carro.add(raiz); raiz.updateMatrixWorld(true);
  const mats = new Map(); // um material de cada por carro (o fantasma deixa transparente; a estrela acende a pintura)
  m.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = false;
    const base = o.material, nome = base.name;
    if (!mats.has(nome)) mats.set(nome, nome === "body_mat" ? pintura(base, k.cores[0], k.cores[1]) : base.clone());
    o.material = mats.get(nome);
  });
  k.mats = [...mats.values()]; k.pintura = mats.get("body_mat") || k.mats[0];
  // rodas: o modelo traz as duas de cada eixo numa malha só; aqui ela vira duas (esquerda e direita), e cada roda ganha
  // um pivô no próprio centro: "gira" roda pela distância andada e, nas da frente, "esterca" vira com o volante
  k.carro.updateMatrixWorld(true);
  for (const nome of ["front_wheels", "back_wheels"]) {
    const o = m.getObjectByName(nome); if (!o) continue;
    for (const metade of dividirRodas(o)) {
      o.parent.add(metade); metade.updateMatrixWorld(true);
      // a caixa só dos vértices desta roda (a malha dividida ainda guarda os vértices das duas)
      const b = new THREE.Box3(), v = new THREE.Vector3(), pos = metade.geometry.attributes.position, idx = metade.geometry.index.array;
      for (let q = 0; q < idx.length; q++) b.expandByPoint(v.fromBufferAttribute(pos, idx[q]).applyMatrix4(metade.matrixWorld));
      const ctr = k.carro.worldToLocal(b.getCenter(new THREE.Vector3())), r = (b.max.y - b.min.y) / 2;
      const esterca = new THREE.Group(); esterca.position.copy(ctr); k.carro.add(esterca);
      const gira = new THREE.Group(); esterca.add(gira); esterca.updateMatrixWorld(true); gira.attach(metade);
      k.rodas.push({ gira, esterca: nome === "front_wheels" ? esterca : null, r });
    }
    o.parent.remove(o);
  }
  const vol = m.getObjectByName("steering_wheel");
  if (vol) {
    const ctr = k.carro.worldToLocal(new THREE.Box3().setFromObject(vol).getCenter(new THREE.Vector3()));
    const piv = new THREE.Group(); piv.position.copy(ctr); k.carro.add(piv); piv.updateMatrixWorld(true); piv.attach(vol); k.volante = piv;
    k.olho = { z: ctr.z + 0.62, y: ctr.y + 0.32 }; // atrás do volante, na altura do capacete
  }
  const cx = new THREE.Box3().setFromObject(k.carro); k.escapamento = { z: k.carro.worldToLocal(cx.max.clone()).z - 0.1, y: 0.42 };
  k.aoMontar?.(k);
}
// separa a malha das duas rodas de um eixo em duas malhas (pelo lado de cada triângulo); a divisão fica guardada
const DIVISOES = new Map();
function dividirRodas(o) {
  if (!DIVISOES.has(o.geometry)) {
    const g = o.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
    const lados = [[], []], v = new THREE.Vector3(), ladoDe = (i) => v.fromBufferAttribute(pos, i).applyMatrix4(o.matrix).x;
    for (let t = 0; t < idx.length; t += 3) lados[(ladoDe(idx[t]) + ladoDe(idx[t + 1]) + ladoDe(idx[t + 2])) / 3 < 0 ? 0 : 1].push(idx[t], idx[t + 1], idx[t + 2]);
    DIVISOES.set(o.geometry, lados.map((l) => { const n = g.clone(); n.setIndex(l); n.clearGroups(); return n; }));
  }
  return DIVISOES.get(o.geometry).map((geo) => { const m = new THREE.Mesh(geo, o.material); m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); m.castShadow = true; return m; });
}
// a cada quadro: as rodas giram pela distância andada, as da frente esterçam e o volante vira junto (direita = horário)
export function animarF1(k, dist, virar) {
  for (const r of k.rodas) { r.gira.rotation.x -= dist / r.r; if (r.esterca) r.esterca.rotation.y = -virar * 0.42; }
  if (k.volante) k.volante.rotation.z = -virar * 0.9;
}
export function trocarCores(k, cor1, cor2) { k.cores = [cor1, cor2]; const u = k.pintura?.userData?.cores; if (u) { u.cor1.value.set(cor1); u.cor2.value.set(cor2); } }
export function soltarF1(k) { k.solto = true; for (const m of k.mats) m.dispose(); } // a malha é a mesma para todos os carros: fica
