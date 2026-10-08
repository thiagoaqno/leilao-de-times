// Os jutsus do modo Naruto em 3D, dentro da cena de golpes3d.js. Cada golpe de naruto.js tem um `fx` (o nome do desenho)
// e uma `forma` (corpo, projetil, area ou investida); os eventos do servidor trazem o id do golpe (`golpe`), então cada
// jutsu aparece do jeito dele: o Rasengan é uma bola que gira na mão, o Chidori um raio que crepita no braço de quem
// avança, a Bola de Fogo um fogaréu, o Tubarão de Água um tubarão, o Kirin um raio que cai do céu...
// - projetilNaruto(fx, r): o que voa até acertar (devolve { grupo, animar(t), rastro(x, y) });
// - corpoNaruto(f, agora): o golpe na frente de quem bate; areaNaruto(f, agora): o que cai no ponto mirado;
// - investidaNaruto / reforcoNaruto: o que acompanha o ninja que avança ou que se fortalece;
// - impactoNaruto(f, agora): o estouro de quando o projétil acerta.
// Cada um devolve true se desenhou (senão golpes3d.js desenha o do tipo, como antes). Só visual: nada aqui muda dano.
// Usa as peças de golpes3d.js (G3, malhaG3, brilhoG3, vivo, anelNoChao, pedirLuz, sacudir) e de animacao.js (particula, espalhar).
const GN = { geo: null, tex: null };
const NC = { // as cores dos jutsus
  aco: "#d6dce8", fogo: ["#fff3a0", "#ffb43a", "#f0602a", "#a8321e"], azul: ["#ffffff", "#bfe8ff", "#59b8ff", "#2a6fd0"],
  raio: ["#ffffff", "#c8e8ff", "#59a8ff", "#1f56c8"], agua: ["#e8ffff", "#8fe0f6", "#3f9ee0", "#245e9e"], terra: ["#f4dca0", "#d8a858", "#a8743a", "#5f3f1f"],
  areia: ["#f6e6b8", "#e3c98a", "#c9a45f", "#8f7440"], sombra: ["#d9c8ff", "#8f6fd0", "#4a2f78", "#1d1230"], verde: ["#eaffd0", "#9fe070", "#4fb84a", "#237a30"],
  vento: ["#ffffff", "#e0fff4", "#9fe8d0", "#4fb89a"], madeira: ["#c99a5a", "#8f6a3a", "#5f4424", "#3a8a3a"], preto: ["#e8d8ff", "#8a5acc", "#2a1a3a", "#08040c"],
  rosa: ["#fff0f8", "#ffb0d8", "#e060a8", "#8a2a68"], roxo: ["#f0e0ff", "#c08ae8", "#8a40b8", "#4a1a68"],
};
const gp = () => new THREE.Group();
// geometrias próprias (criadas na primeira vez que alguém precisa)
function geoN() {
  if (GN.geo) return GN.geo;
  const estrela = new THREE.Shape(), pts = 8;
  for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2, r = i % 2 ? 0.3 : 1; (i ? estrela.lineTo : estrela.moveTo).call(estrela, Math.cos(a) * r, Math.sin(a) * r); }
  const disco = new THREE.CircleGeometry(1, 40); disco.rotateX(-Math.PI / 2);
  const espinho = new THREE.ConeGeometry(0.5, 1, 6); espinho.translate(0, 0.5, 0);
  const coluna = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); coluna.translate(0, 0.5, 0);
  const estrelaGeo = new THREE.ExtrudeGeometry(estrela, { depth: 0.12, bevelEnabled: false }); estrelaGeo.rotateX(-Math.PI / 2); estrelaGeo.translate(0, -0.06, 0);
  GN.geo = { estrela: estrelaGeo, disco, espinho, coluna, fino: new THREE.CylinderGeometry(1, 1, 1, 6), semi: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2) };
  return GN.geo;
}
// o trigrama do Neji (um disco com os oito lados e os símbolos), desenhado uma vez
function texTrigrama() {
  if (GN.tex) return GN.tex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256; const c = cv.getContext("2d");
  c.translate(128, 128); c.strokeStyle = "#dff4ff"; c.fillStyle = "#59b8ff";
  c.globalAlpha = 0.35; c.beginPath(); c.arc(0, 0, 124, 0, 7); c.fill(); c.globalAlpha = 1;
  c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 122, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 58, 0, 7); c.stroke();
  for (let i = 0; i < 8; i++) {
    c.save(); c.rotate((i * Math.PI) / 4); c.lineWidth = 6;
    for (let k = 0; k < 3; k++) { c.beginPath(); const y = -74 - k * 14; if (k === 1 && i % 2) { c.moveTo(-18, y); c.lineTo(-4, y); c.moveTo(4, y); c.lineTo(18, y); } else { c.moveTo(-18, y); c.lineTo(18, y); } c.stroke(); }
    c.restore();
  }
  c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, -58); c.lineTo(0, -122); c.stroke(); }
  GN.tex = new THREE.CanvasTexture(cv); GN.tex.colorSpace = THREE.SRGBColorSpace;
  return GN.tex;
}
const pecaN = (geo, cor, o = {}) => malhaG3(geo, cor, o);
const baseDe = (pose) => pose?.visivel ? { x: pose.wx, y: pose.wy, h: pose.altura || 0 } : null;
// a luz que cada projétil acende no chão por onde passa
const LUZ_PROJETIL_N = { katon: NC.fogo[1], oleo: NC.fogo[1], shurikenfogo: NC.fogo[1], tubarao: NC.agua[1], mente: NC.rosa[1], tigre: "#ffd870", dragaovento: NC.vento[1], ventolamina: NC.vento[1], dragaoargila: "#fff0d0", sombra: NC.sombra[1] };
const poseDe = (id) => G3.poses?.find((p) => p.e.id === id);
const aleat = (i) => fixo(i * 7.13 + 3);

// um raio em zigue-zague feito de caixas: `refaz(de, ate, quadro)` muda o desenho a cada quadro (o raio pisca)
function raioN(grupo, n, cores, grossura) {
  const segs = [];
  for (let c = 0; c < cores.length; c++) for (let i = 0; i < n; i++) { const m = pecaN(G3.geo.cubo, cores[c], { somar: true }); m.userData.g = grossura * (c ? 0.4 : 1); grupo.add(m); segs.push(m); }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), eixo = new THREE.Vector3(1, 0, 0);
  return {
    segs,
    refaz(de, ate, jit, quadro) {
      const pts = [de.clone()];
      for (let i = 1; i < n; i++) { const t = i / n; pts.push(de.clone().lerp(ate, t).add(a.set((fixo(quadro * 5 + i) - 0.5) * jit, (fixo(quadro * 3 + i * 2) - 0.5) * jit, (fixo(quadro * 7 + i * 3) - 0.5) * jit))); }
      pts.push(ate.clone());
      for (let c = 0; c < cores.length; c++) for (let i = 0; i < n; i++) {
        const m = segs[c * n + i]; b.copy(pts[i]); d.copy(pts[i + 1]).sub(b); const len = d.length() || 0.01;
        m.position.copy(b).addScaledVector(d, 0.5); m.scale.set(len, m.userData.g, m.userData.g); m.quaternion.setFromUnitVectors(eixo, d.normalize());
      }
    },
  };
}
// chamas de cone que tremulam (uma cor por camada)
function chamasN(grupo, cores, n, raio, altura) {
  const lista = [];
  for (let i = 0; i < n; i++) {
    const m = pecaN(geoN().espinho, cores[i % cores.length], { opacidade: 0.92 }); const a = aleat(i) * 6.28, d = Math.sqrt(aleat(i + 40)) * raio;
    m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.userData = { h: altura * (0.5 + aleat(i + 9) * 0.7), fase: aleat(i + 20) * 6.28 }; m.scale.set(0.35, 0.01, 0.35);
    grupo.add(m); lista.push(m);
  }
  return (k, t, escala = 1) => lista.forEach((m, i) => { const pulso = 1 + Math.sin(t * 20 + m.userData.fase) * 0.18; m.scale.set(0.4 * pulso * escala, m.userData.h * escala * pulso * Math.min(1, k * 6) * (1 - k * k * 0.5), 0.4 * pulso * escala); });
}
// uma cobra: esferas em fila que serpenteiam
function cobraN(grupo, cor, cor2, n, tam) {
  const corpo = [];
  for (let i = 0; i < n; i++) { const m = pecaN(G3.geo.esfera, i ? cor : cor2, { toon: true }); m.scale.setScalar(tam * (1 - (i / n) * 0.55) * (i ? 1 : 1.3)); grupo.add(m); corpo.push(m); }
  for (const s of [-1, 1]) { const o = pecaN(G3.geo.cubo, "#ffe14d"); o.scale.set(tam * 0.3, tam * 0.3, tam * 0.2); o.position.set(tam * 0.9, tam * 0.5, s * tam * 0.5); corpo[0].add(o); o.scale.multiplyScalar(1 / (tam * 1.3)); o.position.divideScalar(tam * 1.3); }
  return (t, passo = tam * 1.1, amp = tam * 1.2) => corpo.forEach((m, i) => m.position.set(-i * passo, Math.sin(t * 9 - i * 0.9) * amp * (i / n + 0.3), Math.cos(t * 7 - i * 0.7) * amp * 0.4));
}
// uma fumaça (puff) que cresce e some
function fumacaN(x, h, y, cor, tam, dur, agora, n = 6) {
  const g = gp(); g.position.set(x, h, y);
  const bolas = Array.from({ length: n }, (_, i) => { const m = pecaN(G3.geo.esfera, cor, { opacidade: 0.8 }); g.add(m); return { m, a: (i / n) * 6.28 + aleat(i), d: 0.3 + aleat(i + 5) * 0.4 }; });
  vivo(g, dur, (k) => bolas.forEach((b, i) => { b.m.position.set(Math.cos(b.a) * b.d * tam * (0.4 + k), k * tam * 0.6 + (i % 2) * 0.1, Math.sin(b.a) * b.d * tam * (0.4 + k)); b.m.scale.setScalar(tam * (0.35 + k * 0.5)); b.m.material.opacity = 0.8 * (1 - k); }), agora);
}

// ---------- o que voa ----------
const PROJETIL_N = {
  shuriken(r) {
    const g = gp(), estrela = pecaN(geoN().estrela, NC.aco, { toon: true }), furo = pecaN(G3.geo.cubo, "#2a3040"); estrela.scale.setScalar(r * 1.5); furo.scale.set(r * 0.4, r * 0.3, r * 0.4); g.add(estrela, furo);
    return { grupo: g, animar: (t) => { estrela.rotation.y = t * 38; estrela.rotation.z = 0.12; furo.rotation.y = t * 38; }, rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0.1, g: 0, vida: 0.25, cor: "#e8eefc", tam: 0.05 }) };
  },
  shurikenfogo(r) {
    const g = gp(), estrela = pecaN(geoN().estrela, NC.aco, { toon: true }), fogo = pecaN(G3.geo.bola, NC.fogo[2], { opacidade: 0.7, escala: r * 1.4 }), miolo = pecaN(G3.geo.bola, NC.fogo[1], { opacidade: 0.8, escala: r * 0.95 });
    estrela.scale.setScalar(r * 1.5); g.add(fogo, miolo, estrela, brilhoG3(NC.fogo[1], r * 6, 0.6));
    return { grupo: g, animar: (t) => { estrela.rotation.y = t * 38; fogo.scale.setScalar(r * (1.35 + Math.sin(t * 30) * 0.15)); }, rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0.8, g: -1, vida: 0.4, cor: NC.fogo[1 + Math.floor(Math.random() * 2)], tam: 0.09 }) };
  },
  katon(r) {
    const g = gp(), casca = pecaN(G3.geo.bola, NC.fogo[2], { opacidade: 0.85, escala: r * 2.2 }), meio = pecaN(G3.geo.bola, NC.fogo[1], { escala: r * 1.6 }), nucleo = pecaN(G3.geo.esfera, NC.fogo[0], { escala: r * 1.0 });
    g.add(casca, meio, nucleo, brilhoG3(NC.fogo[1], r * 9, 0.7));
    const cauda = [1, 2, 3, 4].map((i) => { const c = pecaN(G3.geo.bola, NC.fogo[Math.min(3, i)], { opacidade: 0.8 - i * 0.12, escala: r * (1.7 - i * 0.28) }); g.add(c); return c; });
    return { grupo: g, animar: (t) => { casca.scale.setScalar(r * (2.1 + Math.sin(t * 24) * 0.18)); casca.rotation.set(t * 5, t * 7, 0); cauda.forEach((c, i) => c.position.set(-(i + 1) * r * 1.3, Math.sin(t * 22 + i) * r * 0.4, Math.cos(t * 19 + i * 2) * r * 0.35)); }, rastro: (x, y) => { particula(x, y, { z: 0.45, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: 1.1, g: -1.5, vida: 0.5, cor: NC.fogo[1 + Math.floor(Math.random() * 2)], tam: 0.12 }); } };
  },
  oleo(r) {
    const g = gp(), jato = pecaN(G3.geo.bola, "#3a2a1a", { escala: r * 1.0 }), fogo = pecaN(G3.geo.bola, NC.fogo[2], { opacidade: 0.85, escala: r * 1.7 }), ponta = pecaN(G3.geo.bola, NC.fogo[1], { escala: r * 1.2 });
    g.add(fogo, ponta, jato, brilhoG3(NC.fogo[1], r * 8, 0.6));
    const gotas = [1, 2, 3].map((i) => { const m = pecaN(G3.geo.esfera, "#2a1c10", { escala: r * 0.35 }); g.add(m); return m; });
    return { grupo: g, animar: (t) => { fogo.scale.setScalar(r * (1.6 + Math.sin(t * 28) * 0.2)); gotas.forEach((m, i) => m.position.set(-(i + 1) * r * 1.4, Math.sin(t * 12 + i * 2) * r * 0.5, 0)); }, rastro: (x, y) => particula(x, y, { z: 0.4, vz: 0.5, g: 6, vida: 0.4, cor: Math.random() < 0.5 ? "#2a1c10" : NC.fogo[1], tam: 0.08 }) };
  },
  tubarao(r) {
    const g = gp(), corpo = pecaN(G3.geo.esfera, NC.agua[2], { opacidade: 0.92 }), barriga = pecaN(G3.geo.esfera, NC.agua[0], { opacidade: 0.95 }), cabeca = pecaN(G3.geo.esfera, NC.agua[2], { opacidade: 0.92 });
    corpo.scale.set(r * 2.2, r * 0.85, r * 0.85); barriga.scale.set(r * 1.9, r * 0.5, r * 0.7); barriga.position.y = -r * 0.3; cabeca.scale.set(r * 0.9, r * 0.8, r * 0.8); cabeca.position.x = r * 1.7;
    const nadadeira = pecaN(geoN().espinho, NC.agua[3], { opacidade: 0.95 }); nadadeira.scale.set(r * 0.9, r * 1.1, r * 0.2); nadadeira.position.set(0, r * 0.7, 0); nadadeira.rotation.z = -0.4;
    const cauda = pecaN(geoN().espinho, NC.agua[3], { opacidade: 0.95 }); cauda.scale.set(r * 0.9, r * 1.5, r * 0.2); cauda.position.set(-r * 2.2, 0, 0); cauda.rotation.z = Math.PI / 2 + 0.3;
    const olho = pecaN(G3.geo.cubo, "#101830"); olho.scale.setScalar(r * 0.18); olho.position.set(r * 1.9, r * 0.25, r * 0.55); const olho2 = olho.clone(); olho2.position.z = -r * 0.55;
    g.add(corpo, barriga, cabeca, nadadeira, cauda, olho, olho2, brilhoG3(NC.agua[1], r * 7, 0.35));
    return { grupo: g, animar: (t) => { g.rotation.z = Math.sin(t * 14) * 0.08; cauda.rotation.y = Math.sin(t * 22) * 0.6; g.position.y = 0; }, rastro: (x, y) => particula(x, y, { z: 0.35, vz: 1.4, g: 9, vida: 0.4, cor: NC.agua[Math.floor(Math.random() * 3)], tam: 0.09, quica: 0 }) };
  },
  argila(r) {
    const g = gp(), corpo = pecaN(G3.geo.esfera, "#f2efe4", { toon: true, escala: r * 0.7 }), cabeca = pecaN(G3.geo.esfera, "#f2efe4", { toon: true, escala: r * 0.5 }); cabeca.position.x = r * 0.7; g.add(corpo, cabeca);
    const pernas = [];
    for (let i = 0; i < 8; i++) { const p = pecaN(G3.geo.cubo, "#cfc8b0"); p.scale.set(r * 0.9, r * 0.08, r * 0.08); g.add(p); pernas.push(p); }
    for (const s of [-1, 1]) { const o = pecaN(G3.geo.cubo, "#c01818"); o.scale.setScalar(r * 0.14); o.position.set(r * 1.0, r * 0.2, s * r * 0.2); g.add(o); }
    return { grupo: g, animar: (t) => pernas.forEach((p, i) => { const lado = i < 4 ? 1 : -1, k = i % 4; p.position.set((k - 1.5) * r * 0.4, -r * 0.2, lado * r * 0.55); p.rotation.set(0, 0, 0); p.rotation.y = lado * (0.9 + Math.sin(t * 28 + k * 1.6) * 0.5); p.rotation.z = Math.sin(t * 28 + k * 1.6) * 0.3; }) };
  },
  dragaoargila(r) {
    const g = gp(), seg = [], n = 9;
    for (let i = 0; i < n; i++) { const m = pecaN(G3.geo.esfera, "#f6f2e6", { toon: true, escala: r * (0.75 - i * 0.04) }); g.add(m); seg.push(m); }
    const cabeca = pecaN(G3.geo.esfera, "#fff", { toon: true }); cabeca.scale.set(r * 1.2, r * 0.8, r * 0.8); cabeca.position.x = r * 0.9; g.add(cabeca);
    for (const s of [-1, 1]) { const chifre = pecaN(geoN().espinho, "#cfc8b0"); chifre.scale.set(r * 0.25, r * 0.8, r * 0.25); chifre.position.set(r * 0.7, r * 0.6, s * r * 0.4); chifre.rotation.z = 0.7; g.add(chifre); const olho = pecaN(G3.geo.cubo, "#c01818"); olho.scale.setScalar(r * 0.18); olho.position.set(r * 1.5, r * 0.2, s * r * 0.4); g.add(olho); }
    g.add(brilhoG3("#fff6e0", r * 7, 0.4));
    return { grupo: g, animar: (t) => seg.forEach((m, i) => m.position.set(-i * r * 0.85, Math.sin(t * 12 - i * 0.8) * r * 0.7, Math.cos(t * 9 - i * 0.7) * r * 0.5)), rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0.3, g: 2, vida: 0.4, cor: "#f6f2e6", tam: 0.07 }) };
  },
  ninken(r) {
    const g = gp(), cor = "#e8e4dc", corpo = pecaN(G3.geo.cubo, cor, { toon: true }), cabeca = pecaN(G3.geo.cubo, cor, { toon: true }), foc = pecaN(G3.geo.cubo, "#c8b898", { toon: true }), rabo = pecaN(G3.geo.cubo, cor, { toon: true });
    corpo.scale.set(r * 1.7, r * 0.8, r * 0.8); cabeca.scale.set(r * 0.9, r * 0.8, r * 0.8); cabeca.position.set(r * 1.2, r * 0.45, 0); foc.scale.set(r * 0.5, r * 0.4, r * 0.5); foc.position.set(r * 1.8, r * 0.3, 0); rabo.scale.set(r * 0.9, r * 0.25, r * 0.25); rabo.position.set(-r * 1.3, r * 0.5, 0);
    const orelhas = [-1, 1].map((s) => { const o = pecaN(geoN().espinho, "#bba888"); o.scale.set(r * 0.3, r * 0.5, r * 0.3); o.position.set(r * 1.1, r * 0.95, s * r * 0.3); g.add(o); return o; });
    g.add(corpo, cabeca, foc, rabo);
    const patas = Array.from({ length: 4 }, (_, i) => { const p = pecaN(G3.geo.cubo, cor, { toon: true }); p.scale.set(r * 0.25, r * 0.8, r * 0.25); g.add(p); return p; });
    return { grupo: g, animar: (t) => { g.position.y = Math.abs(Math.sin(t * 22)) * r * 0.4; rabo.rotation.z = Math.sin(t * 25) * 0.4; patas.forEach((p, i) => { const a = Math.sin(t * 22 + (i % 2) * Math.PI); p.position.set((i < 2 ? 0.8 : -0.8) * r, -r * 0.55 + Math.max(0, a) * r * 0.3, (i % 2 ? 1 : -1) * r * 0.3); p.rotation.z = a * 0.6; }); }, rastro: (x, y) => particula(x, y, { z: 0.05, vz: 0.6, g: 3, vida: 0.4, cor: "#c7d0c2", tam: 0.1 }) };
  },
  sombra(r) { // a sombra que corre pelo chão
    const g = gp(), faixa = pecaN(G3.geo.cubo, NC.sombra[3], { opacidade: 0.85 }), brilho = pecaN(G3.geo.cubo, NC.sombra[1], { opacidade: 0.5 }), ponta = pecaN(G3.geo.esfera, NC.sombra[2], { opacidade: 0.9 });
    faixa.scale.set(r * 5, r * 0.12, r * 0.9); faixa.position.set(-r * 2, -0.38, 0); brilho.scale.set(r * 5.2, r * 0.05, r * 1.2); brilho.position.set(-r * 2, -0.4, 0); ponta.scale.set(r * 1.1, r * 0.35, r * 0.9); ponta.position.set(r * 0.4, -0.35, 0); g.add(faixa, brilho, ponta);
    return { grupo: g, animar: (t) => { faixa.scale.z = r * (0.8 + Math.sin(t * 25) * 0.2); ponta.position.x = r * (0.4 + Math.sin(t * 18) * 0.1); }, rastro: (x, y) => particula(x, y, { z: 0.05, vz: 0.4, g: -0.5, vida: 0.5, cor: NC.sombra[1], tam: 0.07 }) };
  },
  corvos(r) {
    const g = gp(), aves = [];
    for (let i = 0; i < 7; i++) { const a = new THREE.Group(), asa1 = pecaN(G3.geo.cubo, "#14101c"), asa2 = pecaN(G3.geo.cubo, "#14101c"), corpo = pecaN(G3.geo.esfera, "#0c0810", { escala: r * 0.22 }); asa1.scale.set(r * 0.5, r * 0.04, r * 0.3); asa2.scale.copy(asa1.scale); asa1.position.z = r * 0.25; asa2.position.z = -r * 0.25; a.add(asa1, asa2, corpo); a.userData = { asa1, asa2, fase: i * 1.3 }; g.add(a); aves.push(a); }
    return { grupo: g, animar: (t) => aves.forEach((a, i) => { a.position.set(-(i % 4) * r * 0.9 + Math.sin(t * 6 + i) * 0.15, Math.sin(t * 9 + i * 1.7) * r * 0.9, Math.cos(t * 7 + i * 2.3) * r * 1.2); a.userData.asa1.rotation.x = Math.sin(t * 30 + a.userData.fase) * 0.9; a.userData.asa2.rotation.x = -Math.sin(t * 30 + a.userData.fase) * 0.9; }), rastro: (x, y) => particula(x, y, { z: 0.5, vz: -0.5, g: 1, vida: 0.7, cor: "#1c1428", tam: 0.06, atrito: 3 }) };
  },
  tinta(r) {
    const g = gp(), corpo = pecaN(G3.geo.esfera, "#0c0a10", { toon: true }), cabeca = pecaN(G3.geo.esfera, "#0c0a10", { toon: true }); corpo.scale.set(r * 1.6, r * 0.9, r * 0.9); cabeca.scale.setScalar(r * 0.8); cabeca.position.set(r * 1.6, r * 0.4, 0);
    const juba = pecaN(G3.geo.bola, "#1a1620", { toon: true, escala: r * 1.0 }); juba.position.set(r * 1.2, r * 0.4, 0); g.add(corpo, juba, cabeca);
    for (const s of [-1, 1]) { const o = pecaN(G3.geo.cubo, "#ffffff"); o.scale.setScalar(r * 0.15); o.position.set(r * 2.2, r * 0.6, s * r * 0.3); g.add(o); }
    const gotas = [1, 2, 3].map((i) => { const m = pecaN(G3.geo.esfera, "#0c0a10", { escala: r * 0.3 }); g.add(m); return m; });
    return { grupo: g, animar: (t) => { g.position.y = Math.abs(Math.sin(t * 16)) * r * 0.5; gotas.forEach((m, i) => m.position.set(-r * (1.4 + i * 0.5), Math.sin(t * 10 + i) * r * 0.3, 0)); }, rastro: (x, y) => particula(x, y, { z: 0.3, vz: 0.4, g: 8, vida: 0.4, cor: "#0c0a10", tam: 0.08 }) };
  },
  passaro(r) {
    const g = gp(), aves = [];
    for (let i = 0; i < 3; i++) { const a = new THREE.Group(), asa1 = pecaN(G3.geo.cubo, "#0c0a10"), asa2 = pecaN(G3.geo.cubo, "#0c0a10"), corpo = pecaN(G3.geo.esfera, "#0c0a10", { escala: r * 0.4 }), bico = pecaN(geoN().espinho, "#ffb43a"); asa1.scale.set(r * 0.8, r * 0.05, r * 0.6); asa2.scale.copy(asa1.scale); bico.scale.set(r * 0.12, r * 0.4, r * 0.12); bico.rotation.z = -Math.PI / 2; bico.position.x = r * 0.45; a.add(asa1, asa2, corpo, bico); a.userData = { asa1, asa2 }; g.add(a); aves.push(a); }
    return { grupo: g, animar: (t) => aves.forEach((a, i) => { a.position.set(-i * r * 1.3, Math.sin(t * 8 + i * 2) * r * 0.5, (i - 1) * r * 1.2); a.userData.asa1.rotation.x = Math.sin(t * 26 + i) * 0.9; a.userData.asa2.rotation.x = -Math.sin(t * 26 + i) * 0.9; a.userData.asa1.position.z = r * 0.5; a.userData.asa2.position.z = -r * 0.5; }), rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0, g: 4, vida: 0.4, cor: "#0c0a10", tam: 0.05 }) };
  },
  marionete(r) {
    const g = gp(), corpo = pecaN(G3.geo.cubo, "#5a3a24", { toon: true }), cabeca = pecaN(G3.geo.cubo, "#a8784a", { toon: true }), faixa = pecaN(G3.geo.cubo, "#2a1a3a", { toon: true }), lamina = pecaN(geoN().espinho, NC.aco, { toon: true });
    corpo.scale.set(r * 0.8, r * 1.1, r * 0.7); cabeca.scale.setScalar(r * 0.7); cabeca.position.y = r * 1.0; faixa.scale.set(r * 0.9, r * 0.2, r * 0.8); faixa.position.y = r * 0.1; lamina.scale.set(r * 0.25, r * 1.6, r * 0.12); lamina.rotation.z = -Math.PI / 2; lamina.position.set(r * 1.2, 0, 0);
    g.add(corpo, cabeca, faixa, lamina, brilhoG3("#b070ff", r * 5, 0.3));
    const fios = [1, 2, 3].map(() => { const f = pecaN(G3.geo.cubo, "#8a60ff", { somar: true }); f.scale.set(r * 2.5, r * 0.03, r * 0.03); g.add(f); return f; });
    return { grupo: g, animar: (t) => { g.rotation.x = t * 14; fios.forEach((f, i) => { f.position.set(-r * 1.8, (i - 1) * r * 0.4, 0); f.rotation.z = Math.sin(t * 10 + i) * 0.2; }); } };
  },
  agulhas(r) {
    const g = gp(), agulhas = [];
    for (let i = 0; i < 7; i++) { const a = pecaN(geoN().espinho, i % 2 ? NC.aco : "#a8e8a0", { toon: true }); a.scale.set(r * 0.12, r * 1.6, r * 0.12); a.rotation.z = -Math.PI / 2; a.position.set(-aleat(i) * r * 1.2, (i - 3) * r * 0.28, (aleat(i + 8) - 0.5) * r * 1.6); g.add(a); agulhas.push(a); }
    return { grupo: g, animar: (t) => agulhas.forEach((a, i) => { a.rotation.x = Math.sin(t * 20 + i) * 0.08; }), rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0, g: 0, vida: 0.2, cor: "#dff8d8", tam: 0.04 }) };
  },
  cobras(r) {
    const g = gp(), cobras = [0, 1, 2].map((i) => { const c = new THREE.Group(); const ond = cobraN(c, i % 2 ? NC.roxo[2] : NC.roxo[3], "#2a1840", 7, r * 0.42); c.userData.ond = ond; g.add(c); return c; });
    return { grupo: g, animar: (t) => cobras.forEach((c, i) => { c.position.set(0, (i - 1) * r * 0.4, (i - 1) * r * 1.1); c.userData.ond(t + i, r * 0.5, r * 0.5); }), rastro: (x, y) => particula(x, y, { z: 0.3, vz: 0.2, g: 0, vida: 0.4, cor: NC.roxo[1], tam: 0.06 }) };
  },
  ventolamina(r) {
    const g = gp(), laminas = [0, 1, 2].map((i) => { const m = pecaN(G3.geo.vento, i ? NC.vento[1] : NC.vento[0], { opacidade: 0.8 - i * 0.15, dupla: true, somar: true }); m.scale.set(r * (2.2 + i * 0.4), r * (2.2 + i * 0.4), r * 0.5); m.rotation.set(Math.PI / 2, 0, -Math.PI * 0.35); g.add(m); return m; });
    return { grupo: g, animar: (t) => laminas.forEach((m, i) => { m.position.x = -i * r * 0.9; m.rotation.y = Math.sin(t * 10 + i) * 0.1; }), rastro: (x, y) => particula(x, y, { z: 0.45, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.3, g: 0, vida: 0.4, cor: NC.vento[1], tam: 0.05, atrito: 3 }) };
  },
  dragaovento(r) {
    const g = gp(), aneis = [];
    for (let i = 0; i < 9; i++) { const m = pecaN(G3.geo.toro, i % 2 ? NC.vento[0] : NC.vento[2], { opacidade: 0.7, somar: true }); m.rotation.y = Math.PI / 2; g.add(m); aneis.push(m); }
    const cabeca = pecaN(G3.geo.cone, NC.vento[0], { opacidade: 0.9, somar: true }); cabeca.scale.set(r * 0.7, r * 1.4, r * 0.7); cabeca.rotation.z = -Math.PI / 2; cabeca.position.x = r * 1.6; g.add(cabeca, brilhoG3(NC.vento[1], r * 7, 0.5));
    return { grupo: g, animar: (t) => aneis.forEach((m, i) => { const k = i / 8; m.position.set(-i * r * 0.7 + r, Math.sin(t * 9 - i * 0.8) * r * 0.5, 0); m.scale.setScalar(r * (1.9 - k * 1.1)); m.rotation.x = t * 8 + i; }), rastro: (x, y) => particula(x, y, { z: 0.45, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.5, g: 0, vida: 0.5, cor: NC.vento[1], tam: 0.07, atrito: 2 }) };
  },
  tigre(r) { // o Tigre Diurno: uma cabeça de tigre feita de ar
    const g = gp(), cabeca = pecaN(G3.geo.esfera, "#ffe9a8", { opacidade: 0.55, somar: true, escala: r * 2.6 }), miolo = pecaN(G3.geo.esfera, "#fff8d8", { opacidade: 0.8, somar: true, escala: r * 1.8 });
    g.add(cabeca, miolo, brilhoG3("#ffd870", r * 10, 0.55));
    for (const s of [-1, 1]) { const orelha = pecaN(geoN().espinho, "#ffd070", { opacidade: 0.8 }); orelha.scale.set(r * 0.9, r * 1.2, r * 0.5); orelha.position.set(-r * 0.4, r * 2.2, s * r * 1.6); g.add(orelha); const olho = pecaN(G3.geo.cubo, "#ff7a1a"); olho.scale.set(r * 0.3, r * 0.2, r * 0.5); olho.position.set(r * 2.3, r * 0.5, s * r * 0.9); g.add(olho); const listra = pecaN(G3.geo.cubo, "#d8601a", { opacidade: 0.8 }); listra.scale.set(r * 0.1, r * 1.0, r * 0.6); listra.position.set(r * 1.5, r * 1.6, s * r * 1.2); g.add(listra); }
    const boca = pecaN(G3.geo.cubo, "#802010", { opacidade: 0.8 }); boca.scale.set(r * 0.4, r * 0.7, r * 1.5); boca.position.set(r * 2.5, -r * 0.5, 0); g.add(boca);
    return { grupo: g, animar: (t) => { cabeca.scale.setScalar(r * (2.5 + Math.sin(t * 18) * 0.12)); g.rotation.x = Math.sin(t * 9) * 0.05; }, rastro: (x, y) => particula(x, y, { z: 0.6, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.4, g: 0, vida: 0.45, cor: "#ffe9a8", tam: 0.1, atrito: 2 }) };
  },
  chuvarmas(r) {
    const g = gp(), armas = [];
    for (let i = 0; i < 9; i++) {
      const a = new THREE.Group(), tipo = i % 3, m = tipo === 0 ? pecaN(geoN().estrela, NC.aco, { toon: true }) : pecaN(geoN().espinho, tipo === 1 ? NC.aco : "#c8b8a0", { toon: true });
      if (tipo === 0) m.scale.setScalar(r * 0.8); else { m.scale.set(r * 0.15, r * 1.3, r * 0.15); m.rotation.z = -Math.PI / 2; }
      a.add(m); a.userData = { m, tipo, fase: i }; a.position.set(-(i % 3) * r * 0.9, ((i / 3 | 0) - 1) * r * 0.5, (i % 3 - 1) * r * 1.5 + (i / 3 | 0) * 0.1); g.add(a); armas.push(a);
    }
    return { grupo: g, animar: (t) => armas.forEach((a) => { if (a.userData.tipo === 0) a.userData.m.rotation.y = t * 30 + a.userData.fase; else a.rotation.x = Math.sin(t * 15 + a.userData.fase) * 0.1; }), rastro: (x, y) => particula(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, { z: 0.45, vz: 0, g: 0, vida: 0.2, cor: "#e8eefc", tam: 0.04 }) };
  },
  maoareia(r) {
    const g = gp(), palma = pecaN(G3.geo.cubo, NC.areia[2], { toon: true }); palma.scale.set(r * 1.1, r * 0.4, r * 1.2); g.add(palma);
    const dedos = [0, 1, 2, 3].map((i) => { const d = pecaN(G3.geo.cubo, NC.areia[1], { toon: true }); d.scale.set(r * 1.0, r * 0.28, r * 0.26); d.position.set(r * 1.0, 0, (i - 1.5) * r * 0.32); g.add(d); return d; });
    const polegar = pecaN(G3.geo.cubo, NC.areia[1], { toon: true }); polegar.scale.set(r * 0.7, r * 0.26, r * 0.26); polegar.position.set(r * 0.3, 0, -r * 0.8); polegar.rotation.y = 0.8; g.add(polegar);
    const braco = pecaN(G3.geo.esfera, NC.areia[3], { opacidade: 0.8 }); braco.scale.set(r * 2.5, r * 0.4, r * 0.5); braco.position.x = -r * 1.6; g.add(braco);
    return { grupo: g, animar: (t) => dedos.forEach((d, i) => { d.rotation.z = Math.sin(t * 14 + i) * 0.25 + 0.2; }), rastro: (x, y) => particula(x, y, { z: 0.3, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: 0.5, g: 5, vida: 0.5, cor: NC.areia[Math.floor(Math.random() * 3)], tam: 0.07 }) };
  },
  mente(r) {
    const g = gp(), bola = pecaN(G3.geo.esfera, NC.rosa[1], { opacidade: 0.85, escala: r * 0.8 }), nucleo = pecaN(G3.geo.esfera, NC.rosa[0], { escala: r * 0.45 });
    g.add(bola, nucleo, brilhoG3(NC.rosa[1], r * 7, 0.55));
    const aneis = [0, 1, 2].map((k) => { const a = pecaN(G3.geo.toro, NC.rosa[2], { opacidade: 0.85, somar: true }); a.scale.setScalar(r * 1.2); g.add(a); return a; });
    return { grupo: g, animar: (t) => aneis.forEach((a, k) => { a.rotation.set(t * (4 + k * 2), t * (3 - k * 3), k); a.scale.setScalar(r * (1.1 + ((t * 2 + k / 3) % 1) * 0.7)); a.material.opacity = 0.85 * (1 - ((t * 2 + k / 3) % 1)); }), rastro: (x, y) => particula(x, y, { z: 0.45, vz: 0.6, g: -0.5, vida: 0.5, cor: NC.rosa[1], tam: 0.06 }) };
  },
  insetos(r) {
    const g = gp(), bichos = Array.from({ length: 16 }, (_, i) => { const m = pecaN(G3.geo.cubo, i % 3 ? "#1c1c18" : "#3a3a2a"); m.scale.setScalar(r * 0.14); g.add(m); return m; });
    return { grupo: g, animar: (t) => bichos.forEach((m, i) => { const a = t * (8 + (i % 4) * 3) + i * 1.9; m.position.set(Math.cos(a) * r * 1.4 - (i % 5) * r * 0.5, Math.sin(a * 1.3) * r * 1.1, Math.sin(a) * r * 1.3); m.rotation.y = a; }), rastro: (x, y) => particula(x, y, { z: 0.4, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.2, g: 0, vida: 0.4, cor: "#1c1c18", tam: 0.05, atrito: 3 }) };
  },
};
function projetilNaruto(fx, r) {
  const f = PROJETIL_N[fx];
  return f ? f(Math.max(0.16, r)) : null;
}

