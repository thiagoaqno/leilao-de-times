// Corrida da Galera — telas fora da corrida: a sala de espera e o "como jogar".
import { E, PISTAS, CARROS, specDaEquipe, carOf, COLORS, PAWNS, $, h, me, act, fmt } from "./estado.js";
import { THEMES } from "./pista.js";
import { MODS3, MODS_PADRAO, carPreview } from "./carros.js";
import { loadBest } from "./fantasma.js";
import { f1Pronto } from "./f1.js";
import { palco } from "./palco.js";
import { iniciarControle } from "./sala-controle.js";
const EQUIPES_F1 = window.EQUIPES_F1 || {};
// o logo da equipe sozinho (sem a sigla por trás, que aparecia pelas transparências do PNG); só sem arquivo, ou se ele não carregar, entra a sigla
const siglaEquipe = (e) => `<span class="sigla">${h(e.sigla)}</span>`;
const marcaEquipe = (id) => {
  const e = EQUIPES_F1[id]; if (!e) return "";
  return `<span class="equipe-marca" style="--equipe:${e.cor}">${e.arquivo ? `<img data-logo-f1 src="/api/corrida/logo/${id}" alt="" loading="lazy" data-sigla="${h(e.sigla)}">` : siglaEquipe(e)}</span>`;
};
document.addEventListener("error", (ev) => { const i = ev.target.matches?.("img[data-logo-f1]") && ev.target; if (!i) return; const p = i.parentNode; i.remove(); if (p && !p.querySelector(".sigla")) p.insertAdjacentHTML("afterbegin", `<span class="sigla">${i.dataset.sigla || ""}</span>`); }, true);
const logosEquipes = document.getElementById("logosEquipes");
if (logosEquipes) logosEquipes.innerHTML = Object.entries(EQUIPES_F1).map(([id, e]) => `<span class="equipe-mini" style="--equipe:${e.cor}">${marcaEquipe(id).replace(" loading=\"lazy\"", "")}<span>${h(e.nome)}</span></span>`).join(""); // a faixa da entrada carrega já (fica abaixo da dobra em tela baixa)
let f1Carregou = false;
f1Pronto.then(() => { f1Carregou = true; if (E.S && E.S.phase === "lobby") renderLobby(); }); // refaz as fotos dos carros com o modelo 3D

const reduz = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let veioDaCorrida = false;
export function show(id) {
  if (id === "race") window.MusicaCarreira?.calar(); else window.MusicaCarreira?.voltar();
  const eraSala = !$("lobby").classList.contains("hidden");
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
  document.body.classList.toggle("sala-escura", id === "home" || id === "lobby"); // as telas da sala usam o fundo escuro de sala de controle
  if (id === "lobby" && !eraSala) { // entrou na sala (ou voltou da corrida): a etapa de agora entra animada; depois da corrida, direto no grid
    if (veioDaCorrida) { etapa = "grid"; veioDaCorrida = false; }
    animarEntrada(el(etapa));
  }
  if (id !== "lobby") { fecharGaveta(); fecharSobre(false); palco.parar(); if (id === "race") veioDaCorrida = true; }
}

// ---------- a sala de espera: quatro etapas, sem abas ----------
// Equipe (as 11 equipes de 2026 numa faixa, o carro girando no palco e a ficha à esquerda) → Carro e pneu (o composto da largada, a
// previsão do tempo e as peças e a pintura numa gaveta) → GP (a pista, as voltas, o clima, o horário e os robôs; só o organizador mexe)
// → Grid e largada (quem está na sala e o LARGAR do organizador). O indicador de etapas no topo é clicável; o Continuar (ou Start no
// controle) avança, Esc ou B voltam; as setas e o direcional movem o foco (sala-controle.js). Fora das regras de F1 não há a etapa da
// equipe; quem só assiste vê o GP e o grid; numa sala da carreira só o grid. Cada trecho só mexe no HTML quando ele muda (`trocar`),
// para o foco e as animações não se perderem a cada estado que chega do servidor.
const ORDEM = ["equipe", "carro", "gp", "grid"];
const NOMES = { equipe: "Equipe", carro: "Carro e pneu", gp: "GP", grid: "Grid" };
const NIVEL = { facil: "fácil", medio: "médio", dificil: "difícil" };
const DESC_PNEU = { macio: "Aderência máxima. Dura uma volta e meia.", medio: "O equilíbrio. Dura de 3 a 4 voltas.", duro: "Aguenta mais de 6 voltas, com menos aderência.", chuva: "Para a pista molhada. No seco derrete em 2 ou 3 voltas." };
const el = (k) => document.querySelector(`.sn-etapa[data-etapa="${k}"]`);
const plural = (n, s) => `${n} ${s}${n > 1 ? "s" : ""}`;
const chip = (txt, cls = "") => `<span class="sn-chip ${cls}">${txt}</span>`;
let etapa = "equipe", gavetaAberta = false, focoAntes = null, pendente = null, tEquipe = 0;

const etapasAtivas = () => {
  const S = E.S, m = me();
  if (!S || S.temporada) return ["grid"]; // a sede da carreira controla o resto
  if (!m) return ["gp", "grid"]; // só assistindo
  return S.config.regras === "f1" ? ["equipe", "carro", "gp", "grid"] : ["carro", "gp", "grid"];
};
// troca o HTML de um trecho só se ele mudou, e devolve o foco ao mesmo botão (quando o trecho refaz os botões)
const chaveDe = (e) => { const d = Object.entries(e.dataset).map(([k, v]) => `${k}=${v}`).join("&"); return `${e.tagName}|${d || (e.id || "") + e.textContent.trim().slice(0, 30)}`; };
function trocar(no, s) {
  if (!no || no._h === s) return false;
  const foco = document.activeElement, chave = foco && no.contains(foco) ? chaveDe(foco) : null;
  no._h = s; no.innerHTML = s;
  if (chave) { const novo = [...no.querySelectorAll("button,summary,[tabindex]")].find((x) => chaveDe(x) === chave); if (novo) novo.focus({ preventScroll: true }); }
  return true;
}
function animarEntrada(no) {
  if (!no) return;
  no.classList.remove("entra"); void no.offsetWidth; no.classList.add("entra");
  clearTimeout(no._t); no._t = setTimeout(() => no.classList.remove("entra"), 1100);
}
const cfg = (patch) => act("config", { config: { ...E.S.config, ...(patch.pista && PISTAS[patch.pista]?.horaPadrao && patch.pista !== E.S.config.pista ? { hora: PISTAS[patch.pista].horaPadrao } : {}), ...patch } }); // (a pista que só corre à noite, Singapura, põe a noite ao ser escolhida; dá para trocar depois)

// ----- as etapas: ir, voltar, continuar -----
export function irPara(k) {
  const ativas = etapasAtivas(); if (!ativas.includes(k) || k === etapa) return;
  if (gavetaAberta) fecharGaveta();
  enviarEquipe(); // a equipe que ficou na faixa vale antes de sair dela
  const dir = ORDEM.indexOf(k) > ORDEM.indexOf(etapa) ? 1 : -1, velha = el(etapa), nova = el(k), tinhaFoco = velha && velha.contains(document.activeElement);
  etapa = k; $("sn").dataset.etapa = k; $("sn").style.setProperty("--dir", dir);
  if (velha) { velha.classList.remove("on"); if (!reduz()) { velha.classList.add("sai"); clearTimeout(velha._t2); velha._t2 = setTimeout(() => velha.classList.remove("sai"), 240); } }
  nova.classList.add("on"); animarEntrada(nova);
  window.scrollTo({ top: 0, behavior: reduz() ? "auto" : "smooth" });
  renderLobby();
  if (tinhaFoco) { const l = [...nova.querySelectorAll("button:not(:disabled),summary")]; const i = inicial(l); if (i || l[0]) (i || l[0]).focus({ preventScroll: true }); }
}
function voltar() {
  if (sobreAberto) return fecharSobre();
  if (gavetaAberta) return fecharGaveta();
  const a = etapasAtivas(), i = a.indexOf(etapa);
  if (i > 0) irPara(a[i - 1]);
}
function continuar() {
  if (sobreAberto) return fecharSobre();
  if (gavetaAberta) return fecharGaveta();
  const a = etapasAtivas(), i = a.indexOf(etapa);
  if (i < a.length - 1) irPara(a[i + 1]); else largar();
}
function largar() { const m = me(); if (E.S && m && E.S.host === m.id && !E.S.temporada) act("start"); }
$("btnContinuar").onclick = continuar;
$("btnStart").onclick = largar;

