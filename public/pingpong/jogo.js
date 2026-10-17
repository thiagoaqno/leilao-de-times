// Tênis de Mesa da Galera — o jogo no navegador: telas, o ginásio em 3D (Three.js), a raquete na mão, o robô, os
// sons e a rede. As regras (o voo da bola com ar e giro, o juiz, a raquetada, o placar e o robô) ficam em regras.js
// (window.PingPong), as mesmas do servidor.
// O jeito de jogar é o do Table Tennis Pro: a câmera fica atrás de mim, no alto, olhando a mesa inteira; o mouse (ou o
// dedo) leva a raquete pelo meu lado (para os lados e para a frente/trás) e a altura vai sozinha atrás da bola. A
// batida é automática quando a bola (já quicada do meu lado) chega na raquete; o gesto nessa hora decide o golpe:
// empurrar para a frente é o top spin (forte demais sai longo), parado é o bloqueio, puxar é a cortada, de lado é a
// mira e o efeito. A empunhadura é a clássica (caneta não): forehand com a borracha vermelha à direita do corpo,
// backhand com a preta, trocando sozinha quando a raquete cruza o corpo. O saque: clique, a bola sobe da mão e a
// raquete bate na descida, com o gesto do momento.
// Online, quem bate manda a batida e quem recebe decide o ponto (ver pingpong.js). No treino, tudo roda aqui.
import * as THREE from "three";
import { makePlayer, animate, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import { canvasTex, M } from "/pelada/tex.js";

const P = window.PingPong, C = window.Campo, { MESA } = P, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/pingpong"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const COR = ["#398ef0", "#ee4c4f"], KIT = ["celeste", "rubronegro"];
const DIFS = [["facil", "😌 Fácil"], ["medio", "🙂 Médio"], ["dificil", "😤 Difícil"]], BOT_SKINS = ["steve", "pikachu", "shrek", "naruto", "woody"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
// a raquete alcança a bola até ALCANCE para o lado (a lâmina tem 15 cm, mais o braço que estica) e ALTURA para cima
// ou para baixo; o mouse anda num plano a PLANO_Y; o saque sobe da mão e é batido LANCE_T segundos depois
const ALCANCE = 0.24, ALTURA = 0.32, PLANO_Y = MESA.H + 0.15, LANCE_T = 0.47, REPOUSO_Y = MESA.H + 0.2;
let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
// G: a partida que está na tela. est: placar/fase (no online é o do servidor; no treino, montado aqui)
const G = { active: false, offline: false, pausa: false, lado: 0, eu: -1, est: null, bola: null, rally: null, julgou: false, lance: null, raq: [null, null], corpos: [null, null], hist: [], tj: 0, batidas: 0, ultMsg: 0, ultEnvio: 0, bot: null, dif: "medio", tremor: 0 };
const agora = () => (G.offline ? Date.now() + (G.adiant || 0) : relogio.agora()); // no treino, o relógio é o daqui (os testes adiantam)

// ======================================================================
// 3D: o ginásio, a mesa, a bola, as raquetes e os braços
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1220); scene.fog = new THREE.Fog(0x0b1220, 11, 30);
const cam = new THREE.PerspectiveCamera(46, 1, 0.05, 80);
// o mouse é lido por uma câmera parada no lugar de sempre (a de verdade acompanha o corpo; se o mouse fosse lido por
// ela, a raquete andaria sozinha quando a câmera anda)
const camRef = new THREE.PerspectiveCamera(46, 1, 0.05, 80);
configurarBonecos({ scene });
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x3a2a26, 0.9));
// a luz do teto, em cima da mesa: é ela que faz as sombras dos jogadores e das raquetes
const sol = new THREE.DirectionalLight(0xfff3e2, 2.2); sol.position.set(0.6, 7, 1.2); sol.target.position.set(0, 0, 0); sol.castShadow = true;
Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 6, bottom: -6, near: 1, far: 12 }); sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0004; sol.shadow.radius = 3;
scene.add(sol, sol.target);
for (const z of [-2.6, 2.6]) { const l = new THREE.PointLight(0xffffff, 6, 9, 1.6); l.position.set(0, 4.2, z); scene.add(l); }
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight;
  cam.fov = cam.aspect < 1 ? 64 : cam.aspect < 1.4 ? 52 : 46; // em pé no celular, mais aberta para caber a mesa
  cam.updateProjectionMatrix(); camRef.aspect = cam.aspect; camRef.fov = cam.fov; camRef.updateProjectionMatrix();
}
addEventListener("resize", resize);

