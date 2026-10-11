// Carreira de Treinador: o elenco e a escalação de qualquer clube, só para ver (o dos amigos da sala também). Tocar num
// clube marcado com data-time (a tabela, o calendário, o próximo jogo, a turma da sala) abre a janela com o campinho do
// time que entraria em campo agora e o resto do elenco em figurinhas; tocar num jogador abre a ficha dele, com a proposta.
// O servidor monta tudo (fichaDoTime, em carreira.js): a escalação de um técnico é a dele, a do computador é a automática.
(() => {
  let aberto = null, pedido = 0;
  const dlg = $("verTime"), corpo = $("vtCorpo");

  function desenhar(t) {
    for (const [id, j] of Object.entries(t.jovens || {})) if (!JOGADORES[id]) { JOGADORES[id] = { ...j, origem: id.replace(/-t\d+b\d+$/, "") }; registrarRosto(j); }
    const titulares = new Set(t.campo.map((v) => v.id).filter(Boolean));
    const reservas = t.elenco.filter((pid) => !titulares.has(pid) && JOGADORES[pid]);
    const estilo = (Taticas.ESTILOS[t.estilo] || {}).nome || "";
    const quem = t.tecnico ? `Técnico: ${t.tecnico}` : "Comandado pelo computador";
    const fora = Object.keys(t.fora || {}).length;
    corpo.innerHTML = `<header class="vt-topo">${escudo(t.clube, 3)}<div><span class="sobre">${h(quem)}${t.clube === E.clube ? " · o seu time" : ""}</span><h2 id="vtTitulo">${h(nomeClube(t.clube))}</h2>
        <p class="vt-numeros"><span><b>${h(Taticas.baseDe(t.formacao))}</b>${h(Taticas.ROTULO_FORMACAO[t.formacao] || "formação")}</span>${estilo ? `<span><b>${h(estilo)}</b>estilo</span>` : ""}<span><b>${t.forca}</b>força</span><span><b>${t.elenco.length}</b>jogadores</span></p></div></header>
      <div class="vt-grade"><section><h3>${t.tecnico ? "A escalação de agora" : "O time provável"}</h3><div class="campo">${campinho(t.campo, t.formacao)}</div>
        ${fora ? `<p class="suave">${fora} fora do próximo jogo (lesão ou suspensão).</p>` : ""}</section>
        <section><h3>Banco e resto do elenco</h3><div class="lista-mercado vt-banco">${reservas.map((pid) => figurinha(pid)).join("") || `<p class="suave vazio">Ninguém além dos titulares.</p>`}</div></section></div>`;
  }

  async function abrirTime(id) {
    if (!E || !CLUBES[id]) return;
    aberto = id; const meu = ++pedido;
    dlg.style.cssText = `${coresClube(id)};${temaClube(id)}`;
    corpo.innerHTML = `<header class="vt-topo">${escudo(id, 3)}<div><span class="sobre">Elenco</span><h2 id="vtTitulo">${h(nomeClube(id))}</h2></div></header><p class="suave">Buscando o elenco...</p>`;
    if (!dlg.open) dlg.showModal();
    const r = await pedir("verTime", { clube: id });
    if (meu !== pedido || aberto !== id || !dlg.open) return;
    if (!r.ok) { dlg.close(); return toast(r.error); }
    desenhar(r.time);
  }

  $("vtFechar").innerHTML = ic("fechar");
  $("vtFechar").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) return dlg.close();
    const p = e.target.closest(".peca[data-jogador]"); if (p) abrirFicha(p.dataset.jogador);
  });
  dlg.addEventListener("close", () => { aberto = null; });
  // os clubes que abrem a janela: qualquer coisa com data-time, menos dentro dela mesma e dos botões que já fazem outra coisa
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-time]");
    if (!el || el.closest("#verTime") || e.target.closest("button:not([data-time]), a, [data-ir]")) return;
    e.preventDefault(); abrirTime(el.dataset.time);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest && e.target.closest("[data-time][tabindex]"); if (!el) return;
    e.preventDefault(); abrirTime(el.dataset.time);
  });
  window.VerTime = { abrir: abrirTime };
})();
