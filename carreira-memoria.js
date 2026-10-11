// Carreira de Treinador: a MEMÓRIA do clube, o que faz uma escolha de hoje voltar amanhã (o efeito dominó).
// Antes, cada evento era um efeito solto: acontecia, passava e o jogo esquecia. Agora tudo que você decide deixa rastro:
//   - as relações (torcida, imprensa, vestiário; a diretoria é a confiança de carreira-clube.js), de 0 a 100, que
//     mexem no jogo de verdade (bilheteria, moral depois da derrota, paciência da diretoria);
//   - o perfil do técnico (firmeza e gasto), que sai do que as suas escolhas fizeram, não de uma pergunta;
//   - os laços com os jogadores (gratidão e mágoa) de cada decisão que atingiu alguém;
//   - o diário do clube, a lista do que aconteceu e por quê;
//   - os ECOS: eventos que só existem porque você fez algo antes (a mágoa que volta, a gratidão que paga, a torcida que
//     cobra, a imprensa que lembra), com a mesma forma do catálogo (carreira-catalogo.js) e as mesmas ajudas.
// Tudo mora em save.memoria (campo do clube, CAMPOS_CLUBE de carreira.js). Saves antigos criam a memória na hora.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RELACOES = ["torcida", "imprensa", "vestiario"];
const ROTULO = { torcida: "Torcida", imprensa: "Imprensa", vestiario: "Vestiário" };

function de(save) {
  const m = save.memoria || (save.memoria = {});
  if (!m.rel) m.rel = { torcida: 50, imprensa: 50, vestiario: 55 };
  if (!m.perfil) m.perfil = { firmeza: 0, gasto: 0 };
  if (!m.laco) m.laco = {};
  if (!m.marcas) m.marcas = {};
  if (!m.diario) m.diario = [];
  if (m.ultimoEco === undefined) m.ultimoEco = -9;
  return m;
}
function mudar(save, quem, n) {
  const m = de(save);
  if (n && quem in m.rel) m.rel[quem] = clamp(Math.round(m.rel[quem] + n), 0, 100);
}
const foto = (save) => ({ ...de(save).rel });
function registrar(save, texto, tipo = "evento") {
  const m = de(save);
  m.diario.push({ rodada: save.rodada, temporada: save.temporada, tipo, texto });
  if (m.diario.length > 40) m.diario.shift();
}
const laco = (m, pid) => m.laco[pid] || (m.laco[pid] = { g: 0, r: 0, por: "" });
function perdoar(save, pid) { const l = de(save).laco[pid]; if (l) { l.r = 0; l.por = ""; } }
function retribuir(save, pid) { const l = de(save).laco[pid]; if (l) l.g = 0; }

// "Torcida +2 · Vestiário −3": o que as relações andaram depois de uma resposta, para a pessoa ver o dominó
function resumo(save, antes) {
  const m = de(save), p = [];
  for (const k of RELACOES) { const d = m.rel[k] - antes[k]; if (d) p.push(`${ROTULO[k]} ${d > 0 ? "+" : "−"}${Math.abs(d)}`); }
  return p.length ? ` (${p.join(" · ")})` : "";
}

// o que uma escolha fez (o rastro das ajudas que ela chamou) vira perfil, relações, laço com o jogador e diário.
// rastro: [["moral", n] | ["caixa", n] | ["time", n] | ["jogador", n] | ["suspender"] | ["salario", fator] | ["listar"] | ["lesao"] | ["evoluir", n]]
function aprender(save, { titulo, opcao, j, rastro }) {
  if (!rastro || !rastro.length) return;
  const m = de(save);
  let firme = 0, gasto = 0, bom = 0, mau = 0, vest = 0, torc = 0;
  for (const [t, n] of rastro) {
    if (t === "moral") { if (n > 0) { firme--; vest += n >= 3 ? 2 : 1; } else { firme++; vest -= n <= -3 ? 3 : 2; } }
    else if (t === "caixa") gasto += n < 0 ? 1 : -1;
    else if (t === "time") torc += n > 0 ? 1 : -1;
    else if (t === "suspender") { firme += 2; mau++; } // punir pesa mais que o agrado ao grupo que costuma vir junto
    else if (t === "salario") { if (n > 1) { gasto++; bom++; } else { gasto--; mau++; } }
    else if (t === "jogador" || t === "evoluir") { if (n > 0) bom++; else mau++; }
    else if (t === "listar") { mau++; torc--; }
    else if (t === "lesao") mau++;
  }
  m.perfil.firmeza = clamp(m.perfil.firmeza + firme, -12, 12);
  m.perfil.gasto = clamp(m.perfil.gasto + gasto, -12, 12);
  mudar(save, "vestiario", vest); mudar(save, "torcida", torc);
  if (j && (bom || mau) && bom !== mau) {
    const l = laco(m, j.id);
    if (mau > bom) { l.r = Math.min(4, l.r + 1); l.por = titulo; } else { l.g = Math.min(4, l.g + 1); l.porG = titulo; }
    l.nome = j.nome;
  }
  registrar(save, opcao ? `${titulo}: ${opcao}` : titulo);
}

