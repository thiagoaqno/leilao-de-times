// Corrida da Galera — rede: entrar/criar sala, o estado que vem do servidor e os fantasmas dos outros pilotos.
import { E, socket, $, store, relogio, sNow, toast, act } from "./estado.js";
import { Sound } from "./sons.js";
import { show, renderLobby } from "./menus.js";
import { race, startRace, stopRace, nearest, prepararPista } from "./jogo.js";
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
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("bPronto").onclick = () => act("qpronto"); // classificação: terminei a minha volta
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/corrida/?sala=" + E.ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("corrida:" + code);
  if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
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
  relogio.doEstado(st.now);
  const old = E.S; E.S = st;
  if (st.phase === "lobby") { show("lobby"); renderLobby(); stopRace(); preparar(st.config.pista, st.config.hora); $("quali").classList.add("hidden"); return; }
  show("race");
  if (!race || race.startAt !== st.startAt) startRace(st);
  if (race) race.safety = st.direcao?.safety || null;
  if (old && old.phase === "race" && st.phase === "results") Sound.finish();
  checkMyLap(old);
  renderResults();
  renderQuali();
});

// Os outros carros: o servidor manda a posição de todos 20 vezes por segundo (`snap`, e `ghost`/`ghosts` nas salas sem as
// regras de F1) com a hora dele. Cada carro guarda as últimas amostras e é desenhado ATRASO ms no passado, interpolando entre
// duas delas: um pacote atrasado ou perdido não faz o carro andar para trás (nem tremer), e o atraso fixo cobre a oscilação
// da rede. Se faltar amostra nova, o carro segue na direção em que ia por no máximo 0,2 s e depois fica parado onde estava.
const ATRASO = window.Sim.ATRASO; // (as contas ficam em sim.js: amostraEm)
socket.on("ghosts", (lista) => { if (Array.isArray(lista)) lista.forEach(receberFantasma); }); // os robôs, todos juntos
socket.on("ghost", receberFantasma);
socket.on("snap", (d) => { // [id, x, y, z, a, v, prog] de todos os carros
  if (!d || !Array.isArray(d.c) || !race) return;
  const eu = E.ME && E.ME.id;
  for (const r of d.c) if (r[0] !== eu) receberFantasma({ id: r[0], x: r[1], y: r[2], z: r[3], a: r[4], v: r[5], prog: r[6], t: d.t });
});
socket.on("ack", reconciliar); // o estado verdadeiro do meu carro (fisica.js)
socket.on("connect", reenviarEntradas);
function receberFantasma(d) {
  if (!race) return;
  let gh = race.ghosts.get(d.id);
  const t = d.t || sNow(), amostra = { t, x: d.x, y: d.y, z: d.z || 0, a: d.a, v: d.v || 0 };
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
const ALVO = {};
export function updateGhosts(dt) {
  const k = 1 - Math.exp(-dt * 30), rt = sNow() - ATRASO; // (um leve alisamento tira só o tremido que sobrar)
  for (const gh of race.ghosts.values()) {
    if (!gh.buf.length) continue;
    const t = window.Sim.amostraEm(gh.buf, rt, ALVO);
    gh.x += (t.x - gh.x) * k; gh.y += (t.y - gh.y) * k; gh.z += (t.z - gh.z) * k; gh.v = t.v;
    let da = t.a - gh.a; da = Math.atan2(Math.sin(da), Math.cos(da)); gh.a += da * k;
    gh.idx = nearest(race.tr, gh.x, gh.y, gh.idx || 0);
  }
}
