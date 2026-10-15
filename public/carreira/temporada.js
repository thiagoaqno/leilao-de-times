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
    return Object.values(t).map((l) => ({ ...l, sg: l.gp - l.gc })).sort((a, b) => b.p - a.p || b.sg - a.sg || b.v - a.v || b.gp - a.gp || a.id.localeCompare(b.id));
  }
  // a faixa da posição na tabela; na Série B, os 4 primeiros sobem (e não há rebaixamento: não existe Série C)
  function zona(pos, total = 20, liga = "") { if (liga === "serieb-2026") return pos === 1 ? "campeao" : pos <= 4 ? "acesso" : ""; if (pos === 1) return "campeao"; if (pos <= 6) return "libertadores"; if (pos <= 12) return "sulamericana"; if (pos > total - 4) return "rebaixamento"; return ""; }

  const EUROPA = ["inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"];
  const NOMES = { "brasileirao-2026": "Brasileirão Série A", "serieb-2026": "Brasileirão Série B", "inglaterra-2026": "Premier League", "espanha-2026": "La Liga", "italia-2026": "Serie A", "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1", libertadores: "Libertadores", champions: "Champions League", mundial: "Mundial de Clubes",
    copadobrasil: "Copa do Brasil", sulamericana: "Sul-Americana", supermundial: "Super Mundial de Clubes", copadomundo: "Copa do Mundo" };
  // as copas no masculino (o Mundial, o Super Mundial): para as frases "campeão do", "eliminado do"
  const MASCULINAS = ["mundial", "supermundial"];
  // a Copa do Mundo (de 2 em 2 temporadas, carreira-copa.js): 48 seleções, 12 grupos de 4 em turno único, os 2 primeiros de cada
  // grupo e os 8 melhores terceiros vão aos 16 avos de final; tudo em jogo único e em campo neutro, com disputa de 3º lugar.
  // Ela para o futebol de clubes: as semanas da Copa entram na temporada e tudo o que vinha depois anda SEMANAS_COPA semanas.
  const COPA = "copadomundo", SEMANAS_COPA = 8;
  const FASES_COPA = [{ nome: "dezesseis", idaVolta: false }, { nome: "oitavas", idaVolta: false }, { nome: "quartas", idaVolta: false }, { nome: "semifinal", idaVolta: false }, { nome: "final", idaVolta: false }];
  const masculina = (comp) => MASCULINAS.includes(comp && comp.id);
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
      if (!sim) { sim = Motor.simularPartida({ casa: clubes[casa], fora: clubes[fora], semente: cache, carreira: true, ...(competicao === COPA && { neutro: true }) }); RESULTADOS_CPU.set(cache, { placar: [...sim.placar] }); }
      return { id, competicao, fase, rodada, semana, periodo, casa, fora, placar: fixo ? [...fixo.placar] : [...sim.placar], mataMata,
        ...(fixo && { aoVivo: true }), ...(fixo && Array.isArray(fixo.penaltis) && { penaltis: [...fixo.penaltis] }) };
    };
  }
  // grupos de 4: nGrupos grupos, e as primeiras rodadas de cada um (6 = ida e volta; 3 = todos contra todos uma vez)
  function gruposDaCopa(id, participantes, semente, jogar, semanas, { nGrupos = 8, rodadas = 6 } = {}) {
    const ordem = embaralhar(participantes, `${semente}:${id}:grupos`), grupos = [], jogos = [];
    for (let i = 0; i < nGrupos; i++) grupos.push({ id: String.fromCharCode(65 + i), clubes: ordem.slice(i * 4, i * 4 + 4) });
    for (const g of grupos) gerarCalendario(g.clubes, `${semente}:${id}:grupo:${g.id}`).slice(0, rodadas).forEach((rodada, r) => rodada.forEach(([c, f]) => jogos.push(jogar(id, `grupo-${g.id}`, r, c, f, semanas[r], "meio"))));
    for (const g of grupos) { const resultados = jogos.filter((j) => j.fase === `grupo-${g.id}`).reduce((a, j) => { (a[j.rodada] ||= []).push([j.casa, j.fora, ...j.placar]); return a; }, []); g.tabela = tabela(g.clubes, resultados); }
    return { grupos, jogos };
  }
  function vencedorJogo(jogo, semente, clubes) {
    if (jogo.placar[0] !== jogo.placar[1]) return jogo.placar[0] > jogo.placar[1] ? jogo.casa : jogo.fora;
    if (Array.isArray(jogo.penaltis) && jogo.penaltis[0] !== jogo.penaltis[1]) return jogo.penaltis[0] > jogo.penaltis[1] ? jogo.casa : jogo.fora;
    const r = Motor.sorteDe(`penaltis:${semente}:${jogo.id}`), fc = FORCA(clubes[jogo.casa]), ff = FORCA(clubes[jogo.fora]);
    const casa = r() < 0.5 + Math.max(-0.18, Math.min(0.18, (fc - ff) / 50)); jogo.penaltis = casa ? [5, 4] : [4, 5]; return casa ? jogo.casa : jogo.fora;
  }
  const FASES_COMPLETAS = [{ nome: "oitavas", idaVolta: true }, { nome: "quartas", idaVolta: true }, { nome: "semifinal", idaVolta: true }, { nome: "final", idaVolta: false }];
  // as fases em sequência: cada uma usa a próxima semana da lista (duas, se for ida e volta)
  function mataMata(id, classificados, semente, jogar, clubes, semanas, fases = FASES_COMPLETAS) {
    let atuais = classificados, jogos = [], vice = null, k = 0;
    for (const fase of fases) {
      const proximos = [], semanaIda = semanas[k], semanaVolta = fase.idaVolta ? semanas[k + 1] : null; k += fase.idaVolta ? 2 : 1;
      for (let i = 0; i < atuais.length; i += 2) {
        const a = atuais[i], b = atuais[i + 1], ida = jogar(id, fase.nome, i / 2, a, b, semanaIda, "meio", true); jogos.push(ida); let vencedor;
        if (fase.idaVolta) {
          const volta = jogar(id, fase.nome, i / 2, b, a, semanaVolta, "meio", true); jogos.push(volta); ida.perna = "ida"; volta.perna = "volta";
          const ga = ida.placar[0] + volta.placar[1], gb = ida.placar[1] + volta.placar[0];
          if (ga === gb) { const desempate = { ...volta, placar: [ga, gb], id: `${volta.id}:agregado` }; vencedor = vencedorJogo(desempate, semente, clubes); volta.penaltis = desempate.penaltis; } else vencedor = ga > gb ? a : b;
        } else vencedor = vencedorJogo(ida, semente, clubes);
        if (fase.nome === "final") vice = vencedor === a ? b : a; proximos.push(vencedor);
      }
      atuais = proximos;
    }
    return { jogos, campeao: atuais[0], vice };
  }
  // os clubes de uma copa do mais longe ao mais cedo: o campeão, o vice, os outros semifinalistas, os das quartas...
  function ordemDaCopa(comp, clubes) {
    const vistos = new Set(), ordem = [], forca = (a, b) => FORCA(clubes[b]) - FORCA(clubes[a]) || a.localeCompare(b);
    const somar = (ids) => ids.filter((id) => id && !vistos.has(id)).sort(forca).forEach((id) => { vistos.add(id); ordem.push(id); });
    somar([comp.campeao]); somar([comp.vice]);
    for (const fase of ["semifinal", "quartas", "oitavas"]) somar([...new Set(comp.jogos.filter((j) => j.fase === fase).flatMap((j) => [j.casa, j.fora]))]);
    somar(comp.participantes);
    return ordem;
  }
  // a Copa do Brasil: os 20 do Brasileirão. Os 12 mais fortes entram direto nas oitavas e os 8 mais fracos jogam uma
  // fase preliminar (jogo único); oitavas, quartas e semifinais são de ida e volta, e a final é em jogo único.
  function copaDoBrasil(clubes, brasileiros, semente, jogar) {
    const porForca = [...brasileiros].sort((a, b) => FORCA(clubes[b]) - FORCA(clubes[a]) || a.localeCompare(b));
    const diretos = porForca.slice(0, 12), preliminar = embaralhar(porForca.slice(12), `${semente}:copadobrasil:preliminar`), jogos = [], vencedores = [];
    for (let i = 0; i < preliminar.length; i += 2) {
      const j = jogar("copadobrasil", "preliminar", i / 2, preliminar[i], preliminar[i + 1], 4, "meio", true); jogos.push(j); vencedores.push(vencedorJogo(j, semente, clubes));
    }
    const sorteio = embaralhar([...diretos, ...vencedores], `${semente}:copadobrasil:sorteio`), m = mataMata("copadobrasil", sorteio, semente, jogar, clubes, [10, 12, 16, 18, 22, 24, 28]);
    jogos.push(...m.jogos);
    return { id: "copadobrasil", nome: NOMES.copadobrasil, tipo: "copa", fase: "encerrada", grupos: [], jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, participantes: [...brasileiros] };
  }
  // a Sul-Americana: 16 clubes em 4 grupos (ida e volta), os 2 primeiros vão às quartas. Entram os 8 terceiros colocados
  // dos grupos da Libertadores e 8 de fora dela (os brasileiros mais bem colocados e o clube sul-americano que sobrou).
  function copaSulAmericana(clubes, mundo, libertadores, brasileiros, ordemBrasil, semente, jogar) {
    const naLib = new Set(libertadores.participantes), forca = (a, b) => FORCA(clubes[b]) - FORCA(clubes[a]) || a.localeCompare(b);
    const terceiros = libertadores.grupos.map((g) => g.tabela[2].id), br = new Set(brasileiros);
    const doBrasil = (ordemBrasil || [...brasileiros].sort(forca)).filter((id) => br.has(id) && !naLib.has(id));
    const deFora = mundo.ligas.filter((l) => ["argentina-2026", "sulamericanos-2026"].includes(l.id)).flatMap((l) => l.clubes).filter((id) => !naLib.has(id) && clubes[id]).sort(forca);
    const participantes = [...terceiros, ...doBrasil.slice(0, 8 - Math.min(1, deFora.length)), ...deFora.slice(0, 1)];
    const g = gruposDaCopa("sulamericana", participantes, semente, jogar, [34, 36, 38, 44, 50, 56], { nGrupos: 4, rodadas: 6 }), t = (i, p) => g.grupos[i].tabela[p].id;
    const quartas = [t(0, 0), t(1, 1), t(1, 0), t(0, 1), t(2, 0), t(3, 1), t(3, 0), t(2, 1)];
    const m = mataMata("sulamericana", quartas, semente, jogar, clubes, [60, 62, 64, 66, 68], FASES_COMPLETAS.slice(1)), jogos = [...g.jogos, ...m.jogos];
    return { id: "sulamericana", nome: NOMES.sulamericana, tipo: "copa", fase: "encerrada", grupos: g.grupos, rodadasGrupo: 6, jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, participantes };
  }
  // o Super Mundial: 16 clubes. O campeão da Sul-Americana, o da Copa do Brasil e os que foram mais longe na Champions e na
  // Libertadores (um de cada vez, do campeão para trás). 4 grupos de 4 (todos contra todos, uma vez); as quartas, a
  // semifinal e a final são em jogo único.
  function superMundial(clubes, competicoes, semente, jogar) {
    const ch = ordemDaCopa(competicoes.champions, clubes), li = ordemDaCopa(competicoes.libertadores, clubes), fila = [competicoes.sulamericana.campeao, competicoes.copadobrasil.campeao];
    for (let i = 0; i < Math.max(ch.length, li.length); i++) fila.push(ch[i], li[i]);
    const participantes = [...new Set(fila.filter(Boolean))].slice(0, 16);
    const g = gruposDaCopa("supermundial", participantes, semente, jogar, [70, 72, 74], { nGrupos: 4, rodadas: 3 }), t = (i, p) => g.grupos[i].tabela[p].id;
    const quartas = [t(0, 0), t(1, 1), t(1, 0), t(0, 1), t(2, 0), t(3, 1), t(3, 0), t(2, 1)];
    const m = mataMata("supermundial", quartas, semente, jogar, clubes, [76, 78, 80], FASES_COMPLETAS.slice(1).map((f) => ({ ...f, idaVolta: false }))), jogos = [...g.jogos, ...m.jogos];
    return { id: "supermundial", nome: NOMES.supermundial, tipo: "copa", fase: "encerrada", grupos: g.grupos, rodadasGrupo: 3, jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, participantes };
  }
  // a ordem do chaveamento de n cabeças de chave (1 contra n, e os dois melhores só se cruzam na final): [1, n, n/2, n/2+1, ...]
  function ordemDaChave(n) {
    let ordem = [1, 2];
    while (ordem.length < n) { const m = ordem.length * 2; ordem = ordem.flatMap((x) => [x, m + 1 - x]); }
    return ordem;
  }
  // a Copa do Mundo. copa: { selecoes: [times com jogadores], semana: a primeira semana dela }. Os potes saem da força; o sorteio,
  // da semente da temporada (um de cada pote por grupo).
  function copaDoMundo(copa, clubes, semente, jogar) {
    const P = copa.semana, forca = (a, b) => FORCA(clubes[b]) - FORCA(clubes[a]) || a.localeCompare(b);
    const ids = copa.selecoes.map((s) => s.id).sort(forca), potes = [0, 1, 2, 3].map((k) => embaralhar(ids.slice(k * 12, k * 12 + 12), `${semente}:${COPA}:pote${k}`));
    const grupos = [], jogos = [];
    for (let i = 0; i < 12; i++) grupos.push({ id: String.fromCharCode(65 + i), clubes: potes.map((p) => p[i]) });
    for (const g of grupos) gerarCalendario(g.clubes, `${semente}:${COPA}:grupo:${g.id}`).slice(0, 3).forEach((rodada, r) => rodada.forEach(([c, f]) => jogos.push(jogar(COPA, `grupo-${g.id}`, r, c, f, P + r, "meio"))));
    for (const g of grupos) { const res = jogos.filter((j) => j.fase === `grupo-${g.id}`).reduce((a, j) => { (a[j.rodada] ||= []).push([j.casa, j.fora, ...j.placar]); return a; }, []); g.tabela = tabela(g.clubes, res); }
    // os 32: os primeiros (do melhor para o pior), os segundos e os 8 melhores terceiros; 1 contra 32, 2 contra 31...
    const ordenar = (linhas) => [...linhas].sort((a, b) => b.p - a.p || b.sg - a.sg || b.gp - a.gp || forca(a.id, b.id));
    const cabecas = [...ordenar(grupos.map((g) => g.tabela[0])), ...ordenar(grupos.map((g) => g.tabela[1])), ...ordenar(grupos.map((g) => g.tabela[2])).slice(0, 8)].map((l) => l.id);
    const grupoDe = Object.fromEntries(grupos.flatMap((g) => g.clubes.map((id) => [id, g.id])));
    const chave = ordemDaChave(32).map((n) => cabecas[n - 1]);
    // quem é do mesmo grupo não se cruza nos 16 avos: troca o de baixo com o do confronto seguinte
    for (let i = 0; i < 32; i += 2) if (grupoDe[chave[i]] === grupoDe[chave[i + 1]]) { const k = (i + 3) % 32; [chave[i + 1], chave[k]] = [chave[k], chave[i + 1]]; }
    const m = mataMata(COPA, chave, semente, jogar, clubes, [P + 3, P + 4, P + 5, P + 6, P + 7], FASES_COPA);
    // a disputa do 3º lugar: os que perderam as semifinais, na semana da final
    const perdedores = m.jogos.filter((j) => j.fase === "semifinal").map((j) => (vencedorJogo(j, semente, clubes) === j.casa ? j.fora : j.casa));
    const terceiro = jogar(COPA, "terceiro", 0, perdedores[0], perdedores[1], P + 7, "meio", true), terceiroLugar = vencedorJogo(terceiro, semente, clubes);
    const todos = [...jogos, ...m.jogos.filter((j) => j.fase !== "final"), terceiro, ...m.jogos.filter((j) => j.fase === "final")];
    return { id: COPA, nome: copa.nome || NOMES[COPA], tipo: "copa", fase: "encerrada", grupos, rodadasGrupo: 3, jogos: todos, resultados: todos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, terceiro: terceiroLugar, participantes: ids, selecoes: true };
  }
  // classificados (da segunda temporada em diante): { libertadores: [32 ids], europa: { [liga]: [4 ids] }, brasileiros: [ids na ordem da tabela] }
  // copasNovas: a Copa do Brasil, a Sul-Americana e o Super Mundial (as carreiras que já estavam no meio da temporada ficam sem elas)
  // semMundial: sem o Mundial de Clubes (o Super Mundial fica sendo o torneio mundial); só vale junto com copasNovas, e as
  // temporadas que já estavam rolando com o Mundial continuam com ele até a virada
  // copa: a Copa do Mundo desta temporada ({ selecoes, semana }), ou nada
  function simularMundo({ bases, indice, semente, resultadosFixos = {}, classificados = null, copasNovas = false, semMundial = false, copa = null }) {
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
      competicoes[id] = { id, nome: NOMES[id], tipo: "copa", fase: "encerrada", grupos: g.grupos, rodadasGrupo: 6, jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), campeao: m.campeao, vice: m.vice, participantes }; todosJogos.push(...jogos);
    }
    const semanasMundial = [78, 79];
    if (copasNovas) {
      const brasileiros = mundo.ligas.find((l) => l.id === "brasileirao-2026").clubes;
      competicoes.copadobrasil = copaDoBrasil(clubes, brasileiros, semente, jogar);
      competicoes.sulamericana = copaSulAmericana(clubes, mundo, competicoes.libertadores, brasileiros, classificados && classificados.brasileiros, semente, jogar);
      competicoes.supermundial = superMundial(clubes, competicoes, semente, jogar);
      todosJogos.push(...competicoes.copadobrasil.jogos, ...competicoes.sulamericana.jogos, ...competicoes.supermundial.jogos);
      semanasMundial[0] = 82; semanasMundial[1] = 83; // o Mundial vem depois do Super Mundial
    }
    if (!(copasNovas && semMundial)) {
      const lib = competicoes.libertadores, cha = competicoes.champions, semifinalistas = [lib.campeao, cha.vice, cha.campeao, lib.vice], semi = [];
      for (let i = 0; i < 2; i++) semi.push(jogar("mundial", "semifinal", i, semifinalistas[i * 2], semifinalistas[i * 2 + 1], semanasMundial[0], "fim", true));
      const finalistas = semi.map((j) => vencedorJogo(j, semente, clubes)), final = jogar("mundial", "final", 0, finalistas[0], finalistas[1], semanasMundial[1], "fim", true), campeao = vencedorJogo(final, semente, clubes), jogos = [...semi, final];
      competicoes.mundial = { id: "mundial", nome: NOMES.mundial, tipo: "copa", fase: "encerrada", grupos: [], jogos, resultados: jogos.map((j) => [j.casa, j.fora, ...j.placar]), participantes: semifinalistas, campeao, vice: finalistas.find((id) => id !== campeao) }; todosJogos.push(...jogos);
    }
    if (copa && copa.selecoes && copa.selecoes.length === 48) {
      // a pausa: o futebol de clubes para nas semanas da Copa (o que vinha depois anda junto, na mesma ordem)
      for (const j of todosJogos) if (j.semana >= copa.semana) j.semana += SEMANAS_COPA;
      for (const s of copa.selecoes) clubes[s.id] = s;
      competicoes[COPA] = copaDoMundo(copa, clubes, semente, jogar); todosJogos.push(...competicoes[COPA].jogos);
    }
    todosJogos.sort((a, b) => a.semana - b.semana || a.periodo.localeCompare(b.periodo) || a.id.localeCompare(b.id));
    return { competicoes, jogos: todosJogos, campeoes: Object.fromEntries(Object.entries(competicoes).map(([id, c]) => [id, c.campeao])) };
  }
  function jogosDoClube(mundo, clube) { return mundo.jogos.filter((j) => j.casa === clube || j.fora === clube); }
  function conflitoDeCalendario(jogos) { const vistos = new Set(); for (const j of jogos) for (const clube of [j.casa, j.fora]) { const k = `${j.semana}:${clube}`; if (vistos.has(k)) return { semana: j.semana, clube }; vistos.add(k); } return null; }
  return { gerarCalendario, jogoDoClube, tabela, zona, simularMundo, jogosDoClube, conflitoDeCalendario, EUROPA, NOMES, masculina, COPA, SEMANAS_COPA, ordemDaChave };
});
