// Corrida da Galera — o piloto dentro do carro de F1 de 2026: capacete (viseira escura, desenho nas cores da equipe, faixa e o número),
// macacão (tronco, ombros, braço e antebraço com cotovelo que dobra) e luvas nas cores da equipe. Tudo em poucas malhas por carro (cabeça: capacete e viseira; corpo: tronco e dois braços; antebraços: dois;
// mãos: uma malha só com as duas luvas) e com geometrias, texturas e materiais reaproveitados por equipe: o que muda de um carro para o
// outro é só a pose. A pose sai das coordenadas do carro (metros do modelo, a frente é −z) e é calculada a cada quadro por `animarPiloto`.
//
// Animação viva, sem repetir (nada de clipe gravado): molas amortecidas levam a cabeça para o lado de dentro da curva (pelo esterço e
// pela velocidade) com atraso e um pouquinho de passada, e para a frente na frenagem; nas retas, uma soma de senos com frequências e
// fases sorteadas para ESTE carro (mais uma modulação lenta) faz a cabeça nunca repetir; de vez em quando, num intervalo sorteado, o
// piloto dá uma olhada rápida num espelho. O sorteio vem de uma semente por carro (`semente`), então dois carros nunca se mexem juntos.
// `prefers-reduced-motion`: a cabeça fica parada na posição neutra (as luvas continuam seguindo o volante, que já gira).
// O corpo (`p.corpo`: cabeça, tronco e braços) some na câmera de cockpit do meu carro (`ocultarPiloto`); os antebraços (`p.antebracos`) e as luvas (`p.maos`) ficam. Os braços são de 2 ossos (ombro → cotovelo → luva no aro): IK simples, o cotovelo abre para fora e para baixo. De longe (`lodKart`, carros.js)
// as luvas, os braços e os ombros saem e a animação para.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { pintarFolha, capacetePorSigla } from "./f1-capacetes.js";

const menosMovimento = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (s) => s * s * (3 - 2 * s);

// onde as coisas ficam, no quadro do carro (metros do modelo; a frente é −z, o chão é y = 0): o pescoço, o centro do volante e as empunhaduras
// O piloto fica deitado fundo no cockpit, como no carro de verdade: só a metade de cima do capacete (da viseira para cima) passa da borda do cockpit (~0,69 m do chão
// ao lado da cabeça), o topo fica na altura da barra do halo (~0,776 m; medido no modelo) e o queixo e o pescoço ficam escondidos atrás das laterais.
const RC = { x: 0.073, y: 0.081, z: 0.095 }; // os raios do capacete (m)
const PESCOCO = { x: 0, y: 0.543, z: 0.0 }; // o capacete é uma bola de ~0,26 m 0,14 m acima: o centro dele fica a ~0,683 m, a viseira na altura da borda do cockpit (~0,69) e o topo a ~0,764 m (um pouco abaixo da barra do halo, ~0,776)
const VOLANTE = { x: 0, y: 0.524, z: -0.32 }; // o centro do volante do Audi R26 (f1-2026.js); com o volante do modelo, usa o dele
const MAO = { x: 0.118, y: 0, z: 0.035 }; // o punho fechado de cada luva em relação ao centro do volante (antes de girar com ele): na pegada lateral do aro
// A mão fechada (f1/piloto/mao.glb, ver LICENCA.txt): o modelo vem com a laçada dos dedos na origem, a frente em −z, as costas da mão para +x (a mão direita) e o pulso em +z.
const GRIP = { x: 0.114, y: 0, z: 0.02 }; // onde fica a laçada dos dedos (o eixo da pegada lateral do aro) no quadro do volante, antes de girar com ele; a esquerda é o espelho
const PULSO = { x: 0, y: 0.01, z: 0.17 }; // onde o antebraço entra no punho da luva, em relação à laçada (dentro do punho escuro)
const PUNHO = 0.075; // do punho fechado até o pulso (onde o antebraço entra no punho escuro da luva), para trás (+z)
const OMBRO = { x: 0.115, y: 0.55, z: 0.2 }; // o ombro (pivô do braço)
const OSSO = { cima: 0.23, baixo: 0.22 }; // o braço e o antebraço (m): com o ombro a ~0,41 m do pulso o cotovelo dobra um pouco

