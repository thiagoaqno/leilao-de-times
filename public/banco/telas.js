// Banco da Galera — carteira, imóveis, destaque, mesa, leilão e modais (parte 5 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- carteira e ação principal ----------
// A ação que faz sentido agora para quem está olhando (a mesma do painel, em um botão só).
function primaryAction() {
  const m = me();
  if (!m || m.bankrupt || S.phase !== "playing") return null;
  if (S.choice) return S.choice.player === m.id ? { label: "🎯 Toque no alvo", disabled: true } : null;
  const myDebts = S.debts.filter((d) => d.from === m.id);
  if (myDebts.length) {
    const t = myDebts.reduce((a, d) => a + d.amount, 0);
    return m.cash >= t ? { label: `Pagar ${money(t)}`, run: () => act("pay"), hot: true } : { label: `Faltam ${money(t - m.cash)}`, disabled: true };
  }
  if (S.auction) {
    const a = S.auction;
    if (a.passed.includes(m.id) || a.leader === m.id) return null;
    return { label: `🔨 Lance ${short(a.bid + 10)}`, run: () => act("bid", { value: a.bid + 10 }), disabled: m.cash < a.bid + 10, hot: true };
  }
  if (S.turn !== m.id) return null;
  if (S.stage === "roll") return { label: m.inJail ? "🎲 Tentar dupla" : "🎲 Jogar os dados", run: () => act("roll"), hot: true };
  if (S.stage === "buy") { const pr = T.priceOf(S.buyOffer, S.event?.id); return { label: `Comprar ${short(pr)}`, run: () => act("buy"), disabled: m.cash < pr, hot: true }; }
  if (S.stage === "done") return { label: "Passar a vez ➜", run: () => act("endTurn") };
  if (S.stage === "moving") return { label: "🎲 Lá vai…", disabled: true };
  return null;
}
function renderWallet() {
  const m = me(), w = $("wallet");
  const show = !!(m && S.phase === "playing" && !m.bankrupt);
  w.classList.toggle("hidden", !show);
  document.body.classList.toggle("ingame", show);
  if (!show) return;
  w.style.setProperty("--c", m.color);
  w.classList.toggle("myturn", S.turn === m.id);
  $("wPawn").textContent = m.pawn;
  $("wName").textContent = m.name;
  const tags = [];
  if (m.team != null) tags.push(`<span class="tteam" style="--tc:${T.TEAMS[m.team].color}">${T.TEAMS[m.team].icon} ${h(T.TEAMS[m.team].name)}</span>`);
  if (S.turn === m.id) tags.push("⭐ sua vez");
  if (m.inJail) tags.push("🚔 preso");
  if (m.jailCards.length) tags.push("🎫 habeas corpus");
  $("wTags").innerHTML = tags.join(" · ");
  $("wSub").textContent = `patrimônio ${money(m.worth)} · ${propsOf(m.id).length} imóveis`;
  const pa = primaryAction(), b = $("wBtn");
  b.classList.toggle("hidden", !pa);
  if (pa) { b.textContent = pa.label; b.disabled = !!pa.disabled; b.classList.toggle("hot", !!pa.hot && !pa.disabled); b.onclick = pa.run || null; }
}
$("wAmt").textContent = "";

// dados no meio do tabuleiro: tocar neles joga (quando é a sua vez)
const canRoll = () => { const m = me(); return !!(m && S && S.phase === "playing" && S.turn === m.id && S.stage === "roll" && !S.debts.length && !S.choice); };
$("dice").addEventListener("click", () => { if (canRoll()) act("roll"); });
function renderDiceHint() {
  const can = canRoll();
  $("dice").classList.toggle("canroll", can);
  $("dice").title = can ? "Toque para jogar os dados" : "";
  $("tapHint").classList.toggle("hidden", !can);
}

// "SUA VEZ!" no meio da tela quando a vez chega em você
let lastMine; // fica indefinido até o primeiro estado, para não piscar ao entrar na mesa
function yourTurnFlash() {
  const key = S.phase === "playing" && ME && S.turn === ME.id ? `${S.turn}|${S.round}` : null;
  if (lastMine !== undefined && key && key !== lastMine) {
    const el = document.createElement("div");
    el.className = "yourturn"; el.textContent = "SUA VEZ!";
    document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
  }
  lastMine = key;
}

