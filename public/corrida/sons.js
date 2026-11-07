import { criarReverberacao } from "./reverberacao.js";
// Corrida da Galera — sons sintetizados (kart e F1, derrapagem, batidas e largada). O motor de F1 é o V6 turbo híbrido de hoje (motor-v6.js); o V10 dos anos 2000 (motor-v10.js) segue como alternativa com `?motor=v10`.
import { $, store } from "./estado.js";
import { criarMotorF1 as criarMotorV10 } from "./motor-v10.js";
import { criarMotorF1 as criarMotorV6 } from "./motor-v6.js";

// qual motor de F1 soa: o V6 é o padrão; `?motor=v10` na página traz o V10 de volta
const motorEscolhido = (() => { try { return new URLSearchParams(location.search).get("motor") === "v10" ? "v10" : "v6"; } catch { return "v6"; } })();
const criarMotorF1 = motorEscolhido === "v10" ? criarMotorV10 : criarMotorV6;

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
  // o eco do túnel é um envio do motor para uma reverberação (reflexões curtas e discretas)
  let ambBus = null, ecoG = null;
  let motorF1 = null; // o motor de F1 (motor-v6.js, ou motor-v10.js com ?motor=v10), criado na primeira vez que as regras de F1 pedem
  let motorBus = null; // os motores de F1 (o meu e os dos outros) passam por aqui: abaixam enquanto o engenheiro fala
  function barramento() { const c = ctx(); if (!c) return null; if (!ambBus) { ambBus = c.createGain(); ambBus.gain.value = 0; ambBus.connect(master); } return ambBus; }
  function reverb(c) {
    const conv = criarReverberacao(c); ecoG = c.createGain(); ecoG.gain.value = 0; conv.connect(ecoG).connect(master); reverbExistente = conv; return conv;
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
    if (f1) { if (!motorF1) { motorBus = c.createGain(); motorBus.connect(master); motorF1 = criarMotorF1(c, motorBus, reverbExistente); } motorF1.atualizar(t, { gas, rpm: rpmF1, marcha: marchaF1 || 1, ativo: on && racing, cam: f1.cam, lim: f1.lim || 0, ers: !!f1.ers, freio: !!f1.freio }); } else if (motorF1) motorF1.silenciar(t);
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
  // a zebra: o pneu batendo nas listras é um ronco GRAVE, sem chiado: um tom de ~55 a 75 Hz (a carroceria vibrando) e um ruído só
  // no grave (o pneu), os dois batendo a cada listra (uma a cada ~14 unidades: "tum-tum-tum" devagar, "brrrrm" rápido).
  // `v`: a velocidade do carro na zebra (0 fora dela).
  let zebraN = null;
  function zebra(v) {
    if (!zebraN && !(v > 1)) return;
    const c = ctx(); if (!c) return;
    if (!zebraN) {
      const tom = c.createOscillator(), lfo = c.createOscillator(), prof = c.createGain(), pulso = c.createGain(), passa = c.createBiquadFilter(), saida = c.createGain();
      tom.type = "triangle"; tom.frequency.value = 60; lfo.type = "square"; lfo.frequency.value = 20; prof.gain.value = 0; pulso.gain.value = 0;
      passa.type = "lowpass"; passa.frequency.value = 170; passa.Q.value = 0.9; saida.gain.value = 0;
      const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const ruido = c.createBufferSource(), fr = c.createBiquadFilter(), gr = c.createGain(); ruido.buffer = b; ruido.loop = true; fr.type = "lowpass"; fr.frequency.value = 110; fr.Q.value = 0.7; gr.gain.value = 0.8;
      tom.connect(pulso); ruido.connect(fr).connect(gr).connect(pulso); lfo.connect(prof).connect(pulso.gain); // (o volume pulsa a cada listra)
      pulso.connect(passa).connect(saida).connect(master); tom.start(); lfo.start(); ruido.start();
      zebraN = { tom, lfo, prof, pulso, passa, saida };
    }
    const t = c.currentTime, a = Math.abs(v || 0), ligado = on && a > 8, hz = Math.min(70, Math.max(6, a / 14));
    zebraN.lfo.frequency.setTargetAtTime(hz, t, 0.03); zebraN.tom.frequency.setTargetAtTime(55 + Math.min(20, a * 0.05), t, 0.08);
    zebraN.passa.frequency.setTargetAtTime(150 + Math.min(90, a * 0.15), t, 0.08);
    const vol = ligado ? Math.min(0.32, 0.16 + a * 0.0004) : 0;
    zebraN.pulso.gain.setTargetAtTime(vol * 0.55, t, 0.02); zebraN.prof.gain.setTargetAtTime(vol * 0.45, t, 0.02);
    zebraN.saida.gain.setTargetAtTime(ligado ? 1 : 0, t, ligado ? 0.012 : 0.05);
  }
  // a torcida ao passar pela arquibancada (torcida-som.js diz o quanto ela está perto, de 0 a 1): o rumor da galera e as vozes
  // crescem com a proximidade e com a velocidade, e ao chegar rápido perto de uma arquibancada a galera solta um "uuuh", com
  // palmas e buzinas soltas.
  let torcidaN = null, torcidaAntes = 0, uauAte = 0;
  function torcida(nivel, v) {
    if (!torcidaN && !(nivel > 0.01)) return;
    const c = ctx(); if (!c) return;
    if (!torcidaN) {
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / c.sampleRate * 6.3 * (3 + Math.sin(i / c.sampleRate * 1.7))));
      const src = c.createBufferSource(); src.buffer = b; src.loop = true;
      const fr = c.createBiquadFilter(), gr = c.createGain(), fv = c.createBiquadFilter(), gv = c.createGain();
      fr.type = "bandpass"; fr.frequency.value = 650; fr.Q.value = 0.6; gr.gain.value = 0; fv.type = "bandpass"; fv.frequency.value = 1900; fv.Q.value = 1.4; gv.gain.value = 0;
      src.connect(fr).connect(gr).connect(master); src.connect(fv).connect(gv).connect(master); src.start();
      torcidaN = { fr, gr, fv, gv, buf: b };
    }
    const t = c.currentTime, n = on ? Math.max(0, Math.min(1, nivel)) : 0, rapido = Math.min(1, Math.abs(v || 0) / 300);
    const uau = t < uauAte ? Math.sin(((uauAte - t) / 1.8) * Math.PI) : 0; // o "uuuh" sobe e desce em 1,8 s
    torcidaN.gr.gain.setTargetAtTime(n * (0.05 + 0.05 * rapido) + uau * 0.06 * n, t, 0.25);
    torcidaN.gv.gain.setTargetAtTime(n * 0.025 + uau * 0.05 * n, t, 0.2);
    torcidaN.fv.frequency.setTargetAtTime(1700 + uau * 700, t, 0.2);
    if (n > 0.55 && torcidaAntes <= 0.55 && rapido > 0.35 && t > uauAte + 2) { // chegou numa arquibancada em velocidade
      uauAte = t + 1.8;
      if (Math.random() < 0.7) [0, 0.35].forEach((at, k) => tone(k ? 466 : 392, 0.28, { type: "sawtooth", vol: 0.035 * n, at: at + 0.2 })); // a buzina da galera
    }
    if (n > 0.3 && Math.random() < 0.06 * n) { // palmas soltas
      const len = Math.floor(c.sampleRate * 0.03), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = 1200; g.gain.value = 0.03 * n;
      s.connect(f).connect(g).connect(master); s.start(t + Math.random() * 0.05);
    }
    torcidaAntes = n;
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
    crash, chuva, zebra, torcida, prepararChuva() { chuva(0, 0, true); }, engine, outros, ambiente: barramento, eco(v) { if (ecoG) ecoG.gain.setTargetAtTime(on ? v : 0, ac.currentTime, 0.25); }, troca(d) { tone(d > 0 ? 180 : 120, 0.05, { type: "square", vol: 0.05 }); }, toggle() { on = !on; store.set("corrida:sound", on); if (!on) { engine(0, false); if (window.Narrador) window.Narrador.parar(); } }, get on() { return on; }, unlock() { ctx(); },
  };
})();
function renderSoundBtn() { Comum.iconeSom(Sound.on); for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.value = Math.round(Sound.nivel * 100); } }
for (const id of ["volume", "volCorrida"]) { const el = $(id); if (el) el.addEventListener("input", () => { Sound.volume(el.value / 100); if (!Sound.on && el.value > 0) Sound.toggle(); renderSoundBtn(); }); }
$("btnSound").onclick = () => { Sound.toggle(); renderSoundBtn(); };
renderSoundBtn();
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
if (window.Radio) window.Radio.usarSaida(() => Sound.radioSaida());
if (window.Narrador) window.Narrador.usarSaida(() => Sound.narradorSaida());
