// Las Vegas — os letreiros da Strip: os pilares de neon na calçada com o nome de cada resort (Bellagio, Caesars Palace, Paris, Flamingo, Planet Hollywood, LINQ...), com o contorno
// luminoso e as letras brilhando, e os telões de LED (as telas de vídeo que passam anúncios, o logotipo da F1 e a contagem), tudo com os dois lados lidos certo (nunca texto
// espelhado: cada face é um plano próprio). Só acendem de noite (tr.noite); de dia ficam escuros. Feitos em código, sem imagem baixada.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { D, marco } from "./mundo.js";
import { livre, ocupado, instancias } from "../comum.js";
import { luzDaNoite, soDeNoite } from "../bahrein/base.js";

// uma placa de neon: fundo escuro, moldura brilhante e o texto (várias linhas separadas por "|") com o brilho das letras
function placaNeon(texto, cor, cor2, w = 256, h = 512, fonte = "900") {
  return canvasTex(w, h, (x, ww, hh) => {
    x.fillStyle = "#08080f"; x.fillRect(0, 0, ww, hh);
    const brilho = (txt, cx, cy, tam, c, borda = false) => {
      x.font = `${fonte} ${tam}px "Arial Black", Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
      x.shadowColor = c; x.shadowBlur = tam * 0.6; x.fillStyle = c; x.fillText(txt, cx, cy, ww - 36); x.fillText(txt, cx, cy, ww - 36);
      x.shadowBlur = 0; x.fillStyle = "#ffffff"; x.globalAlpha = 0.85; x.fillText(txt, cx, cy, ww - 36); x.globalAlpha = 1; void borda;
    };
    x.strokeStyle = cor; x.lineWidth = 9; x.shadowColor = cor; x.shadowBlur = 18; x.strokeRect(10, 10, ww - 20, hh - 20); x.shadowBlur = 0;
    x.strokeStyle = cor2; x.lineWidth = 4; x.strokeRect(24, 24, ww - 48, hh - 48);
    const linhas = texto.split("|"), tam = Math.min(ww / 4.4, (hh - 120) / (linhas.length * 1.35));
    linhas.forEach((l, k) => brilho(l, ww / 2, hh / 2 + (k - (linhas.length - 1) / 2) * tam * 1.3, tam * Math.min(1, 9 / Math.max(5, l.length) * 1.1), k % 2 ? cor2 : cor));
  }, false);
}

// o telão: um canvas pequeno redesenhado ~6 vezes por segundo, cada tela com a sua sequência
const CENAS = [
  (x, w, h, t) => { x.fillStyle = "#0b0f24"; x.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { x.fillStyle = `hsl(${(t * 40 + i * 60) % 360} 90% 55%)`; x.fillRect(((t * 90 + i * 70) % (w + 80)) - 80, i * (h / 6), 80, h / 6 - 4); } x.fillStyle = "#fff"; x.font = "900 34px Arial Black, Arial"; x.textAlign = "center"; x.fillText("LAS VEGAS", w / 2, h / 2 + 12); },
  (x, w, h, t) => { x.fillStyle = "#e10600"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.font = "italic 900 46px Arial Black, Arial"; x.textAlign = "center"; x.fillText("F1", w / 2, h * 0.45); x.font = "700 20px Arial"; x.fillText("LAS VEGAS GRAND PRIX", w / 2, h * 0.7); for (let i = 0; i < 12; i++) { x.fillStyle = (i + Math.floor(t * 3)) % 2 ? "#fff" : "#111"; x.fillRect(i * (w / 12), h - 14, w / 12, 14); } },
  (x, w, h, t) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${(t * 30) % 360} 80% 45%)`); g.addColorStop(1, `hsl(${(t * 30 + 120) % 360} 80% 35%)`); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "#ffffffcc"; x.beginPath(); x.arc(w / 2 + Math.sin(t * 2) * w * 0.25, h / 2, h * 0.28, 0, 7); x.fill(); x.fillStyle = "#000"; x.font = "900 26px Arial Black, Arial"; x.textAlign = "center"; x.fillText("SHOW TONIGHT", w / 2, h * 0.9); },
  (x, w, h, t) => { x.fillStyle = "#04161f"; x.fillRect(0, 0, w, h); x.fillStyle = "#00e0b4"; x.font = "900 40px Arial Black, Arial"; x.textAlign = "center"; x.fillText("00:" + String(59 - Math.floor(t) % 60).padStart(2, "0"), w / 2, h * 0.55); x.fillStyle = "#ffffff"; x.font = "700 18px Arial"; x.fillText("JACKPOT", w / 2, h * 0.8); },
];
function telao(w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { c, tex, x: c.getContext("2d") };
}

// onde pôr cada letreiro: o resort (chave de dados.js ou lat/lon), o texto, as cores e quanto fica longe da borda da pista
const PLACAS = [
  ["bellagio", "BELLAGIO", "#ffd28a", "#ff9a3c", 36.1129, -115.1767, 1],
  ["caesars", "CAESARS|PALACE", "#c9a0ff", "#ffe08a", 36.1163, -115.1745, 1],
  ["paris", "PARIS|LAS VEGAS", "#ff5a5a", "#ffe4b8", 36.1125, -115.1707, -1],
  ["planethollywood", "PLANET|HOLLYWOOD", "#ff3b7a", "#ffb02a", 36.1098, -115.1706, -1],
  ["flamingo", "FLAMINGO", "#ff4fa0", "#ffc0d8", 36.1162, -115.1707, -1],
  ["linq", "THE LINQ", "#4fd0ff", "#ff6ad5", 36.1177, -115.1688, -1],
  ["venetian", "THE|VENETIAN", "#ffd36a", "#ffffff", 36.1213, -115.1699, -1],
  ["treasureisland", "TREASURE|ISLAND", "#ffc860", "#6ae0ff", 36.1247, -115.1744, 1],
  ["mirage", "THE MIRAGE", "#ffe27a", "#ff7a3a", 36.1212, -115.1744, 1],
  ["cosmopolitan", "THE|COSMOPOLITAN", "#4aa8ff", "#ffffff", 36.1099, -115.1743, 1],
  ["harrahs", "HARRAH'S", "#ff6a5a", "#ffe08a", 36.1190, -115.1707, -1],
];
const TELOES = [["planethollywood", -1, 0], ["caesars", 1, 1], ["linq", -1, 2], ["flamingo", -1, 3], ["cosmopolitan", 1, 1], ["venetian", -1, 0]];

export function letreiros(tr, add, { hAt, predioEm }) {
  const { pts, n, W } = tr, o = new THREE.Object3D(), postes = [], quadros = [], L = luzDaNoite(tr);
  const achaPonto = (cx, cz) => { let m = 1e12, k = 0; for (let i = 0; i < n; i += 2) { const p = pts[i], d = (p.x - cx) ** 2 + (p.y - cz) ** 2; if (d < m) { m = d; k = i; } } return k; };
  const matNeon = (tex) => { const m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, toneMapped: false, color: tr.noite ? 0xffffff : 0x2a2a30 }); m.userData.bloom = 1.4; L.materiais.push({ mat: m, dia: 0x2a2a30, noite: 0xffffff }); return m; };
  const geoPlaca = new THREE.PlaneGeometry(1, 1);
  let total = 0; tr.letreirosLV = [];
  const refl = []; // os reflexos das placas no asfalto (uma faixa de luz da cor da placa, de lado a lado da pista, só de noite)
  const poe = (cx, cz, lado, larg, alto, y0, mats, nome, cor = 0xffffff) => {
    // o ponto da pista mais perto do resort: o letreiro fica no lado dele, a uma distância da barreira que caiba
    const i = achaPonto(cx, cz), p = pts[i], sinal = lado || ((cx - p.x) * p.nx + (cz - p.y) * p.ny >= 0 ? 1 : -1);
    let x = 0, z = 0, ok = false;
    for (let t = 0; t < 7 && !ok; t++) {
      const d = W / 2 + Math.max(tr.murosEscape?.[sinal]?.[i] || 0, 8) + 26 + t * 14; x = p.x + p.nx * sinal * d; z = p.y + p.ny * sinal * d;
      ok = livre(tr, x, z, 16) && !ocupado(tr, x, z, i) && !predioEm(x, z, 4);
    }
    if (!ok) return null;
    const y = hAt(x, z), ang = Math.atan2(p.tx, p.ty) + Math.PI + sinal * 0.5; // a face olha contra o sentido da volta, virada um pouco para a pista
    postes.push({ x, y: y, z, sx: 1.8, sy: y0 + 2, sz: 1.8, r: ang });
    for (const [lado2, mat] of mats.entries()) {
      const mesh = new THREE.Mesh(geoPlaca, mat); mesh.scale.set(larg, alto, 1); mesh.name = nome;
      const dx = Math.sin(ang) * (lado2 ? -0.5 : 0.5), dz = Math.cos(ang) * (lado2 ? -0.5 : 0.5);
      mesh.position.set(x + dx, y + y0 + alto / 2, z + dz); mesh.rotation.y = ang + (lado2 ? Math.PI : 0); mesh.userData.semContato = true; add(mesh); total++;
    }
    tr.reservado.push([x, z, larg * 0.7]); tr.letreirosLV.push({ nome, x, z, i }); refl.push({ x: p.x, z: p.y, h: p.h, tx: p.tx, ty: p.ty, cor });
    return { x, y, z };
  };
  // os pilares de neon com o nome dos resorts
  for (const [chave, texto, c1, c2, lat, lon, lado] of PLACAS) {
    const m = marco(chave, lat, lon); if (!m) continue;
    const tex = placaNeon(texto, c1, c2), mat = matNeon(tex);
    poe(m.cx, m.cz, lado, 32, 64, 50, [mat, mat], "lasvegas-neon-" + chave, parseInt(c1.slice(1), 16));
  }
  // os telões de LED: a mesma tela dos dois lados, cada uma com uma cena que muda
  const telas = [];
  for (const [chave, lado, k0] of TELOES) {
    const m = marco(chave); if (!m) continue;
    const t = telao(256, 128), mat = new THREE.MeshBasicMaterial({ map: t.tex, toneMapped: false, color: 0x15151a }); mat.userData.bloom = 1.3; L.materiais.push({ mat, dia: 0x15151a, noite: 0xffffff });
    const r = poe(m.cx, m.cz + 30, lado, 78, 40, 60, [mat, mat], "lasvegas-telao-" + chave, 0x9fb8ff); if (r) telas.push({ ...t, k: k0, mat });
  }
  if (postes.length) instancias(add, new THREE.BoxGeometry(1, 1, 1), M(0x3a3d44, { roughness: 0.5, metalness: 0.6 }), postes.map((p) => ({ ...p, y: p.y + p.sy / 2 })), { sombra: false, nome: "lasvegas-pilares" });
  if (refl.length) {
    const tex = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.35, "rgba(255,255,255,0.5)"); g.addColorStop(0.5, "rgba(255,255,255,0.9)"); g.addColorStop(0.65, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); const gx = x.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(0.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)"); x.globalCompositeOperation = "destination-out"; x.fillStyle = gx; x.fillRect(0, 0, w, h); }, false);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true, toneMapped: false });
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); const im = new THREE.InstancedMesh(geo, mat, refl.length), d = new THREE.Object3D(), c = new THREE.Color();
    refl.forEach((q, k) => { d.position.set(q.x, q.h + 0.95, q.z); d.rotation.set(0, Math.atan2(-q.ty, q.tx), 0); d.scale.set(70, 1, W * 0.96); d.updateMatrix(); im.setMatrixAt(k, d.matrix); im.setColorAt(k, c.setHex(q.cor)); });
    im.frustumCulled = false; im.renderOrder = 3; im.name = "lasvegas-reflexos-chao"; im.userData.semContato = true; soDeNoite(tr, add(im));
  }
  // a animação: os telões trocam de quadro (só de noite, e só os que a câmera pode ver)
  let acc = 0, ultimo = performance.now() / 1000;
  L.quadro.push((noite, foco) => {
    const agora = performance.now() / 1000, dt = agora - ultimo; ultimo = agora; acc += dt;
    if (!noite || !foco || acc < 0.16) return; acc = 0;
    telas.forEach((s, i) => { s.x.save(); CENAS[(s.k + Math.floor(agora / 6 + i)) % CENAS.length](s.x, s.c.width, s.c.height, agora + i * 7); s.x.restore(); s.tex.needsUpdate = true; });
  });
  (tr.vivosLV ||= []).push(...telas.map((q) => q.mat)); tr.telasLV = telas.length; void D; void o;
  return total;
}
