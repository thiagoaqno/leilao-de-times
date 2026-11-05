// Corrida da Galera — a aba Análise da carreira: cada GP disputado, volta a volta, com os dados que o servidor anotou (corrida-analise.js, `resultado.analise`).
// Visão geral, Voltas, Estratégia e Telemetria, sempre comparando você com outro piloto. O gráfico tem linha cruzada e dica ao passar o mouse (`cxGraf`).
// GPs de saves antigos só têm o resultado final: a tela avisa e mostra o que há.
(function (root) {
const U = () => root.CentralUI, h = (v) => U().h(v);
const Reg = () => root.F1Temporada, Pil = () => root.F1Pilotos, F = () => root.F1Regras;
let sub = "visao", gpEscolhido = null, comparar = null;
const SUBS = [["visao", "Visão geral"], ["voltas", "Voltas"], ["estrategia", "Estratégia"], ["telemetria", "Telemetria"]];

const tempo = (s) => (s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`);
const tempoLongo = (s) => { if (s == null) return "—"; const m = Math.floor(s / 60), hh = Math.floor(m / 60); return hh ? `${hh}:${String(m % 60).padStart(2, "0")}:${(s % 60).toFixed(3).padStart(6, "0")}` : tempo(s); };
const curtoEixo = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const sinal = (d) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(3)}`;
const LETRA = { macio: "S", medio: "M", duro: "H", chuva: "W", intermediario: "I" };
const corPneu = (c) => F()?.PNEUS?.[c]?.cor || "#888";
const nomePneu = (c) => F()?.PNEUS?.[c]?.nome || c;
const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const nomeDe = (id, s) => (id === "voce" ? s.nome : Pil().PILOTOS.find((p) => p.id === id)?.nome || id);
const sobrenome = (n) => String(n || "").trim().split(/\s+/).at(-1).toUpperCase();
function stints(d, voltas) {
  const fim = d.v?.length || voltas, lista = []; let de = 1, c = d.c0;
  for (const b of d.b || []) { const ate = Math.max(de, Math.min(fim, b.v || de)); lista.push({ c, de, ate, n: ate - de + 1 }); de = ate + 1; c = b.c; }
  if (de <= fim) lista.push({ c, de, ate: fim, n: fim - de + 1 });
  return lista;
}
// as voltas "de verdade", sem as do safety car e as de box: o ritmo limpo
const voltasLimpas = (d, a) => (d.v || []).filter((_, i) => !(a.sc || []).includes(i + 1) && !(d.b || []).some((b) => b.v === i + 1));
const desvio = (l) => { const m = media(l); return l.length > 1 ? Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length) : 0; };

function escolhas(c) {
  const gps = c.gps, r = gps.find((g) => g.gp === gpEscolhido) || gps.at(-1), a = r?.analise || null, pil = a?.pilotos || {};
  // o padrão de comparação: o rival da temporada; senão, o carro mais perto de você na chegada
  let rival = comparar && pil[comparar] ? comparar : null;
  if (!rival && a) { const eu = r.linhas.find((l) => l.piloto === "voce"); const perto = r.linhas.filter((l) => l.piloto !== "voce" && pil[l.piloto]?.v?.length).sort((x, y) => Math.abs(x.pos - eu.pos) - Math.abs(y.pos - eu.pos))[0]; rival = (c.rival && pil[c.rival.id]?.v?.length) ? c.rival.id : perto?.piloto || null; }
  return { r, a, rival };
}

// ---------- o gráfico do ritmo ----------
function graficoRitmo(a, eu, ou, nomeEu, nomeOu) {
  const W = 760, H = 210, m = { e: 46, d: 12, t: 26, b: 26 }, n = Math.max(eu.v.length, ou?.v.length || 0, 1);
  const todos = [...eu.v, ...(ou?.v || [])]; const lo = Math.min(...todos), hi = Math.max(...todos), folga = Math.max(0.4, (hi - lo) * 0.08), y0 = lo - folga, y1 = hi + folga;
  const x = (v) => m.e + (n > 1 ? (v - 1) / (n - 1) : 0.5) * (W - m.e - m.d), y = (t) => m.t + (1 - (t - y0) / (y1 - y0)) * (H - m.t - m.b);
  const linha = (l) => l.map((t, i) => `${x(i + 1).toFixed(1)},${y(t).toFixed(1)}`).join(" ");
  const ticksY = Array.from({ length: 5 }, (_, i) => y0 + (y1 - y0) * i / 4);
  const passoX = Math.max(1, Math.ceil(n / 8)), ticksX = []; for (let v = 1; v <= n; v += passoX) ticksX.push(v); if (ticksX.at(-1) !== n) ticksX.push(n);
  // o safety car: faixas seguidas de voltas
  const faixas = []; for (const v of [...(a.sc || [])].sort((p, q) => p - q)) { const u = faixas.at(-1); if (u && u[1] === v - 1) u[1] = v; else faixas.push([v, v]); }
  const larg = (W - m.e - m.d) / Math.max(1, n - 1);
  const sc = faixas.map(([p, q]) => { const xa = Math.max(m.e, x(p) - larg / 2), xb = Math.min(W - m.d, x(q) + larg / 2); return `<rect class="sc" x="${xa.toFixed(1)}" y="${m.t}" width="${(xb - xa).toFixed(1)}" height="${H - m.t - m.b}"/><g class="sc-rot" transform="translate(${((xa + xb) / 2).toFixed(1)} ${m.t - 8})"><rect x="-32" y="-10" width="64" height="16" rx="3"/><text text-anchor="middle" y="2">Safety car</text></g>`; }).join("");
  const box = (eu.b || []).map((b) => { const t = eu.v[(b.v || 1) - 1]; if (t == null) return ""; const px = x(b.v), py = y(t), ey = Math.max(m.t + 8, py - 18); return `<g class="box-rot"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4"/><g transform="translate(${px.toFixed(1)} ${ey.toFixed(1)})"><rect x="-27" y="-9" width="54" height="15" rx="3"/><text text-anchor="middle" y="2">Box • V${b.v}</text></g></g>`; }).join("");
  const mi = eu.v.indexOf(Math.min(...eu.v)), melhor = mi >= 0 ? `<g class="melhor-rot"><circle cx="${x(mi + 1).toFixed(1)}" cy="${y(eu.v[mi]).toFixed(1)}" r="4.5"/><g transform="translate(${Math.min(W - 44, Math.max(m.e + 34, x(mi + 1))).toFixed(1)} ${Math.max(m.t + 8, y(eu.v[mi]) - 14).toFixed(1)})"><rect x="-32" y="-10" width="64" height="16" rx="3"/><text text-anchor="middle" y="2">${tempo(eu.v[mi])}</text></g></g>` : "";
  const dados = JSON.stringify({ n, eu: eu.v, ou: ou?.v || [], a: nomeEu, b: nomeOu, sc: a.sc || [], box: (eu.b || []).map((b) => b.v) }).replace(/"/g, "&quot;");
  return `<div class="cx-graf" data-cx-graf="${dados}" data-e="${m.e}" data-d="${m.d}" data-w="${W}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tempo de cada volta de ${h(nomeEu)}${ou ? ` e de ${h(nomeOu)}` : ""}">
    ${ticksY.map((t) => `<line class="grade" x1="${m.e}" x2="${W - m.d}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="eixo" x="${m.e - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${curtoEixo(t)}</text>`).join("")}
    ${ticksX.map((v) => `<line class="grade v" x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${m.t}" y2="${H - m.b}"/><text class="eixo" x="${x(v).toFixed(1)}" y="${H - m.b + 14}" text-anchor="middle">${v}</text>`).join("")}
    ${sc}${ou ? `<polyline class="serie ou" points="${linha(ou.v)}"/>` : ""}<polyline class="serie eu" points="${linha(eu.v)}"/>${box}${melhor}
    <line class="mira" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="display:none"/><circle class="mira-a" r="4" style="display:none"/><circle class="mira-b" r="4" style="display:none"/></svg><div class="cx-dica" hidden></div></div>`;
}
function ligarGraficos() {
  document.querySelectorAll("[data-cx-graf]").forEach((g) => {
    if (g._ligado) return; g._ligado = true;
    const d = JSON.parse(g.dataset.cxGraf), svg = g.querySelector("svg"), mira = svg.querySelector(".mira"), dica = g.querySelector(".cx-dica"), W = +g.dataset.w, E = +g.dataset.e, D = +g.dataset.d, pts = (l) => l.getAttribute("points")?.split(" ").map((p) => p.split(",").map(Number)) || [];
    const a = pts(svg.querySelector(".serie.eu")), b = svg.querySelector(".serie.ou") ? pts(svg.querySelector(".serie.ou")) : [], ca = svg.querySelector(".mira-a"), cb = svg.querySelector(".mira-b");
    const mostrar = (cx) => {
      const r = svg.getBoundingClientRect(), vx = (cx - r.left) / r.width * W, v = Math.max(1, Math.min(d.n, Math.round(d.n > 1 ? (vx - E) / (W - E - D) * (d.n - 1) + 1 : 1))), i = v - 1, px = E + (d.n > 1 ? i / (d.n - 1) : 0.5) * (W - E - D);
      mira.style.display = ""; mira.setAttribute("x1", px); mira.setAttribute("x2", px);
      const pon = (c, p) => { if (p) { c.style.display = ""; c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); } else c.style.display = "none"; }; pon(ca, a[i]); pon(cb, b[i]);
      const dif = d.eu[i] != null && d.ou[i] != null ? d.eu[i] - d.ou[i] : null, marcas = [d.sc.includes(v) ? "Safety car" : "", d.box.includes(v) ? "Box" : ""].filter(Boolean).join(" • ");
      dica.innerHTML = `<b>Volta ${v}${marcas ? ` • ${h(marcas)}` : ""}</b><span><i class="eu"></i>${h(d.a)}<em>${tempo(d.eu[i])}</em></span>${d.ou.length ? `<span><i class="ou"></i>${h(d.b)}<em>${tempo(d.ou[i])}</em></span>` : ""}${dif != null ? `<small class="${dif < 0 ? "cx-verde" : "cx-verm"}">${sinal(dif)} s</small>` : ""}`;
      dica.hidden = false; const pct = px / W; dica.style.left = pct > 0.6 ? "" : `${pct * 100 + 2}%`; dica.style.right = pct > 0.6 ? `${(1 - pct) * 100 + 2}%` : "";
    };
    g.addEventListener("pointermove", (e) => mostrar(e.clientX), { passive: true });
    g.addEventListener("pointerleave", () => { mira.style.display = "none"; ca.style.display = "none"; cb.style.display = "none"; dica.hidden = true; });
  });
}

// ---------- Visão geral ----------
function evolucaoSvg(d, pos) {
  const pts = [d.g || pos, ...(d.p || [])], W = 240, H = 100, maxP = Math.max(...pts, 3), minP = Math.min(...pts, 1), x = (i) => 24 + i / Math.max(1, pts.length - 1) * (W - 34), y = (p) => 8 + (p - minP) / Math.max(1, maxP - minP) * (H - 30);
  let trilha = `M${x(0).toFixed(1)} ${y(pts[0]).toFixed(1)}`; pts.slice(1).forEach((p, i) => { trilha += `H${x(i + 1).toFixed(1)}V${y(p).toFixed(1)}`; });
  const rot = [...new Set([minP, maxP])];
  return `<svg class="cx-evolucao" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sua posição da largada à chegada">${rot.map((p) => `<text class="eixo" x="18" y="${(y(p) + 3).toFixed(1)}" text-anchor="end">${p}º</text><line class="grade" x1="24" x2="${W - 8}" y1="${y(p).toFixed(1)}" y2="${y(p).toFixed(1)}"/>`).join("")}<path class="trilha" d="${trilha}"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="${i === 0 || i === pts.length - 1 ? 4 : 2.2}"><title>${i ? `Volta ${i}` : "Largada"}: ${p}º</title></circle>`).join("")}<text class="eixo" x="24" y="${H - 4}">Largada</text><text class="eixo" x="${W - 8}" y="${H - 4}" text-anchor="end">Chegada</text></svg>`;
}
function setores(eu, ou, nomeEu, nomeOu) {
  if (!eu.s || !ou?.s) return '<p class="cx-vazio">Sem os setores destes dois pilotos neste GP.</p>';
  const max = Math.max(...eu.s, ...ou.s);
  return `<div class="cx-setores">${[0, 1, 2].map((i) => { const d = eu.s[i] - ou.s[i]; return `<div class="cx-setor"><b>Setor ${i + 1}</b><div class="cx-setor-b"><i class="eu" style="width:${eu.s[i] / max * 100}%"></i><i class="ou" style="width:${ou.s[i] / max * 100}%"></i></div><div class="cx-setor-t"><span>${eu.s[i].toFixed(3)}</span><span>${ou.s[i].toFixed(3)}</span></div><em class="${d <= 0 ? "bom" : "ruim"}">${sinal(d)}</em></div>`; }).join("")}</div>`;
}
function visao(c, r, a, rival) {
  const s = c.s, eu = a.pilotos.voce, ou = a.pilotos[rival], l = r.linhas.find((x) => x.piloto === "voce"), pos = l?.pos || 0;
  const nomeEu = sobrenome(s.nome), nomeOu = sobrenome(nomeDe(rival, s));
  const melhor = eu.v.length ? Math.min(...eu.v) : null, ritmo = media(eu.v);
  const todas = Object.entries(a.pilotos).flatMap(([id, d]) => (d.v || []).map((t) => ({ id, t }))), maisRapida = todas.reduce((m, x) => (!m || x.t < m.t ? x : m), null), minhaERecorde = maisRapida?.id === "voce";
  const ganho = eu.g ? eu.g - pos : 0;
  const resultado = l?.dnf ? "DNF" : l?.nc ? "NC" : `${pos}º`;
  const est = stints(eu, a.voltas), totalV = eu.v.length || a.voltas, parada = eu.b || [];
  const seguroC = a.safeties || 0;
  const UI = U();
  const stat = (titulo, valor, sub2, ic, cls = "") => `<section class="cx-card cx-stat ${cls}">${UI.tituloCard(titulo)}<div class="cx-stat-corpo"><b>${valor}</b><small>${sub2}</small></div><span class="cx-stat-ic" aria-hidden="true">${ic}</span></section>`;
  return `<div class="cx-an-stats">
      ${stat("Resultado", `<span class="${pos === 1 ? "cx-verde" : ""}">${resultado}</span>`, eu.g ? `Largou em ${eu.g}º${ganho ? ` • ${ganho > 0 ? "+" : ""}${ganho} ${Math.abs(ganho) === 1 ? "posição" : "posições"}` : ""}` : `${l?.pontos || 0} pontos`, IC.louros)}
      ${stat("Tempo total", tempoLongo(eu.t), `${eu.v.length} ${eu.v.length === 1 ? "volta concluída" : "voltas concluídas"}${eu.a ? ` • +${eu.a} s de punição` : ""}`, IC.xadrez)}
      ${stat("Sua melhor volta", `<span class="${minhaERecorde ? "cx-roxo" : ""}">${tempo(melhor)}</span>`, eu.mv ? `Volta ${eu.mv}` : "—", IC.crono)}
      ${stat("Ritmo médio", tempo(ritmo), `Média das ${eu.v.length} voltas`, IC.medidor)}
    </div>
    <div class="cx-an-meio"><section class="cx-card cx-ritmo"><div class="cx-ritmo-topo">${UI.tituloCard("Ritmo de corrida")}<div class="cx-legenda"><span><i class="eu"></i>${h(nomeEu)}</span>${ou ? `<span><i class="ou"></i>${h(nomeOu)}</span>` : ""}</div></div>${eu.v.length ? graficoRitmo(a, eu, ou, nomeEu, nomeOu) : '<p class="cx-vazio">Você não completou nenhuma volta neste GP.</p>'}<p class="cx-nota-g">Tempo de cada volta • inclui voltas de box e safety car • passe o mouse para ver os números</p></section>
      <section class="cx-card cx-comp">${UI.tituloCard("Comparação por setor", "Melhor volta de cada piloto")}<div class="cx-comp-vs"><span class="eu">${h(nomeEu)}</span><i>×</i>${seletor(a, rival, r, s)}</div>${setores(eu, ou, nomeEu, nomeOu)}${maisRapida ? `<div class="cx-faixa-roxa">${IC.taca}<b>Melhor volta da corrida</b><span>${h(sobrenome(nomeDe(maisRapida.id, s)))} • ${tempo(maisRapida.t)}</span></div>` : ""}</section></div>
    <div class="cx-an-baixo"><section class="cx-card cx-pneus">${UI.tituloCard("Estratégia de pneus")}<div class="cx-stint-eixo"><span>V1</span>${est.slice(0, -1).map((x) => `<span style="left:${x.ate / totalV * 100}%">V${x.ate}</span>`).join("")}<span class="fim">V${totalV}</span></div><div class="cx-stints">${est.map((x) => `<div class="cx-stint" style="flex:${x.n};--c:${h(corPneu(x.c))}" title="${h(nomePneu(x.c))}: voltas ${x.de} a ${x.ate}"><b>${LETRA[x.c] || "?"}</b><span>${LETRA[x.c] || "?"} • ${x.n} ${x.n === 1 ? "volta" : "voltas"}</span></div>`).join("")}</div><div class="cx-pneus-info"><span>${parada.length} ${parada.length === 1 ? "parada" : "paradas"}</span>${parada.length ? `<span>Box na volta ${parada.map((b) => b.v).join(", ")}</span><span>Tempo no pit lane <b>${media(parada.map((b) => b.t)).toFixed(1)} s</b></span>` : "<span>Sem passar no box</span>"}</div></section>
      <section class="cx-card cx-evo">${UI.tituloCard("Evolução na corrida")}<div class="cx-evo-corpo">${evolucaoSvg(eu, pos)}<div class="cx-evo-res"><b>${eu.g || "—"}º</b>${U().seta}<b>${pos}º</b></div></div></section>
      <section class="cx-card cx-cond">${UI.tituloCard("Condições da prova")}<div class="cx-cond-corpo"><div class="cx-cond-ic">${a.chuva ? IC.chuva : IC.sol}<b>${a.chuva ? "Com chuva" : "Pista seca"}</b></div><ul><li><span>Horário</span><b>${a.hora === "noite" ? "Noite" : "Dia"}</b></li><li><span>Safety car</span><b>${seguroC} ${seguroC === 1 ? "entrada" : "entradas"}</b></li><li><span>Bandeiras amarelas</span><b>${a.amarelas || 0}</b></li><li><span>Suas punições</span><b>${eu.a ? `${eu.a} s` : "0 s"}</b></li></ul></div></section></div>`;
}
function seletor(a, rival, r, s) {
  const ops = r.linhas.slice().sort((x, y) => x.pos - y.pos).filter((l) => l.piloto !== "voce" && a.pilotos[l.piloto]?.v?.length).map((l) => `<option value="${h(l.piloto)}" ${l.piloto === rival ? "selected" : ""}>${l.pos}º ${h(sobrenome(nomeDe(l.piloto, s)))}</option>`).join("");
  return `<label class="cx-sel cx-sel-mini"><span class="cx-oculto">Comparar com</span><select data-cx-comparar>${ops}</select></label>`;
}

// ---------- Voltas ----------
function voltas(c, r, a, rival) {
  const eu = a.pilotos.voce, ou = a.pilotos[rival], s = c.s, UI = U(), melhor = Math.min(...eu.v), melhorS = [0, 1, 2].map((k) => Math.min(...(eu.sv || []).filter(Boolean).map((x) => x[k]), Infinity));
  const est = stints(eu, a.voltas), pneuDa = (v) => est.find((x) => v >= x.de && v <= x.ate)?.c;
  const linhas = eu.v.map((t, i) => { const v = i + 1, sv = eu.sv?.[i], d = ou?.v?.[i] != null ? t - ou.v[i] : null, c0 = pneuDa(v), marcas = [(a.sc || []).includes(v) ? '<em class="sc">SC</em>' : "", (eu.b || []).some((b) => b.v === v) ? '<em class="bx">Box</em>' : ""].join(""); return `<tr class="${t === melhor ? "melhor" : ""}"><td class="n">${v}</td><td class="t">${tempo(t)}${marcas}</td>${[0, 1, 2].map((k) => `<td class="${sv && sv[k] === melhorS[k] ? "cx-roxo" : ""}">${sv ? sv[k].toFixed(3) : "—"}</td>`).join("")}<td>${eu.p?.[i] ? `${eu.p[i]}º` : "—"}</td><td><span class="cx-bola" style="--c:${h(corPneu(c0))}" title="${h(nomePneu(c0))}">${LETRA[c0] || "?"}</span></td><td class="${d == null ? "" : d < 0 ? "cx-verde" : "cx-verm"}">${d == null ? "—" : sinal(d)}</td></tr>`; }).join("");
  return `<section class="cx-card cx-an-voltas">${UI.tituloCard("Volta a volta", `Comparando com ${h(sobrenome(nomeDe(rival, s)))}`)}<div class="cx-an-filtro">${seletor(a, rival, r, s)}</div><div class="cx-t-rolo"><table><thead><tr><th>Volta</th><th>Tempo</th><th>S1</th><th>S2</th><th>S3</th><th>Pos</th><th>Pneu</th><th>Dif.</th></tr></thead><tbody>${linhas || '<tr><td colspan="8">Nenhuma volta completa.</td></tr>'}</tbody></table></div></section>`;
}

// ---------- Estratégia ----------
function estrategia(c, r, a) {
  const s = c.s, UI = U(), linhas = r.linhas.slice().sort((x, y) => x.pos - y.pos).map((l) => {
    const d = a.pilotos[l.piloto]; if (!d) return "";
    const est = stints(d, a.voltas), tot = est.reduce((m, x) => m + x.n, 0) || 1, eq = Pil().EQUIPES[l.equipe];
    return `<li class="${l.piloto === "voce" ? "eu" : ""}"><span class="p">${l.dnf ? "DNF" : l.nc ? "NC" : `${l.pos}º`}</span><i class="f" style="--c:${h(eq?.cor || "#fff")}"></i><b>${h(sobrenome(nomeDe(l.piloto, s)))}</b><div class="cx-stints mini">${est.map((x) => `<div class="cx-stint" style="flex:${x.n / tot};--c:${h(corPneu(x.c))}" title="${h(nomePneu(x.c))}: voltas ${x.de} a ${x.ate}"><span>${x.n}</span></div>`).join("")}</div><em>${(d.b || []).length} ${(d.b || []).length === 1 ? "parada" : "paradas"}</em></li>`;
  }).join("");
  const legenda = [...new Set(Object.values(a.pilotos).flatMap((d) => [d.c0, ...(d.b || []).map((b) => b.c)]).filter(Boolean))].map((k) => `<span><i class="cx-bola" style="--c:${h(corPneu(k))}">${LETRA[k] || "?"}</i>${h(nomePneu(k))}</span>`).join("");
  return `<section class="cx-card cx-an-estr">${UI.tituloCard("Estratégia do grid", "Voltas em cada jogo de pneus")}<div class="cx-legenda pneus">${legenda}</div><ol>${linhas}</ol></section>`;
}

// ---------- Telemetria: distância para o líder, volta ideal e constância ----------
function telemetria(c, r, a, rival) {
  const s = c.s, UI = U(), eu = a.pilotos.voce, ou = a.pilotos[rival], nomeEu = sobrenome(s.nome), nomeOu = sobrenome(nomeDe(rival, s));
  const ideal = (d) => { const l = (d?.sv || []).filter(Boolean); return l.length ? [0, 1, 2].reduce((m, k) => m + Math.min(...l.map((x) => x[k])), 0) : null; };
  const lider = r.linhas.slice().sort((x, y) => x.pos - y.pos)[0], dL = a.pilotos[lider?.piloto];
  const acum = (l) => { let t = 0; return l.map((v) => (t += v)); };
  const gEu = dL ? acum(eu.v).map((t, i) => t - (acum(dL.v)[i] ?? t)) : [], gOu = dL && ou ? acum(ou.v).map((t, i) => t - (acum(dL.v)[i] ?? t)) : [];
  const W = 760, H = 210, m = { e: 46, d: 12, t: 12, b: 26 }, n = Math.max(gEu.length, gOu.length, 1), tudo = [...gEu, ...gOu, 0], lo = Math.min(...tudo), hi = Math.max(...tudo, lo + 1);
  const x = (v) => m.e + (n > 1 ? v / (n - 1) : 0.5) * (W - m.e - m.d), y = (t) => m.t + (t - lo) / (hi - lo) * (H - m.t - m.b), pol = (l) => l.map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(" ");
  const tY = Array.from({ length: 4 }, (_, i) => lo + (hi - lo) * i / 3);
  const lim = (d) => { const l = voltasLimpas(d, a); return { ritmo: media(l), desvio: desvio(l), n: l.length }; }, lEu = lim(eu), lOu = ou ? lim(ou) : null, iEu = ideal(eu), iOu = ideal(ou);
  const cartao = (titulo, a1, b1, sub2, melhorEu) => `<div class="cx-tele"><small>${titulo}</small><div><span class="${melhorEu ? "cx-verde" : ""}"><i class="eu"></i>${a1}</span>${b1 != null ? `<span><i class="ou"></i>${b1}</span>` : ""}</div><em>${sub2}</em></div>`;
  return `<div class="cx-an-tele"><section class="cx-card">${UI.tituloCard("Distância para o líder", `Segundos atrás de ${h(sobrenome(nomeDe(lider?.piloto, s)))} no fim de cada volta`)}<div class="cx-an-filtro"><div class="cx-legenda"><span><i class="eu"></i>${h(nomeEu)}</span>${ou ? `<span><i class="ou"></i>${h(nomeOu)}</span>` : ""}</div>${seletor(a, rival, r, s)}</div><div class="cx-graf"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distância para o líder em cada volta">${tY.map((t) => `<line class="grade" x1="${m.e}" x2="${W - m.d}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="eixo" x="${m.e - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${t > 0 ? "+" : ""}${t.toFixed(1)}</text>`).join("")}${gEu.map((_, i) => (n <= 12 || i % Math.ceil(n / 8) === 0 ? `<text class="eixo" x="${x(i).toFixed(1)}" y="${H - m.b + 14}" text-anchor="middle">${i + 1}</text>` : "")).join("")}${gOu.length ? `<polyline class="serie ou" points="${pol(gOu)}"/>` : ""}<polyline class="serie eu" points="${pol(gEu)}"/>${gEu.map((t, i) => `<circle class="ponto" cx="${x(i).toFixed(1)}" cy="${y(t).toFixed(1)}" r="3.5"><title>Volta ${i + 1}: ${t >= 0 ? "+" : ""}${t.toFixed(3)} s</title></circle>`).join("")}</svg></div></section>
    <section class="cx-card cx-teles">${UI.tituloCard("Números da corrida", "Sem contar voltas de box e safety car")}${cartao("Volta ideal", tempo(iEu), iOu != null ? tempo(iOu) : null, "A soma dos seus melhores setores", iEu != null && iOu != null && iEu <= iOu)}${cartao("Ritmo limpo", tempo(lEu.ritmo), lOu ? tempo(lOu.ritmo) : null, `Média de ${lEu.n} ${lEu.n === 1 ? "volta" : "voltas"}`, lOu && lEu.ritmo <= lOu.ritmo)}${cartao("Constância", `±${lEu.desvio.toFixed(3)}`, lOu ? `±${lOu.desvio.toFixed(3)}` : null, "Quanto menor, mais igual é cada volta", lOu && lEu.desvio <= lOu.desvio)}${cartao("Volta ideal × sua melhor", iEu != null ? sinal(iEu - Math.min(...eu.v)) : "—", null, "O que ainda dava para tirar", false)}</section></div>`;
}

// ---------- a aba ----------
const IC = {
  louros: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M32 56C18 52 9 42 9 26l2-.4c0 14 8 24 21 28.4 13-4.4 21-14.4 21-28.4l2 .4c0 16-9 26-23 30ZM9 26c-3-4-3-8-1-12 3 3 4 8 1 12ZM12 37c-5-2-7-6-7-11 4 2 7 6 7 11ZM18 46c-5 0-9-3-11-7 5-1 9 2 11 7ZM27 53c-5 2-9 0-13-3 5-2 10-1 13 3ZM55 26c3-4 3-8 1-12-3 3-4 8-1 12ZM52 37c5-2 7-6 7-11-4 2-7 6-7 11ZM46 46c5 0 9-3 11-7-5-1-9 2-11 7ZM37 53c5 2 9 0 13-3-5-2-10-1-13 3Z"/></svg>',
  xadrez: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M12 58 20 8"/><path fill="currentColor" d="M20 8h8l-1 8h-8ZM36 8h8l-1 8h-8ZM52 10l-1 8-8-2 1-8ZM27 16h8l-1 8h-8ZM43 16h8l-1 8h-8ZM18 24h8l-1 8h-8ZM34 24h8l-1 8h-8Z"/></svg>',
  crono: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="36" r="21"/><path d="M26 6h12M32 6v9M50 17l4 4M32 24v12l8 6"/></svg>',
  medidor: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M10 46a24 24 0 1 1 44 0"/><path d="M32 38l12-16M32 14v5M12 32h5M47 32h5"/></svg>',
  taca: '<svg class="cx-taca" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h10v2h4v3a4 4 0 0 1-4 4h-.6A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 7.600 12H7a4 4 0 0 1-4-4V5h4Zm0 4H5v1a2 2 0 0 0 2 2Zm10 3a2 2 0 0 0 2-2V7h-2Z"/></svg>',
  sol: '<svg class="cx-cond-svg" viewBox="0 0 48 48" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="9"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/></svg>',
  chuva: '<svg class="cx-cond-svg" viewBox="0 0 48 48" fill="none" stroke="#8fc7ff" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M14 30a8 8 0 0 1 0-16 11 11 0 0 1 21 3 7 7 0 0 1-1 13Z"/><path d="M16 36l-2 6M26 36l-2 6M36 36l-2 6"/></svg>',
};
function html(c) {
  const s = c.s, UI = U();
  if (!c.gps.length) return `<div class="cx-cabeca compacta"><div class="cx-cab-tit"><i aria-hidden="true"></i><div class="cx-cab-linha"><h2>Análise da corrida</h2></div></div></div><section class="cx-card cx-an-vazio">${IC.medidor}<h3>Nenhum GP disputado nesta temporada</h3><p>Depois da primeira corrida, os tempos de cada volta, os setores, a estratégia e a sua evolução aparecem aqui.</p><button type="button" class="cx-contorno" data-cx-aba="calendario">Ver o calendário ${UI.seta}</button></section>`;
  const { r, a, rival } = escolhas(c), g = s.calendario[r.gp];
  const opcoes = c.gps.map((x) => `<option value="${x.gp}" ${x.gp === r.gp ? "selected" : ""}>${h(s.calendario[x.gp]?.nome || x.pista)}</option>`).join("");
  const topo = `<div class="cx-cabeca compacta"><div class="cx-cab-tit"><i aria-hidden="true"></i><div class="cx-cab-linha"><h2>Análise da corrida</h2><small>${h(UI.nomeGP(r.pista, g?.nome))} • Etapa ${UI.dois(r.gp + 1)} / ${UI.dois(s.tamanho)}</small></div>${UI.tricolor()}</div><label class="cx-sel">${UI.bandeira(r.pista)}<span class="cx-oculto">Escolher o GP</span><select data-cx-gp>${opcoes}</select></label></div>`;
  if (!a) return `${topo}<section class="cx-card cx-an-vazio">${IC.crono}<h3>Este GP foi corrido antes da análise</h3><p>Só há o resultado final dele. Os próximos GPs já trazem as voltas, os setores e a estratégia.</p></section>`;
  const abas = `<div class="cx-dv-abas cx-an-abas">${SUBS.map(([id, nome]) => `<button type="button" class="${id === sub ? "on" : ""}" aria-pressed="${id === sub}" data-cx-an="${id}">${nome}</button>`).join("")}</div>`;
  const corpo = sub === "voltas" ? voltas(c, r, a, rival) : sub === "estrategia" ? estrategia(c, r, a) : sub === "telemetria" ? telemetria(c, r, a, rival) : visao(c, r, a, rival);
  return `${topo}${abas}<div class="cx-an-corpo">${corpo}</div>`;
}
function clique(b, render) { if (b.dataset.cxAn) { sub = b.dataset.cxAn; render(); document.querySelector(`[data-cx-an="${sub}"]`)?.focus({ preventScroll: true }); return true; } return false; }
function mudou(e, render) {
  if (e.target.matches?.("[data-cx-gp]")) { gpEscolhido = +e.target.value; comparar = null; render(); return true; }
  if (e.target.matches?.("[data-cx-comparar]")) { comparar = e.target.value; render(); return true; }
  return false;
}
root.CentralAnalise = { html, clique, mudou, ligarGraficos };
})(window);
