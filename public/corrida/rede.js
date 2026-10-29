// Corrida da Galera — rede: entrar/criar sala, o estado que vem do servidor e os fantasmas dos outros pilotos.
import { E, socket, $, store, relogio, relogioF1, sNow, tempoReal, agoraLocal, toast, act } from "./estado.js";
import { Sound } from "./sons.js";
import { show, renderLobby } from "./menus.js";
import { race, startRace, stopRace, nearest, prepararPista, adiantarLargada } from "./jogo.js";
import { checkMyLap, renderResults, renderQuali } from "./hud.js";
import { onBox, onUse, onHit, onBoom, setHazards } from "./itens.js";
import { reconciliar, reenviarEntradas } from "./fisica.js";

// ---------- entrar / criar ----------
const urlCode = new URLSearchParams(location.search).get("sala");
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  E.ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("corrida:" + r.code, E.ME);
  history.replaceState(null, "", "/corrida/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code; document.body.classList.add("inroom");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin") }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("corrida:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true, token: (store.get("corrida:" + code) || {}).token }, enter); }; // (na temporada em grupo, quem só assiste entra com o acesso que a sede guardou)
$("bPronto").onclick = () => act("qpronto"); // classificação: terminei a minha volta
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/corrida/?sala=" + E.ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("corrida:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (saved && saved.token) socket.emit("join", { code, watch: true, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (E.ME) socket.emit("join", { code: E.ME.code, watch: !E.ME.id, id: E.ME.id, token: E.ME.token }, () => {});
  else show("home");
}
socket.on("connect", autoJoin);
socket.on("kicked", () => { toast("O organizador tirou você da sala."); E.ME = null; E.S = null; history.replaceState(null, "", "/corrida/"); document.body.classList.remove("inroom"); $("roomTag").classList.add("hidden"); show("home"); });
// alguém da sala entrou no quadro de recordes da pista (os 5 melhores para sempre, que aparecem na Vila)
socket.on("recorde", (r) => {
  if (!r || !r.piloto) return;
  const eu = E.ME && E.S && E.S.players.find((p) => p.id === E.ME.id), meu = eu && eu.name === r.piloto;
  toast(r.pos === 1 ? `${meu ? "Você bateu" : `${r.piloto} bateu`} o recorde da pista: ${r.tempo.toFixed(3)} s!` : `${meu ? "Você entrou" : `${r.piloto} entrou`} no quadro de recordes: ${r.pos}º, ${r.tempo.toFixed(3)} s.`, 4000);
});
// a pista escolhida no lobby já vai sendo montada, com a foto do céu, para a largada não travar (jogo.js, prepararPista)
let preparada = null;
const preparar = (id, hora) => { const chave = `${id}:${hora}`; if (id && chave !== preparada) { preparada = chave; try { prepararPista(id, hora); } catch (e) { console.warn("Corrida: pista não preparada", e); } } };
// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  relogio.doEstado(st.now); relogioF1.palpite(st.now - agoraLocal()); // (o relógio do estado só serve até as respostas do NTP chegarem)
  const old = E.S; E.S = st;
  if (st.phase === "lobby") { show("lobby"); renderLobby(); stopRace(); preparar(st.config.pista, st.config.hora); $("quali").classList.add("hidden"); return; }
  show("race");
  if (!race || (race.startAt !== st.startAt && !adiantarLargada(st))) startRace(st);
  if (race) race.safety = st.direcao?.safety || null;
  if (old && old.phase === "race" && st.phase === "results") Sound.finish();
  checkMyLap(old);
  renderResults();
  renderQuali();
});

