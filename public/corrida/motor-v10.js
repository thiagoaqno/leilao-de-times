// Corrida da Galera — o som do motor de F1 (regras de F1), todo sintetizado em WebAudio, sem baixar áudio.
// Um V10 aspirado dos anos 2000 (a era Schumacher/Ferrari, até ~19 mil rpm). O que faz o V10 ser rico, e não um "mosquito"
// (uma nota aguda só), é que o som não é uma onda: é uma soma de ORDENS do virabrequim (ordem 1 = rpm / 60 Hz). A nota de
// explosão é a 5ª ordem (cinco explosões por volta: ~540 Hz a 6.500 rpm, ~1.580 Hz a 19.000), mas há energia forte nas ordens
// baixas e nas meias-ordens (0,5; 1; 1,5; 2; 2,5; 3...) por causa do desequilíbrio entre cilindros e bancadas. Cada grupo de
// ordens é um oscilador com uma onda própria (createPeriodicWave: vários harmônicos de uma vez, sem aliasing), levemente
// desafinado dos outros (eles "batem") e com jitter de ciclo a ciclo (ruído suave no detune). Em seguida vêm as ressonâncias
// FIXAS do escapamento (o timbre metálico de trompete: os harmônicos varrem as ressonâncias quando a rotação sobe), um pente
// curto, a aspereza (modulação de amplitude na explosão e ruído de combustão em pulsos), o ronco da admissão, distorção suave
// (waveshaper 4x) e um compressor. Os agudos terminam em dois passa-baixas (~7,5 kHz): nada de chiado.
// Os nós são criados uma vez só; por quadro só se mexe nos parâmetros. Só as ocorrências (estalos) criam nós curtos, que
// somem sozinhos. Vem do Drag (drag/main.js) a ideia dos estalos e, do histórico do sons.js (c126a3c), o limitador batendo e
// os carros dos outros por perto (3 vozes, versão barata do mesmo motor, com Doppler).

const SOM = 343;        // velocidade do som, m/s (para o Doppler)
const CORTE_KMH = [98, 130, 165, 198, 230, 262, 292, 321]; // a velocidade do corte de cada marcha (cambio)
const VOZES = 3;        // quantos carros dos outros soam ao mesmo tempo (os mais perto)

// ---- a rotação: o `rpm` do câmbio (0 a 1, fração do corte) vira rpm do V10 ----
export const RPM_MARCHA_LENTA = 4000, RPM_MINIMA = 6500, RPM_CORTE = 19000;
export function rpmV10(r) {
  const x = Math.min(1.03, Math.max(0, r || 0));
  return x < 0.3 ? RPM_MARCHA_LENTA + (RPM_MINIMA - RPM_MARCHA_LENTA) * (x / 0.3) : RPM_MINIMA + (RPM_CORTE - RPM_MINIMA) * ((x - 0.3) / 0.7);
}
// a rotação (fração do corte) que um carro dos outros teria a `v` m/s: a marcha pelos cortes do câmbio
export function rotacaoPorVelocidade(v) {
  const kmh = Math.abs(v) * 3.6; let g = 0; while (g < CORTE_KMH.length - 1 && kmh > CORTE_KMH[g] * 0.985) g++;
  return Math.min(1, Math.max(0.32, kmh / CORTE_KMH[g]));
}

