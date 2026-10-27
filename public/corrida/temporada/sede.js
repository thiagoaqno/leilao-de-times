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
  const opcoes = Object.entries(Pilotos.EQUIPES).map(([id, e]) => `<option value="${h(id)}">${h(e.nome)}</option>`).join("");
  app.innerHTML = `<div class="abertura"><section><div class="taglinha">Corrida da Galera · 2026</div><h1>Sua equipe.<span>Sua temporada.</span></h1><p class="explica">Assuma uma equipe real, monte o carro e dispute GPs contra o grid de 2026. A classificação, a corrida e cada ponto contam para dois campeonatos.</p></section>
    <section class="folha"><h2>Abrir temporada</h2><form id="nova"><label for="nome">Seu nome no grid</label><input id="nome" name="nome" maxlength="40" required autocomplete="name" placeholder="Seu nome">
      <label for="equipe">Equipe</label><select id="equipe" name="equipe">${opcoes}</select><div class="duo"><div><label for="tamanho">Calendário</label><select id="tamanho" name="tamanho"><option value="8">8 GPs</option><option value="4">4 GPs · mini temporada</option></select></div>
      <div><label for="voltas">Voltas por GP</label><select id="voltas" name="voltas"><option value="3">3 voltas</option><option value="2">2 voltas</option><option value="5">5 voltas</option></select></div></div><button class="primary" type="submit">Abrir meu box →</button></form>
      <div class="or">Já tenho temporada</div><form id="recuperar"><label for="codigo">Código de recuperação</label><input id="codigo" name="codigo" maxlength="20" autocomplete="off" placeholder="12 caracteres"><button type="submit">Recuperar save</button></form>
      <div class="or">Temporada com os amigos</div>${window.SedeGrupo.formulario()}</section></div>`;
}
function tabela(rows, tipo, meu) {
  const lista = rows.slice(0, 10);
  if (meu && !lista.some((x) => x.id === meu)) lista.push(rows.find((x) => x.id === meu));
  return `<table class="placar"><thead><tr><th>Pos.</th><th>${tipo}</th><th>Pontos</th></tr></thead><tbody>${lista.filter(Boolean).map((r) => `<tr class="${r.id === meu ? "eu" : ""}"><td>${rows.indexOf(r) + 1}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe || r.id)?.cor || "#fff")}"></i><b>${h(r.nome)}</b></td><td><b>${r.pontos}</b></td></tr>`).join("")}</tbody></table>`;
}
function linhaPeca(s, k) {
  const n = s.montagem[k];
  return `<div class="peca-linha"><b>${h(Equipes.PECAS[k].nome)}</b><div class="pips" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div><div class="controle"><button data-peca="${k}" data-delta="-1" aria-label="Reduzir ${h(Equipes.PECAS[k].nome)}" ${n === 0 ? "disabled" : ""}>−</button><strong>${n}</strong><button data-peca="${k}" data-delta="1" aria-label="Aumentar ${h(Equipes.PECAS[k].nome)}" ${n === 8 || Equipes.custoDaMontagem(s.montagem) >= Equipes.EQUIPES[s.equipe].orcamento + s.bonus ? "disabled" : ""}>+</button></div></div>`;
}
function renderizar() {
  if (!estado?.dados) return telaInicial();
  const s = estado.dados, eq = equipe(s.equipe), t = estado.tabelas || Regras.tabelas(s), terminou = s.gp >= s.tamanho;
  const ultimo = s.resultados.filter((r) => r.ano === s.ano).at(-1);
  document.documentElement.style.setProperty("--eq", eq.cor);
  const prox = s.calendario[s.gp], ativo = estado.ativo, campeao = terminou ? `<div class="campeao"><b>🏆 Temporada ${s.ano} encerrada</b><p>Campeão de pilotos: ${h(t.pilotos[0].nome)} · Construtores: ${h(t.equipes[0].nome)}. O caixa e o carro seguem para o próximo ano.</p></div>` : "";
  const pilotosMercado = Pilotos.PILOTOS.filter((p) => p.id !== s.piloto2 && !(p.equipe === s.equipe && p.id === Pilotos.PILOTOS.filter((x) => x.equipe === s.equipe)[1].id)).map((p) => `<option value="${h(p.id)}">${h(p.nome)} · ${h(equipe(p.equipe).nome)} · ${dinheiro(Math.max(5, Math.round((p.ritmo - 70) * .7)))}</option>`).join("");
  app.innerHTML = `<div class="cabecalho"><div class="identidade">${marca(s.equipe)}<div><small>Temporada ${s.ano} · ${h(s.nome)}</small><h1>${h(eq.nome)}</h1></div></div><div class="dinheiro"><small>Caixa da equipe</small><b>${dinheiro(s.caixa)}</b></div></div>
    ${codigo ? `<div class="campeao" role="status"><b>Guarde seu código</b><p>Ele recupera a temporada em outro navegador. Ao recuperar, o token anterior deixa de valer.</p><div class="codebox">${h(codigo)}</div><button id="copiar">Copiar código</button><button id="esconder">Já guardei</button></div>` : ""}
    ${campeao}
    <section class="painelgp"><div class="info"><div class="taglinha">${terminou ? "Bandeirada final" : `Etapa ${s.gp + 1} de ${s.tamanho}`}</div><h2>${terminou ? "Temporada concluída" : `GP de ${h(prox.nome)}`}</h2><div class="rodada">${terminou ? "O próximo ano mantém o caixa e o desenvolvimento." : `${h(prox.pista.toUpperCase())} · Classificação + ${s.voltas} voltas · grid de 20 carros`}</div></div>
      <div class="acao"><p>${terminou ? "O campeonato está fechado. Confira as tabelas antes de continuar." : ativo ? "O box está aberto. Você pode voltar ao GP em andamento." : "Acerto pronto? A classificação começa quando você entra na pista."}</p><button class="primary grande" id="gp">${terminou ? "Começar próximo ano →" : ativo ? "Voltar ao GP →" : "Iniciar GP →"}</button></div></section>
    <div class="metricas"><div class="metrica"><strong>${s.gp}/${s.tamanho}</strong><small>GPs disputados</small></div><div class="metrica"><strong>${t.pilotos.find((x) => x.id === "voce")?.pontos || 0}</strong><small>Seus pontos</small></div><div class="metrica"><strong>${t.equipes.find((x) => x.id === s.equipe)?.pontos || 0}</strong><small>Pontos da equipe</small></div><div class="metrica"><strong>${dinheiro(s.gasto)}/${Regras.teto} mi</strong><small>Gastos no ano</small></div></div>
    <div class="duas"><section class="bloco"><header><h2>Pilotos</h2><small>Campeonato ${s.ano}</small></header>${tabela(t.pilotos, "Piloto", "voce")}</section><section class="bloco"><header><h2>Construtores</h2><small>Campeonato ${s.ano}</small></header>${tabela(t.equipes, "Equipe", s.equipe)}</section></div>
    <section class="calendario" style="--etapas:${s.tamanho}" aria-label="Calendário">${s.calendario.map((gp, i) => `<div class="etapa ${i < s.gp ? "feita" : i === s.gp ? "atual" : ""}"><small>${String(i + 1).padStart(2, "0")} / GP</small><b>${h(gp.nome)}</b><span>${i < s.gp ? "✓ Disputado" : i === s.gp ? "Próxima etapa" : "A disputar"}</span></div>`).join("")}</section>
    ${ultimo ? `<section class="bloco ultimo"><header><h2>Último GP · ${h(s.calendario[ultimo.gp].nome)}</h2><small>${h(ultimo.pista)}</small></header><div class="duas"><table class="placar"><thead><tr><th>Pos.</th><th>Piloto</th><th>Pontos</th></tr></thead><tbody>${ultimo.linhas.slice().sort((a, b) => a.pos - b.pos).slice(0, 10).map((r) => `<tr class="${r.piloto === "voce" ? "eu" : ""}"><td>${r.dnf ? "DNF" : r.nc ? "NC" : r.pos}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe)?.cor || "#fff")}"></i><b>${h(r.piloto === "voce" ? s.nome : piloto(r.piloto)?.nome || r.piloto)}</b></td><td>${r.pontos}</td></tr>`).join("")}</tbody></table><div class="fecho"><strong>Seu resultado: ${h(ultimo.linhas.find((r) => r.piloto === "voce")?.dnf ? "DNF" : `${ultimo.linhas.find((r) => r.piloto === "voce")?.pos}º`)}</strong><p>Patrocínio ${dinheiro(ultimo.financas?.patrocinio)} · prêmio ${dinheiro(ultimo.financas?.premio)} · salários ${dinheiro(ultimo.financas?.salarios)}.</p></div></div></section>` : ""}
    <div class="garagem"><section class="bloco"><header><h2>Garagem</h2><small>${Equipes.custoDaMontagem(s.montagem)}/${Equipes.EQUIPES[s.equipe].orcamento + s.bonus} pontos</small></header><p class="boxnota">O acerto vale para seus dois carros. Desenvolvimento amplia o limite em um ponto e segue para a próxima temporada.</p>${Equipes.ORDEM.map((k) => linhaPeca(s, k)).join("")}
      <div class="row"><button id="desenvolver" ${s.bonus >= 4 || ativo || terminou ? "disabled" : ""}>Desenvolver +1 ponto · ${dinheiro(12 + s.bonus * 6)}</button><small class="muted">${s.bonus}/4 melhorias</small></div></section>
      <section class="bloco"><header><h2>Mercado & box</h2><small>Teto anual ${dinheiro(Regras.teto)}</small></header><div class="mercado-grid"><div><label for="piloto2">Companheiro · ${h(piloto(s.piloto2)?.nome)}</label><select id="piloto2">${pilotosMercado}</select><div class="row"><p>Contratos são pagos à vista.</p><button id="contratarPiloto" ${ativo || terminou ? "disabled" : ""}>Contratar</button></div></div>
      ${Object.entries(Regras.ENGENHEIROS).map(([area, lista]) => `<div><label for="${area}">${area === "mecanico" ? "Mecânicos" : "Estrategista"} · ${h(lista[s.engenheiros[area]].nome)}</label><select id="${area}">${lista.map((item, i) => `<option value="${i}" ${i <= s.engenheiros[area] ? "disabled" : ""}>${h(item.nome)} · ${dinheiro(item.custo - lista[s.engenheiros[area]].custo)}</option>`).join("")}</select><div class="row"><p>${area === "mecanico" ? "Paradas mais rápidas" : "Decisões mais rápidas no box"} na apuração.</p><button data-engenheiro="${area}" ${ativo || terminou || s.engenheiros[area] === 2 ? "disabled" : ""}>Contratar</button></div></div>`).join("")}</div><p class="boxnota">Patrocínio ${dinheiro(s.patrocinio)} por GP, prêmios por pontos e salários debitados após cada corrida.</p></section></div>
    <div class="recuperacao"><span>Save automático no servidor · ${h(s.nome)}</span><button id="novoCodigo">Gerar novo código de recuperação</button><span>O código antigo deixa de valer.</span></div>`;
}
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
  if (b.dataset.peca) { const m = { ...s.montagem }, k = b.dataset.peca; m[k] += Number(b.dataset.delta); await pedir("montagem", { montagem: m }); }
  if (b.id === "desenvolver") await pedir("desenvolver");
  if (b.id === "contratarPiloto") await pedir("piloto", { id: document.getElementById("piloto2").value });
  if (b.dataset.engenheiro) await pedir("engenheiro", { area: b.dataset.engenheiro, nivel: document.getElementById(b.dataset.engenheiro).value });
  if (b.id === "novoCodigo") { const r = await pedir("novoCodigo"); if (r?.ok) { codigo = r.recuperacao; renderizar(); } }
  if (b.id === "copiar") { try { await navigator.clipboard.writeText(codigo); falar("Código copiado."); } catch { falar("Selecione e copie o código acima."); } }
  if (b.id === "esconder") { codigo = null; renderizar(); }
});
socket.on("estado", (r) => { if (estado) { estado = r; renderizar(); } });
socket.on("connect", async () => { if (window.SedeGrupo.ativo) return; if (token) { const r = await pedir("abrir", { token }); if (r?.ok) guardar(r); else { token = null; localStorage.removeItem(chave); telaInicial(); } } else telaInicial(); });
if (socket.connected && !window.SedeGrupo.ativo) socket.emit("abrir", { token }, (r) => { if (r?.ok) guardar(r); else telaInicial(); });
if (window.SedeGrupo.ativo) window.SedeGrupo.iniciar(); // ?sala=CÓDIGO: a temporada em grupo (grupo.js)
