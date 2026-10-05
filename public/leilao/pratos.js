// Leilão da Galera — prato montado e a batalha dos pratos (parte 3 de 4 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- PRATO MONTADO (temas de comida) ----------
function dishHTML(c){
  const now = performance.now(), extra = previewFor(c);
  // o ingrediente que acabou de chegar só entra no prato quando o voo termina (elenco.js)
  const parts = c.team.map(x => {
    const { name, cat } = Ratings.parseItem(x.player), key = c.id + "|" + x.player;
    viuItem(c, x.player, key);
    return { name, cat, age: now - arrivedAt.get(key) - VOO_MS, price: x.price };
  }).filter(p => p.age >= 0);
  if (extra) { const g = Ratings.parseItem(extra); parts.push({ name: g.name, cat: g.cat, ghost: true }); }
  // categorias do tema que ainda estão vazias aparecem tracejadas
  const preset = PRESETS.find(p => p.id === skinNow), have = {};
  parts.forEach(p => have[p.cat] = (have[p.cat] || 0) + 1);
  // no máximo uma camada tracejada por vaga livre, as obrigatórias primeiro
  const req = (S.config.comp && S.config.comp.req) || {}, free = Math.max(0, S.config.perTeam - c.team.length - (extra ? 1 : 0));
  const missing = Object.entries((preset && preset.slots) || {}).flatMap(([cat, n]) => Array(Math.max(0, n - (have[cat] || 0))).fill(cat))
    .sort((x, y) => (req[y] ? 1 : 0) - (req[x] ? 1 : 0)).slice(0, free);
  const list = c.team.length ? `<ul class="dishlist">${parts.filter(p => !p.ghost).map(p => `<li><span>${esc(p.name)}</span><b>${p.price}</b></li>`).join("")}</ul>` : "";
  const note = extra ? `<div class="ghostnote">Se você levar <b>${esc(Ratings.parseItem(extra).name)}</b>, seu ${esc(T().team)} fica assim (a parte piscando).</div>` : "";
  return `${note}<div class="dish">${Cozinha.draw(skinNow, parts, missing, c.id)}${balao(c.id + "|*", "prato")}</div>${list}`;
}
function teamPower(c){ const E = lineupOf(c); return `<span>Ataque <b>${Math.round(E.att)}</b></span><span>Defesa <b>${Math.round(E.def)}</b></span>`; }
// ---------- BATALHA DOS PRATOS (júri do site + voto da galera) ----------
const JUDGE_SKINS = ["hamburguer", "pizza", "drink", "sobremesa"];
const withDish = () => S.captains.filter(c => c.team.length);
function votedLine(){
  const j = S.judge, voters = withDish();
  const done = voters.filter(c => (j.voted[c.id] || 0) >= voters.length - 1).length;
  return { done, total: voters.length, text: voters.map(c => `${esc(c.name)} ${(j.voted[c.id] || 0) >= voters.length - 1 ? "✓" : (j.voted[c.id] ? `(${j.voted[c.id]}/${voters.length - 1})` : "…")}`).join(" · ") };
}
function renderJudge(){
  const food = JUDGE_SKINS.includes(T().skin), j = S.judge;
  // organizador: abrir e encerrar
  $("judgeBox").classList.toggle("hidden", !(me.host && food));
  if (me.host && food) {
    const voting = j && j.status === "voting";
    $("btnJudgeOpen").classList.toggle("hidden", !!voting);
    $("btnJudgeOpen").textContent = j && j.status === "done" ? "Abrir nova votação" : "Abrir votação";
    $("btnJudgeOpen").disabled = S.phase !== "done" || withDish().length < 2;
    $("btnJudgeClose").classList.toggle("hidden", !voting);
    const v = voting ? votedLine() : null;
    $("judgeStatus").innerHTML = S.phase !== "done" ? "Encerre o leilão para abrir a votação." : voting ? `Votaram ${v.done} de ${v.total}: ${v.text}` : j && j.status === "done" ? "Pratos julgados. Revele o resultado lá embaixo." : "";
    $("judgeTitle").textContent = `${T().icon || "🍽️"} Batalha de ${T().teams} no site`;
  }
  // participantes: votar nos pratos dos outros
  const card = $("voteCard"), mine = me.capId && capById(me.capId);
  const show = food && j && j.status === "voting";
  card.classList.toggle("hidden", !show);
  if (!show) return;
  const others = withDish().filter(c => c.id !== me.capId), v = votedLine();
  const canVote = mine && mine.team.length;
  const head = `<div class="simhead"><h2>🗳️ Vote nos ${esc(T().teams)}</h2><span class="pill">${v.done} de ${v.total} já votaram</span></div>`;
  if (!canVote) { card.innerHTML = head + `<p class="muted">A galera está votando. Quem votou: ${v.text}</p>`; return; }
  const left = others.filter(c => j.mine[c.id] == null).length;
  card.innerHTML = head + `<p class="muted" style="margin:0 0 14px">Dê uma nota de 1 a 10 para cada ${esc(T().team)}. Seu voto fica em segredo até a revelação, e dá para mudar até o organizador encerrar.${left ? ` Falta${left > 1 ? "m" : ""} <b style="color:var(--info)">${left}</b>.` : " <b style='color:var(--good)'>Você já votou em todos!</b>"}</p>
    <div class="votes">${others.map(c => `<div class="votedish">
      <h3>${esc(T().prefix)} ${esc(c.name)}</h3>
      <div class="dish">${Cozinha.draw(T().skin, c.team.map(x => Ratings.parseItem(x.player)), [], c.id)}</div>
      <p class="hint" style="margin:0 0 8px">${c.team.map(x => esc(Ratings.parseItem(x.player).name)).join(" · ")}</p>
      <div class="scores">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<button type="button" class="${j.mine[c.id] === n ? "on" : ""}" data-vote="${c.id}" data-score="${n}" aria-label="Nota ${n} para ${escA(c.name)}">${n}</button>`).join("")}</div>
    </div>`).join("")}</div>`;
}
$("voteCard").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vote]"); if (!b) return;
  socket.emit("vote", { target: b.dataset.vote, score: +b.dataset.score }, (r) => { if (r && !r.ok) toast(r.error); });
});
$("btnJudgeOpen").onclick = () => {
  const redo = S.judge && S.judge.status === "done";
  if (!confirm(redo ? "Abrir uma votação nova? Os votos anteriores são apagados." : "Abrir a votação? Cada participante vai dar nota para os pratos dos outros.")) return;
  host("judgeOpen");
};
$("btnJudgeClose").onclick = () => {
  const v = votedLine(), pend = v.total - v.done;
  if (!confirm(pend ? `${pend} ainda não ${pend > 1 ? "terminaram" : "terminou"} de votar. Encerrar mesmo assim?` : "Encerrar a votação e julgar os pratos?")) return;
  if (S.reveal && S.reveal.total && S.reveal.shown < S.reveal.total && !confirm("Isso substitui o resultado que está sendo revelado. Continuar?")) return;
  socket.emit("host", { action: "judgeClose" }, (r) => { if (r && !r.ok) return toast(r.error); toast("Pratos julgados! Revele parte por parte."); setTimeout(() => $("revCard").scrollIntoView({ behavior: "smooth", block: "start" }), 150); });
};
function renderFc(){
  const show = me.host && isFootball() && S.captains.some(c => c.team.length);
  $("fcBox").classList.toggle("hidden", !show);
}

socket.on("state", (st) => {
  if (st.now) clockSkew = st.now - Date.now();
  S = st;
  setSkin(st.config.terms && st.config.terms.skin);
  if (promptRoom !== st.code) { promptRoom = st.code; const k = st.config.terms && st.config.terms.prompt; if (k) $("pSport").value = k; if (k === "futebol" || k === "futsal") $("fcSport").value = k; syncPromptUI(); }
  render();
});
function syncPromptUI(){
  const k = $("pSport").value, game = !["food","generic"].includes(k);
  $("pFormatWrap").classList.toggle("hidden", !game);
  $("pEraWrap").classList.toggle("hidden", !game);
}
$("pSport").addEventListener("change", syncPromptUI);

function T(){ return (S && S.config.terms) || { item:"jogador", items:"jogadores", team:"time", teams:"times", prefix:"Time", prompt:"generic" }; }
const catOf = (item) => { const m = /\(([^)]+)\)\s*$/.exec(item || ""); return m ? m[1].trim() : null; };
function compReq(){ const c = S.config.comp || { mode:"free" }; return c.mode === "exact" ? c.slots : c.mode === "min" ? c.req : {}; }
function countCat(c, cat){ return c.team.filter(x => catOf(x.player) === cat).length; }
function needsOf(c){ const r = compReq(), out = []; for (const [k,v] of Object.entries(r)) { const n = v - countCat(c,k); if (n > 0) out.push(n > 1 ? `${n} ${k}` : k); } return out; }
function blockReason(c, item){
  const comp = S.config.comp || { mode:"free" }, cat = catOf(item);
  if (c.team.length >= S.config.perTeam) return "Você já completou todas as vagas. Só acompanhe.";
  if (comp.mode === "exact" && cat && comp.slots[cat] != null && countCat(c,cat) >= comp.slots[cat]) return `Você já tem ${countCat(c,cat)} ${cat}, que é o máximo da composição. Só acompanhe esta.`;
  const r = compReq(), n = needsOf(c);
  if (cat && r[cat] != null && countCat(c, cat) >= r[cat]) return `Você já tem ${cat}. Os que sobraram estão guardados para quem ainda precisa. Só acompanhe esta.`;
  return n.length ? `Você precisa guardar sua${S.config.perTeam - c.team.length > 1 ? "s vagas" : " vaga"} para: ${n.join(", ")}. Só acompanhe esta.` : "Você não pode pegar este item. Só acompanhe.";
}
function capById(id){ return S.captains.find(c => c.id === id); }
function maxBidFor(c){ return c.coins - (S.config.perTeam - c.team.length - 1) * S.config.minBid; }

function render(){
  // o estado pode chegar antes das últimas partes do script (aovivo.js, elenco.js) carregarem: elas desenham quando chegam
  if (typeof renderTrocas !== "function") return;
  const st = S, cfg = st.config;
  $("rCode").textContent = st.code;
  const mine = me.capId && capById(me.capId);
  $("rRole").textContent = (me.host ? "Organizador" : "") + (me.host && mine ? " · " : "") + (mine ? "Você: " + mine.name : (me.host ? "" : "Espectador"));
  const OPEN = cfg.mode === "open";
  const t = T();
  $("teamsTitle").textContent = cap(t.teams);
  $("rRules").textContent = (t.icon ? t.icon + " " + t.label + " · " : "") + (OPEN ? "🔨 Lance aberto · " : "🔒 Lance secreto · ") + `${cfg.perTeam} por ${t.team} · ${cfg.coins} moedas${OPEN ? "" : ` · ${cfg.skips} pulo${cfg.skips===1?"":"s"}`} · mín. ${cfg.minBid}${cfg.timer?` · ${cfg.timer}s${OPEN?" por lance":""}`:""}`;
  $("rPool").textContent = `${st.poolCount} na roleta`;
  const comp = cfg.comp || { mode:"free" };
  if (["futsal","futebol"].includes(t.prompt)) $("rRules").textContent += cfg.formLock === "locked" ? " · formação travada" : " · formação fluida";
  if (st.poolHidden) $("rRules").textContent += " · 🙈 roleta oculta";
  if (comp.mode !== "free") $("rRules").textContent += comp.mode === "exact" ? ` · composição: ${fmtCats(comp.slots)}` : ` · obrigatório: ${fmtCats(comp.req)}`;

  // teams
  const cur = st.current;
  antesDeDesenhar(); // onde cada um estava, para os voos e para deslizar quem mudou de lugar (elenco.js)
  $("teams").innerHTML = st.captains.map(c => {
    const FB = isFootball();
    const slots = Array.from({length: cfg.perTeam}, (_, i) => { if (!c.team[i]) return `<li class="empty"><span>vaga</span><span></span></li>`;
      const it = c.team[i].player, key = c.id + "|" + it; viuItem(c, it, key); const ch = chegada(key);
      return `<li class="${ch.cls}" style="${ch.style}" data-item="${escA(Ratings.parseItem(it).name)}"><span>${esc(c.team[i].player)}${FB ? subTag(c.team[i].player) : ""}${FB ? ` <b class="ovr${Ratings.ratingOf(c.team[i].player).est ? " est" : ""}">${Ratings.ratingOf(c.team[i].player).ovr}</b>` : ""}</span><span>${c.team[i].price}</span>${balao(key)}</li>`; }).join("");
    let bs = "";
    if (cur && st.phase === "bidding") {
      if (!cur.eligible.includes(c.id)) bs = `<span class="bidstate muted">${c.team.length >= cfg.perTeam ? "completo" : "não pode"}</span>`;
      else if (OPEN) {
        if (cur.high && cur.high.id === c.id) bs = `<span class="bidstate" style="color:var(--good)">▲ na frente</span>`;
        else if (cur.passed[c.id]) bs = `<span class="bidstate muted">saiu</span>`;
        else if (maxBidFor(c) < (cur.high ? cur.high.amount + 1 : cfg.minBid)) bs = `<span class="bidstate muted">sem moedas</span>`;
        else bs = `<span class="bidstate" style="color:var(--accent)">na disputa</span>`;
      }
      else if (cur.bids[c.id]) bs = `<span class="bidstate" style="color:var(--good)">✓ pronto</span>`;
      else bs = `<span class="bidstate" style="color:var(--accent)">pensando…</span>`;
    }
    const kick = me.host && st.phase === "lobby" && !c.isHost ? `<button class="ghost danger" style="padding:2px 8px;font-size:12px" onclick="host('kick',{id:'${c.id}'})">remover</button>` : "";
    return `<div class="team ${c.id===me.capId?"me":""}" data-team="${c.id}">${bs}
      <h3><span class="row" style="gap:8px"><i class="dot ${c.connected?"on":""}"></i>${c.teamName ? `<span class="tnome">${esc(c.teamName)}<small>${esc(c.name)}</small></span>` : esc(c.name)}</span>${kick}</h3>
      <div class="stats"><span><b>${c.coins}</b> moedas</span>${OPEN ? "" : `<span><b>${c.skipsLeft}</b> pulo${c.skipsLeft===1?"":"s"}</span>`}<span><b>${c.team.length}</b>/${cfg.perTeam}</span>${FB && c.team.length ? teamPower(c) : ""}</div>
      <div class="coinbar"><i style="width:${Math.max(0,100*c.coins/cfg.coins)}%"></i></div>
      ${needsOf(c).length && c.team.length < cfg.perTeam ? `<div style="font-size:12.5px;color:var(--accent2);margin:-4px 0 8px">Falta: ${esc(needsOf(c).join(", "))}</div>` : ""}
      ${FB ? pitchHTML(c) : skinNow ? dishHTML(c) : `<ol>${slots}</ol>`}</div>`;
  }).join("") || `<p class="muted">Ninguém entrou ainda.</p>`;
  $("teams").classList.toggle("fb", isFootball()); $("teams").classList.toggle("food", !!skinNow); pitchSeeded = true;
  depoisDeDesenhar(); renderNome(); renderTrocas();

  // pool / unsold / log
  $("poolN").textContent = st.poolCount;
  $("poolChips").innerHTML = st.poolHidden ? `<span class="muted">🙈 Roleta oculta: cada ${esc(t.item)} só aparece quando for sorteado.</span>` : st.pool.map(p => `<span>${esc(p)}${isFootball() ? ` <b class="ovr${Ratings.ratingOf(p).est ? " est" : ""}">${Ratings.ratingOf(p).ovr}</b>` : ""}</span>`).join("");
  $("unsoldWrap").classList.toggle("hidden", !st.unsold.length);
  $("unsoldN").textContent = st.unsold.length;
  $("unsoldChips").innerHTML = st.unsold.map(p => `<span>${esc(p)}</span>`).join("");
  $("log").innerHTML = st.log.map(l => `<div>${esc(l.msg)}</div>`).join("");

  // wheel
  if (st.spin && st.spin.id !== lastSpinId) {
    lastSpinId = st.spin.id;
    // usa o relógio do servidor (clockSkew) e limita a duração: celular com relógio errado não trava a roleta
    const age = Math.max(0, Date.now() + clockSkew - st.spin.at);
    if (age < 3000 && st.phase === "bidding") spinTo(st.spin.names, st.spin.index, Math.min(4000, Math.max(800, 4000 - age)));
    else { const n = st.spin.names.length, seg = 2*Math.PI/n; wheelAngle = -(st.spin.index+.5)*seg; drawWheel(st.spin.names, wheelAngle); }
  } else if (!spinning) {
    const keep = st.spin && ["bidding","reveal"].includes(st.phase);
    drawWheel(keep ? st.spin.names : (st.pool.length ? st.pool : ["—"]), wheelAngle);
  }

  // stage
  const showName = cur && !spinning;
  $("drawnLbl").textContent = st.phase === "lobby" ? "Sala de espera" : st.phase === "done" ? "Leilão encerrado" : cur ? (spinning ? "Girando…" : "Em leilão") : "Próximo sorteio";
  const mt = isFootball() && showName ? Ratings.meiaType(cur.player) : null;
  $("drawnName").textContent = showName ? cur.player + (mt ? (mt === "VOL" ? " · volante" : " · meia-atacante") : "") + (isFootball() ? ` · ${Ratings.ratingOf(cur.player).ovr}` : "") : (st.phase === "done" ? "🏆" : "—");
  $("hub").textContent = showName ? "!" : "?";
  $("btnLobbyEnd").classList.toggle("hidden", st.phase !== "done");

  // lobby message
  const lm = $("lobbyMsg");
  if (st.phase === "lobby") {
    lm.classList.remove("hidden");
    const need = st.captains.length * cfg.perTeam;
    lm.innerHTML = `Mande o código <b style="color:var(--accent)">${st.code}</b> para a galera. ${st.captains.length} participante(s) na sala.` +
      (me.host && st.captains.length ? ` <br><span class="muted">São necessários ${need} ${esc(t.items)} e a roleta tem ${st.poolCount}${st.poolCount < need ? ` — <b style='color:var(--bad)'>faltam ${esc(t.items)}!</b>` : ""}.</span>` : "") +
      (me.host ? "" : "<br><span class='muted'>Aguardando o organizador começar.</span>");
  } else lm.classList.add("hidden");

  $("finalMsg").classList.toggle("hidden", !(cur && cur.finalStretch && st.phase === "bidding" && !spinning));

  // open-mode info (current high + feed)
  const showOpen = OPEN && cur && !spinning && ["bidding","reveal"].includes(st.phase);
  $("openInfo").classList.toggle("hidden", !showOpen || st.phase === "reveal");
  if (showOpen) {
    const hb = $("highBox"), h = cur.high;
    hb.className = "highbox" + (h && h.id === me.capId ? " mine" : "");
    hb.innerHTML = h
      ? `<div><div class="muted" style="font-size:13.5px;font-weight:600">Maior lance</div><div style="font-weight:700;font-size:19px">${esc(capById(h.id).name)}${h.id===me.capId?" (você)":""}</div></div><div class="amt">${h.amount}</div>`
      : `<div><div class="muted" style="font-size:13.5px;font-weight:600">Ninguém deu lance ainda</div><div style="font-weight:700;font-size:19px">Abre com ${cfg.minBid}</div></div><div class="amt">–</div>`;
    $("feed").innerHTML = cur.feed.map(f => `<div><span>${esc(capById(f.id).name)}</span><span>${f.amount}</span></div>`).join("");
  }

  // bid panel
  const need = OPEN && cur ? (cur.high ? cur.high.amount + 1 : cfg.minBid) : cfg.minBid;
  const canBid = mine && st.phase === "bidding" && cur.eligible.includes(me.capId) && !spinning && (OPEN
    ? !cur.passed[me.capId] && !(cur.high && cur.high.id === me.capId) && maxBidFor(mine) >= need
    : !cur.bids[me.capId]);
  $("bidPanel").classList.toggle("hidden", !canBid);
  if (canBid && OPEN) {
    const mx = maxBidFor(mine);
    $("bidLabel").textContent = cur.high ? "Cobrir o lance" : "Abrir o lance";
    $("bidAmt").min = need; $("bidAmt").max = mx;
    if (!$("bidAmt").value || +$("bidAmt").value < need || +$("bidAmt").value > mx) $("bidAmt").value = need;
    $("bidLimits").textContent = `mín. ${need} · máx. ${mx}`;
    $("btnSkip").disabled = false;
    $("btnSkip").textContent = "Sair";
    $("btnBid").textContent = cur.high ? "Cobrir" : "Dar lance";
    const qs = [...new Set([need, need+1, need+2, need+5, mx].filter(v => v >= need && v <= mx))].sort((a,b)=>a-b);
    $("quick").innerHTML = qs.map(v => `<button onclick="document.getElementById('bidAmt').value=${v}">${v===mx?"All-in "+v:(v===need?v+" (mínimo)":v)}</button>`).join("");
  } else if (canBid) {
    $("bidLabel").textContent = "Seu lance (secreto)";
    $("btnBid").textContent = "Dar lance";
    const mx = maxBidFor(mine);
    $("bidAmt").min = cfg.minBid; $("bidAmt").max = mx;
    if (!$("bidAmt").value || +$("bidAmt").value > mx) $("bidAmt").value = cfg.minBid;
    $("bidLimits").textContent = `mín. ${cfg.minBid} · máx. ${mx}`;
    $("btnSkip").disabled = mine.skipsLeft <= 0;
    $("btnSkip").textContent = `Pular (${mine.skipsLeft})`;
    const qs = [...new Set([cfg.minBid, 2, 3, 5, 8, 10, 15, 20, mx].filter(v => v >= cfg.minBid && v <= mx))].sort((a,b)=>a-b);
    $("quick").innerHTML = qs.map(v => `<button onclick="document.getElementById('bidAmt').value=${v}">${v===mx?"All-in "+v:v}</button>`).join("");
  }
  const ms = $("myStatus");
  if (mine && st.phase === "bidding" && !spinning && OPEN) {
    if (!cur.eligible.includes(me.capId)) { ms.className = "status"; ms.textContent = blockReason(mine, cur.player); }
    else if (cur.high && cur.high.id === me.capId) { ms.className = "status good"; ms.textContent = `Você está na frente com ${cur.high.amount}! Se ninguém cobrir até o tempo acabar, ele é seu.`; }
    else if (cur.passed[me.capId]) { ms.className = "status"; ms.textContent = "Você saiu desta disputa."; }
    else if (maxBidFor(mine) < need) { ms.className = "status"; ms.textContent = "Você não tem moedas para cobrir este lance."; }
    else ms.className = "status hidden";
  } else if (mine && st.phase === "bidding" && !spinning) {
    const b = cur.bids[me.capId];
    if (!cur.eligible.includes(me.capId)) { ms.className = "status"; ms.textContent = blockReason(mine, cur.player); }
    else if (b) { ms.className = "status good"; ms.textContent = b.skip ? "Você pulou. Aguardando os outros…" : `Seu lance: ${b.amount}. Aguardando os outros…`; }
    else ms.className = "status hidden";
  } else ms.className = "status hidden";

  // result
  const rb = $("resultBox");
  if (st.phase === "reveal" && cur && cur.result) {
    const r = cur.result, w = r.winner && capById(r.winner);
    rb.classList.remove("hidden");
    rb.innerHTML = (w ? `<div class="muted">${esc(cur.player)} vai para</div><div class="big">${esc(w.name)} · ${r.amount} moeda${r.amount===1?"":"s"}</div>${r.lottery?`<div class="muted" style="font-size:13px">Ninguém deu lance na reta final — decidido no sorteio</div>`:""}${r.tie?`<div class="muted" style="font-size:13px">Empate entre ${r.tiedIds.map(i=>esc(capById(i).name)).join(", ")} — decidido no sorteio</div>`:""}`
      : `<div class="big">Ninguém deu lance</div><div class="muted">${esc(cur.player)} ficou sem dono.</div>`) +
      (OPEN ? (cur.feed.length ? `<div class="muted" style="font-size:13px;margin-top:8px">${cur.feed.length} lance${cur.feed.length===1?"":"s"}: ${cur.feed.map(f=>`${esc(capById(f.id).name)} ${f.amount}`).join(" → ")}</div>` : "") :
      `<div class="bidlist">${cur.eligible.map(id => { const b = cur.bids[id], c = capById(id);
        return `<div class="${id===r.winner?"win":""}">${esc(c.name)}<b>${b.skip?"pulou":b.amount}</b>${b.auto?`<span class="muted" style="font-size:11px">automático</span>`:""}</div>`; }).join("")}</div>`);
  } else rb.classList.add("hidden");

  // host bar
  $("hostBar").classList.toggle("hidden", !me.host);
  $("resetBox").classList.toggle("hidden", !me.host || st.phase === "lobby");
  if (me.host) {
    $("hStart").classList.toggle("hidden", st.phase !== "lobby");
    $("hSpin").classList.toggle("hidden", !["idle","reveal"].includes(st.phase));
    $("hSpin").textContent = st.phase === "reveal" ? `Próximo ${t.item}` : "Girar roleta";
    $("hReveal").classList.toggle("hidden", st.phase !== "bidding");
    $("hReveal").textContent = OPEN ? "Bater o martelo" : "Revelar agora";
    $("hUndo").classList.toggle("hidden", !["idle","reveal"].includes(st.phase));
    $("hUnsold").classList.toggle("hidden", !st.unsold.length || st.phase === "bidding");
    $("hFinish").classList.toggle("hidden", st.phase === "lobby" || st.phase === "done");
  }

  // export
  const showExport = me.host && (st.phase === "done" || st.captains.some(c => c.team.length));
  $("exportCard").classList.toggle("hidden", !showExport);
  $("promptText").textContent = buildPrompt();
  $("exportText").textContent = st.captains.map(c => [c.teamName || `${t.prefix} ${c.name}`, ...c.team.map(x => x.player.replace(/\s*\([^)]*\)\s*$/, ""))].join("\n")).join("\n\n");

  renderFc();
  renderJudge();
  renderFormation();
  renderReveal();

  // timer
  tickTimer();
}

let timerH = null;
function tickTimer(){
  clearInterval(timerH);
  const el = $("timer");
  const d = S && S.phase === "bidding" && S.current && S.current.deadline;
  if (!d) { el.textContent = ""; el.classList.remove("hot"); return; }
  const upd = () => { const s = Math.max(0, Math.ceil((d - (Date.now() + clockSkew))/1000)); el.textContent = spinning ? "" : `⏱ ${s}s`; el.classList.toggle("hot", !spinning && s <= 5); };
  upd(); timerH = setInterval(upd, 250);
}


function promptOpts(){ return { sport:$("pSport").value, format:$("pFormat").value, era:$("pEra").value }; }
function buildPrompt(){ return Prompts.buildPrompt(S, promptOpts()); }
