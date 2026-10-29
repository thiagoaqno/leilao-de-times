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
class NoAudio {
  constructor() { this.frequency = new Parametro(); this.gain = new Parametro(); this.Q = new Parametro(); }
  connect() { return this; }
  start() {}
  stop() {}
}
class ContextoAudio {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = new NoAudio(); this.osciladores = []; this.fontes = []; ContextoAudio.atual = this; }
  createGain() { return new NoAudio(); }
  createBiquadFilter() { return new NoAudio(); }
  createConvolver() { return new NoAudio(); }
  createOscillator() { const no = new NoAudio(); this.osciladores.push(no); return no; }
  createBufferSource() { const no = new NoAudio(); this.fontes.push(no); return no; }
  createBuffer(n, len) { return { getChannelData: () => new Float32Array(len) }; }
}

function som() {
  let fonte = fs.readFileSync(path.join(__dirname, '../public/corrida/sons.js'), 'utf8');
  fonte = fonte.slice(0, fonte.indexOf('function renderSoundBtn()'))
    .replace(/^import .*\r?\n/m, '').replace('export const Sound =', 'const Sound =');
  const contexto = { window: { AudioContext: ContextoAudio }, store: { get: () => undefined, set() {} }, $: () => null };
  vm.runInNewContext(`${fonte}\nglobalThis.SomTeste = Sound;`, contexto);
  return contexto.SomTeste;
}

test('o V8 sobe a 1200 Hz no corte e o escapamento estala ao tirar o pé', () => {
  const Sound = som();
  Sound.engine(300, true, true, 4, 1, true, [], { x: 0, y: 0, vx: 0, vy: 0 });
  const c = ContextoAudio.atual;
  assert.ok(c.osciladores.some((o) => o.frequency.alvo === 1200), 'quatro ignições por volta a 18.000 rpm');
  assert.equal(c.osciladores.some((o) => o.type === 'sine'), false, 'V8 aspirado sem assobio de turbo');
  const antes = c.fontes.length;
  c.currentTime = 0.1;
  Sound.engine(280, true, false, 4, 0.85, true, [], { x: 0, y: 0, vx: 0, vy: 0 });
  assert.equal(c.fontes.length, antes + 1, 'primeiro estalo ao aliviar o acelerador');
  c.currentTime = 0.2;
  Sound.engine(260, true, false, 4, 0.75, true, [], { x: 0, y: 0, vx: 0, vy: 0 });
  assert.ok(c.fontes.length > antes + 1, 'estalos continuam durante a desaceleração');
});

test('o modo kart não cria a camada de escapamento do V8', () => {
  const Sound = som();
  Sound.engine(100, true, true, 0, 0, false);
  const c = ContextoAudio.atual, fontes = c.fontes.length;
  c.currentTime = 0.1;
  Sound.engine(90, true, false, 0, 0, false);
  assert.equal(c.fontes.length, fontes);
  assert.equal(c.osciladores.length, 3);
});
