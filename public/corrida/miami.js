// Miami (Miami International Autodrome, GP de Miami, em volta do Hard Rock Stadium): o que só o circuito tem, em cima do kit. O resto (zebras, escape,
// arquibancadas temporárias aqua e rosa, painéis, passarelas e som) é do kit, na configuração de gps/miami.js; as peças exclusivas estão em kit/miami/.
// Aqui, na ordem em que aparecem (frações da volta, a partir da linha de chegada, que fica no meio da reta dos boxes, no alto do mapa):
// 1. o estádio no miolo leste do circuito (a cobertura branca, os quatro mastros e os cabos), com a praça e os estacionamentos de carros em volta;
// 2. a reta dos boxes (0,95-1,04): o prédio temporário de dois andares com a torre de controle na linha de chegada, e o paddock atrás
//    (tendas brancas, motorhomes e carretas das equipes);
// 3. no miolo oeste: a marina falsa (iates sobre o chão pintado de água) e o Beach Club com a piscina;
// 4. os viadutos da rodovia: um por cima da chicane estreita das curvas 14 e 15 (e da reta de trás), outro ao lado da reta dos boxes;
// 5. palmeiras em toda a volta, a cidade pastel ao longe, a faixa do circuito no pórtico da largada e os carros que andam nos viadutos.
// Tudo é cenário: nada fica dentro da pista (livre/ocupado) e a física é a de sempre. Sem marcas registradas novas: os painéis são nomes de lugar
// e de comida da Flórida (kit/miami/marcas.js) e as marcas que o kit já tem.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado, recortar, sorteio, instancias } from "./kit/comum.js";
import { tendaPaddock } from "./kit/coberturas.js";
import { registrarMarcasMiami } from "./kit/miami/marcas.js";
import { pousar, reservar, reservarRet, acharRet, acharElipse, alturaDoChao } from "./kit/miami/lugar.js";
import { estadio, estacionamento, MEDIDAS } from "./kit/miami/estadio.js";
import { marina } from "./kit/miami/marina.js";
import { beachClub } from "./kit/miami/praia.js";
import { viaduto } from "./kit/miami/viaduto.js";
import { predioDosBoxes, motorhome, carreta, EQUIPES } from "./kit/miami/paddock.js";
import { coletor } from "./kit/miami/palmas.js";

registrarMarcasMiami();

// ---------------------------------------------------------------------------------------------------------------------
// 1. O estádio e os estacionamentos
// ---------------------------------------------------------------------------------------------------------------------
function oEstadio(tr, { add }) {
  const { A, B } = MEDIDAS, PA = A + 54, PB = B + 54;
  // o miolo leste do circuito: o centro onde a praça (a elipse maior) cabe com a maior folga
  const lugar = acharElipse(tr, [3000, 3900, 1950, 2700], PA, PB, { max: 130, min: 20, passo: 20 });
  if (!lugar) { tr.faltouMiami = (tr.faltouMiami || []).concat([{ nome: "estadio" }]); return null; }
  const { x, z } = lugar, { lo, hi } = alturaDoChao(tr, x, z, 0, PA * 0.7, PB * 0.7);
  const e = estadio({ baseY: hi - lo + 10 });
  e.position.set(x, hi - 1, z); add(e);
  // reserva a praça inteira (as palmeiras e a torcida solta não entram) e deixa o estádio dentro de tr.ocupado
  for (let u = -PA; u <= PA; u += 60) for (let v = -PB; v <= PB; v += 60) if ((u / PA) ** 2 + (v / PB) ** 2 <= 1.15) tr.reservado.push([x + u, z + v, 62]);
  tr.estadioMiami = { x, z, A, B, folga: lugar.folga };
  // os estacionamentos: tiras em volta da praça (onde couber) e carros parados
  const lotes = [[0, -(PB + 70), 0, 170, 46], [0, PB + 70, 0, 170, 46], [-(PA + 80), 0, Math.PI / 2, 120, 44], [PA + 80, 0, Math.PI / 2, 120, 44], [-(PA * 0.7), -(PB + 150), 0, 130, 44], [PA * 0.7, PB + 150, 0, 130, 44]];
  let n = 0, carros = 0;
  for (const [u, v, rot, a, b] of lotes) {
    const q = acharRet(tr, x + u, z + v, rot, a + 10, b + 10, { folga: 30, raio: 90, passo: 30 });
    if (!q) continue;
    carros += estacionamento(tr, add, { x: q.x, z: q.z, rot, a, b, semente: 40 + n }).carros; reservarRet(tr, q.x, q.z, rot, a, b, 14); n++;
  }
  tr.estacionamentosMiami = { lotes: n, carros };
  return { x, z, PA, PB };
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. A reta dos boxes e o paddock
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { n, W } = tr, lado = tr.t.boxes?.lado ?? -1, Z = W / 2 + 84, F = 46;
  const rec = recortar(tr, Math.floor(0.945 * n), Math.floor(1.05 * n), [lado * (Z - 4), lado * (Z + F + 4)], 4);
  if (!rec) return { lado, Z, F };
  const comp = Math.min(640, (rec.i1 - rec.i0) * 6 - 24), meio = Math.floor((rec.i0 + rec.i1) / 2);
  const linha = (n - meio) * 6 * (lado > 0 ? -1 : 1); // onde a linha de chegada cai no prédio (o +x local anda a favor da volta do lado -1)
  const predio = predioDosBoxes({ comprimento: comp, fundo: F, torre: Math.max(-comp / 2 + 90, Math.min(comp / 2 - 90, linha)), paineis: ["mimiami", "migp", "mimiami", "migp"] });
  const q = pousar(tr, predio, (((meio % n) + n) % n) / n, lado, Z); add(predio);
  // a laje do fundo desce até o chão (o prédio fica no nível da pista; o terreno cai para longe dela)
  const ch = Math.max(0, tr.pts[((meio % n) + n) % n].h - tr.chao(q.x, q.z)) + 6;
  const aterro = new THREE.Mesh(new THREE.BoxGeometry(comp, ch + 8, F), M(0xcfcac0, { roughness: 1 })); aterro.position.set(0, -(ch + 8) / 2 + 1, -F / 2); predio.add(aterro);
  reservar(tr, q.x, q.z, q.ry, comp, F + 30, 40);
  tr.predioMiami = { f: (((meio % n) + n) % n) / n, comprimento: comp, lado, torreX: linha, x: q.x, z: q.z, ry: q.ry, fundo: F };
  return { lado, Z, F, comp };
}

