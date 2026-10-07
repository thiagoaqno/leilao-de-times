// Carreira de Treinador: calendário, tabelas e competições da temporada (servidor e navegador).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Temporada = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  function embaralhar(ids, semente) {
    const r = Motor.sorteDe("calendario:" + semente), lista = [...ids];
    for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
    return lista;
  }
  function gerarCalendario(ids, semente) {
    const lista = embaralhar(ids, semente); if (lista.length % 2) lista.push(null);
    const n = lista.length, turno = []; let roda = lista.slice(1);
    for (let k = 0; k < n - 1; k++) {
      const todos = [lista[0], ...roda], jogos = [];
      for (let i = 0; i < n / 2; i++) { const a = todos[i], b = todos[n - 1 - i]; if (a != null && b != null) jogos.push((k + i) % 2 ? [a, b] : [b, a]); }
      turno.push(jogos); roda = [roda[roda.length - 1], ...roda.slice(0, -1)];
    }
    return [...turno, ...turno.map((jogos) => jogos.map(([a, b]) => [b, a]))];
  }
  const jogoDoClube = (calendario, rodada, clube) => (calendario[rodada] || []).find((j) => j[0] === clube || j[1] === clube) || null;
  function tabela(ids, resultados) {
    const t = Object.fromEntries(ids.map((id) => [id, { id, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, ultimos: [] }]));
    for (const rodada of resultados || []) for (const [c, f, gc, gf] of rodada || []) for (const [id, pro, contra] of [[c, gc, gf], [f, gf, gc]]) {
      const l = t[id]; if (!l) continue; l.j++; l.gp += pro; l.gc += contra;
      const res = pro > contra ? "V" : pro === contra ? "E" : "D";
      if (res === "V") { l.v++; l.p += 3; } else if (res === "E") { l.e++; l.p++; } else l.d++;
      l.ultimos.push(res); if (l.ultimos.length > 5) l.ultimos.shift();
    }
    return Object.values(t).map((l) => ({ ...l, sg: l.gp - l.gc })).sort((a, b) => b.p - a.p || b.v - a.v || b.sg - a.sg || b.gp - a.gp || a.id.localeCompare(b.id));
  }
  function zona(pos, total = 20) { if (pos === 1) return "campeao"; if (pos <= 6) return "libertadores"; if (pos <= 12) return "sulamericana"; if (pos > total - 4) return "rebaixamento"; return ""; }

  const EUROPA = ["inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"];
  const NOMES = { "brasileirao-2026": "Brasileirão Série A", "inglaterra-2026": "Premier League", "espanha-2026": "La Liga", "italia-2026": "Serie A", "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1", libertadores: "Libertadores", champions: "Champions League", mundial: "Mundial de Clubes" };
  const FORCA = (c) => [...c.jogadores].sort((a, b) => b.nota - a.nota).slice(0, 11).reduce((s, j) => s + j.nota, 0) / 11;
  const chaveJogo = (competicao, fase, rodada, casa, fora) => `${competicao}:${fase}:${rodada}:${casa}:${fora}`;
  const RESULTADOS_CPU = new Map();
  function normalizarBases(bases) {
    const mapa = {}, clubes = {};
    for (const b of Object.values(bases || {})) if (b && Array.isArray(b.clubes)) { mapa[b.id] = b; for (const c of b.clubes) clubes[c.id] = c; }
    return { bases: mapa, clubes };
  }
  function simuladorDoMundo(clubes, semente, fixos) {
    return function jogar(competicao, fase, rodada, casa, fora, semana, periodo, mataMata = false) {
      const id = chaveJogo(competicao, fase, rodada, casa, fora), fixo = fixos[id];
      const cache = `${semente}:${id}`;
      let sim = fixo || RESULTADOS_CPU.get(cache);
      if (!sim) { sim = Motor.simularPartida({ casa: clubes[casa], fora: clubes[fora], semente: cache }); RESULTADOS_CPU.set(cache, { placar: [...sim.placar] }); }
      return { id, competicao, fase, rodada, semana, periodo, casa, fora, placar: fixo ? [...fixo.placar] : [...sim.placar], mataMata, ...(fixo && { aoVivo: true }) };
    };
  }
  function gruposDaCopa(id, participantes, semente, jogar, semanas) {
    const ordem = embaralhar(participantes, `${semente}:${id}:grupos`), grupos = [], jogos = [];
    for (let i = 0; i < 8; i++) grupos.push({ id: String.fromCharCode(65 + i), clubes: ordem.slice(i * 4, i * 4 + 4) });
    for (const g of grupos) gerarCalendario(g.clubes, `${semente}:${id}:grupo:${g.id}`).forEach((rodada, r) => rodada.forEach(([c, f]) => jogos.push(jogar(id, `grupo-${g.id}`, r, c, f, semanas[r], "meio"))));
    for (const g of grupos) { const resultados = jogos.filter((j) => j.fase === `grupo-${g.id}`).reduce((a, j) => { (a[j.rodada] ||= []).push([j.casa, j.fora, ...j.placar]); return a; }, []); g.tabela = tabela(g.clubes, resultados); }
    return { grupos, jogos };
  }
  function vencedorJogo(jogo, semente, clubes) {
    if (jogo.placar[0] !== jogo.placar[1]) return jogo.placar[0] > jogo.placar[1] ? jogo.casa : jogo.fora;
    const r = Motor.sorteDe(`penaltis:${semente}:${jogo.id}`), fc = FORCA(clubes[jogo.casa]), ff = FORCA(clubes[jogo.fora]);
    const casa = r() < 0.5 + Math.max(-0.18, Math.min(0.18, (fc - ff) / 50)); jogo.penaltis = casa ? [5, 4] : [4, 5]; return casa ? jogo.casa : jogo.fora;
  }
  function mataMata(id, classificados, semente, jogar, clubes, semanas) {
    let atuais = classificados, jogos = [], vice = null;
    const fases = [{ nome: "oitavas", idaVolta: true }, { nome: "quartas", idaVolta: true }, { nome: "semifinal", idaVolta: true }, { nome: "final", idaVolta: false }];
    for (let fi = 0; fi < fases.length; fi++) {
      const fase = fases[fi], proximos = [];
      for (let i = 0; i < atuais.length; i += 2) {
        const a = atuais[i], b = atuais[i + 1], ida = jogar(id, fase.nome, i / 2, a, b, semanas[fi * 2], "meio", true); jogos.push(ida); let vencedor;
        if (fase.idaVolta) {
          const volta = jogar(id, fase.nome, i / 2, b, a, semanas[fi * 2 + 1], "meio", true); jogos.push(volta);
          const ga = ida.placar[0] + volta.placar[1], gb = ida.placar[1] + volta.placar[0];
          if (ga === gb) { const desempate = { ...volta, placar: [ga, gb], id: `${volta.id}:agregado` }; vencedor = vencedorJogo(desempate, semente, clubes); volta.penaltis = desempate.penaltis; } else vencedor = ga > gb ? a : b;
        } else vencedor = vencedorJogo(ida, semente, clubes);
        if (fase.nome === "final") vice = vencedor === a ? b : a; proximos.push(vencedor);
      }
      atuais = proximos;
    }
    return { jogos, campeao: atuais[0], vice };
  }
  // classificados (da segunda temporada em diante): { libertadores: [32 ids], europa: { [liga]: [4 ids] } }
  function simularMundo({ bases, indice, semente, resultadosFixos = {}, classificados = null }) {
    const mundo = indice, normal = normalizarBases(bases), clubes = normal.clubes, jogar = simuladorDoMundo(clubes, semente, resultadosFixos), competicoes = {}, todosJogos = [];
    const semanasLiga = Array.from({ length: 38 }, (_, i) => i * 2 + 1);
    for (const liga of mundo.ligas.filter((l) => normal.bases[l.id] && !["argentina-2026", "sulamericanos-2026"].includes(l.id))) {
      const calendario = gerarCalendario(liga.clubes, `${semente}:${liga.id}`), jogos = [], resultados = [];
      calendario.forEach((rodada, r) => rodada.forEach(([c, f]) => { const j = jogar(liga.id, "liga", r, c, f, semanasLiga[r], "fim"); jogos.push(j); (resultados[r] ||= []).push([c, f, ...j.placar]); }));
      const tab = tabela(liga.clubes, resultados); competicoes[liga.id] = { id: liga.id, nome: liga.nome || NOMES[liga.id], tipo: "liga", fase: "encerrada", grupos: [], jogos, resultados, tabela: tab, campeao: tab[0].id, vice: tab[1].id }; todosJogos.push(...jogos);
    }
    const forca = (a, b) => FORCA(clubes[b]) - FORCA(clubes[a]) || a.localeCompare(b);
    // Na primeira temporada, sem classificação anterior salva, a força da base define os quatro de cada país.
    const porLiga = Object.fromEntries(EUROPA.map((id) => [id, normal.bases[id].clubes.map((c) => c.id).sort(forca)]));
    // Da segunda em diante, vão os 4 primeiros da liga do ano anterior.
    const quatro = (id) => (classificados && classificados.europa && classificados.europa[id]) || porLiga[id].slice(0, 4);
    const europeus = EUROPA.flatMap(quatro);
    const restantes = EUROPA.flatMap((id) => porLiga[id].filter((c) => !quatro(id).includes(c))).sort(forca);
    const semanasGrupos = [2, 8, 14, 20, 26, 32], semanasMata = [40, 42, 46, 48, 52, 54, 58];
    for (const [id, participantes] of [["libertadores", (classificados && classificados.libertadores) || mundo.libertadores],["champions", [...europeus, ...restantes.slice(0, 12)]]]) {
      const g = gruposDaCopa(id, participantes, semente, jogar, semanasGrupos), classificados = [];
      for (let i = 0; i < 8; i++) { classificados.push(g.grupos[i].tabela[0].id); classificados.push(g.grupos[(i + 1) % 8].tabela[1].id); }
      const m = mataMata(id, classificados, semente, jogar, clubes, semanasMata), jogos = [...g.jogos, ...m.jogos];
      competicoes[id] = { id, nome: NOMES[id], tipo: "copa", fase: "encerrada", grupos: g.grupos, jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, participantes }; todosJogos.push(...jogos);
    }
    const lib = competicoes.libertadores, cha = competicoes.champions, semifinalistas = [lib.campeao, cha.vice, cha.campeao, lib.vice], semi = [];
    for (let i = 0; i < 2; i++) semi.push(jogar("mundial", "semifinal", i, semifinalistas[i * 2], semifinalistas[i * 2 + 1], 78, "fim", true));
    const finalistas = semi.map((j) => vencedorJogo(j, semente, clubes)), final = jogar("mundial", "final", 0, finalistas[0], finalistas[1], 79, "fim", true), campeao = vencedorJogo(final, semente, clubes), jogos = [...semi, final];
    competicoes.mundial = { id: "mundial", nome: NOMES.mundial, tipo: "copa", fase: "encerrada", grupos: [], jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), participantes: semifinalistas, campeao, vice: finalistas.find((id) => id !== campeao) }; todosJogos.push(...jogos);
    todosJogos.sort((a, b) => a.semana - b.semana || a.periodo.localeCompare(b.periodo) || a.id.localeCompare(b.id));
    return { competicoes, jogos: todosJogos, campeoes: Object.fromEntries(Object.entries(competicoes).map(([id, c]) => [id, c.campeao])) };
  }
  function jogosDoClube(mundo, clube) { return mundo.jogos.filter((j) => j.casa === clube || j.fora === clube); }
  function conflitoDeCalendario(jogos) { const vistos = new Set(); for (const j of jogos) for (const clube of [j.casa, j.fora]) { const k = `${j.semana}:${clube}`; if (vistos.has(k)) return { semana: j.semana, clube }; vistos.add(k); } return null; }
  return { gerarCalendario, jogoDoClube, tabela, zona, simularMundo, jogosDoClube, conflitoDeCalendario, EUROPA, NOMES };
});
