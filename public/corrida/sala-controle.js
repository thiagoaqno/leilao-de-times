// Corrida da Galera — teclado e controle (Gamepad API) na sala. Antes só a corrida lia o controle (controles.js); aqui o direcional e o
// analógico esquerdo movem o foco entre os botões (setas no teclado), A confirma (Enter), B volta uma etapa (Esc), LB e RB (Q e E)
// trocam a equipe ou o composto do pneu, Y abre as peças e pintura e Start é o Continuar (ou o Largar, na última etapa).
// Os botões da sala são botões de verdade: o foco é o do navegador e a confirmação é o `click()` do botão em foco. As dicas dos botões
// (#snDicas) aparecem quando há um controle conectado (`body.sn-pad`); sem ele, as teclas (só em tela com mouse).
// `api`: { ativo(), raiz(), voltar(), continuar(), lateral(d), atalho(), inicial(lista) } — vem de menus.js, que sabe a etapa de agora.
const SEL = "button:not(:disabled), summary, a[href], [tabindex='0']";
const reduz = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function visivel(el) {
  if (el.closest(".hidden,[hidden],.sai,[inert]")) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
  return getComputedStyle(el).visibility !== "hidden";
}
const focaveis = (raiz) => [...raiz.querySelectorAll(SEL)].filter(visivel);
const centro = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// o vizinho mais bem posicionado na direção pedida: distância no eixo mais o desvio lateral (que pesa o dobro)
export function vizinho(atual, lista, dx, dy) {
  const ca = centro(atual.getBoundingClientRect()); let melhor = null, nota = Infinity;
  for (const el of lista) {
    if (el === atual) continue;
    const c = centro(el.getBoundingClientRect());
    const eixo = dx ? (c.x - ca.x) * dx : (c.y - ca.y) * dy, lado = Math.abs(dx ? c.y - ca.y : c.x - ca.x);
    if (eixo <= 2) continue; // tem de estar mesmo na direção
    const n = eixo + lado * 2 + (lado > eixo * 2.2 ? 400 : 0); // quem está muito de lado só ganha se não houver outro
    if (n < nota) { nota = n; melhor = el; }
  }
  return melhor;
}
function focar(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  try { el.scrollIntoView({ block: "nearest", inline: "center", behavior: reduz() ? "auto" : "smooth" }); } catch (e) { el.scrollIntoView(); }
}

export function iniciarControle(api) {
  const corpo = document.body;
  const modoNav = (v) => corpo.classList.toggle("sn-nav", v); // anel de foco forte quando se navega sem o mouse
  document.addEventListener("pointerdown", () => modoNav(false), true);
  function mover(dx, dy) {
    const raiz = api.raiz(), lista = focaveis(raiz); if (!lista.length) return;
    modoNav(true);
    const atual = document.activeElement;
    if (!atual || atual === document.body || !lista.includes(atual)) return focar(api.inicial(lista) || lista[0]);
    focar(vizinho(atual, lista, dx, dy) || atual);
  }
  function confirmar() {
    const raiz = api.raiz(), atual = document.activeElement; modoNav(true);
    if (atual && atual !== document.body && raiz.contains(atual) && visivel(atual)) atual.click();
    else { const l = focaveis(raiz); focar(api.inicial(l) || l[0]); }
  }
  // teclado: as setas movem, Esc volta, Q e E (ou PgUp e PgDn) trocam; Enter e Espaço já ativam o botão em foco
  const SETAS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener("keydown", (e) => {
    if (!api.ativo() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (SETAS[e.key]) { e.preventDefault(); mover(...SETAS[e.key]); return; }
    if (e.key === "Escape") { e.preventDefault(); api.voltar(); return; }
    if (e.key === "q" || e.key === "Q" || e.key === "PageUp") { e.preventDefault(); api.lateral(-1); return; }
    if (e.key === "e" || e.key === "E" || e.key === "PageDown") { e.preventDefault(); api.lateral(1); return; }
    if (e.key === "Enter" && (!t || t === document.body)) { e.preventDefault(); confirmar(); }
  });
  // controle
  let prev = [], conectado = false, dirAntes = "", proxima = 0;
  const pegar = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected);
  const ligar = (v) => { if (v === conectado) return; conectado = v; corpo.classList.toggle("sn-pad", v); };
  window.addEventListener("gamepadconnected", () => ligar(true));
  window.addEventListener("gamepaddisconnected", () => { if (!pegar()) ligar(false); });
  function laco(agora) {
    requestAnimationFrame(laco);
    const gp = pegar();
    if (!gp) { prev = []; ligar(false); return; }
    const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5)), hit = (i) => b(i) && !prev[i];
    const botoes = gp.buttons.map((_, i) => b(i));
    if (!api.ativo()) { prev = botoes; return; }
    if (botoes.some(Boolean) || Math.abs(gp.axes[0] || 0) > 0.5 || Math.abs(gp.axes[1] || 0) > 0.5) ligar(true);
    // direção: direcional (12 a 15) ou analógico esquerdo; a primeira repetição é lenta e as seguintes mais rápidas
    let dx = +b(15) - +b(14), dy = +b(13) - +b(12); const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (!dx && Math.abs(ax) > 0.55 && Math.abs(ax) > Math.abs(ay)) dx = Math.sign(ax);
    if (!dy && !dx && Math.abs(ay) > 0.55) dy = Math.sign(ay);
    const dir = `${dx},${dy}`;
    if (dx || dy) {
      if (dir !== dirAntes) { mover(dx, dy); proxima = agora + 380; }
      else if (agora >= proxima) { mover(dx, dy); proxima = agora + 120; }
    }
    dirAntes = dx || dy ? dir : "";
    if (hit(0)) confirmar();
    if (hit(1)) api.voltar();
    if (hit(4)) api.lateral(-1);
    if (hit(5)) api.lateral(1);
    if (hit(3)) api.atalho();
    if (hit(9)) api.continuar();
    prev = botoes;
  }
  requestAnimationFrame(laco);
  if (pegar()) ligar(true);
}