const MESA_OBJ = {}; // o que muda no ginásio (o placar do juiz)
(function ginasio() {
  const add = (o, pai = scene) => (pai.add(o), o);
  // o chão: piso esportivo vermelho dentro das barreiras, cinza-azulado fora
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M(0x1c2333, { roughness: 0.95 }))); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true;
  const pisoT = canvasTex(256, 512, (x, w, hh, r) => { x.fillStyle = "#9c3a2c"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.02 + r() * 0.03})`; x.fillRect(r() * w, r() * hh, 2, 2); } });
  const piso = add(new THREE.Mesh(new THREE.PlaneGeometry(7, 14), new THREE.MeshStandardMaterial({ map: pisoT, roughness: 0.55, metalness: 0.05 }))); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.002; piso.receiveShadow = true;
  // as barreiras azuis em volta da quadra, com os anúncios da Vila
  const placa = (texto) => canvasTex(512, 72, (x, w, hh) => { const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, "#1d3f8f"); g.addColorStop(1, "#122a66"); x.fillStyle = g; x.fillRect(0, 0, w, hh); x.fillStyle = "#e8f0ff"; x.font = "bold 34px Anton, Impact, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, hh / 2 + 2); x.fillStyle = "#ffcc33"; x.fillRect(0, hh - 5, w, 5); });
  const mats = ["VILA DA GALERA", "TÊNIS DE MESA", "★ GALERA OPEN ★", "PONG · PING · PONG"].map((t) => new THREE.MeshStandardMaterial({ map: placa(t), roughness: 0.6 }));
  let n = 0;
  for (let i = 0; i < 7; i++) for (const [x, z, ry] of [[-3 + i, 7, Math.PI], [-3 + i, -7, 0]]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.62, 0.04), mats[n++ % 4])); p.position.set(x, 0.31, z); p.rotation.y = ry; p.castShadow = true; }
  for (let i = 0; i < 14; i++) for (const [x, ry] of [[3.5, -Math.PI / 2], [-3.5, Math.PI / 2]]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.62, 0.04), mats[n++ % 4])); p.position.set(x, 0.31, -6.5 + i); p.rotation.y = ry; }
  // a arquibancada escura em volta, com a torcida (uma malha só, instanciada)
  const deg = M(0x232b3d, { roughness: 0.9 });
  for (const [x, z, ry, larg] of [[0, -9.5, 0, 16], [0, 9.5, Math.PI, 16], [-6.5, 0, Math.PI / 2, 18], [6.5, 0, -Math.PI / 2, 18]]) {
    for (let k = 0; k < 6; k++) { const d = add(new THREE.Mesh(new THREE.BoxGeometry(larg, 0.45, 0.8), deg)); d.rotation.y = ry; d.position.set(x, 0.22 + k * 0.45, z); d.translateZ(-k * 0.8); }
  }
  const torcida = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.5, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 520);
  const m4 = new THREE.Matrix4(), cor = new THREE.Color(), CORES = [0xe84a4a, 0x3b82f6, 0xf2f2f2, 0xffcc33, 0x2a2a2a, 0x22a06b, 0xd96bd0];
  let k = 0;
  for (const [x, z, ry, larg] of [[0, -9.5, 0, 16], [0, 9.5, Math.PI, 16], [-6.5, 0, Math.PI / 2, 18], [6.5, 0, -Math.PI / 2, 18]]) for (let fila = 0; fila < 6; fila++) for (let i = 0; i < 22 && k < 520; i++) {
    if (Math.sin(i * 12.9 + fila * 7.3 + x) > 0.55) continue; // cadeiras vazias
    const u = -larg / 2 + 0.5 + i * ((larg - 1) / 21), dz = -fila * 0.8, px = x + Math.cos(ry) * u + Math.sin(ry) * dz, pz = z - Math.sin(ry) * u + Math.cos(ry) * dz;
    m4.makeRotationY(ry); m4.setPosition(px, 0.7 + fila * 0.45, pz); torcida.setMatrixAt(k, m4); torcida.setColorAt(k, cor.setHex(CORES[(i * 7 + fila * 3) % CORES.length])); k++;
  }
  torcida.count = k; add(torcida);
  // as luzes do teto (painéis acesos)
  for (const z of [-3, 0, 3]) for (const x of [-1.6, 1.6]) { const l = add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff6dd }))); l.position.set(x, 6.5, z); }
  // a mesa oficial: azul fosco, linhas brancas de 2 cm, a linha do meio (das duplas), a saia e os pés de ferro
  const tampoT = canvasTex(512, 920, (x, w, hh) => {
    x.fillStyle = "#1f4f95"; x.fillRect(0, 0, w, hh); const lw = Math.round(w * 0.02 / MESA.W) + 1;
    x.fillStyle = "#f7f7f2"; x.fillRect(0, 0, w, lw * 1.2); x.fillRect(0, hh - lw * 1.2, w, lw * 1.2); x.fillRect(0, 0, lw, hh); x.fillRect(w - lw, 0, lw, hh); x.fillRect(w / 2 - lw * 0.3, 0, lw * 0.6, hh);
  });
  tampoT.anisotropy = 8;
  const tampo = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W, 0.025, MESA.L), [M(0x173c74), M(0x173c74), new THREE.MeshStandardMaterial({ map: tampoT, roughness: 0.42, metalness: 0.02 }), M(0x173c74), M(0xf2f2ee), M(0xf2f2ee)]));
  tampo.position.y = MESA.H - 0.0125; tampo.receiveShadow = tampo.castShadow = true;
  const saia = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W - 0.1, 0.06, MESA.L - 0.1), M(0x0f1d33))); saia.position.y = MESA.H - 0.055;
  const ferro = M(0x2a2f38, { metalness: 0.6, roughness: 0.4 });
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) { const pe = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, MESA.H - 0.08, 0.05), ferro)); pe.position.set(sx * (MESA.W / 2 - 0.2), (MESA.H - 0.08) / 2, sz * (MESA.L / 2 - 0.35)); pe.castShadow = true; }
    const barra = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W - 0.4, 0.04, 0.04), ferro)); barra.position.set(0, 0.12, sz * (MESA.L / 2 - 0.35));
    for (const sx of [-1, 1]) { const roda = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), M(0x111111))); roda.rotation.z = Math.PI / 2; roda.position.set(sx * (MESA.W / 2 - 0.2), 0.035, sz * (MESA.L / 2 - 0.35)); }
  }
  // a rede: malha escura, fita branca em cima e os postes com a braçadeira
  const telaT = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#d8dde6"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true); telaT.repeat.set((MESA.W + 2 * MESA.POSTE) / 0.013, MESA.REDE / 0.013);
  const rede = add(new THREE.Mesh(new THREE.PlaneGeometry(MESA.W + 2 * MESA.POSTE, MESA.REDE - 0.012), new THREE.MeshStandardMaterial({ map: telaT, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x40485a, transparent: true })));
  rede.position.y = MESA.H + (MESA.REDE - 0.012) / 2;
  const fita = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W + 2 * MESA.POSTE, 0.015, 0.006), M(0xf6f6f2))); fita.position.y = MESA.H + MESA.REDE - 0.0075;
  for (const s of [-1, 1]) {
    const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, MESA.REDE + 0.02, 0.025), M(0x1b1f27, { metalness: 0.5 }))); p.position.set(s * (MESA.W / 2 + MESA.POSTE), MESA.H + MESA.REDE / 2, 0);
    const garra = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.07), M(0x1b1f27))); garra.position.set(s * (MESA.W / 2 + MESA.POSTE - 0.01), MESA.H + 0.005, 0);
  }
  // a mesa do juiz, ao lado da rede, com o marcador de virar (atualizado a cada ponto)
  const juiz = add(new THREE.Group()); juiz.position.set(2.6, 0, 0); juiz.rotation.y = -Math.PI / 2;
  const mJ = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.45), M(0x1d3f8f)), juiz); mJ.position.y = 0.36;
  const cvPlacar = document.createElement("canvas"); cvPlacar.width = 256; cvPlacar.height = 128;
  const placarT = new THREE.CanvasTexture(cvPlacar); placarT.colorSpace = THREE.SRGBColorSpace;
  const marcador = add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.26, 0.06), [M(0x111111), M(0x111111), M(0x111111), M(0x111111), new THREE.MeshBasicMaterial({ map: placarT }), M(0x111111)]), juiz); marcador.position.set(0, 0.86, 0.05);
  MESA_OBJ.placar = (a, b) => {
    const x = cvPlacar.getContext("2d"); x.fillStyle = "#111"; x.fillRect(0, 0, 256, 128);
    for (const [i, v] of [[0, a], [1, b]]) { x.fillStyle = COR[i]; x.fillRect(8 + i * 124, 8, 116, 112); x.fillStyle = "#fff"; x.font = "bold 84px Anton, Impact, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(v), 66 + i * 124, 68); }
    placarT.needsUpdate = true;
  };
  MESA_OBJ.placar(0, 0);
})();

// ---------- a bola: 40 mm, branca, com o logotipo (para dar para ver ela girando) ----------
const bolaTex = canvasTex(128, 64, (x, w, hh) => { x.fillStyle = "#fbfaf4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#e05a1a"; x.font = "bold 13px Arial"; x.fillText("★★★", 8, 36); x.fillText("40+", 74, 36); });
const bola = new THREE.Mesh(new THREE.SphereGeometry(P.R * 1.12, 20, 14), new THREE.MeshStandardMaterial({ map: bolaTex, roughness: 0.35, emissive: 0x2a2620 }));
scene.add(bola);
const RASTRO = 16, rastroGeo = new THREE.BufferGeometry(); rastroGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RASTRO * 3), 3));
const rastro = new THREE.Line(rastroGeo, new THREE.LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, depthWrite: false })); rastro.frustumCulled = false; scene.add(rastro);
const pontosRastro = [];
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2; scene.add(sombra);
// o estalo da batida: um anel que abre e some
const estalo = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
scene.add(estalo); let estaloT = 9;

// ---------- a raquete na mão (empunhadura clássica) ----------
// No grupo da raquete: o centro da lâmina na origem, o cabo para −y, a borracha vermelha (forehand) virada para +z
// e a preta para −z. A mão segura o cabo com o polegar no lado vermelho e o indicador esticado no lado preto.
const PELE = M(0xe0ac7e, { roughness: 0.75 });
function raquete() {
  const g = new THREE.Group(), lamina = new THREE.Group(); g.add(lamina);
  const disco = (cor, z, r = 0.076, alt = 0.0022) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, alt, 28), M(cor, { roughness: 0.82 })); d.rotation.x = Math.PI / 2; d.position.z = z; d.scale.z = 1.06; d.castShadow = true; lamina.add(d); return d; };
  disco(0xd8232f, 0.0034); disco(0x121212, -0.0034); disco(0xcf9f62, 0, 0.0765, 0.0046);
  const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.1, 0.024), M(0x9a6a36, { roughness: 0.6 })); cabo.position.y = -0.125; cabo.castShadow = true; lamina.add(cabo);
  const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.027), M(0x3a2410)); ponta.position.y = -0.176; lamina.add(ponta);
  const pele = (w, hh, d, x, y, z, rz = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), PELE); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; lamina.add(m); return m; };
  pele(0.07, 0.075, 0.045, -0.006, -0.135, 0); // a palma fechada no cabo
  pele(0.02, 0.05, 0.018, 0.012, -0.088, 0.016, -0.5); // o polegar, no lado vermelho
  pele(0.017, 0.072, 0.015, -0.02, -0.068, -0.013, 0.75); // o indicador, esticado na borracha preta
  for (let i = 0; i < 3; i++) pele(0.034, 0.016, 0.05, 0.026, -0.112 - i * 0.019, 0.004); // os outros dedos dando a volta
  g.userData.lamina = lamina; scene.add(g); return g;
}
const raqMesh = [raquete(), raquete()];
// o braço (antebraço e braço) até a mão, com a manga na cor do time
function braco(lado) {
  const g = new THREE.Group(), manga = M(new THREE.Color(COR[lado]).getHex(), { roughness: 0.8 });
  const ante = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.037, 1, 10), PELE), cima = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1, 10), manga);
  ante.castShadow = cima.castShadow = true; g.add(ante, cima); scene.add(g);
  return { g, ante, cima };
}
const bracos = [braco(0), braco(1)];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function entre(m, a, b) { _c.subVectors(b, a); const len = _c.length(); m.position.copy(a).addScaledVector(_c, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(_up, _c.normalize()); }
// os dois ossos do braço: do ombro até o pulso, o cotovelo para fora e para baixo
const BRACO = 0.31, ANTE = 0.29, _cot = new THREE.Vector3(), _polo = new THREE.Vector3(), _d = new THREE.Vector3();
function posarBraco(br, ombro, pulso, lado) {
  _d.subVectors(pulso, ombro); let d = _d.length();
  if (d > BRACO + ANTE - 0.01) { ombro.addScaledVector(_d.normalize(), d - (BRACO + ANTE - 0.01)); _d.subVectors(pulso, ombro); d = _d.length(); }
  _d.normalize();
  _polo.set(P.S(lado) * 0.8, -1, P.S(lado) * 0.2); _polo.addScaledVector(_d, -_polo.dot(_d)).normalize();
  const x = (BRACO * BRACO - ANTE * ANTE + d * d) / (2 * d), y = Math.sqrt(Math.max(0, BRACO * BRACO - x * x));
  _cot.copy(ombro).addScaledVector(_d, x).addScaledVector(_polo, y);
  entre(br.cima, ombro, _cot); entre(br.ante, _cot, pulso);
}

// o estado de cada raquete: onde está (x, z no chão do meu lado; y sozinha), a velocidade (o gesto), o golpe que
// está passando na tela, se é forehand, e o corpo de quem segura
const novaRaq = (lado) => ({ x: 0, y: REPOUSO_Y, z: P.S(lado) * (MESA.L / 2 + 0.45), vx: 0, vz: 0, yAlvo: REPOUSO_Y, tc: -1, preverEm: 0, fh: true, golpe: null, alvo: null, corpo: { x: -P.S(lado) * 0.3, z: P.S(lado) * (MESA.L / 2 + 0.9), vx: 0 } });

// ---------- o boneco do outro lado (a skin), atrás da raquete ----------
function montarCorpos(lados) {
  for (const c of G.corpos) if (c) descartarJogador(c.model);
  G.corpos = lados.map((j, lado) => {
    if (!j || lado === G.eu) return null; // eu não me vejo inteiro: só o braço (a câmera fica atrás de mim)
    const model = makePlayer(KIT[lado], 10, "", { skin: j.skin || "padrao" }); scene.add(model);
    for (const m of model.userData.marca || []) model.remove(m);
    model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    model.rotation.y = lado ? Math.PI : 0; return { model, st: {} };
  });
}

// ======================================================================
// Sons (sintetizados: o toque seco da bola de celuloide na borracha e na mesa)
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("pingpong:vol") ?? 0.7, master = null, ruido = null;
  const ctx = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); const n = ac.sampleRate * 0.2; ruido = ac.createBuffer(1, n, ac.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch { return null; } }
    if (ac.state === "suspended") ac.resume(); return ac;
  };
  function tom(f0, f1, dur, ganho, tipo = "sine") { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function toque(freq, q, dur, ganho) { const c = ctx(); if (!c) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = ruido; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("pingpong:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    raquete(forca = 0.5) { toque(1500 + forca * 600, 4, 0.05, 0.5 + forca * 0.6); tom(900, 600, 0.04, 0.18 + forca * 0.15, "triangle"); },
    mesa() { toque(3200, 7, 0.04, 0.45); tom(2300, 1500, 0.03, 0.12, "triangle"); },
    chao() { toque(1800, 5, 0.05, 0.22); }, rede() { toque(400, 1.5, 0.12, 0.35); },
    ponto() { tom(660, 990, 0.18, 0.12); }, perdeu() { tom(330, 200, 0.25, 0.12, "sawtooth"); },
  };
})();

// ======================================================================
// Telas: inicial (amistoso, torneio, mundial e com amigos) e sala de espera
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
const skinBotoes = (atual) => Object.entries(C.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
const PAISES = [["br", "🇧🇷", "Brasil"], ["ar", "🇦🇷", "Argentina"], ["us", "🇺🇸", "Estados Unidos"], ["ca", "🇨🇦", "Canadá"], ["jp", "🇯🇵", "Japão"], ["cn", "🇨🇳", "China"], ["kr", "🇰🇷", "Coreia do Sul"], ["in", "🇮🇳", "Índia"], ["de", "🇩🇪", "Alemanha"], ["fr", "🇫🇷", "França"], ["gb", "🇬🇧", "Reino Unido"], ["se", "🇸🇪", "Suécia"], ["es", "🇪🇸", "Espanha"], ["it", "🇮🇹", "Itália"], ["au", "🇦🇺", "Austrália"], ["ng", "🇳🇬", "Nigéria"]];
const RODADAS = { amistoso: 1, torneio: 4, mundial: 8 }, TITULOS = { amistoso: "Amistoso", torneio: "Torneio", mundial: "Campeonato Mundial" };
let modoSolo = "amistoso";
const pais = (id) => PAISES.find((p) => p[0] === id) || PAISES[0];
const paisEscolhido = () => store.get("pingpong:pais") || "br";
const chaveCampanha = (modo) => `pingpong:campanha:${modo}:${paisEscolhido()}`;
const etapa = (modo) => Math.max(0, Math.min(RODADAS[modo] - 1, +(store.get(chaveCampanha(modo)) || 0)));
function adversario(modo, rodada) {
  const outros = PAISES.filter((p) => p[0] !== paisEscolhido());
  const indice = (PAISES.findIndex((p) => p[0] === paisEscolhido()) * 3 + rodada * 5 + (modo === "mundial" ? 7 : 0)) % outros.length;
  return outros[indice];
}
function atualizarSolo() {
  $("soloTitle").textContent = TITULOS[modoSolo];
  $("hCountries").innerHTML = PAISES.map(([id, bandeira, nome]) => `<button data-country="${id}" class="${paisEscolhido() === id ? "on" : ""}" aria-pressed="${paisEscolhido() === id}" title="${nome}"><b>${bandeira}</b>${nome}</button>`).join("");
  const rodada = etapa(modoSolo), total = RODADAS[modoSolo], rival = adversario(modoSolo, rodada);
  $("soloProgress").classList.toggle("hidden", total === 1);
  $("soloProgress").innerHTML = Array.from({ length: total }, (_, i) => `<span class="${i < rodada ? "done" : i === rodada ? "current" : ""}">${i < rodada ? "✓" : i === rodada ? "●" : "○"}<br>${modoSolo === "mundial" && i === 7 ? "Final" : modoSolo === "torneio" && i === 3 ? "Final" : `Jogo ${i + 1}`}</span>`).join("");
  $("soloPreview").textContent = `${pais(paisEscolhido())[1]} ${pais(paisEscolhido())[2]}  ×  ${rival[1]} ${rival[2]} · 11 pontos`;
  $("btnPractice").textContent = rodada ? "Continuar campeonato" : "Entrar na mesa";
}
function abrirModo(modo) {
  if (modo === "online") { $("soloSetup").classList.add("hidden"); $("onlineSetup").classList.remove("hidden"); }
  else { modoSolo = modo; $("onlineSetup").classList.add("hidden"); $("soloSetup").classList.remove("hidden"); atualizarSolo(); }
  $("homeHelp").classList.add("hidden");
}
function fecharModo() { $("soloSetup").classList.add("hidden"); $("onlineSetup").classList.add("hidden"); $("homeHelp").classList.remove("hidden"); }
function telaInicial() { seg("hDif", DIFS, store.get("pingpong:dif") || "medio", "data-hdif"); $("hSkins").innerHTML = skinBotoes(store.get("galera:skin")); atualizarSolo(); }
$("btnBackMode").onclick = fecharModo;
$("btnBackOnline").onclick = fecharModo;
$("hOnlineName").oninput = () => { $("hName").value = $("hOnlineName").value; };
$("hName").oninput = () => { $("hOnlineName").value = $("hName").value; };
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.mode) abrirModo(b.dataset.mode);
  else if (b.dataset.country) { store.set("pingpong:pais", b.dataset.country); atualizarSolo(); }
  else if (b.dataset.hdif) { store.set("pingpong:dif", b.dataset.hdif); telaInicial(); }
  else if (b.dataset.skin) { store.set("galera:skin", b.dataset.skin); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); telaInicial(); if (S && S.phase === "lobby") renderLobby(); }
  else if (b.dataset.lado != null && S) act("lado", { lado: +b.dataset.lado });
  else if (b.dataset.cpontos && S) act("config", { config: { ...S.config, pontos: +b.dataset.cpontos } });
  else if (b.dataset.cgames && S) act("config", { config: { ...S.config, games: +b.dataset.cgames } });
});
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const jogador = (id) => S && S.players.find((p) => p.id === id);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, dis = isHost ? "" : "disabled";
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)} <span>${(C.SKINS[p.skin] || {}).emoji || ""}</span></div>`;
  for (const l of [0, 1]) {
    const p = jogador(S.lados[l]);
    $("l" + l).innerHTML = p ? linha(p) : `<div class="pl muted" style="font-weight:500">vaga livre</div>`;
    document.querySelector(`[data-lado="${l}"]`).classList.toggle("hidden", !mine || !!p);
  }
  const fora = S.players.filter((p) => !S.lados.includes(p.id)); $("lN").innerHTML = fora.length ? fora.map(linha).join("") : "Ninguém.";
  document.querySelector('[data-lado="-1"]').classList.toggle("hidden", !mine || !S.lados.includes(mine.id));
  $("lSkins").innerHTML = skinBotoes(mine && mine.skin);
  seg("cPontos", [[11, "11 pontos"], [21, "21 pontos"]], S.config.pontos, "data-cpontos", dis);
  seg("cGames", [[1, "1 game"], [3, "3 games"]], S.config.games, "data-cgames", dis);
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">🏓 Começar</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
$("btnPractice").onclick = () => comecarTreino(modoSolo);
$("btnPractice2").onclick = () => comecarTreino("treino");

