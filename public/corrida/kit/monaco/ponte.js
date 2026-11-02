// Mônaco — a ponte do Portier: o viaduto da Boulevard du Larvotto (o antigo leito da estrada de ferro) que passa POR CIMA do circuito uns 30 m antes da
// Portier, ainda na descida do Mirabeau Bas, e logo depois dele a pista entra debaixo do Rond-Point du Portier, rumo ao túnel. No OpenStreetMap é a via
// 92627405 (bridge=yes, layer=1, cruzando a "raceway" a ~30 m do ápice do Portier); a transmissão mostra o carro passando sob uma laje de concreto reta,
// com guarda-corpo de metal e as duas cabeceiras de pedra na encosta. A posição vem do cruzamento real (fração ~0,43 da volta, entre `mirabeauBas` e `portier`
// de dados.js, que é GERADO: por isso a fração fica aqui, interpolada, em vez de entrar em `D.frac`).
//
// No jogo: uma laje reta, perpendicular à pista, com o vão livre de ponta a ponta do muro (`tr.wallLat` + folga) e 36 de folga sobre o ponto mais alto da pista
// debaixo dela (o túnel tem 34; a câmera de perseguição passa folgada). As cabeceiras de pedra ficam ATRÁS do muro e do guard-rail (nada toca a pista) e, como o
// terreno em volta é plano e a laje está uns 40 acima dele, a estrada desce em rampa até o chão. Uma malha só, com cor por vértice e o mesmo material do canteiro do
// grampo (`monaco-canteiro`): o fundir.js a junta com ele. Nada vai para `tr` além de números (pessoas, posição), que é o que o fundir.js deixa passar.
import * as THREE from "three";
import { D } from "./mundo.js";

const COR = { concreto: "#bdb8ac", baixo: "#8d897f", asfalto: "#4a4a4e", calcada: "#a9a496", pedra: "#c4b48f", pedraEscura: "#a89a78", trilho: "#3d4247", poste: "#1f5a3a", faixa: "#ececec" };
const LARG = 26; // meia largura da estrada em cima da ponte (52 unidades, ~11 m)
const FOLGA = 36, LAJE = 6; // vão livre sobre a pista e a espessura da laje
const CABECEIRA = 20, RAMPA = 100; // a profundidade da cabeceira de pedra (atrás do muro) e o comprimento da rampa até o chão

