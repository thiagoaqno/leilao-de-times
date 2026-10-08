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

  function capturarEscalacao() {
    const jogadores = new Map();
    for (const el of document.querySelectorAll("#eCampo [data-jogador], #eBanco [data-jogador]")) {
      const pid = el.dataset.jogador;
      if (!pid || jogadores.has(pid)) continue;
      const r = el.getBoundingClientRect();
      jogadores.set(pid, { left: r.left, top: r.top, width: r.width, height: r.height, campo: !!el.closest("#eCampo") });
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

  function animarEscalacao(antes, contexto = {}) {
    if (!antes || reduzir()) return;
    requestAnimationFrame(() => {
      const depois = capturarEscalacao(), movidos = [];
      for (const [pid, origem] of antes) {
        const destino = depois.get(pid);
        if (!destino || Math.hypot(origem.left - destino.left, origem.top - destino.top) < 8) continue;
        const alvo = document.querySelector(`#eCampo [data-jogador="${CSS.escape(pid)}"], #eBanco [data-jogador="${CSS.escape(pid)}"]`);
        if (!alvo) continue;
        movidos.push({ pid, origem, destino, alvo });
      }
      for (const { origem, destino, alvo } of movidos) {
        const fantasma = alvo.cloneNode(true);
        fantasma.removeAttribute("id"); fantasma.classList.add("jogador-em-movimento");
        Object.assign(fantasma.style, { left: `${origem.left}px`, top: `${origem.top}px`, width: `${origem.width}px`, height: `${origem.height}px` });
        document.body.append(fantasma); alvo.classList.add("jogador-chegando");
        const movimento = fantasma.animate([
          { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
          { transform: `translate3d(${destino.left - origem.left}px,${destino.top - origem.top}px,0) scale(${destino.width / Math.max(1, origem.width)})`, opacity: 1 },
        ], { duration: 360, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
        movimento.finished.finally(() => { fantasma.remove(); alvo.classList.remove("jogador-chegando"); });
      }
      const falantes = contexto.tipo === "formacao" ? movidos.slice(0, 3) : movidos.filter(({ pid }) => !contexto.envolvidos || contexto.envolvidos.includes(pid)).slice(0, 2);
      falantes.forEach(({ pid, alvo, origem, destino }, i) => setTimeout(() => balao(pid, contexto.tipo === "formacao" ? "formacao" : origem.campo && !destino.campo ? "banco" : !origem.campo && destino.campo ? "campo" : "troca", alvo, i), 180 + i * 130));
    });
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

  window.AnimacoesCarreira = { FALAS, TODAS_AS_FALAS, falaDe, capturarEscalacao, animarEscalacao, animarTransferencia };
})();
