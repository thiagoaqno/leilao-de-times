// Carreira de Treinador: a base de TESTE (20 clubes e elencos fictícios, no universo da Vila).
// Fica no lugar da base real do Brasileirão até a fase 1 (planos/carreira.md). Os jogadores nascem de um sorteio com
// semente: sempre os mesmos nomes, notas e idades. A base real terá o mesmo formato, mas escrita jogador a jogador.
(function (root, factory) {
  const base = factory();
  if (typeof module === "object" && module.exports) module.exports = base;
  else { root.BasesCarreira = root.BasesCarreira || {}; root.BasesCarreira[base.id] = base; }
})(typeof self !== "undefined" ? self : this, function () {
  function sorteDe(txt) {
    let a = 2166136261;
    for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // id, nome, sigla, cidade, cores (camisa e detalhe), estádio, tamanho (1 a 5), formação preferida
  const CLUBES = [
    ["capivaras", "Capivaras da Marginal", "CAP", "São Paulo", ["#7a4a24", "#f2c14e"], "Arena do Rio Pinheiros", 5, "4-3-3"],
    ["praia", "Praia Futebol Clube", "PRA", "Santos", ["#f4f4f4", "#0b0b0b"], "Estádio da Orla", 5, "4-2-3-1"],
    ["serra", "Serra do Mar EC", "SER", "Cubatão", ["#1f6a3a", "#f4f4f4"], "Alçapão da Serra", 4, "4-4-2"],
    ["tiete", "Tietê Atlético", "TIE", "Osasco", ["#1d4fa0", "#f2d14e"], "Estádio das Pontes", 4, "4-3-3"],
    ["boteco", "Boteco Esporte Clube", "BOT", "Guarulhos", ["#c0392b", "#f4f4f4"], "Arena do Balcão", 4, "3-5-2"],
    ["pastel", "Unidos do Pastel", "PAS", "Santo André", ["#e7b416", "#7a1f1f"], "Feirão Municipal", 3, "4-4-2"],
    ["vila", "Vila Galera FC", "VIL", "Vila da Galera", ["#2e7d32", "#ffd54f"], "Estádio da Praça", 5, "4-3-3"],
    ["trem", "Ferroviário da Luz", "FER", "Jundiaí", ["#5d4037", "#ffb300"], "Estação Arena", 3, "5-3-2"],
    ["coxinha", "Coxinha Futebol Clube", "COX", "Campinas", ["#ef8a2a", "#3b2312"], "Estádio do Salgado", 3, "4-2-3-1"],
    ["garoa", "Garoa Paulistana", "GAR", "São Paulo", ["#9aa4b0", "#1b2430"], "Arena da Neblina", 4, "4-4-2"],
    ["sinuca", "Sinuca Sport", "SIN", "Sorocaba", ["#14532d", "#d4af37"], "Mesa Verde", 2, "4-3-3"],
    ["truco", "Truco Atlético", "TRU", "Ribeirão Preto", ["#8e2430", "#f3ead6"], "Estádio da Manilha", 3, "3-4-3"],
    ["balao", "Balão Apagado EC", "BAL", "São Carlos", ["#6a1b9a", "#ffca28"], "Arena do Céu", 2, "4-4-2"],
    ["acai", "Açaí Clube", "ACA", "Belém", ["#4a148c", "#e1bee7"], "Estádio da Tigela", 3, "4-3-3"],
    ["jangada", "Jangada FC", "JAN", "Fortaleza", ["#0277bd", "#fff59d"], "Arena do Mar", 3, "4-2-3-1"],
    ["pequi", "Pequi Esporte Clube", "PEQ", "Goiânia", ["#c6a700", "#1b5e20"], "Estádio do Cerrado", 2, "4-4-2"],
    ["chimarrao", "Chimarrão FBPA", "CHI", "Porto Alegre", ["#33691e", "#cfd8dc"], "Arena da Cuia", 4, "4-3-3"],
    ["pinhao", "Pinhão Atlético", "PIN", "Curitiba", ["#3e2723", "#a5d6a7"], "Estádio da Araucária", 2, "5-3-2"],
    ["queijo", "Pão de Queijo EC", "QUE", "Belo Horizonte", ["#fbc02d", "#212121"], "Arena do Forno", 4, "4-4-2"],
    ["frevo", "Frevo Sport", "FRE", "Recife", ["#d32f2f", "#fbc02d"], "Estádio do Passo", 2, "4-3-3"],
  ];
  const NOMES = ["Adriano", "Bruno", "Caio", "Danilo", "Edu", "Fabinho", "Gabriel", "Hugo", "Igor", "João", "Kaique", "Léo", "Marcos", "Nando", "Otávio", "Pedro", "Rafa", "Renan", "Samuel", "Thiago", "Vini", "Wesley", "Yuri", "Zé", "Alan", "Breno", "Davi", "Enzo", "Felipe", "Gustavo", "Heitor", "Ian", "Juninho", "Luan", "Matheus", "Nathan", "Paulinho", "Ronaldo", "Sávio", "Tiago", "Vitinho", "Wallace", "Diego", "Everton", "Fábio", "Guilherme", "Kauã", "Lucas", "Murilo", "Rodrigo"];
  const SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Farias", "Gomes", "Henrique", "Lima", "Machado", "Nunes", "Oliveira", "Pereira", "Queiroz", "Ramos", "Santos", "Teixeira", "Vieira", "Xavier", "Moura", "Rocha", "Siqueira", "Pires", "Tavares", "Brito", "Campos", "Duarte", "Freitas", "Moreira", "Lopes", "Costa", "Ribeiro", "Matos", "Bento", "Coelho", "Paixão", "Sampaio", "Fontes", "Aguiar", "Leite"];
  // o elenco: 26 por clube; os 11 primeiros são o time-base (um pouco melhores)
  const POSICOES = ["GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA", "GOL", "GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "VOL", "MC", "MC", "MEI", "MEI", "PE", "ATA", "ATA"];
  // quanto cada posição soma em cada atributo (ritmo, finalização, passe, drible, defesa, físico, goleiro)
  const PERFIL = {
    GOL: { rit: -25, fin: -40, pas: -15, dri: -30, def: -20, fis: -5, gol: 4 },
    ZAG: { rit: -8, fin: -20, pas: -8, dri: -14, def: 5, fis: 4, gol: -50 },
    LD: { rit: 4, fin: -14, pas: -2, dri: -4, def: 0, fis: 0, gol: -50 }, LE: { rit: 4, fin: -14, pas: -2, dri: -4, def: 0, fis: 0, gol: -50 },
    VOL: { rit: -4, fin: -10, pas: 2, dri: -4, def: 3, fis: 3, gol: -50 },
    MC: { rit: -2, fin: -4, pas: 5, dri: 2, def: -4, fis: 0, gol: -50 },
    MEI: { rit: 2, fin: 1, pas: 5, dri: 5, def: -16, fis: -6, gol: -50 },
    PE: { rit: 7, fin: 0, pas: 0, dri: 6, def: -22, fis: -6, gol: -50 }, PD: { rit: 7, fin: 0, pas: 0, dri: 6, def: -22, fis: -6, gol: -50 },
    ATA: { rit: 3, fin: 6, pas: -6, dri: 2, def: -26, fis: 3, gol: -50 },
  };
  const NOTA_TAMANHO = { 5: 77, 4: 74, 3: 71, 2: 68, 1: 65 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const usados = new Set();
  const clubes = CLUBES.map(([id, nome, curto, cidade, cores, estadio, tamanho, formacao]) => {
    const r = sorteDe("base-teste:" + id), base = NOTA_TAMANHO[tamanho];
    const jogadores = POSICOES.map((pos, i) => {
      let nomeJ;
      do { nomeJ = `${NOMES[Math.floor(r() * NOMES.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`; } while (usados.has(nomeJ));
      usados.add(nomeJ);
      const idade = 18 + Math.floor(r() * 17), auge = idade >= 24 && idade <= 30 ? 2 : idade < 21 ? -3 : 0;
      const nota = clamp(Math.round(base + (i < 11 ? 2 : -3) + auge + (r() - 0.5) * 8), 50, 88);
      const atr = {};
      for (const [k, d] of Object.entries(PERFIL[pos])) atr[k] = clamp(Math.round(nota + d + (r() - 0.5) * 10), 20, 95);
      const valor = Math.round(Math.pow(1.13, nota - 60) * (idade < 24 ? 1.4 : idade > 31 ? 0.5 : 1) * 1e5 / 1e4) * 1e4;
      return { id: `${id}-${i + 1}`, nome: nomeJ, idade, pos, pe: r() < 0.25 ? "E" : "D", nota, atr, valor, salario: Math.round(valor / 120 / 1000) * 1000, contrato: 2027 + Math.floor(r() * 4) };
    });
    return { id, nome, curto, cidade, cores, estadio, tamanho, formacao, caixa: tamanho * 8e6, jogadores };
  });
  return { id: "teste", nome: "Liga da Galera (clubes de teste)", ficticia: true, ano: 2026, clubes };
});
