// Leilão da Galera — o palco da sala (divide as variáveis globais das outras partes do script da página).
// - o placar da galera, em cima: um cartão por participante, com as moedas contando e as vagas enchendo;
// - a cena do meio, que só é montada de novo quando muda de momento (sala de espera, baralho, carta sorteada,
//   revelação, fim): assim as animações de entrada tocam uma vez só, mesmo com o estado chegando toda hora;
// - o painel do lance, o tempo e o maior lance (lance aberto), atualizados no lugar;
// - o elenco ao lado: o campinho (ou prato, ou lista) de um time só, o meu, ou o de quem eu tocar no placar;
// - a barra do organizador, embaixo, e a gaveta com a lista, o histórico e as regras da sala.
let verTime = null, verAntes = null, nomeAberto = false;
let cenaChave = null, atrasoVoo = 0;
const moedasVistas = new Map(), lobbyVistos = new Map();
const moedaHTML = `<i class="moeda" aria-hidden="true"></i>`;
const CORES = ["#c6ff3a", "#56c8ff", "#ff6b9a", "#f6c64e", "#a78bfa", "#3ee49c", "#ff8a4c", "#e9eef2"];
function corDe(id) { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]; }
const avatar = (c, extra = "") => `<span class="av" style="--c:${corDe(c.id)}">${esc((Array.from(c.name)[0] || "?").toUpperCase())}${extra}</span>`;

function render() {
  // o estado pode chegar antes das últimas partes do script (aovivo.js, elenco.js) carregarem: elas desenham quando chegam
  if (typeof renderTrocas !== "function") return;
  const st = S, mine = me.capId && capById(me.capId);
  $("rCode").textContent = st.code;
  if (!verTime || !capById(verTime)) verTime = mine ? mine.id : (st.captains[0] || {}).id || null;
  // sorteio novo: a fita de cartas corre pelo palco (roleta.js); usa o relógio do servidor e limita a duração
  if (st.spin && st.spin.id !== lastSpinId) {
    lastSpinId = st.spin.id;
    const age = Math.max(0, Date.now() + clockSkew - st.spin.at);
    if (age < 3000 && st.phase === "bidding") spinTo(st.spin.names, st.spin.index, Math.min(4000, Math.max(800, 4000 - age)));
  }
  renderTopo();
  montarCena();
  // anota os itens novos de todos os times (o voo até o time e a fala de quem chegou, em elenco.js)
  antesDeDesenhar();
  st.captains.forEach((c) => c.team.forEach((x) => viuItem(c, x.player, c.id + "|" + x.player)));
  renderPlacar();
  renderElenco();
  pitchSeeded = true;
  depoisDeDesenhar();
  renderFalasPlacar();
  renderNome(); renderTrocas(); renderAcao(); renderDoca(); renderPos(); renderInfo();
  renderFc(); renderJudge(); renderFormation(); renderReveal();
  tickTimer();
}

// ---------- o topo do palco: em que momento estamos e quantas vagas já foram preenchidas ----------
function renderTopo() {
  const st = S, cur = st.current, total = st.captains.length * st.config.perTeam, feitos = st.captains.reduce((n, c) => n + c.team.length, 0);
  $("progBar").style.width = total ? (100 * feitos) / total + "%" : "0";
  $("progTxt").textContent = total ? `${feitos}/${total} vagas` : "";
  let txt = "Intervalo", cls = "tag";
  if (st.phase === "lobby") txt = "Aquecimento";
  else if (st.phase === "done") txt = "Encerrado";
  else if (st.phase === "bidding") { txt = spinning ? "Sorteando" : "Em leilão"; cls += " vivo"; if (!spinning && cur.finalStretch) { txt = "Reta final"; cls += " final"; } }
  else if (st.phase === "reveal") txt = cur && cur.result && cur.result.winner ? "Vendido" : "Sem dono";
  $("faseTag").className = cls; $("faseTag").lastElementChild.textContent = txt;
  $("palco").classList.toggle("lado", st.phase === "bidding" && !spinning && !!cur);
}

