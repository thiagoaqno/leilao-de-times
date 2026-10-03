// Tiro da Galera — sons sintetizados (WebAudio) e de onde o som vem (hearing).
import { WP, store, clamp } from "./estado.js";
import { cam } from "./cena.js";

// ======================================================================
// Sons (tudo sintetizado com WebAudio: sem arquivos para baixar)
// ======================================================================
export const Sound = (() => {
  let ac = null, master = null, noise = null, vol = store.get("tiro:vol") ?? 0.7;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
      const len = ac.sampleRate; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function out(gain, pan) {
    const c = ac, g = c.createGain(); g.gain.value = gain;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(master); } else g.connect(master);
    return g;
  }
  function burst({ dur, f0, f1, gain, pan = 0, type = "lowpass", q = 0.7, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out(gain, pan)); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function tone({ f0, f1 = f0, dur, gain, type = "sine", pan = 0, at = 0 }) {
    const c = ctx(); if (!c) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out(gain, pan)); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    unlock() { ctx(); },
    setVol(v) { vol = v; store.set("tiro:vol", v); if (master) master.gain.value = v; }, get vol() { return vol; },
    // k: 0..1 volume pela distância; muffle: abafa o som de longe
    shot(w, k = 1, pan = 0) {
      if (k < 0.02) return;
      if (w === "faca") { burst({ dur: 0.14, f0: 2500, f1: 6000, gain: 0.18 * k, pan, type: "bandpass", q: 1.5 }); return; }
      if (w === "deagle") {
        burst({ dur: 0.25, f0: 4800, f1: 500, gain: 0.75 * k, pan }); tone({ f0: 130, f1: 38, dur: 0.18, gain: 0.7 * k, pan });
        burst({ dur: 0.45, f0: 1000, f1: 180, gain: 0.18 * k, pan, at: 0.05 }); return;
      }
      if (w === "awp") {
        burst({ dur: 0.7, f0: 4200, f1: 260, gain: 0.9 * k, pan }); tone({ f0: 110, f1: 32, dur: 0.35, gain: 0.8 * k, pan });
        burst({ dur: 0.9, f0: 900, f1: 120, gain: 0.25 * k, pan, at: 0.09 });
      } else {
        burst({ dur: 0.16, f0: 5200, f1: 700, gain: 0.55 * k, pan }); tone({ f0: 150, f1: 45, dur: 0.11, gain: 0.55 * k, pan });
        burst({ dur: 0.3, f0: 1200, f1: 200, gain: 0.12 * k, pan, at: 0.04 });
      }
    },
    step(k = 1, pan = 0) { if (k > 0.03) burst({ dur: 0.07, f0: 900, f1: 300, gain: 0.25 * k, pan, type: "bandpass", q: 1.4 }); },
    land() { burst({ dur: 0.1, f0: 600, f1: 150, gain: 0.3, type: "bandpass" }); },
    hit(head) { if (head) { tone({ f0: 2400, f1: 2100, dur: 0.12, gain: 0.25 }); tone({ f0: 3600, dur: 0.08, gain: 0.12 }); } else burst({ dur: 0.06, f0: 1500, f1: 400, gain: 0.35, type: "bandpass", q: 2 }); },
    hurt() { burst({ dur: 0.12, f0: 700, f1: 200, gain: 0.5 }); tone({ f0: 180, f1: 90, dur: 0.15, gain: 0.25 }); },
    kill() { tone({ f0: 880, dur: 0.12, gain: 0.18, type: "triangle" }); tone({ f0: 1320, dur: 0.18, gain: 0.18, type: "triangle", at: 0.09 }); },
    dry() { tone({ f0: 1800, f1: 1200, dur: 0.03, gain: 0.15, type: "square" }); },
    stab() { burst({ dur: 0.08, f0: 900, f1: 300, gain: 0.45 }); tone({ f0: 160, f1: 90, dur: 0.09, gain: 0.3 }); },
    reload(w) { const T = WP[w].reload; [0.25, T * 0.45, T * 0.8].forEach((at, i) => { burst({ dur: 0.05, f0: 3000, f1: 1500, gain: 0.25, type: "bandpass", q: 3, at }); tone({ f0: i === 2 ? 500 : 900, dur: 0.04, gain: 0.1, type: "square", at }); }); },
    zoom() { tone({ f0: 1500, f1: 1100, dur: 0.04, gain: 0.08, type: "square" }); },
    round() { tone({ f0: 660, dur: 0.12, gain: 0.15, type: "triangle" }); tone({ f0: 990, dur: 0.2, gain: 0.15, type: "triangle", at: 0.13 }); },
    win(good) { (good ? [523, 659, 784, 1047] : [440, 370, 311]).forEach((f, i) => tone({ f0: f, dur: 0.18, gain: 0.15, type: "triangle", at: i * 0.12 })); },
  };
})();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

export function hearing(p) { // volume e lado (esquerda/direita) de um som no mundo
  const ex = cam.position, dx = p[0] - ex.x, dz = p[2] - ex.z, dist = Math.hypot(dx, dz, p[1] - ex.y);
  const yaw = cam.rotation.y, right = [Math.cos(yaw), -Math.sin(yaw)];
  return [1 / (1 + dist / 9), dist > 0.5 ? (dx * right[0] + dz * right[1]) / dist * 0.8 : 0];
}