// Corrida da Galera — o jogo no navegador: sala, garagem, e a corrida em 3D (Three.js).
// Este é o módulo de entrada: começa e para a corrida, o laço e o desenho, e a capa da página. O resto fica nos
// outros módulos desta pasta (estado, sons, rede, menus, cena, pista, carros, controles, fisica, fantasma e hud).
import { E, SECTORS, COLORS, socket, $, sNow, me, P, act } from "./estado.js";
import { Sound } from "./sons.js";
import { updateGhosts } from "./rede.js";
import { gridSpot, buildTrack, groundH, useTrack } from "./pista.js";
import { renderer, scene, cam, sun, V3 } from "./cena.js";
import { CARS3, KS, makeKart, poseKart, dropKart, puff, stepPuffs } from "./carros.js";
import { camMode, pollPad } from "./controles.js";
import { physics } from "./fisica.js";
import { loadBest, recordLap, drawBest, myProg } from "./fantasma.js";
import { standings, hud } from "./hud.js";

// ---------- corrida ----------
export let race = null, raf = 0;
export const keys = { gas: false, brake: false, left: false, right: false };
export function startRace(st) {
  const tr = buildTrack(st.config.pista), mine = me();
  useTrack(tr);
  const spot = gridSpot(tr.pts, mine ? mine.grid : 0, tr.W);
  if (race) clearRace();
  race = { startAt: st.startAt, tr, car: { x: spot.x, y: spot.y, z: tr.pts[spot.idx].h, vz: 0, air: false, a: spot.a, v: 0, vx: 0, vy: 0, slip: 0, steer: 0 }, idx: spot.idx, sector: SECTORS - 1, lastSent: 0, wrong: 0, ghosts: new Map(), msg: null, beeped: 0, finished: false, laps: 0, shake: 0,
    kart: mine ? makeKart(mine.color, mine.car, false, "", mine.mods) : null, cam: { pos: null, a: spot.a }, lapT0: st.startAt, rec: [], recLast: -1e9, best: loadBest(st.config.pista), bestKart: null, bptr: 0, draft: 0, draftT: 0, sling: 0 };
  $("results").classList.add("hidden");
  resize();
  if (!raf) raf = requestAnimationFrame(loop);
}
function clearRace() { if (!race) return; dropKart(race.kart); dropKart(race.bestKart); for (const gh of race.ghosts.values()) dropKart(gh.kart); }
export function stopRace() { clearRace(); race = null; Sound.engine(0, false); }
function resize() {
  const w = window.innerWidth, hh = window.innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix();
  const touch = matchMedia("(pointer: coarse)").matches;
  $("padL").classList.toggle("hidden", !touch); $("padR").classList.toggle("hidden", !touch);
}
window.addEventListener("resize", () => race && resize());

// ponto da pista mais perto (procura perto do último, ou na pista toda)
export function nearest(tr, x, y, from) {
  let best = from, bd = Infinity;
  const scan = (i0, i1, st = 1) => { for (let k = i0; k <= i1; k += st) { const i = (k + tr.n) % tr.n, p = tr.pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } } };
  scan(from - 40, from + 40);
  if (bd > 160 * 160) { scan(0, tr.n - 1, 2); scan(best - 3, best + 3); }
  return best;
}
export function respawn() {
  if (!race || sNow() < race.startAt) return;
  const p = race.tr.pts[race.idx]; Object.assign(race.car, { x: p.x, y: p.y, z: p.h, vz: 0, air: false, a: Math.atan2(p.ty, p.tx), v: 0, vx: 0, vy: 0, slip: 0 }); Sound.pop();
}

