// Road to Champions — o tocador das cenas dubladas (window.RoadDublagem).
// Uma cutscene por cima da central: a ilustração do evento, o nome de quem fala e a legenda, um MP3 por fala, uma fala
// depois da outra. Na escolha, a cena para e espera; depois toca só o ramo escolhido. O tocador mora fora do #app
// (a página redesenha o #app a cada estado do servidor) e é só deste navegador: pular, mudar o volume ou desligar a
// voz não chega a mais ninguém da sala, e nada aqui manda comando para o servidor (a escolha volta para a página).
//
// Regras (condições, ordem, variante do callback) em road-voz.js; falas, legendas e durações no manifesto.
(() => {
  "use strict";
  const V = window.RoadVoz;
  const URL_MANIFESTO = "/jogador/dublagem/manifesto.json";
  const PREFS = "rtc:voz:prefs";
  const ESPERA_CARREGAR_MS = 8000; // conexão lenta: depois disso a fala segue só com a legenda
  const safe = (x) => String(x == null ? "" : x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let manifesto = null, carregando = null, falhouManifesto = false;
  const prefs = { voz: true, legendas: true, volume: 0.9 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch {}
  const guardarPrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} };

  // ---------- estado da cena que está aberta ----------
  let cena = null;          // { def, cfg, fase, fala, i, ramo, escolhida }
  let geracao = 0;          // cada cena nova (ou parar) invalida o que a anterior ainda ia fazer
  let atual = null;         // o <audio> que está tocando agora (nunca dois)
  const audios = new Set(); // todos os <audio> criados, para parar e cancelar o download
  let proximo = null;       // { id, audio } pré-carregado: só a próxima fala, nunca a cena inteira
  let pularFala = null;     // resolve a espera da fala atual
  const registro = [];      // falhas de carregamento e o que tocou (para os testes e para o console)
  let raiz = null;

  function carregar() {
    if (manifesto) return Promise.resolve(manifesto);
    // conexão lenta: o manifesto tem alguns KB; se não vier em 6 s, as cenas seguem sem dublagem (só texto)
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const t = ctrl && setTimeout(() => ctrl.abort(), 6000);
    if (!carregando) carregando = fetch(URL_MANIFESTO, { cache: "no-cache", signal: ctrl && ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((m) => (manifesto = m))
      .catch((e) => { falhouManifesto = true; console.warn("[dublagem] manifesto não carregou:", e.message); return null; })
      .finally(() => clearTimeout(t));
    return carregando;
  }
  // a cena dublada de um evento do jogo, de um prelúdio ou de um callback
  function cenaDe(tipo, id) {
    if (!manifesto) return null;
    return Object.values(manifesto.cenas).find((c) => c.gatilho.tipo === tipo && (c.gatilho.evento === id || c.gatilho.id === id)) || null;
  }

  // ---------- o áudio ----------
  function soltar(a) {
    if (!a) return;
    a.onended = a.onerror = a.ontimeupdate = a.onplaying = null;
    try { a.pause(); } catch {}
    // tirar o src e chamar load() cancela o download (pular a cena não deixa requisição pendurada)
    a.removeAttribute("src");
    try { a.load(); } catch {}
    audios.delete(a);
  }
  function novoAudio(url) {
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    audios.add(a);
    return a;
  }
  function preCarregar(f) {
    if (proximo && proximo.id === (f && f.id)) return;
    if (proximo) soltar(proximo.audio);
    proximo = f && f.audio && prefs.voz ? { id: f.id, audio: novoAudio(f.audio) } : null;
  }
  function audioDe(f) {
    if (proximo && proximo.id === f.id) { const a = proximo.audio; proximo = null; return a; }
    return novoAudio(f.audio);
  }
  const esperar = (ms) => new Promise((ok) => {
    const t = setTimeout(() => { pularFala = null; ok("tempo"); }, ms);
    pularFala = () => { clearTimeout(t); pularFala = null; ok("pulou"); };
  });

  // toca (ou mostra) uma fala e resolve quando ela termina, é pulada ou falha. Nunca trava: erro vira só legenda.
  async function falar(f, g) {
    mostrarFala(f, 0);
    if (!f.audio || !prefs.voz) return esperar(V.tempoDeLeitura(f.legenda));
    const a = audioDe(f);
    a.volume = prefs.volume;
    if (atual && atual !== a) soltar(atual);
    atual = a;
    const fim = await new Promise((ok) => {
      let feito = false, tocou = false;
      const acabar = (motivo) => { if (feito) return; feito = true; clearTimeout(lento); pularFala = null; ok(motivo); };
      const lento = setTimeout(() => { if (!tocou) acabar("lento"); }, ESPERA_CARREGAR_MS);
      a.onplaying = () => { tocou = true; };
      a.onended = () => acabar("fim");
      a.onerror = () => acabar("erro");
      a.ontimeupdate = () => { if (g === geracao) mostrarFala(f, a.currentTime * 1000); };
      pularFala = () => acabar("pulou");
      a.play().catch((e) => acabar(e && e.name === "NotAllowedError" ? "bloqueado" : "erro"));
    });
    soltar(a);
    if (atual === a) atual = null;
    if (g !== geracao) return "cancelada";
    if (fim === "erro" || fim === "lento" || fim === "bloqueado") {
      registro.push({ tipo: "falha", fala: f.id, motivo: fim });
      console.warn("[dublagem] " + f.id + ": " + fim + "; segue com a legenda");
      if (fim === "bloqueado") avisar("O navegador segurou o som. Toque em ▶ na próxima cena para ouvir.");
      mostrarFala(f, 0, true);
      return esperar(V.tempoDeLeitura(f.legenda));
    }
    registro.push({ tipo: fim, fala: f.id });
    return fim;
  }

  // ---------- a tela ----------
  function montar() {
    if (raiz) return raiz;
    raiz = document.createElement("div");
    raiz.className = "rtc-voz";
    raiz.hidden = true;
    raiz.setAttribute("role", "dialog");
    raiz.setAttribute("aria-modal", "true");
    raiz.setAttribute("aria-labelledby", "rtc-voz-titulo");
    raiz.innerHTML =
      '<div class="rtc-voz-fundo"><div class="rtc-voz-parede" aria-hidden="true"></div><img class="rtc-voz-arte" alt=""></div>' +
      '<div class="rtc-voz-faixa topo"><span class="rtc-voz-kicker"></span><h2 id="rtc-voz-titulo" tabindex="-1"></h2></div>' +
      '<div class="rtc-voz-palco"><div class="rtc-voz-inicio" hidden><button type="button" class="rtc-voz-play" data-voz="comecar">▶ Assistir a cena</button></div>' +
      '<div class="rtc-voz-fala" aria-live="polite"><span class="rtc-voz-quem"></span><p class="rtc-voz-legenda"></p></div>' +
      '<div class="rtc-voz-escolha" hidden><span class="rtc-voz-kicker">Sua resposta</span><div class="rtc-voz-opcoes"></div></div></div>' +
      '<div class="rtc-voz-faixa base"><div class="rtc-voz-controles">' +
      '<button type="button" data-voz="som" aria-pressed="true" title="Ligar ou desligar a dublagem">🔊 Voz</button>' +
      '<label class="rtc-voz-volume" title="Volume das vozes"><span class="rtc-sr">Volume das vozes</span><input type="range" min="0" max="1" step="0.05" data-voz="volume"></label>' +
      '<button type="button" data-voz="legendas" aria-pressed="true" title="Mostrar ou esconder as legendas">CC</button>' +
      '<span class="rtc-voz-aviso" role="status"></span>' +
      '<button type="button" data-voz="fala" class="rtc-voz-pular">Avançar ›</button>' +
      '<button type="button" data-voz="cena" class="rtc-voz-pular">Pular cena ››</button>' +
      '<button type="button" data-voz="depois" class="rtc-voz-depois" hidden>Decidir depois</button></div></div>';
    document.body.appendChild(raiz);
    raiz.addEventListener("click", aoClicar);
    raiz.addEventListener("input", (e) => {
      if (e.target.dataset.voz !== "volume") return;
      prefs.volume = Number(e.target.value); guardarPrefs();
      if (atual) atual.volume = prefs.volume;
    });
    document.addEventListener("keydown", (e) => {
      if (!cena || raiz.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); pularCena(); }
      else if ((e.key === " " || e.key === "Enter") && cena.fase === "falando" && !e.target.closest("button,input")) { e.preventDefault(); pularFala && pularFala(); }
    }, true);
    // aba escondida: pausa a voz; ao voltar, continua do mesmo ponto
    document.addEventListener("visibilitychange", () => {
      if (!atual) return;
      if (document.hidden) atual.pause(); else atual.play().catch(() => {});
    });
    return raiz;
  }
  const $ = (sel) => raiz.querySelector(sel);
  function avisar(t) { const el = $(".rtc-voz-aviso"); el.textContent = t || ""; }
  function atualizarControles() {
    $('[data-voz="som"]').setAttribute("aria-pressed", String(prefs.voz));
    $('[data-voz="som"]').textContent = prefs.voz ? "🔊 Voz" : "🔇 Voz";
    $('[data-voz="legendas"]').setAttribute("aria-pressed", String(prefs.legendas));
    $('[data-voz="volume"]').value = String(prefs.volume);
    $('[data-voz="volume"]').disabled = !prefs.voz;
    const falando = cena && cena.fase === "falando";
    $('[data-voz="fala"]').hidden = !falando;
    $('[data-voz="cena"]').hidden = !cena || cena.fase === "escolha" || cena.fase === "inicio";
    $('[data-voz="depois"]').hidden = !(cena && cena.cfg.podeAdiar && cena.ramo == null);
    raiz.classList.toggle("sem-legenda", !prefs.legendas);
  }
  // o nome de quem fala (o protagonista é o nome que o jogador deu) e a legenda do momento
  function mostrarFala(f, ms, falhou = false) {
    if (!cena) return;
    const protagonista = f.protagonista;
    const quem = protagonista ? cena.cfg.protagonista || "Você" : f.nome;
    const caixa = $(".rtc-voz-fala");
    const texto = protagonista || falhou || !f.audio || !prefs.voz ? f.legenda : V.trechoNoTempo(f, ms);
    if (caixa.dataset.fala !== f.id) {
      caixa.dataset.fala = f.id;
      caixa.classList.remove("entra"); void caixa.offsetWidth; caixa.classList.add("entra");
    }
    caixa.classList.toggle("protagonista", !!protagonista);
    // o protagonista não tem voz fixa: a fala dele aparece sempre; sem voz e sem legenda, a legenda volta
    caixa.classList.toggle("forcada", !!protagonista || !prefs.voz || falhou || !f.audio);
    $(".rtc-voz-quem").textContent = quem;
    const leg = $(".rtc-voz-legenda");
    if (leg.textContent !== texto) leg.textContent = texto;
    caixa.hidden = false;
  }
  function mostrarEscolha(opcoes) {
    const box = $(".rtc-voz-escolha");
    $(".rtc-voz-opcoes").innerHTML = opcoes.map((o, i) =>
      '<button type="button" class="rtc-voz-opcao" data-opcao="' + o.id + '"><span class="n">' + (i + 1) + '</span><span><b>' + safe(o.texto) +
      '</b>' + (o.dica ? '<small>' + safe(o.dica) + '</small>' : "") + '</span></button>').join("");
    $(".rtc-voz-fala").hidden = true;
    box.hidden = false;
    box.querySelector("button")?.focus();
  }

  function aoClicar(e) {
    const b = e.target.closest("button");
    if (!b || !cena) return;
    const acao = b.dataset.voz;
    if (acao === "comecar") { cena.comecar && cena.comecar(); return; }
    if (acao === "som") { prefs.voz = !prefs.voz; guardarPrefs(); if (atual) atual.muted = !prefs.voz; atualizarControles(); return; }
    if (acao === "legendas") { prefs.legendas = !prefs.legendas; guardarPrefs(); atualizarControles(); return; }
    if (acao === "fala") { pularFala && pularFala(); return; }
    if (acao === "cena") { pularCena(); return; }
    if (acao === "depois") { fechar({ adiou: true }); return; }
    if (b.dataset.opcao != null && cena.fase === "escolha" && cena.escolher) cena.escolher(Number(b.dataset.opcao), b);
  }
  // pular a cena: antes da escolha vai direto para ela (a escolha nunca é pulada); depois dela, encerra
  function pularCena() {
    if (!cena) return;
    if (cena.fase === "inicio") return;
    if (cena.fase === "falando" && cena.temEscolha && cena.ramo == null) { cena.pularIntro = true; pularFala && pularFala(); return; }
    if (cena.fase === "escolha") return;
    fechar({ pulou: true });
  }

  // ---------- abrir, tocar e fechar ----------
  // cfg: { tipo: "evento"|"preludio"|"callback", id, ramo (callback), opcoes [{id,texto,dica,voz}], ctx (estado
  //        narrativo), protagonista (nome dado pelo jogador), kicker, podeAdiar,
  //        aoEscolher(opcao) → Promise<boolean> (false: a escolha não valeu, a cena continua na escolha),
  //        aoFechar({ opcao, pulou, adiou }) }
  async function tocar(cfg) {
    parar();
    const g = ++geracao;
    await carregar();
    if (g !== geracao) return false;
    const def = cenaDe(cfg.tipo, cfg.id);
    if (!def) return false;
    montar();
    cena = { def, cfg, fase: "inicio", ramo: cfg.ramo || null, temEscolha: !!(cfg.opcoes && cfg.opcoes.length), escolhida: null };
    const arte = $(".rtc-voz-arte");
    if (def.arte) { arte.src = def.arte; arte.hidden = false; arte.onerror = () => { arte.hidden = true; }; }
    else { arte.removeAttribute("src"); arte.hidden = true; }
    raiz.classList.toggle("sem-arte", !def.arte);
    raiz.style.setProperty("--cor", cfg.cor || "#3d7ae0");
    $(".rtc-voz-parede").innerHTML = def.arte ? "" : paredeDePatrocinio();
    $(".rtc-voz-kicker").textContent = cfg.kicker || "";
    $("#rtc-voz-titulo").textContent = def.titulo;
    $(".rtc-voz-fala").hidden = true;
    $(".rtc-voz-escolha").hidden = true;
    avisar("");
    raiz.hidden = false;
    document.body.classList.add("rtc-voz-aberta");
    atualizarControles();
    $("#rtc-voz-titulo").focus();
    // a política de autoplay: sem um toque do jogador nesta página, a cena espera o ▶
    const ativo = !prefs.voz || (navigator.userActivation ? navigator.userActivation.hasBeenActive : true);
    if (!ativo) {
      $(".rtc-voz-inicio").hidden = false;
      await new Promise((ok) => { cena.comecar = ok; });
      if (g !== geracao) return false;
      $(".rtc-voz-inicio").hidden = true;
    }
    rodar(g).catch((e) => { if (g === geracao) { console.warn("[dublagem]", e); fechar({ pulou: true }); } });
    return true;
  }
  async function tocarLista(lista, g) {
    for (let i = 0; i < lista.length; i++) {
      if (g !== geracao || cena.pularIntro) return;
      cena.fase = "falando"; atualizarControles();
      preCarregar(lista[i + 1]);
      await falar(lista[i], g);
    }
  }
  async function rodar(g) {
    const { def, cfg } = cena, ctx = cfg.ctx || {};
    if (!cena.ramo) await tocarLista(V.introDe(manifesto, def.id, ctx), g);
    if (g !== geracao) return;
    cena.pularIntro = false;
    if (cena.temEscolha && cena.ramo == null) {
      // a cena para aqui: nada mais toca até a escolha
      if (proximo) { soltar(proximo.audio); proximo = null; }
      cena.fase = "escolha"; atualizarControles();
      mostrarEscolha(cfg.opcoes);
      const opcao = await new Promise((ok) => {
        cena.escolher = async (id, botao) => {
          const o = cfg.opcoes.find((x) => x.id === id);
          if (!o || cena.escolhida != null) return;
          cena.escolhida = id;
          raiz.querySelectorAll(".rtc-voz-opcao").forEach((b) => (b.disabled = true));
          botao && botao.classList.add("escolhida");
          const valeu = cfg.aoEscolher ? await cfg.aoEscolher(o) : true;
          if (g !== geracao) return;
          if (valeu === false) { cena.escolhida = null; raiz.querySelectorAll(".rtc-voz-opcao").forEach((b) => { b.disabled = false; b.classList.remove("escolhida"); }); return; }
          ok(o);
        };
      });
      if (g !== geracao) return;
      cena.escolher = null;
      cena.ramo = opcao.voz || null;
      $(".rtc-voz-escolha").hidden = true;
    }
    // só o ramo escolhido (ou a variante do callback). Opção sem ramo dublado: a cena acaba aqui.
    if (cena.ramo) await tocarLista(V.ramoDe(manifesto, def.id, cena.ramo, ctx), g);
    if (g !== geracao) return;
    fechar({});
  }
  function fechar(info) {
    if (!cena) return;
    const { cfg, escolhida } = cena;
    parar();
    cfg.aoFechar && cfg.aoFechar({ opcao: escolhida, ...info });
  }
  // para tudo na hora: o áudio, os downloads, a cena (trocar de cena, jogo ao vivo abrindo, sair da sala)
  function parar() {
    geracao++;
    if (pularFala) pularFala();
    for (const a of [...audios]) soltar(a);
    atual = null; proximo = null; cena = null;
    if (raiz) { raiz.hidden = true; $(".rtc-voz-escolha").hidden = true; $(".rtc-voz-inicio").hidden = true; }
    document.body.classList.remove("rtc-voz-aberta");
  }
  // a parede de patrocínio da coletiva, quando a cena não tem ilustração: uma grade que se ajusta à largura da tela
  const paredeDePatrocinio = () => '<span>✦ ROAD TO CHAMPIONS</span>'.repeat(90);

  window.RoadDublagem = {
    carregar, tocar, parar, cenaDe,
    get carregado() { return !!manifesto || falhouManifesto; },
    get aberta() { return !!cena; },
    get atual() { return cena ? { tipo: cena.cfg.tipo, id: cena.cfg.id, fase: cena.fase } : null; },
    get prefs() { return { ...prefs }; },
    // para os testes (#debug) e para conferir no console
    diagnostico() {
      return { aberta: !!cena, fase: cena && cena.fase, cena: cena && cena.def.id, ramo: cena && cena.ramo,
        fala: raiz && !raiz.hidden ? $(".rtc-voz-fala").dataset.fala || null : null,
        tocando: [...audios].filter((a) => !a.paused).map((a) => a.currentSrc || a.src),
        baixando: [...audios].map((a) => a.src).filter(Boolean), registro: registro.slice() };
    },
  };
})();
