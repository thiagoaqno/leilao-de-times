// O narrador das pistas na transmissão: 5 falas por pista de F1, ids seguros, textos para serem falados (sem algarismo, 8 a 20 s),
// sorteio pela semente (igual para todos) e nada quebra sem mp3 nem sem navegador.
const test = require("node:test");
const assert = require("node:assert/strict");
const Falas = require("../public/corrida/narrador/falas.js");
const Narrador = require("../public/corrida/narrador.js");
const { PISTAS } = require("../public/corrida/pistas.js");

test("toda pista de F1 do jogo tem 5 falas, e não sobra fala de pista que não existe", () => {
  const f1 = Object.keys(PISTAS).filter((id) => PISTAS[id].f1 || ["monaco", "interlagos", "monza", "barcelona", "silverstone"].includes(id));
  assert.equal(f1.length, 24);
  for (const id of f1) assert.equal(Falas.porPista(id).length, 5, id);
  for (const id of Object.keys(Falas.PISTAS)) assert.ok(PISTAS[id], `${id} não é pista do jogo`);
});

test("ids únicos e seguros para nome de arquivo; textos falados de 8 a 20 segundos, sem algarismo", () => {
  const ids = Falas.FALAS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of Falas.FALAS) {
    assert.match(f.id, /^[a-z]+-[1-5]$/);
    assert.ok(f.id.startsWith(`${f.pista}-`));
    const palavras = f.texto.split(/\s+/).length;
    assert.ok(palavras >= 26 && palavras <= 62, `${f.id}: ${palavras} palavras`);
    assert.doesNotMatch(f.texto, /\d/, `${f.id}: número por extenso, para a voz ler certo`);
  }
});

test("o sorteio é pela semente: o mesmo GP dá a mesma fala, e todas as cinco aparecem", () => {
  assert.equal(Falas.escolher("monza", "abc").id, Falas.escolher("monza", "abc").id);
  const vistos = new Set();
  for (let i = 0; i < 400; i++) vistos.add(Falas.escolher("interlagos", `gp${i}`).id);
  assert.equal(vistos.size, 5);
  assert.equal(Falas.escolher("sorvete", "x"), null);
});

test("sem navegador e sem mp3 o narrador não quebra", async () => {
  assert.equal(await Narrador.falarDaPista("monza", "abc", { cortarEm: 1000 }), false);
  assert.equal(await Narrador.falarDaPista("sorvete", "abc"), false);
  Narrador.abaixar(0.3); Narrador.parar();
  assert.equal(Narrador.tocando, false);
});
