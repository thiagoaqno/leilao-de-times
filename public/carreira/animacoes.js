// Os movimentos da carreira ficam separados das regras: só animam uma mudança depois que o servidor confirmou.
// As falas são divididas pelo que aconteceu para não soar igual quando alguém entra, sai ou muda de posição.
(function () {
  const FALAS = {
    campo: [
      "Tô pronto, professor!", "Pode deixar comigo!", "Hoje eu resolvo!", "Era a chance que eu queria!",
      "Vou aproveitar cada minuto!", "Bora buscar os três pontos!", "Pode confiar em mim!", "É hora de jogar!",
      "Vou dar tudo em campo!", "Essa vaga é minha!",
    ],
    banco: [
      "Vou esperar minha chance.", "Entendido, professor.", "Estarei pronto no banco.", "Na próxima eu volto!",
      "Vou apoiar o time daqui.", "Pode me chamar quando precisar.", "Hora de recuperar as pernas.", "Vou observar o jogo.",
      "Ainda posso mudar a partida.", "Tudo pelo time.",
    ],
    troca: [
      "Nova função, vamos lá!", "Já entendi o ajuste!", "Vou fechar esse espaço!", "Pode deixar esse lado comigo!",
      "Vou jogar mais por dentro!", "Hora de abrir o campo!", "Mudo de posição sem problema!", "Vou encaixar a marcação!",
      "Essa faixa é minha agora!", "Ajuste feito, professor!",
    ],
    formacao: [
      "Gostei desse desenho!", "Time compacto, vamos!", "As linhas estão ajustadas!", "Vou atacar o espaço!",
      "Todo mundo junto!", "Pressão na hora certa!", "Vamos girar a bola!", "Já achei meu setor!",
      "Formação nova, mesma raça!", "Agora ficou redondo!",
    ],
  };
  const TODAS_AS_FALAS = Object.values(FALAS).flat();
  const reduzir = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hash = (texto) => [...String(texto)].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 7);
  const falaDe = (pid, tipo) => {
    const grupo = FALAS[tipo] || FALAS.troca;
    return grupo[hash(`${pid}:${tipo}`) % grupo.length];
  };

  // onde estava cada jogador antes da mudança: a caixa na tela e se estava no campo (o campinho) ou no banco
  function capturarEscalacao() {
    const jogadores = new Map();
    for (const el of document.querySelectorAll("#eCampo [data-jogador], #eBanco [data-jogador]")) {
      const pid = el.dataset.jogador;
      if (!pid || jogadores.has(pid)) continue;
      const r = el.getBoundingClientRect();
      jogadores.set(pid, { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, campo: !!el.closest("#eCampo") });
    }
    return jogadores;
  }

  function balao(pid, tipo, alvo, nivel = 0) {
    const r = alvo.getBoundingClientRect(), el = document.createElement("div");
    el.className = "fala-jogador";
    el.textContent = falaDe(pid, tipo);
    el.style.left = `${Math.min(innerWidth - 170, Math.max(8, r.left + r.width / 2))}px`;
    el.style.top = `${Math.max(8, r.top - 8 - nivel * 44)}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), reduzir() ? 700 : 2100);
  }

  // o pouso: a peça amassa um pouco e levanta a poeira do gramado (só opacidade e escala)
  function pousar(alvo, atraso = 0) {
    setTimeout(() => {
      if (!alvo.isConnected) return;
      alvo.classList.remove("pousou"); void alvo.offsetWidth; alvo.classList.add("pousou");
      setTimeout(() => alvo.classList.remove("pousou"), 520);
    }, atraso);
  }
  // a viagem em arco: sobe no meio do caminho (mais alto quanto mais longe) e cresce um pouco, como se fosse levantado da prancheta.
  // No campinho, a própria peça viaja (a propriedade translate soma com o transform dela); entre o banco e o campo, uma cópia
  // viaja por cima de tudo (o campinho corta o que sai dele) e a peça aparece quando ela chega.
  function arco(dx, dy, escala0 = 1) {
    const dist = Math.hypot(dx, dy), sobe = Math.min(46, 10 + dist * 0.22);
    return [
      { translate: `${dx}px ${dy}px`, scale: `${escala0}` },
      { translate: `${dx * 0.5}px ${dy * 0.5 - sobe}px`, scale: `${(escala0 + 1) / 2 * 1.14}`, offset: 0.45 },
      { translate: "0px 0px", scale: "1" },
    ];
  }
  const DURACAO = (dist) => Math.round(Math.min(620, 380 + dist * 0.5));
  const MOLA = "cubic-bezier(.34,1.32,.5,1)"; // passa um tiquinho do ponto e volta: o "assentar" da peça

  function animarEscalacao(antes, contexto = {}) {
    if (!antes || reduzir()) return;
    requestAnimationFrame(() => {
      const depois = capturarEscalacao(), movidos = [];
      const solto = contexto.soltoEm; // a peça que foi arrastada: viaja de onde foi solta, não de onde estava
      for (const [pid, antesDele] of antes) {
        const destino = depois.get(pid);
        let origem = antesDele;
        if (solto && solto.pid === pid) origem = { ...antesDele, cx: solto.x, cy: solto.y, solta: true };
        if (!destino || Math.hypot(origem.cx - destino.cx, origem.cy - destino.cy) < 6) continue;
        const alvo = document.querySelector(`#eCampo [data-jogador="${CSS.escape(pid)}"], #eBanco [data-jogador="${CSS.escape(pid)}"]`);
        if (!alvo) continue;
        movidos.push({ pid, origem, destino, alvo });
      }
      // na troca de formação, todos andam juntos, um pouco escalonados do gol para o ataque
      const ordem = contexto.tipo === "formacao" ? [...movidos].sort((a, b) => b.destino.cy - a.destino.cy) : movidos;
      ordem.forEach(({ origem, destino, alvo }, n) => {
        const dx = origem.cx - destino.cx, dy = origem.cy - destino.cy, dist = Math.hypot(dx, dy);
        const atraso = contexto.tipo === "formacao" ? n * 28 : 0, duracao = DURACAO(dist);
        if (origem.campo && destino.campo && !origem.solta) {
          alvo.classList.add("viajando");
          const a = alvo.animate(arco(dx, dy), { duration: duracao, delay: atraso, easing: MOLA, fill: "backwards" });
          a.finished.then(() => { alvo.classList.remove("viajando"); pousar(alvo); }, () => alvo.classList.remove("viajando"));
          return;
        }
        // entre o banco e o campo (ou de onde foi solta): uma cópia viaja por cima
        const r = alvo.getBoundingClientRect(), copia = alvo.cloneNode(true);
        copia.removeAttribute("id"); copia.classList.remove("sel", "pousou"); copia.classList.add("jogador-em-movimento", alvo.classList.contains("peca") ? "e-peca" : "e-carta");
        Object.assign(copia.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
        document.body.append(copia); alvo.classList.add("jogador-chegando");
        const escala0 = origem.solta ? 1.08 : Math.max(0.6, Math.min(1.5, origem.width / Math.max(1, r.width)));
        const a = copia.animate(arco(dx, dy, escala0), { duration: duracao, delay: atraso, easing: MOLA, fill: "both" });
        a.finished.finally(() => { copia.remove(); alvo.classList.remove("jogador-chegando"); pousar(alvo); });
      });
      const falantes = contexto.tipo === "formacao" ? movidos.slice(0, 3) : movidos.filter(({ pid }) => !contexto.envolvidos || contexto.envolvidos.includes(pid)).slice(0, 2);
      falantes.forEach(({ pid, alvo, origem, destino }, i) => setTimeout(() => balao(pid, contexto.tipo === "formacao" ? "formacao" : origem.campo && !destino.campo ? "banco" : !origem.campo && destino.campo ? "campo" : "troca", alvo, i), 260 + i * 140));
    });
  }

  // ---------- arrastar e soltar na prancheta ----------
  // a peça (ou a carta do banco) sai do lugar e acompanha o dedo, inclinando para o lado em que anda; quem está embaixo
  // acende como alvo. Soltar em outro jogador troca os dois (quem chama decide: aoSoltar devolve uma promessa, verdadeira se
  // trocou); soltar no vazio, ou se a troca falhar, a peça volta voando para o lugar. No mouse o arrasto começa ao mover; no
  // toque, depois de segurar um instante (para o dedo continuar rolando a página).
  function prancheta({ raizes, alvos, aoSoltar }) {
    let ini = null, arr = null, timer = 0, ignorarClique = false;
    const alvoEm = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest(alvos); };
    const posicionar = () => { const { x, y, tilt, escala } = arr; arr.copia.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${tilt.toFixed(1)}deg) scale(${escala})`; };
    function comecar(e) {
      const el = ini.el, r = el.getBoundingClientRect(), copia = el.cloneNode(true);
      copia.removeAttribute("id"); copia.classList.remove("sel", "pousou"); copia.classList.add("na-mao", el.classList.contains("peca") ? "e-peca" : "e-carta");
      Object.assign(copia.style, { width: `${r.width}px`, height: `${r.height}px` });
      document.body.append(copia); el.classList.add("pegado"); document.body.classList.add("arrastando");
      arr = { el, copia, x: e.clientX, y: e.clientY, vx: 0, tilt: 0, escala: 1.12, alvo: null };
      posicionar(); rolar();
      if (navigator.vibrate && ini.toque) try { navigator.vibrate(12); } catch {}
    }
    // perto da beirada da tela, a página rola sozinha (o banco fica embaixo do campinho)
    function rolar() {
      if (!arr) return;
      const borda = 70, y = arr.y, v = y < borda ? -(borda - y) / 4 : y > innerHeight - borda ? (y - innerHeight + borda) / 4 : 0;
      if (v) { scrollBy(0, v); acharAlvo(); }
      requestAnimationFrame(rolar);
    }
    function acharAlvo() {
      const alvo = alvoEm(arr.x, arr.y), valido = alvo && alvo !== arr.el ? alvo : null;
      if (valido !== arr.alvo) { arr.alvo?.classList.remove("alvo-solta"); valido?.classList.add("alvo-solta"); arr.alvo = valido; }
    }
    function mover(e) {
      if (!ini || e.pointerId !== ini.id) return;
      if (!arr) {
        const d = Math.hypot(e.clientX - ini.x, e.clientY - ini.y);
        if (ini.toque) { if (d > 10) cancelar(); return; }
        if (d < 6) return;
        comecar(e);
      }
      arr.vx = arr.vx * 0.7 + (e.clientX - arr.x) * 0.3;
      arr.tilt = Math.max(-14, Math.min(14, arr.vx * 1.6));
      arr.x = e.clientX; arr.y = e.clientY; posicionar(); acharAlvo();
    }
    function voltar(a) { // a peça volta para o lugar dela
      const el = a.el, r = el.isConnected ? el.getBoundingClientRect() : null;
      const limpar = () => { a.copia.remove(); el.classList.remove("pegado"); };
      if (!r || reduzir()) return limpar();
      a.copia.animate([{ transform: a.copia.style.transform }, { transform: `translate3d(${r.left + r.width / 2}px,${r.top + r.height / 2}px,0) translate(-50%,-50%) rotate(0deg) scale(1)` }],
        { duration: 300, easing: MOLA, fill: "forwards" }).finished.finally(limpar);
    }
    async function soltar(e) {
      if (!ini || e.pointerId !== ini.id) return;
      clearTimeout(timer);
      const a = arr; ini = null; arr = null;
      if (!a) return;
      ignorarClique = true; setTimeout(() => (ignorarClique = false), 0);
      document.body.classList.remove("arrastando"); a.alvo?.classList.remove("alvo-solta");
      if (!a.alvo) return voltar(a);
      a.copia.style.transition = "opacity .12s"; a.copia.classList.add("esperando");
      const ok = await aoSoltar(a.el, a.alvo, { x: a.x, y: a.y, pid: a.el.dataset.jogador, aoConfirmar: () => a.copia.remove() });
      if (!ok) voltar(a); else { a.copia.remove(); a.el.classList.remove("pegado"); }
    }
    function cancelar() { clearTimeout(timer); ini = null; }
    for (const raiz of raizes) {
      raiz.addEventListener("pointerdown", (e) => {
        const el = e.target.closest(alvos); if (!el || e.button > 0 || el.disabled) return;
        ini = { el, id: e.pointerId, x: e.clientX, y: e.clientY, toque: e.pointerType === "touch" };
        if (ini.toque) { clearTimeout(timer); timer = setTimeout(() => { if (ini && !arr) comecar({ clientX: ini.x, clientY: ini.y }); }, 260); }
      });
      // o clique que vem depois de soltar não é um toque de seleção
      raiz.addEventListener("click", (e) => { if (ignorarClique) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
      raiz.addEventListener("contextmenu", (e) => { if (arr || (ini && ini.toque)) e.preventDefault(); });
    }
    addEventListener("pointermove", mover);
    addEventListener("pointerup", soltar);
    addEventListener("pointercancel", (e) => { if (arr && ini && e.pointerId === ini.id) { const a = arr; ini = null; arr = null; document.body.classList.remove("arrastando"); a.alvo?.classList.remove("alvo-solta"); voltar(a); } else cancelar(); });
    // com a peça na mão, o dedo não rola a página
    addEventListener("touchmove", (e) => { if (arr) e.preventDefault(); }, { passive: false });
  }

  function animarTransferencia({ jogador, tipo = "contratacao", de, para, valor } = {}) {
    if (!jogador || !document.body) return;
    document.querySelector(".transferencia-fx")?.remove();
    const venda = tipo === "venda", el = document.createElement("div");
    el.className = `transferencia-fx ${venda ? "venda" : "contratacao"}${reduzir() ? " reduzir" : ""}`;
    el.setAttribute("role", "status");
    el.innerHTML = `<div class="transferencia-palco">
      <div class="transferencia-clube origem">${de ? escudo(de, 2) : ""}<small>${de ? h(nomeClube(de)) : "Mercado"}</small></div>
      <div class="transferencia-card">${figurinha(jogador)}</div>
      <div class="transferencia-clube destino">${para ? escudo(para, 2) : ""}<small>${para ? h(nomeClube(para)) : "Mercado"}</small></div>
      <div class="transferencia-carimbo">${venda ? "VENDIDO" : "CONTRATADO"}</div>
      <div class="transferencia-martelo" aria-hidden="true">${ic("martelo")}</div>
      ${valor ? `<b class="transferencia-valor">${dinheiro(valor)}</b>` : ""}
    </div>`;
    document.body.append(el);
    setTimeout(() => el.remove(), reduzir() ? 900 : 1900);
  }

  window.AnimacoesCarreira = { FALAS, TODAS_AS_FALAS, falaDe, capturarEscalacao, animarEscalacao, animarTransferencia, prancheta };
})();