// ---- as ordens: cada grupo é um oscilador cuja fundamental é `ordem` (em múltiplos de rpm / 60 Hz); `amp[k - 1]` é a
// amplitude do k-ésimo harmônico dele (0 = ausente), então o harmônico k soa na ordem `ordem × k` ----
export const GRUPOS = {
  // desequilíbrio e rotação do virabrequim: 0,5; 1; 1,5; 2; 2,5; 3; 3,5; 4 (o ronco e a vibração, que ficam ao tirar o pé)
  baixo: { ordem: 0.5, amp: [0.45, 1, 0.3, 0.62, 0.2, 0.28, 0.12, 0.2] },
  // a assimetria entre as bancadas: 2,5 e os ímpares dela (7,5; 12,5; 17,5)
  meia: { ordem: 2.5, amp: [1, 0, 0.6, 0, 0.3, 0, 0.15] },
  // a explosão: 5ª ordem e os harmônicos dela (5; 10; 15; 20...), de pulso, caindo devagar para ter corpo nos agudos
  explosao: { ordem: 5, amp: [1, 0.85, 0.62, 0.45, 0.3, 0.2, 0.13, 0.09, 0.06, 0.04] },
  // a versão barata dos carros dos outros: menos ordens
  baixoBarato: { ordem: 0.5, amp: [0.45, 1, 0.3, 0.62] },
  explosaoBarata: { ordem: 5, amp: [1, 0.85, 0.6, 0.4, 0.22] },
};
// as fases dos harmônicos (determinísticas e espalhadas: o pulso não vira uma agulha, e o som não muda a cada abertura)
export const fase = (k, semente = 0) => 0.9 * Math.sin(k * k * 0.7 + semente);
// o escapamento: ressonâncias fixas (Hz, Q, ganho em dB) em série
export const ESCAPAMENTO = [{ f: 180, q: 1.3, g: 6 }, { f: 650, q: 2.2, g: 8 }, { f: 1250, q: 3, g: 4 }, { f: 2300, q: 2.4, g: 7 }];
// cada câmera: fc (passa-baixas final), esc (escapamento), baixo (ordens baixas), adm (admissão), ar (o ar da passagem), eco, brilho (ganho do pico de 2,3 kHz)
export const CAMERAS = {
  perto: { fc: 7500, esc: 1, baixo: 0.85, adm: 0.9, ar: 1, eco: 0.55, brilho: 7, vib: 0 },
  longe: { fc: 6200, esc: 0.9, baixo: 0.9, adm: 0.8, ar: 0.8, eco: 0.8, brilho: 5, vib: 0 },
  cima: { fc: 3600, esc: 0.8, baixo: 1, adm: 0.8, ar: 0.5, eco: 0.7, brilho: 2, vib: 0 },
  cockpit: { fc: 5600, esc: 0.72, baixo: 1.5, adm: 2.1, ar: 0, eco: 0.2, brilho: 4, vib: 1 },
};

// distorção suave e levemente assimétrica (os harmônicos pares dão o rasgado do V10)
export function curvaDeSaturacao(k) {
  const n = 1024, c = new Float32Array(n), d = Math.tanh(0.18);
  for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; c[i] = Math.tanh(x * k + 0.18) - d; }
  return c;
}
// retifica: só a metade positiva da senoide, elevada ao cubo (pulsos estreitos na frequência de explosão)
function curvaDePulso() {
  const n = 512, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; c[i] = x > 0 ? x * x * x : 0; }
  return c;
}

