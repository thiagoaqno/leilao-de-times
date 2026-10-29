// Corrida da Galera — o pós-processamento: o que acontece com a imagem depois da cena desenhada. Quem manda é a qualidade
// (qualidade.js): Baixa desenha direto na tela; Média e Alta passam a cena por uma fila de passes (EffectComposer, em cor linear
// de 16 bits, para as luzes fortes passarem de 1):
//   1. a cena (RenderPass; com suavização de serrilhado: 2 amostras na Média, 4 na Alta)
//   2. [Alta] o desfoque radial de velocidade: puxa cada ponto da tela para fora, a partir do centro; o miolo e o carro, embaixo
//      no meio, ficam nítidos e o cenário dos lados borra mais quanto mais rápido (sem "menos movimento" no sistema)
//   3. o brilho (bloom) das luzes fortes: só o que passa de 1 de claridade (luz traseira, refletores, brilho do sol nos carros e
//      no molhado); Média em meia resolução, Alta completo
//   4. o ajuste de tons do renderer (ACES, com a exposição que clima-visual.js baixa na chuva) e a cor sRGB (OutputPass)
//   5. a correção de cor (GRADE): saturação, contraste e tom pela chuva, pela água na pista e pela noite, um véu de neblina no
//      fundo na chuva, o brilho do sol de frente, a vinheta e um pontilhado que esconde as faixas nos escuros
// Tudo sobre a mesma câmera `cam` (a primeira pessoa, a TV e as outras de cameras.js), então vale para todas. O canvas 2D das
// gotas na tela fica por cima, fora daqui.
// Luzes que precisam brilhar (a lanterna LED do carro, o disco de freio em brasa, as lâmpadas dos refletores): os materiais "sem
// ajuste de tons" (`toneMapped: false`) ou marcados com `userData.bloom` (o ganho) ganham um multiplicador no sombreador, ligado
// só quando há pós (varrer/preparar), porque a cor deles passa de 1 só no pós-processamento e na Baixa continua a de sempre.
// Qualidade de desempenho: se o jogo fica lento para a tela (ver medirQuadro), desce sozinho: Alta → Média (com um aviso), depois
// a resolução, a sombra (mapa menor: não mexe em nenhum shader) e, só no último caso, tira as sombras e o pós (isso recompila os
// shaders, por isso fica por último).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { renderer, scene, cam, sun } from "./cena.js";
import { clima } from "./clima.js";
import { E, toast } from "./estado.js";
import { qualidade, aoMudar, pixelRatioDe, rebaixar, restaurar } from "./qualidade.js";

