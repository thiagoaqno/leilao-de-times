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
    scale: 1.5, width: 104, minLap: 14, walls: true, wall: 9, flat: 12, fall: 70,
    // relevo [fração da volta, altura]: sobe a Beau Rivage até o Cassino e desce até o túnel, à beira do mar
    hills: [[0, 10], [0.1, 10], [0.16, 30], [0.21, 55], [0.25, 62], [0.29, 52], [0.34, 38], [0.41, 22], [0.46, 12], [0.56, 8], [0.6, 6], [0.72, 4], [0.8, 5], [0.92, 8], [1, 10]],
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
    scale: 1.5, width: 124, minLap: 13, walls: false, flat: 40, fall: 220,
    // morro da reta dos boxes, descida até o Lago, lombada na Reta Oposta (dá para voar!), o Mergulho e a subida dos boxes
    // (a lombada e a rampa de Tóquio ocupam uma fração menor da volta desde que a pista cresceu 1,5×, para o pulo continuar igual)
    hills: [[0, 70], [0.08, 66], [0.14, 42], [0.2, 30], [0.27, 25], [0.33, 14], [0.34, 30], [0.346, 10], [0.39, 0], [0.45, 0], [0.5, 5], [0.57, 25], [0.62, 35], [0.68, 35], [0.715, 30], [0.735, 30], [0.765, 4], [0.8, 0], [0.84, 6], [0.9, 40], [0.95, 63], [1, 70]],
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
    scale: 1.5, width: 112, minLap: 14, walls: true, wall: 23, flat: 25, fall: 50,
    // via expressa elevada (sobe na avenida, passa lá em cima e desce), uma rampa de pulo e outro viaduto
    hills: [[0, 0], [0.03, 0], [0.12, 60], [0.135, 62], [0.27, 62], [0.33, 30], [0.38, 0], [0.5, 0], [0.525, 0], [0.535, 22], [0.5403, 0], [0.62, 0], [0.7, 0], [0.745, 36], [0.79, 36], [0.86, 0], [1, 0]],
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
  // As duas abaixo vieram de um traçado em curva suave (Catmull-Rom, em metros) feito por outra IA, convertido para
  // este mapa: amostrado a cada ~20 m, encaixado no quadrado de 1600 e com as subidas um pouco exageradas.
  losangeles: {
    name: "Los Angeles", sub: "Pôr do sol no centro: sobe para o viaduto da freeway, desce a alça e passa pela chicane",
    width: 88, minLap: 10, walls: true, wall: 10, flat: 20, fall: 60,
    hills: [[0, 0], [0.046, 6], [0.097, 14], [0.138, 23], [0.179, 29], [0.224, 34], [0.27, 46], [0.321, 57], [0.367, 63], [0.423, 51], [0.48, 40], [0.536, 23], [0.587, 11], [0.638, 6], [0.699, 0], [0.75, 3], [0.791, 9], [0.837, 17], [0.883, 26], [0.929, 17], [0.959, 6], [1, 0]],
    points: [
      [529, 876, 0], [543, 892, 0], [549, 913, 0], [553, 935, 0], [556, 957, 0], [558, 978, 0], [561, 1000, 0], [563, 1022, 0], [567, 1044, 0], [572, 1065, 0], [577, 1086, 0], [581, 1108, 0], [586, 1129, 0], [591, 1151, 0],
      [595, 1172, 0], [601, 1193, 0], [606, 1215, 0], [613, 1235, 0], [621, 1256, 0], [630, 1276, 0], [640, 1295, 0], [652, 1314, 0], [664, 1332, 0], [678, 1349, 0], [692, 1366, 0], [707, 1382, 0], [724, 1396, 0], [741, 1410, 0],
      [759, 1422, 0], [778, 1433, 0], [797, 1443, 0], [818, 1452, 0], [839, 1458, 0], [860, 1464, 0], [882, 1467, 0], [903, 1469, 0], [925, 1470, 0], [947, 1469, 0], [969, 1467, 0], [991, 1464, 0], [1012, 1460, 0], [1034, 1455, 0],
      [1055, 1449, 0], [1076, 1442, 0], [1096, 1433, 0], [1116, 1424, 0], [1135, 1414, 0], [1154, 1403, 0], [1172, 1391, 0], [1190, 1378, 0], [1207, 1364, 0], [1224, 1350, 0], [1240, 1335, 0], [1255, 1319, 0], [1270, 1303, 0], [1284, 1286, 0],
      [1297, 1268, 0], [1309, 1250, 0], [1320, 1231, 0], [1332, 1212, 0], [1342, 1193, 0], [1352, 1174, 0], [1362, 1154, 0], [1372, 1134, 0], [1381, 1115, 0], [1391, 1095, 0], [1400, 1075, 0], [1408, 1055, 0], [1416, 1034, 0], [1423, 1013, 0],
      [1428, 992, 0], [1432, 970, 0], [1435, 949, 0], [1436, 927, 0], [1436, 905, 0], [1434, 883, 0], [1431, 861, 0], [1428, 839, 0], [1424, 818, 0], [1419, 796, 0], [1414, 775, 0], [1408, 754, 0], [1401, 733, 0], [1395, 712, 0],
      [1387, 691, 0], [1379, 671, 0], [1371, 651, 0], [1362, 631, 0], [1352, 611, 0], [1343, 591, 0], [1332, 572, 0], [1321, 553, 0], [1310, 534, 0], [1299, 515, 0], [1287, 497, 0], [1275, 478, 0], [1263, 460, 0], [1250, 442, 0],
      [1237, 425, 0], [1224, 407, 0], [1210, 390, 0], [1196, 374, 0], [1181, 357, 0], [1166, 341, 0], [1150, 326, 0], [1134, 311, 0], [1117, 297, 0], [1100, 283, 0], [1083, 270, 0], [1064, 258, 0], [1046, 246, 0], [1027, 235, 0],
      [1008, 224, 0], [988, 214, 0], [969, 205, 0], [949, 196, 0], [928, 187, 0], [908, 179, 0], [887, 171, 0], [867, 164, 0], [846, 157, 0], [825, 151, 0], [804, 146, 0], [782, 141, 0], [760, 137, 0], [739, 134, 0],
      [717, 132, 0], [695, 131, 0], [673, 130, 0], [651, 130, 0], [629, 130, 0], [607, 131, 0], [585, 133, 0], [564, 136, 0], [542, 139, 0], [520, 143, 0], [499, 147, 0], [478, 153, 0], [457, 160, 0], [437, 168, 0],
      [417, 177, 0], [397, 187, 0], [378, 198, 0], [359, 210, 0], [341, 222, 0], [324, 235, 0], [307, 249, 0], [291, 265, 0], [277, 281, 0], [264, 299, 0], [254, 319, 0], [244, 338, 0], [236, 359, 0], [228, 379, 0],
      [221, 400, 0], [213, 420, 0], [206, 441, 0], [199, 462, 0], [192, 483, 0], [186, 504, 0], [181, 525, 0], [176, 547, 0], [172, 568, 0], [169, 590, 0], [166, 612, 0], [165, 634, 0], [164, 655, 0], [164, 677, 0],
      [165, 699, 0], [167, 721, 0], [169, 743, 0], [173, 765, 0], [177, 786, 0], [182, 808, 0], [188, 829, 0], [194, 850, 0], [201, 871, 0], [208, 891, 0], [216, 912, 0], [225, 932, 0], [235, 951, 0], [246, 970, 0],
      [260, 987, 0], [279, 998, 0], [301, 998, 0], [321, 990, 0], [340, 980, 0], [359, 969, 0], [379, 959, 0], [398, 948, 0], [416, 936, 0], [434, 923, 0], [451, 909, 0], [469, 897, 0], [487, 885, 0], [507, 876, 0],
    ],
  },
  rio: {
    name: "Rio de Janeiro", sub: "Reta da orla de Copacabana, subida pela mata até o mirante e descida pelos Arcos da Lapa",
    width: 80, minLap: 10, walls: true, wall: 10, flat: 30, fall: 120,
    hills: [[0, 0], [0.067, 0], [0.144, 2], [0.211, 4], [0.263, 7], [0.314, 12], [0.371, 17], [0.428, 26], [0.49, 38], [0.546, 55], [0.603, 70], [0.66, 75], [0.711, 61], [0.758, 41], [0.804, 24], [0.845, 12], [0.892, 6], [0.928, 3], [0.959, 0], [1, 0]],
    points: [
      [347, 530, 0], [358, 548, 0], [367, 568, 0], [374, 588, 0], [380, 608, 0], [386, 629, 0], [391, 650, 0], [396, 670, 0], [401, 691, 0], [406, 712, 0], [411, 733, 0], [417, 753, 0], [423, 774, 0], [429, 794, 0],
      [436, 814, 0], [443, 834, 0], [450, 854, 0], [457, 875, 0], [465, 895, 0], [472, 915, 0], [479, 935, 0], [487, 955, 0], [494, 975, 0], [502, 995, 0], [510, 1014, 0], [518, 1034, 0], [527, 1054, 0], [536, 1073, 0],
      [545, 1092, 0], [554, 1112, 0], [564, 1130, 0], [574, 1149, 0], [585, 1168, 0], [595, 1186, 0], [606, 1205, 0], [618, 1223, 0], [629, 1241, 0], [641, 1258, 0], [654, 1276, 0], [666, 1293, 0], [680, 1310, 0], [694, 1326, 0],
      [708, 1342, 0], [723, 1357, 0], [739, 1371, 0], [755, 1385, 0], [772, 1398, 0], [790, 1410, 0], [808, 1421, 0], [827, 1431, 0], [846, 1439, 0], [867, 1447, 0], [887, 1453, 0], [908, 1458, 0], [928, 1463, 0], [950, 1466, 0],
      [971, 1468, 0], [992, 1470, 0], [1013, 1470, 0], [1035, 1469, 0], [1056, 1466, 0], [1077, 1462, 0], [1098, 1457, 0], [1118, 1450, 0], [1137, 1442, 0], [1157, 1432, 0], [1175, 1422, 0], [1194, 1411, 0], [1212, 1400, 0], [1229, 1387, 0],
      [1246, 1374, 0], [1262, 1360, 0], [1278, 1346, 0], [1293, 1331, 0], [1307, 1315, 0], [1321, 1299, 0], [1334, 1282, 0], [1346, 1264, 0], [1358, 1247, 0], [1369, 1228, 0], [1380, 1210, 0], [1390, 1191, 0], [1400, 1172, 0], [1409, 1153, 0],
      [1417, 1133, 0], [1425, 1113, 0], [1433, 1094, 0], [1440, 1073, 0], [1447, 1053, 0], [1453, 1033, 0], [1458, 1012, 0], [1462, 991, 0], [1466, 970, 0], [1468, 949, 0], [1470, 927, 0], [1470, 906, 0], [1469, 885, 0], [1467, 864, 0],
      [1464, 843, 0], [1460, 822, 0], [1455, 801, 0], [1449, 780, 0], [1443, 760, 0], [1436, 740, 0], [1428, 720, 0], [1420, 700, 0], [1412, 680, 0], [1403, 661, 0], [1393, 642, 0], [1383, 623, 0], [1372, 605, 0], [1360, 587, 0],
      [1348, 570, 0], [1336, 552, 0], [1323, 535, 0], [1310, 518, 0], [1297, 502, 0], [1283, 485, 0], [1269, 469, 0], [1255, 453, 0], [1240, 438, 0], [1224, 423, 0], [1209, 409, 0], [1193, 395, 0], [1176, 381, 0], [1160, 367, 0],
      [1143, 354, 0], [1126, 341, 0], [1109, 328, 0], [1092, 315, 0], [1075, 303, 0], [1057, 291, 0], [1040, 279, 0], [1022, 267, 0], [1004, 256, 0], [985, 245, 0], [967, 234, 0], [948, 224, 0], [929, 214, 0], [910, 205, 0],
      [891, 196, 0], [871, 187, 0], [851, 180, 0], [831, 172, 0], [811, 165, 0], [791, 159, 0], [770, 153, 0], [750, 148, 0], [729, 144, 0], [708, 140, 0], [687, 137, 0], [666, 134, 0], [644, 132, 0], [623, 131, 0],
      [602, 130, 0], [581, 130, 0], [559, 131, 0], [538, 132, 0], [517, 135, 0], [496, 138, 0], [475, 142, 0], [454, 147, 0], [433, 152, 0], [413, 159, 0], [393, 165, 0], [373, 173, 0], [353, 180, 0], [333, 189, 0],
      [314, 197, 0], [294, 207, 0], [276, 217, 0], [257, 228, 0], [240, 240, 0], [223, 253, 0], [207, 268, 0], [192, 283, 0], [178, 298, 0], [164, 315, 0], [152, 332, 0], [141, 351, 0], [133, 370, 0], [130, 391, 0],
      [135, 412, 0], [145, 431, 0], [158, 447, 0], [174, 462, 0], [190, 475, 0], [209, 486, 0], [230, 491, 0], [251, 493, 0], [272, 495, 0], [293, 498, 0], [314, 504, 0], [332, 515, 0],
    ],
  },
};

