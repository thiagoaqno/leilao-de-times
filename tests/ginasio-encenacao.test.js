// Ginásio: a encenação dos golpes em 8 tempos (public/ginasio/encenacao.js). O arquivo é do navegador: roda aqui
// num contexto com o mínimo que ele usa (golpes.js de verdade para as famílias e as paletas).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function carregar() {
  const ctx = {
    console, Math, Map, Set, Number, String, Array, Object, JSON,
    movimentoReduzido: { matches: false }, modoAtual: () => "pokemon", relogio: { agora: () => 1000 },
    N: { snap: { entidades: [{ id: "b", x: 1, y: 0, max: 200 }, { id: "a", x: -1, y: 0, max: 200 }] } },
    G3: { ok: false }, efeitos: [], particulas: [],
    fixo: (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); },
    dexAtual: () => ({ TYPES: {} }),
  };
  ctx.particula = (x, y, o) => ctx.particulas.push({ x, y, ...o });
  ctx.espalhar = () => {};
  ctx.visuais = new Map();
  ctx.visualDe = (id) => { let v = ctx.visuais.get(id); if (!v) ctx.visuais.set(id, (v = {})); return v; };
  vm.createContext(ctx);
  for (const f of ["golpes.js", "encenacao.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/ginasio", f), "utf8"), ctx, { filename: f });
  // as funções e constantes de nível de arquivo ficam no escopo do script: expõe as que o teste usa
  return vm.runInContext("({ TEMPOS, REACAO, PALETA, ENC, encenarEvento, jeitoDoNumero, saltoDoNumero, reacaoNaPose, deixarRescaldo, visuais })", ctx);
}

test("encenação: toda família de tipo tem os tempos e uma reação conhecida", () => {
  const E = carregar();
  for (const fam of Object.keys(E.PALETA)) {
    const T = E.TEMPOS[fam];
    assert.ok(T, `família ${fam} sem tempos`);
    for (const k of ["carga", "estouro", "reacao", "rescaldo"]) assert.ok(T[k], `${fam}.${k}`);
    assert.ok(E.REACAO[T.reacao], `${fam}: reação ${T.reacao}`);
  }
});

test("números de dano: golpes seguidos no mesmo alvo somam; outro alvo ou bloqueado vira outro número", () => {
  const E = carregar();
  const dano = (em, valor, t, extra = {}) => E.encenarEvento({ tipo: "dano", de: "a", em, dano: valor, eff: 1, elemento: "Água", classe: "rajada", ...extra }, t);
  dano("b", 10, 1000); dano("b", 12, 1200); dano("b", 8, 1450);
  assert.strictEqual(E.ENC.numeros.length, 1, "os três tiros juntos");
  assert.strictEqual(E.ENC.numeros[0].valor, 30);
  assert.strictEqual(E.ENC.numeros[0].n, 3);
  assert.match(E.jeitoDoNumero(E.ENC.numeros[0]).texto, /30 ×3/);
  dano("b", 5, 2000); // passou da janela de junção
  dano("a", 7, 2010);
  dano("b", 4, 2020, { bloqueado: true });
  assert.strictEqual(E.ENC.numeros.length, 4);
  assert.notStrictEqual(E.ENC.numeros[1].degrau, undefined);
});

test("números de dano: cor e legenda pela efetividade, crítico e bloqueio", () => {
  const E = carregar();
  const j = (n) => E.jeitoDoNumero({ tipo: "dano", valor: 20, n: 1, eff: 1, crit: false, bloqueado: false, ...n });
  assert.strictEqual(j({}).legenda, null);
  assert.strictEqual(j({ eff: 2 }).legenda, "Super efetivo!");
  assert.ok(j({ eff: 2 }).tam > j({}).tam, "super efetivo é maior");
  assert.strictEqual(j({ eff: 0.5 }).legenda, "Pouco efetivo");
  assert.ok(j({ eff: 0.5 }).tam < j({}).tam, "pouco efetivo é menor");
  assert.strictEqual(j({ crit: true }).legenda, "Crítico!");
  assert.strictEqual(j({ crit: true, eff: 2 }).legenda, "Crítico! Super efetivo!");
  assert.strictEqual(j({ bloqueado: true }).legenda, "bloqueado");
  assert.strictEqual(E.jeitoDoNumero({ tipo: "imune" }).texto, "Imune");
  // o salto: começa pequeno, passa do ponto e assenta em 1
  assert.ok(E.saltoDoNumero(0) < 0.5);
  assert.ok(E.saltoDoNumero(0.07) > 1.3);
  assert.strictEqual(E.saltoDoNumero(0.5), 1);
});

test("reação: quem apanha pisca branco, depois na cor do golpe, e os dois congelam no acerto de perto", () => {
  const E = carregar();
  E.encenarEvento({ tipo: "dano", de: "a", em: "b", dano: 60, eff: 2, crit: false, elemento: "Fogo", classe: "corpo" }, 1000);
  const v = E.visuais.get("b");
  assert.strictEqual(v.reacao.jeito, "queimando");
  assert.ok(v.parado > 1000, "hit-stop em quem apanhou");
  assert.ok(E.visuais.get("a").parado > 1000, "e em quem bateu de perto");
  assert.strictEqual(E.reacaoNaPose(v, 1020).cor, "#ffffff");
  assert.strictEqual(E.reacaoNaPose(v, 1150).cor, E.REACAO.queimando.cor);
  assert.strictEqual(E.reacaoNaPose(v, 1400), null, "passou");
  // de longe (projétil), só quem apanha congela
  E.encenarEvento({ tipo: "dano", de: "b", em: "a", dano: 10, eff: 1, elemento: "Água", classe: "projetil" }, 2000);
  assert.ok(!(E.visuais.get("b").parado > 2000));
});

test("rescaldo: guarda no máximo 14 restos no chão", () => {
  const E = carregar();
  for (let i = 0; i < 30; i++) E.deixarRescaldo("Fogo", i, 0, 1);
  assert.strictEqual(E.ENC.residuos.length, 14);
  assert.strictEqual(E.ENC.residuos[0].x, 16, "os mais velhos saem primeiro");
});
