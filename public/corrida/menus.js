// Corrida da Galera — telas fora da corrida: sala de espera, garagem e "como jogar".
import { E, PISTAS, CARROS, sample, carOf, COLORS, PAWNS, $, h, me, act, fmt, store } from "./estado.js";
import { THEMES } from "./pista.js";
import { MODS3, MODS_PADRAO, carPreview } from "./carros.js";
import { loadBest } from "./fantasma.js";
import { f1Pronto } from "./f1.js";
f1Pronto.then(() => { if (E.S && E.S.phase === "lobby") renderLobby(); }); // refaz as fotos dos carros com o modelo 3D

export function show(id) {
  for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id);
  $("race").classList.toggle("hidden", id !== "race");
  $("bar").classList.toggle("hidden", id === "race");
}

// ---------- sala de espera: o "box", em blocos coloridos ----------
// Em cima, o carro e o piloto; embaixo, as abas e os blocos: Garagem, Mapa das pistas, Largar, Regras, Piloto e quem
// está na sala. Cada bloco abre o seu painel (as abas e o Esc também). O organizador escolhe pista e regras; todo mundo
// escolhe carro, cor e piloto.
let aba = "box";
const ABAS = { box: "Box", pista: "Pistas", garagem: "Garagem", pintura: "Pintura", regras: "Regras" };
const NIVEL = { facil: "fácil", medio: "médio", dificil: "difícil" };
function abrir(qual) {
  aba = ABAS[qual] ? qual : "box";
  $("hub").classList.toggle("hidden", aba !== "box");
  document.querySelectorAll("[data-painel]").forEach((p) => p.classList.toggle("hidden", p.dataset.painel !== aba));
  document.querySelectorAll("#hubAbas [data-aba]").forEach((b) => b.classList.toggle("on", b.dataset.aba === aba));
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b && !b.disabled && $("lobby").contains(b)) abrir(b.dataset.aba); });
document.addEventListener("keydown", (e) => {
  if ($("lobby").classList.contains("hidden") || e.target.tagName === "INPUT") return;
  if (e.key === "Escape" && aba !== "box") { abrir("box"); e.preventDefault(); }
  const ks = Object.keys(ABAS), i = ks.indexOf(aba);
  if (e.key === "q" || e.key === "Q") abrir(ks[(i - 1 + ks.length) % ks.length]);
  if (e.key === "e" || e.key === "E") abrir(ks[(i + 1) % ks.length]);
});
$("hubAnt").onclick = () => { const ks = Object.keys(ABAS); abrir(ks[(ks.indexOf(aba) - 1 + ks.length) % ks.length]); };
$("hubProx").onclick = () => { const ks = Object.keys(ABAS); abrir(ks[(ks.indexOf(aba) + 1) % ks.length]); };

export function renderLobby() {
  const m = me(), isHost = m && E.S.host === m.id, c = E.S.config, t = PISTAS[c.pista], dis = isHost ? "" : "disabled";
  const robos = Math.min(c.robos || 0, 8 - E.S.players.length);
  // cabeçalho: o carro (foto 3D) e o piloto
  if (m) { const k = carOf(m); $("hubCarNome").textContent = k.name; $("hubClasse").textContent = k.inspo || ""; carPreview($("hubCarro"), m.color, m.car, m.mods); }
  else { $("hubCarNome").textContent = "Assistindo"; $("hubClasse").textContent = "você entrou só para ver"; }
  $("hubPawn").textContent = m ? m.pawn : "👀"; $("hubNome").textContent = m ? m.name : "Torcida"; $("hubSala").textContent = `Sala ${E.S.code} · ${E.S.players.length + robos} no grid`;
  document.querySelectorAll('#hubAbas [data-aba="garagem"], #hubAbas [data-aba="pintura"], .tile[data-aba="garagem"], .tile[data-aba="pintura"]').forEach((b) => (b.disabled = !m));
  // os blocos
  const pint = (m && MODS3.pintura[(m.mods || MODS_PADRAO).pintura]) || MODS3.pintura.propria;
  if (m) { carPreview($("tileCarro"), m.color, m.car, m.mods); $("tileCarroTxt").textContent = carOf(m).name; }
  drawPreview($("tileMapa"), c.pista);
  $("tileMapaTxt").textContent = t.name; $("tileMapaSub").textContent = t.sub;
  $("tileRegrasTxt").innerHTML = `${c.voltas} volta${c.voltas > 1 ? "s" : ""} · ${c.hora === "noite" ? "noite" : "dia"} · câmbio ${c.cambio === "manual" ? "manual" : "automático"}<br>${c.caixas ? "caixas ligadas" : "sem caixas"}<br>${robos ? `${robos} robô${robos > 1 ? "s" : ""} (${NIVEL[c.nivel] || "médio"})` : "sem robôs"}`;
  $("tilePilotoTxt").innerHTML = m ? `<span class="faixas"><i style="background:${pint.c || m.color}"></i><i style="background:${pint.c2}"></i></span>${h(pint.name)}` : "";
  $("tLargarTit").textContent = isHost ? "Largar" : "No grid";
  $("tLargarTxt").textContent = isHost ? `${t.name} · ${c.voltas} volta${c.voltas > 1 ? "s" : ""}` : "Esperando o organizador dar a largada";
  $("btnStart").disabled = !isHost;
  $("btnStart").onclick = () => isHost && act("start");
  $("pilots").innerHTML = E.S.players.map((p) => `<div class="pilot" style="--c:${p.color}"><div class="av">${p.pawn}</div><div class="grow"><b>${h(p.name)}</b><small><span class="dot ${p.online ? "" : "off"}"></span>${h(carOf(p).name)}${p.id === E.S.host ? " · organizador" : ""}${m && p.id === m.id ? " · você" : ""}</small></div>${isHost && p.id !== m.id ? `<button class="small ghost" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`).join("")
    + (robos ? `<div class="pilot" style="--c:#9aa1ad"><div class="av">🤖</div><div class="grow"><b>${robos} robô${robos > 1 ? "s" : ""}</b><small>nível ${NIVEL[c.nivel] || "médio"} · entram na largada</small></div></div>` : "")
    + (E.S.players.length < 8 ? `<p class="hint">Mande o código para a galera. Dá para correr sozinho, contra o relógio ou contra robôs.</p>` : "");
  $("pilots").querySelectorAll("[data-kick]").forEach((b) => (b.onclick = () => act("kick", { id: b.dataset.kick })));
  // painel das pistas
  $("cfgPistas").innerHTML = `<div class="tracks">${Object.entries(PISTAS).map(([id, p]) => `<button class="track ${c.pista === id ? "on" : ""}" data-pista="${id}" ${dis}><canvas data-prev="${id}" width="160" height="160"></canvas><b>${p.name}</b><small>${h(p.sub)}</small>${loadBest(id) ? `<small class="rec">🏆 seu recorde: ${fmt(loadBest(id).t)}</small>` : ""}</button>`).join("")}</div>${isHost ? "" : `<p class="hint">Só o organizador escolhe a pista.</p>`}`;
  $("cfgPistas").querySelectorAll("[data-prev]").forEach((cv) => drawPreview(cv, cv.dataset.prev));
  $("cfgPistas").querySelectorAll("[data-pista]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, pista: b.dataset.pista } })));
  // painel das regras
  $("cfg").innerHTML = `<div class="field"><label>Horário da pista</label><div class="seg"><button data-hora="dia" class="${c.hora !== "noite" ? "on" : ""}" ${dis}>☀️ Dia</button><button data-hora="noite" class="${c.hora === "noite" ? "on" : ""}" ${dis}>🌙 Noite</button></div><small>Disponível em todas as pistas.</small></div><div class="field"><label>Voltas</label><div class="seg">${[1, 2, 3, 5].map((v) => `<button data-v="${v}" class="${c.voltas === v ? "on" : ""}" ${dis}>${v}</button>`).join("")}</div></div>
    <div class="field"><label>Câmbio</label><div class="seg">${[["auto", "Automático"], ["manual", "Manual"]].map(([v, l]) => `<button data-cambio="${v}" class="${(c.cambio || "auto") === v ? "on" : ""}" ${dis}>${l}</button>`).join("")}</div><small>Manual para todo mundo: Shift sobe a marcha, Ctrl direito reduz (no celular, os botões + e −). Os robôs continuam no automático.</small></div>
    <div class="field"><label>Caixas de itens</label><div class="seg"><button data-opt="caixas" class="${c.caixas ? "on" : ""}" ${dis}>${c.caixas ? "🎁 Ligadas" : "Desligadas"}</button></div><small>Banana, cascos, cogumelo, estrela e bomba espalhados pela pista.</small></div>
    <div class="field"><label>Robôs</label><div class="seg">${[0, 1, 3, 5, 7].map((v) => `<button data-robos="${v}" class="${(c.robos || 0) === v ? "on" : ""}" ${dis}>${v ? v : "Sem"}</button>`).join("")}</div>
      ${c.robos ? `<div class="seg" style="margin-top:6px">${[["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]].map(([v, l]) => `<button data-nivel="${v}" class="${(c.nivel || "medio") === v ? "on" : ""}" ${dis}>${l}</button>`).join("")}</div>` : ""}<small>Pilotos do computador entram no grid (até completar 8 carros), seguem o traçado de corrida, pegam caixas e usam itens.</small></div>
    <div class="field"><label>Equilíbrio</label><div class="seg"><button data-opt="equilibrio" class="${c.equilibrio !== false ? "on" : ""}" ${dis}>${c.equilibrio !== false ? "Ligado" : "Desligado"}</button></div><small>Pequena ajuda de velocidade para quem ficou longe do pelotão.</small></div>${isHost ? "" : `<p class="hint">Só o organizador muda as regras.</p>`}`;
  $("cfg").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, voltas: +b.dataset.v } })));
  $("cfg").querySelectorAll("[data-hora]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, hora: b.dataset.hora } })));
  $("cfg").querySelectorAll("[data-cambio]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, cambio: b.dataset.cambio } })));
  $("cfg").querySelectorAll("[data-robos]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, robos: +b.dataset.robos } })));
  $("cfg").querySelectorAll("[data-nivel]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, nivel: b.dataset.nivel } })));
  $("cfg").querySelectorAll("[data-opt]").forEach((b) => (b.onclick = () => act("config", { config: { ...E.S.config, [b.dataset.opt]: !E.S.config[b.dataset.opt] } })));
  // painéis da garagem e do piloto (só de quem corre)
  if (m) {
    $("colorPick").innerHTML = COLORS.map((col) => { const taken = E.S.players.some((p) => p.color === col && p.id !== m.id); return `<button class="${col === m.color ? "on" : ""} ${taken ? "taken" : ""}" data-c="${col}" ${taken ? "disabled" : ""} style="background:${col}" aria-label="Cor ${col}"></button>`; }).join("");
    $("colorPick").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => act("color", { color: b.dataset.c })));
    $("carPick").innerHTML = Object.entries(CARROS).map(([id, k]) => `<button class="car ${m.car === id ? "on" : ""}" data-car="${id}" aria-pressed="${m.car === id}"><canvas data-carprev="${id}" width="240" height="135"></canvas><b>${h(k.name)}</b><small class="inspo">${h(k.inspo || "")}</small><p>${h(k.desc)}</p>
      <div class="spec">${specRows(k).map(([lbl, n]) => `<span>${lbl}</span>${leds(n)}`).join("")}</div></button>`).join("");
    $("carPick").querySelectorAll("[data-carprev]").forEach((cv) => carPreview(cv, m.color, cv.dataset.carprev, m.mods));
    $("carPick").querySelectorAll("[data-car]").forEach((b) => (b.onclick = () => act("car", { car: b.dataset.car })));
    // as pinturas: cada uma com a foto do carro pintado e as duas cores
    const atual = (m.mods || MODS_PADRAO).pintura || "propria";
    $("modPick").innerHTML = Object.entries(MODS3.pintura).map(([id, p]) => `<button class="pint ${atual === id ? "on" : ""}" data-pintura="${id}" aria-pressed="${atual === id}"><canvas data-pintprev="${id}" width="240" height="135"></canvas><span class="faixas"><i style="background:${p.c || m.color}"></i><i style="background:${p.c2}"></i></span><b>${h(p.name)}</b></button>`).join("");
    $("modPick").querySelectorAll("[data-pintprev]").forEach((cv) => carPreview(cv, m.color, m.car, { pintura: cv.dataset.pintprev }));
    $("modPick").querySelectorAll("[data-pintura]").forEach((b) => (b.onclick = () => act("mods", { mods: { pintura: b.dataset.pintura } })));
    $("pawnPick").innerHTML = PAWNS.map((pw) => { const taken = E.S.players.some((p) => p.pawn === pw && p.id !== m.id); return `<button class="${pw === m.pawn ? "on" : ""} ${taken ? "taken" : ""}" data-p="${pw}" ${taken ? "disabled" : ""}>${pw}</button>`; }).join("");
    $("pawnPick").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => act("pawn", { pawn: b.dataset.p })));
  } else if (aba === "garagem" || aba === "piloto") abrir("box");
}
// ficha do carro (de 1 a 10 LEDs): velocidade final, aceleração, aderência na curva e resistência (muro e grama)
const lerp10 = (v, a, b) => Math.max(1, Math.min(10, Math.round(1 + ((v - a) / (b - a)) * 9)));
const specRows = (k) => [["Velocidade", lerp10(k.vmax, 245, 355)], ["Aceleração", lerp10(k.acc, 52, 115)], ["Aderência", lerp10(k.grip, 350, 570)], ["Resistência", lerp10(k.wall * 100 + k.offMax * 0.4, 85, 150)]];
const leds = (n) => `<span class="leds" role="img" aria-label="${n} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? (i < 6 ? "g" : i < 8 ? "y" : "r") : ""}"></i>`).join("")}</span>`;
// traçado em miniatura (cartões da sala e minimapa)
export function drawPreview(cv, id) {
  const t = PISTAS[id], c = cv.getContext("2d"), s = cv.width / t.world, th = THEMES[id];
  c.fillStyle = th.preview; c.fillRect(0, 0, cv.width, cv.height);
  const pts = window.Pistas.pontos(t, 12); // começa na largada (o quadradinho xadrez)
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
  <li><b>Teclado:</b> ↑ ou W acelera, ↓ ou S freia (e dá ré), ← → ou A D viram. Espaço ou E usa o item; freio + Espaço joga para trás. R volta para a pista. C troca a câmera (perto, primeira pessoa, longe e de cima).</li>
  <li><b>Controle (Xbox/PlayStation):</b> RT (ou A) acelera, LT (ou B) freia e dá ré, analógico esquerdo vira, RB usa o item, Y troca a câmera e Select (ou LB) volta para a pista.</li>
  <li><b>Celular:</b> ◀ ▶ à esquerda viram; ▲ acelera e ▼ freia à direita. Toque no botão 🎁 para usar o item.</li>
  <li><b>Câmbio manual</b> (se o organizador ligar nas Regras): Shift sobe a marcha e Ctrl direito reduz; no controle, X sobe e B reduz. As luzes em cima do velocímetro acendem perto do corte: troque quando ficarem azuis.</li>
  <li><b>↺ Pista:</b> se rodar, ficar preso ou entrar na contramão, volta para o meio da pista.</li></ul>
  <h3>A corrida</h3><ul>
  <li>Largada igual para todo mundo: 3, 2, 1… vai! Ganha quem completar as voltas primeiro.</li>
  <li>Os carros <b>batem de verdade</b>: quem encosta empurra e é empurrado. O tanque é pesado e leva os outros embora; a formiga é leve e sai rodando. Num viaduto ou no ar, um passa por cima do outro.</li>
  <li><b>Vácuo:</b> logo atrás de outro carro, na mesma linha, o seu anda mais (a barra de vácuo aparece embaixo). Ficou mais de 1 segundo no vácuo e saiu de trás para ultrapassar? Ganha o <b>estilingue</b>, um empurrão curto.</li>
  <li><b>Caixas opcionais:</b> bananas, cascos verde e vermelho, cogumelo, estrela e bomba da Batalha. O organizador liga as caixas na sala.</li>
  <li><b>Equilíbrio:</b> quem estiver muito atrás recebe um pequeno ganho de aceleração e velocidade. A ajuda diminui perto da chegada.</li>
  <li><b>Fantasma do recorde:</b> a sua volta mais rápida em cada pista fica salva neste aparelho. Nas próximas corridas, um carro dourado refaz essa volta com você, e o placar mostra quantos segundos você está na frente (verde) ou atrás (vermelho).</li>
  <li><b>Relevo:</b> subida freia, descida embala, e numa lombada rápida o carro voa. No ar ele não acelera nem vira direito, então chegue alinhado.</li>
  <li><b>Freie antes da curva.</b> O pneu só segura até certo ponto: entrou rápido demais, o carro escorrega para fora (sai fumaça e o pneu canta) e perde velocidade. Fora do asfalto ele fica lento; em Mônaco e em Tóquio tem muro.</li>
  <li>A volta só conta passando pela pista inteira, na ordem. Atalho e contramão não valem.</li>
  <li>Quando o primeiro cruza a chegada, os outros têm 45 segundos para terminar.</li></ul>
  <h3>Carros</h3><ul>${Object.values(CARROS).map((k) => `<li><b>${h(k.name)}:</b> ${h(k.desc)}</li>`).join("")}</ul>
  <h3>Pistas</h3><ul>
  <li><b>Mônaco:</b> estreita, com guard-rail colado, a subida da Beau Rivage até o Cassino, a descida até o grampo e o porto cheio de iates.</li>
  <li><b>Interlagos:</b> larga e rápida: a descida do S do Senna, a lombada da Reta Oposta (dá para voar!), o Mergulho e a subida dos boxes.</li>
  <li><b>Barcelona:</b> autódromo largo de verdade: a reta dos boxes, a curva 3 longa, a subida até a Campsa cega no alto, a La Caixa e as curvas finais, com brita do lado de fora.</li>
  <li><b>Tóquio:</b> de noite, entre os prédios de neon, com dois viadutos, uma rampa de pulo e o Fuji no horizonte.</li></ul>
  <p>Rio de Janeiro, Serra Verde e Deserto Dourado oferecem voltas mais longas. Os balizadores das curvas cedem ao toque.</p>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });
