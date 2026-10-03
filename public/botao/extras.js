// Futebol de Botão da Galera — reações, regras e a arte da página inicial (parte 5 de 5 do script da página; os arquivos rodam em ordem, pelo
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

// ---------- regras (as desta mesa, se você estiver numa) ----------
$("btnRules").onclick = () => {
  const c = S ? S.config : { toques: 3, mesa: "fechada", goleiro: true, cobranca: true, superTiro: false };
  $("modalBox").innerHTML = `<h2>Como jogar</h2>
  <h3>Controles</h3><ul>
  <li><b>Chutar:</b> toque numa tampinha sua (a escolhida fica com o anel dourado), puxe para trás e solte, como um estilingue. A seta mostra a direção e a força. Para usar a mesma tampinha, dá para puxar de qualquer lugar do campo.</li>
  <li><b>Mira:</b> a seta mostra a direção e a força do peteleco.${c.trajetoria ? " Nesta mesa a mira tem trajetória: a linha tracejada mostra em que peça a tampinha vai bater e, se for a bola, a linha amarela mostra para onde ela vai." : " Onde a tampinha vai bater e para onde a bola vai, é no olho (o organizador pode ligar a mira com trajetória)."}</li>
  <li><b>Teclado:</b> Tab troca de tampinha, ← → miram, ↑ ↓ mudam a força e Espaço chuta.</li></ul>
  <h3>A vez${S ? " (nesta mesa)" : ""}</h3><ul>
  <li>Cada time tem <b>${c.tampinhas || 5} tampinhas</b> e cada vez tem <b>${c.toques} toques</b>. Todo peteleco conta, mesmo sem encostar na bola: dá para usar um toque só para se posicionar.</li>
  <li><b>Saída:</b> no começo do jogo e depois de cada gol, a primeira vez de cada time vale <b>só 1 toque</b> (nada de sair driblando até o gol). Depois, volta aos ${c.toques} toques.</li>
  <li>Num time com mais de um jogador, <b>cada toque é de um</b>: um passa, o outro recebe, e quem começa vai revezando. Sozinho, você faz todos.</li>
  <li>Bater primeiro numa tampinha adversária é <b>falta</b>: passa a vez na hora, e o outro time cobra de onde a bola está.</li>
  <li>${c.mesa === "aberta" ? "A bola sai: <b>lateral</b> para quem não tocou por último; pela linha de fundo, <b>escanteio</b> (se o defensor tocou por último) ou <b>tiro de meta</b>." : "A mesa é <b>fechada</b>: não tem lateral, a bola bate na borda e continua em jogo."}</li>
  ${c.cobranca ? `<li><b>Bola parada</b> (falta${c.mesa === "aberta" ? ", lateral, escanteio" : ""}, tiro de meta): quem cobra aperta <b>✋ Arrumar tampinha</b> e arrasta a sua tampinha para perto da bola antes de bater. O outro time fica parado.</li>` : ""}
   ${c.goleiro ? `<li><b>Goleiro:</b> o bloquinho na frente do gol. Qualquer um do time arrasta o seu para cima e para baixo <b>a qualquer hora</b>, inclusive enquanto o adversário mira. Quando as peças começam a andar, ele fica parado onde estava.</li>` : ""}
   ${c.superTiro ? `<li><b>⚡ Super palhetada:</b> cada passe certo (uma tampinha toca e outra do time recebe) enche a barra. Com ${BAR_MAX}, aparece o botão: o próximo peteleco sai ${Math.round((B.SUPER - 1) * 100)}% mais forte.</li>` : ""}
  </ul>
  <h3>Gol</h3><ul>
  <li>Gol vale <b>de qualquer lugar do campo</b>, até de trás do meio. Só não vale se teve falta antes.</li>
  <li>Gol contra vale sempre. Depois do gol, quem levou dá a saída.</li>
  <li>Ganha o jogo quem chegar primeiro aos gols combinados. Com tempo: quando acaba, ganha quem está na frente; empatado, é <b>gol de ouro</b>.</li></ul>
  <h3>Modos</h3><ul>
  <li><b>Times:</b> 1x1, 2x2, 3x3, 4x4 ou desigual (3x2, 4x3…). Cada um escolhe o seu lado na sala.</li>
  <li><b>Rei do campo:</b> cada um por si; quem ganha fica, quem perde vai para o fim da fila. <b>Mata-mata:</b> semifinais e final.</li>
  <li><b>Camisas:</b> Corinthians, São Paulo, Santos, Palmeiras e mais. Dá para repetir; se os dois lados escolherem o mesmo time, o segundo joga com a camisa invertida.</li>
  <li><b>Formação:</b> 2-2, 3-1, 1-2-1 (losango) ou 1-1-2, sempre com a tampinha 1 guardando o gol (ela é o goleiro). Cada time escolhe a sua na sala.</li>
  <li>O organizador escolhe o resto (toques, mesa, goleiro, bola parada, super e o estádio) na sala de espera.</li></ul>
  <div class="row" style="margin-top:16px"><button class="primary" id="rulesOk">Bora!</button></div>`;
  $("modal").classList.remove("hidden");
  $("rulesOk").onclick = () => $("modal").classList.add("hidden");
};
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });

// ---------- arte da página inicial: um lance armado na mesa ----------
(function heroArt() {
  const c = $("heroArt").getContext("2d");
  const draw = () => {
    c.clearRect(0, 0, 960, 600);
    c.save(); c.translate(480, 300); c.rotate(-0.1);
    const sc = 0.62;
    c.fillStyle = "#5a3418"; c.beginPath(); c.roundRect ? c.roundRect(-410, -270, 820, 540, 34) : c.rect(-410, -270, 820, 540); c.fill();
    c.fillStyle = "#24683a"; c.fillRect(-380, -240, 760, 480);
    for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? "#2e8a49" : "#2a7f43"; c.fillRect(-350 + k * 87.5, -210, 88, 420); }
    c.strokeStyle = "#f4f1e6"; c.lineWidth = 3; c.strokeRect(-350, -210, 700, 420);
    c.beginPath(); c.moveTo(0, -210); c.lineTo(0, 210); c.stroke(); c.beginPath(); c.arc(0, 0, 56, 0, 7); c.stroke();
    c.strokeRect(266, -105, 84, 210); c.strokeRect(-350, -105, 84, 210);
    c.fillStyle = "#0e2a17"; c.fillRect(350, -56, 28, 112); c.strokeRect(350, -56, 28, 112);
    view.s = 1; view.rot = false; view.flip = false;
    c.save(); c.translate(0, 0); c.scale(sc * 1.3, sc * 1.3);
    const kA = KITS.santos, kB = KITS.palmeiras;
    [[-250, 0, 1], [-140, -90, 2], [-140, 90, 3], [60, -50, 4], [175, 40, 5]].forEach(([x, y, n]) => drawButton(c, { x, y, n }, kA));
    [[330, -40, 1], [250, 120, 3], [60, 160, 2]].forEach(([x, y, n]) => drawButton(c, { x, y, n }, kB));
    c.restore();
    // a bola na frente do 5, prontinha
    c.save(); c.scale(sc * 1.3, sc * 1.3); drawBall(c, 175 + RB + RBALL + 2, 32); c.restore();
    c.restore();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
})();
