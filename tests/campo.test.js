// Física da Pelada (public/pelada/campo.js): passe do Strikers, escolha de quem recebe, jogador a pé e assistências.
// Roda em Node, sem navegador: é o mesmo arquivo que o servidor e a página usam.
const test = require("node:test");
const assert = require("node:assert");
const C = require("../public/pelada/campo.js");

const semErro = () => 0.5; // sorteio do erro do passe sempre no meio: erro zero (a conta fica exata)
const yawPara = (de, para) => Math.atan2(-(para.x - de.x), -(para.z - de.z));

// Planeja o passe, chuta de verdade (kick) e roda a bola (stepBall) com o receptor andando em linha reta.
// Devolve o plano e a menor distância entre a bola (rasteira ou baixa) e o receptor / o ponto mirado.
function passa(Fid, tipo, mate, { forca = 0, yaw = null } = {}) {
  const F = C.MODES[Fid];
  const p = { x: -10, y: 0, z: 0, vx: 0, vz: 0, id: "eu" };
  const plano = C.planejarPasse(F, p, yaw ?? yawPara(p, mate), mate ? [mate] : [], tipo, forca, false, 1, semErro);
  const b = C.newBall(F);
  b.x = p.x - Math.sin(plano.yaw) * 0.6; b.z = p.z - Math.cos(plano.yaw) * 0.6;
  const how = C.kick(b, p, plano.kind, 1, plano.yaw, 0, 0, F, { vel: plano.vel, elev: plano.elev, alvo: plano.alvo });
  const r = mate ? { ...mate } : null;
  let minR = Infinity, minP = Infinity;
  for (let t = 0; t < 5; t += 1 / 120) {
    if (r) { r.x += (mate.vx || 0) / 120; r.z += (mate.vz || 0) / 120; }
    C.stepBall(F, b, [], 1 / 120);
    if (b.y > 2) continue; // por cima da cabeça não conta
    if (r) minR = Math.min(minR, Math.hypot(b.x - r.x, b.z - r.z));
    minP = Math.min(minP, Math.hypot(b.x - plano.ponto.x, b.z - plano.ponto.z));
  }
  return { plano, how, minR, minP };
}

const RECEPTORES = {
  parado: { id: "m", x: 0, z: 0 },
  "correndo de frente": { id: "m", x: 0, z: 0, vx: 6, vz: 0 },
  "correndo de lado": { id: "m", x: 0, z: 0, vx: 0, vz: 6 },
};

for (const Fid of ["pes", "strikers"]) {
  test(`planejarPasse (${Fid}): curto e longo chegam no companheiro parado, correndo de frente e de lado`, () => {
    for (const tipo of ["curto", "longo"]) for (const [nome, m] of Object.entries(RECEPTORES)) {
      const { plano, how, minR } = passa(Fid, tipo, m);
      assert.strictEqual(how, "pe");
      assert.strictEqual(plano.alvo, "m", `${tipo}/${nome}: escolheu o receptor`);
      assert.ok(minR < 0.8, `${tipo}/${nome}: a bola passou a ${minR.toFixed(2)} m do receptor`);
    }
  });

  test(`planejarPasse (${Fid}): profundidade cai no ponto à frente de quem corre`, () => {
    for (const [nome, m] of Object.entries(RECEPTORES)) {
      const { plano, minP } = passa(Fid, "profundidade", m);
      assert.strictEqual(plano.alvo, "m");
      assert.ok(minP < 0.6, `profundidade/${nome}: a bola passou a ${minP.toFixed(2)} m do ponto`);
    }
    // parado ou correndo de lado, o ponto fica à frente dele (na direção da corrida, ou do gol se está parado)
    for (const nome of ["parado", "correndo de lado"]) {
      const m = RECEPTORES[nome], { plano } = passa(Fid, "profundidade", m);
      const v = m.vz ? { x: 0, z: m.vz } : { x: 1, z: 0 };
      assert.ok((plano.ponto.x - m.x) * v.x + (plano.ponto.z - m.z) * v.z > 1, `profundidade/${nome}: ponto à frente`);
    }
    // correndo de frente (fugindo de quem passa), a bola alcança ele
    assert.ok(passa(Fid, "profundidade", RECEPTORES["correndo de frente"]).minR < 0.8);
  });

  test(`planejarPasse (${Fid}): ninguém no cone é passe no espaço, na direção mandada`, () => {
    const atras = { id: "m", x: -20, z: 0 }; // quem passa está em x = -10 mirando +x: ele fica fora do cone
    for (const tipo of ["curto", "longo"]) for (const forca of [0, 0.5, 1]) {
      const { plano, minP } = passa(Fid, tipo, atras, { forca, yaw: -Math.PI / 2 });
      assert.strictEqual(plano.alvo, null);
      assert.ok(Math.abs(plano.ponto.z) < 1e-9 && plano.ponto.x > -10, "ponto na direção da mira");
      assert.ok(minP < 0.6, `${tipo}/força ${forca}: a bola passou a ${minP.toFixed(2)} m do ponto`);
    }
  });
}

test("escolherReceptor: o mais centralizado e mais perto dentro do cone", () => {
  const p = { x: 0, z: 0 }, yaw = -Math.PI / 2; // mirando para +x
  const centro = { id: "centro", x: 10, z: 0 }, torto = { id: "torto", x: 10, z: 2 }, longe = { id: "longe", x: 25, z: 0 };
  const fora = { id: "fora", x: 0, z: 10 }, colado = { id: "colado", x: 1, z: 0 }, muitoLonge = { id: "muitoLonge", x: 40, z: 0 };
  assert.strictEqual(C.escolherReceptor(p, yaw, [torto, centro, longe]).id, "centro");
  assert.strictEqual(C.escolherReceptor(p, yaw, [longe, torto]).id, "torto"); // perto e um pouco torto ganha do longe
  assert.strictEqual(C.escolherReceptor(p, yaw, [fora, colado, muitoLonge]), null);
  assert.strictEqual(C.escolherReceptor(p, yaw, []), null);
});

