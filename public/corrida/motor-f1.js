// Corrida da Galera — o som do motor de F1 (regras de F1), todo sintetizado em WebAudio, sem baixar áudio.
// Um V6 turbo híbrido: a nota é a frequência de explosão (rpm / 60 × 3: de ~180 Hz na marcha lenta a ~625 Hz no corte, com
// o `rpm` do câmbio de dinamica.js, 1 = 12 mil rpm), com CORPO: a fundamental forte, dois sub-harmônicos (f / 2 e f / 4) com
// volume alto, o ronco do escapamento (ruído em passa-banda de 80 a 300 Hz que sobe com a rotação) e distorção suave. Os
// agudos ficam presos por dois passa-baixas em série: em baixa rotação o motor é grave e encorpado, e só perto do corte
// ele abre (acima de 3 kHz) e grita. O assobio do turbo é baixo e fica abaixo de 4 kHz (era ele que virava "mosquito").
// Os nós são criados uma vez só; por quadro só se mexe nos parâmetros. Só as ocorrências (estalos, a válvula) criam
// nós curtos, que somem sozinhos. Vem do Drag (drag/main.js) a ideia dos estalos e da válvula e, do histórico do sons.js
// (c126a3c), o limitador batendo e os carros dos outros por perto (agora com até 3 vozes e Doppler).

const ESC = 0.75 / 3.6; // metros por unidade da pista (dinamica.js)
const SOM = 343;        // velocidade do som, m/s (para o Doppler)
const CORTE_KMH = [98, 130, 165, 198, 230, 262, 292, 321]; // a velocidade do corte de cada marcha (cambio)
const VOZES = 3;        // quantos carros dos outros soam ao mesmo tempo (os mais perto)

// a rotação (fração do corte) que um carro dos outros teria a `v` m/s: a marcha pelos cortes do câmbio
function rotacaoPorVelocidade(v) {
  const kmh = Math.abs(v) * 3.6; let g = 0; while (g < CORTE_KMH.length - 1 && kmh > CORTE_KMH[g] * 0.985) g++;
  return Math.min(1, Math.max(0.32, kmh / CORTE_KMH[g]));
}
// distorção suave e assimétrica (os harmônicos pares dão o rasgado do V6)
function curvaDeSaturacao(k) {
  const n = 1024, c = new Float32Array(n), d = Math.tanh(0.3);
  for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; c[i] = Math.tanh(x * k + 0.3) - d; }
  return c;
}

