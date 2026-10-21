// Regras do drag, no jeito do modo Drag do Need for Speed Underground 2: quatro faixas e troca de faixa
// semiautomática, câmbio manual obrigatório (troca perfeita, boa, cedo ou tarde), aquecimento dos pneus antes da
// largada, nitro, vácuo atrás de outro piloto, tráfego e obstáculos (bater de frente é perda total) e motor que
// estoura no corte de giro. Tudo puro, sem desenho: main.js só desenha a `corrida` e manda os comandos.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export const LANE_X = [-5.55, -1.85, 1.85, 5.55];
export const NOMES_FAIXA = ["FAIXA 1", "FAIXA 2", "FAIXA 3", "FAIXA 4"];
export const LARGURA = 2.1, COMPRIMENTO = 4.6;
export const IDLE = 0.12;
// Giro de 0 a 1 (1 = corte). Faixas do conta-giros: azul (boa), verde (perfeita), vermelho (tarde).
export const ZONA = { boa: 0.8, perfeitaMin: 0.87, perfeitaMax: 0.93, tarde: 0.965 };
export const PERFECT_MIN = ZONA.perfeitaMin, PERFECT_MAX = ZONA.perfeitaMax;
// Faixa do aquecimento e da largada (o ponteiro tem de ficar nela).
export const ZONA_PNEU = { min: 0.58, max: 0.8 };
export const ENGINE_LIMIT_SECONDS = 3.5; // no vermelho, segurando o acelerador: o motor estoura
export const ENGINE_RECOVERY_RATE = 0.5;
export const PERDA_TOTAL_KMH = 38; // bater de frente com essa diferença de velocidade (ou mais) acaba a corrida
export const TEMPO_FAIXA = 0.45;
export const AQUECIMENTO = 3.5, LUZES = 3;
const ACEL = 34, ARRASTO = 1.5e-4, ROLAGEM = 0.8, FREIO = 48;

// Os carros: velocidade no corte de cada marcha (km/h), força, nitro (segundos) e a cor do neon.
export const CARROS = {
  supra: { nome: "Toyota Supra MK IV", marchas: [64, 103, 144, 185, 225, 262], forca: 1, nitro: 4.2, neon: 0x2f7bff },
  "skyline-r33": { nome: "Nissan Skyline R33", marchas: [62, 101, 142, 183, 222, 258], forca: 1.02, nitro: 4.2, neon: 0x7a3cff },
  "bmw-m4": { nome: "BMW M4 G82", marchas: [66, 106, 148, 190, 231, 270], forca: 1.03, nitro: 3.8, neon: 0x00d2ff },
  "porsche-911": { nome: "Porsche 911 Carrera 4S", marchas: [67, 108, 150, 193, 235, 275], forca: 1.05, nitro: 3.6, neon: 0xff2bd6 },
  "porsche-718": { nome: "Porsche 718 Cayman GT4", marchas: [65, 104, 146, 188, 229, 268], forca: 1.02, nitro: 3.9, neon: 0x2bff88 },
  "ferrari-sf90": { nome: "Ferrari SF90 XX", marchas: [72, 116, 162, 208, 254, 300], forca: 1.12, nitro: 3.4, neon: 0xff3b2f },
};
export const TOP_SPEEDS = CARROS.supra.marchas;

// Torque pelo giro: fraco embaixo, cheio no meio, despenca perto do corte.
const CURVA = [[0, 0.5], [0.12, 0.55], [0.35, 0.78], [0.6, 0.97], [0.75, 1], [0.9, 0.97], [0.93, 0.94], [0.97, 0.78], [1, 0.5]];
export function torque(rpm) {
  if (rpm >= 1) return 0;
  for (let i = 1; i < CURVA.length; i++) {
    const [r1, t1] = CURVA[i], [r0, t0] = CURVA[i - 1];
    if (rpm <= r1) return t0 + (t1 - t0) * (rpm - r0) / (r1 - r0);
  }
  return 0;
}

export function rng(semente = 1) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rpmFor(speed, gear, marchas = TOP_SPEEDS) {
  return Math.max(IDLE, speed / marchas[gear - 1]);
}

export function qualidadeDoGiro(rpm) {
  if (rpm >= ZONA.perfeitaMin && rpm <= ZONA.perfeitaMax) return "perfeita";
  if (rpm >= ZONA.boa && rpm < ZONA.tarde) return "boa";
  return rpm < ZONA.boa ? "cedo" : "tarde";
}

