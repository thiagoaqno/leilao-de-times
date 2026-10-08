// Carreira de Treinador (parte 4): a prancheta. Os 11 no campinho, cada um no lugar em que vai jogar (a mesma conta do
// motor), e o banco com o resto do elenco. Tocar num jogador e depois em outro troca os dois de lugar; tocar num do
// banco e depois num do campo (ou o contrário) põe o reserva no time. Cada mudança é salva na hora, com a escalação
// "fixa": o motor respeita o lugar de cada um (quem estiver machucado ou suspenso dá a vaga para o melhor que sobrou).
// A mesma prancheta serve para a parada tática no meio do jogo (partida.js), com a energia de cada um.
let selecionado = null; // { onde: "campo", i } ou { onde: "banco", pid }

const grupoDe = (pos) => Motor.grupoDe(pos);
const encaixe = (pos, slot) => Escalacao.FIT[grupoDe(pos)][slot]; // 1 = posição dele; menos = improvisado
const NOME_VAGA = { GK: "Gol", DEF: "Defesa", MID: "Meio", ATT: "Ataque" };

// o campinho: peças nas posições da formação (spotsOf: o gol embaixo, o ataque em cima)
function campinho(detalhe, formacao, opcoes = {}) {
  const spots = Escalacao.spotsOf(formacao, "futebol");
  return `<div class="gramado">${'<i class="linha-meio"></i><i class="circulo"></i><i class="area cima"></i><i class="area baixo"></i>'}${detalhe.map((v, i) => {
    const s = spots[i]; if (!s) return "";
    if (!v.id) return `<button class="peca vazia" data-i="${i}" style="left:${s.x}%;top:${s.y}%"><span class="sem">?</span><small>${NOME_VAGA[v.slot]}</small></button>`;
    const j = JOGADORES[v.id], fit = encaixe(j.pos, v.slot), energia = opcoes.energia ? opcoes.energia[v.id] : null;
    const sel = opcoes.selecionado === i;
    return `<button class="peca ${faixa(notaDe(j))}${sel ? " sel" : ""}${fit < 0.9 ? " improvisado" : ""}" data-i="${i}" data-jogador="${v.id}" style="left:${s.x}%;top:${s.y}%" title="${h(j.nome)} · ${POS_NOME[j.pos] || j.pos}${fit < 0.9 ? " (improvisado)" : ""}">
      <img class="pix" src="${retrato(v.id)}" alt=""><b>${notaDe(j)}</b><small>${h(sobrenome(j.nome))}</small>
      ${fit < 0.9 ? `<em class="alerta" aria-hidden="true">!</em>` : ""}${energia != null ? `<span class="energia"><i style="--v:${energia}%"></i></span>` : ""}</button>`;
  }).join("")}</div>`;
}

function telaElenco() {
  const t = meuTime(), det = Motor.escalacaoDetalhada(t), esc = E.escalacao;
  const titulares = new Set(det.map((v) => v.id).filter(Boolean));
  $("eCampo").innerHTML = campinho(det, t.formacao, { selecionado: selecionado?.onde === "campo" ? selecionado.i : null });
  const media = det.filter((v) => v.id).reduce((s, v) => s + notaDe(JOGADORES[v.id]), 0) / Math.max(1, titulares.size);
  const improvisados = det.filter((v) => v.id && encaixe(JOGADORES[v.id].pos, v.slot) < 0.9).length;
  $("eDica").innerHTML = E.partida ? `${ic("cadeado")} A partida está em andamento: a prancheta volta depois do apito final.`
    : selecionado ? `${ic("troca")} Agora toque em quem vai trocar de lugar com ${h(sobrenome(nomeJogador(selecionado.onde === "campo" ? det[selecionado.i].id : selecionado.pid)))}. Toque de novo para ver a ficha.`
    : `${ic("dedo")} Toque num jogador e depois em outro para trocar os dois de lugar. Do banco para o campo, entra no time.`;
  $("eForca").innerHTML = `Média dos titulares: <b>${media.toFixed(1)}</b>${improvisados ? ` · <span class="aviso-txt">${improvisados} improvisado${improvisados > 1 ? "s" : ""}</span>` : ""}${esc.fixo ? " · escalação sua" : " · escalação automática"}`;
  // os controles
  const seg = (id, lista, atual, chave) => { $(id).innerHTML = lista.map(([v, t]) => `<button data-${chave}="${v}" aria-pressed="${String(v) === String(atual)}">${t}</button>`).join(""); };
  seg("eFormacao", Object.keys(Escalacao.FORMATIONS.futebol).map((f) => [f, f]), esc.formacao, "formacao");
  seg("eMentalidade", MENTALIDADE.map((t, i) => [i - 2, t]), esc.tatica.mentalidade, "mentalidade");
  seg("ePressao", NIVEL.map((t, i) => [i, t]), esc.tatica.pressao, "pressao");
  seg("eLinha", NIVEL.map((t, i) => [i, t]), esc.tatica.linha, "linha");
  $("eAuto").disabled = !esc.fixo && !esc.titulares;
  // o banco: o resto do elenco, por posição
  const ordem = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
  const reservas = E.elenco.filter((pid) => !titulares.has(pid)).sort((a, b) => ordem.indexOf(JOGADORES[a].pos) - ordem.indexOf(JOGADORES[b].pos) || notaDe(JOGADORES[b]) - notaDe(JOGADORES[a]));
  $("eContagem").textContent = `${E.elenco.length} no elenco`;
  $("eBanco").innerHTML = reservas.map((pid) => `<div class="no-banco${selecionado?.onde === "banco" && selecionado.pid === pid ? " sel" : ""}${fora(pid) ? " indisponivel" : ""}">${figurinha(pid)}</div>`).join("");
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
  const b = e.target.closest("#elenco [data-formacao], #elenco [data-mentalidade], #elenco [data-pressao], #elenco [data-linha]"); if (!b || E.partida) return;
  const esc = E.escalacao;
  if (b.dataset.formacao) {
    // os mesmos 11, e o motor acha o melhor lugar de cada um na formação nova
    const ids = Motor.escalacaoDetalhada(meuTime()).map((v) => v.id).filter(Boolean);
    selecionado = null;
    return salvarEscalacao(ids.length === 11 && esc.titulares ? { formacao: b.dataset.formacao, titulares: ids, fixo: false } : { formacao: b.dataset.formacao }, { tipo: "formacao" });
  }
  const k = ["mentalidade", "pressao", "linha"].find((x) => b.dataset[x] != null);
  salvarEscalacao({ tatica: { ...esc.tatica, [k]: +b.dataset[k] } });
});
$("eAuto").onclick = () => { selecionado = null; salvarEscalacao({ titulares: null }, { tipo: "formacao" }); };
