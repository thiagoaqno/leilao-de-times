// Asfalto e borracha dos circuitos de GP.
import * as THREE from "three";
import { canvasTex } from "./cena.js";

export function asfaltoGP() {
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
  const m = new THREE.MeshStandardMaterial({ map: textura, bumpMap: relevo, bumpScale: 0.055, roughness: 0.94, side: THREE.DoubleSide });
  m.userData.asfalto = true; // o clima (clima-visual.js) escurece e dá brilho a este material conforme a água na pista
  return m;
}

export function borrachaGP(tr, add) {
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
  m.receiveShadow = true; m.name = `${tr.id}-borracha`; add(m);
}

