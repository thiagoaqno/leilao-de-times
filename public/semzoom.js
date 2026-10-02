// Sem zoom no celular (em todas as páginas): o toque duplo e a pinça davam zoom no meio do jogo e bagunçavam tudo.
// O viewport já pede user-scalable=no, mas o Safari do iPhone ignora isso, então aqui também:
//  - touch-action: manipulation tira o zoom do toque duplo (e o atraso do clique), sem atrapalhar os toques;
//  - pinça com dois dedos e os gestos do Safari (gesturestart) são cancelados;
//  - toque duplo rápido no mesmo lugar não vira zoom (o segundo toque continua chegando como toque normal).
(function () {
  const css = document.createElement("style");
  css.textContent = "html,body{touch-action:manipulation;-webkit-text-size-adjust:100%}";
  document.head.appendChild(css);
  const nao = (e) => e.preventDefault();
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, nao, { passive: false });
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1 && e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("dblclick", nao, { passive: false });
  let ultimo = { t: 0, x: 0, y: 0 };
  document.addEventListener("touchend", (e) => {
    const t = Date.now(), c = e.changedTouches[0], x = c ? c.clientX : 0, y = c ? c.clientY : 0;
    // toque duplo no mesmo lugar: o navegador daria zoom. Cancela só esse caso (toques rápidos em lugares
    // diferentes, como duas cartas seguidas, continuam normais), e campos de texto ficam de fora
    if (t - ultimo.t < 320 && Math.hypot(x - ultimo.x, y - ultimo.y) < 40 && e.touches.length === 0 && !(e.target.closest && e.target.closest("input,textarea,select,[contenteditable]"))) e.preventDefault();
    ultimo = { t, x, y };
  }, { passive: false });
})();
