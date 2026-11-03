// Corrida da Galera — o carro de Fórmula 1 (public/corrida/f1/f1.glb, CC0). A pintura do modelo é uma máscara: o que
// é vermelho na textura recebe a cor principal, o que é verde recebe a secundária e o azul fica preto. Assim cada carro
// tem a pintura escolhida (as de equipe, em PINTURAS, ou a cor do piloto com branco). Medidas em metros; a frente é −z
// (a mesma convenção do kart antigo, então quem usa só troca a escala).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { temDesenho, folhaDaEquipe, corDoNumero, texturaDosDigitos, logosProntos, FAIXAS, aroDaRoda,
  LIV_VERT_DECL, LIV_VERT_MAIN, LIV_FRAG_DECL, LIV_FRAG_MAIN, SOL_FRAG_DECL, SOL_FRAG_MAIN, PNEU_VERT_DECL, PNEU_VERT_MAIN, PNEU_FRAG_DECL, PNEU_FRAG_MAIN } from "./f1-pintura.js";
import { construir2026 } from "./f1-2026.js";

// combinações de cor das equipes de F1 (ficam em pistas.js: o servidor confere a escolha)
export const PINTURAS = window.Pistas.MODS.pintura;
export const TAM = 4.35; // comprimento do modelo, em metros (todo modelo é posto nesta medida: a física e as câmeras não mudam)

// Os carros por ano: cada um tem o modelo completo (o seu carro e a garagem) e um leve, com bem menos triângulos (os carros dos outros).
// `construir` (só os modelos novos) transforma o arquivo em poucas peças prontas (f1-2026.js); sem ele é o carro clássico, de pintura em máscara.
// Para a sala escolher o ano: `usarModelo(2026)` antes de montar os carros (o padrão da corrida é o 2026; `?carro=classico` na página força o antigo).
export const MODELOS = {
  2026: { nome: "Audi R26 (2026)", carro: "/corrida/f1/2026/carro.glb", leve: "/corrida/f1/2026/carro-leve.glb", construir: construir2026 },
  classico: { nome: "Clássico 88", carro: "/corrida/f1/f1.glb", leve: "/corrida/f1/f1-leve.glb" },
};
export const MODELO_PADRAO = 2026;
let atual = (() => { try { const q = new URLSearchParams(location.search).get("carro"); return q && MODELOS[q] ? q : MODELO_PADRAO; } catch (e) { return MODELO_PADRAO; } })();
const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
const CARGAS = new Map(); // "modelo|leve" -> { cena, dados, falhou, espera, pronto }: cada arquivo carrega uma vez, e só quando alguém pede
function carga(id, leve) {
  const chave = id + (leve ? "|leve" : ""); if (CARGAS.has(chave)) return CARGAS.get(chave);
  const def = MODELOS[id], arq = leve ? def.leve : def.carro, M = { id, def, leve, cena: null, dados: null, falhou: false, espera: [] };
  M.pronto = gl.loadAsync(arq).then((g) => {
    if (def.construir) M.dados = def.construir(g.scene, TAM, leve);
    M.cena = g.scene; for (const k of M.espera.splice(0)) montarCorpo(k);
  }).catch((e) => { M.falhou = true; console.warn("Corrida: o carro não carregou", arq, e); });
  CARGAS.set(chave, M); return M;
}
export const modeloAtual = () => atual;
export function usarModelo(id) { if (MODELOS[id]) atual = id; }
export const f1Pronto = Promise.all([carga(atual, false).pronto, carga(atual, true).pronto, logosProntos]); // (os logos das equipes entram na pintura: esperam também)

