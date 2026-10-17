// Sons curtos sintetizados; so comecam depois de um gesto da pessoa.
let audio = null, somLigado = store.get("ginasio:som") !== false, ultimoSom = 0;
function atualizarSom() {
  const titulo = somLigado ? "Desligar o som" : "Ligar o som";
  $("btnSound").innerHTML = ic(somLigado ? "som" : "mudo"); $("btnSound").title = titulo; $("btnSound").setAttribute("aria-label", titulo);
}
function ativarSom() {
  if (!somLigado) return;
  try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume().catch(() => {}); } catch {}
}
function nota(frequencia, fim, duracao, forma = "sine", atraso = 0) {
  if (!audio || !somLigado || audio.state !== "running") return;
  const inicio = audio.currentTime + atraso, osc = audio.createOscillator(), ganho = audio.createGain();
  osc.type = forma; osc.frequency.setValueAtTime(frequencia, inicio); osc.frequency.exponentialRampToValueAtTime(Math.max(20, fim), inicio + duracao);
  ganho.gain.setValueAtTime(0.025, inicio); ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
  osc.connect(ganho); ganho.connect(audio.destination); osc.start(inicio); osc.stop(inicio + duracao);
}
// ---------- o som dos golpes (o 6º tempo da encenação, encenacao.js) ----------
// ruído filtrado (chiado, estalo, rugido) e tons que sobem ou descem, cada família com o seu timbre
let bufRuido = null;
function ruidoBranco() {
  if (bufRuido) return bufRuido;
  bufRuido = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const d = bufRuido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return bufRuido;
}
// [filtro, freq. inicial, freq. final, Q, duração, volume]
function chiado(filtro, f0, f1, q, dur, vol, atraso = 0) {
  if (!audio || !somLigado || audio.state !== "running") return;
  const t = audio.currentTime + atraso, fonte = audio.createBufferSource(), filt = audio.createBiquadFilter(), ganho = audio.createGain();
  fonte.buffer = ruidoBranco(); fonte.loop = true;
  filt.type = filtro; filt.Q.value = q; filt.frequency.setValueAtTime(f0, t); filt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  ganho.gain.setValueAtTime(0.0001, t); ganho.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  fonte.connect(filt); filt.connect(ganho); ganho.connect(audio.destination);
  fonte.start(t, Math.random() * 0.5); fonte.stop(t + dur + 0.02);
}
function tom(f0, f1, dur, forma, vol, atraso = 0) {
  if (!audio || !somLigado || audio.state !== "running") return;
  const t = audio.currentTime + atraso, osc = audio.createOscillator(), ganho = audio.createGain();
  osc.type = forma; osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  ganho.gain.setValueAtTime(vol, t); ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(ganho); ganho.connect(audio.destination); osc.start(t); osc.stop(t + dur + 0.02);
}
// o timbre de cada família: disparo (sai) e impacto (bate); a carga é o mesmo timbre subindo
const TIMBRE = {
  fogo: { disparo: () => chiado("lowpass", 900, 300, 1, 0.25, 0.09), impacto: () => { chiado("lowpass", 1400, 120, 0.7, 0.35, 0.12); tom(120, 50, 0.2, "triangle", 0.05); } },
  dragao: { disparo: () => { chiado("lowpass", 700, 250, 2, 0.3, 0.08); tom(160, 90, 0.3, "sawtooth", 0.02); }, impacto: () => { chiado("lowpass", 1000, 90, 1, 0.4, 0.12); tom(90, 40, 0.3, "triangle", 0.06); } },
  agua: { disparo: () => chiado("bandpass", 1200, 500, 3, 0.22, 0.08), impacto: () => { chiado("bandpass", 2400, 400, 2, 0.3, 0.1); tom(600, 200, 0.12, "sine", 0.03, 0.03); } },
  raio: { disparo: () => { chiado("highpass", 3000, 1500, 1, 0.12, 0.07); tom(880, 1760, 0.08, "square", 0.015); }, impacto: () => { chiado("highpass", 5000, 800, 0.5, 0.18, 0.12); tom(220, 60, 0.15, "square", 0.03); } },
  gelo: { disparo: () => { tom(2200, 3200, 0.12, "sine", 0.02); chiado("highpass", 6000, 4000, 1, 0.15, 0.03); }, impacto: () => { for (let i = 0; i < 3; i++) tom(1800 + i * 600, 1400 + i * 500, 0.12, "triangle", 0.02, i * 0.03); chiado("highpass", 7000, 3000, 1, 0.2, 0.06); } },
  planta: { disparo: () => chiado("bandpass", 2500, 1500, 1.5, 0.18, 0.05), impacto: () => { chiado("bandpass", 1800, 900, 1, 0.25, 0.07); tom(300, 180, 0.1, "triangle", 0.03); } },
  inseto: { disparo: () => tom(500, 520, 0.18, "sawtooth", 0.012), impacto: () => { chiado("bandpass", 2200, 1200, 2, 0.15, 0.06); tom(260, 140, 0.08, "square", 0.02); } },
  pedra: { disparo: () => chiado("lowpass", 500, 300, 1, 0.15, 0.08), impacto: () => { chiado("lowpass", 600, 60, 1, 0.4, 0.16); tom(80, 35, 0.3, "triangle", 0.08); } },
  terra: { disparo: () => chiado("lowpass", 400, 200, 1, 0.2, 0.08), impacto: () => { chiado("lowpass", 500, 50, 1, 0.5, 0.16); tom(70, 30, 0.35, "sine", 0.09); } },
  psiquico: { disparo: () => { tom(400, 800, 0.25, "sine", 0.03); tom(404, 808, 0.25, "sine", 0.03); }, impacto: () => { tom(900, 300, 0.25, "sine", 0.04); tom(905, 302, 0.25, "triangle", 0.025); } },
  fada: { disparo: () => { for (let i = 0; i < 3; i++) tom([1320, 1660, 1980][i], [1320, 1660, 1980][i], 0.1, "sine", 0.02, i * 0.04); }, impacto: () => { for (let i = 0; i < 4; i++) tom([1980, 1660, 1320, 2640][i], 1000, 0.15, "sine", 0.02, i * 0.03); } },
  fantasma: { disparo: () => { tom(300, 220, 0.35, "sine", 0.03); tom(311, 226, 0.35, "sine", 0.03); }, impacto: () => { chiado("bandpass", 600, 200, 4, 0.4, 0.06); tom(220, 110, 0.4, "triangle", 0.03); } },
  sombrio: { disparo: () => chiado("bandpass", 400, 200, 3, 0.25, 0.07), impacto: () => { chiado("lowpass", 700, 100, 2, 0.3, 0.1); tom(110, 55, 0.25, "sawtooth", 0.025); } },
  veneno: { disparo: () => { chiado("bandpass", 700, 400, 6, 0.2, 0.06); tom(180, 260, 0.15, "sine", 0.03); }, impacto: () => { chiado("bandpass", 500, 250, 5, 0.3, 0.09); for (let i = 0; i < 3; i++) tom(300 + i * 90, 500, 0.06, "sine", 0.02, 0.05 + i * 0.05); } },
  aco: { disparo: () => { tom(1200, 900, 0.12, "triangle", 0.03); chiado("highpass", 4000, 3000, 1, 0.08, 0.04); }, impacto: () => { tom(1600, 1500, 0.3, "triangle", 0.035); tom(2410, 2300, 0.25, "sine", 0.02); chiado("highpass", 5000, 2000, 1, 0.1, 0.07); } },
  voador: { disparo: () => chiado("bandpass", 800, 2400, 1, 0.25, 0.07), impacto: () => chiado("bandpass", 2000, 500, 1, 0.3, 0.09) },
  lutador: { disparo: () => chiado("bandpass", 600, 1200, 1, 0.1, 0.06), impacto: () => { chiado("lowpass", 1200, 150, 1, 0.12, 0.14); tom(140, 50, 0.12, "triangle", 0.08); } },
  normal: { disparo: () => chiado("bandpass", 900, 1400, 1, 0.1, 0.05), impacto: () => { chiado("lowpass", 1500, 200, 1, 0.12, 0.11); tom(160, 60, 0.1, "triangle", 0.06); } },
};
const ultimoTempo = {};
// etapa: carga, disparo, impacto, super, fraco, critico; forca muda o volume (e o grave)
function somDoTempo(etapa, fam, forca = 1) {
  if (!audio || !somLigado || document.hidden || audio.state !== "running") return;
  const agora = performance.now(), espera = etapa === "impacto" ? 45 : 70;
  if (agora - (ultimoTempo[etapa] || 0) < espera) return; // rajadas e combos não viram barulho
  ultimoTempo[etapa] = agora;
  const T = TIMBRE[fam] || TIMBRE.normal;
  if (etapa === "carga") { tom(180, 900, 0.45, "sine", 0.025 * forca); chiado("bandpass", 300, 2400, 2, 0.45, 0.04 * forca); }
  else if (etapa === "disparo") T.disparo();
  else if (etapa === "impacto") { T.impacto(); if (forca > 1.2) tom(60, 30, 0.3, "sine", 0.07); }
  else if (etapa === "super") { tom(660, 990, 0.09, "square", 0.02, 0.04); tom(990, 1320, 0.12, "square", 0.02, 0.11); }
  else if (etapa === "fraco") tom(300, 200, 0.12, "triangle", 0.025, 0.04);
  else if (etapa === "critico") { chiado("highpass", 6000, 2500, 0.8, 0.12, 0.09); tom(1400, 2800, 0.08, "square", 0.02, 0.02); }
}
function tocarEvento(e) {
  if (!audio || !somLigado || document.hidden) return;
  const agora = performance.now();
  if (agora - ultimoSom < 40 && e.tipo !== "fim") return;
  // golpe, dano, tiro, impacto e os golpes de área tocam pela encenação (somDoTempo)
  if (e.tipo === "esquiva") nota(280, 760, 0.1);
  else if (e.tipo === "cura") nota(500, 900, 0.16);
  else if (e.tipo === "troca") nota(320, 640, 0.12);
  else if (e.tipo === "sumiu") nota(e.jeito === "voo" ? 300 : 160, e.jeito === "voo" ? 900 : 60, 0.22, e.jeito === "voo" ? "sine" : "triangle");
  else if (e.tipo === "voltou") { nota(e.jeito === "voo" ? 700 : 110, 40, 0.18, "triangle"); nota(90, 30, 0.2, "square", 0.03); }
  else if (e.tipo === "guarda") nota(220, 260, 0.06, "square");
  else if (e.tipo === "aparou") { nota(1400, 900, 0.12, "triangle"); nota(2100, 1800, 0.08, "sine", 0.02); }
  else if (e.tipo === "perfeita") { nota(660, 1320, 0.16); nota(990, 1980, 0.16, "sine", 0.06); }
  else if (e.tipo === "guardaQuebrou") { nota(500, 80, 0.3, "sawtooth"); }
  else if (e.tipo === "batida") { nota(90, 40, 0.18, "square"); }
  else if (e.tipo === "bote") { nota(220, 520, 0.08, "triangle"); } // o arranque do bote
  else if (e.tipo === "atordoado" && e.motivo !== "golpe") nota(880, 660, 0.2, "sine");
  else if (e.tipo === "interrompido") nota(300, 120, 0.15, "triangle");
  else if (e.tipo === "pulou") nota(220, 700, 0.18);
  else if (e.tipo === "aterrissou") { nota(120, 40, 0.22, "triangle"); nota(70, 30, 0.25, "square", 0.02); }
  else if (e.tipo === "combo") nota(e.ultimo ? 160 : 260, 80, 0.07, "triangle");
  else if (e.tipo === "fim") { for (let i = 0; i < 3; i++) nota([440, 550, 660][i], [440, 550, 660][i], 0.18, "triangle", i * 0.13); }
  else return;
  ultimoSom = agora;
}
$("btnSound").onclick = () => { somLigado = !somLigado; store.set("ginasio:som", somLigado); ativarSom(); atualizarSom(); };
document.addEventListener("pointerdown", ativarSom, { once: true });
document.addEventListener("keydown", ativarSom, { once: true });
atualizarSom();
