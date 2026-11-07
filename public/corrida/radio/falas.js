// Falas do engenheiro de equipe no rádio (português do Brasil). UMD: window.RadioFalas no navegador, require() no Node.
// Cada fala vira public/corrida/radio/<id>.mp3 (ferramentas/radio-engenheiro.js, com a voz da ElevenLabs). Sem o mp3, o
// rádio não toca nada. Sem nome de pista nas falas: o mesmo áudio serve para qualquer GP.
(function (root) {
// só o que um engenheiro diria NO MEIO da corrida (e no fim dela), em tom sério; várias variações por situação
const SITUACOES = {
  // o observador (spotter): outra voz (ferramentas/radio-engenheiro.js, ELEVENLABS_VOICE_SPOTTER), só o carro ao lado e a pista livre
  spotesq: ["Carro à esquerda.", "À esquerda.", "Esquerda, esquerda."],
  spotdir: ["Carro à direita.", "À direita.", "Direita, direita."],
  spotlivre: ["Livre.", "Pista livre.", "Passou. Livre."],
  largada: ["Luzes se apagando. Largada limpa.", "Atenção na primeira curva. Sem riscos.", "Boa largada. Agora encontre o ritmo.", "Cuidado com o tráfego na primeira volta.", "Largada feita. Proteja a posição."],
  voltarapida: ["Volta mais rápida da corrida. Bom ritmo.", "Melhor volta registrada. Mantenha assim.", "Esse é o ritmo que precisamos.", "Volta mais rápida. Continue consistente.", "Bom setor final. Volta mais rápida."],
  ganhou: ["Posição ganha. Mantenha o ritmo.", "Boa manobra. Agora consolide.", "Ganhamos a posição. Foco no próximo.", "Limpo. Abra uma margem agora.", "Boa. Próximo carro a um segundo."],
  perdeu: ["Perdemos a posição. Mantenha a calma.", "Ele passou. Fique próximo e aguarde.", "Sem problema. A corrida é longa.", "Perdemos uma posição. Proteja os pneus.", "Mantenha o ritmo. Vamos recuperar."],
  pneu: ["Os pneus estão no limite. Cuidado nas curvas.", "A aderência caiu. Estamos avaliando a parada.", "Degradação alta no traseiro. Administre.", "Pneus no fim. Evite travar as rodas.", "Temperatura dos pneus subindo. Alivie um pouco."],
  box: ["Box, box. Entre nesta volta.", "Box nesta volta. Box, box.", "Confirmado, box nesta volta.", "Prepare para entrar. Box, box.", "Entre nos boxes agora. Box, box."],
  safety: ["Safety car na pista. Reduza e mantenha o delta.", "Safety car acionado. Sem ultrapassagens.", "Safety car. Mantenha os pneus aquecidos.", "Neutralização. Siga o delta positivo.", "Safety car na pista. Estamos avaliando a parada."],
  amarela: ["Bandeira amarela no setor. Reduza.", "Amarela à frente. Sem ultrapassagens.", "Carro parado à frente. Cuidado.", "Amarela no próximo setor. Atenção.", "Incidente à frente. Reduza a velocidade."],
  dano: ["Detectamos dano no carro. Vamos monitorar.", "Temos um problema. Poupe o equipamento.", "Dano na asa. Ajuste as frenagens.", "Perda de rendimento. Estamos analisando.", "Problema confirmado. Leve o carro com cuidado."],
  ultima: ["Última volta. Traga o carro para casa.", "Última volta. Concentração até a bandeirada.", "Última volta. Sem riscos agora.", "Bandeira branca. Última volta.", "Última volta. Mantenha a posição."],
  vitoria: ["Vencemos a corrida. Excelente trabalho.", "Vitória. Trabalho muito bem feito.", "P1. Corrida impecável. Obrigado.", "Vitória confirmada. Grande trabalho da equipe."],
  podio: ["Pódio confirmado. Bom resultado.", "Terminamos no pódio. Bom trabalho.", "Pódio. Pontos importantes para a equipe.", "Bom trabalho. Pódio garantido."],
  pontos: ["Terminamos nos pontos. Resultado importante.", "Pontos garantidos. Seguimos evoluindo.", "Bons pontos hoje. Obrigado pelo esforço.", "Nos pontos. Vamos construir a partir daqui."],
  foradospontos: ["Fora dos pontos hoje. Vamos analisar os dados.", "Não foi o resultado esperado. Vamos trabalhar.", "Corrida difícil. Vamos entender o que faltou.", "Sem pontos hoje. Próxima corrida é outra história."],
  chuvachegando: ["Chuva chegando em uma volta. Prepare o pneu de chuva.", "O radar mostra chuva em uma volta. Considere o box.", "Chuva a caminho. Falta uma volta para ela chegar.", "Vai chover em uma volta. Fique atento ao box."],
  chuvaparando: ["A chuva está parando. A pista vai secar.", "A chuva diminui. A pista deve secar em breve.", "O radar está limpando. Pense nos pneus secos.", "Chuva parando. Avalie voltar para o pneu seco."],
  // (estas o rádio já pedia em radio.js, mas não tinham fala: ficavam mudas)
  boasvindas: ["Rádio funcionando. Estamos prontos quando você estiver.", "Bem-vindo de volta. O carro está pronto.", "Comunicação ok. Vamos fazer um bom fim de semana.", "Tudo certo por aqui. Escolha bem o pneu."],
  classboa: ["Boa classificação. Largamos lá na frente.", "Ótima volta. Posição forte para a corrida.", "Excelente. Grid muito bom para amanhã.", "Classificação limpa. Agora é transformar em pontos."],
  classruim: ["Classificação difícil. Vamos recuperar na corrida.", "Não foi a volta que queríamos. A corrida é longa.", "Largamos de trás. Paciência e estratégia.", "Tempo abaixo do esperado. Vamos atacar amanhã."],
  drs: ["DRS disponível. Use na reta.", "Você está a menos de um segundo. DRS liberado.", "Zona de DRS à frente. Ataque.", "DRS ativo. É a sua chance."],
  punicao: ["Recebemos uma punição. Se for stop-and-go, entre no box em até três voltas.", "A direção de prova nos puniu. Vamos compensar na pista.", "Punição confirmada. Evite novos contatos.", "Cuidado nas disputas. A décima segunda batida proposital é bandeira preta."],
  abandono: ["Precisamos abandonar. Leve o carro para os boxes.", "Fim de corrida para nós. Pare com segurança.", "Vamos recolher o carro. Desculpe.", "Abandono. Pare o carro em local seguro."],
  diagnosticobom: ["Diagnóstico concluído. O carro está sem danos relevantes.", "Tudo certo com o carro. Não vemos danos importantes."],
  diagnosticomedio: ["Detectamos dano no carro. O desempenho pode estar comprometido.", "Há dano no carro. Cuidado nas próximas disputas."],
  diagnosticograve: ["O carro está muito danificado. Reduza os riscos.", "Dano grave no carro. Precisamos evitar outro impacto."],
  pneusbons: ["Os pneus estão em boas condições. Continue assim.", "Os pneus ainda estão em boas condições."],
  pneusgastos: ["Os pneus estão desgastados. Avalie uma parada.", "A vida dos pneus está baixa. Fique atento à aderência."],
  corridachuva: ["A pista está molhada. Atenção à aderência.", "Temos água na pista. Cuidado com a tração."],
  corridaseca: ["A pista está seca no momento.", "Condições de pista seca por enquanto."],
};
// Variações a mais: entram DEPOIS das de cada situação, para os números dos mp3 que já existem não mudarem.
const MAIS = {
  spotesq: ["Ele está na sua esquerda.", "Atenção, esquerda.", "Carro por dentro, à esquerda.", "Lado a lado, esquerda.", "Tem carro na esquerda.", "Cuidado na esquerda."],
  spotdir: ["Ele está na sua direita.", "Atenção, direita.", "Carro por dentro, à direita.", "Lado a lado, direita.", "Tem carro na direita.", "Cuidado na direita."],
  spotlivre: ["Tudo livre.", "Limpo.", "Livre dos dois lados.", "Ele ficou para trás. Livre.", "Pode voltar para a linha.", "Sem ninguém ao lado."],
  largada: ["Luzes apagadas. Vamos embora.", "Olho nos carros à frente. Sem pressa na primeira curva.", "Largada feita. Agora é ritmo.", "Cuidado com os lados na primeira freada.", "Pneus ainda frios. Freie com margem.", "Mantenha a linha limpa na primeira volta.", "Muito carro junto. Fique atento.", "Primeira volta é para sobreviver. Calma.", "Boa saída. Foco na primeira curva.", "Evite contato agora. A corrida é longa."],
  voltarapida: ["Roxo. Volta mais rápida.", "Excelente volta. A melhor até aqui.", "Você acabou de marcar a mais rápida.", "Tempo muito forte. Melhor da corrida.", "Volta perfeita. Repita isso.", "Ninguém andou nesse tempo ainda.", "O carro está vivo. Volta mais rápida.", "Grande volta. Cuide dos pneus agora.", "Melhor tempo da pista. Muito bom."],
  ganhou: ["Boa ultrapassagem. Limpa.", "Mais uma posição. Continue.", "Foi bonito. Agora abra distância.", "Passou. Olhe para o próximo.", "Excelente manobra. Siga firme.", "Posição nossa. Mantenha a cabeça.", "Boa freada. Ganhamos uma.", "Isso. Agora proteja a linha.", "Subimos uma posição. Bom trabalho.", "Grande movimento. Sem relaxar."],
  perdeu: ["Ele passou. Fique no vácuo dele.", "Tudo bem. Ainda dá para devolver.", "Perdemos uma. Respire e reorganize.", "Não brigue agora. Espere a chance.", "Fique perto. Ele vai gastar os pneus.", "Sem desespero. O ritmo é bom.", "Perdemos a posição. Foco na próxima freada.", "Deixa ir. Vamos atacar mais à frente.", "Calma. Nada está perdido.", "Mantenha a pressão. A chance vem."],
  pneu: ["Pouca aderência agora. Cuide da tração.", "O pneu está caindo. Freie mais cedo.", "Os pneus estão pedindo ajuda.", "Cuidado na saída das curvas. A traseira está solta.", "Estamos perdendo tempo com os pneus.", "Pneu no limite. Sem travar a frente.", "A borracha está acabando. Administre.", "O desgaste passou do esperado.", "Alivie nas curvas rápidas. Pneus sofrendo.", "Estamos no fim da vida desse pneu."],
  box: ["Box agora. Box agora.", "Esta volta é box. Confirme.", "Venha para os boxes nesta volta.", "A equipe está pronta. Box, box.", "Box, box, box. Esta volta.", "Hora de parar. Entre nos boxes.", "É agora. Box nesta volta.", "Janela aberta. Box, box."],
  safety: ["Safety car. Sem ultrapassar.", "Safety car na pista. Respeite o delta.", "Corrida neutralizada. Reduza agora.", "Safety car. Cuidado ao alcançar o pelotão.", "Vai embolar tudo. Safety car na pista.", "Safety car. Aqueça os freios e os pneus.", "Neutralizada. Mantenha a concentração.", "Safety car. Janela de box aberta, estamos olhando.", "Atenção ao delta. Safety car."],
  amarela: ["Amarela. Tire o pé.", "Bandeira amarela. Nada de ultrapassar.", "Setor em amarela. Reduza agora.", "Cuidado. Carro na pista à frente.", "Amarela no setor. Olhos abertos.", "Tem detritos à frente. Vá com cuidado.", "Amarela. Sem riscos aqui.", "Incidente no próximo trecho. Atenção."],
  dano: ["Vimos o toque. Estamos checando o carro.", "O carro sentiu a batida. Vá com calma.", "Telemetria mostra dano. Cuide do carro.", "Perdemos desempenho na batida.", "Ainda dá para seguir. Evite as zebras.", "Tem dano, mas o carro continua. Siga.", "Estamos olhando os dados. Sem riscos agora.", "O carro está diferente depois do toque. Adapte.", "Dano leve, mas custa tempo. Continue."],
  ultima: ["Última volta. É agora.", "Última volta. Tudo o que tiver.", "Falta só uma. Sem erros.", "Última volta. Olho no retrovisor.", "Última volta. Vamos para casa.", "Só mais uma volta. Foco total.", "Última volta. Cuidado com as zebras.", "Falta pouco. Última volta.", "Última volta. Termine o trabalho."],
  vitoria: ["Vencemos! Que corrida.", "É nossa! Vitória!", "Primeiro lugar. Obrigado pelo trabalho.", "Vitória! A equipe inteira está em festa.", "Você venceu. Corrida fantástica.", "P1! Grande domingo para nós.", "Isso é vitória. Muito bem.", "Que pilotagem. Vencemos essa.", "Ninguém segurou. Vitória nossa."],
  podio: ["No pódio. Muito bem.", "Pódio merecido. Grande corrida.", "Top três. Ótimo trabalho.", "Pódio para a equipe. Obrigado.", "Subimos no pódio. Dia bom.", "Boa corrida. Vá comemorar no pódio.", "Pódio. O carro e você foram muito bem.", "Terminamos entre os três. Excelente."],
  pontos: ["Pontos para a equipe. Boa corrida.", "Terminamos nos pontos. Bom trabalho.", "Pontuamos. Isso conta no fim do ano.", "Corrida sólida. Pontos na conta.", "Bom trabalho. Saímos com pontos.", "Pontos importantes hoje.", "Resultado útil. Levamos pontos.", "Missão cumprida. Pontuamos."],
  foradospontos: ["Ficamos fora dos pontos. Vamos revisar tudo.", "Hoje não deu. Cabeça na próxima.", "Faltou pouco. Vamos melhorar.", "Corrida complicada. Obrigado pelo esforço.", "Não pontuamos. Vamos olhar os dados juntos.", "Dia difícil. Voltamos mais fortes.", "Sem pontos hoje. Seguimos trabalhando.", "Não foi o nosso dia."],
  chuvachegando: ["Falta uma volta para a chuva.", "Em uma volta começa a chover. Decida o pneu.", "Chuva em uma volta. Cuidado na freada.", "Nuvem chegando. Uma volta para a chuva.", "O radar confirma: chuva na próxima volta.", "Prepare-se. Chove em uma volta.", "Uma volta até a água. Fique pronto para o box."],
  chuvaparando: ["A chuva está acabando.", "Parou de chover. Traçado vai aparecer.", "A pista começa a secar.", "O traçado está secando. Olho no tempo de volta.", "Chuva indo embora. Pense no pneu seco.", "Quase sem chuva agora.", "O radar está limpo. Vamos avaliar o box."],
  boasvindas: ["Rádio ok. Bom te ouvir.", "Aqui é o seu engenheiro. Tudo pronto.", "Boa tarde. O carro está no ponto.", "Estamos conectados. Vamos trabalhar.", "Tudo verificado por aqui.", "Equipe pronta. Quando quiser.", "Bem-vindo à garagem. Vamos andar.", "Sistemas ok. Bom fim de semana para nós."],
  classboa: ["Grande volta. Largada forte.", "Classificação muito boa. Parabéns.", "Lugar excelente no grid.", "Volta limpa. Estamos bem colocados.", "Ótimo trabalho. Temos posição.", "Grid muito bom. A corrida começa bem.", "Saímos na frente de muita gente. Boa.", "Classificação de respeito."],
  classruim: ["Longe do que queríamos. Vamos virar a chave.", "Grid difícil. A corrida é outra coisa.", "Faltou volta hoje. Amanhã tem mais.", "Largamos atrás, mas temos estratégia.", "Vamos ter que ultrapassar. Sem pânico.", "Não encaixou a volta. Vamos para a corrida.", "Posição ruim. Tudo pode mudar na largada.", "Não foi o que esperávamos. Cabeça erguida."],
  drs: ["DRS aberto. Vai.", "DRS liberado. Use agora.", "Você tem DRS na reta.", "Menos de um segundo. Abra o DRS.", "Reta à frente. DRS disponível.", "Use o DRS e ataque na freada.", "DRS pronto. Ele está ao seu alcance.", "Aproveite o DRS nesta reta."],
  punicao: ["Punição confirmada. Mantenha a calma.", "Tomamos uma punição. Foco no ritmo.", "A direção de prova puniu aquele toque.", "Punição na conta. Vamos descontar na pista.", "Cuidado agora. Mais um toque custa caro.", "Recebemos tempo de punição. Ande forte.", "A direção anotou. Evite o contato.", "Punição aplicada. Siga em frente."],
  abandono: ["Acabou para nós. Leve o carro para os boxes.", "Vamos parar. Obrigado pelo esforço.", "Não dá para continuar. Recolha o carro.", "Fim da linha hoje. Pare em segurança.", "Infelizmente, abandono. Desligue o carro.", "Carro sem condições. Vamos encerrar.", "Sentimos muito. Corrida encerrada."],
  diagnosticobom: ["Carro em ordem. Pode forçar.", "Checagem feita. Nada de grave.", "Sem danos. Siga no ataque.", "Dados limpos. O carro está bem.", "Tudo normal na telemetria.", "Carro inteiro. Continue."],
  diagnosticomedio: ["Temos dano. Ainda dá para seguir.", "O carro está ferido. Vá com calma.", "Perdemos rendimento com o dano.", "Dano moderado. Evite as zebras.", "Tem dano, mas não é o fim.", "Cuidado. O carro já sentiu."],
  diagnosticograve: ["Dano sério. Mais uma batida e acabou.", "O carro está no limite. Sem contato.", "Dano muito alto. Traga o carro com cuidado.", "Estado crítico. Evite qualquer toque.", "O carro não aguenta outro impacto.", "Situação grave. Vá com muito cuidado."],
  pneusbons: ["Pneus ótimos. Pode atacar.", "Ainda temos muito pneu.", "Desgaste dentro do plano.", "A borracha está aguentando bem.", "Pneus em dia. Mantenha o ritmo.", "Vida de pneu boa. Sem preocupação."],
  pneusgastos: ["Pneus bem gastos. Vamos pensar em parar.", "Pouca borracha sobrando.", "O desgaste está alto. Cuide do pneu.", "Esse jogo está acabando. Avalie o box.", "Pneus no fim. Cuidado nas freadas.", "A aderência vai cair em breve."],
  corridachuva: ["Pista molhada. Freie mais cedo.", "Muita água. Suave no acelerador.", "Está escorregando. Cuidado na tração.", "Asfalto molhado. Evite as faixas pintadas.", "Pista úmida. Vá com margem.", "Chuva na pista. Sem movimentos bruscos."],
  corridaseca: ["Pista seca. Pode confiar na aderência.", "Asfalto seco por enquanto.", "Sem água. Condição boa.", "Pista seca. Ande forte.", "O radar não mostra chuva agora.", "Condição seca. Siga o plano."],
};
for (const [q, textos] of Object.entries(MAIS)) { if (!SITUACOES[q]) throw new Error("situação desconhecida: " + q); SITUACOES[q].push(...textos); }
// situações que passam na frente do intervalo mínimo entre falas
const URGENTES = ["box", "safety", "spotesq", "spotdir", "spotlivre"];
const lista = [];
for (const [quando, textos] of Object.entries(SITUACOES)) textos.forEach((texto, i) => lista.push({ id: `${quando}-${i + 1}`, texto, quando }));

// ---------- as falas montadas em pedaços (o rádio emenda os mp3: radio.js `frase`) ----------
// "À sua frente, Verstappen, a um segundo e meio. Os pneus dele estão no fim. Ataque." = abertura + nome + distância + comentário.
// Cada pedaço vira radio/<id>.mp3 como as falas. Os nomes: os pilotos de 2026 (o id de f1-pilotos-2026.js) e a galera que joga.
const NOMES = {
  norris: "Norris", piastri: "Piastri", leclerc: "Leclerc", hamilton: "Hamilton", russell: "Russell", antonelli: "Antonelli", verstappen: "Verstappen",
  hadjar: "Hadjar", lawson: "Lawson", lindblad: "Lindblad", alonso: "Alonso", stroll: "Stroll", albon: "Albon", sainz: "Sainz", hulkenberg: "Hülkenberg",
  bortoleto: "Bortoleto", gasly: "Gasly", colapinto: "Colapinto", ocon: "Ocon", bearman: "Bearman", perez: "Pérez", bottas: "Bottas",
  // a galera (o nome que a pessoa usa na sala, sem acento e em minúsculas, vira o id)
  tabba: "Tabba", kizzy: "Kizzy", "1kizzy": "Kizzy", notizin: "Notizin", sho: "Shô", dollyin: "Dollyin", dolllyin: "Dollyin", atrox: "Átrox", jv: "Jota Vê", verago: "Verago", nikao: "Nikão",
};
const PECAS_TEXTO = {
  // as aberturas
  frente: ["À sua frente,", "O carro da frente é", "Logo à frente,", "Na sua frente,"],
  tras: ["Atrás de você,", "Vindo atrás,", "Logo atrás,", "No seu retrovisor,"],
  // a distância (`gap-<décimos>`): a escolhida é a mais perto da real
  gap: { 3: "a três décimos.", 5: "a meio segundo.", 8: "a oito décimos.", 10: "a um segundo.", 15: "a um segundo e meio.", 20: "a dois segundos.",
    25: "a dois segundos e meio.", 30: "a três segundos.", 40: "a quatro segundos.", 50: "a cinco segundos.", 70: "a sete segundos.", 100: "a dez segundos.",
    150: "a quinze segundos.", 200: "a mais de vinte segundos." },
  // o pneu do carro da frente
  rivalgasto: ["Os pneus dele estão no fim. Ataque agora.", "Ele está com os pneus gastos. É a sua chance.", "Ele está sofrendo com os pneus. Pressione.", "Os pneus dele já caíram. Vá pra cima."],
  rivalnovo: ["Ele está de pneus novos. Cuidado com o ritmo dele.", "Ele acabou de trocar os pneus. Vai vir rápido.", "Pneus novos no carro dele. Não force agora."],
  rivalmacio: ["Ele está de macio.", "Ele usa o pneu macio."], rivalmedio: ["Ele está de médio.", "Ele usa o pneu médio."],
  rivalduro: ["Ele está de duro.", "Ele usa o pneu duro."], rivalchuva: ["Ele está de pneu de chuva."],
  // quem vem atrás
  chegando: ["Ele está chegando. Defenda a posição.", "Ele está mais rápido. Proteja a linha de dentro.", "Pressão atrás. Cuidado na freada.", "Ele vem forte. Não deixe espaço."],
  margem: ["Você tem margem. Administre os pneus.", "Distância confortável. Mantenha o ritmo.", "Ele não está ganhando tempo. Siga assim."],
  // a distância para o da frente mudando
  alcancando: ["Estamos chegando nele.", "Você está tirando a diferença.", "Ganhando tempo nele a cada volta."],
  afastando: ["Ele está abrindo.", "Ele está mais rápido agora.", "Estamos perdendo tempo para ele."],
  lider: ["Você está liderando.", "P1. Ninguém à frente.", "Pista livre. Você é o líder."],
};
// o estrategista (a volta da chuva) e o engenheiro (o objetivo desta corrida): abertura + número
const VOLTAS_PECA = 60, TOPS_PECA = 20;
const PECAS = [{ id: "chuvavolta", texto: "Aqui é o estrategista. A previsão é de chuva na" }, { id: "secavolta", texto: "Aqui é o estrategista. A chuva deve parar na" },
  { id: "objetivo", texto: "O objetivo desta corrida: terminar entre os" }, { id: "objetivovencer", texto: "O objetivo desta corrida é vencer. Vamos buscar." }, { id: "objetivofim", texto: "Vamos em frente." }];
for (let v = 1; v <= VOLTAS_PECA; v++) PECAS.push({ id: `volta-${v}`, texto: `volta ${v}.` });
for (let n = 2; n <= TOPS_PECA; n++) PECAS.push({ id: `top-${n}`, texto: `${n} primeiros.` });
for (const [id, texto] of Object.entries(NOMES)) PECAS.push({ id: `nome-${id}`, texto });
for (const [k, texto] of Object.entries(PECAS_TEXTO.gap)) PECAS.push({ id: `gap-${k}`, texto });
for (const [quando, textos] of Object.entries(PECAS_TEXTO)) if (Array.isArray(textos)) textos.forEach((texto, i) => PECAS.push({ id: `${quando}-${i + 1}`, texto, quando }));
const GAPS = Object.keys(PECAS_TEXTO.gap).map(Number);
// o pedaço da distância mais perto de `seg` segundos
const pecaDoGap = (seg) => { const d = seg * 10; let m = GAPS[0]; for (const g of GAPS) if (Math.abs(g - d) < Math.abs(m - d)) m = g; return `gap-${m}`; };
// o id do nome de um piloto: o id dele em f1-pilotos-2026, ou o nome da pessoa sem acento (se a galera tiver o mp3); null se não houver
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function pecaDoNome(nome, pilotoId) { const id = pilotoId && NOMES[pilotoId] ? pilotoId : semAcento(nome); return NOMES[id] ? `nome-${id}` : null; }
const pecasDe = (quando) => PECAS.filter((p) => p.quando === quando);

const api = { SITUACOES, URGENTES, FALAS: lista, porSituacao: (q) => lista.filter((f) => f.quando === q), PECAS, NOMES, pecaDoGap, pecaDoNome, pecasDe };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RadioFalas = api;
})(typeof self !== "undefined" ? self : this);
