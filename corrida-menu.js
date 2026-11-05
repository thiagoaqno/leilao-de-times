// Corrida da Galera — o que a tela inicial (/corrida/) pede ao servidor: quem está online, as salas abertas e o desafio da semana.
// O desafio é uma pista por semana, a mesma para todos, que vira toda segunda às 00:00 de Brasília. Fica sem tabela própria: o tempo a bater é o
// recorde da pista (bd.recordesCorrida) e o melhor do próprio piloto, que o navegador guarda junto com o fantasma.
const T = require("./public/corrida/pistas.js");
const lobby = require("./lobby.js");
const { PISTAS_TRABALHADAS } = require("./public/corrida/temporada/regras.js");

const SEMANA_MS = 7 * 24 * 3600 * 1000;
const SEGUNDA_BASE = Date.UTC(2024, 0, 1, 3); // segunda-feira, 1º/1/2024, 00:00 em Brasília (UTC-3)

const semanaDe = (agora = Date.now()) => Math.floor((agora - SEGUNDA_BASE) / SEMANA_MS);
function desafioDaSemana(agora = Date.now()) {
  const lista = PISTAS_TRABALHADAS.filter((id) => T.PISTAS[id]), semana = semanaDe(agora);
  const pista = lista[((semana * 7) % lista.length + lista.length) % lista.length]; // salta na lista, para as pistas vizinhas não virem em semanas seguidas
  return { semana, pista, nome: T.PISTAS[pista].name, fim: SEGUNDA_BASE + (semana + 1) * SEMANA_MS };
}

// as salas de Corrida que quem chega pode entrar agora (as privadas da temporada o lobby já deixa de fora)
const salasAbertas = (lista = lobby.listar()) => lista.filter((s) => s.jogo === "corrida" && s.estado === "aberta").slice(0, 6).map((s) => ({ code: s.code, jogadores: s.jogadores.length, max: s.max, dono: s.jogadores.find((j) => j.host)?.nome || s.jogadores[0]?.nome || "" }));

function resumo(io, bd, agora = Date.now()) {
  const desafio = desafioDaSemana(agora);
  return { online: io.of("/corrida").sockets.size, salas: salasAbertas(), desafio: { ...desafio, recorde: bd.recordesCorrida()[desafio.pista]?.[0] || null } };
}

module.exports = { semanaDe, desafioDaSemana, salasAbertas, resumo };
