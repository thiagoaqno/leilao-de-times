// Cozinha da Galera — os modelos 3D: as bancadas (balcão, tábua, fogão, pia, escorredor, entrega, retorno, lixo,
// caixa de ingrediente, parede), a comida em cada estado (inteira, picada, frita, queimada), a panela, a frigideira,
// o prato montado e o chapéu de cozinheiro. Tudo de caixinhas e cilindros, no jeito dos bonecos da Pelada.
// Também desenha os ícones 2D dos ingredientes e das receitas (os cartões de pedido).
import * as THREE from "three";
import { canvasTex, M } from "/pelada/tex.js";

const K = window.Cozinha, T = K.TILE;
export const ALTURA = 0.95; // o tampo das bancadas
const geo = { caixa: new THREE.BoxGeometry(1, 1, 1), bola: new THREE.SphereGeometry(1, 16, 12), cil: new THREE.CylinderGeometry(1, 1, 1, 20), tubo: new THREE.CylinderGeometry(1, 0.94, 1, 24, 1, true) };
const mPanela = new THREE.MeshStandardMaterial({ color: 0xb9c2cb, metalness: 0.25, roughness: 0.35, side: THREE.DoubleSide });
const mats = new Map();
const mat = (cor, o = {}) => { const k = cor + JSON.stringify(o); if (!mats.has(k)) mats.set(k, M(cor, o)); return mats.get(k); };
function caixa(w, h, d, cor, x = 0, y = 0, z = 0, o) { const m = new THREE.Mesh(geo.caixa, typeof cor === "object" ? cor : mat(cor, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
function bola(r, cor, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(geo.bola, typeof cor === "object" ? cor : mat(cor)); m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); m.castShadow = true; return m; }
function cil(r, h, cor, x = 0, y = 0, z = 0, o) { const m = new THREE.Mesh(geo.cil, typeof cor === "object" ? cor : mat(cor, o)); m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }

// ---------- texturas ----------
const texAco = canvasTex(64, 64, (x, w, h, r) => { x.fillStyle = "#c9d0d6"; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { x.fillStyle = r() < 0.5 ? "#ffffff22" : "#00000014"; x.fillRect(0, r() * h, w, 1); } });
const texMadeira = canvasTex(64, 64, (x, w, h, r) => { x.fillStyle = "#b07a45"; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? "#8a5a30" : "#c48d55"; x.fillRect(0, r() * h, w, 1 + r() * 2); } });
const texFrente = canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#e9e1cf"; x.fillRect(0, 0, w, h); x.fillStyle = "#d4c9b0"; x.fillRect(4, 6, w - 8, h - 14); x.fillStyle = "#9a8f78"; x.fillRect(w / 2 - 8, 12, 16, 3); });
const texCaixote = canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#a8743f"; x.fillRect(0, 0, w, h); x.fillStyle = "#86592c"; for (let i = 0; i < 4; i++) x.fillRect(0, i * 16 + 14, w, 2); x.fillRect(0, 0, 4, h); x.fillRect(w - 4, 0, 4, h); });
// ---------- temas: o chão, a parede e o lado de fora de cada cozinha (coz.tema em regras.js) ----------
export const TEMAS = {
  restaurante: { piso: "xadrez", cores: ["#efe7d6", "#c95f4a"], parede: "azulejo", corParede: ["#f3efe6", "#cfc6b4"], faixa: "#3f7fb5", fora: 0x3a2a20, fundo: 0x1b120e },
  sushi: { piso: "tatame", cores: ["#d8c48e", "#b9a46c"], parede: "ripas", corParede: ["#efe4cc", "#8a5a30"], faixa: "#b8322a", fora: 0x22201c, fundo: 0x121010 },
  foodtruck: { piso: "chapa", cores: ["#b7bec6", "#8d959f"], parede: "azulejo", corParede: ["#ffd75a", "#e0b43a"], faixa: "#e2553d", fora: 0x4a4f55, fundo: 0x1a2430 },
  pizzaria: { piso: "terracota", cores: ["#d98a5a", "#b9643a"], parede: "tijolo", corParede: ["#b5562f", "#e8d6bd"], faixa: "#2f7d3a", fora: 0x3a2418, fundo: 0x1e110b },
};
const temaDe = (t) => TEMAS[t] || TEMAS.restaurante;
const paredeTex = new Map();
function texParedeDe(tema) {
  const T2 = temaDe(tema), k = T2.parede + T2.corParede + T2.faixa;
  if (!paredeTex.has(k)) paredeTex.set(k, canvasTex(64, 64, (x, w, h) => {
    const [c1, c2] = T2.corParede; x.fillStyle = c1; x.fillRect(0, 0, w, h);
    if (T2.parede === "tijolo") { x.fillStyle = c2; for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) x.fillRect(c * 16 + (r % 2) * 8 + 1, r * 8 + 1, 14, 6); x.fillStyle = "#00000022"; for (let r = 0; r < 8; r++) x.fillRect(0, r * 8, w, 1); }
    else if (T2.parede === "ripas") { x.fillStyle = c2; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 2, h); x.fillRect(0, 30, w, 3); }
    else { x.strokeStyle = c2; x.lineWidth = 2; for (let i = 0; i <= 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }
    x.fillStyle = T2.faixa; x.fillRect(0, 44, w, 6);
  }));
  return paredeTex.get(k);
}
const texParede = texParedeDe("restaurante");
const mAco = new THREE.MeshStandardMaterial({ map: texAco, metalness: 0.45, roughness: 0.45 });
const mMadeira = new THREE.MeshStandardMaterial({ map: texMadeira, roughness: 0.8 });
const mFrente = new THREE.MeshStandardMaterial({ map: texFrente, roughness: 0.85 });
const mCaixote = new THREE.MeshStandardMaterial({ map: texCaixote, roughness: 0.9 });
const mParede = new THREE.MeshStandardMaterial({ map: texParede, roughness: 0.9 });
const mTijolo = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#e3cdb0"; x.fillRect(0, 0, w, h); x.fillStyle = "#b5562f"; for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) x.fillRect(c * 16 + (r % 2) * 8 + 1, r * 8 + 1, 14, 6); }), roughness: 0.95 });
const mFaixa = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#f2c230"; x.fillRect(0, 0, w, h); x.fillStyle = "#2b2b2b"; for (let i = -64; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 8, 0); x.lineTo(i + 72, h); x.lineTo(i + 64, h); x.fill(); } }), roughness: 0.7 });

