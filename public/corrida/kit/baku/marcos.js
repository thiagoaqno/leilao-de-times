// Baku — os marcos: as três Flame Towers (as velas de vidro com a fachada de LED que acende ao entardecer), a Torre da Donzela (Qiz Qalasi,
// de pedra em camadas, com o contraforte), a muralha da Cidade Velha (Icheri Sheher: pedra bege com ameias em arco e torres redondas), o
// Palácio do Governo (arenito, torres com arcadas e torrinhas ameiadas), a Torre de TV no morro e as torres de luz da reta. Feitos em código a
// partir das fotos de referência (ver o PR); as posições vêm do OpenStreetMap (kit/baku/dados.js).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { D, poligonoDentro } from "./mundo.js";
import { blocoDePedra, foraDoCaminho, PEDRA_BAKU } from "./predios.js";
import { emissivoDaNoite } from "../bahrein/base.js";

const K = D.projecao.k, ALT = 1.35; // unidades por metro e o exagero vertical (a pista do jogo é mais larga que a rua)
const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h >>> 0) / 4294967296; };

// ---------- as Flame Towers ----------
// Cada torre é uma vela: a seção elíptica encolhe até a ponta e o corpo se curva para um lado. A fachada é uma textura de LED (listras horizontais
// em degradê de vermelho a amarelo) que só brilha de verdade ao anoitecer e de noite, e as chamas sobem (o deslocamento da textura).
function geometriaDaVela(H, a0, b0, curva, S = 44, N = 36) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, enc = Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7))), cx = -curva * Math.pow(t, 2.1);
    for (let j = 0; j <= S; j++) { const th = (j / S) * Math.PI * 2; pos.push(cx + Math.cos(th) * a0 * enc, t * H, Math.sin(th) * b0 * (1 - 0.3 * t) * enc); uv.push((j / S) * 3, t * 5); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + S + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function flameTowers(tr, add, hAt) {
  const led = canvasTex(64, 256, (x, w, hh, rr) => {
    const g = x.createLinearGradient(0, hh, 0, 0); g.addColorStop(0, "#9e1010"); g.addColorStop(0.45, "#ff2a14"); g.addColorStop(0.75, "#ff7a1a"); g.addColorStop(1, "#ffd23a");
    x.fillStyle = "#06080c"; x.fillRect(0, 0, w, hh); x.fillStyle = g;
    for (let y = 0; y < hh; y += 4) { x.globalAlpha = 0.55 + rr() * 0.45; x.fillRect(0, y, w, 2); } x.globalAlpha = 1; // as fileiras de LED
    for (let i = 0; i < 30; i++) { x.fillStyle = "#fff6d0"; x.globalAlpha = 0.5; x.fillRect(rr() * w, rr() * hh, 3, 4); } x.globalAlpha = 1;
  }); led.wrapS = led.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ color: 0x586c80, roughness: 0.22, metalness: 0.55, emissive: 0xffffff, emissiveMap: led, toneMapped: false });
  mat.userData.bloom = true; // o LED brilha (pos.js)
  emissivoDaNoite(tr, mat, 0.45, 2.4); // ao entardecer (o dia do jogo) já acesas, de noite no máximo
  const M0 = D.marcos, lista = [
    [M0.flame1, 190, 27, 15, 20, 0.5], [M0.flame2, 165, 26, 14, 16, 2.3], [M0.flame3, 140, 24, 14, 15, 4.2],
  ];
  const grupo = new THREE.Group(); add(grupo);
  for (const [pos, hm, am, bm, curva, rot] of lista) {
    if (!pos) continue;
    const H = hm * K * ALT, m = new THREE.Mesh(geometriaDaVela(H, am * K, bm * K, curva * K), mat);
    m.position.set(pos[0], hAt(pos[0], pos[1]) - 4, pos[1]); m.rotation.y = rot; m.castShadow = false; m.name = "baku-flame"; grupo.add(m);
  }
  tr.flameBaku = { led, mat };
  tr.animarFlame = (dt) => { led.offset.y -= dt * 0.018; }; // as chamas sobem devagar (baku.js `depoisBaku` liga isto ao laço da pista, depois de vidaGP, que define tr.animarPista)
}

