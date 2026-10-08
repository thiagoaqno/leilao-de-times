// Teclado, mouse e joystick usam o mesmo formato de comando.
const toque = Toque.isTouch();
const entrada = { teclas: new Set(), mouse: null, stick: { x: 0, y: 0 }, preparando: null, miraSolta: null, golpe: null, esquiva: false, esquivaLocal: false, troca: null };
const podeComandar = () => socket.connected && S?.phase === "play" && !salaVisivel && !!ME?.id && !document.querySelector("dialog[open]");
function limparControles() {
  entrada.teclas.clear(); entrada.stick = { x: 0, y: 0 }; entrada.preparando = null; entrada.miraSolta = null;
  entrada.golpe = null; entrada.esquiva = false; entrada.esquivaLocal = false; entrada.troca = null;
}
function comandoAtual() {
  if (!podeComandar()) return { dx: 0, dy: 0, mira: { x: 1, y: 0 } };
  const k = entrada.teclas;
  let dx = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
  let dy = (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);
  if (Math.hypot(entrada.stick.x, entrada.stick.y) > 0.15) { dx = entrada.stick.x; dy = entrada.stick.y; }
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  const e = N.previsto, pos = e || N.snap?.entidades.find((p) => p.id === ME.id);
  if (!pos) return { dx, dy, mira: { x: 1, y: 0 } };
  let alvo = entrada.mouse;
  if (toque || !alvo) {
    const inimigos = N.snap?.entidades.filter((o) => o.lado !== pos.lado && o.campo) || [];
    inimigos.sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y));
    alvo = inimigos[0] || { x: pos.x + (pos.lado ? -5 : 5), y: pos.y };
  }
  const direcaoManual = entrada.miraSolta || (entrada.preparando != null && l > 0.15 ? { x: dx, y: dy } : null);
  if (direcaoManual) alvo = { x: pos.x + direcaoManual.x * 5, y: pos.y + direcaoManual.y * 5 };
  const mx = alvo.x - pos.x, my = alvo.y - pos.y, d = Math.hypot(mx, my) || 1;
  return { dx, dy, mira: { x: mx / d, y: my / d }, alvo: { x: alvo.x, y: alvo.y } };
}
function mandarGolpe(i) { if (!podeComandar()) return; ativarSom(); entrada.golpe = i; }
function mandarEsquiva() { if (!podeComandar()) return; ativarSom(); entrada.esquiva = entrada.esquivaLocal = true; }
function mandarTroca(i) { if (podeComandar()) entrada.troca = i; }
document.addEventListener("keydown", (e) => {
  if (!podeComandar() || e.target.closest?.("input,select,textarea,[contenteditable]")) return;
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "Space", "KeyQ", "KeyE", "Digit1", "Digit2", "Digit3"].includes(e.code)) e.preventDefault();
  entrada.teclas.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyQ") mandarGolpe(2); if (e.code === "KeyE") mandarGolpe(3);
  if (e.code === "Space") mandarEsquiva();
  if (["Digit1", "Digit2", "Digit3"].includes(e.code)) mandarTroca(+e.code.slice(-1) - 1);
});
document.addEventListener("keyup", (e) => entrada.teclas.delete(e.code));
cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") entrada.mouse = pontoMundo(e.clientX, e.clientY); });
cv.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || !podeComandar()) return;
  e.preventDefault(); entrada.mouse = pontoMundo(e.clientX, e.clientY);
  if (e.button === 0) mandarGolpe(0); if (e.button === 2) mandarGolpe(1);
});
cv.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("blur", limparControles);
document.addEventListener("visibilitychange", () => { if (document.hidden) limparControles(); });
document.querySelectorAll("dialog").forEach((d) => d.addEventListener("close", limparControles));

function configurarToque() {
  if (!toque) return;
  const e = N.snap?.entidades.find((p) => p.id === ME?.id), mon = e && dexAtual().MONS[e.forma || e.bicho];
  if (!mon) return;
  Toque.setup({
    onStick: (x, y) => { entrada.stick = { x, y }; },
    buttons: [
      ...mon.moves.map((id, i) => ({
        icon: ic(iconeHabilidade(Ginasio.habilidadeDeGolpe(id, dexAtual().MOVES[id]))), label: dexAtual().MOVES[id].n,
        down: () => { if (podeComandar()) { ativarSom(); entrada.preparando = i; } },
        up: () => {
          if (entrada.preparando !== i) return;
          if (Math.hypot(entrada.stick.x, entrada.stick.y) > 0.15) { const d = Math.hypot(entrada.stick.x, entrada.stick.y); entrada.miraSolta = { x: entrada.stick.x / d, y: entrada.stick.y / d }; }
          entrada.preparando = null; mandarGolpe(i);
        },
      })),
      { icon: ic("pular"), label: modoAtual() === "naruto" ? "Subst." : "Esquiva", down: mandarEsquiva },
    ],
  });
  const el = $("toque");
  el.querySelectorAll(".btns button").forEach((b, i) => {
    b.setAttribute("aria-label", i === 4 ? (modoAtual() === "naruto" ? "Substituição" : "Esquiva") : dexAtual().MOVES[mon.moves[i]].n);
    b.title = b.getAttribute("aria-label"); b.dataset.habilidade = i;
    b.insertAdjacentHTML("beforeend", '<i class="recarga"></i><span class="segundos"></span>');
  });
  if (!el._cancela) { el.addEventListener("pointercancel", () => { entrada.preparando = null; entrada.miraSolta = null; }, true); el._cancela = true; }
}
