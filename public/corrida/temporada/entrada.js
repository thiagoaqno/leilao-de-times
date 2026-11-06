// A entrada da Carreira F1 e o convite da sala com os amigos, no visual da Central (central.css): o estúdio com o carro, a cor da equipe e o tema claro ou escuro.
// Só desenha: as ações continuam nos formulários de sede.js (#nova, #recuperar) e de grupo.js (#gnova, #gentra, #gnomeconv).
(function (root) {
"use strict";
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const logo = (id) => `<img src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`;
const SETA = '<svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const ABAS = [["nova", "Nova temporada"], ["recuperar", "Recuperar"], ["amigos", "Com os amigos"]];
const temaBotao = () => `<button type="button" class="cxe-tema" data-cx-tema aria-pressed="false"><span>Modo escuro</span><b>Desligado</b></button>`;
const orcamento = (id) => root.F1Equipes?.EQUIPES?.[id]?.orcamento;

function moldura({ equipe, faixa, rotulo, titulo, texto, carro, equipes, painel }) {
  return `<div class="cxe"><header class="cxe-topo"><div class="cxe-faixa"><span class="cxe-logo" id="cxeLogo">${logo(equipe)}</span><i aria-hidden="true"></i><h2 id="cxeFaixa">${h(faixa)}</h2></div></header>
    <section class="cxe-capa"><small class="cx-rot">${h(rotulo)}</small><h1>${titulo}</h1>${texto ? `<p>${h(texto)}</p>` : ""}</section>
    ${carro}${equipes}<aside class="cxe-painel">${painel}<footer class="cxe-pe">${temaBotao()}</footer></aside></div>`;
}
const fichaDoCarro = (id, nome) => { const o = orcamento(id); return `<div class="cxe-ficha" id="cxeFicha"><small class="cx-rot">Seu carro</small><b>${h(nome)}</b>${o != null ? `<span>${o} pontos de orçamento</span>` : ""}</div>`; };

// A tela inicial. `equipes`: { id: { nome, cor } }; `grupo`: os formulários da sala com os amigos (grupo.js); `todas`: quantas pistas tem o calendário completo.
function inicial({ equipes, primeira, todas, grupo }) {
  const opcoes = Object.entries(equipes).map(([id, e]) => `<option value="${h(id)}"${id === primeira ? " selected" : ""}>${h(e.nome)}</option>`).join("");
  const faixa = `<nav class="cxe-equipes" aria-label="Equipes">${Object.entries(equipes).map(([id, e]) => `<button type="button" class="cxe-eq ${id === primeira ? "on" : ""}" style="--c:${h(e.cor)}" data-vitrine="${h(id)}" aria-pressed="${id === primeira}" aria-label="${h(e.nome)}" title="${h(e.nome)}">${logo(id)}</button>`).join("")}</nav>`;
  const painel = `<div class="cxe-abas" role="tablist" aria-label="Como começar">${ABAS.map(([id, nome], i) => `<button type="button" role="tab" id="cxeAba-${id}" class="${i ? "" : "on"}" aria-selected="${!i}" aria-controls="cxePainel-${id}" data-en-aba="${id}">${h(nome)}</button>`).join("")}</div>
    <div class="cxe-corpo" role="tabpanel" id="cxePainel-nova" aria-labelledby="cxeAba-nova"><form id="nova"><label for="nome">Seu nome no grid</label><input id="nome" name="nome" maxlength="40" required autocomplete="name" placeholder="Seu nome">
      <select id="equipe" name="equipe" class="cxe-oculto" tabindex="-1" aria-hidden="true">${opcoes}</select>
      <div class="cxe-duo"><div><label for="tamanho">Calendário</label><select id="tamanho" name="tamanho"><option value="8">8 GPs</option><option value="4">4 GPs</option><option value="${todas}">${todas} GPs</option></select></div>
      <div><label for="voltas">Voltas por GP</label><select id="voltas" name="voltas"><option value="3">3 voltas</option><option value="2">2 voltas</option><option value="5">5 voltas</option><option value="10">10 voltas</option></select></div></div>
      <label for="nivel">Dificuldade dos robôs</label><select id="nivel" name="nivel"><option value="medio">Médio</option><option value="facil">Fácil</option><option value="dificil">Difícil</option></select>
      <button class="cx-bt" type="submit">Abrir meu box ${SETA}</button></form></div>
    <div class="cxe-corpo" role="tabpanel" id="cxePainel-recuperar" aria-labelledby="cxeAba-recuperar" hidden><p class="cxe-dica">Use o código que apareceu quando você abriu a temporada.</p><form id="recuperar"><label for="codigo">Código de recuperação</label><input id="codigo" name="codigo" maxlength="20" autocomplete="off" placeholder="12 caracteres" required><button class="cx-bt" type="submit">Recuperar temporada ${SETA}</button></form></div>
    <div class="cxe-corpo cxe-grupo" role="tabpanel" id="cxePainel-amigos" aria-labelledby="cxeAba-amigos" hidden>${grupo}</div>`;
  return moldura({ equipe: primeira, faixa: equipes[primeira].nome, rotulo: "Carreira F1 · 2026", titulo: "Sua equipe.<br>Sua temporada.", carro: fichaDoCarro(primeira, equipes[primeira].nome), equipes: faixa, painel });
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

root.EntradaCarreira = { inicial, ligarInicial, convite, ligarConvite };
})(window);
