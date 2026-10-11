// Música da Vila: o botão 🎵 da header abre um mini-tocador (tocar/pausar, anterior/próxima e volume).
// As faixas vêm de GET /api/musicas (arquivos de public/musica). Cada pessoa ouve a sua; nada é baixado antes de tocar.
(() => {
  const bt = document.getElementById("bMusica"), caixa = document.getElementById("musica");
  if (!bt || !caixa) return;
  const $ = (id) => document.getElementById(id);
  const ler = () => { try { return JSON.parse(localStorage.getItem("galera:musica")) || {}; } catch (e) { return {}; } };
  const guardar = () => { try { localStorage.setItem("galera:musica", JSON.stringify({ vol, tocando, i })); } catch (e) { /* sem armazenamento */ } };
  const salvo = ler();
  let lista = [], i = Math.max(0, salvo.i | 0), vol = typeof salvo.vol === "number" ? salvo.vol : 0.4, tocando = !!salvo.tocando;
  const audio = new Audio();
  audio.preload = "none";

  function pintar() {
    $("mNome").textContent = lista[i] ? lista[i].nome : "—";
    $("mTocar").textContent = audio.paused ? "▶" : "⏸";
    bt.classList.toggle("tocando", !audio.paused);
    $("mVol").value = Math.round(vol * 100);
  }
  function carregar(n) {
    i = (n + lista.length) % lista.length;
    audio.src = lista[i].url;
    guardar();
  }
  function tocar() {
    if (!lista.length) return;
    if (!audio.src) carregar(i);
    audio.volume = vol;
    // o navegador só deixa tocar depois de um toque ou tecla da pessoa: se recusar, fica pausado
    audio.play().then(() => { tocando = true; guardar(); pintar(); }).catch(() => { pintar(); });
  }
  function pausar() { audio.pause(); tocando = false; guardar(); pintar(); }

  audio.addEventListener("ended", () => { carregar(i + 1); tocar(); });
  audio.addEventListener("error", () => { if (lista.length > 1) { carregar(i + 1); tocar(); } });
  audio.addEventListener("play", pintar);
  audio.addEventListener("pause", pintar);
  bt.addEventListener("click", () => caixa.classList.toggle("on"));
  $("mTocar").addEventListener("click", () => (audio.paused ? tocar() : pausar()));
  $("mProx").addEventListener("click", () => { carregar(i + 1); tocar(); });
  $("mAnt").addEventListener("click", () => { carregar(i - 1); tocar(); });
  $("mVol").addEventListener("input", (e) => { vol = e.target.value / 100; audio.volume = vol; guardar(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") caixa.classList.remove("on"); });

  fetch("/api/musicas").then((r) => r.json()).then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    lista = l;
    i = Math.min(i, lista.length - 1);
    audio.volume = vol;
    bt.hidden = false;
    pintar();
    if (tocando) { // quem deixou ligada volta a ouvir no primeiro toque na página (regra de autoplay dos navegadores)
      const um = () => { removeEventListener("pointerdown", um); removeEventListener("keydown", um); if (tocando && audio.paused) tocar(); };
      addEventListener("pointerdown", um); addEventListener("keydown", um);
      tocar();
    }
  }).catch(() => {});
})();
