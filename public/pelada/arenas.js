// Pelada da Galera — as quadras: Society, Rio, Ginásio, Estádio Elétrico (Strikers) e a arena arredondada do Rocket,
// com cerca, gols e as placas de quem defende cada gol.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { E, C, $, store, clamp, SIDES, kitOf, G, offline, myKit, myAttackTeam } from "./estado.js";
import { scene, cam, rng, canvasTex, M, sky, pintarCeu, hemiL, sunL, ballTex, beachTex, ballMesh, blob, liberar } from "./cena.js";

// ======================================================================
// Quadras (arenas): o tamanho e a física são os mesmos; muda o visual. O organizador escolhe na sala (config.arena)
// e todo mundo monta a mesma; no treino vale a escolha da tela inicial. O Rocket usa sempre a "society".
// Texturas: cada piso é desenhado num canvas; se a foto existir (ex.: public/pelada/texturas/madeira.jpg), ela é
// usada como base do desenho (as linhas continuam por cima).
// ======================================================================
const ARENAS_CONFIG = {
  society: { // a quadra de sempre: grama sintética no fim de tarde, alambrado e torcida de um lado
    piso: { textura: "/pelada/texturas/grama.jpg", metrosFoto: 2, tipo: "grama", roughness: 0.95, metalness: 0, linhas: "#f4f4f0" },
    ambiente: { ceu: 0xd8e8ff, chao: 0x4a6a3a, intensidade: 1.4 },
    luz: { tipo: "sol", cor: 0xfff0d8, intensidade: 2.4, pos: [-18, 34, 22] },
    fundo: { tipo: "ceu", cores: [0x3a6fb8, 0x9fc6ea, 0xf4d6a8], neblina: 0xcfdde8, longe: 260 },
    paredes: "alambrado", muretas: "propaganda", refletores: "torres", arquibancada: "torcida",
  },
  rio: { // quadra de rua: cimento pintado, mureta de tijolo grafitada, sol forte e o morro cheio de casinhas
    piso: { textura: "/pelada/texturas/cimento.jpg", metrosFoto: 3, tipo: "cimento", roughness: 0.82, metalness: 0, linhas: "#fff6c2" },
    ambiente: { ceu: 0xcfe8ff, chao: 0xb08a5a, intensidade: 1.2 },
    luz: { tipo: "sol", cor: 0xfff2d6, intensidade: 3.6, pos: [-10, 40, 14] },
    fundo: { tipo: "ceu", cores: [0x1f7fe0, 0x8fd3ff, 0xffe6b8], neblina: 0xbfe2ff, longe: 420 },
    paredes: "alambrado", muretas: "tijolo", refletores: "nenhum", arquibancada: "morro",
  },
  ginasio: { // liga profissional: taco de madeira que reflete, refletores no teto, paredes fechadas e arquibancada escura
    piso: { textura: "/pelada/texturas/madeira.jpg", metrosFoto: 1.5, tipo: "madeira", roughness: 0.22, metalness: 0, linhas: "#ffffff" }, // liso: brilha com a luz do teto
    ambiente: { ceu: 0x9aa3b5, chao: 0x3a2a1a, intensidade: 0.85 },
    luz: { tipo: "refletores", cor: 0xfff6e8, intensidade: 2.1, pos: [0, 40, 1] },
    fundo: { tipo: "cor", cor: 0x0c0e13, neblina: 0x0c0e13, longe: 200 },
    paredes: "fechadas", muretas: "acolchoadas", refletores: "teto", arquibancada: "escura",
  },
  eletrico: { // Strikers: estádio noturno, gramado escuro com linhas neon e a cerca elétrica em volta (dá choque)
    piso: { tipo: "neon", roughness: 0.9, metalness: 0, linhas: "#7ff7ff", brilho: true },
    ambiente: { ceu: 0x8a7cff, chao: 0x0d2a24, intensidade: 1.05 },
    luz: { tipo: "refletores", cor: 0xe8f0ff, intensidade: 2.3, pos: [-12, 40, 16] },
    fundo: { tipo: "ceu", cores: [0x05061a, 0x241046, 0x5a2266], neblina: 0x120a2a, longe: 240 },
    paredes: "eletrica", muretas: "neon", refletores: "torres", arquibancada: "escura",
  },
};
// foto de textura (só baixa uma vez; se não existir, a promessa falha e fica o desenho)
const fotos = {};
const foto = (url) => (fotos[url] ||= new Promise((ok, erro) => { const img = new Image(); img.onload = () => ok(img); img.onerror = erro; img.src = url; }));