// ---------- a cena do meio ----------
function chaveCena() {
  const st = S, cur = st.current, id = st.spin ? st.spin.id : cur && cur.player;
  if (st.phase === "lobby" || st.phase === "done") return st.phase;
  if (st.phase === "bidding" && cur) return (spinning ? "spin:" : "bid:") + id;
  if (st.phase === "reveal" && cur && cur.result) return "rev:" + id;
  return "idle";
}
function montarCena() {
  const k = chaveCena(), el = $("cena");
  if (k.startsWith("spin:")) return; // a fita do sorteio é montada por roleta.js
  if (k !== cenaChave) {
    cenaChave = k; atrasoVoo = 0;
    if (k === "lobby") el.innerHTML = cenaEspera();
    else if (k === "idle") el.innerHTML = cenaBaralho();
    else if (k === "done") el.innerHTML = cenaFim();
    else if (k.startsWith("bid:")) montarCarta(el);
    else if (k.startsWith("rev:")) montarRevela(el, k);
  }
  if (k === "lobby") atualizaEspera();
  if (k === "idle") atualizaBaralho();
}

// sala de espera: o código grande e quem já entrou (cada um entra pulando)
function cenaEspera() {
  return `<div class="espera"><h2>Sala de espera</h2><p>Mande o código para a galera entrar:</p>
    <div class="cod-grande"><b>${esc(S.code)}</b><button onclick="$('btnCopyLink').click()">${ic("copiar")}Convite</button></div>
    <div class="lobby-lista" id="lobbyLista"></div><div class="aviso-conta" id="lobbyConta"></div></div>`;
}
function atualizaEspera() {
  const box = $("lobbyLista"); if (!box) return;
  const agora = performance.now(), cfg = S.config, t = T();
  box.innerHTML = S.captains.map((c) => {
    if (!lobbyVistos.has(c.id)) lobbyVistos.set(c.id, pitchSeeded ? agora : -1e9);
    const age = agora - lobbyVistos.get(c.id), novo = age < 700 ? ` novo" style="animation-delay:-${Math.round(age)}ms` : "";
    const kick = me.host && !c.isHost ? `<button class="ghost danger" title="Remover" onclick="host('kick',{id:'${c.id}'})">${ic("fechar")}</button>` : "";
    return `<span class="lobby-p${novo}">${avatar(c)}${esc(c.name)}${kick}</span>`;
  }).join("") || `<span class="muted">Ninguém entrou ainda.</span>`;
  const need = S.captains.length * cfg.perTeam;
  $("lobbyConta").innerHTML = me.host
    ? (S.captains.length ? `${S.captains.length} na sala · precisa de ${need} ${esc(t.items)} e a lista tem ${S.poolCount}${S.poolCount < need ? ` · <b>faltam ${esc(t.items)}!</b>` : ""}` : "")
    : "Aguardando o organizador começar.";
}
// entre as rodadas: o baralho respirando, esperando o próximo sorteio
function cenaBaralho() {
  return `<div class="baralho"><div class="monte">${versoHTML()}${versoHTML()}${versoHTML()}</div><div><h2>Próximo ${esc(T().item)}</h2><p id="barTxt"></p></div></div>`;
}
function atualizaBaralho() {
  const p = $("barTxt"); if (!p) return;
  p.textContent = `${S.poolCount} na lista. ` + (me.host ? `Toque em "Sortear ${T().item}" na barra de baixo.` : "Aguardando o organizador sortear.");
}
// a carta sorteada, grande, virando ao entrar; a dourada (90+) solta faíscas
function montarCarta(el) {
  const cur = S.current, fb = isFootball(), nivel = fb ? nivelDe(Ratings.ratingOf(cur.player).ovr) : "neutra";
  const quem = cur.eligible.map((id) => capById(id)).filter(Boolean);
  const info = quem.length === S.captains.length ? "Todo mundo pode dar lance" : quem.length ? `Na disputa: <b>${quem.map((c) => esc(c.name)).join(", ")}</b>` : "Ninguém pode pegar este";
  el.innerHTML = `<div style="display:grid;justify-items:center"><div class="carta-palco ${nivel}" id="cartaAtual"><div class="halo"></div>${cartaHTML(cur.player, { futebol: fb, icone: Icones.deTema(T()) })}</div><div class="carta-info">${info}</div></div>`;
  if (nivel === "ouro") setTimeout(() => { const c = $("cartaAtual"); if (c) faiscas(c, 22); }, 650);
}
// a revelação: os lances virando um por um (o vencedor por último), o carimbo e, só então, o jogador voa para o time
function montarRevela(el, k) {
  const cur = S.current, r = cur.result, OPEN = S.config.mode === "open", w = r.winner && capById(r.winner), fb = isFootball(), D = 360;
  let lances = "", n = 0;
  if (!OPEN) {
    const valor = (b) => (b.amount != null ? b.amount : -1);
    const lista = cur.eligible.filter((id) => capById(id)).map((id) => ({ id, b: cur.bids[id] || { skip: true } }))
      .sort((a, b) => (a.id === r.winner) - (b.id === r.winner) || valor(a.b) - valor(b.b));
    n = lista.length;
    lances = `<div class="lances-rev">${lista.map((x, i) => { const c = capById(x.id), pulou = x.b.amount == null;
      return `<div class="lr${pulou ? " pulou" : ""}${x.b.auto ? " auto" : ""}${x.id === r.winner ? " vence" : ""}" style="animation-delay:${i * D}ms">${avatar(c)}<span>${esc(c.name)}</span><b>${pulou ? "pulou" : moedaHTML + x.b.amount}</b></div>`; }).join("")}</div>`;
  } else if (cur.feed.length) {
    lances = `<div class="feed-rev">${cur.feed.slice(-6).map((f) => `<span>${esc((capById(f.id) || {}).name || "?")} ${f.amount}</span>`).join(ic("dir"))}</div>`;
  }
  const t0 = OPEN ? 250 : n * D + 150, nome = Ratings.parseItem(cur.player).name;
  const nota = r.lottery ? "Ninguém deu lance na reta final: decidido no sorteio." : r.tie ? `Empate entre ${r.tiedIds.map((i) => esc((capById(i) || {}).name || "?")).join(", ")}: decidido no sorteio.` : "";
  el.innerHTML = `<div class="revela"><div id="cartaAtual">${cartaHTML(cur.player, { futebol: fb, icone: Icones.deTema(T()) })}</div><div class="revela-lado">${lances}
    <div class="carimbo${w ? "" : " semdono"}" style="animation-delay:${t0}ms">${w ? "Vendido" : "Sem dono"}</div>
    ${w ? `<div class="rev-quem" style="animation-delay:${t0 + 250}ms">${avatar(w)}<span>${esc(nomeTime(w))}<small>${esc(w.name)}${w.id === me.capId ? " (você)" : ""}</small></span><span class="preco">${moedaHTML}${r.amount}</span></div>`
      : `<div class="rev-nota" style="animation-delay:${t0 + 250}ms">${esc(nome)} ficou sem dono${S.config.mode === "open" ? "" : ": ninguém deu lance"}.</div>`}
    ${nota ? `<div class="rev-nota" style="animation-delay:${t0 + 400}ms">${nota}</div>` : ""}</div></div>`;
  atrasoVoo = w ? t0 + 700 : 0;
  const recemChegado = pitchSeeded; // no carregamento da página não tem festa
  setTimeout(() => {
    if (cenaChave !== k) return;
    const p = $("palco"); p.classList.remove("impacto"); void p.offsetWidth; if (!semMovimento()) p.classList.add("impacto");
    if (w && w.id === me.capId && recemChegado) { Comum.confetti(["#c6ff3a", "#f6c64e", "#ffffff", "#56c8ff"]); const c = $("cartaAtual"); if (c) faiscas(c, 20); }
  }, t0);
}
// fim do leilão: a taça e os destaques (a contratação mais cara, a pechincha, o time mais forte no papel)
function cenaFim() {
  const itens = S.captains.flatMap((c) => c.team.map((x) => ({ c, ...x }))), fb = isFootball(), dest = [];
  const caro = itens.slice().sort((a, b) => b.price - a.price)[0];
  if (caro) dest.push(["moeda", "Mais cara", Ratings.parseItem(caro.player).name, `${caro.price} moedas · ${nomeTime(caro.c)}`]);
  if (fb && itens.length > 1) {
    const nota = (x) => Ratings.ratingOf(x.player).ovr, pech = itens.slice().sort((a, b) => (nota(b) - 1.5 * b.price) - (nota(a) - 1.5 * a.price))[0];
    if (pech && pech !== caro) dest.push(["estrela", "Pechincha", Ratings.parseItem(pech.player).name, `nota ${nota(pech)} por ${pech.price} · ${nomeTime(pech.c)}`]);
    const forte = S.captains.filter((c) => c.team.length).map((c) => ({ c, E: lineupOf(c) })).sort((a, b) => b.E.att + b.E.def - a.E.att - a.E.def)[0];
    if (forte) dest.push(["escudo", "Favorito no papel", nomeTime(forte.c), `ataque ${Math.round(forte.E.att)} · defesa ${Math.round(forte.E.def)}`]);
  }
  const prox = me.host ? (fb ? "Agora é com você: coloque os times em campo." : skinNow ? "Agora é com você: abra a votação dos pratos." : "Os times estão prontos.")
    : (fb ? "Agora é esperar o organizador colocar os times em campo." : skinNow ? "Agora é esperar a votação abrir." : "Os times estão prontos.");
  return `<div class="fim">${ic("taca", "taca-grande")}<h2>Leilão encerrado</h2><p class="muted" style="margin:0">${prox}</p>
    ${dest.length ? `<div class="destaques">${dest.map(([i, a, b, c]) => `<div class="dest"><small>${ic(i)}${esc(a)}</small><b>${esc(b)}</b><span>${esc(c)}</span></div>`).join("")}</div>` : ""}</div>`;
}

