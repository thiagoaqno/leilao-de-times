// Road to Champions: a dublagem. O manifesto e os MP3 (public/jogador/dublagem), as condições das falas sem eval
// (road-voz.js), as cenas ligadas aos eventos do jogo (road-regras.js), o estado narrativo e o callback no servidor e
// os arquivos servidos pelo próprio servidor. O tocador no navegador está em tests/e2e/road-dublagem.spec.js.
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const bd = require("../bd.js");
bd.abrir();
const rtc = require("../road-to-champions.js");
const R = require("../public/jogador/road-regras.js");
const V = require("../public/jogador/road-voz.js");
const M = require("../public/jogador/dublagem/manifesto.json");
const { subirServidor } = require("./ajuda.js");

const PUBLIC = path.join(__dirname, "..", "public");
const falas = Object.values(M.falas), cenas = Object.values(M.cenas);
const arquivoDe = (url) => path.join(PUBLIC, ...url.split("/").filter(Boolean));

// ---------- 1. os MP3 ----------
test("todo MP3 do manifesto existe, é MP3 de verdade e tem duração medida", () => {
  const comAudio = falas.filter((f) => f.audio);
  assert.equal(comAudio.length, 43);
  for (const f of comAudio) {
    assert.match(f.audio, /^\/jogador\/dublagem\/vo\/[A-Z]+_[A-Z]+\/RTC_A\d_E\d\d_[A-Z_0-9]+\.mp3$/, f.id);
    assert.ok(f.audio.endsWith("/" + f.personagem + "/" + f.id + ".mp3"), f.id + ": pasta ou nome fora do padrão");
    const buf = fs.readFileSync(arquivoDe(f.audio));
    assert.ok(buf.length > 10000, f.id);
    const id3 = buf.subarray(0, 3).toString() === "ID3", quadro = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
    assert.ok(id3 || quadro, f.id + ": não parece MP3");
    assert.ok(f.duracaoMs > 500 && f.duracaoMs < 20000, f.id + ": " + f.duracaoMs);
  }
  // nenhum MP3 solto na pasta, fora do manifesto
  const naPasta = fs.readdirSync(path.join(PUBLIC, "jogador", "dublagem", "vo"), { recursive: true }).filter((x) => /\.mp3$/.test(x));
  assert.equal(naPasta.length, comAudio.length);
  // o código não depende de caminho do Windows
  const texto = JSON.stringify(M) + fs.readFileSync(path.join(PUBLIC, "jogador", "road-dublagem.js"), "utf8");
  assert.doesNotMatch(texto, /[A-Za-z]:\\\\|Users\\\\|Assets Champions/);
});

// ---------- 2. os IDs ----------
test("os IDs são únicos e cada fala está num lugar só", () => {
  for (const [id, f] of Object.entries(M.falas)) assert.equal(f.id, id);
  for (const [id, c] of Object.entries(M.cenas)) assert.equal(c.id, id);
  const usados = cenas.flatMap((c) => [...c.intro, ...Object.values(c.ramos).flat()]);
  assert.equal(new Set(usados).size, usados.length, "fala repetida em duas cenas ou dois ramos");
  assert.deepEqual([...usados].sort(), Object.keys(M.falas).sort(), "fala sem cena ou cena com fala que não existe");
  const audios = falas.filter((f) => f.audio).map((f) => f.audio);
  assert.equal(new Set(audios).size, audios.length);
  assert.equal(cenas.length, 7);
});

