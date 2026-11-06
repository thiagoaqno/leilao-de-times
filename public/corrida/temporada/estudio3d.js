// Corrida da Galera — o estúdio da Central da carreira: só o carro da equipe, sobre o fundo do CSS (o canvas é transparente, então o tema claro e o escuro
// trocam na hora). Mesmo jeito de usar da garagem3d.js: `trocarEquipe`, `vista`, `naTela`, `girar` e `parar`. Desenha só quando algo muda.
// Sem WebGL, `criarEstudio` devolve null e a página fica com o fundo do CSS.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { montarF1, coresDa, f1Pronto, soltarF1 } from "/corrida/f1.js";

const reduz = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// `pos` e `alvo` em metros; `tela` desloca a imagem (fração da tela); `giro` é o ângulo do carro
const VISTAS = {
  entrada: { pos: [0, 1.2, 9.2], alvo: [0, 0.42, 0], fov: 29, tela: [-0.2, 0.14], giro: 4.2 },
  entradaCelular: { pos: [0, 1.2, 7.6], alvo: [0, 0.42, 0], fov: 32, tela: [0, 0.06], giro: 4.2 },
  central: { pos: [0, 1.2, 8.1], alvo: [0, 0.42, 0], fov: 29, tela: [-0.03, 0.08], giro: 4.2 },
  centralCelular: { pos: [0, 1.2, 6.8], alvo: [0, 0.42, 0], fov: 32, tela: [0, -0.1], giro: 4.2 },
  dev: { pos: [0, 1.25, 10.4], alvo: [0, 0.42, 0], fov: 29, tela: [-0.22, 0.08], giro: 4.2 },
  devCelular: { pos: [0, 1.6, 10.2], alvo: [0, 0.4, 0], fov: 34, tela: [0, -0.24], giro: 4.2 },
};

export function criarEstudio(host, op = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return null; }
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "cx-estudio"; renderer.domElement.setAttribute("aria-hidden", "true"); host.append(renderer.domElement);
  const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(29, 16 / 9, 0.1, 80);
  const pmrem = new THREE.PMREMGenerator(renderer), amb = pmrem.fromScene(new RoomEnvironment(), 0.04); cena.environment = amb.texture; cena.environmentIntensity = 0.42; pmrem.dispose();
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 0.32));
  const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(-2, 7, 4); cena.add(sol);
  const frente = new THREE.DirectionalLight(0xfff6ec, 0.7); frente.position.set(5, 3, 7); cena.add(frente);

  // a sombra de contato embaixo do carro: uma textura só, sem mapa de sombra
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 18, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,.6)"); g.addColorStop(0.7, "rgba(0,0,0,.34)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const texSombra = new THREE.CanvasTexture(c), sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 6), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, toneMapped: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.004;
  const palco = new THREE.Group(); palco.add(sombra); cena.add(palco);

  let carro = null, equipe = null, pedido = 0, parou = false, raf = 0, ultimo = 0, nome = null, tam = "", giro = 4.2, giroAlvo = 4.2, extra = 0, sujo = true;
  let de = null, fim = VISTAS.central, t = 1;
  const posA = new THREE.Vector3(), alvoA = new THREE.Vector3(); let telaA = [...fim.tela], fovA = fim.fov, primeira = true;
  const distancia = () => Math.max(1, 1.62 / cam.aspect) ** 0.72;
  const alvos = (v) => { const af = new THREE.Vector3(...v.alvo); return { af, pf: new THREE.Vector3(...v.pos).sub(af).multiplyScalar(distancia()).add(af) }; };
  function ajustar() {
    const w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight), pr = Math.min(window.devicePixelRatio || 1, 1.5), id = `${w}x${h}@${pr}`;
    if (id === tam) return; tam = id; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); cam.aspect = w / h; sujo = true;
  }
  function aplicar() {
    const e = t * t * (3 - 2 * t), { pf, af } = alvos(fim);
    posA.lerpVectors(de.pos, pf, e); alvoA.lerpVectors(de.alvo, af, e); telaA = [de.tela[0] + (fim.tela[0] - de.tela[0]) * e, de.tela[1] + (fim.tela[1] - de.tela[1]) * e]; fovA = de.fov + (fim.fov - de.fov) * e;
    cam.position.copy(posA); cam.lookAt(alvoA); cam.fov = fovA;
    const w = renderer.domElement.width, h = renderer.domElement.height; cam.setViewOffset(w, h, -telaA[0] * w, -telaA[1] * h, w, h); cam.updateProjectionMatrix();
  }
  function ligar() { if (!raf && !parou) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } }
  function quadro(agora) {
    raf = 0; if (parou || document.hidden) return;
    const dt = Math.min(0.1, Math.max(0, agora - ultimo) / 1000); ultimo = agora;
    if (!host.isConnected || !host.clientWidth || !de) return;
    ajustar();
    if (t < 1) t = Math.min(1, t + dt / 0.8);
    giro += (giroAlvo + extra - giro) * Math.min(1, dt * 7);
    const girando = Math.abs(giroAlvo + extra - giro) > 0.001;
    if (t < 1 || girando || sujo) {
      palco.rotation.y = giro; palco.updateMatrixWorld(); aplicar(); renderer.render(cena, cam); sujo = false; op.aoDesenhar?.();
      raf = requestAnimationFrame(quadro);
    }
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => { ajustar(); sujo = true; ligar(); }) : null; ro?.observe(host);
  const aoVoltar = () => { if (!document.hidden) { sujo = true; ligar(); } }; document.addEventListener("visibilitychange", aoVoltar);
  ajustar();
  const v3 = new THREE.Vector3();
  return {
    async trocarEquipe(id) {
      if (id === equipe || parou) return; equipe = id; const meu = ++pedido, eq = window.F1Pilotos?.EQUIPES[id] || {}, cores = coresDa(eq.pintura, eq.cor || "#e10600");
      await f1Pronto.catch(() => {});
      if (meu !== pedido || parou) return;
      if (carro) { palco.remove(carro.g); soltarF1(carro); carro = null; }
      try { carro = montarF1({ cor: cores[0], cor2: cores[1], equipe: id }); palco.add(carro.g); } catch (e) { console.warn("carro do estúdio", e); }
      sujo = true; ligar(); op.aoCarregar?.();
    },
    vista(n, instantaneo) {
      const v = VISTAS[n] || VISTAS.central; if (nome === n) return; nome = n; fim = v; giroAlvo = v.giro; extra = 0; ajustar();
      if (primeira) { const { pf, af } = alvos(v); posA.copy(pf); alvoA.copy(af); telaA = [...v.tela]; fovA = v.fov; giro = v.giro; primeira = false; }
      de = { pos: posA.clone(), alvo: alvoA.clone(), tela: [...telaA], fov: fovA }; t = instantaneo || reduz() ? 1 : 0; sujo = true; ligar();
    },
    naTela([a, b, d]) { v3.set(a, b, d).applyMatrix4(palco.matrixWorld).project(cam); return { x: (v3.x * 0.5 + 0.5) * host.clientWidth, y: (0.5 - v3.y * 0.5) * host.clientHeight }; },
    girar(d) { extra += d; sujo = true; ligar(); },
    get equipe() { return equipe; },
    parar() {
      parou = true; if (raf) cancelAnimationFrame(raf); raf = 0; ro?.disconnect(); document.removeEventListener("visibilitychange", aoVoltar);
      if (carro) { palco.remove(carro.g); soltarF1(carro); carro = null; }
      sombra.geometry.dispose(); sombra.material.dispose(); texSombra.dispose(); amb.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    },
  };
}
