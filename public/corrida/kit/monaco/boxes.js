// Mônaco — o pit lane, refeito só com peças de Mônaco (o corredor, a mureta e os quadrados pintados continuam do kit/corredor-boxes.js, que manda na posição e na lógica: box.js e pistas.js):
// o prédio permanente dos boxes de dois andares ao lado do Port Hercule, com as 10 garagens numeradas, na cor e com o nome de cada equipe, o friso colorido e as portas, o terraço de hospitalidade
// de cada garagem (vidro, guarda-corpo, toldo da equipe e a laje de cima), os mecânicos na frente, o pit wall com os toldos dos engenheiros e os monitores, a linha amarela do limitador e as placas de
// entrada e saída. Tudo dentro do grupo do corredor (tr.boxesGP), que some e aparece com ele; as partes na cor da equipe acompanham o `colorir` do jogo.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";

const EQUIPES = [["McLaren", "#ff8700"], ["Ferrari", "#e8002d"], ["Mercedes", "#27f4d2"], ["Red Bull", "#3671c6"], ["Racing Bulls", "#6692ff"], ["Aston Martin", "#229971"], ["Williams", "#37bedd"], ["Audi", "#d7172f"], ["Alpine", "#ff87bc"], ["Haas", "#c6cbd0"]];

export function boxesMonaco(tr, add) {
  const F = window.F1Regras, cor = F?.corredor(tr.t, tr.n, tr.W), grp = tr.boxesGP; if (!cor || !grp) return;
  const { pts, n, W } = tr, lado = cor.lado, meia = cor.larguraCorredor / 2, noGrupo = (o) => (grp.add(o), o);
  const latDe = (u) => cor.lat(u, lado * (W / 2 - 10)) + cor.centroAsfalto - cor.D;
  const em = (u, l) => { const i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = pts[i % n], b = pts[(i + 1) % n]; const x = a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * l, y = a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * l; return { x, y, h: tr.chao(x, y), p: a }; };
  const caixa = new THREE.BoxGeometry(1, 1, 1), rot = (p) => Math.atan2(-p.ty, p.tx); // o x local da caixa vai para a tangente e o z local para a normal da pista
  const fundo = 16, piso = 12.6;
  const L = { corpo: [], porta: [], vidro: [], laje: [], grade: [], poste: [], friso: [], toldo: [], mecBody: [], mecHead: [], mecCap: [], toldoEng: [], posteEng: [], monitor: [], limite: [] };
  const placas = []; // as placas de número e nome de cada garagem, num atlas só
  cor.garagens.forEach((u, k) => {
    const q = em(u, cor.garagemLat), p = q.p, nx = p.nx * lado, ny = p.ny * lado, r = rot(p), largura = Math.max(18, cor.gap * 6 * 0.92), c = EQUIPES[k % EQUIPES.length][1];
    const ref = { x: q.x + nx * (meia / 2), y: q.y + ny * (meia / 2), h: q.h };
    // só onde nenhum outro trecho da pista passa mais perto do que a garagem está do próprio
    if (![0, fundo + 3].every((b) => [-1, 0, 1].every((s) => tr.distAt(ref.x + nx * b + p.tx * s * largura / 2, ref.y + ny * b + p.ty * s * largura / 2) >= Math.abs(cor.garagemLat) + meia / 2 + b - 4))) return;
    const pt = (a, b, y) => ({ x: ref.x + p.tx * a + nx * b, y: ref.h + y, z: ref.y + p.ty * a + ny * b });
    L.corpo.push({ ...pt(0, fundo / 2, piso / 2 - 9), r, sx: largura, sy: piso + 9, sz: fundo }); // o térreo (afunda 9 no chão)
    L.porta.push({ ...pt(0, 0.2, 4.8), r, sx: largura * 0.74, sy: 9.6, sz: 0.8 });
    L.friso.push({ ...pt(0, 0.35, 10.9), r, sx: largura * 0.96, sy: 2.6, sz: 1.1, k, c });
    L.laje.push({ ...pt(0, fundo / 2 - 1, piso + 0.3), r, sx: largura + 1, sy: 0.7, sz: fundo + 1.5 }); // o piso do terraço
    L.vidro.push({ ...pt(0, fundo / 2 + 2.5, piso + 4.4), r, sx: largura - 1.2, sy: 7.6, sz: fundo - 5 }); // o andar de cima, de vidro, recuado
    L.laje.push({ ...pt(0, fundo / 2 + 0.5, piso + 8.6), r, sx: largura + 1.6, sy: 0.9, sz: fundo }); // a laje de cobertura
    L.grade.push({ ...pt(0, 0.7, piso + 1.9), r, sx: largura, sy: 2.2, sz: 0.3 }); // o guarda-corpo na frente do terraço
    L.toldo.push({ ...pt(0, 2.8, piso + 6.4), r, sx: largura - 0.5, sy: 0.5, sz: 5.4, k, c }); // o toldo da equipe sobre o terraço
    for (const s of [-1, 1]) L.poste.push({ ...pt(s * (largura / 2 - 0.8), 0.9, piso + 3.4), r, sx: 0.5, sy: 6.6, sz: 0.5 });
    // os mecânicos da equipe: macacão na cor dela, em fila na frente da porta
    for (const s of [-1.2, 0, 1.2]) { const a = s * 5, b = -2.6; L.mecBody.push({ ...pt(a, b, 2.6), r, sx: 2.2, sy: 5.2, sz: 1.8, k, c }); L.mecHead.push({ ...pt(a, b, 6), r, sx: 1.7, sy: 1.6, sz: 1.6 }); L.mecCap.push({ ...pt(a, b, 7.1), r, sx: 2, sy: 0.8, sz: 1.9 }); }
    placas.push({ k, a: pt(0, 0.95, 13.4), t: [p.tx, p.ty], larg: largura * 0.8 });
    // o toldo do engenheiro no pit wall, diante da garagem, com o monitor
    const m = em(u, lado * (W / 2 + 16)), pr = m.p, rm = rot(pr);
    for (const s of [-1, 1]) L.posteEng.push({ x: m.x + pr.tx * s * 7, y: m.h + 4.4, z: m.y + pr.ty * s * 7, r: rm, sx: 0.8, sy: 8.8, sz: 0.8 });
    L.toldoEng.push({ x: m.x, y: m.h + 9, z: m.y, r: rm, sx: 17, sy: 0.7, sz: 5, k, c });
    L.monitor.push({ x: m.x - pr.nx * lado * 0.8, y: m.h + 5.6, z: m.y - pr.ny * lado * 0.8, r: rm, sx: 5.4, sy: 2.8, sz: 0.5 });
    for (const d of [-2.5, 2.5]) { const l = em(u + d * 0.05, latDe(u)); L.limite.push({ x: l.x, y: l.h + 0.75, z: l.y, r: rot(l.p), sx: 3.2, sy: 0.12, sz: 0.5 }); } // o limitador
  });
  // monta as caixas: material próprio por tipo, cor por instância onde há `c` (as partes da equipe)
  const equipe = [];
  const montar = (lista, mat, nome, { colorida = false } = {}) => {
    if (!lista.length) return;
    const m = noGrupo(new THREE.InstancedMesh(caixa, mat, lista.length)), d = new THREE.Object3D(), col = new THREE.Color(); m.name = nome; m.castShadow = false; m.receiveShadow = true;
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (colorida) { m.setColorAt(i, col.set(o.c)); equipe.push({ m, i, k: o.k }); } });
    if (colorida) m.instanceColor.needsUpdate = true;
  };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
  montar(L.corpo, mat(0xe9e6de), "monaco-box-corpo"); montar(L.porta, mat(0x23262c, { roughness: 0.5 }), "monaco-box-porta");
  montar(L.friso, mat(0xffffff), "monaco-box-friso", { colorida: true }); montar(L.laje, mat(0xf4f2ec, { roughness: 0.6 }), "monaco-box-laje");
  montar(L.vidro, mat(0x7d9db3, { roughness: 0.15, metalness: 0.4 }), "monaco-box-vidro"); montar(L.grade, mat(0x3a3d44), "monaco-box-grade");
  montar(L.toldo, mat(0xffffff, { roughness: 0.6 }), "monaco-box-toldo", { colorida: true }); montar(L.poste, mat(0xb8bbc0), "monaco-box-poste");
  montar(L.mecBody, mat(0xffffff), "monaco-box-mecanico", { colorida: true }); montar(L.mecHead, mat(0xe2b48c), "monaco-box-mecanico-cabeca"); montar(L.mecCap, mat(0xf4f4f4), "monaco-box-mecanico-bone");
  montar(L.toldoEng, mat(0xffffff, { roughness: 0.6 }), "monaco-box-toldo-eng", { colorida: true }); montar(L.posteEng, mat(0xb8bbc0), "monaco-box-poste-eng");
  montar(L.monitor, new THREE.MeshBasicMaterial({ color: 0x1e3f66 }), "monaco-box-monitor"); montar(L.limite, new THREE.MeshBasicMaterial({ color: 0xffd23f }), "monaco-box-limitador");
  // as placas das garagens: número grande e o nome da equipe, num atlas (1 chamada de desenho)
  if (placas.length) {
    const H = 64, atlas = canvasTex(1024, H * EQUIPES.length, (x, w) => {
      EQUIPES.forEach(([nome, c], k) => { x.fillStyle = c; x.fillRect(0, k * H, w, H); x.fillStyle = "rgba(0,0,0,0.35)"; x.fillRect(0, k * H, 150, H); x.fillStyle = "#ffffff"; x.textBaseline = "middle"; x.textAlign = "center"; x.font = "900 48px Arial Black, Arial, sans-serif"; x.fillText(String(k + 1), 75, k * H + H / 2 + 2); x.font = "900 40px Arial Black, Arial, sans-serif"; x.fillText(nome.toUpperCase(), 150 + (w - 150) / 2, k * H + H / 2 + 2, w - 190); });
    }, false);
    const vs = [], uv = [], idx = [];
    for (const pl of placas) {
      const w = pl.larg / 2, hh = 1.7, q = vs.length / 3, [tx, ty] = pl.t, a = pl.a;
      for (const [s, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { vs.push(a.x + tx * w * s, a.y + hh * v, a.z + ty * w * s); uv.push((s + 1) / 2, 1 - (pl.k + (1 - v) / 2) / EQUIPES.length); }
      idx.push(q, q + 1, q + 2, q, q + 2, q + 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = noGrupo(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide }))); m.name = "monaco-box-placas";
  }
  // as placas de entrada e saída do pit lane, de frente para quem chega
  const placa = (texto, u) => {
    const c = em(u, latDe(u) + lado * (meia + 2)), p = c.p, tex = canvasTex(256, 96, (x, w, h) => { x.fillStyle = "#0e3a8a"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffffff"; x.font = "900 44px Arial Black, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, h / 2 - 8, w - 16); x.font = "700 18px Arial, sans-serif"; x.fillText("PIT LANE  60 km/h", w / 2, h - 18); }, false);
    const g = new THREE.Group(); g.position.set(c.x, c.h, c.y); g.rotation.y = Math.atan2(-p.tx, -p.ty); noGrupo(g);
    const poste = new THREE.Mesh(caixa, mat(0x555a62)); poste.scale.set(0.8, 14, 0.8); poste.position.y = 7; g.add(poste);
    const painel = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), new THREE.MeshBasicMaterial({ map: tex })); painel.position.set(0, 15, 0.5); g.add(painel);
  };
  placa("PIT ENTRY", 3); placa("PIT EXIT", cor.len - 3);
  // o jogo pinta as garagens com a cor de quem usa cada uma (grp.userData.colorir): as partes da equipe daqui seguem
  const antigo = grp.userData.colorir, col = new THREE.Color();
  grp.userData.colorir = (cores) => { antigo?.(cores); for (const { m, i, k } of equipe) m.setColorAt(i, col.set(cores?.[k] || EQUIPES[k % EQUIPES.length][1])); for (const m of new Set(equipe.map((e) => e.m))) m.instanceColor.needsUpdate = true; };
  tr.boxesMonaco = { garagens: placas.length };
}
