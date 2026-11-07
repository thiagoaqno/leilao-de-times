// Sede da temporada em grupo (`?sala=CÓDIGO`): a tela é refeita a partir do que o servidor manda (corrida-temporada-grupo.js),
// nunca de números guardados no navegador. Só o token de cada pessoa fica aqui (localStorage), para voltar à sala.
(function () {
const Pilotos = window.F1Pilotos, Equipes = window.F1Equipes, Solo = window.F1Temporada, G = window.F1TemporadaGrupo;
const app = document.getElementById("app"), aviso = document.getElementById("aviso");
const PARAMS = new URLSearchParams(location.search), CODIGO_URL = (PARAMS.get("sala") || "").toUpperCase().trim();
let socket = null, S = null, ocupado = false;
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dinheiro = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR")} mi`;
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const gravar = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const chaveSala = (codigo) => `corrida:temporada:grupo:${codigo}`;
const equipe = (id) => Pilotos.EQUIPES[id];
const piloto = (id) => Pilotos.PILOTOS.find((p) => p.id === id);
const pessoa = (id) => S && S.pessoas.find((p) => p.id === id);
const marca = (id) => `<img src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`;
function falar(msg) { aviso.textContent = msg; aviso.classList.remove("hidden"); clearTimeout(falar.t); falar.t = setTimeout(() => aviso.classList.add("hidden"), 4500); }

// Atualiza apenas os nós que mudaram. O palco WebGL, os controles em uso e os detalhes abertos
// continuam no mesmo DOM quando outro jogador altera a sala.
function atualizarTela(html) {
  const molde = document.createElement("template"); molde.innerHTML = html;
  function atualizar(a, b) {
    if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.tagName !== b.tagName)) { a.replaceWith(b.cloneNode(true)); return; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.classList.contains("palco") && b.classList.contains("palco-slot")) {
      if (a.dataset.eq === b.dataset.eq) return;
      a.replaceWith(b.cloneNode(true)); return;
    }
    const ativo = a === document.activeElement, valor = ativo && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) ? a.value : null;
    for (const at of [...a.attributes]) if (!b.hasAttribute(at.name) && !(a.tagName === "DETAILS" && at.name === "open")) a.removeAttribute(at.name);
    for (const at of [...b.attributes]) if (!(a.tagName === "DETAILS" && at.name === "open") && a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    let i = 0;
    while (i < b.childNodes.length) { if (!a.childNodes[i]) a.appendChild(b.childNodes[i].cloneNode(true)); else atualizar(a.childNodes[i], b.childNodes[i]); i++; }
    while (a.childNodes.length > b.childNodes.length) a.lastChild.remove();
    if (valor !== null && [...(a.options || [])].some((o) => o.value === valor && !o.disabled)) a.value = valor;
  }
  let i = 0;
  while (i < molde.content.childNodes.length) { if (!app.childNodes[i]) app.appendChild(molde.content.childNodes[i].cloneNode(true)); else atualizar(app.childNodes[i], molde.content.childNodes[i]); i++; }
  while (app.childNodes.length > molde.content.childNodes.length) app.lastChild.remove();
}

// ---------- a conexão ----------
function ligar() {
  if (socket) return socket;
  socket = io("/corrida-temporada-grupo");
  socket.on("estado", (e) => { S = e; desenhar(); });
  socket.on("gp", (acesso) => irAoGP(acesso));
  socket.on("encerrada", (d) => { const codigo = S && S.codigo; if (codigo) gravar(chaveSala(codigo), null); alert((d && d.motivo) || "A temporada foi encerrada."); location.href = "/corrida/temporada/"; });
  socket.on("connect", async () => {
    const codigo = S ? S.codigo : CODIGO_URL;
    if (!codigo || (!S && !ler(chaveSala(codigo)))) return; // sem token guardado: quem chega pelo convite escreve o nome
    const r = await entrar({ codigo }); if (!r.ok && !S) telaDoConvite(r.error);
  });
  return socket;
}
const emitir = (evento, dados = {}) => new Promise((resolve) => socket.emit(evento, dados, (r) => resolve(r || { ok: false, error: "Sem resposta do servidor." })));
async function pedir(evento, dados) {
  if (ocupado) return { ok: false };
  ocupado = true;
  const r = await emitir(evento, dados);
  ocupado = false;
  if (!r.ok) { falar(r.error || "Não foi possível continuar."); const e = await emitir("estado"); if (e.ok) { S = e.estado; desenhar(); } }
  else if (r.estado) { S = r.estado; desenhar(); }
  return r;
}
// entra na sala: com o token guardado volta para o lugar de sempre; sem ele (ou sem nome) pede o nome
async function entrar({ codigo, nome }) {
  const salvo = ler(chaveSala(codigo)) || {};
  const r = await emitir("entrar", { codigo, nome, id: salvo.id, token: salvo.token });
  if (r.ok) {
    if (r.token) gravar(chaveSala(r.codigo), { id: r.id, token: r.token });
    S = r.estado;
    if (!CODIGO_URL || CODIGO_URL !== r.codigo) history.replaceState(null, "", `?sala=${r.codigo}`);
    gravar("corrida:temporada:grupo:ultima", r.codigo);
    desenhar();
  }
  return r;
}

