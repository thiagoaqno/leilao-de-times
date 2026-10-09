// Carreira de Treinador: o feed de notícias (com cara de Instagram). Cada post tem o perfil que publica (um clube ou o
// @galeranews), a "receita" da arte em pixel-art (arte.cena e o que a cena precisa: jogador, clubes, placar...), o
// texto, as curtidas e uns comentários de torcedor. A arte é desenhada no navegador (public/carreira/feed.js); aqui só
// sai a receita. Tudo sorteado com a semente da carreira: recarregar mostra o mesmo feed.
const Motor = require("./public/carreira/motor.js");
const Mercado = require("./public/carreira/mercado.js");
const Temporada = require("./public/carreira/temporada.js");

const { dinheiro } = Mercado;
const MAX = 60;
const sorteio = (r, lista) => lista[Math.floor(r() * lista.length)];

// os torcedores que comentam (apelidos inventados)
const PERFIS = ["raiz_da_arquibancada", "ze_do_radinho", "tia_do_pastel", "corneteiro_oficial", "camisa12_sempre", "vovo_boleira", "geral_lotada",
  "olheiro_de_sofa", "mae_do_lateral", "fominha_fc", "radio_poste", "bandeirao_7", "sofa_tatico", "chuteira_furada", "pipoqueiro_da_vila"];
// os comentários de cada humor (sem palavrão)
const COMENTARIOS = {
  bom: ["VAMOOOO", "que fase!", "esse time é diferente", "eu sempre acreditei", "PRA CIMA DELES", "chora, rival", "hoje tem festa", "craque demais", "obrigado, professor"],
  ruim: ["tá difícil...", "cadê a raça?", "assim não dá", "professor, acorda", "vende logo esse perna de pau", "eu desisto (até domingo)", "vergonha", "precisamos de reforço"],
  mercado: ["contrata logo!", "esse vem de graça?", "melhor que o titular", "vendeu barato", "ninguém pediu isso", "quanto custou??", "boa diretoria", "aposta boa"],
  neutro: ["kkkkk", "interessante", "olha isso", "eita", "tamo junto", "fonte?", "marca o amigo que...", "isso aí"],
};

function postar(save, p) {
  if (!save.feed) save.feed = [];
  const id = `${save.temporada}-${save.rodada}-${p.tipo}-${save.feed.length}-${(p.texto || "").length}`;
  const r = Motor.sorteDe(`feed:${save.semente}:${id}`);
  const humor = p.humor || "neutro";
  const comentarios = Array.from({ length: 2 + Math.floor(r() * 2) }, () => [sorteio(r, PERFIS), sorteio(r, COMENTARIOS[humor] || COMENTARIOS.neutro)]);
  const curtidas = Math.round((p.galeranews ? 9000 : 1500) * (0.4 + r() * 1.6) * (p.peso || 1));
  save.feed.unshift({ id, rodada: save.rodada, temporada: save.temporada, tipo: p.tipo, perfil: p.perfil || "galeranews", arte: p.arte, texto: p.texto, humor, curtidas, comentarios });
  if (save.feed.length > MAX) save.feed.length = MAX;
}

// uma transferência (sua ou da IA) vira post do clube que comprou
function transferencia(save, t, c) {
  const j = c.jogadorDe(save, t.jogador); if (!j) return;
  const de = c.clubeDe(save, t.de), para = c.clubeDe(save, t.para), meu = t.para === save.clube || t.de === save.clube;
  // na carreira em grupo a notícia é uma só, igual para todos os técnicos (o mesmo texto, perfil e arte), de quem for o negócio
  if (save.outrosHumanos) {
    const p = { tipo: "contratacao", perfil: t.para, humor: "mercado", peso: 1.5, arte: { cena: "contratacao", jogador: t.jogador, clube: t.para },
      texto: `CHEGOU! ${j.nome} é do ${para.nome}. Veio do ${de.nome} por ${dinheiro(t.valor)}${t.parcelado ? " (parcelado)" : ""}.${t.lucro != null ? ` O ${de.nome} ${t.lucro >= 0 ? "lucrou" : "perdeu"} ${dinheiro(Math.abs(t.lucro))} no negócio.` : ""}` };
    postar(save, p);
    for (const outro of save.outrosHumanos()) postar(outro, p);
    return;
  }
  if (t.para === save.clube) postar(save, { tipo: "contratacao", perfil: t.para, humor: "mercado", peso: 1.5, arte: { cena: "contratacao", jogador: t.jogador, clube: t.para },
    texto: `CHEGOU! ${j.nome} é do ${para.nome}. Veio do ${de.nome} por ${dinheiro(t.valor)}${t.parcelado ? " (parcelado)" : ""}. Bem-vindo, craque!` });
  else postar(save, { tipo: "venda", perfil: meu ? "galeranews" : t.para, galeranews: meu, humor: "mercado", arte: { cena: "aperto", jogador: t.jogador, de: t.de, para: t.para, valor: t.valor },
    texto: `${j.nome} deixa o ${de.nome} e assina com o ${para.nome} por ${dinheiro(t.valor)}.${t.lucro != null ? ` O ${de.nome} ${t.lucro >= 0 ? "lucrou" : "perdeu"} ${dinheiro(Math.abs(t.lucro))} no negócio.` : ""}` });
}

