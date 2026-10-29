// Corrida da Galera — telas fora da corrida: sala de espera, garagem e "como jogar".
import { E, PISTAS, CARROS, sample, carOf, specDaEquipe, COLORS, PAWNS, $, h, me, act, fmt, store } from "./estado.js";
import { THEMES } from "./pista.js";
import { MODS3, MODS_PADRAO, carPreview } from "./carros.js";
import { loadBest } from "./fantasma.js";
import { f1Pronto } from "./f1.js";
const EQUIPES_F1 = window.EQUIPES_F1 || {};
const marcaEquipe = (id) => {
  const e = EQUIPES_F1[id]; if (!e) return "";
  return `<span class="equipe-marca" style="--equipe:${e.cor}"><span class="sigla">${h(e.sigla)}</span>${e.arquivo ? `<img data-logo-f1 src="/api/corrida/logo/${id}" alt="" loading="lazy">` : ""}</span>`;
};
document.addEventListener("error", (ev) => { if (ev.target.matches?.("img[data-logo-f1]")) ev.target.remove(); }, true);
const logosEquipes = document.getElementById("logosEquipes");
if (logosEquipes) logosEquipes.innerHTML = Object.entries(EQUIPES_F1).map(([id, e]) => `<span class="equipe-mini" style="--equipe:${e.cor}">${marcaEquipe(id).replace(" loading=\"lazy\"", "")}<span>${h(e.nome)}</span></span>`).join(""); // a faixa da entrada carrega já (fica abaixo da dobra em tela baixa)
f1Pronto.then(() => { if (E.S && E.S.phase === "lobby") renderLobby(); }); // refaz as fotos dos carros com o modelo 3D

export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
  document.body.classList.toggle("sala-escura", id === "home" || id === "lobby"); // as telas da sala usam o fundo escuro de sala de controle
}

// ---------- sala de espera: o painel da sala, no tema da Carreira F1 ----------
// Em cima, o código da sala, as abas (Painel, Pistas, Garagem, Equipe, Pintura, Regras; no celular viram a barra de baixo) e o botão
// Largar. O Painel é um dashboard: a pista, o meu carro, as regras e, na coluna da direita, a tabela de jogadores. Cada aba é uma tela
// inteira de cartões (as abas, Q, E e o Esc também trocam). O organizador escolhe pista e regras; todo mundo escolhe carro, cor e piloto.
let aba = "box";
const ABAS = { box: "Painel", pista: "Pistas", garagem: "Garagem", equipe: "Equipe", pintura: "Pintura", regras: "Regras" };
const abasAtivas = () => Object.keys(ABAS).filter((k) => k !== "equipe" || (E.S && E.S.config.regras === "f1")); // a aba da equipe só existe nas regras de F1
const NIVEL = { facil: "fácil", medio: "médio", dificil: "difícil" };
function abrir(qual) {
  aba = ABAS[qual] ? qual : "box";
  $("hub").classList.toggle("hidden", aba !== "box");
  document.querySelectorAll("[data-painel]").forEach((p) => p.classList.toggle("hidden", p.dataset.painel !== aba));
  document.querySelectorAll("#hubAbas [data-aba]").forEach((b) => b.classList.toggle("on", b.dataset.aba === aba));
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b && !b.disabled && $("lobby").contains(b)) abrir(b.dataset.aba); });
document.addEventListener("keydown", (e) => {
  if ($("lobby").classList.contains("hidden") || e.target.tagName === "INPUT") return;
  if (e.key === "Enter" && e.target.matches?.(".sl-card[data-aba]")) { abrir(e.target.dataset.aba); e.preventDefault(); return; }
  if (e.key === "Escape" && aba !== "box") { abrir("box"); e.preventDefault(); }
  const ks = abasAtivas(), i = ks.indexOf(aba);
  if (e.key === "q" || e.key === "Q") abrir(ks[(i - 1 + ks.length) % ks.length]);
  if (e.key === "e" || e.key === "E") abrir(ks[(i + 1) % ks.length]);
});
const chip = (txt, cls = "") => `<span class="chip ${cls}">${txt}</span>`;
const plural = (n, s) => `${n} ${s}${n > 1 ? "s" : ""}`;

export function renderLobby() {
  const m = me(), isHost = m && E.S.host === m.id, c = E.S.config, t = PISTAS[c.pista], dis = isHost ? "" : "disabled", f1 = c.regras === "f1";
  const robos = Math.min(c.robos || 0, (f1 ? 20 : 8) - E.S.players.length), total = E.S.players.length + robos;
  const recorde = loadBest(c.pista);
  // topo: o código da sala e quantos carros vão para o grid
  $("slCodigo").textContent = E.S.code; $("hubSala").textContent = `${plural(total, "carro")} no grid`;
  // cartão do meu carro
  if (m) { const k = carOf(m); $("hubCarNome").textContent = k.name; $("hubClasse").textContent = k.inspo || ""; carPreview($("tileCarro"), m.color, m.car, m.mods); }
  else { $("hubCarNome").textContent = "Assistindo"; $("hubClasse").textContent = "só para ver"; }
  $("hubPawn").textContent = m ? m.pawn : "👀"; $("hubNome").textContent = m ? m.name : "Torcida";
  document.querySelectorAll('#lobby [data-aba="garagem"], #lobby [data-aba="pintura"], #lobby [data-aba="equipe"]').forEach((b) => { if (b.tagName === "BUTTON") b.disabled = !m; });
  // a equipe e a montagem do carro (regras de F1)
  document.querySelectorAll('#lobby [data-aba="equipe"]').forEach((b) => b.classList.toggle("hidden", !f1));
  if (f1 && m && window.Radio) window.Radio.uma("lobby:f1", () => window.Radio.dizer("boasvindas"));
  if (f1 && m) {
    const eq = m.equipe && window.F1Equipes.EQUIPES[m.equipe], sobra = eq ? window.F1Equipes.sobra(m.equipe, E.S.montagens && E.S.montagens[m.equipe] || window.F1Equipes.montagemPadrao(m.equipe)) : 0;
    $("tileEquipeTxt").innerHTML = eq ? `${marcaEquipe(m.equipe)}<span><b>${h(window.F1Pilotos.EQUIPES[m.equipe].nome)}</b> ${eq.orcamento} pontos${sobra ? ` · sobram ${sobra}` : ""}</span>` : "Escolha a sua equipe e monte o carro";
  }
  renderEquipe(m, f1);
  if (aba === "equipe" && !f1) abrir("box");
  // cartão da pista
  const pint = (m && MODS3.pintura[(m.mods || MODS_PADRAO).pintura]) || MODS3.pintura.propria;
  drawPreview($("tileMapa"), c.pista);
  $("tileMapaTxt").textContent = t.name; $("tileMapaSub").textContent = t.sub;
  const dadosPista = chip(plural(c.voltas, "volta")) + chip(c.hora === "noite" ? "Noite" : "Dia") + (recorde ? chip(`Recorde ${fmt(recorde.t)}`, "ouro") : "");
  $("tileMapaDados").innerHTML = dadosPista;
  // cartão das regras: as opções em pílulas
  $("tileRegrasTxt").innerHTML = chip(f1 ? "Fórmula 1" : "Corrida da Galera", f1 ? "vm" : "") + chip(`Câmbio ${c.cambio === "manual" ? "manual" : "automático"}`)
    + (f1 ? chip(c.classificacao === "pular" ? "Sem classificação" : "Classificação") + chip(`ERS ${c.ers === "manual" ? "manual" : "auto"}`) : chip(c.caixas ? "Caixas ligadas" : "Sem caixas") + chip(c.equilibrio !== false ? "Equilíbrio" : "Sem equilíbrio"))
    + (robos ? chip(`${plural(robos, "robô")} · ${NIVEL[c.nivel] || "médio"}`, "azul") : chip("Sem robôs"));
  $("tilePilotoTxt").innerHTML = m ? `<span class="faixas"><i style="background:${pint.c || m.color}"></i><i style="background:${pint.c2}"></i></span>` : "";
  // botão Largar
  $("tLargarTit").textContent = isHost ? "Largar" : "No grid";
  $("tLargarTxt").textContent = isHost ? `${t.name} · ${plural(c.voltas, "volta")}` : "Esperando o organizador";
  $("btnStart").disabled = !isHost;
  $("btnStart").onclick = () => isHost && act("start");
  // a tabela de jogadores: zebrada, com a equipe e o estado de cada um
  $("slContagem").textContent = `${total}/${f1 ? 20 : 8}`;
  const FP = window.F1Pilotos;
  const equipeDe = (p) => (f1 && p.equipe && FP && FP.EQUIPES[p.equipe]) ? `${marcaEquipe(p.equipe)}<span>${h(FP.EQUIPES[p.equipe].nome)}</span>` : `<span>${h(carOf(p).name)}</span>`;
  $("pilots").innerHTML = `<div class="sl-tab-cab"><span>#</span><span>Piloto</span><span>Equipe</span><span>Estado</span></div>`
    + E.S.players.map((p, i) => `<div class="sl-linha ${m && p.id === m.id ? "eu" : ""}" style="--c:${p.color}"><span class="n">${i + 1}</span><span class="nome"><span class="av">${p.pawn}</span><span><b>${h(p.name)}</b>${m && p.id === m.id ? "<small>você</small>" : ""}</span></span><span class="eq">${equipeDe(p)}</span><span class="est">${p.id === E.S.host ? `<em class="org">Org.</em>` : p.online ? `<em class="ok">Pronto</em>` : `<em class="off">Offline</em>`}${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" aria-label="Tirar ${h(p.name)} da sala">✕</button>` : ""}</span></div>`).join("")
    + (robos ? `<div class="sl-linha robo" style="--c:#9aa1ad"><span class="n">+</span><span class="nome"><span class="av">🤖</span><span><b>${plural(robos, "robô")}</b><small>nível ${NIVEL[c.nivel] || "médio"}</small></span></span><span class="eq"><span>${f1 ? "Pilotos de 2026" : "Computador"}</span></span><span class="est"><em class="ok">Na largada</em></span></div>` : "");
  $("pilots").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  $("slStatus").innerHTML = `<h3 class="sl-tit"><span>Status</span></h3><div class="sl-status-corpo"><i class="sl-led ${isHost ? "ok" : "espera"}"></i><div><b>${!m ? "Você está assistindo" : isHost ? "Pronto para largar" : "Esperando a largada"}</b><small>${t.name} · ${plural(c.voltas, "volta")} · ${plural(total, "carro")}</small></div></div><p class="hint">Mande o código <b>${E.S.code}</b> para a galera. Dá para correr sozinho, contra o relógio ou contra robôs.</p>`;
  // tela das pistas: os cartões e o detalhe da escolhida à direita
  $("cfgPistas").innerHTML = `<div class="tracks">${Object.entries(PISTAS).map(([id, p]) => `<button class="track ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis} aria-pressed="${c.pista === id}"><canvas data-prev="${id}" width="240" height="240"></canvas><span class="track-txt"><b>${h(p.name)}</b><small>${h(p.sub)}</small></span>${loadBest(id) ? `<small class="rec">Recorde ${fmt(loadBest(id).t)}</small>` : ""}</button>`).join("")}</div>`;
  $("cfgPistas").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  $("cfgPistas").querySelectorAll("[data-pista]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, pista: b.dataset.pista } })));
  $("pistaDetalhe").innerHTML = `<h3 class="sl-tit"><span>Pista escolhida</span></h3><canvas id="pistaGrande" width="640" height="640"></canvas><div class="sl-detalhe-txt"><small>${h(t.sub)}</small><b>${h(t.name)}</b><div class="sl-chips">${dadosPista}</div>${isHost ? "" : `<p class="hint">Só o organizador escolhe a pista.</p>`}</div>`;
  drawPreview($("pistaGrande"), c.pista);
  // tela das regras: um cartão por opção, em três grupos
  const seg = (itens, atual, attr, dsb = dis) => `<div class="seg">${itens.map(([v, l]) => `<button data-${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dsb}>${l}</button>`).join("")}</div>`;
  const campo = (rot, corpo, nota) => `<div class="field"><label>${rot}</label>${corpo}${nota ? `<small>${nota}</small>` : ""}</div>`;
  const grupo = (tit, campos) => (campos ? `<section class="sl-grupo"><h3 class="sl-sub">${tit}</h3><div class="sl-regras">${campos}</div></section>` : "");
  const gCorrida = campo("Horário da pista", seg([["dia", "☀️ Dia"], ["noite", "🌙 Noite"]], c.hora === "noite" ? "noite" : "dia", "hora"), "Disponível em todas as pistas.")
    + campo("Voltas", seg([1, 2, 3, 5, 10, 21].map((v) => [v, v]), c.voltas, "v"))
    + campo("Câmbio", seg([["auto", "Automático"], ["manual", "Manual"]], c.cambio || "auto", "cambio"), "Manual para todo mundo: Shift sobe a marcha, Ctrl direito reduz (no celular, os botões + e −). Os robôs continuam no automático.")
    + campo("Regras", seg([["galera", "Corrida da Galera"], ["f1", "Fórmula 1"]], c.regras || "galera", "regras"), "Fórmula 1: pneus macio, médio e duro, paradas nos boxes, sem caixas de itens nem ajuda do pelotão. Os robôs usam os mesmos pneus.");
  const gF1 = f1 ? (m ? campo("Seu pneu na largada", `<div class="seg">${Object.entries(window.F1Regras.PNEUS).map(([v, p]) => `<button data-pneu="${v}" class="${(m.pneu || "medio") === v ? "on" : ""}"><i class="bola-pneu" style="--c:${p.cor}"></i>${p.nome}</button>`).join("")}</div>`, "Você também pode escolher o pneu no grid, após a classificação. O macio tem mais aderência, mas dura só uma volta e meia; o médio dura de 3 a 4 voltas; o duro passa de 6; o de chuva é o melhor na pista molhada (no seco derrete em 2 ou 3 voltas). Passou da vida, o pneu despenca: o carro fica lento e escorrega nas curvas.") : "")
    + campo("ERS", seg([["auto", "Automático"], ["manual", "Manual (E)"]], c.ers === "manual" ? "manual" : "auto", "ers"), "A bateria recarrega na frenagem. No manual, mantenha E ou o botão ERS pressionado para desdobrar.")
    + campo("Classificação", seg([["completa", "Q1, Q2 e Q3"], ["pular", "Pular"]], c.classificacao === "pular" ? "pular" : "completa", "quali"), "Voltas lançadas com o relógio: o Q1 tira os 5 mais lentos, o Q2 mais 5 e o Q3 decide a pole. A ordem dos tempos é o grid. Pulando, o grid segue a ordem dos pilotos da sala (humanos primeiro).") : "";
  const gGrid = (f1 ? "" : campo("Caixas de itens", `<div class="seg"><button data-opt="caixas" class="${c.caixas ? "on" : ""}" ${dis}>${c.caixas ? "🎁 Ligadas" : "Desligadas"}</button></div>`, "Banana, cascos, cogumelo, estrela e bomba espalhados pela pista."))
    + campo("Robôs", seg((f1 ? [0, 1, 3, 7, 11, 19] : [0, 1, 3, 5, 7]).map((v) => [v, v === 19 && f1 ? "Grid de 20" : v ? v : "Sem"]), c.robos || 0, "robos")
      + (c.robos ? seg([["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]], c.nivel || "medio", "nivel") : ""),
      f1 ? "Os robôs são os pilotos reais de 2026, com as cores das equipes. O grid tem 20 carros (humanos e robôs); \"Grid de 20\" completa o que faltar." : "Pilotos do computador entram no grid (até completar 8 carros), seguem o traçado de corrida, pegam caixas e usam itens.")
    + (f1 ? "" : campo("Equilíbrio", `<div class="seg"><button data-opt="equilibrio" class="${c.equilibrio !== false ? "on" : ""}" ${dis}>${c.equilibrio !== false ? "Ligado" : "Desligado"}</button></div>`, "Pequena ajuda de velocidade para quem ficou longe do pelotão."));
  $("cfg").innerHTML = grupo("Corrida", gCorrida) + grupo("Fórmula 1", gF1) + grupo("Grid e robôs", gGrid) + (isHost ? "" : `<p class="hint">Só o organizador muda as regras.</p>`);
  $("cfg").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, voltas: +b.dataset.v } })));
  $("cfg").querySelectorAll("[data-hora]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, hora: b.dataset.hora } })));
  $("cfg").querySelectorAll("[data-cambio]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, cambio: b.dataset.cambio } })));
  $("cfg").querySelectorAll("[data-regras]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, regras: b.dataset.regras } })));
  $("cfg").querySelectorAll("[data-pneu]").forEach((b) => (b.onclick = () => act("pneu", { pneu: b.dataset.pneu })));
  $("cfg").querySelectorAll("[data-ers]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, ers: b.dataset.ers } })));
  $("cfg").querySelectorAll("[data-quali]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, classificacao: b.dataset.quali } })));
  $("cfg").querySelectorAll("[data-robos]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, robos: +b.dataset.robos } })));
  $("cfg").querySelectorAll("[data-nivel]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, nivel: b.dataset.nivel } })));
  $("cfg").querySelectorAll("[data-opt]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, [b.dataset.opt]: !E.S.config[b.dataset.opt] } })));
  // telas da garagem e da pintura (só de quem corre)
  if (m) {
    const k = carOf(m);
    carPreview($("garCarro"), m.color, m.car, m.mods); $("garClasse").textContent = k.inspo || ""; $("garNome").textContent = k.name;
    $("garSpec").innerHTML = `<p class="desc">${h(k.desc)}</p>` + specRows(k).map(([lbl, n]) => `<span>${lbl}</span>${leds(n)}`).join("");
    $("colorPick").innerHTML = COLORS.map((col) => { const taken = E.S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""} ${taken ? "taken" : ""}" data-c="${col}" ${taken ? "disabled" : ""} style="background:${col}" aria-label="Cor ${col}"></button>`; }).join("");
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("color", { color: b.dataset.c })));
    $("carPick").innerHTML = f1 && m.equipe ? `<p class="hint" style="grid-column:1/-1">Nas regras de Fórmula 1 o carro é o da sua equipe: ${h(k.name)}. Monte as peças na aba Equipe.</p>` : Object.entries(CARROS).map(([id, kk]) => `<button class="car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><span class="car-txt"><b>${h(kk.name)}</b><small class="inspo">${h(kk.inspo || "")}</small></span></button>`).join("");
    $("carPick").querySelectorAll("[data-carprev]").forEach((cv) => carPreview(cv, m.color, cv.dataset.carprev, m.mods));
    $("carPick").querySelectorAll("[data-car]").forEach((b) => (b.onclick = () => act("car", { car: b.dataset.car })));
    // as pinturas: cada uma com a foto do carro pintado e as duas cores
    const atual = (m.mods || MODS_PADRAO).pintura || "propria";
    carPreview($("pintCarro"), m.color, m.car, m.mods); $("pintNome").textContent = pint.name;
    $("modPick").innerHTML = Object.entries(MODS3.pintura).map(([id, p]) => `<button class="pint ${atual === id ? "on" : ""}" data-pintura="${id}" aria-pressed="${atual === id}"><canvas data-pintprev="${id}" width="240" height="135"></canvas><span class="faixas"><i style="background:${p.c || m.color}"></i><i style="background:${p.c2}"></i></span><span class="equipe-logo">${marcaEquipe(p.equipe)}<b>${h(p.name)}</b></span></button>`).join("");
    $("modPick").querySelectorAll("[data-pintprev]").forEach((cv) => carPreview(cv, m.color, m.car, { pintura: cv.dataset.pintprev }));
    $("modPick").querySelectorAll("[data-pintura]").forEach((b) => (b.onclick = () => act("mods", { mods: { pintura: b.dataset.pintura } })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = E.S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-p="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
  } else if (aba === "garagem" || aba === "pintura") abrir("box");
}
// ---------- a equipe e a montagem do carro (regras de F1; as contas em f1-equipes.js) ----------
// Cada equipe de 2026 tem um orçamento em pontos para as seis peças (1 ponto por nível, de 0 a 8). Dois amigos podem dividir a
// mesma equipe (um em cada carro, com o mesmo carro); quem entrou primeiro é o chefe e distribui os pontos. O servidor confere.
function renderEquipe(m, f1) {
  const host = $("equipePainel"); if (!host) return;
  const F = window.F1Equipes, FP = window.F1Pilotos;
  if (!f1) { host.innerHTML = `<p class="hint">As equipes e a montagem do carro valem nas regras de Fórmula 1 (o organizador liga em Regras).</p>`; return; }
  if (!m) { host.innerHTML = `<p class="hint">Você entrou só para assistir.</p>`; return; }
  const humanos = (id) => E.S.players.filter((p) => !p.bot && p.equipe === id);
  const times = Object.entries(F.EQUIPES).map(([id, q]) => {
    const e = FP.EQUIPES[id], gente = humanos(id), cheia = gente.length >= 2 && m.equipe !== id;
    return `<button class="time ${m.equipe === id ? "on" : ""}" data-equipe="${id}" ${cheia ? "disabled" : ""} style="--equipe:${e.cor}" aria-pressed="${m.equipe === id}">${marcaEquipe(id)}<b>${h(e.nome)}</b><span class="pts">${q.orcamento} pontos</span><small>${h(q.nota)}</small>${gente.length ? `<small class="gente">${gente.map((p) => h(p.name)).join(" e ")}${cheia ? " (lotada)" : ""}</small>` : ""}</button>`;
  }).join("");
  let carro = "";
  if (m.equipe) {
    const eq = m.equipe, orc = F.EQUIPES[eq].orcamento, mont = (E.S.montagens && E.S.montagens[eq]) || F.montagemPadrao(eq), usado = F.custoDaMontagem(mont), sobra = orc - usado;
    const chefeId = E.S.chefes && E.S.chefes[eq], chefe = E.S.players.find((p) => p.id === chefeId), souChefe = chefeId === m.id, spec = specDaEquipe(eq);
    const GA = window.F1Garagem, pecasEscolhidas = window.F1Pecas.pecasDe(eq, mont, E.S.pecasEq && E.S.pecasEq[eq]);
    const linhas = GA.pecasHTML({ equipe: eq, bonus: 0, pecas: pecasEscolhidas, pode: souChefe, motivo: `Quem monta o carro é ${chefe ? chefe.name : "o chefe da equipe"}.`, aviso: E.S.pecasEq && E.S.pecasEq[eq] ? "" : "Este carro usa os pontos padrão da equipe: mostramos as peças mais parecidas. Ao trocar uma peça, ele passa a ser montado por elas." });
    carro = `<h3>Montar o carro · ${h(FP.EQUIPES[eq].nome)}</h3>
      <div class="garagem-equipe"><div class="foto"><canvas id="equipeCarro" width="240" height="135"></canvas><b>${h(spec.desc)}</b><small>${h(spec.inspo)}</small></div>
        <div class="orcamento"><div class="barra" role="img" aria-label="${usado} de ${orc} pontos usados"><i style="width:${(usado / orc) * 100}%"></i></div><b>${sobra ? `Sobram ${sobra} ponto${sobra > 1 ? "s" : ""}` : "Orçamento todo usado"}</b><small>${usado} de ${orc} pontos${souChefe ? "" : ` · quem monta é ${h(chefe ? chefe.name : "o chefe")}`}</small>
          ${souChefe ? `<button class="small ghost" data-padrao ${E.S.montagens && E.S.montagens[eq] ? "" : "disabled"}>Voltar ao carro da equipe</button>` : ""}</div></div>
      ${linhas}
      <div class="spec ficha-equipe">${F.ficha(spec).map((f) => `<span>${f.rotulo}</span>${leds(f.nota)}`).join("")}</div>
      <small class="hint">Velocidade final ${Math.round(spec.vmax)} · aceleração ${spec.acc.toFixed(0)} · freio ${Math.round(spec.brake)} · aderência ${Math.round(spec.grip)} · chance de quebrar ${Math.round(spec.quebra * 100)}% · DRS ×${spec.drs.toFixed(2)} · pneu gasta ×${spec.desgaste.toFixed(2)}.</small>`;
  }
  host.innerHTML = `<div class="eq-layout"><div class="eq-times"><p class="hint">Escolha a sua equipe de 2026. Cada uma tem um orçamento de pontos para as peças do carro; os robôs da equipe correm com o mesmo carro, e dois amigos podem dividir a mesma equipe (um em cada carro).</p><div class="times">${times}</div></div>${carro ? `<aside class="eq-carro">${carro}</aside>` : ""}</div>`;
  host.querySelectorAll("[data-equipe]").forEach((b) => (b.onclick = () => act("equipe", { id: m.equipe === b.dataset.equipe ? null : b.dataset.equipe })));
  if (!m.equipe) return;
  const eq = m.equipe, mont = (E.S.montagens && E.S.montagens[eq]) || F.montagemPadrao(eq);
  const GAc = window.F1Garagem, pecasAtuais = window.F1Pecas.pecasDe(eq, mont, E.S.pecasEq && E.S.pecasEq[eq]);
  host.querySelectorAll("[data-pcat]").forEach((b) => (b.onclick = () => act("montagem", { pecas: GAc.cliquePeca(b, pecasAtuais) })));
  const pad = host.querySelector("[data-padrao]"); if (pad) pad.onclick = () => act("montagem", { montagem: null });
  const cv = $("equipeCarro"); if (cv) carPreview(cv, m.color, m.car, m.mods);
}
// ficha do carro (de 1 a 10 LEDs): velocidade final, aceleração, aderência na curva e resistência (muro e grama)
const lerp10 = (v, a, b) => Math.max(1, Math.min(10, Math.round(1 + ((v - a) / (b - a)) * 9)));
const specRows = (k) => [["Velocidade", lerp10(k.vmax, 245, 355)], ["Aceleração", lerp10(k.acc, 52, 115)], ["Aderência", lerp10(k.grip, 350, 570)], ["Resistência", lerp10(k.wall * 100 + k.offMax * 0.4, 85, 150)]];
const leds = (n) => `<span class="leds" role="img" aria-label="${n} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? (i < 6 ? "g" : i < 8 ? "y" : "r") : ""}"></i>`).join("")}</span>`;
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
  <li><b>Teclado:</b> ↑ ou W acelera, ↓ ou S freia (e dá ré), ← → ou A D viram. Espaço ou E usa o item; freio + Espaço joga para trás. R volta para a pista. C troca a câmera (perto, primeira pessoa, longe e de cima).</li>
  <li><b>Controle (Xbox/PlayStation):</b> RT (ou A) acelera, LT (ou B) freia e dá ré, analógico esquerdo vira, RB usa o item, Y troca a câmera e Select (ou LB) volta para a pista.</li>
  <li><b>Celular:</b> ◀ ▶ à esquerda viram; ▲ acelera e ▼ freia à direita. Toque no botão 🎁 para usar o item.</li>
  <li><b>Câmbio manual</b> (se o organizador ligar nas Regras): Shift sobe a marcha e Ctrl direito reduz; no controle, X sobe e B reduz. As luzes em cima do velocímetro acendem perto do corte: troque quando ficarem azuis.</li>
  <li><b>↺ Pista:</b> se rodar, ficar preso ou entrar na contramão, volta para o meio da pista.</li></ul>
  <h3>A corrida</h3><ul>
  <li>Largada igual para todo mundo: 3, 2, 1… vai! Ganha quem completar as voltas primeiro.</li>
  <li>Os carros <b>batem de verdade</b>: quem encosta empurra e é empurrado. O tanque é pesado e leva os outros embora; a formiga é leve e sai rodando. Num viaduto ou no ar, um passa por cima do outro.</li>
  <li><b>Vácuo:</b> logo atrás de outro carro, na mesma linha, o seu anda mais (a barra de vácuo aparece embaixo). Ficou mais de 1 segundo no vácuo e saiu de trás para ultrapassar? Ganha o <b>estilingue</b>, um empurrão curto.</li>
  <li><b>Caixas opcionais:</b> bananas, cascos verde e vermelho, cogumelo, estrela e bomba da Batalha. O organizador liga as caixas na sala.</li>
  <li><b>Equilíbrio:</b> quem estiver muito atrás recebe um pequeno ganho de aceleração e velocidade. A ajuda diminui perto da chegada.</li>
  <li><b>Regras de F1</b> (se o organizador ligar nas Regras): os pneus gastam por volta (o macio dura uma volta e meia, o médio de 3 a 4, o duro 6 ou mais; escorregar e travar a roda gasta mais) e esfriam na largada e na saída do box: pneu frio segura menos por alguns segundos. O anel do pneu, ao lado do velocímetro, esvazia até 0% no fim da vida e fica vermelho: dali o pneu despenca (menos aderência, tração e freio, e cada volta a mais custa muitos segundos). Com o pneu frio, o miolo fica azul. Escolha o composto da largada nas Regras. <b>Cada piloto tem só 2 jogos de cada composto por corrida</b> (macio, médio e duro), contando o da largada: no box o jogo esgotado fica indisponível e o HUD mostra quantos restam.</li>
  <li><b>Box</b> (regras de F1): aperte <b>B</b> (ou toque em "🔧 Box") e o carro entra no corredor dos boxes na próxima passagem pela entrada; B de novo passa para o outro composto e, no fim, cancela; 1, 2 e 3 escolhem macio, médio e duro. No corredor o carro anda sozinho no limitador (40% da velocidade final), para na garagem uns 2,4 s (mais o erro dos mecânicos, até 1,5 s) e sai com o pneu novo, ainda frio. Dá para parar da volta 1 até a penúltima. <b>Quem termina a corrida sem ter usado dois compostos diferentes leva +10 s.</b> A torre mostra o pneu de cada um, quantas paradas fez e quem está no box.</li>
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
