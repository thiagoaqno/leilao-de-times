// Bahrein (Bahrain International Circuit - Sakhir):
// Cenário do GP do Bahrein no deserto de Sakhir. O que só Sakhir tem:
// 1. Torre Al Sakhir (Al Sakhir VIP Tower): a torre circular de 8 andares com anéis arquitetônicos externos,
//    sala VIP envidraçada no topo, cobertura em tenda beduína e mastro com sinalizador.
// 2. Postes de iluminação noturna (floodlight pylons) ao redor do circuito em InstancedMesh.
// 3. Oásis do deserto com canteiros de tamareiras e palmeiras imperiais no paddock e na reta de trás.
// 4. Edifícios dos boxes com friso vermelho do Bahrein e pórtico de largada Gulf Air / Rolex.
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { marcaTex } from "./kit/marcas.js";

// A torre circular VIP Al Sakhir, marco definitivo do Circuito Internacional do Bahrein
export function torreAlSakhir(tr, add) {
  const p0 = tr.pts[0];
  // Posição no paddock: ao lado interno da reta principal (lado: 1), recuada ~145 m da linha central
  const tx = p0.x + p0.nx * 145, tz = p0.y + p0.ny * 145;
  const th = tr.hAt ? tr.hAt(tx, tz) : p0.h;

  const g = new THREE.Group();
  g.position.set(tx, th, tz);

  // Materiais da torre
  const calcario = M(0xcfc1a5, { roughness: 0.85 }); // pedra calcária do deserto
  const branco = M(0xf7f5ef, { roughness: 0.4 }); // estrutura arquitetônica branca
  const vidro = M(0x13222e, { roughness: 0.15, metalness: 0.75 }); // vidro fumê dos lounges
  const tetoTenda = M(0xfcfbf7, { roughness: 0.35, side: THREE.DoubleSide }); // lona de tenda árabe
  const aco = M(0x9099a2, { roughness: 0.4, metalness: 0.6 });
  const ledVermelho = new THREE.MeshBasicMaterial({ color: 0xce1126 });
  const ledDourado = new THREE.MeshBasicMaterial({ color: 0xffd166 });

  // 1. Base / Podium circular em pedra
  const podioGeo = new THREE.CylinderGeometry(36, 38, 5, 32);
  const podio = new THREE.Mesh(podioGeo, calcario);
  podio.position.y = 2.5;
  podio.castShadow = true; podio.receiveShadow = true;
  g.add(podio);

  // Mureta circular com detalhes em relevo
  const muretaGeo = new THREE.CylinderGeometry(37, 37, 1.2, 32, 1, true);
  const mureta = new THREE.Mesh(muretaGeo, branco);
  mureta.position.y = 5.6;
  g.add(mureta);

  // 2. Os 8 andares cilíndricos da torre Al Sakhir
  const numAndares = 8;
  const alturaAndar = 5.6;
  const hBase = 5;

  for (let i = 0; i < numAndares; i++) {
    const yAndar = hBase + i * alturaAndar;
    // O diâmetro afunila suavemente de 23 m no térreo para 17 m no 7º andar
    const rCorpo = 23 - (i / (numAndares - 1)) * 5.5;

    // Núcleo com janelas de vidro
    const corpoGeo = new THREE.CylinderGeometry(rCorpo, rCorpo + 0.3, alturaAndar - 0.6, 32);
    const corpo = new THREE.Mesh(corpoGeo, vidro);
    corpo.position.y = yAndar + (alturaAndar - 0.6) / 2;
    corpo.castShadow = true;
    g.add(corpo);

    // Anel externo / marquise de proteção solar (brise-soleil arquitetônico)
    const rAnel = rCorpo + 3.2;
    const anelGeo = new THREE.CylinderGeometry(rAnel, rAnel, 1.1, 32, 1, true);
    const anel = new THREE.Mesh(anelGeo, branco);
    anel.position.y = yAndar + alturaAndar - 0.6;
    g.add(anel);

    // Faixa luminosa no anel (LED vermelho ou dourado alternado)
    const ledMat = i % 2 === 0 ? ledVermelho : ledDourado;
    const ledGeo = new THREE.CylinderGeometry(rAnel + 0.05, rAnel + 0.05, 0.25, 32, 1, true);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.y = yAndar + alturaAndar - 0.6;
    g.add(led);

    // Pilares verticais conectando os anéis (fins arquitetônicos)
    const numFins = 12;
    for (let f = 0; f < numFins; f++) {
      const ang = (f / numFins) * Math.PI * 2;
      const finX = Math.cos(ang) * (rAnel - 0.2);
      const finZ = Math.sin(ang) * (rAnel - 0.2);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, alturaAndar, 1.2), branco);
      fin.position.set(finX, yAndar + alturaAndar / 2, finZ);
      fin.rotation.y = -ang;
      g.add(fin);
    }
  }

  // 3. 8º Andar: Lounge VIP e Mirante Panorâmico Cantilever
  const yLounge = hBase + numAndares * alturaAndar;
  const rLounge = 24.5;
  const loungeGeo = new THREE.CylinderGeometry(rLounge, 18, 6.5, 32);
  const lounge = new THREE.Mesh(loungeGeo, vidro);
  lounge.position.y = yLounge + 3.25;
  lounge.castShadow = true;
  g.add(lounge);

  // Platibanda do lounge
  const loungeTeto = new THREE.Mesh(new THREE.CylinderGeometry(rLounge + 1.5, rLounge + 1.5, 1.2, 32), branco);
  loungeTeto.position.y = yLounge + 6.5;
  g.add(loungeTeto);

  // 4. Cobertura icônica em Tenda Beduína (Tensile Fabric Canopy)
  const yTenda = yLounge + 7.1;
  const tendaGeo = new THREE.ConeGeometry(rLounge + 2, 11, 32, 1, true);
  const tenda = new THREE.Mesh(tendaGeo, tetoTenda);
  tenda.position.y = yTenda + 5.5;
  tenda.castShadow = true;
  g.add(tenda);

  // Torreão central com mastro / agulha de comunicação
  const torreao = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 8, 16), aco);
  torreao.position.y = yTenda + 11 + 4;
  g.add(torreao);

  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 36, 8), aco);
  mastro.position.y = yTenda + 19 + 18;
  g.add(mastro);

  // Sinalizador vermelho no topo do mastro (luz de topo aéreo)
  const sinalizador = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), ledVermelho);
  sinalizador.position.y = yTenda + 19 + 36;
  g.add(sinalizador);

  add(g);

  // Reserva o espaço da torre no mapa para não sobrepor outros objetos
  tr.reservado ||= [];
  tr.reservado.push([tx, tz, 55]);
}

