// Arrancada JDM — o navegador: telas (sala, garagem, apostas, resultado) e a pista desenhada em canvas.
// O servidor é quem corre e quem paga as apostas; aqui só se desenha e se mandam "largar" e "nitro".
"use strict";
const { $, h, store } = Comum;
const toast = Comum.criarToast(3200), socket = io("/drag"), relogio = Comum.relogio();
const act = Comum.criarAct(socket, toast);
let S = null, ME = null, CORR = null;
const vpicCache = {};
const urlCode = new URLSearchParams(location.search).get("sala");
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const seg = (s) => (s == null ? "—" : s.toFixed(2).replace(".", ",") + " s");
const meuPlayer = () => S && ME && S.players.find((p) => p.id === ME.id);
const carroDe = (id) => Drag.carroPorId(id);
const PASSOS = [["garage", "Garagem"], ["bets", "Apostas"], ["race", "Largada"], ["result", "Resultado"]];

// ---------------- som (bips do semáforo) ----------------
let ac = null;
function bip(freq, dur = 0.12, vol = 0.08) {
  if (store.get("drag:mudo")) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = "square"; o.frequency.value = freq; gn.gain.value = vol;
    o.connect(gn); gn.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  } catch {}
}

// ---------------- entrar / criar ----------------
function mostrar(qual) { for (const id of ["home", "jogo"]) $(id).classList.toggle("hidden", id !== qual); }
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function entrou(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("drag:" + r.code, ME);
  history.replaceState(null, "", "/drag/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
  mostrar("jogo");
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name }, entrou); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const salvo = store.get("drag:" + code) || {};
  socket.emit("join", { code, name, id: salvo.id, token: salvo.token }, entrou);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, entrou); };