// Os outros carros. Nas regras de F1 o servidor manda a posição dos carros em pacotes BINÁRIOS (`snap`, pose.js): 33 por segundo para quem
// está perto de mim, menos para quem está longe. Cada amostra traz a hora do servidor em que a pose foi verdadeira (a hora do pacote menos
// a idade), a velocidade (vx, vy) e a guinada (r). Cada carro é um `Outro` (pose.js): extrapola do jeito certo (arco, com a aceleração)
// até a HORA DO MEU DESENHO — o relógio do servidor, que o navegador acerta por NTP (sincronizarRelogio) — e a correção que um pacote
// novo traz se apaga sem salto (posição, velocidade e aceleração contínuas). `updateGhosts` (o desenho) e a previsão de batida
// (fisica.js, outrosDoPasso) chamam a MESMA conta, `gh.mod.pose(T)`; o servidor olha o outro carro nessa mesma hora real.
// Nas outras salas, o desenho de antes: interpolado ATRASO ms atrás (eventos `ghost`/`ghosts`).
const ATRASO = window.Sim.ATRASO; // (as contas ficam em sim.js: amostraEm)
const Pose = window.Pose, PASSO_MS = 1000 / 120;
socket.on("ghosts", (lista) => { if (Array.isArray(lista)) lista.forEach(receberFantasma); }); // os robôs, todos juntos (fora das regras de F1)
socket.on("ghost", receberFantasma);
socket.on("snap", (buf) => { // pacote binário: { t, c: [[id, x, y, z, a, v, prog, idade, vx, vy, r], ...] }
  if (!buf || !race) return;
  let d; try { d = Pose.Snap.decodificar(buf); } catch { return; }
  const eu = E.ME && E.ME.id, Tc = tempoReal() - PASSO_MS; // (Tc: a hora do servidor em que o desenho está agora)
  for (const r of d.c) {
    if (r[0] === eu) { race.progServidor = r[6]; continue; } // (o meu progresso oficial é o do servidor: a torre usa o mesmo número para todos)
    let gh = race.ghosts.get(r[0]);
    if (!gh) { gh = { x: r[1], y: r[2], z: r[3], a: r[4], v: r[5], prog: r[6], idx: nearest(race.tr, r[1], r[2], 0), buf: [], mod: new Pose.Outro() }; race.ghosts.set(r[0], gh); }
    if (!gh.mod) continue;
    gh.mod.receber({ t: d.t - r[7], x: r[1], y: r[2], z: r[3], a: r[4], vx: r[8], vy: r[9], r: r[10] }, Tc);
    gh.prog = r[6];
  }
});
socket.on("ack", reconciliar); // o estado verdadeiro do meu carro (fisica.js)
socket.on("connect", reenviarEntradas);
// O relógio: pergunta a hora do servidor (seis vezes na primeira meia segunda, depois a cada 2 s) e fica com as respostas de menor ida e volta.
// Sem isso o offset seria o do `now` de cada estado, atrasado pela viagem do pacote e diferente de um estado para o outro.
let pingTimer = 0, pings = 0;
function sincronizarRelogio() {
  clearTimeout(pingTimer); pings = 0;
  const tic = () => {
    if (socket.connected) { const t0 = agoraLocal(); socket.emit("clock", (ts) => relogioF1.amostrar(t0, ts, agoraLocal())); }
    pingTimer = setTimeout(tic, ++pings < 8 ? 120 : 2000);
  };
  tic();
}
socket.on("connect", sincronizarRelogio);
if (socket.connected) sincronizarRelogio();
const ALVO = {}, ANTES = {};
function receberFantasma(d) { // (as outras salas: interpolação com atraso fixo)
  if (!race) return;
  let gh = race.ghosts.get(d.id);
  const t = (d.t || sNow()) - (d.idade || 0), amostra = { t, x: d.x, y: d.y, z: d.z || 0, a: d.a, v: d.v || 0 };
  if (!gh) { gh = { x: d.x, y: d.y, z: d.z || 0, a: d.a, v: d.v || 0, prog: d.prog, idx: nearest(race.tr, d.x, d.y, 0), buf: [] }; race.ghosts.set(d.id, gh); }
  const b = gh.buf, ult = b[b.length - 1];
  if (ult && t <= ult.t) return; // fora de ordem ou repetida
  b.push(amostra); if (b.length > 20) b.shift();
  gh.prog = d.prog;
}
socket.on("item:box", onBox);
socket.on("item:use", (e) => onUse(e, race));
socket.on("item:hit", (e) => onHit(e, race));
socket.on("item:hazards", setHazards);
socket.on("item:boom", (e) => { Sound.crash(110); onBoom(e); });
// Põe os outros carros na pose do quadro: a MESMA hora do meu carro desenhado (agora menos um passo: o desenho do meu carro fica entre o passo
// anterior e o atual). `alpha` não é mais preciso (o relógio é contínuo).
const POSE = {};
export function updateGhosts(dt) {
  const k = 1 - Math.exp(-dt * 30), rt = sNow() - ATRASO, Sm = window.Sim, T = tempoReal() - PASSO_MS;
  for (const gh of race.ghosts.values()) {
    if (gh.mod) { // regras de F1
      if (!gh.mod.buf.length) continue;
      const p = gh.mod.pose(T, POSE);
      gh.x = p.x; gh.y = p.y; gh.z = p.z; gh.a = p.a; gh.vx = p.vx; gh.vy = p.vy; gh.r = p.r; gh.v = p.vx * Math.cos(p.a) + p.vy * Math.sin(p.a);
    } else { // (as outras salas)
      if (!gh.buf.length) continue;
      const t = Sm.amostraEm(gh.buf, rt, ALVO);
      gh.x += (t.x - gh.x) * k; gh.y += (t.y - gh.y) * k; gh.z += (t.z - gh.z) * k; gh.v = t.v;
      let da = t.a - gh.a; da = Math.atan2(Math.sin(da), Math.cos(da)); gh.a += da * k;
    }
    gh.idx = nearest(race.tr, gh.x, gh.y, gh.idx || 0);
  }
}
