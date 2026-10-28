// Suzuka (Suzuka International Racing Course, Mie): o que só o circuito tem. O resto (zebras, escape, arquibancadas de curva,
// painéis, passarelas, serra e som) é do kit, na configuração de gps/suzuka.js. Aqui:
// 1. o viaduto do cruzamento em "8" (kit/suzuka/viaduto.js: o traçado e a altura são os de pistas.js);
// 2. o prédio dos boxes (kit/boxes.js) com a torre de controle (kit 2) no teto e, do outro lado da reta, a arquibancada principal
//    coberta (kit 2: tribunaCoberta) em três módulos, de concreto, com a torcida colorida;
// 3. a alameda de entrada, atrás da arquibancada: pórtico "SUZUKA CIRCUIT", cinco torii, fios de lanternas, estandartes (nobori),
//    tendas de hospitalidade e estacionamentos cheios de carros;
// 4. o parque do circuito no miolo da volta: a roda-gigante que gira (kit/suzuka/roda-gigante.js), o hotel, a torre de queda, o
//    carrossel e o pavilhão em velas;
// 5. os morros de floresta em volta, com cedros, folhosas e bordos (kit/suzuka/colinas.js), e as cerejeiras em flor pela beira.
// O pórtico da largada é o de pista.js (as cinco luzes), que já atravessa a pista na linha de chegada; `depois` só pendura a faixa.
import * as THREE from "three";
import { M } from "./cena.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { faixa } from "./kit/arquibancadas.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado, recortar, sorteio } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock, velas } from "./kit/coberturas.js";
import { torreControle, portico } from "./kit/torres.js";
import { viaduto } from "./kit/suzuka/viaduto.js";
import { rodaGigante } from "./kit/suzuka/roda-gigante.js";
import { colinas, florestaJaponesa, cerejeiras } from "./kit/suzuka/colinas.js";
import { registrarMarcasSuzuka, torii, lanternas, nobori, estacionamento, hotel, torreDeQueda, carrossel } from "./kit/suzuka/japao.js";

registrarMarcasSuzuka();

const BOXES = { de: 0.972, ate: 1.052, lado: 1, recuo: 84, fundo: 50, alto: 42 };
const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;
const virado = (dx, dz) => Math.atan2(dx, dz); // a rotação em y que põe o +z local apontando para (dx, dz)
// um ponto no mundo: da pista em f, `lat` para o lado (sinal de p.nx) e `ao` ao longo da pista
const em = (tr, f, lat, ao = 0) => { const p = tr.pts[indice(tr, f)]; return { p, x: p.x + p.nx * lat + p.tx * ao, z: p.y + p.ny * lat + p.ty * ao }; };
const reservarFaixa = (tr, f0, f1, lat, raio) => { for (let i = Math.floor(f0 * tr.n); i <= Math.floor(f1 * tr.n); i += 4) { const p = tr.pts[((i % tr.n) + tr.n) % tr.n]; tr.reservado.push([p.x + p.nx * lat, p.y + p.ny * lat, raio]); } };

// o módulo de arquibancada principal, de frente para a pista, apoiado no concreto (o chão desce para longe da pista)
function arquibancadaPrincipal(tr, { add, hAt }, f, comprimento, semente) {
  const { pts, n, W } = tr, lado = -1, lat = lado * (W / 2 + 36), c = em(tr, f, lat), p = c.p;
  const g = tribunaCoberta({
    comprimento, degraus: 11, altura: 5, fundo: 8, secoes: 6, publico: 0.42, semente, alcance: 0.82, folga: 16, vao: 55,
    cores: ["#d62a2a", "#f4f4f2", "#2b4fa8", "#f2c400", "#13804a", "#e873a8"], cobertura: "#f6f6f4", estrutura: "#8a9096",
  });
  const dx = -lado * p.nx, dz = -lado * p.ny, ry = virado(dx, dz), sx = Math.cos(ry) * p.tx - Math.sin(ry) * p.ty > 0 ? 1 : -1; // o +x do módulo anda a favor ou contra a volta?
  const meio = indice(tr, f), pasMeio = Math.round(comprimento / 12), h0 = pts[(meio - sx * pasMeio + n) % n].h, h1 = pts[(meio + sx * pasMeio) % n].h;
  g.rotation.order = "YXZ"; g.rotation.y = ry; g.rotation.z = Math.atan2(h1 - h0, comprimento);
  g.position.set(c.x, p.h, c.z); add(g);
  const prof = g.userData.profundidade, base = new THREE.Mesh(new THREE.BoxGeometry(comprimento + 6, 120, prof + 10), M(0xaaa69c, { roughness: 0.95 }));
  base.position.set(0, -58, -prof / 2); g.add(base); // o aterro de concreto: a arquibancada não flutua onde o chão baixa
  for (let k = -comprimento / 2; k <= comprimento / 2; k += 40) tr.reservado.push([c.x + p.tx * k * sx + p.nx * lado * prof * 0.5, c.z + p.ty * k * sx + p.ny * lado * prof * 0.5, prof * 0.9]);
  (tr.arquibancadas ||= []).push([meio - pasMeio, meio + pasMeio]);
  return g;
}

