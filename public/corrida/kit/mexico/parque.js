// Cidade do México — o parque Magdalena Mixhuca em volta do autódromo: as árvores da Cidade do México (jacarandás de flor roxa, ahuehuetes e freixos
// de copa fechada, eucaliptos altos e pinheiros), os lagos do parque, as quadras de esporte, o Palácio dos Esportes de cúpula de cobre e os restos
// da Peraltada, a curva inclinada que ficou de fora do circuito. Só código. Árvores em InstancedMesh (uma geometria com cor por vértice por tipo),
// lagos e quadras numa malha por material. Tudo usa `livre`/`ocupado` e reserva o lugar que tomou.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { Montador, solido, tom } from "../montagem.js";
import { livre, ocupado, instancias } from "../comum.js";
import { sorteio, ruido, acharElipse, acharRet, reservarRet } from "./lugar.js";

const ICO = new THREE.IcosahedronGeometry(1, 0), CONE = new THREE.ConeGeometry(1, 1, 7);

// ---------------------------------------------------------------------------------------------------------------------
// As árvores (4 tipos, cada uma uma geometria só com cor por vértice; altura de uns 150 a 240)
// ---------------------------------------------------------------------------------------------------------------------
function geoArvore(tipo, semente) {
  const r = sorteio(semente), m = new Montador(), S = solido();
  const copa = (x, y, z, rad, cor, achata = 0.8) => m.geo(S, ICO, { x, y, z, sx: rad, sy: rad * achata, sz: rad, cor, ry: r() * 3, rx: r() * 0.5 });
  if (tipo === "jacaranda") {
    m.cilindro(S, [0, 38, 0], [4.6, 76], { cor: "#5d4634", seg: 6 }); m.cilindro(S, [-10, 78, 0], [2.4, 40], { cor: "#5d4634", seg: 5, rz: 0.5 }); m.cilindro(S, [12, 80, 4], [2.2, 36], { cor: "#5d4634", seg: 5, rz: -0.55 });
    for (const [x, y, z, rad] of [[0, 120, 0, 52], [-34, 104, 10, 38], [34, 108, -8, 40], [8, 140, 22, 32], [-8, 96, -32, 32]]) copa(x, y, z, rad, ["#8e6fc2", "#a58ad6", "#7d5fb5", "#b79be0"][(r() * 4) | 0]);
  } else if (tipo === "ahuehuete") {
    m.cilindro(S, [0, 40, 0], [8, 80], { cor: "#6a5a45", seg: 7 });
    for (const [x, y, z, rad] of [[0, 112, 0, 58], [-46, 96, 14, 44], [46, 98, -14, 46], [4, 146, 4, 40], [-6, 94, -48, 38]]) copa(x, y, z, rad, ["#3e6b34", "#355f2f", "#487a3a"][(r() * 3) | 0], 0.75);
  } else if (tipo === "eucalipto") {
    m.cilindro(S, [0, 100, 0], [3.8, 200], { cor: "#b9ae97", seg: 6 });
    for (const [x, y, z, rad, h] of [[0, 190, 0, 26, 1.7], [-14, 150, 8, 22, 1.5], [14, 160, -8, 22, 1.5], [4, 224, 2, 18, 1.8]]) m.geo(S, ICO, { x, y, z, sx: rad, sy: rad * h, sz: rad, cor: ["#6f8f66", "#7da071", "#5f7f5b"][(r() * 3) | 0], ry: r() * 3 });
  } else { // pinheiro
    m.cilindro(S, [0, 30, 0], [3.6, 60], { cor: "#5a4636", seg: 6 });
    for (let k = 0; k < 3; k++) m.geo(S, CONE, { x: 0, y: 70 + k * 36, z: 0, sx: 38 - k * 9, sy: 72 - k * 10, sz: 38 - k * 9, cor: ["#2f5a34", "#3a6a3c", "#336337"][k] });
  }
  return m.montar("arvore-" + tipo).children[0].geometry;
}

