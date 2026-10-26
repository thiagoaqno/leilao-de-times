// Corrida da Galera — Mônaco vivo. O que se mexe: o helicóptero da TV seguindo a corrida, as gaivotas planando sobre o
// porto e os fiscais que agitam a bandeira verde quando o carro chega. E o som de cada região, que muda conforme o carro
// passa: o porto (ondas, gaivotas e a buzina dos iates), a torcida nas arquibancadas, a cidade (o ronco da rua e as
// lambretas), a fonte da Place du Casino, o túnel (o zumbido dos exaustores e o eco do motor), os sinos da Sainte Dévote
// e o helicóptero lá em cima. Tudo sintetizado (sem arquivo de áudio) e no barramento de Sound.ambiente.
import * as THREE from "three";
import { M } from "./cena.js";
import { Sound } from "./sons.js";
import { fundoMonaco } from "./monaco.js";

const reduz = matchMedia("(prefers-reduced-motion: reduce)");
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function vidaMonaco(tr, add) {
  const { pts, n } = tr, K = tr.t.scale, d = new THREE.Object3D();
  // ---- o helicóptero da TV: branco e azul, rotor girando, voa à frente de quem a câmera segue ----
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
  const H = { pos: new THREE.Vector3(pts[0].x, pts[0].h + 260, pts[0].y), ang: 0 };
  // ---- as gaivotas sobre o porto (brancas, asas compridas, quase sempre planando) ----
  const gaivotas = [], asa = new THREE.BufferGeometry(); asa.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.8, 0, 0, 0.8, 0, 0, 0, 9, 1.5, 0, 0, 0, -0.8, 0, 0, 0.8], 3)); asa.computeVertexNormals();
  const branco = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, side: THREE.DoubleSide, roughness: 0.7 }), cinza = M(0x9aa0a6);
  for (let k = 0; k < 14; k++) {
    const g = new THREE.Group(), e = new THREE.Mesh(asa, branco), dd = new THREE.Mesh(asa, branco), bico = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1.2), cinza);
    dd.scale.x = -1; e.rotation.y = dd.rotation.y = Math.PI / 2; g.add(e, dd, bico); add(g);
    gaivotas.push({ g, e, dd, cx: (480 + (k % 5) * 110) * K, cz: (930 + (k % 3) * 70) * K, raio: 80 + k * 13, alto: 60 + (k * 17) % 90, vel: (k % 2 ? 1 : -1) * (0.25 + (k % 4) * 0.06), fase: k * 1.7 });
  }
  // ---- os fiscais com a bandeira: a vara e o pano saem da mão (o pivô) e o braço balança quando o carro chega ----
  const postos = (tr.postosMonaco || []).map((o) => ({ ...o, a: 0 }));
  const vara = new THREE.BoxGeometry(0.4, 10, 0.4); vara.translate(0, 5, 0);
  const pano = new THREE.PlaneGeometry(7, 5, 4, 1); pano.translate(3.7, 8, 0);
  const varas = postos.length && add(new THREE.InstancedMesh(vara, M(0x333333), postos.length));
  const panos = postos.length && add(new THREE.InstancedMesh(pano, new THREE.MeshStandardMaterial({ color: 0x1fa64a, side: THREE.DoubleSide, roughness: 0.8 }), postos.length));
  const pose = (o, t) => { d.position.set(o.x + 5, o.h + 11, o.z); d.rotation.set(0, o.ry, (o.a * Math.sin(t * 9 + o.i)) * 0.9 - 0.15, "YXZ"); d.scale.setScalar(1); d.updateMatrix(); };
  postos.forEach((o, k) => { pose(o, 0); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); });
  // ---- o som ----
  const som = somDeMonaco(tr);
  tr.animarPista = (dt, foco, t) => {
    const parado = reduz.matches, idx = foco ? tr.indiceAt(foco.x, foco.y) : 0;
    // helicóptero: 80 pontos à frente de quem a câmera segue, bem alto, chegando devagar
    const alvo = pts[(idx + 80) % n], quer = new THREE.Vector3(alvo.x - alvo.nx * 140, alvo.h + 240, alvo.y - alvo.ny * 140), antes = H.pos.clone();
    H.pos.lerp(quer, 1 - Math.exp(-dt * 0.6)); const vx = H.pos.x - antes.x, vz = H.pos.z - antes.z;
    if (vx * vx + vz * vz > 0.01) { let da = Math.atan2(-vz, vx) - H.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); H.ang += lim(da, -dt, dt); } // vira o nariz para onde vai, sem pressa
    heli.position.copy(H.pos); heli.position.y += Math.sin(t * 0.7) * 3; heli.rotation.set(0, H.ang, 0); heli.rotateZ(-0.12);
    if (!parado) { rotor.rotation.y += dt * 38; rotorCauda.rotation.z += dt * 50; }
    // gaivotas: voltas largas, batendo as asas de vez em quando
    for (const s of gaivotas) {
      const a = s.fase + t * s.vel; s.g.position.set(s.cx + Math.cos(a) * s.raio, s.alto + Math.sin(t * 0.5 + s.fase) * 6, s.cz + Math.sin(a) * s.raio);
      s.g.rotation.set(0, -a + (s.vel > 0 ? 0 : Math.PI), (s.vel > 0 ? 1 : -1) * 0.25);
      const bate = parado ? 0.1 : Math.sin(t * 7 + s.fase) > 0.6 ? Math.sin(t * 14 + s.fase) * 0.6 : 0.12; s.e.rotation.x = bate; s.dd.rotation.x = bate;
    }
    // fiscais: só os perto do carro mexem (e só eles são recalculados)
    if (postos.length && foco) {
      let mudou = false;
      postos.forEach((o, k) => {
        const perto = (o.x - foco.x) ** 2 + (o.z - foco.y) ** 2 < 420 ** 2, alvoA = perto && !parado ? 1 : 0;
        if (alvoA === 0 && o.a < 0.01) { if (o.a) { o.a = 0; pose(o, t); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); mudou = true; } return; }
        o.a += (alvoA - o.a) * (1 - Math.exp(-dt * 3)); pose(o, t); varas.setMatrixAt(k, d.matrix); panos.setMatrixAt(k, d.matrix); mudou = true;
      });
      if (mudou) varas.instanceMatrix.needsUpdate = panos.instanceMatrix.needsUpdate = true;
    }
    if (foco) som(dt, foco, idx, H.pos, t);
  };
}