// as peças ficam em coordenadas locais: x ao longo da pista, z de lado (ao longo da ponte) e y absoluto; no fim giram e andam para o lugar da ponte
const pinta = (g, f) => { const n = g.attributes.position.count, v = []; for (let i = 0; i < n; i++) { const k = new THREE.Color(f(i)); v.push(k.r, k.g, k.b); } g.setAttribute("color", new THREE.Float32BufferAttribute(v, 3)); return g; };
// caixa: cores por face (cima, baixo e lados). A BoxGeometry sai em grupos de 6 vértices: +x, -x, +y, -y, +z, -z
function caixa(sx, sy, sz, cx, cy, cz, { cima, baixo, lado }) {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(cx, cy, cz);
  return pinta(g, (i) => { const f = Math.floor(i / 6); return f === 2 ? cima : f === 3 ? baixo : lado; });
}
// sólido por triângulos (a rampa): cada triângulo é virado para fora do centro, então a ordem dos vértices não importa
function solido(tris, centro) {
  const pos = [], cor = [];
  for (const [a, b, c, cl] of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const fora = nrm[0] * (a[0] - centro[0]) + nrm[1] * (a[1] - centro[1]) + nrm[2] * (a[2] - centro[2]) > 0, k = new THREE.Color(cl);
    for (const q of fora ? [a, b, c] : [a, c, b]) { pos.push(...q); cor.push(k.r, k.g, k.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); g.computeVertexNormals(); return g;
}
const junta = (gs) => { const pos = [], nor = [], col = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g; };

// a fração real: o cruzamento fica a ~68% do caminho entre o ápice do Mirabeau Bas e o do Portier (medido na linha central real e no OSM)
export const fracDaPonte = () => D.frac.curvas.mirabeauBas + 0.68 * (D.frac.curvas.portier - D.frac.curvas.mirabeauBas);

export function pontePortier(tr, add, hAt, predioEm) {
  const { pts, n } = tr, L = tr.wallLat, i = Math.floor(fracDaPonte() * n), p = pts[i];
  const ry = Math.atan2(p.nx, p.ny); // z local = o lado da pista (como as bocas do túnel)
  const sentido = Math.sign(p.tx * p.ny - p.ty * p.nx) || 1; // +1: o x local (ny, -nx) aponta no sentido da corrida
  // a laje fica 36 acima do ponto mais alto da pista debaixo dela (a descida é forte: ~14 em 12 pontos)
  let hMax = -1e9; for (let k = -6; k <= 6; k++) hMax = Math.max(hMax, pts[(i + k + n) % n].h);
  const yb = hMax + FOLGA, yt = yb + LAJE, zV = L + 8, zC = zV + CABECEIRA, zR = zC + RAMPA; // vão livre, fim da cabeceira, fim da rampa
  // o chão onde a rampa acaba e o mais fundo dos pés das cabeceiras (cada lado tem o seu)
  const lado = (s) => { const q = (l, v = 0) => [p.x + p.nx * l * s + p.ty * v, p.y + p.ny * l * s - p.tx * v]; let g0 = 1e9, ge = -1e9; for (const v of [-LARG, 0, LARG]) { const [ex, ez] = q(zR, v); ge = Math.max(ge, hAt(ex, ez)); for (const l of [zV, zC, (zV + zR) / 2]) { const [x, z] = q(l, v); g0 = Math.min(g0, hAt(x, z)); } } return { ge: ge + 0.6, g0: g0 - 10 }; };
  const gs = [], cc = { cima: COR.concreto, baixo: COR.baixo, lado: COR.concreto }, pedra = { cima: COR.pedra, baixo: COR.pedraEscura, lado: COR.pedra };
  // a laje, sobre o vão e sobre as duas cabeceiras
  gs.push(caixa(LARG * 2, LAJE, zC * 2, 0, yb + LAJE / 2, 0, cc));
  // as vigas de borda, que descem sob a laje no vão (a faixa escura de baixo que se vê da pista)
  for (const s of [-1, 1]) gs.push(caixa(2.4, 4.5, zV * 2, s * (LARG - 1.2), yb - 2.25, 0, { cima: COR.baixo, baixo: COR.baixo, lado: COR.baixo }));
  // a pista de cima: asfalto, calçadas dos dois lados, guarda-corpo (mureta e o tubo de metal) e a faixa do meio
  gs.push(caixa((LARG - 6) * 2, 0.3, zC * 2, 0, yt + 0.15, 0, { cima: COR.asfalto, baixo: COR.asfalto, lado: COR.asfalto }));
  gs.push(caixa(0.5, 0.2, zC * 2 - 8, 0, yt + 0.4, 0, { cima: COR.faixa, baixo: COR.faixa, lado: COR.faixa }));
  for (const s of [-1, 1]) {
    gs.push(caixa(5.2, 0.6, zC * 2, s * (LARG - 3.6), yt + 0.3, 0, { cima: COR.calcada, baixo: COR.calcada, lado: COR.calcada }));
    gs.push(caixa(1.2, 3.4, zC * 2, s * (LARG - 0.6), yt + 1.7, 0, cc));
    gs.push(caixa(1.6, 0.7, zC * 2, s * (LARG - 0.6), yt + 3.75, 0, { cima: COR.trilho, baixo: COR.trilho, lado: COR.trilho }));
  }
  // as cabeceiras de pedra, atrás do muro, e a rampa da estrada até o chão
  const rampas = [];
  for (const s of [-1, 1]) {
    const { ge, g0 } = lado(s), alto = yt - g0;
    gs.push(caixa(LARG * 2 - 0.4, yb - g0, CABECEIRA, 0, g0 + (yb - g0) / 2, s * (zV + CABECEIRA / 2), pedra)); // o bloco da cabeceira, do fundo até a laje
    gs.push(caixa(LARG * 2 + 1.2, 1.4, 1.6, 0, yb - 0.4, s * (zV + 0.2), { cima: COR.concreto, baixo: COR.baixo, lado: COR.concreto })); // a viga de cima da face, saliente
    // a rampa: do nível da laje (z = zC) até o chão (z = zR). Quatro vértices em cima, quatro no fundo (g0), as laterais de pedra
    const A = [-LARG, yt + 0.3, s * zC], B = [LARG, yt + 0.3, s * zC], C = [LARG, ge, s * zR], Dd = [-LARG, ge, s * zR];
    const A0 = [-LARG, g0, s * zC], B0 = [LARG, g0, s * zC], C0 = [LARG, g0, s * zR], D0 = [-LARG, g0, s * zR];
    const centro = [0, (yt + g0) / 2, s * (zC + zR) / 2];
    gs.push(solido([[A, B, C, COR.asfalto], [A, C, Dd, COR.asfalto], [A, Dd, D0, COR.pedra], [A, D0, A0, COR.pedra], [B, C, C0, COR.pedra], [B, C0, B0, COR.pedra], [Dd, C, C0, COR.pedraEscura], [Dd, C0, D0, COR.pedraEscura], [A0, B0, B, COR.pedraEscura], [A0, B, A, COR.pedraEscura]], centro));
    rampas.push({ lado: s, alto: +alto.toFixed(1) });
  }
  // dois postes de rua, verdes como os do grampo, em cima, nas calçadas
  const postes = [];
  for (const s of [-1, 1]) for (const z of [-(zV - 14), zV - 14]) {
    gs.push(caixa(0.9, 15, 0.9, s * (LARG - 2.4), yt + 0.6 + 7.5, z, { cima: COR.poste, baixo: COR.poste, lado: COR.poste }));
    gs.push(caixa(2.4, 1.1, 1.8, s * (LARG - 2.4), yt + 16.2, z, { cima: "#f7e9b0", baixo: "#f7e9b0", lado: COR.poste })); postes.push(z);
  }
  const geo = junta(gs); geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(p.x, 0, p.y));
  // o mesmo material do canteiro do grampo, para o fundir.js juntar as duas
  const m = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }))); m.name = "monaco-ponte"; m.castShadow = true; m.receiveShadow = true;
  // a galera em cima (olhando os carros que chegam e os que saem, apoiada no guarda-corpo); vida.js a põe na torcida (o x local anda ao longo da pista, z de lado)
  const aqui = (xl, zl) => ({ x: p.x + p.ny * xl + p.nx * zl, z: p.y - p.nx * xl + p.ny * zl });
  const pessoas = [], yP = yt + 0.6, d0 = (xl) => xl * sentido; // d0: o x local de quem está `xl` à frente (no sentido da corrida)
  const gente = [[-1, -60], [-1, -44], [-1, -31], [-1, -14], [-1, 8], [-1, 22], [-1, 41], [-1, 57], [1, -52], [1, -27], [1, 3], [1, 36], [1, 52]];
  for (const [borda, zl] of gente) { // borda -1: a de trás (olha para quem chega); +1: a da frente (olha para quem vai)
    const xl = d0(borda * (LARG - 4.6)), q = aqui(xl, zl), olhar = [p.tx * -borda, p.ty * -borda]; // quem está atrás (borda -1) olha para trás (de onde vêm os carros)
    pessoas.push({ x: q.x, y: yP, z: q.z, ry: Math.atan2(olhar[0], olhar[1]) });
  }
  // o que ficou reservado: nenhuma árvore, gente ou arquibancada em cima da ponte e das cabeceiras
  const res = (tr.reservado ||= []); for (const l of [-(zR - 40), -(zV + 40), 0, zV + 40, zR - 40]) res.push([p.x + p.nx * l, p.y + p.ny * l, 70]);
  tr.ponteMonaco = { i, frac: +(i / n).toFixed(4), pos: [+p.x.toFixed(0), +p.y.toFixed(0)], yb: +yb.toFixed(1), yt: +yt.toFixed(1), folga: FOLGA, vao: zV, rampas, postes: postes.length, pessoas, predios: [-zR, -zC, 0, zC, zR].map((l) => !!predioEm(p.x + p.nx * l, p.y + p.ny * l, 6)) };
}
