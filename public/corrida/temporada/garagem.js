// Corrida da Galera — a garagem do modo carreira (visual): abas, painel da equipe com os atributos, calendário com bandeiras,
// o carro 3D no centro e a distribuição livre de pontos. A sala F1 também usa este arquivo para a antiga tela de peças.
// As contas estão em f1-equipes.js e f1-pecas.js (o servidor confere tudo de novo). Usado pela temporada solo (sede.js), pela em grupo
// (grupo.js) e pela sala de F1 (menus.js). Estilo inspirado em jogos de gestão de F1, sem copiar marca nenhuma.
(function (root) {
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const P = () => root.F1Pecas, E = () => root.F1Equipes, FP = () => root.F1Pilotos;

// ---------- as abas ----------
const ABAS = [["geral", "Visão geral"], ["carro", "Carro · Pontos"], ["classif", "Classificação"], ["equipe", "Equipe"]];
let aba = "geral";
const abaAtual = () => aba;
const definirAba = (a) => { if (ABAS.some((x) => x[0] === a)) aba = a; };
const abasHTML = () => `<nav class="abas" role="tablist" aria-label="Seções da carreira">${ABAS.map(([id, nome]) => `<button role="tab" class="aba ${id === aba ? "on" : ""}" data-aba="${id}" aria-selected="${id === aba}">${nome}</button>`).join("")}</nav>`;

// ---------- ícones (traço simples) e bandeiras ----------
const IC = {
  reta: "M3 12h15M13 6l6 6-6 6", acc: "M13 2 4 14h7l-1 8 9-12h-7z", curva: "M4 20c0-8 6-12 16-12M16 4l4 4-4 4",
  freio: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", resist: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  confiab: "M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
};
const icone = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k] || IC.reta}"/></svg>`;
const BAND = {
  melbourne: '<rect width="24" height="16" fill="#12308f"/><circle cx="7" cy="11" r="2.2" fill="#fff"/><circle cx="17" cy="5" r="1.2" fill="#fff"/><circle cx="19" cy="10" r="1.2" fill="#fff"/><rect width="10" height="6" fill="#0a2275"/>',
  suzuka: '<rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.6" fill="#d8142c"/>',
  monaco: '<rect width="24" height="8" fill="#d8142c"/><rect y="8" width="24" height="8" fill="#fff"/>',
  silverstone: '<rect width="24" height="16" fill="#1d3a8a"/><path d="M0 0l24 16M24 0 0 16" stroke="#fff" stroke-width="3"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5"/><path d="M12 0v16M0 8h24" stroke="#d8142c" stroke-width="2.6"/>',
  spa: '<rect width="8" height="16" fill="#111"/><rect x="8" width="8" height="16" fill="#f7d417"/><rect x="16" width="8" height="16" fill="#d8142c"/>',
  monza: '<rect width="8" height="16" fill="#1f9d55"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#d8142c"/>',
  austin: '<rect width="24" height="16" fill="#fff"/><path d="M0 1h24M0 5h24M0 9h24M0 13h24" stroke="#d8142c" stroke-width="2"/><rect width="11" height="9" fill="#26357a"/>',
  interlagos: '<rect width="24" height="16" fill="#139a43"/><path d="M12 2l9 6-9 6-9-6z" fill="#f7d417"/><circle cx="12" cy="8" r="3.3" fill="#26357a"/>',
};
const bandeira = (pista) => `<svg class="bandeira" viewBox="0 0 24 16" width="26" height="17" aria-hidden="true">${BAND[pista] || '<rect width="24" height="16" fill="#555"/><path d="M0 0h12v8H0zM12 8h12v8H12z" fill="#ddd"/>'}</svg>`;

