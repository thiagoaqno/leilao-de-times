// Corrida da Galera — os modelos 3D da caixa de item e dos seis poderes (banana, casco verde, casco vermelho,
// cogumelo, estrela e bomba), feitos de formas do Three.js, em metros (quem usa escala). Também desenha o ícone de
// cada poder para o botão do item (uma foto do modelo, tirada uma vez só).
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
const FAZ = { banana, verde: () => casco(0x2ecc40), vermelho: () => casco(0xe53935), cogumelo, estrela, bomba };
export function modeloItem(tipo) { return sombra((FAZ[tipo] || bomba)()); }
// gira o casco, pisca a bomba, faz a estrela brilhar
export function animarItem(g, t, perto = 0) {
  const u = g.userData;
  if (u.gira) g.rotation.y = t * 9;
  if (u.estrela) { u.estrela.rotation.y = t * 2.5; u.estrela.position.y = 0.6 + Math.sin(t * 4) * 0.08; }
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
  else m.rotation.y = tipo === "bomba" ? 0.5 : -0.5;
  const caixa = new THREE.Box3().setFromObject(m), c = caixa.getCenter(new THREE.Vector3()), r = caixa.getSize(new THREE.Vector3()).length() / 2;
  fotoCam.position.set(c.x, c.y + r * 0.9, c.z + r * 3.4); fotoCam.lookAt(c);
  fotoR.render(fotoCena, fotoCam);
  const url = fotoR.domElement.toDataURL(); ICONES.set(tipo, url);
  fotoCena.remove(m);
  return url;
}
