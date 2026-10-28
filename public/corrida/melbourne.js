// Melbourne (Albert Park Circuit): o que só o circuito e o parque têm. O lago Albert Park no miolo da volta (desenhado a partir do
// traçado, com a ilha Gunn, o clube de remo, a calçada da margem e os veleiros), o skyline da cidade ao norte (kit/melbourne/cidade.js),
// a reta principal (arquibancada longa de aço, complexo dos boxes com as coberturas azul e vermelha e o paddock, kit 2 em
// kit/melbourne/complexo.js), os pórticos azuis "MELBOURNE / Australia", a faixa magenta da entrada dos boxes, o alambrado alto,
// a grama listrada e os bosques. O resto (zebras, escape, painéis, bandeiras) é do kit, na configuração de gps/melbourne.js.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { livre, sorteio, instancias } from "./kit/comum.js";
import { portico } from "./kit/torres.js";
import { tex } from "./kit/montagem.js";
import { alambrado } from "./kit/melbourne/cerca.js";
import { gramaListrada } from "./kit/melbourne/grama.js";
import { cidade } from "./kit/melbourne/cidade.js";
import { bosques } from "./kit/melbourne/arvores.js";
import { instalarOcupado, arquibancadaLonga, complexoDosBoxes, paddock } from "./kit/melbourne/complexo.js";

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
// o ponto (x, z) está no lago (mais `margem`)? Usa o raio do contorno na direção dele
const noLago = (l, x, z, margem = 0) => {
  if (!l) return false;
  const dx = x - l.x, dz = z - l.y, a = (Math.atan2(dz, dx) + Math.PI * 2) % (Math.PI * 2), k = (a / (Math.PI * 2)) * l.N, k0 = Math.floor(k) % l.N, f = k - Math.floor(k);
  return Math.hypot(dx, dz) < l.raios[k0] * (1 - f) + l.raios[(k0 + 1) % l.N] * f + margem;
};

// o cenário antes: o lago, a ilha, o clube de remo, a calçada, os veleiros e a cidade ao norte
export function cenarioMelbourne(tr, { add, hAt, aguaTex }) {
  tr.camisasGP = ["#ff8700", "#e8002d", "#ffffff", "#1b1b1b", "#ffd23f", "#2f6fd0", "#ff8700", "#f4f4f4"]; // a torcida laranja e vermelha das fotos
  const original = tr.distAt; tr.distAtOriginal = original;
  // as construções da reta (complexo.js) entram aqui: a torcida pulando e o bosque não ficam em cima delas; a torcida que pula
  // também não fica entre a pista e a mureta da reta principal (nas fotos ela está atrás do alambrado)
  instalarOcupado(tr, (x, z) => { if (original(x, z) > 95) return false; const f = tr.indiceAt(x, z) / tr.n; return f > 0.9 || f < 0.05; });
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
    tr.lagoMelbourne = { x: cx, y: cz, raio: rMin, raios, N, nivel };
    tr.reservado.push([cx, cz, rMin + 40]);

    // a calçada da margem: uma faixa de saibro claro em volta da água, com um barranco para baixo (o lago fica acima do chão)
    {
      const dentroR = 8, foraR = 20, vs = [], idx = [];
      for (let k = 0; k <= N; k++) {
        const a = ((k % N) / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r = raios[k % N];
        vs.push(cx + c * (r - dentroR), nivel + 0.5, cz + s * (r - dentroR), cx + c * (r + foraR), nivel + 0.5, cz + s * (r + foraR), cx + c * (r + foraR + 6), nivel - 7, cz + s * (r + foraR + 6));
        if (k < N) { const b = k * 3; idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setIndex(idx); g.computeVertexNormals();
      add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc9b98f, roughness: 1, side: THREE.DoubleSide }))).receiveShadow = true;
    }

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

    // os veleiros no lago (parados, em regata): casco, mastro e a vela, três InstancedMesh
    {
      const barcos = [], r2 = sorteio(808);
      for (let k = 0; k < 26; k++) {
        const a = r2() * Math.PI * 2, kk = (a / (Math.PI * 2)) * N, d = (0.15 + r2() * 0.6) * raios[Math.floor(kk) % N];
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (Math.hypot(x - ix, z - iz) < rI + 30) continue;
        barcos.push({ x, y: nivel + 0.9, z, r: r2() * 6.28, s: 0.8 + r2() * 0.6 });
      }
      const casco = new THREE.BoxGeometry(16, 2.6, 5); casco.translate(0, 0.8, 0);
      const mastro = new THREE.CylinderGeometry(0.25, 0.25, 22, 4); mastro.translate(0, 12, 0);
      const vela = new THREE.BufferGeometry(); vela.setAttribute("position", new THREE.Float32BufferAttribute([-1, 2, 0, -1, 22, 0, 8, 3, 0], 3)); vela.computeVertexNormals();
      const por = (geo, mat, f) => instancias(add, geo, mat, barcos.map((b) => f(b)), { sombra: false });
      por(casco, M(0xf4f4f0, { roughness: 0.4 }), (b) => ({ ...b, sx: b.s, sy: b.s, sz: b.s }));
      por(mastro, M(0xc8ccd0), (b) => ({ ...b, sx: b.s, sy: b.s, sz: b.s }));
      por(vela, M(0xf8f4ec, { roughness: 0.3, side: THREE.DoubleSide }), (b) => ({ ...b, sx: b.s, sy: b.s, sz: b.s }));
    }

    // o clube de remo e vela: no ponto da margem mais perto da pista dos boxes, o deque na água e o galpão em terra
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
      tr.reservado.push([px + ux * 30, pz + uz * 30, 70]);
    }
  }
  // o skyline da cidade ao norte: depois do parque e do lago, sem a neblina do jogo (ver cidade.js)
  const mundo = tr.t.world;
  cidade(tr, add, { x0: -300, x1: mundo + 500, z0: -150, fundo: 1050, livre: (x, z) => true });
  // as árvores soltas e pálidas que pista.js espalha longe da pista (o modelo de árvore dela) não combinam com o parque: depois que o
  // corredor dos boxes ficou pronto (tr.boxesInfo) a distância até a pista vale 0 para elas (e para o lago, a cidade e as construções
  // da reta antes disso); `depois` devolve a medida de verdade. Quem precisa dela de verdade (garagens, painéis) roda antes.
  tr.distAt = (x, z) => (tr.boxesInfo || z < 300 || noLago(tr.lagoMelbourne, x, z, 40) || tr.ocupado(x, z) ? 0 : original(x, z));
}

