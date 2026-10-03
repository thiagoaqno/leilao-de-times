// Pelada da Galera — telas fora do jogo: a inicial (treino, contra bots, skins, quadra) e a sala de espera.
import { E, C, KITS, $, h, store, setH, BOT_DIF, FIXO, kitOf, kitCss, myP, act, G, isCar, offline, DRIBLE } from "./estado.js";
import { carPreview, mudarSkinJogador } from "./bonecos.js";
import { startGame } from "./jogo.js";
import { renderPauseSb } from "./hud.js";

if (FIXO === "carros") {
  document.title = "Rocket da Galera";
  document.getElementById("brandTitle").innerHTML = "🚀 Rocket da <span>Galera</span>";
  document.getElementById("heroTitle").innerHTML = "Futebol de<br><em>carro</em>";
  document.getElementById("heroLead").innerHTML = "Estilo Rocket League: arena fechada, bola gigante, turbo, pulo duplo e mortal. Do 1x1 ao 5x5 com carros pixelados inspirados no GT-R R34, no 911, na F40 e na M3.";
  document.getElementById("heroFeats").innerHTML = "<span>🚀 turbo</span><span>🤸 mortal</span><span>🏎️ 4 carros</span><span>👥 1x1 a 5x5</span><span>🎥 câmera da bola</span>";
}
for (const id of FIXO === "carros" ? ["btnPractice", "btnFalta", "btnBots"] : ["btnPracticeCar"]) document.getElementById(id).classList.add("hidden");
export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("game").classList.toggle("hidden", id !== "game");
  $("bar").classList.toggle("hidden", id === "game");
}