// ======================================================================
// Rede: entrar, criar, estado, batidas, o lance do saque e as raquetes
// ======================================================================
$("hName").value = store.get("galera:name") || "";
$("hOnlineName").value = $("hName").value;
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("pingpong:" + r.code, ME);
  history.replaceState(null, "", "/pingpong/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin"), config: store.get("pingpong:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pingpong:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("btnInvite").onclick = async () => { const link = location.origin + "/pingpong/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("pingpong:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("state", (st) => {
  const antes = S; S = st;
  if (st.phase === "lobby") { if (G.active && !G.offline) pararJogo(); if (!G.active) { show("lobby"); renderLobby(); } return; }
  if (!G.active || G.offline || !antes || antes.phase === "lobby" || antes.lados.join() !== st.lados.join()) comecarOnline();
  G.est = st;
  if (st.ultimo && (!antes || !antes.ultimo || antes.ultimo.t !== st.ultimo.t)) aoPonto(st.ultimo);
  if (st.phase === "fim") mostrarFim(); else $("over").classList.add("hidden");
});
socket.on("bola", (d) => { if (G.active && !G.offline) receberBola(d); });
socket.on("lance", (d) => { if (G.active && !G.offline && d.lado !== G.eu && !G.rally) G.lance = { t0: G.tj, lado: d.lado, x: d.x }; });
socket.on("raq", (d) => { if (G.active && !G.offline && d.lado !== G.eu && G.raq[d.lado]) G.raq[d.lado].alvo = d; });

// ======================================================================
// Começar e parar
// ======================================================================
function comecarTreino(modo = "amistoso") {
  if (G.active) pararJogo();
  const rodada = RODADAS[modo] ? etapa(modo) : 0;
  const escolhido = store.get("pingpong:dif") || "medio";
  const dif = modo === "mundial" && rodada >= 5 ? "dificil" : modo === "torneio" && rodada >= 3 && escolhido === "facil" ? "medio" : escolhido;
  const skin = BOT_SKINS[(rodada + paisEscolhido().charCodeAt(0)) % BOT_SKINS.length];
  Object.assign(G, { offline: true, soloMode: modo, rodada, eu: 0, lado: 0, dif, bot: { lado: 1, x: 0, z: -(MESA.L / 2 + 0.5), y: REPOUSO_Y, vx: 0, vz: 0 } });
  const rival = adversario(modo === "treino" ? "amistoso" : modo, rodada);
  G.nomes = [modo === "treino" ? "Você" : `${pais(paisEscolhido())[1]} ${$("hName").value.trim() || pais(paisEscolhido())[2]}`, modo === "treino" ? "🤖 Robô" : `${rival[1]} ${rival[2]}`];
  G.est = { phase: "jogo", placar: P.novoPlacar({ pontos: 11, games: 1 }, Math.random() < 0.5 ? 0 : 1), prontoEm: agora() + 1500, ultimo: null };
  montarCorpos([{ skin: store.get("galera:skin") }, { skin }]);
  iniciar();
}
function comecarOnline() {
  if (G.active) pararJogo();
  const eu = ME && ME.id ? S.lados.indexOf(ME.id) : -1;
  Object.assign(G, { offline: false, eu, lado: eu >= 0 ? eu : 0, est: S, bot: null });
  G.nomes = S.lados.map((id) => (jogador(id) || {}).name || "?");
  montarCorpos(S.lados.map((id) => jogador(id) || null));
  iniciar();
}
function iniciar() {
  Object.assign(G, { active: true, pausa: false, bola: null, rally: null, julgou: false, lance: null, hist: [], tremor: 0 }); acumulado = 0;
  G.raq = [novaRaq(0), novaRaq(1)];
  show("game"); resize(); $("over").classList.add("hidden"); $("pause").classList.add("hidden");
  camAlvo(1); Som.unlock(); last = performance.now();
}
function pararJogo() { G.active = false; for (const c of G.corpos) if (c) descartarJogador(c.model); G.corpos = [null, null]; }
function sair() {
  pararJogo();
  if (G.offline || !S) { show("home"); telaInicial(); return; }
  show("lobby"); renderLobby();
}

