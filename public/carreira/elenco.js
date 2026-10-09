// Carreira de Treinador (parte 4): a prancheta. Os 11 no campinho, cada um no lugar em que vai jogar (a mesma conta do
// motor), e o banco com o resto do elenco. Tocar num jogador e depois em outro troca os dois de lugar; tocar num do
// banco e depois num do campo (ou o contrário) põe o reserva no time. Cada mudança é salva na hora, com a escalação
// "fixa": o motor respeita o lugar de cada um (quem estiver machucado ou suspenso dá a vaga para o melhor que sobrou).
// A mesma prancheta serve para a parada tática no meio do jogo (partida.js), com a energia de cada um.
let selecionado = null; // { onde: "campo", i } ou { onde: "banco", pid }

const grupoDe = (pos) => Motor.grupoDe(pos);
const encaixe = (pos, vaga) => Taticas.afinidade(pos, vaga); // 1 = posição dele; menos = improvisado (lateral na zaga, ponta de centroavante...)
const NOME_VAGA = { GOL: "Gol", ZAG: "Zagueiro", LE: "Lat. esq.", LD: "Lat. dir.", VOL: "Volante", MC: "Meio", MEI: "Meia", PE: "Ponta esq.", PD: "Ponta dir.", ATA: "Centroavante", F9: "Falso 9" };

// a energia do jogador (0 a 100): o cansaço dos jogos anteriores; a barra muda de cor quando cai
const nivelEnergia = (e) => (e < 45 ? "baixa" : e < 70 ? "media" : "");
const energiaDe = (pid) => (E.energia && E.energia[pid] != null ? E.energia[pid] : 100);
// o campinho: peças nas posições da formação (spotsOf: o gol embaixo, o ataque em cima)
function campinho(detalhe, formacao, opcoes = {}) {
  const spots = Taticas.spots(formacao);
  return `<div class="gramado">${'<i class="linha-meio"></i><i class="circulo"></i><i class="area cima"></i><i class="area baixo"></i>'}${detalhe.map((v, i) => {
    const s = spots[i]; if (!s) return "";
    if (!v.id) return `<button class="peca vazia" data-i="${i}" style="left:${s.x}%;top:${s.y}%"><span class="sem">?</span><small>${NOME_VAGA[v.fino] || v.fino}</small></button>`;
    const j = JOGADORES[v.id], fit = encaixe(j.pos, v.fino), energia = opcoes.energia ? opcoes.energia[v.id] : null;
    const nota = notaDe(j), cansaco = energia != null ? Taticas.penalidadeEnergia(energia) : 0, rendimento = Math.round((nota - cansaco) * fit);
    const sel = opcoes.selecionado === i;
    return `<button class="peca ${faixa(nota)}${sel ? " sel" : ""}${fit < 1 ? " improvisado" : ""}" data-i="${i}" data-jogador="${v.id}" data-nota="${nota}" data-rendimento="${rendimento}" data-fit="${fit}" style="left:${s.x}%;top:${s.y}%" title="${h(j.nome)} · ${POS_NOME[j.pos] || j.pos}${fit < 1 ? ` · rende ${rendimento} nesta faixa do campo` : ""}${cansaco ? ` · cansaço: -${cansaco} na nota (energia ${energia}%)` : ""}">
      <span class="peca-mudancas">${seloMudancaNota(v.id)}${seloEfeitoNota(v.id)}</span>
      <img class="pix" src="${retrato(v.id)}" alt=""><span class="nota-em-campo"><b>${nota}</b>${rendimento !== nota ? `<em>→ ${rendimento}${cansaco ? `<i class="cansaco-tag">-${cansaco}</i>` : ""}</em>` : ""}</span><small>${h(sobrenome(j.nome))}</small>
      ${energia != null ? `<span class="energia ${nivelEnergia(energia)}" title="Energia ${energia}%"><i style="--v:${energia}%"></i></span>` : ""}</button>`;
  }).join("")}</div>`;
}

