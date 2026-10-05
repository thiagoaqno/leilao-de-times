// Rumi da Galera — o jogo no navegador: entrar na sala, sala de espera, a mesa e o suporte. As regras (o que vale e
// o que não vale) vêm de regras.js (window.Rumi), as mesmas do servidor: a mesa mostra na hora se está valendo.
// Na sua vez você mexe numa cópia da mesa (o "rascunho"): toca nas peças para escolher e depois numa combinação, em
// "nova combinação" ou no suporte. Cada mudança vai para o servidor, que mostra para todo mundo ao vivo; só vale
// quando você confirma (o servidor confere de novo).
(function () {
  const R = window.Rumi, { $, h, store } = Comum;
  const toast = Comum.criarToast(3200), socket = io("/rumi"), act = Comum.criarAct(socket, toast), relogio = Comum.relogio();
  let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
  const P = {}; // id -> peça (vai sendo conhecida pelo que chega do servidor)
  // o rascunho da minha vez: mesa e mão do jeito que estou mexendo; sel: peças escolhidas; ordem: a do meu suporte
  // animação das peças: as que acabaram de chegar na mesa (ou na mão) entram com um quique. "vistas" guarda o que já
  // estava na tela (da rodada atual); no primeiro desenho de uma rodada, as peças da mão chegam uma a uma.
  const vistas = { rodada: null, mesa: new Set(), mao: new Set() };
  let RAS = null, sel = new Set(), ordemMao = [], vezChave = null, rascunhoAlheio = null, pegandoAlheio = new Set();

  // ---------- peça ----------
  const peca = (t, extra = "") => `<div class="peca ${t.c} ${extra}" data-id="${t.id}"><b>${t.n ? t.n : "☺"}</b><i></i></div>`;
  const conhecer = (lista) => { for (const t of lista || []) P[t.id] = t; };
  $("vitrine").innerHTML = [{ id: -1, n: 7, c: "v" }, { id: -2, n: 8, c: "v" }, { id: -3, n: 9, c: "v" }, { id: -4, n: 0, c: "j" }, { id: -5, n: 11, c: "a" }, { id: -6, n: 11, c: "m" }, { id: -7, n: 11, c: "p" }].map((t) => peca(t)).join("");

  // ---------- telas ----------
  function show(id) { for (const s of ["home", "lobby", "game"]) $(s).classList.toggle("hidden", s !== id); }
  const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
  const seg = (el, ops, atual, attr, dis) => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
  function renderLobby() {
    const isHost = ME && S.host === ME.id, dis = isHost ? "" : "disabled", humanos = S.players.filter((p) => !p.bot).length;
    $("count").textContent = `(${humanos} + ${S.config.robos} robô${S.config.robos === 1 ? "" : "s"}, máx. 4)`;
    $("plist").innerHTML = S.players.filter((p) => !p.bot).map((p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.avatar} ${p.id === S.host ? "👑 " : ""}${h(p.name)}${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" style="margin-left:auto">✕</button>` : ""}</div>`).join("")
      + Array.from({ length: S.config.robos }, (_, i) => `<div class="pl muted">🤖 Robô ${i + 1}</div>`).join("");
    seg("cTempo", [[60, "1 min"], [90, "1,5 min"], [120, "2 min"], [0, "Sem limite"]], S.config.tempo, "data-tempo", dis);
    seg("cRodadas", [[1, "1 rodada"], [3, "3 rodadas"], [5, "5 rodadas"]], S.config.rodadas, "data-rodadas", dis);
    seg("cRobos", Array.from({ length: Math.max(1, 5 - humanos) }, (_, i) => [i, String(i)]).slice(0, 4), S.config.robos, "data-robos", dis);
    $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">🀄 Distribuir as peças</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
    if ($("btnStart")) $("btnStart").onclick = () => act("start");
  }
  const setCfg = (c) => { const cfg = { ...S.config, ...c }; store.set("rumi:cfg", cfg); act("config", { config: cfg }); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.tempo && S) setCfg({ tempo: +b.dataset.tempo });
    else if (b.dataset.rodadas && S) setCfg({ rodadas: +b.dataset.rodadas });
    else if (b.dataset.robos != null && S && b.dataset.robos !== undefined) setCfg({ robos: +b.dataset.robos });
    else if (b.dataset.kick) act("kick", { id: b.dataset.kick });
  });

  // ---------- rede ----------
  $("hName").value = store.get("galera:name") || "";
  if (urlCode) $("hCode").value = urlCode.toUpperCase();
  function enter(r) {
    if (!r.ok) { $("hErr").textContent = r.error; return; }
    ME = { code: r.code, id: r.id, token: r.token };
    if (r.id) store.set("rumi:" + r.code, ME);
    history.replaceState(null, "", "/rumi/?sala=" + r.code);
    $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
  }
  $("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: store.get("rumi:cfg") || {} }, enter); };
  $("btnJoin").onclick = () => {
    const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
    if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
    const saved = store.get("rumi:" + code) || {};
    socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
  };
  $("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
  $("btnInvite").onclick = async () => { const link = location.origin + "/rumi/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
  socket.on("connect", () => {
    const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("rumi:" + code);
    if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
    else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
    else show("home");
  });
  socket.on("removido", () => { toast("O organizador tirou você da mesa."); ME = null; S = null; history.replaceState(null, "", "/rumi/"); $("roomTag").classList.add("hidden"); show("home"); });
  socket.on("state", (st) => {
    relogio.doEstado(st.now);
    const antes = S; S = st;
    if (st.rodada) { conhecer(st.rodada.mesa.flat()); if (st.rodada.rascunho) conhecer(st.rodada.rascunho.flat()); }
    if (st.minhaMao) conhecer(st.minhaMao);
    if (st.phase === "lobby") { RAS = null; $("over").classList.add("hidden"); show("lobby"); renderLobby(); return; }
    show("game");
    // a minha mão: mantém a ordem que arrumei no suporte (as novas entram no fim)
    const ids = (st.minhaMao || []).map((t) => t.id);
    ordemMao = [...ordemMao.filter((id) => ids.includes(id)), ...ids.filter((id) => !ordemMao.includes(id))];
    // começou a minha vez: rascunho novo (cópia da mesa e da mão); acabou: some
    const r = st.rodada, minha = st.phase === "jogando" && ME && r.vez === ME.id, chave = minha ? `${r.no}|${r.mesa.length}|${ids.length}|${r.monte}` : null;
    if (minha && chave !== vezChave) { RAS = { mesa: r.mesa.map((g) => g.map((t) => t.id)), mao: [...ids] }; sel.clear(); }
    if (!minha) { RAS = null; sel.clear(); }
    vezChave = chave;
    if (!r.rascunho || minha) { rascunhoAlheio = null; pegandoAlheio = new Set(); }
    else rascunhoAlheio = r.rascunho.map((g) => g.map((t) => t.id));
    if (antes && antes.rodada && r.ultima && JSON.stringify(r.ultima) !== JSON.stringify(antes.rodada.ultima) && r.ultima.tipo === "jogou" && r.ultima.primeira) toast(`🎉 ${nomeDe(r.ultima.quem)} abriu o jogo!`);
    if (minha && (!antes || !antes.rodada || antes.rodada.vez !== ME.id)) toast("Sua vez!");
    desenhar();
    if (st.phase === "intervalo" || st.phase === "fim") mostrarFim(); else $("over").classList.add("hidden");
  });
  socket.on("rascunho", (d) => { if (!ME || d.quem !== ME.id) { conhecer(d.mesa.flat()); rascunhoAlheio = d.mesa.map((g) => g.map((t) => t.id)); pegandoAlheio = new Set(d.pegando || []); desenhar(); } });
  const nomeDe = (id) => { const p = S && S.players.find((x) => x.id === id); return p ? p.name : "?"; };

  // ---------- desenho ----------
  const P_ = (id) => P[id];
  function conferirRascunho() {
    if (!RAS) return null;
    const me = myP();
    return R.conferir(S.rodada.mesa.map((g) => g.map((t) => t.id)), S.minhaMao.map((t) => t.id), RAS.mesa, me && me.abriu, P);
  }
  function desenhar() {
    if (!S || !S.rodada) return;
    const r = S.rodada, minha = !!RAS, agora = relogio.agora();
    // jogadores no topo (com a barrinha do tempo de quem está na vez)
    $("topo").innerHTML = S.players.map((p) => {
      const vez = r.vez === p.id, pr = S.prazo && S.prazo.quem === p.id && S.prazo.ate ? Math.max(0, (S.prazo.ate - agora) / S.prazo.total) : null;
      return `<div class="jog ${vez ? "vez" : ""}"><span class="av">${p.avatar}</span><div>${h(p.name)}${ME && p.id === ME.id ? " (você)" : ""}<small>${p.n} peça${p.n === 1 ? "" : "s"}${p.abriu ? "" : " · não abriu"} · ${p.total} pts</small></div>${pr != null ? `<span class="barra" data-ate="${S.prazo.ate}" data-total="${S.prazo.total}" style="width:${pr * 100}%"></span>` : ""}</div>`;
    }).join("") + `<div class="monte">🂠 ${r.monte} no monte · rodada ${r.no}/${S.config.rodadas}</div>`;
    // a mesa: a minha cópia (se é a minha vez), o rascunho de quem está jogando, ou a mesa de verdade
    const grupos = minha ? RAS.mesa : rascunhoAlheio || r.mesa.map((g) => g.map((t) => t.id));
    const naMesa = new Set(r.mesa.flat().map((t) => t.id));
    const daMao = new Set(minha ? S.minhaMao.map((t) => t.id) : rascunhoAlheio ? rascunhoAlheio.flat().filter((id) => !naMesa.has(id)) : []);
    let html = "";
    if (rascunhoAlheio && !minha) { const n = daMao.size; html = `<div class="quem ao-vivo">✋ <b>${h(nomeDe(r.vez))}</b> está mexendo na mesa ${n ? `· já pôs ${n} peça${n === 1 ? "" : "s"} da mão (em verde)` : "· ainda sem peça nova"} · só vale quando confirmar</div>`; }
    html += grupos.map((g, gi) => {
      const av = R.avaliar(g.map(P_)), ordem = minha ? g.map(P_) : av.ok ? av.ordem : g.map(P_);
      const mais = minha && sel.size ? `<div class="poe" data-poe="${gi}" title="Pôr as peças escolhidas aqui">＋</div>` : "";
      return `<div class="grupo ${minha ? "alvo" : ""} ${av.ok ? "ok" : "ruim"}" data-g="${gi}">${ordem.map((t) => peca(t, `${sel.has(t.id) || (!minha && pegandoAlheio.has(t.id)) ? "sel" : ""} ${daMao.has(t.id) ? "nova" : ""}`)).join("")}${mais}</div>`;
    }).join("");
    if (minha) html += `<div class="novo" data-novo="1">＋ nova combinação</div>`;
    if (!grupos.length && !minha) html += `<div class="quem">A mesa está vazia. A primeira descida precisa de 30 pontos.</div>`;
    $("mesa").innerHTML = html;
    // peças que não estavam na mesa no desenho anterior: entram com um quique (uma depois da outra)
    const novaRodada = vistas.rodada !== r.no; if (novaRodada) { vistas.rodada = r.no; vistas.mesa = new Set(); vistas.mao = null; }
    let k = 0;
    $("mesa").querySelectorAll(".peca").forEach((el) => { const id = +el.dataset.id; if (!vistas.mesa.has(id) && !novaRodada) { el.classList.add("chega"); el.style.animationDelay = `${(k++ % 14) * 55}ms`; } });
    vistas.mesa = new Set(grupos.flat());
    // o suporte
    const mao = minha ? ordemMao.filter((id) => RAS.mao.includes(id)) : ordemMao;
    // na mão: a peça que acabou de chegar (comprada do monte) desliza para o suporte; no começo da rodada, chegam todas,
    // uma depois da outra. Conta a mão de verdade (ordemMao): peça que sai para a mesa e volta não anima de novo.
    const primeira = vistas.mao === null, chegaram = new Set(ordemMao.filter((id) => primeira || !vistas.mao.has(id)));
    vistas.mao = new Set(ordemMao);
    let kk = 0;
    $("suporte").innerHTML = mao.map((id) => P[id] ? peca(P[id], (sel.has(id) ? "sel " : "") + (chegaram.has(id) && ME && ME.id ? "comprou" : "")).replace('class="peca', chegaram.has(id) ? `style="animation-delay:${(kk++) * (primeira ? 45 : 0)}ms" class="peca` : 'class="peca') : "").join("") || `<span class="muted">${ME && ME.id ? "" : "Você está assistindo."}</span>`;
    // botões e o aviso
    const c = minha ? conferirRascunho() : null, me = myP();
    $("btnOk").disabled = !minha || !c || !c.ok; $("btnDesfaz").disabled = !minha; $("btnCompra").disabled = !minha;
    let aviso = "", classe = "";
    if (minha) {
      const usadas = RAS.mesa.flat().filter((id) => daMao.has(id));
      if (!usadas.length) aviso = "Sua vez: baixe peças (toque nelas e depois numa combinação) ou compre.";
      else if (c.ok) { aviso = "✅ Está valendo: pode confirmar."; classe = "bom"; }
      else { aviso = "❌ " + c.motivo; classe = "ruim"; }
      if (me && !me.abriu) { const novas = RAS.mesa.filter((g) => g.every((id) => daMao.has(id))), soma = novas.reduce((s, g) => { const a = R.avaliar(g.map(P_)); return s + (a.ok ? a.valor : 0); }, 0); aviso += ` · Primeira descida: ${soma}/${R.ABERTURA}`; }
    } else if (S.phase === "jogando") aviso = `Vez de ${h(nomeDe(r.vez))}.`;
    $("aviso").innerHTML = aviso; $("aviso").className = "aviso " + classe;
  }
  // a barrinha do tempo anda sozinha
  setInterval(() => { const agora = relogio.agora(); document.querySelectorAll(".jog .barra").forEach((b) => (b.style.width = Math.max(0, ((+b.dataset.ate - agora) / +b.dataset.total) * 100) + "%")); }, 250);

  // ---------- mexer nas peças (só na minha vez) ----------
  function onde(id) { // em que combinação do rascunho está a peça (-1: no suporte)
    return RAS.mesa.findIndex((g) => g.includes(id));
  }
  let envio = null;
  function enviar() { clearTimeout(envio); envio = setTimeout(() => RAS && socket.emit("rascunho", { mesa: RAS.mesa, pegando: [...sel].filter((id) => onde(id) >= 0) }), 120); }
  function mudou() { sel.clear(); desenhar(); enviar(); }
  function tirarSelecionadas() { const ids = [...sel]; RAS.mesa = RAS.mesa.map((g) => g.filter((id) => !sel.has(id))).filter((g) => g.length); RAS.mao = RAS.mao.filter((id) => !sel.has(id)); return ids; }
  $("mesa").addEventListener("click", (e) => {
    if (!RAS) return;
    // tocar numa peça só escolhe (ou desescolhe); o "＋" no fim de uma combinação (ou o fundo dela) põe as escolhidas lá
    const t = e.target.closest(".peca"), poe = e.target.closest("[data-poe]"), g = e.target.closest(".grupo"), novo = e.target.closest("[data-novo]");
    if (t) { const id = +t.dataset.id; if (sel.has(id)) sel.delete(id); else sel.add(id); desenhar(); enviar(); return; }
    const destino = poe ? +poe.dataset.poe : g ? +g.dataset.g : null;
    if (destino != null && sel.size) { const alvo = RAS.mesa[destino], ids = tirarSelecionadas(); const gi = RAS.mesa.indexOf(alvo); if (gi >= 0) RAS.mesa[gi].push(...ids); else RAS.mesa.push(ids); mudou(); return; }
    if (novo && sel.size) { const ids = tirarSelecionadas(); RAS.mesa.push(ids); mudou(); return; }
  });
  // no suporte: cada toque soma (ou tira) uma peça da escolha; tocar no fundo do suporte devolve as escolhidas
  $("suporte").addEventListener("click", (e) => {
    if (!RAS) { const t = e.target.closest(".peca"); if (t) { /* fora da vez: só arruma o suporte, arrastando pelos botões */ } return; }
    const t = e.target.closest(".peca");
    if (t && !sel.has(+t.dataset.id) && (onde(+t.dataset.id) < 0)) { sel.add(+t.dataset.id); desenhar(); return; }
    if (t && sel.has(+t.dataset.id)) { sel.delete(+t.dataset.id); desenhar(); return; }
    // toque no suporte com peças escolhidas: as que vieram da minha mão voltam; as da mesa não podem
    if (sel.size) {
      const minhas = new Set(S.minhaMao.map((x) => x.id)), volta = [...sel].filter((id) => minhas.has(id) && onde(id) >= 0);
      if ([...sel].some((id) => !minhas.has(id))) toast("Peça da mesa não pode ir para o seu suporte.");
      if (volta.length) { RAS.mesa = RAS.mesa.map((g) => g.filter((id) => !volta.includes(id))).filter((g) => g.length); RAS.mao.push(...volta); mudou(); }
      else { sel.clear(); desenhar(); }
    }
  });
  $("btnOk").onclick = async () => { if (!RAS) return; const ok = await act("jogar", { mesa: RAS.mesa }); if (ok) { RAS = null; sel.clear(); } };
  $("btnDesfaz").onclick = () => { if (!RAS) return; RAS = { mesa: S.rodada.mesa.map((g) => g.map((t) => t.id)), mao: S.minhaMao.map((t) => t.id) }; mudou(); };
  $("btnCompra").onclick = () => { if (RAS) { RAS = null; act("comprar"); } };
  // arrumar o suporte: por número (7-7-7) ou por cor (7-8-9)
  const ordCor = { v: 0, a: 1, m: 2, p: 3, j: 4 };
  $("btnOrdNum").onclick = () => { ordemMao.sort((a, b) => (P[a].n || 99) - (P[b].n || 99) || ordCor[P[a].c] - ordCor[P[b].c]); desenhar(); };
  $("btnOrdCor").onclick = () => { ordemMao.sort((a, b) => ordCor[P[a].c] - ordCor[P[b].c] || (P[a].n || 99) - (P[b].n || 99)); desenhar(); };

  // ---------- fim da rodada e do jogo ----------
  function mostrarFim() {
    const r = S.rodada, f = r.fim; if (!f) return;
    const isHost = ME && S.host === ME.id, fim = S.phase === "fim";
    const linhas = S.players.map((p) => `<div class="res"><span style="font-size:20px">${p.avatar}</span><b>${h(p.name)}</b>${(r.revela && r.revela[p.id] || []).map((t) => peca(t)).join("").replace(/class="peca/g, 'style="--w:24px" class="peca')}<span class="pts" style="color:${f.pts[p.id] >= 0 ? "var(--good)" : "var(--bad)"}">${f.pts[p.id] > 0 ? "+" : ""}${f.pts[p.id]}</span><span class="muted" style="width:70px;text-align:right">${p.total} no total</span></div>`).join("");
    $("overBox").innerHTML = `<h2>${fim ? `👑 ${h(nomeDe(S.vencedor))} venceu!` : f.como === "bateu" ? `🏆 ${h(nomeDe(f.quem))} bateu!` : "🧱 Acabou o monte"}</h2>
      <p class="muted" style="margin:0 0 8px">Rodada ${r.no} de ${S.config.rodadas}${fim ? " · fim de jogo" : " · a próxima começa já já"}</p>${linhas}
      <div class="row" style="margin-top:14px">${fim ? (isHost ? `<button class="primary" id="btnAgain">Jogar de novo</button><button id="btnLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`) : ""}</div>`;
    $("over").classList.remove("hidden");
    if (fim && ME && S.vencedor === ME.id && !mostrarFim.festa) { mostrarFim.festa = true; Comum.confetti(["#d63031", "#1f6fd1", "#e09a00", "#f8f1df"]); }
    if (!fim) mostrarFim.festa = false;
    if ($("btnAgain")) $("btnAgain").onclick = () => act("start");
    if ($("btnLobby")) $("btnLobby").onclick = () => act("lobby");
  }
  if (!urlCode) show("home");
  if (location.hash === "#debug") window.__rumi = { get S() { return S; }, get RAS() { return RAS; }, P, R, act, socket, desenhar, sel };
})();
