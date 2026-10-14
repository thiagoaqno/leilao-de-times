// Edição controlada de uma carreira em grupo. Recebe a sala viva, nunca uma cópia do SQLite.
const Carreira = require("./carreira.js").grupo;
const ATRIBUTOS = new Set(["rit", "fin", "pas", "dri", "def", "fis", "gol"]);
const inteiro = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const valorDe = (x) => x == null || String(x).trim() === "" ? NaN : Number(x);
const normalizar = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function resolver(opcoes, entrada, tipo) {
  const termo = String(entrada || "").trim();
  if (!termo) return { erro: `Informe o nome ou ID do ${tipo}.` };
  const porId = opcoes.find((o) => o.id === termo);
  if (porId) return { item: porId };
  const chave = normalizar(termo);
  const exatos = opcoes.filter((o) => normalizar(o.nome) === chave);
  const encontrados = exatos.length ? exatos : chave.length >= 3 ? opcoes.filter((o) => normalizar(o.nome).includes(chave)) : [];
  if (encontrados.length === 1) return { item: encontrados[0] };
  if (!encontrados.length) return { erro: `${tipo} “${termo}” não encontrado. Use Consultar para ver os nomes disponíveis.` };
  const opcoesTexto = encontrados.slice(0, 8).map((o) => `${o.nome} (${o.id})`).join(", ");
  return { erro: `${tipo} “${termo}” é ambíguo. Escolha um nome mais completo ou use o ID: ${opcoesTexto}${encontrados.length > 8 ? ", …" : ""}.` };
}
const clubesDe = (room) => Carreira.clubesEscolhiveis(room.opcoes.ligas).map((c) => ({ id: c.id, nome: c.nome }));

function lista(rooms) {
  return [...rooms.values()].filter((r) => r.fase === "carreira" && r.save).map((r) => ({
    codigo: r.code, temporada: r.save.temporada, rodada: r.nRodada || 0, jogoAoVivo: !!r.rodada,
    tecnicos: Object.values(r.players).filter((p) => p.clube).map((p) => ({ nome: p.name, clube: p.clube,
      nomeClube: clubesDe(r).find((c) => c.id === p.clube)?.nome || p.clube })),
  }));
}
function detalhe(room, clube) {
  if (!room || room.fase !== "carreira" || !room.save) return null;
  const save = room.save;
  const clubes = clubesDe(room).map((c) => ({ ...c, humano: !!save.humanos[c.id] }));
  if (String(clube || "").trim()) {
    const resolvido = resolver(clubes, clube, "clube");
    if (resolvido.erro) return resolvido;
    clube = resolvido.item.id;
  } else clube = clubes.find((c) => c.humano)?.id || clubes[0]?.id;
  const h = save.humanos[clube];
  const jogadores = Carreira.elencoDe(save, clube).map((j) => ({ id: j.id, nome: j.nome, pos: j.pos,
    overall: Math.max(40, Math.min(95, j.nota + (save.bonusNota[j.id] || 0))), atr: j.atr,
    energia: h ? (h.estado.energia || {})[j.id] ?? 100 : null }));
  const transferencias = (save.transferencias || []).filter((t) => t.de === clube || t.para === clube).slice(0, 15)
    .map((t) => ({ jogador: t.jogador, nome: Carreira.jogadorDe(save, t.jogador)?.nome, de: t.de, para: t.para,
      deNome: clubes.find((c) => c.id === t.de)?.nome || t.de, paraNome: clubes.find((c) => c.id === t.para)?.nome || t.para,
      valor: t.valor, temporada: t.temporada, rodada: t.rodada, revertida: !!t.revertida, especial: !!(t.troca || t.parcelado || t.entreTecnicos) }));
  return { codigo: room.code, jogoAoVivo: !!room.rodada, clube, nomeClube: clubes.find((c) => c.id === clube)?.nome,
    clubes, caixa: h ? h.estado.caixa : save.caixaIA[clube], jogadores, transferencias };
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
  const save = room.save, clubes = clubesDe(room);
  const clubeResolvido = resolver(clubes, d.clube, "clube");
  if (clubeResolvido.erro) return clubeResolvido;
  const clube = clubeResolvido.item.id;
  let j = null, pid = null;
  if (d.tipo !== "caixa") {
    const candidatos = d.tipo === "desfazer_transferencia"
      ? [...new Set((save.transferencias || []).filter((t) => !t.revertida && (t.de === clube || t.para === clube) &&
        Carreira.donoDe(save, t.jogador) === t.para).map((t) => t.jogador))].map((id) => Carreira.jogadorDe(save, id)).filter(Boolean)
      : Carreira.elencoDe(save, clube);
    const jogadorResolvido = resolver(candidatos, d.jogador, "jogador");
    if (jogadorResolvido.erro) return jogadorResolvido;
    j = jogadorResolvido.item; pid = j.id;
  }
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
    const destinoResolvido = resolver(clubes, d.destino, "clube de destino");
    if (destinoResolvido.erro) return destinoResolvido;
    const destino = destinoResolvido.item.id;
    if (destino === clube) return { erro: "Escolha outro clube válido." };
    if (room.leilao && room.leilao.jogador === pid) return { erro: "O jogador está em leilão." };
    const origemTotal = Carreira.elencoDe(save, clube).length, destinoTotal = Carreira.elencoDe(save, destino).length;
    if (origemTotal <= Carreira.Mercado.ELENCO_MIN || destinoTotal >= Carreira.Mercado.ELENCO_MAX) return { erro: "A transferência ultrapassa os limites de tamanho dos elencos." };
    antes = clube; aposTransferencia(room, pid, clube, destino); depois = destino;
    (save.transferencias ||= []).unshift({ jogador: pid, de: clube, para: destino, valor: 0, temporada: save.temporada, rodada: room.nRodada || 0, moderacao: true });
  } else if (d.tipo === "desfazer_transferencia") {
    const t = (save.transferencias || []).find((x) => !x.revertida &&
      (x.de === clube || x.para === clube) && x.jogador === pid && Carreira.donoDe(save, x.jogador) === x.para);
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
  return { antes, depois, tipo: d.tipo, clube, nomeClube: clubeResolvido.item.nome,
    jogador: pid || depois?.jogador || null, nomeJogador: j?.nome || null };
}
module.exports = { lista, detalhe, aplicar };
