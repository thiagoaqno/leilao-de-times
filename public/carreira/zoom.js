// Carreira: o zoom entre a sede e as telas de gestão, como abrir e fechar uma janela no Mac. A tela nova é desenhada ANTES (com tudo carregado)
// e a própria tela, de verdade, cresce a partir do bloco da sede até o tamanho final, enquanto a sede esmaece por baixo. Voltando, a tela
// de gestão encolhe até o bloco e a sede (desenhada antes) reaparece por baixo. Nada é trocado no fim: o último quadro da animação é
// igual à tela parada, então não há "pulo" nem recarga. A escala, os cantos e a sombra acompanham a abertura, para
// o vidro dos painéis não mudar no meio. Quem pede menos movimento no sistema troca de tela na hora.
// Também troca o "← Vila" do cabeçalho por "← Sede" nas telas de gestão (um botão só para voltar, no mesmo lugar).
const Zoom = (() => {
  const TELAS_DE_GESTAO = new Set(["elenco", "mercado", "tabela", "calendario", "feed", "trocas", "temporadas", "clube"]);
  const ABRE = { duration: 480, easing: "cubic-bezier(.23,1,.32,1)" }, FECHA = { duration: 420, easing: "cubic-bezier(.77,0,.175,1)" };
  const SOMBRA = "0 0 0 1px #ffffff40, 0 30px 80px -20px #000", SEM_SOMBRA = "0 0 0 0 #ffffff00, 0 0 0 0 #0000";
  let ocupado = false, rolagemDaSede = 0;
  const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const px = (n) => `${Math.round(n * 100) / 100}px`;
  const fim = (anim) => anim.finished.catch(() => {});
  // dois quadros: a tela recém-desenhada já foi pintada quando a animação começa (o primeiro quadro não engasga)
  const pintada = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  const centro = (r) => [r.left + r.width / 2, r.top + r.height / 2];
  const escala = (bloco, tela) => Math.min(1, Math.max(0.1, bloco.width / tela.width));
  const PROPS = ["position", "left", "top", "width", "height", "margin", "pointerEvents", "zIndex", "opacity", "transformOrigin", "maxHeight", "overflow", "borderRadius", "boxShadow", "willChange", "transform", "--placa"];

  // a sede fica onde está, por baixo, sem mexer no resto da página
  function fixar(el, r) { Object.assign(el.style, { position: "fixed", left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height), margin: "0", pointerEvents: "none" }); }
  function soltar(el) { for (const p of PROPS) el.style[p] = ""; }

  async function abrir(bloco, id, trocar) {
    ocupado = true; rolagemDaSede = scrollY;
    const sede = document.getElementById("sede"), rSede = sede.getBoundingClientRect(), rBloco = bloco.getBoundingClientRect();
    document.body.classList.add("zoom-ativo");
    let tela = null;
    try {
      trocar(); // desenha a tela nova por inteiro (a sede some, a página volta ao topo)
      tela = document.getElementById(id);
      sede.classList.remove("hidden"); fixar(sede, rSede); sede.style.zIndex = "1";
      const rTela = tela.getBoundingClientRect(), [cx, cy] = centro(rBloco);
      Object.assign(tela.style, { transformOrigin: `${px(cx - rTela.left)} ${px(cy - rTela.top)}`, maxHeight: px(Math.max(200, innerHeight - rTela.top)), overflow: "hidden", position: "relative", zIndex: "2", willChange: "transform" });
      const s = escala(rBloco, rTela);
      tela.style.transform = `scale(${s})`; tela.style.borderRadius = "18px"; tela.style.setProperty("--placa", "0.96"); tela.classList.add("zoomando"); // já no tamanho do bloco enquanto pinta
      await pintada();
      await Promise.all([
        fim(tela.animate([{ transform: `scale(${s})`, borderRadius: "18px", boxShadow: SOMBRA }, { transform: "scale(1)", borderRadius: "0px", boxShadow: SEM_SOMBRA }], ABRE)),
        fim(tela.animate([{ opacity: 0.96 }, { opacity: 0.96, offset: 0.1 }, { opacity: 0, offset: 0.9 }, { opacity: 0 }], { ...ABRE, easing: "linear", pseudoElement: "::before" })),
        fim(sede.animate([{ opacity: 1 }, { opacity: 0 }], { ...ABRE, easing: "linear", fill: "forwards" })),
      ]);
    } finally {
      sede.classList.add("hidden"); soltar(sede); // só agora a sede sai (já estava invisível)
      if (tela) { tela.classList.remove("zoomando"); soltar(tela); }
      ocupado = false; // (a classe zoom-ativo fica: se ela saísse agora, a entrada em cascata da tela recomeçaria e daria um pulo no fim)
    }
  }

  async function fechar(atual, trocar, achar) {
    ocupado = true;
    const tela = document.getElementById(atual), rTela = tela.getBoundingClientRect(), sede = document.getElementById("sede");
    document.body.classList.add("zoom-ativo");
    try {
      // a tela de gestão congela onde está, por cima; a sede (invisível ainda) é desenhada por baixo, na rolagem em que estava
      fixar(tela, rTela); Object.assign(tela.style, { zIndex: "300", willChange: "transform", overflow: "hidden" });
      sede.style.opacity = "0";
      trocar();
      tela.classList.remove("hidden");
      window.scrollTo({ top: rolagemDaSede, behavior: "instant" });
      const bloco = achar(); if (!bloco) return;
      const rBloco = bloco.getBoundingClientRect(), [cx, cy] = centro(rBloco);
      tela.style.transformOrigin = `${px(cx - rTela.left)} ${px(cy - rTela.top)}`;
      tela.style.setProperty("--placa", "0"); tela.classList.add("zoomando");
      await pintada();
      const s = escala(rBloco, rTela);
      await Promise.all([
        fim(tela.animate([{ opacity: 0 }, { opacity: 0.96, offset: 0.7 }, { opacity: 0.96 }], { ...FECHA, easing: "linear", pseudoElement: "::before" })),
        fim(tela.animate([{ transform: "scale(1)", borderRadius: "0px", boxShadow: SEM_SOMBRA, opacity: 1 }, { transform: `scale(${s})`, borderRadius: "18px", boxShadow: SOMBRA, opacity: 1, offset: 0.82 }, { transform: `scale(${s})`, borderRadius: "18px", boxShadow: SOMBRA, opacity: 0 }], FECHA)),
        fim(sede.animate([{ opacity: 0 }, { opacity: 1 }], { ...FECHA, easing: "ease-out", fill: "forwards" })),
      ]);
    } finally {
      tela.classList.add("hidden"); tela.classList.remove("zoomando"); soltar(tela); soltar(sede);
      ocupado = false;
    }
  }

  // o botão do cabeçalho: "← Vila" na sede, na entrada e na partida; "← Sede" nas telas de gestão
  function cabecalho(id) {
    if (!ocupado) document.body.classList.remove("zoom-ativo"); // uma troca sem zoom volta a ter a entrada em cascata
    const a = document.querySelector("#barra .voltar"); if (!a) return;
    const sede = TELAS_DE_GESTAO.has(id);
    a.textContent = sede ? "← Sede" : "← Vila";
    if (sede) { a.setAttribute("href", "#sede"); a.dataset.ir = "sede"; } else { a.setAttribute("href", "/"); delete a.dataset.ir; }
  }
  // para onde ir: a sede abre o zoom a partir do bloco; as telas de gestão voltam encolhendo até o bloco delas
  function ir(id, de) {
    if (ocupado) return; // durante o zoom, nenhum clique troca de tela (nem cai no "← Vila" que aparece por baixo)
    const atual = typeof telaAtual !== "undefined" ? telaAtual : null;
    if (atual === "sede" && id !== "sede" && TELAS_DE_GESTAO.has(id)) {
      const bloco = de && de.closest("#sede .tile[data-ir]") ? de.closest(".tile") : null;
      if (bloco && !reduz()) { cabecalho(id); return abrir(bloco, id, () => mostrarTela(id)); } // o cabeçalho já vira "← Sede" no começo do zoom
    }
    if (id === "sede" && TELAS_DE_GESTAO.has(atual) && !reduz()) return fechar(atual, () => mostrarTela("sede"), () => document.querySelector(`#sede .tile[data-ir="${atual}"]`));
    return mostrarTela(id);
  }
  // clicou no cabeçalho com o zoom rodando: não faz nada (em vez de sair da carreira sem querer)
  document.addEventListener("click", (e) => { if (ocupado && e.target.closest && e.target.closest("#barra .voltar")) { e.preventDefault(); e.stopPropagation(); } }, true);
  return { ir, cabecalho, TELAS_DE_GESTAO, ocupado: () => ocupado };
})();
