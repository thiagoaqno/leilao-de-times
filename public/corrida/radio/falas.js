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
  punicao: ["Recebemos uma punição de tempo. Mantenha o ritmo.", "A direção de prova nos puniu. Vamos compensar na pista.", "Punição confirmada. Evite novos contatos.", "Tempo adicionado pela batida. Cuidado nas disputas."],
  abandono: ["Precisamos abandonar. Leve o carro para os boxes.", "Fim de corrida para nós. Pare com segurança.", "Vamos recolher o carro. Desculpe.", "Abandono. Pare o carro em local seguro."],
};
// situações que passam na frente do intervalo mínimo entre falas
const URGENTES = ["box", "safety"];
const lista = [];
for (const [quando, textos] of Object.entries(SITUACOES)) textos.forEach((texto, i) => lista.push({ id: `${quando}-${i + 1}`, texto, quando }));
const api = { SITUACOES, URGENTES, FALAS: lista, porSituacao: (q) => lista.filter((f) => f.quando === q) };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RadioFalas = api;
})(typeof self !== "undefined" ? self : this);
