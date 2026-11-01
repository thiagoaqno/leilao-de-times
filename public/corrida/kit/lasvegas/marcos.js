// Las Vegas — os marcos da Strip, feitos em código a partir das fotos de referência e das plantas do OpenStreetMap (kit/lasvegas/dados.js):
//   · o Sphere (a esfera de 112 m de LED que acende de noite e passa o olho, o globo, a bola de basquete, o rosto e o banner do GP numa textura animada barata);
//   · o lago do Bellagio com as fontes que dançam (jatos em InstancedMesh, o show maior a cada ~30 s) e as luzes embaixo d'água;
//   · a Torre Eiffel do Paris (com a treliça acesa e o balão), a roda-gigante High Roller do LINQ (que gira, com as 28 cabines), o campanário do Venetian,
//     o vulcão do Mirage (com as labaredas), a colunata e as fontes do Caesars Palace e as letras acesas do Encore e do Wynn.
// Tudo só acende de noite (tr.noite: o laço de kit/bahrein/base.js). Peça só desta pista; nada daqui muda a física (os marcos ficam atrás da barreira).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { D, K, ALT, marco } from "./mundo.js";
import { luzDaNoite, materialDaNoite, soDeNoite } from "../bahrein/base.js";
import { instancias } from "../comum.js";

const tau = Math.PI * 2;
const emis = (cor, bloom = 1.3, o = {}) => { const m = new THREE.MeshBasicMaterial({ color: cor, toneMapped: false, ...o }); m.userData.bloom = bloom; return m; };
// a distância mínima do ponto à linha central e o índice dela (para encolher o que não cabe)
function maisPerto(tr, x, z) { const { pts, n } = tr; let m = 1e18, k = 0; for (let i = 0; i < n; i += 3) { const p = pts[i], d = (p.x - x) ** 2 + (p.y - z) ** 2; if (d < m) { m = d; k = i; } } return { d: Math.sqrt(m), i: k }; }
const vivo = (tr, ...os) => { (tr.vivosLV ||= []).push(...os); }; // o que se mexe: guardado em tr, para o fundir.js não juntar nem congelar
const dentroDe = (tr, x, z, folga) => tr.distAt(x, z) < tr.W / 2 + folga;

