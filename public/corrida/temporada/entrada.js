// A entrada da Carreira F1 e o convite da sala com os amigos, no visual da Central (central.css): o estúdio com o carro, a cor da equipe e o tema claro ou escuro.
// Só desenha: as ações continuam nos formulários de sede.js (#nova, #recuperar) e de grupo.js (#gnova, #gentra, #gnomeconv).
(function (root) {
"use strict";
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const logo = (id) => `<img src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`;
const SETA = '<svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const ABAS = [["nova", "Sozinho"], ["amigos", "Com os amigos"], ["recuperar", "Recuperar"]];
const temaBotao = () => `<button type="button" class="cxe-tema" data-cx-tema aria-pressed="false"><span>Modo escuro</span><b>Desligado</b></button>`;
const orcamento = (id) => root.F1Equipes?.EQUIPES?.[id]?.orcamento;

function moldura({ equipe, faixa, rotulo, titulo, texto, carro, equipes, painel }) {
  return `<div class="cxe"><header class="cxe-topo"><div class="cxe-faixa"><span class="cxe-logo" id="cxeLogo">${logo(equipe)}</span><i aria-hidden="true"></i><h2 id="cxeFaixa">${h(faixa)}</h2></div></header>
    <section class="cxe-capa"><small class="cx-rot">${h(rotulo)}</small><h1>${titulo}</h1>${texto ? `<p>${h(texto)}</p>` : ""}</section>
    ${carro}${equipes}<aside class="cxe-painel">${painel}<footer class="cxe-pe">${temaBotao()}</footer></aside></div>`;
}
const fichaDoCarro = (id, nome) => { const o = orcamento(id); return `<div class="cxe-ficha" id="cxeFicha"><small class="cx-rot">Seu carro</small><b>${h(nome)}</b>${o != null ? `<span>${o} pontos de orçamento</span>` : ""}</div>`; };

// A tela inicial. `equipes`: { id: { nome, cor } }; `grupo`: os formulários da sala com os amigos (grupo.js); `todas`: quantas pistas tem o calendário completo.
function inicial({ equipes, primeira, todas, grupo, amigos }) {
  const aberta = amigos ? "amigos" : "nova";
  const opcoes = Object.entries(equipes).map(([id, e]) => `<option value="${h(id)}"${id === primeira ? " selected" : ""}>${h(e.nome)}</option>`).join("");
  const faixa = `<nav class="cxe-equipes" aria-label="Equipes">${Object.entries(equipes).map(([id, e]) => `<button type="button" class="cxe-eq ${id === primeira ? "on" : ""}" style="--c:${h(e.cor)}" data-vitrine="${h(id)}" aria-pressed="${id === primeira}" aria-label="${h(e.nome)}" title="${h(e.nome)}">${logo(id)}</button>`).join("")}</nav>`;
  const painel = `<div class="cxe-abas" role="tablist" aria-label="Como começar">${ABAS.map(([id, nome]) => `<button type="button" role="tab" id="cxeAba-${id}" class="${id === aberta ? "on" : ""}" aria-selected="${id === aberta}" aria-controls="cxePainel-${id}" data-en-aba="${id}">${h(nome)}</button>`).join("")}</div>
    <div class="cxe-corpo" role="tabpanel" id="cxePainel-nova" aria-labelledby="cxeAba-nova"${aberta === "nova" ? "" : " hidden"}><form id="nova"><label for="nome">Seu nome no grid</label><input id="nome" name="nome" maxlength="40" required autocomplete="name" placeholder="Seu nome">
      <select id="equipe" name="equipe" class="cxe-oculto" tabindex="-1" aria-hidden="true">${opcoes}</select>
      <div class="cxe-duo"><div><label for="tamanho">Calendário</label><select id="tamanho" name="tamanho"><option value="8">8 GPs</option><option value="4">4 GPs</option><option value="${todas}">${todas} GPs</option></select></div>
      <div><label for="voltas">Voltas por GP</label><select id="voltas" name="voltas"><option value="3">3 voltas</option><option value="2">2 voltas</option><option value="5">5 voltas</option><option value="10">10 voltas</option></select></div></div>
      <label for="nivel">Dificuldade dos robôs</label><select id="nivel" name="nivel"><option value="medio">Médio</option><option value="facil">Fácil</option><option value="dificil">Difícil</option></select>
      <button class="cx-bt" type="submit">Abrir meu box ${SETA}</button></form></div>
    <div class="cxe-corpo" role="tabpanel" id="cxePainel-recuperar" aria-labelledby="cxeAba-recuperar" hidden><p class="cxe-dica">Use o código que apareceu quando você abriu a temporada.</p><form id="recuperar"><label for="codigo">Código de recuperação</label><input id="codigo" name="codigo" maxlength="20" autocomplete="off" placeholder="12 caracteres" required><button class="cx-bt" type="submit">Recuperar temporada ${SETA}</button></form></div>
    <div class="cxe-corpo cxe-grupo" role="tabpanel" id="cxePainel-amigos" aria-labelledby="cxeAba-amigos"${aberta === "amigos" ? "" : " hidden"}><p class="cxe-dica">Abra uma sala e mande o link no grupo. Cada amigo assume uma equipe de 2026, e todos disputam a mesma temporada, GP por GP.</p>${grupo}</div>`;
  return moldura({ equipe: primeira, faixa: equipes[primeira].nome, rotulo: "Carreira F1 · 2026", titulo: amigos ? "Sua equipe.<br>Seus amigos." : "Sua equipe.<br>Sua temporada.", carro: fichaDoCarro(primeira, equipes[primeira].nome), equipes: faixa, painel });
}
// Liga as abas, a faixa de equipes e o botão do tema da tela inicial.
function ligarInicial(primeira, equipes) {
  const C = root.Central; C.entrada(primeira); C.temaNaTela();
  document.querySelectorAll("[data-en-aba]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.enAba;
    document.querySelectorAll("[data-en-aba]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); document.getElementById(`cxePainel-${x.dataset.enAba}`).hidden = !on; });
    if (id !== "nova") document.querySelector(`#cxePainel-${id} input`)?.focus({ preventScroll: true });
  }));
  document.querySelectorAll("[data-vitrine]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.vitrine, e = equipes[id]; C.entrada(id);
    document.getElementById("equipe").value = id;
    document.getElementById("cxeFaixa").textContent = e.nome; document.getElementById("cxeLogo").innerHTML = logo(id);
    document.getElementById("cxeFicha").outerHTML = fichaDoCarro(id, e.nome);
    document.querySelectorAll("[data-vitrine]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
  }));
  ligarTema();
}
function ligarTema() { const b = document.querySelector(".cxe [data-cx-tema]"); if (b) b.addEventListener("click", () => root.Central.clique(b, () => {})); }