// ---------- o painel da equipe: logo, nota do carro e os atributos ----------
const FICHA = { reta: "Reta", acc: "Aceleração", curva: "Curva", freio: "Freio", resist: "Resistência", confiab: "Confiabilidade" };
function specDe(equipeId, montagem) { return E().specDaEquipe(equipeId, montagem); }
function notaGeral(ficha) { return Math.round(ficha.reduce((s, f) => s + f.nota, 0) / ficha.length * 10); }
function painelEquipe(equipeId, montagem, extra = "") {
  const eq = FP().EQUIPES[equipeId], spec = specDe(equipeId, montagem), ficha = E().ficha(spec);
  return `<aside class="pn-equipe" style="--eq:${h(eq.cor)}"><div class="pn-logo"><img src="/api/corrida/logo/${encodeURIComponent(equipeId)}" alt="" onerror="this.style.display='none'"><b>${h(eq.nome)}</b></div>
    <div class="pn-nota"><strong class="num">${notaGeral(ficha)}</strong><small>Nível do carro</small></div>
    <ul class="pn-attr">${ficha.map((f) => `<li title="${h(FICHA[f.id] || f.rotulo)}">${icone(f.id)}<span>${h(f.rotulo)}</span><i class="barra"><u style="width:${f.nota * 10}%"></u></i><b class="num">${f.nota}</b></li>`).join("")}</ul>${extra}</aside>`;
}

// ---------- o calendário (à direita) com bandeiras e o botão Continuar ----------
function calendario(cal, gp, titulo = "Calendário", rotuloProx = "", previsao = null) {
  const fim = gp >= cal.length;
  return `<ol class="cal" aria-label="${h(titulo)}">${cal.map((e, i) => `<li class="${i < gp ? "feita" : i === gp ? "atual" : ""}"><span class="n num">${String(i + 1).padStart(2, "0")}</span>${bandeira(e.pista)}<b>${h(e.nome)}${i === gp && !fim && previsao && root.PrevisaoUI ? root.PrevisaoUI.html(previsao, { compacto: true, titulo: "Previsão" }) : ""}</b><em>${i < gp ? "✓" : i === gp && !fim ? h(rotuloProx || "Próximo") : ""}</em></li>`).join("")}</ol>`;
}
const colunaDireita = ({ titulo, cal, gp, rotuloProx, botao, nota, previsao }) => `<aside class="pn-gp"><header><h2>${h(titulo || "Calendário")}</h2></header>${calendario(cal, gp, "Calendário", rotuloProx, previsao)}${nota ? `<p class="gp-nota">${nota}</p>` : ""}<div class="gp-acao">${botao}</div></aside>`;

// A previsão do tempo do GP da carreira: sai da mesma semente que o servidor usa ao abrir o box (`${semente}:${ano}:${gp}`), então a
// chuva que cai é a que foi prevista (F1Regras.previsaoDoGP). Sem as regras carregadas, null.
function previsaoDoGP(semente, ano, gp) { const F = root.F1Regras; return F && F.previsaoDoGP ? F.previsaoDoGP(`${semente}:${ano}:${gp}`) : null; }

// O traçado do próximo GP fica visível na sede antes de abrir a Q1 (solo e grupo), com a previsão do tempo para escolher o pneu.
function mapaGP(id, etapa, ativo = false, previsao = null, voltas = 0) {
  const pista = root.Pistas?.PISTAS[id]; if (!pista) return "";
  const pts = root.Pistas.pontos(pista, 18); if (!pts.length) return "";
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys), largura = Math.max(...xs) - x, altura = Math.max(...ys) - y;
  const margem = 90, caminho = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  const largada = pts[0], nome = h(pista.name);
  return `<section class="gp-mapa" aria-label="Mapa do circuito ${nome}"><div class="gp-mapa-info"><span class="gp-mapa-rotulo">Etapa ${etapa} · traçado da pista</span><h2>${nome}</h2><p>${ativo ? "Circuito do GP em andamento." : "Confira o circuito antes de abrir a Q1."}</p>${previsao && root.PrevisaoUI ? `<div class="prev-bloco">${root.PrevisaoUI.html(previsao, { voltas })}</div>` : ""}<span class="gp-mapa-legenda"><i></i>Largada e chegada</span></div>
    <div class="gp-mapa-desenho"><svg viewBox="${x - margem} ${y - margem} ${largura + margem * 2} ${altura + margem * 2}" role="img" aria-label="Traçado de ${nome}, com largada e chegada marcadas"><path class="gp-mapa-borda" d="${caminho}"/><path class="gp-mapa-linha" d="${caminho}"/><circle class="gp-mapa-marco" cx="${largada.x.toFixed(1)}" cy="${largada.y.toFixed(1)}" r="28"/><circle class="gp-mapa-centro" cx="${largada.x.toFixed(1)}" cy="${largada.y.toFixed(1)}" r="12"/></svg></div></section>`;
}

