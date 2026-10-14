// Road to Champions — o formato da Champions (UMD: no servidor com require, no navegador como window.RoadFormato).
//
// O formato novo (desde 2024/25): 36 clubes numa fase de liga só. Cada um faz 8 jogos contra 8 adversários diferentes,
// dois de cada pote (um em casa, um fora). Do 1º ao 8º vão direto às oitavas; do 9º ao 24º jogam o playoff (ida e
// volta); do 25º para baixo, fora. Oitavas, quartas e semifinais em ida e volta (no agregado; empate vai para os
// pênaltis no fim do jogo de volta) e a final em jogo único, em campo neutro. São 17 rodadas.
//
// As campanhas antigas (8 clubes, dois grupos, semifinal e final) seguem no formato "grupos", no road-to-champions.js.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.RoadFormato = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CLUBES = 36, POTES = 4, POR_POTE = 9, RODADAS_LIGA = 8;

  // as 17 rodadas, na ordem. `cap` = o capítulo da história que cai nela (a entrevista e os exclusivos)
  const RODADAS = [
    ...Array.from({ length: RODADAS_LIGA }, (_, i) => ({ etapa: "liga", nome: "Fase de liga · Rodada " + (i + 1), curto: "R" + (i + 1), titulo: "Rodada " + (i + 1) })),
    { etapa: "playoff", perna: 1, nome: "Playoff · Ida", curto: "PO", titulo: "Playoff (ida)" },
    { etapa: "playoff", perna: 2, nome: "Playoff · Volta", curto: "PO", titulo: "Playoff (volta)" },
    { etapa: "oitavas", perna: 1, nome: "Oitavas de final · Ida", curto: "OIT", titulo: "Oitavas (ida)" },
    { etapa: "oitavas", perna: 2, nome: "Oitavas de final · Volta", curto: "OIT", titulo: "Oitavas (volta)" },
    { etapa: "quartas", perna: 1, nome: "Quartas de final · Ida", curto: "QF", titulo: "Quartas (ida)" },
    { etapa: "quartas", perna: 2, nome: "Quartas de final · Volta", curto: "QF", titulo: "Quartas (volta)" },
    { etapa: "semifinal", perna: 1, nome: "Semifinal · Ida", curto: "SF", titulo: "Semifinal (ida)" },
    { etapa: "semifinal", perna: 2, nome: "Semifinal · Volta", curto: "SF", titulo: "Semifinal (volta)" },
    { etapa: "final", nome: "A grande final", curto: "Final", titulo: "Final" },
  ];
  // os cinco capítulos da história (os eventos de road-regras.js, capítulos 0 a 4) caem nestas rodadas:
  // a estreia, o meio da fase de liga (os exclusivos), a última rodada da liga, a semifinal de ida (os exclusivos de
  // semifinal) e a final
  const CAPITULOS = [0, 3, 7, 14, 16];
  const capituloDaRodada = (r) => CAPITULOS.indexOf(r);
  const NOMES_ETAPA = { liga: "Fase de liga", playoff: "Playoff", oitavas: "Oitavas de final", quartas: "Quartas de final", semifinal: "Semifinal", final: "Final" };

  // um número de 0 a 1 a partir de um texto (o mesmo sorteio em qualquer máquina)
  function sorteador(semente) {
    let h = 2166136261;
    for (const c of String(semente)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function embaralhar(lista, rnd) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- a fase de liga ----------
  // os confrontos: contra cada pote (o próprio também), dois adversários, um em casa e um fora. Entre potes diferentes,
  // o i-ésimo de um recebe o (i+a)-ésimo do outro e visita o (i+b)-ésimo; dentro do pote, recebe o seguinte e visita o
  // anterior (um ciclo de 9). Depois os 144 jogos são distribuídos nas 8 rodadas (cada clube joga uma vez por rodada).
  function confrontos(potes, rnd) {
    const jogos = [];
    for (let p = 0; p < POTES; p++) {
      const A = potes[p];
      for (let i = 0; i < POR_POTE; i++) jogos.push([A[i], A[(i + 1) % POR_POTE]]);
      for (let q = p + 1; q < POTES; q++) {
        const B = potes[q], a = Math.floor(rnd() * POR_POTE);
        let b = Math.floor(rnd() * POR_POTE);
        if (b === a) b = (b + 1 + Math.floor(rnd() * (POR_POTE - 1))) % POR_POTE;
        for (let i = 0; i < POR_POTE; i++) {
          jogos.push([A[i], B[(i + a) % POR_POTE]]);   // A em casa
          jogos.push([B[(i + b) % POR_POTE], A[i]]);   // A fora
        }
      }
    }
    return jogos;
  }
  // divide os jogos em rodadas: uma de cada vez, um emparelhamento perfeito que deixa o resto ainda divisível
  // (busca com volta atrás, a ordem sorteada; se travar, recomeça com outra ordem)
  function rodadasDe(jogos, rnd) {
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      const restantes = embaralhar(jogos, rnd), rodadas = [];
      let ok = true;
      for (let r = 0; r < RODADAS_LIGA && ok; r++) {
        const m = emparelhar(restantes, rnd);
        if (!m) { ok = false; break; }
        rodadas.push(m);
        for (const j of m) restantes.splice(restantes.indexOf(j), 1);
      }
      if (ok && !restantes.length) return rodadas;
    }
    throw new Error("Não foi possível montar o calendário da fase de liga.");
  }
  function emparelhar(jogos, rnd) {
    const por = new Map();
    for (const j of jogos) for (const t of j) { if (!por.has(t)) por.set(t, []); por.get(t).push(j); }
    const times = [...por.keys()];
    if (times.length !== CLUBES) return null;
    const usado = new Set(), escolhidos = [];
    let passos = 0;
    function busca() {
      if (escolhidos.length === CLUBES / 2) return true;
      if (++passos > 20000) return false;
      // o time com menos opções primeiro
      let melhor = null, opcoes = null;
      for (const t of times) {
        if (usado.has(t)) continue;
        const o = por.get(t).filter((j) => !usado.has(j[0]) && !usado.has(j[1]));
        if (!o.length) return false;
        if (!opcoes || o.length < opcoes.length) { melhor = t; opcoes = o; }
      }
      for (const j of embaralhar(opcoes, rnd)) {
        usado.add(j[0]); usado.add(j[1]); escolhidos.push(j);
        if (busca()) return true;
        usado.delete(j[0]); usado.delete(j[1]); escolhidos.pop();
      }
      return false;
    }
    return busca() ? escolhidos : null;
  }
  // os 36 (já na ordem de força) viram 4 potes de 9 e a fase de liga inteira: [{ id, etapa, rodada, casa, fora }]
  function faseDeLiga(ids, semente) {
    if (ids.length !== CLUBES) throw new Error("A fase de liga precisa de " + CLUBES + " clubes.");
    const rnd = sorteador("liga:" + semente);
    const potes = Array.from({ length: POTES }, (_, p) => embaralhar(ids.slice(p * POR_POTE, (p + 1) * POR_POTE), rnd));
    const rodadas = rodadasDe(confrontos(potes, rnd), rnd);
    const jogos = [];
    rodadas.forEach((m, r) => m.forEach(([casa, fora], k) => jogos.push({ id: "l" + r + "-" + k, etapa: "liga", rodada: r, casa, fora, resultado: null })));
    const pote = {};
    potes.forEach((lista, p) => lista.forEach((id) => (pote[id] = p + 1)));
    return { jogos, pote };
  }

  // a tabela da liga: pontos, saldo, gols marcados, gols fora, vitórias e, no fim, o nome (sempre a mesma ordem)
  function tabela(ids, jogos, forca = () => 0) {
    const linhas = new Map(ids.map((c) => [c, { clube: c, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, gf: 0 }]));
    for (const j of jogos) {
      if (j.etapa !== "liga" || !j.resultado) continue;
      const a = linhas.get(j.casa), b = linhas.get(j.fora), r = j.resultado;
      if (!a || !b) continue;
      a.j++; b.j++; a.gp += r.casa; a.gc += r.fora; b.gp += r.fora; b.gc += r.casa; b.gf += r.fora;
      if (r.casa > r.fora) { a.v++; b.d++; a.p += 3; } else if (r.casa < r.fora) { b.v++; a.d++; b.p += 3; } else { a.e++; b.e++; a.p++; b.p++; }
    }
    for (const x of linhas.values()) x.sg = x.gp - x.gc;
    return [...linhas.values()].sort((x, y) => y.p - x.p || y.sg - x.sg || y.gp - x.gp || y.gf - x.gf || y.v - x.v || forca(y.clube) - forca(x.clube) || x.clube.localeCompare(y.clube));
  }
  const zonaDe = (pos) => (pos <= 8 ? "oitavas" : pos <= 24 ? "playoff" : "fora"); // pos começa em 1

  // ---------- o mata-mata ----------
  // um confronto de ida e volta: a ida na casa do pior colocado, a volta na casa do melhor
  const ida = (id, rodada, etapa, melhor, pior) => [
    { id: id + "a", etapa, rodada, perna: 1, chave: id, casa: pior, fora: melhor, resultado: null },
    { id: id + "b", etapa, rodada: rodada + 1, perna: 2, chave: id, casa: melhor, fora: pior, resultado: null },
  ];
  // o playoff: 9º × 24º, 10º × 23º ... 16º × 17º
  function playoff(classif) {
    const c = classif.map((x) => x.clube);
    return Array.from({ length: 8 }, (_, k) => ida("po" + k, 8, "playoff", c[8 + k], c[23 - k])).flat();
  }
  // as oitavas: o 1º pega quem passou de 16º × 17º, o 2º o de 15º × 18º ... na ordem do chaveamento (1-8, 4-5, 2-7, 3-6)
  const ORDEM = [1, 8, 4, 5, 2, 7, 3, 6];
  function oitavas(classif, vencedorDaChave) {
    const c = classif.map((x) => x.clube);
    return ORDEM.map((seed, i) => ida("oi" + i, 10, "oitavas", c[seed - 1], vencedorDaChave("po" + (8 - seed)))).flat();
  }
  // quartas, semifinal: os vencedores das chaves vizinhas; a volta em casa do melhor colocado na liga
  function seguinte(etapa, prefixo, rodada, anteriores, vencedorDaChave, posicao) {
    const out = [];
    for (let i = 0; i < anteriores.length; i += 2) {
      const a = vencedorDaChave(anteriores[i]), b = vencedorDaChave(anteriores[i + 1]);
      const [melhor, pior] = posicao(a) <= posicao(b) ? [a, b] : [b, a];
      out.push(...ida(prefixo + i / 2, rodada, etapa, melhor, pior));
    }
    return out;
  }
  function final(a, b) { return [{ id: "final", etapa: "final", rodada: 16, casa: a, fora: b, resultado: null }]; }

  return { CLUBES, POTES, RODADAS, RODADAS_LIGA, CAPITULOS, NOMES_ETAPA, capituloDaRodada, faseDeLiga, tabela, zonaDe,
    playoff, oitavas, seguinte, final, sorteador };
});
