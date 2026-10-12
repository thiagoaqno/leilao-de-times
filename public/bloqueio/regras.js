// Bloqueio — regras do jogo (tabuleiro 9x9, peões que cruzam o campo e paredes que atrapalham o caminho).
// Usado pelo servidor (bloqueio.js) e pelo navegador (public/bloqueio/index.html), como window.Bloqueio.
// Casas: (r, c), r = linha de cima para baixo, c = coluna da esquerda para a direita, de 0 a 8.
// Parede: { r, c, o } em 0..7. "h" fica embaixo das casas (r,c) e (r,c+1); "v" fica à direita das casas (r,c) e (r+1,c).
(function (root) {

const N = 9;
// os 4 lugares, em volta da mesa no sentido horário. Com 2 jogadores usam-se o 0 e o 2 (frente a frente).
const LUGARES = [
  { r: 8, c: 4, meta: { r: 0 } }, // embaixo, vai para a linha de cima
  { r: 4, c: 0, meta: { c: 8 } }, // esquerda, vai para a coluna da direita
  { r: 0, c: 4, meta: { r: 8 } }, // em cima, vai para a linha de baixo
  { r: 4, c: 8, meta: { c: 0 } }, // direita, vai para a coluna da esquerda
];
const PAREDES_POR_JOGADOR = { 2: 10, 4: 5 };
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const dentro = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const chave = (r, c) => r * N + c;
const chegou = (p, meta) => (meta.r != null ? p.r === meta.r : p.c === meta.c);

// lugares de quem joga: [0, 2] com 2 pessoas, [0, 1, 2, 3] com 4
const lugaresDe = (n) => (n === 2 ? [0, 2] : [0, 1, 2, 3]);

function novoJogo(n) {
  const ls = lugaresDe(n);
  return {
    n, paredes: [], peoes: ls.map((l) => ({ r: LUGARES[l].r, c: LUGARES[l].c })), metas: ls.map((l) => LUGARES[l].meta),
    sobram: ls.map(() => PAREDES_POR_JOGADOR[n]), vez: 0, vencedor: null,
  };
}

// o conjunto de passagens fechadas pelas paredes: "casa|casa" com a menor chave primeiro
const aresta = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
function fechadas(paredes) {
  const s = new Set();
  for (const w of paredes) {
    if (w.o === "h") { s.add(aresta(chave(w.r, w.c), chave(w.r + 1, w.c))); s.add(aresta(chave(w.r, w.c + 1), chave(w.r + 1, w.c + 1))); }
    else { s.add(aresta(chave(w.r, w.c), chave(w.r, w.c + 1))); s.add(aresta(chave(w.r + 1, w.c), chave(w.r + 1, w.c + 1))); }
  }
  return s;
}
const livre = (f, r, c, r2, c2) => dentro(r2, c2) && !f.has(aresta(chave(r, c), chave(r2, c2)));

// menor caminho (em passos) até a meta, sem contar os outros peões; Infinity se não tem caminho
function distancia(paredes, de, meta, f = fechadas(paredes)) {
  const d = new Map([[chave(de.r, de.c), 0]]);
  const fila = [de];
  for (let i = 0; i < fila.length; i++) {
    const p = fila[i], dp = d.get(chave(p.r, p.c));
    if (chegou(p, meta)) return dp;
    for (const [dr, dc] of DIRS) {
      const r = p.r + dr, c = p.c + dc;
      if (livre(f, p.r, p.c, r, c) && !d.has(chave(r, c))) { d.set(chave(r, c), dp + 1); fila.push({ r, c }); }
    }
  }
  return Infinity;
}

// para onde o peão do jogador i pode andar agora (inclui os pulos por cima dos outros peões)
function movimentos(g, i, f = fechadas(g.paredes)) {
  const eu = g.peoes[i], out = [];
  const ocupada = (r, c) => g.peoes.some((p, j) => j !== i && p.r === r && p.c === c);
  for (const [dr, dc] of DIRS) {
    const r = eu.r + dr, c = eu.c + dc;
    if (!livre(f, eu.r, eu.c, r, c)) continue;
    if (!ocupada(r, c)) { out.push({ r, c }); continue; }
    // tem um peão na frente: pula por cima se a casa de trás estiver livre; senão, vai para o lado dele
    const r2 = r + dr, c2 = c + dc;
    if (livre(f, r, c, r2, c2) && !ocupada(r2, c2)) { out.push({ r: r2, c: c2 }); continue; }
    for (const [er, ec] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
      const r3 = r + er, c3 = c + ec;
      if (livre(f, r, c, r3, c3) && !ocupada(r3, c3)) out.push({ r: r3, c: c3 });
    }
  }
  return out;
}

// motivo pelo qual a parede não pode ser posta, ou null se pode (a vez e o estoque são conferidos por quem chama)
function erroDaParede(g, w) {
  if (!w || (w.o !== "h" && w.o !== "v") || !Number.isInteger(w.r) || !Number.isInteger(w.c) || w.r < 0 || w.r > N - 2 || w.c < 0 || w.c > N - 2) return "Parede fora do tabuleiro.";
  for (const o of g.paredes) {
    if (o.r === w.r && o.c === w.c) return o.o === w.o ? "Já tem uma parede aí." : "As paredes não podem se cruzar.";
    if (o.o === w.o && w.o === "h" && o.r === w.r && Math.abs(o.c - w.c) === 1) return "A parede sobrepõe outra.";
    if (o.o === w.o && w.o === "v" && o.c === w.c && Math.abs(o.r - w.r) === 1) return "A parede sobrepõe outra.";
  }
  const f = fechadas([...g.paredes, w]);
  for (let i = 0; i < g.peoes.length; i++) if (distancia(null, g.peoes[i], g.metas[i], f) === Infinity) return "Não pode fechar todo o caminho de um jogador.";
  return null;
}

// todas as paredes que dá para pôr agora
function paredesPossiveis(g) {
  const out = [];
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) for (const o of ["h", "v"]) if (!erroDaParede(g, { r, c, o })) out.push({ r, c, o });
  return out;
}

const proxima = (g) => { g.vez = (g.vez + 1) % g.n; };

// anda o peão do jogador i; devolve um erro ou null
function mover(g, i, r, c) {
  if (g.vencedor != null) return "O jogo já acabou.";
  if (g.vez !== i) return "Não é a sua vez.";
  if (!movimentos(g, i).some((m) => m.r === r && m.c === c)) return "Esse movimento não vale.";
  g.peoes[i] = { r, c };
  if (chegou(g.peoes[i], g.metas[i])) g.vencedor = i; else proxima(g);
  return null;
}
function parede(g, i, w) {
  if (g.vencedor != null) return "O jogo já acabou.";
  if (g.vez !== i) return "Não é a sua vez.";
  if (g.sobram[i] <= 0) return "Você não tem mais paredes.";
  const e = erroDaParede(g, w);
  if (e) return e;
  g.paredes.push({ r: w.r, c: w.c, o: w.o }); g.sobram[i]--;
  proxima(g);
  return null;
}

// jogada do robô (também usada quando alguém demora): { mover: {r,c} } ou { parede: {r,c,o} }
function jogadaDoRobo(g, i) {
  const f = fechadas(g.paredes), minha = distancia(null, g.peoes[i], g.metas[i], f);
  const melhorPasso = () => {
    let best = null;
    for (const m of movimentos(g, i, f)) { const d = distancia(null, m, g.metas[i], f); if (!best || d < best.d || (d === best.d && Math.random() < 0.5)) best = { d, m }; }
    return best;
  };
  const passo = melhorPasso();
  // o adversário mais perto da meta
  let rival = -1, dr = Infinity;
  g.peoes.forEach((p, j) => { if (j === i) return; const d = distancia(null, p, g.metas[j], f); if (d < dr) { dr = d; rival = j; } });
  if (g.sobram[i] > 0 && rival >= 0 && dr <= minha + 1 && Math.random() < 0.7) {
    let best = null;
    for (const w of paredesPossiveis(g)) {
      const f2 = fechadas([...g.paredes, w]);
      const ganho = distancia(null, g.peoes[rival], g.metas[rival], f2) - dr, perda = distancia(null, g.peoes[i], g.metas[i], f2) - minha;
      const v = ganho - perda * 1.5;
      if (ganho >= 2 && (!best || v > best.v)) best = { v, w };
    }
    if (best) return { parede: best.w };
  }
  return passo ? { mover: { r: passo.m.r, c: passo.m.c } } : null;
}

const api = { N, LUGARES, DIRS, lugaresDe, novoJogo, fechadas, distancia, movimentos, erroDaParede, paredesPossiveis, mover, parede, jogadaDoRobo, PAREDES_POR_JOGADOR,
  AVATARES: ["🦊", "🐸", "🐙", "🦉", "🐯", "🐻"], REACOES: ["😂", "😱", "👏", "🔥", "😈", "🤔"] };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Bloqueio = api;
})(typeof window !== "undefined" ? window : globalThis);