// ---------- seus imóveis: construir, vender e hipotecar direto na lista ----------
function buildWhy(i) {
  const s = BOARD[i], pr = S.props[i], m = me();
  if (pr.houses >= 5) return "Já tem hotel";
  if (pr.mortgaged) return "Resgate a hipoteca para construir";
  const g = GROUP_SQUARES[s.group], full = T.ownsGroup(S.props, m.id, s.group, teamsMap());
  const quem = S.config.teams ? "a equipe precisa" : "precisa";
  if (!S.config.quick || pr.houses === 4) {
    if (!full) return pr.houses === 4 ? `Hotel: ${quem} de todas as cidades de ${GROUPS[s.group].name}` : `Para construir, ${quem} de todas as cidades de ${GROUPS[s.group].name}`;
    if (g.some((j) => S.props[j] && S.props[j].mortgaged)) return "Resgate as hipotecas do grupo";
    if (!S.config.quick && pr.houses > Math.min(...g.map((j) => S.props[j].houses))) return "Construa por igual no grupo";
  }
  if (m.cash < T.buildCost(i, S.event?.id)) return "Falta dinheiro";
  return null;
}
const lockedC = (i) => (S.config.quick ? !!S.props[i].houses : !!(BOARD[i].group && GROUP_SQUARES[BOARD[i].group].some((j) => S.props[j] && S.props[j].houses)));
function rentText(i) {
  const s = BOARD[i], pr = S.props[i];
  if (pr.mortgaged) return "hipotecado";
  if (s.type === "util") return `aluguel ${T.countOwned(S.props, pr.owner, T.UTILS, teamsMap()) === 2 ? 10 : 4}x os dados`;
  return `aluguel ${money(T.rentOf(S.props, i, 0, { event: S.event?.id, teams: teamsMap() }))}`;
}
function renderMine() {
  const m = me();
  $("mineCard").classList.toggle("hidden", !m || m.bankrupt);
  if (!m) return;
  const list = propsOf(m.id), playing = S.phase === "playing", busy = !!S.auction;
  if (!list.length) { $("mine").innerHTML = `<p class="muted" style="margin:0">Nenhum ainda. Caia numa cidade livre e compre!</p>`; return; }
  const houses = list.reduce((a, i) => a + (S.props[i].houses === 5 ? 0 : S.props[i].houses), 0), hotels = list.filter((i) => S.props[i].houses === 5).length;
  $("mine").innerHTML = `<div class="mine-sum"><span>${list.length} imóveis · 🏠 ${houses} · 🏨 ${hotels}</span><span>toque no nome para ver a escritura</span></div>` + list.map((i) => {
    const s = BOARD[i], pr = S.props[i], btns = [];
    let why = "";
    if (s.type === "prop" && playing) {
      const w = buildWhy(i), cost = T.buildCost(i, S.event?.id);
      if (pr.houses < 5) btns.push(`<button class="go" data-do="build" data-i="${i}" ${w || busy ? "disabled" : ""}>${pr.houses === 4 ? "🏨 Hotel" : "＋🏠 Casa"} ${short(cost)}</button>`);
      if (pr.houses) btns.push(`<button data-do="sell" data-i="${i}" ${busy ? "" : ""}>－ Vender ${pr.houses === 5 ? "hotel" : "casa"} +${short(GROUPS[s.group].house / 2)}</button>`);
      if (w && pr.houses < 5 && w !== "Falta dinheiro") why = w;
    }
    if (playing) {
      if (pr.mortgaged) btns.push(`<button data-do="unmortgage" data-i="${i}" ${m.cash < T.unmortgageCost(i) || busy ? "disabled" : ""}>🏦 Resgatar ${short(T.unmortgageCost(i))}</button>`);
      else btns.push(`<button data-do="mortgage" data-i="${i}" ${lockedC(i) ? "disabled title='Venda as casas antes'" : ""}>🏦 Hipotecar +${short(T.mortgageValue(i))}</button>`);
      btns.push(`<button data-do="sellbank" data-i="${i}" ${lockedC(i) ? "disabled title='Venda as casas antes'" : ""}>💰 Vender ao banco +${short(pr.mortgaged ? 0 : T.mortgageValue(i))}</button>`);
    }
    const hs = pr.houses === 5 ? "🏨" : pr.houses ? "🏠".repeat(pr.houses) : "";
    return `<div class="prow ${pr.mortgaged ? "mort" : ""}" style="${gvars(i)}">
      <div class="pinfo" data-open="${i}"><b>${h(s.name)}</b>${pr.shield ? "🛡️" : ""}<span class="pmeta">${hs} ${rentText(i)}</span></div>
      <div class="pbtns">${btns.join("")}</div>${why ? `<span class="why">${h(why)}</span>` : ""}</div>`;
  }).join("");
  $("mine").querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openModal({ kind: "prop", i: +b.dataset.open })));
  $("mine").querySelectorAll("[data-do]").forEach((b) => (b.onclick = () => doProp(b.dataset.do, +b.dataset.i)));
}