// ---------- o que é dividido entre todos os carros ----------
const sinal = (v) => (v < 0 ? -1 : 1), passo = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// o formato do capacete de F1: um elipsoide "quadrado" (calota achatada em cima, lados quase retos), mais comprido que alto, que desce reto atrás com uma aba (o spoiler) e tem o queixo saliente na frente.
// Deforma uma esfera unitária (a frente é −z, o topo +y) mantendo as coordenadas de textura; `esc` engorda a casca (a viseira fica 1,2% por fora).
function casco(g, esc) {
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    const sx = P.getX(i), sy = P.getY(i), sz = P.getZ(i);
    let x = sinal(sx) * Math.abs(sx) ** 0.8, y = sinal(sy) * Math.abs(sy) ** (sy > 0 ? 0.58 : 0.85), z = sinal(sz) * Math.abs(sz) ** 0.8; // (a coroa chata: expoente menor que 1 em cima)
    x *= RC.x * esc; y *= RC.y * esc; z *= RC.z * esc;
    const frente = passo(0.2, 0.9, -sz), baixo = passo(-0.05, -0.55, sy), costas = passo(0.35, 0.95, sz);
    const queixo = frente * baixo; x *= 1 - 0.16 * queixo; z -= 0.022 * queixo; y -= 0.008 * queixo; // o queixo: sai para a frente e afina
    const aba = costas * Math.max(0, 1 - ((sy - 0.2) / 0.3) ** 2) * (1 - passo(0.5, 0.9, Math.abs(sx))); z += 0.018 * aba; // a aba atrás: um degrau na altura da nuca
    z += 0.01 * costas * (1 - passo(-0.4, 0.2, sy)); // e as costas descem retas (um pouco para trás embaixo)
    P.setXYZ(i, x, y, z);
    const nx = sx / (RC.x * esc), ny = sy / (RC.y * esc), nz = sz / (RC.z * esc), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / l, ny / l, nz / l);
  }
  P.needsUpdate = true; N.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}
