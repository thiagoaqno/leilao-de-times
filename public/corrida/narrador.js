// Corrida da Galera — o narrador de TV que apresenta a pista na transmissão (window.Narrador). Script comum, como o radio.js.
// Toca narrador/<pista>-<n>.mp3 (gerado por GERAR-VOZES-CORRIDA.bat); sem o arquivo, não toca nada (sem texto e sem erro). Uma fala só por
// vez: pedir outra, pular ou chegar a hora do corte (as luzes) corta a voz com um fade curto. Passa pelo volume geral (`master` de
// sons.js) e respeita o som desligado do jogo. A voz do engenheiro (radio.js) é outra coisa e tem o seu próprio botão.
(function (root) {
const F = (typeof module !== "undefined" && module.exports) ? require("./narrador/falas.js") : root.NarradorFalas;
const temDOM = typeof document !== "undefined" && typeof window !== "undefined";
const buffers = new Map(), faltam = new Set();
let saida = null, ac = null, ganhoGeral = null, atual = null, sessao = 0, timerCorte = 0;

// o contexto de áudio: o de sons.js (com o volume geral e o som ligado/desligado) se ele se apresentar; senão um próprio
function usarSaida(fn) { saida = fn; }
function contexto() {
  try {
    const s = saida && saida(); if (s && s.ac) return { c: s.ac, destino: s.saida, ligado: s.ligado !== false };
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); ganhoGeral = ac.createGain(); let v = 0.7;
      try { const x = JSON.parse(localStorage.getItem("corrida:volume")); if (typeof x === "number") v = x; } catch {}
      ganhoGeral.gain.value = v; ganhoGeral.connect(ac.destination);
    }
    return { c: ac, destino: ganhoGeral, ligado: true };
  } catch { return null; }
}

function carregar(id) {
  if (faltam.has(id)) return Promise.resolve(null);
  if (buffers.has(id)) return Promise.resolve(buffers.get(id));
  const x = contexto(); if (!x || typeof fetch !== "function") return Promise.resolve(null);
  return fetch(`/corrida/narrador/${id}.mp3`).then((r) => { if (!r.ok) throw new Error("sem arquivo"); return r.arrayBuffer(); })
    .then((b) => x.c.decodeAudioData(b)).then((buf) => (buffers.set(id, buf), buf)).catch(() => (faltam.add(id), null)); // sem mp3: fica em silêncio
}

// corta a voz que estiver no ar (fade curto, para não estalar)
function parar(fade = 0.2) {
  sessao++; clearTimeout(timerCorte);
  const a = atual; atual = null; if (!a) return;
  try {
    const t = a.c.currentTime; a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.linearRampToValueAtTime(0, t + fade);
    a.s.stop(t + fade + 0.02);
  } catch {}
}
// abaixa (ou volta) o volume da voz que está no ar, em `seg` segundos: o grid fala por cima do narrador
function abaixar(nivel = 0.3, seg = 0.6) {
  if (!atual) return;
  try { const t = atual.c.currentTime; atual.g.gain.cancelScheduledValues(t); atual.g.gain.setValueAtTime(atual.g.gain.value, t); atual.g.gain.linearRampToValueAtTime(nivel, t + seg); } catch {}
}

// toca a fala `id`. `cortarEm`: daqui a quantos ms a voz é cortada de qualquer jeito (as luzes da largada). Devolve a promessa de
// "tocou?" — falso se não há mp3, se o som está desligado ou se, enquanto carregava, a fala foi cortada.
function falar(id, op = {}) {
  parar(0.05);
  const minha = sessao;
  if (!temDOM) return Promise.resolve(false);
  if (Number.isFinite(op.cortarEm)) timerCorte = setTimeout(() => { if (sessao === minha) parar(0.35); }, Math.max(0, op.cortarEm));
  return carregar(id).then((buf) => {
    const x = contexto();
    if (!buf || !x || !x.ligado || sessao !== minha) return false;
    if (x.c.state === "suspended") x.c.resume();
    const s = x.c.createBufferSource(), g = x.c.createGain();
    g.gain.value = 1; s.buffer = buf; s.connect(g).connect(x.destino);
    const a = { c: x.c, s, g }; atual = a;
    s.onended = () => { if (atual === a) atual = null; };
    s.start(x.c.currentTime + 0.02); return true;
  }).catch(() => false);
}

// a fala da pista para este GP, sorteada pela semente (igual para todos da sala)
function falarDaPista(pista, semente, op) {
  const f = F && F.escolher(pista, semente); if (!f) return Promise.resolve(false);
  return falar(f.id, op);
}

let ultimoEvento = 0;
function falarEvento(tipo) {
  const opcoes = F?.porEvento(tipo) || [], agora = Date.now();
  if (!opcoes.length || atual || root.Radio?.tocando || agora - ultimoEvento < 25000) return Promise.resolve(false);
  ultimoEvento = agora;
  return falar(opcoes[Math.floor(Math.random() * opcoes.length)].id);
}
const api = { falar, falarDaPista, falarEvento, parar, abaixar, usarSaida, get tocando() { return !!atual; } };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Narrador = api;
})(typeof self !== "undefined" ? self : this);