// =============================== o Sphere ===============================
const CENAS = [ // cada uma desenha uma "fatia" de 90° (256 x 128): a esfera repete a fatia quatro vezes em volta
  (x, w, h, t) => { // o olho: a esclera clara, a íris azul que olha de lado e a pálpebra que pisca
    const g = x.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w * 0.6); g.addColorStop(0, "#fffdf5"); g.addColorStop(1, "#e9cdb0"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const ox = Math.sin(t * 0.8) * 26; x.fillStyle = "#2f7fd8"; x.beginPath(); x.arc(w / 2 + ox, h / 2, h * 0.4, 0, tau); x.fill(); x.fillStyle = "#7fc4ff"; x.beginPath(); x.arc(w / 2 + ox, h / 2, h * 0.3, 0, tau); x.fill();
    x.fillStyle = "#0a1626"; x.beginPath(); x.arc(w / 2 + ox, h / 2, h * 0.17, 0, tau); x.fill(); x.fillStyle = "#ffffff"; x.beginPath(); x.arc(w / 2 + ox - 11, h / 2 - 11, 6, 0, tau); x.fill();
    const piscar = Math.max(0, 1 - Math.abs(((t * 0.4) % 1) - 0.5) * 18), cai = h * 0.16 + h * 0.4 * piscar; x.fillStyle = "#c98e5c"; x.fillRect(0, 0, w, cai); x.fillRect(0, h - cai, w, cai); x.fillStyle = "#6b3f22"; x.fillRect(0, cai - 3, w, 3); x.fillRect(0, h - cai, w, 3);
  },
  (x, w, h, t) => { // o globo girando
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#07245e"); g.addColorStop(1, "#1d6bd0"); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { x.fillStyle = "#ffffffcc"; x.fillRect((i * 97) % w, (i * 53) % h, 1.5, 1.5); }
    const r = h * 0.5; x.fillStyle = "#1e8ad8"; x.beginPath(); x.arc(w / 2, h / 2, r, 0, tau); x.fill(); x.save(); x.beginPath(); x.arc(w / 2, h / 2, r, 0, tau); x.clip(); x.fillStyle = "#47b865";
    for (let k = 0; k < 7; k++) { const a = t * 0.9 + k * 0.9, px = w / 2 + Math.sin(a) * r * 0.85; if (Math.cos(a) > -0.2) { x.beginPath(); x.ellipse(px, h / 2 + Math.cos(k * 3.1) * r * 0.5, r * 0.3 * Math.max(0.3, Math.cos(a)), r * 0.22, 0, 0, tau); x.fill(); } }
    x.fillStyle = "#ffffff77"; for (let k = 0; k < 4; k++) x.fillRect(w / 2 - r + ((t * 20 + k * 40) % (r * 2)), h * (0.25 + k * 0.15), 28, 5); x.restore();
  },
  (x, w, h, t) => { // a bola de basquete na quadra
    x.fillStyle = "#c98a4b"; x.fillRect(0, 0, w, h); x.strokeStyle = "#ffffffaa"; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = "#f0701c"; x.beginPath(); x.arc(w / 2, h / 2, h * 0.46, 0, tau); x.fill(); x.strokeStyle = "#1a1008"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(w / 2 - h * 0.46, h / 2); x.lineTo(w / 2 + h * 0.46, h / 2); x.moveTo(w / 2, h / 2 - h * 0.46); x.lineTo(w / 2, h / 2 + h * 0.46); x.stroke();
    x.beginPath(); x.arc(w / 2 - h * 0.64, h / 2, h * 0.46, -0.95, 0.95); x.stroke(); x.beginPath(); x.arc(w / 2 + h * 0.64, h / 2, h * 0.46, Math.PI - 0.95, Math.PI + 0.95); x.stroke();
  },
  (x, w, h, t) => { // o banner do GP
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#14001c"); g.addColorStop(1, "#e10600"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.font = "italic 900 40px Arial Black, Arial"; x.textAlign = "center"; x.fillText("F1", w / 2, h * 0.34);
    x.font = "900 24px Arial Black, Arial"; x.fillText("LAS VEGAS", w / 2, h * 0.6); x.fillText("GRAND PRIX", w / 2, h * 0.82); for (let i = 0; i < 16; i++) { x.fillStyle = (i + Math.floor(t * 4)) % 2 ? "#fff" : "#111"; x.fillRect(i * (w / 16), h - 10, w / 16, 10); x.fillRect(i * (w / 16), 0, w / 16, 8); }
  },
  (x, w, h, t) => { // o rosto amarelo de capacete do GP
    x.fillStyle = "#1a5fd0"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffd62e"; x.beginPath(); x.arc(w / 2, h / 2, h * 0.5, 0, tau); x.fill(); x.fillStyle = "#222";
    x.fillRect(w / 2 - 40, h * 0.28, 28, 6); x.fillRect(w / 2 + 12, h * 0.28 + Math.sin(t * 3) * 3, 28, 6); x.beginPath(); x.arc(w / 2 - 25, h * 0.5, 8, 0, tau); x.arc(w / 2 + 25, h * 0.5, 8, 0, tau); x.fill();
    x.lineWidth = 4; x.beginPath(); x.arc(w / 2, h * 0.62, 20, 0.2, Math.PI - 0.2); x.stroke(); x.fillStyle = "#fff"; x.fillRect(0, h * 0.14, w, 12);
  },
  (x, w, h, t) => { // fogos de cor
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#1a0a40"); g.addColorStop(1, "#5a1a7a"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) { const ph = (t * 0.7 + k * 0.27) % 1, cx = ((k * 0.31 + 0.15) % 1) * w, cy = h * (0.3 + 0.4 * ((k * 0.43) % 1)); x.strokeStyle = `hsl(${(k * 80 + t * 40) % 360} 100% 65%)`; x.lineWidth = 4; for (let a = 0; a < 16; a++) { const an = (a / 16) * tau; x.beginPath(); x.moveTo(cx + Math.cos(an) * ph * 16, cy + Math.sin(an) * ph * 16); x.lineTo(cx + Math.cos(an) * (ph * 38 + 6), cy + Math.sin(an) * (ph * 38 + 6)); x.stroke(); } }
  },
];
export function sphere(tr, add, hAt) {
  const m = marco("sphere", 36.12124, -115.1621, [174, 174, 112]);
  const R0 = 78.5 * K, yc0 = 33.5 * K, base0 = Math.sqrt(R0 * R0 - yc0 * yc0);
  const dm = maisPerto(tr, m.cx, m.cz).d, esc = Math.max(0.55, Math.min(1, (dm - tr.W / 2 - 18) / base0)); // a esfera cabe: nunca invade a pista nem a barreira
  const R = R0 * esc, yc = yc0 * esc, thetaMax = Math.acos(-yc / R) + 0.02;
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1); tex.anisotropy = 4;
  const ctx = c.getContext("2d");
  const mat = materialDaNoite(tr, 0x2d3036, 0xffffff, { map: tex }); mat.userData.bloom = 0.95;
  const geo = new THREE.SphereGeometry(R, 64, 40, 0, tau, 0, thetaMax);
  const y0 = hAt(m.cx, m.cz) - 1;
  const mesh = add(new THREE.Mesh(geo, mat)); mesh.position.set(m.cx, y0 + yc, m.cz); mesh.name = "lasvegas-sphere"; mesh.userData.semContato = true;
  // a sombra de luz no chão em volta (o brilho colorido da esfera sobre o asfalto e os prédios), só de noite
  const glowTex = canvasTex(128, 128, (x, w, hh) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(0.5, "rgba(255,255,255,0.16)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, hh); }, false);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x6fa8ff, fog: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.6, R * 3.6), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(m.cx, y0 + 1.2, m.cz); glow.renderOrder = 2; glow.name = "lasvegas-sphere-glow"; glow.userData.semContato = true; soDeNoite(tr, add(glow));
  const COR_CENA = [0xffd9a0, 0x4f90ff, 0xff8a3a, 0xff3a3a, 0xffd23a, 0xc07aff];
  let acc = 1, ultimo = performance.now() / 1000, cena = -1;
  luzDaNoite(tr).quadro.push((noite, foco) => {
    const agora = performance.now() / 1000; acc += agora - ultimo; ultimo = agora;
    if (!noite || !foco || acc < 0.11) return; if (Math.hypot(foco.x - m.cx, foco.y - m.cz) > 3200) return; acc = 0;
    const i = Math.floor(agora / 9) % CENAS.length; ctx.save(); CENAS[i](ctx, 256, 128, agora); ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1; for (let k = 0; k <= 256; k += 4) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 128); ctx.stroke(); } // os módulos de LED
    tex.needsUpdate = true; if (i !== cena) { cena = i; glowMat.color.setHex(COR_CENA[i]); }
  });
  vivo(tr, mesh, glow); tr.sphereLV = { x: m.cx, z: m.cz, R, escala: esc };
  tr.reservado.push([m.cx, m.cz, R * 1.05]);
}

