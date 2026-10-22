// Corrida da Galera — os modelos 3D da caixa de item e dos poderes (banana, casco verde, casco vermelho, cogumelo,
// estrela e bomba, e os do Mario Kart só da corrida: casco azul, raio, cogumelo triplo, lula e bala), feitos de formas
// do Three.js, em metros (quem usa escala). Também desenha o ícone de cada poder para o botão do item (uma foto do
// modelo, tirada uma vez só).
import * as THREE from "three";

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...o });
const sombra = (m) => { m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return m; };
function texto(txt, cor = "#fff", tam = 128) {
  const c = document.createElement("canvas"); c.width = c.height = tam; const x = c.getContext("2d");
  x.font = `900 ${tam * 0.78}px Figtree, Arial Black, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = tam * 0.09; x.strokeStyle = "#1b1440"; x.strokeText(txt, tam / 2, tam * 0.54); x.fillStyle = cor; x.fillText(txt, tam / 2, tam * 0.54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- a caixa: cubo de vidro furta-cor, arestas acesas e um "?" girando por dentro ----------
const interrogacao = texto("?");
export function caixaItem() {
  const g = new THREE.Group();
  const vidro = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff66cc, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), vidro); g.add(cubo);
  const aresta = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
  g.add(aresta);
  // brilho nos cantos: bolinhas claras
  const canto = new THREE.SphereGeometry(0.06, 8, 6), cMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) { const s = new THREE.Mesh(canto, cMat); s.position.set(x, y, z); g.add(s); }
  const miolo = new THREE.Group(); g.add(miolo);
  const pMat = new THREE.MeshBasicMaterial({ map: interrogacao, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  for (const r of [0, Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), pMat); p.rotation.y = r; miolo.add(p); }
  g.userData = { vidro, aresta, miolo };
  return g;
}
// a cada quadro: gira, balança e troca a cor do vidro (todas juntas, como num arco-íris)
export function animarCaixa(g, t, i) {
  const u = g.userData;
  g.rotation.y = t * 1.4 + i; g.rotation.x = Math.sin(t * 1.1 + i) * 0.18; g.rotation.z = Math.cos(t * 0.9 + i) * 0.12;
  u.miolo.rotation.y = -t * 3.2;
  u.vidro.emissive.setHSL((t * 0.12 + i * 0.07) % 1, 0.9, 0.55);
  u.aresta.material.color.setHSL((t * 0.12 + i * 0.07 + 0.5) % 1, 0.6, 0.85);
}

// ---------- os poderes ----------
// a banana: curva, mais grossa no meio, com as pontas marrons, deitada de lado no asfalto
const curvaBanana = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.55, 0.42], [-0.3, 0.16], [0, 0.08], [0.3, 0.16], [0.55, 0.42]].map(([x, y]) => new THREE.Vector3(x, y, 0))), 24, 0.15, 10, false);
{ const p = curvaBanana.attributes.position, v = new THREE.Vector3(); // afina nas pontas
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = Math.min(1, 0.35 + (1 - Math.abs(v.x) / 0.6) * 1.1), cy = 0.08 + 0.34 * (v.x / 0.55) ** 2; p.setY(i, cy + (v.y - cy) * k); p.setZ(i, v.z * k); } curvaBanana.computeVertexNormals(); }
function banana() {
  const g = new THREE.Group(), fruta = new THREE.Mesh(curvaBanana, M(0xffd83a, { roughness: 0.45 })); fruta.position.y = 0.1; g.add(fruta);
  for (const s of [-1, 1]) { const ponta = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.14, 6), M(0x5a3a1a)); ponta.position.set(s * 0.6, 0.56, 0); ponta.rotation.z = -s * 0.7; g.add(ponta); }
  return g;
}
function casco(cor) {
  const g = new THREE.Group(), cMat = M(cor, { roughness: 0.25, metalness: 0.05 });
  const topo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), cMat); topo.position.y = 0.2; g.add(topo);
  // as placas brancas do casco
  const placa = M(0xffffff, { roughness: 0.4 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, s = new THREE.Mesh(new THREE.CircleGeometry(0.15, 6), placa); s.position.set(Math.cos(a) * 0.34, 0.6, Math.sin(a) * 0.34); s.lookAt(Math.cos(a) * 2, 2.1, Math.sin(a) * 2); g.add(s); }
  const cima = new THREE.Mesh(new THREE.CircleGeometry(0.14, 6), placa); cima.rotation.x = -Math.PI / 2; cima.position.y = 0.755; g.add(cima);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 22), M(0xffffff)); aro.rotation.x = Math.PI / 2; aro.position.y = 0.2; g.add(aro);
  const fundo = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.22, 18), M(0xfff0c0)); fundo.position.y = 0.09; g.add(fundo);
  g.userData.gira = true; return g;
}
function cogumelo() {
  const g = new THREE.Group();
  const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.5, 14), M(0xfff1d6)); pe.position.y = 0.25; g.add(pe);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 3, 6), M(0x1b1b1b)); o.position.set(s * 0.1, 0.32, 0.29); g.add(o); }
  const chapeu = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0xe8322f, { roughness: 0.35 })); chapeu.position.y = 0.42; chapeu.scale.y = 0.85; g.add(chapeu);
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.08, 20), M(0xfff1d6)); borda.position.y = 0.47; g.add(borda);
  for (const [a, e, r] of [[0, 0.5, 0.16], [2.1, 0.55, 0.14], [4.2, 0.5, 0.15], [1, 1.2, 0.12], [3.3, 1.15, 0.13], [5.3, 1.2, 0.1]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 14), M(0xffffff)); const y = Math.cos(e) * 0.55 * 0.85, h = Math.sin(e) * 0.56;
    p.position.set(Math.cos(a) * h, 0.42 + y, Math.sin(a) * h); p.lookAt(Math.cos(a) * h * 3, 0.42 + y * 3, Math.sin(a) * h * 3); g.add(p);
  }
  return g;
}
const formaEstrela = (() => {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.24 : 0.56; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }); g.center(); return g;
})();
function estrela() {
  const g = new THREE.Group(), e = new THREE.Mesh(formaEstrela, M(0xffd81f, { emissive: 0xffa000, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.3 }));
  e.position.y = 0.6; g.add(e);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 3, 6), M(0x1b1b1b)); o.position.set(s * 0.08, 0.64, 0.18); g.add(o); }
  g.userData.estrela = e; return g;
}
function bomba() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), M(0x1d1d24, { roughness: 0.3, metalness: 0.35 })); b.position.y = 0.6; g.add(b);
  const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 12), M(0x9aa0a8, { metalness: 0.6 })); tampa.position.y = 1.18; g.add(tampa);
  const pavio = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), M(0xd9c79a)); pavio.position.set(0.05, 1.36, 0); pavio.rotation.z = -0.4; g.add(pavio);
  const faisca = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd84a })); faisca.position.set(0.11, 1.48, 0); g.add(faisca);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M(0xffffff)); o.position.set(s * 0.17, 0.72, 0.48); g.add(o); }
  // a chave de dar corda, atrás
  const chave = new THREE.Group(); chave.position.set(0, 0.6, -0.6); g.add(chave);
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), M(0xc9ccd2, { metalness: 0.6 })); eixo.rotation.x = Math.PI / 2; chave.add(eixo);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12), M(0xc9ccd2, { metalness: 0.6 })); a.position.set(s * 0.12, 0, -0.1); a.rotation.y = Math.PI / 2; chave.add(a); }
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(0xf2b01e)); p.scale.set(1, 0.6, 1.4); p.position.set(s * 0.26, 0.12, 0.1); g.add(p); }
  g.userData = { faisca, chave, corpo: b };
  return g;
}
// o casco azul: o casco com espinhos brancos por cima e as asas abertas (voa até o líder)
function azul() {
  const g = casco(0x2a5cff), branco = M(0xffffff, { roughness: 0.35 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, e = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), branco); e.position.set(Math.cos(a) * 0.28, 0.72, Math.sin(a) * 0.28); e.lookAt(Math.cos(a) * 3, 3.5, Math.sin(a) * 3); e.rotateX(Math.PI / 2); g.add(e); }
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 8), branco); pico.position.y = 0.88; g.add(pico);
  const asas = [];
  for (const s of [-1, 1]) {
    const asa = new THREE.Group(); asa.position.set(s * 0.5, 0.45, 0); g.add(asa);
    const pena = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), M(0xffffff, { side: THREE.DoubleSide, roughness: 0.5 })); pena.scale.set(1, 0.5, 1); pena.position.x = s * 0.38; pena.rotation.x = -Math.PI / 2; asa.add(pena);
    asas.push({ asa, s });
  }
  g.userData.asas = asas; g.userData.gira = false; return g;
}
// o raio: o zigue-zague amarelo, aceso
const formaRaio = (() => {
  const s = new THREE.Shape(); [[0.12, 0.62], [-0.28, 0.02], [-0.02, 0.02], [-0.16, -0.62], [0.3, 0.1], [0.04, 0.1], [0.22, 0.62]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }); g.center(); return g;
})();
function raio() {
  const g = new THREE.Group(), r = new THREE.Mesh(formaRaio, M(0xffe23a, { emissive: 0xffb300, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.2 }));
  r.position.y = 0.66; g.add(r); g.userData.raio = r; return g;
}
// três cogumelos juntinhos (um turbo de cada vez)
function triplo() {
  const g = new THREE.Group();
  for (const [x, z, s] of [[-0.36, 0.12, 0.62], [0.36, 0.12, 0.62], [0, -0.22, 0.72]]) { const c = cogumelo(); c.scale.setScalar(s); c.position.set(x, 0, z); g.add(c); }
  return g;
}
// a lula: corpo branco comprido com a cabeça em ponta, os olhos e os tentáculos
function lula() {
  const g = new THREE.Group(), branco = M(0xfafafa, { roughness: 0.4 });
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 6, 14), branco); corpo.position.y = 0.72; g.add(corpo);
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.36, 14), branco); ponta.position.y = 1.2; g.add(ponta);
  for (const s of [-1, 1]) {
    const olho = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), M(0x111111)); olho.position.set(s * 0.1, 0.82, 0.23); g.add(olho);
    const brilho = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), M(0xffffff)); brilho.position.set(s * 0.1 + 0.02, 0.85, 0.3); g.add(brilho);
  }
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), M(0xe8507a)); boca.position.set(0, 0.68, 0.25); g.add(boca);
  const tents = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, t = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 4, 8), branco); t.position.set(Math.cos(a) * 0.16, 0.28, Math.sin(a) * 0.16); g.add(t); tents.push({ t, a }); }
  g.userData.tents = tents; return g;
}
// a bala: corpo preto com a ponta redonda, os olhos bravos, os bracinhos e a cinta de trás (a ponta aponta para -z)
function bala() {
  const g = new THREE.Group(), preto = M(0x1b1c22, { roughness: 0.3, metalness: 0.4 });
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 20), preto); corpo.rotation.x = Math.PI / 2; corpo.position.y = 0.48; g.add(corpo);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), preto); nariz.rotation.x = -Math.PI / 2; nariz.position.set(0, 0.48, -0.45); g.add(nariz);
  const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 20), M(0x3a3d46, { metalness: 0.7, roughness: 0.35 })); cinta.rotation.x = Math.PI / 2; cinta.position.set(0, 0.48, 0.42); g.add(cinta);
  const fundo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 20), M(0x0e0f13, { roughness: 0.6 })); fundo.rotation.x = Math.PI / 2; fundo.position.set(0, 0.48, 0.54); g.add(fundo);
  for (const s of [-1, 1]) {
    const olho = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), M(0xffffff)); olho.scale.set(0.7, 1.15, 1); olho.position.set(s * 0.3, 0.76, -0.28); g.add(olho);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), M(0x111111)); pupila.position.set(s * 0.36, 0.77, -0.36); g.add(pupila);
    const sobrancelha = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.24), M(0xffffff)); sobrancelha.position.set(s * 0.33, 0.93, -0.27); sobrancelha.rotation.x = -0.45; g.add(sobrancelha);
    const braco = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M(0xffffff)); braco.scale.set(0.8, 0.6, 1.2); braco.position.set(s * 0.48, 0.38, -0.05); g.add(braco);
  }
  return g;
}
const FAZ = { banana, verde: () => casco(0x2ecc40), vermelho: () => casco(0xe53935), cogumelo, estrela, bomba, azul, raio, triplo, lula, bala };
export function modeloItem(tipo) { return sombra((FAZ[tipo] || bomba)()); }
// gira o casco, pisca a bomba, faz a estrela brilhar
export function animarItem(g, t, perto = 0) {
  const u = g.userData;
  if (u.gira) g.rotation.y = t * 9;
  if (u.estrela) { u.estrela.rotation.y = t * 2.5; u.estrela.position.y = 0.6 + Math.sin(t * 4) * 0.08; }
  if (u.asas) { g.rotation.y = t * 4; for (const { asa, s } of u.asas) asa.rotation.z = s * Math.sin(t * 18) * 0.5; } // o azul bate as asas
  if (u.raio) { u.raio.rotation.y = t * 3; u.raio.material.emissiveIntensity = 0.6 + Math.random() * 0.6; }
  if (u.tents) for (const { t: tt, a } of u.tents) tt.rotation.set(Math.sin(t * 6 + a) * 0.3, 0, Math.cos(t * 6 + a) * 0.3);
  if (u.faisca) {
    u.faisca.scale.setScalar(0.7 + Math.random() * 0.8); u.chave.rotation.z = t * 6;
    u.corpo.material.emissive.setRGB(perto * (0.5 + 0.5 * Math.sin(t * 30)), 0, 0); // pisca vermelho antes de estourar
  }
}

// ---------- ícone de cada poder (para o botão do item) ----------
let fotoR = null, fotoCena, fotoCam;
const ICONES = new Map();
export function iconeItem(tipo) {
  if (ICONES.has(tipo)) return ICONES.get(tipo);
  if (!fotoR) {
    fotoR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); fotoR.setSize(128, 128, false); fotoR.toneMapping = THREE.ACESFilmicToneMapping;
    fotoCena = new THREE.Scene(); fotoCena.add(new THREE.HemisphereLight(0xffffff, 0x554466, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(2, 4, 3); fotoCena.add(d);
    fotoCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  }
  const m = tipo === "caixa" ? caixaItem() : modeloItem(tipo); fotoCena.add(m);
  if (tipo === "caixa") { m.position.y = 0.6; m.rotation.set(0.35, 0.6, 0); m.userData.vidro.emissive.setHSL(0.83, 0.9, 0.55); }
  else m.rotation.y = tipo === "bomba" ? 0.5 : tipo === "bala" ? Math.PI + 0.75 : -0.5; // a bala com a cara para a foto
  const caixa = new THREE.Box3().setFromObject(m), c = caixa.getCenter(new THREE.Vector3()), r = caixa.getSize(new THREE.Vector3()).length() / 2;
  fotoCam.position.set(c.x, c.y + r * 0.9, c.z + r * 3.4); fotoCam.lookAt(c);
  fotoR.render(fotoCena, fotoCam);
  const url = fotoR.domElement.toDataURL(); ICONES.set(tipo, url);
  fotoCena.remove(m);
  return url;
}