// ---------- a Torre da Donzela ----------
export function torreDaDonzela(tr, add, hAt) {
  const p = D.marcos.donzela; if (!p) return;
  const pedra = canvasTex(128, 128, (x, w, hh, rr) => { // fiadas de pedra, bem marcadas, em tom cinza-acastanhado
    x.fillStyle = "#8f8574"; x.fillRect(0, 0, w, hh);
    for (let y = 0; y < hh; y += 6) { x.fillStyle = y % 12 ? "#7b7263" : "#9a907d"; x.fillRect(0, y, w, 4); x.fillStyle = "#4b4439"; x.fillRect(0, y + 4, w, 1); }
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000014" : "#ffffff14"; x.fillRect(rr() * w, rr() * hh, 3, 2); }
  }); pedra.repeat.set(5, 4);
  const mat = new THREE.MeshStandardMaterial({ map: pedra, roughness: 0.95 }), g = new THREE.Group();
  const R = 8.2 * K, H = 29.5 * K * 1.55; // (a torre fica mais alta na escala do jogo: ela é o marco da Cidade Velha)
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.88, R, H, 32, 1, true), mat); corpo.position.y = H / 2; g.add(corpo);
  const contraforte = new THREE.Mesh(new THREE.BoxGeometry(R * 0.78, H * 0.97, R * 0.62), mat); contraforte.position.set(R * 0.92, H * 0.485, 0); g.add(contraforte); // o contraforte do lado do mar, que sobe até o alto
  const anel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.88, H * 0.05, 32), mat); anel.position.y = H * 1.0; g.add(anel); // o beiral
  const topo = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 1.2, 32), M(0x5b5448, { roughness: 1 })); topo.position.y = H * 1.03; g.add(topo);
  const porta = new THREE.Mesh(new THREE.BoxGeometry(R * 0.16, R * 0.34, 0.8), M(0x1a1612)); porta.position.set(-R * 0.82, R * 0.3, R * 0.5); porta.rotation.y = 2.2; g.add(porta);
  g.position.set(p[0], hAt(p[0], p[1]) - 2, p[1]); g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); g.name = "baku-donzela"; add(g); tr.donzelaBaku = g;
}

// ---------- a muralha da Cidade Velha ----------
// As linhas da muralha vêm do OpenStreetMap; a pista larga do jogo as encostaria, então cada ponto que ficaria a menos que a barreira + 6 é empurrado para
// trás. A muralha tem ~11 m de pedra bege em fiadas, com o parapeito de ameias em arco e torres redondas nos cantos e a cada ~60 unidades.
export function muralha(tr, add, hAt, predioEm, trechos = [[0.405, 0.765, -1]]) {
  const alt = 11.5 * K * 1.15, esp = 2.6 * K, pedra = canvasTex(128, 64, (x, w, hh, rr) => {
    x.fillStyle = "#b9a37a"; x.fillRect(0, 0, w, hh);
    for (let y = 0; y < hh; y += 7) { for (let xx = ((y / 7) % 2) * 8; xx < w; xx += 16) { x.fillStyle = rr() < 0.5 ? "#a8916a" : "#c6b085"; x.fillRect(xx, y, 15, 6); } x.fillStyle = "#6c5b3e"; x.fillRect(0, y + 6, w, 1); }
    for (let i = 0; i < 380; i++) { x.fillStyle = rr() < 0.5 ? "#00000016" : "#ffffff1a"; x.fillRect(rr() * w, rr() * hh, 3, 2); }
  }); pedra.repeat.set(1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: pedra, roughness: 0.96, side: THREE.DoubleSide });
  const pos = [], uv = [], idx = [], ameias = [], torres = [], { pts } = tr;
  let metros = 0;
  // O OpenStreetMap só tem a muralha como dois pontos soltos: a Cidade Velha fica DENTRO da volta (a pista dá a volta no castelo, com a muralha sempre do lado de
  // dentro, à esquerda de quem anda, das curvas 7 a 18), então a muralha é uma fita acompanhando a pista nesse lado, atrás da barreira e da cerca (`foraDoCaminho`).
  const linhas = [];
  for (const [de, ate, lado] of trechos) {
    let L = [];
    const n = tr.n, fecha = () => { if (L.length > 3) linhas.push(L); L = []; };
    for (let i = Math.floor(de * n); i <= Math.floor(ate * n); i += 3) {
      const p = pts[i % n], r = tr.murosEscape?.[lado]?.[i % n] || 0, d = tr.W / 2 + (r !== 0 ? r + 9 : 20) + esp / 2 + 3, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
      // por dentro de uma curva fechada a fita deslocada passa do centro da curva e cai em cima da pista (de outro trecho): ali a muralha para
      let dentro = false;
      for (let j = i - 120; j <= i + 120 && !dentro; j++) { const q = pts[((j % n) + n) % n], l = (x - q.x) * q.nx + (z - q.y) * q.ny >= 0 ? 1 : -1, v = tr.murosEscape?.[l]?.[((j % n) + n) % n] || 0; if (Math.hypot(x - q.x, z - q.y) < (v < 0 ? tr.W / 2 + v : tr.W / 2 + 10) + esp / 2 + 1.5) dentro = true; }
      if (dentro) { fecha(); continue; }
      L.push([x, z]);
    }
    fecha();
  }
  for (const L of linhas) {
    let u = 0, desde = 0;
    for (let i = 0; i + 1 < L.length; i++) {
      const a = L[i], b = L[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.3) continue;
      const nx = dz / l, nz = -dx / l, ya = hAt(a[0], a[1]) - 4, yb = hAt(b[0], b[1]) - 4, k0 = pos.length / 3, u1 = u + l / (6 * K * 2.2);
      for (const [lado, e] of [[1, esp / 2], [-1, -esp / 2]]) { // as duas faces (a de dentro e a de fora), do chão ao parapeito
        const base = pos.length / 3;
        pos.push(a[0] + nx * e, ya, a[1] + nz * e, b[0] + nx * e, yb, b[1] + nz * e, b[0] + nx * e, yb + alt, b[1] + nz * e, a[0] + nx * e, ya + alt, a[1] + nz * e); uv.push(u, 0, u1, 0, u1, 1, u, 1);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      { const base = pos.length / 3; pos.push(a[0] + nx * esp / 2, ya + alt, a[1] + nz * esp / 2, b[0] + nx * esp / 2, yb + alt, b[1] + nz * esp / 2, b[0] - nx * esp / 2, yb + alt, b[1] - nz * esp / 2, a[0] - nx * esp / 2, ya + alt, a[1] - nz * esp / 2); uv.push(u, 0, u1, 0, u1, 0.1, u, 0.1); idx.push(base, base + 1, base + 2, base, base + 2, base + 3); } // o chão do parapeito
      u = u1; metros += l; void k0;
      // as ameias: um merlão a cada ~4,2 unidades, no lado de fora (o lado oposto da pista), com a ponta arredondada (um cilindro achatado em cima)
      for (let s = 0; s < l; s += 5.4) { const t = (s + 2) / l, px = a[0] + dx * t, pz = a[1] + dz * t, c = pts[tr.indiceAt(px, pz)], fora = (px - c.x) * nx + (pz - c.y) * nz > 0 ? 1 : -1; ameias.push({ x: px + nx * fora * (esp / 2 - 0.9), y: ya + (yb - ya) * t + alt, z: pz + nz * fora * (esp / 2 - 0.9), r: Math.atan2(dx, dz) }); }
      desde += l; if (desde > 62 || (i > 0 && Math.abs(Math.atan2(dz, dx) - Math.atan2(L[i][1] - L[i - 1][1], L[i][0] - L[i - 1][0])) > 0.5)) { desde = 0; torres.push({ x: a[0], y: ya, z: a[1] }); }
    }
  }
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.castShadow = m.receiveShadow = true; m.name = "baku-muralha";
  const o = new THREE.Object3D();
  if (ameias.length) { // o merlão: bloco com a ponta em arco
    const blocoGeo = new THREE.BoxGeometry(2.8, 3.8, 1.5), arco = new THREE.CylinderGeometry(1.4, 1.4, 1.5, 4, 1, false, 0, Math.PI); arco.rotateX(Math.PI / 2); arco.translate(0, 1.9, 0);
    const im = add(new THREE.InstancedMesh(blocoGeo, mat, ameias.length)), ia = add(new THREE.InstancedMesh(arco, mat, ameias.length));
    ameias.forEach((a, i) => { o.position.set(a.x, a.y + 1.9, a.z); o.rotation.set(0, a.r, 0); o.scale.set(1, 1, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); ia.setMatrixAt(i, o.matrix); });
    im.castShadow = ia.castShadow = true; im.name = ia.name = "baku-ameias";
  }
  if (torres.length) { // torres redondas, mais altas que o parapeito, com o friso de pedra clara e as ameias em volta
    const tg = new THREE.CylinderGeometry(7.5, 8.6, alt + 12, 14); tg.translate(0, (alt + 12) / 2, 0); const friso = new THREE.CylinderGeometry(8.4, 8.4, 1.8, 14); friso.translate(0, alt + 8, 0);
    const it = add(new THREE.InstancedMesh(tg, mat, torres.length)), ifr = add(new THREE.InstancedMesh(friso, M(0xd9cba8, { roughness: 0.9 }), torres.length)), topo = new THREE.CylinderGeometry(7.6, 7.6, 1.2, 14); topo.translate(0, alt + 12.2, 0); const ita = add(new THREE.InstancedMesh(topo, M(0x5d5446, { roughness: 1 }), torres.length)); // o piso da plataforma da torre, de pedra escura
    const merlao = new THREE.BoxGeometry(3.2, 3.6, 2), aneis = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; aneis.push([Math.cos(a) * 8.1, Math.sin(a) * 8.1, a]); }
    const imerl = add(new THREE.InstancedMesh(merlao, mat, torres.length * aneis.length)); imerl.castShadow = true; imerl.name = "baku-ameias-torres";
    torres.forEach((a, i) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); it.setMatrixAt(i, o.matrix); ifr.setMatrixAt(i, o.matrix); ita.setMatrixAt(i, o.matrix); aneis.forEach(([dx, dz, ang], k) => { o.position.set(a.x + dx, a.y + alt + 14, a.z + dz); o.rotation.set(0, -ang + Math.PI / 2, 0); o.updateMatrix(); imerl.setMatrixAt(i * aneis.length + k, o.matrix); }); });
    it.castShadow = true; it.name = "baku-torres-muralha";
  }
  tr.muralhaBaku = { metros: Math.round(metros / K), ameias: ameias.length, torres: torres.length }; void predioEm;
}

// ---------- o Palácio do Governo (Government House) ----------
export function palacioDoGoverno(tr, add, hAt, lista) {
  const b = lista.find((q) => q.esp === 5); if (!b) return;
  const alt = 38 * K * ALT, P = b.P;
  blocoDePedra(add, P, b.baixo - 3, b.alto + alt, [0.93, 0.84, 0.64]);
  // as torres: duas nas pontas do maior eixo e uma central, com arcadas e as torrinhas ameiadas nos cantos (como na foto)
  let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } cx /= P.length; cz /= P.length;
  let mx = 0, ax = 1, az = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > mx) { mx = l; ax = (q[0] - p[0]) / l; az = (q[1] - p[1]) / l; } }
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = (x - cx) * ax + (z - cz) * az, v = -(x - cx) * az + (z - cz) * ax; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const ponto = (u, v) => [cx + u * ax - v * az, cz + u * az + v * ax];
  const torre = (u, v, w, h) => { const Q = [ponto(u - w, v - w), ponto(u + w, v - w), ponto(u + w, v + w), ponto(u - w, v + w)]; if (!Q.every(([x, z]) => poligonoDentro(P, x, z))) return; blocoDePedra(add, Q, b.alto + alt - 6, b.alto + alt + h, [0.95, 0.86, 0.66]); };
  const w = Math.min((v1 - v0) * 0.2, 28);
  torre(u0 + w * 1.4, 0, w, 20 * K * ALT); torre(u1 - w * 1.4, 0, w, 20 * K * ALT); torre(0, 0, w * 1.1, 28 * K * ALT);
  for (const [u, v] of [[u0 + 3, v0 + 3], [u0 + 3, v1 - 3], [u1 - 3, v0 + 3], [u1 - 3, v1 - 3]]) { const Q = [ponto(u - 2.5, v - 2.5), ponto(u + 2.5, v - 2.5), ponto(u + 2.5, v + 2.5), ponto(u - 2.5, v + 2.5)]; blocoDePedra(add, Q, b.alto + alt - 4, b.alto + alt + 16 * K, [0.95, 0.86, 0.66]); }
  tr.governoBaku = { x: cx, z: cz, h: alt };
}

// ---------- a Torre de TV de Baku ----------
// A de verdade (310 m) fica a uns 3 km, no morro; aqui ela é puxada para a mesma direção, a uns 2,7 km do centro do mundo, para aparecer no horizonte como nas fotos.
export function torreTV(tr, add, hAt) {
  const p = D.marcos.torreTV; if (!p) return;
  const cx = tr.t.world / 2, cz = tr.t.world / 2, dx = p[0] - cx, dz = p[1] - cz, d = Math.hypot(dx, dz), alvo = Math.min(d, 2900), x = cx + (dx / d) * alvo, z = cz + (dz / d) * alvo;
  const H = 310 * K * 0.9, g = new THREE.Group(), branco = M(0xe6e8ea, { roughness: 0.6 });
  const fuste = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, H * 0.62, 12), branco); fuste.position.y = H * 0.31; g.add(fuste);
  const cesto = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 18, 14), M(0xcfd3d8, { roughness: 0.4 })); cesto.position.y = H * 0.55; g.add(cesto);
  const agulha = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.4, H * 0.42, 8), M(0xb4392e, { roughness: 0.7 })); agulha.position.y = H * 0.79; g.add(agulha);
  const luz = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 })); luz.position.y = H; g.add(luz);
  g.position.set(x, Math.max(hAt(x, z), 40), z); g.name = "baku-torre-tv"; add(g);
}
