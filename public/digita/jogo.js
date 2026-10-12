// Corrida de Digitação — o navegador: sala, contagem, a frase pintada letra por letra, a pista com os carros e o resultado.
// O servidor confere o que foi digitado; aqui só se mostra e se manda o texto (`digitou`) a cada tecla.
"use strict";
const { $, h, store } = Comum;
const toast = Comum.criarToast(3200), socket = io("/digita"), relogio = Comum.relogio();
const act = Comum.criarAct(socket, toast);
let S = null, ME = null, SNAP = null, rodadaVista = -1, acabei = false, ultimaChave = "";
const urlCode = new URLSearchParams(location.search).get("sala");
const seg = (s) => (s == null ? "—" : s.toFixed(2).replace(".", ",") + " s");
const CORES = ["#ff2d95", "#26d4ff", "#ffc83d", "#39e08a", "#b46bff", "#ff8a3d", "#5b8cff", "#ff5a5a"];

// ---------------- entrar / criar ----------------
function mostrar(qual) { for (const id of ["home", "jogo"]) $(id).classList.toggle("hidden", id !== qual); }
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function entrou(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("digita:" + r.code, ME);
  history.replaceState(null, "", "/digita/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
  mostrar("jogo");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name }, entrou); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const salvo = store.get("digita:" + code) || {};
  socket.emit("join", { code, name, id: salvo.id, token: salvo.token }, entrou);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, entrou); };
