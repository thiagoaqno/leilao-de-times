// Drag da Galera — o racha com a galera no navegador: a sala do canal "/drag" (drag.js no servidor).
// Abre ou entra numa sala (os campos hName, hCode, btnCreate e btnJoin são os que a Noite da Galera usa para criar e
// entrar sozinha com ?criar=1 e ?entrar=1), guarda o token para voltar (drag:<CÓDIGO>), mostra os pilotos com o carro
// de cada um e acerta o relógio com o do servidor: a largada é no mesmo instante para todo mundo.
// main.js recebe o estado (aoEstado), os carros dos outros (aoSt) e as chegadas (aoChegou).
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function criarSala({ $, carro, nomeDoCarro, aoEstado, aoSt, aoChegou }) {
  if (typeof io !== "function") return null; // sem o socket.io (página aberta sem servidor): só a corrida sozinho
  const socket = io("/drag");
  let S = null, eu = null, codigo = null, desvio = 0, melhorRtt = Infinity;
  const agora = () => Date.now() + desvio;
  // o relógio: o do servidor é o da ida e volta mais rápida (metade do caminho para cada lado)
  function sincronizar(n = 5) {
    for (let k = 0; k < n; k++) setTimeout(() => {
      const t0 = Date.now();
      socket.emit("clock", (srv) => { const rtt = Date.now() - t0; if (rtt <= melhorRtt) { melhorRtt = rtt; desvio = srv + rtt / 2 - Date.now(); } });
    }, k * 250);
  }
  socket.on("png", (ack) => typeof ack === "function" && ack());
  socket.on("state", (s) => { if (!codigo) return; const antes = S; S = s; desenhar(); aoEstado(s, antes); });
  socket.on("st", (d) => aoSt(d));
  socket.on("chegou", (d) => aoChegou(d));
  socket.on("removido", () => sair("O organizador tirou você do racha."));
  // caiu e voltou (ou recarregou a página): entra de novo com o token
  socket.on("connect", () => {
    sincronizar();
    const cod = codigo || new URLSearchParams(location.search).get("sala");
    const tk = cod && ler("drag:" + cod.toUpperCase());
    if (tk && tk.id) socket.emit("join", { code: cod, id: tk.id, token: tk.token }, (r) => { if (r && r.ok) entrou(r); else if (codigo) sair(); });
  });

  const erro = (t) => { $("rachaErro").textContent = t || ""; };
  function entrou(r) {
    codigo = r.code; eu = r.id; gravar("drag:" + r.code, { id: r.id, token: r.token });
    const q = new URLSearchParams(location.search); q.set("sala", r.code); q.delete("criar"); q.delete("entrar");
    history.replaceState(null, "", `${location.pathname}?${q}${location.hash}`);
    erro("");
  }
  function sair(msg, avisar = false) {
    if (avisar && S) socket.emit("act", { type: "sair" });
    if (codigo) localStorage.removeItem("drag:" + codigo);
    codigo = null; eu = null; S = null;
    const q = new URLSearchParams(location.search); q.delete("sala"); history.replaceState(null, "", `${location.pathname}${[...q].length ? "?" + q : ""}${location.hash}`);
    desenhar(); aoEstado(null, null); erro(msg || "");
  }
  const nome = () => { const n = $("hName").value.trim(); if (n) gravar("galera:name", n); return n; };
  $("hName").value = ler("galera:name") || "";
  $("btnCreate").onclick = () => {
    if (!nome()) return erro("Coloque o seu nome.");
    socket.emit("create", { name: nome(), carro: carro() }, (r) => (r && r.ok ? entrou(r) : erro(r ? r.error : "O servidor não respondeu.")));
  };
  $("btnJoin").onclick = () => {
    if (!nome()) return erro("Coloque o seu nome.");
    const code = $("hCode").value.trim().toUpperCase();
    if (!code) return erro("Digite o código da sala.");
    socket.emit("join", { code, name: nome(), carro: carro() }, (r) => (r && r.ok ? entrou(r) : erro(r ? r.error : "O servidor não respondeu.")));
  };
  const q0 = new URLSearchParams(location.search).get("sala"); if (q0) $("hCode").value = q0.toUpperCase();
  $("rSair").onclick = () => sair("", true);
  $("rConvidar").onclick = () => {
    const link = `${location.origin}${location.pathname}?sala=${codigo}&entrar=1`;
    navigator.clipboard?.writeText(link).then(() => { $("rConvidar").textContent = "Link copiado"; setTimeout(() => { $("rConvidar").textContent = "Convidar"; }, 1600); }, () => prompt("Mande este link para a galera:", link));
  };

  const souHost = () => !!(S && eu && S.host === eu);
  function desenhar() {
    $("rachaFora").classList.toggle("hidden", !!S);
    $("rachaDentro").classList.toggle("hidden", !S);
    if (!S) return;
    $("rCode").textContent = S.code;
    $("rPilotos").innerHTML = S.players.map((p) => `<li class="${p.id === eu ? "eu" : ""} ${p.online ? "" : "fora"}">
      <b>${esc(p.name)}${p.id === S.host ? " <small>organiza</small>" : ""}</b><span>${esc(nomeDoCarro(p.carro))}</span>
      <i>${!p.online ? "caiu" : S.phase === "carregando" ? (p.pronto ? "pronto" : "chegando…") : ""}</i></li>`).join("")
      + Array.from({ length: Math.max(0, 4 - S.players.length) }, () => `<li class="robo"><b>Rival robô</b><span>vaga livre</span><i></i></li>`).join("");
    const correndo = S.phase === "carregando" || S.phase === "corrida";
    $("rAviso").textContent = correndo ? "Corrida em andamento." : souHost() ? (S.players.length < 4 ? "As vagas livres viram rivais robôs. Escolha a pista e largue." : "Racha cheio: escolha a pista e largue.")
      : "O organizador escolhe a pista e dá a largada.";
  }
  desenhar();

  return {
    socket, agora,
    get S() { return S; }, get eu() { return eu; },
    emSala: () => !!S, souHost,
    act: (type, data = {}) => new Promise((ok) => socket.emit("act", { type, ...data }, (r) => ok(r || { ok: false }))),
    st: (c) => socket.volatile.emit("st", { c }),
    fim: (d) => socket.emit("fim", d),
  };
}
