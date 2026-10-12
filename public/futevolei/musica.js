// Música do Futevôlei: a mesma lista da Vila (GET /api/musicas) e o mesmo ajuste salvo (galera:musica) da Carreira.
// Dois lugares com os mesmos controles: o botão ♪ da barra (início e sala) e a tela de pausa. Cada pessoa ouve a sua cópia.
(() => {
  const ler = () => { try { return JSON.parse(localStorage.getItem("galera:musica")) || {}; } catch (e) { return {}; } };
  const salvo = ler();
  let lista = [], i = Math.max(0, salvo.i | 0), vol = typeof salvo.vol === "number" ? salvo.vol : 0.3, tocando = salvo.tocando !== false;
  const guardar = () => { try { localStorage.setItem("galera:musica", JSON.stringify({ vol, tocando, i })); } catch (e) { /* sem armazenamento */ } };
  const audio = new Audio(); audio.preload = "none";
  const css = document.createElement("style");
  css.textContent = `.mus{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.mus[hidden]{display:none}
.mus b{font-size:13px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mus button{padding:6px 10px;min-width:36px;box-shadow:none}.mus input[type=range]{width:90px}
.mus-barra{margin-left:auto}`;
  document.head.appendChild(css);
  const pontos = [];
  function montar(onde, extra) {
    const d = document.createElement("div");
    d.className = "mus " + (extra || ""); d.hidden = true;
    d.innerHTML = '<button data-a="ant" aria-label="Anterior">⏮</button><button data-a="tocar" aria-label="Tocar ou pausar">▶</button><button data-a="prox" aria-label="Próxima">⏭</button><b>♪</b><input type="range" min="0" max="100" aria-label="Volume da música">';
    d.addEventListener("click", (e) => { const a = e.target.closest("button")?.dataset.a; if (!a) return; if (a === "tocar") (audio.paused ? tocar() : pausar()); else { carregar(i + (a === "prox" ? 1 : -1)); tocar(); } });
    d.querySelector("input").addEventListener("input", (e) => { vol = e.target.value / 100; audio.volume = vol; guardar(); pintar(); });
    onde(d); pontos.push(d);
  }
  function pintar() {
    for (const d of pontos) {
      d.hidden = !lista.length;
      d.querySelector("[data-a=tocar]").textContent = audio.paused ? "▶" : "⏸";
      d.querySelector("b").textContent = lista[i] ? "♪ " + lista[i].nome : "♪";
      d.querySelector("input").value = Math.round(vol * 100);
    }
  }
  function carregar(n) { i = (n + lista.length) % lista.length; audio.src = lista[i].url; guardar(); }
  function tocar() {
    if (!lista.length) return;
    if (!audio.src) carregar(i);
    audio.volume = vol;
    audio.play().then(() => { tocando = true; guardar(); pintar(); }).catch(() => pintar()); // sem toque na página o navegador recusa: fica pausado
  }
  function pausar() { audio.pause(); tocando = false; guardar(); pintar(); }
  audio.addEventListener("ended", () => { carregar(i + 1); tocar(); });
  audio.addEventListener("error", () => { if (lista.length > 1) { carregar(i + 1); tocar(); } });
  audio.addEventListener("play", pintar); audio.addEventListener("pause", pintar);
  montar((d) => document.querySelector(".bar-in").appendChild(d), "mus-barra");
  const caixaPausa = document.getElementById("pauseKeys");
  if (caixaPausa) montar((d) => caixaPausa.parentNode.insertBefore(d, caixaPausa), "mus-pausa");
  fetch("/api/musicas").then((r) => r.json()).then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    lista = l; i = Math.min(i, lista.length - 1); audio.volume = vol; pintar();
    if (tocando) {
      const um = () => { removeEventListener("pointerdown", um); removeEventListener("keydown", um); if (tocando && audio.paused) tocar(); };
      addEventListener("pointerdown", um); addEventListener("keydown", um); tocar();
    }
  }).catch(() => {});
})();