export function makeCar({ lane = 1, z = 0, speed = 0, gear = 1, carro = "supra", forca = 1, nome = "Você", ia = null } = {}) {
  const spec = CARROS[carro] || CARROS.supra;
  return {
    kind: "piloto", nome, carro, ia, lane, targetLane: lane, laneFrom: LANE_X[lane], laneTime: 1, x: LANE_X[lane], z,
    speed, gear, marchas: spec.marchas, forca: spec.forca * forca, rpm: rpmFor(speed, gear, spec.marchas),
    shiftCut: 0, embalo: 0, patina: 0, largadaRpm: 0, largadaT: 1, pneu: 0, grip: 1,
    nitro: spec.nitro, nitroMax: spec.nitro, nitroOn: false, vacuo: 0, vacuoTempo: 0,
    collisionTime: 0, overrev: 0, engineBlown: false, totaled: false, chegada: null, velMax: 0,
    trocas: { perfeita: 0, boa: 0, cedo: 0, tarde: 0 }, largada: null,
  };
}

const ocupa = (o, x) => Math.abs(o.x - x) < ((o.w || LARGURA) + LARGURA) / 2 + 0.25;
const compr = (o) => o.len || COMPRIMENTO;

export function requestLane(car, direction, outros = []) {
  if (car.totaled || car.engineBlown) return false;
  const next = clamp(car.targetLane + direction, 0, LANE_X.length - 1);
  if (next === car.targetLane) return false;
  // Ninguém entra numa faixa com um carro do lado. Uma manobra já começada pode ser desfeita.
  if (outros.some((o) => o !== car && Math.abs(o.z - car.z) < (compr(o) + COMPRIMENTO) / 2 + 1.2 && ocupa(o, LANE_X[next]))) return false;
  car.laneFrom = car.x;
  car.targetLane = next;
  car.laneTime = 0;
  return true;
}

// Troca de marcha. Subindo, devolve a qualidade da troca pelo giro em que ela foi feita.
export function shift(car, direction) {
  if (car.totaled || car.engineBlown || car.shiftCut > 0.04) return null;
  const next = clamp(car.gear + direction, 1, car.marchas.length);
  if (next === car.gear) return null;
  let q = "reduziu";
  if (direction > 0) {
    q = qualidadeDoGiro(car.rpm);
    car.trocas[q]++;
    car.embalo = q === "perfeita" ? 1.1 : 0;
  }
  car.gear = next;
  car.shiftCut = q === "perfeita" ? 0.1 : q === "boa" ? 0.16 : 0.24;
  car.largadaT = 1;
  car.rpm = rpmFor(car.speed, next, car.marchas);
  return q;
}

// Antes da largada: o motor gira em ponto morto. Manter o ponteiro na faixa aquece os pneus.
export function aquecer(car, dt, gas) {
  const alvo = gas ? 1.02 : IDLE;
  car.rpm = clamp(car.rpm + (alvo - car.rpm) * Math.min(1, dt * (gas ? 2.1 : 2.6)), IDLE, 1);
  const naFaixa = car.rpm >= ZONA_PNEU.min && car.rpm <= ZONA_PNEU.max;
  car.pneu = clamp(car.pneu + (naFaixa ? dt / 2.4 : car.rpm > ZONA_PNEU.max ? dt / 9 : -dt / 12), 0, 1);
  car.overrev = clamp(car.overrev + (car.rpm >= ZONA.tarde ? dt * 0.5 : -dt * ENGINE_RECOVERY_RATE), 0, ENGINE_LIMIT_SECONDS - 0.5);
  return naFaixa;
}

// O instante do verde: o giro decide a largada.
export function largar(car) {
  const r = car.rpm;
  const q = r >= ZONA_PNEU.min && r <= ZONA_PNEU.max ? "perfeita" : r >= 0.45 && r <= 0.9 ? "boa" : r > 0.9 ? "patinou" : "fraca";
  car.largada = q;
  car.largadaRpm = clamp(r, 0.3, 0.85);
  car.largadaT = 0;
  car.patina = q === "patinou" ? 1.1 : q === "boa" ? 0.25 : 0;
  car.embalo = q === "perfeita" ? 0.9 : 0;
  return q;
}

function aderencia(car) {
  let g = car.gear === 1 ? 0.78 + 0.22 * car.pneu : car.gear === 2 ? 0.9 + 0.1 * car.pneu : 1;
  if (car.nitroOn && car.gear <= 2) g -= 0.24; // nitro nas primeiras marchas só patina
  if (car.patina > 0) g -= 0.32;
  return clamp(g, 0.35, 1);
}

