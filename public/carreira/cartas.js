// Carreira de Treinador (parte 2): o jogador. O retrato em pixel-art (a cabeça de rostos.js, do Leilão, com a camisa do
// clube de agora), a figurinha (o card: faixa pela nota, posição, atributos, valor e situação) e a ficha aberta, com
// as ações: proposta (jogador de outro clube) ou pôr à venda / vender na hora (jogador seu).
const retratos = new Map();
// a camisa no retrato: as cores do clube e as listras do escudo
function camisaDoClube(clube) {
  const c = CLUBES[clube]; if (!c) return ["#3a4a5a", "#dde4ea", ""];
  const l = c.escudo && c.escudo.listras ? c.escudo.listras[0] : "";
  return [c.cores[0], c.cores[1], l === "v" || l === "v-topo" ? "l" : l === "h" || l === "h-baixo" ? "h" : l === "d" ? "d" : ""];
}
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
// o uniforme do boneco dos replays (lances.js) com as cores do clube
function uniformeDoClube(clube) {
  const [cam, det, desenho] = camisaDoClube(clube), claro = (hx) => { const n = parseInt(hx.slice(1), 16); return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
  const calcao = claro(cam) > 200 ? "#1a1a1a" : claro(cam) < 50 ? "#1a1a1a" : "#f4f4f4";
  return { cam, det, desenho, calcao, meiao: cam, chuteira: "#1a1a1a" };
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
  const j = JOGADORES[pid], n = notaDe(j), clube = donoDe(pid), valor = Mercado.valorDe(comNota(j));
  const atr = ATRIBUTOS.filter(([k]) => j.pos === "GOL" ? ["def", "fis"].includes(k) || k === "pas" : true).map(([k, nome]) => {
    const v = k === "def" && j.pos === "GOL" ? j.atr.gol : Math.max(20, Math.min(99, j.atr[k] + ((E && E.bonusNota[pid]) || 0)));
    return `<li><span>${k === "def" && j.pos === "GOL" ? "Goleiro" : nome}</span><b>${v}</b><i style="--v:${v}%"></i></li>`;
  }).join("");
  return `<article class="figurinha ${tamanho} ${faixa(n)}" style="${coresClube(clube)}" data-jogador="${pid}">
    <header><span class="nota">${n}</span><span class="pos">${j.pos}</span>${escudo(clube, tamanho === "grande" ? 2 : 1)}</header>
    <div class="foto"><img class="pix" src="${retrato(pid)}" alt=""></div>
    <h4>${h(tamanho === "grande" ? j.nome : sobrenome(j.nome))}</h4>
    ${tamanho === "grande" ? `<p class="sub">${h(POS_NOME[j.pos] || j.pos)} · ${h(j.nat || "")}${j.idade ? ` · ${j.idade} anos` : ""}</p><ul class="atributos">${atr}</ul>` : ""}
    <footer><span>${dinheiro(valor)}</span><span class="marcas">${situacao(pid, true)}</span></footer>
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
function desenharFicha(resposta) {
  const pid = fichaAberta; if (!pid) return;
  const j = JOGADORES[pid], clube = donoDe(pid), meu = clube === E.clube, valor = Mercado.valorDe(comNota(j)), sal = meu ? salarioDe(j) : Mercado.salarioDe(comNota(j));
  const gols = (E.artilharia.find((a) => a.id === pid) || {}).gols || 0;
  const info = `<dl class="dados">
    <div><dt>Clube</dt><dd>${escudo(clube, 1)} ${h(nomeClube(clube))}</dd></div>
    <div><dt>Valor</dt><dd>${dinheiro(valor)}</dd></div>
    <div><dt>Salário</dt><dd>${dinheiro(sal)}/mês</dd></div>
    <div><dt>Gols na temporada</dt><dd>${gols}</dd></div>
  </dl><div class="marcas-grandes">${situacao(pid, false)}</div>`;
  let acoes = "";
  if (meu) {
    const pode = E.janela.aberta && E.elenco.length > Mercado.ELENCO_MIN;
    acoes = `<div class="acoes">
      <button id="fVenda" class="secundario">${ic("etiqueta")} ${E.aVenda.includes(pid) ? "Tirar da lista de venda" : "Pôr na lista de venda"}</button>
      <button id="fVenderJa" class="perigo" ${pode ? "" : "disabled"}>${ic("moeda")} Vender agora por ${dinheiro(Mercado.vendaRapida(comNota(j)))}</button>
      <p class="suave">${E.janela.aberta ? "Na lista de venda, os clubes mandam propostas entre as rodadas. Vender agora é na hora, mas por 70% do valor." : "A janela está fechada: dá para pôr na lista, mas as vendas só voltam na rodada 17."}</p>
    </div>`;
  } else {
    const tent = E.tentativas[pid] || 0, desconto = E.indicacoes[pid] ? 0.85 : 1;
    const sugerido = Math.round(valor * desconto * 1.15 / 1e5) * 1e5;
    acoes = `<form class="proposta" id="fProposta">
      <h3>Fazer proposta ${tent ? `<small>(${3 - tent} tentativa${3 - tent === 1 ? "" : "s"} nesta rodada)</small>` : ""}</h3>
      <label>Valor da transferência<div class="valor"><button type="button" data-passo="-1">${ic("menos")}</button><input id="fValor" inputmode="numeric" value="${(resposta?.pedido || sugerido) / 1e6}"><span>mi</span><button type="button" data-passo="1">${ic("mais")}</button></div></label>
      <label>Salário por mês<div class="valor"><button type="button" data-passo-s="-1">${ic("menos")}</button><input id="fSalario" inputmode="numeric" value="${Math.round((resposta?.salarioPedido || sal) / 1e3)}"><span>mil</span><button type="button" data-passo-s="1">${ic("mais")}</button></div></label>
      <p class="suave">Caixa: ${dinheiro(E.caixa)} · valor de mercado: ${dinheiro(valor)}${desconto < 1 ? " · o olheiro diz que dá para pagar 15% menos" : ""}</p>
      <button class="primario largo" ${E.janela.aberta && tent < 3 ? "" : "disabled"}>${E.janela.aberta ? "Enviar proposta" : "Janela fechada"}</button>
      ${resposta ? `<p class="resposta ${resposta.resultado}">${h(resposta.motivo)}</p>` : ""}
    </form>`;
  }
  $("fichaCorpo").innerHTML = `<div class="ficha-grade">${figurinha(pid, "grande")}<div class="ficha-info">${info}${acoes}</div></div>`;
  if (meu) {
    $("fVenda").onclick = async () => { const r = await pedir("vender", { jogador: pid, modo: "lista" }); if (!r.ok) return toast(r.error); receber(r.estado); desenharFicha(); };
    $("fVenderJa").onclick = async () => {
      if (!confirm(`Vender ${j.nome} agora por ${dinheiro(Mercado.vendaRapida(comNota(j)))}?`)) return;
      const r = await pedir("vender", { jogador: pid, modo: "agora" }); if (!r.ok) return toast(r.error);
      receber(r.estado); $("ficha").close(); toast(r.mensagem);
    };
  } else {
    const passo = (id, d, unidade) => { const el = $(id), v = parseFloat(String(el.value).replace(",", ".")) || 0; el.value = Math.max(0, Math.round((v + d * unidade) * 10) / 10); };
    for (const b of $("fichaCorpo").querySelectorAll("[data-passo]")) b.onclick = () => passo("fValor", +b.dataset.passo, valor >= 2e7 ? 1 : 0.1);
    for (const b of $("fichaCorpo").querySelectorAll("[data-passo-s]")) b.onclick = () => passo("fSalario", +b.dataset.passoS, sal >= 2e5 ? 10 : 5);
    $("fProposta").onsubmit = async (ev) => {
      ev.preventDefault();
      const v = Math.round(parseFloat(String($("fValor").value).replace(",", ".")) * 1e6), s = Math.round(parseFloat(String($("fSalario").value).replace(",", ".")) * 1e3);
      const r = await pedir("proposta", { jogador: pid, valor: v, salario: s });
      if (!r.ok) return toast(r.error);
      receber(r.estado);
      if (r.resposta.resultado === "aceita") { $("ficha").close(); toast(r.resposta.motivo); festa(); return; }
      desenharFicha(r.resposta);
    };
  }
}
// clicar numa figurinha (em qualquer tela, menos no banco da prancheta, que tem o seu próprio toque) abre a ficha
document.addEventListener("click", (e) => {
  const f = e.target.closest(".figurinha[data-jogador]");
  if (f && !f.closest("#eBanco") && !f.closest("#ficha")) abrirFicha(f.dataset.jogador);
});
