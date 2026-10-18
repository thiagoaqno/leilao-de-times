// Escala: 1 unidade desta cena = 10 unidades do build Unity analisado.
// Os valores de gravidade, colisão e material vêm do build; a escolha do alvo
// e a conversão do gesto em efeito são aproximações, pois o código da tacada
// está compilado no WebAssembly sem símbolos.
export const MESA = Object.freeze({ largura: 1.525, comprimento: 2.74, topo: 0.38, rede: 0.152 });
export const FISICA = Object.freeze({
  gravidade: 0.981,
  raio: 0.025,
  massa: 0.27,
  quiqueMesa: 0.6,
  quiqueRede: 0.05,
  atritoDinamico: 0.01,
  limiarQuique: 0.2,
  passo: 0.02,
  escalaTempo: 2,
});

export const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));
export const sinal = (lado) => lado === 0 ? -1 : 1;

export function criarBola(x = 0, y = MESA.topo + 0.35, z = 0) {
  return { p: { x, y, z }, v: { x: 0, y: 0, z: 0 }, giro: { lateral: 0, frontal: 0 }, ativa: true };
}

function aceleracao(bola) {
  return {
    x: bola.giro.lateral * 0.16,
    y: -FISICA.gravidade - bola.giro.frontal * 0.11,
  };
}

export function passoBola(bola, dt = FISICA.passo) {
  if (!bola.ativa) return [];
  const eventos = [];
  const anterior = { ...bola.p };
  const a = aceleracao(bola);
  bola.p.x += bola.v.x * dt + 0.5 * a.x * dt * dt;
  bola.p.y += bola.v.y * dt + 0.5 * a.y * dt * dt;
  bola.p.z += bola.v.z * dt;
  bola.v.x += a.x * dt;
  bola.v.y += a.y * dt;

  const passouRede = anterior.z * bola.p.z <= 0 && anterior.z !== bola.p.z;
  if (passouRede) {
    const fracao = -anterior.z / (bola.p.z - anterior.z);
    const xRede = anterior.x + (bola.p.x - anterior.x) * fracao;
    const yRede = anterior.y + (bola.p.y - anterior.y) * fracao;
    if (Math.abs(xRede) <= MESA.largura / 2 + FISICA.raio &&
        yRede <= MESA.topo + MESA.rede + FISICA.raio &&
        yRede >= MESA.topo - FISICA.raio) {
      bola.p.z = anterior.z;
      bola.v.z *= -FISICA.quiqueRede;
      bola.ativa = false;
      eventos.push({ tipo: "rede" });
      return eventos;
    }
  }

  const alturaContato = MESA.topo + FISICA.raio;
  if (anterior.y > alturaContato && bola.p.y <= alturaContato && bola.v.y < 0) {
    const fracao = (anterior.y - alturaContato) / (anterior.y - bola.p.y);
    const x = anterior.x + (bola.p.x - anterior.x) * fracao;
    const z = anterior.z + (bola.p.z - anterior.z) * fracao;
    if (Math.abs(x) <= MESA.largura / 2 && Math.abs(z) <= MESA.comprimento / 2) {
      bola.p.x = x;
      bola.p.y = alturaContato;
      bola.p.z = z;
      const impacto = -bola.v.y;
      bola.v.y = impacto >= FISICA.limiarQuique ? impacto * FISICA.quiqueMesa : 0;
      // O material da bola usa a menor fricção do par: a tangente muda pouco.
      bola.v.x = bola.v.x * (1 - FISICA.atritoDinamico) + bola.giro.lateral * 0.035;
      bola.v.z = bola.v.z * (1 - FISICA.atritoDinamico) + Math.sign(bola.v.z) * bola.giro.frontal * 0.04;
      bola.giro.lateral *= 0.65;
      bola.giro.frontal *= 0.65;
      eventos.push({ tipo: "mesa", lado: z < 0 ? 0 : 1, x, z });
      return eventos;
    }
    bola.ativa = false;
    eventos.push({ tipo: "fora", x, z });
    return eventos;
  }
  if (bola.p.y < FISICA.raio || Math.abs(bola.p.z) > 3.5 || Math.abs(bola.p.x) > 2.4) {
    bola.ativa = false;
    eventos.push({ tipo: "fora", x: bola.p.x, z: bola.p.z });
  }
  return eventos;
}