// ---------- o que as relações fazem no jogo ----------
const fatorTorcida = (save) => 0.88 + de(save).rel.torcida / 100 * 0.24; // 0,88 a 1,12 na bilheteria

// depois de cada jogo: o resultado anda as relações, e elas devolvem um pouco (moral e paciência da diretoria)
function aposJogo(save, c, { nos, eles, emCasa, classico, adv }) {
  const m = de(save), res = nos > eles ? "V" : nos === eles ? "E" : "D", g = save.gestao;
  m.ultimoJogo = { res, nos, eles, emCasa, classico: !!classico, adv: adv && c.clubeDe ? (c.clubeDe(save, adv) || {}).nome || "rival" : "rival", rodada: save.rodada }; // a coletiva e a torcida (carreira-pressao.js) falam deste jogo
  if (res === "V") { mudar(save, "torcida", emCasa ? 2 : 1); mudar(save, "imprensa", 1); }
  else if (res === "D") { mudar(save, "torcida", -2); mudar(save, "imprensa", eles - nos >= 3 ? -3 : -1); }
  if (eles - nos >= 4) { mudar(save, "vestiario", -3); m.marcas.goleadasSofridas = (m.marcas.goleadasSofridas || 0) + 1; registrar(save, `Goleada sofrida: ${nos} × ${eles}.`, "marca"); }
  if (nos - eles >= 3) { mudar(save, "torcida", 2); m.marcas.goleadas = (m.marcas.goleadas || 0) + 1; }
  if (classico && res !== "E") {
    mudar(save, "torcida", res === "V" ? 4 : -3); mudar(save, "imprensa", res === "V" ? 2 : -2);
    if (res === "V") { m.marcas.classicos = (m.marcas.classicos || 0) + 1; registrar(save, `Venceu o clássico por ${nos} × ${eles}.`, "marca"); }
    else registrar(save, `Perdeu o clássico por ${nos} × ${eles}.`, "marca");
  }
  // o vestiário acompanha o humor do elenco devagar
  const moral = save.moral;
  if (moral >= 70) mudar(save, "vestiario", 1); else if (moral <= 40) mudar(save, "vestiario", -1);
  if (res === "D") {
    // vestiário unido segura a derrota; rachado, piora. Imprensa amiga amortece a diretoria; hostil, pressiona.
    if (m.rel.vestiario >= 75) c.mudarMoral(save, 1); else if (m.rel.vestiario <= 25) c.mudarMoral(save, -1);
    if (g && g.confianca != null) g.confianca = clamp(g.confianca + (m.rel.imprensa >= 70 ? 1 : m.rel.imprensa <= 30 ? -1 : 0), 0, 100);
  }
}

function fimDeTemporada(save, { pos, titulos, divisao, cumpriuMeta }) {
  const m = de(save);
  if (titulos && titulos.length) {
    mudar(save, "torcida", 15); mudar(save, "imprensa", 10); mudar(save, "vestiario", 8);
    m.marcas.titulos = (m.marcas.titulos || 0) + titulos.length; m.marcas.ultimoTitulo = save.temporada;
    registrar(save, `Campeão: ${titulos.join(", ")}.`, "marca");
  }
  if (divisao === "rebaixado") { mudar(save, "torcida", -15); mudar(save, "imprensa", -10); m.marcas.quedas = (m.marcas.quedas || 0) + 1; m.marcas.ultimaQueda = save.temporada; registrar(save, `Rebaixado: ${pos}º lugar.`, "marca"); }
  if (divisao === "acesso") { mudar(save, "torcida", 12); mudar(save, "imprensa", 6); registrar(save, `Subiu para a Série A: ${pos}º lugar na Série B.`, "marca"); }
  if (cumpriuMeta === true) mudar(save, "imprensa", 3); else if (cumpriuMeta === false) mudar(save, "imprensa", -3);
  // com o tempo a memória esfria: relações voltam um pouco ao meio e os laços perdem força
  for (const k of RELACOES) m.rel[k] = Math.round(m.rel[k] + (50 - m.rel[k]) * 0.15);
  for (const [pid, l] of Object.entries(m.laco)) { l.g = Math.max(0, l.g - 1); l.r = Math.max(0, l.r - 1); if (!l.g && !l.r) delete m.laco[pid]; }
}

