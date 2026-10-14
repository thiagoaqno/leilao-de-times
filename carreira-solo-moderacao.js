// A moderação das carreiras particulares (solo e Rumo ao Estrelato), pelo painel privado (admin-carreira.js). O save
// mora no banco e o jogo o lê de novo a cada ação do técnico (comCarreira, em carreira.js, tudo no mesmo tick), então a
// edição salva aqui vale na próxima ação dele. As edições de jogador e de caixa são as mesmas da sala em grupo
// (carreira-moderacao.js, aplicarSolo); cada uma vai para o registro moderacao_carreira com o código "solo:<id>".
const bd = require("./bd.js");
const Carreira = require("./carreira.js").grupo;
const Moderacao = require("./carreira-moderacao.js");

const nomeClube = (id) => (id ? Carreira.clubeDe(id)?.nome || id : "—");
const resumo = (c) => ({ id: c.id, tecnico: c.nome, clube: c.clube, nomeClube: nomeClube(c.clube), temporada: c.temporada, temporadasMax: c.temporadasMax,
  rodada: c.rodada, modo: c.jogador ? "Rumo ao Estrelato" : "Treinador", antiga: c.v !== Carreira.VERSAO, partida: c.partida, demitido: c.demitido, atualizadaEm: c.atualizadaEm });

function abrir(id) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return { erro: "Carreira inválida." };
  const c = bd.carreiraPorId(Number(id));
  if (!c) return { erro: "Carreira não encontrada." };
  if (!c.dados || c.dados.v !== Carreira.VERSAO) return { erro: "Carreira da base antiga: ela não abre mais no jogo." };
  Carreira.completar(c.dados); // o mesmo que o jogo faz antes de cada ação
  return { c };
}
function listar() { return bd.listarCarreiras().map(resumo); }
function detalhar(id, clube) {
  const { c, erro } = abrir(id);
  if (erro) return { erro };
  const s = c.dados, d = Moderacao.detalheSolo(s, clube);
  if (d.erro) return d;
  return { ...d, carreira: { id: c.id, tecnico: c.nome, clube: s.clube, nomeClube: nomeClube(s.clube), temporada: s.temporada, temporadasMax: s.temporadasMax, rodada: s.rodada,
    modo: s.jogador ? "Rumo ao Estrelato" : "Treinador", partida: !!s.partida, demitido: !!s.demitido, moral: s.moral, criadaEm: c.criadaEm, atualizadaEm: c.atualizadaEm },
    historico: bd.historicoModeracao(`solo:${c.id}`, 15) };
}
function editar(id, dados, ator) {
  const { c, erro } = abrir(id);
  if (erro) return { erro };
  const r = Moderacao.aplicarSolo(c.dados, dados || {});
  if (r.erro) return r;
  try { bd.salvarEdicaoCarreira(c.id, c.dados, ator, r); } catch (e) { return { erro: "Não foi possível salvar a edição no banco." }; }
  return r;
}
// um código de recuperação novo para entregar ao técnico (o banco só guarda o hash: o antigo deixa de valer)
function novoCodigo(id, ator) {
  const { c, erro } = abrir(id);
  if (erro) return { erro };
  const recuperacao = bd.novoCodigoDe(c.id);
  if (!recuperacao) return { erro: "O banco de dados não respondeu." };
  try { bd.salvarEdicaoCarreira(c.id, null, ator, { tipo: "codigo", clube: c.dados.clube, antes: null, depois: "novo código gerado" }); } catch {}
  return { recuperacao };
}
module.exports = { listar, detalhar, editar, novoCodigo };
