// Kit de pista — a luz dos postes e dos holofotes das corridas noturnas, de verdade. Nos GPs noturnos reais (Singapura, Las Vegas,
// Bahrein, Jeddah, Catar) a pista é lavada por centenas de projetores altos, de dois lados, com cones largos que se sobrepõem: o
// asfalto fica claro e QUASE uniforme (a variação ao longo da volta é sutil), a luz vem de cima e de vários ângulos (as sombras
// dos carros são curtas e fracas), a mancha de luz acaba no muro/escape (a área de fora fica mais escura) e o asfalto molhado
// reflete as lâmpadas. É isso que este módulo reproduz, sem asfalto emissivo, sem volume de luz sólido e sem luzes reais do three.js.
//
// Como funciona (sem limite de luzes e sem piscar):
//  1. Quem cria um poste chama `registrarLuz(tr, { x, y, z, alvo, cobrir })` (uma por cabeça de poste, em `tr.luzesPista`).
//     `cobrir` é o raio, no chão em volta do alvo, que aquela luz precisa cobrir (a conta de cada pista sai do espaçamento dos
//     postes: 0,75 × passo + meia largura, `raioDeCobertura`); dele saem o ângulo do cone (borda bem macia) e o alcance.
//  2. No fim da montagem, pista.js chama `fecharLuzes(tr)`: as luzes e uma grade espacial (células de 64 no plano do chão, cada
//     uma com as 16 luzes que mais a iluminam) viram UMA textura de números (`tr.luzPostes`). As intensidades são ajustadas para a
//     média da luz sobre a pista ser `tr.luzCfg.media` (o nível de claridade de cada GP).
//  3. `ativarLuzPostes(tr, noite)` (em useTrack) liga o uniforme global: só de noite, só em pista com luzes.
//  4. `varrerLuzPostes(scene)` põe nos materiais iluminados da cena (asfalto, zebras, carros, muros...) um pedaço de sombreador, via
//     onBeforeCompile (depois de `lights_fragment_begin`), que acha a célula do fragmento e soma cada cone à irradiância direta
//     pelo MESMO modelo de brilho do three (RE_Direct: difuso + GGX). Então o asfalto molhado reflete as lâmpadas.
//  A luz é uma função contínua da posição do fragmento (janela suave no alcance, borda macia no cone): nada troca de luz conforme
//  o carro anda, então não tem salto nem piscada, e o custo não depende da câmera.
import * as THREE from "three";

export const AMBIENTE_NOITE = { hemi: 0.38, lua: 0.5, ceu: 0.55 }; // o que sobra de luz geral à noite quando os postes cobrem a pista
export const NOITE_PADRAO = { hemi: 0.95, lua: 0.8, ceu: 1 };
const CELULA = 64, POR_CELULA = 16, TEXEIS_LUZ = 4, TEXEIS_CELULA = POR_CELULA / 4, LARGURA = 1024;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- o registro ----------
// configuração da pista: `media` é a irradiância média desejada sobre a pista (≈ 14 é um asfalto cinza-claro; Las Vegas, menos)
export function luzDaPista(tr, cfg) { tr.luzCfg = { media: 14, ...(tr.luzCfg || {}), ...cfg }; return tr.luzCfg; }

// o raio que cada luz precisa cobrir: 0,75 do passo entre postes do mesmo lado + meia largura da pista
export const raioDeCobertura = (passo, largura) => 0.75 * passo + largura / 2;

// x, y, z: onde fica a lâmpada · alvo: [x, y, z] do ponto da pista que o cone mira · cobrir: raio no chão em volta do alvo
// cor: 0xrrggbb · intensidade: relativa (a média da pista é ajustada em fecharLuzes) · suave: fração do cone com a borda macia
export function registrarLuz(tr, { x, y, z, alvo, cobrir = 60, cor = 0xfff1d6, intensidade = 1, suave = 0.7 }) {
  const dx = alvo[0] - x, dy = alvo[1] - y, dz = alvo[2] - z, ref = Math.hypot(dx, dy, dz) || 1;
  const cone = lim((Math.atan(cobrir / ref) * 180) / Math.PI, 22, 70), alcance = Math.sqrt(ref * ref + cobrir * cobrir) * 1.55;
  (tr.luzesPista ||= []).push({ x, y, z, dir: [dx / ref, dy / ref, dz / ref], ref, cor, intensidade, cone, suave, alcance, cobrir });
}

