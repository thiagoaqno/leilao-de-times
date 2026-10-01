// Boneco de pano (ragdoll) para os jogos 3D: quando o soldado do Tiro morre ou o jogador da Pelada é derrubado, o
// corpo vira um esqueleto de 15 pontos ligados por "varetas" (física de Verlet): cai com a gravidade, dobra joelhos e
// cotovelos, quica um pouco no chão e para. As partes do corpo (caixas) são desenhadas em cima dos pontos.
import * as THREE from "three";

// pontos do esqueleto, em pé, olhando para -z (x positivo = lado direito do boneco)
const P = { head: 0, neck: 1, pelvis: 2, lSh: 3, rSh: 4, lEl: 5, rEl: 6, lHa: 7, rHa: 8, lHip: 9, rHip: 10, lKn: 11, rKn: 12, lFt: 13, rFt: 14 };
const REST = [
  [0, 1.62, 0], [0, 1.42, 0], [0, 0.92, 0],
  [-0.25, 1.38, 0], [0.25, 1.38, 0], [-0.3, 1.1, 0.02], [0.3, 1.1, 0.02], [-0.31, 0.82, -0.02], [0.31, 0.82, -0.02],
  [-0.11, 0.88, 0], [0.11, 0.88, 0], [-0.11, 0.48, -0.02], [0.11, 0.48, -0.02], [-0.11, 0.06, 0.02], [0.11, 0.06, 0.02],
];
// varetas: [a, b] com o comprimento de pé; as cruzadas deixam o tronco rígido e a cabeça presa nos ombros
const STICKS = [
  ["head", "neck"], ["neck", "lSh"], ["neck", "rSh"], ["lSh", "rSh"], ["lHip", "rHip"], ["pelvis", "lHip"], ["pelvis", "rHip"],
  ["lSh", "lHip"], ["rSh", "rHip"], ["lSh", "rHip"], ["rSh", "lHip"], ["neck", "pelvis"], ["head", "lSh"], ["head", "rSh"],
  ["lSh", "lEl"], ["lEl", "lHa"], ["rSh", "rEl"], ["rEl", "rHa"], ["lHip", "lKn"], ["lKn", "lFt"], ["rHip", "rKn"], ["rKn", "rFt"],
].map(([a, b]) => [P[a], P[b]]);
// distância mínima (o braço e a perna não dobram ao contrário até encostar)
const MINS = [["lSh", "lHa", 0.3], ["rSh", "rHa", 0.3], ["lHip", "lFt", 0.5], ["rHip", "rFt", 0.5], ["head", "pelvis", 0.6]].map(([a, b, d]) => [P[a], P[b], d]);

const UP = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4();
const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; };

export class Ragdoll {
  // o: { scene, x, y, z, yaw, vel: {x, y, z}, push: {x, y, z} (empurrão no peito), headPush, mats: {head, hair?, torso, upperArm,
  //   forearm, thigh, shin, boot}, life (s), floor(x, z) -> altura do chão, solid(p) -> empurra o ponto para fora de paredes }
  constructor(o) {
    this.o = o; this.t = 0; this.life = o.life ?? 6; this.scene = o.scene;
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw), v = o.vel || { x: 0, y: 0, z: 0 }, h = 1 / 120;
    this.p = REST.map(([x, y, z]) => new THREE.Vector3(o.x + x * c + z * s, o.y + y, o.z - x * s + z * c));
    this.q = this.p.map((p) => p.clone().sub(new THREE.Vector3(v.x * h, v.y * h, v.z * h))); // posição anterior (Verlet)
    this.len = STICKS.map(([a, b]) => this.p[a].distanceTo(this.p[b]));
    const kick = (i, f, k = 1) => { if (f) this.q[i].sub(new THREE.Vector3(f.x * h * k, f.y * h * k, f.z * h * k)); };
    for (const i of [P.neck, P.lSh, P.rSh]) kick(i, o.push, 1);
    for (const i of [P.pelvis, P.lHip, P.rHip]) kick(i, o.push, 0.5);
    kick(P.head, o.headPush || o.push, o.headPush ? 1 : 1.2);
    // partes do corpo
    const M = o.mats, g = (this.g = new THREE.Group()); this.scene.add(g);
    this.parts = [];
    const limb = (a, b, w, d, mat, extra) => { const m = box(w, 1, d, mat); g.add(m); this.parts.push({ m, a, b, extra }); };
    this.head = box(0.26, 0.28, 0.26, M.head); g.add(this.head);
    if (M.hair) { const hr = box(0.28, 0.08, 0.28, M.hair); hr.position.y = 0.16; this.head.add(hr); }
    this.torso = box(0.46, 0.56, 0.26, M.torso); g.add(this.torso);
    limb(P.lSh, P.lEl, 0.13, 0.14, M.upperArm); limb(P.rSh, P.rEl, 0.13, 0.14, M.upperArm);
    limb(P.lEl, P.lHa, 0.11, 0.12, M.forearm); limb(P.rEl, P.rHa, 0.11, 0.12, M.forearm);
    limb(P.lHip, P.lKn, 0.18, 0.2, M.thigh); limb(P.rHip, P.rKn, 0.18, 0.2, M.thigh);
    limb(P.lKn, P.lFt, 0.15, 0.16, M.shin); limb(P.rKn, P.rFt, 0.15, 0.16, M.shin);
    for (const f of [P.lFt, P.rFt]) { const m = box(0.16, 0.1, 0.27, M.boot); g.add(m); this.parts.push({ m, foot: f }); }
    this.acc = 0; this.draw();
  }
  step(dt) {
    this.t += dt; this.acc += Math.min(dt, 0.1);
    const h = 1 / 120;
    while (this.acc >= h) { this.acc -= h; this.sub(h); }
    // no fim, afunda devagar no chão (no Tiro) ou some na hora (na Pelada: o jogador levanta)
    if (this.o.sink && this.t > this.life - 1.2) this.g.position.y = -((this.t - (this.life - 1.2)) / 1.2) * 0.5;
    this.draw();
    return this.t < this.life;
  }
  sub(h) {
    const { p, q } = this, floor = this.o.floor || (() => 0), solid = this.o.solid;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = q[i];
      const vx = (a.x - b.x) * 0.995, vy = (a.y - b.y) * 0.995, vz = (a.z - b.z) * 0.995;
      b.copy(a); a.x += vx; a.y += vy - 9.8 * h * h; a.z += vz;
    }
    for (let it = 0; it < 8; it++) {
      STICKS.forEach(([i, j], k) => {
        const a = p[i], b = p[j]; _a.subVectors(b, a); const d = _a.length() || 1e-6, diff = (d - this.len[k]) / d * 0.5;
        a.addScaledVector(_a, diff); b.addScaledVector(_a, -diff);
      });
      for (const [i, j, min] of MINS) {
        const a = p[i], b = p[j]; _a.subVectors(b, a); const d = _a.length() || 1e-6; if (d >= min) continue;
        const diff = (d - min) / d * 0.5; a.addScaledVector(_a, diff); b.addScaledVector(_a, -diff);
      }
      for (let i = 0; i < p.length; i++) {
        const a = p[i], r = i === P.head ? 0.13 : 0.06, f = floor(a.x, a.z) + r;
        if (a.y < f) { // chão: para de cair e arrasta (atrito)
          a.y = f; const b = q[i]; if (b.y < f) b.y = f + (b.y - f) * -0.2;
          b.x += (a.x - b.x) * 0.35; b.z += (a.z - b.z) * 0.35;
        }
        if (solid) solid(a, r);
      }
    }
  }
  draw() {
    const p = this.p;
    // tronco: centro dos ombros e quadris; "para cima" = do quadril para o pescoço; "direita" = ombro esquerdo para o direito
    const sh = _a.addVectors(p[P.lSh], p[P.rSh]).multiplyScalar(0.5), hip = _b.addVectors(p[P.lHip], p[P.rHip]).multiplyScalar(0.5);
    const up = new THREE.Vector3().subVectors(sh, hip).normalize(), right = new THREE.Vector3().subVectors(p[P.rSh], p[P.lSh]);
    right.addScaledVector(up, -right.dot(up)).normalize(); const back = new THREE.Vector3().crossVectors(right, up);
    _m.makeBasis(right, up, back); this.torso.quaternion.setFromRotationMatrix(_m);
    this.torso.position.addVectors(sh, hip).multiplyScalar(0.5);
    // cabeça olhando para a frente do tronco
    _a.subVectors(p[P.head], p[P.neck]).normalize(); const hr = new THREE.Vector3().copy(right).addScaledVector(_a, -right.dot(_a)).normalize();
    _m.makeBasis(hr, _a, new THREE.Vector3().crossVectors(hr, _a)); this.head.quaternion.setFromRotationMatrix(_m);
    this.head.position.copy(p[P.head]).addScaledVector(_a, 0.02);
    for (const it of this.parts) {
      if (it.foot != null) { const k = it.foot === P.lFt ? P.lKn : P.rKn; it.m.position.copy(p[it.foot]); _a.subVectors(p[it.foot], p[k]).normalize(); it.m.quaternion.setFromRotationMatrix(_m.makeBasis(right, _a, new THREE.Vector3().crossVectors(right, _a))); it.m.position.addScaledVector(back, -0.05); continue; }
      const a = p[it.a], b = p[it.b]; _a.subVectors(b, a); const len = _a.length();
      it.m.position.addVectors(a, b).multiplyScalar(0.5); it.m.scale.y = Math.max(0.05, len);
      it.m.quaternion.setFromUnitVectors(UP, _a.multiplyScalar(1 / (len || 1)));
    }
  }
  dispose() { this.scene.remove(this.g); this.g.traverse((o) => o.geometry && o.geometry.dispose()); }
}