$("btnInvite").onclick = async () => { const link = location.origin + "/drag/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, salvo = code && store.get("drag:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (salvo && salvo.id) socket.emit("join", { code, id: salvo.id, token: salvo.token }, (r) => { if (r.ok) entrou(r); else { mostrar("home"); $("hErr").textContent = r.error; } });
  else mostrar("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); store.del("drag:" + ME.code); location.href = "/drag/"; });

// ---------------- estado ----------------
socket.on("state", (st) => {
  const antes = S; S = st; relogio.doEstado(st.now);
  if (st.phase === "race" && st.pista && (!CORR || CORR.verde !== st.pista.verde)) iniciarCorrida();
  if (antes && antes.phase !== st.phase && st.phase === "result") aposCorrida();
  desenhar();
});
socket.on("snap", (d) => {
  if (!CORR) return;
  const agora = performance.now();
  CORR.el = d.el;
  for (const [id, x, v, marcha, nos, patina, total, largou, falso] of d.c) {
    const c = CORR.carros.get(id); if (!c) continue;
    Object.assign(c, { x, v, at: agora, marcha, nos, patina, total, largou: !!largou || c.largou, falso: !!falso });
  }
});
socket.on("ev", (evs) => { for (const e of evs) if (e.tipo === "verde") { bip(880, 0.35, 0.1); aviso("VERDE!", "#34e27a"); } });

// o relógio da fase (garagem, apostas e resultado)
setInterval(() => {
  const el = document.querySelector("[data-tempo]"); if (!el || !S) return;
  el.textContent = S.deadline ? Math.max(0, Math.ceil((S.deadline - relogio.agora()) / 1000)) + " s" : "";
}, 250);

// ---------------- telas ----------------
let sujo = false;
function desenhar() {
  if (!S) return;
  const ativo = document.activeElement;
  if (ativo && ativo.id === "vAposta") { sujo = true; return; } // não troca a tela debaixo do dedo no controle
  sujo = false;
  const eu = meuPlayer(), p = S.phase;
  $("pistaBox").classList.toggle("hidden", !(p === "race" || p === "result"));
  $("comandos").classList.toggle("hidden", !(p === "race" && CORR && CORR.eu));
  $("semaforo").classList.toggle("hidden", p !== "race");
  const i = PASSOS.findIndex(([k]) => k === p);
  $("topo").innerHTML = p === "lobby" ? "" :
    `<span class="chip">Rodada ${S.rodada}/${S.config.rodadas}</span>${eu ? `<span class="chip cash">${fmt(eu.caixa)} ¥</span>` : ""}<span class="chip tempo" data-tempo></span>
     <div class="passos">${PASSOS.map(([k, n], j) => `<span class="${j === i ? "on" : ""}">${n}</span>`).join("")}</div>`;
  const tela = { lobby: telaLobby, garage: telaGaragem, bets: telaApostas, race: telaCorrida, result: telaResultado, final: telaFinal }[p];
  $("tela").innerHTML = tela ? tela(eu) : "";
  ligar();
}
document.addEventListener("change", (e) => { if (e.target.id === "vAposta" && sujo) { e.target.blur(); desenhar(); } });

const listaJogadores = () => S.players.map((p) => `<div class="pl"><i class="dot ${p.online ? "" : "off"}"></i><b class="${p.online ? "" : "off"}">${h(p.name)}${p.id === S.host ? " 👑" : ""}${ME && p.id === ME.id ? " (você)" : ""}</b>${p.carro ? `<span class="muted">${h(carroDe(p.carro).nome)}</span>` : ""}${S.phase !== "lobby" ? `<span class="preco">${fmt(p.caixa)} ¥</span>` : ""}${p.pronto ? "✅" : ""}</div>`).join("");

function telaLobby() {
  const host = ME && S.host === ME.id;
  return `<div class="grid2" style="margin-top:14px">
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:12px">Pilotos</h2>${listaJogadores()}
      ${host ? `<div style="margin-top:16px"><label>Rodadas</label><div class="seg">${[1, 3, 5].map((n) => `<button data-cfg="rodadas" data-v="${n}" class="${S.config.rodadas === n ? "on" : ""}">${n}</button>`).join("")}</div>
      <label style="margin-top:12px">Robôs completam a pista</label><div class="seg"><button data-cfg="bots" data-v="1" class="${S.config.bots ? "on" : ""}">Sim</button><button data-cfg="bots" data-v="0" class="${S.config.bots ? "" : "on"}">Não</button></div>
      <button class="primary" id="bStart" style="width:100%;margin-top:16px">Abrir a garagem</button></div>` : `<p class="muted" style="margin-top:14px">Esperando o organizador abrir a garagem… (${S.config.rodadas} rodadas)</p>`}
    </div></div>
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:12px">Como funciona</h2><ul class="keys">
      <li>Todo mundo começa com <b>2.000 ¥</b>. Compre um JDM e gaste o resto em <b>tuning</b>: turbo, pneus, peso, câmbio e nitro.</li>
      <li>Antes de cada corrida, <b>aposte</b> em quem vai ganhar (em você, num amigo ou num robô). Quem acerta divide o bolo.</li>
      <li>Na pista: <b>Espaço</b> (ou o botão) larga quando o verde acender; antes disso é queimar a largada. Depois, <b>N</b> ou o botão solta o nitro, uma vez só.</li>
      <li>O vencedor da corrida ganha 300 ¥, e cada rodada nova traz 250 ¥ de patrocínio. No fim, quem tem mais ¥ leva a noite.</li></ul></div></div>
  </div>`;
}

function especificacoes(carro, pecas) {
  const f = Drag.ficha(carro, pecas), e = Drag.estimar(f);
  return `<div class="ficha"><div><b>${Math.round(f.hp)}</b><span>cv</span></div><div><b>${Math.round(f.kg)}</b><span>kg</span></div><div><b>${carro.trac}</b><span>tração</span></div><div><b>${e.tempo.toFixed(1).replace(".", ",")}s</b><span>1/4 mi</span></div></div>`;
}
function desenhoCarro(carro, w = 150) { return `<canvas class="mini" data-carro="${carro.id}" width="${w * 2}" height="${Math.round(w * 0.8)}" style="width:${w}px;height:${Math.round(w * 0.4)}px"></canvas>`; }

function telaGaragem(eu) {
  if (!eu) return `<p class="muted">Você está só assistindo. A galera está na garagem.</p><div class="panel"><div class="in">${listaJogadores()}</div></div>`;
  if (!eu.carro) {
    return `<h2 style="font-size:28px;margin:6px 0 4px">Escolha o seu JDM</h2><p class="muted" style="margin-top:0">Caixa: <b class="preco">${fmt(eu.caixa)} ¥</b>. O resto vai para o tuning e para as apostas.</p>
    <div class="carros">${Drag.CARROS.map((c) => `<div class="carro"><div class="foto">${desenhoCarro(c)}</div><h3>${h(c.nome)}</h3><small>${h(c.marca)} · ${c.ano} · ${h(c.motor)}</small>${especificacoes(c, Drag.pecasZeradas())}
      <button data-carro-compra="${c.id}" ${c.preco > eu.caixa ? "disabled" : ""}>Comprar por <span class="preco">${c.preco} ¥</span></button></div>`).join("")}</div>`;
  }
  const c = carroDe(eu.carro);
  return `<div class="grid2">
    <div class="panel"><div class="in"><div class="foto" style="text-align:center">${desenhoCarro(c, 260)}</div><h2 style="font-size:26px;margin:8px 0 2px">${h(c.nome)}</h2><small class="muted">${h(c.marca)} · ${c.ano} · ${h(c.motor)}</small>
      <div style="margin-top:10px">${especificacoes(c, eu.pecas)}</div>
      <div class="vpic" id="vpic" data-marca="${h(c.marca)}"></div>
      <button class="primary" id="bPronto" style="width:100%;margin-top:14px">${eu.pronto ? "Calma, ainda vou mexer" : "Pronto! Ir para as apostas"}</button>
      <div style="margin-top:14px"><label>A galera</label>${listaJogadores()}</div></div></div>
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:4px">Tuning</h2>
      ${Object.entries(Drag.PECAS).map(([k, pc]) => { const n = eu.pecas[k], prox = n < Drag.NIVEL_MAX ? pc.custo[n] : null;
        return `<div class="peca"><div><b>${pc.icone} ${pc.nome}</b><div class="pips">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div></div>
        <button class="small" data-peca="${k}" ${prox == null || prox > eu.caixa ? "disabled" : ""}>${prox == null ? "Máximo" : `Nível ${n + 1} · ${prox} ¥`}</button><p>${pc.desc}</p></div>`; }).join("")}
    </div></div></div>`;
}

let alvoSel = null, valorAposta = 0;
function telaApostas(eu) {
  const rc = S.corredores, minha = S.apostas.find((a) => eu && a.id === eu.id);
  if (!rc.some((r) => r.id === alvoSel)) alvoSel = minha ? minha.alvo : (rc.find((r) => eu && r.id === eu.id) || rc[0] || {}).id;
  if (minha && !valorAposta) valorAposta = minha.valor;
  const maximo = eu ? eu.caixa : 0;
  valorAposta = Math.min(valorAposta, maximo);
  return `<h2 style="font-size:28px;margin:6px 0 4px">Quem leva o 1/4 de milha?</h2><p class="muted" style="margin-top:0">Bolo das apostas: <b class="preco">${fmt(S.pool)} ¥</b>. Quem acertar divide tudo, na proporção do que apostou. Ninguém acertou? Cada um recebe o seu de volta.</p>
  <div class="pistas">${rc.map((r) => { const c = carroDe(r.carro), noMeu = S.apostas.filter((a) => a.alvo === r.id).length;
    return `<button class="alvo ${r.id === alvoSel ? "sel" : ""}" data-alvo="${r.id}"><div class="foto">${desenhoCarro(c, 170)}</div><b>${h(r.nome)}${eu && r.id === eu.id ? " (você)" : ""}</b><small class="muted">${h(c.nome)}</small>
      <span class="t">${r.estimativa.toFixed(2).replace(".", ",")} s <small class="muted" style="font-family:var(--body)">${r.vel} km/h</small></span>
      <small>${r.apostado ? `Apostado: <b class="preco">${fmt(r.apostado)} ¥</b> (${noMeu}) · paga ${(S.pool / r.apostado).toFixed(1).replace(".", ",")}x` : "Ninguém apostou ainda"}</small></button>`; }).join("")}</div>
  ${eu ? `<div class="apostaBox panel"><div class="in">
    <label for="vAposta">Valor da aposta em ${h((rc.find((r) => r.id === alvoSel) || {}).nome || "")}: <b class="preco" id="vTxt">${fmt(valorAposta)} ¥</b></label>
    <input type="range" id="vAposta" min="0" max="${maximo}" step="10" value="${valorAposta}">
    <div class="row"><button class="small" data-pct="0">Sem aposta</button><button class="small" data-pct="25">25%</button><button class="small" data-pct="50">50%</button><button class="small" data-pct="100">Tudo!</button>
    <span class="muted">Sua aposta: ${minha ? `<b class="preco">${fmt(minha.valor)} ¥</b> em ${h(rc.find((r) => r.id === minha.alvo).nome)}` : "nenhuma"}</span></div>
    <div class="row"><button class="primary" id="bApostar">Confirmar aposta</button><button id="bPronto">${eu.pronto ? "Esperar mais um pouco" : "Pronto, bora largar"}</button></div></div></div>` : ""}
  <div style="margin-top:14px">${listaJogadores()}</div>`;
}

function telaCorrida(eu) {
  if (!CORR || !CORR.eu) return `<p class="muted" style="margin-top:10px">${eu ? "Você ficou de fora dessa corrida." : "Você está assistindo."}</p>${apostasDaGalera()}`;
  return `<p class="muted" style="margin-top:10px"><b>Espaço</b> larga no verde, depois <b>N</b> solta o nitro${CORR.carros.get(CORR.eu).spec.f.nosDur ? "" : " (seu carro está sem nitro)"}.</p>${apostasDaGalera()}`;
}
function apostasDaGalera() {
  if (!S.apostas.length) return `<p class="muted">Ninguém apostou nesta rodada.</p>`;
  return `<div class="panel"><div class="in"><label>Apostas da rodada</label>${S.apostas.map((a) => { const p = S.players.find((x) => x.id === a.id), r = S.corredores.find((x) => x.id === a.alvo);
    return `<div class="pl"><b>${h(p ? p.name : "?")}</b><span>${fmt(a.valor)} ¥ em</span><b>${h(r ? r.nome : "?")}</b></div>`; }).join("")}</div></div>`;
}

function telaResultado(eu) {
  const r = S.resultado; if (!r) return "";
  const host = ME && S.host === ME.id, ultima = S.rodada >= S.config.rodadas;
  const minha = r.pagamentos.find((x) => eu && x.id === eu.id);
  return `<div class="grid2" style="margin-top:12px">
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:8px">🏁 ${h(r.ordem[0].nome)} venceu!</h2>
      <table class="tabela"><tr><th>#</th><th>Piloto</th><th>Carro</th><th>1/4 de milha</th><th>km/h</th></tr>
      ${r.ordem.map((o, i) => `<tr><td>${i + 1}</td><td><b>${h(o.nome)}</b></td><td class="muted">${h(carroDe(o.carro).nome)}</td><td>${o.falso ? "🚩 " : ""}${seg(o.total)}</td><td>${o.vel == null ? "—" : o.vel}</td></tr>`).join("")}</table>
      ${r.ordem.some((o) => o.falso) ? `<p class="muted">🚩 Queimou a largada: 0,8 s de castigo.</p>` : ""}
      ${r.premio ? `<p class="muted">Prêmio da corrida: <b class="preco">+${r.premio} ¥</b> para ${h(r.ordem[0].nome)}.</p>` : ""}</div></div>
    <div class="panel"><div class="in"><h2 style="font-size:26px;margin-bottom:8px">💰 As apostas</h2>
      ${r.pagamentos.length ? r.pagamentos.map((x) => { const a = S.corredores.find((c) => c.id === x.alvo);
        return `<div class="pl"><b>${h(x.nome)}</b><span class="muted">${fmt(x.aposta)} ¥ em ${h(a ? a.nome : "?")}</span><span class="${x.delta >= 0 ? "ganho" : "perda"}">${x.delta >= 0 ? "+" : ""}${fmt(x.delta)} ¥</span></div>`; }).join("") : `<p class="muted">Ninguém apostou.</p>`}
      ${minha ? `<p>${minha.delta > 0 ? "Você acertou! 🎉" : minha.delta < 0 ? "Não foi dessa vez." : "Aposta devolvida."}</p>` : ""}
      <label style="margin-top:14px">Caixa de cada um</label>${S.players.slice().sort((a, b) => b.caixa - a.caixa).map((p) => `<div class="pl"><b>${h(p.name)}</b><span class="preco">${fmt(p.caixa)} ¥</span></div>`).join("")}
      <div class="row" style="margin-top:12px"><span class="muted">${ultima ? "Fim do campeonato em" : "Próxima rodada em"} <b data-tempo></b></span>${host ? `<button class="primary" id="bProxima">${ultima ? "Ver o campeão" : "Próxima rodada"}</button>` : ""}</div>
    </div></div></div>`;
}
function telaFinal() {
  const host = ME && S.host === ME.id, rank = S.players.slice().sort((a, b) => b.caixa - a.caixa);
  return `<div class="panel" style="margin-top:12px"><div class="faixa"></div><div class="in" style="text-align:center"><h2 style="font-size:40px">🏆 ${h(rank[0].name)} é o campeão da noite!</h2>
    <p class="muted">Fechou com ${fmt(rank[0].caixa)} ¥ depois de ${S.config.rodadas} ${S.config.rodadas === 1 ? "rodada" : "rodadas"}.</p>
    <table class="tabela" style="max-width:520px;margin:12px auto"><tr><th>#</th><th>Piloto</th><th>Carro</th><th>Caixa</th></tr>
    ${rank.map((p, i) => `<tr><td>${i + 1}</td><td><b>${h(p.name)}</b></td><td class="muted">${p.carro ? h(carroDe(p.carro).nome) : "—"}</td><td class="preco">${fmt(p.caixa)} ¥</td></tr>`).join("")}</table>
    ${S.historico.length ? `<p class="muted">${S.historico.map((x) => `R${x.rodada}: ${h(x.vencedor)}${x.tempo ? " (" + seg(x.tempo) + ")" : ""}`).join(" · ")}</p>` : ""}
    ${host ? `<button class="primary" id="bLobby">Jogar de novo</button>` : `<p class="muted">O organizador pode abrir outra partida.</p>`}</div></div>`;
}

// os botões da tela (a tela é refeita a cada estado: liga de novo a cada desenho)
function ligar() {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => (el.onclick = () => fn(el)));
  on("[data-cfg]", (el) => act("config", { config: { ...S.config, [el.dataset.cfg]: el.dataset.cfg === "bots" ? el.dataset.v === "1" : +el.dataset.v } }));
  on("#bStart", () => act("start"));
  on("[data-carro-compra]", (el) => act("carro", { id: el.dataset.carroCompra }));
  on("[data-peca]", (el) => act("peca", { peca: el.dataset.peca }));
  on("#bPronto", () => act("pronto", { pronto: !(meuPlayer() || {}).pronto }));
  on("[data-alvo]", (el) => { alvoSel = el.dataset.alvo; desenhar(); });
  on("[data-pct]", (el) => { const eu = meuPlayer(); valorAposta = Math.floor((eu.caixa * +el.dataset.pct) / 100 / 10) * 10; desenhar(); });
  on("#bApostar", () => act("apostar", { alvo: alvoSel, valor: valorAposta }).then((okk) => okk && toast("Aposta feita!")));
  on("#bProxima", () => act("next"));
  on("#bLobby", () => act("lobby"));
  const v = $("vAposta");
  if (v) v.oninput = () => { valorAposta = +v.value; $("vTxt").textContent = fmt(valorAposta) + " ¥"; };
  document.querySelectorAll("canvas.mini").forEach((c) => { const cx = c.getContext("2d"), car = carroDe(c.dataset.carro); cx.clearRect(0, 0, c.width, c.height); desenharCarro(cx, 10, c.height * 0.08, c.width - 20, car, 0, false, false); });
  const vp = $("vpic");
  if (vp) {
    const m = vp.dataset.marca;
    const pinta = (lista) => { vp.innerHTML = lista && lista.length ? `NHTSA vPIC · modelos ${h(m)}: ${lista.slice(0, 10).map((n) => `<em>${h(n)}</em>`).join("")}${lista.length > 10 ? ` +${lista.length - 10}` : ""}` : ""; };
    if (m in vpicCache) pinta(vpicCache[m]);
    else { vpicCache[m] = []; fetch("/api/drag/marca/" + encodeURIComponent(m.toLowerCase())).then((r) => r.json()).then((j) => { vpicCache[m] = j.modelos || []; const el = $("vpic"); if (el && el.dataset.marca === m) pinta(vpicCache[m]); }).catch(() => {}); }
  }
}

// ---------------- a pista ----------------
const cv = $("cv"), g = cv.getContext("2d");
const FAIXA_H = 56, TOPO_H = 96, PPM = 14; // altura da faixa, do céu, e pixels por metro
function iniciarCorrida() {
  const eu = ME && ME.id;
  CORR = { verde: S.pista.verde, el: -9, eu: S.corredores.some((r) => r.id === eu) ? eu : null, avisoFeito: false, luzes: 0, carros: new Map() };
  S.corredores.forEach((r, i) => CORR.carros.set(r.id, { id: r.id, nome: r.nome, faixa: i, carro: carroDe(r.carro), spec: { f: Drag.ficha(carroDe(r.carro), r.pecas) }, x: 0, v: 0, disp: 0, at: performance.now(), marcha: 0, nos: 0, patina: 0, total: null, largou: false, falso: false }));
  cv.height = TOPO_H + S.corredores.length * FAIXA_H + 20;
  aviso("");
}
function aposCorrida() { if (S.resultado) aviso(S.resultado.ordem[0].nome + " venceu!", "#ffc83d"); }
let avisoT = 0;
function aviso(txt, cor = "#fff") { const a = $("aviso"); a.textContent = txt; a.style.color = cor; a.classList.remove("pop"); void a.offsetWidth; if (txt) a.classList.add("pop"); clearTimeout(avisoT); if (txt) avisoT = setTimeout(() => { a.textContent = ""; }, 2200); }

function largar() {
  if (!S || S.phase !== "race" || !CORR || !CORR.eu) return false;
  const c = CORR.carros.get(CORR.eu); if (c.largou) return false;
  const t = relogio.agora(), rea = (t - CORR.verde) / 1000;
  c.largou = true;
  if (rea < 0) aviso("QUEIMOU A LARGADA!", "#ff5a5a"); else aviso(rea.toFixed(3).replace(".", ",") + " s", rea < 0.25 ? "#34e27a" : "#fff");
  socket.emit("act", { type: "largar", t }, () => {});
  return true;
}
function nitro() {
  if (!S || S.phase !== "race" || !CORR || !CORR.eu) return;
  if (!CORR.carros.get(CORR.eu).largou) return;
  socket.emit("act", { type: "nos" }, () => {});
}
$("bLargar").onclick = () => { if (!largar()) nitro(); };
$("bNos").onclick = nitro;
$("cv").addEventListener("pointerdown", () => { if (!largar()) nitro(); });
document.addEventListener("keydown", (e) => {
  if (e.repeat || /INPUT|TEXTAREA/.test((e.target || {}).tagName)) return;
  if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (!largar()) nitro(); }
  else if (e.code === "KeyN" || e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "ArrowUp") { e.preventDefault(); nitro(); }
});

// o carro de lado, virado para a direita. x = traseira, w = comprimento
function desenharCarro(c, x, y, w, carro, rot, nos, patina) {
  const alt = w * 0.34, base = y + alt;
  c.save();
  c.fillStyle = "#0007"; c.beginPath(); c.ellipse(x + w / 2, base + 2, w * 0.5, 3, 0, 0, 7); c.fill(); // sombra
  if (nos) { const grd = c.createLinearGradient(x, 0, x - w * 0.45, 0); grd.addColorStop(0, "#5be3ff"); grd.addColorStop(1, "#5be3ff00"); c.fillStyle = grd; c.beginPath(); c.moveTo(x, base - alt * 0.35); c.lineTo(x - w * (0.3 + 0.15 * Math.random()), base - alt * 0.28); c.lineTo(x, base - alt * 0.2); c.fill(); }
  if (patina) { c.fillStyle = "#ddd8"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + w * 0.18 - i * 5 - Math.random() * 4, base - 3 - Math.random() * 5, 3 + i, 0, 7); c.fill(); } }
  c.fillStyle = carro.cor; // carroceria
  c.beginPath();
  c.moveTo(x, base - alt * 0.2);
  c.lineTo(x + w * 0.02, base - alt * 0.55); c.lineTo(x + w * 0.22, base - alt * 0.62);
  c.lineTo(x + w * 0.36, base - alt * 1.0); c.lineTo(x + w * 0.66, base - alt * 1.0);
  c.lineTo(x + w * 0.82, base - alt * 0.62); c.lineTo(x + w * 0.98, base - alt * 0.5);
  c.lineTo(x + w, base - alt * 0.2); c.lineTo(x + w, base - alt * 0.12); c.lineTo(x, base - alt * 0.12); c.closePath(); c.fill();
  c.fillStyle = carro.cor2; c.fillRect(x, base - alt * 0.3, w, alt * 0.1); // faixa lateral
  c.fillStyle = "#0b1822dd"; // vidros
  c.beginPath(); c.moveTo(x + w * 0.27, base - alt * 0.64); c.lineTo(x + w * 0.38, base - alt * 0.94); c.lineTo(x + w * 0.64, base - alt * 0.94); c.lineTo(x + w * 0.76, base - alt * 0.64); c.closePath(); c.fill();
  c.fillStyle = "#ffe9a0"; c.fillRect(x + w * 0.95, base - alt * 0.42, w * 0.04, alt * 0.1); // farol
  c.fillStyle = "#ff3030"; c.fillRect(x, base - alt * 0.42, w * 0.03, alt * 0.1); // lanterna
  for (const rx of [x + w * 0.2, x + w * 0.78]) { // rodas
    const r = alt * 0.27, ry = base - r * 0.6;
    c.fillStyle = "#111"; c.beginPath(); c.arc(rx, ry, r, 0, 7); c.fill();
    c.strokeStyle = "#bbb"; c.lineWidth = 1.2; c.beginPath();
    for (let k = 0; k < 3; k++) { const a = rot + (k * Math.PI * 2) / 3; c.moveTo(rx, ry); c.lineTo(rx + Math.cos(a) * r * 0.75, ry + Math.sin(a) * r * 0.75); }
    c.stroke();
  }
  c.restore();
}