// a pintura: troca a cor que vem da máscara (mapa) pelas duas cores do carro. Com `equipe` (uma das pinturas de equipe de
// f1-pintura.js) o corpo ganha, no lugar das duas cores, a folha de pintura da equipe projetada pela posição de cada ponto
// (o carbono da máscara continua preto) e o número do piloto; a folha é uma só por equipe e vem do cache.
// `novo` (o carro de 2026, f1-2026.js): `base` é o material do carbono (sem textura) e `numPos` onde ficam os números; sem equipe, a cor principal em tudo
function pintura(base, cor1, cor2, equipe, numero, fundo = false, novo = false, numPos = null) {
  const m = base.clone(); if (!novo) m.color.set(0xffffff);
  const liv = equipe && folhaDaEquipe(equipe);
  m.userData.cores = { cor1: { value: new THREE.Color(cor1) }, cor2: { value: new THREE.Color(cor2) } };
  if (liv) m.userData.liv = { liv: { value: liv }, dig: { value: texturaDosDigitos() }, numero: { value: new THREE.Vector2(-1, -1) }, corNum: { value: new THREE.Color(corDoNumero(equipe)) }, numPos: { value: new THREE.Vector4(...(numPos || [3.2, 0.55, 4.275, 0.72])) } };
  const def = novo ? "#define NOVO\n" : "";
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.cores);
    if (liv) {
      Object.assign(sh.uniforms, m.userData.liv);
      sh.vertexShader = def + LIV_VERT_DECL + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + LIV_VERT_MAIN);
      sh.fragmentShader = def + (fundo ? "#define FUNDO\n" : "") + LIV_FRAG_DECL + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>" + LIV_FRAG_MAIN);
      return;
    }
    if (novo) {
      sh.vertexShader = def + LIV_VERT_DECL + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + LIV_VERT_MAIN);
      sh.fragmentShader = SOL_FRAG_DECL + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>" + SOL_FRAG_MAIN);
      return;
    }
    sh.fragmentShader = "uniform vec3 cor1;\nuniform vec3 cor2;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      { vec3 mk = diffuseColor.rgb; diffuseColor.rgb = cor1 * mk.r + cor2 * mk.g + vec3(0.012) * mk.b; }`);
  };
  if (fundo) { m.metalness = 0; m.metalnessMap = null; } // o painel pintado não é metal (sem reflexo, o metal ficaria cinza)
  m.customProgramCacheKey = () => (novo ? (liv ? "f1-novo-livery" : "f1-novo-solido") : liv ? (fundo ? "f1-livery-fundo" : "f1-livery") : "f1-pintura");
  if (liv) setNumero(m, numero);
  return m;
}
// Os slicks têm tons discretamente diferentes; só o pneu de chuva tem sulcos.
const TOM_PNEU = { macio: -0.06, medio: 0, duro: 0.05, chuva: -0.02 };
// o pneu: faixa e acabamento mudam por uniform, sem carregar textura nem recompilar
function pneuMat(base, composto, depois = "map_fragment") {
  const m = base.clone();
  m.roughness = 0.92; m.metalness = 0;
  m.userData.faixa = { faixa: { value: new THREE.Color(FAIXAS[composto] || "#ffffff") }, faixaOn: { value: FAIXAS[composto] ? 1 : 0 }, pneuChuva: { value: composto === "chuva" ? 1 : 0 }, pneuTom: { value: TOM_PNEU[composto] || 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.faixa);
    sh.vertexShader = PNEU_VERT_DECL + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + PNEU_VERT_MAIN);
    // (o carro de 2026 pinta a roda com cor por vértice, que entra em color_fragment: a faixa tem de vir depois dela)
    sh.fragmentShader = PNEU_FRAG_DECL + sh.fragmentShader.replace(`#include <${depois}>`, `#include <${depois}>` + PNEU_FRAG_MAIN);
  };
  m.customProgramCacheKey = () => "f1-pneu" + depois;
  return m;
}
// o número do piloto (1 ou 2 dígitos) vira os dois dígitos do shader (dezena, unidade; -1 = nenhum)
function setNumero(m, n) {
  const u = m.userData.liv; if (!u) return; n = n == null ? NaN : Math.floor(+n);
  if (!(n >= 0 && n <= 99)) u.numero.value.set(-1, -1); else u.numero.value.set(n >= 10 ? Math.floor(n / 10) : -1, n % 10);
}
export function coresDa(pint, corPiloto) { const p = PINTURAS[pint] || PINTURAS.propria; return [p.c || corPiloto, p.c2]; }

