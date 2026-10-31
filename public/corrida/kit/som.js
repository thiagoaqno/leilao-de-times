// Kit de pista — o som de cada região, que muda conforme o carro passa. Tudo sintetizado (sem arquivo de áudio) e no
// barramento de Sound.ambiente (sons.js), que abre e fecha junto com o motor. Regiões que o kit acha sozinho:
//   tunel (tr.coberto: zumbido dos exaustores e o eco do motor; lá dentro o resto quase some),
//   torcida (tr.arquibancadas: [[i0, i1], ...]) e heli (a distância até o helicóptero da TV).
// Regiões que cada GP diz (funções (tr, x, y) => 0 a 1; pertoDe ajuda):
//   porto (ondas, gaivotas, buzina de iate), fonte, sinos, campo (vento e passarinhos de autódromo);
//   cidade é um número ou função (o ronco da rua e as lambretas); sem ela, 1 - 0,7 × porto.
import { Sound } from "../sons.js";

const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// 1 em cima do ponto, 0 a `raio` dele; ponto(tr) dá { x, y } (ou nada, e a região fica muda)
export const pertoDe = (ponto, raio) => (tr, x, y) => { const p = ponto(tr); return p ? lim(1 - Math.hypot(p.x - x, p.y - y) / raio) : 0; };

