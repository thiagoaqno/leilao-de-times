// Ludo da Galera — regras e geometria do tabuleiro. Usado pelo servidor (ludo.js) e pela página.
// Tabuleiro 15x15 em cruz. Cada cor anda 51 casas na pista (0..50), 5 na reta final (51..55) e chega em casa (56).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LudoRegras = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const COLORS = ["red", "green", "yellow", "blue"]; // ordem da vez (sentido horário)
  const NAMES = { red: "Vermelho", green: "Verde", yellow: "Amarelo", blue: "Azul" };
  const HEX = { red: "#e23b3b", green: "#2fa84f", yellow: "#f6c21b", blue: "#2f6fd6" };
  const START = { red: 0, green: 13, yellow: 26, blue: 39 }; // casa de saída de cada cor na pista
  const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]); // saídas e estrelas: ninguém come ninguém
  const LAST = 50, FINISH = 56;

  // pista: 52 casas [linha, coluna], começando na saída do vermelho e andando no sentido horário
  const TRACK = [];
  const seg = (pts) => pts.forEach((p) => TRACK.push(p));
  const line = (r0, c0, r1, c1) => { const out = [], dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0); for (let r = r0, c = c0; ; r += dr, c += dc) { out.push([r, c]); if (r === r1 && c === c1) break; } return out; };
  seg(line(6, 1, 6, 5)); seg(line(5, 6, 0, 6)); seg([[0, 7], [0, 8]]); seg(line(1, 8, 5, 8));
  seg(line(6, 9, 6, 14)); seg([[7, 14], [8, 14]]); seg(line(8, 13, 8, 9)); seg(line(9, 8, 14, 8));
  seg([[14, 7], [14, 6]]); seg(line(13, 6, 9, 6)); seg(line(8, 5, 8, 0)); seg([[7, 0], [6, 0]]);
  // reta final de cada cor (5 casas) até o centro
  const HOME = {
    red: line(7, 1, 7, 5), green: line(1, 7, 5, 7), yellow: line(7, 13, 7, 9), blue: line(13, 7, 9, 7),
  };
  // lugares dos peões na base (coordenadas em casas, centro do círculo)
  const BASE = {
    red: [[2, 2], [2, 4], [4, 2], [4, 4]], green: [[2, 11], [2, 13], [4, 11], [4, 13]],
    yellow: [[11, 11], [11, 13], [13, 11], [13, 13]], blue: [[11, 2], [11, 4], [13, 2], [13, 4]],
  };
  // onde ficam os peões que chegaram (no triângulo da cor, no centro)
  const DONE = {
    red: [[7.1, 6.35], [7.9, 6.35], [7.1, 6.85], [7.9, 6.85]], green: [[6.35, 7.1], [6.35, 7.9], [6.85, 7.1], [6.85, 7.9]],
    yellow: [[7.1, 8.65], [7.9, 8.65], [7.1, 8.15], [7.9, 8.15]], blue: [[8.65, 7.1], [8.65, 7.9], [8.15, 7.1], [8.15, 7.9]],
  };

  const abs = (color, pos) => (pos >= 0 && pos <= LAST ? (START[color] + pos) % 52 : null);
  // centro (em casas) de um peão: base, pista, reta final ou chegada
  function where(color, pos, i) {
    if (pos < 0) return BASE[color][i];
    if (pos >= FINISH) return DONE[color][i];
    if (pos > LAST) { const [r, c] = HOME[color][pos - LAST - 1]; return [r + 0.5, c + 0.5]; }
    const [r, c] = TRACK[abs(color, pos)]; return [r + 0.5, c + 0.5];
  }
  // quantos peões de cada cor estão numa casa da pista
  function countAt(pawns, sq) {
    const n = {};
    for (const [color, list] of Object.entries(pawns)) for (const p of list) if (abs(color, p) === sq) n[color] = (n[color] || 0) + 1;
    return n;
  }
  // torre: 2 ou mais peões da mesma cor na mesma casa (não pode ser comida)
  const enemyTower = (pawns, sq, me) => Object.entries(countAt(pawns, sq)).some(([c, k]) => c !== me && k >= 2);

  // jogadas possíveis para uma cor com o dado d
  function legalMoves(pawns, color, d, cfg = {}) {
    const out = [];
    pawns[color].forEach((pos, i) => {
      let to;
      if (pos < 0) { if (d === 6 || (cfg.exit16 && d === 1)) to = 0; else return; }
      else if (pos >= FINISH) return;
      else { to = pos + d; if (to > FINISH) return; } // para chegar em casa precisa do número exato
      const from = pos < 0 ? 0 : pos + 1;
      if (cfg.barrier) for (let s = from; s <= Math.min(to, LAST); s++) if (enemyTower(pawns, abs(color, s), color)) return; // a torre bloqueia a passagem
      if (to <= LAST && enemyTower(pawns, abs(color, to), color)) return; // não dá para parar em cima de torre
      out.push({ i, from: pos, to });
    });
    return out;
  }
  // quem seria comido se a cor parasse em "to"
  function victims(pawns, color, to) {
    if (to > LAST) return [];
    const sq = abs(color, to);
    if (SAFE.has(sq)) return [];
    const out = [];
    for (const [c, list] of Object.entries(pawns)) {
      if (c === color) continue;
      const here = list.map((p, i) => [p, i]).filter(([p]) => abs(c, p) === sq);
      if (here.length === 1) out.push({ color: c, i: here[0][1] });
    }
    return out;
  }

  return { COLORS, NAMES, HEX, START, SAFE, LAST, FINISH, TRACK, HOME, BASE, DONE, abs, where, countAt, enemyTower, legalMoves, victims };
});