// ---------- destaque no meio do tabuleiro ----------
// Carta tirada, aluguel, compra, leilão, prisão, falência, troca… aparecem grandes no centro,
// para todo mundo, um de cada vez. Tocar pula para o próximo.
const spotQ = [];
let spotBusy = false, cardInit = false;
function spotPush(item) {
  spotQ.push(item);
  if (spotQ.length > 5) spotQ.splice(0, spotQ.length - 5);
  if (!spotBusy) spotNext();
}
function spotNext() {
  clearTimeout(spotNext.t);
  const it = spotQ.shift(), el = $("spot");
  if (!it || !S || S.phase === "lobby") { spotBusy = false; el.classList.add("hidden"); $("spotDim").classList.remove("on"); return; }
  spotBusy = true;
  el.className = "spot " + it.cls;
  el.innerHTML = it.html;
  $("spotDim").classList.add("on");
  if (it.sq != null) flash(it.sq);
  layout();
  spotNext.t = setTimeout(spotNext, spotQ.length ? it.ms * 0.65 : it.ms);
}
$("spot").addEventListener("click", spotNext);
const POWER_RE = /^(Demolição|Fiscalização|Usucapião|Crise de consciência|Escritura blindada|Contratou)/;
function spotCard(c) {
  const power = POWER_RE.test(c.text), who = P(c.player);
  spotPush({ cls: "cardspot", ms: 3200, html: `<div class="cardpop ${power ? "power" : c.good ? "good" : "bad"}" id="cardpop"><div class="face"><h4>${power ? "PODER" : c.good ? "SORTE" : "REVÉS"}</h4><div class="who">${who ? `${who.pawn} ${h(who.name)} tirou` : ""}</div><p>${h(c.text)}</p></div><div class="back">?</div></div>` });
}
function spotNews(e) {
  spotPush({ cls: "news tone-" + (e.tone || "info"), ms: 2400, sq: e.sq, html: `<div class="ic">${e.icon}</div><h4>${h(e.title)}</h4><p>${h(e.text)}</p>` });
}
function checkCard() {
  if (!cardInit) { cardInit = true; lastCard = S.card ? S.card.seq : null; return; }
  if (S.card && S.card.seq !== lastCard) { lastCard = S.card.seq; if (!document.hidden) spotCard(S.card); }
}

// ---------- escrituras pequenas ----------
function deedMini(i, big = false) {
  const s = BOARD[i], pr = S.props[i], g = s.group ? GROUPS[s.group] : null;
  const icon = s.type === "air" ? "✈️ " : s.type === "util" ? s.icon + " " : "";
  const hs = pr ? (pr.houses === 5 ? "🏨" : "🏠".repeat(pr.houses)) : "";
  let foot;
  if (!pr) foot = `vale ${money(s.price)}`;
  else if (pr.mortgaged) foot = "hipotecada";
  else if (s.type === "util") foot = `aluguel ${T.countOwned(S.props, pr.owner, T.UTILS, teamsMap()) === 2 ? 10 : 4}x os dados`;
  else foot = `aluguel ${money(T.rentOf(S.props, i, 0, { event: S.event?.id, teams: teamsMap() }))}`;
  return `<button class="md ${pr && pr.mortgaged ? "mort" : ""} ${big ? "big" : ""}" data-deed="${i}" style="--g:${g ? g.color : "#40445f"};--gi:${g ? g.ink : "#fff"}"><span class="mdh">${icon}${h(s.name)}</span><span class="mdb">${hs}${pr && pr.shield ? " 🛡️" : ""}</span><span class="mdr">${foot}</span></button>`;
}

