// Leilão da Galera — tela inicial e temas (a primeira parte do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
const { $, store } = Comum;
const socket = io();
let S = null;            // last state
let me = { capId: null, host: false, code: null };
let lastSpinId = null, spinning = false;
const { ic } = Icones;
const FOOD_SKINS = ["hamburguer", "pizza", "drink", "sobremesa"];
let skinNow = null; // tema de comida em uso (sala ou tema escolhido na tela inicial)
function setSkin(s){ skinNow = FOOD_SKINS.includes(s) ? s : null; document.body.classList.toggle("skin-cozinha", !!skinNow); }
const skinOfTheme = (th) => th.skin || (FOOD_SKINS.includes(th.id) ? th.id : null);

const toast = Comum.criarToast(2600);
function esc(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }
const escA = (s) => esc(s).replace(/"/g, "&quot;");

// os botões − e + ao lado dos números (participantes, moedas, o lance): respeitam o mínimo e o máximo do campo
document.addEventListener("click", (e) => {
  const b = e.target.closest(".stepper [data-step]"); if (!b) return;
  const inp = b.parentElement.querySelector("input"), passo = +b.dataset.step;
  const min = inp.min !== "" ? +inp.min : -Infinity, max = inp.max !== "" ? +inp.max : Infinity;
  inp.value = Math.max(min, Math.min(max, (+inp.value || 0) + passo));
  inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  b.animate([{ transform: "scale(.8)" }, { transform: "none" }], { duration: 200 });
});

// ---------- HOME ----------
const params = new URLSearchParams(location.search);
if (params.get("sala")) $("jCode").value = params.get("sala").toUpperCase();
$("cPlayers").addEventListener("input", countPlayers);
function countPlayers(){ const n=[...new Set($("cPlayers").value.split(/\n/).map(s=>s.trim()).filter(Boolean))].length; const t=formTerms(); $("cCount").textContent = n + " " + (n===1?t.item:t.items); }
$("cPlays").addEventListener("change", () => $("cNameWrap").classList.toggle("hidden", !$("cPlays").checked));
let mode = "secret";
function setMode(m){
  mode = m;
  document.querySelectorAll(".mode").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  $("cSkipsWrap").classList.toggle("hidden", m === "open");
  if (m === "open") {
    $("cTimerLbl").textContent = "Tempo por lance (s)";
    if (+$("cTimer").value < 5) $("cTimer").value = 15;
    $("cTimerHint").textContent = "Cada lance novo reinicia o cronômetro. Quando ele zera (ou todos saem da disputa), quem está na frente leva. Mínimo 5 s.";
  } else {
    $("cTimerLbl").textContent = "Tempo (s)";
    $("cTimerHint").textContent = "Tempo 0 = sem limite. Quando acaba o tempo, quem não deu lance usa o pulo (se tiver) ou dá o lance mínimo.";
  }
}
document.querySelectorAll(".mode").forEach(b => b.onclick = () => setMode(b.dataset.mode));
// ---------- THEMES ----------
const cap = (w) => w ? w[0].toUpperCase() + w.slice(1) : w;
let themeId = "futsal-lendas", listDirty = false, extraTouched = false;
function myThemes(){ return store.get("lt_mythemes") || []; }
function allThemes(){ return [...PRESETS, ...myThemes()]; }
function curTheme(){ return allThemes().find(t => t.id === themeId) || PRESETS[0]; }
function formTerms(){
  return { item:$("tItem").value.trim()||"item", items:$("tItems").value.trim()||"itens", team:$("tTeam").value.trim()||"time",
           teams:$("tTeams").value.trim()||"times", prefix:$("tPrefix").value.trim()||"Time" };
}
function applyFormTerms(){
  const t = formTerms();
  $("cPerLbl").textContent = `${cap(t.items)} por ${t.team}`;
  $("cListLbl").textContent = `${cap(t.items)} (um por linha)`;
  countPlayers();
}
["tItem","tItems","tTeam","tTeams","tPrefix"].forEach(id => $(id).addEventListener("input", applyFormTerms));
function slotsOf(th){ return th.mine ? null : (th.slots || null); }
function itemsOf(th){ return th.items || (th.pool && FOOTBALL[th.pool]) || null; }
// os temas de futebol em destaque (cartões com o gramado); os outros (CS, comida, os seus) numa fileira menor
const FUT_ROTULO = { "futsal-lendas": ["Futsal", "Lendas"], "futsal-atuais": ["Futsal", "Atuais"], "futebol-lendas": ["Futebol 11", "Lendas"], "futebol-atuais": ["Futebol 11", "Atuais"] };
function renderThemes(){
  const todos = allThemes(), fut = todos.filter(t => FUT_ROTULO[t.id]), outros = todos.filter(t => !FUT_ROTULO[t.id]);
  $("themes").innerHTML = `<div class="temas-fut">${fut.map(t => `<button type="button" class="tema ${t.id===themeId?"on":""}" data-id="${escA(t.id)}">${ic(Icones.deTema(t))}<b>${esc(FUT_ROTULO[t.id][0])}</b><small>${esc(FUT_ROTULO[t.id][1])}</small></button>`).join("")}</div>`
    + `<div class="temas-outros">${outros.map(t => `<button type="button" class="tema-mini ${t.id===themeId?"on":""}" data-id="${escA(t.id)}">${ic(Icones.deTema(t))}${esc(t.label)}</button>`).join("")}</div>`;
  $("themes").querySelectorAll("[data-id]").forEach(b => b.onclick = () => selectTheme(b.dataset.id, true));
}
function selectTheme(id, user){
  if (user && listDirty && id !== themeId && $("cPlayers").value.trim() && !confirm("Trocar de tema substitui a lista que você editou. Continuar?")) return;
  themeId = id;
  const th = curTheme();
  $("tItem").value = th.terms.item; $("tItems").value = th.terms.items; $("tTeam").value = th.terms.team; $("tTeams").value = th.terms.teams; $("tPrefix").value = th.terms.prefix;
  $("btnDelTheme").classList.toggle("hidden", !th.mine);
  if (!me.code) setSkin(skinOfTheme(th));
  renderThemes();
  if (th.mine) { $("cPer").value = th.perTeam; $("cPlayers").value = th.list || ""; listDirty = false; }
  else if (slotsOf(th)) { $("cPer").value = Object.values(th.slots).reduce((a,b)=>a+b,0); if (user || !$("cPlayers").value.trim()) generate(); }
  else if (user) { $("cPlayers").value = ""; listDirty = false; }
  updateComp(); applyFormTerms();
}
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function counts(th){
  const slots = slotsOf(th); if (!slots) return null;
  const n = Math.max(1, +$("cParts").value || 1), extra = Math.max(0, +$("cExtra").value || 0);
  const c = {}; Object.entries(slots).forEach(([k,v]) => c[k] = v*n);
  // spread extras by weight: categories with more slots get more extras
  const order = []; const maxW = Math.max(...Object.values(slots));
  for (let r=0;r<maxW;r++) Object.entries(slots).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => { if (v>r) order.push(k); });
  for (let i=0;i<extra;i++) c[order[i % order.length]]++;
  return c;
}
const fmtCats = (o) => Object.entries(o || {}).map(([k,v]) => `${v} ${k}`).join(", ");
function updateCompRule(){
  const th = curTheme(), t = formTerms(), wrap = $("compWrap");
  const has = !!(th.slots && th.req);
  wrap.classList.toggle("hidden", !has);
  if (!has) return;
  $("cCompLbl").textContent = `Composição de cada ${t.team}`;
  const m = $("cCompMode").value;
  if (m === "exact") $("cPer").value = Object.values(th.slots).reduce((a,b)=>a+b,0);
  $("cCompHint").innerHTML = m === "min" ? `Todo mundo precisa ter pelo menos: <b>${esc(fmtCats(th.req))}</b>. O site guarda a vaga: quando só sobra espaço para o obrigatório, só dá para dar lance nele.`
    : m === "exact" ? `Cada ${esc(t.team)} fica exatamente com: <b>${esc(fmtCats(th.slots))}</b>. Quem já tem o suficiente de uma categoria não pode dar lance em outro dela.`
    : "Cada um monta como quiser, sem obrigação de categoria.";
}
$("cCompMode").addEventListener("change", updateCompRule);
function updateComp(){
  updateCompRule();
  $("lockWrap").classList.toggle("hidden", !["futsal","futebol"].includes(curTheme().prompt));
  const th = curTheme(), slots = slotsOf(th), t = formTerms();
  $("btnGen").disabled = !slots;
  $("cExtra").disabled = !slots; $("cParts").disabled = !slots;
  if (!slots) { $("cComp").innerHTML = th.mine ? `Tema salvo: <b>${esc(th.label)}</b>. A lista é a que você salvou; edite à vontade em "Ajustes da sala".` : `Cole a sua lista em "Ajustes da sala" e ajuste os nomes usados no tema.`; return; }
  const c = counts(th), items = itemsOf(th);
  const short = Object.keys(c).filter(k => c[k] > items[k].length);
  $("cComp").innerHTML = `Cada ${esc(t.team)}: ` + Object.entries(slots).map(([k,v]) => `<b>${v} ${esc(k)}</b>`).join(", ") +
    ` · ${Object.values(c).reduce((a,b)=>a+b,0)} ${esc(t.items)} na lista` +
    (short.length ? `<br><span class="warn">O tema não tem ${short.map(k=>esc(k)).join(", ")} suficientes para tanta gente; entram todos os disponíveis. Complete a lista à mão se quiser.</span>` : "");
}
function generate(){
  const th = curTheme(), c = counts(th), items = itemsOf(th);
  if (!c) return;
  const lines = [];
  Object.entries(c).forEach(([k,v]) => shuffle(items[k].slice()).slice(0, v).forEach(name => lines.push(`${name} (${k})`)));
  $("cPlayers").value = lines.join("\n");
  listDirty = false; countPlayers(); updateComp();
}
$("btnGen").onclick = () => { if (listDirty && !confirm("Sortear de novo substitui a lista que você editou. Continuar?")) return; generate(); };
$("cPlayers").addEventListener("input", () => listDirty = true);
$("cParts").addEventListener("change", () => { if (!extraTouched) $("cExtra").value = $("cParts").value; if (!listDirty || confirm("Atualizar a lista para o novo número de participantes? (substitui a lista editada)")) generate(); else updateComp(); });
$("cExtra").addEventListener("change", () => { extraTouched = true; if (!listDirty || confirm("Atualizar a lista com as novas sobras? (substitui a lista editada)")) generate(); else updateComp(); });
$("btnSaveTheme").onclick = () => {
  const th = curTheme();
  const name = prompt("Nome do seu tema:", th.mine ? th.label : th.label + " (meu)");
  if (!name || !name.trim()) return;
  const list = myThemes().filter(t => !(th.mine && t.id === th.id));
  const t = formTerms();
  const saved = { id: th.mine ? th.id : "my-" + Date.now(), mine: true, icon: "⭐", label: name.trim().slice(0,40), terms: t,
    prompt: th.prompt || "generic", perTeam: +$("cPer").value || 5, list: $("cPlayers").value,
    slots: th.slots || null, req: th.req || null, skin: skinOfTheme(th) };
  list.push(saved); store.set("lt_mythemes", list);
  themeId = saved.id; listDirty = false; renderThemes(); selectTheme(saved.id, false); toast("Tema salvo neste navegador!");
};
$("btnDelTheme").onclick = () => {
  const th = curTheme(); if (!th.mine || !confirm(`Excluir o tema "${th.label}"?`)) return;
  store.set("lt_mythemes", myThemes().filter(t => t.id !== th.id));
  selectTheme(PRESETS[0].id, false); generate();
};

const savedCfg = store.get("lt_cfg");
if (savedCfg) {
  ["cPer","cCoins","cSkips","cMin","cTimer","cParts","cExtra"].forEach(k=>{ if(savedCfg[k]!=null) $(k).value=savedCfg[k]; });
  extraTouched = !!savedCfg.extraTouched;
  if (savedCfg.compMode) $("cCompMode").value = savedCfg.compMode;
  if (savedCfg.formLock) $("cFormLock").value = savedCfg.formLock;
  $("cHidePool").checked = !!savedCfg.hidePool;
  if (savedCfg.mode) setMode(savedCfg.mode);
  if (savedCfg.theme && allThemes().some(t => t.id === savedCfg.theme)) themeId = savedCfg.theme;
  selectTheme(themeId, false);
  if (savedCfg.players) { $("cPlayers").value = savedCfg.players; listDirty = !!savedCfg.listDirty; }
  if (savedCfg.terms) { $("tItem").value=savedCfg.terms.item; $("tItems").value=savedCfg.terms.items; $("tTeam").value=savedCfg.terms.team; $("tTeams").value=savedCfg.terms.teams; $("tPrefix").value=savedCfg.terms.prefix; }
  applyFormTerms(); updateComp();
} else selectTheme(themeId, false);

$("btnCreate").onclick = () => {
  $("cErr").textContent = "";
  const th = curTheme();
  const terms = { ...formTerms(), icon: th.icon, label: th.label, prompt: th.prompt || "generic", skin: skinOfTheme(th) };
  const comp = th.slots && th.req ? { mode: $("cCompMode").value, slots: th.slots, req: th.req } : { mode: "free" };
  if (comp.mode === "exact" && +$("cPer").value !== Object.values(th.slots).reduce((a,b)=>a+b,0)) return $("cErr").textContent = `Na composição exata, cada ${formTerms().team} precisa ter ${Object.values(th.slots).reduce((a,b)=>a+b,0)} ${formTerms().items}.`;
  const data = { formLock: $("cFormLock").value, comp, terms, mode, perTeam:$("cPer").value, coins:$("cCoins").value, skips:$("cSkips").value, minBid:$("cMin").value, timer:$("cTimer").value, hidePool:$("cHidePool").checked,
    players:$("cPlayers").value, hostPlays:$("cPlays").checked, hostName:$("cName").value };
  if (data.hostPlays && !data.hostName.trim()) return $("cErr").textContent = "Digite seu nome (ou desmarque a opção).";
  store.set("lt_cfg", { formLock: $("cFormLock").value, hidePool: $("cHidePool").checked, compMode: $("cCompMode").value, theme: themeId, terms: formTerms(), cParts:$("cParts").value, cExtra:$("cExtra").value, extraTouched, listDirty, mode, cPer:data.perTeam, cCoins:data.coins, cSkips:data.skips, cMin:data.minBid, cTimer:data.timer, players:data.players });
  socket.emit("create", data, (r) => {
    if (!r.ok) return $("cErr").textContent = r.error;
    store.set("lt_sess_"+r.code, { hostToken:r.hostToken, capToken:r.capToken });
    store.set("lt_last", r.code);
    enter(r.code, r.capId, true);
  });
};
$("btnJoin").onclick = () => join(false);
$("btnWatch").onclick = () => join(true);
function join(watch){
  $("jErr").textContent = "";
  const code = $("jCode").value.toUpperCase().trim();
  if (!code) return $("jErr").textContent = "Digite o código da sala.";
  const sess = store.get("lt_sess_"+code) || {};
  socket.emit("join", { code, name:$("jName").value, watch, hostToken:sess.hostToken, capToken:sess.capToken }, (r) => {
    if (!r.ok) return $("jErr").textContent = r.error;
    if (r.capToken) store.set("lt_sess_"+code, { ...sess, capToken:r.capToken });
    store.set("lt_last", code);
    enter(r.code, r.capId, r.host);
  });
}
// a troca da tela inicial para a sala: com a transição do navegador (quando tem), senão a sala entra deslizando
function enter(code, capId, host){
  const jaNaSala = !!me.code && !$("room").classList.contains("hidden");
  me = { code, capId, host };
  history.replaceState(null, "", "?sala="+code);
  if (jaNaSala) return;
  const troca = () => { $("home").classList.add("hidden"); $("room").classList.remove("hidden"); document.body.classList.add("inroom"); scrollTo(0, 0); };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const vt = document.startViewTransition(troca);
    for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) if (p) p.catch(() => {}); // cancelada por outra: não é erro
  } else troca();
}
// auto-rejoin (refresh / reconnect)
function tryRejoin(){
  const code = me.code || params.get("sala") || null;
  if (!code) return;
  const sess = store.get("lt_sess_"+code);
  if (!sess) return;
  socket.emit("join", { code, hostToken:sess.hostToken, capToken:sess.capToken, watch: !sess.capToken }, (r) => { if (r.ok) enter(r.code, r.capId, r.host); });
}
socket.on("connect", tryRejoin);
socket.on("kicked", () => { toast("Você foi removido da sala."); store.del("lt_sess_"+me.code); setTimeout(()=>location.href=location.pathname,1500); });
