// Miami — os viadutos da rodovia (a Florida Turnpike) que passam por cima e ao lado do circuito: o tabuleiro de concreto com as faixas
// pintadas, as muretas, a viga de baixo, os pilares com a travessa (só onde ficam longe da pista, e logo antes e depois de cada cruzamento),
// os postes de luz, a placa verde sobre a pista e os carros que andam de verdade (InstancedMesh, dois sentidos, duas faixas cada).
// O caminho é uma lista de pontos [x, z]; as pontas descem em rampa até o chão.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias, sorteio } from "../comum.js";

const suave = (t) => t * t * (3 - 2 * t);

export function viaduto(tr, add, { caminho, alto = 66, largura = 100, rampa = 380, semente = 1, carros = 12, placa = null, nome = "viaduto" }) {
  const rr = sorteio(semente), { W } = tr;
  const curva = new THREE.CatmullRomCurve3(caminho.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const comp = curva.getLength(), N = Math.max(8, Math.round(comp / 10)), amostras = curva.getSpacedPoints(N);
  // o perfil: sobe em rampa nas pontas (a altura é a do chão + alto × a subida) e se mantém no meio
  const centro = amostras.map((p, i) => {
    const s = (i / N) * comp, sub = suave(Math.max(0, Math.min(1, Math.min(s / rampa, (comp - s) / rampa)))), chao = tr.chao(p.x, p.z);
    return { x: p.x, z: p.z, y: chao + 2 + (alto - 2) * sub, s, chao };
  });
  centro.forEach((p, i) => { const a = centro[Math.max(0, i - 1)], b = centro[Math.min(N, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; p.tx = dx / l; p.tz = dz / l; p.nx = -p.tz; p.nz = p.tx; });
  const g = new THREE.Group(); g.name = "miami-" + nome; add(g);
  // fitas ao longo do caminho: cada perfil [lateral, vertical] vira uma fita com o seu material
  const fita = (perfil, mat, vLen = 60, uSpan = 1) => {
    const pos = [], uv = [], idx = [], K = perfil.length;
    centro.forEach((p, i) => perfil.forEach(([u, v], k) => { pos.push(p.x + p.nx * u, p.y + v, p.z + p.nz * u); uv.push((k / (K - 1)) * uSpan, p.s / vLen); }));
    for (let i = 0; i < N; i++) for (let k = 0; k < K - 1; k++) { const a = i * K + k, b = a + 1, c = a + K, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true; g.add(m); return m;
  };
  const meia = largura / 2;
  const pista = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: canvasTex(128, 128, (x, w, h, q) => {
    x.fillStyle = "#3d3e43"; x.fillRect(0, 0, w, h); for (let k = 0; k < 500; k++) { x.fillStyle = `rgba(255,255,255,${q() * 0.05})`; x.fillRect(q() * w, q() * h, 2, 2); }
    x.fillStyle = "#e8e6dc"; x.fillRect(6, 0, 2, h); x.fillRect(w - 8, 0, 2, h); // as bordas
    x.fillStyle = "#f2c230"; x.fillRect(w / 2 - 4, 0, 2, h); x.fillRect(w / 2 + 2, 0, 2, h); // o eixo duplo amarelo
    x.fillStyle = "#e8e6dc"; for (const fx of [w * 0.25, w * 0.75]) for (const y0 of [0, 64]) x.fillRect(fx - 1, y0 + 4, 2, 28); // as faixas tracejadas
  }) });
  fita([[-meia, 0], [meia, 0]], pista, 128);
  const conc = M(0xcfccc3, { roughness: 0.95, side: THREE.DoubleSide }), vig = M(0x9a9890, { roughness: 1, side: THREE.DoubleSide });
  fita([[-meia, 0], [-meia, 8], [-meia - 4, 8], [-meia - 4, -2], [-meia - 8, -10]], conc, 30); // a mureta e o beiral da esquerda
  fita([[meia, 0], [meia, 8], [meia + 4, 8], [meia + 4, -2], [meia + 8, -10]], conc, 30);
  fita([[-meia - 8, -10], [-meia * 0.45, -12], [meia * 0.45, -12], [meia + 8, -10]], vig, 40); // a viga de baixo (caixão)
  // os pilares: onde ficam longe da pista (os dois fustes a W/2 + 44 do asfalto) e logo antes e depois de cada cruzamento
  const fustes = [];
  const ok = (p, i) => [-1, 1].every((q) => { const x = p.x + p.nx * q * meia * 0.5, z = p.z + p.nz * q * meia * 0.5; return tr.distAt(x, z) >= W / 2 + 44 && p.y - tr.chao(x, z) > 22; });
  let ultimo = -1e9;
  for (let i = 3; i < N - 3; i++) {
    const p = centro[i], valido = ok(p, i), antes = !ok(centro[i + 1], i + 1) || !ok(centro[i + 2], i + 2), depois = !ok(centro[i - 1], i - 1) || !ok(centro[i - 2], i - 2);
    if (!valido) continue;
    if (p.s - ultimo >= 90 || ((antes || depois) && p.s - ultimo >= 24)) { fustes.push(i); ultimo = p.s; }
  }
  const col = [], trav = [];
  for (const i of fustes) {
    const p = centro[i], ang = Math.atan2(p.tx, p.tz);
    for (const q of [-1, 1]) { const x = p.x + p.nx * q * meia * 0.5, z = p.z + p.nz * q * meia * 0.5, ch = tr.chao(x, z) - 6, h = p.y - 12 - ch; col.push({ x, y: ch + h / 2, z, sx: 9, sy: h, sz: 9, r: ang }); }
    trav.push({ x: p.x, y: p.y - 14.5, z: p.z, sx: meia * 1.4 + 6, sy: 5, sz: 9, r: ang });
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  instancias((o) => { g.add(o); return o; }, caixa, M(0xb7b4ab, { roughness: 1 }), col, { sombra: true, nome: "miami-pilares" });
  instancias((o) => { g.add(o); return o; }, caixa, M(0xa6a39a, { roughness: 1 }), trav, { sombra: true, nome: "miami-travessas" });
  // os postes de luz nas duas muretas (a cada 70) com o braço para dentro e a lâmpada
  const hastes = [], bracos = [], lampadas = [];
  for (let i = 4; i < N - 4; i += 7) {
    const p = centro[i], ang = Math.atan2(p.tx, p.tz); if (p.y - p.chao < 20) continue;
    for (const q of [-1, 1]) { const x = p.x + p.nx * q * (meia - 2), z = p.z + p.nz * q * (meia - 2); hastes.push({ x, y: p.y + 13, z, sx: 1.2, sy: 26, sz: 1.2, r: ang }); bracos.push({ x: x - p.nx * q * 6, y: p.y + 26, z: z - p.nz * q * 6, sx: 12, sy: 1, sz: 1, r: ang + Math.PI / 2 }); lampadas.push({ x: x - p.nx * q * 11, y: p.y + 25.2, z: z - p.nz * q * 11, sx: 3.4, sy: 1, sz: 2, r: ang + Math.PI / 2 }); }
  }
  instancias((o) => { g.add(o); return o; }, caixa, M(0x565b62), hastes, { sombra: false });
  instancias((o) => { g.add(o); return o; }, caixa, M(0x565b62), bracos, { sombra: false });
  instancias((o) => { g.add(o); return o; }, caixa, new THREE.MeshBasicMaterial({ color: 0xfff0c4, toneMapped: false }), lampadas, { sombra: false });
  // a placa verde sobre a pista, num pórtico (no trecho elevado mais perto do meio)
  if (placa) {
    const i = placa.i ?? Math.floor(N * 0.5), p = centro[i], ang = Math.atan2(p.tx, p.tz), x = p.x, z = p.z, tex = canvasTex(512, 160, (c, w, h) => {
      c.fillStyle = "#0b6b3a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#ffffff"; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = "#ffffff"; c.font = "900 46px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(placa.texto1, w / 2, h * 0.33, w - 60); c.font = "700 36px Arial, sans-serif"; c.fillText(placa.texto2, w / 2, h * 0.72, w - 60);
    }, false);
    const grp = new THREE.Group(); grp.position.set(x, p.y, z); grp.rotation.y = ang; g.add(grp);
    for (const q of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), M(0x707880)); f.position.set(q * (meia + 5), 17, 0); grp.add(f); }
    const viga = new THREE.Mesh(new THREE.BoxGeometry(2 * meia + 14, 3, 3), M(0x707880)); viga.position.set(0, 34, 0); grp.add(viga);
    for (const sd of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(60, 18.75), new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })); pl.position.set(0, 26.5, sd * 1.7); pl.rotation.y = sd > 0 ? 0 : Math.PI; grp.add(pl); }
  }
  // os carros: duas faixas por sentido, em InstancedMesh (carroçaria e vidro), que andam pelo caminho enquanto o jogo roda
  const lista = [], cores = ["#e9e9ec", "#1d1f24", "#b3262e", "#274c8f", "#9aa0a8", "#d9b24a", "#ff5fa2", "#0aa3ad", "#f08a24"];
  const elevados = centro.filter((p) => p.y - p.chao > 40), s0 = elevados.length ? elevados[0].s : 0, s1 = elevados.length ? elevados[elevados.length - 1].s : comp;
  for (let k = 0; k < carros; k++) {
    const sentido = k % 2 ? 1 : -1, faixa = (rr() < 0.5 ? 0.3 : 0.7) * meia * sentido;
    lista.push({ s: s0 + rr() * (s1 - s0), v: (36 + rr() * 30) * (sentido > 0 ? 1 : -1) * 1.4, u: faixa, cor: cores[(rr() * cores.length) | 0], esc: 0.9 + rr() * 0.25 });
  }
  const geoC = new THREE.BoxGeometry(44, 8, 18), geoV = new THREE.BoxGeometry(22, 6.5, 16);
  const cm = new THREE.InstancedMesh(geoC, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), carros), vm = new THREE.InstancedMesh(geoV, M(0x1c2630, { roughness: 0.2, metalness: 0.4 }), carros);
  g.add(cm, vm); cm.name = vm.name = "miami-carros-viaduto"; cm.castShadow = false; vm.castShadow = false; cm.frustumCulled = vm.frustumCulled = false;
  const c0 = new THREE.Color(); lista.forEach((o, k) => cm.setColorAt(k, c0.set(o.cor))); cm.instanceColor.needsUpdate = true;
  const d = new THREE.Object3D(), pontoEm = (s) => { const f = Math.max(0, Math.min(N - 0.001, (s / comp) * N)), i = Math.floor(f), t = f - i, a = centro[i], b = centro[i + 1]; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, nx: a.nx, nz: a.nz, tx: a.tx, tz: a.tz }; };
  const posicionar = () => lista.forEach((o, k) => {
    const p = pontoEm(o.s), ang = Math.atan2(p.tx, p.tz) + (o.v < 0 ? Math.PI : 0), x = p.x + p.nx * o.u, z = p.z + p.nz * o.u;
    d.position.set(x, p.y + 4 * o.esc, z); d.rotation.set(0, ang + Math.PI / 2, 0); d.scale.setScalar(o.esc); d.updateMatrix(); cm.setMatrixAt(k, d.matrix);
    d.position.y = p.y + 11 * o.esc; d.updateMatrix(); vm.setMatrixAt(k, d.matrix);
  });
  posicionar(); cm.instanceMatrix.needsUpdate = vm.instanceMatrix.needsUpdate = true;
  const animar = (dt) => {
    for (const o of lista) { o.s += o.v * dt; if (o.s > s1) o.s = s0; if (o.s < s0) o.s = s1; }
    posicionar(); cm.instanceMatrix.needsUpdate = vm.instanceMatrix.needsUpdate = true;
  };
  const info = { nome, comprimento: Math.round(comp), pilares: fustes.length, carros, alto };
  (tr.viadutosMiami ||= []).push(info);
  return { animar, info };
}