let G = null;
function geometrias() {
  if (G) return G;
  const capacete = casco(new THREE.SphereGeometry(1, 40, 24), 1);
  // a viseira: uma faixa escura larga e bem marcada na frente (u = 0,75), na altura dos olhos (~25% da altura do capacete), que dá a volta pela frente seguindo a curva da cabeça (um pedaço da mesma forma, 1,2% maior)
  const viseira = casco(new THREE.SphereGeometry(1, 40, 3, 1.5 * Math.PI - 1.15, 2.3, 1.2, 0.36), 1.012);
  // o braço (manga) afina do ombro ao cotovelo e o antebraço do cotovelo ao pulso; o ombro e o cotovelo são bolinhas (a junta arredondada). As bolas levam a escala inversa do comprimento do osso, que estica o cilindro a cada quadro.
  const junta = (r, y, L) => { const e = new THREE.SphereGeometry(r, 12, 8); e.scale(1, 1 / L, 1); e.translate(0, y, 0); return e; };
  const tubo = (rTopo, rBase) => { const c = new THREE.CylinderGeometry(rTopo, rBase, 1, 12, 1, true); c.translate(0, 0.5, 0); return c; };
  const braco = mergeGeometries([tubo(0.02, 0.029), junta(0.031, 0, OSSO.cima), junta(0.0235, 1, OSSO.cima)]); // do ombro (y = 0) ao cotovelo (y = 1)
  const antebraco = mergeGeometries([tubo(0.015, 0.0215), junta(0.0235, 0, OSSO.baixo)]); // do cotovelo (y = 0) ao pulso (y = 1)
  const tronco = new THREE.CapsuleGeometry(0.085, 0.13, 4, 12); tronco.scale(1.3, 1, 0.8); // o peito e os ombros (deitado para trás, na malha)
  const aro = new THREE.BoxGeometry(0.235, 0.12, 0.035); // o volante dos carros "leves" (que não trazem o do modelo): só para as mãos terem onde segurar
  return (G = { capacete, viseira, braco, antebraco, tronco, aro });
}
// a luva fechada em volta da pegada lateral do volante, de cada lado, numa malha só com cor por vértice (a da equipe nos dedos, no punho fechado e no polegar; o punho escuro):
// o punho fechado (a palma na pegada), quatro dedos que dão a volta no aro para a frente, o polegar por cima e o punho escuro de onde sai o antebraço.
// Uma geometria por cor (cache), todas com o mesmo material (LUVA).
const LUVAS = new Map();
function luvasDe(cor) {
  let g = LUVAS.get(cor); if (g) return g;
  const c = new THREE.Color(cor), esc = new THREE.Color("#17191d"), partes = [];
  const pinta = (geo, k) => { const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); return geo; };
  for (const l of [-1, 1]) {
    const x0 = l * MAO.x, z0 = MAO.z;
    const punho = new THREE.CapsuleGeometry(0.0245, 0.038, 3, 10); punho.scale(1, 1, 1.1); punho.translate(x0, MAO.y, z0); partes.push(pinta(punho, c));
    for (let i = 0; i < 4; i++) { // os dedos: de cima do punho, passam por fora do aro e voltam para a frente (−z)
      const dedo = new THREE.CapsuleGeometry(0.0095, 0.034, 2, 6); dedo.rotateX(Math.PI / 2); dedo.translate(x0 + l * 0.012, MAO.y + (i - 1.5) * 0.0185, z0 - 0.036); partes.push(pinta(dedo, c));
    }
    const polegar = new THREE.CapsuleGeometry(0.0105, 0.026, 2, 6); polegar.rotateX(Math.PI / 2); polegar.rotateY(-l * 0.5); polegar.translate(x0 - l * 0.004, MAO.y + 0.046, z0 - 0.002); partes.push(pinta(polegar, c)); // o polegar por cima
    const cuff = new THREE.CylinderGeometry(0.0235, 0.0265, PUNHO - 0.03, 12, 1, true); cuff.rotateX(Math.PI / 2); cuff.translate(x0, MAO.y, z0 + 0.03 + (PUNHO - 0.03) / 2); partes.push(pinta(cuff, esc)); // o punho escuro
  }
  g = mergeGeometries(partes); LUVAS.set(cor, g); return g;
}
const MAO3D = { base: null, carregando: false, pilotos: new Set() };
// carrega a mão uma vez (um arquivo pequeno); quando chega, todos os pilotos já criados trocam as luvas provisórias pela mão
function garantirMao() {
  if (MAO3D.base || MAO3D.carregando) return; MAO3D.carregando = true;
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  l.loadAsync("/corrida/f1/piloto/mao.glb").then((g) => {
    let m = null; g.scene.updateMatrixWorld(true); g.scene.traverse((o) => { if (o.isMesh && !m) m = o; });
    const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, n = P.count, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); pos.set([v.x, v.y, v.z], i * 3); nor.set([N.getX(i), N.getY(i), N.getZ(i)], i * 3); } // (a malha vem quantizada: lê pelos acessos, que desfazem a escala)
    MAO3D.base = { pos, nor, idx: Uint32Array.from(m.geometry.index.array) };
    for (const p of MAO3D.pilotos) p.luvas.geometry = maosDe(p.corLuva, p.corPainel);
  }).catch((e) => { console.warn("Corrida: a mão do piloto não carregou", e); MAO3D.carregando = false; });
}
// as duas mãos (a direita é a do modelo; a esquerda, o espelho) numa malha só, pintada por vértice: a palma e os dedos na cor da luva, as costas da mão com um painel de outra cor,
// o punho escuro (um punho de cano curto) com uma tira de velcro; uma geometria por par de cores, todas com o mesmo material (LUVA)
const MAOS = new Map();
function maosDe(cLuva, cPainel) {
  const k = cLuva + "|" + cPainel; let g = MAOS.get(k); if (g) return g;
  const { pos, nor, idx } = MAO3D.base, n = pos.length / 3, luva = new THREE.Color(cLuva), painel = new THREE.Color(cPainel), esc = new THREE.Color("#16181c"), velcro = new THREE.Color("#a9aeb8"), partes = [];
  for (const l of [1, -1]) {
    const P = new Float32Array(pos.length), N = new Float32Array(nor.length), C = new Float32Array(pos.length);
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], nx = nor[i * 3], c = nx > 0.45 && z > 0.012 && z < 0.12 ? painel : luva; // o painel: a face de fora (as costas) entre os nós dos dedos e o pulso
      P[i * 3] = l * x + l * GRIP.x; P[i * 3 + 1] = y + GRIP.y; P[i * 3 + 2] = z + GRIP.z; N[i * 3] = l * nx; N[i * 3 + 1] = nor[i * 3 + 1]; N[i * 3 + 2] = nor[i * 3 + 2];
      C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
    }
    const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.BufferAttribute(P, 3)); m.setAttribute("normal", new THREE.BufferAttribute(N, 3)); m.setAttribute("color", new THREE.BufferAttribute(C, 3));
    const I = Uint32Array.from(idx); if (l < 0) for (let t = 0; t < I.length; t += 3) { const a = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = a; } // (o espelho vira as faces do avesso)
    m.setIndex(new THREE.BufferAttribute(I, 1)); partes.push(m);
    const pinta = (geo, k2) => { const nn = geo.attributes.position.count, a = new Float32Array(nn * 3); for (let i = 0; i < nn; i++) { a[i * 3] = k2.r; a[i * 3 + 1] = k2.g; a[i * 3 + 2] = k2.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); geo.deleteAttribute("uv"); return geo; };
    const tubo = (r0, r1, h, zc, cor) => { const t = new THREE.CylinderGeometry(r1, r0, h, 18, 1, true); t.rotateX(Math.PI / 2); t.scale(1, 0.82, 1); t.translate(l * (GRIP.x + PULSO.x), GRIP.y + PULSO.y, GRIP.z + zc); return pinta(t, cor); }; // (do lado do pulso, +z, o raio é r1; o eixo do pulso é um pouco achatado)
    partes.push(tubo(0.034, 0.027, 0.085, 0.1575, esc), tubo(0.0338, 0.0338, 0.02, 0.145, velcro)); // o punho escuro e a tira de velcro em volta dele
  }
  g = mergeGeometries(partes); MAOS.set(k, g); return g;
}
const LUVA = () => (LUVA.m ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide }));
const VISEIRA = () => (VISEIRA.m ||= new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.1, metalness: 0.4 }));
const CARBONO = () => (CARBONO.m ||= new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.4, metalness: 0.1 }));
const TECIDOS = new Map(), CAPACETES = new Map();
// o tecido do macacão e das luvas: um material por cor (e por escurecimento), guardado e reaproveitado por todos os carros da equipe
const tecido = (cor, escurece = 0) => {
  const k = cor + "|" + escurece; let m = TECIDOS.get(k);
  if (!m) { const c = new THREE.Color(cor); if (escurece) c.multiplyScalar(1 - escurece); m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0 }); TECIDOS.set(k, m); }
  return m;
};
// a luva na cor da equipe que se vê: a cor 1, ou a cor 2 se a 1 é escura demais (o preto e o azul-marinho somem contra o carbono do volante)
function corDaLuva(c1, c2) { const c = new THREE.Color(c2); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.06 ? c1 : c2; } // (a cor 2, que se destaca do macacão de cor 1; se ela for escura demais, a 1)
// o macacão: a cor 1 com uma faixa de cor 2 (em volta do peito, do braço e do antebraço, perto do cotovelo e do punho); um material por equipe
const TRAJES = new Map();
function traje(c1, c2) {
  const k = c1 + "|" + c2; let m = TRAJES.get(k);
  if (!m) {
    const cv = document.createElement("canvas"); cv.width = 8; cv.height = 64; const x = cv.getContext("2d");
    x.fillStyle = c1; x.fillRect(0, 0, 8, 64); x.fillStyle = c2; x.fillRect(0, 18, 8, 9); x.fillRect(0, 50, 8, 4);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0 }); TRAJES.set(k, m);
  }
  return m;
}
// a cor da faixa do capacete: branco, ou quase preto se as cores da equipe já são claras
function corDaFaixa(c1, c2) {
  const lum = (h) => { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
  return lum(c1) > 0.5 || lum(c2) > 0.5 ? "#14161b" : "#ffffff";
}
// o desenho do capacete numa folha 512x256 (ver f1-capacetes.js): o do robô é o do piloto dele (`cap`), o dos outros é o genérico nas cores 1 e 2 da equipe
const materialDoCapacete = (c1, c2, numero, cap) => {
  const cores = cap ? cap.cores : [c1, c2, corDaFaixa(c1, c2)], desenho = cap ? cap.desenho : "generico", k = [...cores, desenho, numero ?? ""].join("|"); let m = CAPACETES.get(k);
  if (!m) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256; pintarFolha(cv.getContext("2d"), cores, desenho, numero);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.12 }); CAPACETES.set(k, m);
  }
  return m;
};

