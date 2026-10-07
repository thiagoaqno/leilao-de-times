// Estado comum aos scripts da pagina e escolhas da sala.
const { $, h, store } = Comum;
const socket = io("/ginasio", { autoConnect: false }), relogio = Comum.relogio(), toast = Comum.criarToast();
const act = Comum.criarAct(socket, toast);
const ic = (nome) => Icones.ic(nome);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dexDe = (modo) => modo === "pokemon" ? PokeDex : Galeramon;
const salvo = store.get("ginasio:config") || {};
const configLocal = { modo: salvo.modo === "pokemon" ? "pokemon" : "galeramon", formato: salvo.formato === "2x2" ? "2x2" : "1x1", bots: salvo.bots !== false };
const times = { galeramon: Galeramon.cleanTeam(store.get("galeramon_time")), pokemon: PokeDex.cleanTeam(store.get("pokemon_time")) };
let S = null, ME = null, salaVisivel = true, timeInicial = false, modoAnterior = null, ocupado = false;
const modoAtual = () => S?.config.modo || configLocal.modo;
const dexAtual = () => dexDe(modoAtual());
const meuJogador = () => S?.players.find((p) => p.id === ME?.id);
const timeAtual = () => meuJogador()?.time || times[modoAtual()];
const imagens = new Map();