// ----- a equipe (regras de F1; as contas em f1-equipes.js, o servidor confere tudo) -----
const humanos = (id) => E.S.players.filter((p) => !p.bot && p.equipe === id);
const lotada = (id, m) => humanos(id).length >= 2 && m.equipe !== id;
function equipeVista(m) {
  if (pendente && (m.equipe === pendente.id || Date.now() > pendente.ate)) pendente = null;
  if (pendente) return pendente.id;
  return m.equipe || Object.keys(window.F1Equipes.EQUIPES).find((id) => !lotada(id, m));
}
function escolherEquipe(id) { // aparece na hora (o carro gira com a pintura nova) e vai para o servidor logo depois
  const m = me(); if (!m || !E.S || E.S.config.regras !== "f1" || lotada(id, m)) return;
  pendente = { id, ate: Date.now() + 2500 }; renderLobby();
  clearTimeout(tEquipe); tEquipe = setTimeout(enviarEquipe, 150);
}
function enviarEquipe() {
  clearTimeout(tEquipe); tEquipe = 0; const m = me();
  if (pendente && m && m.equipe !== pendente.id && E.S && E.S.phase === "lobby") act("equipe", { id: pendente.id });
}
function renderEquipe(m) {
  const F = window.F1Equipes, FP = window.F1Pilotos, GA = window.F1Garagem, vista = equipeVista(m), e = FP.EQUIPES[vista], q = F.EQUIPES[vista];
  const ids = Object.keys(F.EQUIPES);
  trocar($("eqFaixa"), ids.map((id) => {
    const x = FP.EQUIPES[id], gente = humanos(id), cheia = lotada(id, m), on = id === vista;
    return `<button class="sn-eq ${on ? "on" : ""} ${m.equipe === id ? "minha" : ""}" data-equipe="${id}" ${cheia ? "disabled" : ""} aria-pressed="${on}" aria-label="${h(x.nome)}${cheia ? ", lotada" : ""}${m.equipe === id ? ", sua equipe" : ""}" style="--equipe:${x.cor}">${marcaEquipe(id)}<span class="sn-eq-nome">${h(x.nome)}</span>${gente.length ? `<span class="sn-eq-gente" title="${gente.map((p) => h(p.name)).join(" e ")}">${gente.length}</span>` : ""}${m.equipe === id ? `<i class="sn-eq-ok" aria-hidden="true">✓</i>` : ""}</button>`;
  }).join(""));
  const faixa = $("eqFaixa"), ativo = faixa.querySelector(".sn-eq.on");
  if (ativo && faixa._vista !== vista) { faixa._vista = vista; faixa.scrollTo({ left: ativo.offsetLeft - (faixa.clientWidth - ativo.offsetWidth) / 2, behavior: reduz() ? "auto" : "smooth" }); }
  // a ficha: logo, nota do carro em barras, o orçamento de peças e quem mais está na equipe
  const spec = specDaEquipe(vista), ficha = F.ficha(spec), mont = (E.S.montagens && E.S.montagens[vista]) || F.montagemPadrao(vista), usado = F.custoDaMontagem(mont), orc = q.orcamento, sobra = orc - usado;
  const gente = humanos(vista), pilotos = (FP.PILOTOS || []).filter((p) => p.equipe === vista);
  const quem = gente.length ? gente.map((p) => `<li><span class="av">${p.pawn}</span><b>${h(p.name)}</b>${p.id === m.id ? "<small>você</small>" : ""}</li>`).join("") : `<li class="vazio">Ninguém ainda: a vaga é sua.</li>`;
  trocar($("eqFicha"), `<div class="sn-ficha-logo" style="--equipe:${e.cor}">${marcaEquipe(vista)}<div><small>Equipe</small><b>${h(e.nome)}</b></div></div>
    <div class="sn-nota"><strong class="num">${GA.notaGeral(ficha)}</strong><span>Nota do carro</span></div>
    <ul class="sn-barras">${ficha.map((f) => `<li><span>${h(f.rotulo)}</span><i class="sn-barra" role="img" aria-label="${f.nota} de 10"><u style="width:${f.nota * 10}%"></u></i><b class="num">${f.nota}</b></li>`).join("")}</ul>
    <div class="sn-orc"><div class="topo"><span>Orçamento de peças</span><b class="num">${usado}/${orc} pts</b></div><i class="sn-barra" role="img" aria-label="${usado} de ${orc} pontos usados"><u style="width:${(usado / orc) * 100}%"></u></i><small>${sobra ? `Sobram ${plural(sobra, "ponto")}` : "Orçamento todo usado"}</small></div>
    <div class="sn-quem"><small>Na equipe</small><ul>${quem}</ul>${pilotos.length ? `<p>Pilotos de 2026: ${pilotos.map((p) => h(p.curto)).join(" e ")}</p>` : ""}</div>`);
  trocar($("eqNomeGrande"), `<small>${h(q.nota || "Carro da equipe")}</small><b>${h(e.nome)}</b>`);
  return vista;
}

// ----- carro e pneu -----
function renderCarro(m, f1, c) {
  const k = carOf(m), PN = window.F1Regras && window.F1Regras.PNEUS;
  trocar($("carroInfo"), `<small>${h(f1 && m.equipe ? window.F1Pilotos.EQUIPES[m.equipe].nome : k.inspo || "Seu carro")}</small><b>${h(k.name)}</b><span class="sn-piloto"><span class="av">${m.pawn}</span>${h(m.name)}</span>`);
  $("pneuCartao").classList.toggle("hidden", !f1); $("prevCartao").classList.toggle("hidden", !(f1 && E.S.previsao && window.PrevisaoUI)); $("carroLista").classList.toggle("hidden", f1);
  if (f1) {
    const atual = m.pneu || "medio";
    trocar($("pneuCartao"), `<h3 class="sn-tit"><span>Pneu da largada</span><em>${h(PN[atual].nome)}</em></h3><div class="sn-pneus" role="group" aria-label="Pneu da largada">${Object.entries(PN).map(([v, p]) => `<button class="sn-pneu ${atual === v ? "on" : ""}" data-pneu="${v}" aria-pressed="${atual === v}" style="--c:${p.cor}"><span class="sn-roda" aria-hidden="true"><i></i></span><b>${h(p.nome)}</b><small>${DESC_PNEU[v] || ""}</small>${v === "medio" ? `<em>Padrão</em>` : ""}</button>`).join("")}</div>
      <p class="sn-obs">Com chuva na largada, quem não escolher larga de pneu de chuva. Cada piloto tem 2 jogos de cada composto na corrida, contando o da largada.</p>`);
    trocar($("prevCartao"), E.S.previsao && window.PrevisaoUI ? window.PrevisaoUI.html(E.S.previsao, { voltas: c.voltas, titulo: "Previsão do tempo do GP" }) : "");
  } else {
    const lista = Object.entries(CARROS).map(([id, kk]) => `<button class="sn-car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><span><b>${h(kk.name)}</b><small>${h(kk.inspo || "")}</small></span></button>`).join("");
    if (trocar($("carroLista"), `<h3 class="sn-tit"><span>Seu carro</span><em>${h(k.inspo || "")}</em></h3><div class="sn-cars">${lista}</div><p class="sn-obs">${h(k.desc || "")}</p>`)) $("carroLista").querySelectorAll("[data-carprev]").forEach((cv) => carPreview(cv, m.color, cv.dataset.carprev, m.mods));
  }
  const pint = MODS3.pintura[(m.mods || MODS_PADRAO).pintura] || MODS3.pintura.propria;
  $("garagemSub").textContent = `${f1 && m.equipe ? "Peças do carro · " : "Carro e cor · "}pintura ${pint.name}`;
}