// Pistas ampliadas: os vértices (e os raios) foram desenhados no quadrado de 1600 e são multiplicados por `scale`,
// e o mundo dessa pista cresce junto (t.world). Los Angeles e Rio continuam do tamanho original.
for (const t of Object.values(PISTAS)) {
  const s = t.scale || 1;
  t.scale = s; t.world = WORLD * s;
  if (s !== 1) t.points = t.points.map(([x, y, r]) => [x * s, y * s, (r || 0) * s]);
}

// Os cinco carros esportivos (os ids continuam os antigos, para as salas e o servidor). vmax: velocidade final no asfalto · acc: aceleração na arrancada (ela cai perto da velocidade
// final: a = acc·(1 − 0,8·(v/vmax)^1,6), então leva de 4 a 8 segundos para chegar no topo) · brake: freio · grip: quanto o pneu segura
// de lado (acima disso o carro escorrega para fora da curva) · turn: quanto o volante gira · scrub: quanto perde de
// velocidade escorregando · kin: quanto do grip sobra depois que começa a escorregar (pneu saturado) · offMax: velocidade máxima fora do asfalto · wall: quanto da velocidade sobra numa batida.
// Em todos, o "limite de curva" (grip ÷ turn) fica abaixo da velocidade final: em curva fechada, tem que frear.
const CARROS = {
  equilibrado: { name: "Samurai GT", inspo: "inspirado no Skyline GT-R R34", desc: "Cupê japonês de tração integral: faz tudo direitinho. Bom para começar.", vmax: 295, acc: 82, brake: 470, grip: 470, kin: 0.7, turn: 2.4, scrub: 0.9, offMax: 95, wall: 0.55 },
  foguete: { name: "Raio V12", inspo: "superesportivo italiano em cunha", desc: "O mais rápido na reta, mas chega embalado demais nas curvas.", vmax: 360, acc: 74, brake: 430, grip: 420, kin: 0.65, turn: 2.2, scrub: 1.1, offMax: 85, wall: 0.45 },
  formiga: { name: "Pimentinha", inspo: "hatch esportivo tipo Golf GTI e Mini", desc: "Arranca forte e vira em qualquer canto. Na reta, fica para trás.", vmax: 236, acc: 110, brake: 520, grip: 490, kin: 0.68, turn: 2.75, scrub: 0.8, offMax: 100, wall: 0.6 },
  drifteiro: { name: "Oito-Seis", inspo: "o AE86 dos filmes de drift", desc: "Escorrega fácil, mas quase não perde velocidade de lado. Para quem gosta de derrapar.", vmax: 305, acc: 85, brake: 450, grip: 380, kin: 0.88, turn: 3.0, scrub: 0.35, offMax: 90, wall: 0.5 },
  tanque: { name: "Muscle 69", inspo: "muscle car americano tipo Mustang e Charger", desc: "Pesado: demora a embalar, mas bate no muro e passa pela grama sem sofrer tanto.", vmax: 315, acc: 58, brake: 400, grip: 500, kin: 0.7, turn: 2.0, scrub: 0.9, offMax: 140, wall: 0.8 },
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

// altura de cada ponto da pista: entre dois pontos do relevo, sobe ou desce em curva suave (cosseno)
function elevate(pts, hills, step = 6) {
  const L = pts.length * step;
  for (const p of pts) {
    const f = p.d / L; let k = 0;
    while (k < hills.length - 2 && hills[k + 1][0] <= f) k++;
    const [f0, h0] = hills[k], [f1, h1] = hills[k + 1], t = Math.max(0, Math.min(1, (f - f0) / (f1 - f0 || 1)));
    p.h = h0 + (h1 - h0) * (1 - Math.cos(Math.PI * t)) / 2;
  }
  return pts;
}

// personalização leve: cor das rodas, aerofólio e faixas
const MODS = {
  rodas: { prata: { name: "Prata", c: "#c3c7cf" }, preta: { name: "Pretas", c: "#1f2026" }, ouro: { name: "Douradas", c: "#d4a017" }, bronze: { name: "Bronze", c: "#9a5a2a" } },
  aero: { nenhum: "Sem", baixo: "Baixo", alto: "Alto" },
  faixa: { nenhuma: "Sem", dupla: "Dupla", lateral: "Lateral" },
};
const MODS_PADRAO = { rodas: "prata", aero: "nenhum", faixa: "nenhuma" };

const SECTORS = 4; // a volta só conta passando pelos 4 setores na ordem (contra atalho e contramão)

const api = { WORLD, PISTAS, CARROS, MODS, MODS_PADRAO, sample, elevate, SECTORS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Pistas = api;
})(typeof window !== "undefined" ? window : globalThis);
