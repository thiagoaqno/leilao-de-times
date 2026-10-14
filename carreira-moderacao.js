// Edição controlada de uma carreira em grupo. Recebe a sala viva, nunca uma cópia do SQLite.
const Carreira = require("./carreira.js").grupo;
const ATRIBUTOS = new Set(["rit", "fin", "pas", "dri", "def", "fis", "gol"]);
const inteiro = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const valorDe = (x) => x == null || String(x).trim() === "" ? NaN : Number(x);

function lista(rooms) {
  return [...rooms.values()].filter((r) => r.fase === "carreira" && r.save).map((r) => ({
    codigo: r.code, temporada: r.save.temporada, rodada: r.nRodada || 0, jogoAoVivo: !!r.rodada,
    tecnicos: Object.values(r.players).filter((p) => p.clube).map((p) => ({ nome: p.name, clube: p.clube })),
  }));
}
function detalhe(room, clube) {
  if (!room || room.fase !== "carreira" || !room.save) return null;
  const save = room.save;
  const clubes = Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => ({ id: c.id, nome: c.nome, humano: !!save.humanos[c.id] }));
  if (!clubes.some((c) => c.id === clube)) clube = clubes.find((c) => c.humano)?.id || clubes[0]?.id;
  const h = save.humanos[clube];
  const jogadores = Carreira.elencoDe(save, clube).map((j) => ({ id: j.id, nome: j.nome, pos: j.pos,
    overall: Math.max(40, Math.min(95, j.nota + (save.bonusNota[j.id] || 0))), atr: j.atr,
    energia: h ? (h.estado.energia || {})[j.id] ?? 100 : null }));
  const transferencias = (save.transferencias || []).filter((t) => t.de === clube || t.para === clube).slice(0, 15)
    .map((t) => ({ jogador: t.jogador, nome: Carreira.jogadorDe(save, t.jogador)?.nome, de: t.de, para: t.para,
      valor: t.valor, temporada: t.temporada, rodada: t.rodada, revertida: !!t.revertida, especial: !!(t.troca || t.parcelado || t.entreTecnicos) }));
  return { codigo: room.code, jogoAoVivo: !!room.rodada, clube, clubes, caixa: h ? h.estado.caixa : save.caixaIA[clube], jogadores, transferencias };
}
const caixaDe = (save, clube) => save.humanos[clube] ? save.humanos[clube].estado.caixa : save.caixaIA[clube];
const caixaPara = (save, clube, valor) => { if (save.humanos[clube]) save.humanos[clube].estado.caixa = valor; else save.caixaIA[clube] = valor; };
function aposTransferencia(room, pid, origem, destino) {
  const save = room.save;
  save.donos[pid] = destino;
  for (const id of [origem, destino]) {
    const estado = save.humanos[id]?.estado;
    if (estado) {
      if (estado.escalacao) { estado.escalacao.fixo = false; estado.escalacao.titulares = null; }
      estado.aVenda = (estado.aVenda || []).filter((x) => x !== pid);
      if (estado.energia) delete estado.energia[pid];
      for (const chave of ["compras", "pedidos", "valores"]) if (estado[chave]) delete estado[chave][pid];
    }
  }
  for (const t of room.trocas || []) if (t.estado === "aberta" && [...t.dou, ...t.recebo].includes(pid)) t.estado = "invalida";
  if (save.salarios) delete save.salarios[pid];
}
function aplicar(room, d) {
  if (!room || room.fase !== "carreira" || !room.save) return { erro: "Sala não encontrada ou carreira ainda não iniciada." };
  if (room.rodada) return { erro: "Espere o jogo ao vivo terminar para editar a carreira." };
  const save = room.save, clube = String(d.clube || "");
  if (!Carreira.clubesEscolhiveis(room.opcoes.ligas).some((c) => c.id === clube)) return { erro: "Clube inválido." };
  const j = d.jogador && Carreira.jogadorDe(save, String(d.jogador));
  const pid = j && j.id;
  if (!new Set(["caixa", "desfazer_transferencia"]).has(d.tipo) && (!j || Carreira.donoDe(save, pid) !== clube)) return { erro: "Jogador não pertence ao clube." };
  let antes, depois;
  if (d.tipo === "caixa") {
    const n = valorDe(d.valor);
    if (!inteiro(n, 0, 10e9)) return { erro: "Informe um caixa inteiro entre R$ 0 e R$ 10 bilhões." };
    if (save.humanos[clube]) { antes = save.humanos[clube].estado.caixa; save.humanos[clube].estado.caixa = n; }
    else { antes = save.caixaIA[clube]; save.caixaIA[clube] = n; }
    depois = n;
  } else if (d.tipo === "energia") {
    const n = valorDe(d.valor), h = save.humanos[clube];
    if (!h) return { erro: "Energia individual só existe para clubes de técnicos da sala." };
    if (!inteiro(n, 0, 100)) return { erro: "A energia deve ser inteira entre 0 e 100." };
    h.estado.energia ||= {}; antes = h.estado.energia[pid] ?? 100; h.estado.energia[pid] = n; depois = n;
  } else if (d.tipo === "overall") {
    const n = valorDe(d.valor);
    if (!inteiro(n, 40, 95)) return { erro: "O overall deve ser inteiro entre 40 e 95." };
    antes = Math.max(40, Math.min(95, j.nota + (save.bonusNota[pid] || 0)));
    save.bonusNota[pid] = n - j.nota; depois = n;
  } else if (d.tipo === "atributo") {
    const n = valorDe(d.valor), atributo = String(d.atributo || "");
    if (!ATRIBUTOS.has(atributo) || !(atributo in j.atr)) return { erro: "Atributo inválido." };
    if (!inteiro(n, 1, 99)) return { erro: "O atributo deve ser inteiro entre 1 e 99." };
    antes = j.atr[atributo]; (save.atributosModerados ||= {})[pid] ||= {}; save.atributosModerados[pid][atributo] = n; depois = n;
  } else if (d.tipo === "transferir") {
    const destino = String(d.destino || "");
    if (destino === clube || !Carreira.clubesEscolhiveis(room.opcoes.ligas).some((c) => c.id === destino)) return { erro: "Escolha outro clube válido." };
    if (room.leilao && room.leilao.jogador === pid) return { erro: "O jogador está em leilão." };
    const origemTotal = Carreira.elencoDe(save, clube).length, destinoTotal = Carreira.elencoDe(save, destino).length;
    if (origemTotal <= Carreira.Mercado.ELENCO_MIN || destinoTotal >= Carreira.Mercado.ELENCO_MAX) return { erro: "A transferência ultrapassa os limites de tamanho dos elencos." };
    antes = clube; aposTransferencia(room, pid, clube, destino); depois = destino;
    (save.transferencias ||= []).unshift({ jogador: pid, de: clube, para: destino, valor: 0, temporada: save.temporada, rodada: room.nRodada || 0, moderacao: true });
  } else if (d.tipo === "desfazer_transferencia") {
    if (!d.jogador) return { erro: "Informe o ID do jogador para escolher a transferência." };
    const t = (save.transferencias || []).find((x) => !x.revertida &&
      (x.de === clube || x.para === clube) && x.jogador === String(d.jogador) && Carreira.donoDe(save, x.jogador) === x.para);
    if (!t) return { erro: "Nenhuma transferência pendente de desfazer para esse clube e jogador." };
    if (t.troca || t.parcelado || t.entreTecnicos) return { erro: "Trocas entre técnicos e compras parceladas exigem ajuste manual dos jogadores e valores." };
    if (room.leilao && room.leilao.jogador === t.jogador) return { erro: "O jogador está em leilão." };
    if (Carreira.elencoDe(save, t.para).length <= Carreira.Mercado.ELENCO_MIN || Carreira.elencoDe(save, t.de).length >= Carreira.Mercado.ELENCO_MAX)
      return { erro: "O estorno ultrapassa os limites de tamanho dos elencos." };
    const valor = Number(t.valor) || 0;
    if (!inteiro(valor, 0, 10e9)) return { erro: "Valor da transferência inválido." };
    const saldoVendedor = caixaDe(save, t.de), saldoComprador = caixaDe(save, t.para);
    if (!Number.isFinite(saldoVendedor) || !Number.isFinite(saldoComprador) || saldoVendedor < valor) return { erro: "O clube vendedor não tem caixa para devolver o valor. Ajuste o caixa antes." };
    antes = { jogador: t.jogador, de: t.de, para: t.para, valor };
    aposTransferencia(room, t.jogador, t.para, t.de);
    if (valor) { caixaPara(save, t.de, saldoVendedor - valor); caixaPara(save, t.para, saldoComprador + valor); }
    t.revertida = true; t.revertidaEm = Date.now();
    depois = { jogador: t.jogador, clube: t.de, estorno: valor };
  } else return { erro: "Tipo de edição inválido." };
  return { antes, depois, tipo: d.tipo, clube, jogador: pid || depois?.jogador || null };
}
module.exports = { lista, detalhe, aplicar };
