// Melbourne (Albert Park Circuit): o que só o circuito e o parque têm. O lago Albert Park no miolo da pista (desenhado a
// partir do traçado, com a ilha e o clube de remo na margem) e a cidade de Melbourne ao norte (a Eureka Tower com a coroa
// de ouro, a Australia 108, a Rialto, a 101 Collins e os prédios de vidro). O prédio dos boxes vem do kit
// (kit/boxes.js) e o pórtico de largada é o de pista.js. O resto (zebras, escape, arquibancadas, painéis, árvores) é do
// kit, na configuração de gps/melbourne.js.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { livre, sorteio } from "./kit/comum.js";
import { prediosDosBoxes } from "./kit/boxes.js";

// dentro da volta? (pontos da linha central como polígono)
function dentro(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d;
  }
  return d;
}

// o miolo da volta: o ponto de dentro mais longe da pista e o contorno do lago a partir dele (raios que param a uma folga
// da pista), alisado para não ter bico
function acharLago(tr) {
  const { pts, W } = tr, folga = W / 2 + 130;
  let melhor = null, bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
  for (const p of pts) { bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); bz0 = Math.min(bz0, p.y); bz1 = Math.max(bz1, p.y); }
  for (let x = bx0; x < bx1; x += 60) for (let z = bz0; z < bz1; z += 60) {
    if (!dentro(pts, x, z)) continue;
    const d = tr.distAt(x, z);
    if (!melhor || d > melhor.d) melhor = { x, z, d };
  }
  if (!melhor) return null;
  const N = 28, raios = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    let r = 0;
    while (r < 1100 && tr.distAt(melhor.x + ca * (r + 20), melhor.z + sa * (r + 20)) > folga) r += 20;
    raios.push(r);
  }
  const suave = raios.map((r, k) => (raios[(k + N - 1) % N] + 2 * r + raios[(k + 1) % N]) / 4);
  return { x: melhor.x, z: melhor.z, raios: suave, N };
}

// vidro com janelas (canvas), para as torres da cidade
const vidroJanelas = (cor, linhas, colunas = 8) => new THREE.MeshStandardMaterial({
  roughness: 0.25, metalness: 0.5, map: canvasTex(128, 256, (c, w, h, rr) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    for (let y = 0; y < linhas; y++) for (let x = 0; x < colunas; x++) {
      c.fillStyle = rr() < 0.15 ? "#e8d9a0" : "#ffffff22"; c.fillRect(x * (w / colunas) + 2, y * (h / linhas) + 2, w / colunas - 4, h / linhas - 5);
    }
  }),
});

