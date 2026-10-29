// Corrida da Galera — a água no asfalto: a máscara de água da pista (feita uma vez por pista) e o sombreador do asfalto molhado.
// A máscara é uma textura (lado a lado da pista × volta inteira) com, por canal:
//   R · onde a água junta (pontos baixos do relevo, beiradas e manchas) — as poças nascem daqui quando a pista encharca
//   G · onde ela é mais seca: os dois sulcos do traçado ideal (as rodas) e a faixa larga em volta dele
//   B · manchas para variar a rugosidade (borracha, óleo, remendo): a película não é lisa igual em todo canto
// O traçado ideal sai da curvatura da pista: por dentro no ápice e um pouco por fora na entrada e na saída (não precisa da IA).
// O sombreador (MeshStandardMaterial + onBeforeCompile) lê `uAgua` (0 seco a 1 encharcado, o clima-visual.js escreve por quadro)
// e a máscara; escurece o asfalto, baixa a rugosidade (película fina e poças espelhadas), torce a normal em marolas esticadas
// ao longo da pista, soma o reflexo do céu na beira do campo de visão e riscos verticais de luz dos carros mais perto (luz
// traseira vermelha e faróis): o reflexo de uma luz num chão molhado aparece como um traço que desce dela até quem olha.
// Cada carro perto também deixa um rastro um pouco mais seco por trás (`uCarros`). Sem água (`uAgua` ≈ 0) o sombreador não faz nada.
import * as THREE from "three";

export const N_CARROS_AGUA = 6;
const lim = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const suave = (a, b, v) => { const k = lim((v - a) / (b - a)); return k * k * (3 - 2 * k); };
const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));

// ruído de valor determinístico; `per` (inteiro) faz o eixo y dar a volta (a emenda da volta não aparece)
function hash(i, j) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function ruido(x, y, per) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), j0 = ((j % per) + per) % per, j1 = (j0 + 1) % per;
  const a = hash(i, j0), b = hash(i + 1, j0), c = hash(i, j1), d = hash(i + 1, j1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// média móvel numa volta fechada (`meio` pontos de cada lado)
function caixa(a, meio) {
  const n = a.length, out = new Float32Array(n); let s = 0;
  for (let k = -meio; k <= meio; k++) s += a[((k % n) + n) % n];
  for (let i = 0; i < n; i++) { out[i] = s / (2 * meio + 1); s += a[(i + meio + 1) % n] - a[(((i - meio) % n) + n) % n]; }
  return out;
}

// o traçado ideal: o deslocamento lateral (em unidades, + é o lado de p.nx) em cada ponto da pista
export function linhaIdeal(tr) {
  const { pts, n, W } = tr, giro = new Float32Array(n), lat = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 8) % n], c = p.tx * q.ty - p.ty * q.tx;
    giro[i] = (c > 0 ? 1 : -1) * lim((p.k || 0) * 220) * (Math.abs(c) > 1e-4 ? 1 : 0); // + é curva para o lado de p.nx (o lado de dentro está lá)
  }
  const apice = caixa(giro, 10), entrada = caixa(giro, 40);
  for (let i = 0; i < n; i++) lat[i] = lim((apice[i] - 0.5 * entrada[i]) * 0.34 * W, -0.33 * W, 0.33 * W);
  return lat;
}

