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
  linearRampToValueAtTime(v) { this.alvo = v; }
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

// carrega o módulo ESM de public/corrida/motor-v6.js sem o "export" (o jogo carrega como módulo no navegador)
function modulo() {
  const fonte = fs.readFileSync(path.join(__dirname, '../public/corrida/motor-v6.js'), 'utf8').replace(/^export /gm, '');
  const contexto = {};
  vm.runInNewContext(`${fonte}\nglobalThis.M = { rpmV6, rotacaoPorVelocidade, GRUPOS, ESCAPAMENTO, CAMERAS, TURBO_HZ, criarMotorF1 };`, contexto);
  return contexto.M;
}
const quadro = (m, c, t, extra = {}) => { c.currentTime = t; m.atualizar(t, { gas: true, rpm: 0.8, marcha: 4, ativo: true, cam: 'perto', lim: 0, ers: false, freio: false, ...extra }); };
const freqs = (c) => c.osciladores.map((o) => o.frequency.alvo);

test('o rpm do câmbio vira de 6.000 a 12.500 rpm do V6 (troca) e 15.000 no corte, com marcha lenta em 4.000', () => {
  const { rpmV6 } = modulo();
  assert.equal(rpmV6(0), 4000);
  assert.equal(Math.round(rpmV6(0.3)), 6000);
  assert.equal(Math.round(rpmV6(1)), 12500);
  assert.equal(Math.round(rpmV6(1.04)), 15000);
  let ant = 0; for (let r = 0; r <= 1.05; r += 0.01) { const v = rpmV6(r); assert.ok(v >= ant, 'a rotação só sobe com a fração do câmbio'); ant = v; }
});

test('o V6 soa na 3ª ordem, com meias-ordens (1,5) e ordens baixas, mais grave que o V10', () => {
  const { GRUPOS, ESCAPAMENTO, CAMERAS } = modulo();
  assert.equal(GRUPOS.explosao.ordem, 3, 'seis cilindros: três explosões por volta');
  assert.equal(GRUPOS.baixo.ordem, 0.5);
  assert.equal(GRUPOS.meia.ordem, 1.5, 'o disparo desigual a 90°');
  assert.ok(GRUPOS.explosao.amp.length >= 8 && GRUPOS.explosaoBarata.amp.length < GRUPOS.explosao.amp.length);
  assert.ok(ESCAPAMENTO.length >= 3 && ESCAPAMENTO.every((r) => r.f < 2000), 'ressonâncias baixas, a turbina abafa o agudo');
  assert.ok(CAMERAS.cockpit.adm > CAMERAS.perto.adm && CAMERAS.cockpit.baixo > CAMERAS.perto.baixo, 'por dentro: mais admissão e grave');
  assert.ok(CAMERAS.cockpit.turbo > CAMERAS.perto.turbo && CAMERAS.cockpit.mgu > CAMERAS.perto.mgu, 'por dentro se ouve mais o turbo e o MGU-K');
  assert.ok(CAMERAS.perto.ar > CAMERAS.cockpit.ar, 'por fora: mais ar');
});

test('a nota de explosão vai a 750 Hz no corte e a 200 Hz na lenta; o motor não cria nós por quadro', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  quadro(m, c, 0, { rpm: 1.04 });
  assert.ok(freqs(c).some((f) => Math.abs(f - 15000 / 20) < 1), '15.000 rpm × 3 / 60');
  assert.ok(freqs(c).some((f) => Math.abs(f - 15000 / 120) < 1), 'e a ordem 0,5 em 125 Hz');
  assert.ok(freqs(c).some((f) => Math.abs(f - 15000 / 40) < 1), 'e a meia-ordem 1,5 em 375 Hz');
  quadro(m, c, 0.5, { rpm: 0, gas: false });
  assert.ok(freqs(c).some((f) => Math.abs(f - 200) < 1), 'marcha lenta: 4.000 × 3 / 60');
  const nos = c.criados;
  for (let i = 1; i <= 20; i++) quadro(m, c, 1 + i * 0.016, { rpm: 0.5 + i * 0.02, cam: i % 2 ? 'cockpit' : 'perto', lim: i > 15 ? 1 : 0, ers: i % 3 === 0, freio: i % 4 === 0 });
  assert.equal(c.criados, nos, 'só parâmetros mudam por quadro');
});

test('o assobio do turbo sobe com a carga e demora a cair ao tirar o pé; o MGU-K zumbe mais com o ERS', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  const maisAgudo = () => Math.max(...freqs(c).filter((f) => f > 1800 && f < 8000));
  quadro(m, c, 0, { rpm: 0.4, gas: false });
  const parado = maisAgudo();
  for (let i = 1; i <= 120; i++) quadro(m, c, i * 0.016, { rpm: 0.95 });
  const cheio = maisAgudo();
  assert.ok(cheio > parado + 800, 'o assobio sobe com a carga');
  assert.ok(cheio <= M.TURBO_HZ[1] * 1.5 + 1, 'e fica dentro da faixa do turbo');
  quadro(m, c, 2.0, { rpm: 0.95, gas: false });
  quadro(m, c, 2.1, { rpm: 0.95, gas: false });
  assert.ok(maisAgudo() > parado + 400, 'o turbo ainda gira logo depois de tirar o pé (atraso)');
});

test('ao tirar o pé em alta há o sopro do turbo e pipocos abafados; ao reduzir, blip e pipocos', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  quadro(m, c, 0, { rpm: 0.9 });
  const antes = c.fontes.length;
  quadro(m, c, 0.1, { rpm: 0.85, gas: false });
  assert.ok(c.fontes.length > antes, 'sopro e primeiro pipoco ao aliviar');
  const depois = c.fontes.length;
  quadro(m, c, 0.2, { rpm: 0.9, marcha: 3, gas: false });
  assert.ok(c.fontes.length > depois, 'a redução pipoca');
});

test('os carros dos outros usam Doppler: mais agudo chegando, mais grave saindo', () => {
  const M = modulo(), c = new ContextoAudio(), m = M.criarMotorF1(c, noAudio(c), noAudio(c));
  const alvos = () => c.osciladores.map((o) => o.frequency.alvo);
  m.outros(0, [{ dist: 20, vRel: 60, v: 70, lado: 0.2 }], 1, true);
  const chegando = Math.max(...alvos());
  m.outros(0.1, [{ dist: 20, vRel: -60, v: 70, lado: 0.2 }], 1, true);
  const saindo = Math.max(...alvos());
  assert.ok(chegando > saindo * 1.3, 'o salto do Doppler é forte');
});
