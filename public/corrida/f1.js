// Corrida da Galera — o carro de Fórmula 1 (public/corrida/f1/f1.glb, CC0). A pintura do modelo é uma máscara: o que
// é vermelho na textura recebe a cor principal, o que é verde recebe a secundária e o azul fica preto. Assim cada carro
// tem a pintura escolhida (as de equipe, em PINTURAS, ou a cor do piloto com branco). Medidas em metros; a frente é −z
// (a mesma convenção do kart antigo, então quem usa só troca a escala).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { temDesenho, folhaDaEquipe, corDoNumero, texturaDosDigitos, logosProntos, FAIXAS,
  LIV_VERT_DECL, LIV_VERT_MAIN, LIV_FRAG_DECL, LIV_FRAG_MAIN, PNEU_VERT_DECL, PNEU_VERT_MAIN, PNEU_FRAG_DECL, PNEU_FRAG_MAIN } from "./f1-pintura.js";

// combinações de cor das equipes de F1 (ficam em pistas.js: o servidor confere a escolha)
export const PINTURAS = window.Pistas.MODS.pintura;
export const TAM = 4.35; // comprimento do modelo, em metros

// dois modelos: o completo (o seu carro e a garagem) e um leve, com ~1/5 dos triângulos (os carros dos outros)
const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
const carregar = (arq) => { const M = { cena: null, falhou: false, espera: [] }; M.pronto = gl.loadAsync(arq).then((g) => { M.cena = g.scene; for (const k of M.espera.splice(0)) montarCorpo(k); }).catch((e) => { M.falhou = true; console.warn("Corrida: o carro não carregou", arq, e); }); return M; };
const MODELOS = { completo: carregar("/corrida/f1/f1.glb"), leve: carregar("/corrida/f1/f1-leve.glb") };
export const f1Pronto = Promise.all([MODELOS.completo.pronto, MODELOS.leve.pronto, logosProntos]); // (os logos das equipes entram na pintura: esperam também)

// a pintura: troca a cor que vem da máscara (mapa) pelas duas cores do carro. Com `equipe` (uma das pinturas de equipe de
// f1-pintura.js) o corpo ganha, no lugar das duas cores, a folha de pintura da equipe projetada pela posição de cada ponto
// (o carbono da máscara continua preto) e o número do piloto; a folha é uma só por equipe e vem do cache.
function pintura(base, cor1, cor2, equipe, numero, fundo = false) {
  const m = base.clone(); m.color.set(0xffffff);
  const liv = equipe && folhaDaEquipe(equipe);
  m.userData.cores = { cor1: { value: new THREE.Color(cor1) }, cor2: { value: new THREE.Color(cor2) } };
  if (liv) m.userData.liv = { liv: { value: liv }, dig: { value: texturaDosDigitos() }, numero: { value: new THREE.Vector2(-1, -1) }, corNum: { value: new THREE.Color(corDoNumero(equipe)) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.cores);
    if (liv) {
      Object.assign(sh.uniforms, m.userData.liv);
      sh.vertexShader = LIV_VERT_DECL + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + LIV_VERT_MAIN);
      sh.fragmentShader = (fundo ? "#define FUNDO\n" : "") + LIV_FRAG_DECL + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>" + LIV_FRAG_MAIN);
      return;
    }
    sh.fragmentShader = "uniform vec3 cor1;\nuniform vec3 cor2;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      { vec3 mk = diffuseColor.rgb; diffuseColor.rgb = cor1 * mk.r + cor2 * mk.g + vec3(0.012) * mk.b; }`);
  };
  if (fundo) { m.metalness = 0; m.metalnessMap = null; } // o painel pintado não é metal (sem reflexo, o metal ficaria cinza)
  m.customProgramCacheKey = () => (liv ? (fundo ? "f1-livery-fundo" : "f1-livery") : "f1-pintura");
  if (liv) setNumero(m, numero);
  return m;
}
// Os slicks têm tons discretamente diferentes; só o pneu de chuva tem sulcos.
const TOM_PNEU = { macio: -0.06, medio: 0, duro: 0.05, chuva: -0.02 };
// o pneu: faixa e acabamento mudam por uniform, sem carregar textura nem recompilar
function pneuMat(base, composto) {
  const m = base.clone();
  m.roughness = 0.92; m.metalness = 0;
  m.userData.faixa = { faixa: { value: new THREE.Color(FAIXAS[composto] || "#ffffff") }, faixaOn: { value: FAIXAS[composto] ? 1 : 0 }, pneuChuva: { value: composto === "chuva" ? 1 : 0 }, pneuTom: { value: TOM_PNEU[composto] || 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.faixa);
    sh.vertexShader = PNEU_VERT_DECL + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + PNEU_VERT_MAIN);
    sh.fragmentShader = PNEU_FRAG_DECL + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>" + PNEU_FRAG_MAIN);
  };
  m.customProgramCacheKey = () => "f1-pneu";
  return m;
}
// o número do piloto (1 ou 2 dígitos) vira os dois dígitos do shader (dezena, unidade; -1 = nenhum)
function setNumero(m, n) {
  const u = m.userData.liv; if (!u) return; n = Math.floor(+n);
  if (!(n >= 0 && n <= 99)) u.numero.value.set(-1, -1); else u.numero.value.set(n >= 10 ? Math.floor(n / 10) : -1, n % 10);
}
export function coresDa(pint, corPiloto) { const p = PINTURAS[pint] || PINTURAS.propria; return [p.c || corPiloto, p.c2]; }

export function montarF1({ cor = "#e63946", cor2 = "#f4f4f4", leve = false, equipe = null, numero = null, composto = null } = {}) {
  const g = new THREE.Group(), carro = new THREE.Group(); g.add(carro);
  const k = { g, carro, rodas: [], volante: null, mats: [], pintura: null, piloto: new THREE.Object3D(), olho: { z: 0.3, y: 0.95 }, cores: [cor, cor2], equipe: equipe && temDesenho(equipe) ? equipe : null, numero, composto, pneu: null, escapamento: { z: 2.2, y: 0.42 } };
  // enquanto o modelo não chega, uma silhueta simples no lugar
  const prov = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, TAM), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5 })); prov.position.y = 0.35; prov.castShadow = true; carro.add(prov);
  k.prov = prov; k.mats.push(prov.material); k.pintura = prov.material;
  const M = k.modelo = leve ? MODELOS.leve : MODELOS.completo;
  if (M.cena) montarCorpo(k); else if (!M.falhou) M.espera.push(k);
  return k;
}
function montarCorpo(k) {
  if (k.solto) return;
  k.carro.remove(k.prov); k.prov.geometry.dispose();
  const m = k.modelo.cena.clone(true); m.updateMatrixWorld(true);
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
    // o corpo ganha os atributos da posição no carro (para a pintura de equipe); as rodas, um material só delas (o pneu com a faixa)
    const fundo = k.equipe && o.name.startsWith("McLaren_mp4_5_") && o.material.name === "bottom_details_mat"; // os painéis laterais do monocoque (e o assoalho, que a pintura deixa de carbono)
    if ((o.material.name === "body_mat" || fundo) && k.equipe) prepararCorpo(o, k.carro);
    const base = o.material, nome = o.name === "front_wheels" || o.name === "back_wheels" ? "pneu" : fundo ? "fundo" : base.name;
    if (!mats.has(nome)) mats.set(nome, nome === "body_mat" ? pintura(base, k.cores[0], k.cores[1], k.equipe, k.numero) : nome === "fundo" ? pintura(base, k.cores[0], k.cores[1], k.equipe, k.numero, true) : nome === "pneu" ? pneuMat(base, k.composto) : base.clone());
    o.material = mats.get(nome);
  });
  k.mats = [...mats.values()]; k.pintura = mats.get("body_mat") || k.mats[0]; k.pneu = mats.get("pneu") || null;
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
  montarFlap(k, m);
  k.aoMontar?.(k);
}
// O flap do DRS: a asa traseira é parte da malha do corpo, então uma placa fina de carbono na ponta da asa faz o papel do flap superior e gira
// no seu eixo da frente quando o DRS abre. Onde fica a asa (altura, largura, recuo) sai dos vértices da traseira, medidos uma vez por modelo.
function medirAsa(k, m) {
  const M = k.modelo; if (M.asa !== undefined) return M.asa;
  const v = new THREE.Vector3(), pts = []; let zmax = -1e9;
  m.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.position) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 2) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); k.carro.worldToLocal(v); pts.push(v.x, v.y, v.z); if (v.z > zmax) zmax = v.z; } });
  let ymax = -1e9; for (let i = 0; i < pts.length; i += 3) if (pts[i + 2] > zmax - 0.45 && pts[i + 1] > ymax) ymax = pts[i + 1];
  let xmax = 0, zmin = 1e9; for (let i = 0; i < pts.length; i += 3) if (pts[i + 2] > zmax - 0.8 && pts[i + 1] > ymax - 0.1) { xmax = Math.max(xmax, Math.abs(pts[i])); zmin = Math.min(zmin, pts[i + 2]); }
  return (M.asa = xmax > 0.2 && isFinite(ymax) ? { y: ymax, meia: xmax, z0: zmin, prof: Math.max(0.2, Math.min(0.5, zmax - zmin)) } : null);
}
const FLAP_GEO = new THREE.BoxGeometry(1, 0.025, 1);
function montarFlap(k, m) {
  const a = medirAsa(k, m); if (!a) return;
  const mat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.45, metalness: 0.3 }), piv = new THREE.Group();
  piv.position.set(0, a.y, a.z0 + 0.02); k.carro.add(piv);
  const placa = new THREE.Mesh(FLAP_GEO, mat); placa.scale.set(a.meia * 1.8, 1, a.prof * 0.95); placa.position.z = a.prof * 0.475; placa.castShadow = true; piv.add(placa);
  k.mats.push(mat); k.flap = piv; k.drsA = 0;
}
// a cada quadro: abre (rápido) ou fecha o flap conforme o DRS deste carro, com uma animação curta
export function animarDrs(k, aberto, dt) {
  if (!k.flap) return; const alvo = aberto ? 1 : 0; if (k.drsA === alvo) return;
  k.drsA += Math.sign(alvo - k.drsA) * Math.min(Math.abs(alvo - k.drsA), dt / 0.18); k.flap.rotation.x = -0.6 * k.drsA * k.drsA * (3 - 2 * k.drsA); // levanta a ponta de trás
}
// a posição de cada ponto da roda em relação ao eixo, em raios (1 = a borda do pneu): a faixa do composto é um anel nesse
// espaço (o shader mede o comprimento do vetor em cada pixel, então o anel sai redondo mesmo com poucos vértices)
function aroDaRoda(pos, idx) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let q = 0; q < idx.length; q++) { const x = pos.getX(idx[q]), y = pos.getY(idx[q]), z = pos.getZ(idx[q]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, R = Math.max((y1 - y0) / 2, 1e-6), cx = (x0 + x1) / 2, rx = Math.max((x1 - x0) / 2, 1e-6), a = new Float32Array(pos.count * 2), lat = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { a[i * 2] = (pos.getY(i) - cy) / R; a[i * 2 + 1] = (pos.getZ(i) - cz) / R; lat[i] = (pos.getX(i) - cx) / rx; }
  return { aro: new THREE.BufferAttribute(a, 2), lat: new THREE.BufferAttribute(lat, 1) };
}
// os atributos do corpo para a pintura de equipe: `pcar` = (x, y, s) no quadro do carro (s = distância desde a ponta do bico,
// 0 a ~4,4) e `ncar` = a normal nesse quadro; feitos uma vez por malha (as cópias do carro dividem a geometria)
function prepararCorpo(o, carro) {
  const g = o.geometry; if (g.attributes.pcar) return;
  const rel = new THREE.Matrix4().copy(carro.matrixWorld).invert().multiply(o.matrixWorld), pos = g.attributes.position, nor = g.attributes.normal;
  const n = pos.count, P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3(), w = new THREE.Vector3();
  let zmin = 1e9;
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(rel); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; if (v.z < zmin) zmin = v.z; w.fromBufferAttribute(nor, i).transformDirection(rel); N[i * 3] = w.x; N[i * 3 + 1] = w.y; N[i * 3 + 2] = w.z; }
  for (let i = 0; i < n; i++) P[i * 3 + 2] -= zmin;
  g.setAttribute("pcar", new THREE.BufferAttribute(P, 3)); g.setAttribute("ncar", new THREE.BufferAttribute(N, 3));
}
// separa a malha das duas rodas de um eixo em duas malhas (pelo lado de cada triângulo); a divisão fica guardada
const DIVISOES = new Map();
function dividirRodas(o) {
  if (!DIVISOES.has(o.geometry)) {
    const g = o.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
    const lados = [[], []], v = new THREE.Vector3(), ladoDe = (i) => v.fromBufferAttribute(pos, i).applyMatrix4(o.matrix).x;
    for (let t = 0; t < idx.length; t += 3) lados[(ladoDe(idx[t]) + ladoDe(idx[t + 1]) + ladoDe(idx[t + 2])) / 3 < 0 ? 0 : 1].push(idx[t], idx[t + 1], idx[t + 2]);
    DIVISOES.set(o.geometry, lados.map((l) => { const n = g.clone(); n.setIndex(l); n.clearGroups(); const a = aroDaRoda(pos, l); n.setAttribute("aro", a.aro); n.setAttribute("pneuLat", a.lat); return n; }));
  }
  return DIVISOES.get(o.geometry).map((geo) => { const m = new THREE.Mesh(geo, o.material); m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); m.castShadow = true; return m; });
}
// a cada quadro: as rodas giram pela distância andada, as da frente esterçam e o volante vira junto (direita = horário)
export function animarF1(k, dist, virar) {
  for (const r of k.rodas) { r.gira.rotation.x -= dist / r.r; if (r.esterca) r.esterca.rotation.y = -virar * 0.42; }
  if (k.volante) k.volante.rotation.z = -virar * 0.9;
}
// o composto que o carro está usando (macio, medio, duro, chuva; null = sem faixa): só mexe em dois uniforms, e só quando muda
export function trocarComposto(k, composto) {
  composto = composto || null; if (k.composto === composto) return; k.composto = composto;
  const u = k.pneu?.userData?.faixa; if (!u) return;
  if (FAIXAS[composto]) { u.faixa.value.set(FAIXAS[composto]); u.faixaOn.value = 1; } else u.faixaOn.value = 0;
  u.pneuChuva.value = composto === "chuva" ? 1 : 0; u.pneuTom.value = TOM_PNEU[composto] || 0;
}
export function trocarCores(k, cor1, cor2) { k.cores = [cor1, cor2]; const u = k.pintura?.userData?.cores; if (u) { u.cor1.value.set(cor1); u.cor2.value.set(cor2); } }
export function soltarF1(k) { k.solto = true; for (const m of k.mats) m.dispose(); } // a malha é a mesma para todos os carros: fica
