// Corrida da Galera — não desenhar o que não dá para ver. O three só descarta o que está fora do enquadramento: um prédio atrás do morro, ou a
// cidade inteira vista de dentro do túnel, ia para a placa de vídeo do mesmo jeito (em Mônaco, chegavam a ser 690 objetos para 17 visíveis).
//
// A primeira vez que a pista aparece, um mapa é montado aos poucos, durante a transmissão de abertura: um desenho pequeno por quadro, cada objeto com
// uma cor própria, de cada trecho da volta e para os quatro lados. As cores que sobraram na imagem são o que dá para ver dali. Depois, cada troca de
// trecho só liga e desliga objetos. O mapa fica guardado na pista (`tr.recorte`) e serve para as próximas corridas nela.
//
// Para não sumir nada que apareceria:
// - os quatro lados no mapa valem para o retrovisor, para olhar para trás e para o carro rodado;
// - cada trecho soma os dois vizinhos de cada lado, que foram vistos de pontos e alturas diferentes da largura da pista;
// - o que está a menos de PERTO do trecho fica sempre ligado (a sombra do sol só alcança 260 em volta do carro, então nada que faz sombra perto some);
// - só entra quem é opaco, não muda e estava visível: vidro, cerca e fumaça ficam sempre ligados e não escondem o que está atrás;
// - longe da pista, na aérea e na TV o mapa não vale, e tudo volta a ser desenhado.
// As árvores recortadas (alphaTest) entram no mapa, mas num segundo desenho que não esconde nada atrás delas. Os carros também: no mesmo segundo desenho, um
// marcador em cada trecho da pista diz de qual trecho se vê qual. Carro em trecho que não se vê daqui, e a mais de PERTO_CARRO, não é desenhado nem animado
// (o nome em cima dele fica). Eram o maior peso: até 343 chamadas, repetidas no desenho da vinheta (pos.js).
// A troca é pela camada (`layers`), não por `visible`: as outras partes do jogo continuam donas do `visible` das peças, sem conflito.
import * as THREE from "three";
import { renderer, cam as camJogo } from "./cena.js";

const PASSO_SETOR = 150, PERTO = 350, PERTO_CARRO = 800, LARG = 256, ALT = 144, CAMADA_MAPA = 6, CAMADA_LEVE = 7, VIZINHOS = 2, BASE_MARCA = 40000;
const LONGE_LADO = 180, LONGE_ALTURA = 90; // a câmera mais longe da pista que isso não está nas posições do mapa
const ALTURAS = [12, 60], SOLIDO = (m) => m && !m.transparent && m.opacity >= 1, RECORTADO = (m) => m.alphaTest > 0 || !!m.alphaMap;

function montar(tr) {
  const objs = [], ids = [], esferas = [];
  tr.grp.updateWorldMatrix(true, true);
  tr.grp.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry || o.frustumCulled === false) return;
    const mats = [].concat(o.material); if (!mats.every(SOLIDO)) return;
    if (objs.length >= BASE_MARCA - 1) return;
    const leve = mats.some(RECORTADO); // (árvore: vista, mas não esconde o que está atrás)
    const id = objs.length + 1, cor = new THREE.Color().setRGB((id & 255) / 255, (id >> 8) / 255, 0, THREE.LinearSRGBColorSpace);
    const novos = mats.map((m) => new THREE.MeshBasicMaterial({ color: cor, side: leve ? THREE.DoubleSide : m.side, fog: false, toneMapped: false, depthWrite: !leve }));
    objs.push(o); ids.push(Array.isArray(o.material) ? novos : novos[0]);
    let s; if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); s = o.boundingSphere; } else { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); s = o.geometry.boundingSphere; }
    const c = s.center.clone().applyMatrix4(o.matrixWorld); esferas.push([c.x, c.y, c.z, s.radius * o.matrixWorld.getMaxScaleOnAxis()]);
    o.layers.enable(leve ? CAMADA_LEVE : CAMADA_MAPA);
  });
  const total = Math.max(8, Math.round((tr.n * 6) / PASSO_SETOR)), brutos = Array.from({ length: total }, () => new Uint8Array(objs.length));
  // os marcadores dos trechos, um por instância, com a cor do trecho (só o desenho do mapa os vê)
  const marcas = new THREE.InstancedMesh(new THREE.BoxGeometry(70, 36, 70), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false, depthWrite: false }), total), m = new THREE.Matrix4(), c = new THREE.Color();
  for (let s = 0; s < total; s++) {
    const p = tr.pts[Math.floor((s / total) * tr.n)], id = BASE_MARCA + s;
    marcas.setMatrixAt(s, m.makeTranslation(p.x, p.h + 14, p.y)); marcas.setColorAt(s, c.setRGB((id & 255) / 255, (id >> 8) / 255, 0, THREE.LinearSRGBColorSpace));
  }
  marcas.frustumCulled = false; marcas.layers.set(CAMADA_LEVE); tr.grp.add(marcas);
  return { objs, ids, esferas, total, brutos, marcas, veBrutos: Array.from({ length: total }, () => new Uint8Array(total)), ve: null, setores: null, feito: 0, ligado: -1, rt: null, buf: null, olho: null, idx: 0 };
}