// uma troca entre dois técnicos da sala: a mesma notícia no feed de todos (quem é de quem, o que foi e o dinheiro)
function troca(save, t, c) {
  const a = c.clubeDe(save, t.de), b = c.clubeDe(save, t.para), nomes = (ids) => ids.map((pid) => c.jogadorDe(save, pid).nome).join(", ");
  const dou = t.dou.length ? nomes(t.dou) : "ninguém", recebo = t.recebo.length ? nomes(t.recebo) : "ninguém";
  const grana = t.dinheiro ? ` e mais ${dinheiro(Math.abs(t.dinheiro))} do ${t.dinheiro > 0 ? a.nome : b.nome}` : "";
  const p = { tipo: "troca", perfil: "galeranews", galeranews: true, humor: "mercado", peso: 1.5,
    arte: { cena: "aperto", jogador: (t.dou[0] || t.recebo[0]), de: t.de, para: t.para, valor: Math.abs(t.dinheiro) },
    texto: `TROCA FECHADA! O ${a.nome} manda ${dou} para o ${b.nome} e recebe ${recebo}${grana}.` };
  postar(save, p);
  if (save.outrosHumanos) for (const outro of save.outrosHumanos()) postar(outro, p);
}

// a cena de cada evento do catálogo (pelo id; os outros, pelo grupo)
const CENA_EVENTO = {
  lesao: "lesao", acidente: "lesao", estiramento: "lesao", "volta-antes": "lesao", fisioterapia: "lesao", virose: "lesao",
  noitada: "balada", "jogo-cartas": "balada", protesto: "protesto", "invasao-ct": "protesto", corneta: "protesto", festa: "festa", mosaico: "festa", bandeirao: "festa",
  selecao: "selecao", "premio-mes": "trofeu", "tecnico-mes": "trofeu", "promessa-titulo": "trofeu", pai: "bebe", casamento: "casamento", aniversario: "casamento",
  "carro-novo": "carro", pet: "cachorro", "video-viral": "celular", influencer: "celular", podcast: "imprensa", chuva: "chuva", calor: "sol",
  patrocinio: "contrato", bet: "contrato", "acordo-tv": "contrato", "premio-tv": "contrato", "presidente-reforco": "contrato", aumento: "contrato",
  olheiro: "olheiro", "teste-gringo": "olheiro", empresario: "contrato", aeroporto: "aviao", saudade: "aviao", intercambio: "aviao", altitude: "aviao",
  arbitro: "cartao", "rival-desfalque": "estadio", "estadio-lotado": "festa", "portoes-fechados": "estadio", gramado: "estadio", "show-estadio": "estadio",
};
const CENA_GRUPO = { vestiario: "vestiario", torcida: "torcida", imprensa: "imprensa", dinheiro: "contrato", treino: "treino", mercado: "olheiro", jogo: "estadio", pessoal: "vestiario", comissao: "prancheta" };

// O que acontece entre dois jogos também vira notícia. O calendário antigo e o mundial chamam a mesma função para
// não deixar os eventos aleatórios presos só na caixa de entrada.
function entreRodadas(save, { novos, transferencias, ajudas: c }) {
  const meu = save.clube, clube = c.clubeDe(save, meu);
  // (na sala, o negócio de qualquer técnico já foi para o feed de todos na hora: só entram os do computador)
  for (const t of transferencias) if (t.de !== meu && t.para !== meu && !(save.humanoDe && (save.humanoDe(t.de) || save.humanoDe(t.para)))) transferencia(save, t, c);
  for (const e of novos) {
    if (e.def) {
      const cena = CENA_EVENTO[e.def] || CENA_GRUPO[e.grupo] || "vestiario", pid = e.dados && e.dados.jogador;
      postar(save, { tipo: "evento", perfil: e.grupo === "imprensa" || e.grupo === "torcida" ? "galeranews" : meu, galeranews: e.grupo === "imprensa",
        humor: ["lesao", "protesto", "balada", "chuva"].includes(cena) ? "ruim" : ["festa", "trofeu", "selecao"].includes(cena) ? "bom" : "neutro",
        arte: { cena, jogador: pid || null, clube: pid ? c.donoDe(save, pid) : meu }, texto: `${e.titulo}. ${e.texto}` });
    } else if (e.tipo === "disputa") {
      postar(save, { tipo: "disputa", perfil: "galeranews", galeranews: true, humor: "mercado", peso: 1.4, arte: { cena: "martelo", jogador: e.dados.jogador, clube: meu },
        texto: `LEILÃO NO MERCADO: ${e.dados.lances.length > 2 ? "vários clubes" : "dois clubes"} brigam por ${c.jogadorDe(save, e.dados.jogador).nome}, do ${clube.nome}.` });
    }
  }
}