// o cenário antes: o lago, a ilha, o clube de remo e a cidade ao norte
export function cenarioMelbourne(tr, { add, hAt, blds, aguaTex }) {
  // 1. O Lago Albert Park, no miolo da volta
  const lago = acharLago(tr);
  if (lago) {
    const { x: cx, z: cz, raios, N } = lago;
    // altura da água: um pouco acima do chão mais alto do contorno, para o lago nunca sumir por baixo do terreno
    let nivel = hAt(cx, cz);
    const borda = raios.map((r, k) => { const a = (k / N) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; nivel = Math.max(nivel, hAt(x, z)); return [x, z]; });
    nivel += 0.6;
    // a malha gira -90° em X: o y da forma vira -z do mundo
    const forma = new THREE.Shape();
    borda.forEach(([x, z], k) => (k ? forma.lineTo(x - cx, -(z - cz)) : forma.moveTo(x - cx, -(z - cz))));
    forma.closePath();
    // a ilha Gunn: um furo no lago, deslocado do centro
    const rMin = Math.min(...raios), ilhaX = rMin * 0.16, ilhaZ = -rMin * 0.1, rI = Math.max(40, Math.min(70, rMin * 0.14));
    const furo = new THREE.Path(); furo.absellipse(ilhaX, -ilhaZ, rI, rI * 0.8, 0, Math.PI * 2, true, 0); forma.holes.push(furo);
    const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#1e6b8a"), roughness: 0.12, metalness: 0.35, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    mat.map.repeat.set(6, 6); tr.agua.push(mat);
    const agua = add(new THREE.Mesh(new THREE.ShapeGeometry(forma, 24), mat));
    agua.rotation.x = -Math.PI / 2; agua.position.set(cx, nivel, cz);
    tr.lagoMelbourne = { x: cx, y: cz, raio: rMin };
    tr.reservado.push([cx, cz, rMin + 40]);

    // a ilha: um montículo de grama com árvores de parque
    const ix = cx + ilhaX, iz = cz + ilhaZ;
    const ilha = add(new THREE.Mesh(new THREE.CylinderGeometry(rI, rI + 12, 4, 24), M(0x2d682e, { roughness: 0.9 })));
    ilha.position.set(ix, nivel + 0.8, iz); ilha.scale.set(1, 1, 0.8);
    const r = sorteio(1996), folha = M(0x2a5e2b, { roughness: 0.95 }), tronco = M(0x5a3e26, { roughness: 0.95 });
    for (let k = 0; k < 8; k++) {
      const a = r() * Math.PI * 2, d = r() * rI * 0.7, x = ix + Math.cos(a) * d, z = iz + Math.sin(a) * d * 0.8;
      const alt = 28 + r() * 18, larg = alt * 0.45;
      const copa = add(new THREE.Mesh(new THREE.IcosahedronGeometry(larg, 0), folha)); copa.position.set(x, nivel + 2 + alt * 0.7, z);
      const t = add(new THREE.Mesh(new THREE.CylinderGeometry(larg * 0.12, larg * 0.16, alt * 0.5, 5), tronco)); t.position.set(x, nivel + 2 + alt * 0.25, z);
    }

    // 2. O clube de remo e vela: no ponto da margem mais perto da pista dos boxes, o deque na água e o galpão em terra
    let kb = 0; for (let k = 1; k < N; k++) if (raios[k] > raios[kb]) kb = k;
    const ang = (kb / N) * Math.PI * 2, ux = Math.cos(ang), uz = Math.sin(ang), rb = raios[kb];
    const px = cx + ux * (rb - 25), pz = cz + uz * (rb - 25);
    if (livre(tr, px + ux * 40, pz + uz * 40, 50)) {
      const g = new THREE.Group(); g.position.set(px, nivel, pz); g.rotation.y = Math.atan2(-uz, ux); add(g); // x local = para fora do lago
      const madeira = M(0x73553a, { roughness: 0.9 }), parede = M(0xf0eee6, { roughness: 0.85 }), telhado = M(0x1e5631, { roughness: 0.8 });
      const deque = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 26), madeira); deque.position.set(-14, 0.8, 0); g.add(deque);
      const pilar = new THREE.CylinderGeometry(0.8, 0.8, 8, 6);
      for (let dx = -40; dx <= 10; dx += 16) for (const dz of [-11, 11]) { const m = new THREE.Mesh(pilar, madeira); m.position.set(dx, -2, dz); g.add(m); }
      const galpao = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 30), parede); galpao.position.set(30, 10, 0); galpao.castShadow = true; g.add(galpao);
      const telha = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 38, 3), telhado); telha.rotation.set(0, 0, Math.PI / 2); telha.scale.set(0.65, 1, 1); telha.position.set(30, 24, 0); g.add(telha);
      // veleiros no deque
      const casco = M(0xfafafa, { roughness: 0.4 }), vela = M(0xf2efe9, { roughness: 0.3, side: THREE.DoubleSide }), mastro = M(0xd4d4d4);
      const velaGeo = new THREE.BufferGeometry(); velaGeo.setAttribute("position", new THREE.Float32BufferAttribute([-1, 1, 0, -1, 17, 0, 5, 3, 0], 3)); velaGeo.computeVertexNormals();
      for (const bx of [-30, -12]) {
        const b = new THREE.Group(); b.position.set(bx, 1.6, -19); b.rotation.y = 0.2; g.add(b);
        const c = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 5), casco); c.position.y = 0.8; b.add(c);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 18, 4), mastro); m.position.set(-1, 9, 0); b.add(m);
        b.add(new THREE.Mesh(velaGeo, vela));
      }
      tr.reservado.push([px + ux * 30, pz + uz * 30, 70]);
    }
  }

  // 3. A cidade de Melbourne ao norte do parque (norte = z menor). Tudo longe da pista e fora do miolo.
  const r = sorteio(3000), coresVidro = ["#1f4263", "#28587d", "#1c3247", "#4d6f8f", "#2e6284"];
  const torre = (x, z, folga, fazer) => { if (!livre(tr, x, z, folga)) return; const g = new THREE.Group(); g.position.set(x, hAt(x, z), z); add(g); fazer(g); tr.reservado.push([x, z, folga * 0.6]); };
  const nx = tr.t.world / 2; // o centro do mundo em x; a cidade fica ao norte dele
  // Eureka Tower: vidro azul escuro, a coroa de ouro e a faixa vermelha
  torre(nx + 650, -520, 200, (g) => {
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(56, 260, 56), vidroJanelas("#183452", 40)); corpo.position.y = 130; corpo.castShadow = true; g.add(corpo);
    const coroa = new THREE.Mesh(new THREE.BoxGeometry(58, 48, 58), M(0xfdc827, { roughness: 0.15, metalness: 0.85 })); coroa.position.y = 284; g.add(coroa);
    const antena = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.5, 60, 6), M(0xd9d9d9, { metalness: 0.8 })); antena.position.y = 338; g.add(antena);
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(3.5, 270, 3.5), M(0xc8102e, { roughness: 0.5 })); faixa.position.set(-28, 135, -28); g.add(faixa);
    const branca = new THREE.Mesh(new THREE.BoxGeometry(57, 4, 57), M(0xffffff, { roughness: 0.6 })); branca.position.y = 180; g.add(branca);
  });
  // Australia 108: torre redonda azul com o anel dourado da Star House
  torre(nx + 250, -650, 200, (g) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(24, 28, 320, 16), vidroJanelas("#1a4666", 44, 16)); t.position.y = 160; t.castShadow = true; g.add(t);
    const anel = new THREE.Mesh(new THREE.CylinderGeometry(38, 38, 26, 8), M(0xfdc827, { roughness: 0.2, metalness: 0.85 })); anel.position.y = 190; g.add(anel);
  });
  // Rialto Towers (vidro escuro espelhado) e 101 Collins (pedra clara com a agulha)
  torre(nx - 150, -560, 200, (g) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(50, 240, 50), M(0x151c24, { roughness: 0.12, metalness: 0.85 })); t.position.y = 120; t.castShadow = true; g.add(t);
  });
  torre(nx + 1000, -450, 200, (g) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(52, 210, 52), M(0xe2ded4, { roughness: 0.8 })); t.position.y = 105; g.add(t);
    const a = new THREE.Mesh(new THREE.ConeGeometry(8, 65, 8), M(0xd0cecb, { metalness: 0.6 })); a.position.y = 242; g.add(a);
  });
  // os outros arranha-céus da City e de Southbank (prédios de pista.js, com janelas)
  for (let k = 0; k < 70; k++) {
    const x = nx - 1700 + r() * 3900, z = -1300 + r() * 1000;
    if (!livre(tr, x, z, 300)) continue;
    const andares = 12 + Math.floor(r() * 26);
    blds.push({ x, y: z, h: hAt(x, z), s: 1, sx: 55 + r() * 55, sy: andares * 22, sz: 55 + r() * 55, dy: 0.5, r: r() * 3, c: coresVidro[(r() * coresVidro.length) | 0] });
  }
}

// o cenário depois: o prédio dos boxes na reta principal (o pórtico de largada é o de pista.js)
export function depoisMelbourne(tr, { add }) {
  // os pórticos azul-escuros "MELBOURNE / Australia" que atravessam a reta dos boxes (perpendiculares ao traçado)
  const { pts, n, W } = tr, azul = M(0x0e1f4a, { roughness: 0.6 }), L = W / 2 + 18;
  const letreiro = canvasTex(1024, 64, (c, w, h) => {
    c.fillStyle = "#0e1f4a"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.font = "bold 34px sans-serif"; c.textBaseline = "middle";
    c.textAlign = "left"; c.fillText("Australia  ▼", 30, h / 2); c.textAlign = "center"; c.fillText("MELBOURNE", w / 2, h / 2); c.textAlign = "right"; c.fillText("▼  Australia", w - 30, h / 2);
  });
  const placa = new THREE.MeshBasicMaterial({ map: letreiro });
  for (const f of [0.962, 0.028]) {
    const i = Math.floor(f * n) % n, p = pts[i];
    for (const k of [1, -1]) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), azul)); m.position.set(p.x + p.nx * k * L, p.h + 11, p.y + p.ny * k * L); m.castShadow = true; }
    const viga = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 3, 8, 2.5), [azul, azul, azul, azul, placa, placa]));
    viga.position.set(p.x, p.h + 23, p.y); viga.rotation.y = -Math.atan2(p.ny, p.nx);
  }
  // lado 1 é o do corredor dos boxes (as arquibancadas da reta ficam no outro)
  prediosDosBoxes(tr, add, {
    de: 0.982, ate: 1.058, lado: 1, recuo: 60, fundo: 44, alto: 34, torre: true,
    paineis: ["ausgp", "rolex", "heineken", "pirelli", "f1", "dhl", "aramco"],
    cores: { parede: "#f2f0ea", friso: "#007a3d", teto: 0xb5b8bc },
  });
}