export function sacar(lado, xRaquete = 0, xAlvo = 0) {
  const s = sinal(lado);
  const zInicio = s * 1.62;
  const zPrimeiro = s * 0.70;
  const zSegundo = -s * 0.94;
  const tSegundo = 1.25;
  const vzDepois = (zSegundo - zPrimeiro) / tSegundo;
  const vzAntes = vzDepois / (1 - FISICA.atritoDinamico);
  const tPrimeiro = (zPrimeiro - zInicio) / vzAntes;
  const vyDepois = FISICA.gravidade * tSegundo / 2;
  const vyAntesQuique = -vyDepois / FISICA.quiqueMesa;
  const vyInicio = vyAntesQuique + FISICA.gravidade * tPrimeiro;
  const yInicio = MESA.topo + FISICA.raio - vyInicio * tPrimeiro + FISICA.gravidade * tPrimeiro * tPrimeiro / 2;
  const xPrimeiro = limitar(xRaquete * 0.55, -0.45, 0.45);
  const xSegundo = limitar(xAlvo, -0.63, 0.63);
  const vxDepois = (xSegundo - xPrimeiro) / tSegundo;
  const vxInicio = vxDepois / (1 - FISICA.atritoDinamico);
  const bola = criarBola(xPrimeiro - vxInicio * tPrimeiro, yInicio, zInicio);
  bola.v = { x: vxInicio, y: vyInicio, z: vzAntes };
  return bola;
}

export function rebater(bola, lado, alvoX, alvoZ, tempoDesejado, giro = { lateral: 0, frontal: 0 }) {
  const x = bola.p.x, y = bola.p.y, z = bola.p.z;
  const tx = limitar(alvoX, -1.12, 1.12);
  const tz = -sinal(lado) * limitar(Math.abs(alvoZ), 0.42, 1.15);
  const w = { lateral: limitar(giro.lateral, -1, 1), frontal: limitar(giro.frontal, -1, 1) };
  const ax = w.lateral * 0.16;
  const g = FISICA.gravidade + w.frontal * 0.11;
  const velocidade = (t) => ({
    x: (tx - x - 0.5 * ax * t * t) / t,
    y: (MESA.topo + FISICA.raio - y + 0.5 * g * t * t) / t,
    z: (tz - z) / t,
  });
  let tempo = limitar(tempoDesejado, 0.75, 1.45);
  let v = velocidade(tempo);
  const alturaRede = (vel, t) => {
    const cruzamento = -z / vel.z;
    return y + vel.y * cruzamento - 0.5 * g * cruzamento * cruzamento;
  };
  for (let i = 0; i < 30 && alturaRede(v, tempo) < MESA.topo + MESA.rede + FISICA.raio + 0.012; i++) {
    tempo += 0.025;
    v = velocidade(tempo);
  }
  bola.v = v;
  bola.giro = w;
  bola.ativa = true;
  return bola;
}

export function preverIntercepcao(bola, lado, zRaquete) {
  const copia = { p: { ...bola.p }, v: { ...bola.v }, giro: { ...bola.giro }, ativa: bola.ativa };
  for (let i = 0; i < 190 && copia.ativa; i++) {
    const zAntes = copia.p.z;
    passoBola(copia);
    if ((zAntes - zRaquete) * (copia.p.z - zRaquete) <= 0 &&
        Math.sign(copia.v.z) === sinal(lado)) {
      return { x: copia.p.x, y: copia.p.y, tempo: i * FISICA.passo };
    }
  }
  return null;
}

export function vencedorDoGame(pontos) {
  const maior = Math.max(...pontos);
  return maior >= 11 && Math.abs(pontos[0] - pontos[1]) >= 2 ? pontos.indexOf(maior) : null;
}

export function sacadorDoPonto(pontos, inicial = 0) {
  const total = pontos[0] + pontos[1];
  return (inicial + (pontos[0] >= 10 && pontos[1] >= 10 ? total : Math.floor(total / 2))) % 2;
}
