// O Ginásio em 3D pixelado: a quadra, a arquibancada com a torcida, os pilares, a luz e as sombras numa cena Three.js
// desenhada na resolução da tela, com antisserrilhado (desenho.js junta tudo no #cv). Os sprites continuam com os pixels
// nítidos, sem suavizar.
// - O chão da quadra é o desenho 2D de sempre (temas.js, marcas.js, as áreas e a mira), pintado num canvas visto de
//   cima (chaoCv, em desenho.js) e usado como textura do piso.
// - Os bichos e os projéteis continuam sendo os desenhos de animacao.js e golpes.js, pintados num atlas (atlasCv) e
//   mostrados como cartazes em pé na quadra, na profundidade certa. Os bichos fazem sombra no chão.
// - O THREE chega por um <script type="module"> no index.html (window.THREE). Até lá (ou sem WebGL), desenho.js
//   desenha a quadra reta, vista de cima.
// - Modo leve (celular fraco ou quadros lentos): meia resolução, sem antisserrilhado, sem sombra de verdade (só a mancha embaixo do bicho) e
//   torcida parada. Com "menos movimento" no sistema, a torcida também fica parada e a câmera não treme.
const ATLAS = { w: 1024, h: 512, casa: 128 }; // 8 x 4 casas de 128 pixels
const PX_CARTAZ = 96 / 3.1; // pixels do atlas por casa da arena: o GIF do Black/White entra pixel por pixel, sem reduzir
const PE_CARTAZ = 116; // a linha do chão dentro da casa do atlas (onde ficam os pés do bicho)
const INCLINACAO = 50 * Math.PI / 180; // quanto a câmera olha para baixo
const DEITA_CARTAZ = INCLINACAO / 2; // o cartaz do bicho deita um pouco para trás, para não sair achatado
const ESTICA_CARTAZ = 1 / Math.cos(INCLINACAO - DEITA_CARTAZ);
const cena3d = { ok: false, falhou: false, leve: false, temaFeito: null, enquadre: "" };

// o quanto uma cor é clara, de 0 a 1 (para o brilho dos golpes não estourar no chão claro)
const luminancia = (hex) => { const c = new THREE.Color(hex); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };
// cores do tema viram cor do Three (o hex é sRGB; o Three converte)
const cor3 = (hex) => new THREE.Color(hex);
function texturaDe(cv, repetir = false) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function iniciarCena3d() {
  if (cena3d.ok) return true;
  if (cena3d.falhou || !window.THREE) return false;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: !cena3d.leve, alpha: false, powerPreference: cena3d.leve ? "low-power" : "high-performance" });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.type = THREE.PCFShadowMap; // sombra de borda macia
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 160);
    // a luz: o ambiente (o que fica na sombra) e o sol vindo do alto, da esquerda e do fundo (a sombra cai para a
    // frente, onde dá para ver, e não escondida atrás do cartaz)
    const ambiente = new THREE.AmbientLight(0xffffff, 0.62 * Math.PI);
    const sol = new THREE.DirectionalLight(0xffffff, 0.43 * Math.PI / 0.89);
    sol.position.set(-4, 10, -2.5); sol.target.position.set(0, 0, 0);
    Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 30 });
    sol.shadow.camera.updateProjectionMatrix(); sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.002;
    scene.add(ambiente, sol, sol.target);
    // o degradê do sombreado chapado: três tons, sem passagem suave
    const degrade = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    degrade.magFilter = degrade.minFilter = THREE.NearestFilter; degrade.needsUpdate = true;
    // o chão da quadra (o canvas visto de cima) e o atlas dos cartazes
    const texChao = texturaDe(chaoCv), texAtlas = texturaDe(atlasCv);
    const matCartaz = new THREE.MeshBasicMaterial({ map: texAtlas, transparent: true, alphaTest: 0.04, depthWrite: false });
    matCartaz.shadowSide = THREE.DoubleSide; // o cartaz é uma folha só: sem isto, a sombra dele some
    const sombraCartaz = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texAtlas, alphaTest: 0.5 });
    const lado = ATLAS.casa / PX_CARTAZ, colunas = ATLAS.w / ATLAS.casa, linhas = ATLAS.h / ATLAS.casa;
    const cartazes = [];
    for (let i = 0; i < colunas * linhas; i++) {
      const g = new THREE.PlaneGeometry(lado, lado), uv = g.attributes.uv, c = i % colunas, l = Math.floor(i / colunas);
      const u0 = c / colunas, u1 = (c + 1) / colunas, v0 = 1 - (l + 1) / linhas, v1 = 1 - l / linhas;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
      const m = new THREE.Mesh(g, matCartaz);
      m.customDepthMaterial = sombraCartaz; m.visible = false; m.frustumCulled = false;
      scene.add(m); cartazes.push(m);
    }
    Object.assign(cena3d, { renderer, scene, cam, sol, ambiente, degrade, texChao, texAtlas, cartazes, raio: new THREE.Raycaster(), plano: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v: new THREE.Vector3(), tremor: new THREE.Vector3(), ok: true });
    montarVolume(cena3d); // os bichos com volume (volume.js)
    montarGolpes3d(cena3d); // os golpes com volume (golpes3d.js)
    definirLeve(cena3d.leve, true);
    return true;
  } catch (erro) {
    console.warn("Ginásio sem 3D:", erro.message);
    cena3d.falhou = true;
    return false;
  }
}

// liga ou desliga o modo leve (as sombras de verdade precisam recompilar os materiais)
function definirLeve(leve, forcar = false) {
  if (cena3d.leve === leve && !forcar) return;
  cena3d.leve = leve;
  if (!cena3d.ok) return;
  cena3d.renderer.shadowMap.enabled = !leve; cena3d.sol.castShadow = !leve;
  cena3d.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
  cena3d.temaFeito = null; // o chão de fora muda (liso no leve)
}

// ---------- o cenário de cada tema (temas.js) ----------
function liberarGrupo(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
  });
  g.removeFromParent();
}
function montarTema(T) {
  const { scene, degrade, texChao } = cena3d;
  if (cena3d.grupo) liberarGrupo(cena3d.grupo);
  const grupo = new THREE.Group(); cena3d.grupo = grupo; scene.add(grupo);
  const toon = (hex) => new THREE.MeshToonMaterial({ color: cor3(hex), gradientMap: degrade });
  const caixa = (w, h, d, mat, x, y, z, sombra = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
    m.castShadow = sombra; m.receiveShadow = true; grupo.add(m); return m;
  };
  scene.background = cor3(T.fundo[0]).multiplyScalar(0.55);
  scene.fog = new THREE.Fog(scene.background, (cena3d.distancia || 26) + 8, (cena3d.distancia || 26) + 40);
  // o chão de fora: os ladrilhos do fundo (liso no modo leve)
  const fora = document.createElement("canvas"); fora.width = 64; fora.height = 32;
  const fc = fora.getContext("2d"); fc.fillStyle = T.fundo[0]; fc.fillRect(0, 0, 64, 32);
  if (!cena3d.leve) { fc.fillStyle = T.fundo[1]; fc.fillRect(0, 0, 30, 14); fc.fillRect(32, 0, 30, 14); fc.fillRect(16, 16, 30, 14); fc.fillRect(48, 16, 16, 14); fc.fillRect(0, 16, 14, 14); }
  const texFora = texturaDe(fora, true); texFora.repeat.set(40, 80);
  const chaoFora = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ map: texFora }));
  chaoFora.rotation.x = -Math.PI / 2; chaoFora.position.y = -0.2; chaoFora.receiveShadow = true; grupo.add(chaoFora);
  // a quadra: um tablado com o desenho do chão em cima e a borda do tema nos lados
  const borda = toon(T.borda), piso = new THREE.MeshLambertMaterial({ map: texChao });
  const tablado = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.2, 12.5), [borda, borda, piso, borda, borda, borda]);
  tablado.position.y = -0.1; tablado.receiveShadow = true; grupo.add(tablado);
  // a arquibancada: degraus no fundo e nos lados, com a torcida das duas cores; na frente, só a mureta
  const degrau = toon(T.arquibancada), muro = toon(T.borda);
  const pessoas = []; // { x, y, z, cor, ry } — viram uma malha só (instanciada)
  for (let i = 0; i < 3; i++) {
    const z = -7.1 - i, h = 0.55 * (i + 1);
    caixa(21 + i * 2, h, 1, degrau, 0, h / 2 - 0.2, z);
    for (let k = 0; k < 29; k++) if ((k + i) % 3 !== 0) pessoas.push({ x: -9.4 + k * 0.67, y: h - 0.2, z: z + 0.1, cor: k < 14 ? T.torcida[0] : T.torcida[1] });
  }
  caixa(27, 3.6, 0.5, muro, 0, 1.6, -9.85);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const x = s * (10.1 + i), h = 0.45 * (i + 1);
      caixa(1, h, 13.2, degrau, x, h / 2 - 0.2, -0.1);
      for (let k = 0; k < 17; k++) if ((k + i) % 2 === 0) pessoas.push({ x: x + s * 0.05, y: h - 0.2, z: -5.6 + k * 0.7, cor: s < 0 ? T.torcida[0] : T.torcida[1], ry: s * Math.PI / 2 });
    }
    caixa(0.4, 1.4, 13.2, muro, s * 11.8, 0.5, -0.1);
  }
  caixa(18.9, 0.35, 0.25, muro, 0, -0.02, 6.4, false);
  // a torcida: corpo e cabeça, duas malhas instanciadas
  const corpos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.3), toon("#ffffff"), pessoas.length);
  const cabecas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), toon("#d9bf9f"), pessoas.length);
  corpos.castShadow = cabecas.castShadow = !cena3d.leve;
  pessoas.forEach((p, i) => { p.fase = fixo(i + 3) * 6.28; p.ritmo = 3 + fixo(i + 9) * 3; corpos.setColorAt(i, cor3(p.cor)); });
  grupo.add(corpos, cabecas);
  cena3d.torcida = { pessoas, corpos, cabecas, m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), um: new THREE.Vector3(1, 1, 1) };
  mexerTorcida(0, true);
  // o letreiro do ginásio, pendurado no muro do fundo
  const placa = document.createElement("canvas"); placa.width = 256; placa.height = 24;
  const pc = placa.getContext("2d"); pc.fillStyle = T.borda; pc.fillRect(0, 0, 256, 24);
  pc.fillStyle = T.letreiro; pc.fillRect(0, 0, 256, 2); pc.fillRect(0, 22, 256, 2);
  pc.font = "700 14px ui-monospace,monospace"; pc.textAlign = "center"; pc.textBaseline = "middle"; pc.fillText(T.nome, 128, 13);
  const letreiro = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.125), new THREE.MeshBasicMaterial({ map: texturaDe(placa) }));
  letreiro.position.set(0, 2.75, -9.58); grupo.add(letreiro);
  // os pilares: dezesseis lados, com a tampa e a faixa de brilho do tema
  const [, corpoPilar, topoPilar, brilhoPilar] = T.pilar;
  for (const p of Ginasio.ARENA.pilares) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.06, 1.1, 16), toon(corpoPilar));
    c.position.set(p.x, 0.55, p.y); c.castShadow = c.receiveShadow = true; grupo.add(c);
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.08, p.r * 1.08, 0.18, 16), toon(topoPilar));
    tampa.position.set(p.x, 1.15, p.y); tampa.castShadow = true; grupo.add(tampa);
    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.02, p.r * 1.02, 0.08, 16), toon(brilhoPilar));
    faixa.position.set(p.x, 0.85, p.y); grupo.add(faixa);
  }
  cena3d.cenario = montarCenario(T, grupo, toon); // a luz, os enfeites e o clima do tema (cenarios.js)
  cena3d.temaFeito = T;
}
// a torcida pulando no ritmo de cada um (parada com menos movimento ou no modo leve)
function mexerTorcida(agora, forcar = false) {
  const t = cena3d.torcida;
  if (!t || (!forcar && (cena3d.leve || movimentoReduzido.matches))) return;
  const s = agora / 1000;
  t.pessoas.forEach((p, i) => {
    const pulo = forcar ? 0 : Math.max(0, Math.sin(s * p.ritmo + p.fase)) * 0.12;
    t.e.set(0, p.ry || 0, 0); t.q.setFromEuler(t.e);
    t.m.compose(t.p.set(p.x, p.y + 0.21 + pulo, p.z), t.q, t.um); t.corpos.setMatrixAt(i, t.m);
    t.m.compose(t.p.set(p.x, p.y + 0.53 + pulo, p.z), t.q, t.um); t.cabecas.setMatrixAt(i, t.m);
  });
  t.corpos.instanceMatrix.needsUpdate = t.cabecas.instanceMatrix.needsUpdate = true;
}