const PREDIOS = Array.from({ length: 60 }, (_, i) => { const r = (n) => { const s = Math.sin(i * 91.7 + n * 13.3) * 43758.5453; return s - Math.floor(s); }; return { x: i * 70 + r(1) * 30, w: 40 + r(2) * 50, h: 30 + r(3) * 55, luz: r(4), cor: r(5) }; });
function pista() {
  const C = CORR, n = C.carros.size, W = cv.width, H = cv.height, x0 = 120, Q = Drag.QUARTO;
  const alvo = C.carros.get(C.eu) || [...C.carros.values()].sort((a, b) => b.disp - a.disp)[0];
  const cam = Math.min(Q - (W - x0) / PPM + 18, Math.max(-9, alvo.disp - 14)); // a câmera segue o meu carro (ou o líder)
  const sx = (m) => x0 + (m - cam) * PPM;
  const ceu = g.createLinearGradient(0, 0, 0, TOPO_H); ceu.addColorStop(0, "#0a0620"); ceu.addColorStop(1, "#3a1042"); g.fillStyle = ceu; g.fillRect(0, 0, W, H);
  const volta = PREDIOS.length * 70;
  for (const p of PREDIOS) {
    const px = (((p.x - cam * PPM * 0.25) % volta) + volta) % volta - 100;
    g.fillStyle = "#120a26"; g.fillRect(px, TOPO_H - p.h, p.w, p.h);
    g.fillStyle = p.cor > 0.5 ? "#ff2d95aa" : "#26d4ffaa";
    for (let wy = TOPO_H - p.h + 6; wy < TOPO_H - 6; wy += 9) for (let wx = px + 5; wx < px + p.w - 6; wx += 9) if (Math.sin(wx * 7.1 + wy * 3.3 + p.luz * 50) > 0.1) g.fillRect(wx, wy, 3, 4);
  }
  g.fillStyle = "#1c1c26"; g.fillRect(0, TOPO_H, W, n * FAIXA_H + 20);
  g.fillStyle = "#2a2a3a"; g.fillRect(0, TOPO_H, W, 4);
  g.fillStyle = "#ffffff55";
  for (let i = 1; i < n; i++) for (let m = Math.floor(cam / 6) * 6; m < cam + (W - x0) / PPM + 12; m += 6) g.fillRect(sx(m), TOPO_H + i * FAIXA_H + 8, 3 * PPM, 2);
  g.fillStyle = "#ffffffaa"; g.fillRect(0, TOPO_H + n * FAIXA_H + 8, W, 2);
  g.font = "700 12px Figtree, sans-serif"; g.textAlign = "center";
  for (let m = 0; m <= Q; m += 100) { const x = sx(m); if (x < -40 || x > W + 40) continue; g.fillStyle = "#ffc83d"; g.fillRect(x - 1, TOPO_H - 14, 2, 14); g.fillText(m === 0 ? "LARGADA" : m + " m", x, TOPO_H - 18); }
  g.fillStyle = "#fff"; g.fillRect(sx(0) - 1, TOPO_H, 3, n * FAIXA_H + 12);
  const fx = sx(Q);
  for (let r = 0; r < Math.ceil((n * FAIXA_H + 12) / 8); r++) for (let k = 0; k < 2; k++) { g.fillStyle = (r + k) % 2 ? "#fff" : "#111"; g.fillRect(fx + k * 8, TOPO_H + r * 8, 8, 8); }
  g.fillStyle = "#ffc83d"; g.fillText("1/4 DE MILHA", fx + 8, TOPO_H - 18);
  for (const c of C.carros.values()) {
    const y = TOPO_H + c.faixa * FAIXA_H + 10, x = sx(c.disp) - 4.4 * PPM;
    desenharCarro(g, x, y, 4.4 * PPM, c.carro, c.disp * 1.9, c.nos && c.total == null, c.patina && c.total == null && c.v < 30);
    g.fillStyle = c.id === C.eu ? "#ffc83d" : "#e8e8f8"; g.font = "800 12px Figtree, sans-serif"; g.textAlign = "left";
    g.fillText((c.id === C.eu ? "▶ " : "") + c.nome + (c.falso ? " 🚩" : ""), Math.max(6, x), y - 2);
    if (c.total != null) { g.fillStyle = "#34e27a"; g.fillText(seg(c.total), Math.min(W - 70, sx(c.disp) + 8), y + 20); }
  }
  if (C.eu) {
    const c = C.carros.get(C.eu);
    g.fillStyle = "#000a"; g.fillRect(W - 168, H - 44, 160, 36); g.fillStyle = "#26d4ff"; g.font = "28px Anton, Impact, sans-serif"; g.textAlign = "right"; g.fillText(Math.round(c.v * 3.6) + " km/h", W - 14, H - 17);
    g.fillStyle = "#a3a3c2"; g.font = "700 12px Figtree"; g.textAlign = "left"; g.fillText(c.marcha + 1 + "ª", W - 160, H - 17);
  }
}
function semaforo() {
  const C = CORR, el = $("semaforo").children, falta = C.verde - relogio.agora();
  const acesas = falta <= 0 ? 0 : falta <= 600 ? 3 : falta <= 1200 ? 2 : falta <= 1800 ? 1 : 0;
  if (acesas > C.luzes) { bip(440, 0.12); C.luzes = acesas; }
  for (let i = 0; i < 3; i++) el[i].className = falta > 0 && i < acesas ? "a" : "";
  el[3].className = falta <= 0 ? "v" : "";
  if (falta > 0 && falta < 2200 && !C.avisoFeito) { C.avisoFeito = true; aviso("PREPARAR…", "#ffb020"); }
}
function quadro() {
  if (CORR && S && (S.phase === "race" || S.phase === "result")) {
    const agora = performance.now();
    for (const c of CORR.carros.values()) {
      const est = c.total != null ? Drag.QUARTO : Math.min(Drag.QUARTO, c.x + c.v * (agora - c.at) / 1000);
      c.disp += (est - c.disp) * 0.45;
    }
    pista();
    if (S.phase === "race") semaforo();
  }
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
// a oficina: #debug expõe o estado para os testes
if (location.hash === "#debug") window.__drag = { get S() { return S; }, get CORR() { return CORR; }, largar, nitro };