// Um passo do carro. `outros`: os outros pilotos, o tráfego e os obstáculos.
export function stepCar(car, dt, outros = [], gas = false, freio = false) {
  const res = { collision: false, blown: false, totaled: false, raspao: false };
  if (dt <= 0 || car.engineBlown) return { ...res, blown: car.engineBlown };
  dt = Math.min(dt, 0.05);
  if (car.totaled) {
    car.foraT = (car.foraT || 0) + dt;
    car.speed = Math.max(0, car.speed - 95 * dt);
    car.z += car.speed / 3.6 * dt;
    return { ...res, totaled: true };
  }
  car.shiftCut = Math.max(0, car.shiftCut - dt);
  car.embalo = Math.max(0, car.embalo - dt);
  car.patina = Math.max(0, car.patina - dt);
  car.collisionTime = Math.max(0, car.collisionTime - dt);
  car.largadaT = Math.min(1, car.largadaT + dt / 0.9);
  car.laneTime = Math.min(1, car.laneTime + dt / TEMPO_FAIXA);
  const u = car.laneTime, eased = u * u * (3 - 2 * u);
  car.x = car.laneFrom + (LANE_X[car.targetLane] - car.laneFrom) * eased;
  if (u === 1) car.lane = car.targetLane;

  const usandoNitro = car.nitroOn && gas && car.nitro > 0;
  if (usandoNitro) car.nitro = Math.max(0, car.nitro - dt);
  car.grip = aderencia(car);
  // Na largada a embreagem segura o giro alto por um instante.
  const embreagem = car.largadaT < 1 ? car.largadaRpm * (1 - car.largadaT) : 0;
  const rpmRoda = rpmFor(car.speed, car.gear, car.marchas);
  const rpmMotor = Math.max(rpmRoda, embreagem);
  const fatorMarcha = Math.pow(car.marchas[0] / car.marchas[car.gear - 1], 0.8);
  let empuxo = 0;
  if (freio) gas = false;
  if (gas && car.shiftCut <= 0) {
    empuxo = ACEL * car.forca * torque(Math.min(rpmMotor, 0.999)) * fatorMarcha * car.grip;
    if (rpmMotor >= 1) empuxo = 0; // corte de giro
    if (usandoNitro) empuxo *= 1.5;
    if (car.embalo > 0) empuxo *= 1.15;
    empuxo *= 1 + 0.08 * car.vacuo;
  }
  const arrasto = car.speed * car.speed * ARRASTO * (1 - 0.35 * car.vacuo) + (car.speed > 0 ? ROLAGEM : 0) + (gas ? 0 : 6) + (freio ? FREIO : 0);
  car.speed = clamp(car.speed + (empuxo - arrasto) * dt, 0, car.marchas.at(-1) * (usandoNitro ? 1.04 : 1));
  car.z += car.speed / 3.6 * dt;
  car.velMax = Math.max(car.velMax, car.speed);

  for (const o of outros) {
    if (o === car) continue;
    const dz = o.z - car.z, dx = Math.abs(car.x - o.x), alcance = (compr(o) + COMPRIMENTO) / 2;
    if (dx >= ((o.w || LARGURA) + LARGURA) / 2 || Math.abs(dz) >= alcance) continue;
    if (Math.abs(dz) < alcance * 0.62 && car.laneTime < 1) {
      // Raspão no meio da troca de faixa: volta para a faixa de onde saiu (um raspão por vez).
      if (car.collisionTime > 0) continue;
      car.laneFrom = car.x; car.targetLane = car.lane; car.laneTime = 0;
      car.speed *= 0.93;
      res.raspao = true;
    } else if (dz >= 0) {
      const fechamento = car.speed - (o.speed || 0);
      car.z = o.z - alcance;
      if (fechamento >= PERDA_TOTAL_KMH) {
        car.totaled = true;
        res.totaled = true;
        if (o.kind === "piloto" && !o.totaled) o.speed += fechamento * 0.25;
      } else car.speed = Math.min(car.speed, (o.speed || 0) + 1);
    } else continue; // quem bateu atrás resolve no próprio passo
    if (car.collisionTime <= 0) { res.collision = true; car.collisionTime = 0.45; }
  }

  car.rpm = Math.min(1.02, Math.max(rpmMotor, rpmRoda) + (gas ? (1 - car.grip) * 0.3 : 0));
  const noCorte = gas && car.rpm >= ZONA.tarde;
  car.overrev = clamp(car.overrev + (noCorte ? dt : -dt * ENGINE_RECOVERY_RATE), 0, ENGINE_LIMIT_SECONDS);
  if (car.overrev >= ENGINE_LIMIT_SECONDS) car.engineBlown = true;
  return { ...res, blown: car.engineBlown };
}