// c: o AudioContext; saida: o volume geral; eco: a entrada da reverberação do túnel
export function criarMotorF1(c, saida, eco) {
  const sr = c.sampleRate;
  const nb = c.createBuffer(1, sr, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // o jitter: ruído suave (passa-baixas de ~100 Hz, variância 1) que se repete a cada segundo; cada oscilador lê de um ponto diferente
  const jb = c.createBuffer(1, sr, sr), jd = jb.getChannelData(0); { let y = 0, s = 0; for (let i = 0; i < jd.length * 2; i++) { y = 0.986 * y + 0.014 * (Math.random() * 2 - 1); if (i >= jd.length) { jd[i - jd.length] = y; s += y * y; } } const k = 1 / Math.sqrt(s / jd.length || 1); for (let i = 0; i < jd.length; i++) jd[i] *= k; }
  const ruido = (dest, buf = nb, desde = 0) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(0, desde); return s; };
  const no = (tipo, f, q = 0.7, g) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; if (g !== undefined) b.gain.value = g; return b; };
  const ganho = (v = 0) => { const g = c.createGain(); g.gain.value = v; return g; };
  const osc = (tipo, dest) => { const o = c.createOscillator(); o.type = tipo; if (dest) o.connect(dest); o.start(); return o; };
  const onda = (grupo, semente = 0) => { // a PeriodicWave de um grupo de ordens
    const a = GRUPOS[grupo].amp, real = new Float32Array(a.length + 1), imag = new Float32Array(a.length + 1);
    for (let k = 1; k <= a.length; k++) { const ph = fase(k, semente); real[k] = a[k - 1] * Math.cos(ph); imag[k] = a[k - 1] * Math.sin(ph); }
    return c.createPeriodicWave(real, imag);
  };
  const oscOnda = (w, dest) => { const o = c.createOscillator(); o.setPeriodicWave(w); o.connect(dest); o.start(); return o; };
  // o jitter de ciclo a ciclo: ruído suave que mexe no detune (em cents) de um oscilador
  let desdeJit = 0;
  const jitter = (o, cents) => { const g = ganho(cents); ruido(g, jb, (desdeJit += 0.173) % 1); g.connect(o.detune); return g; };

  // ---- a saída: dois passa-baixas em série (nada acima de ~7,5 kHz) e o envio para o eco do túnel ----
  const camLp1 = no("lowpass", 7500, 0.6), camLp2 = no("lowpass", 8000, 0.5), envioEco = ganho(0.55);
  camLp1.connect(camLp2); camLp2.connect(saida); camLp2.connect(envioEco); if (eco) envioEco.connect(eco);

  // ---- o meu motor ----
  // o fim da cadeia: o compressor leve, que junta o escapamento, a admissão e o ar
  const entradaComp = ganho(1), comp = c.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.14;
  entradaComp.connect(comp); comp.connect(camLp1);
  // o escapamento: soma das ordens -> distorção (4x) -> 4 ressonâncias fixas -> pente curto -> brilho -> corte de ignição -> compressor
  const soma = ganho(0.9), sat = c.createWaveShaper(); sat.curve = curvaDeSaturacao(1.7); sat.oversample = "4x";
  soma.connect(sat);
  let ant = sat; const picos = ESCAPAMENTO.map((r) => { const f = no("peaking", r.f, r.q, r.g); ant.connect(f); ant = f; return f; });
  const pico3 = picos[3]; // o de 2,3 kHz: o brilho muda com a câmera
  const pente = ganho(1), atrasoPente = c.createDelay(0.01), ganhoPente = ganho(0.35), saidaPente = ganho(1);
  atrasoPente.delayTime.value = 0.0009; ant.connect(pente); ant.connect(atrasoPente); atrasoPente.connect(ganhoPente); pente.connect(saidaPente); ganhoPente.connect(saidaPente);
  const brilho = no("lowpass", 4000, 0.7), hp = no("highpass", 40, 0.7), limG = ganho(1), saidaMotor = ganho(0);
  saidaPente.connect(brilho); brilho.connect(hp); hp.connect(limG); limG.connect(saidaMotor); saidaMotor.connect(entradaComp);

  // as ordens baixas e a meia-ordem
  const bxG = ganho(0), bx = oscOnda(onda("baixo", 1.1), bxG); bxG.connect(soma);
  const mdG = ganho(0), md = oscOnda(onda("meia", 2.3), mdG); mdG.connect(soma);
  // a explosão: três cópias da 5ª ordem levemente desafinadas (batem), com jitter; o conjunto leva a aspereza (AM) e o "fogo" (acelerador)
  const fogoG = ganho(0), expBus = ganho(0.85); expBus.connect(fogoG); fogoG.connect(soma);
  const gB = ganho(0.5), gC = ganho(0.45); gB.connect(expBus); gC.connect(expBus);
  const exA = oscOnda(onda("explosao", 0), expBus), exB = oscOnda(onda("explosao", 1.9), gB), exC = oscOnda(onda("explosao", 4.1), gC);
  jitter(bx, 22); jitter(md, 14); jitter(exA, 7); jitter(exB, 9); jitter(exC, 9);
  // a aspereza: a 2,5ª ordem (as bancadas se alternando) e o jitter mexem no volume da explosão
  const lfoAm = osc("sine"), lfoAmG = ganho(0.2); lfoAm.connect(lfoAmG); lfoAmG.connect(expBus.gain);
  const jitAm = ganho(0.12); ruido(jitAm, jb, 0.55); jitAm.connect(expBus.gain);
  // o ruído da combustão: banda média, em pulsos na frequência de explosão (granular)
  const combF = no("bandpass", 1800, 0.9), combP = ganho(0.15), combG = ganho(0);
  ruido(combF); combF.connect(combP); combP.connect(combG); combG.connect(soma);
  const pulso = osc("sine"), pulsoF = c.createWaveShaper(), pulsoG = ganho(0.85); pulsoF.curve = curvaDePulso(); pulso.connect(pulsoF); pulsoF.connect(pulsoG); pulsoG.connect(combP.gain);
  // a vibração do chassi (só no cockpit): a 1ª ordem pura
  const vibG = ganho(0), vib = osc("sine", vibG); vibG.connect(soma);
  // a admissão: ronco grave (ruído em passa-baixas de 200 a 600 Hz) que cresce com o acelerador; não é cortado na troca
  const admF = no("lowpass", 300, 1.1), admHp = no("highpass", 60, 0.7), admG = ganho(0);
  ruido(admF); admF.connect(admHp); admHp.connect(admG); admG.connect(entradaComp);
  // o ar da passagem (câmera de fora): sopro médio, sem agudo
  const arF = no("bandpass", 1000, 0.6), arG = ganho(0); ruido(arF); arF.connect(arG); arG.connect(entradaComp);
  // o limitador de rotação: uma quadrada de ~17 Hz corta o som enquanto bate no corte (o V10 corta a ignição)
  const lfo = c.createOscillator(); lfo.type = "square"; lfo.frequency.value = 17; lfo.start();
  const lfoAmp = ganho(0); lfo.connect(lfoAmp); lfoAmp.connect(limG.gain);

  // ---- os carros dos outros: até VOZES, a versão barata (menos ordens), com volume pela distância, Doppler forte e pan ----
  const ondaExp = onda("explosaoBarata", 0.6), ondaBx = onda("baixoBarato", 1.4), vozes = [];
  for (let i = 0; i < VOZES; i++) {
    const soma2 = ganho(1), f = no("lowpass", 2000, 0.9), g = ganho(0), p = c.createStereoPanner ? c.createStereoPanner() : null;
    const ge = ganho(0.8), gb = ganho(0.7), a = oscOnda(ondaExp, ge), b = oscOnda(ondaBx, gb); ge.connect(soma2); gb.connect(soma2);
    const r1 = no("peaking", 650, 2, 7), r2 = no("peaking", 2300, 2.4, 6); soma2.connect(r1); r1.connect(r2); r2.connect(f);
    f.connect(g); if (p) { g.connect(p); p.connect(camLp1); } else g.connect(camLp1);
    vozes.push({ a, b, f, g, p, fino: 1 + (i - 1) * 0.004 });
  }

  let marchaAnt = 0, gasAntes = false, corteAte = 0, estalosAte = 0, proxEstalo = 0, blipIni = -1;
  // um estalo do escapamento, a partir de t0: um estalo seco de ruído em banda média (o forte tem a pancada grave por baixo)
  function estalo(t0, forte) {
    const s = c.createBufferSource(), f = no("bandpass", 1000 + Math.random() * 2400, 1.1), g = ganho(0), dur = forte ? 0.1 : 0.02 + Math.random() * 0.04;
    s.buffer = nb; g.gain.setValueAtTime(forte ? 0.3 : 0.1 + Math.random() * 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(camLp1); s.start(t0, Math.random() * 0.8, dur + 0.02);
    if (forte) { const o = c.createOscillator(), og = ganho(0); o.type = "sine"; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 0.12); og.gain.setValueAtTime(0.14, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13); o.connect(og); og.connect(camLp1); o.start(t0); o.stop(t0 + 0.15); }
  }

  // o: { gas, rpm, marcha, ativo (andando e com som), cam (perto, cockpit, longe, cima), lim (0 a 1: o limitador batendo) }
  function atualizar(t, { gas, rpm, marcha, ativo, cam: camera, lim }) {
    const r = Math.min(1.04, Math.max(0, rpm)), K = CAMERAS[camera] || CAMERAS.perto, interna = camera === "cockpit";
    if (marchaAnt && marcha !== marchaAnt && ativo) {
      if (marcha > marchaAnt) { corteAte = t + 0.04; if (gas && r > 0.5) estalo(t + 0.04, false); } // sobe: corte de ignição curtíssimo (40 ms) e um estalinho
      else { corteAte = t + 0.025; blipIni = t; for (let i = 0; i < 3; i++) estalo(t + 0.05 + i * 0.05 + Math.random() * 0.04, i === 0 && r > 0.6); } // reduz: "blip" do acelerador, sobe e desce, e pipoca
    }
    marchaAnt = marcha;
    if (ativo && gasAntes && !gas && r > 0.7) estalosAte = t + 0.3 + r * 0.5; // tirou o pé em alta: pipocos por um instante
    gasAntes = gas;
    if (ativo && t < estalosAte && t >= proxEstalo) { estalo(t, Math.random() < 0.12); proxEstalo = t + 0.04 + Math.random() * 0.11; }
    const blip = blipIni >= 0 && t - blipIni < 0.2 ? Math.sin(Math.PI * (t - blipIni) / 0.2) : 0; // 0 a 1 a 0 em 200 ms
    const f5 = rpmV10(r) * (1 + 0.07 * blip) / 12; // Hz da nota de explosão (5ª ordem: rpm / 60 × 5)
    const tom = t < corteAte ? 0.01 : 0.02;
    bx.frequency.setTargetAtTime(f5 / 10, t, tom); md.frequency.setTargetAtTime(f5 / 2, t, tom);
    exA.frequency.setTargetAtTime(f5, t, tom); exB.frequency.setTargetAtTime(f5 * 1.0035, t, tom); exC.frequency.setTargetAtTime(f5 * 0.9966, t, tom);
    pulso.frequency.setTargetAtTime(f5, t, tom); lfoAm.frequency.setTargetAtTime(f5 / 2, t, tom); vib.frequency.setTargetAtTime(f5 / 5, t, tom);
    // pisando, a explosão manda; sem acelerador (e em movimento) ela some e ficam as ordens baixas, a admissão e os estalos
    const pe = gas || blip > 0, fogo = pe ? 1 : 0.12 + 0.55 * Math.min(1, Math.max(0, (0.45 - r) / 0.2)); // na marcha lenta o motor segue explodindo
    fogoG.gain.setTargetAtTime(ativo ? fogo : 0, t, pe ? 0.03 : 0.06);
    combG.gain.setTargetAtTime(ativo ? fogo * (0.3 + 0.7 * r) * 0.5 : 0, t, 0.05);
    bxG.gain.setTargetAtTime(ativo ? (pe ? 0.75 : 0.95) * K.baixo : 0, t, 0.06); mdG.gain.setTargetAtTime(ativo ? (pe ? 0.5 : 0.28) : 0, t, 0.06);
    vibG.gain.setTargetAtTime(ativo ? 0.35 * K.vib * (0.4 + 0.6 * r) : 0, t, 0.08);
    brilho.frequency.setTargetAtTime(pe ? 2800 + r * r * 5200 : 1100 + r * 1500, t, 0.05); // o agudo abre com a rotação; sem acelerador fica abafado
    pico3.gain.setTargetAtTime(K.brilho, t, 0.15); camLp1.frequency.setTargetAtTime(K.fc, t, 0.1); camLp2.frequency.setTargetAtTime(K.fc * 1.06, t, 0.1); envioEco.gain.setTargetAtTime(K.eco, t, 0.2);
    saidaMotor.gain.setTargetAtTime(ativo ? (0.5 + 0.5 * r) * K.esc * 0.26 * (t < corteAte ? 0.08 : 1) : 0, t, t < corteAte ? 0.006 : 0.03);
    // a admissão: ronco de 200 a 600 Hz que cresce com a rotação e com o acelerador
    admF.frequency.setTargetAtTime(200 + r * 400, t, 0.05); admG.gain.setTargetAtTime(ativo ? (pe ? 1 : 0.4) * (0.35 + 0.65 * r) * K.adm * 0.12 : 0, t, 0.06);
    arF.frequency.setTargetAtTime(700 + r * 900, t, 0.1); arG.gain.setTargetAtTime(ativo ? (0.2 + 0.8 * r) * K.ar * 0.03 : 0, t, 0.1);
    // o limitador: a quadrada abre e fecha o som (de 1 a 1 - 0,8 × lim)
    limG.gain.setTargetAtTime(1 - 0.4 * lim, t, 0.03); lfoAmp.gain.setTargetAtTime(0.4 * lim, t, 0.03);
  }
  function silenciar(t) {
    for (const g of [saidaMotor, fogoG, combG, bxG, mdG, vibG, admG, arG, lfoAmp]) g.gain.setTargetAtTime(0, t, 0.05);
    outros(t, null, 0, false);
  }
  // lista: [{ dist (m), vRel (m/s, positivo = se aproximando), v (m/s), lado (-1 esquerda a 1 direita) }], n: quantos valem
  function outros(t, lista, n, ativo) {
    for (let i = 0; i < VOZES; i++) {
      const v = vozes[i], r = ativo && lista && i < n ? lista[i] : null;
      if (!r) { v.g.gain.setTargetAtTime(0, t, 0.1); continue; }
      const rot = rotacaoPorVelocidade(r.v), dop = SOM / (SOM - Math.max(-150, Math.min(150, r.vRel * 1.35))); // Doppler forte: o "nheeeeooow" na passagem
      const f5 = rpmV10(rot) / 12 * dop * v.fino;
      v.a.frequency.setTargetAtTime(f5, t, 0.045); v.b.frequency.setTargetAtTime(f5 / 10, t, 0.045);
      v.f.frequency.setTargetAtTime((1000 + rot * rot * rot * 5000) / (1 + r.dist / 240), t, 0.08);
      v.g.gain.setTargetAtTime(0.1 / (1 + Math.pow(r.dist / 32, 1.4)), t, 0.07);
      if (v.p) v.p.pan.setTargetAtTime(r.lado * 0.85, t, 0.07);
    }
  }
  return { atualizar, silenciar, outros };
}
