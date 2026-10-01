// Corrida da Galera — as três pistas e os cinco carros.
// Cada pista é um polígono fechado de vértices [x, y, raio]: entre os vértices a pista é reta, e em cada vértice
// vira uma curva com aquele raio exato (raio 0 = só um ponto de passagem numa reta). Assim dá para desenhar reta
// longa seguida de grampo, curva de 90° e chicane, e saber em que velocidade cada curva obriga a frear.
// Mundo de 1600 × 1600 unidades. Usado pelo navegador (desenho e física) e pelo servidor (validação).
(function (root) {

const WORLD = 1600;

const PISTAS = {
  monaco: {
    name: "Mônaco", sub: "Estreita e travada: Sainte Dévote, o grampo do Grand Hotel, a chicane do porto e a piscina",
    width: 72, minLap: 10, walls: true,
    points: [
      [700, 700, 0],                         // reta dos boxes (para a direita), com o porto embaixo
      [1200, 700, 55],                       // Sainte Dévote
      [1260, 400, 160],                      // subida da Beau Rivage
      [1050, 260, 90],                       // Massenet
      [860, 270, 70],                        // Cassino
      [760, 420, 45],                        // Mirabeau
      [740, 560, 32], [620, 560, 32],        // grampo do Grand Hotel
      [600, 440, 60],
      [380, 330, 70],                        // Portier
      [270, 560, 200], [290, 1050, 150],     // túnel, colado no mar
      [450, 1170, 60], [600, 1175, 0], [680, 1120, 30], [760, 1175, 30], // chicane do porto
      [1000, 1180, 80],                      // Tabac
      [1130, 1060, 40], [1080, 960, 40],     // piscina
      [1100, 880, 45], [480, 880, 60],       // Rascasse
      [460, 700, 55],                        // Anthony Noghes
    ],
  },
  interlagos: {
    name: "Interlagos", sub: "Reta dos boxes longa, S do Senna fechado, Reta Oposta e o Bico de Pato",
    width: 86, minLap: 9, walls: false,
    points: [
      [820, 1285, 0],                        // reta dos boxes (para a esquerda)
      [380, 1270, 55], [330, 1080, 45],      // S do Senna
      [430, 960, 50],
      [380, 700, 140],                       // Curva do Sol
      [560, 280, 120],                       // fim da Reta Oposta: Descida do Lago
      [800, 200, 70],
      [930, 420, 60],                        // Ferradura
      [760, 600, 50],                        // Laranjinha
      [600, 610, 40], [640, 800, 35],        // Pinheirinho
      [880, 820, 30],                        // Bico de Pato
      [1000, 680, 60],                       // Mergulho
      [1180, 880, 120],                      // Junção
      [1260, 1150, 140],                     // subida dos boxes
    ],
  },
  tokyo: {
    name: "Tóquio", sub: "Quarteirões de neon com esquinas de 90°: freia, vira, acelera",
    width: 80, minLap: 10, walls: true,
    points: [
      [700, 1320, 0],                        // avenida principal (para a direita)
      [1340, 1320, 60],
      [1340, 880, 55],
      [1060, 880, 45],
      [1060, 560, 45],
      [1380, 560, 40],
      [1380, 230, 70],
      [720, 230, 50],
      [720, 420, 40],                        // Shibuya
      [460, 420, 45],
      [460, 700, 35],
      [220, 700, 60],
      [220, 1320, 70],
    ],
  },
};

// Os cinco carros. vmax: velocidade final no asfalto · acc: aceleração na arrancada (ela cai perto da velocidade
// final: a = acc·(1 − 0,8·(v/vmax)^1,6), então leva de 4 a 8 segundos para chegar no topo) · brake: freio · grip: quanto o pneu segura
// de lado (acima disso o carro escorrega para fora da curva) · turn: quanto o volante gira · scrub: quanto perde de
// velocidade escorregando · kin: quanto do grip sobra depois que começa a escorregar (pneu saturado) · offMax: velocidade máxima fora do asfalto · wall: quanto da velocidade sobra numa batida.
// Em todos, o "limite de curva" (grip ÷ turn) fica abaixo da velocidade final: em curva fechada, tem que frear.
const CARROS = {
  equilibrado: { name: "Pé no Chão", desc: "Faz tudo direitinho. Bom para começar.", vmax: 295, acc: 82, brake: 470, grip: 470, kin: 0.7, turn: 2.4, scrub: 0.9, offMax: 95, wall: 0.55 },
  foguete: { name: "Foguete", desc: "O mais rápido na reta, mas chega embalado demais nas curvas.", vmax: 360, acc: 74, brake: 430, grip: 420, kin: 0.65, turn: 2.2, scrub: 1.1, offMax: 85, wall: 0.45 },
  formiga: { name: "Formiguinha", desc: "Arranca forte e vira em qualquer canto. Na reta, fica para trás.", vmax: 236, acc: 110, brake: 520, grip: 490, kin: 0.68, turn: 2.75, scrub: 0.8, offMax: 100, wall: 0.6 },
  drifteiro: { name: "Drifteiro", desc: "Escorrega fácil, mas quase não perde velocidade de lado. Para quem gosta de derrapar.", vmax: 305, acc: 85, brake: 450, grip: 380, kin: 0.88, turn: 3.0, scrub: 0.35, offMax: 90, wall: 0.5 },
  tanque: { name: "Tanque", desc: "Pesado: demora a embalar, mas bate no muro e passa pela grama sem sofrer tanto.", vmax: 315, acc: 58, brake: 400, grip: 500, kin: 0.7, turn: 2.0, scrub: 0.9, offMax: 140, wall: 0.8 },
};

// Pista a partir dos vértices: retas + curvas de raio fixo, amostrada a cada `step` unidades.
// Devolve [{x, y, d, tx, ty, k}] (k = curvatura: 1/raio, 0 na reta). O primeiro ponto é a linha de chegada.
function sample(points, step = 6) {
  const n = points.length, P = points.map((p) => ({ x: p[0], y: p[1], r: p[2] || 0 }));
  // para cada vértice: onde a curva começa e termina (o raio encolhe se não couber entre os vizinhos)
  const corners = P.map((v, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    const l1 = Math.hypot(v.x - a.x, v.y - a.y), l2 = Math.hypot(b.x - v.x, b.y - v.y);
    const d1 = { x: (v.x - a.x) / l1, y: (v.y - a.y) / l1 }, d2 = { x: (b.x - v.x) / l2, y: (b.y - v.y) / l2 };
    const cross = d1.x * d2.y - d1.y * d2.x, dot = d1.x * d2.x + d1.y * d2.y, th = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (!v.r || th < 1e-3) return { e: v, x: v, arc: null };
    let r = v.r, t = r * Math.tan(th / 2);
    const tmax = Math.min(l1, l2) * 0.49; if (t > tmax) { t = tmax; r = t / Math.tan(th / 2); }
    const s = cross > 0 ? 1 : -1, e = { x: v.x - d1.x * t, y: v.y - d1.y * t }, x = { x: v.x + d2.x * t, y: v.y + d2.y * t };
    const c = { x: e.x - d1.y * s * r, y: e.y + d1.x * s * r };
    return { e, x, arc: { c, r, a0: Math.atan2(e.y - c.y, e.x - c.x), sweep: s * th } };
  });
  // contorno bem fino (pontos de 1 em 1 unidade, mais ou menos), com a curvatura de cada trecho
  const raw = [];
  for (let i = 0; i < n; i++) {
    const cn = corners[i], nx = corners[(i + 1) % n];
    if (cn.arc) { const m = Math.max(2, Math.ceil(Math.abs(cn.arc.sweep) * cn.arc.r)); for (let k = 0; k < m; k++) { const a = cn.arc.a0 + (cn.arc.sweep * k) / m; raw.push([cn.arc.c.x + Math.cos(a) * cn.arc.r, cn.arc.c.y + Math.sin(a) * cn.arc.r, 1 / cn.arc.r]); } }
    const from = cn.x, to = nx.e, len = Math.hypot(to.x - from.x, to.y - from.y), m = Math.max(1, Math.ceil(len));
    for (let k = 0; k < m; k++) raw.push([from.x + ((to.x - from.x) * k) / m, from.y + ((to.y - from.y) * k) / m, 0]);
  }
  // reamostra com passo constante
  const out = []; let acc = 0, prev = raw[0];
  out.push({ x: prev[0], y: prev[1], k: prev[2] });
  for (let i = 1; i <= raw.length; i++) {
    const cur = raw[i % raw.length];
    let seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    while (acc + seg >= step) {
      const t = (step - acc) / seg, x = prev[0] + (cur[0] - prev[0]) * t, y = prev[1] + (cur[1] - prev[1]) * t;
      out.push({ x, y, k: cur[2] });
      prev = [x, y, cur[2]]; seg = Math.hypot(cur[0] - x, cur[1] - y); acc = 0;
    }
    acc += seg; prev = cur;
  }
  if (Math.hypot(out[out.length - 1].x - out[0].x, out[out.length - 1].y - out[0].y) < step * 0.5) out.pop();
  out.forEach((p, i) => { p.d = i * step; const q = out[(i + 1) % out.length], r = out[(i - 1 + out.length) % out.length]; const dx = q.x - r.x, dy = q.y - r.y, l = Math.hypot(dx, dy) || 1; p.tx = dx / l; p.ty = dy / l; });
  return out;
}

const SECTORS = 4; // a volta só conta passando pelos 4 setores na ordem (contra atalho e contramão)

const api = { WORLD, PISTAS, CARROS, sample, SECTORS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Pistas = api;
})(typeof window !== "undefined" ? window : globalThis);