// o ponto de onde o trecho `s` é visto: as alturas e os lados da pista se alternam, e a soma dos vizinhos cobre todos
function olharDe(R, tr, s, dir) {
  const p = tr.pts[Math.floor((s / R.total) * tr.n)], lado = [0, 1, -1][s % 3] * (tr.W / 2), x = p.x - p.ty * lado, z = p.y + p.tx * lado, a = Math.atan2(p.ty, p.tx) + (dir * Math.PI) / 2;
  R.olho.position.set(x, p.h + ALTURAS[s % 2], z); R.olho.up.set(0, 1, 0); R.olho.lookAt(x + Math.cos(a), p.h + ALTURAS[s % 2], z + Math.sin(a)); R.olho.updateMatrixWorld(true);
}

function ler(R, s) {
  const bruto = R.brutos[s], ve = R.veBrutos[s], b = R.buf;
  for (let k = 0; k < b.length; k += 4) { const id = b[k] | (b[k + 1] << 8); if (id >= BASE_MARCA) ve[id - BASE_MARCA] = 1; else if (id) bruto[id - 1] = 1; }
}
// um desenho do mapa
function passoDoMapa(R, tr) {
  const n = R.feito, s = n >> 2, dir = n & 3, { objs, ids } = R;
  if (!R.rt) {
    R.rt = new THREE.WebGLRenderTarget(LARG, ALT, { samples: 0, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true });
    R.buf = new Uint8Array(LARG * ALT * 4); R.olho = new THREE.PerspectiveCamera(75, 1.6, 1, camJogo.far); 
  }
  olharDe(R, tr, s, dir);
  const velhos = objs.map((o) => o.material), cores = objs.map((o) => o.instanceColor);
  for (let i = 0; i < objs.length; i++) { objs[i].material = ids[i]; if (objs[i].instanceColor) objs[i].instanceColor = null; }
  const auto = renderer.autoClear, alvo = renderer.getRenderTarget(), sombra = renderer.shadowMap.autoUpdate, tom = renderer.toneMapping, limpa = new THREE.Color(), alfa = renderer.getClearAlpha(); renderer.getClearColor(limpa);
  renderer.shadowMap.autoUpdate = false; renderer.toneMapping = THREE.NoToneMapping; renderer.setClearColor(0x000000, 1);
  try {
    renderer.setRenderTarget(R.rt); renderer.autoClear = true; R.olho.layers.set(CAMADA_MAPA); renderer.render(tr.grp, R.olho);
    renderer.readRenderTargetPixels(R.rt, 0, 0, LARG, ALT, R.buf); ler(R, s);
    // o segundo desenho, sobre a mesma profundidade: as árvores e os marcadores dos trechos
    renderer.autoClear = false; renderer.clear(true, false, false); R.olho.layers.set(CAMADA_LEVE); renderer.render(tr.grp, R.olho);
    renderer.readRenderTargetPixels(R.rt, 0, 0, LARG, ALT, R.buf); ler(R, s);
  } finally {
    renderer.autoClear = auto;
    renderer.setRenderTarget(alvo); renderer.shadowMap.autoUpdate = sombra; renderer.toneMapping = tom; renderer.setClearColor(limpa, alfa);
    for (let i = 0; i < objs.length; i++) { objs[i].material = velhos[i]; objs[i].instanceColor = cores[i]; }
  }
  if (++R.feito >= R.total * 4) fechar(R, tr);
}

