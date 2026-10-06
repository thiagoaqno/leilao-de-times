// Leilão da Galera — os botões da sala, o resultado revelado, o campinho e a troca de posições (os arquivos rodam em
// ordem, pelo index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- ROOM ----------
$("btnCopyLink").onclick = () => { const url = location.origin + location.pathname + "?sala=" + me.code; navigator.clipboard?.writeText(url).then(()=>toast("Link copiado!"), ()=>prompt("Copie o link:", url)); };
const host = (action, extra={}) => socket.emit("host", { action, ...extra }, (r) => { if (r && !r.ok) toast(r.error); });
$("hStart").onclick = () => host("start");
$("hSpin").onclick = () => host("spin");
$("hReveal").onclick = () => { const open = S && S.config.mode === "open";
  if (confirm(open ? "Bater o martelo agora? Quem está na frente leva." : "Revelar agora? Quem não deu lance usa o pulo (se tiver) ou dá o lance mínimo.")) host("reveal"); };
$("hUndo").onclick = () => { if (confirm("Desfazer a última compra? O item volta para a roleta e as moedas são devolvidas.")) host("undo"); };
$("hUnsold").onclick = () => host("returnUnsold");
$("hReset").onclick = () => {
  if (!confirm("Reiniciar o leilão? Todo mundo volta com as moedas cheias e sem nenhum item.")) return;
  const typed = prompt('Para confirmar, digite REINICIAR');
  if ((typed || "").trim().toUpperCase() !== "REINICIAR") return toast("Reinício cancelado.");
  host("reset");
};
$("hFinish").onclick = () => { if (confirm("Encerrar o leilão agora?")) host("finish"); };
$("btnBid").onclick = () => sendBid({ amount: $("bidAmt").value });
$("bidAmt").addEventListener("keydown", e => { if (e.key === "Enter") $("btnBid").click(); });
$("btnSkip").onclick = () => {
  const open = S && S.config.mode === "open";
  if (confirm(open ? "Sair desta disputa? Você não poderá voltar a dar lance neste item." : "Usar um pulo neste item?")) sendBid({ skip:true });
};
function sendBid(d){
  const open = S && S.config.mode === "open";
  socket.emit("bid", d, (r) => { if (!r.ok) toast(r.error); else toast(d.skip ? (open ? "Você saiu da disputa." : "Você pulou.") : "Lance enviado!"); });
}
$("btnCopyExport").onclick = () => navigator.clipboard?.writeText($("exportText").textContent).then(()=>toast("Resultado copiado!"), ()=>toast("Selecione e copie manualmente."));

let clockSkew = 0;
$("btnRules").onclick = () => $("rulesDlg").showModal();
$("btnCloseRules").onclick = () => $("rulesDlg").close();
$("rulesDlg").addEventListener("click", e => { if (e.target === $("rulesDlg")) $("rulesDlg").close(); });
["pSport","pFormat","pEra"].forEach(id => $(id).addEventListener("change", () => { store.set("lt_prompt", { sport:$("pSport").value, format:$("pFormat").value, era:$("pEra").value }); if (S) $("promptText").textContent = buildPrompt(); }));
(() => { const sp = store.get("lt_prompt"); if (sp) { $("pSport").value = sp.sport || "futsal"; $("pFormat").value = sp.format || "auto"; $("pEra").value = sp.era || "peak"; } })();
$("btnCopyPrompt").onclick = () => { const t = buildPrompt(); $("promptText").textContent = t; navigator.clipboard?.writeText(t).then(()=>toast("Prompt copiado!"), ()=>toast("Abra 'Ver prompt' e copie manualmente.")); };