// c: o AudioContext; saida: o volume geral; eco: a entrada da reverberação do túnel
export function criarMotorF1(c, saida, eco) {
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ruido = (dest) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(dest); s.start(); return s; };
  const no = (tipo, f, q = 0.7) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; };
  const ganho = (v = 0) => { const g = c.createGain(); g.gain.value = v; return g; };
  const osc = (tipo, dest) => { const o = c.createOscillator(); o.type = tipo; o.connect(dest); o.start(); return o; };

  // a câmera: por dentro (cockpit) o som é aberto; por fora fica mais abafado e grave, e de cima mais ainda
  const cam = no("lowpass", 9000, 0.5); cam.connect(saida); cam.connect(eco);

  // ---- o meu motor ----
  const soma = ganho(0.42), sat = c.createWaveShaper(); sat.curve = curvaDeSaturacao(2.0); sat.oversample = "2x";
  const ress = no("peaking", 700, 1.6); ress.gain.value = 5; // formante largo que anda com a nota (o "corpo" do motor)
  const lp = no("lowpass", 900, 0.8), lp2 = no("lowpass", 900, 0.7), hp = no("highpass", 45, 0.7); // dois passa-baixas: 24 dB/oitava
  const limG = ganho(1), saidaMotor = ganho(0);
  soma.connect(sat); sat.connect(ress); ress.connect(lp); lp.connect(lp2); lp2.connect(hp); hp.connect(limG); limG.connect(saidaMotor); saidaMotor.connect(cam);
  // as vozes do motor: a explosão (dente de serra, duas levemente desafinadas que "batem"), o 2º harmônico (quadrada, baixo)
  // e os sub-harmônicos: f / 2 (dente de serra) e f / 4 (triângulo), que dão o peso e o ronco ao tirar o pé
  const g1 = ganho(), g2 = ganho(), g3 = ganho(), g4 = ganho(), g5 = ganho();
  g1.connect(soma); g2.connect(soma); g3.connect(soma); g4.connect(soma); g5.connect(soma);
  const o1 = osc("sawtooth", g1), o2 = osc("sawtooth", g2), o3 = osc("square", g3), o4 = osc("sawtooth", g4), o5 = osc("triangle", g5);
  // o ronco do escapamento: ruído em passa-banda de 80 a 300 Hz que sobe com a rotação (entra antes da distorção, para encorpar)
  const roncoF = no("bandpass", 120, 1.1), roncoG = ganho(0); ruido(roncoF); roncoF.connect(roncoG); roncoG.connect(soma);
  // o rasgo: ruído numa faixa baixa, perto da nota, só um pouco de aspereza
  const rasgoF = no("bandpass", 500, 2), rasgoG = ganho(0); ruido(rasgoF); rasgoF.connect(rasgoG); rasgoG.connect(ress);
  // o limitador de rotação: uma onda quadrada de ~16 Hz corta o som (e baixa um pouco o tom) enquanto bate no corte
  const lfo = c.createOscillator(); lfo.type = "square"; lfo.frequency.value = 16; lfo.start();
  const lfoAmp = ganho(0), lfoTom = ganho(0); lfo.connect(lfoAmp); lfoAmp.connect(limG.gain);
  lfo.connect(lfoTom); for (const o of [o1, o2, o3, o4, o5]) lfoTom.connect(o.detune);
  // o turbo / MGU-H: um assobio agudo que cresce com a carga, mais o sopro do ar
  const tf = no("lowpass", 3800, 0.7), tg = ganho(0), tur = osc("sine", tg), tur2 = osc("sine", tg); tg.connect(tf); tf.connect(cam);
  const sopF = no("bandpass", 1800, 0.8), sopG = ganho(0); ruido(sopF); sopF.connect(sopG); sopG.connect(cam);

  // ---- os carros dos outros: até VOZES, com volume pela distância e Doppler ----
  const vozes = [];
  for (let i = 0; i < VOZES; i++) {
    const f = no("lowpass", 2000, 0.9), g = ganho(0), p = c.createStereoPanner ? c.createStereoPanner() : null;
    const a = osc("sawtooth", f), b = osc("sawtooth", f), q = ganho(0.7), s = osc("sine", q); q.connect(f); // (s: o sub-harmônico, f / 2)
    f.connect(g); if (p) { g.connect(p); p.connect(cam); } else g.connect(cam);
    vozes.push({ a, b, s, f, g, p });
  }

  let marchaAnt = 0, gasAntes = false, corteAte = 0, estalosAte = 0, proxEstalo = 0;
  // um estalo do escapamento (um pedaço de ruído abafado; o forte tem a pancada grave por baixo), a partir de t0
  function estalo(t0, forte) {
    const s = c.createBufferSource(), f = no("lowpass", forte ? 1000 : 1200 + Math.random() * 1800, 0.8), g = ganho(0), dur = forte ? 0.14 : 0.03 + Math.random() * 0.04;
    s.buffer = nb; g.gain.setValueAtTime(forte ? 0.2 : 0.07 + Math.random() * 0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(cam); s.start(t0, Math.random() * 0.8, dur + 0.02);
    if (forte) { const o = c.createOscillator(), og = ganho(0); o.type = "sine"; o.frequency.setValueAtTime(95, t0); o.frequency.exponentialRampToValueAtTime(50, t0 + 0.14); og.gain.setValueAtTime(0.1, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15); o.connect(og); og.connect(cam); o.start(t0); o.stop(t0 + 0.17); }
  }
  // o "psssh" do turbo aliviando ao tirar o pé
  function valvula(t0) {
    const s = c.createBufferSource(), f = no("bandpass", 3200, 0.8), g = ganho(0);
    s.buffer = nb; f.frequency.setValueAtTime(3200, t0); f.frequency.exponentialRampToValueAtTime(1400, t0 + 0.35);
    g.gain.setValueAtTime(0.03, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    s.connect(f); f.connect(g); g.connect(cam); s.start(t0, Math.random() * 0.5, 0.42);
  }

  // o: { gas, rpm, marcha, ativo (andando e com som), cam ("cockpit" é por dentro), lim (0 a 1: o limitador batendo) }
  function atualizar(t, { gas, rpm, marcha, ativo, cam: camera, lim }) {
    const r = Math.min(1.04, Math.max(0.3, rpm)), f = r * 600, interna = camera === "cockpit"; // 1 = 12 mil rpm: f = rpm / 60 × 3
    if (marchaAnt && marcha !== marchaAnt && ativo) {
      if (marcha > marchaAnt) { corteAte = t + 0.07; if (gas && r > 0.5) estalo(t + 0.07, false); } // sobe: corte curto de ignição e um estalinho
      else { corteAte = t + 0.03; for (let i = 0; i < 3; i++) estalo(t + 0.03 + i * 0.055 + Math.random() * 0.04, i === 0 && r > 0.6); } // reduz: a rotação sobe e pipoca
    }
    marchaAnt = marcha;
    if (ativo && gasAntes && !gas && r > 0.7) { estalosAte = t + 0.35 + r * 0.5; valvula(t); } // tirou o pé em alta: pipocos por um instante
    gasAntes = gas;
    if (ativo && t < estalosAte && t >= proxEstalo) { estalo(t, Math.random() < 0.15); proxEstalo = t + 0.03 + Math.random() * 0.09; }
    // a nota: cai na hora na troca (a rotação vem do câmbio), com um alisamento curto
    const tom = t < corteAte ? 0.012 : 0.02;
    o1.frequency.setTargetAtTime(f, t, tom); o2.frequency.setTargetAtTime(f * 1.006, t, tom); o3.frequency.setTargetAtTime(f * 2, t, tom); o4.frequency.setTargetAtTime(f / 2, t, tom); o5.frequency.setTargetAtTime(f / 4, t, tom);
    // pisando: a explosão manda e os subs seguram o peso; sem acelerador sobram os subs e o ronco abafado
    g1.gain.setTargetAtTime(gas ? 0.7 : 0.25, t, 0.06); g2.gain.setTargetAtTime(gas ? 0.45 : 0.15, t, 0.06); g3.gain.setTargetAtTime(gas ? 0.1 * r : 0.02, t, 0.06);
    g4.gain.setTargetAtTime(gas ? 0.8 : 0.9, t, 0.08); g5.gain.setTargetAtTime(gas ? 0.9 : 1, t, 0.08);
    roncoF.frequency.setTargetAtTime(80 + r * 220, t, 0.05); roncoG.gain.setTargetAtTime(ativo ? (gas ? 1.1 : 0.7) * (0.5 + 0.5 * r) : 0, t, 0.06); // 80 a 300 Hz
    // o agudo: preso em baixa rotação (~900 Hz na marcha lenta), só abre perto do corte (r³: 3 kHz a 0,7; ~8 kHz no corte)
    const abre = gas ? 800 + r * r * r * 7500 : 450 + r * 800; lp.frequency.setTargetAtTime(abre, t, 0.05); lp2.frequency.setTargetAtTime(abre * 1.2, t, 0.05);
    ress.frequency.setTargetAtTime(Math.min(1800, f * 2), t, 0.04); ress.gain.setTargetAtTime(gas ? 5 : 2, t, 0.1);
    rasgoF.frequency.setTargetAtTime(Math.min(1500, f * 2), t, 0.03); rasgoG.gain.setTargetAtTime(ativo ? (gas ? 0.12 : 0.03) * (0.3 + r * r) : 0, t, 0.06);
    saidaMotor.gain.setTargetAtTime(ativo ? (0.055 + 0.035 * r) * (interna ? 1 : 0.9) * (t < corteAte ? 0.1 : 1) : 0, t, t < corteAte ? 0.01 : 0.03);
    // o limitador: a quadrada de 16 Hz abre e fecha o som e baixa o tom
    limG.gain.setTargetAtTime(1 - 0.15 * lim, t, 0.03); lfoAmp.gain.setTargetAtTime(0.45 * lim, t, 0.03); lfoTom.gain.setTargetAtTime(35 * lim, t, 0.03);
    // o turbo: assobio baixo e grave (1,8 a 3,6 kHz) que cresce com a carga e demora a perder força
    const carga = gas ? r * r : 0;
    tur.frequency.setTargetAtTime(1800 + r * 1800, t, 0.12); tur2.frequency.setTargetAtTime((1800 + r * 1800) * 1.5, t, 0.12);
    tg.gain.setTargetAtTime(ativo ? 0.004 * carga * (interna ? 1.3 : 0.8) : 0, t, gas ? 0.12 : 0.3); sopG.gain.setTargetAtTime(ativo ? 0.006 * carga : 0, t, gas ? 0.12 : 0.3);
    cam.frequency.setTargetAtTime(interna ? 9000 : camera === "cima" ? 2200 : 3800, t, 0.1);
  }
  function silenciar(t) {
    saidaMotor.gain.setTargetAtTime(0, t, 0.05); tg.gain.setTargetAtTime(0, t, 0.05); sopG.gain.setTargetAtTime(0, t, 0.05); rasgoG.gain.setTargetAtTime(0, t, 0.05);
    roncoG.gain.setTargetAtTime(0, t, 0.05); lfoAmp.gain.setTargetAtTime(0, t, 0.05); lfoTom.gain.setTargetAtTime(0, t, 0.05); outros(t, null, 0, false);
  }
  // lista: [{ dist (m), vRel (m/s, positivo = se aproximando), v (m/s), lado (-1 esquerda a 1 direita) }], n: quantos valem
  function outros(t, lista, n, ativo) {
    for (let i = 0; i < VOZES; i++) {
      const v = vozes[i], r = ativo && lista && i < n ? lista[i] : null;
      if (!r) { v.g.gain.setTargetAtTime(0, t, 0.1); continue; }
      const rot = rotacaoPorVelocidade(r.v), f = rot * 600 * (SOM / (SOM - Math.max(-110, Math.min(110, r.vRel)))); // Doppler: mais agudo chegando, mais grave saindo
      v.a.frequency.setTargetAtTime(f, t, 0.06); v.b.frequency.setTargetAtTime(f * 1.007, t, 0.06); v.s.frequency.setTargetAtTime(f / 2, t, 0.06);
      v.f.frequency.setTargetAtTime((600 + rot * rot * rot * 3200) / (1 + r.dist / 220), t, 0.1);
      v.g.gain.setTargetAtTime(0.05 / (1 + Math.pow(r.dist / 40, 1.3)), t, 0.08);
      if (v.p) v.p.pan.setTargetAtTime(r.lado * 0.85, t, 0.08);
    }
  }
  return { atualizar, silenciar, outros };
}
