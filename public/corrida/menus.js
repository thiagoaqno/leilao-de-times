// Corrida da Galera — telas fora da corrida: sala de espera, garagem e "como jogar".
import { E, PISTAS, CARROS, sample, carOf, COLORS, PAWNS, $, h, me, act, fmt, store } from "./estado.js";
import { THEMES } from "./pista.js";
import { MODS3, MODS_PADRAO, carPreview } from "./carros.js";
import { loadBest } from "./fantasma.js";

export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
}

// ---------- sala de espera ----------
export function renderLobby() {
  const m = me(), isHost = m && E.S.host === m.id, c = E.S.config;
  $("pilots").innerHTML = E.S.players.map((p) => `<div class="pilot" style="--c:${p.color}"><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${h(carOf(p).name)}, ${p.id === E.S.host ? "organizador" : p.online ? "no box" : "desconectado"}${m && p.id === m.id ? " · você" : ""}</small></div>${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`).join("")
    + (E.S.players.length < 8 ? `<p class="hint">Dá para correr sozinho (contra o relógio) ou chamar até 8 pilotos.</p>` : "");
  $("pilots").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  $("myPick").classList.toggle("hidden", !m);
  if (m) {
    $("colorPick").innerHTML = COLORS.map((col) => { const taken = E.S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""} ${taken ? "taken" : ""}" data-c="${col}" ${taken ? "disabled" : ""} style="background:${col}" aria-label="Cor ${col}"></button>`; }).join("");
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("color", { color: b.dataset.c })));
    $("carPick").innerHTML = Object.entries(CARROS).map(([id, k]) => `<button class="car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><b>${h(k.name)}</b><small class="inspo">${h(k.inspo || "")}</small><p>${h(k.desc)}</p>
      <div class="spec">${specRows(k).map(([lbl, n]) => `<span>${lbl}</span>${leds(n)}`).join("")}</div></button>`).join("");
    $("carPick").querySelectorAll("[data-carprev]").forEach((c) => carPreview(c, m.color, c.dataset.carprev, m.mods, m.skin));
    // o piloto: as skins da Pelada (o jogo lembra a última escolhida)
    $("skinPick").innerHTML = Object.entries(window.Campo.SKINS).map(([id, s]) => `<button class="${id === (m.skin || "padrao") ? "on" : ""}" data-skin="${id}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
    $("skinPick").querySelectorAll("[data-skin]").forEach((b) => (b.onclick = () => { store.set("galera:skin", b.dataset.skin); act("skin", { skin: b.dataset.skin }); }));
    // personalização: rodas, aerofólio e faixas
    const mods = { ...MODS_PADRAO, ...(m.mods || {}) }, seg = (key, opts) => `<div class="modrow"><span>${{ rodas: "Rodas", aero: "Aerofólio", faixa: "Faixas" }[key]}</span><div class="seg">${Object.entries(opts).map(([v, o]) => `<button data-mod="${key}" data-v="${v}" class="${mods[key] === v ? "on" : ""}">${key === "rodas" ? `<i class="rim" style="background:${o.c}"></i>` : ""}${h(typeof o === "string" ? o : o.name)}</button>`).join("")}</div></div>`;
    $("modPick").innerHTML = seg("rodas", MODS3.rodas) + seg("aero", MODS3.aero) + seg("faixa", MODS3.faixa);
    $("modPick").querySelectorAll("[data-mod]").forEach((b) => (b.onclick = () => act("mods", { mods: { [b.dataset.mod]: b.dataset.v } })));
    $("carPick").querySelectorAll("[data-car]").forEach((b) => (b.onclick = () => act("car", { car: b.dataset.car })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = E.S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-p="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
  }
  const dis = isHost ? "" : "disabled";
  $("cfg").innerHTML = `<div class="tracks">${Object.entries(PISTAS).map(([id, t]) => `<button class="track ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis}><canvas data-prev="${id}" width="160" height="160"></canvas><b>${t.name}</b><small>${h(t.sub)}</small>${loadBest(id) ? `<small class="rec">🏆 seu recorde: ${fmt(loadBest(id).t)}</small>` : ""}</button>`).join("")}</div>
    <div class="field"><label>Voltas</label><div class="seg">${[1, 2, 3, 5].map((v) => `<button data-v="${v}" class="${c.voltas === v ? "on" : ""}" ${dis}>${v}</button>`).join("")}</div></div>`;
  $("cfg").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  $("cfg").querySelectorAll("[data-pista]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, pista: b.dataset.pista } })));
  $("cfg").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, voltas: +b.dataset.v } })));
  $("startBox").innerHTML = isHost
    ? `<button class="primary" id="btnStart" style="width:100%;font-size:19px">🏁 Largar</button><p class="hint">A largada é igual para todo mundo: 3, 2, 1… vai!</p>`
    : `<p class="muted" style="margin:0">Esperando o organizador dar a largada…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
// ficha do carro (de 1 a 10 LEDs): velocidade final, aceleração, aderência na curva e resistência (muro e grama)
const lerp10 = (v, a, b) => Math.max(1, Math.min(10, Math.round(1 + ((v - a) / (b - a)) * 9)));
const specRows = (k) => [["Velocidade", lerp10(k.vmax, 245, 355)], ["Aceleração", lerp10(k.acc, 52, 115)], ["Aderência", lerp10(k.grip, 350, 570)], ["Resistência", lerp10(k.wall * 100 + k.offMax * 0.4, 85, 150)]];
const leds = (n) => `<span class="leds" role="img" aria-label="${n} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? (i < 6 ? "g" : i < 8 ? "y" : "r") : ""}"></i>`).join("")}</span>`;
// traçado em miniatura (cartões da sala e minimapa)
export function drawPreview(cv, id) {
  const t = PISTAS[id], c = cv.getContext("2d"), s = cv.width / t.world, th = THEMES[id];
  c.fillStyle = th.preview; c.fillRect(0, 0, cv.width, cv.height);
  const pts = sample(t.points, 12);
  c.lineJoin = c.lineCap = "round";
  for (const [w, col] of [[t.width * 1.3, "#0006"], [t.width, "#d9dbe0"], [t.width * 0.6, "#3a3d46"]]) {
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x * s, p.y * s) : c.moveTo(p.x * s, p.y * s))); c.closePath(); c.lineWidth = Math.max(2, w * s); c.strokeStyle = col; c.stroke();
  }
  const a = pts[0]; c.fillStyle = "#fff"; c.fillRect(a.x * s - 4, a.y * s - 4, 8, 8); c.fillStyle = "#111"; c.fillRect(a.x * s - 4, a.y * s - 4, 4, 4); c.fillRect(a.x * s, a.y * s, 4, 4);
}

// ---------- como jogar ----------
$("btnRules").onclick = () => {
  $("modalBox").innerHTML = `<h2>Como jogar</h2>
  <h3>Controles</h3><ul>
  <li><b>Teclado:</b> ↑ ou W acelera, ↓ ou S freia (e dá ré), ← → ou A D viram. R volta para a pista. C troca a câmera (perto, primeira pessoa ou longe).</li>
  <li><b>Controle (Xbox/PlayStation):</b> RT (ou A) acelera, LT (ou B) freia e dá ré, o analógico esquerdo vira com a força exata, Y troca a câmera e Select (ou LB) volta para a pista.</li>
  <li><b>Celular:</b> ◀ ▶ à esquerda viram; ▲ acelera e ▼ freia à direita.</li>
  <li><b>↺ Pista:</b> se rodar, ficar preso ou entrar na contramão, volta para o meio da pista.</li></ul>
  <h3>A corrida</h3><ul>
  <li>Largada igual para todo mundo: 3, 2, 1… vai! Ganha quem completar as voltas primeiro.</li>
  <li>Os outros carros são <b>fantasmas</b>: dá para passar por dentro deles. Ninguém bate em ninguém, e internet lenta não atrapalha a sua corrida.</li>
  <li><b>Vácuo:</b> logo atrás de outro carro, na mesma linha, o seu anda mais (aparecem as linhas de vento). Ficou mais de 1 segundo no vácuo e saiu de trás para ultrapassar? Ganha o <b>estilingue</b>, um empurrão curto.</li>
  <li><b>Fantasma do recorde:</b> a sua volta mais rápida em cada pista fica salva neste aparelho. Nas próximas corridas, um carro dourado refaz essa volta com você, e o placar mostra quantos segundos você está na frente (verde) ou atrás (vermelho).</li>
  <li><b>Relevo:</b> subida freia, descida embala, e numa lombada rápida o carro voa. No ar ele não acelera nem vira direito, então chegue alinhado.</li>
  <li><b>Freie antes da curva.</b> O pneu só segura até certo ponto: entrou rápido demais, o carro escorrega para fora (sai fumaça e o pneu canta) e perde velocidade. Fora do asfalto ele fica lento; em Mônaco e em Tóquio tem muro.</li>
  <li>A volta só conta passando pela pista inteira, na ordem. Atalho e contramão não valem.</li>
  <li>Quando o primeiro cruza a chegada, os outros têm 45 segundos para terminar.</li></ul>
  <h3>Carros</h3><ul>${Object.values(CARROS).map((k) => `<li><b>${h(k.name)}:</b> ${h(k.desc)}</li>`).join("")}</ul>
  <h3>Pistas</h3><ul>
  <li><b>Mônaco:</b> estreita, com guard-rail colado, a subida da Beau Rivage até o Cassino, a descida até o grampo e o porto cheio de iates.</li>
  <li><b>Interlagos:</b> larga e rápida: a descida do S do Senna, a lombada da Reta Oposta (dá para voar!), o Mergulho e a subida dos boxes.</li>
  <li><b>Tóquio:</b> de noite, entre os prédios de neon, com dois viadutos, uma rampa de pulo e o Fuji no horizonte.</li></ul>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });
