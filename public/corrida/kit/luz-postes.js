// Kit de pista — a luz dos postes e dos holofotes das corridas noturnas, de verdade: cada poste joga um cone de luz macio no
// asfalto (poça embaixo e à frente do poste, queda pelo inverso do quadrado, escuro entre um poste e outro), e a mesma luz
// bate nos carros, nas zebras e no muro. Nada de asfalto emissivo, de volume de luz sólido nem de luzes reais do three.js.
//
// Como funciona (sem limite de luzes e sem piscar):
//  1. Quem cria um poste chama `registrarLuz(tr, { x, y, z, alvo, ... })` (uma por cabeça de poste, em `tr.luzesPista`).
//  2. No fim da montagem, pista.js chama `fecharLuzes(tr)`: as luzes e uma grade espacial (células de 64 no plano do chão,
//     cada uma com as 12 luzes mais perto) viram UMA textura de números (`tr.luzPostes`).
//  3. `ativarLuzPostes(tr, noite)` (em useTrack) liga o uniforme global: só de noite, só em pista com luzes.
//  4. `varrerLuzPostes(scene)` põe nos materiais da cena (asfalto, zebras, carros, muros...) um pedaço de sombreador, via
//     onBeforeCompile (depois de `lights_fragment_begin`), que acha a célula do fragmento e soma cada cone de luz à irradiância
//     direta pelo MESMO modelo de brilho do three (RE_Direct: difuso + GGX). Então o asfalto molhado reflete as lâmpadas.
//  A luz é uma função contínua da posição do fragmento (janela suave no alcance, borda macia no cone): nada troca de luz
//  conforme o carro anda, então não tem salto nem piscada, e o custo não depende da câmera.
import * as THREE from "three";

export const AMBIENTE_NOITE = { hemi: 0.38, lua: 0.42, ceu: 0.55 }; // o que sobra de luz geral à noite quando os postes cobrem a pista
export const NOITE_PADRAO = { hemi: 0.95, lua: 0.8, ceu: 1 };
const CELULA = 64, POR_CELULA = 12, LARGURA = 1024, RAZAO = 1.9; // alcance = RAZAO × distância até o alvo (a referência da intensidade)
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- o registro ----------
// x, y, z: onde fica a lâmpada · alvo: [x, y, z] do ponto da pista que o cone mira · cor: 0xrrggbb · intensidade: a irradiância
// (em unidades do three) onde o eixo do cone bate no alvo · cone: meio ângulo em graus · suave: fração do cone com a borda macia
export function registrarLuz(tr, { x, y, z, alvo, cor = 0xfff1d6, intensidade = 10, cone = 30, suave = 0.55 }) {
  const dx = alvo[0] - x, dy = alvo[1] - y, dz = alvo[2] - z, d = Math.hypot(dx, dy, dz) || 1;
  (tr.luzesPista ||= []).push({ x, y, z, dir: [dx / d, dy / d, dz / d], ref: d, cor, intensidade, cone, suave });
}

// ---------- os uniformes compartilhados por todos os materiais ----------
const vazia = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType); vazia.needsUpdate = true;
export const LUZ = {
  tLuzPostes: { value: vazia },
  uLuzPostesA: { value: new THREE.Vector4(0, 0, 1 / CELULA, 0) }, // origem x, origem z, 1/célula, colunas
  uLuzPostesB: { value: new THREE.Vector4(0, 0, 0, 0) }, // linhas, fator (0 apagado a 1 aceso), primeira célula, primeira luz
};