function telaElenco() {
  const t = meuTime(), det = Motor.escalacaoDetalhada(t), esc = E.escalacao;
  const titulares = new Set(det.map((v) => v.id).filter(Boolean));
  $("eCampo").innerHTML = campinho(det, t.formacao, { selecionado: selecionado?.onde === "campo" ? selecionado.i : null, energia: E.energia });
  const comJogador = det.filter((v) => v.id), media = comJogador.reduce((s, v) => s + notaDe(JOGADORES[v.id]), 0) / Math.max(1, titulares.size);
  const mediaPosicao = comJogador.reduce((s, v) => s + (notaDe(JOGADORES[v.id]) - Taticas.penalidadeEnergia(energiaDe(v.id))) * encaixe(JOGADORES[v.id].pos, v.fino), 0) / Math.max(1, titulares.size);
  const energiaMedia = comJogador.reduce((s, v) => s + energiaDe(v.id), 0) / Math.max(1, comJogador.length);
  const improvisados = det.filter((v) => v.id && encaixe(JOGADORES[v.id].pos, v.fino) < 1).length;
  $("eDica").innerHTML = E.partida ? `${ic("cadeado")} A partida está em andamento: a prancheta volta depois do apito final.`
    : selecionado ? `${ic("troca")} Agora toque em quem vai trocar de lugar com ${h(sobrenome(nomeJogador(selecionado.onde === "campo" ? det[selecionado.i].id : selecionado.pid)))}. Toque de novo para ver a ficha.`
    : `${ic("dedo")} Toque num jogador e depois em outro para trocar os dois de lugar. Do banco para o campo, entra no time.`;
  $("eForca").innerHTML = `Média dos titulares: <b>${media.toFixed(1)}</b> · energia: <b class="${energiaMedia < 70 ? "aviso-txt" : ""}">${Math.round(energiaMedia)}%</b> · rendimento nas posições: <b class="${mediaPosicao < media - 0.05 ? "aviso-txt" : ""}">${mediaPosicao.toFixed(1)}</b>${improvisados ? ` · <span class="aviso-txt">${improvisados} improvisado${improvisados > 1 ? "s" : ""}</span>` : ""}${efeitoDe("time") ? ` · time ${sinalDe(efeitoDe("time"))} no próximo jogo` : ""}${esc.fixo ? " · escalação sua" : " · escalação automática"}`;
  // os controles
  const seg = (id, lista, atual, chave) => { $(id).innerHTML = lista.map(([v, t]) => `<button data-${chave}="${v}" aria-pressed="${String(v) === String(atual)}">${t}</button>`).join(""); };
  // o esquema (4-3-3, 4-2-3-1...) e, embaixo, as variações dele (1 volante e 2 meias, 2 volantes e 1 meia...)
  const esquema = Taticas.baseDe(esc.formacao), variacoes = Taticas.variacoesDe(esquema);
  seg("eFormacao", Taticas.ESQUEMAS.map((e) => [e, e]), esquema, "esquema");
  seg("eVariacao", variacoes.map((f) => [f, Taticas.ROTULO_FORMACAO[f]]), esc.formacao, "formacao");
  $("eVariacao").previousElementSibling.classList.toggle("hidden", variacoes.length < 2); $("eVariacao").classList.toggle("hidden", variacoes.length < 2);
  $("eFormacaoInfo").textContent = Taticas.DESCRICAO_FORMACAO[esc.formacao] || "";
  seg("eMentalidade", MENTALIDADE.map((t, i) => [i - 2, t]), esc.tatica.mentalidade, "mentalidade");
  seg("ePressao", NIVEL.map((t, i) => [i, t]), esc.tatica.pressao, "pressao");
  seg("eLinha", NIVEL.map((t, i) => [i, t]), esc.tatica.linha, "linha");
  // o que cada opção muda (title) e o painel com as contas do que está escolhido
  const tat = { ...esc.tatica, estilo: esc.tatica.estilo || "equilibrado" };
  for (const [id, chave] of [["eMentalidade", "mentalidade"], ["ePressao", "pressao"], ["eLinha", "linha"]]) for (const b of $(id).querySelectorAll("button")) b.title = dicaDaOpcao(tat, chave, +b.dataset[chave], t);
  $("eEstilo").innerHTML = estiloHTML(tat, t);
  $("eEfeitos").innerHTML = chipsDeEfeito(efeitosDaTatica(tat, t).ef);
  $("eAuto").disabled = !esc.fixo && !esc.titulares;
  // o banco: o resto do elenco, por posição
  const ordem = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
  const reservas = E.elenco.filter((pid) => !titulares.has(pid)).sort((a, b) => ordem.indexOf(JOGADORES[a].pos) - ordem.indexOf(JOGADORES[b].pos) || notaDe(JOGADORES[b]) - notaDe(JOGADORES[a]));
  $("eContagem").textContent = `${E.elenco.length} no elenco`;
  $("eBanco").innerHTML = reservas.map((pid) => `<div class="no-banco${selecionado?.onde === "banco" && selecionado.pid === pid ? " sel" : ""}${fora(pid) ? " indisponivel" : ""}">${figurinha(pid)}<span class="energia ${nivelEnergia(energiaDe(pid))}" title="Energia ${energiaDe(pid)}%"><i style="--v:${energiaDe(pid)}%"></i></span></div>`).join("");
}
async function salvarEscalacao(dados, movimento = {}) {
  const antes = AnimacoesCarreira.capturarEscalacao();
  const r = await pedir("escalacao", dados);
  if (!r.ok) { toast(r.error); return false; }
  receber(r.estado); AnimacoesCarreira.animarEscalacao(antes, movimento); return true;
}
// tocar no campo e no banco
$("eCampo").addEventListener("click", async (e) => {
  const b = e.target.closest(".peca"); if (!b || E.partida) return;
  const i = +b.dataset.i, det = Motor.escalacaoDetalhada(meuTime()), ids = det.map((v) => v.id);
  if (selecionado?.onde === "campo" && selecionado.i === i) { selecionado = null; if (ids[i]) abrirFicha(ids[i]); return telaElenco(); }
  let envolvidos = [];
  if (selecionado?.onde === "campo") { envolvidos = [ids[i], ids[selecionado.i]]; [ids[i], ids[selecionado.i]] = [ids[selecionado.i], ids[i]]; selecionado = null; }
  else if (selecionado?.onde === "banco") { envolvidos = [ids[i], selecionado.pid]; ids[i] = selecionado.pid; selecionado = null; }
  else { selecionado = { onde: "campo", i }; return telaElenco(); }
  if (ids.some((x) => !x)) { telaElenco(); return toast("Falta gente para completar os 11."); }
  await salvarEscalacao({ titulares: ids, fixo: true }, { tipo: "troca", envolvidos });
});
$("eBanco").addEventListener("click", async (e) => {
  const f = e.target.closest(".figurinha"); if (!f || E.partida) return;
  const pid = f.dataset.jogador;
  if (selecionado?.onde === "banco" && selecionado.pid === pid) { selecionado = null; telaElenco(); return abrirFicha(pid); }
  if (selecionado?.onde === "campo") {
    const ids = Motor.escalacaoDetalhada(meuTime()).map((v) => v.id), i = selecionado.i;
    selecionado = null;
    if (fora(pid)) { telaElenco(); return toast(`${nomeJogador(pid)} não pode jogar (${fora(pid) === "lesao" ? "lesionado" : "suspenso"}).`); }
    ids[i] = pid;
    if (ids.some((x) => !x)) { telaElenco(); return toast("Falta gente para completar os 11."); }
    return salvarEscalacao({ titulares: ids, fixo: true }, { tipo: "troca", envolvidos: [pid] });
  }
  selecionado = { onde: "banco", pid }; telaElenco();
});
// formação e tática
document.addEventListener("click", async (e) => {
  const b = e.target.closest("#elenco [data-formacao], #elenco [data-esquema], #elenco [data-mentalidade], #elenco [data-pressao], #elenco [data-linha], #elenco [data-estilo]"); if (!b || E.partida) return;
  const esc = E.escalacao;
  if (b.dataset.formacao || b.dataset.esquema) {
    // trocar de esquema vai para a variação padrão dele (o nome do esquema); os mesmos 11 e o motor acha o melhor lugar de cada um
    const formacao = b.dataset.formacao || b.dataset.esquema;
    const ids = Motor.escalacaoDetalhada(meuTime()).map((v) => v.id).filter(Boolean);
    selecionado = null;
    return salvarEscalacao(ids.length === 11 && esc.titulares ? { formacao, titulares: ids, fixo: false } : { formacao }, { tipo: "formacao" });
  }
  if (b.dataset.estilo) return salvarEscalacao({ tatica: { ...esc.tatica, estilo: b.dataset.estilo } });
  const k = ["mentalidade", "pressao", "linha"].find((x) => b.dataset[x] != null);
  salvarEscalacao({ tatica: { ...esc.tatica, [k]: +b.dataset[k] } });
});
$("eAuto").onclick = () => { selecionado = null; salvarEscalacao({ titulares: null }, { tipo: "formacao" }); };