// ---------- mesa: cada jogador com o dinheiro e as escrituras ----------
function renderPlayers() {
  const m = me();
  $("mesa").innerHTML = S.players.map((p) => {
    const tags = [];
    if (p.team != null) tags.push(`<span class="tteam" style="--tc:${T.TEAMS[p.team].color}">${T.TEAMS[p.team].icon} ${h(T.TEAMS[p.team].name)}</span>`);
    if (S.phase === "playing" && p.id === S.turn) tags.push(S.deadline && S.deadline.who === p.id && !S.auction ? `⭐ jogando · ⏱ <span class="tsec" data-clock="turn"></span>` : "⭐ jogando");
    if (!p.online && !p.bankrupt) tags.push(`<span class="dot off"></span>desconectado`);
    if (p.inJail) tags.push("🚔 preso");
    if (p.jailCards.length) tags.push("🎫 habeas corpus");
    if (p.bankrupt) tags.push("💀 faliu");
    const list = propsOf(p.id);
    return `<div class="pcol ${p.id === S.turn && S.phase === "playing" ? "turn" : ""} ${p.bankrupt ? "dead" : ""}" style="--c:${p.color}">
      <div class="phead"><span class="pw">${p.pawn}</span><div style="min-width:0"><b>${h(p.name)}${m && p.id === m.id ? " <span class='muted' style='font-weight:500'>(você)</span>" : ""}</b><small>${tags.join(" · ") || "&nbsp;"}</small></div>
        <div class="pc"><b>${p.bankrupt ? "—" : money(p.cash)}</b><small>patrimônio ${money(p.worth)}</small></div></div>
      <div class="deeds">${list.map((i) => deedMini(i)).join("") || `<span class="muted" style="font-size:13px">Nenhuma escritura ainda.</span>`}</div></div>`;
  }).join("");
  $("mesa").querySelectorAll("[data-deed]").forEach((b) => (b.onclick = () => openModal({ kind: "prop", i: +b.dataset.deed })));
  const free = T.OWNABLE.filter((i) => !S.props[i]).length;
  $("mesaFree").textContent = free ? `${free} ${free > 1 ? "imóveis ainda à venda" : "imóvel ainda à venda"}` : "tudo vendido";
}

// ---------- leilão em janela ----------
let lastAucBid = 0;
function renderAuction() {
  const el = $("auc"), a = S.auction, m = me();
  if (!a || S.phase !== "playing") { el.classList.add("hidden"); el.dataset.p = ""; return; }
  const s = BOARD[a.prop], lead = P(a.leader);
  if (el.dataset.p !== String(a.prop)) {
    el.dataset.p = a.prop; el.classList.remove("min"); lastAucBid = 0;
    el.innerHTML = `<div class="aucbox"><div class="auchd"><span>🔨 Leilão</span><button id="aucMin">Ver o tabuleiro</button></div>
      <div class="aucbody"><div>${deedMini(a.prop, true)}<div class="muted" style="font-size:12.5px;margin-top:6px;color:var(--ink2)">vale ${money(s.price)} no banco${P(a.host) ? `<br>💼 ${h(P(a.host).name)} leva 10% de comissão` : ""}</div></div>
        <div class="aucinfo"><div class="lbl">Maior lance</div><div class="aucbid" id="aucBid"></div><div class="aucleader" id="aucLead"></div>
          <div class="aucring" id="aucRing"><svg viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" id="aucArc" cx="40" cy="40" r="34" stroke-dasharray="213.6" stroke-dashoffset="0"/></svg><span id="aTimer"></span></div></div></div>
      <div class="aucctl" id="aucCtl"></div></div>`;
    $("aucMin").onclick = () => el.classList.add("min");
  }
  el.classList.remove("hidden");
  const bidEl = $("aucBid");
  bidEl.textContent = a.bid ? money(a.bid) : "Sem lances";
  if (a.bid > lastAucBid) { bidEl.classList.remove("bump"); void bidEl.offsetWidth; bidEl.classList.add("bump"); }
  lastAucBid = a.bid;
  $("aucLead").innerHTML = lead ? `${lead.pawn} ${h(lead.name)} está na frente` : "Ninguém deu lance ainda";
  // controles (guarda o que a pessoa estava digitando)
  const canBid = m && !m.bankrupt && !a.passed.includes(m.id);
  const typed = $("aucVal") ? $("aucVal").value : "", focused = document.activeElement && document.activeElement.id === "aucVal";
  $("aucCtl").innerHTML = canBid
    ? `<div class="bidrow">${[10, 50, 100].map((v) => `<button data-bid="${a.bid + v}" ${a.bid + v > m.cash ? "disabled" : ""}>+${short(v)}</button>`).join("")}</div>
       <div class="row" style="flex-wrap:nowrap"><input id="aucVal" type="number" inputmode="numeric" min="${a.bid + 1}" max="${m.cash}" placeholder="Outro valor, em mil" style="flex:1;min-width:0"><button class="primary" id="aucBidBtn">Dar lance</button></div>
       <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted" style="font-size:13px">Você tem ${money(m.cash)}.</span>${a.leader !== m.id ? `<button id="aucPass" style="padding:7px 12px;font-size:13px">Sair do leilão</button>` : `<b style="color:#1f9d55">Você está na frente!</b>`}</div>`
    : `<p class="muted" style="margin:4px 0 0;text-align:center">${m && !m.bankrupt ? "Você saiu deste leilão. Acompanhe os lances." : "Acompanhando o leilão."}</p>`;
  if ($("aucVal")) { $("aucVal").value = typed; if (focused) $("aucVal").focus(); $("aucVal").addEventListener("keydown", (e) => { if (e.key === "Enter") $("aucBidBtn").click(); }); }
  $("aucCtl").querySelectorAll("[data-bid]").forEach((b) => (b.onclick = () => act("bid", { value: +b.dataset.bid })));
  if ($("aucBidBtn")) $("aucBidBtn").onclick = () => { const v = +$("aucVal").value; if (v) act("bid", { value: v }).then((ok) => { if (ok) $("aucVal").value = ""; }); };
  if ($("aucPass")) $("aucPass").onclick = () => act("pass");
}