// o chão (w x h casas), no jeito do tema: azulejo xadrez, tatame, chapa de metal ou lajota de terracota
export function chao(w, h, tema) {
  const T2 = temaDe(tema), [c1, c2] = T2.cores;
  const tex = canvasTex(64, 64, (x, ww, hh, r) => {
    x.fillStyle = c1; x.fillRect(0, 0, ww, hh);
    if (T2.piso === "tatame") { x.fillStyle = c2; for (let i = 0; i < hh; i += 4) x.fillRect(0, i, ww, 1); x.fillStyle = "#3a5a2a"; x.fillRect(0, 0, ww, 3); x.fillRect(0, hh - 3, ww, 3); }
    else if (T2.piso === "chapa") { x.fillStyle = c2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.save(); x.translate(i * 16 + 8, j * 16 + 8); x.rotate((i + j) % 2 ? 0.8 : -0.8); x.fillRect(-5, -1.5, 10, 3); x.restore(); } }
    else if (T2.piso === "terracota") { x.fillStyle = c2; x.fillRect(0, 0, ww / 2 - 1, hh / 2 - 1); x.fillRect(ww / 2, hh / 2, ww / 2 - 1, hh / 2 - 1); for (let i = 0; i < 40; i++) { x.fillStyle = r() < 0.5 ? "#ffffff10" : "#0000000f"; x.fillRect(r() * ww, r() * hh, 3, 3); } x.fillStyle = "#e8d6bd"; x.fillRect(0, hh / 2 - 1, ww, 1); x.fillRect(ww / 2 - 1, 0, 1, hh); }
    else { x.fillStyle = c2; x.fillRect(0, 0, ww / 2, hh / 2); x.fillRect(ww / 2, hh / 2, ww / 2, hh / 2); }
    x.fillStyle = "#00000018"; x.fillRect(0, 0, ww, 1); x.fillRect(0, 0, 1, hh);
  }, true);
  tex.repeat.set(w, h);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * T, h * T), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  m.rotation.x = -Math.PI / 2; m.position.set(w * T / 2, 0, h * T / 2); m.receiveShadow = true;
  return m;
}
// a parede do fundo e dos lados (enfeite atrás das bancadas de cima)
export function paredes(w, h, tema) {
  const g = new THREE.Group(), alt = 3.2, mParede = new THREE.MeshStandardMaterial({ map: texParedeDe(tema), roughness: 0.9 });
  const fundo = caixa(w * T + 1, alt, 0.4, mParede, w * T / 2, alt / 2, -0.2); g.add(fundo);
  for (const s of [0, 1]) g.add(caixa(0.4, 1.1, h * T + 0.4, mParede, s ? w * T + 0.2 : -0.2, 0.55, h * T / 2 - 0.2)); // dos lados, só a mureta (para a câmera ver tudo)
  // a janela com o céu e as prateleiras de enfeite
  const vidro = canvasTex(64, 32, (x, ww, hh) => { const gr = x.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "#7cc0f0"); gr.addColorStop(1, "#d8f0ff"); x.fillStyle = gr; x.fillRect(0, 0, ww, hh); x.fillStyle = "#ffffffaa"; x.fillRect(6, 6, 10, 3); });
  const jan = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), new THREE.MeshBasicMaterial({ map: vidro })); jan.position.set(w * T * 0.3, 2.1, 0.01); g.add(jan);
  g.add(caixa(2.6, 0.1, 0.12, "#7a5230", w * T * 0.3, 1.52, 0.06));
  for (const k of [0.62, 0.78]) {
    g.add(caixa(2.2, 0.08, 0.3, mMadeira, w * T * k, 2.2, 0.15));
    for (let i = 0; i < 4; i++) g.add(cil(0.1, 0.22 + (i % 2) * 0.1, ["#c0392b", "#f1c40f", "#27ae60", "#8e44ad"][i], w * T * k - 0.8 + i * 0.5, 2.36, 0.15));
  }
  return g;
}

