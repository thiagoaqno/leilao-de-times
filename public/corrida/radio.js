// Corrida da Galera — o engenheiro de equipe no rádio. Script comum (window.Radio) usado na garagem, na temporada e na corrida.
// Toca radio/<id>.mp3 (gerado por GERAR-VOZES-CORRIDA.bat); sem o arquivo, não toca nada (sem texto na tela e sem erro). O botão do fone liga e
// desliga a voz (store `corrida:radio`), sem mexer no som geral; sem legenda. A voz passa por um filtro de rádio
// (passa-faixa de 300 a 3000 Hz, com chiado e um clique antes e depois) e pelo volume geral (`master` de sons.js).
(function (root) {
const F = (typeof module !== "undefined" && module.exports) ? require("./radio/falas.js") : root.RadioFalas;
const INTERVALO = 10000; // no máximo uma fala a cada 10 s, salvo as urgentes (box, safety car): o rádio não pode cansar
const ESPERA = 30000;   // a mesma situação não se repete antes disso
const ESPERA_SIT = { ganhou: 90000, perdeu: 90000, dano: 60000, pneu: 60000 }; // as que acontecem toda hora falam bem menos
const espera = (fn, ms) => { const t = setTimeout(fn, ms); if (t && t.unref) t.unref(); return t; };
const temDOM = typeof document !== "undefined" && typeof window !== "undefined";

// ---------- a escolha (pura, testável) ----------
// Uma variação da situação, sem repetir a última dita. `rnd` devolve [0, 1).
function escolher(situacao, ultimoId, rnd = Math.random) {
  const todas = F.porSituacao(situacao); if (!todas.length) return null;
  const opcoes = todas.length > 1 ? todas.filter((f) => f.id !== ultimoId) : todas;
  return opcoes[Math.min(opcoes.length - 1, Math.floor(rnd() * opcoes.length))];
}

// ---------- o estado ----------
let ultimoId = null, ultimaFala = -Infinity, tocando = false, fila = [];
const porSituacao = {}, faltam = new Set(), buffers = new Map();
let mudo = false, saida = null, ac = null, ganho = null, timerFila = 0;
try { mudo = JSON.parse(localStorage.getItem("corrida:radio")) === false; } catch {}

// o contexto de áudio: o de sons.js (com o volume geral) se ele se apresentar; senão um próprio
function usarSaida(fn) { saida = fn; }
function contexto() {
  try {
    const s = saida && saida(); if (s && s.ac) return { c: s.ac, destino: s.saida, abafar: s.abafar };
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); ganho = ac.createGain(); let v = 0.7;
      try { const x = JSON.parse(localStorage.getItem("corrida:volume")); if (typeof x === "number") v = x; } catch {}
      ganho.gain.value = v; ganho.connect(ac.destination);
    }
    return { c: ac, destino: ganho };
  } catch { return null; }
}