// O vácuo: logo atrás de outro piloto, na mesma faixa, a barra enche e o ar pesa menos.
export function atualizarVacuo(car, pilotos, dt) {
  const atras = pilotos.some((o) => o !== car && !o.totaled && Math.abs(o.x - car.x) < 1.6 && o.z - car.z > 4 && o.z - car.z < 30);
  const antes = car.vacuo;
  car.vacuo = clamp(car.vacuo + (atras && car.speed > 60 ? dt / 1.6 : -dt / 0.8), 0, 1);
  if (car.vacuo > 0.05) car.vacuoTempo += dt;
  return antes < 1 && car.vacuo >= 1;
}

// O tráfego: cada faixa anda num ritmo (ninguém bate em ninguém), nunca mais de dois carros juntos, e cada obra
// fecha uma faixa (e a faixa fica sem tráfego atrás dela, para ninguém do tráfego bater nela).
export function gerarTrafego(comprimento, sorte) {
  const ritmo = [92, 82, 73, 64];
  const tipos = ["sedan", "sedan", "hatch", "van", "picape", "caminhao"];
  const obstaculos = [];
  const nObras = comprimento >= 1400 ? 3 : 2;
  for (let i = 0; i < nObras; i++) {
    const z = Math.round(comprimento * (0.3 + 0.55 * (i + sorte() * 0.6) / nObras));
    obstaculos.push({ kind: "obstaculo", lane: Math.floor(sorte() * 4), x: 0, z, speed: 0, w: 3.3, len: 1.6 });
  }
  obstaculos.forEach((o) => { o.x = LANE_X[o.lane]; });
  const trafego = [];
  for (let z = 210; z < comprimento + 520; z += 85 + sorte() * 70) {
    const n = sorte() < 0.35 ? 2 : 1;
    const faixas = [0, 1, 2, 3].sort(() => sorte() - 0.5).slice(0, n);
    for (const lane of faixas) {
      const z0 = z + sorte() * 18;
      if (obstaculos.some((o) => o.lane === lane && z0 < o.z + 40 && z0 > o.z - 900)) continue;
      const tipo = tipos[Math.floor(sorte() * tipos.length)];
      trafego.push({ kind: "trafego", tipo, lane, x: LANE_X[lane], z: z0, speed: ritmo[lane] + sorte() * 4 - 2,
        w: tipo === "caminhao" ? 2.5 : 2.1, len: tipo === "caminhao" ? 8.5 : tipo === "van" ? 5.2 : 4.5, cor: Math.floor(sorte() * 6) });
    }
  }
  // Mesma faixa, mesmo ritmo: o de trás nunca alcança o da frente.
  for (const lane of [0, 1, 2, 3]) {
    const v = ritmo[lane];
    trafego.filter((t) => t.lane === lane).forEach((t) => { t.speed = v; });
  }
  return { trafego, obstaculos };
}

// Os rivais. `habilidade` de 0 a 1: acerto da troca, uso do nitro, reflexo para desviar e largada.
export const RIVAIS = [
  { nome: "Duda Neon", habilidade: 0.62, forca: 0.92 },
  { nome: "Rafa Turbo", habilidade: 0.78, forca: 0.95 },
  { nome: "Bia Escape", habilidade: 0.9, forca: 0.975 },
];

function normal(sorte) { return (sorte() + sorte() + sorte() - 1.5) / 0.5; }
function alvoDaTroca(car, sorte) {
  const h = car.ia.habilidade;
  return clamp(0.9 + normal(sorte) * (1 - h) * 0.06, 0.74, 0.985);
}

export function criarRival(def, lane, carro, sorte) {
  const car = makeCar({ lane, carro, forca: def.forca, nome: def.nome, ia: { ...def } });
  car.ia.alvo = alvoDaTroca(car, sorte);
  car.ia.nitroMarcha = def.habilidade > 0.75 ? 3 : 2 + Math.floor(sorte() * 3);
  car.ia.reflexo = 0.55 + def.habilidade * 0.9; // segundos de antecedência para ver o perigo
  car.ia.esperaFaixa = 0;
  car.ia.giroLargada = clamp(0.69 + normal(sorte) * (1 - def.habilidade) * 0.14, 0.4, 0.95);
  return car;
}

