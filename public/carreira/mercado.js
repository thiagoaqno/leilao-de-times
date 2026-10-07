// Carreira de Treinador: as contas do mercado e do dinheiro (servidor e navegador). Quanto vale cada jogador, quanto ele
// ganha, quando a janela está aberta e como o clube que vende e o jogador respondem a uma proposta. A resposta sai de
// um sorteio com semente: a mesma proposta, na mesma rodada, sempre recebe a mesma resposta (recarregar não muda nada).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Mercado = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const arred = (v, passo) => Math.round(v / passo) * passo;
  // o valor de mercado (R$): cresce rápido com a nota; os da base e os reservas sem nota conhecida valem menos
  function valorDe(j) {
    const v = Math.pow(1.18, j.nota - 60) * 1e6 * (j.base ? 0.4 : 1);
    return arred(v, v > 1e7 ? 5e5 : 1e5);
  }
  // o salário por mês (R$)
  const salarioDe = (j) => arred(valorDe(j) / 70, 5e3);
  // as janelas: a pré-temporada e as 4 primeiras rodadas, e a do meio do ano (rodadas 17 a 21)
  const janelaAberta = (rodada) => rodada < 4 || (rodada >= 16 && rodada <= 20);
  const proximaJanela = (rodada) => (rodada < 4 ? null : rodada < 16 ? 16 : null);
  const ELENCO_MAX = 36, ELENCO_MIN = 18;
  const CAIXA_INICIAL = { 5: 60e6, 4: 35e6, 3: 20e6, 2: 12e6, 1: 8e6 };

  // dinheiro curto para a tela: R$ 12,5 mi, R$ 850 mil
  function dinheiro(v) {
    const s = v < 0 ? "-" : "", a = Math.abs(v);
    if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: a >= 1e8 ? 0 : 1 })} mi`;
    if (a >= 1e3) return `${s}R$ ${Math.round(a / 1e3).toLocaleString("pt-BR")} mil`;
    return `${s}R$ ${Math.round(a)}`;
  }

  // a resposta a uma proposta de compra:
  //   jogador, vendedor (o clube dono, com .tamanho), comprador (com .tamanho), titular (se o jogador é dos 11 do dono)
  //   valor e salario oferecidos; semente (carreira + rodada + jogador); tentativas já feitas nesta rodada
  // devolve { resultado: "aceita" | "contra" | "recusa" | "jogador", pedido?, salarioPedido?, motivo }
  function avaliarProposta({ jogador, vendedor, comprador, titular, valor, salario, semente, tentativa = 0 }) {
    // o preço que o clube aceita é um só por jogador e rodada: pagar o que ele pediu sempre fecha o negócio
    const r = Motor.sorteDe(`proposta:${semente}`);
    const V = valorDe(jogador), apego = (titular ? 1.35 : 1.05) * (vendedor.tamanho >= comprador.tamanho ? 1.08 : 0.97);
    const minimo = V * apego * (0.94 + r() * 0.12);
    const pedido = Math.ceil(minimo / 1e5) * 1e5; // arredonda para cima: pagar o pedido sempre basta
    if (valor < V * 0.6) return { resultado: "recusa", motivo: "A proposta nem chegou a ser discutida: está muito abaixo do valor." };
    if (valor < minimo * 0.88) {
      if (tentativa >= 2) return { resultado: "recusa", motivo: "A diretoria encerrou a conversa por esta rodada." };
      return { resultado: "contra", pedido: pedido, motivo: `O ${vendedor.nome} só libera por ${dinheiro(pedido)}.` };
    }
    if (valor < minimo) return { resultado: "contra", pedido: pedido, motivo: `Quase lá: o ${vendedor.nome} pede ${dinheiro(pedido)}.` };
    // o clube aceitou: agora o jogador. Clube menor que o dele precisa pagar mais para convencer.
    const pedidoSalario = arred(salarioDe(jogador) * (comprador.tamanho < vendedor.tamanho ? 1.25 + 0.1 * (vendedor.tamanho - comprador.tamanho) : 1) * (0.95 + r() * 0.1), 5e3);
    if (salario < pedidoSalario * 0.95) return { resultado: "jogador", salarioPedido: pedidoSalario, motivo: `O clube aceitou, mas ${jogador.nome} quer ${dinheiro(pedidoSalario)} por mês.` };
    return { resultado: "aceita", motivo: `Negócio fechado! ${jogador.nome} é do seu time.` };
  }
  // vender na hora para o mercado: sai rápido, mas por menos do que vale
  const vendaRapida = (j) => arred(valorDe(j) * 0.7, 1e5);

  return { valorDe, salarioDe, janelaAberta, proximaJanela, avaliarProposta, vendaRapida, dinheiro, ELENCO_MAX, ELENCO_MIN, CAIXA_INICIAL };
});
