// Carreira de Treinador: as contas da temporada (servidor e navegador): o calendário de turno e returno sorteado pela
// semente, a tabela com os critérios do Brasileirão e o jogo de cada clube na rodada.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Temporada = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  // método do círculo: cada clube enfrenta todos uma vez no turno; o returno repete com o mando trocado
  function gerarCalendario(ids, semente) {
    const r = Motor.sorteDe("calendario:" + semente), lista = [...ids];
    for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
    if (lista.length % 2) lista.push(null);
    const n = lista.length, turno = [];
    let roda = lista.slice(1);
    for (let k = 0; k < n - 1; k++) {
      const todos = [lista[0], ...roda], jogos = [];
      for (let i = 0; i < n / 2; i++) {
        const a = todos[i], b = todos[n - 1 - i];
        if (a == null || b == null) continue;
        jogos.push((k + i) % 2 ? [a, b] : [b, a]); // alterna o mando
      }
      turno.push(jogos);
      roda = [roda[roda.length - 1], ...roda.slice(0, -1)];
    }
    return [...turno, ...turno.map((jogos) => jogos.map(([a, b]) => [b, a]))];
  }
  const jogoDoClube = (calendario, rodada, clube) => (calendario[rodada] || []).find((j) => j[0] === clube || j[1] === clube) || null;

  // resultados: [[casa, fora, golsCasa, golsFora], ...] de todas as rodadas jogadas
  // desempate do Brasileirão: pontos, vitórias, saldo, gols pró, confronto direto (aqui: ordem alfabética no fim)
  function tabela(ids, resultados) {
    const t = Object.fromEntries(ids.map((id) => [id, { id, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, ultimos: [] }]));
    for (const rodada of resultados) for (const [c, f, gc, gf] of rodada) {
      for (const [id, pro, contra] of [[c, gc, gf], [f, gf, gc]]) {
        const l = t[id]; if (!l) continue;
        l.j++; l.gp += pro; l.gc += contra;
        const res = pro > contra ? "V" : pro === contra ? "E" : "D";
        if (res === "V") { l.v++; l.p += 3; } else if (res === "E") { l.e++; l.p++; } else l.d++;
        l.ultimos.push(res); if (l.ultimos.length > 5) l.ultimos.shift();
      }
    }
    return Object.values(t).map((l) => ({ ...l, sg: l.gp - l.gc }))
      .sort((a, b) => b.p - a.p || b.v - a.v || b.sg - a.sg || b.gp - a.gp || a.id.localeCompare(b.id));
  }
  // o que cada faixa da tabela vale no fim (o Brasileirão de 20 clubes)
  function zona(pos, total = 20) {
    if (pos === 1) return "campeao";
    if (pos <= 6) return "libertadores";
    if (pos <= 12) return "sulamericana";
    if (pos > total - 4) return "rebaixamento";
    return "";
  }
  return { gerarCalendario, jogoDoClube, tabela, zona };
});