// ---------- 3. as sequências ----------
test("toda cena tem uma sequência válida: a fala certa na cena certa, secundário com voz e protagonista legendado", () => {
  for (const c of cenas) {
    assert.ok(c.titulo && c.arquetipo && R.IDS.includes(c.arquetipo), c.id);
    assert.ok(c.intro.length + Object.keys(c.ramos).length > 0, c.id);
    for (const id of [...c.intro, ...Object.values(c.ramos).flat()]) {
      const f = M.falas[id];
      assert.equal(f.cena, c.id, id);
      assert.ok(f.legenda && f.legenda.length > 1, id);
      assert.doesNotMatch(f.legenda, /\[|\]|RTC_|choice_/, id + ": código técnico na legenda");
      if (f.protagonista) { assert.equal(f.audio, null, id); assert.equal(f.nome, null, id); assert.equal(f.voiceId, null, id); }
      else { assert.ok(f.audio && f.nome && f.voiceId, id); }
      if (f.trechos) {
        assert.equal(f.trechos[0].inicioMs, 0, id);
        for (let i = 1; i < f.trechos.length; i++) assert.ok(f.trechos[i].inicioMs > f.trechos[i - 1].inicioMs, id);
        assert.ok(f.trechos.at(-1).inicioMs < f.duracaoMs, id);
        assert.equal(f.trechos.map((t) => t.texto).join(" ").replace(/\s+/g, ""), f.legenda.replace(/\s+/g, ""), id);
      }
    }
    // as falas da introdução valem sempre; as dos ramos dependem da escolha (ou do callback)
    for (const id of c.intro) assert.deepEqual(M.falas[id].condicao, { sempre: true }, id);
    for (const [r, ids] of Object.entries(c.ramos)) for (const id of ids) assert.equal(M.falas[id].ramo, r, id);
    assert.ok(c.arte === null || fs.existsSync(arquivoDe(c.arte)), c.id + ": arte " + c.arte);
  }
  // a voz fixa dos secundários nunca diz o nome que o jogador deu ao protagonista: não há marcador de nome no texto
  for (const f of falas.filter((x) => !x.protagonista)) assert.doesNotMatch(f.legenda, /\{nome\}|\{avatar\}/, f.id);
});

// ---------- 4. as escolhas levam a ramos válidos ----------
test("cada cena dublada está ligada a um evento ou prelúdio do jogo, e as escolhas levam a ramos que existem", () => {
  for (const c of cenas.filter((x) => x.gatilho.tipo === "evento")) {
    const e = R.POR_ID.get(c.gatilho.evento);
    assert.ok(e, c.id + ": evento " + c.gatilho.evento);
    assert.ok(R.EXCLUSIVOS[c.arquetipo].includes(e), c.id + ": o evento é de outro protagonista");
    const ramos = new Set(e.opcoes.filter((o) => o.voz).map((o) => o.voz));
    assert.deepEqual([...ramos].sort(), Object.keys(c.ramos).sort(), c.id + ": todo ramo precisa de uma opção, e toda opção dublada de um ramo");
    for (const o of e.opcoes.filter((x) => x.voz)) {
      // o que a opção grava é o que o roteiro propôs para o ramo
      assert.deepEqual(o.narrativa, c.estado[o.voz], c.id + " " + o.voz + ": " + o.texto);
      assert.ok(V.ramoDe(M, c.id, o.voz, {}).length > 0, c.id + " " + o.voz);
    }
  }
  const pre = cenas.find((x) => x.gatilho.tipo === "preludio");
  const x = R.PRELUDIOS[pre.arquetipo].find((p) => p.id === pre.gatilho.id);
  assert.ok(x, "prelúdio " + pre.gatilho.id);
  assert.deepEqual(x.opcoes.map((o) => o.voz).sort(), Object.keys(pre.ramos).sort());
  for (const o of x.opcoes) assert.deepEqual(o.narrativa, pre.estado[o.voz]);
  const cb = cenas.find((x) => x.gatilho.tipo === "callback");
  assert.ok(R.CALLBACKS.some((k) => k.id === cb.gatilho.id && k.arquetipo === cb.arquetipo));
  // o roteiro da cena e o ramo nunca se misturam: escolher A não toca nada de B ou C
  const banco = "RTC_A2_E03";
  for (const r of ["A", "B", "C"]) {
    const ids = V.ramoDe(M, banco, r, {}).map((f) => f.id);
    assert.ok(ids.length && ids.every((id) => id.endsWith("_" + r)), r + ": " + ids);
  }
  assert.deepEqual(V.ramoDe(M, banco, "Z", {}), []);
});