let lastT = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  if (!race) { raf && cancelAnimationFrame(raf); raf = 0; return; }
  const dt = Math.min(1 / 30, (t - (lastT || t)) / 1000); lastT = t;
  pollPad();
  if (E.S && E.S.phase === "race") { const steps = dt > 1 / 50 ? 2 : 1; for (let i = 0; i < steps; i++) physics(dt / steps); }
  updateGhosts(dt);
  recordLap();
  if (me() && E.S.phase === "race" && performance.now() - race.lastSent > 100) { race.lastSent = performance.now(); socket.emit("pos", { x: race.car.x, y: race.car.y, z: race.car.z, a: race.car.a, v: race.car.v, prog: myProg() }); }
  Sound.engine(race.car.v, E.S && E.S.phase === "race" && sNow() >= race.startAt - 300 && !!me());
  Sound.skid(me() && E.S.phase === "race" && race.car.slip > 45 ? race.car.slip : 0);
  draw(dt);
  hud();
}

// câmera atrás do kart (quem só assiste segue o primeiro colocado)
function draw(dt) {
  const tr = race.tr, c = race.car;
  // meu kart
  if (race.kart) {
    const slide = Math.max(-1, Math.min(1, (c.slip || 0) / 160)) * Math.sign(c.steer || 1), fr = groundH(tr, c.x, c.y, race.idx);
    poseKart(race.kart, c.x, c.y, c.z, c.a + slide * 0.25, c.v, c.steer, fr, dt, -c.steer * 0.04, c.air ? -0.12 : 0);
    if (c.slip > 45 && Math.random() < 0.7) for (const s of [-1, 1]) puff(c.x - Math.cos(c.a) * 15 + -Math.sin(c.a) * s * 8, c.z + 2, c.y - Math.sin(c.a) * 15 + Math.cos(c.a) * s * 8, "#e6e6e6", 3.5);
    if (race.offroad && Math.random() < 0.5) puff(c.x - Math.cos(c.a) * 18, c.z + 2, c.y - Math.sin(c.a) * 18, tr.id === "interlagos" ? "#b39c66" : "#9a9a9a", 2.5);
  }
  // fantasmas
  for (const [id, gh] of race.ghosts) {
    const pl = P(id); if (!pl) continue;
    const key = pl.color + pl.car + JSON.stringify(pl.mods || {}); if (!gh.kart || gh.kartKey !== key) { dropKart(gh.kart); gh.kart = makeKart(pl.color, pl.car, true, pl.name, pl.mods); gh.kartKey = key; }
    poseKart(gh.kart, gh.x, gh.y, gh.z, gh.a, gh.v || 0, 0, groundH(tr, gh.x, gh.y, gh.idx || 0), dt);
  }
  drawBest(dt);
  stepPuffs(dt);
  let src = c;
  if (!me()) { const lead = standings()[0]; const gh = lead && race.ghosts.get(lead.id); if (gh) src = gh; }
  const C = race.cam, k = 1 - Math.exp(-dt * 6), mode = src === c && race.kart ? camMode : "longe";
  let da = src.a - C.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; C.a += da * (1 - Math.exp(-dt * (mode === "perto" ? 7 : 5)));
  const speedK = Math.min(1.2, Math.abs(src.v || 0) / 300);
  if (race.kart) { const out = mode !== "cockpit"; race.kart.roof.visible = race.kart.cabin.visible = out; for (const b of race.kart.roofBits) b.visible = out; } // de dentro, cabine, teto e faixa do teto tapariam a vista
  if (mode === "cockpit") {
    // primeira pessoa: no lugar do piloto, olhando pelo para-brisa (o capô aparece embaixo)
    const spec = CARS3[me().car] || CARS3.equilibrado, eyeU = spec.cabin[1][0] + 0.1, eyeH = spec.cabin[1][1] + 0.02;
    const fx = Math.cos(c.a), fy = Math.sin(c.a), fo = (eyeU - spec.L / 2) * KS, eh = eyeH * KS;
    const ahead = c.air ? c.z : groundH(tr, c.x + fx * 70, c.y + fy * 70, nearest(tr, c.x + fx * 70, c.y + fy * 70, race.idx));
    C.lookY = C.lookY == null ? ahead : C.lookY + (ahead - C.lookY) * (1 - Math.exp(-dt * 6));
    cam.position.set(c.x + fx * fo, c.z + eh, c.y + fy * fo); C.pos = null;
    cam.lookAt(c.x + fx * (fo + 70), C.lookY + eh + 1, c.y + fy * (fo + 70));
    if (race.shake > 0) { race.shake -= dt; cam.position.y += (Math.random() - 0.5) * 1.2; }
    if (race.offroad) cam.position.y += (Math.random() - 0.5) * 0.6;
    cam.fov += ((74 + speedK * 12) - cam.fov) * 0.08; cam.updateProjectionMatrix();
  } else {
    // atrás do carro: perto (padrão) ou longe
    const near = mode === "perto", back = near ? 50 + speedK * 8 : 88 + speedK * 16, up = near ? 17 + speedK * 2 : 30 + speedK * 4;
    const fx = Math.cos(C.a), fy = Math.sin(C.a);
    const want = V3(src.x - fx * back, (src.z || 0) + up, src.y - fy * back);
    want.y = Math.max(want.y, groundH(tr, want.x, want.z, nearest(tr, want.x, want.z, race.idx)) + 6);
    if (!C.pos) C.pos = want.clone(); else C.pos.lerp(want, near ? 1 - Math.exp(-dt * 9) : k);
    cam.position.copy(C.pos);
    if (race.shake > 0) { race.shake -= dt; cam.position.x += (Math.random() - 0.5) * 3; cam.position.y += (Math.random() - 0.5) * 3; }
    if (race.offroad) cam.position.y += (Math.random() - 0.5) * 1.2;
    cam.lookAt(src.x + fx * (near ? 35 : 45), (src.z || 0) + (near ? 9 : 12), src.y + fy * (near ? 35 : 45));
    cam.fov += ((near ? 70 : 68) + speedK * 10 - cam.fov) * 0.08; cam.updateProjectionMatrix();
  }
  // sol e sombras acompanham o carro
  sun.position.set(src.x - 300, (src.z || 0) + 700, src.y + 260); sun.target.position.set(src.x, src.z || 0, src.y);
  if (tr.sky) tr.sky.position.set(cam.position.x, 0, cam.position.z);
  renderer.render(scene, cam);
}
// ---------- capa: a largada de Interlagos em 3D (o mesmo desenho da corrida) ----------
(function heroArt() {
  const paint = () => {
    const tr = buildTrack("interlagos"); useTrack(tr);
    const at = (g) => gridSpot(tr.pts, g, tr.W), ks = [];
    [[4, COLORS[0], "equilibrado", { aero: "alto", rodas: "preta" }], [0, COLORS[1], "foguete", { faixa: "lateral" }], [1, COLORS[2], "drifteiro", { aero: "baixo", rodas: "ouro" }], [2, COLORS[3], "formiga", { faixa: "dupla" }], [3, COLORS[4], "tanque", { faixa: "dupla", rodas: "preta" }]].forEach(([g, col, model, mods]) => { const s = at(g), k = makeKart(col, model, false, "", mods); poseKart(k, s.x, s.y, tr.pts[s.idx].h, s.a, 0, 0, tr.pts[s.idx].h, 0); ks.push(k); });
    const s = at(4), fx = Math.cos(s.a), fy = Math.sin(s.a), h = tr.pts[s.idx].h;
    renderer.setSize(640, 360, false); cam.aspect = 16 / 9; cam.fov = 64; cam.updateProjectionMatrix();
    cam.position.set(s.x - fx * 60, h + 22, s.y - fy * 60); cam.lookAt(s.x + fx * 60, h + 8, s.y + fy * 60);
    sun.position.set(s.x - 300, h + 700, s.y + 260); sun.target.position.set(s.x, h, s.y); if (tr.sky) tr.sky.position.set(s.x, 0, s.y);
    renderer.render(scene, cam);
    const hc = $("heroArt"); hc.width = 640; hc.height = 360; hc.getContext("2d").drawImage(renderer.domElement, 0, 0);
    ks.forEach(dropKart);
  };
  setTimeout(() => { try { paint(); } catch (e) { console.warn(e); } }, 60);
})();
if (location.hash === "#debug") window.__corrida = { get race() { return race; }, get S() { return E.S; }, keys, physics, groundH, buildTrack, act };
