// Corrida da Galera — a Central da carreira (/corrida/temporada/): o topo com a equipe e as abas Central, Calendário, Classificação, Análise,
// Desenvolvimento e Contratos, poucos números em faixas finas, na cor da equipe (`--eq`, `--eq2`), em tema claro ou escuro (`corrida:tema`), com o carro do
// estúdio (estudio3d.js) na Central e no Desenvolvimento, onde ganha os rótulos das peças. Só desenha: os números vêm do save que o servidor manda, e as ações continuam em sede.js
// (os mesmos eventos de sempre: montagem, desenvolver, iniciarGP...). A temporada em grupo segue com a tela de grupo.js.
(function (root) {
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const Pilotos = () => root.F1Pilotos, Eq = () => root.F1Equipes, Reg = () => root.F1Temporada, Gi = () => root.GpInfo, Gar = () => root.F1Garagem;
const dois = (n) => String(n).padStart(2, "0");
const ABAS = [["central", "Central"], ["calendario", "Calendário"], ["classif", "Classificação"], ["analise", "Análise"], ["desenvolvimento", "Desenvolvimento"], ["contratos", "Contratos"]];
const ATTR = [["aero", "Aerodinâmica", "Asa dianteira"], ["chassi", "Chassi", "Assoalho"], ["motor", "Unidade de potência", "Motor"], ["freios", "Freios", "Freio dianteiro"], ["suspensao", "Suspensão", "Suspensão"], ["confiab", "Confiabilidade", "Câmbio"]];
// onde cada peça fica no carro (metros, sistema do modelo; o bico aponta para -z) e para onde o rótulo vai, em px da tela
const PONTOS = { aero: { p: [0.25, 0.12, -2.05], dx: -150, dy: 80 }, chassi: { p: [-0.55, 0.14, 0.2], dx: -190, dy: 110 }, motor: { p: [0, 0.82, 0.6], dx: -120, dy: -110 }, freios: { p: [0.72, 0.3, -1.42], dx: 130, dy: 96 }, suspensao: { p: [-0.72, 0.42, 1.35], dx: -170, dy: -40 }, confiab: { p: [0, 0.5, 1.85], dx: -30, dy: -130 } };

let aba = "central", attr = "aero", tabela = "pilotos", garagem = null, modGaragem = null, criando = false, ctxAtual = null, ultimaInteracao = performance.now();
for (const tipo of ["pointerdown", "keydown", "input"]) document.addEventListener(tipo, () => { ultimaInteracao = performance.now(); }, { passive: true });
const salvo = (() => { try { return localStorage.getItem("corrida:temporada:aba"); } catch { return null; } })();
if (ABAS.some((a) => a[0] === salvo)) aba = salvo;

// ---------- o tema: as cores saem da equipe; claro (o padrão) ou escuro, guardado no navegador ----------
const CHAVE_TEMA = "corrida:tema";
let escuro = (() => { try { return localStorage.getItem(CHAVE_TEMA) === "escuro"; } catch { return false; } })();
function luz(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ""); if (!m) return 0.3; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; }
function coresDa(equipe) {
  const e = Pilotos().EQUIPES[equipe] || {}, p = root.Pistas?.MODS?.pintura?.[e.pintura] || {}, c1 = e.cor || "#e10600";
  const c2 = [p.c2, p.c, "#ffffff"].find((c) => c && luz(c) > 0.32 && c.toLowerCase() !== c1.toLowerCase()) || "#ffffff";
  return { c1, c2 };
}
function aplicarTema() {
  document.body.classList.toggle("cx-escuro", escuro);
  const b = document.querySelector("[data-cx-tema]"); if (b) { b.setAttribute("aria-pressed", String(escuro)); b.querySelector("b").textContent = escuro ? "Ligado" : "Desligado"; }
}
function tema(equipe) {
  const { c1, c2 } = coresDa(equipe), r = document.documentElement.style, l = luz(c1);
  r.setProperty("--eq", c1); r.setProperty("--eq2", c2); r.setProperty("--eq-txt", l > 0.58 ? "#08090c" : "#fff");
  // a cor nas linhas e nas barras precisa aparecer no fundo: a equipe clara escurece no tema claro, e a equipe escura clareia no tema escuro
  r.setProperty("--eq-no-claro", l > 0.62 ? `color-mix(in srgb,${c1} 58%,#000)` : c1); r.setProperty("--eq-no-escuro", l < 0.14 ? `color-mix(in srgb,${c1} 52%,#fff)` : c1);
  document.body.classList.add("cx-on"); aplicarTema();
}
// A entrada da carreira (entrada.js) usa o mesmo estúdio e o mesmo tema, com o carro à esquerda do formulário e sem os atalhos da Central.
let entradaEq = null;
function entrada(equipe) { entradaEq = equipe; document.body.classList.add("cx-entrada"); tema(equipe); ligarFundo(equipe); }
function sair() { entradaEq = null; document.body.classList.remove("cx-on", "cx-escuro", "cx-entrada"); garagem?.parar(); garagem = null; document.getElementById("cxFundo")?.remove(); }

// ---------- o fundo: o estúdio, o emblema em relevo e o carro ----------
const vistaAgora = () => (entradaEq ? (innerWidth < 1000 ? "entradaCelular" : "entrada") : aba === "desenvolvimento" ? (innerWidth < 1000 ? "devCelular" : "dev") : innerWidth < 1000 ? "centralCelular" : "central");
function ligarFundo(equipe) {
  let host = document.getElementById("cxFundo");
  if (!host) { host = document.createElement("div"); host.id = "cxFundo"; host.setAttribute("aria-hidden", "true"); host.innerHTML = '<i class="cx-relevo"></i>'; document.body.prepend(host); }
  host.dataset.aba = entradaEq ? "central" : aba;
  const relevo = host.querySelector(".cx-relevo"), url = `url("/api/corrida/logo/${encodeURIComponent(equipe)}")`;
  if (relevo.dataset.eq !== equipe) { relevo.dataset.eq = equipe; relevo.style.setProperty("--logo", url); }
  if (garagem) { garagem.trocarEquipe(equipe); garagem.vista(vistaAgora()); return; }
  if (criando) return; criando = true;
  const iniciarQuandoLivre = () => {
    if (!document.body.classList.contains("cx-on") || garagem) { criando = false; return; }
    if (document.hidden || performance.now() - ultimaInteracao < 900) { setTimeout(iniciarQuandoLivre, 500); return; }
    const iniciar = () => {
      if (!document.body.classList.contains("cx-on") || garagem) { criando = false; return; }
      (modGaragem ? Promise.resolve(modGaragem) : import("/corrida/temporada/estudio3d.js")).then((m) => {
        modGaragem = m; criando = false;
        if (!document.body.classList.contains("cx-on") || garagem) return;
        let ultimoRotulo = -Infinity;
        garagem = m.criarEstudio(host, { aoCarregar: () => { host.classList.add("cx-carro-pronto"); posicionarRotulos(); }, aoDesenhar: () => { const agora = performance.now(); if (agora - ultimoRotulo >= 1000 / 30) { ultimoRotulo = agora; posicionarRotulos(); } } });
        if (!garagem) return;
        garagem.vista(vistaAgora(), true); garagem.trocarEquipe(entradaEq || ctxAtual?.s?.equipe || equipe);
      }).catch((e) => { criando = false; console.warn("estúdio 3D indisponível", e); });
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(iniciar, { timeout: 2000 }); else setTimeout(iniciar, 0);
  };
  setTimeout(iniciarQuandoLivre, 300);
}
addEventListener("resize", () => { if (document.body.classList.contains("cx-on") && garagem) garagem.vista(vistaAgora()); posicionarRotulos(); }, { passive: true });

// ---------- pedacinhos ----------
const marca = (id, cls = "") => `<img class="cx-logo ${cls}" src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`;
const seta = '<svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const tituloCard = (t, sub = "") => `<header class="cx-tit"><h3>${t}</h3>${sub ? `<small>${sub}</small>` : ""}</header>`;
const tricolor = () => '<i class="cx-tri" aria-hidden="true"></i>';
const BR = '<svg class="cx-bandeira-br" viewBox="0 0 28 20" role="img" aria-label="Brasil"><rect width="28" height="20" rx="2" fill="#009b3a"/><path d="M14 2.6 25.4 10 14 17.4 2.6 10Z" fill="#fedf00"/><circle cx="14" cy="10" r="4.4" fill="#002776"/></svg>';
const sobrenome = (n) => String(n || "").trim().split(/\s+/).at(-1).toUpperCase();
const sigla = (nome) => String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().slice(0, 3);
const bandeira = (id) => Gar().bandeira(id);
const estatisticas = (gps, id = "voce") => { let v = 0, p = 0, r = 0; for (const g of gps) { const l = g.linhas.find((x) => x.piloto === id); if (!l || l.dnf || l.nc) continue; if (l.pos === 1) v++; if (l.pos <= 3) p++; if (l.voltaRapida) r++; } return { v, p, r }; };
const nomeGP = (id, curto) => { const i = Gi()?.get(id), real = i?.real; const p = root.Pistas?.PISTAS[id]; if (real) return String(i.gp).replace("Grande Prêmio", "GP"); return p?.name || curto; };
const finalDe = (l) => (!l ? "" : l.dnf ? "DNF" : l.nc ? "NC" : `P${l.pos}`);

// ---------- a Central: o carro, a próxima etapa e três números ----------
const pontoCor = (estado) => (estado === "cumprido" || estado === "caminho" ? "ok" : estado === "falhou" || estado === "risco" ? "ruim" : "meio");
const ROT_OBJ = { caminho: "No caminho", cumprido: "Concluído", falhou: "Não cumprido", risco: "Em risco", aberto: "Em andamento" };
const previsaoHTML = (prev) => (prev ? `<span class="cx-clima">${root.PrevisaoUI?.icone ? `<span class="cx-clima-ic">${root.PrevisaoUI.icone(prev.nivel)}</span>` : ""}<span>${h(prev.titulo)} · ${prev.pct}% de chuva</span></span>` : "");
function tendencia(c, eu) { // subiu ou desceu no campeonato depois do último GP
  if (!c.gps.length) return "";
  const tabDe = c.tabelasDe || ((res) => Reg().tabelas({ ...c.s, resultados: res })), antes = tabDe(c.s.resultados.filter((r) => r !== c.gps.at(-1))).pilotos.findIndex((p) => p.id === "voce");
  return antes > eu ? '<svg class="cx-sobe" viewBox="0 0 12 10" role="img" aria-label="subiu"><path d="M6 0l6 10H0z"/></svg>' : antes < eu ? '<svg class="cx-desce" viewBox="0 0 12 10" role="img" aria-label="desceu"><path d="M6 10L0 0h12z"/></svg>' : "";
}
function central(c) {
  const { s, t, prox, terminou, ativo, previsao, botao, gps } = c, eu = t.pilotos.findIndex((p) => p.id === "voce"), E = Eq(), eq = Pilotos().EQUIPES[s.equipe];
  const prev = previsao && root.F1Regras?.descreverPrevisao ? root.F1Regras.descreverPrevisao(previsao, s.voltas) : null, traco = prox && root.GpSobre ? root.GpSobre.mapaSvg(prox.pista, "cx-traco") : "";
  const limite = E.EQUIPES[s.equipe].orcamento + (s.bonus || 0), usado = E.custoDaMontagem(s.montagem), o = Reg().objetivos(s, c.t).pilotos, meus = t.pilotos[eu]?.pontos || 0, dif = (t.pilotos[0]?.pontos || 0) - meus;
  const acao = botao.replace("Avançar para o fim de semana", "Continuar carreira");
  const direita = prox
    ? `<aside class="cx-cn-prox"><small class="cx-rot">${ativo ? "GP em andamento" : "Próxima etapa"}</small><div class="cx-cn-gp"><div><h2>${h(prox.nome)}</h2><p>Etapa ${dois(s.gp + 1)} de ${dois(s.tamanho)}</p></div><span class="cx-cn-traco">${traco}</span></div>${previsaoHTML(prev)}${acao}</aside>`
    : `<aside class="cx-cn-prox"><small class="cx-rot">Bandeirada final</small><div class="cx-cn-gp"><div><h2>Temporada ${dois(s.ano)}</h2><p>Campeão: ${h(t.pilotos[0].nome)}</p></div></div>${acao}</aside>`;
  const lideranca = !gps.length ? "Ainda sem corridas" : eu === 0 ? `${meus} pontos · líder` : `${meus} pontos · ${dif} para o líder`;
  return `<div class="cx-g-central"><div class="cx-cn-ola"><small class="cx-rot">${c.grupo ? `Sala ${h(c.grupo)}` : "Carreira"} · Temporada ${dois(s.ano)}</small><h2>${terminou ? "Temporada encerrada." : "A próxima vitória começa aqui."}</h2><p>${h(eq.nome)} · Piloto titular ${tricolor()}</p></div>${direita} <div class="cx-cn-carro"><small class="cx-rot">Seu carro</small><b>${h(eq.nome)} · nota ${notaDe(s.equipe, s.montagem)}</b></div> <div class="cx-numeros"><button type="button" data-cx-aba="classif"><small class="cx-rot">Campeonato</small><strong>${gps.length ? `${eu + 1}º` : "—"} ${tendencia(c, eu)}</strong><span>${lideranca}</span></button> <button type="button" data-cx-aba="desenvolvimento"><small class="cx-rot">Desenvolvimento</small><strong>${limite - usado} <em>${limite - usado === 1 ? "ponto livre" : "pontos livres"}</em></strong><i class="cx-prog"><u style="width:${usado / Math.max(1, limite) * 100}%"></u></i><span>${usado} de ${limite} pontos usados</span></button> <button type="button" data-cx-aba="contratos"><small class="cx-rot">Objetivo da temporada</small><strong class="menor">Terminar no top ${o.alvo}</strong><span><i class="cx-ponto ${pontoCor(o.estado)}"></i>${ROT_OBJ[o.estado] || ""}${gps.length ? ` · atual: ${o.atual}º` : ""}</span></button></div></div>`;
}

// ---------- o Calendário ----------
function calendario(c) {
  const { s, gps, prox, botao, previsao } = c, feitos = gps.length;
  const prev = previsao && root.F1Regras?.descreverPrevisao ? root.F1Regras.descreverPrevisao(previsao, s.voltas) : null;
  const ok = '<svg class="cx-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.6 4.6L19 7"/></svg>';
  const cards = s.calendario.map((e, i) => {
    const r = gps.find((g) => g.gp === i), eu = r?.linhas.find((l) => l.piloto === "voce"), foto = Gi()?.fundoDe(e.pista), traco = root.GpSobre ? root.GpSobre.mapaSvg(e.pista, "cx-traco") : "", atual = i === s.gp, info = Gi()?.get(e.pista);
    return `<button type="button" class="cx-gp ${r ? "feito" : ""} ${atual ? "atual" : ""}" data-gp="${i}" aria-label="${h(e.nome)}: ver o circuito">
      <span class="cx-gp-foto" style="--foto:${foto ? `url('${h(foto)}')` : "none"}"><span class="cx-gp-traco">${traco}</span></span>
      <span class="cx-gp-nome"><em>${dois(i + 1)}</em>${bandeira(e.pista)}<span><b>${h(e.nome)}</b><small>${h(info?.real ? info.cidade : "")}</small></span></span>
      <span class="cx-gp-pe">${r ? `${ok}<span>Concluído</span><b>${finalDe(eu)} · ${eu?.pontos || 0} pts</b>` : atual ? `<i class="cx-ponto vivo"></i><span>${c.ativo ? "GP em andamento" : "Próxima etapa"}</span>` : '<i class="cx-ponto vazio"></i><span>A disputar</span>'}</span></button>`;
  }).join("");
  const info = prox && Gi()?.get(prox.pista), km = info?.real && info.km ? `${String(info.km.toFixed(3)).replace(".", ",")} km · ` : "";
  const barra = prox ? `<section class="cx-gpbar"><div><small class="cx-rot">${c.ativo ? "GP em andamento" : "Próxima etapa"}</small><h3>${h(nomeGP(prox.pista, prox.nome))}</h3></div><span class="cx-gpbar-traco">${root.GpSobre ? root.GpSobre.mapaSvg(prox.pista, "cx-traco") : ""}</span><div class="cx-gpbar-dados"><span>${km}${s.voltas} voltas</span>${previsaoHTML(prev)}</div>${botao}</section>` : `<section class="cx-gpbar"><div><small class="cx-rot">Bandeirada final</small><h3>Temporada concluída</h3></div>${botao}</section>`;
  return `<div class="cx-cabeca"><div><h2>Calendário da temporada</h2><small class="cx-rot">Temporada ${dois(s.ano)} · ${feitos} de ${s.tamanho} etapas concluídas</small></div><div class="cx-formato"><small class="cx-rot">Formato</small><b>${s.tamanho} GPs</b></div></div>
    <div class="cx-cal" style="--n:${s.tamanho}">${cards}</div>${barra}`;
}
function abrirGP(i) {
  const s = ctxAtual?.s, e = s?.calendario[i]; if (!e || !root.GpSobre) return;
  const d = dialogo("cxSobreDlg", "cx-sobre"), foto = Gi()?.fundoDe(e.pista), credito = Gi()?.creditoTxt(e.pista);
  d.innerHTML = `<form method="dialog"><button class="cx-dlg-x" aria-label="Fechar">✕</button></form><div class="circuito-corpo"><div class="circuito-fundo" ${foto ? `style="background-image:linear-gradient(90deg,#05060af2,#05060aab 60%,#05060a99),url('${h(foto)}')"` : ""}>${root.GpSobre.corpo(e.pista, null, "")}${credito ? `<small class="circuito-credito">${h(credito)}</small>` : ""}</div></div>`;
  d.showModal();
}
function dialogo(id, cls) { let d = document.getElementById(id); if (!d) { d = document.createElement("dialog"); d.id = id; d.className = `cx-dlg ${cls}`; d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); document.body.appendChild(d); } return d; }

// ---------- a Classificação ----------
function classificacao(c) {
  const { s, t, gps, prox } = c, E = Pilotos().EQUIPES, passadas = new Map(gps.map((g) => [g.gp, g])), eu = t.pilotos.findIndex((p) => p.id === "voce"), meus = t.pilotos[eu]?.pontos || 0, lider = t.pilotos[0]?.pontos || 0;
  const tabDe = c.tabelasDe || ((res) => Reg().tabelas({ ...s, resultados: res })); // (na temporada em grupo, as contas são as da sala)
  const antes = gps.length ? tabDe(s.resultados.filter((r) => r !== gps.at(-1))) : null;
  const seta2 = (lista, id, i) => { const a = lista ? lista.findIndex((x) => x.id === id) : i; return a > i ? '<svg class="cx-sobe" viewBox="0 0 12 10" role="img" aria-label="ganhou posição"><path d="M6 0l6 10H0z"/></svg>' : a < i ? '<svg class="cx-desce" viewBox="0 0 12 10" role="img" aria-label="perdeu posição"><path d="M6 10L0 0h12z"/></svg>' : ""; };
  const colunas = s.calendario.map((e, i) => `<th class="cx-col ${i === s.gp ? "agora" : ""} ${passadas.has(i) ? "" : "falta"}" scope="col" title="${h(e.nome)}">${bandeira(e.pista)}<small>${h(sigla(e.nome))}</small></th>`).join("");
  let corpo;
  if (tabela === "pilotos") {
    const quem = gps.length ? new Set(gps.flatMap((g) => g.linhas.map((l) => l.piloto))) : new Set(c.idsGrid || ["voce", ...Reg().pilotosNoGrid(s).map((p) => p.id)]);
    corpo = t.pilotos.filter((p) => quem.has(p.id)).map((p, i) => `<tr class="${p.id === "voce" ? "eu" : ""}" data-piloto="${h(p.id)}" tabindex="0"><td class="p">${i + 1}</td><td class="m">${seta2(antes?.pilotos.filter((x) => quem.has(x.id)), p.id, i)}</td><td class="n"><i style="--c:${h(E[p.equipe]?.cor || "#888")}"></i><b>${h(sobrenome(p.nome))}</b></td>${s.calendario.map((_, g) => { const r = passadas.get(g), l = r?.linhas.find((x) => x.piloto === p.id); return `<td class="v">${!r ? "—" : !l ? "" : l.dnf ? "<em>DNF</em>" : l.nc ? "<em>NC</em>" : l.pontos}</td>`; }).join("")}<td class="t">${p.pontos}</td><td class="d">${i ? -(lider - p.pontos) : "—"}</td></tr>`).join("");
  } else {
    const liderE = t.equipes[0]?.pontos || 0;
    corpo = t.equipes.map((e, i) => `<tr class="${e.id === s.equipe ? "eu" : ""}"><td class="p">${i + 1}</td><td class="m">${seta2(antes?.equipes, e.id, i)}</td><td class="n"><i style="--c:${h(E[e.id]?.cor || "#888")}"></i><b>${h(e.nome.toUpperCase())}</b></td>${s.calendario.map((_, g) => { const r = passadas.get(g); return `<td class="v">${r ? r.linhas.filter((l) => l.equipe === e.id).reduce((a, l) => a + l.pontos, 0) : "—"}</td>`; }).join("")}<td class="t">${e.pontos}</td><td class="d">${i ? -(liderE - e.pontos) : "—"}</td></tr>`).join("");
  }
  // a campanha: a posição a cada GP (a linha sobe quando o piloto sobe)
  const evol = gps.map((g, i) => tabDe(s.resultados.filter((r) => r.ano !== s.ano || gps.indexOf(r) <= i)).pilotos.findIndex((p) => p.id === "voce") + 1);
  const W = 300, H = 76, mx = Math.max(...evol, 2), mn = Math.min(...evol, mx - 1), x = (i) => 26 + (evol.length > 1 ? i / (evol.length - 1) : 0.5) * (W - 34), y = (p) => 8 + (p - mn) / Math.max(1, mx - mn) * (H - 20);
  const grafico = evol.length ? `<svg class="cx-evol" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sua posição a cada GP">${[mn, mx].map((p) => `<text x="18" y="${(y(p) + 4).toFixed(1)}" text-anchor="end">${p}º</text><line x1="26" x2="${W - 8}" y1="${y(p).toFixed(1)}" y2="${y(p).toFixed(1)}"/>`).join("")}<polyline points="${evol.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ")}"/>${evol.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="3"><title>${h(s.calendario[gps[i].gp]?.nome)}: ${p}º</title></circle>`).join("")}</svg>` : '<p class="cx-vazio">A linha aparece depois do primeiro GP.</p>';
  const dif = lider - meus, seloDif = eu === 0 ? (gps.length ? `${meus - (t.pilotos[1]?.pontos || 0)} pontos à frente` : "Tudo por fazer") : `${dif} ${dif === 1 ? "ponto" : "pontos"} para o líder`;
  const top3 = t.equipes.slice(0, 3); const minhaE = t.equipes.findIndex((e) => e.id === s.equipe); if (minhaE > 2) top3[2] = t.equipes[minhaE];
  const difE = t.equipes[0].pontos - (t.equipes[1]?.pontos || 0), nums = [[c.minhas.v, c.minhas.v === 1 ? "Vitória" : "Vitórias"], [c.minhas.p, c.minhas.p === 1 ? "Pódio" : "Pódios"], [s.tamanho - s.gp, "Etapas restantes"]];
  return `<div class="cx-g-classif"><div class="cx-c-esq"><div class="cx-cabeca"><div><h2>Classificação do campeonato</h2><small class="cx-rot">Temporada ${dois(s.ano)} · ${gps.length} de ${s.tamanho} etapas concluídas</small></div></div>
      <div class="cx-subabas" role="tablist"><button type="button" role="tab" class="${tabela === "pilotos" ? "on" : ""}" aria-selected="${tabela === "pilotos"}" data-cx-tabela="pilotos">Pilotos</button><button type="button" role="tab" class="${tabela === "equipes" ? "on" : ""}" aria-selected="${tabela === "equipes"}" data-cx-tabela="equipes">Construtores</button></div>
      <div class="cx-tabela"><table style="--n:${s.calendario.length}"><thead><tr><th class="p" scope="col">Pos.</th><th class="m"></th><th class="n" scope="col">${tabela === "pilotos" ? "Piloto" : "Equipe"}</th>${colunas}<th class="t" scope="col">Pts</th><th class="d" scope="col">Dif.</th></tr></thead><tbody>${corpo}</tbody></table></div></div>
    <aside class="cx-c-dir"><section><small class="cx-rot">Sua campanha</small><div class="cx-camp"><strong>${gps.length ? `${eu + 1}º` : "—"} ${seta2(antes?.pilotos, "voce", eu)}</strong><div><b>${h(s.nome)}</b><span>${meus} pontos</span><em>${h(seloDif)}</em></div></div><div class="cx-nums">${nums.map(([n, r]) => `<div><b>${n}</b><small>${r}</small></div>`).join("")}</div></section>
      <section><h3>Construtores</h3><ol class="cx-top">${top3.map((e) => `<li class="${e.id === s.equipe ? "eu" : ""}"><button type="button" data-cx-tabela="equipes"><span>${t.equipes.indexOf(e) + 1}</span>${marca(e.id)}<b>${h(e.nome)}</b><strong>${e.pontos}</strong></button></li>`).join("")}</ol><small class="cx-nota">${gps.length ? `${h(t.equipes[0].nome)} lidera por ${difE} ${difE === 1 ? "ponto" : "pontos"}` : "Ninguém pontuou ainda"}</small></section>
      <section><h3>Sua evolução</h3>${grafico}</section>
      ${prox ? `<button type="button" class="cx-prox-mini" data-cx-aba="calendario">${bandeira(prox.pista)}<span><small class="cx-rot">Próxima etapa</small><b>${h(nomeGP(prox.pista, prox.nome))}</b></span><em>Etapa ${dois(s.gp + 1)} de ${dois(s.tamanho)}</em></button>` : ""}</aside></div>`;
}
function abrirPiloto(id) {
  const c = ctxAtual; if (!c) return; const p = c.t.pilotos.find((x) => x.id === id); if (!p) return;
  const e = Pilotos().EQUIPES[p.equipe], st = estatisticas(c.gps, id), d = dialogo("cxPilotoDlg", "cx-piloto");
  const linhas = c.s.calendario.map((g, i) => { const r = c.gps.find((x) => x.gp === i), l = r?.linhas.find((x) => x.piloto === id); return `<li>${bandeira(g.pista)}<span>${h(g.nome)}</span><b>${r ? (l ? finalDe(l) : "—") : "A disputar"}</b><strong>${l ? `${l.pontos} pts` : ""}</strong></li>`; }).join("");
  d.style.setProperty("--c", e?.cor || "#fff");
  d.innerHTML = `<form method="dialog"><button class="cx-dlg-x" aria-label="Fechar">✕</button></form><header>${marca(p.equipe)}<div><small>${h(e?.nome || "")}</small><h2>${h(p.nome)}</h2></div><strong>${p.pontos}<small> pts</small></strong></header><div class="cx-nums">${[[c.t.pilotos.indexOf(p) + 1 + "º", "No campeonato"], [st.v, "Vitórias"], [st.p, "Pódios"], [st.r, "V. rápidas"]].map(([n, r]) => `<div class="cx-num"><b>${n}</b><small>${r}</small></div>`).join("")}</div><ul>${linhas}</ul>`;
  d.showModal();
}

// ---------- o Desenvolvimento ----------
// ---------- o Desenvolvimento ----------
function notaDe(equipe, m) { return Gar().notaGeral(Eq().ficha(Eq().specDaEquipe(equipe, m))); }
function desenvolvimento(c) {
  const { s, ativo, terminou } = c, E = Eq(), limite = E.EQUIPES[s.equipe].orcamento + (s.bonus || 0), usado = E.custoDaMontagem(s.montagem), livres = limite - usado, pode = !ativo && !terminou;
  const atual = ATTR.find((a) => a[0] === attr) || ATTR[0], k = atual[0], peca = E.PECAS[k], n = s.montagem[k], max = E.MAX_NIVEL, maxou = n >= max;
  const depois = { ...s.montagem, [k]: Math.min(max, n + 1) }, fA = E.ficha(E.specDaEquipe(s.equipe, s.montagem)), fD = E.ficha(E.specDaEquipe(s.equipe, depois)), nA = notaDe(s.equipe, s.montagem), nD = notaDe(s.equipe, depois);
  const dif = fD.map((f, i) => ({ r: f.rotulo, d: f.nota - fA[i].nota })).filter((x) => x.d), custoDev = 12 + (s.bonus || 0) * 6;
  const motivo = !pode ? (ativo ? "O GP está aberto: a montagem espera o fim da corrida." : "A temporada acabou.") : maxou ? "Esta peça já está no nível máximo." : livres <= 0 ? "Sem pontos livres. Tire de outra peça ou desenvolva mais um ponto." : "";
  const abas = ATTR.map(([id, nome]) => `<button type="button" class="${id === k ? "on" : ""}" aria-pressed="${id === k}" data-cx-attr="${id}">${h(nome)}</button>`).join("");
  const painel = `<aside class="cx-dv-painel"><div class="cx-dv-pontos"><small class="cx-rot">Pontos livres</small><strong>${livres}</strong></div><small class="cx-rot">Melhoria selecionada</small><h3>${h(atual[2])}</h3><span class="cx-dv-nivel">${maxou ? `Nível ${n} · máximo` : `Nível ${n} → ${n + 1}`}</span><h4>${h(peca.nome)}</h4><p>${h(peca.desc)}</p>
      <dl><div><dt>Custo</dt><dd>1 ponto</dd></div><div><dt>Melhora</dt><dd class="cx-verde">${h(peca.bom)}</dd></div><div><dt>Cobra em troca</dt><dd>${h(peca.custa)}</dd></div></dl>
      <small class="cx-rot">Impacto previsto</small><ul>${dif.length ? dif.map((x) => `<li><span>${h(x.r)}</span><b class="${x.d > 0 ? "cx-verde" : "cx-verm"}">${x.d > 0 ? "+" : ""}${x.d}</b></li>`).join("") : '<li><span>Sem mudança visível na nota</span><b>—</b></li>'}<li class="total"><span>Desempenho do carro</span><b>${nA}${!maxou ? ` → ${nD}` : ""}</b></li></ul>
      <button type="button" class="cx-bt" data-ponto="${k}" data-delta="1" ${!pode || maxou || livres <= 0 ? "disabled" : ""}>Instalar melhoria ${seta}</button>
      <small class="cx-dv-saldo">${motivo || `Saldo após a melhoria: ${livres - 1} ${livres - 1 === 1 ? "ponto" : "pontos"}`}</small>
      <div class="cx-dv-acoes"><button type="button" class="cx-link" data-ponto="${k}" data-delta="-1" ${!pode || n <= 0 ? "disabled" : ""}>Tirar 1 nível</button><button type="button" class="cx-link" data-ponto-zerar ${!pode || !usado ? "disabled" : ""}>Zerar tudo</button></div></aside>`;
  const CURTO = { aero: "Aero", chassi: "Chassi", motor: "Potência", freios: "Freios", suspensao: "Suspensão", confiab: "Durabilidade" };
  const geral = ATTR.map(([id]) => { const nome = CURTO[id], nv = s.montagem[id]; return `<button type="button" class="cx-dv-mini ${id === k ? "on" : ""}" data-cx-attr="${id}"><span>${h(nome)}</span><b>${nv}<small>/${max}</small></b><i class="cx-prog"><u style="width:${nv / max * 100}%"></u></i></button>`; }).join("");
  const rotulos = ATTR.map(([id, , peca2]) => `<button type="button" class="cx-rotulo ${id === k ? "on" : ""}" data-cx-attr="${id}" data-rotulo="${id}"><i></i><span>${h(peca2)}</span></button>`).join("");
  return `<div class="cx-g-dev"><div class="cx-dv-esq"><div class="cx-cabeca"><div><small class="cx-rot">Temporada ${dois(s.ano)} · ${h(c.eq.nome)}</small><h2>Desenvolvimento do carro</h2></div></div>
      <div class="cx-subabas cx-dv-abas">${abas}</div><div class="cx-dv-palco" id="cxDvPalco" title="Arraste para girar o carro"><svg class="cx-linhas" id="cxLinhas" aria-hidden="true"></svg>${rotulos}<small class="cx-dv-dica">Arraste para girar</small></div></div>${painel}
    <section class="cx-dv-base"><div class="cx-dv-geral"><small class="cx-rot">Desempenho do carro</small><div class="cx-dv-minis">${geral}</div></div><div class="cx-dv-prox"><small class="cx-rot">Orçamento do carro</small><div class="cx-dv-orc"><b>${s.bonus}/4 melhorias</b><span>Caixa ${h(c.dinheiro(s.caixa))}</span></div><i class="cx-prog"><u style="width:${(s.bonus || 0) / 4 * 100}%"></u></i><button type="button" class="cx-link" id="${c.idDesenvolver || "desenvolver"}" ${s.bonus >= 4 || ativo || terminou ? "disabled" : ""}>${s.bonus >= 4 ? "Limite atingido" : `+1 ponto · ${c.dinheiro(custoDev)}`}</button></div></section></div>`;
}
function posicionarRotulos() {
  if (aba !== "desenvolvimento" || !garagem) return;
  const palco = document.getElementById("cxDvPalco"), svg = document.getElementById("cxLinhas"); if (!palco || !svg) return;
  const r = palco.getBoundingClientRect(), W = r.width, H = r.height, elementos = [...palco.querySelectorAll("[data-rotulo]")];
  const viewBox = `0 0 ${W} ${H}`; if (svg.getAttribute("viewBox") !== viewBox) svg.setAttribute("viewBox", viewBox);
  // Todas as medições vêm antes das escritas para não recalcular o layout a cada rótulo.
  const posicoes = elementos.map((el) => {
    const pt = PONTOS[el.dataset.rotulo], a = garagem.naTela(pt.p), ax = a.x - r.left, ay = a.y - r.top, w = el.offsetWidth || 110;
    return { el, ax, ay, lx: Math.max(4, Math.min(W - w - 4, ax + pt.dx - w / 2)), ly: Math.max(4, Math.min(H - 34, ay + pt.dy)), w, on: el.classList.contains("on") };
  });
  if (svg.children.length !== elementos.length * 2) {
    svg.replaceChildren();
    for (const el of elementos) { void el; svg.append(document.createElementNS("http://www.w3.org/2000/svg", "path"), document.createElementNS("http://www.w3.org/2000/svg", "circle")); }
  }
  posicoes.forEach(({ el, ax, ay, lx, ly, w, on }, i) => {
    el.style.transform = `translate(${lx.toFixed(0)}px,${ly.toFixed(0)}px)`;
    const path = svg.children[i * 2], ponto = svg.children[i * 2 + 1];
    path.setAttribute("class", on ? "on" : ""); path.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)}L${(lx + w / 2).toFixed(1)} ${(ly + 15).toFixed(1)}`);
    ponto.setAttribute("class", on ? "on" : ""); ponto.setAttribute("cx", ax.toFixed(1)); ponto.setAttribute("cy", ay.toFixed(1)); ponto.setAttribute("r", on ? "6" : "4");
  });
}
let arrasto = null;
document.addEventListener("pointerdown", (e) => { if (e.target.closest?.("#cxDvPalco") && !e.target.closest("button")) { arrasto = e.clientX; e.target.setPointerCapture?.(e.pointerId); } });
document.addEventListener("pointermove", (e) => { if (arrasto != null) { garagem?.girar((e.clientX - arrasto) * 0.009); arrasto = e.clientX; } brilho(e); }, { passive: true });
for (const ev of ["pointerup", "pointercancel"]) document.addEventListener(ev, () => { arrasto = null; });
function brilho(e) {
  const c = e.target.closest?.(".cx-bt"); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
}

// ---------- a tela inteira ----------
function html(c) {
  ctxAtual = c; const { s, eq, codigoHTML } = c;
  const rotulo = (id, nome) => (c.grupo && id === "contratos" ? "Equipe" : nome);
  const corpo = aba === "calendario" ? calendario(c) : aba === "classif" ? classificacao(c) : aba === "desenvolvimento" ? desenvolvimento(c) : aba === "contratos" ? root.CentralContrato.html(c) : aba === "analise" ? root.CentralAnalise.html(c) : central(c);
  const ajustes = `<button type="button" class="cx-tema" data-cx-tema aria-pressed="${escuro}"><span>Modo escuro</span><b>${escuro ? "Ligado" : "Desligado"}</b></button><p class="cx-menu-caixa"><span>Caixa</span><b>${h(c.dinheiro(s.caixa))}</b></p>`;
  return `<div class="cx ${c.grupo ? "cx-grupo" : ""}" data-aba="${h(aba)}">
    <header class="cx-topo"><div class="cx-faixa"><a class="cx-faixa-logo" href="/corrida/" title="Voltar ao menu da Corrida">${marca(s.equipe)}</a><i class="cx-barrinha" aria-hidden="true"></i><h1>${h(eq.nome)}</h1></div>
      <div class="cx-conta">${BR}<i class="cx-barrinha" aria-hidden="true"></i><b>${h(s.nome)}</b><button type="button" class="cx-perfil" data-cx-aba="contratos" aria-label="${c.grupo ? "Minha equipe" : "Meu contrato"}" title="${c.grupo ? "Minha equipe" : "Meu contrato"}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3.4"/><path d="M5.5 19c1.200-3 3.600-4.400 6.500-4.400s5.300 1.400 6.500 4.400"/></svg></button><details class="cx-menu"><summary aria-label="Ajustes da carreira"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.400 13a7.600 7.600 0 0 0 0-2l2.100-1.600-2-3.400-2.500 1a7.600 7.600 0 0 0-1.700-1L15 3.300h-4l-.4 2.700a7.600 7.600 0 0 0-1.700 1l-2.500-1-2 3.400L6.600 11a7.600 7.600 0 0 0 0 2l-2.100 1.600 2 3.400 2.500-1a7.600 7.600 0 0 0 1.700 1l.4 2.700h4l.4-2.700a7.600 7.600 0 0 0 1.700-1l2.500 1 2-3.400ZM13 15.500a3.500 3.500 0 1 1 0-7 3.500 3.500 0 0 1 0 7Z" transform="translate(-1 0)"/></svg></summary><div class="cx-menu-corpo">${ajustes}${c.menuHTML || '<a href="/corrida/">Menu da Corrida</a><button class="ghost" data-radio-botao aria-label="Voz do engenheiro"></button><button id="novoCodigo">Gerar novo código de recuperação</button><small>O código antigo deixa de valer.</small><button id="excluirCarreira" class="discreto">Excluir carreira</button>'}</div></details></div></header>
    <nav class="cx-abas" role="tablist" aria-label="Seções da carreira">${ABAS.map(([id, nome]) => `<button type="button" role="tab" class="cx-aba ${id === aba ? "on" : ""}" aria-selected="${id === aba}" data-cx-aba="${id}">${rotulo(id, nome)}</button>`).join("")}</nav>
    ${codigoHTML}<main class="cx-corpo" role="tabpanel">${corpo}</main>
    <footer class="cx-pe"><div class="cx-dicas"><span class="gp"><kbd class="r">A</kbd> Selecionar</span><span class="gp"><kbd class="r">B</kbd> Voltar</span><span class="gp"><kbd>LB</kbd><kbd>RB</kbd> Trocar aba</span><span class="kb"><kbd>Q</kbd><kbd>E</kbd> Trocar aba</span><span class="kb"><kbd>Esc</kbd> Voltar</span><button type="button" class="cx-msg" data-cx-msg><kbd class="r gp">Y</kbd><kbd class="kb">M</kbd> Mensagens · ${c.nMensagens}</button></div><div class="cx-salvo"><svg class="cx-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.600 4.600L19 7"/></svg>Salvo</div></footer></div>`;
}
function depois(c) { entradaEq = null; document.body.classList.remove("cx-entrada"); tema(c.s.equipe); ligarFundo(c.s.equipe); requestAnimationFrame(posicionarRotulos); root.Radio?.desenharBotoes?.(); root.CentralAnalise?.ligarGraficos(); }
// Põe o HTML novo na tela mexendo só no que mudou: quem está olhando não vê a tela piscar quando outro jogador age, e o que não mudou segue no lugar.
function pintar(alvo, html) {
  if (alvo._cxHtml === html && alvo.querySelector(":scope > .cx")) return;
  const molde = document.createElement("template"); molde.innerHTML = html;
  if (!alvo.querySelector(":scope > .cx")) { alvo.replaceChildren(molde.content); alvo._cxHtml = html; return; }
  const juntar = (a, b) => {
    if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.tagName !== b.tagName) || (a.nodeType === 1 && a.dataset.cxGraf !== b.dataset.cxGraf)) { a.replaceWith(b.cloneNode(true)); return; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    filhos(a, b);
  };
  const filhos = (a, b) => { for (let i = 0; i < b.childNodes.length; i++) { if (a.childNodes[i]) juntar(a.childNodes[i], b.childNodes[i]); else a.appendChild(b.childNodes[i].cloneNode(true)); } while (a.childNodes.length > b.childNodes.length) a.lastChild.remove(); };
  filhos(alvo, molde.content); alvo._cxHtml = html;
}
// A troca de aba: o conteúdo entra deslizando do lado para onde a pessoa foi, bloco a bloco (o sublinhado anda sozinho, pelo CSS).
function animarAba(dir) {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const corpo = document.querySelector(".cx-corpo"); if (!corpo?.animate) return;
  const blocos = [...corpo.children].slice(0, 6);
  (blocos.length ? blocos : [corpo]).forEach((el, i) => el.animate([{ opacity: 0, transform: `translateX(${dir * 22}px)` }, { opacity: 1, transform: "none" }], { duration: 260, delay: i * 35, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
}
function trocarAba(a, render) { const ordem = (x) => ABAS.findIndex((q) => q[0] === x), dir = ordem(a) < ordem(aba) ? -1 : 1, mudou = a !== aba; aba = a; try { localStorage.setItem("corrida:temporada:aba", a); } catch {} render(); if (mudou) animarAba(dir); window.scrollTo?.({ top: 0 }); const b = document.querySelector(`.cx-aba[data-cx-aba="${a}"]`); b?.focus({ preventScroll: true }); }
function abrirMensagens() { const d = dialogo("cxMsgDlg", "cx-msgs"); d.innerHTML = `<form method="dialog"><button class="cx-dlg-x" aria-label="Fechar">✕</button></form>${ctxAtual?.caixaMensagens || ""}`; d.showModal(); }
// devolve true se o clique era desta tela
function clique(alvo, render) {
  if (root.CentralAnalise?.clique(alvo, render) || root.CentralContrato?.clique(alvo, render)) return true;
  if (alvo.hasAttribute("data-cx-tema")) { escuro = !escuro; try { localStorage.setItem(CHAVE_TEMA, escuro ? "escuro" : "claro"); } catch {} aplicarTema(); return true; }
  if (alvo.dataset.cxAba) { trocarAba(alvo.dataset.cxAba, render); return true; }
  if (alvo.dataset.cxTabela) { tabela = alvo.dataset.cxTabela; if (aba !== "classif") return (trocarAba("classif", render), true); render(); return true; }
  if (alvo.dataset.cxAttr) { attr = alvo.dataset.cxAttr; render(); document.querySelector(`.cx-dv-abas [data-cx-attr="${attr}"]`)?.focus({ preventScroll: true }); return true; }
  if (alvo.dataset.gp != null && alvo.classList.contains("cx-gp")) { abrirGP(+alvo.dataset.gp); return true; }
  if (alvo.hasAttribute("data-cx-msg")) { abrirMensagens(); return true; }
  return false;
}
document.addEventListener("change", (e) => { if (document.body.classList.contains("cx-on") && renderAtual) root.CentralAnalise?.mudou(e, renderAtual); });
document.addEventListener("click", (e) => { if (!document.body.classList.contains("cx-on")) return; const m = document.querySelector(".cx-menu[open]"); if (m && !e.target.closest(".cx-menu")) m.open = false; const l = e.target.closest?.("tr[data-piloto]"); if (l) abrirPiloto(l.dataset.piloto); });

// ---------- teclado e controle: as abas, voltar e o foco pelas setas ----------
let renderAtual = null;
function andarAba(d) { const i = ABAS.findIndex((a) => a[0] === aba); trocarAba(ABAS[(i + d + ABAS.length) % ABAS.length][0], renderAtual); }
function moverFoco(dx, dy) {
  const lista = [...document.querySelectorAll(".cx button:not(:disabled), .cx a[href], .cx tr[data-piloto]")].filter((x) => x.offsetParent !== null && !x.closest("details:not([open]) > :not(summary)"));
  const f = document.activeElement, a = lista.includes(f) ? f.getBoundingClientRect() : null;
  if (!a) { (document.querySelector(".cx-corpo button:not(:disabled)") || lista[0])?.focus({ preventScroll: false }); return; }
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2; let melhor = null, nota = Infinity;
  for (const x of lista) { if (x === f) continue; const r = x.getBoundingClientRect(), vx = r.left + r.width / 2 - ax, vy = r.top + r.height / 2 - ay, frente = vx * dx + vy * dy; if (frente <= 4) continue; const lado = Math.abs(vx * dy) + Math.abs(vy * dx), n = frente + lado * 2.4; if (n < nota) { nota = n; melhor = x; } }
  melhor?.focus({ preventScroll: false }); melhor?.scrollIntoView?.({ block: "nearest" });
}
const haDialogo = () => document.querySelector("dialog[open]");
addEventListener("keydown", (e) => {
  if (!document.body.classList.contains("cx-on") || entradaEq) return;
  const d = haDialogo(); if (d) return;
  const t = e.target, emCampo = t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
  if (emCampo) return;
  if (e.key === "q" || e.key === "Q") andarAba(-1); else if (e.key === "e" || e.key === "E") andarAba(1); else if (e.key === "m" || e.key === "M") abrirMensagens();
  else if (e.key === "Escape") { if (aba !== "central") trocarAba("central", renderAtual); else location.href = "/corrida/"; }
  else if (e.key.startsWith("Arrow")) { e.preventDefault(); moverFoco(e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0); }
  else if (e.key === "Enter" && t?.matches?.("tr[data-piloto]")) abrirPiloto(t.dataset.piloto);
});
const pad = { dir: null, espera: 0 };
setInterval(() => {
  if (!document.body.classList.contains("cx-on") || entradaEq || document.hidden || !navigator.getGamepads) return;
  const p = [...navigator.getGamepads()].find(Boolean); document.body.classList.toggle("cx-pad", !!p); if (!p) return;
  const b = (i) => !!p.buttons[i]?.pressed, ax = p.axes[0] || 0, ay = p.axes[1] || 0, agora = performance.now(), d = haDialogo();
  const dir = b(12) || ay < -0.55 ? "c" : b(13) || ay > 0.55 ? "b" : b(14) || ax < -0.55 ? "e" : b(15) || ax > 0.55 ? "d" : null;
  if (dir && !d && (dir !== pad.dir || agora > pad.espera)) { moverFoco(dir === "d" ? 1 : dir === "e" ? -1 : 0, dir === "b" ? 1 : dir === "c" ? -1 : 0); pad.espera = agora + (dir === pad.dir ? 160 : 340); }
  pad.dir = dir;
  const toque = (i, fn) => { const on = b(i); if (on && !pad[i]) fn(); pad[i] = on; };
  toque(0, () => { const a = document.activeElement; if (a?.matches?.("tr[data-piloto]")) abrirPiloto(a.dataset.piloto); else a?.click?.(); });
  toque(1, () => { if (d) d.close(); else if (aba !== "central") trocarAba("central", renderAtual); else location.href = "/corrida/"; });
  toque(3, () => { if (d) d.close(); else abrirMensagens(); });
  toque(4, () => { if (!d) andarAba(-1); }); toque(5, () => { if (!d) andarAba(1); });
  // X gira o carro no Desenvolvimento
  if (b(2) && aba === "desenvolvimento") garagem?.girar(0.05);
}, 90);

root.CentralUI = { h, marca, seta, tituloCard, tricolor, bandeira, dois, nomeGP };
root.Central = { entrada, temaNaTela: aplicarTema, html, depois, pintar, clique, sair, usarRender(fn) { renderAtual = fn; }, aba: () => aba, estatisticas };
})(window);