// a máscara de água da pista, uma vez por pista (fica em tr.aguaMascara)
export function mascaraAgua(tr) {
  if (tr.aguaMascara) return tr.aguaMascara;
  const { pts, n, W } = tr, LAT = 64, rows = Math.min(n, 4096), data = new Uint8Array(LAT * rows * 4), linha = linhaIdeal(tr);
  const alt = new Float32Array(n); for (let i = 0; i < n; i++) alt[i] = pts[i].h || 0;
  const media = caixa(alt, 12), cA1 = Math.max(3, Math.round(rows / 10)), cA2 = Math.max(3, Math.round(rows / 3)), cA3 = Math.max(3, Math.round(rows / 4));
  for (let r = 0; r < rows; r++) {
    const i = Math.min(n - 1, Math.floor(((r + 0.5) * n) / rows)), baixo = lim((media[i] - alt[i]) / 4), ya = (r / rows);
    for (let c = 0; c < LAT; c++) {
      const l = ((c + 0.5) / LAT - 0.5) * W, rel = l - linha[i], borda = suave(0.28, 0.5, Math.abs(l) / W);
      const manchas = 0.65 * ruido(c / 16, ya * cA1, cA1) + 0.35 * ruido(c / 6 + 40, ya * cA3, cA3);
      const agua = lim(manchas * 0.62 + baixo * 0.55 + borda * 0.45 - 0.08);
      const sulcos = Math.max(gauss(rel - 8, 3.2), gauss(rel + 8, 3.2)), seco = lim(Math.max(sulcos, 0.45 * gauss(rel, 5.5)) + 0.4 * gauss(rel, 0.2 * W));
      const rug = 0.6 * ruido(c / 5 + 90, ya * cA2, cA2) + 0.4 * ruido(c / 2 + 130, ya * cA2 * 2.5, cA2 * 2);
      const o = (r * LAT + c) * 4; data[o] = Math.round(agua * 255); data[o + 1] = Math.round(seco * 255); data[o + 2] = Math.round(rug * 255); data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, LAT, rows, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping; tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return (tr.aguaMascara = tex);
}

// as coordenadas da máscara de uma fita de asfalto de -W/2 a W/2 (dois vértices por ponto): lado a lado de 0 a 1 e a volta de 0 a 1
// pelo meio de cada linha da máscara
export function aguaUvDaFita(n, i0, i1) {
  const uv = [];
  for (let i = i0; i <= i1; i++) { const v = (i + 0.5) / n; uv.push(0, v, 1, v); }
  return uv;
}

const GLSL_COMUM = /* glsl */ `
#define N_CAR ${N_CARROS_AGUA}
uniform float uAgua; uniform sampler2D uMascara; uniform vec2 uEscala; uniform vec3 uCeu;
uniform vec4 uCarros[N_CAR]; uniform vec4 uLuzes[N_CAR * 2];
varying vec2 vAguaUv; varying vec3 vAguaMundo;
float aH(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aR(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(aH(i), aH(i + vec2(1.0, 0.0)), f.x), mix(aH(i + vec2(0.0, 1.0)), aH(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
const GLSL_COR = /* glsl */ `
#include <color_fragment>
float aguaW = 0.0, aguaPoca = 0.0, aguaRug = 0.5;
if (uAgua > 0.004) {
  vec4 mk = texture2D(uMascara, vAguaUv);
  vec2 mm = vAguaMundo.xz, ql = vAguaUv * uEscala;
  float seco = mk.g;
  for (int i = 0; i < N_CAR; i++) { // o rastro de cada carro perto: um pouco mais seco por trás dele
    vec4 c = uCarros[i]; float l2 = dot(c.zw, c.zw);
    if (l2 > 1.0) { vec2 d = mm - c.xy; float t = clamp(dot(d, c.zw) / l2, 0.0, 1.0), q = length(d - c.zw * t); seco = max(seco, 0.55 * (1.0 - t) * (1.0 - t) * (1.0 - smoothstep(4.0, 11.0, q))); }
  }
  float rd = aR(ql * vec2(0.09, 0.03));
  aguaW = clamp(uAgua - seco * 0.62 * min(1.0, uAgua * 3.0), 0.0, 1.0); // o traçado seca primeiro: com pouca água fica seco, encharcado ainda fica úmido
  aguaPoca = smoothstep(0.48, 0.68, mk.r + (rd - 0.5) * 0.5) * smoothstep(0.35, 0.92, uAgua) * (1.0 - 0.9 * seco);
  aguaRug = clamp(mk.b * 0.65 + aR(ql * vec2(0.5, 0.12)) * 0.35, 0.0, 1.0);
  diffuseColor.rgb *= (1.0 - 0.46 * aguaW - 0.16 * aguaPoca) * mix(vec3(1.0), vec3(0.93, 0.97, 1.05), aguaW);
}
`;
const GLSL_RUG = /* glsl */ `
#include <roughnessmap_fragment>
if (uAgua > 0.004) {
  float rMolh = mix(0.30, 0.075, smoothstep(0.15, 1.0, aguaW)) + (aguaRug - 0.5) * 0.26 * aguaW; // película fina com manchas
  roughnessFactor = mix(roughnessFactor, rMolh, smoothstep(0.0, 0.3, aguaW));
  roughnessFactor = clamp(mix(roughnessFactor, 0.03, aguaPoca), 0.025, 1.0); // a poça é espelho
}
`;
const GLSL_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
if (uAgua > 0.004) { // marolas esticadas ao longo da pista (viram riscos na vertical da tela); a poça é lisa
  vec2 qn = vAguaUv * uEscala * vec2(1.3, 0.2);
  vec2 g = vec2(aR(qn), aR(qn + 31.7)) - 0.5;
  normal = normalize(normal + vec3(g.x, g.y * 0.6, 0.0) * 0.22 * aguaW * (1.0 - aguaPoca));
}
`;
const GLSL_LUZ = /* glsl */ `
#include <emissivemap_fragment>
if (uAgua > 0.004) {
  vec3 vd = normalize(vViewPosition);
  float nv = clamp(dot(normal, vd), 0.0, 1.0), fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec2 cp = cameraPosition.xz, cf = vAguaMundo.xz - cp;
  // o céu no chão molhado: mais forte raso, quebrado em riscos que saem da câmera (na tela, riscos na vertical)
  float rad = aR(vec2(atan(cf.y, cf.x) * 60.0, length(cf) * 0.012));
  float quebra = mix(0.5 + 0.9 * rad, 1.0, aguaPoca);
  totalEmissiveRadiance += uCeu * (fres * 0.7 + 0.015) * aguaW * (1.0 - roughnessFactor) * quebra;
  // a luz dos carros no chão molhado: o reflexo de um ponto de luz aparece embaixo dele, esticado até quem olha
  float hc = max(cameraPosition.y - vAguaMundo.y, 2.0); vec3 luz = vec3(0.0);
  for (int i = 0; i < N_CAR * 2; i++) {
    vec4 L = uLuzes[i];
    if (L.w > 0.0) {
      vec2 cg = L.xy - cp; float lg = length(cg);
      if (lg > 6.0) {
        vec2 dg = cg / lg; float s = dot(cf, dg), q = dot(cf, vec2(-dg.y, dg.x)), sm = lg * hc / (hc + L.z);
        float ab = (sm - s) / (sm * 0.55 + 14.0), sig = 2.2 + 0.01 * max(s, 0.0);
        float along = ab >= 0.0 ? exp(-ab * 1.8) : exp(-ab * ab * 40.0);
        vec3 cor = (mod(float(i), 2.0) < 0.5) ? vec3(1.0, 0.05, 0.03) : vec3(0.85, 0.92, 1.0);
        luz += cor * (L.w * along * exp(-q * q / (2.0 * sig * sig)) / (1.0 + lg * 0.003));
      }
    }
  }
  totalEmissiveRadiance += luz * aguaW * smoothstep(0.05, 0.4, aguaW) * (1.0 + aguaPoca * 1.2) * (1.0 - smoothstep(0.35, 0.9, roughnessFactor));
}
`;

// liga o sombreador num material de asfalto (MeshStandardMaterial) e guarda os uniformes em `m.userData.aguaPista`
export function prepararAguaPista(tr, m) {
  if (m.userData.aguaPista) return;
  const u = {
    uAgua: { value: 0 }, uMascara: { value: mascaraAgua(tr) }, uEscala: { value: new THREE.Vector2(tr.W, tr.n * 6) }, uCeu: { value: new THREE.Color(0.6, 0.65, 0.7) },
    uCarros: { value: Array.from({ length: N_CARROS_AGUA }, () => new THREE.Vector4()) }, uLuzes: { value: Array.from({ length: N_CARROS_AGUA * 2 }, () => new THREE.Vector4()) },
  };
  m.userData.aguaPista = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aguaUv; varying vec2 vAguaUv; varying vec3 vAguaMundo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAguaUv = aguaUv; vAguaMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_COMUM)
      .replace("#include <color_fragment>", GLSL_COR)
      .replace("#include <roughnessmap_fragment>", GLSL_RUG)
      .replace("#include <normal_fragment_maps>", GLSL_NORMAL)
      .replace("#include <emissivemap_fragment>", GLSL_LUZ);
  };
  m.customProgramCacheKey = () => "agua-pista-1";
}
