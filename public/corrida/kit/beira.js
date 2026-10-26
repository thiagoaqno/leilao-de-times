// Kit de pista — o que fica na beira: o guard-rail pintado em painéis com os patrocinadores e as fachadas dos prédios
// (sacadas, venezianas, toldos, cornija, telhado de telha ou terraço).
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { desenharMarca } from "./marcas.js";

// ---------- o guard-rail: painéis de 60 (6 m); a textura cobre 480 unidades (vLen 480 na fita de pista.js) ----------
// lado: de que lado da pista ele fica (o texto lê na direção de quem olha da pista). paineis: 8 nomes de marcas.js, e
// null é um painel de listras (cores: as duas cores das listras).
export function guardRail(lado, { paineis = ["rolex", "pirelli", null, "aramco", "heineken", null, "dhl", "lenovo"], cores = ["#d62828", "#f4f4f4"] } = {}) {
  const C = 1024, H = 48, plano = document.createElement("canvas"); plano.width = C; plano.height = H;
  const x = plano.getContext("2d"), painel = C / 8;
  const listras = (x0) => { for (let k = 0; k < 8; k++) { x.fillStyle = cores[k % 2]; x.fillRect(x0 + (k * painel) / 8, 0, painel / 8 + 1, H); } };
  paineis.slice(0, 8).forEach((m, k) => { if (m) desenharMarca(x, m, painel * k, 0, painel, H); else listras(painel * k); });
  // a lâmina ondulada do guard-rail: duas dobras escuras e as bordas de aço
  x.fillStyle = "#0000002a"; x.fillRect(0, 15, C, 3); x.fillRect(0, 31, C, 3); x.fillStyle = "#9aa3a8"; x.fillRect(0, 0, C, 3); x.fillRect(0, H - 4, C, 4);
  x.fillStyle = "#00000040"; for (let k = 0; k < C; k += painel / 2) x.fillRect(k, 0, 2, H); // as emendas
  // na textura da fita, u é a altura (0 embaixo) e v o comprimento (1 = para a frente): gira o desenho
  return canvasTex(H, C, (c) => { if (lado > 0) c.setTransform(0, 1, -1, 0, H, 0); else c.setTransform(0, -1, -1, 0, H, C); c.drawImage(plano, 0, 0); });
}

// ---------- as fachadas ----------
// cores: pares [parede, veneziana]; toldos: as cores dos toldos; telhas: a parte (0 a 1) dos prédios com telhado de telha
export const FACHADAS_MEDITERRANEO = { cores: [["#f1d9b5", "#3f6b4a"], ["#efc9a7", "#4f7392"], ["#f6e7c9", "#7a5236"], ["#e8b78f", "#2f5f4a"], ["#f4ece0", "#46617d"], ["#e9ac93", "#3f6b4a"], ["#f3dca0", "#5a7d9a"]], toldos: ["#2f6db3", "#2f8a4f", "#c8102e", "#e0a21b"], telhas: 0.45 };
function fachada([parede, veneziana], toldos, semente) {
  // 256 × 256 = 4 × 4 janelas, 120 × 120 unidades (cada andar com 3 m)
  return canvasTex(256, 256, (x, w, hh, rr) => {
    for (let k = 0; k < semente; k++) rr();
    x.fillStyle = parede; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#0000000a" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) {
      const x0 = c * 64, y0 = a * 64, aberta = rr() < 0.55;
      x.fillStyle = "#00000018"; x.fillRect(x0, y0 + 60, 64, 4); // a linha do andar
      x.fillStyle = aberta ? "#2c3540" : "#3b4b5a"; x.fillRect(x0 + 22, y0 + 14, 20, 34); x.fillStyle = "#ffffff30"; x.fillRect(x0 + 24, y0 + 16, 7, 30);
      x.fillStyle = veneziana; if (aberta) { x.fillRect(x0 + 12, y0 + 14, 9, 34); x.fillRect(x0 + 43, y0 + 14, 9, 34); } else x.fillRect(x0 + 22, y0 + 14, 20, 34);
      x.fillStyle = "#00000030"; for (let k = 0; k < 34; k += 4) { if (aberta) { x.fillRect(x0 + 12, y0 + 14 + k, 9, 1); x.fillRect(x0 + 43, y0 + 14 + k, 9, 1); } else x.fillRect(x0 + 22, y0 + 14 + k, 20, 1); }
      if (rr() < 0.6) { // a sacada com a grade
        x.fillStyle = "#ece7dc"; x.fillRect(x0 + 8, y0 + 48, 48, 5); x.fillStyle = "#2d2f33"; x.fillRect(x0 + 8, y0 + 38, 48, 2);
        for (let k = 10; k < 56; k += 4) x.fillRect(x0 + k, y0 + 38, 1, 10);
      }
      if (toldos.length && rr() < 0.22) { // toldo listrado em cima da janela
        const cor = toldos[(rr() * toldos.length) | 0];
        for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? "#f4f4f4" : cor; x.fillRect(x0 + 16 + k * 5.4, y0 + 5, 5.4, 10); }
        x.fillStyle = "#00000040"; x.fillRect(x0 + 16, y0 + 15, 32, 2);
      }
    }
  });
}
// o tamanho de cada janela no mundo, qualquer que seja o tamanho do prédio: a textura repete pelo tamanho da instância
function repetePelaEscala(mat) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#if defined( USE_INSTANCING ) && defined( USE_MAP )
  vec3 escala = vec3( length( instanceMatrix[ 0 ].xyz ), length( instanceMatrix[ 1 ].xyz ), length( instanceMatrix[ 2 ].xyz ) );
  vMapUv *= vec2( abs( normal.x ) > 0.5 ? escala.z : escala.x, escala.y ) / 120.0;