// vender um craque (um dos 3 melhores) pesa na torcida e no vestiário
function vendeu(save, c, j, valor) {
  const m = de(save), melhores = c.elencoDe(save, save.clube).concat(j).sort((a, b) => c.notaDe(save, b) - c.notaDe(save, a)).slice(0, 3);
  if (!melhores.some((x) => x.id === j.id)) return;
  mudar(save, "torcida", -5); mudar(save, "vestiario", -2);
  m.marcas.idolo = { nome: j.nome, temporada: save.temporada, rodada: save.rodada, valor };
  registrar(save, `Vendeu ${j.nome}, um dos melhores do elenco.`, "marca");
  delete m.laco[j.id];
}

// ---------- o perfil do técnico, que sai do que você fez ----------
function perfilDe(m) {
  const { firmeza, gasto } = m.perfil, partes = [];
  if (firmeza >= 4) partes.push("linha-dura"); else if (firmeza <= -4) partes.push("paizão");
  if (gasto >= 4) partes.push("mão-aberta"); else if (gasto <= -4) partes.push("pão-duro");
  if (!partes.length) return { nome: "Ainda sem rótulo", texto: "O vestiário e a torcida ainda estão te conhecendo." };
  const nome = partes.join(" e "), textos = {
    "linha-dura": "Você cobra e pune: o elenco respeita, mas o clima pesa.",
    "paizão": "Você acolhe e perdoa: o grupo é unido, mas pode relaxar.",
    "mão-aberta": "Você abre a carteira pelo grupo: todo mundo gosta, e a diretoria olha a conta.",
    "pão-duro": "Você segura cada centavo: o caixa agradece, o elenco nem tanto.",
  };
  return { nome: nome[0].toUpperCase() + nome.slice(1), texto: partes.map((p) => textos[p]).join(" ") };
}

// o que o navegador vê: relações, perfil, diário e quem tem laço forte (mágoa ou gratidão de 2 ou mais)
function estado(save, c) {
  const m = de(save), meus = new Set(c.elencoDe(save, save.clube).map((j) => j.id));
  return {
    rel: { ...m.rel }, perfil: { ...perfilDe(m), firmeza: m.perfil.firmeza, gasto: m.perfil.gasto },
    diario: [...m.diario].reverse().slice(0, 14),
    lacos: Object.entries(m.laco).filter(([pid, l]) => meus.has(pid) && (l.g >= 2 || l.r >= 2)).map(([pid, l]) => ({ pid, nome: l.nome || "", gratidao: l.g, magoa: l.r, por: l.por })),
  };
}

