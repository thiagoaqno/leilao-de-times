// Kit de pista — o que se mexe num GP: o helicóptero da TV seguindo a corrida, as gaivotas planando (onde tem água) e
// os fiscais que agitam a bandeira verde quando o carro chega; e o som de cada região (som.js). vida.js chama
// tr.animarPista a cada quadro. Com "menos movimento" no sistema, nada balança.
//
// cfg: { helicoptero: true, gaivotas: [{ x, z, raio }, ...] (centros em unidades do mundo), fiscais: true,
//        som: { regiões de som.js } }
import * as THREE from "three";
import { M } from "../cena.js";
import { somGP } from "./som.js";

const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// o helicóptero da TV: branco e azul, rotor girando
function montarHeli(add) {
  const heli = new THREE.Group(); add(heli);
  const casco = M(0xf4f4f4, { roughness: 0.4, metalness: 0.2 }), azul = M(0x1d4fa0, { roughness: 0.5 }), preto = M(0x1b1d22);
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), casco); corpo.scale.set(1.5, 1, 1); heli.add(corpo);
  const faixa = new THREE.Mesh(new THREE.SphereGeometry(9.1, 16, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.12), azul); faixa.scale.set(1.5, 1, 1); heli.add(faixa);
  const vidro = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8, 0, Math.PI, 0, Math.PI / 2), M(0x223344, { roughness: 0.1, metalness: 0.5 })); vidro.rotation.y = -Math.PI / 2; vidro.position.set(8, 1, 0); heli.add(vidro);
  const cauda = new THREE.Mesh(new THREE.BoxGeometry(26, 2.4, 2), casco); cauda.position.set(-22, 2, 0); heli.add(cauda);
  const deriva = new THREE.Mesh(new THREE.BoxGeometry(4, 7, 0.8), azul); deriva.position.set(-34, 5, 0); heli.add(deriva);
  for (const s of [-1, 1]) { const esqui = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.8), preto); esqui.position.set(0, -10, s * 6); heli.add(esqui); }
  const rotor = new THREE.Group(); rotor.position.y = 10; heli.add(rotor);
  for (const a of [0, Math.PI / 2]) { const pa = new THREE.Mesh(new THREE.BoxGeometry(56, 0.4, 2.2), preto); pa.rotation.y = a; rotor.add(pa); }
  const rotorCauda = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 1.4), preto); rotorCauda.position.set(-34, 5, 1.4); heli.add(rotorCauda);
  return { heli, rotor, rotorCauda };
}

