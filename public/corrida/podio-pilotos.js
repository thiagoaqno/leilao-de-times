// Corrida da Galera — os pilotos da festa do pódio (podio-3d.js): corpo, capacete e as comemorações (f1/podio/, gerados por ferramentas/podio-pilotos.mjs;
// créditos e licenças em f1/podio/LICENCA.txt). Tudo baixa só quando a tela de resultado tem pódio, e `liberarPilotos` solta tudo ao sair dela.
// Sem rosto de ninguém: a cabeça do modelo original não existe aqui, só o capacete com a viseira escura. O macacão de cada equipe é pintado em f1-uniformes.js e o
// capacete usa a folha do piloto de f1-capacetes.js, com a cor mapeada pelo ponto do casco no próprio shader (o casco não tem UV).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as clonarEsqueleto } from "three/addons/utils/SkeletonUtils.js";
import { pintarFolha, capacetePorSigla } from "./f1-capacetes.js";
import { uniformeDe, pintarTraje, pintarLuvas, TAM_FOLHA } from "./f1-uniformes.js";

const PASTA = "/corrida/f1/podio/";
// a sequência de comemorações de cada degrau: [clipe, quantas vezes]. O clipe entra no meio de um movimento, com a transição.
const SEQUENCIAS = {
  1: [["vitoria", 1], ["torcida", 1]],
  2: [["vitoria2", 1], ["palmas", 3]],
  3: [["torcida", 1], ["palmas", 3], ["vitoria2", 1]],
};
const TRANSICAO = 0.4; // s
const POSE_PARADA = { 1: ["vitoria", 2.2], 2: ["vitoria2", 1.4], 3: ["torcida", 2.5] }; // com "reduzir movimento", cada um fica numa pose só
const ALTURA_M = 1.8; // a altura do boneco, sem os braços levantados

let promessa = null, base = null;
const abrir = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("sem imagem: " + u)); i.src = u; });

export function carregarPilotos() {
  return (promessa ||= Promise.all([
    new GLTFLoader().loadAsync(PASTA + "piloto.glb"), fetch(PASTA + "clipes.json").then((r) => { if (!r.ok) throw new Error("sem clipes"); return r.json(); }),
    abrir(PASTA + "traje-sombra.webp"), abrir(PASTA + "traje-mascara.webp"), abrir(PASTA + "luvas-sombra.webp"), abrir(PASTA + "luvas-mascara.webp"),
  ]).then(([gltf, json, trajeSombra, trajeMascara, luvasSombra, luvasMascara]) => {
    const clipes = {};
    for (const [nome, c] of Object.entries(json)) clipes[nome] = new THREE.AnimationClip(nome, c.dur, c.tracks.map((t) => (t.p === "q" ? new THREE.QuaternionKeyframeTrack(t.n + ".quaternion", t.t, t.v) : new THREE.VectorKeyframeTrack(t.n + ".position", t.t, t.v))));
    base = {
      cena: gltf.scene, clipes, folhas: { trajeSombra, trajeMascara, luvasSombra, luvasMascara },
      fixos: { // os materiais iguais em todo mundo
        hans: new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.55, metalness: 0.2 }),
        metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.85 }),
        viseira: new THREE.MeshStandardMaterial({ color: 0x050709, roughness: 0.08, metalness: 0.9 }),
      },
    };
    return base;
  }).catch((e) => { promessa = null; throw e; }));
}

// o casco sem UV: a folha do capacete (x em volta da cabeça, com a frente em 3/4; y da coroa ao queixo) é lida pelo ponto do casco na pose de repouso
function materialDoCasco(geo, textura) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, m = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.28, metalness: 0.05 });
  const centro = b.getCenter(new THREE.Vector3());
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCentro = { value: centro }; sh.uniforms.uAlt = { value: new THREE.Vector2(b.max.y, b.max.y - b.min.y) };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPCasco;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvPCasco = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vPCasco;\nuniform vec3 uCentro;\nuniform vec2 uAlt;")
      .replace("#include <map_fragment>", `vec3 pc = vPCasco - uCentro;
      vec2 uvc = vec2(fract(0.75 + atan(pc.x, pc.z) / 6.2831853), 1.0 - (uAlt.x - vPCasco.y) / uAlt.y);
      diffuseColor *= texture2D(map, uvc);`);
  };
  m.customProgramCacheKey = () => "casco-podio";
  return m;
}

