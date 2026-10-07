// Carreira de Treinador (parte 1 dos scripts da página; eles rodam em ordem e dividem as variáveis globais):
// a conexão, o estado que chega do servidor, a base, os escudos, as contas do elenco, a troca de tela e o começo.
const { $, h, store } = Comum;
// a carreira em grupo usa esta mesma página, no canal /carreira-online: ?sala=CÓDIGO, ?grupo=1 ou ?criar=1 (vindo da Noite)
const PARAMS_URL = new URLSearchParams(location.search), EM_GRUPO = PARAMS_URL.has("sala") || PARAMS_URL.has("grupo") || PARAMS_URL.get("criar") === "1";
const socket = io(EM_GRUPO ? "/carreira-online" : "/carreira", { autoConnect: false }), avisar = Comum.criarToast();
// o aviso aparece por cima do diálogo aberto (senão some atrás dele)
const toast = (msg) => { const d = [...document.querySelectorAll("dialog[open]")].pop(); (d || document.body).append($("toast")); avisar(msg); };
const ic = (nome, cls) => Icones.ic(nome, cls);
const { dinheiro } = Mercado;
const BASE_PADRAO = "mundo-2026"; // as antigas seguem na base em que nasceram
const LIGAS_JOGAVEIS = new Set(["brasileirao-2026", "inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"]);
window.BasesCarreira[BASE_PADRAO] = {
  id: BASE_PADRAO, ano: MundoCarreira.ano, nome: "Temporada Mundial", fonte: "EA FC 26 + base brasileira",
  clubes: MundoCarreira.ligas.flatMap((l) => window.BasesCarreira[l.id].clubes),
};
let BASE = null, CLUBES = {}, JOGADORES = {}, E = null, telaAtual = null, clubeEscolhido = null, temporadasEscolhidas = Evolucao.TEMPORADAS.padrao;
function usarBase(id) {
  const b = window.BasesCarreira[id] || window.BasesCarreira[BASE_PADRAO];
  if (b === BASE) return;
  BASE = b;
  CLUBES = Object.fromEntries(BASE.clubes.map((c) => [c.id, c]));
  JOGADORES = Object.fromEntries(BASE.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, { ...j, origem: c.id }])));
  for (const j of Object.values(JOGADORES)) registrarRosto(j);
}
// o rosto em pixel-art de quem não está na tabela do Leilão sai do país e da idade do jogador (rostos.js)
const registrarRosto = (j) => Rostos.registrar(j.nome, { nat: j.nat, idade: Evolucao.idadeBase(j) });
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
// o valor de agora: a nota e o momento do jogador (gols, fase, à venda), igual ao servidor
const formaDe = (pid) => (E && E.forma && E.forma[pid]) || 1;
const valorAtual = (pid) => Mercado.valorDe(comNota(JOGADORES[pid]), formaDe(pid));
// o seu time como o servidor monta (para a prancheta mostrar o mesmo que vai a campo)
// os efeitos dos eventos que valem no próximo jogo (o servidor soma igual)
const efeitosAgora = () => (E.efeitos || []).filter((e) => e.de <= E.rodada && e.ate >= E.rodada);
const efeitoDe = (alvo) => efeitosAgora().reduce((s, e) => s + (e.alvo === alvo ? e.nota : 0), 0);
function meuTime(mudar = {}) {
  const esc = { ...E.escalacao, ...mudar }, extra = Math.round((E.moral - 60) / 12) + efeitoDe("time");
  return { id: E.clube, jogadores: elencoDe(E.clube).filter((j) => !fora(j.id)).map((j) => ({ ...j, nota: Math.min(97, notaDe(j) + extra + efeitoDe(j.id)) })),
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
// a letra em cima da cor do clube: a segunda cor, se der para ler; senão, branco ou preto (o que contrastar mais)
const luz = (hx) => { const n = parseInt(String(hx).slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const tintaSobre = (fundo, preferida) => (contraste(fundo, preferida) >= 3 ? preferida : contraste(fundo, "#ffffff") >= contraste(fundo, "#111111") ? "#ffffff" : "#111111");
const coresClube = (id) => (CLUBES[id] ? `--clube:${CLUBES[id].cores[0]};--clube2:${CLUBES[id].cores[1]};--clube-tinta:${tintaSobre(CLUBES[id].cores[0], CLUBES[id].cores[1])}` : "");
// a festa (gol seu, contratação): confete nas cores do clube; quem pede menos movimento fica sem
const festa = () => { if (matchMedia("(prefers-reduced-motion: reduce)").matches || !E) return; const c = CLUBES[E.clube]; Comum.confetti([c.cores[0], c.cores[1], "#ffb21e", "#e8efe7"]); };
const estrelas = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? "acesa" : ""}">${ic("estrela")}</i>`).join("");

function mostrarTela(id) {
  telaAtual = id; document.body.dataset.tela = id; // a sede (o hub) usa a largura toda do PC
  for (const s of document.querySelectorAll(".tela")) s.classList.toggle("hidden", s.id !== id);
  if (id !== "partida") desenharTela(id);
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) mostrarTela(b.dataset.ir); });
// chegou um estado novo do servidor
function receber(estado) {
  usarBase(estado.base);
  E = estado;
  // os jovens que subiram da base não estão nos arquivos: chegam com o estado (o clube de origem vem do id)
  for (const [id, j] of Object.entries(E.jovens || {})) { JOGADORES[id] = { ...j, origem: id.replace(/-t\d+b\d+$/, "") }; registrarRosto(j); }
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
  if (!$("cNome").value) $("cNome").value = store.get("galera:name") || ""; // não apaga o que a pessoa já digitou
  $("avisoBase").innerHTML = `${ic("livro")} ${h(BASE.nome)} ${BASE.ano}: Brasileirão e cinco grandes ligas, com Libertadores, Champions e Mundial.`;
  $("avisoBase").classList.remove("hidden");
  // cada clube com o orçamento e a situação (orcamentos.js): do rico ao pequeno
  const orc = (c) => ({ ...Orcamentos.de(c), caixa: c.orcamento || Orcamentos.de(c).caixa });
  $("clubes").innerHTML = BASE.clubes.filter((c) => LIGAS_JOGAVEIS.has(c.liga)).sort((a, b) => a.liga.localeCompare(b.liga) || orc(b).caixa - orc(a).caixa || a.nome.localeCompare(b.nome)).map((c) => {
    const o = orc(c), sit = Orcamentos.SITUACOES[o.situacao];
    return `<button class="clube" style="${coresClube(c.id)}" data-clube="${c.id}" aria-pressed="${c.id === clubeEscolhido}" title="${h(sit.texto)}">${escudo(c.id, 3)}<span class="clube-info"><b>${h(c.nome)}</b><small>${h(c.cidade)}</small>
      <span class="orcamento"><span class="caixa-clube">${ic("moeda")} ${dinheiro(o.caixa)}</span><span class="situacao ${o.situacao}">${h(sit.nome)}</span></span></span></button>`;
  }).join("");
  mostrarSituacao();
  desenharTemporadas();
  mostrarTela("inicio");
}
// quantas temporadas a carreira vai ter (de 1 a 5)
function desenharTemporadas() {
  const { min, max } = Evolucao.TEMPORADAS;
  $("cTemporadas").innerHTML = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    .map((n) => `<button data-temporadas="${n}" aria-pressed="${n === temporadasEscolhidas}">${n}</button>`).join("");
}
$("cTemporadas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-temporadas]"); if (!b) return;
  temporadasEscolhidas = +b.dataset.temporadas; desenharTemporadas();
});
$("clubes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-clube]"); if (!b) return;
  clubeEscolhido = b.dataset.clube;
  for (const x of $("clubes").children) x.setAttribute("aria-pressed", String(x.dataset.clube === clubeEscolhido));
  mostrarSituacao();
});
// o que a situação do clube escolhido quer dizer
function mostrarSituacao() {
  const c = CLUBES[clubeEscolhido], el = $("situacaoClube");
  if (!c) { el.classList.add("hidden"); return; }
  const o = { ...Orcamentos.de(c), caixa: c.orcamento || Orcamentos.de(c).caixa }, sit = Orcamentos.SITUACOES[o.situacao];
  el.innerHTML = `${escudo(c.id, 2)}<span><b>${h(c.nome)} · ${h(sit.nome)}</b> Caixa de ${dinheiro(o.caixa)}. ${h(sit.texto)}</span>`;
  el.classList.remove("hidden");
}
$("btnCriar").onclick = async () => {
  const nome = $("cNome").value.trim();
  $("erroCriar").textContent = !nome ? "Coloque o seu nome." : !clubeEscolhido ? "Escolha um clube." : "";
  if (!nome || !clubeEscolhido) return;
  store.set("galera:name", nome);
  $("btnCriar").disabled = true;
  const r = await pedir("criar", { nome, clube: clubeEscolhido, skin: store.get("galera:skin"), temporadas: temporadasEscolhidas });
  $("btnCriar").disabled = false;
  if (!r.ok) { $("erroCriar").textContent = r.error; return; }
  store.set("carreira:token", r.token);
  receber(r.estado);
  mostrarCodigo(r.recuperacao, "criada");
};
// ---------- o código de recuperação ----------
// O servidor guarda só o hash; o navegador guarda o código (carreira:codigo) para mostrar de novo na sede e ao sair.
// Quem não tem o código guardado (carreira antiga, outro aparelho) pede um novo, e o antigo deixa de valer.
const formatarCodigo = (c) => String(c).replace(/(.{4})(?=.)/g, "$1-");
let depoisDoCodigo = null;
const TEXTOS_CODIGO = {
  criada: ["Anote o seu código", "Com ele você continua a carreira em outro aparelho, ou neste mesmo depois de sair.", "Anotei"],
  ver: ["Código de recuperação", "Com ele você volta para esta carreira em qualquer aparelho. Gerar outro faz este parar de valer.", "Fechar"],
  sair: ["Antes de sair, anote o código", "Sem ele não dá para voltar para esta carreira. Ele também fica na sede, em \"Código de recuperação\".", "Anotei, sair"],
};
function mostrarCodigo(codigo, como) {
  store.set("carreira:codigo", codigo);
  const [titulo, texto, botao] = TEXTOS_CODIGO[como];
  $("codigoTitulo").textContent = titulo; $("codigoTexto").textContent = texto; $("btnAnotei").textContent = botao;
  $("codigoGrande").textContent = formatarCodigo(codigo);
  $("btnCodigoNovo").classList.toggle("hidden", como !== "ver");
  depoisDoCodigo = como;
  if (!$("dlgCodigo").open) $("dlgCodigo").showModal();
}
async function pedirCodigoNovo() {
  const r = await pedir("codigo");
  if (!r.ok) { toast(r.error); return null; }
  return r.recuperacao;
}
async function abrirCodigo(como) {
  const codigo = store.get("carreira:codigo") || await pedirCodigoNovo();
  if (codigo) mostrarCodigo(codigo, como);
}
$("btnCopiarCodigo").onclick = () => { navigator.clipboard?.writeText($("codigoGrande").textContent).then(() => toast("Código copiado.")).catch(() => {}); };
$("btnCodigoNovo").onclick = async () => {
  if (!confirm("Gerar outro código? O que aparece agora deixa de valer.")) return;
  const codigo = await pedirCodigoNovo(); if (codigo) { mostrarCodigo(codigo, "ver"); toast("Código novo gerado."); }
};
$("btnAnotei").onclick = async () => {
  $("dlgCodigo").close();
  if (depoisDoCodigo === "criada") mostrarTela("sede");
  else if (depoisDoCodigo === "sair") { await pedir("sair"); store.set("carreira:token", null); E = null; telaInicio(); }
};
$("btnVerCodigo").onclick = () => abrirCodigo("ver");
$("btnSairCarreira").onclick = () => abrirCodigo("sair");
$("btnRecuperar").onclick = async () => {
  const r = await pedir("recuperar", { codigo: $("cCodigo").value });
  if (!r.ok) { $("erroCodigo").textContent = r.error; return; }
  store.set("carreira:token", r.token);
  store.set("carreira:codigo", $("cCodigo").value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  $("cCodigo").value = "";
  receber(r.estado); abrirSede();
};
// ---------- excluir a carreira ----------
$("btnExcluirCarreira").onclick = () => { $("exConfirma").value = ""; $("btnExcluirSim").disabled = true; $("erroExcluir").textContent = ""; $("dlgExcluir").showModal(); };
$("exConfirma").oninput = () => { $("btnExcluirSim").disabled = $("exConfirma").value.trim().toUpperCase() !== "EXCLUIR"; };
$("btnExcluirCancela").onclick = () => $("dlgExcluir").close();
$("btnExcluirSim").onclick = async () => {
  $("btnExcluirSim").disabled = true;
  const r = await pedir("excluir");
  if (!r.ok) { $("erroExcluir").textContent = r.error; $("btnExcluirSim").disabled = false; return; }
  $("dlgExcluir").close();
  store.set("carreira:token", null); store.set("carreira:codigo", null); E = null;
  telaInicio(); toast("Carreira excluída.");
};
// entra na sede, ou direto na partida que estava em andamento
function abrirSede() { if (E.partida) abrirPartida(); else { mostrarTela("sede"); mostrarPosJogo(); } }

async function conectar() {
  $("conexao").textContent = "Online";
  if (EM_GRUPO) return conectarGrupo(); // grupo.js
  const token = store.get("carreira:token");
  if (!token) { if (!E && telaAtual !== "inicio") telaInicio(); return; } // reconectou na tela inicial: nada a redesenhar
  const r = await pedir("entrar", { token });
  if (!r.ok) { store.set("carreira:token", null); store.set("carreira:codigo", null); toast("Essa carreira não foi encontrada neste servidor."); telaInicio(); return; }
  const primeira = !E;
  receber(r.estado);
  if (primeira) abrirSede();
}
