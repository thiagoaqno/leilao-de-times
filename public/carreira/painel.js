// Carreira de Treinador: o painel do time na sede (#painelTime). Quatro abas (visão geral, setores, elenco e finanças)
// com os números do seu clube agora. A pílula da aba desliza até a escolhida, os números sobem contando e as barras
// crescem; tocar num setor mostra quem joga nele, e tocar num jogador abre a ficha (cartas.js). Só lê o estado (E):
// nada aqui vai para o servidor. Também deixa as cartas inclinarem atrás do mouse (só com mouse, e sem "menos movimento").
const ABAS_PAINEL = [["geral", "Visão geral"], ["setores", "Setores"], ["elenco", "Elenco"], ["financas", "Finanças"]];
const SETORES = [["GK", "Goleiro"], ["DEF", "Defesa"], ["MID", "Meio"], ["ATT", "Ataque"]];
let abaPainel = "geral", setorAberto = null, ordemElenco = "nota";
const calmoPainel = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const media = (l) => (l.length ? l.reduce((s, n) => s + n, 0) / l.length : 0);

function painelTime() {
  const el = $("painelTime"); if (!el || !E) return;
  el.innerHTML = `<div class="painel-topo"><h3>Painel do time</h3>
    <div class="abas" role="tablist" aria-label="Painel do time"><span class="abas-pilula" aria-hidden="true"></span>${ABAS_PAINEL.map(([id, nome]) =>
      `<button role="tab" data-aba="${id}" aria-selected="${id === abaPainel}">${nome}</button>`).join("")}</div></div>
    <div class="painel-corpo" role="tabpanel">${corpoPainel()}</div>`;
  moverPilula(el, false);
  animarPainel(el);
}
function corpoPainel() {
  if (abaPainel === "setores") return painelSetores();
  if (abaPainel === "elenco") return painelElenco();
  if (abaPainel === "financas") return painelFinancas();
  return painelGeral();
}
// a pílula desliza até a aba escolhida (na primeira vez, já nasce no lugar)
function moverPilula(el, animar = true) {
  const b = el.querySelector(`[data-aba="${abaPainel}"]`), p = el.querySelector(".abas-pilula"); if (!b || !p) return;
  p.style.transition = animar ? "" : "none";
  p.style.width = `${b.offsetWidth}px`; p.style.transform = `translateX(${b.offsetLeft - 4}px)`;
}
// os números contam do zero até o valor; as barras crescem de 0 até a largura (uma vez por desenho)
function animarPainel(el) {
  const barras = [...el.querySelectorAll("[data-largura]")].map((b) => [b, "width", b.dataset.largura])
    .concat([...el.querySelectorAll("[data-altura]")].map((b) => [b, "height", b.dataset.altura]));
  for (const [b, lado, v] of barras) b.style[lado] = calmoPainel() ? v : "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => { for (const [b, lado, v] of barras) b.style[lado] = v; }));
  if (calmoPainel()) return;
  for (const n of el.querySelectorAll("[data-conta]")) {
    const fim = +n.dataset.conta, casas = +(n.dataset.casas || 0), ini = performance.now(), dur = 700;
    const passo = (t) => { const k = Math.min(1, (t - ini) / dur), e = 1 - (1 - k) ** 3; n.textContent = (fim * e).toFixed(casas); if (k < 1) requestAnimationFrame(passo); };
    n.textContent = (0).toFixed(casas); requestAnimationFrame(passo);
  }
}
const conta = (v, casas = 0) => `<b data-conta="${v}" data-casas="${casas}">${Number(v).toFixed(casas)}</b>`;