// ---------- as bancadas ----------
// devolve o Group da casa (origem no centro da casa, no chão)
export function estacao(t) {
  const g = new THREE.Group(), tipo = t.tipo;
  if (tipo === "vazio") return g;
  if (tipo === "parede") { g.add(caixa(T, 3.2, T, mParede, 0, 1.6, 0)); return g; }
  if (tipo === "lixo") {
    g.add(cil(T * 0.32, 0.85, "#8f9aa6", 0, 0.42, 0, { metalness: 0.2, roughness: 0.45 }));
    g.add(cil(T * 0.34, 0.06, "#6d7883", 0, 0.88, 0)); g.add(cil(T * 0.27, 0.01, "#2b2f35", 0, 0.915, 0));
    g.add(caixa(0.2, 0.05, 0.12, "#2b3036", 0, 0.04, T * 0.36));
    return g;
  }
  if (tipo === "divisoria") { // a divisória que desce no chão e sobe de novo (listras de aviso)
    const sobe = new THREE.Group();
    sobe.add(caixa(T, ALTURA - 0.06, T, mFaixa, 0, (ALTURA - 0.06) / 2, 0)); sobe.add(caixa(T * 1.002, 0.06, T * 1.002, "#3a3f46", 0, ALTURA - 0.03, 0));
    g.add(sobe); g.userData.divisoria = sobe;
    g.add(caixa(T * 0.98, 0.012, T * 0.98, "#2b2f35", 0, 0.006, 0)); // o trilho no chão, que aparece quando ela abaixa
    return g;
  }
  if (tipo === "forno") { // o forno de tijolo: a boca acesa quando assa, a chaminé, e a assadeira em cima
    g.add(caixa(T, ALTURA - 0.06, T, mTijolo, 0, (ALTURA - 0.06) / 2, 0));
    g.add(caixa(T * 1.002, 0.06, T * 1.002, "#5a3a2a", 0, ALTURA - 0.03, 0));
    const boca = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x140c08, emissive: 0xff6a1a, emissiveIntensity: 0 }));
    boca.position.set(0, 0.28, T / 2 + 0.006); g.add(boca); g.userData.chama = boca;
    g.add(caixa(0.8, 0.06, 0.04, "#7a4a30", 0, 0.25, T / 2 + 0.01));
    g.add(caixa(0.22, 0.5, 0.22, mTijolo, T * 0.3, ALTURA + 0.25, -T * 0.32));
    return g;
  }
  if (tipo === "caixa") {
    g.add(caixa(T * 0.96, ALTURA, T * 0.96, mCaixote, 0, ALTURA / 2, 0));
    const tampa = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.6, T * 0.6), new THREE.MeshStandardMaterial({ map: iconeTex(t.ing), transparent: true }));
    tampa.rotation.x = -Math.PI / 2; tampa.position.y = ALTURA + 0.005; g.add(tampa);
    return g;
  }
  // o resto é um balcão: o corpo, o tampo e o que vai em cima
  const corpo = tipo === "fogao" ? caixa(T, ALTURA - 0.06, T, "#3a3f46", 0, (ALTURA - 0.06) / 2, 0) : caixa(T, ALTURA - 0.06, T, mFrente, 0, (ALTURA - 0.06) / 2, 0);
  g.add(corpo);
  g.add(caixa(T * 1.002, 0.06, T * 1.002, tipo === "fogao" ? mat("#4a4f57") : mAco, 0, ALTURA - 0.03, 0));
  if (tipo === "tabua") {
    g.add(caixa(T * 0.72, 0.05, T * 0.5, mMadeira, 0, ALTURA + 0.025, 0));
    const faca = new THREE.Group(); faca.add(caixa(0.36, 0.015, 0.07, "#dfe6ea", 0.12, 0, 0, { metalness: 0.8, roughness: 0.25 })); faca.add(caixa(0.16, 0.03, 0.05, "#2b2b2b", -0.13, 0, 0));
    faca.position.set(T * 0.22, ALTURA + 0.06, T * 0.32); faca.rotation.y = 0.5; g.add(faca); g.userData.faca = faca;
  }
  if (tipo === "fogao") {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, emissive: 0xff4a1a, emissiveIntensity: 0 }));
    anel.rotation.x = Math.PI / 2; anel.position.y = ALTURA + 0.01; g.add(anel); g.userData.chama = anel;
    const fogo = new THREE.Group();
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, p = bola(0.055, k % 2 ? "#ff9c28" : "#3caeff", Math.cos(a) * 0.27, ALTURA + 0.09, Math.sin(a) * 0.27, 0.65, 1.7, 0.65);
      fogo.add(p);
    }
    fogo.visible = false; g.add(fogo); g.userData.fogo = fogo;
    for (const s of [-1, 1]) g.add(cil(0.05, 0.06, "#c8ccd2", s * 0.3, 0.6, T / 2 + 0.02)); // os botões
  }
  if (tipo === "pia") {
    g.add(caixa(T * 0.7, 0.04, T * 0.6, "#5b8db0", 0, ALTURA - 0.04, 0, { metalness: 0.2, roughness: 0.15 }));
    g.add(cil(0.04, 0.4, "#c8ccd2", 0, ALTURA + 0.2, -T * 0.38, { metalness: 0.8, roughness: 0.2 }));
    g.add(caixa(0.05, 0.05, 0.28, "#c8ccd2", 0, ALTURA + 0.38, -T * 0.26, { metalness: 0.8, roughness: 0.2 }));
    const agua = new THREE.Group();
    for (let k = 0; k < 5; k++) agua.add(bola(0.025, "#a8e5ff", 0, ALTURA + 0.31 - k * 0.07, -T * 0.12));
    agua.visible = false; g.add(agua); g.userData.agua = agua;
  }
  if (tipo === "escorredor") { g.add(caixa(T * 0.8, 0.03, T * 0.5, "#c8ccd2", 0, ALTURA + 0.015, 0)); for (const s of [-1, 1]) g.add(caixa(T * 0.8, 0.12, 0.02, "#c8ccd2", 0, ALTURA + 0.06, s * T * 0.25)); }
  if (tipo === "entrega") {
    for (let i = 0; i < 6; i++) g.add(caixa(T / 6 - 0.02, 0.02, T * 0.9, i % 2 ? "#2b2b2b" : "#f2c230", -T / 2 + T / 12 + i * T / 6, ALTURA + 0.01, 0));
    g.add(cil(0.12, 0.08, "#d4a92a", T * 0.32, ALTURA + 0.05, -T * 0.32, { metalness: 0.8, roughness: 0.3 })); g.add(bola(0.03, "#3a3a3a", T * 0.32, ALTURA + 0.12, -T * 0.32));
  }
  if (tipo === "retorno") { g.add(caixa(T * 0.7, 0.03, T * 0.7, "#2a2d33", 0, ALTURA + 0.005, 0)); g.add(caixa(T * 0.74, 0.04, 0.06, "#f2c230", 0, ALTURA + 0.02, T * 0.37)); }
  return g;
}

