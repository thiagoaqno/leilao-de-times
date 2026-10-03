// Banco da Galera — painel de ação, jogadores e dinheiro na tela (parte 3 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- painel de ação ----------
function renderAction() {
  const el = $("act"), m = me(), cur = P(S.turn), mine = m && cur && m.id === cur.id;
  const myDebts = m ? S.debts.filter((d) => d.from === m.id) : [];
  let html = "";

  if (S.phase === "ended") {
    const rank = [...S.players].sort((a, b) => a.rank - b.rank);
    const wt = S.winnerTeam != null ? T.TEAMS[S.winnerTeam] : null;
    const teamRows = S.teamTotals ? S.teamTotals.map((v, k) => [k, v]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="tm" style="--tc:${T.TEAMS[k].color}"><span>${T.TEAMS[k].icon} ${h(T.TEAMS[k].name)}</span><span class="num">${v ? money(v) : "faliu"}</span></div>`).join("") : "";
    html = `<h3>🏆 Fim de jogo</h3>${wt ? `<p style="margin:6px 0 0;font-weight:700">O ${wt.icon} ${h(wt.name)} venceu!</p><div class="podium">${teamRows}</div>` : ""}<div class="podium">${rank.map((p) => `<div><span>${p.rank}º ${p.pawn} ${h(p.name)}</span><span class="num">${p.bankrupt ? "faliu" : money(p.worth)}</span></div>`).join("")}</div>
      <p class="muted" style="font-size:13px;margin:0">Patrimônio = dinheiro + imóveis + construções.</p>
      ${m && S.host === m.id ? `<button class="primary" id="aRestart" style="margin-top:12px;width:100%">Jogar de novo com a mesma galera</button>` : ""}<button onclick="location.href='/'" style="margin-top:8px;width:100%">🏠 Voltar ao lobby</button>`;
  } else if (S.auction) {
    const a = S.auction, lead = P(a.leader);
    html = `<h3>🔨 Leilão aberto</h3><p class="muted" style="margin:4px 0 10px">${h(BOARD[a.prop].name)} · maior lance ${a.bid ? `<b>${money(a.bid)}</b>${lead ? ` de ${lead.pawn} ${h(lead.name)}` : ""}` : "ainda sem lances"}</p><button class="primary" id="aAucOpen" style="width:100%">🔨 Abrir o leilão</button>`;
  } else if (S.choice) {
    const c = S.choice, pw = T.POWER[c.kind], who = P(c.player);
    if (m && c.player === m.id) {
      html = `<h3>${pw.icon} ${h(pw.title)}</h3>` + (c.step === 2
        ? `<p class="muted" style="margin:4px 0 10px">${h(pw.ask2)} (${h(BOARD[c.prop].name)})</p><div class="row">${c.options.map((id) => { const o = P(id); return `<button data-pick="${id}">${o.pawn} ${h(o.name)}</button>`; }).join("")}</div>`
        : `<p class="muted" style="margin:4px 0 10px">${h(pw.ask)} Toque na casa piscando no tabuleiro ou aqui:</p><div class="chips">${c.options.map((i) => { const o = P(S.props[i].owner), pr = S.props[i]; return `<button class="chip" data-pick="${i}" style="--g:${gcolor(i)}"><i></i>${o.pawn} ${h(BOARD[i].name)}${pr.houses ? ` <small>${pr.houses === 5 ? "🏨" : "🏠" + pr.houses}</small>` : ""}</button>`; }).join("")}</div>`);
    } else html = `<h3>${pw.icon} ${h(pw.title)}</h3><p class="muted" style="margin:6px 0 0">${who.pawn} ${h(who.name)} está escolhendo o alvo…</p>`;
  } else if (myDebts.length) {
    const total = myDebts.reduce((s, d) => s + d.amount, 0);
    html = `<h3>💸 Conta para pagar</h3>
      ${myDebts.map((d) => `<p style="margin:6px 0">Você deve <b>${money(d.amount)}</b> a <b>${h(P(d.to)?.name || "o banco")}</b> (${h(d.reason)}).</p>`).join("")}
      <p class="muted" style="margin:6px 0 12px">Você tem <b class="num">${money(m.cash)}</b>. ${m.cash < total ? `Faltam <b>${money(total - m.cash)}</b>: toque nos seus imóveis para vender casas ou hipotecar, ou proponha uma troca.` : ""}</p>
      <div class="row"><button class="primary big" id="aPay" ${m.cash < total ? "disabled" : ""}>Pagar ${money(total)}</button><button class="danger" id="aBroke">Declarar falência</button></div>`;
  } else if (S.debts.length) {
    const d = S.debts[0];
    html = `<h3>⏳ Esperando pagamento</h3><p style="margin:6px 0 0">${h(P(d.from)?.name)} precisa levantar ${money(d.amount)} para pagar ${h(P(d.to)?.name || "o banco")}.</p>`;
  } else if (!mine) {
    html = `<h3>Vez de ${cur ? `${cur.pawn} ${h(cur.name)}` : "…"}</h3>
      <p class="muted" style="margin:6px 0 0">${S.stage === "buy" ? `Decidindo se compra ${h(BOARD[S.buyOffer].name)}…` : S.stage === "moving" ? "Jogando…" : cur && !cur.online ? "Está desconectado. Quando voltar, continua de onde parou." : "Enquanto isso, dá para negociar trocas e mexer nos seus imóveis."}</p>
      ${m && S.host === m.id && cur && !cur.online ? `<button class="danger small" id="aKickCur" style="margin-top:10px">Tirar ${h(cur.name)} do jogo</button>` : ""}`;
  } else if (S.stage === "moving") {
    html = `<h3>🎲 Lá vai…</h3><p class="muted" style="margin:4px 0 0">Esperando o peão chegar.</p>`;
  } else if (S.stage === "roll") {
    if (m.inJail) {
      html = `<h3>🚔 Você está preso</h3><p class="muted" style="margin:4px 0 12px">Tentativa ${m.jailTurns + 1} de 3. Tire uma dupla para sair, ou pague a fiança.</p>
        <div class="row"><button class="primary big" id="aRoll">Tentar dupla</button><button id="aJailPay" ${m.cash < T.JAIL_FINE ? "disabled" : ""}>Pagar ${money(T.JAIL_FINE)}</button>${m.jailCards.length ? `<button id="aJailCard">Usar habeas corpus</button>` : ""}</div>`;
    } else html = `<h3>Sua vez!</h3><p class="muted" style="margin:4px 0 12px">${S.doubles ? "Você tirou dupla, jogue de novo." : "Jogue os dados."}</p><button class="primary big" id="aRoll" style="width:100%">🎲 Jogar os dados</button>`;
  } else if (S.stage === "buy") {
    const s = BOARD[S.buyOffer], price = T.priceOf(S.buyOffer, S.event?.id), can = m.cash >= price;
    html = `<h3>Comprar?</h3>
      <div class="deed-mini" style="--g:${s.group ? GROUPS[s.group].color : "#bbb"}"><div class="sw"></div><div><b style="font-size:18px">${h(s.name)}</b><div class="muted" style="font-size:13px">${s.type === "prop" ? `aluguel ${money(s.rent[0])} · com hotel ${money(s.rent[5])}` : s.type === "air" ? "aluguel de R$ 25 mil a R$ 200 mil" : "aluguel 4x ou 10x os dados"}</div></div></div>
      <div class="row"><button class="primary big" id="aBuy" ${can ? "" : "disabled"}>Comprar por ${money(price)}${price < s.price ? ` <s style="opacity:.55;font-weight:600">${short(s.price)}</s>` : ""}</button><button id="aDecline">${S.config.auction ? "Mandar a leilão" : "Não comprar"}</button></div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">Você tem ${money(m.cash)}.${can ? "" : " Hipoteque algo para ter dinheiro, ou mande a leilão."} <a href="#" id="aSee" style="color:inherit">Ver escritura</a></p>`;
  } else if (S.stage === "done") {
    html = `<h3>Sua vez</h3><p class="muted" style="margin:4px 0 12px">Construa, hipoteque ou negocie antes de passar.</p><button class="primary big" id="aEnd" style="width:100%">Passar a vez</button>`;
  }
  if (S.phase === "playing" && !S.auction && S.deadline && m && S.deadline.who === m.id) {
    const what = myDebts.length ? "o banco vende e hipoteca por você" : S.stage === "choose" ? "o alvo é sorteado" : S.stage === "roll" ? "o dado roda sozinho" : S.stage === "buy" ? (S.config.auction ? "a cidade vai a leilão" : "você não compra") : "a vez passa";
    html = `<div class="tbar" id="tbar"><i></i></div><p class="muted" style="margin:-6px 0 8px;font-size:12.5px">⏱ <span class="tsec" data-clock="turn"></span> para agir, senão ${what}.</p>` + html;
  }
  if (m && S.host === m.id && S.phase === "playing") html += `<details style="margin-top:14px"><summary class="muted" style="cursor:pointer;font-size:13px">Organizador</summary><button class="danger small" id="aFinish" style="margin-top:8px">Encerrar agora e ver o ranking</button></details>`;
  el.innerHTML = html;
  const stepKey = `${S.phase}|${S.turn}|${S.stage}|${!!S.auction}|${S.choice ? S.choice.step : ""}|${S.debts.length}`;
  if (el.dataset.k !== stepKey) { el.dataset.k = stepKey; el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }

  const on = (id, fn) => { if ($(id)) $(id).onclick = fn; };
  on("aRoll", () => act("roll")); on("aJailPay", () => act("payJail")); on("aJailCard", () => act("useCard"));
  on("aBuy", () => act("buy")); on("aDecline", () => act("decline")); on("aEnd", () => act("endTurn"));
  on("aSee", (e) => { e.preventDefault(); openModal({ kind: "prop", i: S.buyOffer }); });
  on("aPay", () => act("pay"));
  on("aBroke", () => { if (confirm("Declarar falência? Você sai do jogo e seus bens vão para quem você deve.")) act("bankrupt"); });
  on("aRestart", () => act("restart"));
  on("aFinish", () => { if (confirm("Encerrar a partida agora? Vence quem tiver o maior patrimônio.")) act("end"); });
  on("aKickCur", () => { if (confirm(`Tirar ${cur.name} do jogo? Os imóveis voltam para o banco.`)) act("forceBankrupt", { id: cur.id }); });
  el.querySelectorAll("[data-pick]").forEach((b) => (b.onclick = () => act("choose", { value: S.choice && S.choice.step === 2 ? b.dataset.pick : +b.dataset.pick })));
  el.querySelectorAll("[data-bid]").forEach((b) => (b.onclick = () => act("bid", { value: +b.dataset.bid })));
  on("aBid", () => { const v = +$("aVal").value; if (v) act("bid", { value: v }); });
  if ($("aVal")) $("aVal").addEventListener("keydown", (e) => { if (e.key === "Enter") $("aBid").click(); });
  on("aPass", () => act("pass"));
  on("aAucOpen", () => $("auc").classList.remove("min"));
  tickTimer();
}
function tickClocks() {
  if (!S) return;
  const now = relogio.agora(), dl = S.deadline;
  const left = dl ? Math.max(0, Math.ceil((dl.at - now) / 1000)) : null;
  document.querySelectorAll("[data-clock=turn]").forEach((el) => { el.textContent = left == null ? "" : left + "s"; });
  const bar = $("tbar");
  if (bar && dl) { bar.firstChild.style.width = Math.max(0, Math.min(1, (dl.at - now) / dl.total)) * 100 + "%"; bar.classList.toggle("low", left <= 10); }
  const g = $("gclock");
  if (S.endsAt && S.phase === "playing") {
    const ms = Math.max(0, S.endsAt - now), mm = Math.floor(ms / 60000), ss = Math.floor(ms / 1000) % 60;
    g.textContent = `⏳ ${mm}:${String(ss).padStart(2, "0")}`; g.classList.remove("hidden"); g.classList.toggle("low", ms < 5 * 60000);
    const bc = $("boardClock"); // o mesmo relógio, grande, no meio do tabuleiro
    bc.innerHTML = `⏳ ${mm}:${String(ss).padStart(2, "0")}<small>para acabar</small>`; bc.classList.remove("hidden"); bc.classList.toggle("low", ms < 5 * 60000);
  } else { g.classList.add("hidden"); $("boardClock").classList.add("hidden"); }
  tickTimer();
}
setInterval(tickClocks, 250);
function tickTimer() {
  const t = $("aTimer"); if (!t || !S.auction) return;
  const left = Math.max(0, Math.ceil((S.auction.endsAt - (relogio.agora())) / 1000));
  t.textContent = left + "s"; t.classList.toggle("low", left <= 3);
  const arc = $("aucArc");
  if (arc) {
    const f = Math.max(0, Math.min(1, (S.auction.endsAt - (relogio.agora())) / 15000));
    arc.style.strokeDashoffset = (213.6 * (1 - f)).toFixed(1);
    $("aucRing").classList.toggle("low", left <= 3);
  }
}

// ---------- jogadores, imóveis, trocas, histórico ----------
function propsOf(pid) { return Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid).sort((a, b) => a - b); }
const gcolor = (i) => (BOARD[i].group ? GROUPS[BOARD[i].group].color : "#cbbf9f");
const seenTrades = new Set();
function renderTrades() {
  const m = me();
  $("tradesCard").classList.toggle("hidden", !m || m.bankrupt || S.phase !== "playing");
  $("btnGift").classList.toggle("hidden", !(m && S.config.teams && S.players.some((p) => p.team === m.team && p.id !== m.id && !p.bankrupt)));
  if (!m) return;
  const side = (s) => [...s.props.map((i) => `<span class="chip" style="--g:${gcolor(i)};margin:2px 0" data-i="${i}"><i></i>${h(BOARD[i].name)}</span>`), s.cash ? `<b>${money(s.cash)}</b>` : "", s.cards ? "🎫 habeas corpus" : ""].filter(Boolean).join(" ") || "<span class='muted'>nada</span>";
  const mineT = S.trades.filter((t) => t.from === m.id || t.to === m.id);
  $("trades").innerHTML = mineT.map((t) => {
    const inc = t.to === m.id, other = P(inc ? t.from : t.to);
    const youGive = inc ? t.get : t.give, youGet = inc ? t.give : t.get;
    return `<div class="trade ${inc ? "in" : ""}"><b>${inc ? `${other.pawn} ${h(other.name)} te propôs:` : `Sua proposta para ${other.pawn} ${h(other.name)}:`}</b>
      <div class="sides"><div><small class="muted">Você dá</small><br>${side(youGive)}</div><span>⇄</span><div><small class="muted">Você recebe</small><br>${side(youGet)}</div></div>
      <div class="row">${inc ? `<button class="primary small" data-acc="${t.id}">Aceitar</button><button class="small" data-rej="${t.id}">Recusar</button>` : `<span class="muted" style="font-size:13px">Esperando resposta…</span><button class="ghost small" data-can="${t.id}">Retirar</button>`}</div></div>`;
  }).join("");
  $("trades").querySelectorAll("[data-acc]").forEach((b) => (b.onclick = () => act("accept", { id: b.dataset.acc })));
  $("trades").querySelectorAll("[data-rej]").forEach((b) => (b.onclick = () => act("reject", { id: b.dataset.rej })));
  $("trades").querySelectorAll("[data-can]").forEach((b) => (b.onclick = () => act("cancel", { id: b.dataset.can })));
  $("trades").querySelectorAll(".chip[data-i]").forEach((b) => (b.onclick = () => openModal({ kind: "prop", i: +b.dataset.i })));
  for (const t of mineT) if (t.to === m.id && !seenTrades.has(t.id)) { seenTrades.add(t.id); toast(`🤝 ${P(t.from).name} te propôs uma troca!`); }
}
function renderLog() {
  $("log").innerHTML = [...S.log].reverse().slice(0, 60).map((l) => `<div>${h(l.text)}</div>`).join("");
}
// ---------- dinheiro na tela ----------
// Placas com o dinheiro de cada jogador em cima do tabuleiro. Cada pagamento vira uma nota
// voando de quem paga para quem recebe (ou para o banco/casa), com "+R$"/"−R$" pulando e o
// número da placa contando até o valor novo. Quem recebe só vê o dinheiro subir quando a nota chega.
const shown = {}, inflight = {}, tweens = {};
let lastFx = null;
function renderPlates() {
  const box = $("plates");
  const list = S.config.teams ? [...S.players].sort((a, b) => a.team - b.team) : S.players;
  const ids = list.map((p) => p.id + (p.team ?? "")).join();
  if (box.dataset.ids !== ids) {
    box.dataset.ids = ids;
    box.innerHTML = list.map((p) => `<div class="plate" id="pl-${p.id}">${p.team != null ? `<span class="tteam team" style="--tc:${T.TEAMS[p.team].color}">${T.TEAMS[p.team].icon}</span>` : ""}<div class="pw"></div><div class="tx"><div class="nm"></div><div class="amt num"></div></div></div>`).join("");
  }
  for (const p of S.players) {
    const el = $("pl-" + p.id);
    el.style.setProperty("--c", p.color);
    el.classList.toggle("turn", p.id === S.turn && S.phase === "playing");
    el.classList.toggle("dead", p.bankrupt);
    el.classList.toggle("me", !!(ME && p.id === ME.id));
    el.querySelector(".pw").textContent = p.pawn;
    el.querySelector(".nm").dataset.pawn = p.pawn;
    el.querySelector(".nm").textContent = p.bankrupt ? `${p.name} · faliu` : p.inJail ? `${p.name} · 🚔` : p.name;
  }
  updatePlates();
}
function updatePlates() {
  if (!S) return;
  for (const p of S.players) tweenTo(p.id, p.bankrupt ? 0 : p.cash - (inflight[p.id] || 0));
}
function tweenTo(id, target) {
  const el = $("pl-" + id); if (!el) return;
  const amt = el.querySelector(".amt");
  const from = shown[id] ?? target;
  cancelAnimationFrame(tweens[id]);
  if (from === target) { shown[id] = target; amt.textContent = money(target); if (ME && id === ME.id) $("wAmt").textContent = money(target); return; }
  const t0 = performance.now(), dur = 650;
  (function f(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    shown[id] = Math.round(from + (target - from) * e);
    amt.textContent = money(shown[id]);
    if (ME && id === ME.id) $("wAmt").textContent = money(shown[id]);
    if (k < 1) tweens[id] = requestAnimationFrame(f);
  })(t0);
}