// ---------- o que acontece na frente de quem bate ----------
const fxDe = (f) => dexAtual().MOVES[f.golpe]?.fx || "";
// o grupo na frente do ninja, virado para onde ele mira
function naFrente(f, d = 0.9, h = 0.7) {
  const g = gp(); g.position.set(f.x + f.mira.x * d, h, f.y + f.mira.y * d); g.rotation.y = -Math.atan2(f.mira.y, f.mira.x); return g;
}
function arcoN(g, cor, esc, esp = 1, op = 0.95, somar = true) { const m = pecaN(G3.geo.corte, cor, { somar, opacidade: op, dupla: true }); m.scale.set(esc, esp, esc); g.add(m); return m; }
const CORPO_N = {
  kunai(f, agora) {
    const g = naFrente(f, 0.8), a = arcoN(g, NC.aco, 1.1, 1, 0.95, false), b = arcoN(g, "#ffffff", 1.0, 0.5); g.rotation.z = 0.35;
    vivo(g, 0.2, (k) => { a.scale.set(1.1 + k * 0.5, 1 - k * 0.6, 1.1 + k * 0.5); b.scale.set(1 + k * 0.5, 0.5 * (1 - k), 1 + k * 0.5); a.material.opacity = 0.95 * (1 - k); b.material.opacity = 1 - k; }, agora);
    espalhar(f.x + f.mira.x, f.y + f.mira.y, 5, ["#ffffff", NC.aco], { vel: 2.5, sobe: 1.2, vida: 0.25, tam: 0.05, z: 0.6 });
  },
  soco(f, agora) {
    const g = naFrente(f, 1.0), flash = pecaN(G3.geo.cristal, "#fff6d0", { opacidade: 1, somar: true }), anel = pecaN(G3.geo.toro, "#ffd890", { opacidade: 0.9, somar: true });
    g.add(flash, anel); anel.rotation.y = Math.PI / 2;
    vivo(g, 0.28, (k) => { flash.scale.setScalar(0.5 + k * 0.7); flash.rotation.set(k * 5, k * 3, 0); flash.material.opacity = 1 - k; anel.scale.setScalar(0.4 + k * 1.6); anel.material.opacity = 0.9 * (1 - k); }, agora);
    anelNoChao(f.x + f.mira.x, f.y + f.mira.y, "#e8d8a8", 0.3, 1.1, 0.3, agora); sacudir(0.35, 0.2);
  },
  rasengan(f, agora, escala = 1) {
    const g = naFrente(f, 0.75 * escala + 0.2, 0.75), nucleo = pecaN(G3.geo.esfera, NC.azul[0], { escala: 0.34 * escala }), meio = pecaN(G3.geo.esfera, NC.azul[2], { opacidade: 0.75, somar: true, escala: 0.5 * escala });
    const aneis = [0, 1, 2].map((i) => { const a = pecaN(G3.geo.toro, i % 2 ? NC.azul[1] : NC.azul[0], { opacidade: 0.9, somar: true }); a.scale.setScalar(0.55 * escala); g.add(a); return a; });
    g.add(nucleo, meio, brilhoG3(NC.azul[2], 3 * escala, 0.8));
    pedirLuz(NC.azul[2], 8 * escala, f.x + f.mira.x, f.y + f.mira.y, 0.8, 380, agora);
    vivo(g, 0.4, (k, t) => { aneis.forEach((a, i) => { a.rotation.set(t * (14 + i * 6), t * (11 - i * 7), i); }); meio.scale.setScalar(0.5 * escala * (1 + Math.sin(t * 40) * 0.1)); g.position.x += f.mira.x * 0.012; g.position.z += f.mira.y * 0.012; if (k > 0.75) g.scale.setScalar(1 - (k - 0.75) * 3); if (Math.random() < 0.6) particula(g.position.x + (Math.random() - 0.5) * 0.5, g.position.z + (Math.random() - 0.5) * 0.5, { z: 0.6 + Math.random() * 0.4, vz: 0.4, g: -0.5, vida: 0.3, cor: NC.azul[1], tam: 0.06 }); }, agora);
  },
  samehada(f, agora) {
    const g = naFrente(f, 0.8, 0.8), a = arcoN(g, "#3a4a68", 1.7, 1.4, 0.95, false), b = arcoN(g, NC.agua[1], 1.55, 0.8, 0.8); g.rotation.z = 0.3;
    vivo(g, 0.3, (k) => { const s = 1.7 + k * 0.7; a.scale.set(s, 1.4 * (1 - k * 0.5), s); b.scale.set(s * 0.9, 0.8 * (1 - k), s * 0.9); a.material.opacity = 0.95 * (1 - k); b.material.opacity = 0.8 * (1 - k); }, agora);
    espalhar(f.x + f.mira.x * 1.2, f.y + f.mira.y * 1.2, 8, NC.agua, { vel: 2, sobe: 2.5, vida: 0.4, tam: 0.08, z: 0.6, quica: 0 });
  },
  bisturi(f, agora) {
    const g = naFrente(f, 0.7), a = arcoN(g, NC.verde[1], 0.9, 0.6, 0.95), b = arcoN(g, "#ffffff", 0.85, 0.3, 1), lamina = pecaN(G3.geo.cubo, NC.verde[0], { somar: true, opacidade: 0.9 }); lamina.scale.set(0.9, 0.05, 0.08); g.add(lamina); g.rotation.z = 0.5;
    vivo(g, 0.22, (k) => { a.material.opacity = 0.95 * (1 - k); b.material.opacity = 1 - k; lamina.position.x = k * 0.7; lamina.material.opacity = 0.9 * (1 - k); }, agora);
    espalhar(f.x + f.mira.x * 0.9, f.y + f.mira.y * 0.9, 6, [NC.verde[0], NC.verde[1]], { vel: 1.5, sobe: 1.2, vida: 0.3, tam: 0.05, z: 0.7 });
  },
  palma(f, agora) {
    const g = naFrente(f, 1.0, 0.65), mat = new THREE.MeshBasicMaterial({ map: texTrigrama(), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }), disco = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat);
    disco.rotation.y = Math.PI / 2; g.add(disco);
    const ondas = [0, 1].map(() => { const a = pecaN(G3.geo.toro, NC.azul[1], { opacidade: 0.9, somar: true }); a.rotation.y = Math.PI / 2; g.add(a); return a; });
    vivo(g, 0.34, (k) => { disco.rotation.x = k * 4; disco.scale.setScalar(0.5 + k * 0.5); mat.opacity = 0.9 * (1 - k * k); ondas.forEach((a, i) => { const kk = Math.min(1, k * 1.4 - i * 0.3); a.visible = kk > 0; a.scale.setScalar(0.3 + Math.max(0, kk) * 1.3); a.material.opacity = 0.9 * (1 - Math.max(0, kk)); }); }, agora);
    pedirLuz(NC.azul[2], 5, f.x + f.mira.x, f.y + f.mira.y, 0.7, 250, agora);
  },
  espada(f, agora) {
    const g = naFrente(f, 1.0, 0.75), lamina = pecaN(G3.geo.cubo, NC.aco, { toon: true }), brilho = pecaN(G3.geo.cubo, "#ffffff", { somar: true, opacidade: 0.9 }), rastro = arcoN(g, NC.roxo[1], 1.8, 0.8, 0.8);
    lamina.scale.set(2.6, 0.05, 0.14); brilho.scale.set(2.6, 0.03, 0.05); g.add(lamina, brilho); g.rotation.z = 0.2;
    vivo(g, 0.28, (k) => { lamina.position.x = -0.4 + Math.sin(Math.min(1, k * 2) * Math.PI / 2) * 1.2; brilho.position.x = lamina.position.x; rastro.scale.set(1.8 + k * 0.4, 0.8 * (1 - k), 1.8 + k * 0.4); rastro.material.opacity = 0.8 * (1 - k); if (k > 0.7) { lamina.visible = brilho.visible = false; } }, agora);
  },
  leque(f, agora) {
    const g = naFrente(f, 0.9, 0.8), arcos = [0, 1, 2].map((i) => arcoN(g, i ? NC.vento[1] : NC.vento[0], 1.3 + i * 0.3, 0.5, 0.85 - i * 0.2)); g.rotation.z = 0.2;
    vivo(g, 0.32, (k) => arcos.forEach((a, i) => { const s = 1.3 + i * 0.3 + k * 0.9; a.scale.set(s, 0.5 * (1 - k * 0.5), s); a.material.opacity = (0.85 - i * 0.2) * (1 - k); }), agora);
    espalhar(f.x + f.mira.x * 1.2, f.y + f.mira.y * 1.2, 8, NC.vento, { vel: 3, sobe: 0.6, vida: 0.4, tam: 0.07, z: 0.7, atrito: 2 });
  },
};
function corpoNaruto(f, agora) {
  const fn = CORPO_N[fxDe(f)];
  if (!fn) return false;
  fn(f, agora); return true;
}