// ---------- a comida ----------
function ingInteiro(t, e) {
  const d = K.INGREDIENTES[t], g = new THREE.Group(), cor = e === "queimado" ? "#1c1c1c" : e === "frito" ? "#6b3a1f" : e === "assado" ? "#d89a48" : d.cor;
  switch (d.forma) {
    case "disco": g.add(cil(0.22, 0.04, cor, 0, 0.02, 0)); if (e === "assado") g.add(cil(0.17, 0.045, "#e8b867", 0, 0.025, 0)); break;
    case "queijo": { const q = caixa(0.26, 0.14, 0.18, cor, 0, 0.07, 0); q.rotation.y = 0.4; g.add(q); g.add(bola(0.03, d.cor2, 0.05, 0.14, 0.02)); break; }
    case "cogumelo": g.add(cil(0.05, 0.12, d.cor2, 0, 0.06, 0)); g.add(bola(0.15, cor, 0, 0.14, 0, 1, 0.6, 1)); break;
    case "comprido": { const m = cil(0.07, 0.42, cor, 0, 0.08, 0); m.rotation.z = Math.PI / 2; g.add(m); break; }
    case "bife": g.add(cil(0.17, 0.08, cor, 0, 0.04, 0)); if (e !== "frito" && e !== "queimado") g.add(cil(0.08, 0.085, d.cor2, 0.05, 0.04, 0.03)); break;
    case "pao": g.add(cil(0.17, 0.06, d.cor2, 0, 0.03, 0)); g.add(bola(0.17, cor, 0, 0.06, 0, 1, 0.55, 1)); break;
    case "peixe": g.add(bola(0.12, cor, 0, 0.09, 0, 1.8, 0.75, 1)); { const r = caixa(0.1, 0.12, 0.02, cor, -0.24, 0.09, 0); r.rotation.z = 0.6; g.add(r); } break;
    case "saco": g.add(caixa(0.26, 0.26, 0.2, cor, 0, 0.13, 0)); g.add(caixa(0.2, 0.04, 0.16, d.cor2, 0, 0.27, 0)); break;
    case "folha": g.add(caixa(0.3, 0.02, 0.3, cor, 0, 0.01, 0)); break;
    default: g.add(bola(0.17, cor, 0, 0.16, 0)); g.add(cil(0.025, 0.07, d.cor2, 0, 0.33, 0));
  }
  return g;
}
// picado: um montinho de pedaços nas duas cores do ingrediente
function ingPicado(t, e, r = 0.16) {
  const d = K.INGREDIENTES[t], g = new THREE.Group();
  const cores = e === "queimado" ? ["#1c1c1c", "#2c2c2c"] : e === "frito" ? ["#6b3a1f", "#8a4e2a"] : [d.cor, d.cor2];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, rr = (i % 3) * r * 0.32;
    const p = caixa(0.09, 0.05, 0.09, cores[i % 3 === 2 ? 1 : 0], Math.cos(a) * rr, 0.03 + (i > 4 ? 0.05 : 0), Math.sin(a) * rr);
    p.rotation.y = a; g.add(p);
  }
  return g;
}
export function ingrediente(t, e) { return e === "picado" || (e === "cozido" && K.INGREDIENTES[t].forma !== "saco") ? ingPicado(t, e) : t === "arroz" && e === "cozido" ? bolinhoArroz() : ingInteiro(t, e); }
// a pizza: a massa, o molho e o queijo derretido (ou em cubinhos, antes de assar); queimada, fica preta
function pizza(c, y = 0) {
  const g = new THREE.Group(), q = c.some((i) => i.e === "queimado"), m = c.find((i) => i.t === "massa"), assou = m && m.e === "assado";
  if (m) g.add(cil(0.25, 0.04, q ? "#1c1c1c" : assou ? "#d89a48" : K.INGREDIENTES.massa.cor, 0, y + 0.02, 0));
  if (c.some((i) => i.t === "tomate")) g.add(cil(0.2, 0.012, q ? "#2a1a17" : "#c8352a", 0, y + 0.046, 0));
  if (c.some((i) => i.t === "queijo")) {
    if (assou && !q) { g.add(cil(0.17, 0.012, "#f7d36a", 0, y + 0.056, 0)); for (let k = 0; k < 5; k++) g.add(cil(0.035, 0.013, "#e9a92a", Math.cos(k * 1.3) * 0.1, y + 0.062, Math.sin(k * 1.3) * 0.1)); }
    else { const p = ingPicado("queijo", q ? "queimado" : "picado", 0.12); p.scale.setScalar(0.7); p.position.y = y + 0.05; g.add(p); }
  }
  if (!m) c.forEach((i, k) => { const p = ingPicado(i.t, i.e, 0.1); p.scale.setScalar(0.6); p.position.set(Math.cos(k * 2.1) * 0.1, y + 0.02, Math.sin(k * 2.1) * 0.1); g.add(p); });
  return g;
}
function assadeira(o) {
  const g = new THREE.Group();
  g.add(cil(0.31, 0.025, "#5b5f66", 0, 0.012, 0, { metalness: 0.4, roughness: 0.45 })); g.add(cil(0.29, 0.03, "#3d4046", 0, 0.016, 0));
  if (o.c.length) g.add(pizza(o.c, 0.03));
  return g;
}
const bolinhoArroz = () => { const g = new THREE.Group(); g.add(bola(0.15, "#f7f4ea", 0, 0.08, 0, 1, 0.55, 1)); return g; };