// a torre de controle em cima do prédio dos boxes e o aterro embaixo dele (a reta desce 45 de um lado ao outro)
function prediosEtorre(tr, { add }) {
  const { pts, n, W } = tr, { de, ate, lado, recuo, fundo, alto } = BOXES, l0 = lado * (W / 2 + recuo), l1 = l0 + lado * fundo;
  prediosDosBoxes(tr, add, {
    ...BOXES, torre: false, paineis: ["suzuka", "honda", "japangp", "pirelli", "rolex", "aramco", "dhl"],
    cores: { parede: "#f4f2ed", friso: "#c8102e", teto: 0xcfd2d6 },
  });
  const rec = recortar(tr, Math.floor(de * n), Math.floor(ate * n), [l0 - lado * 6, l1]); if (!rec) return;
  const concreto = M(0xa9a59b, { roughness: 0.95, side: THREE.DoubleSide });
  for (const l of [l0, l1]) faixa(tr, add, rec.i0, rec.i1, l, l, -90, 0, concreto, 60); // as paredes de baixo, até o chão de lá
  faixa(tr, add, rec.i0, rec.i1, l0, l1, -0.4, -0.4, concreto, 60);
  const meio = Math.floor((rec.i0 + rec.i1) / 2), pm = pts[meio % n];
  const torre = torreControle({ raio: 14, aneis: 4, alturaAnel: 7, corpo: 2, cobertura: "plana", corAneis: "#c8102e", corVidro: "#2a4560", corGrade: "#f2f2f2", corCorpo: "#f4f2ed", corCobertura: "#e8e8ea", bandeira: ["#ffffff", "#bc002d"], corPodio: "#d9d5cb" });
  torre.position.set(pm.x + pm.nx * (l0 + lado * fundo * 0.55), pm.h + alto, pm.y + pm.ny * (l0 + lado * fundo * 0.55)); torre.scale.setScalar(1.25); add(torre);
  tr.reservado.push([torre.position.x, torre.position.z, 60]);
  return torre;
}