// ---------- visão geral ----------
function painelGeral() {
  const elenco = elencoDe(E.clube), notas = elenco.map(notaDe).sort((a, b) => b - a), forca = Math.round(media(notas.slice(0, 11)));
  const idade = media(elenco.map((j) => Evolucao.idadeNa(j, E.temporada))), valor = elenco.reduce((s, j) => s + valorAtual(j.id), 0);
  const linha = E.tabela.find((l) => l.id === E.clube) || { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, ultimos: [] };
  const aproveitamento = linha.j ? Math.round(linha.p / (linha.j * 3) * 100) : 0, artilheiro = E.artilharia.find((a) => donoDe(a.id) === E.clube);
  const forma = E.meus.filter((j) => j.placar).slice(-5).map(resultadoMeu);
  return `<div class="painel-geral">
    <div class="destaque-forca"><span class="anel" style="--v:${forca}"><span>${conta(forca)}<small>força</small></span></span>
      <div><small>Melhor onze</small><p>${notas.filter((n) => n >= 85).length} acima de 85 · ${notas.filter((n) => n >= 90).length} acima de 90</p></div></div>
    <dl class="numeros">
      <div><dt>Pontos</dt><dd>${conta(linha.p)}<small>${linha.j} jogos</small></dd></div>
      <div><dt>Aproveitamento</dt><dd>${conta(aproveitamento)}<small>%</small></dd></div>
      <div><dt>Gols</dt><dd>${conta(linha.gp)}<small>${linha.gc} sofridos</small></dd></div>
      <div><dt>Idade média</dt><dd>${conta(idade, 1)}<small>anos</small></dd></div>
      <div><dt>Valor do elenco</dt><dd><b>${dinheiro(valor)}</b></dd></div>
      <div><dt>Artilheiro</dt><dd><b>${artilheiro ? h(sobrenome(nomeJogador(artilheiro.id))) : "—"}</b><small>${artilheiro ? `${artilheiro.gols} gols` : ""}</small></dd></div>
    </dl>
    <div class="painel-linha"><span class="rotulo-mini">Moral · ${humor(E.moral)}</span><span class="trilho"><i class="moral-barra" data-largura="${E.moral}%"></i></span></div>
    <div class="painel-linha"><span class="rotulo-mini">Últimos jogos</span><span class="forma-chips">${forma.length ? forma.map((r, i) => `<i class="res ${r}" style="--i:${i}">${r}</i>`).join("") : `<small class="suave">Nenhum ainda</small>`}</span></div>
  </div>`;
}
// ---------- setores: a média de quem joga em cada faixa do campo ----------
function painelSetores() {
  const det = Motor.escalacaoDetalhada(meuTime()), setores = SETORES.map(([id, nome]) => {
    const js = det.filter((v) => v.slot === id && v.id).map((v) => JOGADORES[v.id]);
    return { id, nome, js, nota: Math.round(media(js.map(notaDe))) };
  });
  const melhor = Math.max(...setores.map((s) => s.nota)), pior = Math.min(...setores.map((s) => s.nota));
  return `<div class="painel-setores">${setores.map((s) => `<button class="setor${setorAberto === s.id ? " aberto" : ""}" data-setor="${s.id}" aria-expanded="${setorAberto === s.id}">
      <span class="setor-nome">${s.nome}<small>${s.js.length} jogador${s.js.length === 1 ? "" : "es"}</small></span>
      <span class="trilho"><i class="${faixa(s.nota)}" data-largura="${Math.max(4, (s.nota - 50) / 45 * 100)}%"></i></span>
      <b>${s.nota || "—"}</b>${melhor - pior < 2 ? "" : s.nota === melhor ? `<em class="selo-setor bom">ponto forte</em>` : s.nota === pior ? `<em class="selo-setor ruim">a reforçar</em>` : ""}</button>
      ${setorAberto === s.id ? `<div class="setor-jogadores">${s.js.map((j) => linhaJogador(j.id)).join("")}</div>` : ""}`).join("")}
    <p class="suave">Média dos titulares de cada setor na formação ${h(E.escalacao.formacao)}. Toque num setor para ver quem joga.</p></div>`;
}
const linhaJogador = (pid) => { const j = JOGADORES[pid], n = notaDe(j); return `<button class="linha-jogador ${faixa(n)}" data-ficha="${pid}"><img class="pix" src="${retrato(pid)}" alt=""><span><b>${h(j.nome)}</b><small>${POS_NOME[j.pos] || j.pos} · ${Evolucao.idadeNa(j, E.temporada)} anos</small></span><em class="nota-chip ${faixa(n)}">${n}</em><small class="valor">${dinheiro(valorAtual(pid))}</small></button>`; };
// ---------- elenco: os melhores, por nota, valor ou idade ----------
function painelElenco() {
  const ordens = { nota: (a, b) => notaDe(b) - notaDe(a), valor: (a, b) => valorAtual(b.id) - valorAtual(a.id), idade: (a, b) => Evolucao.idadeNa(a, E.temporada) - Evolucao.idadeNa(b, E.temporada) };
  const lista = elencoDe(E.clube).sort(ordens[ordemElenco]).slice(0, 8);
  const faixas = elencoDe(E.clube).reduce((s, j) => { s[faixa(notaDe(j))]++; return s; }, { elite: 0, ouro: 0, prata: 0, bronze: 0 });
  return `<div class="painel-elenco"><div class="faixas-resumo">${[["elite", "90+"], ["ouro", "85-89"], ["prata", "80-84"], ["bronze", "até 79"]].map(([f, t]) => `<span class="${f}"><i></i>${faixas[f]}<small>${t}</small></span>`).join("")}</div>
    <div class="ordem" role="group" aria-label="Ordenar">${[["nota", "Nota"], ["valor", "Valor"], ["idade", "Mais jovens"]].map(([k, t]) => `<button data-ordem="${k}" aria-pressed="${k === ordemElenco}">${t}</button>`).join("")}</div>
    <div class="lista-jogadores">${lista.map((j, i) => linhaJogador(j.id).replace("<button ", `<button style="--i:${i}" `)).join("")}</div></div>`;
}
// ---------- finanças: o caixa, a folha e o saldo de cada rodada ----------
function painelFinancas() {
  const rodadas = [...E.financas].sort((a, b) => a.rodada - b.rodada).slice(-10).map((f) => ({ r: f.rodada, saldo: f.itens.reduce((s, [, v]) => s + v, 0) }));
  const maior = Math.max(1, ...rodadas.map((x) => Math.abs(x.saldo)));
  const folhaAno = E.folha * 12, valor = elencoDe(E.clube).reduce((s, j) => s + valorAtual(j.id), 0);
  return `<div class="painel-financas">
    <dl class="numeros"><div><dt>Caixa</dt><dd><b class="${E.caixa < 0 ? "neg" : ""}">${dinheiro(E.caixa)}</b></dd></div>
      <div><dt>Folha por mês</dt><dd><b>${dinheiro(E.folha)}</b><small>${dinheiro(folhaAno)} no ano</small></dd></div>
      <div><dt>Valor do elenco</dt><dd><b>${dinheiro(valor)}</b></dd></div></dl>
    ${rodadas.length ? `<div class="grafico-saldo" aria-label="Saldo por rodada">${rodadas.map((x, i) => `<span class="${x.saldo < 0 ? "neg" : "pos"}" style="--i:${i}" title="Jogo ${x.r + 1}: ${x.saldo > 0 ? "+" : ""}${dinheiro(x.saldo)}"><i data-altura="${Math.max(3, Math.abs(x.saldo) / maior * 100)}%"></i><small>${x.r + 1}</small></span>`).join("")}</div>
      <p class="suave">Saldo de cada jogo (bilheteria, prêmios, salários e negócios). Passe o mouse para ver o valor.</p>` : `<p class="suave">O saldo de cada jogo aparece depois da estreia.</p>`}
  </div>`;
}

