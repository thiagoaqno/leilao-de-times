// Corrida da Galera — o som do motor de F1 de hoje (regras de F1), todo sintetizado em WebAudio, sem baixar áudio.
// A unidade de potência V6 1.6 turbo híbrida do regulamento de 2026 (V6 a 90°, corte em ~15 mil rpm, trocas de marcha por
// volta de 11,5 a 12,5 mil). Como no V10 (motor-v10.js, que continua no código como alternativa: `?motor=v10`), o som não é
// uma onda: é uma soma de ORDENS do virabrequim (ordem 1 = rpm / 60 Hz). Mas o V6 soa bem diferente do V10:
//  - a nota de explosão é a 3ª ordem (seis cilindros, três explosões por volta: 200 Hz na marcha lenta, 600 Hz a 12 mil rpm,
//    750 Hz no corte), uma oitava e meia abaixo do V10. É um som mais grave, "rouco" e cheio de grunhido, não um grito;
//  - o V6 a 90° dispara em intervalos desiguais (90° e 150° do virabrequim): o padrão se repete a cada 240°, então há muita
//    energia nas MEIAS-ORDENS (1,5; 4,5; 7,5...) além das ordens 3, 6, 9... da explosão, e nas ordens baixas (0,5; 1; 2);
//  - a turbina engole os agudos do escapamento: as ressonâncias são mais baixas e largas e quase não há energia acima de 5 kHz
//    nas ordens; em troca, o turbo aparece por cima, como um assobio que acompanha a carga (com atraso: o turbo demora a subir
//    e a descer) e o zumbido elétrico do MGU-K, que entrega energia na saída das curvas e recarrega na frenagem.
// (O regulamento de 2026 tirou o MGU-H: o assobio é só do compressor do turbo, com um parcial extra de eixo.)
// Os nós são criados uma vez só; por quadro só se mexe nos parâmetros. Só as ocorrências (pipocos, o sopro do turbo ao tirar
// o pé) criam nós curtos, que somem sozinhos. Os carros dos outros (3 vozes) são a versão barata do mesmo motor, com Doppler.

const SOM = 343;        // velocidade do som, m/s (para o Doppler)
const CORTE_KMH = [98, 130, 165, 198, 230, 262, 292, 321]; // a velocidade do corte de cada marcha (cambio)
const VOZES = 3;        // quantos carros dos outros soam ao mesmo tempo (os mais perto)