function spriteUrl(id, modo = modoAtual()) { return modo === "pokemon" ? PokeDex.sprite(id, false) : GaleramonSprite(id); }
function imagemDe(id, modo = modoAtual()) {
  const chave = `${modo}:${id}`;
  if (!imagens.has(chave)) {
    const img = new Image(), dado = { img, pronto: false, erro: false };
    img.crossOrigin = "anonymous";
    img.onload = () => { dado.pronto = true; };
    img.onerror = () => { dado.erro = true; };
    img.src = spriteUrl(id, modo); imagens.set(chave, dado);
  }
  return imagens.get(chave);
}
function htmlBicho(id, modo = modoAtual()) {
  const D = dexDe(modo), b = D.MONS[id];
  return `<img src="${h(spriteUrl(id, modo))}" alt="" loading="lazy" width="56" height="56"><span>${h(b.n)}</span><i class="tipo" style="--tipo:${D.TYPES[b.types[0]]}"></i>`;
}
function preencher(id, html) { const el = $(id); if (el._html !== html) { el._html = html; el.innerHTML = html; } }
function guardarTime(modo, time) { times[modo] = [...time]; store.set(modo === "pokemon" ? "pokemon_time" : "galeramon_time", time); }
function guardarConfig() { if (S) Object.assign(configLocal, S.config); store.set("ginasio:config", configLocal); }
function atualizarOpcoes() {
  const c = S?.config || configLocal, pode = !S || (S.host === ME?.id && S.phase !== "play");
  document.querySelectorAll("[data-modo]").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.modo === c.modo); b.disabled = !pode; });
  document.querySelectorAll("[data-formato]").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.formato === c.formato); b.disabled = !pode; });
  $("bots").checked = c.bots; $("bots").disabled = !pode;
}
function renderSala() {
  if (LIDER) mostrarDesafio();
  atualizarOpcoes();
  $("inicio").classList.toggle("hidden", !!S); $("sala").classList.toggle("hidden", !S);
  $("rCode").classList.toggle("hidden", !S); $("salaCodigo").classList.toggle("hidden", !S);
  $("btnSala").classList.toggle("hidden", !S);
  if (S) { $("rCode").textContent = S.code; $("salaCodigo").textContent = S.code; }
  preencher("meuTime", timeAtual().map((id, i) => `<button class="bicho" data-escolher="${i}" title="${h(dexAtual().MONS[id].n)}" ${S && (!ME?.id || S.phase === "play") ? "disabled" : ""}>${htmlBicho(id)}</button>`).join(""));
  timeAtual().forEach((id) => imagemDe(id));
  if (typeof animacaoDe === "function") for (const id of [...timeAtual(), ...(S?.players || []).flatMap((p) => p.time || [])]) animacaoDe(id); // os GIFs chegam antes da partida
  if (!S) return;
  const organizador = S.host === ME?.id, n = S.config.formato === "2x2" ? 2 : 1;
  let lista = S.players.map((p) => `<div class="participante ${p.lado === 1 ? "vermelho" : p.lado == null ? "fora" : ""} ${p.online ? "" : "offline"}"><span class="nome">${h(p.name)}${p.id === ME?.id ? " · você" : ""}</span>${p.ping == null ? "" : `<span class="ping">${p.ping} ms</span>`}${organizador && p.id !== ME.id && S.phase !== "play" ? `<button class="icone" data-kick="${p.id}" title="Retirar ${h(p.name)}" aria-label="Retirar ${h(p.name)}">${ic("fechar")}</button>` : ""}</div>`).join("");
  if (S.config.bots) for (const lado of [0, 1]) for (let i = S.players.filter((p) => p.lado === lado).length; i < n; i++) lista += `<div class="participante ${lado ? "vermelho" : ""}"><span class="nome">Robô</span></div>`;
  preencher("participantes", lista);
  document.querySelectorAll("[data-lado]").forEach((b) => { const lado = b.dataset.lado === "null" ? null : +b.dataset.lado; b.disabled = !ME?.id || S.phase === "play"; b.setAttribute("aria-pressed", meuJogador()?.lado === lado); });
  $("btnStart").classList.toggle("hidden", !organizador); $("btnStart").disabled = S.phase === "play";
  preencher("feed", S.feed.slice(-4).map((f) => `<li>${h(f.text)}</li>`).join(""));
}
async function mudarConfig(patch) {
  if (S) { if (await act("config", { config: patch })) guardarConfig(); }
  else { Object.assign(configLocal, patch); guardarConfig(); renderSala(); }
}
function entrar(r, novo = false) {
  ocupado = false; $("btnRobo").disabled = false;
  if (!r?.ok) { $("hErr").textContent = r?.error || "Sem conexão."; return false; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("ginasio:" + r.code, ME);
  timeInicial = novo; modoAnterior = null; salaVisivel = S?.phase !== "play";
  history.replaceState(null, "", `/ginasio/?sala=${r.code}${location.hash}`);
  return true;
}
function pedirSala(evento, dados) {
  return new Promise((res) => socket.timeout(7000).emit(evento, dados, (err, r) => res(err ? { ok: false, error: "Sem conexão. Tente de novo." } : r)));
}
// o desafio a um líder ou treinador da Vila: /ginasio/?lider=brasa
const LIDER = window.Lideres ? Lideres.de(new URLSearchParams(location.search).get("lider")) : null;
const insignias = () => store.get("ginasio:insignias") || {};
function mostrarInsignias() {
  $("insignias").innerHTML = `<h2>Insígnias</h2><div class="lista-insignias">${Lideres.GINASIOS.map((l) => `<span class="insignia ${insignias()[l.id] ? "ganha" : ""}" style="--cor:${l.cor}" title="${h(l.nome)} (${l.tipo})${insignias()[l.id] ? ": conquistada" : ""}">${ic(l.simbolo)}<small>${h(l.tipo)}</small></span>`).join("")}</div><p class="dica-insignias">Os ginásios ficam perto dos estacionamentos da Vila. Os treinadores estão pelas ruas.</p>`;
}
function mostrarDesafio() {
  if (!LIDER) return;
  const modo = configLocal.modo, time = LIDER.times[modo];
  $("desafioLider").classList.remove("hidden");
  $("desafioLider").style.cssText = `--cor:${LIDER.cor}`;
  $("desafioLider").innerHTML = `<span class="tipo-lider">${h(LIDER.onde === "ginasio" ? "Ginásio" : "Treinador")} · ${h(LIDER.tipo)}</span><h2>${h(LIDER.nome)}</h2><p>“${h(LIDER.frase)}”</p><div class="time-lider">${time.map((id) => htmlBicho(id, modo)).join("")}</div>${LIDER.onde === "ginasio" && insignias()[LIDER.id] ? "<p class=\"ja-tem\">Você já tem esta insígnia.</p>" : ""}`;
  $("btnRobo").textContent = `Aceitar o desafio`;
}
async function criarSala(rapido = false) {
  if (ocupado) return;
  if (!socket.connected) return ($("hErr").textContent = "Aguarde a conexão.");
  let name = $("hName").value.trim();
  if (!name && rapido) { name = "Você"; $("hName").value = name; }
  store.set("galera:name", name); ocupado = true; $("hErr").textContent = ""; $("btnRobo").disabled = true;
  const config = { ...configLocal, ...(rapido && { formato: "1x1", bots: true }), ...(rapido && LIDER && { lider: LIDER.id }) };
  const r = await pedirSala("create", { name, config, time: times[config.modo] });
  if (entrar(r) && rapido) { salaVisivel = false; await act("start"); }
}
async function juntar(assistir = false) {
  if (ocupado) return;
  const code = $("hCode").value.trim().toUpperCase(), name = $("hName").value.trim();
  if (!assistir && ME?.code === code && meuJogador()) return;
  if (!/^[A-Z2-9]{5}$/.test(code)) return ($("hErr").textContent = "O código tem 5 letras ou números.");
  if (!socket.connected) return ($("hErr").textContent = "Aguarde a conexão.");
  store.set("galera:name", name); ocupado = true;
  const saved = store.get("ginasio:" + code) || {};
  const r = await pedirSala("join", { code, name, ...(assistir ? { watch: true } : { id: saved.id, token: saved.token }) });
  entrar(r, !assistir && r?.id !== saved.id);
}
function sairSala() {
  ME = null; S = null; salaVisivel = true; modoAnterior = null;
  limparRede();
  socket.disconnect(); socket.connect(); history.replaceState(null, "", "/ginasio/" + location.hash);
  $("resultado").close(); renderSala(); mostrarJogo(false);
}
$("hName").value = store.get("galera:name") || "";
$("hCode").value = new URLSearchParams(location.search).get("sala") || "";
$("btnWatch").innerHTML = ic("olho"); $("btnInvite").innerHTML = ic("copiar"); $("btnSala").innerHTML = ic("lista");
document.querySelector('[data-lado="null"]').innerHTML = ic("olho");
$("btnRobo").onclick = () => criarSala(true); $("btnCreate").onclick = () => criarSala(); $("btnJoin").onclick = () => juntar(); $("btnWatch").onclick = () => juntar(true);
$("btnStart").onclick = async () => { salaVisivel = false; await act("start"); };
$("btnLeave").onclick = sairSala;
$("btnSala").onclick = () => { salaVisivel = !salaVisivel; mostrarJogo(!salaVisivel && S?.phase !== "lobby"); renderSala(); };
$("hCode").onkeydown = (e) => { if (e.key === "Enter") juntar(); };
$("meuTime").onclick = (e) => { const b = e.target.closest("[data-escolher]"); if (b && !b.disabled) abrirDex(+b.dataset.escolher); };
$("participantes").onclick = (e) => { const b = e.target.closest("[data-kick]"); if (b) act("kick", { id: b.dataset.kick }); };
document.querySelectorAll("[data-lado]").forEach((b) => { b.onclick = () => act("lado", { lado: b.dataset.lado === "null" ? null : +b.dataset.lado }); });
document.querySelectorAll("[data-modo]").forEach((b) => { b.onclick = () => mudarConfig({ modo: b.dataset.modo }); });
document.querySelectorAll("[data-formato]").forEach((b) => { b.onclick = () => mudarConfig({ formato: b.dataset.formato }); });
$("bots").onchange = () => mudarConfig({ bots: $("bots").checked });
$("btnInvite").onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/ginasio/?sala=${S.code}`); toast("Convite copiado."); } catch { toast(`Código da sala: ${S.code}`); } };

let slotDex = 0, paginaDex = 0;
function abrirDex(slot) {
  slotDex = slot; paginaDex = 0; $("dexBusca").value = "";
  $("dexTitulo").textContent = modoAtual() === "pokemon" ? "Escolher Pokémon" : "Escolher Galeramon";
  $("dexTipo").innerHTML = '<option value="">Todos os tipos</option>' + Object.keys(dexAtual().TYPES).map((t) => `<option>${h(t)}</option>`).join("");
  renderDex(); $("dex").showModal(); $("dexBusca").focus();
}
function renderDex() {
  const D = dexAtual(), busca = $("dexBusca").value.toLocaleLowerCase("pt-BR"), tipo = $("dexTipo").value;
  const ids = D.IDS.filter((id) => (!busca || D.MONS[id].n.toLocaleLowerCase("pt-BR").includes(busca) || String(D.MONS[id].num || "").includes(busca)) && (!tipo || D.MONS[id].types.includes(tipo)));
  const paginas = Math.max(1, Math.ceil(ids.length / 24)); paginaDex = clamp(paginaDex, 0, paginas - 1);
  const time = timeAtual();
  $("dexLista").innerHTML = ids.slice(paginaDex * 24, paginaDex * 24 + 24).map((id) => `<button class="bicho ${time.includes(id) ? "selecionado" : ""}" data-bicho="${id}" title="${h(D.MONS[id].n)} · ${h(D.MONS[id].types.join(" / "))}" ${time.includes(id) && time[slotDex] !== id ? "disabled" : ""}>${htmlBicho(id)}</button>`).join("");
  $("dexVazio").classList.toggle("hidden", ids.length > 0); $("dexPagina").textContent = `${paginaDex + 1} / ${paginas}`;
  $("dexAnterior").disabled = paginaDex === 0; $("dexProximo").disabled = paginaDex === paginas - 1;
}
$("dexFechar").innerHTML = ic("fechar"); $("dexAnterior").innerHTML = ic("esq"); $("dexProximo").innerHTML = ic("dir");
$("dexFechar").onclick = () => $("dex").close();
$("dexBusca").oninput = $("dexTipo").onchange = () => { paginaDex = 0; renderDex(); };
$("dexAnterior").onclick = () => { paginaDex--; renderDex(); }; $("dexProximo").onclick = () => { paginaDex++; renderDex(); };
$("dexLista").onclick = async (e) => {
  const b = e.target.closest("[data-bicho]"); if (!b || b.disabled) return;
  const time = [...timeAtual()]; time[slotDex] = b.dataset.bicho;
  if (!S || await act("time", { time })) { guardarTime(modoAtual(), time); $("dex").close(); renderSala(); }
};
mostrarInsignias();
renderSala();
