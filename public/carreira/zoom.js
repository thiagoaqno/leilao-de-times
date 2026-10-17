// Carreira: a troca entre as abas da sede e as telas de gestão desliza para o lado, como um carrossel. A faixa da sede é uma
// fila só (Central, Meu time, Temporada e depois os blocos Elenco, Mercado, Tabela...): ir para a direita da fila faz a tela
// nova entrar pela direita e a velha sair pela esquerda; voltar faz o contrário. No celular dá para trocar arrastando o
// dedo para o lado. A tela nova é desenhada ANTES e a velha fica parada por cima até sair, então não há "pulo" no fim.
// Quem pede menos movimento no sistema troca de tela na hora.
// Também troca o "← Vila" do cabeçalho por "← Sede" nas telas de gestão (um botão só para voltar, no mesmo lugar).
// (O arquivo e o nome Zoom ficaram do zoom antigo, que abria a tela a partir do bloco.)
const Zoom = (() => {
  const TELAS_DE_GESTAO = new Set(["elenco", "mercado", "tabela", "calendario", "feed", "trocas", "temporadas", "clube", "selecao"]);
  const ANDA = { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" };
  const SAI_ABA = { duration: 140, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" }, ENTRA_ABA = { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" };
  let ocupado = false, rolagemDaSede = 0, voltouEm = 0, abaPedida = null;
  const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const px = (n) => `${Math.round(n * 100) / 100}px`;
  const fim = (anim) => anim.finished.catch(() => {});
  const PROPS = ["position", "left", "top", "width", "height", "margin", "pointerEvents", "zIndex", "willChange"];
  const atual = () => (typeof telaAtual !== "undefined" ? telaAtual : null);
  const abaAtual = () => (typeof abaSede !== "undefined" ? abaSede : null);

  // a tela que sai fica onde está (fixa na janela) enquanto a nova é desenhada no lugar dela
  function fixar(el, r) { Object.assign(el.style, { position: "fixed", left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height), margin: "0", pointerEvents: "none" }); }
  function soltar(el) { for (const p of PROPS) el.style[p] = ""; }
  function comecar() { ocupado = true; document.body.classList.add("zoom-ativo", "deslizando"); } // zoom-ativo: sem a entrada em cascata dos painéis
  function terminar() { ocupado = false; document.body.classList.remove("deslizando"); }

  // a fila da faixa: as abas e depois os blocos de gestão que aparecem (Trocas só na sala)
  function ordem() {
    const abas = typeof ABAS_SEDE !== "undefined" ? ABAS_SEDE : [];
    const blocos = [...document.querySelectorAll("#sede .hub-tiles .tile[data-ir]")].filter((t) => !t.classList.contains("hidden") && !t.hidden).map((t) => t.dataset.ir);
    return [...abas, ...blocos];
  }
  const lugar = (tela, aba) => ordem().indexOf(tela === "sede" ? aba : tela);

  // uma tela inteira dá lugar a outra (sede ↔ gestão, ou uma tela de gestão para a vizinha)
  async function deslizar(de, para, dir) {
    const sai = document.getElementById(de);
    if (!sai) return mostrarTela(para);
    if (de === "sede") rolagemDaSede = scrollY;
    comecar();
    const r = sai.getBoundingClientRect(), d = Math.min(innerWidth, Math.max(320, r.width));
    let entra = null;
    try {
      fixar(sai, r); sai.style.zIndex = "5";
      mostrarTela(para); // desenha a tela nova por inteiro (a página volta ao topo)
      sai.classList.remove("hidden");
      if (para === "sede") window.scrollTo({ top: rolagemDaSede, behavior: "instant" });
      entra = document.getElementById(para);
      sai.style.willChange = entra.style.willChange = "transform";
      await Promise.all([
        fim(sai.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-dir * d}px)`, opacity: 0 }], { ...ANDA, fill: "forwards" })),
        fim(entra.animate([{ transform: `translateX(${dir * d}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], ANDA)),
      ]);
    } finally {
      sai.classList.add("hidden"); soltar(sai);
      for (const an of sai.getAnimations()) an.cancel(); // o fill: forwards não pode ficar preso: a tela voltaria invisível
      if (entra) soltar(entra);
      terminar();
    }
  }

  // as abas da sede (o mesmo lugar, outro conteúdo): o miolo sai para um lado e o novo entra pelo outro
  function marcar(aba) { for (const b of document.querySelectorAll("#abasSede [data-aba]")) b.setAttribute("aria-selected", String(b.dataset.aba === aba)); }
  async function aba(nova, dirPedida) {
    const grade = document.querySelector("#sede .hub-grade");
    if (ocupado && abaPedida) { abaPedida = nova; return marcar(nova); } // clicou de novo no meio: vale a última
    const dir = dirPedida || Math.sign(lugar("sede", nova) - lugar("sede", abaAtual()));
    if (ocupado || !dir || reduz() || !grade || atual() !== "sede") return mostrarAbaSede(nova);
    comecar(); abaPedida = nova; marcar(nova);
    const d = Math.round(Math.min(innerWidth, grade.getBoundingClientRect().width) * 0.4);
    try {
      await fim(grade.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-dir * d}px)`, opacity: 0 }], SAI_ABA));
      mostrarAbaSede(abaPedida);
      const velhas = grade.getAnimations(), anim = grade.animate([{ transform: `translateX(${dir * d}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], ENTRA_ABA);
      for (const an of velhas) an.cancel();
      await fim(anim);
    } finally {
      for (const an of grade.getAnimations()) an.cancel();
      abaPedida = null; terminar();
    }
  }

  // o botão do cabeçalho: "← Vila" na sede, na entrada e na partida; "← Sede" nas telas de gestão
  function cabecalho(id) {
    if (!ocupado) document.body.classList.remove("zoom-ativo"); // uma troca sem deslizar volta a ter a entrada em cascata
    const a = document.querySelector("#barra .voltar"); if (!a) return;
    const sede = TELAS_DE_GESTAO.has(id);
    if (!sede && a.classList.contains("para-sede")) voltouEm = Date.now(); // acabou de virar "← Vila": o toque repetido não sai da carreira
    a.textContent = sede ? "← Sede" : "← Vila"; a.classList.toggle("para-sede", sede);
    if (sede) { a.setAttribute("href", "#sede"); a.dataset.ir = "sede"; } else { a.setAttribute("href", "/"); delete a.dataset.ir; }
  }
  // para onde ir: entre a sede e as telas de gestão (e de uma tela de gestão para outra) desliza; o resto troca direto
  function ir(id, de, dirPedida) {
    if (ocupado) return; // durante a troca, nenhum clique troca de tela (nem cai no "← Vila" que aparece por baixo)
    const daqui = atual(), gestao = (x) => TELAS_DE_GESTAO.has(x);
    const desliza = daqui !== id && ((daqui === "sede" && gestao(id)) || (gestao(daqui) && (id === "sede" || gestao(id))));
    if (!desliza || reduz()) return mostrarTela(id);
    let dir = dirPedida;
    if (!dir) { const a = lugar(daqui, abaAtual()), b = lugar(id, abaAtual()); dir = a < 0 || b < 0 ? (id === "sede" ? -1 : 1) : Math.sign(b - a) || 1; }
    cabecalho(id); // o cabeçalho já muda no começo
    return deslizar(daqui, id, dir);
  }
  // um passo na fila (o dedo arrastado para o lado): para a aba ou o bloco vizinho
  function passo(k) {
    const fila = ordem(), i = lugar(atual(), abaAtual()), destino = fila[i + k];
    if (i < 0 || !destino) return;
    const ehAba = typeof ABAS_SEDE !== "undefined" && ABAS_SEDE.includes(destino);
    if (ehAba && atual() === "sede") return aba(destino, k);
    if (ehAba) { mostrarAbaSede(destino); return ir("sede", null, k); }
    return ir(destino, null, k);
  }

  // arrastar o dedo para o lado troca de aba ou de tela, menos em cima do que já anda para o lado (tabelas largas, a
  // prancheta, campos de texto) ou com um diálogo aberto
  function rolaDeLado(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
    }
    return false;
  }
  let toque = null;
  document.addEventListener("touchstart", (e) => {
    toque = null;
    if (e.touches.length !== 1 || ocupado) return;
    const daqui = atual(), alvo = e.target;
    if (daqui !== "sede" && !TELAS_DE_GESTAO.has(daqui)) return;
    if (!alvo.closest || alvo.closest("input,select,textarea,dialog,[data-jogador],.campo") || document.querySelector("dialog[open]") || rolaDeLado(alvo)) return;
    toque = { x: e.touches[0].clientX, y: e.touches[0].clientY, em: Date.now() };
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    const t = toque; toque = null;
    if (!t || ocupado || document.body.classList.contains("arrastando")) return;
    const p = e.changedTouches[0], dx = p.clientX - t.x, dy = p.clientY - t.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2 || Date.now() - t.em > 700) return;
    passo(dx < 0 ? 1 : -1); // o dedo para a esquerda leva para a direita da fila
  }, { passive: true });

  // clicou no cabeçalho com a troca rodando: não faz nada (em vez de sair da carreira sem querer)
  // nem logo depois de voltar à sede (o segundo toque no "← Sede" caía no "← Vila", que aparece no mesmo lugar)
  document.addEventListener("click", (e) => { if ((ocupado || Date.now() - voltouEm < 900) && e.target.closest && e.target.closest("#barra .voltar")) { e.preventDefault(); e.stopPropagation(); } }, true);
  return { ir, aba, passo, cabecalho, TELAS_DE_GESTAO, ocupado: () => ocupado };
})();
