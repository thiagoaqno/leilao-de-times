// Carreira de Treinador: as contas do mercado e do dinheiro (servidor e navegador). Quanto vale cada jogador, quanto ele
// ganha, quando a janela está aberta e como o clube que vende e o jogador respondem a uma proposta. A resposta sai de
// um sorteio com semente: a mesma proposta, na mesma rodada, sempre recebe a mesma resposta (recarregar não muda nada).
// O valor muda com o momento (o fator de forma: gols, fase boa ou ruim, estar à venda), e é isso que dá lucro: comprar
// barato (dica do olheiro, jogador em baixa) e vender depois que ele valorizou.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Mercado = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const arred = (v, passo) => Math.round(v / passo) * passo;
  // a idade pesa no valor: o veterano perde valor a cada ano (o contrato curto e a queda vêm logo), a promessa vale um pouco mais
  function fatorIdade(idade) {
    if (!idade) return 1;
    if (idade <= 21) return 1.1;
    if (idade <= 28) return 1;
    return [1, 1, 0.97, 0.93, 0.87, 0.8, 0.72][idade - 29] ?? (idade >= 36 ? 0.62 : 0.7);
  }
  // o valor de mercado (R$): cresce rápido com a nota; os da base valem menos. fator: o momento (0,5 a 1,5); a idade (j.idade) entra sozinha
  function valorDe(j, fator = 1) {
    const v = Math.pow(1.18, j.nota - 60) * 1e6 * (j.base === true ? 0.4 : 1) * clamp(fator, 0.5, 1.5) * fatorIdade(j.idade);
    return arred(v, v > 1e7 ? 5e5 : 1e5);
  }
  // o momento do jogador: gols na temporada, os efeitos dos eventos (fase boa ou ruim) e estar à venda (desvaloriza)
  // media: a nota média dos jogos na temporada (com pelo menos 3 jogos): fase ruim desvaloriza, fase boa valoriza
  function fatorForma({ gols = 0, pos = "ATA", efeito = 0, aVenda = false, media = null }) {
    const porGol = ["ATA", "PE", "PD"].includes(pos) ? 0.035 : pos === "GOL" ? 0 : 0.06;
    const fase = media == null ? 1 : media >= 7.2 ? 1.06 : media >= 6.6 ? 1.02 : media <= 5.4 ? 0.88 : media <= 5.8 ? 0.93 : media <= 6.1 ? 0.97 : 1;
    const f = (1 + Math.min(0.35, gols * porGol)) * (1 + 0.05 * efeito) * (aVenda ? 0.93 : 1) * fase;
    return Math.round(clamp(f, 0.5, 1.5) * 100) / 100;
  }
  // por que o preço está abaixo (ou acima) do normal: a lista de motivos para a tela
  function motivosDoValor({ idade, fator = 1 }) {
    const m = [], fi = fatorIdade(idade);
    if (fi < 0.95) m.push(`${idade} anos: ${Math.round((1 - fi) * 100)}% a menos`);
    if (fator < 0.97) m.push(`fase ruim: ${Math.round((1 - fator) * 100)}% a menos`);
    if (fi > 1.02) m.push(`${idade} anos: promessa vale mais`);
    if (fator > 1.03) m.push(`fase boa: ${Math.round((fator - 1) * 100)}% a mais`);
    return m;
  }
  // desvalorizado: o preço está pelo menos 12% abaixo do que a nota pediria (idade ou fase)
  const desvalorizado = ({ idade, fator = 1 }) => fatorIdade(idade) * clamp(fator, 0.5, 1.5) <= 0.9;
  // o salário por mês (R$)
  const salarioDe = (j) => arred(valorDe(j) / 70, 5e3);
  // as janelas: a pré-temporada e as 4 primeiras rodadas, e a do meio do ano (rodadas 17 a 21)
  const janelaAberta = (rodada) => rodada < 4 || (rodada >= 16 && rodada <= 20);
  const proximaJanela = (rodada) => (rodada < 4 ? null : rodada < 16 ? 16 : null);
  const ELENCO_MAX = 36, ELENCO_MIN = 18;
  const CAIXA_INICIAL = { 5: 60e6, 4: 35e6, 3: 20e6, 2: 12e6, 1: 8e6 };
  // o preço pedido na lista de venda: de 70% a 250% do valor
  const PEDIDO_MIN = 0.7, PEDIDO_MAX = 2.5;
  // comprar parcelado: metade agora e o resto, com 10% de juros, em 4 rodadas
  const PARCELAS = 4, JUROS = 0.1, ENTRADA = 0.5;
  // quantas rodadas depois da compra o mercado ainda não paga mais do que você pagou (sem lucro em revenda na hora)
  const CARENCIA = 3;

  // dinheiro curto para a tela: R$ 12,5 mi, R$ 850 mil
  function dinheiro(v) {
    const s = v < 0 ? "-" : "", a = Math.abs(v);
    if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: a >= 1e8 ? 0 : 1 })} mi`;
    if (a >= 1e3) return `${s}R$ ${Math.round(a / 1e3).toLocaleString("pt-BR")} mil`;
    return `${s}R$ ${Math.round(a)}`;
  }

  // a resposta a uma proposta de compra:
  //   jogador, vendedor (o clube dono, com .tamanho), comprador (com .tamanho), titular (se o jogador é dos 11 do dono)
  //   valor e salario oferecidos; fator (o momento); semente (carreira + rodada + jogador); tentativas já feitas
  // devolve { resultado: "aceita" | "contra" | "recusa" | "jogador", pedido?, salarioPedido?, motivo }
  // o que o clube pede por um jogador: o preço (um só por jogador e rodada: pagar isso sempre fecha) e o salário que o jogador quer
  function pedidoDe({ jogador, vendedor, comprador, titular, semente, fator = 1 }) {
    const r = Motor.sorteDe(`proposta:${semente}`);
    const V = valorDe(jogador, fator), apego = (titular ? 1.5 : 1.2) * (vendedor.tamanho >= comprador.tamanho ? 1.08 : 1);
    // o clube nunca pede menos do que a nota do jogador vale (a idade e a fase só abatem parte do preço), 
    const piso = valorDe({ ...jogador, idade: undefined }, 1) * 0.9;
    const minimo = Math.max(V * apego, piso) * (0.94 + r() * 0.12);
    const pedido = Math.ceil(minimo / 1e5) * 1e5; // arredonda para cima: pagar o pedido sempre basta
    // clube menor que o dele precisa pagar mais para convencer o jogador
    const salario = arred(salarioDe(jogador) * (comprador.tamanho < vendedor.tamanho ? 1.25 + 0.1 * (vendedor.tamanho - comprador.tamanho) : 1) * (0.95 + r() * 0.1), 5e3);
    return { V, minimo, pedido, salario };
  }
  function avaliarProposta({ jogador, vendedor, comprador, titular, valor, salario, semente, tentativa = 0, fator = 1 }) {
    const { V, minimo, pedido, salario: pedidoSalario } = pedidoDe({ jogador, vendedor, comprador, titular, semente, fator });
    if (valor < V * 0.6) return { resultado: "recusa", motivo: "A proposta nem chegou a ser discutida: está muito abaixo do valor." };
    if (valor < minimo * 0.88) {
      if (tentativa >= 2) return { resultado: "recusa", motivo: "A diretoria encerrou a conversa por esta rodada." };
      return { resultado: "contra", pedido: pedido, motivo: `O ${vendedor.nome} só libera por ${dinheiro(pedido)}.` };
    }
    if (valor < minimo) return { resultado: "contra", pedido: pedido, motivo: `Quase lá: o ${vendedor.nome} pede ${dinheiro(pedido)}.` };
    // o clube aceitou: agora o jogador
    if (salario < pedidoSalario * 0.95) return { resultado: "jogador", salarioPedido: pedidoSalario, motivo: `O clube aceitou, mas ${jogador.nome} quer ${dinheiro(pedidoSalario)} por mês.` };
    return { resultado: "aceita", motivo: `Negócio fechado! ${jogador.nome} é do seu time.` };
  }
  // o preço mínimo do clube para o leilão da carreira em grupo: o mesmo pedido que ele faria a uma proposta
  const precoMinimo = (args) => pedidoDe(args).pedido;
  // vender na hora para o mercado: sai rápido, mas por menos do que vale
  const vendaRapida = (j, fator = 1) => arred(valorDe(j, fator) * 0.7, 1e5);
  // a chance de chegar proposta numa rodada por um jogador na lista: cai quanto mais alto o pedido; em alta, sobe
  function chanceDeProposta(pedido, valor, fator = 1) {
    const caro = pedido / Math.max(1, valor);
    return clamp(0.85 - 0.55 * (caro - 0.9), 0.04, 0.9) * (fator >= 1.15 ? 1.25 : fator < 0.95 ? 0.8 : 1);
  }
  // a disputa entre clubes (a mecânica do Leilão): cada clube tem até quanto pagaria; os lances sobem, um cobrindo o
  // outro, até sobrar um. limite: depois de qual lance os clubes esfriam (quem espera demais fica só com o primeiro).
  //   clubes: [{ id, teto }] (o teto já considera o caixa do clube); inicio: o primeiro lance
  function disputa(clubes, inicio, sorte) {
    const vivos = clubes.filter((c) => c.teto >= inicio).map((c) => ({ ...c }));
    if (vivos.length < 2) return null;
    const lances = [];
    let atual = arred(inicio, 1e5), quem = vivos[Math.floor(sorte() * vivos.length)];
    lances.push({ clube: quem.id, valor: atual });
    for (let volta = 0; volta < 14; volta++) {
      const outros = vivos.filter((c) => c.id !== quem.id && c.teto >= atual * 1.04);
      if (!outros.length) break;
      quem = outros[Math.floor(sorte() * outros.length)];
      atual = Math.min(quem.teto, arred(atual * (1.04 + sorte() * 0.07), 1e5));
      if (atual <= lances[lances.length - 1].valor) break;
      lances.push({ clube: quem.id, valor: atual });
    }
    if (lances.length < 2) return null;
    // os clubes esfriam em algum momento entre o meio e o fim (nunca antes do segundo lance)
    const limite = Math.max(1, Math.min(lances.length - 1, Math.floor(lances.length * (0.55 + sorte() * 0.6))));
    return { lances, limite };
  }

  return { valorDe, fatorIdade, fatorForma, motivosDoValor, desvalorizado, pedidoDe,  salarioDe, janelaAberta, proximaJanela, avaliarProposta, precoMinimo, vendaRapida, chanceDeProposta, disputa, dinheiro,
    ELENCO_MAX, ELENCO_MIN, CAIXA_INICIAL, PEDIDO_MIN, PEDIDO_MAX, PARCELAS, JUROS, ENTRADA, CARENCIA };
});