// ---------- sala de espera ----------
export function renderLobby() {
  const mine = myP(), isHost = E.ME && E.S.host === E.ME.id, size = E.S.config.size, cars = E.S.config.mode === "carros";
  const row = (p) => `<div class="pl ${p.id === (E.ME && E.ME.id) ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === E.S.host ? "👑 " : ""}${h(p.name)}${p.gk && !cars ? ` <span title="Goleiro">🧤</span>` : ""}${!cars && C.SKINS[p.skin] && p.skin !== "padrao" ? ` <span title="${h(C.SKINS[p.skin].name)}">${C.SKINS[p.skin].emoji}</span>` : ""}${cars ? ` <span class="muted" style="font-weight:500;font-size:12px">${h(C.CARS[p.car].name)}</span>` : ""}${isHost && p.id !== E.ME.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala" style="margin-left:auto">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const list = E.S.players.filter((p) => p.team === t), kit = E.S.kits[t];
    const vagas = E.S.config.bots && !cars ? Math.max(0, 4 - list.filter((p) => !p.gk).length) + (list.some((p) => p.gk) ? 0 : 1) : Math.max(0, size - list.length); // amistoso: os bots completam 4 na linha + goleiro
    $("t" + t).innerHTML = list.map(row).join("") + Array.from({ length: vagas }, (_, i) => `<div class="pl muted" style="font-weight:500">${E.S.config.bots && !cars ? (i === vagas - 1 && !list.some((p) => p.gk) ? "🤖 goleiro bot" : "🤖 bot (vaga livre)") : "vaga livre"}</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || list.length >= size);
    $("kn" + t).textContent = (cars ? "Pintura: " : "Camisa: ") + kitOf(kit).name;
    $("box" + t).style.borderColor = C.kitColor(kit);
    const canKit = isHost || (mine && mine.team === t);
    $("kits" + t).innerHTML = Object.keys(KITS).map((k) => `<button title="${h(KITS[k].name)}" data-kit="${k}" data-team="${t}" class="${k === kit ? "on" : ""}" style="background:${kitCss(k)}" ${canKit ? "" : "disabled"}></button>`).join("");
  }
  const bench = E.S.players.filter((p) => !p.team);
  $("tN").innerHTML = bench.length ? bench.map(row).join("") : "Ninguém no banco.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  // posição (a pé) ou carro (de carro)
  if (mine && mine.team && !cars) {
    const other = E.S.players.find((p) => p.team === mine.team && p.gk && p.id !== mine.id);
    $("myRole").innerHTML = `<label>Posição</label><div class="seg"><button data-gk="0" class="${mine.gk ? "" : "on"}">🏃 Linha</button><button data-gk="1" class="${mine.gk ? "on" : ""}" ${other ? "disabled title='Seu time já tem goleiro'" : ""}>🧤 Goleiro</button></div>
      <p class="muted" style="font-size:13px;margin:6px 0 0">${other ? `${h(other.name)} é o goleiro do seu time.` : "O goleiro pega a bola com a mão dentro da área e pode se jogar (Espaço + A/D)."}</p>`;
  } else if (mine && cars) {
    const col = mine.team ? C.kitColor(E.S.kits[mine.team]) : "#9aa0a6";
    $("myRole").innerHTML = `<label>Seu carro</label><div class="cars">${Object.entries(C.CARS).map(([k, c]) => `<button data-car="${k}" class="${mine.car === k ? "on" : ""}" title="${h(c.inspo)}"><img src="${carPreview(k, col)}" width="72" height="36" alt="" style="image-rendering:pixelated;display:block;margin:0 auto 4px"><b>${h(c.name)}</b><small>${h(c.inspo)}</small></button>`).join("")}</div>`;
  } else $("myRole").innerHTML = "";
  if (mine && !cars) $("myRole").innerHTML += `<label style="margin-top:14px">Sua skin</label><div class="skins">${skinButtons(mine.skin)}</div>`;
  $("cfgEstilo").innerHTML = `<button data-troca="0" class="${E.S.config.troca ? "" : "on"}" ${isHost ? "" : "disabled"}>🔒 Jogador fixo (Pro Clubs)</button><button data-troca="1" class="${E.S.config.troca ? "on" : ""}" ${isHost ? "" : "disabled"}>🔁 Troca de jogador (FIFA)</button>`;
  $("cfgEstiloInfo").textContent = "Só no amistoso com bots. Fixo: passe sem a bola pede a bola para o bot.";
  $("cfgMolinho").innerHTML = molinhoBotoes(E.S.config.molinho !== false, "data-molinho", isHost ? "" : "disabled");
  $("cfgBots").innerHTML = `<button data-amistoso="0" class="${E.S.config.bots ? "" : "on"}" ${isHost ? "" : "disabled"}>👥 Só humanos</button><button data-amistoso="1" class="${E.S.config.bots ? "on" : ""}" ${isHost ? "" : "disabled"}>🤖 Completar com bots (4x4 + goleiro)</button>`;
  $("cfgBotsInfo").textContent = E.S.config.bots ? "Cada time joga com 4 na linha e 1 goleiro; quem entrou joga e o resto é bot (1x1, 2x1, 3x4…). Passe sem a bola pede a bola para o bot; a troca de jogador é opcional." : "";
  $("cfgArena").innerHTML = Object.entries(C.ARENAS).map(([k, a]) => `<button data-arena="${k}" class="${(E.S.config.arena || "society") === k ? "on" : ""}" title="${h(a.desc)}" ${isHost ? "" : "disabled"}>${a.emoji} ${h(a.name)}</button>`).join("");
  document.querySelectorAll("#cfgMode button").forEach((b) => { b.classList.toggle("on", b.dataset.v === E.S.config.mode); b.disabled = !isHost; });
  document.querySelectorAll("#cfgSize button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === size); b.disabled = !isHost; });
  document.querySelectorAll("#cfgMin button").forEach((b) => { b.classList.toggle("on", +b.dataset.v === E.S.config.minutes); b.disabled = !isHost; });
  setH("keysBox", keysHelp(E.S.config.mode));
  const a = E.S.players.filter((p) => p.team === "A").length, b = E.S.players.filter((p) => p.team === "B").length, pode = E.S.config.bots && !cars ? a || b : a && b;
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%" ${pode ? "" : "disabled"}>Apitar o começo</button>${pode ? (a !== b && !E.S.config.bots ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Times desiguais (${a} x ${b}). Dá pra jogar assim mesmo.</p>` : "") : `<p class="muted" style="font-size:13px;margin:8px 0 0">Precisa de pelo menos 1 jogador em cada time. Mande o convite!</p>`}`
    : `<p class="muted">Esperando o organizador apitar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
  document.querySelectorAll("[data-kick]").forEach((x) => (x.onclick = () => act("kick", { id: x.dataset.kick })));
  document.querySelectorAll("[data-kit]").forEach((x) => (x.onclick = () => act("kit", { team: x.dataset.team, kit: x.dataset.kit })));
  document.querySelectorAll("[data-gk]").forEach((x) => (x.onclick = () => act("gk", { on: x.dataset.gk === "1" })));
  document.querySelectorAll("[data-car]").forEach((x) => (x.onclick = () => { store.set("pelada:car", x.dataset.car); act("car", { car: x.dataset.car }); }));
}
export function keysHelp(mode) {
  if (mode === "carros") return `<ul class="keys">
    <li><kbd>W</kbd> acelerar · <kbd>S</kbd> ré</li><li><kbd>A</kbd><kbd>D</kbd> virar</li>
    <li><kbd>Shift</kbd> turbo</li><li><kbd>Espaço</kbd> pular (2x = pulo duplo)</li>
    <li>No ar: <kbd>Espaço</kbd> + direção = mortal</li><li>No ar: <kbd>W</kbd><kbd>S</kbd> inclinam o carro</li>
    <li><kbd>Q</kbd> freio de mão (derrapar)</li><li><kbd>C</kbd> câmera da bola</li></ul>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">🎮 <b>Controle:</b> RT acelera, LT ré, analógico vira (e inclina no ar), A pula, B turbo, X derrapa, Y câmera da bola, Start pausa.</p>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Dica: pule e use o turbo no ar para pegar a bola alta. O mortal bate na bola com mais força. Passe pelas almofadas amarelas para encher o turbo.</p>`;
  return `<ul class="keys">
    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> correr · mouse vira a câmera</li><li><kbd>Shift</kbd> pique</li>
    <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> direção do chute/passe</li><li><kbd>K</kbd> ou clique: chute (segure)</li>
    <li><kbd>J</kbd> ou botão direito: passe</li><li><kbd>L</kbd> ou botão do meio: cavadinha</li>
    <li><kbd>U</kbd> cruzamento alto (cai na área)</li>
    <li><kbd>R</kbd> segurado + <kbd>K</kbd>/<kbd>J</kbd>: chute/passe colocado (sai na hora, força máxima)</li>
    <li><kbd>Q</kbd>/<kbd>E</kbd> segurados no chute: efeito (curva)</li>
    <li>Rodinha do mouse: carrinho (só sem a bola)</li><li><kbd>F</kbd> segurar quem está perto (ele corre devagar)</li><li><kbd>Espaço</kbd> pular / cabecear</li>
    <li>Contra bots: <kbd>T</kbd> troca de jogador</li>
    <li>Goleiro: <kbd>Espaço</kbd> + <kbd>A</kbd>/<kbd>D</kbd> se joga</li><li><kbd>C</kbd> câmera: atrás, TV ou 1ª pessoa</li></ul>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">🎮 <b>Controle do Xbox (FIFA clássico):</b> analógico esquerdo corre e mira, o direito mexe a câmera · A passe · B chute · X cruzamento alto (sem a bola: carrinho) · Y cavadinha · <b>RB + B</b> chute colocado e <b>RB + A</b> passe colocado (saem na hora, força máxima) · <b>LB</b> troca de jogador (contra bots) · RT pique · LT segurar · R3 (apertar o analógico direito) pular/cabecear (goleiro: R3 + lado se joga) · View câmera · Menu pausa.</p>
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">Sem seta apertada, a bola vai para onde o jogador está virado. O passe procura o companheiro mais perto da direção (como no FIFA). Carrinho só sem a bola: derruba quem estiver na frente.</p>`;
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
function setCfg(k, v) { const c = { ...E.S.config, [k]: v, mode: FIXO }; store.set("pelada:cfg", c); act("config", { config: c }); }
document.querySelectorAll("#cfgMode button").forEach((b) => (b.onclick = () => setCfg("mode", b.dataset.v)));
document.querySelectorAll("#cfgSize button").forEach((b) => (b.onclick = () => setCfg("size", +b.dataset.v)));
document.querySelectorAll("#cfgMin button").forEach((b) => (b.onclick = () => setCfg("minutes", +b.dataset.v)));
// skins e quadras: os botões são desenhados de novo a cada mudança, então o clique é tratado aqui, num lugar só
export const skinButtons = (atual) => Object.entries(C.SKINS).map(([k, sk]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${sk.emoji}</i>${h(sk.name)}</button>`).join("");
// corpo molinho (a mola do tronco atrapalha a aderência nas viradas bruscas): online, a sala decide; no treino e
// contra bots, a escolha da tela inicial (ligado por padrão)
const molinhoBotoes = (on, attr, dis = "") => `<button ${attr}="1" class="${on ? "on" : ""}" ${dis}>🍮 Molinho (afeta a corrida)</button><button ${attr}="0" class="${on ? "" : "on"}" ${dis}>🧱 Só no visual</button>`;
function renderHomePicks() {
  $("hMolinho").innerHTML = molinhoBotoes(store.get("pelada:molinho") !== false, "data-molinho-treino");
  $("hSkins").innerHTML = skinButtons(store.get("pelada:skin"));
  const a = store.get("pelada:arena") || "society";
  const tr = store.get("pelada:troca") === true;
  $("hEstilo").innerHTML = `<button data-troca-treino="0" class="${tr ? "" : "on"}">🔒 Jogador fixo (Pro Clubs)</button><button data-troca-treino="1" class="${tr ? "on" : ""}">🔁 Troca de jogador (FIFA)</button>`;
  $("hArena").innerHTML = Object.entries(C.ARENAS).map(([k, ar]) => `<button data-arena-treino="${k}" class="${a === k ? "on" : ""}" title="${h(ar.desc)}">${ar.emoji} ${h(ar.name)}</button>`).join("");
  const n = store.get("pelada:botSize") || 3, d = BOT_DIF[store.get("pelada:botDif")] ? store.get("pelada:botDif") : "medio";
  $("hBotSize").innerHTML = [1, 2, 3, 4, 5].map((k) => `<button data-botsize="${k}" class="${n === k ? "on" : ""}">${k}x${k}</button>`).join("");
  $("hBotDif").innerHTML = Object.entries(BOT_DIF).map(([k, v]) => `<button data-botdif="${k}" class="${d === k ? "on" : ""}">${v.nome}</button>`).join("");
}
function escolherSkin(id) {
  if (!C.SKINS[id]) return;
  store.set("pelada:skin", id);
  if (E.ME && E.ME.id && E.S) act("skin", { skin: id }); // na sala: o servidor avisa todo mundo e cada um troca o boneco
  if (G.active && offline() && G.meModel && !isCar()) mudarSkinJogador(G.meModel, id); // no treino (e contra bots) troca na hora
  renderHomePicks(); if (G.active) renderPauseSb();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.skin) escolherSkin(b.dataset.skin);
  else if (b.dataset.arenaTreino) { store.set("pelada:arena", b.dataset.arenaTreino); renderHomePicks(); }
  else if (b.dataset.trocaTreino) { store.set("pelada:troca", b.dataset.trocaTreino === "1"); renderHomePicks(); }
  else if (b.dataset.troca && E.S) setCfg("troca", b.dataset.troca === "1");
  else if (b.dataset.botsize) { store.set("pelada:botSize", +b.dataset.botsize); renderHomePicks(); }
  else if (b.dataset.botdif) { store.set("pelada:botDif", b.dataset.botdif); renderHomePicks(); }
  else if (b.dataset.arena && E.S) setCfg("arena", b.dataset.arena);
  else if (b.dataset.amistoso && E.S) setCfg("bots", b.dataset.amistoso === "1");
  else if (b.dataset.molinhoTreino) { store.set("pelada:molinho", b.dataset.molinhoTreino === "1"); renderHomePicks(); }
  else if (b.dataset.molinho && E.S) setCfg("molinho", b.dataset.molinho === "1");
});
if (FIXO === "carros") document.querySelectorAll(".soPe").forEach((e) => e.classList.add("hidden"));
else renderHomePicks();
$("btnPractice").onclick = () => startGame("treino", "pes");
$("btnBots").onclick = () => startGame("bots", "pes");
$("btnFalta").onclick = () => startGame("treino", "pes", true);
$("btnPracticeCar").onclick = () => startGame("treino", "carros");
$("btnPractice2").onclick = () => startGame("treino", FIXO);

// ---------- painel "Ajustar condução" (menu de pausa): mexe nos números da condução com toques e dos dribles na
// hora, para sentir a diferença. Fica salvo neste navegador (pelada:cond). Online, vale para a bola no SEU pé.
const COND_UI = [
  ["intervalo", "Tempo entre toques (correndo)", 0.1, 0.5, 0.01, "s"], ["intervaloPique", "Tempo entre toques (pique)", 0.1, 0.6, 0.01, "s"],
  ["intervaloProtege", "Tempo entre toques (protegendo)", 0.08, 0.4, 0.01, "s"],
  ["leadAndando", "Bola na frente (andando)", 0.4, 1.2, 0.05, "m"], ["leadCorrendo", "Bola na frente (correndo)", 0.4, 1.6, 0.05, "m"],
  ["leadPique", "Bola na frente (pique)", 0.5, 2.5, 0.05, "m"], ["leadProtege", "Bola na frente (protegendo)", 0.3, 1, 0.05, "m"],
  ["alcance", "Alcance do pé", 0.8, 2, 0.05, "m"], ["ladoPe", "Pé alternado (de lado)", 0, 0.3, 0.01, "m"],
  ["dominio", "Raio do ímã", 0, 1.2, 0.05, "m"], ["ima", "Força do ímã", 0, 10, 0.5, ""],
];
const DRIBLE_UI = [["arrastada", "Arrastada (tranco de lado)", 2, 9, 0.5, "m/s"], ["corteVel", "Corte seco (saída)", 0, 5, 0.2, "m/s"]];
const condPadrao = { ...C.COND }, driblePadrao = { ...DRIBLE };
(function carregarCond() { const s = store.get("pelada:cond") || {}; for (const [k] of COND_UI) if (typeof s[k] === "number") C.COND[k] = s[k]; for (const [k] of DRIBLE_UI) if (typeof s["d_" + k] === "number") DRIBLE[k] = s["d_" + k]; })();
function salvarCond() { const s = {}; for (const [k] of COND_UI) s[k] = C.COND[k]; for (const [k] of DRIBLE_UI) s["d_" + k] = DRIBLE[k]; store.set("pelada:cond", s); }
const linhaCond = (obj, pre) => ([k, nome, a, b, st, un]) => `<label style="display:grid;grid-template-columns:1fr 110px 54px;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;margin:4px 0">${h(nome)}<input type="range" min="${a}" max="${b}" step="${st}" value="${obj[k]}" data-cond="${pre}${k}"><span>${obj[k]}${un}</span></label>`;
export function painelCond() {
  return COND_UI.map(linhaCond(C.COND, "")).join("") + DRIBLE_UI.map(linhaCond(DRIBLE, "d_")).join("") + `<button class="small ghost" data-cond-reset="1" style="margin-top:6px">Voltar ao padrão</button>`;
}
document.addEventListener("input", (e) => {
  const k = e.target.dataset && e.target.dataset.cond; if (!k) return;
  const v = +e.target.value; if (k.startsWith("d_")) DRIBLE[k.slice(2)] = v; else C.COND[k] = v;
  e.target.nextElementSibling.textContent = v + (e.target.parentElement.lastElementChild.textContent.replace(/[-\d.]/g, ""));
  salvarCond();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-cond-reset]")) return;
  Object.assign(C.COND, condPadrao); Object.assign(DRIBLE, driblePadrao); salvarCond();
  document.querySelectorAll("[data-cond-painel]").forEach((el) => (el.innerHTML = painelCond()));
});
if (FIXO !== "carros") document.querySelectorAll("[data-cond-painel]").forEach((el) => (el.innerHTML = painelCond()));
