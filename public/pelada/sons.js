// Pelada da Galera — sons sintetizados (Web Audio) e de onde o som vem (hearing).
import { store, clamp, G, isCar } from "./estado.js";
import { cam } from "./cena.js";

// ======================================================================
// Sons (sintetizados)
// ======================================================================
export const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("pelada:vol") ?? 0.7, eng = null;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
      const len = ac.sampleRate * 2; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function out(gain, pan) {
    const g = ac.createGain(); g.gain.value = gain;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(master); } else g.connect(master);
    return g;
  }
  function burst({ dur, f0, f1, gain, pan = 0, type = "lowpass", q = 0.7, at = 0, attack = 0.004 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out(gain, pan)); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone({ f0, f1 = f0, dur, gain, type = "sine", pan = 0, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out(gain, pan)); o.start(t); o.stop(t + dur + 0.05);
  }
  function whistle(n = 1, len = 0.35) { for (let i = 0; i < n; i++) { const at = i * (len + 0.12); tone({ f0: 2900, dur: len, gain: 0.08, type: "triangle", at }); tone({ f0: 3080, dur: len, gain: 0.06, type: "sine", at }); } }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("pelada:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    kick(power = 0.5, k = 1, pan = 0) { tone({ f0: 160 + power * 60, f1: 60, dur: 0.12, gain: (0.35 + power * 0.4) * k, pan }); burst({ dur: 0.06, f0: 2500, f1: 600, gain: 0.25 * k, pan, type: "bandpass", q: 1.2 }); },
    bounce(force, k = 1, pan = 0, big = false) { const v = clamp(force / 15, 0.05, 1) * k; if (v < 0.03) return; tone({ f0: big ? 70 : 120, f1: big ? 40 : 70, dur: big ? 0.18 : 0.08, gain: 0.4 * v, pan }); burst({ dur: 0.05, f0: 1200, f1: 300, gain: 0.2 * v, pan }); },
    net() { burst({ dur: 0.45, f0: 5000, f1: 1500, gain: 0.25, type: "highpass" }); },
    catch() { burst({ dur: 0.08, f0: 900, f1: 300, gain: 0.45 }); tone({ f0: 200, f1: 120, dur: 0.06, gain: 0.25 }); },
    slide() { burst({ dur: 0.4, f0: 2200, f1: 500, gain: 0.25, type: "bandpass", q: 0.8 }); },
    fall() { tone({ f0: 140, f1: 60, dur: 0.18, gain: 0.35 }); burst({ dur: 0.15, f0: 800, f1: 200, gain: 0.3 }); },
    jump() { burst({ dur: 0.12, f0: 600, f1: 1800, gain: 0.15, type: "bandpass", q: 2 }); },
    boost() { burst({ dur: 0.18, f0: 1800, f1: 900, gain: 0.08, type: "bandpass", q: 0.6 }); },
    pad() { tone({ f0: 660, f1: 1320, dur: 0.18, gain: 0.12, type: "triangle" }); },
    engine(speed, on) { // motor: dente de serra que sobe com a velocidade
      const c = ac; if (!c) return;
      if (!eng) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 600; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); eng = { o, o2, g }; }
      const t = c.currentTime, v = Math.abs(speed);
      eng.o.frequency.setTargetAtTime(50 + v * 7, t, 0.06); eng.o2.frequency.setTargetAtTime(25 + v * 3.5, t, 0.06);
      eng.g.gain.setTargetAtTime(on ? 0.03 + v * 0.002 : 0, t, 0.08);
    },
    whistle, start() { whistle(1, 0.7); }, end() { whistle(3, 0.45); },
    cheer() { burst({ dur: 3.2, f0: 1400, f1: 700, gain: 0.5, type: "bandpass", q: 0.6, attack: 0.25 }); burst({ dur: 2.6, f0: 600, f1: 300, gain: 0.35, attack: 0.3 }); [523, 659, 784].forEach((f, i) => tone({ f0: f, dur: 0.25, gain: 0.08, type: "square", at: 0.2 + i * 0.12 })); },
    item() { [660, 880, 1320].forEach((f, i) => tone({ f0: f, dur: 0.09, gain: 0.08, type: "square", at: i * 0.06 })); },
    lanca() { burst({ dur: 0.2, f0: 600, f1: 2400, gain: 0.18, type: "bandpass", q: 1.2 }); },
    boom() { tone({ f0: 90, f1: 35, dur: 0.6, gain: 0.5 }); burst({ dur: 0.7, f0: 1800, f1: 120, gain: 0.55 }); },
    choque() { tone({ f0: 140, f1: 70, dur: 0.35, gain: 0.22, type: "sawtooth" }); tone({ f0: 290, f1: 150, dur: 0.3, gain: 0.1, type: "square" }); burst({ dur: 0.32, f0: 5000, f1: 1600, gain: 0.28, type: "highpass" }); },
    deke() { burst({ dur: 0.25, f0: 900, f1: 3000, gain: 0.16, type: "bandpass", q: 1.5 }); },
    puxao() { burst({ dur: 0.16, f0: 1600, f1: 500, gain: 0.22, type: "bandpass", q: 1.4 }); }, // camisa sendo puxada
    ooh() { burst({ dur: 1.2, f0: 500, f1: 350, gain: 0.25, type: "bandpass", q: 1, attack: 0.15 }); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

export function hearing(p) {
  const ex = cam.position, dx = p[0] - ex.x, dz = p[2] - ex.z, dist = Math.hypot(dx, dz, p[1] - ex.y);
  const yaw = isCar() ? G.camCarYaw : G.camYaw, right = [Math.cos(yaw), -Math.sin(yaw)];
  return [1 / (1 + dist / (isCar() ? 30 : 14)), dist > 0.5 ? (dx * right[0] + dz * right[1]) / dist * 0.7 : 0];
}