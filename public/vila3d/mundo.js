// A Vila em 3D (o desenho; a lógica de andar, entrar nos jogos e jogar online continua em public/index.html).
// 1 casa do mapa = 1 unidade; x para a direita, z para baixo; a câmera olha para o norte (cima do mapa), então as teclas e o
// toque funcionam como no mapa 2D. Peças do KayKit City Builder Bits (CC0), cada módulo mede 2x2 casas.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makePlayer, animate, descartarJogador } from "/pelada/bonecos.js";

const NOMES = ["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => "building_" + l + "_withoutBase").concat([
  "road_straight", "road_junction", "road_tsplit", "streetlight", "bench", "bush", "car_hatchback", "car_police", "car_sedan", "car_stationwagon", "car_taxi"]);
const hash = (x, y, i = 0) => { let n = (x * 374761393 + y * 668265263 + i * 1274126177) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0); };
const hashS = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const ESCALA_BONECO = 0.72; // o boneco da Pelada mede ~1,8 m: aqui ele fica com uns 1,3 casas de altura (o prédio de um andar tem ~2)
const COR_CHAO = { g: "#6cb35a", f: "#6cb35a", t: "#4f9a46", r: "#8d8677", p: "#d9cfb8", q: "#b8553a", a: "#4e535b", m: "#7a5a3a", e: "#3b3e45", E: "#6b6f77", c: "#bdb8a8", w: "#3a7fc0", s: "#e8d59a", j: "#55a257", l: "#9b7a52" };