// ---------- os ajustes de cada qualidade (mexa aqui para afinar) ----------
const AJUSTE = {
  //          amostras do serrilhado · bloom: força, raio, limiar de claridade (linear, antes do ajuste de tons) e a faixa de entrada
  media: { amostras: 2, meia: true, bloom: { forca: 0.4, raio: 0.5, limiar: 1.1, faixa: 0.6 } },
  alta: { amostras: 4, meia: false, bloom: { forca: 0.6, raio: 0.6, limiar: 1.0, faixa: 0.6 } },
};
const CLARO_LUZ = 1.6; // as luzes "sem ajuste de tons" (toneMapped: false) passam a valer essa claridade no pós (o bloom pega acima de 1)

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
      if (passo < 0.0004) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 c = vec4(0.0);
      for (int i = 0; i < 10; i++) c += texture2D(tDiffuse, vUv - dir * passo * float(i) / 9.0);
      gl_FragColor = c / 10.0;
    }`,
};

// A correção de cor, depois do ajuste de tons (então o que entra já é sRGB, de 0 a 1).
const GRADE = {
  uniforms: {
    tDiffuse: { value: null }, aspecto: { value: 16 / 9 },
    chuva: { value: 0 }, molhado: { value: 0 }, noite: { value: 0 }, sat: { value: 1 }, contraste: { value: 1 }, vinheta: { value: 0.25 },
    bruma: { value: new THREE.Color(0.6, 0.65, 0.7) }, sol: { value: new THREE.Vector3(0.5, 0.5, 0) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float aspecto, chuva, molhado, noite, sat, contraste, vinheta; uniform vec3 bruma, sol; varying vec2 vUv;
    float ruido(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(L), c, sat);                                                          // saturação: cai na chuva
      c *= mix(vec3(1.0), vec3(1.03, 1.005, 0.965), 0.5 * (1.0 - molhado) * (1.0 - noite)); // seco: um pouco quente
      c *= mix(vec3(1.0), vec3(0.93, 0.985, 1.07), clamp(chuva * 0.85 + molhado * 0.2 + noite * 0.4, 0.0, 1.0)); // chuva e noite: frio
      c = (c - 0.45) * contraste + 0.45;                                                  // contraste em torno do cinza médio
      float fundo = smoothstep(0.30, 0.62, vUv.y);                                        // do horizonte para cima: o que está longe
      c = mix(c, bruma, 0.30 * chuva * fundo);                                            // o véu da chuva (a cor da neblina)
      c += (1.0 - c) * 0.04 * chuva;                                                      // pretos mais levantados na chuva
      c = clamp(c, 0.0, 1.0);
      c = max(c - 0.012 * noite, 0.0) / (1.0 - 0.012 * noite);                            // noite: pretos fundos...
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.5 * noite);                                   // ...e uma curva em S
      float d = length((vUv - sol.xy) * vec2(aspecto, 1.0));                              // o brilho do sol, de frente
      float g = sol.z * (exp(-d * 6.0) * 0.30 + exp(-d * 1.8) * 0.10);
      c = 1.0 - (1.0 - c) * (1.0 - g * vec3(1.0, 0.93, 0.78));
      float v = smoothstep(0.38, 1.05, length((vUv - 0.5) * vec2(aspecto, 1.0)));        // a vinheta
      c *= 1.0 - vinheta * v * v;
      c += (ruido(gl_FragCoord.xy) - 0.5) / 255.0;                                        // pontilhado contra as faixas
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

// um pixel inválido (NaN ou infinito, de algum sombreador numa conta 0/0) é espalhado pelo bloom e pinta a tela de preto, piscando
// conforme a câmera anda: este passe troca qualquer pixel inválido por preto e limita o brilho antes do bloom
const LIMPA = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = clamp(c, 0.0, 64.0); }`,
};

// ---------- a fila de passes de cada qualidade (montada na primeira vez que a qualidade é usada) ----------
const tam = new THREE.Vector2();
const feitos = {}; // { media: {composer, grade, radial, w, h, pr}, alta: {...} }
const ok16 = () => renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
function montar(q) {
  const cfg = AJUSTE[q], composer = new EffectComposer(renderer);
  const amostras = ok16() ? cfg.amostras : 0; // sem alvo de 16 bits com amostras o quadro sairia preto: aí fica sem suavização
  composer.renderTarget1.samples = composer.renderTarget2.samples = amostras;
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new ShaderPass(LIMPA));
  let radial = null;
  if (q === "alta") { radial = new ShaderPass(RADIAL); composer.addPass(radial); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), cfg.bloom.forca, cfg.bloom.raio, cfg.bloom.limiar);
  bloom.highPassUniforms.smoothWidth.value = cfg.bloom.faixa;
  if (cfg.meia) { const set = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => set(Math.max(2, w >> 1), Math.max(2, h >> 1)); } // bloom barato: metade da resolução
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE); composer.addPass(grade);
  return { composer, grade, radial, w: 0, h: 0, pr: 0 };
}
function pronto(q) {
  const f = feitos[q] || (feitos[q] = montar(q)), pr = renderer.getPixelRatio();
  renderer.getSize(tam);
  if (f.w !== tam.x || f.h !== tam.y || f.pr !== pr) {
    f.w = tam.x; f.h = tam.y; f.pr = pr;
    f.composer.setPixelRatio(pr); f.composer.setSize(tam.x, tam.y);
    f.grade.uniforms.aspecto.value = tam.x / Math.max(1, tam.y);
    if (f.radial) f.radial.uniforms.aspecto.value = tam.x / Math.max(1, tam.y);
  }
  return f;
}