// os posts da rodada que acabou
function daRodada(save, { rodada, r, novos, transferencias, ajudas: c }) {
  const meu = save.clube, clube = c.clubeDe(save, meu), u = save.ultimo, nosLado = u.casa === meu ? 0 : 1;
  const [nos, eles] = nosLado === 0 ? u.placar : [u.placar[1], u.placar[0]], adv = c.clubeDe(save, nosLado === 0 ? u.fora : u.casa);
  const res = nos > eles ? "vitoria" : nos === eles ? "empate" : "derrota";
  const frase = { vitoria: ["Que vitória! 3 pontos na conta.", "Missão cumprida.", "É assim que se joga!"], empate: ["Um ponto fora não é ruim... ou é?", "Empate com gosto de pouco.", "Ficou no empate."], derrota: ["Dia ruim. Cabeça erguida.", "Não foi o nosso dia.", "A torcida merecia mais."] }[res];
  const sorte = Motor.sorteDe(`feed-rodada:${save.semente}:${save.temporada}:${rodada}`);
  postar(save, { tipo: res, perfil: meu, humor: res === "derrota" ? "ruim" : res === "vitoria" ? "bom" : "neutro", peso: res === "vitoria" ? 1.6 : 1,
    arte: { cena: res, casa: u.casa, fora: u.fora, placar: u.placar }, texto: `FIM DE JOGO · ${c.clubeDe(save, u.casa).nome} ${u.placar[0]} × ${u.placar[1]} ${c.clubeDe(save, u.fora).nome}. ${sorteio(sorte, frase)}` });
  // quem fez 2 ou mais gols
  const gols = {};
  for (const e of r.eventos) if (e.tipo === "gol" && e.lado === nosLado) gols[e.jogador] = (gols[e.jogador] || 0) + 1;
  for (const [pid, n] of Object.entries(gols)) if (n >= 2) {
    const j = c.jogadorDe(save, pid);
    postar(save, { tipo: "gol", perfil: meu, humor: "bom", peso: 1.8, arte: { cena: "gol", jogador: pid, clube: meu, gols: n }, texto: `${n === 2 ? "DOBLETE" : n === 3 ? "HAT-TRICK" : `${n} GOLS`} de ${j.nome} contra o ${adv.nome}! Pede música!` });
  }
  // lesões e expulsões no seu time
  for (const e of r.eventos) if (e.lado === nosLado && (e.tipo === "lesao" || e.tipo === "vermelho")) {
    const j = c.jogadorDe(save, e.jogador); if (!j) continue;
    if (e.tipo === "lesao") postar(save, { tipo: "lesao", perfil: meu, humor: "ruim", arte: { cena: "lesao", jogador: e.jogador, clube: meu }, texto: `Boletim médico: ${j.nome} saiu machucado e fica fora por ${save.lesoes[e.jogador] || 1} rodada(s). Força, guerreiro!` });
    else postar(save, { tipo: "cartao", perfil: "galeranews", galeranews: true, humor: "ruim", arte: { cena: "cartao", jogador: e.jogador, clube: meu, cor: "vermelho" }, texto: `Vermelho para ${j.nome}! O ${clube.nome} perde o jogador na próxima rodada.` });
  }
  // goleada em outro jogo
  const goleada = (save.resultados[rodada] || []).find(([a, b, ga, gb]) => a !== meu && b !== meu && Math.abs(ga - gb) >= 4);
  if (goleada) {
    const [a, b, ga, gb] = goleada, venc = ga > gb ? a : b;
    postar(save, { tipo: "goleada", perfil: "galeranews", galeranews: true, humor: "neutro", arte: { cena: "vitoria", casa: a, fora: b, placar: [ga, gb] }, texto: `ATROPELO! ${c.clubeDe(save, a).nome} ${ga} × ${gb} ${c.clubeDe(save, b).nome}. O ${c.clubeDe(save, venc).nome} não teve dó.` });
  }
  // a tabela: liderança, G4 e Z4 (só quando muda)
  const pos = Temporada.tabela(c.idsDosClubes(save), save.resultados.filter(Boolean)).findIndex((l) => l.id === meu) + 1, antes = save.posAnterior || 0;
  const faixa = (p) => (p === 1 ? "lider" : p <= 4 ? "g4" : p >= 17 ? "z4" : "meio");
  if (rodada >= 2 && faixa(pos) !== faixa(antes) && faixa(pos) !== "meio") {
    const texto = { lider: `LÍDER! O ${clube.nome} assume a ponta do Brasileirão.`, g4: `O ${clube.nome} entra no G4 (${pos}º).`, z4: `Sinal de alerta: o ${clube.nome} entra na zona de rebaixamento (${pos}º).` }[faixa(pos)];
    postar(save, { tipo: "tabela", perfil: "galeranews", galeranews: true, humor: faixa(pos) === "z4" ? "ruim" : "bom", arte: { cena: "tabela", clube: meu, posicao: pos }, texto });
  }
  save.posAnterior = pos;
  entreRodadas(save, { novos, transferencias, ajudas: c });
}

module.exports = { postar, transferencia, troca, entreRodadas, daRodada, MAX };
