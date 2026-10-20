// Corrida da Galera — o desfoque de velocidade e o ajuste de qualidade.
// Desfoque: depois de desenhar a cena, um passe na placa de vídeo puxa cada ponto da tela para fora, a partir do centro
// (como uma foto tirada em movimento). O centro, para onde se olha, e o carro, embaixo no meio, ficam nítidos; o cenário
// dos lados borra mais quanto mais rápido. Parado (ou com "menos movimento" no sistema), a cena vai direto para a tela.
// Qualidade: se o jogo fica abaixo de ~50 quadros por segundo, baixa a resolução, depois tira as sombras e, só no último
// caso, o desfoque.
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
let nivel = 0; // 0 = tudo; 1 = resolução menor; 2 = sem sombras; 3 = sem desfoque

export function ajustarTela(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); radial.uniforms.aspecto.value = w / h; }
// forca: 0 (nítido) a 1 (bem borrado); com turbo vai até 1,4
export function desenhar(forca) {
  if (forca < 0.03 || reduz.matches || nivel >= 3) { renderer.render(scene, cam); return; }
  radial.uniforms.forca.value = Math.min(1.4, forca);
  composer.render();
}
// mede os quadros por segundo; dois trechos de 2 s abaixo de 50, desce um nível (nunca volta: evita ficar pulando)
let quadros = 0, desde = performance.now(), ruins = 0;
export function medirQuadro() {
  quadros++; const agora = performance.now(), dt = agora - desde;
  if (dt < 2000) return;
  const fps = (quadros * 1000) / dt; quadros = 0; desde = agora;
  if (document.hidden || fps > 50) { ruins = 0; return; }
  if (++ruins < 2 || nivel >= 3) return;
  ruins = 0; nivel++;
  if (nivel === 1) { renderer.setPixelRatio(0.85); const s = renderer.getSize(new THREE.Vector2()); ajustarTela(s.x, s.y); }
  if (nivel === 2) { renderer.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); } // sem sombras
  console.info("Corrida: qualidade reduzida para manter a fluidez (nível " + nivel + ", " + fps.toFixed(0) + " qps)");
}
