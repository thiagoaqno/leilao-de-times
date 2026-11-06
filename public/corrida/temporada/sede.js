// Sede da temporada: a tela é refeita a partir do save recebido, nunca de números guardados no navegador.
const Pilotos = window.F1Pilotos, Equipes = window.F1Equipes, Regras = window.F1Temporada;
const socket = io("/corrida-temporada"), app = document.getElementById("app"), aviso = document.getElementById("aviso");
const chave = "corrida:temporada:token";
let token = localStorage.getItem(chave), estado = null, codigo = null, ocupado = false;
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dinheiro = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR")} mi`;
const piloto = (id) => Pilotos.PILOTOS.find((p) => p.id === id);
const equipe = (id) => Pilotos.EQUIPES[id];
function falar(msg) { aviso.textContent = msg; aviso.classList.remove("hidden"); clearTimeout(falar.t); falar.t = setTimeout(() => aviso.classList.add("hidden"), 4500); }
function pedir(evento, dados = {}) {
  if (ocupado) return Promise.resolve(null);
  ocupado = true;
  return new Promise((resolve) => socket.emit(evento, dados, (r) => {
    ocupado = false;
    if (!r?.ok) falar(r?.erro || "Não foi possível continuar.");
    else if (r.dados) { estado = r; renderizar(); }
    resolve(r);
  }));
}
function guardar(r) {
  if (!r?.ok) return;
  if (r.token) { token = r.token; localStorage.setItem(chave, token); }
  if (r.recuperacao) codigo = r.recuperacao;
  estado = r; renderizar();
}
function marca(id) { return `<img src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`; }
function telaInicial() {
  window.Central?.sair();
  window.F1Garagem?.fundoDoGP(null);
  const opcoes = Object.entries(Pilotos.EQUIPES).map(([id, e]) => `<option value="${h(id)}">${h(e.nome)}</option>`).join("");
  const primeira = Object.keys(Pilotos.EQUIPES)[0];
  document.documentElement.style.setProperty("--eq", equipe(primeira).cor);
  app.innerHTML = `<div class="abertura vt-entrada"><section class="vt-salao"><div class="taglinha">Corrida da Galera · 2026</div><h1>Sua equipe. <span>Sua temporada.</span></h1><div class="vt-plataforma" aria-hidden="true"></div><div class="vt-carro" id="vitrine">${window.F1Garagem.palcoSlot(primeira)}</div><nav class="vt-tiras" aria-label="Equipes">${Object.entries(Pilotos.EQUIPES).map(([id, e]) => `<button type="button" class="vt-tira ${id === primeira ? "on" : ""}" style="--c:${h(e.cor)}" data-vitrine="${h(id)}" aria-pressed="${id === primeira}">${marca(id)}<span>${h(e.nome)}</span></button>`).join("")}</nav></section>
    <section class="folha"><h2>Abrir temporada</h2><form id="nova"><label for="nome">Seu nome no grid</label><input id="nome" name="nome" maxlength="40" required autocomplete="name" placeholder="Seu nome">
      <label for="equipe">Equipe</label><select id="equipe" name="equipe">${opcoes}</select><div class="duo"><div><label for="tamanho">Calendário</label><select id="tamanho" name="tamanho"><option value="8">8 GPs</option><option value="4">4 GPs · mini temporada</option><option value="${Regras.PISTAS_TRABALHADAS.length}">${Regras.PISTAS_TRABALHADAS.length} GPs · todas as pistas refeitas</option></select></div>
      <div><label for="voltas">Voltas por GP</label><select id="voltas" name="voltas"><option value="3">3 voltas</option><option value="2">2 voltas</option><option value="5">5 voltas</option><option value="10">10 voltas</option></select></div></div>
      <label for="nivel">Dificuldade dos robôs</label><select id="nivel" name="nivel"><option value="medio">Médio</option><option value="facil">Fácil</option><option value="dificil">Difícil</option></select><button class="primary" type="submit">Abrir meu box →</button></form>
      <div class="or">Já tenho temporada</div><form id="recuperar"><label for="codigo">Código de recuperação</label><input id="codigo" name="codigo" maxlength="20" autocomplete="off" placeholder="12 caracteres"><button type="submit">Recuperar save</button></form>
      <div class="or">Temporada com os amigos</div>${window.SedeGrupo.formulario()}</section></div>`;
  // A foto deixa o formulário livre de imediato; a vitrine 3D só é montada ao escolher uma equipe.
  const escolher = (id) => { document.documentElement.style.setProperty("--eq", equipe(id).cor); document.getElementById("equipe").value = id; window.F1Garagem.trocarVitrine(id); document.querySelectorAll("[data-vitrine]").forEach((b) => { const on = b.dataset.vitrine === id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); };
  document.querySelectorAll("[data-vitrine]").forEach((b) => b.addEventListener("click", () => escolher(b.dataset.vitrine)));
  document.getElementById("equipe").value = primeira;
  document.getElementById("equipe").addEventListener("change", (e) => escolher(e.target.value));
}
function tabela(rows, tipo, meu, rival = null) {
  const lista = rows.slice(0, 10);
  if (meu && !lista.some((x) => x.id === meu)) lista.push(rows.find((x) => x.id === meu));
  if (rival && !lista.some((x) => x?.id === rival)) lista.push(rows.find((x) => x.id === rival));
  return `<table class="placar"><thead><tr><th>Pos.</th><th>${tipo}</th><th>Pontos</th></tr></thead><tbody>${lista.filter(Boolean).map((r) => `<tr class="${r.id === meu ? "eu" : r.id === rival ? "rival" : ""}"><td>${rows.indexOf(r) + 1}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe || r.id)?.cor || "#fff")}"></i><b>${h(r.nome)}</b>${r.id === rival ? ' <small class="rival-selo">RIVAL</small>' : ""}</td><td><b>${r.pontos}</b></td></tr>`).join("")}</tbody></table>`;
}
function renderizar() {
  if (!estado?.dados) return telaInicial();
  const G = window.F1Garagem, s = estado.dados, eq = equipe(s.equipe), t = estado.tabelas || Regras.tabelas(s), terminou = s.gp >= s.tamanho;
  const prox = s.calendario[s.gp], ativo = estado.ativo, previsao = terminou ? null : G.previsaoDoGP(s.semente, s.ano, s.gp);
  const ultimo = s.resultados.filter((r) => r.ano === s.ano).at(-1);
  const im = Regras.imersao(s), rival = im.rival && piloto(im.rival.id), eu = ultimo?.linhas.find((r) => r.piloto === "voce");
  const resultadoTexto = eu ? (eu.dnf ? "abandonou" : eu.nc ? "não foi classificado" : `terminou em ${eu.pos}º`) : "";
  const cumpriu = eu && !eu.dnf && !eu.nc && eu.pos <= (ultimo.objetivoGP || im.meta.gp);
  const caixaMensagens = `<section class="bloco imersao"><header><h2>Caixa de mensagens</h2><small>Equipe e notícias</small></header><div class="im-metas"><div><small>Objetivo do GP</small><b>${terminou ? "Temporada encerrada" : `Terminar no top ${im.meta.gp}`}</b></div><div><small>Objetivo da temporada</small><b>Top ${im.meta.temporada} no campeonato</b><span>${s.gp ? `Atual: ${im.classificacao}º` : "Ainda sem corridas"}</span></div><div><small>Confiança da diretoria</small><b>${im.confianca}%</b><span>GP: +6 / −4 · temporada: +10 / −8</span></div></div><div class="im-mensagens">
    <article><small>CHEFE DE EQUIPE</small><p>${terminou ? `A temporada terminou em ${im.classificacao}º. Nossa meta era o top ${im.meta.temporada}.` : `Para o GP de ${h(prox.nome)}, queremos terminar no top ${im.meta.gp}. Na temporada, a meta é o top ${im.meta.temporada}.`}</p></article>
    <article><small>ENGENHEIRO</small><p>${eu ? `No último GP você ${resultadoTexto}: objetivo ${cumpriu ? "cumprido" : "não cumprido"}. Vamos trabalhar no próximo acerto.` : "Estamos prontos para começar. Ajuste o carro e vamos para a classificação."}</p></article>
    <article><small>NOTÍCIAS DO PADDOCK</small><p>${eu ? `${h(s.nome)} ${resultadoTexto} no GP de ${h(s.calendario[ultimo.gp]?.nome || ultimo.pista)}.${rival ? ` A disputa com ${h(rival.nome)} segue em destaque.` : " A temporada começa a ganhar forma."}` : "O grid se prepara para a primeira etapa da temporada."}</p></article>
    <article><small>RIVAL DA TEMPORADA</small><p>${rival ? `<b>${h(rival.nome)}</b> · ${im.rival.encontros} disputa${im.rival.encontros === 1 ? "" : "s"} próxima${im.rival.encontros === 1 ? "" : "s"} na chegada. Você terminou à frente ${im.rival.venceu} vez${im.rival.venceu === 1 ? "" : "es"} e atrás ${im.rival.perdeu}.` : "Seu rival aparecerá depois de disputas próximas na chegada."}</p></article></div></section>`;
  document.documentElement.style.setProperty("--eq", eq.cor);
  G.fundoDoGP(null); // (o fundo da Central é a garagem 3D, central.js)
  const pilotosMercado = Pilotos.PILOTOS.filter((p) => p.id !== s.piloto2 && !(p.equipe === s.equipe && p.id === Pilotos.PILOTOS.filter((x) => x.equipe === s.equipe)[1].id)).map((p) => `<option value="${h(p.id)}">${h(p.nome)} · ${h(equipe(p.equipe).nome)} · ${dinheiro(Math.max(5, Math.round((p.ritmo - 70) * .7)))}</option>`).join("");
  // o botão do fim de semana (o mesmo #gp da sede antiga)
  const botao = `<button type="button" class="cx-bt" id="gp">${terminou ? "Próximo ano" : ativo ? "Voltar ao GP" : "Avançar para o fim de semana"} <svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg></button>`;
  const mercado = `<section class="bloco"><header><h2>Mercado & box</h2><small>Teto anual ${dinheiro(Regras.teto)}</small></header><div class="mercado-grid"><div><label for="piloto2">Companheiro · ${h(piloto(s.piloto2)?.nome)}</label><select id="piloto2">${pilotosMercado}</select><div class="row"><p>Contratos são pagos à vista.</p><button id="contratarPiloto" ${ativo || terminou ? "disabled" : ""}>Contratar</button></div></div>
      ${Object.entries(Regras.ENGENHEIROS).map(([area, lista]) => `<div><label for="${area}">${area === "mecanico" ? "Mecânicos" : "Estrategista"} · ${h(lista[s.engenheiros[area]].nome)}</label><select id="${area}">${lista.map((item, i) => `<option value="${i}" ${i <= s.engenheiros[area] ? "disabled" : ""}>${h(item.nome)} · ${dinheiro(item.custo - lista[s.engenheiros[area]].custo)}</option>`).join("")}</select><div class="row"><p>${area === "mecanico" ? "Paradas mais rápidas" : "Decisões mais rápidas no box"} na apuração.</p><button data-engenheiro="${area}" ${ativo || terminou || s.engenheiros[area] === 2 ? "disabled" : ""}>Contratar</button></div></div>`).join("")}</div><p class="boxnota">Patrocínio ${dinheiro(s.patrocinio)} por GP, prêmios por pontos e salários debitados após cada corrida.</p></section>`;
  const gps = s.resultados.filter((r) => r.ano === s.ano);
  const codigoHTML = codigo ? `<div class="campeao" role="status"><b>Guarde seu código</b><p>Ele recupera a temporada em outro navegador. Ao recuperar, o token anterior deixa de valer.</p><div class="codebox">${h(codigo)}</div><button id="copiar">Copiar código</button><button id="esconder">Já guardei</button></div>` : "";
  const C = window.Central;
  C.usarRender(renderizar);
  const ctx = { s, t, eq, im, prox, ativo, terminou, previsao, botao, gps, rival: im.rival, mercado, caixaMensagens, codigoHTML, nMensagens: 4, dinheiro, minhas: C.estatisticas(gps) };
  C.pintar(app, C.html(ctx));
  C.depois(ctx);
  if (window.Radio) { window.Radio.desenharBotoes(); window.Radio.uma("sede", () => { window.Radio.dizer("boasvindas"); if (!terminou) setTimeout(() => window.Radio.dizer("proximogp"), 7000); }); }
}
// ---------- excluir a carreira ----------
const dlgExcluir = document.createElement("dialog");
dlgExcluir.className = "dlg-excluir";
dlgExcluir.setAttribute("aria-labelledby", "exTitulo");
dlgExcluir.innerHTML = `<form method="dialog" id="exForm"><h2 id="exTitulo">Excluir a carreira?</h2>
  <p>A equipe, o carro, o caixa, as tabelas e o código de recuperação somem para sempre, em todos os aparelhos. <b>Não dá para desfazer.</b></p>
  <label for="exConfirma">Para confirmar, escreva <b id="exAlvo">EXCLUIR</b></label>
  <input id="exConfirma" autocomplete="off" autocapitalize="characters" spellcheck="false">
  <p id="erroExcluir" class="erro-excluir" role="alert"></p>
  <div class="linha-excluir"><button type="button" id="exCancela" autofocus>Cancelar</button><button type="submit" id="exSim" class="perigo" disabled>Excluir para sempre</button></div></form>`;
