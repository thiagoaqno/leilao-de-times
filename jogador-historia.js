// Modo Jogador: os eventos com decisão e o modo História. Entre os jogos acontece uma situação (uma entrevista, uma festa,
// uma sondagem) e o jogador escolhe o que fazer; cada escolha mexe na confiança, na fama, no dinheiro, na evolução ou na
// saúde, e deixa um traço de personalidade e, às vezes, uma marca que chama um capítulo novo mais adiante.
// No modo História (save.jogador.modo === "historia") os eventos são mais frequentes, cada temporada abre com um
// capítulo, os traços valem em campo (disciplina, ambição, carisma) e a carreira termina com um epílogo que depende do
// que o jogador escolheu. Aqui só ficam o catálogo e as contas; jogador.js decide quando chamar.
const C = require("./carreira.js").jogador;
const M = require("./jogador-mercado.js");
const Mercado = require("./public/carreira/mercado.js");
const { Motor } = C;
const ID = "eu";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TRACOS = {
  disciplina: "Disciplina", carisma: "Carisma", ambicao: "Ambição", humildade: "Humildade", lealdade: "Lealdade", coracao: "Coração",
};
const tracosVazios = () => Object.fromEntries(Object.keys(TRACOS).map((k) => [k, 0]));

// ---------- o que o evento enxerga ----------
function contexto(save) {
  const j = save.jogador, e = save.jovens[ID], clube = C.clubeDe(save, save.clube);
  const forma = j.forma.length >= 3 ? j.forma.reduce((a, b) => a + b, 0) / j.forma.length : null;
  const rival = C.elencoDe(save, save.clube).filter((x) => x.id !== ID && x.pos === j.pos).sort((a, b) => C.notaDe(save, b) - C.notaDe(save, a))[0] || null;
  return {
    save, j, clube: clube.nome, papel: (j.relatorio && j.relatorio.papel) || "banco", fama: j.fama, conf: j.confianca,
    nota: C.notaDe(save, e), idade: C.Evolucao.idadeNa(e, save.temporada), forma,
    gols: j.carreira.gols, jogos: j.carreira.jogos, temporada: save.temporada, patrimonio: j.patrimonio,
    anosContrato: j.contrato ? j.contrato.fim - save.temporada + 1 : 0, rival: rival ? rival.nome : null,
    vermelho: !!(j.relatorio && j.relatorio.vermelho),
    tem: (m) => j.marcas.includes(m), traco: (k) => j.tracos[k] || 0,
  };
}

// ---------- o catálogo ----------
// escolha: { texto, dica, efeitos, resultado }  ou  { texto, dica, sorte, bom: { efeitos, resultado }, mau: { efeitos, resultado } }
// efeitos: conf, xp, fama, grana, nota (permanente), lesao (jogos), tracos { traço: n }, marcas [], tira [], pacto
// inicio: o evento abre a temporada (modo História); unico: só acontece uma vez na carreira
const EVENTOS = [
  // ----- aberturas de temporada -----
  { id: "chegada", titulo: "Primeiro dia no clube", inicio: true, unico: true, peso: 20, quando: (c) => c.temporada === 1,
    texto: (c) => `Você chega ao CT do ${c.clube}. Os veteranos param o treino para ver o garoto novo. Como você se apresenta?`,
    escolhas: [
      { texto: "Humilde: cumprimento todo mundo e peço conselhos", efeitos: { conf: 3, tracos: { humildade: 1 }, marcas: ["humilde"] }, resultado: "Os veteranos gostaram da postura e prometeram ajudar." },
      { texto: "Confiante: digo que vim para ser titular", efeitos: { conf: -2, fama: 2, tracos: { ambicao: 1, carisma: 1 }, marcas: ["confiante"] }, resultado: "A frase rodou o vestiário. Tem quem torça o nariz, tem quem goste." },
      { texto: "Discreto: treino forte e deixo a bola falar", efeitos: { xp: 30, tracos: { disciplina: 1 } }, resultado: "Ninguém soube o que dizer, mas todos viram o seu ritmo no treino." },
    ] },
  { id: "meta", titulo: "A meta do ano", inicio: true, peso: 3, quando: (c) => c.temporada > 1,
    texto: () => "A diretoria pergunta qual é a sua meta pessoal para esta temporada.",
    escolhas: [
      { texto: "Ousada: cumprir os três objetivos do ano", dica: "Cumpriu tudo: fama e evolução. Falhou: perde confiança.", efeitos: { tracos: { ambicao: 1 }, pacto: "ousada" }, resultado: "Meta anunciada. Agora é cumprir." },
      { texto: "Segura: ir jogo a jogo, sem pressão", efeitos: { conf: 2, tracos: { humildade: 1 }, pacto: "segura" }, resultado: "Sem promessas. O treinador gostou da cabeça fria." },
    ] },
  { id: "mentor-fim", titulo: "A despedida do veterano", inicio: true, peso: 12, quando: (c) => c.tem("mentor") && !c.tem("mentor-fim"),
    texto: () => "O veterano que te ensinou tudo anuncia a aposentadoria e pede para falar com você antes da coletiva.",
    escolhas: [
      { texto: "Receber a camisa dele com emoção", efeitos: { fama: 4, xp: 80, tracos: { lealdade: 1, coracao: 1 }, marcas: ["mentor-fim"] }, resultado: "A imagem rodou o país. Você carrega o que ele deixou." },
      { texto: "Agradecer e voltar ao foco", efeitos: { conf: 2, xp: 40, tracos: { disciplina: 1 }, marcas: ["mentor-fim"] }, resultado: "Ele sorriu: era isso que queria ouvir de você." },
    ] },
  { id: "homenagem", titulo: "A cidade te homenageia", inicio: true, peso: 12, quando: (c) => c.tem("projeto-social") && !c.tem("homenagem"),
    texto: () => "A prefeitura quer homenagear o seu projeto social com uma cerimônia na quadra da comunidade.",
    escolhas: [
      { texto: "Ir à cerimônia e falar com a garotada", efeitos: { fama: 6, conf: 3, tracos: { coracao: 1 }, marcas: ["homenagem"] }, resultado: "Foi uma noite que você não vai esquecer." },
      { texto: "Mandar um vídeo e ficar no CT", efeitos: { xp: 40, tracos: { disciplina: 1 }, marcas: ["homenagem"] }, resultado: "A homenagem aconteceu sem você, mas o treino rendeu." },
    ] },
  { id: "diretoria-cobra", titulo: "A diretoria quer conversar", inicio: true, peso: 12, quando: (c) => c.tem("quer-sair"),
    texto: () => "O que vazou sobre o seu interesse em outro clube chegou à diretoria. Chamaram você para uma reunião.",
    escolhas: [
      { texto: "Pedir desculpas e reafirmar o compromisso", efeitos: { conf: 6, tracos: { humildade: 1, lealdade: 1 }, tira: ["quer-sair"] }, resultado: "A diretoria deu o assunto por encerrado." },
      { texto: "Manter a postura: quero crescer", efeitos: { fama: 3, conf: -6, tracos: { ambicao: 1 }, tira: ["quer-sair"], marcas: ["rebelde"] }, resultado: "Você saiu da sala sem se curvar. O clima ficou pesado." },
    ] },
  { id: "campanha", titulo: "A campanha do patrocinador", inicio: true, peso: 10, quando: (c) => c.tem("patrocinio") && !c.tem("campanha"),
    texto: () => "O patrocinador quer gravar a campanha da temporada na semana do clássico. A agenda aperta.",
    escolhas: [
      { texto: "Gravar tudo, sem reclamar", efeitos: { grana: 150000, fama: 3, conf: -3, tracos: { carisma: 1 }, marcas: ["campanha"] }, resultado: "A campanha ficou linda. O treinador, nem tanto." },
      { texto: "Gravar só um dia e treinar o resto", efeitos: { grana: 60000, conf: 2, tracos: { disciplina: 1 }, marcas: ["campanha"] }, resultado: "Um meio-termo que agradou a todo mundo." },
    ] },

  // ----- entre os jogos -----
  { id: "entrevista", titulo: "Repórter na saída do treino", peso: 2, quando: (c) => c.fama >= 3 && c.papel === "titular",
    texto: () => "Um repórter pergunta o que você acha das mudanças táticas do treinador. O microfone está ligado.",
    escolhas: [
      { texto: "Elogiar o treinador", efeitos: { conf: 3, tracos: { humildade: 1 } }, resultado: "A resposta saiu em todos os sites. O treinador agradeceu." },
      { texto: "Dar uma alfinetada", dica: "Mais fama, menos confiança.", efeitos: { fama: 6, conf: -6, tracos: { carisma: 1, ambicao: 1 }, marcas: ["polemico"] }, resultado: "Virou manchete. O treinador não achou graça." },
      { texto: "Dizer que não vai comentar", efeitos: { xp: 10 }, resultado: "Sem polêmica. Sem manchete." },
    ] },
  { id: "balada", titulo: "Convite para a festa", peso: 2, quando: (c) => c.idade <= 24,
    texto: () => "Os amigos chamam você para uma festa na véspera de um jogo importante.",
    escolhas: [
      { texto: "Ir e aproveitar", dica: "Pode sair caro.", sorte: 0.5,
        bom: { efeitos: { fama: 3, conf: 1 }, resultado: "A noite foi boa e ninguém ficou sabendo." },
        mau: { efeitos: { conf: -7, tracos: { disciplina: -1 } }, resultado: "Você chegou destruído ao treino e a foto da festa vazou." } },
      { texto: "Ficar em casa descansando", efeitos: { conf: 2, tracos: { disciplina: 1 } }, resultado: "Dormiu cedo. Acordou com a perna nova." },
    ] },
  { id: "treino-extra", titulo: "Treino extra", peso: 2, quando: () => true,
    texto: () => "O preparador físico oferece um treino extra à tarde, só para quem quiser.",
    escolhas: [
      { texto: "Topar", dica: "Evolui mais, mas há risco de lesão.", sorte: 0.8,
        bom: { efeitos: { xp: 70, tracos: { disciplina: 1 } }, resultado: "Saiu cansado, mas sentindo que evoluiu." },
        mau: { efeitos: { lesao: 2, xp: 20 }, resultado: "Exagerou na dose e sentiu a coxa. Vai ficar uns jogos fora." } },
      { texto: "Recusar e descansar", efeitos: { xp: 10 }, resultado: "Poupou o corpo para o jogo." },
    ] },
  { id: "mentor", titulo: "Um veterano oferece ajuda", peso: 2, quando: (c) => (c.papel === "banco" || c.idade <= 21) && !c.tem("mentor") && !c.tem("mentor-fim"),
    texto: (c) => `Um veterano do ${c.clube} que já jogou na sua posição oferece ensinar o que aprendeu em anos de carreira.`,
    escolhas: [
      { texto: "Aceitar e ouvir tudo", efeitos: { xp: 80, conf: 2, tracos: { humildade: 1 }, marcas: ["mentor"] }, resultado: "As conversas de fim de treino viraram sua melhor aula." },
      { texto: "Agradecer, mas seguir o meu caminho", efeitos: { conf: -1, tracos: { ambicao: 1 } }, resultado: "Ele deu de ombros: cada um aprende do seu jeito." },
    ] },
  { id: "torcida-cobra", titulo: "A torcida pega no seu pé", peso: 3, quando: (c) => c.forma !== null && c.forma < 6.2,
    texto: () => "A má fase virou assunto nas redes: a torcida cobra a sua vaga e os memes não perdoam.",
    escolhas: [
      { texto: "Responder nas redes", efeitos: { fama: 4, conf: -4, tracos: { carisma: 1 } }, resultado: "A resposta viralizou, para o bem e para o mal." },
      { texto: "Ficar em silêncio e trabalhar", efeitos: { conf: 3, xp: 30, tracos: { disciplina: 1 } }, resultado: "No treino seguinte, o treinador notou a sua cara fechada de foco." },
    ] },
  { id: "patrocinio", titulo: "Proposta de patrocínio", peso: 2, quando: (c) => c.fama >= 8 && !c.tem("patrocinio"),
    texto: () => "Uma marca de chuteiras quer você como garoto-propaganda, com contrato de um ano.",
    escolhas: [
      { texto: "Assinar o contrato", efeitos: { grana: 400000, fama: 3, marcas: ["patrocinio"] }, resultado: "O dinheiro entrou e o seu rosto está em todo outdoor." },
      { texto: "Recusar: quero me concentrar em jogar", efeitos: { conf: 3, tracos: { disciplina: 1 } }, resultado: "O treinador ficou sabendo e gostou." },
    ] },
  { id: "dor", titulo: "Dor antes do jogo grande", peso: 2, quando: (c) => c.jogos >= 5 && c.papel !== "lesionado",
    texto: () => "Você sente o joelho antes de um jogo importante. Ninguém percebeu ainda.",
    escolhas: [
      { texto: "Esconder e jogar", dica: "Pode virar herói ou se machucar.", sorte: 0.55,
        bom: { efeitos: { conf: 5, fama: 2, tracos: { ambicao: 1 } }, resultado: "Você segurou a dor e brilhou em campo." },
        mau: { efeitos: { lesao: 4, conf: -2 }, resultado: "A dor piorou no primeiro tempo e você pediu para sair." } },
      { texto: "Avisar o departamento médico", efeitos: { conf: -1, xp: 20, tracos: { humildade: 1 } }, resultado: "Fez fisioterapia, ficou de fora por precaução e voltou inteiro." },
    ] },
  { id: "projeto-social", titulo: "Convite para um projeto social", peso: 2, quando: (c) => c.fama >= 5 && c.patrimonio >= 100000 && !c.tem("projeto-social"),
    texto: () => "Uma escolinha de futebol de comunidade da cidade pede o seu apoio para continuar funcionando.",
    escolhas: [
      { texto: "Abraçar o projeto", dica: "Custa dinheiro e tempo.", efeitos: { grana: -60000, fama: 5, tracos: { coracao: 1 }, marcas: ["projeto-social"] }, resultado: "A garotada te recebeu com uma faixa na quadra." },
      { texto: "Fazer só uma doação", efeitos: { grana: -20000, fama: 1 }, resultado: "A escolinha agradeceu o gesto." },
      { texto: "Agradecer e recusar", efeitos: {}, resultado: "O convite passou." },
    ] },
  { id: "vestiario", titulo: "Briga no vestiário", peso: 2, quando: (c) => c.papel === "titular" && c.jogos >= 8,
    texto: () => "Dois companheiros discutem feio depois do treino e o clima azeda. Todo mundo olha para você.",
    escolhas: [
      { texto: "Apaziguar os dois", efeitos: { conf: 3, tracos: { carisma: 1, lealdade: 1 } }, resultado: "A conversa funcionou e o grupo ficou mais unido." },
      { texto: "Ficar do lado do amigo", efeitos: { conf: -3, tracos: { lealdade: 2 } }, resultado: "Você bancou o amigo. O outro nunca esqueceu." },
      { texto: "Sair de fininho", efeitos: { xp: 10 }, resultado: "Não era problema seu, mas o clima continuou ruim." },
    ] },
  { id: "sondagem", titulo: "Um clube grande sondou você", peso: 2, quando: (c) => c.fama >= 12 && !c.tem("quer-sair"),
    texto: () => "O seu empresário avisa: um clube grande perguntou pelo seu preço. Ainda é segredo.",
    escolhas: [
      { texto: "Deixar vazar para a imprensa", dica: "Fama agora, atrito depois.", efeitos: { fama: 5, conf: -5, tracos: { ambicao: 1 }, marcas: ["quer-sair"] }, resultado: "Todo mundo só falou disso na semana. O clima no CT ficou estranho." },
      { texto: "Negar e reforçar o compromisso", efeitos: { conf: 4, tracos: { lealdade: 1 } }, resultado: "A torcida adorou a declaração de amor ao clube." },
    ] },
  { id: "viral", titulo: "O seu gol viralizou", peso: 1.5, quando: (c) => c.gols >= 3,
    texto: () => "Um lance seu virou meme e foi visto por milhões. Todo mundo quer um pedaço dessa fama.",
    escolhas: [
      { texto: "Lançar uma camisa com a comemoração", efeitos: { grana: 120000, fama: 4, tracos: { carisma: 1 } }, resultado: "A camisa esgotou em um dia." },
      { texto: "Manter o foco e seguir treinando", efeitos: { xp: 50, tracos: { disciplina: 1 } }, resultado: "O assunto passou e o seu jogo só melhorou." },
    ] },
  { id: "estudos", titulo: "Faculdade a distância", peso: 1.5, quando: (c) => c.idade <= 21 && !c.tem("estudioso"),
    texto: () => "O clube oferece um curso de educação física a distância para os mais novos. Dá trabalho.",
    escolhas: [
      { texto: "Estudar nas horas vagas", efeitos: { xp: 20, tracos: { humildade: 1, disciplina: 1 }, marcas: ["estudioso"] }, resultado: "Cansa, mas você ganhou uma visão diferente do jogo." },
      { texto: "Focar só no futebol", efeitos: { xp: 60, tracos: { ambicao: 1 } }, resultado: "Mais tempo para treinar e descansar." },
    ] },
  { id: "familia", titulo: "A família pede ajuda", peso: 1.5, quando: (c) => c.patrimonio >= 200000,
    texto: () => "Um parente próximo passa por apuros e pede uma ajuda financeira que pesa no seu bolso.",
    escolhas: [
      { texto: "Ajudar", efeitos: { grana: -150000, conf: 2, tracos: { coracao: 1 } }, resultado: "Tirou um peso das costas da família." },
      { texto: "Explicar que está no começo", efeitos: { conf: -2 }, resultado: "A conversa foi difícil e o assunto ficou na cabeça." },
    ] },
  { id: "expulsao", titulo: "A expulsão polêmica", peso: 6, quando: (c) => c.vermelho,
    texto: () => "Você foi expulso e a torcida está dividida: uns dizem que foi injusto, outros que foi descontrole.",
    escolhas: [
      { texto: "Pedir desculpas publicamente", efeitos: { conf: 2, tracos: { humildade: 1 } }, resultado: "O pedido de desculpas acalmou os ânimos." },
      { texto: "Reclamar da arbitragem", efeitos: { fama: 3, conf: -4, tracos: { carisma: 1 } }, resultado: "A reclamação rendeu manchete e uma bronca do treinador." },
    ] },
  { id: "selecao-radar", titulo: "O olheiro da seleção", peso: 2, quando: (c) => c.fama >= 6 && c.idade <= 24,
    texto: () => "Um olheiro da seleção foi visto na arquibancada. Dizem que vem ver você de perto.",
    escolhas: [
      { texto: "Treinar mais forte a semana toda", efeitos: { xp: 40, fama: 2, tracos: { disciplina: 1 } }, resultado: "Você jogou o fino e o olheiro saiu anotando." },
      { texto: "Não mudar nada", efeitos: { conf: 1 }, resultado: "Jogou como sempre, sem pressão." },
    ] },
  { id: "rival", titulo: "O rival da posição", peso: 2, quando: (c) => c.papel === "banco" && !!c.rival,
    texto: (c) => `${c.rival} é o dono da vaga na sua posição. No fim do treino, ele se aproxima e puxa assunto.`,
    escolhas: [
      { texto: "Trocar ideia e aprender com ele", efeitos: { xp: 40, conf: 2, tracos: { humildade: 1 } }, resultado: "Vocês viraram parceiros de treino." },
      { texto: "Provocar: a vaga vai ser minha", efeitos: { fama: 1, conf: -3, tracos: { ambicao: 1 } }, resultado: "O clima entre vocês esfriou na hora." },
    ] },
  { id: "contrato-cedo", titulo: "Renovação antecipada", peso: 2, quando: (c) => c.anosContrato <= 1 && c.conf >= 60,
    texto: () => "A diretoria quer renovar o seu contrato já, antes de qualquer outro clube aparecer.",
    escolhas: [
      { texto: "Assinar agora e ganhar as luvas", efeitos: { grana: 100000, conf: 3, tracos: { lealdade: 1 } }, resultado: "Contrato novo e a confiança da diretoria." },
      { texto: "Esperar para ver outras propostas", efeitos: { fama: 2, conf: -2, tracos: { ambicao: 1 } }, resultado: "A diretoria não gostou, mas respeitou." },
    ] },
  { id: "documentario", titulo: "Documentário sobre você", peso: 1, quando: (c) => c.fama >= 15,
    texto: () => "Uma produtora quer fazer um documentário sobre a sua trajetória, com câmeras no seu dia a dia.",
    escolhas: [
      { texto: "Topar", efeitos: { fama: 6, grana: 300000, conf: -2, tracos: { carisma: 1 } }, resultado: "O documentário foi sucesso, mas distraiu um pouco." },
      { texto: "Recusar: ainda não é hora", efeitos: { tracos: { humildade: 1, disciplina: 1 }, xp: 30 }, resultado: "Você preferiu ter o que contar depois." },
    ] },
  { id: "fa-mirim", titulo: "O pequeno fã", peso: 1.5, quando: () => true,
    texto: () => "Um menino de camisa do clube espera na saída do CT há horas só para ver você.",
    escolhas: [
      { texto: "Parar, tirar foto e dar a camisa", efeitos: { fama: 2, tracos: { coracao: 1 } }, resultado: "O sorriso dele valeu o atraso." },
      { texto: "Acenar e seguir para casa", efeitos: { xp: 10 }, resultado: "O dia estava corrido." },
    ] },
  { id: "treinador-conversa", titulo: "Conversa com o treinador", peso: 3, quando: (c) => c.papel === "banco" && c.conf < 40,
    texto: () => "O treinador chama você para uma conversa franca sobre o seu lugar no time.",
    escolhas: [
      { texto: "Pedir mais chances, com respeito", efeitos: { conf: 4, tracos: { humildade: 1 } }, resultado: "Ele disse que vai observar você mais de perto." },
      { texto: "Cobrar publicamente depois", efeitos: { fama: 3, conf: -5, tracos: { ambicao: 1 }, marcas: ["polemico"] }, resultado: "A cobrança vazou. Agora todo mundo conhece a sua versão." },
      { texto: "Aceitar e treinar mais", efeitos: { xp: 30, conf: 1, tracos: { disciplina: 1 } }, resultado: "Você voltou ao treino sem reclamar." },
    ] },
];
const PORID = Object.fromEntries(EVENTOS.map((ev) => [ev.id, ev]));