// a cor do caldo: a média das cores dos ingredientes
function corCaldo(c) {
  if (c.some((i) => i.e === "queimado")) return "#1f1a17";
  const cs = c.map((i) => new THREE.Color(K.INGREDIENTES[i.t].cor)); const r = cs.reduce((a, b) => a.add(b), new THREE.Color(0, 0, 0)).multiplyScalar(1 / cs.length);
  return "#" + r.getHexString();
}
function panela(o) {
  const g = new THREE.Group();
  const lado = new THREE.Mesh(geo.tubo, mPanela); lado.scale.set(0.3, 0.3, 0.3); lado.position.y = 0.15; lado.castShadow = true; g.add(lado); // aberta em cima: dá para ver o caldo
  g.add(cil(0.28, 0.02, "#8e98a2", 0, 0.01, 0));
  for (const s of [-1, 1]) g.add(caixa(0.12, 0.04, 0.06, "#3a3a3a", s * 0.36, 0.26, 0));
  if (o.c.length) {
    const caldo = cil(0.27, 0.02, corCaldo(o.c), 0, 0.06 + 0.2 * (o.c.length / K.RECIPIENTES.panela.cap), 0, { roughness: 0.35 });
    g.add(caldo);
    // os pedaços que ainda não derreteram no caldo
    if (!K.pronto(o) && !o.q) o.c.forEach((i, k) => { const p = ingPicado(i.t, i.e, 0.1); p.scale.setScalar(0.6); p.position.set(Math.cos(k * 2.1) * 0.12, caldo.position.y, Math.sin(k * 2.1) * 0.12); g.add(p); });
  }
  return g;
}
function frigideira(o) {
  const g = new THREE.Group();
  g.add(cil(0.27, 0.06, "#4a4a52", 0, 0.03, 0, { metalness: 0.2, roughness: 0.5 }));
  g.add(caixa(0.36, 0.04, 0.07, "#1a1a1a", 0.43, 0.06, 0));
  for (const i of o.c) { const b = ingInteiro(i.t, i.e === "picado" ? "cru" : i.e); b.position.y = 0.05; g.add(b); if (i.t === "carne" && b.children[0]?.material) { b.children[0].material = b.children[0].material.clone(); g.userData.carne = b.children[0]; } }
  return g;
}
function prato(o) {
  const g = new THREE.Group();
  g.add(cil(0.34, 0.035, "#f7f7f5", 0, 0.018, 0, { roughness: 0.25 })); g.add(cil(0.24, 0.04, "#e6e6e2", 0, 0.02, 0, { roughness: 0.25 }));
  const c = o.c; if (!c.length) return g;
  const r = K.receitaDe(c);
  if (r && K.RECEITAS[r].sopa || c.every((i) => i.e === "cozido" && K.INGREDIENTES[i.t].passos.includes("cozinhar") && i.t !== "arroz")) { // a sopa vai na tigela
    g.add(cil(0.22, 0.16, "#fbfbf8", 0, 0.12, 0, { roughness: 0.3 })); g.add(cil(0.19, 0.02, corCaldo(c), 0, 0.2, 0, { roughness: 0.35 }));
    return g;
  }
  if (c.some((i) => i.t === "massa")) { g.add(pizza(c, 0.035)); return g; }
  if (c.some((i) => i.t === "tortilha")) { // o burrito: a tortilha aberta e, com recheio, enrolada (com a ponta do recheio aparecendo)
    const tor = K.INGREDIENTES.tortilha;
    if (c.length === 1) { g.add(cil(0.22, 0.03, tor.cor, 0, 0.05, 0)); return g; }
    const rolo = cil(0.1, 0.42, tor.cor, 0, 0.12, 0); rolo.rotation.z = Math.PI / 2; g.add(rolo);
    const recheio = c.some((i) => i.t === "carne") ? "#6b3a1f" : "#f4f1e6", ponta = cil(0.085, 0.02, recheio, 0.21, 0.12, 0); ponta.rotation.z = Math.PI / 2; g.add(ponta);
    for (const s of [-0.1, 0.06]) { const f = cil(0.102, 0.02, tor.cor2, s, 0.12, 0); f.rotation.z = Math.PI / 2; g.add(f); }
    return g;
  }
  if (c.some((i) => i.t === "alga") && c.some((i) => i.t === "arroz")) { // o sushi: três rolinhos de alga com o arroz e o recheio no meio
    const meio = c.find((i) => i.t !== "alga" && i.t !== "arroz");
    for (let k = 0; k < 3; k++) { const x0 = (k - 1) * 0.15; g.add(cil(0.07, 0.08, K.INGREDIENTES.alga.cor, x0, 0.08, 0)); g.add(cil(0.055, 0.082, "#f7f4ea", x0, 0.081, 0)); if (meio) g.add(cil(0.025, 0.084, K.INGREDIENTES[meio.t].cor, x0, 0.082, 0)); }
    return g;
  }
  if (c.length === 1 && c[0].t === "peixe" && c[0].e === "picado") { // o sashimi: as fatias em leque
    for (let k = 0; k < 4; k++) { const f = caixa(0.2, 0.035, 0.08, K.INGREDIENTES.peixe.cor, -0.06 + k * 0.05, 0.05 + k * 0.004, 0); f.rotation.y = -0.4 + k * 0.25; g.add(f); g.add(caixa(0.2, 0.004, 0.012, "#fff2e8", -0.06 + k * 0.05, 0.07 + k * 0.004, 0.02)); }
    return g;
  }
  if (c.some((i) => i.t === "pao")) { // o lanche: pão de baixo, o recheio e o pão de cima
    let y = 0.04; g.add(cil(0.17, 0.06, K.INGREDIENTES.pao.cor2, 0, y + 0.03, 0)); y += 0.06;
    for (const t of ["carne", "alface", "tomate"]) { const i = c.find((x) => x.t === t); if (!i) continue; const cor = t === "carne" ? (i.e === "frito" ? "#6b3a1f" : K.INGREDIENTES.carne.cor) : K.INGREDIENTES[t].cor; g.add(cil(t === "carne" ? 0.18 : 0.19, t === "carne" ? 0.07 : 0.025, cor, 0, y + 0.03, 0)); y += t === "carne" ? 0.07 : 0.03; }
    if (c.length > 1) g.add(bola(0.17, K.INGREDIENTES.pao.cor, 0, y, 0, 1, 0.55, 1));
    return g;
  }
  c.forEach((i, k) => { const p = ingrediente(i.t, i.e); p.scale.setScalar(0.75); const a = k * 2.1; p.position.set(c.length > 1 ? Math.cos(a) * 0.12 : 0, 0.03, c.length > 1 ? Math.sin(a) * 0.12 : 0); g.add(p); });
  return g;
}
function sujos(n) {
  const g = new THREE.Group();
  for (let k = 0; k < Math.min(n, 6); k++) { g.add(cil(0.34, 0.035, "#e2ddd2", 0, 0.02 + k * 0.045, 0, { roughness: 0.6 })); g.add(cil(0.12, 0.004, "#8a6a40", 0.06, 0.04 + k * 0.045, -0.04)); }
  return g;
}
// o modelo de qualquer coisa que vai na mão ou na bancada (origem embaixo)
export function item(o) {
  if (!o) return null;
  if (o.k === "ing") return ingrediente(o.t, o.e);
  if (o.k === "panela") return panela(o);
  if (o.k === "frigideira") return frigideira(o);
  if (o.k === "assadeira") return assadeira(o);
  if (o.k === "prato") return prato(o);
  if (o.k === "sujos") return sujos(o.n);
  return new THREE.Group();
}
// os pratos limpos em pé no escorredor
export function pilha(n) {
  const g = new THREE.Group(), q = Math.min(n, 8);
  for (let k = 0; k < q; k++) { const p = cil(0.3, 0.035, "#fbfbf8", (k - (q - 1) / 2) * 0.13, 0.3, 0, { roughness: 0.25 }); p.rotation.z = Math.PI / 2 - 0.15; g.add(p); }
  return g;
}