export async function criar(W) {
  const { MW, MH, OX, OY, VW, VH, ground } = W;
  const dom = document.createElement("canvas");
  dom.id = "cv3"; dom.setAttribute("aria-hidden", "true");
  document.body.insertBefore(dom, document.getElementById("cv"));
  const renderer = new THREE.WebGLRenderer({ canvas: dom, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const COR_HORIZONTE = 0x86b5cc;
  scene.background = new THREE.Color(COR_HORIZONTE);
  scene.fog = new THREE.Fog(COR_HORIZONTE, 70, 150);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 700);
  // o céu: uma cúpula com o degradê do horizonte ao azul, o sol com brilho e nuvens que andam devagar (feito aqui, sem imagem)
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { tempo: { value: 0 }, sol: { value: new THREE.Vector3(-0.42, 0.62, 0.38).normalize() } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vP; uniform float tempo; uniform vec3 sol;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rr(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, v = 0.0; for (int i = 0; i < 5; i++){ v += a * rr(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vP); float y = max(d.y, 0.0);
        vec3 hor = vec3(0.706, 0.863, 0.961), alto = vec3(0.16, 0.45, 0.85);
        vec3 c = mix(hor, alto, pow(y, 0.55));
        float s = max(dot(d, sol), 0.0);
        c += vec3(1.0, 0.92, 0.72) * (pow(s, 600.0) * 2.0 + pow(s, 24.0) * 0.28);
        vec2 uv = d.xz / (d.y + 0.2) * 1.3 + vec2(tempo * 0.004, tempo * 0.0015);
        float n = fbm(uv * 1.4); float nuvem = smoothstep(0.52, 0.8, n) * smoothstep(0.02, 0.22, d.y);
        c = mix(c, vec3(1.0), nuvem * 0.9);
        c = mix(c, hor, smoothstep(0.0, -0.05, d.y)); // abaixo do horizonte, a cor da névoa
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  ceu.renderOrder = -10; ceu.frustumCulled = false; scene.add(ceu);
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x7a9a5a, 1.15));
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 120 });
  sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...o });
  const caixa = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };

  // ---------- os modelos ----------
  const M = {};
  const gl = new GLTFLoader();
  // o céu pintado (SD_Sky de ritsuka, CC BY 4.0, public/vila3d/ceu/): a esfera do modelo, sem o macaco que vem junto, seguindo a câmera
  let ceuImg = null;
  gl.loadAsync("/vila3d/ceu/sd_sky_230315a.glb").then((g) => {
    const lixo = []; g.scene.traverse((o) => { if (o.name === "Suzanne_2") lixo.push(o); });
    for (const o of lixo) o.parent.remove(o);
    g.scene.traverse((o) => { if (o.isMesh) { const t = o.material.emissiveMap; o.material = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: false, depthWrite: false, toneMapped: false }); o.frustumCulled = false; o.renderOrder = -9; } });
    g.scene.updateMatrixWorld(true);
    const r = new THREE.Box3().setFromObject(g.scene).getBoundingSphere(new THREE.Sphere()).radius;
    ceuImg = new THREE.Group(); ceuImg.add(g.scene); ceuImg.scale.setScalar(480 / r);
    ceu.visible = false; scene.add(ceuImg);
  }).catch(() => { /* fica o céu de degradê */ });
  await Promise.all(NOMES.map((n) => gl.loadAsync("/vila3d/kaykit/" + n + ".gltf").then((g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    M[n] = g.scene;
  })));
  const usa = (n, x, z, giro = 0, esc = 1, pai = scene) => { const o = M[n].clone(true); o.position.set(x, 0, z); o.rotation.y = giro; o.scale.setScalar(esc); pai.add(o); return o; };

  // ---------- o chão do mapa inteiro, numa textura só ----------
  {
    const P = 4, c = document.createElement("canvas"); c.width = MW * P; c.height = MH * P;
    const g = c.getContext("2d");
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const t = ground[y][x]; let cor = COR_CHAO[t] || COR_CHAO.g;
      if ((t === "g" || t === "f" || t === "j") && hash(x, y, 3) % 4 === 0) cor = t === "j" ? "#4f9b52" : "#68ae57";
      g.fillStyle = cor; g.fillRect(x * P, y * P, P, P);
      if (t === "f") { g.fillStyle = ["#ffd54a", "#ff7ab0", "#ffffff"][hash(x, y) % 3]; g.fillRect(x * P + 1 + hash(x, y, 1) % 2, y * P + 1 + hash(x, y, 2) % 2, 1, 1); }
    }
    for (const j of W.GAMES) if (j.npc) for (const [mx, my] of j.mats) { g.fillStyle = COR_CHAO[ground[my][mx - 1]] || COR_CHAO.p; g.fillRect(mx * P, my * P, P, P); } // o treinador não tem capacho
    for (let y = 0; y < MH - 1; y++) for (let x = 0; x < MW - 1; x++) { // a faixa do meio das rodovias
      if (ground[y][x] !== "e") continue;
      const r = W.rumo[y][x];
      if (r === "h" && ground[y + 1][x] === "e" && W.rumo[y + 1][x] === "h") { g.fillStyle = "#d8c23a"; g.fillRect(x * P, y * P + P - 1, P, 1); }
      if (r === "v" && ground[y][x + 1] === "e" && W.rumo[y][x + 1] === "v") { g.fillStyle = "#d8c23a"; g.fillRect(x * P + P - 1, y * P, 1, P); }
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(MW / 2, 0, MH / 2); chao.receiveShadow = true; scene.add(chao);
  }

  // ---------- as ruas da vila (módulos de 2x2; células em x par e y ímpar, contando a partir da vila) ----------
  const ehRua = (x, y) => { const gx = x + OX, gy = y + OY; return x >= 0 && y >= 0 && x < VW && y < VH + 1 && gy < MH && "ra".includes(ground[gy][gx]); };
  const celula = (x0, y0) => ehRua(x0, y0) || ehRua(x0 + 1, y0) || ehRua(x0, y0 + 1) || ehRua(x0 + 1, y0 + 1);
  const GIRO_T = { N: 0, E: 0, S: 0, W: 0 }; // quanto girar o T para a abertura certa (calibrado olhando a cena)
  for (let y0 = 1; y0 < VH + 2; y0 += 2) for (let x0 = 0; x0 < VW; x0 += 2) {
    if (!celula(x0, y0)) continue;
    const N = celula(x0, y0 - 2), S = celula(x0, y0 + 2), L = celula(x0 + 2, y0), O = celula(x0 - 2, y0), n = N + S + L + O;
    const cx = x0 + 1 + OX, cz = y0 + 1 + OY;
    if (n === 4) usa("road_junction", cx, cz);
    else if (n === 3) usa("road_tsplit", cx, cz, GIRO_T[!N ? "N" : !S ? "S" : !L ? "E" : "W"]);
    else usa("road_straight", cx, cz, (L || O) && !(N || S) ? Math.PI / 2 : 0);
  }

  // ---------- os prédios (grade de módulos esticada para caber na planta) ----------
  const alvos = [];
  const letreiro = (texto, cor) => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const g = c.getContext("2d"); g.fillStyle = "#0d1022"; g.beginPath(); g.roundRect(4, 4, 504, 120, 24); g.fill(); g.strokeStyle = cor; g.lineWidth = 10; g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 64px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, 256, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false })); s.scale.set(4, 1, 1); s.renderOrder = 10; return s;
  };
  const setas = [];
  const seta = () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), mat(0xffe066, { emissive: 0xffc800, emissiveIntensity: 0.6 })); m.rotation.x = Math.PI; m.visible = false; scene.add(m); return m; };
  for (const j of W.GAMES) {
    if (j.npc) continue;
    const g = new THREE.Group(); g.userData.jogo = j;
    const nx = Math.ceil(j.w / 2), nz = Math.ceil(j.h / 2), sx = j.w / (2 * nx), sz = j.h / (2 * nz);
    const tipo = "building_" + "ABCDEFGH"[hashS(j.id) % 8] + "_withoutBase";
    const h = new THREE.Box3().setFromObject(M[tipo]).max.y * 1.35;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const m = M[tipo].clone(true); m.scale.set(sx, 1.35, sz);
      m.position.set(-j.w / 2 + sx + i * 2 * sx, 0, -j.h / 2 + sz + k * 2 * sz); g.add(m);
    }
    const telhado = caixa(j.w + 0.1, 0.25, j.h + 0.1, mat(j.roof)); telhado.position.y = h + 0.1; g.add(telhado);
    const porta = j.doors[0] + (j.doors.length > 1 ? 1 : 0.5) - (j.x + j.w / 2);
    const toldo = caixa(Math.max(1.6, j.doors.length * 1.2), 0.18, 0.9, mat(j.roof)); toldo.position.set(porta, 1.0, j.h / 2 + 0.35); g.add(toldo);
    const placa = letreiro(j.sign || j.name, j.roof); placa.position.set(porta, h + 1.3, j.h / 2 + 0.3); g.add(placa);
    g.position.set(j.x + j.w / 2, 0, j.y + j.h / 2); scene.add(g); alvos.push(g);
    j.seta3d = seta(); j.seta3d.position.set(j.doors[0] + (j.doors.length > 1 ? 1 : 0.5), 1.3, j.doorY + 1.5); setas.push(j);
  }

  // ---------- o resto da vila ----------
  const f = W.FOUNTAIN, fx = f.x + f.w / 2, fz = f.y + f.h / 2;
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.5, 24), mat(0xcfc9ba)); b.position.set(fx, 0.25, fz); b.castShadow = b.receiveShadow = true; scene.add(b); }
  { const a = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.1, 24), mat(0x4fb4e8, { roughness: 0.2 })); a.position.set(fx, 0.52, fz); scene.add(a); }
  const jato = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.6, 8), mat(0xbfe6fb)); jato.position.set(fx, 1.3, fz); scene.add(jato);
  for (const t of W.TERRENOS) for (let i = 0; i < t.w; i++) { const c = caixa(0.7, 0.5, 0.1, mat(0x8a6a3c)); c.position.set(t.x + i + 0.5, 0.3, t.y + t.h - 0.1); scene.add(c); }
  for (const [x, y] of W.LAMPS) usa("streetlight", x + 0.5, y + 0.5, 0, 1.6);
  for (const [x, y] of W.BENCHES) usa("bench", x + 0.5, y + 0.5, 0, 2);
  for (const [x, y] of W.POSTES) usa("streetlight", x + 0.5, y + 0.5, 0, 2.2);

  // árvores e mata: malhas instanciadas por pedaço de 24x24 casas (só os pedaços perto da pessoa são desenhados)
  const pedacosArv = [];
  {
    let geo = null, material = null; M.bush.traverse((o) => { if (o.isMesh && !geo) { geo = o.geometry; material = o.material; } });
    const grupos = new Map(), C = 24;
    const poe1 = (x, y) => { const k = Math.floor(x / C) + "," + Math.floor(y / C); (grupos.get(k) || grupos.set(k, []).get(k)).push([x, y]); };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (ground[y][x] === "t") {
      const naVila = x >= OX && x < OX + VW && y >= OY && y < OY + VH;
      if (naVila || hash(x, y, 6) % 3 === 0) poe1(x, y); // a mata longe da vila é mais rala
    }
    for (const [x, y] of W.TREES) poe1(x, y);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const [k, lista] of grupos) {
      const [cx, cy] = k.split(",").map(Number), im = new THREE.InstancedMesh(geo, material, lista.length);
      lista.forEach(([x, y], i) => { const sc = (hash(x, y, 9) % 10 < 5 ? 4.5 : 5.2) + (hash(x, y, 8) % 10) / 20; e.set(0, hash(x, y, 4) % 6, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x + 0.5, 0, y + 0.5), q, new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(i, m4); });
      im.frustumCulled = false; im.userData.c = [(cx + 0.5) * C, (cy + 0.5) * C]; scene.add(im); pedacosArv.push(im);
    }
  }

  // a cidade em volta (só enfeite) e os carros parados
  for (const p of W.PREDIOS) {
    const alt = p.casa ? 1.1 : 2.2 + (hash(p.x, p.y, 2) % 5) * 0.9 + (p.alto ? 1.5 : 0);
    const b = caixa(p.w - 0.2, alt, p.h - 0.2, mat(p.cor)); b.position.set(p.x + p.w / 2, alt / 2, p.y + p.h / 2); scene.add(b);
    if (p.casa) { const t = caixa(p.w + 0.1, 0.3, p.h + 0.1, mat(0xb4552e)); t.position.set(p.x + p.w / 2, alt + 0.15, p.y + p.h / 2); scene.add(t); }
  }
  const tiposCarro = ["car_hatchback", "car_police", "car_sedan", "car_stationwagon", "car_taxi"];
  for (const [kk] of W.PARADOS) usa(tiposCarro[kk % 5], (kk % MW) + 0.5, Math.floor(kk / MW) + 0.5, 0, 3.2).position.y = 0;

  // os estádios por fora: arquibancada em volta do gramado, na cor do clube
  for (const e of W.ESTADIOS) {
    const r = e.ret, cor = new THREE.Color(e.cadeiras[0]);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 6, r.h - 6), mat(e.gramado[0])); gr.rotation.x = -Math.PI / 2; gr.position.set(r.x + r.w / 2, 0.05, r.y + r.h / 2); scene.add(gr);
    for (const [w, d, x, z, h] of [[r.w, 3, r.x + r.w / 2, r.y + 1.5, 4], [r.w, 3, r.x + r.w / 2, r.y + r.h - 1.5, 4], [3, r.h - 6, r.x + 1.5, r.y + r.h / 2, 4], [3, r.h - 6, r.x + r.w - 1.5, r.y + r.h / 2, 4]]) {
      const c = caixa(w, h, d, mat(cor)); c.position.set(x, h / 2, z); scene.add(c);
      const t = caixa(w + 0.3, 0.3, d + 0.3, mat(0xdddddd)); t.position.set(x, h + 0.15, z); scene.add(t);
    }
    const pl = letreiro(e.curto || e.nome, e.cadeiras[0]); pl.scale.set(7, 1.75, 1); pl.position.set(r.x + r.w / 2, 6, r.y + r.h - 0.5); scene.add(pl);
  }

  // ---------- o telão da estante: o desenho de public/index.html (drawTelao) vira a textura da tela ----------
  const TL = W.TELAO, TS = 16, tw = TL.w * TS + 8 + 4, th = 58;
  const tcv = document.createElement("canvas"); tcv.width = tw; tcv.height = th;
  const tctx = tcv.getContext("2d"); tctx.imageSmoothingEnabled = false;
  const ttex = new THREE.CanvasTexture(tcv); ttex.colorSpace = THREE.SRGBColorSpace; ttex.magFilter = THREE.NearestFilter;
  const telaW = TL.w + 0.5, telaH = telaW * th / tw;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(telaW, telaH), new THREE.MeshBasicMaterial({ map: ttex, toneMapped: false }));
  tela.position.set(TL.x + TL.w / 2, 2.2 + telaH / 2, TL.y + 0.62); scene.add(tela);
  { const moldura = caixa(telaW + 0.25, telaH + 0.25, 0.3, mat(0x14161d)); moldura.position.set(TL.x + TL.w / 2, 2.2 + telaH / 2, TL.y + 0.45); scene.add(moldura);
    for (const dx of [0.6, TL.w - 0.6]) { const p = caixa(0.3, 2.3, 0.3, mat(0x2b2f3a)); p.position.set(TL.x + dx, 1.15, TL.y + 0.45); scene.add(p); } }
  let telaT = -1e9;
  const pintaTelao = (now) => {
    if (now - telaT < 230) return; telaT = now;
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tw, th);
    // drawTelao desenha em pixels do mapa: a tela começa em (x0 - 4, base - 54 - 2); recorta com 2 de folga
    tctx.setTransform(1, 0, 0, 1, -(TL.x * TS - 4 - 2), -(TL.y * TS - 54 - 2 - 2));
    W.drawTelao(tctx, now); ttex.needsUpdate = true;
  };

  // ---------- as pessoas ----------
  const kits = window.Campo.KITS, cmp = (a, b) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
  const kitParecido = (cor) => { const a = new THREE.Color(cor); let best = "corinthians", bd = Infinity; for (const k of Object.keys(kits)) { const d = cmp(a, new THREE.Color(window.Campo.kitColor(k))); if (d < bd) { bd = d; best = k; } } return best; };
  const skinsLista = Object.keys(window.Campo.SKINS || {});
  const avatares = new Map();
  const carroDe = (cor) => { const c = M[tiposCarro[hashS(cor) % 5]].clone(true); c.scale.setScalar(3.2); c.visible = false; scene.add(c); return c; };
  function avatar(chave, p, nome, look, skin, busy) {
    const kit = kitParecido((W.OUTFITS[look] || W.OUTFITS[0]).shirt), id = [kit, skin, nome, busy ? 1 : 0].join("|");
    let a = avatares.get(chave);
    if (a && a.id !== id) { scene.remove(a.g); descartarJogador(a.g); a = null; }
    if (!a) {
      const g = makePlayer(kit, (hashS(nome) % 99) + 1, busy ? "⚔️ " + nome : nome, { skin: skin || "padrao" });
      for (const m of g.userData.marca || []) g.remove(m);
      g.scale.setScalar(ESCALA_BONECO); scene.add(g);
      if (g.userData.tag) g.userData.tag.scale.multiplyScalar(1.7); // o nome precisa ser lido de longe
      a = { id, g, st: {}, carro: carroDe(nome), entrando: 0 }; avatares.set(chave, a);
    }
    return a;
  }
  const YAW = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
  const YAW_CARRO = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };
  function poe(a, p, dt, tag) {
    const x = p.fx + 0.5, z = p.fy + 0.5;
    a.g.visible = !p.car; a.carro.visible = !!p.car;
    a.g.position.set(x, p.entering ? p.t * 0.4 : 0, z); a.g.rotation.y = YAW[p.dir] ?? 0;
    a.carro.position.set(x, 0, z); a.carro.rotation.y = YAW_CARRO[p.dir] ?? 0;
    if (!p.car) animate(a.g, p.moving ? (p.run ? 7 : 4.5) : 0, dt, a.st, 0);
  }
  // os treinadores das ruas: parados, de frente para o sul
  const treinadores = W.GAMES.filter((g) => g.npc).map((g) => {
    const l = g.npc, skin = skinsLista.length ? skinsLista[hashS(l.id) % skinsLista.length] : "padrao";
    const a = avatar("npc-" + l.id, null, l.nome.replace(/^Treinador[a]? /, ""), l.look || 0, skin, false);
    a.g.position.set(g.x + 0.5, 0, g.y + 0.5); a.g.rotation.y = YAW.down;
    const mk = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 24), mat(new THREE.Color(l.cor), { emissive: new THREE.Color(l.cor), emissiveIntensity: 0.4 }));
    mk.rotation.x = Math.PI / 2; mk.position.set(g.x + 0.5, 0.06, g.y + 0.5); scene.add(mk);
    return g;
  });
  // o destino escolhido no menu (um estádio): uma coluna de luz piscando em cima dele
  const farol = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
  farol.visible = false; scene.add(farol);
  const balao = (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 })); m.visible = false; scene.add(m); return m; })();

  // ---------- a câmera: terceira pessoa (de cima, olhando para o norte) ou primeira pessoa (nos olhos do boneco) ----------
  // Arrastar o dedo ou o mouse inclina a visão (na primeira pessoa também gira); a roda e a pinça afastam na terceira.
  let dist = innerWidth < 700 ? 20 : 16, pitch = 1.0, alvoX = 0, alvoZ = 0, iniciou = false;
  let modo = "terceira"; try { if (localStorage.getItem("vila3d:camera") === "primeira") modo = "primeira"; } catch (e) { /* sem armazenamento */ }
  let yawCorpo = 0, giro = 0, olhar = 0.04, arrastou = false; // giro/olhar: o quanto a pessoa virou a cabeça
  const ANG = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
  const entre = (v, a, b) => Math.max(a, Math.min(b, v));
  const mudaModo = (m) => { modo = m ?? (modo === "terceira" ? "primeira" : "terceira"); giro = 0; try { localStorage.setItem("vila3d:camera", modo); } catch (e) { /* sem armazenamento */ } return modo; };
  addEventListener("wheel", (e) => { if (dom.style.display === "none" || modo !== "terceira") return; dist = entre(dist * (1 + Math.sign(e.deltaY) * 0.08), 7, 32); }, { passive: true });
  { const ps = new Map(); let d0 = 0, z0 = 0, ini = null, ult = null; // pinça no celular e arrastar para olhar
    dom.addEventListener("pointerdown", (e) => { ps.set(e.pointerId, e); ini = ult = { x: e.clientX, y: e.clientY }; arrastou = false; if (ps.size === 2) { const [a, b] = [...ps.values()]; d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = dist; } });
    dom.addEventListener("pointermove", (e) => {
      if (!ps.has(e.pointerId)) return; ps.set(e.pointerId, e);
      if (ps.size === 2 && d0) { arrastou = true; if (modo === "terceira") { const [a, b] = [...ps.values()]; dist = entre(z0 * d0 / Math.max(20, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)), 7, 32); } return; }
      if (!ini) return;
      if (!arrastou && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) < 8) return; // até 8 px ainda é um toque
      arrastou = true;
      const dx = e.clientX - ult.x, dy = e.clientY - ult.y; ult = { x: e.clientX, y: e.clientY };
      if (modo === "primeira") { giro = entre(giro - dx * 0.005, -1.6, 1.6); olhar = entre(olhar + dy * 0.005, -0.6, 1.25); }
      else pitch = entre(pitch - dy * 0.005, 0.22, 1.25);
    });
    for (const t of ["pointerup", "pointercancel"]) dom.addEventListener(t, (e) => { ps.delete(e.pointerId); d0 = 0; ini = null; }); }

  function ajustar() { renderer.setSize(innerWidth, innerHeight, false); dom.style.width = innerWidth + "px"; dom.style.height = innerHeight + "px"; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener("resize", ajustar); ajustar();

  const ray = new THREE.Raycaster(), pt = new THREE.Vector2(), plano0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function pick(cx, cy) { // a casa do mapa em que a pessoa tocou (os prédios e os bonecos valem pelo lugar deles)
    pt.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(pt, camera);
    const hit = ray.intersectObjects(alvos, true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.jogo) o = o.parent; if (o) { const j = o.userData.jogo; return [j.x + (j.w >> 1), j.y + j.h - 1]; } }
    const gs = [...avatares.values()].map((a) => a.g);
    const hb = ray.intersectObjects(gs, true)[0];
    if (hb) { let o = hb.object; while (o && !gs.includes(o)) o = o.parent; if (o) return [Math.floor(o.position.x), Math.floor(o.position.z)]; }
    const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plano0, p)) return null;
    return [Math.floor(p.x), Math.floor(p.z)];
  }

  // qualidade: se os quadros demoram (celular fraco), tira a sombra e baixa a resolução, uma etapa de cada vez
  let nivel = /[?&]leve=1/.test(location.search) ? 2 : 0, soma = 0, quadros = 0;
  const NIVEIS = [{ pr: Math.min(devicePixelRatio, 1.5), sombra: true }, { pr: 0.8, sombra: false }, { pr: 0.5, sombra: false }];
  const aplicaNivel = () => { const n = NIVEIS[nivel]; renderer.setPixelRatio(n.pr); sol.castShadow = n.sombra; renderer.setSize(innerWidth, innerHeight, false); };
  if (nivel) aplicaNivel();
  const vivos = new Set();
  function render(now, dt, real) {
    soma += real ?? dt; if (++quadros >= 24) { if (soma / quadros > 70 && nivel < 2) { nivel++; aplicaNivel(); } soma = quadros = 0; }
    const P = W.player, tx = P.fx + 0.5, tz = P.fy + 0.5;
    if (!iniciou) { alvoX = tx; alvoZ = tz; iniciou = true; } else { const k = Math.min(1, dt / 120); alvoX += (tx - alvoX) * k; alvoZ += (tz - alvoZ) * k; }
    const prim = modo === "primeira";
    if (prim) { // nos olhos: vira devagar para onde anda; arrastar vira a cabeça, e ela volta ao andar
      let dif = (ANG[P.dir] ?? 0) - yawCorpo; dif = Math.atan2(Math.sin(dif), Math.cos(dif)); yawCorpo += dif * Math.min(1, dt / 160);
      if (P.moving) { giro *= Math.max(0, 1 - dt / 500); olhar += (0.04 - olhar) * Math.min(1, dt / 600); }
      const yaw = yawCorpo + giro;
      camera.position.set(alvoX - Math.sin(yaw) * 0.12, P.car ? 1.5 : 1.28, alvoZ + Math.cos(yaw) * 0.12);
      camera.rotation.set(olhar, -yaw, 0, "YXZ");
    } else { camera.position.set(alvoX, Math.sin(pitch) * dist, alvoZ + Math.cos(pitch) * dist); camera.lookAt(alvoX, 0.3, alvoZ); }
    ceu.position.copy(camera.position); if (ceuImg) ceuImg.position.copy(camera.position); ceu.material.uniforms.tempo.value = now / 1000;
    sol.position.set(alvoX - 18, 40, alvoZ + 16); sol.target.position.set(alvoX, 0, alvoZ);
    jato.scale.y = 1 + Math.sin(now / 300) * 0.15;
    pintaTelao(now);
    for (const im of pedacosArv) im.visible = Math.hypot(im.userData.c[0] - alvoX, im.userData.c[1] - alvoZ) < 62; // longe, a mata some na névoa
    // as pessoas: eu, os amigos da mesma zona
    vivos.clear();
    { const a = avatar("eu", P, W.nome() || "Eu", W.look(), W.skin(), false); poe(a, P, dt); vivos.add("eu"); if (prim) a.g.visible = a.carro.visible = false; }
    for (const o of W.others.values()) {
      if (!W.naMinhaZona(o)) continue;
      const a = avatar(o.id, o, o.name || "?", o.look || 0, o.skin || "padrao", o.busy); poe(a, o, dt); vivos.add(o.id);
    }
    for (const g of treinadores) vivos.add("npc-" + g.npc.id);
    for (const [k, a] of avatares) if (!vivos.has(k)) { scene.remove(a.g); scene.remove(a.carro); descartarJogador(a.g); avatares.delete(k); }
    for (const g of treinadores) { const a = avatares.get("npc-" + g.npc.id); animate(a.g, 0, dt, a.st, 0); }
    // as setas das portas por perto e o balão de "!" quando dá para entrar
    for (const j of setas) {
      const d = Math.min(...j.mats.map(([mx, my]) => Math.abs(mx - P.x) + Math.abs(my - P.y)));
      j.seta3d.visible = d <= 4 && j !== W.aqui(); j.seta3d.position.y = 1.3 + Math.abs(Math.sin(now / 250)) * 0.25;
    }
    balao.visible = !!W.aqui() && !P.moving && !P.entering; balao.position.set(P.fx + 0.5, 1.5 + Math.abs(Math.sin(now / 280)) * 0.1, P.fy + 0.5);
    const dst = W.destino(); farol.visible = !!dst && Math.floor(now / 400) % 2 === 0; if (dst) farol.position.set(dst.ret.x + dst.ret.w / 2, 30, dst.ret.y + dst.ret.h / 2);
    renderer.render(scene, camera);
  }
  // onde uma casa do mapa aparece na tela (em pixels da janela): os testes e o toque usam
  const tela2 = (x, z, y = 0.5) => { const v = new THREE.Vector3(x, y, z).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; };
  return { dom, render, pick, ajustar, info: () => ({ ...renderer.info.render, geos: renderer.info.memory.geometries, nivel }), tela: tela2, zoom: (d) => { dist = d; }, camera: mudaModo, modo: () => modo, arrastou: () => arrastou };
}