// ---------- sortear e montar ----------
function escolher(lista, r) {
  const total = lista.reduce((s, ev) => s + (ev.peso || 1), 0);
  let x = r() * total;
  for (const ev of lista) { x -= ev.peso || 1; if (x <= 0) return ev; }
  return lista[lista.length - 1] || null;
}
const montar = (ev, c) => ({ id: ev.id, titulo: ev.titulo, inicio: !!ev.inicio, texto: ev.texto(c), escolhas: ev.escolhas.map((x) => ({ texto: x.texto, dica: x.dica || null })) });
function disponiveis(c, inicio) {
  const j = c.j, recentes = j.vistos.slice(-5);
  return EVENTOS.filter((ev) => !!ev.inicio === inicio && ev.quando(c) && !recentes.includes(ev.id) && !(ev.unico && j.vistos.includes(ev.id)));
}
// depois de um jogo: com alguma chance (maior no modo História) e nunca dois seguidos, acontece um evento
function talvezEvento(save) {
  const j = save.jogador;
  if (j.evento || save.rodada - (j.ultimoEvento ?? -9) < 3) return null;
  const r = Motor.sorteDe(`ev:${save.semente}:${save.temporada}:${save.rodada}`);
  if (r() > (j.modo === "historia" ? 0.3 : 0.14)) return null;
  const c = contexto(save), ev = escolher(disponiveis(c, false), r);
  if (!ev) return null;
  j.ultimoEvento = save.rodada;
  return (j.evento = montar(ev, c));
}
// no começo da temporada (só no modo História): o capítulo do ano
function abrirTemporada(save) {
  const j = save.jogador;
  if (j.modo !== "historia" || j.evento) return null;
  const c = contexto(save), r = Motor.sorteDe(`cap:${save.semente}:${save.temporada}`), ev = escolher(disponiveis(c, true), r);
  if (!ev) return null;
  j.ultimoEvento = save.rodada;
  return (j.evento = montar(ev, c));
}

