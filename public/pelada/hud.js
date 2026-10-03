// Pelada da Galera — o que fica por cima do jogo: placar, mensagens, dicas, tabela e a tela de fim de jogo.
import { E, C, $, h, store, setH, BOT_DIF, FIXO, kitOf, kitCss, sNow, myP, act, G, now, isCar, PAD } from "./estado.js";
import { keysHelp, skinButtons } from "./menus.js";
import { leaveGame } from "./jogo.js";
import { powerOf } from "./controles.js";

let msgT = 0;
export function flashMsg(big, small = "", ms = 2500, color = "#fff", pop = false) {
  setH("hMsg", `<span style="color:${color}">${h(big)}</span>${small ? `<small>${h(small)}</small>` : ""}`); msgT = now() + ms / 1000;
  const e = $("hMsg"); e.classList.remove("goal"); if (pop) { void e.offsetWidth; e.classList.add("goal"); }
}
export function pushFeed(html) { G.feed.push({ at: now(), html }); if (G.feed.length > 5) G.feed.shift(); }

// ======================================================================
// HUD
// ======================================================================
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export function hud(t) {
  const online = G.mode === "online", m = E.S && E.S.match, me = G.me;
  if (online && m) {
    const left = m.phase === "live" ? m.left - (sNow() - E.S.now) : m.left;
    const sw = (tm) => `<i style="background:${kitCss(E.S.kits[tm])}"></i>`;
    setH("hTop", `<div class="t">${sw("A")}${h(kitOf(E.S.kits.A).name)}</div><div class="s">${m.score.A}</div><div class="clock num">${fmtT(left)}</div><div class="s">${m.score.B}</div><div class="t">${h(kitOf(E.S.kits.B).name)}${sw("B")}</div>`);
    const mp = myP(); setH("hPing", (mp && mp.ping != null ? `ping ${mp.ping} ms` : "") + (E.S.config.bots && !isCar() ? ` · ${PAD.on ? "LB" : "T"}: troca de jogador` : ""));
    if (m.phase === "ready" && t > msgT) setH("hMsg", `<small>Começa em ${Math.max(1, Math.ceil((m.until - sNow()) / 1000))}…</small>`);
    else if (t > msgT) setH("hMsg", "");
  } else if (G.mode === "treino") {
    setH("hTop", G.falta ? `<div class="clock" style="font-size:16px">🎯 FALTAS · ${G.falta.goals} gol${G.falta.goals === 1 ? "" : "s"} em ${G.falta.n}</div>`
      : `<div class="clock" style="font-size:16px">${isCar() ? "🏎️" : "🧤"} TREINO · ${G.tGoals} gol${G.tGoals === 1 ? "" : "s"}${isCar() ? "" : ` · ${G.tKicks} chute${G.tKicks === 1 ? "" : "s"}`}</div>`);
    setH("hPing", isCar() ? "C = câmera da bola · V = câmera de TV · Esc = menu" : "C = troca a câmera · Esc = menu");
    if (t > msgT) setH("hMsg", "");
  } else if (G.mode === "bots" && G.bm) {
    const bm = G.bm, sw = (tm) => `<i style="background:${kitCss(bm.kits[tm])}"></i>`;
    setH("hTop", `<div class="t">${sw("A")}Você</div><div class="s">${bm.score.A}</div><div class="clock num">${fmtT(bm.left)}</div><div class="s">${bm.score.B}</div><div class="t">Bots · ${BOT_DIF[bm.dif].nome}${sw("B")}</div>`);
    setH("hPing", PAD.on ? "LB: troca de jogador · Menu = pausa" : "T: troca de jogador · Esc = menu");
    if (bm.phase === "ready" && t > msgT) setH("hMsg", "<small>Saída de bola…</small>");
    else if (t > msgT) setH("hMsg", "");
  }
  $("hPow").classList.toggle("hidden", !E.charge); $("hPowL").classList.toggle("hidden", !E.charge);
  if (E.charge) { $("hPow").firstElementChild.style.width = Math.round(powerOf(E.charge) * 100) + "%"; setH("hPowL", (G.F.strikers ? { chute: "Chute", passe: "Passe curto", cavadinha: "Profundidade", cruzamento: "Passe longo" } : { chute: "Chute", passe: "Passe", cavadinha: "Cavadinha" })[E.charge.kind]); }
  $("hSta").classList.toggle("hidden", !G.meModel || (!isCar() && !!G.F.semFolego)); // Strikers: sem fôlego
  if (G.meModel) {
    setH("hStaL", isCar() ? `Turbo · ${Math.round(Math.hypot(me.vx, me.vz) * 3.6)} km/h` : "Fôlego");
    const bar = $("hSta").querySelector("i"); bar.style.width = Math.round((isCar() ? me.boost / 100 : me.stamina) * 100) + "%"; bar.style.background = isCar() ? "#ffb300" : "#7fe3ff";
  }
  setH("hHint", !G.meModel ? "Assistindo · Tab: placar" : isCar() ? "W/S acelerar · A/D virar · Shift turbo<br>Espaço pular (2x: mortal) · Q derrapar · C câmera da bola"
    : G.F.strikers ? (PAD.on ? "⚡ STRIKERS · B chute · A passe curto · X passe longo (sem a bola: carrinho) · Y profundidade<br>Segure para mais força · R3 com a bola: giro · ↑ item · RT corre · View câmera"
      : "⚡ STRIKERS · K chute · J passe curto · U longo · L profundidade (segure para mais força)<br>Espaço com a bola: giro · Rodinha: carrinho · G: item · Shift corre · C câmera")
    : "Setas: mirar · K/clique chute · J/direito passe · L cavadinha · U cruzar<br>R + K/J: colocado · T: trocar · Rodinha: carrinho · F segurar · Shift pique · Espaço pular · C câmera");
  G.feed = G.feed.filter((f) => t - f.at < 8);
  setH("hFeed", G.feed.map((f) => `<div>${f.html}</div>`).join(""));
  $("cross").classList.add("hidden");
}
export function scoreTable() {
  if (G.mode === "treino") return `<p>Gols: <b>${G.tGoals}</b>${isCar() ? "" : ` · Chutes: <b>${G.tKicks}</b>`}</p>`;
  if (G.mode === "bots" && G.bm) return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>Você ${G.bm.score.A}</span><span>${G.bm.score.B} Bots (${BOT_DIF[G.bm.dif].nome})</span></div>`;
  if (!E.S || !E.S.match) return "";
  const m = E.S.match;
  const rows = ["A", "B"].flatMap((tm) => E.S.players.filter((p) => p.team === tm).sort((a, b) => b.goals - a.goals))
    .map((p) => `<tr class="${E.ME && p.id === E.ME.id ? "me" : ""}"><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${kitCss(E.S.kits[p.team])};margin-right:6px"></i>${p.gk ? "🧤 " : ""}${h(p.name)} <span class="muted">${isCar() ? h(C.CARS[p.car].name) : "#" + p.num}</span></td><td class="n">${p.goals}</td><td class="n">${p.assists}</td><td class="n">${isCar() ? "—" : p.gk ? p.saves : p.shots}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span>${h(kitOf(E.S.kits.A).name)} ${m.score.A}</span><span>${m.score.B} ${h(kitOf(E.S.kits.B).name)}</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Gols</th><th class="n">Assist.</th><th class="n">Chutes/defesas</th><th class="n">Ping</th></tr>${rows}</table>`;
}
export function renderPauseSb() { if (FIXO !== "carros") setH("pSkins", skinButtons(G.mode === "online" ? (myP() || {}).skin : store.get("pelada:skin"))); $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div><div style="margin-top:12px">${keysHelp(G.game)}</div>` : ""; $("pauseHint").textContent = (G.mode === "treino" ? "Treino: só você vê." : G.mode === "bots" ? "Contra bots: o jogo fica parado enquanto o menu está aberto." : "") + (PAD.on ? " 🎮 Start ou A: voltar" : ""); }
export function showOver() {
  if (document.pointerLockElement) document.exitPointerLock();
  $("pause").classList.add("hidden");
  const m = E.S.match, isHost = E.ME && E.S.host === E.ME.id, mine = myP();
  const w = m.score.A === m.score.B ? null : m.score.A > m.score.B ? "A" : "B";
  $("overBox").innerHTML = `<h2>${w ? `🏆 ${h(kitOf(E.S.kits[w]).name)} venceu!` : "🤝 Empate!"}</h2>
    <p class="muted" style="margin:0 0 6px">${mine && mine.team && w ? (mine.team === w ? "Boa! Seu time ganhou." : "Não foi dessa vez.") : ""}</p>${scoreTable()}
    <div class="row" style="margin-top:12px">${isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if ($("btnAgain")) $("btnAgain").onclick = () => act("start");
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = leaveGame;
}