// O convite: quem chega pelo link só escreve o nome. A equipe é escolhida depois, na sala.
function convite({ codigo, erro, nome, equipe, nomeEquipe }) {
  const painel = `<div class="cxe-corpo"><h3>Entrar na sala</h3>${erro ? `<p class="cxe-erro" role="alert">${h(erro)}</p>` : ""}<form id="gnomeconv" autocomplete="off"><label for="gnome">Seu nome</label><input id="gnome" name="nome" maxlength="8" placeholder="até 8 letras" required value="${h(nome)}"><button class="cx-bt" type="submit">Entrar ${SETA}</button></form><a class="cxe-link" href="/corrida/temporada/">Voltar à temporada solo</a></div>`;
  return moldura({ equipe, faixa: "Com os amigos", rotulo: "Temporada com os amigos · 2026", titulo: `Sala<br><span>${h(codigo)}</span>`, texto: "Cada amigo assume uma equipe, e dois podem dividir a mesma. Todos disputam a mesma temporada.", carro: "", equipes: "", painel });
}
function ligarConvite(equipe) { const C = root.Central; C.entrada(equipe); C.temaNaTela(); ligarTema(); }

// A sala de espera com os amigos: o carro da sua equipe no estúdio, as 11 equipes embaixo com quem está em cada carro, e à direita
// o convite, quem está na sala, as opções e o botão de começar, tudo na primeira tela. As ações seguem em grupo.js (data-equipe, data-opcao,
// #gconvite, #gcomecar, #gsair, data-cargo); `S` é o estado que o servidor manda.
function sala({ S, max, opcoes, url }) {
  const eq = (id) => root.F1Pilotos.EQUIPES[id], eh = S.eu === S.host, minha = S.minhaEquipe, alguem = S.pessoas.some((p) => p.equipe);
  const vitrine = minha || S.pessoas.find((p) => p.equipe)?.equipe || Object.keys(root.F1Pilotos.EQUIPES)[0];
  const primeiro = (n) => h(String(n || "").split(/\s+/)[0]);
  const eu = S.pessoas.find((p) => p.id === S.eu), parceiros = minha ? S.pessoas.filter((p) => p.equipe === minha && p.id !== S.eu) : [];
  const ficha = minha
    ? `<div class="cxe-ficha" id="cxeFicha"><small class="cx-rot">Seu carro${eu?.carro != null ? ` · carro ${eu.carro + 1}` : ""}</small><b>${h(eq(minha).nome)}</b><span>${parceiros.length ? `Dividindo a equipe com ${parceiros.map((p) => h(p.nome)).join(", ")}` : "O outro carro fica com um robô, ou com um amigo"}${orcamento(minha) != null ? ` · ${orcamento(minha)} pontos de orçamento` : ""}</span></div>`
    : `<div class="cxe-ficha" id="cxeFicha"><small class="cx-rot">Seu carro</small><b>Escolha a sua equipe</b><span>Toque numa equipe aqui embaixo. Sem equipe, você só acompanha e assiste aos GPs.</span></div>`;
  const vaga = (p) => p ? `<i class="cxs-vaga on${p.id === S.eu ? " eu" : ""}" title="${h(p.nome)}">${primeiro(p.nome)}</i>` : '<i class="cxs-vaga">robô</i>';
  const equipes = `<nav class="cxs-equipes" aria-label="Escolha a sua equipe">${Object.keys(root.F1Pilotos.EQUIPES).map((id) => {
    const e = eq(id), ocup = S.pessoas.filter((p) => p.equipe === id), meu = minha === id, cheia = ocup.length >= 2 && !meu;
    return `<button type="button" class="cxs-eq${meu ? " on" : ""}${ocup.length ? " ocupada" : ""}" style="--c:${h(e.cor)}" data-equipe="${h(id)}" aria-pressed="${meu}" ${cheia ? "disabled" : ""} title="${h(e.nome)}${cheia ? " · lotada" : meu ? " · toque de novo para desistir" : ""}"><span class="cxs-logo">${logo(id)}</span><b>${h(e.nome)}</b><span class="cxs-vagas">${vaga(ocup[0])}${vaga(ocup[1])}</span></button>`;
  }).join("")}</nav>`;
  const pessoas = S.pessoas.map((p) => `<li class="${p.online ? "on" : ""}"><i class="cxs-bola" title="${p.online ? "na sala" : "fora da sala"}"></i><span class="cxs-nome"><b>${h(p.nome)}${p.id === S.eu ? " <small>(você)</small>" : ""}</b><small>${p.equipe ? `<i class="cxs-cor" style="--c:${h(eq(p.equipe).cor)}"></i>${h(eq(p.equipe).nome)}` : "sem equipe: só acompanha"}</small></span>${p.host ? '<em class="cxs-host">anfitrião</em>' : eh ? `<button type="button" class="cxs-cargo" data-cargo="${h(p.id)}">Tornar anfitrião</button>` : ""}</li>`).join("");
  const livres = max - S.pessoas.length;
  const opcao = (chave, rotulo, valores) => `<div class="cxs-op"><span>${rotulo}</span><div class="cxs-seg" role="group" aria-label="${rotulo}">${valores.map(([v, t]) => `<button type="button" data-opcao="${chave}" data-valor="${h(v)}" aria-pressed="${String(S.opcoes[chave]) === String(v)}" ${eh ? "" : "disabled"}>${t}</button>`).join("")}</div></div>`;
  const zap = `https://wa.me/?text=${encodeURIComponent(`Bora uma temporada de F1? Entra na minha sala: ${url}`)}`;
  const acao = eh
    ? `<button type="button" class="cx-bt" id="gcomecar" ${alguem ? "" : "disabled"}>Começar a temporada ${SETA}</button>${alguem ? "" : '<p class="cxe-dica cxs-falta">Escolha pelo menos uma equipe para começar.</p>'}`
    : '<p class="cxs-espera">O anfitrião começa a temporada quando todo mundo estiver pronto.</p>';
  const painel = `<div class="cxe-corpo cxs-painel">
      <section class="cxs-convite"><h3>Chame a galera</h3><div class="cxs-link"><code>${h(url.replace(/^https?:\/\//, ""))}</code></div>
        <div class="cxs-duas"><button type="button" class="cxs-bt" id="gconvite">Copiar convite</button><a class="cxs-bt cxs-zap" href="${h(zap)}" target="_blank" rel="noopener">WhatsApp</a></div></section>
      <section class="cxs-gente"><header><h4>Na sala</h4><small>${S.pessoas.length} de ${max}</small></header><ul class="cxs-pessoas">${pessoas}</ul>${livres > 0 ? `<p class="cxs-livres">${livres} ${livres === 1 ? "lugar livre" : "lugares livres"}</p>` : ""}</section>
      <section class="cxs-opcoes"><header><h4>A temporada</h4><small>${eh ? "você escolhe" : "o anfitrião escolhe"}</small></header>${opcoes.map(([c, r, v]) => opcao(c, r, v)).join("")}</section>
      ${acao}
      <button type="button" class="cxs-sair" id="gsair">Sair da sala</button>
    </div>`;
  return { equipe: vitrine, html: moldura({ equipe: vitrine, faixa: minha ? eq(minha).nome : "Com os amigos", rotulo: "Temporada com os amigos · 2026", titulo: `Sala<br><span>${h(S.codigo)}</span>`, texto: `${S.opcoes.tamanho} GPs · ${S.opcoes.voltas} voltas por GP. Dois amigos podem dividir a mesma equipe, um em cada carro; as equipes sem ninguém ficam com os robôs.`, carro: ficha, equipes, painel }).replace('class="cxe"', 'class="cxe cxs"') };
}
function ligarSala(equipe) { const C = root.Central; C.entrada(equipe); C.temaNaTela(); }

root.EntradaCarreira = { inicial, ligarInicial, convite, ligarConvite, sala, ligarSala };
})(window);
