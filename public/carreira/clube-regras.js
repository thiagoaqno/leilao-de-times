// Carreira de Treinador: as regras da gestão do clube (servidor e navegador). Contratos e multas, as obras de estrutura,
// a base e o potencial escondido, as habilidades do técnico, a liderança do capitão e as faixas de confiança e reputação.
// São contas puras: o servidor aplica (carreira-clube.js) e o navegador usa as mesmas para mostrar o preço antes de você escolher.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ClubeRegras = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const arred = (v, passo) => Math.round(v / passo) * passo;

  // ---------- os contratos ----------
  // a multa rescisória: quanto um clube precisa pagar para levar o jogador no meio do contrato (vezes o valor dele).
  // Multa baixa deixa o jogador mais barato de renovar, mas qualquer clube grande pode levar; sem multa ele pede mais.
  const MULTAS = {
    nenhuma: { nome: "Sem multa", mult: 0, ajuste: 0.12, texto: "Ninguém leva o jogador no meio do contrato, mas ele pede um salário maior." },
    baixa: { nome: "Multa baixa (1,5×)", mult: 1.5, ajuste: -0.1, texto: "Salário menor, porém um clube pode pagar a multa e levar o jogador." },
    alta: { nome: "Multa alta (3,5×)", mult: 3.5, ajuste: 0, texto: "É difícil tirarem o jogador; se pagarem, a multa vai para o seu caixa." },
  };
  // a renovação: o aumento depende da nota (quanto melhor, mais pede), dos anos (contrato longo dá segurança) e da multa.
  // O negociador paga menos luvas e ouve pedidos menores; quem foi enrolado antes pede mais.
  function termos({ salario, nota, anos = 2, multa = "nenhuma", negociador = 0, moral = 60, recusou = false }) {
    let pct = 0.06 + (nota - 68) * 0.006 + (anos === 3 ? -0.04 : anos === 1 ? 0.03 : 0) + (MULTAS[multa] || MULTAS.nenhuma).ajuste + (moral < 40 ? 0.05 : 0) + (recusou ? 0.1 : 0) - 0.04 * negociador;
    pct = clamp(pct, 0, 0.45);
    const novo = Math.max(salario, arred(salario * (1 + pct), 5e3));
    return { salario: novo, aumento: Math.round(pct * 100), luvas: arred(novo * 2 * (1 - 0.15 * negociador), 1e5) };
  }

  // ---------- a estrutura do clube ----------
  // cada obra é paga na hora e fica pronta na virada de temporada; o custo cresce com o tamanho do clube
  const INFRA_MAX = 3, CUSTO_NIVEL = [1, 2.5, 5];
  const INFRA = {
    estadio: { nome: "Estádio", icone: "estadio", efeito: (n) => `Bilheteria +${12 * n}%` },
    ct: { nome: "Centro de treinamento", icone: "campo", efeito: (n) => `Jovens evoluem mais e veteranos caem menos (${20 * n}% de chance de +1)` },
    medico: { nome: "Departamento médico", icone: "alerta", efeito: (n) => `Lesões ${15 * n}% mais curtas e +${3 * n} de energia por rodada` },
    olheiros: { nome: "Rede de olheiros", icone: "olho", efeito: (n) => ["Não vê o potencial dos garotos da base", "Vê o potencial com margem de ±7", "Vê o potencial com margem de ±3", "Vê o potencial exato"][n] },
    base: { nome: "Categoria de base", icone: "campo", efeito: (n) => `${2 + n} garotos por temporada, nota +${2 * n} e potencial maior` },
  };
  const custoObra = (nivelNovo, tamanho) => arred((CUSTO_NIVEL[nivelNovo - 1] || 5) * (tamanho || 3) * 1e6, 1e5);
  const manutencao = (infra, tamanho) => arred(Object.values(infra || {}).reduce((s, n) => s + n, 0) * 0.2e6 * (tamanho || 3), 1e5);
  const fatorBilheteria = (infra) => 1 + 0.12 * ((infra && infra.estadio) || 0);
  const bonusRecupera = (infra, preparador = 0) => 3 * ((infra && infra.medico) || 0) + 2 * preparador;
  const fatorLesao = (infra) => 1 - 0.15 * ((infra && infra.medico) || 0);

  // ---------- a base ----------
  const IDADE_BASE_MAX = 20, BASE_MAX = 8;
  // o que a pessoa enxerga do potencial do garoto: depende da rede de olheiros (null: nada além de uma impressão)
  function potVisivel(pot, olheiros) {
    if (olheiros >= 3) return [pot, pot];
    if (olheiros === 2) return [pot - 3, pot + 3];
    if (olheiros === 1) return [pot - 7, pot + 7];
    return null;
  }
  const impressao = (pot) => (pot >= 86 ? "promete muito" : pot >= 80 ? "tem futuro" : pot >= 74 ? "pode virar jogador" : "limitado");

  // ---------- o técnico ----------
  const HABILIDADES = {
    formador: { nome: "Formador", texto: (n) => `A base cresce mais rápido: +${n} de nota por temporada e potencial maior` },
    negociador: { nome: "Negociador", texto: (n) => `Renovações ${4 * n}% mais baratas e ${15 * n}% menos de luvas` },
    motivador: { nome: "Motivador", texto: (n) => `Depois de uma derrota o vestiário se recupera: +${n} de moral` },
    preparador: { nome: "Preparador físico", texto: (n) => `Os jogadores recuperam +${2 * n} de energia por rodada` },
  };
  const HAB_MAX = 3;
  const NIVEIS_REPUTACAO = [[80, "Lenda"], [60, "Prestigiado"], [40, "Respeitado"], [20, "Promessa"], [0, "Desconhecido"]];
  const nivelReputacao = (r) => (NIVEIS_REPUTACAO.find(([min]) => r >= min) || NIVEIS_REPUTACAO[4])[1];
  const nivelConfianca = (c) => (c >= 80 ? "Blindado" : c >= 60 ? "Confiante" : c >= 40 ? "Desconfiada" : c >= 20 ? "Sob pressão" : "Na corda bamba");

  // ---------- o capitão ----------
  // liderança de 1 a 10: a idade e a nota pesam; quem está há mais tempo no clube ganha um pouco
  const lideranca = ({ idade, nota, anosClube = 0 }) => clamp(Math.round((idade - 20) * 0.45 + (nota - 65) * 0.25 + Math.min(3, anosClube) * 0.6), 1, 10);

  // ---------- a janela com relógio ----------
  // quantos jogos faltam para a janela fechar (null: fechada). Começo da temporada: até a rodada 4; meio: até a 21
  const restamNaJanela = (rodada) => (rodada < 4 ? 4 - rodada : rodada >= 16 && rodada <= 20 ? 21 - rodada : null);

  return { MULTAS, termos, INFRA, INFRA_MAX, custoObra, manutencao, fatorBilheteria, bonusRecupera, fatorLesao, IDADE_BASE_MAX, BASE_MAX, potVisivel, impressao,
    HABILIDADES, HAB_MAX, nivelReputacao, nivelConfianca, lideranca, restamNaJanela, clamp };
});