let goalSigns = [];
export let arena = null, arenaMode = null, arenaKits = null, arenaId = null, pads = [];
function arenaEscolhida(mode) {
  if (mode === "carros") return "ginasio"; // o Rocket é sempre no ginásio (com a arena arredondada, buildArenaRocket)
    const id = offline() ? store.get("pelada:arena") : E.S && E.S.config.arena;
  return ARENAS_CONFIG[id] ? id : "society";
}
// a cerca elétrica treme: a cada quadro os raios pulam para outro lugar e piscam
export function animarArena(t) {
  const raios = arena && arena.userData.raios; if (!raios || !raios.length) return;
  for (const m of raios) { m.map.offset.x = Math.random(); m.map.offset.y = (Math.random() - 0.5) * 0.08; m.opacity = 0.55 + Math.random() * 0.45; }
}
export function ensureArena(mode) {
  const kits = E.S ? `${E.S.kits.A}|${E.S.kits.B}` : "", id = arenaEscolhida(mode);
  if (arenaMode === mode && arenaId === id && (mode !== "carros" || arenaKits === kits)) return;
  arenaMode = mode; arenaKits = kits; carregarArena(id, mode);
}
// monta a quadra pedida: tira a anterior (e libera a memória), troca luzes, céu e neblina, e monta a nova
function carregarArena(id, mode = arenaMode || "pes") {
  id = ARENAS_CONFIG[id] ? id : "society";
  const cfg = ARENAS_CONFIG[id], F = mode === "carros" ? C.MODES.carros : G.F, s = F.L / 20;
  if (arena) { scene.remove(arena); liberar(arena); arena = null; }
  arenaId = id;
  // luz ambiente e luz principal (sol ou a luz geral do teto, que faz as sombras)
  hemiL.color.setHex(cfg.ambiente.ceu); hemiL.groundColor.setHex(cfg.ambiente.chao); hemiL.intensity = cfg.ambiente.intensidade;
  const [lx, ly, lz] = cfg.luz.pos;
  sunL.color.setHex(cfg.luz.cor); sunL.intensity = cfg.luz.intensidade;
  sunL.position.set(lx * s, ly * s, lz * s); sunL.target.position.set(0, 0, 0);
  Object.assign(sunL.shadow.camera, { left: -F.L - 10, right: F.L + 10, top: F.W + 10, bottom: -F.W - 10, near: 1, far: 140 * s }); sunL.shadow.camera.updateProjectionMatrix();
  // fundo: céu aberto (degradê) ou cor fechada (ginásio)
  if (cfg.fundo.tipo === "ceu") { pintarCeu(cfg.fundo.cores); sky.visible = true; scene.background = null; }
  else { sky.visible = false; scene.background = new THREE.Color(cfg.fundo.cor); }
  scene.fog.color.setHex(cfg.fundo.neblina); scene.fog.near = 80 * s; scene.fog.far = cfg.fundo.longe * s;
  arena = buildArena(F, cfg); fundirEstaticas(arena); scene.add(arena);
  ballMesh.scale.setScalar(F.ballR); blob.scale.setScalar(F.ballR / 0.15);
  ballMesh.material.map = mode === "carros" ? beachTex : ballTex; ballMesh.material.roughness = mode === "carros" ? 0.3 : 0.45; ballMesh.material.needsUpdate = true;
}
// junta as peças fixas de cor lisa da quadra (traves, postes, arquibancada, alambrado...) em poucas peças, uma por
// acabamento, com a cor de cada uma nos vértices: a quadra fica igual e passa de ~90 para ~20 peças desenhadas.
// Fica de fora o que o jogo mexe depois (a faixa colorida do gol, as bolinhas de turbo, a cerca elétrica) e o que
// tem desenho, transparência ou brilho.
function fundirEstaticas(grp) {
  const fora = new Set();
  for (const p of pads) if (p.orb) p.orb.traverse((o) => fora.add(o));
  for (const g of goalSigns) { if (g.strip) fora.add(g.strip); if (g.spr) fora.add(g.spr); }
  grp.updateMatrixWorld(true);
  const lotes = new Map();
  grp.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || fora.has(o) || o.children.length || Array.isArray(o.material)) return;
    const m = o.material, tipo = m.isMeshStandardMaterial ? "s" : m.isMeshBasicMaterial ? "b" : null;
    if (!tipo || m.map || m.transparent || m.alphaTest || (m.emissive && m.emissive.getHex() !== 0) || m.vertexColors || !o.geometry.attributes.position) return;
    const k = [tipo, tipo === "s" ? m.roughness.toFixed(2) + "|" + m.metalness.toFixed(2) : "", m.side, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, m.fog ? 1 : 0].join("|");
    if (!lotes.has(k)) lotes.set(k, []);
    lotes.get(k).push(o);
  });
  for (const lista of lotes.values()) {
    if (lista.length < 2) continue;
    const geos = lista.map((o) => {
      const ge = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      for (const nome of Object.keys(ge.attributes)) if (nome !== "position" && nome !== "normal") ge.deleteAttribute(nome);
      if (!ge.attributes.normal) ge.computeVertexNormals();
      const n = ge.attributes.position.count, c = new Float32Array(n * 3), col = o.material.color;
      for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
      ge.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return ge;
    });
    const geo = mergeGeometries(geos); geos.forEach((g) => g.dispose()); if (!geo) continue;
    const m0 = lista[0].material;
    const mat = m0.isMeshStandardMaterial ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: m0.roughness, metalness: m0.metalness, side: m0.side }) : new THREE.MeshBasicMaterial({ vertexColors: true, side: m0.side, fog: m0.fog });
    const peca = new THREE.Mesh(geo, mat); peca.castShadow = lista[0].castShadow; peca.receiveShadow = lista[0].receiveShadow;
    for (const o of lista) { o.parent.remove(o); o.geometry.dispose(); o.material.dispose(); }
    grp.add(peca);
  }
}
const tons = (r, lista) => lista[Math.floor(r() * lista.length)];
function buildArena(F, cfg) {
  if (F.rc) return buildArenaRocket(F);
  const grp = new THREE.Group(), L = F.L, W = F.W, cars = F.id === "carros", PX = cars ? 25 : 50, P = cfg.piso;
  const add = (o) => (grp.add(o), o);
  // chão em volta da quadra (cimento, asfalto da rua ou o piso escuro do ginásio)
  const outCol = { grama: "#8d8f8a", cimento: "#6f675d", madeira: "#26282d" }[P.tipo];
  const out = add(new THREE.Mesh(new THREE.PlaneGeometry(L * 7, W * 9), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = outCol; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? "#0000000c" : "#ffffff0c"; x.fillRect(r() * w, r() * hh, 2, 2); } }, true), roughness: 1 })));
  out.material.map.repeat.set(L, W); out.rotation.x = -Math.PI / 2; out.position.y = -0.05; out.receiveShadow = true;
  // a quadra: base (grama, cimento pintado ou taco) e as linhas por cima
  const X = (v) => (v + L + 1) * PX, Z = (v) => (v + W + 1) * PX;
  const base = (x, w, hh, r) => {
    if (P.tipo === "grama") {
      const step = cars ? 4 : 2;
      for (let i = 0; i < 2 * L + 2; i += step) { x.fillStyle = (i / step) % 2 ? "#2f8f48" : "#2a8141"; x.fillRect(i * PX, 0, step * PX, hh); }
      if (cars && E.S) for (const [t, x0] of [["A", 0], ["B", X(0)]]) { x.globalAlpha = 0.14; x.fillStyle = C.kitColor(E.S.kits[t]); x.fillRect(x0, 0, w / 2, hh); x.globalAlpha = 1; }
      for (let i = 0; i < w * hh / 120; i++) { x.fillStyle = r() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(r() * w, r() * hh, 2, 3); }
    } else if (P.tipo === "neon") { // gramado escuro em faixas, com um desenho de hexágonos bem de leve
      for (let i = 0; i < 2 * L + 2; i += 3) { x.fillStyle = (i / 3) % 2 ? "#0f3b2f" : "#0c3328"; x.fillRect(i * PX, 0, 3 * PX, hh); }
      x.strokeStyle = "#7ff7ff10"; x.lineWidth = 2; const hx = 1.2 * PX;
      for (let row = 0; row * hx * 0.87 < hh; row++) for (let col = 0; col * hx * 1.5 < w + hx; col++) {
        const cx = col * hx * 1.5, cy = row * hx * 1.74 + (col % 2) * hx * 0.87; x.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; x.lineTo(cx + Math.cos(a) * hx, cy + Math.sin(a) * hx); } x.closePath(); x.stroke();
      }
      for (const sg of [-1, 1]) { const g = x.createRadialGradient(X(sg * L), Z(0), 0, X(sg * L), Z(0), F.areaR * PX); g.addColorStop(0, "#7ff7ff22"); g.addColorStop(1, "#7ff7ff00"); x.fillStyle = g; x.beginPath(); x.arc(X(sg * L), Z(0), F.areaR * PX, 0, 7); x.fill(); }
    } else if (P.tipo === "cimento") {
      x.fillStyle = "#cf5a3a"; x.fillRect(0, 0, w, hh); // faixa de fora: vermelho-terra
      x.fillStyle = "#2b6cb0"; x.fillRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX); // quadra azul
      x.fillStyle = "#3d8f4a"; for (const sg of [-1, 1]) { x.beginPath(); x.arc(X(sg * L), Z(0), F.areaR * PX, 0, 7); x.fill(); } // áreas verdes
      for (let i = 0; i < w * hh / 90; i++) { x.fillStyle = r() < 0.5 ? "#00000016" : "#ffffff14"; x.fillRect(r() * w, r() * hh, 2, 2); }
      for (let i = 0; i < 25; i++) { x.globalAlpha = 0.025 + r() * 0.035; x.fillStyle = "#ffffff"; x.beginPath(); x.arc(r() * w, r() * hh, (0.5 + r() * 2) * PX, 0, 7); x.fill(); } // tinta gasta
      x.globalAlpha = 1; x.strokeStyle = "#0000003a"; x.lineWidth = 2;
      for (let i = 0; i < 45; i++) { let px = r() * w, py = r() * hh; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * PX * 1.6; py += (r() - 0.5) * PX * 1.6; x.lineTo(px, py); } x.stroke(); } // rachaduras
    } else { // taco de madeira: réguas em fileiras, cada uma de um tom
      const ph = Math.max(4, Math.round(0.14 * PX));
      for (let y = 0, row = 0; y < hh; y += ph, row++) {
        let x0 = -r() * PX;
        while (x0 < w) {
          const len = (0.8 + r() * 1.2) * PX, k = r();
          x.fillStyle = `rgb(${Math.round(190 + k * 30)},${Math.round(130 + k * 30)},${Math.round(78 + k * 20)})`; x.fillRect(x0, y, len, ph);
          x.fillStyle = "#00000014"; for (let g = 0; g < 3; g++) x.fillRect(x0 + r() * len, y + r() * ph, len * 0.3, 1);
          x.fillStyle = "#3b220f55"; x.fillRect(x0, y, 1, ph); x0 += len;
        }
        x.fillStyle = "#3b220f40"; x.fillRect(0, y, w, 1);
      }
      x.fillStyle = "#7a1f1fd0"; // faixa de fora vinho, como nas ligas
      x.fillRect(0, 0, w, Z(-W)); x.fillRect(0, Z(W), w, hh - Z(W)); x.fillRect(0, 0, X(-L), hh); x.fillRect(X(L), 0, w - X(L), hh);
      x.fillStyle = "#1d4f91b0"; for (const sg of [-1, 1]) { x.beginPath(); if (sg < 0) x.arc(X(-L), Z(0), F.areaR * PX, -Math.PI / 2, Math.PI / 2); else x.arc(X(L), Z(0), F.areaR * PX, Math.PI / 2, 1.5 * Math.PI); x.fill(); }
      x.fillStyle = "#b3262670"; x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.fill();
      // as "poças" de luz dos refletores do teto, pintadas no próprio piso (luz de verdade pesava demais)
      x.globalCompositeOperation = "lighter";
      for (const sx of [-0.62, 0, 0.62]) for (const sz of [-1, 1]) {
        const cx = X(sx * L * 0.8), cz = Z(sz * W * 0.55 * 0.35), rr = 6.5 * PX, g = x.createRadialGradient(cx, cz, 0, cx, cz, rr);
        g.addColorStop(0, "rgba(120,105,80,0.75)"); g.addColorStop(0.6, "rgba(80,70,52,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - rr, cz - rr, 2 * rr, 2 * rr);
      }
      x.globalCompositeOperation = "source-over";
    }
  };
  const lines = (x) => {
    x.strokeStyle = P.linhas; x.lineWidth = (cars ? 0.25 : 0.08) * PX; x.fillStyle = P.linhas;
    if (P.brilho) { x.shadowColor = P.linhas; x.shadowBlur = 0.25 * PX; x.lineWidth = 0.1 * PX; } // linhas neon (brilham)
    x.strokeRect(X(-L), Z(-W), 2 * L * PX, 2 * W * PX);
    x.beginPath(); x.moveTo(X(0), Z(-W)); x.lineTo(X(0), Z(W)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), (cars ? 0.6 : 0.15) * PX, 0, 7); x.fill();
    for (const sg of [-1, 1]) {
      const gx = X(sg * L), r6 = F.areaR * PX;
      x.beginPath(); // área: semicírculo em volta do gol (é onde o goleiro pega com a mão)
      if (sg < 0) x.arc(gx, Z(0), r6, -Math.PI / 2, Math.PI / 2); else x.arc(gx, Z(0), r6, Math.PI / 2, 1.5 * Math.PI);
      x.stroke();
      if (!cars) { x.beginPath(); x.arc(X(sg * (L - 6)), Z(0), 0.12 * PX, 0, 7); x.fill(); x.beginPath(); x.arc(X(sg * (L - 10)), Z(0), 0.12 * PX, 0, 7); x.fill(); }
    }
  };
  const pisoTex = canvasTex((2 * L + 2) * PX, (2 * W + 2) * PX, (x, w, hh, r) => { base(x, w, hh, r); lines(x); });
  const field = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 2, 2 * W + 2), new THREE.MeshStandardMaterial({ map: pisoTex, roughness: P.roughness, metalness: P.metalness })));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true;
  if (P.textura && !cars) foto(P.textura).then((img) => { // tem a foto: ela vira a base, e as linhas vão por cima
    const cv = pisoTex.image, x = cv.getContext("2d"), pat = x.createPattern(img, "repeat");
    pat.setTransform(new DOMMatrix().scale((P.metrosFoto * PX) / img.width));
    x.fillStyle = pat; x.fillRect(0, 0, cv.width, cv.height); lines(x); pisoTex.needsUpdate = true;
  }).catch(() => {});
  // muretas em volta (placas de propaganda, tijolo grafitado ou parede acolchoada)
  const BH = cars ? 2.2 : 1.0, BT = 0.15;
  let muretaTex, lado = 0x333333, topo = 0x222222;
  if (cfg.muretas === "tijolo") {
    lado = 0x8f8a82; topo = 0x9c968c;
    muretaTex = canvasTex(1024, 64, (x, w, hh, r) => {
      x.fillStyle = "#d8ccb6"; x.fillRect(0, 0, w, hh);
      for (let row = 0; row < 4; row++) for (let i = -1; i < w / 40 + 1; i++) { x.fillStyle = tons(r, ["#a4553a", "#b8643f", "#8f4a33", "#9d5a3c"]); x.fillRect(i * 40 + (row % 2) * 20 + 2, row * 16 + 2, 36, 12); }
      x.fillStyle = "#c9c2b5"; x.fillRect(560, 0, 180, hh); // pedaço rebocado
      const graf = [["VILA DA GALERA", "#ff3d7f"], ["PELADA ⚽", "#2ee6a6"], ["RJ", "#ffd84a"], ["GALERA", "#3ab0ff"]];
      graf.forEach(([t, c], i) => { x.save(); x.translate(110 + i * 250, 34); x.rotate((r() - 0.5) * 0.15); x.font = "900 30px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 6; x.strokeStyle = "#111"; x.strokeText(t, 0, 0); x.fillStyle = c; x.fillText(t, 0, 0); x.restore(); for (let d = 0; d < 4; d++) { x.fillStyle = c; x.fillRect(80 + i * 250 + r() * 60, 44, 2, 6 + r() * 12); } });
    }, true);
  } else if (cfg.muretas === "neon") {
    lado = 0x0a0d1f; topo = 0x10163a;
    muretaTex = canvasTex(1024, 64, (x, w, hh) => {
      x.fillStyle = "#0b0f26"; x.fillRect(0, 0, w, hh); x.fillStyle = "#7ff7ff"; x.shadowColor = "#7ff7ff"; x.shadowBlur = 8; x.fillRect(0, 4, w, 3); x.fillRect(0, hh - 7, w, 3);
      x.font = "900 26px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffe14a"; x.shadowColor = "#ffb000";
      for (let i = 0; i < 2; i++) x.fillText("⚡ STRIKERS DA GALERA ⚡", w / 4 + i * w / 2, hh / 2 + 1);
    }, true);
  } else if (cfg.muretas === "acolchoadas") {
    lado = 0x0f2550; topo = 0x0b1a38;
    muretaTex = canvasTex(1024, 64, (x, w, hh) => {
      x.fillStyle = "#163a7a"; x.fillRect(0, 0, w, hh); x.fillStyle = "#0e2a5e"; for (let i = 0; i < w; i += 64) x.fillRect(i, 0, 3, hh);
      x.fillStyle = "#ffd84a"; x.fillRect(0, hh - 6, w, 6);
      x.font = "bold 30px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffffff";
      for (let i = 0; i < 2; i++) x.fillText("GINÁSIO DA GALERA ⚽", w / 4 + i * w / 2, hh / 2 - 2);
    }, true);
  } else {
    const ads = ["PELADA DA GALERA", "⚽ VILA DA GALERA", "LEILÃO DA GALERA", "BAR DA SINUCA", "CORRIDA DA GALERA", "TIRO DA GALERA"];
    const adCols = [["#0d47a1", "#ffd84a"], ["#b71c1c", "#ffffff"], ["#1b5e20", "#ffffff"], ["#212121", "#ffd84a"], ["#e65100", "#ffffff"], ["#4a148c", "#ffffff"]];
    muretaTex = canvasTex(2048, 64, (x, w, hh) => { const seg = w / 6; ads.forEach((t, i) => { const [bg, fg] = adCols[i]; x.fillStyle = bg; x.fillRect(i * seg, 0, seg, hh); x.fillStyle = fg; x.font = "bold 34px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, i * seg + seg / 2, hh / 2 + 2); }); }, true);
  }
  const texLen = cfg.muretas === "propaganda" ? 24 : 16;
  const board = (len, x0, z0, rotY) => {
    const t = muretaTex.clone(); t.repeat.set(len / (texLen * BH), 1); t.needsUpdate = true;
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(len, BH, BT), [M(lado), M(lado), M(topo), M(topo), new THREE.MeshStandardMaterial({ map: t, roughness: cfg.muretas === "acolchoadas" ? 0.45 : 0.8 }), M(lado)]));
    m.position.set(x0, BH / 2, z0); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true;
  };
  board(2 * L + 2 * BT, 0, -W - BT / 2, 0); board(2 * L + 2 * BT, 0, W + BT / 2, Math.PI);
  for (const sg of [-1, 1]) for (const zs of [-1, 1]) { const len = W - F.goalW - 0.1; board(len, sg * (L + BT / 2), zs * (F.goalW + 0.1 + len / 2), sg < 0 ? Math.PI / 2 : -Math.PI / 2); }
  muretaTex.dispose(); // os clones têm a própria cópia
  // em cima da mureta: alambrado aberto (tela em losango) ou, no ginásio, vidro (quadra fechada)
  const FH = F.wallH, glass = cfg.paredes === "fechadas", eletrica = cfg.paredes === "eletrica";
  // cerca elétrica: antes eram raios animados (planos que somavam luz por cima da tela toda, a cada quadro) e pesavam
  // demais. Agora é um vidro azul bem leve, sem textura nem animação, com fios de neon em cima (o choque continua igual)
  grp.userData.raios = [];
  const fenceTex = glass || eletrica ? null : canvasTex(64, 64, (x, w) => { x.strokeStyle = "#d8dde0"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, w / 2); x.lineTo(w / 2, 0); x.lineTo(w, w / 2); x.lineTo(w / 2, w); x.closePath(); x.stroke(); }, true);
  const cell = cars ? 1 : 0.5;
  const fence = (lw, lh, x0, y0, z0, rotY) => {
    let mat;
    if (glass) mat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }); // vidro simples (sem calcular luz)
    else if (eletrica) mat = cercaMat || (cercaMat = new THREE.MeshBasicMaterial({ color: 0x2fd8ff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    else { const t = fenceTex.clone(); t.repeat.set(lw / cell, lh / cell); t.needsUpdate = true; mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }); }
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), mat)); m.position.set(x0, y0 + lh / 2, z0); m.rotation.y = rotY;
    if (eletrica) for (const fy of [0.45, 1]) { const fio = add(new THREE.Mesh(new THREE.BoxGeometry(lw, 0.035, 0.035), fioMat || (fioMat = new THREE.MeshBasicMaterial({ color: 0x9ff8ff, toneMapped: false })))); fio.position.set(x0, y0 + lh * fy, z0); fio.rotation.y = rotY; } // os fios
  };
  let cercaMat = null, fioMat = null;
  fence(2 * L, FH - BH, 0, BH, -W - 0.05, 0); fence(2 * L, FH - BH, 0, BH, W + 0.05, 0);
  for (const sg of [-1, 1]) { fence(2 * W, FH - F.goalH - 0.4, sg * (L + F.goalD + 0.05), F.goalH + 0.4, 0, Math.PI / 2); for (const zs of [-1, 1]) { const lw = W - F.goalW; fence(lw, FH - BH, sg * (L + 0.05), BH, zs * (F.goalW + lw / 2), Math.PI / 2); } }
  fenceTex?.dispose();
  const pole = eletrica ? new THREE.MeshBasicMaterial({ color: 0x7ff7ff, toneMapped: false }) : M(glass ? 0xc9cdd2 : 0x4a4f55, { metalness: glass ? 0.15 : 0.6, roughness: 0.4 }), gap = cars ? 8 : 5, pr = cars ? 0.12 : glass ? 0.04 : 0.06;
  for (let x0 = -L; x0 <= L + 0.01; x0 += gap) for (const zs of [-1, 1]) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, FH, 8), pole)); m.position.set(x0, FH / 2, zs * (W + 0.1)); m.castShadow = true; }
  // refletores
  if (cfg.refletores === "torres") for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // torres nos cantos
    const g = add(new THREE.Group()); g.position.set(sx * (L + 4), 0, sz * (W + 4));
    const hp = cars ? 26 : 16;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, hp, 8), pole); m.position.y = hp / 2; m.castShadow = true; g.add(m);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), M(0x2b2f33)); box.position.y = hp + 0.4; box.lookAt(-sx * 40, 0, -sz * 40); g.add(box);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); l.position.set((i % 3 - 1) * 0.7, (i < 3 ? 0.3 : -0.3), 0.21); box.add(l); }
  }
  if (cfg.refletores === "teto") { // ginásio: treliças no teto e refletores focados na quadra
    // Os refletores são só a peça acesa: a luz deles está pintada no piso. Luz de verdade (SpotLight) encarecia o desenho
    // de TUDO na cena: com 6 delas o ginásio rodava a 1/3 da velocidade das outras quadras.
    const HT = 15, metal = M(0x2a2d33, { metalness: 0.7, roughness: 0.5 });
    for (let x0 = -L - 6; x0 <= L + 6; x0 += 8) { const t = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2 * W + 24), metal)); t.position.set(x0, HT + 1.5, 0); }
    for (const sx of [-0.62, 0, 0.62]) for (const sz of [-1, 1]) {
      const px = sx * L, pz = sz * (W * 0.55);
      const lamp = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.0), M(0x1c1e22))); lamp.position.set(px, HT + 0.3, pz);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ color: 0xfff8e6 })); face.rotation.x = Math.PI / 2; face.position.y = -0.26; lamp.add(face);
    }
    // o prédio: paredes e teto escuros em volta de tudo
    const hall = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 50, HT + 6, 2 * W + 40), new THREE.MeshBasicMaterial({ color: 0x15171d, side: THREE.BackSide }))); // escuro: não precisa calcular luz
    hall.position.y = (HT + 6) / 2 - 0.06;
  }
  // arquibancadas e o que fica em volta
  const crowdTex = (escura) => canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#6d6f72"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = tons(r, ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"]); x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = tons(r, ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"]); x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } if (escura) { x.fillStyle = "#000000a8"; x.fillRect(0, 0, w, hh); } }, true);
  const stands = (zSide, rows, escura) => {
    const tex = crowdTex(escura), sc = cars ? 2 : 1, cor = escura ? 0x2a2c31 : 0x777a7e, cor2 = escura ? 0x34363c : 0x8a8d90;
    for (let i = 0; i < rows; i++) {
      const t = tex.clone(); t.repeat.set(6 * L / 20, 1); t.offset.x = i * 0.37; t.needsUpdate = true;
      const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
      const step = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 6, 0.5 * sc, 1 * sc), [M(cor), M(cor), M(cor2), M(cor), zSide < 0 ? front : M(cor), zSide < 0 ? M(cor) : front]));
      step.position.set(0, (0.25 + i * 0.5 + 0.3) * sc, zSide * (W + 3 * sc + i * sc)); step.castShadow = step.receiveShadow = true;
    }
    tex.dispose();
  };
  if (cfg.arquibancada === "torcida") stands(-1, 6, false);
  if (cfg.arquibancada === "escura") { stands(-1, 8, true); stands(1, 8, true); }
  if (cfg.arquibancada === "morro") morro(add, L, W);
  // gols: traves e rede
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / (cars ? 0.5 : 0.12), lh / (cars ? 0.5 : 0.12)); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = F.postR, GW = F.goalW, GH = F.goalH, GD = F.goalD;
  for (const sg of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.x = sg * L;
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; bar.castShadow = true; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(sg * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(sg * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(sg * GD / 2, GH / 2, z); g.add(side); }
  }
  netTex.dispose();
  // placas em cima de cada gol: dizem de quem é o gol e quem ataca (atualizadas em updateGoalSigns)
  goalSigns = [];
  for (const s of [-1, 1]) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const w = cars ? 16 : 4.6; spr.scale.set(w, w / 4, 1); spr.position.set(s * (L + GD * 0.5), GH + (cars ? 3.4 : 1.1), 0);
    spr.visible = false; add(spr); goalSigns.push({ s, c, tex, spr, key: "" }); // a placa em cima do gol saiu (fica só a faixa no chão)
    // faixa no chão, na boca do gol, com a cor de quem defende
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(cars ? 2 : 0.5, 2 * GW), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(s * (L - (cars ? 1.2 : 0.3)), 0.025, 0); add(strip); goalSigns[goalSigns.length - 1].strip = strip;
  }
  // modo carros: almofadas de turbo (amarelas). Cada um pega a sua: some por alguns segundos só para quem pegou.
  pads = [];
  if (cars) {
    const spots = [[L - 6, W - 5, 1], [L - 6, -W + 5, 1], [-L + 6, W - 5, 1], [-L + 6, -W + 5, 1], [0, W - 4, 1], [0, -W + 4, 1], [L * 0.5, 0, 0], [-L * 0.5, 0, 0], [0, 12, 0], [0, -12, 0], [L * 0.5, 14, 0], [L * 0.5, -14, 0], [-L * 0.5, 14, 0], [-L * 0.5, -14, 0]];
    for (const [x0, z0, big] of spots) {
      const g = add(new THREE.Group()); g.position.set(x0, 0.02, z0);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.6 : 0.9, big ? 1.8 : 1, 0.12, 16), M(0x3a3a3a)); base.position.y = 0.06; g.add(base);
      const orb = new THREE.Mesh(big ? new THREE.SphereGeometry(0.6, 12, 8) : new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xff9900, emissiveIntensity: 0.9 }));
      orb.position.y = big ? 1.1 : 0.16; g.add(orb);
      pads.push({ x: x0, z: z0, big: !!big, orb, until: 0 });
    }
  }
  return grp;
}

// ======================================================================
// Rocket: ginásio coberto com a arena arredondada (como no Rocket League, sem quina viva: o chão vira parede numa
// curva, a parede vira teto e os cantos são curvos; a física é a mesma, em campo.js: arenaSDF e rampa).
// Piso de taco com a metade de cada time tingida, a rampa de madeira escurecendo até a parede acolchoada na cor do
// time, vidro em cima, faixa de luz em volta, treliças e refletores no teto e arquibancada escura dos dois lados.
// ======================================================================
function rrPontos(hx, hz, r, y, n = 160) { // contorno de um retângulo de cantos redondos (meias-larguras hx, hz; raio r)
  const pts = [], per = 4 * (hx - r) + 4 * (hz - r) + 2 * Math.PI * r;
  const segs = [[hx - r, hz - r, 0], [-(hx - r), hz - r, Math.PI / 2], [-(hx - r), -(hz - r), Math.PI], [hx - r, -(hz - r), 1.5 * Math.PI]];
  for (const [cx, cz, a0] of segs) for (let i = 0; i <= Math.ceil(n * (Math.PI / 2 * r) / per) + 2; i++) { const a = a0 + (i / (Math.ceil(n * (Math.PI / 2 * r) / per) + 2)) * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
  return pts;
}
function buildArenaRocket(F) {
  const grp = new THREE.Group(), L = F.L, W = F.W, H = F.ceil, Rc = F.rc, GW = F.goalW, GH = F.goalH, GD = F.goalD;
  const add = (o) => (grp.add(o), o);
  const kits = E.S && E.S.kits ? E.S.kits : { A: "celeste", B: "laranja" };
  const corA = new THREE.Color(C.kitColor(kits.A)), corB = new THREE.Color(C.kitColor(kits.B));
  // ---- piso de taco (a parte reta) ----
  const PX = 20, X = (v) => (v + L) * PX, Z = (v) => (v + W) * PX;
  const piso = canvasTex(2 * L * PX, 2 * W * PX, (x, w, hh, r) => {
    const ph = 7;
    for (let y = 0; y < hh; y += ph) { let x0 = -r() * 30; while (x0 < w) { const len = 18 + r() * 26, k = r(); x.fillStyle = `rgb(${Math.round(196 + k * 26)},${Math.round(140 + k * 26)},${Math.round(84 + k * 18)})`; x.fillRect(x0, y, len, ph); x.fillStyle = "#3b220f40"; x.fillRect(x0, y, 1, ph); x0 += len; } x.fillStyle = "#3b220f30"; x.fillRect(0, y, w, 1); }
    for (const [cor, x0] of [[corA, 0], [corB, w / 2]]) { x.globalAlpha = 0.16; x.fillStyle = "#" + cor.getHexString(); x.fillRect(x0, 0, w / 2, hh); }
    x.globalAlpha = 1;
    // poças de luz dos refletores pintadas no piso (luz de verdade pesava demais)
    x.globalCompositeOperation = "lighter";
    for (const sx of [-0.6, 0, 0.6]) for (const sz of [-0.45, 0.45]) { const cx = X(sx * L), cz = Z(sz * W), rr = 16 * PX, g = x.createRadialGradient(cx, cz, 0, cx, cz, rr); g.addColorStop(0, "rgba(110,95,70,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - rr, cz - rr, 2 * rr, 2 * rr); }
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = "#ffffffd8"; x.fillStyle = "#ffffffd8"; x.lineWidth = 0.3 * PX;
    x.beginPath(); x.roundRect(X(-L + Rc - 0.6), Z(-W + Rc - 0.6), (2 * (L - Rc) + 1.2) * PX, (2 * (W - Rc) + 1.2) * PX, 2 * PX); x.stroke(); // onde começa a rampa
    x.beginPath(); x.moveTo(X(0), Z(-W + Rc)); x.lineTo(X(0), Z(W - Rc)); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), F.circle * PX, 0, 7); x.stroke();
    x.beginPath(); x.arc(X(0), Z(0), 0.7 * PX, 0, 7); x.fill();
    for (const sg of [-1, 1]) { x.beginPath(); if (sg < 0) x.arc(X(-L), Z(0), F.areaR * PX, -Math.PI / 2, Math.PI / 2); else x.arc(X(L), Z(0), F.areaR * PX, Math.PI / 2, 1.5 * Math.PI); x.stroke(); }
    x.save(); x.translate(X(0), Z(0)); x.font = `900 ${3.2 * PX}px Figtree, Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffffff30"; x.fillText("ROCKET DA GALERA", 0, F.circle * PX + 3 * PX); x.restore();
  });
  const field = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * W), new THREE.MeshStandardMaterial({ map: piso, roughness: 0.25, metalness: 0 })));
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true;
  // dentro dos gols: o mesmo taco, escurecido
  for (const sg of [-1, 1]) { const g = add(new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), M(0x5a3d22, { roughness: 0.5 }))); g.rotation.x = -Math.PI / 2; g.position.set(sg * (L + GD / 2), 0.01, 0); }
  // ---- a casca arredondada: uma caixa com 1 m por quadradinho, cada vértice empurrado para a superfície curva ----
  const geo = new THREE.BoxGeometry(2 * L, H, 2 * W, 2 * L, H, 2 * W).toNonIndexed(); geo.translate(0, H / 2, 0);
  const pos = geo.attributes.position, nor = geo.attributes.normal, ix = L - Rc, iy = H / 2 - Rc, iz = W - Rc, hy = H / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) - hy, z = pos.getZ(i);
    const cx = clamp(x, -ix, ix), cy = clamp(y, -iy, iy), cz = clamp(z, -iz, iz), dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
    if (d > 1e-6) { pos.setXYZ(i, cx + dx / d * Rc, cy + dy / d * Rc + hy, cz + dz / d * Rc); nor.setXYZ(i, dx / d, dy / d, dz / d); } // normal certinha (para fora)
  }
  // tira o chão reto (o piso de taco já está lá) e o buraco da boca dos gols; separa a parte de baixo (opaca) do vidro
  const baixo = [], alto = [], cols = [], madeira = new THREE.Color(0xb47a45), escuro = new THREE.Color(0x10131c), tmp = new THREE.Color();
  const corDe = (x, y) => { // madeira embaixo, cor do time subindo pela rampa, parede acolchoada escura em cima
    const time = tmp.copy(corA).lerp(corB, clamp((x + 6) / 12, 0, 1));
    if (y < 0.4) return madeira.clone();
    const t3 = madeira.clone().multiplyScalar(0.7).lerp(time.multiplyScalar(0.55), 0.5); // a rampa vai pegando a cor do time
    if (y < 3) return madeira.clone().lerp(t3, (y - 0.4) / 2.6);
    return t3.lerp(escuro, clamp((y - 3) / 3.5, 0, 1));
  };
  const P = pos.array, N = nor.array, out = { b: { p: [], n: [], c: [] }, a: { p: [], n: [] } };
  for (let t = 0; t < pos.count; t += 3) {
    let mx = 0, my = 0, mz = 0; for (let k = 0; k < 3; k++) { mx += P[(t + k) * 3] / 3; my += P[(t + k) * 3 + 1] / 3; mz += P[(t + k) * 3 + 2] / 3; }
    if (my < 0.02 && Math.abs(mx) < ix + 0.01 && Math.abs(mz) < iz + 0.01) continue; // chão reto
    if (Math.abs(mz) < GW && my < GH && Math.abs(mx) > L - Rc - 0.01) continue; // boca do gol
    const dst = my < 7.5 ? out.b : out.a;
    for (let k = 0; k < 3; k++) {
      const j = (t + k) * 3; dst.p.push(P[j], P[j + 1], P[j + 2]); dst.n.push(N[j], N[j + 1], N[j + 2]);
      if (dst === out.b) { const c = corDe(P[j], P[j + 1]); dst.c.push(c.r, c.g, c.b); }
    }
  }
  geo.dispose();
  const casca = (o, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(o.n, 3)); if (o.c) g.setAttribute("color", new THREE.Float32BufferAttribute(o.c, 3)); return add(new THREE.Mesh(g, mat)); };
  const parede = casca(out.b, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.BackSide })); parede.receiveShadow = true;
  casca(out.a, new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  // linhas de nível na rampa (para dar para ver a curva) e a grade do vidro em cima
  { const linhas = (alturas, cor, op) => { const g = new THREE.BufferGeometry(), v = [];
      for (const y of alturas) {
        const e = y < Rc ? Math.sqrt(Rc * Rc - (Rc - y) * (Rc - y)) : Rc, pts = rrPontos(L - Rc + e - 0.03, W - Rc + e - 0.03, Math.max(0.05, e - 0.03), y, 240);
        for (let i = 0; i < pts.length; i++) { // em pedacinhos de ~0,5 m: os que passam na boca do gol (onde a rampa foi cortada) ficam de fora
          const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.5));
          for (let k = 0; k < n; k++) {
            const x0 = a.x + (b.x - a.x) * k / n, z0 = a.z + (b.z - a.z) * k / n, x1 = a.x + (b.x - a.x) * (k + 1) / n, z1 = a.z + (b.z - a.z) * (k + 1) / n;
            if (y < GH + 0.5 && Math.abs((x0 + x1) / 2) > L - Rc - 0.5 && Math.abs((z0 + z1) / 2) < GW + 0.6) continue;
            v.push(x0, y, z0, x1, y, z1);
          }
        }
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: op }))); };
    linhas([0.35, 1.2, 2.6, 4.4], 0xffffff, 0.35); linhas([9, H - Rc], 0x9fb8d8, 0.25); }
  // faixa de luz em volta (onde a parede opaca vira vidro), na cor de cada time
  for (const [cor, sx] of [[corA, -1], [corB, 1]]) {
    const pts = rrPontos(L - 0.08, W - 0.08, Rc, 7.5, 260).filter((p) => p.x * sx >= -0.5);
    pts.sort((a, b) => Math.atan2(a.z, a.x * sx) - Math.atan2(b.z, b.x * sx));
    const tube = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.12, 6, false), new THREE.MeshBasicMaterial({ color: cor.clone().lerp(new THREE.Color(0xffffff), 0.35) }))); void tube;
  }
  // os lados da rampa cortados pela boca do gol (a "bochecha") e o teto da boca
  { const x1 = L - Rc + Math.sqrt(Math.max(0, Rc * Rc - (Rc - GH) * (Rc - GH))); // onde a curva chega na altura do travessão
    const sh = new THREE.Shape(); sh.moveTo(L - Rc, 0);
    for (let i = 1; i <= 16; i++) { const xx = L - Rc + (x1 - (L - Rc)) * i / 16, e = xx - (L - Rc); sh.lineTo(xx, Rc - Math.sqrt(Math.max(0, Rc * Rc - e * e))); }
    sh.lineTo(L, GH); sh.lineTo(L, 0); sh.closePath();
    const mat = M(0x3a2a1c, { roughness: 0.6, side: THREE.DoubleSide }), sg0 = new THREE.ShapeGeometry(sh);
    for (const sg of [-1, 1]) for (const zs of [-1, 1]) { const m = add(new THREE.Mesh(sg0, mat)); m.scale.x = sg; m.position.z = zs * GW; }
    for (const sg of [-1, 1]) { const lid = add(new THREE.Mesh(new THREE.PlaneGeometry(L - x1, 2 * GW), M(0x2a2f3a, { side: THREE.DoubleSide }))); lid.rotation.x = Math.PI / 2; lid.position.set(sg * (x1 + L) / 2, GH, 0); }
  }
  // ---- o prédio: teto com treliças e refletores, paredes escuras e arquibancada dos dois lados ----
  const HT = H + 6, metal = M(0x2a2d33, { metalness: 0.7, roughness: 0.5 });
  for (let x0 = -L - 8; x0 <= L + 8; x0 += 10) { const t = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 2 * W + 40), metal)); t.position.set(x0, HT, 0); }
  for (const sx of [-0.6, 0, 0.6]) for (const sz of [-0.45, 0.45]) {
    const lamp = add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 2), M(0x1c1e22))); lamp.position.set(sx * L, HT - 1, sz * W);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xfff8e6 })); face.rotation.x = Math.PI / 2; face.position.y = -0.41; lamp.add(face);
  }
  const hall = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 70, HT + 8, 2 * W + 80), new THREE.MeshBasicMaterial({ color: 0x15171d, side: THREE.BackSide }))); hall.position.y = (HT + 8) / 2 - 0.1;
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L + 70, 2 * W + 80), M(0x23252b, { roughness: 1 }))); chao.rotation.x = -Math.PI / 2; chao.position.y = -0.06;
  const crowd = canvasTex(512, 64, (x, w, hh, r) => { x.fillStyle = "#2c2e33"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = r() * w, cy = 18 + r() * 34; x.fillStyle = tons(r, ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121", "#ef6c00"]); x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = tons(r, ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"]); x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } x.fillStyle = "#00000080"; x.fillRect(0, 0, w, hh); }, true);
  for (const zs of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = crowd.clone(); t.repeat.set(5, 1); t.offset.x = i * 0.37; t.needsUpdate = true;
    const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), cz = M(0x2a2c31);
    const st = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 10, 1.2, 2.2), [cz, cz, M(0x34363c), cz, zs < 0 ? front : cz, zs < 0 ? cz : front]));
    st.position.set(0, 0.6 + i * 1.2, zs * (W + 4 + i * 2.2));
  }
  crowd.dispose();
  // ---- gols: traves brancas, rede e uma moldura de luz na cor de quem defende ----
  const white = M(0xf4f4f4, { roughness: 0.3 }), netTex = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#f4f4f4"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  const net = (lw, lh) => { const t = netTex.clone(); t.repeat.set(lw / 0.5, lh / 0.5); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); };
  const R = F.postR;
  for (const sg of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.x = sg * L;
    for (const z of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GH + R, 12), white); p.position.set(0, (GH + R) / 2, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * GW + 2 * R, 12), white); bar.rotation.x = Math.PI / 2; bar.position.y = GH; g.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), net(2 * GW, GH)); back.position.set(sg * GD, GH / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GW), net(GD, 2 * GW)); top.rotation.x = -Math.PI / 2; top.position.set(sg * GD / 2, GH, 0); g.add(top);
    for (const z of [-GW, GW]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), net(GD, GH)); side.position.set(sg * GD / 2, GH / 2, z); g.add(side); }
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.15, GH + 0.6, 2 * GW + 0.6), new THREE.MeshBasicMaterial({ color: sg < 0 ? corA : corB, transparent: true, opacity: 0.18, depthWrite: false })); glow.position.set(sg * (GD + 0.1), GH / 2, 0); g.add(glow);
  }
  netTex.dispose();
  // placas em cima de cada gol (updateGoalSigns) e a faixa no chão da boca do gol
  goalSigns = [];
  for (const sgn of [-1, 1]) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(16, 4, 1); spr.position.set(sgn * (L - 3), GH + 6.5, 0); spr.visible = false; add(spr);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2, 2 * GW), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(sgn * (L - 1.2), 0.025, 0); add(strip);
    goalSigns.push({ s: sgn, c, tex, spr, key: "", strip });
  }
  // almofadas de turbo, todas no chão reto (as grandes nos cantos da parte reta e no meio das laterais)
  pads = [];
  const fx = L - Rc - 2, fz = W - Rc - 2;
  const spots = [[fx, fz, 1], [fx, -fz, 1], [-fx, fz, 1], [-fx, -fz, 1], [0, fz + 0.5, 1], [0, -fz - 0.5, 1], [L * 0.5, 0, 0], [-L * 0.5, 0, 0], [0, 12, 0], [0, -12, 0], [L * 0.5, 14, 0], [L * 0.5, -14, 0], [-L * 0.5, 14, 0], [-L * 0.5, -14, 0], [L - Rc - 3, 6, 0], [L - Rc - 3, -6, 0], [-(L - Rc - 3), 6, 0], [-(L - Rc - 3), -6, 0]];
  for (const [x0, z0, big] of spots) {
    const g = add(new THREE.Group()); g.position.set(x0, 0.02, z0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.6 : 0.9, big ? 1.8 : 1, 0.12, 16), M(0x3a3a3a)); base.position.y = 0.06; g.add(base);
    const orb = new THREE.Mesh(big ? new THREE.SphereGeometry(0.6, 12, 8) : new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xff9900, emissiveIntensity: 0.9 }));
    orb.position.y = big ? 1.1 : 0.16; g.add(orb);
    pads.push({ x: x0, z: z0, big: !!big, orb, until: 0 });
  }
  return grp;
}

// Rio: morros cheios de casinhas coloridas atrás da quadra, palmeiras nos cantos e o Cristo lá longe
function morro(add, L, W) {
  const r = rng(77), cores = [0xe5533d, 0xf2b134, 0x4aa3df, 0x7bc96f, 0xf4f1e8, 0xe98fb7, 0xc8a27a, 0x9b6fd1, 0xffffff, 0xb5633f];
  const morros = [ // centro (x, z), raio em x, altura, raio em z e para onde a frente olha (a quadra)
    { x: 0, z: -(W + 80), sx: L * 3.6, h: 42, sz: 48, fx: 0, fz: 1 },
    { x: L + 90, z: 0, sx: 48, h: 30, sz: W * 4, fx: -1, fz: 0 },
    { x: -(L + 95), z: 6, sx: 50, h: 34, sz: W * 4, fx: 1, fz: 0 },
  ];
  const verde = M(0x527d3c, { roughness: 1 }), casas = [];
  for (const m of morros) {
    const hill = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), verde));
    hill.scale.set(m.sx, m.h, m.sz); hill.position.set(m.x, -2, m.z);
    for (let i = 0; i < 320; i++) { // casinhas só na encosta virada para a quadra
      const a = r() * 2 - 1, b = r() * 2 - 1, q = a * a + b * b;
      if (q > 0.85 || a * m.fx + b * m.fz < 0.05) continue;
      const w = 1.6 + r() * 1.8, hh = 1.6 + r() * 1.6, d = 1.6 + r() * 1.6, y = -2 + m.h * Math.sqrt(1 - q);
      casas.push({ x: m.x + a * m.sx, y: y + (hh - 3) / 2, z: m.z + b * m.sz, w, hh: hh + 3, d, ry: (r() - 0.5) * 0.3, cor: tons(r, cores) }); // a base fica enterrada no morro
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1), inst = add(new THREE.InstancedMesh(box, M(0xffffff, { roughness: 0.9 }), casas.length));
  const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  casas.forEach((c, i) => { mt.compose(new THREE.Vector3(c.x, c.y, c.z), q.setFromEuler(e.set(0, c.ry, 0)), new THREE.Vector3(c.w, c.hh, c.d)); inst.setMatrixAt(i, mt); inst.setColorAt(i, col.setHex(c.cor)); });
  inst.castShadow = false; inst.receiveShadow = true;
  // palmeiras nos cantos, do lado de fora do alambrado
  const tronco = M(0x7a5a3a, { roughness: 1 }), folha = M(0x2f8a3a, { roughness: 0.8 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const g = add(new THREE.Group()); g.position.set(sx * (L + 3.5), 0, sz * (W + 3.5));
    for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 7), tronco); t.position.set(sx * k * 0.06, 0.7 + k * 1.35, 0); t.rotation.z = -sx * 0.05; t.castShadow = true; g.add(t); }
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), folha); const a = (k / 7) * Math.PI * 2; f.position.set(sx * 0.36 + Math.sin(a) * 1.1, 8.3, Math.cos(a) * 1.1); f.rotation.set(0.35 * Math.cos(a), a, -0.35 * Math.sin(a)); f.castShadow = true; g.add(f); }
  }
  // o Corcovado lá longe, com o Cristo em cima
  const pico = add(new THREE.Mesh(new THREE.ConeGeometry(34, 90, 10), verde)); pico.position.set(-L * 1.4, 43, -(W + 150));
  const pedra = M(0xf1efe8, { roughness: 0.7 }), cristo = add(new THREE.Group()); cristo.position.set(-L * 1.4, 88, -(W + 150)); cristo.scale.setScalar(1.6);
  for (const [w, hh, d, y] of [[2.4, 2, 2.4, 1], [1.6, 7, 1.2, 5.5], [10, 1.1, 1, 8.3], [1, 1.1, 1, 9.6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), pedra); p.position.y = y; cristo.add(p); }
}

// de quem é cada gol: o gol da direita (+x) é defendido pelo Visitante (B) e é onde o Mandante (A) faz gol.
// Cada um vê "ATAQUE" no gol onde precisa marcar e "DEFESA" no seu; quem assiste vê o nome de quem defende.
export function updateGoalSigns() {
  const team = myAttackTeam(), kits = G.mode === "bots" && G.bm ? G.bm.kits : E.S && E.S.kits ? E.S.kits : { A: myKit(), B: "palmeiras" };
  for (const g of goalSigns) {
    const def = g.s > 0 ? "B" : "A", col = C.kitColor(kits[def]);
    const key = kits[def]; // só a cor (e o desenho) da camisa de quem defende: nada de "seu gol"/"ataque aqui"
    if (g.key !== key) {
      g.key = key; const x = g.c.getContext("2d"); x.clearRect(0, 0, 512, 128);
      const K = kitOf(kits[def]), c = K.c; x.save(); x.beginPath(); x.roundRect(6, 6, 500, 116, 26); x.clip();
      if (K.kind === "vstripes") for (let i = 0; i < 16; i++) { x.fillStyle = c[i % 2]; x.fillRect(i * 32, 0, 32, 128); }
      else if (K.kind === "hstripes") for (let i = 0; i < 4; i++) { x.fillStyle = c[i % 2]; x.fillRect(0, i * 32, 512, 32); }
      else if (K.kind === "band") { x.fillStyle = c[0]; x.fillRect(0, 0, 512, 128); x.fillStyle = c[1]; x.fillRect(0, 44, 512, 22); x.fillStyle = c[2]; x.fillRect(0, 66, 512, 14); }
      else { x.fillStyle = c[0]; x.fillRect(0, 0, 512, 128); }
      x.restore(); x.lineWidth = 8; x.strokeStyle = "#000a"; x.beginPath(); x.roundRect(6, 6, 500, 116, 26); x.stroke();
      g.tex.needsUpdate = true; g.strip.material.color.set(col);
    }
  }
  $("hDir").classList.add("hidden"); // (a seta de "ataque" saiu: só as cores dos times)
}