// ---------- aplicar a escolha ----------
const MARCA = { conf: "Confiança", xp: "Evolução", fama: "Fama", nota: "Nota geral" };
function aplicar(save, ef) {
  const j = save.jogador, chips = [];
  const soma = (rotulo, v, txt) => chips.push({ rotulo, bom: v >= 0, texto: txt });
  if (ef.conf) { j.confianca = clamp(Math.round(j.confianca + ef.conf), 5, 100); soma(MARCA.conf, ef.conf, `${MARCA.conf} ${ef.conf > 0 ? "+" : ""}${ef.conf}`); }
  if (ef.xp) { j.xp += ef.xp; soma(MARCA.xp, ef.xp, `${MARCA.xp} +${ef.xp}`); }
  if (ef.fama) { M.ganharFama(j, ef.fama); soma(MARCA.fama, ef.fama, `${MARCA.fama} ${ef.fama > 0 ? "+" : ""}${ef.fama}`); }
  if (ef.grana) { j.patrimonio = Math.max(0, j.patrimonio + ef.grana); soma("Patrimônio", ef.grana, `Patrimônio ${ef.grana > 0 ? "+" : "−"}${Mercado.dinheiro(Math.abs(ef.grana))}`); }
  if (ef.nota) { save.bonusNota[ID] = (save.bonusNota[ID] || 0) + ef.nota; soma(MARCA.nota, ef.nota, `${MARCA.nota} ${ef.nota > 0 ? "+" : ""}${ef.nota}`); }
  if (ef.lesao) { save.lesoes[ID] = Math.max(save.lesoes[ID] || 0, ef.lesao); soma("Lesão", -1, `Fora por ${ef.lesao} jogos`); }
  for (const [k, v] of Object.entries(ef.tracos || {})) { j.tracos[k] = clamp((j.tracos[k] || 0) + v, 0, 10); soma(TRACOS[k], v, `${TRACOS[k]} ${v > 0 ? "+" : ""}${v}`); }
  for (const m of ef.marcas || []) if (!j.marcas.includes(m)) j.marcas.push(m);
  for (const m of ef.tira || []) j.marcas = j.marcas.filter((x) => x !== m);
  if (ef.pacto) j.pacto = { tipo: ef.pacto, temporada: save.temporada };
  return chips;
}
// responde o evento aberto: devolve o que aconteceu (texto e efeitos) ou uma mensagem de erro (string)
function responder(save, indice, diario) {
  const j = save.jogador, pend = j.evento;
  if (!pend) return "Não há evento esperando resposta.";
  const ev = PORID[pend.id], esc = ev && ev.escolhas[indice];
  if (!esc) return "Escolha uma das opções.";
  let sorte = null, efeitos = esc.efeitos, resultado = esc.resultado;
  if (esc.sorte !== undefined) {
    const deu = Motor.sorteDe(`sorte:${save.semente}:${save.temporada}:${save.rodada}:${ev.id}`)() < esc.sorte;
    sorte = deu; ({ efeitos, resultado } = deu ? esc.bom : esc.mau);
  }
  const chips = aplicar(save, efeitos || {});
  j.vistos.push(ev.id); if (j.vistos.length > 40) j.vistos.shift();
  j.livro.unshift({ temporada: save.temporada, titulo: ev.titulo, escolha: esc.texto, resultado, sorte });
  j.livro.length = Math.min(j.livro.length, 40);
  diario(save, `${ev.titulo}: ${esc.texto.replace(/[:.]$/, "")}.`);
  j.evento = null;
  return { resultado: { titulo: ev.titulo, escolha: esc.texto, texto: resultado, sorte, chips } };
}

