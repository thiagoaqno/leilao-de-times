// Carreira de Treinador: a disputa entre clubes por um jogador seu (a mecânica do Leilão). Os lances que o servidor já
// sorteou aparecem um por um, cada clube cobrindo o outro, e você bate o martelo quando achar bom. Esperar dá mais
// dinheiro, mas os clubes esfriam em algum momento que só o servidor sabe: aí sobra só o primeiro lance.
const RITMO_DISPUTA = 1100; // ms entre um lance e o próximo
let disputaAberta = null;
function abrirDisputa(id) {
  const e = E.caixaEntrada.find((x) => x.id === id);
  if (!e || e.resolvido) return toast("Essa disputa já acabou.");
  disputaAberta = { e, i: 0, timer: null };
  desenharDisputa();
  if (!$("disputa").open) $("disputa").showModal();
  proximoLance();
}
function proximoLance() {
  const d = disputaAberta; if (!d) return;
  clearTimeout(d.timer);
  if (d.i >= d.e.dados.lances.length - 1) return; // o último lance: agora é com você
  d.timer = setTimeout(() => { d.i++; desenharDisputa(true); proximoLance(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 700 : RITMO_DISPUTA);
}
function desenharDisputa(novo = false) {
  const { e, i } = disputaAberta, l = e.dados.lances, atual = l[i], pid = e.dados.jogador, valor = e.dados.valor;
  const clubes = [...new Set(l.map((x) => x.clube))];
  $("dsCorpo").innerHTML = `
    <div class="ds-topo">${figurinha(pid)}<div><span class="sobre">Disputa no mercado</span><h2 id="dsTitulo">${h(nomeJogador(pid))}</h2>
      <p class="suave">Vale ${dinheiro(valor)}${E.compras[pid] ? ` · você pagou ${dinheiro(E.compras[pid].valor)}` : ""}. ${clubes.length} clubes na briga.</p></div></div>
    <div class="ds-clubes">${clubes.map((c) => `<span class="${c === atual.clube ? "na-frente" : ""}">${escudo(c, 2)}<small>${h(CLUBES[c].curto || CLUBES[c].nome)}</small></span>`).join("")}</div>
    <div class="ds-lance${novo ? " novo" : ""}"><span>Lance ${i + 1}</span><b>${dinheiro(atual.valor)}</b><small>${escudo(atual.clube, 1)} ${h(nomeClube(atual.clube))}${atual.valor > valor ? ` · <span class="positivo">${Math.round((atual.valor / valor - 1) * 100)}% acima do valor</span>` : ""}</small></div>
    <ol class="ds-historico">${l.slice(0, i + 1).map((x, k) => `<li class="${k === i ? "atual" : ""}">${escudo(x.clube, 1)} ${dinheiro(x.valor)}</li>`).reverse().join("")}</ol>
    <p class="suave ds-dica">${i >= l.length - 1 ? "Ninguém cobriu esse lance. Bata o martelo (ou espere demais e veja os clubes esfriarem)." : "Os lances continuam subindo. Quem espera demais pode ficar só com o primeiro lance."}</p>
    <div class="linha fim"><button id="dsManter" class="secundario">Manter o jogador</button><button id="dsMartelo" class="primario">${ic("martelo")} Bater o martelo: ${dinheiro(atual.valor)}</button></div>`;
  $("dsMartelo").onclick = () => responderDisputa(`martelo-${disputaAberta.i}`);
  $("dsManter").onclick = () => responderDisputa("recusar");
}
async function responderDisputa(opcao) {
  const d = disputaAberta; if (!d) return;
  clearTimeout(d.timer);
  for (const b of $("dsCorpo").querySelectorAll("button")) b.disabled = true;
  const r = await pedir("evento", { id: d.e.id, opcao });
  if (!r.ok) { toast(r.error); $("disputa").close(); return; }
  receber(r.estado);
  const vendeu = opcao !== "recusar", esfriou = /esfriaram/.test(r.mensagem || "");
  $("dsCorpo").innerHTML = `<div class="ds-fim ${vendeu ? (esfriou ? "ruim" : "bom") : ""}"><span class="ds-martelo">${ic("martelo")}</span><h2>${vendeu ? (esfriou ? "Os clubes esfriaram..." : "Vendido!") : "Ficou no elenco"}</h2><p>${h(r.mensagem || "")}</p>
    <button id="dsOk" class="primario largo">Fechar</button></div>`;
  $("dsOk").onclick = () => $("disputa").close();
  if (vendeu && !esfriou) festa();
}
$("disputaFechar").innerHTML = ic("fechar");
$("disputaFechar").onclick = () => $("disputa").close();
$("disputa").addEventListener("close", () => { if (disputaAberta) clearTimeout(disputaAberta.timer); disputaAberta = null; if (telaAtual === "sede") desenharTela("sede"); });
