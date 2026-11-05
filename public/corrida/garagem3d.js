// Corrida da Galera — a garagem 3D: o carro de F1 da equipe parado no box, à noite, com o chão molhado refletindo as luzes e o carro.
// Uma cena só, usada pela tela inicial (/corrida/) e pela carreira (/corrida/temporada/), sem modelo de cenário baixado: tudo em código, nas cores
// da equipe (`trocarEquipe`). `vista` escolhe o enquadramento; a câmera anda até ele e, sem `vivo`, a cena para de desenhar (fica como foto de fundo).
// Só depende do three, de f1.js e de window.Pistas/F1Pilotos. Sem WebGL, `criarGaragem` devolve null e a página fica com o fundo do CSS.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { montarF1, coresDa, f1Pronto, soltarF1 } from "/corrida/f1.js";

const reduz = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// `pos` e `alvo` em metros; `tela` desloca a imagem (fração da tela, x para a direita, y para baixo); `giro` é o ângulo do carro; `vivo` mantém o laço.
export const VISTAS = {
  menu: { pos: [-1.1, 1.0, 7.7], alvo: [0, 0.82, 0], fov: 29, tela: [0.17, 0.0], giro: 3.86, vivo: true, deriva: 1 },
  painel: { pos: [-1.0, 1.1, 8.8], alvo: [0, 0.8, 0], fov: 29, tela: [-0.15, -0.02], giro: 3.86, vivo: true, deriva: 1 },
  celular: { pos: [-1.0, 1.5, 7.4], alvo: [0, 0.42, 0], fov: 34, tela: [0, -0.22], giro: 3.86, vivo: true, deriva: 1 },
  sede: { pos: [-5.2, 1.3, 6.6], alvo: [-2.4, 1.0, 0], fov: 30, tela: [0, 0], giro: 3.5, vivo: false },
  dev: { pos: [-1.2, 1.25, 6.4], alvo: [0, 0.42, 0], fov: 29, tela: [-0.12, 0.04], giro: 3.86, vivo: true, arrasta: true },
  devCelular: { pos: [-1.0, 1.7, 9.6], alvo: [0, 0.4, 0], fov: 34, tela: [0, -0.24], giro: 3.86, vivo: true, arrasta: true },
};

const hexDe = (c, f = "#e10600") => { try { return new THREE.Color(c || f); } catch { return new THREE.Color(f); } };
function caixa(cena, w, a, d, cor, x, y, z, op = {}) {
  const mat = op.mat || (op.luz ? new THREE.MeshBasicMaterial({ color: cor, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: cor, roughness: op.rug ?? 0.62, metalness: op.met ?? 0.25, envMapIntensity: op.env ?? 0.6 }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, a, d), mat); m.position.set(x, y, z); if (op.rot) m.rotation.set(...op.rot); cena.add(m); return m;
}
function textura(larg, alt, pintar, op = {}) {
  const c = document.createElement("canvas"); c.width = larg; c.height = alt; pintar(c.getContext("2d"), larg, alt);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = op.aniso || 4; t._canvas = c; return t;
}
function gerador(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// o chão pintado (concreto escuro, faixa da equipe e linhas do box); a água e o reflexo saem do sombreador do piso
function pintarChao(x, W, H, cor1) {
  const m = (v) => (v / 60 + 0.5) * W; // metros para pixels (o piso tem 60 m)
  x.globalAlpha = 1; x.fillStyle = "#101116"; x.fillRect(0, 0, W, H);
  const r = gerador(7);
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() > 0.5 ? "rgba(255,255,255,.012)" : "rgba(0,0,0,.05)"; x.fillRect(r() * W, r() * H, 3 + r() * 30, 1 + r() * 5); }
  x.strokeStyle = "rgba(0,0,0,.42)"; x.lineWidth = 2; for (let v = -30; v <= 30; v += 4) { x.beginPath(); x.moveTo(m(v), 0); x.lineTo(m(v), H); x.stroke(); x.beginPath(); x.moveTo(0, m(v)); x.lineTo(W, m(v)); x.stroke(); }
  // as faixas pintadas: largas na diagonal, passando atrás do carro, como a pintura do box
  x.save(); x.translate(m(-3.2), m(1.5)); x.rotate(0.3);
  x.fillStyle = cor1; x.globalAlpha = 0.72; x.fillRect(-W, -34, W * 0.82, 68); x.globalAlpha = 0.5; x.fillRect(-W, 74, W * 0.82, 16); x.restore(); x.globalAlpha = 1;
  x.fillStyle = "rgba(235,238,245,.52)"; x.fillRect(0, m(-5.2), W, 7); x.fillStyle = cor1; x.globalAlpha = 0.5; x.fillRect(0, m(-4.9), W, 5); x.globalAlpha = 1;
  // a sombra embaixo do carro
  const g = x.createRadialGradient(m(0), m(0), 8, m(0), m(0), 150); g.addColorStop(0, "rgba(0,0,0,.92)"); g.addColorStop(0.55, "rgba(0,0,0,.62)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.save(); x.translate(m(0), m(0)); x.rotate(-0.86); x.scale(1.5, 0.62); x.fillStyle = g; x.translate(-m(0), -m(0)); x.fillRect(m(0) - 170, m(0) - 170, 340, 340); x.restore();
}
const SOMBREADOR_PISO = {
  name: "PisoMolhado",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tMapa: { value: null } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUvR; varying vec2 vUvM; varying vec3 vMundo;
    void main(){ vUvR = textureMatrix * vec4(position,1.); vUvM = uv; vec4 w = modelMatrix * vec4(position,1.); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tMapa; varying vec4 vUvR; varying vec2 vUvM; varying vec3 vMundo;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ return n(p)*.55+n(p*2.1)*.3+n(p*4.3)*.15; }
    void main(){
      float agua = smoothstep(.34,.62,fbm(vMundo.xz*.42));              // onde junta água
      float aspero = n(vMundo.xz*26.);
      vec2 uv = vUvR.xy/vUvR.w;
      float raio = mix(.018,.0035,agua);                                 // molhado reflete nítido; úmido, borrado na vertical
      vec3 r = vec3(0.); float soma = 0.;
      for(int i=-3;i<=3;i++){ for(int j=-1;j<=1;j++){ float p = 1./(1.+abs(float(i))*.45+abs(float(j)));
        r += texture2D(tDiffuse, uv+vec2(float(j)*raio*.55+(aspero-.5)*raio*.5, float(i)*raio*1.5)).rgb*p; soma += p; } }
      r /= soma;
      vec3 V = normalize(cameraPosition-vMundo);
      float fres = .22 + .78*pow(1.-max(V.y,0.),3.);
      vec3 base = texture2D(tMapa,vUvM).rgb;
      float dist = length(vMundo.xz);
      base *= mix(1.,.34,smoothstep(5.,22.,dist));
      gl_FragColor = vec4(base*(1.-.45*agua) + r*fres*mix(.42,1.,agua), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
// a cidade à noite que aparece pelo portão do box: morro escuro com janelas acesas e prédios
function pintarCidade(x, W, H) {
  x.filter = "blur(2.2px)"; const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0e1a"); g.addColorStop(0.55, "#141a2c"); g.addColorStop(0.72, "#2a2a3c"); g.addColorStop(1, "#0a0a10"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = gerador(31), morro = (v) => H * 0.5 + Math.sin(v * 0.006) * H * 0.09 + Math.sin(v * 0.019 + 2) * H * 0.03;
  x.fillStyle = "#0a0c14"; x.beginPath(); x.moveTo(0, H); for (let v = 0; v <= W; v += 8) x.lineTo(v, morro(v)); x.lineTo(W, H); x.fill();
  for (let i = 0; i < 620; i++) {
    const px = r() * W, w = 10 + r() * 34, base = morro(px) + 14 + r() * H * 0.24, a = 16 + r() * 58;
    x.fillStyle = `rgb(${14 + r() * 12},${15 + r() * 12},${24 + r() * 14})`; x.fillRect(px, base - a, w, a + 40);
    for (let wy = base - a + 3; wy < base + 16; wy += 6) for (let wx = px + 2; wx < px + w - 3; wx += 5) if (r() < 0.42) { x.fillStyle = r() < 0.72 ? `rgba(255,${190 + r() * 50},${110 + r() * 70},${0.45 + r() * 0.5})` : "rgba(205,225,255,.65)"; x.fillRect(wx, wy, 2.6, 3.4); }
  }
}
function pintarMarca(x, W, H, nome, cor1, cor2) {
  x.clearRect(0, 0, W, H);
  x.font = `italic 800 ${H * 0.24}px "Barlow Condensed", Impact, sans-serif`; x.textAlign = "left"; x.textBaseline = "middle"; x.fillStyle = "rgba(235,238,245,.88)";
  x.fillText(String(nome).toUpperCase(), H * 0.72, H * 0.45, W - H * 0.8);
  x.fillStyle = cor1; x.fillRect(H * 0.74, H * 0.68, W * 0.2, 5); x.fillStyle = "#e9ecf2"; x.fillRect(H * 0.74 + W * 0.2, H * 0.68, W * 0.1, 5); x.fillStyle = cor2; x.fillRect(H * 0.74 + W * 0.3, H * 0.68, W * 0.2, 5);
}

export function criarGaragem(host, op = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: op.leve ? "low-power" : "high-performance" }); } catch { return null; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.domElement.className = "gr-canvas"; renderer.domElement.setAttribute("aria-hidden", "true"); host.prepend(renderer.domElement);
  const cena = new THREE.Scene(); cena.background = new THREE.Color(0x05060a); cena.fog = new THREE.Fog(0x07080e, 12, 58);
  const pmrem = new THREE.PMREMGenerator(renderer), amb = pmrem.fromScene(new RoomEnvironment(), 0.04); cena.environment = amb.texture; cena.environmentIntensity = 0.42; pmrem.dispose();
  const cam = new THREE.PerspectiveCamera(29, 16 / 9, 0.1, 160);
  // luzes: o teto branco em cima, o recorte da cor da equipe por trás e um pouco de frente
  cena.add(new THREE.HemisphereLight(0xcbd6ff, 0x101014, 0.22));
  const teto = new THREE.DirectionalLight(0xffffff, 1.5); teto.position.set(-1, 8, 2.5); cena.add(teto);
  const frente = new THREE.DirectionalLight(0xfff4ea, 0.7); frente.position.set(5, 3, 7); cena.add(frente);
  const recorte = new THREE.DirectionalLight(0xffffff, 2.2); recorte.position.set(-7, 2.6, -6); cena.add(recorte);
  const recorte2 = new THREE.DirectionalLight(0xffffff, 1.4); recorte2.position.set(8, 2, -5); cena.add(recorte2);

  // ---------- o que muda de cor com a equipe ----------
  const cor1Mat = new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.46, metalness: 0.2, envMapIntensity: 0.7 });
  const cor1Luz = new THREE.MeshBasicMaterial({ color: 0xe10600, toneMapped: false });
  const chaoTex = textura(2048, 2048, (x, W, H) => pintarChao(x, W, H, "#e10600"), { aniso: 8 });
  const marcaTex = textura(1024, 256, (x, W, H) => pintarMarca(x, W, H, "", "#e10600", "#fff"));

  // ---------- o piso ----------
  const piso = new Reflector(new THREE.PlaneGeometry(60, 60), { clipBias: 0.002, textureWidth: 1024, textureHeight: 1024, multisample: 4, shader: SOMBREADOR_PISO, color: 0x777777 });
  piso.rotation.x = -Math.PI / 2; piso.material.uniforms.tMapa.value = chaoTex; cena.add(piso);

  // ---------- o box: teto, luzes compridas, pilares e paredes ----------
  caixa(cena, 60, 0.3, 60, 0x0b0c11, 0, 4.9, 0);
  for (let z = -14; z <= 10; z += 4) caixa(cena, 40, 0.34, 0.26, 0x16181f, 0, 4.58, z, { met: 0.6 });
  for (let x = -14; x <= 14; x += 7) caixa(cena, 0.22, 0.34, 34, 0x13151b, x, 4.5, -3, { met: 0.6 });
  const LED = 0xeef3ff;
  [[-3.4, -8.5, 7, 0.1], [4.2, -6.2, 6.6, -0.05], [-6.5, -2.6, 6, 0.08], [1.4, -1.5, 8, -0.03], [7.8, 0.6, 5.4, 0.1], [-2.2, 2.6, 7, -0.02]].forEach(([x, z, l, r]) => caixa(cena, l, 0.05, 0.3, LED, x, 4.36, z, { luz: true, rot: [0, r, 0] }));
  // a parede do fundo, com o portão aberto para a noite (de x = -3,4 até 15)
  caixa(cena, 12, 4.9, 0.4, 0x0d0e13, -11.6, 2.45, -14);
  caixa(cena, 26, 0.8, 0.5, 0x101116, 7, 4.5, -14, { met: 0.5 });
  caixa(cena, 0.5, 4.9, 34, 0x0b0c10, -17, 2.45, 2);
  caixa(cena, 0.5, 4.9, 34, 0x0d0e13, 19, 2.45, 2);
  // os pilares da equipe, à esquerda, e os frisos que acendem
  caixa(cena, 0.9, 4.3, 0.7, 0, -6.2, 2.15, -13.5, { mat: cor1Mat }); caixa(cena, 0.9, 4.3, 0.7, 0, -9.6, 2.15, -13.5, { mat: cor1Mat }); caixa(cena, 2.5, 4.3, 0.4, 0x17181e, -7.9, 2.15, -13.6);
  caixa(cena, 0.07, 3.9, 0.07, LED, -5.68, 2.05, -13.1, { luz: true }); caixa(cena, 0.07, 3.9, 0.07, LED, -9.08, 2.05, -13.1, { luz: true });
  caixa(cena, 0.06, 3.9, 0.06, 0, -6.7, 2.05, -13.1, { mat: cor1Luz });
  caixa(cena, 8, 0.07, 0.07, 0, -11, 4, -13.6, { mat: cor1Luz });
  // a marca da equipe na parede da direita
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: marcaTex, transparent: true, toneMapped: false, opacity: 0.92 }));
  marca.position.set(18.7, 2.7, -4.2); marca.rotation.y = -Math.PI / 2; cena.add(marca);

  // ---------- lá fora: a mureta do pit, a cerca, os postes e a cidade ----------
  const cidade = new THREE.Mesh(new THREE.PlaneGeometry(150, 54), new THREE.MeshBasicMaterial({ map: textura(4096, 1474, pintarCidade), fog: false, toneMapped: false, color: 0x8a8a8a }));
  cidade.position.set(8, 12, -80); cena.add(cidade);
  for (let i = 0; i < 26; i++) caixa(cena, 1.3, 0.55, 0.3, i % 2 ? 0x5a5d63 : 0, -6 + i * 1.3, 0.28, -26, i % 2 ? {} : { mat: cor1Mat });
  caixa(cena, 34, 2.2, 0.02, 0, 10, 1.85, -26, { mat: new THREE.MeshBasicMaterial({ color: 0x8894a8, transparent: true, opacity: 0.1 }) });
  for (let i = 0; i < 12; i++) caixa(cena, 0.05, 3, 0.05, 0x5a6270, -6 + i * 3, 1.5, -26, { met: 0.8 });
  for (const [x, z] of [[1.5, -34], [9, -38], [15, -32]]) { caixa(cena, 0.1, 6.5, 0.1, 0x2c303a, x, 3.25, z); caixa(cena, 0.9, 0.08, 0.26, 0xfff2d8, x + 0.3, 6.5, z, { luz: true }); }

  // ---------- os pneus e o carrinho de ferramentas, à direita ----------
  const geoPneu = new THREE.CylinderGeometry(0.36, 0.36, 0.34, 28), matPneu = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.82, metalness: 0.05 });
  const geoFaixa = new THREE.TorusGeometry(0.24, 0.018, 8, 36); geoFaixa.rotateX(Math.PI / 2);
  const pilha = (x, z, n) => { for (let i = 0; i < n; i++) { const y = 0.17 + i * 0.35; const p = new THREE.Mesh(geoPneu, matPneu); p.position.set(x, y, z); cena.add(p); const f = new THREE.Mesh(geoFaixa, cor1Luz); f.position.set(x, y + 0.172, z); cena.add(f); } };
  pilha(5.9, -7.6, 5); pilha(6.75, -7.6, 5); pilha(7.6, -7.6, 4); pilha(6.3, -6.9, 3); pilha(7.2, -6.85, 2);
  // o rack dos pneus
  caixa(cena, 3.1, 0.04, 0.04, 0x3a3f4b, 6.75, 1.9, -7.2, { met: 0.8 }); caixa(cena, 0.04, 1.9, 0.04, 0x3a3f4b, 5.2, 0.95, -7.2, { met: 0.8 }); caixa(cena, 0.04, 1.9, 0.04, 0x3a3f4b, 8.3, 0.95, -7.2, { met: 0.8 });
  // o carrinho
  caixa(cena, 1.5, 1.34, 0.75, 0, 9.4, 0.79, -5.6, { mat: cor1Mat });
  for (let i = 0; i < 5; i++) { caixa(cena, 1.4, 0.02, 0.01, 0x0a0a0c, 9.4, 0.3 + i * 0.25, -5.22); caixa(cena, 0.55, 0.03, 0.03, 0xc8ced8, 9.4, 0.4 + i * 0.25, -5.2, { met: 0.9, rug: 0.3 }); }
  for (const dx of [-0.6, 0.6]) caixa(cena, 0.1, 0.12, 0.1, 0x111111, 9.4 + dx, 0.06, -5.6);

  // ---------- o halo de névoa no portão ----------
  const nevoa = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ map: textura(256, 128, (x, W, H) => { const g = x.createRadialGradient(W / 2, H * 0.62, 4, W / 2, H * 0.62, W * 0.5); g.addColorStop(0, "rgba(120,140,190,.28)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  nevoa.position.set(6, 3.6, -15); cena.add(nevoa);

  // ---------- o carro ----------
  let carro = null, equipe = null, pedido = 0, parou = false;
  const palcoCarro = new THREE.Group(); cena.add(palcoCarro);
  const estado = { nome: null, de: null, t: 1, fim: null, sujo: true, tam: "", mx: 0, my: 0, gmx: 0, gmy: 0, giro: 0, giroAlvo: 0, extra: 0 };
  const posAgora = new THREE.Vector3(), alvoAgora = new THREE.Vector3(); let telaAgora = [0, 0], fovAgora = 29, primeiraVez = true;

  function pintarEquipe(id) {
    const FP = window.F1Pilotos, eq = FP?.EQUIPES[id] || {}, cores = coresDa(eq.pintura, eq.cor || "#e10600"), c1 = eq.cor || "#e10600", c2 = cores[1] || "#fff";
    const cor = hexDe(c1); cor1Mat.color.copy(cor).multiplyScalar(0.72); cor1Luz.color.copy(cor).multiplyScalar(1.5);
    recorte.color.copy(cor).lerp(new THREE.Color(0xffffff), 0.12); recorte2.color.set(0xffffff).lerp(cor, 0.5);
    pintarChao(chaoTex._canvas.getContext("2d"), 2048, 2048, c1); chaoTex.needsUpdate = true;
    const xm = marcaTex._canvas.getContext("2d"), W = 1024, H = 256; pintarMarca(xm, W, H, eq.nome || "", c1, c2); marcaTex.needsUpdate = true;
    const img = new Image(); img.onload = () => { if (equipe !== id || parou) return; const k = Math.min(H * 0.62 / img.height, H * 0.62 / img.width); xm.drawImage(img, H * 0.05, (H - img.height * k) / 2, img.width * k, img.height * k); marcaTex.needsUpdate = true; estado.sujo = true; ligar(); }; img.src = `/api/corrida/logo/${encodeURIComponent(id)}`;
    return cores;
  }
  async function trocarEquipe(id) {
    if (id === equipe || parou) return; equipe = id; const meu = ++pedido, cores = pintarEquipe(id); estado.sujo = true; ligar();
    await f1Pronto.catch(() => {});
    if (meu !== pedido || parou) return;
    if (carro) { palcoCarro.remove(carro.g); soltarF1(carro); carro = null; }
    try { carro = montarF1({ cor: cores[0], cor2: cores[1], equipe: id }); palcoCarro.add(carro.g); } catch (e) { console.warn("carro da garagem", e); }
    estado.sujo = true; ligar(); op.aoCarregar?.();
  }

  // ---------- a câmera ----------
  function ajustar() {
    const w = Math.max(2, host.clientWidth), hh = Math.max(2, host.clientHeight), pr = Math.min(window.devicePixelRatio || 1, op.leve ? 1 : 1.5), t = `${w}x${hh}@${pr}`;
    if (t === estado.tam) return; estado.tam = t; renderer.setPixelRatio(pr); renderer.setSize(w, hh, false); cam.aspect = w / hh; estado.sujo = true;
  }
  const distancia = () => Math.max(1, 1.62 / cam.aspect) ** 0.72; // tela estreita: recua para o carro caber
  function alvosDa(v) {
    const pf = new THREE.Vector3(...v.pos), af = new THREE.Vector3(...v.alvo); pf.sub(af).multiplyScalar(distancia()).add(af); return { pf, af };
  }
  function vista(nome, instantaneo) {
    const v = VISTAS[nome] || VISTAS.menu; if (estado.nome === nome) return; estado.nome = nome; estado.fim = v; estado.giroAlvo = v.giro; if (!v.arrasta) estado.extra = 0;
    ajustar();
    if (primeiraVez) { const { pf, af } = alvosDa(v); posAgora.copy(pf); alvoAgora.copy(af); telaAgora = [...v.tela]; fovAgora = v.fov; estado.giro = v.giro; primeiraVez = false; }
    estado.de = { pos: posAgora.clone(), alvo: alvoAgora.clone(), tela: [...telaAgora], fov: fovAgora }; estado.t = instantaneo || reduz() ? 1 : 0; estado.sujo = true; ligar();
  }
  function aplicarCamera() {
    const v = estado.fim, e = estado.t * estado.t * (3 - 2 * estado.t), { pf, af } = alvosDa(v);
    posAgora.lerpVectors(estado.de.pos, pf, e); alvoAgora.lerpVectors(estado.de.alvo, af, e);
    telaAgora = [estado.de.tela[0] + (v.tela[0] - estado.de.tela[0]) * e, estado.de.tela[1] + (v.tela[1] - estado.de.tela[1]) * e]; fovAgora = estado.de.fov + (v.fov - estado.de.fov) * e;
    cam.position.copy(posAgora);
    if (v.deriva && !reduz()) { const t = performance.now() / 1000; cam.position.x += Math.sin(t * 0.12) * 0.1 + estado.gmx * 0.22; cam.position.y += Math.sin(t * 0.09) * 0.03 - estado.gmy * 0.08; }
    cam.lookAt(alvoAgora); cam.fov = fovAgora;
    const w = renderer.domElement.width, hh = renderer.domElement.height; cam.setViewOffset(w, hh, -telaAgora[0] * w, -telaAgora[1] * hh, w, hh); cam.updateProjectionMatrix();
  }

  let raf = 0, ultimo = 0;
  function ligar() { if (!raf && !parou) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } }
  function quadro(t) {
    raf = 0; if (parou) return;
    const dt = Math.min(0.1, Math.max(0, t - ultimo) / 1000); ultimo = t;
    const viva = !!estado.fim?.deriva && !reduz(), girando = Math.abs(estado.giroAlvo + estado.extra - estado.giro) > 0.001;
    if (!document.hidden && host.isConnected && host.clientWidth && estado.fim) {
      ajustar();
      if (estado.t < 1) estado.t = Math.min(1, estado.t + dt / 0.9);
      estado.gmx += (estado.mx - estado.gmx) * Math.min(1, dt * 3); estado.gmy += (estado.my - estado.gmy) * Math.min(1, dt * 3);
      estado.giro += (estado.giroAlvo + estado.extra - estado.giro) * Math.min(1, dt * 7);
      if (viva || girando || estado.t < 1 || estado.sujo) {
        palcoCarro.rotation.y = estado.giro; palcoCarro.updateMatrixWorld(); aplicarCamera(); renderer.render(cena, cam); estado.sujo = false; op.aoDesenhar?.();
      }
    }
    if (document.hidden) return; // volta pelo visibilitychange
    if (viva || girando || estado.t < 1 || estado.sujo) raf = requestAnimationFrame(quadro);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => { ajustar(); estado.sujo = true; ligar(); }) : null; ro?.observe(host);
  const aoMover = (e) => { estado.mx = e.clientX / innerWidth - 0.5; estado.my = e.clientY / innerHeight - 0.5; };
  addEventListener("pointermove", aoMover, { passive: true });
  const aoVoltar = () => { if (!document.hidden) { estado.sujo = true; ligar(); } }; document.addEventListener("visibilitychange", aoVoltar);
  ajustar();

  // a posição na tela (em px do host) de um ponto do carro (metros, no sistema do carro): para os rótulos das peças
  const v3 = new THREE.Vector3();
  function naTela([x, y, z]) {
    v3.set(x, y, z).applyMatrix4(palcoCarro.matrixWorld).project(cam);
    return { x: (v3.x * 0.5 + 0.5) * host.clientWidth, y: (0.5 - v3.y * 0.5) * host.clientHeight };
  }
  return {
    trocarEquipe, vista, naTela,
    girar(d) { estado.extra += d; estado.sujo = true; ligar(); },
    get equipe() { return equipe; },
    parar() {
      parou = true; if (raf) cancelAnimationFrame(raf); raf = 0; ro?.disconnect(); removeEventListener("pointermove", aoMover); document.removeEventListener("visibilitychange", aoVoltar);
      if (carro) { palcoCarro.remove(carro.g); soltarF1(carro); carro = null; }
      cena.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) { m.map?.dispose?.(); m.dispose?.(); } });
      piso.dispose?.(); chaoTex.dispose(); marcaTex.dispose(); amb.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    },
  };
}
