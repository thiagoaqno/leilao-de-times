// Resposta estéreo de um túnel de concreto: reflexões curtas e uma cauda difusa.
// A mesma resposta é usada no jogo e na prévia de áudio.
export function criarReverberacao(c) {
  const len = Math.floor(c.sampleRate * 1.6), buffer = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch); let semente = 9127 + ch * 173;
    for (let i = 0; i < len; i++) {
      semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
      const tempo = i / c.sampleRate;
      d[i] = ((semente / 2147483648) - 1) * Math.pow(1 - i / len, 2.3) * (tempo < 0.018 ? 0 : 0.06);
    }
    for (const [t, ganho] of [[0.025, 1], [0.052, 0.72], [0.085, 0.53], [0.13, 0.34], [0.19, 0.23]]) {
      const i = Math.floor((t + ch * 0.003) * c.sampleRate); if (i < len) d[i] += ganho;
    }
  }
  const conv = c.createConvolver(); conv.buffer = buffer; return conv;
}