// =============================== o Bellagio: o lago e as fontes ===============================
function eixoDoLago(P) { // o rumo do lado maior do lago
  let melhor = null;
  for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI, ux = Math.cos(a), uz = Math.sin(a); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } const A = (u1 - u0) * (v1 - v0); if (!melhor || A < melhor.A) melhor = { A, a, u0, u1, v0, v1, ux, uz }; }
  if (melhor.v1 - melhor.v0 > melhor.u1 - melhor.u0) { melhor.a += Math.PI / 2; const ux = Math.cos(melhor.a), uz = Math.sin(melhor.a); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } Object.assign(melhor, { u0, u1, v0, v1, ux, uz }); }
  return melhor;
}
export function fontesDoBellagio(tr, add, hAt) {
  const m = marco("bellagio", 36.1131, -115.1765); if (!tr.lagosLV?.length) return;
  let lago = null; for (const l of tr.lagosLV) { const d = Math.hypot(l.cx - m.cx, l.cz - m.cz), A = Math.abs(l.P.reduce((s, p, i) => { const q = l.P[(i + 1) % l.P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2); if (d < 900 && A > 3000 && (!lago || A > lago.A)) lago = { ...l, A }; }
  if (!lago) return;
  const e = eixoDoLago(lago.P), ux = e.ux, uz = e.uz, vx = -uz, vz = ux, linhas = 3, jatos = [];
  const comp = e.u1 - e.u0, larg = e.v1 - e.v0, passo = Math.max(7, comp / 40);
  for (let r = 0; r < linhas; r++) { const v = e.v0 + larg * (0.28 + r * 0.22); for (let u = e.u0 + comp * 0.07; u < e.u1 - comp * 0.07; u += passo) { const x = u * ux + v * vx, z = u * uz + v * vz; if (!lago.P.length || !require_dentro(lago.P, x, z)) continue; jatos.push({ x, z, r, k: jatos.length, fase: u / passo }); } }
  if (!jatos.length) return;
  const geo = new THREE.CylinderGeometry(1.5, 0.6, 1, 8, 1, true); geo.translate(0, 0.5, 0); // (a coluna de água abre em cima e some na ponta)
  const jato = canvasTex(4, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.22)"); g.addColorStop(1, "rgba(255,255,255,0.7)"); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false);
  const mat = new THREE.MeshBasicMaterial({ map: jato, color: 0xcfe2f4, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, blending: THREE.AdditiveBlending }); mat.userData.bloom = 0.9;
  const im = new THREE.InstancedMesh(geo, mat, jatos.length); im.frustumCulled = false; im.name = "lasvegas-fontes"; im.userData.semContato = true; add(im);
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x4a5a70, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }), jatos.length); spray.frustumCulled = false; spray.name = "lasvegas-fontes-topo"; spray.userData.semContato = true; add(spray);
  // as luzes embaixo d'água (de noite)
  const luzGeo = new THREE.CircleGeometry(3.2, 10); luzGeo.rotateX(-Math.PI / 2);
  const luzes = new THREE.InstancedMesh(luzGeo, emis(0xfff0d0, 1.6), jatos.length); const d = new THREE.Object3D();
  jatos.forEach((j, i) => { d.position.set(j.x, lago.y + 0.5, j.z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); luzes.setMatrixAt(i, d.matrix); });
  luzes.name = "lasvegas-fontes-luzes"; luzes.userData.semContato = true; soDeNoite(tr, add(luzes));
  const matDia = mat; let acc = 1, ultimo = performance.now() / 1000;
  const atualiza = (t) => {
    const show = (t % 30) > 22 ? Math.min(1, ((t % 30) - 22) / 1.2) * Math.min(1, (30 - (t % 30)) / 1.2) : 0; // a cada 30 s, 8 s de show maior
    jatos.forEach((j, i) => {
      const onda = 0.5 + 0.5 * Math.sin(t * 1.6 + j.fase * 0.55 + j.r * 1.7), h = (5 + 6 * onda + show * (14 + 14 * Math.sin(t * 2.4 + j.fase * 0.9))) * K * 0.9;
      d.position.set(j.x, lago.y, j.z); d.rotation.set(0, 0, 0); d.scale.set(1, Math.max(1, h), 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      d.position.y = lago.y + h * 0.97; d.scale.set(0.01, 0.01, 0.01); d.updateMatrix(); spray.setMatrixAt(i, d.matrix); // (sem cabeça nos jatos: só a coluna de água)
    });
    im.instanceMatrix.needsUpdate = true; spray.instanceMatrix.needsUpdate = true;
  };
  atualiza(0);
  luzDaNoite(tr).quadro.push((noite, foco) => {
    const agora = performance.now() / 1000; acc += agora - ultimo; ultimo = agora; if (acc < 0.06 || !foco) return;
    if (Math.hypot(foco.x - lago.cx, foco.y - lago.cz) > 1800) return; acc = 0;
    matDia.color.setHex(noite ? 0xd8e4ff : 0x9db4cc); atualiza(agora);
  });
  vivo(tr, im, spray); tr.fontesLV = { jatos: jatos.length, lago: lago.A };
  tr.reservado.push([lago.cx, lago.cz, Math.max(comp, larg) * 0.55]);
}
function require_dentro(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }

// =============================== a Torre Eiffel e o balão do Paris ===============================
const treliça = () => canvasTex(128, 128, (x, w, h) => { // a treliça: um X por vão, em ferro, num fundo transparente
  x.clearRect(0, 0, w, h); x.strokeStyle = "#ffffff"; x.lineWidth = 7; x.strokeRect(3, 3, w - 6, h - 6); x.lineWidth = 5; x.beginPath(); x.moveTo(3, 3); x.lineTo(w - 3, h - 3); x.moveTo(w - 3, 3); x.lineTo(3, h - 3); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.arc(w / 2, h / 2, w * 0.2, 0, tau); x.stroke();
});
export function torreEiffel(tr, add, hAt, predioEm) {
  const m = marco("eiffel", 36.11246, -115.17235, [60, 60, 165]); void predioEm;
  const H = 165 * K * ALT, W0 = 30 * K, N = 12, y0 = hAt(m.cx, m.cz) - 1, L = luzDaNoite(tr);
  const tex = treliça(); tex.repeat.set(1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0x8a8f96, roughness: 0.6, metalness: 0.5, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, emissive: 0xffbe3c, emissiveMap: tex, emissiveIntensity: 0 });
  L.emissivos.push({ mat, valores: [0, 1.9] }); mat.emissiveIntensity = tr.noite ? 1.9 : 0;
  const meia = (h) => (W0 * Math.exp(-(h / H) * 3.9) + 0.045 * W0) * 1; // a meia largura (a curva do perfil da torre)
  for (let k = 0; k < N; k++) {
    const a = (k / N) ** 1.3 * H, b = ((k + 1) / N) ** 1.3 * H, g = new THREE.CylinderGeometry(meia(b) * 1.41, meia(a) * 1.41, b - a, 4, 1, true); g.rotateY(Math.PI / 4);
    const uvs = g.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 3, uvs.getY(i) * Math.max(1, (b - a) / (meia(a) * 1.2)));
    const s = new THREE.Mesh(g, mat); s.position.set(m.cx, y0 + (a + b) / 2, m.cz); s.name = "lasvegas-eiffel"; s.userData.semContato = true; add(s);
  }
  const plat = M(0x9a9fa5, { roughness: 0.6 }), luzP = emis(0xffc870, 1.3);
  for (const [fr, s] of [[0.34, 1.0], [0.67, 0.42]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(meia(fr * H) * 2.6, 3.4, meia(fr * H) * 2.6), plat); b.position.set(m.cx, y0 + fr * H, m.cz); add(b); const f = new THREE.Mesh(new THREE.BoxGeometry(meia(fr * H) * 2.64, 0.9, meia(fr * H) * 2.64), luzP); f.position.set(m.cx, y0 + fr * H + 2, m.cz); add(f); void s; }
  const ponta = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.9, 12 * K, 6), plat); ponta.position.set(m.cx, y0 + H + 5 * K, m.cz); add(ponta);
  const farol = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), emis(0xff3030, 2)); farol.position.set(m.cx, y0 + H + 11 * K, m.cz); add(farol);
  // o globo do Paris (Le Ballon): a esfera azul de gomos brancos com o logotipo vermelho, no canto do prédio que dá para a Strip (como nas fotos)
  const mp = marco("paris", 36.1122, -115.1711, [200, 140, 60]), cs = Math.cos(mp.ang), sn = Math.sin(mp.ang); let canto = null;
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = mp.cx + cs * u * mp.w / 2 - sn * v * mp.d / 2, z = mp.cz + sn * u * mp.w / 2 + cs * v * mp.d / 2, q = maisPerto(tr, x, z); if (!canto || q.d < canto.d) canto = { x, z, d: q.d }; }
  const dxp = mp.cx - canto.x, dzp = mp.cz - canto.z, lp = Math.hypot(dxp, dzp) || 1, bx = canto.x + (dxp / lp) * 40, bz = canto.z + (dzp / lp) * 40, RB = 9 * K * 1.1, by = hAt(bx, bz) + 52 * K * ALT * 0.7;
  const bandeira = canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#1d4fc4"; x.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { x.fillStyle = "#f4f6ff"; x.fillRect(k * (w / 8) - 3, 0, 6, h); } x.fillStyle = "#ffffff"; x.fillRect(0, h * 0.42, w, h * 0.16); x.fillStyle = "#d62828"; x.font = "italic 900 24px Arial Black, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("Paris", w / 2, h * 0.5); });
  const bm = materialDaNoite(tr, 0xb8b8b8, 0xffffff, { map: bandeira }); bm.userData.bloom = 1.2;
  const balao = new THREE.Mesh(new THREE.SphereGeometry(RB, 20, 14), bm); balao.position.set(bx, by, bz); balao.name = "lasvegas-balao"; balao.userData.semContato = true; add(balao);
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, by - hAt(bx, bz), 6), M(0x6b6f76)); mastro.position.set(bx, (by + hAt(bx, bz)) / 2 - RB * 0.5, bz); add(mastro);
  tr.reservado.push([bx, bz, RB * 1.4]);
  tr.eiffelLV = { x: m.cx, z: m.cz, H }; tr.reservado.push([m.cx, m.cz, W0 * 1.2]);
}

