// Carreira em grupo: trocas entre técnicos da sala. Sem limite de nota, de janela nem de cota de compras: quem propõe escolhe o
// técnico, os jogadores dos dois lados e o dinheiro (de quem paga); o outro aceita ou recusa na tela dele. O servidor confere
// se os jogadores ainda são de quem disse e o tamanho dos elencos (carreira-online.js: trocaPropor e trocaResponder).
const TR = { para: null, dou: new Set(), recebo: new Set(), dinheiro: 0, paga: true };

const listaTroca = (ids) => (ids.length ? ids.map((pid) => `<span class="troca-jog"><img class="pix" src="${retrato(pid)}" alt=""><b>${h(sobrenome(nomeJogador(pid)))}</b><small>${JOGADORES[pid] ? notaDe(JOGADORES[pid]) : ""}</small></span>`).join("") : `<span class="suave">ninguém</span>`);
const textoDinheiro = (t, eu) => {
  if (!t.dinheiro) return "";
  const pagaEu = (t.dinheiro > 0) === (t.de === eu);
  return `<span class="troca-grana">${ic("moeda")} ${pagaEu ? "Você paga" : "Você recebe"} ${dinheiro(Math.abs(t.dinheiro))}</span>`;
};
function propostaTrocaHTML(t, deMim) {
  const outro = deMim ? t.para : t.de, tecnico = ((SALA.players || []).find((p) => p.clube === outro) || {}).name || nomeClube(outro);
  const meu = deMim ? t.dou : t.recebo, deles = deMim ? t.recebo : t.dou;
  return `<article class="proposta-troca" data-troca-id="${t.id}">
    <header>${escudo(outro, 1)}<b>${h(nomeClube(outro))}</b><small>${h(tecnico)}</small></header>
    <div class="troca-lados"><div><small>Você manda</small>${listaTroca(meu)}</div><div class="troca-seta">${ic("troca")}</div><div><small>Você recebe</small>${listaTroca(deles)}</div></div>
    ${textoDinheiro(t, E.clube)}
    <footer>${deMim ? `<button class="discreto" data-troca-acao="cancelar">Cancelar proposta</button>` : `<button class="discreto" data-troca-acao="recusar">Recusar</button><button class="primario" data-troca-acao="aceitar">Aceitar a troca</button>`}</footer>
  </article>`;
}
function elencoTrocaHTML(clube, lado) {
  const sel = lado === "dou" ? TR.dou : TR.recebo;
  const jogadores = elencoDe(clube).sort((a, b) => notaDe(b) - notaDe(a));
  return `<div class="troca-elenco">${jogadores.map((j) => `<label class="troca-linha${sel.has(j.id) ? " marcado" : ""}"><input type="checkbox" data-troca="${lado}" value="${j.id}" ${sel.has(j.id) ? "checked" : ""}><img class="pix" src="${retrato(j.id)}" alt=""><span><b>${h(j.nome)}</b><small>${h(j.pos || "")}</small></span><em class="nota-troca">${notaDe(j)}</em></label>`).join("")}</div>`;
}
function telaTrocas() {
  const corpo = $("trocasCorpo");
  if (!EM_GRUPO || !SALA || !E) { corpo.innerHTML = `<section class="quadro"><p class="suave">As trocas são da carreira em grupo: entre numa sala com outros técnicos para propor e aceitar trocas.</p></section>`; return; }
  const abertas = SALA.trocas || [], recebidas = abertas.filter((t) => t.para === E.clube), enviadas = abertas.filter((t) => t.de === E.clube);
  const outros = (SALA.players || []).filter((p) => p.clube && p.clube !== E.clube);
  if (TR.para && !outros.some((p) => p.clube === TR.para)) TR.para = null;
  const dado = $("dadoTrocas"); if (dado) dado.innerHTML = recebidas.length ? `<b>${recebidas.length}</b><small>para você</small>` : "";
  const cabeca = `<section class="quadro troca-aviso"><p>${ic("troca")} <b>Trocas livres.</b> Entre técnicos da sala vale qualquer jogador, de qualquer nota, mesmo com a janela fechada, e não gasta a cota de compras. O dinheiro é por sua conta.</p></section>`;
  const recebidasHTML = `<section class="quadro"><h3>Propostas para você</h3>${recebidas.length ? recebidas.map((t) => propostaTrocaHTML(t, false)).join("") : `<p class="suave">Nenhuma proposta por enquanto.</p>`}</section>`;
  const enviadasHTML = `<section class="quadro"><h3>Suas propostas abertas</h3>${enviadas.length ? enviadas.map((t) => propostaTrocaHTML(t, true)).join("") : `<p class="suave">Você não tem proposta aberta.</p>`}</section>`;
  const tecnicos = outros.length ? `<div class="troca-tecnicos">${outros.map((p) => `<button class="troca-tec${TR.para === p.clube ? " ativo" : ""}" data-troca-para="${p.clube}" style="${coresClube(p.clube)}">${escudo(p.clube, 1)}<span><b>${h(p.name)}</b><small>${h(nomeClube(p.clube))}</small></span></button>`).join("")}</div>` : `<p class="suave">Ainda não tem outro técnico na sala.</p>`;
  const construtor = `<section class="quadro troca-nova"><h3>Nova proposta</h3>${tecnicos}${TR.para ? `
    <div class="troca-colunas"><div><h4>Você manda (${TR.dou.size})</h4>${elencoTrocaHTML(E.clube, "dou")}</div><div><h4>Você pede (${TR.recebo.size})</h4>${elencoTrocaHTML(TR.para, "recebo")}</div></div>
    <div class="troca-dinheiro"><label>Dinheiro <select id="trocaPaga"><option value="1" ${TR.paga ? "selected" : ""}>você paga</option><option value="0" ${TR.paga ? "" : "selected"}>você recebe</option></select></label>
      <label>R$ <input id="trocaValor" type="number" min="0" step="1" value="${TR.dinheiro}"> mi</label><small class="suave">Seu caixa: ${dinheiro(E.caixa)}</small></div>
    <button id="trocaEnviar" class="primario largo" ${TR.dou.size + TR.recebo.size ? "" : "disabled"}>Enviar proposta</button>` : ""}</section>`;
  corpo.innerHTML = `${cabeca}<div class="trocas-grade"><div>${recebidasHTML}${enviadasHTML}</div>${construtor}</div>`;
}
document.addEventListener("click", async (e) => {
  const tec = e.target.closest("[data-troca-para]");
  if (tec) { TR.para = TR.para === tec.dataset.trocaPara ? null : tec.dataset.trocaPara; TR.recebo.clear(); return telaTrocas(); }
  const acao = e.target.closest("[data-troca-acao]");
  if (acao) {
    const id = acao.closest("[data-troca-id]").dataset.trocaId;
    acao.disabled = true;
    const r = await pedir("trocaResponder", { id, acao: acao.dataset.trocaAcao });
    if (!r.ok) { toast(r.error); acao.disabled = false; return; }
    receber(r.estado); toast(acao.dataset.trocaAcao === "aceitar" ? "Troca fechada!" : acao.dataset.trocaAcao === "recusar" ? "Proposta recusada." : "Proposta cancelada.");
    return;
  }
  if (e.target.closest("#trocaEnviar")) {
    const botao = $("trocaEnviar"); botao.disabled = true;
    const mi = Math.max(0, Math.round(Number($("trocaValor").value) || 0)) * 1e6;
    const r = await pedir("trocaPropor", { para: TR.para, dou: [...TR.dou], recebo: [...TR.recebo], dinheiro: TR.paga ? mi : -mi });
    if (!r.ok) { toast(r.error); botao.disabled = false; return; }
    TR.dou.clear(); TR.recebo.clear(); TR.dinheiro = 0; receber(r.estado); toast("Proposta enviada.");
  }
});
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-troca]");
  if (c) { const s = c.dataset.troca === "dou" ? TR.dou : TR.recebo; c.checked ? s.add(c.value) : s.delete(c.value); telaTrocas(); return; }
  if (e.target.id === "trocaPaga") TR.paga = e.target.value === "1";
  if (e.target.id === "trocaValor") TR.dinheiro = Math.max(0, Math.round(Number(e.target.value) || 0));
});
document.getElementById("tileTrocas")?.classList.toggle("hidden", !EM_GRUPO);
