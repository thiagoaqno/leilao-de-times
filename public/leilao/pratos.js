// Leilão da Galera — o prato montado, a batalha dos pratos, a chegada do estado e as contas das regras (os arquivos rodam
// em ordem, pelo index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
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
// ---------- BATALHA DOS PRATOS (júri do site + voto da galera) ----------
const JUDGE_SKINS = ["hamburguer", "pizza", "drink", "sobremesa"];
const withDish = () => S.captains.filter(c => c.team.length);
function votedLine(){
  const j = S.judge, voters = withDish();
  const done = voters.filter(c => (j.voted[c.id] || 0) >= voters.length - 1).length;
  return { done, total: voters.length, text: voters.map(c => `${esc(c.name)} ${(j.voted[c.id] || 0) >= voters.length - 1 ? "(pronto)" : (j.voted[c.id] ? `(${j.voted[c.id]}/${voters.length - 1})` : "…")}`).join(" · ") };
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
    $("judgeTitle").innerHTML = `${ic(Icones.deTema(T()))}Batalha de ${esc(T().teams)}`;
  }
  // participantes: votar nos pratos dos outros
  const card = $("voteCard"), mine = me.capId && capById(me.capId);
  const show = food && j && j.status === "voting";
  card.classList.toggle("hidden", !show);
  if (!show) return;
  const others = withDish().filter(c => c.id !== me.capId), v = votedLine();
  const canVote = mine && mine.team.length;
  const head = `<div class="simhead"><h2>${ic("urna")}Vote nos ${esc(T().teams)}</h2><span class="pill">${v.done} de ${v.total} já votaram</span></div>`;
  if (!canVote) { card.innerHTML = head + `<p class="muted">A galera está votando. Quem votou: ${v.text}</p>`; return; }
  const left = others.filter(c => j.mine[c.id] == null).length;
  card.innerHTML = head + `<p class="muted" style="margin:0 0 14px">Dê uma nota de 1 a 10 para cada ${esc(T().team)}. Seu voto fica em segredo até a revelação, e dá para mudar até o organizador encerrar.${left ? ` Falta${left > 1 ? "m" : ""} <b style="color:var(--acc)">${left}</b>.` : " <b style='color:var(--green)'>Você já votou em todos!</b>"}</p>
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

function promptOpts(){ return { sport:$("pSport").value, format:$("pFormat").value, era:$("pEra").value }; }
function buildPrompt(){ return Prompts.buildPrompt(S, promptOpts()); }