// o mapa pronto: cada trecho soma os vizinhos e o que está perto
function fechar(R, tr) {
  const N = R.objs.length;
  R.setores = R.brutos.map((_, s) => {
    const m = new Uint8Array(N), p = tr.pts[Math.floor((s / R.total) * tr.n)];
    for (let d = -VIZINHOS; d <= VIZINHOS; d++) { const q = R.brutos[(s + d + R.total) % R.total]; for (let i = 0; i < N; i++) if (q[i]) m[i] = 1; }
    for (let i = 0; i < N; i++) { const e = R.esferas[i]; if (Math.hypot(e[0] - p.x, e[1] - p.h, e[2] - p.y) - e[3] < PERTO) m[i] = 1; }
    return m;
  });
  const T = R.total;
  R.ve = R.veBrutos.map((_, s) => {
    const m = new Uint8Array(T);
    for (let d = -VIZINHOS; d <= VIZINHOS; d++) { const q = R.veBrutos[(s + d + T) % T]; for (let j = 0; j < T; j++) if (q[j]) { m[j] = 1; m[(j + 1) % T] = 1; m[(j - 1 + T) % T] = 1; } }
    return m;
  });
  tr.grp.remove(R.marcas); R.marcas.geometry.dispose(); R.marcas.material.dispose(); R.marcas.dispose(); R.marcas = null; R.veBrutos = null;
  R.brutos = null; R.ids.forEach((m) => [].concat(m).forEach((x) => x.dispose())); R.ids = null;
  R.rt.dispose(); R.rt = null; R.buf = null;
}

function aplicar(R, s) {
  if (R.ligado === s) return;
  R.ligado = s;
  const m = s < 0 ? null : R.setores[s];
  for (let i = 0; i < R.objs.length; i++) { const l = R.objs[i].layers; if (!m || m[i]) l.enable(0); else l.disable(0); }
}

// Uma vez por quadro, com a câmera já posta e antes de desenhar. `valeMapa`: a câmera é de quem está na pista (nem aérea nem TV).
export function quadroRecorte(tr, cam, valeMapa, nearest) {
  const R = tr.recorte || (tr.recorte = montar(tr));
  if (!R.setores) { passoDoMapa(R, tr); return; }
  if (!valeMapa) { aplicar(R, -1); return; }
  R.idx = nearest(tr, cam.position.x, cam.position.z, R.idx);
  const p = tr.pts[R.idx], longe = Math.hypot(p.x - cam.position.x, p.y - cam.position.z) > tr.W / 2 + LONGE_LADO || Math.abs(cam.position.y - p.h) > LONGE_ALTURA;
  aplicar(R, longe ? -1 : Math.floor((R.idx / tr.n) * R.total) % R.total);
}
// Este carro aparece da câmera atual? (o mapa pronto e valendo; senão, sempre)
export function carroVisivel(tr, cam, x, y, idx) {
  const R = tr.recorte; if (!R || !R.ve || R.ligado < 0 || idx == null) return true;
  if (Math.hypot(x - cam.position.x, y - cam.position.z) < PERTO_CARRO) return true;
  return !!R.ve[R.ligado][Math.floor((idx / tr.n) * R.total) % R.total];
}
// liga e desliga um carro nos dois desenhos, o da cena e o da vinheta (pos.js não religa quem está `recortado`)
export function mostrarCarro(kart, visivel) {
  if (!kart || !kart.g || (kart.recVisivel === visivel && kart.recDe === kart.mats)) return;
  kart.recVisivel = visivel; kart.recDe = kart.mats;
  kart.g.traverse((o) => { if (!o.isMesh) return; o.userData.recortado = !visivel; if (visivel) o.layers.enable(0); else { o.layers.disable(0); o.layers.disable(1); } });
}
// a corrida acabou: tudo volta a ser desenhado (o mapa continua guardado)
export function soltarRecorte(tr) { const R = tr?.recorte; if (R && R.setores) aplicar(R, -1); }
// #debug: termina o mapa de uma vez e escolhe o trecho na mão
export const depurarRecorte = {
  terminar(tr) { const R = tr.recorte || (tr.recorte = montar(tr)); const t0 = performance.now(), de = R.feito; while (!R.setores) passoDoMapa(R, tr); return { objetos: R.objs.length, trechos: R.total, desenhos: R.total * 4 - de, ms: Math.round(performance.now() - t0) }; },
  usar(tr, s) { aplicar(tr.recorte, s); },
  carroVisivel, mostrarCarro,
};