// ---------- o carro 3D, que fica no mesmo elemento entre as redesenhadas ----------
let palco = null, palcoEq = null, falhou3D = false;
function encaixar(equipeId) {
  const slot = document.querySelector(".palco-slot"); if (!slot) return;
  if (!palco || palcoEq !== equipeId) {
    if (palco && palco._parar) palco._parar();
    palco = document.createElement("div"); palco.className = "palco"; palcoEq = equipeId;
    palco.innerHTML = `<canvas aria-label="Seu carro de F1 em 3D" role="img"></canvas><span class="palco-msg">Carregando o carro…</span>`;
    if (!falhou3D) import("/corrida/temporada/car3d.js").then((m) => m.montar(palco, equipeId)).then(() => palco.classList.add("pronto")).catch((e) => { falhou3D = true; palco.classList.add("sem3d"); palco.querySelector(".palco-msg").textContent = ""; console.warn("carro 3D indisponível", e); });
  }
  slot.replaceWith(palco);
}
const palcoSlot = (eq) => `<div class="palco-slot" data-eq="${h(eq)}"></div>`;

// ---------- as peças: um cartão por peça, agrupadas por categoria, com a barra de orçamento ----------
const EFEITO_ROT = { motor: "Motor", aero: "Carga", chassi: "Leveza", freios: "Freio", suspensao: "Suspensão", confiab: "Confiab." };
function orcamentoBarra(usado, limite) {
  const resta = limite - usado, pct = Math.min(100, Math.round(usado / limite * 100));
  return `<div class="orc ${resta <= 0 ? "cheio" : resta <= 2 ? "apertado" : ""}"><div class="orc-txt"><span>Orçamento</span><b class="num">${usado} / ${limite} pts</b><em>${resta > 0 ? `Sobram ${resta}` : "Tudo usado"}</em></div><div class="orc-barra" role="img" aria-label="${usado} de ${limite} pontos usados"><u style="width:${pct}%"></u></div></div>`;
}
// opts: { equipe, bonus, pecas (a escolha), pode (quem pode mexer), motivo (por que não pode), aviso }
function pecasHTML(o) {
  const Pc = P(), eq = E().EQUIPES[o.equipe], limite = eq.orcamento + (o.bonus || 0), usado = Pc.custoDePecas(o.pecas), resta = limite - usado;
  const cats = Pc.CATEGORIAS.map((c) => {
    const atual = Pc.POR_ID[o.pecas[c.id]];
    const cartoes = c.pecas.map((p) => {
      const sel = atual && atual.id === p.id, extra = p.custo - (atual ? atual.custo : 0), cabe = extra <= resta;
      const efs = Object.entries(p.nivel).map(([k, v]) => `<i class="ef">+${v} ${EFEITO_ROT[k]}</i>`).join("");
      const bloqueada = !o.pode || (!sel && !cabe);
      return `<button class="peca-card ${sel ? "sel" : ""}" data-pcat="${c.id}" data-pid="${p.id}" aria-pressed="${sel}" ${bloqueada && !sel ? "disabled" : sel && !o.pode ? "disabled" : ""}><span class="pc-topo"><b>${h(p.nome)}</b><span class="custo num">${p.custo} <small>pts</small></span></span><small>${h(p.efeito)}</small><span class="efs">${efs}</span>${!sel && !cabe && o.pode ? `<em class="sem">Falta orçamento</em>` : sel ? `<em class="uso">Instalada</em>` : ""}</button>`;
    }).join("");
    return `<section class="pc-cat"><header><span class="ic" aria-hidden="true">${c.icone}</span><h3>${h(c.nome)}</h3><small>${atual ? h(atual.nome) : ""}</small></header><div class="pc-lista">${cartoes}</div></section>`;
  }).join("");
  const spec = specDe(o.equipe, Pc.montagemDePecas(o.pecas)), ficha = E().ficha(spec);
  return `<div class="pecas-tela">${orcamentoBarra(usado, limite)}${o.aviso ? `<p class="pc-aviso">${o.aviso}</p>` : ""}${!o.pode && o.motivo ? `<p class="pc-aviso trava">${h(o.motivo)}</p>` : ""}
    <div class="pc-corpo"><div class="pc-cats">${cats}</div>
    <aside class="pc-resumo"><h3>Resultado</h3><ul class="pn-attr">${ficha.map((f) => `<li>${icone(f.id)}<span>${h(f.rotulo)}</span><i class="barra"><u style="width:${f.nota * 10}%"></u></i><b class="num">${f.nota}</b></li>`).join("")}</ul>
    <p class="pc-dados">Velocidade final ${Math.round(spec.vmax)} · aceleração ${spec.acc.toFixed(0)} · freio ${Math.round(spec.brake)} · aderência ${Math.round(spec.grip)}<br>Quebra ${(spec.quebra * 100).toFixed(2).replace(/\.?0+$/, "")}% · DRS ×${spec.drs.toFixed(2)} · pneu ×${spec.desgaste.toFixed(2)}</p></aside></div></div>`;
}
// quem clica numa peça: devolve a nova escolha (ou null se o clique não é de peça)
function cliquePeca(botao, pecasAtuais) {
  const b = botao && botao.closest && botao.closest("[data-pcat]"); if (!b) return null;
  return { ...pecasAtuais, [b.dataset.pcat]: b.dataset.pid };
}

