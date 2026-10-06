// Ginásio: o leitor de GIF animado (os quadros dos sprites dos Pokémon).
const test = require("node:test");
const assert = require("node:assert");
const Gif = require("../public/ginasio/gif.js");

// monta um GIF pequeno sem compressão de verdade: um "limpar" a cada 2 códigos, para o tamanho do código nunca crescer
function gif(w, h, paleta, quadros) {
  const out = [...Buffer.from("GIF89a"), w & 255, w >> 8, h & 255, h >> 8, 0x81, 0, 0];
  for (const [r, g, b] of paleta) out.push(r, g, b);
  for (const q of quadros) {
    out.push(0x21, 0xf9, 4, (q.descarte << 2) | (q.transparente >= 0 ? 1 : 0), (q.atraso / 10) & 255, 0, Math.max(0, q.transparente), 0);
    out.push(0x2c, q.x & 255, 0, q.y & 255, 0, q.w & 255, 0, q.h & 255, 0, 0, 2);
    const codigos = [4];
    q.px.forEach((c, i) => { codigos.push(c); if (i % 2 === 1) codigos.push(4); });
    codigos.push(5);
    const bytes = []; let acc = 0, bits = 0;
    for (const c of codigos) { acc |= c << bits; bits += 3; while (bits >= 8) { bytes.push(acc & 255); acc >>= 8; bits -= 8; } }
    if (bits) bytes.push(acc & 255);
    for (let i = 0; i < bytes.length; i += 255) { const parte = bytes.slice(i, i + 255); out.push(parte.length, ...parte); }
    out.push(0);
  }
  out.push(0x3b);
  return Uint8Array.from(out);
}

test("gif: lê os quadros, o tempo, a transparência e o descarte", () => {
  const pal = [[0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
  const g = Gif.decodificar(gif(3, 2, pal, [
    { x: 0, y: 0, w: 3, h: 2, atraso: 80, descarte: 2, transparente: 0, px: [1, 0, 2, 3, 3, 0] },
    { x: 1, y: 1, w: 2, h: 1, atraso: 0, descarte: 0, transparente: -1, px: [2, 1] },
  ]));
  assert.strictEqual(g.w, 3); assert.strictEqual(g.h, 2); assert.strictEqual(g.quadros.length, 2);
  assert.strictEqual(g.quadros[0].atraso, 80);
  assert.strictEqual(g.quadros[1].atraso, 100, "tempo zero vira 100 ms, como no navegador");
  const px = (q, x, y) => Array.from(g.quadros[q].rgba.slice((y * 3 + x) * 4, (y * 3 + x) * 4 + 4));
  assert.deepStrictEqual(px(0, 0, 0), [255, 0, 0, 255]);
  assert.deepStrictEqual(px(0, 1, 0), [0, 0, 0, 0], "o índice transparente fica vazio");
  assert.deepStrictEqual(px(0, 0, 1), [0, 0, 255, 255]);
  // o primeiro quadro foi descartado (2 = limpa a área), então só o segundo aparece
  assert.deepStrictEqual(px(1, 0, 0), [0, 0, 0, 0]);
  assert.deepStrictEqual(px(1, 1, 1), [0, 255, 0, 255]);
  assert.deepStrictEqual(px(1, 2, 1), [255, 0, 0, 255]);
});

test("gif: recusa o que não é GIF", () => {
  assert.throws(() => Gif.decodificar(Uint8Array.from([1, 2, 3])));
});
