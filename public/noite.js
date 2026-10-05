// Noite da Galera, no navegador (vai em todas as páginas de jogo). Precisa do /socket.io/socket.io.js antes.
// - Quando a página tem uma sala (?sala= ou ?mesa=), entra na noite dessa sala (canal /noite).
// - Na beirada esquerda fica a aba "🌙": o placar da noite (vitórias, derrotas e os títulos) e o "Bora de outro jogo".
// - "Bora de outro jogo": quem chamou vai para o jogo novo com ?criar=1 (a página cria a sala sozinha) e, quando a
//   sala existe, todo mundo da noite recebe o destino e vai junto com ?entrar=1 (a página entra com o nome salvo).
(function () {
  if (typeof io !== "function") return;
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const JOGO = location.pathname.split("/").filter(Boolean)[0] || "";
  const URLS = { rocket: "/rocket/" };
  // como cada página guarda o código da sala no endereço e quais campos ela usa (o padrão: hName, hCode, btnCreate, btnJoin)
  const MESA = ["banco", "uno", "sinuca", "truco", "domino", "ludo", "botao"];
  const CAMPOS = { leilao: { nomeCriar: "cName", nome: "jName", codigo: "jCode" } };
  const param = (j) => (MESA.includes(j) ? "mesa" : "sala");
  const campos = { nome: "hName", nomeCriar: "hName", codigo: "hCode", criar: "btnCreate", entrar: "btnJoin", ...(CAMPOS[JOGO] || {}) };
  const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let noiteId = q.get("noite") || sessionStorage.getItem("galera:noite") || null, N = null, salaAtual = null;
  const nome = () => ler("galera:name") || ($(campos.nome) && $(campos.nome).value.trim()) || "";

  // ---------- visual: a aba, o painel e os avisos ----------
  const css = document.createElement("style");
  css.textContent = `
  #noiteAba{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147483000;background:#10183d;color:#ffe9a8;border:2px solid #ffe9a8;border-left:0;border-radius:0 10px 10px 0;padding:8px 7px 8px 5px;font:700 13px "Pixelify Sans",system-ui,sans-serif;cursor:pointer;box-shadow:2px 3px 0 #0007;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:.04em;display:none}
  #noiteAba:hover,#noiteAba:focus-visible{background:#1d2a66;outline:none}
  #noitePainel{position:fixed;inset:0;z-index:2147483001;display:none;place-items:center;background:#0009;padding:14px}
  #noitePainel .caixa{background:#f7f0dc;color:#10183d;border:4px solid #10183d;border-radius:12px;box-shadow:inset 0 0 0 3px #fff,0 18px 40px #000a;width:min(560px,100%);max-height:92vh;overflow:auto;padding:16px 18px;font:15px/1.45 Figtree,system-ui,sans-serif}
  #noitePainel h2{margin:0 0 2px;font:700 22px "Pixelify Sans",system-ui,sans-serif}
  #noitePainel h3{margin:16px 0 6px;font:700 15px "Pixelify Sans",system-ui,sans-serif}
  #noitePainel .sub{margin:0 0 10px;color:#4a5690;font-size:14px}
  #noitePainel ol{margin:0;padding:0;list-style:none}
  #noitePainel li{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;padding:6px 8px;border-radius:8px}
  #noitePainel li:nth-child(odd){background:#efe5c8}
  #noitePainel li .pos{width:22px;font:700 15px "Pixelify Sans",monospace;color:#7a6a3a}
  #noitePainel li .quem{font-weight:800}
  #noitePainel li .vd{margin-left:auto;font:700 14px "Pixelify Sans",monospace}
  #noitePainel li .tit{flex-basis:100%;padding-left:30px;font-size:13px;color:#7a2bd6;font-weight:700}
  #noitePainel .jogos{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px}
  #noitePainel .jogos button{font:700 14px Figtree,system-ui,sans-serif;padding:9px 6px;border-radius:8px;border:2px solid #10183d;background:#fff;color:#10183d;cursor:pointer;box-shadow:0 2px 0 #10183d}
  #noitePainel .jogos button:hover,#noitePainel .jogos button:focus-visible{background:#ffe9a8;outline:none}
  #noitePainel .hist{font-size:13.5px;color:#3a4270;margin:0;padding-left:18px}
  #noitePainel .fechar{margin-top:14px;width:100%;background:#10183d;color:#fff;border:0;border-radius:8px;padding:9px;font:700 15px "Pixelify Sans",system-ui,sans-serif;cursor:pointer}
  #noiteAviso{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483002;display:none;align-items:center;gap:10px;background:#10183d;color:#fff;border:2px solid #ffe9a8;border-radius:10px;padding:10px 14px;font:700 15px Figtree,system-ui,sans-serif;box-shadow:0 8px 24px #000a;max-width:calc(100vw - 32px)}
  #noiteAviso button{font:700 13px Figtree,system-ui,sans-serif;background:#ffe9a8;color:#10183d;border:0;border-radius:7px;padding:6px 10px;cursor:pointer}
  @media (prefers-reduced-motion:no-preference){#noiteAviso.on{animation:noiteDesce .3s ease-out}@keyframes noiteDesce{from{transform:translate(-50%,-20px);opacity:0}}}`;
  document.head.appendChild(css);
  if (!document.querySelector('link[href*="Pixelify"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@700&display=swap"; document.head.appendChild(l); }
  const aba = document.createElement("button"); aba.id = "noiteAba"; aba.type = "button"; aba.title = "Noite da Galera: placar e ir para outro jogo"; aba.textContent = "🌙 Noite";
  const painel = document.createElement("div"); painel.id = "noitePainel"; painel.setAttribute("role", "dialog"); painel.setAttribute("aria-modal", "true"); painel.setAttribute("aria-label", "Noite da Galera");
  const aviso = document.createElement("div"); aviso.id = "noiteAviso"; aviso.setAttribute("role", "status");
  const montar = () => document.body.append(aba, painel, aviso);
  if (document.body) montar(); else document.addEventListener("DOMContentLoaded", montar);
  aba.onclick = () => abrir(true);
  painel.addEventListener("click", (e) => { if (e.target === painel || e.target.closest(".fechar")) abrir(false); const b = e.target.closest("[data-jogo]"); if (b) chamar(b.dataset.jogo); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && painel.style.display === "grid") { abrir(false); e.stopPropagation(); } }, true);
  function abrir(on) { painel.style.display = on ? "grid" : "none"; if (on) { desenhar(); const b = painel.querySelector(".jogos button"); if (b) b.focus(); } }
  let avisoTimer = null;
  function avisar(html, ms = 4500, botao) {
    aviso.innerHTML = html + (botao ? ` <button type="button">${esc(botao.texto)}</button>` : "");
    aviso.style.display = "flex"; aviso.classList.remove("on"); void aviso.offsetWidth; aviso.classList.add("on");
    if (botao) aviso.querySelector("button").onclick = () => { botao.acao(); aviso.style.display = "none"; };
    clearTimeout(avisoTimer); if (ms) avisoTimer = setTimeout(() => (aviso.style.display = "none"), ms);
  }
  function desenhar() {
    if (!N) { painel.innerHTML = `<div class="caixa"><h2>🌙 Noite da Galera</h2><p class="sub">Entre numa sala para começar a noite.</p><button class="fechar" type="button">Fechar</button></div>`; return; }
    const lin = N.ranking.map((r, i) => `<li><span class="pos">${i + 1}º</span><span class="quem">${esc(r.nome)}</span><span class="vd">${r.v} V · ${r.d} D</span>${r.titulos.length ? `<span class="tit">${r.titulos.map(esc).join("  ")}</span>` : ""}</li>`).join("");
    const jogos = Object.entries(N.jogos).filter(([id]) => id !== JOGO).map(([id, nomeJ]) => `<button type="button" data-jogo="${id}">${esc(nomeJ)}</button>`).join("");
    const hist = N.partidas.map((p) => `<li>${esc(p.nome)}: <b>${esc(p.ganhadores.join(" e "))}</b> ganhou${p.ganhadores.length > 1 ? "am" : ""}</li>`).join("");
    painel.innerHTML = `<div class="caixa"><h2>🌙 Noite da Galera</h2><p class="sub">Cada vitória em qualquer jogo conta aqui. Quem trocar de jogo leva todo mundo junto.</p>
      <ol>${lin || `<li>Ninguém jogou ainda.</li>`}</ol>
      <h3>Bora de outro jogo</h3><div class="jogos">${jogos}</div>
      ${hist ? `<h3>O que rolou</h3><ul class="hist">${hist}</ul>` : ""}
      <button class="fechar" type="button">Fechar</button></div>`;
  }
  function atualizarAba() {
    aba.style.display = salaAtual ? "block" : "none";
    const lider = N && N.ranking[0] && N.ranking[0].v > 0 ? N.ranking[0] : null;
    aba.textContent = lider ? `🌙 ${lider.nome} ${lider.v}` : "🌙 Noite";
  }

  // ---------- rede ----------
  const s = io("/noite");
  s.on("noite", (n) => { N = n; noiteId = n.id; sessionStorage.setItem("galera:noite", n.id); atualizarAba(); if (painel.style.display === "grid") desenhar(); });
  s.on("resultado", (r) => avisar(`🏆 <b>${esc(r.ganhadores.join(" e "))}</b> ganhou no ${esc(r.nome)}: +1 na noite`, 5000));
  s.on("chamado", (c) => avisar(`🎲 <b>${esc(c.quem)}</b> chamou todo mundo pro <b>${esc(c.nome)}</b>. Abrindo a sala…`, 15000));
  s.on("destino", (d) => {
    const url = `${URLS[d.jogo] || `/${d.jogo}/`}?${param(d.jogo)}=${encodeURIComponent(d.sala)}&entrar=1&noite=${encodeURIComponent(d.noite)}`;
    let n = 3, ir = true;
    const tic = () => { if (!ir) return; if (n <= 0) { location.href = url; return; } avisar(`🚀 Indo pro <b>${esc((N && N.jogos[d.jogo]) || d.jogo)}</b> com a galera em ${n}…`, 0, { texto: "Ficar aqui", acao: () => { ir = false; } }); n--; setTimeout(tic, 1000); };
    tic();
  });
  function chamar(jogo) {
    if (!nome()) { avisar("Coloque o seu nome na sala antes de chamar a galera.", 4000); return; }
    s.emit("chamar", { jogo }, (r) => { if (!r || !r.ok) return avisar("Não deu para chamar agora. Tente de novo.", 4000); location.href = `${URLS[jogo] || `/${jogo}/`}?criar=1&noite=${encodeURIComponent(r.id)}`; });
  }
  // a sala desta página: o jogo põe o código no endereço quando entra/cria
  function olharSala() {
    const cod = new URLSearchParams(location.search).get(param(JOGO));
    const ok = cod && /^[A-Za-z0-9]{4,6}$/.test(cod) ? cod.toUpperCase() : null;
    if (ok !== salaAtual) { salaAtual = ok; atualizarAba(); if (ok) s.emit("sala", { jogo: JOGO, sala: ok, nome: nome(), noite: noiteId }); }
  }
  s.on("connect", () => { if (salaAtual) s.emit("sala", { jogo: JOGO, sala: salaAtual, nome: nome(), noite: noiteId }); });
  setInterval(olharSala, 700); olharSala();

  // ---------- chegou junto com a galera: cria ou entra sozinho, com o nome salvo ----------
  const criar = q.get("criar") === "1", entrar = q.get("entrar") === "1";
  if (criar || entrar) {
    const tentar = (k = 0) => {
      const nm = ler("galera:name"), b = $(criar ? campos.criar : campos.entrar), campoNome = $(criar ? campos.nomeCriar : campos.nome);
      if (!b || !campoNome) { if (k < 40) setTimeout(() => tentar(k + 1), 150); return; }
      if (!nm) { avisar("Coloque o seu nome e aperte " + (criar ? "para criar a sala" : "Entrar") + ".", 8000); return; }
      campoNome.value = nm; campoNome.dispatchEvent(new Event("input", { bubbles: true }));
      if (entrar && $(campos.codigo)) $(campos.codigo).value = (q.get(param(JOGO)) || "").toUpperCase();
      b.click();
    };
    if (document.readyState === "complete") setTimeout(tentar, 400); else addEventListener("load", () => setTimeout(tentar, 400));
  }
})();
