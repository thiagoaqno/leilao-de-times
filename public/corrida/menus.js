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
if (logosEquipes) logosEquipes.innerHTML = Object.entries(EQUIPES_F1).map(([id, e]) => `<span class="equipe-mini" style="--equipe:${e.cor}">${marcaEquipe(id)}<span>${h(e.nome)}</span></span>`).join("");
f1Pronto.then(() => { if (E.S && E.S.phase === "lobby") renderLobby(); }); // refaz as fotos dos carros com o modelo 3D

export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
}

// ---------- sala de espera: o "box", em blocos coloridos ----------
// Em cima, o carro e o piloto; embaixo, as abas e os blocos: Garagem, Mapa das pistas, Largar, Regras, Piloto e quem
// está na sala. Cada bloco abre o seu painel (as abas e o Esc também). O organizador escolhe pista e regras; todo mundo
// escolhe carro, cor e piloto.
let aba = "box";
const ABAS = { box: "Box", pista: "Pistas", garagem: "Garagem", equipe: "Equipe", pintura: "Pintura", regras: "Regras" };
const abasAtivas = () => Object.keys(ABAS).filter((k) => k !== "equipe" || (E.S && E.S.config.regras === "f1")); // a aba da equipe só existe nas regras de F1
const NIVEL = { facil: "fácil", medio: "médio", dificil: "difícil" };
function abrir(qual) {
  aba = ABAS[qual] ? qual : "box";
  $("hub").classList.toggle("hidden", aba !== "box");
  document.querySelectorAll("[data-painel]").forEach((p) => p.classList.toggle("hidden", p.dataset.painel !== aba));
  document.querySelectorAll("#hubAbas [data-aba]").forEach((b) => b.classList.toggle("on", b.dataset.aba === aba));
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b && !b.disabled && $("lobby").contains(b)) abrir(b.dataset.aba); });
document.addEventListener("keydown", (e) => {
  if ($("lobby").classList.contains("hidden") || e.target.tagName === "INPUT") return;
  if (e.key === "Escape" && aba !== "box") { abrir("box"); e.preventDefault(); }
  const ks = abasAtivas(), i = ks.indexOf(aba);
  if (e.key === "q" || e.key === "Q") abrir(ks[(i - 1 + ks.length) % ks.length]);
  if (e.key === "e" || e.key === "E") abrir(ks[(i + 1) % ks.length]);
});
$("hubAnt").onclick = () => { const ks = abasAtivas(); abrir(ks[(ks.indexOf(aba) - 1 + ks.length) % ks.length]); };
$("hubProx").onclick = () => { const ks = abasAtivas(); abrir(ks[(ks.indexOf(aba) + 1) % ks.length]); };