// ---------- o que os traços fazem em campo (só no modo História) ----------
const historia = (j) => j.modo === "historia";
const bonusDeTreino = (j) => (historia(j) ? Math.min(0.6, (j.tracos.disciplina || 0) * 0.15) : 0);
const bonusDeXp = (j) => (historia(j) && (j.tracos.ambicao || 0) >= 2 ? 1 : 0);
const bonusDeFama = (j) => (historia(j) ? (j.tracos.carisma || 0) * 0.8 : 0);
// a meta do ano: se foi ousada e todos os objetivos saíram, recompensa; se não, a diretoria cobra
function fecharPacto(save, cumpridos, total, diario) {
  const j = save.jogador, p = j.pacto;
  if (!p || p.temporada !== save.temporada) return null;
  j.pacto = null;
  if (p.tipo !== "ousada") return null;
  if (cumpridos >= total) { M.ganharFama(j, 5); j.xp += 120; diario(save, "Cumpriu a meta ousada do ano: fama e evolução extras."); return "Meta ousada cumprida: fama +5 e evolução +120."; }
  j.confianca = clamp(j.confianca - 5, 5, 100);
  diario(save, "Não cumpriu a meta ousada do ano. A diretoria cobrou.");
  return "Meta ousada não cumprida: confiança −5.";
}

