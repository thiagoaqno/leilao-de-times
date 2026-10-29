const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Parametro {
  constructor() { this.value = 0; this.alvo = 0; }
  setTargetAtTime(v) { this.alvo = v; }
  setValueAtTime(v) { this.alvo = v; }
  exponentialRampToValueAtTime(v) { this.alvo = v; }
}
// um nó qualquer: toda propriedade que não existe vira um parâmetro (frequency, gain, detune, delayTime, pan...)
function noAudio(ctx) {
  ctx.criados++;
  return new Proxy({ connect() { return this; }, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {} }, {
    get(t, k) { if (!(k in t) && typeof k === 'string') t[k] = new Parametro(); return t[k]; },
  });
}
class ContextoAudio {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.criados = 0; this.osciladores = []; this.fontes = []; }
  createGain() { return noAudio(this); }
  createBiquadFilter() { return noAudio(this); }
  createWaveShaper() { return noAudio(this); }
  createDynamicsCompressor() { return noAudio(this); }
  createDelay() { return noAudio(this); }
  createStereoPanner() { return noAudio(this); }
  createPeriodicWave() { return {}; }
  createOscillator() { const no = noAudio(this); this.osciladores.push(no); return no; }
  createBufferSource() { const no = noAudio(this); this.fontes.push(no); return no; }
  createBuffer(canais, len) { return { getChannelData: () => new Float32Array(len) }; }
}

// carrega o módulo ESM de public/corrida/motor-v10.js sem o "export" (o jogo carrega como módulo no navegador)
function modulo() {
  const fonte = fs.readFileSync(path.join(__dirname, '../public/corrida/motor-v10.js'), 'utf8').replace(/^export /gm, '');
  const contexto = {};
  vm.runInNewContext(`${fonte}\nglobalThis.M = { rpmV10, rotacaoPorVelocidade, GRUPOS, ESCAPAMENTO, CAMERAS, criarMotorF1 };`, contexto);
  return contexto.M;
}
const quadro = (m, c, t, extra = {}) => { c.currentTime = t; m.atualizar(t, { gas: true, rpm: 0.8, marcha: 4, ativo: true, cam: 'perto', lim: 0, ...extra }); };

test('o rpm do câmbio vira de 6.500 a 19.000 rpm do V10, com marcha lenta em 4.000', () => {
  const { rpmV10 } = modulo();
  assert.equal(rpmV10(0), 4000);
  assert.equal(Math.round(rpmV10(0.3)), 6500);
  assert.equal(Math.round(rpmV10(1)), 19000);
  let ant = 0; for (let r = 0; r <= 1.04; r += 0.02) { const v = rpmV10(r); assert.ok(v >= ant, 'a rotação só sobe com a fração do câmbio'); ant = v; }
});

test('o som é uma soma de ordens do virabrequim, não uma nota só', () => {
  const { GRUPOS, ESCAPAMENTO, CAMERAS } = modulo();
  assert.equal(GRUPOS.explosao.ordem, 5, 'a explosão do V10 é a 5ª ordem');
  assert.ok(GRUPOS.explosao.amp.length >= 8 && GRUPOS.baixo.ordem === 0.5 && GRUPOS.meia.ordem === 2.5);
  assert.ok(GRUPOS.explosaoBarata.amp.length < GRUPOS.explosao.amp.length, 'os outros carros usam menos ordens');
  assert.ok(ESCAPAMENTO.length >= 3 && ESCAPAMENTO.every((r) => r.f < 3000), 'ressonâncias fixas do escapamento');
  assert.ok(CAMERAS.cockpit.adm > CAMERAS.perto.adm && CAMERAS.cockpit.baixo > CAMERAS.perto.baixo, 'por dentro: mais admissão e grave');
  assert.ok(CAMERAS.perto.ar > CAMERAS.cockpit.ar, 'por fora: mais ar');
});

test('a nota de explosão chega a ~1.583 Hz no corte e o motor não cria nós por quadro', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  quadro(m, c, 0, { rpm: 1 });
  assert.ok(c.osciladores.some((o) => Math.abs(o.frequency.alvo - 19000 / 12) < 1), '19.000 rpm × 5 / 60');
  assert.ok(c.osciladores.some((o) => Math.abs(o.frequency.alvo - 19000 / 120) < 1), 'e a meia-ordem em 158 Hz');
  const nos = c.criados;
  for (let i = 1; i <= 20; i++) quadro(m, c, i * 0.016, { rpm: 0.5 + i * 0.02, cam: i % 2 ? 'cockpit' : 'perto', lim: i > 15 ? 1 : 0 });
  assert.equal(c.criados, nos, 'só parâmetros mudam por quadro');
});

test('ao tirar o pé em alta o escapamento estala; ao reduzir há blip e pipocos', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  quadro(m, c, 0, { rpm: 0.9 });
  const antes = c.fontes.length;
  quadro(m, c, 0.1, { rpm: 0.85, gas: false });
  assert.ok(c.fontes.length > antes, 'primeiro pipoco ao aliviar');
  const depois = c.fontes.length;
  quadro(m, c, 0.2, { rpm: 0.9, marcha: 3, gas: false });
  assert.ok(c.fontes.length > depois, 'a redução pipoca');
});

test('os carros dos outros usam Doppler: mais agudo chegando, mais grave saindo', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  const freqs = () => c.osciladores.map((o) => o.frequency.alvo);
  m.outros(0, [{ dist: 20, vRel: 60, v: 70, lado: 0.2 }], 1, true);
  const chegando = Math.max(...freqs());
  m.outros(0.1, [{ dist: 20, vRel: -60, v: 70, lado: 0.2 }], 1, true);
  const saindo = Math.max(...freqs());
  assert.ok(chegando > saindo * 1.3, 'o salto do Doppler é forte');
});
