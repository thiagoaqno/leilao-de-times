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
import { f1Pronto } from "./f1.js";
import { propsPronto } from "./props.js";
import { startItems, stopItems, stepItems } from "./itens.js";
import { passoEfeitos, limparEfeitos } from "./efeitos.js";
import { animarVida } from "./vida.js";
import { ceuPronto } from "./ceu.js";
import { desenhar, ajustarTela, medirQuadro } from "./desfoque.js";
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

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
  startItems(tr, st.config.caixas);
  $("results").classList.add("hidden");
  resize();
  if (!raf) raf = requestAnimationFrame(loop);
}
function clearRace() { if (!race) return; stopItems(); limparEfeitos(); dropKart(race.kart); dropKart(race.bestKart); for (const gh of race.ghosts.values()) dropKart(gh.kart); }
export function stopRace() { clearRace(); race = null; Sound.engine(0, false); Sound.rivais([]); }
function resize() {
  const w = window.innerWidth, hh = window.innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); ajustarTela(w, hh);
  const touch = matchMedia("(pointer: coarse)").matches;
  $("padL").classList.toggle("hidden", !touch); $("padR").classList.toggle("hidden", !touch); $("padM").classList.toggle("hidden", !touch || !E.S || E.S.config.cambio !== "manual");
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
  race.sujou = true; // volta com "↺ Pista" não serve de exemplo para os robôs
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
  Sound.engine(race.car.v, E.S && E.S.phase === "race" && sNow() >= race.startAt - 300 && !!me(), keys.gas, race.marcha || 1, race.rpm || 0);
  Sound.rivais([...race.ghosts.values()].map((g) => ({ d: Math.hypot(g.x - race.car.x, g.y - race.car.y), v: g.v || 0 })));
  Sound.skid(me() && E.S.phase === "race" && race.car.slip > 45 ? race.car.slip : 0);
  draw(dt);
  medirQuadro();
  hud();
}