// ---------- sorteio por carro ----------
let contador = 0;
const hash = (s) => { let a = 2166136261; for (const ch of String(s)) { a ^= ch.charCodeAt(0); a = Math.imul(a, 16777619); } return a >>> 0; };
const gerador = (sem) => { let a = (sem >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// três senos (frequência em Hz, fase, peso) que somam 1: o ruído suave de um canal da cabeça; `faixa` é o intervalo das frequências
const senos = (r, f0, f1) => { const l = [0, 1, 2].map((i) => [f0 + (f1 - f0) * (i * 0.34 + r() * 0.3), r() * 6.2832, 0.35 + r() * 0.65]), s = l.reduce((a, q) => a + q[2], 0); return l.map((q) => [q[0], q[1], q[2] / s]); };
const ruido = (l, t) => l[0][2] * Math.sin(6.2832 * l[0][0] * t + l[0][1]) + l[1][2] * Math.sin(6.2832 * l[1][0] * t + l[1][1]) + l[2][2] * Math.sin(6.2832 * l[2][0] * t + l[2][1]);
const mola = (s, alvo, w, z, dt) => { // uma mola amortecida (w: rad/s, z: amortecimento); `s` = { x, v }
  const n = dt > 0.02 ? 2 : 1, h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (w * w * (alvo - s.x) - 2 * z * w * s.v) * h; s.x += s.v * h; }
  return s.x;
};

// monta o piloto no carro `kt` (de montarF1, no modelo de 2026): devolve { corpo, maos, ... } ou null se o carro não tem o modelo novo.
// op: { cor1, cor2, numero, nome, semente, sigla (o piloto robô: o capacete é o dele) }
export function criarPiloto(kt, op) {
  const g = geometrias(), { cor1, cor2 } = op;
  const sem = op.semente ?? hash([op.nome || "", op.numero ?? "", cor1, cor2].join("|") + ":" + (contador++)), r = gerador(sem);
  const centro = kt.volante ? kt.volante.position : new THREE.Vector3(VOLANTE.x, VOLANTE.y, VOLANTE.z);
  const solta = (m) => { m.castShadow = false; m.receiveShadow = false; return m; };
  // o corpo (some na câmera de cockpit): o pescoço é o pivô da cabeça
  const corpo = new THREE.Group(); corpo.name = "piloto"; kt.carro.add(corpo);
  const cab = new THREE.Group(); cab.position.set(PESCOCO.x, PESCOCO.y, PESCOCO.z); cab.rotation.order = "YXZ"; corpo.add(cab);
  const capacete = solta(new THREE.Mesh(g.capacete, materialDoCapacete(cor1, cor2, op.numero, op.sigla ? capacetePorSigla(op.sigla) : null))); capacete.name = "capacete"; capacete.position.y = 0.14; cab.add(capacete);
  const viseira = solta(new THREE.Mesh(g.viseira, VISEIRA())); viseira.name = "viseira"; viseira.position.y = 0.14; cab.add(viseira);
  const tronco = solta(new THREE.Mesh(g.tronco, traje(cor1, cor2))); tronco.name = "tronco"; tronco.position.set(0, 0.45, 0.16); tronco.rotation.x = 0.6; corpo.add(tronco); // o piloto deitado: o peito inclinado para trás
  const bracos = [-1, 1].map((l) => { const m = solta(new THREE.Mesh(g.braco, traje(cor1, cor2))); m.name = "braco"; m.position.set(l * OMBRO.x, OMBRO.y, OMBRO.z); corpo.add(m); return m; });
  // os antebraços ficam fora do corpo: aparecem também na primeira pessoa, junto das luvas
  const antebracos = new THREE.Group(); antebracos.name = "antebracos"; kt.carro.add(antebracos);
  const foreBracos = [-1, 1].map(() => { const m = solta(new THREE.Mesh(g.antebraco, traje(cor1, cor2))); m.name = "antebraco"; antebracos.add(m); return m; });
  // as mãos (ficam no volante e aparecem também na primeira pessoa): uma malha só, com as duas luvas, num pivô que gira com o volante
  const maos = new THREE.Group(); maos.name = "maos"; maos.position.copy(centro); kt.carro.add(maos);
  garantirMao(); const corLuva = corDaLuva(cor1, cor2), corPainel = corLuva === cor2 ? cor1 : cor2; // as luvas: a mão fechada do modelo (ou, enquanto ela não chega, cápsulas)
  const luvas = solta(new THREE.Mesh(MAO3D.base ? maosDe(corLuva, corPainel) : luvasDe(corLuva), LUVA())); luvas.name = "luvas"; maos.add(luvas);
  let aro = null; if (!kt.volante) { aro = solta(new THREE.Mesh(g.aro, CARBONO())); aro.name = "luvas-aro"; maos.add(aro); }
  const agit = 0.7 + r() * 0.7; // quão mexida é a cabeça deste piloto (uns são mais calmos)
  const p = {
    kt, corpo, cab, tronco, bracos, antebracos, foreBracos, maos, luvas, corLuva, corPainel, aro, centro, rng: r, t: r() * 100, fant: false, escondido: false, neutro: false,
    mRoll: { x: 0, v: 0 }, mYaw: { x: 0, v: 0 }, mPitch: { x: 0, v: 0 }, mX: { x: 0, v: 0 }, brk: 0,
    w: { roll: 8 + r() * 3.5, yaw: 6 + r() * 2.5, pitch: 9 + r() * 3.5 }, z: { roll: 0.45 + r() * 0.2, yaw: 0.6 + r() * 0.2, pitch: 0.42 + r() * 0.2 }, // frequência e amortecimento das molas: ~0,5 passa um pouco do ponto
    agit, modula: [0.03 + r() * 0.05, r() * 6.2832], // a respiração lenta do ruído (nunca igual)
    nRoll: senos(r, 0.17, 1.5), nYaw: senos(r, 0.13, 1.2), nPitch: senos(r, 0.2, 1.8), nX: senos(r, 0.15, 0.9), vibra: senos(r, 6.5, 13.5),
    olhar: { prox: 2.5 + r() * 6, t: -1, dur: 0.6, lado: 1 }, // a olhada no espelho: quando, há quanto tempo, quanto dura, para que lado (−1 esquerdo, 1 direito)
    ang: 0,
  };
  MAO3D.pilotos.add(p);
  p.ocultarFantasma = (on) => { p.fant = !!on; visivel(p); };
  vistaNeutra(p);
  return p;
}
function visivel(p) { p.corpo.visible = !p.fant && !p.escondido; p.antebracos.visible = p.maos.visible = !p.fant; }
// na primeira pessoa (câmera de cockpit do meu carro): o capacete, o tronco e os braços somem; os antebraços e as luvas ficam
export function ocultarPiloto(k, sim) { const p = k?.pil; if (!p || p.escondido === !!sim) return; p.escondido = !!sim; visivel(p); }
export function soltarPiloto(k) { const p = k?.pil; if (!p) return; MAO3D.pilotos.delete(p); p.corpo.removeFromParent(); p.antebracos.removeFromParent(); p.maos.removeFromParent(); k.pil = null; } // (geometrias, texturas e materiais são de todos: nada a descartar)

// a pose parada: a cabeça no centro, os braços no volante reto
function vistaNeutra(p) { p.cab.rotation.set(0, 0, 0); p.cab.position.set(PESCOCO.x, PESCOCO.y, PESCOCO.z); p.tronco.rotation.z = 0; posicionarMaos(p, 0); p.neutro = true; }

const _s = new THREE.Vector3(), _h = new THREE.Vector3(), _e = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0);
// um osso (cilindro de comprimento 1 ao longo de y) do ponto `de` ao ponto `ate`
function osso(m, de, ate) { _d.subVectors(ate, de); const len = _d.length() || 1e-4; m.position.copy(de); m.quaternion.copy(_q.setFromUnitVectors(_y, _d.divideScalar(len))); m.scale.set(1, len, 1); }
// as luvas giram com o volante; cada braço é de 2 ossos (ombro → cotovelo → luva): IK simples, o cotovelo abre para fora e para baixo (o "polo")
function posicionarMaos(p, ang, tremX = 0, tremY = 0) {
  p.maos.position.set(p.centro.x + tremX, p.centro.y + tremY, p.centro.z); p.maos.rotation.z = ang;
  const c = Math.cos(ang), s = Math.sin(ang), L1 = OSSO.cima, L2 = OSSO.baixo;
  for (let i = 0; i < 2; i++) {
    const lado = i ? 1 : -1, hx = lado * (GRIP.x + PULSO.x), hy = GRIP.y + PULSO.y; // a luva no quadro do volante → no quadro do carro (gira em z)
    _h.set(p.centro.x + tremX + hx * c - hy * s, p.centro.y + tremY + hx * s + hy * c, p.centro.z + GRIP.z + PULSO.z); // o pulso: o antebraço termina dentro do punho escuro da luva
    _s.set(lado * OMBRO.x, OMBRO.y, OMBRO.z);
    _d.subVectors(_h, _s); const dist = _d.length() || 1e-4; _d.divideScalar(dist);
    const alcance = Math.min(dist, (L1 + L2) * 0.999), a = (L1 * L1 - L2 * L2 + alcance * alcance) / (2 * alcance), alt = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    _p.set(lado * 0.9, -0.35, 0.25); _p.addScaledVector(_d, -_p.dot(_d)); if (_p.lengthSq() < 1e-6) _p.set(lado, 0, 0); _p.normalize();
    _e.copy(_s).addScaledVector(_d, a).addScaledVector(_p, alt); // o cotovelo
    if (p.corpo.visible) osso(p.bracos[i], _s, _e);
    osso(p.foreBracos[i], _e, _h);
  }
}

