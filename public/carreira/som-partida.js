// O som da partida: o narrador e a torcida. Os áudios saem da ElevenLabs uma vez (ferramentas/gerar-narracao.js,
// GERAR_NARRACAO.bat) e ficam em som/, com o índice window.SOM_PARTIDA (som/indice.js): as falas por chave, a torcida
// por chave e o nome falado de cada clube e jogador. O narrador emenda os pedaços ("GOOOL!" + "Flamengo!" + "Pedro!");
// o jogador sem áudio (os garotos da base) fica sem o nome.
// partida.js chama SomPartida.abrir (ao abrir a partida) e SomPartida.evento (a cada lance que aparece); inicio.js chama
// SomPartida.tela (a cada troca de tela): na partida a música de fundo (musica.js) para e a torcida entra; fora dela,
// tudo para e a música volta. O botão #btnSom troca entre tudo, só a torcida e sem som (carreira:somPartida).
// Só enfeita: nada daqui muda o jogo nem vai para o servidor.
// Outra página (o jogo ao vivo do Road to Champions, public/jogador/road-partida.js) usa o mesmo som com
// SomPartida.configurar({ naPartida, jogo, velocidade }): `jogo()` devolve o jogo que está na tela no formato do `J` da
// Carreira (casa, fora, eventos, i, relogio, pulando, decidindo, completo, peso). Os áudios moram em /carreira/som/.
const SomPartida = (() => {
  const IDX = window.SOM_PARTIDA || null;
  const MODOS = ["tudo", "torcida", "mudo"];
  const ROTULO = { tudo: "Som", torcida: "Torcida", mudo: "Sem som" };
  const DICA = { tudo: "Narrador e torcida (toque para só a torcida)", torcida: "Só a torcida (toque para tirar o som)", mudo: "Sem som (toque para o narrador e a torcida)" };
  let modo = (() => { try { const m = localStorage.getItem("carreira:somPartida"); return MODOS.includes(m) ? m : "tudo"; } catch (e) { return "tudo"; } })();
  // Mesmo padrão do tocador de música: volume individual, salvo neste navegador.
  const VOLUME_CHAVE = "carreira:volumeSom";
  const limitarVolume = (v) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.35;
  let volume = (() => {
    try {
      const salvo = localStorage.getItem(VOLUME_CHAVE);
      return salvo === null ? 0.35 : limitarVolume(Number(salvo));
    } catch (e) { return 0.35; }
  })();

  // ---------- os áudios ----------
  let ctx = null, mestre = null, busVoz = null, busEfeito = null, busAmb = null;
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      mestre = ctx.createGain(); mestre.gain.value = modo === "mudo" ? 0 : volume; mestre.connect(ctx.destination);
      busVoz = ctx.createGain(); busVoz.gain.value = modo === "tudo" ? 1 : 0; busVoz.connect(mestre);
      busEfeito = ctx.createGain(); busEfeito.gain.value = 0.8; busEfeito.connect(mestre);
      busAmb = ctx.createGain(); busAmb.gain.value = 0; busAmb.connect(mestre);
    } catch (e) { ctx = null; }
    return ctx;
  }
  // o navegador só deixa tocar depois de um toque ou tecla, e o iPhone só destrava dentro do próprio toque (touchend,
  // click): o som é ligado já no primeiro toque em qualquer tela (o "Jogar" da sede), antes de a partida abrir, e cada
  // toque depois destrava de novo se ele suspender. No iPhone, "playback" faz tocar mesmo com a chave do silencioso.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* navegador sem a opção */ }
  const destravar = () => {
    if (!IDX || modo === "mudo" || !audio() || ctx.state === "running") return;
    ctx.resume().catch(() => {});
    // um silêncio curtinho dentro do toque: o Safari antigo só libera o som depois de tocar alguma coisa
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) { /* tanto faz */ }
  };
  for (const ev of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) addEventListener(ev, destravar, { passive: true });

  const buffers = new Map();
  function carregar(rel) {
    if (!rel) return Promise.resolve(null);
    if (!buffers.has(rel)) {
      buffers.set(rel, fetch(`/carreira/som/${rel}`).then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => (b && audio() ? new Promise((ok) => ctx.decodeAudioData(b, ok, () => ok(null))) : null)).catch(() => null));
    }
    return buffers.get(rel);
  }
  // uma das versões da chave, sem repetir a última
  const ultimaVersao = {};
  function versao(grupo, chave) {
    const l = IDX && IDX[grupo] && IDX[grupo][chave];
    if (!l || !l.length) return null;
    let i = Math.floor(Math.random() * l.length);
    if (l.length > 1 && i === ultimaVersao[grupo + chave]) i = (i + 1) % l.length;
    ultimaVersao[grupo + chave] = i;
    return l[i];
  }
  const fala = (k) => versao("falas", k);
  const nomeJog = (id) => (IDX && id != null && IDX.jogadores[id]) || null;
  const nomeClube = (id) => (IDX && id != null && IDX.clubes[id]) || null;
  const placar = (p) => (p && p[0] <= 5 && p[1] <= 5 ? fala(`placar_${p[0]}_${p[1]}`) : null);

  // ---------- a torcida ----------
  const laco = { ambiente: null, canto: null }, ganhoLaco = { ambiente: null, canto: null };
  async function ligarLaco(k) {
    if (laco[k] || !audio()) return;
    laco[k] = "carregando";
    const b = await carregar(versao("torcida", k));
    if (!b || laco[k] !== "carregando") { if (laco[k] === "carregando") laco[k] = null; return; }
    const g = ctx.createGain(); g.gain.value = 0; g.connect(busAmb);
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g);
    s.start(0, Math.random() * b.duration); // cada jogo começa num ponto do laço
    laco[k] = s; ganhoLaco[k] = g;
  }
  function desligarLacos() {
    for (const k of Object.keys(laco)) {
      const s = laco[k]; laco[k] = null;
      if (s && s !== "carregando") { try { ganhoLaco[k].gain.setTargetAtTime(0, ctx.currentTime, 0.3); s.stop(ctx.currentTime + 1.5); } catch (e) { /* já parou */ } }
      ganhoLaco[k] = null;
    }
  }
  const rampa = (param, alvo, t = 0.4) => { if (param) try { param.setTargetAtTime(alvo, ctx.currentTime, t); } catch (e) { /* contexto fechado */ } };
  async function efeito(k, volume = 1) {
    if (modo === "mudo" || !audio() || ctx.state !== "running") return;
    const b = await carregar(versao("torcida", k));
    if (!b) return;
    const g = ctx.createGain(); g.gain.value = volume; g.connect(busEfeito);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(g); s.start();
  }

  // ---------- o narrador: uma fila, uma fala por vez ----------
  // cada item: os pedaços (caminhos em som/), a prioridade (3 gol; 2 pênalti, expulsão, fim, disputa; 1 o resto) e a hora
  const fila = [], historico = []; // historico: o que o narrador pediu por último (para conferir nos testes)
  let falando = false, ateQuando = 0;
  function dizer(partes, prio = 1) {
    partes = partes.filter(Boolean);
    if (!partes.length || modo !== "tudo" || !audio()) return;
    if (prio >= 2) for (let i = fila.length - 1; i >= 0; i--) if (fila[i].prio < prio) fila.splice(i, 1); // o lance grande passa na frente
    while (fila.length >= 2) fila.shift(); // sem acumular: a narração não pode ficar atrás do jogo
    fila.push({ partes, prio, t: performance.now() });
    historico.push(partes.join(" + ")); if (historico.length > 30) historico.shift();
    for (const p of partes) carregar(p);
    if (!falando) proxima();
  }
  async function proxima() {
    const item = fila.shift();
    if (!item) { falando = false; return; }
    falando = true;
    if (item.prio < 3 && performance.now() - item.t > 6000) return proxima(); // ficou velho esperando
    const bs = (await Promise.all(item.partes.map(carregar))).filter(Boolean);
    if (!bs.length || !ctx || ctx.state !== "running" || modo !== "tudo") return proxima();
    let t = ctx.currentTime + 0.03;
    for (const b of bs) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(busVoz); s.start(t); t += b.duration + 0.06; }
    ateQuando = performance.now() + (t - ctx.currentTime) * 1000;
    setTimeout(proxima, (t - ctx.currentTime) * 1000);
  }
  function calarNarrador() { fila.length = 0; if (busVoz && ctx) { rampa(busVoz.gain, 0, 0.05); setTimeout(() => { if (modo === "tudo") rampa(busVoz.gain, 1, 0.05); }, 300); } }

  // ---------- o jogo ----------
  // de onde vem o jogo: na Carreira, as variáveis da página (telaAtual, J e Mesa); outra página troca por configurar()
  const F = {
    naPartida: () => typeof telaAtual !== "undefined" && telaAtual === "partida",
    jogo: () => (typeof J === "undefined" ? null : J),
    velocidade: () => { const j = F.jogo(); return !j ? 1 : j.grupo ? (typeof Mesa !== "undefined" && Mesa.vel) || 1 : j.vel || 1; },
  };
  const naPartida = () => F.naPartida();
  const tempo = (e) => e.min + (e.acr ? e.acr / 100 : 0);
  const clubeDo = (lado) => { const j = F.jogo(); return j && (lado === 0 ? j.casa : j.fora); };
  const velocidade = () => F.velocidade();
  // o estado do jogo para o narrador: quem já esteve atrás (para o "virou"), o que já foi dito
  let S = null;
  function abrir(nova) {
    const J = F.jogo();
    if (!IDX || !J) return;
    if (nova || !S) {
      S = { atras: [false, false], virou: false, goleada: false, inicio: true, segundo: false, acrescimos: false, intervalo: false, fim: false };
      fila.length = 0;
      // os nomes que vão aparecer: os dois clubes e quem está nos lances que já chegaram
      if (modo === "tudo") { carregar(nomeClube(J.casa)); carregar(nomeClube(J.fora)); for (const e of J.eventos || []) carregar(nomeJog(e.jogador)); }
    }
    preCarregar();
  }
  // o que toca em todo jogo já fica pronto (sem som, nada baixa; só a torcida, só a torcida)
  const pronto = { torcida: false, falas: false };
  function preCarregar() {
    if (!IDX || modo === "mudo" || !audio()) return;
    if (!pronto.torcida) { pronto.torcida = true; for (const l of Object.values(IDX.torcida)) l.forEach(carregar); }
    if (modo === "tudo" && !pronto.falas) { pronto.falas = true; for (const [k, l] of Object.entries(IDX.falas)) if (!k.startsWith("placar_")) l.forEach(carregar); }
  }

  function evento(e) {
    const J = F.jogo();
    if (!IDX || !S || !J) return;
    // o placar e a virada contam sempre (até no lance pulado), para o narrador não errar depois
    let contexto = null;
    if (e.tipo === "gol" && e.placar) {
      const meu = e.placar[e.lado], dele = e.placar[1 - e.lado], dif = meu - dele;
      if (dif === 0) contexto = "empatou";
      else if (dif === 1 && S.atras[e.lado] && !S.virou) { contexto = "virou"; S.virou = true; }
      else if (dif >= 3 && !S.goleada) { contexto = "goleada"; S.goleada = true; }
      if (dif < 0) S.atras[e.lado] = true; else if (dif > 0) S.atras[1 - e.lado] = true;
    }
    if (e.tipo === "intervalo") S.intervalo = true;
    if (e.tipo === "fim") S.fim = true;
    // o lance que passou faz tempo (pular, chegar com o jogo andando na sala) fica em silêncio
    // (a disputa de pênaltis e o fim não contam: o relógio chega antes deles, que saem um de cada vez)
    const esperado = e.tipo === "fim" || e.tipo.startsWith("disputa");
    if (J.pulando || (!esperado && (J.relogio || 0) - tempo(e) > 4)) return;
    const vel = velocidade(), casa = e.lado === 0;
    let partes = [], prio = 1;
    switch (e.tipo) {
      case "gol": {
        prio = 3;
        const como = { penalti: "gol_penalti", falta: "gol_falta", contra_ataque: "gol_contra_ataque" }[e.como];
        partes = [fala("gol"), nomeClube(clubeDo(e.lado)), nomeJog(e.jogador), como && fala(como), contexto ? fala(contexto) : placar(e.placar)];
        efeito(casa ? "gol" : "gol_fora");
        break;
      }
      case "defesa": partes = [fala(e.como === "penalti" ? "disputa_defesa" : "defesa")]; prio = e.como === "penalti" ? 2 : 1; efeito(casa ? "uh" : "aplauso", 0.8); break;
      case "perdeu":
        if (e.como === "penalti") { partes = [fala("perdeu_penalti"), nomeJog(e.jogador)]; prio = 2; } else partes = [fala("perdeu")];
        if (casa) efeito("uh", 0.8);
        break;
      case "penalti":
        if (e.chute) { partes = [fala("cobranca")]; prio = 2; break; }
        partes = [fala("penalti"), nomeClube(clubeDo(e.lado))]; prio = 2; efeito("tensao", 0.7); efeito("apito", 0.8);
        break;
      case "amarelo": partes = [fala("amarelo"), nomeJog(e.jogador)]; efeito("apito", 0.6); if (casa) efeito("vaia", 0.6); break;
      case "vermelho": partes = [fala(e.como === "segundo_amarelo" ? "segundo_amarelo" : "vermelho"), nomeJog(e.jogador)]; prio = 2; efeito("apito", 0.8); if (casa) efeito("vaia", 0.9); break;
      case "lesao": partes = [fala("lesao")]; break;
      case "sub": partes = [fala("substituicao")]; break;
      case "formacao": partes = [fala("mudanca_tatica")]; break;
      case "contra_ataque": partes = [fala("contra_ataque")]; break;
      case "intervalo": partes = [fala("intervalo"), placar(e.placar)]; prio = 2; efeito("apito_fim"); break;
      case "fim": partes = [fala("fim"), placar(e.placar)]; prio = 2; efeito("apito_fim"); break;
      case "disputa_inicio": partes = [fala("disputa_inicio")]; prio = 2; efeito("tensao", 0.7); break;
      case "disputa":
        partes = [nomeJog(e.jogador), fala(e.entrou ? "disputa_gol" : e.fora ? "disputa_fora" : "disputa_defesa")]; prio = 2;
        efeito(e.entrou ? (casa ? "gol" : "gol_fora") : casa ? "uh" : "aplauso", e.entrou ? 0.7 : 0.8);
        break;
      default: return;
    }
    if (vel > 1 && prio < 2) return; // no 3×, só os lances grandes
    dizer(partes, prio);
  }

  // ---------- o relógio do som: o volume da torcida, o apito do começo e do segundo tempo ----------
  function canto() {
    const J = F.jogo(), tema = J && J.peso && J.peso.tema;
    return tema === "final" || tema === "classico" ? 0.55 : tema === "decisivo" ? 0.4 : 0.18;
  }
  // o navegador barrou o som (Safari e iPhone sem um toque, aba que voltou): o botão vira "Ativar som" até liberar
  const bloqueado = () => !!IDX && modo !== "mudo" && naPartida() && !document.hidden && (!ctx || ctx.state !== "running");
  let mostrandoBloqueio = false;
  function avisarBloqueio() {
    const b = document.getElementById("btnSom"), agora = bloqueado();
    if (!b || agora === mostrandoBloqueio) return;
    mostrandoBloqueio = agora;
    b.classList.toggle("som-bloqueado", agora);
    if (agora) { b.textContent = "Ativar som"; b.title = "O navegador segurou o som: toque para ouvir o narrador e a torcida"; } else aplicar();
  }
  setInterval(() => {
    avisarBloqueio();
    const J = F.jogo();
    if (!ctx || !naPartida() || !J || !S) return;
    if (document.hidden) { if (ctx.state === "running") ctx.suspend().catch(() => {}); return; }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const acabou = J.completo && J.i >= (J.eventos || []).length;
    const narrando = performance.now() < ateQuando;
    // a torcida: baixa na decisão (o jogo parou) e depois do apito final; um pouco mais baixa enquanto o narrador fala
    const base = S.fim || acabou ? 0.25 : J.decidindo ? 0.45 : 1;
    rampa(busAmb.gain, base * (narrando ? 0.6 : 1) * 0.7, 0.5);
    if (ganhoLaco.ambiente) rampa(ganhoLaco.ambiente.gain, 1, 1);
    if (ganhoLaco.canto) rampa(ganhoLaco.canto.gain, S.fim || acabou ? 0.08 : canto(), 1.5);
    const r = J.relogio || 0;
    if (S.inicio && r >= 0) { // o apito inicial, só para quem viu o jogo começar (o relógio negativo é a abertura)
      S.inicio = false;
      if (r < 2 && !J.pulando) { efeito("apito_inicio"); const t = J.peso && J.peso.tema; dizer([fala(["classico", "decisivo", "final"].includes(t) ? t : "inicio")], 2); }
    }
    if (S.intervalo && !S.segundo && r >= 46 && !J.decidindo) { S.segundo = true; efeito("apito_inicio"); dizer([fala("segundo_tempo")], 1); }
    if (!S.acrescimos && !S.fim && r >= 90.3 && !J.decidindo && velocidade() === 1) { S.acrescimos = true; dizer([fala("acrescimos")], 1); }
  }, 250);

  // ---------- as telas e o botão ----------
  function tela(id) {
    if (id === "partida") {
      if (window.MusicaCarreira) MusicaCarreira.calar();
      if (!IDX || modo === "mudo") return;
      if (audio()) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); ligarLaco("ambiente"); ligarLaco("canto"); preCarregar(); }
    } else {
      calarNarrador(); desligarLacos(); S = null;
      if (window.MusicaCarreira) MusicaCarreira.voltar();
    }
  }
  function aplicar() {
    const b = document.getElementById("btnSom");
    if (b && !mostrandoBloqueio) { b.textContent = ROTULO[modo]; b.title = DICA[modo]; }
    if (b) { b.setAttribute("aria-pressed", String(modo !== "mudo")); b.hidden = !IDX; }
    if (!ctx) return;
    rampa(mestre.gain, modo === "mudo" ? 0 : volume, 0.1);
    rampa(busVoz.gain, modo === "tudo" ? 1 : 0, 0.1);
    if (modo !== "tudo") fila.length = 0;
    if (modo === "mudo") desligarLacos(); else if (naPartida()) { ligarLaco("ambiente"); ligarLaco("canto"); preCarregar(); }
  }
  function alternar() {
    modo = MODOS[(MODOS.indexOf(modo) + 1) % MODOS.length];
    try { localStorage.setItem("carreira:somPartida", modo); } catch (e) { /* sem armazenamento */ }
    if (modo !== "mudo" && audio() && ctx.state === "suspended") ctx.resume().catch(() => {});
    aplicar();
  }
  // O slider fica na barra principal, ao lado do botão ♪ Música.
  // Controla um único gain mestre: narrador, torcida e efeitos juntos, também durante a partida.
  let controleVolume = null, indicadorVolume = null, abrirVolume = null, painelVolume = null;
  function pintarVolume() {
    if (controleVolume) controleVolume.value = String(Math.round(volume * 100));
    if (indicadorVolume) indicadorVolume.textContent = Math.round(volume * 100) + "%";
    if (abrirVolume) abrirVolume.setAttribute("aria-label", "Volume dos sons: " + Math.round(volume * 100) + "%");
  }
  function definirVolume(valor) {
    volume = limitarVolume(Number(valor));
    try { localStorage.setItem(VOLUME_CHAVE, String(volume)); } catch (e) { /* sem armazenamento */ }
    if (mestre && ctx) rampa(mestre.gain, modo === "mudo" ? 0 : volume, 0.04);
    pintarVolume();
  }
  const barra = document.getElementById("barra");
  if (barra && IDX) {
    abrirVolume = document.createElement("button");
    abrirVolume.type = "button";
    abrirVolume.className = "som-volume-bt";
    abrirVolume.innerHTML = '<span aria-hidden="true">🔊</span><span class="som-volume-nome">Sons</span>';
    abrirVolume.setAttribute("aria-expanded", "false");
    abrirVolume.setAttribute("aria-controls", "som-volume-painel");
    painelVolume = document.createElement("div");
    painelVolume.id = "som-volume-painel";
    painelVolume.className = "som-volume-painel";
    painelVolume.setAttribute("role", "group");
    painelVolume.setAttribute("aria-label", "Volume dos sons da partida");
    painelVolume.innerHTML = '<label for="som-volume-range">Volume dos sons</label>' +
      '<div class="som-volume-linha"><span aria-hidden="true">🔈</span>' +
      '<input id="som-volume-range" type="range" min="0" max="100" step="1" aria-label="Volume do narrador, torcida e efeitos">' +
      '<output id="som-volume-numero" for="som-volume-range">35%</output></div>' +
      '<small>Narração, torcida e efeitos. Independente da música.</small>';
    controleVolume = painelVolume.querySelector("input");
    indicadorVolume = painelVolume.querySelector("output");
    barra.insertBefore(abrirVolume, document.getElementById("conexao"));
    document.body.appendChild(painelVolume);
    controleVolume.addEventListener("input", (e) => definirVolume(Number(e.target.value) / 100));
    const abrirFechar = (mostrar) => {
      painelVolume.classList.toggle("on", mostrar);
      abrirVolume.setAttribute("aria-expanded", String(mostrar));
    };
    abrirVolume.addEventListener("click", () => abrirFechar(!painelVolume.classList.contains("on")));
    document.addEventListener("pointerdown", (e) => {
      if (!painelVolume.contains(e.target) && !abrirVolume.contains(e.target)) abrirFechar(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrirFechar(false); });
    pintarVolume();
  }
  const bt = document.getElementById("btnSom");
  // com o som barrado, o toque no botão só libera (o modo continua o mesmo); depois, troca o modo
  if (bt) bt.onclick = () => { if (mostrandoBloqueio) { destravar(); setTimeout(avisarBloqueio, 150); } else alternar(); };
  const css = document.createElement("style");
  css.textContent = `
#btnSom.som-bloqueado{background:#ffd23f;color:#141414;border-color:#ffd23f;font-weight:700}
.som-volume-bt{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--b1);background:transparent;color:var(--t2);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.som-volume-bt:hover,.som-volume-bt[aria-expanded="true"]{background:var(--s2);color:var(--t1)}
.som-volume-painel{position:fixed;right:max(12px,env(safe-area-inset-right));top:58px;z-index:41;display:none;flex-direction:column;gap:9px;width:min(280px,calc(100% - 24px));padding:14px;background:var(--s2);color:var(--t1);border:1px solid var(--b1);border-radius:10px;box-shadow:0 12px 36px #0005}
.som-volume-painel.on{display:flex}
.som-volume-painel label{font-weight:700;font-size:13px}
.som-volume-linha{display:flex;align-items:center;gap:8px}
.som-volume-linha input{min-width:0;flex:1;accent-color:var(--t1)}
.som-volume-linha output{min-width:38px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums}
.som-volume-painel small{color:var(--t2);font-size:11px;line-height:1.4}
@media(max-width:520px){.som-volume-bt{padding:0 9px}.som-volume-nome{display:none}}
`;
  document.head.appendChild(css);
  aplicar();

  const configurar = (o = {}) => { for (const k of ["naPartida", "jogo", "velocidade"]) if (typeof o[k] === "function") F[k] = o[k]; };
  return { abrir, evento, tela, alternar, definirVolume, configurar, historico, get volume() { return volume; }, get modo() { return modo; }, get contexto() { return ctx; } };
})();
