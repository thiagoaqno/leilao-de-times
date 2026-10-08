// Previsao do movimento local, confirmacao por sequencia e interpolacao dos outros a 100 ms.
const N = { snap: null, buf: [], previsto: null, mundo: null, seq: 0, historico: [], erro: { x: 0, y: 0 }, inicio: null };
let resultadoVisto = null;
function limparRede() {
  Object.assign(N, { snap: null, buf: [], previsto: null, mundo: null, seq: 0, historico: [], erro: { x: 0, y: 0 }, inicio: null });
  projeteisVisuais.clear(); areasVisuais.clear(); efeitos.length = 0; marcas.length = 0; ataques.clear(); limparControles();
}
function entidadePrevista(e) {
  return {
    ...e, mira: { ...e.mira }, bicho: { id: e.bicho, as: e.forma !== e.bicho ? e.forma : null, hp: e.hp, max: e.max, st: { ...e.st }, cds: [...e.cds], chakra: e.chakra },
    jogador: { id: e.id, lado: e.lado, substitutes: e.substitutes }, impedido: e.impedido || 0,
    canal: e.canal && { ...e.canal }, dash: e.dash && { ...e.dash, hab: { velocidade: e.dash.velocidade, giro: e.dash.giro, tipo: e.dash.elemento }, hit: new Set() },
    oculto: e.oculto && { ...e.oculto, de: { ...e.oculto.de }, para: { ...e.oculto.para } },
  };
}
function receberPacote(sn) {
  if (!S?.match || !Array.isArray(sn.entidades)) return;
  N.snap = sn; N.buf.push(sn); if (N.buf.length > 40) N.buf.shift();
  sincronizarVisuais(sn);
  const e = sn.entidades.find((p) => p.id === ME?.id);
  if (!e) { N.previsto = null; return; }
  const anterior = N.previsto, mudou = !anterior || anterior.bicho.id !== e.bicho || anterior.campo !== e.campo || (anterior.bicho.as || anterior.bicho.id) !== e.forma;
  const antigo = anterior && { x: anterior.x + N.erro.x, y: anterior.y + N.erro.y };
  if (mudou) N.historico.length = 0;
  N.historico = N.historico.filter((passo) => passo.seq > sn.seq);
  N.previsto = entidadePrevista(e);
  N.mundo = { modo: modoAtual(), dex: dexAtual(), entidades: [], ev: [] };
  for (const passo of N.historico) Ginasio.preverMovimento(N.mundo, N.previsto, passo.dt, passo.c);
  const distancia = antigo ? Math.hypot(antigo.x - N.previsto.x, antigo.y - N.previsto.y) : 0;
  N.erro = mudou || distancia > 1.5 ? { x: 0, y: 0 } : { x: antigo.x - N.previsto.x, y: antigo.y - N.previsto.y };
}
function interpolarEntidades(agora) {
  if (!N.buf.length) return S?.match?.entidades.map((e) => ({ ...e })) || [];
  let a = N.buf[0], b = N.buf.at(-1);
  for (let i = 1; i < N.buf.length; i++) if (N.buf[i].t >= agora) { a = N.buf[i - 1]; b = N.buf[i]; break; }
  const k = a === b ? 1 : clamp((agora - a.t) / Math.max(1, b.t - a.t), 0, 1);
  return b.entidades.map((e) => {
    const antes = a.entidades.find((p) => p.id === e.id);
    if (!antes || antes.bicho !== e.bicho || antes.campo !== e.campo) return { ...e };
    return { ...e, x: antes.x + (e.x - antes.x) * k, y: antes.y + (e.y - antes.y) * k };
  });
}
function enviarComando() {
  if (!socket.connected || S?.phase !== "play" || !ME?.id || !N.previsto || relogio.agora() < S.match.start) return;
  const c = { seq: N.seq++, ...comandoAtual() };
  if (entrada.golpe != null) c.golpe = entrada.golpe;
  if (entrada.esquiva) c.esquiva = true;
  if (entrada.troca != null) c.troca = entrada.troca;
  socket.volatile.emit("cmd", c);
  entrada.golpe = null; entrada.esquiva = false; entrada.troca = null; entrada.miraSolta = null;
}
function prever(dt) {
  if (!N.previsto || !S?.match || S.phase !== "play" || relogio.agora() < S.match.start) return;
  const c = comandoAtual();
  if (entrada.esquivaLocal) { c.esquiva = true; entrada.esquivaLocal = false; }
  const passo = { seq: N.seq, dt, c };
  N.historico.push(passo); if (N.historico.length > 240) N.historico.shift();
  N.mundo.ev.length = 0; Ginasio.preverMovimento(N.mundo, N.previsto, dt, c);
  const k = Math.exp(-dt * 18); N.erro.x *= k; N.erro.y *= k;
}
function mostrarJogo(jogar) {
  document.body.classList.toggle("jogando", !!jogar);
  document.body.classList.toggle("toque-jogo", !!jogar && toque);
  $("hud").classList.toggle("hidden", !jogar || !ME?.id || !N.snap?.entidades.some((e) => e.id === ME.id));
  $("placar").classList.toggle("hidden", !jogar);
  $("observando").classList.toggle("hidden", !jogar || !!N.snap?.entidades.some((e) => e.id === ME?.id));
  if (!jogar) limparControles();
  Toque.show(!!jogar && !!ME?.id && S?.phase === "play" && !!N.previsto);
}
socket.on("state", (st) => {
  const faseAntes = S?.phase; S = st;
  const mine = meuJogador(), mudouModo = modoAnterior !== st.config.modo;
  modoAnterior = st.config.modo;
  if (mine && st.phase !== "play" && (timeInicial || mudouModo) && mine.time.join() !== times[st.config.modo].join()) {
    timeInicial = false; act("time", { time: times[st.config.modo] });
  } else if (mine && !timeInicial) guardarTime(st.config.modo, mine.time);
  if (st.phase !== "play") timeInicial = false;
  guardarConfig();
  if (st.match && N.inicio !== st.match.start) { limparRede(); N.inicio = st.match.start; receberPacote({ ...st.match, t: st.now, seq: -1 }); }
  if (st.phase === "lobby") { limparRede(); salaVisivel = true; $("resultado").close(); }
  if (st.phase === "play" && faseAntes !== "play") salaVisivel = false;
  renderSala(); montarHud(); mostrarJogo(!!st.match && !salaVisivel);
  if (st.phase === "over" && resultadoVisto !== st.match.start) { resultadoVisto = st.match.start; mostrarResultado(); }
});
socket.on("snap", receberPacote);
socket.on("ev", (lista) => { for (const e of lista) { efeitoVisual(e); tocarEvento(e); } });
socket.on("png", (ack) => typeof ack === "function" && ack());
socket.on("disconnect", () => {
  $("conexao").textContent = "Sem conexão"; $("reconectando").classList.toggle("hidden", S?.phase !== "play");
  limparControles(); Toque.show(false);
});
socket.on("connect_error", () => { $("conexao").textContent = "Sem conexão"; });
socket.on("removido", () => { toast("O organizador retirou você da sala."); sairSala(); });
async function reconectar() {
  $("conexao").textContent = "Online"; $("reconectando").classList.add("hidden");
  relogio.sincronizar(socket);
  const code = new URLSearchParams(location.search).get("sala"), saved = ME || (code && store.get("ginasio:" + code));
  if (!saved) return;
  limparRede();
  const r = await pedirSala("join", { code: saved.code || code, id: saved.id, token: saved.token, watch: !saved.id });
  if (!entrar(r)) { ME = null; S = null; renderSala(); mostrarJogo(false); }
}
socket.on("connect", reconectar);
if (socket.connected) reconectar();
setInterval(enviarComando, 1000 / 30);
setInterval(() => { if (socket.connected) relogio.sincronizar(socket, 2); }, 15000);