// ----- o GP: a pista, as voltas, o clima, o horário, os robôs e as regras avançadas -----
function renderGP(m, isHost, f1, c, t) {
  const dis = isHost ? "" : "disabled", recorde = loadBest(c.pista), temporada = !!E.S.temporada;
  const dados = chip(plural(c.voltas, "volta")) + chip(c.hora === "noite" ? "Noite" : "Dia") + (f1 && !temporada && c.clima && c.clima !== "aleatorio" ? chip({ seco: "Seco", chuva: "Chuva", variavel: "Variável" }[c.clima] || "") : "") + (recorde ? chip(`Recorde ${fmt(recorde.t)}`, "ouro") : "");
  if (trocar($("gpMapa"), `<div class="sn-mapa-corpo"><canvas id="pistaGrande" width="640" height="640" role="img" aria-label="Mapa de ${h(t.name)}"></canvas><div class="sn-mapa-txt"><small>${h(t.sub)}</small><b>${h(t.name)}</b><div class="sn-chips">${dados}</div><button class="sn-sobre-btn" data-sobre><span>Sobre o GP</span><small>${sobreResumo(c.pista)}</small><i aria-hidden="true">›</i></button>${isHost ? "" : `<p class="sn-so-org">Só o organizador escolhe o GP.</p>`}</div></div>`)) drawPreview($("pistaGrande"), c.pista);
  const fundoGp = window.GpInfo && window.GpInfo.fundoDe(c.pista); $("gpMapa").style.setProperty("--foto", fundoGp ? `url("${fundoGp}")` : "none"); // a foto do GP por trás do mapa
  const pistas = Object.entries(PISTAS).map(([id, p]) => `<button class="sn-pista ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis} aria-pressed="${c.pista === id}"><canvas data-prev="${id}" width="160" height="160" aria-hidden="true"></canvas><span><b>${h(p.name)}</b><small>${h(p.sub)}</small></span>${loadBest(id) ? `<em>Recorde ${fmt(loadBest(id).t)}</em>` : ""}</button>`).join("");
  if (trocar($("gpPistas"), `<h3 class="sn-tit"><span>Pistas</span><em>${Object.keys(PISTAS).length} circuitos</em></h3><div class="sn-pistas">${pistas}</div>`)) $("gpPistas").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  const seg = (itens, atual, attr, rot, dsb = dis) => `<div class="sn-seg" role="group" aria-label="${rot}">${itens.map(([v, l]) => { const on = String(atual) === String(v); return `<button class="sn-opt ${on ? "on" : ""}" data-${attr}="${v}" aria-pressed="${on}" ${dsb}>${l}</button>`; }).join("")}</div>`;
  const campo = (rot, corpo, nota) => `<div class="sn-grupo"><span class="sn-rot">${rot}</span>${corpo}${nota ? `<small>${nota}</small>` : ""}</div>`;
  const robos = Math.min(c.robos || 0, (f1 ? 20 : 8) - E.S.players.length);
  const OPC_CLIMA = [["aleatorio", "Aleatório"], ["seco", "Seco"], ["chuva", "Chuva"], ["variavel", "Variável"]];
  trocar($("gpOpcoes"), `<h3 class="sn-tit"><span>O GP</span><em>${isHost ? "Você é o organizador" : "Só o organizador muda"}</em></h3><div class="sn-opcoes">`
    + campo("Regras", seg([["f1", "Fórmula 1"], ["galera", "Corrida da Galera"]], c.regras || "galera", "regras", "Regras"), f1 ? "Pneus, paradas nos boxes, classificação e robôs com os pilotos de 2026." : "Caixas de itens e a ajuda do pelotão, sem pneus.")
    + campo("Voltas", seg([1, 2, 3, 5, 10, 21].map((v) => [v, v]), c.voltas, "v", "Voltas"))
    + campo("Horário", seg([["dia", "Dia"], ["noite", "Noite"]], c.hora === "noite" ? "noite" : "dia", "hora", "Horário"))
    + (f1 && !temporada ? campo("Clima", seg(OPC_CLIMA, c.clima || "aleatorio", "clima", "Clima"), "Aleatório segue a previsão do GP. Chuva larga molhado; Variável larga seco e a chuva vem no meio.") : "")
    + campo("Robôs", seg((f1 ? [0, 1, 3, 7, 11, 19] : [0, 1, 3, 5, 7]).map((v) => [v, v === 19 && f1 ? "Grid de 20" : v ? v : "Sem"]), c.robos || 0, "robos", "Robôs")
      + (c.robos ? seg([["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]], c.nivel || "medio", "nivel", "Nível dos robôs") : ""),
      f1 ? "Os robôs são os pilotos reais de 2026, com as cores das equipes. \"Grid de 20\" completa o que faltar." : "Pilotos do computador completam o grid (até 8 carros) e usam itens.")
    + `</div>`);
  trocar($("gpMaisCorpo"), `<div class="sn-opcoes">`
    + campo("Câmbio", seg([["auto", "Automático"], ["manual", "Manual"]], c.cambio || "auto", "cambio", "Câmbio"), "Manual para todo mundo: Shift sobe a marcha, Ctrl direito reduz (no celular, os botões + e −). Os robôs continuam no automático.")
    + (f1 ? campo("ERS", seg([["auto", "Automático"], ["manual", "Manual (E)"]], c.ers === "manual" ? "manual" : "auto", "ers", "ERS"), "A bateria recarrega na frenagem. No manual, segure E ou o botão ERS para desdobrar.")
      + campo("Classificação", seg([["completa", "Q1, Q2 e Q3"], ["pular", "Pular"]], c.classificacao === "pular" ? "pular" : "completa", "quali", "Classificação"), "Voltas lançadas com o relógio: o Q1 tira os 5 mais lentos, o Q2 mais 5 e o Q3 decide a pole. Pulando, o grid segue a ordem dos pilotos da sala.")
      + (E.S.previsao && window.PrevisaoUI && !temporada ? `<div class="sn-grupo sn-prev">${window.PrevisaoUI.html(E.S.previsao, { voltas: c.voltas })}</div>` : "")
      : campo("Caixas de itens", seg([["true", "Ligadas"], ["false", "Desligadas"]], String(!!c.caixas), "caixas", "Caixas de itens"), "Banana, cascos, cogumelo, estrela e bomba espalhados pela pista.")
      + campo("Equilíbrio", seg([["true", "Ligado"], ["false", "Desligado"]], String(c.equilibrio !== false), "equilibrio", "Equilíbrio"), "Pequena ajuda de velocidade para quem ficou longe do pelotão.")) + `</div>`);
  return robos;
}

// ----- o grid e a largada -----
function renderGrid(m, isHost, f1, c, t, robos, total) {
  const FP = window.F1Pilotos, PN = window.F1Regras && window.F1Regras.PNEUS, prontos = E.S.players.filter((p) => p.online).length, max = f1 ? 20 : 8;
  const equipeDe = (p) => (f1 && p.equipe && FP && FP.EQUIPES[p.equipe]) ? `${marcaEquipe(p.equipe)}<span>${h(FP.EQUIPES[p.equipe].nome)}</span>` : `<span>${h(carOf(p).name)}</span>`;
  const linhas = E.S.players.map((p, i) => `<li class="sn-linha ${m && p.id === m.id ? "eu" : ""}" style="--c:${p.color}"><span class="n">${i + 1}</span><span class="av">${p.pawn}</span><span class="nome"><b>${h(p.name)}</b>${m && p.id === m.id ? "<small>você</small>" : ""}</span><span class="eq">${equipeDe(p)}</span>${f1 && PN && PN[p.pneu] ? `<span class="pn" title="Pneu da largada: ${PN[p.pneu].nome}" style="--c:${PN[p.pneu].cor}"><i></i>${h(PN[p.pneu].nome)}</span>` : `<span class="pn"></span>`}<span class="est">${p.id === E.S.host ? `<em class="org">Org.</em>` : ""}${p.online ? `<em class="ok">Pronto</em>` : `<em class="off">Offline</em>`}${isHost && m && p.id !== m.id ? `<button class="sn-x" data-kick="${p.id}" title="Tirar da sala" aria-label="Tirar ${h(p.name)} da sala">✕</button>` : ""}</span></li>`).join("")
    + (robos ? `<li class="sn-linha robo" style="--c:#9aa1ad"><span class="n">+</span><span class="av">R</span><span class="nome"><b>${plural(robos, "robô")}</b><small>nível ${NIVEL[c.nivel] || "médio"}</small></span><span class="eq"><span>${f1 ? "Pilotos de 2026" : "Computador"}</span></span><span class="pn"></span><span class="est"><em class="ok">Na largada</em></span></li>` : "");
  trocar($("gridLista"), `<h3 class="sn-tit"><span>Grid</span><em>${total}/${max} · ${plural(prontos, "pronto")}</em></h3><ul class="sn-linhas">${linhas}</ul>`);
  const meuPn = m && f1 && PN ? PN[m.pneu || "medio"] : null;
  trocar($("gridResumo"), `<h3 class="sn-tit"><span>O GP</span><em>${E.S.code}</em></h3><dl class="sn-resumo"><div><dt>Pista</dt><dd>${h(t.name)}</dd></div><div><dt>Voltas</dt><dd>${c.voltas}</dd></div><div><dt>Horário</dt><dd>${c.hora === "noite" ? "Noite" : "Dia"}</dd></div><div><dt>Regras</dt><dd>${f1 ? "Fórmula 1" : "Corrida da Galera"}</dd></div><div><dt>Robôs</dt><dd>${robos ? `${robos} · ${NIVEL[c.nivel] || "médio"}` : "Sem"}</dd></div>${meuPn ? `<div><dt>Seu pneu</dt><dd class="pn" style="--c:${meuPn.cor}"><i></i>${h(meuPn.nome)}</dd></div>` : ""}</dl>
    <p class="sn-obs">${!m ? "Você está assistindo." : E.S.temporada ? "A sede da temporada dá a largada." : isHost ? "Tudo certo? Aperte LARGAR." : "Esperando o organizador largar."} Mande o código <b>${E.S.code}</b> para a galera: dá para correr sozinho, contra o relógio ou contra robôs.</p>`);
  const podeLargar = isHost && !E.S.temporada;
  $("tLargarTit").textContent = podeLargar ? "Largar" : E.S.temporada ? "Aguarde" : "No grid";
  $("tLargarTxt").textContent = podeLargar ? `${t.name} · ${plural(c.voltas, "volta")}` : E.S.temporada ? "A sede dá a largada" : "Esperando o organizador";
  $("btnStart").disabled = !podeLargar;
}

// ----- "Sobre o GP": a tela com a foto do circuito, o nome do GP, o mapa com as curvas numeradas e a lista delas -----
// Abre no botão do cartão do mapa (etapa GP); Esc ou B fecham; Q e E (LB e RB) trocam de GP para o organizador, e a tela anima (a foto
// esmaece, os itens entram em cascata). Os dados vêm de gp-info.js (GpInfo) e a foto de gp-fotos/ (ou o céu de ceus/ nas pistas inventadas).
let sobreAberto = false, sobreFocoAntes = null, sobreChave = "";
const mapaCache = {};
function mapaSobre(id) { // o traçado em 100 × 100 e a posição de uma fração da volta (a mesma fração das curvas de gp-info.js)
  if (mapaCache[id]) return mapaCache[id];
  const t = PISTAS[id], pts = window.Pistas.pontos(t, 12), n = pts.length;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const s = 78 / Math.max(x1 - x0, y1 - y0), ox = (100 - (x1 - x0) * s) / 2, oy = (100 - (y1 - y0) * s) / 2;
  const pt = (p) => [ox + (p.x - x0) * s, oy + (p.y - y0) * s];
  const d = pts.filter((_, i) => i % 2 === 0).map((p, i) => (i ? "L" : "M") + pt(p).map((v) => v.toFixed(1)).join(" ")).join("") + "Z";
  return (mapaCache[id] = { d, pt: (f) => pt(pts[Math.floor(f * n) % n]), largada: pt(pts[0]) });
}
function marcasSobre(id, curvas) { // os números nas posições certas; os que ficariam um por cima do outro se afastam um pouco
  const m = mapaSobre(id), R = 7.6, ps = curvas.map((c) => { const [x, y] = m.pt(c.f); return { n: c.n, x, y, mx: x, my: y }; });
  for (let it = 0; it < 80; it++) {
    let mexeu = false;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j]; let dx = b.mx - a.mx, dy = b.my - a.my, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 0.01) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
      const q = (R - d) / 2 / d; a.mx -= dx * q; a.my -= dy * q; b.mx += dx * q; b.my += dy * q; mexeu = true;
    }
    for (const p of ps) { p.mx = Math.max(4, Math.min(96, p.mx)); p.my = Math.max(4, Math.min(96, p.my)); }
    if (!mexeu) break;
  }
  return ps;
}
const fmtKm = (km) => km.toFixed(3).replace(".", ",");
function sobreResumo(id) {
  const G = window.GpInfo, g = G && G.get(id); if (!g || !g.real) return "o mapa e o clima do GP";
  return `${plural(g.curvas.length, "curva")} numeradas · foto de ${h(g.cidade.split(",")[0])}`;
}
function sobreCorpo(id) {
  const G = window.GpInfo, g = G.get(id), t = PISTAS[id], mapa = mapaSobre(id), ms = marcasSobre(id, g.curvas), nom = G.curvasNomeadas(id), rec = loadBest(id);
  const chips = (g.km ? chip(`${fmtKm(g.km)} km`) : "") + (g.voltas ? chip(`${plural(g.voltas, "volta")} oficiais`) : "") + (g.curvas.length ? chip(plural(g.curvas.length, "curva")) : "") + (nom ? chip(`${nom} com nome`) : "") + (rec ? chip(`Seu recorde ${fmt(rec.t)}`, "ouro") : "");
  const lugar = g.real ? `${G.bandeira(id)}<span>${h(g.cidade)} · ${h(g.pais)}</span>` : `<span>Pista da Corrida da Galera</span>`;
  const elos = ms.filter((k) => Math.hypot(k.mx - k.x, k.my - k.y) > 1.2).map((k) => `<line class="elo" x1="${k.x.toFixed(1)}" y1="${k.y.toFixed(1)}" x2="${k.mx.toFixed(1)}" y2="${k.my.toFixed(1)}"/>`).join("");
  const marcas = ms.map((k, i) => `<g class="sn-marca" data-n="${k.n}" style="--i:${i}" transform="translate(${k.mx.toFixed(1)} ${k.my.toFixed(1)})"><circle r="3.5"/><text y="1.4">${k.n}</text></g>`).join("");
  const [lx, ly] = mapa.largada;
  const svg = `<svg class="sn-sobre-svg" viewBox="0 0 100 100" role="img" aria-label="Mapa de ${h(t.name)}${g.curvas.length ? ` com as ${g.curvas.length} curvas numeradas` : ""}"><path class="base" d="${mapa.d}"/><path class="fio" d="${mapa.d}"/><rect class="largada" x="${(lx - 1.6).toFixed(1)}" y="${(ly - 1.6).toFixed(1)}" width="3.2" height="3.2"/>${elos}${marcas}</svg>`;
  const lista = g.curvas.length
    ? `<ol class="sn-sobre-lista" aria-label="Curvas de ${h(g.gp)}">${g.curvas.map((c, i) => `<li style="--i:${i}"><button class="sn-curva ${c.nome ? "" : "sem"}" data-curva="${c.n}" aria-label="Curva ${c.n}${c.nome ? `, ${h(c.nome)}` : ""}"><b>${c.n}</b><span>${c.nome ? h(c.nome) : `Curva ${c.n}`}</span></button></li>`).join("")}</ol>`
    : `<p class="sn-sobre-vazio">${h(t.sub)}</p>`;
  return `<div class="sn-sobre-conteudo"><header class="sn-sobre-cab"><div class="sn-sobre-lugar">${lugar}</div><h2 id="sobreTit">${h(g.gp)}</h2>${g.real ? `<p class="sn-sobre-circ">${h(g.circuito)}</p>` : ""}<div class="sn-chips">${chips}</div></header><div class="sn-sobre-meio"><figure class="sn-sobre-mapa">${svg}</figure>${lista}</div></div>`;
}
function fundoSobre(id, animar) { // a foto cobre tudo; ao trocar de GP a nova esmaece por cima da antiga
  const caixa = $("sobreFoto"), G = window.GpInfo, g = G.get(id), src = G.fundoDe(id), suave = animar && !reduz();
  const nova = document.createElement("i"); nova.className = "sn-sobre-img" + (suave ? " entra" : ""); nova.dataset.id = id;
  const por = () => {
    if (!sobreAberto) return;
    caixa.append(nova);
    [...caixa.children].forEach((c) => { if (c === nova) return; if (suave) setTimeout(() => c.remove(), 950); else c.remove(); });
  };
  if (!src) return por();
  const im = new Image();
  im.onload = () => { nova.style.backgroundImage = `url("${src}")`; por(); };
  im.onerror = () => { if (g.ceu && src !== g.ceu) nova.style.backgroundImage = `url("${g.ceu}")`; por(); };
  im.src = src;
}
function renderSobre() {
  const S = E.S; if (!S || !sobreAberto) return;
  const G = window.GpInfo, id = S.config.pista, m = me(), isHost = !!m && S.host === m.id, ids = Object.keys(PISTAS), i = ids.indexOf(id);
  const ant = PISTAS[ids[(i - 1 + ids.length) % ids.length]], prox = PISTAS[ids[(i + 1) % ids.length]], pode = isHost && !S.temporada;
  for (const [b, p] of [[$("sobreAnt"), ant], [$("sobreProx"), prox]]) { b.disabled = !pode; b.title = pode ? "" : S.temporada ? "O GP vem do calendário" : "Só o organizador escolhe o GP"; b.querySelector("small").textContent = p.name; }
  const rec = loadBest(id), chave = `${id}|${rec ? rec.t : ""}`;
  if (chave === sobreChave) return;
  const antes = sobreChave.split("|")[0], trocou = !!antes && antes !== id, tinhaFoco = $("sobreCorpo").contains(document.activeElement);
  sobreChave = chave;
  $("sobreCorpo").innerHTML = sobreCorpo(id);
  if (!antes || trocou) fundoSobre(id, trocou);
  const g = G.get(id);
  $("sobreCred").textContent = g.credito ? `Foto: ${g.credito.autor} · ${g.credito.licenca} · Wikimedia Commons` : g.ceu ? "Céu: Poly Haven · CC0" : "";
  $("sobreCred").title = g.credito ? g.credito.arquivo : "";
  if (tinhaFoco) { const c = $("sobreCorpo").querySelector(".sn-curva"); if (c) c.focus({ preventScroll: true }); }
}
function destacarCurva(n) { // a curva do mouse ou do foco acende no mapa e na lista
  const raiz = $("snSobre"); raiz.querySelectorAll(".hi").forEach((x) => x.classList.remove("hi"));
  const svg = raiz.querySelector(".sn-sobre-svg"); if (svg) svg.classList.toggle("tem-hi", n != null);
  if (n == null) return;
  raiz.querySelectorAll(`[data-n="${n}"],[data-curva="${n}"]`).forEach((x) => x.classList.add("hi"));
}
const curvaDoFoco = () => { const a = document.activeElement; return a && a.matches && a.matches(".sn-curva") ? a.dataset.curva : null; };
function abrirSobre() {
  if (!E.S || sobreAberto || !window.GpInfo) return;
  if (gavetaAberta) fecharGaveta();
  sobreAberto = true; sobreFocoAntes = document.activeElement; sobreChave = "";
  const no = $("snSobre"); no.classList.remove("hidden"); $("sn").inert = true; document.body.classList.add("sn-gaveta-on");
  $("sobreFoto").innerHTML = "";
  no.classList.remove("entra"); void no.offsetWidth; no.classList.add("entra");
  renderSobre(); renderLobby();
  const l = [...no.querySelectorAll("button:not(:disabled)")], i = l.find((x) => x.matches(".sn-curva")) || l.find((x) => x.matches("[data-sobre-fechar]"));
  if (i) i.focus({ preventScroll: true });
}
function fecharSobre(devolverFoco = true) {
  if (!sobreAberto) return;
  sobreAberto = false; $("snSobre").classList.add("hidden"); $("sn").inert = false; if (!gavetaAberta) document.body.classList.remove("sn-gaveta-on");
  destacarCurva(null);
  if (devolverFoco) { const b = sobreFocoAntes && sobreFocoAntes.isConnected && !sobreFocoAntes.disabled ? sobreFocoAntes : document.querySelector("[data-sobre]"); if (b) b.focus({ preventScroll: true }); }
  sobreFocoAntes = null; renderLobby();
}
function mudarPistaSobre(d) {
  const S = E.S, m = me(); if (!S || !m || S.host !== m.id || S.temporada) return;
  const ids = Object.keys(PISTAS), i = ids.indexOf(S.config.pista);
  cfg({ pista: ids[(i + d + ids.length * 2) % ids.length] });
}
(function ligarSobre() {
  const no = $("snSobre");
  no.addEventListener("pointerover", (e) => { const a = e.target.closest && e.target.closest("[data-curva],[data-n]"); if (a) destacarCurva(a.dataset.curva || a.dataset.n); });
  no.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest("[data-curva],[data-n]")) destacarCurva(curvaDoFoco()); });
  no.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches(".sn-curva")) destacarCurva(e.target.dataset.curva); });
  no.addEventListener("focusout", (e) => { if (e.target.matches && e.target.matches(".sn-curva")) setTimeout(() => destacarCurva(curvaDoFoco()), 0); });
  no.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".sn-curva"); if (b) destacarCurva(b.dataset.curva); }); // no celular o toque acende a curva
})();

