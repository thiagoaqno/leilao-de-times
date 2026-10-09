// Carreira de Treinador: a tela Clube, a gestão que muda o futuro. Contratos e multas, a base com potencial escondido, a
// estrutura (obras que ficam prontas na virada), o vestiário (capitão e as consequências a caminho), a carreira do técnico
// (reputação e habilidades), o legado (hall da fama, camisa aposentada, recordes, linha do tempo e o cartão para compartilhar)
// e os rivais da sala. Os números vêm do servidor em E.gestao; os preços da renovação usam as mesmas contas (clube-regras.js).
(function () {
  const R = ClubeRegras;
  const CL = { aba: "contratos", renovando: null, anos: 2, multa: "baixa", cartao: false };
  const ABAS = [["contratos", "Contratos"], ["base", "Base"], ["estrutura", "Estrutura"], ["vestiario", "Vestiário"], ["tecnico", "Técnico"], ["legado", "Legado"], ["rivais", "Rivais"]];
  const g = () => E.gestao;
  const barra = (v, cls = "") => `<span class="medidor gc-barra ${cls}"><i style="--v:${Math.max(0, Math.min(100, v))}%"></i></span>`;
  const pips = (n, max = R.INFRA_MAX) => `<span class="gc-pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "acesa" : ""}"></i>`).join("")}</span>`;
  const anosTxt = (n) => (n <= 0 ? "acabou" : n === 1 ? "último ano" : `${n} anos`);
  const nomeDe = (pid) => (JOGADORES[pid] ? JOGADORES[pid].nome : "alguém");
  const linhaPos = (pos) => `<span class="gc-pos">${h(pos)}</span>`;

  async function agir(dados, botao) {
    if (botao) botao.disabled = true;
    const r = await pedir("clube", dados);
    if (botao) botao.disabled = false;
    if (!r.ok) return toast(r.error);
    if (r.estado) receber(r.estado);
    if (r.mensagem) toast(r.mensagem);
    return r;
  }

  // ---------- contratos ----------
  function termosAgora(pid, anos, multa) {
    const j = JOGADORES[pid], gg = g(), k = gg.contratos.find((x) => x.id === pid);
    return R.termos({ salario: salarioDe(j), nota: notaDe(j), anos, multa, negociador: gg.habilidades.negociador || 0, moral: E.moral, recusou: !!(k && k.recusou) });
  }
  function painelRenovar(pid) {
    const j = JOGADORES[pid], t = termosAgora(pid, CL.anos, CL.multa), valor = Mercado.valorDe(comNota(j), formaDe(pid)), mult = R.MULTAS[CL.multa].mult;
    const faltando = E.caixa < t.luvas;
    return `<div class="gc-renovar"><div class="gc-opcoes"><span>Anos</span>${[1, 2, 3].map((n) => `<button data-gc-anos="${n}" aria-pressed="${n === CL.anos}">${n}</button>`).join("")}</div>
      <div class="gc-opcoes"><span>Multa</span>${Object.entries(R.MULTAS).map(([id, m]) => `<button data-gc-multa="${id}" aria-pressed="${id === CL.multa}" title="${h(m.texto)}">${h(m.nome)}</button>`).join("")}</div>
      <p class="gc-conta"><b>${dinheiro(t.salario)}</b>/mês <small>(+${t.aumento}%)</small> · luvas <b class="${faltando ? "neg" : ""}">${dinheiro(t.luvas)}</b>${mult ? ` · multa ${dinheiro(Math.round(valor * mult / 1e5) * 1e5)}` : ""}</p>
      <p class="suave">${h(R.MULTAS[CL.multa].texto)}</p>
      <div class="gc-acoes"><button data-gc-fechar-contrato="${pid}" ${faltando ? "disabled" : ""}>Fechar contrato</button><button class="secundario" data-gc-cancelar>Cancelar</button></div></div>`;
  }
  function abaContratos() {
    const gg = g(), lista = [...gg.contratos].sort((a, b) => a.anos - b.anos || notaDe(JOGADORES[b.id]) - notaDe(JOGADORES[a.id]));
    const linha = (k) => {
      const j = JOGADORES[k.id]; if (!j) return "";
      const urgente = k.anos <= 1, cap = gg.capitao === k.id;
      return `<li class="gc-linha ${urgente ? "urgente" : ""}"><button class="gc-jogador" data-jogador="${k.id}"><span class="gc-nota ${faixa(notaDe(j))}">${notaDe(j)}</span><b>${h(j.nome)}${cap ? ` <i class="gc-cap" title="Capitão">C</i>` : ""}</b>${linhaPos(j.pos)}</button>
        <span class="gc-contrato"><b>${anosTxt(k.anos)}</b><small>até ${E.ano - E.temporada + k.fim}${k.multa ? ` · multa ${dinheiro(k.multa)}` : " · sem multa"}</small></span>
        <span class="gc-salario">${dinheiro(salarioDe(j))}<small>/mês</small></span>
        <button class="${urgente ? "" : "secundario"}" data-gc-renovar="${k.id}">${CL.renovando === k.id ? "Fechar" : "Renovar"}</button>
        ${CL.renovando === k.id ? painelRenovar(k.id) : ""}</li>`;
    };
    const acabando = lista.filter((k) => k.anos <= 1);
    return `<section class="quadro"><h3>Contratos</h3><p class="suave">Quem chega ao fim do contrato sai de graça na virada da temporada. Renovar custa luvas e aumenta o salário; a multa rescisória define quanto outro clube precisa pagar para levar o jogador no meio do contrato.</p>
      ${acabando.length ? `<p class="gc-aviso">${ic("alerta")} ${acabando.length} no último ano: ${h(acabando.slice(0, 5).map((k) => sobrenome(nomeDe(k.id))).join(", "))}${acabando.length > 5 ? "…" : ""}</p>` : ""}
      <ul class="gc-lista">${lista.map(linha).join("")}</ul></section>`;
  }

  // ---------- base ----------
  function abaBase() {
    const gg = g(), olh = gg.infra.olheiros;
    const potTxt = (p) => (p.pot ? (p.pot[0] === p.pot[1] ? `potencial <b>${p.pot[0]}</b>` : `potencial <b>${p.pot[0]}–${p.pot[1]}</b>`) : `<b>${h(p.impressao)}</b> <small>(sem olheiros não dá para medir)</small>`);
    const card = (p) => `<article class="gc-garoto ${p.pot && p.pot[0] >= 80 ? "joia" : ""}"><header>${linhaPos(p.pos)}<b>${h(p.nome)}</b>${p.blindado ? `<i class="gc-selo" title="Blindado contra clubes rivais neste ano">blindado</i>` : ""}</header>
      <p class="gc-dados"><span>${p.idade} anos</span><span>nota <b>${p.nota}</b></span><span>${potTxt(p)}</span></p>
      <div class="gc-acoes"><button data-gc-promover="${p.id}">Promover</button><button class="secundario" data-gc-vender-base="${p.id}">Vender (${dinheiro(p.valor)})</button><button class="secundario" data-gc-dispensar-base="${p.id}">Dispensar</button></div></article>`;
    return `<section class="quadro"><h3>Categoria de base</h3><p class="suave">A cada virada chegam garotos novos (${2 + gg.infra.base} agora). O potencial é escondido: sua rede de olheiros (nível ${olh}) define o quanto você enxerga. Promover cedo dá um jogador barato agora; segurar na base deixa ele crescer até o potencial, mas um clube rival pode levar os melhores com 19 anos ou mais. Aos ${R.IDADE_BASE_MAX + 1} anos quem não subiu vai embora.</p>
      ${gg.base.length ? `<div class="gc-grade">${gg.base.map(card).join("")}</div>` : `<p class="suave">Ninguém na base agora. Os próximos garotos chegam na virada de temporada.</p>`}</section>`;
  }

  // ---------- estrutura ----------
  function abaEstrutura() {
    const gg = g(), emObra = gg.obra;
    const linha = ([id, info]) => {
      const n = gg.infra[id], custo = gg.custos[n], fazendo = emObra && emObra.tipo === id, max = n >= R.INFRA_MAX;
      const podeComprar = !max && !emObra && E.caixa >= custo;
      return `<li class="gc-linha estrutura"><span class="gc-ic">${ic(info.icone)}</span><span class="gc-info"><b>${info.nome}</b>${pips(n)}<small>${h(n || id === "olheiros" ? info.efeito(n) : "Nível 0: sem bônus ainda")}</small>${!max ? `<small class="prox">Próximo nível: ${h(info.efeito(n + 1))}</small>` : ""}</span>
        ${fazendo ? `<span class="gc-obra">Obra em andamento: pronta na virada</span>` : max ? `<span class="gc-obra">No máximo</span>` : `<button data-gc-obra="${id}" ${podeComprar ? "" : "disabled"}>Melhorar · ${dinheiro(custo)}</button>`}</li>`;
    };
    return `<section class="quadro"><h3>Estrutura do clube</h3><p class="suave">Uma obra por vez, paga na hora e pronta na virada de temporada. Cada nível rende todo ano, mas a manutenção (${dinheiro(gg.manutencao)} por temporada agora) cresce junto.</p>
      ${emObra ? `<p class="gc-aviso">${ic("relogio")} ${h(R.INFRA[emObra.tipo].nome)} nível ${emObra.para} fica pronto na virada.</p>` : ""}
      <ul class="gc-lista">${Object.entries(R.INFRA).map(linha).join("")}</ul></section>`;
  }

  // ---------- vestiário ----------
  function abaVestiario() {
    const gg = g(), cap = gg.capitao && JOGADORES[gg.capitao];
    const cand = gg.candidatos.map((c) => { const j = JOGADORES[c.id]; return j ? `<li class="gc-linha"><button class="gc-jogador" data-jogador="${c.id}"><span class="gc-nota ${faixa(notaDe(j))}">${notaDe(j)}</span><b>${h(j.nome)}</b>${linhaPos(j.pos)}</button>
      <span class="gc-lider">liderança <b>${c.lider}</b>${barra(c.lider * 10)}</span>${gg.capitao === c.id ? `<span class="gc-obra">Capitão</span>` : `<button class="secundario" data-gc-capitao="${c.id}">Nomear</button>`}</li>` : ""; }).join("");
    return `<section class="quadro"><h3>Vestiário</h3><p class="suave">O capitão segura o grupo depois das derrotas (mais moral recuperada, e mais ainda se ele tem liderança alta). Sem ele em campo, a derrota pesa. Os dilemas da caixa de entrada voltam depois: o que você decide hoje cobra a conta daqui a algumas rodadas.</p>
      <p class="gc-cap-atual">${cap ? `${ic("coroa")} Capitão: <b>${h(cap.nome)}</b>` : `${ic("alerta")} Você ainda não escolheu o capitão.`}</p>
      <p class="gc-futuro">${gg.futuro ? `${ic("relogio")} <b>${gg.futuro}</b> consequência${gg.futuro > 1 ? "s" : ""} de decisões suas ${gg.futuro > 1 ? "estão" : "está"} a caminho.` : `${ic("estrela")} Nenhuma consequência pendente.`}</p>
      <ul class="gc-lista">${cand}</ul></section>`;
  }

  // ---------- técnico ----------
  function abaTecnico() {
    const gg = g();
    const hab = Object.entries(R.HABILIDADES).map(([id, hh]) => { const n = gg.habilidades[id] || 0;
      return `<li class="gc-linha"><span class="gc-info"><b>${hh.nome}</b>${pips(n, R.HAB_MAX)}<small>${n ? h(hh.texto(n)) : "Ainda sem nível"}</small>${n < R.HAB_MAX ? `<small class="prox">Próximo: ${h(hh.texto(n + 1))}</small>` : ""}</span>
        ${n >= R.HAB_MAX ? `<span class="gc-obra">No máximo</span>` : `<button data-gc-hab="${id}" ${gg.pontos > 0 ? "" : "disabled"}>Evoluir · 1 ponto</button>`}</li>`; }).join("");
    return `<section class="quadro"><h3>Carreira do técnico</h3>
      <div class="gc-duplo"><div><small>Reputação</small><b class="gc-grande">${gg.reputacao}</b> <em>${R.nivelReputacao(gg.reputacao)}</em>${barra(gg.reputacao)}</div>
      <div><small>Confiança da diretoria</small><b class="gc-grande">${gg.confianca}%</b> <em>${R.nivelConfianca(gg.confianca)}</em>${barra(gg.confianca, gg.confianca < 35 ? "perigo" : "")}</div></div>
      <p class="suave">A reputação sobe com metas cumpridas e títulos e rende patrocínio todo ano; a partir de 40 aparecem convites de clubes grandes (e uma decisão difícil). A confiança cai com derrotas: abaixo de 30 a diretoria dá um ultimato de 4 jogos${EM_GRUPO ? ", e sem pontos ela intervém no elenco." : ", e sem pontos você é demitido."}</p>
      ${gg.ultimato ? `<p class="gc-aviso perigo">${ic("alerta")} Ultimato: faltam ${gg.ultimato.restam} jogo${gg.ultimato.restam === 1 ? "" : "s"}. Você precisa de ${gg.ultimato.min} pontos em 4 jogos (já fez ${gg.ultimato.pontos}).</p>` : ""}
      <h3>Habilidades <small class="suave">${gg.pontos} ponto${gg.pontos === 1 ? "" : "s"} para gastar (chegam 2 por temporada, +1 por título)</small></h3>
      <ul class="gc-lista">${hab}</ul></section>`;
  }

  // ---------- legado ----------
  function abaLegado() {
    const L = g().legado, rec = L.recordes;
    const recordes = [rec.artilheiro && ["Artilheiro de uma temporada", `${rec.artilheiro.nome} · ${rec.artilheiro.gols} gols (${rec.artilheiro.ano})`],
      rec.melhorPosicao && ["Melhor posição", `${rec.melhorPosicao.pos}º lugar (${rec.melhorPosicao.ano})`],
      rec.goleada && ["Maior goleada", `${rec.goleada.placar[0]} × ${rec.goleada.placar[1]} contra ${nomeClube(rec.goleada.adv)} (${rec.goleada.ano})`],
      rec.maiorVenda && ["Maior venda", `${rec.maiorVenda.nome} · ${dinheiro(rec.maiorVenda.valor)} (${rec.maiorVenda.ano})`],
      rec.maiorCompra && ["Maior contratação", `${rec.maiorCompra.nome} · ${dinheiro(rec.maiorCompra.valor)} (${rec.maiorCompra.ano})`],
      rec.titulos && ["Títulos", `${rec.titulos}`]].filter(Boolean);
    const hall = L.hall.map((x) => `<li class="gc-hall"><span class="gc-camisa ${x.camisa ? "aposentada" : ""}">${x.camisa || ic("estrela")}</span><span><b>${h(x.nome)}</b><small>${h(x.pos)} · ${x.jogos} jogos · ${x.gols} gols${x.titulos ? ` · ${x.titulos} título${x.titulos > 1 ? "s" : ""}` : ""} · desde ${x.ano}</small></span>
      ${x.camisa ? `<span class="gc-obra">Camisa ${x.camisa} aposentada</span>` : `<button class="secundario" data-gc-camisa="${x.pid}">Aposentar a camisa</button>`}</li>`).join("");
    const linha = [...L.historico].map((x) => ({ ano: x.ano, texto: `${x.posicao}º lugar no ${x.liga}${x.titulos && x.titulos.length ? ` · campeão: ${x.titulos.join(", ")}` : ""}`, tipo: x.titulos && x.titulos.length ? "titulo" : "temp" }))
      .concat(L.marcos.map((m) => ({ ano: m.ano, texto: m.texto, tipo: m.tipo }))).sort((a, b) => b.ano - a.ano);
    return `<section class="quadro"><div class="linha-titulo"><h3>Legado do ${h(meuClube().nome)}</h3><button data-gc-cartao>${ic("lista")} Cartão do clube</button></div>
      <h3>Hall da Fama</h3>${hall ? `<ul class="gc-lista">${hall}</ul>` : `<p class="suave">Entram aqui os jogadores que marcam a história (gols, jogos e títulos acumulados, e pelo menos duas temporadas). O primeiro costuma aparecer no fim da segunda temporada.</p>`}
      <h3>Recordes</h3>${recordes.length ? `<dl class="gc-recordes">${recordes.map(([a, b]) => `<div><dt>${h(a)}</dt><dd>${h(b)}</dd></div>`).join("")}</dl>` : `<p class="suave">Os recordes aparecem conforme o clube faz história.</p>`}
      <h3>Linha do tempo</h3>${linha.length ? `<ol class="gc-tempo">${linha.map((m) => `<li class="${m.tipo}"><b>${m.ano}</b><span>${h(m.texto)}</span></li>`).join("")}</ol>` : `<p class="suave">A linha do tempo começa quando a primeira temporada acabar.</p>`}</section>`;
  }
  // o cartão para postar: um desenho 4:5 com as cores do clube (sem baixar o escudo da internet, que travaria a imagem)
  function desenharCartao() {
    const c = meuClube(), L = g().legado, hist = L.historico, titulos = hist.reduce((s, x) => s + (x.titulos || []).length, 0);
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
    const x = cv.getContext("2d"), [c1, c2] = c.cores;
    const grad = x.createLinearGradient(0, 0, 1080, 1350); grad.addColorStop(0, c1); grad.addColorStop(1, misturar(c1, "#000000", 0.55)); x.fillStyle = grad; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = "rgba(0,0,0,.28)"; x.fillRect(60, 60, 960, 1230);
    const tinta = tintaSobre(c1, "#ffffff"); x.fillStyle = tinta; x.textAlign = "center";
    x.beginPath(); x.arc(540, 250, 110, 0, 7); x.fillStyle = c2; x.fill(); x.fillStyle = tintaSobre(c2, "#ffffff"); x.font = "700 96px system-ui, sans-serif"; x.fillText(c.nome.split(" ").map((p) => p[0]).join("").slice(0, 3).toUpperCase(), 540, 285);
    x.fillStyle = tinta; x.font = "700 68px system-ui, sans-serif"; x.fillText(c.nome, 540, 470);
    x.font = "400 34px system-ui, sans-serif"; x.globalAlpha = 0.85; x.fillText(`Técnico ${E.tecnico.nome} · ${hist.length} temporada${hist.length === 1 ? "" : "s"}`, 540, 525); x.globalAlpha = 1;
    const caixas = [[titulos, "títulos"], [Object.keys(L.hall).length, "no Hall da Fama"], [L.camisas.length, "camisas aposentadas"]];
    caixas.forEach(([n, t], i) => { const cx = 210 + i * 330; x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(cx - 140, 600, 280, 190); x.fillStyle = tinta; x.font = "700 92px system-ui, sans-serif"; x.fillText(String(n), cx, 710); x.font = "400 28px system-ui, sans-serif"; x.fillText(t, cx, 760); });
    x.font = "700 36px system-ui, sans-serif"; x.fillText("Linha do tempo", 540, 870);
    x.font = "400 31px system-ui, sans-serif";
    const linhas = [...hist].slice(-3).reverse().map((h2) => `${h2.ano} · ${h2.posicao}º lugar${h2.titulos && h2.titulos.length ? ` · campeão ${h2.titulos[0]}` : ""}`);
    const rec = L.recordes; if (rec.artilheiro) linhas.push(`Recorde: ${rec.artilheiro.nome}, ${rec.artilheiro.gols} gols numa temporada`);
    const hall = Object.values(L.hall).slice(0, 2).map((p) => `Hall da Fama: ${p.nome}`); linhas.push(...hall);
    linhas.slice(0, 7).forEach((t, i) => x.fillText(t.length > 52 ? t.slice(0, 51) + "…" : t, 540, 930 + i * 52));
    x.globalAlpha = 0.7; x.font = "400 28px system-ui, sans-serif"; x.fillText("Vila da Galera · Carreira de Treinador", 540, 1260);
    return cv;
  }
  function textoCartao() {
    const c = meuClube(), L = g().legado, hist = L.historico, titulos = hist.reduce((s, x) => s + (x.titulos || []).length, 0);
    return [`${c.nome} · técnico ${E.tecnico.nome}`, `${hist.length} temporada(s), ${titulos} título(s), ${Object.keys(L.hall).length} no Hall da Fama, ${L.camisas.length} camisa(s) aposentada(s).`,
      ...hist.map((x) => `${x.ano}: ${x.posicao}º no ${x.liga}${x.titulos && x.titulos.length ? ` (campeão: ${x.titulos.join(", ")})` : ""}`), "Vila da Galera · Carreira de Treinador"].join("\n");
  }
  function abrirCartao() {
    const cv = desenharCartao(), url = cv.toDataURL("image/png");
    let d = document.getElementById("cartaoClube");
    if (!d) { d = document.createElement("dialog"); d.id = "cartaoClube"; d.className = "gc-dialogo"; document.body.append(d); }
    d.innerHTML = `<form method="dialog"><img src="${url}" alt="Cartão do clube"><div class="gc-acoes"><a class="botao" href="${url}" download="${meuClube().id}-historia.png">Baixar imagem</a><button type="button" data-gc-copiar>Copiar texto</button><button>Fechar</button></div></form>`;
    d.showModal();
    d.querySelector("[data-gc-copiar]").onclick = async () => { try { await navigator.clipboard.writeText(textoCartao()); toast("Texto copiado."); } catch { toast("Não consegui copiar. Baixe a imagem."); } };
  }

  // ---------- rivais ----------
  function abaRivais() {
    const gg = g(), rivais = gg.rivais, liga = gg.rivalLiga;
    const card = (r) => { const total = r.jogos;
      return `<article class="gc-rival"><header>${escudo(r.clube, 2)}<span><b>${h(nomeClube(r.clube))}</b><small>técnico ${h(r.tecnico)}</small></span>${r.fregues ? `<i class="gc-selo ${r.fregues === "voce" ? "bom" : "ruim"}">${r.fregues === "voce" ? "freguês seu" : "você é o freguês"}</i>` : ""}</header>
        <p class="gc-placar"><b class="${r.v > r.d ? "bom" : ""}">${r.v}</b><small>vitórias</small> <b>${r.e}</b><small>empates</small> <b class="${r.d > r.v ? "ruim" : ""}">${r.d}</b><small>derrotas</small></p>
        <p class="suave">${total ? `${total} jogo${total > 1 ? "s" : ""} · gols ${r.gols[0]} × ${r.gols[1]}` : "Ainda não se enfrentaram."}</p>
        ${r.ultimos.length ? `<ul class="gc-ultimos">${r.ultimos.map((u) => `<li><small>T${u.temporada}</small> ${h(nomeClube(u.casa))} <b>${u.placar[0]} × ${u.placar[1]}</b> ${h(nomeClube(u.fora))}${u.penaltis ? ` <small>(pên. ${u.penaltis[0]}×${u.penaltis[1]})</small>` : ""}</li>`).join("")}</ul>` : ""}</article>`; };
    return `<section class="quadro"><h3>Rivais</h3><p class="suave">Contra o seu clássico a bilheteria sobe 35%, a vitória rende moral e a derrota pesa na confiança da diretoria.${EM_GRUPO ? " Contra os outros técnicos da sala o confronto direto fica registrado, com provocação no feed e o título de freguês para quem vence 3 vezes e abre 2 de vantagem." : ""}</p>
      ${liga ? `<p class="gc-cap-atual">${ic("explosao")} Seu clássico na liga: <b>${escudo(liga, 1)} ${h(nomeClube(liga))}</b></p>` : ""}
      ${rivais.length ? `<div class="gc-grade">${rivais.map(card).join("")}</div>` : (EM_GRUPO ? `<p class="suave">Ninguém mais na sala por enquanto.</p>` : "")}</section>`;
  }

  // ---------- a tela ----------
  const CORPO = { contratos: abaContratos, base: abaBase, estrutura: abaEstrutura, vestiario: abaVestiario, tecnico: abaTecnico, legado: abaLegado, rivais: abaRivais };
  function telaClube() {
    if (!E || !E.gestao) return;
    const gg = g(), abas = ABAS.filter(([id]) => id !== "rivais" || EM_GRUPO || gg.rivalLiga);
    if (!abas.some(([id]) => id === CL.aba)) CL.aba = "contratos";
    const alertas = gg.alertas.map((a) => `<li class="${a.tipo}">${ic(a.tipo === "janela" || a.tipo === "ultimato" ? "alerta" : "sino")} ${h(a.texto)}</li>`).join("");
    $("clubeCorpo").innerHTML = `<section class="quadro gc-resumo"><div><small>Diretoria</small><b>${gg.confianca}%</b>${barra(gg.confianca, gg.confianca < 35 ? "perigo" : "")}<em>${R.nivelConfianca(gg.confianca)}</em></div>
      <div><small>Reputação</small><b>${gg.reputacao}</b>${barra(gg.reputacao)}<em>${R.nivelReputacao(gg.reputacao)}</em></div><div><small>Pontos de habilidade</small><b>${gg.pontos}</b><em>${gg.futuro ? `${gg.futuro} consequência${gg.futuro > 1 ? "s" : ""} a caminho` : "sem pendências"}</em></div>
      ${alertas ? `<ul class="gc-alertas">${alertas}</ul>` : ""}</section>
      <div class="abas-competicoes gc-abas">${abas.map(([id, nome]) => `<button class="${id === CL.aba ? "ativa" : ""}" data-gc-aba="${id}">${nome}${id === "tecnico" && gg.pontos ? ` <i class="gc-ponto">${gg.pontos}</i>` : ""}</button>`).join("")}</div>
      ${CORPO[CL.aba]()}`;
  }
  window.telaClube = telaClube;

  document.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-gc-aba],[data-gc-renovar],[data-gc-anos],[data-gc-multa],[data-gc-cancelar],[data-gc-fechar-contrato],[data-gc-promover],[data-gc-vender-base],[data-gc-dispensar-base],[data-gc-obra],[data-gc-capitao],[data-gc-hab],[data-gc-camisa],[data-gc-cartao]");
    if (!t) return;
    const d = t.dataset;
    if (d.gcAba) { CL.aba = d.gcAba; return telaClube(); }
    if (d.gcRenovar) { CL.renovando = CL.renovando === d.gcRenovar ? null : d.gcRenovar; return telaClube(); }
    if (d.gcAnos) { CL.anos = +d.gcAnos; return telaClube(); }
    if (d.gcMulta) { CL.multa = d.gcMulta; return telaClube(); }
    if (t.hasAttribute("data-gc-cancelar")) { CL.renovando = null; return telaClube(); }
    if (d.gcFecharContrato) { const r = await agir({ acao: "renovar", jogador: d.gcFecharContrato, anos: CL.anos, multa: CL.multa }, t); if (r && r.ok) CL.renovando = null; return; }
    if (d.gcPromover) return agir({ acao: "promover", jogador: d.gcPromover }, t);
    if (d.gcVenderBase) return agir({ acao: "vender-base", jogador: d.gcVenderBase }, t);
    if (d.gcDispensarBase) return agir({ acao: "dispensar-base", jogador: d.gcDispensarBase }, t);
    if (d.gcObra) return agir({ acao: "obra", tipo: d.gcObra }, t);
    if (d.gcCapitao) return agir({ acao: "capitao", jogador: d.gcCapitao }, t);
    if (d.gcHab) return agir({ acao: "habilidade", id: d.gcHab }, t);
    if (d.gcCamisa) { const r = await agir({ acao: "camisa", jogador: d.gcCamisa }, t); if (r && r.ok) festa(); return; }
    if (t.hasAttribute("data-gc-cartao")) return abrirCartao();
  });
  // as pequenas peças da sede: a confiança no cabeçalho, os alertas e o relógio da janela
  window.gestaoSede = function () {
    if (!E || !E.gestao) return { confianca: 0, alertas: "" };
    const gg = g();
    return { confianca: gg.confianca, nivel: R.nivelConfianca(gg.confianca), alertas: gg.alertas.filter((a) => a.tipo !== "pontos").map((a) => `<li class="${a.tipo}">${ic("alerta")} ${h(a.texto)}</li>`).join("") };
  };
})();
