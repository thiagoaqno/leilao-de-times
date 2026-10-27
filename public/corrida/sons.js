// Corrida da Galera — sons sintetizados (motor de kart, derrapagem, batidas e largada).
import { $, store } from "./estado.js";

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
  function barramento() { const c = ctx(); if (!c) return null; if (!ambBus) { ambBus = c.createGain(); ambBus.gain.value = 0; ambBus.connect(master); } return ambBus; }
  function reverb(c) {
    const len = Math.floor(c.sampleRate * 1.4), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = c.createConvolver(); conv.buffer = b; ecoG = c.createGain(); ecoG.gain.value = 0; conv.connect(ecoG).connect(master); return conv;
  }
  function engine(speed, racing, gas = true, marchaF1 = 0, rpmF1 = 0) {
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
    eng.g.gain.setTargetAtTime(on && racing ? (0.035 + rpm * 0.02) * (troca > 0 ? 0.3 : 1) : 0, t, 0.05);
    eng.wg.gain.setTargetAtTime(on && racing ? Math.min(0.05, v * 0.00011) : 0, t, 0.1);
    if (ambBus) ambBus.gain.setTargetAtTime(on && racing ? 1 : 0, t, 0.4);
    if (!racing && ecoG) ecoG.gain.setTargetAtTime(0, t, 0.1);
  }
  // batida: um estalo grave e um sopro de ruído, mais forte quanto maior a força
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
    radioSaida() { const c = ctx(); return c && master ? { ac: c, saida: master } : null; }, // o rádio do engenheiro usa o volume geral
    crash, engine, ambiente: barramento, eco(v) { if (ecoG) ecoG.gain.setTargetAtTime(on ? v : 0, ac.currentTime, 0.25); }, troca(d) { tone(d > 0 ? 180 : 120, 0.05, { type: "square", vol: 0.05 }); }, toggle() { on = !on; store.set("corrida:sound", on); if (!on) engine(0, false); }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.value = Math.round(Sound.nivel * 100); } }
for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.addEventListener("input", () => { Sound.volume(el.value / 100); if (!Sound.on && el.value > 0) Sound.toggle(); renderSoundBtn(); }); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
if (window.Radio) window.Radio.usarSaida(() => Sound.radioSaida());