const hexOk = (c, sn) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : sn);
// um piloto: { g, atualizar(dt), soltar() }. `it`: { pos, equipe, corEquipe, cor, numero, sigla, logo (imagem) }; o bloco custa uns poucos ms (três telas de canvas)
export function criarPilotoPodio(it, parado) {
  if (!base) throw new Error("carregarPilotos primeiro");
  const g = clonarEsqueleto(base.cena), u = uniformeDe(it.equipe, hexOk(it.corEquipe, hexOk(it.cor, "#e10600")));
  const texturas = [], mats = [];
  const tex = (canvas, flip) => { const t = new THREE.CanvasTexture(canvas); t.flipY = flip; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texturas.push(t); return t; };
  const cT = document.createElement("canvas"); cT.width = cT.height = TAM_FOLHA; pintarTraje(cT, u, base.folhas, { numero: it.numero, logo: it.logo });
  const cL = document.createElement("canvas"); cL.width = 256; cL.height = 128; pintarLuvas(cL, u, base.folhas);
  const cC = document.createElement("canvas"); cC.width = 512; cC.height = 256;
  const capDoRobo = it.sigla ? capacetePorSigla(it.sigla) : null;
  pintarFolha(cC.getContext("2d"), capDoRobo ? capDoRobo.cores : [u.base, u.faixa, u.lado || "#ffffff"], capDoRobo ? capDoRobo.desenho : "generico", it.numero);
  const tC = tex(cC, true); tC.minFilter = THREE.LinearFilter; tC.generateMipmaps = false; // (sem mipmap: o atan do shader deixaria uma costura)
  const trajeM = new THREE.MeshStandardMaterial({ map: tex(cT, false), roughness: 0.62 }), luvasM = new THREE.MeshStandardMaterial({ map: tex(cL, false), roughness: 0.6 });
  mats.push(trajeM, luvasM);
  const ossos = {};
  let cascoM = null; // o forro (vedacao) usa a mesma pintura: os furinhos da redução do casco não aparecem
  g.traverse((o) => { if (o.isSkinnedMesh && o.name === "casco") { cascoM = materialDoCasco(o.geometry, tC); mats.push(cascoM); } });
  g.traverse((o) => {
    if (o.isBone) ossos[o.name] = o;
    if (!o.isSkinnedMesh) return;
    o.frustumCulled = false; o.castShadow = false;
    if (o.name === "traje") o.material = trajeM;
    else if (o.name === "luvas") o.material = luvasM;
    else if (o.name === "casco" || o.name === "vedacao") o.material = cascoM;
    else if (base.fixos[o.name]) o.material = base.fixos[o.name];
  });
  const mixer = new THREE.AnimationMixer(g), seq = SEQUENCIAS[it.pos] || SEQUENCIAS[3];
  let i = 0, ativo = null, falta = 0;
  const tocar = (entra) => {
    const [nome, vezes] = seq[i % seq.length], a = mixer.clipAction(base.clipes[nome]);
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.play();
    if (ativo && ativo !== a) { a.crossFadeFrom(ativo, entra, false); } else a.setEffectiveWeight(1);
    ativo = a; falta = base.clipes[nome].duration * vezes; i++;
  };
  if (parado) { const [nome, t] = POSE_PARADA[it.pos] || POSE_PARADA[3], a = mixer.clipAction(base.clipes[nome]); a.play(); mixer.setTime(t); a.paused = true; }
  else { tocar(0); mixer.update(it.pos * 0.27); } // cada um num tempo
  return {
    g, ossos,
    atualizar(dt) {
      if (parado) return;
      falta -= dt;
      if (falta <= TRANSICAO && seq.length > 1) tocar(TRANSICAO);
      mixer.update(dt);
    },
    soltar() { mixer.stopAllAction(); mixer.uncacheRoot(g); mats.forEach((m) => m.dispose()); texturas.forEach((t) => t.dispose()); g.removeFromParent(); },
  };
}
export const alturaDoPiloto = ALTURA_M;

// sai da tela: solta as geometrias e os materiais que todo mundo divide (na próxima festa, o navegador pega do cache)
export function liberarPilotos() {
  if (!base) { promessa = null; return; }
  base.cena.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); o.material?.dispose?.(); o.skeleton?.dispose?.(); } });
  Object.values(base.fixos).forEach((m) => m.dispose());
  base = null; promessa = null;
}