function renderGame() {
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = S.code;
  checkCard();
  runFx(); renderPlates(); checkEvent(); stateSounds(); renderReacts(); renderWallet(); yourTurnFlash();
  renderBoard(); renderAction(); renderPlayers(); renderMine(); renderTrades(); renderLog(); renderAuction(); tickClocks(); renderDiceHint();
}

// ---------- modais ----------
function openModal(m) { modal = m; renderModal(); $("modal").classList.remove("hidden"); }
function closeModal() { modal = null; $("modal").classList.add("hidden"); }
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal) closeModal(); });

function renderModal() {
  const box = $("modalBox");
  box.classList.toggle("wide", modal.kind === "trade");
  if (modal.kind === "prop") box.innerHTML = propModal(modal.i);
  else if (modal.kind === "rules") box.innerHTML = rulesModal();
  else if (modal.kind === "trade") { if (!box.dataset.trade) { box.innerHTML = tradeModal(); box.dataset.trade = 1; bindTrade(); } return; }
  else if (modal.kind === "gift") {
    if (!box.dataset.gift) {
      box.innerHTML = giftModal(); box.dataset.gift = 1;
      if ($("gSend")) $("gSend").onclick = async () => { const v = +$("gVal").value; if (v && (await act("gift", { to: $("gTo").value, value: v }))) closeModal(); };
    }
    return;
  }
  delete box.dataset.trade; delete box.dataset.gift;
  box.querySelectorAll("[data-do]").forEach((b) => (b.onclick = () => doProp(b.dataset.do, modal.i)));
}
const teamsMap = () => (S && S.config.teams ? Object.fromEntries(S.players.map((p) => [p.id, p.team])) : null);
// vender ao banco não tem volta: pede confirmação antes
function doProp(type, i) {
  if (type === "sellbank") {
    const pr = S.props[i], v = pr && !pr.mortgaged ? T.mortgageValue(i) : 0;
    if (!confirm(`Vender ${BOARD[i].name} ao banco${v ? ` por ${money(v)}` : " (está hipotecada, você não recebe nada)"}? O imóvel volta a ficar à venda para qualquer um.`)) return;
  }
  return act(type, { i });
}
function propModal(i) {
  const s = BOARD[i], pr = S && S.props[i], owner = pr && P(pr.owner), m = me(), g = s.group ? GROUPS[s.group] : null;
  const ev = S && S.event ? S.event.id : null, tm = teamsMap();
  let rows = "";
  if (s.type === "prop") {
    const full = pr && T.ownsGroup(S.props, pr.owner, s.group, tm);
    const lbl = [`Terreno${full ? " <small>(cor completa: dobro)</small>" : ""}`, "<i>🏠</i> 1 casa", "<i>🏠🏠</i> 2 casas", "<i>🏠🏠🏠</i> 3 casas", "<i>🏠🏠🏠🏠</i> 4 casas", "<i>🏨</i> Hotel"];
    rows = s.rent.map((v, k) => `<div class="dr ${pr && !pr.mortgaged && (k ? pr.houses === k : !pr.houses) ? "on" : ""}"><span class="dl">${lbl[k]}</span><span class="dv">${money(k === 0 && full ? v * 2 : v)}</span></div>`).join("");
  } else if (s.type === "air") rows = [1, 2, 3, 4].map((n) => `<div class="dr ${pr && !pr.mortgaged && T.countOwned(S.props, pr.owner, T.AIRPORTS, tm) === n ? "on" : ""}"><span class="dl"><i>${"✈️".repeat(n)}</i> ${n} aeroporto${n > 1 ? "s" : ""}</span><span class="dv">${money(25 * 2 ** (n - 1))}</span></div>`).join("");
  else rows = [1, 2].map((n) => `<div class="dr ${pr && !pr.mortgaged && T.countOwned(S.props, pr.owner, T.UTILS, tm) === n ? "on" : ""}"><span class="dl"><i>${"💡🚰".slice(0, n * 2)}</i> ${n === 1 ? "1 companhia" : "as 2 companhias"}</span><span class="dv">${n === 1 ? 4 : 10}x os dados</span></div>`).join("");
  const tiles = s.type === "prop"
    ? `<div><small>Casa</small><b>${money(T.buildCost(i, ev))}</b></div><div><small>Hotel</small><b>4 casas + ${short(GROUPS[s.group].house)}</b></div><div><small>Hipoteca</small><b>${money(T.mortgageValue(i))}</b></div>`
    : `<div><small>Preço</small><b>${money(s.price)}</b></div><div><small>Hipoteca</small><b>${money(T.mortgageValue(i))}</b></div><div><small>Resgate</small><b>${money(T.unmortgageCost(i))}</b></div>`;
  const ribs = [];
  if (pr && owner) ribs.push(`<span class="rib own" style="--oc:${owner.color}">${owner.pawn} ${h(owner.name)}</span>`);
  else if (S && S.phase !== "lobby") ribs.push(`<span class="rib">À venda por ${money(T.priceOf(i, ev))}</span>`);
  if (pr && pr.shield) ribs.push(`<span class="rib ok">🛡️ blindada</span>`);
  if (pr && pr.mortgaged) ribs.push(`<span class="rib bad">hipotecada</span>`);
  if (pr && pr.houses) ribs.push(`<span class="rib">${pr.houses === 5 ? "🏨 hotel" : `🏠 ${pr.houses} ${pr.houses > 1 ? "casas" : "casa"}`}</span>`);
  let now = "";
  if (pr && S.phase === "playing" && !pr.mortgaged) {
    const v = s.type === "util" ? `${T.countOwned(S.props, pr.owner, T.UTILS, tm) === 2 ? 10 : 4}x os dados` : money(T.rentOf(S.props, i, 0, { event: ev, teams: tm }));
    now = `<div class="dnow"><span>${m && pr.owner !== m.id && T.sameSide(pr.owner, m.id, tm) ? "Colega: você não paga" : "Aluguel agora"}</span><b>${v}</b></div>`;
  }
  let acts = "";
  if (pr && m && pr.owner === m.id && S.phase === "playing") {
    if (s.type === "prop") acts += `<button class="primary" data-do="build">${pr.houses === 4 ? "🏨 Construir hotel" : "🏠 Construir casa"} (${money(T.buildCost(i, ev))})</button><button data-do="sell" ${pr.houses ? "" : "disabled"}>Vender ${pr.houses === 5 ? "hotel" : "casa"} (+${money(GROUPS[s.group].house / 2)})</button>`;
    acts += pr.mortgaged ? `<button data-do="unmortgage">🏦 Resgatar (${money(T.unmortgageCost(i))})</button>` : `<button data-do="mortgage">🏦 Hipotecar (+${money(T.mortgageValue(i))})</button>`;
    acts += `<button data-do="sellbank" ${lockedC(i) ? "disabled title='Venda as casas antes'" : ""}>💰 Vender ao banco (+${money(pr.mortgaged ? 0 : T.mortgageValue(i))})</button>`;
  }
  return `${deedHTML(i, { ribs, rows, tiles, now })}
    ${acts ? `<div class="acts">${acts}</div>` : ""}<div class="acts" style="grid-template-columns:1fr"><button data-close>Fechar</button></div>`;
}
// a escritura (o cartão da casa): cabeçalho na cor do bairro, faixas (dono, à venda...), aluguéis e valores
function deedHTML(i, { ribs, rows, tiles, now }) {
  const s = BOARD[i], pr = S && S.props[i], g = s.group ? GROUPS[s.group] : null;
  const gname = g ? g.name : s.type === "air" ? "Aeroporto" : "Companhia";
  const dicon = s.type === "air" ? "✈️" : s.type === "util" ? s.icon : "🏙️";
  return `<div class="deed2 ${s.type} ${pr && pr.mortgaged ? "mort" : ""}" style="--g:${g ? g.color : "#40445f"};--gi:${g ? g.ink : "#fff"}">
    <div class="dh"><span class="dicon">${dicon}</span><div class="dg">${h(gname)}</div><h2>${h(s.name)}</h2><span class="dprice">${money(s.price)}</span></div>
    ${ribs.length ? `<div class="dribbons">${ribs.join("")}</div>` : ""}
    <div class="drows">${rows}</div><div class="dtiles">${tiles}</div>${now}</div>`;
}
function rulesModal() {
  return `<div class="in rules"><h2 style="font-size:26px">Como jogar</h2>
    <h3>O básico</h3><p>Na sua vez, jogue os dados e ande. Caiu numa cidade, aeroporto ou companhia sem dono? Compre, ou mande a leilão (se outro jogador levar, você ganha 10% do lance de comissão). Tem dono? Pague o aluguel. Ao dar a volta pelo Início, receba o salário.</p>
    <h3>Construir</h3><ul><li>Com todas as cidades de uma cor, o aluguel sem casa dobra e você pode construir.</li><li>Construa por igual: uma casa em cada antes da segunda. Com 4 casas, troque por um hotel.</li><li>Vender uma construção devolve metade do preço.</li></ul>
    <h3>Aeroportos e companhias</h3><ul><li>Aeroportos: R$ 25, 50, 100 ou 200 mil, conforme quantos o dono tem.</li><li>Companhias: 4x os dados com uma, 10x com as duas.</li></ul>
    <h3>Prisão</h3><ul><li>Vai preso quem cai em "Vá para a prisão", tira a carta, ou tira 3 duplas seguidas.</li><li>Para sair: tire uma dupla, pague R$ 50 mil ou use o habeas corpus. Na 3ª tentativa sem dupla, paga e sai.</li><li>Preso continua recebendo aluguel.</li></ul>
    <h3>Dinheiro apertado</h3><ul><li>Hipoteque imóveis (recebe metade do preço; o aluguel para). Para resgatar, paga a hipoteca + 10%.</li><li>Ou venda o imóvel de volta ao banco: recebe metade do preço (nada, se já estava hipotecado) e ele volta a ficar à venda para todo mundo.</li><li>Se não der para pagar uma conta, venda, hipoteque ou negocie. Se nada resolver, declare falência: tudo vai para quem você deve.</li></ul>
    <h3>Trocas</h3><p>A qualquer hora, proponha trocas de imóveis, dinheiro e habeas corpus. Imóvel com casas no grupo não pode ser trocado; venda as casas antes. Hipotecados passam hipotecados.</p>
    <h3>Eventos e cartas especiais</h3><ul><li>Em quase toda rodada sai um evento que vale até a próxima: Black Friday (casas pela metade), aluguel em dobro, greve nos aeroportos, apagão, feriadão, liquidação, IPTU ou bolsa em alta.</li><li>No Sorte ou Revés há cartas de poder: <b>Demolição</b> (derruba uma casa ou hotel de alguém), <b>Usucapião</b> (toma um imóvel sem casas), <b>Doação</b> (dá um imóvel seu) e <b>Escritura blindada</b> (🛡️ protege um imóvel seu de demolição e usucapião para sempre).</li><li>Dá para desligar tudo isso na sala de espera.</li></ul>
    <h3>Tabuleiro grande</h3><p>Para mesas de 6 a 8 pessoas: 52 casas (13 por lado), com mais bairros (Bom Retiro, Jardim Anália Franco, Higienópolis, Perdizes, Barra Funda, Brooklin, Morumbi, Jardim Europa), cores com 4 cidades, a Companhia de Gás (3 companhias: 20x os dados) e mais Sorte ou Revés.</p>
    <h3>Modo rápido</h3><p>Dá para pôr de 1 a 4 casas em qualquer imóvel seu, sem ter a cor toda e sem precisar construir por igual. O hotel continua só com a cor completa. Uma casa só impede de hipotecar ou trocar aquele imóvel.</p>
    <h3>Modo equipes</h3><ul><li>2, 3 ou 4 equipes, cada jogador com o seu dinheiro. Dá para mandar dinheiro para um colega a qualquer hora.</li><li>Aluguel entre colegas é grátis. A cor completa, os aeroportos e as companhias contam o que a equipe inteira tem (aluguel dobrado e direito de construir).</li><li>Demolição e usucapião só miram adversários.</li><li>Ganha a última equipe de pé ou, quando o tempo acaba, a de maior patrimônio somado.</li></ul>
    <h3>Tempo</h3><ul><li>Cada jogada tem 40 segundos (15 para quem caiu da internet). Se passar: o dado roda sozinho, a cidade vai a leilão, ou a vez passa.</li><li>Quem tem conta para pagar e deixa o tempo acabar: o banco vende casas e hipoteca imóveis por ele. Se nem assim der, é falência.</li></ul><h3>Quem ganha</h3><p>O último que não faliu. Se a mesa tiver tempo de partida (30 minutos, por padrão), quando o tempo acaba vence o maior patrimônio.</p>
    <div class="row" style="margin-top:14px"><button data-close class="primary">Entendi</button></div></div>`;
}
$("btnRules").onclick = () => openModal({ kind: "rules" });