// ---------- o som de cada região ----------
function somDeMonaco(tr) {
  let S = null, prox = { gaivota: 2, buzina: 18, lambreta: 5, sinos: 6 };
  const peso = { porto: 0, torcida: 0, cidade: 0, fonte: 0, tunel: 0, heli: 0, sinos: 0 };
  tr.somMonaco = peso; // o peso de cada região agora (para conferir no #debug)
  function montar() {
    const bus = Sound.ambiente(); if (!bus) return null;
    const c = bus.context, len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    const ruido = (tipo, f, q = 0.7) => { const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = Math.random(); const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(bus); s.start(0, Math.random() * 2); return g; };
    const o = { c, bus };
    o.ondas = ruido("lowpass", 420); o.espuma = ruido("bandpass", 1600, 0.4);
    o.torcida = ruido("bandpass", 850, 0.5); o.grito = ruido("bandpass", 2300, 1.2);
    o.cidade = ruido("lowpass", 170); o.fonte = ruido("highpass", 2200);
    o.tunel = ruido("lowpass", 110);
    // o helicóptero: ruído grave pulsando no ritmo das pás (um LFO no ganho)
    o.heli = c.createGain(); o.heli.gain.value = 0; o.heli.connect(bus);
    const hs = c.createBufferSource(); hs.buffer = b; hs.loop = true; const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 340; const pulso = c.createGain(); pulso.gain.value = 0.5;
    const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 17; lfoG.gain.value = 0.5; lfo.connect(lfoG).connect(pulso.gain); hs.connect(hf).connect(pulso).connect(o.heli); hs.start(); lfo.start();
    return o;
  }
  // um som curto: tons com o envelope (as gaivotas, a buzina, a lambreta e os sinos)
  function tom(f0, f1, dur, vol, tipo = "triangle", filtro = 0, em = 0) {
    const { c, bus } = S, t = c.currentTime + em, o = c.createOscillator(), g = c.createGain(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let saida = o; if (filtro) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtro; o.connect(f); saida = f; }
    saida.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  const suave = (k, alvo, dt, vel = 1.5) => (peso[k] += (alvo - peso[k]) * (1 - Math.exp(-dt * vel)));
  const ganho = (g, v) => g.gain.setTargetAtTime(v, S.c.currentTime, 0.15);
  return (dt, foco, idx, heliPos, t) => {
    if (!S) { S = montar(); if (!S) return; peso.ligado = true; }
    const { n } = tr, tunel = tr.coberto && tr.coberto(idx) ? 1 : 0;
    const porto = lim(1 - Math.max(0, -fundoMonaco(tr, foco.x, foco.y)) / 450);
    let torcida = 0; for (const [a, b] of tr.arquibancadas || []) { const i = idx < a - n / 2 ? idx + n : idx, fora = Math.max(a - i, i - b, 0); torcida = Math.max(torcida, lim(1 - fora / 70)); }
    const pc = tr.pracaCassino, fonte = pc ? lim(1 - Math.hypot(pc.x - foco.x, pc.y - foco.y) / 420) : 0;
    const cp = tr.capelaMonaco, sinos = cp ? lim(1 - Math.hypot(cp.x - foco.x, cp.y - foco.y) / 900) : 0;
    const hd = Math.hypot(heliPos.x - foco.x, heliPos.y - (foco.z || 0), heliPos.z - foco.y);
    suave("tunel", tunel, dt, 3); suave("porto", porto, dt); suave("torcida", torcida, dt, 2); suave("fonte", fonte, dt); suave("sinos", sinos, dt);
    suave("cidade", lim(1 - porto * 0.7), dt); suave("heli", lim(1 - hd / 900), dt);
    const fora = 1 - peso.tunel * 0.9, onda = 0.6 + 0.4 * Math.sin(t * 0.8) * Math.sin(t * 0.31 + 1);
    ganho(S.ondas, 0.05 * peso.porto * onda * fora); ganho(S.espuma, 0.012 * peso.porto * onda * onda * fora);
    ganho(S.torcida, 0.035 * peso.torcida * fora * (0.8 + 0.2 * Math.sin(t * 1.3))); ganho(S.grito, 0.012 * peso.torcida * fora * Math.max(0, Math.sin(t * 0.9 + Math.sin(t * 2.1))));
    ganho(S.cidade, 0.03 * peso.cidade * fora); ganho(S.fonte, 0.018 * peso.fonte * fora); ganho(S.tunel, 0.06 * peso.tunel);
    ganho(S.heli, 0.05 * peso.heli * fora);
    Sound.eco(0.55 * peso.tunel);
    // os sons de vez em quando
    for (const k in prox) prox[k] -= dt;
    if (prox.gaivota <= 0) { prox.gaivota = 2 + Math.random() * 5; if (peso.porto > 0.3) { const f = 1700 + Math.random() * 600, v = 0.02 * peso.porto * fora; for (let k = 0; k < 2 + (Math.random() * 3 | 0); k++) tom(f, f * 0.72, 0.28, v, "triangle", 0, k * 0.32); } }
    if (prox.buzina <= 0) { prox.buzina = 25 + Math.random() * 30; if (peso.porto > 0.5) { tom(98, 96, 1.8, 0.03 * peso.porto * fora, "sawtooth", 600); tom(123, 121, 1.8, 0.02 * peso.porto * fora, "sawtooth", 600); } }
    if (prox.lambreta <= 0) { prox.lambreta = 6 + Math.random() * 9; if (peso.cidade > 0.5 && peso.tunel < 0.2) tom(70 + Math.random() * 20, 150, 2.4, 0.012 * peso.cidade, "sawtooth", 900); }
    if (prox.sinos <= 0) { prox.sinos = 30 + Math.random() * 20; if (peso.sinos > 0.2) for (let k = 0; k < 4; k++) { const f = k % 2 ? 587 : 659; tom(f, f * 0.995, 2.6, 0.03 * peso.sinos * fora, "sine", 0, k * 0.9); tom(f * 2.4, f * 2.39, 1.2, 0.008 * peso.sinos * fora, "sine", 0, k * 0.9); } }
  };
}
