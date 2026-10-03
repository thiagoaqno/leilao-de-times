// Pelada da Galera — os bonecos: jogador de caixinhas (e as skins com modelo 3D), as molas do corpo "molinho",
// as poses, os carros pixelados e o boneco de pano do carrinho.
import * as THREE from "three";
import { Ragdoll } from "/ragdoll.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { C, clamp, lerp, FL, kitOf, G } from "./estado.js";
import { scene, canvasTex, M, liberar } from "./cena.js";

// ---------- desenhinho do carro (de lado, em pixel) para a escolha na sala ----------
const CAR_SIDES = { // perfis em "pixels" de 4 px: [x, y, w, h] (corpo) e janelas; rodas e faróis por cima
  godzilla: { body: [[1, 5, 16, 3], [5, 3, 8, 2], [15, 2, 3, 1], [16, 3, 1, 2]], win: [[6, 3.5, 6, 1.4]] },
  noveonze: { body: [[1, 5, 16, 3], [5, 3, 6, 2], [11, 3.5, 4, 1.5], [3, 4.4, 2, 0.6]], win: [[6, 3.4, 4.5, 1.4]] },
  cavallino: { body: [[0, 5.5, 18, 2.5], [6, 4, 5, 1.5], [14, 2.6, 4, 0.8], [16, 3.4, 1, 2]], win: [[6.5, 4.2, 3.8, 1]] },
  bimmer: { body: [[1, 4.6, 16, 3.4], [5, 2.6, 8, 2], [15, 4.2, 2, 0.5]], win: [[5.6, 3, 6.8, 1.4]] },
};
export function carPreview(model, color) {
  const c = document.createElement("canvas"); c.width = 72; c.height = 36; const x = c.getContext("2d"), u = 4, d = CAR_SIDES[model];
  x.fillStyle = color; for (const [a, b, w, hh] of d.body) x.fillRect(a * u, b * u, w * u, hh * u);
  x.fillStyle = "#1c2a36"; for (const [a, b, w, hh] of d.win) x.fillRect(a * u, b * u, w * u, hh * u);
  x.fillStyle = "#ffe08a"; x.fillRect(0, 5.4 * u, u, u); x.fillStyle = "#e53935"; x.fillRect(17 * u, 5.4 * u, u, u);
  x.fillStyle = "#151515"; for (const wx of [3.5, 13.5]) x.fillRect((wx - 1.5) * u, 6.6 * u, 3 * u, 2.4 * u);
  x.fillStyle = "#9aa0a6"; for (const wx of [3.5, 13.5]) x.fillRect((wx - 0.5) * u, 7.3 * u, u, u);
  return c.toDataURL();
}
// ---------- jogadores a pé (caixinhas com a camisa do time) ----------
const GK_KIT = { kind: "plain", c: ["#26282b"], num: "#ffffff", shorts: "#26282b" };
function shirtTex(K, num, back) {
  const c = K.c;
  return canvasTex(128, 128, (x, w, hh) => {
    if (K.kind === "vstripes") for (let i = 0; i < 8; i++) { x.fillStyle = c[i % 2]; x.fillRect(i * w / 8, 0, w / 8, hh); }
    else if (K.kind === "hstripes") for (let i = 0; i < 8; i++) { x.fillStyle = c[i % 2]; x.fillRect(0, i * hh / 8, w, hh / 8); }
    else if (K.kind === "band") { x.fillStyle = c[0]; x.fillRect(0, 0, w, hh); x.fillStyle = c[1]; x.fillRect(0, hh * 0.32, w, hh * 0.14); x.fillStyle = c[2]; x.fillRect(0, hh * 0.46, w, hh * 0.1); }
    else { x.fillStyle = c[0]; x.fillRect(0, 0, w, hh); }
    x.fillStyle = K.num; x.textAlign = "center"; x.textBaseline = "middle";
    if (back) { x.font = "bold 70px Figtree, Arial, sans-serif"; x.lineWidth = 6; x.strokeStyle = "#0004"; x.strokeText(num, w / 2, hh / 2 + 6); x.fillText(num, w / 2, hh / 2 + 6); }
    else { x.font = "bold 28px Figtree, Arial, sans-serif"; x.fillText(num, w * 0.3, hh * 0.3); }
  });
}
function nameSprite(text, color, scale = 1) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 32px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000b"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.3 * scale, 0.33 * scale, 1); s.renderOrder = 10; return s;
}
const tagColor = (kit) => (C.kitColor(kit) === "#f4f4f4" ? "#ffffff" : C.kitColor(kit));
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a77c];
const SPINE_Y = 0.85; // altura da cintura (pivô da coluna)

// ======================================================================
// Skins zoeiras. Cada skin tem um boneco de caixinhas feito aqui ("look": sempre funciona, com joelho, cotovelo,
// coluna e as molas) e, se o arquivo existir em public/pelada/modelos/, o modelo 3D de verdade (.glb/.gltf) é
// carregado com o GLTFLoader e entra no lugar. Ajustes do arquivo: scale (tamanho), yOffset (sobe/desce em relação
// ao chão) e rotationOffset (gira o modelo; a frente do jogador é -z, e a maioria dos modelos vem olhando para +z).
// A camisa continua com a cor do time, para dar para saber quem é de quem.
// ======================================================================
export const SKINS_CONFIG = {
  padrao: { arquivo: null, scale: 1, yOffset: 0, rotationOffset: 0, look: {} },
  cr7: { arquivo: "/pelada/modelos/cr7.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xd9a77c, cabelo: 0x17110c, estilo: "topete", larg: 1.1, altura: 1.04, num: 7 } },
  neymar: { arquivo: "/pelada/modelos/neymar.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xc68642, cabelo: 0xf3d36c, estilo: "moicano", larg: 0.92, num: 10 },
    queda: { push: 2 } }, // o cai-cai: no carrinho, rola o dobro (só o visual: levanta na mesma hora que os outros)
  lula: { arquivo: "/pelada/modelos/lula.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xe8b98a, cabelo: 0xdcdcdc, estilo: "calvo", barba: 0xd2d2d2, larg: 1.14, barriga: 1.2, altura: 0.95 } },
  bob_esponja: { arquivo: "/pelada/modelos/bob_esponja.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { esponja: true, altura: 0.92 } },
  levi: { arquivo: "/pelada/modelos/levi.glb", scale: 1, yOffset: 0, rotationOffset: Math.PI,
    look: { tom: 0xf3d3b0, cabelo: 0x111111, estilo: "franja", altura: 0.88, gravata: 0xf4f4f4, capa: 0x2f5233 } },
};
const hex = (c) => new THREE.Color(c).getHex();

// cria o jogador: um container (é ele que anda e gira) com o nome em cima; o visual (a skin) fica dentro
export function makePlayer(kitId, num, name, opts = {}) {
  const g = new THREE.Group();
  g.userData = { kitId, num, gk: !!opts.gk, nameLen: name.length, skin: null, pedido: 0, tag: null };
  if (name) { const tag = nameSprite((opts.gk ? "🧤 " : "") + name, tagColor(kitId)); tag.position.y = 2.15; g.add(tag); g.userData.tag = tag; }
  mudarSkinJogador(g, opts.skin);
  return g;
}

// troca a skin na hora: tira o visual antigo (liberando a memória), monta o boneco de caixinhas da skin nova e,
// se ela tiver arquivo 3D, carrega o modelo e troca quando terminar. Aceita o modelo ou o objeto que tem .model.
export function mudarSkinJogador(jogador, novoSkinId) {
  const g = jogador && jogador.isObject3D ? jogador : jogador && jogador.model;
  if (!g) return null;
  const u = g.userData, id = SKINS_CONFIG[novoSkinId] ? novoSkinId : "padrao";
  if (u.skin === id && u.body) return g;
  tirarVisual(g);
  u.skin = id; const pedido = ++u.pedido;
  montarVoxel(g, id);
  const cfg = SKINS_CONFIG[id];
  if (cfg.arquivo) pegarGLTF(cfg.arquivo).then((gltf) => {
    if (u.pedido !== pedido) { soltarGLTF(cfg.arquivo); return; } // mudou de ideia enquanto baixava
    tirarVisual(g); montarGLTF(g, id, gltf);
  }, () => {}); // sem o arquivo: fica o boneco de caixinhas (é o reserva)
  return g;
}
// tira o visual da skin do container e libera a memória (o modelo 3D é compartilhado: só devolve a "ficha")
function tirarVisual(g) {
  const u = g.userData;
  if (!u.body) return;
  g.remove(u.body);
  if (u.gltfUrl) {
    if (u.mixer) { u.mixer.stopAllAction(); u.mixer.uncacheRoot(u.inner); }
    for (const m of u.matsExtra || []) m.dispose();
    soltarGLTF(u.gltfUrl);
  } else liberar(u.body);
  for (const k of ["body", "spine", "head", "legs", "knees", "arms", "elbows", "capa", "lean", "inner", "mixer", "acRun", "acIdle", "gltfUrl", "matsExtra", "rest", "mats"]) u[k] = null;
}
// o jogador saiu de vez da cena: tira a skin e o nome
export function descartarJogador(g) {
  if (!g) return;
  g.parent?.remove(g);
  if (g.userData.skin == null) return; // carro: as texturas de pixel são compartilhadas, só tira da cena
  g.userData.pedido++; tirarVisual(g);
  if (g.userData.tag) { g.userData.tag.material.map.dispose(); g.userData.tag.material.dispose(); }
}

// ---------- modelos 3D (GLTFLoader), com cache: cada arquivo baixa uma vez e é clonado para cada jogador ----------
const gltfLoader = new GLTFLoader(), gltfCache = {};
function pegarGLTF(url) {
  const e = (gltfCache[url] ||= { users: 0, gltf: null, promise: gltfLoader.loadAsync(url).then((gl) => (e.gltf = gl)) });
  e.users++;
  return e.promise;
}
function soltarGLTF(url) {
  const e = gltfCache[url]; if (!e) return;
  if (--e.users <= 0 && e.gltf) { liberar(e.gltf.scene); delete gltfCache[url]; } // ninguém mais usa: libera
}
function montarGLTF(g, id, gltf) {
  const cfg = SKINS_CONFIG[id], u = g.userData;
  const body = new THREE.Group(), lean = new THREE.Group(), inner = cloneSkinned(gltf.scene);
  inner.scale.setScalar(cfg.scale); inner.position.y = cfg.yOffset; inner.rotation.y = cfg.rotationOffset;
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
  lean.add(inner); body.add(lean); g.add(body);
  const osso = (re) => { let b = null; inner.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  Object.assign(u, { body, lean, inner, gltfUrl: cfg.arquivo, spine: osso(/spine/i), head: osso(/head/i) });
  u.rest = { spine: u.spine && u.spine.rotation.clone(), head: u.head && u.head.rotation.clone() };
  // cores do time para o boneco de pano (o ragdoll do carrinho é de caixinhas)
  const K = u.gk ? GK_KIT : kitOf(u.kitId), pele = M(SKIN_TONES[(u.nameLen * 7 + u.num) % SKIN_TONES.length]), camisa = M(hex(K.c[0])), calcao = M(hex(K.shorts)), bota = M(0x161616);
  u.mats = { head: pele, torso: camisa, upperArm: camisa, forearm: pele, thigh: calcao, shin: calcao, boot: bota }; u.matsExtra = [pele, camisa, calcao, bota];
  // animações que vierem no arquivo (correr / parado)
  if (gltf.animations.length) {
    u.mixer = new THREE.AnimationMixer(inner);
    const clip = (re) => gltf.animations.find((a) => re.test(a.name));
    const run = clip(/run|corr|jog/i) || clip(/walk|anda/i), idle = clip(/idle|parad|stand/i);
    if (run) { u.acRun = u.mixer.clipAction(run); u.acRun.play(); }
    if (idle) { u.acIdle = u.mixer.clipAction(idle); u.acIdle.play(); }
    if (!run && !idle) u.mixer.clipAction(gltf.animations[0]).play();
  }
}

// ---------- o boneco de caixinhas de cada skin ----------
function montarVoxel(g, id) {
  const u = g.userData, L = SKINS_CONFIG[id].look || {}, bob = !!L.esponja;
  const K = u.gk ? { ...GK_KIT, num: C.kitColor(u.kitId) } : kitOf(u.kitId), num = L.num ?? u.num;
  const body = new THREE.Group(); body.scale.setScalar(L.altura || 1); g.add(body);
  const tom = bob ? 0xf5e04a : L.tom ?? SKIN_TONES[(u.nameLen * 7 + u.num) % SKIN_TONES.length];
  const skin = M(tom), shorts = M(bob ? 0x8a5a2b : hex(K.shorts)), sock = M(bob ? 0xf4f4f4 : hex(u.gk ? "#26282b" : C.kitColor(u.kitId))), boot = M(0x161616);
  const shirtC = M(bob ? 0xffffff : hex(K.c[0])), hair = M(L.cabelo ?? 0x2a1b10);
  const part = (gg, w, hh, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); gg.add(m); return m; };
  const lw = L.larg || 1, perna = bob ? 0.6 : 1; // o Bob tem perninha fina
  // pernas e braços com joelho e cotovelo (dobram na corrida, para o boneco não ficar duro)
  const legs = [], knees = [];
  for (const sx of [-0.11 * lw, 0.11 * lw]) {
    const l = new THREE.Group(); l.position.set(sx, 0.85, 0);
    part(l, 0.18 * lw, 0.3, 0.2, shorts, 0, -0.12, 0); part(l, 0.14 * perna, 0.12, 0.15 * perna, skin, 0, -0.29, 0);
    const kn = new THREE.Group(); kn.position.y = -0.3; l.add(kn);
    part(kn, 0.14 * perna, 0.2, 0.15 * perna, skin, 0, -0.08, 0); part(kn, 0.15 * (bob ? 0.8 : 1), 0.22, 0.16 * (bob ? 0.8 : 1), sock, 0, -0.36, 0); part(kn, 0.16, 0.1, 0.27, boot, 0, -0.5, -0.04);
    if (L.capa) part(l, 0.19, 0.03, 0.21, M(0x5a3a1e), 0, -0.2, 0); // cinto do equipamento de manobra (Levi)
    if (bob) part(kn, 0.13, 0.04, 0.14, M(hex(K.c[0])), 0, -0.3, 0); // faixa da meia com a cor do time
    body.add(l); legs.push(l); knees.push(kn);
  }
  // coluna ("spine"): tronco, braços e cabeça ficam num pivô na cintura, assim o tronco balança por cima das pernas
  const spine = new THREE.Group(); spine.position.y = SPINE_Y; body.add(spine);
  let front, backM, torsoMats;
  if (bob) { // a esponja: um tronco quadradão amarelo com furinhos, camisa branca e gravata da cor do time
    const pores = canvasTex(64, 64, (x, w, hh, r) => { x.fillStyle = "#f5e04a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? "#c9b52e" : "#d8c43a"; x.beginPath(); x.ellipse(r() * w, r() * hh, 2 + r() * 4, 2 + r() * 3, 0, 0, 7); x.fill(); } });
    front = new THREE.MeshStandardMaterial({ map: pores, roughness: 0.8 }); backM = front;
    torsoMats = [front, front, front, front, front, front];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.3), front); torso.position.y = 1.2 - SPINE_Y; spine.add(torso);
    part(spine, 0.63, 0.1, 0.31, shirtC, 0, 0.9 - SPINE_Y, 0); // camisa
    part(spine, 0.07, 0.16, 0.02, M(hex(K.c[0])), 0, 0.88 - SPINE_Y, -0.16); // gravata
  } else {
    front = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, false), roughness: 0.7 }); backM = new THREE.MeshStandardMaterial({ map: shirtTex(K, num, true), roughness: 0.7 });
    torsoMats = [shirtC, shirtC, shirtC, shirtC, backM, front];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46 * lw, 0.6, 0.26 * (L.barriga || 1)), torsoMats); torso.position.y = 1.16 - SPINE_Y; spine.add(torso);
    if (L.gravata) part(spine, 0.14, 0.12, 0.05, M(L.gravata), 0, 1.38 - SPINE_Y, -0.14 * (L.barriga || 1)); // a gravata (cravat) do Levi
  }
  const arms = [], elbows = [], fore = u.gk ? shirtC : skin, ombro = bob ? 0.36 : 0.3 * lw;
  for (const sx of [-ombro, ombro]) {
    const a = new THREE.Group(); a.position.set(sx, (bob ? 1.36 : 1.42) - SPINE_Y, 0);
    part(a, 0.13 * (bob ? 0.9 : 1), 0.26, 0.14, shirtC, 0, -0.12, 0);
    const el = new THREE.Group(); el.position.y = -0.25; a.add(el);
    part(el, 0.11 * perna, 0.3, 0.12 * perna, fore, 0, -0.15, 0);
    if (u.gk) part(el, 0.15, 0.13, 0.15, M(0xf5f5f5), 0, -0.35, 0);
    spine.add(a); arms.push(a); elbows.push(el);
  }
  const head = new THREE.Group(); spine.add(head);
  if (bob) { // o rosto fica na frente do tronco: olhões, nariz e o sorrisão com dois dentes
    head.position.y = 1.2 - SPINE_Y;
    const white = M(0xffffff), azul = M(0x3a8de0), preto = M(0x111111);
    for (const sx of [-0.12, 0.12]) { part(head, 0.17, 0.17, 0.06, white, sx, 0.1, -0.18); part(head, 0.08, 0.08, 0.02, azul, sx, 0.1, -0.215); part(head, 0.04, 0.04, 0.02, preto, sx, 0.1, -0.226); }
    part(head, 0.06, 0.06, 0.12, skin, 0, 0.01, -0.21);
    part(head, 0.3, 0.05, 0.02, M(0x8c1d1d), 0, -0.09, -0.155);
    for (const sx of [-0.04, 0.04]) part(head, 0.05, 0.06, 0.02, white, sx, -0.12, -0.16);
  } else {
    head.position.y = 1.46 - SPINE_Y;
    part(head, 0.26, 0.28, 0.26, skin, 0, 0.15, 0);
    part(head, 0.18, 0.04, 0.01, M(0x111111), 0, 0.18, -0.131); // sobrancelhas
    const e = L.estilo;
    if (e === "topete") { part(head, 0.28, 0.07, 0.28, hair, 0, 0.31, 0.01); const q = part(head, 0.22, 0.09, 0.12, hair, 0, 0.37, -0.08); q.rotation.x = -0.35; }
    else if (e === "moicano") { part(head, 0.28, 0.04, 0.28, M(0x2a1b10), 0, 0.3, 0); part(head, 0.08, 0.13, 0.27, hair, 0, 0.36, 0); }
    else if (e === "calvo") { // careca em cima, cabelo branco dos lados e atrás, e a barba
      for (const sx of [-0.14, 0.14]) part(head, 0.02, 0.12, 0.2, hair, sx, 0.2, 0.02); part(head, 0.28, 0.12, 0.02, hair, 0, 0.2, 0.135);
      const b = M(L.barba); part(head, 0.27, 0.11, 0.05, b, 0, 0.04, -0.12); for (const sx of [-0.135, 0.135]) part(head, 0.02, 0.16, 0.18, b, sx, 0.07, -0.03); part(head, 0.15, 0.03, 0.02, b, 0, 0.1, -0.135);
    } else if (e === "franja") { part(head, 0.28, 0.07, 0.28, hair, 0, 0.31, 0.01); for (const sx of [-0.08, 0.08]) part(head, 0.09, 0.06, 0.03, hair, sx, 0.27, -0.135); } // franja repartida no meio
    else part(head, 0.28, 0.08, 0.28, hair, 0, 0.31, 0);
  }
  let capa = null;
  if (L.capa) { capa = new THREE.Group(); capa.position.set(0, 1.44 - SPINE_Y, 0.15); part(capa, 0.5, 0.75, 0.03, M(L.capa), 0, -0.37, 0); spine.add(capa); }
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  Object.assign(u, { body, spine, head, legs, knees, arms, elbows, capa, gltfUrl: null,
    mats: { head: skin, hair: bob ? skin : hair, torso: torsoMats, upperArm: shirtC, forearm: fore, thigh: shorts, shin: sock, boot } });
}
// poses: correr, chutar, carrinho (deitado de costas), mergulho do goleiro (de lado), caído (de bruços), segurando a bola
export function animate(model, speed, dt, st, f = 0) {
  const u = model.userData, t = performance.now() / 1000;
  if (!u.legs) return animarGLTF(model, speed, dt, st, f);
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const lying = f & (FL.slide | FL.dive | FL.down);
  const sw = speed > 0.4 && !lying ? Math.sin(st.anim) * Math.min(0.9, speed / 7) : 0;
  const kick = st.kickT ? Math.sin(clamp((t - st.kickT) / 0.28, 0, 1) * Math.PI) : 0;
  u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.35);
  // o boneco olha para -z: rotation.x positivo leva perna/braço para a frente
  u.legs[1].rotation.x = kick > 0.01 ? kick * 1.3 : lerp(u.legs[1].rotation.x, (f & FL.slide) ? 0.5 : -sw, 0.35);
  const armTo = st.holding ? 1.4 : (f & FL.dive) ? 2.8 : null;
  const mola = springs(model, dt, st, lying, speed), jp = mola.jpitch.x - mola.pitch.x, jr = mola.jroll.x - mola.roll.x;
  u.arms[0].rotation.x = lerp(u.arms[0].rotation.x, (armTo ?? -sw * 0.8) + jp * 1.6, 0.35);
  u.arms[1].rotation.x = lerp(u.arms[1].rotation.x, (st.segura ? 1.35 : armTo ?? sw * 0.8) + jp * 1.6, 0.35); // segurando: braço esticado na camisa do outro
  // joelho dobra quando a perna vai para trás; cotovelo dobrado correndo; tronco inclina para a frente e balança
  const run = lying ? 0 : Math.min(1, speed / 7);
  // joelho dobra para trás (negativo) e cotovelo para a frente (positivo)
  u.knees[0].rotation.x = lerp(u.knees[0].rotation.x, (f & FL.slide) ? -1.1 : -(Math.max(0, -Math.sin(st.anim)) * 1.3 * run + 0.1 * run), 0.35);
  u.knees[1].rotation.x = lerp(u.knees[1].rotation.x, kick > 0.01 ? -0.9 * (1 - kick) : (f & FL.slide) ? -0.1 : -(Math.max(0, Math.sin(st.anim)) * 1.3 * run + 0.1 * run), 0.35);
  const elb = st.holding ? 0.6 : (f & FL.dive) ? 0 : 0.25 + 0.9 * run;
  u.elbows[0].rotation.x = lerp(u.elbows[0].rotation.x, elb, 0.3); u.elbows[1].rotation.x = lerp(u.elbows[1].rotation.x, elb, 0.3);
  poseCorpo(u.body, f, st, run);
  u.spine.rotation.x = mola.pitch.x; u.spine.rotation.z = mola.roll.x;
  // gelatina: cabeça e braços seguem a coluna com atraso (mola mais fraca), então balançam soltos e passam do ponto
  const rosto = u.skin === "bob_esponja"; // no Bob o rosto é o próprio tronco: só balança, não compensa a inclinação
  u.head.rotation.x = (rosto ? 0 : -mola.pitch.x * 0.6) + jp * (rosto ? 0.5 : 1.1); // a cabeça compensa a inclinação (olha para a frente)
  u.head.rotation.z = (rosto ? 0 : -mola.roll.x * 0.4) + jr * (rosto ? 0.5 : 1.1);
  u.arms[0].rotation.z = -0.1 * run + jr * 1.5; u.arms[1].rotation.z = 0.1 * run + jr * 1.5;
  if (u.capa) { u.capa.rotation.x = -(0.08 + 0.75 * run) + jp * 1.4; u.capa.rotation.z = jr * 1.2; } // a capa voa para trás
}
// o corpo inteiro só gira nas poses deitadas (carrinho, caído, mergulho); correndo, quem inclina é a coluna (mola)
function poseCorpo(b, f, st, run) {
  const lying = f & (FL.slide | FL.dive | FL.down);
  const tx = (f & FL.slide) ? 1.25 : (f & FL.down) ? -1.45 : 0, tz = (f & FL.dive) ? (st.diveSide || 1) * -1.35 : 0;
  b.rotation.x = lerp(b.rotation.x, tx, 0.3); b.rotation.z = lerp(b.rotation.z, tz, 0.15);
  const bob = lying ? 0 : Math.abs(Math.sin(st.anim)) * 0.06 * run;
  b.position.y = lerp(b.position.y, (f & FL.slide) ? 0.25 : (f & FL.down) ? 0.18 : (f & FL.dive) ? 0.5 : bob, 0.3);
}
// skin com modelo 3D: as mesmas molas inclinam o osso da coluna (se o modelo tiver esqueleto) ou o modelo inteiro,
// a cabeça balança atrasada, e o corpo estica e achata como gelatina a cada passada
function animarGLTF(model, speed, dt, st, f) {
  const u = model.userData, lying = f & (FL.slide | FL.dive | FL.down), run = lying ? 0 : Math.min(1, speed / 7);
  st.anim = (st.anim || 0) + dt * speed * 1.7;
  const mola = springs(model, dt, st, lying, speed), jp = mola.jpitch.x - mola.pitch.x, jr = mola.jroll.x - mola.roll.x;
  poseCorpo(u.body, f, st, run);
  if (u.spine) { u.spine.rotation.x = u.rest.spine.x + mola.pitch.x; u.spine.rotation.z = u.rest.spine.z + mola.roll.x; u.lean.rotation.set(0, 0, 0); }
  else { u.lean.rotation.x = mola.pitch.x * 0.6; u.lean.rotation.z = mola.roll.x * 0.6; } // sem esqueleto: tomba o modelo todo (pivô no pé)
  if (u.head) { u.head.rotation.x = u.rest.head.x + jp * 1.1; u.head.rotation.z = u.rest.head.z + jr * 1.1; }
  const k = SKINS_CONFIG[u.skin].scale, passo = Math.abs(Math.sin(st.anim)) * run;
  const estica = clamp(1 + 0.07 * passo - 0.3 * Math.abs(jp) - 0.04 * run, 0.8, 1.15); // estica no passo, achata no tranco
  u.inner.scale.set(k / Math.sqrt(estica), k * estica, k / Math.sqrt(estica)); // mantém o "volume"
  if (u.mixer) {
    const w = clamp(speed / 3, 0, 1);
    if (u.acRun) { u.acRun.setEffectiveWeight(u.acIdle ? w : 1); u.acRun.timeScale = u.acIdle ? Math.max(0.6, speed / 6) : speed > 0.3 ? Math.max(0.6, speed / 6) : 0; }
    if (u.acIdle) u.acIdle.setEffectiveWeight(u.acRun ? 1 - w : 1);
    u.mixer.update(dt);
  }
}

// ---------- física de mola (o boneco "molinho") ----------
// Cada jogador tem molas para a inclinação da coluna: pitch (frente/trás, rotation.x) e roll (lados, rotation.z).
// Força = (alvo - atual) * rigidez - velocidade * amortecimento; a velocidade vira rotação. Como a mola é pouco
// amortecida, o tronco passa um pouquinho do ponto e volta, como gelatina. A cabeça e os braços têm outra mola,
// mais mole, que persegue a coluna (o "jiggle").
const MOLA = { k: 15, c: 4 }, GELATINA = { k: 7, c: 2.2 };
const newSpring = () => ({ x: 0, v: 0, alvo: 0 });
function stepSpring(sp, alvo, k, c, dt) {
  sp.alvo = alvo;
  const forca = (alvo - sp.x) * k - sp.v * c;
  sp.v += forca * dt; sp.x += sp.v * dt;
  return sp.x;
}
function springs(model, dt, st, lying, speed) {
  const m = (st.mola ||= { k: MOLA.k, c: MOLA.c, pitch: newSpring(), roll: newSpring(), jpitch: newSpring(), jroll: newSpring(), vx: 0, vz: 0, fwd: 0, acc: 0, yawRate: 0 });
  const p = model.position, yaw = model.rotation.y, h = Math.max(dt, 1e-3);
  // velocidade pela diferença de posição entre os quadros (serve para mim, para os outros e para o goleiro robô)
  if (m.px == null) { m.px = p.x; m.pz = p.z; m.yaw = yaw; }
  let dx = p.x - m.px, dz = p.z - m.pz; if (dx * dx + dz * dz > 9) dx = dz = 0; // teletransporte (saída de bola): ignora
  m.px = p.x; m.pz = p.z;
  const sm = Math.min(1, dt * 10); m.vx = lerp(m.vx, dx / h, sm); m.vz = lerp(m.vz, dz / h, sm);
  // velocidade para a frente (o boneco olha para -z) e aceleração
  const fwd = m.vx * -Math.sin(yaw) + m.vz * -Math.cos(yaw);
  m.acc = lerp(m.acc, (fwd - m.fwd) / h, Math.min(1, dt * 6)); m.fwd = fwd;
  let dy = yaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw = yaw;
  m.yawRate = lerp(m.yawRate, dy / h, Math.min(1, dt * 8));
  // alvos: acelerou para a frente -> tomba para a frente; freou -> joga para trás; curva -> tomba para dentro da curva
  const run = Math.min(1, speed / 7), step = Math.sin(st.anim * 2) * 0.05 * run; // cada passada dá um tranquinho
  const pitchAlvo = lying ? 0 : -clamp(fwd * 0.028 + m.acc * 0.03, -0.3, 0.55) + step;
  const rollAlvo = lying ? 0 : clamp(m.yawRate * Math.hypot(m.vx, m.vz) * 0.025, -0.38, 0.38);
  // passos pequenos para a mola não explodir num quadro lento
  const n = Math.ceil(dt / (1 / 120)), sdt = dt / n;
  for (let i = 0; i < n; i++) {
    stepSpring(m.pitch, pitchAlvo, m.k, m.c, sdt); stepSpring(m.roll, rollAlvo, m.k, m.c, sdt);
    stepSpring(m.jpitch, m.pitch.x, GELATINA.k, GELATINA.c, sdt); stepSpring(m.jroll, m.roll.x, GELATINA.k, GELATINA.c, sdt);
  }
  return m;
}

// ---------- carros pixelados (caixinhas + texturas de pixel) ----------
const pixTex = (w, hh, draw) => canvasTex(w, hh, draw, false, true);
const TEX = {
  head: pixTex(8, 4, (x) => { x.fillStyle = "#fff6c8"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#ffe066"; x.fillRect(1, 1, 6, 2); x.fillStyle = "#ffffff"; x.fillRect(2, 1, 2, 1); }),
  tail: pixTex(8, 4, (x) => { x.fillStyle = "#7a0c0c"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#ff3030"; x.fillRect(1, 1, 6, 2); x.fillStyle = "#ffb0b0"; x.fillRect(1, 1, 2, 1); }),
  grill: pixTex(8, 4, (x) => { x.fillStyle = "#111"; x.fillRect(0, 0, 8, 4); x.fillStyle = "#444"; for (let i = 0; i < 8; i += 2) x.fillRect(i, 1, 1, 2); }),
  plate: pixTex(16, 4, (x) => { x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, 16, 4); x.fillStyle = "#1e3a8a"; x.fillRect(0, 0, 16, 1); x.fillStyle = "#222"; for (const i of [2, 4, 6, 9, 11, 13]) x.fillRect(i, 2, 1, 1); }),
  glass: pixTex(8, 8, (x) => { x.fillStyle = "#1c2a36"; x.fillRect(0, 0, 8, 8); x.fillStyle = "#3d5a73"; x.fillRect(1, 1, 2, 1); x.fillRect(5, 2, 1, 1); }),
};
const flat = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.45, ...o });
export function makeCar(model, kitId, name) {
  const paint = flat({ color: new THREE.Color(C.kitColor(kitId)), metalness: 0.25 }), accent = flat({ color: new THREE.Color(C.kitColor2(kitId)) });
  const dark = flat({ color: 0x1a1a1a }), glass = flat({ map: TEX.glass, roughness: 0.2, metalness: 0.4 }), chrome = flat({ color: 0xc9ced3, metalness: 0.8, roughness: 0.25 });
  const head = flat({ map: TEX.head, emissive: 0xfff2b0, emissiveMap: TEX.head, emissiveIntensity: 0.6 }), tail = flat({ map: TEX.tail, emissive: 0xff2020, emissiveMap: TEX.tail, emissiveIntensity: 0.8 });
  const grill = flat({ map: TEX.grill }), plate = flat({ map: TEX.plate });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const box = (w, hh, d, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; body.add(m); return m; };
  const cyl = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); body.add(m); return m; };
  if (model === "godzilla") { // GT-R R34: sedã quadrado, asa traseira, quatro lanternas redondas
    box(1.8, 0.55, 3.9, paint, 0, 0.5, 0); box(1.55, 0.45, 1.9, glass, 0, 0.98, 0.15); box(1.5, 0.07, 1.6, paint, 0, 1.22, 0.2);
    box(0.8, 0.06, 1.1, paint, 0, 0.8, -1.25); box(1.82, 0.12, 3.6, accent, 0, 0.3, 0);
    for (const x of [-0.6, 0.6]) box(0.08, 0.28, 0.14, dark, x, 0.9, 1.75);
    box(1.75, 0.07, 0.38, paint, 0, 1.06, 1.8);
    for (const x of [-0.65, -0.35, 0.35, 0.65]) cyl(0.11, 0.04, tail, x, 0.6, 1.96);
    for (const x of [-0.58, 0.58]) box(0.45, 0.13, 0.05, head, x, 0.62, -1.96);
    box(0.6, 0.13, 0.04, grill, 0, 0.55, -1.96); box(0.5, 0.13, 0.03, plate, 0, 0.35, 1.97);
  } else if (model === "noveonze") { // 911: traseira caída, faróis "de sapo", rabo de pato
    box(1.75, 0.5, 3.8, paint, 0, 0.48, 0); box(1.7, 0.16, 1.2, paint, 0, 0.74, -1.25); box(1.4, 0.36, 1.5, glass, 0, 0.9, 0.25);
    box(1.32, 0.12, 0.95, paint, 0, 1.12, 0.3); box(1.5, 0.12, 1.3, paint, 0, 0.86, 1.15, -0.38); box(1.55, 0.05, 0.28, paint, 0, 0.78, 1.86);
    for (const x of [-0.6, 0.6]) cyl(0.14, 0.12, head, x, 0.74, -1.8);
    box(1.5, 0.08, 0.04, tail, 0, 0.62, 1.91); box(1.78, 0.1, 3.5, accent, 0, 0.27, 0); box(0.5, 0.13, 0.03, plate, 0, 0.36, 1.92);
  } else if (model === "cavallino") { // F40: cunha baixa, asa enorme, tomadas de ar
    box(1.9, 0.42, 4.1, paint, 0, 0.4, 0); box(1.85, 0.1, 1.3, paint, 0, 0.64, -1.38, 0.12); box(1.35, 0.35, 1.2, glass, 0, 0.82, 0.15);
    box(1.3, 0.06, 0.9, paint, 0, 1.02, 0.15); box(1.4, 0.05, 1.2, dark, 0, 0.66, 1.2);
    for (const x of [-0.9, 0.9]) box(0.08, 0.45, 0.5, paint, x, 0.82, 1.85);
    box(1.95, 0.08, 0.42, paint, 0, 1.07, 1.88);
    for (const x of [-0.96, 0.96]) box(0.05, 0.2, 0.6, dark, x, 0.5, 0.4);
    for (const x of [-0.6, 0.6]) box(0.4, 0.06, 0.3, head, x, 0.7, -1.6);
    for (const x of [-0.7, -0.4, 0.4, 0.7]) cyl(0.1, 0.04, tail, x, 0.48, 2.06);
    box(1.92, 0.08, 3.9, accent, 0, 0.2, 0);
  } else { // M3 E30: caixote anos 80, para-lamas largos, rim duplo na grade
    box(1.75, 0.55, 3.7, paint, 0, 0.5, 0); for (const z of [-1.15, 1.15]) box(1.88, 0.3, 0.9, paint, 0, 0.48, z);
    box(1.5, 0.45, 1.6, glass, 0, 0.98, 0.2); box(1.5, 0.07, 1.4, paint, 0, 1.22, 0.25); box(1.7, 0.05, 1.0, paint, 0, 0.8, -1.3);
    box(1.6, 0.06, 0.26, dark, 0, 0.84, 1.75);
    for (const x of [-0.12, 0.12]) { box(0.2, 0.16, 0.05, chrome, x, 0.56, -1.87); box(0.14, 0.11, 0.06, grill, x, 0.56, -1.88); }
    for (const x of [-0.7, -0.42, 0.42, 0.7]) box(0.22, 0.13, 0.04, head, x, 0.58, -1.86);
    for (const x of [-0.55, 0.55]) box(0.52, 0.15, 0.04, tail, x, 0.6, 1.86);
    box(1.9, 0.08, 3.4, accent, 0, 0.3, 0); box(0.5, 0.13, 0.03, plate, 0, 0.36, 1.87);
  }
  // rodas (as da frente viram)
  const tire = flat({ color: 0x151515, roughness: 0.9 }), rim = flat({ color: 0xaab0b6, metalness: 0.7 });
  const wheels = [];
  for (const [x, z, front] of [[-0.88, -1.25, 1], [0.88, -1.25, 1], [-0.88, 1.25, 0], [0.88, 1.25, 0]]) {
    const wg = new THREE.Group(); wg.position.set(x, 0.36, z); body.add(wg);
    const spin = new THREE.Group(); wg.add(spin);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), tire); t.rotation.z = Math.PI / 2; t.castShadow = true; spin.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.31, 6), rim); r.rotation.z = Math.PI / 2; spin.add(r);
    wheels.push({ wg, spin, front });
  }
  // chama do turbo
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a, transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(0, 0.5, 2.5); flame.visible = false; body.add(flame);
  let tag = null; if (name) { tag = nameSprite(name, tagColor(kitId), 1.6); tag.position.y = 2.4; g.add(tag); }
  g.userData = { body, wheels, flame, tag, roll: 0 };
  return g;
}
export function animateCar(model, st, dt, speed, f, pitch) {
  const u = model.userData;
  u.roll = (u.roll || 0) + speed * dt / 0.36;
  for (const w of u.wheels) { w.spin.rotation.x = -u.roll; if (w.front) w.wg.rotation.y = lerp(w.wg.rotation.y, clamp(-(st.steer || 0) * 0.45, -0.45, 0.45), 0.3); }
  u.flame.visible = !!(f & FL.boost); if (u.flame.visible) u.flame.scale.setScalar(0.8 + Math.random() * 0.5);
  // mortal: uma volta inteira na direção do tranco
  const t = performance.now() / 1000;
  if ((f & FL.flip) && !st.flipAt) st.flipAt = t;
  if (!(f & FL.flip) && st.flipAt && t - st.flipAt > 0.7) st.flipAt = 0;
  const k = st.flipAt ? clamp((t - st.flipAt) / 0.6, 0, 1) : 0, ang = k * Math.PI * 2, fd = st.flipDir || [1, 0];
  u.body.rotation.set((pitch || 0) - fd[0] * ang, 0, -fd[1] * ang, "YXZ");
}

// orientação do carro: frente (fw) e cima (up) — na parede e no teto o carro fica deitado na superfície e, no ar, gira
// livre. Vai na rede como o = [fx, fy, fz, ux, uy, uz] (para os outros verem e para a bola bater certo no servidor).
export const carO = (c) => (c.fw && c.up ? [c.fw[0], c.fw[1], c.fw[2], c.up[0], c.up[1], c.up[2]] : null);
const _qY = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _mb = new THREE.Matrix4();
export function poseCar(model, x, y, z, yaw, o) {
  model.position.set(x, y, z);
  if (!o) { model.quaternion.copy(_qY.setFromAxisAngle(_up, yaw)); return; }
  _bz.set(-o[0], -o[1], -o[2]).normalize(); // o carro olha para -z
  _by.set(o[3], o[4], o[5]); _by.addScaledVector(_bz, -_by.dot(_bz)).normalize();
  _bx.crossVectors(_by, _bz); // direita = cima × trás
  model.quaternion.setFromRotationMatrix(_mb.makeBasis(_bx, _by, _bz));
}
// ---------- boneco de pano (derrubado no carrinho) ----------
export const rags = [];
export function addRag(model, x, y, z, yaw, vel, push, life) {
  const F = G.F, solid = (p, r) => { p.x = clamp(p.x, -F.L - F.goalD + r, F.L + F.goalD - r); p.z = clamp(p.z, -F.W + r, F.W - r); };
  // a perna que leva o carrinho sai do chão primeiro: empurra os pés mais que o corpo
  const rg = new Ragdoll({ scene, x, y, z, yaw, vel, mats: model.userData.mats, life, solid, push });
  rg.model = model; rags.push(rg); model.visible = false;
  for (const i of [13, 14]) rg.q[i].addScaledVector(new THREE.Vector3(push.x, 0, push.z), -1 / 60); // pés: rasteira
  if (rags.length > 8) { const o = rags.shift(); o.model.visible = true; o.dispose(); }
}
export function updateRags(dt) {
  for (let i = rags.length - 1; i >= 0; i--) { const r = rags[i]; r.model.visible = false; if (!r.step(dt)) { r.model.visible = true; r.dispose(); rags.splice(i, 1); } }
}
export function clearRags() { while (rags.length) { const r = rags.pop(); r.model.visible = true; r.dispose(); } }