// a faixa magenta da entrada dos boxes (pintura sobre o asfalto do corredor: só aparece junto com ele, nas regras de F1)
function faixaMagenta(tr) {
  const F = window.F1Regras, cor = F && tr.boxesGP && F.corredor(tr.t, tr.n, tr.W); if (!cor) return;
  const { pts, n, W } = tr, lado = cor.lado, centro = (u) => cor.lat(u, lado * (W / 2 - 10)) + cor.centroAsfalto - cor.D;
  const em = (u, l) => { const i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = pts[i % n], b = pts[(i + 1) % n];
    const x = a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * l, z = a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * l; return [x, tr.chao(x, z) + 0.72, z]; };
  const map = canvasTex(128, 512, (x, w, h, rr) => {
    x.fillStyle = "#a21f86"; x.fillRect(0, 0, w, h); const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#00000022"); gr.addColorStop(0.5, "#ffffff10"); gr.addColorStop(1, "#00000022"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#00000014" : "#ffffff10"; x.fillRect(rr() * w, rr() * h, 2, 2); }
    x.fillStyle = "#f4f2f6"; x.fillRect(4, 0, 5, h); x.fillRect(w - 9, 0, 5, h);
    x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillStyle = "#f4f2f6"; x.font = "italic 900 34px 'Arial Black', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("AUSTRALIAN", -h / 4, -18, 220); x.fillText("GRAND PRIX", -h / 4, 20, 220); x.fillText("AUSTRALIAN", h / 4, -18, 220); x.fillText("GRAND PRIX", h / 4, 20, 220); x.restore();
  }, false);
  map.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
  const vs = [], uv = [], idx = [], u0 = 1.5, u1 = Math.max(u0 + 4, cor.garagens[cor.garagens.length - 1] + 6), passos = Math.ceil((u1 - u0) * 1);
  for (let k = 0; k <= passos; k++) {
    const u = u0 + ((u1 - u0) * k) / passos, c = centro(u), a = em(u, c - lado * 24), b = em(u, c - lado * 3), v = (u * 6) / 128;
    vs.push(...a, ...b); uv.push(0, v, 1, v); if (k < passos) { const q = k * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = "melbourne-faixa-magenta"; tr.boxesGP.add(m);
}

// o cenário depois: os pórticos azuis, a reta principal, o alambrado, a grama listrada, o skyline e os bosques
export function depoisMelbourne(tr, { add }) {
  tr.distAt = tr.distAtOriginal; // volta a medir de verdade
  const { pts, n, W } = tr, lago = tr.lagoMelbourne, F = window.F1Regras, cor = F && tr.t.boxes ? F.corredor(tr.t, n, W) : null;
  // os pórticos azul-escuros "MELBOURNE / Australia" que atravessam a reta dos boxes (de lado a lado, no alto, como na foto da reta)
  const letreiro = tex(1024, 96, (c, w, h) => {
    c.fillStyle = "#0e1f4a"; c.fillRect(0, 0, w, h); c.fillStyle = "#a21f86"; c.fillRect(0, h - 8, w, 8); c.fillStyle = "#ffffff"; c.font = "bold 44px Arial, sans-serif"; c.textBaseline = "middle";
    c.textAlign = "left"; c.fillText("Australia  ▼", 50, h / 2 - 3); c.textAlign = "center"; c.font = "900 54px 'Arial Black', Arial, sans-serif"; c.fillText("MELBOURNE", w / 2, h / 2 - 3);
    c.textAlign = "right"; c.font = "bold 44px Arial, sans-serif"; c.fillText("▼  Australia", w - 50, h / 2 - 3);
  });
  for (const f of [0.935, 0.962, 0.03]) {
    const i = Math.floor(f * n) % n, p = pts[i], g = portico({ vao: 2 * (W / 2 + 17), alto: 80, viga: 15, cor: "#0e1f4a", corColuna: "#16264f", textura: letreiro, largura: 8 });
    g.position.set(p.x, p.h - 1.5, p.y); g.rotation.y = -Math.atan2(p.ny, p.nx); add(g);
  }
  // a reta principal: a arquibancada longa em frente aos boxes, o complexo dos boxes e o paddock atrás dele (o lado dos boxes é o do corredor)
  const lb = cor ? cor.lado : 1;
  arquibancadaLonga(tr, add, { de: 0.935, ate: 1.045, lado: -lb, lat: 99, comprimento: 240, degraus: 12, publico: 0.34 });
  complexoDosBoxes(tr, add, { centro: 0, lado: lb, lat: 150, pecas: 4, comprimento: 150 });
  paddock(tr, add, { centro: 0, lado: lb, lat: 215, fileiras: 4, tendas: 9 });
  // o alambrado alto e a mureta de publicidade (menos no corredor dos boxes), a grama listrada do parque
  const pular = cor ? (i, s) => { const rel = (((i - cor.i0) % n) + n) % n; return s === cor.lado && (rel <= cor.len + 10 || rel >= n - 10); } : null;
  alambrado(tr, add, { pular });
  gramaListrada(tr, add, { forca: 1.7, faixas: 7, evitar: (x, z) => noLago(lago, x, z, 30) });
  // as moitas de árvores do parque e a fileira na margem do lago
  const fixas = [];
  if (lago) { const r = sorteio(31); for (let a = 0; a < Math.PI * 2; a += 0.045) { const k = Math.floor((a / (Math.PI * 2)) * lago.N) % lago.N, d = lago.raios[k] + 34 + r() * 40; fixas.push([lago.x + Math.cos(a) * d, lago.y + Math.sin(a) * d]); } }
  bosques(tr, add, { moitas: 150, proibido: (x, z) => z < 300 || noLago(lago, x, z, 20), fixas });
  faixaMagenta(tr);
}
