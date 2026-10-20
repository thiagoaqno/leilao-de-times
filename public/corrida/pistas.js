// Corrida da Galera — pistas e carros compartilhados pelo servidor e navegador.
// Cada pista é um polígono fechado de vértices [x, y, raio]: entre os vértices a pista é reta, e em cada vértice
// vira uma curva com aquele raio exato (raio 0 = só um ponto de passagem numa reta). Assim dá para desenhar reta
// longa seguida de grampo, curva de 90° e chicane, e saber em que velocidade cada curva obriga a frear.
// Mundo de 1600 × 1600 unidades. Usado pelo navegador (desenho e física) e pelo servidor (validação).
(function (root) {

const WORLD = 1600;

const PISTAS = {
  monaco: {
    name: "Mônaco", sub: "Estreita e travada: Sainte Dévote, a subida até o Cassino, dois grampos, o túnel, a chicane do porto, a piscina e a Rascasse",
    scale: 2.4, width: 104, minLap: 25, walls: true, wall: 9, flat: 12, fall: 70,
    // relevo: sobe a Beau Rivage até o Cassino, desce pelos grampos até o túnel e fica à beira do mar até a Rascasse
    hills: [[0, 10], [0.1, 10], [0.14, 30], [0.2, 62], [0.25, 85], [0.29, 88], [0.33, 74], [0.38, 58], [0.42, 38], [0.47, 24], [0.53, 12], [0.57, 8], [0.61, 6], [0.7, 4], [0.8, 4], [0.9, 6], [1, 10]],
    points: [
      [620, 700, 0], // reta dos boxes (para a direita), com o porto embaixo
      [1180, 700, 50], // Sainte Dévote
      [1230, 560, 0],
      [1330, 330, 150], // subida da Beau Rivage
      [1240, 170, 80], // Massenet
      [1050, 140, 60],
      [930, 230, 45], // Cassino
      [1000, 330, 40],
      [880, 420, 35], // Mirabeau
      [760, 380, 30],
      [700, 470, 28], // grampo do Grand Hotel
      [600, 500, 28],
      [560, 380, 40], // segundo grampo
      [430, 330, 60], // Portier
      [300, 420, 90],
      [200, 620, 150], // túnel, colado no mar
      [230, 1050, 180],
      [380, 1190, 60], // saída do túnel
      [520, 1170, 0],
      [580, 1215, 25], // chicane do porto
      [650, 1165, 25],
      [900, 1175, 0],
      [1080, 1180, 70], // Tabac
      [1200, 1100, 40],
      [1160, 1000, 35], // piscina
      [1240, 930, 35],
      [1180, 860, 40],
      [700, 860, 0],
      [470, 860, 55], // Rascasse
      [440, 760, 45], // Anthony Noghes
      [520, 700, 40],
    ],
  },
  interlagos: {
    name: "Interlagos", sub: "Reta dos boxes no morro, S do Senna, Curva do Sol, Reta Oposta com lombada, Lago, Ferradura, Pinheirinho, Bico de Pato e Mergulho",
    scale: 2.72, width: 124, minLap: 25, walls: false, flat: 40, fall: 220,
    // relevo: morro da reta dos boxes, descida até o Lago com a lombada na Reta Oposta (dá para voar!), sobe até o Pinheirinho, o Mergulho e a subida dos boxes
    hills: [[0, 95], [0.08, 92], [0.14, 70], [0.2, 55], [0.26, 45], [0.3, 30], [0.307, 52], [0.313, 22], [0.36, 10], [0.4, 0], [0.47, 4], [0.53, 22], [0.59, 34], [0.66, 46], [0.73, 42], [0.77, 38], [0.82, 12], [0.86, 15], [0.93, 60], [1, 95]],
    points: [
      [900, 1300, 0], // reta dos boxes (para a esquerda)
      [380, 1300, 60], // S do Senna
      [300, 1150, 45],
      [420, 1040, 45],
      [350, 900, 70],
      [300, 640, 160], // Curva do Sol e Reta Oposta
      [520, 180, 90], // Descida do Lago
      [700, 120, 60],
      [860, 230, 55],
      [1000, 180, 50],
      [1180, 300, 70],
      [1120, 480, 50], // Ferradura
      [960, 520, 45],
      [900, 640, 40], // Laranjinha
      [700, 620, 40],
      [620, 760, 35], // Pinheirinho
      [760, 880, 35],
      [900, 800, 30], // Bico de Pato
      [1040, 900, 50],
      [1000, 1050, 45], // Mergulho
      [1220, 1060, 90], // Junção
      [1350, 1200, 140], // subida dos boxes
      [1250, 1300, 100],
    ],
  },
  tokyo: {
    name: "Tóquio", sub: "Doze quarteirões de neon com esquinas de 90°, via expressa elevada, rampa de pulo e viaduto",
    scale: 2.01, width: 112, minLap: 25, walls: true, wall: 23, flat: 25, fall: 50,
    // relevo: via expressa elevada (sobe na avenida, passa lá em cima e desce), uma rampa de pulo e outro viaduto
    hills: [[0, 0], [0.04, 0], [0.12, 40], [0.16, 70], [0.33, 70], [0.4, 0], [0.43, 0], [0.44, 26], [0.4455, 0], [0.6, 0], [0.65, 40], [0.73, 40], [0.8, 0], [1, 0]],
    points: [
      [700, 1360, 0], // avenida principal (para a direita)
      [1360, 1360, 60],
      [1360, 1080, 50],
      [1160, 1080, 45],
      [1160, 900, 45],
      [1420, 900, 50],
      [1420, 560, 60],
      [1200, 560, 45],
      [1200, 380, 45],
      [1440, 380, 55],
      [1440, 160, 60],
      [1000, 160, 50],
      [1000, 330, 40],
      [760, 330, 40],
      [760, 160, 45],
      [420, 160, 55],
      [420, 420, 40], // Shibuya
      [600, 420, 35],
      [600, 640, 40],
      [300, 640, 45],
      [300, 860, 40],
      [560, 860, 40],
      [560, 1080, 45],
      [180, 1080, 60],
      [180, 1360, 70],
    ],
  },
  losangeles: {
    name: "Los Angeles", sub: "Freeway larga ao pôr do sol subindo para o viaduto, a alça de saída, os quarteirões do centro e a chicane",
    scale: 2.7, width: 88, minLap: 25, walls: true, wall: 10, flat: 20, fall: 60,
    // relevo: a freeway sobe até o viaduto, desce na alça para o centro e a chicane fecha a volta lá embaixo
    hills: [[0, 0], [0.06, 8], [0.14, 30], [0.22, 62], [0.3, 80], [0.36, 70], [0.44, 12], [0.5, 8], [0.6, 14], [0.7, 8], [0.76, 20], [0.82, 34], [0.88, 22], [0.95, 6], [1, 0]],
    points: [
      [500, 900, 0],
      [560, 1300, 150], // freeway
      [900, 1460, 200],
      [1300, 1380, 180],
      [1460, 1000, 160],
      [1380, 640, 120],
      [1180, 560, 60], // alça de saída
      [1180, 420, 50], // centro
      [1400, 420, 50],
      [1400, 200, 60],
      [1000, 180, 60],
      [1000, 380, 45],
      [800, 380, 45],
      [800, 180, 55],
      [420, 180, 90],
      [260, 380, 90],
      [400, 560, 60], // chicane
      [300, 680, 50],
      [420, 780, 50],
    ],
  },
  rio: {
    name: "Rio de Janeiro", sub: "Orla de Copacabana, o vale, as curvas da mata até o mirante e a descida pelos Arcos da Lapa",
    scale: 2.48, width: 104, minLap: 25, walls: true, wall: 12, flat: 32, fall: 140,
    // relevo: orla no nível do mar, sobe pela mata até o mirante e desce pela Lapa
    hills: [[0, 3], [0.19, 3], [0.25, 6], [0.33, 10], [0.4, 30], [0.47, 52], [0.54, 75], [0.6, 100], [0.66, 112], [0.72, 90], [0.79, 60], [0.86, 34], [0.92, 12], [0.97, 3], [1, 3]],
    points: [
      [390, 300, 0], // orla de Copacabana (para baixo)
      [385, 700, 0],
      [390, 1100, 0],
      [420, 1320, 100], // fim da orla
      [640, 1440, 90],
      [900, 1400, 80],
      [1000, 1250, 60], // vale
      [1180, 1300, 60],
      [1380, 1180, 90],
      [1300, 980, 60], // mata
      [1120, 1020, 45],
      [1020, 880, 45],
      [1120, 740, 45],
      [1340, 760, 55],
      [1440, 560, 80], // mirante
      [1300, 360, 70],
      [1420, 200, 70],
      [1180, 120, 80],
      [960, 240, 60],
      [1000, 440, 45],
      [820, 560, 50],
      [640, 480, 50], // Lapa
      [700, 300, 60],
      [540, 160, 70],
    ],
  },
  serra: {
    name: "Serra Verde", sub: "Montanha: subida em zigue-zague com grampos, o cume e uma descida longa e veloz",
    scale: 2.31, width: 108, minLap: 25, walls: true, wall: 10, flat: 30, fall: 170,
    // relevo: sobe em zigue-zague até o cume, um platô e a descida longa
    hills: [[0, 15], [0.06, 25], [0.14, 55], [0.22, 85], [0.31, 112], [0.38, 138], [0.43, 155], [0.5, 148], [0.58, 132], [0.64, 120], [0.72, 90], [0.8, 60], [0.88, 35], [0.95, 18], [1, 15]],
    points: [
      [260, 1150, 0],
      [230, 800, 120],
      [330, 560, 60], // grampo
      [200, 420, 50],
      [340, 260, 50],
      [560, 180, 80],
      [700, 330, 45], // zigue-zague
      [600, 460, 40],
      [820, 520, 50],
      [960, 380, 45],
      [880, 220, 50],
      [1100, 130, 90], // cume
      [1380, 260, 110],
      [1420, 560, 80],
      [1240, 640, 50],
      [1100, 560, 40],
      [960, 700, 45],
      [1100, 860, 60],
      [1380, 880, 90], // descida
      [1440, 1150, 140],
      [1200, 1420, 150],
      [820, 1440, 120],
      [600, 1300, 80],
      [480, 1420, 70],
    ],
  },
  deserto: {
    name: "Deserto Dourado", sub: "Retas extensas sobre as dunas, duas chicanes, o cânion e uma lombada para voar",
    scale: 2.55, width: 116, minLap: 25, walls: false, flat: 42, fall: 230,
    // relevo: dunas na reta da largada, sobe até a primeira chicane, desce, o cânion e a lombada (dá para voar!)
    hills: [[0, 10], [0.03, 24], [0.05, 8], [0.075, 26], [0.1, 10], [0.19, 18], [0.28, 42], [0.37, 40], [0.48, 5], [0.56, 12], [0.63, 40], [0.7, 60], [0.74, 32], [0.747, 54], [0.753, 22], [0.8, 20], [0.88, 14], [1, 10]],
    points: [
      [300, 1250, 0], // dunas
      [220, 700, 150],
      [300, 300, 140],
      [600, 160, 120],
      [1000, 140, 0],
      [1080, 200, 30], // chicane
      [1160, 140, 30],
      [1400, 240, 110],
      [1440, 560, 100],
      [1250, 650, 60],
      [1100, 560, 45],
      [960, 700, 50],
      [1100, 860, 55],
      [1380, 920, 90],
      [1420, 1180, 110],
      [1250, 1420, 120],
      [900, 1300, 70], // cânion
      [760, 1440, 70],
      [560, 1300, 40], // segunda chicane
      [480, 1420, 60],
    ],
  },
  // As três abaixo lembram pistas do Mario Kart 64 (nenhum arquivo do jogo vem junto). O Arco-íris foi seguido pelo
  // meio da pista original, com a altura de cada ponto; Luigi e Sorvete foram redesenhados com mais curvas.
  luigi: {
    name: "Circuito do Luigi", sub: "Retona dos boxes, grampos redondos, o S pelo meio e a curva do túnel",
    scale: 2.39, width: 104, minLap: 25, walls: true, wall: 12, flat: 30, fall: 120,
    hills: [[0, 8], [0.12, 8], [0.2, 20], [0.3, 30], [0.39, 14], [0.47, 2], [0.56, 0], [0.67, 16], [0.77, 28], [0.85, 12], [1, 8]],
    points: [
      [300, 800, 0],
      [300, 1450, 120],
      [700, 1500, 0],
      [1000, 1380, 80],
      [1250, 1500, 90],
      [1420, 1250, 110],
      [1250, 1050, 90],
      [800, 1000, 70],
      [600, 850, 60],
      [800, 700, 60],
      [1150, 650, 80],
      [1350, 450, 100],
      [1200, 150, 120],
      [800, 120, 0],
      [600, 300, 70],
      [400, 150, 100],
    ],
  },
  sorvete: {
    name: "Terra do Sorvete", sub: "Volta pelo lago congelado, os ganchos de gelo e a subida pela caverna",
    scale: 2.47, width: 100, minLap: 25, walls: true, wall: 10, flat: 30, fall: 120,
    hills: [[0, 0], [0.3, 0], [0.38, 10], [0.46, 30], [0.55, 48], [0.62, 52], [0.7, 34], [0.78, 10], [0.85, 0], [1, 0]],
    points: [
      [500, 1500, 0],
      [200, 1300, 100],
      [150, 950, 90],
      [300, 750, 70],
      [220, 450, 80],
      [450, 280, 80],
      [680, 420, 60],
      [880, 620, 60],
      [1100, 600, 50],
      [1180, 380, 50],
      [1060, 200, 55],
      [1260, 80, 55],
      [1460, 180, 60],
      [1440, 420, 55],
      [1300, 560, 55],
      [1440, 760, 70],
      [1300, 1000, 80],
      [1100, 1100, 60],
      [1200, 1300, 70],
      [900, 1440, 80],
      [700, 1350, 50],
    ],
  },
  arcoiris: {
    name: "Estrada Arco-íris", sub: "No espaço: descidas enormes, viadutos que se cruzam e o laço — sem chão em volta",
    scale: 2.3, relevo: 2, width: 88, minLap: 40, walls: true, wall: 6, flat: 10, fall: 1, espaco: true, // flat: o muro acompanha a altura da pista (com 0, ele ficava no chão, embaixo dos viadutos)
    hills: [[0, 28], [0.025, 40], [0.05, 81], [0.075, 86], [0.1, 83], [0.125, 74], [0.15, 68], [0.175, 60], [0.2, 50], [0.225, 45], [0.25, 39], [0.275, 36], [0.3, 31], [0.325, 28], [0.35, 26], [0.375, 25], [0.4, 22], [0.425, 21], [0.45, 21], [0.475, 21], [0.5, 21], [0.525, 21], [0.55, 21], [0.575, 21], [0.6, 18], [0.625, 20], [0.65, 22], [0.675, 9], [0.7, 5], [0.725, 2], [0.75, 0], [0.775, 16], [0.8, 18], [0.825, 22], [0.85, 43], [0.875, 43], [0.9, 43], [0.925, 43], [0.95, 40], [0.975, 37], [1, 28]],
    points: [
      [889, 524, 0], [884, 548, 0], [883, 568, 0], [883, 593, 0], [883, 618, 0], [883, 638, 0], [883, 663, 0], [883, 688, 0], [883, 714, 0], [883, 739, 0], [883, 765, 0], [883, 790, 0], [883, 816, 0], [883, 841, 0],
      [884, 866, 0], [884, 886, 0], [884, 911, 0], [885, 936, 0], [886, 962, 0], [887, 987, 0], [890, 1013, 0], [893, 1038, 0], [898, 1063, 0], [904, 1087, 0], [911, 1112, 0], [920, 1136, 0], [929, 1160, 0], [935, 1184, 0],
      [938, 1209, 0], [940, 1235, 0], [941, 1260, 0], [943, 1286, 0], [943, 1311, 0], [943, 1336, 0], [942, 1362, 0], [943, 1387, 0], [943, 1413, 0], [941, 1438, 0], [936, 1463, 0], [929, 1487, 0], [917, 1510, 0], [900, 1529, 0],
      [879, 1542, 0], [854, 1549, 0], [829, 1550, 0], [804, 1545, 0], [781, 1534, 0], [762, 1517, 0], [748, 1497, 0], [739, 1473, 0], [735, 1448, 0], [740, 1423, 0], [750, 1400, 0], [766, 1380, 0], [786, 1364, 0], [808, 1353, 0],
      [833, 1349, 0], [859, 1351, 0], [884, 1355, 0], [907, 1366, 0], [929, 1378, 0], [949, 1393, 0], [968, 1410, 0], [986, 1428, 0], [1005, 1445, 0], [1024, 1462, 0], [1045, 1476, 0], [1070, 1483, 0], [1095, 1489, 0], [1120, 1489, 0],
      [1145, 1484, 0], [1169, 1476, 0], [1191, 1463, 0], [1210, 1446, 0], [1224, 1425, 0], [1234, 1402, 0], [1239, 1377, 0], [1240, 1352, 0], [1236, 1327, 0], [1228, 1303, 0], [1217, 1280, 0], [1201, 1260, 0], [1182, 1243, 0], [1160, 1230, 0],
      [1137, 1220, 0], [1112, 1216, 0], [1087, 1213, 0], [1061, 1213, 0], [1036, 1213, 0], [1010, 1213, 0], [985, 1213, 0], [959, 1213, 0], [934, 1212, 0], [909, 1212, 0], [883, 1212, 0], [858, 1212, 0], [832, 1212, 0], [807, 1212, 0],
      [781, 1212, 0], [756, 1212, 0], [731, 1212, 0], [711, 1212, 0], [687, 1218, 0], [663, 1226, 0], [639, 1236, 0], [618, 1250, 0], [597, 1264, 0], [577, 1279, 0], [561, 1291, 0], [541, 1306, 0], [520, 1321, 0], [500, 1336, 0],
      [479, 1350, 0], [456, 1362, 0], [432, 1368, 0], [407, 1365, 0], [384, 1354, 0], [369, 1334, 0], [361, 1310, 0], [363, 1285, 0], [375, 1262, 0], [393, 1245, 0], [414, 1230, 0], [434, 1216, 0], [455, 1201, 0], [476, 1186, 0],
      [497, 1171, 0], [517, 1156, 0], [537, 1141, 0], [557, 1124, 0], [575, 1107, 0], [593, 1089, 0], [609, 1069, 0], [621, 1047, 0], [627, 1022, 0], [630, 997, 0], [631, 971, 0], [631, 946, 0], [631, 921, 0], [631, 895, 0],
      [628, 870, 0], [622, 845, 0], [624, 820, 0], [634, 797, 0], [652, 778, 0], [674, 766, 0], [699, 762, 0], [724, 766, 0], [747, 778, 0], [764, 797, 0], [774, 820, 0], [776, 846, 0], [770, 870, 0], [756, 892, 0],
      [736, 907, 0], [712, 916, 0], [686, 916, 0], [662, 907, 0], [642, 892, 0], [633, 870, 0], [633, 844, 0], [635, 819, 0], [637, 794, 0], [646, 771, 0], [658, 748, 0], [670, 726, 0], [683, 704, 0], [694, 681, 0],
      [702, 657, 0], [710, 633, 0], [716, 608, 0], [721, 583, 0], [725, 558, 0], [728, 533, 0], [736, 509, 0], [745, 485, 0], [761, 465, 0], [778, 446, 0], [798, 431, 0], [820, 418, 0], [842, 405, 0], [865, 393, 0],
      [888, 384, 0], [910, 372, 0], [933, 360, 0], [956, 348, 0], [978, 336, 0], [999, 323, 0], [1015, 311, 0], [1034, 295, 0], [1053, 277, 0], [1069, 258, 0], [1083, 236, 0], [1095, 214, 0], [1103, 190, 0], [1106, 165, 0],
      [1104, 140, 0], [1095, 116, 0], [1083, 94, 0], [1066, 75, 0], [1045, 60, 0], [1021, 54, 0], [995, 51, 0], [970, 53, 0], [947, 63, 0], [926, 77, 0], [909, 97, 0], [898, 120, 0], [891, 144, 0], [886, 169, 0],
      [884, 194, 0], [883, 220, 0], [883, 245, 0], [883, 271, 0], [883, 296, 0], [883, 321, 0], [883, 341, 0], [883, 366, 0], [883, 391, 0], [883, 411, 0], [883, 436, 0], [883, 461, 0], [883, 487, 0], [883, 512, 0]
    ],
  },
};

// Pistas ampliadas: os vértices (e os raios) foram desenhados no quadrado de 1600 e são multiplicados por `scale`,
// e o mundo dessa pista cresce junto (t.world). Todas as voltas têm uns 13 mil (pouco mais de 1 min de kart). `relevo`
// multiplica as alturas e o barranco junto com a escala, para as rampas continuarem com a mesma inclinação.
for (const t of Object.values(PISTAS)) {
  const s = t.scale || 1;
  t.scale = s; t.world = WORLD * s;
  if (s !== 1) t.points = t.points.map(([x, y, r]) => [x * s, y * s, (r || 0) * s]);
  if (t.relevo) { t.hills = t.hills.map(([f, h]) => [f, h * t.relevo]); t.fall *= t.relevo; }
}

// Os cinco acertos do carro de F1 (os ids continuam os antigos, para as salas e o servidor). vmax: velocidade final no asfalto · acc: aceleração na arrancada (ela cai perto da velocidade
// final: a = acc·(1 − 0,8·(v/vmax)^1,6), então leva de 4 a 8 segundos para chegar no topo; a pilotagem é a de kart) · brake: freio · grip: quanto o pneu segura
// de lado (acima disso o carro escorrega para fora da curva) · turn: quanto o volante gira · scrub: quanto perde de
// velocidade escorregando · kin: quanto do grip sobra depois que começa a escorregar (pneu saturado) · offMax: velocidade máxima fora do asfalto · wall: quanto da velocidade sobra numa batida.
// Em todos, o "limite de curva" (grip ÷ turn) fica abaixo da velocidade final: em curva fechada, tem que frear.
const CARROS = {
  equilibrado: { name: "Turbo 88", inspo: "acerto equilibrado", desc: "Faz tudo direitinho: bom de reta e de curva. Bom para começar.", vmax: 295, acc: 82, brake: 470, grip: 470, kin: 0.7, turn: 2.4, scrub: 0.9, offMax: 95, wall: 0.55 },
  foguete: { name: "Reta V12", inspo: "asa baixa, motor forte", desc: "O mais rápido na reta, mas chega embalado demais nas curvas.", vmax: 360, acc: 74, brake: 430, grip: 420, kin: 0.65, turn: 2.2, scrub: 1.1, offMax: 85, wall: 0.45 },
  formiga: { name: "Pimentinha", inspo: "asa alta, carro leve", desc: "Arranca forte e vira em qualquer canto. Na reta, fica para trás.", vmax: 236, acc: 110, brake: 520, grip: 490, kin: 0.68, turn: 2.75, scrub: 0.8, offMax: 100, wall: 0.6 },
  drifteiro: { name: "Escorrega", inspo: "traseira solta", desc: "Escorrega fácil, mas quase não perde velocidade de lado. Para quem gosta de derrapar.", vmax: 305, acc: 85, brake: 450, grip: 380, kin: 0.88, turn: 3.0, scrub: 0.35, offMax: 90, wall: 0.5 },
  tanque: { name: "Blindado", inspo: "chassi pesado e reforçado", desc: "Pesado: demora a embalar, mas bate no muro e passa pela grama sem sofrer tanto.", vmax: 315, acc: 58, brake: 400, grip: 500, kin: 0.7, turn: 2.0, scrub: 0.9, offMax: 140, wall: 0.8 },
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
// a pintura do F1: as combinações de cor das equipes (só as cores, sem nome nem marca) ou a cor do piloto com branco
const MODS = {
  pintura: {
    propria: { name: "Sua cor", c: null, c2: "#f4f4f4" },
    classico: { name: "Clássico 88", c: "#d8101c", c2: "#f4f4f4" },
    rosso: { name: "Rosso", c: "#c8000a", c2: "#f2c300" },
    papaia: { name: "Papaia", c: "#ff7a00", c2: "#1e5bd8" },
    flecha: { name: "Flecha de Prata", c: "#b9bec4", c2: "#00c2b2" },
    touro: { name: "Touro Azul", c: "#1b2a5c", c2: "#e8202a" },
    ingles: { name: "Verde Inglês", c: "#005c4b", c2: "#c8e000" },
    frances: { name: "Azul Francês", c: "#0a5bc8", c2: "#ff7ab8" },
    ouro: { name: "Preto e Ouro", c: "#141414", c2: "#c9a64a" },
    marinho: { name: "Azul Marinho", c: "#0b2147", c2: "#3ab0e8" },
  },
};
const MODS_PADRAO = { pintura: "propria" };

const SECTORS = 4; // a volta só conta passando pelos 4 setores na ordem (contra atalho e contramão)
// Três caixas por conjunto, espaçadas na volta. A mesma posição é calculada no servidor e no navegador.
function boxesFor(id) {
  const t = PISTAS[id], pts = elevate(sample(t.points, 6), t.hills);
  const out = [];
  for (const f of [0.12, 0.27, 0.43, 0.59, 0.75, 0.9]) {
    const p = pts[Math.floor(pts.length * f)], sideX = -p.ty, sideY = p.tx;
    for (const lane of [-0.25, 0, 0.25]) out.push({ x: p.x + sideX * lane * t.width, y: p.y + sideY * lane * t.width, h: p.h, i: out.length });
  }
  return out;
}

const api = { WORLD, PISTAS, CARROS, MODS, MODS_PADRAO, sample, elevate, boxesFor, SECTORS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Pistas = api;
})(typeof window !== "undefined" ? window : globalThis);
