// Corrida da Galera — as pistas em 3D: temas, relevo, asfalto, zebras, muros e enfeites.
import * as THREE from "three";
import { PISTAS, sample, elevate, WORLD, rng } from "./estado.js";
import { drawPreview } from "./menus.js";
import { renderer, scene, hemi, sun, canvasTex, M, LOOK } from "./cena.js";
import { nearest } from "./jogo.js";

// ---------- temas das pistas: cores, chão, enfeites e o horizonte ----------
export const THEMES = {
  monaco: { preview: "#2a6fa3", sky: ["#5fb7ff", "#cfeeff"], fog: "#cfe6f2", oob: 0xffae6f1f, roadCol: "#5b5b61" },
  interlagos: { preview: "#2f7d33", sky: ["#4aa3e8", "#f3e6c8"], fog: "#dfe7d8", oob: 0xff3a9a3f, roadCol: "#4b4b50" },
  losangeles: { preview: "#7a4a6a", sky: ["#3b2a6b", "#ff9a5a"], fog: "#e8a07a", oob: 0xff6a8aa0, roadCol: "#3f3f46" },
  rio: { preview: "#1f8a8a", sky: ["#3f97e0", "#d6f1ff"], fog: "#cfeaf2", oob: 0xff2a7a3a, roadCol: "#4a4a50" },
  luigi: { preview: "#3f8f3a", sky: ["#3f97e0", "#eaf4ff"], fog: "#dfeee0", oob: 0xff3a9a3f, roadCol: "#55555c" },
  sorvete: { preview: "#8fb8d8", sky: ["#8fc6f2", "#f2f8ff"], fog: "#e8f2fa", oob: 0xffe4edf5, roadCol: "#9fc3dd" },
  arcoiris: { preview: "#0b0a1a", sky: ["#02020a", "#1a0b3a"], fog: "#0a0618", oob: 0xff05040c, roadCol: "#ffffff" },
  tokyo: { preview: "#14152a", sky: ["#05061a", "#3a1d5c"], fog: "#2a1a44", oob: 0xff1f1514, roadCol: "#24252c" },
};

// posição de largada g: atrás da linha, em duas filas
export function gridSpot(pts, g, W) {
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * 13 + n) % n, p = pts[idx], nx = -p.ty, ny = p.tx, side = g % 2 ? 1 : -1, lat = side * W * 0.22;
  return { x: p.x + nx * lat, y: p.y + ny * lat, tx: p.tx, ty: p.ty, nx, ny, a: Math.atan2(p.ty, p.tx), idx };
}

// ---------- a pista: pontos com altura, chão, asfalto, zebras, muros e enfeites ----------
const TRACKS = {};
export function buildTrack(id) {
  if (TRACKS[id]) return TRACKS[id];
  const t = PISTAS[id], pts = elevate(sample(t.points, 6), t.hills), n = pts.length, W = t.width;
  for (const p of pts) { p.nx = -p.ty; p.ny = p.tx; }
  const mini = document.createElement("canvas"); mini.width = mini.height = 240; drawPreview(mini, id);
  const tr = { id, t, pts, n, W, look: LOOK[id], theme: THEMES[id], mini, wallLat: t.walls ? W / 2 + t.wall : Infinity, grp: new THREE.Group() };
  // grade de distância até a pista (para o relevo e para espalhar enfeites sem cair na pista)
  const G = 64, cell = t.world / G, gd = new Float32Array((G + 1) * (G + 1)), gh = new Float32Array((G + 1) * (G + 1));
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const x = i * cell, y = j * cell; let bd = 1e12, bh = 0;
    for (let k = 0; k < n; k += 2) { const p = pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bh = p.h; } }
    gd[j * (G + 1) + i] = Math.sqrt(bd); gh[j * (G + 1) + i] = bh;
  }
  tr.distAt = (x, y) => { const i = Math.max(0, Math.min(G, Math.round(x / cell))), j = Math.max(0, Math.min(G, Math.round(y / cell))); return gd[j * (G + 1) + i]; };
  buildWorld(tr);
  return (TRACKS[id] = tr);
}
// altura do chão: em cima da pista e um pouco para os lados é a altura da pista; mais longe, desce até o nível 0
function falloff(tr, lat) { const t = tr.t, off = Math.abs(lat) - tr.W / 2 - t.flat; return off <= 0 ? 1 : Math.max(0, 1 - off / t.fall); }
export function trackFrame(tr, x, y, idx) { // ponto da pista mais perto (já sabendo o índice), com a altura e a distância de lado
  const a = tr.pts[idx], b = tr.pts[(idx + 1) % tr.n], c = tr.pts[(idx - 1 + tr.n) % tr.n];
  const proj = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2)); const px = p.x + dx * k, py = p.y + dy * k; return { k, d2: (x - px) ** 2 + (y - py) ** 2, h: p.h + (q.h - p.h) * k, px, py }; };
  const f = proj(a, b), g = proj(c, a), r = f.d2 <= g.d2 ? f : g;
  const lat = (x - r.px) * a.nx + (y - r.py) * a.ny;
  return { h: r.h, lat };
}
export function groundH(tr, x, y, idx) { const f = trackFrame(tr, x, y, idx); return f.h * falloff(tr, f.lat); }