$("btnInvite").onclick = async () => { const link = location.origin + "/digita/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, salvo = code && store.get("digita:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (salvo && salvo.id) socket.emit("join", { code, id: salvo.id, token: salvo.token }, (r) => { if (r.ok) entrou(r); else { mostrar("home"); $("hErr").textContent = r.error; } });
  else mostrar("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); store.del("digita:" + ME.code); location.href = "/digita/"; });

// ---------------- estado ----------------
socket.on("state", (st) => {
  S = st; relogio.doEstado(st.now);
  if (st.phase === "run" && st.rodada !== rodadaVista) { rodadaVista = st.rodada; acabei = false; SNAP = null; }
  if (st.phase === "run") SNAP = { p: st.progresso.map((x) => [x.id, x.certos, x.fim]) };
  desenhar();
});
socket.on("snap", (d) => { SNAP = d; pintarPista(); });
setInterval(() => {
  const el = document.querySelector("[data-tempo]");
  if (el && S) el.textContent = S.deadline && S.phase === "result" ? Math.max(0, Math.ceil((S.deadline - relogio.agora()) / 1000)) + " s" : "";
  if (S && S.phase === "run") contagem();
}, 100);

const eu = () => S && ME && S.players.find((p) => p.id === ME.id);
const listaJogadores = () => S.players.map((p) => `<div class="pl"><i class="dot ${p.online ? "" : "off"}"></i><b class="${p.online ? "" : "off"}">${h(p.name)}${p.id === S.host ? " 👑" : ""}${ME && p.id === ME.id ? " (você)" : ""}</b>${S.phase !== "lobby" ? `<span class="preco">${p.pontos} pts</span>` : ""}</div>`).join("");

// ---------------- telas ----------------
function desenhar() {
  if (!S) return;
  const p = S.phase, me = eu();
  $("topo").innerHTML = p === "lobby" ? "" : `<span class="chip">Rodada ${S.rodada}/${S.config.rodadas}</span>${me ? `<span class="chip cash">${me.pontos} pts</span>` : ""}<span class="chip tempo" data-tempo></span>`;
  // na digitação a tela só é refeita quando muda de fase ou de rodada, para não perder o foco no campo
  const chave = p + ":" + S.rodada + ":" + (p === "lobby" || p === "final" || p === "result" ? S.players.length + JSON.stringify(S.config) + S.players.map((x) => x.online + "" + x.pontos).join() + S.host : "");
  if (chave === ultimaChave) { if (p === "run") pintarPista(); return; }
  ultimaChave = chave;
  $("tela").innerHTML = { lobby: telaLobby, run: telaCorrida, result: telaResultado, final: telaFinal }[p]();
  ligar();
  if (p === "run") { pintarPista(); contagem(); }
}
function telaLobby() {
  const host = ME && S.host === ME.id;
  return `<div class="grid2" style="margin-top:14px">
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:12px">Pilotos</h2>${listaJogadores()}
      ${host ? `<div style="margin-top:16px"><label>Rodadas</label><div class="seg">${[1, 3, 5].map((n) => `<button data-cfg="rodadas" data-v="${n}" class="${S.config.rodadas === n ? "on" : ""}">${n}</button>`).join("")}</div>
      <label style="margin-top:12px">Robôs completam a pista</label><div class="seg"><button data-cfg="bots" data-v="1" class="${S.config.bots ? "on" : ""}">Sim</button><button data-cfg="bots" data-v="0" class="${S.config.bots ? "" : "on"}">Não</button></div>
      <button class="primary" id="bStart" style="width:100%;margin-top:16px">Largar!</button></div>` : `<p class="muted" style="margin-top:14px">Esperando o organizador começar… (${S.config.rodadas} rodadas)</p>`}
    </div></div>
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:12px">Como funciona</h2><ul class="keys">
      <li>Depois da contagem 3-2-1, aparece uma frase igual para todo mundo. Digite tudo no campo, <b>certinho</b>: acento e maiúscula contam.</li>
      <li>Letra errada fica vermelha: apague e corrija. Colar não funciona.</li>
      <li>Seu carro anda a cada letra certa. Quem fechar a frase primeiro leva <b>10 pontos</b>, o segundo 7, depois 5, 3, 2 e 1.</li>
      <li>No fim das rodadas, quem tiver mais pontos leva a noite.</li></ul></div></div>
  </div>`;
}
function carroSvg(cor) { return `<svg viewBox="0 0 56 34"><path d="M2 24 L4 16 L16 14 L24 5 L40 5 L48 14 L54 17 L54 25 Z" fill="${cor}"/><path d="M19 14 L26 7 L38 7 L44 14 Z" fill="#0b1822"/><circle cx="14" cy="26" r="6" fill="#111" stroke="#bbb"/><circle cx="43" cy="26" r="6" fill="#111" stroke="#bbb"/></svg>`; }
function telaCorrida() {
  const me = eu();
  return `<div class="contagem" id="contagem"></div>
  <div class="pista-d" id="pistaD">${S.corredores.map((c, i) => `<div class="faixa-d ${ME && c.id === ME.id ? "eu" : ""}" data-id="${c.id}"><span class="nome">${h(c.nome)}</span><span class="wpm"></span><div class="chegada"></div><div class="veiculo">${carroSvg(CORES[i % CORES.length])}</div></div>`).join("")}</div>
  <div class="frase" id="frase"></div>
  ${me ? `<input id="entrada" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Digite a frase aqui" disabled>` : `<p class="muted">Você está assistindo.</p>`}`;
}
function pintarFrase(texto) {
  const f = S.frase, n = Digita.prefixoCerto(f, texto), el = $("frase"); if (!el) return;
  let html = `<span class="ok">${h(f.slice(0, n))}</span>`;
  const errados = Math.min(texto.length, f.length) - n;
  if (errados > 0) html += `<span class="er">${h(f.slice(n, n + errados))}</span>`;
  const resto = f.slice(n + Math.max(0, errados));
  html += resto ? `<span class="at">${h(resto[0])}</span><span class="pe">${h(resto.slice(1))}</span>` : "";
  el.innerHTML = html;
}
function ligarEntrada() {
  const inp = $("entrada"); if (!inp || inp.dataset.ligado) return;
  inp.dataset.ligado = 1;
  inp.addEventListener("paste", (e) => e.preventDefault());
  inp.addEventListener("drop", (e) => e.preventDefault());
  inp.addEventListener("input", () => {
    if (acabei) return;
    pintarFrase(inp.value);
    socket.emit("digitou", { texto: inp.value });
    if (inp.value === S.frase) { acabei = true; inp.disabled = true; }
    pintarPista(Digita.prefixoCerto(S.frase, inp.value));
  });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
}
function contagem() {
  const el = $("contagem"), inp = $("entrada"); if (!el || !S.inicio) return;
  const falta = S.inicio - relogio.agora();
  if (falta > 0) { el.textContent = Math.ceil(falta / 1000); pintarFrase(""); return; }
  if (el.textContent !== "VAI!" && el.textContent !== "") { el.textContent = "VAI!"; setTimeout(() => { const c = $("contagem"); if (c && c.textContent === "VAI!") c.textContent = ""; }, 900); }
  else if (el.textContent === "") { /* contagem já passou */ }
  if (inp && !acabei && inp.disabled) { inp.disabled = false; ligarEntrada(); inp.focus(); }
}
function pintarPista(meusCertos) {
  if (!S || S.phase !== "run" || !SNAP) return;
  const n = S.frase.length, el = Math.max(0, (relogio.agora() - S.inicio) / 1000);
  for (const [id, certos, fim] of SNAP.p) {
    const f = document.querySelector(`.faixa-d[data-id="${id}"]`); if (!f) continue;
    const c = ME && id === ME.id && meusCertos != null ? Math.max(meusCertos, 0) : certos;
    const pct = fim != null ? 1 : c / n;
    f.querySelector(".veiculo").style.left = `calc(110px + ${pct} * (100% - 190px))`;
    const t = fim != null ? fim : el;
    f.querySelector(".wpm").textContent = t > 1 && c > 0 ? Digita.wpm(c, t) + " ppm" + (fim != null ? " 🏁" : "") : fim != null ? "🏁" : "";
  }
}
function telaResultado() {
  const r = S.resultado, host = ME && S.host === ME.id, ultima = S.rodada >= S.config.rodadas;
  return `<div class="grid2" style="margin-top:12px">
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:8px">${r.ordem[0].fim != null ? "🏁 " + h(r.ordem[0].nome) + " venceu!" : "Ninguém terminou"}</h2>
      <div class="frase" style="user-select:text;font-size:16px">${h(r.frase)}</div>
      <table class="tabela"><tr><th>#</th><th>Piloto</th><th>Tempo</th><th>ppm</th><th>Pontos</th></tr>
      ${r.ordem.map((o, i) => `<tr><td>${i + 1}</td><td><b>${h(o.nome)}</b></td><td>${o.fim != null ? seg(o.fim) : "não terminou"}</td><td>${o.wpm == null ? "—" : o.wpm}</td><td class="${o.pontos ? "ganho" : ""}">+${o.pontos}</td></tr>`).join("")}</table></div></div>
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:8px">Placar</h2>${S.players.slice().sort((a, b) => b.pontos - a.pontos).map((p) => `<div class="pl"><b>${h(p.name)}</b><span class="preco">${p.pontos} pts</span></div>`).join("")}
      <div class="row" style="margin-top:12px"><span class="muted">${ultima ? "Fim da corrida em" : "Próxima rodada em"} <b data-tempo></b></span>${host ? `<button class="primary" id="bProxima">${ultima ? "Ver o campeão" : "Próxima rodada"}</button>` : ""}</div></div></div></div>`;
}
function telaFinal() {
  const host = ME && S.host === ME.id, rank = S.placar || [];
  if (!rank.length) return "";
  return `<div class="panel" style="margin-top:12px"><div class="faixa"></div><div class="in" style="text-align:center"><h2 style="font-size:40px">🏆 ${h(rank[0].nome)} é o campeão da digitação!</h2>
    <p class="muted">Fechou com ${rank[0].pontos} pontos depois de ${S.config.rodadas} ${S.config.rodadas === 1 ? "rodada" : "rodadas"}.</p>
    <table class="tabela" style="max-width:480px;margin:12px auto"><tr><th>#</th><th>Piloto</th><th>Vitórias</th><th>Pontos</th></tr>
    ${rank.map((p, i) => `<tr><td>${i + 1}</td><td><b>${h(p.nome)}</b></td><td>${p.vitorias}</td><td class="preco">${p.pontos}</td></tr>`).join("")}</table>
    ${S.historico.length ? `<p class="muted">${S.historico.map((x) => `R${x.rodada}: ${h(x.vencedor || "ninguém")}${x.wpm ? " (" + x.wpm + " ppm)" : ""}`).join(" · ")}</p>` : ""}
    ${host ? `<button class="primary" id="bStart">Jogar de novo</button>` : `<p class="muted">O organizador pode abrir outra partida.</p>`}</div></div>`;
}
function ligar() {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => (el.onclick = () => fn(el)));
  on("[data-cfg]", (el) => act("config", { config: { ...S.config, [el.dataset.cfg]: el.dataset.cfg === "bots" ? el.dataset.v === "1" : +el.dataset.v } }));
  on("#bStart", () => act("start"));
  on("#bProxima", () => act("next"));
}
if (location.hash === "#debug") window.__digita = { get S() { return S; } };