// Distância até o primeiro mais lento na faixa (Infinity: livre). Para trocar de faixa, -1 se tem alguém do lado.
function livreNaFaixa(car, lane, outros, frente, troca = false) {
  const x = LANE_X[lane];
  let perto = Infinity;
  for (const o of outros) {
    if (o === car || !ocupa(o, x)) continue;
    const dz = o.z - car.z;
    if (troca && Math.abs(dz) < (compr(o) + COMPRIMENTO) / 2 + 2) return -1;
    if (dz > 0 && dz < frente && (o.speed || 0) < car.speed - 4) perto = Math.min(perto, dz);
  }
  return perto;
}

// O cérebro do rival: troca no giro que mira, solta o nitro numa marcha, desvia do que vem pela frente.
export function pilotar(car, dt, outros, sorte) {
  const ia = car.ia;
  if (car.totaled || car.engineBlown) return { gas: false, nitro: false, freio: false };
  if (car.rpm >= ia.alvo && car.gear < car.marchas.length && car.shiftCut <= 0) {
    shift(car, 1);
    ia.alvo = alvoDaTroca(car, sorte);
  } else if (car.gear > 1 && car.rpm < 0.5 && car.shiftCut <= 0 && rpmFor(car.speed, car.gear - 1, car.marchas) < 0.84) shift(car, -1);
  ia.esperaFaixa = Math.max(0, ia.esperaFaixa - dt);
  const frente = 14 + car.speed / 3.6 * ia.reflexo;
  let gas = true, freio = false;
  const naFrente = livreNaFaixa(car, car.targetLane, outros, frente);
  if (naFrente !== Infinity) {
    const lento = outros.find((o) => o !== car && ocupa(o, LANE_X[car.targetLane]) && Math.abs(o.z - car.z - naFrente) < 0.01);
    const rel = Math.max(0, car.speed - (lento?.speed || 0)) / 3.6;
    const parar = rel * rel / (2 * FREIO / 3.6) + 8; // distância para chegar no ritmo de quem está na frente
    let saiu = false;
    if (ia.esperaFaixa <= 0) {
      const opcoes = [car.targetLane - 1, car.targetLane + 1].filter((l) => l >= 0 && l < LANE_X.length)
        .map((l) => ({ l, livre: livreNaFaixa(car, l, outros, frente * 1.3, true) })).filter((o) => o.livre > naFrente)
        .sort((a, b) => b.livre - a.livre || Math.abs(a.l - 1.5) - Math.abs(b.l - 1.5));
      saiu = !!opcoes.length && requestLane(car, opcoes[0].l - car.targetLane, outros);
      if (saiu) ia.esperaFaixa = 0.7;
    }
    if (!saiu) {
      gas = naFrente > parar * 1.05;
      freio = naFrente < parar * (0.7 + 0.3 * ia.habilidade);
    }
  }
  const nitro = car.gear >= ia.nitroMarcha && car.nitro > 0;
  return { gas, nitro, freio };
}

// A corrida inteira. `entrada` do jogador: { gas, nitro, freio }.
export function criarCorrida({ comprimento = 1400, carro = "supra", semente = 1, laneJogador = 1, rivais = RIVAIS } = {}) {
  const sorte = rng(semente);
  const jogador = makeCar({ lane: laneJogador, carro });
  const lanes = [0, 1, 2, 3].filter((l) => l !== laneJogador);
  const pilotos = [jogador, ...rivais.map((r, i) => criarRival(r, lanes[i], carro, sorte))];
  const { trafego, obstaculos } = gerarTrafego(comprimento, sorte);
  return { comprimento, sorte, fase: "aquecimento", t: 0, tempo: 0, luzes: 0, pilotos, jogador, trafego, obstaculos, eventos: [], resultado: null };
}

export function posicaoDe(corrida, car = corrida.jogador) {
  const ordem = [...corrida.pilotos].sort((a, b) => (a.chegada ?? Infinity) - (b.chegada ?? Infinity) || b.z - a.z);
  return ordem.indexOf(car) + 1;
}

function evento(corrida, e) { corrida.eventos.push(e); }

