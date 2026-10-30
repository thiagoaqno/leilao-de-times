// Corrida da Galera — sons sintetizados (kart e F1, derrapagem, batidas e largada). O motor de F1 (V10) fica em motor-v10.js.
import { $, store } from "./estado.js";
import { criarMotorF1 } from "./motor-v10.js";

// ---------- sons ----------
export const Sound = (() => {
  let ac = null, on = store.get("corrida:sound") !== false, eng = null, skidG = null, master = null, volume = Math.max(0, Math.min(1, store.get("corrida:volume") ?? 0.7));
  // todo som passa pelo volume geral (o deslizante do cabeçalho e da corrida)
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = volume; master.connect(ac.destination); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "square", vol = 0.12, at = 0 } = {}) {
    const c = ctx(); if (!c || !on) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // motor de kart: dente de serra e quadrada num filtro; a rotação vem do câmbio (sobe até o corte, cai na troca e dá um
  // tranco), mais o sopro do vento, que cresce com a velocidade
  const MARCHAS = [0, 110, 190, 270, 350, 1e9];
  let marcha = 1, troca = 0;
  // o som ambiente das pistas (pista-som.js) passa por um barramento que abre e fecha junto com o motor (só na corrida);
  // o eco do túnel é um envio do motor para uma reverberação (ruído que se apaga em 1,4 s)
  let ambBus = null, ecoG = null;
  let motorF1 = null; // o motor de F1 (motor-v10.js), criado na primeira vez que as regras de F1 pedem
  let motorBus = null; // os motores de F1 (o meu e os dos outros) passam por aqui: abaixam enquanto o engenheiro fala
  function barramento() { const c = ctx(); if (!c) return null; if (!ambBus) { ambBus = c.createGain(); ambBus.gain.value = 0; ambBus.connect(master); } return ambBus; }
  function reverb(c) {
    const len = Math.floor(c.sampleRate * 1.4), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = c.createConvolver(); conv.buffer = b; ecoG = c.createGain(); ecoG.gain.value = 0; conv.connect(ecoG).connect(master); reverbExistente = conv; return conv;
  }
  let reverbExistente = null;
  function engine(speed, racing, gas = true, marchaF1 = 0, rpmF1 = 0, f1 = null) {
    const c = ctx(); if (!c) return;
    if (!eng) {
      const o = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = "sawtooth"; o2.type = "square"; o3.type = "triangle"; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0;
      o.connect(f); o2.connect(f); o3.connect(f); f.connect(g).connect(master); g.connect(reverb(c)); o.start(); o2.start(); o3.start();
      const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), wf = c.createBiquadFilter(), wg = c.createGain(); src.buffer = b; src.loop = true; wf.type = "bandpass"; wf.frequency.value = 600; wf.Q.value = 0.7; wg.gain.value = 0;
      src.connect(wf).connect(wg).connect(master); src.start();
      eng = { o, o2, o3, f, g, wg };
    }
    const v = Math.abs(speed), t = c.currentTime;
    const nova = marchaF1 || MARCHAS.findIndex((m, i) => i > 0 && v < m); // a marcha do câmbio (ou pela velocidade)
    if (nova !== marcha) { if (nova > marcha) troca = 0.1; marcha = nova; }
    troca = Math.max(0, troca - 0.016);
    const ini = MARCHAS[marcha - 1] || 0, fim = MARCHAS[marcha] > 1e8 || !MARCHAS[marcha] ? ini + 65 : MARCHAS[marcha], rpm = marchaF1 ? Math.min(1.02, rpmF1) : Math.min(1, Math.max(0, (v - ini) / (fim - ini)));
    const base = 38 + rpm * 70 + marcha * 3; // Hz (8 marchas: a rotação sobe até o corte e cai a cada troca)
    eng.o.frequency.setTargetAtTime(base, t, 0.04); eng.o2.frequency.setTargetAtTime(base / 2, t, 0.04); eng.o3.frequency.setTargetAtTime(base * 2, t, 0.04);
    eng.f.frequency.setTargetAtTime(500 + rpm * 1400 + v * 2, t, 0.06);
    eng.g.gain.setTargetAtTime(on && racing && !f1 ? (0.035 + rpm * 0.02) * (troca > 0 ? 0.3 : 1) : 0, t, 0.05);
    eng.wg.gain.setTargetAtTime(on && racing ? Math.min(0.05, v * 0.00011) : 0, t, 0.1);
    if (f1) { if (!motorF1) { motorBus = c.createGain(); motorBus.connect(master); motorF1 = criarMotorF1(c, motorBus, reverbExistente); } motorF1.atualizar(t, { gas, rpm: rpmF1, marcha: marchaF1 || 1, ativo: on && racing, cam: f1.cam, lim: f1.lim || 0 }); } else if (motorF1) motorF1.silenciar(t);
    if (ambBus) ambBus.gain.setTargetAtTime(on && racing ? 1 : 0, t, 0.4);
    if (!racing && ecoG) ecoG.gain.setTargetAtTime(0, t, 0.1);
  }
  // batida: um estalo grave e um sopro de ruído, mais forte quanto maior a força
  // os carros dos outros por perto (regras de F1): lista de { dist (m), vRel (m/s, positivo = se aproximando), v (m/s), lado (-1 a 1) }
  // já em ordem de distância, n valem; só os 3 mais perto soam (volume pela distância e Doppler)
  function outros(lista, n) { if (motorF1 && ac) motorF1.outros(ac.currentTime, lista, n, on && n > 0); }
  // chuva: um chiado de ruído filtrado (o mesmo buffer, em loop) pela intensidade da chuva, e o chiado dos pneus no molhado;
  // preparado ao iniciar uma corrida com chuva prevista, e sempre abaixo do motor
  let chuvaN = null;
  function chuva(nivel, pneus, preparar = false) {
    if (!preparar && !chuvaN && nivel < 0.01 && pneus < 0.01) return;
    const c = ctx(); if (!c) return;
    if (!chuvaN) {
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), fc = c.createBiquadFilter(), gc = c.createGain(), fp = c.createBiquadFilter(), gp = c.createGain();
      src.buffer = b; src.loop = true; fc.type = "bandpass"; fc.frequency.value = 3200; fc.Q.value = 0.35; gc.gain.value = 0; fp.type = "bandpass"; fp.frequency.value = 2600; fp.Q.value = 0.7; gp.gain.value = 0;
      src.connect(fc).connect(gc).connect(master); src.connect(fp).connect(gp).connect(master); src.start(); chuvaN = { gc, gp };
    }
    const t = c.currentTime;
    chuvaN.gc.gain.setTargetAtTime(on ? nivel * 0.028 : 0, t, 0.3); chuvaN.gp.gain.setTargetAtTime(on ? pneus * 0.04 * (0.4 + 0.6 * nivel) : 0, t, 0.2);
  }
  // o engenheiro falando: os motores de F1 descem para ~35% e voltam devagar quando ele acaba
  function abafar(sim) { if (motorBus && ac) motorBus.gain.setTargetAtTime(sim ? 0.35 : 1, ac.currentTime, sim ? 0.08 : 0.35); }
  function crash(forca) {
    const c = ctx(); if (!c || !on) return;
    const k = Math.min(1, forca / 260), t = c.currentTime, len = Math.floor(c.sampleRate * 0.25), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = b; f.type = "lowpass"; f.frequency.value = 900 + k * 2200; g.gain.value = 0.06 + k * 0.14;
    src.connect(f).connect(g).connect(master); src.start(t);
    tone(70 + 30 * (1 - k), 0.18, { type: "sawtooth", vol: 0.08 + k * 0.1 });
  }
  return {
    beep(hi) { tone(hi ? 880 : 440, hi ? 0.5 : 0.25, { vol: 0.15 }); },
    lap() { [660, 880].forEach((f, i) => tone(f, 0.15, { at: i * 0.12 })); },
    finish() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, { at: i * 0.13, type: "triangle", vol: 0.16 })); },
    bump() { tone(90, 0.12, { type: "sawtooth", vol: 0.12 }); },
    skid(lvl) { const c = ctx(); if (!c) return; if (!skidG) { const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = b; src.loop = true; f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 6; g.gain.value = 0; src.connect(f).connect(g).connect(master); src.start(); skidG = g; } skidG.gain.setTargetAtTime(on && lvl ? Math.min(0.06, lvl / 4000) : 0, c.currentTime, 0.05); },
    pop() { tone(700, 0.05, { vol: 0.06 }); },
    sling() { [520, 780, 1040].forEach((f, i) => tone(f, 0.12, { at: i * 0.06, type: "sawtooth", vol: 0.07 })); },
    volume(v) { volume = Math.max(0, Math.min(1, v)); store.set("corrida:volume", volume); if (master) master.gain.setTargetAtTime(volume, ac.currentTime, 0.05); }, get nivel() { return volume; },
    radioSaida() { const c = ctx(); return c && master ? { ac: c, saida: master, abafar } : null; }, // o rádio do engenheiro usa o volume geral
    narradorSaida() { const c = ctx(); return c && master ? { ac: c, saida: master, ligado: on } : null; }, // o narrador da transmissão: volume geral e som ligado
    crash, chuva, prepararChuva() { chuva(0, 0, true); }, engine, outros, ambiente: barramento, eco(v) { if (ecoG) ecoG.gain.setTargetAtTime(on ? v : 0, ac.currentTime, 0.25); }, troca(d) { tone(d > 0 ? 180 : 120, 0.05, { type: "square", vol: 0.05 }); }, toggle() { on = !on; store.set("corrida:sound", on); if (!on) { engine(0, false); if (window.Narrador) window.Narrador.parar(); } }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.value = Math.round(Sound.nivel * 100); } }
for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.addEventListener("input", () => { Sound.volume(el.value / 100); if (!Sound.on && el.value > 0) Sound.toggle(); renderSoundBtn(); }); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
if (window.Radio) window.Radio.usarSaida(() => Sound.radioSaida());
if (window.Narrador) window.Narrador.usarSaida(() => Sound.narradorSaida());