export function montarF1({ cor = "#e63946", cor2 = "#f4f4f4", leve = false, equipe = null, numero = null, composto = null, modelo = atual, volanteVivo = false } = {}) {
  const g = new THREE.Group(), carro = new THREE.Group(); g.add(carro);
  const k = { g, carro, rodas: [], volante: null, mats: [], pintura: null, piloto: new THREE.Object3D(), olho: { z: 0.3, y: 0.95 }, cores: [cor, cor2], equipe: equipe && temDesenho(equipe) ? equipe : null, numero, composto, volanteVivo, pneu: null, escapamento: { z: 2.2, y: 0.42 } };
  // enquanto o modelo não chega, uma silhueta simples no lugar
  const prov = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, TAM), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5 })); prov.position.y = 0.35; prov.castShadow = true; carro.add(prov);
  k.prov = prov; k.mats.push(prov.material); k.pintura = prov.material;
  const M = k.modelo = carga(MODELOS[modelo] ? modelo : atual, leve);
  if (M.cena) montarCorpo(k); else if (!M.falhou) M.espera.push(k);
  return k;
}
// o carro de 2026: as peças já vêm prontas de f1-2026.js (no quadro do carro); aqui cada uma ganha o seu material e, onde gira, o pivô
function montarCorpoNovo(k) {
  const D = k.modelo.dados, num = k.numero;
  k.carro.remove(k.prov); k.prov.geometry.dispose();
  const mats = new Map(), M = (nome, f) => { if (!mats.has(nome)) mats.set(nome, f()); return mats.get(nome); };
  const dupla = (m) => { m.side = THREE.DoubleSide; return m; };
  const carbono = () => dupla(new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.34, metalness: 0.1 }));
  const mat = {
    corpo: () => M("corpo", () => pintura(carbono(), k.cores[0], k.cores[1], k.equipe, num, false, true, D.numPos)),
    detalhes: () => M("detalhes", () => { const m = D.mats.sauber_detail.clone(); m.metalness = Math.min(m.metalness, 0.4); return m; }),
    mecanica: () => M("mecanica", () => { const m = D.mats.generics.clone(); m.metalness = Math.min(m.metalness, 0.4); return m; }),
    miudezas: () => M("miudezas", () => dupla(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25 }))),
    luz: () => M("luz", () => { const m = D.mats.rear_light_2.clone(); m.metalness = 0; return m; }),
    volante: () => M("volante", () => { const m = D.mats.audi_steeringwheel.clone(); m.metalness = 0; return m; }),
    roda: () => M("roda", () => pneuMat(new THREE.MeshStandardMaterial({ vertexColors: true }), k.composto, "color_fragment")),
  };
  const peca = (nome, geo, material, pai = k.carro) => { const o = new THREE.Mesh(geo, material); o.name = nome; o.castShadow = true; o.receiveShadow = false; pai.add(o); return o; };
  peca("corpo", D.corpo, mat.corpo());
  if (D.detalhes) peca("detalhes", D.detalhes, mat.detalhes());
  if (D.mecanica) peca("mecanica", D.mecanica, mat.mecanica());
  if (D.miudezas) peca("miudezas", D.miudezas, mat.miudezas());
  // (a luz traseira pronta do modelo não aparece: a do carro é a lanterna do jogo, carros.js, a mesma de sempre, só que no lugar desta)
  // o piloto (o que o modelo tem dele): fica num grupo que a câmera de cockpit esconde (cameras.js: `kart.roof` é `k.piloto`) e as outras mostram
  k.espelhos = D.espelhos || null; // onde ficam os retrovisores (espelhos.js os faz funcionar no carro do jogador)
  if (D.piloto) { k.carro.add(k.piloto); peca("piloto", D.piloto, mat.miudezas(), k.piloto); }
  // o flap da asa traseira: gira na dobradiça com o DRS (a mesma pintura do corpo)
  if (D.flap) { const piv = new THREE.Group(); piv.position.copy(D.flap.pos); k.carro.add(piv); peca("flap", D.flap.geo, mat.corpo(), piv); k.flap = piv; k.drsA = 0; k.drsMax = D.drs; }
  // as rodas: cada uma inteira (pneu, aro e disco); "gira" roda pela distância andada e, nas da frente, "esterca" vira com o volante
  for (const r of D.rodas) {
    // o pivô fica no centro do cubo: `esterca` (só as da frente: vira em torno do eixo vertical) > `camber` (a inclinação fixa da roda no carro) > `gira` (rola em torno do eixo X da roda)
    const esterca = new THREE.Group(); esterca.position.copy(r.centro); k.carro.add(esterca);
    const camber = new THREE.Group(); if (r.camber) camber.quaternion.copy(r.camber); esterca.add(camber);
    const gira = new THREE.Group(); camber.add(gira); peca("roda", r.geo, mat.roda(), gira);
    k.rodas.push({ gira, esterca: r.frente ? esterca : null, r: r.r });
  }
  // o volante (com as luzes e os mostradores): vira em torno do eixo z
  if (D.volante) {
    const piv = new THREE.Group(); piv.position.copy(D.volante.centro); k.carro.add(piv); k.volante = piv;
    peca("volante", D.volante.geo, mat.volante(), piv); if (D.volanteDet) peca("volante-det", D.volanteDet, mat.miudezas(), piv);
    // a tela e as luzes de troca do volante: só o carro do jogador (op.volante) tem textura e liga; nos outros ficam apagadas e paradas
    const volanteVivo = k.volanteVivo;
    if (D.tela) {
      const mt = new THREE.MeshBasicMaterial({ color: 0x050607, toneMapped: false, side: THREE.DoubleSide }); mats.set("tela", mt); peca("tela", D.tela.geo, mt, piv);
      k.tela = { mat: mt, cv: null, tex: null, ult: "", prox: 0, cargaAnt: 0, colheAte: 0 };
      if (volanteVivo) iniciarTela(k.tela);
    }
    if (D.leds) {
      const mt = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }); mats.set("leds", mt); const o = peca("leds", D.leds.geo, mt, piv); o.castShadow = false;
      k.leds = { geo: D.leds.geo, n: -1 }; apagarLeds(k.leds);
    }
    k.olho = { z: D.volante.centro.z + D.olho.dz, y: D.volante.centro.y + D.olho.dy }; k.olhoBaixo = D.olho.baixo || 0; // atrás do volante, na altura do capacete
  }
  k.mats = [...mats.values()]; k.pintura = mats.get("corpo"); k.pneu = mats.get("roda") || null;
  k.lanternaPos = D.lanterna || null; k.escapamento = D.escapamento; k.disco = D.disco;
  k.aoMontar?.(k);
}
function montarCorpo(k) {
  if (k.solto) return;
  if (k.modelo.dados) return montarCorpoNovo(k);
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
  k.drsA += Math.sign(alvo - k.drsA) * Math.min(Math.abs(alvo - k.drsA), dt / 0.18); k.flap.rotation.x = -(k.drsMax || 0.6) * k.drsA * k.drsA * (3 - 2 * k.drsA); // levanta a ponta de trás
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
// ---------- o volante do carro do jogador (só ele, só na câmera de cockpit): a tela do meio e as 15 luzes de troca ----------
const TELA_W = 256, TELA_H = 144, LED_COR = { g: [0.1, 0.9, 0.3], r: [1, 0.16, 0.1], b: [0.18, 0.48, 1], off: [0.07, 0.075, 0.085] };
function iniciarTela(T) {
  const cv = document.createElement("canvas"); cv.width = TELA_W; cv.height = TELA_H; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  T.cv = cv; T.tex = tex; T.mat.map = tex; T.mat.color.set(0xffffff); T.mat.needsUpdate = true; desenharTela(T, { marcha: "N", kmh: 0, bateria: 0, modo: "BALANCED", drs: 0 });
}
function apagarLeds(L) { pintarLeds(L, 0); }
// acende as n primeiras luzes (da esquerda para a direita; as mesmas faixas de cor do mostrador do HUD: verde, vermelho e azul)
function pintarLeds(L, n) {
  if (L.n === n) return; L.n = n; const g = L.geo, c = g.attributes.color, idx = g.userData.led;
  for (let i = 0; i < c.count; i++) { const k = idx[i], v = k >= n ? LED_COR.off : LED_COR[k < N_LEDS_PK * 0.45 ? "g" : k < N_LEDS_PK * 0.8 ? "r" : "b"]; c.setXYZ(i, v[0], v[1], v[2]); }
  c.needsUpdate = true;
}
const N_LEDS_PK = 15;
function desenharTela(T, d) {
  const x = T.cv.getContext("2d"), W = TELA_W, H = TELA_H;
  x.fillStyle = "#06080b"; x.fillRect(0, 0, W, H);
  // marcha grande, à esquerda
  x.textBaseline = "middle"; x.textAlign = "center"; x.fillStyle = "#ffffff"; x.font = "900 96px 'Arial Black', Arial, sans-serif"; x.fillText(String(d.marcha), 52, 64);
  // velocidade, à direita
  x.textAlign = "right"; x.font = "900 58px 'Arial Black', Arial, sans-serif"; x.fillText(String(d.kmh), W - 12, 54);
  x.fillStyle = "#8d96a3"; x.font = "700 18px Arial, sans-serif"; x.fillText("KM/H", W - 12, 92);
  // DRS: apagado, pronto (âmbar) ou aberto (verde)
  x.textAlign = "center"; x.fillStyle = d.drs === 2 ? "#18c060" : d.drs === 1 ? "#e0a020" : "#2a2f37"; x.beginPath(); x.roundRect(8, 8, 62, 26, 5); x.fill();
  x.fillStyle = d.drs ? "#06080b" : "#7b8492"; x.font = "800 17px Arial, sans-serif"; x.fillText("DRS", 39, 22);
  // bateria do ERS
  const b = Math.max(0, Math.min(1, d.bateria)), cor = d.modo === "OVERTAKE" ? "#ff4fd8" : b < 0.2 ? "#ff3b30" : b < 0.5 ? "#ffb020" : "#27d46a";
  x.fillStyle = "#1a1f26"; x.fillRect(10, 112, 150, 16); x.fillStyle = cor; x.fillRect(10, 112, 150 * b, 16);
  x.textAlign = "left"; x.fillStyle = "#8d96a3"; x.font = "700 15px Arial, sans-serif"; x.fillText("BATT " + Math.round(b * 100) + "%", 10, 102);
  x.textAlign = "right"; x.fillStyle = cor; x.font = "800 17px Arial, sans-serif"; x.fillText(d.modo, W - 10, 120);
  T.tex.needsUpdate = true;
}
// d: { marcha, kmh, rpm (0 a 1), bateria (0 a 1), ersAtivo, drsAberto, drsPronto }. A tela só se refaz quando algo muda e no máximo a ~12 quadros por segundo.
export function atualizarVolante(k, d, agora = performance.now()) {
  if (k.leds) pintarLeds(k.leds, Math.round(Math.max(0, Math.min(1, d.rpm)) * N_LEDS_PK));
  const T = k.tela; if (!T || !T.cv || agora < T.prox) return;
  if (d.bateria > T.cargaAnt + 0.0004) T.colheAte = agora + 400; T.cargaAnt = d.bateria; // recarregando (frear ou tirar o pé)
  const modo = d.ersAtivo ? "OVERTAKE" : agora < T.colheAte ? "HARVEST" : "BALANCED", drs = d.drsAberto ? 2 : d.drsPronto ? 1 : 0;
  const chave = d.marcha + "|" + d.kmh + "|" + Math.round(d.bateria * 100) + "|" + modo + "|" + drs;
  if (chave === T.ult) return; T.ult = chave; T.prox = agora + 80;
  desenharTela(T, { marcha: d.marcha, kmh: d.kmh, bateria: d.bateria, modo, drs });
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