let promptRoom = null;
$("btnPublish").onclick = () => {
  const text = $("pubText").value.trim();
  if (text.length < 20) return toast("Cole a resposta da IA primeiro.");
  if (S.reveal && S.reveal.total && !confirm("Substituir o resultado já publicado?")) return;
  socket.emit("host", { action: "publish", text }, (r) => {
    if (r && !r.ok) return toast(r.error);
    $("pubText").value = ""; toast("Publicado! Agora revele parte por parte.");
    $("revCard").scrollIntoView({ behavior: "smooth", block: "start" });
  });
};
let lastShown = -1, lastRevTotal = -1;
async function downloadCard(){
  const sum = S && S.reveal && S.reveal.summary; if (!sum) return;
  try { const r = await ChampionCard.download(sum); if (r === "downloaded") toast("Card baixado!"); }
  catch (e) { console.error(e); toast("Não consegui gerar o card."); }
}
function renderReveal(){
  const r = S.reveal || { total: 0, shown: 0, sections: [] }, card = $("revCard"), t = T();
  card.classList.toggle("hidden", !r.total);
  $("pubBox").classList.toggle("hidden", !me.host);
  if (!r.total) { lastShown = -1; lastRevTotal = -1; return; }
  const julga = t.prompt === "food" || t.prompt === "generic";
  $("revTitle").innerHTML = ic(julga ? "urna" : "taca") + (julga ? "Julgamento" : "Campeonato");
  $("revCount").innerHTML = r.shown >= r.total ? `${ic("ok")} Tudo revelado (${r.total} partes)` : `${r.shown} de ${r.total} partes`;
  $("revCount").style.color = r.shown >= r.total ? "var(--green)" : "var(--acc)";
  // redesenha só se mudou (para a animação aparecer só na parte nova)
  if (r.shown !== lastShown || r.total !== lastRevTotal) {
    const out = $("revOut");
    if (r.total !== lastRevTotal || r.shown < out.children.length) out.innerHTML = "";
    for (let i = out.children.length; i < r.shown; i++) {
      const d = document.createElement("div"); d.className = "revsec"; out.appendChild(d);
      const live = r.lives && r.lives[i];
      if (live) { d.classList.add("comVivo"); montarAoVivo(d, live, r.quando[i], mdToHtml(r.sections[i])); } // jogo ao vivo (aovivo.js)
      else d.innerHTML = mdToHtml(r.sections[i]);
    }
    if (r.shown > lastShown && lastShown >= 0 && out.lastElementChild) out.lastElementChild.scrollIntoView({ behavior: "smooth", block: "start" });
    lastShown = r.shown; lastRevTotal = r.total;
  }
  const left = r.total - r.shown, rolando = vivoAte > agoraServidor(); // jogo ao vivo na tela: a próxima parte espera
  renderPalpites();
  const cardBtn = r.summary ? `<div class="revbar" style="border-top:0;margin-top:6px;padding-top:0"><button class="primary" onclick="downloadCard()">${ic("imagem")}Baixar card do campeão</button></div>` : "";
  $("revFoot").innerHTML = me.host
    ? `<div class="revbar">
        <button class="primary" ${left && !rolando ? "" : "disabled"} onclick="host('revealNext')">${rolando ? `${ic("relogio")}Jogo rolando…` : `${ic("play")}Revelar próxima${left ? ` (faltam ${left})` : ""}`}</button>
        <button ${left ? "" : "disabled"} onclick="if(confirm('Revelar tudo de uma vez?')) host('revealAll')">Revelar tudo</button>
        <button ${r.shown ? "" : "disabled"} onclick="host('revealPrev')">${ic("desfazer")}Esconder última</button>
        <button class="danger" onclick="if(confirm('Apagar o resultado publicado?')) host('revealClear')">Apagar</button>
      </div>` + cardBtn
    : (left ? `<div class="revwait">${ic("relogio")}<span>${r.shown ? "" : "O resultado está pronto! "}Aguardando o organizador revelar a próxima parte… <b>faltam ${left}</b></span></div>` : cardBtn);
}