test("movePlayer: anda, pula, fica dentro da quadra e o corpo molinho segura a virada", () => {
  const F = C.MODES.pes, dt = 1 / 60;
  const novo = () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true });
  // sem molinho: chega na velocidade pedida e não mexe na mola
  const a = novo();
  for (let i = 0; i < 60; i++) C.movePlayer(a, { x: 1, z: 0, speed: C.RUN }, dt, F);
  assert.ok(Math.abs(a.vx - C.RUN) < 1e-9 && a.x > 4);
  assert.strictEqual(a.balanco, undefined);
  // pulo
  C.movePlayer(a, { x: 0, z: 0, speed: 0, jump: true }, dt, F);
  assert.ok(a.y > 0 && !a.onGround);
  for (let i = 0; i < 120; i++) C.movePlayer(a, { x: 0, z: 0, speed: 0 }, dt, F);
  assert.ok(a.y === 0 && a.onGround);
  // parede
  const b = novo();
  for (let i = 0; i < 600; i++) C.movePlayer(b, { x: 1, z: 1, speed: C.SPRINT }, dt, F);
  assert.ok(Math.abs(b.x - (F.L - C.P_R)) < 1e-9 && Math.abs(b.z - (F.W - C.P_R)) < 1e-9);
  // meia-volta: com molinho, a aceleração cai enquanto o tronco balança (a velocidade máxima é a mesma)
  const vira = (molinho) => {
    const p = novo();
    for (let i = 0; i < 60; i++) C.movePlayer(p, { x: 1, z: 0, speed: C.RUN, molinho }, dt, F);
    for (let i = 0; i < 9; i++) C.movePlayer(p, { x: -1, z: 0, speed: C.RUN, molinho }, dt, F);
    return p;
  };
  const duro = vira(false), mole = vira(true);
  assert.ok(mole.balanco > 0.2, `balanço ${mole.balanco}`);
  assert.ok(mole.vx > duro.vx + 0.3, `molinho freia menos na virada (${mole.vx.toFixed(2)} contra ${duro.vx.toFixed(2)})`);
  // determinístico
  assert.deepStrictEqual(vira(true), mole);
});

test("assistShot: puxa para o canto só no último terço, sem efeito e dentro do cone", () => {
  const F = C.MODES.pes, team = "A"; // A ataca para +x
  const p = { x: F.L - 6, z: 0 };
  const gol = Math.atan2(-(F.L - p.x), -0); // mirando o meio do gol
  assert.strictEqual(C.assistShot(p, gol, team, F), gol); // já vai no gol: fica como está
  const torto = Math.atan2(-(F.L - p.x), -(F.goalW + 1.2)); // um pouco para fora da trave
  const puxado = C.assistShot(p, torto, team, F);
  assert.notStrictEqual(puxado, torto);
  // o canto escolhido fica dentro das traves
  const dirz = -Math.cos(puxado), dirx = -Math.sin(puxado), z = p.z + dirz * (F.L - p.x) / dirx;
  assert.ok(Math.abs(z) < F.goalW && Math.abs(z) > F.goalW - 0.5, `canto em z = ${z.toFixed(2)}`);
  const muitoTorto = Math.atan2(-(F.L - p.x), -(F.goalW + 10));
  assert.strictEqual(C.assistShot(p, muitoTorto, team, F), muitoTorto); // fora do cone: mira pura
  assert.strictEqual(C.assistShot(p, torto, team, F, 0.5), torto); // com efeito: mira pura
  assert.strictEqual(C.assistShot({ x: 0, z: 0 }, torto, team, F), torto); // meio de campo: mira pura
  assert.strictEqual(C.assistShot(p, torto, team, C.MODES.carros), torto); // carros: sem assistência
});

test("assistPass: mira no companheiro do cone, lança quem está longe e deixa a mira sem ninguém", () => {
  const F = C.MODES.pes, p = { x: 0, z: 0 }, yaw = -Math.PI / 2;
  const perto = { id: "perto", x: 10, z: 1 };
  const r = C.assistPass(p, yaw, [perto], 0.3, false, F);
  assert.strictEqual(r.alvo.id, "perto");
  assert.ok(Math.abs(r.yaw - yawPara(p, perto)) < 1e-9);
  assert.ok(r.power >= 0 && r.power <= 1);
  const longe = { id: "longe", x: 22, z: 0 };
  const l = C.assistPass(p, yaw, [longe], 0.5, false, F);
  assert.strictEqual(l.kind, "lancamento");
  const nada = C.assistPass(p, yaw, [{ id: "atras", x: -10, z: 0 }], 0.4, false, F);
  assert.deepStrictEqual(nada, { yaw, power: 0.4 });
  // correndo: mira à frente dele
  const corre = { id: "corre", x: 10, z: 0, vx: 0, vz: 5 };
  const c = C.assistPass(p, yaw, [corre], 0.3, false, F);
  assert.ok(c.alvo.z > 0.5);
  // colocado: sai mais forte que o normal
  assert.ok(C.assistPass(p, yaw, [perto], 0, true, F).power > C.assistPass(p, yaw, [perto], 0, false, F).power);
});
