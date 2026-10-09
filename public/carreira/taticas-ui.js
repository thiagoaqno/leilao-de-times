// Carreira de Treinador: mostra em números o que cada escolha tática muda (mentalidade, pressão, linha de defesa e estilo de jogo),
// na prancheta (elenco.js) e na parada tática do jogo (partida.js). As contas vêm de Taticas.efeitos (as mesmas do motor).
const ROTULOS_EFEITO = [
  ["criar", "Lances que você cria", 1], ["sofrer", "Lances que o rival cria", -1], ["seuFinalizar", "Sua conversão", 1],
  ["rivalFinalizar", "Conversão do rival", -1], ["cansaco", "Cansaço do time", -1], ["faltas", "Faltas e cartões", -1],
];
const sinal = (n) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%");
// as seis contas de uma tática: verde o que ajuda, vermelho o que cobra (o sinal de "bom" muda: criar mais é bom, o rival criar mais é ruim)
function chipsDeEfeito(ef) {
  return `<div class="efeitos">${ROTULOS_EFEITO.map(([k, nome, bom]) => { const v = ef[k], cls = v === 0 ? "neutro" : v * bom > 0 ? "bom" : "ruim"; return `<span class="efeito ${cls}"><small>${nome}</small><b>${sinal(v)}</b></span>`; }).join("")}</div>`;
}
// as contas da tática de agora, com o estilo de jogo e o encaixe do elenco
function efeitosDaTatica(tatica, time) {
  const r = Motor.resumoDoEstilo(time, tatica.estilo);
  return { ef: Taticas.efeitos(tatica, r.fat), f: r.f, perfil: r.perfil };
}
// o que muda ao escolher uma opção, dito em palavras (vai no title do botão e na linha explicativa)
function dicaDaOpcao(tatica, chave, valor, time) {
  const atual = efeitosDaTatica(tatica, time).ef, novo = efeitosDaTatica({ ...tatica, [chave]: valor }, time).ef, partes = [];
  for (const [k, nome] of ROTULOS_EFEITO) { const d = novo[k] - atual[k]; if (d) partes.push(`${nome} ${d > 0 ? "+" : "−"}${Math.abs(d)}%`); }
  return partes.length ? `Em relação ao que você tem agora: ${partes.join(" · ")}.` : "É o que você tem agora.";
}
// o painel do estilo de jogo: os botões, o que o estilo faz, o encaixe do elenco e o que ele cobra
function estiloHTML(tatica, time, atributo = "data-estilo") {
  const est = Taticas.ESTILOS[Taticas.estiloValido(tatica.estilo)], r = Motor.resumoDoEstilo(time, tatica.estilo);
  const botoes = Taticas.NOMES_ESTILOS.map((id) => `<button ${atributo}="${id}" aria-pressed="${id === Taticas.estiloValido(tatica.estilo)}" title="${h(Taticas.ESTILOS[id].desc)}">${h(Taticas.ESTILOS[id].nome)}</button>`).join("");
  const pct = Math.round(r.f * 100);
  const encaixe = tatica.estilo && tatica.estilo !== "equilibrado"
    ? `<p class="estilo-encaixe ${r.f >= 1 ? "bom" : r.f >= 0.6 ? "medio" : "ruim"}"><b>Encaixe do elenco: ${pct}%</b> · ${h(est.perfil)}: ${r.perfil}. ${r.f >= 1 ? "O elenco tem o perfil: o bônus vale inteiro." : r.f >= 0.6 ? "O elenco tem parte do perfil: o bônus vem pela metade ou mais." : "O elenco não tem o perfil: quase não há bônus, mas o custo continua."}</p>` : "";
  return `<div class="segmentos largos">${botoes}</div><p class="suave estilo-desc">${h(est.desc)}</p>${encaixe}`;
}