// =============================== a High Roller do LINQ ===============================
export function highRoller(tr, add, hAt) {
  const m = marco("highroller", 36.1177, -115.1688, [60, 60, 167]);
  const R = 79 * K, hub = 84 * K * ALT * 0.9, y0 = hAt(m.cx, m.cz) - 1, eixoX = 1, eixoZ = 0; // a roda fica num plano norte-sul (paralelo à Strip)
  const grupo = new THREE.Group(); grupo.position.set(m.cx, y0 + hub, m.cz); grupo.name = "lasvegas-highroller"; grupo.userData.semContato = true; add(grupo);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(R, 1.1 * K * 0.9, 6, 72), materialDaNoite(tr, 0xc7ccd2, 0x7fd8ff)); aro.rotation.y = Math.PI / 2; grupo.add(aro);
  const aro2 = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, 0.5 * K, 5, 72), materialDaNoite(tr, 0xaab0b8, 0xff6ad5)); aro2.rotation.y = Math.PI / 2; grupo.add(aro2);
  aro.material.userData.bloom = 1.6; aro2.material.userData.bloom = 1.6;
  const rg = new THREE.BufferGeometry(); const rp = []; for (let k = 0; k < 28; k++) { const a = (k / 28) * tau; for (const s of [-1, 1]) { rp.push(0, 0, s * 1.2, s * 0.6, Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99); } }
  rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); const rl = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfd6dd })); grupo.add(rl);
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(4 * K * 0.5, 4 * K * 0.5, 6, 12), M(0xb0b6bd, { metalness: 0.5 })); cubo.rotation.z = Math.PI / 2; grupo.add(cubo);
  const cab = new THREE.InstancedMesh(new THREE.SphereGeometry(3.1 * K * 0.85, 10, 8), materialDaNoite(tr, 0xdfe3e6, 0xfff0c8), 28); cab.name = "lasvegas-cabines"; cab.userData.semContato = true; cab.frustumCulled = false; cab.material.userData.bloom = 1.2; add(cab);
  // as duas pernas em A, do chão ao eixo
  const aco = M(0xc2c7cd, { roughness: 0.5, metalness: 0.5 });
  for (const s of [-1, 1]) { const perna = new THREE.Mesh(new THREE.BoxGeometry(2.6, hub + 4, 3.4), aco); perna.position.set(m.cx + s * 0, y0 + hub / 2, m.cz + s * R * 0.5); perna.rotation.x = -s * Math.atan2(R * 0.5, hub); add(perna); }
  const d = new THREE.Object3D(); let ang = 0, ultimo = performance.now() / 1000, acc = 1;
  const pos = (a) => { for (let k = 0; k < 28; k++) { const q = a + (k / 28) * tau; d.position.set(m.cx, y0 + hub + Math.sin(q) * (R + 3 * K), m.cz + Math.cos(q) * (R + 3 * K)); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); cab.setMatrixAt(k, d.matrix); } cab.instanceMatrix.needsUpdate = true; };
  pos(0);
  luzDaNoite(tr).quadro.push((noite, foco) => {
    const agora = performance.now() / 1000, dt = agora - ultimo; ultimo = agora; acc += dt; if (acc < 0.05 || !foco) return; if (Math.hypot(foco.x - m.cx, foco.y - m.cz) > 3200) return; acc = 0;
    ang += 0.05 * 0.052; grupo.rotation.x = ang; pos(-ang);
    const hue = (agora * 0.08) % 1; aro2.material.color.setHSL(hue, 1, noite ? 0.6 : 0.7); // o aro de LED muda de cor
  });
  vivo(tr, grupo, cab); tr.highRollerLV = { x: m.cx, z: m.cz, R }; tr.reservado.push([m.cx, m.cz, R * 0.9]); void eixoX; void eixoZ;
}

