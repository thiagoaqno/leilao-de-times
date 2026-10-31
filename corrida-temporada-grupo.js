// Temporada de Fórmula 1 com os amigos — canal "/corrida-temporada-grupo" (planos/temporada-f1.md, PRs 11 a 13).
// Segue a Carreira em grupo (carreira-online.js): uma sala com código, o criador vira o anfitrião, cada pessoa tem o seu token
// (fica no navegador; o servidor guarda só o hash), a sala inteira fica no banco (bd.js, `corrida_temporadas_grupo`) e o servidor
// pode reiniciar no meio da noite. Quem sai vira ausente: o lugar dela na equipe continua e o carro dela, no GP, vai com um robô.
// - A sala: cada amigo escolhe uma equipe (ou os dois da mesma, um em cada carro), o anfitrião define 4 ou 8 GPs, as voltas e
//   o nível dos robôs, e começa a temporada. As equipes sem humano ficam com os robôs.
// - O GP ao vivo: só o anfitrião abre. A classificação e a corrida acontecem na sala de F1 da Corrida (corrida.js,
//   `abrirGPGrupo`), todos juntos; quem não tem carro assiste. O resultado entra na temporada de todos de uma vez, uma só vez.
// - Entre os GPs: cada equipe monta o carro e gasta o caixa (qualquer um dos dois da equipe confirma; tudo vai para o histórico
//   com o nome de quem fez) e o mercado é disputado (um piloto ou engenheiro só trabalha para uma equipe).
// - O GP aberto vive na memória: se o servidor reiniciar no meio dele, a temporada volta do GP que não terminou (nada se perde).
const crypto = require("crypto");
const bd = require("./bd.js");
const G = require("./public/corrida/temporada/grupo-regras.js");
const { rid, novoCodigo, limparNome, ok, falha, limparSalasParadas } = require("./salas.js");

const HORAS_PARADA = 72;
const ANFITRIAO_AUSENTE_MS = process.env.TEMPORADA_ANFITRIAO_MS != null ? Number(process.env.TEMPORADA_ANFITRIAO_MS) : 120000; // o cargo passa sozinho
const hash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

