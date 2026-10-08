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
  history.replaceState(null, "", `?sala=${r.code}${location.hash}`); // a Noite da Galera acha a sala pelo endereço
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
    if (comecou || !E) pedir("entrar").then((r) => { if (r.ok) { receber(r.estado); DESVIO = st.now - Date.now(); if (telaAtual === "grupo" || !telaAtual) abrirSede(); atualizarRodadaGrupo(r.estado.rodadaGrupo); } });
    desenharLeilao(); avisarLeilao(st);
    if (E && telaAtual === "sede") telaSede();
    return;
  }
  desenharSala();
});
// o estado do meu clube, sempre que algo muda na sala
socket.on("carreira", (e) => { if (EM_GRUPO && E) { receber(e); atualizarRodadaGrupo(e.rodadaGrupo); } });

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
  marcaClube(eu && eu.clube);
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

// ---------- a rodada da turma (carreira-rodada.js no servidor) ----------
let DESVIO = 0; // a diferença entre o relógio do servidor e o daqui
const agoraServidor = () => Date.now() + DESVIO;
// o minuto do meu jogo agora, pelo relógio que o servidor mandou (partida.js usa no lugar do relógio dela)
function relogioGrupo() {
  const m = E && E.rodadaGrupo && E.rodadaGrupo.meu; if (!m) return J.relogio;
  const r = m.relogio;
  return Math.min(r.limite, r.minuto + (r.rodando ? Math.max(0, agoraServidor() - Math.max(r.t, E.rodadaGrupo.inicio)) / 1000 * r.vel : 0));
}
const agirGrupo = async (dados) => {
  const r = await new Promise((ok) => socket.emit("act", dados, (x) => ok(x || { ok: false, error: "Sem resposta do servidor." })));
  if (!r.ok) toast(r.error);
  else if (r.pulou) toast(`Turbo: ${r.pulou} rodada${r.pulou > 1 ? "s" : ""} simulada${r.pulou > 1 ? "s" : ""} na hora.`);
  return r;
};
// a rodada mudou (o relógio, uma parada, um jogo que acabou): atualiza o jogo aberto sem fechar a decisão à toa
function atualizarRodadaGrupo(v) {
  if (!E) return;
  if (v) DESVIO = v.agora - Date.now();
  const antes = E.rodadaGrupo && E.rodadaGrupo.meu;
  E.rodadaGrupo = v;
  const m = v && v.meu;
  if (!m) {
    // O servidor já fechou a rodada: conclui a tela pelo último jogo, mesmo se o último pulso do relógio não chegou.
    if (J.grupo && telaAtual === "partida" && E.ultimo && E.ultimo.casa === J.casa && E.ultimo.fora === J.fora) {
      Object.assign(J, { eventos: E.ultimo.eventos, penaltis: E.ultimo.penaltis || null, parado: null, completo: true, relogio: 96 });
    }
    return;
  }
  if (J.grupo) atualizarControlesVelocidade();
  if (telaAtual !== "partida" || !J.grupo || J.rodada !== m.id) { if (!m.fim) abrirPartida(); return; }
  const mudouParada = (J.parado && J.parado.id) !== (m.parado && m.parado.id) || !!(J.parado && J.parado.esperando) !== !!(m.parado && m.parado.esperando);
  Object.assign(J, { eventos: m.eventos, parado: m.parado || null, completo: !!m.completo });
  if (mudouParada && $("decisao").open) { $("decisao").close(); J.decidindo = false; }
  if (!antes) atualizarPlacar();
}
socket.on("rodada", (v) => { if (EM_GRUPO) atualizarRodadaGrupo(v); });
// o botão grande da sede: o anfitrião começa a rodada; os outros esperam (e veem quem já mexeu no time)
function botaoRodadaGrupo() {
  const b = $("btnJogar"), txt = b.querySelector("span"), meu = E.rodadaGrupo && E.rodadaGrupo.meu;
  $("cartaoJogo").querySelector(".modos")?.classList.toggle("hidden", !!E.rodadaGrupo);
  if (meu && !meu.fim) { txt.textContent = "Voltar para a partida"; b.disabled = false; b.onclick = () => abrirPartida(); return; }
  if (E.rodadaGrupo) { txt.textContent = "Rodada rolando: os amigos estão jogando"; b.disabled = true; return; }
  const prontos = SALA ? SALA.players.filter((p) => p.pronto).map((p) => p.name) : [];
  if (E.anfitriao) { txt.textContent = "Jogar a próxima rodada"; b.disabled = false; b.onclick = () => agirGrupo({ type: "rodada" }); }
  else { txt.textContent = "Esperando o anfitrião começar a rodada"; b.disabled = true; }
  let info = $("cartaoJogo").querySelector(".prontos");
  if (!info) { info = document.createElement("p"); info.className = "prontos suave"; b.after(info); }
  info.textContent = prontos.length ? `Já mexeram no time: ${prontos.join(", ")}.` : "Antes da rodada, cada um ajusta o time, o mercado e os avisos.";
}

// ---------- o leilão entre os amigos ----------
function desenharLeilao() {
  const caixa = $("leilaoBox"), l = SALA && SALA.leilao;
  if (!l || !E) { caixa.classList.add("hidden"); return; }
  const j = JOGADORES[l.jogador], topo = l.lances[l.lances.length - 1], meu = E.clube;
  const proximo = topo ? topo.valor + l.passo : l.minimo, resta = Math.max(0, Math.ceil(((l.estado === "martelo" ? l.ate : l.fim) - agoraServidor()) / 1000));
  const chave = `${l.jogador}:${l.t || l.inicio || l.fim}`, lanceAnterior = caixa.dataset.lance, lanceAtual = topo ? `${topo.clube}:${topo.valor}` : "";
  const novo = caixa.dataset.leilao !== chave, mudouLance = !!lanceAnterior && lanceAnterior !== lanceAtual;
  caixa.dataset.leilao = chave; caixa.dataset.lance = lanceAtual;
  caixa.classList.remove("hidden");
  caixa.classList.toggle("novo", novo);
  caixa.innerHTML = `<div class="leilao-jogador"><img class="pix" src="${j ? retrato(j.id) : ""}" alt=""><span><small>AO VIVO · ${j ? h(j.pos) : ""}</small><b>${h(j ? j.nome : "?")}</b><em>${h(nomeClube(l.dono))}</em></span></div>
    <div class="leilao-info"><span class="leilao-icone">${ic("martelo")}</span><span><small>${topo ? "Maior lance" : "Lance inicial"}</small><b class="leilao-valor${mudouLance ? " mudou" : ""}">${dinheiro(topo ? topo.valor : l.minimo)}</b>${topo ? `<em>${escudo(topo.clube, 1)} ${h(nomeClube(topo.clube))}</em>` : `<em>mínimo pedido</em>`}</span></div>
    ${l.lances.length > 1 ? `<div class="leilao-historico" aria-label="Os últimos lances">${l.lances.slice(-6).reverse().map((x, i) => `<span class="${i ? "" : "topo"}">${escudo(x.clube, 1)}<b>${dinheiro(x.valor)}</b></span>`).join("")}</div>` : ""}
    <div class="leilao-tempo" style="--resta:${Math.min(30, resta)}"><b>${resta}</b><small>${l.estado === "martelo" ? "decisão" : "segundos"}</small></div>
    <div class="leilao-acoes">${l.dono === meu
      ? (l.estado === "martelo" || topo ? `<button id="lMartelo" class="primario" ${topo ? "" : "disabled"}>Bater o martelo</button><button id="lRecusar" class="secundario">Ficar com ele</button>` : "<small>O jogador é seu: você decide no fim.</small>")
      : l.estado === "lances" ? `<button id="lLance" class="primario" ${topo && topo.clube === meu ? "disabled" : ""}>Dar ${dinheiro(proximo)}</button>` : "<small>Esperando o dono decidir.</small>"}
      <button id="lVer" class="discreto">Ficha</button></div>`;
  if ($("lLance")) $("lLance").onclick = () => agirGrupo({ type: "lance", valor: proximo });
  if ($("lMartelo")) $("lMartelo").onclick = () => agirGrupo({ type: "martelo" });
  if ($("lRecusar")) $("lRecusar").onclick = () => agirGrupo({ type: "recusar" });
  $("lVer").onclick = () => abrirFicha(l.jogador);
  if (novo) setTimeout(() => caixa.classList.remove("novo"), 500);
}
setInterval(() => { if (EM_GRUPO && SALA && SALA.leilao) desenharLeilao(); }, 1000);
// o fim do leilão: um aviso para todo mundo
let leiloesCarregados = false, ultimoLeilaoVisto = null;
function avisarLeilao(st) {
  const u = st.ultimoLeilao;
  // Ao entrar numa sala, não repete uma venda antiga. Depois da primeira carga, o primeiro leilão novo já aparece.
  if (!leiloesCarregados) { leiloesCarregados = true; ultimoLeilaoVisto = u ? u.t : null; return; }
  if (!u || u.t === ultimoLeilaoVisto) return;
  ultimoLeilaoVisto = u.t;
  const nome = JOGADORES[u.jogador] ? JOGADORES[u.jogador].nome : "o jogador";
  toast(u.resultado === "vendido" ? `Martelo batido: ${nome} vai para o ${nomeClube(u.para)} por ${dinheiro(u.valor)}.` : u.resultado === "recusado" ? `O dono ficou com ${nome}.` : `O leilão de ${nome} terminou sem venda.`);
  if (u.resultado === "vendido") AnimacoesCarreira.animarTransferencia({ jogador: u.jogador, tipo: "venda", de: u.de || u.dono, para: u.para, valor: u.valor });
  if (u.resultado === "vendido" && E && u.para === E.clube) festa();
}
