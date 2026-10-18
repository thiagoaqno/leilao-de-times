const { test } = require('node:test');
const assert = require('node:assert/strict');

const carregar = () => import('../public/table-tennis-pro/physics.mjs');

test('saque quica primeiro no próprio lado e depois no rival', async () => {
  const { sacar, passoBola, FISICA } = await carregar();
  for (const lado of [0, 1]) {
    const bola = sacar(lado, 0.2, -0.3);
    const contatos = [];
    for (let i = 0; i < 180 && bola.ativa && contatos.length < 2; i++) {
      for (const evento of passoBola(bola)) contatos.push(evento);
    }
    assert.deepEqual(contatos.map((evento) => [evento.tipo, evento.lado]), [['mesa', lado], ['mesa', 1 - lado]]);
    assert.ok(bola.v.y > 0);
    assert.equal(FISICA.quiqueMesa, 0.6);
  }
});

test('devolução cruza a rede e quica na metade adversária', async () => {
  const { criarBola, rebater, passoBola } = await carregar();
  for (const lado of [0, 1]) {
    const bola = criarBola(0.12, 0.55, lado === 0 ? -1.52 : 1.52);
    rebater(bola, lado, -0.35, 0.85, 1.05, { lateral: 0.35, frontal: -0.25 });
    let primeiro;
    for (let i = 0; i < 150 && bola.ativa && !primeiro; i++) primeiro = passoBola(bola)[0];
    assert.equal(primeiro?.tipo, 'mesa');
    assert.equal(primeiro?.lado, 1 - lado);
    assert.ok(Math.abs(primeiro.x + 0.35) < 0.08);
  }
});

test('rede interrompe bola baixa e previsão encontra a raquete', async () => {
  const { criarBola, passoBola, sacar, preverIntercepcao } = await carregar();
  const baixa = criarBola(0, 0.45, -0.05);
  baixa.v.z = 1;
  assert.equal(passoBola(baixa, 0.1)[0]?.tipo, 'rede');
  assert.equal(baixa.ativa, false);
  const previsao = preverIntercepcao(sacar(0), 1, 1.52);
  assert.ok(previsao);
  assert.ok(previsao.y > 0.4 && previsao.y < 1);
});

test('game exige dois pontos de diferença e saque alterna no empate final', async () => {
  const { vencedorDoGame, sacadorDoPonto } = await carregar();
  assert.equal(vencedorDoGame([11, 10]), null);
  assert.equal(vencedorDoGame([12, 10]), 0);
  assert.equal(vencedorDoGame([10, 12]), 1);
  assert.equal(sacadorDoPonto([10, 10], 0), 0);
  assert.equal(sacadorDoPonto([11, 10], 0), 1);
});