$("btnFc").onclick = () => {
  if (!S) return;
  const pending = S.reveal && S.reveal.total && S.reveal.shown < S.reveal.total;
  if (!confirm(pending ? "Ainda tem resultado sendo revelado. Simular um campeonato novo mesmo assim?" : S.reveal && S.reveal.total ? "Simular de novo? O resultado atual será substituído." : "Simular o campeonato agora? O resultado fica escondido e você revela parte por parte.")) return;
  socket.emit("host", { action: "simFootball", sport: $("fcSport").value, format: $("fcFormat").value, force: true }, (r) => {
    if (r && !r.ok) return toast(r.error);
    toast("Campeonato simulado! Revele parte por parte.");
    setTimeout(() => $("revCard").scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  });
};
// o texto (markdown) do resultado, já limpo, com os emojis da narração trocados pelos ícones da página
function mdToHtml(text){
  try { if (window.marked && window.DOMPurify) return Icones.iconizar(DOMPurify.sanitize(marked.parse(text, { gfm: true, breaks: false }))); } catch {}
  return `<pre style="white-space:pre-wrap;font:inherit">${Icones.iconizar(esc(text))}</pre>`;
}
const FORMS = {
  futsal: [["auto","Automática (a melhor para o seu time)"],["2-2","2-2 (2 defensores, 2 atacantes)"],["3-1","3-1 (3 defensores, 1 pivô)"],["1-2-1","1-2-1 losango (1 defensor, 2 meias, 1 atacante)"],["1-1-2","1-1-2 (1 defensor, 1 meia, 2 atacantes)"]],
  futebol: [["auto","Automática (a melhor para o seu time)"],["4-3-3","4-3-3"],["4-4-2","4-4-2"],["3-5-2","3-5-2"],["4-2-3-1","4-2-3-1"],["3-4-3","3-4-3"],["5-3-2","5-3-2"]],
};
function formKind(){ return T().prompt === "futebol" ? "futebol" : "futsal"; }
let formKindShown = null;
function renderFormation(){
  const mine = me.capId && capById(me.capId);
  const show = !!mine && isFootball() && verTime === mine.id;
  $("formBox").classList.toggle("hidden", !show);
  if (!show) return;
  const kind = formKind(), sel = $("myFormation");
  if (formKindShown !== kind) { sel.innerHTML = FORMS[kind].map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join(""); formKindShown = kind; }
  if (document.activeElement !== sel) sel.value = FORMS[kind].some(([v]) => v === mine.formation) ? mine.formation : "auto";
  const locked = S.config.formLock === "locked", frozen = locked && S.phase !== "lobby";
  sel.disabled = frozen;
  $("formHint").textContent = (frozen ? "Formação travada: o leilão já começou. "
    : locked ? "Atenção: a formação trava quando o leilão começar. Escolha agora! "
    : "") + "Toque num jogador do campinho para mudar a posição dele.";
}
$("myFormation").addEventListener("change", () => socket.emit("formation", { formation: $("myFormation").value }, (r) => { if (r && !r.ok) toast(r.error); else toast("Formação salva!"); }));
function isFootball(){ const k = T().prompt; return k === "futsal" || k === "futebol"; }
function subTag(item){ const t = Ratings.meiaType(item); return t ? ` <span class="sub">${t === "VOL" ? "volante" : "meia-atacante"}</span>` : ""; }
// ---------- CAMPINHO ----------
// A escalação vem de escalacao.js, a mesma que o simulador usa.
// o campinho fica deitado: o gol do time à esquerda e o ataque para a direita
const FIELD_SVG = {
  futebol: `<svg viewBox="0 0 100 66" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="66" fill="#0e4529"/>${Array.from({length:10},(_,i)=>i%2?`<rect x="${i*10}" width="10" height="66" fill="#11502f"/>`:"").join("")}
    <g fill="none" stroke="#ffffff80" stroke-width=".45"><rect x="2" y="2" width="96" height="62"/><path d="M50 2V64"/><circle cx="50" cy="33" r="8.4"/>
    <rect x="2" y="12.85" width="15" height="40.3"/><rect x="2" y="23.85" width="5" height="18.3"/><path d="M17 27.4A8.4 8.4 0 0 1 17 38.6"/>
    <rect x="83" y="12.85" width="15" height="40.3"/><rect x="93" y="23.85" width="5" height="18.3"/><path d="M83 27.4A8.4 8.4 0 0 0 83 38.6"/></g>
    <g fill="#ffffff80"><circle cx="50" cy="33" r=".8"/><circle cx="12" cy="33" r=".6"/><circle cx="88" cy="33" r=".6"/></g></svg>`,
  futsal: `<svg viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="62" fill="#0b3a40"/><rect x="2" y="2" width="96" height="58" fill="#115b64"/>
    <g fill="none" stroke="#ffffff8c" stroke-width=".5"><rect x="2" y="2" width="96" height="58"/><path d="M50 2V60"/><circle cx="50" cy="31" r="7"/>
    <path d="M2 9A18 18 0 0 1 20 27L20 35A18 18 0 0 1 2 53"/><path d="M98 9A18 18 0 0 0 80 27L80 35A18 18 0 0 0 98 53"/></g>
    <g fill="#ffffff8c"><circle cx="50" cy="31" r=".8"/><circle cx="14" cy="31" r=".6"/><circle cx="86" cy="31" r=".6"/><circle cx="24" cy="31" r=".5"/><circle cx="76" cy="31" r=".5"/></g></svg>`,
};
// a vaga em pé (escalacao.js: x de lado a lado, y do ataque ao gol) vira a posição no campinho deitado
const deitado = (sp) => ({ left: 100 - sp.y, top: sp.x });
const POS_ABBR = { GK: "GOL", DEF: "DEF", MID: "MEI", ATT: "ATA" };
const SLOT_EM = { GK: "no gol", DEF: "na defesa", MID: "no meio", ATT: "no ataque" };
const CHEM_TXT = { alta: "química alta", media: "química média", baixa: "química baixa" };
const CHEM_CLS = (c) => (c >= 65 ? "alta" : c >= 35 ? "media" : "baixa");
const COMMON_NAME = /^(carlos|silva|santos|junior|júnior|jr\.?|alves|costa|souza|pereira|lima|gomes|martins|fernandes|fernández|martínez|díaz|diaz|garcía|rodríguez)$/i;
const shortName = (n) => { const p = String(n).split(" "); if (p.length === 1) return n; const last = p.slice(-1)[0]; return last.length <= 4 || COMMON_NAME.test(last) ? p[0][0] + ". " + last : last; };
const lineupCache = new Map();
function lineupOf(c, extra){
  const kind = formKind(), items = c.team.map(x => x.player).concat(extra ? [extra] : []);
  const key = kind + "|" + (c.formation || "auto") + "|" + JSON.stringify(c.pins || {}) + "|" + items.join("\n"), id = c.id + (extra ? "+" : "");
  let e = lineupCache.get(id);
  if (!e || e.key !== key) { e = { key, v: Escalacao.escalar(items, kind, c.formation, c.pins) }; lineupCache.set(id, e); }
  return e.v;
}
// jogador em leilão que eu posso pegar: aparece como sombra no meu campinho, na vaga em que entraria
function previewFor(c){
  const cur = S.current;
  return c.id === me.capId && S.phase === "bidding" && cur && !spinning && cur.eligible.includes(c.id) ? cur.player : null;
}

// ---------- MUDAR POSIÇÕES ----------
// Toque num jogador (ou vaga) do seu campinho e depois em outro: os dois trocam de lugar e ficam fixados ali.
let pinPick = null;   // { name, pos } escolhido no primeiro toque
let myShown = null;   // a escalação que está na tela no meu campinho (para saber quem está onde)
const posKey = (p) => p.g === "BENCH" ? "BENCH" : p.g + p.k;
function targetOf(el){
  if (el.dataset.tobench != null) return { name: null, pos: { g: "BENCH" } };
  if (el.dataset.bench != null) return { name: el.dataset.bench, pos: { g: "BENCH" } };
  const pos = { g: el.dataset.g, k: +el.dataset.k };
  const x = myShown.E.xi.find(x => x.slot === pos.g && x.k === pos.k);
  return { name: x && x.p && x.p.name !== myShown.ghost ? x.p.name : null, pos };
}
function whereIs(name){
  const x = myShown.E.xi.find(x => x.p && x.p.name === name);
  return x ? { g: x.slot, k: x.k } : { g: "BENCH" };
}
function sendPins(pins, msg){ socket.emit("pins", { pins }, (r) => { if (r && !r.ok) toast(r.error); else if (msg) toast(msg); }); }
function pitchTap(el){
  const mine = capById(me.capId); if (!mine || !myShown) return;
  if (el.dataset.cancel != null) { pinPick = null; return render(); }
  if (el.dataset.auto != null) { pinPick = null; return sendPins({}, "Escalação automática de volta."); }
  const t = targetOf(el);
  if (!pinPick) { if (!t.name && t.pos.g === "BENCH") return; pinPick = t; return render(); }
  const a = { ...pinPick, pos: pinPick.name ? whereIs(pinPick.name) : pinPick.pos };
  pinPick = null;
  if (posKey(a.pos) === posKey(t.pos) && a.name === t.name) return render();
  if (!a.name && !t.name) { pinPick = t; return render(); }
  const pins = { ...(mine.pins || {}) };
  if (a.name) pins[a.name] = t.pos;
  if (t.name) pins[t.name] = a.pos;
  falasDaTroca(mine, [a.name, t.name], pins); // quem mudou de lugar fala (elenco.js)
  render(); sendPins(pins);
}
$("teams").addEventListener("click", (e) => { const el = e.target.closest("[data-tap]"); if (el) pitchTap(el); });

// quando um jogador chega no campinho, ele "cai" na vaga; o atraso negativo mantém a animação contínua entre re-renderizações
const arrivedAt = new Map(); let pitchSeeded = false;
function pitchHTML(c){
  const kind = formKind(), extra = previewFor(c), base = lineupOf(c), E = extra ? lineupOf(c, extra) : base, now = performance.now();
  const ghostName = extra ? Ratings.parseItem(extra).name : null, mineCard = c.id === me.capId;
  if (mineCard) myShown = { E, ghost: ghostName };
  const pickKey = mineCard && pinPick ? (pinPick.name ? "n:" + pinPick.name : "s:" + posKey(pinPick.pos)) : null;
  const spots = E.spots.map((sp, i) => ({ ...sp, s: E.xi[i] }));
  // linhas de química entre os vizinhos (verde alta, amarela média, vermelha baixa)
  const chemLines = `<svg class="chem" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${E.links.map(l => {
    const a = deitado(E.spots[l.a]), b = deitado(E.spots[l.b]);
    return `<line class="${l.nivel}${l.semDados ? " nd" : ""}" x1="${a.left}" y1="${a.top}" x2="${b.left}" y2="${b.top}"/>`;
  }).join("")}</svg>`;
  const chemTip = (s) => {
    const mine = E.links.filter(l => E.xi[l.a] === s || E.xi[l.b] === s);
    if (!mine.length) return "";
    const why = mine.map(l => { const o = E.xi[l.a] === s ? E.xi[l.b] : E.xi[l.a]; return `${shortName(o.p.name)}: ${CHEM_TXT[l.nivel]}${l.semDados ? " (sem dados)" : l.clubes.length ? ` (${l.clubes[0]})` : l.pais ? " (mesmo país)" : ""}`; });
    const info = Quimica.infoOf(s.p.name);
    return `. ${info ? info.pais + ". " : ""}Química ${Math.round(s.chem * 100)} → ${why.join("; ")}`;
  };
  const doTime = (name) => c.team.find(x => Ratings.parseItem(x.player).name === name);
  const price = (name) => { const t = doTime(name); return t ? t.price : null; };
  // no meu campinho as vagas viram botões
  const tag = (cls, style, tip, body, s, attr = "") => mineCard
    ? `<button type="button" class="${cls} tap" style="${style}" title="${escA(tip)}" data-tap data-g="${s.slot}" data-k="${s.k}"${attr}>${body}</button>`
    : `<div class="${cls}" style="${style}" title="${escA(tip)}"${attr}>${body}</div>`;
  const marks = spots.map((sp) => {
    const { s } = sp, { left, top } = deitado(sp);
    const lado = top < 34 ? "baixo" : "", canto = left < 25 ? " esq" : left > 75 ? " dir" : ""; // o balão não sai do campinho
    const at = `left:${left.toFixed(1)}%;top:${top.toFixed(1)}%`;
    if (!s.p) return tag(`pl empty${pickKey === "s:" + s.slot + s.k ? " sel" : ""}`, at, `Vaga ${SLOT_EM[s.slot]}`, `<i>${POS_ABBR[s.slot]}</i>`, s);
    const off = Escalacao.HOME_SLOT(s.p.pos) !== s.slot, eff = Math.round(s.eff);
    const nv = " t-" + nivelDe(s.p.ovr);
    if (s.p.name === ghostName) return tag(`pl ghost${off ? " off" : ""}`, at, `Se você levar ${s.p.name}, ele entra aqui${off ? ` fora de posição, rendendo ${eff}` : ""}`, `<i>${off ? eff : s.p.ovr}</i><span>${esc(shortName(s.p.name))}</span>`, s);
    const pr = price(s.p.name), key = c.id + "|" + s.p.name;
    viuItem(c, doTime(s.p.name).player, key); const ch = chegada(key); // chegou agora: voa até a vaga (elenco.js)
    const tip = `${s.p.name}: nota ${s.p.ovr}${s.p.est ? " (estimada)" : ""}${off ? `, fora de posição ${SLOT_EM[s.slot]}, rende ${eff}` : ""}${pr != null ? `. Custou ${pr}` : ""}${s.pinned ? ". Posição fixada" : ""}${chemTip(s)}`;
    const cls = `pl${nv}${off ? " off" : ""}${ch.cls}${s.pinned ? " pinned" : ""}${pickKey === "n:" + s.p.name ? " sel" : ""}`;
    return tag(cls, at + ch.style, tip, `<i>${off ? eff : s.p.ovr}</i><span>${esc(shortName(s.p.name))}</span>${balao(key, lado + canto)}`, s, ` data-item="${escA(s.p.name)}"`);
  }).join("");
  const benchList = E.bench.filter(p => p.name !== ghostName);
  let bench = "";
  if (mineCard) {
    const chips = benchList.map(p => `<button type="button" class="chip${pickKey === "n:" + p.name ? " sel" : ""}" data-tap data-bench="${escA(p.name)}" title="${escA(p.name)}: nota ${p.ovr}">${esc(shortName(p.name))} <b>${p.ovr}</b></button>`).join("");
    const toBench = pinPick && pinPick.name && whereIs(pinPick.name).g !== "BENCH" ? `<button type="button" class="chip drop" data-tap data-tobench>Mandar para a reserva</button>` : "";
    if (chips || toBench) bench = `<div class="bench">Reserva: ${chips}${toBench}</div>`;
    const hasPins = Object.keys(c.pins || {}).length > 0;
    bench += `<div class="pinbar">${pinPick
      ? `<span>Agora toque na vaga ou no jogador para onde ${pinPick.name ? `<b>${esc(shortName(pinPick.name))}</b> vai` : "quer mandar alguém"}.</span><button type="button" class="ghost" data-tap data-cancel>Cancelar</button>`
      : c.team.length ? `<span>Toque num jogador para mudar a posição dele.</span>${hasPins ? `<button type="button" class="ghost" data-tap data-auto>Voltar ao automático</button>` : ""}` : ""}</div>`;
  } else if (benchList.length) bench = `<div class="bench">Reserva: ${benchList.map(p => `${esc(shortName(p.name))} <b>${p.ovr}</b>`).join(", ")}</div>`;
  let note = "";
  if (extra) {
    const spot = E.xi.find(x => x.p && x.p.name === ghostName);
    const wasBench = new Set(base.bench.map(p => p.name)), out = benchList.filter(p => !wasBench.has(p.name)).map(p => esc(p.name));
    const delta = (a, b) => Math.round(a) === Math.round(b) ? `${Math.round(a)}` : `${Math.round(a)} → ${Math.round(b)}`;
    note = `<div class="ghostnote">Se você levar <b>${esc(ghostName)}</b>: ` + (!spot ? "ele ficaria na reserva." :
      `entra ${SLOT_EM[spot.slot]}` + (Escalacao.HOME_SLOT(spot.p.pos) !== spot.slot ? `, fora de posição, rendendo <b>${Math.round(spot.eff)}</b>` : `, rendendo <b>${spot.p.ovr}</b>`) +
      (out.length ? `. ${out.join(" e ")} ${out.length > 1 ? "iriam" : "iria"} para a reserva` : "") +
      (E.formation !== base.formation ? `. O time passaria para o ${E.formation}` : "") + `. Ataque ${delta(base.att, E.att)}, defesa ${delta(base.def, E.def)}.`) + `</div>`;
  }
  return `${note}<div class="pitch ${kind}${mineCard && pinPick ? " picking" : ""}">${FIELD_SVG[kind]}${chemLines}<span class="ftag">${E.formation}${E.auto ? " · auto" : ""}</span>${marks}</div>${bench}`;
}
