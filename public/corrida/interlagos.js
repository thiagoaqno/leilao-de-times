// Protótipo do ambiente de GP. Peças repetidas em lotes; nada altera a física.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";

export function asfaltoInterlagos() {
  // Agregado fino em escala de centímetros, separado das faixas e do desgaste da volta.
  const textura = canvasTex(1024, 1024, (x, w, h, r) => {
    const imagem = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      const desgaste = Math.sin(i / w * Math.PI * 8) * Math.cos(j / h * Math.PI * 6) * 2;
      const tom = 64 + desgaste + (r() - 0.5) * 22;
      imagem.data[k] = tom; imagem.data[k + 1] = tom + 1; imagem.data[k + 2] = tom + 2; imagem.data[k + 3] = 255;
    }
    x.putImageData(imagem, 0, 0);
  });
  const relevo = textura.clone(); relevo.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({ map: textura, bumpMap: relevo, bumpScale: 0.055, roughness: 0.94, side: THREE.DoubleSide });
}

export function borrachaInterlagos(tr, add) {
  const { pts, n, W } = tr;
  // Borracha depositada no traçado: faixas irregulares, suaves nas bordas, mais escuras nas curvas.
  const textura = canvasTex(256, 512, (x, w, h, r) => {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const u = r(), borda = Math.pow(Math.sin(u * Math.PI), 2);
      x.fillStyle = `rgba(12,14,16,${borda * (0.02 + r() * 0.12)})`;
      x.fillRect(u * w, r() * h, 1 + r() * 2, 8 + r() * 80);
    }
  });
  const vertices = [], uvs = [], cores = [], indices = [], centros = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 8) % n], curva = Math.min(1, (p.k || 0) * 220);
    centros.push(Math.sign(p.tx * q.ty - p.ty * q.tx) * curva * W * 0.22);
  }
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n]; let centro = 0;
    for (let j = -18; j <= 18; j++) centro += centros[(i + j + n) % n] / 37;
    for (const [lado, u] of [[-1, 0], [1, 1]]) {
      const lat = centro + lado * W * 0.16;
      vertices.push(p.x + p.nx * lat, p.h + 0.47, p.y + p.ny * lat); uvs.push(u, i * 6 / 180);
      const tom = 1 - Math.min(0.4, (p.k || 0) * 70); cores.push(tom, tom, tom);
    }
    if (i < n) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: textura, vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false, roughness: 0.82, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.receiveShadow = true; m.name = "interlagos-borracha"; add(m);
}

export function ambienteInterlagos(tr, add) {
  const { pts, n, W } = tr;
  const lotes = new Map(), caixa = new THREE.BoxGeometry(1, 1, 1);
  const metal = M(0x687781), concreto = M(0xdde1db), verde = M(0x08744b), amarelo = M(0xffcf32);
  const quadro = (texto, fundo = "#073e32", cor = "#ffffff") => new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.fillStyle = cor; x.fillRect(0, h - 9, w, 9);
    x.font = "900 70px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, h / 2, w - 30);
  }, false) });
  const anuncios = [quadro("INTERLAGOS"), quadro("SÃO PAULO", "#ffcf32", "#133d30"), quadro("GP DA GALERA", "#12232e")];
  const distancias = [150, 100, 50].map(v => quadro(String(v), "#ffffff", "#101a20"));
  function peca(mat, x, y, z, sx, sy, sz, ry = 0) {
    if (!lotes.has(mat)) lotes.set(mat, []);
    lotes.get(mat).push({ x, y, z, sx, sy, sz, ry });
  }
  // Confere a malha inteira: um enfeite no miolo não pode invadir o trecho vizinho.
  function lugar(i, lado, afastamento, raio = 0) {
    const p = pts[(i + n) % n], l = lado * (W / 2 + afastamento), x = p.x + p.nx * l, z = p.y + p.ny * l;
    if (pts.some(q => (q.x - x) ** 2 + (q.y - z) ** 2 < (W / 2 + raio + 12) ** 2)) return null;
    return { x, z, h: tr.chao(x, z), p };
  }
  tr.ambienteGP = { paineis: 0, postos: 0, placas: 0 };
  // Painéis, guardas e cercas por TODA a volta, nos dois lados, seguindo o relevo.
  for (let i = 0; i < n; i += 18) for (const lado of [-1, 1]) {
    const o = lugar(i, lado, 54, 25); if (!o) continue;
    const { x, z, h, p } = o, ry = Math.atan2(p.tx, p.ty);
    peca(i % 36 ? verde : concreto, x, h + 5, z, 3, 10, 54, ry);
    peca(metal, x, h + 18, z, 1, 26, 1);
    for (const y of [12, 19, 26]) peca(metal, x, h + y, z, 0.5, 0.5, 54, ry);
    if (i % 54 === 0) {
      peca(anuncios[(i / 54) % 3], x - p.nx * lado * 2, h + 9, z - p.ny * lado * 2, 50, 12, 0.8, Math.atan2(-p.nx * lado, -p.ny * lado));
      tr.ambienteGP.paineis++;
    }
  }
  // Postos de fiscais com cobertura amarela e painéis de identificação em todos os setores.
  for (let k = 0; k < 16; k++) {
    const i = Math.floor(n * (k + 0.4) / 16), o = lugar(i, k % 2 ? -1 : 1, 95, 25); if (!o) continue;
    const { x, z, h } = o;
    peca(concreto, x, h + 2, z, 36, 4, 28);
    for (const dx of [-15, 15]) for (const dz of [-11, 11]) peca(metal, x + dx, h + 15, z + dz, 1.5, 26, 1.5);
    peca(amarelo, x, h + 29, z, 39, 3, 31);
    peca(verde, x, h + 8, z + 12, 32, 12, 2);
    peca(anuncios[2], x, h + 23, z + 12, 30, 7, 1);
    tr.ambienteGP.postos++;
  }
  // Placas antes das curvas: 150, 100 e 50 metros (10 unidades do jogo por metro).
  let ultima = -n;
  for (let i = 0; i < n; i += 3) {
    if (pts[i].k < 1 / 450 || i - ultima < n / 9) continue;
    ultima = i;
    [150, 100, 50].forEach((metros, j) => {
      const o = lugar((i - Math.round(metros * 10 / 6) + n) % n, -1, 42, 8); if (!o) return;
      const { x, z, h, p } = o;
      peca(metal, x, h + 8, z, 1.2, 16, 1.2);
      peca(distancias[j], x, h + 20, z, 20, 12, 1, Math.atan2(-p.tx, -p.ty));
      tr.ambienteGP.placas++;
    });
  }
  for (const [mat, lista] of lotes) {
    const m = new THREE.InstancedMesh(caixa, mat, lista.length), d = new THREE.Object3D();
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.y = o.ry; d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.name = "interlagos-ambiente-gp"; m.receiveShadow = true; add(m);
  }
}