// ---------- o brilho das luzes fortes ----------
const lim = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const luma = (c) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const GANHO_LUZ = { value: 0 }; // 0 sem pós, 1 com pós (compartilhado por todos os materiais marcados)
const vistos = new WeakSet();
function preparar(m) {
  if (!m || vistos.has(m)) return; vistos.add(m);
  let ganho = (m.userData && m.userData.bloom) || 0;
  if (!ganho && m.isMeshBasicMaterial && m.toneMapped === false) ganho = lim(CLARO_LUZ / Math.max(0.05, luma(m.color)), 1.8, 6); // a luz vermelha pura vale pouco de claridade: precisa de mais ganho que a amarela
  ganho = Math.round(ganho * 2) / 2;
  if (!(ganho > 1)) return;
  const antes = m.onBeforeCompile, chaveAntes = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    if (antes) antes.call(this, sh, r);
    sh.uniforms.ganhoLuz = GANHO_LUZ;
    sh.fragmentShader = "uniform float ganhoLuz;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>\n  diffuseColor.rgb *= 1.0 + ${(ganho - 1).toFixed(1)} * ganhoLuz;`);
  };
  m.customProgramCacheKey = function () { return (chaveAntes ? chaveAntes.call(this) : "") + "|luz" + ganho; };
  m.needsUpdate = true;
}
let ultVarredura = 0;
function varrer(agora) {
  ultVarredura = agora;
  scene.traverse((o) => { const m = o.material; if (m) { if (Array.isArray(m)) m.forEach(preparar); else preparar(m); } });
}

// ---------- a cor pelo clima e pela hora ----------
let R = 0, W = 0, N = 0, ultCor = 0; // a chuva, a água na pista e a noite, suavizadas (sobem e descem devagar, sem salto)
const sDir = new THREE.Vector3(), sFrente = new THREE.Vector3(), sPonto = new THREE.Vector3();
const ehNoite = () => (E.S && E.S.config && E.S.config.hora === "noite") || (scene.fog ? luma(scene.fog.color) < 0.045 : false); // (Tóquio e o arco-íris são noturnos de qualquer jeito)
function atualizarCor(g, agora) {
  const dt = lim((agora - ultCor) / 1000, 0, 0.25); ultCor = agora;
  const k = (t) => 1 - Math.exp(-dt / t);
  R += (lim(clima.chuva) - R) * k(4); W += (lim(clima.agua) - W) * k(3); N += ((ehNoite() ? 1 : 0) - N) * k(1.2);
  const Rc = lim(R * 1.5); // qualquer chuva, até a garoa (0,45), já deixa a imagem cinza e fria; a forte (1) passa pouco disso
  const molhado = Math.max(Rc, W * 0.7), u = g.uniforms;
  u.chuva.value = Rc; u.molhado.value = molhado; u.noite.value = N;
  u.sat.value = 1.07 - 0.30 * molhado - 0.05 * N;
  u.contraste.value = 1.08 - 0.17 * molhado + 0.07 * N;
  u.vinheta.value = 0.24 + 0.12 * R + 0.10 * N;
  if (scene.fog) { const f = scene.fog.color, e = 1 / 2.2; u.bruma.value.setRGB(Math.pow(f.r, e) * 0.95, Math.pow(f.g, e) * 0.95, Math.pow(f.b, e) * 0.95); }
  // o brilho do sol: só com ele no campo de visão, acima do horizonte, e some na chuva e de noite
  sDir.copy(sun.position).sub(sun.target.position).normalize(); cam.getWorldDirection(sFrente);
  const d = sFrente.dot(sDir), forca = lim((d - 0.35) / 0.4) * (1 - R) * (1 - N) * lim(sDir.y * 6);
  if (forca > 0.001) { sPonto.copy(cam.position).addScaledVector(sDir, 4000).project(cam); u.sol.value.set(sPonto.x * 0.5 + 0.5, sPonto.y * 0.5 + 0.5, forca); }
  else u.sol.value.z = 0;
}

