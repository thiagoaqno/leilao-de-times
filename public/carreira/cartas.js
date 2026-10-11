// Carreira de Treinador (parte 2): o jogador. O retrato em pixel-art (a cabeça de rostos.js, do Leilão, com a camisa do
// clube de agora), a figurinha (o card: faixa pela nota, posição, atributos, valor e situação) e a ficha aberta, com
// as ações: proposta (jogador de outro clube) ou pôr à venda / vender na hora (jogador seu).
const retratos = new Map();
// As fotos reais entram quando a carta aparece na tela. O retrato desenhado continua visível
// enquanto a imagem carrega e quando a API não encontra um recorte do jogador.
const fotos = new Map(), fotosPendentes = new Map();
function fotoHTML(pid) { return `<img class="pix" src="${retrato(pid)}" data-foto-jogador="${h(pid)}" alt="">`; }
function trocarFoto(img, url) {
  if (!url || !img.isConnected || img.dataset.fotoPronta) return;
  const pronta = new Image();
  pronta.onload = () => {
    if (!img.isConnected) return;
    img.src = url;
    img.classList.remove("pix");
    img.classList.add("foto-real");
    img.dataset.fotoPronta = "1";
  };
  pronta.onerror = () => { fotos.set(img.dataset.fotoJogador, null); };
  pronta.src = url;
}
function carregarFoto(img) {
  const pid = img.dataset.fotoJogador;
  if (fotos.has(pid)) return trocarFoto(img, fotos.get(pid));
  if (!fotosPendentes.has(pid)) {
    fotosPendentes.set(pid, fetch(`/api/foto-jogador/${encodeURIComponent(pid)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((r) => {
        if (r) fotos.set(pid, r.url || null);
        for (const outro of document.querySelectorAll("[data-foto-jogador]")) if (outro.dataset.fotoJogador === pid) trocarFoto(outro, r?.url);
      })
      .catch(() => {})
      .finally(() => fotosPendentes.delete(pid)));
  }
}
const observadorFotos = new IntersectionObserver((entradas) => {
  for (const entrada of entradas) if (entrada.isIntersecting) {
    observadorFotos.unobserve(entrada.target);
    carregarFoto(entrada.target);
  }
}, { rootMargin: "120px" });
function observarFotos(no) {
  if (no.nodeType !== 1) return;
  if (no.matches("[data-foto-jogador]")) observadorFotos.observe(no);
  for (const img of no.querySelectorAll("[data-foto-jogador]")) observadorFotos.observe(img);
}
new MutationObserver((mudancas) => {
  for (const m of mudancas) for (const no of m.addedNodes) observarFotos(no);
}).observe(document.body, { childList: true, subtree: true });
// a camisa de verdade do clube (camisas.js): [cor, detalhe, desenho, calção]
const camisaDoClube = (clube) => Camisas.de(CLUBES[clube]);
function retrato(pid) {
  const j = JOGADORES[pid], clube = donoDe(pid), chave = pid + "|" + clube;
  if (retratos.has(chave)) return retratos.get(chave);
  const [cam, det, desenho] = camisaDoClube(clube);
  const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
  const g = cv.getContext("2d"), px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  for (let y = 12; y <= 15; y++) for (let x = 2; x <= 13; x++) {
    if (y === 12 && (x < 3 || x > 12)) continue;
    px(x, y, Rostos.listra(desenho, x - 2, y) ? det : cam);
  }
  px(6, 12, det); px(9, 12, det);
  Rostos.cabeca(g, j.nome);
  const url = cv.toDataURL(); retratos.set(chave, url); return url;
}
// o uniforme do boneco dos replays (lances.js) com a camisa do clube. contra: o clube da casa, quando quem veste é o
// visitante; se as camisas forem parecidas demais, o visitante joga com a reserva (as cores invertidas, ou a branca)
const corRGB = (hx) => { const n = parseInt(hx.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const distanciaCor = (a, b) => { const [x, y] = [corRGB(a), corRGB(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
function uniformeDoClube(clube, contra) {
  let [cam, det, desenho, calcao] = camisaDoClube(clube);
  if (contra && contra !== clube && distanciaCor(cam, camisaDoClube(contra)[0]) < 110) {
    const casa = camisaDoClube(contra)[0];
    [cam, det, desenho, calcao] = distanciaCor(det, casa) >= 110 ? [det, cam, "", det] : distanciaCor("#f4f4f4", casa) >= 110 ? ["#f4f4f4", cam, "", "#f4f4f4"] : ["#1a1a1a", cam, "", "#1a1a1a"];
  }
  return { cam, det, desenho, calcao, meiao: calcao === "#f4f4f4" || calcao === "#ffffff" ? cam : calcao, chuteira: "#1a1a1a" };
}

const ATRIBUTOS = [["rit", "Ritmo"], ["fin", "Finalização"], ["pas", "Passe"], ["dri", "Drible"], ["def", "Defesa"], ["fis", "Físico"]];
// as marcas de situação do jogador (lesão, suspensão, à venda, cartões, dica do olheiro)
function situacao(pid, curto) {
  const s = [];
  if (E.lesoes[pid]) s.push(`<span class="tag ruim">${ic("alerta")}${curto ? E.lesoes[pid] : `Lesão: ${E.lesoes[pid]} rod.`}</span>`);
  if (E.suspensos[pid]) s.push(`<span class="tag ruim">${ic("cartas")}${curto ? "" : "Suspenso"}</span>`);
  if (E.amarelos[pid] && !curto) s.push(`<span class="tag aviso">${E.amarelos[pid]} amarelo${E.amarelos[pid] > 1 ? "s" : ""}</span>`);
  if (E.aVenda.includes(pid)) s.push(`<span class="tag venda">${ic("etiqueta")}${curto ? "" : "À venda"}</span>`);
  const forma = efeitoDe(pid);
  if (forma) s.push(`<span class="tag ${forma > 0 ? "alta" : "baixa"}">${ic(forma > 0 ? "sobe" : "baixo")}${curto ? (forma > 0 ? "+" : "") + forma : `${forma > 0 ? "Em alta" : "Em baixa"}: ${forma > 0 ? "+" : ""}${forma} no próximo jogo`}</span>`);
  if (E.indicacoes[pid]) s.push(`<span class="tag dica">${ic("olho")}${curto ? "-15%" : "Dica do olheiro: -15%"}</span>`);
  return s.join("");
}
// a figurinha. tamanho: "mini" (lista e banco) ou "grande" (a ficha)
function figurinha(pid, tamanho = "mini") {
  const j = JOGADORES[pid], n = notaDe(j), clube = donoDe(pid), valor = valorAtual(pid), forma = formaDe(pid);
  const atr = ATRIBUTOS.filter(([k]) => j.pos === "GOL" ? ["def", "fis"].includes(k) || k === "pas" : true).map(([k, nome]) => {
    const v = k === "def" && j.pos === "GOL" ? j.atr.gol : Math.max(20, Math.min(99, j.atr[k] + ((E && E.bonusNota[pid]) || 0)));
    return `<li><span>${k === "def" && j.pos === "GOL" ? "Goleiro" : nome}</span><b>${v}</b><i style="--v:${v}%"></i></li>`;
  }).join("");
  return `<article class="figurinha ${tamanho} ${faixa(n)}" style="${coresClube(clube)}" data-jogador="${pid}">
    <header><span class="nota">${n}</span><span class="pos">${j.pos}</span>${seloMudancaNota(pid, "na-figurinha")}${escudo(clube, tamanho === "grande" ? 2 : 1)}</header>
    <div class="foto">${fotoHTML(pid)}</div>
    <h4>${h(tamanho === "grande" ? j.nome : sobrenome(j.nome))}</h4>
    ${tamanho === "grande" ? `<p class="sub">${h(POS_NOME[j.pos] || j.pos)} · ${h(j.nat || "")} · ${Evolucao.idadeNa(j, E ? E.temporada : 1)} anos${j.idade ? "" : " (estimada)"}</p><ul class="atributos">${atr}</ul>` : ""}
    <footer><span>${clube === E.clube ? dinheiro(valor) : ""}${forma !== 1 ? `<i class="seta ${forma > 1 ? "sobe" : "desce"}" title="Momento: ${Math.round((forma - 1) * 100)}%">${ic(forma > 1 ? "sobe" : "baixo")}</i>` : ""}</span><span class="marcas">${situacao(pid, true)}</span></footer>
  </article>`;
}

// ---------- a ficha ----------
let fichaAberta = null;
function abrirFicha(pid) {
  fichaAberta = pid;
  desenharFicha();
  if (!$("ficha").open) $("ficha").showModal();
}
$("fichaFechar").onclick = () => $("ficha").close();
$("ficha").addEventListener("click", (e) => { if (e.target === $("ficha")) $("ficha").close(); });
$("ficha").addEventListener("close", () => { fichaAberta = null; });
// o treino de posição: a ficha mostra o andamento ou os botões das posições parecidas, com os jogos que cada uma leva
function treinoHTML(pid) {
  const j = JOGADORES[pid], t = E.gestao && E.gestao.treinos && E.gestao.treinos[pid];
  if (t) return `<div class="treino"><p>${ic("bola")} Treinando de <b>${h(POS_NOME[t.para] || t.para)}</b>: faltam ${t.restam} de ${t.total} jogos.</p><button id="fPararTreino" class="discreto">Cancelar o treino</button></div>`;
  const alvos = ClubeRegras.alvosDeTreino(j.pos), cheio = Object.keys((E.gestao && E.gestao.treinos) || {}).length >= ClubeRegras.TREINOS_MAX;
  if (!alvos.length) return "";
  const idade = Evolucao.idadeNa(j, E.temporada), formador = (E.gestao && E.gestao.habilidades.formador) || 0;
  return `<div class="treino"><p>${ic("bola")} Treinar para outra posição${cheio ? ` <small>(já são ${ClubeRegras.TREINOS_MAX} em treino)</small>` : ""}${j.posOriginal ? ` <small>(nasceu ${h(j.posOriginal)})</small>` : ""}</p>
    <div class="linha">${alvos.map((p) => `<button class="secundario" data-treinar="${p}" ${cheio ? "disabled" : ""}>${h(POS_NOME[p] || p)} · ${ClubeRegras.jogosDeTreino({ pontos: Taticas.pontosDeEncaixe(j.pos, p), idade, formador })} jogos</button>`).join("")}</div></div>`;
}
// por que o preço está fora do normal (idade, fase): "34 anos: 56% a menos"
function motivosPreco(pid) {
  const m = Mercado.motivosDoValor({ idade: comNota(JOGADORES[pid]).idade, fator: formaDe(pid) });
  return m.length ? `<small class="${Mercado.desvalorizado({ idade: comNota(JOGADORES[pid]).idade, fator: formaDe(pid) }) ? "positivo" : ""}">${h(m.join(" · "))}</small>` : "";
}
function desenharFicha(resposta) {
  const pid = fichaAberta; if (!pid) return;
  const j = JOGADORES[pid], clube = donoDe(pid), meu = clube === E.clube, valor = valorAtual(pid), sal = meu ? salarioDe(j) : Mercado.salarioDe(comNota(j));
  const gols = (E.artilharia.find((a) => a.id === pid) || {}).gols || 0, forma = formaDe(pid), compra = meu && E.compras[pid];
  const lucro = compra ? valor - compra.valor : null;
  const info = `<dl class="dados">
    <div><dt>Clube</dt><dd>${escudo(clube, 1)} ${h(nomeClube(clube))}</dd></div>
    ${meu ? `<div><dt>Valor</dt><dd>${dinheiro(valor)}${forma !== 1 ? ` <small class="${forma > 1 ? "positivo" : "neg"}">${forma > 1 ? "em alta" : "em baixa"} (${forma > 1 ? "+" : ""}${Math.round((forma - 1) * 100)}%)</small>` : ""}</dd></div>` : ""}
    ${motivosPreco(pid) ? `<div><dt>Preço</dt><dd>${motivosPreco(pid)}</dd></div>` : ""}
    <div><dt>Salário</dt><dd>${dinheiro(sal)}/mês</dd></div>
    <div><dt>Gols na temporada</dt><dd>${gols}</dd></div>
    ${compra ? `<div class="lucro"><dt>Comprado na R${compra.rodada + 1}${compra.temporada !== E.temporada ? " (temporada passada)" : ""}</dt><dd>${dinheiro(compra.valor)} <b class="${lucro >= 0 ? "positivo" : "neg"}">${lucro >= 0 ? "lucro" : "prejuízo"} ${dinheiro(Math.abs(lucro))}</b></dd></div>` : ""}
  </dl>${meu && (E.valores[pid] || []).length > 1 ? graficoValor(E.valores[pid]) : ""}<div class="marcas-grandes">${situacao(pid, false)}</div>`;
  let acoes = "";
  if (meu) {
    const pode = E.janela.aberta && E.elenco.length > Mercado.ELENCO_MIN, listado = E.aVenda.includes(pid);
    const pedido = (E.pedidos && E.pedidos[pid]) || Math.round(valor * 1.1 / 1e5) * 1e5;
    const rapida = Math.min(Mercado.vendaRapida(comNota(j), forma), compraRecente(pid) ? E.compras[pid].valor : Infinity);
    acoes = `<div class="acoes">
      ${treinoHTML(pid)}
      <div class="pedido"><label for="fPedido">Preço pedido na lista <b id="fPedidoTxt">${dinheiro(pedido)}</b></label>
        <input id="fPedido" type="range" min="${Math.round(valor * Mercado.PEDIDO_MIN / 1e5)}" max="${Math.round(valor * Mercado.PEDIDO_MAX / 1e5)}" value="${Math.round(pedido / 1e5)}">
        <p class="suave" id="fPedidoDica"></p></div>
      <div class="linha"><button id="fVenda" class="secundario">${ic("etiqueta")} ${listado ? "Mudar o preço" : "Pôr na lista de venda"}</button>${listado ? `<button id="fTirar" class="discreto">Tirar da lista</button>` : ""}</div>
      <button id="fVenderJa" class="perigo" ${pode ? "" : "disabled"}>${ic("moeda")} Vender agora por ${dinheiro(rapida)}</button>
      <p class="suave">${E.janela.aberta ? "Na lista, os clubes mandam propostas entre as rodadas: quanto mais alto o preço, menos propostas. Em alta, pode virar disputa entre clubes. Vender agora é na hora, por 70% do valor." : "A janela está fechada: dá para pôr na lista, mas as vendas só voltam na rodada 17."}${compraRecente(pid) ? " Comprado há pouco: nas primeiras rodadas, ninguém paga mais do que você pagou." : ""}</p>
    </div>`;
  } else if (EM_GRUPO) {
    // na carreira em grupo, a compra é por leilão entre os amigos (grupo.js mostra o leilão aberto)
    const l = SALA && SALA.leilao, aqui = l && l.jogador === pid, regra = E.regraCompras, nota = notaDe(j);
    const bloqueio = regra && regra.tipo && !regra.ok[Math.min(99, nota)] ? `${regra.texto}${regra.usadas.length ? ` Você já levou ${regra.usadas.length === 1 ? "um de" : "jogadores de"} ${regra.usadas.join(", ")}.` : ""} Um jogador de ${nota} não entra nessa conta.` : "";
    acoes = `<div class="acoes">${bloqueio ? `<p class="resposta recusa">${h(bloqueio)}</p>` : ""}<p class="suave">${aqui ? "Este jogador está em leilão agora: dê o seu lance na faixa de baixo." : `Na turma, a compra é por leilão: todos podem dar lance, e cada lance reinicia o relógio. ${clube && SALA && SALA.players.some((p) => p.clube === clube) ? "Ele é de um amigo: quem bate o martelo é o dono." : "O clube tem um preço mínimo."}`}</p>
      <button id="fLeilao" class="primario largo" ${aqui || l || !E.janela.aberta || bloqueio ? "disabled" : ""}>${ic("martelo")} ${!E.janela.aberta ? "Janela fechada" : l && !aqui ? "Já tem um leilão aberto" : aqui ? "Em leilão" : "Abrir o leilão"}</button></div>`;
  } else {
    const tent = E.tentativas[pid] || 0, desconto = E.indicacoes[pid] ? 0.85 : 1;
    const sugerido = Math.round(valor * desconto * 1.15 / 1e5) * 1e5;
    acoes = `<form class="proposta" id="fProposta">
      <div class="pedido-clube" id="fPedidoClube"><p class="suave">Perguntando ao ${h(nomeClube(clube))} quanto pede...</p></div>
      <h3>Fazer proposta ${tent ? `<small>(${3 - tent} tentativa${3 - tent === 1 ? "" : "s"} nesta rodada)</small>` : ""}</h3>
      <label>Valor da transferência<div class="valor"><button type="button" data-passo="-1">${ic("menos")}</button><input id="fValor" inputmode="numeric" value="${(resposta?.pedido || sugerido) / 1e6}"><span>mi</span><button type="button" data-passo="1">${ic("mais")}</button></div></label>
      <label>Salário por mês<div class="valor"><button type="button" data-passo-s="-1">${ic("menos")}</button><input id="fSalario" inputmode="numeric" value="${Math.round((resposta?.salarioPedido || sal) / 1e3)}"><span>mil</span><button type="button" data-passo-s="1">${ic("mais")}</button></div></label>
      <label class="check"><input type="checkbox" id="fParcelas"> Parcelar: metade agora e o resto em ${Mercado.PARCELAS} rodadas (+${Math.round(Mercado.JUROS * 100)}% de juros)</label>
      <label>Jogador seu na troca (entra por 90% do valor)<select id="fTroca"><option value="">Ninguém, só dinheiro</option>${[...E.elenco].sort((a, b) => valorAtual(b) - valorAtual(a)).map((x) => `<option value="${x}">${h(JOGADORES[x].nome)} · ${JOGADORES[x].pos} · ${dinheiro(Math.round(valorAtual(x) * 0.9 / 1e5) * 1e5)}</option>`).join("")}</select></label>
      <p class="suave" id="fPagamento"></p>
      <p class="suave">Caixa: ${dinheiro(E.caixa)} ${desconto < 1 ? " · o olheiro diz que dá para pagar 15% menos" : ""}</p>
      <button class="primario largo" ${E.janela.aberta && tent < 3 ? "" : "disabled"}>${E.janela.aberta ? "Enviar proposta" : "Janela fechada"}</button>
      ${resposta ? `<p class="resposta ${resposta.resultado}">${h(resposta.motivo)}</p>` : ""}
    </form>`;
  }
  $("fichaCorpo").innerHTML = `<div class="ficha-grade">${figurinha(pid, "grande")}<div class="ficha-info">${info}${acoes}</div></div>`;
  if (meu) {
    const pedidoAtual = () => +$("fPedido").value * 1e5;
    const dica = () => { const p = pedidoAtual(), ch = Mercado.chanceDeProposta(p, valor, formaDe(pid)); $("fPedidoTxt").textContent = dinheiro(p); $("fPedidoDica").textContent = `${Math.round(p / valor * 100)}% do valor · chance de proposta por rodada: ${ch >= 0.6 ? "alta" : ch >= 0.3 ? "média" : "baixa"}${compra ? ` · ${p >= compra.valor ? "lucro" : "prejuízo"} de ${dinheiro(Math.abs(p - compra.valor))} se vender por isso` : ""}`; };
    for (const b of $("fichaCorpo").querySelectorAll("[data-treinar]")) b.onclick = async () => { const r = await pedir("clube", { acao: "treinar", jogador: pid, para: b.dataset.treinar }); if (!r.ok) return toast(r.error); receber(r.estado); desenharFicha(); toast(r.mensagem); };
    if ($("fPararTreino")) $("fPararTreino").onclick = async () => { const r = await pedir("clube", { acao: "parar-treino", jogador: pid }); if (!r.ok) return toast(r.error); receber(r.estado); desenharFicha(); };
    $("fPedido").oninput = dica; dica();
    $("fVenda").onclick = async () => { const r = await pedir("vender", { jogador: pid, modo: "lista", pedido: pedidoAtual() }); if (!r.ok) return toast(r.error); receber(r.estado); desenharFicha(); toast(`Na lista por ${dinheiro(pedidoAtual())}.`); };
    if ($("fTirar")) $("fTirar").onclick = async () => { const r = await pedir("vender", { jogador: pid, modo: "lista" }); if (!r.ok) return toast(r.error); receber(r.estado); desenharFicha(); };
    $("fVenderJa").onclick = async () => {
      if (!confirm(`Vender ${j.nome} agora por ${$("fVenderJa").textContent.replace(/^.*por /, "")}?`)) return;
      const de = E.clube;
      const r = await pedir("vender", { jogador: pid, modo: "agora" }); if (!r.ok) return toast(r.error);
      const transferencia = r.estado.transferencias.find((t) => t.jogador === pid && t.de === de);
      receber(r.estado); $("ficha").close(); toast(r.mensagem);
      AnimacoesCarreira.animarTransferencia({ jogador: pid, tipo: "venda", de, para: transferencia?.para, valor: transferencia?.valor });
    };
  } else if (EM_GRUPO) {
    if ($("fLeilao")) $("fLeilao").onclick = async () => { const r = await agirGrupo({ type: "leilao", jogador: pid }); if (r.ok) $("ficha").close(); };
  } else {
    const passo = (id, d, unidade) => { const el = $(id), v = parseFloat(String(el.value).replace(",", ".")) || 0; el.value = Math.max(0, Math.round((v + d * unidade) * 10) / 10); };
    for (const b of $("fichaCorpo").querySelectorAll("[data-passo]")) b.onclick = () => passo("fValor", +b.dataset.passo, valor >= 2e7 ? 1 : 0.1);
    for (const b of $("fichaCorpo").querySelectorAll("[data-passo-s]")) b.onclick = () => passo("fSalario", +b.dataset.passoS, sal >= 2e5 ? 10 : 5);
    // como fica o pagamento (troca e parcelas)
    const pagamento = () => {
      const v = Math.round(parseFloat(String($("fValor").value).replace(",", ".")) * 1e6) || 0, t = $("fTroca").value, cred = t ? Math.round(valorAtual(t) * 0.9 / 1e5) * 1e5 : 0;
      const din = Math.max(0, v - cred), parc = $("fParcelas").checked && din > 0, agora = parc ? Math.round(din * Mercado.ENTRADA / 1e5) * 1e5 : din;
      const parcela = parc ? Math.ceil((din - agora) * (1 + Mercado.JUROS) / Mercado.PARCELAS / 1e4) * 1e4 : 0;
      $("fPagamento").innerHTML = `Sai do caixa agora: <b class="${agora > E.caixa ? "neg" : ""}">${dinheiro(agora)}</b>${parc ? ` + ${Mercado.PARCELAS}× ${dinheiro(parcela)}` : ""}${t ? ` · ${h(JOGADORES[t].nome)} vai para o ${h(nomeClube(clube))}` : ""}`;
    };
    // o que o clube pede: o preço fica à vista e dá para fechar na hora, sem conversa
    const pidDaFicha = pid;
    pedir("pedido", { jogador: pid }).then((r) => {
      if (fichaAberta !== pidDaFicha || !$("fPedidoClube")) return;
      if (!r.ok) { $("fPedidoClube").innerHTML = ""; return; }
      const p = r.pedido;
      $("fPedidoClube").innerHTML = `<p>O ${h(nomeClube(clube))} pede <b>${dinheiro(p.pedido)}</b> e ${h(j.nome)} quer <b>${dinheiro(p.salario)}</b> por mês.</p>
        <button type="button" id="fComprarJa" class="primario largo" ${E.janela.aberta ? "" : "disabled"}>${ic("aperto")} Comprar pelo preço pedido</button>`;
      if (!resposta) { $("fValor").value = p.pedido / 1e6; $("fSalario").value = Math.round(p.salario / 1e3); pagamento(); }
      $("fComprarJa").onclick = async () => {
        const r2 = await pedir("proposta", { jogador: pid, direto: true, parcelas: $("fParcelas").checked, troca: $("fTroca").value || null });
        if (!r2.ok) return toast(r2.error);
        receber(r2.estado);
        if (r2.resposta.resultado === "aceita") { $("ficha").close(); toast(r2.resposta.motivo); festa(); AnimacoesCarreira.animarTransferencia({ jogador: pid, de: clube, para: E.clube, valor: p.pedido }); return; }
        desenharFicha(r2.resposta);
      };
    });
    for (const id of ["fValor", "fParcelas", "fTroca"]) $(id).addEventListener("input", pagamento);
    for (const b of $("fichaCorpo").querySelectorAll("[data-passo]")) b.addEventListener("click", pagamento);
    pagamento();
    $("fProposta").onsubmit = async (ev) => {
      ev.preventDefault();
      const v = Math.round(parseFloat(String($("fValor").value).replace(",", ".")) * 1e6), s = Math.round(parseFloat(String($("fSalario").value).replace(",", ".")) * 1e3);
      const r = await pedir("proposta", { jogador: pid, valor: v, salario: s, parcelas: $("fParcelas").checked, troca: $("fTroca").value || null });
      if (!r.ok) return toast(r.error);
      receber(r.estado);
      if (r.resposta.resultado === "aceita") { $("ficha").close(); toast(r.resposta.motivo); festa(); AnimacoesCarreira.animarTransferencia({ jogador: pid, de: clube, para: E.clube, valor: v }); return; }
      desenharFicha(r.resposta);
    };
  }
}
// comprado há poucas rodadas (nesta temporada): o mercado não paga mais do que você pagou
const compraRecente = (pid) => { const c = E.compras[pid]; return !!c && c.temporada === E.temporada && E.rodada - c.rodada < Mercado.CARENCIA; };
// o gráfico do valor nas últimas rodadas (um SVG pequeno, sobe verde, desce vermelho)
function graficoValor(lista) {
  const max = Math.max(...lista), min = Math.min(...lista), W = 220, H = 44, pass = W / (lista.length - 1);
  const y = (v) => (max === min ? H / 2 : H - 4 - ((v - min) / (max - min)) * (H - 8));
  const pts = lista.map((v, k) => `${Math.round(k * pass)},${Math.round(y(v))}`).join(" "), sobe = lista[lista.length - 1] >= lista[0];
  return `<figure class="grafico-valor ${sobe ? "sobe" : "desce"}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke-width="2"/></svg>
    <figcaption>Valor nas últimas ${lista.length} rodadas: ${dinheiro(lista[0])} → <b>${dinheiro(lista[lista.length - 1])}</b></figcaption></figure>`;
}
// clicar numa figurinha (em qualquer tela, menos no banco da prancheta, que tem o seu próprio toque) abre a ficha
document.addEventListener("click", (e) => {
  const f = e.target.closest(".figurinha[data-jogador]");
  if (f && !f.closest("#eBanco") && !f.closest("#ficha")) abrirFicha(f.dataset.jogador);
});
