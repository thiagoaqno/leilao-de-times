// Jeddah — a Fonte do Rei Fahd: o jato d'água mais alto do mundo (uns 300 m), que sai do mar em frente à corniche e se vê de
// qualquer ponto da cidade; à noite, iluminada por centenas de lâmpadas. Aqui: a plataforma redonda com as bocas e as luzes,
// o jato (uma coluna fina e clara dentro de um cone de névoa, com listras que sobem) e o chafariz de borrifos em volta.
// A água sobe de verdade: `animar(t)` faz o jato pulsar, balançar e as listras correrem (muda escala e posição, então o
// kit/fundir.js não junta nada daqui). Transparente, sem sombra e sem luz própria.
//
//   fonteReiFahd({ altura: 820 }) → { grupo, animar(t, reduz) }   (origem na água)
import * as THREE from "three";

// textura de listras verticais (a água em fios): alfa em cima de branco
function texFios(semente = 3) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d");
  x.clearRect(0, 0, 64, 128);
  let s = semente; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 26; k++) { const px = r() * 64, larg = 1 + r() * 3, a = 0.35 + r() * 0.65; x.fillStyle = `rgba(255,255,255,${a})`; x.fillRect(px, 0, larg, 128); }
  for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(255,255,255,${r() * 0.5})`; x.fillRect(r() * 64, r() * 128, 2 + r() * 3, 5 + r() * 18); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function fonteReiFahd({ altura = 820, raio = 30 } = {}) {
  const g = new THREE.Group(); g.name = "fonte-rei-fahd";
  const concreto = new THREE.MeshStandardMaterial({ color: 0xcfc7b4, roughness: 0.9 }), escuro = new THREE.MeshStandardMaterial({ color: 0x59606a, roughness: 0.7, metalness: 0.3 });
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  // a plataforma redonda no mar, com o anel de luzes e as bocas do chafariz
  const base = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio + 5, 6, 24), concreto); base.position.y = 1; base.castShadow = base.receiveShadow = true; g.add(base);
  const anel = new THREE.Mesh(new THREE.TorusGeometry(raio - 3, 0.9, 5, 36), luz); anel.rotation.x = Math.PI / 2; anel.position.y = 4.4; g.add(anel);
  const bocal = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 5, 14), escuro); bocal.position.y = 6; g.add(bocal);
  // o jato: coluna clara e cone de névoa (as duas com fios que sobem), mais a nuvem de gotas no alto
  const fios = texFios(3), fios2 = texFios(11);
  const matColuna = new THREE.MeshBasicMaterial({ map: fios, color: 0xf2fbff, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const matNevoa = new THREE.MeshBasicMaterial({ map: fios2, color: 0xeef8ff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const jato = new THREE.Group(); jato.position.y = 8; g.add(jato);
  const colunaGeo = new THREE.CylinderGeometry(4.2, 10, altura, 10, 1, true); colunaGeo.translate(0, altura / 2, 0);
  const coluna = new THREE.Mesh(colunaGeo, matColuna); jato.add(coluna);
  const nevoaGeo = new THREE.CylinderGeometry(36, 72, altura * 0.8, 14, 1, true); nevoaGeo.translate(0, altura * 0.39, 0);
  const nevoa = new THREE.Mesh(nevoaGeo, matNevoa); jato.add(nevoa);
  const topoGeo = new THREE.SphereGeometry(70, 12, 8); topoGeo.scale(1, 1.7, 1);
  const topo = new THREE.Mesh(topoGeo, new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.22, depthWrite: false })); topo.position.y = altura * 0.95; jato.add(topo);
  // as bocas laterais: 14 jatos baixos em anel, que caem em arco
  const baixos = new THREE.Group(); jato.add(baixos);
  const baixoGeo = new THREE.ConeGeometry(7, 70, 7, 1, true); baixoGeo.translate(0, 35, 0);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2, m = new THREE.Mesh(baixoGeo, new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(Math.cos(a) * (raio - 6), -3, Math.sin(a) * (raio - 6)); m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); baixos.add(m);
  }
  const animar = (t, reduz = false) => {
    const pulso = reduz ? 0 : Math.sin(t * 0.55) * 0.04 + Math.sin(t * 1.7) * 0.015;
    jato.scale.set(1 + pulso * 1.5, 1 + pulso, 1 + pulso * 1.5);
    jato.position.x = reduz ? 0 : Math.sin(t * 0.21) * 4; jato.rotation.z = reduz ? 0 : Math.sin(t * 0.33) * 0.004;
    if (!reduz) { fios.offset.y = (t * 0.9) % 1; fios2.offset.y = (t * 0.55) % 1; }
    topo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.06); baixos.scale.y = 1 + Math.sin(t * 2.3) * 0.08;
  };
  g.userData = { altura, raio };
  return { grupo: g, animar };
}