export function somGP(tr, regioes = {}) {
  let S = null;
  const prox = { gaivota: 2, buzina: 18, lambreta: 5, sinos: 6, passaro: 3 };
  const peso = { porto: 0, torcida: 0, cidade: 0, fonte: 0, tunel: 0, heli: 0, sinos: 0, campo: 0 };
  tr.somGP = peso; // o peso de cada região agora (para conferir no #debug)
  function montar() {
    const bus = Sound.ambiente(); if (!bus) return null;
    const c = bus.context, len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    const ruido = (tipo, f, q = 0.7) => { const s = c.createBufferSource(); s.buffer = b; s.loop = true; const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(bus); s.start(0, Math.random() * 2); return g; };
    const o = { c, bus };
    o.ondas = ruido("lowpass", 420); o.espuma = ruido("bandpass", 1600, 0.4);
    o.torcida = ruido("bandpass", 850, 0.5); o.grito = ruido("bandpass", 2300, 1.2);
    o.cidade = ruido("lowpass", 170); o.fonte = ruido("highpass", 2200);
    o.tunel = ruido("lowpass", 110); o.vento = ruido("bandpass", 480, 0.3);
    // o helicóptero: ruído grave pulsando no ritmo das pás (um LFO no ganho)
    o.heli = c.createGain(); o.heli.gain.value = 0; o.heli.connect(bus);
    const hs = c.createBufferSource(); hs.buffer = b; hs.loop = true; const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 340; const pulso = c.createGain(); pulso.gain.value = 0.5;
    const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 17; lfoG.gain.value = 0.5; lfo.connect(lfoG).connect(pulso.gain); hs.connect(hf).connect(pulso).connect(o.heli); hs.start(); lfo.start();
    return o;
  }
  // um som curto: um tom com envelope (gaivota, buzina, lambreta, sino, passarinho)
  function tom(f0, f1, dur, vol, tipo = "triangle", filtro = 0, em = 0) {
    const { c, bus } = S, t = c.currentTime + em, o = c.createOscillator(), g = c.createGain(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let saida = o; if (filtro) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtro; o.connect(f); saida = f; }
    saida.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  const suave = (k, alvo, dt, vel = 1.5) => (peso[k] += (alvo - peso[k]) * (1 - Math.exp(-dt * vel)));
  const ganho = (g, v) => g.gain.setTargetAtTime(v, S.c.currentTime, 0.15);
  const regiao = (nome, x, y) => (regioes[nome] ? regioes[nome](tr, x, y) : 0);
  // a cada quadro: foco é quem a câmera segue ({ x, y, z }), idx o ponto da pista dele, heli a posição do helicóptero
  return (dt, foco, idx, heli, t) => {
    if (!S) { S = montar(); if (!S) return; peso.ligado = true; }
    const { n } = tr, x = foco.x, y = foco.y, porto = regiao("porto", x, y);
    let torcida = 0; for (const [a, b] of tr.arquibancadas || []) { const i = idx < a - n / 2 ? idx + n : idx, fora = Math.max(a - i, i - b, 0); torcida = Math.max(torcida, lim(1 - fora / 70)); }
    const cidade = typeof regioes.cidade === "number" ? regioes.cidade : regioes.cidade ? regioes.cidade(tr, x, y) : lim(1 - porto * 0.7);
    suave("tunel", tr.coberto?.(idx) ? 1 : 0, dt, 3); suave("porto", porto, dt); suave("torcida", torcida, dt, 2);
    suave("fonte", regiao("fonte", x, y), dt); suave("sinos", regiao("sinos", x, y), dt); suave("campo", regiao("campo", x, y), dt); suave("cidade", cidade, dt);
    suave("heli", heli ? lim(1 - Math.hypot(heli.x - x, heli.y - (foco.z || 0), heli.z - y) / 900) : 0, dt);
    const fora = 1 - peso.tunel * 0.9, onda = 0.6 + 0.4 * Math.sin(t * 0.8) * Math.sin(t * 0.31 + 1);
    ganho(S.ondas, 0.05 * peso.porto * onda * fora); ganho(S.espuma, 0.012 * peso.porto * onda * onda * fora);
    ganho(S.torcida, 0.035 * peso.torcida * fora * (0.8 + 0.2 * Math.sin(t * 1.3))); ganho(S.grito, 0.012 * peso.torcida * fora * Math.max(0, Math.sin(t * 0.9 + Math.sin(t * 2.1))));
    ganho(S.cidade, 0.03 * peso.cidade * fora); ganho(S.fonte, 0.018 * peso.fonte * fora); ganho(S.tunel, 0.06 * peso.tunel);
    ganho(S.vento, 0.02 * peso.campo * fora * (0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 2)));
    ganho(S.heli, 0.05 * peso.heli * fora);
    Sound.eco(0.25 * peso.tunel);
    // os sons de vez em quando
    for (const k in prox) prox[k] -= dt;
    if (prox.gaivota <= 0) { prox.gaivota = 2 + Math.random() * 5; if (peso.porto > 0.3) { const f = 1700 + Math.random() * 600, v = 0.02 * peso.porto * fora; for (let k = 0; k < 2 + ((Math.random() * 3) | 0); k++) tom(f, f * 0.72, 0.28, v, "triangle", 0, k * 0.32); } }
    if (prox.buzina <= 0) { prox.buzina = 25 + Math.random() * 30; if (peso.porto > 0.5) { tom(98, 96, 1.8, 0.03 * peso.porto * fora, "sawtooth", 600); tom(123, 121, 1.8, 0.02 * peso.porto * fora, "sawtooth", 600); } }
    if (prox.lambreta <= 0) { prox.lambreta = 6 + Math.random() * 9; if (peso.cidade > 0.5 && peso.tunel < 0.2) tom(70 + Math.random() * 20, 150, 2.4, 0.012 * peso.cidade, "sawtooth", 900); }
    if (prox.sinos <= 0) { prox.sinos = 30 + Math.random() * 20; if (peso.sinos > 0.2) for (let k = 0; k < 4; k++) { const f = k % 2 ? 587 : 659; tom(f, f * 0.995, 2.6, 0.03 * peso.sinos * fora, "sine", 0, k * 0.9); tom(f * 2.4, f * 2.39, 1.2, 0.008 * peso.sinos * fora, "sine", 0, k * 0.9); } }
    if (prox.passaro <= 0) { prox.passaro = 1.5 + Math.random() * 4; if (peso.campo > 0.3) { const f = 2600 + Math.random() * 1400, v = 0.008 * peso.campo * fora; for (let k = 0; k < 3 + ((Math.random() * 4) | 0); k++) tom(f, f * (0.85 + Math.random() * 0.3), 0.09, v, "sine", 0, k * 0.12); } }
  };
}