// Postes de iluminação noturna (floodlight towers): marcam o autódromo de Sakhir
export function postesIluminacaoBahrein(tr, add) {
  const { pts, n, W } = tr;
  const mastros = [];
  const holofotes = [];

  // Amostra postes a cada ~55 pontos ao longo do circuito
  for (let i = 20; i < n; i += 56) {
    const p = pts[i];
    // Alterna o lado ou escolhe o lado com mais folga
    const lados = [-1, 1];
    for (const lado of lados) {
      // Afastamento seguro da pista: bem atrás da área de escape e guard-rails (recuo 42 m além de W/2)
      const d = lado * (W / 2 + 42);
      const x = p.x + p.nx * d;
      const z = p.y + p.ny * d;

      // Confere se está a mais de 85 m de qualquer ponto da pista
      if (tr.distAt(x, z) < 82) continue;

      // Confere se não está em área reservada
      if (tr.reservado && tr.reservado.some(([rx, rz, raio]) => Math.hypot(rx - x, rz - z) < raio + 12)) continue;

      const alt = tr.hAt ? tr.hAt(x, z) : p.h;
      // Ângulo voltado para a pista
      const ang = Math.atan2(p.nx * lado, p.ny * lado) + Math.PI;

      mastros.push({ x, y: alt, z, ang });
      break; // um poste por seção já cria um ritmo visual perfeito
    }
  }

  if (mastros.length === 0) return;

  // Geometria do poste: mastro treliçado de 32 m de altura
  const pylonMat = M(0x8a9096, { roughness: 0.5, metalness: 0.5 });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff0d8,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const pylonGeo = new THREE.CylinderGeometry(0.8, 1.4, 32, 6);
  const headGeo = new THREE.BoxGeometry(9, 2.2, 2.2);

  const pylonMesh = new THREE.InstancedMesh(pylonGeo, pylonMat, mastros.length);
  const headMesh = new THREE.InstancedMesh(headGeo, lightMat, mastros.length);
  const o = new THREE.Object3D();

  mastros.forEach(({ x, y, z, ang }, k) => {
    // Mastro
    o.position.set(x, y + 16, z);
    o.rotation.set(0, ang, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    pylonMesh.setMatrixAt(k, o.matrix);

    // Cabeça dos holofotes (inclinada ~25° apontando para a pista)
    o.position.set(x, y + 31.5, z);
    o.rotation.set(0.35, ang, 0);
    o.updateMatrix();
    headMesh.setMatrixAt(k, o.matrix);

    // Registra área do mastro
    tr.reservado.push([x, z, 10]);
  });

  pylonMesh.castShadow = true;
  add(pylonMesh);
  add(headMesh);
}

// Oásis do deserto: tamareiras e palmeiras decorativas no paddock
export function oasisBahrein(tr, ctx) {
  const p0 = tr.pts[0];
  // Pátios do paddock de Sakhir (entre a reta dos boxes e a torre)
  const clusters = [
    { x: p0.x + p0.nx * 105, z: p0.y + p0.ny * 105, n: 8, raio: 22 },
    { x: p0.x + p0.nx * 180, z: p0.y + p0.ny * 180, n: 10, raio: 30 },
  ];

  for (const { x: cx, z: cz, n: total, raio } of clusters) {
    if (tr.distAt(cx, cz) < 78) continue;
    for (let k = 0; k < total; k++) {
      const a = (k / total) * Math.PI * 2;
      const r = raio * (0.4 + 0.6 * ((k * 13) % 7) / 7);
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (tr.distAt(px, pz) < 78) continue;
      const h = tr.hAt ? tr.hAt(px, pz) : p0.h;
      if (ctx.palms) {
        ctx.palms.push({ x: px, y: pz, h, s: 1.1 + ((k % 3) * 0.2), r: a });
      }
    }
  }
}

// Cenário completo de Sakhir antes das peças padrões
export function cenarioBahrein(tr, ctx) {
  torreAlSakhir(tr, ctx.add);
  postesIluminacaoBahrein(tr, ctx.add);
  oasisBahrein(tr, ctx);
}

// Detalhes finais pós-pista: complexo de boxes e pórtico de largada
export function depoisBahrein(tr, ctx) {
  const { add } = ctx;

  // 1. Complexo dos boxes de Sakhir (garagens e Paddock Club)
  prediosDosBoxes(tr, add, {
    de: 0.982,
    ate: 1.055,
    lado: 1,
    recuo: 60,
    fundo: 48,
    alto: 38,
    torre: true,
    paineis: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "f1"],
    cores: { parede: "#f7f5ef", friso: "#ce1126", teto: 0xd6bf8e },
  });

  // 2. Pórtico de Largada / Chegada com patrocinador Gulf Air / Rolex
  const p0 = tr.pts[0];
  const gPortico = new THREE.Group();
  gPortico.position.set(p0.x, p0.h, p0.y);
  gPortico.rotation.y = Math.atan2(p0.nx, p0.ny);

  const metalEscuro = M(0x222428, { roughness: 0.4, metalness: 0.8 });
  const wPista = tr.W + 28;
  const hPortico = 28;

  // Colunas laterais treliçadas (passam a mais de W/2 + 10 da linha central)
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(4, hPortico, 4), metalEscuro);
    col.position.set(s * (wPista / 2 + 2), hPortico / 2, 0);
    gPortico.add(col);
  }

  // Viga superior transversal passando alto sobre a pista (y = 28 a 34, livre de invasão)
  const viga = new THREE.Mesh(new THREE.BoxGeometry(wPista + 10, 6, 5), metalEscuro);
  viga.position.set(0, hPortico + 3, 0);
  gPortico.add(viga);

  // Painéis de patrocinadores do pórtico
  const painelLarg = wPista * 0.42;
  const painelG = new THREE.Mesh(
    new THREE.PlaneGeometry(painelLarg, 4.8),
    new THREE.MeshBasicMaterial({ map: marcaTex("gulfair", 512, 128), side: THREE.DoubleSide })
  );
  painelG.position.set(0, hPortico + 3, 2.6);
  gPortico.add(painelG);

  const painelV = new THREE.Mesh(
    new THREE.PlaneGeometry(painelLarg, 4.8),
    new THREE.MeshBasicMaterial({ map: marcaTex("rolex", 512, 128), side: THREE.DoubleSide })
  );
  painelV.position.set(0, hPortico + 3, -2.6);
  painelV.rotation.y = Math.PI;
  gPortico.add(painelV);

  add(gPortico);
}