// ---------- fechar: as luzes e a grade viram uma textura ----------
export function fecharLuzes(tr) {
  const L = tr.luzesPista; delete tr.luzPostes;
  if (!L || !L.length) return null;
  const reach = L.map((l) => {
    const r = l.ref * RAZAO, h = Math.max(0, l.y - (tr.chao ? tr.chao(l.x, l.z) : 0));
    return { r, g: Math.sqrt(Math.max(0, r * r - (0.8 * h) ** 2)) }; // até onde a luz chega no chão (r é no espaço, g no plano)
  });
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  L.forEach((l, k) => { x0 = Math.min(x0, l.x - reach[k].g); x1 = Math.max(x1, l.x + reach[k].g); z0 = Math.min(z0, l.z - reach[k].g); z1 = Math.max(z1, l.z + reach[k].g); });
  x0 = Math.floor(x0 / CELULA) * CELULA; z0 = Math.floor(z0 / CELULA) * CELULA;
  const nx = Math.ceil((x1 - x0) / CELULA) + 1, nz = Math.ceil((z1 - z0) / CELULA) + 1;
  const cel = new Array(nx * nz);
  let cheias = 0, maior = 0;
  // uma luz entra na lista de uma célula se algum ponto dela, perto do chão (o do alvo e uns 10 acima: carros e muros), cai dentro do cone
  // (com folga de 6 graus) e do alcance; as listas ficam curtas mesmo com os postes muito juntos
  L.forEach((l, k) => {
    const g = reach[k].g, r = reach[k].r, cosMin = Math.cos(((l.cone + 6) * Math.PI) / 180), yA = l.y + l.dir[1] * l.ref;
    const c0 = Math.max(0, Math.floor((l.x - g - x0) / CELULA)), c1 = Math.min(nx - 1, Math.floor((l.x + g - x0) / CELULA));
    const r0 = Math.max(0, Math.floor((l.z - g - z0) / CELULA)), r1 = Math.min(nz - 1, Math.floor((l.z + g - z0) / CELULA));
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      let melhor = Infinity;
      for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) for (const dy of [0, 10]) {
        const dx = x0 + (c + a / 4) * CELULA - l.x, dz = z0 + (rr + b / 4) * CELULA - l.z, ddy = yA + dy - l.y, d = Math.hypot(dx, ddy, dz);
        if (d >= r || d < 1) continue;
        if ((dx * l.dir[0] + ddy * l.dir[1] + dz * l.dir[2]) / d < cosMin) continue;
        melhor = Math.min(melhor, d);
      }
      if (melhor < Infinity) (cel[rr * nx + c] ||= []).push([melhor, k]);
    }
  });
  const nL = L.length, iC = nL * 3, texeis = iC + nx * nz * 3, linhas = Math.ceil(texeis / LARGURA), dados = new Float32Array(linhas * LARGURA * 4).fill(-1);
  L.forEach((l, k) => {
    const cor = new THREE.Color(l.cor), o = k * 12, ci = Math.cos((l.cone * (1 - l.suave) * Math.PI) / 180), co = Math.cos((l.cone * Math.PI) / 180);
    dados.set([l.x, l.y, l.z, reach[k].r, l.dir[0], l.dir[1], l.dir[2], co, cor.r * l.intensidade, cor.g * l.intensidade, cor.b * l.intensidade, ci], o);
  });
  for (let q = 0; q < nx * nz; q++) {
    const lista = cel[q]; if (!lista) continue;
    lista.sort((a, b) => a[0] - b[0]); maior = Math.max(maior, lista.length); if (lista.length > POR_CELULA) cheias++;
    for (let j = 0; j < Math.min(POR_CELULA, lista.length); j++) dados[(iC + q * 3) * 4 + j] = lista[j][1];
  }
  const tex = new THREE.DataTexture(dados, LARGURA, linhas, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  const P = { tex, A: [x0, z0, 1 / CELULA, nx], B: [nz, 0, iC, 0], n: nL, nx, nz, x0, z0, cobertura: 0, maxPorCelula: maior, cheias, dados, iC };
  tr.luzPostes = P;
  // quanto da volta recebe luz de poste (decide se a luz geral da noite pode baixar): conta os pontos da linha central com alguma luz
  let cobertos = 0, total = 0;
  for (let i = 0; i < tr.n; i += 6) { const p = tr.pts[i]; total++; if (luzEm(tr, p.x, p.h + 0.4, p.y) > 1) cobertos++; }
  P.cobertura = total ? cobertos / total : 0;
  return P;
}

// o quanto da luz geral da noite pode baixar nesta pista (0 = nada, 1 = tudo: os postes cobrem a volta inteira)
export function ambienteDaNoite(tr) {
  const c = tr.luzPostes ? lim((tr.luzPostes.cobertura - 0.5) / 0.4, 0, 1) : 0;
  return { hemi: NOITE_PADRAO.hemi + (AMBIENTE_NOITE.hemi - NOITE_PADRAO.hemi) * c, lua: NOITE_PADRAO.lua + (AMBIENTE_NOITE.lua - NOITE_PADRAO.lua) * c, ceu: NOITE_PADRAO.ceu + (AMBIENTE_NOITE.ceu - NOITE_PADRAO.ceu) * c };
}

// liga (ou apaga) a luz dos postes para esta pista; devolve se está acesa
export function ativarLuzPostes(tr, noite) {
  const P = noite && tr.luzPostes;
  if (!P) { LUZ.uLuzPostesB.value.y = 0; return false; }
  LUZ.tLuzPostes.value = P.tex; LUZ.uLuzPostesA.value.set(P.A[0], P.A[1], P.A[2], P.A[3]); LUZ.uLuzPostesB.value.set(P.B[0], 1, P.B[2], 0);
  return true;
}

// ---------- o sombreador ----------
const GLSL_PARS = `
uniform sampler2D tLuzPostes; uniform vec4 uLuzPostesA; uniform vec4 uLuzPostesB;
vec4 luzPostesTexel(int i) { return texelFetch(tLuzPostes, ivec2(i & ${LARGURA - 1}, i >> ${Math.log2(LARGURA)}), 0); }
`;
const GLSL_LUZ = `
#include <lights_fragment_begin>
if (uLuzPostesB.y > 0.001) {
  vec3 pMundoLP = cameraPosition + transpose(mat3(viewMatrix)) * geometryPosition;
  vec2 gLP = (pMundoLP.xz - uLuzPostesA.xy) * uLuzPostesA.z;
  if (gLP.x >= 0.0 && gLP.y >= 0.0 && gLP.x < uLuzPostesA.w && gLP.y < uLuzPostesB.x) {
    int baseLP = int(uLuzPostesB.z) + (int(gLP.y) * int(uLuzPostesA.w) + int(gLP.x)) * 3;
    mat3 vistaLP = mat3(viewMatrix);
    for (int t = 0; t < 3; t++) {
      vec4 ids = luzPostesTexel(baseLP + t);
      for (int u = 0; u < 4; u++) {
        float id = ids[u]; if (id < 0.0) break;
        int b = int(id) * 3;
        vec4 A = luzPostesTexel(b), B = luzPostesTexel(b + 1), C = luzPostesTexel(b + 2);
        vec3 dL = A.xyz - pMundoLP; float d2 = dot(dL, dL), r2 = A.w * A.w;
        if (d2 >= r2) continue;
        float dist = sqrt(d2); vec3 lL = dL / dist;
        float cone = smoothstep(B.w, C.w, dot(-lL, B.xyz));
        if (cone <= 0.0) continue;
        float q = d2 / r2, janela = (1.0 - q * q); janela *= janela;
        float ref = A.w / ${RAZAO.toFixed(2)};
        float att = janela * cone * (ref * ref) / (d2 + 0.15 * ref * ref) * uLuzPostesB.y;
        IncidentLight luzLP; luzLP.color = C.rgb * att; luzLP.direction = normalize(vistaLP * lL); luzLP.visible = true;
        RE_Direct( luzLP, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
      }
    }
  }
}
`;
const feitos = new WeakSet();
function ligar(m) {
  const antes = m.onBeforeCompile, chaveAntes = m.customProgramCacheKey, texto = antes ? String(antes) : "";
  m.onBeforeCompile = function (sh, r) {
    if (antes) antes.call(this, sh, r);
    Object.assign(sh.uniforms, LUZ);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_PARS).replace("#include <lights_fragment_begin>", GLSL_LUZ);
  };
  m.customProgramCacheKey = function () { return (chaveAntes ? chaveAntes.call(this) : "") + texto + "|luzpostes1"; };
  m.needsUpdate = true;
}
// põe a luz dos postes em todo material iluminado da cena que ainda não tem (só com a luz acesa nesta pista)
export function varrerLuzPostes(scene) {
  if (!(LUZ.uLuzPostesB.value.y > 0)) return 0;
  let n = 0;
  scene.traverse((o) => {
    const ms = o.material; if (!ms) return;
    for (const m of Array.isArray(ms) ? ms : [ms]) {
      if (!m || feitos.has(m) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) continue;
      feitos.add(m); ligar(m); n++;
    }
  });
  return n;
}

// ---------- a conta no processador (os testes e as medidas) ----------
// a irradiância (soma de intensidade × janela × cone, sem a normal) que o sombreador acha em (x, y, z), pela MESMA célula
export function luzEm(tr, x, y, z) {
  const P = tr.luzPostes; if (!P) return 0;
  const c = Math.floor((x - P.x0) / CELULA), r = Math.floor((z - P.z0) / CELULA); if (c < 0 || r < 0 || c >= P.nx || r >= P.nz) return 0;
  const base = (P.iC + (r * P.nx + c) * 3) * 4, D = P.dados; let soma = 0;
  for (let j = 0; j < POR_CELULA; j++) {
    const id = D[base + j]; if (id < 0) break;
    const o = id * 12, dx = D[o] - x, dy = D[o + 1] - y, dz = D[o + 2] - z, d2 = dx * dx + dy * dy + dz * dz, rr = D[o + 3];
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2), cosA = -(dx * D[o + 4] + dy * D[o + 5] + dz * D[o + 6]) / d, co = D[o + 7], ci = D[o + 11];
    const t = lim((cosA - co) / (ci - co), 0, 1), cone = t * t * (3 - 2 * t); if (cone <= 0) continue;
    const q = d2 / (rr * rr), jan = (1 - q * q) ** 2, ref = rr / RAZAO;
    soma += (D[o + 8] * 0.2126 + D[o + 9] * 0.7152 + D[o + 10] * 0.0722) * jan * cone * (ref * ref) / (d2 + 0.15 * ref * ref);
  }
  return soma;
}
// a mesma conta, mas contra TODAS as luzes (sem a grade): o teste confere que a grade não perde nenhuma que importe
export function luzEmTodas(tr, x, y, z) {
  let soma = 0;
  for (const l of tr.luzesPista || []) {
    const dx = l.x - x, dy = l.y - y, dz = l.z - z, d2 = dx * dx + dy * dy + dz * dz, rr = l.ref * RAZAO;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2), cosA = -(dx * l.dir[0] + dy * l.dir[1] + dz * l.dir[2]) / d;
    const co = Math.cos((l.cone * Math.PI) / 180), ci = Math.cos((l.cone * (1 - l.suave) * Math.PI) / 180);
    const t = lim((cosA - co) / (ci - co), 0, 1), cone = t * t * (3 - 2 * t); if (cone <= 0) continue;
    const q = d2 / (rr * rr), jan = (1 - q * q) ** 2, c = new THREE.Color(l.cor);
    soma += (c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722) * l.intensidade * jan * cone * (l.ref * l.ref) / (d2 + 0.15 * l.ref * l.ref);
  }
  return soma;
}
