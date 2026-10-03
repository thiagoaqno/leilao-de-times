// Tiro da Galera — telas fora do jogo: a inicial e a sala de espera.
import { E, WP, $, h, store, myP, act } from "./estado.js";
import { startGame } from "./jogo.js";

export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- sala de espera ----------
export function renderLobby() {
  const mine = myP(), isHost = E.ME && E.S.host === E.ME.id, size = E.S.config.size;
  const row = (p) => `<div class="pl ${p.id === (E.ME && E.ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === E.S.host ? "👑 " : ""}${h(p.name)}<span class="w">${WP[p.w].name}</span>${isHost && p.id !== E.ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const list = E.S.players.filter((p) => p.team === t);
    $("t" + t).innerHTML = list.map(row).join("") + Array.from({ length: Math.max(0, size - list.length) }, () => `<div class="pl muted" style="font-weight:500">vaga livre</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || list.length >= size);
  }
  const bench = E.S.players.filter((p) => !p.team);
  $("tN").innerHTML = bench.length ? bench.map(row).join("") : "Ninguém no banco.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  $("myW").classList.toggle("hidden", !mine);
  document.querySelectorAll("#myW .wcard").forEach((b) => b.classList.toggle("on", !!mine && b.dataset.w === mine.w));
  document.querySelectorAll("#cfgSize button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === size); b.disabled = !isHost; });
  document.querySelectorAll("#cfgRounds button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === E.S.config.rounds); b.disabled = !isHost; });
  const a = E.S.players.filter((p) => p.team === "A").length, b = E.S.players.filter((p) => p.team === "B").length;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${a && b ? "" : "disabled"}>Começar partida</button>${a && b ? (a !== b ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Times desiguais (${a} x ${b}). Dá pra jogar assim mesmo.</p>` : "") : `<p class="muted" style="font-size:13px;margin:8px 0 0">Precisa de pelo menos 1 jogador em cada time. Mande o convite!</p>`}`
    : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
  document.querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
document.querySelectorAll("#myW .wcard").forEach((b) => (b.onclick = () => act("weapon", { w: b.dataset.w })));
function setCfg(k, v) { const c = { ...E.S.config, [k]: v }; store.set("tiro:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgRounds button").forEach((b) => (b.onclick = () => setCfg("rounds", +b.dataset.v)));
$("btnPractice").onclick = () => startGame("treino");
$("btnPractice2").onclick = () => startGame("treino");