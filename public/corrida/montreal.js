// Montreal (Circuit Gilles-Villeneuve, na ilha Notre-Dame, rio São Lourenço): o que só o circuito tem, em cima do kit 2. O resto (zebras
// vermelhas e brancas, escape, arquibancadas de curva, placas de frenagem, painéis, passarelas, a serra e o som) é do kit, na configuração de
// gps/montreal.js. Aqui, na ordem em que o GP monta:
// 1. a terra e a água: a ilha, o rio em volta, a bacia olímpica de remo ao lado das retas, a ilha Sainte-Hélène (kit/montreal/terra.js);
// 2. a reta dos boxes (um quadro só, com o x ao longo da pista e o z para o lado dos boxes, o oeste): a plataforma de gramado, o prédio dos
//    boxes de 2019 (kit/montreal/predio.js), o paddock atrás (motorhomes, tendas e carretas) e, do outro lado, a arquibancada principal
//    em quatro módulos (kit 2: tribunaCoberta) com a bacia olímpica atrás;
// 3. os muros de concreto com alambrado, os blocos vermelhos e brancos e o Muro dos Campeões ("Bienvenue au Québec") na saída da chicane
//    final (kit/montreal/muros.js);
// 4. o que se vê ao longe: o skyline de Montreal a oeste, a ponte Jacques-Cartier ao norte e o Biosfera na ilha Sainte-Hélène
//    (kit/montreal/cidade.js), e o parque: os bordos, os choupos das margens e as bandeiras do Canadá e do Québec (kit/montreal/parque.js).
// As frações (0 a 1) são da volta, a partir da chegada: reta dos boxes 0,955-0,10 · T1 e T2 (a "Senna") 0,10-0,14 · T3 e T4 0,207-0,232 ·
// T5 0,272-0,292 · T6 e T7 0,327-0,364 · a reta da margem oeste 0,364-0,50 · T8 e T9 0,50-0,53 · o grampo (T10) 0,653-0,678 · a reta do
// Cassino, ao lado da bacia, 0,68-0,93 · a chicane final (T13 e T14) 0,936-0,955 · o Muro dos Campeões 0,95-0,975.
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista na linha de chegada e a faixa fica DE FRENTE para os carros
// (a normal aponta contra o sentido da volta), como em Monza e Suzuka. Tudo é cenário: nada fica dentro da pista (livre/ocupado).
import * as THREE from "three";
import { marcaTex } from "./kit/marcas.js";
import { lotes, instancias, sorteio, sinalDaCurva, livre } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { boxEquipe } from "./kit/box-equipe.js";
import { Montador, solido } from "./kit/montagem.js";
import { registrarMarcasMontreal } from "./kit/montreal/marcas.js";
import { terraMontreal, matRelva, NIVEL } from "./kit/montreal/terra.js";
import { predioDosBoxes2019 } from "./kit/montreal/predio.js";
import { muros, blocos, muroDosCampeoesMontreal, MURO_LAT } from "./kit/montreal/muros.js";
import { skyline, ponteJacquesCartier, biosfera } from "./kit/montreal/cidade.js";
import { bordos, choupos, bandeirasDaTorcida } from "./kit/montreal/parque.js";

registrarMarcasMontreal();

const aoLongo = (p) => Math.atan2(-p.ty, p.tx); // rotation.y que põe o +x do objeto ao longo da pista, a favor da volta
const CAMISAS = ["#d52b1e", "#ffffff", "#d52b1e", "#ffffff", "#1b4f9c", "#111111", "#d52b1e", "#ffd23f", "#f4f4f2", "#c8102e"]; // a torcida: vermelho e branco do Canadá, o azul do Québec
export const CAMISAS_MONTREAL = CAMISAS;
const PREDIO = { lat: 164, comprimento: 640, fundo: 74 }; // a frente do prédio dos boxes fica a 164 da linha central (as garagens do corredor terminam em ~137)