// a cada quadro, depois de animarF1 (o volante já girou). e: { dt, v, steer (−1 a 1; positivo = direita), dec (desaceleração, u/s²; negativa = acelerando), lod, vitrine }
export function animarPiloto(p, e) {
  if (!p) return;
  const dt = Math.min(0.05, Math.max(0, e.dt || 0)); if (!(dt > 0)) return;
  const ang = p.kt.volante ? p.kt.volante.rotation.z : -(e.steer || 0) * 0.9; p.ang = ang;
  if (e.lod >= 1) return; // de longe: sem animação (e sem luvas nem ombros: lodKart)
  if (p.escondido) { posicionarMaos(p, ang); return; } // na primeira pessoa só as luvas contam: a cabeça e os braços nem se calculam
  const rm = menosMovimento.matches;
  if (rm) { // movimento reduzido: a cabeça parada no centro; só as luvas acompanham o volante
    if (!p.neutro) vistaNeutra(p);
    posicionarMaos(p, ang); return;
  }
  p.neutro = false; p.t += dt;
  const t = p.t, v = e.vitrine ? 140 : Math.abs(e.v || 0), vk = e.vitrine ? 0.35 : lim(v / 300, 0, 1.2);
  const lat = lim(e.steer || 0, -1, 1) * lim(v / 220, 0, 1); // a força lateral (com sinal: positivo = curva para a direita)
  // frenagem e aceleração: a desaceleração, suavizada
  const dec = e.dec || 0, brkAlvo = lim((dec - 30) / 190, 0, 1), acc = lim((-dec - 30) / 220, 0, 1);
  p.brk += (brkAlvo - p.brk) * (1 - Math.exp(-dt * 9));
  p.acc = (p.acc || 0) + (acc - (p.acc || 0)) * (1 - Math.exp(-dt * 5));
  // o ruído das retas: soma de senos por canal, com a respiração lenta; maior com a velocidade
  const resp = 0.72 + 0.28 * Math.sin(6.2832 * p.modula[0] * t + p.modula[1]), A = p.agit * resp * (0.4 + 0.6 * lim(vk, 0, 1));
  const vib = vk > 0.2 ? ruido(p.vibra, t) * 0.004 * vk * vk : 0; // a trepidação de alta velocidade
  // a olhada no espelho
  const o = p.olhar; let env = 0;
  if (o.t < 0) {
    o.prox -= dt;
    if (o.prox <= 0) {
      if (Math.abs(e.steer || 0) < 0.3 && (v > 60 || e.vitrine) && p.brk < 0.4) { o.t = 0; o.dur = 0.5 + p.rng() * 0.4; o.lado = p.rng() < 0.5 ? -1 : 1; }
      else o.prox = 0.6;
    }
  } else {
    o.t += dt; const s = o.t / o.dur;
    if (s >= 1) { o.t = -1; o.prox = 3.5 + p.rng() * 8.5; } else env = s < 0.3 ? suave(s / 0.3) : s < 0.7 ? 1 : suave((1 - s) / 0.3);
  }
  // os alvos das molas (positivo = direita no roll e no yaw)
  const roll = mola(p.mRoll, 0.2 * lat + 0.026 * A * ruido(p.nRoll, t), p.w.roll, p.z.roll, dt);
  const yaw = mola(p.mYaw, 0.25 * lat + 0.034 * A * ruido(p.nYaw, t), p.w.yaw, p.z.yaw, dt);
  const pitch = mola(p.mPitch, -0.14 * p.brk + 0.035 * p.acc + 0.01 * A * ruido(p.nPitch, t), p.w.pitch, p.z.pitch, dt);
  const sx = mola(p.mX, 0.008 * lat + 0.004 * A * ruido(p.nX, t), 8, 0.7, dt);
  // a cabeça: pivô no pescoço (inclinar a cabeça em torno dele já a desloca para o lado de dentro)
  p.cab.rotation.set(pitch + vib - 0.04 * env, -(yaw + p.olhar.lado * 0.6 * env), -(roll + p.olhar.lado * 0.05 * env + vib * 0.6));
  p.cab.position.set(PESCOCO.x + sx, PESCOCO.y, PESCOCO.z - 0.025 * p.brk + 0.008 * p.acc);
  p.tronco.rotation.z = -roll * 0.22;
  posicionarMaos(p, ang, ruido(p.nX, t * 1.7) * 0.0025 * A, ruido(p.nPitch, t * 1.3) * 0.0025 * A);
}
