// Carreira de Treinador: mostra em números o que cada escolha tática muda (mentalidade, pressão, linha de defesa e estilo de jogo),
// na prancheta (elenco.js) e na parada tática do jogo (partida.js). As contas vêm de Taticas.efeitos (as mesmas do motor).
// cada conta: [chave, o que é, a frase quando cai, a frase quando sobe, +1 se subir é bom para você / -1 se subir é ruim]
const ROTULOS_EFEITO = [
  ["criar", "Seus lances", "Você cria menos lances", "Você cria mais lances", 1],
  ["sofrer", "Lances do rival", "Rival cria menos lances", "Rival cria mais lances", -1],
  ["seuFinalizar", "Sua conversão", "Você converte menos", "Você converte mais", 1],
  ["rivalFinalizar", "Conversão do rival", "Rival converte menos", "Rival converte mais", -1],
  ["cansaco", "Cansaço", "Time cansa menos", "Time cansa mais", -1],
  ["faltas", "Faltas e cartões", "Menos faltas e cartões", "Mais faltas e cartões", -1],
];
const sinal = (n) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%");
// as seis contas de uma tática: a frase diz o que muda e, embaixo, em pequeno, a porcentagem em verde (a seu favor) ou vermelho (contra você)
function chipsDeEfeito(ef) {
  return `<div class="efeitos">${ROTULOS_EFEITO.map(([k, nome, cai, sobe, bom]) => { const v = ef[k], cls = v === 0 ? "neutro" : v * bom > 0 ? "bom" : "ruim";
    return `<span class="efeito ${cls}"><small>${nome}</small><span class="efeito-txt">${v === 0 ? "Sem mudança" : v < 0 ? cai : sobe}</span><span class="efeito-sub ${cls}">${sinal(v)}${v === 0 ? "" : v * bom > 0 ? " · a seu favor" : " · contra você"}</span></span>`; }).join("")}</div>`;
}
// as contas da tática de agora, com o estilo de jogo e o encaixe do elenco
function efeitosDaTatica(tatica, time) {
  const r = Motor.resumoDoEstilo(time, tatica.estilo);
  return { ef: Taticas.efeitos(tatica, r.fat), f: r.f, perfil: r.perfil };
}
// o que muda ao escolher uma opção, dito em palavras (vai no title do botão e na linha explicativa)
function dicaDaOpcao(tatica, chave, valor, time) {
  const atual = efeitosDaTatica(tatica, time).ef, novo = efeitosDaTatica({ ...tatica, [chave]: valor }, time).ef, partes = [];
  for (const [k, nome, , , bom] of ROTULOS_EFEITO) { const d = novo[k] - atual[k]; if (d) partes.push(`${nome} ${d > 0 ? "+" : "−"}${Math.abs(d)}% (${d * bom > 0 ? "a seu favor" : "contra você"})`); }
  return partes.length ? `Em relação ao que você tem agora: ${partes.join(" · ")}.` : "É o que você tem agora.";
}
// o painel do estilo de jogo: os botões, o que o estilo faz, o encaixe do elenco e o que ele cobra
function estiloHTML(tatica, time, atributo = "data-estilo") {
  const est = Taticas.ESTILOS[Taticas.estiloValido(tatica.estilo)], r = Motor.resumoDoEstilo(time, tatica.estilo);
  const botoes = Taticas.NOMES_ESTILOS.map((id) => { const fe = id === "equilibrado" ? null : Math.round(Motor.resumoDoEstilo(time, id).f * 100);
    return `<button ${atributo}="${id}" aria-pressed="${id === Taticas.estiloValido(tatica.estilo)}" title="${h(Taticas.ESTILOS[id].desc)}${fe != null ? ` Encaixe do seu elenco: ${fe}%.` : ""}">${h(Taticas.ESTILOS[id].nome)}${fe != null ? `<span class="estilo-pct">${fe}%</span>` : ""}</button>`; }).join("");
  const pct = Math.round(r.f * 100);
  const encaixe = tatica.estilo && tatica.estilo !== "equilibrado"
    ? `<p class="estilo-encaixe ${r.f >= 1 ? "bom" : r.f >= 0.6 ? "medio" : "ruim"}"><b>Encaixe do elenco: ${pct}%</b> · ${h(est.perfil)}: ${r.perfil}. ${r.f >= 1 ? "O elenco tem o perfil: o bônus vale inteiro." : r.f >= 0.6 ? "O elenco tem parte do perfil: o bônus vem pela metade ou mais." : "O elenco não tem o perfil: quase não há bônus, mas o custo continua."}</p>` : "";
  return `<div class="segmentos largos">${botoes}</div><p class="suave estilo-desc">${h(est.desc)}</p>${encaixe}`;
}
