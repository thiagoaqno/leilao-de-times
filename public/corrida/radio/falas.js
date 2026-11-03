// Falas do engenheiro de equipe no rádio (português do Brasil). UMD: window.RadioFalas no navegador, require() no Node.
// Cada fala vira public/corrida/radio/<id>.mp3 (ferramentas/radio-engenheiro.js, com a voz da ElevenLabs). Sem o mp3, o
// rádio não toca nada. Sem nome de pista nas falas: o mesmo áudio serve para qualquer GP.
(function (root) {
// só o que um engenheiro diria NO MEIO da corrida (e no fim dela), em tom sério; 4 a 5 variações por situação
const SITUACOES = {
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
  punicao: ["Recebemos uma punição. Se for stop-and-go, entre no box em até três voltas.", "A direção de prova nos puniu. Vamos compensar na pista.", "Punição confirmada. Evite novos contatos.", "Cuidado nas disputas. A sexta batida causada é bandeira preta."],
  abandono: ["Precisamos abandonar. Leve o carro para os boxes.", "Fim de corrida para nós. Pare com segurança.", "Vamos recolher o carro. Desculpe.", "Abandono. Pare o carro em local seguro."],
  diagnosticobom: ["Diagnóstico concluído. O carro está sem danos relevantes.", "Tudo certo com o carro. Não vemos danos importantes."],
  diagnosticomedio: ["Detectamos dano no carro. O desempenho pode estar comprometido.", "Há dano no carro. Cuidado nas próximas disputas."],
  diagnosticograve: ["O carro está muito danificado. Reduza os riscos.", "Dano grave no carro. Precisamos evitar outro impacto."],
  pneusbons: ["Os pneus estão em boas condições. Continue assim.", "Os pneus ainda estão em boas condições."],
  pneusgastos: ["Os pneus estão desgastados. Avalie uma parada.", "A vida dos pneus está baixa. Fique atento à aderência."],
  corridachuva: ["A pista está molhada. Atenção à aderência.", "Temos água na pista. Cuidado com a tração."],
  corridaseca: ["A pista está seca no momento.", "Condições de pista seca por enquanto."],
};
// situações que passam na frente do intervalo mínimo entre falas
const URGENTES = ["box", "safety"];
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
  tabba: "Tabba", kizzy: "Kizzy", notizin: "Notizin", sho: "Shô", dollyin: "Dollyin", atrox: "Átrox", jv: "Jota Vê", verago: "Verago",
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
const PECAS = [];
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