// Rio: o mar fica do lado de fora da reta da orla (Copacabana)
const rioShore = (y) => 347 + (y - 530) * 0.4163 - 150;
const rioSea = (x, y) => x < rioShore(y) && y < 1700;
function buildWorld(tr) {
  const { pts, n, W, look, id, grp } = tr, t = tr.t, add = (o) => (grp.add(o), o), r = rng(id.length * 977);
  const WORLD = t.world, K = t.scale; // pistas ampliadas: o mundo cresce junto e as coordenadas fixas (mar, porto) vão × K
  // ---- chão em volta (malha com relevo) ----
  const S = Math.round(140 * K), pad = 1400, size = WORLD + pad * 2, geo = new THREE.PlaneGeometry(size, size, S, S); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + WORLD / 2, y = pos.getZ(i) + WORLD / 2;
    let bi = 0, bd = 1e12; for (let k = 0; k < n; k += 3) { const p = pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bi = k; } }
    let h = t.espaco ? -700 : groundH(tr, x, y, bi) - 1.5; // no espaço não tem chão: o "chão" fica bem lá embaixo
    if (id === "monaco" && y > 1250 * K + Math.sin(x / 170) * 20) h = Math.min(h, -14); // o mar
    if (id === "rio" && rioSea(x, y)) h = Math.min(h, -14); // o mar de Copacabana
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const gtex = canvasTex(256, 256, (x, w, hh, rr) => { x.fillStyle = look.ground[0]; x.fillRect(0, 0, w, hh); for (let i = 0; i < 5000; i++) { x.fillStyle = look.ground[1 + ((rr() * 2) | 0)]; x.fillRect(rr() * w, rr() * hh, 3, 3); } });
  gtex.repeat.set(size / 120, size / 120);
  const ground = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gtex, roughness: 1 })));
  ground.position.set(WORLD / 2, 0, WORLD / 2); ground.receiveShadow = true;
  if (id === "monaco") { // mar e o porto
    const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, 1600 * K), new THREE.MeshStandardMaterial({ color: 0x1f6fae, roughness: 0.2, metalness: 0.2 })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD / 2, -6, (1250 + 800) * K);
    const port = add(new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x2a80bf, roughness: 0.2 })));
    port.rotation.x = -Math.PI / 2; port.scale.set(270 * K, 58 * K, 1); port.position.set(800 * K, groundH(tr, 800 * K, 1020 * K, nearest(tr, 800 * K, 1020 * K, 0)) - 0.5, 1020 * K);
  }
  // ---- fitas ao longo da pista (asfalto, zebras, calçada): cada ponto com a sua altura ----
  function ribbon(l0, l1, y0, mat, vLen, y1 = y0, uSpan = 1, i0 = 0, i1 = n) { // de i0 a i1: só um trecho da volta
    const vs = [], uv = [], idx = [];
    for (let i = i0; i <= i1; i++) {
      const p = pts[i % n], d = i * 6;
      for (const [l, yy, u] of [[l0, y0, 0], [l1, y1, uSpan]]) { vs.push(p.x + p.nx * l, p.h * falloff(tr, l) + yy, p.y + p.ny * l); uv.push(u, d / vLen); }
      if (i < i1) { const a = (i - i0) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; return m;
  }
  const asphalt = canvasTex(128, 256, (x, w, hh, rr) => { x.fillStyle = look.road; x.fillRect(0, 0, w, hh); for (let i = 0; i < 3000; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#e8e8e8"; x.fillRect(2, 0, 3, hh); x.fillRect(w - 5, 0, 3, hh); if (id === "tokyo") { x.fillStyle = "#f2c94c"; x.fillRect(w / 2 - 1.5, 0, 3, hh * 0.55); } });
  const arco = id === "arcoiris" ? canvasTex(128, 32, (x, w, hh) => { ["#ff3b3b", "#ff9a2e", "#ffe14a", "#3ee07a", "#3aa0ff", "#8a5bff", "#ff5fd2"].forEach((c, i) => { x.fillStyle = c; x.fillRect((i * w) / 7, 0, w / 7 + 1, hh); }); x.fillStyle = "#ffffff55"; x.fillRect(0, 0, w, 3); }) : null;
  ribbon(-W / 2, W / 2, 0.4, arco ? new THREE.MeshStandardMaterial({ map: arco, emissive: 0xffffff, emissiveMap: arco, emissiveIntensity: 0.55, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }) : new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, side: THREE.DoubleSide }), 256);
  const kerbT = canvasTex(32, 64, (x, w, hh) => { x.fillStyle = look.kerb[0]; x.fillRect(0, 0, w, hh / 2); x.fillStyle = look.kerb[1]; x.fillRect(0, hh / 2, w, hh / 2); });
  const kerbM = new THREE.MeshStandardMaterial({ map: kerbT, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x0a3a44 : 0 });
  ribbon(W / 2, W / 2 + 7, 0.6, kerbM, 28); ribbon(-W / 2 - 7, -W / 2, 0.6, kerbM, 28);
  if (id === "interlagos") { // área de escape de brita
    const brita = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#c9b37a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 600; i++) { x.fillStyle = rr() < 0.5 ? "#b39c66" : "#ddc893"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }), roughness: 1, side: THREE.DoubleSide });
    ribbon(W / 2 + 7, W / 2 + 30, 0.3, brita, 64, 0.2); ribbon(-W / 2 - 30, -W / 2 - 7, 0.2, brita, 64, 0.3);
  } else { // calçada até o muro
    const side = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = id === "tokyo" ? "#3b3e52" : id === "losangeles" ? "#a9a49a" : id === "sorvete" ? "#dfe9f2" : "#bdb39b"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#0002"; x.strokeRect(0, 0, w, hh); }), roughness: 0.9, side: THREE.DoubleSide });
    const L = tr.wallLat; if (L > W / 2 + 7) { ribbon(W / 2 + 7, L, 0.5, side, 40); ribbon(-L, -W / 2 - 7, 0.5, side, 40); }
    // muro (guard-rail zebrado em Mônaco; mureta de concreto com neon em Tóquio)
    const wt = id === "monaco" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d62828"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#9aa"; x.fillRect(0, hh - 3, w, 3); })
      : id === "losangeles" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#c9c2b4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#e8b83a"; x.fillRect(0, 3, w, 2); x.fillStyle = "#0002"; x.fillRect(w - 2, 0, 2, hh); })
      : id === "rio" ? canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1f8a3a"; x.fillRect(0, 0, w / 2, hh); x.fillStyle = "#ffd23f"; x.fillRect(w / 2, 0, w / 2, 4); })
      : canvasTex(64, 16, (x, w, hh) => { x.fillStyle = "#6c6f80"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ff4fd8"; x.fillRect(0, 2, w, 3); });
    const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, side: THREE.DoubleSide, emissive: id === "tokyo" ? 0x220a22 : 0 });
    for (const s of [1, -1]) { const m = ribbon(s * L, s * L, 0.5, wm, 32, 12, 1); m.castShadow = true; }
  }
  // paredão embaixo dos trechos altos (para não ficar "flutuando") e pilares nos viadutos
  if (id === "tokyo" || id === "losangeles") {
    const pil = new THREE.CylinderGeometry(6, 7, 1, 10), pm = M(id === "tokyo" ? 0x55586a : 0xb8b0a0);
    for (let i = 0; i < n; i += 22) { const p = pts[i]; if (p.h < 15) continue; for (const s of [1, -1]) { const m = add(new THREE.Mesh(pil, pm)); m.scale.y = p.h; m.position.set(p.x + p.nx * s * (W / 2 - 6), p.h / 2, p.y + p.ny * s * (W / 2 - 6)); m.castShadow = true; } }
  }
  // linha de chegada quadriculada e o grid
  const a0 = pts[0], chk = canvasTex(128, 16, (x, w, hh) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; x.fillRect(i * 8, j * 8, 8, 8); } }, false);
  const line = add(new THREE.Mesh(new THREE.PlaneGeometry(W, 12), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.6 })));
  line.rotation.x = -Math.PI / 2; line.rotation.z = -Math.atan2(a0.ty, a0.tx) + Math.PI / 2; line.position.set(a0.x, a0.h + 0.55, a0.y);
  for (let g = 0; g < 8; g++) { const p = gridSpot(pts, g, W); const m = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }))); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(p.ty, p.tx) + Math.PI / 2; m.position.set(p.x + p.tx * 12, pts[p.idx].h + 0.55, p.y + p.ty * 12); }
  // pórtico da largada
  { const s = 1, L = W / 2 + 14, mat = M(0x333844), sign = canvasTex(256, 32, (x, w, hh) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, hh); x.fillStyle = "#ffd23f"; x.font = "bold 24px sans-serif"; x.textAlign = "center"; x.fillText("CORRIDA DA GALERA", w / 2, 24); }, false);
    for (const k of [1, -1]) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(4, 60, 4), mat)); m.position.set(a0.x + a0.nx * k * L, a0.h + 30, a0.y + a0.ny * k * L); m.castShadow = true; }
    const top = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 4, 10, 3), [mat, mat, mat, mat, new THREE.MeshBasicMaterial({ map: sign }), new THREE.MeshBasicMaterial({ map: sign })]));
    top.position.set(a0.x, a0.h + 62, a0.y); top.rotation.y = -Math.atan2(a0.ny, a0.nx); void s; }
  // ---- enfeites ----
  const spots = []; // [x, y, chão] longe da pista
  const free = (x, y, gap) => x > -pad + 50 && y > -pad + 50 && x < WORLD + pad - 50 && y < WORLD + pad - 50 && tr.distAt(x, y) > W / 2 + gap;
  const hAt = (x, y) => groundH(tr, x, y, nearest(tr, x, y, 0)) - 1.5;
  const inst = (geo, mat, list, sc = (o) => o.s) => {
    if (!list.length) return;
    const m = add(new THREE.InstancedMesh(geo, mat, list.length)), d = new THREE.Object3D();
    list.forEach((o, i) => { d.position.set(o.x, o.h + (o.dy || 0) * sc(o), o.y); d.rotation.set(0, o.r || 0, 0); const s = sc(o); d.scale.set(o.sx || s, o.sy || s, o.sz || s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (o.c != null && m.setColorAt) m.setColorAt(i, new THREE.Color(o.c)); });
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const trees = [], palms = [], blds = [], towers = [], stands = [], yachts = [], neons = [], glass = [], jungle = [], houses = [];
  for (let i = 0; i < (t.espaco ? 0 : n); i += 5) { // no espaço (Arco-íris) não tem enfeite na beira
    const p = pts[i];
    for (const side of [-1, 1]) {
      const near = (tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 36) + 10 + r() * 60, x = p.x + p.nx * side * near, y = p.y + p.ny * side * near;
      if (!free(x, y, 20)) continue;
      const k = r();
      if (id === "monaco") { if (k < 0.3) palms.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.5, r: r() * 6 }); else if (k < 0.75) { const sx = 50 + r() * 40, sz = 50 + r() * 40, far = near + 40 + r() * 80, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) blds.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 60 + r() * 90, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#f1d9b5", "#efc9a7", "#f6e7c9", "#e8b78f", "#f3e0c0"][(r() * 5) | 0] }); } }
      else if (id === "interlagos" || id === "luigi" || id === "sorvete") { if (k < 0.45) trees.push({ x, y, h: hAt(x, y), s: 1 + r() * 0.8 }); }
      else if (id === "losangeles") { // palmeiras altas na beira e prédios de vidro mais para trás
        if (k < 0.35) palms.push({ x, y, h: hAt(x, y), s: 1.6 + r() * 0.5, r: r() * 6 });
        else if (k < 0.7) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 60 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) glass.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 140 + r() * 360, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); }
      }
      else if (id === "rio") { // orla com palmeiras; na subida, mata fechada e casinhas coloridas
        const beach = i < n * 0.22 && side > 0;
        if (beach) { if (k < 0.6) palms.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 0.4, r: r() * 6 }); }
        else if (p.h > 18) { if (k < 0.75) jungle.push({ x, y, h: hAt(x, y), s: 0.9 + r() * 0.9 }); else houses.push({ x, y, h: hAt(x, y), s: 1, sx: 18 + r() * 14, sy: 14 + r() * 10, sz: 18 + r() * 14, dy: 0.5, r: r() * 3, c: ["#f2c14e", "#e86a5a", "#5fb3e8", "#7ed07a", "#f29ad8", "#fff3d6"][(r() * 6) | 0] }); }
        else if (k < 0.5) { const sx = 50 + r() * 40, sz = 50 + r() * 40, far = near + 50 + r() * 100, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (!rioSea(bx, by) && free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) blds.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 70 + r() * 110, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#f4f1e6", "#e8e0cf", "#d9e6ef", "#f2dfc8"][(r() * 4) | 0] }); }
      }
      else { if (k < 0.25) neons.push({ x, y, h: hAt(x, y), r: Math.atan2(p.ty, p.tx) + (side > 0 ? 0 : Math.PI), g: (r() * 4) | 0 }); else if (k < 0.8) { const sx = 60 + r() * 50, sz = 60 + r() * 50, far = near + 50 + r() * 120, bx = p.x + p.nx * side * far, by = p.y + p.ny * side * far; if (free(bx, by, Math.hypot(sx, sz) / 2 + t.wall + 25)) towers.push({ x: bx, y: by, h: hAt(bx, by), s: 1, sx, sy: 120 + r() * 380, sz, dy: 0.5, r: Math.atan2(p.ty, p.tx), c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] }); } }
    }
  }
  if (t.espaco) { // estrelas em volta (pontinhos que não dependem de luz)
    const v = []; for (let k = 0; k < 2500; k++) { const a = r() * Math.PI * 2, e = Math.asin(r() * 2 - 1), R0 = 3500; v.push(WORLD / 2 + Math.cos(a) * Math.cos(e) * R0, Math.sin(e) * R0, WORLD / 2 + Math.sin(a) * Math.cos(e) * R0); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false, fog: false })));
  }
  // longe da pista: mais prédios, árvores, morros
  for (let k = 0; k < (t.espaco ? 0 : Math.round(220 * K * K)); k++) {
    const x = -pad + 100 + r() * (WORLD + 2 * pad - 200), y = -pad + 100 + r() * (WORLD + 2 * pad - 200);
    if (!free(x, y, 160)) continue;
    if (id === "monaco") { if (y > 1260 * K) continue; blds.push({ x, y, h: hAt(x, y), s: 1, sx: 60 + r() * 60, sy: 80 + r() * 140, sz: 60 + r() * 60, dy: 0.5, r: r() * 3, c: ["#f1d9b5", "#efc9a7", "#f6e7c9", "#e8b78f"][(r() * 4) | 0] }); }
    else if (id === "interlagos" || id === "luigi" || id === "sorvete") trees.push({ x, y, h: hAt(x, y), s: 1.2 + r() * 1.2 });
    else if (id === "losangeles") { if (r() < 0.5) glass.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 120 + r() * 420, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#7fa6c9", "#9bb7d4", "#6f8fb3", "#c9a27f"][(r() * 4) | 0] }); else palms.push({ x, y, h: hAt(x, y), s: 1.8, r: r() * 6 }); }
    else if (id === "rio") { if (rioSea(x, y)) continue; if (hAt(x, y) > 15 || r() < 0.5) jungle.push({ x, y, h: hAt(x, y), s: 1.3 + r() * 1.2 }); else blds.push({ x, y, h: hAt(x, y), s: 1, sx: 60 + r() * 50, sy: 70 + r() * 120, sz: 60 + r() * 50, dy: 0.5, r: r() * 3, c: ["#f4f1e6", "#e8e0cf", "#d9e6ef"][(r() * 3) | 0] }); }
    else towers.push({ x, y, h: hAt(x, y), s: 1, sx: 80 + r() * 60, sy: 150 + r() * 500, sz: 80 + r() * 60, dy: 0.5, r: r() * 3, c: ["#1d2033", "#242842", "#191b2b", "#2a2340"][(r() * 4) | 0] });
  }
  if (id === "monaco") { for (let k = 0; k < 26; k++) { const a = r() * 6.28, rr2 = Math.sqrt(r()); yachts.push({ x: (800 + Math.cos(a) * 230 * rr2) * K, y: (1020 + Math.sin(a) * 40 * rr2) * K, h: hAt(800 * K, 1020 * K) + 1, s: 1, r: r() * 0.4 }); } for (let k = 0; k < 20; k++) yachts.push({ x: r() * WORLD, y: (1320 + r() * 500) * K, h: -6, s: 1.3, r: r() * 6 }); }
  if (id === "interlagos") for (let k = 0; k < 7; k++) { const p = pts[Math.floor(n * (0.015 + k * 0.025))], L = W / 2 + 70; stands.push({ x: p.x - p.nx * L, y: p.y - p.ny * L, h: p.h, s: 1, r: -Math.atan2(p.ny, p.nx) }); }
  // modelos
  const leaf = new THREE.ConeGeometry(30, 70, 7); leaf.translate(0, 55, 0);
  inst(leaf, M(0x2d7a33), trees); const trunk = new THREE.CylinderGeometry(4, 5, 30, 6); trunk.translate(0, 15, 0); inst(trunk, M(0x6b4423), trees);
  const pt = new THREE.CylinderGeometry(2, 3, 60, 6); pt.translate(0, 30, 0); inst(pt, M(0x8b5a2b), palms);
  const fronds = new THREE.ConeGeometry(22, 12, 6, 1, true); fronds.translate(0, 62, 0); inst(fronds, M(0x2f8f3a, { side: THREE.DoubleSide }), palms);
  const win = (base, lit) => canvasTex(64, 128, (x, w, hh, rr) => { x.fillStyle = lit ? "#1a1c2a" : "#fff"; x.fillRect(0, 0, w, hh); for (let yy = 6; yy < hh; yy += 10) for (let xx = 4; xx < w; xx += 10) { x.fillStyle = lit ? (rr() < 0.55 ? (rr() < 0.7 ? "#ffd86b" : "#9fe3ff") : "#0b0c14") : "#4d6f94"; x.fillRect(xx, yy, 6, 6); } });
  const bgeo = new THREE.BoxGeometry(1, 1, 1);
  if (blds.length) { const t = win(0, false); t.repeat.set(1, 1); const m = inst(bgeo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), blds, () => 1); if (m) m.castShadow = true; }
  if (towers.length) { const t = win(0, true); const mm = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.6 }); for (const o of towers) delete o.c; inst(bgeo, mm, towers, () => 1); }
  if (glass.length) inst(bgeo, new THREE.MeshStandardMaterial({ map: win(0, false), metalness: 0.15, roughness: 0.35, emissive: 0x2a1a10, emissiveIntensity: 0.4 }), glass, () => 1); // arranha-céus de vidro (LA)
  if (houses.length) inst(bgeo, M(0xffffff, { roughness: 0.9 }), houses, () => 1); // casinhas coloridas no morro (Rio)
  if (jungle.length) { const crown = new THREE.IcosahedronGeometry(26, 0); crown.translate(0, 40, 0); inst(crown, M(0x1f6a2a), jungle); const tk = new THREE.CylinderGeometry(3, 4, 22, 6); tk.translate(0, 11, 0); inst(tk, M(0x5a3a1a), jungle); }
  if (yachts.length) { const yg = new THREE.BoxGeometry(60, 10, 18); yg.translate(0, 5, 0); inst(yg, M(0xf7f7f7, { roughness: 0.4 }), yachts); const cab = new THREE.BoxGeometry(24, 8, 12); cab.translate(-4, 14, 0); inst(cab, M(0xdfe3ea), yachts); }
  for (const s0 of stands) { // arquibancadas da reta dos boxes
    const g = new THREE.Group(); g.position.set(s0.x, s0.h, s0.y); g.rotation.y = s0.r; add(g);
    const crowd = canvasTex(256, 32, (x, w, hh, rr) => { x.fillStyle = "#8a8f99"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = ["#ffdd00", "#009c3b", "#fff", "#e53935", "#1e5bc6"][(rr() * 5) | 0]; x.fillRect(rr() * w, rr() * hh, 2, 3); } });
    for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 140), [M(0x8a8f99), M(0x8a8f99), new THREE.MeshStandardMaterial({ map: crowd }), M(0x777), M(0x777), M(0x777)]); st.position.set(-k * 14, 4 + k * 8, 0); st.castShadow = true; g.add(st); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 3, 150), M(0x555a66)); roof.position.set(-30, 64, 0); g.add(roof);
  }
  const NEON = [["#ff4fd8", "東京"], ["#4fe3ff", "夜道"], ["#ffe14f", "走れ"], ["#7dff6b", "友達"]].map(([c, t]) => canvasTex(64, 128, (x, w, hh) => { x.fillStyle = "#0b0b14"; x.fillRect(0, 0, w, hh); x.strokeStyle = c; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, hh - 8); x.fillStyle = c; x.font = "bold 40px sans-serif"; x.textAlign = "center"; x.fillText(t[0], w / 2, 52); x.fillText(t[1], w / 2, 104); }, false));
  for (const o of neons) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 52), new THREE.MeshBasicMaterial({ map: NEON[o.g], side: THREE.DoubleSide }))); m.position.set(o.x, o.h + 40, o.y); m.rotation.y = -o.r + Math.PI / 2; const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 16), M(0x222222))); pole.position.set(o.x, o.h + 8, o.y); }
  if (id === "losangeles") landmarksLA(tr, add, r);
  if (id === "rio") landmarksRio(tr, add, r, size, ribbon);
  // horizonte: montanhas (e o Fuji e a Tokyo Tower em Tóquio)
  const far = (geo, mat, x, y, h) => { const m = add(new THREE.Mesh(geo, mat)); m.position.set(x, h, y); return m; };
  if (id === "tokyo") {
    const fuji = far(new THREE.ConeGeometry(1400, 900, 24), M(0x3b2c63, { fog: false }), -2600, -2400, 300); void fuji;
    const cap = far(new THREE.ConeGeometry(420, 270, 24), M(0xe9e6ff, { fog: false }), -2600, -2400, 615); void cap;
    const tower = far(new THREE.ConeGeometry(70, 700, 4, 8, true), new THREE.MeshBasicMaterial({ color: 0xff4b3a, wireframe: true }), 2600, -1400, 350); void tower;
  } else if (!t.espaco) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, R0 = 3600 + r() * 600, hh = 300 + r() * 500; const m = far(new THREE.ConeGeometry(700 + r() * 500, hh, 7), M(id === "monaco" ? 0x7e8f86 : id === "losangeles" ? 0x8a6a6a : id === "rio" ? 0x2f6a3a : 0x86a37a), WORLD / 2 + Math.cos(a) * R0, WORLD / 2 + Math.sin(a) * R0, hh / 2 - 40); if ((id === "monaco" && Math.sin(a) > 0.3) || (id === "rio" && Math.cos(a) < -0.3)) m.visible = false; }
  // céu
  const sky = new THREE.SphereGeometry(5000, 32, 16), col = [], ps = sky.attributes.position, top = new THREE.Color(look.sky[0]), low = new THREE.Color(look.sky[1]);
  for (let i = 0; i < ps.count; i++) { const yy = ps.getY(i) / 5000, c = low.clone().lerp(top, Math.min(1, Math.max(0, yy * 2.2))); col.push(c.r, c.g, c.b); }
  sky.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const skyM = add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))); skyM.position.set(WORLD / 2, 0, WORLD / 2); tr.sky = skyM;
  if (id === "tokyo") { const moon = add(new THREE.Mesh(new THREE.SphereGeometry(90, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2f0e8, fog: false }))); moon.position.set(WORLD / 2 + 2500, 1800, WORLD / 2 - 3000); }
}
// Los Angeles: placa "GALERA" no morro (estilo Hollywood) e placa verde da freeway em cima da pista
function landmarksLA(tr, add, r) {
  const { pts, n, W } = tr;
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(900, 520, 9), M(0x8a6a5a))); hill.position.set(800, 220, -1500);
  const letters = canvasTex(1024, 160, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "#f4f4f4"; x.font = "bold 150px Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("G A L E R A", w / 2, hh / 2 + 6); }, false);
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 140), new THREE.MeshBasicMaterial({ map: letters, transparent: true }))); sign.position.set(800, 300, -1250); sign.rotation.x = -0.25;
  const p = pts[Math.floor(n * 0.33)], gsign = canvasTex(256, 96, (x, w, hh) => { x.fillStyle = "#1d6b3a"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, hh - 12); x.fillStyle = "#fff"; x.font = "bold 30px sans-serif"; x.textAlign = "center"; x.fillText("110 FREEWAY", w / 2, 42); x.font = "bold 22px sans-serif"; x.fillText("Vila da Galera ↑", w / 2, 76); }, false);
  const g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // o z do grupo aponta para o lado da pista
  const mat = M(0x777777);
  for (const k of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(3, 64, 3), mat); post.position.set(0, 32, k * (W / 2 + 6)); g.add(post); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2, 30, 70), [new THREE.MeshBasicMaterial({ map: gsign }), new THREE.MeshBasicMaterial({ map: gsign }), mat, mat, mat, mat]); board.position.set(0, 64, 0); g.add(board);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 2, W + 12), mat); beam.position.y = 52; g.add(beam);
}
// Rio: calçadão de Copacabana com as ondas pretas e brancas, areia, Pão de Açúcar, Cristo no morro e os Arcos da Lapa
function landmarksRio(tr, add, r, size, ribbon) {
  const { pts, n, W } = tr, L = tr.wallLat, i1 = Math.floor(n * 0.24);
  const waves = canvasTex(128, 128, (x, w, hh) => { x.fillStyle = "#f4f1e6"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#1a1a1a"; x.lineWidth = 14; for (let k = -1; k < 3; k++) { x.beginPath(); for (let yy = 0; yy <= hh; yy += 4) { const xx = w / 2 + Math.sin((yy / hh) * Math.PI * 2) * 30 + k * 0; yy ? x.lineTo(xx + (k - 0.5) * 64, yy) : x.moveTo(xx + (k - 0.5) * 64, yy); } x.stroke(); } });
  ribbon(L, L + 34, 0.5, new THREE.MeshStandardMaterial({ map: waves, roughness: 0.8, side: THREE.DoubleSide }), 40, 0.5, 1, 0, i1);
  const sand = canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#e8d6a8"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#dcc995" : "#f2e3bb"; x.fillRect(rr() * w, rr() * hh, 2, 2); } });
  ribbon(L + 34, L + 190, 0.3, new THREE.MeshStandardMaterial({ map: sand, roughness: 1, side: THREE.DoubleSide }), 64, -10, 4, 0, i1);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x1f8ab0, roughness: 0.15, metalness: 0.25 }))); sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD / 2, -6, WORLD / 2);
  // guarda-sóis coloridos na areia
  for (let i = 4; i < i1; i += 6) { const p = pts[i], d = L + 60 + r() * 90, x = p.x + p.nx * d, y = p.y + p.ny * d, col = [0xff5a5a, 0xffd23f, 0x3fa9f5, 0x7ed07a][(r() * 4) | 0];
    const um = add(new THREE.Mesh(new THREE.ConeGeometry(12, 5, 8), M(col))); um.position.set(x, 13, y); const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12), M(0xdddddd))); st.position.set(x, 6, y); }
  // Pão de Açúcar (dois morros no mar)
  for (const [x, y, s] of [[-420, 1650, 1], [-180, 1820, 0.6]]) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), M(0x4a5a46))); m.scale.set(s, s * 1.9, s * 0.9); m.position.set(x, 0, y); }
  // Cristo Redentor num morro alto atrás da subida
  const hill = add(new THREE.Mesh(new THREE.ConeGeometry(700, 900, 10), M(0x2f5a32))); hill.position.set(2300, 380, -700);
  const stone = M(0xeeeeee, { roughness: 0.6 }), cg = new THREE.Group(); cg.position.set(2300, 830, -700); add(cg);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 110, 10), stone); body.position.y = 55; cg.add(body);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(150, 14, 14), stone); arms.position.y = 98; arms.rotation.y = 0.7; cg.add(arms);
  const head = new THREE.Mesh(new THREE.SphereGeometry(11, 10, 8), stone); head.position.y = 118; cg.add(head);
  // Arcos da Lapa atravessando a pista (o carro passa por baixo de um arco)
  const p = pts[Math.floor(n * 0.79)], g = new THREE.Group(); g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista
  const white = M(0xf4f1e6, { roughness: 0.9 }), span = 34;
  for (let k = -6; k <= 6; k++) {
    const z = k * span; if (Math.abs(z) < W / 2 + 14) continue; // o vão em cima da pista
    const pil = new THREE.Mesh(new THREE.BoxGeometry(10, 64, 10), white); pil.position.set(0, 32, z); pil.castShadow = true; g.add(pil);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 16, span * 13), white); top.position.y = 72; top.castShadow = true; g.add(top);
  for (let k = -6; k < 6; k++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2 - 5, 3, 6, 12, Math.PI), white); arch.position.set(0, 62, (k + 0.5) * span); arch.rotation.y = Math.PI / 2; g.add(arch); }
}
let worldOn = null;
export function useTrack(tr) {
  if (worldOn === tr) return;
  if (worldOn) scene.remove(worldOn.grp);
  worldOn = tr; scene.add(tr.grp);
  const L = tr.look;
  scene.fog = new THREE.Fog(L.fog, L.fogN, L.fogF); renderer.setClearColor(L.fog);
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
}
