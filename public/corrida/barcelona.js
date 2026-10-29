// Barcelona (Circuit de Barcelona-Catalunya, Montmeló): o que só o autódromo tem, em cima do kit 2. O resto (zebras vermelhas e brancas, escape de brita
// clara e de asfalto verde, pneus, arquibancadas de curva, painéis, passarelas e som) é do kit, na configuração de gps/barcelona.js. Aqui, na ordem
// em que aparece pela volta:
// 1. a reta dos boxes (um quadro só, com o x ao longo da pista e o z para o lado dos boxes): o prédio dos boxes com a torre de controle de prova, a
//    grande tribuna principal coberta do lado de lá (a asa de alumínio, os camarotes de vidro e os núcleos de concreto), a torre do relógio e o paddock
//    atrás dos boxes (motorhomes, tendas e carretas);
// 2. as tribunas de curva (kit 2: tribunaCoberta) nas encostas de Elf, da curva 3, de Repsol, da Campsa e da La Caixa, em cima do chão que sobe;
// 3. as placas com o nome de cada curva (Elf, Renault, Repsol, Seat, Campsa, La Caixa, Banc Sabadell), só o nome e o número;
// 4. o asfalto vermelho pintado com o nome do circuito por dentro da curva 13, como na foto de cima;
// 5. a Catalunha seca em volta: os pinhais mansos e de alepo, o cipreste, a garrigue, o capim, as serras de conglomerado (Sant Llorenç del Munt e
//    Montserrat) e o Montseny azulado no horizonte, e os povoados do Vallès (kit/barcelona/);
// 6. as bandeiras da Espanha e da Catalunha nos degraus e a faixa "GRAN PREMI D'ESPANYA" no pórtico da largada.
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista na linha de chegada e a faixa fica DE FRENTE para os carros (a normal
// aponta contra o sentido da volta), como a de Monza, Suzuka e Silverstone. Tudo é cenário: nada fica dentro da pista (livre/ocupado) e as peças
// repetidas são InstancedMesh ou uma malha por material.
import * as THREE from "three";
import { canvasTex } from "./cena.js";
import { instancias, lotes, tira, tinta, sorteio, sinalDaCurva, livre, ocupado } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { Montador, solido } from "./kit/montagem.js";
import { tribunaPrincipal, complexoDosBoxes, torreDeCronometragem, motorhome, carretasEm, bandeiraEspanha, bandeiraCatalunya, CAMISAS_ESPANHA } from "./kit/barcelona/pecas.js";
import { vegetacaoMediterranea } from "./kit/barcelona/vegetacao.js";
import { serra, povoados } from "./kit/barcelona/paisagem.js";

export const TORCIDA = CAMISAS_ESPANHA;
const VERMELHO = "#c8102e", AMARELO = "#ffc400", BRANCO = "#f4f3f0";
const ry0 = (p, lado) => Math.atan2(-lado * p.nx, -lado * p.ny); // rotation.y de quem está do lado `lado`, com a frente (+z) virada para a pista
const aoLongo = (p) => Math.atan2(-p.ty, p.tx); // rotation.y que põe o +x do objeto ao longo da pista, a favor da volta
const ponto = (p, lado, d, t = 0) => [p.x + p.nx * lado * d + p.tx * t, p.y + p.ny * lado * d + p.ty * t];
const CORES_EQUIPE = ["#e8002d", "#ff8700", "#27f4d2", "#3671c6", "#229971", "#37bedd", "#ff87bc", "#6692ff"];
const flagsTorcida = []; // { x, y, z, ry, s }: postas por quem monta uma tribuna e desenhadas todas de uma vez em bandeirasTorcida

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
// O quadro da reta: um grupo na linha de chegada, com o +x ao longo da pista (a favor da volta) e o +z para o lado dos boxes. A reta é reta de verdade
// (o rumo é o mesmo de 0,935 a 0,155 da volta), então tudo o que está a menos de uns 900 antes da linha e 2000 depois cabe nele.
function quadroDaReta(tr, add) {
  const p = tr.pts[0], g = new THREE.Group(); g.name = "barcelona-reta";
  g.position.set(p.x, p.h, p.y); g.rotation.y = aoLongo(p); add(g);
  const mundo = (x, z) => [p.x + p.tx * x + p.nx * z, p.y + p.ty * x + p.ny * z];
  const reservar = (x, z, raio) => tr.reservado.push([...mundo(x, z), raio]);
  return { g, p, mundo, reservar };
}

function reta(tr, { add }) {
  const { g, p, mundo, reservar } = quadroDaReta(tr, add), { n, W } = tr;
  const Z = W / 2 + 88, zT = -(W / 2 + 62); // a frente do prédio dos boxes (depois do corredor e das garagens do kit) e a da tribuna principal
  // Onde cada coisa fica ao longo da reta (x = 0 é a linha de chegada, o pórtico). O corredor do jogo (pistas.js, `BOXES.barcelona`: entra 0,9818, para 0,
  // sai 0,0182) é simétrico em volta da linha: a entrada em -252, as 10 garagens centradas nela (a distância entre elas, `passo`, vem do próprio corredor
  // e as portas do prédio têm esse passo, uma por garagem, então coincidem com qualquer número de carros: cada carro usa a garagem `grid % 10`) e a
  // saída em +252. Como em Montmeló, a linha de chegada fica no meio da reta, em frente ao meio do prédio (onde está a torre) e da tribuna.
  const cor = window.F1Regras?.corredor(tr.t, n, W), passo = cor ? cor.gap * 6 : 31.2;
  const xP = 0, compP = Math.round(passo * 30); // o prédio dos boxes, de -468 a 468 (30 portas; a passarela de 0,962 fica em -527, fora dele)
  const xT = 0, comp = 1000; // a tribuna principal, do outro lado: de -500 a 500
  // o prédio dos boxes: as garagens do kit (corredor dos boxes) ficam na frente; atrás delas, as varandas, o clube e a torre de controle
  const predio = complexoDosBoxes({ comprimento: compP, fundo: 62, passoGaragem: passo });
  predio.position.set(xP, -0.3, Z); predio.rotation.y = Math.PI; g.add(predio);
  tr.torreDeControleBCN = { x: xP, z: Z + 62 - 30 };
  // a tribuna principal, do outro lado: a asa de alumínio sobre os dois lances de degraus vermelhos e brancos
  const tribuna = tribunaPrincipal({ comprimento: comp, publico: 0.42 });
  tribuna.position.set(xT, -3, zT); g.add(tribuna);
  const upper = tribuna.userData.fileiras.filter((f) => f.y > 109);
  for (let j = 0; j < 70; j++) { // as bandeiras nos degraus de cima (a Espanha e a Catalunha)
    const f = upper[(j * 7) % upper.length], u = xT - comp / 2 + 20 + ((j * 97) % (comp - 40)), [fx, fz] = mundo(u, zT + f.z);
    flagsTorcida.push({ x: fx, y: p.h - 3 + f.y + 7, z: fz, ry: aoLongo(p) + (((j * 13) % 10) - 5) * 0.06, s: 0.9 + ((j * 3) % 5) * 0.1 });
  }
  tr.arquibancadas ||= []; tr.arquibancadas.push([n - Math.ceil((comp / 2 - xT) / 6), n - 1], [0, Math.floor((xT + comp / 2) / 6)]); // o som da torcida
  for (let x = xT - comp / 2 - 60; x <= xT + comp / 2 + 60; x += 70) for (const z of [zT - 160, zT - 330]) reservar(x, z, 150); // a tribuna e o telhado, até o fundo
  // a torre do relógio, de frente para quem chega, depois do fim do prédio dos boxes
  const torre = torreDeCronometragem({ alto: 170 });
  const xR = xP + compP / 2 + 80; // 80 depois da ponta do prédio
  torre.position.set(xR, -0.3, W / 2 + 36); torre.rotation.y = -Math.PI / 2; g.add(torre); reservar(xR, W / 2 + 36, 44);
  // o paddock atrás do prédio dos boxes: motorhomes, tendas e carretas, reservados para as árvores ficarem de fora
  paddock(tr, g, Z + 62 + 30, xP);
  for (let x = xP - 620; x <= xP + 620; x += 60) reservar(x, Z + 30, 90);
  for (const z of [Z + 140, Z + 250, Z + 360, Z + 470]) for (let x = xP - 580; x <= xP + 580; x += 150) reservar(x, z, 100);
  tr.retaBCN = { g, Z, zT, tribuna, predio, torre };
  return g;
}

function paddock(tr, g, z0, xc) { // xc: o meio do prédio dos boxes, ao longo da reta
  const textos = ["HOSPITALITY", "PADDOCK CLUB", "MEDIA", "EQUIPES", "VIP"], cores = ["#d62a1f", "#ff7a1a", "#2fb8a3", "#1d4fd8", "#13804a"];
  for (let k = 0; k < 5; k++) { // os motorhomes, de costas para o prédio dos boxes (a frente olha para ele)
    const mh = motorhome({ cor: cores[k], texto: textos[k], comprimento: 130 });
    mh.position.set(xc + (k - 2) * 210, 0.4, z0 + 40); mh.rotation.y = Math.PI; g.add(mh);
  }
  [["CATALUNYA", "#c60b1e"], ["MONTMELÓ", "#17325c"], ["VALLÈS", "#1f6f3a"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#c8102e" });
    t.scale.setScalar(1.6); t.position.set(xc + (k - 1) * 300, 0.4, z0 + 220); t.rotation.y = Math.PI; g.add(t);
  });
  const m = new Montador();
  carretasEm(m, xc - 3.5 * 124, z0 + 340, CORES_EQUIPE, 124);
  carretasEm(m, xc - 3.5 * 124, z0 + 420, CORES_EQUIPE.slice().reverse(), 124);
  g.add(m.montar("barcelona-paddock-carretas"));
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. As tribunas de curva, nas encostas
// ---------------------------------------------------------------------------------------------------------------------
// Módulos de tribuna (kit 2: tribunaCoberta) ao longo de uma curva, de frente para a pista, no chão que sobe. `lado`: 1, -1, "fora" ou "dentro"
// da curva (o ápice do trecho decide). Só fica o módulo cujos cantos estão a mais de `recuo - 5` de qualquer trecho da pista e fora do que já está
// ocupado; o pé de cada um desce até o chão mais baixo debaixo dele (e ganha fundação), então a tribuna acompanha a encosta.
function tribunasDeCurva(tr, add, lista) {
  const { pts, n, W } = tr, fund = new Montador(), S = solido(); tr.arquibancadas ||= []; let total = 0;
  const feitas = [], porTrecho = [];
  for (const { f0, f1, lado: ld = "fora", recuo = 116, degraus = 9, cobertura = null, publico = 0.36, semente = 1, comprimento = 168 } of lista) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n); let ap = a;
    for (let i = a; i <= b; i++) if ((pts[i % n].k || 0) > (pts[ap % n].k || 0)) ap = i;
    const lado = ld === 1 || ld === -1 ? ld : (ld === "dentro" ? 1 : -1) * sinalDaCurva(pts, n, ap % n), L = W / 2 + recuo, comp = (b - a) * 6, nm = Math.max(1, Math.round(comp / comprimento)), len = comp / nm;
    const r = sorteio(900 + semente * 31); let feitos = 0;
    for (let k = 0; k < nm; k++) {
      const ic = Math.round(a + ((k + 0.5) * len) / 6), p = pts[ic % n], [x, z] = ponto(p, lado, L);
      // tenta o módulo inteiro e, se ele não cabe (numa curva fechada a corda chega perto da pista), um mais curto e mais baixo
      let ok = null;
      for (const esc of [1, 0.72, 0.5]) for (const dg of [degraus, degraus - 2, degraus - 4]) {
        const lm = len * esc, fm = dg * 8.5 + 22, cantos = [[-lm / 2, 0], [lm / 2, 0], [-lm / 2, fm], [lm / 2, fm], [0, fm], [0, 0]];
        if (!ok && cantos.every(([u, d]) => { const [qx, qz] = ponto(p, lado, L + d, u); return tr.distAt(qx, qz) >= L - 30 && !ocupado(tr, qx, qz); })) ok = { lm, dg, fm, cantos };
      }
      if (!ok) continue;
      const { lm, dg, fm, cantos } = ok;
      const base = Math.min(...cantos.map(([u, d]) => { const [qx, qz] = ponto(p, lado, L + d, u * 0.9); return tr.chao(qx, qz); })) - 4;
      const t = tribunaCoberta({
        comprimento: lm - 8, degraus: dg, altura: 6, fundo: 8.5, secoes: Math.max(3, Math.round(lm / 40)), cores: [VERMELHO, BRANCO, VERMELHO, AMARELO],
        cobertura, estrutura: "#8a9096", publico, semente: 40 + semente * 7 + k, alcance: 0.66, folga: 16, vao: 50, camisas: CAMISAS_ESPANHA,
      });
      t.position.set(x, base, z); t.rotation.y = ry0(p, lado); add(t); total++; feitos++;
      const [gx, gz] = ponto(p, lado, L + fm / 2); fund.caixa(S, [gx, base - 6, gz], [lm - 6, 12, fm], { cor: "#8f8c84", ry: ry0(p, lado) }); // a fundação, debaixo do chão
      for (let j = 0; j < 7; j++) { // as bandeiras nos degraus de cima
        const u = (r() - 0.5) * (lm - 30), fila = 4 + Math.floor(r() * Math.max(1, dg - 4)), [fx, fz] = ponto(p, lado, L + 4 + fila * 8.5, u);
        flagsTorcida.push({ x: fx, y: base + (fila + 1) * 6 + 7, z: fz, ry: aoLongo(p) + (r() - 0.5) * 0.6, s: 0.9 + r() * 0.5 });
      }
      for (let i = ic - Math.floor(lm / 12); i <= ic + Math.floor(lm / 12); i += 3) { const q = pts[((i % n) + n) % n]; feitas.push([q.x + q.nx * lado * (L + fm * 0.5), q.y + q.ny * lado * (L + fm * 0.5), 70]); }
      tr.arquibancadas.push([(ic - Math.floor(lm / 12) + n) % n, (ic + Math.floor(lm / 12)) % n]); // o som da torcida
    }
    porTrecho.push(`${f0}-${f1}: ${feitos}/${nm}`);
  }
  tr.reservado.push(...feitas); // só depois de todas, para uma tribuna não barrar a vizinha
  if (total) add(fund.montar("barcelona-fundacoes"));
  tr.tribunasBCN = { total, porTrecho };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. As placas com o nome de cada curva
// ---------------------------------------------------------------------------------------------------------------------
const CURVAS = [["ELF", 1, 0.162], ["RENAULT", 3, 0.225], ["REPSOL", 4, 0.352], ["SEAT", 5, 0.443], ["CAMPSA", 9, 0.607], ["LA CAIXA", 10, 0.74], ["BANC SABADELL", 12, 0.8], ["", 14, 0.918]];
function placasDasCurvas(tr, { add }) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido();
  const atlas = canvasTex(1024, 512, (x) => {
    CURVAS.forEach(([nome, num], k) => {
      const c = k % 4, rr = Math.floor(k / 4), x0 = c * 256, y0 = rr * 256;
      x.fillStyle = BRANCO; x.fillRect(x0, y0, 256, 256); x.strokeStyle = "#15161a"; x.lineWidth = 8; x.strokeRect(x0 + 5, y0 + 5, 246, 246);
      x.fillStyle = VERMELHO; x.fillRect(x0 + 14, y0 + 14, 228, 20); x.fillStyle = AMARELO; x.fillRect(x0 + 14, y0 + 34, 228, 8);
      x.fillStyle = "#15161a"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "900 150px Arial, sans-serif"; x.fillText(String(num), x0 + 128, y0 + 128, 210);
      x.font = "900 36px Arial, sans-serif"; x.fillText(nome || "CURVA", x0 + 128, y0 + 214, 220);
    });
  }, false);
  CURVAS.forEach(([, , f], k) => {
    const i = Math.floor(f * n), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) {
      for (const d of [W / 2 + 52, W / 2 + 76, W / 2 + 100]) {
        const [x, z] = ponto(p, lado, d);
        if (tr.distAt(x, z) >= d - 8 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z);
    // a placa gira um pouco para quem vem de trás (a frente aponta para a pista e um pouco contra o sentido da corrida)
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len; // (ex, ez): o eixo largo da placa
    const w = 84, h = 84, y0 = y + 30, c = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / 4, 1 - (rr + 1 - b) / 2); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 15, z + ez * s * (w / 2 - 6)], [3, 33, 3], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 28]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("barcelona-placas-curvas-postes"));
  tr.placasBCN = idx.length / 6;
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. O asfalto vermelho com o nome do circuito, por dentro da curva 13
// ---------------------------------------------------------------------------------------------------------------------
function asfaltoVermelho(tr, { add }) {
  const { pts, n, W } = tr, f0 = 0.84, f1 = 0.874, a = Math.floor(f0 * n), b = Math.floor(f1 * n), dentro = sinalDaCurva(pts, n, Math.floor(0.855 * n)), l0 = W / 2 + 8, l1 = l0 + 56;
  const ok = [a, (a + b) >> 1, b].every((i) => { const p = pts[i % n]; return [l0, l1].every((l) => { const [x, z] = ponto(p, dentro, l); return tr.distAt(x, z) >= l - 6; }); });
  if (!ok) return;
  const mat = tinta(canvasTex(128, 512, (x, w, h, rr) => { // u: do lado da pista para dentro; v: ao longo da volta (o texto lê a favor dela)
    x.clearRect(0, 0, w, h); x.fillStyle = "#b5222a"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#0000001a" : "#ffffff14"; x.fillRect(rr() * w, rr() * h, 2, 2); }
    x.fillStyle = "#f4f4f2"; x.fillRect(0, 0, 3, h); x.fillRect(w - 3, 0, 3, h);
    for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) { x.fillStyle = (k + j) % 2 ? "#f4f4f2" : "#b5222a"; x.fillRect(w - 22 + j * 11, h - 11 * (k + 1), 11, 11); } // o xadrez na ponta
    x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillStyle = "#f6f4ee"; x.font = "900 54px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("CIRCUIT DE BARCELONA-CATALUNYA", 0, 0, 470); x.restore();
  }, false), { roughness: 0.85 });
  const L = lotes(); tira(tr, L.de(mat), a, b, dentro * l0, dentro * l1, 0.45, 0.45, 0, 1, 0, 1); L.montar(add, `${tr.id}-asfalto-vermelho`);
  tr.asfaltoVermelhoBCN = { de: f0, ate: f1 };
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. As bandeiras da torcida (a Espanha e a Catalunha)
// ---------------------------------------------------------------------------------------------------------------------
function bandeirasTorcida(tr, { add }) {
  const { pts, n } = tr, r = sorteio(6113), lista = flagsTorcida.slice();
  for (const q of tr.arqDegraus || []) {
    for (let i = q.i0; i <= q.i1; i += 6) {
      if (r() < 0.4) continue;
      const p = pts[i % n], fila = Math.floor(r() * q.degraus), [x, z] = ponto(p, q.lado, Math.abs(q.l0) + 4.5 + fila * 9);
      lista.push({ x, y: p.h + 4 + (fila + 1) * 6 + 3, z, ry: aoLongo(p) + (r() - 0.5) * 0.7, s: 0.8 + r() * 0.5 });
    }
  }
  if (!lista.length) return;
  const hastes = lista.map((o) => ({ x: o.x, y: o.y + 5, z: o.z, sx: 1, sy: 10, sz: 1 }));
  instancias(add, new THREE.CylinderGeometry(0.4, 0.4, 1, 4), new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.8 }), hastes, { sombra: false, nome: `${tr.id}-hastes` });
  const d = new THREE.Object3D(), tipos = [[lista.filter((o, k) => k % 3 !== 2), bandeiraEspanha(), "espanha"], [lista.filter((o, k) => k % 3 === 2), bandeiraCatalunya(), "catalunya"]];
  for (const [l, mapa, nome] of tipos) {
    if (!l.length) continue;
    const flag = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.8, side: THREE.DoubleSide }), l.length));
    l.forEach((o, k) => { d.position.set(o.x + Math.cos(-o.ry) * 4.6 * o.s, o.y + 8.6, o.z + Math.sin(-o.ry) * 4.6 * o.s); d.rotation.set(0, o.ry, (r() - 0.5) * 0.3); d.scale.set(9.2 * o.s, 5.8 * o.s, 1); d.updateMatrix(); flag.setMatrixAt(k, d.matrix); });
    flag.name = `${tr.id}-flags-${nome}`;
  }
  tr.bandeirasBCN = lista.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioBarcelona(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = TORCIDA; // a torcida solta de vida.js também veste vermelho e amarelo
  reta(tr, ctx);
  tribunasDeCurva(tr, ctx.add, [
    { f0: 0.142, f1: 0.188, lado: "fora", recuo: 120, degraus: 10, cobertura: "#f6f6f4", semente: 1 }, // Elf
    { f0: 0.218, f1: 0.262, lado: "dentro", recuo: 120, degraus: 9, cobertura: "#f6f6f4", semente: 2 }, // a curva 3, no meio da curva
    { f0: 0.344, f1: 0.386, lado: "fora", recuo: 116, degraus: 8, cobertura: null, semente: 3 }, // Repsol
    { f0: 0.598, f1: 0.632, lado: "fora", recuo: 116, degraus: 10, cobertura: "#f6f6f4", semente: 4 }, // a Campsa, na encosta
    { f0: 0.722, f1: 0.764, lado: "fora", recuo: 112, degraus: 11, cobertura: "#f6f6f4", semente: 5 }, // La Caixa
  ]);
  placasDasCurvas(tr, ctx);
  asfaltoVermelho(tr, ctx);
}