// ---- a rotação: o `rpm` do câmbio (0 a 1, fração do corte da marcha) vira rpm do V6 ----
// o câmbio troca perto de 1 (~12.500 rpm); o que passa de 1 (até 1,04) é o motor encostando no corte de 15.000 rpm
export const RPM_MARCHA_LENTA = 4000, RPM_MINIMA = 6000, RPM_TROCA = 12500, RPM_CORTE = 15000;
export function rpmV6(r) {
  const x = Math.min(1.04, Math.max(0, r || 0));
  if (x < 0.3) return RPM_MARCHA_LENTA + (RPM_MINIMA - RPM_MARCHA_LENTA) * (x / 0.3);
  if (x <= 1) return RPM_MINIMA + (RPM_TROCA - RPM_MINIMA) * ((x - 0.3) / 0.7);
  return RPM_TROCA + (RPM_CORTE - RPM_TROCA) * ((x - 1) / 0.04);
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
  baixo: { ordem: 0.5, amp: [0.5, 1, 0.55, 0.7, 0.2, 0.25, 0.1, 0.16] },
  // o disparo desigual (90° e 150°): 1,5 e os ímpares dela (4,5; 7,5; 10,5), que o V10 não tem
  meia: { ordem: 1.5, amp: [1, 0, 0.7, 0, 0.35, 0, 0.18] },
  // a explosão: 3ª ordem e os harmônicos dela (3; 6; 9; 12...), caindo depressa (a turbina abafa o agudo)
  explosao: { ordem: 3, amp: [1, 0.75, 0.52, 0.34, 0.22, 0.14, 0.09, 0.06, 0.04, 0.025] },
  // a versão barata dos carros dos outros: menos ordens
  baixoBarato: { ordem: 0.5, amp: [0.5, 1, 0.55, 0.7] },
  explosaoBarata: { ordem: 3, amp: [1, 0.75, 0.5, 0.3, 0.16] },
};
// as fases dos harmônicos (determinísticas e espalhadas: o pulso não vira uma agulha, e o som não muda a cada abertura)
export const fase = (k, semente = 0) => 0.9 * Math.sin(k * k * 0.7 + semente);
// o escapamento: ressonâncias fixas (Hz, Q, ganho em dB) em série; mais baixas e largas que as do V10 (a turbina no caminho)
export const ESCAPAMENTO = [{ f: 130, q: 1.2, g: 6 }, { f: 430, q: 1.8, g: 8 }, { f: 900, q: 2, g: 4 }, { f: 1700, q: 2, g: 5 }];
// cada câmera: fc (passa-baixas final), esc (escapamento), baixo (ordens baixas), adm (admissão), ar (o ar da passagem), eco,
// brilho (ganho do pico de 1,7 kHz), turbo (assobio) e mgu (zumbido elétrico)
export const CAMERAS = {
  perto: { fc: 7000, esc: 1, baixo: 0.9, adm: 0.9, ar: 1, eco: 0.55, brilho: 5, vib: 0, turbo: 0.8, mgu: 0.7 },
  longe: { fc: 5600, esc: 0.9, baixo: 0.95, adm: 0.8, ar: 0.8, eco: 0.8, brilho: 4, vib: 0, turbo: 0.5, mgu: 0.45 },
  cima: { fc: 3400, esc: 0.8, baixo: 1.05, adm: 0.8, ar: 0.5, eco: 0.7, brilho: 2, vib: 0, turbo: 0.35, mgu: 0.3 },
  cockpit: { fc: 5200, esc: 0.72, baixo: 1.5, adm: 2, ar: 0, eco: 0.2, brilho: 3, vib: 1, turbo: 1.4, mgu: 1.3 },
};
// o turbo: a frequência do assobio vai de 2 a ~5,4 kHz com a rotação do turbo (0 a 1); o MGU-K zumbe em rpm / 60 × 8
export const TURBO_HZ = [2000, 5400], MGU_ORDEM = 8;

// distorção suave e levemente assimétrica (os harmônicos pares dão o rasgado); mais forte que a do V10 (o V6 é mais rouco)
export function curvaDeSaturacao(k) {
  const n = 1024, c = new Float32Array(n), d = Math.tanh(0.22);
  for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; c[i] = Math.tanh(x * k + 0.22) - d; }
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

  // ---- a saída: dois passa-baixas em série e o envio para o eco do túnel ----
  const camLp1 = no("lowpass", 7000, 0.6), camLp2 = no("lowpass", 7400, 0.5), envioEco = ganho(0.55);
  camLp1.connect(camLp2); camLp2.connect(saida); camLp2.connect(envioEco); if (eco) envioEco.connect(eco);

  // ---- o meu motor ----
  // o fim da cadeia: o compressor leve, que junta o escapamento, a admissão e o ar
  const entradaComp = ganho(1), comp = c.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.14;
  entradaComp.connect(comp); comp.connect(camLp1);
  // o escapamento: soma das ordens -> distorção (4x) -> 4 ressonâncias fixas -> pente curto -> brilho -> corte de ignição -> compressor
  const soma = ganho(0.9), sat = c.createWaveShaper(); sat.curve = curvaDeSaturacao(2.1); sat.oversample = "4x";
  soma.connect(sat);
  let ant = sat; const picos = ESCAPAMENTO.map((r) => { const f = no("peaking", r.f, r.q, r.g); ant.connect(f); ant = f; return f; });
  const pico3 = picos[3]; // o de 1,7 kHz: o brilho muda com a câmera
  const pente = ganho(1), atrasoPente = c.createDelay(0.01), ganhoPente = ganho(0.3), saidaPente = ganho(1);
  atrasoPente.delayTime.value = 0.0013; ant.connect(pente); ant.connect(atrasoPente); atrasoPente.connect(ganhoPente); pente.connect(saidaPente); ganhoPente.connect(saidaPente);
  const brilho = no("lowpass", 3000, 0.7), hp = no("highpass", 35, 0.7), limG = ganho(1), saidaMotor = ganho(0);
  saidaPente.connect(brilho); brilho.connect(hp); hp.connect(limG); limG.connect(saidaMotor); saidaMotor.connect(entradaComp);

  // as ordens baixas e a meia-ordem (1,5)
  const bxG = ganho(0), bx = oscOnda(onda("baixo", 1.1), bxG); bxG.connect(soma);
  const mdG = ganho(0), md = oscOnda(onda("meia", 2.3), mdG); mdG.connect(soma);
  // a explosão: três cópias da 3ª ordem levemente desafinadas (batem), com jitter; o conjunto leva a aspereza (AM) e o "fogo" (acelerador)
  const fogoG = ganho(0), expBus = ganho(0.85); expBus.connect(fogoG); fogoG.connect(soma);
  const gB = ganho(0.55), gC = ganho(0.5); gB.connect(expBus); gC.connect(expBus);
  const exA = oscOnda(onda("explosao", 0), expBus), exB = oscOnda(onda("explosao", 1.9), gB), exC = oscOnda(onda("explosao", 4.1), gC);
  jitter(bx, 26); jitter(md, 18); jitter(exA, 11); jitter(exB, 13); jitter(exC, 13);
  // a aspereza: a 1,5ª ordem (o disparo desigual) e o jitter mexem no volume da explosão, mais fundo que no V10 (o rouco do V6)
  const lfoAm = osc("sine"), lfoAmG = ganho(0.28); lfoAm.connect(lfoAmG); lfoAmG.connect(expBus.gain);
  const jitAm = ganho(0.16); ruido(jitAm, jb, 0.55); jitAm.connect(expBus.gain);
  // o ruído da combustão: banda média-baixa, em pulsos na frequência de explosão (o grunhido)
  const combF = no("bandpass", 1000, 0.9), combP = ganho(0.15), combG = ganho(0);
  ruido(combF); combF.connect(combP); combP.connect(combG); combG.connect(soma);
  const pulso = osc("sine"), pulsoF = c.createWaveShaper(), pulsoG = ganho(0.85); pulsoF.curve = curvaDePulso(); pulso.connect(pulsoF); pulsoF.connect(pulsoG); pulsoG.connect(combP.gain);
  // a vibração do chassi (só no cockpit): a 1ª ordem pura
  const vibG = ganho(0), vib = osc("sine", vibG); vibG.connect(soma);
  // a admissão: ronco grave (ruído em passa-baixas de 180 a 520 Hz) que cresce com o acelerador; não é cortado na troca
  const admF = no("lowpass", 260, 1.1), admHp = no("highpass", 55, 0.7), admG = ganho(0);
  ruido(admF); admF.connect(admHp); admHp.connect(admG); admG.connect(entradaComp);
  // o ar da passagem (câmera de fora): sopro médio, sem agudo
  const arF = no("bandpass", 900, 0.6), arG = ganho(0); ruido(arF); arF.connect(arG); arG.connect(entradaComp);
  // o limitador de rotação: uma quadrada de ~17 Hz corta o som enquanto bate no corte
  const lfo = c.createOscillator(); lfo.type = "square"; lfo.frequency.value = 17; lfo.start();
  const lfoAmp = ganho(0); lfo.connect(lfoAmp); lfoAmp.connect(limG.gain);

  // ---- o turbo e o MGU-K: ficam por cima do escapamento (vão direto para os passa-baixas finais, sem distorção) ----
  const agudo = ganho(1); agudo.connect(camLp1);
  // o assobio do compressor: duas senoides quase em 3:2 (batem) e um sopro estreito de ar na mesma frequência; o jitter treme o tom
  const turboG = ganho(0), tu1 = osc("sine"), tu2 = osc("sine"), tu2G = ganho(0.4), tuAr = no("bandpass", 3000, 9), tuArG = ganho(0.9);
  tu1.connect(turboG); tu2.connect(tu2G); tu2G.connect(turboG); ruido(tuAr); tuAr.connect(tuArG); tuArG.connect(turboG);
  const tuFiltro = no("peaking", 3500, 1.4, 2); turboG.connect(tuFiltro); tuFiltro.connect(agudo);
  jitter(tu1, 14); jitter(tu2, 22);
  // o zumbido do MGU-K: fundamental e a 2ª, um pouco de granulado (AM de ~95 Hz, o inversor) e um passa-banda largo
  const mguG = ganho(0), mguAm = ganho(0.82), mg1 = osc("sine"), mg2 = osc("triangle"), mg2G = ganho(0.3), mguBp = no("peaking", 1800, 0.9, 5);
  mg1.connect(mguAm); mg2.connect(mg2G); mg2G.connect(mguAm); mguAm.connect(mguBp); mguBp.connect(mguG); mguG.connect(agudo);
  const lfoK = osc("sine"), lfoKG = ganho(0.18); lfoK.frequency.value = 95; lfoK.connect(lfoKG); lfoKG.connect(mguAm.gain);

  // ---- os carros dos outros: até VOZES, a versão barata (menos ordens), com volume pela distância, Doppler forte e pan ----
  const ondaExp = onda("explosaoBarata", 0.6), ondaBx = onda("baixoBarato", 1.4), vozes = [];
  for (let i = 0; i < VOZES; i++) {
    const soma2 = ganho(1), f = no("lowpass", 1500, 0.9), g = ganho(0), p = c.createStereoPanner ? c.createStereoPanner() : null;
    const ge = ganho(0.85), gb = ganho(0.75), gt = ganho(0.05), a = oscOnda(ondaExp, ge), b = oscOnda(ondaBx, gb), w = osc("sine", gt); ge.connect(soma2); gb.connect(soma2);
    const r1 = no("peaking", 430, 2, 7), r2 = no("peaking", 1700, 2.4, 5); soma2.connect(r1); r1.connect(r2); r2.connect(f);
    f.connect(g); gt.connect(g); // o assobio do turbo passa fora do passa-baixas da voz (só pela distância)
    if (p) { g.connect(p); p.connect(camLp1); } else g.connect(camLp1);
    vozes.push({ a, b, w, f, g, p, fino: 1 + (i - 1) * 0.004 });
  }

  let marchaAnt = 0, gasAntes = false, corteAte = 0, estalosAte = 0, proxEstalo = 0, blipIni = -1;
  let turbo = 0.15, tAnt = null; // a rotação do turbo (0 a 1): anda atrás da carga, devagar (o atraso do turbo)
  // um pipoco abafado do escapamento, a partir de t0: ruído em banda média-baixa (o V6 turbo estala mais surdo que o V10, a
  // turbina no caminho); o forte tem uma pancada grave por baixo
  function estalo(t0, forte) {
    const s = c.createBufferSource(), f = no("bandpass", 350 + Math.random() * 1100, 0.9), g = ganho(0), dur = forte ? 0.12 : 0.03 + Math.random() * 0.05;
    s.buffer = nb; g.gain.setValueAtTime(forte ? 0.24 : 0.07 + Math.random() * 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(camLp1); s.start(t0, Math.random() * 0.8, dur + 0.02);
    if (forte) { const o = c.createOscillator(), og = ganho(0); o.type = "sine"; o.frequency.setValueAtTime(95, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14); og.gain.setValueAtTime(0.12, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15); o.connect(og); og.connect(camLp1); o.start(t0); o.stop(t0 + 0.17); }
  }
  // o sopro do turbo ao tirar o pé: um "pshh" de ar que cai de ~4,5 para ~1,5 kHz em ~0,4 s (some sozinho)
  function sopro(t0, nivel) {
    const s = c.createBufferSource(), f = no("bandpass", 4500, 1.2), g = ganho(0);
    s.buffer = nb; f.frequency.setValueAtTime(4500, t0); f.frequency.exponentialRampToValueAtTime(1500, t0 + 0.4);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05 * nivel, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    s.connect(f); f.connect(g); g.connect(agudo); s.start(t0, Math.random() * 0.8, 0.46);
  }

  // o: { gas, rpm, marcha, ativo (andando e com som), cam (perto, cockpit, longe, cima), lim (0 a 1: o limitador batendo),
  //      ers (o ERS entregando energia), freio (o pedal de freio: recarrega) }
  function atualizar(t, { gas, rpm, marcha, ativo, cam: camera, lim, ers, freio }) {
    const r = Math.min(1.04, Math.max(0, rpm)), K = CAMERAS[camera] || CAMERAS.perto;
    const dt = tAnt === null ? 0.016 : Math.min(0.25, Math.max(0, t - tAnt)); tAnt = t;
    if (marchaAnt && marcha !== marchaAnt && ativo) {
      if (marcha > marchaAnt) { corteAte = t + 0.035; if (gas && r > 0.5) estalo(t + 0.035, false); } // sobe: corte de ignição curtíssimo (35 ms) e um pipoquinho
      else { corteAte = t + 0.025; blipIni = t; for (let i = 0; i < 2; i++) estalo(t + 0.06 + i * 0.07 + Math.random() * 0.05, i === 0 && r > 0.65); } // reduz: "blip" do acelerador e dois pipocos abafados
    }
    marchaAnt = marcha;
    if (ativo && gasAntes && !gas && r > 0.7) { estalosAte = t + 0.15 + r * 0.3; sopro(t, Math.min(1, turbo) * K.turbo); } // tirou o pé em alta: o sopro do turbo e uns pipocos
    gasAntes = gas;
    if (ativo && t < estalosAte && t >= proxEstalo) { estalo(t, Math.random() < 0.06); proxEstalo = t + 0.07 + Math.random() * 0.18; }
    const blip = blipIni >= 0 && t - blipIni < 0.2 ? Math.sin(Math.PI * (t - blipIni) / 0.2) : 0; // 0 a 1 a 0 em 200 ms
    const f3 = rpmV6(r) * (1 + 0.09 * blip) / 20; // Hz da nota de explosão (3ª ordem: rpm / 60 × 3)
    const tom = t < corteAte ? 0.01 : 0.02;
    bx.frequency.setTargetAtTime(f3 / 6, t, tom); md.frequency.setTargetAtTime(f3 / 2, t, tom);
    exA.frequency.setTargetAtTime(f3, t, tom); exB.frequency.setTargetAtTime(f3 * 1.004, t, tom); exC.frequency.setTargetAtTime(f3 * 0.996, t, tom);
    pulso.frequency.setTargetAtTime(f3, t, tom); lfoAm.frequency.setTargetAtTime(f3 / 2, t, tom); vib.frequency.setTargetAtTime(f3 / 3, t, tom);
    // pisando, a explosão manda; sem acelerador (e em movimento) ela some e ficam as ordens baixas, a admissão e os pipocos
    const pe = gas || blip > 0, fogo = pe ? 1 : 0.14 + 0.55 * Math.min(1, Math.max(0, (0.45 - r) / 0.2)); // na marcha lenta o motor segue explodindo
    fogoG.gain.setTargetAtTime(ativo ? fogo : 0, t, pe ? 0.03 : 0.06);
    combG.gain.setTargetAtTime(ativo ? fogo * (0.35 + 0.65 * r) * 0.6 : 0, t, 0.05);
    bxG.gain.setTargetAtTime(ativo ? (pe ? 0.8 : 1) * K.baixo : 0, t, 0.06); mdG.gain.setTargetAtTime(ativo ? (pe ? 0.6 : 0.32) : 0, t, 0.06);
    vibG.gain.setTargetAtTime(ativo ? 0.35 * K.vib * (0.4 + 0.6 * r) : 0, t, 0.08);
    brilho.frequency.setTargetAtTime(pe ? 2000 + r * r * 3600 : 900 + r * 1300, t, 0.05); // o agudo abre com a rotação; sem acelerador fica abafado
    pico3.gain.setTargetAtTime(K.brilho, t, 0.15); camLp1.frequency.setTargetAtTime(K.fc, t, 0.1); camLp2.frequency.setTargetAtTime(K.fc * 1.06, t, 0.1); envioEco.gain.setTargetAtTime(K.eco, t, 0.2);
    saidaMotor.gain.setTargetAtTime(ativo ? (0.5 + 0.5 * r) * K.esc * 0.3 * (t < corteAte ? 0.1 : 1) : 0, t, t < corteAte ? 0.006 : 0.03);
    // a admissão: ronco de 180 a 520 Hz que cresce com a rotação e com o acelerador
    admF.frequency.setTargetAtTime(180 + r * 340, t, 0.05); admG.gain.setTargetAtTime(ativo ? (pe ? 1 : 0.45) * (0.35 + 0.65 * r) * K.adm * 0.13 : 0, t, 0.06);
    arF.frequency.setTargetAtTime(600 + r * 800, t, 0.1); arG.gain.setTargetAtTime(ativo ? (0.2 + 0.8 * r) * K.ar * 0.03 : 0, t, 0.1);
    // o limitador: a quadrada abre e fecha o som
    limG.gain.setTargetAtTime(1 - 0.4 * lim, t, 0.03); lfoAmp.gain.setTargetAtTime(0.4 * lim, t, 0.03);
    // o turbo: a rotação dele anda atrás da carga (sobe em ~0,45 s, desce em ~0,9 s); o assobio vai de 2 a ~5,4 kHz e o volume
    // cresce com a carga e com a rotação do motor
    const alvoTurbo = gas ? 0.4 + 0.6 * r : 0.12 + 0.18 * r;
    turbo += (alvoTurbo - turbo) * (1 - Math.exp(-dt / (alvoTurbo > turbo ? 0.45 : 0.9)));
    const fT = TURBO_HZ[0] + (TURBO_HZ[1] - TURBO_HZ[0]) * Math.min(1, turbo);
    tu1.frequency.setTargetAtTime(fT, t, 0.03); tu2.frequency.setTargetAtTime(fT * 1.498, t, 0.03); tuAr.frequency.setTargetAtTime(fT, t, 0.03); tuFiltro.frequency.setTargetAtTime(fT, t, 0.05);
    turboG.gain.setTargetAtTime(ativo ? (gas ? 0.008 + 0.032 * turbo * turbo : 0.007 + 0.014 * turbo * turbo) * K.turbo : 0, t, gas ? 0.08 : 0.2);
    // o MGU-K: zumbe na ordem 8 da rotação; entrega (ERS ligado) forte, recarrega na frenagem mais fraco e um pouco mais grave
    const recarga = !!freio && !gas && r > 0.3, nivelK = ers && gas ? 1 : recarga ? 0.55 : 0.05;
    const fK = rpmV6(r) / 60 * MGU_ORDEM * (recarga ? 0.9 : 1);
    mg1.frequency.setTargetAtTime(fK, t, 0.04); mg2.frequency.setTargetAtTime(fK * 2, t, 0.04); mguBp.frequency.setTargetAtTime(Math.min(3500, fK * 1.4), t, 0.1);
    mguG.gain.setTargetAtTime(ativo ? nivelK * (0.4 + 0.6 * r) * 0.034 * K.mgu : 0, t, nivelK > 0.9 ? 0.06 : 0.15);
  }
  function silenciar(t) {
    for (const g of [saidaMotor, fogoG, combG, bxG, mdG, vibG, admG, arG, lfoAmp, turboG, mguG]) g.gain.setTargetAtTime(0, t, 0.05);
    outros(t, null, 0, false);
  }
  // lista: [{ dist (m), vRel (m/s, positivo = se aproximando), v (m/s), lado (-1 esquerda a 1 direita) }], n: quantos valem
  function outros(t, lista, n, ativo) {
    for (let i = 0; i < VOZES; i++) {
      const v = vozes[i], r = ativo && lista && i < n ? lista[i] : null;
      if (!r) { v.g.gain.setTargetAtTime(0, t, 0.1); continue; }
      const rot = rotacaoPorVelocidade(r.v), dop = SOM / (SOM - Math.max(-150, Math.min(150, r.vRel * 1.35))); // Doppler forte: o "nheeeeooow" na passagem
      const f3 = rpmV6(rot) / 20 * dop * v.fino;
      v.a.frequency.setTargetAtTime(f3, t, 0.045); v.b.frequency.setTargetAtTime(f3 / 6, t, 0.045);
      v.w.frequency.setTargetAtTime((TURBO_HZ[0] + (TURBO_HZ[1] - TURBO_HZ[0]) * rot * rot) * dop, t, 0.045); // o assobio acompanha o Doppler
      v.f.frequency.setTargetAtTime((800 + rot * rot * rot * 3600) / (1 + r.dist / 240), t, 0.08);
      v.g.gain.setTargetAtTime(0.11 / (1 + Math.pow(r.dist / 32, 1.4)), t, 0.07);
      if (v.p) v.p.pan.setTargetAtTime(r.lado * 0.85, t, 0.07);
    }
  }
  return { atualizar, silenciar, outros };
}