export function arvoresDoParque(tr, add, { max = 900 } = {}) {
  const { n, W } = tr, r = sorteio(2024), listas = { jacaranda: [], ahuehuete: [], eucalipto: [], pinheiro: [] }, nomes = Object.keys(listas);
  const peso = [0.3, 0.3, 0.25, 0.15];
  const poe = (x, z) => {
    let q = r(), k = 0; while (k < 3 && q > peso[k]) { q -= peso[k]; k++; }
    const tipo = nomes[k], e = 0.5 + r() * 0.42;
    listas[tipo].push({ x, y: tr.chao(x, z) - 1, z, sx: e, sy: e * (0.9 + r() * 0.3), sz: e, r: r() * 6.28 });
  };
  let total = 0;
  // em volta da pista, dos dois lados, em manchas: onde o ruído é alto a mata fecha
  for (let i = 0; i < n && total < max; i += 6) {
    const p = tr.pts[i];
    for (const lado of [-1, 1]) {
      const lat = W / 2 + 100 + r() * 280, x = p.x + p.nx * lado * lat + (r() - 0.5) * 40, z = p.y + p.ny * lado * lat + (r() - 0.5) * 40;
      if (r() > 0.18 + 0.75 * ruido(x / 300, z / 300, 5)) continue;
      if (!livre(tr, x, z, 60) || ocupado(tr, x, z)) continue;
      poe(x, z); total++;
    }
  }
  // o parque: bosques nos vazios do miolo e de fora
  for (let k = 0; k < 2600 && total < max + 260; k++) {
    const x = 120 + r() * 5000, z = 150 + r() * 4200;
    if (ruido(x / 420, z / 420, 9) < 0.58 || !livre(tr, x, z, 80) || ocupado(tr, x, z)) continue;
    poe(x, z); total++;
  }
  let triangulos = 0;
  nomes.forEach((tipo, k) => {
    const geo = geoArvore(tipo, 31 + k), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const m = instancias(add, geo, mat, listas[tipo], { sombra: false, nome: "mexico-arvores-" + tipo });
    if (m) triangulos += (geo.index ? geo.index.count / 3 : 0) * listas[tipo].length;
  });
  tr.arvoresMexico = { total, triangulos: Math.round(triangulos) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Os lagos do parque (um disco de água com a margem de lama e juncos)
// ---------------------------------------------------------------------------------------------------------------------
export function lagos(tr, add, locais) {
  const agua = new THREE.MeshStandardMaterial({ color: 0x5b8d8a, roughness: 0.12, metalness: 0.15 }), margem = M(0x6b5d41, { roughness: 1 });
  const feitos = [];
  for (const { caixa, a, b } of locais) {
    const q = acharElipse(tr, caixa, a + 26, b + 26, { max: 70, min: 24, passo: 40 });
    if (!q) continue;
    let alto = -1e9; for (let t = 0; t < 16; t++) alto = Math.max(alto, tr.chao(q.x + Math.cos(t * 0.39) * a, q.z + Math.sin(t * 0.39) * b));
    alto = Math.max(alto, tr.chao(q.x, q.z));
    const y = alto + 0.5;
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 40), agua); w.rotation.x = -Math.PI / 2; w.scale.set(a, b, 1); w.position.set(q.x, y, q.z); w.receiveShadow = true; add(w);
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), margem); m.rotation.x = -Math.PI / 2; m.scale.set(a + 14, b + 14, 1); m.position.set(q.x, y - 0.25, q.z); m.receiveShadow = true; add(m);
    reservarRet(tr, q.x, q.z, 0, a + 10, b + 10, 12);
    feitos.push({ x: Math.round(q.x), z: Math.round(q.z), a, b });
  }
  tr.lagosMexico = feitos;
}

// ---------------------------------------------------------------------------------------------------------------------
// As quadras de esporte do parque (basquete e futebol society), com as linhas pintadas
// ---------------------------------------------------------------------------------------------------------------------
function quadraTex(cor, linha) {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = cor; x.fillRect(0, 0, w, h); x.strokeStyle = linha; x.lineWidth = 3; x.strokeRect(8, 8, w - 16, h - 16);
    x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 22, 0, 7); x.stroke();
    for (const s of [0, 1]) { x.strokeRect(s ? w - 58 : 8, h / 2 - 28, 50, 56); }
  }, false);
}
export function quadras(tr, add, centro, { quantas = 4 } = {}) {
  const feitas = [], Mt = (cor, linha) => new THREE.MeshStandardMaterial({ map: quadraTex(cor, linha), roughness: 0.9 });
  const mats = [Mt("#2f7a52", "#f4f4f0"), Mt("#b5532f", "#f4f4f0"), Mt("#2e5f9c", "#f4f4f0")];
  const m = new Montador(), S = solido();
  for (let k = 0; k < quantas; k++) {
    const q = acharRet(tr, centro[0] + (k % 2) * 150, centro[1] + Math.floor(k / 2) * 110, 0, 64, 36, { folga: 50, raio: 420, passo: 30 });
    if (!q) continue;
    const y = tr.chao(q.x, q.z) + 0.45, pl = new THREE.Mesh(new THREE.PlaneGeometry(112, 60), mats[k % 3]);
    pl.rotation.x = -Math.PI / 2; pl.position.set(q.x, y, q.z); pl.receiveShadow = true; add(pl);
    for (const s of [-1, 1]) { // as tabelas de basquete nas pontas
      m.cilindro(S, [q.x + s * 56, y + 14 - tr.chao(q.x, q.z) * 0, q.z], [0.8, 28], { cor: "#9aa0a6", seg: 6 });
      m.caixa(S, [q.x + s * 54, y + 26, q.z], [1, 10, 14], { cor: "#f4f4f0" });
    }
    reservarRet(tr, q.x, q.z, 0, 64, 36, 10); feitas.push({ x: Math.round(q.x), z: Math.round(q.z) });
  }
  const g = m.montar("mexico-tabelas"); add(g);
  tr.quadrasMexico = feitas;
}

// ---------------------------------------------------------------------------------------------------------------------
// O Palácio dos Esportes: a cúpula de cobre, redonda, ao norte da reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
export function palacioDosEsportes(tr, add, alvo) {
  const q = acharRet(tr, alvo[0], alvo[1], 0, 130, 130, { folga: 80, raio: 600, passo: 40 });
  if (!q) return null;
  const y = tr.chao(q.x, q.z), g = new THREE.Group(); g.name = "palacio-dos-esportes"; g.position.set(q.x, y - 1, q.z);
  const cobre = new THREE.MeshStandardMaterial({ color: 0xb6703e, roughness: 0.45, metalness: 0.35 }), pedra = M(0xd8d1c2, { roughness: 0.9 });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), cobre); cupula.scale.set(110, 52, 110); cupula.position.y = 26; g.add(cupula);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(112, 118, 28, 32), pedra); base.position.y = 12; g.add(base);
  const anel = new THREE.Mesh(new THREE.TorusGeometry(111, 3.2, 6, 40), M(0x8a5a35, { roughness: 0.6 })); anel.rotation.x = Math.PI / 2; anel.position.y = 28; g.add(anel);
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, c = new THREE.Mesh(new THREE.BoxGeometry(5, 32, 5), pedra); c.position.set(Math.cos(a) * 120, 14, Math.sin(a) * 120); g.add(c); }
  add(g); reservarRet(tr, q.x, q.z, 0, 130, 130, 20); tr.palacioMexico = { x: Math.round(q.x), z: Math.round(q.z) };
  return q;
}

