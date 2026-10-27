// Corrida da Galera — o desfoque de velocidade e o ajuste de qualidade.
// Desfoque: depois de desenhar a cena, um passe na placa de vídeo puxa cada ponto da tela para fora, a partir do centro
// (como uma foto tirada em movimento). O centro, para onde se olha, e o carro, embaixo no meio, ficam nítidos; o cenário
// dos lados borra mais quanto mais rápido. Parado (ou com "menos movimento" no sistema), a cena vai direto para a tela.
// Qualidade: se o jogo fica lento para a tela (ver medirQuadro), baixa a resolução, depois a sombra (mapa menor: não mexe
// em nenhum shader), e só no último caso tira as sombras e o desfoque (isso recompila os shaders, por isso fica por último).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { renderer, scene, cam, sun } from "./cena.js";

const RADIAL = {
  uniforms: { tDiffuse: { value: null }, forca: { value: 0 }, aspecto: { value: 16 / 9 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float forca; uniform float aspecto; varying vec2 vUv;
    void main() {
      vec2 centro = vec2(0.5, 0.56), dir = vUv - centro;
      float longe = length(dir * vec2(aspecto, 1.0));
      float m = smoothstep(0.22, 0.85, longe);                                   // o miolo fica nítido
      float carro = length((vUv - vec2(0.5, 0.2)) * vec2(aspecto * 1.6, 3.2));
      m *= smoothstep(0.55, 1.0, carro);                                         // e o carro, embaixo no meio
      float passo = forca * m * 0.09;
      vec4 c = vec4(0.0);
      for (int i = 0; i < 10; i++) c += texture2D(tDiffuse, vUv - dir * passo * float(i) / 9.0);
      gl_FragColor = c / 10.0;
    }`,
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const radial = new ShaderPass(RADIAL); composer.addPass(radial);
composer.addPass(new OutputPass());
const reduz = matchMedia("(prefers-reduced-motion: reduce)");
let nivel = 0; // 0 = tudo; 1 = resolução menor; 2 = sombra de 512 (em vez de 1024); 3 = sem sombras e sem desfoque

export function ajustarTela(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); radial.uniforms.aspecto.value = w / h; }
// forca: 0 (nítido) a 1 (bem borrado); com turbo vai até 1,4
export function desenhar(forca) {
  if (forca < 0.03 || reduz.matches || nivel >= 3) { renderer.render(scene, cam); return; }
  radial.uniforms.forca.value = Math.min(1.4, forca);
  composer.render();
}
// Mede os quadros por segundo em trechos de 2 s e só desce de nível quando baixar ajuda de verdade:
// - não mede nos primeiros 6 s da corrida (carregando texturas e montando os shaders, todo computador engasga);
// - compara com o melhor que esta tela já conseguiu (o "teto"): tela de 50 Hz, ou navegador economizando bateria
//   (que prende em 30 qps), não é lentidão, e baixar a qualidade ali não muda nada;
// - depois de descer, confere: se os quadros não melhoraram, era um limite da tela e não da placa, então volta o nível
//   e para de mexer. Quem quiser fixar escreve no console localStorage["corrida:qualidade"] = "alta" (ou "baixa").
const fixa = (() => { try { return localStorage.getItem("corrida:qualidade"); } catch { return null; } })();
let quadros = 0, desde = performance.now(), ruins = 0, teto = 0, inicio = 0, conferir = null, parou = fixa === "alta";
function aplicar(n) {
  if (n >= 1 !== nivel >= 1) { renderer.setPixelRatio(n >= 1 ? 0.85 : Math.min(window.devicePixelRatio || 1, 1.25)); const s = renderer.getSize(new THREE.Vector2()); ajustarTela(s.x, s.y); }
  if (n >= 2 !== nivel >= 2) { // só o tamanho do mapa de sombra: o navegador refaz a textura dele, sem recompilar nenhum shader no meio da corrida
    const px = n >= 2 ? 512 : 1024; sun.shadow.mapSize.set(px, px);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  if (n >= 3 !== nivel >= 3) { renderer.shadowMap.enabled = n < 3; scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); } // o último recurso: aí sim recompila
  nivel = n;
}
if (fixa === "baixa") aplicar(3);
// chamada a cada corrida nova: o relógio dos 6 s recomeça
export function comecarMedida() { inicio = performance.now(); quadros = 0; desde = inicio; ruins = 0; }
export function medirQuadro() {
  quadros++; const agora = performance.now(), dt = agora - desde;
  if (dt < 2000) return;
  const fps = (quadros * 1000) / dt; quadros = 0; desde = agora;
  if (document.hidden || agora - inicio < 6000 || dt > 3000) { ruins = 0; return; } // escondida ou travou (aba trocada): não conta
  teto = Math.max(teto, fps);
  if (conferir) { // acabou de descer: melhorou pelo menos 10%?
    if (++conferir.n < 2) return;
    if (fps < conferir.fps * 1.1) { aplicar(conferir.antes); parou = true; console.info("Corrida: baixar a qualidade não ajudou (" + fps.toFixed(0) + " qps); voltou ao nível " + nivel); }
    conferir = null; return;
  }
  if (parou || nivel >= 3) return;
  const ruim = fps < 50 && fps < teto * 0.8; // lento para esta tela, não só para uma tela de 60 Hz
  if (!ruim) { ruins = 0; return; }
  if (++ruins < 2) return;
  ruins = 0; conferir = { antes: nivel, fps, n: 0 };
  aplicar(nivel + 1);
  console.info("Corrida: qualidade reduzida para manter a fluidez (nível " + nivel + ", " + fps.toFixed(0) + " qps, a tela já fez " + teto.toFixed(0) + ")");
}
