// Utilitários do navegador que todas as páginas repetiam (window.Comum): pegar elemento, escapar HTML, guardar no
// localStorage, aviso que some sozinho, ação com resposta do servidor, relógio do servidor, confete, emoji
// flutuante e o ícone do botão de som. O que muda de uma página para outra (quanto tempo o aviso fica, as cores
// do confete, onde o emoji aparece) vem como parâmetro: cada página continua igual ao que era.
(function (root) {
  const $ = (id) => document.getElementById(id);
  const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // localStorage em JSON, sem quebrar quando o navegador bloqueia (aba anônima, cota cheia)
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  // aviso no #toast que some sozinho; msPadrao é o tempo de cada página (dá para mudar em cada aviso)
  function criarToast(msPadrao = 3200) {
    function toast(msg, ms = msPadrao) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.add("hidden"), ms); }
    return toast;
  }
  // ação do jogo: manda "act" e espera a resposta {ok, error}; deu erro, mostra o aviso. Devolve true/false.
  const criarAct = (socket, toast) => (type, data = {}) => new Promise((res) => socket.emit("act", { type, ...data }, (r) => { if (!r || !r.ok) toast(r ? r.error : "Sem conexão."); res(r && r.ok); }));

  // relógio do servidor: offset = relógio do servidor - relógio daqui.
  //   doEstado(now): acerta pelo "now" que vem em cada estado (jogos de mesa)
  //   sincronizar(socket, n): pergunta a hora n vezes ("clock") e fica com a resposta mais rápida (jogos em tempo real);
  //   rtt é a média do tempo de ida e volta
  function relogio() {
    const r = {
      offset: 0, bestRtt: Infinity, rtt: 60,
      agora: () => Date.now() + r.offset,
      doEstado(now) { r.offset = now - Date.now(); },
      sincronizar(socket, n = 5) {
        for (let i = 0; i < n; i++) setTimeout(() => {
          const t0 = Date.now();
          socket.emit("clock", (ts) => { const d = Date.now() - t0; r.rtt = r.rtt * 0.7 + d * 0.3; if (d <= r.bestRtt + 5) { r.bestRtt = Math.min(r.bestRtt, d); r.offset = ts - (t0 + d / 2); } });
        }, i * 250);
      },
    };
    return r;
  }

  // chuva de confete (o CSS .confetti de cada página faz a queda)
  function confetti(cols, { onde = document.body, dur = [2, 2.5], fica = 5500 } = {}) {
    for (let i = 0; i < 90; i++) {
      const d = document.createElement("div"); d.className = "confetti";
      d.style.left = Math.random() * 100 + "vw"; d.style.background = cols[i % cols.length];
      d.style.animationDuration = dur[0] + Math.random() * dur[1] + "s"; d.style.animationDelay = Math.random() * 0.6 + "s";
      onde.appendChild(d); setTimeout(() => d.remove(), fica);
    }
  }
  // emoji de reação subindo em (x, y) da tela
  function flutuar(emoji, x, y, { classe = "floaty", onde = document.body, fica = 1700 } = {}) {
    const f = document.createElement("div"); f.className = classe; f.textContent = emoji; f.style.left = x + "px"; f.style.top = y + "px";
    onde.appendChild(f); setTimeout(() => f.remove(), fica);
  }
  // o botão de som (#btnSound) mostra se o som está ligado
  function iconeSom(ligado, { titulo = false } = {}) {
    const b = $("btnSound"); b.textContent = ligado ? "🔊" : "🔇";
    if (titulo) b.title = ligado ? "Desligar o som" : "Ligar o som";
  }

  const api = { $, h, store, criarToast, criarAct, relogio, confetti, flutuar, iconeSom };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Comum = api;
})(typeof window !== "undefined" ? window : globalThis);