export function depoisBarcelona(tr, ctx) {
  const { add } = ctx;
  // as serras do horizonte e os povoados do Vallès
  serra(tr, add, { angulo: -2.4, afastamento: 1500, altura: 820, largura: 6600, tipo: "mesa", mato: "#3d5233", rocha: "#b87c55", longe: "#9fb2c2", semente: 1 }); // Sant Llorenç del Munt, a noroeste
  serra(tr, add, { angulo: 3.05, afastamento: 1600, altura: 700, largura: 5600, tipo: "agulhas", mato: "#475c3a", rocha: "#b08461", longe: "#a8b6c4", semente: 2 }); // Montserrat, a oeste
  serra(tr, add, { angulo: -0.75, afastamento: 1900, altura: 640, largura: 7000, tipo: "onda", mato: "#4d6a52", rocha: "#7f93a8", longe: "#a9bccd", semente: 3 }); // o Montseny, a nordeste, azulado
  serra(tr, add, { angulo: 0.7, afastamento: 2100, altura: 300, largura: 7000, tipo: "onda", mato: "#6f8a62", rocha: "#8fa0aa", longe: "#b4c3d0", semente: 4 }); // as colinas do litoral, a sudeste
  povoados(tr, add, { povoados: 4, industriais: 3 });
  vegetacaoMediterranea(tr, add, {});
  bandeirasTorcida(tr, ctx);
  // a faixa do GP no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  const faixa = canvasTex(1024, 64, (x, w, h) => {
    x.fillStyle = "#c60b1e"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffc400"; x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7);
    for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) { x.fillStyle = (k + j) % 2 ? "#f4f4f2" : "#c60b1e"; x.fillRect(14 + k * 9, 14 + j * 18 + (k % 2) * 0, 9, 18); }
    x.fillStyle = "#ffffff"; x.font = "900 36px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("GRAN PREMI D'ESPANYA · CIRCUIT DE BARCELONA-CATALUNYA", w / 2 + 30, h / 2 + 2, w - 130);
  }, false);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: faixa, side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
}