// ---------- 5. condições ----------
test("condições: convertidas sem eval, só comparações, e avaliadas contra o estado do jogador", () => {
  assert.deepEqual(V.lerCondicao("always"), { sempre: true });
  assert.deepEqual(V.lerCondicao('rom_festa == "integral" && resultado_ultimo_jogo == "derrota"'),
    { todas: [{ chave: "rom_festa", op: "==", valor: "integral" }, { chave: "resultado_ultimo_jogo", op: "==", valor: "derrota" }] });
  assert.deepEqual(V.lerCondicao("pro_festa_marca == true || x != 2"),
    { alguma: [{ chave: "pro_festa_marca", op: "==", valor: true }, { chave: "x", op: "!=", valor: 2 }] });
  // o que não é comparação simples é recusado (nada é executado)
  for (const ruim of ["process.exit(1)", "a == b", "(a == 1)", "a = 1", 'constructor == "x"; alert(1)', "a == `x`", "__proto__.x == 1"])
    assert.throws(() => V.lerCondicao(ruim), ruim);
  let tocou = false;
  globalThis.__armadilha = () => { tocou = true; };
  assert.equal(V.avaliar({ chave: "__armadilha()", op: "==", valor: 1 }, { "__armadilha()": 1 }), false);
  assert.equal(tocou, false);
  delete globalThis.__armadilha;
  const c = V.lerCondicao('rom_festa == "integral" && resultado_ultimo_jogo == "derrota"');
  assert.equal(V.avaliar(c, { rom_festa: "integral", resultado_ultimo_jogo: "derrota" }), true);
  assert.equal(V.avaliar(c, { rom_festa: "integral", resultado_ultimo_jogo: "vitoria" }), false);
  assert.equal(V.avaliar(c, { resultado_ultimo_jogo: "derrota" }), false, "quem não foi à festa não ouve a pergunta");
  assert.equal(V.avaliar({ chave: "toString", op: "==", valor: "x" }, {}), false, "herança do objeto não conta como estado");
  // cada chave que uma fala lê é gravada por alguém (uma opção, o resultado do jogo ou a própria escolha da cena)
  const gravadas = new Set(["resultado_ultimo_jogo", "choice_01"]);
  for (const e of [...R.GERAIS, ...Object.values(R.EXCLUSIVOS).flat(), ...Object.values(R.PRELUDIOS).flat()])
    for (const o of e.opcoes) for (const k of Object.keys(o.narrativa || {})) gravadas.add(k);
  for (const f of falas) for (const k of V.chavesDe(f.condicao)) assert.ok(gravadas.has(k), f.id + " lê " + k + ", que ninguém grava");
});

test("callback: uma variante só, a da festa certa, e nenhuma sem derrota", () => {
  const cb = "RTC_A3_E07";
  assert.equal(V.varianteDe(M, cb, { rom_festa: "integral", resultado_ultimo_jogo: "derrota" }), "A");
  assert.equal(V.varianteDe(M, cb, { rom_festa: "breve", resultado_ultimo_jogo: "derrota" }), "B");
  assert.equal(V.varianteDe(M, cb, { rom_festa: "nao", resultado_ultimo_jogo: "derrota" }), "C");
  for (const r of ["vitoria", "empate"]) for (const festa of ["integral", "breve", "nao"])
    assert.equal(V.varianteDe(M, cb, { rom_festa: festa, resultado_ultimo_jogo: r }), null, festa + " " + r);
  assert.equal(V.varianteDe(M, cb, { resultado_ultimo_jogo: "derrota" }), null, "sem a escolha da festa, sem pergunta");
  // as três variantes são mutuamente exclusivas: nenhum estado liga duas
  for (const festa of ["integral", "breve", "nao", "x"]) {
    const ctx = { rom_festa: festa, resultado_ultimo_jogo: "derrota" };
    const valem = Object.values(M.cenas[cb].ramos).filter((ids) => ids.every((id) => V.avaliar(M.falas[id].condicao, ctx)));
    assert.ok(valem.length <= 1, festa);
  }
});