// ---------------------------------------------------------------------------------------------------------------------
// A plataforma de gramado ao lado da reta: o chão natural desce a partir da pista, e o prédio, o paddock e a arquibancada precisam de
// um piso na altura dela. Uma fita de l0 a l1 (só até onde nenhum outro trecho da pista chega), com o pé em rampa e as pontas afinando.
// ---------------------------------------------------------------------------------------------------------------------
function plataforma(tr, add, mat, f0, f1, lado, l0, l1, { pe = 34, rampa = 26 } = {}) {
  const { pts, n } = tr, i0 = Math.floor(f0 * n), i1 = Math.floor((f1 < f0 ? f1 + 1 : f1) * n), vs = [], uv = [], idx = [];
  for (let i = i0; i <= i1; i++) {
    const p = pts[((i % n) + n) % n], k = Math.min(1, (i - i0) / rampa, (i1 - i) / rampa), t = k * k * (3 - 2 * k);
    let L1 = l1; while (L1 > l0 + 24 && tr.distAt(p.x + p.nx * lado * L1, p.y + p.ny * lado * L1) < L1 - 4) L1 -= 30; // não avança sobre outro trecho da pista
    const topo = p.h - 0.45, b = l0 + (L1 - l0) * t, c = b + pe, base = vs.length / 3;
    for (const [l, y] of [[l0, topo], [b, topo], [c, -1.5]]) { vs.push(p.x + p.nx * lado * l, y, p.y + p.ny * lado * l); uv.push((p.x + p.nx * lado * l) / 150, (p.y + p.ny * lado * l) / 150); }
    if (i < i1) for (let j = 0; j < 2; j++) { const a = base + j, q = base + 3 + j; idx.push(a, q, a + 1, a + 1, q, q + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = `${tr.id}-plataforma`; return m;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function reta(tr, { add }) {
  const { pts, n, W } = tr, p = pts[0], r = sorteio(5150), look = tr.look;
  const g = new THREE.Group(); g.name = "montreal-reta"; g.position.set(p.x, p.h, p.y); g.rotation.y = aoLongo(p); add(g);
  const mundo = (x, z) => [p.x + p.tx * x + p.nx * z, p.y + p.ty * x + p.ny * z];
  const reservar = (x, z, raio) => tr.reservado.push([...mundo(x, z), raio]);
  const relva = matRelva(look), flags = [];
  // o piso na altura da pista: o do lado dos boxes (do corredor até o paddock) e o do outro lado, até a bacia (a margem da água é um muro de concreto)
  plataforma(tr, add, relva, 0.962, 0.04, 1, 138, 700);
  const D0 = tr.terraMontreal.bacia.D0, fE = [0.955, 0.075];
  plataforma(tr, add, relva, fE[0], fE[1], -1, 98, D0 - 3, { pe: 6, rampa: 30 });
  {
    const L = lotes(), concreto = new THREE.MeshStandardMaterial({ color: 0xc4c1b8, roughness: 0.95, side: THREE.DoubleSide });
    const i0 = Math.floor(fE[0] * n), i1 = Math.floor((fE[1] + 1) * n);
    for (let i = i0 + 26; i <= i1 - 26; i++) { // o muro da margem da bacia: do piso até a água
      const q = pts[i % n], a = i === i0 + 26;
      const lv = L.de(concreto), base = lv.vs.length / 3, x = q.x - q.nx * (D0 - 1), z = q.y - q.ny * (D0 - 1);
      lv.vs.push(x, q.h - 0.45, z, x, NIVEL - 1.5, z); lv.uv.push(0, 0, 1, 0); if (!a) { lv.idx.push(base - 2, base, base - 1, base - 1, base, base + 1); }
    }
    L.montar(add, `${tr.id}-muro-da-bacia`);
  }
  // o prédio dos boxes de 2019 (a frente olha a pista: vira de costas) e o piso do paddock atrás dele
  const predio = predioDosBoxes2019({ comprimento: PREDIO.comprimento, fundo: PREDIO.fundo });
  predio.position.set(0, -0.3, PREDIO.lat); predio.rotation.y = Math.PI; g.add(predio);
  for (let x = -PREDIO.comprimento / 2; x <= PREDIO.comprimento / 2; x += 60) reservar(x, PREDIO.lat + PREDIO.fundo / 2, 78);
  // a arquibancada principal, do outro lado: quatro módulos de concreto de frente para os boxes, a bacia olímpica atrás
  const zT = -(W / 2 + 36);
  for (let k = 0; k < 4; k++) {
    const t = tribunaCoberta({
      comprimento: 300, degraus: 12, altura: 6, fundo: 8.5, secoes: 6, publico: 0.62, semente: 21 + k * 5, alcance: k % 3 === 0 ? 0.75 : 0.5, folga: 16, vao: 60,
      cores: k % 2 ? ["#d52b1e", "#f4f4f2", "#d52b1e", "#1b4f9c", "#f4f4f2", "#d52b1e"] : ["#f4f4f2", "#d52b1e", "#f4f4f2", "#d52b1e", "#1b4f9c", "#f4f4f2"],
      cobertura: k % 3 === 0 ? "#f6f6f4" : null, estrutura: "#8a9096", camisas: CAMISAS,
    });
    t.position.set((k - 1.5) * 306, -1.2, zT); g.add(t);
    for (let j = 0; j < 7; j++) { // as bandeiras nos degraus de cima
      const u = (k - 1.5) * 306 + (j - 3) * 40 + ((j * 37 + k * 11) % 17) - 8, fila = 5 + ((j * 3 + k) % 6), [fx, fz] = mundo(u, zT - 3 - fila * 8.5);
      flags.push({ x: fx, y: p.h + (fila + 1) * 6 + 5, z: fz, ry: aoLongo(p) + (((j * 13 + k * 7) % 10) - 5) * 0.08, s: 0.9 + ((j + k) % 5) * 0.12 });
    }
  }
  const m = new Montador(), S = solido();
  m.caixa(S, [0, -3.4, zT - 52], [1240, 6, 116], { cor: "#a9a59c" }); // a laje de concreto sob as quatro arquibancadas
  for (const x of [-620, 620]) m.caixa(S, [x, 14, zT - 50], [4, 26, 110], { cor: "#8a9096" }); // as pontas, de aço
  g.add(m.montar("montreal-arquibancada-laje"));
  tr.arquibancadas ||= []; tr.arquibancadas.push([Math.floor(0.9595 * n), n - 1], [0, Math.floor(0.0405 * n)]); // o som da torcida
  for (let x = -620; x <= 620; x += 50) reservar(x, zT - 56, 104);
  // o paddock atrás do prédio: motorhomes, tendas de hospitalidade e as carretas (genéricos: sem marca)
  const z0 = PREDIO.lat + PREDIO.fundo + 8, m2 = new Montador();
  const cores = ["#d52b1e", "#f4f4f2", "#1b4f9c", "#1d7a4a", "#e8a21a", "#3a3d45"], nomes = ["PADDOCK", "ÉQUIPE", "HOSPITALITÉ", "PILOTES", "TECHNIQUE", "MÉDIA"];
  for (let k = 0; k < 5; k++) {
    const b = boxEquipe({ portas: 2, cor: cores[k], texto: nomes[k], corTexto: cores[k] === "#f4f4f2" ? "#111" : "#ffffff", corFaixa: "#15161a", abertura: 0.8, carros: 1, interior: false });
    b.position.set((k - 2) * 190, 0.4, z0 + 26); b.rotation.y = Math.PI; g.add(b);
  }
  [["PADDOCK CLUB", "#d52b1e"], ["JEAN-DRAPEAU", "#0e6b4a"], ["MONTRÉAL", "#1b4f9c"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: corFaixa });
    t.scale.setScalar(1.6); t.position.set((k - 1) * 290, 0.4, z0 + 200); t.rotation.y = Math.PI; g.add(t);
  });
  for (let k = 0; k < 7; k++) { // as carretas, enfileiradas lá no fundo
    const x = (k - 3) * 124, z = z0 + 300, cor = cores[k % cores.length];
    m2.caixa(S, [x, 21, z], [78, 32, 28], { cor: "#eceeef" }); m2.caixa(S, [x, 21, z - 14.3], [78, 10, 0.6], { cor });
    m2.caixa(S, [x + 46, 15, z], [16, 24, 24], { cor }); m2.caixa(S, [x + 50.4, 20, z], [8, 9, 21], { cor: "#26323d" });
    for (const dx of [-26, -10, 36, 48]) for (const s of [-1, 1]) m2.cilindro(S, [x + dx, 6, z + s * 12], [6, 5], { cor: "#1b1b1f", rx: Math.PI / 2, seg: 8 });
  }
  g.add(m2.montar("montreal-paddock-carretas"));
  for (const z of [z0 + 30, z0 + 120, z0 + 210, z0 + 300]) for (let x = -400; x <= 400; x += 160) reservar(x, z, 96);
  tr.retaMontreal = { g, zT, flags, z0 };
  void r;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Os muros de concreto, os blocos vermelhos e brancos e o Muro dos Campeões
// ---------------------------------------------------------------------------------------------------------------------
function paredes(tr, { add }) {
  // lado -1: o leste (fora da volta); lado 1: o oeste (o dos boxes); cada trecho some onde outro pedaço da pista chega perto (o grampo)
  const trechos = [
    { de: 0.955, ate: 0.075, lado: -1 }, { de: 0.7, ate: 0.925, lado: -1 }, { de: 0.715, ate: 0.925, lado: 1 }, // a reta dos boxes (de frente para a arquibancada) e a reta do Cassino
    { de: 0.1, ate: 0.113, lado: 1 }, { de: 0.117, ate: 0.147, lado: -1 }, // T1 e T2 por fora
    { de: 0.15, ate: 0.205, lado: -1 }, { de: 0.236, ate: 0.27, lado: 1 }, { de: 0.296, ate: 0.325, lado: 1 }, // a saída da Senna, T3 e T4, T5
    { de: 0.366, ate: 0.5, lado: 1 }, { de: 0.366, ate: 0.5, lado: -1 }, // a reta da margem oeste, dos dois lados
    { de: 0.532, ate: 0.6, lado: 1 }, { de: 0.532, ate: 0.6, lado: -1 }, { de: 0.612, ate: 0.65, lado: 1 }, // depois de T8 e T9, a subida até o grampo
    { de: 0.68, ate: 0.7, lado: 1 }, { de: 0.68, ate: 0.7, lado: -1 }, // a saída do grampo
    { de: 0.936, ate: 0.952, lado: -1 }, // por dentro da chicane final
  ];
  muros(tr, add, trechos);
  // os blocos vermelhos e brancos: na frente do muro, do lado de fora das curvas (ângulo de entrada), onde os carros mais batem
  blocos(tr, add, [
    { de: 0.118, ate: 0.14, lado: -1 }, { de: 0.208, ate: 0.232, lado: 1 }, { de: 0.327, ate: 0.341, lado: -1 }, { de: 0.346, ate: 0.364, lado: 1 },
    { de: 0.502, ate: 0.512, lado: -1 }, { de: 0.515, ate: 0.53, lado: 1 }, { de: 0.656, ate: 0.676, lado: -1 }, { de: 0.936, ate: 0.945, lado: 1 },
  ]);
  tr.muroDosCampeoes = muroDosCampeoesMontreal(tr, add, 0.953, 0.9745, 0.95);
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. As placas com o nome das curvas e o painel do grampo
// ---------------------------------------------------------------------------------------------------------------------
const CURVAS = [["VIRAGE SENNA", 1, 0.121], ["VIRAGE 3", 3, 0.215], ["VIRAGE 6", 6, 0.336], ["VIRAGE 8", 8, 0.506], ["L'ÉPINGLE", 10, 0.665], ["CHICANE FINALE", 13, 0.944]];
function placasDasCurvas(tr, { add }) {
  const { pts, n, W } = tr, m = new Montador(), S = solido(), vs = [], uv = [], idx = [], ponto = (p, lado, d) => [p.x + p.nx * lado * d, p.y + p.ny * lado * d];
  const atlas = marcaTex("gpcanada", 8, 8); void atlas;
  const tex = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const x = c.getContext("2d");
    CURVAS.forEach(([nome, num], k) => { const cc = k % 4, rr = Math.floor(k / 4), x0 = cc * 256, y0 = rr * 128;
      x.fillStyle = "#f4f4f2"; x.fillRect(x0, y0, 256, 128); x.strokeStyle = "#d52b1e"; x.lineWidth = 6; x.strokeRect(x0 + 4, y0 + 4, 248, 120);
      x.fillStyle = "#d52b1e"; x.fillRect(x0 + 10, y0 + 10, 54, 108); x.fillStyle = "#ffffff"; x.font = "900 44px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(num), x0 + 37, y0 + 66);
      x.fillStyle = "#15161a"; x.font = "900 26px Arial, sans-serif"; x.fillText(nome, x0 + 160, y0 + 66, 176); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  CURVAS.forEach(([, , f], k) => {
    const i = Math.floor(f * n), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) for (const d of [W / 2 + 72, W / 2 + 96]) {
      const [x, z] = ponto(p, lado, d);
      if (tr.distAt(x, z) >= d - 8 && !tr.ocupado?.(x, z) && livre(tr, x, z, d - W / 2 - 4) && !(tr.reservado || []).some(([cx, cy, rr]) => (x - cx) ** 2 + (z - cy) ** 2 < rr * rr)) { escolhido = [lado, x, z]; break; }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = Math.max(tr.chao(x, z) - 1.5, p.h - 1), nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len;
    const w = 96, h = 48, y0 = y + 24, cc = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + cc) / 4, 1 - (rr + 1 - b) / 2); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 12, z + ez * s * (w / 2 - 6)], [2.6, 26, 2.6], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 26]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("montreal-placas-curvas-postes")); tr.placasMontreal = idx.length / 6;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioMontreal(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = CAMISAS; // a torcida solta de vida.js também veste vermelho e branco
  terraMontreal(tr, ctx);
  reta(tr, ctx);
  paredes(tr, ctx);
  placasDasCurvas(tr, ctx);
}

export function depoisMontreal(tr, ctx) {
  const { add } = ctx, T = tr.terraMontreal, C = T.costaCidade;
  // ao longe: o skyline a oeste, a ponte a norte e o Biosfera na ilha Sainte-Hélène
  skyline(tr, add, C, { z0: 1500, z1: 5600, miolo: [2700, 4100] });
  ponteJacquesCartier(tr, add, { de: [800, -2000], ate: [5800, 150] });
  biosfera(tr, add, 2060, 960, 210);
  // o parque: os bordos pela ilha (menos junto da pista), o bosque cerrado da ilha Sainte-Hélène e os choupos das margens
  bordos(tr, add, { caixa: [2000, -300, 5300, 7000], passo: 80, semente: 1976, chance: (x, z, d) => (d < tr.W / 2 + 80 ? 0 : d < 520 ? 0.5 : 0.3), folga: 22 });
  bordos(tr, add, { caixa: [1300, -1900, 2500, 2400], passo: 64, semente: 2024, chance: () => 0.75, altura: [110, 190], coniferas: 0.1, folga: 0 });
  const B = T.bacia, A = B.A, lin = (d) => A.filter((_, k) => k % 3 === 0).map((a) => [a.x + a.ex * d, a.z + a.ez * d]);
  choupos(tr, add, lin(B.LARGURA + 120), { fileiras: 2, entre: 40, semente: 11 }); // a fileira de choupos da outra margem
  choupos(tr, add, lin(-60), { fileiras: 1, passo: 70, semente: 12 }); // e alguns do lado de cá, junto da água
  choupos(tr, add, Array.from({ length: 40 }, (_, k) => [C(1500 + k * 100) - 40, 1500 + k * 100]), { fileiras: 1, passo: 60, semente: 13 }); // o cais do Vieux-Port, do outro lado do rio
  bandeirasDaTorcida(tr, add, tr.retaMontreal?.flags || []);
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const [s, nome] of [[1, "gpcanada"], [-1, "gilles"]]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex(nome, 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(s * 1.7); add(f);
  }
  void instancias;
}
