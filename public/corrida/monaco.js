// Corrida da Galera — o cenário de Mônaco: o porto Hercule com os iates, a piscina, as arquibancadas azuis, o túnel
// embaixo do hotel (com teto opaco), a Place du Casino
// com o canteiro redondo e as palmeiras, e o Cassino. As coordenadas fixas estão no quadrado de 1600 do traçado (as
// mesmas dos vértices em pistas.js) e são multiplicadas pela escala da pista.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";

// o mar e o porto: dentro deste contorno e longe da pista (a borda vira o cais)
const MAR = [[323, 943], [447, 927], [447, 766], [524, 710], [741, 865], [834, 881], [1051, 974], [1268, 1020], [1516, 943], [1640, 865], [2300, 865], [2300, 2300], [-700, 2300], [-700, 1206], [152, 1191], [323, 1175]];
// o Rochedo (Monaco-Ville): o morro de pedra que entra no mar do outro lado do porto, com o Palácio lá em cima
const ROCHA = [[-160, 1215], [120, 1222], [300, 1238], [395, 1275], [390, 1330], [260, 1380], [40, 1398], [-170, 1345]];
const ALTO_ROCHA = 52;
const dentro = (pol, x, y) => { let c = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [xi, yi] = pol[i], [xj, yj] = pol[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const ateBorda = (pol, x, y) => { let m = Infinity; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [ax, ay] = pol[j], [bx, by] = pol[i], dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - ax - dx * k, y - ay - dy * k)); } return m; };
// Quanto (x, y) está para dentro da água: positivo no mar, negativo em terra (em unidades do mundo). Contínuo, para o
// chão descer no cais em linha lisa (e não em degraus da malha); o cais fica a 40 do guard-rail.
const naRocha = (tr, x, y) => { const K = tr.t.scale, bx = x / K, by = y / K, d = ateBorda(ROCHA, bx, by) * K; return dentro(ROCHA, bx, by) ? d : -d; };
// a altura do Rochedo: paredão de pedra na beira e o alto quase plano
export function alturaRocha(tr, x, y) { const s = naRocha(tr, x, y); return s <= 0 ? 0 : ALTO_ROCHA * Math.min(1, s / 45) + 12 * Math.min(1, Math.max(0, s - 45) / 260); }
export function fundoMonaco(tr, x, y) {
  const K = tr.t.scale, bx = x / K, by = y / K, d = ateBorda(MAR, bx, by) * K, sMar = Math.min(dentro(MAR, bx, by) ? d : -d, -naRocha(tr, x, y));
  if (sMar < -60) return sMar;
  const { pts, n } = tr, c = tr.indiceAt(x, y); let dr = Infinity;
  for (let k = c - 3; k <= c + 3; k++) { const p = pts[(k + n) % n]; dr = Math.min(dr, Math.hypot(p.x - x, p.y - y)); }
  return Math.min(sMar, dr - (tr.W / 2 + tr.t.wall + 40));
}
export const aguaMonaco = (tr, x, y) => fundoMonaco(tr, x, y) > 0;
// a beira do porto (o cais da Piscine, do Tabac e da chicane): aberta, sem prédio entre a pista e os iates
export const orlaMonaco = (tr, x, y) => y / tr.t.scale > 560 && x / tr.t.scale < 1100 && fundoMonaco(tr, x, y) > -380;

// uma faixa ao longo da pista, do ponto i0 ao i1: de lado de l0 a l1, na altura da pista + y0 a y1 (sem descer com o
// barranco: é para coisas construídas, como o túnel, o hotel e as arquibancadas)
function faixa(tr, add, i0, i1, l0, l1, y0, y1, mat, vLen = 40, uSpan = 1) {
  const { pts, n } = tr, vs = [], uv = [], idx = [];
  for (let i = i0; i <= i1; i++) {
    const p = pts[((i % n) + n) % n], d = (i - i0) * 6;
    vs.push(p.x + p.nx * l0, p.h + y0, p.y + p.ny * l0, p.x + p.nx * l1, p.h + y1, p.y + p.ny * l1); uv.push(0, d / vLen, uSpan, d / vLen);
    if (i < i1) { const a = (i - i0) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.castShadow = m.receiveShadow = true; return m;
}
// um bloco que acompanha a curva da pista (teto, frente, fundo e as duas pontas)
function bloco(tr, add, i0, i1, l0, l1, y0, y1, lados, topo, vTopo = 60) {
  faixa(tr, add, i0, i1, l0, l1, y1, y1, topo, vTopo);
  faixa(tr, add, i0, i1, l0, l0, y0, y1, lados, 60); faixa(tr, add, i0, i1, l1, l1, y0, y1, lados, 60);
  for (const i of [i0, i1]) { const p = tr.pts[((i % tr.n) + tr.n) % tr.n], g = new THREE.PlaneGeometry(Math.abs(l1 - l0), y1 - y0), m = add(new THREE.Mesh(g, lados)); m.position.set(p.x + p.nx * (l0 + l1) / 2, p.h + (y0 + y1) / 2, p.y + p.ny * (l0 + l1) / 2); m.rotation.y = Math.atan2(-p.ny, p.nx); }
}
const janelas = (fundo, vidro, w = 64, h = 64) => canvasTex(w, h, (x, ww, hh, rr) => {
  x.fillStyle = fundo; x.fillRect(0, 0, ww, hh);
  for (let yy = 6; yy < hh - 4; yy += 14) for (let xx = 5; xx < ww - 4; xx += 12) { x.fillStyle = vidro; x.fillRect(xx, yy, 7, 8); x.fillStyle = "#ffffff55"; x.fillRect(xx - 1, yy + 8, 9, 2); if (rr() < 0.3) { x.fillStyle = "#e7a8a0"; x.fillRect(xx, yy, 7, 2); } }
});
const indicePerto = (tr, bx, by) => tr.indiceAt(bx * tr.t.scale, by * tr.t.scale);
// o ápice de uma curva perto do vértice (bx, by): o ponto mais curvo, o centro da curva e o raio
function apice(tr, bx, by) {
  const { pts, n } = tr, c = indicePerto(tr, bx, by); let best = c;
  for (let k = c - 40; k <= c + 40; k++) { const q = (k + n) % n; if (pts[q].k > pts[best].k) best = q; }
  const p = pts[best], q = pts[(best + 3) % n], dentroLado = p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1, R = 1 / p.k;
  return { i: best, p, R, lado: dentroLado, cx: p.x + p.nx * dentroLado * R, cy: p.y + p.ny * dentroLado * R };
}

// ---------- monta tudo (chamado por pista.js, dentro do grupo da pista) ----------
export function cenarioMonaco(tr, { add, r, hAt, size, aguaTex, palms, yachts, jungle, blds }) {
  const { pts, n, W } = tr, t = tr.t, K = t.scale, L = tr.wallLat, world = t.world;
  const reservado = (tr.reservado ||= []); tr.arquibancadas = []; // inclui o corredor reservado antes do cenário
  // ---- o mar inteiro (o chão afunda onde é água: pista.js usa aguaMonaco) ----
  const seaM = new THREE.MeshStandardMaterial({ map: aguaTex("#1f6fae"), roughness: 0.15, metalness: 0.25 }); seaM.map.repeat.set(size / 220, size / 220); tr.agua.push(seaM);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), seaM)); sea.rotation.x = -Math.PI / 2; sea.position.set(world / 2, -6, world / 2);
  // ---- a marina: píeres saindo do cais para dentro do porto, com os iates presos dos dois lados; os maiores (os
  // superiates) ficam soltos na boca do porto ----
  const pier = M(0xb9b2a4, { roughness: 0.9 });
  for (let bx = 480; bx <= 960; bx += 80) {
    let y0 = null, y1 = null;
    for (let by = 700; by < 1080; by += 4) if (fundoMonaco(tr, bx * K, by * K) > 12) { if (y0 === null) y0 = by * K; y1 = by * K; } else if (y0 !== null) break;
    if (y0 === null || y1 - y0 < 120) continue;
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(7, 2, y1 - y0), pier)); m.position.set(bx * K, -4, (y0 + y1) / 2); m.receiveShadow = true;
    for (let y = y0 + 14; y < y1 - 6; y += 23) for (const lado of [-1, 1]) {
      const s = 0.7 + r() * 0.7, x = bx * K + lado * (6 + 30 * s);
      if (r() < 0.85 && fundoMonaco(tr, x + lado * 30 * s, y) > 0) yachts.push({ x, y, h: -6, s, r: lado > 0 ? 0 : Math.PI });
    }
  }
  for (let k = 0; k < 7; k++) { const x = (430 + r() * 560) * K, y = (1095 + r() * 70) * K; if (fundoMonaco(tr, x, y) > 90) yachts.push({ x, y, h: -6, s: 2 + r() * 0.8, r: (r() - 0.5) * 0.6 }); }
  // ---- a piscina (Stade Nautique), entre a Piscine e o porto ----
  {
    const cx = 388 * K, cy = 859 * K, a = Math.atan2(35, -28), h = hAt(cx, cy) + 1.6, g = new THREE.Group(); g.position.set(cx, h, cy); g.rotation.y = -a; add(g);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(250, 3, 130), M(0xf2efe6, { roughness: 0.7 })); deck.position.y = -1.5; deck.receiveShadow = true; g.add(deck);
    const aguaP = new THREE.MeshStandardMaterial({ map: aguaTex("#2fb3e0"), roughness: 0.1, metalness: 0.1 }); aguaP.map.repeat.set(2, 1); tr.agua.push(aguaP);
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(200, 90), aguaP); agua.rotation.x = -Math.PI / 2; agua.position.y = 0.3; g.add(agua);
    for (let k = 1; k < 8; k++) { const raia = new THREE.Mesh(new THREE.BoxGeometry(200, 0.6, 0.8), M(k % 2 ? 0xff5a4a : 0xffffff)); raia.position.set(0, 0.7, -45 + k * 11.25); g.add(raia); }
    const prancha = new THREE.Mesh(new THREE.BoxGeometry(10, 22, 10), M(0xdedad0)); prancha.position.set(112, 11, 30); prancha.castShadow = true; g.add(prancha);
    reservado.push([cx, cy, 240]);
  }
  // ---- a Place du Casino: o canteiro redondo com palmeiras dentro da curva do Cassino, e o Cassino atrás ----
  {
    const ap = apice(tr, 1150, 648), raio = ap.R - W / 2 - t.wall - 4, h = hAt(ap.cx, ap.cy); tr.pracaCassino = { x: ap.cx, y: ap.cy }; // o som da fonte
    if (raio > 12) {
      const borda = add(new THREE.Mesh(new THREE.CylinderGeometry(raio, raio + 1, 3, 40), M(0xe9e4d8, { roughness: 0.8 }))); borda.position.set(ap.cx, h + 1.5, ap.cy); borda.receiveShadow = true;
      const flores = canvasTex(128, 128, (x, w, hh, rr) => { x.fillStyle = "#4f9a3a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 700; i++) { x.fillStyle = ["#e94f6a", "#ffd23f", "#ffffff", "#ff8fb8", "#3d8a2e"][(rr() * 5) | 0]; x.fillRect(rr() * w, rr() * hh, 3, 3); } });
      const grama = add(new THREE.Mesh(new THREE.CircleGeometry(raio - 2.5, 40), new THREE.MeshStandardMaterial({ map: flores, roughness: 1 }))); grama.rotation.x = -Math.PI / 2; grama.position.set(ap.cx, h + 3.1, ap.cy);
      const fonte = add(new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.22, raio * 0.26, 4, 20), M(0xd9d3c4))); fonte.position.set(ap.cx, h + 4, ap.cy);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3, d = raio * 0.6; palms.push({ x: ap.cx + Math.cos(a) * d, y: ap.cy + Math.sin(a) * d, h: h + 3, s: 0.8 + r() * 0.25, r: r() * 6 }); }
      reservado.push([ap.cx, ap.cy, raio + 10]);
    }
    // o Cassino: fachada creme com as duas torres e o telhado verde de cobre, de frente para a praça
    const cx = 1252 * K, cy = 741 * K, hc = hAt(cx, cy), g = new THREE.Group(); g.position.set(cx, hc, cy); g.rotation.y = Math.atan2(ap.cx - cx, ap.cy - cy); add(g); // a frente (+z) virada para a praça
    const creme = new THREE.MeshStandardMaterial({ map: janelas("#efe2c4", "#7b8fa3"), roughness: 0.8 }), cobre = M(0x5f9e8a, { roughness: 0.6, metalness: 0.2 });
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(230, 56, 100), creme); corpo.position.y = 28; corpo.castShadow = corpo.receiveShadow = true; g.add(corpo);
    const telhado = new THREE.Mesh(new THREE.BoxGeometry(214, 12, 84), cobre); telhado.position.y = 62; telhado.castShadow = true; g.add(telhado); // a mansarda de cobre
    const cornija = new THREE.Mesh(new THREE.BoxGeometry(236, 3, 104), M(0xf6efdc)); cornija.position.y = 56.5; g.add(cornija);
    for (const s of [-1, 1]) {
      const torre = new THREE.Mesh(new THREE.BoxGeometry(30, 92, 30), creme); torre.position.set(s * 88, 46, 38); torre.castShadow = true; g.add(torre);
      const cupula = new THREE.Mesh(new THREE.ConeGeometry(21, 34, 4), cobre); cupula.rotation.y = Math.PI / 4; cupula.position.set(s * 88, 109, 38); cupula.castShadow = true; g.add(cupula);
    }
    const domo = new THREE.Mesh(new THREE.SphereGeometry(24, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), cobre); domo.position.set(0, 82, 0); g.add(domo);
    const escada = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 30), M(0xe6dcc6)); escada.position.set(0, 2, 62); g.add(escada);
    reservado.push([cx, cy, 190]);
    // os jardins em volta do Cassino (as palmeiras da praça)
    for (let k = 0; k < 10; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 50, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (tr.distAt(x, y) > L + 14) palms.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.4, r: r() * 6 }); }
  }
  // ---- arquibancadas azuis lotadas: na reta dos boxes, no cais (de frente para os iates) e na Rascasse ----
  // cada degrau é uma fileira: o encosto azul-claro corre ao longo da pista (v) e a galera sentada por cima
  const assentos = canvasTex(32, 256, (x, w, hh, rr) => {
    x.fillStyle = "#1f5fbf"; x.fillRect(0, 0, w, hh); x.fillStyle = "#3f86e8"; x.fillRect(w - 9, 0, 9, hh); x.fillStyle = "#17489a"; for (let yy = 0; yy < hh; yy += 6) x.fillRect(0, yy, w - 9, 1);
    for (let yy = 1; yy < hh - 4; yy += 6) if (rr() < 0.8) { x.fillStyle = ["#ffffff", "#e63946", "#ffd23f", "#1b1b1b", "#ff7ad9", "#43a047", "#f4f4f4"][(rr() * 7) | 0]; x.fillRect(8 + rr() * 8, yy, 6, 4); x.fillStyle = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a"][(rr() * 4) | 0]; x.fillRect(16 + rr() * 2, yy + 1, 3, 3); }
  });
  const cadeiras = new THREE.MeshStandardMaterial({ map: assentos, roughness: 0.8, side: THREE.DoubleSide }), estrutura = M(0xd8dbe0, { roughness: 0.7, side: THREE.DoubleSide }), cobertura = M(0xf4f4f4, { roughness: 0.5, side: THREE.DoubleSide });
  const arquibancada = (bx0, by0, bx1, by1, lado, degraus = 6) => {
    let i0 = indicePerto(tr, bx0, by0), i1 = indicePerto(tr, bx1, by1); if (i1 < i0) i1 += n;
    const l0 = lado * (L + 6);
    if (tr.noCorredor && Array.from({ length: Math.ceil((i1 - i0) / 4) + 1 }, (_, k) => pts[(i0 + k * 4) % n])
      .some((p) => tr.noCorredor(p.x + p.nx * l0, p.y + p.ny * l0))) return;
    for (let k = 0; k < degraus; k++) faixa(tr, add, i0, i1, l0 + lado * k * 9, l0 + lado * (k + 1) * 9, 4 + k * 6, 4 + k * 6, cadeiras, 48);
    faixa(tr, add, i0, i1, l0 + lado * degraus * 9, l0 + lado * degraus * 9, -8, 4 + degraus * 6 + 22, estrutura, 60); // o fundo
    faixa(tr, add, i0, i1, l0, l0, -8, 4, estrutura, 60);
    faixa(tr, add, i0, i1, l0 + lado * (degraus * 9 - 8), l0 + lado * (degraus * 9 + 4), 4 + degraus * 6 + 22, 4 + degraus * 6 + 25, cobertura, 60); // a marquise lá atrás (os assentos ficam à vista)
    for (let i = i0; i <= i1; i += 10) { const p = pts[i % n]; for (const d of [l0 + lado * 2, l0 + lado * degraus * 9]) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, degraus * 6 + 30), estrutura)); m.position.set(p.x + p.nx * d, p.h + (degraus * 6 + 30) / 2 - 4, p.y + p.ny * d); } }
    for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; reservado.push([p.x + p.nx * (l0 + lado * 30), p.y + p.ny * (l0 + lado * 30), 60]); }
    tr.arquibancadas.push([i0, i1]); // o som da torcida (kit/som.js)
  };
  arquibancada(150, 830, 300, 640, -1, 7); // reta dos boxes, do lado de fora
  arquibancada(380, 575, 470, 488, -1, 6); // chegando na Sainte Dévote
  arquibancada(735, 790, 560, 645, -1, 6); // o cais entre a chicane e o Tabac, com os iates atrás (lado do porto)
  arquibancada(470, 600, 380, 650, -1, 5); // saindo do Tabac
  arquibancada(350, 700, 255, 832, -1, 5); // a Piscine, entre a pista e a piscina
  // ---- o túnel (embaixo do hotel) ----
  {
    let i0 = indicePerto(tr, 1485, 797), i1 = indicePerto(tr, 927, 865), iH = indicePerto(tr, 1268, 927); if (i1 < i0) i1 += n; if (iH < i0) iH += n;
    const alto = 34;
    const parede = new THREE.MeshStandardMaterial({ map: canvasTex(64, 32, (x, w, hh) => { x.fillStyle = "#cfc8b8"; x.fillRect(0, 0, w, hh); x.fillStyle = "#b5ae9e"; x.fillRect(0, hh - 8, w, 8); x.fillStyle = "#f2c94c"; x.fillRect(0, 10, w, 2); }), roughness: 0.9, side: THREE.DoubleSide });
    faixa(tr, add, i0, i1, L + 1, L + 1, 0, alto, parede, 32); faixa(tr, add, i0, i1, -L - 1, -L - 1, 0, alto, parede, 32);
    // as luzes amarelas no teto, por dentro
    const luz = new THREE.MeshStandardMaterial({ color: 0xffe8a8, emissive: 0xffd27a, emissiveIntensity: 1.6 }), lg = new THREE.BoxGeometry(5, 1, 2);
    for (let i = i0; i <= i1; i += 3) { const p = pts[i % n]; for (const s of [-1, 1]) { const m = add(new THREE.Mesh(lg, luz)); m.position.set(p.x + p.nx * s * (L - 6), p.h + alto - 1.5, p.y + p.ny * s * (L - 6)); m.rotation.y = Math.atan2(p.tx, p.ty); } }
    // O teto e o hotel permanecem opacos mesmo quando o carro passa por baixo.
    const teto = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9, side: THREE.DoubleSide });
    const hotel = new THREE.MeshStandardMaterial({ map: janelas("#f3ede0", "#5d7f9c", 64, 64), roughness: 0.8, side: THREE.DoubleSide });
    const terraco = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#5f9a46"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 300; i++) { x.fillStyle = rr() < 0.5 ? "#4c8538" : "#78b05a"; x.fillRect(rr() * w, rr() * hh, 3, 3); } }), roughness: 1, side: THREE.DoubleSide });
    const telhadoHotel = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x, w, hh, rr) => { // o terraço do hotel: piso claro, jardins, a piscina e as casas de máquinas
      x.fillStyle = "#d9d3c5"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#c4bdae"; x.lineWidth = 2; for (let k = 0; k < w; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, hh); x.stroke(); }
      x.fillStyle = "#6aa14e"; x.fillRect(8, 10, 34, 40); x.fillRect(86, 70, 32, 46); x.fillStyle = "#3fb6e0"; x.fillRect(54, 20, 22, 30); x.fillStyle = "#9a9488"; for (let k = 0; k < 4; k++) x.fillRect(20 + k * 22, 96, 12, 12);
    }), roughness: 0.8, side: THREE.DoubleSide });
    faixa(tr, add, i0, i1, -L - 4, L + 4, alto, alto, teto, 60);
    // o hotel fica do lado do mar (avança sobre a água, como o de verdade) e não passa muito da altura do grampo, que
    // fica logo acima: em cima do túnel é o terraço com jardim
    bloco(tr, add, i0 - 4, iH, -L - 150, -L - 20, -20, alto + 70, hotel, telhadoHotel, 260);
    bloco(tr, add, i0, i1, -L - 20, L + 10, alto, alto + 6, terraco, terraco);
    for (let i = i0 - 10; i <= i1 + 10; i += 5) { const p = pts[((i % n) + n) % n]; reservado.push([p.x, p.y, L + 100]); }
    tr.coberto = (i) => { let k = i; if (k < i0 - 15) k += n; return k >= i0 - 15 && k <= i1 + 15; };
  }
  // onde os enfeites de vida.js e vida-mais.js não entram: na água, no que já foi montado aqui, em cima do túnel e
  // grudados no guard-rail (a grade de distância é grossa e deixava placas no meio do grampo)
  tr.ocupado = (x, y, i) => {
    if ((i != null && tr.coberto(i)) || fundoMonaco(tr, x, y) > -10 || reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr)) return true;
    const c = tr.indiceAt(x, y); for (let k = c - 3; k <= c + 3; k++) { const p = pts[(k + n) % n]; if (Math.hypot(p.x - x, p.y - y) < L + 8) return true; }
    return false;
  };
  // ---- o Rochedo: o Palácio do Príncipe (creme, com as torres de ameia) e a catedral, entre os jardins ----
  {
    const pedra = M(0xe9dcc0, { roughness: 0.85 }), telha = M(0xb5523b, { roughness: 0.8 }), px = 150 * K, py = 1300 * K, hp = hAt(px, py), g = new THREE.Group(); g.position.set(px, hp, py); g.rotation.y = 0.08; add(g);
    const ala = (w, h, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pedra); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); };
    ala(220, 34, 40, 0, -70); ala(220, 34, 40, 0, 70); ala(40, 34, 180, -100, 0); ala(40, 34, 180, 100, 0); // o pátio no meio
    for (const [x, z] of [[-100, -70], [100, -70], [-100, 70], [100, 70], [0, -70]]) { const tor = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 54, 10), pedra); tor.position.set(x, 27, z); tor.castShadow = true; g.add(tor); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, am = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), pedra); am.position.set(x + Math.cos(a) * 12, 57, z + Math.sin(a) * 12); g.add(am); } }
    const patio = new THREE.Mesh(new THREE.BoxGeometry(160, 1, 100), M(0xd8cdb3)); patio.position.y = 0.5; g.add(patio);
    const cx = 260 * K, cy = 1320 * K, hc = hAt(cx, cy), cat = new THREE.Group(); cat.position.set(cx, hc, cy); cat.rotation.y = 0.2; add(cat);
    const nave = new THREE.Mesh(new THREE.BoxGeometry(110, 40, 46), pedra); nave.position.y = 20; nave.castShadow = true; cat.add(nave);
    const teto = new THREE.Mesh(new THREE.BoxGeometry(114, 6, 50), telha); teto.position.y = 43; teto.castShadow = true; cat.add(teto);
    const cupula = new THREE.Mesh(new THREE.SphereGeometry(16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xcfc3a8)); cupula.position.set(-40, 50, 0); cat.add(cupula);
    reservado.push([px, py, 200], [cx, cy, 110]);
    // a cidade velha e os jardins em volta (Saint-Martin)
    for (let k = 0; k < 140; k++) {
      const x = (-170 + r() * 570) * K, y = (1215 + r() * 185) * K; if (naRocha(tr, x, y) < 40 || reservado.some(([a, b, rr]) => (x - a) ** 2 + (y - b) ** 2 < rr * rr)) continue;
      if (r() < 0.55) jungle.push({ x, y, h: hAt(x, y), s: 0.9 + r() * 0.7 });
      else blds.push({ x, y, h: hAt(x, y), s: 1, sx: 30 + r() * 30, sy: 24 + r() * 26, sz: 30 + r() * 30, dy: 0.5, r: r() * 3, c: ["#ead9b4", "#e8c99a", "#f1e3c6", "#dcb98c"][(r() * 4) | 0] });
    }
  }
}