// ---------- desenhar ----------
let nivel = 0; // o desempenho: 0 = como a qualidade escolhida; 1 = resolução menor; 2 = sombra de 512; 3 = sem sombras e sem pós
let atual = null; // a qualidade que o pós aplica agora
const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const efetivaPos = () => (nivel >= 3 ? "baixa" : qualidade());
function aplicarRazao() {
  const r = Math.min(pixelRatioDe(qualidade()), nivel >= 1 ? 0.85 : 99);
  if (r === renderer.getPixelRatio()) return;
  const s = renderer.getSize(tam); renderer.setPixelRatio(r); renderer.setSize(s.x, s.y, false); // o canvas é dimensionado pelo CSS (updateStyle false, como em jogo.js)
}
function aplicarQualidade() {
  const q = efetivaPos(); aplicarRazao();
  GANHO_LUZ.value = q === "baixa" ? 0 : 1;
  if (q !== atual) { atual = q; ultVarredura = 0; ultCor = performance.now(); N = ehNoite() ? 1 : 0; }
  reiniciarMedida();
}
aoMudar(aplicarQualidade);

export function ajustarTela() { if (atual && atual !== "baixa" && feitos[atual]) pronto(atual); }
// forca: 0 (nítido) a 1 (bem borrado); com turbo vai até 1,4
export function desenhar(forca) {
  const q = efetivaPos(); if (q !== atual) aplicarQualidade();
  if (q === "baixa") { renderer.render(scene, cam); return; }
  const agora = performance.now();
  if (agora - ultVarredura > 1500) varrer(agora);
  try {
    const f = pronto(q);
    atualizarCor(f.grade, agora);
    if (f.radial) { f.radial.enabled = forca >= 0.03 && !reduz.matches; f.radial.uniforms.forca.value = Math.min(1.4, forca); }
    f.composer.render();
  } catch (e) { // o pós quebrou neste aparelho (placa sem alvo de 16 bits, por exemplo): fica na Baixa, sem mexer na escolha guardada
    console.warn("Corrida: o pós-processamento falhou, voltando para a qualidade Baixa", e);
    rebaixar("baixa"); renderer.render(scene, cam);
  }
}

// Compila os sombreadores dos passes (desfoque radial, brilho, correção de cor) sem esperar o primeiro quadro: chamado pelo aquecimento da
// pista (jogo.js), durante a contagem. A correção de cor é o que leva a chuva (só uniformes: não troca de sombreador com ela ligada).
// Cada um com o alvo certo: o último passe desenha na tela e os outros numa imagem (a cor de saída entra na chave do programa).
export function compilarPos() {
  const q = efetivaPos(); if (q === "baixa") return Promise.resolve();
  try {
    const f = pronto(q), cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), plano = new THREE.PlaneGeometry(2, 2);
    const porImagem = new THREE.Group(), naTela = new THREE.Group(), vistos = new Set();
    const junta = (g, m) => { if (m && m.isMaterial && !vistos.has(m)) { vistos.add(m); g.add(new THREE.Mesh(plano, m)); } };
    if (f.radial) junta(porImagem, f.radial.material);
    for (const p of f.composer.passes) if (p.materialHighPassFilter) { // o UnrealBloomPass
      junta(porImagem, p.materialHighPassFilter); (p.separableBlurMaterials || []).forEach((m) => junta(porImagem, m)); junta(porImagem, p.compositeMaterial); junta(porImagem, p.blendMaterial);
    }
    junta(naTela, f.grade.material);
    const anterior = renderer.getRenderTarget(), feitos2 = [];
    try { renderer.setRenderTarget(f.composer.renderTarget1); feitos2.push(renderer.compileAsync(porImagem, cam2)); } finally { renderer.setRenderTarget(anterior); }
    feitos2.push(renderer.compileAsync(naTela, cam2));
    return Promise.all(feitos2).then(() => {}, () => {}).finally(() => plano.dispose());
  } catch (e) { console.warn("Corrida: não deu para pré-compilar o pós", e); return Promise.resolve(); }
}

