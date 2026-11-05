// Corrida da Galera — a Central da carreira solo (/corrida/temporada/): o topo com a equipe, as abas Central, Calendário, Classificação,
// Desenvolvimento e Contratos, tudo na cor da equipe (`--eq`, `--eq2`) em cima da garagem 3D (garagem3d.js, parada como foto; no Desenvolvimento ela vira
// a vitrine do carro, com os rótulos das peças). Só desenha: os números vêm do save que o servidor manda, e as ações continuam em sede.js
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

// ---------- o tema: as cores saem da equipe ----------
function luz(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ""); if (!m) return 0.3; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; }
function coresDa(equipe) {
  const e = Pilotos().EQUIPES[equipe] || {}, p = root.Pistas?.MODS?.pintura?.[e.pintura] || {}, c1 = e.cor || "#e10600";
  const c2 = [p.c2, p.c, "#ffffff"].find((c) => c && luz(c) > 0.32 && c.toLowerCase() !== c1.toLowerCase()) || "#ffffff";
  return { c1, c2 };
}
function tema(equipe) {
  const { c1, c2 } = coresDa(equipe), r = document.documentElement.style;
  r.setProperty("--eq", c1); r.setProperty("--eq2", c2); r.setProperty("--eq-txt", luz(c1) > 0.58 ? "#08090c" : "#fff");
  document.body.classList.add("cx-on");
}
function sair() { document.body.classList.remove("cx-on"); garagem?.parar(); garagem = null; document.getElementById("cxFundo")?.remove(); document.getElementById("cxRotulos")?.remove(); }

