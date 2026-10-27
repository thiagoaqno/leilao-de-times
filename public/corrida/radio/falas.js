// Falas do engenheiro de equipe no rádio (português do Brasil). UMD: window.RadioFalas no navegador, require() no Node.
// Cada fala vira public/corrida/radio/<id>.mp3 (ferramentas/radio-engenheiro.js, com a voz da ElevenLabs). Sem o mp3, o
// rádio não toca nada. Sem nome de pista nas falas: o mesmo áudio serve para qualquer GP.
(function (root) {
const SITUACOES = {
  boasvindas: ["Bem-vindo de volta à garagem. O carro está pronto, é só dizer quando.", "Boa tarde, chefe. A equipe está toda aqui, esperando você."],
  proximogp: ["Próximo: GP da Austrália. Vamos nos preparar direito.", "Fim de semana de corrida chegando. Quero todo mundo atento."],
  largada: ["Luzes apagando. Boa largada!", "Vamos lá, é a nossa hora. Sem erro na primeira curva."],
  voltarapida: ["Essa foi a volta mais rápida da corrida. Continue assim!", "Roxo no cronômetro! Que volta, hein."],
  ganhou: ["Passou! Ganhamos uma posição, segue o ritmo.", "Boa ultrapassagem! Agora segura a posição."],
  perdeu: ["Perdemos uma posição. Calma, ainda dá para recuperar.", "Ele passou. Fica na cola dele e espera o erro."],
  pneu: ["Os pneus estão acabando. Cuida deles nas curvas.", "A aderência caiu bastante. Pensa na parada."],
  box: ["Box, box! Entra agora no box.", "Box, box, box! Vem para a parada."],
  safety: ["Safety car na pista. Reduz e mantém a posição.", "Safety car! Calma, sem ultrapassar."],
  amarela: ["Bandeira amarela no setor. Cuidado, não ultrapasse.", "Amarela à frente. Levanta o pé."],
  dano: ["Sentimos um problema no carro. Cuidado com a pilotagem.", "Tem dano aí. Vê se o carro responde e segue com calma."],
  drs: ["DRS liberado. Aproveita a reta.", "Pode abrir a asa, DRS disponível."],
  ultima: ["Última volta! Dá tudo que você tem.", "Última volta, é agora. Sem erro."],
  vitoria: ["Vitória! Que corrida, parabéns a toda a equipe!", "Venceu! Isso é para a fábrica inteira comemorar."],
  podio: ["Pódio! Excelente resultado, parabéns.", "Subimos ao pódio. Trabalho muito bem feito."],
  pontos: ["Pontos garantidos. Um bom resultado para a equipe.", "Terminamos nos pontos. Vamos somar no campeonato."],
  foradospontos: ["Ficamos fora dos pontos. Vamos entender o que faltou.", "Não foi dessa vez. Na próxima a gente volta mais forte."],
  abandono: ["Abandonamos a corrida. Vamos ver o que aconteceu com o carro.", "Fim de corrida para nós. Cabeça erguida, tem mais GP pela frente."],
  classboa: ["Ótima classificação! Largamos bem à frente.", "Grid excelente. O carro está voando."],
  classruim: ["A classificação não foi boa. Vamos recuperar na corrida.", "Largamos lá atrás, mas a corrida é longa."],
  pecas: ["Peças novas instaladas. O carro está melhor.", "Atualização aprovada. Já dá para sentir a diferença."],
};
// situações que passam na frente do intervalo mínimo entre falas
const URGENTES = ["box", "safety"];
const lista = [];
for (const [quando, textos] of Object.entries(SITUACOES)) textos.forEach((texto, i) => lista.push({ id: `${quando}-${i + 1}`, texto, quando }));
const api = { SITUACOES, URGENTES, FALAS: lista, porSituacao: (q) => lista.filter((f) => f.quando === q) };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RadioFalas = api;
})(typeof self !== "undefined" ? self : this);
