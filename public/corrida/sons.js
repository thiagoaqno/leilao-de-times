// Corrida da Galera — os sons: o motor (gravação de um F1 de verdade), derrapagem, batidas e largada.
import { $, store } from "./estado.js";

// ---------- sons ----------
export const Sound = (() => {
  let ac = null, on = store.get("corrida:sound") !== false, eng = null, skidG = null, master = null, volume = Math.max(0, Math.min(1, store.get("corrida:volume") ?? 0.7));
  // todo som passa pelo volume geral (o deslizante do cabeçalho e da corrida)
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = volume; master.connect(amaster); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, { type = "square", vol = 0.12, at = 0 } = {}) {
    const c = ctx(); if (!c || !on) return; const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // motor: a gravação de um F1 de verdade (sons/f1-motor.mp3, CC0). Dois trechos repetem em loop: a marcha lenta e um
  // pedaço em rotação alta; o tom acompanha a rotação da marcha (sobe até o corte e cai na troca, como no F1), e sem
  // acelerador o som fica mais abafado. Até a gravação chegar (ou se não chegar), toca o motor sintetizado. Mais o sopro
  // do vento, que cresce com a velocidade, e o motor dos outros carros por perto, mais baixo conforme a distância.
  const MARCHAS = [0, 75, 130, 185, 240, 295, 350, 405, 1e9];
  let marcha = 1, troca = 0, grav = null, pedindo = false, rv = [];
  // um trecho [ini, fim] em segundos, pronto para repetir: o fim desliza para dentro do começo (sem estalo na emenda)
  function recorte(c, buf, ini, fim, cruz) {
    const sr = buf.sampleRate, a = Math.floor(ini * sr), n = Math.floor((fim - ini) * sr), x = Math.floor(cruz * sr), out = c.createBuffer(1, n, sr), o = out.getChannelData(0), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const f = i < x ? i / x : 1; o[i] = d[a + i] * f + (i < x ? d[a + n + i] * (1 - f) : 0); }
    return out;
  }
  function carregar(c) {
    if (pedindo) return; pedindo = true;
    fetch("/corrida/sons/f1-motor.mp3").then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b)).then((buf) => {
      const lenta = recorte(c, buf, 1.0, 4.0, 0.3), alta = recorte(c, buf, 10.75, 11.75, 0.2);
      const fonte = (b, ganho) => { const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; s.connect(g); s.start(); return { s, g, ganho }; };
      const l = fonte(lenta, 2.6), h = fonte(alta, 0.5), filtro = c.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 9000;
      l.g.connect(master); h.g.connect(filtro).connect(master);
      grav = { l, h, filtro, alta };
    }).catch(() => { grav = null; });
  }
  // os carros dos outros (até dois, os mais perto): o mesmo trecho em rotação alta, baixo e mais grave quanto mais longe
  function rivais(lista) {
    const c = ac; if (!c || !grav) return;
    const perto = lista.filter((r) => r.d < 500).sort((a, b) => a.d - b.d).slice(0, 2), t = c.currentTime;
    while (rv.length < 2) { const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); s.buffer = grav.alta; s.loop = true; s.playbackRate.value = 0.8; f.type = "lowpass"; f.frequency.value = 2500; g.gain.value = 0; s.connect(f).connect(g).connect(master); s.start(t + Math.random() * 0.3); rv.push({ s, g, f }); }
    rv.forEach((x, i) => {
      const r = perto[i], vol = r && on ? 0.16 / (1 + r.d / 70) : 0;
      x.g.gain.setTargetAtTime(vol, t, 0.1);
      if (r) { x.s.playbackRate.setTargetAtTime(0.62 + Math.min(1, Math.abs(r.v) / 450) * 0.55, t, 0.1); x.f.frequency.setTargetAtTime(900 + 5000 / (1 + r.d / 80), t, 0.1); }
    });
  }
  function engine(speed, racing, gas = true, marchaF1 = 0, rpmF1 = 0) {
    const c = ctx(); if (!c) return;
    if (!grav) carregar(c);
    if (!eng) {
      const o = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = "sawtooth"; o2.type = "square"; o3.type = "triangle"; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0;
      o.connect(f); o2.connect(f); o3.connect(f); f.connect(g).connect(master); o.start(); o2.start(); o3.start();
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
    const base = 38 + rpm * 62 + marcha * 6; // Hz
    eng.o.frequency.setTargetAtTime(base, t, 0.04); eng.o2.frequency.setTargetAtTime(base / 2, t, 0.04); eng.o3.frequency.setTargetAtTime(base * 2, t, 0.04);
    eng.f.frequency.setTargetAtTime(500 + rpm * 1400 + v * 2, t, 0.06);
    eng.g.gain.setTargetAtTime(on && racing && !grav ? (0.035 + rpm * 0.02) * (troca > 0 ? 0.3 : 1) : 0, t, 0.05);
    eng.wg.gain.setTargetAtTime(on && racing ? Math.min(0.05, v * 0.00011) : 0, t, 0.1);
    if (grav) { // a gravação: lenta parado; acima de ~40 km/h só a rotação alta, com o tom da marcha
      const lenta = Math.max(0, 1 - v / 55), pe = gas ? 1 : 0.5, corte = troca > 0 ? 0.35 : 1;
      grav.l.g.gain.setTargetAtTime(on && racing ? lenta * grav.l.ganho * 0.12 : 0, t, 0.08);
      grav.h.g.gain.setTargetAtTime(on && racing ? (1 - lenta * 0.85) * grav.h.ganho * pe * corte * (0.35 + rpm * 0.25) : 0, t, 0.04);
      // a rotação manda no tom: 0,5 (embaixo) até 1,3 (no corte); no corte o som "bate" no limitador
      const limitador = rpm >= 0.99 && gas ? (Math.sin(t * 60) > 0 ? 1 : 0.94) : 1;
      grav.h.s.playbackRate.setTargetAtTime((0.5 + Math.max(0, rpm - 0.25) * 1.07) * limitador, t, troca > 0 ? 0.015 : 0.04);
      grav.l.s.playbackRate.setTargetAtTime(gas && v < 30 ? 1.25 : 1, t, 0.15); // pisando parado, a lenta sobe
      grav.filtro.frequency.setTargetAtTime(gas ? 9000 : 1800, t, 0.08);
    }
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
    crash, engine, rivais, troca(d) { tone(d > 0 ? 180 : 120, 0.05, { type: "square", vol: 0.05 }); }, toggle() { on = !on; store.set("corrida:sound", on); if (!on) engine(0, false); }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.value = Math.round(Sound.nivel * 100); } }
for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.addEventListener("input", () => { Sound.volume(el.value / 100); if (!Sound.on && el.value > 0) Sound.toggle(); renderSoundBtn(); }); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });