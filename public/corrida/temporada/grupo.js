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
    <button class="primary" type="submit">Abrir sala com os amigos</button></form>
    <form id="gentra" autocomplete="off" style="margin-top:12px"><label for="gcodigo">Já tenho um código de sala</label><input id="gcodigo" name="codigo" maxlength="5" placeholder="5 letras" style="text-transform:uppercase"><button type="submit">Entrar na sala</button></form>`;
}
function telaDoConvite(erro) {
  app.innerHTML = `<div class="abertura"><section><div class="taglinha">Temporada com os amigos · 2026</div><h1>Sala<span>${h(CODIGO_URL)}</span></h1><p class="explica">Escolha seu nome para entrar. Cada amigo assume uma equipe (ou dois dividem a mesma) e todos disputam a mesma temporada.</p></section>
    <section class="folha"><h2>Entrar na sala</h2>${erro ? `<p role="alert" style="color:#ff9a9a">${h(erro)}</p>` : ""}<form id="gnomeconv" autocomplete="off"><label for="gnome">Seu nome</label><input id="gnome" name="nome" maxlength="8" placeholder="até 8 letras" required value="${h(ler("corrida:temporada:nome") || "")}">
    <button class="primary" type="submit">Entrar →</button></form><div class="or"><a href="/corrida/temporada/">Voltar à temporada solo</a></div></section></div>`;
}

// ---------- a sala antes da temporada ----------
function cartaDaEquipe(id) {
  const eq = equipe(id), ocupantes = S.pessoas.filter((p) => p.equipe === id), meu = S.minhaEquipe === id, cheia = ocupantes.length >= 2 && !meu;
  return `<button class="eq-carta ${meu ? "minha" : ""}" style="--c:${h(eq.cor)}" data-equipe="${h(id)}" aria-pressed="${meu}" ${cheia ? "disabled" : ""}>${marca(id)}<b>${h(eq.nome)}</b><small>${Equipes.EQUIPES[id].orcamento} pontos de orçamento</small><span>${ocupantes.length ? ocupantes.map((p) => h(p.nome)).join(" + ") : "livre"}${ocupantes.length === 2 ? " · lotada" : ocupantes.length === 1 ? " · cabe mais um" : ""}</span></button>`;
}
function opcao(chave, rotulo, valores) {
  const eh = S.eu === S.host;
  return `<div><label>${rotulo}</label><div class="segmento">${valores.map(([v, t]) => `<button data-opcao="${chave}" data-valor="${h(v)}" aria-pressed="${String(S.opcoes[chave]) === String(v)}" ${eh ? "" : "disabled"}>${t}</button>`).join("")}</div></div>`;
}
function listaDePessoas() {
  const eh = S.eu === S.host;
  return `<ul class="pessoas">${S.pessoas.map((p) => `<li class="${p.online ? "on" : ""}"><i class="bolinha" title="${p.online ? "na sala" : "ausente"}"></i><b>${h(p.nome)}${p.id === S.eu ? " (você)" : ""}</b>${p.host ? `<em>anfitrião</em>` : ""}<span>${p.equipe ? `<i class="faixa" style="--c:${h(equipe(p.equipe).cor)}"></i>${h(equipe(p.equipe).nome)}${p.carro != null ? ` · carro ${p.carro + 1}` : ""}` : "sem equipe: só acompanha"}</span>${eh && p.id !== S.eu ? `<button class="small ghost" data-cargo="${h(p.id)}">Tornar anfitrião</button>` : ""}</li>`).join("")}</ul>`;
}
function telaDaSala() {
  const eh = S.eu === S.host, alguem = S.pessoas.some((p) => p.equipe);
  document.documentElement.style.setProperty("--eq", S.minhaEquipe ? equipe(S.minhaEquipe).cor : "#e10600");
  app.innerHTML = `<div class="cabecalho"><div class="identidade"><div><small>Temporada com os amigos</small><h1>Sala ${h(S.codigo)}</h1></div></div><div class="dinheiro"><small>${S.pessoas.length} de ${G.MAX_PESSOAS} pessoas</small><button id="gconvite" class="small">Copiar convite</button></div></div>
    <p class="boxnota">Cada amigo escolhe uma equipe de 2026; dois podem dividir a mesma (um em cada carro, com o mesmo carro e um orçamento só). As equipes sem ninguém ficam com os robôs. Quem não escolher equipe acompanha a temporada e assiste aos GPs.</p>
    <div class="duas"><section class="bloco"><header><h2>Quem está na sala</h2><small>${eh ? "você é o anfitrião" : "o anfitrião começa a temporada"}</small></header>${listaDePessoas()}
      <div class="grupo-opcoes">${opcao("tamanho", "Calendário", [[4, "4 GPs · mini"], [8, "8 GPs"]])}${opcao("voltas", "Voltas por GP", [[2, "2"], [3, "3"], [5, "5"]])}${opcao("nivel", "Robôs", [["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]])}</div>
      <div class="row" style="margin-top:16px"><button class="primary" id="gcomecar" ${eh && alguem ? "" : "disabled"}>${eh ? "Começar a temporada →" : "Aguardando o anfitrião"}</button><button class="ghost" id="gsair">Sair da sala</button></div>${eh && !alguem ? `<p class="boxnota">Escolha pelo menos uma equipe para começar.</p>` : ""}</section>
      <section class="bloco"><header><h2>Escolha sua equipe</h2><small>${S.minhaEquipe ? "toque de novo para desistir" : "11 equipes de 2026"}</small></header><div class="eq-grade">${Object.keys(Pilotos.EQUIPES).map(cartaDaEquipe).join("")}</div></section></div>`;
}

// ---------- a temporada ----------
function tabela(linhas, tipo, destaque) {
  const lista = linhas.slice(0, 10);
  for (const x of linhas) if (destaque(x) && !lista.includes(x)) lista.push(x);
  return `<table class="placar"><thead><tr><th>Pos.</th><th>${tipo}</th><th>Pontos</th></tr></thead><tbody>${lista.map((r) => `<tr class="${destaque(r) ? "eu" : ""}"><td>${linhas.indexOf(r) + 1}</td><td><i class="faixa" style="--c:${h(equipe(r.equipe || r.id)?.cor || "#fff")}"></i><b>${h(r.nome)}</b>${r.humano ? ` <small class="muted">amigo</small>` : ""}</td><td><b>${r.pontos}</b></td></tr>`).join("")}</tbody></table>`;
}
function painelDaEquipe(terminou) {
  const eq = S.minhaEquipe, t = eq && S.equipes[eq]; if (!t) { const aviso = `<section class="bloco"><header><h2>Você acompanha</h2></header><p class="boxnota">Você não tem carro nesta temporada. Acompanha as tabelas e assiste aos GPs ao vivo.</p></section>`; return { carro: aviso, equipe: aviso }; }
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
function telaDaTemporada() {
  const meuTime = S.minhaEquipe, eq = meuTime && equipe(meuTime), t = S.tabelas, tam = S.opcoes.tamanho, terminou = S.gp >= tam, eh = S.eu === S.host;
  document.documentElement.style.setProperty("--eq", eq ? eq.cor : "#e10600");
  const prox = S.calendario[S.gp], previsao = terminou ? null : window.F1Garagem.previsaoDoGP(S.semente, S.ano, S.gp), ultimo = S.resultados.filter((r) => r.ano === S.ano).at(-1), caixa = meuTime && S.equipes[meuTime];
  const meus = (x) => x.pessoa === S.eu, deMinhaEquipe = (x) => x.id === meuTime;
  const botao = terminou ? (eh ? `<button class="primary grande btn-continuar" id="gproxima">Começar próxima temporada →</button>` : `<p class="muted">O anfitrião abre a próxima temporada.</p>`)
    : S.acesso ? `<button class="primary grande btn-continuar" id="gentrargp">${S.acesso.watch ? "Assistir ao GP →" : "Entrar no GP →"}</button>`
      : eh ? `<button class="primary grande btn-continuar" id="giniciar">Continuar</button>` : `<p class="muted">Aguardando o anfitrião abrir o GP. Quando ele abrir, a sua tela vai para a pista sozinha.</p>`;
  const GA = window.F1Garagem, aba = GA.abaAtual(), dados = painelDaEquipe(terminou), nomeLinha = meuTime ? h(eq.nome) : "Você acompanha";
  const hero = `${terminou ? "" : GA.mapaGP(prox.pista, S.gp + 1, !!S.acesso, previsao, S.opcoes.voltas)}<div class="garagem-hero">${meuTime ? GA.painelEquipe(meuTime, caixa.montagem) : `<aside class="pn-equipe"><div class="pn-logo" style="--eq:#444"><b>Você acompanha</b></div><p class="boxnota" style="padding:12px">Sem carro nesta temporada: acompanhe as tabelas e os GPs.</p></aside>`}
      <section class="cr-centro corte">${meuTime ? GA.palcoSlot(meuTime) : ""}<div class="cr-gp"><span class="etapa-rot">${terminou ? "Bandeirada final" : `Etapa ${S.gp + 1} de ${tam}`}</span><h2>${terminou ? "Temporada concluída" : `GP de ${h(prox.nome)}`}</h2><span class="sub">${terminou ? "As tabelas finais estão em Classificação." : `${h(prox.pista.toUpperCase())} · classificação + ${S.opcoes.voltas} voltas · 20 carros · robôs ${h(S.opcoes.nivel)}`}</span></div></section>
      ${GA.colunaDireita({ titulo: "Calendário", cal: S.calendario, gp: S.gp, rotuloProx: S.acesso ? "Em curso" : "Próximo", previsao, botao, nota: terminou ? "O campeonato está fechado." : S.acesso ? "O GP está aberto. Quem cair no meio tem o carro levado por um robô até voltar." : caixa && !Equipes.custoDaMontagem(caixa.montagem) ? "Seu carro está sem pontos. Distribua o orçamento na aba Carro · Pontos antes do GP." : "A classificação e a corrida são ao vivo, com todos os amigos juntos." })}</div>
    <div class="cr-cartoes"><div class="cr-cartao"><strong>${S.gp}/${tam}</strong><small>GPs disputados</small></div><div class="cr-cartao"><strong>${t.pilotos.filter(meus).map((p) => p.pontos).join("") || "—"}</strong><small>Seus pontos</small></div><div class="cr-cartao"><strong>${meuTime ? t.equipes.find(deMinhaEquipe).pontos : "—"}</strong><small>Pontos da equipe</small></div><div class="cr-cartao"><strong>${caixa ? `${caixa.gasto}/${Solo.teto} mi` : "—"}</strong><small>Gastos no ano</small></div></div>
    <section class="bloco" style="margin-top:14px"><header><h2>Na sala</h2><small>${S.pessoas.filter((p) => p.online).length} online</small></header>${listaDePessoas()}</section>
    ${S.campeoes.length ? `<section class="bloco" style="margin-top:14px"><header><h2>Campeões da noite</h2></header><ul class="pessoas">${S.campeoes.map((c) => `<li><b>Temporada ${c.ano}</b><span>${h(c.pilotoNome)} · ${h(c.equipeNome)}</span></li>`).join("")}</ul></section>` : ""}`;
  const classif = `${terminou ? fimDaNoite(t) : ""}<div class="duas"><section class="bloco"><header><h2>Pilotos</h2><small>Campeonato ${S.ano}</small></header>${tabela(t.pilotos, "Piloto", meus)}</section><section class="bloco"><header><h2>Construtores</h2><small>Campeonato ${S.ano}</small></header>${tabela(t.equipes, "Equipe", deMinhaEquipe)}</section></div>${ultimo ? resumoDoGP(ultimo, meuTime) : ""}`;
  const painel = { geral: hero, carro: dados.carro, classif, equipe: dados.equipe }[aba] || hero;
  app.innerHTML = `<div class="cr-topo"><div class="cr-id">${meuTime ? marca(meuTime) : ""}<div><small>Temporada ${S.ano} · sala ${h(S.codigo)}</small><h1>${nomeLinha}</h1></div></div><div class="cr-caixa"><small>${caixa ? "Caixa da equipe" : `${S.pessoas.length} pessoas`}</small><b>${caixa ? dinheiro(caixa.caixa) : "—"}</b></div></div>
    ${GA.abasHTML()}<div class="painel-aba" role="tabpanel">${painel}</div>
    <div class="recuperacao"><span>Sala guardada no servidor · código ${h(S.codigo)}</span><button id="gconvite">Copiar convite</button><a href="/corrida/temporada/">Temporada solo</a>${eh ? `<button id="gencerrar" class="discreto">Encerrar a temporada</button>` : ""}<button id="gsairtemp" class="discreto">Sair da temporada</button></div>`;
  GA.encaixar(meuTime);
}
function desenhar(erro) {
  if (!S) return telaDoConvite(erro);
  document.title = `Temporada F1 · sala ${S.codigo}`;
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