// ---------- os ecos: eventos que dependem do que você fez ----------
// Mesma forma do catálogo; `quando(x, m)` enxerga a memória (m) e o alvo "magoado" ou "grato" é um jogador com laço de 2 ou mais.
const M = 1e6, r5 = (v) => Math.round(v / 5e4) * 5e4;
const ECOS = [
  { id: "eco-magoa", grupo: "memoria", icone: "alerta", alvo: "magoado",
    quando: () => true,
    titulo: (x) => `${x.n} ainda não esqueceu`, texto: (x) => `${x.n} anda calado nos treinos. Colegas dizem que ele ainda remói o que aconteceu.`,
    lembranca: (x) => `Lembrança: "${x.lembrancaDe(x.j)}".`,
    opcoes: [["conversar", "Chamar para uma conversa franca", (x) => { x.perdoar(); x.jogador(2, 3); x.moral(1); return `${x.n} desabafou, ouviu e voltou a rir nos treinos.`; }],
      ["aumento", "Fazer um agrado (aumento)", (x) => { x.perdoar(); x.salario(1.2); x.jogador(3, 3); return `${x.n} se sentiu valorizado. O salário subiu e a mágoa passou.`; }],
      ["ignorar", "Deixar o tempo resolver", (x) => { x.jogador(-3, 3); x.listar(); return `${x.n} pediu para sair e foi para a lista de venda. A mágoa virou rompimento.`; }]], padrao: "ignorar" },
  { id: "eco-gratidao", grupo: "memoria", icone: "palmas", alvo: "grato",
    quando: () => true,
    titulo: (x) => `${x.n} quer retribuir`, texto: (x) => `${x.n} não esqueceu o que você fez por ele e se oferece para o que precisar.`,
    lembranca: (x) => `Lembrança: ele se lembra de "${x.lembrancaDe(x.j, true)}".`,
    opcoes: [["jogar", "Pedir um esforço extra (3 jogos)", (x) => { x.retribuir(); x.jogador(4, 3); return `${x.n} corre por dois nos próximos jogos.`; }],
      ["contrato", "Pedir que renove mais barato", (x) => { x.retribuir(); x.salario(0.88); x.jogador(1, 3); return `${x.n} aceitou reduzir o salário por amor à camisa.`; }],
      ["agradecer", "Só agradecer", (x) => { x.moral(1); return `${x.n} sorriu. A gratidão fica guardada para depois.`; }]], padrao: "agradecer" },
  { id: "eco-pulso", grupo: "memoria", icone: "apito", quando: (x, m) => m.perfil.firmeza >= 3 && m.rel.vestiario <= 50,
    titulo: "O vestiário cochicha sobre o seu pulso", texto: "Punições, cobranças, broncas. O elenco comenta que o clima no CT está pesado e alguém já falou com a imprensa.",
    lembranca: (x) => `Lembrança: você acumulou decisões duras nos últimos meses (${x.m.perfil.firmeza} de firmeza).`,
    opcoes: [["churrasco", "Churrasco e conversa aberta", (x) => { x.caixa("Churrasco do elenco", -r5(80e3 * x.T)); x.moral(4); x.vestiario(8); return "O clima desanuviou: o grupo viu que o técnico também sabe ouvir."; }],
      ["manter", "Manter a linha", (x) => { x.time(1, 2); x.moral(-2); x.vestiario(-4); return "Disciplina mantida e resultado curto, mas o vestiário azedou mais um pouco."; }],
      ["imprensa", "Rebater na imprensa", (x) => { x.imprensa(-3); x.moral(2); return "Você bancou a postura em público. O elenco gostou, os jornais nem tanto."; }]], padrao: "manter" },
  { id: "eco-folga", grupo: "memoria", icone: "sino", quando: (x, m) => m.perfil.firmeza <= -3 && x.derrotas >= 1,
    titulo: "Treino relaxado demais?", texto: "Dois tropeços recentes e o preparador comenta que o grupo chega no treino sem a mesma cobrança de antes.",
    lembranca: (x) => `Lembrança: o clima leve que você construiu (${-x.m.perfil.firmeza} de carinho) tem um custo.`,
    opcoes: [["puxar", "Apertar o treino por 3 jogos", (x) => { x.time(2, 3); x.moral(-2); return "O treino apertou. Reclamação no vestiário, mas o time voltou a correr."; }],
      ["confiar", "Confiar no grupo", (x) => { x.vestiario(4); x.time(-1, 2); return "Você confiou. O grupo gostou, mas o desempenho oscilou."; }]], padrao: "confiar" },
  { id: "eco-conta", grupo: "memoria", icone: "moeda", quando: (x, m) => m.perfil.gasto >= 3 && x.caixaAtual < 40 * M,
    titulo: "A diretoria bate na mesa", texto: "Os gastos com o grupo foram generosos e o caixa está apertado. O presidente quer uma conversa.",
    lembranca: (x) => `Lembrança: as suas decisões abriram a carteira ${x.m.perfil.gasto} vezes a mais do que o clube segurou.`,
    opcoes: [["cortar", "Prometer cortar custos", (x) => { x.confianca(5); x.moral(-3); x.caixa("Corte de gastos", r5(8 * M)); return "A diretoria respirou. O elenco sentiu o aperto."; }],
      ["bancar", "Defender o investimento", (x) => { x.confianca(-6); x.vestiario(4); return "Você bancou o grupo. A diretoria anotou."; }]], padrao: "cortar" },
  { id: "eco-faixa", grupo: "memoria", icone: "alerta", quando: (x, m) => m.rel.torcida <= 35,
    titulo: "Faixa da torcida na saída do CT", texto: "A organizada pendurou uma faixa pedindo mais raça. A relação com a arquibancada azedou.",
    lembranca: (x) => `Lembrança: a torcida está em ${x.m.rel.torcida} de 100 e a cobrança virou rotina.`,
    opcoes: [["conversar", "Receber os líderes da torcida", (x) => { x.torcida(7); x.moral(1); return "Você ouviu os líderes. Eles saíram prometendo apoio, por ora."; }],
      ["elenco", "Cobrar o elenco em público", (x) => { x.moral(-3); x.torcida(3); return "A torcida gostou da cobrança. O vestiário, não."; }],
      ["ignorar", "Fingir que não viu", (x) => { x.torcida(-4); x.time(-1, 2); return "A pressão aumentou: a arquibancada vai vaiar."; }]], padrao: "ignorar" },
  { id: "eco-mosaico", grupo: "memoria", icone: "bandeira", quando: (x, m) => m.rel.torcida >= 70,
    titulo: "A torcida prepara um mosaico", texto: "A organizada quer cobrir a arquibancada com um mosaico e pede que o time faça a sua parte em campo.",
    lembranca: (x) => `Lembrança: a torcida está com você (${x.m.rel.torcida} de 100) depois de tudo que foi feito.`,
    opcoes: [["aceitar", "Ir à festa e discursar", (x) => { x.time(2, 3); x.moral(3); x.torcida(3); return "A festa levantou o time: o estádio vai empurrar nos próximos jogos."; }],
      ["bilheteria", "Pedir ingressos para o mosaico", (x) => { x.caixa("Bilheteria do mosaico", r5(2 * M * x.T / 3)); return "Estádio cheio e caixa agradecido."; }]], padrao: "aceitar" },
  { id: "eco-coletiva", grupo: "memoria", icone: "microfone", quando: (x, m) => m.rel.imprensa <= 35,
    titulo: "Coletiva hostil", texto: "Os repórteres chegaram com perguntas afiadas. O clima com a imprensa está pesado.",
    lembranca: (x) => `Lembrança: a imprensa está em ${x.m.rel.imprensa} de 100 e cada resposta vira manchete.`,
    opcoes: [["calmo", "Responder com calma", (x) => { x.imprensa(5); return "Você manteve a calma. A manchete foi mais gentil do que o temido."; }],
      ["bater", "Rebater com ironia", (x) => { x.imprensa(-3); x.moral(3); return "A resposta viralizou. O vestiário riu, os jornais não perdoaram."; }],
      ["sair", "Encerrar a coletiva", (x) => { x.imprensa(-5); x.time(-1, 1); return "Saída de cena: virou assunto o dia inteiro."; }]], padrao: "calmo" },
  { id: "eco-amigo", grupo: "memoria", icone: "microfone", quando: (x, m) => m.rel.imprensa >= 66,
    titulo: "Um jornalista de confiança sopra uma informação", texto: "O setorista do clube, que respeita o seu trabalho, conta como o próximo adversário deve jogar.",
    lembranca: (x) => `Lembrança: a imprensa está do seu lado (${x.m.rel.imprensa} de 100).`,
    opcoes: [["usar", "Usar a dica no treino", (x) => { x.rival(-3); return "A dica foi certeira: o adversário vem mais fraco no próximo jogo."; }],
      ["materia", "Pedir uma matéria sobre o grupo", (x) => { x.torcida(4); x.moral(2); return "A matéria saiu elogiosa e a arquibancada leu."; }]], padrao: "usar" },
  { id: "eco-classico", grupo: "memoria", icone: "taca", quando: (x, m) => (m.marcas.classicos || 0) >= 2 && !!x.classico,
    titulo: "O rival lembra dos clássicos", texto: (x) => `Os jogadores do ${x.classico} comentam que querem a revanche e falam alto nas redes.`,
    lembranca: (x) => `Lembrança: você já venceu ${x.m.marcas.classicos} clássicos. Agora o rival quer a revanche.`,
    opcoes: [["provocar", "Entrar na brincadeira", (x) => { x.moral(3); x.rival(2); x.torcida(3); return "A torcida adorou, mas o rival vem mordido."; }],
      ["calar", "Pedir foco ao elenco", (x) => { x.time(1, 2); return "Você pediu respeito. O time ficou concentrado."; }]], padrao: "calar" },
  { id: "eco-idolo", grupo: "memoria", icone: "alerta", quando: (x, m) => !!m.marcas.idolo && m.marcas.idolo.temporada === x.save.temporada && x.save.rodada - m.marcas.idolo.rodada >= 3,
    titulo: (x) => `A torcida ainda cobra a saída de ${x.m.marcas.idolo.nome}`, texto: "A arquibancada não perdoou a venda do ídolo e a pergunta aparece em toda entrevista.",
    lembranca: (x) => `Lembrança: ${x.m.marcas.idolo.nome} foi vendido por ${x.din(x.m.marcas.idolo.valor)}.`,
    opcoes: [["homenagem", "Fazer uma homenagem no estádio", (x) => { x.caixa("Homenagem ao ex-ídolo", -r5(200e3 * x.T)); x.torcida(6); return "A homenagem emocionou. A torcida deixou o assunto de lado."; }],
      ["explicar", "Explicar a venda", (x) => { x.torcida(2); x.imprensa(1); return "Você mostrou os números. Parte da torcida entendeu."; }],
      ["ignorar", "Seguir em frente", (x) => { x.torcida(-3); return "A ferida continua aberta."; }]], padrao: "explicar" },
  { id: "eco-faixa-campea", grupo: "memoria", icone: "taca", quando: (x, m) => m.marcas.ultimoTitulo === x.save.temporada - 1 && x.save.rodada <= 8,
    titulo: "Todo mundo quer derrubar o campeão", texto: "O time carrega a faixa da temporada passada. Cada adversário joga a final contra você.",
    lembranca: (x) => `Lembrança: o título da temporada ${x.m.marcas.ultimoTitulo} pesa a favor e a cobrança também.`,
    opcoes: [["fome", "Falar em fome de título de novo", (x) => { x.time(1, 4); x.moral(2); return "O grupo comprou a ideia: fome de campeão."; }],
      ["descanso", "Poupar o grupo", (x) => { x.moral(3); x.time(-1, 2); return "O grupo descansou, mas o ritmo caiu."; }]], padrao: "fome" },
  { id: "eco-queda", grupo: "memoria", icone: "alerta", quando: (x, m) => m.marcas.ultimaQueda === x.save.temporada - 1 && x.save.rodada <= 10,
    titulo: "A ferida do rebaixamento", texto: "A torcida ainda lembra da queda e exige uma campanha de volta à elite sem tropeços.",
    lembranca: (x) => `Lembrança: o rebaixamento da temporada ${x.m.marcas.ultimaQueda} ainda não cicatrizou.`,
    opcoes: [["promessa", "Prometer o acesso", (x) => { x.torcida(5); x.confianca(-3); return "A promessa animou a torcida. Agora a diretoria cobra."; }],
      ["calma", "Pedir paciência", (x) => { x.moral(2); x.torcida(-2); return "O grupo respirou, a arquibancada fez cara feia."; }]], padrao: "calma" },
];

// escolhe o jogador do ecos de laço: o com mais mágoa (ou gratidão) que ainda está no elenco
function alvoDeLaco(save, c, tipo, r) {
  const m = de(save), meus = new Set(c.elencoDe(save, save.clube).map((j) => j.id));
  const lista = Object.entries(m.laco).filter(([pid, l]) => meus.has(pid) && (tipo === "magoado" ? l.r : l.g) >= 2);
  if (!lista.length) return null;
  const [pid] = lista[Math.floor(r() * lista.length)];
  return c.jogadorDe(save, pid);
}
function lembrancaDe(save, j, bom) {
  const l = de(save).laco[j.id]; return (bom ? l && l.porG : l && l.por) || (bom ? "uma decisão sua" : "uma decisão antiga");
}

module.exports = { de, mudar, foto, resumo, registrar, aprender, aposJogo, fimDeTemporada, vendeu, fatorTorcida, perfilDe, estado, perdoar, retribuir, ECOS, alvoDeLaco, lembrancaDe, RELACOES };