// ---------------------------------------------------------------------------------------------------------------------
// A Peraltada antiga: um pedaço do anel inclinado de concreto, que ficou de fora do circuito (rampa que sobe para fora, muro alto, mato nas juntas)
// ---------------------------------------------------------------------------------------------------------------------
export function peraltada(tr, add, { caixa = [120, 700, 700, 1600] } = {}) {
  const largura = 96, SEG = 36;
  let melhor = null;
  for (let cx = caixa[0]; cx <= caixa[1]; cx += 60) for (let cz = caixa[2]; cz <= caixa[3]; cz += 60) for (const R of [300, 380]) for (let a0 = 0; a0 < 360; a0 += 15) {
    let minimo = 1e9;
    for (let k = 0; k <= 7; k++) {
      const t = ((a0 + k * 11) * Math.PI) / 180;
      for (const rr of [R - largura / 2, R + largura / 2 + 12]) { const x = cx + Math.cos(t) * rr, z = cz + Math.sin(t) * rr; minimo = Math.min(minimo, tr.distAt(x, z) - tr.W / 2); if (x < 40 || z < 40 || ocupado(tr, x, z)) minimo = -1; }
    }
    if (minimo > 70 && (!melhor || Math.abs(minimo - 120) < Math.abs(melhor.minimo - 120))) melhor = { cx, cz, R, a0, minimo }; // perto o bastante para ser visto da pista
  }
  if (!melhor) return null;
  const { cx, cz, R, a0 } = melhor, pos = [], col = [], idx = [], c = new THREE.Color();
  const arco = (80 * Math.PI) / 180, t0 = (a0 * Math.PI) / 180, y0 = tr.chao(cx + Math.cos(t0 + arco / 2) * R, cz + Math.sin(t0 + arco / 2) * R) + 0.2, alto = 30;
  for (let k = 0; k <= SEG; k++) {
    const t = t0 + (arco * k) / SEG, ci = Math.cos(t), si = Math.sin(t), rIn = R - largura / 2, rOut = R + largura / 2;
    const linha = k % 4 < 2 ? 0 : 1;
    const pts = [[rIn - 8, 0, "#8a8c8f"], [rIn, 0.6, "#5e6064"], [R - 12, alto * 0.45, linha ? "#6a6c70" : "#5e6064"], [R + 12, alto * 0.55, "#5e6064"], [rOut, alto, "#55575b"], [rOut + 1.5, alto + 8, "#b9bcc0"], [rOut + 6, alto + 8, "#b9bcc0"], [rOut + 6, -10, "#9b9ea2"]];
    for (const [rr, y, cor] of pts) { c.set(cor); pos.push(cx + ci * rr, y0 + y, cz + si * rr); col.push(c.r, c.g, c.b); }
    if (k) { const n = pts.length; for (let j = 0; j < n - 1; j++) { const a = (k - 1) * n + j, b = a + n; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }))); m.receiveShadow = true; m.name = "mexico-peraltada";
  // as barreiras fechando as pontas e as lâmpadas dos postes na crista
  const mm = new Montador(), S = solido();
  for (const t of [t0, t0 + arco]) { const x = cx + Math.cos(t) * R, z = cz + Math.sin(t) * R; mm.caixa(S, [x - cx, y0 + 12, z - cz], [96, 24, 4], { cor: "#d56a2c", ry: -t + Math.PI / 2 }); }
  for (let k = 1; k < 8; k++) { const t = t0 + (arco * k) / 8, x = cx + Math.cos(t) * (R + largura / 2 + 4), z = cz + Math.sin(t) * (R + largura / 2 + 4); mm.cilindro(S, [x - cx, y0 + alto + 30, z - cz], [1.4, 60], { cor: "#a8adb2", seg: 5 }); }
  const gr = mm.montar("mexico-peraltada-detalhes"); gr.position.set(cx, 0, cz); add(gr);
  for (let k = 0; k <= 6; k++) { const t = t0 + (arco * k) / 6; tr.reservado.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R, 90]); }
  tr.peraltadaMexico = { x: cx, z: cz, R, de: a0, minimo: Math.round(melhor.minimo) };
  return tr.peraltadaMexico;
}