// =============================== o campanário do Venetian ===============================
export function campanario(tr, add, hAt) {
  const m = marco("venetian", 36.1213, -115.1699, [200, 120, 145]);
  // o canto do prédio mais perto da pista: ali, na frente do Strip, fica o campanário de San Marco
  const c = Math.cos(m.ang), s = Math.sin(m.ang); let melhor = null;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = m.cx + c * a * m.w / 2 - s * b * m.d / 2, z = m.cz + s * a * m.w / 2 + c * b * m.d / 2, q = maisPerto(tr, x, z); if (!melhor || q.d < melhor.d) melhor = { x, z, d: q.d, a, b }; }
  const dirx = m.cx - melhor.x, dirz = m.cz - melhor.z, l = Math.hypot(dirx, dirz) || 1, x = melhor.x + (dirx / l) * 34, z = melhor.z + (dirz / l) * 34, y0 = hAt(x, z) - 1;
  const L = 11 * K, tijolo = canvasTex(64, 128, (g, w, h, rr) => { g.fillStyle = "#b5532f"; g.fillRect(0, 0, w, h); for (let yy = 0; yy < h; yy += 6) for (let xx = (yy / 6 % 2) * 4; xx < w; xx += 9) { g.fillStyle = rr() < 0.5 ? "#a8492a" : "#c25f38"; g.fillRect(xx, yy, 8, 5); } g.fillStyle = "#e8d9b8"; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3); });
  const mat = new THREE.MeshStandardMaterial({ map: tijolo, roughness: 0.9, emissive: 0xffb070, emissiveMap: tijolo, emissiveIntensity: 0 }); luzDaNoite(tr).emissivos.push({ mat, valores: [0, 0.55] }); mat.emissiveIntensity = tr.noite ? 0.55 : 0;
  mat.map.repeat.set(2, 7); const fuste = new THREE.Mesh(new THREE.BoxGeometry(L, 58 * K * 0.9, L), mat); fuste.position.set(x, y0 + 29 * K * 0.9, z); fuste.castShadow = true; add(fuste);
  const pedra = materialDaNoite(tr, 0xe8dcc0, 0xfff0cf); pedra.userData.bloom = 0.7;
  const log = new THREE.Mesh(new THREE.BoxGeometry(L * 0.92, 7 * K * 0.9, L * 0.92), pedra); log.position.set(x, y0 + 61 * K * 0.9, z); add(log);
  const cubo = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 6 * K * 0.9, L * 0.8), M(0xe8dcc0)); cubo.position.set(x, y0 + 67 * K * 0.9, z); add(cubo);
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(L * 0.62, 20 * K * 0.9, 4), materialDaNoite(tr, 0x4f8a6a, 0x7fe0b0)); ponta.rotation.y = Math.PI / 4; ponta.position.set(x, y0 + 80 * K * 0.9, z); add(ponta);
  const anjo = new THREE.Mesh(new THREE.OctahedronGeometry(2.4 * K * 0.5, 0), emis(0xffd34a, 1.6)); anjo.position.set(x, y0 + 93 * K * 0.9, z); add(anjo);
  tr.reservado.push([x, z, L * 1.4]); tr.campanarioLV = { x, z };
}

