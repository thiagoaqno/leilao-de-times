// Corrida da Galera — sons sintetizados (motor, derrapagem, largada).
import { $, store } from "./estado.js";

// ---------- sons ----------
export const Sound = (() => {
  let ac = null, on = store.get("corrida:sound") !== false, eng = null, skidG = null;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "square", vol = 0.12, at = 0 } = {}) {
    const c = ctx(); if (!c || !on) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // motor: dente de serra passando por um filtro, a nota sobe com a velocidade
  function engine(speed, racing) {
    const c = ctx(); if (!c) return;
    if (!eng) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g).connect(c.destination); o.start(); o2.start(); eng = { o, o2, g }; }
    const v = Math.abs(speed), t = c.currentTime;
    eng.o.frequency.setTargetAtTime(45 + v * 0.42, t, 0.05); eng.o2.frequency.setTargetAtTime(22 + v * 0.21, t, 0.05);
    eng.g.gain.setTargetAtTime(on && racing ? 0.035 + v * 0.00012 : 0, t, 0.08);
  }
  return {
    beep(hi) { tone(hi ? 880 : 440, hi ? 0.5 : 0.25, { vol: 0.15 }); },
    lap() { [660, 880].forEach((f, i) => tone(f, 0.15, { at: i * 0.12 })); },
    finish() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, { at: i * 0.13, type: "triangle", vol: 0.16 })); },
    bump() { tone(90, 0.12, { type: "sawtooth", vol: 0.12 }); },
    skid(lvl) { const c = ctx(); if (!c) return; if (!skidG) { const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = b; src.loop = true; f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 6; g.gain.value = 0; src.connect(f).connect(g).connect(c.destination); src.start(); skidG = g; } skidG.gain.setTargetAtTime(on && lvl ? Math.min(0.06, lvl / 4000) : 0, c.currentTime, 0.05); },
    pop() { tone(700, 0.05, { vol: 0.06 }); },
    sling() { [520, 780, 1040].forEach((f, i) => tone(f, 0.12, { at: i * 0.06, type: "sawtooth", vol: 0.07 })); },
    engine, toggle() { on = !on; store.set("corrida:sound", on); if (!on) engine(0, false); }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });