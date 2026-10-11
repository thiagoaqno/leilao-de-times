// Música da Carreira: um botão na barra de cima abre um mini-tocador (tocar/pausar, anterior/próxima e volume).
// As faixas vêm de GET /api/musicas (arquivos de public/musica). Cada pessoa ouve a sua; nada baixa antes de tocar.
(() => {
  const barra = document.getElementById("barra");
  if (!barra) return;
  const css = document.createElement("style");
  css.textContent = `
.musica-bt{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--b1);background:transparent;color:var(--t2);font:inherit;font-size:13px;font-weight:500;cursor:pointer;margin-left:auto}
.musica-bt:hover{background:var(--s2);color:var(--t1)}
.musica-bt.tocando{color:var(--t1);border-color:currentColor}
.musica-bt[hidden]{display:none}
.musica-bt + #conexao{margin-left:0}
.musica-cx{position:fixed;right:max(12px,env(safe-area-inset-right));top:58px;z-index:40;display:none;flex-direction:column;gap:8px;width:min(260px,calc(100% - 24px));padding:12px;background:var(--s2);color:var(--t1);border:1px solid var(--b1);border-radius:10px}
.musica-cx.on{display:flex}
.musica-cx b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.musica-cx .lin{display:flex;align-items:center;gap:8px}
.musica-cx button{min-width:40px;min-height:36px;border-radius:8px;border:1px solid var(--b1);background:transparent;color:inherit;cursor:pointer}
.musica-cx input[type=range]{flex:1;min-width:0}`;
  document.head.appendChild(css);
  const bt = document.createElement("button");
  bt.className = "musica-bt"; bt.hidden = true; bt.title = "Música"; bt.textContent = "♪ Música";
  const cx = document.createElement("div");
  cx.className = "musica-cx"; cx.setAttribute("role", "group"); cx.setAttribute("aria-label", "Música");
  cx.innerHTML = '<b id="mNome">—</b><div class="lin"><button id="mAnt" aria-label="Anterior">⏮</button><button id="mTocar" aria-label="Tocar ou pausar">▶</button><button id="mProx" aria-label="Próxima">⏭</button></div><div class="lin"><span aria-hidden="true">Vol</span><input type="range" id="mVol" min="0" max="100" aria-label="Volume"></div>';
  barra.insertBefore(bt, document.getElementById("conexao"));
  document.body.appendChild(cx);
  const $ = (id) => cx.querySelector("#" + id);
  const ler = () => { try { return JSON.parse(localStorage.getItem("galera:musica")) || {}; } catch (e) { return {}; } };
  const guardar = () => { try { localStorage.setItem("galera:musica", JSON.stringify({ vol, tocando, i })); } catch (e) { /* sem armazenamento */ } };
  const salvo = ler();
  let lista = [], i = Math.max(0, salvo.i | 0), vol = typeof salvo.vol === "number" ? salvo.vol : 0.4, tocando = salvo.tocando !== false; // liga sozinha, a menos que a pessoa tenha pausado
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
  bt.addEventListener("click", () => cx.classList.toggle("on"));
  $("mTocar").addEventListener("click", () => (audio.paused ? tocar() : pausar()));
  $("mProx").addEventListener("click", () => { carregar(i + 1); tocar(); });
  $("mAnt").addEventListener("click", () => { carregar(i - 1); tocar(); });
  $("mVol").addEventListener("input", (e) => { vol = e.target.value / 100; audio.volume = vol; guardar(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") cx.classList.remove("on"); });

  fetch("/api/musicas").then((r) => r.json()).then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    lista = l;
    i = Math.min(i, lista.length - 1);
    audio.volume = vol;
    bt.hidden = false;
    pintar();
    if (tocando) { // começa sozinha; se o navegador barrar, começa no primeiro toque na página (regra de autoplay dos navegadores)
      const um = () => { removeEventListener("pointerdown", um); removeEventListener("keydown", um); if (tocando && audio.paused) tocar(); };
      addEventListener("pointerdown", um); addEventListener("keydown", um);
      tocar();
    }
  }).catch(() => {});
})();
