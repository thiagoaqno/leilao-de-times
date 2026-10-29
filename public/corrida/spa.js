// Spa-Francorchamps: o vale da Eau Rouge, os dois paddocks, os chalés e a floresta das Ardenas.
import * as THREE from "three";
import { M } from "./cena.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { livre, ocupado, recortar, lotes, tira } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { torreControle } from "./kit/torres.js";
import { comTextura, letreiro } from "./kit/montagem.js";
import { terracoDosBoxes, boxesEndurance, hotelEauRouge, chaleArdenas, campingArdenas } from "./kit/spa/pecas.js";

const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;
const no = (tr, f, lado, d) => { const p = tr.pts[indice(tr, f)]; return { p, x: p.x + p.nx * lado * d, z: p.y + p.ny * lado * d }; };
const rumo = (p, lado) => Math.atan2(-lado * p.nx, -lado * p.ny); // frente (+z) para a pista

function colocar(tr, { add, hAt }, f, lado, dist, raio, criar) {
  for (const afastar of [0, 50, 110]) {
    const q = no(tr, f, lado, dist + afastar);
    if (!livre(tr, q.x, q.z, raio + 8) || ocupado(tr, q.x, q.z)) continue;
    const g = criar(); g.position.set(q.x, hAt(q.x, q.z) + 1, q.z); g.rotation.y = rumo(q.p, lado); add(g);
    tr.reservado.push([q.x, q.z, raio + 16]); return g;
  }
  return null;
}

function valeEauRouge(tr, { add }) {
  // A água avermelhada que deu nome à curva corre ao pé do vale; o asfalto passa alto por cima.
  const a = Math.floor(0.093 * tr.n), b = Math.floor(0.143 * tr.n), lat = tr.W / 2 + 96;
  const rec = recortar(tr, a, b, [lat, lat + 16]); if (!rec) return;
  const agua = new THREE.MeshStandardMaterial({ color: 0x745c47, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide });
  const pedra = M(0xaca39a, { roughness: 1, side: THREE.DoubleSide }), L = lotes();
  tira(tr, L.de(agua), rec.i0, rec.i1, lat, lat + 15, -7, -7, 0, 1);
  tira(tr, L.de(pedra), rec.i0, rec.i1, lat - 4, lat, -6, -7, 0, 1);
  tira(tr, L.de(pedra), rec.i0, rec.i1, lat + 15, lat + 21, -7, -5, 0, 1);
  L.montar(add, "spa-riacho-eau-rouge");
}

function retaDosBoxes(tr, ctx) {
  const { add } = ctx;
  prediosDosBoxes(tr, add, { de: 0.978, ate: 1.038, lado: 1, recuo: 86, fundo: 52, alto: 45, torre: false,
    paineis: ["f1", "pirelli", "rolex", "aramco"], cores: { parede: "#e4e6e5", friso: "#b6222d", teto: 0xc4c9ca } });
  // Terraço da F1 sobre o edifício, fora da faixa de rodagem e do corredor dos boxes.
  const q = no(tr, 0.998, 1, tr.W / 2 + 113), terraco = terracoDosBoxes();
  terraco.position.set(q.x, q.p.h + 45, q.z); terraco.rotation.y = rumo(q.p, 1); add(terraco);
  const torre = torreControle({ raio: 14, aneis: 3, corpo: 2, alturaAnel: 7, cobertura: "plana", corAneis: "#c4232b",
    corVidro: "#2c4b5c", corCorpo: "#e3e4e1", corCobertura: "#f2f3f0", bandeira: ["#111111", "#f0d123"] });
  const t = no(tr, 0.978, 1, tr.W / 2 + 188);
  if (livre(tr, t.x, t.z, 38) && !ocupado(tr, t.x, t.z)) { torre.position.set(t.x, ctx.hAt(t.x, t.z), t.z); add(torre); tr.reservado.push([t.x, t.z, 44]); }
  // Gold 1: arquibancada coberta diante da reta, com a plateia voltada para o grid.
  colocar(tr, ctx, 0.997, -1, tr.W / 2 + 160, 135, () => tribunaCoberta({ comprimento: 230, degraus: 10, altura: 5,
    fundo: 8, secoes: 5, publico: 0.52, cobertura: "#e9ecee", cores: ["#cf2030", "#f0d32c", "#252c35"], semente: 1971 }));
  // Paddock atrás das garagens, sem estruturas baixas na pista.
  for (const [f, nome] of [[0.989, "SPA PADDOCK"], [0.012, "PIRELLI CLUB"]]) colocar(tr, ctx, f, 1, tr.W / 2 + 280, 75,
    () => tendaPaddock({ modulos: 3, filas: 2, texto: nome, corFaixa: "#b6222d", mesas: true }));
}

function marcosDoVale(tr, ctx) {
  // O paddock antigo fica na descida depois de La Source; o hotel olha para Eau Rouge.
  colocar(tr, ctx, 0.103, -1, tr.W / 2 + 180, 150, boxesEndurance);
  colocar(tr, ctx, 0.125, 1, tr.W / 2 + 205, 78, hotelEauRouge);
  for (const [f, lado] of [[0.055, -1], [0.29, 1], [0.34, -1]]) colocar(tr, ctx, f, lado, tr.W / 2 + 205, 46, chaleArdenas);
  // A torre de espectadores elevada do Raidillon e a arquibancada de Pouhon.
  for (const [f, lado] of [[0.151, -1], [0.51, 1]]) colocar(tr, ctx, f, lado, tr.W / 2 + 185, 125,
    () => tribunaCoberta({ comprimento: 210, degraus: 10, altura: 6, fundo: 8, secoes: 5,
      publico: 0.5, cobertura: "#ededeb", cores: ["#c7242a", "#f2d72d", "#21354c"], semente: Math.floor(f * 1000) }));
  campingArdenas(tr, ctx.add);
  valeEauRouge(tr, ctx);
}

function faixaDaLargada(tr, { add }) {
  const p = tr.pts[0], L = tr.W / 2 + 10;
  // A malha do pórtico em pista.js tem eixo X girado por -atan2(ny,nx), portanto X fica na normal da pista.
  // O plano abaixo usa a mesma normal e olha contra a tangente, de frente para os carros.
  const tex = comTextura(letreiro("CIRCUIT DE SPA-FRANCORCHAMPS", { fundo: "#ba212c", cor: "#ffffff", w: 1024, h: 96 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 8, 8), tex);
  face.position.set(p.x - p.tx * 2.2, p.h + 69, p.y - p.ty * 2.2);
  face.rotation.y = Math.atan2(-p.tx, -p.ty); add(face);
}

export function cenarioSpa(tr, ctx) { tr.reservado ||= []; retaDosBoxes(tr, ctx); marcosDoVale(tr, ctx); }
export function depoisSpa(tr, ctx) { faixaDaLargada(tr, ctx); }