// ======================================================================
// A bola: saque, batida, voo e o juiz
// ======================================================================
const estado = () => G.est || {};
const sacador = () => (estado().placar ? estado().placar.sacador : 0);
const podeSacar = (lado) => estado().phase === "jogo" && !G.rally && !G.lance && sacador() === lado && agora() >= (estado().prontoEm || 0);
// o tipo do golpe para a animação da raquete (top, corte, bloqueio ou smash), pela bola que saiu
function tipoDoGolpe(b) {
  const t = P.topDe(b.w, b.v), nome = P.nomeEfeito(b);
  return nome === "Smash" ? "smash" : t > 200 ? "top" : t < -120 ? "corte" : "bloq";
}
function novaBatida(b, quem, saque) {
  G.bola = b; G.rally = { quem, saque, quiques: [] }; G.julgou = false; G.lance = null; pontosRastro.length = 0;
  const vel = P.kmh(b), tipo = tipoDoGolpe(b);
  Som.raquete(clamp((vel - 20) / 50, 0, 1));
  const r = G.raq[quem]; if (r) { r.golpe = { t0: G.tj, tipo, forca: clamp((vel - 15) / 45, 0.2, 1) }; r.tc = -1; }
  estalo.position.set(b.p[0], b.p[1], b.p[2]); estaloT = 0;
  if (tipo === "smash") G.tremor = 0.5;
  const nome = saque ? "Saque" : P.nomeEfeito(b); // o nome do golpe e a velocidade aparecem embaixo, rapidinho
  if (nome || vel > 45) { const e = $("hEfeito"); e.innerHTML = `${h(nome || "Drive")} <b>${vel} km/h</b>`; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); G.efeitoAte = performance.now() + 1000; }
}
// eu bato (ou saco): calcula aqui e manda para o outro
function euBato(b, saque) {
  novaBatida(b, G.eu, saque); if (!saque) G.batidas++;
  if (!G.offline) socket.emit("bola", { p: b.p, v: b.v, saque, t: agora(), w: b.w || null });
}
function receberBola(d) {
  const b = { p: d.p.slice(), v: d.v.slice(), viva: true, w: d.w ? d.w.slice() : [0, 0, 0] };
  novaBatida(b, d.quem, d.saque);
  voarJulgando(Math.max(0, Math.min(0.5, (agora() - d.t) / 1000))); // a bola já andou o tempo que o pacote levou
}
// anda a bola e passa os eventos pelo juiz; quem julga é quem recebe (no treino, sempre aqui)
function voarJulgando(dt) {
  const b = G.bola; if (!b || !b.viva) return;
  for (const e of P.voar(b, dt)) {
    if (e.tipo === "quique") Som.mesa(); else if (e.tipo === "rede") Som.rede(); else if (e.tipo === "chao") Som.chao();
    if (!G.rally || G.julgou) continue;
    const r = P.julgar(G.rally, e);
    if (r) {
      G.julgou = true;
      const juiz = G.offline || G.eu === 1 - G.rally.quem;
      if (juiz) marcarPonto(r.vence, r.motivo);
    }
  }
}
function marcarPonto(vence, motivo) {
  if (!G.offline) return socket.emit("ponto", { vence, motivo });
  const est = G.est, r = P.marcar(est.placar, vence);
  G.rally = null;
  est.ultimo = { lado: vence, motivo, nome: G.nomes[vence], t: agora() };
  est.prontoEm = agora() + (r.fimGame ? 2200 : 1400);
  if (r.fim) est.phase = "fim";
  aoPonto(est.ultimo);
  if (r.fim) mostrarFim();
}
function aoPonto(u) {
  G.rally = null; G.lance = null;
  const meu = u.lado === G.eu, pl = estado().placar;
  if (pl) MESA_OBJ.placar(pl.pts[0], pl.pts[1]);
  if (G.eu >= 0) (meu ? Som.ponto : Som.perdeu)();
  msg(meu ? "Ponto seu!" : G.eu >= 0 ? "Ponto do adversário" : `Ponto de ${h(u.nome)}`, u.motivo || "");
}
function msg(t, sub = "", ms = 1300) { const m = $("hMsg"); m.innerHTML = `${t}${sub ? `<small>${h(sub)}</small>` : ""}`; m.classList.remove("pop"); void m.offsetWidth; m.classList.add("pop"); G.ultMsg = performance.now() + ms; }
function mostrarFim() {
  const pl = estado().placar; if (!pl || pl.vencedor == null) return;
  const ganhei = pl.vencedor === G.eu, nome = G.nomes[pl.vencedor] || "?";
  if (ganhei) Comum.confetti();
  const isHost = !G.offline && ME && S && S.host === ME.id;
  const modo = G.soloMode, total = RODADAS[modo] || 1, campeao = G.offline && ganhei && G.rodada + 1 >= total;
  if (G.offline && ganhei && total > 1) store.set(chaveCampanha(modo), campeao ? 0 : G.rodada + 1);
  $("overBox").innerHTML = `<h2>${campeao && modo !== "amistoso" ? "🏆 Você é campeão!" : ganhei ? "🏓 Você venceu!" : `🏓 ${h(nome)} venceu`}</h2>
    <p class="muted">Placar: ${pl.config.games > 1 ? `games ${pl.games[0]} x ${pl.games[1]}` : `${pl.pts[0]} x ${pl.pts[1]}`}</p>
    <div class="row" style="margin-top:14px">${G.offline ? `<button class="primary" id="bDeNovo">${ganhei && !campeao && total > 1 ? "Próxima partida" : "Jogar de novo"}</button>` : isHost ? `<button class="primary" id="bDeNovo">Voltar para a sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="bSair">Sair</button></div>`;
  $("over").classList.remove("hidden");
  $("bSair").onclick = () => { $("over").classList.add("hidden"); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
  if ($("bDeNovo")) $("bDeNovo").onclick = () => { $("over").classList.add("hidden"); if (G.offline) comecarTreino(modo); else act("lobby"); };
}

// ======================================================================
// Controles: o mouse (ou o dedo) leva a raquete; o clique joga a bola para o saque
// ======================================================================
const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANO_Y), ponto = new THREE.Vector3(), ndc = new THREE.Vector2(0, -0.4);
// no toque, a raquete fica um pouco acima do dedo (senão o dedo tapa a raquete e a bola)
const lerPonteiro = (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1 + (e.pointerType === "touch" ? 0.14 : 0));
$("game").addEventListener("pointermove", lerPonteiro);
$("game").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, .overlay")) return;
  lerPonteiro(e);
  if (G.active && !G.pausa && G.eu >= 0 && podeSacar(G.eu)) lancarSaque(G.eu);
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && G.active) pausar(!G.pausa);
  if ((e.key === " " || e.key === "Enter") && G.active && !G.pausa && G.eu >= 0 && podeSacar(G.eu)) { e.preventDefault(); lancarSaque(G.eu); }
});
$("hSair").onclick = () => pausar(true);
$("btnResume").onclick = () => pausar(false);
$("btnLeave").onclick = () => { pausar(false); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };
function pausar(on) { G.pausa = on && G.offline; $("pause").classList.toggle("hidden", !on); } // online o jogo não para: só abre o menu

// o saque: a bola sobe da mão livre (mais de 16 cm) e a raquete bate na descida
const xDoLance = (r) => clamp(r.x, -0.6, 0.6) * 0.8;
function lancarSaque(lado) {
  const r = G.raq[lado]; G.lance = { t0: G.tj, lado, x: xDoLance(r) };
  if (!G.offline && lado === G.eu) socket.emit("lance", { x: G.lance.x });
}
function posLance(l) { const t = G.tj - l.t0; return [l.x, MESA.H + 0.12 + 2.5 * t - 4.9 * t * t, P.S(l.lado) * (MESA.L / 2 + 0.1)]; }
function talvezSacar() {
  const l = G.lance; if (!l || G.tj - l.t0 < LANCE_T) return;
  if (G.tj - l.t0 > 3) { G.lance = null; return; } // o saque do outro não chegou
  if (l.lado === G.eu) { const r = G.raq[G.eu], s = P.S(G.eu); euBato(P.sacar(G.eu, l.x / 0.8, { frente: -s * r.vz, lat: r.vx }), true); }
  else if (G.bot && l.lado === G.bot.lado) {
    const d = P.DIF[G.dif] || P.DIF.medio, frente = Math.random() < 0.5 ? -2 - Math.random() * 4 : Math.random() * (d.forca[1] - 1);
    novaBatida(P.sacar(1, l.x / 0.8, { frente, lat: (Math.random() - 0.5) * 8 }), 1, true);
  }
}

// a minha raquete: onde o mouse aponta, presa ao meu lado da mesa; a altura vai sozinha até onde a bola vai passar
function moverMinhaRaq(dt) {
  const r = G.raq[G.eu], s = P.S(G.eu);
  ray.setFromCamera(ndc, camRef);
  if (ray.ray.intersectPlane(plano, ponto)) { r.x = clamp(ponto.x, -1.5, 1.5); r.z = s * clamp(s * ponto.z, 0.2, MESA.L / 2 + 1.2); }
  // o gesto: a velocidade da raquete nos últimos ~90 ms (para a frente, pelo movimento na tela, que não satura perto da rede)
  const t = G.tj * 1000; G.hist.push({ t, x: r.x, ny: ndc.y }); while (G.hist.length > 2 && t - G.hist[0].t > 90) G.hist.shift();
  const h0 = G.hist[0], d = Math.max(0.016, (t - h0.t) / 1000);
  r.vx = clamp((r.x - h0.x) / d, -8, 8);
  r.vz = clamp(-s * (ndc.y - h0.ny) * 1.3 / d, -11, 11);
  alturaSozinha(r, G.eu, dt);
}
// a altura da raquete (minha e do robô): de tempos em tempos prevê onde a bola cruza o plano dela e vai para lá
function alturaSozinha(r, lado, dt) {
  const b = G.bola, vem = b && b.viva && G.rally && G.rally.quem !== lado;
  r.preverEm -= dt; if (r.tc > 0) r.tc -= dt;
  if (!vem) { r.yAlvo = REPOUSO_Y; r.tc = -1; }
  else if (r.preverEm <= 0) {
    r.preverEm = 0.05;
    const pv = P.prever(b, G.rally, lado, r.z) || P.prever(b, G.rally, lado);
    if (pv) { r.yAlvo = clamp(pv.y, MESA.H + 0.02, MESA.H + 0.95); r.tc = pv.t; }
  }
  r.y = lerp(r.y, r.yAlvo, 1 - Math.exp(-dt * 22));
}
// a bola passou pela raquete (do jeito certo)? então rebate, no ponto em que ela cruzou o plano da raquete
function tentarRebater(lado, raq, pAntes, rzAntes, batida) {
  const b = G.bola, s = P.S(lado);
  if (!b || !b.viva || !P.podeRebater(G.rally, lado)) return false;
  const antes = (pAntes[2] - rzAntes) * s, depois = (b.p[2] - raq.z) * s;
  if (!(antes < 0.03 && depois >= -0.03)) return false;
  const k = depois - antes > 1e-6 ? clamp(-antes / (depois - antes), 0, 1) : 1, p = [0, 1, 2].map((i) => lerp(pAntes[i], b.p[i], k));
  if (Math.abs(p[0] - raq.x) > ALCANCE || Math.abs(p[1] - raq.y) > ALTURA) return false;
  b.p = [p[0], p[1], raq.z - s * 0.01];
  P.rebater(b, batida ? batida() : raq, lado);
  return true;
}

// ======================================================================
// Laço do jogo (passos fixos de 1/60 s)
// ======================================================================
let last = performance.now(), acumulado = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.13, (t - last) / 1000); last = t;
  if (!G.active) return;
  if (!G.pausa) {
    acumulado += dt;
    for (let i = 0; acumulado >= 1 / 60 && i < 8; i++) { passo(1 / 60); acumulado -= 1 / 60; }
    if (acumulado > 1 / 60) acumulado = 0;
  } else acumulado = 0;
  desenhar(dt);
  renderer.render(scene, cam);
}
requestAnimationFrame(loop);

function passo(dt) {
  G.tj += dt; // relógio do jogo (o gesto da raquete é medido nele)
  const b = G.bola, pAntes = b ? b.p.slice() : null, rz = [G.raq[0].z, G.raq[1].z];
  if (G.eu >= 0) moverMinhaRaq(dt);
  if (G.bot) {
    const bot = G.bot, r = G.raq[1];
    P.robo(bot, b, G.rally, dt, G.dif);
    Object.assign(r, { x: bot.x, z: bot.z, vx: bot.vx }); alturaSozinha(r, 1, dt);
    if (podeSacar(1) && agora() > estado().prontoEm + 600) lancarSaque(1);
  }
  talvezSacar();
  // a raquete do outro (online): vai até onde ele mandou
  for (const l of [0, 1]) { const r = G.raq[l]; if (l !== G.eu && r.alvo) { const k = 1 - Math.exp(-dt * 18); r.x = lerp(r.x, r.alvo.x, k); r.y = lerp(r.y, r.alvo.y, k); r.z = lerp(r.z, r.alvo.z, k); if (r.alvo.f != null) r.fh = !!r.alvo.f; } }
  if (b && b.viva) {
    voarJulgando(dt);
    if (G.eu >= 0 && G.rally && tentarRebater(G.eu, G.raq[G.eu], pAntes, rz[G.eu])) euBato(G.bola, false);
    else if (G.bot && G.rally && tentarRebater(1, G.raq[1], pAntes, rz[1], () => P.batidaRobo(G.bot, G.bola, G.dif))) novaBatida(G.bola, 1, false);
  } else if (b) P.rolar(b, dt); // a bola morta continua quicando no chão
  // mando a minha raquete ~30 vezes por segundo
  if (!G.offline && G.eu >= 0 && agora() - G.ultEnvio > 33) { G.ultEnvio = agora(); const r = G.raq[G.eu]; socket.volatile.emit("raq", { x: +r.x.toFixed(3), y: +r.y.toFixed(3), z: +r.z.toFixed(3), f: r.fh ? 1 : 0 }); }
}

// ======================================================================
// Desenho: a câmera, a bola, as raquetes na mão, os corpos e o placar
// ======================================================================
const camPos = new THREE.Vector3(), camOlha = new THREE.Vector3(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _n = new THREE.Vector3(), _hd = new THREE.Vector3();
// a câmera do Table Tennis Pro: atrás e acima de mim, olhando a mesa inteira; acompanha um pouco o meu corpo
function camAlvo(k) {
  const l = G.eu >= 0 ? G.eu : 0, s = P.S(l), cx = G.raq[l] ? G.raq[l].corpo.x : 0, alto = cam.aspect < 1 ? 0.45 : 0;
  camPos.lerp(_a.set(cx * 0.3, MESA.H + 1.3 + alto, s * (MESA.L / 2 + 1.95 + alto)), k);
  camOlha.lerp(_b.set(cx * 0.12, MESA.H - 0.1, -s * 0.45), k);
  camRef.position.set(0, MESA.H + 1.3 + alto, s * (MESA.L / 2 + 1.95 + alto)); camRef.lookAt(0, MESA.H - 0.1, -s * 0.45); camRef.updateMatrixWorld();
}
// a lâmina virada para a rede: fechada no top, aberta no corte; o cabo aponta para o corpo (forehand à direita,
// backhand à esquerda, com a outra borracha na frente)
function orientarRaquete(m, r, lado, giro) {
  const s = P.S(lado), fh = r.fh, inclina = 0.32 + giro.fecha;
  _n.set(clamp(-r.vx * 0.04, -0.4, 0.4), -Math.sin(inclina), -s * Math.cos(inclina)).normalize();
  _hd.set(fh ? -s * 0.65 : s * 0.85, fh ? -1 : -0.6, s * 0.3).normalize(); // para onde vai o cabo
  _z.copy(_n).multiplyScalar(fh ? 1 : -1);
  _y.copy(_hd).negate().addScaledVector(_z, _hd.dot(_z)).normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z); m.quaternion.setFromRotationMatrix(_m);
}
// o movimento do golpe por cima da posição da raquete: a preparação (para trás, quando a bola vem chegando) e a
// terminação (para a frente; para cima no top, para baixo no corte, cruzando o corpo)
function gestoDe(r, lado) {
  const s = P.S(lado), lado1 = r.fh ? 1 : -1, o = { x: 0, y: 0, z: 0, fecha: 0 };
  if (r.tc > 0 && r.tc < 0.3) { const a = 1 - r.tc / 0.3; o.z += s * 0.12 * a; o.y -= 0.05 * a; o.x += s * 0.08 * a * lado1; o.fecha -= 0.15 * a; }
  const g = r.golpe;
  if (g) {
    const k = (G.tj - g.t0) / 0.32;
    if (k >= 1) r.golpe = null;
    else {
      const e = Math.sin(k * Math.PI) * (0.4 + 0.6 * g.forca);
      o.z -= s * 0.24 * e; o.x -= s * 0.18 * e * lado1;
      o.y += g.tipo === "top" ? 0.22 * e : g.tipo === "corte" ? -0.1 * e : g.tipo === "smash" ? 0.05 * e : 0.06 * e;
      o.fecha += g.tipo === "top" ? 0.55 * e : g.tipo === "corte" ? -0.8 * e : g.tipo === "smash" ? 0.35 * e : 0;
    }
  }
  return o;
}
const _ombro = new THREE.Vector3(), _pulso = new THREE.Vector3();
function desenhar(dt) {
  const est = estado(), b = G.bola;
  // a bola: voando, morta no chão, subindo no lance do saque ou na mão de quem vai sacar
  if (G.lance) { const p = posLance(G.lance); bola.position.set(p[0], p[1], p[2]); }
  else if (b && (G.rally || agora() < (est.prontoEm || 0) - 350)) bola.position.set(b.p[0], b.p[1], b.p[2]);
  else if (est.phase === "jogo") { const l = sacador(), r = G.raq[l]; bola.position.set(xDoLance(r), MESA.H + 0.12 + Math.abs(Math.sin(performance.now() / 320)) * 0.05, P.S(l) * (MESA.L / 2 + 0.1)); }
  // o giro: a bola gira com o efeito e deixa o rastro colorido (vermelho no top, azul no corte, roxo no lateral)
  const w = b && b.viva && b.w;
  if (w) { bola.rotation.x += w[0] * dt * 0.25; bola.rotation.y += w[1] * dt * 0.25; bola.rotation.z += w[2] * dt * 0.25; }
  if (b && b.viva && G.rally) { pontosRastro.unshift(bola.position.clone()); if (pontosRastro.length > RASTRO) pontosRastro.pop(); } else pontosRastro.length = 0;
  const pos = rastroGeo.attributes.position;
  for (let i = 0; i < RASTRO; i++) { const q = pontosRastro[Math.min(i, pontosRastro.length - 1)] || bola.position; pos.setXYZ(i, q.x, q.y, q.z); }
  pos.needsUpdate = true;
  const top = w ? P.topDe(w, b.v) : 0, forte = w ? Math.max(Math.abs(top) / 450, Math.abs(w[1]) / 220) : 0, vel = b && b.viva ? P.kmh(b) : 0;
  rastro.material.opacity = forte > 0.45 || vel > 55 ? Math.min(0.85, Math.max(forte, vel / 80)) * 0.8 : 0;
  rastro.material.color.set(vel > 55 && top < 320 ? 0xffe066 : top > 0 ? 0xff3a2a : top < -150 ? 0x3aa0ff : 0xb05aff);
  if (performance.now() > (G.efeitoAte || 0)) $("hEfeito").textContent = "";
  const naMesa = Math.abs(bola.position.x) <= MESA.W / 2 && Math.abs(bola.position.z) <= MESA.L / 2 && bola.position.y > MESA.H;
  sombra.position.set(bola.position.x, naMesa ? MESA.H + 0.002 : 0.004, bola.position.z);
  const alt = Math.max(0, bola.position.y - (naMesa ? MESA.H : 0)); sombra.scale.setScalar(1 + alt * 1.2); sombra.material.opacity = 0.5 / (1 + alt * 2.5);
  estaloT += dt; estalo.material.opacity = Math.max(0, 0.9 - estaloT * 5); estalo.scale.setScalar(1 + estaloT * 14); estalo.lookAt(cam.position);
  // as raquetes, os braços e os corpos
  for (const l of [0, 1]) {
    const r = G.raq[l], m = raqMesh[l], s = P.S(l), tem = G.offline || (est.lados && est.lados[l]);
    m.visible = bracos[l].g.visible = !!tem; if (!tem) continue;
    // o corpo vai atrás da raquete; forehand quando a raquete está à direita dele, backhand quando cruza para a esquerda
    const c = r.corpo, local = s * (r.x - c.x);
    if (l === G.eu || G.offline) { if (r.fh && local < -0.1) r.fh = false; else if (!r.fh && local > 0.06) r.fh = true; }
    const quer = r.fh ? r.x - s * 0.4 : r.x + s * 0.12, cx0 = c.x;
    c.x = lerp(c.x, quer, 1 - Math.exp(-dt * 7)); c.z = lerp(c.z, r.z + s * 0.5, 1 - Math.exp(-dt * 7));
    const ges = gestoDe(r, l);
    m.position.set(r.x + ges.x, r.y + ges.y, r.z + ges.z);
    orientarRaquete(m, r, l, ges);
    // o pulso fica na ponta do cabo; o ombro direito, na altura do peito
    _pulso.set(0, -0.15, 0).applyQuaternion(m.quaternion).add(m.position);
    _ombro.set(c.x + s * 0.2, 1.36, c.z);
    posarBraco(bracos[l], _ombro, _pulso, l);
    bracos[l].cima.visible = l !== G.eu; // o meu braço: só o antebraço (o resto fica atrás da câmera)
    const corpo = G.corpos[l];
    if (corpo) {
      corpo.model.position.set(c.x, 0, c.z);
      animate(corpo.model, Math.abs(c.x - cx0) / Math.max(dt, 1e-3), dt, corpo.st);
      const u = corpo.model.userData; if (u.arms && u.arms[1]) u.arms[1].visible = false; // o braço da raquete é o desenhado aqui
    }
  }
  // a câmera, com o tremor do smash
  camAlvo(1 - Math.exp(-dt * 4)); G.tremor = Math.max(0, G.tremor - dt * 2.5);
  cam.position.copy(camPos); if (G.tremor) cam.position.add(_c.set(Math.sin(G.tj * 90) * 0.012 * G.tremor, Math.cos(G.tj * 77) * 0.01 * G.tremor, 0));
  cam.lookAt(camOlha);
  // o placar (no alto, à esquerda) e as dicas
  const pl = est.placar, nomes = G.nomes || ["?", "?"];
  if (pl) {
    const linha = (l) => `<div class="lin"><i style="background:${COR[l]}"></i><span class="nm">${h(nomes[l])}</span><b class="sq">${pl.sacador === l ? "●" : ""}</b>${pl.config.games > 1 ? `<span class="gm">${pl.games[l]}</span>` : ""}<span class="pt">${pl.pts[l]}</span></div>`;
    const html = linha(0) + linha(1);
    if (html !== G.placarHtml) { G.placarHtml = html; $("hTop").innerHTML = html; }
  }
  let dica = "";
  if (est.phase === "jogo" && !G.rally && !G.lance && agora() >= (est.prontoEm || 0)) dica = sacador() === G.eu ? "Clique para jogar a bola e sacar · mexa o mouse na hora para dar efeito" : `Saque de ${h(nomes[sacador()])}`;
  if (dica !== G.dica) { G.dica = dica; $("hHint").innerHTML = dica; $("hHint").classList.toggle("hidden", !dica); }
  if (performance.now() > G.ultMsg) $("hMsg").innerHTML = "";
}

telaInicial();
if (urlCode) abrirModo("online");
// para os testes automáticos (#debug): o estado do jogo
if (location.hash === "#debug") window.__pingpong = {
  G, P, podeSacar, avancar: (s) => { for (let t = 0; t < s; t += 1 / 60) { passo(1 / 60); G.adiant = (G.adiant || 0) + 1000 / 60; } },
  quadro: (dt = 1 / 60) => { desenhar(dt); renderer.render(scene, cam); }, cam,
  // onde o mouse tem que estar para a raquete ficar no ponto (x, z) da mesa
  tela: (x, z) => { const v = new THREE.Vector3(x, PLANO_Y, z).project(camRef); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
};