// =============================== o vulcão do Mirage ===============================
export function vulcao(tr, add, hAt) {
  const m = marco("mirage", 36.1212, -115.1744, [200, 160, 100]);
  let lago = null; for (const l of tr.lagosLV || []) { const d = Math.hypot(l.cx - m.cx, l.cz - m.cz); if (d < 420 && (!lago || d < lago.d)) lago = { ...l, d }; }
  const x = lago ? lago.cx : m.cx - 40, z = lago ? lago.cz : m.cz, y = lago ? lago.y : hAt(m.cx, m.cz), R = 30 * K * 0.8, Hc = 17 * K * 0.9;
  const g = new THREE.ConeGeometry(R, Hc, 18, 5, true), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.sin(i * 12.9898) * 43758.5453; p.setX(i, p.getX(i) * (1 + (a - Math.floor(a) - 0.5) * 0.28)); p.setZ(i, p.getZ(i) * (1 + (Math.sin(i * 78.233) * 4375.5 % 1 - 0.5) * 0.28)); } g.computeVertexNormals();
  const rocha = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a423b, roughness: 1, flatShading: true })); rocha.position.set(x, y + Hc / 2, z); rocha.castShadow = true; rocha.name = "lasvegas-vulcao"; add(rocha);
  const chama = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6, 1, true), emis(0xff7a1a, 1.6, { transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), 9); chama.frustumCulled = false; chama.name = "lasvegas-labaredas"; chama.userData.semContato = true; add(chama);
  const d = new THREE.Object3D(); let acc = 1, ultimo = performance.now() / 1000;
  const mexe = (t, noite) => { const erup = (t % 50) > 38 ? Math.sin((((t % 50) - 38) / 12) * Math.PI) : 0; for (let i = 0; i < 9; i++) { const a = (i / 9) * tau, r = i === 0 ? 0 : R * 0.18, f = (noite ? 0.35 : 0.1) + 0.12 * Math.sin(t * 7 + i * 2) + erup * (0.9 + 0.5 * Math.sin(t * 5 + i)); d.position.set(x + Math.cos(a) * r, y + Hc + 1, z + Math.sin(a) * r); d.rotation.set(0, 0, 0); d.scale.set(2.6 + erup * 3, Math.max(0.1, f * 26 * K * 0.6), 2.6 + erup * 3); d.position.y += d.scale.y * 0.5; d.updateMatrix(); chama.setMatrixAt(i, d.matrix); } chama.instanceMatrix.needsUpdate = true; };
  mexe(0, false); soDeNoite(tr, chama);
  luzDaNoite(tr).quadro.push((noite, foco) => { const agora = performance.now() / 1000; acc += agora - ultimo; ultimo = agora; if (!noite || !foco || acc < 0.08) return; if (Math.hypot(foco.x - x, foco.y - z) > 1600) return; acc = 0; mexe(agora, noite); });
  vivo(tr, chama); tr.reservado.push([x, z, R * 1.2]); tr.vulcaoLV = { x, z };
}

// =============================== a colunata e as fontes do Caesars Palace ===============================
export function colunataDoCaesars(tr, add, hAt) {
  const m = marco("caesars", 36.1166, -115.1757, [300, 200, 60]);
  // o ponto do prédio na frente da Strip: a face do prédio mais perto da pista
  let melhor = null; const c = Math.cos(m.ang), s = Math.sin(m.ang);
  for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const x = m.cx + c * a * m.w / 2 - s * b * m.d / 2, z = m.cz + s * a * m.w / 2 + c * b * m.d / 2, q = maisPerto(tr, x, z); if (!melhor || q.d < melhor.d) melhor = { x, z, d: q.d, i: q.i }; }
  const p = tr.pts[melhor.i], lado = ((m.cx - p.x) * p.nx + (m.cz - p.y) * p.ny) >= 0 ? 1 : -1, rm = tr.murosEscape?.[lado]?.[melhor.i] || 10, dist0 = tr.W / 2 + rm + 46;
  const colunas = [], jatos = [];
  for (let k = -9; k <= 9; k++) { const i = (melhor.i + k * 2 + tr.n) % tr.n, q = tr.pts[i], x = q.x + q.nx * lado * dist0, z = q.y + q.ny * lado * dist0; if (tr.distAt(x, z) < tr.W / 2 + 30) continue; colunas.push({ x, y: hAt(x, z), z, r: Math.atan2(q.ty, q.tx) }); if (k % 3 === 0) jatos.push({ x: q.x + q.nx * lado * (dist0 + 14), z: q.y + q.ny * lado * (dist0 + 14) }); }
  const col = new THREE.CylinderGeometry(1.6, 1.9, 26, 8); col.translate(0, 13, 0); const cap = new THREE.BoxGeometry(5, 2.4, 5); cap.translate(0, 27, 0);
  const pedra = materialDaNoite(tr, 0xe6dcc6, 0xffe9c4); pedra.userData.bloom = 0.6;
  instancias(add, col, pedra, colunas, { sombra: false, nome: "lasvegas-colunas" }); instancias(add, cap, pedra, colunas, { sombra: false, nome: "lasvegas-capiteis" });
  const luzC = new THREE.BoxGeometry(2.4, 2.4, 2.4); instancias(add, luzC, emis(0xffd9a0, 1.5), colunas.map((q) => ({ x: q.x + 4, y: q.y + 1.2, z: q.z, r: q.r })), { sombra: false, nome: "lasvegas-colunas-luz" });
  tr.colunataLV = colunas.length; for (const q of colunas) tr.reservado.push([q.x, q.z, 8]); void jatos;
}