// o chapéu de cozinheiro
export function chapeu() {
  const g = new THREE.Group(), b = "#fbfbfb";
  g.add(cil(0.2, 0.14, b, 0, 0.07, 0, { roughness: 0.7 }));
  for (let k = 0; k < 5; k++) g.add(bola(0.12, b, Math.cos(k * 1.256) * 0.11, 0.24, Math.sin(k * 1.256) * 0.11));
  g.add(bola(0.13, b, 0, 0.3, 0));
  return g;
}

// a barra de progresso (sempre de frente para a câmera)
export function barra() {
  const g = new THREE.Group();
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.14), new THREE.MeshBasicMaterial({ color: 0x1b1b1b, depthTest: false }));
  const cheio = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.08), new THREE.MeshBasicMaterial({ color: 0x4cd964, depthTest: false }));
  fundo.renderOrder = 20; cheio.renderOrder = 21; cheio.position.z = 0.001; g.add(fundo, cheio);
  g.userData.set = (v, cor = 0x4cd964) => { v = Math.max(0, Math.min(1, v)); cheio.scale.x = Math.max(0.001, v); cheio.position.x = -0.37 * (1 - v); cheio.material.color.setHex(cor); };
  return g;
}
// o aviso de "vai queimar" (um triângulo piscando)
export function aviso() {
  const tex = canvasTex(64, 64, (x) => { x.fillStyle = "#ffcc00"; x.beginPath(); x.moveTo(32, 4); x.lineTo(60, 58); x.lineTo(4, 58); x.closePath(); x.fill(); x.strokeStyle = "#1b1b1b"; x.lineWidth = 4; x.stroke(); x.fillStyle = "#1b1b1b"; x.fillRect(29, 20, 6, 22); x.fillRect(29, 46, 6, 6); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); s.scale.set(0.55, 0.55, 1); s.renderOrder = 22;
  return s;
}
export function numero(n) {
  const tex = canvasTex(64, 64, (x) => { x.fillStyle = "#fff8ea"; x.beginPath(); x.arc(32, 32, 27, 0, Math.PI * 2); x.fill(); x.strokeStyle = "#59402c"; x.lineWidth = 5; x.stroke(); x.fillStyle = "#2a1d17"; x.font = "bold 34px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(n), 32, 35); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); s.scale.set(0.42, 0.42, 1); s.renderOrder = 22; return s;
}

// o nome do que o cozinheiro está segurando, pequeno, em cima da cabeça (para quem está aprendendo)
export function rotulo(texto) {
  const cv = document.createElement("canvas"), x = cv.getContext("2d"), fonte = "bold 26px sans-serif";
  x.font = fonte; const w = Math.ceil(x.measureText(texto).width) + 24; cv.width = w; cv.height = 40;
  x.fillStyle = "#2a1d17d9"; x.beginPath(); x.roundRect(0, 2, w, 36, 12); x.fill();
  x.font = fonte; x.fillStyle = "#fff8ea"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, 21);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(0.3 * w / 40, 0.3, 1); s.renderOrder = 23;
  return s;
}
// as bolinhas em cima da panela e do prato, como no Overcooked: cada ingrediente que está dentro (cheio) e, no prato
// montando, o que ainda falta da receita mais perto (tracejado e apagado)
const texBolinha = new Map();
function bolinhaTex(t, e, falta) {
  const chave = t + ":" + e + (falta ? ":f" : "");
  if (!texBolinha.has(chave)) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 48; const x = cv.getContext("2d");
    x.fillStyle = e === "queimado" ? "#4a4440" : "#fff8ea"; x.beginPath(); x.arc(24, 24, 21, 0, 7); x.fill();
    x.strokeStyle = falta ? "#2a1d17" : "#59402c"; x.lineWidth = 3; if (falta) x.setLineDash([5, 4]); x.stroke();
    pintarIng(x, t, e === "picado" ? "picado" : "cru", 24, 24, 13);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; texBolinha.set(chave, tex);
  }
  return texBolinha.get(chave);
}
export function bolinhas(tem, falta = []) {
  const g = new THREE.Group(), todos = [...tem.map((i) => [...i, false]), ...falta.map((i) => [...i, true])];
  todos.forEach(([t, e, f], k) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bolinhaTex(t, e, f), depthTest: false, transparent: true, opacity: f ? 0.6 : 1 }));
    s.scale.set(0.42, 0.42, 1); s.position.set((k - (todos.length - 1) / 2) * 0.44, 0, 0); s.renderOrder = 22; s.userData.falta = f; g.add(s);
  });
  return g;
}