const isPlayer = (w) => !!(w && w !== "pot" && P(w));
function spot(who, sq) {
  const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  if (ME && who === ME.id && !$("wallet").classList.contains("hidden")) {
    const r = $("wAmt").getBoundingClientRect(); // o seu dinheiro voa para a sua carteira, se ela estiver na tela
    if (r.bottom > 0 && r.top < innerHeight) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (isPlayer(who) && $("pl-" + who)) return c($("pl-" + who));
  if (who === "pot" && $("pot").textContent) return c($("pot"));
  if (sq != null && $("sq" + sq)) return c($("sq" + sq));
  return c($("dice")); // o banco fica no meio do tabuleiro
}
function popAt(pt, text, cls, sub) {
  const el = document.createElement("div");
  el.className = "pop " + cls;
  el.innerHTML = `${h(text)}${sub ? `<small>${h(sub)}</small>` : ""}`;
  el.style.left = pt.x + "px"; el.style.top = pt.y - 18 + "px";
  $("fly").appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
function bump(id, cls) {
  if (ME && id === ME.id) { const w = $("wallet"); w.classList.remove("gain", "loss"); void w.offsetWidth; w.classList.add(cls); }
  const el = $("pl-" + id); if (!el) return;
  el.classList.remove("gain", "loss"); void el.offsetWidth; el.classList.add(cls);
}
function flyNote(a, b, text, delay) {
  const n = document.createElement("div");
  n.className = "note"; n.textContent = text;
  $("fly").appendChild(n);
  const dx = b.x - a.x, dy = b.y - a.y, lift = Math.min(170, 50 + Math.hypot(dx, dy) * 0.3);
  const at = (x, y, s, r) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s}) rotate(${r}deg)`;
  const anim = n.animate([
    { transform: at(a.x, a.y, 0.5, -10), opacity: 0 },
    { transform: at(a.x + dx * 0.15, a.y + dy * 0.15 - lift * 0.5, 1.1, -4), opacity: 1, offset: 0.2 },
    { transform: at(a.x + dx * 0.55, a.y + dy * 0.55 - lift, 1.15, 6), opacity: 1, offset: 0.55 },
    { transform: at(b.x, b.y, 0.75, 0), opacity: 1 },
  ], { duration: 1000, delay, easing: "cubic-bezier(.45,0,.35,1)", fill: "both" });
  return anim.finished.then(() => n.remove(), () => n.remove());
}
function flash(sq) {
  const el = $("sq" + sq); if (!el) return;
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}
function playFx(e) {
  if (e.kind === "news") return spotNews(e);
  if (e.kind === "deed") return flyDeed(e);
  if (e.kind === "boom") return boomAt(e.sq);
  if (e.kind === "shield") return shieldAt(e.sq);
  const a = spot(e.from, e.sq), b = spot(e.to, e.sq);
  if (e.sq != null) flash(e.sq);
  if (isPlayer(e.from)) { popAt(a, "−" + money(e.amount), "minus", e.label); bump(e.from, "loss"); Sound.play("pay"); }
  // notas: mais dinheiro, mais notas voando
  const n = e.amount >= 500 ? 4 : e.amount >= 150 ? 3 : e.amount >= 50 ? 2 : 1;
  const flights = [];
  for (let k = 0; k < n; k++) flights.push(flyNote(a, b, k === n - 1 ? money(e.amount) : "💵", k * 110));
  Promise.all(flights).then(() => {
    if (isPlayer(e.to)) {
      inflight[e.to] = Math.max(0, (inflight[e.to] || 0) - e.amount);
      popAt(b, "+" + money(e.amount), "plus", e.label); bump(e.to, "gain"); updatePlates(); Sound.play("coin");
    }
  });
}
// Chamado a cada estado: toca os pagamentos novos, um atrás do outro.
function runFx() {
  const list = S.fx || [];
  const max = list.reduce((m, e) => Math.max(m, e.id), 0);
  if (lastFx === null) { lastFx = max; return; } // ao entrar na mesa, não repete o passado
  const news = list.filter((e) => e.id > lastFx);
  lastFx = Math.max(lastFx, max);
  if (document.hidden) return; // aba escondida: só atualiza os números
  news.forEach((e, k) => {
    if (!e.kind && isPlayer(e.to)) inflight[e.to] = (inflight[e.to] || 0) + e.amount; // segura o número até a nota chegar
    setTimeout(() => playFx(e), k * 260);
  });
}
