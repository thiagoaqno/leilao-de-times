// Corrida da Galera — sons sintetizados (kart e F1, derrapagem, batidas e largada).
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
  let f1 = null, ultimaMarchaF1 = 0, corteAte = 0, ultimoEstalo = -1;
  function barramento() { const c = ctx(); if (!c) return null; if (!ambBus) { ambBus = c.createGain(); ambBus.gain.value = 0; ambBus.connect(master); } return ambBus; }
  function reverb(c) {
    const len = Math.floor(c.sampleRate * 1.4), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = c.createConvolver(); conv.buffer = b; ecoG = c.createGain(); ecoG.gain.value = 0; conv.connect(ecoG).connect(master); reverbExistente = conv; return conv;
  }
  function criarMotorF1(c) {
    const saida = c.createGain(), filtro = c.createBiquadFilter(), oscs = [];
    saida.gain.value = 0; filtro.type = "lowpass"; filtro.frequency.value = 2400;
    for (const [tipo, razao, nivel] of [["sawtooth", 1, 0.65], ["triangle", 0.5, 0.32], ["sawtooth", 2, 0.12]]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = tipo; g.gain.value = nivel;
      o.connect(g).connect(filtro); o.start();
      oscs.push({ o, razao });
    }
    filtro.connect(saida).connect(master);
    return { saida, filtro, oscs };
  }
  function criarF1(c) {
    const motor = criarMotorF1(c), turbo = c.createOscillator(), turboG = c.createGain();
    turbo.type = "sine"; turboG.gain.value = 0; turbo.connect(turboG).connect(master); turbo.start();
    // O eco existente recebe o motor da F1 pelo mesmo envio usado pelo kart.
    motor.saida.connect(reverbExistente || reverb(c));
    return { motor, turbo, turboG, rivais: Array.from({ length: 3 }, () => criarMotorF1(c)) };
  }
  let reverbExistente = null;
  function estaloF1(c, forte = false) {
    if (!on || c.currentTime - ultimoEstalo < 0.055) return;
    ultimoEstalo = c.currentTime;
    const dur = forte ? 0.12 : 0.06, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.setValueAtTime(forte ? 250 : 430, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, c.currentTime + dur);
    f.type = "lowpass"; f.frequency.value = forte ? 950 : 1500;
    g.gain.setValueAtTime(forte ? 0.055 : 0.03, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(f).connect(g).connect(master); o.start(); o.stop(c.currentTime + dur);
  }
  function atualizarF1(c, racing, gas, marchaF1, rpmF1, rivais, pos) {
    if (!f1) f1 = criarF1(c);
    const t = c.currentTime, ativo = on && racing, giro = Math.max(0, Math.min(1.02, rpmF1));
    if (ativo && ultimaMarchaF1 && marchaF1 !== ultimaMarchaF1) {
      if (marchaF1 > ultimaMarchaF1) { corteAte = t + 0.055; estaloF1(c, true); }
      else estaloF1(c);
    }
    ultimaMarchaF1 = ativo ? marchaF1 : 0;
    const freq = (4000 + giro * 8500) / 20; // V6 quatro tempos: três ignições por volta
    for (const { o, razao } of f1.motor.oscs) o.frequency.setTargetAtTime(freq * razao, t, 0.025);
    f1.motor.filtro.frequency.setTargetAtTime(gas ? 1700 + giro * 3300 : 850 + giro * 900, t, 0.06);
    const limitador = gas && giro >= 0.998 && Math.floor(t * 18) % 2 === 0;
    const nivel = ativo ? (gas ? 0.075 : 0.033) * (t < corteAte || limitador ? 0.12 : 1) : 0;
    f1.motor.saida.gain.setTargetAtTime(nivel, t, 0.012);
    f1.turbo.frequency.setTargetAtTime(1700 + giro * 2600, t, 0.08);
    f1.turboG.gain.setTargetAtTime(ativo && gas ? 0.004 + giro * giro * 0.011 : 0, t, 0.12);
    const proximos = ativo && pos ? rivais.filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y) && !r.dnf)
      .map((r) => ({ x: r.x, y: r.y, a: r.a, v: r.v, dx: r.x - pos.x, dy: r.y - pos.y }))
      .map((r) => ({ ...r, dist: Math.hypot(r.dx, r.dy) }))
      .filter((r) => r.dist < 110).sort((a, b) => a.dist - b.dist).slice(0, 3) : [];
    f1.rivais.forEach((motor, i) => {
      const r = proximos[i], dist = r?.dist ?? 1e9;
      // Velocidade radial positiva quando o rival se aproxima; 1 unidade da pista = 0,208 m.
      const radial = r && dist > 0.1 ? ((pos.vx || 0) - Math.cos(r.a) * (r.v || 0)) * r.dx / dist + ((pos.vy || 0) - Math.sin(r.a) * (r.v || 0)) * r.dy / dist : 0;
      const doppler = Math.max(0.85, Math.min(1.15, 343 / (343 - radial * 0.208)));
      const rpm = Math.max(0.3, Math.min(1, Math.abs(r?.v || 0) / 370));
      const f = (4000 + rpm * 8500) / 20 * doppler;
      for (const { o, razao } of motor.oscs) o.frequency.setTargetAtTime(f * razao, t, 0.06);
      motor.filtro.frequency.setTargetAtTime(1100 + rpm * 1700, t, 0.08);
      motor.saida.gain.setTargetAtTime(r ? 0.018 * Math.pow(1 - dist / 110, 2) : 0, t, 0.08);
    });
  }
  function engine(speed, racing, gas = true, marchaF1 = 0, rpmF1 = 0, modoF1 = false, rivais = [], pos = null) {
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
    eng.g.gain.setTargetAtTime(on && racing && !modoF1 ? (0.035 + rpm * 0.02) * (troca > 0 ? 0.3 : 1) : 0, t, 0.05);
    eng.wg.gain.setTargetAtTime(on && racing ? Math.min(0.05, v * 0.00011) : 0, t, 0.1);
    if (modoF1 || f1) atualizarF1(c, racing && modoF1, gas, marchaF1, rpmF1, rivais, pos);
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