export function renderLobby() {
  const m = me(), isHost = m && E.S.host === m.id, c = E.S.config, t = PISTAS[c.pista], dis = isHost ? "" : "disabled", f1 = c.regras === "f1";
  const robos = Math.min(c.robos || 0, (c.regras === "f1" ? 20 : 8) - E.S.players.length);
  // cabeçalho: o carro (foto 3D) e o piloto
  if (m) { const k = carOf(m); $("hubCarNome").textContent = k.name; $("hubClasse").textContent = k.inspo || ""; carPreview($("hubCarro"), m.color, m.car, m.mods); }
  else { $("hubCarNome").textContent = "Assistindo"; $("hubClasse").textContent = "você entrou só para ver"; }
  $("hubPawn").textContent = m ? m.pawn : "👀"; $("hubNome").textContent = m ? m.name : "Torcida"; $("hubSala").textContent = `Sala ${E.S.code} · ${E.S.players.length + robos} no grid`;
  document.querySelectorAll('#hubAbas [data-aba="garagem"], #hubAbas [data-aba="pintura"], .tile[data-aba="garagem"], .tile[data-aba="pintura"]').forEach((b) => (b.disabled = !m));
  // a equipe e a montagem do carro (regras de F1)
  document.querySelectorAll('[data-aba="equipe"]').forEach((b) => { b.classList.toggle("hidden", !f1); b.disabled = !m; });
  if (f1 && m) {
    const eq = m.equipe && window.F1Equipes.EQUIPES[m.equipe], sobra = eq ? window.F1Equipes.sobra(m.equipe, E.S.montagens && E.S.montagens[m.equipe] || window.F1Equipes.montagemPadrao(m.equipe)) : 0;
    $("tileEquipeTxt").textContent = eq ? `${window.F1Pilotos.EQUIPES[m.equipe].nome} · ${eq.orcamento} pontos${sobra ? ` (sobram ${sobra})` : ""}` : "Escolha a sua equipe e monte o carro";
  }
  renderEquipe(m, f1);
  if (aba === "equipe" && !f1) abrir("box");
  // os blocos
  const pint = (m && MODS3.pintura[(m.mods || MODS_PADRAO).pintura]) || MODS3.pintura.propria;
  if (m) { carPreview($("tileCarro"), m.color, m.car, m.mods); $("tileCarroTxt").textContent = carOf(m).name; }
  drawPreview($("tileMapa"), c.pista);
  $("tileMapaTxt").textContent = t.name; $("tileMapaSub").textContent = t.sub;
  $("tileRegrasTxt").innerHTML = `${c.voltas} volta${c.voltas > 1 ? "s" : ""} · ${c.hora === "noite" ? "noite" : "dia"} · câmbio ${c.cambio === "manual" ? "manual" : "automático"}<br>${f1 ? `regras de F1 · ${c.classificacao === "pular" ? "sem classificação" : "classificação"} · luzes` : c.caixas ? "caixas ligadas" : "sem caixas"}<br>${robos ? `${robos} robô${robos > 1 ? "s" : ""} (${NIVEL[c.nivel] || "médio"})` : "sem robôs"}`;
  $("tilePilotoTxt").innerHTML = m ? `<span class="faixas"><i style="background:${pint.c || m.color}"></i><i style="background:${pint.c2}"></i></span>${h(pint.name)}` : "";
  $("tLargarTit").textContent = isHost ? "Largar" : "No grid";
  $("tLargarTxt").textContent = isHost ? `${t.name} · ${c.voltas} volta${c.voltas > 1 ? "s" : ""}` : "Esperando o organizador dar a largada";
  $("btnStart").disabled = !isHost;
  $("btnStart").onclick = () => isHost && act("start");
  $("pilots").innerHTML = E.S.players.map((p) => `<div class="pilot" style="--c:${p.color}"><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${h(carOf(p).name)}${p.id === E.S.host ? " · organizador" : ""}${m && p.id === m.id ? " · você" : ""}</small></div>${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`).join("")
    + (robos ? `<div class="pilot" style="--c:#9aa1ad"><div class="av">🤖</div><div class="grow"><b>${robos} robô${robos > 1 ? "s" : ""}</b><small>nível ${NIVEL[c.nivel] || "médio"} · entram na largada</small></div></div>` : "")
    + (E.S.players.length < 8 ? `<p class="hint">Mande o código para a galera. Dá para correr sozinho, contra o relógio ou contra robôs.</p>` : "");
  $("pilots").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  // painel das pistas
  $("cfgPistas").innerHTML = `<div class="tracks">${Object.entries(PISTAS).map(([id, p]) => `<button class="track ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis}><canvas data-prev="${id}" width="160" height="160"></canvas><b>${p.name}</b><small>${h(p.sub)}</small>${loadBest(id) ? `<small class="rec">🏆 seu recorde: ${fmt(loadBest(id).t)}</small>` : ""}</button>`).join("")}</div>${isHost ? "" : `<p class="hint">Só o organizador escolhe a pista.</p>`}`;
  $("cfgPistas").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  $("cfgPistas").querySelectorAll("[data-pista]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, pista: b.dataset.pista } })));
  // painel das regras
  $("cfg").innerHTML = `<div class="field"><label>Horário da pista</label><div class="seg"><button data-hora="dia" class="${c.hora !== "noite" ? "on" : ""}" ${dis}>☀️ Dia</button><button data-hora="noite" class="${c.hora === "noite" ? "on" : ""}" ${dis}>🌙 Noite</button></div><small>Disponível em todas as pistas.</small></div><div class="field"><label>Voltas</label><div class="seg">${[1, 2, 3, 5, 10, 21].map((v) => `<button data-v="${v}" class="${c.voltas === v ? "on" : ""}" ${dis}>${v}</button>`).join("")}</div></div>
    <div class="field"><label>Câmbio</label><div class="seg">${[["auto", "Automático"], ["manual", "Manual"]].map(([v, l]) => `<button data-cambio="${v}" class="${(c.cambio || "auto") === v ? "on" : ""}" ${dis}>${l}</button>`).join("")}</div><small>Manual para todo mundo: Shift sobe a marcha, Ctrl direito reduz (no celular, os botões + e −). Os robôs continuam no automático.</small></div>
    <div class="field"><label>Regras</label><div class="seg">${[["galera", "Corrida da Galera"], ["f1", "Fórmula 1"]].map(([v, l]) => `<button data-regras="${v}" class="${(c.regras || "galera") === v ? "on" : ""}" ${dis}>${l}</button>`).join("")}</div><small>Fórmula 1: pneus macio, médio e duro, paradas nos boxes, sem caixas de itens nem ajuda do pelotão. Os robôs usam os mesmos pneus.</small></div>
    ${f1 && m ? `<div class="field"><label>Seu pneu na largada</label><div class="seg">${Object.entries(window.F1Regras.PNEUS).map(([v, p]) => `<button data-pneu="${v}" class="${(m.pneu || "medio") === v ? "on" : ""}"><i class="bola-pneu" style="--c:${p.cor}"></i>${p.nome}</button>`).join("")}</div><small>O macio é o mais rápido e o que gasta antes; o duro aguenta a corrida inteira, mas segura menos. Pneu gasto escorrega nas curvas e, perto do fim, despenca.</small></div>` : ""}
    ${f1 ? `<div class="field"><label>ERS</label><div class="seg"><button data-ers="auto" class="${c.ers !== "manual" ? "on" : ""}" ${dis}>Automático</button><button data-ers="manual" class="${c.ers === "manual" ? "on" : ""}" ${dis}>Manual (E)</button></div><small>A bateria recarrega na frenagem. No manual, mantenha E ou o botão ERS pressionado para desdobrar.</small></div>` : ""}
    ${f1 ? `<div class="field"><label>Classificação</label><div class="seg"><button data-quali="completa" class="${c.classificacao !== "pular" ? "on" : ""}" ${dis}>Q1, Q2 e Q3</button><button data-quali="pular" class="${c.classificacao === "pular" ? "on" : ""}" ${dis}>Pular</button></div><small>Voltas lançadas com o relógio: o Q1 tira os 5 mais lentos, o Q2 mais 5 e o Q3 decide a pole. A ordem dos tempos é o grid. Pulando, o grid segue a ordem dos pilotos da sala (humanos primeiro).</small></div>` : ""}
    ${f1 ? "" : `<div class="field"><label>Caixas de itens</label><div class="seg"><button data-opt="caixas" class="${c.caixas ? "on" : ""}" ${dis}>${c.caixas ? "🎁 Ligadas" : "Desligadas"}</button></div><small>Banana, cascos, cogumelo, estrela e bomba espalhados pela pista.</small></div>`}
    <div class="field"><label>Robôs</label><div class="seg">${(f1 ? [0, 1, 3, 7, 11, 19] : [0, 1, 3, 5, 7]).map((v) => `<button data-robos="${v}" class="${(c.robos || 0) === v ? "on" : ""}" ${dis}>${v === 19 && f1 ? "Grid de 20" : v ? v : "Sem"}</button>`).join("")}</div>
      ${c.robos ? `<div class="seg" style="margin-top:6px">${[["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]].map(([v, l]) => `<button data-nivel="${v}" class="${(c.nivel || "medio") === v ? "on" : ""}" ${dis}>${l}</button>`).join("")}</div>` : ""}<small>${f1 ? "Os robôs são os pilotos reais de 2026, com as cores das equipes. O grid tem 20 carros (humanos e robôs); \"Grid de 20\" completa o que faltar." : "Pilotos do computador entram no grid (até completar 8 carros), seguem o traçado de corrida, pegam caixas e usam itens."}</small></div>
    ${f1 ? "" : `<div class="field"><label>Equilíbrio</label><div class="seg"><button data-opt="equilibrio" class="${c.equilibrio !== false ? "on" : ""}" ${dis}>${c.equilibrio !== false ? "Ligado" : "Desligado"}</button></div><small>Pequena ajuda de velocidade para quem ficou longe do pelotão.</small></div>`}${isHost ? "" : `<p class="hint">Só o organizador muda as regras.</p>`}`;
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
  // painéis da garagem e do piloto (só de quem corre)
  if (m) {
    $("colorPick").innerHTML = COLORS.map((col) => { const taken = E.S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""} ${taken ? "taken" : ""}" data-c="${col}" ${taken ? "disabled" : ""} style="background:${col}" aria-label="Cor ${col}"></button>`; }).join("");
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("color", { color: b.dataset.c })));
    $("carPick").innerHTML = f1 && m.equipe ? `<p class="hint" style="grid-column:1/-1">Nas regras de Fórmula 1 o carro é o da sua equipe: ${h(carOf(m).name)}. Monte as peças na aba Equipe.</p>` : Object.entries(CARROS).map(([id, k]) => `<button class="car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><b>${h(k.name)}</b><small class="inspo">${h(k.inspo || "")}</small><p>${h(k.desc)}</p>
      <div class="spec">${specRows(k).map(([lbl, n]) => `<span>${lbl}</span>${leds(n)}`).join("")}</div></button>`).join("");
    $("carPick").querySelectorAll("[data-carprev]").forEach((cv) => carPreview(cv, m.color, cv.dataset.carprev, m.mods));
    $("carPick").querySelectorAll("[data-car]").forEach((b) => (b.onclick = () => act("car", { car: b.dataset.car })));
    // as pinturas: cada uma com a foto do carro pintado e as duas cores
    const atual = (m.mods || MODS_PADRAO).pintura || "propria";
    $("modPick").innerHTML = Object.entries(MODS3.pintura).map(([id, p]) => `<button class="pint ${atual === id ? "on" : ""}" data-pintura="${id}" aria-pressed="${atual === id}"><canvas data-pintprev="${id}" width="240" height="135"></canvas><span class="faixas"><i style="background:${p.c || m.color}"></i><i style="background:${p.c2}"></i></span><span class="equipe-logo">${marcaEquipe(p.equipe)}<b>${h(p.name)}</b></span></button>`).join("");
    $("modPick").querySelectorAll("[data-pintprev]").forEach((cv) => carPreview(cv, m.color, m.car, { pintura: cv.dataset.pintprev }));
    $("modPick").querySelectorAll("[data-pintura]").forEach((b) => (b.onclick = () => act("mods", { mods: { pintura: b.dataset.pintura } })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = E.S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-p="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
  } else if (aba === "garagem" || aba === "piloto") abrir("box");
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
    const linhas = F.ORDEM.map((k) => { const pc = F.PECAS[k], n = mont[k];
      return `<div class="peca"><span class="ic" aria-hidden="true">${pc.icone}</span><div class="pnome"><b>${pc.nome}</b><small>${h(pc.desc)}</small><small class="efeito"><i class="mais">+</i> ${h(pc.bom)}${pc.custa === "só os pontos" ? "" : ` · <i class="menos">−</i> ${h(pc.custa)}`}</small></div>
        <div class="nivel"><button data-menos="${k}" aria-label="Tirar um ponto de ${pc.nome}" ${souChefe && n > 0 ? "" : "disabled"}>−</button><span class="pips" role="img" aria-label="nível ${n} de ${F.MAX_NIVEL}">${Array.from({ length: F.MAX_NIVEL }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span><button data-mais="${k}" aria-label="Pôr um ponto em ${pc.nome}" ${souChefe && n < F.MAX_NIVEL && sobra > 0 ? "" : "disabled"}>+</button><b class="num">${n}</b></div></div>`; }).join("");
    carro = `<h3>Montar o carro · ${h(FP.EQUIPES[eq].nome)}</h3>
      <div class="garagem-equipe"><div class="foto"><canvas id="equipeCarro" width="240" height="135"></canvas><b>${h(spec.desc)}</b><small>${h(spec.inspo)}</small></div>
        <div class="orcamento"><div class="barra" role="img" aria-label="${usado} de ${orc} pontos usados"><i style="width:${(usado / orc) * 100}%"></i></div><b>${sobra ? `Sobram ${sobra} ponto${sobra > 1 ? "s" : ""}` : "Orçamento todo usado"}</b><small>${usado} de ${orc} pontos${souChefe ? "" : ` · quem monta é ${h(chefe ? chefe.name : "o chefe")}`}</small>
          ${souChefe ? `<button class="small ghost" data-padrao ${E.S.montagens && E.S.montagens[eq] ? "" : "disabled"}>Voltar ao carro da equipe</button>` : ""}</div></div>
      <div class="pecas">${linhas}</div>
      <div class="spec ficha-equipe">${F.ficha(spec).map((f) => `<span>${f.rotulo}</span>${leds(f.nota)}`).join("")}</div>
      <small class="hint">Velocidade final ${Math.round(spec.vmax)} · aceleração ${spec.acc.toFixed(0)} · freio ${Math.round(spec.brake)} · aderência ${Math.round(spec.grip)} · chance de quebrar ${Math.round(spec.quebra * 100)}% · DRS ×${spec.drs.toFixed(2)} · pneu gasta ×${spec.desgaste.toFixed(2)}.</small>`;
  }
  host.innerHTML = `<p class="hint" style="margin:0 0 10px">Escolha a sua equipe de 2026. Cada uma tem um orçamento de pontos para as peças do carro; os robôs da equipe correm com o mesmo carro, e dois amigos podem dividir a mesma equipe (um em cada carro).</p><div class="times">${times}</div>${carro}`;
  host.querySelectorAll("[data-equipe]").forEach((b) => (b.onclick = () => act("equipe", { id: m.equipe === b.dataset.equipe ? null : b.dataset.equipe })));
  if (!m.equipe) return;
  const eq = m.equipe, mont = (E.S.montagens && E.S.montagens[eq]) || F.montagemPadrao(eq);
  host.querySelectorAll("[data-menos]").forEach((b) => (b.onclick = () => act("montagem", { montagem: { ...mont, [b.dataset.menos]: mont[b.dataset.menos] - 1 } })));
  host.querySelectorAll("[data-mais]").forEach((b) => (b.onclick = () => act("montagem", { montagem: { ...mont, [b.dataset.mais]: mont[b.dataset.mais] + 1 } })));
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
  <li><b>Regras de F1</b> (se o organizador ligar nas Regras): os pneus gastam pela corrida e esfriam na largada. O anel do pneu, ao lado do velocímetro, esvazia com o desgaste e fica vermelho no fim; com o pneu frio, o miolo fica azul. Escolha o composto da largada nas Regras.</li>
  <li><b>Box</b> (regras de F1): aperte <b>B</b> (ou toque em "🔧 Box") e o carro entra no corredor dos boxes na próxima passagem pela entrada; B de novo passa para o outro composto e, no fim, cancela; 1, 2 e 3 escolhem macio, médio e duro. No corredor o carro anda sozinho no limitador (40% da velocidade final), para na garagem uns 2,4 s (mais o erro dos mecânicos, até 1,5 s) e sai com o pneu novo, ainda frio. Dá para parar da volta 1 até a penúltima. <b>Quem termina a corrida sem ter usado dois compostos diferentes leva +10 s.</b> A torre mostra o pneu de cada um, quantas paradas fez e quem está no box.</li>
  <li><b>Fim de semana de GP</b> (regras de F1): com a classificação ligada, o Q1, o Q2 e o Q3 são voltas lançadas com o relógio (a volta conta de uma passagem pela linha à outra; ✔ Pronto fecha a sessão quando todos terminam) e os mais lentos são eliminados; a ordem dos tempos vira o grid de 20 carros, com robôs que são os pilotos reais de 2026. A largada é nas <b>cinco luzes</b>: acendem uma por segundo e apagam juntas depois de uma espera sorteada. Sair antes de apagarem (queimar a largada) custa <b>+5 s</b>. No fim, o pódio e os pontos oficiais (25, 18, 15, 12, 10, 8, 6, 4, 2, 1); quem não faz 90% das voltas é NC.</li>
  <li><b>Fantasma do recorde:</b> a sua volta mais rápida em cada pista fica salva neste aparelho. Nas próximas corridas, um carro dourado refaz essa volta com você, e o placar mostra quantos segundos você está na frente (verde) ou atrás (vermelho).</li>
  <li><b>Relevo:</b> subida freia, descida embala, e numa lombada rápida o carro voa. No ar ele não acelera nem vira direito, então chegue alinhado.</li>
  <li><b>DRS e ERS (F1):</b> o DRS abre sozinho na zona se você cruzou a detecção a menos de 1 s do carro da frente, depois das duas primeiras voltas e sem bandeira. A bateria ERS recarrega ao frear; no modo manual, segure E ou o botão ERS para acelerar. Bandeira amarela e safety car exigem reduzir e manter a posição.</li>
  <li><b>Freie antes da curva.</b> O pneu só segura até certo ponto: entrou rápido demais, o carro escorrega para fora (sai fumaça e o pneu canta) e perde velocidade. Fora do asfalto ele fica lento; em Mônaco e em Tóquio tem muro.</li>
  <li>A volta só conta passando pela pista inteira, na ordem. Atalho e contramão não valem.</li>
  <li>Quando o primeiro cruza a chegada, os outros têm 45 segundos para terminar.</li></ul>
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