// ---------- a porta de entrada (dentro do formulário da sede solo) ----------
function formulario() {
  return `<form id="gnova" autocomplete="off"><label for="gnome">Seu nome</label><input id="gnome" name="nome" maxlength="8" placeholder="até 8 letras" value="${h(ler("corrida:temporada:nome") || "")}">
    <button class="cx-bt" type="submit">Abrir sala com os amigos</button></form>
    <form id="gentra" autocomplete="off" style="margin-top:12px"><label for="gcodigo">Já tenho um código de sala</label><input id="gcodigo" name="codigo" maxlength="5" placeholder="5 letras" style="text-transform:uppercase"><button class="cx-bt" type="submit">Entrar na sala</button></form>`;
}
function telaDoConvite(erro) {
  const id = Object.keys(Pilotos.EQUIPES)[0], E = window.EntradaCarreira;
  app.innerHTML = E.convite({ codigo: CODIGO_URL, erro, nome: ler("corrida:temporada:nome") || "", equipe: id, nomeEquipe: Pilotos.EQUIPES[id].nome });
  E.ligarConvite(id);
}

// ---------- a sala antes da temporada ----------
function listaDePessoas() {
  const eh = S.eu === S.host;
  return `<ul class="pessoas">${S.pessoas.map((p) => `<li class="${p.online ? "on" : ""}"><i class="bolinha" title="${p.online ? "na sala" : "ausente"}"></i><b>${h(p.nome)}${p.id === S.eu ? " (você)" : ""}</b>${p.host ? `<em>anfitrião</em>` : ""}<span>${p.equipe ? `<i class="faixa" style="--c:${h(equipe(p.equipe).cor)}"></i>${h(equipe(p.equipe).nome)}${p.carro != null ? ` · carro ${p.carro + 1}` : ""}` : "sem equipe: só acompanha"}</span>${eh && p.id !== S.eu ? `<button class="small ghost" data-cargo="${h(p.id)}">Tornar anfitrião</button>` : ""}</li>`).join("")}</ul>`;
}
function telaDaSala() {
  const todas = window.F1Temporada.PISTAS_TRABALHADAS.length;
  const opcoes = [["tamanho", "Calendário", [[4, "4 GPs"], [8, "8 GPs"], [todas, `${todas} GPs`]]], ["voltas", "Voltas por GP", [[2, "2"], [3, "3"], [5, "5"], [10, "10"]]], ["nivel", "Robôs", [["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]]]];
  const r = window.EntradaCarreira.sala({ S, max: G.MAX_PESSOAS, opcoes, url: `${location.origin}/corrida/temporada/?sala=${S.codigo}` });
  atualizarTela(r.html);
  window.EntradaCarreira.ligarSala(r.equipe);
}

// ---------- a temporada ----------
function tabela(linhas, tipo, destaque) {
  const lista = linhas.slice(0, 10);
  for (const x of linhas) if (destaque(x) && !lista.includes(x)) lista.push(x);
  return `<table class="placar"><thead><tr><th>Pos.</th><th>${tipo}</th><th>Pontos</th></tr></thead><tbody>${lista.map((r) => `<tr class="${destaque(r) ? "eu" : ""}"><td>${linhas.indexOf(r) + 1}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe || r.id)?.cor || "#fff")}"></i><b>${h(r.nome)}</b>${r.humano ? ` <small class="muted">amigo</small>` : ""}</td><td><b>${r.pontos}</b></td></tr>`).join("")}</tbody></table>`;
}
// quem está sem carro: entre os GPs, pode assumir o lugar de um piloto de uma equipe de robôs
function blocoDeSubstituir(terminou) {
  const opcoes = S.mercado.filter((m) => m.dono && !S.equipes[m.dono]).map((m) => `<option value="${h(m.id)}">${h(piloto(m.id).nome)} · ${h(equipe(m.dono).nome)}</option>`).join("");
  const pode = opcoes && !terminou && !S.gpAberto;
  return `<section class="bloco"><header><h2>Você acompanha</h2></header><p class="boxnota">${terminou ? "A temporada acabou: na próxima você pode assumir um carro." : S.gpAberto ? "O GP está aberto: depois do resultado você pode assumir um carro." : "Assuma o lugar de um piloto dos robôs e corra daqui em diante. Você começa com zero pontos; a equipe mantém os pontos e o carro dela."}</p>${pode ? `<div class="row"><select id="g-substituir" aria-label="Piloto a substituir">${opcoes}</select><button class="primary" id="gsubstituir">Assumir o carro</button></div>` : ""}</section>`;
}
function painelDaEquipe(terminou) {
  const eq = S.minhaEquipe, t = eq && S.equipes[eq]; if (!t) { const aviso = blocoDeSubstituir(terminou); return { carro: aviso, equipe: aviso }; }
  const parceiros = S.pessoas.filter((p) => p.equipe === eq && p.id !== S.eu), travado = S.gpAberto || terminou, sozinho = parceiros.length === 0;
  const opcoesPiloto = S.mercado.slice().sort((a, b) => piloto(b.id).ritmo - piloto(a.id).ritmo).map((m) => {
    const p = piloto(m.id), humano = m.dono && S.equipes[m.dono], atual = t.companheiro === m.id;
    const onde = atual ? "seu companheiro" : humano ? `corre pela ${equipe(m.dono).nome}` : m.dono ? equipe(m.dono).nome : "livre no mercado";
    return `<option value="${h(m.id)}" ${atual || humano ? "disabled" : ""}>${h(p.nome)} · ${h(onde)}${atual || humano ? "" : ` · ${dinheiro(m.custo)}`}</option>`;
  }).join("");
  const comp = t.companheiro && piloto(t.companheiro);
  const engenheiros = Object.entries(Solo.ENGENHEIROS).map(([area, lista]) => `<div><label for="g-${area}">${area === "mecanico" ? "Mecânicos" : "Estrategista"} · ${h(lista[t.engenheiros[area]].nome)}</label><select id="g-${area}">${lista.map((item, i) => {
    const dono = Object.keys(S.equipes).find((e) => e !== eq && S.equipes[e].engenheiros[area] === i);
    return `<option value="${i}" ${i <= t.engenheiros[area] || dono ? "disabled" : ""}>${h(item.nome)}${dono ? ` · já na ${h(equipe(dono).nome)}` : ` · ${dinheiro(item.custo - lista[t.engenheiros[area]].custo)}`}</option>`;
  }).join("")}</select><div class="row"><p>${area === "mecanico" ? "Paradas mais rápidas" : "Decisões mais rápidas no box"} na apuração.</p><button data-engenheiro="${area}" ${travado || t.engenheiros[area] === 2 ? "disabled" : ""}>Contratar</button></div></div>`).join("");
  const carro = `${window.F1Garagem.pontosHTML({ equipe: eq, bonus: t.bonus, montagem: t.montagem, pode: !travado, motivo: terminou ? "A temporada acabou." : "O GP está aberto: a montagem espera o fim da corrida." })}
    <section class="bloco"><header><h2>Desenvolvimento</h2><small>${t.bonus}/4 melhorias</small></header><p class="boxnota">${sozinho ? "O acerto vale para os seus dois carros." : `Você divide a equipe com ${parceiros.map((p) => h(p.nome)).join(", ")}: o carro, o caixa e os contratos são dos dois. Qualquer um confirma; o histórico mostra quem fez.`} O prêmio de cada GP vai para o caixa; com ele o orçamento do carro cresce um ponto por vez.</p>
      <div class="row"><button id="gdesenvolver" ${t.bonus >= 4 || travado ? "disabled" : ""}>Desenvolver +1 ponto · ${dinheiro(12 + t.bonus * 6)}</button></div></section>`;
  return { carro, equipe: `<div class="garagem" style="grid-template-columns:1fr">
    <section class="bloco"><header><h2>Mercado</h2><small>Teto anual ${dinheiro(Solo.teto)}</small></header><div class="mercado-grid">
      ${sozinho ? `<div><label for="g-piloto">Companheiro · ${h(comp ? comp.nome : "ninguém")}</label><select id="g-piloto">${opcoesPiloto}</select><div class="row"><p>Pago à vista. Piloto de outra equipe de amigo não sai.</p><button id="gcontratar" ${travado ? "disabled" : ""}>Contratar</button></div></div>`
        : `<p class="boxnota">Com dois pilotos humanos a equipe não tem vaga para um contratado: os titulares reais foram para o mercado.</p>`}
      ${engenheiros}</div><p class="boxnota">Patrocínio ${dinheiro(t.patrocinio)} por GP, prêmios pelos pontos da equipe e salários debitados após cada corrida.</p></section></div>
    <section class="bloco historico"><header><h2>Histórico da equipe</h2><small>quem fez o quê</small></header>${t.historico.length ? `<ul>${t.historico.slice(-8).reverse().map((x) => `<li><b>${h(x.quem)}</b> ${h(x.texto)}${x.valor ? ` <span class="muted">· −${dinheiro(x.valor)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="boxnota">Nada ainda. As montagens e contratações aparecem aqui.</p>`}</section>` };
}
function resumoDoGP(ultimo, destaqueEq) {
  const nomeDe = (r) => (r.piloto.startsWith("h:") ? (pessoa(r.piloto.slice(2)) || { nome: "Amigo" }).nome : piloto(r.piloto)?.nome || r.piloto);
  const fin = destaqueEq && ultimo.financas[destaqueEq];
  return `<section class="bloco ultimo"><header><h2>Último GP · ${h(S.calendario[ultimo.gp].nome)}</h2><small>${h(ultimo.pista)}</small></header><div class="duas"><table class="placar"><thead><tr><th>Pos.</th><th>Piloto</th><th>Pontos</th></tr></thead><tbody>${ultimo.linhas.slice().sort((a, b) => a.pos - b.pos).slice(0, 10).map((r) => `<tr class="${r.piloto.startsWith("h:") ? "eu" : ""}"><td>${r.dnf ? "DNF" : r.nc ? "NC" : r.pos}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe)?.cor || "#fff")}"></i><b>${h(nomeDe(r))}</b></td><td>${r.pontos}</td></tr>`).join("")}</tbody></table>
    <div class="fecho"><strong>${ultimo.linhas.filter((r) => r.piloto.startsWith("h:")).sort((a, b) => a.pos - b.pos).map((r) => `${h(nomeDe(r))} ${r.dnf ? "DNF" : r.pos + "º"}`).join(" · ")}</strong>${fin ? `<p>Sua equipe: patrocínio ${dinheiro(fin.patrocinio)} · prêmio ${dinheiro(fin.premio)} · salários ${dinheiro(fin.salarios)}.</p>` : ""}</div></div></section>`;
}
function fimDaNoite(t) {
  const amigos = t.pilotos.filter((p) => p.humano);
  return `<section class="fim-noite"><div class="taglinha">Fim da noite · temporada ${S.ano}</div><h2>${h(t.pilotos[0].nome)} é o campeão</h2><p>Construtores: <b>${h(t.equipes[0].nome)}</b>${t.equipes[0].humana ? " (equipe de amigos)" : ""}. O caixa e o carro de cada equipe seguem para o próximo ano.</p>
    <table class="placar"><thead><tr><th>Pos.</th><th>Amigo</th><th>Pontos</th></tr></thead><tbody>${amigos.map((p) => `<tr class="${p.pessoa === S.eu ? "eu" : ""}"><td>${t.pilotos.indexOf(p) + 1}</td><td><i class="faixa" style="--c:${h(equipe(p.equipe).cor)}"></i><b>${h(p.nome)}</b> <small class="muted">${h(equipe(p.equipe).nome)} · ${p.vitorias} vitória${p.vitorias === 1 ? "" : "s"} · ${p.podios} pódio${p.podios === 1 ? "" : "s"}</small></td><td><b>${p.pontos}</b></td></tr>`).join("")}</tbody></table></section>`;
}
// A temporada de quem tem carro usa a mesma Central da carreira solo (central.js): aqui a sala vira o "save" que ela entende, com o meu piloto como "voce".
function telaCentral(terminou) {
  const eq = S.minhaEquipe, t = S.equipes[eq], me = G.idDoHumano(S.eu), C = window.Central, Reg = window.F1Temporada, eh = S.eu === S.host, GA = window.F1Garagem;
  const vira = (id) => (id === me ? "voce" : id);
  const resultados = S.resultados.map((r) => ({ ...r, financas: r.financas?.[eq] || {}, linhas: r.linhas.map((l) => ({ ...l, piloto: vira(l.piloto) })), analise: r.analise ? { ...r.analise, pilotos: Object.fromEntries(Object.entries(r.analise.pilotos).map(([k, v]) => [vira(k), v])) } : null }));
  const eu = S.pessoas.find((p) => p.id === S.eu), tam = S.opcoes.tamanho;
  const s = { nome: eu?.nome || "", equipe: eq, ano: S.ano, gp: S.gp, tamanho: tam, voltas: S.opcoes.voltas, nivel: S.opcoes.nivel, semente: S.semente, montagem: t.montagem, bonus: t.bonus, caixa: t.caixa, gasto: t.gasto || 0, patrocinio: t.patrocinio, engenheiros: t.engenheiros, piloto2: t.companheiro, calendario: S.calendario, resultados, nomesExtras: Object.fromEntries(S.pessoas.map((p) => [G.idDoHumano(p.id), p.nome])) };
  const meuId = (tb) => ({ ...tb, pilotos: tb.pilotos.map((p) => (p.id === me ? { ...p, id: "voce" } : p)) });
  const pessoasMapa = Object.fromEntries(S.pessoas.map((p) => [p.id, p]));
  const tabelasDe = (res) => meuId(G.tabelas({ ...S, pessoas: pessoasMapa, ordem: S.pessoas.map((p) => p.id), resultados: res.map((r) => ({ ...r, linhas: r.linhas.map((l) => (l.piloto === "voce" ? { ...l, piloto: me } : l)) })) }));
  const tab = meuId(S.tabelas), gps = resultados.filter((r) => r.ano === S.ano), im = { ...Reg.imersao(s), classificacao: tab.pilotos.findIndex((p) => p.id === "voce") + 1 };
  try { localStorage.setItem("corrida:objetivoGP", JSON.stringify({ gp: im.meta?.gp, em: Date.now() })); } catch { /* sem armazenamento */ }
  const seta = '<svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
  const botao = terminou ? (eh ? `<button type="button" class="cx-bt" id="gproxima">Começar próxima temporada ${seta}</button>` : '<p class="cx-espera">O anfitrião abre a próxima temporada</p>')
    : S.acesso ? `<button type="button" class="cx-bt" id="gentrargp">${S.acesso.watch ? "Assistir ao GP" : "Entrar no GP"} ${seta}</button>`
      : eh ? `<button type="button" class="cx-bt" id="giniciar">Avançar para o fim de semana ${seta}</button>` : '<p class="cx-espera">Aguardando o anfitrião abrir o GP</p>';
  const ultimo = S.resultados.filter((r) => r.ano === S.ano).at(-1);
  const caixaMensagens = ultimo ? resumoDoGP(ultimo, eq) : '<section class="bloco imersao"><header><h2>Caixa de mensagens</h2></header><p class="boxnota">O resumo de cada GP aparece aqui depois da corrida.</p></section>';
  const ladoGrupo = `<aside class="cx-ct-lado"><section class="cx-card cx-seu"><div class="cx-seu-topo"><div><span class="cx-seu-tag">Sala ${h(S.codigo)}</span><h3>Na sala</h3><small>${S.pessoas.filter((p) => p.online).length} online</small></div></div>${listaDePessoas()}<button type="button" class="cx-contorno cx-seu-bt" id="gconvite">Copiar convite</button></section>${S.campeoes.length ? `<section class="cx-card cx-persp"><h5>Campeões da noite</h5><ul>${S.campeoes.map((c) => `<li>Temporada ${c.ano}: ${h(c.pilotoNome)} • ${h(c.equipeNome)}</li>`).join("")}</ul></section>` : ""}</aside>`;
  const menuHTML = `<a href="/corrida/">Menu da Corrida</a><button id="gconvite">Copiar convite</button><a href="/corrida/temporada/">Temporada solo</a>${eh ? '<button id="gencerrar" class="discreto">Encerrar a temporada</button>' : ""}<button id="gsairtemp" class="discreto">Sair da temporada</button>`;
  const ctx = { grupo: S.codigo, s, t: tab, eq: equipe(eq), im, prox: S.calendario[S.gp], ativo: S.acesso || null, terminou, previsao: terminou ? null : GA.previsaoDoGP(S.semente, S.ano, S.gp), botao, gps, rival: im.rival, mercado: painelDaEquipe(terminou).equipe, caixaMensagens, codigoHTML: "", nMensagens: ultimo ? 1 : 0, dinheiro, minhas: C.estatisticas(gps), tabelasDe, idsGrid: tab.pilotos.slice(0, G.GRID).map((p) => p.id), idDesenvolver: "gdesenvolver", ladoGrupo, menuHTML };
  C.usarRender(desenhar);
  C.pintar(app, C.html(ctx)); C.depois(ctx);
}
function telaDaTemporada() {
  const meuTime = S.minhaEquipe, eq = meuTime && equipe(meuTime), t = S.tabelas, tam = S.opcoes.tamanho, terminou = S.gp >= tam, eh = S.eu === S.host;
  if (meuTime) return telaCentral(terminou);
  window.Central?.sair(); // (quem só acompanha fica com a tela das tabelas)
  document.documentElement.style.setProperty("--eq", eq ? eq.cor : "#e10600");
  const prox = S.calendario[S.gp], previsao = terminou ? null : window.F1Garagem.previsaoDoGP(S.semente, S.ano, S.gp), ultimo = S.resultados.filter((r) => r.ano === S.ano).at(-1), caixa = meuTime && S.equipes[meuTime];
  const meus = (x) => x.pessoa === S.eu, deMinhaEquipe = (x) => x.id === meuTime;
  const botao = terminou ? (eh ? `<button class="primary grande btn-continuar" id="gproxima">Começar próxima temporada →</button>` : `<p class="muted">O anfitrião abre a próxima temporada.</p>`)
    : S.acesso ? `<button class="primary grande btn-continuar" id="gentrargp">${S.acesso.watch ? "Assistir ao GP →" : "Entrar no GP →"}</button>`
      : eh ? `<button class="primary grande btn-continuar" id="giniciar">Continuar</button>` : `<p class="muted">Aguardando o anfitrião abrir o GP. Quando ele abrir, a sua tela vai para a pista sozinha.</p>`;
  const GA = window.F1Garagem, aba = GA.abaAtual(), dados = painelDaEquipe(terminou), nomeLinha = meuTime ? h(eq.nome) : "Você acompanha";
  const entrada = !meuTime && !terminou ? blocoDeSubstituir(terminou) : "";
  const meusPontos = t.pilotos.find(meus)?.pontos, pontosEquipe = meuTime ? t.equipes.find(deMinhaEquipe)?.pontos : null;
  const hero = `${GA.vitrineHero({ equipe: meuTime, montagem: caixa && caixa.montagem, etapa: terminou ? "Bandeirada final" : `Etapa ${S.gp + 1} de ${tam}`, titulo: terminou ? "Temporada concluída" : h(prox.nome), sub: terminou ? "As tabelas finais estão em Classificação." : `${h(prox.pista.toUpperCase())} · classificação + ${S.opcoes.voltas} voltas · 22 carros · robôs ${h(S.opcoes.nivel)}`, botao,
      cartoes: [{ rot: "Seus pontos", valor: meusPontos ?? "—", un: meusPontos == null ? "" : "pts" }, { rot: "Pontos da equipe", valor: pontosEquipe ?? "—", un: pontosEquipe == null ? "" : "pts" }, { rot: "Pessoas na sala", valor: S.pessoas.length }] })}
    ${entrada}${terminou ? "" : GA.mapaGP(prox.pista, S.gp + 1, !!S.acesso, previsao, S.opcoes.voltas)}<div class="garagem-hero vt-grade">${meuTime ? GA.painelEquipe(meuTime, caixa.montagem) : `<aside class="pn-equipe"><div class="pn-logo" style="--eq:#444"><b>Você acompanha</b></div><p class="boxnota" style="padding:12px">Sem carro nesta temporada: acompanhe as tabelas e os GPs.</p></aside>`}
      ${GA.colunaDireita({ titulo: "Calendário", cal: S.calendario, gp: S.gp, rotuloProx: S.acesso ? "Em curso" : "Próximo", previsao, botao: "", nota: "" })}</div>
    <section class="bloco" style="margin-top:14px"><header><h2>Na sala</h2><small>${S.pessoas.filter((p) => p.online).length} online</small></header>${listaDePessoas()}</section>
    ${S.campeoes.length ? `<section class="bloco" style="margin-top:14px"><header><h2>Campeões da noite</h2></header><ul class="pessoas">${S.campeoes.map((c) => `<li><b>Temporada ${c.ano}</b><span>${h(c.pilotoNome)} · ${h(c.equipeNome)}</span></li>`).join("")}</ul></section>` : ""}`;
  const classif = `${terminou ? fimDaNoite(t) : ""}<div class="duas"><section class="bloco"><header><h2>Pilotos</h2><small>Campeonato ${S.ano}</small></header>${tabela(t.pilotos, "Piloto", meus)}</section><section class="bloco"><header><h2>Construtores</h2><small>Campeonato ${S.ano}</small></header>${tabela(t.equipes, "Equipe", deMinhaEquipe)}</section></div>${ultimo ? resumoDoGP(ultimo, meuTime) : ""}`;
  const painel = aba === "circuitos" ? GA.circuitosHTML(S.calendario, S.gp) : ({ geral: hero, carro: dados.carro, classif, equipe: dados.equipe }[aba] || hero);
  atualizarTela(`<div class="cr-topo"><div class="cr-id">${meuTime ? marca(meuTime) : ""}<div><small>Temporada ${S.ano} · sala ${h(S.codigo)}</small><h1>${nomeLinha}</h1></div></div><div class="cr-caixa"><small>${caixa ? "Caixa da equipe" : `${S.pessoas.length} pessoas`}</small><b>${caixa ? dinheiro(caixa.caixa) : "—"}</b></div></div>
    ${GA.abasHTML()}<div class="painel-aba" role="tabpanel">${painel}</div>
    <div class="recuperacao"><span>Sala guardada no servidor · código ${h(S.codigo)}</span><button id="gconvite">Copiar convite</button><a href="/corrida/temporada/">Temporada solo</a>${eh ? `<button id="gencerrar" class="discreto">Encerrar a temporada</button>` : ""}<button id="gsairtemp" class="discreto">Sair da temporada</button></div>`);
  GA.encaixar(meuTime);
}
function desenhar(erro) {
  if (!S) { window.F1Garagem.fundoDoGP(null); return telaDoConvite(erro); }
  document.title = `Temporada F1 · sala ${S.codigo}`;
  // a foto do circuito do próximo GP no fundo, só enquanto há GP a jogar
  window.F1Garagem.fundoDoGP(S.fase !== "sala" && !S.minhaEquipe && S.gp < S.opcoes.tamanho ? S.calendario[S.gp]?.pista : null);
  if (S.fase === "sala") telaDaSala(); else telaDaTemporada();
}

// ---------- o GP ao vivo ----------
function irAoGP(acesso) {
  if (!acesso || !acesso.code) return;
  gravar("corrida:" + acesso.code, { code: acesso.code, id: acesso.id || null, token: acesso.token });
  location.href = "/corrida/?sala=" + encodeURIComponent(acesso.code);
}

// ---------- os cliques ----------
const clicar = async (e) => {
  if (!socket || !S) return;
  const b = e.target.closest("button"); if (!b) return;
  if (document.body.classList.contains("cx-on") && window.Central.clique(b, desenhar)) return;
  const t = S.minhaEquipe && S.equipes && S.equipes[S.minhaEquipe];
  if (b.dataset.equipe) await pedir("equipe", { id: S.minhaEquipe === b.dataset.equipe ? null : b.dataset.equipe });
  else if (b.dataset.opcao) await pedir("opcoes", { [b.dataset.opcao]: b.dataset.valor });
  else if (b.dataset.cargo) { if (confirm(`Passar o cargo de anfitrião para ${pessoa(b.dataset.cargo).nome}?`)) await pedir("passarCargo", { id: b.dataset.cargo }); }
  else if (b.id === "gcomecar") await pedir("iniciar");
  else if (b.id === "gsair") { if (confirm("Sair da sala? Você perde o lugar dela.")) { const r = await emitir("sair"); if (r.ok) { gravar(chaveSala(S.codigo), null); location.href = "/corrida/temporada/"; } } }
  else if (b.id === "gsairtemp") { if (confirm("Sair da temporada? O seu carro volta para um robô e você perde o lugar na sala. Não dá para desfazer.")) { const r = await emitir("sairDaTemporada"); if (r.ok) { gravar(chaveSala(S.codigo), null); location.href = "/corrida/temporada/"; } else falar(r.error || "Não foi possível sair agora."); } }
  else if (b.id === "gencerrar") { if (confirm("Encerrar a temporada para todos? A sala e as tabelas são apagadas e os amigos são avisados. Não dá para desfazer.")) { const codigo = S.codigo, r = await emitir("encerrar"); if (r.ok) { gravar(chaveSala(codigo), null); location.href = "/corrida/temporada/"; } else falar(r.error || "Não foi possível encerrar agora."); } }
  else if (b.id === "giniciar") await pedir("iniciarGP");
  else if (b.id === "gentrargp") irAoGP(S.acesso);
  else if (b.id === "gproxima") await pedir("proximaTemporada");
  else if (b.dataset.aba) { window.F1Garagem.definirAba(b.dataset.aba); desenhar(); }
  else if ((b.dataset.ponto || b.hasAttribute("data-ponto-zerar")) && t) { const nova = window.F1Garagem.cliquePonto(b, t.montagem, S.minhaEquipe, t.bonus); if (nova) await pedir("montagem", { montagem: nova, versao: t.versao }); }
  else if (b.id === "gdesenvolver") await pedir("desenvolver");
  else if (b.id === "gsubstituir") await pedir("substituir", { id: document.getElementById("g-substituir").value });
  else if (b.id === "gcontratar") await pedir("piloto", { id: document.getElementById("g-piloto").value });
  else if (b.dataset.engenheiro) await pedir("engenheiro", { area: b.dataset.engenheiro, nivel: document.getElementById("g-" + b.dataset.engenheiro).value });
  else if (b.id === "gconvite") { const url = `${location.origin}/corrida/temporada/?sala=${S.codigo}`; try { await navigator.clipboard.writeText(url); falar("Convite copiado. Manda no grupo."); } catch { prompt("Copie o convite:", url); } }
};
const enviar = async (e) => {
  const f = e.target.id;
  if (!["gnova", "gentra", "gnomeconv"].includes(f)) return;
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(e.target)), nome = String(dados.nome || "").trim();
  if (nome) gravar("corrida:temporada:nome", nome);
  ligar();
  await new Promise((ok) => (socket.connected ? ok() : socket.once("connect", ok)));
  if (f === "gnova") { const r = await emitir("criar", { nome }); if (!r.ok) return falar(r.error); gravar(chaveSala(r.codigo), { id: r.id, token: r.token }); S = r.estado; history.replaceState(null, "", `?sala=${r.codigo}`); desenhar(); }
  else if (f === "gentra") { const codigo = String(dados.codigo || "").toUpperCase().trim(); if (codigo.length !== 5) return falar("O código tem 5 letras."); const r = await entrar({ codigo, nome }); if (!r.ok) falar(r.error); }
  else { const r = await entrar({ codigo: CODIGO_URL, nome }); if (!r.ok) falar(r.error); }
};
app.addEventListener("click", clicar);
app.addEventListener("submit", enviar);

window.SedeGrupo = { formulario, ativo: !!CODIGO_URL, iniciar() { ligar(); if (CODIGO_URL && !ler(chaveSala(CODIGO_URL))) telaDoConvite(); } };
})();
