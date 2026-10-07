// Carreira de Treinador: as temporadas que passam (servidor e navegador). A idade de cada um na temporada, a nota de
// cada jogo (o desempenho), a evolução entre uma temporada e outra (de -2 a +3), a aposentadoria e os jovens que sobem
// da base. Tudo com semente: a mesma carreira sempre evolui igual.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Evolucao = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // quanto um jogador pode mudar numa virada de temporada
  const SOBE_MAX = 3, CAI_MAX = -2;
  // quantas temporadas a carreira tem (o técnico escolhe no começo)
  const TEMPORADAS = { min: 1, max: 5, padrao: 2 };
  // a partir de quantos anos pendurar as chuteiras vira uma chance (e a chance por idade)
  const APOSENTA = { 35: 0.25, 36: 0.4, 37: 0.6, 38: 0.85 };

  // ---------- a idade ----------
  // a base brasileira não tem a data de nascimento: a idade sai estimada pelo id (sempre a mesma, de 20 a 32)
  function idadeBase(j) {
    if (j.idade) return j.idade;
    return 20 + Math.floor(Motor.sorteDe(`idade:${j.id}`)() * 13);
  }
  // a idade na temporada: um ano a mais a cada temporada (os jovens da base contam a partir de quando subiram)
  const idadeNa = (j, temporada) => idadeBase(j) + Math.max(0, (temporada || 1) - (j.desde || 1));

  // ---------- a nota de cada jogo ----------
  // quem entrou em campo e quanto jogou bem: começa em 6, sobe com gol, passe e vitória, cai com cartão e derrota.
  // Devolve { [jogador]: nota } dos dois times (de 3 a 10).
  function notasDaPartida(r) {
    const notas = {}, lado = {};
    (r.times || []).forEach((t, l) => { for (const id of t.titulares || []) { notas[id] = 6; lado[id] = l; } });
    for (const e of r.eventos) if (e.tipo === "sub") { for (const id of [e.sai, e.entra]) { notas[id] ??= 6; lado[id] = e.lado; } }
    const soma = (id, v) => { if (id != null && notas[id] != null) notas[id] += v; };
    for (const e of r.eventos) {
      if (e.tipo === "gol") { soma(e.jogador, 1); soma(e.assist, 0.6); }
      else if (e.tipo === "defesa") soma(e.goleiro, 0.3);
      else if (e.tipo === "amarelo") soma(e.jogador, -0.3);
      else if (e.tipo === "vermelho") soma(e.jogador, -1.5);
    }
    const [a, b] = r.placar;
    for (const id of Object.keys(notas)) {
      const l = lado[id], nos = l === 0 ? a : b, eles = l === 0 ? b : a;
      notas[id] += nos > eles ? 0.4 : nos < eles ? -0.4 : 0;
      if (!eles) notas[id] += 0.3;
      notas[id] = Math.round(clamp(notas[id], 3, 10) * 10) / 10;
    }
    return notas;
  }

  // ---------- a evolução ----------
  // quanto o jogador muda na virada da temporada, de -2 a +3:
  //   idade: até 23 tende a subir, de 24 a 29 fica perto de zero, 30+ tende a cair;
  //   minutos: quem jogou mais de 60% dos jogos do time ganha um pouco (o jovem encostado perde);
  //   desempenho: a nota média dos jogos (com pelo menos 3 jogos);
  //   e um pouco de sorte (a semente).
  function evolucaoDe({ idade, nota, jogos = 0, jogosTime = 0, media = null, semente }) {
    const r = Motor.sorteDe(`evolucao:${semente}`);
    let t = idade <= 20 ? 1.6 : idade <= 23 ? 1 : idade <= 26 ? 0.3 : idade <= 29 ? 0 : idade <= 31 ? -0.6 : idade <= 33 ? -1 : -1.4;
    if (jogosTime > 0) {
      const parte = jogos / jogosTime;
      if (parte > 0.6) t += 0.5;
      else if (parte < 0.15 && idade <= 23) t -= 0.4;
    }
    if (media != null && jogos >= 3) t += clamp((media - 6.4) * 0.6, -0.6, 0.6);
    if (nota >= 88) t -= 0.4; // perto do teto, subir é difícil
    t += (r() - 0.5) * 2.2;
    return clamp(Math.round(t), CAI_MAX, SOBE_MAX);
  }
  // pendurar as chuteiras: só a partir dos 35, com chance que cresce com a idade
  function seAposenta(idade, semente) {
    if (idade < 35) return false;
    return Motor.sorteDe(`aposenta:${semente}`)() < APOSENTA[Math.min(38, idade)];
  }

  // ---------- os jovens da base ----------
  const NOMES = {
    pt: [["Gabriel", "Lucas", "Matheus", "Pedro", "Kauã", "Enzo", "Davi", "João", "Vitinho", "Rafael", "Gustavo", "Caio", "Luan", "Ryan", "Arthur", "Igor"],
      ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Rocha", "Teixeira", "Moura", "Barros", "Nunes"]],
    en: [["Jack", "Harry", "Oliver", "Charlie", "Alfie", "George", "Leo", "Freddie", "Archie", "Theo", "Mason", "Kai", "Jayden", "Ethan", "Callum", "Rhys"],
      ["Smith", "Jones", "Taylor", "Brown", "Walker", "Wright", "Hughes", "Turner", "Clarke", "Hall", "Wood", "Harris", "Cooper", "Ward", "Bennett", "Mills"]],
    es: [["Pablo", "Álvaro", "Hugo", "Mateo", "Diego", "Iker", "Martín", "Thiago", "Santiago", "Nicolás", "Joaquín", "Bruno", "Valentín", "Facundo", "Sergio", "Adrián"],
      ["García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Díaz", "Romero", "Torres", "Ruiz", "Navarro", "Ramos", "Castro", "Herrera", "Molina"]],
    it: [["Lorenzo", "Francesco", "Alessandro", "Matteo", "Riccardo", "Tommaso", "Edoardo", "Gabriele", "Federico", "Pietro", "Nicolò", "Samuele", "Davide", "Simone", "Marco", "Andrea"],
      ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "Costa", "Giordano", "Mancini"]],
    de: [["Leon", "Felix", "Jonas", "Lukas", "Paul", "Finn", "Elias", "Noah", "Luis", "Maximilian", "Ben", "Moritz", "Tim", "Niklas", "Jan", "Erik"],
      ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Krüger", "Braun"]],
    fr: [["Lucas", "Hugo", "Louis", "Nathan", "Théo", "Enzo", "Mathis", "Noah", "Rayan", "Yanis", "Bastien", "Maxime", "Kylian", "Adam", "Clément", "Ilan"],
      ["Martin", "Bernard", "Dubois", "Durand", "Lefebvre", "Moreau", "Laurent", "Simon", "Michel", "Garcia", "Fontaine", "Roux", "Morel", "Girard", "Mercier", "Blanc"]],
  };
  const LINGUA = { Brasil: "pt", Inglaterra: "en", Espanha: "es", "Itália": "it", Alemanha: "de", "França": "fr" };
  // a diferença de cada atributo para a nota, por posição: rit, fin, pas, dri, def, fis, gol
  const PERFIL = {
    GOL: [-25, -40, -12, -25, -20, -5, 3], ZAG: [-8, -20, -8, -14, 5, 4, -50], LD: [4, -14, -2, -4, 0, -2, -50], LE: [4, -14, -2, -4, 0, -2, -50],
    VOL: [-6, -12, 0, -6, 4, 3, -50], MC: [-2, -4, 5, 2, -4, 0, -50], MEI: [0, 2, 6, 5, -18, -6, -50], PE: [8, 0, -2, 6, -24, -6, -50], PD: [8, 0, -2, 6, -24, -6, -50], ATA: [3, 6, -6, 2, -26, 3, -50],
  };
  // quantos de cada setor um elenco precisa (e as posições do setor): o jovem novo vem do setor mais vazio
  const SETORES = [[3, ["GOL"]], [8, ["ZAG", "ZAG", "LD", "LE"]], [8, ["VOL", "MC", "MEI"]], [6, ["ATA", "PE", "PD"]]];
  function posicaoCarente(elenco, semente) {
    const r = Motor.sorteDe(`carente:${semente}`);
    const falta = SETORES.map(([ideal, lista]) => [ideal - elenco.filter((j) => lista.includes(j.pos)).length, lista])
      .sort((a, b) => b[0] - a[0]);
    const lista = falta[0][1];
    return lista[Math.floor(r() * lista.length)];
  }
  // um jovem que sobe da base: 17 ou 18 anos, a nota pelo tamanho do clube, o nome da terra do clube
  function criarJovem({ clube, temporada, n, pos, semente }) {
    const r = Motor.sorteDe(`jovem:${semente}:${clube.id}:${temporada}:${n}`);
    const [nomes, sobrenomes] = NOMES[LINGUA[clube.pais] || "es"];
    const nota = clamp(Math.round(50 + (clube.tamanho || 2) * 2.5 + r() * 8), 50, 72);
    const a = PERFIL[pos].map((v) => clamp(Math.round(nota + v + (r() - 0.5) * 6), 20, 95));
    const nome = `${nomes[Math.floor(r() * nomes.length)]} ${sobrenomes[Math.floor(r() * sobrenomes.length)]}`;
    return { id: `${clube.id}-t${temporada}b${n}`, nome, pos, nat: clube.pais || "Brasil", idade: 17 + Math.floor(r() * 2), desde: temporada, nota, est: false, base: true,
      atr: { rit: a[0], fin: a[1], pas: a[2], dri: a[3], def: a[4], fis: a[5], gol: a[6] } };
  }

  return { SOBE_MAX, CAI_MAX, TEMPORADAS, idadeBase, idadeNa, notasDaPartida, evolucaoDe, seAposenta, posicaoCarente, criarJovem };
});
