// Corrida, regras de F1: os avisos no estilo da transmissão (avisos-f1.js): tipo, cor, linhas do log, fila e prioridade.
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../public/corrida/avisos-f1.js");

test("cada tipo tem cor, texto, ícone, rótulo e prioridade; as bandeiras têm a cor delas", () => {
  for (const [id, t] of Object.entries(A.TIPOS)) {
    assert.match(t.fundo, /^#[0-9a-f]{6}$/i, id); assert.match(t.txt, /^#[0-9a-f]{6}$/i, id); assert.match(t.bloco, /^#[0-9a-f]{6}$/i, id);
    assert.ok(t.rotulo && t.rotulo === t.rotulo.toUpperCase() && Number.isInteger(t.prio), id);
    assert.match(A.iconeDe(id), /^<svg/, id);
  }
  assert.equal(A.TIPOS.amarela.fundo, "#ffd800"); assert.equal(A.TIPOS.azul.fundo, "#0a57d8");
  assert.equal(A.TIPOS.vermelha.fundo, "#e10600"); assert.equal(A.TIPOS.verde.fundo, "#00a859"); assert.equal(A.TIPOS.sc.fundo, "#ff8a00");
  assert.ok(A.TIPOS.vermelha.prio < A.TIPOS.sc.prio && A.TIPOS.sc.prio < A.TIPOS.amarela.prio && A.TIPOS.amarela.prio < A.TIPOS.sistema.prio);
  assert.equal(A.tipoDe("não existe"), A.TIPOS.sistema);
});

test("tipo do texto: as mensagens da direção de prova viram o tipo certo", () => {
  const tipo = (s) => A.tipoDoTexto(s);
  assert.equal(tipo("🟡 Bandeira amarela no setor 3: Ana saiu da trajetória."), "amarela");
  assert.equal(tipo("🟡 Ana: devolva a posição para Beto."), "amarela");
  assert.equal(tipo("🔵 Ana: deixe o líder passar (1/3)."), "azul");
  assert.equal(tipo("🚨 Safety car na pista. Mantenha a posição e reduza."), "sc");
  assert.equal(tipo("🟢 Safety car recolhido. Relargada!"), "verde");
  assert.equal(tipo("🟢 Pista liberada."), "verde");
  assert.equal(tipo("⚫⚪ Ana: limite de pista (2/4)."), "limite");
  assert.equal(tipo("⏱️ Ana: queimou a largada, +5 s."), "punicao");
  assert.equal(tipo("🔧 Ana quebrou! Anda no modo de emergência."), "quebra");
  assert.equal(tipo("💥 Ana: perda total! O carro é retirado da pista"), "dnf");
  assert.equal(tipo("Ana abandonou o GP (DNF)."), "dnf");
  assert.equal(tipo("💥 Ana: batida leve no muro; dano 1%"), "batida");
  assert.equal(tipo("🔧 Box na próxima passagem: Duro"), "box");
  assert.equal(tipo("Bandeira vermelha: corrida interrompida"), "vermelha");
  assert.equal(tipo("Investigação do incidente"), "investigacao");
  assert.equal(tipo("🏁 Largada em Mônaco, 3 voltas."), "largada");
  assert.equal(tipo("🏆 Fim de corrida!"), "chegada");
  assert.equal(tipo("Copiado"), "sistema");
});

test("limpar: sem emojis e sem espaços sobrando", () => {
  assert.equal(A.limpar("🟡 Bandeira  amarela ⚫⚪"), "Bandeira amarela");
  assert.equal(A.limpar("⏱️ Ana: +5 s"), "Ana: +5 s");
  assert.equal(A.limpar(null), "");
});

test("log: ruído de robôs e de outros pilotos não vira aviso; o que é meu e as bandeiras sim", () => {
  const de = (s) => A.deLinha(s, "Ana");
  assert.equal(de("🤖 Os robôs miram voltas de 1:20"), null);
  assert.equal(de("Beto saiu da sala."), null);
  assert.equal(de("🔧 Beto parou nos boxes (Duro): 2.4 s"), null);
  assert.equal(de("⚫⚪ Beto: limite de pista (1/4)."), null);
  assert.equal(de("💥 Beto: batida leve no muro; dano 1%"), null);
  assert.equal(de("🏁 Beto cruzou a chegada em 2º."), null);
  assert.deepEqual(de("⚫⚪ Ana: limite de pista (1/4)."), { tipo: "limite", texto: "Ana: limite de pista (1/4)." });
  assert.equal(de("⏱️ Beto: queimou a largada, +5 s.").tipo, "punicao", "punição dos outros aparece (é da direção de prova)");
  assert.equal(de("🟡 Bandeira amarela no setor 2: detritos na pista.").tipo, "amarela");
  assert.equal(de("🔧 Beto quebrou! Anda no modo de emergência.").tipo, "quebra");
});

test("log: só as linhas novas e recentes entram, e o que já passou não repete", () => {
  const log = [{ t: 1000, text: "a" }, { t: 20000, text: "b" }, { t: 21000, text: "c" }];
  const r1 = A.novosDoLog(log, null, 22000);
  assert.deepEqual(r1.novos.map((l) => l.text), ["b", "c"], "a linha de 21 s atrás é velha demais");
  assert.equal(r1.visto, 21000);
  const r2 = A.novosDoLog(log, r1.visto, 22500);
  assert.equal(r2.novos.length, 0);
  const r3 = A.novosDoLog([...log, { t: 22400, text: "d" }], r2.visto, 22500);
  assert.deepEqual(r3.novos.map((l) => l.text), ["d"]);
});

test("fila: no máximo 3 na tela, o resto espera sem tapar ninguém e entra quando alguém sai", () => {
  const f = A.criarFila({ max: 3, ttl: 1000 });
  for (let i = 0; i < 5; i++) f.empurrar({ tipo: "sistema", texto: "aviso " + i }, 0);
  assert.deepEqual(f.visiveis(0).map((a) => a.texto), ["aviso 0", "aviso 1", "aviso 2"]);
  assert.equal(f.esperando(), 2);
  assert.deepEqual(f.visiveis(999).map((a) => a.texto), ["aviso 0", "aviso 1", "aviso 2"]);
  assert.deepEqual(f.visiveis(1000).map((a) => a.texto), ["aviso 3", "aviso 4"]);
  assert.equal(f.visiveis(2000).length, 0);
});

test("fila: o mais urgente passa na frente de quem espera (mas não derruba quem já está na tela)", () => {
  const f = A.criarFila({ max: 2, ttl: 1000 });
  f.empurrar({ tipo: "sistema", texto: "s1" }, 0); f.empurrar({ tipo: "sistema", texto: "s2" }, 0);
  f.empurrar({ tipo: "sistema", texto: "s3" }, 0); f.empurrar({ tipo: "amarela", texto: "amarela" }, 0); f.empurrar({ tipo: "vermelha", texto: "vermelha" }, 0);
  assert.deepEqual(f.visiveis(0).map((a) => a.texto), ["s1", "s2"], "ninguém é tapado");
  assert.deepEqual(f.visiveis(1000).map((a) => a.texto), ["vermelha", "amarela"], "a vermelha e a amarela antes do s3");
  assert.deepEqual(f.visiveis(2000).map((a) => a.texto), ["s3"]);
});

test("fila: a mesma mensagem não repete, e o aviso com chave troca o texto no lugar (o DOM só muda quando muda)", () => {
  const f = A.criarFila({ max: 3, ttl: 1000 });
  f.empurrar({ tipo: "box", texto: "Box" }, 0); const v = f.versao;
  assert.equal(f.empurrar({ tipo: "box", texto: "Box" }, 10), null); assert.equal(f.versao, v, "igual: nada muda");
  const a = f.empurrar({ chave: "estado", tipo: "amarela", texto: "Bandeira amarela", fixo: true }, 20), v2 = f.versao, id = a.id;
  f.empurrar({ chave: "estado", tipo: "amarela", texto: "Bandeira amarela", fixo: true }, 30); assert.equal(f.versao, v2, "texto igual: sem mudança");
  const b = f.empurrar({ chave: "estado", tipo: "sc", texto: "Safety car", fixo: true }, 40);
  assert.equal(b.id, id, "o mesmo lugar"); assert.equal(b.tipo, "sc"); assert.ok(f.versao > v2);
  assert.ok(f.visiveis(100000).some((x) => x.chave === "estado"), "o fixo não expira");
  assert.equal(f.remover("estado"), true); assert.ok(!f.visiveis(100001).some((x) => x.chave === "estado"));
});

test("fila: cheia, descarta o menos urgente; limpar zera", () => {
  const f = A.criarFila({ max: 1, espera: 2, ttl: 1000 });
  f.empurrar({ tipo: "sistema", texto: "a" }, 0);
  f.empurrar({ tipo: "sistema", texto: "b" }, 0); f.empurrar({ tipo: "sistema", texto: "c" }, 0); f.empurrar({ tipo: "sc", texto: "sc" }, 0);
  assert.equal(f.esperando(), 2);
  assert.deepEqual(f.visiveis(1000).map((a) => a.texto), ["sc"], "o safety car furou a fila, o último comum caiu");
  f.limpar(); assert.equal(f.visiveis(1001).length, 0); assert.equal(f.esperando(), 0);
});