// ---------- câmera ----------
// põe a câmera a uma distância em que a quadra inteira cabe na tela, e centraliza a quadra entre o topo e o fundo
// livres (em coordenadas da tela, de -1 a 1)
function enquadrar3d(w, h, topo, baixo) {
  const { cam, renderer } = cena3d, chave = `${w}x${h}:${topo}:${baixo}`;
  if (cena3d.enquadre === chave) return;
  cena3d.enquadre = chave;
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.clearViewOffset();
  const alvo = new THREE.Vector3(0, 0, 0.4), dir = new THREE.Vector3(0, Math.sin(INCLINACAO), Math.cos(INCLINACAO));
  const pontos = [[-9.3, 0, -6.3], [9.3, 0, -6.3], [-9.3, 0.35, 6.5], [9.3, 0.35, 6.5], [0, 2.6, -5.8]].map((p) => new THREE.Vector3(...p));
  const medir = (d) => {
    cam.position.copy(alvo).addScaledVector(dir, d); cam.lookAt(alvo); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let x = 0, y0 = 1e9, y1 = -1e9;
    for (const p of pontos) { const v = p.clone().project(cam); x = Math.max(x, Math.abs(v.x)); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    return { x, y0, y1 };
  };
  let perto = 4, longe = 200;
  for (let i = 0; i < 40; i++) {
    const d = (perto + longe) / 2, m = medir(d);
    if (m.x <= 0.97 && m.y1 - m.y0 <= topo - baixo) longe = d; else perto = d;
  }
  const m = medir(longe), sobe = (topo + baixo) / 2 - (m.y1 + m.y0) / 2;
  cam.setViewOffset(w, h, 0, -sobe * h / 2, w, h);
  cena3d.base = cam.position.clone();
  cena3d.distancia = longe; // a névoa começa depois da quadra, por mais longe que a câmera fique (celular em pé)
  if (cena3d.scene.fog) { cena3d.scene.fog.near = longe + 8; cena3d.scene.fog.far = longe + 40; }
}
// o ponto da arena (x, y, altura) na tela do #cv
function projetar3d(x, y, h = 0) {
  const v = cena3d.v.set(x, h, y).project(cena3d.cam);
  return { x: (v.x + 1) / 2 * camera.largura, y: (1 - v.y) / 2 * camera.altura };
}
// o ponto da tela (pixels do #cv) no chão da arena
function chao3d(px, py) {
  const { raio, cam, plano } = cena3d;
  raio.setFromCamera({ x: px / camera.largura * 2 - 1, y: 1 - py / camera.altura * 2 }, cam);
  const p = raio.ray.intersectPlane(plano, new THREE.Vector3());
  return p ? { x: p.x, y: p.z } : { x: 0, y: 0 };
}

// ---------- o quadro ----------
// o cartaz no lugar: o do bicho fica em pé (deitado um pouco para trás) com os pés no chão; o do projétil, virado para
// a câmera, com o centro no ponto
function posicionarCartaz(m, c) {
  m.visible = true;
  if (c.bicho) {
    m.rotation.set(-DEITA_CARTAZ, 0, 0); m.scale.set(1, ESTICA_CARTAZ, 1);
    const sobe = (PE_CARTAZ - ATLAS.casa / 2) / PX_CARTAZ * ESTICA_CARTAZ; // o centro da casa fica acima dos pés
    m.position.set(c.x, c.altura + sobe * Math.cos(DEITA_CARTAZ), c.y - sobe * Math.sin(DEITA_CARTAZ));
  } else {
    m.rotation.set(-INCLINACAO, 0, 0); m.scale.set(1, 1, 1);
    m.position.set(c.x, c.altura, c.y);
  }
  m.castShadow = false;
  if (m.renderOrder !== 1) m.renderOrder = c.bicho ? 0 : 2;
}
// lista: [{ casa, x, y, altura, bicho, sombra }] — bicho: cartaz em pé, com os pés na linha PE_CARTAZ; senão, o centro
// da casa fica no ponto (projéteis), virado para a câmera
function renderizar3d(lista, agora, tremor) {
  const { renderer, scene, cam, cartazes, volumes, texChao, texAtlas, texEspessura } = cena3d;
  const T = temaAtual();
  if (cena3d.temaFeito !== T) { montarTema(T); G3.claro = luminancia(T.piso[0]) > 0.55; }
  mexerTorcida(agora); cena3d.cenario?.(agora);
  texChao.needsUpdate = true; texAtlas.needsUpdate = true; texEspessura.needsUpdate = true;
  cartazes.forEach((m) => { m.visible = false; });
  volumes.forEach((v) => { v.volume.visible = v.fantasma.visible = false; });
  for (const c of lista) {
    const plano = cartazes[c.casa]; if (!plano) continue;
    // com volume, a pilha de camadas e o fantasma (o meio transparente) andam juntos no lugar do cartaz plano
    const pecas = c.volume ? [volumes[c.casa].volume, volumes[c.casa].fantasma] : [plano];
    for (const m of pecas) posicionarCartaz(m, c);
    pecas[0].castShadow = !!c.sombra;
  }
  // o tremor de quem apanhou (nunca com menos movimento)
  // e a câmera reagindo aos golpes (golpes3d.js): treme e dá o "soco" de aproximação
  cam.position.copy(cena3d.base);
  if (!movimentoReduzido.matches) {
    const forca = Math.max(tremor > 0 ? 0.35 : 0, G3.sacudida);
    if (forca > 0.01) cam.position.add(cena3d.tremor.set(Math.sin(agora * 0.05) * 0.3 * forca, Math.cos(agora * 0.067) * 0.2 * forca, 0));
  }
  const fov = 30 - 3 * (movimentoReduzido.matches ? 0 : G3.soco);
  if (Math.abs(cam.fov - fov) > 0.001) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  renderer.render(scene, cam);
  return renderer.domElement;
}
