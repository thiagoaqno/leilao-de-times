// Ofertas de seleções e convocação da Copa, vinculadas à carreira do técnico.
const Motor = require("./public/carreira/motor.js");
const BASE = require("./public/carreira/base/copa-do-mundo-2026.js");
const POR_ID = new Map(BASE.clubes.map((c) => [c.id, c]));
const JOGADORES = new Map(BASE.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, j])));
const ORIGEM = new Map(BASE.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, c.id])));

const forca = (c) => {
  const lista = c.convocados.map((id) => JOGADORES.get(id)).filter(Boolean).sort((a, b) => b.nota - a.nota).slice(0, 11);
  return lista.reduce((s, j) => s + j.nota, 0) / Math.max(1, lista.length);
};
function ofertas(save) {
  if (save.ofertasSelecao?.temporada === 1) return save.ofertasSelecao;
  const h = (save.historico || []).find((x) => x.temporada === 1);
  if (!h || save.temporadasMax < 2) return null;
  const prestigio = Math.min(94, 68 + Math.max(0, 16 - h.posicao) * 0.9 + (h.titulos || []).length * 3 + (h.meta?.cumprida ? 2 : 0));
  const todas = BASE.clubes.map((c) => ({ id: c.id, nome: c.nome, forca: Math.round(forca(c) * 10) / 10, grupo: BASE.grupos.find((g) => g.clubes.includes(c.id)).id }));
  const elegiveis = (todas.filter((c) => c.forca <= prestigio).length ? todas.filter((c) => c.forca <= prestigio) : [...todas].sort((a, b) => a.forca - b.forca).slice(0, 8))
    .sort((a, b) => b.forca - a.forca || a.id.localeCompare(b.id));
  const r = Motor.sorteDe(`selecoes:${save.semente}:1:${save.clube}`);
  const faixas = [elegiveis.slice(0, 10), elegiveis.slice(10, 28), elegiveis.slice(28)];
  const propostas = [];
  for (const faixa of faixas) if (faixa.length) {
    const escolha = faixa[Math.floor(r() * faixa.length)];
    if (!propostas.some((x) => x.id === escolha.id)) propostas.push(escolha);
  }
  if (!propostas.length && elegiveis.length) propostas.push(elegiveis[elegiveis.length - 1]);
  save.ofertasSelecao = { temporada: 1, ofertas: propostas, escolha: null };
  return save.ofertasSelecao;
}
function aceitar(save, id) {
  const v = ofertas(save);
  if (!v || save.temporada !== 1 || !save.historico?.some((x) => x.temporada === 1)) return "As seleções enviam ofertas ao fim da 1ª temporada.";
  if (id !== "recusar" && !v.ofertas.some((o) => o.id === id)) return "Essa seleção não ofereceu o cargo.";
  v.escolha = id;
  save.selecao = id === "recusar" ? null : id;
  if (save.selecao) save.convocadosSelecao = [...POR_ID.get(id).convocados];
  return null;
}
function convocar(save, entra, sai) {
  const c = POR_ID.get(save.selecao);
  if (!c || !save.copaAtiva) return "Você não comanda uma seleção nesta Copa.";
  if ((save.jogosJogados || []).some((id) => id.startsWith("copadomundo:")) || save.partida?.competicao === "copadomundo") return "A convocação fecha no primeiro jogo da Copa.";
  const atual = save.convocadosSelecao || c.convocados;
  if (!c.jogadores.some((j) => j.id === entra) || !atual.includes(sai) || atual.includes(entra)) return "Escolha um convocado e um atleta disponível da mesma seleção.";
  const lista = atual.map((id) => id === sai ? entra : id);
  if (lista.length !== 26 || lista.filter((id) => JOGADORES.get(id)?.pos === "GOL").length < 2) return "A convocação precisa de 26 atletas e pelo menos dois goleiros.";
  save.convocadosSelecao = lista;
  if (save.escalacaoSelecao?.titulares?.includes(sai)) { save.escalacaoSelecao.titulares = null; save.escalacaoSelecao.fixo = false; }
  return null;
}
function baseDaCopa(save) {
  const convocados = new Map();
  if (save.selecao) convocados.set(save.selecao, save.convocadosSelecao);
  for (const hm of Object.values(save.humanos || {})) if (hm.estado?.selecao) convocados.set(hm.estado.selecao, hm.estado.convocadosSelecao);
  return { ...BASE, clubes: BASE.clubes.map((c) => ({ ...c, jogadores: (convocados.get(c.id) || c.convocados).map((id) => JOGADORES.get(id)).filter(Boolean) })) };
}
module.exports = { BASE, POR_ID, JOGADORES, ORIGEM, ofertas, aceitar, convocar, baseDaCopa, forca };
