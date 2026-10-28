// Melbourne (Albert Park Circuit): o que só o circuito e o parque têm. O lago Albert Park no meio, o clube de vela
// e remo com o píer, a ilha Gunn Island, o horizonte com os arranha-céus da cidade (a Eureka Tower com a coroa de ouro,
// a Australia 108 e a City de Melbourne ao norte), o prédio dos boxes e as cores da Austrália.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, sorteio } from "./kit/comum.js";
import { prediosDosBoxes } from "./kit/boxes.js";

// o cenário antes: o lago Albert Park, a ilha, o clube de vela, as arquibancadas e os prédios da cidade ao fundo
export function cenarioMelbourne(tr, { add, hAt, blds, aguaTex }) {
  const { pts, n } = tr, f = (v) => Math.floor(v * n);

  // onde pista.js põe as arquibancadas do kit (para o som da torcida de som.js e a ambientação)
  tr.arquibancadas = [
    [f(0.975), n], [0, f(0.045)], // reta principal (Fangio)
    [f(0.048), f(0.082)],         // curvas 1 e 2 (Jones / Brabham)
    [f(0.085), f(0.11)],          // saída da 2 (Moss)
    [f(0.13), f(0.165)],          // curva 3 / 4 (Sportsnet)
    [f(0.495), f(0.535)],         // curvas 9 e 10 (Clark)
    [f(0.665), f(0.705)],         // chicane rápida 11 e 12 (Waite)
    [f(0.76), f(0.81)],           // curvas 13 e 14 (Hill)
    [f(0.88), f(0.935)],          // curvas 15 e 16 (Prost / Senna)
  ];

  // 1. O Lago Albert (Albert Park Lake): o lago central no coração do parque, entre as duas retas
  // Contorno suave em 20 vértices que acompanha o miolo do circuito com folga segura da pista
  const lagoPontos = [
    [2680, 1800], [2760, 2150], [2780, 2450], [2740, 2750], [2640, 3050],
    [2520, 3250], [2380, 3450], [2280, 3550], [2200, 3450], [2100, 3200],
    [2020, 2900], [1920, 2600], [1860, 2300], [1850, 2000], [1900, 1750],
    [2000, 1550], [2150, 1420], [2320, 1400], [2480, 1480], [2580, 1620],
  ];

  const shape = new THREE.Shape();
  shape.moveTo(lagoPontos[0][0], lagoPontos[0][1]);
  for (let k = 1; k < lagoPontos.length; k++) {
    shape.lineTo(lagoPontos[k][0], lagoPontos[k][1]);
  }
  shape.closePath();

  // furo no lago para a ilha (Gunn Island, santuário de aves aquáticas e cisnes negros)
  const ilhaRaioX = 55, ilhaRaioZ = 45, ilhaCentroX = 2360, ilhaCentroZ = 2800;
  const furoIlha = new THREE.Path();
  furoIlha.absellipse(ilhaCentroX, ilhaCentroZ, ilhaRaioX, ilhaRaioZ, 0, Math.PI * 2, true, 0);
  shape.holes.push(furoIlha);

  const matAgua = new THREE.MeshStandardMaterial({
    map: aguaTex("#1e6b8a"),
    roughness: 0.12,
    metalness: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  matAgua.map.repeat.set(6, 6);
  tr.agua.push(matAgua);

  const lagoGeo = new THREE.ShapeGeometry(shape, 24);
  const lagoMesh = add(new THREE.Mesh(lagoGeo, matAgua));
  lagoMesh.rotation.x = -Math.PI / 2;
  const lagoH = hAt(2300, 2300) + 0.5;
  lagoMesh.position.y = lagoH;
  tr.lagoMelbourne = { x: 2300, y: 2300 };

  // a ilha no meio do lago (Gunn Island): montículo de grama verde com árvores de parque
  const ilhaMat = M(0x2d682e, { roughness: 0.9 });
  const ilhaGeo = new THREE.CylinderGeometry(ilhaRaioX, ilhaRaioX + 12, 4, 24);
  const ilha = add(new THREE.Mesh(ilhaGeo, ilhaMat));
  ilha.position.set(ilhaCentroX, lagoH + 1.2, ilhaCentroZ);
  ilha.scale.set(1, 1, ilhaRaioZ / ilhaRaioX);

  // árvores e arbustos na ilha
  const rIlha = sorteio(1996);
  const verdeFolha = M(0x2a5e2b, { roughness: 0.95 });
  const troncoMat = M(0x5a3e26, { roughness: 0.95 });
  for (let k = 0; k < 7; k++) {
    const ang = rIlha() * Math.PI * 2, dist = rIlha() * 32;
    const ax = ilhaCentroX + Math.cos(ang) * dist, az = ilhaCentroZ + Math.sin(ang) * (dist * 0.8);
    const alt = 28 + rIlha() * 18, larg = alt * 0.45;
    const copa = add(new THREE.Mesh(new THREE.IcosahedronGeometry(larg, 0), verdeFolha));
    copa.position.set(ax, lagoH + alt * 0.7, az);
    const tronco = add(new THREE.Mesh(new THREE.CylinderGeometry(larg * 0.12, larg * 0.16, alt * 0.5, 5), troncoMat));
    tronco.position.set(ax, lagoH + alt * 0.25, az);
  }

  // 2. Albert Park Yacht Club e Melbourne Rowing Sheds na margem leste do lago
  const pierX = 2740, pierZ = 2450;
  if (livre(tr, pierX, pierZ, 100)) {
    const pierGrp = new THREE.Group();
    pierGrp.position.set(pierX, lagoH, pierZ);
    pierGrp.rotation.y = -Math.PI / 2 + 0.15;
    add(pierGrp);

    const madeiraPier = M(0x73553a, { roughness: 0.9 });
    const paredeClube = M(0xf0eee6, { roughness: 0.85 });
    const telhadoVerde = M(0x1e5631, { roughness: 0.8 });

    // deque de madeira avançando na água
    const deck = new THREE.Mesh(new THREE.BoxGeometry(64, 2, 28), madeiraPier);
    deck.position.set(-18, 0.8, 0);
    pierGrp.add(deck);

    // pilotis de madeira fincados na água
    const pilarGeo = new THREE.CylinderGeometry(0.8, 0.8, 8, 6);
    for (let dx = -46; dx <= 6; dx += 16) {
      for (const dz of [-11, 11]) {
        const pil = new THREE.Mesh(pilarGeo, madeiraPier);
        pil.position.set(dx, -2, dz);
        pierGrp.add(pil);
      }
    }

    // hangar/casa de barcos do clube de iatismo
    const barracao = new THREE.Mesh(new THREE.BoxGeometry(40, 22, 32), paredeClube);
    barracao.position.set(22, 11, 0);
    barracao.castShadow = true;
    pierGrp.add(barracao);

    // telhado em duas águas
    const telhaGeo = new THREE.CylinderGeometry(18, 18, 42, 3);
    const telha = new THREE.Mesh(telhaGeo, telhadoVerde);
    telha.rotation.set(0, 0, Math.PI / 2);
    telha.scale.set(0.65, 1, 1);
    telha.position.set(22, 26, 0);
    pierGrp.add(telha);

    // barcos a vela / skiffs ancorados no deque
    const cascoBarco = M(0xfafafa, { roughness: 0.4 });
    const velaMat = M(0xf2efe9, { roughness: 0.3, side: THREE.DoubleSide });
    for (const bOff of [-22, -6]) {
      const barco = new THREE.Group();
      barco.position.set(bOff, 0.4, -20);
      barco.rotation.y = 0.2;
      pierGrp.add(barco);
      const casco = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 5), cascoBarco);
      casco.position.y = 0.8;
      barco.add(casco);
      const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 18, 4), M(0xd4d4d4));
      mastro.position.set(-1, 9, 0);
      barco.add(mastro);
      const velaGeo = new THREE.BufferGeometry();
      velaGeo.setAttribute("position", new THREE.Float32BufferAttribute([
        -1, 1, 0,
        -1, 17, 0,
        5, 3, 0,
      ], 3));
      velaGeo.computeVertexNormals();
      const vela = new THREE.Mesh(velaGeo, velaMat);
      barco.add(vela);
    }
  }

  // reserva a área do lago para que árvores ou prédios não fiquem na água
  tr.reservado.push([2300, 2400, 850]);

  // 3. O Skyline de Melbourne (Southbank e a City) ao norte / noroeste do circuito
  // Eureka Tower (297 m, coroa de ouro, vidro azul escuro e faixa vermelha)
  const eurekaX = 3050, eurekaZ = 6100;
  if (livre(tr, eurekaX, eurekaZ, 250)) {
    const eH = hAt(eurekaX, eurekaZ);
    const eurekaGrp = new THREE.Group();
    eurekaGrp.position.set(eurekaX, eH, eurekaZ);
    add(eurekaGrp);

    const vidroEureka = M(0x183452, { roughness: 0.2, metalness: 0.6 });
    const ouroCoroa = M(0xfdc827, { roughness: 0.15, metalness: 0.85 });
    const vermelhoEureka = M(0xc8102e, { roughness: 0.5 });
    const brancoFaixa = M(0xffffff, { roughness: 0.6 });

    // corpo principal da torre
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(56, 260, 56), vidroEureka);
    corpo.position.y = 130;
    corpo.castShadow = true;
    eurekaGrp.add(corpo);

    // a coroa dourada nos últimos 45 metros
    const coroa = new THREE.Mesh(new THREE.BoxGeometry(58, 48, 58), ouroCoroa);
    coroa.position.y = 284;
    coroa.castShadow = true;
    eurekaGrp.add(coroa);

    // antena / mastro de telecomunicações no topo
    const antena = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.5, 60, 6), M(0xd9d9d9, { metalness: 0.8 }));
    antena.position.y = 338;
    eurekaGrp.add(antena);

    // a faixa vermelha da Eureka Stockade na quina
    const faixaV = new THREE.Mesh(new THREE.BoxGeometry(3.5, 270, 3.5), vermelhoEureka);
    faixaV.position.set(-28, 140, -28);
    eurekaGrp.add(faixaV);

    // faixa branca horizontal
    const faixaB = new THREE.Mesh(new THREE.BoxGeometry(57, 4, 57), brancoFaixa);
    faixaB.position.y = 180;
    eurekaGrp.add(faixaB);

    tr.reservado.push([eurekaX, eurekaZ, 120]);
  }

  // Australia 108 (316 m, torre azul elegante com a estrela dourada Star House saltando para fora)
  const aus108X = 2750, aus108Z = 6350;
  if (livre(tr, aus108X, aus108Z, 250)) {
    const aH = hAt(aus108X, aus108Z);
    const ausGrp = new THREE.Group();
    ausGrp.position.set(aus108X, aH, aus108Z);
    add(ausGrp);

    const vidroAus = M(0x1a4666, { roughness: 0.18, metalness: 0.7 });
    const ouroStar = M(0xfdc827, { roughness: 0.2, metalness: 0.85 });

    const torreAus = new THREE.Mesh(new THREE.CylinderGeometry(24, 28, 320, 16), vidroAus);
    torreAus.position.y = 160;
    torreAus.castShadow = true;
    ausGrp.add(torreAus);

    // o anel em balanço da "Star House" no meio da torre
    const starRing = new THREE.Mesh(new THREE.CylinderGeometry(38, 38, 26, 8), ouroStar);
    starRing.position.y = 190;
    starRing.castShadow = true;
    ausGrp.add(starRing);

    tr.reservado.push([aus108X, aus108Z, 120]);
  }

  // Rialto Towers e 101 Collins com agulha
  const rialtoX = 2400, rialtoZ = 6250;
  if (livre(tr, rialtoX, rialtoZ, 250)) {
    const rH = hAt(rialtoX, rialtoZ);
    const espelhoEscuro = M(0x151c24, { roughness: 0.12, metalness: 0.85 });
    const rialto = add(new THREE.Mesh(new THREE.BoxGeometry(50, 240, 50), espelhoEscuro));
    rialto.position.set(rialtoX, rH + 120, rialtoZ);
    rialto.castShadow = true;
    tr.reservado.push([rialtoX, rialtoZ, 100]);
  }

  const collinsX = 3450, collinsZ = 5950;
  if (livre(tr, collinsX, collinsZ, 250)) {
    const cH = hAt(collinsX, collinsZ);
    const pedraClara = M(0xe2ded4, { roughness: 0.8 });
    const collins = add(new THREE.Mesh(new THREE.BoxGeometry(52, 210, 52), pedraClara));
    collins.position.set(collinsX, cH + 105, collinsZ);
    const topo = add(new THREE.Mesh(new THREE.ConeGeometry(8, 65, 8), M(0xd0cecb, { metalness: 0.6 })));
    topo.position.set(collinsX, cH + 242, collinsZ);
    tr.reservado.push([collinsX, collinsZ, 100]);
  }

  // Outros arranha-céus modernos da City e de Southbank formando o paredão da metrópole
  const rCity = sorteio(3000);
  const coresVidro = ["#1f4263", "#28587d", "#1c3247", "#8fa6bc", "#e8edf2", "#2e6284"];
  for (let k = 0; k < 65; k++) {
    const cx = 1200 + rCity() * 3400, cz = 5300 + rCity() * 1900;
    if (!livre(tr, cx, cz, 380)) continue;
    const andares = 14 + Math.floor(rCity() * 26);
    const sx = 55 + rCity() * 55, sz = 55 + rCity() * 55;
    blds.push({
      x: cx, y: cz, h: hAt(cx, cz), s: 1, sx, sy: andares * 22, sz, dy: 0.5,
      r: rCity() * 3, c: coresVidro[(rCity() * coresVidro.length) | 0],
    });
  }
}