// ---------- os uniformes compartilhados por todos os materiais ----------
const vazia = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType); vazia.needsUpdate = true;
export const LUZ = {
  tLuzPostes: { value: vazia },
  uLuzPostesA: { value: new THREE.Vector4(0, 0, 1 / CELULA, 0) }, // origem x, origem z, 1/célula, colunas
  uLuzPostesB: { value: new THREE.Vector4(0, 0, 0, 0) }, // linhas, fator (0 apagado a 1 aceso), primeira célula, —
};

// a contribuição de uma luz num ponto (a conta que o sombreador repete); `c` é a luminância da cor × intensidade
function contribuicao(l, c, x, y, z) {
  const dx = l.x - x, dy = l.y - y, dz = l.z - z, d2 = dx * dx + dy * dy + dz * dz, rr = l.alcance;
  if (d2 >= rr * rr) return 0;
  const d = Math.sqrt(d2), cosA = -(dx * l.dir[0] + dy * l.dir[1] + dz * l.dir[2]) / d;
  const co = Math.cos((l.cone * Math.PI) / 180), ci = Math.cos((l.cone * (1 - l.suave) * Math.PI) / 180);
  const t = lim((cosA - co) / (ci - co), 0, 1), cone = t * t * (3 - 2 * t); if (cone <= 0) return 0;
  const q = d2 / (rr * rr), jan = (1 - q * q) ** 2;
  return c * jan * cone * (l.ref * l.ref) / (d2 + 0.15 * l.ref * l.ref);
}
const luminancia = (l) => { const k = new THREE.Color(l.cor); return (k.r * 0.2126 + k.g * 0.7152 + k.b * 0.0722) * l.intensidade; };