export function vidaGP(tr, add, cfg = {}) {
  const { pts, n } = tr, d = new THREE.Object3D();
  const H = cfg.helicoptero === false ? null : { ...montarHeli(add), pos: new THREE.Vector3(pts[0].x, pts[0].h + 260, pts[0].y), ang: 0 };
  // as gaivotas: brancas, asas compridas, quase sempre planando
  const gaivotas = [], asa = new THREE.BufferGeometry(); asa.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.8, 0, 0, 0.8, 0, 0, 0, 9, 1.5, 0, 0, 0, -0.8, 0, 0, 0.8], 3)); asa.computeVertexNormals();
  const branco = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, side: THREE.DoubleSide, roughness: 0.7 }), cinza = M(0x9aa0a6);
  (typeof cfg.gaivotas === "function" ? cfg.gaivotas(tr) : cfg.gaivotas || []).forEach((c, k) => {
    const g = new THREE.Group(), e = new THREE.Mesh(asa, branco), dd = new THREE.Mesh(asa, branco), bico = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1.2), cinza);
    dd.scale.x = -1; e.rotation.y = dd.rotation.y = Math.PI / 2; g.add(e, dd, bico); add(g);
    gaivotas.push({ g, e, dd, cx: c.x, cz: c.z, raio: c.raio ?? 80 + k * 13, alto: 60 + (k * 17) % 90, vel: (k % 2 ? 1 : -1) * (0.25 + (k % 4) * 0.06), fase: k * 1.7 });
  });
  // os fiscais com a bandeira (os postos de ambiente.js em tr.postosGP): a vara e o pano saem da mão (o pivô)
  const postos = cfg.fiscais === false ? [] : (tr.postosGP || []).map((o) => ({ ...o, a: 0 }));
  const vara = new THREE.BoxGeometry(0.4, 10, 0.4); vara.translate(0, 5, 0);
  const pano = new THREE.PlaneGeometry(7, 5, 4, 1); pano.translate(3.7, 8, 0);
  const varas = postos.length ? add(new THREE.InstancedMesh(vara, M(0x333333), postos.length)) : null;
  const panos = postos.length ? add(new THREE.InstancedMesh(pano, new THREE.MeshStandardMaterial({ color: 0x1fa64a, side: THREE.DoubleSide, roughness: 0.8 }), postos.length)) : null;
  const pose = (o, t) => { d.position.set(o.x + 5, o.h + 11, o.z); d.rotation.set(0, o.ry, (o.a * Math.sin(t * 9 + o.i)) * 0.9 - 0.15, "YXZ"); d.scale.setScalar(1); d.updateMatrix(); };
  postos.forEach((o, k) => { pose(o, 0); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); });
  const som = somGP(tr, cfg.som || {});
  tr.animarPista = (dt, foco, t) => {
    const parado = reduz.matches, idx = foco ? tr.indiceAt(foco.x, foco.y) : 0;
    if (H) { // 80 pontos à frente de quem a câmera segue, bem alto, chegando devagar e virando o nariz sem pressa
      const alvo = pts[(idx + 80) % n], quer = new THREE.Vector3(alvo.x - alvo.nx * 140, alvo.h + 240, alvo.y - alvo.ny * 140), antes = H.pos.clone();
      H.pos.lerp(quer, 1 - Math.exp(-dt * 0.6)); const vx = H.pos.x - antes.x, vz = H.pos.z - antes.z;
      if (vx * vx + vz * vz > 0.01) { let da = Math.atan2(-vz, vx) - H.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); H.ang += lim(da, -dt, dt); }
      H.heli.position.copy(H.pos); H.heli.position.y += Math.sin(t * 0.7) * 3; H.heli.rotation.set(0, H.ang, 0); H.heli.rotateZ(-0.12);
      if (!parado) { H.rotor.rotation.y += dt * 38; H.rotorCauda.rotation.z += dt * 50; }
    }
    for (const s of gaivotas) { // voltas largas, batendo as asas de vez em quando
      const a = s.fase + t * s.vel; s.g.position.set(s.cx + Math.cos(a) * s.raio, s.alto + Math.sin(t * 0.5 + s.fase) * 6, s.cz + Math.sin(a) * s.raio);
      s.g.rotation.set(0, -a + (s.vel > 0 ? 0 : Math.PI), (s.vel > 0 ? 1 : -1) * 0.25);
      const bate = parado ? 0.1 : Math.sin(t * 7 + s.fase) > 0.6 ? Math.sin(t * 14 + s.fase) * 0.6 : 0.12; s.e.rotation.x = bate; s.dd.rotation.x = bate;
    }
    if (postos.length && foco) { // fiscais: só os perto do carro mexem (e só eles são recalculados)
      let mudou = false;
      postos.forEach((o, k) => {
        const alvoA = !parado && (o.x - foco.x) ** 2 + (o.z - foco.y) ** 2 < 420 ** 2 ? 1 : 0;
        if (alvoA === 0 && o.a < 0.01) { if (o.a) { o.a = 0; pose(o, t); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); mudou = true; } return; }
        o.a += (alvoA - o.a) * (1 - Math.exp(-dt * 3)); pose(o, t); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); mudou = true;
      });
      if (mudou) varas.instanceMatrix.needsUpdate = panos.instanceMatrix.needsUpdate = true;
    }
    if (foco) som(dt, foco, idx, H && H.pos, t);
  };
}