// ---------- o botão ----------
function desenharBotoes() {
  if (!temDOM) return;
  const risco = mudo ? '<path d="M3 3l18 18"/>' : "";
  document.querySelectorAll("[data-radio-botao]").forEach((b) => {
    b.setAttribute("aria-pressed", String(!mudo)); b.classList.toggle("mudo", mudo);
    b.title = mudo ? "Voz do engenheiro desligada" : "Voz do engenheiro ligada";
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>${risco}</svg>`;
  });
}
function silenciar(v) {
  mudo = v == null ? !mudo : !!v;
  try { localStorage.setItem("corrida:radio", JSON.stringify(!mudo)); } catch {}
  if (mudo) fila = [];
  desenharBotoes(); return mudo;
}
if (temDOM) {
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-radio-botao]"); if (b) { silenciar(); e.stopPropagation(); } }, true);
  const primeiro = () => { const x = contexto(); if (x && x.c.state === "suspended") x.c.resume(); proximo(); }; // o navegador só libera o áudio depois de um toque
  window.addEventListener("pointerdown", primeiro, { once: true, capture: true }); window.addEventListener("keydown", primeiro, { once: true, capture: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", desenharBotoes); else desenharBotoes();
}

// ---------- tocar ----------
function carregar(f) {
  if (faltam.has(f.id)) return Promise.resolve(null);
  if (buffers.has(f.id)) return Promise.resolve(buffers.get(f.id));
  const x = contexto(); if (!x || typeof fetch !== "function") return Promise.resolve(null);
  return fetch(`/corrida/radio/${f.id}.mp3`).then((r) => { if (!r.ok) throw new Error("sem arquivo"); return r.arrayBuffer(); })
    .then((b) => x.c.decodeAudioData(b)).then((buf) => (buffers.set(f.id, buf), buf)).catch(() => (faltam.add(f.id), null)); // sem mp3: fica em silêncio
}
function ruido(c, dur, vol, destino, t) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
  fl.type = "bandpass"; fl.frequency.value = 2200; g.gain.value = vol; s.buffer = b; s.connect(fl).connect(g).connect(destino); s.start(t);
}
// o HUD mostra o cartão "RÁDIO" do engenheiro enquanto ele fala (evento `radio:fala` com { on })
function avisarFala(on, atraso) { if (!temDOM) return; const ir = () => window.dispatchEvent(new CustomEvent("radio:fala", { detail: { on } })); if (atraso > 0.01) setTimeout(ir, atraso * 1000); else ir(); }
function tocar(buf, fim) {
  const x = contexto(); if (!x || x.c.state === "suspended") return false;
  const c = x.c, t = c.currentTime + 0.02, ini = t + 0.09;
  const alto = c.createBiquadFilter(), baixo = c.createBiquadFilter(), g = c.createGain(), s = c.createBufferSource();
  alto.type = "highpass"; alto.frequency.value = 300; baixo.type = "lowpass"; baixo.frequency.value = 3000; g.gain.value = 2.6; s.buffer = buf;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; // (a voz mais alta que o motor, sem estourar)
  s.connect(alto).connect(baixo).connect(g).connect(comp).connect(x.destino);
  if (x.abafar) x.abafar(true);
  avisarFala(true, ini - c.currentTime);
  ruido(c, 0.07, 0.08, x.destino, t);                         // o clique de abrir o rádio
  s.start(ini); ruido(c, buf.duration + 0.04, 0.012, x.destino, ini); // chiado leve por baixo da voz
  ruido(c, 0.1, 0.07, x.destino, ini + buf.duration);         // o clique de fechar
  s.onended = () => { if (x.abafar) x.abafar(false); avisarFala(false, 0); fim(); }; return true;
}
function proximo() {
  clearTimeout(timerFila); if (tocando || !fila.length) return;
  const agora = Date.now(), f = fila[0], urgente = F.URGENTES.includes(f.quando);
  if (!urgente && agora - ultimaFala < INTERVALO) { timerFila = espera(proximo, INTERVALO - (agora - ultimaFala) + 20); return; }
  fila.shift(); ultimaFala = agora; ultimoId = f.id; porSituacao[f.quando] = agora;
  if (mudo || !temDOM) { timerFila = espera(proximo, 50); return; }
  tocando = true;
  const livre = () => { tocando = false; ultimaFala = Date.now(); timerFila = espera(proximo, 80); }; // a fila não sobrepõe: a próxima só começa quando esta acaba
  carregar(f).then((buf) => { if (!buf || !tocar(buf, livre)) livre(); }).catch(livre);
}

// pede a fala de uma situação; devolve a escolhida (ou null se ficou de fora)
function dizer(situacao, op = {}) {
  try {
    if (!F.SITUACOES[situacao]) return null;
    const agora = Date.now(), urgente = F.URGENTES.includes(situacao);
    if (!op.forcar && agora - (porSituacao[situacao] || -Infinity) < (ESPERA_SIT[situacao] || ESPERA)) return null;
    if (!urgente && fila.length) return null; // não acumula fala velha
    const f = escolher(situacao, ultimoId); if (!f) return null;
    ultimoId = f.id; porSituacao[situacao] = agora;
    if (urgente) fila.unshift(f); else fila.push(f);
    proximo(); return f;
  } catch { return null; }
}

// ---------- as ligações com o jogo ----------
let posAtual = null, posCand = null, posDesde = 0, posChave = null, posInicio = 0;
function posicao(pos, chave) { // a posição na torre: ganhou/perdeu depois de ficar 2 s no lugar novo
  const agora = Date.now();
  if (chave !== posChave) { posChave = chave; posAtual = pos; posCand = null; posInicio = agora; return; }
  if (agora - posInicio < 12000) { posAtual = pos; return; } // a confusão da largada fica de fora
  if (pos === posAtual) { posCand = null; return; }
  if (posCand !== pos) { posCand = pos; posDesde = agora; return; }
  if (agora - posDesde >= 2000) { dizer(pos < posAtual ? "ganhou" : "perdeu"); posAtual = pos; posCand = null; }
}
const vistos = new Set();
function uma(chave, fn) { if (vistos.has(chave)) return; vistos.add(chave); fn(); } // uma vez por chave (a corrida, o pneu...)
function avisoF1(tipo) { // `tipo` vem de AvisosF1.tipoDoTexto
  const s = { sc: "safety", amarela: "amarela", quebra: "dano", batida: "dano", drs: "drs", vmr: "voltarapida", punicao: "punicao", preta: "abandono" }[tipo];
  if (s) dizer(s);
}
function fim(pos, pontos, dnf) { dizer(dnf ? "abandono" : pos === 1 ? "vitoria" : pos <= 3 ? "podio" : pontos > 0 ? "pontos" : "foradospontos", { forcar: true }); }
function classificacao(pos, total) { dizer(pos <= Math.ceil(total / 3) ? "classboa" : pos > Math.floor(total * 2 / 3) ? "classruim" : "", { forcar: true }); }

const api = { escolher, dizer, usarSaida, posicao, uma, avisoF1, fim, classificacao, silenciar, desenharBotoes, get mudo() { return mudo; }, INTERVALO };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Radio = api;
})(typeof self !== "undefined" ? self : this);
