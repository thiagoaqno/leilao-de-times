// Road to Champions — regras da dublagem (UMD: no servidor com require, no navegador como window.RoadVoz).
// Sem áudio e sem tela: só as condições das falas e a ordem de cada cena. O tocador fica em road-dublagem.js e o
// manifesto (falas, legendas, durações, caminhos dos MP3) em /jogador/dublagem/manifesto.json, gerado por
// ferramentas/rtc-dublagem.js a partir do pacote de produção.
//
// Condições: nada de eval. O texto do roteiro (`rom_festa == "integral" && resultado_ultimo_jogo == "derrota"`) é
// convertido uma vez, na ferramenta, para um objeto que só tem comparações:
//   { sempre: true } · { chave, op: "==" | "!=", valor } · { todas: [...] } · { alguma: [...] }
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.RoadVoz = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // os seis protagonistas pelo código do roteiro
  const CAMPANHAS = { ROM: "romantico", PRO: "prodigio", RES: "resiliente", IMP: "imprevisivel", ENI: "enigma", MAQ: "maquina" };

  // ---------- condições ----------
  const CHAVE = /^[a-z_][a-z0-9_]*$/;
  function literal(txt) {
    const t = txt.trim();
    if (/^"[^"\\]*"$/.test(t) || /^'[^'\\]*'$/.test(t)) return t.slice(1, -1);
    if (t === "true") return true;
    if (t === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    throw new Error("Valor inválido na condição: " + t);
  }
  function comparacao(txt) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+?)\s*$/.exec(txt);
    if (!m || !CHAVE.test(m[1])) throw new Error("Condição inválida: " + txt);
    return { chave: m[1], op: m[2], valor: literal(m[3]) };
  }
  // converte o texto do roteiro; aceita "always", comparações com == e !=, && e || (o && pesa mais, sem parênteses)
  function lerCondicao(txt) {
    const t = String(txt == null ? "always" : txt).trim();
    if (!t || t === "always") return { sempre: true };
    if (/[()]/.test(t)) throw new Error("Parênteses não são aceitos nas condições: " + t);
    const ou = t.split("||").map((parte) => {
      const e = parte.split("&&").map(comparacao);
      return e.length === 1 ? e[0] : { todas: e };
    });
    return ou.length === 1 ? ou[0] : { alguma: ou };
  }
  // avalia contra o estado narrativo do jogador (as escolhas guardadas e o resultado do último jogo)
  function avaliar(c, ctx) {
    if (!c || c.sempre) return true;
    const x = ctx || {};
    if (Array.isArray(c.todas)) return c.todas.every((y) => avaliar(y, x));
    if (Array.isArray(c.alguma)) return c.alguma.some((y) => avaliar(y, x));
    if (typeof c.chave !== "string" || !CHAVE.test(c.chave)) return false;
    const tem = Object.prototype.hasOwnProperty.call(x, c.chave), v = tem ? x[c.chave] : undefined;
    if (c.op === "==") return tem && v === c.valor;
    if (c.op === "!=") return !(tem && v === c.valor);
    return false;
  }
  // as chaves que uma condição lê (para conferir se alguém grava cada uma)
  function chavesDe(c, saida = new Set()) {
    if (!c || c.sempre) return saida;
    for (const y of c.todas || c.alguma || []) chavesDe(y, saida);
    if (c.chave) saida.add(c.chave);
    return saida;
  }

  // ---------- o roteiro de uma cena ----------
  // devolve as falas na ordem, já filtradas. `ramo` é a opção escolhida (A, B, C) ou null antes da escolha.
  // Fala com condição só entra quando a condição vale; o ramo só toca as falas dele (nunca as dos outros).
  function introDe(manifesto, cenaId, ctx) {
    const cena = manifesto.cenas[cenaId];
    if (!cena) return [];
    return cena.intro.map((id) => manifesto.falas[id]).filter((f) => f && avaliar(f.condicao, ctx));
  }
  function ramoDe(manifesto, cenaId, ramo, ctx) {
    const cena = manifesto.cenas[cenaId];
    if (!cena || !ramo || !cena.ramos[ramo]) return [];
    const c = { ...(ctx || {}) };
    if (cena.escolha) c[cena.escolha.id] = ramo; // o roteiro escreve choice_01 == "A"
    return cena.ramos[ramo].map((id) => manifesto.falas[id]).filter((f) => f && avaliar(f.condicao, c));
  }
  // callback condicional: das variantes, a primeira cuja condição vale (nunca duas). null se nenhuma.
  function varianteDe(manifesto, cenaId, ctx) {
    const cena = manifesto.cenas[cenaId];
    if (!cena || cena.escolha) return null;
    for (const r of Object.keys(cena.ramos).sort()) {
      const falas = cena.ramos[r].map((id) => manifesto.falas[id]).filter(Boolean);
      if (falas.length && falas.every((f) => avaliar(f.condicao, ctx))) return r;
    }
    return null;
  }

  // as legendas de uma fala: os trechos com o tempo real do alinhamento quando existe, senão a fala inteira
  function trechoNoTempo(fala, ms) {
    const t = fala.trechos;
    if (!t || !t.length) return fala.legenda;
    let atual = t[0];
    for (const x of t) if (x.inicioMs <= ms) atual = x;
    return atual.texto;
  }
  // tempo de leitura das falas sem áudio (o protagonista e as que falharam): não é sincronia, é o tempo de ler
  const tempoDeLeitura = (texto) => Math.max(1800, Math.min(7000, 900 + String(texto || "").length * 55));

  return { CAMPANHAS, lerCondicao, avaliar, chavesDe, introDe, ramoDe, varianteDe, trechoNoTempo, tempoDeLeitura };
});
