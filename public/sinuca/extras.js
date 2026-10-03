// Sinuca da Galera — reações, regras e a arte da página inicial (parte 5 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- reações ----------
function renderReacts() {
  const m = me(); const el = $("reacts");
  el.classList.toggle("hidden", !m);
  if (!m || el.dataset.ok) return;
  el.dataset.ok = 1;
  el.innerHTML = REACTIONS.map((e) => `<button data-e="${e}">${e}</button>`).join("");
  el.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => socket.emit("react", { emoji: b.dataset.e })));
}
socket.on("react", ({ player, emoji }) => {
  const av = $("av-" + player); let x, y;
  if (av) { const r = av.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  else { const r = cv.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  Comum.flutuar(emoji, x, y);
});

// ---------- regras ----------
$("btnRules").onclick = () => {
  $("modalBox").innerHTML = `<h2>Como jogar</h2>
  <h3>Controles</h3><ul>
  <li><b>Mirar:</b> arraste o dedo (ou o mouse) na mesa. A linha mostra onde a branca bate e para onde a bola vai. Para ajustes pequenos, use o <b>ajuste fino</b>, a rodinha do mouse ou as setas ← →.</li>
  <li><b>Bater:</b> puxe o taco na barra de força e solte. Quanto mais puxar, mais forte. (No teclado: ↑ ↓ e Espaço.)</li>
  <li><b>Efeito:</b> toque na bolinha branca do lado para escolher onde o taco bate: em cima a branca segue a bola, embaixo ela volta, nos lados ela abre ou fecha o ângulo na tabela. Duplo clique zera.</li>
  <li><b>Bola na mão:</b> arraste a branca para onde quiser (na saída, só atrás da linha tracejada).</li></ul>
  <h3>Bola 8</h3><ul>
  <li>Um lado fica com as <b>lisas</b> (1 a 7) e o outro com as <b>listradas</b> (9 a 15). A mesa fica aberta até alguém encaçapar uma bola numa tacada limpa depois da saída.</li>
  <li>Encaçapou uma bola sua? Joga de novo. Se não, passa a vez.</li>
  <li>Depois de encaçapar todas as suas, é a vez da <b>8</b>: marque a caçapa e acerte. Quem encaçapar a 8 na caçapa marcada vence a partida.</li>
  <li><b>Perde na hora</b> quem encaçapar a 8 antes da hora, na caçapa errada ou junto com a branca.</li>
  <li>A 8 que cai na saída volta para a marca.</li></ul>
  <h3>Faltas (bola na mão para o outro lado)</h3><ul>
  <li>A branca cair na caçapa.</li><li>A branca não tocar em nenhuma bola, ou tocar primeiro numa bola que não é sua (na mesa aberta, vale qualquer uma menos a 8).</li>
  <li>Depois do toque, nenhuma bola bater na tabela e nenhuma cair.</li><li>Estourar o tempo da tacada.</li></ul>
  <h3>Modos</h3><ul>
  <li><b>Duplas (2x2):</b> as duplas se revezam e, dentro de cada dupla, os dois se alternam. As bolas são da dupla.</li>
  <li><b>Rei da mesa:</b> quem ganha fica, quem perde vai para o fim da fila. O primeiro a chegar nas vitórias combinadas é campeão.</li>
  <li><b>Mata-mata:</b> semifinais e final (com 8 jogadores, quartas também).</li></ul>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });

// ---------- arte da página inicial: um triângulo arrumado ----------
(function heroArt() {
  const c = $("heroArt").getContext("2d");
  const draw = () => {
    c.clearRect(0, 0, 960, 540);
    c.save(); c.translate(480, 270); c.rotate(-0.12);
    c.fillStyle = "#3f2210"; c.beginPath(); c.roundRect ? c.roundRect(-420, -230, 840, 460, 40) : c.rect(-420, -230, 840, 460); c.fill();
    const fg = c.createRadialGradient(0, 0, 40, 0, 0, 420); fg.addColorStop(0, "#23905a"); fg.addColorStop(1, "#11583a");
    c.fillStyle = fg; c.fillRect(-380, -190, 760, 380);
    const slots = Fi.rackSlots(), nums = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
    const sc = 2.1;
    for (const [i, s] of slots.entries()) { const x = (s.x - Fi.FOOT_X) * sc + 40, y = (s.y - Fi.MID_Y) * sc, n = nums[i]; ball(x, y, n, sc); }
    ball(-250, 10, 0, sc);
    c.restore();
  };
  function ball(x, y, n, sc) {
    const r = R * sc, col = colorOf(n);
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
    c.fillStyle = n > 8 || n === 0 ? "#f4f1e8" : col; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    if (n > 8) { c.fillStyle = col; c.fillRect(x - r, y - r * 0.5, 2 * r, r); }
    if (n) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, r * 0.48, 0, 7); c.fill(); c.fillStyle = "#111"; c.font = `800 ${r * 0.6}px Figtree`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, x, y + 1); }
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r); g.addColorStop(0, "#ffffffaa"); g.addColorStop(0.3, "#ffffff00"); g.addColorStop(1, "#00000070");
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
})();
