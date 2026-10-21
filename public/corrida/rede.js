// Corrida da Galera — rede: entrar/criar sala, o estado que vem do servidor e os fantasmas dos outros pilotos.
import { E, socket, $, store, relogio, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { show, renderLobby } from "./menus.js";
import { race, startRace, stopRace, nearest, prepararPista } from "./jogo.js";
import { checkMyLap, renderResults } from "./hud.js";
import { onBox, onUse, onHit, onBoom, setHazards } from "./itens.js";

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
const preparar = (id) => { if (id && id !== preparada) { preparada = id; try { prepararPista(id); } catch (e) { console.warn("Corrida: pista não preparada", e); } } };
// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  relogio.doEstado(st.now);
  const old = E.S; E.S = st;
  if (st.phase === "lobby") { show("lobby"); renderLobby(); stopRace(); preparar(st.config.pista); return; }
  show("race");
  if (!race || race.startAt !== st.startAt) startRace(st);
  if (old && old.phase === "race" && st.phase === "results") Sound.finish();
  checkMyLap(old);
  renderResults();
});

// fantasmas: posição recebida, suavizada e empurrada um pouquinho pela velocidade
socket.on("ghosts", (lista) => { if (Array.isArray(lista)) lista.forEach(receberFantasma); }); // os robôs, todos juntos
socket.on("ghost", receberFantasma);
function receberFantasma(d) {
  if (!race) return;
  let gh = race.ghosts.get(d.id);
  if (!gh) { gh = { x: d.x, y: d.y, z: d.z || 0, a: d.a, idx: nearest(race.tr, d.x, d.y, 0) }; race.ghosts.set(d.id, gh); }
  Object.assign(gh, { tx: d.x, ty: d.y, tz: d.z || 0, ta: d.a, v: d.v, prog: d.prog, at: performance.now() });
}
socket.on("item:box", onBox);
socket.on("item:use", (e) => onUse(e, race));
socket.on("item:hit", (e) => onHit(e, race));
socket.on("item:hazards", setHazards);
socket.on("item:boom", (e) => { Sound.crash(110); onBoom(e); });
export function updateGhosts(dt) {
  const k = 1 - Math.exp(-dt * 10);
  for (const gh of race.ghosts.values()) {
    const ahead = Math.min(0.25, (performance.now() - gh.at) / 1000), tx = gh.tx + Math.cos(gh.ta) * gh.v * ahead, ty = gh.ty + Math.sin(gh.ta) * gh.v * ahead;
    gh.x += (tx - gh.x) * k; gh.y += (ty - gh.y) * k; gh.z += (gh.tz - gh.z) * k;
    let da = gh.ta - gh.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; gh.a += da * k;
    gh.idx = nearest(race.tr, gh.x, gh.y, gh.idx || 0);
  }
}