// ---------- fechar: as luzes e a grade viram uma textura ----------
export function fecharLuzes(tr) {
  const L = tr.luzesPista; delete tr.luzPostes;
  if (!L || !L.length) return null;
  const alcanceNoChao = (l) => { const h = Math.max(0, l.y - (tr.chao ? tr.chao(l.x, l.z) : 0)); return Math.sqrt(Math.max(0, l.alcance * l.alcance - (0.8 * h) ** 2)); }; // o alcance é no espaço
  let reach = L.map(alcanceNoChao);
  // luz de todas as luzes num ponto da linha central (sem a textura; o corte pela caixa evita a conta com as que estão longe)
  const naLinha = (p) => { let e = 0; for (let k = 0; k < L.length; k++) { if (Math.abs(L[k].x - p.x) > reach[k] || Math.abs(L[k].z - p.y) > reach[k]) continue; e += contribuicao(L[k], luminancia(L[k]), p.x, p.h + 0.4, p.y); } return e; };
  // 1) a média da luz sobre a pista → ajusta as intensidades ao nível pedido
  const media = tr.luzCfg?.media ?? 14;
  let soma = 0, n = 0;
  for (let i = 0; i < tr.n; i += 5) { soma += naLinha(tr.pts[i]); n++; }
  const escala = soma > 0 ? media / (soma / n) : 1;
  L.forEach((l) => { l.intensidade *= escala; });
  // 1b) onde o poste não coube (água, prédio, ponte) a pista não pode ficar escura: uma luz de reforço, sem malha (o poste fica fora
  // da vista, como nas pistas reais, que não têm trecho às escuras), com a altura, o raio e a intensidade típicos dos postes da pista
  const med = (v) => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const alturaTip = med(L.map((l) => l.y - (tr.chao ? tr.chao(l.x, l.z) : 0))), cobrirTip = med(L.map((l) => l.cobrir || 60)), intTip = med(L.map((l) => l.intensidade)), corTip = L[0].cor;
  let lado = 1, reforcos = 0;
  for (let i = 0; i < tr.n; i += 2) {
    const p = tr.pts[i]; if (naLinha(p) >= 0.7 * media) continue;
    const lat = lado * (tr.W / 2 + 14), x = p.x + p.nx * lat, z = p.y + p.ny * lat; lado = -lado;
    const y = (tr.chao ? tr.chao(x, z) : p.h) + alturaTip;
    registrarLuz(tr, { x, y, z, alvo: [p.x + p.tx * 6, p.h, p.y + p.ty * 6], cobrir: cobrirTip, cor: corTip, intensidade: 1 });
    const l = L[L.length - 1]; l.intensidade = intTip; l.cobrir = cobrirTip; reach.push(alcanceNoChao(l)); reforcos++;
    i += Math.max(1, Math.floor(cobrirTip / 6 / 2)); // o reforço cobre o trecho em volta
  }
  // 2) a grade
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  L.forEach((l, k) => { x0 = Math.min(x0, l.x - reach[k]); x1 = Math.max(x1, l.x + reach[k]); z0 = Math.min(z0, l.z - reach[k]); z1 = Math.max(z1, l.z + reach[k]); });
  x0 = Math.floor(x0 / CELULA) * CELULA; z0 = Math.floor(z0 / CELULA) * CELULA;
  const nx = Math.ceil((x1 - x0) / CELULA) + 1, nz = Math.ceil((z1 - z0) / CELULA) + 1, cel = new Array(nx * nz);
  let cheias = 0, maior = 0;
  // uma luz entra na lista de uma célula se algum ponto dela, perto do chão (o do alvo e uns 10 acima: carros e muros), cai dentro do
  // cone (com folga de 6 graus) e do alcance; a lista de cada célula guarda as que mais iluminam (a contribuição pesa a distância)
  L.forEach((l, k) => {
    const g = reach[k], cosMin = Math.cos(((l.cone + 6) * Math.PI) / 180), yA = l.y + l.dir[1] * l.ref, c = luminancia(l);
    const c0 = Math.max(0, Math.floor((l.x - g - x0) / CELULA)), c1 = Math.min(nx - 1, Math.floor((l.x + g - x0) / CELULA));
    const r0 = Math.max(0, Math.floor((l.z - g - z0) / CELULA)), r1 = Math.min(nz - 1, Math.floor((l.z + g - z0) / CELULA));
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      let melhor = 0;
      for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) for (const dy of [0, 10]) {
        const px = x0 + (cc + a / 4) * CELULA, pz = z0 + (rr + b / 4) * CELULA, dx = px - l.x, dz = pz - l.z, ddy = yA + dy - l.y, d = Math.hypot(dx, ddy, dz);
        if (d >= l.alcance || d < 1) continue;
        if ((dx * l.dir[0] + ddy * l.dir[1] + dz * l.dir[2]) / d < cosMin) continue;
        melhor = Math.max(melhor, contribuicao(l, c, px, yA + dy, pz) + 1e-6);
      }
      if (melhor > 0) (cel[rr * nx + cc] ||= []).push([melhor, k]);
    }
  });
  const nL = L.length, iC = nL * TEXEIS_LUZ, texeis = iC + nx * nz * TEXEIS_CELULA, linhas = Math.ceil(texeis / LARGURA), dados = new Float32Array(linhas * LARGURA * 4).fill(-1);
  L.forEach((l, k) => {
    const cor = new THREE.Color(l.cor), o = k * TEXEIS_LUZ * 4, ci = Math.cos((l.cone * (1 - l.suave) * Math.PI) / 180), co = Math.cos((l.cone * Math.PI) / 180);
    dados.set([l.x, l.y, l.z, l.alcance, l.dir[0], l.dir[1], l.dir[2], co, cor.r * l.intensidade, cor.g * l.intensidade, cor.b * l.intensidade, ci, l.ref, 0, 0, 0], o);
  });
  for (let q = 0; q < nx * nz; q++) {
    const lista = cel[q]; if (!lista) continue;
    lista.sort((a, b) => b[0] - a[0]); maior = Math.max(maior, lista.length); if (lista.length > POR_CELULA) cheias++;
    for (let j = 0; j < Math.min(POR_CELULA, lista.length); j++) dados[(iC + q * TEXEIS_CELULA) * 4 + j] = lista[j][1];
  }
  const tex = new THREE.DataTexture(dados, LARGURA, linhas, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  const P = { tex, A: [x0, z0, 1 / CELULA, nx], B: [nz, 0, iC, 0], n: nL, nx, nz, x0, z0, cobertura: 0, media, maxPorCelula: maior, cheias, reforcos, dados, iC };
  tr.luzPostes = P;
  // quanto da volta recebe luz de poste (decide se a luz geral da noite pode baixar): a fração da linha central com pelo menos 60% da média
  let cobertos = 0, total = 0;
  for (let i = 0; i < tr.n; i += 6) { const p = tr.pts[i]; total++; if (luzEm(tr, p.x, p.h + 0.4, p.y) >= 0.6 * media) cobertos++; }
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
    int baseLP = int(uLuzPostesB.z) + (int(gLP.y) * int(uLuzPostesA.w) + int(gLP.x)) * ${TEXEIS_CELULA};
    mat3 vistaLP = mat3(viewMatrix);
    for (int t = 0; t < ${TEXEIS_CELULA}; t++) {
      vec4 ids = luzPostesTexel(baseLP + t);
      for (int u = 0; u < 4; u++) {
        float id = ids[u]; if (id < 0.0) break;
        int b = int(id) * ${TEXEIS_LUZ};
        vec4 A = luzPostesTexel(b), B = luzPostesTexel(b + 1), C = luzPostesTexel(b + 2), D = luzPostesTexel(b + 3);
        vec3 dL = A.xyz - pMundoLP; float d2 = dot(dL, dL), r2 = A.w * A.w;
        if (d2 >= r2) continue;
        float dist = sqrt(d2); vec3 lL = dL / dist;
        float cone = smoothstep(B.w, C.w, dot(-lL, B.xyz));
        if (cone <= 0.0) continue;
        float q = d2 / r2, janela = (1.0 - q * q); janela *= janela;
        float ref2 = D.x * D.x;
        float att = janela * cone * ref2 / (d2 + 0.15 * ref2) * uLuzPostesB.y;
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
  m.customProgramCacheKey = function () { return (chaveAntes ? chaveAntes.call(this) : "") + texto + "|luzpostes2"; };
  m.needsUpdate = true;
}
// o mesmo para UM material que vai nascer no meio da corrida (a fumaça do pneu, por exemplo): ele já nasce com o sombreador final,
// o mesmo que a varredura dá aos outros e que o aquecimento da largada já compilou. Sem isto o material nascia sem a luz, compilava
// o sombreador sem ela (uma trava de dezenas de ms, a cada nova nuvem de fumaça) e só 1,5 s depois a varredura o trocava de novo.
export function luzNoMaterial(m) {
  if (!(LUZ.uLuzPostesB.value.y > 0) || !m || feitos.has(m) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
  feitos.add(m); ligar(m);
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
// a irradiância (soma das luzes, sem a normal) que o sombreador acha em (x, y, z), pela MESMA célula da grade
export function luzEm(tr, x, y, z) {
  const P = tr.luzPostes; if (!P) return 0;
  const c = Math.floor((x - P.x0) / CELULA), r = Math.floor((z - P.z0) / CELULA); if (c < 0 || r < 0 || c >= P.nx || r >= P.nz) return 0;
  const base = (P.iC + (r * P.nx + c) * TEXEIS_CELULA) * 4, D = P.dados, L = tr.luzesPista; let soma = 0;
  for (let j = 0; j < POR_CELULA; j++) {
    const id = D[base + j]; if (id < 0) break;
    soma += contribuicao(L[id], luminancia(L[id]), x, y, z);
  }
  return soma;
}
// a mesma conta, mas contra TODAS as luzes (sem a grade): o teste confere que a grade não perde nenhuma que importe
export function luzEmTodas(tr, x, y, z) {
  let soma = 0;
  for (const l of tr.luzesPista || []) soma += contribuicao(l, luminancia(l), x, y, z);
  return soma;
}