// =============================== as letras acesas do Encore e do Wynn ===============================
export function letrasDosTorres(tr, add, hAt) {
  for (const [chave, texto, cor, lat, lon] of [["encore", "Encore", "#ffe2b0", 36.1287, -115.1649], ["wynn", "WYNN", "#ffd9a0", 36.1266, -115.1656]]) {
    const m = marco(chave, lat, lon, [90, 90, 190]); if (!m) continue;
    const tex = canvasTex(512, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = `italic 700 ${chave === "wynn" ? 92 : 98}px Georgia, serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.shadowColor = cor; x.shadowBlur = 24; x.fillStyle = cor; x.fillText(texto, w / 2, h / 2); x.shadowBlur = 0; x.fillStyle = "#fff"; x.globalAlpha = 0.85; x.fillText(texto, w / 2, h / 2); }, false);
    const mat = materialDaNoite(tr, 0x101010, 0xffffff, { map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }); mat.userData.bloom = 1.5;
    // a face do prédio virada para a pista mais perto
    const q = maisPerto(tr, m.cx, m.cz), p = tr.pts[q.i], dx = p.x - m.cx, dz = p.y - m.cz, l = Math.hypot(dx, dz) || 1, y = hAt(m.cx, m.cz) + (m.h || 190) * K * ALT * 0.96, raio = Math.min(m.w, m.d) / 2 + 2;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(64 * K * 0.8, 16 * K * 0.8), mat); mesh.position.set(m.cx + (dx / l) * raio, y, m.cz + (dz / l) * raio); mesh.rotation.y = Math.atan2(dx, dz); mesh.name = "lasvegas-letras-" + chave; mesh.userData.semContato = true; add(mesh);
  }
}
void D;