module.exports = function ligarTemporadaGrupo(io, corrida) {
  const nsp = io.of("/corrida-temporada-grupo");
  const salas = new Map(), ativos = new Map(), presentes = new Map(); // ativos: GP aberto de cada sala; presentes: sockets de cada pessoa
  const ausenteDesde = new Map();

  // ---------- o banco ----------
  function guardar(sala) { sala.t = Date.now(); try { bd.salvarSalaTemporadaCorrida(sala.codigo, sala); } catch (e) { console.warn("temporada em grupo: não salvou a sala", sala.codigo, e.message); } }
  try {
    for (const { codigo, dados, atualizadaEm } of bd.salasTemporadaCorrida()) {
      if (Date.now() - atualizadaEm > HORAS_PARADA * 3600e3) { bd.apagarSalaTemporadaCorrida(codigo); continue; }
      salas.set(codigo, { ...dados, codigo, t: atualizadaEm });
      ausenteDesde.set(`${codigo}:${dados.host}`, Date.now()); // (depois do reinício, o relógio do anfitrião ausente começa agora)
    }
  } catch (e) { console.warn("temporada em grupo: o banco não abriu; as salas ficam só na memória.", e.message); }
  limparSalasParadas(salas, { horas: HORAS_PARADA, aoApagar: (s) => { try { bd.apagarSalaTemporadaCorrida(s.codigo); } catch {} ativos.delete(s.codigo); } });

  // ---------- quem está na sala ----------
  const conexoes = (codigo, pid) => { const m = presentes.get(codigo); return m && m.get(pid) ? m.get(pid).size : 0; };
  const online = (sala) => (pid) => conexoes(sala.codigo, pid) > 0;
  function ligar(socket, sala, pid) {
    desligar(socket);
    socket.data.codigo = sala.codigo; socket.data.pid = pid; socket.join(`tg:${sala.codigo}`);
    if (!presentes.has(sala.codigo)) presentes.set(sala.codigo, new Map());
    const m = presentes.get(sala.codigo); if (!m.has(pid)) m.set(pid, new Set());
    m.get(pid).add(socket.id); ausenteDesde.delete(`${sala.codigo}:${pid}`);
  }
  function desligar(socket) {
    const { codigo, pid } = socket.data;
    if (!codigo) return;
    socket.leave(`tg:${codigo}`);
    const conj = presentes.get(codigo)?.get(pid);
    if (conj) { conj.delete(socket.id); if (!conj.size) ausenteDesde.set(`${codigo}:${pid}`, Date.now()); }
    socket.data.codigo = null; socket.data.pid = null;
  }
  const contexto = (socket) => { const sala = salas.get(socket.data.codigo); return { sala, pid: sala && sala.pessoas[socket.data.pid] ? socket.data.pid : null }; };

  // ---------- o que cada um vê ----------
  // o acesso ao GP aberto, só para quem é dele: o carro (id e token do piloto na sala da Corrida) ou o lugar de quem assiste
  function acessoDe(sala, pid) {
    const a = ativos.get(sala.codigo); if (!a) return null;
    const meu = a.pessoas[pid];
    return meu ? { code: a.code, id: meu.id, token: meu.token } : { code: a.code, watch: true, token: a.espectador.token };
  }
  const estado = (sala, pid) => ({ ...G.vista(sala, pid, online(sala)), acesso: pid ? acessoDe(sala, pid) : null, gpAberto: ativos.has(sala.codigo) });
  function avisar(sala) {
    for (const socket of nsp.sockets.values()) {
      if (socket.data.codigo !== sala.codigo || !sala.pessoas[socket.data.pid]) continue;
      socket.emit("estado", estado(sala, socket.data.pid));
    }
  }
  // o anfitrião fora da sala por muito tempo passa o cargo sozinho para quem está lá
  setInterval(() => {
    for (const sala of salas.values()) {
      const desde = ausenteDesde.get(`${sala.codigo}:${sala.host}`);
      if (conexoes(sala.codigo, sala.host) || !desde || Date.now() - desde < ANFITRIAO_AUSENTE_MS) continue;
      const novo = sala.ordem.find((id) => conexoes(sala.codigo, id));
      if (novo) { sala.host = novo; guardar(sala); avisar(sala); }
    }
  }, 5000).unref();

  // ---------- as ações ----------
  // uma ação que muda a sala: confere, guarda no banco e avisa todo mundo. Cada pedido roda inteiro antes do próximo (o
  // Node é de uma linha só), então dois amigos mexendo na mesma equipe nunca se atropelam: vale a ordem de chegada.
  function agir(socket, cb, fn, { duranteGP = false } = {}) {
    try {
      const { sala, pid } = contexto(socket);
      if (!sala || !pid) throw Error("Você não está numa sala. Entre pelo código.");
      if (!duranteGP && ativos.has(sala.codigo)) throw Error("O GP está aberto. Volte à sede depois do resultado.");
      fn(sala, pid);
      guardar(sala); avisar(sala);
      ok(cb, { estado: estado(sala, pid) });
    } catch (e) { falha(cb, e.message || String(e)); }
  }
  const apresentar = (socket, sala, pid, cb, extra = {}) => { ligar(socket, sala, pid); ok(cb, { codigo: sala.codigo, id: pid, estado: estado(sala, pid), ...extra }); avisar(sala); };

  // o GP terminou na sala da Corrida: o resultado entra na temporada de todos, uma vez só
  function aoTerminarGP(sala, indice, ano) {
    return (room) => {
      const atual = salas.get(sala.codigo);
      if (!atual || atual.gp !== indice || atual.ano !== ano) return;
      try {
        const linhas = room.resultado.map((r) => {
          const p = room.players[r.id];
          return { piloto: p.pessoa ? G.idDoHumano(p.pessoa) : p.piloto.id, equipe: p.equipe, pos: r.pos, pontos: r.pontos, dnf: r.dnf, nc: r.nc, voltaRapida: !!r.voltaRapida };
        });
        G.registrarResultado(atual, linhas);
        ativos.delete(atual.codigo); guardar(atual); avisar(atual);
      } catch (e) { console.warn("temporada em grupo: GP não registrado:", e.message); }
    };
  }

  // o GP aberto de verdade: uma sala da Corrida ainda viva e fora da tela de resultado (um GP abandonado não trava a sala)
  function gpAberto(sala) {
    const a = ativos.get(sala.codigo); if (!a) return false;
    const r = corrida.salaGP(a.code);
    if (r && r.phase !== "results") return true;
    ativos.delete(sala.codigo); return false;
  }
  // apaga a sala (memória e banco) e avisa quem está nela
  function apagarSala(sala, motivo) {
    salas.delete(sala.codigo); ativos.delete(sala.codigo);
    try { bd.apagarSalaTemporadaCorrida(sala.codigo); } catch {}
    for (const s of [...nsp.sockets.values()]) if (s.data.codigo === sala.codigo) { s.emit("encerrada", { motivo }); desligar(s); }
    presentes.delete(sala.codigo);
  }

  nsp.on("connection", (socket) => {
    socket.on("criar", (d = {}, cb) => {
      try {
        const nome = limparNome(d.nome);
        if (!nome) throw Error("Escreva seu nome.");
        const pid = rid(6), token = rid(), sala = G.criarSala(novoCodigo(salas), { id: pid, nome, tokenHash: hash(token) });
        salas.set(sala.codigo, sala); guardar(sala);
        apresentar(socket, sala, pid, cb, { token });
      } catch (e) { falha(cb, e.message); }
    });
    // entrar pelo código: com `id` e `token` é quem voltou; sem eles, uma pessoa nova (só com o nome)
    socket.on("entrar", (d = {}, cb) => {
      try {
        const sala = salas.get(String(d.codigo || "").toUpperCase().trim());
        if (!sala) throw Error("Sala não encontrada. Confira o código.");
        const volta = d.id && sala.pessoas[d.id] && d.token && sala.pessoas[d.id].tokenHash === hash(d.token);
        if (volta) return apresentar(socket, sala, d.id, cb);
        const nome = limparNome(d.nome);
        if (!nome) throw Error(d.id ? "Não reconheci seu acesso nesta sala. Escreva seu nome para entrar de novo." : "Escreva seu nome.");
        const pid = rid(6), token = rid();
        G.entrar(sala, { id: pid, nome, tokenHash: hash(token) });
        guardar(sala);
        apresentar(socket, sala, pid, cb, { token });
      } catch (e) { falha(cb, e.message); }
    });
    socket.on("estado", (_, cb) => { const { sala, pid } = contexto(socket); if (!sala || !pid) return falha(cb, "Você não está numa sala."); ok(cb, { estado: estado(sala, pid) }); });
    socket.on("sair", (_, cb) => {
      const { sala, pid } = contexto(socket);
      if (!sala || !pid) return falha(cb, "Você não está numa sala.");
      desligar(socket);
      if (G.sair(sala, pid)) {
        if (!sala.ordem.length) { salas.delete(sala.codigo); try { bd.apagarSalaTemporadaCorrida(sala.codigo); } catch {} } else { guardar(sala); avisar(sala); }
      } else avisar(sala); // depois que a temporada começa, sair só deixa a pessoa ausente
      ok(cb);
    });

    // sair da temporada (depois que ela começou): o carro da pessoa volta para um robô e ela deixa a sala. Não vale com GP aberto.
    socket.on("sairDaTemporada", (_, cb) => {
      try {
        const { sala, pid } = contexto(socket);
        if (!sala || !pid) throw Error("Você não está numa sala.");
        if (gpAberto(sala)) throw Error("O GP está aberto. Saia depois do resultado.");
        desligar(socket);
        const fim = G.dispensar(sala, pid);
        if (fim === "encerrada") apagarSala(sala, "Todos os pilotos saíram: a temporada foi encerrada.");
        else { guardar(sala); avisar(sala); }
        ok(cb);
      } catch (e) { falha(cb, e.message || String(e)); }
    });
    // o anfitrião encerra a temporada para todos: a sala some do banco e os outros são avisados
    socket.on("encerrar", (_, cb) => {
      try {
        const { sala, pid } = contexto(socket);
        if (!sala || !pid) throw Error("Você não está numa sala.");
        if (sala.host !== pid) throw Error("Só o anfitrião encerra a temporada.");
        if (gpAberto(sala)) throw Error("O GP está aberto. Encerre depois do resultado.");
        apagarSala(sala, "O anfitrião encerrou a temporada.");
        ok(cb);
      } catch (e) { falha(cb, e.message || String(e)); }
    });

    socket.on("equipe", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.escolherEquipe(sala, pid, d.id)));
    socket.on("opcoes", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.definirOpcoes(sala, pid, d)));
    socket.on("passarCargo", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.passarCargo(sala, pid, d.id), { duranteGP: true }));
    socket.on("iniciar", (_, cb) => agir(socket, cb, (sala, pid) => G.iniciar(sala, pid)));
    socket.on("montagem", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.montar(sala, pid, d.pecas ? { pecas: d.pecas } : d.montagem, d.versao)));
    socket.on("desenvolver", (_, cb) => agir(socket, cb, (sala, pid) => G.desenvolver(sala, pid)));
    socket.on("piloto", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.contratarPiloto(sala, pid, d.id)));
    socket.on("engenheiro", (d = {}, cb) => agir(socket, cb, (sala, pid) => G.contratarEngenheiro(sala, pid, d.area, Number(d.nivel))));
    socket.on("proximaTemporada", (_, cb) => agir(socket, cb, (sala, pid) => G.proximaTemporada(sala, pid)));

    // só o anfitrião abre o GP; a sala de F1 nasce com todos os humanos e cada tela recebe o acesso do seu carro
    socket.on("iniciarGP", (_, cb) => agir(socket, cb, (sala, pid) => {
      if (sala.host !== pid) throw Error("Só o anfitrião abre o GP.");
      if (sala.fase !== "temporada") throw Error("A temporada ainda não começou.");
      if (sala.gp >= sala.opcoes.tamanho) throw Error("A temporada terminou. Comece a próxima.");
      const atual = ativos.get(sala.codigo);
      if (!atual || corrida.salaGP(atual.code)?.phase === "results") {
        ativos.delete(sala.codigo);
        const grid = G.gridDoGP(sala), indice = sala.gp, ano = sala.ano;
        const rivais = require("./public/corrida/temporada/regras.js").desenvolvimentoRivais({ semente: sala.semente, ano: sala.ano, gp: sala.gp, tamanho: sala.opcoes.tamanho }, Object.keys(sala.equipes));
        const montagens = { ...rivais.montagens }, bonusMontagem = { ...rivais.bonus }, bonusBox = {};
        for (const [eq, t] of Object.entries(sala.equipes)) { montagens[eq] = t.montagem; bonusMontagem[eq] = t.bonus; bonusBox[eq] = t.engenheiros.mecanico * 0.5 + t.engenheiros.estrategista * 0.25; }
        const acesso = corrida.abrirGPGrupo({ salaTemporada: sala.codigo, pista: sala.calendario[sala.gp].pista, voltas: sala.opcoes.voltas, nivel: sala.opcoes.nivel,
          semente: `${sala.semente}:${ano}:${indice}`, tv: { tabelas: G.tabelas(sala), gp: indice + 1, total: sala.opcoes.tamanho, ano }, pessoas: grid.humanos, robos: grid.robos, montagens, bonusMontagem, bonusBox,
          aoMontar: (p, montagem) => {
            if (sala.gp !== indice || sala.ano !== ano) throw Error("Esta etapa da carreira não está mais aberta.");
            G.montar(sala, p.pessoa, montagem);
            guardar(sala); avisar(sala);
          } }, aoTerminarGP(sala, indice, ano));
        ativos.set(sala.codigo, { code: acesso.code, pessoas: acesso.pessoas, espectador: acesso.espectador, indice, ano });
      }
      // cada tela vai para a pista sozinha (quem estava fora da sede entra pelo botão "Entrar no GP")
      for (const s of nsp.sockets.values()) if (s.data.codigo === sala.codigo && sala.pessoas[s.data.pid]) s.emit("gp", acessoDe(sala, s.data.pid));
    }, { duranteGP: true }));

    socket.on("disconnect", () => {
      const { codigo } = socket.data, sala = salas.get(codigo);
      desligar(socket);
      if (sala) avisar(sala);
    });
  });
  return { salas, ativos };
};