// ---------- o que cai no ponto mirado ----------
const rachaduras = (x, y, r, agora, cor = "#201810", n = 11) => {
  const g = gp(); g.position.set(x, 0.05, y);
  const fios = Array.from({ length: n }, (_, i) => { const m = pecaN(G3.geo.cubo, cor, { opacidade: 0.85 }); const a = (i / n) * 6.28 + aleat(i) * 0.4; m.userData = { a, len: r * (0.9 + aleat(i + 4) * 0.7) }; g.add(m); return m; });
  vivo(g, 1.1, (k) => fios.forEach((m) => { const L = m.userData.len * Math.min(1, k * 5); m.scale.set(L, 0.025, 0.05); m.position.set(Math.cos(m.userData.a) * L / 2, 0, Math.sin(m.userData.a) * L / 2); m.rotation.y = -m.userData.a; m.material.opacity = 0.85 * (1 - Math.max(0, k - 0.5) * 2); }), agora);
};
const AREA_N = {
  kirin(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const raio = raioN(g, 9, [NC.raio[3], NC.raio[2], NC.raio[0]], 0.5), topo = new THREE.Vector3(0, 13, 0), chao = new THREE.Vector3(0, 0.1, 0);
    const bola = pecaN(G3.geo.esfera, NC.raio[0], { somar: true, opacidade: 0.95 }), halo = brilhoG3(NC.raio[2], f.r * 4.5, 1); g.add(bola, halo);
    const garras = [0, 1, 2, 3].map((i) => { const m = pecaN(geoN().espinho, NC.raio[1], { somar: true, opacidade: 0.9 }); m.scale.set(0.3, 1.8, 0.3); g.add(m); return m; });
    pedirLuz(NC.raio[2], 18, f.x, f.y, 1.5, 420, agora); if (!movimentoReduzido.matches) G3.clarao = 1; sacudir(0.9, 0.55);
    anelNoChao(f.x, f.y, NC.raio[2], 0.4, f.r * 1.6, 0.4, agora); rachaduras(f.x, f.y, f.r, agora, "#101018", 9);
    vivo(g, 0.55, (k, t) => { const q = Math.floor(t * 30); raio.refaz(topo.clone().add(new THREE.Vector3((fixo(q) - 0.5) * 2, 0, 0)), chao, 2.2, q); const pisca = q % 2 ? 1 : 0.6; raio.segs.forEach((m) => { m.material.opacity = pisca * (1 - Math.max(0, k - 0.45) * 2); m.material.transparent = true; }); bola.scale.setScalar(f.r * (0.5 + Math.sin(k * Math.PI) * 0.6)); bola.material.opacity = 0.95 * (1 - k); halo.material.opacity = 1 - k; garras.forEach((m, i) => { const a = i * 1.57 + t * 12; m.position.set(Math.cos(a) * f.r * 0.7, 0.9, Math.sin(a) * f.r * 0.7); m.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6); m.material.opacity = 0.9 * (1 - k); }); }, agora);
    espalhar(f.x, f.y, 24, [NC.raio[0], NC.raio[2], NC.raio[3]], { vel: 5, sobe: 2.5, vida: 0.35, tam: 0.07, g: 4, z: 0.3, raio: f.r * 0.4 });
  },
  impacto(f, agora, queda = false) {
    anelNoChao(f.x, f.y, "#f4e8c8", 0.3, f.r * 1.5, 0.45, agora, 0.04, 0.95); anelNoChao(f.x, f.y, "#c8b898", 0.2, f.r * 1.0, 0.35, agora, 0.05, 0.8);
    rachaduras(f.x, f.y, f.r * 1.2, agora);
    const g = gp(); g.position.set(f.x, 0, f.y);
    const pedras = Array.from({ length: 10 }, (_, i) => { const m = pecaN(G3.geo.pedra, i % 2 ? "#a8906a" : "#7a6a4a", { toon: true, escala: 0.1 + aleat(i) * 0.14 }); g.add(m); const a = aleat(i + 3) * 6.28; return { m, vx: Math.cos(a) * (0.8 + aleat(i + 9) * 1.6), vz: Math.sin(a) * (0.8 + aleat(i + 9) * 1.6), vy: 3 + aleat(i + 6) * 3 }; });
    vivo(g, 0.8, (k, t) => pedras.forEach((p) => { p.m.position.set(p.vx * t, Math.max(0.05, p.vy * t - 9 * t * t), p.vz * t); p.m.rotation.set(t * 9, t * 6, 0); }), agora);
    espalhar(f.x, f.y, 18, ["#e9dcbb", "#c8b898", "#a89878"], { vel: 3, sobe: 1.4, vida: 0.7, tam: 0.18, atrito: 2.5, z: 0.1, raio: f.r * 0.5 }); sacudir(0.6, 0.3);
    if (queda) { const bota = pecaN(G3.geo.cubo, "#d8c8b0", { toon: true }); bota.scale.set(0.6, 1.4, 0.9); const gb = gp(); gb.position.set(f.x, 0, f.y); gb.add(bota); vivo(gb, 0.22, (k) => { bota.position.y = 7 * (1 - Math.min(1, k * 1.6)) ** 2 + 0.7; bota.rotation.z = 0.4; bota.visible = k < 0.85; }, agora); }
  },
  calcanhar(f, agora) { AREA_N.impacto(f, agora, true); },
  estrangular(f, agora) {
    const g = gp(), n = 8; g.position.set(f.x, 0, f.y);
    const bracos = Array.from({ length: n }, (_, i) => { const m = pecaN(geoN().espinho, NC.sombra[2], { opacidade: 0.92 }); const a = (i / n) * 6.28; m.userData = { a }; g.add(m); const mao = pecaN(G3.geo.bola, NC.sombra[3], { opacidade: 0.95, escala: 0.16 }); m.userData.mao = mao; g.add(mao); return m; });
    const mancha = pecaN(G3.geo.esfera, NC.sombra[3], { opacidade: 0.5, escala: f.r * 0.9 }); mancha.position.y = 0.1; mancha.scale.y = 0.05; g.add(mancha);
    vivo(g, 0.85, (k, t) => bracos.forEach((m) => { const a = m.userData.a, h = 1.6 * Math.min(1, k * 4) * (1 - Math.max(0, k - 0.7) * 3), d = f.r * (0.9 - Math.min(1, k * 2) * 0.55) + Math.sin(t * 12 + a) * 0.05; m.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d); m.scale.set(0.22, Math.max(0.01, h), 0.22); m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); m.userData.mao.position.set(Math.cos(a) * d * 0.75, h, Math.sin(a) * d * 0.75); m.userData.mao.scale.setScalar(0.16 + Math.sin(t * 14 + a) * 0.02); m.material.opacity = 0.92 * (1 - Math.max(0, k - 0.8) * 5); }), agora);
    anelNoChao(f.x, f.y, NC.sombra[1], 0.3, f.r * 1.3, 0.5, agora); pedirLuz(NC.sombra[1], 6, f.x, f.y, 0.8, 500, agora);
  },
  amaterasu(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const anim = chamasN(g, ["#060308", "#1a0a24", "#2a1238", "#0a0510"], 26, f.r * 0.95, 1.6), borda = chamasN(g, ["#a070ff", "#d8c8ff"], 10, f.r * 1.0, 0.9);
    vivo(g, 1.0, (k, t) => { anim(k, t); borda(k, t * 1.2, 0.8); }, agora);
    anelNoChao(f.x, f.y, "#8a5acc", 0.3, f.r * 1.2, 0.6, agora); pedirLuz("#8a5acc", 7, f.x, f.y, 1, 800, agora); sacudir(0.4, 0.2);
    espalhar(f.x, f.y, 16, ["#1a0a24", "#8a5acc", "#08040c"], { vel: 1.2, sobe: 3, g: -2, vida: 0.7, tam: 0.1, z: 0.1, raio: f.r * 0.6 });
  },
  onda(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const parede = pecaN(geoN().coluna, NC.agua[2], { opacidade: 0.7, dupla: true }), espuma = pecaN(G3.geo.toro, NC.agua[0], { opacidade: 0.9 }); espuma.rotation.x = Math.PI / 2; g.add(parede, espuma);
    vivo(g, 0.8, (k) => { const rr = f.r * (0.3 + Math.min(1, k * 2.2) * 1.05); parede.scale.set(rr, 1.6 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.6) + 0.05, rr); parede.material.opacity = 0.7 * (1 - Math.max(0, k - 0.5) * 2); espuma.scale.setScalar(rr); espuma.position.y = parede.scale.y; espuma.material.opacity = 0.9 * (1 - Math.max(0, k - 0.5) * 2); }, agora);
    anelNoChao(f.x, f.y, NC.agua[0], 0.3, f.r * 1.5, 0.7, agora); espalhar(f.x, f.y, 34, NC.agua, { vel: 3.4, sobe: 5, vida: 0.8, tam: 0.12, quica: 0, raio: f.r * 0.8 }); sacudir(0.55, 0.25); pedirLuz(NC.agua[1], 6, f.x, f.y, 1, 500, agora);
  },
  c3(f, agora) {
    const g = gp(); g.position.set(f.x, 0.6, f.y);
    const bola = pecaN(G3.geo.esfera, "#fff8e8", { opacidade: 1, somar: true }), casca = pecaN(G3.geo.esfera, "#ff9a4a", { opacidade: 0.6, somar: true }), fumaca = pecaN(G3.geo.esfera, "#6a5a58", { opacidade: 0.01 }), halo = brilhoG3("#ffd890", f.r * 8, 1);
    g.add(bola, casca, fumaca, halo);
    vivo(g, 1.0, (k) => { const s = f.r * (0.4 + Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * 1.5); bola.scale.setScalar(s * 0.8); bola.material.opacity = Math.max(0, 1 - k * 2.2); casca.scale.setScalar(s); casca.material.opacity = 0.6 * (1 - k); fumaca.scale.setScalar(s * 1.1); fumaca.position.y = k * 1.2; fumaca.material.opacity = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.55; halo.material.opacity = Math.max(0, 1 - k * 1.5); }, agora);
    anelNoChao(f.x, f.y, "#ffffff", 0.4, f.r * 2.4, 0.5, agora); anelNoChao(f.x, f.y, "#ffb060", 0.3, f.r * 1.8, 0.7, agora);
    if (!movimentoReduzido.matches) G3.clarao = 1; sacudir(1, 0.7); pedirLuz("#ffc070", 20, f.x, f.y, 1.4, 600, agora); rachaduras(f.x, f.y, f.r * 1.4, agora);
    espalhar(f.x, f.y, 36, ["#ffffff", "#ffd890", "#ff9a4a", "#6a5a58"], { vel: 5, sobe: 5, vida: 0.9, tam: 0.18, g: 7, z: 0.3, raio: f.r * 0.5 });
  },
  areiaferro(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const espinhos = Array.from({ length: 16 }, (_, i) => { const m = pecaN(geoN().espinho, i % 3 ? "#4a4e58" : "#8a90a0", { toon: true }); const a = aleat(i) * 6.28, d = Math.sqrt(aleat(i + 7)) * f.r * 0.95; m.userData = { a, d, h: 0.9 + aleat(i + 2) * 1.3, tilt: (aleat(i + 11) - 0.5) * 0.7 }; g.add(m); return m; });
    vivo(g, 0.9, (k) => espinhos.forEach((m) => { const u = m.userData, h = u.h * Math.min(1, k * 6) * (1 - Math.max(0, k - 0.6) * 2.5); m.position.set(Math.cos(u.a) * u.d, 0, Math.sin(u.a) * u.d); m.scale.set(0.5, Math.max(0.01, h), 0.5); m.rotation.set(u.tilt, 0, -u.tilt); }), agora);
    espalhar(f.x, f.y, 26, ["#2a2e38", "#5a606c", "#8a90a0"], { vel: 3, sobe: 1.5, vida: 0.8, tam: 0.08, atrito: 1.5, z: 0.2, raio: f.r * 0.7 }); anelNoChao(f.x, f.y, "#5a606c", 0.3, f.r * 1.2, 0.5, agora); sacudir(0.4, 0.2);
  },
  mokuton(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const troncos = Array.from({ length: 9 }, (_, i) => { const m = pecaN(geoN().espinho, i % 2 ? NC.madeira[1] : NC.madeira[2], { toon: true }); const a = i ? aleat(i) * 6.28 : 0, d = i ? aleat(i + 3) * f.r * 0.8 : 0; m.userData = { a, d, h: i ? 1.0 + aleat(i + 8) : 1.9 }; g.add(m); const fol = pecaN(G3.geo.cubo, NC.madeira[3], { toon: true }); fol.scale.setScalar(0.22); m.userData.fol = fol; g.add(fol); return m; });
    vivo(g, 0.95, (k) => troncos.forEach((m) => { const u = m.userData, h = u.h * Math.min(1, k * 7) * (1 - Math.max(0, k - 0.7) * 3); m.position.set(Math.cos(u.a) * u.d, 0, Math.sin(u.a) * u.d); m.scale.set(0.6, Math.max(0.01, h), 0.6); u.fol.position.set(m.position.x + 0.15, h * 0.85, m.position.z); u.fol.visible = h > 0.3; }), agora);
    anelNoChao(f.x, f.y, NC.madeira[3], 0.3, f.r * 1.2, 0.5, agora); espalhar(f.x, f.y, 14, [NC.madeira[3], "#9fe070", NC.madeira[1]], { vel: 2, sobe: 3.5, vida: 0.7, tam: 0.1, raio: f.r * 0.5 }); sacudir(0.3, 0.1);
  },
  prisao(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const barras = Array.from({ length: 11 }, (_, i) => { const m = pecaN(G3.geo.fino, i % 2 ? NC.madeira[1] : NC.madeira[0], { toon: true }); m.userData = { a: (i / 11) * 6.28 }; g.add(m); return m; });
    const topo = pecaN(GN.geo ? GN.geo.semi : geoN().semi, NC.madeira[2], { toon: true, dupla: true }); g.add(topo);
    vivo(g, 1.0, (k) => { const rr = f.r * (1.1 - Math.min(1, k * 2.5) * 0.45), h = 1.5 * Math.min(1, k * 5) * (1 - Math.max(0, k - 0.75) * 4); barras.forEach((m) => { m.position.set(Math.cos(m.userData.a) * rr, h / 2, Math.sin(m.userData.a) * rr); m.scale.set(0.16, Math.max(0.01, h), 0.16); }); topo.position.y = h * 0.9; topo.scale.set(rr, Math.max(0.01, h * 0.5), rr); topo.visible = k > 0.35; }, agora);
    anelNoChao(f.x, f.y, NC.madeira[3], 0.3, f.r * 1.2, 0.5, agora);
  },
  sapo(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const corpo = pecaN(G3.geo.esfera, "#4a9a3a", { toon: true }), barriga = pecaN(G3.geo.esfera, "#e8d890", { toon: true }), boca = pecaN(G3.geo.cubo, "#802818", { toon: true });
    corpo.scale.set(1.5, 1.1, 1.5); corpo.position.y = 1.0; barriga.scale.set(1.1, 0.8, 1.2); barriga.position.set(0.45, 0.8, 0); boca.scale.set(0.5, 0.06, 1.6); boca.position.set(1.2, 0.85, 0);
    for (const s of [-1, 1]) { const olho = pecaN(G3.geo.esfera, "#f0e070", { toon: true, escala: 0.38 }); olho.position.set(0.7, 2.0, s * 0.7); const pupila = pecaN(G3.geo.cubo, "#101010"); pupila.scale.setScalar(0.5); pupila.position.set(0.8, 0, 0); olho.add(pupila); g.add(olho); const pata = pecaN(G3.geo.esfera, "#3f8a30", { toon: true }); pata.scale.set(0.8, 0.45, 0.4); pata.position.set(0.6, 0.35, s * 1.2); g.add(pata); }
    g.add(corpo, barriga, boca);
    const escala = f.r * 0.42; g.scale.setScalar(escala);
    vivo(g, 1.1, (k) => { const cai = Math.min(1, k / 0.22); g.position.y = (1 - cai) * (1 - cai) * 9; const achata = k > 0.2 && k < 0.34 ? 1 - Math.sin((k - 0.2) / 0.14 * Math.PI) * 0.25 : 1; g.scale.set(escala / achata, escala * achata, escala / achata); if (k > 0.8) g.position.y = -(k - 0.8) * 8; }, agora);
    setTimeout(() => { anelNoChao(f.x, f.y, "#e9dcbb", 0.3, f.r * 1.8, 0.5, relogio.agora()); sacudir(0.9, 0.5); espalhar(f.x, f.y, 24, ["#e9dcbb", "#c8b898", "#a89878"], { vel: 3.5, sobe: 2, vida: 0.7, tam: 0.2, atrito: 2, z: 0.1, raio: f.r * 0.6 }); }, 220);
  },
  hakke(f, agora) {
    const g = gp(); g.position.set(f.x, 0.06, f.y);
    const mat = new THREE.MeshBasicMaterial({ map: texTrigrama(), transparent: true, opacity: 0.95, depthWrite: false }), plano = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat); plano.rotation.x = -Math.PI / 2; g.add(plano);
    const mat2 = mat.clone(), plano2 = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat2); plano2.rotation.x = -Math.PI / 2; plano2.position.y = 0.01; g.add(plano2);
    const fagulhas = Array.from({ length: 16 }, (_, i) => { const m = pecaN(G3.geo.cristal, NC.azul[1], { somar: true, opacidade: 0.95 }); m.scale.setScalar(0.12); g.add(m); return m; });
    vivo(g, 1.0, (k, t) => { const s = f.r * (0.4 + Math.min(1, k * 4) * 1.1); plano.scale.setScalar(s); plano.rotation.z = t * 2.5; plano2.scale.setScalar(s * 0.62); plano2.rotation.z = -t * 3.5; const op = 1 - Math.max(0, k - 0.6) * 2.5; mat.opacity = 0.95 * op; mat2.opacity = 0.7 * op; fagulhas.forEach((m, i) => { const ciclo = ((t * 6 + i * 0.37) % 1); const a = i * 2.4; m.position.set(Math.cos(a) * s * 0.85 * ciclo, 0.3 + ciclo * 0.4, Math.sin(a) * s * 0.85 * ciclo); m.scale.setScalar(0.18 * (1 - ciclo) * op); m.rotation.y = t * 6; }); }, agora);
    pedirLuz(NC.azul[2], 8, f.x, f.y, 0.8, 800, agora); sacudir(0.25, 0.1);
  },
  cobragigante(f, agora) {
    const g = gp(), n = 12; g.position.set(f.x, 0, f.y);
    const corpo = Array.from({ length: n }, (_, i) => { const m = pecaN(G3.geo.esfera, i % 3 === 1 ? "#4a2f78" : "#2a1a48", { toon: true }); g.add(m); return m; });
    const cabeca = pecaN(G3.geo.esfera, "#4a2f78", { toon: true }), mandibula = pecaN(G3.geo.cubo, "#e8dcc0", { toon: true }), lingua = pecaN(G3.geo.cubo, "#c01838"); cabeca.scale.set(0.95, 0.65, 0.8); mandibula.scale.set(0.9, 0.12, 0.6); lingua.scale.set(0.8, 0.05, 0.1); g.add(cabeca, mandibula, lingua);
    for (const s of [-1, 1]) { const olho = pecaN(G3.geo.cubo, "#ffe14d"); olho.scale.set(0.14, 0.16, 0.12); olho.position.set(0.55, 0.45, s * 0.45); cabeca.add(olho); }
    const alt = 3.6 * Math.max(1, f.r / 2);
    vivo(g, 1.1, (k, t) => { const sobe = Math.min(1, k * 4), cai = Math.max(0, k - 0.75) * 4, h = alt * sobe * (1 - cai * 0.9); corpo.forEach((m, i) => { const u = i / (n - 1); m.position.set(Math.sin(u * 5 + t * 5) * 0.28 * u, u * h * 0.92, Math.cos(u * 4 + t * 4) * 0.2 * u); m.scale.setScalar(0.55 - u * 0.12); m.visible = u * h > 0.05; }); const top = corpo[n - 1].position; cabeca.position.set(top.x + 0.4, top.y + 0.2, top.z); cabeca.rotation.z = -0.35 - Math.sin(t * 6) * 0.15; mandibula.position.set(top.x + 0.5, top.y - 0.15, top.z); mandibula.rotation.z = -0.3 - Math.abs(Math.sin(t * 5)) * 0.6; lingua.position.set(top.x + 1.2, top.y, top.z); lingua.rotation.y = Math.sin(t * 25) * 0.2; }, agora);
    anelNoChao(f.x, f.y, NC.roxo[1], 0.3, f.r * 1.5, 0.5, agora); espalhar(f.x, f.y, 22, [NC.roxo[1], "#e9dcbb", NC.roxo[2]], { vel: 3, sobe: 3, vida: 0.7, tam: 0.14, atrito: 2, raio: f.r * 0.5 }); sacudir(0.8, 0.4); pedirLuz(NC.roxo[1], 6, f.x, f.y, 1, 700, agora);
  },
  ciclone(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const aneis = Array.from({ length: 7 }, (_, i) => { const m = pecaN(G3.geo.toro, i % 2 ? NC.vento[0] : NC.vento[2], { opacidade: 0.75, somar: true }); m.rotation.x = Math.PI / 2; g.add(m); return m; });
    const laminas = [0, 1, 2].map(() => { const m = pecaN(G3.geo.vento, NC.vento[0], { opacidade: 0.85, dupla: true, somar: true, escala: 0.9 }); m.rotation.set(Math.PI / 2, 0, 0); g.add(m); return m; });
    vivo(g, 0.9, (k, t) => { const op = 1 - Math.max(0, k - 0.65) * 2.8; aneis.forEach((m, i) => { const u = i / 6; m.position.y = 0.1 + u * 2.6 * Math.min(1, k * 4); m.scale.setScalar(f.r * (0.45 + u * 0.75)); m.rotation.z = t * (6 + i); m.material.opacity = 0.75 * op; }); laminas.forEach((m, i) => { const a = t * 9 + i * 2.1; m.position.set(Math.cos(a) * f.r * 0.8, 0.9 + i * 0.5, Math.sin(a) * f.r * 0.8); m.rotation.y = -a; m.material.opacity = 0.85 * op; }); }, agora);
    espalhar(f.x, f.y, 22, NC.vento, { vel: 2.5, sobe: 3, g: 0, vida: 0.8, tam: 0.08, atrito: 1.5, raio: f.r * 0.8 }); anelNoChao(f.x, f.y, NC.vento[1], 0.3, f.r * 1.3, 0.5, agora); sacudir(0.35, 0.1);
  },
  sansho(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const nuvens = Array.from({ length: 12 }, (_, i) => { const m = pecaN(G3.geo.esfera, i % 3 ? "#8a40b8" : "#5a9a4a", { opacidade: 0.6 }); m.userData = { a: aleat(i) * 6.28, d: aleat(i + 6) * f.r * 0.8, h: 0.3 + aleat(i + 2) * 0.8 }; g.add(m); return m; });
    const bolhas = Array.from({ length: 10 }, (_, i) => { const m = pecaN(G3.geo.esfera, "#c8f0a0", { opacidade: 0.8, escala: 0.08 }); m.userData = { a: aleat(i + 21) * 6.28, d: aleat(i + 8) * f.r * 0.9 }; g.add(m); return m; });
    vivo(g, 1.0, (k) => { nuvens.forEach((m) => { const u = m.userData; m.position.set(Math.cos(u.a) * u.d, u.h * Math.min(1, k * 3), Math.sin(u.a) * u.d); m.scale.setScalar(0.5 + Math.min(1, k * 3) * 0.6); m.material.opacity = 0.6 * (1 - Math.max(0, k - 0.5) * 2); }); bolhas.forEach((m, i) => { const u = m.userData, c = (k * 2 + i * 0.1) % 1; m.position.set(Math.cos(u.a) * u.d, c * 1.4, Math.sin(u.a) * u.d); m.material.opacity = 0.8 * (1 - c); }); }, agora);
    anelNoChao(f.x, f.y, "#9fe070", 0.3, f.r * 1.3, 0.5, agora);
  },
  dragaoarmas(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const armas = Array.from({ length: 22 }, (_, i) => { const m = i % 3 === 0 ? pecaN(geoN().estrela, NC.aco, { toon: true }) : pecaN(geoN().espinho, i % 3 === 1 ? NC.aco : "#c8b8a0", { toon: true }); if (i % 3 === 0) m.scale.setScalar(0.22); else m.scale.set(0.07, 0.45, 0.07); g.add(m); return m; });
    const pergaminho = pecaN(G3.geo.fino, "#f4ecd0", { toon: true }); pergaminho.scale.set(0.12, f.r * 1.6, 0.12); pergaminho.rotation.z = Math.PI / 2; pergaminho.position.y = 0.1; g.add(pergaminho);
    vivo(g, 0.95, (k, t) => { const op = 1 - Math.max(0, k - 0.75) * 4; armas.forEach((m, i) => { const u = i / 21, h = Math.min(1, Math.max(0, k * 1.5 - u * 0.45)) * 4, a = u * 14 + t * 8, rr = f.r * (0.9 - Math.min(1, h / 4) * 0.55); m.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr); if (i % 3) m.rotation.set(0.3, -a, -Math.PI / 2 + 0.2); else m.rotation.set(0, t * 25, 0); m.visible = h > 0.05 && op > 0.05; }); pergaminho.rotation.y = t * 3; }, agora);
    anelNoChao(f.x, f.y, "#e8eefc", 0.3, f.r * 1.3, 0.5, agora); pedirLuz("#e8eefc", 5, f.x, f.y, 1.2, 600, agora); sacudir(0.35, 0.15);
  },
  caixaoareia(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const domo = pecaN(geoN().semi, NC.areia[1], { opacidade: 0.7, dupla: true }), punho = pecaN(G3.geo.esfera, NC.areia[2], { toon: true }); g.add(domo, punho);
    vivo(g, 0.95, (k, t) => { const aperta = Math.min(1, Math.max(0, (k - 0.2) / 0.3)), rr = f.r * (1.3 - aperta * 0.95); domo.scale.set(rr, 1.6 + aperta * 0.8, rr); domo.material.opacity = 0.7 * (1 - Math.max(0, k - 0.7) * 3); punho.visible = k > 0.55 && k < 0.85; punho.position.y = 0.6; punho.scale.set(0.5 + Math.sin(t * 40) * 0.05, 0.9, 0.5); }, agora);
    anelNoChao(f.x, f.y, NC.areia[2], 0.3, f.r * 1.4, 0.5, agora); espalhar(f.x, f.y, 24, NC.areia, { vel: 2.4, sobe: 2.5, vida: 0.8, tam: 0.1, raio: f.r * 0.8 }); sacudir(0.5, 0.2);
  },
  funeral(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const onda = pecaN(geoN().coluna, NC.areia[1], { opacidade: 0.78, dupla: true }), topo = pecaN(G3.geo.toro, NC.areia[0], { opacidade: 0.9 }); topo.rotation.x = Math.PI / 2; g.add(onda, topo);
    const garras = Array.from({ length: 8 }, (_, i) => { const m = pecaN(geoN().espinho, NC.areia[2], { opacidade: 0.9 }); m.userData = { a: (i / 8) * 6.28 }; g.add(m); return m; });
    vivo(g, 1.3, (k, t) => { const sobe = Math.min(1, k / 0.35), cai = Math.max(0, (k - 0.55) / 0.3), h = 4.2 * sobe * (1 - cai * cai), rr = f.r * (1.15 + cai * 0.4); onda.scale.set(rr, Math.max(0.05, h), rr); onda.material.opacity = 0.78 * (1 - Math.max(0, k - 0.8) * 5); topo.position.y = h; topo.scale.setScalar(rr * 1.02); topo.material.opacity = 0.9 * (1 - Math.max(0, k - 0.8) * 5); garras.forEach((m) => { const a = m.userData.a + t * 0.8; m.position.set(Math.cos(a) * rr, h * 0.9, Math.sin(a) * rr); m.scale.set(0.5, 1.4 * (1 - cai), 0.5); m.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); }); }, agora);
    anelNoChao(f.x, f.y, NC.areia[2], 0.3, f.r * 1.8, 0.8, agora); sacudir(1, 0.6); pedirLuz(NC.areia[1], 7, f.x, f.y, 1.4, 900, agora); rachaduras(f.x, f.y, f.r * 1.3, agora, "#6a5028");
    espalhar(f.x, f.y, 40, NC.areia, { vel: 3.4, sobe: 4, vida: 1, tam: 0.14, g: 5, raio: f.r * 0.9 });
  },
  enxame(f, agora) {
    const g = gp(); g.position.set(f.x, 0, f.y);
    const bichos = Array.from({ length: 36 }, (_, i) => { const m = pecaN(G3.geo.cubo, i % 3 ? "#1c1c18" : "#3a3a2a"); m.scale.setScalar(0.1); g.add(m); return m; });
    const chao = pecaN(G3.geo.esfera, "#101010", { opacidade: 0.3 }); chao.scale.set(f.r * 1.1, 0.04, f.r * 1.1); g.add(chao);
    vivo(g, 1.0, (k, t) => { const op = 1 - Math.max(0, k - 0.7) * 3; bichos.forEach((m, i) => { const a = t * (6 + (i % 5) * 2) + i * 1.7, d = f.r * (0.2 + 0.8 * Math.abs(Math.sin(i * 2.1 + t * 2))); m.position.set(Math.cos(a) * d, 0.2 + Math.abs(Math.sin(a * 1.5 + i)) * 1.1, Math.sin(a) * d); m.rotation.y = a; m.visible = op > 0.05; }); chao.material.opacity = 0.3 * op; }, agora);
    anelNoChao(f.x, f.y, "#3a3a2a", 0.3, f.r * 1.2, 0.5, agora); sacudir(0.2, 0.05);
  },
};
function areaNaruto(f, agora) {
  const fn = AREA_N[fxDe(f)];
  if (!fn) return false;
  fn(f, agora); return true;
}

// ---------- quem avança com o jutsu (investida) e quem se fortalece ----------
// o grupo que acompanha o ninja `id` (a pose dele vem de desenho.js, a cada quadro); `na` é o ponto de agora e `mira`, para onde ele olha
function acompanha(f, dur, agora, montar) {
  const g = gp(), mira = { x: f.mira.x, y: f.mira.y }; G3.cena.scene.add(g);
  const objeto = { grupo: g, t0: agora, dur, animar: null };
  const ctx = { g, mira, na: () => baseDe(poseDe(f.id)) || { x: f.x, y: f.y, h: 0 }, f };
  const anima = montar(ctx);
  objeto.animar = (k, t) => { const p = ctx.na(); g.position.set(p.x, p.h, p.y); g.rotation.y = -Math.atan2(mira.y, mira.x); anima(k, t, p); };
  G3.vivos.push(objeto);
  return ctx;
}
const INVESTIDA_N = {
  chidori(f, agora, forte = false) {
    const cor = forte ? [NC.raio[0], "#fff6c0", "#ffe14d", "#e0a020"] : NC.raio;
    acompanha(f, forte ? 0.6 : 0.55, agora, ({ g }) => {
      const mao = new THREE.Group(); mao.position.set(0.85, 0.75, 0); g.add(mao);
      const bola = pecaN(G3.geo.esfera, cor[0], { somar: true, escala: forte ? 0.38 : 0.3 }), halo = brilhoG3(cor[2], forte ? 4.2 : 3.4, 0.95); mao.add(bola, halo);
      const raio = raioN(mao, 5, [cor[3], cor[1], cor[0]], forte ? 0.16 : 0.12), ramos = [0, 1, 2, 3].map(() => raioN(mao, 3, [cor[3], cor[0]], 0.08));
      const cauda = raioN(g, 6, [cor[3], cor[0]], 0.09);
      return (k, t, p) => {
        const q = Math.floor(t * 40); const L = forte ? 1.5 : 1.15;
        raio.refaz(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0).add(new THREE.Vector3(fixo(q) * 0.4, (fixo(q + 1) - 0.5) * 0.5, (fixo(q + 2) - 0.5) * 0.6)), 0.5, q);
        ramos.forEach((r, i) => { const a = i * 1.57 + q * 0.9; r.refaz(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * L * 0.55, Math.sin(a * 1.3) * L * 0.5, Math.sin(a) * L * 0.55), 0.35, q + i * 3); });
        cauda.refaz(new THREE.Vector3(0.7, 0.75, 0), new THREE.Vector3(-1.8, 0.4, 0), 0.4, q);
        bola.scale.setScalar((forte ? 0.38 : 0.3) * (1 + Math.sin(t * 60) * 0.12)); halo.material.opacity = (q % 2 ? 0.95 : 0.65) * (1 - Math.max(0, k - 0.75) * 4);
        pedirLuz(cor[2], 9, p.x, p.y, 0.9, 80, relogio.agora());
        if (Math.random() < 0.7) particula(p.x - 0.5 + (Math.random() - 0.5), p.y + (Math.random() - 0.5), { z: 0.5 + Math.random() * 0.5, vz: 0.3, g: 0, vida: 0.2, cor: cor[Math.floor(Math.random() * 3)], tam: 0.05 });
      };
    });
    sacudir(0.3, 0.15);
  },
  raikiri(f, agora) { INVESTIDA_N.chidori(f, agora, true); },
  odama(f, agora) {
    acompanha(f, 0.6, agora, ({ g }) => {
      const mao = new THREE.Group(); mao.position.set(1.15, 0.8, 0); g.add(mao);
      const nucleo = pecaN(G3.geo.esfera, NC.azul[0], { escala: 0.55 }), meio = pecaN(G3.geo.esfera, NC.azul[2], { opacidade: 0.75, somar: true, escala: 0.85 });
      const aneis = [0, 1, 2, 3].map((i) => { const a = pecaN(G3.geo.toro, i % 2 ? NC.azul[1] : NC.azul[0], { opacidade: 0.9, somar: true }); a.scale.setScalar(0.95); mao.add(a); return a; });
      mao.add(nucleo, meio, brilhoG3(NC.azul[2], 5.5, 0.85));
      return (k, t, p) => { aneis.forEach((a, i) => a.rotation.set(t * (13 + i * 5), t * (10 - i * 6), i)); meio.scale.setScalar(0.85 * (1 + Math.sin(t * 40) * 0.08)); pedirLuz(NC.azul[2], 12, p.x, p.y, 0.9, 80, relogio.agora()); if (Math.random() < 0.8) particula(p.x + (Math.random() - 0.5) * 1.2, p.y + (Math.random() - 0.5) * 1.2, { z: 0.5 + Math.random() * 0.6, vz: 0.5, g: -0.5, vida: 0.3, cor: NC.azul[1], tam: 0.08 }); };
    });
    sacudir(0.35, 0.2);
  },
  lotus(f, agora) {
    acompanha(f, 0.55, agora, ({ g }) => {
      const aneis = [0, 1, 2].map((i) => { const a = pecaN(G3.geo.toro, i % 2 ? "#e8fff0" : NC.verde[1], { opacidade: 0.85, somar: true }); a.rotation.x = Math.PI / 2; g.add(a); return a; });
      const rastros = [0, 1, 2, 3].map((i) => { const m = pecaN(G3.geo.cubo, "#ffffff", { opacidade: 0.7, somar: true }); m.scale.set(1.4, 0.03, 0.03); g.add(m); return m; });
      return (k, t) => { aneis.forEach((a, i) => { a.position.y = 0.2 + i * 0.5; a.scale.setScalar(0.7 + i * 0.15); a.rotation.z = t * (14 + i * 4); }); rastros.forEach((m, i) => { m.position.set(-0.9 - ((t * 5 + i * 0.25) % 1) * 0.8, 0.3 + i * 0.3, (i - 1.5) * 0.25); m.material.opacity = 0.7 * (1 - ((t * 5 + i * 0.25) % 1)); }); };
    });
  },
  tornado(f, agora) {
    acompanha(f, 0.5, agora, ({ g }) => {
      const aneis = Array.from({ length: 5 }, (_, i) => { const a = pecaN(G3.geo.toro, i % 2 ? NC.vento[0] : NC.vento[2], { opacidade: 0.7, somar: true }); a.rotation.x = Math.PI / 2; g.add(a); return a; });
      return (k, t) => aneis.forEach((a, i) => { a.position.y = 0.15 + i * 0.3; a.scale.setScalar(0.55 + i * 0.12); a.rotation.z = t * (12 + i * 3); });
    });
  },
  gatsuuga(f, agora, duplo = false) {
    acompanha(f, 0.5, agora, ({ g }) => {
      const brocas = Array.from({ length: duplo ? 2 : 1 }, (_, i) => { const b = pecaN(G3.geo.cone, i ? "#c8b898" : "#8a6a4a", { opacidade: 0.75, dupla: true }); b.scale.set(0.9 + i * 0.35, 1.8 + i * 0.5, 0.9 + i * 0.35); b.rotation.z = -Math.PI / 2; b.position.set(0.35, 0.6, 0); g.add(b); return b; });
      const aneis = [0, 1, 2].map((i) => { const a = pecaN(G3.geo.toro, "#e8e4dc", { opacidade: 0.8, somar: true }); a.rotation.y = Math.PI / 2; g.add(a); return a; });
      return (k, t, p) => { brocas.forEach((b, i) => { b.rotation.x = t * (30 + i * 8); }); aneis.forEach((a, i) => { a.position.set(-0.3 - i * 0.4, 0.6, 0); a.scale.setScalar(0.5 + i * 0.2); a.rotation.x = t * 20 + i; }); if (Math.random() < 0.7) particula(p.x + (Math.random() - 0.5) * 0.8, p.y + (Math.random() - 0.5) * 0.8, { z: 0.1, vz: 0.8, g: 6, vida: 0.4, cor: "#c7d0c2", tam: 0.1 }); };
    });
    sacudir(0.2, 0.1);
  },
  garouga(f, agora) { INVESTIDA_N.gatsuuga(f, agora, true); },
};
const REFORCO_N = {
  clones(f, agora) {
    fumacaN(f.x, 0.4, f.y, "#f4f4f0", 1.0, 0.7, agora, 9); fumacaN(f.x + 0.9, 0.4, f.y + 0.5, "#e8e8e2", 0.8, 0.7, agora, 6); fumacaN(f.x - 0.9, 0.4, f.y - 0.5, "#e8e8e2", 0.8, 0.7, agora, 6);
    anelNoChao(f.x, f.y, "#ffffff", 0.3, 1.3, 0.4, agora); espalhar(f.x, f.y, 12, ["#ffffff", "#e8e8e2"], { vel: 2, sobe: 1, vida: 0.5, tam: 0.12, atrito: 2 });
  },
  sharingan(f, agora) {
    acompanha(f, 0.9, agora, ({ g }) => {
      const aro = new THREE.Group(); aro.position.y = 1.9; g.add(aro);
      for (let i = 0; i < 3; i++) { const t = pecaN(G3.geo.esfera, "#d01818", { somar: true, escala: 0.11 }); const a = (i / 3) * 6.28; t.position.set(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38); aro.add(t); }
      const anel = pecaN(G3.geo.toro, "#ff3030", { somar: true, opacidade: 0.9 }); anel.rotation.x = Math.PI / 2; anel.scale.setScalar(0.5); aro.add(anel); aro.add(brilhoG3("#ff3030", 1.4, 0.8));
      const aura = pecaN(G3.geo.cupula, "#a01010", { opacidade: 0.25, dupla: true }); aura.scale.set(0.9, 1.4, 0.9); g.add(aura);
      return (k, t) => { aro.rotation.y = t * 5; aro.scale.setScalar(Math.min(1, k * 8) * (1 - Math.max(0, k - 0.8) * 5)); aura.material.opacity = 0.25 * (1 - k); };
    });
    anelNoChao(f.x, f.y, "#ff3030", 0.3, 1.2, 0.5, agora);
  },
  byakugan(f, agora) {
    acompanha(f, 0.9, agora, ({ g }) => {
      const veias = [0, 1].map(() => { const a = pecaN(G3.geo.toro, "#e8f6ff", { somar: true, opacidade: 0.9 }); a.rotation.x = Math.PI / 2; g.add(a); return a; });
      const brilho = brilhoG3("#dff4ff", 1.8, 0.9); brilho.position.y = 1.7; g.add(brilho);
      const veiasRetas = Array.from({ length: 8 }, (_, i) => { const m = pecaN(G3.geo.cubo, "#bfe8ff", { somar: true, opacidade: 0.9 }); m.scale.set(0.02, 0.28, 0.02); g.add(m); return m; });
      return (k, t) => { veias.forEach((a, i) => { a.position.y = 1.7; a.scale.setScalar(0.25 + ((t * 2 + i / 2) % 1) * 0.5); a.material.opacity = 0.9 * (1 - ((t * 2 + i / 2) % 1)); }); veiasRetas.forEach((m, i) => { const a = (i / 8) * 6.28; m.position.set(Math.cos(a) * 0.32, 1.7, Math.sin(a) * 0.32); m.rotation.set(0, -a, Math.PI / 2 - 0.3); m.material.opacity = 0.9 * (1 - k); }); brilho.material.opacity = 0.9 * (1 - k * k); };
    });
    anelNoChao(f.x, f.y, "#cfeaff", 0.3, 1.3, 0.5, agora);
  },
  portoes(f, agora) {
    acompanha(f, 1.0, agora, ({ g }) => {
      const chamas = chamasN(g, ["#7aff9a", "#c8ffd8", "#2fd060"], 22, 0.55, 2.4), aura = pecaN(G3.geo.cupula, "#40ff80", { opacidade: 0.22, somar: true, dupla: true }); aura.scale.set(0.9, 1.9, 0.9); g.add(aura);
      const aneis = [0, 1, 2].map((i) => { const a = pecaN(G3.geo.toro, "#9fffc0", { somar: true, opacidade: 0.85 }); a.rotation.x = Math.PI / 2; g.add(a); return a; });
      return (k, t) => { chamas(Math.min(0.3, k), t, 1 - Math.max(0, k - 0.7) * 3); aneis.forEach((a, i) => { const c = (t * 1.6 + i / 3) % 1; a.position.y = c * 2.2; a.scale.setScalar(0.55 * (1 - c * 0.3)); a.material.opacity = 0.85 * (1 - c); }); aura.material.opacity = 0.22 * (1 - k); };
    });
    pedirLuz("#40ff80", 6, f.x, f.y, 1, 900, agora); anelNoChao(f.x, f.y, "#7aff9a", 0.3, 1.4, 0.6, agora); sacudir(0.2, 0.1);
  },
  parede(f, agora) {
    const g = naFrente(f, 1.2, 0), muro = pecaN(G3.geo.cubo, "#8a6a44", { toon: true }), topo = pecaN(G3.geo.cubo, "#a88458", { toon: true });
    muro.scale.set(0.5, 1, 2.2); topo.scale.set(0.55, 0.15, 2.3); g.add(muro, topo);
    vivo(g, 1.1, (k) => { const h = 1.7 * Math.min(1, k * 6) * (1 - Math.max(0, k - 0.8) * 5); muro.scale.y = Math.max(0.01, h); muro.position.y = h / 2; topo.position.y = h; topo.visible = h > 0.1; }, agora);
    anelNoChao(f.x + f.mira.x * 1.2, f.y + f.mira.y * 1.2, "#a88458", 0.3, 1.5, 0.4, agora); espalhar(f.x + f.mira.x * 1.2, f.y + f.mira.y * 1.2, 14, [NC.terra[1], NC.terra[2], "#e9dcbb"], { vel: 2, sobe: 2.2, vida: 0.6, tam: 0.13, raio: 0.9 }); sacudir(0.3, 0.1);
  },
  kaiten(f, agora) {
    acompanha(f, 0.9, agora, ({ g }) => {
      const domo = pecaN(G3.geo.cupula, NC.azul[2], { opacidade: 0.5, dupla: true, somar: true }), domo2 = pecaN(G3.geo.cupula, NC.azul[0], { opacidade: 0.35, dupla: true, somar: true });
      domo.scale.set(1.3, 1.6, 1.3); domo2.scale.set(1.1, 1.4, 1.1); g.add(domo, domo2);
      const espirais = Array.from({ length: 6 }, (_, i) => { const m = pecaN(G3.geo.vento, NC.azul[1], { opacidade: 0.9, somar: true, dupla: true }); m.scale.set(0.9, 0.9, 0.3); m.rotation.x = Math.PI / 2; g.add(m); return m; });
      return (k, t) => { const op = 1 - Math.max(0, k - 0.75) * 4; domo.rotation.y = t * 14; domo2.rotation.y = -t * 9; domo.material.opacity = 0.5 * op; domo2.material.opacity = 0.35 * op; espirais.forEach((m, i) => { m.position.y = 0.2 + i * 0.28; m.rotation.z = t * 12 + i * 1.1; m.material.opacity = 0.9 * op; }); };
    });
    anelNoChao(f.x, f.y, NC.azul[1], 0.3, 1.8, 0.5, agora); pedirLuz(NC.azul[2], 6, f.x, f.y, 1, 800, agora);
  },
  escudoareia(f, agora) {
    acompanha(f, 1.0, agora, ({ g }) => {
      const domo = pecaN(G3.geo.cupula, NC.areia[1], { opacidade: 0.65, dupla: true }); domo.scale.set(1.25, 1.7, 1.25); g.add(domo);
      const graos = Array.from({ length: 14 }, (_, i) => { const m = pecaN(G3.geo.cubo, NC.areia[2]); m.scale.setScalar(0.07); g.add(m); return m; });
      return (k, t) => { const op = 1 - Math.max(0, k - 0.75) * 4; domo.scale.y = 1.7 * Math.min(1, k * 8); domo.material.opacity = 0.65 * op; graos.forEach((m, i) => { const a = t * 3 + i * 0.5; m.position.set(Math.cos(a) * 1.2, 0.3 + ((t * 1.3 + i * 0.13) % 1) * 1.3, Math.sin(a) * 1.2); }); };
    });
    anelNoChao(f.x, f.y, NC.areia[2], 0.3, 1.6, 0.5, agora); espalhar(f.x, f.y, 12, NC.areia, { vel: 1.6, sobe: 2, vida: 0.6, tam: 0.09 });
  },
  estrategia(f, agora) {
    acompanha(f, 0.9, agora, ({ g }) => {
      const ideia = pecaN(G3.geo.esfera, "#ffe14d", { somar: true, opacidade: 0.95, escala: 0.2 }), base = pecaN(G3.geo.cubo, "#ffffff", { opacidade: 0.9 }); base.scale.set(0.12, 0.1, 0.12); ideia.position.y = 2.3; base.position.y = 2.1;
      const raios = Array.from({ length: 8 }, (_, i) => { const m = pecaN(G3.geo.cubo, "#ffe14d", { somar: true, opacidade: 0.9 }); m.scale.set(0.02, 0.18, 0.02); g.add(m); return m; });
      g.add(ideia, base, brilhoG3("#ffe14d", 1.1, 0.8).translateY(2.3));
      return (k, t) => { const e = Math.min(1, k * 6); ideia.scale.setScalar(0.2 * e * (1 + Math.sin(t * 14) * 0.1)); raios.forEach((m, i) => { const a = (i / 8) * 6.28; m.position.set(Math.cos(a) * 0.38, 2.3 + Math.sin(a) * 0.38, 0); m.rotation.z = a + Math.PI / 2; m.material.opacity = 0.9 * (1 - k); }); };
    });
    anelNoChao(f.x, f.y, "#c8b0ff", 0.3, 1.2, 0.5, agora);
  },
  pergaminho(f, agora) {
    acompanha(f, 0.9, agora, ({ g }) => {
      const rolo = pecaN(G3.geo.fino, "#f4ecd0", { toon: true }), fita = pecaN(G3.geo.cubo, "#ffffff", { opacidade: 0.85, somar: true });
      rolo.scale.set(0.09, 0.8, 0.09); rolo.rotation.z = Math.PI / 2; fita.scale.set(1.6, 0.02, 0.2); g.add(rolo, fita);
      const sinais = Array.from({ length: 10 }, (_, i) => { const m = pecaN(G3.geo.cubo, "#2a2a30", { opacidade: 0.9 }); m.scale.set(0.05, 0.12, 0.02); g.add(m); return m; });
      return (k, t) => { const a = t * 6; rolo.position.set(Math.cos(a) * 0.8, 1.0 + Math.sin(t * 3) * 0.2, Math.sin(a) * 0.8); fita.position.copy(rolo.position); fita.rotation.y = -a + Math.PI / 2; fita.scale.x = 0.6 + Math.sin(k * Math.PI) * 1.4; sinais.forEach((m, i) => { const aa = a - 0.15 * (i + 1); m.position.set(Math.cos(aa) * 0.8, 1.0 + Math.sin((t - i * 0.02) * 3) * 0.2, Math.sin(aa) * 0.8); m.rotation.y = -aa; m.material.opacity = 0.9 * (1 - i / 10) * (1 - k); }); };
    });
    anelNoChao(f.x, f.y, "#f4ecd0", 0.3, 1.2, 0.5, agora);
  },
  cura(f, agora) {
    acompanha(f, 1.0, agora, ({ g }) => {
      const maos = [-1, 1].map((s) => { const m = pecaN(G3.geo.esfera, "#7be0a0", { somar: true, opacidade: 0.9, escala: 0.2 }); m.position.set(0.5, 0.85, s * 0.35); g.add(m); g.add(brilhoG3("#7be0a0", 1.1, 0.8).translateX(0.5).translateY(0.85).translateZ(s * 0.35)); return m; });
      const aneis = [0, 1].map(() => { const a = pecaN(G3.geo.toro, "#b8ffd0", { somar: true, opacidade: 0.9 }); a.rotation.x = Math.PI / 2; g.add(a); return a; });
      const cruzes = Array.from({ length: 6 }, () => { const c = new THREE.Group(), a = pecaN(G3.geo.cubo, "#d8ffe0", { somar: true }), b = pecaN(G3.geo.cubo, "#d8ffe0", { somar: true }); a.scale.set(0.2, 0.06, 0.06); b.scale.set(0.06, 0.2, 0.06); c.add(a, b); g.add(c); return c; });
      return (k, t) => { maos.forEach((m) => m.scale.setScalar(0.2 * (1 + Math.sin(t * 22) * 0.2))); aneis.forEach((a, i) => { const c = (t * 1.3 + i / 2) % 1; a.position.y = c * 2.0; a.scale.setScalar(0.6 * (1 - c * 0.2)); a.material.opacity = 0.9 * (1 - c); }); cruzes.forEach((c, i) => { const u = (t * 1.1 + i / 6) % 1, a = i * 1.7; c.position.set(Math.cos(a) * 0.5, 0.3 + u * 1.9, Math.sin(a) * 0.5); c.rotation.y = a; c.visible = k < 0.9; c.children.forEach((m) => { m.material.opacity = 1 - u; }); }); };
    });
    pedirLuz("#7be0a0", 5, f.x, f.y, 1, 800, agora); anelNoChao(f.x, f.y, "#7be0a0", 0.3, 1.3, 0.6, agora);
  },
  muda(f, agora) {
    fumacaN(f.x, 0.7, f.y, "#e8dcff", 1.1, 0.8, agora, 8); anelNoChao(f.x, f.y, NC.roxo[1], 0.3, 1.4, 0.5, agora);
    espalhar(f.x, f.y, 14, ["#e8dcff", NC.roxo[1], "#c8ffd0"], { vel: 1.6, sobe: 2.4, g: -1, vida: 0.8, tam: 0.1, z: 0.4 });
    anelSubindo(f.x, f.y, "#c8ffd0", agora);
  },
  uivo(f, agora) {
    acompanha(f, 0.8, agora, ({ g }) => {
      const ondas = [0, 1, 2].map(() => { const a = pecaN(G3.geo.toro, "#ffffff", { somar: true, opacidade: 0.8 }); a.rotation.y = Math.PI / 2; g.add(a); return a; });
      return (k, t) => ondas.forEach((a, i) => { const c = (t * 2.2 + i / 3) % 1; a.position.set(0.5 + c * 1.2, 1.0, 0); a.scale.setScalar(0.3 + c * 0.9); a.material.opacity = 0.8 * (1 - c) * (1 - k); });
    });
    anelNoChao(f.x, f.y, "#ffffff", 0.3, 1.5, 0.5, agora); sacudir(0.2, 0.1);
  },
  muralhainsetos(f, agora) {
    acompanha(f, 1.0, agora, ({ g }) => {
      const bichos = Array.from({ length: 30 }, (_, i) => { const m = pecaN(G3.geo.cubo, i % 3 ? "#1c1c18" : "#3a3a2a"); m.scale.setScalar(0.09); g.add(m); return m; });
      return (k, t) => bichos.forEach((m, i) => { const a = t * (5 + (i % 4)) + i * 0.9; m.position.set(Math.cos(a) * 1.0, 0.2 + (i / 30) * 1.7 + Math.sin(t * 6 + i) * 0.1, Math.sin(a) * 1.0); m.visible = k < 0.9; });
    });
    anelNoChao(f.x, f.y, "#3a3a2a", 0.3, 1.3, 0.5, agora);
  },
};
// o `golpe` do ninja que não faz dano na hora: investida (avança com o jutsu) ou reforço (cura, aura, defesa...)
function efeitoNaruto(f, agora) {
  const fx = fxDe(f);
  const fn = f.classe === "investida" ? INVESTIDA_N[fx] : REFORCO_N[fx];
  if (!fn) return false;
  fn(f, agora); return true;
}