// Na carreira, cada ponto vai diretamente para um dos seis atributos. A validação definitiva é feita no servidor.
function pontosHTML(o) {
  const Eq = E(), montagem = o.montagem, limite = Eq.EQUIPES[o.equipe].orcamento + (o.bonus || 0);
  const usado = Eq.custoDaMontagem(montagem), ficha = Eq.ficha(specDe(o.equipe, montagem));
  const linhas = Eq.ORDEM.map((k) => {
    const p = Eq.PECAS[k], nivel = montagem[k];
    return `<section class="ponto-linha"><div class="ponto-info"><h3>${p.icone} ${h(p.nome)}</h3><p>${h(p.desc)}</p></div><div class="ponto-controles"><button type="button" data-ponto="${k}" data-delta="-1" aria-label="Diminuir ${h(p.nome)}" ${!o.pode || nivel <= 0 ? "disabled" : ""}>−</button><strong class="num" aria-label="Nível ${nivel} de ${Eq.MAX_NIVEL}">${nivel}<small>/${Eq.MAX_NIVEL}</small></strong><button type="button" data-ponto="${k}" data-delta="1" aria-label="Aumentar ${h(p.nome)}" ${!o.pode || nivel >= Eq.MAX_NIVEL || usado >= limite ? "disabled" : ""}>+</button></div></section>`;
  }).join("");
  return `<div class="pecas-tela pontos-tela">${orcamentoBarra(usado, limite)}<p class="pc-aviso">Distribua os pontos como quiser. Cada nível custa 1 ponto; você pode mudar a distribuição entre os GPs.</p>${!o.pode && o.motivo ? `<p class="pc-aviso trava">${h(o.motivo)}</p>` : ""}
    <div class="pc-corpo"><div class="pontos-lista">${linhas}<button type="button" class="zerar-pontos" data-ponto-zerar ${!o.pode || !usado ? "disabled" : ""}>Zerar distribuição</button></div>
    <aside class="pc-resumo"><h3>Resultado</h3><ul class="pn-attr">${ficha.map((f) => `<li>${icone(f.id)}<span>${h(f.rotulo)}</span><i class="barra"><u style="width:${f.nota * 10}%"></u></i><b class="num">${f.nota}</b></li>`).join("")}</ul></aside></div></div>`;
}
function cliquePonto(botao, montagem, equipe, bonus = 0) {
  const Eq = E();
  if (botao?.hasAttribute("data-ponto-zerar")) return Object.fromEntries(Eq.ORDEM.map((k) => [k, 0]));
  const k = botao?.dataset.ponto, delta = Number(botao?.dataset.delta);
  if (!Eq.ORDEM.includes(k) || ![-1, 1].includes(delta)) return null;
  const nivel = montagem[k] + delta, limite = Eq.EQUIPES[equipe].orcamento + bonus;
  if (nivel < 0 || nivel > Eq.MAX_NIVEL || (delta > 0 && Eq.custoDaMontagem(montagem) >= limite)) return null;
  return { ...montagem, [k]: nivel };
}

root.F1Garagem = { ABAS, abaAtual, definirAba, abasHTML, icone, bandeira, painelEquipe, calendario, colunaDireita, mapaGP, previsaoDoGP, palcoSlot, encaixar, orcamentoBarra, pecasHTML, cliquePeca, pontosHTML, cliquePonto, notaGeral };
})(window);