document.body.appendChild(dlgExcluir);
const campoEx = dlgExcluir.querySelector("#exConfirma"), simEx = dlgExcluir.querySelector("#exSim"), erroEx = dlgExcluir.querySelector("#erroExcluir");
const normalizar = (t) => String(t || "").trim().toUpperCase();
// vale escrever EXCLUIR ou o nome da equipe
const confirmouEx = () => { const v = normalizar(campoEx.value); return v === "EXCLUIR" || (!!estado?.dados && v === normalizar(equipe(estado.dados.equipe)?.nome)); };
function abrirExcluir() {
  campoEx.value = ""; simEx.disabled = true; erroEx.textContent = "";
  dlgExcluir.querySelector("#exAlvo").textContent = `EXCLUIR${estado?.dados ? ` (ou ${equipe(estado.dados.equipe)?.nome})` : ""}`;
  dlgExcluir.showModal();
}
// o navegador esquece o token e o código e volta para a tela de criar
function esquecerCarreira() {
  token = null; codigo = null; estado = null;
  try { localStorage.removeItem(chave); } catch {}
  if (dlgExcluir.open) dlgExcluir.close();
  telaInicial();
}
campoEx.addEventListener("input", () => { simEx.disabled = !confirmouEx(); });
dlgExcluir.querySelector("#exCancela").addEventListener("click", () => dlgExcluir.close());
dlgExcluir.querySelector("#exForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!confirmouEx()) return;
  simEx.disabled = true;
  const r = await pedir("excluir", { token });
  if (!r?.ok) { erroEx.textContent = r?.erro || "Não foi possível excluir agora."; simEx.disabled = !confirmouEx(); return; }
  esquecerCarreira(); falar("Carreira excluída.");
});
socket.on("excluida", () => { if (!window.SedeGrupo.ativo) { esquecerCarreira(); falar("Esta carreira foi excluída em outro lugar."); } });
function irAoGP(acesso) {
  if (!acesso?.code) return;
  localStorage.setItem("corrida:" + acesso.code, JSON.stringify({ code: acesso.code, id: acesso.id, token: acesso.token }));
  location.href = "/corrida/?sala=" + encodeURIComponent(acesso.code);
}
app.addEventListener("submit", async (e) => {
  if (e.target.id === "nova") { e.preventDefault(); const f = new FormData(e.target); guardar(await pedir("criar", Object.fromEntries(f))); }
  if (e.target.id === "recuperar") { e.preventDefault(); guardar(await pedir("recuperar", { codigo: new FormData(e.target).get("codigo") })); }
});
app.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b || !estado?.dados) return;
  const s = estado.dados;
  if (b.id === "gp") { if (s.gp >= s.tamanho) return pedir("proximaTemporada"); const r = await pedir("iniciarGP"); if (r?.ok) irAoGP(r.acesso); }
  if (window.Central.clique(b, renderizar)) return;
  const nova = window.F1Garagem.cliquePonto(b, s.montagem, s.equipe, s.bonus); if (nova) { const r = await pedir("montagem", { montagem: nova }); if (r && r.ok && window.Radio) window.Radio.dizer("pecas"); }
  if (b.dataset.renovar) { const r = await pedir("renovar", { anos: Number(b.dataset.renovar) }); if (r?.ok) falar("Contrato renovado."); return; }
  if (b.dataset.proposta) { if (confirm("Trocar de equipe? O carro novo começa sem pontos distribuídos.")) { const r = await pedir("aceitarProposta", { equipe: b.dataset.proposta }); if (r?.ok) falar("Contrato assinado. Bem-vindo à equipe nova!"); } return; }
  if (b.id === "desenvolver") await pedir("desenvolver");
  if (b.id === "contratarPiloto") await pedir("piloto", { id: document.getElementById("piloto2").value });
  if (b.dataset.engenheiro) await pedir("engenheiro", { area: b.dataset.engenheiro, nivel: document.getElementById(b.dataset.engenheiro).value });
  if (b.id === "excluirCarreira") abrirExcluir();
  if (b.id === "novoCodigo") { const r = await pedir("novoCodigo"); if (r?.ok) { codigo = r.recuperacao; renderizar(); } }
  if (b.id === "copiar") { try { await navigator.clipboard.writeText(codigo); falar("Código copiado."); } catch { falar("Selecione e copie o código acima."); } }
  if (b.id === "esconder") { codigo = null; renderizar(); }
});
socket.on("estado", (r) => { if (estado) { estado = r; renderizar(); } });
const soAmigos = new URLSearchParams(location.search).has("amigos"); // o atalho "Temporada com os amigos" do menu mostra a porta de entrada mesmo com um save solo
socket.on("connect", async () => { if (window.SedeGrupo.ativo) return; if (soAmigos) return telaInicial(); if (token) { const r = await pedir("abrir", { token }); if (r?.ok) guardar(r); else { token = null; localStorage.removeItem(chave); telaInicial(); } } else telaInicial(); });
if (socket.connected && !window.SedeGrupo.ativo && !soAmigos) socket.emit("abrir", { token }, (r) => { if (r?.ok) guardar(r); else telaInicial(); });
if (window.SedeGrupo.ativo) window.SedeGrupo.iniciar(); // ?sala=CÓDIGO: a temporada em grupo (grupo.js)
