// Reflexões curtas e discretas do túnel; o som original continua direto.
// A mesma resposta é usada no jogo e na prévia de áudio.
export function criarReverberacao(c) {
  const len = Math.ceil(c.sampleRate * 0.25), buffer = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    d[Math.floor((0.075 + ch * 0.003) * c.sampleRate)] = 0.5;
    d[Math.floor((0.150 + ch * 0.003) * c.sampleRate)] = 0.18;
  }
  const conv = c.createConvolver(); conv.normalize = false; conv.buffer = buffer; return conv;
}
