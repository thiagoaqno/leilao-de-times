// Singapura — as barreiras de rua, só onde a pista real tem (tr.murosEscape: o mesmo recuo manda no desenho e na colisão, ver `muros` em pistas.js):
// o muro baixo de concreto branco com os painéis de patrocínio, a TELA de detritos contínua (alfa) presa em postes que se curvam para dentro (nunca
// treliça solta no ar: a tela vai de um poste ao outro, de ponta a ponta de cada trecho), os blocos Tecpro nos escapes curtos e o asfalto entre a
// borda da pista e o muro, com a pintura azul e dourada dos escapes das curvas 18 e 19. Tudo por trecho contínuo, uma malha por material.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { MARCAS, marcaTex } from "../marcas.js";
import { ocupado } from "../comum.js";

// as marcas daqui (acrescentadas à tabela do kit sem mexer nela): a companhia aérea do GP e os patrocinadores que faltavam
Object.assign(MARCAS, {
  sia: { fundo: "#1b2b69", cor: "#f2b705", texto: "SINGAPORE AIRLINES", fonte: "700 {s}px Georgia, serif", moldura: "#f2b705" },
  sgp: { fundo: "#ffffff", cor: "#d1103a", texto: "SINGAPORE GRAND PRIX", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#d1103a" },
  marinabay: { fundo: "#0b2a4a", cor: "#ffffff", texto: "MARINA BAY", fonte: "900 {s}px Arial, sans-serif", moldura: "#2fb4d6" },
  singapura: { fundo: "#d1103a", cor: "#ffffff", texto: "SINGAPORE", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
});
export const PATROCINIO_SG = ["sia", "pirelli", "rolex", "heineken", "aramco", "dhl", "aws", "lenovo", "msc", "sgp", "f1"];

const ALTO = 13, TELA = 46; // o concreto (≈ a altura do carro) e a tela por cima dele
const cor = (h) => new THREE.Color(h);

// os trechos contínuos de cada lado: [{ i0, i1 }] (a fita cruza o fim da volta)
function trechos(tr, lado) {
  const { n } = tr, m = tr.murosEscape[lado], out = []; let a = -1;
  const tem = (i) => !!m[((i % n) + n) % n];
  let ini = 0; while (ini < n && tem(ini)) ini++; // começa num ponto sem muro (se a volta inteira tem, começa em 0)
  if (ini === n) return [{ i0: 0, i1: n }];
  for (let k = 1; k <= n; k++) {
    const i = ini + k, t = k < n && tem(i);
    if (t && a < 0) a = i;
    if (!t && a >= 0) { if (i - 1 - a >= 3) out.push({ i0: a, i1: i - 1 }); a = -1; }
  }
  return out;
}

export function barreiras(tr, add, cfg = {}) {
  const { pts, n, W } = tr, sponsors = cfg.marcas || PATROCINIO_SG, tec = cfg.tecpro || [], pint = cfg.pintura || [];
  if (!tr.murosEscape) return;
  const pintada = (i, lado) => { const f = (((i % n) + n) % n) / n; return pint.some(([a, b, l]) => f >= a && f <= b && (l === 0 || l === lado)); };
  const emTecpro = (i, lado) => { const f = (((i % n) + n) % n) / n; return tec.some(([a, b, l]) => f >= a && f <= b && (l === 0 || l === lado || l === undefined)); };
  // ---- os materiais ----
  const painel = (nome) => marcaTex(nome, 256, 64);
  const concretoTex = canvasTex(1024, 64, (x, w, hh, rr) => { // um segmento de 56 unidades: concreto branco, o painel de uma marca e o rodapé escuro
    x.fillStyle = "#d9d9d4"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff14"; x.fillRect(rr() * w, rr() * hh, 3, 2); }
    const nm = sponsors.length, seg = w / nm;
    sponsors.forEach((s, k) => { x.fillStyle = "#ffffff"; x.fillRect(k * seg + 8, 8, seg - 16, hh - 22); try { x.drawImage(painel(s).image, k * seg + 12, 10, seg - 24, hh - 26); } catch (e) { /* canvas de mentira nos testes */ } x.fillStyle = "#00000022"; x.fillRect(k * seg, 0, 2, hh); });
    x.fillStyle = "#6b6c70"; x.fillRect(0, hh - 8, w, 8); x.fillStyle = "#c9c9c4"; x.fillRect(0, 0, w, 4);
  });
  concretoTex.repeat.set(1, 1);
  const mConcreto = [1, -1].map(() => new THREE.MeshStandardMaterial({ map: concretoTex, roughness: 0.85, side: THREE.DoubleSide }));
  const tecproTex = canvasTex(256, 64, (x, w, hh, rr) => { // blocos de plástico cheios de água: laranja e branco, com a faixa azul
    for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? "#f3f3ef" : "#f26a1b"; x.fillRect(k * 64, 0, 64, hh); x.fillStyle = "#00000030"; x.fillRect(k * 64, 0, 2, hh); }
    x.fillStyle = "#1c3f94"; x.fillRect(0, hh * 0.42, w, hh * 0.16); x.fillStyle = "#00000022"; x.fillRect(0, hh - 6, w, 6);
    for (let i = 0; i < 300; i++) { x.fillStyle = rr() < 0.5 ? "#0000000a" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
  });
  const mTecpro = new THREE.MeshStandardMaterial({ map: tecproTex, roughness: 0.6, side: THREE.DoubleSide });
  const topo = M(0xcfcfca, { roughness: 0.9, side: THREE.DoubleSide });
  const redeTex = canvasTex(64, 64, (x, w, hh) => { // a tela de arame: losangos finos num fundo transparente
    x.clearRect(0, 0, w, hh); x.strokeStyle = "rgba(196,202,208,0.9)"; x.lineWidth = 1;
    for (let k = -hh; k <= w; k += 4) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + hh, hh); x.stroke(); x.beginPath(); x.moveTo(k, hh); x.lineTo(k + hh, 0); x.stroke(); }
    x.strokeStyle = "rgba(150,156,162,1)"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 2); x.lineTo(w, 2); x.stroke(); x.beginPath(); x.moveTo(0, hh - 2); x.lineTo(w, hh - 2); x.stroke();
  });
  const mRede = new THREE.MeshStandardMaterial({ map: redeTex, transparent: true, alphaTest: 0.35, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide, depthWrite: true });
  mRede.userData.semContato = true;
  const mPoste = M(0xb9bfc5, { roughness: 0.5, metalness: 0.5 });
  const asfaltoTex = canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#56575c"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#00000016" : "#ffffff0d"; x.fillRect(rr() * w, rr() * hh, 2, 2); } });
  const livreaTex = canvasTex(128, 256, (x, w, hh, rr) => { // o escape pintado de azul e dourado, com as listras brancas e o nome da companhia
    x.fillStyle = "#1c2a96"; x.fillRect(0, 0, w, hh); x.fillStyle = "#f2b705"; x.fillRect(0, 0, 7, hh); x.fillRect(w - 7, 0, 7, hh); x.fillStyle = "#ffffff"; x.fillRect(11, 0, 4, hh); x.fillRect(w - 15, 0, 4, hh);
    x.save(); x.translate(w / 2, hh / 2); x.rotate(-Math.PI / 2); x.fillStyle = "#ffffff"; x.font = "900 34px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("SINGAPORE AIRLINES", 0, 0, 220); x.restore();
    for (let i = 0; i < 400; i++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff10"; x.fillRect(rr() * w, rr() * hh, 2, 2); }
  });
  const mPintura = new THREE.MeshStandardMaterial({ map: livreaTex, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); mPintura.userData.asfalto = "zebra";
  const mAsfalto = new THREE.MeshStandardMaterial({ map: asfaltoTex, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mAsfalto.userData.asfalto = "zebra"; // (só escurece na chuva: o sombreador da pista é só da fita principal)
  // ---- a geometria, por material ----
  const G = new Map(); const g = (mat) => { if (!G.has(mat)) G.set(mat, { vs: [], uv: [], idx: [] }); return G.get(mat); };
  const quad = (L, a, b) => { const base = L.vs.length / 3; L.vs.push(...a.p0, ...a.p1, ...b.p0, ...b.p1); L.uv.push(a.u0, a.v0, a.u1, a.v1, b.u0, b.v0, b.u1, b.v1); L.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); };
  const postes = [], bracos = [];
  let faixas = 0, comprimento = 0;
  for (const lado of [1, -1]) for (const { i0, i1 } of trechos(tr, lado)) {
    faixas++;
    let acc = 0, ultimoPoste = -1e9, ant = null;
    for (let i = i0; i <= i1; i++) {
      const q = ((i % n) + n) % n, p = pts[q], rec = tr.murosEscape[lado][q] || 0, lat = lado * (W / 2 + rec), h = p.h;
      const x = p.x + p.nx * lat, z = p.y + p.ny * lat, xb = p.x + p.nx * lado * (W / 2 + 7), zb = p.y + p.ny * lado * (W / 2 + 7);
      if (ant) acc += Math.hypot(x - ant.x, z - ant.z);
      const tecpro = emTecpro(q, lado), mat = tecpro ? mTecpro : mConcreto[lado > 0 ? 0 : 1], u = (lado > 0 ? -1 : 1) * acc / (tecpro ? 56 : 56 * sponsors.length), uT = acc / 48; // (o painel lê da esquerda para a direita de quem anda: na barreira da direita o sentido da volta é para a esquerda de quem olha, então a fita corre ao contrário)
      const frente = { p0: [x, h + 0.2, z], p1: [x, h + ALTO, z], u, v0: 0, v1: 1 };
      // a face de frente do concreto (de baixo para cima) e a tampa até o lado de trás
      if (ant) {
        const a = { p0: ant.f.p0, p1: ant.f.p1, u0: ant.u, v0: 0, u1: ant.u, v1: 1 }, b = { p0: frente.p0, p1: frente.p1, u0: u, v0: 0, u1: u, v1: 1 };
        quad(g(ant.mat), a, b);
        const t = 2.6, ox = -p.nx * lado * t, oz = -p.ny * lado * t, ox0 = -ant.p.nx * lado * t, oz0 = -ant.p.ny * lado * t; // a tampa (para dentro do muro)
        quad(g(topo), { p0: [ant.f.p1[0], ant.f.p1[1], ant.f.p1[2]], p1: [ant.f.p1[0] - ox0, ant.f.p1[1], ant.f.p1[2] - oz0], u0: 0, v0: 0, u1: 0, v1: 0 }, { p0: [x, h + ALTO, z], p1: [x - ox, h + ALTO, z - oz], u0: 0, v0: 0, u1: 0, v1: 0 });
        // o asfalto entre a borda da pista e o muro (a faixa da rua que sobra), no nível da pista
        if (rec > 8) quad(g(pintada(q, lado) ? mPintura : mAsfalto), { p0: [ant.xb, ant.h + 0.46, ant.zb], p1: [ant.f.p0[0], ant.f.p0[1] + 0.26, ant.f.p0[2]], u0: 0, v0: ant.acc / 24, u1: 1, v1: ant.acc / 24 }, { p0: [xb, h + 0.46, zb], p1: [x, h + 0.46, z], u0: 0, v0: acc / 24, u1: 1, v1: acc / 24 });
        // a tela de detritos, inclinada para dentro no alto (o poste se curva): sobe do topo do muro até o alto do poste
        if (!tecpro || true) {
          const lean = 6, ax = x - p.nx * lado * lean, az = z - p.ny * lado * lean, cx = ant.x - ant.p.nx * lado * lean, cz = ant.z - ant.p.ny * lado * lean;
          quad(g(mRede), { p0: [ant.x, ant.h + ALTO, ant.z], p1: [cx, ant.h + ALTO + TELA, cz], u0: ant.acc / 48, v0: 0, u1: ant.acc / 48, v1: 1 }, { p0: [x, h + ALTO, z], p1: [ax, h + ALTO + TELA, az], u0: uT, v0: 0, u1: uT, v1: 1 });
        }
      }
      if (acc - ultimoPoste >= 24 && ant) { ultimoPoste = acc; const lean = 6; postes.push({ x, y: h + ALTO, z, nx: p.nx * lado, nz: p.ny * lado }); bracos.push({ x: x - p.nx * lado * lean / 2, y: h + ALTO + TELA - 1, z: z - p.ny * lado * lean / 2, r: Math.atan2(-p.nx * lado, -p.ny * lado) }); }
      ant = { x, z, h, u, f: frente, p, mat, xb, zb, acc };
    }
    comprimento += acc;
  }
  for (const [mat, L] of G) {
    if (!L.idx.length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(L.vs, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(L.uv, 2)); geo.setIndex(L.idx); geo.computeVertexNormals();
    const m = add(new THREE.Mesh(geo, mat)); m.receiveShadow = true; m.castShadow = mat !== mRede && mat !== mAsfalto && mat !== mPintura; m.name = mat === mRede ? "singapura-tela" : mat === mAsfalto || mat === mPintura ? "singapura-apron" : "singapura-muro";
    if (mat === mRede) m.userData.semContato = true;
  }
  // os postes (e a ponta curvada para dentro): InstancedMesh
  if (postes.length) {
    const pg = new THREE.CylinderGeometry(0.9, 1.1, TELA + 1, 6); pg.translate(0, (TELA + 1) / 2, 0);
    const im = new THREE.InstancedMesh(pg, mPoste, postes.length), o = new THREE.Object3D();
    postes.forEach((p, k) => { o.position.set(p.x, p.y, p.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); im.setMatrixAt(k, o.matrix); });
    im.castShadow = false; im.receiveShadow = false; im.name = "singapura-postes"; im.userData.semContato = true; add(im);
    const bg = new THREE.CylinderGeometry(0.7, 0.8, 11, 5); bg.rotateX(Math.PI / 2 - 0.5);
    const ib = new THREE.InstancedMesh(bg, mPoste, bracos.length);
    bracos.forEach((b, k) => { o.position.set(b.x, b.y, b.z); o.rotation.set(0, b.r, 0); o.scale.set(1, 1, 1); o.updateMatrix(); ib.setMatrixAt(k, o.matrix); });
    ib.castShadow = false; ib.name = "singapura-bracos"; ib.userData.semContato = true; add(ib);
  }
  tr.barreirasSG = { faixas, comprimento: Math.round(comprimento), postes: postes.length };
}
void ocupado; void cor;
