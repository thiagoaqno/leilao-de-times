// Corrida da Galera — o que deixa a pista viva e dá a noção de velocidade: balizas na beira (passam zunindo), placas de
// seta nas curvas, postes, outdoors, bandeirolas por cima da pista, torcida pulando na reta dos boxes, pássaros, o
// dirigível da Galera, balões, a água do mar mexendo e fogos em Tóquio. `enfeitar` monta tudo dentro do grupo da
// pista (chamado por pista.js) e `animarVida` mexe a cada quadro.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { enfeitarMais, animarMais, montarTorcida, praticaveis } from "./vida-mais.js";
import { marcaTex } from "./kit/marcas.js";

const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const ANUNCIOS = [
  ["#ffd23f", "#1b1b1b", "PASTEL DA VILA", "o mais rápido do bairro"],
  ["#1f8a3a", "#ffffff", "GUARANÁ GALERA", "gelado na largada"],
  ["#1e5bc6", "#ffffff", "PNEUS RODINHA", "aderência de amigo"],
  ["#e63946", "#ffffff", "TRUCO ÀS 20H", "na mesa da praça"],
  ["#0d0e12", "#ffd23f", "LEILÃO DA GALERA", "monte o seu time"],
  ["#8fd0f2", "#16324a", "SORVETERIA POLAR", "derrete na reta"],
  ["#f28c28", "#1b1b1b", "AUTOESCOLA CONTRAMÃO", "aulas aos domingos"],
  ["#7a3fc6", "#ffffff", "BANCO DA GALERA", "juros de amigo"],
];
function anuncio([fundo, letra, titulo, sub], neon) {
  return canvasTex(512, 220, (x, w, hh) => {
    x.fillStyle = neon ? "#0b0b16" : fundo; x.fillRect(0, 0, w, hh);
    x.strokeStyle = neon ? fundo : "#ffffff"; x.lineWidth = 10; x.strokeRect(8, 8, w - 16, hh - 16);
    x.fillStyle = neon ? fundo : letra; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 62px Bungee, Impact, sans-serif"; x.fillText(titulo, w / 2, 92, w - 50);
    x.font = "700 34px Figtree, sans-serif"; x.fillText(sub, w / 2, 160, w - 60);
  }, false);
}
const setaTex = (lado) => canvasTex(128, 96, (x, w, hh) => {
  x.fillStyle = "#d62828"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ffffff";
  for (const o of [-34, 6]) { x.beginPath(); const a = lado > 0 ? 1 : -1, cx = w / 2 + o * a; x.moveTo(cx - 14 * a, 14); x.lineTo(cx + 18 * a, hh / 2); x.lineTo(cx - 14 * a, hh - 14); x.lineTo(cx - 2 * a, hh - 14); x.lineTo(cx + 30 * a, hh / 2); x.lineTo(cx - 2 * a, 14); x.fill(); }
}, false);
// instâncias de uma malha numa lista de { x, y (altura), z, ry, s, sx, sy, sz, c }
function instancias(add, geo, mat, lista, sombra = true) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, lista.length)), d = new THREE.Object3D();
  lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.ry || 0, 0); d.scale.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (o.c != null) m.setColorAt(i, new THREE.Color(o.c)); });
  m.castShadow = sombra; m.receiveShadow = true; return m;
}

// ---------- monta (uma vez por pista) ----------
export function enfeitar(tr, add, r, alturaEm) {
  const { pts, n, W, id } = tr, t = tr.t, comMuro = tr.wallLat < 1e9, borda = comMuro ? tr.wallLat : W / 2 + (id === "interlagos" ? 33 : 16);
  const V = (tr.vida = { torcida: null, bandeiras: [], passaros: [], dirigivel: null, baloes: [], agua: tr.agua || [], fogos: [], planeta: null, tempo: 0 });
  const noite = id === "tokyo" || id === "arcoiris";
  const lat = (p, l) => [p.x + p.nx * l, p.y + p.ny * l];
  // balizas: um a cada 36 unidades dos dois lados (em cima do muro, olhos de gato; sem muro, postes brancos com faixa)
  const bal = [], olho = [];
  for (let i = 0; i < (tr.sem?.olhos || t.escapeLivre ? 0 : n); i += 6) { // (tr.sem: o que o GP não tem; Mônaco não põe olhos de gato no guard-rail)
    const p = pts[i];
    for (const s of [-1, 1]) {
      const [x, z] = lat(p, s * (borda + (comMuro ? 0 : 0))), y = comMuro ? alturaEm(x, z, i) + 12 : alturaEm(x, z, i);
      if (tr.noCorredor?.(x, z) || tr.distAt(x, z) < borda - 2) continue; // nem no corredor dos boxes nem em cima de outro trecho da pista (nem do outro lado de uma curva fechada)
      if (comMuro) olho.push({ x, y: y + 0.8, z, ry: Math.atan2(p.tx, p.ty), sx: 2.4, sy: 1.6, sz: 2.4, c: (i / 6) % 2 ? "#ffd23f" : "#ffffff" });
      else { bal.push({ x, y: y + 5, z, s: 1 }); olho.push({ x, y: y + 8, z, ry: Math.atan2(p.tx, p.ty), sx: 1.9, sy: 2.2, sz: 1.9, c: "#ff7a1a" }); }
    }
  }
  V.balizadores = bal.length;
  instancias(add, new THREE.CylinderGeometry(0.8, 0.9, 10, 6), M(0xf4f4f4, { roughness: 0.6 }), bal);
  instancias(add, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x553300, emissiveIntensity: noite ? 2 : 0.4, roughness: 0.3 }), olho, false);
  // setas nas curvas fechadas, do lado de fora, viradas para quem chega
  const setas = [[], []], postes = [];
  for (let i = 0; i < n; i += 4) {
    const p = pts[i], q = pts[(i + 3) % n]; if (!(p.k > 1 / 230) || t.espaco || tr.sem?.setas) continue;
    const giro = p.tx * q.ty - p.ty * q.tx, fora = giro > 0 ? -1 : 1, dSeta = comMuro ? tr.wallLat + 10 : W / 2 + 22, [x, z] = lat(p, fora * dSeta), y = alturaEm(x, z, i); // a placa tem 14 de largura: o canto de dentro fica a mais de 12 do asfalto
    if (tr.noCorredor?.(x, z) || tr.distAt(x, z) < dSeta - 2) continue;
    setas[fora > 0 ? 0 : 1].push({ x, y: y + (comMuro ? 18 : 12), z, ry: Math.atan2(-p.tx, -p.ty), s: 1 });
    if (!comMuro) postes.push({ x, y: y + 4, z, s: 1 });
  }
  const placa = new THREE.PlaneGeometry(14, 10.5);
  setas.forEach((l, k) => instancias(add, placa, new THREE.MeshStandardMaterial({ map: setaTex(k ? 1 : -1), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: noite ? 0.5 : 0.08, emissiveMap: null, side: THREE.DoubleSide }), l, false));
  instancias(add, new THREE.CylinderGeometry(0.6, 0.6, 8, 5), M(0x555a60), postes, false);
  // outdoors nas retas, virados para a pista
  if (!t.espaco && !tr.sem?.outdoors) {
    let feitos = 0, ult = -1e9;
    for (let i = 0; i < n && feitos < 14; i += 3) {
      const p = pts[i]; if (p.k || i - ult < n / 16) continue;
      const s = feitos % 2 ? 1 : -1, d = (comMuro ? tr.wallLat : W / 2 + 30) + 26, [x, z] = lat(p, s * d);
      if (tr.distAt(x, z) < d - 2 || tr.distAt(x, z) < W / 2 + 46 || tr.noCorredor?.(x, z) || (tr.ocupado && tr.ocupado(x, z, i))) continue; // o outdoor tem 64 de largura
      const y = alturaEm(x, z, i), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(-p.nx * s, -p.ny * s) + Math.PI * 0; add(g);
      const tex = tr.marcasGP ? marcaTex(tr.marcasGP[(feitos * 5 + 3) % tr.marcasGP.length], 512, 220) : anuncio(ANUNCIOS[(feitos + id.length) % ANUNCIOS.length], id === "tokyo"); // nos GPs: os patrocinadores de verdade (kit/ambiente.js)
      const quadro = new THREE.Mesh(new THREE.BoxGeometry(64, 28, 1.6), [M(0x2a2d33), M(0x2a2d33), M(0x2a2d33), M(0x2a2d33), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: id === "tokyo" ? 0.9 : 0.12, roughness: 0.6 }), M(0x2a2d33)]);
      quadro.position.y = 34; quadro.castShadow = true; g.add(quadro);
      for (const k of [-20, 20]) { const perna = new THREE.Mesh(new THREE.BoxGeometry(2.2, 22, 2.2), M(0x50555e)); perna.position.set(k, 11, -1); perna.castShadow = true; g.add(perna); }
      feitos++; ult = i;
    }
  }
  // bandeirolas atravessando a pista (os GPs com passarelas do kit não têm)
  if (!t.espaco && !tr.semBandeirolas && !tr.sem?.bandeirolas) for (const f of [0.012, 0.2, 0.41, 0.6, 0.79]) {
    if (tr.coberto && tr.coberto(Math.floor(n * f))) continue;
    const i = Math.floor(n * f), p = pts[i], L = borda + 6, alto = 46, cores = ["#e63946", "#ffd23f", "#1e88e5", "#43a047", "#ffffff", "#fb8c00"];
    const [x1, z1] = lat(p, L), [x2, z2] = lat(p, -L), y1 = alturaEm(x1, z1, i), y2 = alturaEm(x2, z2, i);
    if (tr.noCorredor?.(x1, z1) || tr.noCorredor?.(x2, z2)) continue;
    for (const [x, z, y] of [[x1, z1, y1], [x2, z2, y2]]) { const pau = add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, alto + 4, 6), M(0x6f747c))); pau.position.set(x, y + (alto + 4) / 2, z); pau.castShadow = true; }
    const N = 26, tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-2.4, 0, 0, 2.4, 0, 0, 0, -6, 0], 3)); tri.computeVertexNormals();
    const fl = add(new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }), N)); fl.castShadow = true;
    const base = [];
    for (let k = 0; k < N; k++) {
      const u = (k + 0.5) / N, x = x1 + (x2 - x1) * u, z = z1 + (z2 - z1) * u, y = y1 + (y2 - y1) * u + alto - Math.sin(u * Math.PI) * 9; // a corda faz barriga
      base.push({ x, y, z, ry: Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2, f: k * 0.7 }); fl.setColorAt(k, new THREE.Color(cores[k % cores.length]));
    }
    const corda = new THREE.BufferGeometry().setFromPoints(base.map((b) => new THREE.Vector3(b.x, b.y + 0.2, b.z))); add(new THREE.Line(corda, new THREE.LineBasicMaterial({ color: 0x333333 })));
    V.bandeiras.push({ m: fl, base });
  }
  // torcida na reta dos boxes: três fileiras dos dois lados, atrás do muro
  if (!t.espaco) {
    const gente = [], pele = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a", "#5a3520"], camisa = tr.camisasGP || ["#ffd23f", "#e63946", "#1e88e5", "#43a047", "#ffffff", "#fb8c00", "#8e24aa", "#111111"]; // os GPs podem vestir a torcida (tr.camisasGP)
    const cb = t.boxes && window.F1Regras ? window.F1Regras.corredor(t, n, tr.W) : null; // o corredor dos boxes (regras de F1) fica sem torcida
    for (let i = -Math.floor(n * 0.04); i < Math.floor(n * 0.05); i += 1) {
      const p = pts[(i + n) % n];
      for (const s of [-1, 1]) for (let fila = 0; fila < 3; fila++) {
        if (r() < 0.35) continue;
        if (cb && s === cb.lado && (((i - cb.i0) % n) + n) % n <= cb.len + 3) continue;
        // na frente de uma arquibancada do kit, a torcida senta nos degraus dela (antes ficava no chão, por baixo da rampa)
        const ii = (i + n) % n, arq = (tr.arqDegraus || []).find((q) => q.lado === s && fila < q.degraus && ((ii - q.i0) % n + n) % n <= q.i1 - q.i0);
        const d = arq ? Math.abs(arq.l0) + 4.5 + fila * 9 : borda + 10 + fila * 8 + r() * 2, [x, z] = lat(p, s * d);
        if (!arq && (tr.distAt(x, z) < d - 2 || tr.noCorredor?.(x, z) || (tr.ocupado && tr.ocupado(x, z)))) continue;
        gente.push({ arq: !!arq, x, y: arq ? p.h + 4 + (fila + 0.5) * 6 : alturaEm(x, z, ii) + fila * 3.5 + (tr.elevarGente || 0), z, ry: Math.atan2(-p.nx * s, -p.ny * s), fase: r() * 6.3, ritmo: 5 + r() * 5, pula: r() < 0.6, pele: pele[(r() * 5) | 0], camisa: camisa[(r() * camisa.length) | 0] });
      }
    }
    if (tr.elevarGente) praticaveis(add, gente.filter((g) => !g.arq), tr.elevarGente);
    V.torcida = montarTorcida(add, gente);
  }
  // céu: pássaros (de dia), o dirigível e balões
  const C = t.world / 2, topo = Math.max(...pts.map((p) => p.h));
  if (!noite) { // três bandos de 7; as 42 asas são um InstancedMesh só (uma chamada de desenho em vez de 42)
    const asa = new THREE.BufferGeometry(); asa.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -1.6, 0, 0, 1.6, 7, 0, 0], 3)); asa.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: id === "sorvete" ? 0x3a3f4a : 0x22252b, side: THREE.DoubleSide, fog: false });
    for (let b = 0; b < 3; b++) {
      const aves = [];
      for (let k = 0; k < 7; k++) {
        const lado = k % 2 ? 1 : -1, fila = Math.ceil(k / 2), y = (r() - 0.5) * 3;
        aves.push({ x: -fila * 9, y, z: lado * fila * 8, f: r() * 6 });
      }
      V.passaros.push({ aves, raio: t.world * (0.18 + r() * 0.25), alto: topo + 170 + r() * 140, vel: 0.05 + r() * 0.04, fase: r() * 6.3 });
    }
    V.asas = add(new THREE.InstancedMesh(asa, mat, V.passaros.length * 14)); V.asas.frustumCulled = false; V.asas.castShadow = false; // o bando dá a volta no mundo todo: sem esfera de corte
  }
  if (!t.espaco && !tr.sem?.dirigivel) {
    const g = add(new THREE.Group()), faixa = canvasTex(512, 128, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ffd23f"; x.fillRect(0, 34, w, 60); x.fillStyle = "#111"; x.font = "900 48px Bungee, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("GALERA", w / 4, 66); x.fillText("GALERA", (w * 3) / 4, 66); });
    const casco = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), new THREE.MeshStandardMaterial({ map: faixa, roughness: 0.4, metalness: 0.1, emissive: noite ? 0xffffff : 0, emissiveMap: noite ? faixa : null, emissiveIntensity: 0.35 }));
    casco.scale.set(70, 24, 24); casco.rotation.y = Math.PI / 2; g.add(casco);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 22), M(0x30343c)); cab.position.y = -25; g.add(cab);
    for (const [ry, rz] of [[0, 0], [0, Math.PI / 2]]) { const aleta = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 16), M(0xe63946)); aleta.rotation.set(rz, ry, 0); aleta.position.z = -64; g.add(aleta); }
    V.dirigivel = { g, raio: t.world * 0.36, alto: topo + 330, vel: 0.022, fase: r() * 6.3 };
  }
  if ({ serra: 1, deserto: 1, luigi: 1, interlagos: 1, sorvete: 1, laguna: 1 }[id]) for (let b = 0; b < 6; b++) {
    const listras = ["#e63946", "#ffd23f", "#1e88e5", "#43a047", "#ff7ad9", "#fb8c00"], c1 = listras[b % 6], c2 = listras[(b + 2) % 6];
    const tex = canvasTex(256, 64, (x, w, hh) => { for (let k = 0; k < 12; k++) { x.fillStyle = k % 2 ? c1 : c2; x.fillRect((k * w) / 12, 0, w / 12 + 1, hh); } });
    const g = add(new THREE.Group()), bolao = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    bolao.scale.y = 1.18; g.add(bolao);
    const boca = new THREE.Mesh(new THREE.CylinderGeometry(9, 14, 14, 16, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })); boca.position.y = -32; g.add(boca);
    const cesto = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), M(0x8a5a2b)); cesto.position.y = -48; g.add(cesto);
    V.baloes.push({ g, x: r() * t.world, z: r() * t.world, alto: topo + 120 + r() * 260, vx: (r() - 0.5) * 8, vz: (r() - 0.5) * 8, fase: r() * 6.3 });
  }
  // Tóquio: fogos de artifício de vez em quando (pontos que se abrem e caem)
  if (id === "tokyo") for (let k = 0; k < 4; k++) {
    const N = 90, geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const mat = new THREE.PointsMaterial({ size: 7, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const pts3 = add(new THREE.Points(geo, mat)); pts3.frustumCulled = false;
    V.fogos.push({ pts: pts3, vel: new Float32Array(N * 3), t: 9 + k * 0.7, espera: k * 0.9, C });
  }
  enfeitarMais(tr, add, r, alturaEm, V);
  // Arco-íris: um planeta com anel girando devagar ao longe
  if (t.espaco) {
    const g = add(new THREE.Group()); g.position.set(C + 2600, 900, C - 3400);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(520, 40, 24), new THREE.MeshStandardMaterial({ color: 0x7a5cff, emissive: 0x2a1060, roughness: 0.8, fog: false })));
    const anel = new THREE.Mesh(new THREE.RingGeometry(700, 1050, 64), new THREE.MeshBasicMaterial({ color: 0xffc2f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
    anel.rotation.x = Math.PI / 2.4; g.add(anel); V.planeta = g;
  }
}

// ---------- a cada quadro ----------
const d = new THREE.Object3D();
const pPos = new THREE.Vector3(), pQ = new THREE.Quaternion(), pEixo = new THREE.Vector3(0, 1, 0), pUm = new THREE.Vector3(1, 1, 1), pBando = new THREE.Matrix4(), pAve = new THREE.Matrix4(), pBase = new THREE.Matrix4(), pTmp = new THREE.Matrix4(), pRot = new THREE.Matrix4(), pEsp = new THREE.Matrix4().makeScale(-1, 1, 1);
export function animarVida(tr, dt, foco) {
  const V = tr && tr.vida; if (!V) return;
  const parado = reduz.matches; V.tempo += dt; const t = V.tempo;
  for (const a of V.agua) if (a.map && !parado) { a.map.offset.x = (t * 0.012) % 1; a.map.offset.y = (t * 0.02) % 1; }
  // torcida: só mexe quem está perto da câmera (a de longe fica parada; ninguém vê a diferença)
  for (const T of [V.torcida, ...(V.torcidas || [])]) {
    if (!T || parado) continue;
    if (foco && !T.primeira && (T.x - foco.x) ** 2 + (T.z - foco.y) ** 2 > 1000 ** 2) continue;
    if (!T.primeira && (V.vezT = (V.vezT || 0) + 1) % 2) continue; // longe da vista o pulo não precisa de 60 quadros
    T.primeira = false;
    const { gente, corpo, cabeca, bracos } = T;
    gente.forEach((o, k) => {
      const pulo = o.pula ? Math.max(0, Math.sin(t * o.ritmo + o.fase)) * 3.2 : 0, balanca = Math.sin(t * o.ritmo * 0.5 + o.fase) * 0.12;
      d.position.set(o.x, o.y + pulo, o.z); d.rotation.set(0, o.ry, balanca); d.scale.setScalar(1); d.updateMatrix();
      corpo.setMatrixAt(k, d.matrix); cabeca.setMatrixAt(k, d.matrix);
      d.position.y += Math.sin(t * o.ritmo + o.fase) * 1.3; d.rotation.z = balanca + Math.sin(t * o.ritmo + o.fase) * 0.35; d.updateMatrix(); bracos.setMatrixAt(k, d.matrix); // braços para cima e para baixo
    });
    corpo.instanceMatrix.needsUpdate = cabeca.instanceMatrix.needsUpdate = bracos.instanceMatrix.needsUpdate = true;
  }
  for (const b of V.bandeiras) {
    b.base.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(parado ? 0 : Math.sin(t * 5 + o.f) * 0.45, o.ry, 0, "YXZ"); d.scale.setScalar(1); d.updateMatrix(); b.m.setMatrixAt(k, d.matrix); });
    b.m.instanceMatrix.needsUpdate = true;
  }
  const C = tr.t.world / 2;
  if (V.asas) {
    let i = 0;
    for (const f of V.passaros) {
      const a = f.fase + t * f.vel;
      pPos.set(C + Math.cos(a) * f.raio, f.alto + Math.sin(t * 0.3 + f.fase) * 10, C + Math.sin(a) * f.raio); pQ.setFromAxisAngle(pEixo, -a - Math.PI); pBando.compose(pPos, pQ, pUm);
      for (const ave of f.aves) {
        const bate = parado ? 0.2 : Math.sin(t * 9 + ave.f) * 0.6; pAve.makeTranslation(ave.x, ave.y, ave.z); pBase.multiplyMatrices(pBando, pAve);
        V.asas.setMatrixAt(i++, pTmp.multiplyMatrices(pBase, pRot.makeRotationZ(bate))); // asa esquerda
        V.asas.setMatrixAt(i++, pTmp.multiplyMatrices(pBase, pRot.makeRotationZ(-bate)).multiply(pEsp)); // asa direita (espelhada)
      }
    }
    V.asas.instanceMatrix.needsUpdate = true;
  }
  if (V.dirigivel) { const z = V.dirigivel, a = z.fase + t * z.vel; z.g.position.set(C + Math.cos(a) * z.raio, z.alto, C + Math.sin(a) * z.raio); z.g.rotation.y = -a - Math.PI; }
  for (const b of V.baloes) {
    b.x += b.vx * dt; b.z += b.vz * dt; const W = tr.t.world; if (b.x < -400) b.x = W + 400; if (b.x > W + 400) b.x = -400; if (b.z < -400) b.z = W + 400; if (b.z > W + 400) b.z = -400;
    b.g.position.set(b.x, b.alto + Math.sin(t * 0.4 + b.fase) * 12, b.z);
  }
  if (V.planeta && !parado) V.planeta.rotation.y = t * 0.02;
  animarMais(tr, V, t, dt, foco);
  if (tr.animarPista) tr.animarPista(dt, foco, t); // o que é só de uma pista (os GPs: kit/vida.js)
  for (const f of V.fogos) {
    f.t += dt; const pos = f.pts.geometry.attributes.position, N = pos.count;
    if (f.t > 2.6 + f.espera) { // um fogo novo, num canto do céu
      f.t = 0; f.espera = 0.4 + Math.random() * 1.6;
      const cx = f.C + (Math.random() - 0.5) * f.C * 1.6, cz = f.C + (Math.random() - 0.5) * f.C * 1.6, cy = 380 + Math.random() * 260;
      for (let k = 0; k < N; k++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), v = 70 + Math.random() * 30;
        pos.setXYZ(k, cx, cy, cz); f.vel[k * 3] = s * Math.cos(a) * v; f.vel[k * 3 + 1] = u * v; f.vel[k * 3 + 2] = s * Math.sin(a) * v;
      }
      f.pts.material.color.setHSL(Math.random(), 1, 0.6);
    }
    const k0 = Math.min(1, f.t / 2.2); f.pts.material.opacity = parado ? 0 : Math.max(0, 1 - k0);
    for (let k = 0; k < N; k++) { f.vel[k * 3 + 1] -= 30 * dt; pos.setXYZ(k, pos.getX(k) + f.vel[k * 3] * dt, pos.getY(k) + f.vel[k * 3 + 1] * dt, pos.getZ(k) + f.vel[k * 3 + 2] * dt); }
    pos.needsUpdate = true;
  }
}
