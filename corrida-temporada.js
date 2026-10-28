// Sede da temporada solo de Fórmula 1. O servidor é dono do save e da passagem entre GPs.
const bd = require("./bd.js");
const Regras = require("./public/corrida/temporada/regras.js");
const { limparNome } = require("./salas.js");

module.exports = function attachTemporadaCorrida(io, corrida) {
  const nsp = io.of("/corrida-temporada"), ativos = new Map();
  const enviar = (s, resposta) => { if (typeof resposta === "function") resposta(s); };
  const erro = (resposta, e) => enviar({ ok: false, erro: e.message || String(e) }, resposta);
  const estado = (linha) => ({ ok: true, id: linha.id, dados: linha.dados, tabelas: Regras.tabelas(linha.dados), ativo: ativos.get(linha.id) || null });
  function avisar(linha) {
    const canal = `temporada:${linha.id}`;
    for (const socket of nsp.sockets.values()) {
      if (!socket.rooms.has(canal)) continue;
      if (bd.temporadaCorridaPorToken(socket.data.tokenTemporada)?.id !== linha.id) { socket.leave(canal); continue; }
      socket.emit("estado", estado(linha));
    }
  }
  function carregar(socket) {
    const linha = bd.temporadaCorridaPorToken(socket.data.tokenTemporada);
    if (!linha) throw Error("Abra ou recupere a temporada antes de continuar.");
    return linha;
  }
  function entrar(socket, linha, token, resposta, recuperacao) {
    if (socket.data.idTemporada && socket.data.idTemporada !== linha.id) socket.leave(`temporada:${socket.data.idTemporada}`);
    socket.data.tokenTemporada = token;
    socket.data.idTemporada = linha.id;
    socket.join(`temporada:${linha.id}`);
    enviar({ ...estado(linha), token, ...(recuperacao ? { recuperacao } : {}) }, resposta);
  }
  function mudar(socket, resposta, fn) {
    try {
      const linha = carregar(socket);
      if (ativos.has(linha.id)) throw Error("O GP está aberto. Volte à sede depois do resultado.");
      fn(linha.dados);
      bd.salvarTemporadaCorrida(linha.id, linha.dados);
      avisar(linha); enviar(estado(linha), resposta);
    } catch (e) { erro(resposta, e); }
  }
  nsp.on("connection", (socket) => {
    socket.on("criar", (d = {}, resposta) => {
      try {
        const nome = limparNome(d.nome);
        if (!nome) throw Error("Escreva seu nome.");
        const dados = Regras.criar(nome, d.equipe, Number(d.tamanho), Number(d.voltas), undefined, d.nivel || "medio");
        const nova = bd.criarTemporadaCorrida(nome, dados);
        entrar(socket, { id: nova.id, dados }, nova.token, resposta, nova.recuperacao);
      } catch (e) { erro(resposta, e); }
    });
    socket.on("abrir", (d = {}, resposta) => {
      try { const linha = bd.temporadaCorridaPorToken(d.token); if (!linha) throw Error("Save não encontrado neste navegador. Use o código de recuperação."); entrar(socket, linha, d.token, resposta); }
      catch (e) { erro(resposta, e); }
    });
    socket.on("recuperar", (d = {}, resposta) => {
      try { const linha = bd.recuperarTemporadaCorrida(d.codigo); if (!linha) throw Error("Código de recuperação inválido."); entrar(socket, linha, linha.token, resposta); }
      catch (e) { erro(resposta, e); }
    });
    socket.on("montagem", (d = {}, resposta) => mudar(socket, resposta, (s) => { Regras.aplicarMontagem(s, d); }));
    socket.on("piloto", (d = {}, resposta) => mudar(socket, resposta, (s) => Regras.contratarPiloto(s, d.id)));
    socket.on("engenheiro", (d = {}, resposta) => mudar(socket, resposta, (s) => Regras.contratarEngenheiro(s, d.area, Number(d.nivel))));
    socket.on("desenvolver", (_, resposta) => mudar(socket, resposta, (s) => Regras.desenvolver(s)));
    socket.on("proximaTemporada", (_, resposta) => mudar(socket, resposta, (s) => Regras.proximaTemporada(s)));
    // excluir a carreira de vez: só com o token válido e sem GP aberto (o save, o token e o código de recuperação somem)
    socket.on("excluir", (d = {}, resposta) => {
      try {
        const linha = bd.temporadaCorridaPorToken(d.token != null ? d.token : socket.data.tokenTemporada);
        if (!linha) throw Error("Temporada não encontrada. Confira se este navegador ainda tem o acesso dela.");
        const atual = ativos.get(linha.id);
        if (atual && corrida.salaGP(atual.code) && corrida.salaGP(atual.code).phase !== "results") throw Error("O GP está aberto. Termine ou saia do GP antes de excluir a carreira.");
        ativos.delete(linha.id);
        bd.excluirTemporadaCorrida(linha.id);
        const canal = `temporada:${linha.id}`;
        for (const s of nsp.sockets.values()) if (s.rooms.has(canal)) { s.leave(canal); s.data.tokenTemporada = null; s.data.idTemporada = null; if (s !== socket) s.emit("excluida"); }
        enviar({ ok: true }, resposta);
      } catch (e) { erro(resposta, e); }
    });
    socket.on("novoCodigo", (_, resposta) => {
      try { const linha = carregar(socket), recuperacao = bd.novoCodigoTemporadaCorrida(linha.id); enviar({ ok: true, recuperacao }, resposta); }
      catch (e) { erro(resposta, e); }
    });
    socket.on("iniciarGP", (_, resposta) => {
      try {
        const linha = carregar(socket), s = linha.dados;
        if (s.gp >= s.tamanho) throw Error("A temporada terminou. Comece a próxima.");
        const atual = ativos.get(linha.id);
        if (atual && corrida.salaGP(atual.code)?.phase !== "results") return enviar({ ok: true, acesso: atual }, resposta);
        ativos.delete(linha.id);
        const indice = s.gp, ano = s.ano;
        const acesso = corrida.abrirGP(s, (room) => {
          const fresco = bd.temporadaCorridaPorId(linha.id);
          if (!fresco || fresco.dados.gp !== indice || fresco.dados.ano !== ano) return;
          const linhas = room.resultado.map((r) => {
            const p = room.players[r.id];
            return { piloto: p.bot ? p.piloto.id : "voce", equipe: p.equipe, pos: r.pos, pontos: r.pontos, dnf: r.dnf, nc: r.nc };
          });
          Regras.registrarResultado(fresco.dados, linhas);
          if (bd.salvarTemporadaCorrida(fresco.id, fresco.dados, indice)) {
            ativos.delete(fresco.id); avisar(fresco);
          }
        }, (_, montagem) => {
          const fresco = bd.temporadaCorridaPorId(linha.id);
          if (!fresco || fresco.dados.gp !== indice || fresco.dados.ano !== ano) throw Error("Esta etapa da carreira não está mais aberta.");
          Regras.aplicarMontagem(fresco.dados, { montagem });
          if (!bd.salvarTemporadaCorrida(fresco.id, fresco.dados, indice)) throw Error("Não foi possível salvar o acerto do carro.");
          avisar(fresco);
        });
        ativos.set(linha.id, acesso);
        avisar(linha); enviar({ ok: true, acesso }, resposta);
      } catch (e) { erro(resposta, e); }
    });
  });
  return { ativos };
};
