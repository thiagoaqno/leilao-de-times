// O engenheiro no rádio: falas por situação, ids únicos, textos curtos, escolha sem repetir, e nada quebra sem mp3 (nem sem navegador).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Falas = require("../public/corrida/radio/falas.js");
const Radio = require("../public/corrida/radio.js");

const SITUACOES = ["largada", "voltarapida", "ganhou", "perdeu", "pneu", "box", "safety", "amarela", "dano", "ultima", "vitoria", "podio", "pontos", "foradospontos", "abandono"];

test("toda situação (só as da corrida) tem de 4 a 5 falas", () => {
  for (const s of SITUACOES) { const n = Falas.porSituacao(s).length; assert.ok(n >= 4 && n <= 5, `${s}: ${n} falas`); }
  assert.deepEqual(Object.keys(Falas.SITUACOES).sort(), [...SITUACOES].sort());
  assert.ok(Falas.FALAS.length >= 60 && Falas.FALAS.length <= 80);
});

test("ids únicos, seguros para nome de arquivo e textos curtos", () => {
  const ids = Falas.FALAS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of Falas.FALAS) {
    assert.match(f.id, /^[a-z0-9-]+$/);
    assert.ok(f.texto.length > 5 && f.texto.length <= 90, `${f.id}: ${f.texto.length} letras`);
    assert.ok(Falas.SITUACOES[f.quando].includes(f.texto));
  }
});

test("a escolha nunca repete a fala anterior", () => {
  for (const s of SITUACOES) {
    let ultimo = null;
    for (let i = 0; i < 60; i++) { const f = Radio.escolher(s, ultimo, () => (i % 7) / 7); assert.notEqual(f.id, ultimo); assert.equal(f.quando, s); ultimo = f.id; }
  }
  assert.equal(Radio.escolher("nao-existe", null), null);
});

test("sem mp3 e sem navegador: pedir uma fala não dá erro e respeita o intervalo", () => {
  const a = Radio.dizer("largada");
  assert.ok(a && a.quando === "largada");
  assert.equal(Radio.dizer("largada"), null, "a mesma situação não se repete logo");
  assert.equal(Radio.dizer("situacao-inventada"), null);
  assert.doesNotThrow(() => { Radio.dizer("safety"); Radio.dizer("box"); Radio.posicao(5, "a"); Radio.avisoF1("sc"); Radio.fim(1, 25, false); Radio.classificacao(1, 20); });
  assert.equal(fs.existsSync(path.join(__dirname, "..", "public", "corrida", "radio", "largada-1.mp3")), false);
});