// a alameda de entrada: do pórtico até o fim, o eixo é a perpendicular à reta no meio da arquibancada, para fora
function alameda(tr, { add, hAt }) {
  const { n, W } = tr, f0 = 0.0, c0 = em(tr, f0, 0), p = c0.p, sx = -1; // sx: para fora da pista (-lado dos boxes)
  const eixo = (lat, ao = 0) => ({ x: p.x + p.nx * sx * lat + p.tx * ao, z: p.y + p.ny * sx * lat + p.ty * ao });
  const dir = virado(p.nx * sx, p.ny * sx), ang = Math.atan2(p.nx * sx, p.ny * sx);
  void n; void W; void dir;
  // o pórtico de entrada, atravessando a alameda (o letreiro olha para quem chega)
  const por = portico({ vao: 190, alto: 70, viga: 16, cor: "#c8102e", corColuna: "#2a2c31", texto: "SUZUKA CIRCUIT", corTexto: "#ffffff", corFaixa: "#c8102e" });
  let e = eixo(310); por.position.set(e.x, hAt(e.x, e.z) + 1.5, e.z); por.rotation.y = ang; add(por);
  tr.reservado.push([e.x, e.z, 150]);
  // os torii, de 140 em 140: cada um menor que o anterior, para dar profundidade
  const lista = [[420, 1.2], [560, 1.05], [690, 0.95], [810, 0.85]];
  for (const [lat, k] of lista) { e = eixo(lat); const t = torii({ k: k * 1.35 }); t.position.set(e.x, hAt(e.x, e.z) + 1.2, e.z); t.rotation.y = ang; add(t); tr.reservado.push([e.x, e.z, 60]); }
  // lanternas: dois fios compridos, um de cada lado do caminho, e fios cruzando entre os torii
  const trechos = [];
  for (const s of [-1, 1]) { const a = eixo(360, s * 78), b = eixo(860, s * 78); trechos.push([a.x, a.z, b.x, b.z]); }
  for (const lat of [490, 625, 750]) { const a = eixo(lat, -78), b = eixo(lat, 78); trechos.push([a.x, a.z, b.x, b.z]); }
  lanternas(add, trechos, { alto: 62, passo: 15 });
  for (const s of [-1, 1]) for (const lat of [360, 490, 625, 750, 860]) { const q = eixo(lat, s * 78); const pole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 66, 6), M(0x3b3128)); pole.position.set(q.x, hAt(q.x, q.z) + 33, q.z); add(pole); }
  // os estandartes, dos dois lados, de frente para o caminho
  const noboris = [];
  for (let lat = 380; lat <= 840; lat += 40) for (const s of [-1, 1]) { const q = eixo(lat, s * 105); noboris.push([q.x, q.z, virado(p.tx * s * -1, p.ty * s * -1)]); }
  nobori(add, noboris, { hAt });
  // as tendas de hospitalidade, uma de cada lado, de frente para o caminho
  [[430, -1, "鈴鹿 HOSPITALITY", "#c8102e"], [430, 1, "HONDA RACING", "#1d1d21"], [620, -1, "PIRELLI PADDOCK", "#ffd100"], [620, 1, "ROLEX LOUNGE", "#006039"]].forEach(([lat, s, texto, cor], k) => {
    const q = eixo(lat, s * 200), t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa: cor, corTexto: cor === "#ffd100" ? "#111" : "#fff", corMesas: cor });
    t.position.set(q.x, hAt(q.x, q.z) + 1, q.z); t.rotation.y = virado(-s * p.tx, -s * p.ty) + k * 0; add(t); tr.reservado.push([q.x, q.z, 90]);
  });
  tr.alamedaSuzuka = { eixo, ang };
  return eixo;
}

// o parque do circuito, no miolo da volta: o ponto de dentro mais longe da pista (perto do Casio) e tudo a partir dele
function acharParque(tr) {
  let melhor = null;
  // a bolsa aberta entre a Dunlop e a Degner (fora do polígono da volta, cercada pela pista de três lados): o ponto mais longe dela
  for (let x = 3300; x < 3900; x += 40) for (let z = 2900; z < 3500; z += 40) { const d = tr.distAt(x, z); if (!melhor || d > melhor.d) melhor = { x, z, d }; }
  return melhor;
}
function parqueDeDiversoes(tr, ctx) {
  const { add, hAt } = ctx, c = acharParque(tr); if (!c) return null;
  const chao = (x, z) => hAt(x, z) + 1.2;
  const pos = (g, dx, dz, ry) => { const x = c.x + dx, z = c.z + dz; g.position.set(x, chao(x, z), z); g.rotation.y = ry; add(g); return [x, z]; };
  // a roda-gigante: o disco de frente para o norte (o Casio e a reta de trás)
  const roda = rodaGigante({ raio: 175, cabines: 20 });
  const [rx, rz] = pos(roda.grupo, 0, 0, 0); tr.reservado.push([rx, rz, 230]);
  tr.rodaSuzuka = roda;
  // o hotel, atrás da roda, de frente para ela
  const ht = hotel({ largura: 260, andares: 6, profundidade: 80 });
  const [hx, hz] = pos(ht, 40, 240, Math.PI); tr.reservado.push([hx, hz, 170]);
  // a torre de queda e o carrossel
  const [dx, dz] = pos(torreDeQueda({ alto: 260 }), -250, 40, 0); tr.reservado.push([dx, dz, 70]);
  const [cx, cz] = pos(carrossel({ raio: 56 }), 250, 60, 0.6); tr.reservado.push([cx, cz, 80]);
  // o pavilhão em velas na entrada do parque (do lado da pista), com o letreiro
  const pav = velas({ modulos: 4, filas: 2, vao: 44, profundidade: 44, alturaBeiral: 13, alturaPico: 16, mastro: 10, cor: "#f4f2ec" });
  const [vx, vz] = pos(pav, -20, -190, 0); tr.reservado.push([vx, vz, 120]);
  const faixaParque = new THREE.Mesh(new THREE.PlaneGeometry(150, 16), new THREE.MeshBasicMaterial({ map: marcaTex("parque", 1024, 112), side: THREE.DoubleSide }));
  faixaParque.position.set(vx, chao(vx, vz) + 21, vz + 45); add(faixaParque);
  // lanternas entre as atrações
  lanternas(add, [[c.x - 250, c.z + 20, c.x - 20, c.z - 170], [c.x + 250, c.z + 40, c.x + 20, c.z - 170], [c.x - 140, c.z + 110, c.x + 140, c.z + 110]], { alto: 48, passo: 18 });
  tr.parqueSuzuka = { x: c.x, z: c.z, d: c.d };
  return c;
}

