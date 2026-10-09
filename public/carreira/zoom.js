// Carreira: o zoom entre a sede e as telas de gestão, como abrir e fechar uma janela no Mac. Clicou num bloco da sede (Mercado, Elenco...):
// uma folha de vidro com o formato do bloco cresce até a tela toda, a tela nova aparece por baixo dela e a folha some. Voltando à sede, a folha
// cobre a tela, a sede volta por baixo e a folha encolhe até o lugar do bloco. A folha é um retângulo liso, sem texto nem desfoque (só
// posição, tamanho e canto arredondado animam), então custa quase nada, mesmo com o vidro da página. Quem pede menos movimento no sistema troca de tela na hora.
// Também troca o "← Vila" do cabeçalho por "← Sede" nas telas de gestão (sempre um botão só para voltar, no mesmo lugar).
const Zoom = (() => {
  const TELAS_DE_GESTAO = new Set(["elenco", "mercado", "tabela", "calendario", "feed", "trocas", "temporadas", "clube"]);
  let ocupado = false, rolagemDaSede = 0;
  const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const px = (n) => `${Math.round(n)}px`;
  const inteira = () => ({ left: "0px", top: "0px", width: px(innerWidth), height: px(innerHeight), borderRadius: "0px" });
  const caixa = (r) => ({ left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height), borderRadius: "18px" });
  const pinta = (g, forma) => Object.assign(g.style, forma);
  const espera = (anim) => anim.finished.catch(() => {});
  function folha() { const g = document.createElement("div"); g.className = "zoom-folha"; document.body.append(g); document.body.classList.add("zoom-ativo"); return g; }
  function acabar(g) { g.remove(); document.body.classList.remove("zoom-ativo"); ocupado = false; }

  async function abrir(bloco, trocar) {
    if (reduz() || ocupado || !bloco.isConnected) return trocar();
    ocupado = true; rolagemDaSede = scrollY;
    const g = folha(), de = caixa(bloco.getBoundingClientRect());
    pinta(g, de); g.dataset.titulo = (bloco.querySelector(".tile-txt b") || {}).textContent || "";
    await espera(g.animate([de, inteira()], { duration: 380, easing: "cubic-bezier(.22,.8,.24,1)", fill: "forwards" }));
    trocar();
    await espera(g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" }));
    acabar(g);
  }
  async function fechar(trocar, achar) {
    if (reduz() || ocupado) return trocar();
    ocupado = true;
    const g = folha(); pinta(g, inteira()); g.classList.add("sem-titulo");
    trocar(); // a sede aparece por baixo da folha
    window.scrollTo({ top: rolagemDaSede, behavior: "instant" });
    const bloco = achar();
    if (!bloco) return acabar(g);
    await espera(g.animate([inteira(), caixa(bloco.getBoundingClientRect())], { duration: 340, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }));
    await espera(g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" }));
    acabar(g);
  }
  // o botão do cabeçalho: "← Vila" na sede, na entrada e na partida; "← Sede" nas telas de gestão
  function cabecalho(id) {
    const a = document.querySelector("#barra .voltar"); if (!a) return;
    const sede = TELAS_DE_GESTAO.has(id);
    a.textContent = sede ? "← Sede" : "← Vila";
    if (sede) { a.setAttribute("href", "#sede"); a.dataset.ir = "sede"; } else { a.setAttribute("href", "/"); delete a.dataset.ir; }
  }
  // para onde ir: a sede abre o zoom a partir do bloco; as telas de gestão voltam encolhendo até o bloco delas
  function ir(id, de) {
    const atual = typeof telaAtual !== "undefined" ? telaAtual : null;
    if (atual === "sede" && id !== "sede" && TELAS_DE_GESTAO.has(id)) {
      const bloco = de && de.closest("#sede .tile[data-ir]") ? de.closest(".tile") : document.querySelector(`#sede .tile[data-ir="${id}"]`);
      if (bloco && de && de.closest("#sede")) { cabecalho(id); return abrir(bloco, () => mostrarTela(id)); } // o cabeçalho já vira "← Sede" no começo do zoom
    }
    if (id === "sede" && TELAS_DE_GESTAO.has(atual)) return fechar(() => mostrarTela("sede"), () => document.querySelector(`#sede .tile[data-ir="${atual}"]`));
    return mostrarTela(id);
  }
  return { ir, cabecalho, TELAS_DE_GESTAO };
})();