// ----- a gaveta das peças e da pintura (um atalho da etapa Carro e pneu) -----
function abrirGaveta() {
  const m = me(); if (!m || gavetaAberta) return;
  gavetaAberta = true; focoAntes = document.activeElement;
  $("snGaveta").classList.remove("hidden"); $("sn").inert = true; document.body.classList.add("sn-gaveta-on");
  renderGaveta();
  const l = [...$("snGaveta").querySelectorAll("button:not(:disabled)")], i = l.find((x) => x.matches(".sn-pint.on,.peca-card.sel")) || l[0];
  if (i) i.focus({ preventScroll: true });
}
function fecharGaveta() {
  if (!gavetaAberta) return;
  gavetaAberta = false; $("snGaveta").classList.add("hidden"); $("sn").inert = false; document.body.classList.remove("sn-gaveta-on");
  if (focoAntes && focoAntes.isConnected && !focoAntes.disabled) focoAntes.focus({ preventScroll: true });
  focoAntes = null;
}
function renderGaveta() {
  const m = me(); if (!m) return fecharGaveta();
  const f1 = E.S.config.regras === "f1", F = window.F1Equipes, FP = window.F1Pilotos;
  carPreview($("gavetaCarro"), m.color, m.car, m.mods);
  const pecas = $("gPecasSec"); pecas.classList.toggle("hidden", !(f1 && m.equipe));
  if (f1 && m.equipe) {
    const eq = m.equipe, mont = (E.S.montagens && E.S.montagens[eq]) || F.montagemPadrao(eq), chefeId = E.S.chefes && E.S.chefes[eq], chefe = E.S.players.find((p) => p.id === chefeId), souChefe = chefeId === m.id;
    const GA = window.F1Garagem, atuais = window.F1Pecas.pecasDe(eq, mont, E.S.pecasEq && E.S.pecasEq[eq]);
    trocar($("equipePainel"), `<p class="sn-obs">${h(FP.EQUIPES[eq].nome)}: ${souChefe ? "você monta o carro da equipe." : `quem monta o carro é ${h(chefe ? chefe.name : "o chefe da equipe")}.`}</p>`
      + GA.pecasHTML({ equipe: eq, bonus: 0, pecas: atuais, pode: souChefe, motivo: `Quem monta o carro é ${chefe ? chefe.name : "o chefe da equipe"}.`, aviso: E.S.pecasEq && E.S.pecasEq[eq] ? "" : "Este carro usa os pontos padrão da equipe: mostramos as peças mais parecidas. Ao trocar uma peça, ele passa a ser montado por elas." })
      + (souChefe ? `<button class="sn-ghost" data-padrao ${E.S.montagens && E.S.montagens[eq] ? "" : "disabled"}>Voltar ao carro da equipe</button>` : ""));
  }
  const atual = (m.mods || MODS_PADRAO).pintura || "propria";
  if (trocar($("modPick"), Object.entries(MODS3.pintura).map(([id, p]) => `<button class="sn-pint ${atual === id ? "on" : ""}" data-pintura="${id}" aria-pressed="${atual === id}"><canvas data-pintprev="${id}" width="240" height="135" aria-hidden="true"></canvas><span class="sn-pint-t"><i style="background:${p.c || m.color}"></i><i style="background:${p.c2}"></i><b>${h(p.name)}</b></span></button>`).join(""))) $("modPick").querySelectorAll("[data-pintprev]").forEach((cv) => carPreview(cv, m.color, m.car, { pintura: cv.dataset.pintprev }));
  trocar($("colorPick"), COLORS.map((col) => { const taken = E.S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""}" data-c="${col}" ${taken ? "disabled" : ""} aria-pressed="${col === m.color}" style="background:${col}" aria-label="Cor ${col}${taken ? " (em uso)" : ""}"></button>`; }).join(""));
  trocar($("pawnPick"), PAWNS.map((pw) => { const taken = E.S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""}" data-p="${pw}" ${taken ? "disabled" : ""} aria-pressed="${pw === m.pawn}">${pw}</button>`; }).join(""));
}
$("btnGaragem").onclick = abrirGaveta;
$("gavetaFechar").onclick = fecharGaveta;

// ----- os cliques de toda a sala (um ouvinte só, lendo o estado de agora) -----
$("lobby").addEventListener("click", (e) => {
  const t = e.target; let b;
  if (t.closest("[data-fechar]")) return fecharGaveta();
  if (t.closest("[data-sobre-fechar]")) return fecharSobre();
  if ((b = t.closest("[data-sobre-pista]"))) return mudarPistaSobre(+b.dataset.sobrePista);
  if (t.closest("[data-sobre]")) return abrirSobre();
  if ((b = t.closest("[data-etapa-ir]"))) return irPara(b.dataset.etapaIr);
  if (!E.S) return;
  if ((b = t.closest("[data-equipe]"))) return escolherEquipe(b.dataset.equipe);
  if ((b = t.closest("[data-pneu]"))) return act("pneu", { pneu: b.dataset.pneu });
  if ((b = t.closest("[data-pista]"))) return cfg({ pista: b.dataset.pista });
  if ((b = t.closest("[data-v]"))) return cfg({ voltas: +b.dataset.v });
  if ((b = t.closest("[data-hora]"))) return cfg({ hora: b.dataset.hora });
  if ((b = t.closest("[data-regras]"))) return cfg({ regras: b.dataset.regras });
  if ((b = t.closest("[data-clima]"))) return cfg({ clima: b.dataset.clima });
  if ((b = t.closest("[data-cambio]"))) return cfg({ cambio: b.dataset.cambio });
  if ((b = t.closest("[data-ers]"))) return cfg({ ers: b.dataset.ers });
  if ((b = t.closest("[data-quali]"))) return cfg({ classificacao: b.dataset.quali });
  if ((b = t.closest("[data-robos]"))) return cfg({ robos: +b.dataset.robos });
  if ((b = t.closest("[data-nivel]"))) return cfg({ nivel: b.dataset.nivel });
  if ((b = t.closest("[data-caixas]"))) return cfg({ caixas: b.dataset.caixas === "true" });
  if ((b = t.closest("[data-equilibrio]"))) return cfg({ equilibrio: b.dataset.equilibrio === "true" });
  if ((b = t.closest("[data-car]"))) return act("car", { car: b.dataset.car });
  if ((b = t.closest("[data-pintura]"))) return act("mods", { mods: { pintura: b.dataset.pintura } });
  if ((b = t.closest("[data-c]"))) return act("color", { color: b.dataset.c });
  if ((b = t.closest("[data-p]"))) return act("pawn", { pawn: b.dataset.p });
  if ((b = t.closest("[data-kick]"))) return act("kick", { id: b.dataset.kick });
  if (t.closest("[data-padrao]")) return act("montagem", { montagem: null });
  if ((b = t.closest("[data-pcat]"))) { // uma peça do carro (só o chefe da equipe; o servidor confere)
    const m = me(), F = window.F1Equipes; if (!m || !m.equipe) return;
    const mont = (E.S.montagens && E.S.montagens[m.equipe]) || F.montagemPadrao(m.equipe), atuais = window.F1Pecas.pecasDe(m.equipe, mont, E.S.pecasEq && E.S.pecasEq[m.equipe]);
    return act("montagem", { pecas: window.F1Garagem.cliquePeca(b, atuais) });
  }
});

// ----- LB e RB (Q e E): a equipe na etapa Equipe, o composto na etapa Carro e pneu -----
function lateral(d) {
  if (sobreAberto) return mudarPistaSobre(d);
  const m = me(), S = E.S; if (!m || !S || gavetaAberta) return;
  const f1 = S.config.regras === "f1";
  if (etapa === "equipe" && f1) {
    const ids = Object.keys(window.F1Equipes.EQUIPES).filter((id) => !lotada(id, m)), i = ids.indexOf(equipeVista(m));
    if (!ids.length) return; const prox = ids[(i + d + ids.length * 2) % ids.length]; escolherEquipe(prox);
    const b = $("eqFaixa").querySelector(`[data-equipe="${prox}"]`); if (b && document.body.classList.contains("sn-nav")) b.focus({ preventScroll: true });
  } else if (etapa === "carro" && f1) {
    const ks = Object.keys(window.F1Regras.PNEUS), i = ks.indexOf(m.pneu || "medio"); act("pneu", { pneu: ks[(i + d + ks.length) % ks.length] });
  } else if (etapa === "carro") {
    const ks = Object.keys(CARROS), i = ks.indexOf(m.car); act("car", { car: ks[(i + d + ks.length) % ks.length] });
  }
}
const INICIAL = { equipe: ".sn-eq.on", carro: ".sn-pneu.on,.sn-car.on", gp: "#gpOpcoes .sn-opt.on", grid: "#btnStart" };
const inicial = (lista) => {
  if (sobreAberto) return lista.find((x) => x.matches(".sn-curva")) || lista.find((x) => x.matches("[data-sobre-fechar]")) || null;
  if (gavetaAberta) return lista.find((x) => x.matches(".sn-pint.on,.peca-card.sel")) || null;
  const s = INICIAL[etapa]; return s ? lista.find((x) => x.matches(s)) || null : null;
};
iniciarControle({
  ativo: () => !!E.S && !$("lobby").classList.contains("hidden") && $("modal").classList.contains("hidden"),
  raiz: () => (sobreAberto ? $("snSobre") : gavetaAberta ? $("snGaveta").querySelector(".sn-gaveta-painel") : $("lobby")),
  voltar, continuar, lateral, inicial,
  atalho: () => { if (etapa === "carro" && me()) (gavetaAberta ? fecharGaveta : abrirGaveta)(); },
});

// ----- o desenho da sala -----
export function renderLobby() {
  const S = E.S; if (!S) return;
  const m = me(), isHost = !!m && S.host === m.id, c = S.config, t = PISTAS[c.pista], f1 = c.regras === "f1";
  const robos = Math.min(c.robos || 0, (f1 ? 20 : 8) - S.players.length), total = S.players.length + robos;
  const ativas = etapasAtivas();
  if (!ativas.includes(etapa)) { const antiga = el(etapa); if (antiga) antiga.classList.remove("on"); etapa = ativas.includes("grid") && ativas.length === 1 ? "grid" : ativas[0]; $("sn").dataset.etapa = etapa; animarEntrada(el(etapa)); }
  document.querySelectorAll(".sn-etapa").forEach((s) => s.classList.toggle("on", s.dataset.etapa === etapa));
  if (f1 && m && window.Radio) window.Radio.uma("lobby:f1", () => window.Radio.dizer("boasvindas"));
  // o topo: o código da sala, as etapas (clicáveis) e o Continuar (que na última etapa é o Largar)
  $("slCodigo").textContent = S.code; $("hubSala").textContent = `${plural(total, "carro")} no grid`;
  const idx = ativas.indexOf(etapa), ultima = idx === ativas.length - 1;
  trocar($("snEtapas"), ativas.map((k, i) => `<button class="sn-et ${k === etapa ? "on" : ""} ${i < idx ? "feita" : ""}" data-etapa-ir="${k}" ${k === etapa ? 'aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${NOMES[k]}</span></button>`).join(""));
  const podeLargar = isHost && !S.temporada;
  $("btnContinuar").disabled = ultima && !podeLargar;
  $("snContTit").textContent = !ultima ? "Continuar" : podeLargar ? "Largar" : S.temporada ? "Aguarde" : "No grid";
  $("snContSub").textContent = !ultima ? `Próximo: ${NOMES[ativas[idx + 1]]}` : podeLargar ? `${t.name} · ${plural(c.voltas, "volta")}` : "Esperando o organizador";
  $("btnContinuar").classList.toggle("largar", ultima);
  // as dicas dos botões que mudam com a etapa
  const lat = sobreAberto ? "trocar de GP" : etapa === "equipe" && f1 ? "trocar de equipe" : etapa === "carro" ? (f1 ? "trocar o pneu" : "trocar de carro") : "";
  for (const id of ["dicaLat", "dicaLatKb"]) { $(id).classList.toggle("nada", !lat); $(id).querySelector("em").textContent = lat; }
  $("dicaY").classList.toggle("nada", !(etapa === "carro" && m));
  // a etapa de agora
  let vista = null;
  if (etapa === "equipe" && m && f1) vista = renderEquipe(m);
  else if (etapa === "carro" && m) renderCarro(m, f1, c);
  else if (etapa === "gp") renderGP(m, isHost, f1, c, t);
  else if (etapa === "grid") renderGrid(m, isHost, f1, c, t, robos, total);
  if (gavetaAberta) renderGaveta();
  if (sobreAberto) renderSobre();
  // o palco 3D: o carro girando na vitrine da etapa (Equipe e Carro e pneu); nas outras etapas ele descansa
  const vitrine = etapa === "equipe" && m && f1 ? $("vitrineEquipe") : etapa === "carro" && m ? $("vitrineCarro") : null;
  if (!vitrine) { palco.parar(); return; }
  const FP = window.F1Pilotos, eqId = etapa === "equipe" ? vista : m.equipe, eqInfo = f1 && eqId && FP.EQUIPES[eqId];
  const mods = etapa === "equipe" && eqInfo && eqId !== m.equipe && MODS3.pintura[eqInfo.pintura] ? { ...(m.mods || MODS_PADRAO), pintura: eqInfo.pintura } : m.mods;
  if (palco.ok && palco.montarEm(vitrine)) palco.mostrar({ cor: m.color, modelo: m.car, mods, corEquipe: eqInfo ? eqInfo.cor : m.color, prontoF1: f1Carregou });
  if (!palco.ok) { // sem WebGL: a foto parada de sempre
    let foto = vitrine.querySelector(".sn-foto"); if (!foto) { foto = document.createElement("canvas"); foto.className = "sn-foto"; foto.width = 720; foto.height = 405; vitrine.prepend(foto); }
    carPreview(foto, m.color, m.car, mods);
  }
}

// traçado em miniatura (cartões da sala e minimapa)
export function drawPreview(cv, id) {
  const t = PISTAS[id], c = cv.getContext("2d"), s = cv.width / t.world, th = THEMES[id];
  c.fillStyle = th.preview; c.fillRect(0, 0, cv.width, cv.height);
  const pts = window.Pistas.pontos(t, 12); // começa na largada (o quadradinho xadrez)
  c.lineJoin = c.lineCap = "round";
  for (const [w, col] of [[t.width * 1.3, "#0006"], [t.width, "#d9dbe0"], [t.width * 0.6, "#3a3d46"]]) {
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x * s, p.y * s) : c.moveTo(p.x * s, p.y * s))); c.closePath(); c.lineWidth = Math.max(2, w * s); c.strokeStyle = col; c.stroke();
  }
  const a = pts[0]; c.fillStyle = "#fff"; c.fillRect(a.x * s - 4, a.y * s - 4, 8, 8); c.fillStyle = "#111"; c.fillRect(a.x * s - 4, a.y * s - 4, 4, 4); c.fillRect(a.x * s, a.y * s, 4, 4);
}

// ---------- como jogar ----------
$("btnRules").onclick = () => {
  $("modalBox").innerHTML = `<h2>Como jogar</h2>
  <h3>Controles</h3><ul>
  <li><b>Teclado:</b> ↑ ou W acelera, ↓ ou S freia (e dá ré), ← → ou A D viram. Espaço ou E usa o item; freio + Espaço joga para trás. R volta para a pista. C troca a câmera (perto, primeira pessoa, longe e de cima). G troca a qualidade dos gráficos (Baixa, Média e Alta; o botão Gráficos, no alto da tela, faz o mesmo).</li>
  <li><b>Na sala, com controle:</b> o direcional ou o analógico move o foco, A confirma, B volta uma etapa, LB e RB trocam a equipe (ou o pneu), Y abre as peças e Start é o Continuar (ou o Largar).</li>
  <li><b>Controle (Xbox/PlayStation):</b> RT (ou A) acelera, LT (ou B) freia e dá ré, analógico esquerdo vira, RB usa o item, Y troca a câmera e Select (ou LB) volta para a pista.</li>
  <li><b>Celular:</b> ◀ ▶ à esquerda viram; ▲ acelera e ▼ freia à direita. Toque no botão 🎁 para usar o item.</li>
  <li><b>Câmbio manual</b> (se o organizador ligar em Mais regras, na etapa GP): Shift sobe a marcha e Ctrl direito reduz; no controle, X sobe e B reduz. As luzes em cima do velocímetro acendem perto do corte: troque quando ficarem azuis.</li>
  <li><b>↺ Pista:</b> se rodar, ficar preso ou entrar na contramão, volta para o meio da pista.</li></ul>
  <h3>A corrida</h3><ul>
  <li>Largada igual para todo mundo: 3, 2, 1… vai! Ganha quem completar as voltas primeiro.</li>
  <li>Os carros <b>batem de verdade</b>: quem encosta empurra e é empurrado. O tanque é pesado e leva os outros embora; a formiga é leve e sai rodando. Num viaduto ou no ar, um passa por cima do outro.</li>
  <li><b>Vácuo:</b> logo atrás de outro carro, na mesma linha, o seu anda mais (a barra de vácuo aparece embaixo). Ficou mais de 1 segundo no vácuo e saiu de trás para ultrapassar? Ganha o <b>estilingue</b>, um empurrão curto.</li>
  <li><b>Caixas opcionais:</b> bananas, cascos verde e vermelho, cogumelo, estrela e bomba da Batalha. O organizador liga as caixas na sala.</li>
  <li><b>Equilíbrio:</b> quem estiver muito atrás recebe um pequeno ganho de aceleração e velocidade. A ajuda diminui perto da chegada.</li>
  <li><b>Regras de F1</b> (se o organizador ligar em "Regras", na etapa GP; numa sala nova elas já vêm ligadas): os pneus gastam por volta (o macio dura uma volta e meia, o médio de 3 a 4, o duro 6 ou mais; escorregar e travar a roda gasta mais) e esfriam na largada e na saída do box: pneu frio segura menos por alguns segundos. O anel do pneu, ao lado do velocímetro, esvazia até 0% no fim da vida e fica vermelho: dali o pneu despenca (menos aderência, tração e freio, e cada volta a mais custa muitos segundos). Com o pneu frio, o miolo fica azul. Escolha o composto da largada na etapa Carro e pneu da sala. <b>Cada piloto tem só 2 jogos de cada composto por corrida</b> (macio, médio e duro), contando o da largada: no box o jogo esgotado fica indisponível e o HUD mostra quantos restam.</li>
  <li><b>Box</b> (regras de F1): dirija pela entrada do corredor para escolher o pneu na garagem, ou aperte <b>B</b> (ou toque em "🔧 Box") para pedir a parada na próxima passagem; B de novo cancela; 1, 2, 3 e 4 escolhem macio, médio, duro e chuva. Enter confirma o pedido no MFD sem cancelá-lo. Cada visita aos boxes reduz em 90% o dano acumulado, inclusive no stop-and-go. No corredor o carro anda sozinho no limitador (40% da velocidade final), para na garagem uns 2,4 s (mais o erro dos mecânicos, até 1,5 s) e sai com o pneu novo, ainda frio. Dá para parar da volta 1 até a penúltima. <b>Quem termina uma corrida seca sem dois compostos recebe +1 s por volta, até +10 s.</b> A torre mostra o pneu de cada um, quantas paradas fez e quem está no box.</li>
  <li><b>Batidas e punições</b> (regras de F1): quem <b>causa</b> a batida é punido; quem foi atingido não (e quase não leva dano: o causador absorve o dano e a perda de velocidade). A gravidade vem da diferença de velocidade no impacto: <b>leve +3 s</b>, <b>média +6 s</b> e <b>grave</b> (uns 80 km/h a mais na traseira de quem estava na frente) <b>stop-and-go de 8 s</b>. No stop-and-go você tem 3 voltas: aperte <b>B</b>, entre no box, fique parado 8 s, sem trocar o pneu, e volte (o HUD mostra "Stop-and-go 8 s: cumpra em 3 voltas"). Não cumpriu? <b>Bandeira preta</b>: desclassificado (DSQ). Se a punição cai na última volta, ou não sobram voltas para cumprir, vira <b>+20 s</b> no tempo final. Da <b>2ª à 5ª batida causada</b>, a punição sobe um nível (leve vira média, média vira stop-and-go); a <b>6ª é bandeira preta</b>. Toque lado a lado, sem um culpado claro, ninguém é punido.</li>
  <li><b>Fim de semana de GP</b> (regras de F1): com a classificação ligada, o Q1, o Q2 e o Q3 são voltas lançadas com o relógio (a volta conta de uma passagem pela linha à outra; ✔ Pronto fecha a sessão quando todos terminam) e os mais lentos são eliminados; a ordem dos tempos vira o grid de 20 carros, com robôs que são os pilotos reais de 2026. A largada é nas <b>cinco luzes</b>: acendem uma por segundo e apagam juntas depois de uma espera sorteada. Sair antes de apagarem (queimar a largada) custa <b>+5 s</b>. No fim, o pódio e os pontos oficiais (25, 18, 15, 12, 10, 8, 6, 4, 2, 1); quem não faz 90% das voltas é NC.</li>
  <li><b>Fantasma do recorde:</b> a sua volta mais rápida em cada pista fica salva neste aparelho. Nas próximas corridas, um carro dourado refaz essa volta com você, e o placar mostra quantos segundos você está na frente (verde) ou atrás (vermelho).</li>
  <li><b>Relevo:</b> subida freia, descida embala, e numa lombada rápida o carro voa. No ar ele não acelera nem vira direito, então chegue alinhado.</li>
  <li><b>DRS e ERS (F1):</b> o DRS abre sozinho na zona se você cruzou a detecção a menos de 1 s do carro da frente, depois das duas primeiras voltas e sem bandeira. A bateria ERS recarrega ao frear; no modo manual, segure E ou o botão ERS para acelerar. Bandeira amarela e safety car exigem reduzir e manter a posição.</li>
  <li><b>Freie antes da curva.</b> O pneu só segura até certo ponto: entrou rápido demais, o carro escorrega para fora (sai fumaça e o pneu canta) e perde velocidade. Fora do asfalto ele fica lento; em Mônaco e em Tóquio tem muro.</li>
  <li>A volta só conta passando pela pista inteira, na ordem. Atalho e contramão não valem.</li>
  <li>Quando o primeiro cruza a chegada, os outros têm 1 minuto para terminar.</li></ul>
  <h3>Carros</h3><ul>${Object.values(CARROS).map((k) => `<li><b>${h(k.name)}:</b> ${h(k.desc)}</li>`).join("")}</ul>
  <h3>Pistas</h3><ul>
  <li><b>Mônaco:</b> estreita, com guard-rail colado, a subida da Beau Rivage até o Cassino, a descida até o grampo e o porto cheio de iates.</li>
  <li><b>Interlagos:</b> larga e rápida: a descida do S do Senna, a lombada da Reta Oposta (dá para voar!), o Mergulho e a subida dos boxes.</li>
  <li><b>Monza:</b> o Templo da Velocidade: reta dos boxes com o pódio sobre a pista, as chicanes, a Curva Grande, as Lesmo, a velha pista inclinada ao lado, a reta de trás e a Parabolica, tudo dentro do parque e com a torcida vermelha da Ferrari.</li>
  <li><b>Barcelona:</b> autódromo largo de verdade: a reta dos boxes, a curva 3 longa, a subida até a Campsa cega no alto, a La Caixa e as curvas finais, com brita do lado de fora.</li>
  <li><b>Silverstone:</b> o aeródromo inglês, plano e muito rápido: o S de Maggotts, Becketts e Chapel, a Hangar Straight e Stowe, com brita e área de escape larga em volta.</li>
  <li><b>Tóquio:</b> de noite, entre os prédios de neon, com dois viadutos, uma rampa de pulo e o Fuji no horizonte.</li></ul>
  <p>Rio de Janeiro, Serra Verde e Deserto Dourado oferecem voltas mais longas. Os balizadores das curvas cedem ao toque.</p>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });
