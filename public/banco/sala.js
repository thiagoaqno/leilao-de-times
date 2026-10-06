// Banco da Galera — entrar/criar, render geral e sala de espera (parte 1 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
let T = window.Tabuleiro, BOARD = T.BOARD, GROUP_SQUARES = T.GROUP_SQUARES;
const { GROUPS, money, short } = T;
// Troca o tabuleiro da página quando a mesa escolhe outro tamanho.
function useBoard(kind) {
  if (T.kind === kind) return;
  T = window.Tabuleiro.makeBoard(kind); BOARD = T.BOARD; GROUP_SQUARES = T.GROUP_SQUARES;
  $("board").dataset.built = "";
  for (const id of Object.keys(pieceEls)) { pieceEls[id].remove(); delete pieceEls[id]; }
  for (const k of Object.keys(bldEls)) { bldEls[k].remove(); delete bldEls[k]; }
  for (const id of Object.keys(disp)) delete disp[id];
  lastMove = null;
}
const socket = io("/banco");
const { $, h, store } = Comum;
const { ic, peao } = Icones;
// todo emoji que aparecer na página (histórico, notícias do servidor, botões...) vira ícone, e os peões viram o desenho
Icones.observar(document.body, { peoes: true });

let S = null;          // estado da mesa
let ME = null;         // { code, id, token }
const relogio = Comum.relogio(); // relógio do servidor
let modal = null;      // { kind, i? }
const P = (id) => S && S.players.find((p) => p.id === id);
const me = () => ME && ME.id ? P(ME.id) : null;

const toast = Comum.criarToast(3200);
const act = Comum.criarAct(socket, toast);
// a troca de tela (início, sala de espera, jogo): com a transição do navegador, quando tem
let telaAgora = null;
function show(id) {
  const troca = () => { for (const s of ["home", "lobby", "game"]) $(s).classList.toggle("hidden", s !== id); $("btnView").classList.toggle("hidden", id !== "game"); $("btnMesa").classList.toggle("hidden", id !== "game"); };
  if (telaAgora === id) return troca();
  const antes = telaAgora; telaAgora = id;
  if (antes && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) semErro(document.startViewTransition(troca)); else troca();
}
// uma transição nova cancela a anterior (duas trocas de tela seguidas): o cancelamento é normal, não é erro
function semErro(vt) {
  for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) if (p) p.catch(() => {});
}

// ---------- entrar / criar ----------
const urlCode = new URLSearchParams(location.search).get("mesa");
$("hName").value = store.get("banco:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();

function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("banco:" + r.code, ME);
  store.set("banco:last", r.code);
  history.replaceState(null, "", "/banco/?mesa=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code; document.body.classList.add("inroom");
}
$("btnCreate").onclick = () => {
  const name = $("hName").value.trim(); store.set("banco:name", name);
  socket.emit("create", { name }, enter);
};
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("banco:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("banco:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => {
  const code = $("hCode").value.trim().toUpperCase();
  if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da mesa.");
  socket.emit("join", { code, watch: true }, enter);
};
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => {
  const link = location.origin + "/banco/?mesa=" + ME.code;
  try { await navigator.clipboard.writeText(link); toast("Convite copiado! Mande no grupo."); } catch { prompt("Copie o convite:", link); }
};

// volta automática para a mesa (internet caiu, recarregou a página…)
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null;
  const saved = code && store.get("banco:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else {
    show("home");
    const last = store.get("banco:last");
    if (last && !code && store.get("banco:" + last)) {
      $("resume").classList.remove("hidden");
      $("resume").innerHTML = `<button class="primary" id="btnResume">Voltar para a mesa ${h(last)}</button>`;
      $("btnResume").onclick = () => { location.href = "/banco/?mesa=" + last; };
    }
  }
}
socket.on("connect", autoJoin);
socket.on("kicked", () => { toast("O organizador tirou você da mesa."); ME = null; S = null; history.replaceState(null, "", "/banco/"); show("home"); $("roomTag").classList.add("hidden"); document.body.classList.remove("inroom"); });
socket.on("state", (st) => { S = st; relogio.doEstado(st.now); render(); });

// ---------- render geral ----------
function render() {
  if (!S) return;
  useBoard(S.config.board || "normal");
  if (S.phase === "lobby") { show("lobby"); renderLobby(); }
  else { show("game"); renderGame(); }
  if (modal) renderModal();
}

// ---------- sala de espera ----------
function renderLobby() {
  const m = me(), isHost = m && S.host === m.id;
  const seat = (p) => `
    <div class="seat" style="--c:${p.color}"><div class="pw">${peao(p.pawn)}</div>
      <div style="min-width:0"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${p.id === S.host ? "organizador" : p.online ? "pronto" : "desconectado"}${m && p.id === m.id ? " · você" : ""}</small></div>
      ${isHost && p.id !== m.id ? `<button class="x" data-kick="${p.id}" title="Tirar da mesa">✕</button>` : ""}
    </div>`;
  if (S.config.teams) {
    // modo equipes: uma coluna por equipe, e cada um escolhe a sua
    $("seats").className = "teamcols";
    $("seats").innerHTML = T.TEAMS.slice(0, S.config.teams).map((t, k) => `
      <div class="teamcol" style="--tc:${t.color}"><h4>${t.icon} ${h(t.name)}</h4>
        ${S.players.filter((p) => p.team === k).map(seat).join("") || `<p class="muted" style="margin:0 0 6px;font-size:13px">Ninguém ainda.</p>`}
        ${m && m.team !== k ? `<button class="small join" data-team="${k}">Entrar aqui</button>` : ""}
      </div>`).join("") + (isHost ? `<button class="small" id="btnShuffle" style="align-self:start">🎲 Sortear equipes</button>` : "");
    $("seats").querySelectorAll("[data-team]").forEach((b) => (b.onclick = () => act("team", { team: +b.dataset.team })));
    if ($("btnShuffle")) $("btnShuffle").onclick = () => act("shuffleTeams");
  } else {
    $("seats").className = "seats";
    $("seats").innerHTML = S.players.map(seat).join("") + Array.from({ length: Math.max(0, T.maxPlayers - S.players.length) }, () => `<div class="seat empty">lugar vago</div>`).join("");
  }
  $("seats").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));

  $("myPick").classList.toggle("hidden", !m);
  if (m) {
    const takenP = new Set(S.players.filter((p) => p.id !== m.id).map((p) => p.pawn));
    const takenC = new Set(S.players.filter((p) => p.id !== m.id).map((p) => p.color));
    $("pawnPick").innerHTML = T.PAWNS.map((x) => `<button class="${x === m.pawn ? "on" : ""} ${takenP.has(x) ? "taken" : ""}" data-p="${x}" ${takenP.has(x) ? "disabled" : ""} aria-label="Peão">${peao(x)}</button>`).join("");
    $("colorPick").innerHTML = T.COLORS.map((c) => `<button class="sw ${c === m.color ? "on" : ""} ${takenC.has(c) ? "taken" : ""}" style="background:${c}" data-c="${c}" ${takenC.has(c) ? "disabled" : ""} aria-label="Cor"></button>`).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("pawn", { color: b.dataset.c })));
  }

  const c = S.config, dis = isHost ? "" : "disabled";
  const cashOpts = [1000, 1500, 2000, 2500, 3000].map((v) => `<option value="${v}" ${v === c.startCash ? "selected" : ""}>${money(v)}</option>`).join("");
  $("seatsHint").textContent = `De 2 a ${T.maxPlayers} jogadores neste tabuleiro. Mande o convite para a galera entrar.`;
  const boardOpts = Object.entries(T.KINDS).map(([k, b]) => `<option value="${k}" ${k === (c.board || "normal") ? "selected" : ""}>${b.name} · ${b.desc}</option>`).join("");
  const timeOpts = [15, 30, 45, 60, 90, 0].map((v) => `<option value="${v}" ${v === c.maxMinutes ? "selected" : ""}>${v ? v + " minutos" : "Sem limite (até sobrar um)"}</option>`).join("");
  $("cfg").innerHTML = `
    <div class="row" style="align-items:flex-start">
      <div style="flex-basis:100%"><label for="cBoard">Tabuleiro</label><select id="cBoard" ${dis}>${boardOpts}</select>${S.players.length > 6 && c.board !== "grande" ? `<p class="muted" style="font-size:13px;margin:6px 0 0;color:var(--bad)">Com mais de 6 jogadores, escolha o tabuleiro grande.</p>` : ""}</div>
      <div style="flex:1;min-width:140px"><label for="cCash">Dinheiro inicial</label><select id="cCash" ${dis}>${cashOpts}</select></div>
      <div style="flex:1;min-width:140px"><label for="cTime">Tempo de partida</label><select id="cTime" ${dis}>${timeOpts}</select></div>
    </div>
    <label class="check"><input type="checkbox" id="cAuction" ${c.auction ? "checked" : ""} ${dis}><span>Leilão quando ninguém compra<small>Se quem caiu não comprar, todo mundo pode dar lance. Quem mandou a leilão ganha 10% de comissão.</small></span></label>
    <label class="check"><input type="checkbox" id="cFree" ${c.freeParking ? "checked" : ""} ${dis}><span>Pote das Férias<small>Impostos e multas vão para um pote. Quem cair nas Férias leva tudo.</small></span></label>
    <div style="margin:12px 0 4px"><label for="cTeams">Modo de jogo</label><select id="cTeams" ${dis}>${[[0, "Cada um por si"], [2, "2 equipes"], [3, "3 equipes"], [4, "4 equipes"]].map(([v, t]) => `<option value="${v}" ${v === c.teams ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    ${c.teams ? `<p class="muted" style="font-size:13px;margin:4px 0 8px">Cada um tem o seu dinheiro (e pode mandar para um colega). Aluguel entre colegas é grátis, e a cor completa vale para a equipe. Ganha a última equipe de pé ou a de maior patrimônio somado quando o tempo acaba.</p>` : ""}
    <label class="check"><input type="checkbox" id="cQuick" ${c.quick ? "checked" : ""} ${dis}><span>Modo rápido<small>Dá para pôr até 4 casas em qualquer imóvel, sem ter a cor toda. O hotel continua só com a cor completa.</small></span></label>
    <label class="check"><input type="checkbox" id="cSpecial" ${c.specials ? "checked" : ""} ${dis}><span>Eventos e cartas especiais<small>Um evento por rodada (Black Friday, IPTU, greve…) e cartas de demolir, tomar, doar e blindar imóveis.</small></span></label>
    <label class="check"><input type="checkbox" id="cDouble" ${c.doubleGo ? "checked" : ""} ${dis}><span>Salário em dobro<small>Cair exatamente no Início paga ${money(c.salary * 2)}.</small></span></label>
    <p class="muted" style="font-size:13.5px;margin:6px 0 0">${c.maxMinutes ? `Quando o tempo acabar, vence quem tiver o maior patrimônio (dinheiro + imóveis + construções). ` : ""}Cada jogada tem 40 segundos: se a pessoa não jogar, o dado roda sozinho.</p>`;
  if (isHost) {
    const send = () => act("config", { config: { ...S.config, startCash: +$("cCash").value, maxMinutes: +$("cTime").value, auction: $("cAuction").checked, freeParking: $("cFree").checked, doubleGo: $("cDouble").checked, specials: $("cSpecial").checked, quick: $("cQuick").checked, teams: +$("cTeams").value, board: $("cBoard").value } });
    ["cCash", "cTime", "cAuction", "cFree", "cDouble", "cSpecial", "cQuick", "cTeams", "cBoard"].forEach((id) => ($(id).onchange = send));
  }
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%;font-size:18px;padding:14px" ${S.players.length < 2 ? "disabled" : ""}>Começar o jogo</button>
       <p class="muted" style="font-size:13px;margin:8px 0 0">${S.players.length < 2 ? "Espere pelo menos mais uma pessoa entrar." : "A ordem dos jogadores é sorteada."}</p>`
    : `<p class="muted" style="margin:0">Esperando ${h(P(S.host)?.name || "o organizador")} começar o jogo…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
