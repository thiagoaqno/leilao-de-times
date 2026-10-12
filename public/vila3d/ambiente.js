// Música ambiente da Vila (public/vila3d/musica/): 5% do volume, toca sozinha e passa para a próxima; o botão silencia.
export const VOLUME = 0.05;
export function ligar(botao) {
  let mudo = false;
  try { mudo = localStorage.getItem("vila3d:mudo") === "1"; } catch (e) { /* sem armazenamento */ }
  fetch("/api/musicas-vila3d").then((r) => r.json()).then((lista) => {
    if (!lista.length) return;
    botao.style.display = "";
    let i = 0;
    const audio = new Audio(lista[0].url); audio.volume = VOLUME; audio.muted = mudo;
    audio.addEventListener("ended", () => { i = (i + 1) % lista.length; audio.src = lista[i].url; audio.play().catch(() => {}); });
    const pintar = () => { botao.firstChild.textContent = mudo ? "🔇" : "🔊"; botao.title = mudo ? "Ligar a música" : "Silenciar a música"; };
    const tocar = () => audio.play().then(() => { for (const ev of ["pointerdown", "keydown"]) removeEventListener(ev, tocar); }).catch(() => {}); // sem toque na página o navegador pode recusar: tenta no primeiro toque
    botao.addEventListener("click", () => {
      mudo = !mudo; audio.muted = mudo; pintar(); botao.blur();
      try { localStorage.setItem("vila3d:mudo", mudo ? "1" : "0"); } catch (err) { /* sem armazenamento */ }
      if (!mudo) audio.play().catch(() => {});
    });
    pintar(); tocar();
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, tocar);
  }).catch(() => {});
}