// ---------- o estado narrativo no servidor ----------
const { gruposIniciais, decidir, avancar, estado, preludio, salvar, recuperar } = rtc.paraTestes;
function campanha(codigo, arqs) {
  const jogadores = arqs.map((arq, i) => ({ id: "p" + i, segredo: "x", nome: "Amigo " + i, avatar: "Craque " + i,
    ...R.novoProtagonista(arq), relacoes: {}, escolhas: [], vitorias: 0 }));
  const s = { codigo, criadaEm: 0, fase: "lobby", dono: "p0", jogadores, equipes: [], jogos: [], capitulo: 0,
    entradas: [], resultados: [], campeao: null, epilogos: [], historico: [] };
  gruposIniciais(s);
  return s;
}
const indice = (s, p, re) => estado(s, p).evento.opcoes.findIndex((o) => re.test(o.texto));
// joga até o capítulo 1 (o dos exclusivos dublados)
function ateCapitulo1(s) { for (const p of s.jogadores) decidir(s, p, 0, "equilibrado"); avancar(s); }

test("a escolha da entrevista grava o estado narrativo, e o estado só vai para o próprio jogador", () => {
  const s = campanha("VOZ01", ["romantico", "resiliente"]);
  ateCapitulo1(s);
  const [rom, res] = s.jogadores;
  const ev = estado(s, rom).evento;
  assert.equal(ev.id, "aniversario");
  assert.deepEqual(ev.opcoes.map((o) => o.voz).slice(0, 3), ["A", "B", "C"]);
  decidir(s, rom, indice(s, rom, /Passar só/), "equilibrado");
  decidir(s, res, indice(s, res, /Sair em silêncio/), "equilibrado");
  assert.equal(rom.narrativa.rom_festa, "breve");
  assert.equal(rom.escolhas.at(-1).voz, "B");
  assert.equal(res.narrativa.res_reacao_banco, "C");
  assert.equal(res.narrativa.res_relacao_ventura_delta, 0);
  assert.ok(["vitoria", "empate", "derrota"].includes(res.narrativa.resultado_ultimo_jogo), "o resultado da jornada 1 também fica");
  // cada um recebe só o seu
  assert.equal(estado(s, rom).voz.narrativa.rom_festa, "breve");
  assert.equal(estado(s, rom).voz.narrativa.res_reacao_banco, undefined);
  assert.equal(estado(s, res).voz.narrativa.rom_festa, undefined);
  // persiste no banco e volta igual
  salvar(s);
  const volta = recuperar("VOZ01");
  assert.equal(volta.jogadores[0].narrativa.rom_festa, "breve");
  // a outra escolha do banco soma no _delta
  R.gravarNarrativa(res, { res_relacao_ventura_delta: -1 });
  R.gravarNarrativa(res, { res_relacao_ventura_delta: -1, "x;y": 1, z: { a: 1 } });
  assert.equal(res.narrativa.res_relacao_ventura_delta, -2);
  assert.ok(!("x;y" in res.narrativa) && !("z" in res.narrativa));
});

test("callback da festa: só depois de derrota, na jornada da festa, uma vez, com a variante da escolha", () => {
  let comCallback = 0, semCallback = 0;
  for (let k = 0; k < 40 && (comCallback < 2 || semCallback < 2); k++) {
    const s = campanha("CB" + String(k).padStart(3, "0"), ["romantico"]);
    ateCapitulo1(s);
    const [rom] = s.jogadores;
    const festa = ["integral", "breve", "nao"][k % 3];
    decidir(s, rom, indice(s, rom, [/fechar a festa/, /Passar só/, /Ficar em casa/][k % 3]), "equilibrado");
    avancar(s);
    const jogo = s.jogos.find((j) => j.rodada === 1 && (j.casa === rom.clube || j.fora === rom.clube));
    const r = jogo.resultado, perdeu = (jogo.casa === rom.clube ? r.casa < r.fora : r.fora < r.casa);
    assert.equal(rom.narrativa.resultado_ultimo_jogo, perdeu ? "derrota" : r.casa === r.fora ? "empate" : "vitoria");
    const vozes = estado(s, rom).voz.cenas;
    if (perdeu) {
      comCallback++;
      assert.equal(vozes.length, 1);
      assert.deepEqual(vozes[0], { id: "pergunta-inconveniente", cena: "RTC_A3_E07", ramo: { integral: "A", breve: "B", nao: "C" }[festa], rodada: 1 });
    } else { semCallback++; assert.equal(vozes.length, 0); }
    // nas jornadas seguintes não volta (nem em outra derrota)
    decidir(s, rom, 0, "equilibrado"); avancar(s);
    assert.equal(estado(s, rom).voz.cenas.length, perdeu ? 1 : 0);
  }
  assert.ok(comCallback >= 1 && semCallback >= 1, comCallback + " com, " + semCallback + " sem");
});

test("prelúdio do Prodígio: só dele, só no capítulo 0, uma vez, e não trava a entrevista", () => {
  const s = campanha("PRE01", ["prodigio", "maquina"]);
  const [pro, maq] = s.jogadores;
  const v = estado(s, pro).voz.preludio;
  assert.equal(v.id, "primeira-noite");
  assert.equal(v.cena, "RTC_A1_E01");
  assert.deepEqual(v.opcoes.map((o) => o.voz), ["A", "B"]);
  assert.equal(estado(s, maq).voz.preludio, null);
  assert.throws(() => preludio(s, maq, "primeira-noite", 0), /não está disponível/);
  assert.throws(() => preludio(s, pro, "primeira-noite", 7), /inválida/);
  const antes = pro.eixos.exposicao;
  assert.deepEqual(preludio(s, pro, "primeira-noite", 0), { voz: "A" });
  assert.equal(pro.narrativa.pro_festa_marca, true);
  assert.ok(pro.eixos.exposicao > antes);
  assert.equal(estado(s, pro).voz.preludio, null);
  assert.throws(() => preludio(s, pro, "primeira-noite", 1), /não está disponível/);
  // a entrevista e o avanço seguem iguais
  decidir(s, pro, 0, "equilibrado"); decidir(s, maq, 0, "equilibrado"); avancar(s);
  assert.equal(s.capitulo, 1);
  // quem não respondeu no capítulo 0 perde o prelúdio (a véspera passou)
  const t = campanha("PRE02", ["prodigio"]);
  ateCapitulo1(t);
  assert.equal(estado(t, t.jogadores[0]).voz.preludio, null);
});

// ---------- 10. servido pelo servidor do projeto ----------
test("o servidor entrega o manifesto, os scripts e os MP3 (com Range, para o navegador avançar no áudio)", async () => {
  const srv = await subirServidor();
  try {
    const m = await fetch(srv.url + "/jogador/dublagem/manifesto.json");
    assert.equal(m.status, 200);
    assert.equal((await m.json()).versao, 1);
    const pagina = await (await fetch(srv.url + "/jogador/")).text();
    for (const s of ["/jogador/road-voz.js", "/jogador/road-dublagem.js", "/jogador/road-dublagem.css"]) {
      assert.ok(pagina.includes(s), s);
      assert.equal((await fetch(srv.url + s)).status, 200, s);
    }
    for (const f of falas.filter((x) => x.audio)) {
      const r = await fetch(srv.url + encodeURI(f.audio), { method: "HEAD" });
      assert.equal(r.status, 200, f.audio);
      assert.equal(r.headers.get("content-type"), "audio/mpeg", f.audio);
    }
    const um = falas.find((x) => x.audio).audio;
    const parte = await fetch(srv.url + um, { headers: { Range: "bytes=0-99" } });
    assert.equal(parte.status, 206);
    assert.equal((await parte.arrayBuffer()).byteLength, 100);
  } finally { await srv.parar(); }
});