// ---------- o placar da galera ----------
// os cartões ficam na tela (só os números e as classes mudam), para as moedas poderem contar até o valor novo
function renderPlacar() {
  const box = $("placar"), st = S, cfg = st.config, cur = st.current, OPEN = cfg.mode === "open", ids = st.captains.map((c) => c.id);
  [...box.children].forEach((el) => { if (!ids.includes(el.dataset.cap)) el.remove(); });
  st.captains.forEach((c, k) => {
    let el = box.querySelector(`[data-cap="${c.id}"]`);
    if (!el) {
      el = document.createElement("button"); el.type = "button"; el.className = "cap"; el.dataset.cap = c.id;
      el.innerHTML = `${avatar(c, "<i></i>")}<span class="cap-nome"></span><span class="cap-moedas">${moedaHTML}<b>${c.coins}</b></span><span class="pips"></span><span class="estado"></span>`;
      el.style.animationDelay = k * 60 + "ms"; moedasVistas.set(c.id, c.coins);
      el.onclick = () => { verTime = c.id; nomeAberto = false; render(); if (innerWidth <= 1000) $("elenco").scrollIntoView({ behavior: "smooth", block: "start" }); };
    }
    if (box.children[k] !== el) box.insertBefore(el, box.children[k] || null);
    el.classList.toggle("eu", c.id === me.capId); el.classList.toggle("ver", c.id === verTime);
    el.title = `Ver o time de ${c.name}`;
    el.querySelector(".av i").className = c.connected ? "on" : "";
    el.querySelector(".cap-nome").innerHTML = `${esc(c.name)}${c.teamName ? `<small>${esc(c.teamName)}</small>` : c.id === me.capId ? "<small>você</small>" : ""}`;
    // as vagas acendem quando o jogador pousa no time (o voo termina)
    el.querySelector(".pips").innerHTML = Array.from({ length: cfg.perTeam }, (_, i) => {
      const x = c.team[i]; if (!x) return "<i></i>";
      const ch = chegada(c.id + "|" + x.player);
      return ch.cls.includes("voando") ? "<i></i>" : `<i class="on${ch.cls.includes("new") ? " new" : ""}" style="${ch.style.replace(/^;/, "")}"></i>`;
    }).join("");
    const m = el.querySelector(".cap-moedas");
    if (moedasVistas.get(c.id) !== c.coins) { contarMoedas(m, moedasVistas.get(c.id), c.coins, cenaChave && cenaChave.startsWith("rev:") ? atrasoVoo : 0); moedasVistas.set(c.id, c.coins); }
    // o que cada um está fazendo agora
    let est = "", cls = "estado";
    if (st.phase === "bidding" && cur && !spinning) {
      if (!cur.eligible.includes(c.id)) { est = c.team.length >= cfg.perTeam ? "completo" : "fora"; cls += " fora"; }
      else if (OPEN) {
        if (cur.high && cur.high.id === c.id) { est = "na frente"; cls += " frente"; }
        else if (cur.passed[c.id]) { est = "saiu"; cls += " fora"; }
        else if (maxBidFor(c) < (cur.high ? cur.high.amount + 1 : cfg.minBid)) { est = "sem moedas"; cls += " fora"; }
        else est = "na disputa";
      } else if (cur.bids[c.id]) { est = "pronto"; cls += " pronto"; }
      else { est = "pensando"; cls += " pensa"; }
    } else if (st.phase === "reveal" && cur && cur.result && cur.result.winner === c.id) { est = "levou"; cls += " frente"; }
    else if (st.phase !== "lobby" && c.team.length >= cfg.perTeam) { est = "completo"; cls += " pronto"; }
    const e = el.querySelector(".estado");
    if (e.className !== cls || e.textContent !== est) { e.className = cls; e.textContent = est; if (est) e.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,1.5,.4,1)" }); }
  });
}
// as moedas descendo (ou subindo, no "desfazer") até o valor novo; na revelação, só depois do carimbo
function contarMoedas(el, de, para, atraso) {
  const b = el.querySelector("b"); el._alvo = para;
  if (de == null || semMovimento()) { b.textContent = para; return; }
  setTimeout(() => {
    if (el._alvo !== para) return;
    el.classList.remove("gastou"); void el.offsetWidth; if (para < de) el.classList.add("gastou");
    const t0 = performance.now(), dur = 800;
    (function passo(now) {
      if (el._alvo !== para) return;
      const k = Math.min(1, (now - t0) / dur); b.textContent = Math.round(de + (para - de) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(passo);
    })(t0);
  }, Math.max(0, atraso));
}
// a fala de quem chegou num time que não está aberto ao lado aparece embaixo do cartão dele no placar
function renderFalasPlacar() {
  let camada = $("falasPlacar");
  if (!camada) { camada = document.createElement("div"); camada.id = "falasPlacar"; camada.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:20"; document.body.appendChild(camada); }
  const agora = performance.now();
  camada.innerHTML = S.captains.filter((c) => c.id !== verTime).map((c) => {
    let f = null;
    for (const [k, v] of falas) if (k.startsWith(c.id + "|") && agora >= v.t0 && agora - v.t0 < FALA_MS && (!f || v.t0 > f.t0)) f = v;
    const el = f && $("placar").querySelector(`[data-cap="${c.id}"]`); if (!el) return "";
    const r = el.getBoundingClientRect(); if (!r.width) return "";
    return `<em class="fala baixo" style="position:absolute;left:${r.left + r.width / 2 + scrollX}px;top:${r.bottom + scrollY + 8}px;bottom:auto;animation-delay:-${Math.round(agora - f.t0)}ms">${esc(f.txt)}</em>`;
  }).join("");
}

// ---------- o elenco ao lado ----------
function renderElenco() {
  const c = verTime && capById(verTime), box = $("teams");
  $("verAnt").classList.toggle("hidden", S.captains.length < 2); $("verProx").classList.toggle("hidden", S.captains.length < 2);
  if (!c) { box.innerHTML = `<p class="muted">Ninguém entrou ainda.</p>`; $("elencoNome").textContent = cap(T().teams); $("elencoDono").textContent = ""; $("btnNome").classList.add("hidden"); return; }
  const mine = c.id === me.capId, FB = isFootball(), cfg = S.config;
  $("elencoDono").textContent = mine ? "Seu time" : `Time de ${c.name}`;
  $("elencoNome").textContent = nomeTime(c);
  $("btnNome").classList.toggle("hidden", !mine);
  let topo = "";
  if (FB && c.team.length) {
    const E = lineupOf(c), pct = (v) => Math.max(4, Math.min(100, ((v - 50) / 45) * 100)).toFixed(0);
    topo = `<div class="forca"><div><small>Ataque</small><b>${Math.round(E.att)}</b><i style="--v:${pct(E.att)}%"></i></div><div><small>Defesa</small><b>${Math.round(E.def)}</b><i style="--v:${pct(E.def)}%"></i></div>`
      + `<div class="q-${CHEM_CLS(E.chem)}" title="Química: linhas verdes (mesmo país e mesmo clube), amarelas (mesmo país ou mesmo clube) e vermelhas (nada em comum)"><small>Química</small><b>${c.team.length > 1 ? E.chem : "–"}</b><i style="--v:${c.team.length > 1 ? E.chem : 0}%"></i></div></div>`;
  }
  const falta = needsOf(c), faltaHTML = falta.length && c.team.length < cfg.perTeam ? `<div class="falta">${ic("alerta")}Falta: ${esc(falta.join(", "))}</div>` : "";
  box.innerHTML = `<div class="time-card" data-team="${c.id}">${topo}${faltaHTML}${FB ? pitchHTML(c) : skinNow ? dishHTML(c) : listaHTML(c)}</div>`;
  if (verAntes !== null && verAntes !== c.id) { box.classList.remove("entra"); void box.offsetWidth; box.classList.add("entra"); }
  verAntes = c.id;
}
// temas sem campinho e sem prato: as vagas numa lista
function listaHTML(c) {
  return `<ol class="slots">${Array.from({ length: S.config.perTeam }, (_, i) => {
    const x = c.team[i]; if (!x) return `<li class="empty"><span>vaga</span><span></span></li>`;
    const key = c.id + "|" + x.player, ch = chegada(key);
    return `<li class="${ch.cls}" style="${ch.style.replace(/^;/, "")}" data-item="${escA(Ratings.parseItem(x.player).name)}"><span>${esc(x.player)}</span><span>${moedaHTML}${x.price}</span>${balao(key)}</li>`;
  }).join("")}</ol>`;
}
function verOutro(passo) {
  const ids = S.captains.map((c) => c.id), i = ids.indexOf(verTime);
  verTime = ids[(i + passo + ids.length) % ids.length]; nomeAberto = false; render();
}
$("verAnt").onclick = () => verOutro(-1);
$("verProx").onclick = () => verOutro(1);
$("btnNome").onclick = () => { nomeAberto = !nomeAberto; render(); if (nomeAberto) $("teamNameIn").focus(); };

// ---------- o lance ----------
function renderAcao() {
  const st = S, cfg = st.config, cur = st.current, mine = me.capId && capById(me.capId), OPEN = cfg.mode === "open";
  const vivo = st.phase === "bidding" && cur && !spinning;
  $("finalMsg").classList.toggle("hidden", !(vivo && cur.finalStretch));
  // lance aberto: o maior lance (pula quando muda) e os últimos lances
  $("openInfo").classList.toggle("hidden", !(OPEN && vivo));
  if (OPEN && vivo) {
    const h = cur.high, hb = $("highBox"), chave = cur.player + "|" + (h ? h.id + ":" + h.amount : "-");
    if (hb.dataset.k !== chave) {
      const bump = !!h && (hb.dataset.k || "").startsWith(cur.player + "|");
      hb.dataset.k = chave; hb.className = "maior" + (h && h.id === me.capId ? " meu" : "");
      const hc = h && capById(h.id);
      hb.innerHTML = hc ? `${avatar(hc)}<div><div class="maior-lbl">Maior lance</div><div class="maior-quem">${esc(hc.name)}${hc.id === me.capId ? " (você)" : ""}</div></div><div class="maior-num">${moedaHTML}${h.amount}</div>`
        : `<span class="av" style="--c:#24372d;color:var(--acc)">${ic("martelo")}</span><div><div class="maior-lbl">Ninguém deu lance</div><div class="maior-quem">Abre com ${cfg.minBid}</div></div><div class="maior-num">–</div>`;
      if (bump) { void hb.offsetWidth; hb.classList.add("bump"); }
    }
    const fd = $("feed"), n = cur.feed.length;
    if (fd.dataset.k !== cur.player + "|" + n) {
      const novo = (fd.dataset.k || "").startsWith(cur.player + "|"); fd.dataset.k = cur.player + "|" + n;
      fd.innerHTML = cur.feed.slice(-6).reverse().map((f, i) => { const c = capById(f.id); return c ? `<span class="${i === 0 && novo ? "novo" : ""}">${avatar(c)}${f.amount}</span>` : ""; }).join("");
    }
  }
  // o painel do lance
  const need = OPEN && cur ? (cur.high ? cur.high.amount + 1 : cfg.minBid) : cfg.minBid;
  const canBid = mine && vivo && cur.eligible.includes(me.capId) && (OPEN
    ? !cur.passed[me.capId] && !(cur.high && cur.high.id === me.capId) && maxBidFor(mine) >= need
    : !cur.bids[me.capId]);
  const painel = $("bidPanel"), abriu = canBid && painel.classList.contains("hidden");
  painel.classList.toggle("hidden", !canBid);
  if (canBid) {
    const mx = maxBidFor(mine), mn = OPEN ? need : cfg.minBid, inp = $("bidAmt");
    $("bidLabel").textContent = OPEN ? (cur.high ? "Cobrir o lance" : "Abrir o lance") : "Seu lance (secreto)";
    $("btnBid").textContent = OPEN && cur.high ? "Cobrir" : "Dar lance";
    inp.min = mn; inp.max = mx;
    if (abriu || !inp.value || +inp.value < mn || +inp.value > mx) inp.value = mn;
    $("bidLimits").textContent = `mín. ${mn} · máx. ${mx}`;
    $("btnSkip").innerHTML = OPEN ? `${ic("sair")}Sair` : `${ic("pular")}Pular (${mine.skipsLeft})`;
    $("btnSkip").disabled = !OPEN && mine.skipsLeft <= 0;
    const qs = [...new Set((OPEN ? [need, need + 1, need + 2, need + 5] : [cfg.minBid, 3, 5, 10, 15]).concat(mx).filter((v) => v >= mn && v <= mx))].sort((a, b) => a - b);
    const html = qs.map((v) => `<button type="button" class="${v === mx ? "tudo" : ""}" data-v="${v}">${v === mx ? `Tudo (${v})` : v}</button>`).join("");
    if ($("quick").dataset.html !== html) { $("quick").innerHTML = html; $("quick").dataset.html = html; }
  }
  // o recado para mim
  const ms = $("myStatus"), dizer = (icone, txt, cls = "") => { const h = `${ic(icone)}<span>${txt}</span>`; ms.className = "status" + (cls ? " " + cls : ""); if (ms.dataset.h !== h) { ms.innerHTML = h; ms.dataset.h = h; } };
  if (mine && vivo) {
    if (!cur.eligible.includes(me.capId)) dizer("cadeado", esc(blockReason(mine, cur.player)));
    else if (OPEN && cur.high && cur.high.id === me.capId) dizer("raio", `Você está na frente com <b>${cur.high.amount}</b>! Se ninguém cobrir até o tempo acabar, ele é seu.`, "good");
    else if (OPEN && cur.passed[me.capId]) dizer("sair", "Você saiu desta disputa.");
    else if (OPEN && maxBidFor(mine) < need) dizer("moeda", "Você não tem moedas para cobrir este lance.");
    else if (!OPEN && cur.bids[me.capId]) { const b = cur.bids[me.capId]; dizer(b.skip ? "pular" : "cadeado", b.skip ? "Você pulou. Aguardando os outros…" : `Seu lance de <b>${b.amount}</b> está guardado em segredo. Aguardando os outros…`, b.skip ? "" : "good envelope"); }
    else { ms.className = "status hidden"; ms.dataset.h = ""; }
  } else if (!mine && vivo) dizer("olho", "Você está só assistindo.");
  else { ms.className = "status hidden"; ms.dataset.h = ""; }
}
$("quick").addEventListener("click", (e) => {
  const b = e.target.closest("[data-v]"); if (!b) return;
  $("bidAmt").value = b.dataset.v;
  $("bidAmt").animate([{ transform: "scale(1.25)", color: "#fff" }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,1.5,.4,1)" });
});

// o tempo: a barra encolhendo e os segundos; nos últimos 5 fica vermelho e pulsa
let timerH = null;
function tickTimer() {
  clearInterval(timerH);
  const wrap = $("timerWrap"), d = S && S.phase === "bidding" && S.current && S.current.deadline;
  if (!d || spinning) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  const total = Math.max(1, S.config.timer) * 1000;
  const upd = () => {
    const ms = Math.max(0, d - (Date.now() + clockSkew)), s = Math.ceil(ms / 1000);
    $("timer").textContent = s + "s"; $("timerBar").style.transform = `scaleX(${Math.min(1, ms / total)})`; wrap.classList.toggle("quente", s <= 5);
  };
  upd(); timerH = setInterval(upd, 200);
}

// ---------- a barra do organizador ----------
function renderDoca() {
  const st = S, p = st.phase, t = T(), OPEN = st.config.mode === "open";
  $("hostBar").classList.toggle("hidden", !me.host); document.body.classList.toggle("anfitriao", !!me.host);
  if (!me.host) return;
  $("hStart").classList.toggle("hidden", p !== "lobby");
  $("hSpin").classList.toggle("hidden", !["idle", "reveal"].includes(p));
  $("hSpinTxt").textContent = p === "reveal" ? `Próximo ${t.item}` : `Sortear ${t.item}`;
  $("hReveal").classList.toggle("hidden", p !== "bidding");
  $("hReveal").disabled = spinning;
  $("hRevealTxt").textContent = OPEN ? "Bater o martelo" : "Revelar lances";
  $("hUndo").classList.toggle("hidden", !["idle", "reveal"].includes(p));
  $("hUnsold").classList.toggle("hidden", !st.unsold.length || p === "bidding" || p === "lobby");
  $("hUnsoldTxt").textContent = `Sem dono (${st.unsold.length})`;
  $("hFinish").classList.toggle("hidden", p === "lobby" || p === "done");
  $("hPos").classList.toggle("hidden", p !== "done");
  $("hPosTxt").textContent = isFootball() ? "Campeonato" : skinNow ? "Votação" : "Resultado";
  $("resetBox").classList.toggle("hidden", p === "lobby");
  const algum = ["hUndo", "hUnsold", "hFinish", "hTrocas"].some((id) => !$(id).classList.contains("hidden"));
  $("hostBar").querySelector(".sep").classList.toggle("hidden", !algum);
}
$("hPos").onclick = () => $("pos").scrollIntoView({ behavior: "smooth", block: "start" });

// ---------- depois do leilão ----------
function renderPos() {
  const st = S, t = T(), done = st.phase === "done", mine = me.capId && capById(me.capId);
  const voto = st.judge && st.judge.status === "voting", troca = st.trocas && st.trocas.aberto && mine;
  $("pos").classList.toggle("hidden", !((me.host && done) || voto || troca));
  $("exportCard").classList.toggle("hidden", !(me.host && done));
  $("posTit").textContent = isFootball() ? "Hora do campeonato" : skinNow ? "Hora da batalha" : "Os times";
  $("promptText").textContent = buildPrompt();
  $("exportText").textContent = st.captains.map((c) => [c.teamName || `${t.prefix} ${c.name}`, ...c.team.map((x) => x.player.replace(/\s*\([^)]*\)\s*$/, ""))].join("\n")).join("\n\n");
}

// ---------- a gaveta: as regras da sala, a lista, os sem dono e o histórico ----------
function renderInfo() {
  const st = S, cfg = st.config, t = T(), mine = me.capId && capById(me.capId), OPEN = cfg.mode === "open", comp = cfg.comp || { mode: "free" };
  $("rRole").textContent = (me.host ? "Organizador" : "") + (me.host && mine ? " · " : "") + (mine ? mine.name : me.host ? "" : "Espectador");
  const rs = [[Icones.deTema(t), t.label || cap(t.teams)], [OPEN ? "martelo" : "cadeado", OPEN ? "Lance aberto" : "Lance secreto"], ["galera", `${cfg.perTeam} por ${t.team}`],
    ["moeda", `${cfg.coins} moedas`], ["raio", `lance mínimo ${cfg.minBid}`]];
  if (!OPEN) rs.push(["pular", `${cfg.skips} pulo${cfg.skips === 1 ? "" : "s"}`]);
  if (cfg.timer) rs.push(["relogio", `${cfg.timer}s${OPEN ? " por lance" : ""}`]);
  if (["futsal", "futebol"].includes(t.prompt)) rs.push(["campo", cfg.formLock === "locked" ? "formação travada" : "formação fluida"]);
  if (st.poolHidden) rs.push(["olho", "roleta oculta"]);
  if (comp.mode !== "free") rs.push(["lista", comp.mode === "exact" ? `composição: ${fmtCats(comp.slots)}` : `obrigatório: ${fmtCats(comp.req)}`]);
  $("rRules").innerHTML = rs.map(([i, x]) => `<span>${ic(i)}${esc(x)}</span>`).join("");
  $("poolN").textContent = st.poolCount;
  $("poolChips").innerHTML = st.poolHidden ? `<span class="muted">Roleta oculta: cada ${esc(t.item)} só aparece quando for sorteado.</span>`
    : st.pool.map((p) => `<span>${esc(p)}${isFootball() ? ` <b class="ovr${Ratings.ratingOf(p).est ? " est" : ""}">${Ratings.ratingOf(p).ovr}</b>` : ""}</span>`).join("");
  $("unsoldWrap").classList.toggle("hidden", !st.unsold.length);
  $("unsoldN").textContent = st.unsold.length;
  $("unsoldChips").innerHTML = st.unsold.map((p) => `<span>${esc(p)}</span>`).join("");
  $("log").innerHTML = st.log.map((l) => `<div>${esc(l.msg)}</div>`).join("");
}
const gaveta = (on) => document.body.classList.toggle("gaveta-aberta", on);
$("btnLista").onclick = () => gaveta(true);
$("btnFecharGaveta").onclick = () => gaveta(false);
$("gavetaFundo").onclick = () => gaveta(false);
addEventListener("keydown", (e) => { if (e.key === "Escape") gaveta(false); });
