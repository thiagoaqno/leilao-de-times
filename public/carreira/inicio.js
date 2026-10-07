// Carreira de Treinador (parte 1 dos scripts da página; eles rodam em ordem e dividem as variáveis globais):
// a conexão, o estado que chega do servidor, a base, os escudos, as contas do elenco, a troca de tela e o começo.
const { $, h, store } = Comum;
const socket = io("/carreira", { autoConnect: false }), avisar = Comum.criarToast();
// o aviso aparece por cima do diálogo aberto (senão some atrás dele)
const toast = (msg) => { const d = [...document.querySelectorAll("dialog[open]")].pop(); (d || document.body).append($("toast")); avisar(msg); };
const ic = (nome, cls) => Icones.ic(nome, cls);
const { dinheiro } = Mercado;
const BASE_PADRAO = "brasileirao-2026"; // a base das carreiras novas (as antigas seguem na delas)
let BASE = null, CLUBES = {}, JOGADORES = {}, E = null, telaAtual = null, clubeEscolhido = null;
function usarBase(id) {
  const b = window.BasesCarreira[id] || window.BasesCarreira[BASE_PADRAO];
  if (b === BASE) return;
  BASE = b;
  CLUBES = Object.fromEntries(BASE.clubes.map((c) => [c.id, c]));
  JOGADORES = Object.fromEntries(BASE.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, { ...j, origem: c.id }])));
}
usarBase(BASE_PADRAO);

const pedir = (evento, dados) => new Promise((ok) => socket.emit(evento, dados, (r) => ok(r || { ok: false, error: "Sem resposta do servidor." })));
const nomeClube = (id) => CLUBES[id]?.nome || id;
const nomeJogador = (id) => JOGADORES[id]?.nome || "alguém";
const sobrenome = (nome) => { const p = String(nome).split(" "); return p.length > 1 && p.at(-1).length > 2 ? p.at(-1) : nome; };
const meuClube = () => CLUBES[E.clube];
// as contas do elenco de agora (a base mais as transferências da carreira)
const donoDe = (pid) => (E && E.donos[pid]) || JOGADORES[pid]?.origem;
const elencoDe = (clube) => Object.values(JOGADORES).filter((j) => donoDe(j.id) === clube);
const notaDe = (j) => Math.max(40, Math.min(95, j.nota + ((E && E.bonusNota[j.id]) || 0)));
const comNota = (j) => ({ ...j, nota: notaDe(j) });
const fora = (pid) => (E.lesoes[pid] ? "lesao" : E.suspensos[pid] ? "suspenso" : null);
const salarioDe = (j) => E.salarios[j.id] || Mercado.salarioDe(comNota(j));
// o seu time como o servidor monta (para a prancheta mostrar o mesmo que vai a campo)
function meuTime(mudar = {}) {
  const esc = { ...E.escalacao, ...mudar }, moral = Math.round((E.moral - 60) / 12);
  return { id: E.clube, jogadores: elencoDe(E.clube).filter((j) => !fora(j.id)).map((j) => ({ ...j, nota: notaDe(j) + moral })),
    formacao: esc.formacao, tatica: esc.tatica, titulares: esc.titulares || undefined, fixo: !!esc.fixo };
}
// a faixa da carta pela nota
const faixa = (n) => (n >= 83 ? "lenda" : n >= 75 ? "ouro" : n >= 65 ? "prata" : "bronze");
const POS_NOME = { GOL: "Goleiro", ZAG: "Zagueiro", LD: "Lateral-direito", LE: "Lateral-esquerdo", VOL: "Volante", MC: "Meio-campista", MEI: "Meia", PE: "Ponta-esquerda", PD: "Ponta-direita", ATA: "Atacante" };
const GRUPO_TELA = { GOL: "GOL", ZAG: "DEF", LD: "DEF", LE: "DEF", VOL: "MEI", MC: "MEI", MEI: "MEI", PE: "ATA", PD: "ATA", ATA: "ATA" };

// o escudo em pixel-art (escudos.js), em tamanho múltiplo de 16x18 para os pixels ficarem nítidos
function escudo(id, escala = 2) {
  const c = CLUBES[id]; if (!c) return "";
  return `<span class="escudo" style="--e:${escala}" title="${h(c.nome)}">${Escudos.svg(c)}</span>`;
}
const coresClube = (id) => (CLUBES[id] ? `--clube:${CLUBES[id].cores[0]};--clube2:${CLUBES[id].cores[1]}` : "");
// a festa (gol seu, contratação): confete nas cores do clube; quem pede menos movimento fica sem
const festa = () => { if (matchMedia("(prefers-reduced-motion: reduce)").matches || !E) return; const c = CLUBES[E.clube]; Comum.confetti([c.cores[0], c.cores[1], "#ffb21e", "#e8efe7"]); };
const estrelas = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? "acesa" : ""}">${ic("estrela")}</i>`).join("");

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
  document.body.style.cssText = coresClube(E.clube);
  if (telaAtual && telaAtual !== "partida" && telaAtual !== "inicio") desenharTela(telaAtual);
}
// os ícones dos atalhos (montados uma vez)
for (const s of document.querySelectorAll("[data-ic]")) s.innerHTML = ic(s.dataset.ic);
$("fichaFechar").innerHTML = ic("fechar");

// ---------- começar ----------
function telaInicio() {
  usarBase(BASE_PADRAO);
  document.body.style.cssText = "";
  $("cNome").value = store.get("galera:name") || "";
  $("avisoBase").innerHTML = `${ic("livro")} ${h(BASE.nome)} ${BASE.ano}: os elencos vêm da Wikipédia (${h(BASE.fonte.replace(/^.*, /, ""))}); as notas são estimativas nossas.`;
  $("avisoBase").classList.remove("hidden");
  $("clubes").innerHTML = [...BASE.clubes].sort((a, b) => b.tamanho - a.tamanho || a.nome.localeCompare(b.nome)).map((c) =>
    `<button class="clube" style="${coresClube(c.id)}" data-clube="${c.id}" aria-pressed="${c.id === clubeEscolhido}">${escudo(c.id, 3)}<span class="clube-info"><b>${h(c.nome)}</b><small>${h(c.cidade)}</small><span class="estrelas" aria-label="Tamanho ${c.tamanho} de 5">${estrelas(c.tamanho)}</span></span></button>`).join("");
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