// troca
let tradeTo = null;
function tradeModal() {
  const m = me(), others = S.players.filter((p) => !p.bankrupt && p.id !== m.id);
  if (!tradeTo || !others.some((p) => p.id === tradeTo)) tradeTo = others[0]?.id;
  const o = P(tradeTo);
  const hasBuild = (i) => S.config.quick ? !!S.props[i].houses : BOARD[i].group && GROUP_SQUARES[BOARD[i].group].some((j) => S.props[j] && S.props[j].houses);
  const list = (pid, name) => {
    const l = propsOf(pid);
    return l.length ? l.map((i) => `<label class="${hasBuild(i) ? "dis" : ""}"><input type="checkbox" name="${name}" value="${i}" ${hasBuild(i) ? "disabled" : ""}><i style="--g:${gcolor(i)}"></i>${h(BOARD[i].name)}${S.props[i].mortgaged ? " <small class='muted'>(hipotecada)</small>" : ""}${hasBuild(i) ? " <small class='muted'>(tem casas)</small>" : ""}</label>`).join("") : `<span class="muted">Nenhum imóvel.</span>`;
  };
  return `<div class="in"><h2 style="font-size:24px;margin-bottom:12px">Propor troca</h2>
    <label for="tTo">Com quem</label><select id="tTo">${others.map((p) => `<option value="${p.id}" ${p.id === tradeTo ? "selected" : ""}>${p.pawn} ${h(p.name)} (${money(p.cash)})</option>`).join("")}</select>
    <div class="tgrid" style="margin-top:14px">
      <div><b>Você dá</b><div class="tlist">${list(m.id, "give")}</div>
        <label for="tGiveCash">Dinheiro, em mil (você tem ${money(m.cash)})</label><input id="tGiveCash" type="number" min="0" max="${m.cash}" value="0" inputmode="numeric">
        ${m.jailCards.length ? `<label class="check" style="color:var(--ink)"><input type="checkbox" id="tGiveCard"> Habeas corpus</label>` : ""}</div>
      <div><b>Você recebe</b><div class="tlist">${o ? list(o.id, "get") : ""}</div>
        <label for="tGetCash">Dinheiro, em mil (${h(o?.name)} tem ${money(o?.cash || 0)})</label><input id="tGetCash" type="number" min="0" max="${o?.cash || 0}" value="0" inputmode="numeric">
        ${o && o.jailCards.length ? `<label class="check" style="color:var(--ink)"><input type="checkbox" id="tGetCard"> Habeas corpus</label>` : ""}</div>
    </div>
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button data-close>Cancelar</button><button class="primary" id="tSend">Enviar proposta</button></div></div>`;
}
function bindTrade() {
  $("tTo").onchange = () => { tradeTo = $("tTo").value; delete $("modalBox").dataset.trade; renderModal(); };
  $("tSend").onclick = async () => {
    const pick = (n) => [...document.querySelectorAll(`input[name=${n}]:checked`)].map((x) => +x.value);
    const ok = await act("propose", { to: tradeTo,
      give: { props: pick("give"), cash: +$("tGiveCash").value || 0, cards: $("tGiveCard")?.checked ? 1 : 0 },
      get: { props: pick("get"), cash: +$("tGetCash").value || 0, cards: $("tGetCard")?.checked ? 1 : 0 } });
    if (ok) { closeModal(); toast("Proposta enviada."); }
  };
}
$("btnTrade").onclick = () => { delete $("modalBox").dataset.trade; openModal({ kind: "trade" }); };
$("btnGift").onclick = () => { delete $("modalBox").dataset.gift; openModal({ kind: "gift" }); };
function giftModal() {
  const m = me(), mates = S.players.filter((p) => p.team === m.team && p.id !== m.id && !p.bankrupt);
  if (!mates.length) return `<div class="in"><p>Nenhum colega de equipe no jogo.</p><button data-close>Fechar</button></div>`;
  return `<div class="in"><h2 style="font-size:24px;margin-bottom:12px">💸 Mandar dinheiro</h2>
    <label for="gTo">Para qual colega</label><select id="gTo">${mates.map((p) => `<option value="${p.id}">${p.pawn} ${h(p.name)} (${money(p.cash)})</option>`).join("")}</select>
    <label for="gVal" style="margin-top:12px">Quanto, em mil (você tem ${money(m.cash)})</label><input id="gVal" type="number" min="1" max="${m.cash}" inputmode="numeric" placeholder="Ex.: 100">
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button data-close>Cancelar</button><button class="primary" id="gSend">Mandar</button></div></div>`;
}

if (!urlCode) show("home");