// O kart sente o relevo: mede o chão embaixo do bico, da traseira e dos dois lados e inclina junto (sobe o bico na
// subida, desce na descida). No ar, o bico segue a velocidade de subida/queda.
function inclinacao(tr, x, y, a, idx, L, W, vz, noAr, v) {
  if (noAr) return { pitch: Math.max(-0.5, Math.min(0.4, Math.atan2(vz || 0, Math.max(60, Math.abs(v))))), roll: 0 };
  const fx = Math.cos(a), fy = Math.sin(a), h = (dx, dy) => groundH(tr, x + dx, y + dy, idx);
  const frente = h(fx * L / 2, fy * L / 2), tras = h(-fx * L / 2, -fy * L / 2), dir = h(-fy * W / 2, fx * W / 2), esq = h(fy * W / 2, -fx * W / 2);
  return { pitch: Math.atan2(frente - tras, L), roll: Math.atan2(dir - esq, W) };
}
const fxDe = (p, now, extra = {}) => ({ turbo: !!(p && p.boostUntil > now) || !!extra.turbo, estrela: !!(p && p.starUntil > now), rodando: !!(p && (p.spinUntil > now || race.atingidos?.[p.id] > now)) || !!extra.rodando, derrapa: extra.derrapa || 0 });
// câmera atrás do kart (quem só assiste segue o primeiro colocado)
function draw(dt) {
  const tr = race.tr, c = race.car, now = sNow();
  // meu kart
  if (race.kart) {
    const slide = Math.max(-1, Math.min(1, (c.slip || 0) / 160)) * Math.sign(c.steer || 1), fr = groundH(tr, c.x, c.y, race.idx);
    const spec = CARS3[me()?.car] || CARS3.equilibrado, inc = inclinacao(tr, c.x, c.y, c.a, race.idx, spec.L * KS, spec.W * KS, c.vz, c.air, c.v);
    race.pitch = inc.pitch;
    const turbo = race.boostUntil > now || race.sling > 0, rodando = race.spinUntil > now;
    poseKart(race.kart, c.x, c.y, c.z, c.a + slide * 0.25, c.v, c.steer, fr, dt, -c.steer * 0.04 + inc.roll, inc.pitch, fxDe(me(), now, { turbo, rodando, derrapa: c.slip > 45 ? (c.slip > 110 ? 2 : 1) : 0 }));
    // derrapagem: fumaça branca saindo dos pneus de trás, mais grossa quanto mais o carro escorrega
    if (c.slip > 40 && !c.air) { const forte = Math.min(1, (c.slip - 40) / 120); for (const s of [-1, 1]) if (Math.random() < 0.55 + forte * 0.45) puff(c.x - Math.cos(c.a) * 15 + -Math.sin(c.a) * s * 9, c.z + 3, c.y - Math.sin(c.a) * 15 + Math.cos(c.a) * s * 9, "#eeeeee", 3.2 + forte * 3, 0.8 + forte * 0.6, 1.7, 0.3 + forte * 0.22); }
    if (race.offroad && Math.random() < 0.5) puff(c.x - Math.cos(c.a) * 18, c.z + 2, c.y - Math.sin(c.a) * 18, tr.id === "interlagos" ? "#b39c66" : "#9a9a9a", 2.5);
  }
  // os outros pilotos (carros de verdade: dá para bater)
  for (const [id, gh] of race.ghosts) {
    const pl = P(id); if (!pl) continue;
    const key = pl.color + pl.car + JSON.stringify(pl.mods || {}); if (!gh.kart || gh.kartKey !== key) { dropKart(gh.kart); gh.kart = makeKart(pl.color, pl.car, false, pl.name, pl.mods); gh.kartKey = key; }
    const spec = CARS3[pl.car] || CARS3.equilibrado, gz = groundH(tr, gh.x, gh.y, gh.idx || 0), noAr = gh.z > gz + 3;
    gh.vz = ((gh.z - (gh.zAnt ?? gh.z)) / Math.max(dt, 1e-3)) * 0.3 + (gh.vz || 0) * 0.7; gh.zAnt = gh.z;
    const inc = inclinacao(tr, gh.x, gh.y, gh.a, gh.idx || 0, spec.L * KS, spec.W * KS, gh.vz, noAr, gh.v || 0);
    // o volante dos outros: pela rapidez com que a direção muda (no carro, girar 2,4 rad/s é o volante todo)
    let da = gh.a - (gh.aAnt ?? gh.a); da = Math.atan2(Math.sin(da), Math.cos(da)); gh.aAnt = gh.a;
    gh.vira = (gh.vira || 0) + (Math.max(-1, Math.min(1, da / Math.max(dt, 1e-3) / 2.4)) - (gh.vira || 0)) * Math.min(1, dt * 8);
    poseKart(gh.kart, gh.x, gh.y, gh.z, gh.a, gh.v || 0, gh.vira, gz, dt, inc.roll, inc.pitch, fxDe(pl, now));
  }
  drawBest(dt);
  stepPuffs(dt);
  passoEfeitos(dt);
  stepItems(race, dt);
  for (const cone of tr.cones || []) if (cone.hit > 0) {
    cone.hit = Math.max(0, cone.hit - dt * 0.85);
    cone.mesh.rotation.x = Math.sin(cone.dir) * cone.hit * 0.9;
    cone.mesh.rotation.z = -Math.cos(cone.dir) * cone.hit * 0.9;
  }
  let src = c;
  if (!me()) { const lead = standings()[0]; const gh = lead && race.ghosts.get(lead.id); if (gh) src = gh; }
  animarVida(tr, dt, src);
  const C = race.cam, k = 1 - Math.exp(-dt * 6), mode = src === c && race.kart ? camMode : "longe";
  let da = src.a - C.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; C.a += da * (1 - Math.exp(-dt * (mode === "perto" ? 7 : 5)));
  const reduceMotion = motionPreference.matches;
  const speedK = Math.min(1.2, Math.abs(src.v || 0) / 440);
  const surge = Math.max(0, Math.min(1, ((src.v || 0) - (C.lastV || 0)) / Math.max(dt, 0.01) / 90));
  C.lastV = src.v || 0;
  C.surge = (C.surge || 0) + ((reduceMotion ? 0 : surge) - (C.surge || 0)) * (1 - Math.exp(-dt * 5));
  const fovStep = 1 - Math.exp(-dt * 5);
  if (race.kart) { const out = mode !== "cockpit"; race.kart.roof.visible = race.kart.cabin.visible = out; for (const b of race.kart.roofBits) b.visible = out; } // de dentro, cabine, teto e faixa do teto tapariam a vista
  if (mode === "cockpit") {
    // primeira pessoa: no lugar do piloto, olhando por cima do volante (o bico do kart aparece embaixo)
    const spec = CARS3[me().car] || CARS3.equilibrado, eyeU = race.kart.eye.u, eyeH = race.kart.eye.h;
    const fx = Math.cos(c.a), fy = Math.sin(c.a), fo = (eyeU - spec.L / 2) * KS, eh = eyeH * KS;
    const ahead = c.air ? c.z : groundH(tr, c.x + fx * 70, c.y + fy * 70, nearest(tr, c.x + fx * 70, c.y + fy * 70, race.idx));
    C.lookY = C.lookY == null ? ahead : C.lookY + (ahead - C.lookY) * (1 - Math.exp(-dt * 6));
    // os olhos acompanham o kart: na subida a vista levanta, na descida abaixa (o pitch do kart, suavizado)
    C.pitch = (C.pitch || 0) + ((race.pitch || 0) - (C.pitch || 0)) * (1 - Math.exp(-dt * 8));
    cam.position.set(c.x + fx * fo, c.z + eh + 1.5 + Math.sin(C.pitch) * fo * 0.5, c.y + fy * fo); C.pos = null; // na altura dos olhos, rente ao chão
    cam.lookAt(c.x + fx * (fo + 70), Math.max(C.lookY, c.z + Math.tan(C.pitch) * 70 - 6) + eh * 0.5, c.y + fy * (fo + 70));
    if (!reduceMotion) { // a vibração cresce com a velocidade e o volante inclina um pouco a cabeça
      const trem = speedK * speedK * 0.35 + (race.offroad ? 0.7 : 0);
      cam.position.y += (Math.random() - 0.5) * trem; cam.position.x += (Math.random() - 0.5) * trem * 0.5;
      cam.rotateZ(-c.steer * 0.035 * Math.min(1, speedK * 1.5));
    }
    if (race.shake > 0) { race.shake -= dt; if (!reduceMotion) cam.position.y += (Math.random() - 0.5) * 1.6; }
    cam.fov += ((72 + speedK * (reduceMotion ? 6 : 22) + C.surge * 4) - cam.fov) * fovStep; cam.updateProjectionMatrix();
  } else {
    // atrás do carro: perto (padrão) ou longe; alta e olhando um pouco para baixo, para ver o que vem na frente do kart
    const near = mode === "perto", back = near ? 50 + speedK * (reduceMotion ? 5 : 22) + C.surge * 8 : 88 + speedK * (reduceMotion ? 8 : 27) + C.surge * 8, up = near ? 30 + speedK * 2 : 52 + speedK * 4;
    const fx = Math.cos(C.a), fy = Math.sin(C.a);
    const want = V3(src.x - fx * back, (src.z || 0) + up, src.y - fy * back);
    want.y = Math.max(want.y, groundH(tr, want.x, want.z, nearest(tr, want.x, want.z, race.idx)) + 6);
    if (!C.pos) C.pos = want.clone(); else C.pos.lerp(want, near ? 1 - Math.exp(-dt * 9) : k);
    cam.position.copy(C.pos);
    if (race.shake > 0) { race.shake -= dt; if (!reduceMotion) { cam.position.x += (Math.random() - 0.5) * 3; cam.position.y += (Math.random() - 0.5) * 3; } }
    if (race.offroad && !reduceMotion) cam.position.y += (Math.random() - 0.5) * 1.2;
    if (!reduceMotion && speedK > 0.75) cam.position.y += (Math.random() - 0.5) * (speedK - 0.75) * 1.4; // tremidinha no fim de reta
    // olha para o chão lá na frente: na subida a câmera levanta o olhar, na descida abaixa
    const la = near ? 55 : 70, lx = src.x + fx * la, ly = src.y + fy * la, chao = groundH(tr, lx, ly, nearest(tr, lx, ly, race.idx));
    C.lookH = C.lookH == null ? chao : C.lookH + (chao - C.lookH) * (1 - Math.exp(-dt * 5));
    cam.lookAt(lx, Math.max((src.z || 0) + 4 + (C.lookH - (src.z || 0)) * 0.6, C.lookH + 2), ly);
    cam.fov += ((near ? 70 : 68) + speedK * (reduceMotion ? 4 : 19) + C.surge * 4 - cam.fov) * fovStep; cam.updateProjectionMatrix();
  }
  // sol e sombras acompanham o carro (a direção do sol vem da foto do céu, quando tem)
  const sd = tr.sol; if (sd) sun.position.set(src.x + sd.x * 800, (src.z || 0) + sd.y * 800, src.y + sd.z * 800); else sun.position.set(src.x - 300, (src.z || 0) + 700, src.y + 260);
  sun.target.position.set(src.x, src.z || 0, src.y);
  if (tr.sky) tr.sky.position.set(cam.position.x, 0, cam.position.z);
  // desfoque de velocidade: começa perto de 110 km/h e fica forte no fim de reta, no turbo e no estilingue
  const turbo = src === c && (race.boostUntil > now || race.sling > 0 || (me() && me().boostUntil > now));
  desenhar(Math.max(0, (Math.abs(src.v || 0) - 220) / 230) + (turbo ? 0.45 : 0));
}
// ---------- capa: a largada de Interlagos em 3D (o mesmo desenho da corrida) ----------
(function heroArt() {
  const paint = () => {
    const tr = buildTrack("interlagos"); useTrack(tr);
    const at = (g) => gridSpot(tr.pts, g, tr.W), ks = [];
    [[4, COLORS[0], "equilibrado", { pintura: "classico" }], [0, COLORS[1], "foguete", { pintura: "papaia" }], [1, COLORS[2], "drifteiro", { pintura: "flecha" }], [2, COLORS[3], "formiga", { pintura: "touro" }], [3, COLORS[4], "tanque", { pintura: "rosso" }]].forEach(([g, col, model, mods]) => { const s = at(g), k = makeKart(col, model, false, "", mods); poseKart(k, s.x, s.y, tr.pts[s.idx].h, s.a, 0, 0, tr.pts[s.idx].h, 0); ks.push(k); });
    const s = at(4), fx = Math.cos(s.a), fy = Math.sin(s.a), h = tr.pts[s.idx].h;
    renderer.setSize(640, 360, false); cam.aspect = 16 / 9; cam.fov = 64; cam.updateProjectionMatrix();
    cam.position.set(s.x - fx * 60, h + 34, s.y - fy * 60); cam.lookAt(s.x + fx * 60, h + 4, s.y + fy * 60);
    const sd = tr.sol; if (sd) sun.position.set(s.x + sd.x * 800, h + sd.y * 800, s.y + sd.z * 800); else sun.position.set(s.x - 300, h + 700, s.y + 260); sun.target.position.set(s.x, h, s.y); if (tr.sky) tr.sky.position.set(s.x, 0, s.y);
    renderer.render(scene, cam);
    const hc = $("heroArt"); hc.width = 640; hc.height = 360; hc.getContext("2d").drawImage(renderer.domElement, 0, 0);
    ks.forEach(dropKart);
  };
  setTimeout(() => { try { paint(); } catch (e) { console.warn(e); } }, 60);
  Promise.all([f1Pronto, propsPronto, ceuPronto("interlagos")]).then(() => { try { paint(); } catch (e) { console.warn(e); } }); // de novo, quando o kart, os enfeites do Kenney e o céu chegam
})();
if (location.hash === "#debug") window.__corrida = { get race() { return race; }, get S() { return E.S; }, keys, physics, groundH, buildTrack, act, renderer, scene, cam };
