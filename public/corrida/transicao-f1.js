// Corrida da Galera — a transição "de TV" entre as cenas: uma varredura de listras pretas, brancas e vermelhas com um "F1" em
// itálico, ~0,5 s, por cima da corrida (transicao-f1.css). É só um elemento com `transform` animado em CSS (nada de canvas, nada
// por quadro). O elemento não pega toque nem clique, e qualquer tecla ou toque a encerra na hora (o corte da câmera acontece
// de qualquer jeito). Com `prefers-reduced-motion` (ou `rm`) ela não existe: devolve 0 e o corte é imediato.
// Quem chama espera `CORTE_MS` (devolvido) antes de trocar a câmera: é quando a faixa cobre a tela inteira.
export const CORTE_MS = 200, DURACAO_MS = 500;
const reduzido = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
let el = null, rotuloEl = null, timer = 0, ativa = false;

function encerrar() {
  if (!el || !ativa) return;
  ativa = false; clearTimeout(timer); el.classList.remove("on");
}
function criar(raiz) {
  el = document.createElement("div"); el.className = "f1Trans"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="f1Varre"><i class="f1Pt"></i><i class="f1Br"></i><i class="f1Vm"><b>F1</b><small></small></i><i class="f1Br"></i><i class="f1Pt f1Pt2"></i></div>';
  rotuloEl = el.querySelector("small");
  raiz.appendChild(el);
  el.addEventListener("animationend", encerrar, true);
  for (const ev of ["keydown", "pointerdown"]) window.addEventListener(ev, encerrar, true);
}

// `rotulo`: um texto curto embaixo do F1 (o nome da câmera, o bloco da transmissão). Devolve os ms até o corte (0 = sem transição).
export function transicaoF1({ rotulo = "", rm = false } = {}) {
  if (rm || reduzido.matches || typeof document === "undefined" || document.hidden) return 0;
  const raiz = document.getElementById("race"); if (!raiz) return 0;
  if (!el || el.parentNode !== raiz) criar(raiz);
  rotuloEl.textContent = rotulo;
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); ativa = true;
  clearTimeout(timer); timer = setTimeout(encerrar, DURACAO_MS + 150);
  return CORTE_MS;
}