// os estacionamentos: nos terrenos planos atrás da arquibancada, dos dois lados da alameda
function estacionamentos(tr, { add, hAt }, eixo) {
  const feitos = [];
  [[560, -560, 0], [560, 520, 1], [900, -330, 2], [900, 360, 3], [1150, 0, 4]].forEach(([lat, ao, k]) => {
    const e = eixo(lat, ao), y = hAt(e.x, e.z);
    if (Math.abs(y) > 8 || !livre(tr, e.x, e.z, 260) || ocupado(tr, e.x, e.z)) return;
    const p = tr.pts[0], ry = virado(p.tx, p.ty) + (k % 2 ? 0 : 0);
    const r = estacionamento(add, { x: e.x, y: y + 0.4, z: e.z, ry }, { filas: 4, vagas: 16, semente: 41 + k * 7 });
    tr.reservado.push([e.x, e.z, Math.hypot(r.largura, r.profundidade) / 2]); feitos.push(r.carros);
  });
  tr.estacionamentosSuzuka = feitos;
}

// cerejeiras pela beira da pista (nos pontos onde o jogo deixa) e em volta do parque e da alameda
function floresDeCerejeira(tr, { hAt }, add, eixo, parque) {
  const r = sorteio(88), lugares = [];
  for (let f = 0; f < 1; f += 0.0065) for (const s of [-1, 1]) if (r() < 0.55) { const lat = s * (tr.W / 2 + 150 + r() * 200), c = em(tr, f, lat, (r() - 0.5) * 40); lugares.push([c.x, c.z, 0.85 + r() * 0.5]); }
  if (eixo) for (let lat = 380; lat <= 860; lat += 55) for (const s of [-1, 1]) lugares.push([eixo(lat, s * 150).x, eixo(lat, s * 150).z, 1 + r() * 0.3]);
  if (parque) for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2 + r() * 0.2, d = 320 + r() * 40; lugares.push([parque.x + Math.cos(a) * d, parque.z + Math.sin(a) * d, 1 + r() * 0.4]); }
  return cerejeiras(tr, add, lugares, { hAt });
}

// o antes: tudo isso, antes dos enfeites soltos
export function cenarioSuzuka(tr, ctx) {
  const { add } = ctx;
  tr.reservado ||= [];
  viaduto(tr, ctx);
  prediosEtorre(tr, ctx);
  for (const [f, comp, sem] of [[0.9835, 330, 5], [1.0085, 330, 9], [1.0335, 330, 13]]) arquibancadaPrincipal(tr, ctx, f % 1, comp, sem);
  const eixo = alameda(tr, ctx);
  estacionamentos(tr, ctx, eixo);
  const parque = parqueDeDiversoes(tr, ctx);
  floresDeCerejeira(tr, ctx, add, eixo, parque);
  // os morros e a floresta, por último (depois de tudo reservado): não avançam sobre o parque nem sobre os estacionamentos
  const p0 = tr.pts[0], vazio = [[p0.x - p0.nx * 800, p0.y - p0.ny * 800, 800]];
  if (parque) vazio.push([parque.x, parque.z, 560]);
  const rel = colinas(tr, add, { vazio });
  florestaJaponesa(tr, add, rel, {});
}

// o depois: a roda gira junto com o resto da vida da pista, e a faixa do circuito no pórtico da largada
export function depoisSuzuka(tr, { add }) {
  const roda = tr.rodaSuzuka, anterior = tr.animarPista;
  if (roda) tr.animarPista = (dt, foco, t) => { anterior?.(dt, foco, t); roda.animar(dt, foco); };
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("suzuka", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(s * 1.7); add(f);
  }
}
