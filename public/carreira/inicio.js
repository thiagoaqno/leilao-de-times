// Carreira de Treinador (parte 1 de 3 dos scripts da página; eles rodam em ordem e dividem as variáveis globais):
// a conexão, o estado que chega do servidor, os escudos, a troca de tela, e começar ou continuar a carreira.
const { $, h, store } = Comum;
const socket = io("/carreira", { autoConnect: false }), toast = Comum.criarToast();
const BASE_PADRAO = "brasileirao-2026"; // a base das carreiras novas (as antigas seguem na delas)
let BASE = null, CLUBES = {}, JOGADORES = {};
function usarBase(id) {
  const b = window.BasesCarreira[id] || window.BasesCarreira[BASE_PADRAO];
  if (b === BASE) return;
  BASE = b;
  CLUBES = Object.fromEntries(BASE.clubes.map((c) => [c.id, c]));
  JOGADORES = Object.fromEntries(BASE.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, { ...j, clube: c.id }])));
}
usarBase(BASE_PADRAO);
let E = null, telaAtual = null, clubeEscolhido = null;

const pedir = (evento, dados) => new Promise((ok) => socket.emit(evento, dados, (r) => ok(r || { ok: false, error: "Sem resposta do servidor." })));
const nomeClube = (id) => CLUBES[id]?.nome || id;
const nomeJogador = (id) => JOGADORES[id]?.nome || "alguém";
const meuClube = () => CLUBES[E.clube];
// o escudo em pixel-art (escudos.js): parecido com o de verdade, sem copiar
function escudo(id) {
  const c = CLUBES[id]; if (!c) return "";
  return `<span class="escudo" title="${h(c.nome)}">${Escudos.svg(c)}</span>`;
}
const estrelas = (n) => "★".repeat(n) + `<i>${"★".repeat(5 - n)}</i>`;

function mostrarTela(id) {
  telaAtual = id;
  for (const s of document.querySelectorAll(".tela")) s.classList.toggle("hidden", s.id !== id);
  if (id !== "partida") desenharTela(id);
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) mostrarTela(b.dataset.ir); });

// chegou um estado novo do servidor
function receber(estado) {
  usarBase(estado.base);
  E = estado;
  if (telaAtual && telaAtual !== "partida" && telaAtual !== "inicio") desenharTela(telaAtual);
}

// ---------- começar ----------
function telaInicio() {
  $("cNome").value = store.get("galera:name") || "";
  usarBase(BASE_PADRAO);
  $("avisoBase").textContent = `${BASE.nome} ${BASE.ano}: os elencos vêm da Wikipédia (${BASE.fonte.replace(/^.*, /, "")}); as notas são estimativas nossas.`;
  $("avisoBase").classList.remove("hidden");
  $("clubes").innerHTML = [...BASE.clubes].sort((a, b) => b.tamanho - a.tamanho || a.nome.localeCompare(b.nome)).map((c) =>
    `<button class="clube" data-clube="${c.id}" aria-pressed="${c.id === clubeEscolhido}">${escudo(c.id)}<span>${h(c.nome)}<small>${h(c.cidade)}</small><span class="estrelas" aria-label="Tamanho ${c.tamanho} de 5">${estrelas(c.tamanho)}</span></span></button>`).join("");
  mostrarTela("inicio");
}
$("clubes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-clube]"); if (!b) return;
  clubeEscolhido = b.dataset.clube;
  for (const x of $("clubes").children) x.setAttribute("aria-pressed", String(x.dataset.clube === clubeEscolhido));
});
$("btnCriar").onclick = async () => {
  const nome = $("cNome").value.trim();
  $("erroCriar").textContent = !nome ? "Coloque o seu nome." : !clubeEscolhido ? "Escolha um clube." : "";
  if (!nome || !clubeEscolhido) return;
  store.set("galera:name", nome);
  $("btnCriar").disabled = true;
  const r = await pedir("criar", { nome, clube: clubeEscolhido, skin: store.get("galera:skin") });
  $("btnCriar").disabled = false;
  if (!r.ok) { $("erroCriar").textContent = r.error; return; }
  store.set("carreira:token", r.token);
  receber(r.estado);
  $("codigoGrande").textContent = r.recuperacao.replace(/(.{4})(?=.)/g, "$1-");
  $("dlgCodigo").showModal();
};
$("btnCopiarCodigo").onclick = () => { navigator.clipboard?.writeText($("codigoGrande").textContent).then(() => toast("Código copiado.")).catch(() => {}); };
$("btnAnotei").onclick = () => { $("dlgCodigo").close(); mostrarTela("sede"); };
$("btnRecuperar").onclick = async () => {
  const r = await pedir("recuperar", { codigo: $("cCodigo").value });
  if (!r.ok) { $("erroCodigo").textContent = r.error; return; }
  store.set("carreira:token", r.token);
  receber(r.estado); abrirSede();
};
$("btnSairCarreira").onclick = async () => {
  if (!confirm("Sair desta carreira neste aparelho? Para voltar, você vai precisar do código de recuperação.")) return;
  await pedir("sair"); store.set("carreira:token", null); E = null; telaInicio();
};
// entra na sede, ou direto na partida que estava em andamento
function abrirSede() { if (E.partida) abrirPartida(); else mostrarTela("sede"); }

async function conectar() {
  $("conexao").textContent = "Online";
  const token = store.get("carreira:token");
  if (!token) { if (!E) telaInicio(); return; }
  const r = await pedir("entrar", { token });
  if (!r.ok) { store.set("carreira:token", null); toast("Essa carreira não foi encontrada neste servidor."); telaInicio(); return; }
  const primeira = !E;
  receber(r.estado);
  if (primeira) abrirSede();
}
socket.on("connect", conectar);
socket.on("disconnect", () => { $("conexao").textContent = "Sem conexão"; });
socket.on("connect_error", () => { $("conexao").textContent = "Sem conexão"; });