// ---------- a garagem de fundo ----------
function ligarFundo(equipe) {
  let host = document.getElementById("cxFundo");
  if (!host) { host = document.createElement("div"); host.id = "cxFundo"; host.setAttribute("aria-hidden", "true"); host.innerHTML = '<div class="cx-veu"></div>'; document.body.prepend(host); }
  const vistaAgora = () => (aba === "desenvolvimento" ? (innerWidth < 1000 ? "devCelular" : "dev") : "sede");
  if (garagem) { garagem.trocarEquipe(equipe); garagem.vista(vistaAgora()); return; }
  if (criando) return; criando = true;
  const iniciarQuandoLivre = () => {
    if (!document.body.classList.contains("cx-on") || garagem) { criando = false; return; }
    if (document.hidden || performance.now() - ultimaInteracao < 1800) { setTimeout(iniciarQuandoLivre, 1000); return; }
    const iniciar = () => {
      if (!document.body.classList.contains("cx-on") || garagem) { criando = false; return; }
      (modGaragem ? Promise.resolve(modGaragem) : import("/corrida/garagem3d.js")).then((m) => {
        modGaragem = m; criando = false;
        if (!document.body.classList.contains("cx-on") || garagem) return;
        let carroPronto = false, ultimoRotulo = -Infinity;
        garagem = m.criarGaragem(host, { leve: true, entradaCarro: true, aoCarregar: () => { carroPronto = true; posicionarRotulos(); }, aoDesenhar: () => { if (carroPronto) host.classList.add("cx-carro-pronto"); const agora = performance.now(); if (agora - ultimoRotulo >= 1000 / 30) { ultimoRotulo = agora; posicionarRotulos(); } } });
        if (!garagem) return;
        garagem.vista(vistaAgora(), true); garagem.trocarEquipe(ctxAtual?.s?.equipe || equipe);
      }).catch((e) => { criando = false; console.warn("garagem 3D indisponível", e); });
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(iniciar, { timeout: 2000 }); else setTimeout(iniciar, 0);
  };
  setTimeout(iniciarQuandoLivre, 1800);
}
addEventListener("resize", () => { if (document.body.classList.contains("cx-on") && garagem) garagem.vista(aba === "desenvolvimento" ? (innerWidth < 1000 ? "devCelular" : "dev") : "sede"); posicionarRotulos(); }, { passive: true });

// ---------- pedacinhos ----------
const marca = (id, cls = "") => `<img class="cx-logo ${cls}" src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none'">`;
const seta = '<svg class="cx-seta" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const tituloCard = (t, sub = "") => `<header class="cx-tit"><i aria-hidden="true"></i><div><h3>${t}</h3>${sub ? `<small>${sub}</small>` : ""}</div></header>`;
const tricolor = () => '<i class="cx-tri" aria-hidden="true"></i>';
const BR = '<svg class="cx-bandeira-br" viewBox="0 0 28 20" role="img" aria-label="Brasil"><rect width="28" height="20" rx="2" fill="#009b3a"/><path d="M14 2.6 25.4 10 14 17.4 2.6 10Z" fill="#fedf00"/><circle cx="14" cy="10" r="4.4" fill="#002776"/></svg>';
const CAP = (cor, cor2) => `<svg class="cx-capacete" viewBox="0 0 120 96" aria-hidden="true"><path d="M8 60C6 26 32 6 64 6c28 0 50 17 52 44 .5 8-4 12-10 12H70c-8 0-11 6-11 14 0 8-5 14-16 14-22 0-33-14-35-30Z" fill="${h(cor)}"/><path d="M22 72c18-2 26-14 30-30 3-13 16-20 34-20" fill="none" stroke="${h(cor2)}" stroke-width="7" stroke-linecap="round"/><path d="M60 32h46c7 0 11 5 11 12v3c0 6-4 9-10 9H62c-7 0-10-5-10-11s2-13 8-13Z" fill="#0a0b0f"/><path d="M64 37h38" stroke="#ffffff55" stroke-width="3" stroke-linecap="round"/><path d="M20 28C30 14 46 8 64 8" fill="none" stroke="#ffffff50" stroke-width="3" stroke-linecap="round"/></svg>`;
const sobrenome = (n) => String(n || "").trim().split(/\s+/).at(-1).toUpperCase();
const sigla = (nome) => String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().slice(0, 3);
const bandeira = (id) => Gar().bandeira(id);
const estatisticas = (gps, id = "voce") => { let v = 0, p = 0, r = 0; for (const g of gps) { const l = g.linhas.find((x) => x.piloto === id); if (!l || l.dnf || l.nc) continue; if (l.pos === 1) v++; if (l.pos <= 3) p++; if (l.voltaRapida) r++; } return { v, p, r }; };
const nomeGP = (id, curto) => { const i = Gi()?.get(id), real = i?.real; const p = root.Pistas?.PISTAS[id]; if (real) return String(i.gp).replace("Grande Prêmio", "GP"); return p?.name || curto; };
const finalDe = (l) => (!l ? "" : l.dnf ? "DNF" : l.nc ? "NC" : `P${l.pos}`);

// ---------- a Central ----------
function central(c) {
  const { s, t, im, prox, terminou, ativo, previsao, botao, gps } = c, eu = t.pilotos.findIndex((p) => p.id === "voce"), info = prox && Gi()?.get(prox.pista);
  const foto = prox ? Gi()?.fundoDe(prox.pista) : null, traco = prox && root.GpSobre ? root.GpSobre.mapaSvg(prox.pista, "cx-traco") : "";
  const prev = previsao && root.F1Regras?.descreverPrevisao ? root.F1Regras.descreverPrevisao(previsao, s.voltas) : null;
  const dados = prox ? [info?.circuito || prox.nome, info?.real && info.km ? `${String(info.km.toFixed(3)).replace(".", ",")} km` : "", `${s.voltas} voltas`].filter(Boolean).map(h).join(" • ") : "";
  const proxCard = prox
    ? `<section class="cx-card cx-prox" style="--foto:${foto ? `url('${h(foto)}')` : "none"}"><span class="cx-prox-foto" aria-hidden="true"></span>
      <div class="cx-prox-topo"><i aria-hidden="true"></i><b>${ativo ? "GP em andamento" : "Próxima etapa"}</b><span>•</span><em>Rodada ${dois(s.gp + 1)} / ${dois(s.tamanho)}</em></div>
      <div class="cx-prox-traco">${traco}</div>
      <div class="cx-prox-meio"><h2>${h(nomeGP(prox.pista, prox.nome))}</h2><p>${dados} <span class="cx-sub-grid">· classificação · grid de 22 carros</span></p></div>
      <div class="cx-prox-pe"><div class="cx-clima">${prev ? `${root.PrevisaoUI?.icone ? `<span class="cx-clima-ic">${root.PrevisaoUI.icone(prev.nivel)}</span>` : ""}<span><small>Previsão</small><b>${h(prev.titulo)}</b></span><strong>${prev.pct}%<small> de chuva</small></strong>` : ""}</div>${botao}</div></section>`
    : `<section class="cx-card cx-prox cx-fim"><div class="cx-prox-topo"><i aria-hidden="true"></i><b>Bandeirada final</b></div><div class="cx-prox-meio"><h2>Temporada ${s.ano} concluída</h2><p>Campeão: ${h(t.pilotos[0].nome)} · Construtores: ${h(t.equipes[0].nome)}. O caixa e o carro seguem para o próximo ano.</p></div><div class="cx-prox-pe"><div></div>${botao}</div></section>`;
  // o campeonato: os cinco primeiros (e eu, se estou fora)
  const lista = t.pilotos.slice(0, 5); if (eu >= 5) lista[4] = t.pilotos[eu];
  const cor = (e) => Pilotos().EQUIPES[e]?.cor || "#fff";
  const camp = `<section class="cx-card cx-camp">${tituloCard("Campeonato de pilotos", `Temporada ${dois(s.ano)}`)}<ol class="cx-top">${lista.map((p) => `<li class="${p.id === "voce" ? "eu" : ""}"><button type="button" class="cx-linha" data-cx-aba="classif"><b>${t.pilotos.indexOf(p) + 1}</b><i style="--c:${h(cor(p.equipe))}"></i>${p.id === "voce" ? marca(s.equipe) : ""}<span>${h(sobrenome(p.nome))}</span><strong>${p.pontos}</strong></button></li>`).join("")}</ol>
    ${tricolor()}<div class="cx-nums">${[[c.minhas.v, c.minhas.v === 1 ? "Vitória" : "Vitórias"], [c.minhas.p, c.minhas.p === 1 ? "Pódio" : "Pódios"], [c.minhas.r, c.minhas.r === 1 ? "Volta rápida" : "Voltas rápidas"]].map(([n, r]) => `<div class="cx-num"><b>${n}</b><small>${r}</small></div>`).join("")}</div></section>`;
  // o desenvolvimento: o que está mais forte e os pontos que sobram
  const E = Eq(), usado = E.custoDaMontagem(s.montagem), limite = E.EQUIPES[s.equipe].orcamento + (s.bonus || 0);
  const dev = `<section class="cx-card cx-dev" data-cx-ir="desenvolvimento">${tituloCard("Desenvolvimento", `${h(Pilotos().EQUIPES[s.equipe].sigla)} • Programa de evolução`)}<p class="cx-recurso"><span>Pontos livres</span><b>${limite - usado}</b><em>de ${limite}</em></p>
    ${["aero", "chassi", "motor"].map((k) => { const n = s.montagem[k], pc = Math.round(n / E.MAX_NIVEL * 100); return `<div class="cx-barra"><span>${h(ATTR.find((a) => a[0] === k)[1])}</span><i><u style="width:${pc}%"></u></i><b>${pc}%</b></div>`; }).join("")}
    <button type="button" class="cx-mais" data-cx-aba="desenvolvimento">Gerenciar melhorias ${seta}</button></section>`;
  // a rivalidade: o rival da temporada ou o piloto mais perto na tabela
  const rivalId = c.rival?.id || (t.pilotos[eu === 0 ? 1 : eu - 1])?.id, rv = t.pilotos.find((p) => p.id === rivalId), meus = t.pilotos[eu]?.pontos || 0, seus = rv?.pontos || 0;
  const { c1, c2 } = coresDa(s.equipe), rc = coresDa(rv?.equipe || s.equipe), posRv = t.pilotos.indexOf(rv) + 1, total = Math.max(1, meus + seus), pct = Math.round(meus / total * 100);
  const riv = `<section class="cx-card cx-riv">${tituloCard(c.rival ? "Rival da temporada" : "Rivalidade")}<div class="cx-versus"><div class="cx-v-lado">${CAP(c1, c2)}<div><span>${h(sobrenome(s.nome))}</span><b>${meus}</b></div></div><em>VS</em><div class="cx-v-lado dir"><div><span>${h(sobrenome(rv?.nome))}</span><b>${seus}</b></div>${CAP(rc.c1, rc.c2)}</div></div>
    <div class="cx-v-barra" role="img" aria-label="${meus} pontos contra ${seus}"><u style="width:${s.gp ? pct : 50}%"></u></div><small class="cx-v-txt">${c.rival ? `${c.rival.encontros} ${c.rival.encontros === 1 ? "disputa" : "disputas"} • à frente ${c.rival.venceu} • atrás ${c.rival.perdeu}` : `Disputa pelo ${Math.min(eu + 1, posRv)}º lugar`}</small></section>`;
  // o objetivo
  const objetivo = `<section class="cx-card cx-obj">${marca(s.equipe, "cx-marca-dagua")}${tituloCard(`Objetivo da ${h(Pilotos().EQUIPES[s.equipe].nome)}`)}<div class="cx-obj-corpo"><h4>${terminou ? `Top ${im.meta.temporada} no ano` : `Termine no top ${im.meta.gp}`}</h4><p>${terminou ? `Você fechou em ${im.classificacao}º` : `Próxima corrida • ${h(prox.nome)}`}</p><span class="cx-selo">${terminou ? (im.classificacao <= im.meta.temporada ? "Cumprido" : "Não cumprido") : "Em andamento"}</span></div>
    <div class="cx-conf"><small>Confiança da diretoria</small><i><u style="width:${im.confianca}%"></u></i><b>${im.confianca}%</b></div></section>`;
  return `<div class="cx-g-central">${proxCard}${camp}<div class="cx-g-baixo">${dev}${riv}${objetivo}</div></div>`;
}

// ---------- o Calendário ----------
function calendario(c) {
  const { s, gps, prox, botao, previsao } = c, feitos = gps.length;
  const prev = previsao && root.F1Regras?.descreverPrevisao ? root.F1Regras.descreverPrevisao(previsao, s.voltas) : null;
  const cards = s.calendario.map((e, i) => {
    const r = gps.find((g) => g.gp === i), eu = r?.linhas.find((l) => l.piloto === "voce"), foto = Gi()?.fundoDe(e.pista), traco = root.GpSobre ? root.GpSobre.mapaSvg(e.pista, "cx-traco") : "", atual = i === s.gp;
    return `<button type="button" class="cx-card cx-gp ${r ? "feito" : ""} ${atual ? "atual" : ""}" data-gp="${i}" style="--foto:${foto ? `url('${h(foto)}')` : "none"}" aria-label="${h(e.nome)}: ver o circuito">
      <span class="cx-gp-topo"><b>${dois(i + 1)}</b><i>•</i>${bandeira(e.pista)}<strong>${h(e.nome)}</strong>${atual ? marca(s.equipe) : ""}</span>
      <span class="cx-gp-foto"><span class="cx-gp-traco">${traco}</span></span>
      <span class="cx-gp-pe">${r ? `<svg class="cx-ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7 12 3.4 3.4L17 9"/></svg><em>Concluído</em><b>${finalDe(eu)} • ${eu?.pontos || 0} pts</b>` : atual ? `<u>${c.ativo ? "GP em andamento" : "Próxima etapa"}</u>` : "<em>A disputar</em>"}</span></button>`;
  }).join("");
  const barra = prox ? `<section class="cx-card cx-gpbar">${bandeira(prox.pista)}<h3>${h(nomeGP(prox.pista, prox.nome))}</h3><p>Etapa ${dois(s.gp + 1)} / ${dois(s.tamanho)} • ${c.ativo ? "GP em andamento" : "Próxima corrida"}</p>${prev ? `<div class="cx-clima">${root.PrevisaoUI?.icone ? `<span class="cx-clima-ic">${root.PrevisaoUI.icone(prev.nivel)}</span>` : ""}<b>${prev.pct}% • ${h(prev.titulo)}</b></div>` : ""}${botao}</section>` : `<section class="cx-card cx-gpbar"><h3>Temporada concluída</h3><p>Todas as ${s.tamanho} etapas disputadas</p>${botao}</section>`;
  return `<div class="cx-cabeca"><div class="cx-cab-tit"><i aria-hidden="true"></i><div><h2>Calendário da temporada</h2><small>Temporada ${dois(s.ano)} • ${feitos} de ${s.tamanho} etapas concluídas</small></div>${tricolor()}</div><div class="cx-formato"><span>Formato da temporada</span><b>${s.tamanho} GPs</b><em>${s.voltas} voltas</em></div></div>
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
  const { s, t, gps, prox, im } = c, E = Pilotos().EQUIPES, passadas = new Map(gps.map((g) => [g.gp, g])), eu = t.pilotos.findIndex((p) => p.id === "voce"), meus = t.pilotos[eu]?.pontos || 0, lider = t.pilotos[0]?.pontos || 0;
  const tabDe = c.tabelasDe || ((res) => Reg().tabelas({ ...s, resultados: res })); // (na temporada em grupo, as contas são as da sala)
  const antes = gps.length ? tabDe(s.resultados.filter((r) => r !== gps.at(-1))) : null;
  const seta2 = (lista, id, i) => { const a = lista ? lista.findIndex((x) => x.id === id) : i; return a > i ? '<svg class="cx-sobe" viewBox="0 0 12 10" role="img" aria-label="ganhou posição"><path d="M6 0l6 10H0z"/></svg>' : a < i ? '<svg class="cx-desce" viewBox="0 0 12 10" role="img" aria-label="perdeu posição"><path d="M6 10L0 0h12z"/></svg>' : "<i>—</i>"; };
  const colunas = s.calendario.map((e, i) => `<th class="cx-col ${i === s.gp ? "agora" : ""}" scope="col" title="${h(e.nome)}">${bandeira(e.pista)}<small>${h(sigla(e.nome))}</small></th>`).join("");
  let corpo;
  if (tabela === "pilotos") {
    const quem = gps.length ? new Set(gps.flatMap((g) => g.linhas.map((l) => l.piloto))) : new Set(c.idsGrid || ["voce", ...Reg().pilotosNoGrid(s).map((p) => p.id)]);
    corpo = t.pilotos.filter((p) => quem.has(p.id)).map((p, i) => `<tr class="${p.id === "voce" ? "eu" : p.id === c.rival?.id ? "rival" : ""}" data-piloto="${h(p.id)}" tabindex="0"><td class="p">${i + 1}</td><td class="m">${seta2(antes?.pilotos.filter((x) => quem.has(x.id)), p.id, i)}</td><td class="n"><i style="--c:${h(E[p.equipe]?.cor || "#fff")}"></i>${p.id === "voce" ? marca(s.equipe) : ""}<b>${h(sobrenome(p.nome))}</b></td><td class="e">${h(E[p.equipe]?.nome || "")}</td>${s.calendario.map((_, g) => { const r = passadas.get(g), l = r?.linhas.find((x) => x.piloto === p.id); return `<td class="v">${!r ? "—" : !l ? "" : l.dnf ? '<em>DNF</em>' : l.nc ? "<em>NC</em>" : l.pontos}</td>`; }).join("")}<td class="t">${p.pontos}</td><td class="d">${i ? -(lider - p.pontos) : "—"}</td></tr>`).join("");
  } else {
    const liderE = t.equipes[0]?.pontos || 0;
    corpo = t.equipes.map((e, i) => `<tr class="${e.id === s.equipe ? "eu" : ""}"><td class="p">${i + 1}</td><td class="m">${seta2(antes?.equipes, e.id, i)}</td><td class="n"><i style="--c:${h(E[e.id]?.cor || "#fff")}"></i>${marca(e.id)}<b>${h(e.nome.toUpperCase())}</b></td><td class="e">${h(E[e.id]?.sigla || "")}</td>${s.calendario.map((_, g) => { const r = passadas.get(g); return `<td class="v">${r ? r.linhas.filter((l) => l.equipe === e.id).reduce((a, l) => a + l.pontos, 0) : "—"}</td>`; }).join("")}<td class="t">${e.pontos}</td><td class="d">${i ? -(liderE - e.pontos) : "—"}</td></tr>`).join("");
  }
  // a campanha: a posição a cada GP (a linha sobe quando o piloto sobe)
  const pontosEvol = gps.map((g, i) => { const tb = tabDe(s.resultados.filter((r) => r.ano !== s.ano || gps.indexOf(r) <= i)); return tb.pilotos.findIndex((p) => p.id === "voce") + 1; });
  const W = 300, H = 56, x = (i) => (pontosEvol.length > 1 ? i / (pontosEvol.length - 1) : 0.5) * (W - 10) + 5, y = (p) => 6 + (p - 1) / 21 * (H - 12);
  const linha = pontosEvol.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const grafico = pontosEvol.length ? `<svg class="cx-evol" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sua posição a cada GP"><polygon points="${x(0).toFixed(1)},${H} ${linha} ${x(pontosEvol.length - 1).toFixed(1)},${H}"/><polyline points="${linha}"/>${pontosEvol.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="3"><title>${h(s.calendario[gps[i].gp]?.nome)}: ${p}º</title></circle>`).join("")}</svg>` : '<p class="cx-vazio">A linha aparece depois do primeiro GP.</p>';
  const dif = lider - meus, seloDif = eu === 0 ? (gps.length ? `${meus - (t.pilotos[1]?.pontos || 0)} pontos à frente` : "Tudo por fazer") : `${dif} ${dif === 1 ? "ponto" : "pontos"} para o líder`;
  const top3 = t.equipes.slice(0, 3); const minhaE = t.equipes.findIndex((e) => e.id === s.equipe); if (minhaE > 2) top3[2] = t.equipes[minhaE];
  const lidera = t.equipes[0], difE = lidera.pontos - (t.equipes[1]?.pontos || 0);
  return `<div class="cx-g-classif"><div class="cx-c-esq"><div class="cx-cabeca compacta"><div class="cx-cab-tit"><i aria-hidden="true"></i><div><h2>Classificação do campeonato</h2><small>Temporada ${dois(s.ano)} • ${gps.length} de ${s.tamanho} etapas concluídas</small></div></div></div>
      <div class="cx-c-filtros"><div class="cx-troca" role="tablist"><button type="button" role="tab" class="${tabela === "pilotos" ? "on" : ""}" aria-selected="${tabela === "pilotos"}" data-cx-tabela="pilotos">Pilotos</button><button type="button" role="tab" class="${tabela === "equipes" ? "on" : ""}" aria-selected="${tabela === "equipes"}" data-cx-tabela="equipes">Construtores</button></div><span class="cx-chip">${s.tamanho} GPs</span><span class="cx-leg"><svg class="cx-sobe" viewBox="0 0 12 10" aria-hidden="true"><path d="M6 0l6 10H0z"/></svg>Ganhou posição</span><span class="cx-leg"><svg class="cx-desce" viewBox="0 0 12 10" aria-hidden="true"><path d="M6 10L0 0h12z"/></svg>Perdeu posição</span></div>
      <section class="cx-card cx-tabela">${tituloCard(tabela === "pilotos" ? "Campeonato de pilotos" : "Campeonato de construtores")}<div class="cx-t-rolo"><table style="--n:${s.calendario.length}"><thead><tr><th class="p" scope="col">Pos</th><th class="m"></th><th class="n" scope="col" colspan="2">${tabela === "pilotos" ? "Piloto / equipe" : "Equipe"}</th>${colunas}<th class="t" scope="col">Pts</th><th class="d" scope="col">Dif.</th></tr></thead><tbody>${corpo}</tbody></table></div></section>
      <p class="cx-rodape-t">Dif.: pontos para o líder • — : etapas ainda não disputadas</p></div>
    <aside class="cx-c-dir"><section class="cx-card cx-camp2">${marca(s.equipe, "cx-marca-dagua")}<div class="cx-camp2-topo">${marca(s.equipe)}<div><small>Sua campanha</small><h3>${gps.length ? `${eu + 1}º lugar` : "Temporada nova"}</h3><span>${h(s.nome)}</span></div></div><div class="cx-camp2-pts"><b>${meus}</b><small>pontos</small><span class="cx-selo">${h(seloDif)}</span></div>${tricolor()}<div class="cx-nums">${[[c.minhas.v, c.minhas.v === 1 ? "Vitória" : "Vitórias"], [c.minhas.p, c.minhas.p === 1 ? "Pódio" : "Pódios"], [s.tamanho - s.gp, "Etapas restantes"]].map(([n, r]) => `<div class="cx-num"><b>${n}</b><small>${r}</small></div>`).join("")}</div><small class="cx-rot">Evolução no campeonato</small>${grafico}</section>
      <section class="cx-card cx-cons">${tituloCard("Construtores")}<ol class="cx-top">${top3.map((e) => `<li class="${e.id === s.equipe ? "eu" : ""}"><button type="button" class="cx-linha" data-cx-tabela="equipes"><b>${t.equipes.indexOf(e) + 1}</b>${marca(e.id)}<span>${h(e.nome.toUpperCase())}</span><strong>${e.pontos}</strong></button></li>`).join("")}</ol><p class="cx-cons-txt">${gps.length ? `${h(lidera.nome)} lidera por ${difE} ${difE === 1 ? "ponto" : "pontos"}` : "Ninguém pontuou ainda"}</p><button type="button" class="cx-contorno" data-cx-tabela="equipes">Ver construtores ${seta}</button></section>
      ${prox ? `<button type="button" class="cx-card cx-prox-mini" data-cx-aba="calendario">${bandeira(prox.pista)}<span><small>Próxima etapa</small><b>${h(nomeGP(prox.pista, prox.nome))}</b></span><em>${dois(s.gp + 1)} / ${dois(s.tamanho)}</em></button>` : ""}</aside></div>`;
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
function notaDe(equipe, m) { return Gar().notaGeral(Eq().ficha(Eq().specDaEquipe(equipe, m))); }
function desenvolvimento(c) {
  const { s, ativo, terminou } = c, E = Eq(), limite = E.EQUIPES[s.equipe].orcamento + (s.bonus || 0), usado = E.custoDaMontagem(s.montagem), livres = limite - usado, pode = !ativo && !terminou;
  const atual = ATTR.find((a) => a[0] === attr) || ATTR[0], k = atual[0], peca = E.PECAS[k], n = s.montagem[k], max = E.MAX_NIVEL, maxou = n >= max;
  const depois = { ...s.montagem, [k]: Math.min(max, n + 1) }, fA = E.ficha(E.specDaEquipe(s.equipe, s.montagem)), fD = E.ficha(E.specDaEquipe(s.equipe, depois)), nA = notaDe(s.equipe, s.montagem), nD = notaDe(s.equipe, depois);
  const dif = fD.map((f, i) => ({ r: f.rotulo, d: f.nota - fA[i].nota })).filter((x) => x.d), custoDev = 12 + (s.bonus || 0) * 6;
  const motivo = !pode ? (ativo ? "O GP está aberto: a montagem espera o fim da corrida." : "A temporada acabou.") : maxou ? "Esta peça já está no nível máximo." : livres <= 0 ? "Sem pontos livres. Tire de outra peça ou desenvolva mais um ponto." : "";
  const abas = ATTR.map(([id, nome]) => `<button type="button" class="${id === k ? "on" : ""}" aria-pressed="${id === k}" data-cx-attr="${id}">${h(nome)}</button>`).join("");
  const painel = `<aside class="cx-card cx-dv-painel">${tituloCard(h(atual[1]), h(atual[2]))}<span class="cx-selo">${maxou ? `Nível ${n} • máximo` : `Nível ${n} → ${n + 1}`}</span><h4>${h(peca.nome)}</h4><p>${h(peca.desc)}</p>
      <dl><div><dt>Custo</dt><dd>1 ponto</dd></div><div><dt>Melhora</dt><dd class="cx-verde">${h(peca.bom)}</dd></div><div><dt>Cobra em troca</dt><dd>${h(peca.custa)}</dd></div></dl>
      <div class="cx-dv-nota"><span>Desempenho</span><b>${nA}${!maxou ? ` <svg viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7h21M15 1l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg> <em class="${nD >= nA ? "cx-verde" : "cx-verm"}">${nD}</em>` : ""}</b></div><div class="cx-dv-barra"><u style="width:${Math.min(nA, nD)}%"></u>${nD > nA ? `<s style="left:${nA}%;width:${nD - nA}%"></s>` : ""}</div>
      <h5>Prévia do carro</h5><ul>${dif.length ? dif.map((x) => `<li><span>${h(x.r)}</span><b class="${x.d > 0 ? "cx-verde" : "cx-verm"}">${x.d > 0 ? "+" : ""}${x.d}</b></li>`).join("") : '<li><span>Sem mudança visível na nota</span><b>—</b></li>'}</ul>
      <button type="button" class="cx-bt" data-ponto="${k}" data-delta="1" ${!pode || maxou || livres <= 0 ? "disabled" : ""}>Instalar melhoria ${seta}</button>
      <div class="cx-dv-acoes"><button type="button" class="cx-contorno" data-ponto="${k}" data-delta="-1" ${!pode || n <= 0 ? "disabled" : ""}>Tirar 1 nível</button><button type="button" class="cx-contorno" data-ponto-zerar ${!pode || !usado ? "disabled" : ""}>Zerar tudo</button></div>
      <small class="cx-dv-saldo">${motivo || `Saldo depois da melhoria: <b>${livres - 1} ${livres - 1 === 1 ? "ponto" : "pontos"}</b>`}</small></aside>`;
  const CURTO = { aero: "Aero", chassi: "Chassi", motor: "Potência", freios: "Freios", suspensao: "Suspensão", confiab: "Durabilidade" };
  const geral = ATTR.map(([id]) => { const nome = CURTO[id], nv = s.montagem[id]; return `<button type="button" class="cx-dv-mini ${id === k ? "on" : ""}" data-cx-attr="${id}"><span>${h(nome)}</span><b>${nv}<small>/${max}</small></b><i><u style="width:${nv / max * 100}%"></u></i></button>`; }).join("");
  const rotulos = ATTR.map(([id, , peca2]) => `<button type="button" class="cx-rotulo ${id === k ? "on" : ""}" data-cx-attr="${id}" data-rotulo="${id}"><i></i><span>${h(peca2)}</span></button>`).join("");
  return `<div class="cx-g-dev"><div class="cx-dv-esq"><div class="cx-cabeca compacta"><div class="cx-cab-tit"><i aria-hidden="true"></i><div class="cx-cab-linha"><h2>Evolução do carro</h2><small>Temporada ${dois(s.ano)}</small></div></div><div class="cx-recurso-pill"><span>Pontos livres</span><b>${livres}</b></div></div>
      <div class="cx-dv-abas">${abas}</div><div class="cx-dv-palco" id="cxDvPalco" title="Arraste para girar o carro"><svg class="cx-linhas" id="cxLinhas" aria-hidden="true"></svg>${rotulos}<small class="cx-dv-dica">Arraste para girar</small></div></div>${painel}
    <section class="cx-card cx-dv-base"><div class="cx-dv-geral"><div class="cx-dv-rot"><i aria-hidden="true"></i><h3>Desempenho geral</h3></div><div class="cx-dv-minis">${geral}</div></div><div class="cx-dv-prox"><div class="cx-dv-rot"><i aria-hidden="true"></i><div><h3>Orçamento do carro</h3><small>${s.bonus}/4 melhorias • caixa ${c.dinheiro(s.caixa)}</small></div></div><div class="cx-v-barra fina"><u style="width:${(s.bonus || 0) / 4 * 100}%"></u></div><button type="button" class="cx-contorno" id="${c.idDesenvolver || "desenvolver"}" ${s.bonus >= 4 || ativo || terminou ? "disabled" : ""}>${s.bonus >= 4 ? "Limite atingido" : `+1 ponto • ${c.dinheiro(custoDev)}`}</button></div></section></div>`;
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
  const c = e.target.closest?.(".cx-card,.cx-bt,.cx-contorno,.cx-linha,.cx-aba,.cx-ob"); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
  if (c.matches(".cx-gp,.cx-dev,.cx-riv,.cx-obj,.cx-stat")) { c.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -4}deg`); c.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 4}deg`); }
}

// ---------- a tela inteira ----------
function html(c) {
  ctxAtual = c; const { s, eq, codigoHTML } = c;
  const rotulo = (id, nome) => (c.grupo && id === "contratos" ? "Equipe" : nome), nomeAba = rotulo(aba, ABAS.find((a) => a[0] === aba)?.[1] || "");
  const corpo = aba === "calendario" ? calendario(c) : aba === "classif" ? classificacao(c) : aba === "desenvolvimento" ? desenvolvimento(c) : aba === "contratos" ? root.CentralContrato.html(c) : aba === "analise" ? root.CentralAnalise.html(c) : central(c);
  return `<div class="cx ${c.grupo ? "cx-grupo" : ""}" data-aba="${h(aba)}">
    <header class="cx-topo"><div class="cx-faixa"><a class="cx-faixa-logo" href="/corrida/" title="Voltar ao menu da Corrida">${marca(s.equipe)}</a><i class="cx-barrinha" aria-hidden="true"></i><h1>${h(eq.nome)}</h1><i class="cx-barrinha" aria-hidden="true"></i><span>${aba === "central" ? (c.grupo ? `Sala ${h(c.grupo)}` : "Central da carreira") : `Carreira / ${h(nomeAba)}`}</span>${tricolor()}</div>
      <div class="cx-conta">${marca(s.equipe)}<b>${h(s.nome)}</b>${BR}<div class="cx-caixa"><small>Caixa</small><strong>${h(c.dinheiro(s.caixa))}</strong></div><details class="cx-menu"><summary aria-label="Ajustes da carreira"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.7h4l.4-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" transform="translate(-1 0)"/></svg></summary><div class="cx-menu-corpo">${c.menuHTML || '<a href="/corrida/">Menu da Corrida</a><button class="ghost" data-radio-botao aria-label="Voz do engenheiro"></button><button id="novoCodigo">Gerar novo código de recuperação</button><small>O código antigo deixa de valer.</small><button id="excluirCarreira" class="discreto">Excluir carreira</button>'}</div></details></div></header>
    <nav class="cx-abas" role="tablist" aria-label="Seções da carreira">${ABAS.map(([id, nome]) => `<button type="button" role="tab" class="cx-aba ${id === aba ? "on" : ""}" aria-selected="${id === aba}" data-cx-aba="${id}">${rotulo(id, nome)}</button>`).join("")}</nav>
    ${codigoHTML}<main class="cx-corpo" role="tabpanel">${corpo}</main>
    <footer class="cx-pe"><div class="cx-dicas"><span class="gp"><kbd class="r">A</kbd> Selecionar</span><span class="gp"><kbd class="r">B</kbd> Voltar</span><span class="gp"><kbd class="r">LB</kbd><kbd class="r">RB</kbd> Trocar aba</span><span class="kb"><kbd>Q</kbd><kbd>E</kbd> Trocar aba</span><span class="kb"><kbd>Esc</kbd> Voltar</span><button type="button" class="cx-msg" data-cx-msg><kbd class="r gp">Y</kbd><kbd class="kb">M</kbd> Mensagens <em>${c.nMensagens}</em></button></div>${tricolor()}<div class="cx-salvo"><svg class="cx-ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7 12 3.4 3.4L17 9"/></svg>Progresso salvo</div></footer></div>`;
}
function depois(c) { tema(c.s.equipe); ligarFundo(c.s.equipe); requestAnimationFrame(posicionarRotulos); root.Radio?.desenharBotoes?.(); root.CentralAnalise?.ligarGraficos(); }
function trocarAba(a, render) { aba = a; try { localStorage.setItem("corrida:temporada:aba", a); } catch {} render(); window.scrollTo?.({ top: 0 }); const b = document.querySelector(`.cx-aba[data-cx-aba="${a}"]`); b?.focus({ preventScroll: true }); }
function abrirMensagens() { const d = dialogo("cxMsgDlg", "cx-msgs"); d.innerHTML = `<form method="dialog"><button class="cx-dlg-x" aria-label="Fechar">✕</button></form>${ctxAtual?.caixaMensagens || ""}`; d.showModal(); }
// devolve true se o clique era desta tela
function clique(alvo, render) {
  if (root.CentralAnalise?.clique(alvo, render) || root.CentralContrato?.clique(alvo, render)) return true;
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
  if (!document.body.classList.contains("cx-on")) return;
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
  if (!document.body.classList.contains("cx-on") || document.hidden || !navigator.getGamepads) return;
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
root.Central = { html, depois, clique, sair, usarRender(fn) { renderAtual = fn; }, aba: () => aba, estatisticas };
})(window);