// o cenário depois: o complexo de boxes da F1 na reta principal e os pórticos
export function depoisMelbourne(tr, { add, hAt }) {
  // Prédio dos boxes do GP da Austrália: ao longo da reta dos boxes (lado 1, do corredor dos boxes)
  // com garagens, camarotes envidraçados, friso verde australiano, torre de controle e painéis dos patrocinadores
  prediosDosBoxes(tr, add, {
    de: 0.982,
    ate: 1.058,
    lado: 1,
    recuo: 60,
    fundo: 44,
    alto: 34,
    torre: true,
    paineis: ["ausgp", "rolex", "heineken", "pirelli", "f1", "dhl", "aramco"],
    cores: { parede: "#f2f0ea", friso: "#007a3d", teto: 0xb5b8bc },
  });

  // Pórtico de largada / chegada da Rolex sobre a reta
  const { pts, n, W } = tr;
  const p0 = pts[0];
  if (p0) {
    const gPortico = new THREE.Group();
    gPortico.position.set(p0.x, p0.h, p0.y);
    gPortico.rotation.y = Math.atan2(p0.tx, p0.ty) + Math.PI / 2;
    add(gPortico);

    const metalCinza = M(0x282c34, { roughness: 0.6 });
    const largTotal = W + 44;

    // pilares laterais
    for (const sx of [-largTotal / 2, largTotal / 2]) {
      const pilar = new THREE.Mesh(new THREE.BoxGeometry(5, 48, 6), metalCinza);
      pilar.position.set(sx, 24, 0);
      gPortico.add(pilar);
    }

    // viga horizontal
    const viga = new THREE.Mesh(new THREE.BoxGeometry(largTotal, 14, 8), metalCinza);
    viga.position.set(0, 48, 0);
    gPortico.add(viga);

    // painel Rolex Australian GP virado para os pilotos na reta
    const painelTex = marcaTex("rolex", 1024, 128);
    const painelMat = new THREE.MeshBasicMaterial({ map: painelTex, side: THREE.DoubleSide });
    const painel = new THREE.Mesh(new THREE.PlaneGeometry(largTotal * 0.75, 12), painelMat);
    painel.position.set(0, 48, 4.2);
    gPortico.add(painel);
  }
}