#endif`);
  };
  mat.customProgramCacheKey = () => "fachada-kit";
  return mat;
}
// blds: a lista de prédios de pista.js ({ x, y, h, sx, sy, sz, r }; o centro fica em h + 0,5)
export function fachadas(add, blds, { cores, toldos, telhas } = FACHADAS_MEDITERRANEO) {
  if (!blds.length) return;
  const caixa = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D();
  const grupos = cores.map(() => []), cornijas = [], telhados = [], casinhas = [];
  blds.forEach((o, k) => {
    grupos[(k * 7 + Math.floor(Math.abs(o.x))) % cores.length].push(o);
    const topo = o.h + 0.5 + o.sy / 2;
    cornijas.push({ x: o.x, y: topo + 1.5, z: o.y, sx: o.sx + 4, sy: 3, sz: o.sz + 4, r: o.r });
    if (((k * 13) % 9) / 9 < telhas) telhados.push({ x: o.x, y: topo + 3 + 11, z: o.y, sx: o.sx + 2, sy: 22, sz: o.sz + 2, r: o.r });
    else casinhas.push({ x: o.x + Math.cos(o.r) * o.sx * 0.2, y: topo + 8, z: o.y - Math.sin(o.r) * o.sx * 0.2, sx: Math.min(30, o.sx * 0.35), sy: 10, sz: Math.min(24, o.sz * 0.3), r: o.r }); // casa de máquinas no terraço
  });
  const inst = (geo, mat, lista) => {
    if (!lista.length) return;
    const m = add(new THREE.InstancedMesh(geo, mat, lista.length));
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = m.receiveShadow = true;
  };
  grupos.forEach((lista, k) => inst(caixa, repetePelaEscala(new THREE.MeshStandardMaterial({ map: fachada(cores[k], toldos, k * 37), roughness: 0.85 })), lista.map((o) => ({ x: o.x, y: o.h + 0.5, z: o.y, sx: o.sx, sy: o.sy, sz: o.sz, r: o.r }))));
  inst(caixa, M(0xf3eee2, { roughness: 0.8 }), cornijas);
  inst(caixa, M(0xd8d2c4, { roughness: 0.9 }), casinhas);
  const quatroAguas = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); quatroAguas.rotateY(Math.PI / 4);
  inst(quatroAguas, new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#b5583c"; x.fillRect(0, 0, w, hh); for (let yy = 0; yy < hh; yy += 6) { x.fillStyle = "#00000022"; x.fillRect(0, yy, w, 2); } for (let i = 0; i < 200; i++) { x.fillStyle = rr() < 0.5 ? "#c8694a" : "#9e4a30"; x.fillRect(rr() * w, rr() * hh, 4, 3); } }), roughness: 0.85, flatShading: true }), telhados);
}
