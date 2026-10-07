// Carreira de Treinador (parte 1b): a carreira em grupo, na mesma página (canal /carreira-online, carreira-online.js).
// Entrar ou abrir a sala, a sala de espera (os técnicos, as regras do anfitrião e a escolha dos clubes) e, quando o
// anfitrião começa, a sede de cada um com o seu clube (as mesmas telas da carreira solo, com o estado que o servidor
// manda no evento "carreira"). O token de cada um fica em "carreira-online:<CÓDIGO>" (volta sozinho ao recarregar).
let SALA = null, MEU_ID = null;
const credSala = (code) => store.get(`carreira-online:${code}`);
const OPCOES_SALA = [
  ["temporadas", "Temporadas", [1, 2, 3, 4, 5].map((n) => [n, String(n)])],
  ["aporte", "Aporte do investidor (para cada um)", [[0, "Nenhum"], [250e6, "R$ 250 mi"], [500e6, "R$ 500 mi"], [1e9, "R$ 1 bi"]]],
  ["ligas", "Clubes", [["brasil", "Só o Brasileirão"], ["mundo", "Brasil e Europa"]]],
  ["ritmo", "Ritmo", [["normal", "Normal"], ["turbo", "Turbo"]]],
];

function telaGrupo() {
  document.body.dataset.grupo = "1";
  $("hName").value = store.get("galera:name") || "";
  if (PARAMS_URL.get("sala")) $("hCode").value = PARAMS_URL.get("sala").toUpperCase();
  mostrarTela("grupo");
}
async function entrarNaSala(dados) {
  const r = await new Promise((ok) => socket.emit(dados.code ? "join" : "create", dados, (x) => ok(x || { ok: false, error: "Sem resposta do servidor." })));
  if (!r.ok) { $("gErro").textContent = r.error; return false; }
  $("gErro").textContent = "";
  MEU_ID = r.id;
  if (r.id) store.set(`carreira-online:${r.code}`, { id: r.id, token: r.token });
  history.replaceState(null, "", `?sala=${r.code}`); // a Noite da Galera acha a sala pelo endereço
  return true;
}
$("btnCreate").onclick = () => {
  const name = $("hName").value.trim(); if (!name) { $("gErro").textContent = "Coloque o seu nome."; return; }
  store.set("galera:name", name);
  entrarNaSala({ name, skin: store.get("galera:skin") });
};
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase();
  if (!code) { $("gErro").textContent = "Digite o código da sala."; return; }
  if (!name) { $("gErro").textContent = "Coloque o seu nome."; return; }
  store.set("galera:name", name);
  entrarNaSala({ code, name, skin: store.get("galera:skin") });
};
// conectou (ou reconectou): volta para a sala do endereço com o token guardado
async function conectarGrupo() {
  const code = (PARAMS_URL.get("sala") || (SALA && SALA.code) || "").toUpperCase(), cred = code && credSala(code);
  if (cred && (await entrarNaSala({ code, id: cred.id, token: cred.token }))) return;
  if (!telaAtual || telaAtual === "inicio") telaGrupo();
}

// ---------- a sala de espera ----------
socket.on("state", (st) => {
  if (!EM_GRUPO) return;
  const comecou = st.fase === "carreira" && (!SALA || SALA.fase !== "carreira");
  SALA = st;
  if (st.fase === "carreira") {
    if (comecou || !E) pedir("entrar").then((r) => { if (r.ok) { receber(r.estado); if (telaAtual === "grupo" || !telaAtual) abrirSede(); } });
    return;
  }
  desenharSala();
});
// o estado do meu clube, sempre que algo muda na sala
socket.on("carreira", (e) => { if (EM_GRUPO && E) receber(e); });

function desenharSala() {
  if (telaAtual !== "grupo") mostrarTela("grupo");
  const st = SALA, eu = st.players.find((p) => p.id === MEU_ID), anfitriao = MEU_ID === st.host;
  $("gEntrar").classList.add("hidden"); $("gSala").classList.remove("hidden");
  $("gCodigo").textContent = st.code;
  const faltam = st.players.filter((p) => !p.clube);
  $("gStatus").textContent = faltam.length ? `Esperando ${faltam.map((p) => p.name).join(", ")} escolher o clube.` : anfitriao ? "Todo mundo tem clube. Pode começar!" : "Todo mundo tem clube. Esperando o anfitrião começar.";
  $("gPessoas").innerHTML = st.players.map((p) => `<li class="${p.online ? "" : "fora"}">${p.clube ? escudo(p.clube, 2) : `<span class="sem-clube">${ic("campo")}</span>`}
    <span><b>${h(p.name)}</b><small>${p.clube ? h(nomeClube(p.clube)) : "escolhendo..."}</small></span>${p.host ? `<i class="tag">Anfitrião</i>` : ""}${p.online ? "" : `<i class="tag">fora</i>`}</li>`).join("");
  $("gOpcoes").innerHTML = OPCOES_SALA.map(([k, nome, lista]) => `<div class="controle"><span class="rotulo">${nome}</span><div class="segmentos">${lista.map(([v, t]) =>
    `<button data-opcao-sala="${k}" data-valor="${v}" aria-pressed="${st.opcoes[k] === v}" ${anfitriao ? "" : "disabled"}>${t}</button>`).join("")}</div></div>`).join("")
    + (anfitriao ? "" : `<p class="suave">Só o anfitrião muda as regras.</p>`);
  $("gMeuClube").textContent = eu && eu.clube ? `Você: ${nomeClube(eu.clube)}` : "";
  document.body.style.cssText = eu && eu.clube ? `${coresClube(eu.clube)};${temaClube(eu.clube)}` : ""; // a sala já ganha a cor do clube escolhido
  const orc = (c) => c.orcamento || Orcamentos.de(c).caixa, ordemLiga = (c) => ["brasileirao-2026", ...Temporada.EUROPA].indexOf(c.liga);
  $("gClubes").innerHTML = st.clubes.map((id) => CLUBES[id]).filter(Boolean).sort((a, b) => ordemLiga(a) - ordemLiga(b) || orc(b) - orc(a)).map((c) => {
    const dono = st.ocupados[c.id], meu = dono === MEU_ID, outro = dono && !meu ? st.players.find((p) => p.id === dono) : null;
    return `<button class="clube" style="${coresClube(c.id)}" data-clube-sala="${c.id}" aria-pressed="${meu}" ${outro ? "disabled" : ""}>${escudo(c.id, 3)}<span class="clube-info"><b>${h(c.nome)}</b>
      <small>${outro ? `de ${h(outro.name)}` : h(Temporada.NOMES[c.liga] || "")}</small><span class="orcamento"><span class="caixa-clube">${ic("moeda")} ${dinheiro(orc(c) + st.opcoes.aporte)}</span></span></span></button>`;
  }).join("");
  $("btnComecar").classList.toggle("hidden", !anfitriao);
  $("btnComecar").disabled = !!faltam.length;
}
const agir = async (dados) => {
  const r = await new Promise((ok) => socket.emit("act", dados, (x) => ok(x || { ok: false, error: "Sem resposta do servidor." })));
  if (!r.ok) toast(r.error);
  return r;
};
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-opcao-sala]");
  if (o) { const k = o.dataset.opcaoSala, v = ["temporadas", "aporte"].includes(k) ? Number(o.dataset.valor) : o.dataset.valor; agir({ type: "opcoes", [k]: v }); return; }
  const c = e.target.closest("[data-clube-sala]");
  if (c) agir({ type: "clube", clube: c.getAttribute("aria-pressed") === "true" ? null : c.dataset.clubeSala });
});
$("btnComecar").onclick = async () => {
  $("btnComecar").disabled = true; $("btnComecar").querySelector("span").textContent = "Montando o mundo...";
  const r = await agir({ type: "comecar" });
  $("btnComecar").querySelector("span").textContent = "Começar a carreira";
  if (!r.ok) $("btnComecar").disabled = false;
};
$("gCopiar").onclick = () => {
  const url = `${location.origin}/carreira/?sala=${SALA.code}`;
  navigator.clipboard?.writeText(url).then(() => toast("Convite copiado.")).catch(() => toast(url));
};
