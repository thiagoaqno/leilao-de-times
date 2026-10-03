// Pelada da Galera — a bola online: prevista a partir do último pacote do servidor (a mesma física de campo.js),
// conduzida aqui quando está no meu pé, e interpolada quando outro jogador conduz.
import * as THREE from "three";
import { E, C, clamp, lerp, FL, INTERP, relogio, sNow, G, now, ballS, local, isCar, offline } from "./estado.js";
import { carO } from "./bonecos.js";
import { ballMesh, blob, landMark } from "./cena.js";
import { Sound } from "./sons.js";

// toque meu na bola conduzindo: a perna bate na bola, um somzinho e o corpo dá uma "amassadinha"
export function toqueMeu() { G.me.st.toqueT = now(); G.me.forcaAte = 0; Sound.toque(Math.min(1, Math.hypot(G.me.vx, G.me.vz) / 8)); }

// onde está a bola agora: segura na mão do goleiro, ou prevista a partir do último pacote (com o meu corpo junto)
function holderPos(id) {
  if (E.ME && id === E.ME.id && G.me) return { x: G.me.x, y: G.me.y, z: G.me.z, yaw: G.me.facing };
  const rm = G.remotes.get(id); return rm ? { x: rm.x, y: rm.y, z: rm.z, yaw: rm.yaw } : null;
}
export function predictBall() {
  const s = ballS.snap; if (!s) return null;
  if (s.holder) { const hp = holderPos(s.holder); if (hp) return { x: hp.x - Math.sin(hp.yaw) * 0.45, y: hp.y + 1.15, z: hp.z - Math.cos(hp.yaw) * 0.45, vx: 0, vy: 0, vz: 0, holder: s.holder }; }
  const b = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, sp: s.sp || 0, wx: s.wx || 0, wy: s.wy || 0, wz: s.wz || 0, holder: null, dono: s.dono };
  const live = E.S && E.S.match && E.S.match.phase !== "ready";
  const dt = live ? clamp((sNow() - s.t) / 1000, 0, 0.25) : 0;
  const me = myBody();
  if (dt > 0) C.simulate(G.F, b, me ? [me] : [], dt);
  return b;
}
// os outros jogadores, onde estão agora, para a bola no meu pé bater neles (e eles poderem tomar) aqui também
function corposRemotos() {
  const out = [];
  for (const rm of G.remotes.values()) out.push({ id: rm.id, kind: "pe", x: rm.px ?? rm.x, y: rm.y, z: rm.pz ?? rm.z, vx: rm.pvx || 0, vy: 0, vz: rm.pvz || 0, yaw: rm.yaw,
    sprint: rm.f & FL.sprint, slide: rm.f & (FL.slide | FL.down), dive: rm.f & FL.dive, conduz: true });
  return out;
}
// a bola no instante t (relógio do servidor), entre dois pacotes, como os bonecos dos outros
function interpBola(t) {
  const q = ballS.buf; if (!q || q.length < 2) return null;
  let i = q.length - 1; while (i > 0 && q[i - 1].t > t) i--;
  const B = q[i], A = q[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((t - A.t) / (B.t - A.t), 0, 1);
  return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), z: lerp(A.z, B.z, k) };
}
export function myBody() {
  if (!G.meModel || !G.me) return null;
  const me = G.me;
  return isCar() ? { id: "eu", kind: "car", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, yaw: me.yaw, flip: me.flipT > 0, o: carO(me) }
    : { id: "eu", kind: "pe", x: me.x, y: me.y, z: me.z, vx: me.vx, vy: me.vy, vz: me.vz, yaw: me.facing, sprint: me.sprint, slide: me.slideT > 0 || me.downT > 0, dive: me.diveT > 0, girando: !!me.girando,
      conduz: !G.falta, chutou: now() - me.lastKick < 0.35, protege: !!me.protege, forcaToque: now() < (me.forcaAte || 0) }; // conduz: a bola fica no pé (na falta, não)
}
export function updateBall(dt) {
  let b;
  if (offline()) b = local.ball;
  else if (ballS.mine) { // bola no meu pé: física aqui mesmo, a cada quadro (sem esperar o servidor)
    const m = ballS.mine, eu = myBody();
    const toques = m.toques;
    C.simulate(G.F, m, eu ? [eu, ...corposRemotos()] : [], dt);
    if (m.toques !== toques && m.toqueDe === "eu") toqueMeu(); // toque conduzindo: a perna bate na bola
    if (m.dono !== "eu") { // escapou do pé aqui (ou alguém tomou): volta a seguir o servidor a partir daqui
      ballS.snap = { t: sNow(), x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, sp: m.sp || 0, wx: 0, wy: 0, wz: 0, holder: null, dono: m.dono };
      ballS.off = { x: 0, y: 0, z: 0 }; ballS.ignoreUntil = performance.now() + relogio.rtt + 60; ballS.mine = null;
    }
    b = ballS.view; Object.assign(b, { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, wx: 0, wy: 0, wz: 0, holder: null });
  } else {
    // outro jogador conduzindo: a bola é desenhada no mesmo relógio que ele (interpolada 100 ms no passado, como os
    // bonecos dos outros), senão ela aparece adiantada e balançando em relação ao pé dele. Perto de mim, o boneco dele
    // é desenhado no presente (rm.k), e a bola acompanha. Sem dono (ou eu), a bola é prevista no presente.
    const pred = predictBall() || C.newBall(G.F), s = ballS.snap;
    const rmD = s && !s.holder && s.dono && s.dono !== "eu" ? G.remotes.get(s.dono) : null, it = rmD ? interpBola(sNow() - INTERP) : null;
    const alvo = it ? { ...pred, x: lerp(it.x, pred.x, rmD.k || 0), y: lerp(it.y, pred.y, rmD.k || 0), z: lerp(it.z, pred.z, rmD.k || 0) } : pred;
    const modo = it ? "outro" : "prev"; b = ballS.view;
    if (modo !== ballS.modo) { ballS.off = { x: b.x - alvo.x, y: b.y - alvo.y, z: b.z - alvo.z }; if (Math.hypot(ballS.off.x, ballS.off.z) > 4) ballS.off = { x: 0, y: 0, z: 0 }; ballS.modo = modo; } // troca sem pulo
    const k = Math.exp(-dt * 12); ballS.off.x *= k; ballS.off.y *= k; ballS.off.z *= k;
    b.x = alvo.x + ballS.off.x; b.y = Math.max(G.F.ballR, alvo.y + ballS.off.y); b.z = alvo.z + ballS.off.z; b.vx = pred.vx; b.vy = pred.vy; b.vz = pred.vz; b.wx = pred.wx || 0; b.wy = pred.wy || 0; b.wz = pred.wz || 0; b.holder = pred.holder || null;
  }
  if (!b) return;
  const R = G.F.ballR, prev = ballMesh.userData.prev || { x: b.x, z: b.z }, mx = b.x - prev.x, mz = b.z - prev.z, dist = Math.hypot(mx, mz);
  const w = Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0);
  if (G.F.rl && w > 1e-3) ballMesh.rotateOnWorldAxis(new THREE.Vector3(b.wx / w, b.wy / w, b.wz / w), w * dt); // giro de verdade (Rocket)
  else if (dist > 1e-5 && dist < 4) ballMesh.rotateOnWorldAxis(new THREE.Vector3(mz / dist, 0, -mx / dist), dist / R);
  ballMesh.userData.prev = { x: b.x, z: b.z };
  ballMesh.position.set(b.x, b.y, b.z);
  blob.position.set(b.x, 0.02, b.z); blob.material.opacity = clamp(0.3 - (b.y - R) * 0.03, 0.05, 0.3);
  // Rocket: marca no chão de onde a bola vai cair (quando ela está no alto)
  const air = G.F.rl && b.y > R + 2 && !b.holder, L = air ? C.landing(G.F, b) : null;
  landMark.visible = !!L;
  if (L) { landMark.position.set(L.x, 0.04, L.z); landMark.scale.setScalar(R * (0.8 + Math.min(1, L.t) * 0.6)); landMark.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(now() * 6)); }
}
