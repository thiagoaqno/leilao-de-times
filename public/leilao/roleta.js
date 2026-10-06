// Leilão da Galera — o sorteio (divide as variáveis globais das outras partes do script da página).
// Uma fita de cartas corre pelo palco e vai freando até parar no jogador sorteado, embaixo da agulha (como abrir um
// pacote de cartas). Quando para, a carta escolhida brilha e o palco troca para a carta grande (palco.js).
// Com a roleta oculta, as outras cartas da fita aparecem viradas: só a sorteada mostra quem é.
const FITA_N = 44, FITA_ALVO = 36;
function spinTo(names, index, dur) {
  if (semMovimento()) return; // sem animação: o palco já mostra a carta sorteada
  spinning = true;
  const el = $("cena"), fb = isFootball(), icone = Icones.deTema(T()), id = S.spin && S.spin.id;
  cenaChave = "spin:" + id; atrasoVoo = 0;
  const carta = (nome, cls) => (nome === "?" ? versoHTML(cls) : cartaHTML(nome, { futebol: fb, icone, cls }));
  const sorteia = () => names[Math.floor(Math.random() * names.length)];
  const seq = Array.from({ length: FITA_N }, (_, i) => (i === FITA_ALVO ? carta(names[index], "alvo") : carta(sorteia())));
  el.innerHTML = `<div style="width:100%"><div class="roleta"><div class="fita">${seq.join("")}</div><div class="agulha"></div></div><div class="sorteando">Sorteando…</div></div>`;
  const fita = el.querySelector(".fita"), alvo = el.querySelector(".alvo"), caixa = el.querySelector(".roleta");
  // onde a fita precisa parar: o centro da carta sorteada embaixo da agulha (com um pouco de acaso para não parar
  // sempre no meio exato da carta)
  const w = alvo.offsetWidth, fim = caixa.offsetWidth / 2 - (alvo.offsetLeft + w / 2) + (Math.random() - 0.5) * w * 0.55;
  const t = Math.min(4500, Math.max(800, dur));
  fita.animate([{ transform: "translate(0,-50%)" }, { transform: `translate(${fim}px,-50%)` }], { duration: t, easing: "cubic-bezier(.06,.55,.1,1)", fill: "forwards" });
  const vez = ++fitaVez;
  setTimeout(() => {
    if (vez !== fitaVez) return;
    alvo.classList.add("chegou");
    const s = el.querySelector(".sorteando"); if (s) s.textContent = Ratings.parseItem(names[index]).name;
    setTimeout(() => { if (vez !== fitaVez) return; spinning = false; if (S) render(); }, 650);
  }, t);
}
let fitaVez = 0; // cada sorteio novo cancela o fim do anterior