// o paddock atrás dos boxes: o retângulo livre mais perto da parte de trás do prédio recebe as tendas brancas (a fila de cima), os motorhomes e as
// carretas das equipes, todos de frente para a pista
function paddock(tr, { add }) {
  const pr = tr.predioMiami, achados = { tendas: 0, motorhomes: 0, carretas: 0 };
  if (!pr) return;
  const a = 200, b = 66, atras = [-Math.sin(pr.ry), -Math.cos(pr.ry)]; // a direção "para trás" do prédio (a frente dele é (sen ry, cos ry))
  const d = pr.fundo + 60 + b;
  const lugar = acharRet(tr, pr.x + atras[0] * d, pr.z + atras[1] * d, 0, a, b, { folga: 30, raio: 300, passo: 20 });
  if (!lugar) return;
  const cr = Math.cos(pr.ry), sr = Math.sin(pr.ry), mundo = (lx, lz) => [lugar.x + lx * cr + lz * sr, lugar.z - lx * sr + lz * cr];
  const poe = (g, lx, lz) => { const [x, z] = mundo(lx, lz); g.position.set(x, tr.chao(x, z) - 1, z); g.rotation.y = pr.ry; add(g); };
  [["PADDOCK", "#0aa3ad"], ["MIAMI", "#ff5fa2"], ["HOSPITALITY", "#0aa3ad"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#ff5fa2" }); poe(t, -140 + k * 140, 64); achados.tendas++;
  });
  for (let k = 0; k < 4; k++) { poe(motorhome({ cor: EQUIPES[(k * 2) % EQUIPES.length], faixa: k % 2 ? "#ff5fa2" : "#0aa3ad" }), -138 + k * 92, -10); achados.motorhomes++; }
  for (let k = 0; k < 4; k++) { poe(carreta({ cor: EQUIPES[(k * 3 + 1) % EQUIPES.length] }), -150 + k * 100, -44); achados.carretas++; }
  reservarRet(tr, lugar.x, lugar.z, 0, a, b, 16);
  tr.paddockMiami = { ...achados, x: Math.round(lugar.x), z: Math.round(lugar.z) };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. A marina e o Beach Club (o miolo oeste)
// ---------------------------------------------------------------------------------------------------------------------
function marinaEClube(tr, { add }, palmas) {
  const alvo = acharRet(tr, 1750, 2330, 0, 205, 120, { folga: 44, raio: 320, passo: 30 });
  let m = null;
  if (alvo) m = marina(tr, add, { x: alvo.x, z: alvo.z, rot: 0, a: 180, b: 100 });
  const base = alvo ? [alvo.x + 320, alvo.z - 20] : [2150, 2300];
  const clube = acharRet(tr, base[0], base[1], 0, 135, 95, { folga: 44, raio: 360, passo: 30 });
  if (clube) beachClub(tr, add, { x: clube.x, z: clube.z, rot: 0, a: 130, b: 90, palmas });
  tr.marinaClubeMiami = { marina: alvo ? { x: alvo.x, z: alvo.z, barcos: m.barcos } : null, clube: clube || null };
  if (alvo) for (const [u, v] of [[-205, -125], [205, -125], [-205, 125], [205, 125], [0, -128], [0, 128]]) palmas.poe(alvo.x + u, alvo.z + v, tr.chao(alvo.x + u, alvo.z + v) - 1, 0.9 + (u + v) % 3 * 0.1, u);
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Os viadutos
// ---------------------------------------------------------------------------------------------------------------------
function viadutos(tr, { add }) {
  // o da rodovia que cruza a chicane estreita (curvas 14 e 15) e, mais ao sul, a reta de trás
  const v1 = viaduto(tr, add, { caminho: [[1135, 2100], [1190, 2500], [1250, 2800], [1300, 3150], [1340, 3560]], alto: 68, largura: 100, rampa: 400, carros: 12, semente: 5, nome: "viaduto-da-chicane", placa: { i: 52, texto1: "MIAMI GARDENS", texto2: "EVERGLADES  ·  SUNSHINE STATE" } });
  // o que corre ao lado da reta dos boxes, do outro lado da arquibancada principal
  const v2 = viaduto(tr, add, { caminho: [[500, 1230], [1500, 1335], [2600, 1350], [3700, 1330], [4700, 1180]], alto: 74, largura: 104, rampa: 520, carros: 18, semente: 9, nome: "viaduto-da-reta" });
  tr.animarViadutosMiami = [v1.animar, v2.animar];
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. A cidade pastel ao longe
// ---------------------------------------------------------------------------------------------------------------------
function cidadeAoLonge(tr, add) {
  const r = sorteio(777), C = tr.t.world / 2, lista = [], tex = canvasTex(64, 128, (x, w, h, q) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h); x.fillStyle = "#3a4f66";
    for (let j = 0; j < 14; j++) for (let i = 0; i < 6; i++) { x.fillStyle = q() < 0.2 ? "#ffe9a8" : "#4a647d"; x.fillRect(4 + i * 10, 5 + j * 9, 6, 5); }
  });
  const pastel = ["#ffb3c7", "#9fe3e0", "#fff0b8", "#ffffff", "#ffc9a3", "#b9d9f2", "#f6a7d0"];
  for (let k = 0; k < 90; k++) {
    const a = r() * Math.PI * 2, d = 2350 + r() * 1100, x = C + Math.cos(a) * d * 1.05, z = C + Math.sin(a) * d * 1.05, h = 70 + r() ** 2 * 380, w = 50 + r() * 90;
    if (tr.distAprox(x, z) < 650) continue;
    lista.push({ x, y: h / 2 - 2, z, sx: w, sy: h, sz: w * (0.7 + r() * 0.6), r: r() * 3, cor: pastel[(r() * pastel.length) | 0] });
  }
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), geo = new THREE.BoxGeometry(1, 1, 1);
  const m = instancias(add, geo, mat, lista, { sombra: false, nome: "miami-cidade-longe" });
  if (m) { const c = new THREE.Color(); lista.forEach((o, k) => m.setColorAt(k, c.set(o.cor))); m.instanceColor.needsUpdate = true; }
  tr.cidadeMiami = lista.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioMiami(tr, ctx) {
  tr.reservado ||= [];
  const palmas = (tr.palmasMiami = coletor());
  oEstadio(tr, ctx);
  retaDosBoxes(tr, ctx);
  paddock(tr, ctx);
  marinaEClube(tr, ctx, palmas);
  viadutos(tr, ctx);
}

export function depoisMiami(tr, ctx) {
  const { add } = ctx, palmas = tr.palmasMiami, r = sorteio(4242), { n, W } = tr;
  // as palmeiras: pela volta toda, dos dois lados, em manchas; e uma fileira em volta da praça do estádio
  for (let i = 0; i < n; i += 11) {
    const p = tr.pts[i];
    for (const lado of [-1, 1]) {
      if (r() < 0.38) continue;
      const lat = W / 2 + 70 + r() * 70, x = p.x + p.nx * lado * lat + (r() - 0.5) * 30, z = p.y + p.ny * lado * lat + (r() - 0.5) * 30;
      if (!livre(tr, x, z, 46) || ocupado(tr, x, z)) continue;
      palmas.poe(x, z, tr.chao(x, z) - 1, 0.8 + r() * 0.55, r() * 6.28);
    }
  }
  const e = tr.estadioMiami;
  if (e) for (let k = 0; k < 40; k++) { const t = (k / 40) * Math.PI * 2, x = e.x + Math.cos(t) * (e.A + 66), z = e.z + Math.sin(t) * (e.B + 66); if (livre(tr, x, z, 30)) palmas.poe(x, z, tr.chao(x, z) - 1, 1 + r() * 0.2, r() * 6.28); }
  tr.palmasMiamiN = palmas.lista.length; palmas.construir(add);
  cidadeAoLonge(tr, add);
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("migp", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
  // os carros dos viadutos andam no laço de animação que vidaGP definiu
  const anterior = tr.animarPista, anims = tr.animarViadutosMiami || [];
  tr.animarPista = (dt, foco, t) => { anterior?.(dt, foco, t); for (const a of anims) a(dt); };
}
