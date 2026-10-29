// Corrida da Galera — rede: entrar/criar sala, o estado que vem do servidor e os fantasmas dos outros pilotos.
import { E, socket, $, store, relogio, sNow, toast, act } from "./estado.js";
import { Sound } from "./sons.js";
import { show, renderLobby } from "./menus.js";
import { race, startRace, stopRace, nearest, prepararPista, adiantarLargada } from "./jogo.js";
import { checkMyLap, renderResults, renderQuali } from "./hud.js";
import { onBox, onUse, onHit, onBoom, setHazards } from "./itens.js";
import { reconciliar, reenviarEntradas, tempoMeu } from "./fisica.js";

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
  relogio.doEstado(st.now);
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

// Os outros carros. O servidor manda a posição de todos 20 vezes por segundo (`snap`, e `ghost`/`ghosts` nas salas sem as regras de
// F1) com a hora dele. Nas regras de F1 cada amostra traz também a velocidade (vx, vy), a guinada (r) e a IDADE da pose (há quantos
// ms, no relógio do servidor, o carro estava assim): a amostra vai para a hora certa e o carro é levado dali até a HORA DO MEU CARRO
// (fisica.js, tempoMeu: o servidor mais o quanto o meu relógio de passos está à frente dele) pela velocidade e pela guinada, por no
// máximo EXTRAPOLA_MAX s. Assim eu vejo os outros onde eles estão na hora em que o meu carro está, em vez de uns 200 ms atrás
// (130 ms de interpolação + a viagem dos pacotes), e o outro piloto me vê do mesmo jeito: os dois enxergam a mesma ordem, e a
// batida (fisica.js) acontece onde os dois veem os carros. Um pacote novo corrige a previsão: a diferença vira um desvio
// (ox, oy, oa) que se apaga em ~0,12 s, em vez de o carro pular. Nas outras salas, o desenho de antes: interpolado ATRASO ms atrás.
const ATRASO = window.Sim.ATRASO; // (as contas ficam em sim.js: amostraEm, extrapolar)
const TEMPO_DO_DESVIO = 0.12, DESVIO_MAX = 90;
socket.on("ghosts", (lista) => { if (Array.isArray(lista)) lista.forEach(receberFantasma); }); // os robôs, todos juntos
socket.on("ghost", receberFantasma);
socket.on("snap", (d) => { // [id, x, y, z, a, v, prog, idade, vx, vy, r] de todos os carros
  if (!d || !Array.isArray(d.c) || !race) return;
  const eu = E.ME && E.ME.id;
  for (const r of d.c) {
    if (r[0] === eu) { race.progServidor = r[6]; continue; } // (o meu progresso oficial é o do servidor: a torre usa o mesmo número para todos)
    receberFantasma({ id: r[0], x: r[1], y: r[2], z: r[3], a: r[4], v: r[5], prog: r[6], t: d.t, idade: r[7], vx: r[8], vy: r[9], r: r[10] });
  }
});
socket.on("ack", reconciliar); // o estado verdadeiro do meu carro (fisica.js)
socket.on("connect", reenviarEntradas);
const ALVO = {}, ANTES = {};
function receberFantasma(d) {
  if (!race) return;
  let gh = race.ghosts.get(d.id);
  const nova = d.vx !== undefined, t = (d.t || sNow()) - (d.idade || 0), amostra = { t, x: d.x, y: d.y, z: d.z || 0, a: d.a, v: d.v || 0 };
  if (nova) { amostra.vx = d.vx; amostra.vy = d.vy; amostra.r = d.r || 0; }
  if (!gh) { gh = { x: d.x, y: d.y, z: d.z || 0, a: d.a, v: d.v || 0, prog: d.prog, idx: nearest(race.tr, d.x, d.y, 0), buf: [], ox: 0, oy: 0, oa: 0 }; race.ghosts.set(d.id, gh); }
  const b = gh.buf, ult = b[b.length - 1];
  if (ult && t <= ult.t) return; // fora de ordem ou repetida
  if (nova && ult && ult.vx !== undefined) window.Sim.extrapolar(ult, tempoMeu(), ANTES); else ANTES.x = undefined;
  b.push(amostra); if (b.length > 20) b.shift();
  if (ANTES.x !== undefined) { // o pacote novo corrige a previsão: o que mudou vira desvio, que se apaga sozinho
    const dep = window.Sim.extrapolar(amostra, tempoMeu(), ALVO); let da = ANTES.a - dep.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    gh.ox += ANTES.x - dep.x; gh.oy += ANTES.y - dep.y; gh.oa += da;
    if (Math.hypot(gh.ox, gh.oy) > DESVIO_MAX) gh.ox = gh.oy = gh.oa = 0;
  }
  gh.prog = d.prog;
}
socket.on("item:box", onBox);
socket.on("item:use", (e) => onUse(e, race));
socket.on("item:hit", (e) => onHit(e, race));
socket.on("item:hazards", setHazards);
socket.on("item:boom", (e) => { Sound.crash(110); onBoom(e); });
// Põe os outros carros na pose do quadro. `dt` = 0: só recalcula a pose (a física lê antes de andar); `alpha`: onde o desenho do meu
// carro está entre o passo anterior e o atual (os outros ficam na mesma hora que ele).
export function updateGhosts(dt, alpha = 1) {
  const k = 1 - Math.exp(-dt * 30), rt = sNow() - ATRASO, Sm = window.Sim;
  const T = race.net || E.S?.config.regras === "f1" ? tempoMeu(alpha) : sNow(), f = dt > 0 ? Math.exp(-dt / TEMPO_DO_DESVIO) : 1;
  if (dt === 0 && race.net) race.ghTick = race.car.tick;
  for (const gh of race.ghosts.values()) {
    if (!gh.buf.length) continue;
    const ult = gh.buf[gh.buf.length - 1];
    if (ult.vx !== undefined) { // regras de F1: levado ao presente
      const t = Sm.extrapolar(ult, T, ALVO);
      gh.ox *= f; gh.oy *= f; gh.oa *= f;
      gh.x = t.x + gh.ox; gh.y = t.y + gh.oy; gh.z = t.z; gh.a = t.a + gh.oa; gh.v = t.v;
      gh.vx = t.vx; gh.vy = t.vy; gh.r = t.r;
    } else { // (as outras salas)
      const t = Sm.amostraEm(gh.buf, rt, ALVO);
      gh.x += (t.x - gh.x) * k; gh.y += (t.y - gh.y) * k; gh.z += (t.z - gh.z) * k; gh.v = t.v;
      let da = t.a - gh.a; da = Math.atan2(Math.sin(da), Math.cos(da)); gh.a += da * k;
    }
    gh.idx = nearest(race.tr, gh.x, gh.y, gh.idx || 0);
  }
}
