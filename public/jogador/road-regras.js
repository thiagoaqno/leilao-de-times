// Road to Champions: os PROTAGONISTAS. Seis arquétipos, cada um preso ao seu clube, com posição, idade, jeito,
// estilo de vida (três eixos que andam com as escolhas), um medidor próprio, laços com os outros e a figura guardada
// como DADOS (quem desenha lê o objeto `figura`; o desenho de hoje é o SVG de aparencia.js e pode ser trocado).
// Também ficam aqui os eventos: cada capítulo tem um evento geral (com opções a mais para alguns arquétipos) e, nos
// capítulos 2 e 4, um evento exclusivo de cada protagonista. Cada opção tem `tom` (respeito, provoca ou neutro), que
// decide a repercussão na imprensa.
// UMD: o servidor (road-to-champions.js) usa nas contas; o navegador, na criação e na ficha.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RoadRegras = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- estilo de vida ----------
  const EIXOS = {
    rotina: { nome: "Rotina", min: "Casa", max: "Noite", texto: "Como a vida fora do campo é vivida." },
    exposicao: { nome: "Exposição", min: "Discreto", max: "Holofote", texto: "Quanto a mídia e as redes fazem parte da rotina." },
    grupo: { nome: "Grupo", min: "Vestiário", max: "Individual", texto: "O time em primeiro lugar, ou o próprio nome." },
  };
  const ATRIBUTOS = ["respeito", "ambicao", "disciplina", "prestigio"];

  // ---------- a figura do protagonista ----------
  // Três partes, todas só DADOS e sem nenhum efeito esportivo (nada aqui entra em atributo, forma, risco ou placar):
  //   aparencia: o corpo (pele, rosto, cabelo, barba, altura, porte), com `versao` para um desenho futuro migrar;
  //   visual: o que ele veste (número, acessório, chuteiras);
  //   expressao: o jeito de se mostrar (semblante, comemoração de gol, postura nas entrevistas).
  // O arquétipo só SUGERE a figura inicial: o jogador pode trocar tudo, inclusive tirar o acessório do personagem.
  const VERSAO_FIGURA = 1;
  const PELES = { 1: "#f6d3b5", 2: "#e6b48a", 3: "#c68b5e", 4: "#9c6640", 5: "#5f3a24" };
  const ROSTOS = { oval: "Oval", redondo: "Redondo", quadrado: "Quadrado", fino: "Fino" };
  const CABELOS = { raspado: "Raspado", curto: "Curto", topete: "Topete", cacheado: "Cacheado", black: "Black", trancas: "Tranças", coque: "Coque", longo: "Longo" };
  const CORES_CABELO = { preto: "#1c1410", castanho: "#5a3820", loiro: "#e3c25c", ruivo: "#b4522a", grisalho: "#a3a3a3", platinado: "#efe3c0" };
  const BARBAS = { nenhuma: "Sem barba", rala: "Rala", cheia: "Cheia", cavanhaque: "Cavanhaque" };
  const ACESSORIOS = { nenhum: "Nenhum", corrente: "Corrente de ouro", faixa: "Faixa na cabeça", fones: "Fones no pescoço", oculos: "Óculos âmbar" };
  const CHUTEIRAS = { pretas: "Pretas", brancas: "Brancas", douradas: "Douradas", coloridas: "Uma de cada cor" };
  const SEMBLANTES = { serio: "Sério", sorriso: "Sorridente" };
  // `frase` completa a manchete da vitória: "{nome} comemora <frase>."
  const COMEMORACOES = {
    discreta: { nome: "Discreta", frase: "com um aceno curto, sem festa" },
    bracos: { nome: "Braços abertos", frase: "de braços abertos para a torcida" },
    danca: { nome: "Dancinha", frase: "com a dancinha de sempre" },
    joelhos: { nome: "Deslizar de joelhos", frase: "deslizando de joelhos até a bandeirinha" },
    silencio: { nome: "Dedo nos lábios", frase: "com o dedo nos lábios, mandando a arquibancada rival calar" },
    salto: { nome: "Salto com soco no ar", frase: "com o salto e o soco no ar" },
    zen: { nome: "Pose de meditação", frase: "sentado de pernas cruzadas, olhos fechados" },
    efusiva: { nome: "Efusiva", frase: "correndo, gritando e abraçando todo mundo" },
  };
  const POSTURAS = {
    carismatica: "Carismática", provocadora: "Provocadora", firme: "Firme",
    humilde: "Humilde", enigmatica: "Enigmática", seca: "Seca",
  };

  // ---------- os seis ----------
  const PERSONAGENS = {
    romantico: {
      titulo: "O Último Romântico", clube: "arsenal", pos: "MEI", idade: 34, jeito: "festeiro",
      sugestao: "Juninho Prado",
      resumo: "O último camisa 10 que joga por arte. Perto de parar, chegou ao Arsenal para uma última temporada. Fora de campo, festas, amigos e câmeras o tempo todo.",
      objetivo: "A última dança: levantar a Champions antes de pendurar as chuteiras.",
      mecanicas: [
        "Noite agitada: algumas escolhas trazem risco de lesão no jogo da jornada.",
        "Cavar a falta: pode render vantagem em campo, mas a fama de cai-cai cresce.",
        "Pai dos garotos: proteger os jovens rende respeito e aproxima O Prodígio.",
      ],
      atributos: { respeito: 55, ambicao: 60, disciplina: 35, prestigio: 80 },
      eixos: { rotina: 80, exposicao: 85, grupo: 30 },
      medidor: { chave: "caiCai", nome: "Fama de cai-cai", valor: 20, texto: "Quanto árbitros e imprensa desconfiam das quedas." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 3, rosto: "oval", cabelo: "topete", corCabelo: "platinado", barba: "rala", altura: 1, largura: 0.95 },
        visual: { numero: 10, acessorio: "corrente", chuteiras: "douradas" },
        expressao: { semblante: "sorriso", comemoracao: "bracos", postura: "carismatica" },
      },
    },
    prodigio: {
      titulo: "O Prodígio", clube: "fc-barcelona", pos: "PD", idade: 18, jeito: "vaidoso",
      sugestao: "Nico Barral",
      resumo: "A nova esperança da Espanha. Cria de um bairro de imigrantes, fala o que pensa, banca as provocações e vive como popstar. O ídolo dele está no Arsenal.",
      objetivo: "Provar que é o melhor do mundo antes dos 20.",
      mecanicas: [
        "Bancar a marra: promete antes do jogo. Se cumprir, o prestígio dispara; se não, vira meme.",
        "Orgulho do bairro e das causas: posicionamentos dividem a opinião pública.",
        "Começa com O Último Romântico como ídolo.",
      ],
      atributos: { respeito: 45, ambicao: 80, disciplina: 50, prestigio: 70 },
      eixos: { rotina: 60, exposicao: 80, grupo: 55 },
      medidor: { chave: "marra", nome: "Marra cumprida", valor: 50, texto: "O saldo das promessas: sobe quando cumpre, cai quando não." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 4, rosto: "fino", cabelo: "cacheado", corCabelo: "preto", barba: "nenhuma", altura: 0.95, largura: 0.9 },
        visual: { numero: 19, acessorio: "faixa", chuteiras: "brancas" },
        expressao: { semblante: "sorriso", comemoracao: "joelhos", postura: "provocadora" },
      },
    },
    resiliente: {
      titulo: "O Resiliente", clube: "real-madrid", pos: "PE", idade: 26, jeito: "guerreiro",
      sugestao: "Davi Moura",
      resumo: "Fez uma temporada de Bola de Ouro e não levou. Era o dono do time até a chegada de Ventura, o técnico novo e linha-dura. Dribla muito, enfrenta o racismo de frente e cresce em final.",
      objetivo: "Reconquistar o lugar no time e decidir a final.",
      mecanicas: [
        "Relação com Ventura: abaixo de 30, começa a jornada no banco (forma -1).",
        "Provocação da arquibancada: responder ou focar, sempre com custo e ganho.",
        "Cresce em final: forma +1 na grande final.",
      ],
      atributos: { respeito: 60, ambicao: 70, disciplina: 60, prestigio: 75 },
      eixos: { rotina: 35, exposicao: 70, grupo: 45 },
      medidor: { chave: "tecnico", nome: "Relação com Ventura", valor: 35, texto: "A confiança do técnico. Abaixo de 30, banco." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 5, rosto: "oval", cabelo: "trancas", corCabelo: "preto", barba: "nenhuma", altura: 1, largura: 0.95 },
        visual: { numero: 7, acessorio: "nenhum", chuteiras: "pretas" },
        expressao: { semblante: "sorriso", comemoracao: "danca", postura: "firme" },
      },
    },
    imprevisivel: {
      titulo: "O Imprevisível", clube: "paris-saint-germain", pos: "PD", idade: 29, jeito: "festeiro",
      sugestao: "Théo Mabanza",
      resumo: "Rápido demais, ambidestro de verdade e dono da última Bola de Ouro. Já foi o jogador de vidro que perdia a hora no videogame. Hoje é ídolo em Paris, mas o caos continua nele.",
      objetivo: "Defender a Bola de Ouro e enterrar o apelido de jogador de vidro.",
      mecanicas: [
        "Caos: com a Rotina acima de 50, a forma varia de -1 a +1 a cada jornada.",
        "Jogador de vidro: com a Rotina acima de 60, o risco de lesão sobe.",
        "Ex-Barcelona: tem história com O Prodígio.",
      ],
      atributos: { respeito: 55, ambicao: 55, disciplina: 45, prestigio: 85 },
      eixos: { rotina: 55, exposicao: 40, grupo: 50 },
      medidor: { chave: "vidro", nome: "Fama de vidro", valor: 40, texto: "Quanto a imprensa ainda espera a próxima lesão." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 5, rosto: "quadrado", cabelo: "raspado", corCabelo: "preto", barba: "rala", altura: 0.95, largura: 0.95 },
        visual: { numero: 10, acessorio: "nenhum", chuteiras: "coloridas" },
        expressao: { semblante: "serio", comemoracao: "salto", postura: "humilde" },
      },
    },
    enigma: {
      titulo: "O Enigma", clube: "fc-bayern-munchen", pos: "PD", idade: 24, jeito: "reservado",
      sugestao: "Kai Adebayo",
      resumo: "Frio, de fones, longe das câmeras. Não comemora, escolhe a chuteira pela cor do uniforme e responde coisas que ninguém entende. Personagem ou autêntico demais?",
      objetivo: "Nenhum que ele admita. A imprensa quer decifrá-lo.",
      mecanicas: [
        "Blindado: o lado ruim da imprensa pesa só metade nele.",
        "Resposta enigmática: vira meme genial ou soa arrogante.",
        "A Exposição nunca passa de 50.",
      ],
      atributos: { respeito: 50, ambicao: 45, disciplina: 70, prestigio: 60 },
      eixos: { rotina: 20, exposicao: 10, grupo: 75 },
      medidor: { chave: "decifrado", nome: "Decifrado", valor: 0, texto: "Quanto a Europa já entendeu quem ele é." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 4, rosto: "redondo", cabelo: "black", corCabelo: "preto", barba: "nenhuma", altura: 1, largura: 0.95 },
        visual: { numero: 17, acessorio: "fones", chuteiras: "pretas" },
        expressao: { semblante: "serio", comemoracao: "discreta", postura: "enigmatica" },
      },
    },
    maquina: {
      titulo: "A Máquina", clube: "manchester-city", pos: "ATA", idade: 26, jeito: "profissional",
      sugestao: "Sindre Vik",
      resumo: "Um centroavante que parece feito em laboratório: óculos de luz azul, sol na cara às sete da manhã e 6 mil calorias por dia. Entrevistas de uma frase. E a fama de sumir nos jogos grandes.",
      objetivo: "Quebrar a fama de sumir em semifinal e final.",
      mecanicas: [
        "Protocolo: é quem menos se machuca, e a Rotina dele quase não sobe.",
        "Fantasma dos jogos grandes: na semifinal e na final, forma -1 se Jogo grande estiver abaixo de 25, +1 a partir de 50.",
        "Contraste com O Enigma: a imprensa compara os dois frios.",
      ],
      atributos: { respeito: 55, ambicao: 75, disciplina: 90, prestigio: 75 },
      eixos: { rotina: 5, exposicao: 45, grupo: 70 },
      medidor: { chave: "jogoGrande", nome: "Jogo grande", valor: 0, texto: "A confiança para aparecer quando vale a taça." },
      // a figura sugerida (o jogador muda o que quiser)
      figura: {
        aparencia: { pele: 1, rosto: "quadrado", cabelo: "coque", corCabelo: "loiro", barba: "nenhuma", altura: 1.1, largura: 1.1 },
        visual: { numero: 9, acessorio: "oculos", chuteiras: "brancas" },
        expressao: { semblante: "serio", comemoracao: "zen", postura: "seca" },
      },
    },
  };
  const IDS = Object.keys(PERSONAGENS);
  const porClube = (clube) => IDS.find((id) => PERSONAGENS[id].clube === clube) || null;

  // os laços que já nascem prontos (valem quando os dois estão na sala)
  const LACOS = [
    { a: "romantico", b: "prodigio", valor: 30, texto: "Ídolo e herdeiro" },
    { a: "prodigio", b: "resiliente", valor: -15, texto: "El Clásico" },
    { a: "romantico", b: "resiliente", valor: 10, texto: "Companheiros de seleção" },
    { a: "imprevisivel", b: "prodigio", valor: 5, texto: "O ex-Barça e a cria do Barça" },
    { a: "maquina", b: "enigma", valor: 0, texto: "Os dois frios" },
  ];

  // ---------- validação da figura ----------
  const tem = (lista, v) => typeof v === "string" && Object.prototype.hasOwnProperty.call(lista, v);
  const de = (lista, v, padrao) => (tem(lista, v) ? v : padrao);
  const objeto = (x) => (x && typeof x === "object" ? x : {});
  // a marca única de cada arquétipo no formato antigo (um objeto só, com `numero` e `marca`)
  const MARCA_ANTIGA = { romantico: "corrente", prodigio: "faixa", resiliente: "sorriso", imprevisivel: "chuteiras", enigma: "fones", maquina: "oculos" };
  const ehFormatoAntigo = (f) => !f.aparencia && !f.visual && !f.expressao && ("numero" in f || "marca" in f || "pele" in f);
  // converte o formato antigo para as três partes (as campanhas criadas antes desta versão)
  function doFormatoAntigo(arquetipo, a) {
    const { numero, marca, ...corpo } = a;
    const visual = { numero }, expressao = {};
    const desligada = marca === "" || marca === false, qual = desligada ? MARCA_ANTIGA[arquetipo] : marca;
    if (qual === "chuteiras") visual.chuteiras = desligada ? "pretas" : "coloridas";
    else if (qual === "sorriso") expressao.semblante = desligada ? "serio" : "sorriso";
    else if (tem(ACESSORIOS, qual)) visual.acessorio = desligada ? "nenhum" : qual;
    return { aparencia: corpo, visual, expressao };
  }
  // devolve a figura limpa. O que faltar ou vier errado fica como em `atual` (a figura de agora) ou, sem ela, como a
  // sugestão do arquétipo. Aceita o formato antigo.
  function limparFigura(arquetipo, entrada, atual) {
    const def = PERSONAGENS[arquetipo] || PERSONAGENS.romantico;
    const base = atual && atual.aparencia ? atual : def.figura;
    let f = objeto(entrada);
    if (ehFormatoAntigo(f)) f = doFormatoAntigo(arquetipo, f);
    const a = objeto(f.aparencia), v = objeto(f.visual), e = objeto(f.expressao);
    const ba = base.aparencia, bv = base.visual, be = base.expressao;
    const escala = (x, padrao) => {
      const n = Number(x); if (x === null || x === "" || !Number.isFinite(n)) return padrao;
      return +(Math.round(clamp(n, 0.9, 1.1) / 0.05) * 0.05).toFixed(2);
    };
    const inteiro = (x, min, max, padrao) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n >= min && n <= max ? n : padrao; };
    return {
      aparencia: {
        versao: VERSAO_FIGURA,
        pele: inteiro(a.pele, 1, 5, ba.pele),
        rosto: de(ROSTOS, a.rosto, ba.rosto || "oval"),
        cabelo: de(CABELOS, a.cabelo, ba.cabelo),
        corCabelo: de(CORES_CABELO, a.corCabelo, ba.corCabelo),
        barba: de(BARBAS, a.barba, ba.barba),
        altura: escala(a.altura, ba.altura),
        largura: escala(a.largura, ba.largura),
      },
      visual: {
        numero: inteiro(v.numero, 1, 99, bv.numero),
        acessorio: de(ACESSORIOS, v.acessorio, bv.acessorio),
        chuteiras: de(CHUTEIRAS, v.chuteiras, bv.chuteiras),
      },
      expressao: {
        semblante: de(SEMBLANTES, e.semblante, be.semblante),
        comemoracao: de(COMEMORACOES, e.comemoracao, be.comemoracao),
        postura: de(POSTURAS, e.postura, be.postura),
      },
    };
  }
  // a mudança de figura no meio da campanha: só o que veio muda, o resto fica como está
  function mudarFigura(p, mudanca) {
    const m = objeto(mudanca), f = p.figura;
    p.figura = limparFigura(p.arquetipo, {
      aparencia: { ...f.aparencia, ...objeto(m.aparencia) },
      visual: { ...f.visual, ...objeto(m.visual) },
      expressao: { ...f.expressao, ...objeto(m.expressao) },
    }, f);
    return p.figura;
  }

  // ---------- protagonista ----------
  // completa um protagonista (novo ou de campanha antiga) com tudo o que as regras usam
  function garantir(p) {
    const def = PERSONAGENS[p.arquetipo];
    p.atributos = p.atributos || { respeito: 50, ambicao: 50, disciplina: 50, prestigio: 50 };
    p.eixos = p.eixos || (def ? { ...def.eixos } : { rotina: 50, exposicao: 50, grupo: 50 });
    p.medidores = p.medidores || (def ? { [def.medidor.chave]: def.medidor.valor } : {});
    p.marcas = p.marcas || [];
    p.relacoes = p.relacoes || {};
    p.escolhas = p.escolhas || [];
    // a aparência num objeto só (formato antigo) vira a figura em três partes
    if (def && !p.figura) p.figura = limparFigura(p.arquetipo, p.aparencia);
    if ("aparencia" in p) delete p.aparencia;
    return p;
  }
  function novoProtagonista(arquetipo, figura) {
    const def = PERSONAGENS[arquetipo]; if (!def) return null;
    return garantir({
      arquetipo, clube: def.clube, pos: def.pos, idade: def.idade,
      atributos: { ...def.atributos }, eixos: { ...def.eixos },
      medidores: { [def.medidor.chave]: def.medidor.valor },
      figura: limparFigura(arquetipo, figura),
    });
  }

  // ---------- eventos ----------
  // ef: atributos e eixos (soma), medidores (soma pela chave), rel (com o rival da jornada), relCom { arquétipo: n },
  // marca (fica no protagonista), risco (chance de lesão na jornada), forma (só nesta jornada), aposta (marra),
  // sorte { chance, bom, ruim } (resolvida na hora), manchete ({nome} vira o nome do protagonista) e figura (a evolução
  // visual: { aparencia, visual, expressao, texto }; muda só o que vier, por escolha do jogador, e vai para o diário).
  const O = (texto, dica, tom, ef, extra = {}) => ({ texto, dica, tom, ef, ...extra });
  const so = (...ids) => ({ para: ids });
  // a cena dublada (road-voz.js + dublagem/manifesto.json): o ramo do roteiro que esta opção toca (A, B, C) e o que ela
  // grava no estado narrativo do protagonista (`narrativa`), para as falas condicionais e os callbacks de depois.
  // Opção sem `voz` também vale na cena dublada: só não tem fala depois da escolha.
  const voz = (ramo, narrativa = {}) => ({ voz: ramo, narrativa });

  const GERAIS = [
    { id: "resposta", capitulo: 0, titulo: "A resposta inesperada",
      texto: "Uma declaração provocativa sobre os protagonistas viraliza na imprensa. O jornalista pede sua reação.",
      opcoes: [
        O("Retribuir o elogio", "O respeito vem antes da rivalidade.", "respeito", { respeito: 16, prestigio: 8, rel: 16 }),
        O("Responder com provocação", "A guerra psicológica começa agora.", "provoca", { ambicao: 12, prestigio: 5, rel: -20, exposicao: 6 }),
        O("Não dar importância", "Prefiro falar dentro de campo.", "neutro", { disciplina: 10 }),
        O("Bancar a marra: prometer gol na cara dele", "Se cumprir, o mundo é seu. Se não, vira meme.", "provoca",
          { ambicao: 10, exposicao: 8, rel: -12, aposta: true }, so("prodigio")),
        O("Dizer que nem sabe quem é", "Ninguém sabe se é deboche ou sinceridade.", "neutro",
          { sorte: { chance: 0.5,
            bom: { prestigio: 12, decifrado: 5, manchete: "“Quem?”: a resposta de {nome} vira o meme da semana." },
            ruim: { respeito: -10, decifrado: 5, rel: -10, manchete: "{nome} é acusado de arrogância depois de fingir não conhecer o rival." } } },
          so("enigma")),
        O("Responder com uma frase: “Ok.”", "O repórter fica sem graça. Você volta para o protocolo.", "neutro",
          { disciplina: 6, prestigio: 4, manchete: "“Ok.”: {nome} encerra a entrevista em uma palavra." }, so("maquina")),
        O("“Me espera no gramado. Vou dançar lá.”", "A torcida rival vai cobrar cada drible.", "provoca",
          { ambicao: 10, prestigio: 8, rel: -14, exposicao: 6, forma: 1 }, so("resiliente")),
      ] },
    { id: "convite", capitulo: 1, titulo: "O convite nos bastidores",
      texto: "Depois da última rodada, o protagonista rival sugere uma conversa fora das câmeras.",
      opcoes: [
        O("Aceitar e conversar", "A rivalidade pode se transformar em amizade.", "respeito", { respeito: 12, rel: 22 }),
        O("Recusar educadamente", "A disputa fica restrita ao gramado.", "neutro", { disciplina: 10 }),
        O("Vazar o convite", "Uma manchete nasce de uma conversa privada.", "provoca", { ambicao: 12, prestigio: -8, rel: -24, exposicao: 8 }),
      ] },
    { id: "promessa", capitulo: 2, titulo: "Uma promessa para a Europa",
      texto: "Um repórter pergunta até onde seu clube pode chegar nesta Champions.",
      opcoes: [
        O("Prometer a taça", "Uma promessa pública pode cobrar seu preço.", "provoca", { ambicao: 18, prestigio: 5, rel: -4 }),
        O("Priorizar o grupo", "Ninguém levanta a taça sozinho.", "respeito", { respeito: 12, disciplina: 7, rel: 9, grupo: -8 }),
        O("Desafiar os rivais", "O futebol europeu escuta seu recado.", "provoca", { ambicao: 11, prestigio: 9, rel: -13 }),
        O("Dedicar a última dança à torcida", "Pode ser a última Champions. Você quer que ela lembre.", "respeito",
          { respeito: 10, prestigio: 10, manchete: "{nome} chama esta Champions de “a última dança”." }, so("romantico")),
        O("Aparecer sem a corrente e de cabelo curto", "Menos festa, mais foco. A Europa nota a mudança.", "respeito",
          { disciplina: 10, rotina: -10, exposicao: -6,
            figura: { aparencia: { cabelo: "curto", corCabelo: "castanho" }, visual: { acessorio: "nenhum" },
              texto: "{nome} aparece sem a corrente e de cabelo curto. A última dança pede outro homem." } },
          { ...so("romantico"), requer: (p) => p.figura?.visual.acessorio === "corrente" }),
        O("Ir à coletiva sem os óculos âmbar", "Os olhos à mostra, pela primeira vez. Ninguém esperava.", "neutro",
          { exposicao: 6, jogoGrande: 8,
            figura: { visual: { acessorio: "nenhum" }, texto: "{nome} chega à coletiva sem os óculos âmbar. O protocolo mudou." } },
          { ...so("maquina"), requer: (p) => p.figura?.visual.acessorio === "oculos" }),
        O("“Final é comigo.”", "Uma frase que a imprensa vai guardar até maio.", "provoca",
          { ambicao: 14, prestigio: 6, tecnico: -5 }, so("resiliente")),
      ] },
    { id: "semifinal", capitulo: 3, titulo: "O peso da semifinal",
      texto: "O acesso ao vestiário é disputado pela imprensa. Seus rivais aguardam sua palavra.",
      opcoes: [
        O("Dar apoio aos eliminados", "O respeito existe mesmo na derrota.", "respeito", { respeito: 18, rel: 16 }),
        O("Evitar distrações", "O trabalho em campo continua.", "neutro", { disciplina: 14 }),
        O("Falar que será o melhor", "Sua imagem fica ligada à vitória.", "provoca", { ambicao: 15, rel: -12 }),
      ] },
    { id: "final", capitulo: 4, titulo: "O último capítulo",
      texto: "A final se aproxima. O mundo inteiro acompanha os protagonistas.",
      opcoes: [
        O("Agradecer aos adversários", "O legado está além da taça.", "respeito", { respeito: 20, prestigio: 10, rel: 15 }),
        O("Assumir o protagonismo", "Você deseja escrever a última manchete.", "provoca", { ambicao: 17, prestigio: 6, rel: -5 }),
        O("Exigir respeito", "Cada palavra pode reacender uma antiga rivalidade.", "provoca", { disciplina: 8, ambicao: 8, rel: -15 }),
        O("Chamar o grupo de fones na cabeça", "Ele fala pela primeira vez no vestiário.", "respeito",
          { respeito: 14, grupo: -12, decifrado: 15, manchete: "Pela primeira vez, {nome} fala no vestiário antes de um jogo." }, so("enigma")),
        O("Avisar que, se marcar, vai comemorar de verdade", "Ninguém nunca o viu sorrir num gol.", "neutro",
          { decifrado: 10, exposicao: 6,
            figura: { expressao: { comemoracao: "efusiva", semblante: "sorriso" },
              texto: "{nome} avisa: se marcar na final, a comemoração vai ser outra." } },
          { ...so("enigma"), requer: (p) => p.figura?.expressao.comemoracao !== "efusiva" }),
        O("Pedir a bola ao meia na véspera", "Para a bola chegar limpa, ela precisa ser pedida.", "respeito",
          { grupo: -10, jogoGrande: 15, respeito: 6 }, so("maquina")),
      ] },
  ];

  // capítulos 2 e 4 (índices 1 e 3): um evento só de cada protagonista
  const EXCLUSIVOS = {
    romantico: [
      { id: "aniversario", capitulo: 1, titulo: "O aniversário do parça",
        texto: "Faltam dois dias para o jogo e o seu melhor amigo de infância faz aniversário. Iate, DJ, metade de Londres convidada. Os parças contam com você.",
        opcoes: [
          O("Ir e fechar a festa", "Ninguém vive só de futebol. Mas o corpo tem 34 anos.", "neutro",
            { rotina: 15, exposicao: 10, disciplina: -12, prestigio: 4, risco: 0.35, marca: "balada",
              manchete: "Fotos de {nome} às 4h da manhã circulam a dois dias do jogo." }, voz("A", { rom_festa: "integral" })),
          O("Passar só para dar um abraço", "Uma hora, um parabéns e cama.", "neutro",
            { rotina: 4, respeito: 4, risco: 0.1 }, voz("B", { rom_festa: "breve" })),
          O("Ficar em casa e cuidar do corpo", "Os parças vão reclamar. A coxa agradece.", "neutro",
            { rotina: -14, disciplina: 12, exposicao: -4, forma: 1 }, voz("C", { rom_festa: "nao" })),
          O("Levar os garotos da base num jantar, não na festa", "Você vira o irmão mais velho, não o rei da noite.", "respeito",
            { grupo: -12, respeito: 10, rotina: -6, relCom: { prodigio: 8 },
              manchete: "{nome} troca o iate por um jantar com os garotos da base." },
            { requer: (p) => p.eixos.grupo <= 45, ...voz("C", { rom_festa: "nao" }) }),
        ] },
      { id: "cai-cai", capitulo: 3, titulo: "O lance da semifinal",
        texto: "O zagueiro rival chega atrasado em todas. A área está logo ali, e o árbitro já marcou dois pênaltis nesta Champions.",
        opcoes: [
          O("Cair no primeiro contato", "Pode render o pênalti. Pode render o rótulo para sempre.", "provoca",
            { forma: 1, respeito: -10, prestigio: -4, caiCai: 20,
              manchete: "Polêmica: {nome} cai na área e a Europa volta a falar em cai-cai." }),
          O("Ficar de pé e driblar de novo", "A arte primeiro. Mesmo apanhando.", "respeito",
            { respeito: 10, disciplina: 6, caiCai: -15, risco: 0.12 }),
          O("Pedir ao árbitro que proteja os garotos do time", "Quem leva a pancada não precisa ser o jovem.", "respeito",
            { grupo: -10, respeito: 8, relCom: { prodigio: 10 }, caiCai: -5 }),
        ] },
    ],
    prodigio: [
      { id: "bairro", capitulo: 1, titulo: "O gol e o bairro",
        texto: "Você marca no treino de finalização diante das câmeras. A imprensa espera a comemoração: o bairro onde você cresceu está assistindo.",
        opcoes: [
          O("Fazer o gesto do código postal do bairro", "Lembrar de onde veio, para quem duvidou.", "neutro",
            { exposicao: 8, prestigio: 8, respeito: 4, marca: "bairro" }),
          O("Levantar a bandeira de uma causa", "Metade aplaude, metade pede punição.", "provoca",
            { exposicao: 14, respeito: 8, prestigio: -4, ambicao: 4, marca: "ativista",
              manchete: "A comemoração de {nome} divide a Espanha e vira debate no país inteiro." }),
          O("Comemorar só com o time", "Hoje o recado é para dentro.", "respeito",
            { grupo: -10, respeito: 6, exposicao: -6 }),
        ] },
      { id: "faixa", capitulo: 3, titulo: "A faixa da semifinal",
        texto: "Você está escolhendo o que escrever na faixa da cabeça para a semifinal. O vestiário espera para ver.",
        opcoes: [
          O("“EGO”, e prometer dois gols", "Marra no limite. Se cumprir, ninguém mais segura.", "provoca",
            { ambicao: 12, exposicao: 8, aposta: true, manchete: "{nome} entra na semifinal com “EGO” na faixa e uma promessa." }),
          O("O nome do bairro", "Quem te criou vai junto.", "respeito", { respeito: 8, prestigio: 6 }),
          O("Cortar e descolorir o cabelo para o jogo", "Visual novo para a noite que todo mundo vai ver.", "neutro",
            { exposicao: 8, prestigio: 6,
              figura: { aparencia: { cabelo: "topete", corCabelo: "platinado" },
                texto: "{nome} chega à semifinal de cabelo novo, descolorido." } },
            { requer: (p) => p.figura?.aparencia.corCabelo !== "platinado" }),
          O("Tirar a faixa e ligar para o seu ídolo", "Ele já jogou semifinais demais para não ter um conselho.", "respeito",
            { disciplina: 10, ambicao: -4, relCom: { romantico: 12 }, forma: 1,
              manchete: "Antes da semifinal, {nome} liga para o seu ídolo. A conversa vaza, e é bonita." },
            { requer: (p, ctx) => ctx.tem("romantico") }),
        ] },
    ],
    resiliente: [
      { id: "banco", capitulo: 1, titulo: "O banco de Ventura",
        texto: "Na véspera, Ventura anuncia a escalação: você começa no banco. Na coletiva, ele diz que “ninguém é maior que o clube”.",
        opcoes: [
          O("Aceitar e responder no treino", "Ventura respeita quem fecha a boca e corre.", "neutro",
            { tecnico: 18, disciplina: 10, ambicao: -4 }, voz("B", { res_reacao_banco: "B", res_relacao_ventura_delta: 1 })),
          O("Cobrar publicamente", "A torcida está com você. O técnico, cada vez menos.", "provoca",
            { tecnico: -20, exposicao: 10, ambicao: 12, prestigio: 4,
              manchete: "Crise em Madri: {nome} rebate Ventura publicamente." },
            voz("A", { res_reacao_banco: "A", res_relacao_ventura_delta: -1 })),
          O("Pedir uma conversa a sós", "Sem câmeras, de homem para homem.", "respeito",
            { tecnico: 10, respeito: 6, grupo: -6 }),
          O("Sair em silêncio", "Nenhuma palavra. A resposta fica para domingo.", "neutro",
            { disciplina: 6, tecnico: 4, exposicao: -4 }, voz("C", { res_reacao_banco: "C", res_relacao_ventura_delta: 0 })),
        ] },
      { id: "arquibancada", capitulo: 3, titulo: "A arquibancada",
        texto: "No aquecimento da semifinal, parte da torcida adversária dirige ofensas racistas a você. O árbitro finge não ouvir.",
        opcoes: [
          O("Parar e exigir o protocolo", "O jogo pode esperar. Isso não.", "respeito",
            { respeito: 18, prestigio: 10, exposicao: 10, marca: "denuncia",
              manchete: "{nome} para o aquecimento e exige o protocolo antirracismo. A Europa inteira assiste." }),
          O("Responder com o drible e a dança", "A melhor resposta é o gol, e depois a comemoração.", "provoca",
            { ambicao: 10, prestigio: 8, forma: 1, rel: -8 }),
          O("Denunciar depois, com o clube ao lado", "Antes do jogo, foco. Depois, nada fica impune.", "respeito",
            { disciplina: 10, respeito: 10, tecnico: 6 }),
        ] },
    ],
    imprevisivel: [
      { id: "despertador", capitulo: 1, titulo: "O despertador",
        texto: "A partida de videogame foi até as quatro. O despertador tocou, e você não ouviu. O treino começou há vinte minutos.",
        opcoes: [
          O("Assumir o atraso e pagar a multa", "Ninguém espera perfeição. Esperam verdade.", "neutro",
            { disciplina: 8, respeito: 6, rotina: -4 }, voz("B", { imp_sinceridade_duval: true, imp_disciplina_delta: 0 })),
          O("Inventar um trânsito na ponte", "Talvez cole. Talvez alguém tenha visto você on-line.", "neutro",
            { disciplina: -6, sorte: { chance: 0.5,
              bom: { manchete: "" },
              ruim: { respeito: -12, prestigio: -6, manchete: "Desculpa desmontada: {nome} estava on-line às quatro da manhã." } } },
            voz("A", { imp_sinceridade_duval: false, imp_disciplina_delta: -1 })),
          O("Contratar um chef e um técnico de sono", "O Bola de Ouro decide crescer de vez.", "respeito",
            { rotina: -18, disciplina: 14, ambicao: 6, vidro: -15,
              manchete: "{nome} monta uma equipe pessoal de sono e nutrição." }),
          O("Desligar e correr para o treino", "Sem explicação: o carro já está na rua.", "neutro",
            { disciplina: 6, respeito: -2 }, voz("C", { imp_disciplina_delta: 1 })),
        ] },
      { id: "coxa", capitulo: 3, titulo: "A coxa avisou",
        texto: "No último treino antes da semifinal, a parte de trás da coxa repuxa no sprint. Ninguém viu.",
        opcoes: [
          O("Jogar no sacrifício", "Semifinal não se assiste da tribuna.", "neutro",
            { ambicao: 10, respeito: 6, risco: 0.3, vidro: 5 }),
          O("Avisar o médico e jogar controlado", "Menos explosão, mais cabeça.", "respeito",
            { disciplina: 10, forma: -1, vidro: -10 }),
          O("Esconder e treinar ainda mais forte", "O apelido morre hoje, de um jeito ou de outro.", "provoca",
            { ambicao: 12, forma: 1, risco: 0.45, vidro: 10 }),
        ] },
    ],
    enigma: [
      { id: "coletiva", capitulo: 1, titulo: "A coletiva obrigatória",
        texto: "A UEFA exige um jogador por clube na coletiva. O assessor escolhe você. Dez microfones, nenhum fone permitido.",
        opcoes: [
          O("Uma palavra por resposta", "Eles queriam um jogador. Não disseram quantas palavras.", "neutro",
            { disciplina: 4, decifrado: -5, exposicao: -4 }, voz("A", { eni_abertura_imprensa: "literal" })),
          O("Falar só de torrada queimada", "A pergunta era sobre tática. A resposta, sobre café da manhã.", "neutro",
            { sorte: { chance: 0.55,
              bom: { prestigio: 14, decifrado: 8, manchete: "A torrada queimada de {nome} vira o assunto mais comentado da rodada." },
              ruim: { respeito: -10, decifrado: 4, manchete: "Jornalistas reclamam da postura de {nome} na coletiva." } } },
            voz("B", { eni_abertura_imprensa: "ironia" })),
          O("Falar de verdade, pela primeira vez", "Ninguém esperava. Talvez nem você.", "respeito",
            { decifrado: 22, exposicao: 12, respeito: 10,
              manchete: "Quinze minutos de {nome} sem fones: a Europa descobre quem ele é." },
            voz("C", { eni_abertura_imprensa: "sincera" })),
        ] },
      { id: "chuteira", capitulo: 3, titulo: "A chuteira da cor errada",
        texto: "Uma marca oferece um contrato milionário, com uma condição: usar a chuteira dela, que não combina com o uniforme da semifinal.",
        opcoes: [
          O("Recusar: a chuteira é escolhida pela cor", "Dinheiro não combina com o uniforme.", "neutro",
            { decifrado: 5, prestigio: 6, ambicao: -4 }),
          O("Aceitar e pintar a chuteira", "Cumpre o contrato e a regra da cor ao mesmo tempo.", "neutro",
            { ambicao: 8, prestigio: 4, exposicao: 6, decifrado: 8 }),
          O("Jogar com uma de cada marca", "Ninguém entende. Exatamente como ele gosta.", "provoca",
            { prestigio: 10, decifrado: -5, manchete: "{nome} entra na semifinal com uma chuteira de cada marca." }),
        ] },
    ],
    maquina: [
      { id: "protocolo", capitulo: 1, titulo: "Protocolo noturno",
        texto: "O elenco marca um jantar depois do jogo. O seu protocolo diz cama às nove, com os óculos âmbar e o quarto a 18 graus.",
        opcoes: [
          O("Seguir o protocolo", "O corpo é o trabalho.", "neutro", { disciplina: 8, grupo: 8, rotina: -4 },
            voz("A", { maq_adesao_protocolo: "alta", maq_integracao_elenco: "baixa" })),
          O("Ir ao jantar de óculos âmbar", "Fica uma hora, pede fígado e vira lenda no grupo.", "respeito",
            { grupo: -12, respeito: 8, jogoGrande: 12,
              manchete: "Foto de {nome} de óculos âmbar no jantar do elenco viraliza." },
            voz("B", { maq_adesao_protocolo: "moderada", maq_integracao_elenco: "media" })),
          O("Convidar o time para o seu ritual de sol às sete", "Metade aparece. A outra metade ri, mas aparece na semana seguinte.", "respeito",
            { grupo: -8, exposicao: 6, jogoGrande: 6, disciplina: 4 }),
          O("Ficar com os colegas até tarde", "Hoje o protocolo dorme sozinho.", "respeito",
            { grupo: -14, rotina: 8, respeito: 6, disciplina: -6 },
            voz("C", { maq_adesao_protocolo: "baixa", maq_integracao_elenco: "alta" })),
        ] },
      { id: "fantasma", capitulo: 3, titulo: "O fantasma dos jogos grandes",
        texto: "Na coletiva da semifinal, a pergunta vem sem rodeio: “Você some em jogo grande?”",
        opcoes: [
          O("“Veremos.”", "Uma palavra. A resposta vem em campo.", "neutro",
            { jogoGrande: 6, prestigio: 4, manchete: "“Veremos.”: {nome} responde em uma palavra." }),
          O("Pedir para treinar com os meias a semana inteira", "A bola precisa chegar limpa. Então você vai buscar.", "respeito",
            { grupo: -10, jogoGrande: 20, respeito: 6 }),
          O("Repetir a finalização 200 vezes depois do treino", "Se a bola chegar, não volta.", "neutro",
            { disciplina: 10, jogoGrande: 10, rotina: -4 }),
        ] },
    ],
  };

  const TODOS = [...GERAIS, ...Object.values(EXCLUSIVOS).flat()];
  const POR_ID = new Map(TODOS.map((e) => [e.id, e]));

  // o evento do capítulo para este protagonista: o exclusivo se houver, senão o geral
  function eventoPara(p, capitulo) {
    const ex = (EXCLUSIVOS[p.arquetipo] || []).find((e) => e.capitulo === capitulo);
    return ex || GERAIS.find((e) => e.capitulo === capitulo) || null;
  }
  // as opções que ESTE protagonista vê (o índice que o navegador manda é o desta lista)
  function opcoesPara(p, evento, ctx = {}) {
    const c = { tem: () => false, ...ctx };
    return evento.opcoes.filter((o) => (!o.para || o.para.includes(p.arquetipo)) && (!o.requer || o.requer(p, c)));
  }

  // ---------- a história fora da entrevista (as cenas dubladas) ----------
  // prelúdio: uma cena com escolha própria antes da entrevista do capítulo, só de um protagonista. A escolha grava o
  // estado narrativo (`narrativa`) e tem um efeito pequeno; não substitui a entrevista nem a estratégia.
  const PRELUDIOS = {
    prodigio: [
      { id: "primeira-noite", capitulo: 0, titulo: "Primeira noite",
        texto: "Véspera do primeiro treino em Barcelona. A assessora liga: a marca faz uma festa hoje e quer você lá.",
        opcoes: [
          O("Aceitar a festa", "Uma hora. Foto, sorriso, tchau.", "neutro",
            { exposicao: 6, rotina: 6, disciplina: -4, prestigio: 3 }, voz("A", { pro_festa_marca: true })),
          O("Ficar em casa", "Primeiro dia é primeiro dia.", "respeito",
            { disciplina: 6, rotina: -4 }, voz("B", { pro_festa_marca: false })),
        ] },
    ],
  };
  function preludioPara(p, capitulo) {
    const feitos = p.preludios || [];
    return (PRELUDIOS[p.arquetipo] || []).find((x) => x.capitulo === capitulo && !feitos.includes(x.id)) || null;
  }
  // callback: uma cena que volta depois, por causa de uma escolha. Vale na jornada do evento `depoisDe` (o jogo logo
  // depois da decisão) e só quando `quando` (road-voz.js) bate com o estado narrativo. A variante (qual pergunta o
  // repórter faz) sai das condições das falas no manifesto, uma só.
  const CALLBACKS = [
    { id: "pergunta-inconveniente", arquetipo: "romantico", depoisDe: "aniversario",
      quando: { chave: "resultado_ultimo_jogo", op: "==", valor: "derrota" } },
  ];
  // grava o que a escolha muda na história: valores substituem, os que terminam em _delta somam
  function gravarNarrativa(p, mudancas) {
    p.narrativa ||= {};
    for (const [k, v] of Object.entries(mudancas || {})) {
      if (!/^[a-z_][a-z0-9_]*$/.test(k)) continue;
      if (k.endsWith("_delta") && typeof v === "number") p.narrativa[k] = (p.narrativa[k] || 0) + v;
      else if (["string", "number", "boolean"].includes(typeof v)) p.narrativa[k] = v;
    }
    return p.narrativa;
  }

  // ---------- efeitos ----------
  const ATRIB = new Set(ATRIBUTOS), EIXO = new Set(Object.keys(EIXOS));
  const ESPECIAIS = new Set(["rel", "relCom", "marca", "risco", "forma", "aposta", "sorte", "manchete", "figura"]);
  // aplica um efeito ao protagonista; devolve o que precisa de contexto (rel, relCom, risco, forma, aposta, manchete)
  function aplicar(p, ef) {
    garantir(p);
    const enigma = p.arquetipo === "enigma", maquina = p.arquetipo === "maquina";
    for (const [k, v0] of Object.entries(ef || {})) {
      if (ESPECIAIS.has(k) || typeof v0 !== "number") continue;
      let v = v0;
      if (ATRIB.has(k)) {
        // blindado: o lado ruim da imprensa pesa metade no Enigma
        if (enigma && v < 0 && (k === "respeito" || k === "prestigio")) v = Math.trunc(v / 2);
        p.atributos[k] = clamp(p.atributos[k] + v, 0, 100);
      } else if (EIXO.has(k)) {
        if (maquina && k === "rotina" && v > 0) v = Math.trunc(v / 3); // o protocolo segura a noite
        p.eixos[k] = clamp(p.eixos[k] + v, 0, 100);
        if (enigma && k === "exposicao") p.eixos[k] = Math.min(p.eixos[k], 50);
      } else {
        p.medidores[k] = clamp((p.medidores[k] || 0) + v, 0, 100);
      }
    }
    if (ef?.marca && !p.marcas.includes(ef.marca)) p.marcas.push(ef.marca);
    // a evolução visual: só a figura muda (nada de número), e o texto vai para o diário
    if (ef?.figura && p.figura) mudarFigura(p, ef.figura);
    return { rel: ef?.rel || 0, relCom: ef?.relCom || null, risco: ef?.risco || 0, forma: ef?.forma || 0,
      aposta: !!ef?.aposta, manchete: ef?.manchete || "", figura: ef?.figura && p.figura ? ef.figura.texto || "" : "" };
  }
  // a sorte (resposta enigmática, desculpa) já sai resolvida: devolve o efeito final
  function resolverSorte(ef, numero) {
    if (!ef?.sorte) return { ef, resultado: null };
    const bom = numero < ef.sorte.chance, extra = bom ? ef.sorte.bom : ef.sorte.ruim;
    const { sorte, ...resto } = ef;
    const junto = { ...resto };
    for (const [k, v] of Object.entries(extra)) junto[k] = typeof v === "number" ? (junto[k] || 0) + v : v;
    return { ef: junto, resultado: bom ? "bom" : "ruim" };
  }
  // o resultado da marra (aposta) depois do jogo
  const MARRA = {
    cumpriu: { prestigio: 15, ambicao: 5, marra: 20, manchete: "{nome} prometeu e cumpriu. A marra virou lenda." },
    falhou: { prestigio: -12, respeito: -6, marra: -20, manchete: "A promessa de {nome} não saiu do papel e virou meme." },
  };

  // ---------- forma na jornada ----------
  // fica entre -2 e +2 e soma à força do clube só nesta jornada (as escolhas não decidem o placar sozinhas)
  function formaDe(p, { etapa, escolhida = 0, lesionado = false, numero = 0.5 }) {
    const motivos = [];
    let v = 0;
    const add = (n, t) => { if (n) { v += n; motivos.push((n > 0 ? "+" : "") + n + " " + t); } };
    if (lesionado) add(-2, "lesão");
    add(escolhida, "escolha da jornada");
    const m = p.medidores || {};
    if (p.arquetipo === "resiliente") {
      if ((m.tecnico ?? 50) < 30) add(-1, "no banco de Ventura");
      if (etapa === "final") add(1, "cresce em final");
    }
    if (p.arquetipo === "maquina" && (etapa === "semifinal" || etapa === "final")) {
      if ((m.jogoGrande || 0) < 25) add(-1, "o fantasma dos jogos grandes");
      else if (m.jogoGrande >= 50) add(1, "fantasma enterrado");
    }
    if (p.arquetipo === "imprevisivel" && (p.eixos?.rotina || 0) > 50) {
      add(numero < 0.33 ? -1 : numero > 0.66 ? 1 : 0, "caos");
    }
    return { valor: clamp(v, -2, 2), motivos };
  }
  // risco de lesão da jornada (escolhas + o corpo de cada um)
  function riscoDe(p, escolhido) {
    let r = escolhido || 0;
    if (p.arquetipo === "imprevisivel" && (p.eixos?.rotina || 0) > 60) r += 0.1;
    if (p.arquetipo === "romantico" && (p.eixos?.rotina || 0) > 85) r += 0.05;
    if (p.arquetipo === "maquina") r *= 0.5;
    return clamp(r, 0, 0.6);
  }

  // ---------- epílogo ----------
  function epilogoExtra(p, { campeao, finalista }) {
    const m = p.medidores || {};
    switch (p.arquetipo) {
      case "romantico":
        return campeao ? "A última dança terminou com a taça nas mãos, e com a camisa 10 pendurada no lugar certo."
          : (m.caiCai || 0) >= 50 ? "A arte ficou, mas a Europa ainda discute cada queda."
          : "Não houve taça, mas os garotos do time vão contar como ele jogava.";
      case "prodigio":
        return (m.marra || 0) >= 60 ? "Cada promessa cumprida virou capítulo. Ninguém mais duvida do garoto."
          : (m.marra || 0) <= 30 ? "A marra cobrou o preço. A próxima temporada começa com algo a provar."
          : "O mundo conheceu o garoto do bairro. O resto ainda vai ser escrito.";
      case "resiliente":
        return (m.tecnico || 0) >= 60 ? "Ventura terminou a temporada abraçado a ele."
          : (m.tecnico || 0) < 30 ? "A relação com Ventura acabou. A janela vai ferver."
          : "Ele e Ventura seguem desconfiados, mas no mesmo barco.";
      case "imprevisivel":
        return (m.vidro || 0) <= 20 ? "Ninguém mais o chama de jogador de vidro."
          : "A imprensa segue esperando a próxima lesão. Ele segue correndo.";
      case "enigma":
        return (m.decifrado || 0) >= 40 ? "A Europa finalmente entendeu quem ele é. Ou ele deixou entender."
          : "Ele terminou a temporada como começou: um mistério de fones.";
      case "maquina":
        return finalista && (m.jogoGrande || 0) >= 50 ? "O fantasma dos jogos grandes ficou para trás."
          : finalista ? "Chegou à final. A pergunta sobre jogos grandes continua no ar."
          : "O protocolo funcionou o ano todo. Faltou o jogo grande.";
      default: return "";
    }
  }

  return {
    EIXOS, ATRIBUTOS, VERSAO_FIGURA, PELES, ROSTOS, CABELOS, CORES_CABELO, BARBAS, ACESSORIOS, CHUTEIRAS, SEMBLANTES,
    COMEMORACOES, POSTURAS, PERSONAGENS, IDS, LACOS,
    GERAIS, EXCLUSIVOS, POR_ID, MARRA,
    porClube, limparFigura, mudarFigura, garantir, novoProtagonista, eventoPara, opcoesPara, aplicar, resolverSorte,
    formaDe, riscoDe, epilogoExtra,
    PRELUDIOS, CALLBACKS, preludioPara, gravarNarrativa,
  };
});