export function passoCorrida(corrida, dt, entrada = {}) {
  const { jogador, pilotos } = corrida;
  if (corrida.fase === "fim") return;
  corrida.t += dt;
  if (corrida.fase === "aquecimento" || corrida.fase === "luzes") {
    aquecer(jogador, dt, !!entrada.gas);
    for (const r of pilotos) if (r.ia) {
      const alvo = corrida.fase === "aquecimento" ? 0.68 : r.ia.giroLargada;
      r.rpm += (alvo - r.rpm) * Math.min(1, dt * 3);
      r.pneu = clamp(r.pneu + dt / (2.4 + (1 - r.ia.habilidade) * 3), 0, 1);
    }
    if (corrida.fase === "aquecimento" && corrida.t >= AQUECIMENTO) { corrida.fase = "luzes"; corrida.t = 0; }
    if (corrida.fase === "luzes") {
      const n = Math.min(3, Math.floor(corrida.t) + 1);
      if (n !== corrida.luzes) { corrida.luzes = n; evento(corrida, { tipo: "luz", n }); }
      if (corrida.t >= LUZES) {
        corrida.fase = "corrida"; corrida.t = 0; corrida.luzes = 4;
        for (const p of pilotos) {
          const q = largar(p);
          if (p === jogador) evento(corrida, { tipo: "largada", qualidade: q });
        }
        evento(corrida, { tipo: "vai" });
      }
    }
    return;
  }
  corrida.tempo += dt;
  // O carro que deu perda total sai da pista depois de parar (main.js afunda o desenho).
  const todos = [...pilotos.filter((p) => !(p.foraT > 1.2)), ...corrida.trafego, ...corrida.obstaculos];
  for (const t of corrida.trafego) t.z += t.speed / 3.6 * dt;
  const posAntes = posicaoDe(corrida);
  for (const p of pilotos) {
    let gas, nitro, freio;
    if (p.ia) ({ gas, nitro, freio } = pilotar(p, dt, todos, corrida.sorte));
    else ({ gas = false, nitro = false, freio = false } = entrada);
    if (p.chegada !== null) { gas = true; freio = false; }
    p.nitroOn = !!nitro && p.nitro > 0;
    if (atualizarVacuo(p, pilotos, dt) && p === jogador) evento(corrida, { tipo: "vacuo" });
    const r = stepCar(p, dt, todos, gas, freio);
    if (p === jogador) {
      if (r.raspao) evento(corrida, { tipo: "raspao" });
      else if (r.collision && !r.totaled) evento(corrida, { tipo: "batida" });
    }
    if (r.totaled && !p.avisoTotal) { p.avisoTotal = true; evento(corrida, { tipo: "perda-total", nome: p.nome, jogador: p === jogador }); }
    if (p.chegada === null && p.z >= corrida.comprimento) {
      p.chegada = corrida.tempo - (p.z - corrida.comprimento) / Math.max(1, p.speed / 3.6);
      evento(corrida, { tipo: "chegada", nome: p.nome, jogador: p === jogador });
    }
  }
  const posDepois = posicaoDe(corrida);
  if (posDepois < posAntes) evento(corrida, { tipo: "ultrapassagem", posicao: posDepois });
  if (jogador.engineBlown || jogador.totaled || jogador.chegada !== null) encerrar(corrida);
}

function encerrar(corrida) {
  const { jogador, pilotos } = corrida;
  // Quem ainda não chegou: o tempo que faltava no ritmo de agora (quem quebrou não chega).
  for (const p of pilotos) if (p.chegada === null && !p.totaled && !p.engineBlown) {
    p.estimada = corrida.tempo + (corrida.comprimento - p.z) / Math.max(15, p.speed / 3.6 * 1.08);
  }
  const fora = (p) => p.totaled || p.engineBlown;
  const ordem = [...pilotos].sort((a, b) => fora(a) - fora(b) || (a.chegada ?? a.estimada ?? Infinity) - (b.chegada ?? b.estimada ?? Infinity));
  corrida.fase = "fim";
  corrida.resultado = {
    motivo: jogador.engineBlown ? "motor" : jogador.totaled ? "perda-total" : "chegada",
    posicao: fora(jogador) ? null : ordem.indexOf(jogador) + 1,
    ordem: ordem.map((p) => ({ nome: p.nome, jogador: p === jogador, tempo: p.chegada ?? p.estimada ?? null, fora: fora(p) && (p.totaled ? "perda total" : "motor") })),
  };
}