// ---------- o estouro de quando o projétil acerta ----------
const IMPACTO_N = {
  katon: ["fogo", NC.fogo], oleo: ["fogo", NC.fogo], shurikenfogo: ["fogo", NC.fogo], tubarao: ["agua", NC.agua], maoareia: ["areia", NC.areia],
  cobras: ["fumaca", NC.roxo], mente: ["flash", NC.rosa], ventolamina: ["vento", NC.vento], dragaovento: ["vento", NC.vento], tigre: ["forte", ["#fff8d8", "#ffd870", "#ff9a4a", "#c05a1a"]],
  corvos: ["penas", ["#14101c", "#2a2038", "#4a3a60", "#08040c"]], tinta: ["tinta", ["#0c0a10", "#1a1620", "#2a2630", "#ffffff"]], insetos: ["penas", ["#1c1c18", "#3a3a2a", "#2a2a20", "#101010"]],
  argila: ["explosao", ["#ffffff", "#ffd890", "#ff9a4a", "#6a5a58"]], dragaoargila: ["explosaoG", ["#ffffff", "#ffd890", "#ff9a4a", "#6a5a58"]], sombra: ["fumaca", NC.sombra],
  agulhas: ["faisca", ["#ffffff", "#dff8d8", "#a8e8a0", "#6a8a60"]], shuriken: ["faisca", ["#ffffff", "#e8eefc", NC.aco, "#8a90a0"]], chuvarmas: ["faisca", ["#ffffff", "#e8eefc", NC.aco, "#8a90a0"]],
  marionete: ["faisca", ["#ffe0b0", "#c89a5a", "#8a6a3a", "#5a3a24"]], ninken: ["fumaca", [ "#ffffff", "#e8e4dc", "#c7d0c2", "#a89878"]], passaro: ["tinta", ["#0c0a10", "#1a1620", "#2a2630", "#ffffff"]],
};
function impactoNaruto(f, agora) {
  const mv = dexAtual().MOVES[f.golpe];
  if (mv?.forma === "area") return true; // o golpe de área já tem o estouro dele (areaNaruto)
  const info = IMPACTO_N[mv?.fx];
  if (!info) return false;
  const [jeito, P] = info, forca = f.forca || 1, g = gp(); g.position.set(f.x, 0.45, f.y);
  const flash = pecaN(G3.geo.esfera, P[0], { somar: true, opacidade: 1, escala: 0.25 * forca }), halo = brilhoG3(P[1], 2.2 * forca, 0.85); g.add(flash, halo);
  const grande = jeito === "explosaoG" || jeito === "forte", e = (jeito === "explosao" || grande) ? (grande ? 2 : 1.3) : 1;
  vivo(g, 0.34 * e, (k) => { flash.scale.setScalar((0.25 + k * (jeito === "faisca" ? 0.4 : 1.2)) * forca * e); flash.material.opacity = Math.max(0, 1 - k * 2.2); halo.material.opacity = 0.85 * (1 - k); }, agora);
  const n = { fogo: 16, agua: 18, areia: 16, fumaca: 12, flash: 10, vento: 14, forte: 26, penas: 14, tinta: 16, explosao: 22, explosaoG: 34, faisca: 10 }[jeito] || 10;
  const o = { fogo: { vel: 2, sobe: 2.5, g: -1.5, vida: 0.55 }, agua: { vel: 2.2, sobe: 4.5, g: 12, vida: 0.5, quica: 0 }, areia: { vel: 2.4, sobe: 3, g: 9, vida: 0.6 }, fumaca: { vel: 1.2, sobe: 1.6, g: -1, vida: 0.7, atrito: 2 }, flash: { vel: 2, sobe: 1.4, g: -1, vida: 0.4 }, vento: { vel: 3, sobe: 0.8, g: 0, vida: 0.5, atrito: 2.5 }, forte: { vel: 4, sobe: 3, g: 4, vida: 0.7 }, penas: { vel: 1.6, sobe: 1.6, g: 3, vida: 0.8, atrito: 2 }, tinta: { vel: 2, sobe: 2.4, g: 10, vida: 0.5, quica: 0 }, explosao: { vel: 3.4, sobe: 3.4, g: 7, vida: 0.7 }, explosaoG: { vel: 4.6, sobe: 4.4, g: 7, vida: 0.9 }, faisca: { vel: 3.6, sobe: 1.4, g: 6, vida: 0.25 } }[jeito];
  espalhar(f.x, f.y, n, P, { ...o, tam: jeito === "faisca" ? 0.05 : 0.12, z: 0.4 });
  anelNoChao(f.x, f.y, P[2], 0.3 * forca, (jeito === "explosaoG" ? 2.2 : jeito === "faisca" ? 0.7 : 1.2) * forca, 0.35 * e, agora);
  if (jeito === "explosao" || jeito === "explosaoG" || jeito === "forte") { sacudir(0.5 * e, 0.3); pedirLuz(P[1], 10 * e, f.x, f.y, 0.8, 300, agora); }
  else if (jeito !== "faisca") pedirLuz(P[1], 6, f.x, f.y, 0.8, 250, agora);
  return true;
}