// ---------- ícones 2D (pedidos e caixas) ----------
// desenha o ingrediente num canvas 2D: a bolinha na cor dele, com o jeito do estado
export function pintarIng(x, t, e, cx, cy, r) {
  const d = K.INGREDIENTES[t];
  x.save(); x.translate(cx, cy);
  const corpo = (cor) => { x.fillStyle = cor; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.strokeStyle = "#00000055"; x.lineWidth = Math.max(1, r * 0.12); x.stroke(); };
  if (d.forma === "disco") { x.fillStyle = e === "assado" ? "#d89a48" : d.cor; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.strokeStyle = d.cor2; x.lineWidth = Math.max(1, r * 0.15); x.stroke(); }
  else if (d.forma === "queijo" && e !== "picado") { x.fillStyle = d.cor; x.beginPath(); x.moveTo(-r, r * 0.6); x.lineTo(r, r * 0.6); x.lineTo(r * 0.6, -r * 0.6); x.closePath(); x.fill(); x.fillStyle = d.cor2; x.beginPath(); x.arc(r * 0.2, r * 0.2, r * 0.16, 0, 7); x.fill(); }
  else if (e === "picado" || e === "cozido" || e === "frito") {
    const cores = e === "frito" ? ["#6b3a1f", "#8a4e2a"] : [d.cor, d.cor2];
    for (let i = 0; i < 6; i++) { const a = i * 1.05, rr = r * 0.45; x.fillStyle = cores[i % 2]; x.fillRect(Math.cos(a) * rr - r * 0.28, Math.sin(a) * rr - r * 0.28, r * 0.56, r * 0.56); }
  } else if (d.forma === "pao") { x.fillStyle = d.cor; x.beginPath(); x.ellipse(0, r * 0.1, r, r * 0.7, 0, Math.PI, 0); x.fill(); x.fillStyle = d.cor2; x.fillRect(-r, r * 0.1, 2 * r, r * 0.35); }
  else if (d.forma === "folha") { x.fillStyle = d.cor; x.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); x.fillStyle = d.cor2; x.fillRect(-r * 0.8, -r * 0.2, r * 1.6, r * 0.25); }
  else if (d.forma === "saco") { x.fillStyle = d.cor; x.fillRect(-r * 0.75, -r * 0.6, r * 1.5, r * 1.5); x.fillStyle = d.cor2; x.fillRect(-r * 0.6, -r * 0.9, r * 1.2, r * 0.4); }
  else if (d.forma === "bife") { x.fillStyle = d.cor; x.beginPath(); x.ellipse(0, 0, r, r * 0.75, 0.3, 0, 7); x.fill(); x.fillStyle = d.cor2; x.beginPath(); x.arc(r * 0.3, -r * 0.1, r * 0.25, 0, 7); x.fill(); }
  else if (d.forma === "cogumelo") { x.fillStyle = d.cor2; x.fillRect(-r * 0.25, 0, r * 0.5, r * 0.8); x.fillStyle = d.cor; x.beginPath(); x.ellipse(0, 0, r, r * 0.7, 0, Math.PI, 0); x.fill(); }
  else if (d.forma === "peixe") { x.fillStyle = d.cor; x.beginPath(); x.ellipse(-r * 0.1, 0, r * 0.85, r * 0.5, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(r * 0.6, 0); x.lineTo(r, -r * 0.45); x.lineTo(r, r * 0.45); x.fill(); }
  else if (d.forma === "comprido") { x.fillStyle = d.cor; x.beginPath(); x.ellipse(0, 0, r, r * 0.45, -0.5, 0, 7); x.fill(); }
  else { corpo(d.cor); x.fillStyle = d.cor2; x.fillRect(-r * 0.12, -r * 1.15, r * 0.24, r * 0.4); }
  x.restore();
}
const icones = new Map();
function iconeTex(t) {
  if (!icones.has(t)) icones.set(t, canvasTex(64, 64, (x) => { x.fillStyle = "#7a5230"; x.fillRect(2, 2, 60, 60); x.fillStyle = "#94683c"; x.fillRect(6, 6, 52, 52); pintarIng(x, t, "cru", 32, 34, 21); }));
  return icones.get(t);
}
// o desenho do prato pronto de uma receita (para o cartão do pedido), em data URL
const figuras = new Map();
export function figuraReceita(id) {
  if (figuras.has(id)) return figuras.get(id);
  const R = K.RECEITAS[id], cv = document.createElement("canvas"); cv.width = cv.height = 96;
  const x = cv.getContext("2d");
  x.fillStyle = "#ffffff"; x.beginPath(); x.ellipse(48, 58, 42, 26, 0, 0, 7); x.fill(); x.strokeStyle = "#cfcfc8"; x.lineWidth = 3; x.stroke();
  const itens = R.itens.map((k) => k.split(":"));
  if (R.figura === "pizza") {
    x.fillStyle = "#d89a48"; x.beginPath(); x.arc(48, 52, 30, 0, 7); x.fill();
    if (itens.some(([t]) => t === "tomate")) { x.fillStyle = "#c8352a"; x.beginPath(); x.arc(48, 52, 24, 0, 7); x.fill(); }
    x.fillStyle = "#f7d36a"; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(48 + Math.cos(k * 0.9) * 13, 52 + Math.sin(k * 0.9) * 13, 6, 0, 7); x.fill(); }
  } else if (R.figura === "burrito") {
    x.save(); x.translate(48, 52); x.rotate(-0.35); x.fillStyle = K.INGREDIENTES.tortilha.cor; x.fillRect(-30, -11, 60, 22); x.fillStyle = K.INGREDIENTES.tortilha.cor2; x.fillRect(-10, -11, 3, 22); x.fillRect(8, -11, 3, 22);
    x.fillStyle = itens.some(([t]) => t === "carne") ? "#6b3a1f" : "#f4f1e6"; x.beginPath(); x.ellipse(30, 0, 5, 10, 0, 0, 7); x.fill(); x.restore();
  } else if (R.figura === "sushi") {
    const meio = itens.find(([t]) => t !== "alga" && t !== "arroz");
    for (let k = 0; k < 3; k++) { const cx = 26 + k * 22; x.fillStyle = K.INGREDIENTES.alga.cor; x.beginPath(); x.arc(cx, 52, 11, 0, 7); x.fill(); x.fillStyle = "#f7f4ea"; x.beginPath(); x.arc(cx, 52, 8, 0, 7); x.fill(); x.fillStyle = K.INGREDIENTES[meio[0]].cor; x.beginPath(); x.arc(cx, 52, 3.5, 0, 7); x.fill(); }
  } else if (R.figura === "sashimi") {
    for (let k = 0; k < 4; k++) { x.save(); x.translate(34 + k * 9, 52); x.rotate(-0.5 + k * 0.3); x.fillStyle = K.INGREDIENTES.peixe.cor; x.fillRect(-6, -14, 12, 28); x.fillStyle = "#fff2e8"; x.fillRect(-1, -14, 2, 28); x.restore(); }
  } else if (R.sopa) { x.fillStyle = "#fbfbf8"; x.beginPath(); x.ellipse(48, 50, 28, 18, 0, 0, 7); x.fill(); x.strokeStyle = "#d8d8d0"; x.stroke(); x.fillStyle = K.INGREDIENTES[itens[0][0]].cor; x.beginPath(); x.ellipse(48, 47, 22, 12, 0, 0, 7); x.fill(); }
  else if (itens.some(([t]) => t === "pao")) {
    let y = 64; x.fillStyle = K.INGREDIENTES.pao.cor2; x.fillRect(24, y - 6, 48, 8);
    for (const [t, e] of itens) if (t !== "pao") { x.fillStyle = t === "carne" ? (e === "frito" ? "#6b3a1f" : K.INGREDIENTES.carne.cor) : K.INGREDIENTES[t].cor; const hh = t === "carne" ? 10 : 5; y -= hh; x.fillRect(22, y - 6, 52, hh); }
    x.fillStyle = K.INGREDIENTES.pao.cor; x.beginPath(); x.ellipse(48, y - 6, 26, 16, 0, Math.PI, 0); x.fill();
  } else itens.forEach(([t, e], k) => pintarIng(x, t, e, 48 + (itens.length > 1 ? Math.cos(k * 2.1 + 0.5) * 16 : 0), 54 + (itens.length > 1 ? Math.sin(k * 2.1 + 0.5) * 9 : 0), 15));
  const url = cv.toDataURL(); figuras.set(id, url); return url;
}
// o ícone pequeno de um ingrediente no estado pedido (data URL)
const pequenos = new Map();
export function iconeIng(t, e) {
  const k = t + ":" + e; if (pequenos.has(k)) return pequenos.get(k);
  const cv = document.createElement("canvas"); cv.width = cv.height = 48; const x = cv.getContext("2d");
  x.fillStyle = "#fff8ea"; x.beginPath(); x.arc(24, 24, 22, 0, 7); x.fill();
  pintarIng(x, t, e === "cozido" || e === "frito" ? "cru" : e, 24, 24, 13);
  if (e === "assado") { x.fillStyle = "#c8352a"; x.font = "bold 13px sans-serif"; x.textAlign = "center"; x.fillText("♨", 37, 15); }
  const url = cv.toDataURL(); pequenos.set(k, url); return url;
}