// ---------- o desempenho ----------
// Mede os quadros por segundo em trechos de 2 s e só desce de nível quando baixar ajuda de verdade:
// - não mede nos primeiros 6 s da corrida (carregando texturas e montando os shaders, todo computador engasga);
// - na Alta, menos de 45 qps por dois trechos seguidos já é lento; nas outras, compara com o melhor que esta tela já conseguiu
//   (o "teto"): tela de 50 Hz, ou navegador economizando bateria (que prende em 30 qps), não é lentidão;
// - depois de descer, confere: se os quadros não melhoraram, era um limite da tela e não da placa, então volta o nível
//   e para de mexer.
let quadros = 0, desde = performance.now(), ruins = 0, teto = 0, inicio = 0, conferir = null, parou = false;
function reiniciarMedida() { quadros = 0; desde = performance.now(); ruins = 0; conferir = null; parou = false; }
function aplicar(n) {
  const antes = nivel; nivel = n;
  if (n >= 1 !== antes >= 1) aplicarRazao();
  if (n >= 2 !== antes >= 2) { // só o tamanho do mapa de sombra: o navegador refaz a textura dele, sem recompilar nenhum shader no meio da corrida
    const px = n >= 2 ? 512 : 1024; sun.shadow.mapSize.set(px, px);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  if (n >= 3 !== antes >= 3) { renderer.shadowMap.enabled = n < 3; scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); GANHO_LUZ.value = n >= 3 || qualidade() === "baixa" ? 0 : 1; } // o último recurso: aí sim recompila
}
// chamada a cada corrida nova: o relógio dos 6 s recomeça
export function comecarMedida() { inicio = performance.now(); quadros = 0; desde = inicio; ruins = 0; ultCor = inicio; N = ehNoite() ? 1 : 0; R = lim(clima.chuva); W = lim(clima.agua); ultVarredura = 0; }
// o passo de baixar: devolve como desfazer
function baixar() {
  if (qualidade() === "alta") { rebaixar("media"); return { desfazer: () => restaurar("alta"), nome: "Alta → Média" }; }
  const n = nivel; aplicar(n + 1); return { desfazer: () => aplicar(n), nome: "nível " + (n + 1) };
}
export function medirQuadro() {
  quadros++; const agora = performance.now(), dt = agora - desde;
  if (dt < 2000) return;
  const fps = (quadros * 1000) / dt; quadros = 0; desde = agora;
  if (document.hidden || agora - inicio < 6000 || dt > 3000) { ruins = 0; return; } // escondida ou travou (aba trocada): não conta
  teto = Math.max(teto, fps);
  if (conferir) { // acabou de descer: melhorou pelo menos 10%?
    if (++conferir.n < 2) return;
    if (fps < conferir.fps * 1.1) { conferir.desfazer(); parou = true; console.info("Corrida: baixar a qualidade não ajudou (" + fps.toFixed(0) + " qps); voltou ao que era"); }
    else if (conferir.aviso) toast("⚠️ Os gráficos Alta deixaram o jogo lento: passei para Média. Dá para trocar no botão Gráficos (ou na tecla G).", 4200);
    conferir = null; return;
  }
  if (parou || nivel >= 3) return;
  const alta = qualidade() === "alta" && nivel === 0;
  const ruim = alta ? fps < 45 : fps < 50 && fps < teto * 0.8; // lento para esta tela, não só para uma tela de 60 Hz
  if (!ruim) { ruins = 0; return; }
  if (++ruins < 2) return;
  ruins = 0;
  const passo = baixar(); conferir = { fps, n: 0, desfazer: passo.desfazer, aviso: alta };
  console.info("Corrida: qualidade reduzida para manter a fluidez (" + passo.nome + ", " + fps.toFixed(0) + " qps, a tela já fez " + teto.toFixed(0) + ")");
}