// os toques no painel (um ouvinte só, que vale para todo desenho)
document.addEventListener("click", (e) => {
  const p = e.target.closest("#painelTime"); if (!p) return;
  const aba = e.target.closest("[data-aba]"), setor = e.target.closest("[data-setor]"), ordem = e.target.closest("[data-ordem]"), ficha = e.target.closest("[data-ficha]");
  if (aba && aba.dataset.aba !== abaPainel) {
    abaPainel = aba.dataset.aba;
    for (const b of p.querySelectorAll("[data-aba]")) b.setAttribute("aria-selected", String(b === aba));
    moverPilula(p);
    const corpo = p.querySelector(".painel-corpo"); corpo.innerHTML = corpoPainel(); corpo.classList.remove("troca"); void corpo.offsetWidth; corpo.classList.add("troca");
    animarPainel(corpo);
  } else if (ficha) abrirFicha(ficha.dataset.ficha);
  else if (setor) { setorAberto = setorAberto === setor.dataset.setor ? null : setor.dataset.setor; const corpo = p.querySelector(".painel-corpo"); corpo.innerHTML = corpoPainel(); animarPainel(corpo); }
  else if (ordem) { ordemElenco = ordem.dataset.ordem; const corpo = p.querySelector(".painel-corpo"); corpo.innerHTML = corpoPainel(); }
});
addEventListener("resize", () => { const p = $("painelTime"); if (p) moverPilula(p, false); });

// as cartas inclinam atrás do mouse e o brilho segue o ponteiro (as douradas brilham mais)
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("pointermove", (e) => {
    const f = e.target.closest(".figurinha"); if (!f || calmoPainel()) return;
    const r = f.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    f.style.setProperty("--rx", `${(0.5 - y) * 10}deg`); f.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
    f.style.setProperty("--mx", `${x * 100}%`); f.style.setProperty("--my", `${y * 100}%`);
  });
  document.addEventListener("pointerout", (e) => { const f = e.target.closest(".figurinha"); if (f && !f.contains(e.relatedTarget)) { f.style.removeProperty("--rx"); f.style.removeProperty("--ry"); } });
}
