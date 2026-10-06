// Lê um GIF animado e devolve os quadros prontos (RGBA, já montados uns sobre os outros) com o tempo de cada um.
// O canvas não toca GIF sozinho: os sprites animados dos Pokémon passam por aqui uma vez e viram uma lista de quadros.
// Sem dependência: é só o formato GIF89a (paleta, transparência, entrelaçado, descarte) e a descompressão LZW.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GifQuadros = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function lzw(minimo, dados, total) {
    const saida = new Uint8Array(total);
    const limpar = 1 << minimo, fim = limpar + 1;
    const prefixo = new Int16Array(4096), sufixo = new Uint8Array(4096), primeiro = new Uint8Array(4096), pilha = new Uint8Array(4097);
    for (let i = 0; i < limpar; i++) { prefixo[i] = -1; sufixo[i] = i; primeiro[i] = i; }
    let tam = minimo + 1, mascara = (1 << tam) - 1, prox = fim + 1, velho = -1, pos = 0, bits = 0, acc = 0, p = 0;
    while (pos < total) {
      while (bits < tam && p < dados.length) { acc |= dados[p++] << bits; bits += 8; }
      if (bits < tam) break;
      let codigo = acc & mascara; acc >>>= tam; bits -= tam;
      if (codigo === limpar) { tam = minimo + 1; mascara = (1 << tam) - 1; prox = fim + 1; velho = -1; continue; }
      if (codigo === fim) break;
      if (velho === -1) { if (codigo >= limpar) break; saida[pos++] = codigo; velho = codigo; continue; }
      const lido = codigo;
      let sp = 0;
      if (codigo >= prox) { pilha[sp++] = primeiro[velho]; codigo = velho; } // o caso "KwKwK"
      while (codigo >= limpar) { pilha[sp++] = sufixo[codigo]; codigo = prefixo[codigo]; }
      pilha[sp++] = codigo;
      while (sp > 0 && pos < total) saida[pos++] = pilha[--sp];
      if (prox < 4096) {
        prefixo[prox] = velho; sufixo[prox] = codigo; primeiro[prox] = primeiro[velho]; prox++;
        if (prox > mascara && tam < 12) { tam++; mascara = (1 << tam) - 1; }
      }
      velho = lido;
    }
    return saida;
  }

  function decodificar(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b.length < 13 || String.fromCharCode(b[0], b[1], b[2]) !== "GIF") throw new Error("não é GIF");
    let p = 6;
    const u16 = () => { const v = b[p] | (b[p + 1] << 8); p += 2; return v; };
    const w = u16(), h = u16(), campos = b[p++]; p += 2;
    const paleta = (n) => { const pal = b.subarray(p, p + n * 3); p += n * 3; return pal; };
    const global = campos & 0x80 ? paleta(1 << ((campos & 7) + 1)) : null;
    const tela = new Uint8ClampedArray(w * h * 4), quadros = [];
    let controle = { descarte: 0, atraso: 100, transparente: -1 };
    const blocos = () => { const partes = []; let n = 0; while (p < b.length) { const t = b[p++]; if (!t) break; partes.push(b.subarray(p, p + t)); n += t; p += t; } const out = new Uint8Array(n); let o = 0; for (const x of partes) { out.set(x, o); o += x.length; } return out; };
    while (p < b.length) {
      const marca = b[p++];
      if (marca === 0x3b) break;
      if (marca === 0x21) {
        const rotulo = b[p++];
        if (rotulo === 0xf9) {
          const d = blocos(), cs = d[0] || 0, atraso = (d[1] | (d[2] << 8)) * 10;
          controle = { descarte: (cs >> 2) & 7, atraso: atraso < 20 ? 100 : atraso, transparente: cs & 1 ? d[3] : -1 };
        } else blocos();
        continue;
      }
      if (marca !== 0x2c) break;
      const x0 = u16(), y0 = u16(), qw = u16(), qh = u16(), cq = b[p++];
      const pal = cq & 0x80 ? paleta(1 << ((cq & 7) + 1)) : global;
      const minimo = b[p++], indices = lzw(minimo, blocos(), qw * qh);
      const salvo = controle.descarte === 3 ? tela.slice() : null;
      // linhas entrelaçadas chegam na ordem 0, 8, 16..., depois 4, 12..., 2, 6..., 1, 3...
      const linhas = [];
      if (cq & 0x40) { for (const [ini, passo] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = ini; y < qh; y += passo) linhas.push(y); }
      else for (let y = 0; y < qh; y++) linhas.push(y);
      if (pal) linhas.forEach((y, i) => {
        const ty = y0 + y; if (ty >= h) return;
        for (let x = 0; x < qw; x++) {
          const tx = x0 + x; if (tx >= w) continue;
          const k = indices[i * qw + x]; if (k === controle.transparente) continue;
          const o = (ty * w + tx) * 4;
          tela[o] = pal[k * 3]; tela[o + 1] = pal[k * 3 + 1]; tela[o + 2] = pal[k * 3 + 2]; tela[o + 3] = 255;
        }
      });
      quadros.push({ rgba: tela.slice(), atraso: controle.atraso });
      if (controle.descarte === 2) for (let y = y0; y < Math.min(h, y0 + qh); y++) tela.fill(0, (y * w + x0) * 4, (y * w + Math.min(w, x0 + qw)) * 4);
      else if (salvo) tela.set(salvo);
      controle = { descarte: 0, atraso: 100, transparente: -1 };
    }
    if (!quadros.length) throw new Error("GIF sem quadros");
    return { w, h, quadros };
  }

  return { decodificar };
});