// ---------- o epílogo ----------
const PERFIS = {
  disciplina: ["O Profissional", "Treinou como poucos e fez da rotina uma arma."],
  carisma: ["O Showman", "Dentro e fora de campo, onde ele estava o público olhava."],
  ambicao: ["O Fominha", "Nunca se contentou com o que tinha: queria sempre mais."],
  humildade: ["O Operário", "Aprendeu com todos e nunca se achou maior que o time."],
  lealdade: ["O Capitão", "Fez do vestiário uma segunda família e jamais virou as costas a ela."],
  coracao: ["O Craque do Povo", "Será lembrado pelos gols, mas mais ainda pelo que fez fora do campo."],
};
const LINHAS = {
  mentor: "Aprendeu com um veterano o que nenhum treino ensina.",
  "mentor-fim": "Recebeu a camisa do mestre e levou o legado adiante.",
  "projeto-social": "Abriu uma escolinha de comunidade e mudou o futuro de muita gente.",
  homenagem: "A cidade lhe deu uma homenagem pelo que fez fora de campo.",
  patrocinio: "Virou garoto-propaganda e rosto de campanha.",
  polemico: "Nunca fugiu de uma polêmica, e a imprensa agradeceu.",
  rebelde: "Bateu de frente com a diretoria quando precisou.",
  estudioso: "Estudou durante a carreira e deixou o futebol com a vida preparada.",
  confiante: "Chegou dizendo que seria titular e fez questão de provar.",
  humilde: "Chegou de cabeça baixa e saiu de cabeça erguida.",
};
function epilogo(save) {
  const j = save.jogador, ordem = Object.entries(j.tracos).sort((a, b) => b[1] - a[1]);
  const [chave, valor] = ordem[0];
  const [titulo, frase] = valor > 0 ? PERFIS[chave] : ["O Jogador de Pés no Chão", "Fez a carreira sem alarde, jogo a jogo."];
  const clubes = new Set(j.historico.map((t) => t.clube));
  const linhas = [frase];
  if (clubes.size === 1 && j.historico.length >= 3) linhas.push("Homem de um clube só: vestiu a mesma camisa do começo ao fim.");
  else if (clubes.size >= 4) linhas.push(`Rodou o mundo: defendeu ${clubes.size} clubes diferentes.`);
  for (const m of j.marcas) if (LINHAS[m]) linhas.push(LINHAS[m]);
  if (j.premios.length) linhas.push(`Levou ${j.premios.length} prêmio${j.premios.length > 1 ? "s" : ""} individual${j.premios.length > 1 ? "is" : ""} para casa.`);
  return { titulo, linhas, tracos: Object.entries(j.tracos).map(([k, v]) => ({ id: k, nome: TRACOS[k], valor: v })) };
}

// o que o navegador recebe
const visao = (save) => {
  const j = save.jogador;
  return {
    modo: j.modo, evento: j.evento, livro: j.livro.slice(0, 12),
    perfil: historia(j) ? Object.entries(j.tracos).map(([k, v]) => ({ id: k, nome: TRACOS[k], valor: v })) : null,
    marcas: historia(j) ? j.marcas : [], pacto: j.pacto && j.pacto.temporada === save.temporada ? j.pacto.tipo : null,
  };
};

module.exports = { EVENTOS, TRACOS, tracosVazios, talvezEvento, abrirTemporada, responder, epilogo, visao, bonusDeTreino, bonusDeXp, bonusDeFama, fecharPacto, historia, contexto };
